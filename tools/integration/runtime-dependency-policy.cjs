'use strict';
// Build-host dependency policy. npm ignores transitive overrides, so the EOS
// assembler must apply this at its own root and check actual Node resolution.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const POLICY = Object.freeze({ id: 'EOS-RUNTIME-DEPENDENCIES-001', controller: '7.2.2',
    loader: '2.5.1-1', esbuild: '0.28.2', advisory: 'GHSA-67mh-4wv8-2f99' });
const REFRESH_PINS = Object.freeze({ '@iobroker/socket-classes': '2.10.0', '@iobroker/webserver': '3.3.1',
    '@iobroker/adapter-core': '3.4.3', '@iobroker/ws-server': '4.5.2', 'proxy-addr': '2.0.8', 'follow-redirects': '1.16.1',
    'compression': '1.8.2', 'http-cache-semantics': '4.3.0', 'ip-address': '10.7.4', moment: '2.31.0', qs: '6.16.1',
    axios: '1.20.0', multer: '2.4.0' });
const TRANSFORMED = new Set(['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/js-controller-common-db', '@iobroker/js-controller-adapter', '@iobroker/ws-server']);
const LOADER = '@alcalzone/esbuild-register';
const fail = code => { throw Object.assign(new Error(code), { code }); };
function selectedPolicy(controllerVersion = POLICY.controller) {
    if (!['7.2.2', '7.2.5'].includes(controllerVersion)) fail('DEPENDENCY_POLICY_UNREVIEWED_VERSION');
    return { ...POLICY, controller: controllerVersion };
}
function reviewedOverrides(controllerVersion = POLICY.controller) {
    const selected = selectedPolicy(controllerVersion);
    // npm's semver.intersects excludes the loader's exact prerelease selector
    // against ^2.5.1-1. Scope by the stable controller and validate the actual
    // loader version below instead of accepting a silently ineffective override.
    return { [`iobroker.js-controller@${selected.controller}`]: { [LOADER]: { esbuild: selected.esbuild } } };
}
function read(file) {
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 16 * 1024 * 1024) fail('DEPENDENCY_POLICY_INPUT');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function affected(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '');
    if (!match) fail('DEPENDENCY_POLICY_UNREVIEWED_VERSION');
    const [, major, minor, patch] = match.map(Number);
    return major === 0 && (minor < 24 || minor === 24 && patch <= 2);
}
function resolvePackage(request, name, app) {
    let directory = path.dirname(request.resolve(name));
    while (directory.startsWith(app + path.sep)) {
        const file = path.join(directory, 'package.json');
        if (fs.existsSync(file)) {
            const metadata = read(file);
            // CJS/ESM build subdirectories may contain only a module-type marker.
            if (metadata.name) {
                if (metadata.name !== name) fail('DEPENDENCY_POLICY_IDENTITY');
                if (fs.realpathSync(directory) !== directory) fail('DEPENDENCY_POLICY_ESCAPE');
                return { name, version: metadata.version, directory, file, request: createRequire(file) };
            }
        }
        directory = path.dirname(directory);
    }
    fail('DEPENDENCY_POLICY_ESCAPE');
}

function verifyInstalledTree(appInput, options = {}) {
    const policy = selectedPolicy(options.controllerVersion);
    const selector = `iobroker.js-controller@${policy.controller}`;
    const app = path.resolve(appInput);
    if (fs.realpathSync(app) !== app) fail('DEPENDENCY_POLICY_ESCAPE');
    const pkg = read(path.join(app, 'package.json'));
    const lockFile = path.join(app, 'package-lock.json');
    const lock = read(lockFile);
    if (lock.lockfileVersion !== 3 || !lock.packages?.['']) fail('DEPENDENCY_POLICY_LOCK');
    if (pkg.overrides?.[selector]?.[LOADER]?.esbuild !== POLICY.esbuild) fail('DEPENDENCY_POLICY_ROOT_OVERRIDE');
    const controller = resolvePackage(createRequire(path.join(app, 'package.json')), 'iobroker.js-controller', app);
    const loader = resolvePackage(controller.request, '@alcalzone/esbuild-register', app);
    const esbuild = resolvePackage(loader.request, 'esbuild', app);
    for (const [row, expected] of [[controller, policy.controller], [loader, POLICY.loader], [esbuild, POLICY.esbuild]]) {
        const relative = path.relative(app, row.directory).split(path.sep).join('/');
        const entry = lock.packages[relative];
        if (row.version !== expected) fail('DEPENDENCY_POLICY_UNREVIEWED_VERSION');
        if (!entry || entry.version !== row.version || entry.link || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity || '')) fail('DEPENDENCY_POLICY_LOCK_IDENTITY');
    }
    const refreshedInstances = [];
    if (policy.controller === '7.2.5') for (const [relative, entry] of Object.entries(lock.packages)) {
        if (!relative) continue;
        const name = relative.slice(relative.lastIndexOf('node_modules/') + 'node_modules/'.length);
        const pin = REFRESH_PINS[name] || (name === 'iobroker.js-controller' ? '7.2.5' : name === 'brace-expansion' && /^2\./.test(entry.version) ? '2.1.7' :
            name === 'form-data' && /^2\./.test(entry.version) ? '2.5.6' :
                /^@iobroker\/(?:js-controller-|db-(?:states|objects)-(?:file|jsonl|redis)$)/.test(name) ? '7.2.5' : null);
        if (!pin) continue;
        if (relative.split('/').some(part => part === '..' || part === '.') || path.isAbsolute(relative) || relative.includes('\\')) fail('DEPENDENCY_POLICY_LOCK_PATH');
        const installed = read(path.join(app, relative, 'package.json'));
        if (entry.version !== pin || installed.name !== name || installed.version !== pin || entry.link ||
            !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity || '')) fail('DEPENDENCY_POLICY_REFRESH_PIN');
        if (TRANSFORMED.has(name) && relative !== `node_modules/${name}`) fail('DEPENDENCY_POLICY_UNTRANSFORMED_COPY');
        refreshedInstances.push({ path: relative, name, version: pin });
    }
    const instances = [];
    for (const [relative, entry] of Object.entries(lock.packages)) {
        if (!(relative === 'node_modules/esbuild' || relative.endsWith('/node_modules/esbuild'))) continue;
        if (relative.split('/').some(part => part === '..' || part === '.') || path.isAbsolute(relative) || relative.includes('\\')) fail('DEPENDENCY_POLICY_LOCK_PATH');
        if (affected(entry.version)) fail('DEPENDENCY_POLICY_AFFECTED_ESBUILD');
        const installed = read(path.join(app, relative, 'package.json'));
        if (installed.name !== 'esbuild' || installed.version !== entry.version) fail('DEPENDENCY_POLICY_LOCK_IDENTITY');
        instances.push({ path: relative, version: entry.version });
    }
    if (!instances.length) fail('DEPENDENCY_POLICY_PACKAGE');
    return { schemaVersion: 1, policyId: POLICY.id, advisory: POLICY.advisory,
        controller: controller.version, loader: loader.version, esbuild: esbuild.version,
        resolution: { controller: path.relative(app, controller.file), loader: path.relative(app, loader.file), esbuild: path.relative(app, esbuild.file) },
        inspectedEsbuildInstances: instances, refreshedInstances, packageLockSha256: createHash('sha256').update(fs.readFileSync(lockFile)).digest('hex'),
        verifiedHost: { platform: process.platform, arch: process.arch }, lifecycleScriptsRequired: false };
}
module.exports = { POLICY, reviewedOverrides, affected, verifyInstalledTree };
