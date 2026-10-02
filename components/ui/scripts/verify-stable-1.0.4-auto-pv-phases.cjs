#!/usr/bin/env node
'use strict';
// Regression: Auto PV attribution and the real runtime -> TS phase contract.
const assert = require('node:assert/strict');
const { buildPvSurplusAllocation, buildAutoPvPriorityReservation } = require('../ems/services/pv-surplus-allocation');
const { ChargingManagementModule, computePendingPvStartIntentW, computeEvcsPvBudgetReservationW } = require('../ems/modules/charging-management');
const { makeBudgetRuntime, computePvBudgetFlowRawW } = require('../ems/modules/core-limits');
const { buildChargingPhaseSelectionPlan } = require('../lib/ts-mirrors/ems/charging-management/charging-phase-selection');
const { buildChargingAllocationShadowPlan } = require('../lib/ts-mirrors/ems/charging-management/charging-allocation');
const { buildChargingSetpointWritePlan } = require('../lib/ts-mirrors/ems/charging-management/charging-write-plan');
const adapter = { config: {}, log: { debug(){}, info(){}, warn(){}, error(){} }, async setStateAsync(){}, updateValue(){} };
const mod = new ChargingManagementModule(adapter, null);
const base = {
  safe: 'wb1', key: 'wb1', name: 'Phase test', ch: 'chargingManagement.wallboxes.wb1',
  online: true, enabled: true, controlAvailable: true, vehiclePlugged: true,
  vehicleDemandConfirmed: true, vehicleStartEligible: true, vehicleStartProbeActive: false,
  userMode: 'auto', effectiveMode: 'normal', chargerType: 'AC', controlBasis: 'currentA',
  phases: 3, configuredPhaseCount: 3, currentPhaseCount: 3, allocationPhaseCount: 3, phaseMode: 'fixed-3p',
  minA: 6, maxA: 16, minPW: 4140, maxPW: 11040, voltageV: 230, stepA: 0.1,
  setAKey: 'cm.wb.wb1.setA', actualPowerW: 0, meterStale: false, charging: false,
};
let scenarios = 0;
function pipeline({ wb = base, pvW = 5000, priority = 'emobility', share = 50, targetW = 11040, phasePlan, others = {} } = {}) {
  const allocation = buildPvSurplusAllocation(pvW, priority, share, { storageEligible: true, storageMaxChargeW: 30000 });
  const mapped = mod._mapChargingWallboxesForTsAllocation([wb]);
  const finalPlan = buildChargingAllocationShadowPlan({
    budgetW: 22000, pvPureAvailableW: allocation.evcsCapW, pvPhysicalAvailableW: pvW,
    pvAvailableW: pvW, pvAvailable: true, phasePlan, wallboxes: mapped,
    allocations: [{ safe: wb.safe, effectiveMode: wb.effectiveMode, targetW }],
  });
  const state = { normalSourceDecision: { apply: { wallboxes: finalPlan.wallboxes } } };
  const metrics = mod._buildChargingFinalAllocationMetrics(state, [wb]);
  const auto = mod._buildAutoPvPriorityMetrics(state, [wb], {
    priorityCapW: allocation.evcsCapW, physicalCapW: pvW,
    otherPriorityReservedW: metrics.purePvIntentW + (others.priority || 0),
    otherPhysicalReservedW: Math.max(metrics.pvIntentW, metrics.pvReserveW) + (others.physical || 0),
  });
  const runtime = makeBudgetRuntime(adapter, {
    ts: Date.now(), raw: {}, gates: { total: { effectiveW: 22000 }, pv: { rawW: pvW, effectiveW: pvW }, pvAllocation: allocation },
  });
  const claim = computeEvcsPvBudgetReservationW({
    reserveW: metrics.reserveW, demandW: metrics.reserveW,
    actualPvW: metrics.pvReserveW + auto.reservedW,
    intentPvW: metrics.pvIntentW + auto.reservedW, allocationCapW: pvW,
  });
  runtime.reserve({ key: 'evcs', reserveW: metrics.reserveW, pvReserveW: claim, requestedW: metrics.reserveW });
  scenarios++;
  return { finalPlan, metrics, auto, claim, storageW: runtime.getPvGrant({ key: 'storage', requestedW: 30000, pvOnly: true }).grantW };
}
// Auto may complete an explicitly grid-authorised charge without a PV-only cap.
for (const [priority, pvW, share, wantedPv] of [
  ['emobility', 5000, 50, 5000], ['both', 10000, 50, 5000], ['storage', 5000, 50, 0], ['emobility', 0, 50, 0],
]) {
  const result = pipeline({ priority, pvW, share });
  assert.equal(result.finalPlan.wallboxes[0].targetPowerW, 11040, 'PV attribution must not change the Auto target');
  assert.equal(result.auto.reservedW, wantedPv);
  assert.equal(result.storageW, pvW - wantedPv);
}
// PV-driven Auto uses the existing PV allocator, never a grid top-up.
for (const phases of [1, 3]) {
  const minimum = phases * 230 * 6;
  const wb = { ...base, effectiveMode: 'pv', phases, currentPhaseCount: phases, allocationPhaseCount: phases,
    phaseMode: phases === 1 ? 'fixed-1p' : 'fixed-3p', minPW: minimum, maxPW: phases * 230 * 16 };
  const below = pipeline({ wb, pvW: minimum - 1, targetW: 11040 });
  assert.equal(below.finalPlan.wallboxes[0].targetPowerW, 0);
  assert.equal(below.claim, 0);
  assert.equal(below.storageW, minimum - 1);
  const above = pipeline({ wb, pvW: minimum + 250, targetW: 11040 });
  assert(above.finalPlan.wallboxes[0].targetPowerW >= minimum);
  assert(above.claim <= minimum + 250);
  assert.equal(above.storageW + above.claim, minimum + 250);
}
// Do not reserve a partial 3-phase start at 50% of 5.3kW, or with a cap below minimum.
for (const [pvRemainingW, maxPowerW] of [[2650, 11040], [6000, 3000]]) {
  const pending = computePendingPvStartIntentW({ mode: 'pv', enabled: true, online: true, connected: true,
    controlBasis: 'currentA', status: 'SuspendedEVSE', minPowerW: 4140, technicalMinW: 4140,
    maxPowerW, totalRemainingW: 22000, stationRemainingW: 22000, pvRemainingW });
  assert.equal(pending.intentW, 0);
  scenarios++;
}
// Device-specific higher current minimum, not a global hardcoded 4.2kW.
const highMin = pipeline({ wb: { ...base, effectiveMode: 'pv', minA: 10, minPW: 6900 }, pvW: 5000 });
assert.equal(highMin.finalPlan.wallboxes[0].targetPowerW, 0);
assert.equal(highMin.storageW, 5000);
// DC is power-based; no AC phases or an AC 6A default may be inferred.
const dc = pipeline({ wb: { ...base, effectiveMode: 'pv', chargerType: 'DC', controlBasis: 'powerW',
  minPW: 2500, maxPW: 20000, stepW: 100, setWKey: 'cm.wb.dc.setW', setAKey: '', minA: 0, maxA: 0 }, pvW: 2400 });
