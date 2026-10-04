'use strict';
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const repair = require('../../tools/system/recover-r4-first-start-to-r7.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const { atomicWrite } = repair;
const ID = 'a'.repeat(64);
// Real temporary files, fsync, atomic state writes and symlink switching run below.
// Services, baseline inventory verification and native probing are explicit doubles.
const base = repair.BASES[0];
const test = (name, fn) => nodeTest(`R${base.sequence - 3}: ${name}`, fn);
function descriptors() {
    const manifest = sequence => ({ sequence, profile: 'test', releaseVersion: '0.2.0-test.3', nodeVersion: '24.21.0',
        platforms: ['linux-arm64'], files: [{ path: 'runtime/postgresql/schema.sql', size: 4, sha256: sha256('sql\n'), mode: 0o644 },
            { path: 'system/postgresql-test/systemd/nexowatt-eos-controller.service', size: 5, sha256: sha256('unit\n'), mode: 0o644 }] });
    const catalog = { entries: [{ id: 'js-controller', package: 'iobroker.js-controller', version: '7.2.2', sha256: '1'.repeat(64),
        kind: 'core', required: true, review: { status: 'approved-test' }, permissions: { shellExec: false } },
    { id: 'nexowatt-devices', package: 'iobroker.nexowatt-devices', version: '0.5.169', sha256: '2'.repeat(64),
        kind: 'adapter', required: false, review: { status: 'pending' }, permissions: { shellExec: false } }] };
    return { old: { releaseId: base.releaseId, manifest: manifest(base.sequence), catalog },
        next: { releaseId: ID, manifest: manifest(10), catalog: structuredClone(catalog) } };
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r6-update-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const dir of ['/etc/nexowatt-eos/web', '/etc/systemd/system', '/opt/nexowatt/eos/releases/' + base.releaseId,
        '/opt/nexowatt/eos/verified', '/var/lib/nexowatt-eos', '/import/bundle/payload']) fs.mkdirSync(at(dir), { recursive: true });
    const state = Buffer.from(JSON.stringify({ schemaVersion: 1, ...base }) + '\n');
    fs.writeFileSync(at('/etc/nexowatt-eos/release-state.json'), state);
    for (const name of repair.PRESERVED) fs.writeFileSync(at('/etc/nexowatt-eos/' + name), 'preserved-' + name);
    fs.writeFileSync(at('/etc/nexowatt-eos/.activation.lock'), JSON.stringify({ operation: 'ui-onboarding', releaseId: base.releaseId,
        invocationId: '1'.repeat(32), pid: 100 }) + '\n', { mode: 0o600 });
    fs.writeFileSync(at('/var/lib/nexowatt-eos/.initialized'), 'installed');
    fs.writeFileSync(at('/etc/systemd/system/nexowatt-eos-controller.service'), 'unit\n');
    fs.symlinkSync('/opt/nexowatt/eos/releases/' + base.releaseId, at('/opt/nexowatt/eos/current'));
    const publicKey = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' });
    fs.writeFileSync(at('/import/release-public.pem'), publicKey);
    fs.writeFileSync(at('/import/bundle/manifest.json'), '{}\n');
    fs.writeFileSync(at('/import/bundle/manifest.sig'), Buffer.alloc(64));
    const options = { bundleDirectory: at('/import/bundle'), publicKeyFile: at('/import/release-public.pem'),
        expectedReleaseId: ID, expectedKeySha256: sha256(publicKey) };
    const desc = descriptors(); desc.next.payloadPath = at('/import/bundle/payload');
    const events = []; let active = 'inactive';
    const dependencies = { root, uid: 0, ownerUid: process.getuid(), invocationId: '3'.repeat(32), nodeVersion: '24.21.0', platform: 'linux-arm64',
        ownerCheck: () => {}, toolTrust: () => ({ trusted: true }), trustedImport: () => {}, processExists: () => false,
        verifyFirstStart: async () => ({ setupId: 'f'.repeat(32), licenseConfigured: true, assertPreserved: () => {}, verifyLive: async () => { events.push('verify-live'); } }),
        inspectInstalled: (release, key) => {
            const id = path.basename(release), expected = repair.BASES.find(row => row.releaseId === id);
            assert.equal(key, expected ? expected.publicKeySha256 : options.expectedKeySha256);
            if (id === base.releaseId) return desc.old;
            if (id === repair.BASES[0].releaseId) return { ...desc.old, releaseId: id, manifest: { ...desc.old.manifest, sequence: 7 } };
            return desc.next;
        },
        verifyBundle: () => desc.next, validatePayload: () => ({ catalog: desc.next.catalog }),
        stageBundle: () => { events.push('stage'); fs.mkdirSync(at('/opt/nexowatt/eos/releases/' + ID)); },
        nativeProbe: () => { events.push('native'); return { passed: true, deviceIoPerformed: false }; },
        readiness: async () => { events.push('readiness'); },
        atomicWrite: (file, bytes) => atomicWrite(file, bytes),
        exec: (file, args) => {
            assert.equal(file, '/usr/bin/systemctl'); events.push(args.join(' '));
            if (args[0] === 'show') return { status: 0, stdout: args[1] === 'nexowatt-eos-controller.service' ? active : 'inactive' };
            if (args[0] === 'stop' && args.includes('nexowatt-eos-controller.service')) active = 'inactive';
            if (args[0] === 'start') active = 'active';
            if (args[0] === 'is-active' && args.includes('nexowatt-eos-controller.service') && active !== 'active') return { status: 3, stdout: '' };
            return { status: 0, stdout: '' };
        }, maintenance: {
            authorizeStart: (dir, operation) => { assert.equal(operation, 'test-release-repair'); events.push('permit'); fs.writeFileSync(path.join(dir, 'maintenance-start.json'), 'permit'); },
            blockStart: dir => { events.push('revoke'); const p = path.join(dir, 'maintenance-start.json'); if (fs.existsSync(p)) fs.unlinkSync(p); },
        } };
    return { at, state, options, dependencies, events, desc, active: () => active, setActive: value => { active = value; },
        current: () => fs.readlinkSync(at('/opt/nexowatt/eos/current')), journal: () => JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/first-start-recovery-r7.json'))),
        locked: () => fs.existsSync(at('/etc/nexowatt-eos/.activation.lock')) };
}
const expect = code => error => error.code === code;
test('successful recovery creates completion after readiness and preserves existing config/old release', async t => {
    const f = fixture(t), files = repair.PRESERVED.map(name => fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)));
    const lock = fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'));
    const result = await repair.update(f.options, f.dependencies);
    assert.equal(result.phase, 'FIRST_START_RECOVERED'); assert.equal(result.sequence, 10);
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + ID); assert.equal(f.active(), 'active'); assert.equal(f.locked(), false);
    assert.equal(f.journal().phase, 'ACTIVE'); assert.equal(Buffer.from(f.journal().originalLockBase64, 'base64').equals(lock), true);
    assert.equal(fs.statSync(f.at('/etc/nexowatt-eos/first-start-recovery-r7.json')).mode & 0o777, 0o600);
    const complete = JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json')));
    assert.equal(complete.releaseId, ID); assert.equal(complete.physicalControlEnabled, false); assert.equal(complete.licenseConfigured, true);
    for (const [i, name] of repair.PRESERVED.entries()) assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/' + name)), files[i]);
    assert.ok(f.events.indexOf('readiness') < f.events.indexOf('enable nexowatt-eos.target'));
    assert.ok(f.events.indexOf('verify-live') > f.events.indexOf('readiness'));
    assert.ok(!fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r7.guard')));
});
for (const [name, edit] of [
    ['completed first-start', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json'), '{}')],
    ['prior recovery', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/first-start-recovery-r7.json'), '{}')],
    ['R6 attempt', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/test-update-r6-status.json'), '{}')],
    ['existing permit', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/maintenance-start.json'), '{}')],
    ['foreign lock', f => fs.writeFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), '{"operation":"other"}')],
    ['live old coordinator', f => f.dependencies.processExists = () => true],
    ['wrong key pin', f => f.options.expectedKeySha256 = 'b'.repeat(64)],
    ['wrong release sequence', f => f.desc.next.manifest.sequence = 9],
    ['installed unit drift', f => fs.writeFileSync(f.at('/etc/systemd/system/nexowatt-eos-controller.service'), 'drift')],
    ['DB enrollment rejected', f => f.dependencies.verifyFirstStart = async () => { throw new Error('unsafe'); }],
    ['active controller', f => f.setActive('active')],
]) test(name + ' refuses before stage/stop and retains original lock', async t => {
    const f = fixture(t); edit(f); const lock = fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'));
    await assert.rejects(repair.update(f.options, f.dependencies));
    assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock')), lock);
    assert.ok(!f.events.includes('stage')); assert.ok(!f.events.some(event => event.startsWith('stop ')));
});
for (const phase of ['stage', 'native', 'readiness', 'verify-live', 'enable nexowatt-eos.target', 'disable nexowatt-eos-setup.target', 'ACTIVE-journal']) {
    test('fault at ' + phase + ' retains locked stopped R4 and never reports success', async t => {
        const f = fixture(t), reject = () => { throw Object.assign(new Error('injected'), { code: 'REPAIR_INJECTED' }); };
        if (phase === 'stage') f.dependencies.stageBundle = reject;
        else if (phase === 'native') f.dependencies.nativeProbe = reject;
        else if (phase === 'readiness') f.dependencies.readiness = reject;
        else if (phase === 'verify-live') f.dependencies.verifyFirstStart = async () => ({ setupId: 'f'.repeat(32), licenseConfigured: true, assertPreserved: () => {}, verifyLive: reject });
        else if (phase === 'ACTIVE-journal') f.dependencies.atomicWrite = (file, bytes) => {
            if (file.endsWith('first-start-recovery-r7.json') && JSON.parse(bytes).phase === 'ACTIVE') reject();
            atomicWrite(file, bytes);
        };
        else { const exec = f.dependencies.exec; f.dependencies.exec = (file, args) => args.join(' ') === phase ? { status: 1, stdout: '' } : exec(file, args); }
        await assert.rejects(repair.update(f.options, f.dependencies));
        assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + base.releaseId); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
        assert.deepEqual(fs.readFileSync(f.at('/etc/nexowatt-eos/release-state.json')), f.state);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/first-start-complete.json')), false);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/maintenance-start.json')), false);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/.first-start-recovery-r7.guard')), true);
    });
}
test('exact completed DB bindings are required; pending or changed password/settings/UUID are rejected', () => {
    const config = { fixed: true }, handoff = { schemaVersion: 2, passwordHash: 'private', settings: { licenseMode: 'verified' }, license: { mode: 'activate' } };
    const digest = value => sha256(JSON.stringify(value));
    const records = new Map([
        ['system.meta.eosEnrollment', { native: { state: 'complete', firstRunPolicyVersion: 1, firstRunBinding: digest({ passwordHash: handoff.passwordHash, settings: handoff.settings, config }) } }],
        ['system.meta.eosFirstStart', { native: { state: 'complete', settingsSha256: digest(handoff.settings) } }],
        ['system.user.admin', { common: { password: 'private' } }],
        ['system.meta.uuid', { native: { uuid: 'identity' } }],
    ]);
    const args = { config, handoff, records, identity: { schemaVersion: 1, releaseId: base.releaseId, uuid: 'identity' } };
    assert.equal(repair.validateBindings(args), true);
    for (const mutate of [a => a.records.get('system.meta.eosEnrollment').native.state = 'pending',
        a => a.records.get('system.meta.eosFirstStart').native.state = 'pending', a => a.handoff.passwordHash = 'changed',
        a => a.handoff.settings.changed = true, a => a.identity.uuid = 'other', a => a.records.get('system.user.admin').common.password = 'changed']) {
        const copy = structuredClone(args); mutate(copy); assert.throws(() => repair.validateBindings(copy), expect('REPAIR_FIRST_START_BINDING'));
    }
});
test('crash quiesce only revokes the owning R7 trial and still stops when revoke fails', () => {
    const id = '3'.repeat(32), events = [];
    const effects = { readLock: () => ({ operation: 'test-release-repair', invocationId: id, targetSequence: 10 }), block: () => { events.push('block'); throw new Error('fault'); }, stop: () => events.push('stop') };
    assert.throws(() => repair.quiesceIncomplete(effects, id)); assert.deepEqual(events, ['block', 'stop']);
    events.length = 0; assert.equal(repair.quiesceIncomplete(effects, '4'.repeat(32)).status, 'REPAIR_OTHER_MAINTENANCE'); assert.deepEqual(events, []);
});
const dbConnection = () => ({ host: '127.0.0.1', port: 15432, database: 'eos', user: 'eos_objects', options: { ssl: { ca: 'test-ca', cert: 'test-cert', key: 'test-key' } } });
function fakePg(rows, streamOverrides = {}) {
    const calls = []; let closed = false, config;
    class Client extends require('node:events').EventEmitter {
        constructor(input) { super(); config = input; this.connection = { stream: { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3', ...streamOverrides } }; }
        async connect() { calls.push('connect'); }
        async query(sql, params) { calls.push(sql); if (sql.startsWith('SELECT')) { assert.deepEqual(params, ['objects']); return { rows }; } return { rows: [] }; }
        async end() { closed = true; }
    }
    return { Client, calls, closed: () => closed, config: () => config };
}
test('read-only PostgreSQL snapshot requires TLS1.3 and issues only bounded SELECT inside read-only transaction', async () => {
    const f = fakePg([{ key: 'cfg.o.system.user.admin', value: Buffer.from('{"_id":"system.user.admin","type":"user"}') }]);
    const records = await repair.readOnlySnapshot(f.Client, dbConnection());
    assert.equal(records.get('system.user.admin').type, 'user'); assert.equal(f.closed(), true);
    assert.match(f.config().options, /default_transaction_read_only=on/);
    assert.equal(f.calls[1], 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    assert.match(f.calls[2], /sum\(octet_length\(value\)\) OVER\(\)<=4194304/); assert.match(f.calls[2], /LIMIT 2049/);
    assert.equal(f.calls.at(-1), 'ROLLBACK'); assert.equal(f.calls.some(sql => /^(INSERT|UPDATE|DELETE|CREATE|ALTER|LISTEN)/.test(sql)), false);
});
for (const [name, rows, stream] of [
    ['TLS downgrade', [], { getProtocol: () => 'TLSv1.2' }],
    ['untrusted peer', [], { authorized: false }],
    ['oversized query result', Array.from({ length: 2049 }, () => ({})), {}],
    ['SQL size guard rejection', [{ key: 'cfg.o.system.user.admin', value: null }], {}],
    ['object/key mismatch', [{ key: 'cfg.o.system.user.admin', value: Buffer.from('{"_id":"foreign"}') }], {}],
]) test(name + ' rejects read-only snapshot and closes connection', async () => {
    const f = fakePg(rows, stream); await assert.rejects(repair.readOnlySnapshot(f.Client, dbConnection())); assert.equal(f.closed(), true);
});
test('foreign pointer during trial is not overwritten and remains stopped behind recovery gate', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => {
        fs.unlinkSync(f.at('/opt/nexowatt/eos/current')); fs.symlinkSync('/opt/nexowatt/eos/releases/' + 'b'.repeat(64), f.at('/opt/nexowatt/eos/current'));
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(f.current(), '/opt/nexowatt/eos/releases/' + 'b'.repeat(64)); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
});
test('foreign completion appearing during trial is not deleted', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => fs.writeFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json'), 'foreign-completion');
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/first-start-complete.json'), 'utf8'), 'foreign-completion'); assert.equal(f.active(), 'inactive'); assert.equal(f.locked(), true);
});
test('foreign lock appearing during trial is not removed and its permit is not revoked', async t => {
    const f = fixture(t); f.dependencies.readiness = async () => {
        fs.writeFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), 'foreign-lock');
        fs.writeFileSync(f.at('/etc/nexowatt-eos/maintenance-start.json'), 'foreign-permit');
    };
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_RECOVERY_REQUIRED'));
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/.activation.lock'), 'utf8'), 'foreign-lock');
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/maintenance-start.json'), 'utf8'), 'foreign-permit');
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/first-start-complete.json')), false);
    assert.equal(f.journal().phase, 'RECOVERY_REQUIRED');
});
test('PostgreSQL emitted connection error is handled, bounded and never propagated with private details', async () => {
    let closed = false;
    class Client extends require('node:events').EventEmitter {
        constructor() { super(); this.connection = { stream: { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3' } }; }
        async connect() {}
        query() { queueMicrotask(() => this.emit('error', new Error('PRIVATE_DATABASE_DETAIL'))); return new Promise(() => {}); }
        async end() { closed = true; }
    }
    await assert.rejects(repair.readOnlySnapshot(Client, dbConnection()), error => error.code === 'REPAIR_DATABASE_CONNECTION' && !error.message.includes('PRIVATE'));
    assert.equal(closed, true);
});
test('dangling foreign permit is detected and never replaced', async t => {
    const f = fixture(t), permit = f.at('/etc/nexowatt-eos/maintenance-start.json'); fs.symlinkSync('/nonexistent-private-foreign', permit);
    await assert.rejects(repair.update(f.options, f.dependencies), expect('REPAIR_ORPHAN_PERMIT'));
    assert.equal(fs.readlinkSync(permit), '/nonexistent-private-foreign'); assert.deepEqual(f.events, []);
});
