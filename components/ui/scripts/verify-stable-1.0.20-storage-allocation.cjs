#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft getrennte Netz-/PV-/Speicheranteile im finalen Ladeplan und in der Phasenwahl.
 * Daten und Wirkung: Synthetische W/A/ms an produktiven TS-Spiegeln; keine Hardware-Schreibungen.
 * Bei Änderungen: Geschützte LP, entfallene Freigaben, Min+PV und noch fließende Istlast gemeinsam prüfen.
 */
const assert = require('node:assert/strict');
const { buildChargingAllocationShadowPlan: allocate } = require('../lib/ts-mirrors/ems/charging-management/charging-allocation');
const { buildChargingPhaseSelectionPlan: phases } = require('../lib/ts-mirrors/ems/charging-management/charging-phase-selection');
const now = Date.UTC(2026, 8, 24, 12);
const point = {
  safe: 'assist', enabled: true, online: true, vehiclePlugged: true, vehicleDemandConfirmed: true,
  userMode: 'boost', effectiveMode: 'boost', chargerType: 'DC', controlBasis: 'power',
  minPowerW: 2000, maxPowerW: 22000, stepW: 1, setWKey: 'assist.power',
  targetPowerW: 22000, actualPowerW: 0, zeroExportGridMaxW: 3700,
  zeroExportStorageCreditW: 1000, effectiveStorageAssist: true, batteryContributionW: 99999,
};
for (const preferTsNativeAllocation of [false, true]) {
  const plan = (points, pvW = 5000, extras = {}) => allocate({
    ts: now, budgetW: 50000, pvPhysicalAvailableW: pvW, pvPureAvailableW: pvW,
    preferTsNativeAllocation, wallboxes: points, ...extras,
  }).wallboxes;
  let result = plan([point])[0];
  assert.equal(result.targetPowerW, 9700);
  assert.equal(result.batteryContributionW, 1000);
  assert.equal(result.pvUsedW, 5000);
  assert.equal(plan([point], 0)[0].targetPowerW, 4700, 'Freigegebener Speicher kann Netz ohne PV ergänzen');
  result = plan([{ ...point, effectiveStorageAssist: false }])[0];
  assert.equal(result.targetPowerW, 8700);
  assert.equal(result.batteryContributionW, 0, 'Geschützter LP erhält keinen Speicheranteil');
  result = plan([{ ...point, effectiveMode: 'minpv', minPowerW: 4140, zeroExportStorageCreditW: 2000 }])[0];
  assert.equal(result.targetPowerW, 9140);
  assert.equal(result.batteryContributionW, 440, 'Min+PV ergänzt nur die fehlende Mindestbasis');
  assert.equal(result.pvUsedW, 5000);
  result = plan([{ ...point, effectiveMode: 'minpv', minPowerW: 4140, zeroExportStorageCreditW: 2000 }], 0)[0];
  assert.equal(result.targetPowerW, 4140);
  result = plan([{ ...point, effectiveMode: 'minpv' }])[0];
  assert.equal(result.targetPowerW, 7000);
  assert.equal(result.batteryContributionW, 0, 'Bereits vollständig erlaubte Mindestbasis braucht keinen Zusatzspeicher');
  result = plan([{ ...point, effectiveMode: 'pv' }])[0];
  assert.equal(result.targetPowerW, 5000);
  assert.equal(result.batteryContributionW, 0, 'Reiner PV-Modus bleibt ohne Speicherhilfe');
  assert.equal(result.pvUsedW, 5000);
  for (const zeroExportStorageCreditW of [0, -1, NaN, Infinity, true, false, undefined]) {
    result = plan([{ ...point, zeroExportStorageCreditW }])[0];
    assert.equal(result.targetPowerW, 8700, 'Entfallene/ungültige Speicherzusage erlaubt keine Mehrleistung');
    assert.equal(result.batteryContributionW, 0);
  }
  result = plan([{ ...point, zeroExportStorageCreditW: 1000.9 }])[0];
  assert.equal(result.batteryContributionW, 1000, 'Teilwatt-Zusage darf nicht aufgerundet werden');
  result = plan([point], 5000, { safetyStop: true })[0];
  assert.equal(result.targetPowerW, 0);
  assert.equal(result.batteryContributionW, 0);
  for (const extras of [{ staleMeter: true }, { staleBudget: true }]) {
    result = plan([point], 5000, extras)[0];
    assert.equal(result.batteryContributionW, 0);
    assert(result.targetPowerW <= 8700);
  }
  result = plan([{ ...point, zeroExportGridMaxW: null }], 0)[0];
  assert.equal(result.targetPowerW, 22000, 'Nulleinspeise-Zusage beeinflusst den bisherigen Normalpfad nicht');
  assert.equal(result.batteryContributionW, point.batteryContributionW, 'Bisherige Diagnose außerhalb des Gates bleibt erhalten');
  const protectedPoint = { ...point, safe: 'protected', effectiveStorageAssist: false, zeroExportStorageCreditW: 0 };
  const mixed = plan([point, protectedPoint]);
  assert.equal(mixed.reduce((sum, p) => sum + p.batteryContributionW, 0), 1000);
  assert(mixed.reduce((sum, p) => sum + p.pvUsedW, 0) <= 5000);
  assert.equal(mixed[1].batteryContributionW, 0);
  assert(mixed.every(p => p.targetPowerW <= p.zeroExportGridMaxW + p.pvUsedW + p.batteryContributionW));
  const runoff = plan([{ ...point, actualPowerW: 9700, targetPowerW: 0 }, protectedPoint]);
  assert.equal(runoff[0].targetPowerW, 0);
  assert.equal(runoff[0].batteryContributionW, 0, 'Ein Stop weist keinen neuen Speicherverbrauch aus');
  assert.equal(runoff[1].targetPowerW, 3700, 'Noch fließende PV bleibt trotz Stop des ersten LP belegt');
  assert.equal(runoff[1].pvUsedW, 0);
  result = plan([{ ...point, stationKey: 's', stationMaxPowerW: 4200 }])[0];
  assert.equal(result.targetPowerW, 4200);
  assert.equal(result.batteryContributionW, 500, 'Finale Stationsgrenze reduziert auch den bilanzierten Speicheranteil');
  assert.equal(result.pvUsedW, 0);
  result = plan([point], 5000, { budgetW: 3000 })[0];
  assert.equal(result.batteryContributionW, 0);
  assert.equal(result.targetPowerW, 3000);
  for (let seed = 0; seed < 120; seed += 1) {
    const pv = seed * 139 % 12000;
    const points = [0, 1, 2].map(i => ({ ...point, safe: `r${i}`, zeroExportGridMaxW: (seed * 43 + i * 1800) % 7000,
      zeroExportStorageCreditW: (seed * 73 + i * 300) % 2000, effectiveStorageAssist: i !== 1 }));
    const output = plan(points, pv);
    assert(output.reduce((sum, p) => sum + p.pvUsedW, 0) <= pv + 1e-6);
    for (const p of output) {
      assert(p.batteryContributionW <= (p.effectiveStorageAssist ? p.zeroExportStorageCreditW : 0));
      assert(p.targetPowerW <= p.zeroExportGridMaxW + p.pvUsedW + p.batteryContributionW + 1e-6);
    }
  }
}

