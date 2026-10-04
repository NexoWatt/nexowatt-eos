#!/usr/bin/env node
'use strict';
// Root-only local commissioning, never a web API or sudo permission for an adapter.
// User credentials enter through a protected input file, never command arguments.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { checkInstalled, rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { readConfig } = require('../../security/verify-runtime-tls.cjs');
const { initialize, assertRuntimeConfig, readPinnedApp } = require('../../runtime/bootstrap/initialize.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const { validateAccounts } = require('../../runtime/bootstrap/accounts.cjs');
const { provisionWeb, normalizeHosts } = require('../../runtime/transport/web-certificates.cjs');
const { privateWrite } = require('./install-host.cjs');
const { authorizeStart, blockStart } = require('../../runtime/release/maintenance.cjs');
const databases = require('../../runtime/transport/databases.cjs');
const LOCK = '/etc/nexowatt-eos/.activation.lock';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(key => [key, () => {}]));
function protectedInput(file, maximum, secret = false) {
    if (!path.isAbsolute(file) || path.resolve(file) !== file) fail('ONBOARD_INPUT_PATH');
    rootOwned(file); const result = readFileLimited(file, maximum);
    if (secret && result.mode & 0o077) fail('ONBOARD_SECRET_PERMISSIONS');
    return result.bytes;
}
function parseArgs(argv) {
    const out = {};
    if (argv.length !== 8) fail('ONBOARD_USAGE');
    for (let i = 0; i < argv.length; i += 2) {
        if (!['--password-file', '--accounts-file', '--license-trust', '--hosts-file'].includes(argv[i]) || Object.hasOwn(out, argv[i]) || !argv[i + 1]) fail('ONBOARD_USAGE');
        out[argv[i]] = argv[i + 1];
    }
    return out;
}
function command(executable, args, timeout = 90000) {
    const result = spawnSync(executable, args, { shell: false, timeout, maxBuffer: 1048576,
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.error || result.status !== 0) fail('ONBOARD_HOST_COMMAND');
}
function syncDirectory(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function quiesceAfterFailure(block, stop) {
    let blockFailed = false, stopFailed = false;
    try { block(); } catch { blockFailed = true; }
    // Evidence/permission I/O failure must never prevent an attempt to stop.
    try { stop(); } catch { stopFailed = true; }
    if (stopFailed) fail('ONBOARD_STOP_FAILED');
    if (blockFailed) fail('ONBOARD_START_BLOCK_FAILED');
}
async function connect(Client, connection, clients) {
    return new Promise((resolve, reject) => {
        let client; const timer = setTimeout(() => reject(Object.assign(new Error('ONBOARD_DATABASE_TIMEOUT'), { code: 'ONBOARD_DATABASE_TIMEOUT' })), 5000);
        try { client = new Client({ connection: structuredClone(connection), logger: silent,
            connected: () => { clearTimeout(timer); resolve(client); }, disconnected: () => {}, change: () => {} }); clients.push(client); }
        catch { clearTimeout(timer); reject(Object.assign(new Error('ONBOARD_DATABASE_FAILED'), { code: 'ONBOARD_DATABASE_FAILED' })); }
    });
}
async function waitAdapters(states, startedAt, timeoutMs = 30000) {
    if (!Number.isSafeInteger(startedAt) || startedAt > Date.now() || startedAt < Date.now() - 300000 ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) fail('ONBOARD_READINESS_INPUT');
    const until = Date.now() + timeoutMs;
    do {
        const values = await Promise.all(enrollment.SPECS.map(spec => states.getState(`system.adapter.${spec.name}.0.alive`)));
        if (values.every(value => value?.val === true && value.ack === true && Number.isFinite(value.ts) &&
            value.ts >= startedAt && value.ts <= Date.now() + 1000 && Date.now() - value.ts < 30000)) return;
        await new Promise(resolve => setTimeout(resolve, 200));
    } while (Date.now() < until);
    fail('ONBOARD_ADAPTERS_NOT_READY');
}
function probeWeb(port, ca) {
    return new Promise((resolve, reject) => {
        if (![8081, 8188].includes(port)) return reject(Object.assign(new Error('ONBOARD_HTTPS_NOT_READY'), { code: 'ONBOARD_HTTPS_NOT_READY' }));
        const request = https.get({ host: '127.0.0.1', port, servername: 'localhost', ca,
            path: port === 8081 ? '/nexowatt/license/status' : '/api/strict-auth/status',
            minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', rejectUnauthorized: true, agent: false });
        let done = false;
        const finish = ok => { if (done) return; done = true; clearTimeout(timer); request.destroy(); ok ? resolve() : reject(Object.assign(new Error('ONBOARD_HTTPS_NOT_READY'), { code: 'ONBOARD_HTTPS_NOT_READY' })); };
        const timer = setTimeout(() => finish(false), 5000);
        request.once('error', () => finish(false));
        request.once('response', response => {
            if (!response.socket.authorized || response.socket.getProtocol() !== 'TLSv1.3') return finish(false);
            let bytes = 0; const chunks = [];
            response.on('data', chunk => { bytes += chunk.length; if (bytes > 16384) finish(false); else chunks.push(chunk); });
            response.once('error', () => finish(false)); response.once('aborted', () => finish(false));
            response.once('end', () => {
                // The complete Admin authentication middleware redirects before
                // the license handler. Require its exact local login target;
                // never follow redirects or accept an arbitrary successful page.
                if (port === 8081) return finish(response.statusCode === 302 &&
                    response.headers.location === '/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus');
                try {
                    const body = JSON.parse(Buffer.concat(chunks));
                    finish(response.statusCode === 200 && body.ok === true && body.enabled === true && body.strict === true &&
                        body.authed === false && body.protectWrites === true && body.isAdmin === false);
                } catch { finish(false); }
            });
        });
    });
}
function readOnboardingInputs(options, app) {
    const rawPassword = protectedInput(options['--password-file'], 257, true);
    let password;
    try { password = new TextDecoder('utf-8', { fatal: true }).decode(rawPassword).replace(/\r?\n$/, ''); enrollment.validatePassword(password); }
    finally { rawPassword.fill(0); }
    const rawAccounts = protectedInput(options['--accounts-file'], 16384, true);
    let accounts;
    try {
        accounts = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawAccounts));
        validateAccounts(accounts, password, enrollment.validatePassword);
    } finally { rawAccounts.fill(0); }
    const hosts = JSON.parse(protectedInput(options['--hosts-file'], 16384));
    normalizeHosts(hosts); // validate raw input; provisioner adds loopback SANs once
    const requireApp = createRequire(path.join(app, 'package.json'));
    const { validatePublicKeys } = requireApp('iobroker.eos-admin/build/lib/eosLicenseCore.js');
    const trust = validatePublicKeys(JSON.parse(protectedInput(options['--license-trust'], 32768)));
    return { password, accounts, hosts, trust };
}
async function onboard(options) {
    if (process.getuid?.() !== 0) fail('ONBOARD_ROOT_REQUIRED');
    const releasePath = fs.realpathSync('/opt/nexowatt/eos/current');
    const installed = checkInstalled({ releasePath, evidencePath: path.join('/opt/nexowatt/eos/verified', path.basename(releasePath)) });
    const app = path.join(releasePath, 'app'); enrollment.pinnedAdapters(app);
    let { password, accounts, hosts, trust } = readOnboardingInputs(options, app);
    const requireApp = createRequire(path.join(app, 'package.json'));
    rootOwned('/etc/nexowatt-eos');
    if (fs.existsSync('/etc/nexowatt-eos/web') || fs.existsSync('/etc/nexowatt-eos/license-trust.json')) fail('ONBOARD_ALREADY_PROVISIONED');
    const config = assertRuntimeConfig(readConfig('/etc/nexowatt-eos/iobroker.json'));
    const clients = []; let lock; let complete = false;
    try {
        lock = fs.openSync(LOCK, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
        fs.writeFileSync(lock, JSON.stringify({ operation: 'ui-onboarding', pid: process.pid, releaseId: installed.releaseId, startedAt: new Date().toISOString() }) + '\n'); fs.fsyncSync(lock);
        syncDirectory('/etc/nexowatt-eos');
        // Dependencies were inspected before lock acquisition; rebind the exact
        // release and configuration now so a concurrent activation cannot race.
        if (fs.realpathSync('/opt/nexowatt/eos/current') !== releasePath ||
            JSON.stringify(readConfig('/etc/nexowatt-eos/iobroker.json')) !== JSON.stringify(config)) fail('ONBOARD_SNAPSHOT_CHANGED');
        rootOwned('/etc/nexowatt-eos/release-state.json');
        if (JSON.parse(readFileLimited('/etc/nexowatt-eos/release-state.json', 16384).bytes).releaseId !== installed.releaseId) fail('ONBOARD_SNAPSHOT_CHANGED');
        checkInstalled({ releasePath, evidencePath: path.join('/opt/nexowatt/eos/verified', path.basename(releasePath)) });
        command('/usr/bin/systemctl', ['stop', 'nexowatt-eos-controller.service']);
        const { Objects, States } = databases.clients(requireApp, config);
        const [objects, states] = await Promise.all([
            connect(Objects, config.objects, clients),
            connect(States, config.states, clients),
        ]);
        const pinned = readPinnedApp(app);
        const verifyFresh = () => initialize({ objects, states, config, ...pinned, verifyOnly: true });
        await verifyFresh();
        const web = provisionWeb({ directory: '/etc/nexowatt-eos/web', hosts });
        for (const scope of ['admin', 'ui']) {
            const file = `/etc/nexowatt-eos/web/${scope}.key`;
            command('/usr/bin/chown', ['root:eos-runtime', file]); fs.chmodSync(file, 0o640);
        }
        privateWrite('/etc/nexowatt-eos/license-trust.json', JSON.stringify(trust) + '\n', 0o644);
        await enrollment.enroll({ objects, states, config, app, password, accounts, verifyFresh }); password = undefined; accounts = undefined;
        // Only fixed package names, no URL and no npm install. Upload publishes
        // the signed packages' static admin assets into the TLS object store.
        // The maintenance unit carries the same read-only config bind mount as
        // the controller. A runuser command outside that namespace would see
        // the deliberately empty placeholder instead of the TLS configuration.
        command('/usr/bin/systemctl', ['start', 'nexowatt-eos-upload.service'], 250000);
        await enrollment.verify({ objects, config, app });
        for (const spec of enrollment.SPECS) {
            const id = `system.adapter.${spec.name}.0`; const doc = await objects.getObjectAsync(id);
            doc.common.enabled = true; await objects.setObjectAsync(id, doc);
        }
        await enrollment.verify({ objects, config, app });
        authorizeStart('/etc/nexowatt-eos', 'ui-onboarding');
        command('/usr/bin/systemctl', ['reset-failed', 'nexowatt-eos-controller.service']);
        const startedAt = Date.now();
        command('/usr/bin/systemctl', ['start', 'nexowatt-eos-controller.service']);
        command('/usr/bin/systemctl', ['is-active', '--quiet', 'nexowatt-eos-controller.service']);
        await waitAdapters(states, startedAt);
        const ca = readFileLimited('/etc/nexowatt-eos/web/ca.crt', 16384).bytes;
        await Promise.all(enrollment.SPECS.map(spec => probeWeb(spec.port, ca)));
        complete = true;
        return { status: 'UI_LAB_ENROLLED', releaseId: installed.releaseId, physicalControlEnabled: false,
            caFingerprint256: web.caFingerprint256, webPorts: { admin: 8081, ui: 8188 },
            browserAndLicenseAcceptance: 'REQUIRED', productionReleaseApproved: false };
    } catch (error) {
        if (lock !== undefined) {
            quiesceAfterFailure(() => blockStart('/etc/nexowatt-eos'),
                () => command('/usr/bin/systemctl', ['stop', 'nexowatt-eos-controller.service']));
        }
        throw error;
    } finally {
        password = undefined;
        accounts = undefined;
        // Strings in the JS heap cannot be reliably erased. Input is never
        // persisted here; operator removes the protected source file afterwards.
        await Promise.allSettled(clients.map(client => client.destroy()));
        if (lock !== undefined) fs.closeSync(lock);
        if (complete) { blockStart('/etc/nexowatt-eos'); fs.unlinkSync(LOCK); syncDirectory('/etc/nexowatt-eos'); }
        // Failure intentionally retains the maintenance marker and stopped core.
        // Restore the fresh snapshot; do not delete markers to bypass this gate.
    }
}
module.exports = { parseArgs, protectedInput, readOnboardingInputs, waitAdapters, probeWeb, quiesceAfterFailure, onboard };
if (require.main === module) {
    const deadline = setTimeout(() => { process.stderr.write('{"ok":false,"code":"ONBOARD_TIMEOUT"}\n'); process.exit(1); }, 360000);
    Promise.resolve().then(() => onboard(parseArgs(process.argv.slice(2)))).then(
        result => process.stdout.write(JSON.stringify(result) + '\n'),
        error => { process.stderr.write(JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'ONBOARD_FAILED' }) + '\n'); process.exitCode = 1; },
    ).finally(() => clearTimeout(deadline));
}
