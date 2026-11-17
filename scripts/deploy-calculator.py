#!/usr/bin/env python3
"""Root-owned, forced-command receiver for the marine calculators static site."""

import contextlib
import ctypes
import fcntl
import gzip
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import quote, unquote, urlsplit
import uuid

CURRENT = Path("/var/www/calculator")
RELEASES = Path("/var/www/calculator-releases")
MAX_COMPRESSED = 256 * 1024 * 1024
MAX_UNPACKED = 512 * 1024 * 1024
MAX_MEMBERS = 20000
COMMAND = re.compile(r"deploy ([0-9a-f]{40}) (v[A-Za-z0-9][A-Za-z0-9._-]{0,126})", re.ASCII)
HASHED_ASSET = re.compile(r".+-[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9]+)+", re.ASCII)


class DeploymentError(Exception):
    """An invalid artifact or a deployment that did not pass its safety gates."""


def parse_command(command):
    if command == "check":
        return None
    match = COMMAND.fullmatch(command)
    if match is None:
        raise DeploymentError("expected check or deploy <40 lowercase hex SHA> <safe v-tag>")
    return match.groups()


def log(message):
    print(message, file=sys.stderr, flush=True)


def rename_exchange(left, right):
    """Exchange even a real directory and a symlink without an absent-path window."""
    libc = ctypes.CDLL(None, use_errno=True)
    try:
        renameat2 = libc.renameat2
    except AttributeError as exc:
        raise DeploymentError("Linux libc renameat2 is required") from exc
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    if renameat2(-100, os.fsencode(left), -100, os.fsencode(right), 2) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))


def trusted_directory(path):
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o022:
        raise DeploymentError("deployment directories must be owned by the receiver and not writable by others")


def inspect_layout(current, releases, *, create=False):
    if not current.is_absolute() or not releases.is_absolute() or current.parent != releases.parent:
        raise DeploymentError("current and releases must be absolute siblings")
    trusted_directory(current.parent)
    if create and not releases.exists():
        releases.mkdir(mode=0o755)
    if releases.exists() or releases.is_symlink():
        trusted_directory(releases)
        if current.parent.stat().st_dev != releases.stat().st_dev:
            raise DeploymentError("release and live paths must share a filesystem")
    info = current.lstat()
    if stat.S_ISLNK(info.st_mode):
        target = current.resolve(strict=True)
        if target.parent != releases or target.is_symlink():
            raise DeploymentError("live symlink must target a direct release directory")
        trusted_directory(target)
        return target
    if not stat.S_ISDIR(info.st_mode):
        raise DeploymentError("live path must be a directory or release symlink")
    trusted_directory(current)
    return current


@contextlib.contextmanager
def deployment_lock(releases):
    descriptor = os.open(releases / ".deploy.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o022:
            raise DeploymentError("unsafe deployment lock")
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        os.close(descriptor)


class BoundedReader:
    def __init__(self, source, limit):
        self.source = source
        self.limit = limit
        self.count = 0

    def read(self, size=-1):
        remaining = self.limit - self.count
        size = remaining + 1 if size < 0 else min(size, remaining + 1)
        data = self.source.read(size)
        self.count += len(data)
        if self.count > self.limit:
            raise DeploymentError("archive exceeds its size limit")
        return data


def archive_path(name):
    if not name or "\\" in name or "\x00" in name or name.startswith("/") or len(name) > 4096:
        raise DeploymentError("unsafe archive path")
    while name.startswith("./"):
        name = name[2:]
    name = name.rstrip("/")
    if name in ("", "."):
        return PurePosixPath(".")
    parts = name.split("/")
    if any(part in ("", ".", "..") or len(part.encode()) > 255 for part in parts):
        raise DeploymentError("unsafe archive path")
    return PurePosixPath(*parts)


def extract_archive(source, stage):
    """Extract manually; tar metadata never controls ownership, links or permissions."""
    with tempfile.TemporaryFile() as compressed:
        bounded = BoundedReader(source, MAX_COMPRESSED)
        while chunk := bounded.read(64 * 1024):
            compressed.write(chunk)
        compressed.seek(0)
        with gzip.GzipFile(fileobj=compressed, mode="rb") as expanded:
            bounded = BoundedReader(expanded, MAX_UNPACKED)
            seen = set()
            file_bytes = 0
            with tarfile.open(fileobj=bounded, mode="r|") as archive:
                for member in archive:
                    if len(seen) >= MAX_MEMBERS:
                        raise DeploymentError("archive contains too many entries")
                    path = archive_path(member.name)
                    if path in seen:
                        raise DeploymentError("duplicate archive path")
                    seen.add(path)
                    if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE) or member.sparse is not None or member.linkname:
                        raise DeploymentError("only ordinary files and directories are allowed")
                    if path == PurePosixPath(".") and not member.isdir():
                        raise DeploymentError("archive root must be a directory")
                    target = stage.joinpath(*path.parts)
                    if member.isdir():
                        target.mkdir(mode=0o755, parents=True, exist_ok=True)
                        continue
                    if member.size < 0:
                        raise DeploymentError("invalid file size")
                    file_bytes += member.size
                    if file_bytes > MAX_UNPACKED:
                        raise DeploymentError("archive exceeds its unpacked size limit")
                    target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                    with archive.extractfile(member) as incoming, target.open("xb") as outgoing:
                        shutil.copyfileobj(incoming, outgoing, 64 * 1024)
                    target.chmod(0o644)
            # Check gzip CRC and bound padding/concatenated streams as well as tar payloads.
            while bounded.read(64 * 1024):
                pass


class EntryReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.javascript = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "script" and attrs.get("src"):
            self.references.append(attrs["src"])
            self.javascript.append(attrs["src"])
        if tag == "link" and set(attrs.get("rel", "").lower().split()) & {"stylesheet", "modulepreload"} and attrs.get("href"):
            self.references.append(attrs["href"])


def local_reference(reference):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path)
    if path.startswith("/calculator/"):
        path = path[len("/calculator/"):]
    elif path.startswith("/"):
        raise DeploymentError("local scripts/styles must be served below /calculator/")
    if not path or any(part in ("", ".", "..") for part in path.split("/")) or "\\" in path or "\x00" in path:
        raise DeploymentError("unsafe local script/style reference")
    return PurePosixPath(path)


def validate_release(stage):
    index = stage / "index.html"
    assets = stage / "assets"
    tombstone = stage / "shinylive-sw.js"
    if not index.is_file() or not assets.is_dir() or not tombstone.is_file():
        raise DeploymentError("index.html, assets and shinylive-sw.js are required")
    parser = EntryReferences()
    parser.feed(index.read_text(encoding="utf-8"))
    if not any(ref.startswith("/calculator/assets/") and urlsplit(ref).path.endswith(".js") for ref in parser.javascript):
        raise DeploymentError("index.html must reference a /calculator/assets/ JavaScript bundle")
    references = []
    for reference in parser.references:
        path = local_reference(reference)
        if path is not None:
            if not stage.joinpath(*path.parts).is_file():
                raise DeploymentError("referenced local script/style is missing")
            if path not in references:
                references.append(path)
    return references


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(64 * 1024):
            result.update(chunk)
    return result.digest()


def preserve_assets(previous, stage):
    """Carry hashed assets forward so already-open clients can load old lazy chunks."""
    assets = previous / "assets"
    if not assets.exists():
        return
    if assets.is_symlink() or not assets.is_dir():
        raise DeploymentError("previous assets path is not an ordinary directory")
    for root, directories, files in os.walk(assets, followlinks=False):
        root = Path(root)
        for name in directories:
            if (root / name).is_symlink():
                raise DeploymentError("previous assets contain a directory symlink")
        for name in files:
            if HASHED_ASSET.fullmatch(name) is None:
                continue
            source = root / name
            if not stat.S_ISREG(source.lstat().st_mode):
                raise DeploymentError("previous hashed assets must be ordinary files")
            target = stage / source.relative_to(previous)
            if target.exists():
                if not target.is_file() or source.stat().st_size != target.stat().st_size or digest(source) != digest(target):
                    raise DeploymentError("hashed asset collision with previous release")
            else:
                target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                shutil.copyfile(source, target)
                target.chmod(0o644)


