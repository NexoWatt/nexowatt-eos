#!/usr/bin/env python3
"""Canonical unsigned build transport; no key, execution or target installation."""
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile

spec = importlib.util.spec_from_file_location('archive_contract', Path(__file__).with_name('test-archive.py'))
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
FILES = {'runtime-build.json', 'catalog.json', 'runtime.cdx.json', 'controller-transform.json',
         'resolution-lock.json', 'runtime-sbom-coverage.json', 'runtime.npm.cdx.json'}
MANIFEST = 'unsigned-prepared-inventory.json'

def check(value):
    if not value:
        raise ValueError('PREPARED_ARCHIVE_REJECTED')

def allowed(name):
    contract.safe(name)
    check(name in FILES or name.startswith('app/'))
    check(not any(part in ('.git', '.bin', '__pycache__') for part in name.split('/')))
    return name

def inventory(root):
    rows = []
    for top in ['app', *sorted(FILES)]:
        current = root / top
        check(current.exists() and not current.is_symlink())
        files = sorted(current.rglob('*')) if current.is_dir() else [current]
        for file in files:
            check(not file.is_symlink())
            if file.is_dir():
                continue
            name = allowed(file.relative_to(root).as_posix())
            raw = contract.bounded(file, contract.MAX_FILE)
            rows.append({'path': name, 'size': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                         'mode': 0o755 if file.stat().st_mode & 0o111 else 0o644})
    rows.sort(key=lambda row: row['path'])
    contract.manifest_rows(json.dumps({'profile': 'test', 'files': rows}).encode())
    return rows

def read_members(archive, destination=None):
    check(archive.stat().st_size <= contract.MAX_ARCHIVE)
    seen = set()
    with contract.plain_file(archive, contract.MAX_ARCHIVE) as handle, tarfile.open(fileobj=handle, mode='r:gz') as tar:
        header = tar.next()
        check(header is not None and header.name == MANIFEST and header.isfile() and header.size <= contract.MAX_MANIFEST)
        raw = tar.extractfile(header).read(contract.MAX_MANIFEST + 1)
        metadata = json.loads(raw)
        check(metadata.get('kind') == 'unsigned-security-refresh-runtime' and metadata.get('signed') is False)
        files = contract.manifest_rows(json.dumps({'profile': 'test', 'files': metadata.get('files')}).encode())
        check(FILES <= set(files) and any(name.startswith('app/') for name in files))
        while (item := tar.next()) is not None:
            name = allowed(item.name)
            check(item.isfile() and not item.issym() and not item.islnk() and name in files and name not in seen)
            row = files[name]
            check(item.size == row['size'] and item.mode == row['mode'] and item.uid == item.gid == 0)
            raw = tar.extractfile(item).read(contract.MAX_FILE + 1)
            check(len(raw) == row['size'] and hashlib.sha256(raw).hexdigest() == row['sha256'])
            seen.add(name)
            if destination is not None:
                target = destination / name
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with target.open('xb') as output:
                    output.write(raw)
                target.chmod(row['mode'])
        check(seen == set(files))
    return files

def pack(root, archive):
    check(root.is_absolute() and root.resolve() == root and root.is_dir())
    check(archive.is_absolute() and archive.parent.resolve() == archive.parent and not archive.exists() and not archive.is_symlink())
    check(root not in archive.parents)
    rows = inventory(root)
    by_path = {row['path']: row for row in rows}
    metadata = json.dumps({'schemaVersion': 1, 'kind': 'unsigned-security-refresh-runtime', 'signed': False,
                           'files': rows}, separators=(',', ':')).encode()
    try:
        with archive.open('xb') as handle:
            archive.chmod(0o600)
            with gzip.GzipFile(filename='', mode='wb', fileobj=handle, mtime=contract.MTIME) as zipped:
                with tarfile.open(fileobj=zipped, mode='w', format=tarfile.PAX_FORMAT) as tar:
                    for name, mode, raw in [(MANIFEST, 0o644, metadata)] + [
                            (row['path'], row['mode'], None) for row in rows]:
                        if raw is None:
                            raw = contract.bounded(root / name, contract.MAX_FILE)
                            row = by_path[name]
                            check(len(raw) == row['size'] and hashlib.sha256(raw).hexdigest() == row['sha256'])
                        item = tarfile.TarInfo(name)
                        item.size, item.mode, item.uid, item.gid, item.mtime = len(raw), mode, 0, 0, contract.MTIME
                        tar.addfile(item, io.BytesIO(raw))
        read_members(archive)
    except BaseException:
        archive.unlink(missing_ok=True)
        raise
    return {'signed': False, 'files': len(rows), 'bytes': archive.stat().st_size,
            'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}

def extract(archive, destination):
    check(destination.is_absolute() and destination.parent.resolve() == destination.parent and not destination.exists() and not destination.is_symlink())
    # Validate every member before creating any output; never tar.extractall.
    read_members(archive)
    destination.mkdir(mode=0o700)
    try:
        rows = read_members(archive, destination)
    except BaseException:
        shutil.rmtree(destination)
        raise
    return {'signed': False, 'files': len(rows), 'sourceAndNativeEvidenceVerificationStillRequired': True}

if __name__ == '__main__':
    try:
        check(len(sys.argv) == 4 and sys.argv[1] in ('pack', 'extract'))
        action = pack if sys.argv[1] == 'pack' else extract
        print(json.dumps(action(Path(sys.argv[2]), Path(sys.argv[3]))))
    except (OSError, ValueError, tarfile.TarError, KeyError, TypeError):
        print('PREPARED_ARCHIVE_REJECTED', file=sys.stderr)
        sys.exit(1)
