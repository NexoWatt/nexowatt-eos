'use strict';
// Explicit integration only: actual signed Admin/UI/controller and native PG.
// No adapter, HTTP, TLS, PostgreSQL or license implementation is mocked.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const bootstrap = require('../../runtime/bootstrap/initialize.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const currentReadiness = require('../../tools/system/onboard-ui.cjs');
const { PIN } = require('./prepare-bundle.cjs');
const { inventoryTree } = require('../../runtime/postgresql/integration.cjs');
const root = process.env.EOS_MANAGEMENT_LAB_ROOT;
if (!root || !path.isAbsolute(root) || fs.realpathSync(root) !== root || process.getuid?.() === 0 || process.env.EOS_TEST_PG_FRESH !== '1') throw new Error('MANAGEMENT_EXPLICIT_NATIVE_LAB_REQUIRED');
const app = path.join(root, 'management-app');
const data = '/var/lib/nexowatt-eos/iobroker-data';
const controller = path.join(app, 'node_modules/iobroker.js-controller');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'management-pg-paths.json')));
if (metadata.labOnly !== true || metadata.database !== 'eos' || metadata.port !== 15432 || metadata.host !== '127.0.0.1' || metadata.osUid !== process.getuid()) throw new Error('MANAGEMENT_PRIVATE_DATABASE_REQUIRED');
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(k => [k, () => {}]));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fail = code => { throw new Error(code); };
function launch(args, options) {
    const child = spawn(process.execPath, args, { ...options, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.output = ''; child.seen = new Set();
    // Keep private bounded diagnostics in memory, never print or artifact raw
    // adapter output (which can contain interfaces, URLs or device identifiers).
    const signals = { LICENSE_VALID: '[EOS licensing] LICENSE_VALID', LICENSE_MISSING: '[EOS licensing] LICENSE_MISSING',
        TLS_PROVISIONING: 'EOS_TLS_PROVISIONING_REQUIRED', PG_TRANSACTION: 'EOS_PG_TRANSACTION_FAILED',
        READ_ONLY_WRITE: 'EROFS', PERMISSION_DENIED: 'EACCES', TYPE_ERROR: 'TypeError:', REFERENCE_ERROR: 'ReferenceError:',
        OAUTH_DEPENDENCY: 'EOS_OAUTH_DEPENDENCY', UNCAUGHT_EXCEPTION: 'uncaught exception', UNHANDLED_REJECTION: 'UnhandledPromiseRejection' };
    for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
        child.output = (child.output + bytes).slice(-1048576);
        for (const [code, needle] of Object.entries(signals)) if (child.output.includes(needle)) child.seen.add(code);
        if (/\b(?:error|fatal):/i.test(child.output)) child.seen.add('RUNTIME_ERROR_LOGGED');
    });
    child.completion = new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('exit', code => resolve(code)); });
    return child;
}
function signalGroup(child, signal) {
    if (child?.pid) { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
}
async function stop(child) {
    if (!child || child.groupStopped) return;
    signalGroup(child, 'SIGTERM');
    const timer = setTimeout(() => signalGroup(child, 'SIGKILL'), 10000);
    try { await child.completion; } finally { clearTimeout(timer); }
    // The controller can exit while a child remains; cleanup targets only the
    // explicitly detached laboratory process group, never other host services.
    signalGroup(child, 'SIGKILL');
    child.groupStopped = true;
}
async function connect(Client, connection) {
    return new Promise((resolve, reject) => {
        let client; const timer = setTimeout(() => { void client?.destroy().catch(() => {}); reject(new Error('MANAGEMENT_CLIENT_TIMEOUT')); }, 8000);
        try { client = new Client({ connection, logger: silent, connected: () => { clearTimeout(timer); resolve(client); }, disconnected: () => {}, change: () => {} }); }
        catch { clearTimeout(timer); reject(new Error('MANAGEMENT_CLIENT_FAILED')); }
    });
}
async function until(check, budget = 15000) {
    const end = Date.now() + budget;
    while (!await check()) { if (Date.now() >= end) fail('MANAGEMENT_DEADLINE'); await delay(100); }
}
function readonlyTree(directory) {
    for (const name of fs.readdirSync(directory)) {
        const file = path.join(directory, name), st = fs.lstatSync(file);
        if (st.isDirectory()) readonlyTree(file);
        else if (st.isFile()) fs.chmodSync(file, st.mode & 0o555);
        else fail('MANAGEMENT_UNEXPECTED_APP_LINK');
    }
    fs.chmodSync(directory, 0o555);
}
function contentRows(directory) { return inventoryTree(directory).map(({ mode, ...row }) => row); }
async function observation(probe, ca) {
    const started = Date.now();
    const results = await Promise.allSettled([8081, 8188].map(port => probe(port, ca)));
    const detail = (result, port) => result.status === 'fulfilled' ? null : require('./diagnostics.cjs').probeFailure(result.reason, port);
    return { elapsedMs: Date.now() - started, admin: results[0].status === 'fulfilled', ui: results[1].status === 'fulfilled',
        adminFailure: detail(results[0], 8081), uiFailure: detail(results[1], 8188) };
}

test('actual signed R7 controller, Admin and UI over native PostgreSQL and production HTTPS/auth readiness', { timeout: 470000 }, async t => {
    assert.equal(process.version, 'v24.21.0');
    const children = [], clients = [], evidence = { schemaVersion: 1, kind: 'native-management-integration', sourceReleaseId: PIN.releaseId,
        sourceSequence: 10, nativePostgresql: '17.11', node: process.version, hostArch: process.arch, signedPayloadPlatform: 'linux-arm64',
        sourceAppBytesUnchanged: false, lifecycleScriptsExecuted: false, nativeModulesRebuilt: false, mockedRuntimeDependencies: false,
        physicalAdaptersStarted: false, actualSystemdMountPolicy: false, physicalPiAcceptance: false, productionReleaseApproved: false,
        productionReadinessPassed: false, restartPassed: false, boots: [], stages: [], bootstrapSteps: [] };
    let active;
    t.after(async () => {
        for (const child of children) await stop(child);
        await Promise.allSettled(clients.map(client => client.destroy()));
        evidence.runtimeIndicators = [...new Set(children.flatMap(child => [...child.seen]))].sort();
        evidence.processIndicators = children.map(child => ({ scope: child.evidenceScope || 'unknown', indicators: [...child.seen].sort() }));
        fs.writeFileSync(path.join(root, 'management-evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
    });
    const stage = async (name, operation) => {
        let passed = false, failureCode = null;
        await t.test(name, async () => {
            try { await operation(); passed = true; }
            catch (error) {
                // Only known code tokens may reach TAP. Never serialize a PG,
                // config, assertion payload, password or HTTPS response object.
                const code = require('./diagnostics.cjs').stageFailure(error);
                failureCode = code;
                throw new Error(code);
            }
        });
        evidence.stages.push({ name, passed, failureCode });
        if (!passed) fail('MANAGEMENT_STAGE_FAILED');
    };
    const bootstrapStep = async (name, operation) => {
        const row = { name, passed: false, failureCode: null }; evidence.bootstrapSteps.push(row);
        try { const result = await operation(); row.passed = true; return result; }
        catch (error) { row.failureCode = require('./diagnostics.cjs').stageFailure(error); throw error; }
    };
    const before = contentRows(app), appRequire = createRequire(path.join(app, 'package.json'));
    enrollment.pinnedAdapters(app);
    const legacyReadiness = require(path.join(root, 'r7/bundle/payload/tools/system/onboard-ui.cjs'));
    const { validateConnection } = appRequire('@nexowatt/eos-postgresql-store');
    const PgClient = createRequire(appRequire.resolve('@nexowatt/eos-postgresql-store'))('pg').Client;
    const config = JSON.parse(fs.readFileSync(path.join(controller, 'conf/iobroker-dist.json')));
    for (const domain of ['objects', 'states']) {
        const role = 'eos_' + domain;
        const ssl = Object.fromEntries([['ca', metadata.caFile], ['cert', metadata.roles[role].certFile], ['key', metadata.roles[role].keyFile]].map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
        config[domain] = { type: 'postgresql', host: metadata.host, port: metadata.port, database: metadata.database, user: role, options: { ssl } };
    }
    config.dataDir = data;
    Object.assign(config.system, { hostname: 'eos-management-lab', compact: false, allowShellCommands: false, statisticsInterval: 1000, checkDiskInterval: 0 });
    config.multihostService = { enabled: false }; config.plugins = { sentry: { enabled: false } };
    config.log = { level: 'info', noStdout: false, transport: { file1: { type: 'file', enabled: false } } };
    bootstrap.assertRuntimeConfig(config);
    await stage('fresh isolated native database uses separate least-privilege mTLS identities', async () => {
        for (const domain of ['objects', 'states']) {
            const client = new PgClient(validateConnection(config[domain], domain)); client.on('error', () => {});
            try {
                await client.connect(); assert.equal(client.connection.stream.authorized, true); assert.equal(client.connection.stream.getProtocol(), 'TLSv1.3');
                const result = await client.query('SELECT NOT EXISTS (SELECT 1 FROM eos_store.kv) AS empty_kv, NOT EXISTS (SELECT 1 FROM eos_store.events) AS empty_events');
                assert.ok(result.rows.length === 1 && result.rows[0].empty_kv && result.rows[0].empty_events);
                const role = await client.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user');
                assert.ok(role.rows.length === 1 && Object.values(role.rows[0]).every(value => value === false));
            } finally { await client.end(); }
        }
    });
    const configBytes = Buffer.from(JSON.stringify(config)), configFile = path.join(data, 'iobroker.json');
    fs.writeFileSync(configFile, configBytes, { mode: 0o400, flag: 'wx' });
    assert.throws(() => fs.accessSync(configFile, fs.constants.W_OK), { code: 'EACCES' });
    fs.mkdirSync(path.join(controller, 'tmp'), { recursive: true });
    // Root-managed production configuration is represented by denied writes.
    // No NODE_PATH/NODE_OPTIONS/preload or TLS disable switch reaches children.
    const options = { cwd: app, env: require('./environment.cjs').productEnvironment() };
    const cli = async (args, budget = 150000) => {
        const child = launch([path.join(controller, 'iobroker.js'), ...args], options); children.push(child);
        child.evidenceScope = args[0] === 'setup' ? 'cli-setup' : args[1] === 'eos-admin' ? 'cli-upload-admin' : 'cli-upload-ui';
        const timer = setTimeout(() => signalGroup(child, 'SIGTERM'), budget);
        const hard = setTimeout(() => signalGroup(child, 'SIGKILL'), budget + 5000);
        try { if (await child.completion !== 0) fail('MANAGEMENT_CLI_FAILED'); }
        finally { clearTimeout(timer); clearTimeout(hard); }
        assert.ok(fs.readFileSync(configFile).equals(configBytes));
    };
    await stage('ordinary setup loads actual PostgreSQL wrappers with read-only config', () => cli(['setup'], 45000));
    const objects = await connect(appRequire('@iobroker/db-objects-postgresql').Client, config.objects); clients.push(objects);
    const states = await connect(appRequire('@iobroker/db-states-postgresql').Client, config.states); clients.push(states);
    const pinned = bootstrap.readPinnedApp(app);
    const verifyFresh = () => bootstrap.initialize({ objects, states, config, ...pinned, verifyOnly: true });
    await stage('production bootstrap and first-run enrollment retain strong accounts and no physical adapters', async () => {
        await bootstrapStep('fresh-instance-count', async () => {
            const rows = (await objects.getObjectViewAsync('system', 'instance', {})).rows;
            evidence.initialInstanceCount = Array.isArray(rows) && rows.length <= 10000 ? rows.length : null;
            assert.equal(evidence.initialInstanceCount, 0);
        });
        await bootstrapStep('production-initialize', () => bootstrap.initialize({ objects, states, config, ...pinned }));
        const password = crypto.randomBytes(32).toString('base64url');
        const passwordHash = await bootstrapStep('password-hash', () => enrollment.passwordHash(password));
        await bootstrapStep('production-enrollment', () => enrollment.enrollFirstRun({ objects, states, config, app, passwordHash, verifyFresh,
            settings: { siteName: 'Native management laboratory', language: 'de', timeZone: 'Europe/Berlin', licenseMode: 'verified',
                deviceMode: 'disabled-pending-acceptance', safetyAcknowledged: true, plant: { mode: 'deferred', reason: 'no-plant-connected' },
                devicePlan: { status: 'none', devices: [], confirmed: true } } }));
        const uuid = await bootstrapStep('license-uuid-read', async () => (await objects.getObjectAsync('system.meta.uuid')).native.uuid);
        const core = appRequire('iobroker.eos-admin/build/lib/eosLicenseCore.js');
        const trust = await bootstrapStep('license-trust-read', async () => JSON.parse(fs.readFileSync('/etc/nexowatt-eos/license-trust.json')));
        const issuer = await bootstrapStep('license-issuer-read', async () => fs.readFileSync(path.join(root, 'ephemeral-license-issuer.pem')));
        await bootstrapStep('license-verify-and-store', () => require('./ephemeral-license.cjs').provision({ core, uuid, trust,
            directory: path.join(data, 'eos-admin.0/licensing'), issuer }));
    });
    await stage('production CLI uploads only the two admitted management packages', async () => {
        await cli(['upload', 'eos-admin']); await cli(['upload', 'nexowatt-ui']);
        for (const spec of enrollment.SPECS) {
            const id = `system.adapter.${spec.name}.0`, doc = await objects.getObjectAsync(id);
            doc.common.enabled = true; await objects.setObjectAsync(id, doc);
        }
        await enrollment.verify({ objects, config, app });
    });
    readonlyTree(app);
    assert.throws(() => fs.writeFileSync(path.join(controller, 'pids.txt'), '[]', { flag: 'wx' }), { code: 'EACCES' });
    const ca = fs.readFileSync('/etc/nexowatt-eos/web/ca.crt');
    const normalStop = appRequire('@iobroker/js-controller-common').EXIT_CODES.JS_CONTROLLER_STOPPED;
    async function boot() {
        const startedAt = Date.now(), row = { stage: 'controller', legacySingleProbe: null, productionProbe: null };
        evidence.boots.push(row);
        active = launch([path.join(controller, 'controller.js')], options); children.push(active);
        active.evidenceScope = 'controller';
        await bootstrap.waitController({ objects, states, config, controllerPid: active.pid, timeoutMs: 30000, pollMs: 100 });
        row.coreReadyMs = Date.now() - startedAt;
        row.stage = 'adapters';
        await currentReadiness.waitAdapters(states, startedAt);
        row.adaptersAliveMs = Date.now() - startedAt;
        row.stage = 'https';
        // Baseline observation runs alongside, so it cannot consume the fixed
        // production retry budget or delay the corrected production call.
        const [legacy, production] = await Promise.all([observation(legacyReadiness.probeWeb, ca), observation(currentReadiness.probeWeb, ca)]);
        row.legacySingleProbe = legacy; row.productionProbe = production;
        row.productionReadyMs = Date.now() - startedAt;
        if (!production.admin || !production.ui) {
            // Diagnostic continuation only; a later listener cannot turn this
            // failed production gate green. No TLS or auth predicate is relaxed.
            const end = Date.now() + 90000;
            do { row.afterGateFailure = await observation(legacyReadiness.probeWeb, ca);
                if (row.afterGateFailure.admin && row.afterGateFailure.ui) break;
                if (active.exitCode !== null || active.signalCode !== null) break;
                await delay(200);
            } while (Date.now() < end);
            row.observedMs = Date.now() - startedAt;
            fail('MANAGEMENT_PRODUCTION_READINESS_FAILED');
        }
        row.stage = 'license-and-pids';
        assert.equal(active.exitCode, null); assert.equal(active.signalCode, null);
        await until(() => active.seen.has('LICENSE_VALID'));
        await until(async () => {
            try { const pids = JSON.parse(fs.readFileSync(path.join(data, 'pids.txt'))); return Array.isArray(pids) && pids.length === 3 && new Set(pids).size === 3 && pids.includes(active.pid) && pids.every(pid => Number.isSafeInteger(pid) && pid > 1); }
            catch { return false; }
        });
        const pidStat = fs.statSync(path.join(data, 'pids.txt'));
        assert.equal(pidStat.uid, process.getuid()); assert.equal(pidStat.mode & 0o077, 0);
        assert.equal(fs.existsSync(path.join(controller, 'pids.txt')), false);
        await enrollment.verify({ objects, config, app });
        await delay(1500);
        assert.equal(active.exitCode, null);
        assert.ok(!['TYPE_ERROR', 'REFERENCE_ERROR', 'PG_TRANSACTION', 'TLS_PROVISIONING', 'READ_ONLY_WRITE', 'PERMISSION_DENIED', 'UNCAUGHT_EXCEPTION', 'UNHANDLED_REJECTION', 'RUNTIME_ERROR_LOGGED'].some(code => active.seen.has(code)));
        assert.ok(fs.readFileSync(configFile).equals(configBytes));
        row.stage = 'complete';
        return active.pid;
    }
    await stage('production readiness reaches actual Admin HTTPS login redirect and strict unauthenticated UI status', async () => {
        await boot(); evidence.productionReadinessPassed = true;
    });
    await stage('actual adapter PID-writer lifecycle and clean controller restart retain readiness and enrollment', async () => {
        const previous = active.pid; await stop(active); assert.equal(active.exitCode, normalStop);
        const next = await boot(); assert.notEqual(next, previous); evidence.restartPassed = true;
    });
    await stage('final shutdown leaves exact admitted instance scope and unchanged signed application bytes', async () => {
        await stop(active); assert.equal(active.exitCode, normalStop);
        await enrollment.verify({ objects, config, app });
        assert.ok(JSON.stringify(contentRows(app)) === JSON.stringify(before));
        evidence.sourceAppBytesUnchanged = true;
        evidence.readinessSourceSha256 = sha(fs.readFileSync(path.resolve(__dirname, '../../tools/system/onboard-ui.cjs')));
    });
});
