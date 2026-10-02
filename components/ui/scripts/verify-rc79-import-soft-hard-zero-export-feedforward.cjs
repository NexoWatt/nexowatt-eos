#!/usr/bin/env node
'use strict';

/**
 * RC79/RC80 regression – versionsneutraler Sicherheitsvertrag
 * - zweistufiges Import Soft-/Hard-Limit mit signiertem NVP
 * - 0-Einspeise-PV-Feed-forward nach realer lokaler Aufnahme + Speicherladung
 * - keine PV-Abregelung bei gleichzeitiger Speicherentladung
 * - AppCenter-Zuordnung unter Netzlimits
 * - Objektinitialisierung vor Cold-Start-Safe-Stop
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const {
  resolveAutoReserveW,
  resolveGridImportLimitPolicy,
  resolveZeroExportPvTarget,
} = require(path.join(root, 'ems/services/grid-import-limit-policy.js'));
const { GridConstraintsModule } = require(path.join(root, 'ems/modules/grid-constraints.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function makeGridRuntime({ pvActualW = 20000, initialLimitW = null } = {}) {
  const states = new Map();
  const writes = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { enableGridConstraints: true, gridConstraints: {} },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, value) {
      const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
      states.set(id, val);
      return true;
    },
    async getStateAsync(id) {
      return states.has(id) ? { val: states.get(id), ack: true, ts: Date.now() } : null;
    },
  };
  const dp = {
    // Wie die produktive Registry muss der zuletzt konfigurierte Ausgang
    // eindeutig zum aktuellen Gruppenindex passen (kein ungebundener Stub).
    getEntry(key) {
      const match = /^pv\.zero\.(\d+)\.(feedInLimitW|limitW|limitPct)$/.exec(key);
      if (!match) return null;
      const row = adapter.config.gridConstraints.pvCurtailInvertersZero?.[Number(match[1])];
      const field = { feedInLimitW: 'feedInLimitWId', limitW: 'pvLimitWId', limitPct: 'pvLimitPctId' }[match[2]];
      const objectId = row?.[field];
      return objectId ? { objectId, dataType: 'number', direction: 'out' } : null;
    },
    getNumberFresh(key, _maxAgeMs, fallback = null) {
      if (key === 'ps.pvW') return pvActualW;
      return fallback;
    },
    getNumber(_key, fallback = null) { return fallback; },
    getBoolean(_key, fallback = false) { return fallback; },
    async writeNumber(key, value) {
      writes.push({ key, value: Number(value) });
      return true;
    },
  };
  const module = new GridConstraintsModule(adapter, dp);
  if (initialLimitW !== null) module._pv.limitW = initialLimitW;
  return { adapter, dp, module, states, writes };
}

(async () => {
  const pkg = JSON.parse(read('package.json'));
  const io = JSON.parse(read('io-package.json'));
  // Der RC-Vertrag gilt auch für spätere Patchstände. Entscheidend ist eine
  // gültige und über alle Release-Metadaten synchronisierte SemVer-Version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(io.common.version, pkg.version);

  // 1) RC80-Korrektur: immer exakt 10 %, ohne Mindest-/Maximalwert.
  assert.strictEqual(resolveAutoReserveW(5000, 0), 500);
  assert.strictEqual(resolveAutoReserveW(30000, 0), 3000);
  assert.strictEqual(resolveAutoReserveW(100000, 0), 10000);
  assert.strictEqual(resolveAutoReserveW(30000, 2500), 3000, 'Legacy-Reserve darf die feste 10-%-Regel nicht ueberschreiben');

  // 2) Feldfall: -10,1 kW Einspeisung erweitert beide Headrooms.
  {
    const p = resolveGridImportLimitPolicy({
      nowMs: 100000,
      hardLimitW: 30000,
      softLimitEnabled: true,
      softLimitW: 27000,
      signedNvpW: -10100,
      nvpUsable: true,
    });
    assert.strictEqual(p.hardLimitW, 30000);
    assert.strictEqual(p.softLimitW, 27000);
    assert.strictEqual(p.hardHeadroomW, 40100);
    assert.strictEqual(p.softHeadroomW, 37100);
    assert.strictEqual(p.stage, 'normal');
  }

  // 3) Soft greift vorausschauend; Hard bleibt absolute Stufe.
  {
    const soft = resolveGridImportLimitPolicy({ hardLimitW: 30000, softLimitW: 27000, signedNvpW: 27500, nvpUsable: true });
    assert.strictEqual(soft.stage, 'soft');
    assert.strictEqual(soft.requiredReductionW, 500);
    const hard = resolveGridImportLimitPolicy({ hardLimitW: 30000, softLimitW: 27000, signedNvpW: 30500, nvpUsable: true });
    assert.strictEqual(hard.stage, 'hard');
    assert.strictEqual(hard.hardExcessW, 500);
    assert.strictEqual(hard.requiredReductionW, 3500, 'Hard-Stufe muss bis zum sicheren Soft-Ziel zurueckregeln');
  }

  // 4) Hysterese + Zeitverzoegerung verhindern Flattern.
  {
    const held = resolveGridImportLimitPolicy({
      nowMs: 10000,
      hardLimitW: 30000,
      softLimitW: 27000,
      signedNvpW: 26000,
      nvpUsable: true,
      previousStage: 'soft',
      hysteresisW: 500,
      releaseDelaySec: 10,
      releaseCandidateAtMs: 5000,
    });
    assert.strictEqual(held.stage, 'soft');
    assert.strictEqual(held.releasePending, true);
    const released = resolveGridImportLimitPolicy({
      nowMs: 16000,
      hardLimitW: 30000,
      softLimitW: 27000,
      signedNvpW: 26000,
      nvpUsable: true,
      previousStage: 'soft',
      hysteresisW: 500,
      releaseDelaySec: 10,
      releaseCandidateAtMs: 5000,
    });
    assert.strictEqual(released.stage, 'normal');
  }

  // 5) Reine Feed-forward-Formel: 20 kW PV, 7 kW Export, 50 W Zielbezug.
  {
    const f = resolveZeroExportPvTarget({ ratedPvW: 20000, pvActualW: 20000, projectedNvpW: -7000, targetNvpW: 50, currentLimitW: 20000 });
    assert.strictEqual(f.usable, true);
    assert.strictEqual(f.localAbsorptionW, 13000);
    assert.strictEqual(f.targetW, 12950);
    assert.strictEqual(f.feedbackCorrectionW, -7050);
  }

  // 6) Ohne Speicheraufnahme bleiben bei 7 kW Verbraucher nur 6,95 kW PV-Ziel.
  {
    const f = resolveZeroExportPvTarget({ ratedPvW: 20000, pvActualW: 20000, projectedNvpW: -13000, targetNvpW: 50, currentLimitW: 20000 });
    assert.strictEqual(f.localAbsorptionW, 7000);
    assert.strictEqual(f.targetW, 6950);
  }

  // 7) Speicher entlaedt bei abgeregelter PV: PV muss voll freigegeben werden.
  {
    const f = resolveZeroExportPvTarget({
      ratedPvW: 20000,
      pvActualW: 10000,
      projectedNvpW: 0,
      targetNvpW: 50,
      storageActualW: 3000,
      storageTargetW: 3000,
      currentLimitW: 10000,
    });
    assert.strictEqual(f.storageDischargeConflict, true);
    assert.strictEqual(f.targetW, 20000);
    assert.strictEqual(f.reason, 'release-for-storage-discharge');
  }

  // 8) Produktiver Gruppenpfad schreibt das exakte Feed-forward-Ziel.
  {
    const { adapter, module, writes, states } = makeGridRuntime({ pvActualW: 20000 });
    const cfg = {
      zeroExportEnabled: true,
      zeroExportInstallerApproved: true,
      zeroExportMaxExportW: 0,
      zeroExportBiasW: 50,
      zeroExportDeadbandW: 15,
      pvCurtailFastTripExportW: 500,
      pvCurtailMaxDeltaWPerTick: 8000,
      pvCurtailInvertersZero: [{ name: 'WR1', kwp: 20, pvLimitWId: 'wr.limitW', pvLimitPctId: 'wr.limitPct' }],
    };
    adapter.config.gridConstraints = cfg;
    const result = await module._tickZeroExportGroup(Date.now(), -7000, cfg, false, {
      rawGridW: -13000,
      controlGridW: -7000,
      storageActualW: 0,
      storageTargetW: -6000,
      storageCommandCredited: true,
    });
    assert.strictEqual(result.setpointW, 12950);
    assert.strictEqual(result.feedForward.localAbsorptionW, 13000);
    assert.strictEqual(writes.find((w) => w.key === 'pv.zero.0.limitW').value, 12950);
    assert.strictEqual(states.get('gridConstraints.zeroExport.pvFeedForwardTargetW'), 12950);
    assert.strictEqual(states.get('gridConstraints.zeroExport.storageTargetW'), -6000);
  }

  // 9) Produktiver Gruppenpfad loest eine PV-/Speicher-Gegenregelung sofort auf.
  {
    const { adapter, module, writes, states } = makeGridRuntime({ pvActualW: 10000, initialLimitW: 10000 });
    const cfg = {
      zeroExportEnabled: true,
      zeroExportInstallerApproved: true,
      zeroExportMaxExportW: 0,
      zeroExportBiasW: 50,
      zeroExportDeadbandW: 15,
      pvCurtailInvertersZero: [{ name: 'WR1', kwp: 20, pvLimitWId: 'wr.limitW', pvLimitPctId: 'wr.limitPct' }],
    };
    adapter.config.gridConstraints = cfg;
    const result = await module._tickZeroExportGroup(Date.now(), 0, cfg, false, {
      rawGridW: 0,
      controlGridW: 0,
      storageActualW: 3000,
      storageTargetW: 3000,
    });
    assert.strictEqual(result.setpointW, 20000);
    assert.strictEqual(result.action, 'group_release_storage_discharge');
    assert.strictEqual(writes.find((w) => w.key === 'pv.zero.0.limitW').value, 20000);
    assert.strictEqual(states.get('gridConstraints.zeroExport.storageDischargeConflict'), true);
  }

  // 10) AppCenter: 0-Einspeisung liegt unter Netzlimits, EVU bleibt getrennt.
  {
    const html = read('www/ems-apps.html');
    const gridStart = html.indexOf('id="nw-tabpanel-grid"');
    const zero = html.indexOf('id="gridConstraintsZero"');
    const evuTab = html.indexOf('id="nw-tabpanel-evupv"');
    const evu = html.indexOf('id="gridConstraintsEvu"');
    assert(gridStart >= 0 && zero > gridStart && zero < evuTab, '0-Einspeisung muss unter Netzlimits stehen');
    assert(html.indexOf('id="gridConstraintsImportLimits"') > gridStart);
    assert(evu > evuTab, 'EVU-Relaiskarte muss im EVU/PV-Tab stehen');
    assert(!html.includes('id="gotoEvuPvTab"'));
    const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
    assert(ui.includes("gridConstraintsImportLimits: document.getElementById('gridConstraintsImportLimits')"));
    assert(ui.includes("gridConstraintsEvu: document.getElementById('gridConstraintsEvu')"));
    assert(ui.includes('PV‑Vorgabe folgt dynamisch der lokalen Aufnahme'));
  }

  // 11) Cold-Start-Warnungen: Objektstruktur wird vor deactivate() angelegt.
  {
    const manager = read('src-ts/runtime-executables/ems/module-manager.ts');
    assert(manager.includes("this._ensureModuleInitialized(m, 'module-disabled-object-init', cycleId)"));
    const thermal = read('src-ts/runtime-executables/ems/modules/thermal-control.ts');
    const threshold = read('src-ts/runtime-executables/ems/modules/threshold-control.ts');
    assert(thermal.includes("await mk('thermal.summary.appliedTotalW'"));
    assert(thermal.includes("await mk('thermal.summary.budgetUsedW'"));
    assert(thermal.includes("await mk('thermal.summary.status'"));
    assert(threshold.includes('threshold.rules.r${i}.status'));
    assert(threshold.includes('threshold.rules.r${i}.output'));
    assert(threshold.includes('threshold.rules.r${i}.lastWriteOk'));
    assert(threshold.includes('threshold.rules.r${i}.readbackOk'));
  }

  // 12) Soft ist Planung, Hard bleibt im finalen Safety-Writer.
  {
    const core = read('src-ts/runtime-executables/ems/modules/core-limits.ts');
    const charging = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
    const safety = read('src-ts/runtime-executables/ems/services/safety-envelope.ts');
    assert(core.includes('gridImportLimitW_planning'));
    assert(core.includes("'grid-soft'"));
    assert(charging.includes('gridImportLimitPlanningW'));
    assert(safety.includes('maxImportW - signedNvpW'));
    assert(!safety.includes('gridImportLimitW_planning'));
  }

  assert(read('src-ts/runtime-executables/www/sw.ts').match(/const CACHE_NAME = 'nexowatt-cache-v\d+'/));
  console.log('[RC79] OK: Import Soft-/Hard-Limit, signierter NVP, 0-Einspeise-PV-Feed-forward, Speicher-Konfliktschutz, AppCenter-Platzierung und Cold-Start-Objektinitialisierung geprueft.');
})().catch((error) => {
  console.error('[RC79] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
