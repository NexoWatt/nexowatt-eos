#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-charging-minpv-base-mode-reaction.js
 * Zweck: Regressionstest fuer zwei Feldanforderungen:
 * 1) Min+PV haelt seine technische Mindestladung aus dem zentralen Gesamtbudget,
 *    selbst wenn der zentrale PV-Grant 0 W betraegt.
 * 2) Bedienaenderungen starten debounct einen normalen EMS-Tick, ohne die
 *    Budget-, Stations- oder Sicherheitslogik zu umgehen.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chargingRuntime = require(path.join(root, 'ems/modules/charging-management.js'));
const allocation = require(path.join(root, 'lib/ts-mirrors/ems/charging-management/charging-allocation.js'));
const { EmsEngine } = require(path.join(root, 'ems/engine.js'));

function fail(message, details) {
  console.error(`[charging-minpv-base-mode-reaction] ${message}`);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function powerWallbox(safe, mode, targetW) {
  return {
    safe,
    name: safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    charging: false,
    actualPowerW: 0,
    effectiveMode: mode,
    userMode: mode,
    chargerType: 'ac',
    controlBasis: 'power',
    phases: 3,
    voltageV: 230,
    minPowerW: 4200,
    maxPowerW: 11000,
    stepW: 100,
    priority: 100,
    orderIndex: 0,
    allocationRank: 1,
    targetPowerW: targetW,
    targetCurrentA: targetW > 0 ? targetW / (3 * 230) : 0,
    setWKey: `test.${safe}.setPowerW`,
    hasSetpoint: true,
    hasSetPower: true,
  };
}

function currentWallbox(safe, mode, targetW, stationMaxPowerW = 0) {
  return {
    safe,
    name: safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    charging: false,
    actualPowerW: 0,
    effectiveMode: mode,
    userMode: mode,
    chargerType: 'ac',
    controlBasis: 'current',
    phases: 3,
    voltageV: 230,
    minA: 6,
    maxA: 16,
    minPowerW: 4140,
    maxPowerW: 11040,
    stepA: 0.1,
    priority: 100,
    orderIndex: 0,
    allocationRank: 1,
    stationKey: stationMaxPowerW > 0 ? 'station_minpv' : '',
    stationMaxPowerW,
    targetPowerW: targetW,
    targetCurrentA: targetW > 0 ? targetW / (3 * 230) : 0,
    setAKey: `test.${safe}.setCurrentA`,
    hasSetpoint: true,
    hasSetCurrent: true,
  };
}

function finalPlan(wallboxes, budgetW, pvAvailableW) {
  return allocation.buildChargingAllocationShadowPlan({
    mode: 'auto',
    budgetMode: 'engine:central',
    budgetW,
    remainingW: budgetW,
    pvAvailableW,
    pvAvailable: pvAvailableW > 0,
    preferTsNativeAllocation: true,
    tsNormalSourceLock: true,
    allowJsComparisonFallback: false,
    wallboxes,
    allocations: wallboxes.map((wb) => ({
      safe: wb.safe,
      targetW: wb.targetPowerW,
      targetA: wb.targetCurrentA,
      effectiveMode: wb.effectiveMode,
      userMode: wb.userMode,
      stationKey: wb.stationKey || '',
      stationMaxPowerW: wb.stationMaxPowerW || 0,
      reason: 'runtime-minpv-regression',
    })),
    totalTargetPowerW: wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.targetPowerW), 0),
    totalTargetCurrentA: wallboxes.reduce((sum, wb) => sum + Math.max(0, wb.targetCurrentA), 0),
  });
}

