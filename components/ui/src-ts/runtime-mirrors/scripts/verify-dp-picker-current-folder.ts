// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-dp-picker-current-folder.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-dp-picker-current-folder.js
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
 * Original-Hash: bd1975ea949a9902dce1665d0e1776c472e2ab9b56ec1510bbfdeb8b95c99dce
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

const logic = read('www/logic.js');
const smartHome = read('www/smarthome-config.js');
const appCenter = read('www/ems-apps.js');

assert.ok(logic.includes('function nwDpParentPrefix(id)'), 'NexoLogic: Parent-Prefix-Helfer fehlt.');
assert.ok(logic.includes('let treePrefix = nwDpParentPrefix(initialQuery);'), 'NexoLogic: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(logic.includes('nwRenderDpBreadcrumb(treePrefix, openPrefix);'), 'NexoLogic: Breadcrumb wird nicht auf den aktuellen Ordner gesetzt.');

assert.ok(smartHome.includes('function nwDpParentPrefix(id)'), 'SmartHome: Parent-Prefix-Helfer fehlt.');
assert.ok(smartHome.includes("state.treePrefix = nwDpParentPrefix(state.input.value || '');"), 'SmartHome: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(smartHome.includes("nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);"), 'SmartHome: Breadcrumb wird nicht auf den aktuellen Ordner gesetzt.');

assert.ok(appCenter.includes("const currentInput = targetInputId ? document.getElementById(targetInputId) : null;"), 'AppCenter: aktuelles DP-Eingabefeld wird nicht gelesen.');
assert.ok(appCenter.includes("treePrefix = currentParts.length > 1 ? currentParts.slice(0, -1).join('.') : '';"), 'AppCenter: Picker startet nicht im Ordner des bestehenden DPs.');
assert.ok(appCenter.includes('refreshTree().catch(() => {});'), 'AppCenter: aktueller Ordner wird beim Öffnen nicht geladen.');

console.log('[dp-picker-current-folder] OK: NexoLogic, SmartHome und AppCenter öffnen die DP-Auswahl bei Änderungen wieder im aktuellen Objektordner.');
