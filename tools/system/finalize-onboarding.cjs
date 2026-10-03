#!/usr/bin/env node
'use strict';
// Privileged, fixed systemd entry point. No arguments, password files, browser
// paths, executable names or commands are accepted. The web process only writes
// a bounded hash-and-settings handoff; it has no database or root credentials.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { checkInstalled, rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { readConfig } = require('../../security/verify-runtime-tls.cjs');
const { assertRuntimeConfig, readPinnedApp, initialize } = require('../../runtime/bootstrap/initialize.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const databases = require('../../runtime/transport/databases.cjs');
const { authorizeStart, blockStart } = require('../../runtime/release/maintenance.cjs');
const { waitAdapters, probeWeb, quiesceAfterFailure } = require('./onboard-ui.cjs');
const DIRECTORY = '/etc/nexowatt-eos';
const LOCK = DIRECTORY + '/.activation.lock';
const COMPLETE = DIRECTORY + '/first-start-complete.json';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(key => [key, () => {}]));

function command(args, timeout = 90000) {
    const result = spawnSync('/usr/bin/systemctl', args, { shell: false, timeout, maxBuffer: 1048576,
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.error || result.status !== 0) fail('FIRST_START_HOST_COMMAND');
    return result.stdout.toString();
}
function syncDirectory(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function persistComplete(file, record) {
    // New completion can never replace a prior commissioning decision.
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o644);
    try { fs.writeFileSync(fd, JSON.stringify(record) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    syncDirectory(path.dirname(file));
}
function verifyHandoffOwner(directory) {
    rootOwned(path.dirname(directory));
    const account = fs.readFileSync('/etc/passwd', 'utf8').split('\n').filter(line => line.startsWith('eos-setup:'));
    if (account.length !== 1 || !/^[0-9]+$/.test(account[0].split(':')[2])) fail('FIRST_START_SETUP_OWNER');
    const uid = Number(account[0].split(':')[2]);
    if (!Number.isSafeInteger(uid) || uid <= 0 || fs.realpathSync(directory) !== directory) fail('FIRST_START_SETUP_OWNER');
    for (const name of ['', 'state.json', 'handoff.json']) {
        const stat = fs.lstatSync(path.join(directory, name));
        if (stat.uid !== uid || stat.mode & 0o077 || stat.isSymbolicLink() ||
            (name ? !stat.isFile() || stat.nlink !== 1 : !stat.isDirectory())) fail('FIRST_START_SETUP_OWNER');
    }
}
async function connect(Client, connection, clients) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Object.assign(new Error('FIRST_START_DATABASE_TIMEOUT'), { code: 'FIRST_START_DATABASE_TIMEOUT' })), 5000);
        try {
            const client = new Client({ connection: structuredClone(connection), logger: silent,
                connected: () => { clearTimeout(timer); resolve(client); }, disconnected: () => {}, change: () => {} });
            clients.push(client);
        } catch { clearTimeout(timer); reject(Object.assign(new Error('FIRST_START_DATABASE_FAILED'), { code: 'FIRST_START_DATABASE_FAILED' })); }
    });
}

// The injected effects exercise the complete ordering and failure paths without
// granting tests host privileges. The CLI always supplies the fixed effects below.
async function completeSequence(effects) {
    let locked = false;
    try {
        await effects.acquire(); locked = true;
        await effects.stop();
        await effects.enroll();
        await effects.verify();
        await effects.configureLicense();
        await effects.upload();
        await effects.enableWebInstances();
        await effects.verify();
        await effects.authorize();
        await effects.start();
        await effects.probe();
        await effects.persist();
        await effects.enableBoot();
        await effects.disableSetup();
        await effects.release();
        return { status: 'FIRST_START_COMPLETE', installed: true, configured: true,
            physicalControlEnabled: false, productionReleaseApproved: false };
    } catch (error) {
        if (locked) await effects.quiesce();
        throw error;
    }
}

