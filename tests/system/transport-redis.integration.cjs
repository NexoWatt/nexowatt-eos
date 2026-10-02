'use strict';
// Required external test tools are explicit. Missing dependencies fail, never silently skip.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const tls = require('node:tls');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { provision, probe, probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const binary = process.env.EOS_TEST_REDIS_SERVER;
const deps = process.env.EOS_TEST_CONTROLLER_ROOT;
if (!binary || !path.isAbsolute(binary) || !deps || !path.isAbsolute(deps)) {
    throw new Error('Set absolute EOS_TEST_REDIS_SERVER and EOS_TEST_CONTROLLER_ROOT (directory containing package.json and node_modules).');
}
const requireController = createRequire(path.join(deps, 'package.json'));
const { Client: StateClient } = requireController('@iobroker/db-states-redis');
const { Client: ObjectClient } = requireController('@iobroker/db-objects-redis');
const Redis = requireController('ioredis');
const waitFor = async predicate => {
    const end = Date.now() + 12000;
    while (!await predicate()) { if (Date.now() >= end) throw new Error('TEST_DEADLINE_EXCEEDED'); await new Promise(r => setTimeout(r, 25)); }
};
async function freePort() {
    const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port; await new Promise(r => server.close(r)); return port;
}

test('published controller Redis clients against two real TLS-only Redis stores', { timeout: 90000 }, async t => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-redis-runtime-'));
    const directory = path.join(parent, 'bundle');
    const ports = { objects: await freePort(), states: await freePort() };
    const processes = new Map(); const clients = []; const notices = [];
    const logger = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(level => [level, message => {
        if (level === 'warn' || level === 'error') notices.push({ level, configDenied: String(message).includes('NOPERM'), other: !String(message).includes('NOPERM') });
    }]));
    const stop = async scope => {
        const child = processes.get(scope); if (!child) return;
        if (child.exitCode === null && child.signalCode === null) {
            await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
        }
        processes.delete(scope);
    };
    t.after(async () => {
        await Promise.allSettled(clients.map(client => client.destroy ? client.destroy() : client.disconnect()));
        await Promise.allSettled([...processes.keys()].map(stop));
        fs.rmSync(parent, { recursive: true, force: true });
    });
    provision({ directory, ports });
    const configuration = JSON.parse(fs.readFileSync(path.join(directory, 'credentials/iobroker-databases.json')));
    const start = async scope => {
        const child = spawn(binary, [path.join(directory, 'redis', `${scope}.conf`)], { stdio: ['ignore', 'pipe', 'pipe'] });
        let startup = ''; child.stdout.on('data', b => { startup = (startup + b.toString()).slice(-8192); });
        child.stderr.on('data', () => {}); processes.set(scope, child);
        await waitFor(() => { if (child.exitCode !== null) throw new Error('REDIS_STARTUP_FAILED'); return startup.includes('Ready to accept connections'); });
    };
    await start('objects'); await start('states');

    await t.test('both real stores accept only authenticated TLS1.3', async () => {
        assert.equal((await probeConfig(configuration)).status, 'BOTH_STORES_AUTHENTICATED_TLS_OK');
    });
    await t.test('wrong password, CA and DNS identity rejected', async () => {
        const badPassword = structuredClone(configuration.objects); badPassword.options.auth_pass = 'invalid'.repeat(10);
        await assert.rejects(probe({ connection: badPassword }), /AUTHENTICATION_REJECTED/);
        const other = path.join(parent, 'other'); provision({ directory: other, ports });
        const foreign = JSON.parse(fs.readFileSync(path.join(other, 'credentials/iobroker-databases.json')));
        const badCA = structuredClone(configuration.objects); badCA.options.tls.ca = foreign.objects.options.tls.ca;
        await assert.rejects(probe({ connection: badCA }), /TLS_OR_CONNECTION_REJECTED/);
        const badDNS = structuredClone(configuration.objects); badDNS.options.tls.servername = 'unexpected.internal';
        await assert.rejects(probe({ connection: badDNS }), /TLS_OR_CONNECTION_REJECTED/);
    });
    await t.test('Redis listener rejects plaintext and TLS1.2', async () => {
        const plainAccepted = await new Promise(resolve => {
            const socket = net.connect({ host: '127.0.0.1', port: ports.objects }); let data = '';
            const timer = setTimeout(() => { socket.destroy(); resolve(false); }, 1000);
            socket.on('connect', () => socket.write('PING\r\n')); socket.on('data', b => { data += b; });
            socket.on('error', () => {}); socket.on('close', () => { clearTimeout(timer); resolve(data.includes('+PONG')); });
        });
        assert.equal(plainAccepted, false);
        const oldTLSAccepted = await new Promise(resolve => {
            const socket = tls.connect({ host: '127.0.0.1', port: ports.objects, ...configuration.objects.options.tls,
                minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' });
            const timer = setTimeout(() => { socket.destroy(); resolve(false); }, 1000);
            socket.on('secureConnect', () => { clearTimeout(timer); socket.destroy(); resolve(true); });
            socket.on('error', () => { clearTimeout(timer); socket.destroy(); resolve(false); });
        });
        assert.equal(oldTLSAccepted, false);
    });
    await t.test('TLS without authentication cannot read or write data', async () => {
        const c = configuration.states;
        const client = new Redis({ host: c.host, port: c.port, tls: c.options.tls, lazyConnect: true,
            enableReadyCheck: false, retryStrategy: null, maxRetriesPerRequest: 0 });
        client.on('error', () => {}); clients.push(client); await client.connect();
        await assert.rejects(client.get('io.eos.transport.power'), /NOAUTH/);
        await assert.rejects(client.set('io.eos.transport.power', 'invalid'), /NOAUTH/);
    });
    const events = { states: [], objects: [] };
    const connect = async (Client, scope, reader) => {
        let ready = false;
        const client = new Client({ connection: structuredClone(configuration[scope]), logger,
            namespace: `eos-test-${scope}-${reader ? 'reader' : 'writer'}`, hostname: 'eos-test',
            connected: () => { ready = true; },
            change: reader ? (id, value) => events[scope].push({ id, value }) : undefined });
        clients.push(client); await waitFor(() => ready); return client;
    };
    let stateWriter, stateReader, objectWriter, objectReader;
    await t.test('published 7.2.2 objects/states clients initialize over TLS', async () => {
        stateWriter = await connect(StateClient, 'states', false); stateReader = await connect(StateClient, 'states', true);
        objectWriter = await connect(ObjectClient, 'objects', false); objectReader = await connect(ObjectClient, 'objects', true);
        for (const client of [stateWriter, stateReader, objectWriter, objectReader]) {
            for (const slot of ['client', 'sub', 'subSystem']) if (client[slot]) {
                assert.equal(client[slot].connector.stream.encrypted, true);
                assert.equal(client[slot].connector.stream.getProtocol(), 'TLSv1.3');
                assert.equal(client[slot].connector.stream.authorized, true);
            }
        }
    });
    await t.test('objects and states roundtrip plus subscriptions use actual controller clients', async () => {
        await stateReader.subscribe('eos.transport.*');
        await stateWriter.setState('eos.transport.power', { val: 4200, ack: true, ts: Date.now() });
        assert.equal((await stateReader.getState('eos.transport.power')).val, 4200);
        await waitFor(() => events.states.some(e => e.id === 'eos.transport.power' && e.value?.val === 4200));
        await objectReader.subscribe('eos.transport.*');
        await objectWriter.setObject('eos.transport.power', { _id: 'eos.transport.power', type: 'state', common: { name: 'Test power', type: 'number', role: 'value.power', unit: 'W', read: true, write: false }, native: {} });
        assert.equal((await objectReader.getObject('eos.transport.power')).common.unit, 'W');
        await waitFor(() => events.objects.some(e => e.id === 'eos.transport.power' && e.value?.common?.unit === 'W'));
    });
    await t.test('controller messagebox delivery passes encrypted Redis path', async () => {
        await stateReader.subscribeMessage('system.adapter.eos-test.0');
        await stateWriter.pushMessage('system.adapter.eos-test.0', { command: 'transport-test', message: { value: 17 }, from: 'system.adapter.eos-test.1' });
        await waitFor(() => events.states.some(e => e.value?.command === 'transport-test' && e.value?.message?.value === 17));
    });
    await t.test('runtime account cannot reconfigure server, install modules or destroy database', async () => {
        const c = configuration.states;
        const client = new Redis({ host: c.host, port: c.port, ...c.options, password: c.options.auth_pass, retryStrategy: null });
        clients.push(client); await waitFor(() => client.status === 'ready');
        await assert.rejects(client.config('SET', 'protected-mode', 'no'), /NOPERM/);
        await assert.rejects(client.call('MODULE', 'LIST'), /NOPERM/);
        await assert.rejects(client.flushall(), /NOPERM/);
        await assert.rejects(client.call('ACL', 'LIST'), /NOPERM/);
        await assert.rejects(client.shutdown(), /NOPERM/);
    });
    await t.test('store restart persists data, reconnects controller and resumes subscription', async () => {
        const subscribedPatterns = Number(await stateWriter.client.pubsub('NUMPAT'));
        assert.ok(subscribedPatterns >= 3);
        await stop('states');
        // enableOfflineQueue:false rejects new writes during outage, avoiding unbounded stale queued commands.
        await assert.rejects(stateWriter.setState('eos.transport.offline', { val: 1, ack: true }));
        await start('states'); await waitFor(() => stateWriter.client.status === 'ready' && stateReader.client.status === 'ready' && stateReader.subSystem.status === 'ready');
        // A ready TCP client is not a promise that the controller restored every subscription.
        // PubSub cannot replay events lost during outage/re-subscription; reconcile current state.
        await waitFor(async () => Number(await stateWriter.client.pubsub('NUMPAT')) >= subscribedPatterns);
        assert.equal((await stateReader.getState('eos.transport.power')).val, 4200);
        await stateWriter.setState('eos.transport.power', { val: 4300, ack: true, ts: Date.now() });
        await waitFor(() => events.states.some(e => e.id === 'eos.transport.power' && e.value?.val === 4300));
        assert.equal((await probeConfig(configuration)).status, 'BOTH_STORES_AUTHENTICATED_TLS_OK');
    });
    t.diagnostic(`Controller CONFIG requests intentionally denied; observed denial notices: ${notices.filter(n => n.configDenied).length}. No raw controller messages retained.`);
});
