'use strict';
// Execute the shipped SQL against the real schema. Native PostgreSQL 17.11 is
// preferred in CI; PGlite is a supplemental SQL/RLS check, never Pi acceptance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sql = fs.readFileSync(path.join(root, 'tools/system/complete-r8-admin-setup.sql'), 'utf8');
const schemaFile = path.join(root, 'runtime/postgresql/schema.sql');
const bytes = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
const byteLiteral = value => `decode('${bytes(value).toString('hex')}', 'hex')`;
const literal = value => `'${value.replaceAll("'", "''")}'`;

async function database(t) {
    if (process.env.EOS_PG_BIN_DIRECTORY) {
        const { startLab } = require('../postgresql/fixtures/lab-cluster.cjs');
        const lab = await startLab({ schemaFile });
        t.after(() => lab.stop());
        t.diagnostic(`engine=${lab.metadata.version}; scope=native SQL/RLS in disposable laboratory`);
        return {
            exec: async text => lab.psql(text),
            rows: async query => JSON.parse(lab.psql('\\set QUIET 1\n\\pset format unaligned\n\\pset tuples_only on\n' +
                `SELECT COALESCE(json_agg(result), '[]'::json) FROM (${query}) AS result;`).trim()),
        };
    }
    let PGlite;
    try { ({ PGlite } = require(process.env.EOS_PGLITE_MODULE_DIRECTORY || '@electric-sql/pglite')); }
    catch { throw new Error('EOS_SQL_TEST_REQUIRES_NATIVE_PG_OR_PGLITE; no skipped SQL validation'); }
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(fs.readFileSync(schemaFile, 'utf8'));
    t.diagnostic(`engine=${(await db.query('SELECT version()')).rows[0].version}; scope=WASM SQL/RLS only`);
    return { exec: text => db.exec(text), rows: async query => (await db.query(query)).rows };
}

function documents() {
    const configHash = 'a'.repeat(64);
    return {
        'system.config': { _id: 'system.config', type: 'config', common: { name: 'System settings', diag: 'none',
            activeRepo: [], adapterAutoUpgrade: { defaultPolicy: 'none', repositories: {} },
            language: 'de', siteName: 'Fixture site', timeZone: 'Europe/Berlin' },
            native: { unrelated: 'fixture-preserved-field' }, acl: { object: 1636 }, ts: 123 },
        'system.repositories': { _id: 'system.repositories', type: 'config', common: {},
            native: { repositories: {}, oldRepositories: {} } },
        'system.meta.eosTestBase': { _id: 'system.meta.eosTestBase', type: 'meta', common: {}, native: {
            profile: 'eos-core-only-bootstrap-v1', state: 'complete', coreControllerVersion: '7.2.2',
            bootstrapPolicyVersion: 1, runtimeConfigSha256: configHash } },
        'system.meta.eosEnrollment': { _id: 'system.meta.eosEnrollment', type: 'meta', common: {}, native: {
            profile: 'eos-integrated-ui-lab-v1', version: 2, state: 'complete', firstRunPolicyVersion: 1,
            accountPolicyVersion: 1, physicalControlEnabled: false, runtimeConfigSha256: configHash } },
        'system.meta.eosFirstStart': { _id: 'system.meta.eosFirstStart', type: 'meta', common: {}, native: {
            schemaVersion: 1, state: 'complete', configurationValidated: true, physicalControlEnabled: false } },
        'fixture.unrelated': { retained: 'Unrelated records must remain byte-identical.' },
    };
}
async function seed(db, docs = documents()) {
    await db.exec('ROLLBACK; RESET ROLE; TRUNCATE eos_store.kv, eos_store.events RESTART IDENTITY;');
    for (const [id, value] of Object.entries(docs)) {
        await db.exec(`INSERT INTO eos_store.kv(domain,key,value) VALUES ('objects',${literal('cfg.o.' + id)},${byteLiteral(value)});`);
    }
    await db.exec(`INSERT INTO eos_store.kv(domain,key,value) VALUES ('states','fixture.state',${byteLiteral('Unrelated state bytes')});`);
    return docs;
}
const inventory = db => db.rows("SELECT domain,key,encode(value,'hex') AS value,expires_at FROM eos_store.kv ORDER BY domain,key");
const events = db => db.rows("SELECT domain,channel,encode(payload,'hex') AS payload,expired FROM eos_store.events ORDER BY id");
async function rejectsUnchanged(db, expected) {
    const before = await inventory(db), beforeEvents = await events(db);
    await assert.rejects(() => db.exec(sql), expected);
    await db.exec('ROLLBACK; RESET ROLE;');
    assert.deepEqual(await inventory(db), before);
    assert.deepEqual(await events(db), beforeEvents);
}

