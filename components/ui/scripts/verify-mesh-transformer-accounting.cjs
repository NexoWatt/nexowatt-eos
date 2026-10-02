'use strict';
// 1.0.15: reale Zustandsmaschinen und dauerhafte Dateien, keine Feldgeräte/Live-Mails.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const C = require('../lib/mesh-coordinator-contract');
const appConfig = () => ({ emsApps: { apps: { meshMicrogrid: { installed: true, enabled: true } } } });
const { MeshMasterProtocol, MeshSlaveLease } = require('../lib/mesh-coordinator-protocol');
const { MeshCoordinator } = require('../lib/mesh-coordinator');
const { EnergyJournal, hash } = require('../lib/mesh-energy-journal');
const { defaults, validateAccounting } = require('../lib/mesh-energy-service');
const { transformerProposals } = require('../lib/mesh-transformer-allocation');
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log(`OK ${name}`); }
const budget = (w = 10000) => ({ importW: w, exportW: w, l1A: 32, l2A: 32, l3A: 32, evW: w, chargeW: w, dischargeW: w, pvW: w, flexW: w });
const sample = (w = 0, phase = 0) => ({ quality: 'ok', ageMs: 0, gridW: w, phaseA: [phase, phase, phase], controlledW: { ...C.ZERO }, devicesHealthy: true });
function config(count = 3) {
 const c = C.defaultConfig(); Object.assign(c, { role: 'master', mode: 'active', siteId: 'site', nodeId: 'master', masterId: 'master', intervalMs: 250, requestTimeoutMs: 200, leaseMs: 1500, staleMs: 1000, rampWPerSecond: 10000 });
 c.allocation.strategy = 'transformer'; c.nodes = Array.from({ length: count }, (_, i) => ({ id: `house_${i}`, name: `Haus ${i}`, weight: 1, max: budget(), fallback: { ...C.ZERO }, commissioned: true, watchdogVerified: true }));
 c.site.limit = { importW: count * 5000, exportW: count * 5000, l1A: count * 16, l2A: count * 16, l3A: count * 16 };
 return C.validateConfig(c);
}
const feedback = Object.fromEntries(['evW','chargeW','dischargeW','pvW','flexW'].map(k => [k, `test.${k}`]));
async function main() {
 await check('250-ms-Profil strikt validiert; Freigabe und Messwertalter passen zusammen', () => {
  assert.equal(config().intervalMs, 250); assert.throws(() => C.validateConfig({ ...config(), intervalMs: 100 }));
  const c = config(); c.allocation.releasePct = 95; assert.throws(() => C.validateConfig(c));
 });
 await check('Schnelle EMS-Ticks verschieben nicht die Messwertbestätigung desselben Befehls', () => {
  const service = new MeshCoordinator({config:appConfig()},{sample}); service.config = config();
  const lease = {valid:true,required:true,epoch:'test',commandSeq:5,limits:budget()};service.slave={current:()=>lease,fail(){}};
  const savedNow=Date.now;let t=1000;Date.now=()=>t;
  try {service.markApplied(lease);t=1250;service.markApplied(lease);assert.equal(service.applied.at,1000);lease.commandSeq=6;service.markApplied(lease);assert.equal(service.applied.at,1250);} finally {Date.now=savedNow;service.stop();}
 });
 await check('Bedarfsverteilung: freie Häuser lokal, belastete Häuser nutzen freie Anteile', () => {
  const c = config(); const rows = c.nodes.map((member, i) => ({ member, sample: sample(i === 0 ? 6000 : 100, i === 0 ? 10 : 1), target: budget(), lastChange: 0 }));
  const result = transformerProposals(c, rows, C.groupsOf(c), sample(6200, 12), false, 1000);
  assert.equal(result.controlMode, 'LOCAL_AUTONOMY'); assert.equal(result.proposals.get('house_0').importW, 7000); assert.equal(result.proposals.get('house_1').importW, 1100);
  assert.equal(result.proposals.get('house_0').evW, 10000, 'Gerätekategorien behalten lokale Maxima');
 });
 await check('Wartende AC/DC-Lader melden Bedarf vor Verbrauch; knappe Leistung wird nicht unter Mindestwerte zerteilt', () => {
  const c=config(2);c.rampWPerSecond=100000;c.site.limit={importW:30000,exportW:30000,l1A:60,l2A:60,l3A:60};c.nodes.forEach(n=>n.max=budget(50000));
  const audit={ts:Date.now(),controlActive:true,grid:{requestedW:30000},wallboxes:[{online:true,enabled:true,controlAvailable:true,connected:true,minimumPowerW:20000,phaseCount:3}]};
  const service=new MeshCoordinator({config:appConfig(),_nwChargingManagementAudit:{getSnapshot:()=>audit}});service.config={...c,localParticipates:true,local:c.nodes[0]};
  const demand=service.localDemand(sample());assert.equal(demand.minimumNetwork.importW,20000);assert.equal(demand.requestedNetwork.importW,30000);
  const rows=c.nodes.map(member=>({member,sample:{...sample(),...demand},target:budget(50000),lastChange:0}));
  const result=transformerProposals(c,rows,C.groupsOf(c),sample(),false,1000);const grants=[...result.proposals.values()].map(v=>v.importW);
  assert(grants.some(w=>w>=20000));assert(grants.some(w=>w===0));assert(grants.reduce((a,b)=>a+b,0)<=30000);
  audit.ts=Date.now()-11000;assert.deepEqual(service.localDemand(sample()),{});service.stop();
 });
 await check('Trafo-Hysterese, Export, Phase und Strang begrenzen unabhängig', () => {
  const c = config(); c.nodes[0].branch = 'b'; c.branches = [{ id:'b', limit:{importW:500,exportW:200,l1A:1,l2A:2,l3A:3}, reserve:{importW:0,exportW:0,l1A:0,l2A:0,l3A:0}, unmonitored:{importW:0,exportW:0,l1A:0,l2A:0,l3A:0} }];
  const rows = c.nodes.map(member => ({ member, sample: sample(-5000, 20), target: budget(), lastChange: 0 }));
  let result = transformerProposals(c, rows, C.groupsOf(c), sample(-14000, 40), false, 1000);
  assert.equal(result.intervention, true); assert(result.proposals.get('house_0').exportW <= 200); assert(result.proposals.get('house_0').l1A <= 1);
  assert([...result.proposals.values()].reduce((s, r) => s + r.exportW, 0) <= 13500);
  result = transformerProposals(c, rows, C.groupsOf(c), sample(12500, 30), true, 1000); assert(result.intervention);
  result = transformerProposals(c, rows, C.groupsOf(c), sample(1000, 3), true, 1000); assert(!result.intervention);
 });
 await check('99 Slaves: kurze Takte, 750-ms-Anwendung, keine Befehlsjagd; Ausfall bleibt reserviert', () => {
  let clock = 0; const c = config(99); const master = new MeshMasterProtocol(c, () => clock);
  const slaves = c.nodes.map(local => new MeshSlaveLease(C.validateConfig({ ...c, role:'slave', nodeId:local.id, local, feedback, masterUrl:'http://127.0.0.1' }), () => clock));
  const received = slaves.map(() => []); slaves.forEach(s => s.acceptHello(master.hello(s.hello())));
  let normalRounds = 0;
  for (let round = 0; round < 65; round++) {
   for (let i = 0; i < slaves.length; i++) {
    const s = slaves[i]; const applied = received[i].filter(r => clock - r.at >= 750).at(-1)?.seq || 0;
    const cmd = master.exchange(s.request(sample(), applied, 1), sample()); s.accept(cmd);
    if (!received[i].some(r => r.seq === cmd.commandSeq)) received[i].push({ seq:cmd.commandSeq, at:clock });
   }
   if (master.state === 'NORMAL') {
    normalRounds++;
    for (const key of C.NETWORK_KEYS) assert([...master.records.values()].reduce((sum,r) => sum + r.reserved[key], 0) <= c.site.limit[key] + 1e-6);
   }
   clock += 250;
  }
  assert(normalRounds > 35, `Normalrunden ${normalRounds}`);
  const record = master.records.get('house_0'); const reserved = record.reserved.importW;
  clock += 1600; master.plan(sample()); assert.equal(master.state, 'SITE_DEGRADED'); assert.equal(record.reserved.importW, reserved);
  assert.equal(slaves[0].current().valid, false);
 });
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nw-mesh15-'));
 const adapter = { namespace:'test.0', config:appConfig(), getForeignStateAsync:async id => ({ val:id === 'meter.buy' ? 100 : 20, ts:Date.now(), q:0 }), emsEngine:{ requestImmediateTick(){} } };
 const master = new MeshCoordinator(adapter, { directory:path.join(dir,'master'), systemSecret:'test-system-only', sample });
 const slave = new MeshCoordinator(adapter, { directory:path.join(dir,'slave'), systemSecret:'test-system-only', sample });
 try {
  await master.init(); await slave.init(); master.config = config(1); master.resetProtocols();
  slave.config = C.validateConfig({ ...master.config, role:'slave', nodeId:'house_0', local:master.config.nodes[0], feedback, masterUrl:'http://127.0.0.1' }); slave.resetProtocols();
  const key = crypto.randomBytes(32).toString('base64url'); master.keys.house_0 = key; slave.slaveKey = key;
  master.accounting = { ...defaults(), enabled:true };
  slave.accounting = validateAccounting({ ...defaults(), enabled:true, meter:{id:'meter-123',epoch:'installation-1',importDp:'meter.buy',exportDp:'meter.sell',unit:'kWh',calibrated:true,calibrationUntil:'2099-12-31'} }, slave.config);
  let transferCalls = 0;
  slave.archiveTransport = async packet => { transferCalls++; master.energy.rate.clear(); return master.energy.receive(packet); };
  await check('Offline-Zähleroriginal persistiert; getrennte kumulative Register und Quellenzeiten', async () => {
   const record = await slave.energy.capture(); assert.equal(record.importMilliWh, 100000000); assert.equal(record.exportMilliWh, 20000000); assert.equal(record.quality, 'ok'); assert.equal(record.sourceAt.length, 2);
   const local = await slave.energy.journal('house_0', true); assert.equal(local.last.seq, 1); assert.equal(transferCalls, 0);
  });
  await check('Nachlieferung: ACK nach dauerhafter Speicherung; Kopie bleibt lokal; Neustartabgleich', async () => {
   await slave.energy.sync(); assert.equal(slave.energy.ack, 0); await slave.energy.sync(); assert.equal(slave.energy.ack, 1);
   const remote = await master.energy.journal('house_0'); const local = await slave.energy.journal('house_0', true);
   assert.equal(remote.last.hash, local.last.hash); assert(remote.last.receivedAt);
   const restored = new EnergyJournal(remote.directory); await restored.init(); assert.equal(restored.last.hash, local.last.hash); assert(restored.last.receivedAt);
   slave.energy.syncKnown = false; slave.energy.ack = 0; await slave.energy.sync(); assert.equal(slave.energy.ack, 1);
   assert.equal(local.last.seq, 1);
  });
  await check('Dubletten idempotent; geänderte Dublette, Lücke, falsches Haus und fremdes ACK abgewiesen', async () => {
   const j = await master.energy.journal('house_0'); const r = j.last; await j.append(r); assert.equal(j.last.seq, 1);
   const changed = { ...r, importMilliWh:r.importMilliWh + 1 }; changed.hash = hash(changed); await assert.rejects(j.append(changed), /duplicate/);
   const gap = { ...r, seq:3, previousHash:r.hash }; gap.hash = hash(gap); await assert.rejects(j.append(gap), /chain/);
   const oldTransport = slave.archiveTransport; slave.archiveTransport = async packet => C.sign({ schema:'nexowatt.mesh-energy.v1', siteId:'site',nodeId:'other',masterId:'master',requestId:packet.payload.requestId,sequence:1 }, key);
   await assert.rejects(slave.energy.sync(), /ack_invalid/); slave.archiveTransport = oldTransport;
  });
  await check('Zählerrücksprung über Lücke und Neustart gesperrt; neue Epoche startet getrennt', async () => {
   adapter.getForeignStateAsync = async () => null; await slave.energy.capture();
   adapter.getForeignStateAsync = async id => ({ val:id==='meter.buy'?1:0, ts:Date.now(),q:0 });
   let r = await slave.energy.capture(); assert.equal(r.quality, 'reset');
   const local = await slave.energy.journal('house_0', true); const restart = new EnergyJournal(local.directory); await restart.init(); assert(restart.counterFault);
   r = await slave.energy.capture(); assert.equal(r.quality, 'reset');
   slave.accounting.meter.epoch = 'installation-2';
   // monotone UTC in simulierten schnellen Testaufrufen
   const oldNow = Date.now; let t = oldNow() + 20; Date.now = () => t;
   try { r = await slave.energy.capture(); assert.equal(r.quality, 'ok'); } finally { Date.now = oldNow; }
  });
  await check('Archivfehler stoppt ACK, nicht die unabhängige Regelfunktion', async () => {
   const j = await master.energy.journal('house_0'); j.maxBytes = j.bytes;
   await assert.rejects(slave.energy.sync(), /capacity/); assert.equal(j.last.seq, 1); assert(master.energy.notificationEvent());
   const hello = new MeshSlaveLease(slave.config, () => 0).hello(); const reply = master.receive(C.sign(hello,key)); assert(C.verify(reply,key));
  });
  await check('Abrechnung: genaue Randstände, Centrechnung, Teilzeitraum, keine überbrückten Zählerwechsel', async () => {
   const c = config(1); const service = new MeshCoordinator(adapter, { directory:path.join(dir,'report'), systemSecret:'test-system-only' }); await service.init(); service.config = c; service.accounting = { ...defaults(), enabled:true };
   try {
    const j = await service.energy.journal('house_0'); const times = ['2026-01-01T00:00:00.000Z','2026-01-01T00:10:00.000Z','2026-01-01T00:20:00.000Z'];
    for (let i=0;i<3;i++) { const r = {schema:'nexowatt.mesh-energy.v1',stream:'a'.repeat(32),siteId:'site',nodeId:'house_0',seq:i+1,at:times[i],sourceAt:[Date.parse(times[i]),Date.parse(times[i])],meter:{...slave.accounting.meter,epoch:'one'},intervalMs:600000,quality:'ok',importMilliWh:100000000+i*1000000,exportMilliWh:20000000+i*500000,previousHash:j.last?.hash||''}; r.hash=hash(r);await j.append(r); }
    const q = {nodeId:'house_0',from:times[0],to:times[2],tariff:{importEuroKwh:0.3,exportEuroKwh:0.08,periodFeeEuro:2}};
    let report = await service.energy.report(q); assert.equal(report.status,'DRAFT');assert.equal(report.importKwh,2);assert.equal(report.exportKwh,1);assert.equal(report.amounts.balanceCents,252);
    const roundedFee = await service.energy.report({...q,tariff:{...q.tariff,periodFeeEuro:2.675}});assert.equal(roundedFee.amounts.periodFeeCents,268);
    report = await service.energy.report({...q,from:'2025-12-31T23:59:00.000Z'});assert.equal(report.status,'PARTIAL_PERIOD');assert.equal(report.amounts.periodFeeCents,0);assert(report.periodFeePending);
    const r={...j.last,seq:4,at:'2026-01-01T00:30:00.000Z',meter:{...j.last.meter,epoch:'two'},importMilliWh:0,exportMilliWh:0,previousHash:j.last.hash};r.hash=hash(r);await j.append(r);
    report=await service.energy.report({...q,to:r.at});assert.equal(report.status,'BLOCKED');assert.equal(report.amounts,null);
    await assert.rejects(service.energy.report({...q,nodeId:'unknown'}));
   } finally {service.stop();}
  });
  await check('Gerissene Datei wird erkannt und nicht automatisch repariert oder bestätigt', async () => {
   const folder=path.join(dir,'torn');await fs.mkdir(folder);await fs.writeFile(path.join(folder,'000000000000.jsonl'),'{"seq":1');
   const j=new EnergyJournal(folder);await assert.rejects(j.init(),/incomplete/);
  });
  await check('Betriebsvorgaben persistieren ohne Protokollneustart; technisch unzulässige Werte gesperrt', async () => {
   const epoch=master.master.epoch; master.config.allocation.strategy='fixed'; await master.setOperating({importW:3000,exportW:2000,strategy:'transformer'});assert.equal(master.config.allocation.strategy,'transformer');assert.equal(master.master.epoch,epoch);assert.equal(master.master.operatorLimits.importW,3000);
   await assert.rejects(master.setOperating({importW:100000,exportW:0}));
   const restored=new MeshCoordinator(adapter,{directory:master.directory,systemSecret:'test-system-only'});await restored.init();assert.equal(restored.operatorLimits.importW,3000);assert(restored.accounting.enabled);restored.stop();
  });
 } finally {master.stop();slave.stop();await fs.rm(dir,{recursive:true,force:true});}
 console.log(`Mesh transformer/accounting: ${checks} Prüfgruppen bestanden.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
