'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { validatePreparation, contentRows, sha, BASE_RELEASE_ID } = require('./fixture.cjs');
const root = '/tmp/r9-fixture-contract';
const good = { schemaVersion: 1, kind: 'unsigned-r9-native-preparation', signed: false, unsignedFixture: true, sequence: 12, nodeVersion: '24.21.0',
    app: root + '/r9-build/app', sourceCommit: 'a'.repeat(40), appContentSha256: 'b'.repeat(64), previousSignatureVerified: true, previousReleaseId: BASE_RELEASE_ID };
test('R9 preparation admits only exact unsigned current app identity and authenticated baseline', () => {
    assert.equal(validatePreparation(good, root), good);
    for (const patch of [{ signed: true }, { kind: 'signed-r9' }, { sequence: 11 }, { nodeVersion: '24.19.0' },
        { app: root + '/r7/app' }, { sourceCommit: 'main' }, { previousSignatureVerified: false }, { appContentSha256: '' }, { previousReleaseId: 'c'.repeat(64) }]) {
        assert.throws(() => validatePreparation({ ...good, ...patch }, root), { code: 'R9_NATIVE_PREPARATION' });
    }
});
test('fixed root fixture refuses outside explicitly authorized disposable GitHub hosts before touching paths', () => {
    const previous = process.env.EOS_DISPOSABLE_R9_LAB;
    delete process.env.EOS_DISPOSABLE_R9_LAB;
    try { assert.throws(() => require('./prepare-fixed-root.cjs').prepare('/tmp', '1001', '1001'), /R9_NATIVE_ROOT_FIXTURE_REJECTED/); }
    finally { if (previous === undefined) delete process.env.EOS_DISPOSABLE_R9_LAB; else process.env.EOS_DISPOSABLE_R9_LAB = previous; }
});
test('content hash equals a canonical signed-manifest projection and ignores only read-only mode tightening', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r9-content-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.mkdirSync(path.join(dir, 'a')); fs.writeFileSync(path.join(dir, 'a/x'), 'inner'); fs.writeFileSync(path.join(dir, 'a.txt'), 'outer');
    const first = contentRows(dir);
    assert.deepEqual(first.map(row => row.path), ['a.txt', 'a/x']);
    const signatureProjection = require('../../runtime/release/bundle.cjs').inventory(dir).map(row => ({ path: row.path, size: row.size, sha256: row.sha256 }));
    assert.equal(sha(JSON.stringify(first)), sha(JSON.stringify(signatureProjection)));
    fs.chmodSync(path.join(dir, 'a.txt'), 0o444); assert.deepEqual(contentRows(dir), first);
    fs.writeFileSync(path.join(dir, 'a/x'), 'changed'); assert.notEqual(sha(JSON.stringify(contentRows(dir))), sha(JSON.stringify(first)));
});
test('R9 diagnostics preserve only explicit fixed codes', () => {
    const { stageFailure } = require('./diagnostics.cjs');
    assert.equal(stageFailure({ code: 'R9_LICENSE_UI_COOKIE', message: 'private' }), 'R9_LICENSE_UI_COOKIE');
    assert.equal(stageFailure({ code: 'R9_LICENSE_PRIVATE_SECRET', message: 'private' }), 'MANAGEMENT_STAGE_FAILED');
});
test('root fixture diagnostics expose only allowlisted guard reasons, never exception text or paths', () => {
    const { failureLine } = require('./prepare-fixed-root.cjs');
    for (const reason of ['ROOT_UID', 'CI_CONTEXT', 'NODE_VERSION', 'LAB_OWNER', 'LAB_MODE', 'OPT_OWNER', 'OPT_MODE', 'PREPARATION_FILE']) {
        assert.equal(failureLine({ reason, message: 'private-path-and-token' }), `R9_NATIVE_ROOT_FIXTURE_REJECTED:${reason}\n`);
    }
    for (const error of [null, new Error('private-path-and-token'), { reason: 'private-path-and-token' }, { code: 'OPT_MODE' }]) {
        assert.equal(failureLine(error), 'R9_NATIVE_ROOT_FIXTURE_REJECTED:UNEXPECTED\n');
    }
});