const phasePoint = { ...point, chargerType: 'AC', phases: 3, currentPhaseCount: 3,
  phaseMode: 'auto-pv', phaseSwitchKey: 'phase', supportsPhaseSwitch: true, minA: 6, maxA: 32,
  voltageV: 230, actualPowerW: 4700, lowSinceMs: now - 121000, highSinceMs: now - 301000 };
const phase = (wb, extra = {}) => phases({ now, budgetW: 30000, stablePvPhysicalAvailableW: 0,
  pvPhysicalAvailableW: 0, phaseAutoEnabled: true, wallboxes: [wb], ...extra }).wallboxes[0];
assert.equal(phase(phasePoint).targetPhaseCount, 3, 'Bereits laufende 3p-Ladung darf gedeckten Speicheranteil mitnutzen');
assert.equal(phase({ ...phasePoint, currentPhaseCount: 1, phases: 1, zeroExportStorageCreditW: 20000 }).targetPhaseCount, 1,
  'Speicher allein darf keine neue Hoch-Umschaltung auslösen');
assert.equal(phase({ ...phasePoint, zeroExportStorageCreditW: 0 }).targetPhaseCount, 1);
assert.equal(phase({ ...phasePoint, effectiveStorageAssist: false }).targetPhaseCount, 1);
assert.equal(phase({ ...phasePoint, actualPowerW: 0 }).targetPhaseCount, 1, 'Eine lediglich geplante Speicherladung gilt nicht als laufend');
assert.equal(phase({ ...phasePoint, effectiveMode: 'pv' }).targetPhaseCount, 1);
assert.equal(phase(phasePoint, { staleMeter: true }).targetPhaseCount, 1, 'Veraltete Messung erhält keinen Speicherbonus in der Phasenwahl');
console.log('[1.0.20] OK: getrennte Quellen, 240 Mehr-LP-Fälle, Schutz, Istreservierung, Min+PV und konservative Phasenwahl');
