'use strict';
// Offline derivative of the authenticated ARM64 test.1 bundle. No npm install,
// audit, registry call or lifecycle script. Fresh external output only.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { verifyBundle, sha256 } = require('../../runtime/release/bundle.cjs');
const { copyDirectory } = require('../system/build-bundle.cjs');
const { snapshot } = require('./build-runtime.cjs');
const { verifyBuildProfile } = require('../../runtime/controller-profile/transform.cjs');
const REPO = path.resolve(__dirname, '../..');
const OLD_KEY = 'e4e2465af8ae947574804f42c5ed17072ada8831b9839876f188c0e7c4c08cbe';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'w', mode: 0o644 });
async function assemble({ bundle, driver, output }) {
    if (process.versions.node !== '24.21.0') fail('PG_BUILD_NODE');
    output = path.resolve(output); driver = path.resolve(driver); bundle = path.resolve(bundle);
    if (output === REPO || output.startsWith(REPO + path.sep) || fs.existsSync(output)) fail('PG_BUILD_FRESH_EXTERNAL_OUTPUT');
    const publicKey = fs.readFileSync(path.join(REPO, 'delivery/test-pi-0.2.0-test.1/release-public.pem'));
    if (sha256(publicKey) !== OLD_KEY) fail('PG_BASE_KEY_CHANGED');
    const base = verifyBundle({ bundleDirectory: bundle, publicKey, minimumSequence: 0, nodeVersion: '24.21.0', platform: 'linux-arm64' });
    if (base.manifest.releaseVersion !== '0.2.0-test.1') fail('PG_BASE_RELEASE');
    const expectedDriver = fs.readFileSync(path.join(REPO, 'reports/integration/postgresql/raw/pg-package-lock.json'));
    if (sha256(fs.readFileSync(path.join(driver, 'package-lock.json'))) !== sha256(expectedDriver)) fail('PG_DRIVER_LOCK_CHANGED');
    fs.mkdirSync(output, { mode: 0o700 });
    for (const name of ['packages', 'sources', 'logs']) fs.mkdirSync(path.join(output, name), { mode: 0o700 });
    const app = path.join(output, 'app'); copyDirectory(path.join(base.payloadPath, 'app'), app, true);
    const root = json(path.join(app, 'package.json')), lock = json(path.join(app, 'package-lock.json'));
    root.version = '0.2.0-test.2'; lock.version = root.version; lock.packages[''].version = root.version;
    const npm = path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
    const records = [];
    function pack(source, label) {
        const src = path.join(output, 'sources', label), files = snapshot(source, src);
        const args = [npm, 'pack', '--ignore-scripts', '--offline', '--json', '--pack-destination', path.join(output, 'packages')];
        const result = cp.spawnSync(process.execPath, args, { cwd: src, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024,
            env: { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: output, npm_config_offline: 'true', npm_config_ignore_scripts: 'true', npm_config_audit: 'false', npm_config_fund: 'false' } });
        fs.writeFileSync(path.join(output, 'logs', `pack-${label}.json`), result.stdout || '', { flag: 'wx' });
        if (result.status !== 0 || result.error) fail('PG_LOCAL_PACK_FAILED');
        const rows = JSON.parse(result.stdout);
        if (rows.length !== 1 || !/^[a-z0-9_.-]+\.tgz$/.test(rows[0].filename)) fail('PG_LOCAL_PACK_IDENTITY');
        const info = rows[0], archive = path.join(output, 'packages', info.filename), pkg = json(path.join(src, 'package.json'));
        if (!info.files?.every(row => typeof row.path === 'string' && !path.isAbsolute(row.path) && !row.path.split(/[\\/]/).some(p => ['', '.', '..'].includes(p)))) fail('PG_PACK_PATH');
        const target = path.join(app, 'node_modules', pkg.name);
        const nested = path.join(target, 'node_modules'), retained = path.join(output, `retained-${label}-dependencies`);
        if (fs.existsSync(nested)) {
            const old = json(path.join(target, 'package.json'));
            if (JSON.stringify(old.dependencies) !== JSON.stringify(pkg.dependencies)) fail('PG_CHANGED_ADAPTER_DEPENDENCIES');
            fs.renameSync(nested, retained);
        }
        // This directory is only the fresh copy made above, never source/host data.
        if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
        fs.mkdirSync(target, { recursive: true, mode: 0o755 });
        const extracted = cp.spawnSync('/usr/bin/tar', ['--extract', '--gzip', '--file', archive, '--directory', target,
            '--strip-components=1', '--no-same-owner', '--no-same-permissions'], { timeout: 60000, encoding: 'utf8' });
        if (extracted.status !== 0 || extracted.error) fail('PG_LOCAL_UNPACK_FAILED');
        if (fs.existsSync(retained)) fs.renameSync(retained, nested);
        if (json(path.join(target, 'package.json')).name !== pkg.name) fail('PG_UNPACK_IDENTITY');
        const entry = { version: pkg.version, resolved: `file:../packages/${info.filename}`, integrity: info.integrity };
        for (const key of ['license', 'dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta', 'engines']) if (pkg[key]) entry[key] = pkg[key];
        lock.packages[`node_modules/${pkg.name}`] = entry;
        records.push({ label, name: pkg.name, version: pkg.version, archive: info.filename, sha256: sha256(fs.readFileSync(archive)), integrity: info.integrity, snapshot: files });
        return pkg;
    }
    // Repack current own UI source (including OS update status), never silently
    // ship the historical UI while calling it the current source version.
    pack(path.join(REPO, 'components/ui'), 'ui');
    const controllerFile = path.join(app, 'node_modules/iobroker.js-controller/package.json');
    const originalControllerManifest = sha256(fs.readFileSync(controllerFile)), controller = json(controllerFile);
    for (const label of ['store', 'db-objects-postgresql', 'db-states-postgresql']) {
        const pkg = pack(path.join(REPO, 'runtime/postgresql/packages', label), label);
        controller.dependencies[pkg.name] = pkg.version;
        lock.packages['node_modules/iobroker.js-controller'].dependencies[pkg.name] = pkg.version;
    }
    const driverPrefix = 'node_modules/@nexowatt/eos-postgresql-store/';
    copyDirectory(path.join(driver, 'node_modules'), path.join(app, driverPrefix, 'node_modules'), true);
    for (const [relative, entry] of Object.entries(JSON.parse(expectedDriver).packages)) if (relative) lock.packages[driverPrefix + relative] = entry;
    // Nested npm lock is provenance for the public driver only, not the app tree.
    const nestedLock = path.join(app, driverPrefix, 'node_modules/.package-lock.json');
    if (fs.existsSync(nestedLock)) fs.unlinkSync(nestedLock);
    const hiddenLock = path.join(app, 'node_modules/.package-lock.json'); if (fs.existsSync(hiddenLock)) fs.unlinkSync(hiddenLock);
    save(controllerFile, controller); save(path.join(app, 'package.json'), root); save(path.join(app, 'package-lock.json'), lock);
    const profile = verifyBuildProfile(app, [{ package: 'iobroker.eos-admin', version: '7.10.11' }, { package: 'iobroker.nexowatt-ui', version: '1.0.21' }]);
    const transform = json(path.join(REPO, 'reports/integration/stabilization/arm64/controller-transform.json'));
    save(path.join(output, 'controller-transform.json'), transform);
    const record = { schemaVersion: 1, kind: 'eos-postgresql-test-assembly', sourceBaseReleaseId: base.releaseId,
        baseSigningKeySha256: OLD_KEY, nodeVersion: process.versions.node, npmVersion: '11.19.0', platform: 'linux-arm64',
        network: 'offline-only', lifecycleScriptsExecuted: false, sourcePackages: records,
        driverLockSha256: sha256(expectedDriver), packageLockSha256: sha256(fs.readFileSync(path.join(app, 'package-lock.json'))),
        controllerPackageManifest: { originalSha256: originalControllerManifest, sha256: sha256(fs.readFileSync(controllerFile)),
            change: 'exact private PostgreSQL backend dependencies added; controller executable patches unchanged' },
        controllerProfile: profile, targetExecutionPerformed: false, productionApproved: false };
    save(path.join(output, 'assembly.json'), record);
    return { output, app, sourceBaseReleaseId: base.releaseId, packageLockSha256: record.packageLockSha256 };
}
module.exports = { assemble };
if (require.main === module) {
    const a = process.argv.slice(2);
    if (a.length !== 6 || a[0] !== '--bundle' || a[2] !== '--driver' || a[4] !== '--output') throw new Error('PG_ASSEMBLY_USAGE');
    assemble({ bundle: a[1], driver: a[3], output: a[5] }).then(result => process.stdout.write(JSON.stringify(result) + '\n'),
        error => { process.stderr.write((error.code || error.message) + '\n'); process.exitCode = 1; });
}
