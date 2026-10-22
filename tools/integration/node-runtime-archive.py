#!/usr/bin/python3
"""Offline manufacturer gate: pinned Node archive to signed runtime inputs.

Extract only the Node ELF and its complete upstream LICENSE. Never execute
target code or use tar extractall; caller-selected paths remain local build inputs.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import tarfile

MAX_ARCHIVE = 128 * 1024**2
MAX_BINARY = 128 * 1024**2
MAX_LICENSE = 2 * 1024**2
MAX_EXPANDED = 768 * 1024**2


def require(condition):
    if not condition:
        raise ValueError("NODE_PACKAGE_REJECTED")


def extract(archive, destination, version, platform, expected_hash):
    archive, destination = Path(archive), Path(destination)
    require(re.fullmatch(r"24\.[0-9]+\.[0-9]+", version) and platform in ("linux-arm64", "linux-x64"))
    require(re.fullmatch(r"[a-f0-9]{64}", expected_hash))
    require(archive.is_absolute() and archive.resolve() == archive and destination.is_absolute()
            and destination.resolve() == destination and not os.path.lexists(destination))
    before = archive.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and 0 < before.st_size <= MAX_ARCHIVE)
    fd = os.open(archive, os.O_RDONLY | os.O_NOFOLLOW)
    output_created = False
    try:
        with os.fdopen(fd, "rb") as raw:
            opened = os.fstat(raw.fileno())
            require((opened.st_dev, opened.st_ino, opened.st_size) == (before.st_dev, before.st_ino, before.st_size))
            require(hashlib.file_digest(raw, "sha256").hexdigest() == expected_hash)
            raw.seek(0)
            prefix = "node-v" + version + "-" + platform
            selected = {prefix + "/bin/node": ("bin/node", MAX_BINARY), prefix + "/LICENSE": ("LICENSE", MAX_LICENSE)}
            found, total = {}, 0
            destination.mkdir(mode=0o700)
            output_created = True
            (destination / "bin").mkdir(mode=0o755)
            with tarfile.open(fileobj=raw, mode="r|xz") as source:
                for index, entry in enumerate(source):
                    total += entry.size
                    require(index < 30000 and 0 <= total <= MAX_EXPANDED)
                    if entry.name not in selected:
                        continue
                    relative, limit = selected[entry.name]
                    require(relative not in found and entry.isreg() and not entry.issym() and not entry.islnk()
                            and 0 < entry.size <= limit)
                    incoming = source.extractfile(entry)
                    require(incoming is not None)
                    digest, written = hashlib.sha256(), 0
                    with incoming, open(destination / relative, "xb") as outgoing:
                        while True:
                            chunk = incoming.read(1024 * 1024)
                            if not chunk:
                                break
                            if written == 0 and relative == "bin/node":
                                require(len(chunk) >= 64 and chunk[:7] == b"\x7fELF\x02\x01\x01"
                                        and int.from_bytes(chunk[16:18], "little") in (2, 3)
                                        and int.from_bytes(chunk[18:20], "little") == (183 if platform == "linux-arm64" else 62))
                            written += len(chunk)
                            require(written <= entry.size)
                            digest.update(chunk)
                            outgoing.write(chunk)
                        outgoing.flush()
                        os.fsync(outgoing.fileno())
                    require(written == entry.size)
                    os.chmod(destination / relative, 0o755 if relative == "bin/node" else 0o644)
                    found[relative] = digest.hexdigest()
            require(set(found) == {"bin/node", "LICENSE"})
            after = os.fstat(raw.fileno())
            require((opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) == (after.st_size, after.st_mtime_ns, after.st_ctime_ns))
        metadata = {"schemaVersion": 1, "version": version, "platform": platform,
                    "archiveSha256": expected_hash, "binarySha256": found["bin/node"], "licenseSha256": found["LICENSE"]}
        with open(destination / "runtime.json", "x", encoding="utf-8") as output:
            output.write(json.dumps(metadata, indent=2) + "\n")
        os.chmod(destination / "runtime.json", 0o644)
        os.chmod(destination, 0o755)
        return metadata
    except Exception:
        if output_created:
            # Only remove this invocation's fresh, fixed children; no recursive
            # traversal of an existing caller directory or archive paths.
            for relative in ("runtime.json", "LICENSE", "bin/node"):
                file = destination / relative
                if os.path.lexists(file):
                    file.unlink()
            (destination / "bin").rmdir()
            destination.rmdir()
        raise


def main(args):
    require(len(args) == 8 and args[::2] == ["--archive", "--output", "--version", "--platform"])
    policy = json.loads(Path(__file__).with_name("node-runtime-policy.json").read_text())
    version, platform = args[5], args[7]
    pin = policy["releases"][version][platform]
    require(policy["schemaVersion"] == 1 and pin["archive"] == "node-v" + version + "-" + platform + ".tar.xz")
    return extract(args[1], args[3], version, platform, pin["sha256"])


if __name__ == "__main__":
    try:
        print(json.dumps(main(sys.argv[1:])))
    except Exception:
        print("NODE_PACKAGE_REJECTED", file=sys.stderr)
        raise SystemExit(1)
