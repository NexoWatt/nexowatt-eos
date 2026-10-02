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

test('actual controller setup, startup and cross-process states over PostgreSQL TLS without a Redis server', { timeout: 150000 }, async t => {
  assert.equal(process.version, 'v24.21.0');
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pg-controller-'));
  const children = [], clients = []; const secrets = [];
  t.after(async () => { for (const child of children) await stop(child); await Promise.allSettled(clients.map(client => client.destroy())); fs.rmSync(parent, { recursive: true, force: true }); });
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
  fs.writeFileSync(path.join(assembled.data, 'iobroker.json'), JSON.stringify(config), { mode: 0o600, flag: 'wx' });
  fs.mkdirSync(path.join(controller, 'tmp'), { recursive: true });
  const options = { cwd: assembled.app, env: { ...process.env, IOBROKER_DATA_DIR: assembled.data, CI: 'true', SENTRY_DSN: '', NODE_PATH: '', NODE_OPTIONS: '' } };
  await stage('ordinary controller CLI setup uses dynamically loaded PostgreSQL clients', async () => {
    const child = launch(process.execPath, [path.join(controller, 'iobroker.js'), 'setup'], options); children.push(child);
    const timer = setTimeout(() => child.kill('SIGTERM'), 45000);
    const hardTimer = setTimeout(() => child.kill('SIGKILL'), 52000);
    try { const code = await child.completion; if (code !== 0) t.diagnostic(redact(child.output)); assert.equal(code, 0); } finally { clearTimeout(timer); clearTimeout(hardTimer); }
  });
  const events = [];
  const objects = await connect(appRequire('@iobroker/db-objects-postgresql').Client, config.objects, () => {}); clients.push(objects);
  const states = await connect(appRequire('@iobroker/db-states-postgresql').Client, config.states, (id, state) => events.push({ id, state })); clients.push(states);
  const configuration = await objects.getObjectAsync('system.config'); assert.equal(configuration?.type, 'config');
  const instances = await objects.getObjectViewAsync('system', 'instance', {}); assert.equal(instances.rows.length, 0, 'physical adapters must not be started by this harness');
  await states.subscribe('system.host.eos-postgresql-lab.*');
  const child = launch(process.execPath, [path.join(controller, 'controller.js')], options); children.push(child);
  try {
    await wait(async () => { if (child.exitCode !== null) throw new Error('PG_LAB_CONTROLLER_EXIT'); return (await states.getState('system.host.eos-postgresql-lab.pid'))?.val === child.pid; }, 45000);
    assert.equal((await objects.getObjectAsync('system.host.eos-postgresql-lab')).common.installedVersion, '7.2.2');
    await wait(() => events.some(event => event.id === 'system.host.eos-postgresql-lab.alive' && event.state?.val === true));
    assert.equal(child.exitCode, null);
  } catch (error) { t.diagnostic(redact(child.output)); throw error; }
  t.diagnostic(JSON.stringify({ controllerVersion: '7.2.2', databaseType: 'postgresql', redisServerStarted: false,
    physicalAdaptersStarted: false, hardwareAcceptance: false, productionBootstrapTested: false,
    expectedBaseLockSha256: assembled.manifest.expectedBaseLockSha256, expectedPgLockSha256: assembled.manifest.expectedPgLockSha256,
    overlays: assembled.manifest.overlays, baseManifestSha256: hash(JSON.stringify(assembled.manifest.baseManifest)),
    driverManifestSha256: hash(JSON.stringify(assembled.manifest.driverManifest)),
    assemblySha256: hash(fs.readFileSync(path.join(parent, 'lab/assembly.json'))) }));
});
