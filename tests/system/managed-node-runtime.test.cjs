'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const policy = require('../../runtime/updates/node-policy.cjs');
const lease = require('../../runtime/updates/maintenance-lease.cjs');
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const { failurePhase } = require('../../runtime/updates/worker.cjs');
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-node-policy-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.mkdirSync(path.join(directory, 'node-runtime/bin'), { recursive: true });
    const binary = Buffer.alloc(128); binary.write('7f454c46', 0, 'hex'); binary[4] = 2; binary[5] = 1;
    binary.writeUInt16LE(3, 16); binary.writeUInt16LE(183, 18);
    fs.writeFileSync(path.join(directory, policy.BINARY), binary, { mode: 0o755 });
    const license = Buffer.from('fixture license, no executable\n');
    fs.writeFileSync(path.join(directory, policy.LICENSE), license, { mode: 0o644 });
    const descriptor = { schemaVersion: 1, version: policy.BASELINE_VERSION, platform: 'linux-arm64',
        archiveSha256: '1'.repeat(64), binarySha256: sha256(binary), licenseSha256: sha256(license) };
    fs.writeFileSync(path.join(directory, policy.DESCRIPTOR), JSON.stringify(descriptor) + '\n', { mode: 0o644 });
    return { directory, descriptor, manifest: { nodeVersion: policy.BASELINE_VERSION, files: inventory(directory) } };
}
test('Node policy admits reviewed major 24 floor and strictly rejects downgrade, prerelease, malformed and alternate majors', () => {
    for (const v of ['24.22.1', '24.22.2', '24.23.0']) assert.equal(policy.validateVersion(v), v);
    for (const v of ['24.21.0', '24.22.0', '22.23.4', '26.12.1', '24.22.1-rc.1', '24.022.1', '24.22.01', 'latest', null])
        assert.throws(() => policy.validateVersion(v), /UPDATE_RUNTIME_VERSION/);
    assert.equal(policy.assertTransition('24.22.1', '24.23.0'), '24.23.0');
    assert.throws(() => policy.assertTransition('24.23.0', '24.22.1'), /UPDATE_RUNTIME_DOWNGRADE/);
});
test('signed runtime descriptor binds actual binary, ELF architecture, mode and full upstream license', t => {
    const f = fixture(t); assert.deepEqual(policy.validateRuntime(f.directory, f.manifest), f.descriptor);
    const file = path.join(f.directory, policy.BINARY), original = fs.readFileSync(file);
    const changed = Buffer.from(original); changed[18] = 62; fs.writeFileSync(file, changed);
    assert.throws(() => policy.validateRuntime(f.directory, f.manifest), /UPDATE_RUNTIME_BINARY/);
    fs.writeFileSync(file, original); fs.chmodSync(file, 0o777);
    assert.throws(() => policy.validateRuntime(f.directory, f.manifest), /UPDATE_RUNTIME_BINARY/);
    fs.chmodSync(file, 0o755); fs.writeFileSync(path.join(f.directory, policy.LICENSE), 'changed');
    assert.throws(() => policy.validateRuntime(f.directory, f.manifest), /UPDATE_RUNTIME_LICENSE/);
});
test('runtime rejects missing/extra signed files, mismatched versions and linked binary paths', t => {
    for (const kind of ['missing', 'extra', 'version', 'symlink', 'hardlink']) {
        const f = fixture(t), binary = path.join(f.directory, policy.BINARY);
        if (kind === 'missing') f.manifest.files = f.manifest.files.filter(r => r.path !== policy.BINARY);
        if (kind === 'extra') f.manifest.files.push({ path: 'node-runtime/extra', size: 1, mode: 0o644, sha256: 'a'.repeat(64) });
        if (kind === 'version') f.manifest.nodeVersion = '24.22.2';
        if (kind === 'symlink') { fs.renameSync(binary, binary + '.saved'); fs.symlinkSync(binary + '.saved', binary); }
        if (kind === 'hardlink') fs.linkSync(binary, binary + '.link');
        assert.throws(() => policy.validateRuntime(f.directory, f.manifest));
    }
});
test('kernel lease serializes independent processes and rejects unsafe lock files', async t => {
    const f = fixture(t), file = path.join(f.directory, 'maintenance.lock'); fs.writeFileSync(file, '', { mode: 0o600 });
    const options = { file, owner: () => {}, expectedUid: process.getuid() };
    const first = await lease.acquire(options);
    try { first.assert(); await assert.rejects(lease.acquire(options), /REPAIR_MAINTENANCE_IN_PROGRESS/); }
    finally { first.release(); }
    // Wait for the actual holder to close rather than assuming synchronous release.
    await new Promise((resolve, reject) => {
        const child = spawn('/usr/bin/flock', ['--exclusive', '--wait', '2', file, '/usr/bin/true']);
        child.once('error', reject); child.once('exit', status => status === 0 ? resolve() : reject(Error('lock retained')));
    });
    const second = await lease.acquire(options); second.release();
    fs.chmodSync(file, 0o644); assert.throws(() => lease.acquire(options), /REPAIR_MAINTENANCE_LOCK/);
    fs.chmodSync(file, 0o600); fs.linkSync(file, file + '.linked'); assert.throws(() => lease.acquire(options), /REPAIR_MAINTENANCE_LOCK/);
});
test('ordinary maintenance contention stays retryable; only durable trial failures require recovery', () => {
    assert.equal(failurePhase({ code: 'REPAIR_MAINTENANCE_IN_PROGRESS' }, false), 'FAILED');
    assert.equal(failurePhase({ code: 'UPDATE_RUNTIME_BINARY' }, false), 'FAILED');
    assert.equal(failurePhase({ code: 'REPAIR_RECOVERY_REQUIRED' }, false), 'RECOVERY_REQUIRED');
    assert.equal(failurePhase({}, true), 'RECOVERY_REQUIRED');
    assert.equal(failurePhase({ restoredPreviousActive: true }, false), 'ROLLED_BACK');
});