def smoke_http(stage, references):
    """Compare actual HTTP bytes, not SPA fallback statuses or cached browser results."""
    for path in [PurePosixPath("index.html"), *references]:
        with tempfile.TemporaryFile() as response:
            command = [
                "/usr/bin/curl", "--disable", "--silent", "--show-error", "--fail",
                "--noproxy", "*", "--connect-timeout", "5", "--max-time", "30",
                "--header", "Host: rippleforecast.com", "--header", "Cache-Control: no-cache",
                "--max-filesize", str(MAX_UNPACKED),
                "http://127.0.0.1/calculator/" + quote(str(path), safe="/"),
            ]
            subprocess.run(command, stdout=response, stderr=subprocess.DEVNULL, check=True, env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"})
            response.seek(0)
            with stage.joinpath(*path.parts).open("rb") as expected:
                while True:
                    actual_chunk = response.read(64 * 1024)
                    expected_chunk = expected.read(64 * 1024)
                    if actual_chunk != expected_chunk:
                        raise DeploymentError("HTTP smoke content mismatch")
                    if not actual_chunk:
                        break


def deploy(source, sha, tag, *, current=CURRENT, releases=RELEASES, smoke=smoke_http):
    """Deploy under flock. Explicit test roots are intentionally not exposed by CLI."""
    if parse_command(f"deploy {sha} {tag}") != (sha, tag):
        raise DeploymentError("invalid deployment identity")
    current, releases = Path(current), Path(releases)
    inspect_layout(current, releases, create=True)
    with deployment_lock(releases):
        previous = inspect_layout(current, releases)
        initial = not current.is_symlink()
        stage = Path(tempfile.mkdtemp(prefix=f"{sha[:12]}-", dir=releases))
        stage.chmod(0o755)
        token = uuid.uuid4().hex
        swap = releases / (".switch-" + token)
        saved = releases / (("initial-" if initial else "rollback-") + token)
        prior_slot = swap
        switched = False
        try:
            extract_archive(source, stage)
            references = validate_release(stage)
            preserve_assets(previous, stage)
            metadata = stage / "release.json"
            # Artifacts may not inject operator provenance.
            with metadata.open("x", encoding="utf-8") as output:
                json.dump({"sha": sha, "tag": tag}, output, sort_keys=True)
                output.write("\n")
            metadata.chmod(0o644)
            swap.symlink_to(stage, target_is_directory=True)
            log(f"deploy sha={sha} tag={tag} rollback={saved if initial else previous}")
            rename_exchange(swap, current)
            switched = True
            smoke(stage, references)
            # Keep the old real directory, or a rollback symlink to the old release.
            os.rename(swap, saved)
            prior_slot = saved
            log(f"deployed sha={sha} tag={tag} release={stage} rollback={saved if initial else previous}")
        except BaseException:
            if switched:
                try:
                    rename_exchange(prior_slot, current)
                except BaseException as rollback_error:
                    log(f"ROLLBACK FAILED sha={sha} tag={tag} prior={prior_slot} failed={stage}")
                    raise DeploymentError(f"atomic rollback failed; prior path retained at {prior_slot}") from rollback_error
                log(f"rolled-back sha={sha} tag={tag} restored={current} failed={stage}")
            # Only remove our own temporary symlink. Failed release contents are retained.
            if prior_slot.is_symlink() and os.readlink(prior_slot) == str(stage):
                prior_slot.unlink()
            raise
        return stage


def check_ready():
    inspect_layout(CURRENT, RELEASES)
    if not os.access("/usr/bin/curl", os.X_OK):
        raise DeploymentError("/usr/bin/curl is required")
    if not hasattr(ctypes.CDLL(None), "renameat2"):
        raise DeploymentError("Linux libc renameat2 is required")


def main(argv=None):
    arguments = sys.argv[1:] if argv is None else argv
    try:
        if len(arguments) != 1:
            raise DeploymentError("one SSH command string is required")
        identity = parse_command(arguments[0])
        if os.geteuid() != 0:
            raise DeploymentError("receiver must run as root")
        if identity is None:
            check_ready()
            print("ready", flush=True)
        else:
            os.umask(0o022)
            deploy(sys.stdin.buffer, *identity)
            print("deployed", flush=True)
        return 0
    except (DeploymentError, OSError, EOFError, UnicodeError, tarfile.TarError, subprocess.SubprocessError) as exc:
        # Do not echo untrusted command strings, archive names, or subprocess output.
        log(f"deployment rejected: {type(exc).__name__}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
