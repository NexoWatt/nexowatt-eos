'use strict';
// Release preparation runs offline. npm dependencies must have been resolved and
// tested in a separate unprivileged build directory before this tool is called.
const fs = require('node:fs');
const path = require('node:path');
const { inventory, readFileLimited, trustedDirectory, sha256, createBundle, safeRelative } = require('../../runtime/release/bundle.cjs');
const { parseCatalog, componentTreeDigest, planAdmission } = require('../../runtime/policy/admission.cjs');
const { verifyBuildProfile } = require('../../runtime/controller-profile/transform.cjs');
const { verifySbomBinding } = require('../../runtime/release/sbom-binding.cjs');
const { checkRuntimeArchitecture } = require('../integration/check-runtime-architecture.cjs');
const REPO = path.resolve(__dirname, '../..');
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function parseJson(file) { return JSON.parse(readFileLimited(file, 16 * 1024 * 1024).bytes); }
function copyDirectory(source, destination, skipBin = false) {
    trustedDirectory(source);
    fs.mkdirSync(destination, { mode: 0o755 });
    let entries = 0;
    function walk(relative) {
        const dir = fs.opendirSync(path.join(source, relative));
        try { for (let entry; (entry = dir.readSync()) !== null;) {
            if (++entries > 120000) reject('BUILD_SIZE');
            const name = safeRelative(relative ? `${relative}/${entry.name}` : entry.name);
            // Interpreter caches are build-host by-products, not reviewed
            // release inputs. Refuse them rather than silently signing stale
            // or platform-specific bytecode copied beside Python source.
            if (entry.name === '__pycache__' || /\.(?:pyc|pyo)$/i.test(entry.name)) reject('BUILD_GENERATED_PYTHON_CACHE');
            // npm's executable-link directory is unnecessary: EOS invokes fixed
            // JS entrypoints. No arbitrary symlinks from packages are followed.
            if (skipBin && entry.name === '.bin' && entry.isDirectory()) continue;
            const target = path.join(destination, name);
            if (entry.isDirectory()) { fs.mkdirSync(target, { mode: 0o755 }); walk(name); }
            else if (entry.isFile()) {
                const { bytes, mode } = readFileLimited(path.join(source, name));
                if (mode & 0o7000) reject('BUILD_FILE_MODE');
                fs.writeFileSync(target, bytes, { flag: 'wx', mode: mode & 0o111 ? 0o755 : 0o644 });
            } else reject('BUILD_LINK_OR_SPECIAL_FILE');
        } } finally { dir.closeSync(); }
    }
    walk('');
}
function componentRows(files, packageName) {
    const prefix = `app/node_modules/${packageName}/`;
    return files.filter(row => row.path.startsWith(prefix)).map(row => ({ path: row.path.slice(prefix.length), size: row.size, sha256: row.sha256 }));
}
function validatePayload(payload, manifest) {
    const catalog = parseCatalog(readFileLimited(path.join(payload, 'catalog.json'), 1024 * 1024).bytes.toString('utf8'));
    const app = parseJson(path.join(payload, 'app/package.json'));
    const lock = parseJson(path.join(payload, 'app/package-lock.json'));
    const communication = new Set(catalog.entries.map(entry => entry.communication));
    if (communication.size !== 1 || !['eos-redis-tls13-v1', 'eos-postgresql-mtls13-v1'].includes([...communication][0])) reject('BUILD_DATABASE_PROFILE');
    const databaseBackend = communication.has('eos-postgresql-mtls13-v1') ? 'postgresql' : 'redis';
    if (databaseBackend === 'postgresql') {
        const controller = parseJson(path.join(payload, 'app/node_modules/iobroker.js-controller/package.json'));
        for (const name of ['@iobroker/db-objects-postgresql', '@iobroker/db-states-postgresql', '@nexowatt/eos-postgresql-store']) {
            const item = parseJson(path.join(payload, 'app/node_modules', name, 'package.json'));
            if (item.name !== name || item.version !== '0.1.0-dev.1' || controller.dependencies?.[name] !== item.version ||
                lock.packages['node_modules/iobroker.js-controller']?.dependencies?.[name] !== item.version ||
                lock.packages[`node_modules/${name}`]?.version !== item.version) reject('BUILD_POSTGRESQL_PACKAGES');
        }
    }
    if (app.scripts && Object.keys(app.scripts).length) reject('BUILD_LIFECYCLE_SCRIPT');
    if (!app.dependencies || Object.keys(app.dependencies).length !== catalog.entries.length ||
        !lock.packages || lock.lockfileVersion !== 3) reject('BUILD_ROOT_DEPENDENCIES');
    const installed = [];
    for (const entry of catalog.entries) {
        if (app.dependencies[entry.package] !== entry.version ||
            lock.packages['']?.dependencies?.[entry.package] !== entry.version) reject('BUILD_VERSION');
        const info = parseJson(path.join(payload, 'app/node_modules', entry.package, 'package.json'));
        if (info.name !== entry.package || info.version !== entry.version) reject('BUILD_PACKAGE_IDENTITY');
        const digest = componentTreeDigest(componentRows(manifest.files, entry.package));
        if (digest !== entry.sha256) reject('BUILD_COMPONENT_DIGEST');
        installed.push({ id: entry.id, version: entry.version, sha256: digest });
    }
    // A checked catalog is not an execution sandbox. The complete dependency
    // tree is separately covered by the signed release manifest.
    const plan = planAdmission(catalog, { profile: manifest.profile,
        requested: catalog.entries.map(({ id, version }) => ({ id, version })), installed, active: [] });
    if (plan.quarantine.length || !catalog.entries.some(e => e.id === 'js-controller' && e.kind === 'core' && e.required)) reject('BUILD_CORE_REQUIRED');
    const profile = verifyBuildProfile(path.join(payload, 'app'), catalog.entries.filter(e => e.kind === 'adapter').map(({ package: name, version }) => ({ package: name, version })));
    const sbom = verifySbomBinding(payload, manifest.files, profile);
    // Every advertised platform must match the installed native payload. A
    // cross-built ARM tree remains untested on hardware until the Pi accepts it.
    if (!Array.isArray(manifest.platforms) || !manifest.platforms.length) reject('BUILD_ARCHITECTURE');
    for (const platform of manifest.platforms) {
        if (!checkRuntimeArchitecture({ app: path.join(payload, 'app'), platform, nodeVersion: manifest.nodeVersion }).passed) reject('BUILD_ARCHITECTURE');
    }
    return { catalog, plan, sbom, databaseBackend };
}
function preparePayload({ appDirectory, destination, catalogFile, sbomFile }) {
    const source = trustedDirectory(appDirectory);
    const target = path.resolve(destination);
    if (target === source || target.startsWith(source + path.sep)) reject('BUILD_OUTPUT_INSIDE_INPUT');
    if (fs.readdirSync(source).some(p => !['package.json', 'package-lock.json', 'node_modules'].includes(p))) reject('BUILD_APP_EXTRA_FILE');
    trustedDirectory(path.dirname(path.resolve(destination)));
    fs.mkdirSync(destination, { mode: 0o700 });
    try {
        copyDirectory(source, path.join(destination, 'app'), true);
        copyDirectory(path.join(REPO, 'runtime'), path.join(destination, 'runtime'));
        fs.mkdirSync(path.join(destination, 'tools')); fs.mkdirSync(path.join(destination, 'tools/system'));
        for (const file of ['host-preflight.cjs', 'install-host.cjs', 'postgresql-host-preflight.cjs', 'install-postgresql-host.cjs', 'prepare-inputs.py', 'activate-release.cjs', 'build-bundle.cjs', 'eos-base.cjs', 'onboard-ui.cjs', 'rotate-certificates.cjs', 'preflight-installation.cjs']) {
            fs.copyFileSync(path.join(REPO, 'tools/system', file), path.join(destination, 'tools/system', file), fs.constants.COPYFILE_EXCL);
        }
        fs.mkdirSync(path.join(destination, 'tools/integration'));
        fs.copyFileSync(path.join(REPO, 'tools/integration/check-runtime-architecture.cjs'), path.join(destination, 'tools/integration/check-runtime-architecture.cjs'), fs.constants.COPYFILE_EXCL);
        fs.mkdirSync(path.join(destination, 'security'));
        fs.copyFileSync(path.join(REPO, 'security/verify-runtime-tls.cjs'), path.join(destination, 'security/verify-runtime-tls.cjs'), fs.constants.COPYFILE_EXCL);
        fs.mkdirSync(path.join(destination, 'system')); fs.mkdirSync(path.join(destination, 'system/test-base'));
        copyDirectory(path.join(REPO, 'system/test-base/systemd'), path.join(destination, 'system/test-base/systemd'));
        copyDirectory(path.join(REPO, 'system/test-base/os-updates'), path.join(destination, 'system/test-base/os-updates'));
        fs.mkdirSync(path.join(destination, 'system/postgresql-test'));
        copyDirectory(path.join(REPO, 'system/postgresql-test/systemd'), path.join(destination, 'system/postgresql-test/systemd'));
        fs.copyFileSync(catalogFile, path.join(destination, 'catalog.json'), fs.constants.COPYFILE_EXCL);
        fs.copyFileSync(sbomFile, path.join(destination, 'sbom.cdx.json'), fs.constants.COPYFILE_EXCL);
        const sbom = parseJson(path.join(destination, 'sbom.cdx.json'));
        if (sbom.bomFormat !== 'CycloneDX' || !Array.isArray(sbom.components)) reject('BUILD_SBOM_REQUIRED');
        return inventory(destination);
    } catch (error) { fs.rmSync(destination, { recursive: true, force: true }); throw error; }
}
function args(argv) {
    const out = Object.create(null);
    if (argv.length % 2) reject('BUILD_USAGE');
    for (let n = 0; n < argv.length; n += 2) {
        const key = argv[n];
        if (!['--app', '--catalog', '--sbom', '--metadata', '--private-key', '--output'].includes(key) || out[key] || !argv[n + 1]) reject('BUILD_USAGE');
        out[key] = path.resolve(argv[n + 1]);
    }
    if (Object.keys(out).length !== 6) reject('BUILD_USAGE');
    return out;
}
function main(argv) {
    const opts = args(argv), output = opts['--output'];
    const parent = trustedDirectory(path.dirname(output));
    const scratch = fs.mkdtempSync(path.join(parent, '.eos-build-'));
    try {
        const payload = path.join(scratch, 'payload');
        const files = preparePayload({ appDirectory: opts['--app'], destination: payload,
            catalogFile: opts['--catalog'], sbomFile: opts['--sbom'] });
        const metadata = parseJson(opts['--metadata']);
        validatePayload(payload, { ...metadata, files });
        const key = readFileLimited(opts['--private-key'], 16384);
        if (key.mode & 0o077) reject('BUILD_PRIVATE_KEY_PERMISSIONS');
        return createBundle({ sourceDirectory: payload, bundleDirectory: output, metadata, privateKey: key.bytes });
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
module.exports = { copyDirectory, componentRows, validatePayload, preparePayload, main };
if (require.main === module) {
    try { process.stdout.write(`${JSON.stringify({ ok: true, ...main(process.argv.slice(2)) })}\n`); }
    catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'BUILD_FAILED' })}\n`); process.exitCode = 1; }
}
