#!/usr/bin/env node
'use strict';

/**
 * Regressionstest 0.8.23: Energie-Wertkonto bleibt kundensteuerbar.
 *
 * Zweck:
 * - Preise und Ein-/Aus-Schalter müssen im normalen Kundenfrontend unter Einstellungen
 *   liegen, nicht im Installer/App-Center und nicht im dynamischen Tarif-Unterblock.
 * - Das EMS-Modul muss `settings.energyWalletEnabled` beachten.
 * - Stale-Fallback-Kandidaten dürfen keinen gelben Nutzerhinweis erzeugen, wenn ein
 *   frischer gültiger Ersatzwert verwendet wird.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const need = (cond, msg) => {
  if (!cond) {
    console.error('[verify-energy-wallet-customer-settings] FAIL:', msg);
    process.exit(1);
  }
};

const settingsHtml = read('www/settings.html');
const appJs = read('www/app.js');
const mainJs = read('main.js');
const walletJs = read('ems/modules/energy-wallet.js');
const appsJs = read('www/ems-apps.js');

need(settingsHtml.includes('id="s_energyWalletEnabled"'), 'settings.html: Ein-/Aus-Schalter für Energie-Wertkonto fehlt.');
need(settingsHtml.includes('id="energyWalletCustomerBlock"'), 'settings.html: eigener Energie-Wertkonto Abschnitt fehlt.');
need(settingsHtml.includes('id="energyWalletPriceBlock"'), 'settings.html: Preisblock fehlt.');
need(settingsHtml.indexOf('id="energyWalletCustomerBlock"') > settingsHtml.indexOf('id="dynNetFeePanel"'), 'settings.html: Energie-Wertkonto Abschnitt muss unterhalb der Tarif-/Netzentgelt-Blöcke stehen.');
need(!settingsHtml.includes('Energie-Wertkonto Preise 💶'), 'settings.html: alter Preisblock im dynamischen Tarif-Unterblock ist noch vorhanden.');

need(mainJs.includes("energyWalletEnabled: { type: 'boolean'"), 'main.js: settings.energyWalletEnabled State-Definition fehlt.');
need(mainJs.includes("'energyWalletEnabled'") && mainJs.includes("'energyWalletFixedImportEurPerKwh'"), 'main.js: settings.energyWalletEnabled wird nicht als lokaler Settings-State gespiegelt.');
need(appJs.includes('updateEnergyWalletSettingsVisibility'), 'www/app.js: Settings-UI-Sichtbarkeit für Energie-Wertkonto fehlt.');
need(appJs.includes('settings.energyWalletEnabled'), 'www/app.js: LIVE-Karte beachtet Kunden-Schalter nicht.');
need(walletJs.includes("this._readStateBool(['settings.energyWalletEnabled'], true)"), 'energy-wallet.js: EMS-Modul beachtet Kunden-Schalter nicht.');
need(walletJs.includes('Stale-Quellen in der Fallback-Liste sind Diagnoseinformation'), 'energy-wallet.js: Stale-Fallback-Kommentar/Fix fehlt.');
need(!appsJs.includes('Einstellungen → Dynamische Zeittarife'), 'ems-apps.js: Installerhinweis verweist noch auf falschen dynamischen Tarif-Unterblock.');

console.log('[verify-energy-wallet-customer-settings] OK');
