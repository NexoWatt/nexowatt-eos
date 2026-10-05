'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const loadLicenseModule = require('./lib/load-eos-license-module.cjs');
const source = require.resolve('../packages/eos-license-client/eos-platform');
const client = require.resolve('../packages/eos-license-client');
const releaseId = 'a'.repeat(64);
const statePath = '/etc/nexowatt-eos/release-state.json';
const modules = `/opt/nexowatt/eos/releases/${releaseId}/app/node_modules`;
const currentPath = '/opt/nexowatt/eos/current';
const profilePath = `${modules}/iobroker.js-controller/eos-test-profile.json`;
const main = `${modules}/iobroker.nexowatt-ui/main.js`;

// Model protected Linux paths and descriptor identity without changing the host
// filesystem. Positive results are isolated filesystem tests, not native EOS proof.
function fixture() {
    const files = new Map(), stats = new Map(), descriptors = new Map();
    let inode = 1, nextDescriptor = 10;
    function stat(directory, extra = {}) {
        return { uid: 0, mode: directory ? 0o40755 : 0o100644, nlink: 1, ino: inode++, dev: 1,
            isDirectory: () => directory, isFile: () => !directory, isSymbolicLink: () => false, ...extra };
    }
    function put(name, value) {
        let parent = path.dirname(name);
        while (!stats.has(parent)) { stats.set(parent, stat(true)); if (parent === '/') break; parent = path.dirname(parent); }
        const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
        files.set(name, bytes); stats.set(name, stat(false, { size: bytes.length }));
    }
    const state = { schemaVersion: 1, releaseId, sequence: 1, nodeVersion: process.versions.node, publicKeySha256: 'b'.repeat(64), profile: 'test' };
    const profile = { schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
        adapters: [{ package: 'iobroker.nexowatt-ui', version: '1.0.0', main: 'main.js' }] };
    put(statePath, state); put(profilePath, profile); put(main, Buffer.from('entry'));
    put(`${modules}/iobroker.nexowatt-ui/package.json`, { name: 'iobroker.nexowatt-ui', version: '1.0.0', main: 'main.js' });
    put(`${modules}/iobroker.js-controller/package.json`, { name: 'iobroker.js-controller', version: '7.2.2' });
    stats.set(currentPath, stat(false, { isSymbolicLink: () => true }));
    const links = new Map([[currentPath, `/opt/nexowatt/eos/releases/${releaseId}`]]);
    const fakeFs = {
        constants: fs.constants,
        readlinkSync(name) { return links.get(name); },
        lstatSync(name) { if (!stats.has(name)) throw Object.assign(Error('PRIVATE_PATH'), { code: 'ENOENT' }); return stats.get(name); },
        openSync(name) { const descriptor = nextDescriptor++; descriptors.set(descriptor, { name, offset: 0 }); return descriptor; },
        fstatSync(descriptor) { return stats.get(descriptors.get(descriptor).name); },
        readSync(descriptor, buffer, offset, length) {
            const entry = descriptors.get(descriptor), bytes = files.get(entry.name);
            const used = bytes.copy(buffer, offset, entry.offset, entry.offset + length); entry.offset += used; return used;
        },
        closeSync(descriptor) { descriptors.delete(descriptor); },
    };
    const originalRequire = createRequire(source);
    const load = name => name === 'node:fs' ? fakeFs : originalRequire(name);
    load.main = { filename: main };
    const fakeProcess = { platform: 'linux', versions: { node: process.versions.node } };
    const module = { exports: {} };
    const wrapper = vm.runInThisContext(`(function(require,module,exports,process){\n${fs.readFileSync(source, 'utf8')}\n})`, { filename: source });
    wrapper(load, module, module.exports, fakeProcess);
    return { check: module.exports.assertEosPlatform, links, files, stats, descriptors, put, state, profile, load, fakeFs, fakeProcess };
}

test('root-managed active EOS release admits only the declared process/package and closes descriptors', () => {
    const f = fixture();
    assert.equal(f.check('nexowatt-ui'), true);
    assert.equal(f.descriptors.size, 0);
    assert.throws(() => f.check('another'), { code: 'EOS_PLATFORM_NOT_ADMITTED' });
    f.load.main.filename = '/opt/iobroker/node_modules/iobroker.nexowatt-ui/main.js';
    assert.throws(() => f.check('nexowatt-ui'), { code: 'EOS_PLATFORM_ENTRY' });
});

