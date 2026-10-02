#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-charging-multipoint-station-budget.js
 * Zweck: Regressionstest für die zentrale Verteilung auf mehrere Ladepunkte.
 * Geprüft werden Gesamtbudget, PV-Grant, technische Mindestleistung,
 * Stromquantisierung, Prioritätsreihenfolge und Stationslimits.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const writePlan = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-write-plan.js'));

function fail(message, details) {
  console.error(`[charging-multipoint-station-budget] ${message}`);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function sumPower(plan) {
  return plan.wallboxes.reduce((sum, wb) => sum + Math.max(0, Number(wb.targetPowerW) || 0), 0);
}

function powerWallbox(safe, options = {}) {
  const targetW = Number(options.targetW || 0);
  return {
    safe,
    name: safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: options.vehicleDemandConfirmed !== false,
    charging: options.charging === true,
    actualPowerW: Number(options.actualPowerW || 0),
    effectiveMode: options.mode || 'auto',
    userMode: options.mode || 'auto',
    chargerType: 'ac',
    controlBasis: 'power',
    phases: 3,
    voltageV: 230,
    minPowerW: options.minPowerW === undefined ? 1000 : options.minPowerW,
    maxPowerW: options.maxPowerW === undefined ? 11000 : options.maxPowerW,
    stepW: options.stepW === undefined ? 100 : options.stepW,
    priority: options.priority === undefined ? 100 : options.priority,
    orderIndex: options.orderIndex === undefined ? 0 : options.orderIndex,
    allocationRank: options.allocationRank === undefined ? 1 : options.allocationRank,
    stationKey: options.stationKey || '',
    stationMaxPowerW: options.stationMaxPowerW || 0,
    targetPowerW: targetW,
    targetCurrentA: targetW > 0 ? targetW / (3 * 230) : 0,
    setWKey: `test.${safe}.setPowerW`,
    hasSetpoint: true,
    hasSetPower: true,
  };
}

function currentWallbox(safe, options = {}) {
  const targetW = Number(options.targetW || 0);
  return {
    safe,
    name: safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: options.vehicleDemandConfirmed !== false,
    charging: options.charging === true,
    actualPowerW: Number(options.actualPowerW || 0),
    effectiveMode: options.mode || 'auto',
    userMode: options.mode || 'auto',
    chargerType: 'ac',
    controlBasis: 'current',
    phases: 3,
    voltageV: 230,
    minA: options.minA === undefined ? 6 : options.minA,
    maxA: options.maxA === undefined ? 16 : options.maxA,
    minPowerW: options.minPowerW === undefined ? 4140 : options.minPowerW,
    maxPowerW: options.maxPowerW === undefined ? 11040 : options.maxPowerW,
    stepA: options.stepA === undefined ? 0.1 : options.stepA,
    priority: options.priority === undefined ? 100 : options.priority,
    orderIndex: options.orderIndex === undefined ? 0 : options.orderIndex,
    allocationRank: options.allocationRank === undefined ? 1 : options.allocationRank,
    stationKey: options.stationKey || '',
    stationMaxPowerW: options.stationMaxPowerW || 0,
    targetPowerW: targetW,
    targetCurrentA: targetW > 0 ? targetW / (3 * 230) : 0,
    setAKey: `test.${safe}.setCurrentA`,
    hasSetpoint: true,
    hasSetCurrent: true,
  };
}

function allocationRows(wallboxes) {
  return wallboxes.map((wb) => ({
    safe: wb.safe,
    targetW: wb.targetPowerW,
    targetA: wb.targetCurrentA,
    effectiveMode: wb.effectiveMode,
    userMode: wb.userMode,
    priority: wb.priority,
    orderIndex: wb.orderIndex,
    allocationRank: wb.allocationRank,
    stationKey: wb.stationKey,
    stationMaxPowerW: wb.stationMaxPowerW,
    reason: 'runtime-central-allocation',
  }));
}

function runtimePlan(wallboxes, budgetW, pvAvailableW, options = {}) {
  const physicalPvW = options.physicalPvW === undefined ? pvAvailableW : Number(options.physicalPvW);
  const purePvW = options.purePvW === undefined ? pvAvailableW : Number(options.purePvW);
  return allocation.buildChargingAllocationShadowPlan({
    mode: 'auto',
    budgetMode: 'engine:central',
    budgetW,
    remainingW: budgetW,
    pvAvailableW: physicalPvW,
    pvPureAvailableW: purePvW,
    pvPhysicalAvailableW: physicalPvW,
    pvAvailable: physicalPvW > 0,
    preferTsNativeAllocation: false,
    tsNormalSourceLock: false,
    allowJsComparisonFallback: false,
    wallboxes,
    allocations: allocationRows(wallboxes),
    totalTargetPowerW: wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.targetPowerW), 0),
    totalTargetCurrentA: wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.targetCurrentA), 0),
  });
}

