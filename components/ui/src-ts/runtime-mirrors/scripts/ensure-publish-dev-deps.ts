// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/ensure-publish-dev-deps.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/ensure-publish-dev-deps.js
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
 * Original-Hash: a86441d76190a728c71ffec98c6813da5545aace5da9e876cae17fa46aaa6134
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
 * Publish-Umgebungsprüfung.
 *
 * Der Release-Check darf keine Abhängigkeiten nachinstallieren und keine Runtime-
 * Dateien verändern. Ein reproduzierbarer Publish beginnt immer mit `npm ci`.
 * Dieses Skript prüft deshalb ausschließlich, ob der lokal installierte
 * TypeScript-Compiler exakt der in package.json festgelegten Version entspricht.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const expected = String(pkg.devDependencies && pkg.devDependencies.typescript || '').trim();
const localPackage = path.join(root, 'node_modules', 'typescript', 'package.json');

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
function fail(message) {
  console.error(`[publish-dev-deps] ERROR: ${message}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(expected)) {
  fail(`TypeScript muss in devDependencies exakt gepinnt sein; gefunden: "${expected || 'fehlt'}".`);
}

if (!fs.existsSync(localPackage)) {
  fail('Lokaler TypeScript-Compiler fehlt. Bitte im sauberen Projektordner zuerst `npm ci` ausführen.');
}

let installed;
try {
  installed = String(JSON.parse(fs.readFileSync(localPackage, 'utf8')).version || '').trim();
} catch (error) {
  fail(`Lokale TypeScript-Installation ist nicht lesbar: ${error && error.message ? error.message : error}`);
}

if (installed !== expected) {
  fail(`Falsche TypeScript-Version installiert: erwartet ${expected}, gefunden ${installed}. ` +
    'Bitte node_modules löschen und anschließend `npm ci` ausführen.');
}

console.log(`[publish-dev-deps] OK: lokaler TypeScript-Compiler ${installed} entspricht dem exakten Release-Pin.`);
