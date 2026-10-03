'use strict';
// Cross-file contracts execute the real CLI parser with substituted file/server
// effects. They do not claim systemd, Linux UID, host installation or hardware QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '../..');
const unit = name => fs.readFileSync(path.join(root, 'system/postgresql-test/systemd', name), 'utf8');
test('shipped setup unit arguments execute the real setup main parser', async () => {
    const exec = unit('nexowatt-eos-setup.service').split(/\r?\n/).find(line => line.startsWith('ExecStart='));
    assert.ok(exec); const tokens = exec.slice('ExecStart='.length).split(' ');
    assert.deepEqual(tokens.slice(0, 2), ['/usr/bin/node', '/opt/nexowatt/eos/current/runtime/onboarding/main.cjs']);
    const config = { schemaVersion: 2, origin: 'https://eos.local:8443', bind: '0.0.0.0', port: 8443,
        stateDirectory: '/var/lib/nexowatt-eos/onboarding', completionFile: '/etc/nexowatt-eos/first-start-complete.json',
        license: { uuid: '12345678-1234-1234-1234-123456789abc', trustFile: '/etc/nexowatt-eos/license-trust.json' },
        releaseId: '1'.repeat(64), tls: { certificatePath: '/etc/nexowatt-eos/web/setup.crt', privateKeyPath: '/etc/nexowatt-eos/web/setup.key', caPath: '/etc/nexowatt-eos/web/ca.crt' } };
    const observed = []; const module = { exports: {} };
    const signals = new EventEmitter(); signals.argv = [];
    const fakeRequire = name => {
        if (name === 'node:fs') return { existsSync: () => false };
        if (name === 'node:path') return path;
        if (name === './server.cjs') return { createSetupServer: options => ({ on() {}, listen(port, bind) { observed.push({ options, port, bind }); } }) };
        if (name === './policy.cjs') return require('../../runtime/onboarding/policy.cjs');
        if (name === '../release/installed-check.cjs') return { rootOwned() {} };
        if (name === '../bootstrap/first-start-configuration.cjs') return { loadInstalledLicense: async () => ({ core: {}, publicKeys: {} }) };
        if (name === './cleanup.cjs') return { cleanupCompleted() {} };
        if (name === '../release/bundle.cjs') return { readFileLimited: file => ({ bytes: file.endsWith('onboarding.json') ? Buffer.from(JSON.stringify(config)) : Buffer.from('public-fixture') }) };
        throw new Error('unexpected dependency');
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'runtime/onboarding/main.cjs'), 'utf8'), {
        module, require: fakeRequire, Buffer, process: signals, __dirname: path.join(root, 'runtime/onboarding'),
    });
    await module.exports.main(tokens.slice(2));
    assert.equal(observed.length, 1); assert.equal(observed[0].port, 8443); assert.equal(observed[0].bind, '0.0.0.0');
    assert.equal(observed[0].options.stateDirectory, config.stateDirectory);
    assert.equal(observed[0].options.licenseContext.uuid, config.license.uuid);
    await assert.rejects(module.exports.main([]), /SETUP_USAGE/);
});
test('setup has its own unprivileged identity and no writable runtime or database access', () => {
    const setup = unit('nexowatt-eos-setup.service');
    for (const line of ['User=eos-setup', 'Group=eos-setup', 'NoNewPrivileges=yes', 'CapabilityBoundingSet=',
        'ReadWritePaths=/var/lib/nexowatt-eos/onboarding', 'ProtectSystem=strict', 'LimitCORE=0']) assert.ok(setup.split(/\r?\n/).includes(line), line);
    const inaccessible = setup.split(/\r?\n/).find(line => line.startsWith('InaccessiblePaths='));
    for (const target of ['/etc/nexowatt-eos/iobroker.json', '/etc/nexowatt-eos/web/authority', '/etc/nexowatt-eos/web/admin.key',
        '/etc/nexowatt-eos/web/ui.key', '/var/lib/nexowatt-eos/iobroker-data', '/etc/nexowatt-eos/postgresql']) assert.ok(inaccessible.includes(target), target);
    assert.doesNotMatch(setup, /SupplementaryGroups=|CAP_DAC|CAP_SYS/);
});
test('boot transition uses installable target and finalizer is an argument-free fixed root entry', () => {
    const finalizer = fs.readFileSync(path.join(root, 'tools/system/finalize-onboarding.cjs'), 'utf8');
    const installed = unit('nexowatt-eos.target');
    assert.match(installed, /\[Install\]\s+WantedBy=multi-user.target/);
    assert.match(finalizer, /command\(\['enable', 'nexowatt-eos.target'\]\)/);
    assert.match(finalizer, /command\(\['disable', 'nexowatt-eos-setup.target'\]\)/);
    assert.doesNotMatch(finalizer, /\['disable', '--now', 'nexowatt-eos-setup.target'\]/);
    const service = unit('nexowatt-eos-setup-finalize.service');
    assert.match(service, /^User=root$/m);
    assert.match(service, /^ExecStart=\/usr\/bin\/node \/opt\/nexowatt\/eos\/current\/tools\/system\/finalize-onboarding.cjs$/m);
    assert.match(service, /^CapabilityBoundingSet=CAP_DAC_READ_SEARCH$/m);
    assert.match(service, /^ConditionPathExists=!\/etc\/nexowatt-eos\/first-start-complete.json$/m);
});
