'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { cleanupCompleted } = require('../../runtime/onboarding/cleanup.cjs');
const storage = require('../../runtime/onboarding/state.cjs');
const { settings } = require('../onboarding/fixtures.cjs');
const releaseId = 'a'.repeat(64);
const fakeHash = `pbkdf2$600000$${'a'.repeat(512)}$${'b'.repeat(32)}`;

function fixture(t, activated = false) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-cleanup-'));
    // All paths are created beneath this one mkdtemp result.
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const stateDirectory = path.join(root, 'onboarding'), markerDirectory = path.join(root, 'root-context');
    fs.mkdirSync(stateDirectory, { mode: 0o700 }); fs.mkdirSync(markerDirectory, { mode: 0o700 });
    const prepared = storage.prepare({ directory: stateDirectory, releaseId, origin: 'https://eos.example:8443' });
    const state = storage.readState(stateDirectory); state.state = 'committing'; state.codeHash = null;
    storage.write(stateDirectory, 'state.json', state);
    fs.mkdirSync(path.join(stateDirectory, 'commit.lock'), { mode: 0o700 });
    let token = '';
    if (activated) {
        const issuer = crypto.generateKeyPairSync('ed25519');
        const message = 'NWL2.' + Buffer.from(JSON.stringify({ fixture: crypto.randomBytes(16).toString('hex') })).toString('base64url');
        token = message + '.' + crypto.sign(null, Buffer.from(message), issuer.privateKey).toString('base64url');
    }
    const handoff = { schemaVersion: 2, releaseId, setupId: prepared.setupId, passwordHash: fakeHash,
        settings: { ...structuredClone(settings), licenseMode: activated ? 'verified' : 'unlicensed' },
        license: { mode: activated ? 'activate' : 'unlicensed', token } };
    storage.write(stateDirectory, 'handoff.json', handoff);
    const completionFile = path.join(markerDirectory, 'first-start-complete.json');
    const complete = { schemaVersion: 1, releaseId, setupId: prepared.setupId, completedAt: new Date().toISOString(),
        licenseConfigured: activated, physicalControlEnabled: false };
    const putMarker = record => fs.writeFileSync(completionFile, JSON.stringify(record ?? complete), { mode: 0o644 });
    const handoffFile = path.join(stateDirectory, 'handoff.json'), original = fs.readFileSync(handoffFile);
    const checked = [];
    // This models the root ownership result, not POSIX/Windows ownership. Real
    // temporary files still exercise bounded reads, parsing, links and unlink.
    const ownerCheck = file => { checked.push(file); };
    return { root, stateDirectory, completionFile, handoffFile, handoff, state, complete, putMarker, original, checked,
        options: { ownerCheck }, config: { stateDirectory, completionFile, releaseId } };
}
function retained(f) { assert.deepEqual(fs.readFileSync(f.handoffFile), f.original); }
function fails(operation) { assert.throws(operation, error => error.code === 'SETUP_CLEANUP_FAILED' && error.message === error.code); }

test('matching root completion removes only the handoff and retains durable closed-state evidence', t => {
    const f = fixture(t, true); f.putMarker();
    assert.deepEqual(cleanupCompleted(f.config, f.options), { cleaned: true });
    assert.equal(fs.existsSync(f.handoffFile), false);
    assert.equal(fs.existsSync(path.join(f.stateDirectory, 'state.json')), true);
    assert.equal(fs.existsSync(path.join(f.stateDirectory, 'commit.lock')), true);
    assert.equal(fs.existsSync(f.completionFile), true);
    assert.deepEqual(f.checked, [f.completionFile]);
});

test('ordinary shutdown without a completion marker preserves the protected handoff', t => {
    const f = fixture(t);
    assert.deepEqual(cleanupCompleted(f.config, f.options), { cleaned: false }); retained(f);
    assert.deepEqual(f.checked, []);
});

