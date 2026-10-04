'use strict';
// Real PostgreSQL integration harness. Requires a separately provisioned, empty,
// laboratory-only database with schema.sql and per-domain mTLS credentials.
// It does not create a PostgreSQL server, migrate data, or weaken host admission.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const { stageLaboratory, validateExperimentalProfile } = require('../../runtime/postgresql/integration.cjs');
const { waitController } = require('../../runtime/bootstrap/initialize.cjs');

const required = name => { const value = process.env[name]; if (!value || !path.isAbsolute(value)) throw new Error(`ABSOLUTE_${name}_REQUIRED`); return value; };
if (process.env.EOS_TEST_PG_FRESH !== '1') throw new Error('EXPLICIT_EMPTY_POSTGRESQL_LAB_REQUIRED');
const baseApp = required('EOS_TEST_CONTROLLER_ROOT');
const pgClientRoot = required('EOS_TEST_PG_CLIENT_ROOT');
const metadataFile = required('EOS_TEST_PG_LAB_PATHS');
const metadata = JSON.parse(fs.readFileSync(metadataFile));
if (metadata.labOnly !== true || !['127.0.0.1', 'localhost'].includes(metadata.host) || metadata.database !== 'eos_lab') throw new Error('ISOLATED_POSTGRESQL_LAB_REQUIRED');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const log = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(name => [name, () => {}]));
function launch(command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] }); child.output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { child.output = (child.output + bytes).slice(-1048576); });
  child.completion = new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('exit', code => resolve(code)); });
  return child;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM'); const timer = setTimeout(() => child.kill('SIGKILL'), 7000);
  try { await child.completion; } finally { clearTimeout(timer); }
}
async function wait(condition, maximum = 30000) {
  const deadline = Date.now() + maximum;
  while (!await condition()) { if (Date.now() >= deadline) throw new Error('PG_LAB_DEADLINE'); await new Promise(resolve => setTimeout(resolve, 100)); }
}
function connect(Client, connection, change) {
  return new Promise((resolve, reject) => {
    let client; const timer = setTimeout(() => { client?.destroy().catch(() => {}); reject(new Error('PG_LAB_CLIENT_TIMEOUT')); }, 6000);
    client = new Client({ connection, logger: log, change, connected: () => { clearTimeout(timer); resolve(client); }, disconnected: () => {} });
  });
}

