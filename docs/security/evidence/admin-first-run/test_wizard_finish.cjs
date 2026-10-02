'use strict';
// Isolated execution of exact pinned onClose method; no server, network or real objects.
const fs=require('node:fs'); const vm=require('node:vm'); const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'); const {createHash}=require('node:crypto');
const path=__dirname+'/fixtures/WizardDialog.onClose.ts';
const source=fs.readFileSync(path,'utf8');
const start=source.indexOf('    async onClose(): Promise<void> {');
const end=source.length;
assert(start>=0 && end>start);
const extracted=source.slice(start,end);
const code=stripTypeScriptTypes('class WizardProbe {\n'+extracted+'\n}; WizardProbe.prototype.onClose');
const results=[];
async function run(id,native,state,certs,repeat=false){
 const calls=[]; const context={Router:{doNavigate:(...a)=>calls.push(['navigate',...a])},I18n:{t:x=>x},window:{location:{host:'fixture.invalid:8081'}},adminHref:x=>'/'+x};
 const method=vm.runInNewContext(code,context);
 const target={adminInstance:{_id:'system.adapter.admin.0',native:{...native}},state:{...state},setState(p){Object.assign(this.state,p);calls.push(['setState',JSON.parse(JSON.stringify(p))]);},props:{socket:{getState:async()=>({val:false}),getCertificates:async()=>{calls.push(['getCertificates']);return certs;},setObject:async(id,obj)=>calls.push(['setObject',id,JSON.parse(JSON.stringify(obj))])},onClose:(...a)=>calls.push(['close',...a])}};
 await method.call(target); if(repeat)await method.call(target);
 const result={id,state:target.state,calls}; results.push(result);return result;
}
(async()=>{
 let r=await run('defaults_remain_http_without_auth',{secure:false,auth:false,certPublic:'',certPrivate:''},{secure:false,auth:false},[]);
 assert.equal(r.calls.some(x=>x[0]==='setObject'),false);
 r=await run('select_https_auth_with_certificates',{secure:false,auth:false,certPublic:'',certPrivate:''},{secure:true,auth:true},[{name:'fixturePublic',type:'public'},{name:'fixturePrivate',type:'private'}]);
 assert.equal(r.calls.find(x=>x[0]==='setObject')[2].native.secure,true);
 r=await run('missing_certificates_first_finish',{secure:false,auth:false,certPublic:'',certPrivate:''},{secure:true,auth:true},[]);
 assert.equal(r.state.secure,false); assert.equal(r.calls.some(x=>x[0]==='setObject'),false);
 r=await run('missing_certificates_second_finish',{secure:false,auth:false,certPublic:'',certPrivate:''},{secure:true,auth:true},[],true);
 assert.equal(r.calls.find(x=>x[0]==='setObject')[2].native.secure,false);
 assert.equal(r.calls.find(x=>x[0]==='setObject')[2].native.auth,true);
 r=await run('preconfigured_certificate_names_activation',{secure:false,auth:false,certPublic:'fixturePublic',certPrivate:'fixturePrivate'},{secure:true,auth:true},[{name:'fixturePublic',type:'public'},{name:'fixturePrivate',type:'private'}]);
 assert.equal(r.state.secure,false); assert.equal(r.calls.some(x=>x[0]==='getCertificates'),false);
 fs.writeFileSync(__dirname+'/wizard_finish_results.json',JSON.stringify({executed_at:new Date().toISOString(),runtime:process.version,kind:'isolated exact method with socket and browser stubs, not integration',source_commit:'e4b39b810f5f12cd6e969e25a39ff6f3188a6608',source_sha256:createHash('sha256').update(source).digest('hex'),method_sha256:createHash('sha256').update(extracted).digest('hex'),cases:results},null,2)+'\n');
 console.log('5 cases: source behavior reproduced; not security acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1;});
