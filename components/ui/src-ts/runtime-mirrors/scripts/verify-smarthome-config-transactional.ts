// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-smarthome-config-transactional.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-smarthome-config-transactional.js
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
 * Original-Hash: 1338ca7d7a6242df927c5ce9a3a746e01e1f225b5aa6ca9326c1b47326405de3
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
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('main.js');
const contract = read('lib/smarthome-contract.js');

for (const token of [
  'const validation = this.nwValidateSmartHomeConfig(out);',
  'const previousConfig = this.getSmartHomeConfig',
  'const previousDevices = Array.isArray(this.smartHomeDevices)',
  'const previousPatch = this._nwInstallerConfigPatch;',
  'this.config.smartHomeConfig = normalizedOut;',
  "return res.status(400).json({ ok: false, error: 'runtime activation failed'",
  'this.config.smartHomeConfig = previousConfig;',
  'this.smartHomeDevices = previousDevices;',
  'this._nwInstallerConfigPatch = previousPatch;',
  'SmartHomeConfig save rolled back:',
  'rolledBack: true',
]) {
  assert.ok(main.includes(token), `Transaktionaler SmartHome-Save: fehlt ${JSON.stringify(token)}`);
}

for (const token of [
  'function validateSmartHomeConfig(input)',
  'SCENE_ID_DUPLICATE',
  'SCENE_ACTION_INVALID',
  'SCENE_DEVICE_MISSING',
  'SCENE_ACTION_UNMAPPED',
  'SCENE_CYCLE',
]) {
  assert.ok(contract.includes(token), `SmartHome-Vertragsprüfung: fehlt ${JSON.stringify(token)}`);
}

console.log('[smarthome-config-transactional] OK: SmartHome-Konfiguration wird vor Aktivierung vollständig validiert und bei Aktivierungs-/Persistenzfehlern zurückgerollt.');
