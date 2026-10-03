#!/usr/bin/env python3
"""Extract a hash-pinned test bundle as data into a fresh administrator directory.

No tarfile.extract/extractall, links, special files or source-selected ownership.
The Node installer subsequently verifies the signature and every payload member
before running any extracted code. This helper is not signature verification.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tarfile

MAX_BYTES = 1024 ** 3
MAX_MEMBERS = 120000
MAX_FILE = 128 * 1024 ** 2

# The checkout is administrator-controlled. Reuse the bounded raw header pass
# before tarfile interprets extensions; no archive content supplies this module.
_spec = importlib.util.spec_from_file_location('eos_test_archive', Path(__file__).resolve().parents[1] / 'integration/test-archive.py')
_archive = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_archive)


def reject():
    raise ValueError('CHECKOUT_ARCHIVE_REJECTED')


def safe_name(name):
    if not isinstance(name, str) or not name or len(name) > 1032 or '\\' in name or ':' in name or re.search(r'[\x00-\x1f\x7f]', name):
        reject()
    parts = name.split('/')
    if len(parts) > 50 or any(part in ['', '.', '..', '__proto__', 'prototype', 'constructor'] for part in parts):
        reject()
    if parts[0] != 'bundle':
        reject()
    return parts


def regular(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or path.is_symlink():
        reject()
    return info


def extract(archive, destination, expected_sha256):
    archive, destination = Path(archive).absolute(), Path(destination).absolute()
    if not re.fullmatch(r'[a-f0-9]{64}', expected_sha256) or destination.exists() or destination.is_symlink():
        reject()
    for target in [archive.parent, destination.parent]:
        for parent in [target, *target.parents]:
            if parent.is_symlink() or (hasattr(parent, 'is_junction') and parent.is_junction()) or not parent.is_dir():
                reject()
    before = regular(archive)
    if before.st_size > MAX_BYTES:
        reject()
    descriptor = os.open(archive, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    with os.fdopen(descriptor, 'rb') as source:
        opened = os.fstat(source.fileno())
        if (before.st_dev, before.st_ino, before.st_size) != (opened.st_dev, opened.st_ino, opened.st_size):
            reject()
        if hashlib.file_digest(source, 'sha256').hexdigest() != expected_sha256:
            reject()
        source.seek(0)
        _archive.raw_headers(source)
        # Complete header validation precedes any output directory creation.
        with tarfile.open(fileobj=source, mode='r:gz') as tar:
            members, names, files, total = [], set(), set(), 0
            for member in tar:
                name = member.name.rstrip('/') if member.isdir() else member.name
                parts = safe_name(name)
                if member.linkname or not set(member.pax_headers).issubset({'path'}) or tar.pax_headers:
                    reject()
                if name in names or len(names) >= MAX_MEMBERS or member.uid != 0 or member.gid != 0:
                    reject()
                if member.type not in [tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE] or member.sparse or member.mode not in ([0o755, 0o700] if member.isdir() else [0o644, 0o755]):
                    reject()
                if member.size < 0 or member.size > MAX_FILE or (member.isdir() and member.size != 0):
                    reject()
                if any('/'.join(parts[:i]) in files for i in range(1, len(parts))):
                    reject()
                if member.isfile():
                    if name != 'bundle/manifest.json' and name != 'bundle/manifest.sig' and not name.startswith('bundle/payload/'):
                        reject()
                    if any(previous.startswith(name + '/') for previous in names):
                        reject()
                    files.add(name)
                elif name not in ['bundle', 'bundle/payload'] and not name.startswith('bundle/payload/'):
                    reject()
                names.add(name)
                total += member.size
                if total > MAX_BYTES:
                    reject()
                members.append((member, name))
            if not {'bundle/manifest.json', 'bundle/manifest.sig'} <= files or not any(name.startswith('bundle/payload/') for name in files):
                reject()
            destination.mkdir(mode=0o700)
            for member, name in members:
                target = destination.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                if member.isdir():
                    target.mkdir(exist_ok=True, mode=member.mode)
                    os.chmod(target, member.mode)
                    continue
                source_file = tar.extractfile(member)
                if source_file is None:
                    reject()
                output = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), member.mode)
                with source_file, os.fdopen(output, 'wb') as stream:
                    remaining = member.size
                    while remaining:
                        block = source_file.read(min(1024 * 1024, remaining))
                        if not block:
                            reject()
                        stream.write(block)
                        remaining -= len(block)
                    os.fchmod(stream.fileno(), member.mode) if hasattr(os, 'fchmod') else os.chmod(target, member.mode)
            after = os.fstat(source.fileno())
            if (opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                reject()
    return {'ok': True, 'files': len(files), 'bytes': total, 'signatureVerified': False, 'codeExecuted': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--destination', required=True)
    parser.add_argument('--sha256', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(extract(args.archive, args.destination, args.sha256)))
    except (OSError, ValueError, tarfile.TarError):
        print(json.dumps({'ok': False, 'code': 'CHECKOUT_ARCHIVE_REJECTED'}))
        raise SystemExit(1)
