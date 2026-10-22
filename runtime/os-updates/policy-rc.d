#!/usr/bin/python3 -I
"""Defer Debian package service actions only during the fixed EOS OS job.

This is the Debian policy-rc.d interface, not an arbitrary command runner.
Direct service control by a maintainer script is outside this interface.
"""
import os
from pathlib import Path
import re
import stat
import sys

PRIVATE = Path('/var/lib/nexowatt-eos-os-updates/private')
MARKER = PRIVATE / 'service-actions-deferred'
BOOT_ID = Path('/proc/sys/kernel/random/boot_id')


def record_deferred():
    for item in [*reversed(PRIVATE.parents), PRIVATE]:
        info = item.lstat()
        if (not stat.S_ISDIR(info.st_mode) or info.st_uid != 0
                or info.st_mode & 0o022):
            raise ValueError('untrusted boundary')
    boot = BOOT_ID.read_text().strip()
    if not re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', boot):
        raise ValueError('boot identity')
    fd = os.open(MARKER, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(fd)
        if (not stat.S_ISREG(info.st_mode) or info.st_uid != 0
                or info.st_nlink != 1 or info.st_mode & 0o077):
            raise ValueError('untrusted marker')
        os.ftruncate(fd, 0)
        os.write(fd, (boot + '\n').encode('ascii'))
        os.fsync(fd)
    finally:
        os.close(fd)


def main():
    if os.environ.get('NEXOWATT_EOS_OS_MAINTENANCE') != '1':
        return 0
    # Never permit an action because evidence recording encountered a fault.
    try:
        if os.geteuid() != 0:
            return 101
        record_deferred()
    except Exception:
        pass
    return 101


if __name__ == '__main__':
    sys.exit(main())
