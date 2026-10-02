#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-core-limits-reservations-productive.js
 *
 * Zweck:
 * Prüft, dass `makeBudgetRuntime.reserve()` bevorzugt die Phase-3-TypeScript-Runtime
 * und Phase 2 als kontrollierten Rückfall produktiv übernimmt und bei Fehlern beziehungsweise Paritätsabweichungen exakt
 * auf die bisherige JavaScript-Referenz zurückfällt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-core-limits-reservations-productive] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }

const core = read('ems/modules/core-limits.js');
must(core, 'productiveTsReservationCommit', 'produktiver TS-Commit-Kommentar');
must(core, "'ts-core-runtime-phase3-reservation' : 'ts-core-runtime-reservation-v2'", 'produktive Phase-3-Quelle mit Phase-2-Rueckfall');
must(core, 'fallbackReason', 'Fallback-Grund wird gespeichert');
must(core, 'this.remainingTotalW = tsReservationResult.nextRemainingTotalW', 'TS-Restbudget wird produktiv übernommen');
must(core, 'this.consumers = (tsReservationResult.consumers', 'TS-Consumer-Liste wird produktiv übernommen');
must(core, 'flexUsedW = Math.max(0, Number(tsReservationResult.flexUsedW)', 'TS-flexUsedW wird produktiv genutzt');
must(core, 'ts-js-mismatch', 'JS-Fallback bei Abweichung vorhanden');
must(core, 'ems.budget.tsReservationJson', 'Diagnose-State bleibt vorhanden');
must(core, 'Diagnose-/State-Schreibfehler dürfen Budgetreservierungen nicht abbrechen', 'Schreibfehler blockieren Reserve nicht');

const ts = read('src-ts/ems/core-limits/core-runtime.ts');
must(ts, 'Wendet eine Verbraucherreservierung auf den zentralen Laufzeitstand an', 'Phase-2-Quelle dokumentiert produktive Reservierung');
must(ts, 'ts-core-runtime-reservation-v2', 'Phase-2-Vertragskennung');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));
if (!mirror || typeof mirror.applyCoreRuntimeReservation !== 'function') {
  fail('TS-Core-Runtime-Spiegel exportiert applyCoreRuntimeReservation nicht.');
}
const result = mirror.applyCoreRuntimeReservation(
  { remainingTotalW: 5000, remainingPvW: 2000, gates: {}, consumers: {}, order: [], sequence: 0 },
  { key: 'heatingRod', requestedW: 3000, reserveW: 3000, pvReserveW: 1500, pvOnly: false, actualW: 2800 },
  456,
);
if (!result || !result.ok || !result.entry) fail('TS-Reservierung liefert kein gültiges Ergebnis.');
if (result.entry.grantW !== 3000) fail(`grantW falsch: ${result.entry.grantW}`);
if (result.nextRemainingTotalW !== 2000) fail(`nextRemainingTotalW falsch: ${result.nextRemainingTotalW}`);
if (result.nextRemainingPvW !== 500) fail(`nextRemainingPvW falsch: ${result.nextRemainingPvW}`);
if (result.consumers.heatingRod.entry) fail('Consumer-Struktur ist unerwartet verschachtelt.');
if (!result.consumers.heatingRod || result.consumers.heatingRod.usedW !== 3000) fail('Consumer-Eintrag fehlt oder usedW ist falsch.');
if (result.state.sequence !== 1) fail(`Produktive Sequenz falsch: ${result.state.sequence}.`);
console.log('[ts-core-limits-reservations-productive] OK: Core-Limits Consumer-Reservierungen laufen produktiv ueber Phase 3, mit Phase 2 und JS als harte Fallbacks.');
