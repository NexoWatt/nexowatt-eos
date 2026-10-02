'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const policy = require('../../tools/integration/runtime-dependency-policy.cjs');
const { mergeOverrides } = require('../../tools/integration/build-runtime.cjs');
function fixture(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-dependency-policy-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    const write = (file, object) => { fs.mkdirSync(path.dirname(path.join(app, file)), { recursive: true }); fs.writeFileSync(path.join(app, file), JSON.stringify(object)); };
    const pkg = { name: 'eos-test', private: true, overrides: policy.reviewedOverrides() };
    const lock = { lockfileVersion: 3, packages: { '': { name: pkg.name } } };
    for (const [name, version] of [['iobroker.js-controller', policy.POLICY.controller], ['@alcalzone/esbuild-register', policy.POLICY.loader], ['esbuild', policy.POLICY.esbuild]]) {
        const relative = 'node_modules/' + name;
        write(relative + '/package.json', { name, version, main: 'main.js' }); fs.writeFileSync(path.join(app, relative, 'main.js'), 'module.exports = {};');
        lock.packages[relative] = { version, integrity: 'sha512-Zml4dHVyZQ==' };
    }
    write('package.json', pkg); write('package-lock.json', lock); return { app, pkg, lock, write };
}
test('one approved leaf override merges without dropping source OAuth override', () => {
    const value = mergeOverrides([policy.reviewedOverrides(), { 'oauth2-server': 'npm:@node-oauth/oauth2-server@5.3.0' }]);
    assert.equal(value['iobroker.js-controller@7.2.2']['@alcalzone/esbuild-register'].esbuild, '0.28.2');
    assert.equal(value['oauth2-server'], 'npm:@node-oauth/oauth2-server@5.3.0');
});
test('conflicting component override fails before npm is invoked', () => {
    assert.throws(() => mergeOverrides([policy.reviewedOverrides(), { 'iobroker.js-controller@7.2.2': { '@alcalzone/esbuild-register': { esbuild: '0.11.23' } } }]), /BUILD_OVERRIDE_CONFLICT/);
});
test('actual resolution, approved identities and lock binding all verified', t => {
    const x = fixture(t); const result = policy.verifyInstalledTree(x.app);
    assert.equal(result.esbuild, '0.28.2'); assert.equal(result.loader, '2.5.1-1'); assert.equal(result.controller, '7.2.2');
    assert.equal(result.inspectedEsbuildInstances.length, 1); assert.match(result.packageLockSha256, /^[a-f0-9]{64}$/);
});
test('missing root override rejected even when tree happens to contain fixed esbuild', t => {
    const x = fixture(t); delete x.pkg.overrides; x.write('package.json', x.pkg);
    assert.throws(() => policy.verifyInstalledTree(x.app), /DEPENDENCY_POLICY_ROOT_OVERRIDE/);
});
test('unreviewed controller or loader versions fail closed', t => {
    const x = fixture(t); x.write('node_modules/@alcalzone/esbuild-register/package.json', { name: '@alcalzone/esbuild-register', version: '2.5.2', main: 'main.js' });
    assert.throws(() => policy.verifyInstalledTree(x.app), /DEPENDENCY_POLICY_UNREVIEWED_VERSION/);
});
test('old esbuild reached by actual loader cannot hide behind approved root declaration', t => {
    const x = fixture(t); x.write('node_modules/esbuild/package.json', { name: 'esbuild', version: '0.11.23', main: 'main.js' });
    assert.throws(() => policy.verifyInstalledTree(x.app), /DEPENDENCY_POLICY_UNREVIEWED_VERSION/);
});
test('installed version differing from lock fails even if version is patched', t => {
    const x = fixture(t); x.lock.packages['node_modules/esbuild'].version = '0.25.12'; x.write('package-lock.json', x.lock);
    assert.throws(() => policy.verifyInstalledTree(x.app), /DEPENDENCY_POLICY_LOCK_IDENTITY/);
});
test('another vulnerable esbuild copy in the installed lock cannot escape leaf verification', t => {
    const x = fixture(t); const relative = 'node_modules/another/node_modules/esbuild';
    x.lock.packages[relative] = { version: '0.24.2' }; x.write('package-lock.json', x.lock);
    x.write(relative + '/package.json', { name: 'esbuild', version: '0.24.2' });
    assert.throws(() => policy.verifyInstalledTree(x.app), /DEPENDENCY_POLICY_AFFECTED_ESBUILD/);
});
test('CJS module-type markers do not mask the actual controller package identity', t => {
    const x = fixture(t); x.write('node_modules/iobroker.js-controller/package.json', { name: 'iobroker.js-controller', version: '7.2.2', main: 'build/cjs/main.js' });
    x.write('node_modules/iobroker.js-controller/build/cjs/package.json', { type: 'commonjs' });
    fs.writeFileSync(path.join(x.app, 'node_modules/iobroker.js-controller/build/cjs/main.js'), 'module.exports = {};');
    assert.equal(policy.verifyInstalledTree(x.app).controller, '7.2.2');
});
test('advisory range distinguishes patched versions and rejects ambiguous prereleases', () => {
    for (const version of ['0.11.23', '0.24.0', '0.24.2']) assert.equal(policy.affected(version), true);
    for (const version of ['0.25.0', '0.25.12', '0.28.2']) assert.equal(policy.affected(version), false);
    for (const version of ['0.28.2-beta', '^0.28.2', undefined]) assert.throws(() => policy.affected(version), /DEPENDENCY_POLICY_UNREVIEWED_VERSION/);
});