// 1) Ein 5-kW-Budget darf bei zwei 3-phasigen 6-A-Ladepunkten keinen
// technisch unbrauchbaren Teilwert erzeugen. Die Ampere-Quantisierung darf
// das zentrale Budget nachträglich ebenfalls nicht überschreiten.
{
  const wallboxes = [
    currentWallbox('wb_current_1', { targetW: 4570, allocationRank: 1 }),
    currentWallbox('wb_current_2', { targetW: 430, allocationRank: 2 }),
  ];
  const plan = runtimePlan(wallboxes, 5000, 5000);
  const usedW = sumPower(plan);
  assert(usedW <= 5000, 'Stromquantisierung überschreitet das zentrale Gesamtbudget.', { usedW, plan: plan.wallboxes });
  for (const wb of plan.wallboxes) {
    assert(wb.targetPowerW === 0 || wb.targetPowerW >= 4140, 'Ladepunkt erhält einen Zielwert unterhalb der technischen Mindestleistung.', wb);
    assert(wb.targetCurrentA === 0 || wb.targetCurrentA >= 6, 'Ladepunkt erhält einen Strom unterhalb 6 A.', wb);
  }
}

// 2) Das Stationslimit ist eine harte Abschlussgrenze. Reicht das Limit nicht
// für zwei vollständige Mindestleistungen, bleibt ein Connector bei 0 W.
{
  const wallboxes = [
    currentWallbox('station_1_connector_1', { targetW: 5000, allocationRank: 1, stationKey: 'station_1', stationMaxPowerW: 6000 }),
    currentWallbox('station_1_connector_2', { targetW: 5000, allocationRank: 2, stationKey: 'station_1', stationMaxPowerW: 6000 }),
  ];
  const plan = runtimePlan(wallboxes, 10000, 10000);
  const stationUsedW = sumPower(plan);
  assert(stationUsedW <= 6000, 'Finaler Ladeplan überschreitet das Stationslimit.', { stationUsedW, plan: plan.wallboxes });
  assert(plan.wallboxes.filter((wb) => wb.targetPowerW > 0).length === 1, 'Stationslimit startet unzulässig zwei Connectoren unterhalb der Mindestleistung.', plan.wallboxes);
  for (const wb of plan.wallboxes) {
    assert(wb.stationAllocatedW === stationUsedW, 'Stationsdiagnose entspricht nicht dem finalen Write-Plan.', wb);
    assert(wb.stationRemainingW === 6000 - stationUsedW, 'Stations-Restbudget ist nicht plausibel.', wb);
  }
}

