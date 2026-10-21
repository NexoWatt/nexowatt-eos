'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const policy = require('../../tools/integration/runtime-dependency-policy.cjs');
function fixture(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos725-dependencies-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    const write = (relative, value) => { const file = path.join(app, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); };
    const lock = { lockfileVersion: 3, packages: { '': {} } };
    function add(name, version, prefix = '') {
        const relative = prefix + 'node_modules/' + name;
        write(relative + '/package.json', { name, version, main: 'main.js' });
        fs.writeFileSync(path.join(app, relative, 'main.js'), 'module.exports = {};');
        lock.packages[relative] = { version, integrity: 'sha512-Zml4dHVyZQ==' };
        write('package-lock.json', lock);
    }
    for (const [name, version] of [['iobroker.js-controller', '7.2.5'], ['@alcalzone/esbuild-register', '2.5.1-1'], ['esbuild', '0.28.2'],
        ['@iobroker/socket-classes', '2.10.0'], ['@iobroker/webserver', '3.3.1'], ['@iobroker/adapter-core', '3.4.3'],
        ['@iobroker/ws-server', '4.5.2'], ['@iobroker/js-controller-adapter', '7.2.5'], ['follow-redirects', '1.16.1']]) add(name, version);
    write('package.json', { name: 'fixture', private: true, overrides: policy.reviewedOverrides('7.2.5') });
    return { app, add, verify: () => policy.verifyInstalledTree(app, { controllerVersion: '7.2.5' }) };
}
test('fresh policy authenticates real installed identities and records exact reviewed socket dependencies', t => {
    const f = fixture(t), result = f.verify();
    assert.equal(result.controller, '7.2.5');
    assert.equal(result.refreshedInstances.find(row => row.name === '@iobroker/socket-classes').version, '2.10.0');
    assert.throws(() => policy.verifyInstalledTree(f.app), /DEPENDENCY_POLICY_ROOT_OVERRIDE/);
});
for (const [name, version] of [['@iobroker/socket-classes', '2.10.1'], ['@iobroker/js-controller-adapter', '8.0.0'],
    ['@iobroker/db-objects-redis', '7.2.2'], ['follow-redirects', '1.15.11']])
    test(`unreviewed or vulnerable nested ${name}@${version} cannot hide behind the root tree`, t => {
        const f = fixture(t); f.add(name, version, 'node_modules/another/');
        assert.throws(f.verify, /DEPENDENCY_POLICY_REFRESH_PIN/);
    });

for (const name of ['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/js-controller-common-db', '@iobroker/js-controller-adapter', '@iobroker/ws-server'])
    test(`same-version nested ${name} cannot bypass the transformed canonical package`, t => {
        const f = fixture(t); f.add(name, name === '@iobroker/ws-server' ? '4.5.2' : '7.2.5', 'node_modules/another/');
        assert.throws(f.verify, /DEPENDENCY_POLICY_UNTRANSFORMED_COPY/);
    });