assert.equal(dc.storageW, 2400);
for (const change of [{ vehicleDemandConfirmed: false, vehiclePlugged: false }, { online: false }, { enabled: false }]) {
  const idle = pipeline({ wb: { ...base, ...change } });
  assert.equal(idle.auto.reservedW, 0);
  assert.equal(idle.storageW, 5000);
}
// Fresh actual power remains accounted for without double-counting the command.
const active = pipeline({ wb: { ...base, actualPowerW: 7000, charging: true }, pvW: 9000, targetW: 6000 });
assert.equal(active.auto.reservedW, 7000);
assert.equal(active.storageW, 2000);
// Multiple Auto points share one cap, and existing pure PV / Min+PV consumption is subtracted.
const point = { safe:'a', userMode:'auto', effectiveMode:'normal', enabled:true, online:true,
  demandConfirmed:true, startProbeActive:false, actualFresh:true, actualW:0, finalTargetW:11040,
  technicalMinimumW:4140, phaseTransition:false };
let multi = buildAutoPvPriorityReservation({ points:[point,{...point,safe:'b'}], priorityCapW:5000, physicalCapW:10000,
  otherPriorityReservedW:2000, otherPhysicalReservedW:6000 });
assert.equal(multi.reservedW,3000);
assert.equal(multi.rows[1].reservedW,0);
assert.equal(buildAutoPvPriorityReservation({ points:[{...point,actualFresh:false,actualW:7000,finalTargetW:0}],
  priorityCapW:10000,physicalCapW:10000,otherPriorityReservedW:0,otherPhysicalReservedW:0 }).reservedW,0);
