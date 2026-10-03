#!/usr/bin/env python3
"""Build-only canonical TEST tar/gzip writer and full member readback verifier.

No private key, execution, network, or archive extraction. Cryptographic signature
verification is performed by the Node caller against the returned archive bytes.
"""
import base64
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import tarfile

MAX_FILES = 60000
MAX_ENTRIES = 120010
MAX_FILE = 128 * 1024 * 1024
MAX_MANIFEST = 16 * 1024 * 1024
MAX_BYTES = 1024 * 1024 * 1024
MAX_ARCHIVE = MAX_BYTES + 192 * 1024 * 1024
MTIME = 1790899200  # 2026-10-02T00:00:00Z


def require(condition):
    if not condition:
        raise ValueError('TEST_ARCHIVE_INVALID')


def local_path(value):
    absolute = os.path.abspath(value)
    if os.name == 'nt':
        # Python installations may retain MAX_PATH even though Node supports
        # long dependency paths. Use only the local drive extended-path form.
        require(len(absolute) >= 3 and absolute[1:3] == ':\\')
        absolute = '\\\\?\\' + absolute
    return Path(absolute)


def safe(name):
    require(isinstance(name, str) and 0 < len(name) <= 1024)
    require(not name.startswith('/') and '\\' not in name and ':' not in name)
    require(all(ord(char) >= 32 and ord(char) != 127 for char in name))
    parts = name.split('/')
    require(len(parts) <= 48 and all(part and part not in ('.', '..', '__proto__', 'prototype', 'constructor') for part in parts))
    return name


