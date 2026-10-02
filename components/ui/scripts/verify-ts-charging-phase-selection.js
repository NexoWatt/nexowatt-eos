#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-charging-phase-selection.js
 * Zweck: Prüft die EVCS AC-1p/3p-Phasenautomatik für PV-Überschussladen.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(cond, msg) { if (!cond) { console.error('[ts-charging-phase-selection] ' + msg); process.exit(1); } }

const phaseSrc = read('src-ts/ems/charging-management/charging-phase-selection.ts');
const allocationSrc = read('src-ts/ems/charging-management/charging-allocation.ts');
const writeSrc = read('src-ts/ems/charging-management/charging-write-plan.ts');
const runtimeSrc = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const engineSrc = read('src-ts/runtime-executables/ems/engine.ts');
const uiSrc = read('src-ts/runtime-executables/www/ems-apps.ts');
const mainSrc = read('src-ts/runtime-executables/main.ts');
const runtimeJs = read('ems/modules/charging-management.js');
const engineJs = read('ems/engine.js');
const uiJs = read('www/ems-apps.js');

need(phaseSrc.includes('buildChargingPhaseSelectionPlan'), 'TS-Phasenwahl-Helfer fehlt.');
need(phaseSrc.includes('stable-pv-budget-upshift-to-3p'), '3p-Hochschaltgrund fehlt.');
need(phaseSrc.includes('stable-low-pv-budget-downshift-to-1p'), '1p-Runterschaltgrund fehlt.');
need(allocationSrc.includes('phasePlan?:'), 'Allocation-Input kennt phasePlan nicht.');
need(allocationSrc.includes('phaseSwitchCommandAllowed'), 'Allocation übernimmt Phasenumschaltfreigabe nicht.');
need(writeSrc.includes("type: 'phaseSwitch'"), 'Write-Plan kann keine Phasenumschalt-Aktion erzeugen.');
need(runtimeSrc.includes('requireChargingPhaseSelectionTsMirror'), 'Runtime lädt Phasenwahl-Spiegel nicht.');
need(runtimeSrc.includes('phaseSelectionJson'), 'Runtime veröffentlicht keine Phasenwahl-Diagnose.');
need(runtimeSrc.includes('phase-switch-applied'), 'Executor führt Phasenumschalt-Write-Plan nicht aus.');
need(runtimeJs.includes('requireChargingPhaseSelectionTsMirror'), 'Generiertes Runtime-JS ist nicht synchron.');
need(uiSrc.includes('AC-Phasenmodus') && uiSrc.includes('Auto PV 1p/3p'), 'App-Center enthält Phasenmodus nicht.');
need(uiJs.includes('AC-Phasenmodus') && uiJs.includes('Auto PV 1p/3p'), 'Generiertes App-Center-JS ist nicht synchron.');
need(mainSrc.includes('phaseSwitchId') && mainSrc.includes('phaseSwitchUpThresholdW'), 'Main-Settings-Sync übernimmt Phasenfelder nicht.');
for (const field of ['phaseMode', 'phaseSwitchId', 'phaseFeedbackId', 'phaseSwitchValue1p', 'phaseSwitchValue3p', 'stopBeforePhaseSwitch', 'phaseSwitchUpThresholdW', 'phaseSwitchDownThresholdW', 'phaseSwitchUpStableSec', 'phaseSwitchDownStableSec', 'phaseSwitchCooldownSec', 'phaseSwitchSettleSec', 'storageAssistCustomerAllowed']) {
  need(engineSrc.includes(field), `TS-Engine verliert AppCenter-Feld ${field}.`);
  need(engineJs.includes(field), `Generierte Engine verliert AppCenter-Feld ${field}.`);
}