scenarios += 2;
// NVP reconstruction does not manufacture PV from a grid-supplied Auto charge.
assert.equal(computePvBudgetFlowRawW({gridW:11040,flexUsedW:11040,storageChargeW:0,storageDischargeW:0}),0);
assert.equal(computePvBudgetFlowRawW({gridW:6040,flexUsedW:11040,storageChargeW:0,storageDischargeW:0}),5000);
assert.equal(computePvBudgetFlowRawW({gridW:0,flexUsedW:0,storageChargeW:5000,storageDischargeW:0}),5000,
  'PV used by storage must remain visible as potential for the next Auto start');
scenarios += 3;
// Verify the runtime bridge itself, including custom vendor encodings and retained timers.
const now=1_000_000;
const phaseWb={...base,effectiveMode:'pv',phases:3,currentPhaseCount:3,phaseMode:'auto-pv',
  phaseSwitchKey:'cm.wb.wb1.phaseSet',phaseSwitchValue1p:'ONE_PHASE',phaseSwitchValue3p:'THREE_PHASES',
  phaseSwitchUpThresholdW:5100,phaseSwitchDownThresholdW:3300,phaseSwitchUpStableMs:77000,
  phaseSwitchDownStableMs:55000,phaseSwitchCooldownMs:444000,phaseSwitchSettleMs:12000,
  phaseSwitchSafePowerW:80,highSinceMs:0,lowSinceMs:now-56000,cooldownUntilMs:0,settleUntilMs:0,
  stopBeforePhaseSwitch:true};
const mapped=mod._mapChargingWallboxesForTsAllocation([phaseWb])[0];
for(const [target,source] of Object.entries({switchUpThresholdW:'phaseSwitchUpThresholdW',switchDownThresholdW:'phaseSwitchDownThresholdW',
  switchUpStableMs:'phaseSwitchUpStableMs',switchDownStableMs:'phaseSwitchDownStableMs',switchCooldownMs:'phaseSwitchCooldownMs',
  switchSettleMs:'phaseSwitchSettleMs',switchSafePowerW:'phaseSwitchSafePowerW',lowSinceMs:'lowSinceMs',highSinceMs:'highSinceMs',
  cooldownUntilMs:'cooldownUntilMs',settleUntilMs:'settleUntilMs',phaseSwitchValue1p:'phaseSwitchValue1p',phaseSwitchValue3p:'phaseSwitchValue3p'}))
  assert.equal(mapped[target],phaseWb[source],`Runtime bridge lost ${source}`);