// Guard-only syscall simulation; this never creates or chmods a host EOS path.
function rootGuardFixture(patch = {}) {
    const calls = [], stop = new Error('reached management fixture');
    let optMode = patch.optMode ?? 0o40777;
    const stat = (directory, uid, mode, extra = {}) => ({ isDirectory: () => directory, isFile: () => !directory,
        isSymbolicLink: () => false, uid, gid: 1001, mode, nlink: 1, dev: 1, ino: 20, ...extra });
    const optStat = () => stat(true, patch.optUid ?? 0, optMode, patch.optLink ? { isSymbolicLink: () => true } : {});
    const data = { ...good, appContentSha256: sha(JSON.stringify([])), ...(patch.preparation || {}) };
    const fakeFs = {
        constants: fs.constants, realpathSync: value => value,
        lstatSync(file) {
            calls.push(['stat', file]);
            if (file === root) return stat(true, 1001, 0o40700);
            if (file === '/opt') return optStat();
            if (file === root + '/r9-native-prepared.json') return stat(false, 1001, 0o100600);
            if (patch.existing && file === '/etc/nexowatt-eos') return stat(true, 0, 0o40755);
            throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        },
        readFileSync: () => JSON.stringify(data),
        openSync(file, flags) { calls.push(['open', file, flags]); return 19; },
        fstatSync: () => ({ ...optStat(), ...(patch.changed ? { ino: 21 } : {}) }),
        fchmodSync(fd, mode) { calls.push(['chmod', fd, mode]); if (!patch.chmodFailed) optMode = mode; },
        closeSync(fd) { calls.push(['close', fd]); },
    };
    const module = { exports: {} };
    const requires = name => {
        if (name === 'node:fs') return fakeFs;
        if (name === './fixture.cjs') return { ...require('./fixture.cjs'), contentRows: () => [] };
        if (name === '../integration-management/prepare-fixed-root.cjs') return { prepare() { throw stop; } };
        return require(name);
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'prepare-fixed-root.cjs'), 'utf8'), {
        module, require: requires, process: { getuid: () => 0, versions: { node: '24.21.0' }, env: {
            GITHUB_ACTIONS: 'true', EOS_DISPOSABLE_MANAGEMENT_LAB: '1', EOS_DISPOSABLE_R9_LAB: patch.noConsent ? undefined : '1',
        } },
    });
    return { calls, stop, prepare: () => module.exports.prepare(root, '1001', '1001') };
}

test('disposable runner preparation tightens only root-owned /opt after candidate verification', () => {
    for (const mode of [0o40777, 0o40775, 0o40755]) {
        const f = rootGuardFixture({ optMode: mode });
        assert.throws(f.prepare, error => error === f.stop);
        const writes = f.calls.filter(call => call[0] === 'chmod');
        assert.deepEqual(writes, mode & 0o022 ? [['chmod', 19, 0o755]] : []);
        const open = f.calls.find(call => call[0] === 'open'); assert.equal(open[1], '/opt');
        assert.ok(open[2] & fs.constants.O_NOFOLLOW); assert.ok(open[2] & fs.constants.O_DIRECTORY);
        assert.deepEqual(f.calls.at(-1), ['close', 19]);
    }
});

test('unsafe host, existing EOS, corrupt candidate and inode replacement never receive permission changes', () => {
    for (const [patch, reason] of [[{ noConsent: true }, 'CI_CONTEXT'], [{ existing: true }, 'EXISTING_EOS_PATH'],
        [{ optUid: 1001 }, 'OPT_OWNER'], [{ optLink: true }, 'OPT_OWNER'], [{ changed: true }, 'OPT_CHANGED'],
        [{ preparation: { appContentSha256: 'f'.repeat(64) } }, 'PREPARATION_DIGEST']]) {
        const f = rootGuardFixture(patch); assert.throws(f.prepare, error => error.reason === reason);
        assert.equal(f.calls.some(call => call[0] === 'chmod'), false);
    }
    const failure = rootGuardFixture({ chmodFailed: true });
    assert.throws(failure.prepare, error => error.reason === 'OPT_MODE');
    assert.deepEqual(failure.calls.at(-1), ['close', 19]);
});
