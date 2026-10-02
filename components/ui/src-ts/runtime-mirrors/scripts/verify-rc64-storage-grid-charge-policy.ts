// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-rc64-storage-grid-charge-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-rc64-storage-grid-charge-policy.js
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
 * Original-Hash: c679c0224d67d290382573680ab505b5f8fdc73e725617b09788649e4e5b3c55
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

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveStorageGridChargePermission } = require('../ems/modules/tarif-vis');

const master = {
  appCenterAllowed: true,
  priorityAllowsStorage: true,
  storageWriterAvailable: true,
  storagePowerW: 4000,
};

/**
 * Code-Teil: decision
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function decision(overrides = {}) {
  return resolveStorageGridChargePermission({
    ...master,
    tariffActive: true,
    currentPriceFresh: true,
    tariffState: 'guenstig',
    manualNetFeeEnabled: false,
    manualNtWindowActive: false,
    ...overrides,
  });
}

const matrix = [
  {
    name: 'Netzentgelt an + NT aktiv + Dynamiktarif aus',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif neutral und frisch',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif günstig und frisch',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' },
    allowed: true,
    source: 'net-fee-nt-cheap',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif teuer',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'teuer' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Preis veraltet',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + außerhalb NT + Tarif günstig',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'net-fee',
  },
  {
    name: 'Netzentgelt aus + Tarif günstig und frisch',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' },
    allowed: true,
    source: 'dynamic-tariff-cheap',
  },
  {
    name: 'Netzentgelt aus + Tarif neutral',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + günstiger Tarif veraltet',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + dynamischer Tarif aus',
    input: { manualNetFeeEnabled: false, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: false,
    source: 'dynamic-tariff',
  },
];

for (const row of matrix) {
  const result = decision(row.input);
  assert.strictEqual(result.allowed, row.allowed, `${row.name}: allowed`);
  assert.strictEqual(result.source, row.source, `${row.name}: source`);
  assert.strictEqual(typeof result.reason, 'string', `${row.name}: reason missing`);
}

for (const [name, input] of [
  ['AppCenter aus', { appCenterAllowed: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Priorität sperrt Speicher', { priorityAllowsStorage: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Kein Writer', { storageWriterAvailable: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Keine Ladeleistung', { storagePowerW: 0, manualNetFeeEnabled: true, manualNtWindowActive: true }],
]) {
  assert.strictEqual(decision(input).allowed, false, `${name} must remain a hard master block`);
}

const tariffSource = fs.readFileSync(path.join(__dirname, '../ems/modules/tarif-vis.js'), 'utf8');
const helperStart = tariffSource.indexOf('function resolveStorageGridChargePermission');
const helperEnd = tariffSource.indexOf('function formatStorageNtWindowLabel', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'storage tariff permission helper missing');
const helperSource = tariffSource.slice(helperStart, helperEnd);
assert.match(helperSource, /normalizedTariffState !== 'guenstig'/, 'only a cheap dynamic tariff may release storage grid charging');
assert.match(helperSource, /manualNetFeeEnabled && !manualNtWindowActive/, 'enabled variable net fee must additionally require the configured NT window');
assert.match(helperSource, /source: 'net-fee-nt-cheap'/);
assert.match(helperSource, /source: 'dynamic-tariff-cheap'/);
assert.doesNotMatch(helperSource, /\['guenstig', 'neutral'\]/, 'neutral must never be part of the storage grid-charge allow list');
assert.doesNotMatch(tariffSource, /\? '22:00' : ntStartRaw/);
assert.doesNotMatch(tariffSource, /\? '06:00' : ntEndRaw/);

console.log('[rc64-storage-grid-charge-policy] OK: storage grid charging requires a fresh cheap dynamic tariff; active variable net fee additionally requires the configured NT window.');
