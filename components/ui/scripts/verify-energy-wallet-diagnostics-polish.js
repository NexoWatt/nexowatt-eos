#!/usr/bin/env node
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
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
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