// 2b) Mehrere Stationen behalten jeweils ihr eigenes Limit und bleiben
// gleichzeitig unter dem übergeordneten EVCS-Gesamtbudget.
{
  const wallboxes = [
    powerWallbox('station_a_1', { targetW: 5000, allocationRank: 1, stationKey: 'station_a', stationMaxPowerW: 6000, stepW: 100 }),
    powerWallbox('station_a_2', { targetW: 5000, allocationRank: 2, stationKey: 'station_a', stationMaxPowerW: 6000, stepW: 100 }),
    powerWallbox('station_b_1', { targetW: 5000, allocationRank: 3, stationKey: 'station_b', stationMaxPowerW: 6000, stepW: 100 }),
    powerWallbox('station_b_2', { targetW: 5000, allocationRank: 4, stationKey: 'station_b', stationMaxPowerW: 6000, stepW: 100 }),
  ];
  const plan = runtimePlan(wallboxes, 10000, 10000);
  const stationA = plan.wallboxes.filter((wb) => wb.stationKey === 'station_a').reduce((sum, wb) => sum + wb.targetPowerW, 0);
  const stationB = plan.wallboxes.filter((wb) => wb.stationKey === 'station_b').reduce((sum, wb) => sum + wb.targetPowerW, 0);
  assert(stationA <= 6000, 'Station A überschreitet ihr eigenes Limit.', { stationA, plan: plan.wallboxes });
  assert(stationB <= 6000, 'Station B überschreitet ihr eigenes Limit.', { stationB, plan: plan.wallboxes });
  assert(sumPower(plan) <= 10000, 'Mehrere Stationslimits überschreiten zusammen das zentrale EVCS-Budget.', plan.wallboxes);
}

// 2c) Langsame Wallbox-Telemetrie darf beim Abregeln keine kurzzeitige
// Doppelbelegung erzeugen. Die noch physisch gemessene Leistung reserviert
// Gesamt- und Stationsbudget, bis der Ladepunkt wirklich heruntergeregelt hat.
{
  const wallboxes = [
    powerWallbox('slow_ramp_down', {
      targetW: 0,
      actualPowerW: 5000,
      charging: true,
      allocationRank: 1,
      stationKey: 'slow_station',
      stationMaxPowerW: 6000,
      minPowerW: 1000,
      stepW: 100,
    }),
    powerWallbox('new_station_demand', {
      targetW: 5000,
      actualPowerW: 0,
      allocationRank: 2,
      stationKey: 'slow_station',
      stationMaxPowerW: 6000,
      minPowerW: 1000,
      stepW: 100,
    }),
  ];
  const plan = runtimePlan(wallboxes, 10000, 10000);
  const first = plan.wallboxes.find((wb) => wb.safe === 'slow_ramp_down');
  const second = plan.wallboxes.find((wb) => wb.safe === 'new_station_demand');
  assert(first && first.targetPowerW === 0, 'Abregelnder Ladepunkt erhält unerwartet erneut Leistung.', plan.wallboxes);
  assert(second && second.targetPowerW <= 1000, 'Noch physisch aktive Leistung wird beim Stationslimit nicht reserviert.', plan.wallboxes);
  assert(second && (second.targetPowerW === 0 || second.targetPowerW >= 1000), 'Physische Reservierung erzeugt einen unbrauchbaren Teilwert.', second);
}

// 3) Gemischte Modi: Auto darf Gesamtbudget verwenden, PV-only ausschließlich
// den zentralen PV-Grant. Eine lokale Wallboxberechnung darf den Grant nicht erhöhen.
{
  const wallboxes = [
    powerWallbox('wb_auto', { targetW: 5000, mode: 'auto', allocationRank: 1, stepW: 100 }),
    powerWallbox('wb_pv', { targetW: 5000, mode: 'pv', allocationRank: 2, stepW: 100 }),
  ];
  const plan = runtimePlan(wallboxes, 10000, 3000);
  const auto = plan.wallboxes.find((wb) => wb.safe === 'wb_auto');
  const pv = plan.wallboxes.find((wb) => wb.safe === 'wb_pv');
  assert(auto && auto.targetPowerW === 5000, 'Auto-Ladepunkt wird ohne Grund vom PV-Grant begrenzt.', plan.wallboxes);
  assert(pv && pv.targetPowerW <= 3000, 'PV-Ladepunkt überschreitet den zentralen PV-Grant.', plan.wallboxes);
  assert(plan.wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.pvUsedW || 0), 0) <= 3000, 'PV-Verbrauch der Ladegruppe überschreitet den Grant.', plan.wallboxes);
  assert(sumPower(plan) <= 10000, 'Gemischte Modi überschreiten das Gesamtbudget.', plan.wallboxes);
}