test('absent platform, unsupported OS and malformed protected metadata deny with safe codes', () => {
    const scenarios = [
        f => f.stats.delete(statePath),
        f => f.stats.delete(currentPath),
        f => { f.stats.get(currentPath).uid = 1000; },
        f => { f.stats.get(currentPath).isSymbolicLink = () => false; },
        f => f.links.set(currentPath, `/opt/nexowatt/eos/releases/${'c'.repeat(64)}`),
        f => { f.fakeProcess.platform = 'win32'; },
        f => f.put(statePath, { ...f.state, profile: 'ordinary-iobroker' }),
        f => f.put(statePath, { ...f.state, nodeVersion: '0.0.0' }),
        f => f.put(statePath, { ...f.state, releaseId: '../escape' }),
        f => f.put(statePath, { ...f.state, extra: true }),
        f => f.put(statePath, Buffer.from('{PRIVATE_BROKEN_JSON')),
        f => f.put(statePath, Buffer.from([0xff, 0xff])),
        f => f.put(statePath, Buffer.alloc(4097, 32)),
        f => f.put(profilePath, { ...f.profile, kind: 'iobroker' }),
        f => f.put(profilePath, { ...f.profile, adapters: [...f.profile.adapters, ...f.profile.adapters] }),
        f => f.put(profilePath, { ...f.profile, adapters: [{ ...f.profile.adapters[0], main: '../main.js' }] }),
        f => f.put(`${modules}/iobroker.nexowatt-ui/package.json`, { name: 'iobroker.nexowatt-ui', version: '2.0.0', main: 'main.js' }),
        f => f.put(`${modules}/iobroker.js-controller/package.json`, { name: 'iobroker.js-controller', version: '7.2.3' }),
    ];
    for (const change of scenarios) {
        const f = fixture(); change(f);
        assert.throws(() => f.check('nexowatt-ui'), error => /^EOS_PLATFORM_[A-Z_]+$/.test(error.code) && !error.message.includes('PRIVATE'));
        assert.equal(f.descriptors.size, 0);
    }
});

test('writable, non-root, symlinked and hard-linked paths or replaced descriptors fail closed', () => {
    for (const file of ['/', '/etc', '/etc/nexowatt-eos', statePath, '/opt', modules, profilePath, main]) {
        for (const change of [stat => { stat.uid = 1000; }, stat => { stat.mode |= 0o020; }, stat => { stat.mode |= 0o002; },
            stat => { stat.isSymbolicLink = () => true; }]) {
            const f = fixture(); change(f.stats.get(file));
            assert.throws(() => f.check('nexowatt-ui'), { code: 'EOS_PLATFORM_PERMISSIONS' }, file);
        }
    }
    const linked = fixture(); linked.stats.get(statePath).nlink = 2;
    assert.throws(() => linked.check('nexowatt-ui'), { code: 'EOS_PLATFORM_PERMISSIONS' });
    const swapped = fixture(), fstat = swapped.fakeFs.fstatSync;
    swapped.fakeFs.fstatSync = descriptor => ({ ...fstat(descriptor), ino: -1 });
    assert.throws(() => swapped.check('nexowatt-ui'), { code: 'EOS_PLATFORM_PERMISSIONS' });
    assert.equal(swapped.descriptors.size, 0);
});

test('client denies before contacting authority outside EOS and invalidates lease on platform loss', async t => {
    let admitted = false, sent = 0, lost = 0;
    const { createLicenseGuard } = loadLicenseModule(client, () => {
        if (!admitted) throw Object.assign(Error('EOS_PLATFORM_UNAVAILABLE'), { code: 'EOS_PLATFORM_UNAVAILABLE' });
        return true;
    });
    const guard = createLicenseGuard({ name: 'nexowatt-ui', namespace: 'nexowatt-ui.0', sendTo(_target, _command, request, callback) {
        sent++; const now = Date.now(); callback({ v: 1, nonce: request.nonce, valid: true, code: 'LICENSE_VALID', edition: 'home',
            features: ['energy'], limits: { chargePoints: 3, batteries: 2 }, checkedAt: now, validUntil: now + 1000 });
    } }, { onLost() { lost++; } });
    t.after(() => guard.stop());
    assert.equal(await guard.start(), false); assert.equal(sent, 0); assert.equal(lost, 1);
    admitted = true; assert.equal(await guard.refresh(), true); assert.equal(sent, 1);
    admitted = false; assert.equal(await guard.refresh(), false); assert.equal(sent, 1); assert.equal(lost, 2);
    assert.equal(guard.isAllowed(), false); assert.equal(guard.getStatus().code, 'EOS_PLATFORM_UNAVAILABLE');
});

test('all exported package files in UI mirror match canonical client', () => {
    for (const name of ['index.js', 'eos-platform.js', 'index.d.ts', 'package.json']) {
        assert.deepEqual(fs.readFileSync(path.join(__dirname, '../packages/eos-license-client', name)),
            fs.readFileSync(path.join(__dirname, '../../ui/packages/eos-license-client', name)), name);
    }
});
