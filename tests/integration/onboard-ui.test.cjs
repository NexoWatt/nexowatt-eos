'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const { parseArgs, protectedInput, waitAdapters, probeWeb, quiesceAfterFailure } = require('../../tools/system/onboard-ui.cjs');
test('onboarding accepts file paths only and rejects duplicate/unknown options', () => {
    assert.equal(parseArgs(['--password-file','/root/pass','--license-trust','/root/trust','--hosts-file','/root/hosts','--accounts-file','/root/accounts'])['--password-file'], '/root/pass');
    for (const args of [[], ['--password','x'], ['--password-file','x','--password-file','y','--hosts-file','z']]) assert.throws(() => parseArgs(args), /ONBOARD_USAGE/);
});
test('secret source ownership, modes, size and link checks', t => {
    const d = fs.mkdtempSync('/root/eos-input-test-'); t.after(() => fs.rmSync(d, { recursive: true, force: true }));
    const file = path.join(d, 'input'); fs.writeFileSync(file, 'synthetic test data', { mode: 0o600 });
    assert.equal(protectedInput(file, 64, true).length, 19);
    fs.chmodSync(file, 0o644); assert.throws(() => protectedInput(file, 64, true), /ONBOARD_SECRET_PERMISSIONS/);
    fs.chmodSync(file, 0o600); assert.throws(() => protectedInput(file, 2, true));
    fs.symlinkSync(file, path.join(d, 'link')); assert.throws(() => protectedInput(path.join(d, 'link'), 64, true));
});
test('old true heartbeat cannot pass new startup readiness', async () => {
    const startedAt = Date.now(); const states = { getState: async () => ({ val: true, ack: true, ts: startedAt - 10000 }) };
    await assert.rejects(waitAdapters(states, startedAt, 1), /ONBOARD_ADAPTERS_NOT_READY/);
});
test('new acknowledged heartbeat passes only both expected instances', async () => {
    const startedAt = Date.now(), seen = [];
    await waitAdapters({ getState: async id => { seen.push(id); return { val: true, ack: true, ts: Date.now() }; } }, startedAt, 1000);
    assert.deepEqual(seen, ['system.adapter.eos-admin.0.alive', 'system.adapter.nexowatt-ui.0.alive']);
});
test('upload unit carries immutable config bind and unprivileged account', () => {
    const unit = fs.readFileSync(path.resolve(__dirname, '../../system/test-base/systemd/nexowatt-eos-upload.service'), 'utf8');
    assert.match(unit, /^User=eos-runtime$/m); assert.match(unit, /^NoNewPrivileges=yes$/m);
    assert.match(unit, /^BindReadOnlyPaths=\/etc\/nexowatt-eos\/iobroker.json:\/var\/lib\/nexowatt-eos\/iobroker-data\/iobroker.json$/m);
    assert.equal(unit.split('\n').filter(line => line.startsWith('ExecStart=')).length, 2);
    assert.match(unit, /iobroker\.js upload eos-admin\n/); assert.match(unit, /iobroker\.js upload nexowatt-ui\n/);
});
test('onboarding public trust and secret modes survive restrictive inherited umask', t => {
    const directory = fs.mkdtempSync('/root/eos-onboarding-umask-');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const publicFile = path.join(directory, 'public-trust.json');
    const secretFile = path.join(directory, 'secret-fixture.json');
    const moduleFile = path.resolve(__dirname, '../../tools/system/install-host.cjs');
    // Change umask in an isolated process: no unrelated concurrent test inherits it.
    const result = spawnSync(process.execPath, ['-e',
        'process.umask(0o077); const {privateWrite}=require(process.argv[1]); privateWrite(process.argv[2],"{}\\n",0o644); privateWrite(process.argv[3],"{}\\n",0o640);',
        moduleFile, publicFile, secretFile], { timeout: 5000, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.statSync(publicFile).mode & 0o777, 0o644);
    assert.equal(fs.statSync(secretFile).mode & 0o777, 0o640);
    assert.equal(fs.readFileSync(publicFile, 'utf8'), '{}\n');
    assert.equal(fs.statSync(publicFile).nlink, 1);
    // File metadata only; actual eos-runtime UID and mount access remain target tests.
});
test('failure to revoke the trial permit still attempts to stop the controller', () => {
    const calls = [];
    assert.throws(() => quiesceAfterFailure(
        () => { calls.push('block'); throw new Error('simulated I/O failure'); },
        () => { calls.push('stop'); },
    ), error => error.code === 'ONBOARD_START_BLOCK_FAILED');
    assert.deepEqual(calls, ['block', 'stop']);
});
test('failed revocation and failed stop report the more specific stop failure', () => {
    const calls = [];
    assert.throws(() => quiesceAfterFailure(
        () => { calls.push('block'); throw new Error('simulated revoke failure'); },
        () => { calls.push('stop'); throw new Error('simulated stop failure'); },
    ), error => error.code === 'ONBOARD_STOP_FAILED');
    assert.deepEqual(calls, ['block', 'stop']);
});
test('concurrent release change is rejected after acquiring the maintenance lock', async () => {
    const oldRelease = '/opt/nexowatt/eos/releases/' + 'a'.repeat(64);
    let locked = false, provisioned = false;
    const events = [];
    const fakeFs = {
        realpathSync: () => { events.push(locked ? 'current-under-lock' : 'current-before-lock'); return locked ? '/opt/nexowatt/eos/releases/' + 'b'.repeat(64) : oldRelease; },
        existsSync: () => false,
        openSync: file => { if (file.endsWith('.activation.lock')) { locked = true; events.push('lock'); } return 42; },
        writeFileSync: () => {}, fsyncSync: () => {}, closeSync: () => {},
        constants: fs.constants,
    };
    const config = { system: { hostname: 'fixture' } };
    const dependencies = {
        'node:fs': fakeFs, 'node:path': path, 'node:https': https,
        'node:module': { createRequire: () => () => ({ validatePublicKeys: value => value }) },
        'node:child_process': { spawnSync: () => ({ status: 0 }) },
        '../../runtime/release/installed-check.cjs': { rootOwned: () => {}, checkInstalled: () => ({ releaseId: 'a'.repeat(64) }) },
        '../../runtime/release/bundle.cjs': { readFileLimited: file => ({ mode: 0o600, bytes: Buffer.from(file === '/password' ? 'synthetic-fixture-password' : file === '/hosts' ? '["eos.test"]' : '{}') }) },
        '../../security/verify-runtime-tls.cjs': { readConfig: () => config },
        '../../runtime/bootstrap/initialize.cjs': { assertRuntimeConfig: value => value },
        '../../runtime/transport/databases.cjs': { clients: () => { throw new Error('Must reject snapshot before database access'); } },
        '../../runtime/bootstrap/accounts.cjs': { validateAccounts: () => {} },
        '../../runtime/bootstrap/enrollment.cjs': { pinnedAdapters: () => {}, validatePassword: () => {} },
        '../../runtime/transport/web-certificates.cjs': { normalizeHosts: value => value, provisionWeb: () => { provisioned = true; } },
        './install-host.cjs': { privateWrite: () => {} },
        '../../runtime/release/maintenance.cjs': { authorizeStart: () => {}, blockStart: () => {} },
    };
    const moduleFixture = { exports: {} };
    const requireFixture = name => { assert.ok(Object.hasOwn(dependencies, name), `Unexpected import ${name}`); return dependencies[name]; };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../tools/system/onboard-ui.cjs'), 'utf8'), {
        module: moduleFixture, exports: moduleFixture.exports, require: requireFixture,
        process: { getuid: () => 0, pid: 321 }, Buffer, TextDecoder,
        setTimeout, clearTimeout, URL,
    });
    await assert.rejects(moduleFixture.exports.onboard({ '--password-file': '/password', '--accounts-file': '/accounts', '--license-trust': '/trust', '--hosts-file': '/hosts' }),
        error => error.code === 'ONBOARD_SNAPSHOT_CHANGED');
    assert.deepEqual(events, ['current-before-lock', 'lock', 'current-under-lock']);
    assert.equal(provisioned, false);
});

