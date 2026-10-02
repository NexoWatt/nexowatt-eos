// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-live-energy-flow-5s-cadence.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-live-energy-flow-5s-cadence.js
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
 * Original-Hash: 9772aa59b42ab6d2d711dfb47474494f834b98000f572b96ef125298091ab04f
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
 * Regression: Häufige SSE-Messwerte dürfen die sichtbare LIVE-/Energieflussanzeige
 * nur im 5-Sekunden-Takt neu rendern. Die EMS-/Backend-Zyklen bleiben davon getrennt.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const tsPath = path.join(root, 'src-ts', 'runtime-executables', 'www', 'app.ts');
const jsPath = path.join(root, 'www', 'app.js');
const ts = fs.readFileSync(tsPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

for (const [name, source] of [['TS source', ts], ['runtime JS', js]]) {
  assert.match(source, /const LIVE_TELEMETRY_RENDER_INTERVAL_MS = 5000;/, `${name}: 5s interval missing`);
  assert.match(source, /function scheduleLiveTelemetryRender\(force = false\)/, `${name}: telemetry scheduler missing`);
  assert.match(source, /if \(isInitMessage\) scheduleLiveTelemetryRender\(true\);/, `${name}: init must render immediately`);
  assert.match(source, /else if \(isUpdateMessage\) scheduleLiveTelemetryRender\(false\);/, `${name}: SSE updates must use 5s scheduler`);
  assert.doesNotMatch(source, /else if \(isUpdateMessage\)[\s\S]{0,160}scheduleRender\(\);/, `${name}: SSE updates bypass cadence`);
}

// Die Datenerfassung/Regelung darf nicht auf 5 Sekunden verlangsamt werden.
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
assert.match(main, /this\._nwLiveCoreRefreshIntervalMs = 3000;/, 'backend live-input refresh must remain fast');

console.log('[live-energy-flow-5s-cadence] OK');
