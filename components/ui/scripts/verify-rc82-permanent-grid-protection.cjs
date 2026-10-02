#!/usr/bin/env node
'use strict';

/**
 * RC82 – versionsneutraler Sicherheitsvertrag
 * Permanenter Netzlimits-Kernschutz:
 * - Netzlimits ist in Home und Pro verfügbar und als Pflicht-App normalisiert.
 * - Legacy/AppCenter/Backup-Flags können den Import-/NVP-Schutz nicht abschalten.
 * - Anschlussleistung und signierter NVP bleiben ausschließlich in Zuordnung → Allgemein.
 * - Hard = 100 %, Soft = 90 %, Reserve = exakt 10 %.
 * - 0-Einspeisung bleibt eine separat optionale, standardmäßig ausgeschaltete Funktion.
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const featureFlags = require(path.join(root, 'ems/services/feature-flags.js'));
const { GridConstraintsModule } = require(path.join(root, 'ems/modules/grid-constraints.js'));
const { CoreLimitsModule } = require(path.join(root, 'ems/modules/core-limits.js'));

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0, `Startmarker fehlt: ${startMarker}`);
  assert(end > start, `Endmarker fehlt: ${endMarker}`);
  return source.slice(start, end);
}

(() => {
  const pkg = readJson('package.json');
  const io = readJson('io-package.json');
  // Der RC-Vertrag gilt auch für spätere Patchstände. Entscheidend ist eine
  // gültige und über alle Release-Metadaten synchronisierte SemVer-Version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(io.common.version, pkg.version);

  // 1) Netzschutz gehört zu Home und Pro. Die sichtbare Featurematrix bleibt
  //    lizenzgebunden, der eigentliche Sicherheitskern wird davon aber nicht abgeschaltet.
  assert.strictEqual(featureFlags.allowsApp('hems', 'grid'), true);
  assert.strictEqual(featureFlags.allowsApp('eos', 'grid'), true);
  assert.strictEqual(featureFlags.allowsApp('none', 'grid'), false);
  assert.strictEqual(featureFlags.allowsFeature('hems', 'gridConstraints'), true);
  assert.strictEqual(featureFlags.allowsFeature('hems', 'gridLimits'), true);
  assert(featureFlags.homeIncludedApps().includes('grid'));
  assert(!featureFlags.eosOnlyFeatures().includes('gridConstraints'));
  assert(!featureFlags.eosOnlyFeatures().includes('gridLimits'));

  // 2) Das Grid-Modul ignoriert das entfernte Legacy-Aktivierungsflag.
  const adapter = {
    config: {
      enableGridConstraints: false,
      installerConfig: { gridConnectionPower: 30000 },
      datapoints: { gridPointPower: 'test.0.nvp' },
      gridConstraints: { zeroExportEnabled: false },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync() {},
  };
  const grid = new GridConstraintsModule(adapter, {});
  assert.strictEqual(grid._isEnabled(), true, 'Legacy enableGridConstraints=false darf das Grid-Modul nicht deaktivieren');

  // 3) Modulmanager und finaler NVP/PV-Koordinator sind echte Kernpfade:
  //    weder Lizenzzustand noch alter AppCenter-Boolean dürfen sie abschalten.
  const manager = read('src-ts/runtime-executables/ems/module-manager.ts');
  const gridRegistration = sliceBetween(manager, "key: 'gridConstraints'", '// Peak shaving');
  assert(gridRegistration.includes('enabledFn: () => true'));
  assert(!gridRegistration.includes('enableGridConstraints'));
  const coordinatorRegistration = sliceBetween(manager, "key: 'nvpCoordinator'", "key: 'tariffStatus'");
  assert(coordinatorRegistration.includes('() => true'));
  assert(!coordinatorRegistration.includes('enableGridConstraints'));

  // 4) Backend-Normalisierung erzwingt install=true/enabled=true. Grid ist vom
  //    Lizenzfilter ausgenommen und das Legacy-Flag bleibt immer true.
  const main = read('src-ts/runtime-executables/main.ts');
  assert(main.includes("{ id: 'grid',        enableFlag: 'enableGridConstraints', mandatory: true, defaultInstalled: true }"));
  assert(main.includes("{ id: 'grid', label: 'Netzlimits', desc: 'Dauerhafter Netzanschlussschutz mit Import-Soft-/Hard-Limit; 0‑Einspeisung bleibt optional', enableFlag: 'enableGridConstraints', mandatory: true }"));
  assert(main.includes("if (appId === 'grid')"));
  assert(main.includes("requiredLicense: 'Kernschutz'"));
  assert(main.includes('enableGridConstraints: true'));
  assert(main.includes('gridConstraintsEnabled: true'));

  // 5) Die beiden verbliebenen Mitnutzer (RLM und Speicher-0-Einspeisung) dürfen
  //    nicht mehr vom entfernten Legacy-Schalter abhängen.
  const peak = read('src-ts/runtime-executables/ems/modules/peak-shaving.ts');
  const storage = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
  assert(peak.includes('this.adapter.config.gridConstraints && this.adapter.config.gridConstraints.rlmEnabled'));
  assert(!peak.includes('this.adapter.config.enableGridConstraints && this.adapter.config.gridConstraints'));
  assert(storage.includes('const zeEnabled = !!zeCfg.zeroExportEnabled;'));
  assert(!storage.includes('enableGridConstraints) && zeCfg.zeroExportEnabled'));

  // 6) AppCenter: Pflicht-App ohne sichtbare Aus-/Deinstallationsschalter; Netzlimits
  //    und die Seite selbst zeigen den nicht abschaltbaren Status.
  const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
  assert(ui.includes("{ id: 'grid', label: 'Netzlimits', desc: 'Dauerhafter Netzanschlussschutz mit Import-Soft-/Hard-Limit; 0‑Einspeisung bleibt optional', mandatory: true, hems: true }"));
  assert(ui.includes("if (app.id === 'grid')"));
  assert(ui.includes("protection.textContent = 'Netzschutz dauerhaft aktiv'"));
  assert(ui.includes("permanentStatus.textContent = 'Netzschutz dauerhaft aktiv · nicht abschaltbar'"));
  assert(ui.includes('a.installed = true;'));
  assert(ui.includes('a.enabled = true;'));

  // 7) 0-Einspeisung bleibt bewusst optional und standardmäßig aus.
  assert(ui.includes("if (typeof gc.zeroExportEnabled !== 'boolean') gc.zeroExportEnabled = false;"));
  assert(ui.includes("mkChk('0‑Einspeisung / Einspeisebegrenzung aktiv'"));
  assert(ui.includes('Führungsgröße ist der signierte NVP aus Zuordnung → Allgemein → Netzpunkt'));

  // 8) Single Source of Truth und 10-%-Policy aus RC80/RC81 bleiben unverändert.
  const gridSource = read('src-ts/runtime-executables/ems/modules/grid-constraints.ts');
  assert(gridSource.includes('installerConfig?.gridConnectionPower'));
  assert(gridSource.includes("const gridW = dp.getNumberFresh('grid.powerW', staleMs, null);"));
  assert(!gridSource.includes("dp.getNumberFresh('gc.gridPowerW'"));
  const policy = require(path.join(root, 'ems/services/grid-import-limit-policy.js'));
  const resolved = policy.resolveGridImportLimitPolicy({ hardLimitW: 30000, signedNvpW: -10100, nvpUsable: true });
  assert.strictEqual(resolved.hardLimitW, 30000);
  assert.strictEqual(resolved.softLimitW, 27000);
  assert.strictEqual(resolved.reserveW, 3000);
  assert.strictEqual(resolved.hardHeadroomW, 40100);
  assert.strictEqual(resolved.softHeadroomW, 37100);

  // 9) Der alte Core-Budget-Shadow ist seit dem signed-NVP-/Core-Runtime-v2-
  //    Vertrag nur noch Migrationsdiagnose. Eine erwartete total.effectiveW-
  //    Abweichung darf den Betriebslog weder minütlich noch einmalig zuspammen.
  const warns = [];
  const core = new CoreLimitsModule({
    config: {},
    log: { debug() {}, info() {}, warn(message) { warns.push(String(message)); }, error() {} },
  }, {});
  const legacyMismatchSnapshot = {
    ts: Date.now(),
    raw: { pvReserveW: 0, gridImportW: 5000, flexUsedW: 10000 },
    gates: {
      pv: { rawW: 0, effectiveW: 0, reserveW: 0 },
      grid: { importLimitW: 30000, headroomW: 35000 },
      total: { effectiveW: 35000 },
    },
    tsCoreRuntime: {
      active: true,
      productive: true,
      fallback: false,
      mode: 'typed-core-runtime',
      contractVersion: 'core-runtime-v2',
    },
  };
  const shadow1 = core._runCoreBudgetTsShadowComparison(legacyMismatchSnapshot);
  const shadow2 = core._runCoreBudgetTsShadowComparison(legacyMismatchSnapshot);
  assert.strictEqual(shadow1.supersededByTypedCoreRuntime, true);
  assert.strictEqual(shadow1.warningMismatches.length, 0);
  assert.strictEqual(shadow1.ok, true, 'Reine superseded-Diagnoseabweichungen dürfen den Gesamtstatus nicht blockieren');
  assert.strictEqual(shadow1.exactMatch, false);
  assert(shadow1.diagnosticOnlyMismatches.some((row) => row.field === 'total.effectiveW'));
  assert.strictEqual(shadow2.logSuppressed, true);
  assert.strictEqual(warns.length, 0, 'Erwartete Legacy-Shadow-Abweichung darf keine Warnung erzeugen');
  const authoritative = core._applyCoreBudgetTsProductiveSnapshot(legacyMismatchSnapshot, shadow1);
  assert.strictEqual(authoritative.gates.total.effectiveW, 35000);
  assert.strictEqual(authoritative.tsProductive.reason, 'typed-core-runtime-v2-authoritative');
  assert.strictEqual(authoritative.tsProductive.fallback, false);

  // Unerwartete Shadow-Abweichungen bleiben sichtbar, werden aber je Signatur nur
  // einmal pro Adapterlauf geloggt statt alle 60 Sekunden.
  const unexpectedSnapshot = {
    ts: Date.now(),
    raw: { pvReserveW: 500, gridImportW: 0, flexUsedW: 0 },
    gates: {
      pv: { rawW: 1000, effectiveW: 1000, reserveW: 500 },
      grid: { importLimitW: 30000, headroomW: 30000 },
      total: { effectiveW: 31000 },
    },
  };
  core._runCoreBudgetTsShadowComparison(unexpectedSnapshot);
  core._runCoreBudgetTsShadowComparison(unexpectedSnapshot);
  assert.strictEqual(warns.length, 1, 'Identische unerwartete Shadow-Signatur darf nur einmal warnen');
  assert(warns[0].includes('Einmalige JS/TS-Diagnoseabweichung'));

  // 10) Cache, Paketvertrag und Dokumentation gehören zum RC82-Stand.
  assert(read('src-ts/runtime-executables/www/sw.ts').match(/const CACHE_NAME = 'nexowatt-cache-v\d+'/));
  for (const required of [
    'docs/reports/RC82_FELDTEST_CHECKLISTE_DE.md',
    'docs/reports/RC82_VALIDATION_REPORT.md',
    'docs/RC82_PERMANENT_GRID_PROTECTION_DE.md',
    'scripts/verify-rc82-permanent-grid-protection.cjs',
  ]) {
    assert(pkg.files.includes(required), `package.json.files fehlt: ${required}`);
    assert(fs.existsSync(path.join(root, required)), `Release-Datei fehlt: ${required}`);
  }
  const docs = read('docs/RC82_PERMANENT_GRID_PROTECTION_DE.md');
  assert(docs.includes('nicht abschaltbarer Kernschutz'));
  assert(docs.includes('0-Einspeisung bleibt optional'));
  assert(docs.includes('Zuordnung → Allgemein'));

  console.log('[RC82] OK: Netzlimits dauerhaft aktiv und nicht abschaltbar; Home/Pro, Single Source, 10-%-Policy und optionale 0-Einspeisung geprüft.');
})();