function mockHttpsResponse(t, options = {}) {
    t.mock.method(https, 'get', settings => {
        assert.equal(settings.agent, false);
        assert.equal(settings.minVersion, 'TLSv1.3');
        assert.equal(settings.maxVersion, 'TLSv1.3');
        assert.equal(settings.rejectUnauthorized, true);
        assert.equal(settings.servername, 'localhost');
        assert.equal(settings.path, settings.port === 8081 ? '/nexowatt/license/status' : '/api/strict-auth/status');
        const request = new EventEmitter();
        request.destroy = () => {};
        process.nextTick(() => {
            const response = new EventEmitter();
            response.socket = { authorized: options.authorized !== false,
                getProtocol: () => options.protocol || 'TLSv1.3' };
            response.statusCode = options.statusCode ?? (settings.port === 8081 ? 302 : 200);
            response.headers = { location: options.location ?? '/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus' };
            const body = options.body ?? (settings.port === 8081 ? 'Redirecting to login' :
                { ok: true, enabled: true, strict: true, authed: false, protectWrites: true, isAdmin: false });
            request.emit('response', response);
            response.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
            response.emit('end');
        });
        return request;
    });
}
test('readiness requires the fixed Admin/UI anonymous security contract over checked TLS', async t => {
    mockHttpsResponse(t);
    await probeWeb(8081, Buffer.from('synthetic public CA fixture'));
    await probeWeb(8188, Buffer.from('synthetic public CA fixture'));
});
for (const [name, port, options] of [
    ['admin unexpected success', 8081, { statusCode: 200 }],
    ['admin unrelated forbidden response', 8081, { statusCode: 403, body: { error: 'OTHER' } }],
    ['admin external redirect', 8081, { location: 'https://example.invalid/index.html?login' }],
    ['admin protocol relative redirect', 8081, { location: '//example.invalid/index.html?login' }],
    ['admin unexpected local redirect', 8081, { location: '/index.html?login' }],
    ['admin extra redirect parameters', 8081, { location: '/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus&other=1' }],
    ['UI anonymous writes', 8188, { body: { ok: true, enabled: true, strict: true, authed: false, protectWrites: false, isAdmin: false } }],
    ['UI anonymous admin', 8188, { body: { ok: true, enabled: true, strict: true, authed: false, protectWrites: true, isAdmin: true } }],
    ['unverified peer', 8081, { authorized: false }],
    ['old TLS version', 8081, { protocol: 'TLSv1.2' }],
    ['oversized body', 8081, { body: 'x'.repeat(16385) }],
    ['invalid UI JSON', 8188, { body: 'not-json' }],
]) test(`readiness rejects ${name}`, async t => {
    mockHttpsResponse(t, options);
    await assert.rejects(probeWeb(port, Buffer.from('synthetic public CA fixture')), /ONBOARD_HTTPS_NOT_READY/);
});
