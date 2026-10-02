// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-wallet-diagnostics-polish.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-wallet-diagnostics-polish.js
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
 * Original-Hash: d4b0dfd0e37a1d73fa6bf0f43b168c094dce15f2d0df487ebd896a746cc9ad0a
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
 * Regressionstest 0.8.24: Energie-Wertkonto Diagnose & Preisquellen-Feinschliff.
 *
 * Zweck:
 * - Nutzerhinweise und Installateurdiagnosen dürfen nicht mehr derselbe Text sein.
 * - Dynamische Tarifpreise müssen Quelle, Alter und Stale-Status veröffentlichen.
 * - Die Preisquelle darf optional in der LIVE-Karte angezeigt werden.
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
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const need = (cond, msg) => { if (!cond) { console.error('[verify-energy-wallet-diagnostics-polish] FAIL:', msg); process.exit(1); } };
const walletTs = read('src-ts/runtime-executables/ems/modules/energy-wallet.ts');
const walletJs = read('ems/modules/energy-wallet.js');
const appTs = read('src-ts/runtime-executables/www/app.ts');
const settingsHtml = read('www/settings.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const pkg = JSON.parse(read('package.json'));
const ioPkg = JSON.parse(read('io-package.json'));
need(!!pkg.version && !!ioPkg.common && pkg.version === ioPkg.common.version, 'package.json und io-package.json muessen dieselbe Release-Version verwenden.');
for (const src of [walletTs, walletJs]) {
  need(src.includes('energyWallet.diagnostics.customerWarning'), 'customerWarning-State fehlt in EnergyWallet Runtime.');
  need(src.includes('energyWallet.diagnostics.installerWarning'), 'installerWarning-State fehlt in EnergyWallet Runtime.');
  need(src.includes('currentDynamicPriceAgeSec'), 'Alter des dynamischen Tarifpreises fehlt.');
  need(src.includes('currentDynamicPriceSource'), 'Quelle des dynamischen Tarifpreises fehlt.');
  need(src.includes('dynamicTariffStale'), 'Stale-Status für dynamischen Tarifpreis fehlt.');
  need(src.includes('priceSourceLabel'), 'lesbare Preisquelle fehlt.');
}
need(appTs.includes('energyWalletPriceSourceText'), 'LIVE-Preisquellenanzeige fehlt.');
need(appTs.includes('settings.energyWalletShowPriceSource'), 'LIVE-Preisquellenanzeige beachtet Kundenschalter nicht.');
need(settingsHtml.includes('id="s_energyWalletShowPriceSource"'), 'Kundenschalter für Preisquelle fehlt.');
need(mainTs.includes('energyWalletShowPriceSource'), 'settings.energyWalletShowPriceSource State-Definition/Spiegelung fehlt.');
console.log('[verify-energy-wallet-diagnostics-polish] OK');
