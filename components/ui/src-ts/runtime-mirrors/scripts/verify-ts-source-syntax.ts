// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-source-syntax.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-source-syntax.js
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
 * Original-Hash: 62e612769110f78ae76fa1053676be2f16f1222192cf280dbeaaf72393d94ff9
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
 * Datei: scripts/verify-ts-source-syntax.js
 *
 * Zweck:
 * Prüft alle TypeScript-Quelldateien unter `src-ts/` auf reine Syntaxfehler.
 *
 * Zusammenhang:
 * In der TS-Migrationsphase können beschädigte oder unvollständig zusammengeführte
 * Dateien im Editor als Fehler auftauchen, obwohl die produktive JavaScript-Runtime noch
 * läuft. Dieser Check fängt genau solche Probleme früh ab, bevor wir weiter migrieren.
 *
 * Wichtig:
 * Dieser Check ersetzt nicht den vollständigen `npm run typecheck`. Er ist ein schneller
 * Zusatzschutz gegen abgeschnittene Dateien, offene Klammern, kaputte Importsyntax oder
 * Merge-Reste in TS-Quellen.
 */

const fs = require('fs');
const path = require('path');

/**
 * Code-Teil: loadTypescriptCompiler
 *
 * Zweck:
 * Lädt den lokal installierten TypeScript-Compiler aus den Projektabhängigkeiten.
 *
 * Zusammenhang:
 * Der Check wird in der Git-/CI-Umgebung nach `npm ci` ausgeführt. Lokal ohne
 * `node_modules` soll die Fehlermeldung klar sagen, was fehlt.
 */
function loadTypescriptCompiler() {
  try {
    return require('typescript');
  } catch (err) {
    console.error('[ts-source-syntax] ERROR: TypeScript ist nicht installiert. Bitte zuerst `npm install` oder `npm ci` ausführen.');
    process.exit(1);
  }
}

/**
 * Code-Teil: walkTypeScriptFiles
 *
 * Zweck:
 * Sammelt rekursiv alle `.ts`-Dateien unterhalb eines Startordners.
 *
 * Zusammenhang:
 * Wir prüfen bewusst nur `src-ts/`, weil dort unsere menschenlesbaren TS-Quellen liegen.
 * Generierte Spiegeldateien werden durch eigene Mirror-Checks geprüft.
 */
function walkTypeScriptFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTypeScriptFiles(full, out);
    } else if (entry.isFile() && full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Code-Teil: formatDiagnostic
 *
 * Zweck:
 * Formatiert TypeScript-Parsefehler so, dass man Datei, Zeile und Spalte direkt findet.
 *
 * Zusammenhang:
 * Das war beim VS-Code-Problem wichtig: Man muss sofort erkennen, welche TS-Datei
 * wirklich kaputt ist und nicht nur in der Seitenleiste ein Ausrufezeichen sehen.
 */
function formatDiagnostic(ts, fileName, sourceFile, diagnostic) {
  let location = fileName;
  if (sourceFile && typeof diagnostic.start === 'number') {
    const pos = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
    location = `${fileName}:${pos.line + 1}:${pos.character + 1}`;
  }
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  return `${location} - TS${diagnostic.code}: ${message}`;
}

/**
 * Code-Teil: checkFileSyntax
 *
 * Zweck:
 * Erstellt für eine einzelne TS-Datei ein TypeScript-SourceFile und wertet nur
 * syntaktische Diagnosen aus.
 *
 * Zusammenhang:
 * Das ist absichtlich schlanker als ein kompletter Typecheck. Fachliche Typfehler bleiben
 * Aufgabe von `npm run typecheck`, Syntaxbrüche werden hier schnell und eindeutig erkannt.
 */
function checkFileSyntax(ts, fileName) {
  const code = fs.readFileSync(fileName, 'utf8');
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sourceFile.parseDiagnostics.map((diagnostic) => formatDiagnostic(ts, fileName, sourceFile, diagnostic));
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Führt die TS-Quellsyntaxprüfung aus und bricht bei Fehlern mit Exit-Code 1 ab.
 *
 * Zusammenhang:
 * Dieser Check ist die Sicherheitsleine, bevor wir weitere JS→TS-Migrationsschritte
 * starten. Er verhindert, dass unvollständige TS-Dateien unbemerkt im Repository landen.
 */
function main() {
  const ts = loadTypescriptCompiler();
  const root = process.cwd();
  const srcTsDir = path.join(root, 'src-ts');
  const files = walkTypeScriptFiles(srcTsDir).sort();
  const errors = [];

  for (const file of files) {
    errors.push(...checkFileSyntax(ts, file));
  }

  if (errors.length) {
    console.error('[ts-source-syntax] ERROR: TypeScript-Syntaxfehler gefunden:');
    for (const err of errors) console.error(' - ' + err);
    process.exit(1);
  }

  console.log(`[ts-source-syntax] OK: ${files.length} TypeScript-Quelldateien syntaktisch gültig.`);
}

main();