const down=buildChargingPhaseSelectionPlan({now,pvPureAvailableW:2000,stablePvPureAvailableW:2000,wallboxes:[mapped]});
assert.equal(down.wallboxes[0].targetPhaseCount,1);
assert.equal(down.wallboxes[0].allocationPhaseCount,3,'Use present phases until the switch is complete');
assert.equal(down.wallboxes[0].phaseSwitchValue,'ONE_PHASE');
const switchWait=pipeline({wb:phaseWb,pvW:2000,targetW:6000,phasePlan:down});
assert.equal(switchWait.finalPlan.wallboxes[0].targetPowerW,0);
assert.equal(switchWait.storageW,2000);
const writes=buildChargingSetpointWritePlan({allocationPlan:switchWait.finalPlan});
assert(writes.entries.some(e=>e.type==='phaseSwitch'&&e.targetValue==='ONE_PHASE'));
assert(writes.entries.some(e=>e.type==='setpoint'&&e.targetValue===0));
// Never shortcut the stop when actual charging is present.
const runningDown=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:2000,wallboxes:[{...mapped,charging:true,actualPowerW:4500}]});
assert.equal(runningDown.wallboxes[0].switchCommandAllowed,false);
assert.equal(runningDown.wallboxes[0].safetyStopRequired,true);
// Settling must hold 0 after feedback; cooldown alone must permit 1p charging.
for(const [settleUntilMs,mustStop] of [[now+11000,true],[now-1,false]]) {
  const after={...phaseWb,phases:1,currentPhaseCount:1,allocationPhaseCount:1,minPW:1380,maxPW:3680,
    cooldownUntilMs:now+400000,settleUntilMs};
  const phase=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:2000,
    wallboxes:mod._mapChargingWallboxesForTsAllocation([after])});
  const result=pipeline({wb:after,pvW:2000,targetW:2000,phasePlan:phase});
  assert.equal(result.finalPlan.wallboxes[0].targetPowerW===0,mustStop);
  if(mustStop)assert.equal(result.storageW,2000);
}
// Missing capability or stale measurements never permits a fictional transition.
const missing=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:2000,wallboxes:[{...mapped,phaseSwitchKey:'',supportsPhaseSwitch:false}]});
assert.equal(missing.wallboxes[0].switchCommandAllowed,false);
assert.equal(missing.wallboxes[0].allocationPhaseCount,3);
const high=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:6000,staleMeter:true,
  wallboxes:[{...mapped,currentPhaseCount:1,highSinceMs:now-100000}]});
assert.equal(high.wallboxes[0].targetPhaseCount,1);
const highMinimum=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:6000,
  wallboxes:[{...mapped,currentPhaseCount:1,minA:10,highSinceMs:now-100000}]});
assert.equal(highMinimum.wallboxes[0].targetPhaseCount,1,'3p upshift requires the configured 3p minimum');
const steppedMinimum=buildChargingPhaseSelectionPlan({now,stablePvPureAvailableW:4700,
  wallboxes:[{...mapped,currentPhaseCount:1,minA:6.1,stepA:1,switchUpThresholdW:4400,highSinceMs:now-100000}]});
assert.equal(steppedMinimum.wallboxes[0].minPower3pW,4830);
assert.equal(steppedMinimum.wallboxes[0].targetPhaseCount,1,'upshift minimum must honor whole-amp steps');
scenarios++;
// Used fleet capacity is not zero available capacity for the running Auto session.
const gridAuto=buildChargingPhaseSelectionPlan({now,budgetW:9000,remainingW:0,
  wallboxes:[{...mapped,effectiveMode:'normal',currentPhaseCount:3,lowSinceMs:now-100000}]});
