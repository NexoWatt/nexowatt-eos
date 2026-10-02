// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-smarthome-scene-guard.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-smarthome-scene-guard.js
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
 * Original-Hash: 0bc1db0c1c8a5db06621c7b60063e182105360e56868ed5269d842eed4de9629
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
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

for (const token of [
  '_nwPreflightSmartHomeSceneById(sceneId, context)',
  "error: 'scene cycle'",
  "error: 'scene nesting depth exceeded'",
  'const previous = this._nwSmartHomeSceneQueue || Promise.resolve();',
  'this._nwSmartHomeSceneQueue = run.then(() => undefined, () => undefined);',
  'if (this._nwShuttingDown)',
  '_nwCheckSmartHomeCoverSafety',
  '_nwCheckSmartHomeClimateSafetyForScene',
  'Beschattung ist gesperrt:',
  'Klimabedienung gesperrt:',
  '_nwCoerceSmartHomeSceneValueForDatapoint',
  '_nwPulseSmartHomeSceneDatapoint',
  'return { ok: errors.length === 0, sceneId: id, executed, errors };',
]) {
  assert.ok(main.includes(token), `Szenen-Schutz: fehlt ${JSON.stringify(token)}`);
}

assert.ok(/res\.status\(409\)\.json\(result\)/.test(main), 'Szenen-API meldet fehlgeschlagene Ausführung nicht mit HTTP 409.');

console.log('[smarthome-scene-guard] OK: Szenen werden vorab geprüft, serialisiert, zyklengeschützt und beachten Beschattungs-/Klima-Sperren.');
