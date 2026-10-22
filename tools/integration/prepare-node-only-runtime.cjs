'use strict';
// Offline manufacturer preparation: retain the authenticated installed sources;
// replace only the reviewed Node runtime and its derived inventory bindings.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const bundle = require('../../runtime/release/bundle.cjs');
const fresh = require('./prepare-security-refresh.cjs');
const sbom = require('../../runtime/release/fresh-sbom-binding.cjs');
const node = require('./prepare-node-runtime.cjs');
const policy = require('../../runtime/updates/node-policy.cjs');
const build = require('../system/build-bundle.cjs');
const ROOT = path.resolve(__dirname, '../..');
const KIND = 'retained-signed-runtime-node-update-v1';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const json = file => JSON.parse(bundle.readFileLimited(file, 32 * 1024 * 1024).bytes);
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const write = (file, value) => fs.writeFileSync(file, encode(value), { flag: 'wx', mode: 0o600 });
function absolute(file) {
    if (typeof file !== 'string' || !path.isAbsolute(file) || path.resolve(file) !== file || fs.realpathSync(file) !== file) fail('NODE_ONLY_INPUT_PATH');
    return file;
}
function authenticateBaseline({ bundleDirectory, publicKeyFile, publicKeySha256 }) {
    absolute(bundleDirectory); absolute(publicKeyFile);
    if (!/^[a-f0-9]{64}$/.test(publicKeySha256 || '')) fail('NODE_ONLY_TRUST');
    const key = bundle.validatePublicKey(bundle.readFileLimited(publicKeyFile, 16384).bytes);
    if (bundle.sha256(key) !== publicKeySha256) fail('NODE_ONLY_TRUST');
    const baseline = bundle.verifyBundle({ bundleDirectory, publicKey: key, minimumSequence: 14, platform: 'linux-arm64' });
    if (baseline.manifest.profile !== 'test' || baseline.manifest.releaseVersion !== '0.2.0-test.3' ||
        !Number.isSafeInteger(baseline.manifest.sequence) || baseline.manifest.sequence < 15 ||
        JSON.stringify(baseline.manifest.platforms) !== '["linux-arm64"]') fail('NODE_ONLY_BASELINE');
    policy.validateVersion(baseline.manifest.nodeVersion);
    return { ...baseline, ...build.validatePayload(baseline.payloadPath, baseline.manifest), publicKey: key };
}
function recordFor(baseline, previousRecord, { sourceCommit, sequence, nodeRuntime }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isSafeInteger(sequence) || sequence <= baseline.manifest.sequence ||
        previousRecord?.sourceTreeClean !== true || previousRecord.sequence !== baseline.manifest.sequence ||
        previousRecord.nodeVersion !== baseline.manifest.nodeVersion || !/^[a-f0-9]{40}$/.test(previousRecord.sourceCommit || '') ||
        previousRecord.kind !== sbom.ASSEMBLY || previousRecord.controllerVersion !== sbom.CONTROLLER) fail('NODE_ONLY_BASELINE');
    policy.assertTransition(previousRecord.nodeVersion, nodeRuntime?.version);
    if (policy.compareVersions(nodeRuntime.version, previousRecord.nodeVersion) <= 0) fail('NODE_ONLY_NEWER_REQUIRED');
    const preserved = baseline.manifest.files.filter(row => ![policy.BINARY, policy.DESCRIPTOR, policy.LICENSE,
        'runtime-build.json', 'sbom.cdx.json'].includes(row.path));
    const previousBinding = baseline.manifest.files.find(row => row.path === 'runtime-build.json');
    if (!previousBinding || previousBinding.sha256 !== bundle.sha256(encode(previousRecord))) fail('NODE_ONLY_BUILD_BINDING');
    const retained = previousRecord.nodeOnlyUpdate;
    if (retained && (retained.kind !== KIND || !/^[a-f0-9]{40}$/.test(retained.retainedSourceCommit || ''))) fail('NODE_ONLY_PROVENANCE');
    return { ...structuredClone(previousRecord), sourceCommit, sequence, nodeVersion: nodeRuntime.version, nodeRuntime,
        nodeOnlyUpdate: { kind: KIND, baselineReleaseId: baseline.releaseId, baselineSequence: baseline.manifest.sequence,
            baselineSourceCommit: previousRecord.sourceCommit, baselineRuntimeBuildSha256: previousBinding.sha256,
            retainedSourceCommit: retained?.retainedSourceCommit || previousRecord.sourceCommit,
            retainedFileTableSha256: sbom.digest(preserved), npmResolutionReused: true } };
}
function rebindSbom(previousBom, previousRecord, record) {
    const bom = structuredClone(previousBom), before = sbom.nodeComponent(previousRecord), after = sbom.nodeComponent(record);
    const indexes = bom.components.map((row, index) => equal(row, before) ? index : -1).filter(index => index >= 0);
    if (indexes.length !== 1) fail('NODE_ONLY_SBOM_NODE');
    bom.components[indexes[0]] = after;
    const oldRef = before['bom-ref'], newRef = after['bom-ref'];
    let nodeDependencies = 0;
    for (const row of bom.dependencies || []) {
        if (row.ref === oldRef) { row.ref = newRef; nodeDependencies++; }
        if (Array.isArray(row.dependsOn)) row.dependsOn = row.dependsOn.map(ref => ref === oldRef ? newRef : ref);
    }
    if (nodeDependencies !== 1) fail('NODE_ONLY_SBOM_DEPENDENCIES');
    const values = { 'eos:sbom:target-sequence': String(record.sequence), 'eos:sbom:source-commit': record.sourceCommit,
        'eos:sbom:build-record-sha256': bundle.sha256(encode(record)) };
    for (const [name, value] of Object.entries(values)) {
        const rows = bom.metadata?.properties?.filter(row => row.name === name);
        if (rows?.length !== 1) fail('NODE_ONLY_SBOM_BINDING');
        rows[0].value = value;
    }
    for (const [name, value] of Object.entries({ 'eos:sbom:node-only-baseline-release-id': record.nodeOnlyUpdate.baselineReleaseId,
        'eos:sbom:retained-source-commit': record.nodeOnlyUpdate.retainedSourceCommit, 'eos:sbom:npm-resolution-reused': 'true' })) {
        const rows = bom.metadata.properties.filter(row => row.name === name);
        if (rows.length > 1) fail('NODE_ONLY_SBOM_BINDING');
        if (rows.length) rows[0].value = value;
        else bom.metadata.properties.push({ name, value });
    }
    return bom;
}
function prepare({ bundleDirectory, publicKeyFile, publicKeySha256, resolutionLock, nodeArchive, output, sequence }) {
    const sourceCommit = fresh.source();
    const baseline = authenticateBaseline({ bundleDirectory, publicKeyFile, publicKeySha256 });
    const previousRecord = json(path.join(baseline.payloadPath, 'runtime-build.json'));
    fresh.sequenceValue(sequence);
    if (sequence <= baseline.manifest.sequence || policy.compareVersions(node.policy.currentVersion, baseline.manifest.nodeVersion) <= 0) fail('NODE_ONLY_NEWER_REQUIRED');
    absolute(resolutionLock);
    const lock = bundle.readFileLimited(resolutionLock, 32 * 1024 * 1024).bytes;
    if (bundle.sha256(lock) !== previousRecord.resolutionLockSha256) fail('NODE_ONLY_LOCK_CHANGED');
    if (typeof output !== 'string' || !path.isAbsolute(output) || path.resolve(output) !== output ||
        output === ROOT || output.startsWith(ROOT + path.sep) || fs.existsSync(output)) fail('NODE_ONLY_OUTPUT');
    node.verifyArchive(nodeArchive);
    fs.mkdirSync(output, { mode: 0o700 });
    build.copyDirectory(path.join(baseline.payloadPath, 'app'), path.join(output, 'app'));
    for (const row of baseline.manifest.files.filter(row => row.path.startsWith('app/')))
        fs.chmodSync(path.join(output, row.path), row.mode);
    const nodeRuntime = node.prepare({ archive: nodeArchive, destination: path.join(output, 'node-runtime') });
    const record = recordFor(baseline, previousRecord, { sourceCommit, sequence, nodeRuntime });
    fs.writeFileSync(path.join(output, 'resolution-lock.json'), lock, { flag: 'wx', mode: 0o600 });
    fs.copyFileSync(path.join(baseline.payloadPath, 'catalog.json'), path.join(output, 'catalog.json'), fs.constants.COPYFILE_EXCL);
    write(path.join(output, 'runtime-build.json'), record);
    write(path.join(output, 'runtime.cdx.json'), rebindSbom(json(path.join(baseline.payloadPath, 'sbom.cdx.json')), previousRecord, record));
    if (fresh.source() !== sourceCommit) fail('NODE_ONLY_SOURCE_CHANGED');
    return fresh.verifyPrepared({ directory: output, sourceCommit, sequence });
}
module.exports = { KIND, authenticateBaseline, recordFor, rebindSbom, prepare, encode };
if (require.main === module) {
    try {
        const a = process.argv.slice(2), flags = ['--baseline-bundle', '--public-key', '--public-key-sha256', '--resolution-lock', '--node-archive', '--output', '--sequence'];
        if (a.length !== flags.length * 2 || flags.some((flag, index) => a[index * 2] !== flag) || !/^[1-9][0-9]*$/.test(a[13])) fail('NODE_ONLY_USAGE');
        const result = prepare({ bundleDirectory: a[1], publicKeyFile: a[3], publicKeySha256: a[5], resolutionLock: a[7], nodeArchive: a[9], output: a[11], sequence: Number(a[13]) });
        process.stdout.write(JSON.stringify({ ok: true, signed: false, sourceCommit: result.record.sourceCommit,
            baselineReleaseId: result.record.nodeOnlyUpdate.baselineReleaseId, nodeVersion: result.record.nodeVersion,
            nativeEvidenceRequired: true, productionReleaseApproved: false }) + '\n');
    } catch (error) { process.stderr.write((/^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'NODE_ONLY_FAILED') + '\n'); process.exitCode = 1; }
}