async function run() {
  const {
    computeMinPvAllocationW,
    computePendingPvStartIntentW,
  } = chargingRuntime;

  assert(typeof computeMinPvAllocationW === 'function', 'Min+PV-Basishelfer fehlt im produktiven Runtime-Export.');
  assert(typeof computePendingPvStartIntentW === 'function', 'Pending-Intent-Helfer fehlt im produktiven Runtime-Export.');

  // Min+PV-Basis: 0 W PV darf nur die Zusatzleistung entfernen, nicht die
  // netzgestuetzte technische Mindestladung.
  {
    const baseOnly = computeMinPvAllocationW({
      minPowerW: 4200,
      technicalMinW: 4140,
      maxPowerW: 11000,
      totalAvailableW: 10000,
      stationAvailableW: 10000,
      pvAvailableW: 0,
    });
    assert(baseOnly.targetW === 4200, 'Min+PV stoppt bei 0 W PV trotz ausreichendem Gesamtbudget.', baseOnly);
    assert(baseOnly.pvExtraW === 0 && baseOnly.reason === 'minpv-grid-base', 'Min+PV-Basis wird faelschlich als PV-Anteil verbucht.', baseOnly);

    const withPv = computeMinPvAllocationW({
      minPowerW: 4200,
      technicalMinW: 4140,
      maxPowerW: 11000,
      totalAvailableW: 10000,
      stationAvailableW: 10000,
      pvAvailableW: 2000,
    });
    assert(withPv.targetW === 6200 && withPv.pvExtraW === 2000, 'Min+PV addiert den zentralen PV-Grant nicht sauber oberhalb der Basis.', withPv);

    const totalBlocked = computeMinPvAllocationW({
      minPowerW: 4200,
      technicalMinW: 4140,
      maxPowerW: 11000,
      totalAvailableW: 4000,
      stationAvailableW: 10000,
      pvAvailableW: 5000,
    });
    assert(totalBlocked.targetW === 0 && totalBlocked.reason === 'below-minpv-base', 'Harte Anschlussgrenze unter Mindestleistung wird von Min+PV umgangen.', totalBlocked);

    const stationBlocked = computeMinPvAllocationW({
      minPowerW: 4200,
      technicalMinW: 4140,
      maxPowerW: 11000,
      totalAvailableW: 10000,
      stationAvailableW: 4000,
      pvAvailableW: 5000,
    });
    assert(stationBlocked.targetW === 0 && stationBlocked.reason === 'below-minpv-base', 'Stationslimit unter Mindestleistung wird von Min+PV umgangen.', stationBlocked);
  }

  // Start-Intent: Min+PV reserviert seine Basis im Gesamtbudget auch ohne PV.
  // Reines PV-Laden bleibt dagegen bei 0 W PV bewusst gestoppt.
  {
    const minPvPending = computePendingPvStartIntentW({
      mode: 'minpv',
      enabled: true,
      online: true,
      connected: true,
      controlBasis: 'currentA',
      status: 'SuspendedEVSE',
      currentPowerW: 0,
      currentPvIntentW: 0,
      minPowerW: 4140,
      technicalMinW: 4140,
      maxPowerW: 11040,
      totalRemainingW: 10000,
      stationRemainingW: 10000,
      pvRemainingW: 0,
    });
    assert(minPvPending.intentW === 0, 'Min+PV-Basis wird im Pending-Pfad faelschlich als PV-Intent reserviert.', minPvPending);
    assert(minPvPending.totalDemandW === 4140, 'Min+PV reserviert ohne PV seine technische Mindestleistung nicht im Gesamtbudget.', minPvPending);
    assert(minPvPending.reason === 'minpv-grid-base-start-intent', 'Min+PV-Startgrund ist nicht eindeutig diagnostiziert.', minPvPending);

    const pvPending = computePendingPvStartIntentW({
      mode: 'pv',
      enabled: true,
      online: true,
      connected: true,
      controlBasis: 'currentA',
      status: 'SuspendedEVSE',
      minPowerW: 4140,
      technicalMinW: 4140,
      maxPowerW: 11040,
      totalRemainingW: 10000,
      stationRemainingW: 10000,
      pvRemainingW: 0,
    });
    assert(pvPending.intentW === 0 && pvPending.totalDemandW === 0, 'Reines PV-Laden startet ohne zentralen PV-Grant.', pvPending);
  }

  // Finaler TS-Plan: Nur Min+PV erhaelt bei 0 W PV seine Basis. Auto/Boost
  // bleiben vom PV-Prioritaetsgate unabhaengig; PV-only bleibt gestoppt.
  {
    const minPv = finalPlan([currentWallbox('minpv_zero_pv', 'minpv', 7000)], 10000, 0).wallboxes[0];
    assert(minPv.targetPowerW === 4140, 'Finaler TS-Plan stoppt Min+PV bei 0 W PV oder ueberschreitet die Basis.', minPv);
    assert(minPv.targetCurrentA === 6, 'Min+PV-Basis wird bei Stromsteuerung nicht als 6-A-Sollwert ausgegeben.', minPv);
    assert(minPv.pvUsedW === 0, 'Min+PV-Basis belastet im finalen Plan das PV-Budget.', minPv);

    const purePv = finalPlan([powerWallbox('pv_zero_pv', 'pv', 7000)], 10000, 0).wallboxes[0];
    assert(purePv.targetPowerW === 0, 'Reines PV-Laden wird durch die Min+PV-Korrektur unbeabsichtigt netzgestuetzt.', purePv);

    const auto = finalPlan([powerWallbox('auto_zero_pv', 'auto', 7000)], 10000, 0).wallboxes[0];
    assert(auto.targetPowerW === 7000, 'Auto wird faelschlich durch die PV-Priorisierung begrenzt.', auto);

    const boost = finalPlan([powerWallbox('boost_zero_pv', 'boost', 7000)], 10000, 0).wallboxes[0];
    assert(boost.targetPowerW === 7000, 'Boost wird faelschlich durch die PV-Priorisierung begrenzt.', boost);

    const stationOk = finalPlan([currentWallbox('minpv_station_ok', 'minpv', 7000, 5000)], 10000, 0).wallboxes[0];
    assert(stationOk.targetPowerW === 4140, 'Min+PV-Basis respektiert ein ausreichendes Stationslimit nicht.', stationOk);

    const stationStop = finalPlan([currentWallbox('minpv_station_stop', 'minpv', 7000, 4000)], 10000, 0).wallboxes[0];
    assert(stationStop.targetPowerW === 0, 'Min+PV umgeht ein Stationslimit unterhalb der technischen Mindestleistung.', stationStop);
  }

  // Quellcode-Gate: Die PV-Prioritaet darf Min+PV nicht als reines PV-Laden
  // behandeln, und alle EVCS-Bedienwege muessen den schnellen zentralen Tick nutzen.
  {
    const runtimeSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
    const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
    const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
    assert(runtimeSource.includes("if (effMode === 'pv' && pendingPvRemainingW <= 0) continue;"), 'Pending-Pfad trennt PV-only und Min+PV nicht.');
    assert(!runtimeSource.includes('if (pendingPvRemainingW <= 0) break;'), 'Alter globaler PV-Break blockiert weiterhin Min+PV-Basisbedarf.');
    assert(runtimeSource.includes('const minPvPlan = computeMinPvAllocationW({'), 'Min+PV-Hauptallokation verwendet den gemeinsamen Basishelfer nicht.');
    assert(mainSource.includes('_nwRequestImmediateEmsTick(`api:${id}`);'), 'API-Moduswechsel fordert keinen unmittelbaren EMS-Tick an.');
    assert(mainSource.includes("userMode|userEnabled|userPhaseMode|userStorageAssistEnabled|goalEnabled"), 'Externe EVCS-State-Aenderungen fehlen im schnellen Reaktionspfad.');
    assert(engineSource.includes('requestImmediateTick(reason = \'external-control\')'), 'EMS-Engine bietet keinen debouncten unmittelbaren Tick an.');
  }

  // Dynamischer Debounce-Test: API-Write und nachfolgender StateChange duerfen
  // nicht zwei parallele Regelzyklen erzeugen. Stoppen der Engine muss den Timer
  // sicher entfernen.
  {
    const adapter = {
      _nwShuttingDown: false,
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (timer) => clearTimeout(timer),
      log: { warn: () => {} },
    };
    const engine = new EmsEngine(adapter);
    engine.dp = {};
    engine.mm = {};
    let ticks = 0;
    engine.tick = async () => { ticks += 1; };

    assert(engine.requestImmediateTick('api:userMode') === true, 'Erster unmittelbarer Tick wird nicht angenommen.');
    assert(engine.requestImmediateTick('state:userMode') === true, 'Debounce lehnt die zusammengehoerige StateChange-Anforderung ab.');
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert(ticks === 1, 'API und StateChange erzeugen mehr als einen unmittelbaren EMS-Tick.', { ticks });

    assert(engine.requestImmediateTick('api:cancel-test') === true, 'Abbruchtest konnte keinen Timer anlegen.');
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert(ticks === 1, 'Engine-Stop laesst einen verspäteten unmittelbaren Tick weiterlaufen.', { ticks });
  }

  console.log('[charging-minpv-base-mode-reaction] OK: Min+PV-Basis, PV-Trennung, harte Limits und schnelle Modusreaktion sind abgesichert.');
}

run().catch((error) => fail(error && error.stack ? error.stack : String(error)));
