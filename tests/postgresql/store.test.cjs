'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Store,validateConnection,globMatch,LIMITS}=require('../../runtime/postgresql/packages/store/index.cjs');
const fixture=()=>({host:'localhost',port:5432,database:'eos_lab',user:'eos_states',options:{ssl:{ca:'fixture-ca',cert:'fixture-cert',key:'fixture-key'}}});
const ready=handler=>{const s=new Store(fixture(),{domain:'states'});s.connected=true;s.pool={query:handler};return s;};
test('connection requires verified TLS1.3 mTLS with fixed time budgets',()=>{
 const c=validateConnection(fixture(),'states');assert.equal(c.ssl.rejectUnauthorized,true);assert.equal(c.ssl.minVersion,'TLSv1.3');assert.equal(c.ssl.maxVersion,'TLSv1.3');assert.equal(c.connectionTimeoutMillis,5000);assert.equal(c.ssl.checkServerIdentity,require('node:tls').checkServerIdentity);assert.equal(c.password instanceof Function,true);assert.throws(c.password,/PASSWORD_AUTH_DISABLED/);
});
for(const [name,change] of [
 ['cleartext',c=>delete c.options.ssl],['invalid cert input',c=>c.options.ssl.cert=null],['disabled peer check',c=>c.options.ssl.rejectUnauthorized=false],
 ['downgrade',c=>c.options.ssl.minVersion='TLSv1.2'],['custom identity verifier',c=>c.options.ssl.checkServerIdentity=()=>undefined],['SNI override',c=>c.options.ssl.servername='other'],
 ['connection string',c=>c.connectionString='postgresql://example.invalid/db'],['password',c=>c.pass='dummy'],['unix socket',c=>c.host='/tmp'],['invalid port',c=>c.port=0],
 ['superuser',c=>c.user='postgres'],['cross domain role',c=>c.user='eos_objects'],['query config override',c=>c.options.statement_timeout=0],['bad database',c=>c.database='eos;select 1']
])test(`configuration rejects ${name}`,()=>{const c=fixture();change(c);assert.throws(()=>validateConnection(c,'states'),/^Error: EOS_PG_/);});
test('TLS environment bypass rejected',()=>{const old=process.env.NODE_TLS_REJECT_UNAUTHORIZED;try{process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';assert.throws(()=>validateConnection(fixture()),/TLS_ENVIRONMENT/);}finally{if(old===undefined)delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;else process.env.NODE_TLS_REJECT_UNAUTHORIZED=old;}});
test('glob contract includes wildcards, literal escapes and ranges without regex execution',()=>{
 for(const [p,s,want] of [['*','io.a',true],['io.*','io.a',true],['io.?','io.ab',false],['io.[a-c]','io.b',true],['io.[^a-c]','io.z',true],['io.\\*','io.*',true],['io.\\*','io.a',false],['io.[','io.[',true],['a*b*c','abc',true],['a*b*c','ac',false],['a.b','aXb',false],['io.?','io.ä',false],['io.??','io.ä',true],['io.????','io.😀',true],['io.😀','io.😀',true]])assert.equal(globMatch(p,s),want,`${p} ${s}`);
});
test('input resembling SQL remains bound data; never concatenated into statement',async()=>{
 const supplied="io.x'; DROP TABLE eos_store.kv; --";let seen;
 const s=ready(async(sql,params)=>{seen={sql,params};return{rows:[]};});assert.equal(await s.get(supplied),null);assert.equal(seen.sql.includes(supplied),false);assert.deepEqual(seen.params,['states',supplied]);
});
test('batch preserves order and missing slots; SQL enforces aggregate value limit',async()=>{
 let seen;const s=ready(async(sql,params)=>{seen={sql,params};return{rows:[{key:'io.b',value:Buffer.from('B'),total_bytes:'2'},{key:'io.a',value:Buffer.from('A'),total_bytes:'2'}]};});
 const r=await s.getMany(['io.a','io.missing','io.b','io.a']);assert.deepEqual(r.map(x=>x?.toString()??null),['A',null,'B','A']);assert.equal(seen.params[2],LIMITS.readBytes);assert.match(seen.sql,/CASE WHEN sum\(octet_length\(value\)\) OVER\(\)/);
 s.pool.query=async()=>({rows:[{key:'io.a',value:null,total_bytes:String(LIMITS.readBytes+1)}]});await assert.rejects(s.getMany(['io.a']),/READ_LIMIT/);
});
test('key-list and complex glob work are bounded; broad star is supported',async()=>{
 const s=ready(async()=>({rows:Array.from({length:2000},(_,i)=>({key:'io.'+'x'.repeat(100)+i}))}));assert.equal((await s.keys('*')).length,2000);await assert.rejects(s.keys('*a*b*c*d*e*f*g*h*i*j*k*'),/PATTERN_WORK_LIMIT/);
 s.pool.query=async()=>({rows:Array.from({length:LIMITS.keys+1},()=>({key:'io.a'}))});await assert.rejects(s.keys('*'),/KEY_LIMIT/);
});
test('read batch and key control bytes reject before querying',async()=>{
 const s=ready(async()=>{throw Error('must not query');});await assert.rejects(s.getMany(Array.from({length:10001},()=> 'io.a')),/BATCH_LIMIT/);await assert.rejects(s.get('io.a\0suffix'),/PG_KEY/);
});
test('transaction error rolls back and releases once; no commit/event',async()=>{
 const calls=[];let released=0;const client={query:async(sql,p)=>{calls.push(sql);return{rows:[]};},release:()=>released++,end:async()=>{}};
 const s=ready(async()=>({rows:[]}));s.pool.connect=async()=>client;
 await assert.rejects(s.transaction(async()=>{throw Error('private-value-not-propagated');}),/^Error: EOS_PG_TRANSACTION_FAILED$/);
 assert.equal(calls.at(-1),'ROLLBACK');assert.equal(calls.includes('COMMIT'),false);assert.equal(released,1);
});
test('long session TTL accepted while nonsensical TTL and large events fail closed',async()=>{
 const params=[];const s=ready(async(sql,p)=>{params.push(p);return{rows:[]};});s.transaction=async fn=>fn();
 await s.set('session.a','{}',{ttlMs:30*86400000});assert.equal(params[0][3],30*86400000);
 await assert.rejects(s.set('session.a','{}',{ttlMs:0}),/PG_TTL/);await assert.rejects(s.publish('messagebox.a',Buffer.alloc(LIMITS.event+1)),/VALUE_LIMIT/);
});
