# Fenton FOURIER browser adaptation

This directory contains a minimally adapted copy of John D. Fenton's C++
FOURIER steady-wave program, downloaded from
https://johndfenton.com/Steady-waves/Fourier.html (October 2022 revision).

Changes are limited to browser/toolchain compatibility: removal of console-only
headers and keypress handling, correction of a mismatched `Point` declaration,
use of `fflush` in place of `_fcloseall`, and enlargement of a legacy input
buffer to match its existing read length. Numerical equations are unchanged.

Redistribution permission is being sought. This experimental copy remains fully
attributed to John D. Fenton and should not be treated as a relicensed work.
