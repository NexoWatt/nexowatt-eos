// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-summary-actual.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-loadmanagement-summary-actual.js
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
 * Original-Hash: db7f0153a13558b7ac767c46fb1e35bd654581173e73b686065ed3caeb120f61
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
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(p,s,label){const t=read(p); if(!t.includes(s)){console.error(`[loadmanagement-summary-actual] missing ${label}: ${s}`); process.exit(1);}}
const cm = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
const packageJson = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(String(packageJson.version || ''))) {
  console.error('[loadmanagement-summary-actual] package.json enthält keine gültige SemVer-Version.');
  process.exit(1);
}
need('src-ts/runtime-executables/ems/modules/charging-management.ts','applyActualW','TS-Control darf Summary-Ist nicht aus Reserve überschreiben');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','totalPowerW: totalFreshActualPowerW','TS-Control bekommt Actual statt Reserve');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','summary.totalReservedPowerW','Reservierung bleibt getrennt');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','activeDemandReserveW','Reservierung folgt aktivem Ladebedarf');
need('src-ts/runtime-executables/ems/modules/charging-management.ts','budgetDebug.evcsActualW = (typeof totalFreshActualPowerW','Debug actual nutzt frischen Istwert');
const badApply = "await this._queueState('chargingManagement.summary.totalPowerW', Number.isFinite(Number(apply.totalPowerW)) ? Number(apply.totalPowerW) : 0, true);";
if (cm.includes(badApply)) { console.error('[loadmanagement-summary-actual] old apply.totalPowerW overwrite still present'); process.exit(1); }
console.log('[loadmanagement-summary-actual] OK');