// Ende-zu-Ende-Brücke main.evcsList -> EmsEngine._buildChargingConfig:
// Beliebige, manuell zugeordnete ioBroker-IDs müssen unverändert an das
// Charging-Management weitergegeben werden.
const { EmsEngine } = require(path.join(root, 'ems/engine'));
const bridgeEngine = new EmsEngine({
  config: { settingsConfig: { evcsMaxPowerKw: 22 }, datapoints: {} },
  evcsList: [{
    index: 1,
    enabled: true,
    name: 'freie Wallbox',
    setCurrentAId: 'custom.vendor.free.ctrl.current',
    setPowerWId: 'another.adapter.7.manual.power',
    enableWriteId: 'logic.0.wallbox.enable',
    phaseMode: 'auto-pv',
    phaseSwitchId: 'modbus.99.holding.phase.command',
    phaseFeedbackId: 'mqtt.0/site/wb/phaseFeedback',
    phaseSwitchValue1p: 'ONE_PHASE',
    phaseSwitchValue3p: 'THREE_PHASES',
    stopBeforePhaseSwitch: true,
    phaseSwitchUpThresholdW: 5100,
    phaseSwitchDownThresholdW: 3300,
    phaseSwitchUpStableSec: 77,
    phaseSwitchDownStableSec: 55,
    phaseSwitchCooldownSec: 444,
    phaseSwitchSettleSec: 12,
    storageAssistCustomerAllowed: true,
  }],
});
const bridgeCfg = bridgeEngine._buildChargingConfig();
need(bridgeCfg && bridgeCfg.chargingCfg && bridgeCfg.chargingCfg.wallboxes && bridgeCfg.chargingCfg.wallboxes.length === 1, 'Engine-Brücke erzeugt keinen Ladepunkt.');
const bridged = bridgeCfg.chargingCfg.wallboxes[0];
need(bridged.setCurrentAId === 'custom.vendor.free.ctrl.current', 'Freier Sollstrom-DP wird verändert/verloren.');
need(bridged.setPowerWId === 'another.adapter.7.manual.power', 'Freier Sollleistungs-DP wird verändert/verloren.');
need(bridged.enableId === 'logic.0.wallbox.enable', 'Freier Enable-DP wird verändert/verloren.');
need(bridged.phaseSwitchId === 'modbus.99.holding.phase.command', 'Freier Phasen-Schreib-DP wird verändert/verloren.');
need(bridged.phaseFeedbackId === 'mqtt.0/site/wb/phaseFeedback', 'Phasen-Feedback-DP wird verändert/verloren.');
need(bridged.phaseSwitchValue1p === 'ONE_PHASE' && bridged.phaseSwitchValue3p === 'THREE_PHASES', 'Herstellerspezifische Phasenwerte werden verändert/verloren.');
need(bridged.phaseSwitchUpThresholdW === 5100 && bridged.phaseSwitchDownThresholdW === 3300, 'Phasen-Schwellen werden nicht übernommen.');
need(bridged.storageAssistCustomerAllowed === true, 'Kundenfreigabe Speicher-Assist wird nicht übernommen.');

const phase = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-phase-selection'));
const alloc = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation'));
const write = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan'));

const now = 1_000_000;
const commonWb = {
  safe: 'wb1', name: 'Wallbox 1', enabled: true, online: true, chargerType: 'AC', phaseMode: 'auto-pv',
  phases: 3, currentPhaseCount: 1, phaseSwitchKey: 'cm.wb.wb1.phaseSet', phaseSwitchValue1p: 1, phaseSwitchValue3p: 3,
  minA: 6, maxA: 16, voltageV: 230, actualPowerW: 0, charging: false,
};
const up = phase.buildChargingPhaseSelectionPlan({ now, stablePvAvailableW: 5100, wallboxes: [{ ...commonWb, highSinceMs: now - 301000 }] });
need(up.ok === true, 'Hochschalt-Plan muss ok sein.');
need(up.wallboxes[0].targetPhaseCount === 3 && up.wallboxes[0].switchCommandAllowed === true, '1p→3p wird nicht sauber freigegeben.');

