'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readPinnedApp, waitController } = require('../../runtime/bootstrap/initialize.cjs');
const { validateProfile } = require('../../runtime/controller-profile/profile-validation.cjs');
const legacy = require('../../runtime/controller-profile/guard.cjs');
const dependencies = require('../../tools/integration/runtime-dependency-policy.cjs');
const profile = version => ({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: version, adapters: [] });
test('only separately reviewed 7.2.2 and 7.2.5 profiles are admitted; legacy helper remains strict', () => {
    for (const version of ['7.2.2', '7.2.5']) assert.equal(validateProfile(profile(version)).controllerVersion, version);
    for (const version of ['7.2.3', '7.2.6', '8.0.0', '8.0.0-alpha.8', '^7.2.5'])
        assert.throws(() => validateProfile(profile(version)), /EOS_PROFILE_FORMAT/);
    assert.throws(() => legacy.validateProfile(profile('7.2.5')), /EOS_PROFILE_FORMAT/);
    assert.equal(dependencies.reviewedOverrides('7.2.5')['iobroker.js-controller@7.2.5']['@alcalzone/esbuild-register'].esbuild, '0.28.2');
    assert.throws(() => dependencies.reviewedOverrides('8.0.0'), /DEPENDENCY_POLICY_UNREVIEWED_VERSION/);
});
test('bootstrap binds exact root, lock, installed controller and immutable profile versions', t => {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos725-bootstrap-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    const controller = path.join(app, 'node_modules/iobroker.js-controller'); fs.mkdirSync(controller, { recursive: true });
    const write = (file, data) => fs.writeFileSync(path.join(app, file), JSON.stringify(data));
    for (const version of ['7.2.2', '7.2.5']) {
        write('package.json', { dependencies: { 'iobroker.js-controller': version } });
        write('package-lock.json', { packages: { 'node_modules/iobroker.js-controller': { version } } });
        write('node_modules/iobroker.js-controller/package.json', { name: 'iobroker.js-controller', version });
        write('node_modules/iobroker.js-controller/io-package.json', { objects: [{ _id: 'system.config' }] });
        write('node_modules/iobroker.js-controller/eos-test-profile.json', profile(version));
        assert.equal(readPinnedApp(app).controllerVersion, version);
        write('node_modules/iobroker.js-controller/eos-test-profile.json', profile(version === '7.2.5' ? '7.2.2' : '7.2.5'));
        assert.throws(() => readPinnedApp(app), /CONTROLLER_PROFILE_REQUIRED/);
    }
    write('node_modules/iobroker.js-controller/package.json', { version: '8.0.0' });
    assert.throws(() => readPinnedApp(app), /CONTROLLER_VERSION_MISMATCH/);
});
test('readiness checks selected 7.2.5 heartbeat and cannot accept a different controller major', async () => {
    const config = { system: { hostname: 'contract' } };
    const context = { config, controllerPid: 1234, controllerVersion: '7.2.5', timeoutMs: 5, pollMs: 1,
        states: { getState: async id => id.endsWith('.alive') ? { val: true, ack: true, ts: Date.now() } : { val: 1234, ack: true } },
        objects: { getObjectAsync: async () => ({ type: 'host', common: { installedVersion: '7.2.5' } }) } };
    assert.equal((await waitController(context)).controllerVersion, '7.2.5');
    await assert.rejects(waitController({ ...context, controllerVersion: '8.0.0' }), /INVALID_READINESS_OPTIONS/);
    await assert.rejects(waitController({ ...context, controllerVersion: '7.2.2' }), /CONTROLLER_NOT_READY/);
});
