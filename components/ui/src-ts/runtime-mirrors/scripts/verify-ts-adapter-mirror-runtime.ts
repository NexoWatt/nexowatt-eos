// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-adapter-mirror-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-adapter-mirror-runtime.js
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
 * Original-Hash: 09df10c40cec19d527312a0914314e3c57badf3a30f40bb0aedf7d1a9c13b4d5
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

/**
 * Datei: scripts/verify-ts-adapter-mirror-runtime.js
 *
 * Zweck:
 * Lädt die adapter-nahen CommonJS-Spiegel wirklich mit Node und prüft kritische Regeln.
 *
 * Zusammenhang:
 * Diese Spiegel sollen später kleine main.js-Bereiche übernehmen. Darum prüfen wir hier
 * vor allem: 0 und false bleiben gültig, settings.* werden sicher normalisiert und
 * info.connection erhält einen eindeutigen Schreibplan.
 */

const path = require('path');
const root = path.resolve(__dirname, '..');

const stateCache = require(path.join(root, 'lib/ts-mirrors/adapter/state-cache.js'));
const apiState = require(path.join(root, 'lib/ts-mirrors/adapter/api-state.js'));
const apiSet = require(path.join(root, 'lib/ts-mirrors/adapter/api-set.js'));
const settingsWrites = require(path.join(root, 'lib/ts-mirrors/adapter/settings-writes.js'));
const connection = require(path.join(root, 'lib/ts-mirrors/adapter/connection-state.js'));

/** Code-Teil: fail. Zweck: Meldet einen fachlichen Regressionstreffer in den Adapter-Spiegeln. */
function fail(message) {
  console.error(`[verify-ts-adapter-mirror-runtime] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: assert. Zweck: Kleine, sprechende Runtime-Assertions für kritische Regeln. */
function assert(condition, message) {
  if (!condition) fail(message);
}

const cache = {
  'storageChargePower': { val: 0, ack: true, ts: 1000, lc: 1000 },
  'settings.aiAdvisorEnabled': { val: false, ack: true, ts: 1001, lc: 1001 },
  'weatherText': { val: '', ack: true, ts: 1002, lc: 1002 },
};

const zeroEntry = stateCache.normalizeStateEntry('storageChargePower', cache.storageChargePower);
assert(stateCache.isStateValuePresent(zeroEntry), '0 W darf nicht als fehlend gelten.');
assert(zeroEntry.value === 0, '0 W muss als Wert erhalten bleiben.');

const falseEntry = stateCache.normalizeStateEntry('settings.aiAdvisorEnabled', cache['settings.aiAdvisorEnabled']);
assert(stateCache.isStateValuePresent(falseEntry), 'false darf nicht als fehlend gelten.');
assert(falseEntry.value === false, 'false muss als Wert erhalten bleiben.');

const api = apiState.buildApiStateResponse(cache);
assert(api.states.storageChargePower.value === 0, '/api/state-Spiegel muss 0 W erhalten.');
assert(api.states['settings.aiAdvisorEnabled'].value === false, '/api/state-Spiegel muss false erhalten.');

const plan = apiSet.buildSettingsWritePlan(
  { scope: 'settings', key: 'aiAdvisorEvTargetSocPct', value: '88' },
  [{ key: 'aiAdvisorEvTargetSocPct', stateId: 'settings.aiAdvisorEvTargetSocPct', valueKind: 'number', min: 10, max: 100 }]
);
assert(plan.ok === true, 'settings-Schreibplan muss gültige Kundeneinstellung akzeptieren.');
assert(plan.normalizedValue === 88, 'settings-Schreibplan muss Zahlenwert normalisieren.');
assert(plan.plan && plan.plan.ack === false, 'settings-Schreibplan muss ack=false für Frontend-Schreibwunsch setzen.');

const normalized = settingsWrites.normalizeSettingsWrite({ scope: 'settings', key: 'aiAdvisorEnabled', value: 'false', source: 'test' });
assert(normalized && normalized.value === false, 'settings-writes muss false korrekt normalisieren.');

const conn = connection.buildInfoConnectionWritePlan(true, 'webserver-started');
assert(conn.stateId === 'info.connection', 'info.connection-Schreibplan muss Ziel-State setzen.');
assert(conn.value === true && conn.ack === true, 'info.connection online muss ack=true schreiben.');

console.log('[verify-ts-adapter-mirror-runtime] OK: Adapter-CJS-Spiegel sind importierbar und zentrale 0/false-Regeln stimmen.');
