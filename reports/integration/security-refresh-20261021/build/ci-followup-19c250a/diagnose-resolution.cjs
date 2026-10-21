'use strict';
// Diagnostic only: use the local toolchain to expose combined dependency
// conflicts before CI. This does not create or qualify a release/runtime.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../../../..');
const builder = require(path.join(ROOT, 'tools/integration/build-runtime.cjs'));
const policy = require(path.join(ROOT, 'tools/integration/runtime-dependency-policy.cjs'));
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || output.startsWith(ROOT + '/') || fs.existsSync(output)) throw new Error('DIAGNOSTIC_FRESH_OUTPUT_REQUIRED');
fs.mkdirSync(output, { mode: 0o700 });
for (const name of ['sources', 'packages', 'app', 'logs']) fs.mkdirSync(path.join(output, name));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function npm(args, cwd, label) {
    const env = { ...process.env, npm_config_ignore_scripts: 'true', npm_config_audit: 'false', npm_config_fund: 'false',
        npm_config_offline: 'false', npm_config_fetch_retries: '0', npm_config_fetch_timeout: '5000' };
    delete env.NODE_OPTIONS; delete env.NODE_PATH;
    const result = cp.spawnSync('npm', args, { cwd, env, shell: false, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(output, 'logs', `${label}.log`), (result.stdout || '') + (result.stderr || ''), { mode: 0o600 });
    if (result.error || result.status !== 0) throw Object.assign(new Error('DIAGNOSTIC_NPM_FAILED'), { code: 'DIAGNOSTIC_NPM_FAILED', stage: label, status: result.status });
    return result.stdout;
}
const sourcePackages = [], overrides = [], dependencies = { 'iobroker.js-controller': '7.2.5' };
for (const id of [...builder.COMPONENTS, 'store', 'db-objects-postgresql', 'db-states-postgresql']) {
    const relative = builder.COMPONENTS.includes(id) ? `components/${id}` : `runtime/postgresql/packages/${id}`;
    const source = path.join(ROOT, relative), target = path.join(output, 'sources', id);
    const tracked = cp.execFileSync('git', ['ls-files', '-z', '--', relative + '/'], { cwd: ROOT, encoding: 'utf8' })
        .split('\0').filter(Boolean).map(name => name.slice(relative.length + 1));
    builder.snapshot(source, target, tracked);
    const manifest = path.join(target, 'package.json'), pkg = JSON.parse(fs.readFileSync(manifest));
    const sourceManifestSha256 = sha(manifest);
    if (builder.bindPostgresqlPeer(pkg, id, '7.2.5')) fs.writeFileSync(manifest, JSON.stringify(pkg, null, 2) + '\n');
    overrides.push(pkg.overrides);
    const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', path.join(output, 'packages')], target, `pack-${id}`));
    if (packed.length !== 1 || !/^[a-z0-9_.-]+\.tgz$/.test(packed[0].filename)) throw new Error('DIAGNOSTIC_PACK_RESULT');
    dependencies[pkg.name] = `file:../packages/${packed[0].filename}`;
    sourcePackages.push({ id, name: pkg.name, sourceManifestSha256, packedManifestSha256: sha(manifest), archiveSha256: sha(path.join(output, 'packages', packed[0].filename)) });
}
const app = path.join(output, 'app');
fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'nexowatt-eos-integrated-development', version: '0.2.0-test.3', private: true,
    license: 'SEE LICENSE IN LICENSE', engines: { node: '24.21.0' }, dependencies,
    overrides: builder.mergeOverrides([policy.reviewedOverrides('7.2.5'), ...overrides]) }, null, 2) + '\n');
npm(['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', ...builder.targetArguments('linux-arm64')], app, 'install');
const record = { schemaVersion: 1, kind: 'local-combined-dependency-diagnostic', releaseQualified: false, targetDeviceObserved: false,
    sourceBase: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    workingTreeChangesIncluded: true, nodeVersion: process.versions.node, npmVersion: cp.execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    lifecycleScriptsExecuted: false, sourcePackages, resolutionLockSha256: sha(path.join(app, 'package-lock.json')) };
try { record.policy = policy.verifyInstalledTree(app, { controllerVersion: '7.2.5' }); record.policyPassed = true; }
catch (error) { record.failure = policy.failureSummary(error); record.policyPassed = false; }
fs.writeFileSync(path.join(output, 'diagnostic.json'), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
process.stdout.write(JSON.stringify({ policyPassed: record.policyPassed, packageLockSha256: record.resolutionLockSha256, ...(record.failure ? { failure: record.failure } : {}) }) + '\n');
if (!record.policyPassed) process.exitCode = 1;
