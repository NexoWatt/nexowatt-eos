'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createHarness } = require('../scripts/verify-stable-1.0.9-access.cjs');
const eos = require('../lib/eos-integrated');
const secret = () => crypto.randomBytes(24).toString('base64url');
const headers = h => ({ Origin: h.base, 'X-Nexowatt-EOS-Password': '1' });
const body = h => { const password = secret(); return { currentPassword: h.testPassword, password, passwordRepeat: password }; };

test('EOS-ROLES: product reads require login and canonical group identity; aliases never elevate', async () => {
  const h = await createHarness({ accessControl: { adminUsers: ['installer', 'kunde'], adminGroups: ['system.group.installateur'] } });
  try {
    for (const path of ['/', '/api/state', '/config', '/events', '/static/index.html']) assert.equal((await h.request(path)).status, 401, path);
    assert.equal((await h.request('/static/auth.js')).status, 200);
    for (const [user, role] of [['admin','admin'],['installer','installer'],['kunde','customer']]) {
      const token = await h.login(user);
      const status = (await h.request('/api/auth/status',{token})).data;
      assert.equal(status.role, role); assert.equal(status.passwordChangeRequired, false);
      assert.equal((await h.request('/api/state',{token})).status, 200);
      assert.equal((await h.request('/api/license/info',{token})).status, role === 'admin' ? 200 : 403);
    }
    const beforeAmbiguity = await h.login('installer');
    h.objects.get('system.group.administrator').common.members.push('system.user.installer');
    assert.equal((await h.request('/api/auth/status',{token:beforeAmbiguity})).data.authed,false);
    assert.equal((await h.request('/api/auth/login', { method:'POST', body:{user:'installer',password:h.testPassword} })).status, 403);
    h.objects.get('system.group.administrator').common.members = ['system.user.admin'];
    h.objects.get('system.group.installateur').common.members = [];
    assert.equal((await h.request('/api/auth/login', { method:'POST', body:{user:'installer',password:h.testPassword} })).status, 403);
  } finally { await h.close(); }
});

test('EOS-ACCOUNT: initial own-password setup gates data, preserves identity, revokes all sessions', async () => {
  const h = await createHarness();
  try {
    const object = h.objects.get('system.user.kunde');
    object.native = { nexowattPasswordChangeRequired:true, eosPasswordChangeRequired:true,
      nexowattFirstLoginPending:true, eosFirstLoginRequired:true,
      nexowattEosAccount:{passwordInitialized:false,passwordSetupVersion:0,forcePasswordChange:true,managedBy:'eos',role:'enduser'} };
    const token = await h.login('kunde'); const token2 = await h.login('kunde');
    const status = (await h.request('/api/auth/status',{token})).data;
    assert.equal(status.accountRole,'enduser'); assert.equal(status.passwordChangeRequired,true); assert.deepEqual(status.capabilities,[]);
    for (const path of ['/api/state','/config','/events']) assert.equal((await h.request(path,{token})).data.error,'password_change_required');
    const change = body(h);
    for (const request of [{}, {Origin:'https://foreign.example','X-Nexowatt-EOS-Password':'1'}, {Origin:h.base}]) {
      assert.equal((await h.request('/api/account/password',{token,method:'POST',headers:request,body:change})).status,403);
    }
    assert.equal((await h.request('/api/account/password',{token,method:'POST',headers:headers(h),body:{...change,user:'admin'}})).status,400);
    assert.equal((await h.request('/api/account/password',{token,method:'POST',headers:headers(h),body:{...change,currentPassword:secret()}})).status,401);
    const serviceBefore = structuredClone(h.objects.get('system.user.admin'));
    const result = await h.request('/api/account/password',{token,method:'POST',headers:headers(h),body:change});
    assert.equal(result.status,200,result.text); assert.equal(result.data.logoutRequired,true);
    assert.equal((await h.request('/api/auth/status',{token:token2})).data.authed,false);
    assert.deepEqual(h.objects.get('system.user.admin'),serviceBefore);
    const after = h.objects.get('system.user.kunde');
    assert.equal(after.native.nexowattEosAccount.role,'enduser');assert.equal(after.native.nexowattEosAccount.managedBy,'eos');
    assert.equal(after.common.enabled,true); assert.equal(eos.passwordChangeRequired(after,'kunde'),false);
    assert.match(after.common.password,/^pbkdf2\$600000\$[a-f0-9]{512}\$[a-f0-9]{32}$/);
    const login = await h.request('/api/auth/login',{method:'POST',body:{user:'kunde',password:change.password}});
    assert.equal(login.status,200); assert.equal(login.data.passwordChangeRequired,false);
    assert.equal((await h.request('/api/auth/login',{method:'POST',body:{user:'kunde',password:h.testPassword}})).status,401);
  } finally { await h.close(); }
});

