// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-peer-fieldtest.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-peer-fieldtest.js
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
 * Original-Hash: 06664781aa9770765bd840b0f1feffe189f00c76dcde842622718945f6e7450c
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
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
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
function must(file, needle) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`Missing in ${file}: ${needle}`);
    process.exit(1);
  }
}

must('src-ts/runtime-executables/main.ts', "/api/mesh/peer/fieldtest");
must('src-ts/runtime-executables/main.ts', 'nexowatt.mesh-two-instance-fieldtest-api.v1');
must('src-ts/runtime-executables/main.ts', 'fieldTestProbe');
must('src-ts/runtime-executables/main.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/main.ts', 'neutralCommandOnly: true');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.fieldTest.lastManualTestJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-two-instance-fieldtest.v1');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'runFieldTest');
must('www/mesh-microgrid.html', 'Peer-Handshake + Probe-Command testen');

console.log('OK: Mesh/Microgrid Zwei-Instanzen-Feldtest statisch geprüft.');
