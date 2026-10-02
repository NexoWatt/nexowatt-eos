#!/usr/bin/env python3
"""Export a clean committed repository, verify ZIP hashes and retain full manifest.

No Git object database, ignored build caches or signing secrets are included.
Original recovered history is explicitly not represented as present.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
NAME = 'NexoWatt_EOS_dev8_Adapterkommunikation_FULL_2026-10-02'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(['git', '--no-replace-objects', *args], cwd=ROOT)

def export(destination):
    destination = Path(destination).resolve()
    if destination == ROOT or ROOT in destination.parents or destination.exists():
        raise ValueError('NEW_EXTERNAL_DELIVERY_DIRECTORY_REQUIRED')
    if git('status', '--porcelain', '--untracked-files=all').strip():
        raise ValueError('CLEAN_COMMITTED_SOURCE_REQUIRED')
    commit = git('rev-parse', 'HEAD').decode().strip()
    paths = sorted(git('ls-files', '-z').decode().rstrip('\0').split('\0'))
    destination.mkdir(mode=0o700)
    zip_path = destination / (NAME + '.zip')
    files = []
    with zipfile.ZipFile(zip_path, mode='x', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for relative in paths:
            if not relative or relative.startswith('/') or '..' in Path(relative).parts:
                raise ValueError('INVALID_TRACKED_PATH')
            source = ROOT / relative
            info = source.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_mode & 0o6022:
                raise ValueError('SOURCE_TYPE_OR_MODE')
            data = source.read_bytes()
            record = {'path': relative, 'bytes': len(data), 'sha256': sha(data), 'mode': oct(stat.S_IMODE(info.st_mode))}
            files.append(record)
            entry = zipfile.ZipInfo('NexoWatt_EOS/' + relative, date_time=(2026, 10, 2, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = (stat.S_IFREG | stat.S_IMODE(info.st_mode)) << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, data)
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None or len(archive.infolist()) != len(files):
            raise ValueError('ZIP_INTEGRITY')
        for row, entry in zip(files, archive.infolist()):
            if entry.filename != 'NexoWatt_EOS/' + row['path'] or entry.file_size != row['bytes'] or sha(archive.read(entry)) != row['sha256']:
                raise ValueError('ZIP_CONTENT_BINDING')
    zip_hash = sha(zip_path.read_bytes())
    runtime = json.loads((ROOT / 'delivery/test-pi-0.2.0-test.2/delivery.json').read_text())
    manifest = {'schemaVersion': 1, 'kind': 'complete-repository-delivery', 'sourceVersion': '0.2.0-dev.8', 'commit': commit,
        'archive': zip_path.name, 'sha256': zip_hash, 'bytes': zip_path.stat().st_size, 'archiveRoot': 'NexoWatt_EOS/',
        'fileCount': len(files), 'files': files, 'archiveVerifiedAgainstEverySourceFile': True,
        'runtime': runtime, 'runtimeContainsCurrentSourceChanges': False, 'originalHistoricalGitObjectsIncluded': False, 'productionReleaseApproved': False,
        'targetHardwareAccepted': False, 'craConformityEstablished': False, 'iecConformityEstablished': False}
    (destination / (NAME + '.delivery.json')).write_text(json.dumps(manifest, indent=2) + '\n')
    (destination / (NAME + '.sha256')).write_text(zip_hash + '  ' + zip_path.name + '\n')
    guide = destination / 'EOS_Adapterkommunikation_Dev8_Bericht.pdf'
    guide.write_bytes((ROOT / 'reports/integration/adapter-channel/EOS_Adapterkommunikation_Dev8_Bericht.pdf').read_bytes())
    print(json.dumps({'archive': str(zip_path), 'sha256': zip_hash, 'bytes': manifest['bytes'], 'files': len(files), 'commit': commit}))

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('destination')
    export(p.parse_args().destination)
