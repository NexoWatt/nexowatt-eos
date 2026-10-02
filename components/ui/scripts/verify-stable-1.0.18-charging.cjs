#!/usr/bin/env node
'use strict';
/**
 * Regression 1.0.18: reale finale Sollwerte bei Wolken, Mindestpause und Boost.
 * Transpiliert kanonische Quellen nur im Speicher. Die Tests prüfen Wirkung,
 * nicht nur vorhandene Textmarker; kein ioBroker und keine echte Hardware nötig.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const m = { exports: {} }; new Function('module', 'exports', 'require', code)(m, m.exports, require); return m.exports;
}
const ze = load('src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts');
const { buildChargingAllocationShadowPlan: allocatePlan } = load('src-ts/ems/charging-management/charging-allocation.ts');
const { buildChargingPhaseSelectionPlan: phasePlan } = load('src-ts/ems/charging-management/charging-phase-selection.ts');
let clock = 2000000000000;
const point = { safe: 'lp1', enabled: true, online: true, vehiclePlugged: true, vehicleDemandConfirmed: true,
  effectiveMode: 'pv', userMode: 'pv', chargerType: 'AC', controlBasis: 'current', phases: 1, voltageV: 230,
  currentPhaseCount: 1, minA: 6, maxA: 32, minPowerW: 1380, maxPowerW: 7360, stepA: 0.1,
  actualPowerW: 1380, setAKey: 'point.current', targetPowerW: 1380 };
function allocated(wb, pv = 1200, other = {}) {
  return allocatePlan({ ts: clock, budgetW: 30000, pvPhysicalAvailableW: pv, pvPureAvailableW: pv,
    preferTsNativeAllocation: false, wallboxes: [wb], ...other }).wallboxes[0];
}
function fixture(overrides = {}) {
  const a = { config: { gridConstraints: { zeroExportEnabled: true, ...overrides } } };
  const sample = (extra = {}) => ze.updateZeroExportProbe(a, { now: clock, gridFresh: true, gridW: 180,
    pvFresh: true, pvW: 3200, storageFresh: true, storageDischargeW: 0, safetyReady: true,
    externalBlocked: false, tariffCurtail: false, ...extra });
  const note = (commandW, extra = {}) => ze.noteZeroExportEvcsCommand(a, { key: 'evcs:lp1', now: clock,
    mode: 'pv', commandW, actualW: 1380, actualFresh: true, technicalMinW: 1380, ...extra });
  const request = (extra = {}) => ze.requestZeroExportHold(a, { key: 'evcs:lp1', now: clock,
    eligible: true, actualFresh: true, actualW: 1380, baseW: 1200, technicalMinW: 1380, maxW: 3680, ...extra });
  sample(); note(1380); return { a, sample, note, request };
}

// Konkreter Befund: vorher sofort 0 bei 180-W-Defizit; jetzt explizite, endliche
// Netzbrücke bis in den produktiven Allokator. Der PV-Anteil bleibt 1200 W.
{
  const f = fixture(); const grant = f.request();
  assert.equal(grant.extraW, 180); assert.equal(allocated(point).targetPowerW, 0);
  const p = allocated({ ...point, zeroExportProbeExtraW: grant.extraW, zeroExportProbeValidUntil: grant.validUntil });
  assert.equal(p.targetPowerW, 1380); assert.equal(p.pvUsedW, 1200);
  const began = clock;
  for (let i = 1; i <= 44; i++) { clock = began + i * 1000; f.sample(); assert(f.request().granted); }
  clock = began + 45000; f.sample(); assert.equal(f.request().granted, false, 'Kein Verlängern durch Tick-Aufrufe');
  f.note(0); const pause = ze.zeroExportEvcsPauseUntil(f.a, 'evcs:lp1', clock);
  assert.equal(pause, clock + 180000);
  assert.equal(allocated({ ...point, zeroExportRestartUntilMs: pause }, 7000).targetPowerW, 0, 'Sonne hebt Mindestauszeit nicht auf');
  clock += 179000; f.sample(); f.note(0); assert.equal(ze.zeroExportEvcsPauseUntil(f.a, 'evcs:lp1', clock), pause, '0 wiederholen verlängert Pause nicht');
  clock = pause; f.sample(); assert.equal(ze.zeroExportEvcsPauseUntil(f.a, 'evcs:lp1', clock), 0);
}
for (const change of [{ gridFresh: false }, { pvFresh: false }, { storageFresh: false }, { storageDischargeW: 60 },
  { safetyReady: false }, { externalBlocked: true }, { tariffCurtail: true }, { gridW: 681 }]) {
  const f = fixture(); f.sample(change); assert.equal(f.request().granted, false, JSON.stringify(change));
}
for (const change of [{ eligible: false }, { actualFresh: false }, { actualW: 0 }, { maxW: 1000 },
  { phaseTransition: true }, { baseW: 700 }]) {
  const f = fixture(); assert.equal(f.request(change).granted, false, JSON.stringify(change));
}
for (const config of [{ zeroExportEnabled: false }, { zeroExportPvHoldMaxW: 0 }, { zeroExportPvHoldSec: 0 }, { exportLimitRunMode: 'diagnostic' }]) {
  assert.equal(fixture(config).request().granted, false, JSON.stringify(config));
}
{
  const f = fixture(); const g = f.request();
  assert(ze.isZeroExportGrantValid(f.a, 'evcs:lp1', g.leaseId, clock));
  f.a.config.gridConstraints.zeroExportPvHoldMaxW = 100;
  assert.equal(ze.isZeroExportGrantValid(f.a, 'evcs:lp1', g.leaseId, clock), false, 'Geändertes Limit wirkt noch am Writer');
}
{
  const f = fixture(); f.note(1380, { key: 'evcs:lp2' });
  assert.equal(f.request({ baseW: 980 }).extraW, 400);
  assert.equal(f.request({ key: 'evcs:lp2', baseW: 980 }).granted, false, 'Gemeinsames Limit statt 600 W je LP');
  assert.equal(f.request({ key: 'evcs:lp2', baseW: 1280 }).extraW, 100);
  assert.equal(f.a._zeroExportPvCoordinator.snapshot().evcsHoldW, 500);
}
{
  const f = fixture(); f.request(); const start = clock;
  for (let i = 1; i < 45; i++) {
    clock = start + i * 1000; f.sample({ gridW: 0 }); f.request({ baseW: i % 10 === 0 ? 1200 : 1380 });
  }
  clock = start + 45000; f.sample(); assert.equal(f.request().granted, false, 'Kurze Erholungen starten Frist nicht neu');
}
{
  const f = fixture(); f.request();
  for (let i = 0; i <= 10; i++) { clock += 1000; f.sample({ gridW: 0 }); f.request({ baseW: 1380 }); }
  assert.equal(f.a._zeroExportPvCoordinator.evcsRuns.get('evcs:lp1').episodeAt, 0);
  clock += 1000; f.sample(); assert(f.request().granted, 'Nach stabiler Erholung neue Wolke überbrückbar');
}
{
  const f = fixture(); f.note(0, { phaseTransition: true });
  assert.equal(ze.zeroExportEvcsPauseUntil(f.a, 'evcs:lp1', clock), 0, 'Geplanter Phasenwechsel ist keine Wolkenpause');
}

// Ab 1.0.19 ist der Wert ausdrücklich NETZanteil, kein Gesamtmaximum.
// Die alten elektrischen Prüfungen laufen deshalb ohne PV; zusätzliche PV,
// Auto und Mehrpunktverteilung werden in verify-stable-1.0.19 geprüft.
const boost = { ...point, effectiveMode: 'boost', userMode: 'boost', targetPowerW: 22000, zeroExportGridMaxW: 3700, actualPowerW: 0 };
assert.equal(allocated(boost, 0).targetPowerW, 3680);
assert.equal(allocated({ ...boost, phases: 3, currentPhaseCount: 3, minPowerW: 4140, maxPowerW: 22080 }, 0).targetPowerW, 0);
for (const bad of [0, -10, 'broken', true]) assert.equal(allocated({ ...boost, zeroExportGridMaxW: bad }, 0).targetPowerW, 0);
assert.equal(allocated({ ...boost, zeroExportGridMaxW: null }, 0).targetPowerW, 7360);
assert.equal(allocated({ ...boost, effectiveMode: 'minpv', userMode: 'minpv', zeroExportGridMaxW: 0 }, 5000).targetPowerW > 0, true);
assert.equal(allocated({ ...boost, stationKey: 'station', stationMaxPowerW: 2000 }, 0).targetPowerW, 1978);
const dc = { ...boost, chargerType: 'DC', controlBasis: 'power', minPowerW: 2000, maxPowerW: 40000, stepW: 100, setWKey: 'dc.power' };
assert.equal(allocated(dc, 0).targetPowerW, 3700);
assert.equal(allocated({ ...dc, minPowerW: 4000 }, 0).targetPowerW, 0);
function phases(change = {}, input = {}) {
  return phasePlan({ now: clock, budgetW: 22000, phaseAutoEnabled: true,
    wallboxes: [{ ...boost, phaseMode: 'auto-pv', currentPhaseCount: 3, phases: 3,
      phaseSwitchKey: 'point.phase', supportsPhaseSwitch: true, charging: true, lowSinceMs: clock - 121000, ...change }], ...input }).wallboxes[0];
}
assert.equal(phases().targetPhaseCount, 1); assert.equal(phases().switchCommandAllowed, false);
assert.equal(phases({ charging: false, actualPowerW: 0 }).switchCommandAllowed, true);
assert.equal(phases({ phaseMode: 'fixed-3p' }).targetPhaseCount, 3);
assert.equal(phases({ cooldownUntilMs: clock + 1000 }).switchRequired, false);
assert.equal(phases({}, { phaseAutoEnabled: false }).switchRequired, false);
assert.equal(phases({ chargerType: 'DC' }).switchRequired, false);
console.log('[1.0.18] OK: begrenzte Überbrückung, Auszeit, Mess-/Schutzgrenzen, gemeinsames Budget, Boost AC/DC und Phasenwahl');

// Echte Formular-Handler und gespeicherte LP-Zeile, einschließlich leer/0 und
// getrennten Ladepunkten. Die Main-Normalisierung erhält denselben Wert.
for (const rel of ['src-ts/runtime-executables/www/ems-apps.ts', 'src-ts/runtime-mirrors/www/ems-apps.ts']) {
  const source = ts.createSourceFile(rel, fs.readFileSync(path.join(root, rel), 'utf8'), ts.ScriptTarget.Latest, true);
  const wanted = ['_buildEvcsBoostLimitInput', '_ensureSettingsConfig', '_ensureEvcsList', '_updateEvcsField'];
  const parts = [];
  const visit = node => { if (ts.isFunctionDeclaration(node) && wanted.includes(node.name?.text)) parts.push(node.getText(source)); ts.forEachChild(node, visit); };
  visit(source); assert.equal(parts.length, wanted.length);
  const context = vm.createContext({ currentConfig: { settingsConfig: { evcsCount: 2, evcsList: [{}, { boostMaxPowerW: 11000 }] } },
    _clampInt: (n, min, max) => Math.min(max, Math.max(min, Number(n))), _maxEvcsCount: () => 99,
    document: { createElement: () => ({ dataset: {}, handlers: {}, addEventListener(name, cb) { this.handlers[name] = cb; } }) } });
  vm.runInContext(ts.transpile(parts.join('\n'), { target: ts.ScriptTarget.ES2022 }), context);
  const control = context._buildEvcsBoostLimitInput({}, value => context._updateEvcsField(1, 'boostMaxPowerW', value));
  for (const [value, expected] of [['3700', 3700], ['0', 0], ['', null]]) {
    control.value = value; control.handlers.change();
    assert.equal(context.currentConfig.settingsConfig.evcsList[0].boostMaxPowerW, expected);
    assert.equal(context.currentConfig.settingsConfig.evcsList[1].boostMaxPowerW, 11000);
    const rebuilt = context._buildEvcsBoostLimitInput(context.currentConfig.settingsConfig.evcsList[0], () => {});
    assert.equal(rebuilt.value, value);
  }
  control.value = '-1'; control.handlers.change();
  assert.equal(context.currentConfig.settingsConfig.evcsList[0].boostMaxPowerW, null, 'Negativer Editorwert wird abgewiesen');
}

async function runtimeChecks() {
  const originalLoad = Module._load, previousNow = Date.now, installed = [];
  Date.now = () => clock;
  function install(src, dest) {
    const filename = path.join(root, dest), m = new Module(filename, module);
    m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
    installed.push([filename, require.cache[filename]]); require.cache[filename] = m;
    m._compile(ts.transpileModule(fs.readFileSync(path.join(root, src), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, filename);
  }
  Module._load = function(request, parent, main) {
    return String(request).endsWith('/zero-export-pv-coordinator') ? ze : originalLoad.call(this, request, parent, main);
  };
  try {
    install('src-ts/ems/charging-management/charging-allocation.ts', 'lib/ts-mirrors/ems/charging-management/charging-allocation.js');
    install('src-ts/ems/charging-management/charging-phase-selection.ts', 'lib/ts-mirrors/ems/charging-management/charging-phase-selection.js');
    install('src-ts/runtime-executables/ems/modules/charging-management.ts', 'ems/modules/charging-management.js');
    install('src-ts/runtime-executables/ems/engine.ts', 'ems/engine.js');
    const { EmsEngine } = require('../ems/engine');
    const filename = path.join(root, 'scripts/verify-rc60-universal-auto-wallbox.js');
    const code = fs.readFileSync(filename, 'utf8'), m = new Module(filename, module);
    m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(code.slice(0, code.indexOf('async function withHarness')) + '\nmodule.exports = {makeHarness};', filename);
    for (const phaseCount of [1, 3]) {
      const engine = new EmsEngine({ namespace: 'nexowatt-ui.0', evcsList: [{ index: 1, enabled: true,
        chargerType: 'AC', phases: phaseCount, phaseMode: `fixed-${phaseCount}p`, minCurrentA: 6, maxCurrentA: 16,
        setCurrentAId: 'test.wallbox.current', powerId: 'test.wallbox.powerW', boostMaxPowerW: 3700 }],
        config: { settingsConfig: { evcsMaxPowerKw: 11 }, datapoints: {}, chargingManagement: {} } });
      const bridged = engine._buildChargingConfig().chargingCfg.wallboxes[0];
      assert.equal(bridged.boostMaxPowerW, 3700, 'Konfigurationsbrücke muss Boost-Maximum erhalten');
      const h = m.exports.makeHarness({ userMode: 'boost', pvW: 10000, totalBudgetW: 22000,
        wallbox: { ...bridged, setCurrentAId: 'test.wallbox.setCurrentA' } });
      try {
        h.adapter.config.gridConstraints = { zeroExportEnabled: true };
        delete h.module._publishChargingAllocationTsShadow;
        const out = await h.tick();
        assert.equal(out.targetPowerW, phaseCount === 1 ? 3680 : 0, JSON.stringify(out));
        assert(h.writes.every(w => w.key !== 'cm.wb.lp1.setA' || w.value * 230 * phaseCount <= 3700));
      } finally { h.stop(); }
    }
    const hp = m.exports.makeHarness({ userMode: 'boost', pvW: 10000, actualPowerW: 6000, status: 'Charging',
      wallbox: { phases: 3, phaseMode: 'auto-pv', phaseSwitchId: 'test.phase', phaseFeedbackId: 'test.phaseFeedback',
        phaseSwitchSettleSec: 5, boostMaxPowerW: 3700 }, objectValues: { 'test.phaseFeedback': 3 } });
    try {
      hp.adapter.config.gridConstraints = { zeroExportEnabled: true };
      delete hp.module._publishChargingAllocationTsShadow;
      delete hp.module._publishChargingPhaseSelectionRuntimeStates;
      delete hp.module._publishChargingStationDiagnosticsFromAllocationPlan;
      const phaseTick = async () => { hp.adapter._emsBudget.ts = clock; hp.adapter._nvpFreshnessSnapshot.ts = clock; return hp.tick(); };
      assert.equal((await phaseTick()).targetPowerW, 0, '3p-Boost zunächst stoppen');
      assert(!hp.writes.some(w => w.key === 'cm.wb.lp1.phaseSet'), 'Kein Schalten unter Last');
      hp.setObject('test.wallbox.powerW', 0); hp.setObject('test.wallbox.status', 'B2');
      for (let i = 0; i < 160 && !hp.writes.some(w => w.key === 'cm.wb.lp1.phaseSet'); i++) { clock += 1000; await phaseTick(); }
      assert(hp.writes.some(w => w.key === 'cm.wb.lp1.phaseSet' && w.value === 1), 'Boost-Limit veranlasst erlaubten 1p-Wechsel');
      hp.setObject('test.phaseFeedback', 1);
      clock += 1000; assert.equal((await phaseTick()).targetPowerW, 0, 'Einschwingen auch bei Boost');
      clock += 5000; assert.equal((await phaseTick()).targetPowerW, 3680, '1p-Boost nach Wechsel unter 3700 W');
    } finally { hp.stop(); }
    const h = m.exports.makeHarness({ userMode: 'pv', pvW: 1380, actualPowerW: 1380, status: 'Charging',
      wallbox: { phases: 1, phaseMode: 'fixed-1p' } });
    try {
      h.adapter.config.gridConstraints = { zeroExportEnabled: true };
      h.adapter.config.chargingManagement.pvStartDelaySec = 0;
      delete h.module._publishChargingAllocationTsShadow;
      delete h.module._publishChargingPhaseSelectionRuntimeStates;
      const tick = async (pv, grid = 0) => {
        h.setObject('test.wallbox.powerW', h.objectValues.get('test.wallbox.powerW'), clock);
        const b = h.adapter._emsBudget; b.ts = clock; b.gates.pv = { effectiveW: pv, rawW: pv };
        b.gates.pvAllocation = { totalW: pv, evcsCapW: pv, mode: 'evcs', evcsSharePct: 100 }; b.remainingPvW = pv;
        h.adapter._nvpFreshnessSnapshot.ts = clock;
        ze.updateZeroExportProbe(h.adapter, { now: clock, gridFresh: true, gridW: grid, pvFresh: true, pvW: 2000 + pv,
          storageFresh: true, storageDischargeW: 0, safetyReady: true, externalBlocked: false, tariffCurtail: false });
        return h.tick();
      };
      assert.equal((await tick(1380)).targetPowerW, 1380);
      const began = clock + 1000;
      for (let i = 0; i < 45; i++) {
        clock = began + i * 1000; const out = await tick(1200, 180);
        assert.equal(out.targetPowerW, 1380, JSON.stringify({ i, out, state: h.adapter._zeroExportPvCoordinator.snapshot() }));
      }
      clock = began + 45000; assert.equal((await tick(1200, 180)).targetPowerW, 0, 'Ende der festen 45s-Brücke');
      h.setObject('test.wallbox.powerW', 0); h.setObject('test.wallbox.status', 'B2');
      for (let i = 1; i < 180; i++) { clock = began + 45000 + i * 1000; assert.equal((await tick(5000)).targetPowerW, 0, `Pause ${i}`); }
      clock += 20000; await tick(5000); clock += 11000;
      assert((await tick(5000)).targetPowerW >= 1380, 'Nach Mindestauszeit und Startstabilität wieder laden');
      // Die Hardware-Freigabe bleibt Operative; nur der Leistungs-Sollwert pausiert.
      assert(h.writes.filter(w => w.key === 'cm.wb.lp1.enable').every(w => w.value !== false));
    } finally { h.stop(); }
  } finally {
    Module._load = originalLoad; Date.now = previousNow;
    for (const [filename, old] of installed) { if (old) require.cache[filename] = old; else delete require.cache[filename]; }
  }
  console.log('[1.0.18] OK: echte Regelticks/Writer für Boost 1p/3p, Wolke45s, Wiederanlaufsperre180s und Erholung');
}
runtimeChecks().catch(error => { console.error(error); process.exitCode = 1; });
