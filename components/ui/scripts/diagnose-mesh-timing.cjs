'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const filename=path.join(root,'scripts/verify-mesh-coordinator.cjs');
const protocol=require(path.join(root,'lib/mesh-coordinator-protocol'));
const C=require(path.join(root,'lib/mesh-coordinator-contract'));
const {performance}=require('node:perf_hooks');
let acceptFailures=0;const original=protocol.MeshSlaveLease.prototype.accept;
protocol.MeshSlaveLease.prototype.accept=function(response){const p=this.pending, now=this.now(),c=this.config;try{return original.call(this,response);}catch(e){if(acceptFailures++<8) console.log('DIAG_ACCEPT '+JSON.stringify({code:e.message,node:c.nodeId,elapsedMs:p?now-p.started:null,timeoutMs:c.requestTimeoutMs,leaseMs:response?.leaseMs,remainingMs:p?p.started+response?.leaseMs-now:null,sequenceMatch:response?.requestSequence===p?.request?.sequence,requestMatch:response?.requestId===p?.request?.requestId,bindingMatch:response?.binding===protocol.digest(c,c.local),epochMatch:response?.epoch===this.epoch,commandSequence:response?.commandSeq,previousCommandSequence:this.command?.commandSeq,sameCommandContents:!this.command||response?.commandSeq!==this.command.commandSeq||(response?.state===this.command.state&&response?.active===this.command.active&&JSON.stringify(response?.limits)===JSON.stringify(this.command.limits))}));throw e;}};
const coord=require(path.join(root,'lib/mesh-coordinator'));
const measurements={cycles:[],receiveMs:[],loopLagMs:[]};const oc=coord.MeshCoordinator.prototype.cycle,or=coord.MeshCoordinator.prototype.receive;
coord.MeshCoordinator.prototype.cycle=async function(){const start=performance.now();try{return await oc.call(this);}finally{if(measurements.cycles.length<2000)measurements.cycles.push({elapsedMs:performance.now()-start,error:this.error||null});}};
coord.MeshCoordinator.prototype.receive=function(packet){const start=performance.now();try{return or.call(this,packet);}finally{if(measurements.receiveMs.length<2000)measurements.receiveMs.push(performance.now()-start);}};
let prior=performance.now();const lag=setInterval(()=>{const now=performance.now();measurements.loopLagMs.push(Math.max(0,now-prior-10));prior=now;},10);lag.unref();
function stats(rows){const s=[...rows].sort((a,b)=>a-b);return {count:s.length,total:s.reduce((a,b)=>a+b,0),p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)};}
process.once('exit',()=>console.log('DIAG_SUMMARY '+JSON.stringify({cycle:stats(measurements.cycles.map(x=>x.elapsedMs)),failures:measurements.cycles.filter(x=>x.error).slice(0,8),receive:stats(measurements.receiveMs),eventLoopLag:stats(measurements.loopLagMs)})));
const source=fs.readFileSync(filename,'utf8');console.log('DIAG_SOURCE '+JSON.stringify({sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),instrumentation:'in-memory prototype timing wrappers; no runtime changes; bounded diagnostics; no payload/secrets'}));
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=Module._nodeModulePaths(path.dirname(filename));fixture._compile(source,filename);
