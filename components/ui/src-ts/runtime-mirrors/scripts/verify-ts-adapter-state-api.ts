// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-adapter-state-api.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-adapter-state-api.js
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
 * Original-Hash: 1a747ef126c10cef556ea648961845ffd554a190e6850e6b4cbae8271bf6b9a8
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
 * Datei: scripts/verify-ts-adapter-state-api.js
 *
 * Zweck:
 * Prüft, ob der TypeScript-Schritt für die spätere `main.js`-State-/API-Migration vorhanden ist.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'src-ts/contracts/api.ts',
  'src-ts/adapter/state-cache.ts',
  'src-ts/adapter/api-state.ts',
  'src-ts/adapter/api-set.ts',
  'src-ts/adapter/connection-state.ts',
  'src-ts/quality/adapter-state-api-cases.ts',
  'src-ts/tests/adapter-state-api-smoke.ts',
  'src-ts/tests/adapter-state-api-runtime.ts',
  'tsconfig.adapter-state-api.json',
];
const requiredAnchors = [
  'Code-Teil: normalizeStateEntry',
  'Code-Teil: buildApiStateResponse',
  'Code-Teil: buildSettingsWritePlan',
  'Code-Teil: buildInfoConnectionWritePlan',
  'ADAPTER_STATE_API_CASES',
];
let failed = false;
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(message) { console.error(`[ts-adapter-state-api-check] ERROR: ${message}`); failed = true; }
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) fail(`${file} fehlt`);
const combined = requiredFiles.filter((f) => f.endsWith('.ts') && fs.existsSync(path.join(root, f))).map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
for (const anchor of requiredAnchors) if (!combined.includes(anchor)) fail(`Kommentar-/Codeanker fehlt: ${anchor}`);
if (failed) process.exit(1);
console.log('[ts-adapter-state-api-check] OK: Adapter-State-/API-TypeScript-Vorbereitung vorhanden.');
