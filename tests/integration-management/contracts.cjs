'use strict';
// Explicit local preflight; this does not replace the native integration gate.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { authenticate, PIN } = require('./prepare-bundle.cjs');
const directory = process.env.EOS_MANAGEMENT_R7_BUNDLE, keyFile = process.env.EOS_MANAGEMENT_R7_KEY;
if (!directory || !keyFile) throw new Error('MANAGEMENT_AUTHENTIC_R7_INPUT_REQUIRED');
const key = fs.readFileSync(keyFile);
let verified;
test('entire authentic R7 manifest and signed payload match the fixed management baseline', () => {
    verified = authenticate(directory, key); assert.equal(verified.releaseId, PIN.releaseId); assert.equal(verified.manifest.files.length, 22841);
});
test('a substituted trust key is rejected before any extracted code is used', () => {
    const other = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' });
    assert.throws(() => authenticate(directory, other), { code: 'MANAGEMENT_LAB_KEY_PIN' });
});
test('real R7 license core accepts the ephemeral signed entitlement and encrypted store, rejects a different UUID', async t => {
    assert.ok(verified);
    const appRequire = createRequire(path.join(verified.payloadPath, 'app/package.json'));
    const core = appRequire('iobroker.eos-admin/build/lib/eosLicenseCore.js');
    const issuer = crypto.generateKeyPairSync('ed25519'), uuid = crypto.randomUUID();
    const trust = { nativeManagementLab: issuer.publicKey.export({ format: 'pem', type: 'spki' }).toString() };
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-management-license-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const storePath = path.join(root, 'licensing');
    await require('./ephemeral-license.cjs').provision({ core, uuid, trust, issuer: issuer.privateKey, directory: storePath });
    const record = await new core.EncryptedLicenseStore({ directory: storePath, uuid }).load();
    assert.equal(core.verifyLicense(record.token, { uuid, publicKeys: trust }).edition, 'home');
    assert.throws(() => core.verifyLicense(record.token, { uuid: crypto.randomUUID(), publicKeys: trust }), { code: 'LICENSE_UUID_MISMATCH' });
    assert.equal(fs.statSync(path.join(storePath, 'storage.key')).mode & 0o077, 0);
});
test('root fixture refuses accidental execution outside explicit disposable-host authorization', () => {
    const previous = process.env.EOS_DISPOSABLE_MANAGEMENT_LAB;
    try { delete process.env.EOS_DISPOSABLE_MANAGEMENT_LAB;
        assert.throws(() => require('./prepare-fixed-root.cjs').prepare('/tmp', '1001', '1001'), /MANAGEMENT_FIXED_FIXTURE_REJECTED/);
    } finally { if (previous !== undefined) process.env.EOS_DISPOSABLE_MANAGEMENT_LAB = previous; }
});
test('HTTPS diagnostics expose only fixed stage/code/reason and the expected fixed port', () => {
    const { probeFailure } = require('./diagnostics.cjs');
    const secret = 'private-marker-must-never-appear';
    assert.deepEqual(probeFailure({ code: secret, stage: secret, reason: secret, message: secret, port: secret }, 9000),
        { code: 'MANAGEMENT_PROBE_FAILED', stage: 'unknown', reason: 'unknown', port: null });
    assert.deepEqual(probeFailure({ code: 'ONBOARD_HTTPS_NOT_READY', stage: 'https-probe', reason: 'deadline', message: secret }, 8188),
        { code: 'ONBOARD_HTTPS_NOT_READY', stage: 'https-probe', reason: 'deadline', port: 8188 });
});
test('management fixture preserves the exact production PostgreSQL admission profile', () => {
    const { resolveLabProfile } = require('../postgresql/fixtures/lab-cluster.cjs');
    const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
    assert.deepEqual(resolveLabProfile(), { port: null, database: 'eos_lab' });
    assert.deepEqual(resolveLabProfile('management'), { port: 15432, database: 'eos' });
    for (const input of [null, true, 15432, {}, 'eos', '127.0.0.1', 'management;DROP DATABASE eos']) {
        assert.throws(() => resolveLabProfile(input), { code: 'EOS_PG_LAB_PROFILE' });
    }
    const config = { system: { hostname: 'eos-management-lab', compact: false, allowShellCommands: false },
        multihostService: { enabled: false }, plugins: { sentry: { enabled: false } } };
    for (const domain of ['objects', 'states']) config[domain] = { type: 'postgresql', host: '127.0.0.1', ...resolveLabProfile('management'),
        user: 'eos_' + domain, options: { ssl: { ca: 'admission-only-ca', cert: domain + '-admission-cert', key: domain + '-admission-key' } } };
    assert.equal(assertRuntimeConfig(config), config);
    for (const [field, value] of [['port', 5432], ['database', 'eos_lab'], ['host', 'localhost']]) {
        const altered = structuredClone(config); altered.objects[field] = value;
        assert.throws(() => assertRuntimeConfig(altered), { code: 'POSTGRESQL_LOCAL_PROFILE_REQUIRED' });
    }
});
test('bootstrap diagnostics retain known phase failures without exposing messages, values or paths', () => {
    const { stageFailure } = require('./diagnostics.cjs');
    assert.equal(stageFailure(new Error('ORDINARY_SETUP_REQUIRED')), 'ORDINARY_SETUP_REQUIRED');
    assert.equal(stageFailure(new Error('EXISTING_RUNTIME_OR_ADAPTERS_FORBIDDEN')), 'EXISTING_RUNTIME_OR_ADAPTERS_FORBIDDEN');
    assert.equal(stageFailure({ code: 'STORAGE_UNSAFE_PATH', message: 'private license details' }), 'STORAGE_UNSAFE_PATH');
    assert.equal(stageFailure({ code: 'EACCES', path: '/private/secret', message: 'private content' }), 'MANAGEMENT_FS_EACCES');
    assert.equal(stageFailure({ code: 'ERR_ASSERTION', actual: 'private-content', expected: 'private-content' }), 'MANAGEMENT_ASSERTION_FAILED');
    assert.equal(stageFailure(new TypeError('private-content')), 'MANAGEMENT_TYPE_ERROR');
    assert.equal(stageFailure(new Error('PRIVATE_SECRET_TEXT')), 'MANAGEMENT_STAGE_FAILED');
    assert.equal(stageFailure({ code: 'EOS_PG_UNREVIEWED_SECRET' }), 'MANAGEMENT_STAGE_FAILED');
    assert.equal(stageFailure({ code: 'EOS_PG_PRIVATE_SECRET lower case text' }), 'MANAGEMENT_STAGE_FAILED');
});
test('final inventory remains exact and limits diagnostics to counts, two static launcher paths and path hashes', () => {
    const { inventoryDifference, stageFailure } = require('./diagnostics.cjs');
    const before = [{ path: 'signed-file', type: 'file', sha256: 'a' }];
    assert.deepEqual(inventoryDifference(before, before), { matches: true, added: 0, removed: 0, changed: 0, samples: [] });
    const after = [{ path: 'signed-file', type: 'file', sha256: 'b' }, { path: 'iob', type: 'file', sha256: 'private-content' },
        ...Array.from({ length: 12 }, (_, i) => ({ path: 'private-name-' + i, type: 'file', sha256: 'private-content' }))];
    const difference = inventoryDifference(before, after);
    assert.equal(difference.matches, false); assert.equal(difference.added, 13); assert.equal(difference.changed, 1);
    assert.equal(difference.samples.length, 8); assert.equal(difference.samples[1].knownPath, 'iob');
    assert.ok(difference.samples.every(row => /^[a-f0-9]{64}$/.test(row.pathSha256)));
    assert.ok(!JSON.stringify(difference).includes('private-'));
    assert.equal(inventoryDifference(before, []).removed, 1);
    assert.equal(stageFailure(new Error('MANAGEMENT_APP_CHANGED')), 'MANAGEMENT_APP_CHANGED');
    assert.equal(stageFailure(new Error('MANAGEMENT_CONTROLLER_STOP_FAILED')), 'MANAGEMENT_CONTROLLER_STOP_FAILED');
});
test('actual R7 CI sentinel fails real licensing and the product child environment disables CI detection', () => {
    assert.ok(verified);
    const environment = require('./environment.cjs').productEnvironment();
    assert.equal(environment.CI, 'false');
    assert.deepEqual(Object.keys(environment).sort(), ['CI', 'HOME', 'IOBROKER_DATA_DIR', 'LANG', 'NODE_ENV', 'NODE_OPTIONS', 'NODE_PATH', 'PATH', 'SENTRY_DSN'].sort());
    // Only object persistence is represented by an in-memory store. The exact
    // authenticated createUuid, ci-info, licensing and AES-store modules run.
    // Separate processes prevent ci-info's cached detection from crossing cases.
    const source = `
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const r=require('node:module').createRequire(process.argv[1]+'/package.json');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'eos-real-uuid-'));
console.log=()=>{};
(async()=>{try{
 const tools=r('@iobroker/js-controller-common').tools;
 let record,writes=0;
 const objects={getObject:async id=>id==='system.user.admin'?{type:'user'}:record,
   setObject:async(id,value)=>{if(id!=='system.meta.uuid')throw new Error('UNEXPECTED_WRITE');record=value;writes++;}};
 await tools.createUuid(objects);
 const uuid=record.native.uuid,core=r('iobroker.eos-admin/build/lib/eosLicenseCore.js');
 const issuer=crypto.generateKeyPairSync('ed25519');
 const trust={nativeManagementLab:issuer.publicKey.export({format:'pem',type:'spki'}).toString()};
 let license='LICENSE_VALID';
 try{await require(process.argv[2]).provision({core,uuid,trust,issuer:issuer.privateKey,directory:path.join(temporary,'licensing')});}
 catch(e){license=e.code==='LICENSE_UUID_INVALID'?'LICENSE_UUID_INVALID':'UNEXPECTED_FAILURE';}
 process.stdout.write(JSON.stringify({ciDetected:r('ci-info').isCI,sentinel:uuid==='55travis-pipe-line-cior-githubaction',writes,license}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}})().catch(()=>process.exitCode=1);`;
    const result = spawnSync(process.execPath, ['-e', source, path.join(verified.payloadPath, 'app'), path.join(__dirname, 'ephemeral-license.cjs')],
        { env: { ...environment, CI: 'true' }, encoding: 'utf8', timeout: 15000, maxBuffer: 4096 });
    assert.equal(result.status, 0, 'actual-module CI-sentinel child must complete');
    assert.deepEqual(JSON.parse(result.stdout), { ciDetected: true, sentinel: true, writes: 1, license: 'LICENSE_UUID_INVALID' });
    // The local execution sandbox cannot enumerate network interfaces; real
    // normal createUuid execution is mandatory in the native setup/license
    // integration. This local case claims only actual ci-info detection.
    const detection = spawnSync(process.execPath, ['-e', "const r=require('node:module').createRequire(process.argv[1]+'/package.json');process.stdout.write(JSON.stringify({isCI:r('ci-info').isCI}));", path.join(verified.payloadPath, 'app')],
        { env: { ...environment, GITHUB_ACTIONS: 'true', TRAVIS: 'true' }, encoding: 'utf8', timeout: 15000, maxBuffer: 4096 });
    assert.equal(detection.status, 0);
    assert.deepEqual(JSON.parse(detection.stdout), { isCI: false });
});
test('authenticated license results require real authorization, validity and the enrolled UUID without exporting secrets', () => {
    const { loginToken, licenseSummary } = require('./authenticated-license.cjs');
    const uuid = crypto.randomUUID(), token = crypto.randomBytes(32).toString('base64url');
    assert.equal(loginToken({ status: 200, data: { access_token: token } }), token);
    for (const response of [{ status: 302, data: { access_token: token } }, { status: 200, data: {} }, { status: 200, data: { access_token: 'private\r\nheader' } }]) {
        assert.throws(() => loginToken(response), { code: 'MANAGEMENT_ADMIN_LOGIN_FAILED' });
    }
    const result = { status: 200, data: { v: 1, valid: true, code: 'LICENSE_VALID', uuid, edition: 'home', rawToken: token } };
    assert.deepEqual(licenseSummary(result, uuid), { authenticated: true, licenseValid: true, code: 'LICENSE_VALID', uuidMatched: true });
    for (const response of [{ ...result, status: 401 }, { ...result, data: { ...result.data, valid: false } },
        { ...result, data: { ...result.data, code: 'LICENSE_MISSING' } }, { ...result, data: { ...result.data, uuid: crypto.randomUUID() } }]) {
        assert.throws(() => licenseSummary(response, uuid), { code: 'MANAGEMENT_LICENSE_STATUS_FAILED' });
    }
});
test('private runtime log reads only new bounded bytes per boot and rejects unsafe files', t => {
    const { RuntimeLog } = require('./runtime-log.cjs');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-private-log-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const file = path.join(root, 'runtime.2026-10-04.log');
    fs.writeFileSync(file, 'old error: private-old-content\n[EOS licensing] LICENSE_VALID\n', { mode: 0o600 });
    const first = new RuntimeLog(root); assert.deepEqual(first.scan(), { bytesRead: 0, indicators: [] });
    fs.appendFileSync(file, 'new info: [EOS licensing] LICENSE_VALID\n');
    assert.deepEqual(first.scan().indicators, ['LICENSE_VALID']);
    const second = new RuntimeLog(root); assert.deepEqual(second.scan(), { bytesRead: 0, indicators: [] });
    fs.appendFileSync(file, 'new \u001b[31merror\u001b[39m: private-secret TypeError: hidden-value\n');
    assert.deepEqual(second.scan().indicators, ['RUNTIME_ERROR_LOGGED', 'TYPE_ERROR']);
    assert.ok(!JSON.stringify(second.scan()).includes('private-secret'));
    fs.chmodSync(file, 0o644); assert.throws(() => second.scan(), /MANAGEMENT_LOG_BOUNDARY/); fs.chmodSync(file, 0o600);
    fs.truncateSync(file, 0); assert.throws(() => second.scan(), /MANAGEMENT_LOG_TRUNCATED/);
    fs.unlinkSync(file); fs.mkdirSync(file); assert.throws(() => second.scan(), /MANAGEMENT_LOG_BOUNDARY/); fs.rmdirSync(file);
    fs.symlinkSync('missing-private-log', file); assert.throws(() => second.scan(), /MANAGEMENT_LOG_BOUNDARY/); fs.unlinkSync(file);
    assert.equal(spawnSync('mkfifo', [file], { timeout: 5000, stdio: 'ignore' }).status, 0);
    assert.throws(() => second.scan(), /MANAGEMENT_LOG_BOUNDARY/);
});
