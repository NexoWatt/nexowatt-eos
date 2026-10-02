'use strict';
// Fresh, signed TEST installation only. No migration, network download, shell,
// package installation or runtime-accessible privileged endpoint.
const fs = require('node:fs');
const path = require('node:path');
const { command } = require('./host-preflight.cjs');
const { ACCOUNTS, UNITS, inspectPostgresqlHost } = require('./postgresql-host-preflight.cjs');
const { privateWrite, assertNoSymlinkAncestors, mergeControllerConfig } = require('./install-host.cjs');
const pg = require('../../runtime/postgresql/host.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const SERVICES = ['nexowatt-eos-controller.service', 'nexowatt-eos-initialize.service', 'nexowatt-eos-upload.service',
    'nexowatt-eos-postgresql.service', 'nexowatt-eos-pg-certificates.timer', 'nexowatt-eos-os-updates.timer'];
function installPostgresqlHost(options, dependencies = {}) {
    if (options?.profile !== 'test' || !/^[a-f0-9]{64}$/.test(options.releaseId || '') ||
        !/^[a-f0-9]{64}$/.test(options.publicKeySha256 || '') || options.expectedNodeVersion !== '24.21.0' ||
        !Number.isSafeInteger(options.sequence) || options.sequence < 1) fail('PG_PINNED_TEST_RELEASE_REQUIRED');
    // An initialized PostgreSQL schema is mandatory, including for a test host.
    if (options.start !== true) fail('PG_EXPLICIT_START_REQUIRED');
    const release = `/opt/nexowatt/eos/releases/${options.releaseId}`;
    if (options.releasePath !== release) fail('PG_VERIFIED_STAGED_RELEASE_REQUIRED');
    const root = dependencies.root || '/', at = file => path.join(root, file), file = name => path.join(at(release), name);
    const exec = dependencies.exec || command, uid = dependencies.uid ?? process.getuid?.();
    if (uid !== 0) fail('PG_ROOT_OPERATOR_REQUIRED');
    const report = (dependencies.preflight || inspectPostgresqlHost)({ root, exec, uid,
        expectedNodeVersion: options.expectedNodeVersion, platform: options.platform });
    if (!report.ready) fail('PG_HOST_PREFLIGHT_REJECTED');
    if (!dependencies.skipOwnershipFixture) {
        for (const name of [release, '/etc/nexowatt-eos', '/var/lib/nexowatt-eos', '/var/log/nexowatt-eos',
            '/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates', '/etc/systemd/system']) assertNoSymlinkAncestors(at(name));
    }
    for (const name of ['app/package.json', 'app/node_modules/iobroker.js-controller/controller.js',
        'app/node_modules/iobroker.js-controller/conf/iobroker-dist.json', 'runtime/bootstrap/initialize.cjs',
        'runtime/postgresql/schema.sql', 'runtime/postgresql/host.cjs', 'runtime/postgresql/acceptance.cjs',
        'runtime/release/installed-check.cjs', 'runtime/os-updates/runner.py',
        'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json',
        ...UNITS.map(unit => `system/postgresql-test/systemd/${unit}`)]) {
        const st = fs.lstatSync(file(name));
        if (!st.isFile() || st.isSymbolicLink() || st.uid !== 0 || (st.mode & 0o022)) fail('PG_INVALID_RELEASE_LAYOUT');
    }
    function run(binary, args, opts = {}) {
        const result = exec(binary, args, opts);
        if (result.error || result.status !== 0) fail('PG_HOST_COMMAND_FAILED');
        return result.stdout;
    }
    function mkdir(name, mode) { fs.mkdirSync(at(name), { recursive: true, mode }); fs.chmodSync(at(name), mode); }
    function writable(name, account) { mkdir(name, 0o700); run('/usr/bin/chown', [`${account}:${account}`, at(name)]); }
    function groupReadable(name, account) { run('/usr/bin/chown', [`root:${account}`, at(name)]); fs.chmodSync(at(name), 0o640); }
    let unitsInstalled = false, phase = 'accounts';
    try {
        for (const account of ACCOUNTS) {
            run('/usr/sbin/groupadd', ['--system', account]);
            run('/usr/sbin/useradd', ['--system', '--gid', account, '--home-dir', '/nonexistent', '--no-create-home', '--shell', '/usr/sbin/nologin', account]);
            if (run('/usr/bin/id', ['-Gn', account]).trim() !== account) fail('PG_GROUP_POLICY_REJECTED');
            if (fs.existsSync(at('/usr/bin/sudo'))) {
                const result = exec('/usr/bin/sudo', ['-n', '-l', '-U', account]);
                if (result.status !== 1 || result.error || !/not allowed to run sudo/.test(result.stdout + result.stderr)) fail('PG_SUDO_POLICY_REJECTED');
            }
        }
        phase = 'directories';
        for (const name of ['/etc/nexowatt-eos', '/var/lib/nexowatt-eos', '/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates']) mkdir(name, 0o755);
        mkdir('/var/lib/nexowatt-eos-os-updates/private', 0o711);
        privateWrite(at('/etc/nexowatt-eos/host-inventory.json'), JSON.stringify(report, null, 2) + '\n', 0o644);
        privateWrite(at('/etc/nexowatt-eos-os-updates/policy.json'), fs.readFileSync(file('system/test-base/os-updates/policy.json')), 0o644);
        privateWrite(at('/var/lib/nexowatt-eos-os-updates/status.json'), fs.readFileSync(file('system/test-base/os-updates/initial-status.json')), 0o644);
        for (const name of ['/var/lib/nexowatt-eos/iobroker-data', '/var/lib/nexowatt-eos/home', '/var/log/nexowatt-eos']) writable(name, 'eos-runtime');
        writable(pg.DATA, 'eos-postgres');
        phase = 'certificates';
        (dependencies.provision || pg.provision)({ directory: at(pg.CONFIG) });
        groupReadable(`${pg.CONFIG}/server.key`, 'eos-postgres');
        const fragment = JSON.parse(fs.readFileSync(at(`${pg.CONFIG}/databases.json`), 'utf8'));
        const defaults = JSON.parse(fs.readFileSync(file('app/node_modules/iobroker.js-controller/conf/iobroker-dist.json'), 'utf8'));
        privateWrite(at('/etc/nexowatt-eos/iobroker.json'), JSON.stringify(mergeControllerConfig(defaults, fragment), null, 2) + '\n');
        groupReadable('/etc/nexowatt-eos/iobroker.json', 'eos-runtime');
        privateWrite(at('/var/lib/nexowatt-eos/iobroker-data/iobroker.json'), '', 0o600);
        phase = 'initdb';
        run('/usr/sbin/runuser', ['-u', 'eos-postgres', '--', '/usr/lib/postgresql/17/bin/initdb', '-D', pg.DATA,
            '--username=eos_bootstrap', '--auth-local=peer', '--auth-host=reject', '--encoding=UTF8', '--locale=C.UTF-8', '--data-checksums', '--no-instructions'], { timeout: 60000 });
        phase = 'release-state';
        privateWrite(at('/etc/nexowatt-eos/release-state.json'), JSON.stringify({ schemaVersion: 1, releaseId: options.releaseId,
            sequence: options.sequence, nodeVersion: options.expectedNodeVersion, publicKeySha256: options.publicKeySha256, profile: 'test' }) + '\n', 0o644);
        const fd = fs.openSync(at('/etc/nexowatt-eos'), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        phase = 'units';
        // Set before the first unit write so partial unit creation is cleaned up.
        unitsInstalled = true;
        for (const unit of UNITS) privateWrite(at(`/etc/systemd/system/${unit}`), fs.readFileSync(file(`system/postgresql-test/systemd/${unit}`)), 0o644);
        fs.symlinkSync(release, at('/opt/nexowatt/eos/current'));
        run('/usr/bin/systemctl', ['daemon-reload']);
        run('/usr/bin/systemctl', ['start', 'nexowatt-eos-postgresql.service'], { timeout: 45000 });
        phase = 'schema';
        const sql = args => run('/usr/sbin/runuser', ['-u', 'eos-postgres', '--', '/usr/lib/postgresql/17/bin/psql',
            '-X', '-w', '--set=ON_ERROR_STOP=1', '-h', pg.SOCKET, '-p', String(pg.PORT), '-U', 'eos_bootstrap', ...args], { timeout: 30000 });
        sql(['-d', 'postgres', '-c', 'CREATE DATABASE eos TEMPLATE template0;']);
        sql(['-d', 'eos', '-f', `${release}/runtime/postgresql/schema.sql`]);
        sql(['-d', 'postgres', '-c', 'REVOKE ALL ON DATABASE eos FROM PUBLIC; GRANT CONNECT ON DATABASE eos TO eos_objects,eos_states;']);
        phase = 'live-database-gate';
        const result = exec('/usr/bin/node', [file('runtime/postgresql/acceptance.cjs'), '--config', at('/etc/nexowatt-eos/iobroker.json'),
            '--app', file('app')], { timeout: 60000 });
        let acceptance;
        try { acceptance = JSON.parse(result.stdout); } catch { fail('PG_LIVE_DATABASE_GATE_FAILED'); }
        if (acceptance.kind !== 'eos-postgresql-target-acceptance' || typeof acceptance.passed !== 'boolean') fail('PG_LIVE_DATABASE_GATE_FAILED');
        // Keep failed, sanitized checks as well. Absence of a report is not pass.
        privateWrite(at('/etc/nexowatt-eos/postgresql-acceptance.json'), JSON.stringify(acceptance, null, 2) + '\n', 0o644);
        if (result.error || result.status !== 0 || acceptance.passed !== true) fail('PG_LIVE_DATABASE_GATE_FAILED');
        phase = 'controller';
        run('/usr/bin/systemctl', ['start', 'nexowatt-eos-initialize.service'], { timeout: 150000 });
        if (run('/usr/bin/systemctl', ['show', 'nexowatt-eos-initialize.service', '--property=Result', '--value']).trim() !== 'success') fail('PG_INITIALIZATION_FAILED');
        privateWrite(at('/var/lib/nexowatt-eos/.initialized'), JSON.stringify({ releaseId: options.releaseId, profile: 'test', at: new Date().toISOString() }) + '\n', 0o644);
        run('/usr/bin/systemctl', ['enable', '--now', 'nexowatt-eos.target'], { timeout: 90000 });
        run('/usr/bin/systemctl', ['is-active', '--quiet', 'nexowatt-eos-controller.service', 'nexowatt-eos-postgresql.service']);
        run('/usr/bin/systemctl', ['enable', '--now', 'nexowatt-eos-pg-certificates.timer', 'nexowatt-eos-os-updates.timer']);
        const status = { schemaVersion: 1, kind: 'eos-test-host-installation', backend: 'postgresql', releaseId: options.releaseId,
            phase: 'TEST_SERVICES_STARTED', liveDatabaseAcceptance: true, releaseApproved: false, adapterIsolation: false,
            adapterActivation: 'disabled-until-approved-enrollment', hardwareAcceptance: false, automaticCertificateRotation: false };
        privateWrite(at('/etc/nexowatt-eos/install-status.json'), JSON.stringify(status, null, 2) + '\n', 0o644);
        return status;
    } catch (error) {
        if (unitsInstalled) {
            // Never kill an APT/dpkg transaction. Disable its future scheduling.
            const disabled = exec('/usr/bin/systemctl', ['disable', 'nexowatt-eos.target', 'nexowatt-eos-pg-certificates.timer', 'nexowatt-eos-os-updates.timer']);
            const stopped = exec('/usr/bin/systemctl', ['stop', 'nexowatt-eos.target', ...SERVICES], { timeout: 90000 });
            if (disabled.status !== 0 || disabled.error || stopped.status !== 0 || stopped.error) {
                error.code = 'PG_CLEANUP_INCOMPLETE'; error.message = error.code;
            }
        }
        error.phase = phase;
        // Retain accounts, data and signed evidence for diagnosis; never erase.
        throw error;
    }
}
module.exports = { installPostgresqlHost, SERVICES };