const down = phase.buildChargingPhaseSelectionPlan({ now, stablePvAvailableW: 2500, wallboxes: [{ ...commonWb, currentPhaseCount: 3, lowSinceMs: now - 121000 }] });
need(down.wallboxes[0].targetPhaseCount === 1 && down.wallboxes[0].switchDirection === '3p-to-1p', '3p→1p wird nicht entschieden.');

const stale = phase.buildChargingPhaseSelectionPlan({ now, stablePvAvailableW: 6000, staleMeter: true, wallboxes: [{ ...commonWb, highSinceMs: now - 999000 }] });
need(stale.wallboxes[0].targetPhaseCount === 1 && stale.wallboxes[0].switchRequired === false, 'Stale Meter darf nicht auf 3p hochschalten.');

// Die 80/20-Kundenpriorität darf nur reine PV-Ladepunkte bei der
// 1p/3p-Entscheidung begrenzen. Min+PV sieht den physikalischen PV-Rest,
// Auto/Boost das normale Gesamtbudget.
const splitPhaseInput = {
  now,
  pvPureAvailableW: 2000,
  pvPhysicalAvailableW: 6000,
  stablePvPureAvailableW: 2000,
  stablePvPhysicalAvailableW: 6000,
  budgetW: 9000,
  remainingW: 9000,
};
const purePhase = phase.buildChargingPhaseSelectionPlan({
  ...splitPhaseInput, wallboxes: [{ ...commonWb, effectiveMode: 'pv', highSinceMs: now - 301000 }],
});
need(purePhase.wallboxes[0].targetPhaseCount === 1, 'Reines PV-Laden ignoriert den priorisierten Pure-PV-Cap bei der Phasenwahl.');
const minPvPhase = phase.buildChargingPhaseSelectionPlan({
  ...splitPhaseInput, wallboxes: [{ ...commonWb, effectiveMode: 'minpv', highSinceMs: now - 301000 }],
});
need(minPvPhase.wallboxes[0].targetPhaseCount === 3, 'Min+PV wird bei der Phasenwahl fälschlich vom reinen PV-Prioritätscap begrenzt.');
const autoPhase = phase.buildChargingPhaseSelectionPlan({
  ...splitPhaseInput, wallboxes: [{ ...commonWb, effectiveMode: 'auto', highSinceMs: now - 301000 }],
});
need(autoPhase.wallboxes[0].targetPhaseCount === 3, 'Auto wird bei der Phasenwahl fälschlich vom PV-Prioritätscap begrenzt.');

const allocation = alloc.buildChargingAllocationShadowPlan({
  preferTsNativeAllocation: true, tsNormalSourceLock: true, budgetW: 5100, pvAvailableW: 5100, phasePlan: up,
  wallboxes: [{ ...commonWb, phases: 1, setAKey: 'cm.wb.wb1.setA', controlBasis: 'current', vehiclePlugged: true }],
});
need(allocation.wallboxes[0].phaseSwitchRequired === true, 'Allocation verliert Phasenumschalt-Plan.');
need(allocation.wallboxes[0].targetPowerW === 0 && allocation.wallboxes[0].writeRequired === true, 'Allocation muss vor Phasenwechsel sicheren 0-Setpoint planen.');

const wp = write.buildChargingSetpointWritePlan({ allocationPlan: allocation });
need(wp.entries.some(e => e.type === 'phaseSwitch' && e.basis === 'phase' && e.setpointKey === 'cm.wb.wb1.phaseSet'), 'Write-Plan erzeugt keine Phasenumschalt-Aktion.');
need(wp.entries.some(e => e.type === 'setpoint' && e.targetValue === 0), 'Write-Plan erzeugt keinen sicheren 0-Setpoint vor Phasenwechsel.');

console.log('[ts-charging-phase-selection] OK: EVCS AC-1p/3p-PV-Automatik ist in TS, Runtime, UI und Write-Plan verdrahtet.');
