'use strict';
// Real controller + TLS Redis + EOS Admin + UI. Destructive scope is limited to
// exclusively created test directories and a new /etc/nexowatt-eos fixture.
// Never run against an existing installation; all temporary keys remain local.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const https = require('node:https');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const bootstrap = require('../../runtime/bootstrap/initialize.cjs');
const enrollment = require('../../runtime/bootstrap/enrollment.cjs');
const { provision, probeConfig } = require('../../runtime/transport/redis-tls.cjs');
const { provisionWeb, probeWeb } = require('../../runtime/transport/web-certificates.cjs');
const source = process.env.EOS_TEST_CONTROLLER_ROOT;
const binary = process.env.EOS_TEST_REDIS_SERVER;
if (!source || !path.isAbsolute(source) || !binary || !path.isAbsolute(binary)) throw new Error('ABSOLUTE_LAB_DEPENDENCIES_REQUIRED');
const fixed = '/etc/nexowatt-eos';
const interfaceFixture = process.env.EOS_TEST_INTERFACE_FIXTURE === '1';
const wait = async (condition, ms = 30000, interval = 100) => {
  const end = Date.now() + ms;
  while (!await condition()) { if (Date.now() > end) throw new Error('LAB_DEADLINE'); await new Promise(resolve => setTimeout(resolve, interval)); }
};
async function reserve(port = 0) {
  const server = net.createServer(); await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {port:server.address().port, close:()=>new Promise(resolve=>server.close(resolve))};
}
function launch(command,args,options={}) {
  const child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']});child.output='';
  for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{child.output=(child.output+chunk).slice(-524288);});
  child.completion=new Promise(resolve=>{child.once('error',()=>resolve(-1));child.once('exit',code=>resolve(code));});return child;
}
async function stop(child) {
  if(child && child.exitCode===null && child.signalCode===null){child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),7000);try{await child.completion;}finally{clearTimeout(timer);}}
}
async function run(command,args,options){const child=launch(command,args,options);const timer=setTimeout(()=>child.kill('SIGKILL'),60000);try{return{code:await child.completion,output:child.output};}finally{clearTimeout(timer);}}
function request(port,route,{ca,token,cookie,body,form,method='GET',origin=false,maxVersion='TLSv1.3',headers={}}={}) {
  return new Promise((resolve,reject)=>{
    const encoded=form?new URLSearchParams(form).toString():body===undefined?undefined:JSON.stringify(body);
    const req=https.request({hostname:'localhost',port,path:route,method,ca,minVersion:maxVersion,maxVersion,
      family:4,signal:AbortSignal.timeout(10000),headers:{...headers,...(token?{Authorization:`Bearer ${token}`} :{}),...(cookie?{Cookie:cookie}:{}),
      ...(encoded!==undefined?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json','Content-Length':Buffer.byteLength(encoded)}:{}),
      ...(origin?{Origin:`https://localhost:${port}`,'X-Eos-License':'1','Sec-Fetch-Site':'same-origin'}:{})}},response=>{
      const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size>4194304)req.destroy(new Error('LAB_RESPONSE_LIMIT'));else chunks.push(chunk);});
      response.on('end',()=>{const bytes=Buffer.concat(chunks);const text=bytes.toString();let data;try{data=JSON.parse(text);}catch(_){}resolve({status:response.statusCode,headers:response.headers,data,text,bytes});});
    });req.once('error',reject);if(encoded!==undefined)req.write(encoded);req.end();
  });
}


// Exercise the locked @iobroker/ws-server wire protocol over real TLS rather
// than calling a mocked dispatcher. Type3 messages carry callback requests.
async function connectAdminSocket(WebSocket, ca, token) {
  const socket=new WebSocket(`wss://localhost:8081/?sid=${crypto.randomBytes(12).toString('hex')}`,{ca,family:4,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',headers:{Authorization:`Bearer ${token}`},handshakeTimeout:10000,maxPayload:1048576});
  const pending=new Map();let sequence=0;
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('LAB_SOCKET_AUTH_TIMEOUT')),10000);
    const fail=()=>{clearTimeout(timer);reject(new Error('LAB_SOCKET_AUTH_FAILED'));};
    socket.once('error',fail);socket.once('close',fail);
    socket.on('message',raw=>{
      let frame;try{frame=JSON.parse(raw.toString());}catch{return;}
      if(!Array.isArray(frame))return;
      if(frame[0]===1){socket.send(JSON.stringify([2]));return;}
      if(frame[2]==='tokenInfo'){clearTimeout(timer);resolve();return;}
      if(frame[2]==='reauthenticate'){fail();return;}
      if(frame[0]===3&&pending.has(frame[1])){const item=pending.get(frame[1]);pending.delete(frame[1]);clearTimeout(item.timer);item.resolve(frame[3]||[]);}
    });
  });
  try{await ready;}catch(error){socket.terminate();throw error;}
  return {
    call(name,args){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('LAB_SOCKET_RPC_TIMEOUT'));},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify([3,id,name,args]));});},
    oversized(){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('LAB_SOCKET_SIZE_LIMIT_TIMEOUT')),10000);socket.once('close',code=>{clearTimeout(timer);resolve(code);});socket.send(' '.repeat(1048577));});},
    close(){for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('LAB_SOCKET_CLOSED'));}pending.clear();socket.terminate();},
  };
}

