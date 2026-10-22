'use strict';
// Manufacturer build host only. Resolve once from the staged offline cache;
// test and sign the same complete installed tree, never an R9 overlay.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { build, runNpm } = require('./build-runtime.cjs');
const product = require('../../runtime/product/scope.cjs');
const profileTools = require('../../runtime/controller-profile/transform.cjs');
const bundle = require('../../runtime/release/bundle.cjs');
const { copyDirectory, componentRows } = require('../system/build-bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const fresh = require('../../runtime/release/fresh-sbom-binding.cjs');
const nodeRuntime = require('./prepare-node-runtime.cjs');
const nodePolicy = require('../../runtime/updates/node-policy.cjs');
const TARGET_NODE = nodeRuntime.policy.currentVersion;
const ROOT = path.resolve(__dirname, '../..');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const json = file => JSON.parse(bundle.readFileLimited(file, 32 * 1024 * 1024).bytes);
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
function git(args) {
    const result = cp.spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, shell: false });
    if (result.status !== 0 || result.error) fail('FRESH_BUILD_GIT');
    return result.stdout.trim();
}
function source() {
    if (process.platform !== 'linux' || process.versions.node !== TARGET_NODE || git(['status', '--porcelain'])) fail('FRESH_BUILD_CLEAN_HOST');
    const commit = git(['rev-parse', 'HEAD']);
    if (!/^[a-f0-9]{40}$/.test(commit)) fail('FRESH_BUILD_GIT');
    return commit;
}
function sequenceValue(sequence) {
    if (!Number.isSafeInteger(sequence) || sequence < 15) fail('FRESH_BUILD_SEQUENCE');
    return sequence;
}
function freshCatalog(files) {
    const catalog = { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 6,
        entries: product.specsFor(product.SECURITY_REFRESH_TEST).map(spec => {
            const management = ['eos-admin', 'nexowatt-ui'].includes(spec.id);
            return { id: spec.id, package: spec.package, version: spec.version, kind: spec.kind, required: true,
                sha256: componentTreeDigest(componentRows(files.map(row => ({ ...row, path: `app/${row.path}` })), spec.package)),
                digestKind: 'tree-sha256-v1', review: { status: 'approved-test', evidenceId: 'eos-security-refresh-native-20261021' },
                permissions: { capabilities: spec.kind === 'core' ? ['state.read', 'state.write', 'process.fixed'] :
                    ['state.read', 'state.write', ...(management ? ['https.listen', 'https.client'] : [])],
                    protocols: ['eos-postgresql-mtls13-v1', ...(management ? ['https'] : [])],
                    network: 'declared-endpoints-and-discovery', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
                communication: 'eos-postgresql-mtls13-v1' };
        }) };
    product.assertCatalog(catalog, product.SECURITY_REFRESH_TEST);
    return catalog;
}
function prepare({ output, sequence = 15, resolutionLock, nodeArchive }) {
    sequenceValue(sequence);
    if (!path.isAbsolute(resolutionLock || '') || fs.realpathSync(resolutionLock) !== resolutionLock) fail('FRESH_BUILD_LOCK_REQUIRED');
    const sourceCommit = source(), base = path.resolve(output || '');
    if (!path.isAbsolute(output || '') || output !== base || base === ROOT || base.startsWith(ROOT + path.sep) || fs.existsSync(base)) fail('FRESH_BUILD_OUTPUT');
    nodeRuntime.verifyArchive(nodeArchive, TARGET_NODE);
    fs.mkdirSync(base, { mode: 0o700 });
    const nodeRuntimeDirectory = path.join(base, 'node-runtime');
    const nodeMetadata = nodeRuntime.prepare({ archive: nodeArchive, destination: nodeRuntimeDirectory, version: TARGET_NODE });
    const assembly = path.join(base, 'assembly');
    const evidence = build({ output: assembly, platform: 'linux-arm64', postgresql: true, releaseScope: product.SECURITY_REFRESH_TEST, resolutionLock });
    fs.copyFileSync(path.join(assembly, 'resolution-lock.json'), path.join(base, 'resolution-lock.json'), fs.constants.COPYFILE_EXCL);
    const app = path.join(base, 'app');
    copyDirectory(path.join(assembly, 'app'), app, true);
    const adapters = product.admittedAdapters(product.SECURITY_REFRESH_TEST);
    const transform = profileTools.applySecurityRefreshToBuild(app, adapters);
    const profile = profileTools.verifySecurityRefreshProfile(app, adapters);
    const manifest = { relativePath: 'node_modules/iobroker.js-controller/package.json',
        originalSha256: evidence.postgresqlBackendBinding.originalControllerManifestSha256,
        sha256: evidence.postgresqlBackendBinding.controllerManifestSha256 };
    transform.files.push(manifest);
    profile.files.push({ relativePath: manifest.relativePath, sha256: manifest.sha256 });
    write(path.join(base, 'controller-transform.json'), transform);
    product.inspectApp(app, product.SECURITY_REFRESH_TEST);
    const architecture = require('./check-runtime-architecture.cjs').checkRuntimeArchitecture({ app, platform: 'linux-arm64', nodeVersion: TARGET_NODE });
    if (!architecture.passed) fail('FRESH_BUILD_ARCHITECTURE');
    const canonical = require('./create-managed-archive.cjs').canonicalInventory(bundle.inventory(app).map(row => ({ ...row, path: `app/${row.path}` })),
        { profile: 'test', nodeVersion: TARGET_NODE, platforms: ['linux-arm64'] }, [architecture]);
    for (const row of canonical.files) fs.chmodSync(path.join(app, row.path.slice(4)), row.mode);
    const files = bundle.inventory(app);
    const record = { schemaVersion: 1, kind: fresh.ASSEMBLY, sourceCommit, sourceTreeClean: true,
        sequence, nodeVersion: TARGET_NODE, nodeRuntime: nodeMetadata, npmVersion: '11.19.0', controllerVersion: fresh.CONTROLLER,
        platform: 'linux-arm64', archiveModePolicy: canonical.modePolicy, signed: false, lifecycleScriptsExecuted: false, npmNetworkMode: 'offline-only',
        resolutionLockSha256: evidence.resolutionLockSha256, sourcePackages: evidence.components, runtimeDependencyPolicy: evidence.runtimeDependencyPolicy,
        controllerProfile: profile, packageLockSha256: bundle.sha256(fs.readFileSync(path.join(app, 'package-lock.json'))),
        appContentSha256: fresh.digest(fresh.content(files)), appModeSha256: fresh.digest(files),
        hardwareTested: false, productionReleaseApproved: false };
    write(path.join(base, 'runtime-build.json'), record);
    const npmSbom = runNpm(['sbom', '--offline', '--omit=dev', '--sbom-format=cyclonedx'], app, path.join(assembly, 'logs/sbom.log'));
    fs.writeFileSync(path.join(base, 'runtime.npm.cdx.json'), npmSbom, { flag: 'wx', mode: 0o600 });
    const args = ['-I', '-B', path.join(ROOT, 'tools/integration/bind-sbom.py'), '--app', app,
        '--npm-sbom', path.join(base, 'runtime.npm.cdx.json'), '--out', path.join(base, 'runtime.inventory.cdx.json'),
        '--coverage', path.join(base, 'runtime-sbom-coverage.json'), '--native-evidence', path.join(assembly, 'native-transform.json')];
    const bound = cp.spawnSync('/usr/bin/python3', args, { encoding: 'utf8', timeout: 120000, maxBuffer: 65536, shell: false });
    if (bound.error || bound.status !== 0) fail('FRESH_BUILD_SBOM');
    const bom = fresh.bindFreshSbom({ bom: json(path.join(base, 'runtime.inventory.cdx.json')), files, profile, record, sequence });
    write(path.join(base, 'runtime.cdx.json'), bom);
    const catalog = freshCatalog(files);
    write(path.join(base, 'catalog.json'), catalog);
    if (source() !== sourceCommit) fail('FRESH_BUILD_SOURCE_CHANGED');
    return verifyPrepared({ directory: base, sourceCommit, sequence });
}
function verifyPrepared({ directory, sourceCommit, sequence }) {
    sequenceValue(sequence);
    if (!path.isAbsolute(directory || '') || fs.realpathSync(directory) !== directory || directory === ROOT || directory.startsWith(ROOT + path.sep)) fail('FRESH_BUILD_DIRECTORY');
    const recordFile = path.join(directory, 'runtime-build.json'), record = json(recordFile), app = path.join(directory, 'app');
    const files = bundle.inventory(app), profile = profileTools.verifySecurityRefreshProfile(app, product.admittedAdapters(product.SECURITY_REFRESH_TEST));
    const manifest = files.find(row => row.path === 'node_modules/iobroker.js-controller/package.json');
    profile.files.push({ relativePath: manifest.path, sha256: manifest.sha256 });
    if (record.sourceCommit !== sourceCommit) fail('FRESH_BUILD_SOURCE_CHANGED');
    if (bundle.sha256(bundle.readFileLimited(path.join(directory, 'resolution-lock.json'), 32 * 1024 * 1024).bytes) !== record.resolutionLockSha256) fail('FRESH_BUILD_LOCK_CHANGED');
    product.inspectApp(app, product.SECURITY_REFRESH_TEST);
    require('./runtime-dependency-policy.cjs').verifyInstalledTree(app, { controllerVersion: fresh.CONTROLLER });
    const bom = json(path.join(directory, 'runtime.cdx.json'));
    const payloadRows = files.map(row => ({ ...row, path: `app/${row.path}` }));
    const nodeRuntimeDirectory = path.join(directory, 'node-runtime');
    payloadRows.push(...bundle.inventory(nodeRuntimeDirectory).map(row => ({ ...row, path: `node-runtime/${row.path}` })));
    const nodeMetadata = nodePolicy.validateRuntime(directory, { nodeVersion: TARGET_NODE, files: payloadRows });
    if (JSON.stringify(nodeMetadata) !== JSON.stringify(record.nodeRuntime)) fail('FRESH_BUILD_NODE_CHANGED');
    payloadRows.push({ path: 'runtime-build.json', sha256: bundle.sha256(fs.readFileSync(recordFile)) });
    fresh.verifyFreshSbom({ bom, files: payloadRows, profile, release: { sequence }, record });
    const bomBytes = bundle.readFileLimited(path.join(directory, 'runtime.cdx.json'), 32 * 1024 * 1024).bytes;
    payloadRows.push({ path: 'runtime.cdx.json', size: bomBytes.length, sha256: bundle.sha256(bomBytes), mode: 0o644 });
    require('../../runtime/release/sbom-binding.cjs').verifySbomBinding(directory, payloadRows, profile, { sequence }, 'runtime.cdx.json');
    const architecture = require('./check-runtime-architecture.cjs').checkRuntimeArchitecture({ app, platform: 'linux-arm64', nodeVersion: TARGET_NODE });
    if (!architecture.passed) fail('FRESH_BUILD_ARCHITECTURE');
    const catalog = product.assertCatalog(json(path.join(directory, 'catalog.json')), product.SECURITY_REFRESH_TEST);
    for (const entry of catalog.entries) if (entry.sha256 !== componentTreeDigest(componentRows(payloadRows, entry.package))) fail('FRESH_BUILD_CATALOG');
    return { directory, app, record, files, nodeRuntimeDirectory, catalog, catalogFile: path.join(directory, 'catalog.json'), sbomFile: path.join(directory, 'runtime.cdx.json'), recordFile };
}
module.exports = { prepare, verifyPrepared, source, sequenceValue, freshCatalog };
if (require.main === module) {
    try {
        const a = process.argv.slice(2);
        if (a.length !== 8 || a[0] !== '--output' || a[2] !== '--sequence' || a[4] !== '--resolution-lock' || a[6] !== '--node-archive' || !/^[1-9][0-9]*$/.test(a[3])) fail('FRESH_BUILD_USAGE');
        const value = prepare({ output: a[1], sequence: Number(a[3]), resolutionLock: a[5], nodeArchive: a[7] });
        process.stdout.write(JSON.stringify({ ok: true, sourceCommit: value.record.sourceCommit, appContentSha256: value.record.appContentSha256, signed: false, productionReleaseApproved: false }) + '\n');
    } catch (error) { process.stderr.write(JSON.stringify(require('./runtime-dependency-policy.cjs').failureSummary(error, 'FRESH_BUILD_FAILED')) + '\n'); process.exitCode = 1; }
}
