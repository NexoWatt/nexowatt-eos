'use strict';
// End-to-end fresh CORE ONLY. No production instance, adapter or device is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { provision, probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const { validateConfig } = require('../../security/verify-runtime-tls.cjs');
const binary = process.env.EOS_TEST_REDIS_SERVER;
const source = process.env.EOS_TEST_CONTROLLER_ROOT;
const unprivileged = process.env.EOS_TEST_UNPRIVILEGED === '1';
if (unprivileged && process.getuid?.() !== 0) throw new Error('UID_TEST_REQUIRES_ROOT_TEST_RUNNER');
if (!binary || !path.isAbsolute(binary) || !source || !path.isAbsolute(source)) throw new Error('ABSOLUTE_TEST_DEPENDENCY_PATHS_REQUIRED');
const deadline = async (condition, ms = 20000) => {
    const limit = Date.now() + ms;
    while (!await condition()) { if (Date.now() > limit) throw new Error('TEST_DEADLINE_EXCEEDED'); await new Promise(r => setTimeout(r, 50)); }
};
async function freePort() {
    const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
    const value = server.address().port; await new Promise(r => server.close(r)); return value;
}
function launch(cmd, args, options = {}) {
    const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    child.text = ''; child.stderrText = '';
    child.stdout.on('data', data => { child.text = (child.text + data).slice(-262144); });
    child.stderr.on('data', data => { child.stderrText = (child.stderrText + data).slice(-262144); });
    child.completion = new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('exit', code => resolve(code)); });
    return child;
}
async function stop(child) {
    if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM'); const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        try { await child.completion; } finally { clearTimeout(timer); }
    }
}
async function run(cmd, args, options) {
    const child = launch(cmd, args, options); const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
    try { const code = await child.completion; return { code, text: child.text, stderr: child.stderrText }; }
    finally { clearTimeout(timer); }
}

