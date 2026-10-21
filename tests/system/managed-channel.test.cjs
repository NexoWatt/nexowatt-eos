'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const channel = require('../../runtime/updates/channel.cjs');
const { Manager, validRequest } = require('../../runtime/updates/service.cjs');
const { request, downloadArchive } = require('../../runtime/updates/transport.cjs');
const pair = crypto.generateKeyPairSync('ed25519');
const trust = pair.publicKey.export({ format: 'pem', type: 'spki' });
const now = Date.now(), state = { releaseId: 'a'.repeat(64), sequence: 15, profile: 'test', nodeVersion: '24.21.0' };
const release = { releaseId: 'b'.repeat(64), sequence: 16, version: '0.2.0-test.3', nodeVersion: '24.21.0', platform: 'linux-arm64',
    fromReleaseIds: [state.releaseId], url: `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${'c'.repeat(40)}/delivery/managed-test-16/eos-linux-arm64.tar.gz`,
    bytes: 123, sha256: 'd'.repeat(64), notes: 'Teständerung' };
const feed = () => ({ schemaVersion: 1, channel: 'eos-managed-test-v1', issuedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 86400000).toISOString(), releases: [structuredClone(release)] });
const sign = body => {
    const payload = Buffer.from(JSON.stringify(body));
    return Buffer.from(JSON.stringify({ payload: payload.toString('base64'), signature: crypto.sign(null, payload, pair.privateKey).toString('base64') }));
};
test('actual Ed25519 envelope authenticates an eligible update; unrelated and old releases are not offered', () => {
    const verified = channel.verifyFeed(sign(feed()), trust, { now });
    assert.deepEqual(channel.selectRelease(verified, state), release);
    assert.equal(channel.selectRelease(verified, { ...state, releaseId: 'e'.repeat(64) }), null);
    assert.equal(channel.selectRelease(verified, { ...state, sequence: 16 }), null);
    assert.throws(() => channel.selectRelease(verified, { ...state, sequence: 14 }), /UPDATE_BASELINE/);
});
test('altered payload, different key, expired/future envelope, unpinned URL, oversized archive and duplicate release fail closed', () => {
    const bad = JSON.parse(sign(feed())); bad.payload = Buffer.from('{}').toString('base64');
    assert.throws(() => channel.verifyFeed(Buffer.from(JSON.stringify(bad)), trust), /UPDATE_SIGNATURE/);
    assert.throws(() => channel.verifyFeed(sign(feed()), crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' })), /UPDATE_SIGNATURE/);
    for (const change of [b => b.expiresAt = new Date(now).toISOString(), b => b.issuedAt = new Date(now + 600000).toISOString(),
        b => b.releases[0].url = release.url.replace('/' + 'c'.repeat(40) + '/', '/main/'), b => b.releases[0].url += '?x=1',
        b => b.releases[0].bytes = 101 * 1024 * 1024, b => b.releases[0].nodeVersion = '22.22.2',
        b => b.releases[0].fromReleaseIds = [], b => b.releases.push(structuredClone(b.releases[0])), b => b.extra = true]) {
        const b = feed(); change(b); assert.throws(() => channel.verifyFeed(sign(b), trust, { now }), /UPDATE_FEED/);
    }
});
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed-channel-'));
    fs.mkdirSync(path.join(directory, 'jobs')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    let launched = 0, callback;
    const manager = new Manager({ directory, trust: () => trust, state: () => state, now: () => now,
        fetchFeed: async () => sign(feed()), readResult: file => fs.readFileSync(file),
        launch: (_id, done) => { launched++; callback = done; } });
    return { directory, manager, launched: () => launched, done: () => callback() };
}
test('check is asynchronous; install uses displayed ID and explicit maintenance confirmation; duplicate clicks cannot start two jobs', async t => {
    const f = fixture(t), m = f.manager;
    assert.equal(m.dispatch({ operation: 'check' }).phase, 'CHECKING');
    assert.throws(() => m.dispatch({ operation: 'check' }), /UPDATE_BUSY/);
    await m.checkPromise; assert.equal(m.view().phase, 'AVAILABLE');
    assert.throws(() => m.dispatch({ operation: 'install', releaseId: release.releaseId }), /UPDATE_REQUEST/);
    assert.throws(() => m.dispatch({ operation: 'install', releaseId: 'e'.repeat(64), maintenanceConfirmed: true }), /UPDATE_CANDIDATE_CHANGED/);
    const accepted = m.dispatch({ operation: 'install', releaseId: release.releaseId, maintenanceConfirmed: true });
    assert.equal(accepted.phase, 'QUEUED'); assert.equal(f.launched(), 1);
    assert.throws(() => m.dispatch({ operation: 'install', releaseId: release.releaseId, maintenanceConfirmed: true }), /UPDATE_BUSY/);
    f.done(); assert.equal(m.view().phase, 'RECOVERY_REQUIRED');
    assert.throws(() => m.dispatch({ operation: 'check' }), /UPDATE_RECOVERY_REQUIRED/);
});
test('restart with unfinished job retains recovery state and discards cached candidate', t => {
    const f = fixture(t); f.manager.status.phase = 'INSTALLING'; f.manager.persist();
    f.manager.restore(); assert.equal(f.manager.view().phase, 'RECOVERY_REQUIRED'); assert.equal(f.manager.view().candidate, null);
    assert.equal(validRequest({ operation: 'install', releaseId: release.releaseId, maintenanceConfirmed: true, url: release.url }), false);
});
function response(statusCode, headers, chunks) {
    return (_url, options, handle) => {
        assert.equal(options.rejectUnauthorized, true); assert.equal(options.headers['Accept-Encoding'], 'identity');
        const req = new EventEmitter(); req.destroy = () => {};
        queueMicrotask(() => {
            const res = new EventEmitter(); Object.assign(res, { statusCode, headers, destroy() {} }); handle(res);
            for (const chunk of chunks) res.emit('data', Buffer.from(chunk)); res.emit('end');
        }); return req;
    };
}
test('range transport accepts only exact 206 Content-Range and length, rejects redirect, whole-file fallback and overflow', async () => {
    const options = { start: 0, end: 2, total: 3 };
    assert.equal((await request(release.url, { ...options, requestImpl: response(206, { 'content-range': 'bytes 0-2/3', 'content-length': '3' }, ['abc']) })).toString(), 'abc');
    for (const [status, headers, chunks] of [[200, {}, ['abc']], [302, { location: 'https://example.com' }, []],
        [206, { 'content-range': 'bytes 1-3/4' }, ['abc']], [206, { 'content-range': 'bytes 0-2/3' }, ['abcd']],
        [206, { 'content-range': 'bytes 0-2/3' }, ['ab']]]) {
        await assert.rejects(request(release.url, { ...options, requestImpl: response(status, headers, chunks) }), /UPDATE_DOWNLOAD_/);
    }
});
test('archive is atomically exclusive and accepted only with exact downloaded SHA-256; failed data is removed', async t => {
    const f = fixture(t), file = path.join(f.directory, 'archive'), bytes = Buffer.from('abc');
    const r = { ...release, bytes: 3, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    await downloadArchive(r, file, { fetchRange: async () => bytes }); assert.deepEqual(fs.readFileSync(file), bytes);
    await assert.rejects(downloadArchive(r, file, { fetchRange: async () => bytes }), /EEXIST/);
    fs.unlinkSync(file);
    await assert.rejects(downloadArchive(r, file, { fetchRange: async () => Buffer.from('bad') }), /UPDATE_ARCHIVE_HASH/);
    assert.equal(fs.existsSync(file), false);
});