test('actual controller setup, startup and cross-process states over PostgreSQL TLS without a Redis server', { timeout: 270000 }, async t => {
  assert.equal(process.version, 'v24.21.0');
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pg-controller-'));
  const children = [], clients = []; const secrets = [];
  let readOnlyController;
  t.after(async () => { for (const child of children) await stop(child); await Promise.allSettled(clients.map(client => client.destroy()));
    if (readOnlyController) fs.chmodSync(readOnlyController, 0o755);
    fs.rmSync(parent, { recursive: true, force: true }); });
  const redact = text => { for (const secret of secrets) text = text.replaceAll(secret, '[REDACTED]'); return text.replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, '[PEM REDACTED]').slice(-16000); };
  const stage = async (name, operation) => { let passed = false; await t.test(name, async () => { await operation(); passed = true; }); if (!passed) throw new Error('PG_LAB_STAGE_FAILED'); };
  const assembled = stageLaboratory({ baseApp, pgClientRoot, packageRoot: path.resolve(__dirname, '../../runtime/postgresql/packages'), directory: path.join(parent, 'lab'),
    expectedBaseLockSha256: process.env.EOS_TEST_BASE_LOCK_SHA256, expectedPgLockSha256: process.env.EOS_TEST_PG_LOCK_SHA256 });
  const appRequire = createRequire(path.join(assembled.app, 'package.json'));
  const { validateConnection } = appRequire('@nexowatt/eos-postgresql-store');
  const { Client: PgClient } = createRequire(appRequire.resolve('@nexowatt/eos-postgresql-store'))('pg');
  const controller = path.join(assembled.app, 'node_modules/iobroker.js-controller');
  const config = JSON.parse(fs.readFileSync(path.join(controller, 'conf/iobroker-dist.json')));
  for (const domain of ['objects', 'states']) {
    const role = `eos_${domain}`;
    const ssl = Object.fromEntries([['ca', metadata.caFile], ['cert', metadata.roles?.[role]?.certFile], ['key', metadata.roles?.[role]?.keyFile]].map(([key, filename]) => {
      if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw new Error('PG_LAB_CREDENTIAL_PATH');
      const value = fs.readFileSync(filename, 'utf8'); secrets.push(value); return [key, value];
    }));
    config[domain] = { type: 'postgresql', host: metadata.host, port: metadata.port, database: metadata.database, user: role, options: { ssl } };
  }
  config.dataDir = assembled.data;
  Object.assign(config.system, { hostname: 'eos-postgresql-lab', compact: false, allowShellCommands: false, statisticsInterval: 1000, checkDiskInterval: 0 });
  config.multihostService = { enabled: false }; config.plugins = { sentry: { enabled: false } };
  config.log = { level: 'info', noStdout: false, transport: { file1: { type: 'file', enabled: false } } };
  validateExperimentalProfile(config, validateConnection);
  await stage('both mTLS identities see physically empty runtime tables before setup', async () => {
    for (const domain of ['objects', 'states']) {
      // Normal Store.connect() starts expiry maintenance, so it must not be
      // used as a supposedly read-only emptiness check. RLS presents each role's
      // domain; inspect both roles, including expired KV and retained event rows.
      const client = new PgClient(validateConnection(config[domain], domain));
      client.on('error', () => {});
      try {
        await client.connect();
        assert.equal(client.connection.stream.authorized, true);
        assert.equal(client.connection.stream.getProtocol(), 'TLSv1.3');
        const result = await client.query('SELECT NOT EXISTS (SELECT 1 FROM eos_store.kv) AS empty_kv, NOT EXISTS (SELECT 1 FROM eos_store.events) AS empty_events');
        assert.deepEqual(result.rows, [{ empty_kv: true, empty_events: true }], 'refuse any previously used database');
      } finally { await client.end(); }
    }
  });
  const configFile = path.join(assembled.data, 'iobroker.json');
  const configBytes = Buffer.from(JSON.stringify(config));
  // The product initialize service bind-mounts its root-managed configuration
  // read-only. Upstream 7.2.2 setup still tries to persist Redis-only retry
  // options for every backend and catches a denied write. A writable laboratory
  // config instead acquired retry_max_delay and correctly failed the strict PG
  // validator at controller startup. Reproduce the product's denied-write
  // behavior; never restore an unchecked setup mutation or relax validation.
  assert.notEqual(process.getuid(), 0, 'read-only configuration contract requires an unprivileged laboratory process');
  fs.writeFileSync(configFile, configBytes, { mode: 0o400, flag: 'wx' });
  assert.throws(() => fs.accessSync(configFile, fs.constants.W_OK), { code: 'EACCES' });
  fs.mkdirSync(path.join(controller, 'tmp'), { recursive: true });
  // The controller receives laboratory values only, never GitHub credentials or
  // arbitrary runner environment. The sentinel proves host metadata strips env.
  const options = { cwd: assembled.app, env: { PATH: process.env.PATH, HOME: parent, LANG: 'C.UTF-8',
    IOBROKER_DATA_DIR: assembled.data, CI: 'true', SENTRY_DSN: '', NODE_PATH: '', NODE_OPTIONS: '',
    EOS_NATIVE_ENV_SENTINEL: 'non-secret-must-not-reach-host-object' } };
  await stage('ordinary controller CLI setup uses dynamically loaded PostgreSQL clients', async () => {
    const child = launch(process.execPath, [path.join(controller, 'iobroker.js'), 'setup'], options); children.push(child);
    const timer = setTimeout(() => child.kill('SIGTERM'), 45000);
    const hardTimer = setTimeout(() => child.kill('SIGKILL'), 52000);
    try {
      const code = await child.completion;
      if (code !== 0) t.diagnostic(redact(child.output));
      assert.equal(code, 0);
      assert.match(child.output, /Could not update ioBroker configuration: EACCES/,
        'pinned CLI must encounter the intentionally read-only configuration');
      assert.equal(fs.readFileSync(configFile).equals(configBytes), true, 'setup must not change the authenticated configuration');
      validateExperimentalProfile(JSON.parse(fs.readFileSync(configFile)), validateConnection);
    } finally { clearTimeout(timer); clearTimeout(hardTimer); }
  });
  const events = [];
  const objects = await connect(appRequire('@iobroker/db-objects-postgresql').Client, config.objects, () => {}); clients.push(objects);
  const states = await connect(appRequire('@iobroker/db-states-postgresql').Client, config.states, (id, state) => events.push({ id, state })); clients.push(states);
  const configuration = await objects.getObjectAsync('system.config'); assert.equal(configuration?.type, 'config');
  const instances = await objects.getObjectViewAsync('system', 'instance', {}); assert.equal(instances.rows.length, 0, 'physical adapters must not be started by this harness');
  await states.subscribe('system.host.eos-postgresql-lab.*');
  const nativeProfile = process.env.EOS_TEST_NATIVE_PROFILE === '1';
  const pidFile = '/var/lib/nexowatt-eos/iobroker-data/pids.txt';
  const normalStopCode = appRequire('@iobroker/js-controller-common').EXIT_CODES.JS_CONTROLLER_STOPPED;
  assert.equal(normalStopCode, 1, 'pinned controller 7.2.2 normal stop convention');
  if (nativeProfile) {
    assert.notEqual(process.getuid(), 0, 'read-only permission test must run unprivileged');
    assert.equal(appRequire('@iobroker/js-controller-common-db/tools').getPidsFileName(), pidFile);
    assert.equal(fs.existsSync(pidFile), false, 'fresh isolated runner PID state required');
    fs.chmodSync(controller, 0o555); readOnlyController = controller;
    assert.throws(() => fs.writeFileSync(path.join(controller, 'pids.txt'), '[0]', { flag: 'wx' }), { code: 'EACCES' });
    // Core-only startup never invokes upstream storePids(), which is triggered
    // by adapter lifecycle. This is an explicit directory/accessor probe, not
    // a claim that the controller generated a PID list in this adapter-free run.
    fs.writeFileSync(pidFile, '[]\n', { mode: 0o600, flag: 'wx' });
    try {
      assert.deepEqual(JSON.parse(fs.readFileSync(pidFile)), []);
      assert.equal(fs.statSync(pidFile).uid, process.getuid());
      assert.equal(fs.statSync(pidFile).mode & 0o077, 0);
    } finally { fs.unlinkSync(pidFile); }
  }
  let child;
  const boot = async () => {
    const eventOffset = events.length;
    child = launch(process.execPath, [path.join(controller, 'controller.js')], options); children.push(child);
    try {
      await wait(async () => { if (child.exitCode !== null || child.signalCode !== null) throw new Error('PG_LAB_CONTROLLER_EXIT');
        return (await states.getState('system.host.eos-postgresql-lab.pid'))?.val === child.pid; }, 45000);
      const host = await objects.getObjectAsync('system.host.eos-postgresql-lab');
      assert.equal(host.common.installedVersion, '7.2.2');
      assert.equal(host.type, 'host'); assert.deepEqual(host.native.process.env, {});
      assert.equal(JSON.stringify(host).includes('non-secret-must-not-reach-host-object'), false);
      await wait(() => events.slice(eventOffset).some(event => event.id === 'system.host.eos-postgresql-lab.alive' && event.state?.val === true));
      assert.equal((await states.getState('system.host.eos-postgresql-lab.alive')).val, true);
      const readiness = await waitController({ objects, states, config, controllerPid: child.pid, timeoutMs: 30000, pollMs: 100 });
      assert.equal(readiness.status, 'CONTROLLER_READY');
      assert.equal(readiness.heartbeatVerified, true); assert.equal(readiness.pidVerified, true);
      assert.equal(child.exitCode, null);
      if (nativeProfile) {
        assert.equal(fs.existsSync(path.join(controller, 'pids.txt')), false);
      }
    } catch (error) { t.diagnostic(redact(child.output)); throw error; }
  };
  await stage('actual controller persists host object and publishes fresh alive/PID via native mTLS PostgreSQL', boot);
  await stage('controller stops cleanly and restarts with a fresh PID and host-object readback', async () => {
    const oldPid = child.pid;
    await stop(child);
    assert.equal(child.exitCode, normalStopCode);
    await boot(); assert.notEqual(child.pid, oldPid);
  });
  await stage('final controller stop completes without a release-tree PID write', async () => {
    await stop(child); assert.equal(child.exitCode, normalStopCode);
    if (nativeProfile) {
      assert.equal(fs.existsSync(path.join(controller, 'pids.txt')), false);
      if (fs.existsSync(pidFile)) assert.equal(JSON.parse(fs.readFileSync(pidFile)).includes(child.pid), false);
    }
  });
  t.diagnostic(JSON.stringify({ controllerVersion: '7.2.2', databaseType: 'postgresql', redisServerStarted: false,
    physicalAdaptersStarted: false, hardwareAcceptance: false, productionBootstrapTested: false,
    nativePostgresqlTested: true, controllerRestartTested: true, hostEnvironmentExcluded: true,
    configurationReadOnlyByMode: true, setupConfigurationBytesPreserved: true,
    productionControllerReadinessFunctionTested: true,
    relocatedPidAccessorAndDirectoryTested: nativeProfile, actualAdapterPidWriterLifecycleTested: false,
    immutableControllerDirectoryByMode: nativeProfile, actualSystemdMountRestrictionsTested: false,
    expectedBaseLockSha256: assembled.manifest.expectedBaseLockSha256, expectedPgLockSha256: assembled.manifest.expectedPgLockSha256,
    overlays: assembled.manifest.overlays, baseManifestSha256: hash(JSON.stringify(assembled.manifest.baseManifest)),
    driverManifestSha256: hash(JSON.stringify(assembled.manifest.driverManifest)),
    assemblySha256: hash(fs.readFileSync(path.join(parent, 'lab/assembly.json'))) }));
});
