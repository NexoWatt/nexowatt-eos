'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { sudoListingDeniesAll, UNITS: REDIS_UNITS } = require('../../tools/system/install-host.cjs');
const { UNITS: PG_UNITS } = require('../../tools/system/postgresql-host-preflight.cjs');

const REPO = path.resolve(__dirname, '../..');
const denial = account => ({ status: 0, stdout: `User ${account} is not allowed to run sudo on NexoWatt.\n`, stderr: '', error: null });
const forbidden = [
    ['failed list', { ...denial('eos-runtime'), status: 1 }],
    ['timeout', { ...denial('eos-runtime'), status: null, error: 'ETIMEDOUT' }],
    ['truncated response', { ...denial('eos-runtime'), error: 'ENOBUFS' }],
    ['password required', { status: 1, stdout: '', stderr: 'sudo: a password is required\n' }],
    ['policy warning despite denial', { ...denial('eos-runtime'), stderr: 'sudo: /etc/sudoers.d/custom: syntax error\n' }],
    ['host lookup warning', { ...denial('eos-runtime'), stderr: 'sudo: unable to resolve host NexoWatt\n' }],
    ['granted root command', { status: 0, stdout: 'User eos-runtime may run the following commands on NexoWatt:\n    (ALL : ALL) ALL\n', stderr: '' }],
    ['granted unprivileged command', { status: 0, stdout: 'User eos-runtime may run the following commands on NexoWatt:\n    (nobody) /usr/bin/true\n', stderr: '' }],
    ['different account', denial('eos-postgres')],
    ['appended commands', { ...denial('eos-runtime'), stdout: denial('eos-runtime').stdout + '    (ALL) ALL\n' }],
    ['prefixed custom text', { ...denial('eos-runtime'), stdout: 'custom policy result\n' + denial('eos-runtime').stdout }],
    ['duplicated denial', { ...denial('eos-runtime'), stdout: denial('eos-runtime').stdout.repeat(2) }],
    ['extra blank line', { ...denial('eos-runtime'), stdout: denial('eos-runtime').stdout + '\n' }],
    ['denial on stderr', { status: 0, stdout: '', stderr: denial('eos-runtime').stdout }],
    ['localized response', { status: 0, stdout: 'Benutzer eos-runtime darf sudo auf NexoWatt nicht ausfuehren.\n', stderr: '' }],
    ['empty success', { status: 0, stdout: '', stderr: '' }],
];

test('successful root sudo listing with no privileges is accepted for each EOS account', () => {
    // Upstream sudo 1.9.16p2 display_privs() prints this message and returns
    // true even for zero matching privileges; policy_list() exits with 0.
    // This fixture does not execute native sudo or inspect a real sudoers file.
    for (const account of ['eos-runtime', 'eos-postgres', 'eos-setup', 'eos-redis-objects', 'eos-redis-states']) {
        assert.equal(sudoListingDeniesAll(denial(account), account), true);
    }
    const fqdn = { ...denial('eos-runtime'), stdout: 'User eos-runtime is not allowed to run sudo on eos-test.example.local.\n' };
    assert.equal(sudoListingDeniesAll(fqdn, 'eos-runtime'), true);
});

for (const [name, result] of forbidden) test(`sudo listing rejects ${name}`, () => {
    assert.equal(sudoListingDeniesAll(result, 'eos-runtime'), false);
});

test('missing or malformed subprocess fields never establish absent privileges', () => {
    for (const result of [null, undefined, {}, { ...denial('eos-runtime'), status: '0' },
        { ...denial('eos-runtime'), stdout: null }, { ...denial('eos-runtime'), stderr: undefined },
        { ...denial('eos-runtime'), stderr: ' ' }, { ...denial('eos-runtime'), stdout: denial('eos-runtime').stdout.slice(0, -1) }]) {
        assert.equal(sudoListingDeniesAll(result, 'eos-runtime'), false);
    }
    assert.equal(sudoListingDeniesAll(denial('eos-runtime'), 'eos-runtime.*'), false);
});

