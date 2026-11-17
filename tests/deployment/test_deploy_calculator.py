"""Receiver regressions: all filesystem operations stay under TemporaryDirectory."""

import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "deploy-calculator.py"
SPEC = importlib.util.spec_from_file_location("deploy_calculator", SCRIPT)
receiver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(receiver)
SHA = "a" * 40
NEXT_SHA = "b" * 40


def archive(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as bundle:
        for name, content, kind in entries:
            member = tarfile.TarInfo(name)
            member.type = kind
            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                member.linkname = "../../outside"
            if kind == tarfile.REGTYPE:
                member.size = len(content)
                bundle.addfile(member, io.BytesIO(content))
            else:
                bundle.addfile(member)
    output.seek(0)
    return output


def artifact(suffix="abcdefgh", extra=()):
    index = (
        f'<script type="module" src="/calculator/assets/main-{suffix}.js"></script>'
        f'<link rel="stylesheet" href="/calculator/assets/main-{suffix}.css">'
        f'<link rel="modulepreload" href="/calculator/assets/chunk-{suffix}.js">'
    ).encode()
    return archive([
        ("./", b"", tarfile.DIRTYPE),
        ("./index.html", index, tarfile.REGTYPE),
        ("./assets", b"", tarfile.DIRTYPE),
        (f"./assets/main-{suffix}.js", b"console.log('main');", tarfile.REGTYPE),
        (f"./assets/main-{suffix}.css", b"body { color: navy; }", tarfile.REGTYPE),
        (f"./assets/chunk-{suffix}.js", b"export default 1;", tarfile.REGTYPE),
        ("./shinylive-sw.js", b"self.registration.unregister();", tarfile.REGTYPE),
        *extra,
    ])


class TemporaryRoots(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.current = self.root / "calculator"
        self.releases = self.root / "calculator-releases"
        self.current.mkdir(mode=0o755)
        (self.current / "index.html").write_bytes(b"original R Shinylive index")
        (self.current / "unrelated-R-data").write_bytes(b"keep me")

    def deploy(self, source=None, sha=SHA, tag="v1.0.0", smoke=None):
        return receiver.deploy(
            artifact() if source is None else source, sha, tag,
            current=self.current, releases=self.releases,
            smoke=(lambda stage, refs: None) if smoke is None else smoke,
        )


class CommandTests(unittest.TestCase):
    def test_only_exact_protocol_is_accepted(self):
        self.assertIsNone(receiver.parse_command("check"))
        self.assertEqual(receiver.parse_command(f"deploy {SHA} v1.2.3-rc.1"), (SHA, "v1.2.3-rc.1"))
        self.assertEqual(receiver.parse_command(f"deploy {SHA} " + "v" + "x" * 127), (SHA, "v" + "x" * 127))
        for command in (
            "", "check\n", " check", "check ", "check; id", f"deploy {SHA.upper()} v1",
            f"deploy {SHA} v1\n", f"deploy {SHA} v1 extra", f"deploy {SHA} v1;id",
            f"deploy {SHA} v../../x", f"deploy {SHA} release1", f"deploy {SHA} v" + "x" * 128,
            f"deploy {'a' * 39} v1", f"deploy  {SHA} v1",
        ):
            with self.subTest(command=command), self.assertRaises(receiver.DeploymentError):
                receiver.parse_command(command)


class ArchiveTests(TemporaryRoots):
    def extract(self, entries):
        stage = self.root / "stage"
        stage.mkdir(exist_ok=True)
        receiver.extract_archive(archive(entries), stage)
        return stage

    def test_rejects_traversal_absolute_and_ambiguous_paths(self):
        for name in ("../outside", "/outside", "assets/../../outside", "assets/../outside", "a//b", "a\\b"):
            with self.subTest(name=name), self.assertRaises(receiver.DeploymentError):
                self.extract([(name, b"bad", tarfile.REGTYPE)])
        self.assertFalse((self.root / "outside").exists())

    def test_rejects_links_devices_and_fifos(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.FIFOTYPE):
            with self.subTest(kind=kind), self.assertRaises(receiver.DeploymentError):
                self.extract([("unsafe", b"", kind)])

    def test_rejects_duplicate_normalized_paths(self):
        with self.assertRaises(receiver.DeploymentError):
            self.extract([("./same", b"first", tarfile.REGTYPE), ("same", b"second", tarfile.REGTYPE)])

    def test_rejects_repeated_directory_headers(self):
        with self.assertRaises(receiver.DeploymentError):
            self.extract([("assets/", b"", tarfile.DIRTYPE), ("./assets", b"", tarfile.DIRTYPE)])

    def test_bounds_compressed_expanded_and_entry_count(self):
        with patch.object(receiver, "MAX_COMPRESSED", 20), self.assertRaises(receiver.DeploymentError):
            self.extract([("file", b"data", tarfile.REGTYPE)])
        with patch.object(receiver, "MAX_UNPACKED", 100), self.assertRaises(receiver.DeploymentError):
            self.extract([("file", b"x" * 101, tarfile.REGTYPE)])
        with patch.object(receiver, "MAX_MEMBERS", 1), self.assertRaises(receiver.DeploymentError):
            self.extract([("one", b"", tarfile.DIRTYPE), ("two", b"", tarfile.DIRTYPE)])

    def test_missing_script_and_tombstone_do_not_activate(self):
        original_inode = self.current.stat().st_ino
        for entries in (
            [("index.html", b'<script src="/calculator/assets/missing.js"></script>', tarfile.REGTYPE),
             ("assets", b"", tarfile.DIRTYPE), ("shinylive-sw.js", b"cleanup", tarfile.REGTYPE)],
            [("index.html", b'<script src="/calculator/assets/main.js"></script>', tarfile.REGTYPE),
             ("assets/main.js", b"script", tarfile.REGTYPE)],
        ):
            with self.assertRaises(receiver.DeploymentError):
                self.deploy(archive(entries))
            self.assertFalse(self.current.is_symlink())
            self.assertEqual(self.current.stat().st_ino, original_inode)

    def test_rejects_spoofed_metadata(self):
        with self.assertRaises(FileExistsError):
            self.deploy(artifact(extra=[("release.json", b'{"sha":"spoof"}', tarfile.REGTYPE)]))
        self.assertFalse(self.current.is_symlink())


class TransitionTests(TemporaryRoots):
    def test_initial_directory_exchange_and_subsequent_unique_releases(self):
        initial_inode = self.current.stat().st_ino
        (self.current / "assets").mkdir()
        (self.current / "assets" / "legacy-12345678.js").write_bytes(b"legacy lazy chunk")
        observations = []

        def smoke(stage, references):
            self.assertTrue(self.current.is_symlink())
            self.assertEqual(self.current.resolve(), stage)
            self.assertEqual(len(references), 3)
            observations.append(stage)

        first = self.deploy(smoke=smoke)
        self.assertEqual(json.loads((first / "release.json").read_text()), {"sha": SHA, "tag": "v1.0.0"})
        self.assertEqual((first / "assets" / "legacy-12345678.js").read_bytes(), b"legacy lazy chunk")
        backups = list(self.releases.glob("initial-*"))
        self.assertEqual(len(backups), 1)
        self.assertFalse(backups[0].is_symlink())
        self.assertEqual(backups[0].stat().st_ino, initial_inode)
        self.assertEqual((backups[0] / "unrelated-R-data").read_bytes(), b"keep me")
        second = self.deploy(artifact("ijklmnop"), sha=NEXT_SHA, tag="v2.0.0", smoke=smoke)
        self.assertNotEqual(first, second)
        self.assertEqual(self.current.resolve(), second)
        self.assertEqual((second / "assets" / "main-abcdefgh.js").read_bytes(), (first / "assets" / "main-abcdefgh.js").read_bytes())
        self.assertEqual((second / "assets" / "legacy-12345678.js").read_bytes(), b"legacy lazy chunk")
        self.assertEqual(json.loads((first / "release.json").read_text())["sha"], SHA)
        self.assertEqual(list(self.releases.glob("rollback-*"))[0].resolve(), first)
        # Even redeploying exactly the same identity creates a different release directory.
        third = self.deploy(artifact("ijklmnop"), sha=NEXT_SHA, tag="v2.0.0")
        self.assertNotEqual(second, third)
        self.assertEqual(observations, [first, second])
        self.assertFalse(list(self.releases.glob(".switch-*")))

    def test_first_migration_smoke_failure_restores_original_real_directory(self):
        original_inode = self.current.stat().st_ino
        failed = []

        def fail(stage, references):
            failed.append(stage)
            self.assertTrue(self.current.is_symlink())
            raise RuntimeError("deterministic smoke failure")

        with self.assertRaisesRegex(RuntimeError, "deterministic"):
            self.deploy(smoke=fail)
        self.assertFalse(self.current.is_symlink())
        self.assertEqual(self.current.stat().st_ino, original_inode)
        self.assertEqual((self.current / "index.html").read_bytes(), b"original R Shinylive index")
        self.assertTrue(failed[0].is_dir())
        self.assertFalse(list(self.releases.glob(".switch-*")))

    def test_subsequent_smoke_failure_restores_original_symlink(self):
        first = self.deploy()
        original_link = self.current.readlink()

        def fail(stage, references):
            raise receiver.DeploymentError("smoke mismatch")

        with self.assertRaisesRegex(receiver.DeploymentError, "smoke mismatch"):
            self.deploy(artifact("ijklmnop"), sha=NEXT_SHA, tag="v2", smoke=fail)
        self.assertTrue(self.current.is_symlink())
        self.assertEqual(self.current.readlink(), original_link)
        self.assertEqual(self.current.resolve(), first)
        self.assertTrue(first.is_dir())
        self.assertFalse(list(self.releases.glob(".switch-*")))

    def test_backup_operation_failure_also_rolls_back_initial_migration(self):
        original_inode = self.current.stat().st_ino
        with patch.object(receiver.os, "rename", side_effect=OSError("backup failed")):
            with self.assertRaisesRegex(OSError, "backup failed"):
                self.deploy()
        self.assertFalse(self.current.is_symlink())
        self.assertEqual(self.current.stat().st_ino, original_inode)

    def test_changed_hashed_asset_is_rejected_before_switch(self):
        first = self.deploy()
        replacement = archive([
            ("index.html", b'<script src="/calculator/assets/main-abcdefgh.js"></script>', tarfile.REGTYPE),
            ("assets/main-abcdefgh.js", b"changed bytes under identical hash", tarfile.REGTYPE),
            ("shinylive-sw.js", b"cleanup", tarfile.REGTYPE),
        ])
        with self.assertRaisesRegex(receiver.DeploymentError, "collision"):
            self.deploy(replacement, sha=NEXT_SHA, tag="v2")
        self.assertEqual(self.current.resolve(), first)


class SmokeTests(TemporaryRoots):
    def test_curl_requires_matching_index_and_asset_bytes(self):
        stage = self.root / "smoke-stage"
        stage.mkdir()
        receiver.extract_archive(artifact(), stage)
        references = receiver.validate_release(stage)
        calls = []

        def serve(command, *, stdout, stderr, check, env):
            self.assertEqual(command[0], "/usr/bin/curl")
            self.assertIn("--fail", command)
            self.assertIn("Host: rippleforecast.com", command)
            self.assertTrue(check)
            relative = command[-1].split("/calculator/", 1)[1]
            stdout.write((stage / relative).read_bytes())
            calls.append(relative)

        with patch.object(receiver.subprocess, "run", side_effect=serve):
            receiver.smoke_http(stage, references)
        self.assertEqual(len(calls), 4)

        def spa_fallback(command, *, stdout, **kwargs):
            stdout.write((stage / "index.html").read_bytes())

        with patch.object(receiver.subprocess, "run", side_effect=spa_fallback):
            with self.assertRaisesRegex(receiver.DeploymentError, "content mismatch"):
                receiver.smoke_http(stage, references)


if __name__ == "__main__":
    unittest.main()
