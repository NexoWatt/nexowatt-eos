'use strict';
// Explicit integration: actual unsigned six-own-adapter candidate/controller over native PostgreSQL.
// No adapter, HTTP, TLS, PostgreSQL or license implementation is mocked.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn, spawnSync } = require('node:child_process');
const bootstrap = require('../../runtime/bootstrap/initialize.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const ownEnrollment = require('../../runtime/bootstrap/own-adapter-enrollment.cjs');
const { LeaseObserver } = require('./lease-observer.cjs');
const currentReadiness = require('../../tools/system/onboard-ui.cjs');
const { loadFixture } = require('./fixture.cjs');
const { inventoryTree } = require('../../runtime/postgresql/integration.cjs');
const root = process.env.EOS_OWN_ADAPTERS_LAB_ROOT;
if (!root || !path.isAbsolute(root) || fs.realpathSync(root) !== root || process.getuid?.() === 0 || process.env.EOS_TEST_PG_FRESH !== '1') throw new Error('MANAGEMENT_EXPLICIT_NATIVE_LAB_REQUIRED');
const fixture = loadFixture(root, process.getuid());
const app = fixture.app;
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
    for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
        child.output = (child.output + bytes).slice(-1048576);
        for (const code of require('../integration-management/runtime-log.cjs').indicators(child.output)) child.seen.add(code);
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
async function connect(Client, connection, change = () => {}) {
    return new Promise((resolve, reject) => {
        let client; const timer = setTimeout(() => { void client?.destroy().catch(() => {}); reject(new Error('MANAGEMENT_CLIENT_TIMEOUT')); }, 8000);
        try { client = new Client({ connection, logger: silent, connected: () => { clearTimeout(timer); resolve(client); }, disconnected: () => {}, change }); }
        catch { clearTimeout(timer); reject(new Error('MANAGEMENT_CLIENT_FAILED')); }
    });
}
async function until(check, budget = 15000, code = 'MANAGEMENT_DEADLINE') {
    const end = Date.now() + budget;
    while (!await check()) { if (Date.now() >= end) fail(code); await delay(100); }
}
function contentRows(directory) { return inventoryTree(directory).map(({ mode, ...row }) => row); }
async function observation(probe, ca) {
    const started = Date.now();
    const results = await Promise.allSettled([8081, 8188].map(port => probe(port, ca)));
    const detail = (result, port) => result.status === 'fulfilled' ? null : require('../integration-r9/diagnostics.cjs').probeFailure(result.reason, port);
    return { elapsedMs: Date.now() - started, admin: results[0].status === 'fulfilled', ui: results[1].status === 'fulfilled',
        adminFailure: detail(results[0], 8081), uiFailure: detail(results[1], 8188) };
}

test('actual prepared six-own-adapter controller: native PostgreSQL, HTTPS, central NWL3 license and immutable EOS admission', { timeout: 830000 }, async t => {
    assert.equal(process.version, 'v24.21.0');
    const children = [], clients = [], evidence = { schemaVersion: 1, kind: 'eos-own-adapters-native-management', sourceReleaseId: fixture.previousReleaseId,
        sourceSequence: 12, targetSequence: 13, sourceCommit: fixture.sourceCommit, fixtureReleaseId: fixture.releaseId,
        appContentSha256: fixture.appContentSha256, nodeVersion: process.versions.node, sequence: 13, licenseFormat: 'NWL3', passed: false,
        signed: false, unsignedFixture: true, hardwareTested: false, checks: {}, candidateSigned: false, fixedRootOwnedEosPaths: true, nativePostgresql: '17.11', node: process.version, hostArch: process.arch, signedPayloadPlatform: 'linux-arm64',
        candidateAppBytesUnchanged: false, lifecycleScriptsExecuted: false, nativeModulesRebuilt: false, mockedRuntimeDependencies: false,
        ownDeviceAdapterProcessesStarted: false, physicalHardwareConnected: false, physicalCommandsSent: false, actualSystemdMountPolicy: false, physicalPiAcceptance: false, productionReleaseApproved: false,
        managementReadinessPassed: false, restartPassed: false, boots: [], stages: [], bootstrapSteps: [], finalSteps: [] };
    let active, servicePassword, licenseUuid, activeLog, activeBoot, runtimeDiagnostics, licenseSession, migrationPlan;
    let expectedEdition = null;
    function checkRuntime(phase) {
        if (!activeLog || !activeBoot) return;
        require('./runtime-diagnostics.cjs').recordScan(activeBoot, phase, activeLog.scan(), runtimeDiagnostics);
        const runtimeCodes = new Set([...active.seen, ...activeBoot.runtimeLog.indicators]);
        if (['TYPE_ERROR', 'REFERENCE_ERROR', 'PG_TRANSACTION', 'TLS_PROVISIONING', 'READ_ONLY_WRITE', 'PERMISSION_DENIED',
            'UNCAUGHT_EXCEPTION', 'UNHANDLED_REJECTION', 'RUNTIME_ERROR_LOGGED'].some(code => runtimeCodes.has(code))) fail('MANAGEMENT_RUNTIME_ERROR');
    }
    t.after(async () => {
        let logFailure;
        try { checkRuntime('cleanup-before-stop'); }
        catch (error) { logFailure = require('../integration-r9/diagnostics.cjs').stageFailure(error); evidence.logReadFailure = logFailure; }
        for (const child of children) await stop(child);
        try { checkRuntime('cleanup-after-stop'); }
        catch (error) { logFailure = require('../integration-r9/diagnostics.cjs').stageFailure(error); evidence.logReadFailure = logFailure; }
        await Promise.allSettled(clients.map(client => client.destroy()));
        evidence.runtimeIndicators = [...new Set(children.flatMap(child => [...child.seen]))].sort();
        evidence.processIndicators = children.map(child => ({ scope: child.evidenceScope || 'unknown', indicators: [...child.seen].sort() }));
        evidence.adapterProcessDiagnostics = children.filter(child => child.evidenceScope === 'controller')
            .map(child => require('./readiness-diagnostics.cjs').processSummary(child.output));
        if (logFailure) evidence.passed = false;
        fs.writeFileSync(path.join(root, 'own-adapters-native-evidence.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
        if (logFailure) fail(logFailure);
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
    const recordStep = async (rows, name, operation) => {
        const row = { name, passed: false, failureCode: null }; rows.push(row);
        try { const result = await operation(); row.passed = true; return result; }
        catch (error) { row.failureCode = require('../integration-r9/diagnostics.cjs').stageFailure(error); throw error; }
    };
    const bootstrapStep = (name, operation) => recordStep(evidence.bootstrapSteps, name, operation);
    const finalStep = (name, operation) => recordStep(evidence.finalSteps, name, operation);
    const before = contentRows(app), appRequire = createRequire(path.join(app, 'package.json'));
    ownEnrollment.pinnedAdapters(app);
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
    const runtimeLogDirectory = path.join(data, 'management-private-logs');
    fs.mkdirSync(runtimeLogDirectory, { mode: 0o700 });
    config.log = require('../integration-management/runtime-log.cjs').loggerConfiguration(runtimeLogDirectory);
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
    evidence.checks.postgresqlMtls = true;
    const configBytes = Buffer.from(JSON.stringify(config)), configFile = path.join(data, 'iobroker.json');
    fs.writeFileSync(configFile, configBytes, { mode: 0o400, flag: 'wx' });
    assert.throws(() => fs.accessSync(configFile, fs.constants.W_OK), { code: 'EACCES' });
    assert.equal(fs.statSync(app).uid, 0);
    assert.throws(() => fs.accessSync(app, fs.constants.W_OK), { code: 'EACCES' });
    // Match the product's immutable application before even ordinary setup.
    // Upstream's optional root launchers must encounter its noncritical EACCES
    // path; neither setup nor uploads may alter the prepared candidate inventory.
    // Root fixture already installed this exact candidate read-only. The test UID cannot chmod it.
    assert.equal(fs.statSync(path.join(controller, 'eos-test-profile.json')).uid, 0);
    assert.throws(() => fs.writeFileSync(path.join(controller, 'pids.txt'), '[]', { flag: 'wx' }), { code: 'EACCES' });
    // Root-managed production configuration is represented by denied writes.
    // No NODE_PATH/NODE_OPTIONS/preload or TLS disable switch reaches children.
    const options = { cwd: app, env: require('../integration-management/environment.cjs').productEnvironment() };
    const cli = async (args, budget = 150000) => {
        const child = launch([path.join(controller, 'iobroker.js'), ...args], options); children.push(child);
        child.evidenceScope = args[0] === 'setup' ? 'cli-setup' : args[0] === 'backup' ? 'cli-backup' : 'cli-upload';
        const timer = setTimeout(() => signalGroup(child, 'SIGTERM'), budget);
        const hard = setTimeout(() => signalGroup(child, 'SIGKILL'), budget + 5000);
        try {
            const exitCode = await child.completion;
            if (args[0] === 'backup') {
                evidence.backupCli = evidence.backupCli || [];
                const diagnostics = require('./backup-diagnostics.cjs');
                const summary = diagnostics.cliSummary(child.output, exitCode, child.signalCode);
                evidence.backupCli.push(summary);
                diagnostics.assertSuccessfulBackup(summary);
            }
            if (exitCode !== 0) fail('MANAGEMENT_CLI_FAILED');
        }
        finally { clearTimeout(timer); clearTimeout(hard); }
        assert.ok(fs.readFileSync(configFile).equals(configBytes));
    };
    await stage('ordinary setup loads actual PostgreSQL wrappers with read-only config', () => cli(['setup'], 45000));
    const objects = await connect(appRequire('@iobroker/db-objects-postgresql').Client, config.objects); clients.push(objects);
    const states = await connect(appRequire('@iobroker/db-states-postgresql').Client, config.states); clients.push(states);
    const leaseObserver = new LeaseObserver(ownEnrollment.SPECS.filter(spec => spec.name !== 'eos-admin').map(spec => spec.name));
    const observer = await connect(appRequire('@iobroker/db-states-postgresql').Client, config.states, (id, message) => leaseObserver.observe(id, message)); clients.push(observer);
    for (const spec of ownEnrollment.SPECS.filter(spec => spec.name !== 'eos-admin'))
        await observer.subscribeMessage('system.adapter.' + spec.name + '.0');
    const pinned = bootstrap.readPinnedApp(fixture.baselineApp);
    const verifyFresh = () => bootstrap.initialize({ objects, states, config, ...pinned, verifyOnly: true });
    await stage('production first-run bootstrap creates historical two-adapter migration baseline', async () => {
        await bootstrapStep('fresh-instance-count', async () => {
            const rows = (await objects.getObjectViewAsync('system', 'instance', {})).rows;
            evidence.initialInstanceCount = Array.isArray(rows) && rows.length <= 10000 ? rows.length : null;
            assert.equal(evidence.initialInstanceCount, 0);
        });
        await bootstrapStep('production-initialize', () => bootstrap.initialize({ objects, states, config, ...pinned }));
        servicePassword = crypto.randomBytes(32).toString('base64url');
        const passwordHash = await bootstrapStep('password-hash', () => enrollment.passwordHash(servicePassword));
        await bootstrapStep('production-enrollment', () => enrollment.enrollFirstRun({ objects, states, config, app: fixture.baselineApp, passwordHash, verifyFresh,
            settings: { siteName: 'Native management laboratory', language: 'de', timeZone: 'Europe/Berlin', licenseMode: 'unlicensed',
                deviceMode: 'disabled-pending-acceptance', safetyAcknowledged: true, plant: { mode: 'deferred', reason: 'no-plant-connected' },
                devicePlan: { status: 'none', devices: [], confirmed: true } } }));
        const uuid = await bootstrapStep('license-uuid-read', async () => (await objects.getObjectAsync('system.meta.uuid')).native.uuid);
        licenseUuid = uuid;
        const core = appRequire('iobroker.eos-admin/build/lib/eosLicenseCore.js');
        const issuer = await bootstrapStep('license-issuer-read', async () => fs.readFileSync(path.join(root, 'ephemeral-license-issuer.pem')));
        licenseSession = await require('../integration-r9/license-session.cjs').createSession({ core, uuid, issuer, ca: fs.readFileSync('/etc/nexowatt-eos/web/ca.crt'), password: servicePassword });
        // No initial license is written: activation must traverse the real authenticated HTTP API.
    });
    await stage('historical management bootstrap migrates to six own adapters and asset-only upload preserves enrollment', async () => {
        // Historical fresh-baseline uploads happen before any migration plan.
        // The live six-adapter path must never call upload NAME: that CLI also
        // rewrites instance metadata and would invalidate exact rollback.
        for (const spec of enrollment.SPECS) await cli(['upload', spec.name]);
        for (const spec of enrollment.SPECS) {
            const id = `system.adapter.${spec.name}.0`, doc = await objects.getObjectAsync(id);
            doc.common.enabled = true; await objects.setObjectAsync(id, doc);
        }
        await enrollment.verify({ objects, config, app: fixture.baselineApp });
        const sourceReleaseId = fixture.previousReleaseId, targetReleaseId = fixture.releaseId;
        const input = { objects, states, config, sourceApp: fixture.baselineApp, targetApp: app, sourceReleaseId, targetReleaseId };
        let plan = await ownEnrollment.planMigration(input);
        const checkpoint = async value => {
            const file = path.join(root, 'own-enrollment-private-journal.json');
            const fd = fs.openSync(file, 'w', 0o600);
            try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        };
        await ownEnrollment.applyMigration({ ...input, plan, checkpoint });
        await ownEnrollment.rollbackMigration({ ...input, plan });
        await enrollment.verify({ objects, config, app: fixture.baselineApp });
        plan = await ownEnrollment.planMigration(input);
        await ownEnrollment.applyMigration({ ...input, plan, checkpoint });
        migrationPlan = plan;
        const uploaded = await require('../../runtime/bootstrap/upload-own-assets.cjs').uploadAssets({ objects, states, config, app });
        assert.equal(uploaded.ok, true); assert.equal(uploaded.code, 'OWN_ASSETS_VERIFIED'); assert.equal(uploaded.adapters, 6);
        assert.equal(uploaded.instancesAndMarkersUnchanged, true); assert.equal(uploaded.unrelatedFilesPreserved, true);
        assert.ok(Number.isSafeInteger(uploaded.files) && uploaded.files > 0 && Number.isSafeInteger(uploaded.bytes) && uploaded.bytes > 0);
        evidence.assetUpload = { adapters: uploaded.adapters, files: uploaded.files, bytes: uploaded.bytes,
            instancesAndMarkersUnchanged: true, unrelatedFilesPreserved: true };
        evidence.checks.assetOnlyUploadPreservesEnrollment = true;
        await ownEnrollment.verify({ objects, config, app });
        evidence.checks.nativeEnrollmentAndPrestartRollback = true;
    });
    const ca = fs.readFileSync('/etc/nexowatt-eos/web/ca.crt');
    const normalStop = appRequire('@iobroker/js-controller-common').EXIT_CODES.JS_CONTROLLER_STOPPED;
    async function boot() {
        const startedAt = Date.now(), row = { stage: 'controller', productionProbe: null };
        evidence.boots.push(row);
        activeBoot = row;
        runtimeDiagnostics = new (require('./runtime-diagnostics.cjs').RuntimeDiagnostics)();
        activeLog = new (require('../integration-management/runtime-log.cjs').RuntimeLog)(runtimeLogDirectory, text => runtimeDiagnostics.observe(text));
        active = launch([path.join(controller, 'controller.js')], options); children.push(active);
        active.evidenceScope = 'controller';
        await bootstrap.waitController({ objects, states, config, controllerPid: active.pid, timeoutMs: 30000, pollMs: 100 });
        row.coreReadyMs = Date.now() - startedAt;
        row.stage = 'adapters';
        await currentReadiness.waitAdapters(states, startedAt);
        await until(async () => {
            row.adapterReadiness = await require('./readiness-diagnostics.cjs').adapterSnapshot(states, startedAt);
            return row.adapterReadiness.every(adapter => adapter.aliveFresh);
        }, 45000, 'OWN_NATIVE_ALL_ALIVE_DEADLINE');
        row.adaptersAliveMs = Date.now() - startedAt;
        row.stage = 'https';
        const production = await observation(currentReadiness.probeWeb, ca);
        row.productionProbe = production;
        row.productionReadyMs = Date.now() - startedAt;
        if (!production.admin || !production.ui) fail('MANAGEMENT_PRODUCTION_READINESS_FAILED');
        row.stage = 'authenticated-license';
        assert.equal(active.exitCode, null); assert.equal(active.signalCode, null);
        row.license = await licenseSession.status();
        assert.equal(row.license.valid, expectedEdition !== null);
        assert.equal(row.license.edition, expectedEdition);
        row.stage = 'pids';
        await until(async () => {
            try {
                const pids = JSON.parse(fs.readFileSync(path.join(data, 'pids.txt')));
                const adapterStates = await Promise.all(ownEnrollment.SPECS.map(spec => states.getState(`system.adapter.${spec.name}.0.sigKill`)));
                const expected = [active.pid, ...adapterStates.map(state => state?.ack === true ? state.val : null)];
                return Array.isArray(pids) && pids.length === 7 && new Set(pids).size === 7 && new Set(expected).size === 7 && expected.every(pid => pids.includes(pid)) &&
                    pids.every(pid => { if (!Number.isSafeInteger(pid) || pid < 2) return false; process.kill(pid, 0); return true; });
            }
            catch { return false; }
        }, 15000, 'MANAGEMENT_PID_DEADLINE');
        row.pids = { count: 7, currentControllerAndAdmittedAdapters: true, allAlive: true };
        const pidStat = fs.statSync(path.join(data, 'pids.txt'));
        assert.equal(pidStat.uid, process.getuid()); assert.equal(pidStat.mode & 0o077, 0);
        assert.equal(fs.existsSync(path.join(controller, 'pids.txt')), false);
        await ownEnrollment.verify({ objects, config, app });
        await delay(1500);
        assert.equal(active.exitCode, null);
        row.stage = 'runtime-errors'; checkRuntime('boot-ready');
        assert.ok(row.runtimeLog.bytesRead > 0);
        assert.ok(fs.readFileSync(configFile).equals(configBytes));
        row.stage = 'complete';
        return active.pid;
    }
    await stage('production readiness reaches actual Admin HTTPS login redirect and strict unauthenticated UI status', async () => {
        await boot(); evidence.managementReadinessPassed = true;
    });
    await stage('authenticated Admin serves exact current configuration assets for all four additional adapters', async () => {
        const { ASSETS, verifyAdminAssets } = require('./admin-assets.cjs');
        evidence.adminAssets = await verifyAdminAssets({ ca, password: servicePassword, expected: ASSETS.map(row => ({ ...row,
            sha256: sha(fs.readFileSync(path.join(app, 'node_modules/iobroker.' + row.name, 'admin', row.file))) })) });
        evidence.checks.allOwnAdapterConfigurationAssets = true;
    });
    async function waitUiLicense(valid, edition, chargePoints, batteries) {
        const expectedUiEdition = edition === 'home' ? 'hems' : edition === 'pro' ? 'eos' : 'none';
        // State observation deliberately does not invoke UI HTTP refresh: this proves the
        // adapter's real periodic lease/lifecycle path recovers without a restart.
        await until(async () => {
            const values = await Promise.all(['valid', 'edition', 'maxWallboxes', 'maxStorages'].map(key => states.getState('nexowatt-ui.0.license.' + key)));
            return values.every(state => state?.ack === true) && values[0].val === valid && values[1].val === expectedUiEdition
                && values[2].val === chargePoints && values[3].val === batteries;
        }, 20000, 'OWN_NATIVE_UI_LEASE_DEADLINE');
    }
    async function waitOwnAdapters(valid, edition) {
        await until(() => leaseObserver.matches(valid, edition), 22000, 'OWN_NATIVE_ALL_LEASES_DEADLINE');
        const expectedOcpp = valid ? 'awaiting_transport_enrollment' : 'awaiting_license';
        await until(async () => (await states.getState('ocpp21.0.info.runtimeState'))?.val === expectedOcpp,
            22000, 'OWN_NATIVE_OCPP_STATUS_DEADLINE');
        const expectedBackup = valid ? 'ready' : 'waiting_license';
        await until(async () => {
            const state = await states.getState('nexowatt-backup.0.info.runtimeState');
            return state?.ack === true && state.val === expectedBackup;
        }, 22000, 'OWN_NATIVE_BACKUP_READINESS_DEADLINE');
        evidence.checks.backupAdapterReadiness = true;
        for (const spec of ownEnrollment.SPECS) {
            const alive = await states.getState(`system.adapter.${spec.name}.0.alive`);
            assert.equal(alive?.val, true);
        }
        for (const name of ['nexowatt-devices', 'eebus', 'ocpp21']) {
            const connection = await states.getState(name + '.0.info.connection');
            assert.equal(connection?.val, false);
        }
        if (valid) {
            await until(async () => fs.existsSync(path.join(data, 'nexowatt-backup/backups')), 20000, 'OWN_NATIVE_BACKUP_START_DEADLINE');
            for (const file of ['nexowatt-backup', 'nexowatt-backup/backups']) {
                const st = fs.lstatSync(path.join(data, file));
                assert.ok(st.isDirectory() && !st.isSymbolicLink());
                assert.equal(st.uid, process.getuid()); assert.equal(st.mode & 0o777, 0o700);
            }
            const system = await objects.getObjectAsync('system.config');
            assert.match(system?.native?.secret || '', /^(?:[0-9a-fA-F]{2}){16,64}$/);
            evidence.checks.backupPrivatePathAndHostSecret = true;
        }
        evidence.leasePhases ||= [];
        evidence.leasePhases.push({ valid, edition, grantsObservedFor: leaseObserver.names,
            noPhysicalTargetsConfigured: true, ocppRuntimeState: expectedOcpp, backupRuntimeState: expectedBackup });
        checkRuntime(!valid ? 'lease-unlicensed' : edition === 'home' ? 'lease-home' : 'lease-pro');
    }
    await stage('real EOS platform gate rejects the packaged client outside its admitted process', async () => {
        const source = `try { require(process.argv[1]).assertEosPlatform('nexowatt-ui'); process.exitCode = 9; } catch (error) { if (error.code === 'EOS_PLATFORM_ENTRY') process.stdout.write('EOS_PLATFORM_ENTRY'); else process.exitCode = 10; }`;
        const result = spawnSync(process.execPath, ['-e', source, path.join(app, 'node_modules/iobroker.nexowatt-ui/packages/eos-license-client')],
            { env: require('../integration-management/environment.cjs').productEnvironment(), encoding: 'utf8', timeout: 5000, maxBuffer: 4096 });
        assert.equal(result.status, 0); assert.equal(result.stdout, 'EOS_PLATFORM_ENTRY');
        evidence.checks.platformDeniesUnadmittedProcess = true;
    });
    await stage('unlicensed native startup retains authenticated central activation and denies UI operation', async () => {
        await waitUiLicense(false, null, 0, 0);
        await waitOwnAdapters(false, null);
        const status = await licenseSession.status();
        assert.equal(status.valid, false); assert.equal(status.code, 'LICENSE_MISSING');
        const ui = await licenseSession.uiInfo(); assert.equal(ui.valid, false);
        evidence.checks.initiallyUnlicensed = true; evidence.checks.adminHttpsLogin = true; evidence.checks.uiHttpsLogin = true;
        evidence.unlicensedStartup = { centralAdminReachable: true, uiDenied: true, noLocalKey: true };
    });
    await stage('central HTTPS NWL3 Home activation propagates policy three/two quota lease without restart', async () => {
        const pid = active.pid; leaseObserver.reset();
        const status = await licenseSession.activate('home');
        await waitUiLicense(true, 'home', 3, 2);
        await waitOwnAdapters(true, 'home');
        const ui = await licenseSession.uiInfo('home');
        const features = await licenseSession.uiFeatures('home');
        assert.equal(active.pid, pid); assert.equal(active.exitCode, null);
        evidence.checks.homeActivation = true; evidence.checks.homeQuotas = true; evidence.checks.rootOwnedEosAdmission = true;
        evidence.home = { status, ui, features, controllerUnchanged: true };
        expectedEdition = 'home';
    });
    await stage('central removal revokes the actual UI lease and quota states without restarting services', async () => {
        const pid = active.pid; leaseObserver.reset();
        const status = await licenseSession.remove();
        await waitUiLicense(false, null, 0, 0);
        await waitOwnAdapters(false, null);
        const ui = await licenseSession.uiInfo(); assert.equal(ui.valid, false);
        assert.equal(active.pid, pid); assert.equal(active.exitCode, null);
        evidence.checks.centralRevocation = true;
        evidence.revocation = { status, uiDenied: true, controllerUnchanged: true };
        expectedEdition = null;
    });
    await stage('central HTTPS NWL3 Pro reactivation propagates policy fifty/ten quotas and Pro features', async () => {
        const pid = active.pid; leaseObserver.reset();
        const status = await licenseSession.activate('pro');
        await waitUiLicense(true, 'pro', 50, 10);
        await waitOwnAdapters(true, 'pro');
        const ui = await licenseSession.uiInfo('pro');
        const features = await licenseSession.uiFeatures('pro');
        assert.equal(active.pid, pid); assert.equal(active.exitCode, null);
        evidence.checks.proReactivation = true; evidence.checks.proQuotas = true;
        evidence.pro = { status, ui, features, controllerUnchanged: true };
        expectedEdition = 'pro';
    });
    await stage('actual controller CLI creates private logical archives without changing immutable app or recursively including archives', async () => {
        const canaryId = '0_userdata.0.eosNativeBackupCanary', canaryValue = crypto.randomBytes(24).toString('hex');
        await objects.setObjectAsync(canaryId, { _id: canaryId, type: 'state', common: {
            name: 'Native backup export verification', type: 'string', role: 'text', read: true, write: false }, native: {} });
        await states.setState(canaryId, { val: canaryValue, ack: true, from: 'system.host.eos-management-lab' });
        const directory = path.join(data, 'nexowatt-backup/backups');
        const beforeArchives = new Set(fs.readdirSync(directory));
        // Reuse an existing least-privilege connection; diagnostics must not
        // consume another connection slot or reveal sessions/roles/SQL text.
        try {
            evidence.backupDatabaseCapacity = await require('./backup-diagnostics.cjs').readDatabaseCapacity(objects.store);
        } catch { evidence.backupDatabaseCapacity = { available: false }; }
        assert.equal(evidence.backupDatabaseCapacity.available, true);
        assert.equal(evidence.backupDatabaseCapacity.maximum, 128);
        assert.equal(evidence.backupDatabaseCapacity.superuserReserved, 3);
        assert.equal(evidence.backupDatabaseCapacity.roleReserved, 0);
        await cli(['backup'], 90000);
        checkRuntime('backup-first');
        const first = fs.readdirSync(directory).filter(name => !beforeArchives.has(name));
        assert.equal(first.length, 1);
        // A second actual archive proves existing archives are excluded rather
        // than silently being recursively re-archived from the data tree.
        await delay(1100);
        await cli(['backup'], 90000);
        checkRuntime('backup-second');
        const archives = fs.readdirSync(directory).filter(name => !beforeArchives.has(name));
        assert.equal(archives.length, 2);
        const tar = appRequire('tar'), inspections = [];
        for (const name of archives) {
            assert.match(name, /^[A-Za-z0-9_.-]+\.tar\.gz$/);
            const file = path.join(directory, name), st = fs.lstatSync(file);
            assert.ok(st.isFile() && !st.isSymbolicLink() && st.size > 100);
            assert.equal(st.uid, process.getuid()); assert.equal(st.mode & 0o077, 0);
            inspections.push(await require('./archive-inspection.cjs').inspectArchive(tar, file, { canaryId, canaryValue,
                configSha256: sha(configBytes), requiredObjects: [ownEnrollment.MARKER, enrollment.MARKER, 'system.config',
                    ...ownEnrollment.SPECS.map(spec => `system.adapter.${spec.name}.0`)] }));
        }
        const stage = fs.lstatSync('/var/lib/nexowatt-eos/home/backup-stage');
        assert.ok(stage.isDirectory() && !stage.isSymbolicLink()); assert.equal(stage.uid, process.getuid()); assert.equal(stage.mode & 0o077, 0);
        evidence.checks.logicalBackupCreatedAndListed = true;
        evidence.logicalBackup = { archives: 2, privatePermissions: true, previousArchivesExcluded: true,
            nativeDatabaseExport: true, archiveContentsRead: true, inspections, restorePerformed: false, completeSystemBackup: false };
        checkRuntime('backup-inspected');
    });
    await stage('actual six-adapter stop, exact migration rollback and reapplication retain restart readiness', async () => {
        const previous = active.pid; checkRuntime('rollback-before-stop'); await stop(active); checkRuntime('rollback-after-stop'); assert.equal(active.exitCode, normalStop);
        const input = { objects, states, config, sourceApp: fixture.baselineApp, targetApp: app,
            sourceReleaseId: fixture.previousReleaseId, targetReleaseId: fixture.releaseId };
        await ownEnrollment.rollbackMigration({ ...input, plan: migrationPlan });
        await enrollment.verify({ objects, config, app: fixture.baselineApp });
        migrationPlan = await ownEnrollment.planMigration(input);
        await ownEnrollment.applyMigration({ ...input, plan: migrationPlan, checkpoint: async value => {
            const fd = fs.openSync(path.join(root, 'own-enrollment-poststart-private-journal.json'), 'wx', 0o600);
            try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        } });
        await require('../../runtime/bootstrap/upload-own-assets.cjs').uploadAssets({ objects, states, config, app });
        evidence.checks.nativePoststartEnrollmentRollback = true;
        leaseObserver.reset(); const next = await boot(); await waitOwnAdapters(true, 'pro'); assert.notEqual(next, previous); evidence.restartPassed = true; evidence.checks.restart = true;
    });
    await stage('final shutdown leaves exact admitted instance scope and unchanged six-own-adapter application bytes', async () => {
        await finalStep('controller-stop', async () => {
            checkRuntime('final-before-stop'); await stop(active); checkRuntime('final-after-stop');
            evidence.finalShutdown = { exitCode: Number.isInteger(active.exitCode) && active.exitCode >= 0 && active.exitCode <= 255 ? active.exitCode : null,
                signal: ['SIGTERM', 'SIGKILL'].includes(active.signalCode) ? active.signalCode : null };
            if (active.exitCode !== normalStop || active.signalCode !== null) fail('MANAGEMENT_CONTROLLER_STOP_FAILED');
        });
        await finalStep('enrollment-after-stop', () => ownEnrollment.verify({ objects, config, app }));
        await finalStep('prepared-app-content-inventory', async () => {
            evidence.finalInventory = require('../integration-r9/diagnostics.cjs').inventoryDifference(before, contentRows(app));
            if (!evidence.finalInventory.matches) fail('MANAGEMENT_APP_CHANGED');
        });
        evidence.candidateAppBytesUnchanged = true; evidence.checks.unchangedApp = true; evidence.checks.sixOwnAdapterProcesses = true; evidence.ownDeviceAdapterProcessesStarted = true;
        evidence.readinessSourceSha256 = sha(fs.readFileSync(path.resolve(__dirname, '../../tools/system/onboard-ui.cjs')));
    });
    evidence.passed = true;
});
