// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-visual-online-state.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-visual-online-state.js
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
 * Original-Hash: e68e7ca5da28bcc1ecfeb2d40d6639115be0fd523fc5f3afcf908291f180890a
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
const fs = require('fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(p){ return fs.readFileSync(p, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[evcs-visual-online-state] missing ${label}: ${needle}`); process.exit(1); } }
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[evcs-visual-online-state] forbidden ${label}: ${needle}`); process.exit(1); } }
const evcs = 'src-ts/runtime-executables/www/evcs.ts';
const pkgVersion = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+$/.test(String(pkgVersion || ''))) { console.error(`[$evcs-visual-online-state] invalid package version: ${pkgVersion}`); process.exit(1); }
must(evcs, 'function _evcsBoolOrNull(value)', 'online bool normalizer');
must(evcs, 'function _tileStateClass({ powerW, reason, regEnabled, online, statusClass, faultActive, unavailableActive })', 'tile state uses confirmed reachability and operational status');
must(evcs, "onlineState === false || r === 'OFFLINE' || cls === 'offline'", 'offline class derived from confirmed reachability');
must(evcs, 'function _resolveEvcsDisplayStatus({', 'display resolves confirmed status separately');
must(evcs, 'const localOnline = d(`evcs.${i}.online`);', 'render reads local online mirror');
must(evcs, 'const emsOnline = hasEms ? d(`${cm}.online`) : null;', 'render reads EMS online state');
must(evcs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'local onlineId mirror wins over EMS fallback');
must(evcs, '_shortStatusText(statusInfo, emsReason, online)', 'status text gets online state');
must(evcs, 'const tileCls = _tileStateClass({', 'render invokes the tile resolver');
must(evcs, 'statusClass: emsStatusClass || statusInfo.status,', 'tile receives confirmed status');
must(evcs, 'faultActive: emsFaultActive,', 'tile receives confirmed fault flag');
must(evcs, 'unavailableActive: emsUnavailableActive,', 'tile receives confirmed unavailability flag');
mustNot(evcs, 'active === false || regEnabled === false', 'online idle must not be disabled by active=false');
// Execute the real pure frontend helpers: an idle point is reachable, and
// a device fault/stale operational status is not silently reclassified offline.
const source = read(evcs);
const start = source.indexOf('function _evcsBoolOrNull(value)');
const end = source.indexOf('function _shortStatusText(', start);
assert.ok(start >= 0 && end > start, 'pure frontend helper block is present');
const { tile, status, bool } = vm.runInNewContext(
  source.slice(start, end) + '\n({tile:_tileStateClass,status:_resolveEvcsDisplayStatus,bool:_evcsBoolOrNull});',
  {}, { timeout: 1000 },
);
const base = { powerW: 0, reason: '', active: false, regEnabled: true, online: true };
assert.equal(tile(base), 'nw-tile--state-off', 'idle active=false stays reachable');
assert.equal(tile({ ...base, powerW: 4500 }), 'nw-tile--state-on');
assert.match(tile({ ...base, online: false }), /state-offline/, 'explicit offline wins');
assert.match(tile({ ...base, reason: 'OFFLINE' }), /state-offline/);
assert.equal(tile({ ...base, faultActive: true }), 'nw-tile--state-warning');
assert.equal(tile({ ...base, unavailableActive: true }), 'nw-tile--state-warning');
assert.equal(tile({ ...base, statusClass: 'stale' }), 'nw-tile--state-warning');
assert.equal(tile({ ...base, regEnabled: false }), 'nw-tile--state-disabled');
assert.equal(bool('Faulted'), null, 'operational fault is not a reachability flag');
const stale = status({ hasEms: true, online: true, rawStatus: 'Offline', statusClass: 'stale' });
assert.equal(stale.status, 'unconfirmed');
assert.equal(stale.confirmed, false, 'stale raw status does not become confirmed offline');
assert.equal(status({ hasEms: true, online: false }).status, 'offline');
assert.equal(status({ hasEms: true, online: true, faultActive: true }).status, 'faulted');
console.log('[evcs-visual-online-state] OK (source contract + executable online/idle/fault/stale cases)');
