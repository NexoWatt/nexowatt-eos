#!/usr/bin/env python3
"""Build-host only: canonical data-only ZIP from an explicit hash-bound list."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile


def build(spec_file, output):
    rows = json.loads(Path(spec_file).read_text(encoding='utf-8'))
    if not isinstance(rows, list) or not 1 <= len(rows) <= 4000:
        raise ValueError('BOOTSTRAP_KIT_FILES')
    names, total = set(), 0
    with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for row in rows:
            name = row['name']
            parts = PurePosixPath(name).parts
            if (not parts or name != '/'.join(parts) or name.startswith('/') or
                    any(x in ('..', '.', '__proto__', 'constructor', 'prototype') for x in parts) or
                    '\\' in name or ':' in name or name in names):
                raise ValueError('BOOTSTRAP_KIT_PATH')
            source = Path(row['source'])
            info = source.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or source.is_symlink():
                raise ValueError('BOOTSTRAP_KIT_SOURCE')
            for parent in source.parents:
                if parent.is_symlink() or (hasattr(parent, 'is_junction') and parent.is_junction()):
                    raise ValueError('BOOTSTRAP_KIT_SOURCE')
            if info.st_size != row['bytes'] or info.st_size > 16 * 1024 ** 2:
                raise ValueError('BOOTSTRAP_KIT_SIZE')
            data = source.read_bytes()
            total += len(data)
            if total > 64 * 1024 ** 2 or hashlib.sha256(data).hexdigest() != row['sha256']:
                raise ValueError('BOOTSTRAP_KIT_CHANGED')
            header = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            header.create_system = 3
            header.external_attr = (stat.S_IFREG | 0o644) << 16
            header.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(header, data)
            names.add(name)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None or len(archive.infolist()) != len(rows):
            raise ValueError('BOOTSTRAP_KIT_READBACK')
        for row in rows:
            if hashlib.sha256(archive.read(row['name'])).hexdigest() != row['sha256']:
                raise ValueError('BOOTSTRAP_KIT_READBACK')
    return {'files': len(rows), 'bytes': total, 'readbackVerified': True}


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('BOOTSTRAP_KIT_USAGE')
    print(json.dumps(build(sys.argv[1], sys.argv[2])))
