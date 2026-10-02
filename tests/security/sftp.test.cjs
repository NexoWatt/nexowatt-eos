'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');

const tasksSource = readFileSync(resolve(__dirname, '../../tasks.js'), 'utf8');
const trustedKey = Buffer.from('SYNTHETIC SSH HOST KEY FOR UNIT TESTS ONLY');
const changedKey = Buffer.from('SYNTHETIC REPLACEMENT KEY FOR UNIT TESTS ONLY');
const fingerprint = key => `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
const environment = () => ({
    SFTP_HOST: 'deployment.example.invalid',
    SFTP_PORT: '22',
    SFTP_USER: 'synthetic-user',
    SFTP_PASS: 'SYNTHETIC_PASSWORD_MUST_NOT_APPEAR_IN_LOGS',
    SFTP_HOST_KEY_SHA256: fingerprint(trustedKey),
    FAST_TEST: 'true',
});

// Execute the real CLI entry with network/filesystem implementations replaced.
// The mock models ssh2's documented ordering: host verification, then authentication.
async function runTasks({ env = environment(), key = trustedKey, argv = ['--deploy'], connectionFailure } = {}) {
    const observed = { configs: [], logs: [], exits: [], writes: [], connections: 0, authenticated: 0, sessions: 0, closed: 0, ssh2Loads: 0 };
    const log = (...parts) => observed.logs.push(parts.join(' '));
    class MockClient extends EventEmitter {
        connect(config) {
            observed.configs.push(config);
            observed.connections++;
            if (connectionFailure === 'throw') {
                throw new Error(env.SFTP_PASS);
            }
            queueMicrotask(() => {
                if (config.hostVerifier(key) !== true || connectionFailure === 'event') {
                    this.emit('error', new Error(env.SFTP_PASS));
                    return;
                }
                observed.authenticated++;
                this.emit('ready');
            });
            return this;
        }
        sftp(callback) {
            observed.sessions++;
            callback(null, { end() {} });
        }
        end() { observed.closed++; }
    }
    vm.runInNewContext(tasksSource, {
        __dirname: '/synthetic-checkout',
        Buffer,
        console: { log, error: log },
        process: { env, argv: ['node', 'tasks.js', ...argv], exit(code) { observed.exits.push(code); } },
        require(id) {
            if (id === 'node:fs') {
                return {
                    readFileSync: () => Buffer.from('# synthetic source\n'),
                    existsSync: () => true,
                    mkdirSync() { throw new Error('Unexpected directory creation'); },
                    writeFileSync(file, data) { observed.writes.push({ file, data }); },
                };
            }
            if (id === 'node:stream' || id === 'node:crypto') return require(id);
            if (id === 'ssh2') {
                observed.ssh2Loads++;
                return { Client: MockClient };
            }
            throw new Error(`Unexpected dependency: ${id}`);
        },
    }, { filename: 'tasks.js', timeout: 1000 });
    await new Promise(resolveTick => setImmediate(resolveTick));
    if (env.SFTP_PASS) assert.equal(observed.logs.join('\n').includes(env.SFTP_PASS), false, 'password must not be logged');
    if (env.SFTP_HOST_KEY_SHA256) assert.equal(observed.logs.join('\n').includes(env.SFTP_HOST_KEY_SHA256), false, 'configured fingerprint must not be logged');
    return observed;
}

test('matching host key permits all four simulated uploads and closes connections', async () => {
    const result = await runTasks();
    assert.equal(result.authenticated, 4);
    assert.equal(result.sessions, 4);
    assert.equal(result.closed, 4);
    assert.deepEqual(result.exits, []);
    assert.equal(result.configs.every(config => config.hostHash === undefined), true);
});

test('missing pin fails before ssh2 load or any connection', async () => {
    const env = environment();
    delete env.SFTP_HOST_KEY_SHA256;
    const result = await runTasks({ env });
    assert.deepEqual(result.exits, [1]);
    assert.equal(result.ssh2Loads, 0);
    assert.equal(result.connections, 0);
});

test('malformed and noncanonical pins fail before network access', async t => {
    const noncanonical = `SHA256:${'A'.repeat(42)}B`;
    for (const value of ['', 'MD5:0000', 'SHA256:short', `${fingerprint(trustedKey)}=`, ` ${fingerprint(trustedKey)}`, `${fingerprint(trustedKey)}\n`, `SHA256:${'_'.repeat(43)}`, noncanonical]) {
        await t.test(`invalid fingerprint case ${JSON.stringify(value.length)}`, async () => {
            const result = await runTasks({ env: { ...environment(), SFTP_HOST_KEY_SHA256: value } });
            assert.deepEqual(result.exits, [1]);
            assert.equal(result.connections, 0);
        });
    }
});

test('different server key aborts before authentication or SFTP access', async () => {
    const result = await runTasks({ key: changedKey });
    assert.equal(result.connections, 1);
    assert.equal(result.authenticated, 0);
    assert.equal(result.sessions, 0);
    assert.equal(result.closed, 1);
    assert.deepEqual(result.exits, [1]);
});

test('host key rotation requires an explicit verified pin update', async () => {
    const updatedEnv = { ...environment(), SFTP_HOST_KEY_SHA256: fingerprint(changedKey) };
    const replacement = await runTasks({ env: updatedEnv, key: changedKey });
    assert.equal(replacement.authenticated, 4);
    const oldServer = await runTasks({ env: updatedEnv, key: trustedKey });
    assert.equal(oldServer.authenticated, 0);
    assert.deepEqual(oldServer.exits, [1]);
});

test('host verifier rejects invalid callback input instead of throwing', async () => {
    const result = await runTasks();
    const verify = result.configs[0].hostVerifier;
    for (const value of [undefined, null, '', fingerprint(trustedKey), Buffer.alloc(0), {}]) {
        assert.equal(verify(value), false);
    }
});

test('invalid port and missing credentials fail before any connection', async t => {
    for (const port of ['22extra', '0', '65536', '-22', ' 22', '22\n']) {
        await t.test(`invalid port case ${JSON.stringify(port)}`, async () => {
            const result = await runTasks({ env: { ...environment(), SFTP_PORT: port } });
            assert.equal(result.connections, 0);
            assert.deepEqual(result.exits, [1]);
        });
    }
    for (const field of ['SFTP_HOST', 'SFTP_PORT', 'SFTP_USER', 'SFTP_PASS']) {
        await t.test(`missing ${field}`, async () => {
            const env = environment();
            delete env[field];
            const result = await runTasks({ env });
            assert.equal(result.connections, 0);
            assert.deepEqual(result.exits, [1]);
        });
    }
});

test('connection errors are sanitized for asynchronous and synchronous failures', async () => {
    for (const connectionFailure of ['event', 'throw']) {
        const result = await runTasks({ connectionFailure });
        assert.deepEqual(result.exits, [1]);
        assert.equal(result.closed, 1);
        assert.equal(result.authenticated, 0);
    }
});

test('--create works with no deployment settings and never loads ssh2', async () => {
    const result = await runTasks({ env: {}, argv: ['--create'] });
    assert.equal(result.writes.length, 4);
    assert.equal(result.ssh2Loads, 0);
    assert.equal(result.connections, 0);
    assert.deepEqual(result.exits, []);
});
