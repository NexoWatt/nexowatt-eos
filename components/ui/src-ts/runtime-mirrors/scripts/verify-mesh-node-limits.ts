// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-node-limits.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-node-limits.js
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
 * Original-Hash: f0e7080d276d79184e19ee09ecbbd6eee21b385682298fa2aaa1add526d05139
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
 * Regressionstest 0.8.48: Mesh/Microgrid Leistungsgrenzen je Knoten.
 * Schützt die Produktgrenze: Limits begrenzen nur neutrale Command-Intents und
 * erzeugen keine direkten OCPP/Modbus/MQTT/Hersteller-Schreibpfade.
 */
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
function read(p){ return fs.readFileSync(p,'utf8'); }
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
function must(file, text){ const s=read(file); if(!s.includes(text)){ console.error(`Missing in ${file}: ${text}`); process.exit(1); } }
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
function mustNot(file, text){ const s=read(file); if(s.includes(text)){ console.error(`Forbidden in ${file}: ${text}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'buildCommandLimitDiagnostics');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'maxImportW');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'meshMicrogrid.limits.blockedCommandsJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'power_limit_blocked');
must('src-ts/runtime-executables/www/ems-apps.ts', 'data-mesh-field="maxChargeW"');
must('src-ts/runtime-executables/www/ems-apps.ts', 'readMeshPowerLimit');
must('src-ts/runtime-executables/www/mesh-microgrid.ts', 'renderLimits');
must('www/mesh-microgrid.html', 'Leistungsgrenzen');
must('src-ts/runtime-executables/main.ts', 'payload.limits');
must('src-ts/runtime-executables/main.ts', 'Limited');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'directHardwareWrite: false');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'ocpp.');
mustNot('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts', 'modbus.');
console.log('OK: Mesh/Microgrid Leistungsgrenzen sind im CommandGuard, UI und API sichtbar und bleiben herstellerneutral.');
