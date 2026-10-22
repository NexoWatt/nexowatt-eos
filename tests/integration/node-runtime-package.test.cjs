'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const prepared = require('../../tools/integration/prepare-node-runtime.cjs');
const archive = require('../../tools/integration/create-managed-archive.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
test('manufacturer archive admission rejects unreviewed versions and arbitrary bytes before extraction', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-node-package-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'node.tar.xz'); fs.writeFileSync(file, 'not an authenticated Node archive');
    for (const version of ['24.21.0', '24.99.0', '26.0.0', 'latest', '24.22.1;id']) assert.throws(() => prepared.release(version));
    assert.throws(() => prepared.verifyArchive(file), /NODE_PACKAGE_HASH/);
    const link = path.join(directory, 'link.tar.xz'); fs.symlinkSync(file, link);
    assert.throws(() => prepared.verifyArchive(link), /NODE_PACKAGE_PATH/);
    assert.throws(() => prepared.prepare({ archive: file, destination: path.join(directory, 'out') }), /NODE_PACKAGE_HASH/);
    assert.equal(fs.existsSync(path.join(directory, 'out')), false);
});
test('canonical managed archives retain the signed Node executable permission with no executable license or metadata', () => {
    const rows = [
        { path: 'app/package.json', size: 2, sha256: sha256('{}'), mode: 0o644 },
        { path: 'app/package-lock.json', size: 2, sha256: sha256('{}'), mode: 0o644 },
        { path: 'node-runtime/bin/node', size: 64, sha256: 'a'.repeat(64), mode: 0o755 },
        { path: 'node-runtime/LICENSE', size: 8, sha256: 'b'.repeat(64), mode: 0o644 },
        { path: 'node-runtime/runtime.json', size: 20, sha256: 'c'.repeat(64), mode: 0o644 }
    ];
    const metadata = { profile: 'test', nodeVersion: '24.22.1', platforms: ['linux-arm64'] };
    const report = { schemaVersion: 1, kind: 'eos-runtime-architecture-static-check', platform: 'linux-arm64',
        target: { nodeVersion: metadata.nodeVersion }, passed: true, executedTargetCode: false, hardwareQualified: false,
        nativeFiles: [], packageJsonSha256: rows[0].sha256, packageLockSha256: rows[1].sha256 };
    const normalized = archive.canonicalInventory(rows, metadata, [report]);
    assert.deepEqual(normalized.executablePaths, ['node-runtime/bin/node']);
    assert.equal(normalized.files.find(row => row.path === 'node-runtime/bin/node').mode, 0o755);
    assert.equal(normalized.files.find(row => row.path === 'node-runtime/LICENSE').mode, 0o644);
    assert.throws(() => archive.canonicalInventory(rows, { ...metadata, nodeVersion: '26.0.0' }, [report]));
});
