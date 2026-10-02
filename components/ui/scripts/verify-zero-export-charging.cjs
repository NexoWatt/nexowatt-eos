#!/usr/bin/env node
'use strict';

/**
 * 0-Einspeise-Integration der Ladepunkte: Exklusive Suchleistung darf weder
 * PV-Budget vortäuschen noch Geräte-/Stations-/Phasenschutz umgehen.
 * Die reinen TS-Entscheider werden direkt transpiliert; keine Hardware-Schreibzugriffe.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  return module.exports;
}
const { buildChargingAllocationShadowPlan } = load('src-ts/ems/charging-management/charging-allocation.ts');
const { buildChargingPhaseSelectionPlan } = load('src-ts/ems/charging-management/charging-phase-selection.ts');
const now = 1000000;
const point = {
  safe: 'one', enabled: true, online: true, vehiclePlugged: true,
  vehicleDemandConfirmed: true, vehicleStartEligible: true,
  effectiveMode: 'pv', chargerType: 'AC', controlBasis: 'current',
  phases: 1, currentPhaseCount: 1, phaseMode: 'fixed-1p', voltageV: 230,
  minA: 6, maxA: 16, minPowerW: 1380, maxPowerW: 3680, stepA: 1,
  actualPowerW: 0, setAKey: 'point.current', targetPowerW: 1380,
  zeroExportProbeExtraW: 1380, zeroExportProbeValidUntil: now + 3000,
};
function allocate(wallboxes, extra = {}) {
  return buildChargingAllocationShadowPlan({
    ts: now, budgetW: 10000, pvPhysicalAvailableW: 0, pvPureAvailableW: 0,
    preferTsNativeAllocation: false, allowJsComparisonFallback: false,
    wallboxes, ...extra,
  }).wallboxes;
}
let result = allocate([point, { ...point, safe: 'two', zeroExportProbeExtraW: 0 }]);
assert.equal(result[0].targetPowerW, 1380);
assert.equal(result[0].pvUsedW, 0, 'Suchleistung ist kein PV-Verbrauchsgrant');
assert.equal(result[1].targetPowerW, 0, 'Zweiter Ladepunkt bekommt keine Suchleistung');
for (const change of [{ zeroExportProbeValidUntil: now }, { staleAny: true }, { enabled: false }, { online: false }, { vehicleDemandConfirmed: false, vehicleStartEligible: false }, { maxPowerW: 1000 }]) {
  assert.equal(allocate([{ ...point, ...change }])[0].targetPowerW, 0, JSON.stringify(change));
}
for (const limits of [{ budgetW: 1000 }, { staleMeter: true }, { staleBudget: true }, { safetyStop: true }, { pausedByPeakShaving: true }]) {
  assert.equal(allocate([point], limits)[0].targetPowerW, 0, JSON.stringify(limits));
}
assert.equal(allocate([{ ...point, stationKey: 'shared', stationMaxPowerW: 1000 }])[0].targetPowerW, 0);
assert.equal(allocate([{ ...point, minA: 6.1, minPowerW: 1403 }])[0].targetPowerW, 0, '6,1 A bei 1-A-Schritten benötigen mindestens 7 A');
const dc = { ...point, chargerType: 'DC', controlBasis: 'power', setAKey: '', setWKey: 'dc.power', minPowerW: 3000, maxPowerW: 20000, targetPowerW: 3000, zeroExportProbeExtraW: 3000, stepW: 100 };
assert.equal(allocate([dc])[0].targetPowerW, 3000);
assert.equal(allocate([{ ...dc, minPowerW: 4500, targetPowerW: 4500, zeroExportProbeExtraW: 4200 }])[0].targetPowerW, 0, 'DC-Minimum darf erteilte Freigabe nicht umgehen');
// Reale PV und zusätzliche Suchlast bleiben getrennt, während das Gesamtbudget beide zählt.
result = allocate([{ ...point, targetPowerW: 2300, zeroExportProbeExtraW: 920 }], { pvPhysicalAvailableW: 1380, pvPureAvailableW: 1380 });
assert.equal(result[0].targetPowerW, 2300);
assert.equal(result[0].pvUsedW, 1380);
const phasePoint = { ...point, phaseMode: 'auto-pv', phaseSwitchKey: 'phase', supportsPhaseSwitch: true, zeroExportPhaseProbe: true, charging: true, actualPowerW: 3680 };
function phases(wb, extra = {}) { return buildChargingPhaseSelectionPlan({ now, pvPhysicalAvailableW: 0, pvPureAvailableW: 0, wallboxes: [wb], ...extra }); }
let phase = phases(phasePoint);
assert.equal(phase.wallboxes[0].targetPhaseCount, 3);
assert.equal(phase.wallboxes[0].safetyStopRequired, true);
assert.equal(phase.wallboxes[0].switchCommandAllowed, false, 'Kein Umschalten unter Last');
assert.equal(allocate([phasePoint], { phasePlan: phase })[0].targetPowerW, 0);
phase = phases({ ...phasePoint, actualPowerW: 0, charging: false });
assert.equal(phase.wallboxes[0].switchCommandAllowed, true);
assert.equal(allocate([phasePoint], { phasePlan: phase })[0].targetPowerW, 0, 'Umschaltzyklus bleibt Null');
phase = phases({ ...phasePoint, currentPhaseCount: 3, phases: 3, settleUntilMs: now + 10000 });
assert.equal(phase.wallboxes[0].safetyStopRequired, true);
assert.equal(allocate([phasePoint], { phasePlan: phase })[0].targetPowerW, 0, 'Einschwingzeit bleibt Null');
for (const change of [{ cooldownUntilMs: now + 10000 }, { zeroExportProbeValidUntil: now }, { zeroExportPhaseProbe: false }]) {
  assert.equal(phases({ ...phasePoint, ...change }).wallboxes[0].targetPhaseCount, 1);
}
assert.equal(phases(phasePoint, { staleMeter: true }).wallboxes[0].targetPhaseCount, 1);
assert.equal(phases({ ...phasePoint, chargerType: 'DC' }).wallboxes[0].switchRequired, false);
console.log('[zero-export-charging] OK: AC/DC minima, exclusive lease, PV accounting, limits, expiry and safe phase transitions');

// Reale Regelticks mit dem bestehenden Hersteller-/ioBroker-Harness und den
// aktuellen kanonischen Quellen. Compilierung bleibt nur im Prozessspeicher.
async function runtimeTicks() {
  const Module = require('node:module');
  const loaded = [];
  function install(sourceFile, runtimeFile) {
    const filename = path.join(root, runtimeFile);
    const source = fs.readFileSync(path.join(root, sourceFile), 'utf8');
    const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.push([filename, require.cache[filename]]); require.cache[filename] = mod;
    mod._compile(js, filename); return mod.exports;
  }
  const coordinator = load('src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts');
  const originalLoad = Module._load;
  Module._load = function(request, parent, main) {
    if (String(request).endsWith('/zero-export-pv-coordinator')) return coordinator;
    return originalLoad.call(this, request, parent, main);
  };
  const previousNow = Date.now; let clock = 2000000000000; Date.now = () => clock;
  try {
    install('src-ts/ems/charging-management/charging-phase-selection.ts','lib/ts-mirrors/ems/charging-management/charging-phase-selection.js');
    install('src-ts/ems/charging-management/charging-allocation.ts','lib/ts-mirrors/ems/charging-management/charging-allocation.js');
    install('src-ts/runtime-executables/ems/modules/charging-management.ts','ems/modules/charging-management.js');
    const filename = path.join(root, 'scripts/verify-rc60-universal-auto-wallbox.js');
    const source = fs.readFileSync(filename, 'utf8');
    const fixture = new Module(filename, module); fixture.filename = filename; fixture.paths = Module._nodeModulePaths(path.dirname(filename));
    fixture._compile(source.slice(0, source.indexOf('async function withHarness')) + '\nmodule.exports = {makeHarness};', filename);
    const h = fixture.exports.makeHarness({userMode:'pv', pvW:0, netW:0, totalBudgetW:11000, wallbox:{phases:1,phaseMode:'fixed-1p'}});
    try {
      h.adapter.config.gridConstraints = {zeroExportEnabled:true};
      delete h.module._publishChargingAllocationTsShadow;
      delete h.module._publishChargingPhaseSelectionRuntimeStates;
      delete h.module._publishChargingStationDiagnosticsFromAllocationPlan;
      let livePvW=2000,liveGridW=0;
      const sample = () => {
        h.setObject('test.wallbox.powerW', h.objectValues.get('test.wallbox.powerW'), clock);
        h.adapter._emsBudget.ts = clock; h.adapter._nvpFreshnessSnapshot.ts = clock;
        coordinator.updateZeroExportProbe(h.adapter,{now:clock,gridW:liveGridW,gridFresh:true,pvW:livePvW,pvFresh:true,
          storageFresh:true,storageDischargeW:0,safetyReady:true,externalBlocked:false,tariffCurtail:false});
      };
      sample(); assert.equal((await h.tick()).targetPowerW,0,'Erster Tick sammelt Nachfrage');
      clock += 1000; sample(); const started = await h.tick();
      assert.equal(started.targetPowerW,1380,JSON.stringify(started));
      assert(h.writes.some(w=>w.key==='cm.wb.lp1.setA' && w.value===6),'Realer Executor schreibt technischen Mindeststrom');
      h.setObject('test.wallbox.powerW',1380); h.setObject('test.wallbox.status','Charging');
      livePvW=3300; liveGridW=80;
      // Zunächst bleibt die Prüflast außerhalb des zentralen PV-Budgets.
      for(let i=0;i<4;i++){clock+=1000;sample();assert.equal((await h.tick()).targetPowerW,1380);}
      h.adapter._emsBudget.gates.pv={effectiveW:1300,rawW:1300};
      h.adapter._emsBudget.gates.pvAllocation={totalW:1300,evcsCapW:1300,mode:'evcs',evcsSharePct:100};
      h.adapter._emsBudget.remainingPvW=1300;
      clock+=1000;sample(); const confirmed=await h.tick();
      assert.equal(confirmed.targetPowerW,1380,JSON.stringify({confirmed,zero:h.adapter._zeroExportPvCoordinator.snapshot()}));
      assert.equal(h.adapter._zeroExportPvCoordinator.snapshot().operatingMarginW,80,'Nur der bestätigte 80-W-Nullabstand bleibt zusätzlich');
      // Ohne erneuten Probe-Lock bleibt die kleine bestätigte Betriebsmarge stabil.
      for(let i=0;i<4;i++){clock+=1000;sample();assert.equal((await h.tick()).targetPowerW,1380);}
      clock += 1000;
      h.adapter.config.gridConstraints.zeroExportEnabled=false;
      sample(); assert.equal((await h.tick()).targetPowerW,0,'Deaktivierung beendet Suchlast sofort');
      assert(h.writes.some(w=>w.key==='cm.wb.lp1.setA' && w.value===0));
    } finally {h.stop();}
    const hp = fixture.exports.makeHarness({userMode:'pv',pvW:3680,netW:0,totalBudgetW:11000,actualPowerW:3680,status:'Charging',wallbox:{
      phases:3,phaseMode:'auto-pv',phaseSwitchId:'test.phase',phaseFeedbackId:'test.phaseFeedback',
      phaseSwitchUpStableSec:1,phaseSwitchSettleSec:5,phaseSwitchCooldownSec:60,
    },objectValues:{'test.phaseFeedback':1}});
    try {
      hp.adapter.config.gridConstraints = {zeroExportEnabled:true};
      delete hp.module._publishChargingAllocationTsShadow;
      delete hp.module._publishChargingPhaseSelectionRuntimeStates;
      delete hp.module._publishChargingStationDiagnosticsFromAllocationPlan;
      hp.module._zeroExportPhaseAtMaxSince.set('lp1',clock-2000);
      const phaseSample = () => {
        hp.setObject('test.wallbox.powerW', hp.objectValues.get('test.wallbox.powerW'), clock);
        hp.adapter._emsBudget.ts=clock; hp.adapter._nvpFreshnessSnapshot.ts=clock;
        coordinator.updateZeroExportProbe(hp.adapter,{now:clock,gridW:0,gridFresh:true,pvW:5680,pvFresh:true,
          storageFresh:true,storageDischargeW:0,safetyReady:true,externalBlocked:false,tariffCurtail:false});
      };
      phaseSample(); await hp.tick(); clock+=1000; phaseSample();
      let out=await hp.tick();
      assert.equal(out.targetPowerW,0,'Zentraler 3p-Test fordert zuerst echten Stopp');
      assert(!hp.writes.some(w=>w.key==='cm.wb.lp1.phaseSet'),'Kein Phasenkommando solange Strom fließt');
      hp.setObject('test.wallbox.powerW',0); hp.setObject('test.wallbox.status','B2');
      for(let wait=0;wait<35 && !hp.writes.some(w=>w.key==='cm.wb.lp1.phaseSet');wait++){clock+=1000;phaseSample();out=await hp.tick();}
      assert(hp.writes.some(w=>w.key==='cm.wb.lp1.phaseSet' && w.value===3),JSON.stringify({targetW:out.targetPowerW,phase:hp.module._chargingPhaseSelectionTsLast?.wallboxes?.[0],zero:hp.adapter._zeroExportPvCoordinator.snapshot()}));
      assert.equal(out.targetPowerW,0);
      hp.setObject('test.phaseFeedback',3);
      clock+=1000; phaseSample(); assert.equal((await hp.tick()).targetPowerW,0,'Settle gilt auch bei3p-Rückmeldung');
      clock+=4000; phaseSample(); out=await hp.tick();
      assert(out.targetPowerW>=4140,JSON.stringify({targetW:out.targetPowerW,phase:hp.module._chargingPhaseSelectionTsLast?.wallboxes?.[0],zero:hp.adapter._zeroExportPvCoordinator.snapshot()}));
    } finally {hp.stop();}
    const revoked = fixture.exports.makeHarness({userMode:'pv',pvW:0,netW:0,wallbox:{phases:1,phaseMode:'fixed-1p'}});
    try {
      revoked.adapter.config.gridConstraints={zeroExportEnabled:true};
      delete revoked.module._publishChargingAllocationTsShadow;
      const sample=()=>{revoked.adapter._emsBudget.ts=clock;revoked.adapter._nvpFreshnessSnapshot.ts=clock;
        coordinator.updateZeroExportProbe(revoked.adapter,{now:clock,gridW:0,gridFresh:true,pvW:2000,pvFresh:true,
        storageFresh:true,storageDischargeW:0,safetyReady:true,externalBlocked:false,tariffCurtail:false});};
      sample();await revoked.tick();clock+=1000;sample();
      const execute=revoked.module._executeChargingTsSetpointPlan;
      revoked.module._executeChargingTsSetpointPlan=async function(...args){
        assert(revoked.adapter._zeroExportPvCoordinator.lease,'Plan besitzt zunächst gültige Lease');
        revoked.adapter._zeroExportPvCoordinator.revoke(clock,'test-revoked-between-plan-and-writer');
        return execute.apply(this,args);
      };
      assert.equal((await revoked.tick()).targetPowerW,0,'Widerruf zwischen Planung und Writer muss trotz noch gültiger Zeitfrist stoppen');
      assert(!revoked.writes.some(w=>w.key==='cm.wb.lp1.setA' && w.value>0));
    } finally {revoked.stop();}
    const aged = fixture.exports.makeHarness({userMode:'pv',pvW:0,netW:0,wallbox:{phases:1,phaseMode:'fixed-1p'}});
    try {
      aged.adapter.config.gridConstraints={zeroExportEnabled:true};
      aged.adapter.config.chargingManagement.wallboxMeterStaleTimeoutSec=15;
      delete aged.module._publishChargingAllocationTsShadow;
      let measurementAgeMs=6000;
      const originalAge=aged.dp.getAgeMs.bind(aged.dp);
      aged.dp.getAgeMs=key=>key==='cm.wb.lp1.pW'?0:originalAge(key); // frischer Heartbeat
      aged.dp.getMeasurementAgeMs=key=>key==='cm.wb.lp1.pW'?measurementAgeMs:originalAge(key);
      const sample=()=>{aged.adapter._emsBudget.ts=clock;aged.adapter._nvpFreshnessSnapshot.ts=clock;
        coordinator.updateZeroExportProbe(aged.adapter,{now:clock,gridW:0,gridFresh:true,pvW:2000,pvFresh:true,
        storageFresh:true,storageDischargeW:0,safetyReady:true,externalBlocked:false,tariffCurtail:false});};
      for(let i=0;i<2;i++){
        clock+=1000;sample();assert.equal((await aged.tick()).targetPowerW,0,'6s-alte Leistung darf trotz Heartbeat keine Prüflast starten');
        assert.equal(aged.localStates.get('chargingManagement.wallboxes.lp1.meterStale'),false,'Normale Protokoll-Frische bleibt unverändert');
      }
      assert(!aged.adapter._zeroExportPvCoordinator.lease);
      measurementAgeMs=0;clock+=1000;sample();await aged.tick();
      clock+=1000;sample();assert.equal((await aged.tick()).targetPowerW,1380,'Originalmessung0s erlaubt nach Arbitration den Mindeststart');
      measurementAgeMs=6000;clock+=1000;sample();assert.equal((await aged.tick()).targetPowerW,0,'Abgelaufene Originalmessung widerruft laufende Prüflast');
      assert(!aged.adapter._zeroExportPvCoordinator.lease);
    } finally {aged.stop();}
    console.log('[zero-export-charging] real runtime ticks and writes OK');
  } finally {
    Date.now = previousNow; Module._load = originalLoad;
    for (const [file, old] of loaded.reverse()) {if (old) require.cache[file]=old; else delete require.cache[file];}
  }
}
runtimeTicks().catch(error=>{console.error(error.stack || error);process.exitCode=1;});
