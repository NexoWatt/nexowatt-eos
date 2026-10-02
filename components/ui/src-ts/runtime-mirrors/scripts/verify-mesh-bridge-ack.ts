// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-bridge-ack.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-bridge-ack.js
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
 * Original-Hash: e2941b568036ed0f55eca9ff78462ae03ad0c0b81da454425d0d706c66901c6f
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
function read(p){return fs.readFileSync(p,'utf8');}
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
function must(file, text){const s=read(file); if(!s.includes(text)){console.error(`Missing in ${file}: ${text}`); process.exit(1);}}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, text){const s=read(file); if(s.includes(text)){console.error(`Forbidden in ${file}: ${text}`); process.exit(1);}}
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '0.8.45 Bridge-ACK');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', '_evaluateLocalBridgeAck');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'classifyLocalBridgeAck');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.localBridge.ackSummaryJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Default Bridge ACK-State');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'meshLocalBridgeAckRows');
must('www/mesh-microgrid.html', 'Bridge ACK / Zielstatus');
must('src-ts/runtime-executables/main.ts', 'LocalBridgeAck');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'setForeignStateAsync(ackStateDp');
console.log('OK: Mesh/Microgrid Bridge ACK/Zielstatus ist TypeScript-first, app-center-konform und ohne direkte Hardwarewrites abgesichert.');
