'use strict';
// Real Linux permissions with synthetic device discovery. Never touches a real SD card.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const vm = require('node:vm');
const path = require('node:path');
const [mount, modulePath] = process.argv.slice(2);
if (!mount || !modulePath || process.getuid() === 0) throw new Error('Non-root fixture required');
const snapshot = {blockdevices: [
    {name: 'nvme0n1', path: '/dev/nvme0n1', type: 'disk', children: [
        {name: 'nvme0n1p2', pkname: 'nvme0n1', path: '/dev/nvme0n1p2', type: 'part', fstype: 'ext4', mountpoints: ['/']},
    ]},
    {name: 'mmcblk0', path: '/dev/mmcblk0', type: 'disk', tran: 'mmc', children: [
        {name: 'mmcblk0p1', pkname: 'mmcblk0', path: '/dev/mmcblk0p1', type: 'part', fstype: 'ext4', mountpoints: [mount]},
    ]},
]};
const output = {};
vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), {
    exports: output, process, console,
    require: name => name === 'node:child_process' ? {execFile: (cmd, args, _opts, cb) => {
        if (cmd === 'lsblk') cb(null, JSON.stringify(snapshot), '');
        else if (cmd === 'findmnt' && !args.includes('--json')) cb(null, '/dev/nvme0n1p2', '');
        else if (cmd === 'findmnt') cb(null, JSON.stringify({filesystems: [{source: '/dev/mmcblk0p1', target: mount, fstype: 'ext4', options: 'rw'}]}), '');
        else throw new Error(`Unexpected command ${cmd}`);
    }} : require(name),
}, {filename: modulePath});
(async () => {
    await assert.rejects(fsp.access(mount, fs.constants.W_OK));
    const backup = path.join(mount, 'nexowatt-eos-backups');
    await fsp.access(backup, fs.constants.W_OK);
    await output.validateSdCardTarget(mount, undefined, {createDirectory: false, writeTest: false});
    await output.validateSdCardTarget(mount, undefined, {createDirectory: false, writeTest: false, accessMode: 'read'});
    await output.validateSdCardTarget(mount, undefined, {createDirectory: true, writeTest: true});
    assert.equal(fs.readdirSync(backup).length, 0);
    console.log('SD_PERMISSION_OK');
})().catch(error => {console.error(error.message); process.exitCode = 1;});
