// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-scaffold.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-scaffold.js
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
 * Original-Hash: 532a0d26a06a4a11205fabff4dfacac16cd910d02a866aa54117f611437ab7f2
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
 * Datei: scripts/verify-ts-scaffold.js
 *
 * Zweck:
 * Prüft die TypeScript-Migrationsbasis des Projekts. Dieses Skript ist die
 * Node.js-Laufzeitdatei, die ohne vorherigen TypeScript-Build funktionieren muss.
 *
 * Zusammenhang im Projekt:
 * - Die eigentlichen Regeln liegen jetzt typisiert und ausführlich kommentiert in
 *   `src-ts/scripts/ts-scaffold-rules.ts`.
 * - `scripts/ts-scaffold-rules.js` ist die aktuelle JS-Spiegeldatei, die dieses
 *   Skript zur Laufzeit lädt.
 * - So wächst die Wartungslogik schrittweise Richtung TypeScript, ohne dass
 *   `publish:check` oder lokale Checks an fehlendem `tsc` scheitern.
 *
 * Wichtig:
 * Dieses Skript darf keine produktive Adapter-/EMS-/VIS-Logik laden oder ändern.
 */
const fs = require('fs');
const path = require('path');
const { collectTsScaffoldRuleErrors } = require('./ts-scaffold-rules');

const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Meldet einen Fehler für die Scaffold-Prüfung und setzt `process.exitCode`.
 * Dadurch können mehrere Fehler gesammelt ausgegeben werden, ohne dass der erste
 * Fehler die restlichen Prüfungen sofort abbricht.
 */
function fail(message) {
  console.error(`[ts-scaffold-check] ERROR: ${message}`);
  process.exitCode = 1;
}

/**
 * Code-Teil: readJson
 *
 * Zweck:
 * Liest JSON-Dateien, die der Scaffold-Regelblock benötigt.
 *
 * Zusammenhang:
 * `package.json`, `tsconfig.json` und `tsconfig.build.json` enthalten die
 * Strukturdaten, anhand derer geprüft wird, ob die TypeScript-Basis noch sauber
 * aufgebaut ist.
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (err) {
    fail(`${file} konnte nicht als JSON gelesen werden: ${err.message}`);
    return {};
  }
}

const pkg = readJson('package.json');
const tsconfig = readJson('tsconfig.json');
const buildConfig = readJson('tsconfig.build.json');

/**
 * Code-Teil: typisierte Scaffold-Regeln ausführen.
 *
 * Zweck:
 * Übergibt die geladenen JSON-Daten an den ausgelagerten Regelblock.
 *
 * Zusammenhang:
 * Dieser Block ist der zweite kleine JS→TS-Migrationsschritt im Wartungsbereich:
 * Die Prüfregeln sind bereits in TypeScript formuliert und getestet; dieses JS-
 * Skript bleibt nur noch die CLI-Hülle für Node.js.
 */
const result = collectTsScaffoldRuleErrors(root, pkg, tsconfig, buildConfig);
for (const message of result.errors) fail(message);

if (!process.exitCode) {
  console.log(`[ts-scaffold-check] OK: ${result.stats.srcTsFileCount} TypeScript files checked; ${result.stats.requiredFileCount} required scaffold files present.`);
}