def plain_file(file, maximum):
    before = file.lstat()
    require(stat.S_ISREG(before.st_mode) and not file.is_symlink() and before.st_nlink == 1 and before.st_size <= maximum)
    fd = os.open(file, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    opened = os.fstat(fd)
    if (opened.st_dev, opened.st_ino, opened.st_size) != (before.st_dev, before.st_ino, before.st_size):
        os.close(fd)
        raise ValueError('TEST_ARCHIVE_CHANGED')
    return os.fdopen(fd, 'rb')


def bounded(file, maximum):
    with plain_file(file, maximum) as handle:
        data = handle.read(maximum + 1)
    require(len(data) <= maximum)
    return data


def manifest_rows(data):
    require(len(data) <= MAX_MANIFEST)
    value = json.loads(data)
    require(isinstance(value, dict) and value.get('profile') == 'test')
    rows = value.get('files')
    require(isinstance(rows, list) and 0 < len(rows) <= MAX_FILES)
    previous, total = '', 0
    files = {}
    for row in rows:
        require(isinstance(row, dict) and set(row) == {'path', 'size', 'sha256', 'mode'})
        name = safe(row['path'])
        require(name > previous and name not in files)
        require(type(row['size']) is int and 0 <= row['size'] <= MAX_FILE and row['mode'] in (0o644, 0o755))
        require(isinstance(row['sha256'], str) and len(row['sha256']) == 64 and all(c in '0123456789abcdef' for c in row['sha256']))
        require(all(str(parent) not in files for parent in PurePosixPath(name).parents if str(parent) != '.'))
        previous = name
        total += row['size']
        files[name] = row
    require(total <= MAX_BYTES)
    return files


def directories(files):
    result = {'bundle', 'bundle/payload'}
    for name in files:
        current = PurePosixPath('bundle/payload/' + name).parent
        while str(current) != '.':
            result.add(str(current))
            current = current.parent
    require(len(result) + len(files) + 2 <= MAX_ENTRIES)
    return sorted(result)


def info(name, size, mode, directory=False):
    item = tarfile.TarInfo(name)
    item.type = tarfile.DIRTYPE if directory else tarfile.REGTYPE
    item.size, item.mode, item.mtime = size, mode, MTIME
    item.uid = item.gid = 0
    item.uname = item.gname = ''
    return item


def create(payload, input_file, archive):
    root = local_path(payload)
    require(root.is_dir() and not root.is_symlink() and root.resolve() == root)
    request = json.loads(bounded(local_path(input_file), MAX_MANIFEST * 2))
    require(set(request) == {'schemaVersion', 'manifestBase64', 'signatureBase64'} and request['schemaVersion'] == 1)
    manifest = base64.b64decode(request['manifestBase64'], validate=True)
    signature = base64.b64decode(request['signatureBase64'], validate=True)
    require(len(signature) == 64)
    files = manifest_rows(manifest)
    # Exclusive output; gzip carries no local filename or creation timestamp.
    with open(local_path(archive), 'xb') as raw:
        with gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0, compresslevel=9) as compressed:
            with tarfile.open(fileobj=compressed, mode='w|', format=tarfile.PAX_FORMAT) as target:
                for name in directories(files):
                    target.addfile(info(name, 0, 0o755, True))
                for name, data in [('bundle/manifest.json', manifest), ('bundle/manifest.sig', signature)]:
                    target.addfile(info(name, len(data), 0o644), io.BytesIO(data))
                for name, row in files.items():
                    file = root.joinpath(*name.split('/'))
                    # Reject junction/reparse/symlink traversal before opening.
                    require(file.resolve() == file and all(not part.is_symlink() for part in [file, *file.parents]))
                    with plain_file(file, MAX_FILE) as handle:
                        before = os.fstat(handle.fileno())
                        require(before.st_size == row['size'])
                        digest = hashlib.file_digest(handle, 'sha256').hexdigest()
                        require(digest == row['sha256'])
                        handle.seek(0)
                        target.addfile(info('bundle/payload/' + name, row['size'], row['mode']), handle)
                        after = os.fstat(handle.fileno())
                        require((before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (after.st_size, after.st_mtime_ns, after.st_ctime_ns))
        raw.flush()
        os.fsync(raw.fileno())
    return {'created': True}


def raw_headers(raw):
    # tarfile interprets PAX extensions before yielding a member. Bound their
    # declared lengths first, so a malformed extension cannot request a giant
    # allocation inside the otherwise streaming member verifier.
    total, entries = 0, 0
    with gzip.GzipFile(fileobj=raw, mode='rb') as source:
        while True:
            header = source.read(512)
            require(len(header) == 512)
            total += 512
            if not any(header):
                padding = source.read(10241)
                require(len(padding) <= 10240 and not any(padding))
                break
            item = tarfile.TarInfo.frombuf(header, 'utf-8', 'strict')
            entries += 1
            require(entries <= 2 * MAX_ENTRIES and item.type in (tarfile.REGTYPE, tarfile.DIRTYPE, tarfile.XHDTYPE))
            require(type(item.size) is int and item.size >= 0)
            if item.type == tarfile.XHDTYPE:
                require(item.size <= 4096)
            elif item.type == tarfile.DIRTYPE:
                require(item.size == 0)
            else:
                require(item.size <= MAX_FILE)
            remaining = ((item.size + 511) // 512) * 512
            total += remaining
            require(total <= MAX_ARCHIVE)
            while remaining:
                chunk = source.read(min(65536, remaining))
                require(chunk)
                remaining -= len(chunk)
    raw.seek(0)


def verify(archive):
    manifest, signature, payload_rows, seen_dirs = None, None, {}, set()
    total, count = 0, 0
    with plain_file(local_path(archive), MAX_ARCHIVE) as raw:
        archive_before = os.fstat(raw.fileno())
        raw_headers(raw)
        with gzip.GzipFile(fileobj=raw, mode='rb') as compressed, tarfile.open(fileobj=compressed, mode='r|') as source:
            for member in source:
                count += 1
                require(count <= MAX_ENTRIES)
                name = safe(member.name)
                require(member.type in (tarfile.REGTYPE, tarfile.DIRTYPE) and not member.linkname)
                require(member.uid == member.gid == 0 and member.uname == member.gname == '' and member.mtime == MTIME)
                require(set(member.pax_headers).issubset({'path'}) and not source.pax_headers)
                require(member.size <= MAX_FILE and member.size >= 0)
                if member.type == tarfile.DIRTYPE:
                    require(member.mode == 0o755 and member.size == 0 and name not in seen_dirs and name not in payload_rows)
                    seen_dirs.add(name)
                    continue
                require(member.mode in (0o644, 0o755) and name not in payload_rows and name not in seen_dirs)
                total += member.size
                require(total <= MAX_BYTES + MAX_MANIFEST + 64)
                data = source.extractfile(member)
                require(data is not None)
                if name in ('bundle/manifest.json', 'bundle/manifest.sig'):
                    require(member.mode == 0o644)
                    limit = MAX_MANIFEST if name.endswith('.json') else 64
                    require(member.size <= limit)
                    body = data.read(limit + 1)
                    require(len(body) == member.size)
                    if name.endswith('.json'):
                        require(manifest is None)
                        manifest = body
                    else:
                        require(signature is None and len(body) == 64)
                        signature = body
                else:
                    require(name.startswith('bundle/payload/'))
                    relative = safe(name[len('bundle/payload/'):])
                    digest, length = hashlib.sha256(), 0
                    while chunk := data.read(1024 * 1024):
                        digest.update(chunk)
                        length += len(chunk)
                    require(length == member.size and relative not in payload_rows)
                    payload_rows[relative] = {'path': relative, 'size': length, 'mode': member.mode, 'sha256': digest.hexdigest()}
            require(not source.pax_headers)
            # Consume the gzip trailer/CRC and reject hidden appended members
            # beyond the conventional all-zero tar record padding.
            remainder = source.fileobj.read(10241)
            require(len(remainder) <= 10240 and not any(remainder))
        require(manifest is not None and signature is not None)
        expected = manifest_rows(manifest)
        require(payload_rows == expected and seen_dirs == set(directories(expected)))
        raw.seek(0)
        digest = hashlib.file_digest(raw, 'sha256').hexdigest()
        archive_after = os.fstat(raw.fileno())
        require((archive_before.st_size, archive_before.st_mtime_ns, archive_before.st_ctime_ns) ==
                (archive_after.st_size, archive_after.st_mtime_ns, archive_after.st_ctime_ns))
    return {'schemaVersion': 1, 'kind': 'eos-test-archive-readback', 'passed': True,
            'manifestBase64': base64.b64encode(manifest).decode('ascii'),
            'signatureBase64': base64.b64encode(signature).decode('ascii'),
            'regularFiles': len(payload_rows) + 2, 'archiveSha256': digest, 'archiveBytes': archive_before.st_size}


if __name__ == '__main__':
    try:
        if len(sys.argv) == 5 and sys.argv[1] == 'create':
            result = create(*sys.argv[2:])
        elif len(sys.argv) == 3 and sys.argv[1] == 'verify':
            result = verify(sys.argv[2])
        else:
            raise ValueError('TEST_ARCHIVE_USAGE')
        print(json.dumps(result, separators=(',', ':')))
    except Exception:
        print('TEST_ARCHIVE_FAILED', file=sys.stderr)
        sys.exit(1)
