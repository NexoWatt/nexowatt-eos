'use strict';
// Supplemental SQL/RLS validation only. PGlite is neither the target server nor
// a transport/authentication/concurrency/ARM64 acceptance environment.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const modulePath = process.env.EOS_PGLITE_MODULE_DIRECTORY;
test('supplemental PostgreSQL schema SQL and RLS in WASM', {skip:!modulePath && 'EOS_PGLITE_MODULE_DIRECTORY is required for optional WASM checks'}, async t=>{
 const {PGlite}=require(modulePath);
 const db=new PGlite();
 t.after(()=>db.close());
 const schema=fs.readFileSync(path.resolve(__dirname,'../../runtime/postgresql/schema.sql'),'utf8');
 t.diagnostic(JSON.stringify({scope:'WASM SQL/RLS only',engine:(await db.query('SELECT version()')).rows[0].version,schemaSha256:crypto.createHash('sha256').update(schema).digest('hex')}));
 await t.test('schema initializes on fresh database',async()=>{
  await db.exec(schema);
  assert.equal((await db.query('SELECT version FROM eos_store.schema_version')).rows[0].version,1);
 });
 await t.test('runtime roles have no superuser or role administration powers',async()=>{
  const rows=(await db.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname IN ('eos_objects','eos_states') ORDER BY rolname")).rows;
  assert.equal(rows.length,2);
  for(const row of rows) assert.deepEqual([row.rolsuper,row.rolcreatedb,row.rolcreaterole,row.rolreplication,row.rolbypassrls],[false,false,false,false,false]);
 });
 await t.test('objects role can store own domain with binary value',async()=>{
  await db.exec('SET SESSION AUTHORIZATION eos_objects');
  assert.equal((await db.query('SELECT session_user')).rows[0].session_user,'eos_objects');
  await db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['objects','probe.obj',Buffer.from([0,255,1,2])]);
  const rows=(await db.query('SELECT domain,key,encode(value,\'hex\') AS value FROM eos_store.kv')).rows;
  assert.deepEqual(rows,[{domain:'objects',key:'probe.obj',value:'00ff0102'}]);
 });
 await t.test('objects role cannot insert states or escape to owner',async()=>{
  await assert.rejects(()=>db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['states','forbidden',Buffer.from('x')]),{code:'42501'});
  await assert.rejects(()=>db.exec('SET ROLE eos_store_owner'),{code:'42501'});
 });
 await t.test('states role cannot read or change objects domain',async()=>{
  await db.exec('RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION eos_states');
  assert.deepEqual((await db.query('SELECT * FROM eos_store.kv')).rows,[]);
  assert.equal((await db.query("UPDATE eos_store.kv SET value='x' WHERE domain='objects'")).affectedRows,0);
  await db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['states','probe.state',Buffer.from('state')]);
  assert.deepEqual((await db.query('SELECT domain,key FROM eos_store.kv')).rows,[{domain:'states',key:'probe.state'}]);
 });
 await t.test('event rows are isolated by database role',async()=>{
  await db.query('INSERT INTO eos_store.events(domain,channel,payload) VALUES ($1,$2,$3)',['states','state.ch',Buffer.from('event')]);
  await assert.rejects(()=>db.query('INSERT INTO eos_store.events(domain,channel,payload) VALUES ($1,$2,$3)',['objects','other.ch',Buffer.from('bad')]),{code:'42501'});
  await db.exec('RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION eos_objects');
  assert.deepEqual((await db.query('SELECT * FROM eos_store.events')).rows,[]);
 });
 await t.test('input byte limits and domain checks are enforced',async()=>{
  await assert.rejects(()=>db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['objects','',Buffer.from('x')]),{code:'23514'});
  await assert.rejects(()=>db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['objects','ä'.repeat(513),Buffer.from('x')]),{code:'23514'});
  await assert.rejects(()=>db.query('INSERT INTO eos_store.events(domain,channel,payload) VALUES ($1,$2,$3)',['objects','x',Buffer.alloc(1048577)]),{code:'23514'});
 });
 await t.test('runtime cannot create schema, change schema version, or disable RLS',async()=>{
  await assert.rejects(()=>db.exec('CREATE TABLE eos_store.forbidden(x int)'),{code:'42501'});
  await assert.rejects(()=>db.exec('ALTER TABLE eos_store.kv DISABLE ROW LEVEL SECURITY'),{code:'42501'});
  await assert.rejects(()=>db.exec('UPDATE eos_store.schema_version SET version=1'),{code:'42501'});
 });
 await t.test('runtime admission SQL succeeds for both restricted roles',async()=>{
  const storeSource=fs.readFileSync(path.resolve(__dirname,'../../runtime/postgresql/packages/store/index.cjs'),'utf8');
  const queries=[...storeSource.matchAll(/this\.pool\.query\(("(?:[^"\\]|\\.)*")\)/g)].map(match=>JSON.parse(match[1]));
  assert.equal(queries.length,3,'Review test binding if admission SQL layout changes');
  for(const role of ['eos_objects','eos_states']) {
   await db.exec('RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION '+role);
   const admission=(await db.query(queries[0])).rows;
   assert.equal(admission.length,1);assert.equal(admission[0].version,1);
   for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls','rolinherit','memberships'])assert.equal(admission[0][key],false);
   const boundaries=(await db.query(queries[1])).rows;
   assert.equal(boundaries.length,3);
   for(const row of boundaries){assert.equal(row.owner,'eos_store_owner');if(row.relname!=='schema_version'){assert.equal(row.relrowsecurity,true);assert.equal(row.relforcerowsecurity,true);}}
   assert.deepEqual((await db.query(queries[2])).rows,[{can_create:false,can_change_version:false}]);
  }
  await db.exec('RESET SESSION AUTHORIZATION; SET SESSION AUTHORIZATION eos_objects');
 });
 await t.test('parameterized SQL preserves injection text as data',async()=>{
  const key="'; DROP SCHEMA eos_store CASCADE; --";
  await db.query('INSERT INTO eos_store.kv(domain,key,value) VALUES ($1,$2,$3)',['objects',key,Buffer.from('safe')]);
  assert.equal((await db.query('SELECT key FROM eos_store.kv WHERE key=$1',[key])).rows[0].key,key);
 });
});
