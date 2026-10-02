'use strict';
// This module contains no DDL or credential fallback. Schema/roles are provisioned
// outside the unprivileged runtime. SQL values are always bound parameters.
const {EventEmitter} = require('node:events');
const {AsyncLocalStorage} = require('node:async_hooks');
const tls = require('node:tls');
const net = require('node:net');
const LIMITS = Object.freeze({key:1024,value:16*1024*1024,event:1024*1024,batch:10000,keys:100000,transaction:5000,readBytes:16*1024*1024,globWork:2000000});
function fail(code) { const e = new Error(code); e.code=code; return e; }
function ensure(ok,code) { if(!ok)throw fail(code); }
function text(value,max,code) { ensure(typeof value==='string' && value.length>0 && Buffer.byteLength(value)<=max && !/[\u0000-\u001f\u007f]/.test(value),code);return value; }
function bytes(value,max=LIMITS.value) { ensure(typeof value==='string'||Buffer.isBuffer(value),'EOS_PG_VALUE');const b=Buffer.from(value);ensure(b.length<=max,'EOS_PG_VALUE_LIMIT');return b; }
function key(value) { return text(value,LIMITS.key,'EOS_PG_KEY'); }
function duration(value) { if(value===undefined||value===null)return null;ensure(Number.isSafeInteger(value)&&value>0&&value<=2147483647000,'EOS_PG_TTL');return value; }
function verifyStream(client) {
  const stream=client?.connection?.stream;
  ensure(stream?.encrypted===true && stream.authorized===true && stream.getProtocol?.()==='TLSv1.3','EOS_PG_TLS_NEGOTIATED');
}
function validateConnection(input,domain) {
  ensure(input && typeof input==='object' && !Array.isArray(input),'EOS_PG_CONFIG');
  ensure(!input.connectionString && !input.url && !input.password && !input.pass,'EOS_PG_CONFIG');
  const host=text(input.host,253,'EOS_PG_HOST');ensure(net.isIP(host)!==0 || /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(host),'EOS_PG_HOST');
  const port=input.port??5432;ensure(Number.isInteger(port)&&port>0&&port<=65535,'EOS_PG_PORT');
  const database=text(input.database,63,'EOS_PG_DATABASE');ensure(/^[a-z][a-z0-9_]*$/.test(database),'EOS_PG_DATABASE');
  const user=text(input.user,63,'EOS_PG_USER');ensure(['eos_objects','eos_states'].includes(user),'EOS_PG_USER');
  if(domain)ensure(user===`eos_${domain}`,'EOS_PG_ROLE_DOMAIN');
  ensure(!input.options || Object.keys(input.options).every(k=>k==='ssl'),'EOS_PG_CONFIG');
  const ssl=input.options?.ssl;ensure(ssl && typeof ssl==='object' && !Array.isArray(ssl),'EOS_PG_TLS_REQUIRED');
  ensure(Object.keys(ssl).every(k=>['ca','cert','key','rejectUnauthorized','minVersion','maxVersion'].includes(k)),'EOS_PG_TLS_CONFIG');
  ensure(ssl.rejectUnauthorized===undefined||ssl.rejectUnauthorized===true,'EOS_PG_TLS_REQUIRED');
  ensure(ssl.minVersion===undefined||ssl.minVersion==='TLSv1.3','EOS_PG_TLS_VERSION');
  ensure(ssl.maxVersion===undefined||ssl.maxVersion==='TLSv1.3','EOS_PG_TLS_VERSION');
  for(const name of ['ca','cert','key'])ensure(typeof ssl[name]==='string' && ssl[name].length>0 && Buffer.byteLength(ssl[name])<=65536,'EOS_PG_TLS_MATERIAL');
  ensure(process.env.NODE_TLS_REJECT_UNAUTHORIZED!=='0','EOS_PG_TLS_ENVIRONMENT');
  return {host,port,database,user,password:()=>{throw fail('EOS_PG_PASSWORD_AUTH_DISABLED');},connectionString:undefined,
    ssl:{ca:ssl.ca,cert:ssl.cert,key:ssl.key,rejectUnauthorized:true,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',checkServerIdentity:tls.checkServerIdentity},
    application_name:`nexowatt-eos-${domain||'validation'}`,connectionTimeoutMillis:5000,query_timeout:5500,
    options:'-c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=5000 -c search_path=pg_catalog',
    keepAlive:true,keepAliveInitialDelayMillis:5000,enableChannelBinding:true};
}
// Redis-compatible glob matching without user-controlled regular expressions.
// Dynamic programming bounds CPU to O(pattern length * key length).
function globMatch(pattern,input) {
  key(pattern);key(input);pattern=Buffer.from(pattern,'utf8').toString('latin1');input=Buffer.from(input,'utf8').toString('latin1');if(pattern==='*')return true;if(!/[?*\[\\]/.test(pattern))return pattern===input;if(pattern.endsWith('*')&&!/[?*\[\\]/.test(pattern.slice(0,-1)))return input.startsWith(pattern.slice(0,-1));const tokens=[];
  for(let i=0;i<pattern.length;i++) {
    const c=pattern[i];
    if(c==='\\' && i+1<pattern.length)tokens.push({t:'literal',v:pattern[++i]});
    else if(c==='*') {if(tokens.at(-1)?.t!=='star')tokens.push({t:'star'});}
    else if(c==='?')tokens.push({t:'any'});
    else if(c==='[') {
      const end=pattern.indexOf(']',i+1);
      if(end===-1)tokens.push({t:'literal',v:c});
      else {let s=pattern.slice(i+1,end),neg=s.startsWith('^');if(neg)s=s.slice(1);const ranges=[];
        for(let j=0;j<s.length;j++){if(j+2<s.length&&s[j+1]==='-'){ranges.push([s[j],s[j+2]]);j+=2;}else ranges.push([s[j],s[j]]);}
        tokens.push({t:'class',ranges,neg});i=end;}
    } else tokens.push({t:'literal',v:c});
  }
  let prev=new Uint8Array(input.length+1);prev[0]=1;
  for(const t of tokens){const next=new Uint8Array(input.length+1);if(t.t==='star')next[0]=prev[0];
    for(let j=1;j<=input.length;j++){const c=input[j-1];next[j]=t.t==='star'?(prev[j]||next[j-1]):prev[j-1]&&(t.t==='any'||t.t==='literal'&&t.v===c||t.t==='class'&&(t.ranges.some(([a,b])=>c>=a&&c<=b)!==t.neg));}prev=next;}
  return Boolean(prev[input.length]);
}
class Store extends EventEmitter {
  constructor(connection,{domain}={}) {
    super();ensure(domain==='objects'||domain==='states','EOS_PG_DOMAIN');this.domain=domain;this.config=validateConnection(connection,domain);
    this.connected=false;this.closed=false;this.context=new AsyncLocalStorage();this.channel=`eos_${domain}_events`;this.seen=new Set();this.pending=0;this.retries=0;this.generation=0;this.eventChain=Promise.resolve();this.eventFloor=0n;this.lastDelivered=0n;
  }
  async connect() {
    ensure(!this.closed,'EOS_PG_CLOSED');if(this.connected)return;if(this.connecting)return this.connecting;
    this.connecting=this._connect().catch(async e=>{this.connected=false;this.generation++;clearInterval(this.sweep);clearInterval(this.election);this.sweep=null;this.election=null;this.expiryLeader=false;const listener=this.listener;this.listener=null;if(listener)await listener.end().catch(()=>{});throw e.code?.startsWith('EOS_PG_')?e:fail('EOS_PG_CONNECTION_FAILED');}).finally(()=>{this.connecting=null;});return this.connecting;
  }
  async _connect() {
    const {Pool,Client}=require('pg');
    if(!this.pool){this.pool=new Pool({...this.config,max:1,idleTimeoutMillis:30000,allowExitOnIdle:true,
      verify:(client,done)=>{try{verifyStream(client);done();}catch(error){done(error);}}});this.pool.on('error',()=>this._lost());}
    const admission=await this.pool.query("SELECT s.version,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolinherit,EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid) AS memberships FROM eos_store.schema_version s JOIN pg_catalog.pg_roles r ON r.rolname=current_user WHERE s.singleton=true");
    ensure(admission.rowCount===1&&admission.rows[0].version===1,'EOS_PG_SCHEMA');
    const role=admission.rows[0];ensure(!role.rolsuper&&!role.rolcreatedb&&!role.rolcreaterole&&!role.rolbypassrls&&!role.rolinherit&&!role.memberships,'EOS_PG_ROLE_PRIVILEGE');
    const boundaries=await this.pool.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_catalog.pg_get_userbyid(c.relowner) AS owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='eos_store' AND c.relname IN ('kv','events','schema_version')");
    ensure(boundaries.rowCount===3&&boundaries.rows.every(r=>r.owner==='eos_store_owner'&&(r.relname==='schema_version'||r.relrowsecurity&&r.relforcerowsecurity)),'EOS_PG_SCHEMA_BOUNDARY');
    const grants=await this.pool.query("SELECT pg_catalog.has_schema_privilege(current_user,'eos_store','CREATE') AS can_create,pg_catalog.has_table_privilege(current_user,'eos_store.schema_version','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS can_change_version");
    ensure(grants.rowCount===1&&!grants.rows[0].can_create&&!grants.rows[0].can_change_version,'EOS_PG_SCHEMA_GRANTS');
    ensure(!this.closed,'EOS_PG_CLOSED');const listener=new Client(this.config);this.listener=listener;
    listener.on('error',()=>{if(this.listener===listener)this._lost();});listener.on('end',()=>{if(this.listener===listener)this._lost();});
    listener.on('notification',n=>{if(this.listener===listener&&this.connected&&n.channel===this.channel)this._enqueue(n.payload);});
    await listener.connect();ensure(!this.closed&&this.listener===listener,'EOS_PG_CLOSED');
    // TLS version and authorization are checked on the actual established stream.
    verifyStream(listener);
    await listener.query(`LISTEN ${this.channel}`);
    // Events committed before this connection becomes ready are not commands
    // to replay. Capture a database watermark after LISTEN, before readiness.
    const watermark=await listener.query('SELECT COALESCE(max(id),0)::text AS id FROM eos_store.events WHERE domain=$1',[this.domain]);
    const floor=watermark.rows[0]?.id;ensure(typeof floor==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(floor)&&BigInt(floor)<=9223372036854775807n,'EOS_PG_EVENT_WATERMARK');
    this.eventFloor=BigInt(floor);this.lastDelivered=this.eventFloor;
    ensure(!this.closed&&this.listener===listener,'EOS_PG_CLOSED');this.seen.clear();this.generation++;this.connected=true;this.retries=0;
    await this._electExpiry();ensure(!this.closed&&this.listener===listener&&this.connected,'EOS_PG_CLOSED');this.election=setInterval(()=>this._electExpiry().catch(()=>this._lost()),2000);this.election.unref();this.emit('connected');
  }
  _lost() {
    if(this.closed)return;const had=this.connected;this.connected=false;this.generation++;clearInterval(this.sweep);this.sweep=null;clearInterval(this.election);this.election=null;this.expiryLeader=false;
    const old=this.listener;this.listener=null;if(old)old.end().catch(()=>{});
    if(had)this.emit('disconnected');
    if(!this.retry){this.retry=setTimeout(()=>{this.retry=null;this.connect().catch(()=>this._lost());},Math.min(5000,250*2**Math.min(this.retries++,5)));this.retry.unref();}
  }
  async _query(sql,params=[]) {
    ensure(this.pool&&!this.closed,'EOS_PG_CLOSED');ensure(this.connected,'EOS_PG_UNAVAILABLE');const ctx=this.context.getStore();ensure(!ctx?.failed,'EOS_PG_TRANSACTION_ABORTED');
    try{return await(ctx?.client||this.pool).query(sql,params);}catch(e){if(ctx)ctx.failed=true;throw fail(e.code==='42501'?'EOS_PG_ACCESS_DENIED':'EOS_PG_QUERY_FAILED');}
  }
  async transaction(fn,{lockKey='write'}={}) {
    ensure(this.connected&&!this.closed,'EOS_PG_UNAVAILABLE');ensure(typeof fn==='function','EOS_PG_TRANSACTION');key(lockKey);
    const parent=this.context.getStore();if(parent){ensure(!parent.failed,'EOS_PG_TRANSACTION_ABORTED');try{return await fn();}catch(e){parent.failed=true;throw e;}}
    let client;try{client=await this.pool.connect();}catch{throw fail('EOS_PG_UNAVAILABLE');}
    const ctx={client,failed:false};let timedOut=false,rejectDeadline;
    const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
    const timer=setTimeout(()=>{timedOut=true;ctx.failed=true;client.end().catch(()=>{});rejectDeadline(fail('EOS_PG_TRANSACTION_TIMEOUT'));},LIMITS.transaction);
    const work=(async()=>{
      await client.query('BEGIN');
      // One shared domain lock also covers nested ACL reads and file mutations.
      // Parallelism can be refined only with measured cross-key invariants.
      await client.query('SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',[`${this.domain}:mutation`]);
      const result=await this.context.run(ctx,fn);ensure(!ctx.failed&&!timedOut,'EOS_PG_TRANSACTION_ABORTED');
      await client.query('COMMIT');return result;
    })();
    try{return await Promise.race([work,deadline]);}
    catch(e){ctx.failed=true;if(!timedOut)try{await client.query('ROLLBACK');}catch{}throw e.code?.startsWith('EOS_PG_')?e:fail('EOS_PG_TRANSACTION_FAILED');}
    finally{clearTimeout(timer);client.release(timedOut);}
  }

  async get(id) { key(id);const r=await this._query('SELECT value FROM eos_store.kv WHERE domain=$1 AND key=$2 AND (expires_at IS NULL OR expires_at>clock_timestamp())',[this.domain,id]);return r.rows[0]?.value??null; }
  async getMany(ids) {
    ensure(Array.isArray(ids)&&ids.length<=LIMITS.batch,'EOS_PG_BATCH_LIMIT');ids.forEach(key);if(!ids.length)return[];
    // The CASE bounds transferred/materialized values before the driver sees
    // them. A JS length check after receiving 10000 large rows would be too late.
    const r=await this._query('SELECT key,CASE WHEN sum(octet_length(value)) OVER() <= $3 THEN value ELSE NULL END AS value,sum(octet_length(value)) OVER() AS total_bytes FROM eos_store.kv WHERE domain=$1 AND key=ANY($2::text[]) AND (expires_at IS NULL OR expires_at>clock_timestamp())',[this.domain,ids,LIMITS.readBytes]);
    ensure(r.rows.every(x=>Number(x.total_bytes)<=LIMITS.readBytes),'EOS_PG_READ_LIMIT');
    const m=new Map(r.rows.map(x=>[x.key,x.value]));ensure(ids.reduce((total,id)=>total+(m.get(id)?.length||0),0)<=LIMITS.readBytes,'EOS_PG_READ_LIMIT');return ids.map(x=>m.get(x)??null);
  }
  async keys(pattern) {
    key(pattern);const r=await this._query('SELECT key FROM eos_store.kv WHERE domain=$1 AND (expires_at IS NULL OR expires_at>clock_timestamp()) ORDER BY key COLLATE "C" LIMIT $2',[this.domain,LIMITS.keys+1]);
    ensure(r.rows.length<=LIMITS.keys,'EOS_PG_KEY_LIMIT');const ids=r.rows.map(x=>x.key);
    if(pattern==='*')return ids;
    const simple=!/[?*\[\\]/.test(pattern)||(pattern.endsWith('*')&&!/[?*\[\\]/.test(pattern.slice(0,-1)));
    if(!simple){const work=ids.reduce((sum,x)=>sum+Buffer.byteLength(x)*Buffer.byteLength(pattern),0);ensure(work<=LIMITS.globWork,'EOS_PG_PATTERN_WORK_LIMIT');}
    return ids.filter(x=>globMatch(pattern,x));
  }
  async _write(id,value,ttlMs) {
    await this._query('INSERT INTO eos_store.kv(domain,key,value,expires_at) VALUES($1,$2,$3,CASE WHEN $4::bigint IS NULL THEN NULL ELSE clock_timestamp()+$4::bigint*interval \'1 millisecond\' END) ON CONFLICT(domain,key) DO UPDATE SET value=EXCLUDED.value,expires_at=EXCLUDED.expires_at',[this.domain,key(id),bytes(value),duration(ttlMs)]);
  }
  async _event(event,expired=false) {
    ensure(event&&typeof event==='object','EOS_PG_EVENT');const channel=key(event.channel),payload=bytes(event.payload,LIMITS.event);
    const r=await this._query('INSERT INTO eos_store.events(domain,channel,payload,expired) VALUES($1,$2,$3,$4) RETURNING id',[this.domain,channel,payload,expired]);
    await this._query('SELECT pg_catalog.pg_notify($1,$2)',[this.channel,r.rows[0].id]);
  }
  async set(id,value,options={}) {key(id);bytes(value);duration(options.ttlMs);return this.transaction(async()=>{await this._write(id,value,options.ttlMs);if(options.event)await this._event(options.event);},{lockKey:id});}
  async update(id,fn) {key(id);ensure(typeof fn==='function','EOS_PG_UPDATE');return this.transaction(async()=>{const old=await this.get(id);const update=await fn(old);ensure(update&&Object.hasOwn(update,'value'),'EOS_PG_UPDATE');await this._write(id,update.value,update.ttlMs);if(update.event)await this._event(update.event);return update.result;},{lockKey:id});}
  async delete(input,options={}) {const ids=Array.isArray(input)?input:[input];ensure(ids.length<=LIMITS.batch,'EOS_PG_BATCH_LIMIT');ids.forEach(key);return this.transaction(async()=>{const r=await this._query('DELETE FROM eos_store.kv WHERE domain=$1 AND key=ANY($2::text[])',[this.domain,ids]);if(options.event)await this._event(options.event);return r.rowCount;});}
  async rename(from,to) {key(from);key(to);ensure(from!==to,'EOS_PG_RENAME');return this.transaction(async()=>{const old=await this._query('SELECT value,expires_at FROM eos_store.kv WHERE domain=$1 AND key=$2 AND (expires_at IS NULL OR expires_at>clock_timestamp()) FOR UPDATE',[this.domain,from]);ensure(old.rowCount===1,'EOS_PG_KEY_MISSING');await this._query('DELETE FROM eos_store.kv WHERE domain=$1 AND key=ANY($2::text[])',[this.domain,[from,to]]);await this._query('INSERT INTO eos_store.kv(domain,key,value,expires_at) VALUES($1,$2,$3,$4)',[this.domain,to,old.rows[0].value,old.rows[0].expires_at]);});}
  async publish(channel,payload) {return this.transaction(()=>this._event({channel,payload}));}
  _enqueue(id) {
    if(typeof id!=='string'||! /^[1-9][0-9]{0,18}$/.test(id)||BigInt(id)>9223372036854775807n||BigInt(id)<=this.eventFloor||BigInt(id)<=this.lastDelivered||this.seen.has(id))return;
    if(this.pending>=256){this._lost();return;}
    const generation=this.generation;this.seen.add(id);if(this.seen.size>4096)this.seen.delete(this.seen.values().next().value);this.pending++;
    // One bounded drain preserves commit notification order. Results from a
    // disconnected generation cannot deliver stale commands after reconnection.
    this.eventChain=this.eventChain.then(async()=>{
      if(!this.connected||generation!==this.generation||BigInt(id)<=this.lastDelivered)return;
      const r=await this._query("SELECT channel,payload,expired FROM eos_store.events WHERE domain=$1 AND id=$2 AND created_at>clock_timestamp()-interval '60 seconds'",[this.domain,id]);
      if(!this.connected||generation!==this.generation)return;
      if(!r.rowCount){this._lost();return;}
      this.lastDelivered=BigInt(id);
      this.emit('event',r.rows[0]);
    }).catch(()=>{if(generation===this.generation)this._lost();}).finally(()=>{this.pending--;});
  }
  async _electExpiry() {
    if(!this.connected||this.expiryLeader||this.electing)return;
    const listener=this.listener,generation=this.generation;this.electing=true;
    try {
      // Session lock on the already dedicated LISTEN connection: one sweeper
      // per domain, automatically released when the session dies. No extra
      // connection and no capability to load database extensions is required.
      const r=await listener.query('SELECT pg_catalog.pg_try_advisory_lock(pg_catalog.hashtextextended($1,0)) AS leader',[`${this.domain}:expiry-worker`]);
      if(!this.connected||this.listener!==listener||this.generation!==generation)return;
      if(r.rows[0]?.leader){this.expiryLeader=true;this.sweep=setInterval(()=>this._expire().catch(()=>this._lost()),250);this.sweep.unref();}
    }finally{this.electing=false;}
  }
  async _expire() {
    if(this.expiring||!this.connected)return;this.expiring=true;
    try{await this.transaction(async()=>{
      const r=await this._query('DELETE FROM eos_store.kv WHERE (domain,key) IN (SELECT domain,key FROM eos_store.kv WHERE domain=$1 AND expires_at<=clock_timestamp() ORDER BY expires_at LIMIT 256 FOR UPDATE SKIP LOCKED) RETURNING key',[this.domain]);
      for(const row of r.rows)await this._event({channel:row.key,payload:'null'},true);
      await this._query("DELETE FROM eos_store.events WHERE domain=$1 AND created_at<clock_timestamp()-interval '60 seconds'",[this.domain]);
    },{lockKey:'expiry'});}finally{this.expiring=false;}
  }
  async leaseAcquire(id,owner,ttlMs) {key(id);key(owner);duration(ttlMs);ensure(ttlMs!==null&&ttlMs!==undefined,'EOS_PG_TTL');return this.transaction(async()=>{if(await this.get(id)!==null)return 0;await this._write(id,owner,ttlMs);return 1;},{lockKey:id});}
  async leaseExtend(id,owner,ttlMs) {key(id);key(owner);duration(ttlMs);ensure(ttlMs!==null&&ttlMs!==undefined,'EOS_PG_TTL');return this.transaction(async()=>{const current=await this.get(id);if(!current||current.toString()!==owner)return 0;await this._write(id,owner,ttlMs);return 1;},{lockKey:id});}
  async leaseRelease(id,owner) {key(id);key(owner);return this.transaction(async()=>{const current=await this.get(id);if(!current||current.toString()!==owner)return 0;await this._query('DELETE FROM eos_store.kv WHERE domain=$1 AND key=$2',[this.domain,id]);await this._event({channel:id,payload:'null'},true);return 1;},{lockKey:id});}
  async close() {if(this.closed)return;this.closed=true;this.connected=false;this.generation++;clearTimeout(this.retry);clearInterval(this.sweep);clearInterval(this.election);const listener=this.listener;this.listener=null;if(listener)await listener.end().catch(()=>{});if(this.pool)await this.pool.end();this.removeAllListeners();}
}
module.exports={Store,validateConnection,globMatch,LIMITS,verifyStream};
