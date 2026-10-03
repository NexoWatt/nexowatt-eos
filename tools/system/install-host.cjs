'use strict';
/**
 * Privileged fresh-test-host installer. The signed bundle verifier MUST precede
 * this function. It never downloads packages or runs npm lifecycle scripts.
 * CLI intentionally absent: runtime adapters cannot invoke a privileged helper.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ACCOUNTS, command, inspectHost } = require('./host-preflight.cjs');
const UNITS = ['nexowatt-eos.target', 'nexowatt-eos-controller.service', 'nexowatt-eos-initialize.service', 'nexowatt-eos-redis@.service',
    'nexowatt-eos-upload.service', 'nexowatt-eos-certificates.service', 'nexowatt-eos-certificates.timer',
    'nexowatt-eos-os-updates.service', 'nexowatt-eos-os-updates.timer'];
const SERVICES = ['nexowatt-eos-controller.service', 'nexowatt-eos-initialize.service', 'nexowatt-eos-redis@objects.service', 'nexowatt-eos-redis@states.service',
    'nexowatt-eos-upload.service', 'nexowatt-eos-certificates.service', 'nexowatt-eos-certificates.timer', 'nexowatt-eos-os-updates.timer'];
function reject(code) { const e = new Error(code); e.code = code; throw e; }
function sudoListingDeniesAll(result, account) {
    // A root `sudo -n -l -U USER` query succeeds (exit 0) even when USER has
    // no privileges. Exit 1 is a failed query, not proof of absent rights.
    // command() fixes the C locale. Accept only its complete denial line for
    // this account; warnings, extra output and every command listing fail closed.
    if (!result || result.status !== 0 || result.error || result.stderr !== '' ||
        typeof result.stdout !== 'string' || typeof account !== 'string') return false;
    const match = /^User (eos-[a-z-]+) is not allowed to run sudo on ([A-Za-z0-9][A-Za-z0-9_.-]{0,252})\.\n$/.exec(result.stdout);
    return Boolean(match && match[0] === result.stdout && match[1] === account);
}
function privateWrite(file, content, mode = 0o640) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
    try { fs.writeFileSync(fd, content); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function assertNoSymlinkAncestors(file) {
    let cursor = path.resolve(file);
    while (true) {
        try {
            const st = fs.lstatSync(cursor);
            if (st.isSymbolicLink() || (st.mode & 0o022) !== 0 || st.uid !== 0) reject('UNTRUSTED_INSTALL_PARENT');
        } catch (e) { if (e.code !== 'ENOENT') throw e; }
        if (cursor === path.dirname(cursor)) break;
        cursor = path.dirname(cursor);
    }
}
function mergeControllerConfig(distributionConfig, databases, hostname = os.hostname().split('.')[0]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(hostname)) reject('INVALID_HOSTNAME');
    if (!distributionConfig || typeof distributionConfig !== 'object' || Array.isArray(distributionConfig) ||
        !databases?.objects || !databases?.states) reject('INVALID_CONTROLLER_DEFAULTS');
    const config = structuredClone(distributionConfig);
    config.system = { ...config.system, compact: false, allowShellCommands: false, hostname, instanceStartInterval: 2000 };
    config.multihostService = { enabled: false, secure: true, persist: false };
    config.objects = structuredClone(databases.objects);
    config.states = structuredClone(databases.states);
    config.dataDir = '/var/lib/nexowatt-eos/iobroker-data';
    config.plugins = { sentry: { enabled: false } };
    config.log = { level: 'info', maxDays: 7, noStdout: false, transport: {
        file1: { type: 'file', enabled: true, filename: '/var/log/nexowatt-eos/iobroker', fileext: '.log', maxSize: 10485760, maxFiles: 7 } } };
    return config;
}
function installHost(options, dependencies = {}) {
    if (!options || options.profile !== 'test' || !/^[a-f0-9]{64}$/.test(options.releaseId || '')) reject('TEST_PROFILE_AND_RELEASE_REQUIRED');
    if (typeof options.start !== 'boolean') reject('EXPLICIT_START_FLAG_REQUIRED');
    if (typeof options.publicKeySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(options.publicKeySha256) ||
        !Number.isSafeInteger(options.sequence) || options.sequence < 1 || typeof options.expectedNodeVersion !== 'string' ||
        !/^\d+\.\d+\.\d+$/.test(options.expectedNodeVersion)) reject('PINNED_RELEASE_STATE_REQUIRED');
    const root = dependencies.root || '/'; // Fixture-only dependency; not exposed through the CLI.
    const at = p => path.join(root, p);
    const exec = dependencies.exec || command;
    const writePrivate = dependencies.privateWrite || privateWrite;
    const preflight = dependencies.preflight || inspectHost;
    const uid = dependencies.uid ?? process.getuid?.();
    const installedRelease = `/opt/nexowatt/eos/releases/${options.releaseId}`;
    if (options.releasePath !== installedRelease) reject('VERIFIED_STAGED_RELEASE_REQUIRED');
    if (uid !== 0) reject('ROOT_OPERATOR_REQUIRED');
    const report = preflight({ expectedNodeVersion: options.expectedNodeVersion, platform: options.platform, root, exec, uid,
        webPorts: options.webPorts || [] });
    if (!report.ready) reject('HOST_PREFLIGHT_REJECTED');
    const file = p => path.join(at(installedRelease), p);
    // Reject mutable/symlinked staging roots. Bundle signature/hash/policy checking
    // is owned by the release orchestrator, not bypassed by this installer.
    if (!dependencies.skipOwnershipFixture) {
        for (const p of [installedRelease, '/etc/nexowatt-eos', '/var/lib/nexowatt-eos', '/var/log/nexowatt-eos',
            '/etc/nexowatt-eos-os-updates', '/var/lib/nexowatt-eos-os-updates', '/etc/systemd/system']) assertNoSymlinkAncestors(at(p));
    }
    for (const p of ['app/package.json', 'app/node_modules/iobroker.js-controller/controller.js',
        'app/node_modules/iobroker.js-controller/iobroker.js', 'app/node_modules/iobroker.js-controller/conf/iobroker-dist.json',
        'runtime/transport/redis-tls.cjs', 'runtime/release/installed-check.cjs', 'runtime/os-updates/runner.py',
        'system/test-base/os-updates/policy.json', 'system/test-base/os-updates/initial-status.json', ...UNITS.map(u => `system/test-base/systemd/${u}`)]) {
        const stat = fs.lstatSync(file(p));
        if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o022) !== 0) reject('INVALID_RELEASE_LAYOUT');
    }
    if (options.start && !fs.existsSync(file('runtime/bootstrap/initialize.cjs'))) reject('INITIALIZATION_POLICY_MISSING');
    function run(executable, args, opts = {}) {
        const result = exec(executable, args, opts);
        if (result.status !== 0 || result.error) reject('HOST_COMMAND_FAILED');
        return result.stdout;
    }
    function mkdir(p, mode = 0o750) { fs.mkdirSync(at(p), { recursive: true, mode }); fs.chmodSync(at(p), mode); }
    function own(p, account, mode) { run('/usr/bin/chown', [`root:${account}`, at(p)]); fs.chmodSync(at(p), mode); }
    function writable(p, account, mode = 0o700) { mkdir(p, mode); run('/usr/bin/chown', [`${account}:${account}`, at(p)]); }
    let unitsInstalled = false;
    let currentCreated = false;
    let phase = 'accounts';
    try {
        for (const name of ACCOUNTS) {
            run('/usr/sbin/groupadd', ['--system', name]);
            run('/usr/sbin/useradd', ['--system', '--gid', name, '--home-dir', '/nonexistent', '--no-create-home', '--shell', '/usr/sbin/nologin', name]);
        }
        for (const name of ACCOUNTS) {
            if (run('/usr/bin/id', ['-Gn', name]).trim() !== name) reject('RUNTIME_GROUP_POLICY_REJECTED');
            if (fs.existsSync(at('/usr/bin/sudo'))) {
                const sudo = exec('/usr/bin/sudo', ['-n', '-l', '-U', name]);
                if (!sudoListingDeniesAll(sudo, name)) reject('RUNTIME_SUDO_POLICY_REJECTED');
            }
        }
        phase = 'directories';
        mkdir('/etc/nexowatt-eos', 0o755);
        privateWrite(at('/etc/nexowatt-eos/host-inventory.json'), `${JSON.stringify(report, null, 2)}\n`, 0o644);
        mkdir('/var/lib/nexowatt-eos', 0o755);
        // Runtime adapters have no write access to update policy or status.
        // Keep these outside the runtime data tree; only the root updater may
        // replace the public read-only status snapshot. No update runs here.
        mkdir('/etc/nexowatt-eos-os-updates', 0o755);
        mkdir('/var/lib/nexowatt-eos-os-updates', 0o755);
        // APT's unprivileged downloader must traverse to its dedicated partial
        // cache directories. 0711 permits traversal, not listing or writing.
        mkdir('/var/lib/nexowatt-eos-os-updates/private', 0o711);
        privateWrite(at('/etc/nexowatt-eos-os-updates/policy.json'), fs.readFileSync(file('system/test-base/os-updates/policy.json')), 0o644);
        privateWrite(at('/var/lib/nexowatt-eos-os-updates/status.json'), fs.readFileSync(file('system/test-base/os-updates/initial-status.json')), 0o644);
        mkdir('/var/lib/nexowatt-eos/redis', 0o755);
        writable('/var/lib/nexowatt-eos/iobroker-data', 'eos-runtime');
        writable('/var/lib/nexowatt-eos/home', 'eos-runtime');
        writable('/var/log/nexowatt-eos', 'eos-runtime');
        for (const scope of ['objects', 'states']) writable(`/var/lib/nexowatt-eos/redis/${scope}`, `eos-redis-${scope}`);
        phase = 'transport';
        run('/usr/bin/node', [file('runtime/transport/redis-tls.cjs'), 'provision', '--directory', at('/etc/nexowatt-eos/transport'), '--data-directory', at('/var/lib/nexowatt-eos/redis')], { timeout: 60000 });
        for (const p of ['', '/certs', '/redis']) fs.chmodSync(at(`/etc/nexowatt-eos/transport${p}`), 0o755);
        own('/etc/nexowatt-eos/transport/credentials', 'eos-runtime', 0o750);
        own('/etc/nexowatt-eos/transport/credentials/iobroker-databases.json', 'eos-runtime', 0o640);
        fs.chmodSync(at('/etc/nexowatt-eos/transport/certs/ca.crt'), 0o644);
        for (const scope of ['objects', 'states']) {
            own(`/etc/nexowatt-eos/transport/redis/${scope}.conf`, `eos-redis-${scope}`, 0o640);
            own(`/etc/nexowatt-eos/transport/certs/${scope}.key`, `eos-redis-${scope}`, 0o640);
            fs.chmodSync(at(`/etc/nexowatt-eos/transport/certs/${scope}.crt`), 0o644);
        }
        phase = 'configuration';
        const defaults = JSON.parse(fs.readFileSync(file('app/node_modules/iobroker.js-controller/conf/iobroker-dist.json'), 'utf8'));
        const fragment = JSON.parse(fs.readFileSync(at('/etc/nexowatt-eos/transport/credentials/iobroker-databases.json'), 'utf8'));
        const config = mergeControllerConfig(defaults, fragment);
        privateWrite(at('/etc/nexowatt-eos/iobroker.json'), `${JSON.stringify(config, null, 2)}\n`);
        own('/etc/nexowatt-eos/iobroker.json', 'eos-runtime', 0o640);
        // systemd binds the protected config onto this regular file. Never a symlink.
        privateWrite(at('/var/lib/nexowatt-eos/iobroker-data/iobroker.json'), '', 0o600);
        // Commit the external trust binding before any service can be enabled or started.
        phase = 'release-state';
        writePrivate(at('/etc/nexowatt-eos/release-state.json'), `${JSON.stringify({ schemaVersion: 1, releaseId: options.releaseId,
            sequence: options.sequence, nodeVersion: options.expectedNodeVersion, publicKeySha256: options.publicKeySha256, profile: 'test' })}\n`, 0o644);
        const configDirectory = fs.openSync(at('/etc/nexowatt-eos'), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(configDirectory); } finally { fs.closeSync(configDirectory); }
        phase = 'units';
        mkdir('/etc/systemd/system', 0o755);
        for (const unit of UNITS) privateWrite(at(`/etc/systemd/system/${unit}`), fs.readFileSync(file(`system/test-base/systemd/${unit}`)), 0o644);
        unitsInstalled = true;
        fs.symlinkSync(installedRelease, at('/opt/nexowatt/eos/current'));
        currentCreated = true;
        run('/usr/bin/systemctl', ['daemon-reload']);
        phase = 'initialized';
        if (options.start) {
            run('/usr/bin/systemctl', ['start', 'nexowatt-eos-redis@objects.service', 'nexowatt-eos-redis@states.service']);
            run('/usr/bin/systemctl', ['start', 'nexowatt-eos-initialize.service'], { timeout: 150000 });
            const initialized = run('/usr/bin/systemctl', ['show', 'nexowatt-eos-initialize.service', '--property=Result', '--value']);
            if (initialized.trim() !== 'success') reject('INITIALIZATION_FAILED');
            privateWrite(at('/var/lib/nexowatt-eos/.initialized'), `${JSON.stringify({ releaseId: options.releaseId, profile: 'test', at: new Date().toISOString() })}\n`, 0o644);
            run('/usr/bin/systemctl', ['enable', '--now', 'nexowatt-eos.target'], { timeout: 90000 });
            run('/usr/bin/systemctl', ['is-active', '--quiet', 'nexowatt-eos-controller.service', 'nexowatt-eos-redis@objects.service', 'nexowatt-eos-redis@states.service']);
            run('/usr/bin/systemctl', ['enable', '--now', 'nexowatt-eos-certificates.timer']);
            run('/usr/bin/systemctl', ['enable', '--now', 'nexowatt-eos-os-updates.timer']);
        }
        const status = { schemaVersion: 1, kind: 'eos-test-host-installation', releaseId: options.releaseId,
            phase: options.start ? 'TEST_SERVICES_STARTED' : 'INSTALLED_DISABLED', releaseApproved: false,
            adapterIsolation: false, adapterActivation: 'disabled-until-approved-enrollment', hardwareAcceptance: false };
        privateWrite(at('/etc/nexowatt-eos/install-status.json'), `${JSON.stringify(status, null, 2)}\n`, 0o644);
        return status;
    } catch (error) {
        // No automatic rollback of created identities or data. Never restart a
        // partly initialized system; preserve its evidence for the root operator.
        if (unitsInstalled) {
            const disable = exec('/usr/bin/systemctl', ['disable', 'nexowatt-eos.target', 'nexowatt-eos-certificates.timer', 'nexowatt-eos-os-updates.timer']);
            // Stop future update scheduling, not an in-flight APT/dpkg process.
            // Killing a package transaction during installer cleanup could
            // leave the host's package database partly configured.
            const stop = exec('/usr/bin/systemctl', ['stop', 'nexowatt-eos.target', ...SERVICES], { timeout: 90000 });
            if (disable.status !== 0 || disable.error || stop.status !== 0 || stop.error) {
                error.cleanupIncomplete = true;
                error.originalCode = error.code || 'INSTALL_FAILED';
                error.code = 'HOST_CLEANUP_INCOMPLETE';
                error.message = 'HOST_CLEANUP_INCOMPLETE';
            }
        }
        error.phase = phase;
        error.currentCreated = currentCreated;
        throw error;
    }
}
module.exports = { installHost, mergeControllerConfig, privateWrite, assertNoSymlinkAncestors, sudoListingDeniesAll, UNITS, SERVICES };
if (require.main === module) {
    process.stderr.write('Use the signed EOS release orchestrator. Direct host installation is not supported.\n');
    process.exitCode = 2;
}