// 4) Min+PV: Die technische Basis darf aus dem Gesamtbudget kommen; nur der
// Zusatz oberhalb der Basis verbraucht den zentralen PV-Grant.
{
  const wallboxes = [powerWallbox('wb_minpv', {
    targetW: 7000,
    mode: 'minpv',
    minPowerW: 4140,
    stepW: 10,
    allocationRank: 1,
  })];
  const plan = runtimePlan(wallboxes, 10000, 2000);
  const wb = plan.wallboxes[0];
  assert(wb.targetPowerW >= 4140 && wb.targetPowerW <= 6140, 'Min+PV nutzt mehr als Basis plus zentralen PV-Grant.', wb);
  assert(wb.pvUsedW <= 2000, 'Min+PV verbucht zu viel PV-Leistung.', wb);
}

// 4b) Die Kundenprioritaet begrenzt nur reines PV-Laden. Min+PV darf
// seine Grundlast aus dem Gesamtbudget und den Zusatz aus dem physikalischen
// PV-Rest beziehen; ein 0-W-PV-Rest stoppt die Grundlast nicht.
{
  const pure = runtimePlan([powerWallbox('pure_priority_cap', {
    targetW: 8000, mode: 'pv', minPowerW: 1000, stepW: 10, allocationRank: 1,
  })], 11000, 6000, { purePvW: 2000, physicalPvW: 6000 });
  assert(pure.wallboxes[0].targetPowerW === 2000, 'Reines PV-Laden überschreitet den priorisierten EVCS-Anteil.', pure.wallboxes[0]);

  const minpv = runtimePlan([powerWallbox('minpv_physical_cap', {
    targetW: 8000, mode: 'minpv', minPowerW: 4140, stepW: 10, allocationRank: 1,
  })], 11000, 6000, { purePvW: 2000, physicalPvW: 6000 });
  assert(minpv.wallboxes[0].targetPowerW === 8000, 'Min+PV wird unzulässig vom reinen PV-Prioritätsanteil begrenzt.', minpv.wallboxes[0]);
  assert(minpv.wallboxes[0].pvUsedW === 3860, 'Min+PV verbucht seine netzgestützte Basis fälschlich als PV.', minpv.wallboxes[0]);

  const minpvNoPv = runtimePlan([powerWallbox('minpv_no_pv', {
    targetW: 4140, mode: 'minpv', minPowerW: 4140, stepW: 10, allocationRank: 1,
  })], 11000, 0, { purePvW: 0, physicalPvW: 0 });
  assert(minpvNoPv.wallboxes[0].targetPowerW === 4140, 'Min+PV-Grundlast fällt bei 0 W PV auf 0 W.', minpvNoPv.wallboxes[0]);
}

// 4c) In gemischten PV-/Min+PV-Gruppen bleiben beide Invarianten gleichzeitig
// verbindlich: pure PV <= Prioritätscap und gesamte PV-Nutzung <= physikalischer Cap.
{
  const wallboxes = [
    powerWallbox('mixed_pure', { targetW: 5000, mode: 'pv', minPowerW: 1000, stepW: 10, allocationRank: 1 }),
    powerWallbox('mixed_minpv', { targetW: 8000, mode: 'minpv', minPowerW: 4140, stepW: 10, allocationRank: 2 }),
  ];
  const plan = runtimePlan(wallboxes, 16000, 6000, { purePvW: 2000, physicalPvW: 6000 });
  const pure = plan.wallboxes.find((wb) => wb.safe === 'mixed_pure');
  const minpv = plan.wallboxes.find((wb) => wb.safe === 'mixed_minpv');
  const pvUsedW = plan.wallboxes.reduce((sum, wb) => sum + Math.max(0, Number(wb.pvUsedW) || 0), 0);
  assert(pure && pure.targetPowerW <= 2000, 'Gemischte Gruppe überschreitet den reinen PV-Prioritätscap.', plan.wallboxes);
  assert(minpv && minpv.targetPowerW >= 4140, 'Gemischte Gruppe verliert die Min+PV-Grundlast.', plan.wallboxes);
  assert(pvUsedW <= 6000, 'Gemischte Gruppe überschreitet das physikalische PV-Budget.', { pvUsedW, wallboxes: plan.wallboxes });
}

