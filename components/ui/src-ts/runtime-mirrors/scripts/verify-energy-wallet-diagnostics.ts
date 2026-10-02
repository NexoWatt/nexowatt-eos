// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-wallet-diagnostics.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-wallet-diagnostics.js
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
 * Original-Hash: 3f2a8b191dd3f7e73b36e67a0c0191d947fbec795d92f612824931f7bab3b3d4
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
function need(ok, msg) { if (!ok) { console.error('FAIL: ' + msg); process.exitCode = 1; } }
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
function read(path) { return fs.readFileSync(path, 'utf8'); }
const wallet = read('src-ts/runtime-executables/ems/modules/energy-wallet.ts');
const app = read('src-ts/runtime-executables/www/app.ts');
const settings = read('www/settings.html');
const main = read('src-ts/runtime-executables/main.ts');
need(wallet.includes('customerWarning') && wallet.includes('installerWarning'), 'Energy Wallet muss Kundenhinweis und Installateurdiagnose trennen.');
need(wallet.includes('currentDynamicPriceAgeSec') && wallet.includes('currentDynamicPriceSource'), 'Dynamischer Tarif braucht Quelle und Alter.');
need(wallet.includes('dynamicTariffMaxAgeSec') && wallet.includes('dynamicTariffWarning'), 'Dynamischer Tarif braucht Stale-Fallback-Hinweis.');
need(app.includes('energyWalletPriceSourceText') && app.includes('settings.energyWalletShowPriceSource'), 'LIVE-Karte braucht optionalen Preisquellen-Hinweis.');
need(settings.includes('s_energyWalletShowPriceSource') && settings.includes('Preisquelle in LIVE-Karte anzeigen'), 'Kundeneinstellungen brauchen Schalter für Preisquellenanzeige.');
need(main.includes('energyWalletShowPriceSource'), 'settings.energyWalletShowPriceSource muss als State/API-Key vorbereitet sein.');
need(wallet.includes('warning: customerWarning'), 'Technische Plausibilisierung darf nicht mehr als Kundenwarnung veröffentlicht werden.');
need(wallet.includes('Keine Kunden-Banner für Tarif-Fallback') || wallet.includes('Kein Kunden-Banner für Tarif-Fallback'), 'Tarif-Fallback muss installerdiagnostisch bleiben und darf kein gelbes Kundenbanner erzwingen.');
need(app.includes('energyWallet.diagnostics.customerWarning'), 'LIVE-Karte muss den getrennten Kundenhinweis verwenden.');

if (!process.exitCode) console.log('OK: energy-wallet diagnostics 0.8.24 checks passed.');
