#!/usr/bin/python3
"""Read-only, redacted explanation of the unchanged Managed16 APT source gate."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import types

ENTRY_SHA = "cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f"
ENTRY_SIZE = 49985
KNOWN_SUITES = frozenset(("trixie", "trixie-updates", "trixie-security", "trixie-backports",
                         "stable", "stable-updates", "stable-security", "stable-backports",
                         "oldstable", "oldstable-updates", "oldstable-security", "oldstable-backports",
                         "bookworm", "bookworm-updates", "bookworm-security", "bookworm-backports",
                         "bullseye", "testing", "testing-updates", "testing-security", "sid", "nodistro"))


class Rejected(Exception):
    pass


def require(value, code):
    if not value:
        raise Rejected(code)


def read_entry(path):
    """A fixed-depth protected path; never traverse a symlink or unsafe parent."""
    require(path.parent.parent == Path("/root")
            and re.fullmatch(r"eos-download-[A-Za-z0-9_-]+", path.parent.name)
            and path.name == "install.sh", "ENTRY_PATH")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for name in ("root", path.parent.name):
            nxt = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
            s = os.fstat(fd)
            require(s.st_uid == 0 and not s.st_mode & 0o022, "ENTRY_PARENT")
        child = os.open("install.sh", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
    finally:
        os.close(fd)
    with os.fdopen(child, "rb") as stream:
        s = os.fstat(stream.fileno())
        require(stat.S_ISREG(s.st_mode) and s.st_uid == 0 and not s.st_mode & 0o022
                and s.st_nlink == 1 and s.st_size == ENTRY_SIZE, "ENTRY_FILE")
        data = stream.read(ENTRY_SIZE + 1)
        require(len(data) == ENTRY_SIZE and hashlib.sha256(data).hexdigest() == ENTRY_SHA, "ENTRY_PIN")
        return data


def load_preparer(data):
    require(len(data) == ENTRY_SIZE and hashlib.sha256(data).hexdigest() == ENTRY_SHA, "ENTRY_PIN")
    rows = re.findall(rb"<<'EOS_PYTHON_BASE64'\n([A-Za-z0-9+/=\n]+)\nEOS_PYTHON_BASE64\n", data)
    require(len(rows) == 1, "ENTRY_FORMAT")
    source = base64.b64decode(rows[0].replace(b"\n", b""), validate=True)
    module = types.ModuleType("eos_apt_diagnostic_pinned_preparer")
    # Entire entry bytes are authenticated before compilation. __main__ is not run.
    exec(compile(source, "pinned-managed16-preparer.py", "exec"), module.__dict__)
    return module


def find_preparer():
    # Only already-downloaded immutable entry files; no network or host changes.
    entries = []
    with os.scandir("/root") as root:
        count = 0
        for entry in root:
            count += 1
            require(count <= 4096, "ROOT_ENTRY_LIMIT")
            if re.fullmatch(r"eos-download-[A-Za-z0-9_-]+", entry.name):
                entries.append(Path("/root") / entry.name / "install.sh")
                require(len(entries) <= 64, "ENTRY_LIMIT")
    for path in sorted(entries):
        try:
            return load_preparer(read_entry(path))
        except (OSError, ValueError, Rejected):
            continue
    raise Rejected("PINNED_INSTALLER_NOT_FOUND")


def classify(prep, uri, suites):
    """Emit fixed booleans and finite public labels, never arbitrary input text."""
    try:
        url = prep.urlsplit(uri)
        host = url.hostname
        port = url.port  # preserves the original parser's malformed-port failure
        known_host = host in prep.OFFICIAL_REPOS
        path = url.path.rstrip("/")
        known_path = known_host and path in prep.OFFICIAL_REPOS[host]
        return {"urlParseable": True, "schemeAllowed": url.scheme in ("http", "https"),
                "hostAllowed": known_host, "pathAllowedForHost": known_path,
                "credentialsAbsent": not url.username and not url.password,
                "explicitPortAbsent": port is None, "queryAbsent": not url.query,
                "fragmentAbsent": not url.fragment, "suitesPresent": bool(suites),
                "suitesAllowed": bool(suites) and set(suites) <= prep.SUITES,
                "host": host if known_host else "OTHER_REDACTED",
                "path": path if known_path else "OTHER_REDACTED",
                "suites": [s if s in KNOWN_SUITES else "OTHER_REDACTED" for s in suites[:8]],
                "suiteCount": len(suites)}
    except ValueError:
        return {"urlParseable": False}


def inspect(prep, emit):
    original_read, original_check = prep.private_file, prep.check_repo_url
    state = {"sourceFileOrdinal": 0, "sourceFileSha256": None, "sourceFormat": None}
    visited = 0

    def observed_read(path, limit):
        state["sourceFileOrdinal"] += 1
        require(state["sourceFileOrdinal"] <= 64, "SOURCE_FILE_LIMIT")
        data = original_read(path, limit)
        state.update(sourceFileSha256=hashlib.sha256(data).hexdigest(),
                     sourceFormat="deb822" if path.suffix == ".sources" else "one-line")
        return data

    def observed_check(uri, suites):
        nonlocal visited
        visited += 1
        require(visited <= 256, "SOURCE_URI_LIMIT")
        try:
            original_check(uri, suites)
        except prep.Rejected:
            emit({"kind": "rejected-source", **state, **classify(prep, uri, suites)})
            raise  # the original gate remains fail-closed; no approval/bypass

    prep.private_file, prep.check_repo_url = observed_read, observed_check
    try:
        prep.check_apt_sources()
        emit({"kind": "result", "code": "APT_SOURCE_CHECK_PASSED", "hostChanged": False})
    except prep.Rejected as error:
        code = str(error)
        require(re.fullmatch(r"BOOTSTRAP_[A-Z_]+", code), "UNEXPECTED_CODE")
        emit({"kind": "result", "code": code, "hostChanged": False,
              "sourceFileOrdinal": state["sourceFileOrdinal"]})
    finally:
        prep.private_file, prep.check_repo_url = original_read, original_check


def main():
    require(len(sys.argv) == 1 and os.geteuid() == 0 and sys.platform == "linux", "LINUX_ROOT_NO_ARGUMENTS_REQUIRED")
    prep = find_preparer()
    print(json.dumps({"kind": "eos-managed16-apt-readonly-diagnostic", "hostChanged": False,
                      "installerPinVerified": True}))
    inspect(prep, lambda value: print(json.dumps(value, ensure_ascii=True, separators=(",", ":"))))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        code = str(error) if isinstance(error, Rejected) else "DIAGNOSTIC_UNAVAILABLE"
        print(json.dumps({"kind": "result", "code": code, "hostChanged": False}))
        sys.exit(1)
