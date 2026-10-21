'use strict';
// Installed product scope is deliberately separate from permission to execute.
const fs = require('node:fs');
const path = require('node:path');
const SPECS = Object.freeze([
    { id: 'js-controller', source: null, package: 'iobroker.js-controller', version: '7.2.2', main: 'controller.js', kind: 'core', execute: true },
    { id: 'eos-admin', source: 'admin', package: 'iobroker.eos-admin', version: '7.10.11', main: 'build/main.js', kind: 'adapter', execute: true },
    { id: 'nexowatt-ui', source: 'ui', package: 'iobroker.nexowatt-ui', version: '1.0.21', main: 'main.js', kind: 'adapter', execute: true },
    { id: 'nexowatt-devices', source: 'devices', package: 'iobroker.nexowatt-devices', version: '0.5.169', main: 'bootstrap.js', kind: 'adapter', execute: false },
    { id: 'eebus', source: 'eebus', package: 'iobroker.eebus', version: '0.3.0', main: 'build/main.js', kind: 'adapter', execute: false },
    { id: 'ocpp21', source: 'ocpp21', package: 'iobroker.ocpp21', version: '0.4.0', main: 'main.js', kind: 'adapter', execute: false },
    { id: 'nexowatt-backup', source: 'backitup', package: 'iobroker.nexowatt-backup', version: '1.0.10', main: 'build/main.js', kind: 'adapter', execute: false },
].map(Object.freeze));
const PROFILE = 'eos-full-install-first-start-v1';
const fail = code => { throw Object.assign(new Error(code), { code }); };
// Explicit build scope. Historical management bundles never inherit a later
// candidate's execution permissions. This does not itself enable instances.
const MANAGEMENT_TEST = 'management-test';
const OWN_ADAPTER_TEST = 'own-adapter-test';
function releaseScope(manifest) {
    // Execution expansion belongs only to the new, separately signed test
    // revision. An old bundle never inherits it merely by being rebuilt.
    if (![13, 14].includes(manifest?.sequence) && !(Number.isSafeInteger(manifest?.sequence) && manifest.sequence >= 15)) return MANAGEMENT_TEST;
    if (manifest.product !== 'nexowatt-eos' || manifest.releaseVersion !== '0.2.0-test.3' ||
        manifest.profile !== 'test' || manifest.nodeVersion !== '24.21.0' ||
        !Array.isArray(manifest.platforms) || manifest.platforms.length !== 1 || manifest.platforms[0] !== 'linux-arm64') fail('PRODUCT_RELEASE_SCOPE');
    return OWN_ADAPTER_TEST;
}
function specsFor(scope = MANAGEMENT_TEST) {
    if (scope === MANAGEMENT_TEST) return SPECS;
    if (scope !== OWN_ADAPTER_TEST) fail('PRODUCT_TEST_SCOPE');
    return Object.freeze(SPECS.map(spec => Object.freeze({ ...spec, execute: true })));
}
function inspectPackage(directory, spec, scope = MANAGEMENT_TEST) {
    const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    const io = JSON.parse(fs.readFileSync(path.join(directory, 'io-package.json'), 'utf8'));
    if (pkg.name !== spec.package || pkg.version !== spec.version || spec.kind !== 'core' && pkg.main !== spec.main ||
        io.common?.version !== spec.version || io.common.name !== spec.package.slice('iobroker.'.length)) fail('PRODUCT_PACKAGE_IDENTITY');
    const entry = path.join(directory, spec.main);
    const st = fs.lstatSync(entry);
    if (!st.isFile() || st.isSymbolicLink()) fail('PRODUCT_MAIN_MISSING');
    return { id: spec.id, package: spec.package, version: spec.version, installed: true,
        configured: false, active: false, physicalControlEnabled: false,
        executionAdmitted: spec.execute, acceptance: spec.execute ?
            (scope === OWN_ADAPTER_TEST ? 'own-adapter-test-only' : 'management-test-only') : 'hardware-and-security-acceptance-open' };
}
function inspectSources(repo, scope = MANAGEMENT_TEST) {
    return specsFor(scope).filter(spec => spec.source).map(spec => ({ ...inspectPackage(path.join(repo, 'components', spec.source), spec, scope), sourcePresent: true, installed: false }));
}
function inspectApp(app, scope = MANAGEMENT_TEST) {
    const specs = specsFor(scope);
    const root = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(app, 'package-lock.json'), 'utf8'));
    if (lock.lockfileVersion !== 3 || Object.keys(root.dependencies || {}).length !== SPECS.length) fail('PRODUCT_ROOT_SCOPE');
    return specs.map(spec => {
        if (root.dependencies[spec.package] !== spec.version || lock.packages?.['']?.dependencies?.[spec.package] !== spec.version ||
            lock.packages?.[`node_modules/${spec.package}`]?.version !== spec.version) fail('PRODUCT_LOCK_SCOPE');
        return inspectPackage(path.join(app, 'node_modules', spec.package), spec, scope);
    });
}
function assertCatalog(catalog, scope = MANAGEMENT_TEST) {
    const specs = specsFor(scope);
    if (catalog.entries?.length !== SPECS.length) fail('PRODUCT_CATALOG_SCOPE');
    for (const spec of specs) {
        const row = catalog.entries.find(entry => entry.id === spec.id);
        if (!row || row.package !== spec.package || row.version !== spec.version || row.kind !== spec.kind ||
            row.review.status !== (spec.execute ? 'approved-test' : 'pending') || row.required !== spec.execute) fail('PRODUCT_CATALOG_SCOPE');
    }
    return catalog;
}
const admittedAdapters = (scope = MANAGEMENT_TEST) => specsFor(scope).filter(spec => spec.kind === 'adapter' && spec.execute).map(({ package: name, version, main }) => ({ package: name, version, main }));
module.exports = { PROFILE, SPECS, MANAGEMENT_TEST, OWN_ADAPTER_TEST, releaseScope, specsFor, inspectSources, inspectApp, assertCatalog, admittedAdapters };