test('R8 Admin setup compatibility repair executes atomically under the objects role', { timeout: 180000 }, async t => {
    const db = await database(t);
    t.diagnostic(`sqlSha256=${crypto.createHash('sha256').update(sql).digest('hex')}`);

    await t.test('missing flag becomes true; every other value and row is retained; one matching event is committed', async () => {
        const docs = await seed(db), before = await inventory(db);
        const result = await db.exec(sql);
        const after = await inventory(db), row = after.find(item => item.key === 'cfg.o.system.config');
        const expected = structuredClone(docs['system.config']); expected.common.licenseConfirmed = true;
        assert.deepEqual(JSON.parse(Buffer.from(row.value, 'hex')), expected);
        assert.deepEqual(after.filter(item => item !== row), before.filter(item => item.key !== row.key));
        assert.equal(row.expires_at, null);
        assert.deepEqual(await events(db), [{ domain: 'objects', channel: 'cfg.o.system.config', payload: row.value, expired: false }]);
        const output = typeof result === 'string' ? result : JSON.stringify(result);
        assert.match(output, /EOS_R8_ADMIN_SETUP_COMPLETE/);
        assert.doesNotMatch(output, /fixture-preserved-field|Fixture site|Europe\/Berlin/);
    });
    await t.test('an explicit false flag is repaired', async () => {
        const docs = documents(); docs['system.config'].common.licenseConfirmed = false;
        await seed(db, docs); await db.exec(sql);
        const row = (await inventory(db)).find(item => item.key === 'cfg.o.system.config');
        assert.equal(JSON.parse(Buffer.from(row.value, 'hex')).common.licenseConfirmed, true);
    });
    await t.test('repeating the repair preserves all bytes and emits no duplicate event', async () => {
        const before = await inventory(db), beforeEvents = await events(db);
        await db.exec(sql);
        assert.deepEqual(await inventory(db), before); assert.deepEqual(await events(db), beforeEvents);
    });
    const rejectCases = [
        ['unfinished enrollment', d => { d['system.meta.eosEnrollment'].native.state = 'pending'; }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['unfinished first-start', d => { d['system.meta.eosFirstStart'].native.state = 'pending'; }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['missing validated-configuration marker', d => { delete d['system.meta.eosFirstStart'].native.configurationValidated; }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['physical-control admission', d => { d['system.meta.eosEnrollment'].native.physicalControlEnabled = true; }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['different runtime configuration binding', d => { d['system.meta.eosTestBase'].native.runtimeConfigSha256 = 'b'.repeat(64); }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['string policy version', d => { d['system.meta.eosEnrollment'].native.firstRunPolicyVersion = '1'; }, /EOS_R8_ADMIN_SETUP_INCOMPLETE/],
        ['telemetry enabled', d => { d['system.config'].common.diag = 'extended'; }, /EOS_R8_ADMIN_SETUP_POLICY/],
        ['active repository', d => { d['system.config'].common.activeRepo = ['stable']; }, /EOS_R8_ADMIN_SETUP_POLICY/],
        ['automatic updates enabled', d => { d['system.config'].common.adapterAutoUpgrade.defaultPolicy = 'major'; }, /EOS_R8_ADMIN_SETUP_POLICY/],
        ['repository configured', d => { d['system.repositories'].native.repositories = { stable: {} }; }, /EOS_R8_ADMIN_SETUP_POLICY/],
        ['missing repository restriction', d => { delete d['system.repositories'].native.oldRepositories; }, /EOS_R8_ADMIN_SETUP_POLICY/],
        ['wrong document identity', d => { d['system.config']._id = 'other'; }, /EOS_R8_ADMIN_SETUP_OBJECT/],
        ['wrong document type', d => { d['system.config'].type = 'state'; }, /EOS_R8_ADMIN_SETUP_OBJECT/],
        ['nonboolean compatibility flag', d => { d['system.config'].common.licenseConfirmed = 'false'; }, /EOS_R8_ADMIN_SETUP_FLAG/],
        ['missing first-start record', d => { delete d['system.meta.eosFirstStart']; }, /EOS_R8_ADMIN_SETUP_OBJECT/],
        ['invalid JSON', d => { d['system.config'] = '{ invalid PRIVATE_FIXTURE_MARKER'; }, /EOS_R8_ADMIN_SETUP_JSON/],
        ['oversized object', d => { d['system.config'].native.padding = 'x'.repeat(131072); }, /EOS_R8_ADMIN_SETUP_OBJECT/],
    ];
    for (const [name, change, expected] of rejectCases) await t.test(`${name} rejects without any write or event`, async () => {
        const docs = documents(); change(docs); await seed(db, docs);
        await rejectsUnchanged(db, expected);
    });
    await t.test('expired or future-expiring configuration is rejected instead of revived', async () => {
        await seed(db);
        await db.exec("UPDATE eos_store.kv SET expires_at = clock_timestamp() + interval '1 hour' WHERE domain='objects' AND key='cfg.o.system.config';");
        await rejectsUnchanged(db, /EOS_R8_ADMIN_SETUP_OBJECT/);
    });
    await t.test('event insertion failure rolls the earlier object update back', async () => {
        await seed(db);
        await db.exec('ALTER TABLE eos_store.events ADD CONSTRAINT fixture_event_failure CHECK (false);');
        try { await rejectsUnchanged(db, /fixture_event_failure/); }
        finally { await db.exec('ALTER TABLE eos_store.events DROP CONSTRAINT fixture_event_failure;'); }
    });
    await t.test('already-true flag cannot bypass incomplete first-start checks', async () => {
        const docs = documents(); docs['system.config'].common.licenseConfirmed = true;
        docs['system.meta.eosFirstStart'].native.state = 'pending';
        await seed(db, docs); await rejectsUnchanged(db, /EOS_R8_ADMIN_SETUP_INCOMPLETE/);
    });
});
