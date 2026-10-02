'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { startLab } = require('./fixtures/lab-cluster.cjs');
const skipReason = process.getuid?.()===0 ? 'Real PostgreSQL refused: test runner must be an unprivileged OS account' : !process.env.EOS_PG_BIN_DIRECTORY ? 'Set EOS_PG_BIN_DIRECTORY to qualified PostgreSQL17.11 binaries' : false;
test('fixture refuses root before creating keys or data', {skip:process.getuid?.()!==0}, async()=> {
 await assert.rejects(startLab(),{code:'EOS_PG_LAB_REQUIRES_NONROOT'});
});
test('real PostgreSQL17.11 TLS and role tests', {skip:skipReason}, async t=> {
 const { Client } = require(process.env.EOS_PG_CLIENT_DIRECTORY || 'pg');
 const fixture = await startLab();
 t.after(()=>fixture.stop());
 const lab = fixture.metadata;
const dir = path.dirname(lab.caFile);
const base = { host:lab.host, port:lab.port, database:'eos_tls_probe', user:'eos_tls_probe', connectionTimeoutMillis:3000, query_timeout:3000,
  ssl:{ minVersion:'TLSv1.3',rejectUnauthorized:true,servername:'localhost',ca:fs.readFileSync(lab.caFile),cert:fs.readFileSync(lab.roles.eos_tls_probe.certFile),key:fs.readFileSync(lab.roles.eos_tls_probe.keyFile) } };
async function client(overrides, fn) {
  const c = new Client({...base,...overrides});
  c.on('error',()=>{});
  try { await c.connect(); return await fn(c); } finally { await c.end().catch(()=>{}); }
}
async function rejected(overrides, pattern) {
  await assert.rejects(()=>client(overrides,()=>assert.fail('forbidden connection accepted')),pattern);
}
await t.test('real PG17.11 connection verifies TLS1.3 server and client identity', async()=> {
 await client({},async c=>{
  assert.equal(c.connection.stream.authorized,true);
  assert.equal(c.connection.stream.getProtocol(),'TLSv1.3');
  const {rows}=await c.query('SELECT ssl,version,cipher,client_dn FROM pg_stat_ssl WHERE pid=pg_backend_pid()');
  assert.equal(rows[0].ssl,true); assert.equal(rows[0].version,'TLSv1.3'); assert.match(rows[0].client_dn,/CN=eos_tls_probe/);
  assert.equal((await c.query('SHOW server_version_num')).rows[0].server_version_num,'170011');
 });
});
await t.test('plaintext is rejected',()=>rejected({ssl:false},/pg_hba.conf rejects connection.*no encryption/i));
await t.test('TLS1.2 is rejected',()=>rejected({ssl:{...base.ssl,minVersion:'TLSv1.2',maxVersion:'TLSv1.2'}},/protocol version/i));
await t.test('wrong server CA is rejected',()=>rejected({ssl:{...base.ssl,ca:fs.readFileSync(path.join(dir,'wrong-ca.crt'))}},/self-signed certificate|unable to verify|unable to get local issuer/i));
// Force only the expected peer name in this negative test. The certificate
// still comes from the real TLS handshake and Node performs the standard SAN
// check; this avoids relying on pg's host-to-servername normalization.
await t.test('explicit unmatched peer identity is rejected by standard SAN verification',()=>rejected({ssl:{...base.ssl,checkServerIdentity:(_hostname,certificate)=>tls.checkServerIdentity('unmatched-eos-lab.invalid',certificate)}},/Hostname\/IP does not match/i));
await t.test('missing client certificate is rejected',()=>rejected({ssl:{...base.ssl,cert:undefined,key:undefined}},/valid client certificate/i));
await t.test('wrong client identity signed by same CA is rejected',()=>rejected({ssl:{...base.ssl,cert:fs.readFileSync(path.join(dir,'wrong_client.crt')),key:fs.readFileSync(path.join(dir,'wrong_client.key'))}},/certificate authentication failed/i));
await t.test('runtime role cannot create role or read server file',async()=>{
 await client({},async c=>{
  const {rows}=await c.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user');
  assert.deepEqual(Object.values(rows[0]),[false,false,false,false,false]);
  await assert.rejects(()=>c.query('CREATE ROLE eos_forbidden'),{code:'42501'});
  await assert.rejects(()=>c.query("SELECT pg_read_file('/etc/hostname')"),{code:'42501'});
 });
});
await t.test('parameterized query preserves injection string as data',async()=>{
 const payload="'; CREATE ROLE eos_forbidden SUPERUSER; --";
 await client({},async c=>{
  assert.equal((await c.query('SELECT $1::text AS value',[payload])).rows[0].value,payload);
  assert.equal((await c.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='eos_forbidden'")).rows[0].n,0);
 });
});
await t.test('TLS1.3 AES256 GCM is available with verified certificates',async()=>{
 await client({ssl:{...base.ssl,ciphers:'TLS_AES_256_GCM_SHA384'}},async c=>{
  assert.equal(c.connection.stream.getCipher().standardName,'TLS_AES_256_GCM_SHA384');
 });
});

});
