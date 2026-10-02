'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

const modulePath = path.resolve(__dirname, '../build/lib/sdCard.js');
const source = fs.readFileSync(modulePath, 'utf8');
const mount = '/mnt/eos-backup';
const backup = `${mount}/nexowatt-eos-backups`;

// POSIX filesystem and lsblk/findmnt fixtures: portable on the Windows publisher.
// No real devices, system files or production backups are accessed by these tests.
function fixture(options = {}) {
    const calls = { access: [], mkdir: [], open: [], rm: [] };
    const entries = new Map([[mount, { kind: 'directory', dev: 42 }]]);
    if (!options.missing) entries.set(backup, { kind: options.kind || 'directory', dev: options.dev || 42 });
    const snapshot = {
        blockdevices: [
            { name: 'nvme0n1', path: '/dev/nvme0n1', type: 'disk', tran: 'nvme', children: [
                {name: 'nvme0n1p2', pkname: 'nvme0n1', path: '/dev/nvme0n1p2', type: 'part', fstype: 'ext4', mountpoints: ['/']},
            ]},
            {name: 'mmcblk0', path: '/dev/mmcblk0', type: 'disk', tran: 'mmc', rm: 1, children: [
                {name: 'mmcblk0p1', pkname: 'mmcblk0', path: '/dev/mmcblk0p1', type: 'part', fstype: 'ext4', mountpoints: [mount], ro: !!options.readOnly},
            ]},
        ],
    };
    let mountQueries = 0;
    const error = code => Object.assign(new Error(code), {code});
    const info = async file => {
        const entry = entries.get(file);
        if (!entry) throw error('ENOENT');
        return {dev: entry.dev, isDirectory: () => entry.kind === 'directory', isSymbolicLink: () => entry.kind === 'symlink'};
    };
    const fakeFs = {
        realpath: async file => file,
        stat: info, lstat: info,
        access: async (file, mask) => {
            calls.access.push({file, mask});
            if (!entries.has(file)) throw error('ENOENT');
            if ((file === mount || options.noWrite) && mask & fs.constants.W_OK) throw error('EACCES');
            if (options.noRead && mask & fs.constants.R_OK) throw error('EACCES');
        },
        mkdir: async file => {
            calls.mkdir.push(file);
            if (options.denyCreate) throw error('EACCES');
            entries.set(file, {kind: 'directory', dev: 42});
        },
        open: async file => {
            calls.open.push(file);
            if (options.probeFails) throw error('EACCES');
            return {writeFile: async () => {}, sync: async () => {}, close: async () => {}};
        },
        rm: async file => {calls.rm.push(file);},
        statfs: async () => ({bavail: 1024, bsize: 4096}),
    };
    const childProcess = {
        execFile: (command, args, _opts, callback) => {
            let output;
            if (command === 'lsblk') output = JSON.stringify(snapshot);
            else if (command === 'findmnt' && !args.includes('--json')) output = '/dev/nvme0n1p2\n';
            else if (command === 'findmnt') {
                mountQueries++;
                const removed = options.unmounted || (options.removedDuringCheck && mountQueries > 1);
                output = JSON.stringify({filesystems: [{
                    source: removed || options.systemDisk ? '/dev/nvme0n1p2' : '/dev/mmcblk0p1',
                    target: removed ? '/' : mount, fstype: 'ext4', options: options.readOnly ? 'ro' : 'rw',
                }]});
            } else throw new Error(`Unexpected command: ${command}`);
            callback(null, output, '');
        },
    };
    const exports = {};
    vm.runInNewContext(source, {
        exports, process: {platform: 'linux', pid: 900}, console,
        require: name => name === 'node:fs/promises' ? fakeFs : name === 'node:child_process' ? childProcess : require(name),
    }, {filename: modulePath});
    return {validate: exports.validateSdCardTarget, calls};
}

test('write validation uses the writable subdirectory, not the root-owned mount root', async () => {
    const f = fixture();
    const result = await f.validate(mount, undefined, {createDirectory: false, writeTest: false});
    assert.equal(result.backupDir, backup);
    assert.equal(f.calls.access[0].file, backup);
    assert.ok(f.calls.access[0].mask & fs.constants.W_OK);
});

test('read listing needs read/search rights only and never creates or probes', async () => {
    const f = fixture({noWrite: true});
    const result = await f.validate(mount, undefined, {accessMode: 'read'});
    assert.equal(result.backupDir, backup);
    assert.equal(f.calls.access[0].mask, fs.constants.R_OK | fs.constants.X_OK);
    assert.equal(f.calls.mkdir.length, 0);
    assert.equal(f.calls.open.length, 0);
});

test('read mode can read a read-only mounted card without writing', async () => {
    const f = fixture({readOnly: true, noWrite: true});
    await f.validate(mount, undefined, {accessMode: 'read'});
    assert.equal(f.calls.open.length, 0);
});

test('backup refuses a read-only mounted card', async () => {
    const f = fixture({readOnly: true});
    await assert.rejects(f.validate(mount), /schreibgeschützt/);
    assert.equal(f.calls.open.length, 0);
});

