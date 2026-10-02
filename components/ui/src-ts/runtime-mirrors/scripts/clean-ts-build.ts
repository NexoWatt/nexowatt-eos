// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/clean-ts-build.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/clean-ts-build.js
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
 * Original-Hash: 7f034052aa71893f12a483547e08e62118c6e10d89d63e3c0775af39273cd0f4
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
 * Datei: scripts/clean-ts-build.js
 *
 * Zweck:
 * Entfernt temporäre TypeScript-Ausgabeordner, bevor der Declaration-Build läuft.
 * Dadurch bleiben keine alten Build-Artefakte im Paket liegen.
 *
 * Zusammenhang:
 * - `npm run build:ts` ruft zuerst dieses Skript auf.
 * - Danach erzeugt `tsc -p tsconfig.build.json` ausschließlich `.d.ts`-Dateien
 *   unter `build-ts/types`.
 * - Produktive Adapterdateien wie `main.js`, `www/*.js` und `ems/modules/*.js`
 *   werden nicht verändert.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'build-ts'),
  path.join(root, 'build-types'),
  path.join(root, 'build', 'types'),
];

/**
 * Code-Teil: Robustes Löschen der TypeScript-Buildordner.
 *
 * Zweck:
 * Mehrere TS-Runtime-Tests erzeugen kurz nacheinander Unterordner unter build-ts. Auf manchen
 * Dateisystemen kann ein rekursives Löschen kurzfristig mit ENOTEMPTY scheitern. Die Retry-
 * Parameter verhindern, dass reine Test-Builds unnötig abbrechen.
 */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // bewusst leer: kleines Retry-Warten für Dateisysteme, die ENOTEMPTY verzögert melden
  }
}

for (const target of targets) {
  let lastError = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      sleepSync(75);
    }
  }

  if (lastError) {
    console.error(`[clean-ts-build] failed to remove ${target}: ${lastError && lastError.message ? lastError.message : lastError}`);
    process.exitCode = 1;
  } else {
    console.log(`[clean-ts-build] removed ${path.relative(root, target)}`);
  }
}
