'use strict';
// Build-host tool only. Never invoke from an adapter or on a running appliance.
// Package lifecycle hooks stay disabled; explicit compilation is a separate,
// reviewed step. Sources are copied so npm cannot rewrite the source checkout.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const dependencyPolicy = require('./runtime-dependency-policy.cjs');
const product = require('../../runtime/product/scope.cjs');
const { copyRuntimeLicenses } = require('../system/build-bundle.cjs');
const { normalize: normalizeSerialport } = require('./normalize-serialport-native.cjs');
const REPO = path.resolve(__dirname, '../..');
const COMPONENTS = ['admin', 'ui', 'devices', 'eebus', 'ocpp21', 'backitup'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function reject(code) { const e = new Error(code); e.code = code; throw e; }
function read(file) {
    const s = fs.lstatSync(file);
    if (!s.isFile() || s.size > 16 * 1024 * 1024) reject('BUILD_INPUT');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function snapshot(source, target) {
    let count = 0, bytes = 0;
    fs.mkdirSync(target, { mode: 0o700 });
    function walk(a, b) {
        for (const entry of fs.readdirSync(a, { withFileTypes: true })) {
            if (['.git', 'node_modules'].includes(entry.name)) continue;
            if (++count > 100000) reject('BUILD_SNAPSHOT_LIMIT');
            const src = path.join(a, entry.name), dst = path.join(b, entry.name);
            if (entry.isDirectory()) { fs.mkdirSync(dst); walk(src, dst); }
            else if (entry.isFile()) {
                const st = fs.lstatSync(src); bytes += st.size;
                if (st.size > 64 * 1024 * 1024 || bytes > 1024 ** 3 || st.nlink !== 1) reject('BUILD_SNAPSHOT_LIMIT');
                fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
            } else reject('BUILD_SOURCE_LINK');
        }
    }
    walk(source, target);
    return { files: count, bytes };
}
function run(args, cwd, logfile) {
    const env = { ...process.env, npm_config_ignore_scripts: 'true', npm_config_audit: 'false', npm_config_fund: 'false', npm_config_offline: 'true' };
    delete env.NODE_OPTIONS; delete env.NODE_PATH;
    // Bind npm to the same reviewed official Node distribution as this process.
    // A different PATH must not silently select an older Node/npm toolchain.
    const cli = process.platform === 'win32' ? path.resolve(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js') : path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
    const manifest = path.resolve(path.dirname(cli), '../package.json');
    if (read(manifest).version !== '11.19.0' || !fs.lstatSync(cli).isFile()) reject('BUILD_NPM_TOOLCHAIN');
    env.PATH = `${path.dirname(process.execPath)}${path.delimiter}${env.PATH || ''}`;
    const started = Date.now();
    const r = cp.spawnSync(process.execPath, [cli, ...args], { cwd, env, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024, shell: false });
    fs.writeFileSync(logfile, `${r.stdout || ''}${r.stderr || ''}`, { flag: 'wx', mode: 0o600 });
    // Preserve bounded subprocess evidence even if npm exits without output or
    // the build host times out. Never infer a cache miss from an empty log.
    fs.writeFileSync(`${logfile}.result.json`, JSON.stringify({ status: r.status, signal: r.signal,
        errorCode: r.error?.code || null, elapsedMs: Date.now() - started,
        stdoutBytes: Buffer.byteLength(r.stdout || ''), stderrBytes: Buffer.byteLength(r.stderr || '') }) + '\n', { flag: 'wx', mode: 0o600 });
    if (r.error || r.status !== 0) {
        if (/ENOTCACHED|cache mode is 'only-if-cached'/.test(`${r.stdout || ''}${r.stderr || ''}`)) reject('BUILD_OFFLINE_CACHE_MISS');
        reject('BUILD_NPM_FAILED');
    }
    return r.stdout;
}
function normalizeRoot(app) {
    const pkg = read(path.join(app, 'package.json')), lock = read(path.join(app, 'package-lock.json'));
    if (lock.lockfileVersion !== 3 || !lock.packages?.['']) reject('BUILD_LOCK');
    for (const name of Object.keys(pkg.dependencies)) {
        const installed = read(path.join(app, 'node_modules', name, 'package.json'));
        if (installed.name !== name || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(installed.version)) reject('BUILD_IDENTITY');
        const entry = lock.packages[`node_modules/${name}`];
        if (!entry || entry.link || entry.version !== installed.version) reject('BUILD_LOCK_IDENTITY');
        if (name !== 'iobroker.js-controller' && (!/^file:\.\.\/packages\/[a-z0-9_.-]+\.tgz$/.test(entry.resolved || '') || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity || ''))) reject('BUILD_ARCHIVE_INTEGRITY');
        pkg.dependencies[name] = installed.version;
        lock.packages[''].dependencies[name] = installed.version;
    }
    for (const [file, data] of [['package.json', pkg], ['package-lock.json', lock]]) fs.writeFileSync(path.join(app, file), JSON.stringify(data, null, 2) + '\n');
    return pkg;
}
function mergeOverrides(inputs) {
    const out = Object.create(null); let entries = 0;
    function merge(target, source, depth) {
        if (!source || typeof source !== 'object' || Array.isArray(source) || depth > 8) reject('BUILD_OVERRIDE_SHAPE');
        for (const [key, value] of Object.entries(source)) {
            if (++entries > 256 || !key || key.length > 256 || ['__proto__', 'constructor', 'prototype'].includes(key)) reject('BUILD_OVERRIDE_SHAPE');
            if (typeof value === 'string') {
                if (!value || value.length > 512 || /[\x00-\x1f]/.test(value)) reject('BUILD_OVERRIDE_SHAPE');
                if (Object.hasOwn(target, key) && target[key] !== value) reject('BUILD_OVERRIDE_CONFLICT');
                target[key] = value;
            } else {
                if (Object.hasOwn(target, key) && (typeof target[key] !== 'object' || target[key] === null)) reject('BUILD_OVERRIDE_CONFLICT');
                if (!Object.hasOwn(target, key)) target[key] = Object.create(null);
                merge(target[key], value, depth + 1);
            }
        }
    }
    for (const item of inputs) if (item !== undefined) merge(out, item, 0);
    return out;
}
function targetArguments(platform) {
    if (!['linux-x64', 'linux-arm64'].includes(platform)) reject('BUILD_TARGET_PLATFORM');
    return ['--os=linux', `--cpu=${platform.slice(6)}`, '--libc=glibc'];
}
function build({ output, components = COMPONENTS, eebusSource, platform, postgresql = false }) {
    const base = path.resolve(output);
    if (base === REPO || base.startsWith(REPO + path.sep) || fs.existsSync(base)) reject('BUILD_FRESH_EXTERNAL_DIRECTORY_REQUIRED');
    if (!Array.isArray(components) || !components.length || new Set(components).size !== components.length || components.some(x => !COMPONENTS.includes(x))) reject('BUILD_COMPONENTS');
    if (postgresql && (components.length !== COMPONENTS.length || eebusSource)) reject('BUILD_FULL_PRODUCT_REQUIRED');
    if (postgresql) product.inspectSources(REPO);
    const target = targetArguments(platform);
    if (process.versions.node !== '24.21.0') reject('BUILD_NODE_VERSION');
    fs.mkdirSync(base, { mode: 0o700 });
    for (const d of ['sources', 'packages', 'logs', 'app']) fs.mkdirSync(path.join(base, d));
    const packed = [], overrides = [];
    const selected = [...components, ...(postgresql ? ['store', 'db-objects-postgresql', 'db-states-postgresql'] : [])];
    for (const id of selected) {
        const backendPackage = !COMPONENTS.includes(id);
        const original = backendPackage ? path.join(REPO, 'runtime/postgresql/packages', id) : id === 'eebus' && eebusSource ? path.resolve(eebusSource) : path.join(REPO, 'components', id);
        const src = path.join(base, 'sources', id);
        const copied = snapshot(original, src);
        const pkg = read(path.join(src, 'package.json'));
        overrides.push(pkg.overrides);
        if (!(backendPackage ? /^@(iobroker|nexowatt)\/[a-z0-9_-]+$/.test(pkg.name) : /^iobroker\.[a-z0-9_-]+$/.test(pkg.name)) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) reject('BUILD_COMPONENT_IDENTITY');
        if (!pkg.main || path.isAbsolute(pkg.main) || pkg.main.split(/[\\/]/).includes('..') || !fs.existsSync(path.join(src, pkg.main))) reject('BUILD_MAIN_MISSING');
        const result = JSON.parse(run(['pack', '--ignore-scripts', '--json', '--pack-destination', path.join(base, 'packages')], src, path.join(base, 'logs', `pack-${id}.log`)));
        if (!Array.isArray(result) || result.length !== 1 || !/^[a-z0-9_.-]+\.tgz$/.test(result[0].filename)) reject('BUILD_PACK_RESULT');
        const file = result[0].filename;
        packed.push({ id, package: pkg.name, version: pkg.version, archive: file, sha256: sha(fs.readFileSync(path.join(base, 'packages', file))), main: pkg.main, snapshot: copied, lifecycleScriptsExecuted: false });
    }
    const app = path.join(base, 'app');
    const pkg = { name: 'nexowatt-eos-integrated-development', version: postgresql ? '0.2.0-test.3' : '0.2.0-dev.3', private: true,
        license: 'SEE LICENSE IN LICENSE', engines: { node: '24.21.0' }, dependencies: { 'iobroker.js-controller': '7.2.2' } };
    copyRuntimeLicenses(app);
    for (const row of packed) pkg.dependencies[row.package] = `file:../packages/${row.archive}`;
    // npm only honors overrides at the installation root. Preserve explicit
    // source policy rather than silently dropping it when packaging adapters.
    const mergedOverrides = mergeOverrides([dependencyPolicy.reviewedOverrides(), ...overrides]);
    if (Object.keys(mergedOverrides).length) pkg.overrides = mergedOverrides;
    fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    run(['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', ...target], app, path.join(base, 'logs', 'install.log'));
    normalizeRoot(app);
    let postgresqlBackendBinding;
    if (postgresql) {
        const root = read(path.join(app, 'package.json')), lock = read(path.join(app, 'package-lock.json'));
        const controllerPath = path.join(app, 'node_modules/iobroker.js-controller/package.json'), controller = read(controllerPath);
        const originalControllerManifestSha256 = sha(fs.readFileSync(controllerPath));
        for (const row of packed.filter(row => !COMPONENTS.includes(row.id))) {
            controller.dependencies[row.package] = row.version;
            lock.packages['node_modules/iobroker.js-controller'].dependencies[row.package] = row.version;
            delete root.dependencies[row.package]; delete lock.packages[''].dependencies[row.package];
        }
        for (const [file, data] of [[controllerPath, controller], [path.join(app, 'package.json'), root], [path.join(app, 'package-lock.json'), lock]]) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
        const hiddenLock = path.join(app, 'node_modules/.package-lock.json');
        if (fs.existsSync(hiddenLock)) fs.unlinkSync(hiddenLock);
        postgresqlBackendBinding = { originalControllerManifestSha256, controllerManifestSha256: sha(fs.readFileSync(controllerPath)),
            packages: packed.filter(row => !COMPONENTS.includes(row.id)).map(({ package: name, version, sha256 }) => ({ name, version, sha256 })),
            change: 'exact private backend dependencies moved to controller; stale npm hidden lock removed' };
        product.inspectApp(app);
    }
    const nativeNormalization = postgresql && platform === 'linux-arm64' ? normalizeSerialport({ app, platform, nodeVersion: process.versions.node }) : undefined;
    if (nativeNormalization) fs.writeFileSync(path.join(base, 'native-transform.json'), JSON.stringify(nativeNormalization, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
    const runtimeDependencyPolicy = dependencyPolicy.verifyInstalledTree(app);
    const evidence = { schemaVersion: 1, scope: 'isolated-build-host-installed-assessment-tree', productReleaseApproved: false, targetDeviceObserved: false, targetPlatform: platform, hostPlatform: `${process.platform}-${process.arch}`, node: process.version, npmLifecycleScriptsExecuted: false, npmNetworkMode: 'offline-only', runtimeDependencyPolicy, postgresqlBackendBinding, nativeNormalization, components: packed, packageLockSha256: sha(fs.readFileSync(path.join(app, 'package-lock.json'))) };
    fs.writeFileSync(path.join(base, 'build-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    return evidence;
}
module.exports = { COMPONENTS, snapshot, normalizeRoot, mergeOverrides, targetArguments, build };
if (require.main === module) {
    try {
        const args = process.argv.slice(2), out = {};
        if (args.length % 2) reject('BUILD_USAGE');
        for (let i = 0; i < args.length; i += 2) { if (!['--output', '--components', '--eebus-source', '--platform'].includes(args[i]) || out[args[i]]) reject('BUILD_USAGE'); out[args[i]] = args[i + 1]; }
        if (!out['--output'] || !out['--platform']) reject('BUILD_USAGE');
        const evidence = build({ output: out['--output'], components: out['--components']?.split(','), eebusSource: out['--eebus-source'], platform: out['--platform'] });
        process.stdout.write(JSON.stringify({ ok: true, components: evidence.components.length, packageLockSha256: evidence.packageLockSha256 }) + '\n');
    } catch (e) { process.stderr.write(JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(e.code || '') ? e.code : 'BUILD_FAILED' }) + '\n'); process.exitCode = 1; }
}