test('backup refuses a subdirectory without write access, naming the actual directory', async () => {
    const f = fixture({noWrite: true});
    await assert.rejects(f.validate(mount), err => /EACCES/.test(err.message) && err.message.includes(backup));
    assert.equal(f.calls.open.length, 0);
});

test('read listing refuses a subdirectory without read access', async () => {
    const f = fixture({noRead: true});
    await assert.rejects(f.validate(mount, undefined, {accessMode: 'read'}), /Lese-\/Suchrechte/);
});

test('backup writes a probe only in the actual backup directory', async () => {
    const f = fixture();
    await f.validate(mount);
    assert.equal(f.calls.open.length, 1);
    assert.ok(f.calls.open[0].startsWith(`${backup}/.nexowatt-write-test-`));
    assert.deepEqual(f.calls.rm, f.calls.open);
});

test('failed actual write probe rejects backup and cleanup is attempted', async () => {
    const f = fixture({probeFails: true});
    await assert.rejects(f.validate(mount), /EACCES/);
    assert.equal(f.calls.rm.length, 1);
});

test('missing directory during listing is distinct from a missing card and never created', async () => {
    const f = fixture({missing: true});
    await assert.rejects(f.validate(mount, undefined, {accessMode: 'read'}), err => err.code === 'SD_BACKUP_DIR_MISSING');
    assert.equal(f.calls.mkdir.length, 0);
});

test('new backup may create its directory if the parent permits it', async () => {
    const f = fixture({missing: true});
    await f.validate(mount);
    assert.deepEqual(f.calls.mkdir, [backup]);
});

test('directory creation failure is explicit and does not attempt a probe', async () => {
    const f = fixture({missing: true, denyCreate: true});
    await assert.rejects(f.validate(mount), /nicht angelegt werden.*EACCES/);
    assert.equal(f.calls.open.length, 0);
});

test('missing SD mount never falls back to a directory on the system disk', async () => {
    const f = fixture({unmounted: true});
    await assert.rejects(f.validate(mount), /kein eigener Einhängepunkt/);
    assert.equal(f.calls.mkdir.length + f.calls.open.length, 0);
});

test('SD removal during the checks aborts before any probe is written', async () => {
    const f = fixture({removedDuringCheck: true});
    await assert.rejects(f.validate(mount), /während der Prüfung entfernt/);
    assert.equal(f.calls.open.length, 0);
});

test('system disk, symlink, non-directory and different filesystem remain excluded', async t => {
    for (const [name, options, expected] of [
        ['system disk', {systemDisk: true}, /Systemdatenträger/],
        ['symlink', {kind: 'symlink'}, /symbolische Verknüpfungen/],
        ['plain file', {kind: 'file'}, /echtes Verzeichnis/],
        ['nested filesystem', {dev: 77}, /anderen Dateisystem/],
    ]) {
        await t.test(name, async () => {
            const f = fixture(options);
            await assert.rejects(f.validate(mount), expected);
            assert.equal(f.calls.open.length, 0);
        });
    }
});

test('listing an empty card returns an empty list instead of logging a permissions error', async () => {
    const filename = path.resolve(__dirname, '../build/lib/list/cifs.js');
    const exports = {};
    const logs = [];
    const sdCalls = [];
    const localRequire = createRequire(filename);
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        exports, process, __dirname: path.dirname(filename), console,
        require: name => {
            if (name === '../tools') return {getIobDir: () => '/opt/iobroker'};
            if (name === '../sdCard') return {validateSdCardTarget: async (...args) => {
                sdCalls.push(args);
                throw Object.assign(new Error('missing folder'), {code: 'SD_BACKUP_DIR_MISSING'});
            }};
            return localRequire(name);
        },
    }, {filename});
    const result = await exports.list({
        context: {log: {error: text => logs.push(text)}},
        options: {enabled: true, mountType: 'SDCard', mount, sdCardBackupSubDir: 'nexowatt-eos-backups'},
        restoreSource: 'cifs', types: [],
    });
    assert.equal(Object.keys(result).length, 0);
    assert.equal(logs.length, 0);
    assert.equal(sdCalls[0][2].accessMode, 'read');
});

test('Linux permissions: non-root process succeeds with non-writable mount root and writable child', {
    skip: process.platform !== 'linux' || process.env.NEXOWATT_SKIP_LINUX_RUNTIME_TESTS === '1',
}, () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-sd-permission-'));
    const root = path.join(base, 'card');
    const child = path.join(root, 'nexowatt-eos-backups');
    try {
        fs.chmodSync(base, 0o755);
        fs.mkdirSync(root, {mode: 0o755});
        fs.mkdirSync(child, {mode: 0o700});
        const dropPrivileges = process.getuid() === 0;
        if (dropPrivileges) fs.chownSync(child, 65534, 65534);
        fs.chmodSync(root, 0o555);
        const result = spawnSync(process.execPath, [path.join(__dirname, 'helpers/sd-card-permission-child.cjs'), root, modulePath], {
            encoding: 'utf8', timeout: 15000,
            ...(dropPrivileges ? {uid: 65534, gid: 65534} : {}),
        });
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}\n${result.error || ''}`);
        assert.match(result.stdout, /SD_PERMISSION_OK/);
    } finally {
        fs.chmodSync(root, 0o755);
        fs.rmSync(base, {recursive: true, force: true});
    }
});
