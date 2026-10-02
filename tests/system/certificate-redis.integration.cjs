'use strict';
// Real Redis/TLS, real published Objects client, actual AOF persistence. Host
// service control remains an isolated child-process fixture, not systemd.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { provision, probe, probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const { prepareRotation, activateRotation } = require('../../runtime/transport/certificate-lifecycle.cjs');
const { updateMarkers } = require('../../tools/system/rotate-certificates.cjs');
const { credentialHashes, accountState } = require('./fixtures/certificate-accounts.cjs');
const binary = process.env.EOS_TEST_REDIS_SERVER, app = process.env.EOS_TEST_CONTROLLER_ROOT;
if (!binary || !path.isAbsolute(binary) || !app || !path.isAbsolute(app)) throw new Error('Absolute EOS_TEST_REDIS_SERVER and EOS_TEST_CONTROLLER_ROOT required.');
const requireApp = createRequire(path.join(app, 'package.json'));
const { Client: Objects } = requireApp('@iobroker/db-objects-redis');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function port() { const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const result = server.address().port; await new Promise(resolve => server.close(resolve)); return result; }
async function waitFor(check) { const until = Date.now() + 8000; while (!check()) { if (Date.now() >= until) throw new Error('TEST_DEADLINE'); await new Promise(resolve => setTimeout(resolve, 20)); } }
test('actual Redis CA rotation preserves AOF and v2 roles while rebinding both policy markers', { timeout: 60000 }, async t => {
    const parent = fs.mkdtempSync('/root/eos-certificate-redis-'); const directory = path.join(parent, 'transport'); const configPath = path.join(parent, 'iobroker.json');
    const dataDirectory = path.join(parent, 'data'); fs.mkdirSync(dataDirectory, { mode: 0o700 });
    for (const scope of ['objects', 'states']) fs.mkdirSync(path.join(dataDirectory, scope), { mode: 0o700 });
    const ports = { objects: await port(), states: await port() }; const processes = new Map(); const clients = new Set();
    const stop = async () => {
        for (const client of clients) await client.destroy(); clients.clear();
        for (const child of processes.values()) {
            if (child.exitCode === null && child.signalCode === null) await new Promise((resolve, reject) => {
                const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('REDIS_STOP_TIMEOUT')); }, 5000);
                child.once('exit', () => { clearTimeout(timer); resolve(); }); child.kill('SIGTERM');
            });
        }
        processes.clear();
    };
    t.after(async () => { await stop(); fs.rmSync(parent, { recursive: true, force: true }); });
    provision({ directory, dataDirectory, ports });
    const original = JSON.parse(fs.readFileSync(path.join(directory, 'credentials/iobroker-databases.json')));
    fs.writeFileSync(configPath, JSON.stringify(original), { mode: 0o600 });
    const start = async () => {
        for (const scope of ['objects', 'states']) {
            let ready = false;
            const child = spawn(binary, [path.join(directory, 'redis', `${scope}.conf`)], { stdio: ['ignore', 'pipe', 'pipe'] });
            processes.set(scope, child); child.stdout.on('data', data => { if (data.toString().includes('Ready to accept connections')) ready = true; }); child.stderr.resume();
            await waitFor(() => { if (child.exitCode !== null) throw new Error('REDIS_START_FAILED'); return ready; });
        }
    };
    const connect = async config => {
        let ready = false;
        const logger = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(k => [k, () => {}]));
        const client = new Objects({ connection: structuredClone(config.objects), namespace: 'certificate-integration', hostname: 'eos-test', logger,
            connected: () => { ready = true; }, disconnected: () => {}, change: () => {} });
        clients.add(client); await waitFor(() => ready); return client;
    };
    await start(); const objects = await connect(original);
    const core = { _id: 'system.meta.eosTestBase', type: 'meta', common: { name: 'test core marker' }, native: { profile: 'eos-core-only-bootstrap-v1',
        coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, state: 'complete', creationAppLockSha256: 'a'.repeat(64), runtimeConfigSha256: hash(original) } };
    const accounts = accountState(hash(original), await credentialHashes()), enrollment = accounts.marker;
    const design = JSON.parse(fs.readFileSync(path.join(app, 'node_modules/iobroker.js-controller/io-package.json'))).objects.find(doc => doc._id === '_design/system');
    assert.ok(design); await objects.setObjectAsync(design._id, design);
    await objects.setObjectAsync(core._id, core);
    for (const [id, doc] of accounts.docs) await objects.setObjectAsync(id, doc);
    const originalGroup = await objects.getObjectAsync('system.group.installateur');
    const alteredGroup = structuredClone(originalGroup); alteredGroup.common.acl.users.write = true;
    await objects.setObjectAsync(alteredGroup._id, alteredGroup);
    let forbiddenWrites = 0;
    await assert.rejects(updateMarkers({ getObjectAsync: objects.getObjectAsync.bind(objects), getObjectViewAsync: objects.getObjectViewAsync.bind(objects),
        setObjectAsync: async () => { forbiddenWrites++; } }, original, original), /ENROLLMENT_GROUP_DRIFT/);
    assert.equal(forbiddenWrites, 0); await objects.setObjectAsync(originalGroup._id, originalGroup);
    const beforeAccounts = new Map();
    for (const [id] of accounts.docs) if (id !== enrollment._id) beforeAccounts.set(id, await objects.getObjectAsync(id));
    await objects.setObjectAsync('eos.test.persisted', { _id: 'eos.test.persisted', type: 'state', common: { name: 'persisted value', type: 'number', read: true, write: true }, native: { value: 42 } });
    prepareRotation({ directory, configPath }); let rebound;
    const result = await activateRotation({ directory, configPath }, {
        stop, startStores: start, probe: probeConfig,
        rebindMarker: async (before, after) => { const client = await connect(after); rebound = await updateMarkers(client, before, after); },
        startController: async () => {}, // No full controller or host service claim.
    });
    assert.equal(result.status, 'TRANSPORT_CERTIFICATES_ROTATED'); assert.equal(rebound.enrollmentPresent, true);
    const current = JSON.parse(fs.readFileSync(configPath)); const client = await connect(current);
    assert.equal((await client.getObjectAsync('eos.test.persisted')).native.value, 42);
    assert.equal((await client.getObjectAsync(core._id)).native.runtimeConfigSha256, hash(current));
    assert.equal((await client.getObjectAsync(enrollment._id)).native.runtimeConfigSha256, hash(current));
    assert.equal((await client.getObjectAsync(enrollment._id)).native.version, 2);
    for (const [id, doc] of beforeAccounts) assert.deepEqual(await client.getObjectAsync(id), doc);
    assert.equal(current.objects.options.auth_pass, original.objects.options.auth_pass);
    await assert.rejects(probe({ connection: original.objects }), /TLS_OR_CONNECTION_REJECTED/);
    assert.equal((await probeConfig(current)).status, 'BOTH_STORES_AUTHENTICATED_TLS_OK');
});
