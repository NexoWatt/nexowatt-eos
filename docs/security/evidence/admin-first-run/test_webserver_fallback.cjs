'use strict';
const fs=require('node:fs'); const vm=require('node:vm'); const assert=require('node:assert/strict');const {createHash}=require('node:crypto');
const file=__dirname+'/fixtures/webServer.js'; const source=fs.readFileSync(file,'utf8');
const probes=[];
async function run(id,certs){
 const calls=[]; const exports={};
 const sandbox={exports,require:(name)=>{
  if(name==='node:tls')return {createSecureContext:()=>({kind:'tls-context-stub'})};
  if(name==='node:http')return {createServer:()=>{calls.push('http.createServer');return {kind:'http-server-stub'}}};
  if(name==='node:https')return {createServer:()=>{calls.push('https.createServer');return {kind:'https-server-stub'}}};
  if(name==='./certificateManager')return {CertificateManager:class {}};
  if(name==='./acmeChallenge')return {};
  throw Error('Unexpected dependency '+name);
 }};
 vm.runInNewContext(source,sandbox,{filename:file});
 const instance=new exports.WebServer({secure:true,acmeChallenge:false,adapter:{config:{leCollection:false},getCertificatesAsync:async()=>certs,log:{debug:()=>{},warn:()=>{},error:()=>{}}}});
 const result=await instance.init();probes.push({id,configuration:{secure:true,leCollection:false},calls,result});return result;
}
(async()=>{
 assert.equal((await run('secure_true_null_certificate_result',null)).kind,'http-server-stub');
 assert.equal((await run('secure_true_unresolved_pem_paths',[{key:'unreadable-fixture.pem',cert:'unreadable-fixture.pem'}])).kind,'http-server-stub');
 assert.equal((await run('secure_true_certificate_options',[{key:'fixture-key-only-stub',cert:'fixture-cert-only-stub'}])).kind,'https-server-stub');
 fs.writeFileSync(__dirname+'/webserver_fallback_results.json',JSON.stringify({executed_at:new Date().toISOString(),runtime:process.version,kind:'actual package module executed with HTTP/HTTPS and certificate-provider stubs; no real TLS handshake or listener',package:'@iobroker/webserver@3.0.2',source_sha256:createHash('sha256').update(source).digest('hex'),cases:probes},null,2)+'\n');console.log('3 cases: source branching reproduced; no actual TLS/server integration.');
})().catch(e=>{console.error(e);process.exitCode=1;});
