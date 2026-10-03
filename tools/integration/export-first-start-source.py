#!/usr/bin/env python3
"""Export all tracked and non-ignored source files, including current changes.

This is a source snapshot, never a claim that an ARM64 runtime was built. Git's
object database and local build caches are excluded. Private-key filename and
PEM-content patterns are rejected; this is not a comprehensive secret scanner.
Every archived member is read back and checked against its source digest.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import zipfile
import re

ROOT = Path(__file__).resolve().parents[2]
NAME = "NexoWatt_EOS_dev9_FULL_INSTALL_TEST3_2026-10-03"
PRIVATE_PEM = re.compile(rb'-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{32,}')


def git(*args):
    return subprocess.check_output(["git", "--no-replace-objects", *args], cwd=ROOT)


def digest(stream):
    return hashlib.file_digest(stream, "sha256").hexdigest()


def source_digest(stream):
    result = hashlib.sha256()
    tail = b''
    while block := stream.read(1024 * 1024):
        if PRIVATE_PEM.search(tail + block):
            raise ValueError("PRIVATE_PEM_CONTENT_REJECTED")
        result.update(block)
        tail = block[-16384:]
    return result.hexdigest()


def export(destination):
    destination = Path(destination).resolve()
    if destination.exists() or destination == ROOT:
        raise ValueError("NEW_DELIVERY_DIRECTORY_REQUIRED")
    # An in-workspace export is permitted only in the ignored artifacts folder.
    if ROOT in destination.parents and ROOT / "artifacts" not in destination.parents:
        raise ValueError("EXPORT_DESTINATION_SCOPE")
    paths = sorted(set(git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode("utf-8").rstrip("\0").split("\0")))
    tracked_modes = {}
    for record in git("ls-files", "--stage", "-z").decode("utf-8").rstrip("\0").split("\0"):
        metadata, name = record.split("\t", 1)
        tracked_modes[name] = int(metadata.split()[0], 8)
    records = []
    for relative in paths:
        parts = PurePosixPath(relative).parts
        if not relative or relative.startswith("/") or any(p in {"..", ".git", ".work", "node_modules"} for p in parts):
            raise ValueError("UNEXPECTED_SOURCE_PATH")
        source = ROOT / relative
        for current in [source, *source.parents]:
            if current == ROOT:
                break
            if current.is_symlink() or current.is_junction():
                raise ValueError("SOURCE_PATH_LINK_REJECTED")
        if source.resolve() != source or ROOT not in source.resolve().parents:
            raise ValueError("SOURCE_PATH_ESCAPE_REJECTED")
        if not source.exists():  # tracked deletion is represented in gitStatus
            continue
        info = source.lstat()
        if not stat.S_ISREG(info.st_mode) or source.is_symlink() or info.st_nlink != 1:
            raise ValueError("SOURCE_TYPE_REJECTED")
        if any("private" in part.lower() and part.lower().endswith((".pem", ".key")) for part in parts):
            raise ValueError("PRIVATE_KEY_PATH_REJECTED")
        mode = tracked_modes.get(relative, 0o100755 if source.suffix == ".sh" else 0o100644)
        with source.open("rb") as stream:
            records.append({"path": relative, "bytes": info.st_size, "sha256": source_digest(stream), "mode": oct(mode)})
    destination.mkdir(parents=True)
    archive_path = destination / (NAME + ".zip")
    with zipfile.ZipFile(archive_path, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for record in records:
            entry = zipfile.ZipInfo("NexoWatt_EOS/" + record["path"], date_time=(2026, 10, 3, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = int(record["mode"], 8) << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            with (ROOT / record["path"]).open("rb") as source, archive.open(entry, "w", force_zip64=True) as target:
                while data := source.read(1024 * 1024):
                    target.write(data)
    with zipfile.ZipFile(archive_path) as archive:
        if len(archive.infolist()) != len(records):
            raise ValueError("EXPORT_FILE_COUNT")
        for record, entry in zip(records, archive.infolist()):
            with archive.open(entry) as stream:
                if entry.filename != "NexoWatt_EOS/" + record["path"] or entry.file_size != record["bytes"] or digest(stream) != record["sha256"]:
                    raise ValueError("EXPORT_SOURCE_CHANGED_OR_CORRUPT")
        product = json.loads(archive.read("NexoWatt_EOS/system/product.json"))
    with archive_path.open("rb") as stream:
        archive_hash = digest(stream)
    git_status = git("status", "--porcelain", "--untracked-files=all").decode("utf-8").splitlines()
    manifest = {"schemaVersion": 1, "kind": "complete-repository-worktree-delivery", "sourceVersion": product["version"],
                "baseCommit": git("rev-parse", "HEAD").decode().strip(),
                "gitStatus": git_status,
                "snapshotIncludesUncommittedChanges": bool(git_status), "gitObjectDatabaseIncluded": False,
                "archive": archive_path.name, "sha256": archive_hash, "bytes": archive_path.stat().st_size,
                "fileCount": len(records), "files": records, "everyMemberReadBackAndVerified": True,
                "newSignedRuntimeBuilt": product.get("firstStart", {}).get("newSignedRuntimeBuilt", False),
                "targetHardwareTested": False, "productionReleaseApproved": False}
    (destination / (NAME + ".delivery.json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (destination / (NAME + ".sha256")).write_text(archive_hash + "  " + archive_path.name + "\n", encoding="ascii")
    print(json.dumps({key: manifest[key] for key in ["archive", "sha256", "bytes", "fileCount", "newSignedRuntimeBuilt"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination")
    export(parser.parse_args().destination)
