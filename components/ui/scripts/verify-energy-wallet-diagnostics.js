#!/usr/bin/env node
'use strict';
const fs = require('fs');
function need(ok, msg) { if (!ok) { console.error('FAIL: ' + msg); process.exitCode = 1; } }
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
