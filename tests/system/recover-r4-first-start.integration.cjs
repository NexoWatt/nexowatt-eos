'use strict';
// Explicit integration command: authenticate the real extracted R4 bundle and
// execute the complete eligibility collector. Only PG transport and OS UIDs are
// injected; historical policy/enrollment, files and cryptography run for real.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const recovery = require('../../tools/system/recover-r4-first-start-to-r7.cjs');
const bundle = require('../../runtime/release/bundle.cjs');
const bundleDirectory = process.env.EOS_R4_RECOVERY_BUNDLE;
const keyFile = process.env.EOS_R4_RECOVERY_KEY;
assert.ok(bundleDirectory && keyFile, 'Provide authenticated R4 bundle and public-key paths for this explicit integration command');
const publicKey = fs.readFileSync(keyFile);
assert.equal(bundle.sha256(publicKey), recovery.BASES[0].publicKeySha256);
const verified = bundle.verifyBundle({ bundleDirectory, publicKey, platform: 'linux-arm64', nodeVersion: '24.21.0' });
assert.equal(verified.releaseId, recovery.BASES[0].releaseId); assert.equal(verified.manifest.sequence, 7);
const releasePath = verified.payloadPath, app = path.join(releasePath, 'app');
const historicalPolicy = require(path.join(releasePath, 'runtime/onboarding/policy.cjs'));
const historicalEnrollment = require(path.join(releasePath, 'runtime/bootstrap/enrollment.cjs'));
const core = require(path.join(app, 'node_modules/iobroker.eos-admin/build/lib/eosLicenseCore.js'));
assert.equal(bundle.sha256(fs.readFileSync(path.join(releasePath, 'runtime/onboarding/policy.cjs'))), '7c1ce7527ce9df41e3773ac9a3ca4122cc1af263b6ad5bf749ec1815abc595b1');
const hash = value => bundle.sha256(JSON.stringify(value));
async function fixture(t, mode = 'activate') {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-authentic-r4-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name);
    for (const name of ['/etc/nexowatt-eos', '/var/lib/nexowatt-eos/onboarding']) fs.mkdirSync(at(name), { recursive: true, mode: 0o700 });
    const write = (name, value) => fs.writeFileSync(at(name), JSON.stringify(value), { mode: 0o600 });
    const connection = domain => ({ type: 'postgresql', host: '127.0.0.1', port: 15432, database: 'eos', user: 'eos_' + domain,
        options: { ssl: { ca: 'fixture-ca', cert: 'fixture-' + domain + '-cert', key: 'fixture-' + domain + '-key' } } });
    const config = { objects: connection('objects'), states: connection('states'), system: { hostname: 'r4-collector-fixture', compact: false, allowShellCommands: false },
        multihostService: { enabled: false }, plugins: { sentry: { enabled: false } } };
    const uuid = crypto.randomUUID();
    const records = new Map([
        ['system.meta.eosTestBase', { type: 'meta', native: { state: 'complete', profile: 'eos-core-only-bootstrap-v1', coreControllerVersion: '7.2.2', bootstrapPolicyVersion: 1, runtimeConfigSha256: hash(config) } }],
        ['system.config', { type: 'config', common: { diag: 'none', activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} } } }],
        ['system.repositories', { type: 'config', native: { repositories: {}, oldRepositories: {} } }],
        ['system.group.administrator', { type: 'group', common: { members: ['system.user.admin'] } }],
        ['system.user.admin', { type: 'user', common: { enabled: false, password: '' } }],
        ['system.meta.uuid', { type: 'meta', native: { uuid } }],
    ].map(([id, doc]) => [id, { _id: id, ...doc }]));
    const settings = { siteName: 'Historical R4 fixture', language: 'de', timeZone: 'Europe/Berlin', licenseMode: mode === 'activate' ? 'verified' : 'unlicensed',
        deviceMode: 'disabled-pending-acceptance', safetyAcknowledged: true,
        plant: { mode: 'deferred', reason: 'no-plant-connected' }, devicePlan: { status: 'none', devices: [], confirmed: true } };
    const passwordHash = `pbkdf2$600000$${crypto.randomBytes(256).toString('hex')}$${crypto.randomBytes(16).toString('hex')}`;
    const objects = { getObjectAsync: async id => structuredClone(records.get(id)), setObjectAsync: async (id, doc) => records.set(id, structuredClone(doc)),
        getObjectViewAsync: async (_, type) => ({ rows: [...records.values()].filter(doc => doc.type === type).map(value => ({ value })) }) };
    await historicalEnrollment.enrollFirstRun({ objects, states: { getState: async () => ({ val: false }) }, config, app, passwordHash, settings, verifyFresh: async () => {} });
    for (const name of ['eos-admin', 'nexowatt-ui']) records.get(`system.adapter.${name}.0`).common.enabled = true;
    const issuer = crypto.generateKeyPairSync('ed25519');
    const trust = { recoveryFixture: issuer.publicKey.export({ format: 'pem', type: 'spki' }).toString() };
    const now = Date.now(), claims = { v: 2, kid: 'recoveryFixture', licenseId: 'ephemeral-in-memory-test', uuid, edition: 'home', issuedAt: now - 1000,
        notBefore: now - 1000, expiresAt: now + 600000, adapters: ['nexowatt-ui', 'nexowatt-devices'], limits: { chargePoints: 3, batteries: 2 } };
    const message = 'NWL2.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    const token = mode === 'activate' ? message + '.' + crypto.sign(null, Buffer.from(message), issuer.privateKey).toString('base64url') : '';
    const handoff = { schemaVersion: 2, releaseId: recovery.BASES[0].releaseId, setupId: crypto.randomBytes(16).toString('hex'), passwordHash, settings, license: { mode, token } };
    historicalPolicy.validateHandoff(handoff, recovery.BASES[0].releaseId);
    write('/etc/nexowatt-eos/iobroker.json', config); write('/etc/nexowatt-eos/license-trust.json', trust);
    write('/etc/nexowatt-eos/license-device.json', { schemaVersion: 1, releaseId: recovery.BASES[0].releaseId, uuid });
    write('/var/lib/nexowatt-eos/onboarding/handoff.json', handoff);
    write('/var/lib/nexowatt-eos/onboarding/state.json', { schemaVersion: 1, releaseId: handoff.releaseId, setupId: handoff.setupId,
        state: 'committing', codeHash: null, origin: 'https://test.invalid:8443', expiresAt: now - 1, attempts: 1 });
    const store = new core.EncryptedLicenseStore({ directory: at('/var/lib/nexowatt-eos/iobroker-data/eos-admin.0/licensing'), uuid });
    if (mode === 'activate') await store.save({ token, highWaterMark: now - 1 });
    const queries = [];
    class PgClient extends EventEmitter {
        constructor() { super(); this.connection = { stream: { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3' } }; }
        async connect() {}
        async query(sql) { queries.push(sql); return { rows: sql.startsWith('SELECT') ? [...records].map(([id, doc]) => ({ key: 'cfg.o.' + id, value: Buffer.from(JSON.stringify(doc)) })) : [] }; }
        async end() {}
    }
    return { at, records, handoff, store, queries, write, config,
        replaceLicenseToken: async () => {
            const message = 'NWL2.' + Buffer.from(JSON.stringify({ ...claims, licenseId: 'different-valid-ephemeral-test' })).toString('base64url');
            const replacement = message + '.' + crypto.sign(null, Buffer.from(message), issuer.privateKey).toString('base64url');
            await store.save({ token: replacement, highWaterMark: Date.now() });
        },
        collect: () => recovery.verifyFirstStart({ at, releasePath, baseline: recovery.BASES[0], owner: () => {}, read: file => fs.readFileSync(file) },
            { root, accountUids: { 'eos-setup': process.getuid(), 'eos-runtime': process.getuid() }, pgClient: PgClient }) };
}
test('actual authenticated R4 schema2 handoff reaches complete collector with real enrollment and encrypted license', async t => {
    const f = await fixture(t), before = fs.readFileSync(f.at('/var/lib/nexowatt-eos/onboarding/handoff.json'));
    const result = await f.collect(); assert.equal(result.licenseConfigured, true); assert.equal(result.setupId, f.handoff.setupId);
    result.assertPreserved(); await result.verifyLive();
    assert.deepEqual(fs.readFileSync(f.at('/var/lib/nexowatt-eos/onboarding/handoff.json')), before);
    assert.ok(f.queries.every(sql => /^(BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY|SELECT |ROLLBACK)/.test(sql)));
    await f.store.save({ token: f.handoff.license.token, highWaterMark: Date.now() }); result.assertPreserved();
});
test('actual authenticated R4 unlicensed handoff remains unlicensed without creating license storage', async t => {
    const f = await fixture(t, 'unlicensed'), result = await f.collect();
    assert.equal(result.licenseConfigured, false); result.assertPreserved(); await result.verifyLive();
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos/iobroker-data')), false);
});
for (const [name, mutate] of [
    ['later schema3 substitution', f => { f.handoff.schemaVersion = 3; f.write('/var/lib/nexowatt-eos/onboarding/handoff.json', f.handoff); }],
    ['pending enrollment', f => { f.records.get('system.meta.eosEnrollment').native.state = 'pending'; }],
    ['changed stored password', f => { f.records.get('system.user.admin').common.password += 'changed'; }],
    ['changed stored UUID', f => { f.records.get('system.meta.uuid').native.uuid = crypto.randomUUID(); }],
    ['changed encrypted license', f => fs.writeFileSync(f.at('/var/lib/nexowatt-eos/iobroker-data/eos-admin.0/licensing/license.enc'), '{}')],
    ['different authenticated token in encrypted store', f => f.replaceLicenseToken()],
    ['malformed historical settings', f => { f.handoff.settings.unexpected = true; f.write('/var/lib/nexowatt-eos/onboarding/handoff.json', f.handoff); }],
    ['foreign PostgreSQL object namespace', f => { f.config.objects.redisNamespace = 'other'; f.write('/etc/nexowatt-eos/iobroker.json', f.config); }],
]) test('real R4 collector refuses ' + name, async t => { const f = await fixture(t); await mutate(f); await assert.rejects(f.collect()); });
