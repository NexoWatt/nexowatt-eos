#!/usr/bin/env node
'use strict';
// EOS-BASE-BOOTSTRAP-01: core-only commissioning. Never runs npm or starts adapters.
// Called after ordinary ioBroker setup in a fresh, isolated DB pair. Every failure
// blocks the host service; a matching pending marker allows an interrupted retry.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { validateConfig, readConfig } = require('../../security/verify-runtime-tls.cjs');
const databases = require('../transport/databases.cjs');
const PROFILE = 'eos-core-only-bootstrap-v1';
const MARKER = 'system.meta.eosTestBase';
const BOOTSTRAP_POLICY_VERSION = 1;
const CORE_CONTROLLER_VERSION = '7.2.2';
const MAX_OBJECTS = 512;
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(k => [k, () => {}]));
const fail = code => { throw new Error(code); };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');

function assertRuntimeConfig(config) {
    const databaseBackend = databases.backend(config);
    if (databaseBackend === 'postgresql') databases.validatePostgresql(config);
    else if (!validateConfig(config).configurationMatchesProfile) fail('TLS_CONFIG_REJECTED');
    if (databaseBackend === 'redis' && (config.objects.host !== '127.0.0.1' || config.states.host !== '127.0.0.1' ||
        config.objects.port === config.states.port)) fail('LOCAL_SEPARATE_STORES_REQUIRED');
    if (!object(config.multihostService) || config.multihostService.enabled !== false) fail('MULTIHOST_MUST_BE_DISABLED');
    if (!object(config.plugins) || Object.keys(config.plugins).some(k => k !== 'sentry') ||
        config.plugins.sentry?.enabled !== false) fail('PLUGINS_MUST_BE_DISABLED');
    if (!object(config.system) || typeof config.system.hostname !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(config.system.hostname)) fail('EXPLICIT_SAFE_HOSTNAME_REQUIRED');
    if (config.system.compact !== false || config.system.allowShellCommands !== false) {
        fail('UNSUPPORTED_SYSTEM_OPTION');
    }
    for (const name of databaseBackend === 'redis' ? ['objects', 'states'] : []) {
        const db = config[name]; const options = db.options;
        if (db.port < 1024 || !Number.isInteger(options.connectTimeout) || options.connectTimeout < 1 || options.connectTimeout > 5000 ||
            !Number.isInteger(options.commandTimeout) || options.commandTimeout < 1 || options.commandTimeout > 5000 ||
            !Number.isInteger(options.maxRetriesPerRequest) || options.maxRetriesPerRequest < 0 || options.maxRetriesPerRequest > 1 ||
            options.enableOfflineQueue !== false || options.username !== 'eos-runtime' ||
            db.connectTimeout !== undefined && (!Number.isInteger(db.connectTimeout) || db.connectTimeout < 1 || db.connectTimeout > 10000)) {
            fail('UNBOUNDED_DATABASE_OPTIONS');
        }
    }
    return config;
}

function readPinnedApp(app) {
    app = fs.realpathSync(app);
    const load = name => readConfig(path.join(app, name));
    const pkg = load('package.json');
    const lock = load('package-lock.json');
    const controller = load('node_modules/iobroker.js-controller/package.json');
    if (pkg.dependencies?.['iobroker.js-controller'] !== '7.2.2' || controller.version !== '7.2.2' ||
        lock.packages?.['node_modules/iobroker.js-controller']?.version !== '7.2.2') fail('CONTROLLER_VERSION_MISMATCH');
    const profile = load('node_modules/iobroker.js-controller/eos-test-profile.json');
    if (profile.schemaVersion !== 1 || profile.kind !== 'eos-controller-test-profile' || profile.controllerVersion !== CORE_CONTROLLER_VERSION ||
        !Array.isArray(profile.adapters) || profile.adapters.length > 128) fail('CONTROLLER_PROFILE_REQUIRED');
    const iopkg = load('node_modules/iobroker.js-controller/io-package.json');
    if (!Array.isArray(iopkg.objects) || !iopkg.objects.every(o => typeof o?._id === 'string')) fail('INVALID_CONTROLLER_BASELINE');
    return { app, defaults: iopkg.objects.map(o => o._id), controllerVersion: controller.version, pluginRegistrationDisabled: true,
        appLockSha256: hash(fs.readFileSync(path.join(app, 'package-lock.json'))) };
}

