// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-main-helpers-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-main-helpers-runtime.js
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
 * Original-Hash: ffd811f37cd34d8bc9837d3c46c8dcd950d9f2e9c1fe9d4e5eabf122e6172fdc
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
 * Datei: scripts/verify-ts-main-helpers-runtime.js
 *
 * Zweck:
 * Bündel-Check für den 0.7.98-Schritt „main.js in echte TypeScript-Helfer auslagern“.
 *
 * Zusammenhang:
 * Es gibt zwei Ebenen:
 * - `src-ts/backend/main-helpers/*` bereitet API-/State-Schreibpläne vor.
 * - `src-ts/backend/main-runtime/main-runtime-helpers.ts` wird bereits von `main.js`
 *   kontrolliert genutzt, z. B. für Lizenzmasken und `info.connection`.
 *
 * Wichtig:
 * Dieser Check soll bei `publish:check` schnell erkennen, ob die TS-Helfer, JS-Spiegel
 * und main.js-Anbindung auseinanderlaufen.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: run
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function run(script) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script)], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

// Code-Teil: Reihenfolge der Checks. Zweck: Erst allgemeine main-Helfer prüfen,
// danach die echte main.js-Runtime-Anbindung an den TS-Spiegel prüfen.
run('verify-ts-main-helpers.js');
run('verify-ts-main-runtime-helpers.js');

console.log('[verify-ts-main-helpers-runtime] OK: main-Helfer und Runtime-Anbindung sind gültig.');