// 5) Der experimentelle TS-Native-Allocator bleibt für spätere Migration sicher:
// kleinere Prioritätszahl zuerst, Demand-Obergrenzen werden respektiert und es
// entstehen keine Teilwerte unter der technischen Mindestleistung.
{
  const wallboxes = [
    powerWallbox('priority_100', { targetW: 11000, priority: 100, allocationRank: 1, minPowerW: 1000, stepW: 100 }),
    powerWallbox('priority_200', { targetW: 11000, priority: 200, allocationRank: 2, minPowerW: 1000, stepW: 100 }),
  ];
  const plan = allocation.buildChargingAllocationShadowPlan({
    budgetW: 4000,
    remainingW: 4000,
    pvAvailableW: 4000,
    preferTsNativeAllocation: true,
    tsNormalSourceLock: true,
    allowJsComparisonFallback: false,
    wallboxes,
    allocations: allocationRows(wallboxes),
  });
  const high = plan.wallboxes.find((wb) => wb.safe === 'priority_100');
  const low = plan.wallboxes.find((wb) => wb.safe === 'priority_200');
  assert(high && high.targetPowerW === 4000, 'Höhere Priorität erhält das verfügbare Budget nicht zuerst.', plan.wallboxes);
  assert(low && low.targetPowerW === 0, 'Niedrigere Priorität startet vor Abschluss der höheren Klasse.', plan.wallboxes);
}

// 6) Der Write-Plan darf einen final stations-/budgetbegrenzten Zielwert nicht
// wieder durch eine ältere Runtime-/Diagnose-Allocation überschreiben.
{
  const wb = powerWallbox('write_plan_station_guard', {
    targetW: 9000,
    stationKey: 'station_write_plan',
    stationMaxPowerW: 3000,
    allocationRank: 1,
  });
  const plan = writePlan.buildChargingSetpointWritePlan({
    wallboxes: [wb],
    allocations: [{
      safe: wb.safe,
      targetW: 9000,
      targetA: 9000 / (3 * 230),
      stationKey: wb.stationKey,
      stationMaxPowerW: wb.stationMaxPowerW,
      reason: 'legacy-runtime-target',
    }],
    allocationPlan: {
      wallboxes: [{
        ...wb,
        targetPowerW: 3000,
        targetCurrentA: 3000 / (3 * 230),
        stationAllocatedW: 3000,
        stationRemainingW: 0,
        allocationSafetyCapped: true,
        allocationSafetyReason: 'station-limit',
        reason: 'central-final-plan',
      }],
    },
  });
  const entry = plan.entries.find((item) => item && item.type === 'setpoint' && item.safe === wb.safe);
  assert(entry && entry.targetPowerW === 3000, 'Ältere Runtime-Ziele überschreiben den finalen Stations-Cap im Write-Plan.', { entry, plan });
  assert(entry && entry.stationAllocatedW === 3000 && entry.stationRemainingW === 0, 'Finale Stationsdiagnose geht im Write-Plan verloren.', entry);
  assert(entry && entry.allocationSafetyCapped === true && entry.allocationSafetyReason.includes('station-limit'), 'Finaler Safety-Cap wird nicht bis zum Executor transportiert.', entry);
}