test('integrated UI laboratory '+(interfaceFixture ? 'WITH OS-interface fixture' : 'native interfaces')+': TLS setup, enrollment, separate roles, own passwords, branding, central license and denied physical control',{timeout:420000},async t=>{
  assert.equal(process.getuid?.(),0,'fixed-path fixtures require root lab runner; no unprivileged acceptance claim');
  assert.equal(fs.existsSync(fixed),false,'never overwrite an existing EOS installation');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'eos-ui-real-'));
  const children=[];const clients=[];const reservations=[];const secrets=[];let ownFixed=false;let runtime;let browserSmoke;
  const redact=value=>{let text=String(value);for(const secret of secrets)if(secret)text=text.replaceAll(secret,'[REDACTED]');return text.replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g,'[PEM REDACTED]').replace(/NWL2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[LICENSE REDACTED]').slice(-24000);};
  t.after(async()=>{
    if(browserSmoke)await browserSmoke.close();
    if(runtime){await stop(runtime);try{process.kill(-runtime.pid,'SIGTERM');}catch(_){} }
    await Promise.allSettled(clients.map(client=>client.destroy()));
    for(const child of [...children].reverse())await stop(child);
    for(const port of reservations)await port.close().catch(()=>{});
    if(ownFixed)fs.rmSync(fixed,{recursive:true,force:true});
    fs.rmSync(directory,{recursive:true,force:true});
  });
  const stage=async(name,fn)=>{let passed=false;await t.test(name,async()=>{await fn();passed=true;});if(!passed)throw new Error('LAB_STAGE_FAILED');};
  try{
    reservations.push(await reserve(8081),await reserve(8188));
    fs.mkdirSync(fixed,{mode:0o700});ownFixed=true;
    const web=path.join(fixed,'web');provisionWeb({directory:web,hosts:['localhost']});
    const ca=fs.readFileSync(path.join(web,'ca.crt'));
    const issuer=crypto.generateKeyPairSync('ed25519');const publicPem=issuer.publicKey.export({type:'spki',format:'pem'}).toString();
    fs.writeFileSync(path.join(fixed,'license-trust.json'),JSON.stringify({'lab-ephemeral':publicPem}),{mode:0o644,flag:'wx'});
    t.diagnostic(JSON.stringify({candidate:source,files:Object.fromEntries(['package-lock.json','node_modules/iobroker.js-controller/eos-test-profile.json','node_modules/iobroker.nexowatt-ui/lib/eos-integrated.js','node_modules/iobroker.nexowatt-ui/main.js','node_modules/iobroker.eos-admin/build/main.js'].map(relative=>[relative,crypto.createHash('sha256').update(fs.readFileSync(path.join(source,relative))).digest('hex')]))}));
    const app=path.join(directory,'app');const data=path.join(directory,'data');fs.cpSync(source,app,{recursive:true});fs.mkdirSync(data,{mode:0o700});
    if(interfaceFixture){
      // Test-copy-only accommodation for denied uv_interface_addresses; original
      // candidate, release tree and OS permissions are never modified.
      for(const [flavor,before,call] of [
        ['cjs','d7e751c93c97636b7cd5772777cb5c79afca716cb921773115a35a6436f5b27b','import_node_os.default.networkInterfaces()'],
        ['esm','c8ff22090bcda3316a8f39ddb6c943e1320dc806109a0668a48c7bd900eeb7af','os.networkInterfaces()'],
      ]){
        const relative=`node_modules/@iobroker/js-controller-adapter/build/${flavor}/lib/adapter/adapter.js`;
        const file=path.join(app,relative);const original=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(original).digest('hex'),before);
        const sourceText=original.toString();assert.equal(sourceText.split(call).length,2);
        const replaced=sourceText.replace(call,"({lo:[{address:'127.0.0.1',netmask:'255.0.0.0',family:'IPv4',mac:'00:00:00:00:00:00',internal:true,cidr:'127.0.0.1/8'}]})");
        fs.writeFileSync(file,replaced);t.diagnostic(JSON.stringify({labOnlyInterfaceFixture:relative,originalSha256:before,fixtureSha256:crypto.createHash('sha256').update(replaced).digest('hex')}));
      }
    }
    const controller=path.join(app,'node_modules/iobroker.js-controller');fs.mkdirSync(path.join(controller,'tmp'),{recursive:true});
    const objectPort=await reserve();const statePort=await reserve();const ports={objects:objectPort.port,states:statePort.port};await objectPort.close();await statePort.close();
    const transport=path.join(directory,'redis');provision({directory:transport,ports});
    for(const scope of ['objects','states']){const child=launch(binary,[path.join(transport,'redis',scope+'.conf')]);children.push(child);await wait(()=>{if(child.exitCode!==null)throw new Error('LAB_REDIS_EXIT');return child.output.includes('Ready to accept connections');});}
    const config=JSON.parse(fs.readFileSync(path.join(controller,'conf/iobroker-dist.json')));
    Object.assign(config,JSON.parse(fs.readFileSync(path.join(transport,'credentials/iobroker-databases.json'))));
    config.dataDir=data;config.system.hostname='eos-ui-lab';config.system.statisticsInterval=0;config.system.compact=false;config.system.allowShellCommands=false;
    config.multihostService.enabled=false;config.plugins={sentry:{enabled:false}};config.log={level:'info',maxDays:1,noStdout:false,transport:{file1:{type:'file',enabled:true,filename:path.join(directory,'logs','iobroker'),fileext:'.log',maxSize:1048576,maxFiles:2}}};
    for(const scope of ['objects','states'])secrets.push(config[scope].options.auth_pass);
    const configFile=path.join(data,'iobroker.json');fs.writeFileSync(configFile,JSON.stringify(config),{mode:0o600});
    const env={...process.env,IOBROKER_DATA_DIR:data,CI:'true',SENTRY_DSN:'',NODE_PATH:'',NODE_OPTIONS:''};
    const options={cwd:app,env};const cli=path.join(controller,'iobroker.js');
    await stage('ordinary setup and core hardening over two authenticated TLS1.3 Redis stores',async()=>{
      const setup=await run(process.execPath,[cli,'setup'],options);if(setup.code!==0)t.diagnostic(redact(setup.output));assert.equal(setup.code,0);
      assert.equal((await probeConfig(config)).status,'BOTH_STORES_AUTHENTICATED_TLS_OK');
      const initialized=await run(process.execPath,[path.resolve(__dirname,'../../runtime/bootstrap/initialize.cjs'),'--app',app,'--config',configFile],options);
      if(initialized.code!==0)t.diagnostic(redact(initialized.output));assert.equal(initialized.code,0);
    });
    const requireApp=createRequire(path.join(app,'package.json'));
    const log=Object.fromEntries(['silly','debug','info','warn','error'].map(name=>[name,()=>{}]));
    const connect=(Client,connection)=>new Promise((resolve,reject)=>{let client;const timer=setTimeout(()=>reject(new Error('LAB_DB_TIMEOUT')),5000);client=new Client({connection:structuredClone(connection),logger:log,connected:()=>{clearTimeout(timer);resolve(client);},disconnected:()=>{},change:()=>{}});clients.push(client);});
    const [objects,states]=await Promise.all([connect(requireApp('@iobroker/db-objects-redis').Client,config.objects),connect(requireApp('@iobroker/db-states-redis').Client,config.states)]);
    // Upstream CI=true uses a non-UUID statistics sentinel. This isolated license
    // fixture uses a genuine random UUID so the real format verifier stays intact.
    const uuidObject=await objects.getObjectAsync('system.meta.uuid');
    uuidObject.native.uuid=crypto.randomUUID();secrets.push(uuidObject.native.uuid);
    await objects.setObjectAsync('system.meta.uuid',uuidObject);
    const password=crypto.randomBytes(32).toString('base64url');secrets.push(password);
    const accountFixtures=['installer','enduser'].map(role=>({username:`lab_${role}_${crypto.randomBytes(4).toString('hex')}`,role,password:crypto.randomBytes(32).toString('base64url'),ownPassword:'persoenliches passwort '+crypto.randomBytes(32).toString('base64url').toLowerCase().replace(/[0-9_-]/g,'z')}));
    for(const account of accountFixtures)secrets.push(account.password,account.ownPassword);
    const accounts={schemaVersion:1,accounts:accountFixtures.map(({username,role,password:temporary})=>({username,role,password:temporary}))};
    await stage('fresh enrollment creates device-specific service admin and two separate accounts plus exactly two disabled approved instances',async()=>{
      const result=await enrollment.enroll({objects,states,config,app,password,accounts,verifyFresh:()=>bootstrap.initialize({objects,states,config,...bootstrap.readPinnedApp(app),verifyOnly:true})});
      assert.equal(result.status,'INTEGRATED_UI_LAB_VERIFIED');assert.equal(result.adaptersEnabled,0);assert.equal(result.physicalControlEnabled,false);
    });
    await stage('ordinary CLI uploads local Admin/UI assets without installation or npm',async()=>{
      for(const name of ['eos-admin','nexowatt-ui']){const result=await run(process.execPath,[cli,'upload',name],options);if(result.code!==0)t.diagnostic(redact(result.output));assert.equal(result.code,0);}
      for(const spec of enrollment.SPECS){const id=`system.adapter.${spec.name}.0`;const doc=await objects.getObjectAsync(id);doc.common.enabled=true;await objects.setObjectAsync(id,doc);}
    });
    for(const port of reservations.splice(0))await port.close();
    await stage('actual controller starts Admin and UI with real HTTPS identities and no physical adapters',async()=>{
      const startedAt=Date.now();
      runtime=launch(process.execPath,[path.join(controller,'controller.js')],{...options,detached:true});
      await wait(async()=>{if(runtime.exitCode!==null)throw new Error('LAB_CONTROLLER_EXIT');
        const rows=await Promise.all(['eos-admin','nexowatt-ui'].map(name=>states.getState(`system.adapter.${name}.0.alive`)));
        return rows.every(state=>state?.val===true&&state.ack===true&&state.ts>=startedAt);
      },60000);
      assert.equal((await states.getState('system.host.eos-ui-lab.pid'))?.val,runtime.pid);
      assert.equal((await objects.getObjectAsync('system.host.eos-ui-lab')).common.installedVersion,'7.2.2');
      let readiness=[];
      try{await wait(async()=>{readiness=await Promise.all([[8188,'/api/strict-auth/status'],[8081,'/version']].map(async([port,route])=>{try{const result=await request(port,route,{ca});return {port,route,status:result.status,location:result.headers.location};}catch(error){return{port,route,error:error.code||error.name};}}));return readiness.every(item=>item.status===200);},30000);}catch(error){t.diagnostic('HTTPS readiness '+JSON.stringify(readiness));throw error;}
      assert.equal((await probeWeb({directory:web})).status,'WEB_TLS_IDENTITIES_VERIFIED');
      const scope=await enrollment.verify({objects,config,app});assert.equal(scope.adaptersEnabled,2);assert.equal(scope.physicalControlEnabled,false);
      for(const port of [8081,8188])await assert.rejects(request(port,'/',{ca,maxVersion:'TLSv1.2'}));
    });
    browserSmoke=await require('./ui-browser-smoke.cjs').createBrowserSmoke({web,diagnostic:value=>t.diagnostic(redact(value))});
    if(!browserSmoke)t.diagnostic('Actual browser smoke not requested; HTTP and WebSocket checks alone do not prove frontend workflow.');
    await stage('both HTTPS entrypoints deliver the supplied NexoWatt identity and require login',async()=>{
      const logoSha256='c837651adbc7a00a044c4804c7140af99d3efdf54b0f4a97edf359e7b75593e1';
      for(const port of [8081,8188]){
        const icon=await request(port,'/favicon.ico?v=eos-20261001',{ca});assert.equal(icon.status,200);
        assert.equal(crypto.createHash('sha256').update(icon.bytes).digest('hex'),logoSha256);
      }
      const adminPage=await request(8081,'/index.html?login',{ca});assert.equal(adminPage.status,200);
      assert.equal(adminPage.text.includes('<title>NexoWatt EOS - Energy Operation System</title>'),true);
      const uiPage=await request(8188,'/',{ca});assert.equal(uiPage.status,401);assert.equal(uiPage.text.includes('NexoWatt EOS'),true);
      assert.equal((await request(8188,'/api/state',{ca})).status,401);
    });
    const adminLogin=async(username,secret)=>{
      const result=await request(8081,'/oauth/token',{ca,method:'POST',form:{grant_type:'password',client_id:'ioBroker',username,password:secret}});
      assert.equal(result.status,200,`Admin OAuth login failed for ${username}`);
      assert.equal(typeof result.data?.access_token,'string');
      secrets.push(result.data.access_token,result.data.refresh_token);
      return result.data.access_token;
    };
    const uiLogin=async(account,secret)=>{
      const result=await request(8188,'/api/auth/login',{ca,method:'POST',body:{user:account.username,password:secret}});
      assert.equal(result.status,200,`UI login failed for ${account.role}`);
      const rawCookie=(result.headers['set-cookie']||[]).find(value=>value.startsWith('nw_session='));
      assert.equal(typeof rawCookie,'string');assert.equal(rawCookie.includes('Secure'),true);assert.equal(rawCookie.includes('HttpOnly'),true);
      const cookie=rawCookie.split(';')[0];secrets.push(cookie,cookie.slice('nw_session='.length));
      return {cookie,data:result.data};
    };
    await stage('installer and enduser must choose own passwords with current credential and lose earlier sessions',async()=>{
      for(const account of accountFixtures){
        const token=await adminLogin(account.username,account.password);
        const oldUi=await uiLogin(account,account.password);
        if(browserSmoke)await browserSmoke.pending(token);
        const pending=await request(8081,'/nexowatt/security/session',{ca,token});
        assert.equal(pending.status,200);assert.equal(pending.data.role,account.role);assert.equal(pending.data.isAdmin,false);assert.equal(pending.data.mustChangePassword,true);
        const uiPending=await request(8188,'/api/auth/status',{ca,cookie:oldUi.cookie});
        assert.equal(uiPending.status,200);assert.equal(uiPending.data.isAdmin,false);assert.equal(uiPending.data.passwordChangeRequired,true);assert.deepEqual(uiPending.data.capabilities,[]);
        const blockedState=await request(8188,'/api/state',{ca,cookie:oldUi.cookie});assert.equal(blockedState.status,403);assert.equal(blockedState.data.error,'password_change_required');
        for(const route of ['/nexowatt/license/status','/nexowatt/updates/status'])assert.equal((await request(8081,route,{ca,token})).status,403);
        assert.equal((await request(8188,'/api/license/info',{ca,cookie:oldUi.cookie})).status,403);
        const payload={currentPassword:account.password,password:account.ownPassword,passwordRepeat:account.ownPassword};
        const headers={'x-nexowatt-eos-first-login':'1'};
        assert.equal((await request(8081,'/nexowatt/account/first-password',{ca,cookie:`access_token=${token}`,method:'POST',headers,body:payload})).status,403);
        assert.equal((await request(8081,'/nexowatt/account/first-password',{ca,token,method:'POST',headers:{...headers,Origin:'https://untrusted.invalid'},body:payload})).status,403);
        const invalidPassword=crypto.randomBytes(32).toString('base64url');secrets.push(invalidPassword);
        const wrong=await request(8081,'/nexowatt/account/first-password',{ca,token,origin:true,method:'POST',headers,body:{...payload,currentPassword:invalidPassword}});
        assert.equal(wrong.status,403);assert.equal(wrong.data.error,'currentPasswordInvalid');
        const target=await request(8081,'/nexowatt/account/first-password',{ca,token,origin:true,method:'POST',headers,body:{...payload,user:'admin'}});
        assert.equal(target.status,400);assert.equal(target.data.error,'invalidPasswordRequest');
        const changed=browserSmoke&&account.role==='installer' ? await browserSmoke.firstPassword(token,payload) : await request(8081,'/nexowatt/account/first-password',{ca,token,origin:true,method:'POST',headers,body:payload});
        assert.equal(changed.status,200);assert.equal(changed.data.success,true);assert.equal(changed.data.logoutRequired,true);assert.equal(changed.data.sessionInvalidated,true);
        const oldAdmin=await request(8081,'/nexowatt/security/session',{ca,token});
        assert.equal(oldAdmin.status,401);
        await wait(async()=>{const status=await request(8188,'/api/auth/status',{ca,cookie:oldUi.cookie});return status.data?.authed===false;},10000);
        const reused=await request(8188,'/api/auth/login',{ca,method:'POST',body:{user:account.username,password:account.password}});assert.equal(reused.status,401);
        account.adminToken=await adminLogin(account.username,account.ownPassword);
        account.uiCookie=(await uiLogin(account,account.ownPassword)).cookie;
        const ready=await request(8081,'/nexowatt/security/session',{ca,token:account.adminToken});
        assert.equal(ready.data.role,account.role);assert.equal(ready.data.mustChangePassword,false);assert.equal(ready.data.isAdmin,false);
      }
    });
    await stage('enduser can change only their own password through UI and invalidates sessions on both ports',async()=>{
      const account=accountFixtures.find(row=>row.role==='enduser');
      const replacement=crypto.randomBytes(32).toString('base64url');secrets.push(replacement);
      const payload={currentPassword:account.ownPassword,password:replacement,passwordRepeat:replacement};
      const headers={'x-nexowatt-eos-password':'1'};
      assert.equal((await request(8188,'/api/account/password',{ca,cookie:account.uiCookie,method:'POST',headers,body:payload})).status,403);
      const invalidPassword=crypto.randomBytes(32).toString('base64url');secrets.push(invalidPassword);
      const wrong=await request(8188,'/api/account/password',{ca,cookie:account.uiCookie,origin:true,method:'POST',headers,body:{...payload,currentPassword:invalidPassword}});
      assert.equal(wrong.status,401);
      const changed=await request(8188,'/api/account/password',{ca,cookie:account.uiCookie,origin:true,method:'POST',headers,body:payload});
      assert.equal(changed.status,200);assert.equal(changed.data.ok,true);assert.equal(changed.data.logoutRequired,true);
      await wait(async()=>{const status=await request(8188,'/api/auth/status',{ca,cookie:account.uiCookie});return status.data?.authed===false;},10000);
      const oldAdmin=await request(8081,'/nexowatt/security/session',{ca,token:account.adminToken});assert.equal(oldAdmin.status,401);
      const rejected=await request(8188,'/api/auth/login',{ca,method:'POST',body:{user:account.username,password:account.ownPassword}});assert.equal(rejected.status,401);
      account.ownPassword=replacement;
    });
    await stage('installer and enduser cannot enter service administration or promote roles through account endpoints',async()=>{
      // Password changes intentionally revoke every Admin session. Reauthenticate
      // only after both initial-password transactions have completed.
      for(const account of accountFixtures){
        account.adminToken=await adminLogin(account.username,account.ownPassword);
        account.uiCookie=(await uiLogin(account,account.ownPassword)).cookie;
        const currentUi=await request(8188,'/api/auth/status',{ca,cookie:account.uiCookie});assert.equal(currentUi.data.accountRole,account.role);assert.equal(currentUi.data.isAdmin,false);assert.equal(currentUi.data.passwordChangeRequired,false);
        for(const route of ['/nexowatt/license/status','/nexowatt/updates/status','/validate_config/nexowatt-ui'])assert.equal((await request(8081,route,{ca,token:account.adminToken})).status,403);
        const license=await request(8188,'/api/license/info',{ca,cookie:account.uiCookie});assert.equal(license.status,403);
        const reset=await request(8081,'/nexowatt/account/reset',{ca,token:account.adminToken,origin:true,method:'POST',headers:{'x-nexowatt-eos-account-reset':'1'},body:{user:'admin'}});
        assert.equal(reset.status,account.role==='installer'?400:403);
        const manage=await request(8081,'/nexowatt/account/manage',{ca,token:account.adminToken});
        assert.equal(manage.status,account.role==='installer'?200:403);
        if(account.role==='installer'){assert.equal(manage.data.canResetInstaller,false);assert.equal(manage.data.canResetEndUser,true);assert.equal(manage.text.includes('system.user.admin'),false);}
      }
    });
    await stage('password completion preserves enrolled accounts, fixed groups and runtime safety invariants',async()=>{
      const result=await enrollment.verify({objects,config,app});assert.equal(result.status,'INTEGRATED_UI_LAB_VERIFIED');assert.equal(result.adaptersEnabled,2);assert.equal(result.physicalControlEnabled,false);
    });
    await stage('real authenticated WebSocket rejects installer/enduser raw account, group and credential writes',async()=>{
      const serviceBefore=await objects.getObjectAsync('system.user.admin');
      const groupBefore=await objects.getObjectAsync('system.group.administrator');
      const fingerprint=object=>crypto.createHash('sha256').update(JSON.stringify(object)).digest('hex');
      for(const account of accountFixtures){
        const socket=await connectAdminSocket(requireApp('ws'),ca,account.adminToken);
        try{
          const randomPassword=crypto.randomBytes(32).toString('base64url');secrets.push(randomPassword);
          for(const [command,args] of [
            ['extendObject',['system.user.admin',{common:{enabled:false}}]],
            ['extendObject',['system.group.administrator',{common:{members:[`system.user.${account.username}`]}}]],
            ['changePassword',['system.user.admin',randomPassword]],
          ]){
            const result=await socket.call(command,args);
            assert.equal(typeof result[0],'string',`${command} must return a server-side denial`);assert.notEqual(result[0],'');
          }
          if(account.role==='installer'){assert.equal(await socket.oversized(),1009);assert.equal((await request(8081,'/version',{ca})).status,200);assert.equal(runtime.exitCode,null);}
        }finally{socket.close();}
      }
      assert.equal(fingerprint(await objects.getObjectAsync('system.user.admin')),fingerprint(serviceBefore));
      assert.equal(fingerprint(await objects.getObjectAsync('system.group.administrator')),fingerprint(groupBefore));
    });
    let adminToken;let uiCookie;
    await stage('real admin and UI authenticate unique account; unauthenticated license data denied',async()=>{
      const adminDenied=await request(8081,'/nexowatt/license/status',{ca});t.diagnostic('Admin anonymous license status '+adminDenied.status+' Location '+adminDenied.headers.location);assert.equal(adminDenied.status,302);assert.equal(adminDenied.headers.location,'/index.html?login&href=%2Fnexowatt%2Flicense%2Fstatus');
      const adminJsonDenied=await request(8081,'/nexowatt/license/status',{ca,headers:{Accept:'application/json'}});assert.equal(adminJsonDenied.status,302);assert.equal(adminJsonDenied.headers.location,adminDenied.headers.location);
      const publicUi=await request(8188,'/api/strict-auth/status',{ca});assert.equal(publicUi.status,200);assert.equal(publicUi.data.enabled,true);assert.equal(publicUi.data.strict,true);assert.equal(publicUi.data.protectWrites,true);assert.equal(publicUi.data.authed,false);assert.equal(publicUi.data.isAdmin,false);
      assert.equal((await request(8188,'/api/license/info',{ca})).status,401);
      await Promise.all([8081,8188].map(port=>require('../../tools/system/onboard-ui.cjs').probeWeb(port,ca)));
      const ui=await request(8188,'/api/strict-auth/login',{ca,method:'POST',body:{user:'admin',password}});
      t.diagnostic('UI actual credential login status '+ui.status);assert.equal(ui.status,200);assert.equal(ui.data.accountRole,'service');assert.equal(ui.data.isAdmin,true);assert.equal(ui.data.passwordChangeRequired,false);const cookie=(ui.headers['set-cookie']||[]).find(value=>value.startsWith('nw_session='));assert.equal(typeof cookie,'string');assert.equal(cookie.includes('Secure'),true);uiCookie=cookie.split(';')[0];secrets.push(uiCookie,uiCookie.slice('nw_session='.length));
      const {EosSessionSecurity}=requireApp('iobroker.eos-admin/build/lib/eosSessionSecurity.js');
      let actualGroupRows;
      const snapshotCheck=new EosSessionSecurity({getSession(_id,callback){callback(null);},setSession(_id,_ttl,_data,callback){callback(null);},getForeignObjectAsync:id=>objects.getObjectAsync(id),async getObjectViewAsync(design,view,options){const result=await objects.getObjectViewAsync(design,view,options);actualGroupRows=result.rows;return result;}});
      try{await snapshotCheck.snapshot('admin');t.diagnostic('Actual database Admin security snapshot accepted');}catch(error){t.diagnostic('Actual database Admin security snapshot failed '+error.message);t.diagnostic('Group row shapes '+JSON.stringify(actualGroupRows.map(row=>({keys:Object.keys(row),idType:typeof row.id,valueType:row.value?.type,valueKeys:Object.keys(row.value||{})}))));throw error;}
      const admin=await request(8081,'/oauth/token',{ca,method:'POST',form:{grant_type:'password',client_id:'ioBroker',username:'admin',password}});
      if(admin.status!==200)t.diagnostic('Admin login status '+admin.status+' '+redact(admin.text));
      assert.equal(admin.status,200);assert.equal(typeof admin.data?.access_token,'string');adminToken=admin.data.access_token;secrets.push(adminToken,admin.data.refresh_token);
      assert.equal((admin.headers['set-cookie']||[]).some(value=>value.includes('Secure')&&value.includes('HttpOnly')),true);
      const before=await request(8188,'/api/license/info',{ca,cookie:uiCookie});assert.equal(before.status,200);assert.equal(before.data.valid,false);assert.equal(before.text.includes('licenseKey'),false);
    });
    await stage('central signed test license activates UI capabilities via real encrypted messagebox without raw license export',async()=>{
      const uuid=(await objects.getObjectAsync('system.meta.uuid')).native.uuid;
      const now=Date.now();const payload={v:2,kid:'lab-ephemeral',licenseId:'isolated-lab',uuid,edition:'home',issuedAt:now-1000,notBefore:now-1000,expiresAt:now+600000,adapters:['nexowatt-ui'],limits:{chargePoints:2,batteries:1}};
      const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');const token=`NWL2.${encoded}.${crypto.sign(null,Buffer.from('NWL2.'+encoded),issuer.privateKey).toString('base64url')}`;secrets.push(token);
      const rejected=await request(8081,'/nexowatt/license/activate',{ca,token:adminToken,method:'POST',body:{token}});assert.equal(rejected.status,403);
      const activated=await request(8081,'/nexowatt/license/activate',{ca,token:adminToken,origin:true,method:'POST',body:{token}});
      if(activated.status!==200)t.diagnostic('License activation status '+activated.status+' '+redact(activated.text));assert.equal(activated.status,200);
      await wait(async()=>{const result=await request(8188,'/api/license/info',{ca,cookie:uiCookie});return result.data?.valid===true;},15000,1000);
      const info=await request(8188,'/api/license/info',{ca,cookie:uiCookie});assert.equal(info.data.maxWallboxes,2);assert.equal(info.data.maxStorages,1);assert.equal(info.data.managedBy,'eos-admin.0');
      assert.equal(info.text.includes(token),false);assert.equal(info.text.includes(uuid),false);
      const page=await request(8188,'/',{ca,cookie:uiCookie});assert.equal(page.status,200);assert.equal(page.text.includes('Inbetriebnahme/Testprofil'),true);
    });
    if(browserSmoke)await stage('real Chromium opens role-specific product portal, installer account/settings dialogs and licensed EOS UI',async()=>{
      for(const account of accountFixtures)await browserSmoke.ready(account);
    });
    await stage('licensed integrated preview blocks mesh activation and every mesh mutation route before execution',async()=>{
      const before=(await objects.getObjectAsync('system.adapter.nexowatt-ui.0')).native;
      // Exercise the authenticated service identity after license activation: the
      // preview boundary must apply independently of login, license and app flags.
      for(const route of [
        '/api/mesh/coordinator/config','/api/mesh/coordinator/pair',
        '/api/mesh/coordinator/operating','/api/mesh/coordinator/exchange',
        '/api/mesh/coordinator/energy','/api/mesh/coordinator/accounting',
        '/api/mesh/coordinator/accounting/report','/api/mesh/coordinator/accounting/records',
        '/api/mesh/microgrid/command','/api/mesh/local-bridge/release',
        '/api/mesh/command/receive','/api/mesh/peer/fieldtest',
        '/api/installer/config',
      ]){
        const response=await request(8188,route,{ca,cookie:uiCookie,origin:true,method:'POST',body:{
          emsApps:{schemaVersion:1,apps:{meshMicrogrid:{installed:true,enabled:true}}},
          restartEms:true,
        }});
        assert.equal(response.status,503,route);assert.equal(response.data.error,'EOS_TEST_CONTROL_BLOCKED',route);
      }
      const after=(await objects.getObjectAsync('system.adapter.nexowatt-ui.0')).native;
      assert.deepEqual(after.emsApps,before.emsApps,'blocked activation must not persist app flags');
      // The process interface does not expose its internal coordinator instance;
      // the component cold-start test independently verifies its nonconstruction.
    });
    await stage('licensed preview denies physical commands and central removal closes capabilities',async()=>{
      for(const route of ['/api/set','/api/smarthome/toggle','/api/installer/config']){const response=await request(8188,route,{ca,cookie:uiCookie,method:'POST',body:{id:'fixture.only',value:true}});assert.equal(response.status,503);assert.equal(response.data.error,'EOS_TEST_CONTROL_BLOCKED');}
      const removed=await request(8081,'/nexowatt/license/remove',{ca,token:adminToken,origin:true,method:'POST',body:{}});assert.equal(removed.status,200);
      await wait(async()=>{const result=await request(8188,'/api/license/info',{ca,cookie:uiCookie});return result.data?.valid===false;},15000,1000);
      assert.equal((await request(8188,'/api/strict-auth/status',{ca,cookie:uiCookie})).status,200);
      assert.equal((await request(8188,'/api/license/features',{ca,cookie:uiCookie})).status,403);
    });
    t.diagnostic('OS interface fixture='+interfaceFixture+'. Executed Node '+process.version+' '+process.platform+'/'+process.arch+' UID '+process.getuid()+': real controller/Redis/Admin/UI, CI setup with explicit random license-fixture UUID, ephemeral certificates/password/issuer; no systemd/RPi/unprivileged acceptance.');
  }catch(error){if(runtime)t.diagnostic(redact(runtime.output));const logs=path.join(directory,'logs');if(fs.existsSync(logs))for(const name of fs.readdirSync(logs)){if(name.endsWith('.log'))t.diagnostic('Adapter log '+redact(fs.readFileSync(path.join(logs,name),'utf8')));}throw error;}
});
