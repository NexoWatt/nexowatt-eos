'use strict';
// Linux flock locks belong to an open file description. The short trusted flock
// helper receives a duplicate of our already validated descriptor and exits
// after acquiring it; the coordinator's descriptor keeps the kernel lease until
// close or process exit. No separate long-lived lock holder can die mid-update.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { rootOwned } = require('../release/installed-check.cjs');
const { toolTrust } = require('../../tools/system/host-preflight.cjs');
const LOCK = '/var/lib/nexowatt-eos-os-updates/private/maintenance.lock';
const fail = code => Object.assign(new Error(code), { code });
function acquire({ file = LOCK, owner = rootOwned, spawnImpl = spawn, trust = toolTrust, expectedUid = 0 } = {}) {
    owner(path.dirname(file)); owner(file);
    if (!trust('/usr/bin/flock').trusted) throw fail('REPAIR_MAINTENANCE_LOCK');
    const before = fs.lstatSync(file);
    const safe = stat => stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === expectedUid && (stat.mode & 0o7777) === 0o600;
    if (!safe(before)) throw fail('REPAIR_MAINTENANCE_LOCK');
    let descriptor = fs.openSync(file, fs.constants.O_RDWR | fs.constants.O_NOFOLLOW);
    const opened = fs.fstatSync(descriptor);
    if (!safe(opened) || before.dev !== opened.dev || before.ino !== opened.ino) {
        fs.closeSync(descriptor); throw fail('REPAIR_MAINTENANCE_LOCK');
    }
    const release = () => { if (descriptor !== null) { const previous = descriptor; descriptor = null; fs.closeSync(previous); } };
    const assert = () => {
        if (descriptor === null) throw fail('REPAIR_MAINTENANCE_LOCK');
        owner(file);
        const current = fs.lstatSync(file), held = fs.fstatSync(descriptor);
        if (!safe(current) || !safe(held) || before.dev !== current.dev || before.ino !== current.ino ||
            before.dev !== held.dev || before.ino !== held.ino) throw fail('REPAIR_MAINTENANCE_LOCK');
    };
    return new Promise((resolve, reject) => {
        let child, done = false;
        const finish = code => {
            if (done) return; done = true; clearTimeout(timer);
            if (code) { release(); reject(fail(code)); return; }
            try { assert(); resolve({ assert, release }); } catch (error) { release(); reject(error); }
        };
        const timer = setTimeout(() => { child?.kill('SIGKILL'); finish('REPAIR_MAINTENANCE_LOCK'); }, 5000);
        try {
            child = spawnImpl('/usr/bin/flock', ['--exclusive', '--nonblock', '--conflict-exit-code', '75', '3'],
                { stdio: ['ignore', 'ignore', 'ignore', descriptor], env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
            child.once('error', () => finish('REPAIR_MAINTENANCE_LOCK'));
            child.once('exit', status => finish(status === 0 ? null : status === 75 ? 'REPAIR_MAINTENANCE_IN_PROGRESS' : 'REPAIR_MAINTENANCE_LOCK'));
        } catch { finish('REPAIR_MAINTENANCE_LOCK'); }
    });
}
module.exports = { LOCK, acquire };