async function snapshot(objects) {
    const result = await objects.getObjectListAsync({ startkey: '', endkey: '\uffff', include_docs: true });
    if (!Array.isArray(result?.rows) || result.rows.length > MAX_OBJECTS) fail('NOT_FRESH_CORE_DATABASE');
    const records = new Map();
    for (const row of result.rows) {
        const doc = row.doc || row.value;
        const id = row.id || doc?._id;
        if (typeof id !== 'string' || records.has(id) || !object(doc) || doc._id !== id) fail('INVALID_DATABASE_OBJECT');
        records.set(id, structuredClone(doc));
    }
    return records;
}

function assertScope(records, defaults, hostname) {
    const allowed = new Set([...defaults, 'system.user.admin', 'system.meta.uuid', MARKER]);
    const host = `system.host.${hostname}`;
    for (const [id, doc] of records) {
        if ((!allowed.has(id) && id !== host && !id.startsWith(host + '.')) || doc.type === 'instance') {
            fail('EXISTING_RUNTIME_OR_ADAPTERS_FORBIDDEN');
        }
        if (id.startsWith('system.user.') && id !== 'system.user.admin') fail('EXISTING_USERS_FORBIDDEN');
    }
    for (const id of ['system.config', 'system.repositories', 'system.user.admin', 'system.meta.uuid']) {
        if (!records.has(id)) fail('ORDINARY_SETUP_REQUIRED');
    }
    if (records.get('system.config').type !== 'config' || records.get('system.repositories').type !== 'config' ||
        records.get('system.user.admin').type !== 'user') fail('INVALID_CORE_OBJECT_TYPE');
}

function assertHardened(records, hostname) {
    const common = records.get('system.config')?.common;
    const repos = records.get('system.repositories')?.native;
    const admin = records.get('system.user.admin')?.common;
    if (common?.diag !== 'none' || !Array.isArray(common.activeRepo) || common.activeRepo.length ||
        common.adapterAutoUpgrade?.defaultPolicy !== 'none' || !object(common.adapterAutoUpgrade.repositories) ||
        Object.keys(common.adapterAutoUpgrade.repositories).length) fail('SYSTEM_POLICY_DRIFT');
    if (!object(repos?.repositories) || Object.keys(repos.repositories).length ||
        !object(repos.oldRepositories) || Object.keys(repos.oldRepositories).length) fail('REPOSITORY_POLICY_DRIFT');
    if (admin?.enabled !== false || admin.password !== '') fail('ADMIN_ACCOUNT_POLICY_DRIFT');
}