test('EOS-ACCOUNT: reset metadata, disabled accounts and group changes revoke active sessions', async () => {
  for (const mutate of [o=>{o.native.eosFirstLoginRequired=true;},o=>{o.native.nexowattEosAccount.passwordInitialized=false;},o=>{o.common.enabled=false;}]) {
    const h = await createHarness();try {
      const token=await h.login('kunde');mutate(h.objects.get('system.user.kunde'));
      assert.equal((await h.request('/api/auth/status',{token})).data.authed,false);
    } finally {await h.close();}
  }
});

test('EOS-ACCOUNT: password input bounds and fail-closed initialization metadata', () => {
  for(const password of ['x'.repeat(14),'x'.repeat(129),'x'.repeat(15)+'\n',{},'🙂'.repeat(65)]) assert.equal(eos.validAccountPassword(password),false);
  for(const password of ['x'.repeat(15),'x'.repeat(128),'🙂'.repeat(64)]) assert.equal(eos.validAccountPassword(password),true);
  assert.equal(eos.passwordChangeRequired({native:{}},'installer'),true);
  assert.equal(eos.passwordChangeRequired({native:{}},'admin'),false);
});

test('EOS-ACCOUNT: shared verification/derivation budget admits two and rejects excess without queue', async () => {
  const releases=[];const operation=()=>new Promise(resolve=>releases.push(resolve));
  const a=eos.withAccountKdfBudget(operation);const b=eos.withAccountKdfBudget(operation);
  await assert.rejects(eos.withAccountKdfBudget(operation),/EOS_PASSWORD_BUSY/);
  assert.equal(releases.length,2);releases.forEach(resolve=>resolve());await Promise.all([a,b]);
  assert.equal(await eos.withAccountKdfBudget(async()=>true),true);
});

test('EOS-SSE: forged logout leaves streams alive; valid logout closes only its own stream', async () => {
  const https = require('node:https');const fixture=require('../scripts/eos-tls-fixture.cjs');
  const h=await createHarness();const streams=[];
  const open=token=>new Promise((resolve,reject)=>{
    const request=https.get(h.base+'/events',{ca:fixture.cert,headers:{Cookie:'nw_session='+token}},response=>{
      const stream={ended:false,request,response};streams.push(stream);
      response.once('end',()=>{stream.ended=true;});response.once('data',()=>resolve(stream));response.on('error',reject);
    });request.on('error',reject);request.setTimeout(3000,()=>request.destroy(new Error('SSE fixture deadline')));
  });
  try {
    const customer=await h.login('kunde');const installer=await h.login('installer');
    const a=await open(customer);const b=await open(installer);
    assert.equal((await h.request('/api/auth/logout',{token:'forged-session',method:'POST'})).status,200);
    assert.equal(a.ended,false);assert.equal(b.ended,false);
    const closed=new Promise(resolve=>a.response.once('end',resolve));
    await h.request('/api/auth/logout',{token:customer,method:'POST'});await closed;
    assert.equal(a.ended,true);assert.equal(b.ended,false);
  } finally {streams.forEach(s=>s.request.destroy());await h.close();}
});
