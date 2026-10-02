// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-grid-export-guard-diagnostics.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-grid-export-guard-diagnostics.js
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
 * Original-Hash: 9c5fdc3b6a617cbca0ae4b45677f5d93e54f3e1d296f5756a05d22179d464390
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
const root = process.cwd();
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
 * Code-Teil: requireToken
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireToken(file, token) {
  const txt = read(file);
  if (!txt.includes(token)) throw new Error(`${file}: missing token ${token}`);
}
const grid = 'src-ts/runtime-executables/ems/modules/grid-constraints.ts';
const wallet = 'src-ts/runtime-executables/ems/modules/energy-wallet.ts';
const app = 'src-ts/runtime-executables/www/app.ts';
['gridConstraints.exportLimit.currentExportW','gridConstraints.exportLimit.effectiveMaxFeedInW','gridConstraints.exportLimit.estimatedCurtailmentW','gridConstraints.exportLimit.missingWriteDatapointsJson','gridConstraints.exportLimit.negativePriceStrategy','_exportWriteDiagnostics','_publishExportLimitStates','_estimateCurtailmentW'].forEach(t => requireToken(grid, t));
['energyWallet.exportGuardBridge.summaryJson','curtailedKwh','curtailedValueEur','unusedPvValueEur','_exportGuardBridge'].forEach(t => requireToken(wallet, t));
['energyWalletExportGuardGrid','energyWallet.today.curtailedKwh','energyWallet.today.curtailedValueEur','energyWallet.today.unusedPvValueEur'].forEach(t => requireToken(app, t));
const appTxt = read(app);
if (appTxt.includes('curtailedPvKwh') || appTxt.includes('curtailedPvValueEur')) throw new Error('app.ts contains obsolete curtailedPv* state names');
console.log('Export Guard diagnostics / Energy Wallet curtailment checks passed.');
