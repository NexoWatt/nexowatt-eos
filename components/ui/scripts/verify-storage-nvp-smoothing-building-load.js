#!/usr/bin/env node
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

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

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
