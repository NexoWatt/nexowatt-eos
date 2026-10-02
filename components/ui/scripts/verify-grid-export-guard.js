#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assertMatch(rel, re, msg) {
  const txt = read(rel);
  if (!re.test(txt)) {
    console.error(`[grid-export-guard] FAIL: ${msg} (${rel})`);
    process.exit(1);
  }
  console.log(`[grid-export-guard] OK: ${msg}`);
}
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /_isExportLimitInstallerApproved/, 'Installer-Freigabe ist in GridConstraints vorhanden');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /_getMaxFeedInPowerW/, 'maximale Einspeiseleistung wird zentral gelesen');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /targetGridW\s*=\s*biasW\s*-\s*maxFeedInPowerW/, 'Regelziel nutzt erlaubte Einspeiseleistung statt nur 0 W');
assertMatch('src-ts/runtime-executables/ems/modules/grid-constraints.ts', /feedInLimitW',\s*maxFeedInPowerW/, 'Einzel-WR Feed-in-Limit schreibt die Installergrenze');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /Installateurfreigabe Einspeisebegrenzung/, 'App-Center hat Freigabe-Schalter');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /(?:Lokale Sicherheitsobergrenze Einspeisung|Maximale Einspeiseleistung)/, 'App-Center hat maximale Einspeiseleistung');
assertMatch('src-ts/runtime-executables/www/ems-apps.ts', /Export Guard für DE\/NL/, 'UI-Hinweis beschreibt DE/NL Export Guard');
console.log('[grid-export-guard] Alle Prüfungen bestanden.');
