'use strict';
// Cross-file contract for the native laboratory's protected configuration.
// Static fixture checks complement, and never replace, the unprivileged native
// CLI/start/restart run that performs the actual filesystem operations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateConnection } = require('../../runtime/postgresql/packages/store/index.cjs');
const read = name => fs.readFileSync(path.resolve(__dirname, '../..', name), 'utf8');

test('native controller fixture models the product initialize service read-only configuration', () => {
    const unit = read('system/postgresql-test/systemd/nexowatt-eos-initialize.service');
    assert.match(unit, /^BindReadOnlyPaths=\/etc\/nexowatt-eos\/iobroker\.json:\/var\/lib\/nexowatt-eos\/iobroker-data\/iobroker\.json$/m);
    const harness = read('tests/postgresql/controller.integration.cjs');
    const creation = harness.indexOf('fs.writeFileSync(configFile, configBytes, { mode: 0o400, flag: \'wx\' })');
    const denial = harness.indexOf('fs.accessSync(configFile, fs.constants.W_OK)');
    const setup = harness.indexOf("await stage('ordinary controller CLI setup");
    assert.ok(creation > 0 && denial > creation && setup > denial);
    const unprivileged = harness.indexOf("assert.notEqual(process.getuid(), 0, 'read-only configuration contract");
    assert.ok(unprivileged > 0 && unprivileged < creation);
    assert.match(harness.slice(denial, setup), /code: 'EACCES'/);
});

test('native setup must preserve exact configuration bytes and revalidate before startup', () => {
    const harness = read('tests/postgresql/controller.integration.cjs');
    const setup = harness.indexOf("await stage('ordinary controller CLI setup");
    const startup = harness.indexOf('const boot = async () =>');
    assert.ok(setup > 0 && startup > setup);
    const between = harness.slice(setup, startup);
    assert.match(between, /Could not update ioBroker configuration: EACCES/);
    assert.match(between, /fs\.readFileSync\(configFile\)\.equals\(configBytes\)/);
    assert.match(between, /validateExperimentalProfile\(JSON\.parse\(fs\.readFileSync\(configFile\)\), validateConnection\)/);
    assert.doesNotMatch(between, /(?:writeFileSync|copyFileSync|renameSync)\(configFile/);
});

test('Redis CLI retry options remain forbidden in the PostgreSQL runtime validator', () => {
    for (const domain of ['objects', 'states']) {
        const connection = { host: 'localhost', database: 'eos_lab', user: `eos_${domain}`, options: { ssl: { ca: 'fixture', cert: 'fixture', key: 'fixture' } } };
        validateConnection(connection, domain);
        connection.options.retry_max_delay = 5000;
        assert.throws(() => validateConnection(connection, domain), { code: 'EOS_PG_CONFIG' });
    }
});