function installerFixture(t, kind, queryResult = denial) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-sudo-policy-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: false }));
    const at = name => path.join(root, name), releaseId = 'a'.repeat(64);
    const releasePath = `/opt/nexowatt/eos/releases/${releaseId}`;
    const write = name => { fs.mkdirSync(path.dirname(at(name)), { recursive: true }); fs.writeFileSync(at(name), '{}'); };
    const files = ['app/package.json', 'app/node_modules/iobroker.js-controller/controller.js',
        'app/node_modules/iobroker.js-controller/iobroker.js', 'app/node_modules/iobroker.js-controller/conf/iobroker-dist.json',
        'runtime/bootstrap/initialize.cjs', 'runtime/release/installed-check.cjs', 'runtime/os-updates/runner.py',
        'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json'];
    if (kind === 'postgresql') files.push('runtime/postgresql/schema.sql', 'runtime/postgresql/host.cjs',
        'runtime/postgresql/acceptance.cjs', 'runtime/onboarding/main.cjs', 'runtime/onboarding/state.cjs',
        'runtime/onboarding/server.cjs', 'runtime/onboarding/policy.cjs', 'runtime/bootstrap/first-start-configuration.cjs',
        'tools/system/finalize-onboarding.cjs', 'tools/system/prepare-first-start-context.cjs',
        ...PG_UNITS.map(unit => `system/postgresql-test/systemd/${unit}`));
    else files.push('runtime/transport/redis-tls.cjs', ...REDIS_UNITS.map(unit => `system/test-base/systemd/${unit}`));
    for (const file of files) write(`${releasePath}/${file}`);
    write('/usr/bin/sudo'); // Exercise the real existsSync guarded sudo branch.
    const calls = [], sourcePath = path.join(REPO, 'tools/system', kind === 'postgresql' ? 'install-postgresql-host.cjs' : 'install-host.cjs');
    const sourceRequire = createRequire(sourcePath), fixtureModule = { exports: {} };
    // Windows cannot prove POSIX file ownership or mode bits. Model only the
    // reviewed root-owned release-file metadata, then execute the actual
    // installer source and account/sudo decisions. Directory creation is a
    // sentinel boundary: no provisioning, OS account or command is executed.
    const fixtureFs = { ...fs,
        lstatSync(file) {
            const stat = fs.lstatSync(file);
            if (!String(file).startsWith(at(releasePath) + path.sep)) return stat;
            return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, { uid: 0, mode: 0o100644 });
        },
        mkdirSync() { throw Object.assign(new Error('FIXTURE_DIRECTORY_BOUNDARY'), { code: 'FIXTURE_DIRECTORY_BOUNDARY' }); },
    };
    const fixtureRequire = name => name === 'node:fs' ? fixtureFs : sourceRequire(name);
    vm.runInThisContext(`(function(require,module){${fs.readFileSync(sourcePath, 'utf8')}\n})`,
        { filename: `${kind}-sudo-installer-command-fixture.cjs` })(fixtureRequire, fixtureModule);
    const exec = (file, args) => {
        calls.push({ file, args });
        if (file === '/usr/bin/sudo') return queryResult(args.at(-1));
        return { status: 0, stdout: file === '/usr/bin/id' ? args.at(-1) + '\n' : '', stderr: '', error: null };
    };
    const options = { profile: 'test', releaseId, releasePath, start: true, expectedNodeVersion: '24.21.0',
        publicKeySha256: 'b'.repeat(64), sequence: 6, platform: 'arm64', releaseVersion: '0.2.0-test.3',
        setup: { schemaVersion: 1, hosts: ['eos.local'], origin: 'https://eos.local:8443',
            licenseTrustFile: path.join(root, 'public-trust.json'), licenseTrustSha256: 'c'.repeat(64), trust: {}, trustSha256: 'c'.repeat(64) } };
    const dependencies = { root, uid: 0, exec, skipOwnershipFixture: true, preflight: () => ({ ready: true }), inspectProduct: () => [] };
    const install = kind === 'postgresql' ? fixtureModule.exports.installPostgresqlHost : fixtureModule.exports.installHost;
    return { calls, at, run: () => install(options, dependencies) };
}

for (const kind of ['postgresql', 'redis']) {
    test(`${kind} installer reaches directories only after every real account sudo branch passes`, t => {
        const f = installerFixture(t, kind);
        assert.throws(f.run, error => error.code === 'FIXTURE_DIRECTORY_BOUNDARY' && error.phase === 'directories');
        const accounts = kind === 'postgresql' ? ['eos-runtime', 'eos-postgres', 'eos-setup'] : ['eos-runtime', 'eos-redis-objects', 'eos-redis-states'];
        assert.deepEqual(f.calls.filter(call => call.file === '/usr/bin/sudo').map(call => call.args),
            accounts.map(account => ['-n', '-l', '-U', account]));
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
    });
    for (const [name, result] of forbidden) test(`${kind} installer stops at accounts for ${name}`, t => {
        const f = installerFixture(t, kind, () => result);
        assert.throws(f.run, error => error.code === (kind === 'postgresql' ? 'PG_SUDO_POLICY_REJECTED' : 'RUNTIME_SUDO_POLICY_REJECTED') && error.phase === 'accounts');
        assert.equal(f.calls.filter(call => call.file === '/usr/bin/sudo').length, 1);
        assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
        assert.equal(f.calls.some(call => /chown|systemctl|runuser|userdel|groupdel/.test(call.file)), false);
    });
}

test('full-product PostgreSQL installer also checks the final eos-setup account', t => {
    const f = installerFixture(t, 'postgresql', account => account === 'eos-setup'
        ? { status: 0, stdout: 'User eos-setup may run the following commands on NexoWatt:\n    (ALL) ALL\n', stderr: '' }
        : denial(account));
    assert.throws(f.run, error => error.code === 'PG_SUDO_POLICY_REJECTED' && error.phase === 'accounts');
    assert.deepEqual(f.calls.filter(call => call.file === '/usr/bin/sudo').map(call => call.args.at(-1)), ['eos-runtime', 'eos-postgres', 'eos-setup']);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
});
