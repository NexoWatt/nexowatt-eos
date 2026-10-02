// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/ts-doctor.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/ts-doctor.js
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
 * Original-Hash: da44944ff725e172b7fdb0c70887d1b7d10dfe36b40e896391cdecc3ecdeb692
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
 * Code-Teil: TypeScript-Doctor für die Migrationsphase.
 * Zweck: Prüft, ob TypeScript lokal installiert ist, und startet optional den
 *        strikten Typecheck der Dateien unter src-ts/ und tests/types/.
 * Zusammenhang: publish:check bleibt ohne tsc lauffähig; GitHub/CI und
 *        Entwicklungschecks nutzen dieses Skript über npm run typecheck.
 * Wichtig: Dieses Skript verändert keine Adapterlogik. Es erklärt nur sauber,
 *        was fehlt, wenn node_modules noch nicht installiert wurden.
 */
const { spawnSync } = require('child_process');
const path = require('path');

/**
 * Code-Teil: log
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function log(msg) { console.log(`[ts-doctor] ${msg}`); }
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
function fail(msg, code = 1) { console.error(`[ts-doctor] ERROR: ${msg}`); process.exit(code); }

let ts;
try {
  ts = require('typescript');
} catch (_e) {
  fail('TypeScript wurde nicht lokal gefunden. Bitte zuerst "npm install" oder in CI "npm ci" ausführen. Danach: npm run typecheck');
}

log(`TypeScript ${ts.version} gefunden.`);
if (!process.argv.includes('--run')) {
  log('Nur Umgebung geprüft. Für den Typecheck: npm run typecheck');
  process.exit(0);
}

const tscPath = require.resolve('typescript/lib/tsc');
const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.json', '--noEmit'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
process.exit(result.status || 0);