async function finalize() {
    if (process.getuid?.() !== 0) fail('FIRST_START_ROOT_REQUIRED');
    const releasePath = fs.realpathSync('/opt/nexowatt/eos/current');
    const evidencePath = path.join('/opt/nexowatt/eos/verified', path.basename(releasePath));
    const installed = checkInstalled({ releasePath, evidencePath });
    const app = path.join(releasePath, 'app');
    const config = assertRuntimeConfig(readConfig(DIRECTORY + '/iobroker.json'));
    rootOwned(DIRECTORY);
    if (fs.existsSync(COMPLETE)) fail('FIRST_START_ALREADY_COMPLETE');
    const { readHandoff } = require('../../runtime/onboarding/state.cjs');
    verifyHandoffOwner('/var/lib/nexowatt-eos/onboarding');
    const handoff = readHandoff('/var/lib/nexowatt-eos/onboarding', installed.releaseId);
    const licensing = require('../../runtime/bootstrap/first-start-configuration.cjs');
    const requireApp = createRequire(path.join(app, 'package.json'));
    const clients = []; let lock, objects, states, startedAt, licenseUuid;
    try {
        const result = await completeSequence({
            acquire: () => {
                lock = fs.openSync(LOCK, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
                fs.writeFileSync(lock, JSON.stringify({ operation: 'ui-onboarding', pid: process.pid, releaseId: installed.releaseId }) + '\n');
                fs.fsyncSync(lock); syncDirectory(DIRECTORY);
            },
            stop: () => {
                command(['stop', 'nexowatt-eos-controller.service']);
                if (fs.realpathSync('/opt/nexowatt/eos/current') !== releasePath ||
                    JSON.stringify(readConfig(DIRECTORY + '/iobroker.json')) !== JSON.stringify(config)) fail('FIRST_START_RELEASE_CHANGED');
                rootOwned(DIRECTORY + '/release-state.json');
                if (JSON.parse(readFileLimited(DIRECTORY + '/release-state.json', 16384).bytes).releaseId !== installed.releaseId) fail('FIRST_START_RELEASE_CHANGED');
                checkInstalled({ releasePath, evidencePath });
                for (const file of ['web/ca.crt', 'license-trust.json']) rootOwned(DIRECTORY + '/' + file);
            },
            enroll: async () => {
                const { Objects, States } = databases.clients(requireApp, config);
                [objects, states] = await Promise.all([connect(Objects, config.objects, clients), connect(States, config.states, clients)]);
                // The browser cannot choose the device identity or its issuer.
                // Read the initialized database UUID again before any account write.
                const core = require(path.join(app, 'node_modules/iobroker.eos-admin/build/lib/eosLicenseCore.js'));
                const { readTrustFile } = require(path.join(app, 'node_modules/iobroker.eos-admin/build/lib/eosLicenseService.js'));
                licenseUuid = core.normalizeUuid((await objects.getObjectAsync('system.meta.uuid'))?.native?.uuid);
                rootOwned(DIRECTORY + '/license-device.json');
                const identity = JSON.parse(readFileLimited(DIRECTORY + '/license-device.json', 8192).bytes);
                if (identity.schemaVersion !== 1 || identity.uuid !== licenseUuid || identity.releaseId !== installed.releaseId) fail('FIRST_START_DEVICE_IDENTITY');
                const licenseStatus = licensing.validateLicenseSelection(handoff.license, { uuid: licenseUuid,
                    publicKeys: await readTrustFile(DIRECTORY + '/license-trust.json'), core });
                if (handoff.license.mode === 'activate') require('../../runtime/onboarding/configuration.cjs').licenseCapacity(handoff.settings.devicePlan, licenseStatus);
                const pinned = readPinnedApp(app);
                await enrollment.enrollFirstRun({ objects, states, config, app,
                    passwordHash: handoff.passwordHash, settings: handoff.settings,
                    verifyFresh: () => initialize({ objects, states, config, ...pinned, verifyOnly: true }) });
            },
            verify: () => enrollment.verify({ objects, config, app }),
            configureLicense: async () => {
                if (handoff.license.mode !== 'activate') return;
                await licensing.writeLicenseTransfer(handoff.license, licenseUuid);
                command(['start', 'nexowatt-eos-setup-license.service'], 60000);
                if (command(['show', 'nexowatt-eos-setup-license.service', '--property=Result', '--value']).trim() !== 'success') fail('FIRST_START_LICENSE_STORE');
                // Keep the protected input until the full transition succeeds.
                // Any later fault retains it behind the maintenance lock.
            },
            upload: () => command(['start', 'nexowatt-eos-upload.service'], 250000),
            enableWebInstances: async () => {
                // Physical adapters remain installed and disabled, independent
                // of what a handoff, license or browser sends.
                for (const name of ['eos-admin', 'nexowatt-ui']) {
                    const id = `system.adapter.${name}.0`, doc = await objects.getObjectAsync(id);
                    if (!doc || doc.common?.name !== name) fail('FIRST_START_INSTANCE');
                    doc.common.enabled = true; await objects.setObjectAsync(id, doc);
                }
            },
            authorize: () => authorizeStart(DIRECTORY, 'ui-onboarding'),
            start: () => {
                command(['reset-failed', 'nexowatt-eos-controller.service']); startedAt = Date.now();
                command(['start', 'nexowatt-eos-controller.service']); command(['is-active', '--quiet', 'nexowatt-eos-controller.service']);
            },
            probe: async () => {
                await waitAdapters(states, startedAt);
                const ca = readFileLimited(DIRECTORY + '/web/ca.crt', 16384).bytes;
                await Promise.all([8081, 8188].map(port => probeWeb(port, ca)));
            },
            persist: () => persistComplete(COMPLETE, { schemaVersion: 1, releaseId: installed.releaseId,
                setupId: handoff.setupId, completedAt: new Date().toISOString(),
                licenseConfigured: handoff.license.mode === 'activate', physicalControlEnabled: false }),
            enableBoot: () => command(['enable', 'nexowatt-eos.target']),
            disableSetup: () => {
                // Stopping the setup target would also stop PostgreSQL through
                // PartOf. Only stop the setup endpoints and their path trigger.
                command(['disable', 'nexowatt-eos-setup.target']);
                command(['stop', 'nexowatt-eos-setup.service', 'nexowatt-eos-setup-finalize.path']);
                const code = DIRECTORY + '/setup-code.txt';
                if (fs.existsSync(code)) { rootOwned(code); fs.unlinkSync(code); syncDirectory(DIRECTORY); }
                const licenseTransfer = DIRECTORY + '/first-start-license.json';
                if (fs.existsSync(licenseTransfer)) { rootOwned(licenseTransfer); fs.unlinkSync(licenseTransfer); syncDirectory(DIRECTORY); }
            },
            release: () => {
                blockStart(DIRECTORY); fs.closeSync(lock); lock = undefined;
                fs.unlinkSync(LOCK); syncDirectory(DIRECTORY);
            },
            quiesce: () => quiesceAfterFailure(() => blockStart(DIRECTORY), () => command(['stop', 'nexowatt-eos-controller.service'])),
        });
        return { ...result, releaseId: installed.releaseId, webPorts: { admin: 8081, ui: 8188 } };
    } finally {
        handoff.passwordHash = undefined;
        if (handoff.license) handoff.license.token = undefined;
        await Promise.allSettled(clients.map(client => client.destroy()));
        if (lock !== undefined) fs.closeSync(lock);
        // A failed attempt deliberately retains the root maintenance lock.
        // Recovery requires an OS administrator; no web request can clear it.
    }
}
module.exports = { completeSequence, persistComplete, finalize };
if (require.main === module) {
    const deadline = setTimeout(() => { process.stderr.write('{"ok":false,"code":"FIRST_START_TIMEOUT"}\n'); process.exit(1); }, 360000);
    Promise.resolve().then(() => { if (process.argv.length !== 2) fail('FIRST_START_USAGE'); return finalize(); }).then(
        result => process.stdout.write(JSON.stringify(result) + '\n'),
        error => { process.stderr.write(JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'FIRST_START_FAILED' }) + '\n'); process.exitCode = 1; },
    ).finally(() => clearTimeout(deadline));
}
