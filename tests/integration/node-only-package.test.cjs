'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const bundle = require('../../runtime/release/bundle.cjs');
const retained = require('../../tools/integration/prepare-node-only-runtime.cjs');
const build = require('../../tools/bootstrap/build-node-only-test.cjs');
const automatic = require('../../runtime/updates/automatic-node.cjs');
const sbom = require('../../runtime/release/fresh-sbom-binding.cjs');
const { signChannel } = require('../../tools/bootstrap/sign-managed-channel.cjs');
const { verifyFeed } = require('../../runtime/updates/channel.cjs');
const ROOT = path.resolve(__dirname, '../..');
const hash = bundle.sha256;
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-node-only-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const payload = path.join(directory, 'baseline'); fs.mkdirSync(payload);
    const record = { schemaVersion: 1, kind: sbom.ASSEMBLY, sourceCommit: 'a'.repeat(40), sourceTreeClean: true,
        sequence: 15, nodeVersion: '24.22.1', controllerVersion: '7.2.5', nodeRuntime: { schemaVersion: 1, version: '24.22.1',
            platform: 'linux-arm64', archiveSha256: 'b'.repeat(64), binarySha256: hash(Buffer.from('old node')),
            licenseSha256: hash(Buffer.from('node license')) } };
    const write = (name, bytes, mode = 0o644) => { const file = path.join(payload, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { mode }); };
    write('app/file.js', 'exact retained application'); write('host/helper.cjs', 'exact retained host');
    write('catalog.json', '{"entries":[]}\n'); write('runtime-build.json', retained.encode(record));
    const bom = { metadata: { properties: [{ name: 'eos:sbom:target-sequence', value: '15' },
        { name: 'eos:sbom:source-commit', value: record.sourceCommit },
        { name: 'eos:sbom:build-record-sha256', value: hash(retained.encode(record)) }] },
        components: [sbom.nodeComponent(record), { name: 'fixture-library', version: '1.0.0' }],
        dependencies: [{ ref: 'fixture-app', dependsOn: [sbom.nodeComponent(record)['bom-ref']] },
            { ref: sbom.nodeComponent(record)['bom-ref'], dependsOn: [] }] };
    write('sbom.cdx.json', retained.encode(bom)); write('node-runtime/bin/node', 'old node', 0o755);
    write('node-runtime/LICENSE', 'node license'); write('node-runtime/runtime.json', retained.encode(record.nodeRuntime));
    const manifest = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 15,
        profile: 'test', nodeVersion: '24.22.1', platforms: ['linux-arm64'], files: bundle.inventory(payload) };
    const baseline = { releaseId: hash(Buffer.from(JSON.stringify(manifest) + '\n')), manifest, payloadPath: payload, catalog: { entries: [] } };
    const nodeRuntime = { ...record.nodeRuntime, version: '24.22.2', binarySha256: hash(Buffer.from('new node')), archiveSha256: 'c'.repeat(64) };
    const next = retained.recordFor(baseline, record, { sourceCommit: 'd'.repeat(40), sequence: 16, nodeRuntime });
    const preparedDirectory = path.join(directory, 'prepared'); fs.mkdirSync(preparedDirectory);
    const prepared = { record: next, files: manifest.files.filter(row => row.path.startsWith('app/')).map(row => ({ ...row, path: row.path.slice(4) })),
        catalogFile: path.join(preparedDirectory, 'catalog.json'), recordFile: path.join(preparedDirectory, 'runtime-build.json'),
        sbomFile: path.join(preparedDirectory, 'runtime.cdx.json'), nodeRuntimeDirectory: path.join(preparedDirectory, 'node-runtime') };
    fs.copyFileSync(path.join(payload, 'catalog.json'), prepared.catalogFile);
    fs.writeFileSync(prepared.recordFile, retained.encode(next)); fs.writeFileSync(prepared.sbomFile, retained.encode(retained.rebindSbom(bom, record, next)));
    fs.mkdirSync(path.join(prepared.nodeRuntimeDirectory, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(prepared.nodeRuntimeDirectory, 'bin/node'), 'new node', { mode: 0o755 });
    fs.writeFileSync(path.join(prepared.nodeRuntimeDirectory, 'runtime.json'), retained.encode(nodeRuntime));
    fs.writeFileSync(path.join(prepared.nodeRuntimeDirectory, 'LICENSE'), 'node license');
    return { directory, baseline, record, next, prepared, nodeRuntime };
}
test('Node-only package retains authenticated host/app/catalog bytes and changes only runtime and derived records', t => {
    const f = fixture(t), destination = path.join(f.directory, 'candidate');
    assert.equal(build.assertPreparedBinding(f.baseline, f.prepared), true);
    const previousUmask = process.umask(0o077);
    try { build.copyCandidatePayload(f.baseline, f.prepared, destination); }
    finally { process.umask(previousUmask); }
    const manifest = { ...f.baseline.manifest, sequence: 16, nodeVersion: '24.22.2', files: bundle.inventory(destination) };
    assert.equal(automatic.assertTransition(f.baseline, { manifest, catalog: f.baseline.catalog }), true);
    for (const name of ['app/file.js', 'host/helper.cjs', 'catalog.json'])
        assert.deepEqual(fs.readFileSync(path.join(destination, name)), fs.readFileSync(path.join(f.baseline.payloadPath, name)));
    assert.equal(fs.readFileSync(path.join(destination, 'node-runtime/bin/node'), 'utf8'), 'new node');
    assert.throws(() => build.copyCandidatePayload(f.baseline, f.prepared, destination), /EEXIST/);
    fs.writeFileSync(path.join(destination, 'host/helper.cjs'), 'changed host');
    manifest.files = bundle.inventory(destination);
    assert.throws(() => automatic.assertTransition(f.baseline, { manifest, catalog: f.baseline.catalog }), /UPDATE_AUTOMATIC_PAYLOAD/);
});
test('retained source provenance distinguishes current assembler from original sources across two Node patches', t => {
    const f = fixture(t);
    assert.equal(f.next.sourceCommit, 'd'.repeat(40));
    assert.equal(f.next.nodeOnlyUpdate.retainedSourceCommit, f.record.sourceCommit);
    assert.equal(f.next.nodeOnlyUpdate.baselineReleaseId, f.baseline.releaseId);
    assert.equal(f.next.nodeOnlyUpdate.npmResolutionReused, true);
    const second = { releaseId: 'e'.repeat(64), manifest: { ...f.baseline.manifest, sequence: 16, nodeVersion: '24.22.2',
        files: f.baseline.manifest.files.map(row => row.path === 'runtime-build.json' ? { ...row, sha256: hash(retained.encode(f.next)) } : row) } };
    const record = retained.recordFor(second, f.next, { sourceCommit: 'f'.repeat(40), sequence: 17,
        nodeRuntime: { ...f.nodeRuntime, version: '24.23.0' } });
    assert.equal(record.nodeOnlyUpdate.retainedSourceCommit, 'a'.repeat(40));
    assert.equal(record.nodeOnlyUpdate.baselineSourceCommit, 'd'.repeat(40));
});
test('same-version repack, downgrade, major change, changed baseline record and changed tested app are refused', t => {
    const f = fixture(t);
    for (const version of ['24.22.1', '24.21.0', '25.0.0']) assert.throws(() => retained.recordFor(f.baseline, f.record,
        { sourceCommit: 'd'.repeat(40), sequence: 16, nodeRuntime: { ...f.nodeRuntime, version } }));
    assert.throws(() => retained.recordFor(f.baseline, { ...f.record, sourceCommit: 'b'.repeat(40) },
        { sourceCommit: 'd'.repeat(40), sequence: 16, nodeRuntime: f.nodeRuntime }), /NODE_ONLY_BUILD_BINDING/);
    for (const change of [p => p.record.nodeOnlyUpdate.baselineReleaseId = 'e'.repeat(64), p => p.files[0].sha256 = 'e'.repeat(64)]) {
        const changed = structuredClone(f.prepared); change(changed);
        assert.throws(() => build.assertPreparedBinding(f.baseline, changed), /NODE_ONLY_PREPARED_CHANGED/);
    }
    fs.writeFileSync(f.prepared.catalogFile, '{"entries":[],"changed":true}');
    assert.throws(() => build.assertPreparedBinding(f.baseline, f.prepared), /NODE_ONLY_PREPARED_CHANGED/);
});
test('manufacturer candidate must retain the exact derived SBOM, including unchanged components and metadata', t => {
    const f = fixture(t), original = JSON.parse(fs.readFileSync(f.prepared.sbomFile));
    for (const change of [bom => bom.components[1].version = '2.0.0',
        bom => bom.metadata.properties.push({ name: 'eos:unqualified-claim', value: 'true' }),
        bom => bom.metadata.properties.find(row => row.name === 'eos:sbom:retained-source-commit').value = 'f'.repeat(40)]) {
        const changed = structuredClone(original); change(changed);
        fs.writeFileSync(f.prepared.sbomFile, retained.encode(changed));
        assert.throws(() => build.assertPreparedBinding(f.baseline, f.prepared), /NODE_ONLY_PREPARED_CHANGED/);
    }
});
test('actual prior SBOM keeps all npm components unchanged and rebinds only Node references and provenance', () => {
    const directory = path.join(ROOT, 'reports/integration/automatic-security-updates-20261022/ci');
    const previousRecord = JSON.parse(fs.readFileSync(path.join(directory, 'runtime-build.json')));
    const previousBom = JSON.parse(fs.readFileSync(path.join(directory, 'runtime.cdx.json')));
    const baseline = { releaseId: 'a'.repeat(64), manifest: { sequence: previousRecord.sequence, nodeVersion: previousRecord.nodeVersion,
        files: [{ path: 'runtime-build.json', sha256: hash(retained.encode(previousRecord)) }] } };
    const record = retained.recordFor(baseline, previousRecord, { sourceCommit: 'b'.repeat(40), sequence: 16,
        nodeRuntime: { ...previousRecord.nodeRuntime, version: '24.22.2', archiveSha256: 'c'.repeat(64), binarySha256: 'd'.repeat(64) } });
    const next = retained.rebindSbom(previousBom, previousRecord, record);
    const withoutNode = bom => bom.components.filter(row => row.name !== 'node');
    assert.deepEqual(withoutNode(next), withoutNode(previousBom));
    assert.deepEqual(next.components.find(row => row.name === 'node'), sbom.nodeComponent(record));
    assert.equal(next.dependencies.some(row => row.ref === 'eos-node-runtime:24.22.1:linux-arm64'), false);
    assert.equal(next.dependencies.some(row => row.ref === 'eos-node-runtime:24.22.2:linux-arm64'), true);
    const properties = Object.fromEntries(next.metadata.properties.map(row => [row.name, row.value]));
    assert.equal(properties['eos:sbom:build-record-sha256'], hash(retained.encode(record)));
    assert.equal(properties['eos:sbom:retained-source-commit'], previousRecord.sourceCommit);
    const changed = structuredClone(previousBom); changed.components.push(sbom.nodeComponent(previousRecord));
    assert.throws(() => retained.rebindSbom(changed, previousRecord, record), /NODE_ONLY_SBOM_NODE/);
});
test('baseline verifier rejects mismatched public trust and a tampered actual signature before payload handling', t => {
    const f = fixture(t), pair = crypto.generateKeyPairSync('ed25519');
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
    const keyFile = path.join(f.directory, 'public.pem'); fs.writeFileSync(keyFile, publicKey);
    const signed = path.join(f.directory, 'signed');
    bundle.createBundle({ sourceDirectory: f.baseline.payloadPath, bundleDirectory: signed, metadata: Object.fromEntries(
        Object.entries(f.baseline.manifest).filter(([name]) => name !== 'files')), privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) });
    const options = { bundleDirectory: signed, publicKeyFile: keyFile, publicKeySha256: hash(publicKey) };
    assert.throws(() => retained.authenticateBaseline({ ...options, publicKeySha256: '0'.repeat(64) }), /NODE_ONLY_TRUST/);
    const signature = fs.readFileSync(path.join(signed, 'manifest.sig')); signature[0] ^= 1;
    fs.writeFileSync(path.join(signed, 'manifest.sig'), signature);
    assert.throws(() => retained.authenticateBaseline(options), /BUNDLE_SIGNATURE/);
});
test('manufacturer channel signer signs explicit automatic Node offer and receiver retains opt-in', t => {
    const f = fixture(t), pair = crypto.generateKeyPairSync('ed25519');
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
    const privateKeyFile = path.join(f.directory, 'private.pem'), input = path.join(f.directory, 'input.json'), output = path.join(f.directory, 'feed.json');
    fs.writeFileSync(privateKeyFile, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    const entry = { releaseId: 'a'.repeat(64), sequence: 16, version: '0.2.0-test.3', nodeVersion: '24.22.2', platform: 'linux-arm64',
        fromReleaseIds: [f.baseline.releaseId], url: 'https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-16-' + 'a'.repeat(64) + '/eos-linux-arm64.tar.gz',
        bytes: 1234, sha256: 'b'.repeat(64), notes: 'Contract fixture, no published release', automaticNodeUpdate: true };
    fs.writeFileSync(input, JSON.stringify({ schemaVersion: 1, channel: 'eos-managed-test-v1', issuedAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), releases: [entry] }));
    signChannel({ input, output, privateKeyFile, expectedPublicKeySha256: hash(publicKey) });
    assert.equal(verifyFeed(fs.readFileSync(output), publicKey).releases[0].automaticNodeUpdate, true);
});
