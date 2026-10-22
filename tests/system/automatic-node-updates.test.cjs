'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const policy = require('../../runtime/updates/automatic-node.cjs');
const channel = require('../../runtime/updates/channel.cjs');
const { Manager, validRequest } = require('../../runtime/updates/service.cjs');
const { validateJobRequest } = require('../../runtime/updates/worker.cjs');
const pair = crypto.generateKeyPairSync('ed25519');
const trust = pair.publicKey.export({ format: 'pem', type: 'spki' });
const state = { releaseId: 'a'.repeat(64), sequence: 15, profile: 'test', nodeVersion: '24.22.1' };
const at = value => Date.parse(value);
const time = at('2026-10-22T00:35:00.000Z');
const release = { releaseId: 'b'.repeat(64), sequence: 16, version: '0.2.0-test.3', nodeVersion: '24.22.2', platform: 'linux-arm64',
    fromReleaseIds: [state.releaseId], url: `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${'c'.repeat(40)}/delivery/managed-test-16/eos-linux-arm64.tar.gz`,
    bytes: 123, sha256: 'd'.repeat(64), notes: 'Node-only fixture', automaticNodeUpdate: true };
function envelope(releases, now = time) {
    const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, channel: 'eos-managed-test-v1',
        issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 86400000).toISOString(), releases }));
    return Buffer.from(JSON.stringify({ payload: payload.toString('base64'), signature: crypto.sign(null, payload, pair.privateKey).toString('base64') }));
}
function fixture(t, releases = [release]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-auto-node-'));
    fs.mkdirSync(path.join(directory, 'jobs')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    let now = time, fetched = 0, launched = 0, callback;
    const options = { directory, trust: () => trust, state: () => state, now: () => now,
        fetchFeed: async () => { fetched++; return envelope(releases, now); }, readResult: file => fs.readFileSync(file),
        launch: (_id, done) => { launched++; callback = done; } };
    const manager = new Manager(options);
    return { manager, directory, options, now: value => { now = value; }, fetched: () => fetched, launched: () => launched,
        finish(phase, error = null) { fs.writeFileSync(path.join(directory, 'jobs', manager.status.operationId, 'result.json'),
            JSON.stringify({ operationId: manager.status.operationId, phase, error })); callback(); } };
}
test('Berlin window, summer/winter and repeated DST hour use one local date without daytime catch-up', () => {
    for (const date of ['2026-10-22T00:30:00.000Z', '2026-12-22T01:30:00.000Z', '2026-10-25T00:45:00.000Z', '2026-10-25T01:45:00.000Z'])
        assert.equal(policy.windowAt(at(date)).open, true);
    for (const date of ['2026-10-22T00:29:59.999Z', '2026-10-22T01:00:00.000Z', '2026-12-22T02:00:00.000Z', '2026-10-22T12:00:00.000Z'])
        assert.equal(policy.windowAt(at(date)).open, false);
    assert.equal(policy.windowAt(at('2026-10-25T00:45:00Z')).date, policy.windowAt(at('2026-10-25T01:45:00Z')).date);
});
test('only manufacturer-marked newer same-major releases are automatically eligible', () => {
    const manual = { ...release, releaseId: 'e'.repeat(64), sequence: 17 }; delete manual.automaticNodeUpdate;
    const feed = channel.verifyFeed(envelope([release, manual]), trust, { now: time });
    assert.equal(channel.selectRelease(feed, state).releaseId, manual.releaseId);
    assert.equal(channel.selectRelease(feed, state, { automaticNodeUpdate: true }).releaseId, release.releaseId);
    const same = channel.verifyFeed(envelope([{ ...release, nodeVersion: state.nodeVersion }]), trust, { now: time });
    assert.equal(channel.selectRelease(same, state, { automaticNodeUpdate: true }), null);
    for (const changes of [{ automaticNodeUpdate: false }, { automaticNodeUpdate: 'true' }, { nodeVersion: '26.12.1' }])
        assert.throws(() => channel.verifyFeed(envelope([{ ...release, ...changes }]), trust, { now: time }), /UPDATE_FEED/);
});
test('automatic scheduler launches internal mode without any fabricated maintenance confirmation', async t => {
    const f = fixture(t); assert.equal(await f.manager.tickAutomatic(), true);
    assert.equal(f.fetched(), 1); assert.equal(f.launched(), 1);
    const job = JSON.parse(fs.readFileSync(path.join(f.directory, 'jobs', f.manager.status.operationId, 'request.json')));
    assert.deepEqual(job, { operationId: f.manager.status.operationId, releaseId: release.releaseId, mode: 'automatic-node' });
    assert.equal(validRequest({ operation: 'install', releaseId: release.releaseId, mode: 'automatic-node' }), false);
    assert.equal(f.manager.view().automaticNode.state, 'QUEUED');
    f.finish('SUCCEEDED'); assert.equal(f.manager.view().automaticNode.state, 'SUCCEEDED');
    assert.equal(await f.manager.tickAutomatic(), false); assert.equal(f.launched(), 1);
});
test('manual releases remain available without automatic installation; daytime performs no network request', async t => {
    const manual = { ...release }; delete manual.automaticNodeUpdate;
    const f = fixture(t, [manual]); f.now(at('2026-10-22T11:00:00Z'));
    assert.equal(await f.manager.tickAutomatic(), false); assert.equal(f.fetched(), 0);
    f.now(time); assert.equal(await f.manager.tickAutomatic(), false);
    assert.equal(f.manager.view().automaticNode.state, 'MANUAL_RELEASE'); assert.equal(f.manager.view().phase, 'AVAILABLE');
    assert.equal(f.launched(), 0);
});
test('expired or altered signed feed never queues; network attempt is durable and once per day across restart/clock rollback', async t => {
    for (const altered of [false, true]) {
        const f = fixture(t); f.manager.fetchFeed = async () => altered ? Buffer.from('{}') : envelope([release], time - 86400000);
        assert.equal(await f.manager.tickAutomatic(), false); assert.equal(f.launched(), 0);
        assert.equal(f.manager.view().automaticNode.state, 'FAILED');
        const restarted = new Manager(f.options); restarted.restore();
        assert.equal(await restarted.tickAutomatic(), false);
        f.now(time - 86400000); assert.equal(await restarted.tickAutomatic(), false);
        f.now(time + 86400000); assert.equal(await restarted.tickAutomatic(), true);
    }
});
test('busy/recovery skips before attempt; OS lock failure defers next daily window and cleans harmless staging', async t => {
    const f = fixture(t);
    for (const phase of ['INSTALLING', 'RECOVERY_REQUIRED']) {
        f.manager.status.phase = phase; assert.equal(await f.manager.tickAutomatic(), false);
        assert.equal(f.manager.automatic.lastAttempt, null); assert.equal(f.fetched(), 0);
    }
    f.manager.status.phase = 'IDLE'; await f.manager.tickAutomatic();
    f.finish('FAILED', 'REPAIR_MAINTENANCE_IN_PROGRESS');
    assert.equal(f.manager.view().automaticNode.state, 'DEFERRED');
    assert.deepEqual(fs.readdirSync(path.join(f.directory, 'jobs')), []);
    assert.equal(await f.manager.tickAutomatic(), false);
    f.now(time + 86400000); assert.equal(await f.manager.tickAutomatic(), true);
});
test('download/check completing outside maintenance window cannot start a new automatic worker', async t => {
    const f = fixture(t); f.manager.fetchFeed = async () => { f.now(at('2026-10-22T01:00:00Z')); return envelope([release]); };
    assert.equal(await f.manager.tickAutomatic(), false); assert.equal(f.launched(), 0);
    assert.equal(f.manager.view().automaticNode.reason, 'UPDATE_AUTOMATIC_WINDOW');
});
test('interrupted check is harmless; interrupted automatic job remains fail-closed recovery', async t => {
    for (const phase of ['CHECKING', 'QUEUED']) {
        const f = fixture(t); f.manager.automatic = { schemaVersion: 1, lastAttemptDate: '2026-10-22', lastAttempt: new Date(time).toISOString(), state: phase, reason: null };
        f.manager.status.phase = phase; f.manager.persist(); f.manager.persistAutomatic();
        const restarted = new Manager(f.options); restarted.restore();
        assert.equal(restarted.view().phase, phase === 'CHECKING' ? 'FAILED' : 'RECOVERY_REQUIRED');
        assert.equal(restarted.view().automaticNode.state, phase === 'CHECKING' ? 'FAILED' : 'RECOVERY_REQUIRED');
        assert.equal(await restarted.tickAutomatic(), false);
    }
    const f = fixture(t);
    f.manager.automatic = { schemaVersion: 1, lastAttemptDate: '2026-10-22', lastAttempt: new Date(time).toISOString(), state: 'CHECKING', reason: null };
    f.manager.status.phase = 'QUEUED'; f.manager.status.operationId = crypto.randomUUID();
    f.manager.persist(); f.manager.persistAutomatic();
    const restarted = new Manager(f.options); restarted.restore();
    assert.equal(restarted.view().phase, 'RECOVERY_REQUIRED');
    assert.equal(restarted.view().automaticNode.state, 'RECOVERY_REQUIRED');
});
test('job records have an exact internal mode and cannot include caller confirmation/URL overrides', () => {
    const operationId = crypto.randomUUID(), job = { operationId, releaseId: release.releaseId, mode: 'automatic-node' };
    assert.deepEqual(validateJobRequest(job, operationId), job);
    for (const changes of [{ mode: 'automatic' }, { maintenanceConfirmed: true }, { url: release.url }, { operationId: crypto.randomUUID() }])
        assert.throws(() => validateJobRequest({ ...job, ...changes }, operationId), /UPDATE_JOB/);
});