test('fresh controller ordinary setup, hardened bootstrap, core startup and restart over TLS', { timeout: 120000 }, async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-controller-runtime-'));
    const app = path.join(directory, 'app'); const data = path.join(directory, 'data');
    const children = []; const clients = [];
    t.after(async () => {
        await Promise.allSettled(clients.map(c => c.disconnect()));
        // Controller exits before Redis so its last state transitions can complete.
        for (const child of [...children].reverse()) await stop(child);
        fs.rmSync(directory, { recursive: true, force: true });
    });
    fs.cpSync(source, app, { recursive: true }); fs.mkdirSync(data, { mode: 0o700 });
    const controller = path.join(app, 'node_modules/iobroker.js-controller');
    // Build-time preparation: upstream ordinary setup checks this directory.
    fs.mkdirSync(path.join(controller, 'tmp'), { recursive: true, mode: 0o755 });
    const ports = { objects: await freePort(), states: await freePort() };
    const bundle = path.join(directory, 'transport'); provision({ directory: bundle, ports });
    for (const scope of ['objects', 'states']) {
        const redis = launch(binary, [path.join(bundle, 'redis', `${scope}.conf`)]); children.push(redis);
        await deadline(() => { if (redis.exitCode !== null) throw new Error('REDIS_STARTUP_FAILED'); return redis.text.includes('Ready to accept connections'); });
    }
    const config = JSON.parse(fs.readFileSync(path.join(controller, 'conf/iobroker-dist.json')));
    Object.assign(config, JSON.parse(fs.readFileSync(path.join(bundle, 'credentials/iobroker-databases.json'))));
    config.dataDir = data; config.system.hostname = 'eos-core-test'; config.system.statisticsInterval = 0;
    config.system.compact = false; config.system.allowShellCommands = false; config.multihostService.enabled = false;
    config.plugins = { sentry: { enabled: false } };
    config.log = { level: 'info', maxDays: 1, noStdout: false, transport: {} };
    const configFile = path.join(data, 'iobroker.json'); fs.writeFileSync(configFile, JSON.stringify(config), { mode: 0o600 });
    const env = { ...process.env, IOBROKER_DATA_DIR: data, SENTRY_DSN: '', NODE_PATH: '', NODE_OPTIONS: '', CI: process.env.EOS_TEST_NATIVE_UUID === '1' ? 'false' : 'true' };
    const options = { cwd: app, env, ...(unprivileged ? { uid: 65534, gid: 65534 } : {}) };
    const tools = path.join(directory, 'tools'); fs.mkdirSync(tools, { mode: 0o755 });
    fs.mkdirSync(path.join(tools, 'runtime/bootstrap'), { recursive: true });
    fs.mkdirSync(path.join(tools, 'security'));
    fs.copyFileSync(path.resolve(__dirname, '../../runtime/bootstrap/initialize.cjs'), path.join(tools, 'runtime/bootstrap/initialize.cjs'));
    fs.copyFileSync(path.resolve(__dirname, '../../security/verify-runtime-tls.cjs'), path.join(tools, 'security/verify-runtime-tls.cjs'));
    if (unprivileged) {
        fs.chmodSync(directory, 0o755); fs.chownSync(data, 65534, 65534);
        fs.chownSync(configFile, 0, 0); fs.chmodSync(configFile, 0o444);
        const seal = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) { seal(file); fs.chmodSync(file, 0o755); }
            else fs.chmodSync(file, fs.statSync(file).mode & 0o111 ? 0o555 : 0o444);
        } };
        seal(app); fs.chmodSync(app, 0o755);
        const identity = await run(process.execPath, ['-e', 'process.stdout.write(String(process.getuid()) + ":" + String(process.getgid()))'], options);
        assert.equal(identity.code, 0); assert.equal(identity.text, '65534:65534');
    }
    const redactedDiagnostic = value => {
        let text = value;
        for (const scope of ['objects', 'states']) text = text.replaceAll(config[scope].options.auth_pass, '[REDACTED]');
        text = text.replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, '[PEM REDACTED]');
        return text.slice(-3500);
    };
    let setupPassed = false; let bootstrapPassed = false;
    await t.test('ordinary setup completes and preserves mandatory TLS configuration', async () => {
        const result = await run(process.execPath, [path.join(controller, 'iobroker.js'), 'setup'], options);
        if (result.code !== 0) t.diagnostic(redactedDiagnostic(result.text + result.stderr));
        assert.equal(result.code, 0);
        const after = JSON.parse(fs.readFileSync(configFile));
        assert.equal(validateConfig(after).configurationMatchesProfile, true);
        for (const scope of ['objects', 'states']) assert.deepEqual(after[scope].options.tls, config[scope].options.tls);
        assert.equal((await probeConfig(after)).status, 'BOTH_STORES_AUTHENTICATED_TLS_OK');
        setupPassed = true;
    });
    if (!setupPassed) return; // Fail closed: never start after a failed setup gate.
    const bootstrap = path.join(tools, 'runtime/bootstrap/initialize.cjs');
    await t.test('real bootstrap locks standard admin, repositories, diagnostics and plugins', async () => {
        const result = await run(process.execPath, [bootstrap, '--app', app, '--config', configFile], options);
        if (result.code !== 0) t.diagnostic(redactedDiagnostic(result.text + result.stderr));
        assert.equal(result.code, 0); bootstrapPassed = true;
    });
    if (!bootstrapPassed) return; // Fail closed before actual controller startup.
    const requireApp = createRequire(path.join(app, 'package.json')); const Redis = requireApp('ioredis');
    const makeClient = scope => {
        const c = config[scope]; const client = new Redis({ host: c.host, port: c.port, ...c.options, password: c.options.auth_pass });
        client.on('error', () => {}); clients.push(client); return client;
    };
    const states = makeClient('states'); const objects = makeClient('objects');
    await deadline(() => states.status === 'ready' && objects.status === 'ready');
    const getState = async id => { const value = await states.get(`io.${id}`); return value ? JSON.parse(value) : null; };
    const getObject = async id => { const value = await objects.get(`cfg.o.${id}`); return value ? JSON.parse(value) : null; };
    let runtime;
    const boot = async () => {
        runtime = launch(process.execPath, [path.join(controller, 'controller.js')], options); children.push(runtime);
        await deadline(async () => {
            if (runtime.exitCode !== null) throw new Error('CONTROLLER_EXITED_BEFORE_READY');
            return (await getState('system.host.eos-core-test.alive'))?.val === true && (await getState('system.host.eos-core-test.pid'))?.val === runtime.pid;
        });
    };
    await t.test('actual controller reaches alive state with no adapter instances', async () => {
        try { await boot(); } catch (e) { t.diagnostic(redactedDiagnostic(runtime.text + runtime.stderrText)); throw e; }
        const readiness = await run(process.execPath, [bootstrap, '--app', app, '--config', configFile, '--wait-controller', '--controller-pid', String(runtime.pid)], options);
        if (readiness.code !== 0) t.diagnostic(redactedDiagnostic(readiness.text + readiness.stderr));
        assert.equal(readiness.code, 0);
        assert.deepEqual(await objects.keys('cfg.o.system.adapter.*.*'), []);
        assert.equal((await getObject('system.user.admin')).common.enabled, false);
        assert.equal((await getObject('system.config')).common.diag, 'none');
        assert.deepEqual((await getObject('system.repositories')).native.repositories, {});
    });
    await t.test('controller stops cleanly, verifies hardened marker and starts again', async () => {
        await stop(runtime);
        const result = await run(process.execPath, [bootstrap, '--app', app, '--config', configFile, '--verify-only'], options);
        if (result.code !== 0) t.diagnostic(redactedDiagnostic(result.text + result.stderr));
        assert.equal(result.code, 0);
        await boot(); assert.equal((await getState('system.host.eos-core-test.alive')).val, true);
    });
});
