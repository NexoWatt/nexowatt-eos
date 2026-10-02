// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-nvp-smoothing-building-load.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-nvp-smoothing-building-load.js
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
 * Original-Hash: d6ee1658691de0a3b05942186b1f31b5d76e92e0fd9d7ce428351c3cbeda210e
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
 * Regression 0.8.92: Speicher-NVP-Glättung + Gebäudeverbrauchsquelle.
 *
 * Zweck:
 * - Die Eigenverbrauchsoptimierung des Speichers soll nicht mehr jeden kleinen
 *   NVP-Messsprung ungefiltert in einen neuen Sollwert übersetzen. Ein RAW-Guard
 *   bleibt erhalten, damit echter größerer Netzbezug/Export sofort wirkt.
 * - Die Gebäudeverbrauchsberechnung soll einen frischen gemappten Verbrauchs-DP
 *   bevorzugen und die Bilanz nur als Fallback/Diagnose verwenden.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

/**
 * Code-Teil: contains
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function contains(file, needle, label) {
  assert(file.includes(needle), label || `missing ${needle}`);
}

const storageTs = read('src-ts/runtime-executables/ems/modules/storage-control.ts');
const storageJs = read('ems/modules/storage-control.js');
const mainTs = read('src-ts/runtime-executables/main.ts');
const mainJs = read('main.js');
const appsTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const appsJs = read('www/ems-apps.js');
const appsHtml = read('www/ems-apps.html');

contains(storageTs, '_buildSelfNvpControlSignal', 'NVP-Glättungshelfer fehlt');
contains(storageTs, 'selfNvpFilteredW', 'NVP-Filter-Diagnose fehlt');
contains(storageTs, 'raw-import-guard', 'RAW-Import-Guard fehlt');
contains(storageTs, 'raw-export-guard', 'RAW-Export-Guard fehlt');
contains(storageTs, 'speicher.regelung.selfNvpControlW', 'NVP-Führungswert-State fehlt');
contains(storageTs, 'selfNvpSmoothingSec', 'Runtime-Konfiguration für NVP-Filter fehlt');
contains(storageTs, 'nvpControlForBalanceW', 'Sungrow-NVP-Balancing nutzt den geglätteten Führungswert nicht');
contains(storageJs, '_buildSelfNvpControlSignal', 'Runtime-JS enthält die NVP-Glättung nicht');
contains(storageJs, 'speicher.regelung.selfNvpControlW', 'Runtime-JS schreibt den NVP-Führungswert nicht');

contains(mainTs, 'derived.core.building.loadSource', 'Gebäudelast-Quelle-State fehlt');
contains(mainTs, 'mapped:consumptionTotal', 'direkter Verbrauchs-DP wird nicht als Quelle markiert');
contains(mainTs, 'balance:pv+nvp+storage', 'Bilanz-Fallback der Gebäudelast fehlt');
contains(mainTs, 'directLoadTotalW', 'direkte Gebäudelast-Auswertung fehlt');
contains(mainTs, 'selectedLoadTotalW', 'Gebäudelast-Diagnose mit ausgewähltem Wert fehlt');
contains(mainJs, 'derived.core.building.loadSource', 'Runtime-JS enthält Gebäudelast-Quellenstate nicht');
contains(mainJs, 'mapped:consumptionTotal', 'Runtime-JS bevorzugt gemappten Verbrauch nicht');

contains(appsTs, 'storageSelfNvpSmoothingSec', 'AppCenter-Feld für NVP-Filterzeit fehlt');
contains(appsTs, 'selfNvpRawGuardW', 'AppCenter-Speicherung für RAW-Guard fehlt');
contains(appsJs, 'storageSelfNvpSmoothingSec', 'Runtime-AppCenter-JS enthält NVP-Filterfeld nicht');
contains(appsHtml, 'NVP-Regelung Eigenverbrauch', 'AppCenter-UI-Block für Speicher-NVP-Regelung fehlt');
contains(appsHtml, 'storageSelfNvpRawGuardW', 'AppCenter-RAW-Guard-Eingabe fehlt');

console.log('[storage-nvp-smoothing-building-load] OK: NVP-Glättung, RAW-Guard und Gebäudelast-Quellenprüfung sind verdrahtet.');