async function initialize({ objects, states, config, defaults, appLockSha256, controllerVersion = CORE_CONTROLLER_VERSION, pluginRegistrationDisabled = false, verifyOnly = false, app }) {
    assertRuntimeConfig(config);
    if (!/^[a-f0-9]{64}$/.test(appLockSha256) || !Array.isArray(defaults)) fail('INVALID_BOOTSTRAP_INPUT');
    const hostname = config.system.hostname;
    if (controllerVersion !== CORE_CONTROLLER_VERSION) fail('CONTROLLER_VERSION_MISMATCH');
    // Data-policy identity survives an additive signed release. The host gate verifies
    // every immutable package byte and same controller before activation. This marker
    // is not a substitute for that release signature and records the initial lock only.
    const binding = { profile: PROFILE, coreControllerVersion: CORE_CONTROLLER_VERSION, bootstrapPolicyVersion: BOOTSTRAP_POLICY_VERSION,
        runtimeConfigSha256: hash(JSON.stringify(config)) };
    // An enrolled laboratory UI is checked against a separate, fixed policy.
    // Its marker alone cannot admit packages: the signed controller profile and
    // exact installed package identities are checked again by enrollment.verify.
    if (app && await objects.getObjectAsync('system.meta.eosEnrollment')) {
        const pluginState = await states.getState(`system.host.${hostname}.plugins.sentry.enabled`);
        if (pluginState == null ? pluginRegistrationDisabled !== true : pluginState.val !== false) fail('PLUGIN_STATE_DRIFT');
        return require('./enrollment.cjs').verify({ objects, config, app });
    }
    let records = await snapshot(objects);
    assertScope(records, defaults, hostname);
    const marker = records.get(MARKER);
    if (marker && (!object(marker.native) || Object.entries(binding).some(([k, v]) => marker.native[k] !== v) ||
        !['pending', 'complete'].includes(marker.native.state) || !/^[a-f0-9]{64}$/.test(marker.native.creationAppLockSha256 || ''))) fail('BOOTSTRAP_MARKER_MISMATCH');
    if (verifyOnly || marker?.native.state === 'complete') {
        if (marker?.native.state !== 'complete') fail('BOOTSTRAP_NOT_COMPLETE');
        assertHardened(records, hostname);
        const pluginState = await states.getState(`system.host.${hostname}.plugins.sentry.enabled`);
        // The signed EOS profile removes all controller/CLI plugin registration.
        // Its host cleanup then deletes Sentry's no-longer-applicable state. Only
        // that verified code profile may treat an absent state as disabled.
        if (pluginState == null ? pluginRegistrationDisabled !== true : pluginState.val !== false) fail('PLUGIN_STATE_DRIFT');
        return { status: 'CORE_POLICY_VERIFIED', profile: PROFILE, adaptersEnabled: 0, adminLoginEnabled: false };
    }
    const liveHosts = await states.getKeys('system.host.*.alive');
    if (!Array.isArray(liveHosts) || liveHosts.length > 32) fail('HOST_STATE_INVALID');
    for (const id of liveHosts) {
        if ((await states.getState(id))?.val === true) fail('CONTROLLER_MUST_BE_STOPPED');
    }
    const stamp = () => ({ from: 'system.host.eos-bootstrap', ts: Date.now() });
    await objects.setObjectAsync(MARKER, { _id: MARKER, type: 'meta', common: { name: 'EOS core bootstrap', type: 'meta.user' },
        native: { ...binding, creationAppLockSha256: marker?.native.creationAppLockSha256 || appLockSha256, state: 'pending' }, ...stamp() });
    const systemConfig = records.get('system.config');
    systemConfig.common = { ...systemConfig.common, diag: 'none', activeRepo: [],
        adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } };
    const repositoryConfig = records.get('system.repositories');
    repositoryConfig.native = { ...repositoryConfig.native, repositories: {}, oldRepositories: {} };
    const admin = records.get('system.user.admin');
    // No default password survives. Core-only delivery has no login UI; future
    // onboarding must explicitly provision a unique credential before enabling it.
    admin.common = { ...admin.common, enabled: false, password: '' };
    for (const doc of [systemConfig, repositoryConfig, admin]) {
        Object.assign(doc, stamp());
        await objects.setObjectAsync(doc._id, doc);
    }
    await states.setState(`system.host.${hostname}.plugins.sentry.enabled`, { val: false, ack: true, ...stamp() });
    records = await snapshot(objects);
    assertScope(records, defaults, hostname);
    assertHardened(records, hostname);
    await objects.setObjectAsync(MARKER, { _id: MARKER, type: 'meta', common: { name: 'EOS core bootstrap', type: 'meta.user' },
        native: { ...binding, creationAppLockSha256: marker?.native.creationAppLockSha256 || appLockSha256, state: 'complete' }, ...stamp() });
    return { status: 'CORE_INITIALIZED', profile: PROFILE, adaptersEnabled: 0, adminLoginEnabled: false };
}

async function waitController({ objects, states, config, controllerPid, timeoutMs = 30000, pollMs = 200 }) {
    if (!Number.isSafeInteger(controllerPid) || controllerPid < 2 || !Number.isInteger(timeoutMs) ||
        timeoutMs < 1 || timeoutMs > 30000 || !Number.isInteger(pollMs) || pollMs < 1 || pollMs > 1000) fail('INVALID_READINESS_OPTIONS');
    const prefix = `system.host.${config.system.hostname}`;
    const until = Date.now() + timeoutMs;
    do {
        const [alive, pid, host] = await Promise.all([states.getState(prefix + '.alive'), states.getState(prefix + '.pid'),
            objects.getObjectAsync(prefix)]);
        const now = Date.now();
        if (alive?.val === true && alive.ack === true && Number.isFinite(alive.ts) &&
            alive.ts <= now + 1000 && now - alive.ts < 30000 && pid?.val === controllerPid && pid.ack === true &&
            host?.type === 'host' && host.common?.installedVersion === '7.2.2') {
            return { status: 'CONTROLLER_READY', profile: PROFILE, controllerVersion: '7.2.2', heartbeatVerified: true, pidVerified: true };
        }
        if (now >= until) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, until - now)));
    } while (Date.now() <= until);
    fail('CONTROLLER_NOT_READY');
}

