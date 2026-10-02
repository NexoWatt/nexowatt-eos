// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-rc61-heating-rod-night-manual-release.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-rc61-heating-rod-night-manual-release.js
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
 * Original-Hash: 982c62007933fe5e5c9ebb6f57062e154301a83796f8e6b362ce411f6618db66
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
 * RC61 – Heizstab-Nachtfreigabe.
 *
 * Vertrag:
 * - PV-Auto ist im konfigurierten Nachtfenster gesperrt.
 * - Manuelle Stufen, Boost und eindeutig erkannte externe Hand-Schaltungen
 *   werden vor dem Nachtblock behandelt und bleiben zulässig.
 * - Das Zeitfenster ist lokal, über Mitternacht konfigurierbar und standardmäßig
 *   von 20:00 bis 06:00 aktiv.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  resolveHeatingRodNightPvAutoLock,
} = require('../ems/modules/heating-rod-control');

/**
 * Code-Teil: localTs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function localTs(hour, minute = 0) {
  return new Date(2026, 7, 15, hour, minute, 0, 0).getTime();
}

// Standardfenster über Mitternacht.
{
  const cfg = {};
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(19, 59)).active, false);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(20, 0)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(23, 59)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(0, 0)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(5, 59)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(6, 0)).active, false);
}

// Benutzerdefiniertes Fenster sowie explizite Deaktivierung.
{
  const cfg = { blockPvAutoAtNight: true, nightStartTime: '22:30', nightEndTime: '04:15' };
  const active = resolveHeatingRodNightPvAutoLock(cfg, localTs(23, 0));
  assert.strictEqual(active.enabled, true);
  assert.strictEqual(active.active, true);
  assert.strictEqual(active.startTime, '22:30');
  assert.strictEqual(active.endTime, '04:15');
  assert.match(active.reason, /manual.*only|manual-release-only/);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(12, 0)).active, false);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock({ ...cfg, blockPvAutoAtNight: false }, localTs(23, 0)).active, false);
}

// Start == Ende ist bewusst fail-safe ganztägig nur manuell.
{
  const cfg = { blockPvAutoAtNight: true, nightStartTime: '00:00', nightEndTime: '00:00' };
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(12, 0)).active, true);
}

// Strukturelle Schutzanker: explizite Freigaben müssen vor dem PV-Auto-Nachtblock
// ausgewertet werden; der Nachtblock muss vor der normalen Auto-Stufenberechnung liegen.
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');

const boostIndex = source.indexOf('if (ov.boostActive)');
const manualIndex = source.indexOf('if (manualStage > 0)');
const externalManualIndex = source.indexOf('if (pvAutomationActive && ownNow.externalManual)');
const nightIndex = source.indexOf('if (pvAutomationActive && nightPvAutoLock.active)');
const autoStageIndex = source.indexOf('const strategyAction = String(strategyOverlay.action');

for (const [name, index] of Object.entries({ boostIndex, manualIndex, externalManualIndex, nightIndex, autoStageIndex })) {
  assert(index >= 0, `Fehlender RC61-Codeanker: ${name}`);
}
assert(boostIndex < nightIndex, 'Boost muss vor dem Nachtblock zulässig bleiben.');
assert(manualIndex < nightIndex, 'Manuelle Stufen müssen vor dem Nachtblock zulässig bleiben.');
assert(externalManualIndex < nightIndex, 'Externe Hand-Schaltung muss vor dem Nachtblock zulässig bleiben.');
assert(nightIndex < autoStageIndex, 'Der Nachtblock muss die normale PV-Auto-Berechnung vor dem Schreiben stoppen.');

for (const needle of [
  'blockPvAutoAtNight',
  'nightStartTime',
  'nightEndTime',
  'night_pv_auto_blocked',
  'manual_release_required',
  'PV-Auto nachts sperren',
]) {
  assert(source.includes(needle) || uiSource.includes(needle), `Fehlender Nachtfreigabe-Anker: ${needle}`);
}

console.log('[rc61-heating-rod-night-manual-release] OK: PV-Auto ist nachts gesperrt; Manual/Boost/externe Handfreigabe bleiben vorgeordnet zulässig.');