// 6b) Ein explizites zentrales Restbudget von 0 W ist ein harter Stop. Es darf
// nicht als fehlender Budgetwert interpretiert und durch den alten Ladebedarf ersetzt werden.
{
  const wb = powerWallbox('explicit_zero_remaining', { targetW: 5000, allocationRank: 1 });
  const plan = allocation.buildChargingAllocationShadowPlan({
    budgetW: undefined,
    remainingW: 0,
    pvAvailableW: 5000,
    pvAvailable: true,
    preferTsNativeAllocation: false,
    tsNormalSourceLock: false,
    allowJsComparisonFallback: false,
    wallboxes: [wb],
    allocations: allocationRows([wb]),
    totalTargetPowerW: 5000,
    totalTargetCurrentA: 5000 / (3 * 230),
  });
  assert(sumPower(plan) === 0, 'Explizites 0-W-Restbudget wird faelschlich als unbegrenzt behandelt.', plan.wallboxes);
  assert(plan.remainingW === 0, 'Finales Restbudget ist bei explizitem 0-W-Grant nicht 0 W.', plan);
}

// 6c) Unbegrenztes Gesamtbudget bleibt ausdrücklich unbegrenzt. `Infinity` darf
// beim Übergang in den typisierten Abschluss-Guard nicht als fehlender Wert und
// dadurch als 0-W-Stopp interpretiert werden.
{
  const wallboxes = [
    powerWallbox('unlimited_1', { targetW: 7000, allocationRank: 1, stepW: 100 }),
    powerWallbox('unlimited_2', { targetW: 5000, allocationRank: 2, stepW: 100 }),
  ];
  const plan = allocation.buildChargingAllocationShadowPlan({
    budgetMode: 'unlimited',
    budgetW: Number.POSITIVE_INFINITY,
    budgetUnlimited: true,
    remainingW: 0,
    pvAvailableW: 12000,
    pvAvailable: true,
    preferTsNativeAllocation: false,
    tsNormalSourceLock: false,
    allowJsComparisonFallback: false,
    wallboxes,
    allocations: allocationRows(wallboxes),
    totalTargetPowerW: 12000,
    totalTargetCurrentA: 12000 / (3 * 230),
  });
  assert(sumPower(plan) === 12000, 'Unbegrenztes Budget wird im finalen Guard faelschlich auf 0 W begrenzt.', plan.wallboxes);
}

// 7) Der produktive Runtime-Pfad muss genau eine fachliche Allokation verwenden;
// Stationsdiagnosen und zentrale Reservierung werden aus dem finalen TS-geprüften
// Plan veröffentlicht, nicht aus älteren Rohzielen.
{
  const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const normalizedPathCount = (runtimeSource.match(/preferTsNativeAllocation:\s*false/g) || []).length;
  const stationDiagnosticsCount = (runtimeSource.match(/_publishChargingStationDiagnosticsFromAllocationPlan\(tsAllocationState, wbList\)/g) || []).length;
  const finalMetricsCount = (runtimeSource.match(/_buildChargingFinalAllocationMetrics\(tsAllocationState, wbList, activityThresholdW\)/g) || []).length;
  assert(normalizedPathCount >= 3, 'Normal-, Peak- und Failsafe-Pfad nutzen nicht dieselbe zentrale Runtime-Allokation.', { normalizedPathCount });
  assert(stationDiagnosticsCount >= 3, 'Stationsdiagnose wird nicht aus allen finalen Write-Plänen aktualisiert.', { stationDiagnosticsCount });
  assert(finalMetricsCount >= 1, 'Zentrale EVCS-Reservierung wird nicht aus dem finalen Mehrladepunkt-Plan neu berechnet.', { finalMetricsCount });
  assert(runtimeSource.includes("evcsFinalAllocationSource = 'ts-final-allocation-plan'"), 'Budgetdiagnose markiert den finalen Allocation-Plan nicht als verbindliche Quelle.');
  assert(runtimeSource.includes('const rrGroupKey = `${sk}|p:'), 'Stations-Round-Robin ist nicht nach Priorität und Betriebsart getrennt.');
}