async function connect(Client, connection, clients) {
    return new Promise((resolve, reject) => {
        let client;
        const timeout = setTimeout(() => reject(new Error('DATABASE_CONNECT_TIMEOUT')), 5000);
        try {
            client = new Client({ connection: structuredClone(connection), logger: silent,
                connected: () => { clearTimeout(timeout); resolve(client); },
                disconnected: () => {}, change: () => {} });
            clients.push(client);
        } catch { clearTimeout(timeout); reject(new Error('DATABASE_CONNECT_FAILED')); }
    });
}

async function main(argv = process.argv.slice(2)) {
    const args = {};
    const clients = [];
    // Bounds the complete CLI process, including blocked DB commands or destroy.
    const deadline = setTimeout(() => { process.stdout.write('{"status":"REJECTED","code":"BOOTSTRAP_TIMEOUT"}\n'); process.exit(1); }, 45000);
    try {
        while (argv.length) {
            const key = argv.shift();
            if (key === '--verify-only' && args.verifyOnly === undefined) args.verifyOnly = true;
            else if (key === '--wait-controller' && args.waitController === undefined) args.waitController = true;
            else if (['--app', '--config', '--controller-pid'].includes(key) && !Object.hasOwn(args, key) && argv.length) args[key] = argv.shift();
            else fail('USAGE');
        }
        if (!args['--app'] || !args['--config'] || args.waitController && !/^[1-9][0-9]{0,9}$/.test(args['--controller-pid'] || '') ||
            !args.waitController && args['--controller-pid'] !== undefined || args.verifyOnly && args.waitController) fail('USAGE');
        const config = assertRuntimeConfig(readConfig(args['--config']));
        const pinned = readPinnedApp(args['--app']);
        const requireApp = createRequire(path.join(pinned.app, 'package.json'));
        const { Objects, States } = databases.clients(requireApp, config);
        const [objects, states] = await Promise.all([
            connect(Objects, config.objects, clients),
            connect(States, config.states, clients),
        ]);
        let result = await initialize({ objects, states, config, ...pinned, verifyOnly: args.verifyOnly || args.waitController });
        if (args.waitController) result = await waitController({ objects, states, config, controllerPid: Number(args['--controller-pid']) });
        process.stdout.write(JSON.stringify(result) + '\n');
        return 0;
    } catch (error) {
        const safe = /^(?:TLS_CONFIG_REJECTED|LOCAL_SEPARATE_STORES_REQUIRED|MULTIHOST_MUST_BE_DISABLED|PLUGINS_MUST_BE_DISABLED|EXPLICIT_SAFE_HOSTNAME_REQUIRED|UNSUPPORTED_SYSTEM_OPTION|UNBOUNDED_DATABASE_OPTIONS|CONTROLLER_VERSION_MISMATCH|INVALID_CONTROLLER_BASELINE|CONTROLLER_PROFILE_REQUIRED|NOT_FRESH_CORE_DATABASE|INVALID_DATABASE_OBJECT|EXISTING_RUNTIME_OR_ADAPTERS_FORBIDDEN|EXISTING_USERS_FORBIDDEN|ORDINARY_SETUP_REQUIRED|INVALID_CORE_OBJECT_TYPE|SYSTEM_POLICY_DRIFT|REPOSITORY_POLICY_DRIFT|ADMIN_ACCOUNT_POLICY_DRIFT|PLUGIN_STATE_DRIFT|INVALID_READINESS_OPTIONS|CONTROLLER_NOT_READY|INVALID_BOOTSTRAP_INPUT|BOOTSTRAP_MARKER_MISMATCH|BOOTSTRAP_NOT_COMPLETE|HOST_STATE_INVALID|CONTROLLER_MUST_BE_STOPPED|DATABASE_CONNECT_TIMEOUT|DATABASE_CONNECT_FAILED|USAGE)$/;
        process.stdout.write(JSON.stringify({ status: 'REJECTED', code: safe.test(error.message) ? error.message : 'BOOTSTRAP_FAILED' }) + '\n');
        return 1;
    } finally {
        await Promise.allSettled(clients.map(c => c.destroy()));
        clearTimeout(deadline);
    }
}
if (require.main === module) main().then(code => { process.exitCode = code; });
module.exports = { PROFILE, MARKER, assertRuntimeConfig, readPinnedApp, initialize, waitController, main };
