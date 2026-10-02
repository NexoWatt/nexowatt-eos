#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-core-limits-reservations.js
 *
 * Zweck:
 * Prüft die produktive TypeScript-Reservierung des zentralen Core-Budgets.
 * Seit 0.8.120 ist `core-runtime.applyCoreRuntimeReservation()` die kanonische
 * Phase-2-Quelle. Der ältere `core-budget`-Helfer bleibt als getestete
 * Kompatibilitätsreferenz erhalten, führt aber nicht mehr den Runtime-Commit.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-core-limits-reservations] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }

const legacyTs = read('src-ts/ems/core-limits/core-budget.ts');
must(legacyTs, 'computeCoreBudgetReservation', 'Legacy-Reservierungsreferenz');

const runtimeTs = read('src-ts/ems/core-limits/core-runtime.ts');
must(runtimeTs, 'interface CoreRuntimeReservationRequest', 'Phase-2 Reservation-Request-Vertrag');
must(runtimeTs, 'interface CoreRuntimeReservationEntry', 'Phase-2 Reservation-Entry-Vertrag');
must(runtimeTs, 'applyCoreRuntimeReservation', 'Phase-2 Reservierungsfunktion');
must(runtimeTs, 'buildCoreRuntimeConsumersList', 'Phase-2 Consumers-Helfer');
must(runtimeTs, 'calculateCoreRuntimeFlexUsedW', 'Phase-2 flexUsedW-Helfer');

const core = read('ems/modules/core-limits.js');
must(core, 'applyCoreRuntimeReservation', 'JS-Reserve nutzt Phase-2 TS-Reservierungshelfer');
must(core, 'ts-core-runtime-reservation-v2', 'Phase-2 TS-Reservation-Produktivquelle');
must(core, 'ems.budget.tsReservationJson', 'TS-Reservation-Diagnose-State');
must(core, 'this.tsReservationLast', 'BudgetRuntime speichert letzten TS-Reservation-Status');
must(core, "compareShadowWatt('entry.grantW'", 'Grant-Vergleich vorhanden');
must(core, "compareShadowWatt('entry.remainingPvW'", 'PV-Restbudget-Vergleich vorhanden');

const main = read('main.js');
must(main, 'emsBudgetTsReservationJson', 'App-Center-Diagnose liest TS-Reservation-JSON');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));
if (!mirror || typeof mirror.applyCoreRuntimeReservation !== 'function') {
  fail('Core-Runtime-Spiegel exportiert applyCoreRuntimeReservation nicht.');
}
const result = mirror.applyCoreRuntimeReservation(
  { remainingTotalW: 3000, remainingPvW: 1500, gates: {}, consumers: {}, order: [], sequence: 0 },
  { key: 'evcs', requestedW: 2200, reserveW: 2200, pvReserveW: 1000, pvOnly: true, actualW: 2100, mode: 'pvAuto' },
  123,
);
if (!result || !result.ok || !result.entry) fail('applyCoreRuntimeReservation liefert kein gültiges Ergebnis.');
if (result.source !== 'ts-core-runtime-reservation-v2') fail(`unerwartete Quelle: ${result.source}`);
if (result.entry.grantW !== 1500) fail(`pvOnly muss Grant auf PV-Restbudget begrenzen, ist ${result.entry.grantW}.`);
if (result.nextRemainingTotalW !== 800) fail(`Rest-Gesamtbudget falsch: ${result.nextRemainingTotalW}.`);
if (result.nextRemainingPvW !== 500) fail(`Rest-PV-Budget falsch: ${result.nextRemainingPvW}.`);
if (result.flexUsedW !== 2200) fail(`flexUsedW falsch: ${result.flexUsedW}.`);
if (result.state.sequence !== 1) fail(`Sequenz falsch: ${result.state.sequence}.`);
console.log('[ts-core-limits-reservations] OK: Core-Limits Consumer-Reservierungen laufen produktiv über die typisierte Phase-2-Core-Runtime.');