// 7) Runtime-Brücke: Alle für Priorität, Stationsgrenze und Schrittbildung nötigen
// Felder müssen bis zum finalen TypeScript-Plan transportiert werden. Die aus dem
// finalen Plan gebildeten Summen sind die einzige Quelle für UI/EMS-Reservierung.
{
  const { ChargingManagementModule } = require(path.join(root, 'ems', 'modules', 'charging-management.js'));
  const runtime = Object.create(ChargingManagementModule.prototype);
  const mapped = runtime._mapChargingWallboxesForTsAllocation([{
    safe: 'runtime_bridge',
    name: 'Runtime Bridge',
    enabled: true,
    online: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: true,
    charging: true,
    effectiveMode: 'pv',
    userMode: 'pv',
    chargerType: 'AC',
    controlBasis: 'currentA',
    phases: 3,
    configuredPhaseCount: 3,
    currentPhaseCount: 3,
    targetPhaseCount: 3,
    allocationPhaseCount: 3,
    voltageV: 230,
    minA: 6,
    maxA: 16,
    minPW: 4140,
    maxPW: 11000,
    actualPowerW: 4200,
    priority: 100,
    orderIndex: 2,
    allocationRank: 1,
    chargingSinceMs: 123456,
    goalActive: true,
    goalFinishTs: 456789,
    goalUrgency: 0.8,
    goalDesiredW: 7000,
    stationKey: 'runtime_station',
    stationMaxPowerW: 6000,
    connectorNo: 2,
    setAKey: 'cm.wb.runtime_bridge.setA',
    hasSetpoint: true,
    maxDeltaWPerTick: 500,
    maxDeltaAPerTick: 0.5,
    stepW: 100,
    stepA: 0.1,
  }]);
  assert(mapped.length === 1, 'Runtime-Brücke liefert keinen Ladepunkt.', mapped);
  const item = mapped[0];
  assert(item.allocationRank === 1 && item.priority === 100, 'Prioritäts-/Rank-Felder gehen in der Runtime-Brücke verloren.', item);
  assert(item.stationKey === 'runtime_station' && item.stationMaxPowerW === 6000, 'Stationsgrenze geht in der Runtime-Brücke verloren.', item);
  assert(item.stepA === 0.1 && item.minPowerW === 4140 && item.maxPowerW === 11000, 'Technische Strom-/Leistungsgrenzen gehen in der Runtime-Brücke verloren.', item);
  assert(item.goalActive === true && item.goalDesiredW === 7000, 'Ziel-Laden-Metadaten gehen in der Runtime-Brücke verloren.', item);

  const finalPlan = {
    safe: 'runtime_bridge',
    enabled: true,
    online: true,
    connected: true,
    charging: true,
    hasSetpoint: true,
    effectiveMode: 'pv',
    minPowerW: 4140,
    targetPowerW: 5520,
    targetCurrentA: 8,
    pvUsedW: 5520,
    stationKey: 'runtime_station',
    stationMaxPowerW: 6000,
    stationAllocatedW: 5520,
    stationRemainingW: 480,
    allocationSafetyCapped: true,
    allocationSafetyReason: 'station-limit',
  };
  const metrics = runtime._buildChargingFinalAllocationMetrics({
    normalSourceDecision: { apply: { wallboxes: [finalPlan] } },
  }, [{
    safe: 'runtime_bridge',
    enabled: true,
    online: true,
    vehiclePlugged: true,
    vehicleDemandConfirmed: true,
    charging: true,
    actualPowerW: 5000,
    controlBasis: 'currentA',
    effectiveMode: 'pv',
    minPW: 4140,
  }], 100);
  assert(metrics && metrics.totalTargetPowerW === 5520 && metrics.reserveW === 5520, 'Finale Runtime-Summen stammen nicht aus dem TS-Plan.', metrics);
  assert(metrics && metrics.pvReserveW === 5520 && metrics.pvIntentW === 5520, 'Finale PV-Reservierung folgt nicht dem TS-Endplan.', metrics);
}

console.log('[charging-multipoint-station-budget] OK: Gesamt-/PV-Budget, Mindestleistung, Prioritäten und Stationslimits bleiben im finalen Mehrladepunkt-Plan verbindlich.');
