// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-origin-ledger-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-origin-ledger-runtime.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: ddecc6a4c22312f672666ec387195467dfa1b491f70188d0119e28de794313ae
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { EnergyLedgerModule } = require(path.resolve(__dirname, '../ems/modules/energy-ledger.js'));
const originalNow = Date.now;
let now = 900000;
Date.now = () => now;
const local = new Map();
const foreign = new Map();
const adapter = {
  config: {
    energyLedger: {
      enabled: true,
      origin: {
        enabled: true,
        siteId: 'runtime_site',
        siteName: 'Runtime Test',
        intervalMinutes: 15,
        staleSeconds: 1200,
        dataPoints: {
          gridImportEnergyKwh: 'm.grid.import',
          gridExportEnergyKwh: 'm.grid.export',
          pvGenerationEnergyKwh: 'm.pv',
          storageChargeEnergyKwh: 'm.storage.charge',
          storageDischargeEnergyKwh: 'm.storage.discharge',
        },
        chargePoints: [{ id:'lp1', energyMeterKwhId:'m.ev', unit:'kWh', publiclyAccessible:true, meteringComplianceDeclared:true, meterIntegrated:true }],
        storage: { chargeEfficiencyPct:100, dischargeEfficiencyPct:100, exclusiveRenewableChargingDeclared:true },
        evidence: { sameGridConnectionDeclared:true, meteringComplianceDeclared:true, publicChargingDeclared:true, sameWozObjectDeclared:true, noOperatingSubsidyDeclared:true, integratedMidMeterDeclared:true, operatorType:'business' },
      },
    },
    chargeKiosk: { enabled:false, stations:[] },
  },
  _nwLicenseInfo: { ok:true, edition:'hems' },
  _nwLicenseOk: true,
  _nwCurrentLicenseEdition() { return 'hems'; },
  log: { warn() {}, info() {}, debug() {} },
  async setObjectNotExistsAsync() {},
  async setStateAsync(id, state) { local.set(id, { val:state.val, ack:state.ack, ts:now, lc:now }); },
  async getStateAsync(id) { return local.get(id) || null; },
  async getForeignStateAsync(id) { return foreign.get(id) || null; },
  async setForeignStateAsync() { throw new Error('Energy ledger must never write foreign states'); },
};
/**
 * Code-Teil: setMeters
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function setMeters(values) {
  for (const [id,val] of Object.entries(values)) foreign.set(id, { val, ack:true, ts:now, lc:now });
}
(async () => {
  setMeters({ 'm.grid.import':100, 'm.grid.export':10, 'm.pv':200, 'm.storage.charge':20, 'm.storage.discharge':30, 'm.ev':40 });
  const module = new EnergyLedgerModule(adapter, null);
  await module.init();
  assert.equal(local.get('energyLedger.origin.status').val, 'collecting');
  assert.equal(local.get('energyLedger.origin.edition').val, 'home');
  now = 1800001;
  setMeters({ 'm.grid.import':101, 'm.grid.export':10, 'm.pv':205, 'm.storage.charge':21, 'm.storage.discharge':30, 'm.ev':43 });
  await module.tick();
  const interval = JSON.parse(local.get('energyLedger.origin.lastIntervalJson').val);
  assert.equal(interval.intervalMinutes, 15);
  assert.ok(Math.abs(interval.evcs.totalKwh - 3) < 0.00001);
  assert.equal(interval.quality.status, 'complete');
  assert.ok(interval.hash && interval.hash.length === 64);
  assert.equal(local.get('energyLedger.origin.hashHead').val, interval.hash);
  const current = JSON.parse(local.get('energyLedger.origin.currentIntervalJson').val);
  assert.equal(current.startTs, 1800000);
  // Second interval proves chained append and no duplicate re-finalization.
  now = 2700001;
  setMeters({ 'm.grid.import':102, 'm.grid.export':10, 'm.pv':207, 'm.storage.charge':21, 'm.storage.discharge':31, 'm.ev':44 });
  await module.tick();
  const rows = JSON.parse(local.get('energyLedger.origin.intervalsRecentJson').val);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].previousHash, rows[1].hash);
  assert.equal(JSON.parse(local.get('energyLedger.origin.configHistoryJson').val).length, 1);
  console.log('[energy-origin-ledger-runtime] OK: interval lifecycle, state persistence, hash chain and read-only runtime verified.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { Date.now = originalNow; });
