'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { posix: pathPosix } = require('node:path');

const {
    normalizeSdCardSubDir,
    parseLsblkOutput,
    resolveSdCardBackupDir,
    selectSdCardTargets,
} = require('../build/lib/sdCard.js');
const { selectInfluxBackupsToDelete } = require('../build/lib/scripts/60-cifs.js');

function parse(blockdevices) {
    return parseLsblkOutput(JSON.stringify({ blockdevices }));
}

test('excludes the system mmc device and offers a separately mounted SD card', () => {
    const devices = parse([
        {
            name: 'mmcblk0',
            kname: 'mmcblk0',
            path: '/dev/mmcblk0',
            type: 'disk',
            size: 128_000_000_000,
            rm: 0,
            ro: 0,
            hotplug: 0,
            tran: 'mmc',
            model: 'eMMC system',
            children: [
                {
                    name: 'mmcblk0p1',
                    kname: 'mmcblk0p1',
                    path: '/dev/mmcblk0p1',
                    pkname: 'mmcblk0',
                    type: 'part',
                    size: 512_000_000,
                    fstype: 'vfat',
                    mountpoints: ['/boot/firmware'],
                },
                {
                    name: 'mmcblk0p2',
                    kname: 'mmcblk0p2',
                    path: '/dev/mmcblk0p2',
                    pkname: 'mmcblk0',
                    type: 'part',
                    size: 127_000_000_000,
                    fstype: 'ext4',
                    mountpoints: ['/'],
                },
            ],
        },
        {
            name: 'mmcblk1',
            kname: 'mmcblk1',
            path: '/dev/mmcblk1',
            type: 'disk',
            size: 32_000_000_000,
            rm: 1,
            ro: 0,
            hotplug: 1,
            tran: 'mmc',
            model: 'Industrial SD',
            children: [
                {
                    name: 'mmcblk1p1',
                    kname: 'mmcblk1p1',
                    path: '/dev/mmcblk1p1',
                    pkname: 'mmcblk1',
                    type: 'part',
                    size: 31_900_000_000,
                    fstype: 'ext4',
                    mountpoints: ['/mnt/nexowatt-sd'],
                    ro: 0,
                },
            ],
        },
    ]);

    const targets = selectSdCardTargets({ devices, rootSource: '/dev/mmcblk0p2' });
    assert.deepEqual(
        targets.map(target => ({ device: target.device, mountPoint: target.mountPoint })),
        [{ device: '/dev/mmcblk1p1', mountPoint: '/mnt/nexowatt-sd' }],
    );
    assert.match(targets[0].label, /Industrial SD/);
});

test('still excludes the system mmc device when root is reported as /dev/root', () => {
    const devices = parse([
        {
            name: 'mmcblk0',
            kname: 'mmcblk0',
            path: '/dev/mmcblk0',
            type: 'disk',
            size: 64_000_000_000,
            rm: 0,
            ro: 0,
            hotplug: 0,
            tran: 'mmc',
            children: [
                {
                    name: 'mmcblk0p2',
                    kname: 'mmcblk0p2',
                    path: '/dev/mmcblk0p2',
                    pkname: 'mmcblk0',
                    type: 'part',
                    size: 63_000_000_000,
                    fstype: 'ext4',
                    mountpoints: ['/'],
                },
            ],
        },
        {
            name: 'mmcblk1',
            kname: 'mmcblk1',
            path: '/dev/mmcblk1',
            type: 'disk',
            size: 32_000_000_000,
            rm: 1,
            ro: 0,
            hotplug: 1,
            tran: 'mmc',
            children: [
                {
                    name: 'mmcblk1p1',
                    kname: 'mmcblk1p1',
                    path: '/dev/mmcblk1p1',
                    pkname: 'mmcblk1',
                    type: 'part',
                    size: 31_000_000_000,
                    fstype: 'ext4',
                    mountpoints: ['/media/backup-sd'],
                },
            ],
        },
    ]);

    const targets = selectSdCardTargets({ devices, rootSource: '/dev/root' });
    assert.deepEqual(targets.map(target => target.parentDevice), ['/dev/mmcblk1']);
});

