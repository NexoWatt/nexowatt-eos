// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-release-guard-static.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-npm-release-guard-static.js
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
 * Original-Hash: 0e5b6a35726e2d934676e5cf4a100ec4382e54844f611bc9182e6c17be123fe2
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
const path = require('path');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/verify-npm-registry-version.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
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
function must(needle, msg) { if (!script.includes(needle)) { console.error('[npm-release-guard] FEHLER:', msg || needle); process.exit(1); } }
must('npm', 'npm view wird genutzt');
must('versions', 'Versionen werden aus Registry gelesen');
must('ETARGET', 'ETARGET-Kontext ist dokumentiert');
must('NEXOWATT_NPM_PACKAGE', 'Paketname kann überschrieben werden');
if (!pkg.scripts || !String(pkg.scripts['release:verify-npm'] || '').includes('verify-npm-registry-version.js')) {
  console.error('[npm-release-guard] FEHLER: package.json Script release:verify-npm fehlt.');
  process.exit(1);
}
console.log('[npm-release-guard] OK: npm Registry Release Guard vorhanden.');
