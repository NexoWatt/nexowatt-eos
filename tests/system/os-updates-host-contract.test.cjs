'use strict';
// Offline packaging contract only. No APT command, host service or real host
// filesystem path is touched by this fixture.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { copyDirectory, preparePayload } = require('../../tools/system/build-bundle.cjs');
const { inspectHost } = require('../../tools/system/host-preflight.cjs');
const { installHost } = require('../../tools/system/install-host.cjs');
const REPO = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-updates-host-contract-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}
test('prepared release inventory binds updater implementation, policy, initial status and units', t => {
    const root = fixture(t), app = path.join(root, 'app'), destination = path.join(root, 'payload');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
    fs.writeFileSync(path.join(app, 'package-lock.json'), '{"lockfileVersion":3}\n');
    const catalogFile = path.join(root, 'catalog.json'), sbomFile = path.join(root, 'sbom.json');
    fs.writeFileSync(catalogFile, '{}\n');
    fs.writeFileSync(sbomFile, '{"bomFormat":"CycloneDX","components":[]}\n');
    const rows = preparePayload({ appDirectory: app, destination, catalogFile, sbomFile });
    for (const name of ['runtime/os-updates/runner.py', 'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json',
        'system/test-base/systemd/nexowatt-eos-os-updates.service', 'system/test-base/systemd/nexowatt-eos-os-updates.timer']) {
        const bytes = fs.readFileSync(path.join(REPO, name));
        const row = rows.find(row => row.path === name);
        assert.ok(row, `required signed inventory entry ${name}`);
        assert.equal(row.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
        assert.equal(row.size, bytes.length);
        assert.deepEqual(fs.readFileSync(path.join(destination, name)), bytes);
    }
    // This is preparation, not signature or target acceptance. Historical signed
    // bundles are not rebuilt and no new releasable runtime is emitted here.
    assert.equal(fs.existsSync(path.join(destination, 'manifest.sig')), false);
});
test('actual Redis hold rejects fresh installation before any updater filesystem mutation', t => {
    const root = fixture(t), calls = [];
    const releaseId = 'a'.repeat(64);
    for (const start of [false, true]) {
        assert.throws(() => installHost({ profile: 'test', releaseId, releasePath: `/opt/nexowatt/eos/releases/${releaseId}`,
            start, expectedNodeVersion: '24.21.0', publicKeySha256: 'b'.repeat(64), sequence: 2, platform: 'arm64' },
        { root, uid: 0, exec: (file, args) => { calls.push([file, args]); return { status: 1, stdout: '', stderr: '' }; } }), /HOST_PREFLIGHT_REJECTED/);
        for (const p of ['etc/nexowatt-eos-os-updates', 'var/lib/nexowatt-eos-os-updates', 'etc/systemd/system'])
            assert.equal(fs.existsSync(path.join(root, p)), false);
    }
    const report = inspectHost({ root, uid: 0, exec: () => { throw new Error('no untrusted executable may run'); } });
    assert.equal(report.ready, false);
    assert.equal(report.checks.find(row => row.id === 'redis-security-admission').status, 'fail');
    assert.deepEqual(calls, []);
});
test('release copying rejects interpreter cache directories and bytecode at every nesting depth', t => {
    const root = fixture(t);
    for (const [index, name] of ['__pycache__/runner.cpython-312.pyc', 'nested/__pycache__/runner.cpython-312.pyc',
        'runner.pyc', 'nested/runner.pyo', 'nested/runner.PYC'].entries()) {
        const source = path.join(root, `source-${index}`), destination = path.join(root, `target-${index}`);
        fs.mkdirSync(path.dirname(path.join(source, name)), { recursive: true });
        fs.writeFileSync(path.join(source, name), 'fixture-generated-bytecode');
        assert.throws(() => copyDirectory(source, destination), error => error.code === 'BUILD_GENERATED_PYTHON_CACHE', name);
        assert.equal(fs.existsSync(path.join(destination, name)), false);
    }
});
test('full payload preparation rejects cache contamination and removes the incomplete output', t => {
    const root = fixture(t), app = path.join(root, 'app'), destination = path.join(root, 'payload');
    const contaminated = path.join(app, 'node_modules/fixture/nested/__pycache__/runner.cpython-312.pyc');
    fs.mkdirSync(path.dirname(contaminated), { recursive: true });
    fs.writeFileSync(contaminated, 'fixture-generated-bytecode');
    fs.writeFileSync(path.join(app, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
    const catalogFile = path.join(root, 'catalog.json'), sbomFile = path.join(root, 'sbom.json');
    fs.writeFileSync(catalogFile, '{}\n');
    fs.writeFileSync(sbomFile, '{"bomFormat":"CycloneDX","components":[]}\n');
    assert.throws(() => preparePayload({ appDirectory: app, destination, catalogFile, sbomFile }),
        error => error.code === 'BUILD_GENERATED_PYTHON_CACHE');
    assert.equal(fs.existsSync(destination), false);
    assert.equal(fs.readFileSync(contaminated, 'utf8'), 'fixture-generated-bytecode');
});