test('untrusted root decision and mismatched or malformed completion markers never authorize deletion', t => {
    const f = fixture(t); f.putMarker();
    fails(() => cleanupCompleted(f.config, { ownerCheck: () => { throw new Error('private ownership detail'); } })); retained(f);
    for (const patch of [{ schemaVersion: 2 }, { releaseId: 'b'.repeat(64) }, { setupId: '0'.repeat(32) },
        { physicalControlEnabled: true }, { licenseConfigured: true }, { completedAt: 'not-a-date' }, { extra: 'untrusted' }]) {
        f.putMarker({ ...f.complete, ...patch }); fails(() => cleanupCompleted(f.config, f.options)); retained(f);
    }
    for (const raw of ['{invalid "password":"never-log-this"', ' '.repeat(4097)]) {
        fs.writeFileSync(f.completionFile, raw); fails(() => cleanupCompleted(f.config, f.options)); retained(f);
    }
});

test('unfinished state, state-handoff mismatch and invalid handoff preserve the original evidence', t => {
    const f = fixture(t); f.putMarker();
    for (const patch of [{ state: 'claimed' }, { state: 'blocked' }, { setupId: '0'.repeat(32) }, { codeHash: 'f'.repeat(64) }]) {
        storage.write(f.stateDirectory, 'state.json', { ...f.state, ...patch });
        fails(() => cleanupCompleted(f.config, f.options)); retained(f);
    }
    storage.write(f.stateDirectory, 'state.json', f.state);
    for (const patch of [{ schemaVersion: 1 }, { releaseId: 'b'.repeat(64) }, { passwordHash: 'bad' }]) {
        storage.write(f.stateDirectory, 'handoff.json', { ...f.handoff, ...patch });
        const before = fs.readFileSync(f.handoffFile);
        fails(() => cleanupCompleted(f.config, f.options)); assert.deepEqual(fs.readFileSync(f.handoffFile), before);
    }
});

test('hard-linked handoff or completion files fail before deleting any link', t => {
    const f = fixture(t); f.putMarker();
    const secondHandoff = path.join(f.root, 'handoff-copy'); fs.linkSync(f.handoffFile, secondHandoff);
    fails(() => cleanupCompleted(f.config, f.options)); retained(f); assert.equal(fs.existsSync(secondHandoff), true);
    fs.unlinkSync(secondHandoff);
    const secondMarker = path.join(f.root, 'completion-copy'); fs.linkSync(f.completionFile, secondMarker);
    fails(() => cleanupCompleted(f.config, f.options)); retained(f); assert.equal(fs.existsSync(secondMarker), true);
});

test('directory symlinks or Windows junctions cannot redirect completion or handoff cleanup', t => {
    const f = fixture(t); f.putMarker();
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    const stateLink = path.join(f.root, 'state-link'), markerLink = path.join(f.root, 'marker-link');
    fs.symlinkSync(f.stateDirectory, stateLink, type);
    fs.symlinkSync(path.dirname(f.completionFile), markerLink, type);
    fails(() => cleanupCompleted({ ...f.config, stateDirectory: stateLink }, f.options)); retained(f);
    fails(() => cleanupCompleted({ ...f.config, completionFile: path.join(markerLink, path.basename(f.completionFile)) }, f.options)); retained(f);
});

test('non-canonical paths, a handoff directory and missing state fail with a fixed public error', t => {
    const f = fixture(t); f.putMarker();
    fails(() => cleanupCompleted({ ...f.config, stateDirectory: f.stateDirectory + path.sep }, f.options)); retained(f);
    fails(() => cleanupCompleted({ ...f.config, releaseId: '../outside' }, f.options)); retained(f);
    fs.unlinkSync(path.join(f.stateDirectory, 'state.json'));
    fails(() => cleanupCompleted(f.config, f.options)); retained(f);
    fs.unlinkSync(f.handoffFile); fs.mkdirSync(f.handoffFile);
    fails(() => cleanupCompleted(f.config, f.options)); assert.equal(fs.statSync(f.handoffFile).isDirectory(), true);
});
