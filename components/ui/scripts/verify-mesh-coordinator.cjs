'use strict';
// Master/Slave-Regressionsprüfung: echte Zustandsmaschine, monotone Uhr und 99
// voneinander unabhängige Teilnehmer. Keine Verbindung zu Anlagen oder Tailnets.
const assert = require('node:assert/strict');
const C = require('../lib/mesh-coordinator-contract');
const appConfig = () => ({ emsApps: { apps: { meshMicrogrid: { installed: true, enabled: true } } } });
const { MeshMasterProtocol, MeshSlaveLease } = require('../lib/mesh-coordinator-protocol');
const { MeshCoordinator, exchangeHttp } = require('../lib/mesh-coordinator');
const zero = () => ({ ...C.ZERO });
const budget = (w = 1000) => ({ importW: w, exportW: w, l1A: 10, l2A: 10, l3A: 10, evW: w, chargeW: w, dischargeW: w, pvW: w, flexW: w });
const feedback = Object.fromEntries(['evW','chargeW','dischargeW','pvW','flexW'].map(k => [k, `test.${k}`]));
function config(count = 99) {
  const c = C.defaultConfig(); Object.assign(c, { role: 'master', mode: 'active', siteId: 'site', nodeId: 'master', masterId: 'master', rampWPerSecond: 1000 });
  c.nodes = Array.from({ length: count }, (_, i) => ({ id: `house_${i}`, max: budget(), fallback: zero(), weight: 1, commissioned: true, watchdogVerified: true }));
  c.site.limit = { importW: count * 500, exportW: count * 500, l1A: count * 5, l2A: count * 5, l3A: count * 5 };
  return C.validateConfig(c);
}
const sample = () => ({ quality: 'ok', ageMs: 0, gridW: 0, phaseA: [0,0,0], devicesHealthy: true, controlledW: zero() });
let tests = 0;
function check(name, fn) { fn(); tests++; console.log(`OK ${name}`); }
async function main() {
  check('99 Slaves; 100., doppelte ID und unsichere Rückfallsumme abgewiesen', () => {
    const c = config(); assert.equal(c.nodes.length,99);
    const tooMany = C.clone(c); tooMany.nodes.push({ ...tooMany.nodes[0], id:'extra' }); assert.throws(() => C.validateConfig(tooMany));
    const duplicate = C.clone(c); duplicate.nodes[1].id=duplicate.nodes[0].id; assert.throws(() => C.validateConfig(duplicate));
    const bad = C.clone(c); bad.nodes[0].fallback.importW=1000; bad.site.limit.importW=500; assert.throws(() => C.validateConfig(bad));
  });
  check('HTTP nur im Tailnet/Loopback; HMAC erkennt Manipulation', () => {
    assert.throws(() => C.masterUrl('http://example.org')); assert.throws(() => C.masterUrl('https://user:pass@example.org'));
    assert.equal(C.masterUrl('http://100.100.1.2:8188'), 'http://100.100.1.2:8188');
    const key=require('node:crypto').randomBytes(32).toString('base64url'); const p=C.sign({x:1},key);assert(C.verify(p,key));p.payload.x=2;assert(!C.verify(p,key));
  });
  let clock=0; const c=config(); const master=new MeshMasterProtocol(c,()=>clock);
  const slaves=c.nodes.map(local => new MeshSlaveLease(C.validateConfig({...c,role:'slave',nodeId:local.id,local,feedback,masterUrl:'http://127.0.0.1'}),()=>clock));
  slaves.forEach(s => s.acceptHello(master.hello(s.hello())));
  const round=(skip=-1)=> { slaves.forEach((s,i) => { if(i===skip)return; const cmd=master.exchange(s.request(sample(),s.command?.commandSeq||0,2),sample());s.accept(cmd); }); clock+=1000; };
  check('Wiederanlauf erst nach bestätigtem Rückfall; 99 Teilnehmer innerhalb Budget',()=> {
    round();assert.equal(master.state,'SITE_DEGRADED'); for(let i=0;i<18;i++)round();assert.equal(master.state,'NORMAL');
    assert(slaves.every(s=>s.current().limits.importW>0));
    for(const k of C.NETWORK_KEYS) assert([...master.records.values()].reduce((sum,r)=>sum+r.reserved[k],0)<=c.site.limit[k]+1e-6);
  });
  check('Ein fehlender Slave: übrige Teilnehmer erhalten Rückfall, Altbudget bleibt reserviert',()=> {
    const reserved=master.records.get('house_0').reserved.importW; for(let i=0;i<5;i++)round(0);
    assert.equal(master.state,'SITE_DEGRADED');assert.equal(slaves[0].current().valid,false);
    assert.equal(master.records.get('house_0').reserved.importW,reserved);
    assert(slaves.slice(1).every(s=>s.current().limits.importW===0));
  });
  check('Wiederverbindung mit begrenztem Wiederanlauf',()=> {for(let i=0;i<18;i++)round();assert.equal(master.state,'NORMAL');});
  check('Hauptzähler-Ausfall setzt Wiederanlauf zurück; keine sofortige Freigabe',()=> {
    master.plan({quality:'missing'});assert.equal(master.state,'SITE_DEGRADED');assert([...master.records.values()].every(r=>r.stableCycles===0));
    round();assert.equal(master.state,'SITE_DEGRADED');for(let i=0;i<18;i++)round();assert.equal(master.state,'NORMAL');
  });
  check('Replay, fremder Boot, alte Revision und verspätete Antwort verlängern keine Lease',()=> {
    const s=slaves[0];const req=s.request(sample(),s.command.commandSeq,2);const response=master.exchange(req,sample());
    assert.throws(()=>master.exchange(req,sample()));
    clock+=c.requestTimeoutMs+1;assert.throws(()=>s.accept(response));
    const req2=s.request(sample(),s.command.commandSeq,2);const response2=master.exchange(req2,sample());response2.bootId='0'.repeat(32);assert.throws(()=>s.accept(response2));
    const req3=s.request(sample(),0,2);req3.revision++;assert.throws(()=>master.exchange(req3,sample()));
  });
  check('Master-Neustart reserviert Maxima und verlangt neue Synchronisation',()=> {
    const restarted=new MeshMasterProtocol(c,()=>clock);assert.notEqual(restarted.epoch,master.epoch);assert.equal(restarted.records.get('house_0').reserved.importW,1000);
    assert.throws(()=>restarted.exchange(slaves[0].request(sample(),0,2),sample()));
  });
  check('Strangreserve und Phasen begrenzen zusätzlich; Null bleibt Null',()=> {
    const branch=C.clone(c);branch.nodes.forEach(n=>n.branch='branch');branch.branches=[{id:'branch',limit:{importW:0,exportW:0,l1A:0,l2A:0,l3A:0},reserve:{importW:0,exportW:0,l1A:0,l2A:0,l3A:0},unmonitored:{importW:0,exportW:0,l1A:0,l2A:0,l3A:0}}];
    assert(C.validateConfig(branch));const s=new MeshSlaveLease(slaves[0].config,()=>clock);assert.equal(s.current().limits.importW,0);
  });
  check('Finale Sicherheitsprüfung begrenzt Boost und addierte Ladepunkte; Ablauf erzwingt Null', () => {
    const safety = require('../ems/services/safety-envelope');
    let live = { required: true, valid: true, limits: { ...budget(6000), evW: 2000 }, commandSeq: 1, epoch: 'test' };
    const adapter = { config: { installerConfig: { gridConnectionPower: 10000, gridPhaseCount: 3, safetyMeterTimeoutSec: 30 }, chargingManagement: {}, peakShaving: {} },
      _meshCoordinator: { currentLimits: () => live }, _nvpFreshnessSnapshot: { ts: Date.now(), usable: true, fresh: true, connected: true, netW: 0, status: 'ok', measurementAgeMs: 0, heartbeatAgeMs: 0 } };
    const dp = { getEntry: key => ({ key, objectId: key }), getRaw: () => 0, getAgeMs: () => 0, getMeasurementAgeMs: () => 0, getConnectionStatus: () => true };
    safety.beginSafetyCycle(adapter, 1, Date.now());
    const env = safety.buildSafetyEnvelope({ adapter, dp, coreSnapshot: { grid: { gridSafetyMarginW: 0, gridImportLimitW_physical: 10000, gridImportLimitW_effective: 10000, gridMaxPhaseA_cfg: 32 } }, generation: 1, now: Date.now() });
    assert.equal(env.valid, true); assert.equal(env.grid.maxImportW, 6000);
    const request = { key: 'evcs:a', app: 'evcs', requestedW: 11000, currentActualW: 0, currentActualFresh: true };
    const one = safety.evaluateFlexibleLoadRequest(adapter, request); assert.equal(one.allowedW, 2000);
    safety.commitFlexibleLoadDecision(adapter, one);
    assert.equal(safety.evaluateFlexibleLoadRequest(adapter, { ...request, key: 'evcs:b' }).allowedW, 0);
    live = { ...live, valid: false, limits: zero() };
    assert.equal(safety.evaluateFlexibleLoadRequest(adapter, request).allowedW, 0);
  });
  check('Finaler PV-/Speicher-Writer prüft aktuelle Nullgrenzen und Exportbudget', () => {
    const { clampMeshWrite } = require('../lib/mesh-coordinator-writer');
    let limits = zero(); const adapter = { config: { gridConstraints: { pvRatedPowerW: 10000 } }, _meshCoordinator: { currentLimits: () => ({ required: true, limits }), sample } };
    const dp = { getNumber: () => 0 };
    for (const key of ['pv.limitW','pv.limitPct','pv.feedInLimitW','st.targetPowerW','st.targetChargePowerW','st.targetDischargePowerW','st.maxChargeW','st.maxDischargeW']) assert.equal(clampMeshWrite(adapter, dp, key, 9999), 0);
    limits = budget(1000); assert.equal(clampMeshWrite(adapter, dp, 'pv.limitPct', 100), 10);
    assert.equal(clampMeshWrite(adapter, dp, 'st.targetPowerW', -5000), -1000);
    adapter._meshCoordinator.sample = () => ({ ...sample(), gridW: -900 }); assert.equal(clampMeshWrite(adapter, dp, 'st.targetDischargePowerW', 9999), 100);
  });
  check('Speicher-Freigabe nutzt kanonisches storage.controlMode und sperrt Farm/Sondermodi', () => {
    const adapter = { config: { storage: { controlMode: 'enableFlags' } }, emsEngine: { dp: { getEntry: key => ['st.targetPowerW','st.maxChargeW','st.maxDischargeW'].includes(key) ? {key} : null } } };
    const service = new MeshCoordinator(adapter);const localConfig = {local:{max:budget(1000)}}; localConfig.local.max.pvW=0;
    assert.throws(()=>service.checkLocalWriters(localConfig), /numerischen/);
    adapter.config.storage.controlMode='targetPower';service.checkLocalWriters(localConfig);
    adapter.config.storage.controlMode='limits';service.checkLocalWriters(localConfig);
    adapter.config.storageFarm={storages:[{enabled:true}]};assert.throws(()=>service.checkLocalWriters(localConfig), /Speicherfarmen/);delete adapter.config.storageFarm;
    adapter._nwGetStorageControlAuthority=()=>({selectedTopology:'farm'});assert.throws(()=>service.checkLocalWriters(localConfig), /Speicherfarmen/);service.stop();
  });
  check('Schnelle Publish-Syntaxprüfung führt Code nicht aus und erkennt Fehler', () => {
    const { checkJavaScriptSyntax } = require('./check-javascript-syntax.cjs');
    assert.equal(checkJavaScriptSyntax(__filename).status, 0);
    assert.equal(checkJavaScriptSyntax(require.resolve('../lib/mesh-coordinator')).status, 0);
  });
  check('Microgrid-Meldung: Diagnose still, Anlauf normal, Betriebsausfall kritisch, ein Ereignis', () => {
    const service = new MeshCoordinator({config:appConfig()}); service.config.mode = 'diagnostic'; assert.equal(service.notificationEvent(), null);
    service.config.mode = 'active'; service.master = { state: 'SITE_DEGRADED' }; assert.equal(service.notificationEvent().severity, 'warning');
    service.everNormal = true; assert.equal(service.notificationEvent().severity, 'critical'); service.master.state = 'NORMAL'; assert.equal(service.notificationEvent(), null);
    service.locked = true; assert.equal(service.notificationEvent().severity, 'critical'); service.stop();
  });
  // Echter HTTP-Kanal: kein sequentialisierter Master-Poll und kein physischer IO.
  const http=require('node:http'), fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'nw-mesh-test-'));
  const adapter={namespace:'test.0',config:appConfig(),log:{warn(){}},emsEngine:{requestImmediateTick(){}}};
  const service=new MeshCoordinator(adapter,{directory:dir,systemSecret:'test-system-key-only',sample});await service.init();
  service.config=c; service.resetProtocols();const secrets=c.nodes.map(n=>{const key=require('node:crypto').randomBytes(32).toString('base64url');service.keys[n.id]=key;return key;});
  const server=http.createServer((req,res)=>{let data='';req.on('data',d=>data+=d);req.on('end',()=>{try {const body=JSON.parse(data);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(service.receive(body)));}catch{res.statusCode=403;res.end('{}');}});});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const clients=c.nodes.map((n,i)=>{const sc=new MeshCoordinator(adapter,{directory:dir,systemSecret:'test-only',sample});sc.initialized=true;sc.config=C.validateConfig({...c,role:'slave',nodeId:n.id,local:n,feedback,masterUrl:`http://127.0.0.1:${server.address().port}`});sc.slaveKey=secrets[i];sc.resetProtocols();return sc;});
  try {
    const start=performance.now();await Promise.all(clients.map(sc=>sc.cycle()));await Promise.all(clients.map(sc=>sc.cycle()));
    assert(clients.every(sc=>sc.currentLimits().valid));assert(service.master.records.size===99);tests++;
    console.log(`OK echte parallele HTTP-Kommunikation: 99 Slaves, Handshake + Freigabe in ${Math.round(performance.now()-start)} ms (Loopback, kein Feldnachweis)`);
    // Warmes 99-Verbindungs-Netz unter parallelem fsync: keine Messung des VPNs.
    const { EnergyJournal, hash } = require('../lib/mesh-energy-journal');
    const archive = new EnergyJournal(path.join(dir,'parallel-archive')); await archive.init();
    service.config.intervalMs=250; service.config.requestTimeoutMs=200; clients.forEach(sc=>{sc.config.intervalMs=250;sc.config.requestTimeoutMs=200;});
    const rtts=[], roundDiagnostics=[]; let lastRecord=null;
    for(let round=0;round<8;round++) {
      const startRound=performance.now();
      const disk=(async()=>{for(let i=0;i<32;i++){const r={seq:(lastRecord?.seq||0)+1,stream:'test',siteId:'site',nodeId:'disk',previousHash:lastRecord?.hash||''};r.hash=hash(r);await archive.append(r);lastRecord=r;}return performance.now();})();
      await Promise.all(clients.map(sc=>sc.cycle())); const networkEnd=performance.now(); const diskEnd=await disk;
      roundDiagnostics.push({round,networkMs:networkEnd-startRound,archiveMs:diskEnd-startRound,checkedAfterBothMs:performance.now()-startRound,state:service.master.state});
      // Vergleichsgate bewusst NACH Archivabschluss erhalten. Aktuelle Fehlversuche
      // getrennt von der letzten erfolgreichen RTT ausweisen; keine Nutzdaten/Keys.
      assert(clients.every(sc=>sc.currentLimits().valid),`250-ms-Takt Runde ${round}: ${JSON.stringify({rounds:roundDiagnostics,failed:clients.map((sc,i)=>({i,error:sc.error,remaining:sc.currentLimits().remainingMs,lastSuccessfulRttMs:sc.latencies.at(-1),attempt:sc.lastAttempt})).filter(row=>row.error||row.remaining<=0)})}`);
      rtts.push(...clients.map(sc=>sc.latencies.at(-1)));
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,250-(performance.now()-startRound))));
    }
    rtts.sort((a,b)=>a-b);tests++;
    console.log(`OK 99 warme HTTP-Kanäle im 250-ms-Takt mit Archiv-fsync: ${rtts.length} Antworten, P95 ${Math.ceil(rtts[Math.ceil(rtts.length*.95)-1])} ms, Maximum ${Math.ceil(rtts.at(-1))} ms (Loopback)`);
    console.log('Mesh-Lastdiagnose (bisheriger Rückfallpfad): '+JSON.stringify(roundDiagnostics));
    // Ergänzung, kein Ersatz des obigen Gates: echte Protokoll-ACKs im NORMAL-
    // Pfad. markApplied repräsentiert hier ausschließlich den simulierten EMS-
    // Vollzug; dieser Loopbacktest bestätigt keine physische Geräteanwendung.
    for(const sc of clients) sc.markApplied(sc.currentLimits());
    const normalRtts=[];
    for(let round=0;round<c.recoveryCycles+3;round++){
      const startRound=performance.now();
      await Promise.all(clients.map(async sc=>{await sc.cycle();assert(sc.currentLimits().valid,JSON.stringify({round,error:sc.error,attempt:sc.lastAttempt}));sc.markApplied(sc.currentLimits());}));
      if(clients.every(sc=>sc.currentLimits().state==='NORMAL')) normalRtts.push(...clients.map(sc=>sc.latencies.at(-1)));
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,250-(performance.now()-startRound))));
    }
    assert.equal(service.master.state,'NORMAL');assert(clients.every(sc=>sc.currentLimits().state==='NORMAL'));
    assert([...service.master.records.values()].some(r=>r.target.importW>0));
    normalRtts.sort((a,b)=>a-b);tests++;
    console.log(`OK NORMAL mit simuliert bestätigter Anwendung: ${normalRtts.length} Antworten, P95 ${Math.ceil(normalRtts[Math.ceil(normalRtts.length*.95)-1])} ms, Maximum ${Math.ceil(normalRtts.at(-1))} ms; kein Hardwarebeleg`);
    clients[0].config.masterUrl='http://127.0.0.1:1';await Promise.all(clients.map(sc=>sc.cycle()));assert(!clients[0].currentLimits().valid);assert(clients.slice(1).every(sc=>sc.currentLimits().valid));tests++;console.log('OK unerreichbarer Slave-Kanal blockiert andere 98 Kanäle nicht');
    service.config={...c,mode:'diagnostic'};service.resetProtocols();await service.persist({config:service.config,keys:service.keys,slaveKey:''});
    const bytes=await fs.readFile(service.file,'utf8');assert(!bytes.includes(secrets[0]));
    const restored=new MeshCoordinator(adapter,{directory:dir,systemSecret:'test-system-key-only',sample});await restored.init();assert.equal(restored.config.nodes.length,99);assert.equal(restored.keys.house_0,secrets[0]);restored.stop();tests++;console.log('OK verschlüsselte Konfiguration und Neustart');
    await service.persist({ config: c, keys: service.keys, slaveKey: '' }); await fs.unlink(service.file);
    const missingActive = new MeshCoordinator(adapter,{directory:dir,systemSecret:'test-system-key-only'}); await missingActive.init();assert.equal(missingActive.currentLimits().state,'LOCKED');missingActive.stop();tests++;console.log('OK fehlende aktive Konfiguration bleibt durch Marker verriegelt');
    await fs.writeFile(service.file,'broken');const broken=new MeshCoordinator(adapter,{directory:dir,systemSecret:'test-system-key-only'});await broken.init();assert.equal(broken.currentLimits().state,'LOCKED');assert.equal(broken.currentLimits().limits.importW,0);broken.stop();tests++;console.log('OK beschädigte persistierte Konfiguration verriegelt');
  } finally {clients.forEach(sc=>sc.stop());service.stop();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
  console.log(`Mesh coordinator: ${tests} Prüfgruppen bestanden.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