assert.equal(gridAuto.wallboxes[0].targetPhaseCount,3);
scenarios += 5;
async function realTicks() {
  const { makeHarness } = require('./verify-rc60-universal-auto-wallbox');
  const installBudget = (h, pvW) => {
    h.adapter._emsBudget = makeBudgetRuntime(h.adapter, { ts: Date.now(), raw: {}, gates: {
      total: { effectiveW: 22000 }, pv: { rawW: pvW, effectiveW: pvW },
      pvAllocation: buildPvSurplusAllocation(pvW, 'emobility', 100, {storageEligible:true,storageMaxChargeW:30000}),
    }});
  };
  const restoreFinalPlan = h => {
    // Exercise the REAL final allocation, phase selection and executor, not the
    // legacy-only stubs used by the original RC60 input-normalisation tests.
    delete h.module._publishChargingAllocationTsShadow;
    delete h.module._publishChargingPhaseSelectionRuntimeStates;
    delete h.module._publishChargingStationDiagnosticsFromAllocationPlan;
  };
  for (const [gridAllowed, phases, pvW] of [[false,3,2000],[false,1,2000],[true,3,5000]]) {
    const h=makeHarness({gridAllowed,pvW,netW:-pvW,wallbox:{phases,phaseMode:phases===1?'fixed-1p':'fixed-3p'}});
    try {
      restoreFinalPlan(h);installBudget(h,pvW);
      const out=await h.tick();
      const claim=h.adapter._emsBudget.consumers.evcs?.pvReserveW || 0;
      assert(out.targetPowerW === 0 || out.targetPowerW >= phases*230*6);
      if (!gridAllowed && phases===3) {
        assert.equal(out.targetPowerW,0);assert.equal(claim,0);
        assert.equal(h.adapter._emsBudget.remainingPvW,pvW);
      } else {
        assert(out.targetPowerW>0, JSON.stringify(out));
        assert(claim>0 && claim<=pvW, 'real final Auto/PV plan must reserve only the PV share');
      }
      scenarios++;
    } finally { h.stop(); }
  }
  // The raw 6.1 A minimum is below 4.5 kW, but the actual 1 A
  // command step needs 7 A / 4.83 kW. No phantom pending reservation.
  const stepped=makeHarness({gridAllowed:false,pvW:4500,netW:-4500,
    wallbox:{phases:3,phaseMode:'fixed-3p',minA:6.1,stepA:1}});
  try {
    restoreFinalPlan(stepped);installBudget(stepped,4500);
    const out=await stepped.tick();
    assert.equal(out.targetPowerW,0);
    assert.equal(stepped.adapter._emsBudget.consumers.evcs?.pvReserveW || 0,0);
    assert.equal(stepped.adapter._emsBudget.remainingPvW,4500);
    scenarios++;
  } finally { stepped.stop(); }
  const h=makeHarness({gridAllowed:false,pvW:2000,netW:-2000,wallbox:{
    phases:3,phaseMode:'auto-pv',phaseSwitchId:'test.wallbox.phase',phaseSwitchValue1p:1,phaseSwitchValue3p:3,
    phaseSwitchDownThresholdW:3000,phaseSwitchDownStableSec:1,phaseSwitchCooldownSec:120,phaseSwitchSettleSec:5,
  }});
  try {
    restoreFinalPlan(h);installBudget(h,2000);
    h.module._chargingPhaseLowSinceMs.set('lp1',Date.now()-10000);
    let out=await h.tick();
    assert.equal(out.targetPowerW,0,'phase switch must stop the actual executor');
    assert.equal(h.adapter._emsBudget.consumers.evcs?.pvReserveW || 0,0);
    assert(h.writes.some(w=>w.key==='cm.wb.lp1.phaseSet'&&w.value===1),'real runtime must write configured phase DP');
    installBudget(h,2000);out=await h.tick();
    assert.equal(out.targetPowerW,0,'settling must hold zero in the actual executor');
    assert.equal(h.adapter._emsBudget.consumers.evcs?.pvReserveW || 0,0);
    h.module._chargingPhaseSettleUntilMs.set('lp1',Date.now()-1);
    installBudget(h,2000);out=await h.tick();
    assert(out.targetPowerW>=1380 && out.targetPowerW<=2000,'after switch+settle 1p start must be possible despite cooldown');
    scenarios+=3;
  } finally { h.stop(); }
  console.log(`[stable-1.0.4-auto-pv-phases] OK: ${scenarios} scenario groups, including real full ticks and phase executor; Auto PV share, storage remainder and phase minimums verified.`);
}
realTicks().catch(error=>{console.error(error.stack || error);process.exitCode=1;});
