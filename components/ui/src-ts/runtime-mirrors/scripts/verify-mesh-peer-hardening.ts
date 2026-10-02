// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-peer-hardening.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-peer-hardening.js
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
 * Original-Hash: 030156619a8203430cc3d1f89d9bacef4e9cbfb9dbe8b49e0317766be6243d4e
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
 * Regressionstest für 0.8.43 Mesh/Microgrid Peer-Härtung.
 * Schützt die Feldtest-Diagnose: Fehlerklassen, Roundtrip-Ampel, Allowlist
 * und Remote-Node-Matrix müssen in TS-Quelle, Runtime und Betreiberansicht
 * vorhanden bleiben. Es wird keine Hardwaresteuerung geprüft oder eingeführt.
 */
const fs = require('fs');
const path = require('path');
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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const must = (file, needle) => {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`Missing in ${file}: ${needle}`);
    process.exit(1);
  }
};
/**
 * Code-Teil: not
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const not = (file, needle) => {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`Forbidden in ${file}: ${needle}`);
    process.exit(1);
  }
};
for (const file of ['src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','src-ts/runtime-executables/main.ts']) {
  must(file, 'errorClassesJson');
  must(file, 'roundtripStatus');
  must(file, 'remoteNodeMatrixJson');
  must(file, 'allowedPeerNodeIds');
  must(file, 'directHardwareWrite: false');
  must(file, 'neutralCommandOnly: true');
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'classifyPeerFieldTestIssue');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildRemoteNodeMatrixFromPeers');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'meshFieldTestHardening');
must('www/mesh-microgrid.html', 'meshRemoteNodeMatrixRows');
not('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ocpp.');
not('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'modbus.');
console.log('OK: Mesh/Microgrid Peer-Härtung mit Fehlerklassen, Roundtrip-Ampel, Allowlist und Remote-Node-Matrix ist vorhanden.');