test('offers a removable USB card reader but excludes a non-removable USB SSD', () => {
    const devices = parse([
        {
            name: 'nvme0n1',
            kname: 'nvme0n1',
            path: '/dev/nvme0n1',
            type: 'disk',
            size: 256_000_000_000,
            tran: 'nvme',
            children: [
                {
                    name: 'nvme0n1p2',
                    kname: 'nvme0n1p2',
                    path: '/dev/nvme0n1p2',
                    pkname: 'nvme0n1',
                    type: 'part',
                    fstype: 'ext4',
                    size: 255_000_000_000,
                    mountpoints: ['/'],
                },
            ],
        },
        {
            name: 'sda',
            kname: 'sda',
            path: '/dev/sda',
            type: 'disk',
            size: 1_000_000_000_000,
            tran: 'usb',
            rm: 0,
            hotplug: 1,
            model: 'USB SSD',
            children: [
                {
                    name: 'sda1',
                    kname: 'sda1',
                    path: '/dev/sda1',
                    pkname: 'sda',
                    type: 'part',
                    fstype: 'ext4',
                    size: 999_000_000_000,
                    mountpoints: ['/mnt/usb-ssd'],
                },
            ],
        },
        {
            name: 'sdb',
            kname: 'sdb',
            path: '/dev/sdb',
            type: 'disk',
            size: 64_000_000_000,
            tran: 'usb',
            rm: 1,
            hotplug: 1,
            model: 'USB card reader',
            children: [
                {
                    name: 'sdb1',
                    kname: 'sdb1',
                    path: '/dev/sdb1',
                    pkname: 'sdb',
                    type: 'part',
                    fstype: 'exfat',
                    size: 63_000_000_000,
                    mountpoints: ['/media/sdcard'],
                },
            ],
        },
    ]);

    const targets = selectSdCardTargets({ devices, rootSource: '/dev/nvme0n1p2' });
    assert.deepEqual(targets.map(target => target.device), ['/dev/sdb1']);
});

test('normalizes safe relative subdirectories and rejects traversal or absolute paths', () => {
    assert.equal(normalizeSdCardSubDir('eos/backups/'), 'eos/backups');
    assert.equal(normalizeSdCardSubDir(''), 'nexowatt-eos-backups');
    assert.throws(() => normalizeSdCardSubDir('/etc'), /relativer/);
    assert.throws(() => normalizeSdCardSubDir('../escape'), /„\.\.\“-Segmente/);
    assert.throws(() => normalizeSdCardSubDir('safe/./escape'), /„\.“- oder „\.\.“-Segmente/);

    assert.equal(resolveSdCardBackupDir('/mnt/sd', 'eos-backups'), pathPosix.resolve('/mnt/sd/eos-backups'));
    assert.equal(resolveSdCardBackupDir('/mnt/sd', '../escape'), '');
    assert.equal(resolveSdCardBackupDir('', 'eos-backups'), '');
});

test('keeps the newest three InfluxDB generations and marks older archives for deletion', () => {
    const names = [
        'influxDB_2026_09_12-02_30_00_backupiobroker.tar.gz',
        'influxDB_2026_09_13-02_30_00_backupiobroker.tar.gz',
        'influxDB_2026_09_14-02_30_00_backupiobroker.tar.gz',
        'influxDB_2026_09_15-02_30_00_backupiobroker.tar.gz',
        'influxDB_2026_09_16-02_30_00_backupiobroker.tar.gz',
        'iobroker_2026_09_10-02_30_00_nexowatt-eos_backupiobroker.tar.gz',
    ];

    assert.deepEqual(selectInfluxBackupsToDelete(names, 3), [
        'influxDB_2026_09_12-02_30_00_backupiobroker.tar.gz',
        'influxDB_2026_09_13-02_30_00_backupiobroker.tar.gz',
    ]);
});

test('keeps three generations per configured InfluxDB suffix and ignores unrelated files', () => {
    const names = [
        'influxDB_2026_09_10-02_30_00_plant-a_backupiobroker.tar.gz',
        'influxDB_2026_09_11-02_30_00_plant-a_backupiobroker.tar.gz',
        'influxDB_2026_09_12-02_30_00_plant-a_backupiobroker.tar.gz',
        'influxDB_2026_09_13-02_30_00_plant-a_backupiobroker.tar.gz',
        'influxDB_2026_09_10-03_30_00_plant-b_backupiobroker.tar.gz',
        'influxDB_2026_09_11-03_30_00_plant-b_backupiobroker.tar.gz',
        'influxDB_2026_09_12-03_30_00_plant-b_backupiobroker.tar.gz',
        'influxDB_2026_09_13-03_30_00_plant-b_backupiobroker.tar.gz',
        'influxDB-not-a-backup.txt',
        'random.tar.gz',
    ];

    assert.deepEqual(selectInfluxBackupsToDelete(names, 3), [
        'influxDB_2026_09_10-02_30_00_plant-a_backupiobroker.tar.gz',
        'influxDB_2026_09_10-03_30_00_plant-b_backupiobroker.tar.gz',
    ]);
});


test('uses only logger methods that exist in the backup execution context', () => {
    const files = [
        'build/lib/scripts/01-mount.js',
        'build/lib/scripts/60-cifs.js',
    ];

    for (const file of files) {
        const source = readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /\bctx\.log\.info\s*\(/, `${file} must not call ctx.log.info()`);
    }

    const mountSource = readFileSync('build/lib/scripts/01-mount.js', 'utf8');
    const copySource = readFileSync('build/lib/scripts/60-cifs.js', 'utf8');
    assert.match(mountSource, /ctx\.log\.debug\(`SD-Karte geprüft:/);
    assert.match(copySource, /ctx\.log\.debug\(`SD-Karten-Rotation:/);
});
