// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-microgrid.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-microgrid.js
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
 * Original-Hash: 56316ec595b7ec5abaaa3842c98bf5e02305344e354ff7dbd916316afbb36991
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
function read(p){ return fs.readFileSync(p,'utf8'); }
const files = [
  'src-ts/runtime-executables/ems/modules/mesh-microgrid.ts',
  'src-ts/runtime-executables/ems/module-manager.ts',
  'src-ts/runtime-executables/www/ems-apps.ts',
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-executables/ems/services/feature-flags.ts',
];
for (const f of files) {
  if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
}
const mod = read(files[0]);
const mm = read(files[1]);
const ui = read(files[2]);
const main = read(files[3]);
const flags = read(files[4]);
const must = [
  ['module export', mod.includes('MeshMicrogridModule') && mod.includes('module.exports')],
  ['read-only comment', /read-only/i.test(mod) && mod.includes('keine Hardware')],
  ['own states namespace', mod.includes('meshMicrogrid.')],
  ['module-manager registration', mm.includes("key: 'meshMicrogrid'") && mm.includes('enableMeshMicrogrid')],
  ['app catalog', ui.includes("id: 'meshMicrogrid'") && ui.includes('EOS Mesh/Microgrid')],
  ['installer config save', ui.includes('patch.meshMicrogrid') && ui.includes('[data-mesh-node-row]')],
  ['main normalize app', main.includes("id: 'meshMicrogrid'") && main.includes('enableMeshMicrogrid')],
  ['feature flag', flags.includes("meshMicrogrid: 'meshMicrogrid'") && flags.includes("'meshMicrogrid'")],
];
let ok = true;
for (const [name, pass] of must) {
  if (!pass) { console.error(`FAIL mesh-microgrid: ${name}`); ok = false; }
}
if (!ok) process.exit(1);
console.log('OK mesh-microgrid: separate EOS app, TS source, read-only data model and installer wiring present.');
