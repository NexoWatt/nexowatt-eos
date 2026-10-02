#!/usr/bin/env node
'use strict';

/**
 * RC83 – versionsneutraler Sicherheitsvertrag
 * - Speicher-Netzladen ausschließlich bei aktivem, frischem, günstigem Tarif.
 * - Bei aktivem variablem Netzentgelt ist zusätzlich das konfigurierte NT-/Quartalsfenster Pflicht.
 * - Neutral, teuer, unbekannt, Tarif aus, stale Snapshot oder stale Preis wirken sofort fail-closed.
 * - Ein von Herstellerprofil/0-W-Firewall gehaltener alter Netzladebefehl wird vor dem Writer gestoppt.
 * - Das zyklisch geschriebene 0-Einspeise-Feldprotokoll besitzt vor dem ersten Write ein ioBroker-Objekt.
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

const { GridConstraintsModule } = require(path.join(root, 'ems/modules/grid-constraints.js'));
const { resolveStorageGridChargePermission } = require(path.join(root, 'ems/modules/tarif-vis.js'));
const {
  isCentralStorageGridChargeSource,
  resolveStrictStorageTariffPermission,
  resolveStorageGridChargeGateSource,
  resolveStorageGridChargeFinalGate,
  resolveStoragePvOnlyChargeSafetyGate,
} = require(path.join(root, 'ems/modules/storage-control.js'));

function tariffDecision(overrides = {}) {
  return resolveStorageGridChargePermission({
    appCenterAllowed: true,
    tariffActive: true,
    currentPriceFresh: true,
    tariffState: 'guenstig',
    manualNetFeeEnabled: false,
    manualNtWindowActive: false,
    priorityAllowsStorage: true,
    storageWriterAvailable: true,
    storagePowerW: 9500,
    ...overrides,
  });
}

function snapshotDecision(overrides = {}) {
  const nowMs = 1_000_000;
  return resolveStrictStorageTariffPermission({
    ts: nowMs - 1000,
    storageGridChargeAllowed: true,
    storageGridChargeSource: 'dynamic-tariff-cheap',
    storageGridChargeBlockReason: '',
    tarifAktiv: true,
    currentPriceFresh: true,
    state: 'guenstig',
    netFeeEnabled: false,
    netFeeMode: 'off',
    storageManualWindowActive: false,
    storageChargeWindowOk: false,
    ...overrides,
  }, { nowMs, snapshotMaxAgeMs: 15000 });
}

(async () => {
  const pkg = readJson('package.json');
  const io = readJson('io-package.json');
  // Der RC-Vertrag gilt auch für spätere Patchstände. Entscheidend ist eine
  // gültige und über alle Release-Metadaten synchronisierte SemVer-Version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(io.common.version, pkg.version);

  // 1) TarifVis-Freigabematrix: nur ein frischer günstiger Dynamiktarif darf laden.
  assert.strictEqual(tariffDecision().allowed, true);
  assert.strictEqual(tariffDecision({ tariffState: 'neutral' }).allowed, false);
  assert.strictEqual(tariffDecision({ tariffState: 'teuer' }).allowed, false);
  assert.strictEqual(tariffDecision({ tariffState: 'unknown' }).allowed, false);
  assert.strictEqual(tariffDecision({ tariffActive: false }).allowed, false);
  assert.strictEqual(tariffDecision({ currentPriceFresh: false }).allowed, false);
  assert.strictEqual(tariffDecision({ manualNetFeeEnabled: true, manualNtWindowActive: false }).allowed, false);
  const cheapNt = tariffDecision({ manualNetFeeEnabled: true, manualNtWindowActive: true });
  assert.strictEqual(cheapNt.allowed, true);
  assert.strictEqual(cheapNt.source, 'net-fee-nt-cheap');
  assert.strictEqual(tariffDecision({ manualNetFeeEnabled: true, manualNtWindowActive: true, tariffState: 'neutral' }).allowed, false);

  // 2) Defense-in-depth-Snapshot: ein persistiertes/inkonsistentes true reicht nie aus.
  assert.strictEqual(snapshotDecision().allowed, true);
  assert.strictEqual(snapshotDecision({ storageGridChargeAllowed: false }).allowed, false);
  assert.strictEqual(snapshotDecision({ tarifAktiv: false }).allowed, false);
  assert.strictEqual(snapshotDecision({ currentPriceFresh: false }).allowed, false);
  assert.strictEqual(snapshotDecision({ state: 'neutral' }).allowed, false);
  assert.strictEqual(snapshotDecision({ state: 'teuer' }).allowed, false);
  assert.strictEqual(snapshotDecision({ state: 'unknown' }).allowed, false);
  assert.strictEqual(snapshotDecision({ ts: 900_000 }).allowed, false, 'stale Snapshot muss ein altes true sofort sperren');
  assert.strictEqual(snapshotDecision({ netFeeEnabled: true, netFeeMode: 'Standard', storageManualWindowActive: false }).allowed, false);
  assert.strictEqual(snapshotDecision({ netFeeEnabled: true, netFeeMode: 'NT', storageManualWindowActive: false }).allowed, false);
  assert.strictEqual(snapshotDecision({ netFeeEnabled: true, netFeeMode: 'NT', storageManualWindowActive: true }).allowed, true);

  // 3) Finale Writer-Quelle: aktuelle/gehielt wiederhergestellte Quelle gewinnt vor
  //    dem vor dem Herstellerprofil gemerkten Wert. Damit wird ein alter -9,5-kW-
  //    Tarifbefehl bei Wechsel auf neutral nicht durch die 0-W-Firewall weitergeführt.
  assert.strictEqual(resolveStorageGridChargeGateSource({
    targetW: -9500,
    source: 'tarif',
    policySourceBeforeVendor: 'idle',
  }), 'tarif');
  assert.strictEqual(resolveStorageGridChargeGateSource({
    targetW: -9500,
    source: 'sungrow-hybrid',
    policySourceBeforeVendor: 'tarif',
  }), 'tarif');
  assert.strictEqual(resolveStorageGridChargeGateSource({
    targetW: -5000,
    source: 'pv',
    policySourceBeforeVendor: 'pv',
  }), 'pv');

  for (const source of ['tarif', 'tarif_grid_charge', 'reserve', 'reserve_grid', 'lastspitze_refill', 'lsk_refill', 'grid_charge']) {
    assert.strictEqual(isCentralStorageGridChargeSource(source, -2500), true, `${source} muss als Netzladequelle erkannt werden`);
    const blocked = resolveStorageGridChargeFinalGate({
      targetW: -2500,
      source,
      configured: true,
      allowed: false,
      blockReason: 'Tarif ist neutral – Netzladen gesperrt, Eigenverbrauchsoptimierung aktiv',
    });
    assert.strictEqual(blocked.blocked, true, `${source} muss vor dem Writer gesperrt werden`);
    assert.strictEqual(blocked.targetW, 0);
  }
  const pvAllowed = resolveStorageGridChargeFinalGate({
    targetW: -5000,
    source: 'pv',
    configured: true,
    allowed: false,
  });
  assert.strictEqual(pvAllowed.blocked, false, 'PV-/Eigenverbrauchsladen darf vom Tarifgate nicht pauschal gesperrt werden');
  assert.strictEqual(pvAllowed.targetW, -5000);

  // 4) Physikalischer PV-only-Finalschutz: Auch Hersteller-/Hold-Ziele dürfen
  //    außerhalb günstig nur den realen lokalen PV-Überschuss aufnehmen.
  const screenshotCase = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -9500,
    gridChargeAllowed: false,
    signedNvpW: 3800,
    batteryPowerW: -9500,
    batteryPowerTrusted: true,
    targetImportW: 100,
    blockReason: 'Tarif ist neutral – Netzladen gesperrt, Eigenverbrauchsoptimierung aktiv',
  });
  assert.strictEqual(screenshotCase.limited, true);
  assert.strictEqual(screenshotCase.blocked, false);
  assert.strictEqual(screenshotCase.baseNvpWithoutBatteryW, -5700);
  assert.strictEqual(screenshotCase.allowedChargeW, 5800);
  assert.strictEqual(screenshotCase.targetW, -5800, '9,5 kW Ladung müssen auf den 5,8-kW-PV-Überschuss begrenzt werden');

  const importWithoutBatteryFeedback = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -5000,
    gridChargeAllowed: false,
    signedNvpW: 1200,
    batteryPowerTrusted: false,
    targetImportW: 100,
  });
  assert.strictEqual(importWithoutBatteryFeedback.blocked, true);
  assert.strictEqual(importWithoutBatteryFeedback.targetW, 0, 'Bei Import und fehlendem Batteriefeedback darf kein Ladebefehl fortbestehen');

  const measuredExportWithoutBatteryFeedback = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -5000,
    gridChargeAllowed: false,
    signedNvpW: -4000,
    batteryPowerTrusted: false,
    targetImportW: 100,
  });
  assert.strictEqual(measuredExportWithoutBatteryFeedback.limited, true);
  assert.strictEqual(measuredExportWithoutBatteryFeedback.targetW, -4100, 'Gemessene Einspeisung darf konservativ als PV-Ladebudget genutzt werden');

  const staleNvp = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -5000,
    gridChargeAllowed: false,
    signedNvpW: null,
    batteryPowerW: -5000,
    batteryPowerTrusted: true,
    targetImportW: 100,
    validatedPvFeedForwardChargeW: 5000,
  });
  assert.strictEqual(staleNvp.blocked, true);
  assert.strictEqual(staleNvp.targetW, 0, 'Ohne gültigen NVP muss die Ladefreigabe auch mit altem Feed-forward fail-closed sein');

  // Direkte, frische und bereits vom NVP-Regler validierte PV-/Lastwerte dürfen
  // bei trägem/kurzzeitig unplausiblem Batterie-Istwert den lokalen Überschuss
  // belegen. Dadurch bleibt der Sungrow-Hybrid im Zielband bei PV-Ladung aktiv,
  // ohne eine allgemeine Netzladefreigabe zu öffnen.
  const validatedFeedForward = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -12000,
    gridChargeAllowed: false,
    signedNvpW: 80,
    batteryPowerW: 0,
    batteryPowerTrusted: true,
    targetImportW: 50,
    validatedPvFeedForwardChargeW: 9050,
  });
  assert.strictEqual(validatedFeedForward.limited, true);
  assert.strictEqual(validatedFeedForward.blocked, false);
  assert.strictEqual(validatedFeedForward.nvpDerivedPvOnlyCapW, 0);
  assert.strictEqual(validatedFeedForward.validatedFeedForwardCapW, 9050);
  assert.strictEqual(validatedFeedForward.pvOnlyCapW, 9050);
  assert.strictEqual(validatedFeedForward.capSource, 'validated-pv-load-feed-forward');
  assert.strictEqual(validatedFeedForward.targetW, -9050, 'Validierter lokaler Feed-forward muss als PV-only-Ladeobergrenze gelten');

  const validatedFeedForwardExact = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -9050,
    gridChargeAllowed: false,
    signedNvpW: 80,
    batteryPowerW: 0,
    batteryPowerTrusted: true,
    targetImportW: 50,
    validatedPvFeedForwardChargeW: 9050,
  });
  assert.strictEqual(validatedFeedForwardExact.limited, false);
  assert.strictEqual(validatedFeedForwardExact.targetW, -9050, 'Bereits passender PV-/Last-Feed-forward darf nicht auf 0 W gekappt werden');

  const cheapFullCharge = resolveStoragePvOnlyChargeSafetyGate({
    targetW: -9500,
    gridChargeAllowed: true,
    signedNvpW: 3800,
    batteryPowerW: -9500,
    batteryPowerTrusted: true,
    targetImportW: 100,
  });
  assert.strictEqual(cheapFullCharge.limited, false);
  assert.strictEqual(cheapFullCharge.targetW, -9500, 'Im frischen günstigen Tarif bleibt das konfigurierte Netzladen erlaubt');

  // 5) Log-Spam-Fix dynamisch prüfen: init() legt das Objekt mit korrektem Vertrag an.
  const created = [];
  const adapter = {
    namespace: 'nexowatt-ui.0',
    config: { gridConstraints: {} },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync(id, obj) { created.push({ id, obj }); },
    async getStateAsync() { return null; },
    async setStateAsync() {},
  };
  const dp = { async upsert() {} };
  const grid = new GridConstraintsModule(adapter, dp);
  await grid.init();
  const fieldProtocol = created.find((row) => row.id === 'gridConstraints.exportLimit.sinkFieldProtocolJson');
  assert(fieldProtocol, 'sinkFieldProtocolJson-Objekt muss beim Modulstart angelegt werden');
  assert.strictEqual(fieldProtocol.obj.type, 'state');
  assert.strictEqual(fieldProtocol.obj.common.type, 'string');
  assert.strictEqual(fieldProtocol.obj.common.role, 'json');
  assert.strictEqual(fieldProtocol.obj.common.read, true);
  assert.strictEqual(fieldProtocol.obj.common.write, false);

  const gridSource = read('src-ts/runtime-executables/ems/modules/grid-constraints.ts');
  const createMarker = "await mk('gridConstraints.exportLimit.sinkFieldProtocolJson'";
  const writeMarker = "await set('gridConstraints.exportLimit.sinkFieldProtocolJson'";
  const createIndex = gridSource.indexOf(createMarker);
  const writeIndex = gridSource.indexOf(writeMarker);
  assert(createIndex >= 0 && writeIndex > createIndex, 'Objektinitialisierung muss vor dem zyklischen State-Write stehen');

  // 6) Statische Regression: TarifVis erzeugt außerhalb der günstigen Freigabe
  //    keinen eigenen positiven/negativen Tarif-Sollwert; Eigenverbrauch übernimmt.
  const tariffSource = read('src-ts/runtime-executables/ems/modules/tarif-vis.ts');
  assert(tariffSource.includes('Neutral, teuer, unbekannt, stale, Tarif aus oder fehlendes'));
  assert(tariffSource.includes('speicherSollW = 0;'));
  assert(!tariffSource.includes('speicherSollW = storagePowerAbsW;'), 'TarifVis darf neutral/teuer keine eigene Entladevorgabe mehr erzwingen');

  const storageSource = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
  assert(storageSource.includes('resolveStrictStorageTariffPermission'));
  assert(storageSource.includes('resolveStorageGridChargeGateSource'));
  assert(storageSource.includes('resolveStoragePvOnlyChargeSafetyGate'));
  assert(storageSource.includes('tariffPvOnlySafetyActive'));
  assert(!storageSource.includes("this.dp.getBoolean('st.tariffGridChargeAllowed'"), 'persistierter Einzel-Boolean darf nicht als Freigabe-Fallback dienen');

  console.log('[rc83-storage-cheap-only-log-object] OK: Netzladen nur bei frischem günstigen Tarif; außerhalb günstig wird jeder Ladepfad physikalisch auf lokalen PV-Überschuss begrenzt; sinkFieldProtocolJson wird vor dem ersten Write angelegt.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
