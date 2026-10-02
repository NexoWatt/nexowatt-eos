'use strict';
/** Actual HTTPS/Express UI; ioBroker storage and central bus are local fixtures. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const integrated = require('../lib/eos-integrated');
const tlsFixture = require('./eos-tls-fixture.cjs');
const { createHarness } = require('./verify-stable-1.0.9-access.cjs');

function installCentralFixture(h, edit = value => value) {
  h.adapter._nwCentralLicense = integrated.makeLicenseClient(h.adapter);
  h.adapter.sendTo = (target, command, req, callback) => {
    assert.equal(target, 'eos-admin.0'); assert.equal(command, 'eos.license.check');
    const now = Date.now();
    callback(edit({ v: 1, nonce: req.nonce, valid: true, code: 'LICENSE_VALID', edition: 'home',
      features: ['energy','wallet','smartHome','microgridSlave'], limits: { chargePoints: 2, batteries: 1 }, checkedAt: now, validUntil: now + 15000 }));
  };
  return h.adapter._nwCentralLicense;
}

test('UI-TLS: real shipped server TLS1.3, CA identity verification and Secure cookie', async () => {
  const h = await createHarness();
  try {
    const response = await h.request('/api/auth/login', {method:'POST', body:{user:'kunde',password:h.testPassword}});
    assert.equal(response.status,200); assert.match(response.response.headers.get('set-cookie'),/; Secure/);
    assert.equal(response.response.headers.get('strict-transport-security'),'max-age=31536000');
    assert.equal(response.response.headers.get('x-powered-by'),undefined);
    await assert.rejects(tlsFixture.request(h.base,'/api/auth/status',{maxVersion:'TLSv1.2'}));
    await assert.rejects(tlsFixture.request(h.base,'/api/auth/status',{ca:undefined}), /self-signed|certificate/i);
    await assert.rejects(tlsFixture.request(h.base,'/api/auth/status',{servername:'wrong.invalid'}), /Hostname|IP|altnames/i);
    const data = await new Promise((resolve,reject) => {
      const socket = net.connect(h.adapter.server.address().port,'127.0.0.1'); const chunks=[];
      socket.setTimeout(2000,()=>{socket.destroy(); reject(new Error('plaintext connection not closed'));});
      socket.on('connect',()=>socket.write('GET /api/auth/status HTTP/1.1\r\nHost: localhost\r\n\r\n'));
      socket.on('data',chunk=>chunks.push(chunk)); socket.on('error',()=>{}); socket.on('close',()=>resolve(Buffer.concat(chunks).toString()));
    });
    assert.doesNotMatch(data,/200 OK|"authed"|"enabled"/);
  } finally {await h.close();}
});

test('UI-TLS: fixed product paths and key-file protection', () => {
  assert.equal(integrated.CERTIFICATE_PATH,'/etc/nexowatt-eos/web/ui.crt');
  assert.equal(integrated.PRIVATE_KEY_PATH,'/etc/nexowatt-eos/web/ui.key');
  assert.deepEqual(integrated.listenerConfiguration({bind:'::',port:8188}),{bind:'::',port:8188});
  for(const config of [{port:'8188'},{port:80},{ip:'hostname'},{eosLicenseAdminInstance:'evil.0'}]) assert.throws(()=>integrated.listenerConfiguration(config));
  assert.deepEqual(integrated.readProtectedFile(tlsFixture.keyPath,true,tlsFixture.directory),tlsFixture.key);
  fs.chmodSync(tlsFixture.keyPath,0o644);
  try {assert.throws(()=>integrated.readProtectedFile(tlsFixture.keyPath,true,tlsFixture.directory),/EOS_TLS_FILE/);}finally{fs.chmodSync(tlsFixture.keyPath,0o600);}
  const link=path.join(tlsFixture.directory,'link.key');fs.symlinkSync(tlsFixture.keyPath,link);
  assert.throws(()=>integrated.readProtectedFile(link,true,tlsFixture.directory));fs.unlinkSync(link);
  fs.chmodSync(tlsFixture.directory,0o777);
  try {assert.throws(()=>integrated.readProtectedFile(tlsFixture.keyPath,true,tlsFixture.directory),/EOS_TLS_DIRECTORY/);}finally{fs.chmodSync(tlsFixture.directory,0o700);}
  const {privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  assert.throws(()=>integrated.validateTlsMaterial(tlsFixture.cert,privateKey.export({type:'pkcs8',format:'pem'})),/EOS_TLS_KEY_MISMATCH/);
});

test('UI-LICENSE: central numeric limits, no secrets/UUID returned and no local license storage',async()=>{
  const h=await createHarness(); let guard;
  try {
    guard=installCentralFixture(h); assert.equal(await guard.refresh(),true);
    assert.equal(h.adapter._nwLicenseMaxStorages(),1);assert.equal(h.adapter._nwLicenseMaxWallboxes(),2);
    assert.equal(h.adapter._nwIsFeatureLicensed('smartHome'),true);assert.equal(h.adapter._nwIsFeatureLicensed('mesh'),false);
    const token=await h.login('admin'); const info=await h.request('/api/license/info',{token});
    assert.equal(info.status,200);assert.equal(info.data.managedBy,'eos-admin.0');
    assert.doesNotMatch(info.text,/licenseKey|uuid|nonce|private-fixture|token/i);
    const save=await h.request('/api/license/save',{token,method:'POST',body:{licenseKey:crypto.randomBytes(20).toString('hex')}});
    assert.equal(save.status,409);assert.equal(save.data.error,'CENTRAL_LICENSE_MANAGEMENT');assert.equal(h.saved.length,0);
    assert.equal(typeof h.adapter._nwLicenseSecret,'undefined');assert.equal(typeof h.adapter._nwEvaluateLicense,'undefined');
    assert.equal(typeof h.adapter._nwGetConfiguredLicenseKey,'undefined');
  }finally{await guard?.stop();await h.close();}
});

for(const [name, edit] of [
  ['nonce',r=>({...r,nonce:crypto.randomBytes(16).toString('hex')})],
  ['secret-in-response',r=>({...r,licenseKey:'not-a-real-key'})],
  ['home-pro-feature',r=>({...r,features:[...r.features,'microgridMaster']})],
  ['oversized-lease',r=>({...r,validUntil:r.checkedAt+15001})],
  ['count-type',r=>({...r,limits:{...r.limits,batteries:'1'}})],
  ['stale',r=>({...r,checkedAt:r.checkedAt-20000,validUntil:r.checkedAt-10000})],
]) test('UI-LICENSE denies '+name,async()=>{
  const h=await createHarness();let guard;
  try {guard=installCentralFixture(h,edit);assert.equal(await guard.refresh(),false);assert.equal(h.adapter._nwCurrentLicenseEdition(),'none');assert.equal(h.adapter._nwLicenseMaxStorages(),0);assert.equal((await h.request('/api/license/features',{token:await h.login('installer')})).status,403);}
  finally{await guard?.stop();await h.close();}
});

test('UI-LICENSE: lease expiry invalidates UI/cache and closes SSE without device writes',async()=>{
  const h=await createHarness();let guard;let writes=0;let closes=0;
  try {
    h.adapter.setForeignStateAsync=async()=>{writes++;};h.adapter._nwSseGuard={closeAll:()=>closes++};
    guard=installCentralFixture(h,r=>({...r,validUntil:r.checkedAt+80}));assert.equal(await guard.refresh(),true);
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(guard.getStatus().valid,false);assert.equal(h.adapter._nwLicenseOk,false);assert.equal(h.adapter._nwCurrentLicenseEdition(),'none');
    assert.equal(writes,0);assert.equal(closes,1);
    assert.equal((await h.request('/api/license/features',{token:await h.login('installer')})).status,403);
    assert.equal((await h.request('/api/strict-auth/status')).status,200);
  }finally{await guard?.stop();await h.close();}
});

test('UI-PREVIEW: foreign writes, commands, mesh activation and EMS init blocked',async()=>{
  const h=await createHarness();let busCalls=0;
  try {
    h.adapter.sendTo=(_target,_command,_message,callback)=>{busCalls++;callback({valid:false});};
    integrated.installPreviewWriteBoundary(h.adapter);
    await assert.rejects(h.adapter.setForeignStateAsync('fixture.device',true),/EOS_TEST_CONTROL_BLOCKED/);
    await assert.rejects(h.adapter.setForeignObjectAsync('system.adapter.fixture.0',{}),/EOS_TEST_CONTROL_BLOCKED/);
    await new Promise(resolve=>h.adapter.setForeignState('fixture.device',true,error=>{assert.equal(error.code,'EOS_TEST_CONTROL_BLOCKED');resolve();}));
    assert.throws(()=>h.adapter.sendTo('other.0','command',{}),/EOS_TEST_CONTROL_BLOCKED/);
    h.adapter.sendTo('eos-admin.0','eos.license.check',{},()=>{});assert.equal(busCalls,1);
    await assert.rejects(h.adapter.sendToAsync('other.0','command',{}),/EOS_TEST_CONTROL_BLOCKED/);
    await assert.rejects(h.adapter.sendToHostAsync('host','cmdExec',{}),/EOS_TEST_CONTROL_BLOCKED/);
    await assert.rejects(h.adapter.initEmsEngine(),/EOS_TEST_CONTROL_BLOCKED/);
    await assert.rejects(h.adapter.initLogicEngine(),/EOS_TEST_CONTROL_BLOCKED/);
    assert.throws(()=>{h.adapter.setForeignStateAsync=async()=>{};},TypeError);
    const token=await h.login('admin');
    for(const url of ['/api/smarthome/toggle','/api/installer/config','/api/set',
      '/api/mesh/coordinator/config','/api/mesh/coordinator/pair','/api/mesh/coordinator/operating',
      '/api/mesh/coordinator/exchange','/api/mesh/coordinator/energy',
      '/api/mesh/coordinator/accounting','/api/mesh/coordinator/accounting/report','/api/mesh/coordinator/accounting/records',
      '/api/mesh/microgrid/command','/api/mesh/local-bridge/release','/api/mesh/command/receive','/api/mesh/peer/fieldtest',
    ]){
      const response=await h.request(url,{token,method:'POST',body:{restartEms:true,emsApps:{schemaVersion:1,apps:{meshMicrogrid:{installed:true,enabled:true}}}}});
      assert.equal(response.status,503,url);assert.equal(response.data.error,'EOS_TEST_CONTROL_BLOCKED',url);
    }
    const page=await h.request('/',{token});assert.match(page.text,/Inbetriebnahme\/Testprofil/);
  }finally{await h.close();}
});

test('UI-PREVIEW: controller own default-state acknowledgement allowed, foreign IDs and commands denied',async()=>{
  const calls=[];
  const adapter={namespace:'nexowatt-ui.0',sendTo(){}, async extendForeignObjectAsync(){throw new Error('no fixture account writer');},
    setForeignState(id,state,callback){calls.push({id,state});callback?.(null);},
    async setForeignStateAsync(id,state){calls.push({id,state});}};
  integrated.installPreviewWriteBoundary(adapter);
  // This is the actual js-controller 7.2.2 _setObjectWithDefaultValue call shape.
  await adapter.setForeignStateAsync('nexowatt-ui.0.info.connection',{val:false,q:32,ack:true});
  await new Promise((resolve,reject)=>adapter.setForeignState('nexowatt-ui.0.license.valid',{val:false,ack:true},error=>error?reject(error):resolve()));
  assert.equal(calls.length,2);
  for(const [id,state] of [
    ['nexowatt-ui.0.info.connection',{val:true,ack:false}],
    ['nexowatt-ui.0.info.connection',true],
    ['nexowatt-ui.01.info.connection',{val:true,ack:true}],
    ['system.adapter.nexowatt-ui.0',{val:true,ack:true}],
    ['fixture.device',{val:true,ack:true}],
    ['nexowatt-ui.0.',{val:true,ack:true}],
  ]) await assert.rejects(adapter.setForeignStateAsync(id,state),/EOS_TEST_CONTROL_BLOCKED/);
  await assert.rejects(adapter.setForeignObjectAsync('nexowatt-ui.0.test',{}),/EOS_TEST_CONTROL_BLOCKED/);
  adapter.namespace='fixture';
  await assert.rejects(adapter.setForeignStateAsync('fixture.device',{val:true,ack:true}),/EOS_TEST_CONTROL_BLOCKED/);
  assert.equal(calls.length,2);
});

test('UI-AUTH: configured trusted headers cannot bypass real sessions',async()=>{
  const secret=crypto.randomBytes(20).toString('hex');
  const h=await createHarness({accessControl:{trustedHeaderEnabled:true,trustedHeaderSecret:secret}});
  try{const response=await h.request('/api/license/info',{headers:{'x-eos-access-secret':secret,'x-eos-user':'admin','x-eos-role':'admin'}});assert.equal(response.status,401);}
  finally{await h.close();}
});

test('UI-SUPPLY: vendored client is byte-identical to Admin reviewed source',()=>{
  assert.deepEqual(fs.readFileSync(path.join(__dirname,'../packages/eos-license-client/index.js')),fs.readFileSync(path.join(__dirname,'../../admin/packages/eos-license-client/index.js')));
});

test('UI-START: cold lifecycle starts HTTPS/onboarding but never constructs Mesh even with active app flags',async()=>{
  const h=await createHarness({startServer:false});const actions=[];const errors=[];
  try{
    for(const name of ['ensureInfoConnectionState','ensureLicenseStates','ensureInstallerStates','ensureSettingsStates','loadInstallerConfigFromState','_nwSetInfoConnection']) h.adapter[name]=async()=>{};
    h.adapter._nwStartConnectionHeartbeat=()=>{};
    h.adapter._nwRefreshLicenseFromConfiguredKey=Object.getPrototypeOf(h.adapter)._nwRefreshLicenseFromConfiguredKey;
    delete h.adapter._nwCentralLicense;
    h.adapter.initEmsEngine=async()=>{actions.push('EMS');};h.adapter.startWeatherService=()=>{actions.push('weather');};
    h.adapter.log.error=error=>errors.push(error);
    h.adapter.config.emsApps={schemaVersion:1,apps:{meshMicrogrid:{installed:true,enabled:true}}};
    await h.adapter.onReady();
    assert.deepEqual(errors,[]);assert.equal(h.adapter.server.listening,true);assert.equal(h.adapter._nwIntegratedPreview,true);assert.deepEqual(actions,[]);
    assert.equal(h.adapter._meshCoordinator,undefined,'preview return precedes the only MeshCoordinator construction');
    assert.deepEqual(h.adapter.config.emsApps.apps.meshMicrogrid,{installed:true,enabled:true},'test must not rely on default-disabled flags');
    assert.equal(h.adapter._nwCentralLicense.isAllowed(),false);
    assert.equal((await h.request('/api/strict-auth/status')).status,200);
    const token=await h.login('admin');const info=await h.request('/api/license/info',{token});
    assert.equal(info.status,200);assert.equal(info.data.valid,false);
    assert.equal((await h.request('/api/set',{token,method:'POST',body:{value:true}})).status,503);
  }finally{await h.close();}
});
