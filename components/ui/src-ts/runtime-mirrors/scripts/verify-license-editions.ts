// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-license-editions.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-license-editions.js
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
 * Original-Hash: 486804e2fbd27f01816bd346889d135408e3fca21fb3553979929a28c18337b9
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
 * Prüft das Lizenzmodell ab 0.8.137:
 * - Home/Pro bleiben die Produktmatrix; Rechte stammen aus zentralen NWL2-Leases.
 * - Home = kleiner freigegebener Funktionsumfang
 * - keine lokale Freischaltung durch alte NW1/NW1T-Schlüssel oder fehlende Lizenzdaten
 * - TypeScript-Migrationsdiagnosen sind aus der sichtbaren App-Center-UI entfernt
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
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const errors = [];
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
const need = (ok, msg) => { if (!ok) errors.push(msg); };

const main = read('main.js');
const moduleManager = read('ems/module-manager.js');
const app = read('www/ems-apps.js');
const html = read('www/ems-apps.html');
const ioPackage = JSON.parse(read('io-package.json'));
const pkg = JSON.parse(read('package.json'));

need(ioPackage.common && ioPackage.common.version === pkg.version, `io-package.json: Version muss ${pkg.version} sein.`);
need(main.includes('eosIntegrated.makeLicenseClient(this)'), 'main.js: zentrale NWL2-Lease fehlt.');
need(!main.includes('_nwExpectedEditionLicenseKey') && !main.includes('_nwExpectedEditionTrialKey'), 'main.js: lokale NW1-Freischaltung darf nicht wieder eingefuehrt werden.');
need(main.includes('_nwLicenseFeaturesForEdition'), 'main.js: zentraler Feature-Katalog fehlt.');
need(main.includes('peakShaving') && main.includes('storageFarm') && main.includes('multiUse'), 'main.js: EOS-only Features fehlen.');
need(main.includes('chargingManagement') && main.includes('heatingRodControl') && main.includes('thresholdControl'), 'main.js: HEMS Feature-Whitelist unvollständig.');
need(main.includes('energyWallet') && main.includes('energyWalletPro'), 'main.js: Energie-Wertkonto muss Home/EOS-Feature sein.');
need(main.includes('_nwLicenseMaxWallboxes') && main.includes("Math.min(count, edition === 'hems' ? 3 : 50)"), 'main.js: HEMS-Wallboxlimit 3 fehlt.');
need(main.includes('featuresJson: JSON.stringify(featureInfo)') && main.includes('maxWallboxes: featureInfo.maxWallboxes'), 'main.js: Lizenz-States für Edition/Features/Wallboxlimit fehlen.');
need(main.includes('storagePowerProfile: featureInfo.storagePowerProfile.id') && main.includes('maxStoragePowerW: featureInfo.maxStoragePowerW'), 'main.js: Home/Pro-Speicherleistungs-States fehlen.');
need(main.includes('_nwApplyLicenseLimitsToInstallerPatch'), 'main.js: Backend-Gate für Installer-Patches fehlt.');
need(main.includes('cfgOut.license = this._nwBuildLicenseFeatureInfo()'), 'main.js: Installer-API liefert Lizenzinfo nicht aus.');
need(main.includes('sendNoStore(res)') && main.includes('Refresh the runtime license cache here'), 'main.js: Installer-API muss Lizenzcache refreshen und no-store liefern.');
need(main.includes('_nwRefreshLicenseFromConfiguredKey'), 'main.js: Lizenzstatus-Refresh aus gespeicherter Adapter-Konfiguration fehlt.');
need(main.includes("await this._nwRefreshLicenseFromConfiguredKey(false)") && main.includes("app.use(async (req, res, next)"), 'main.js: Lizenz-API/App-Center/VIS-Gate müssen die Freischaltung ohne manuellen Neustart synchronisieren.');
need(moduleManager.includes('_licenseAllowsApp'), 'ems/module-manager.js: Modulmanager-Lizenzgate fehlt.');
// Module bekommen ausschliesslich dieselbe lebende Backendfreigabe wie API/UI.
// Eine kopierte Editionsmatrix darf bei Ausfall keinen lokalen Grant erzeugen.
need(moduleManager.includes('_nwLicenseAllowsAppId?.(') && !moduleManager.includes('const hemsApps = new Set'), 'Modulmanager: zentrale Featureentscheidung ohne lokalen Notfall-Grant fehlt.');
need(moduleManager.includes("key: 'peakShaving'") && moduleManager.includes("this._licenseAllowsApp('peak')"), 'ems/module-manager.js: Peak-Shaving muss EOS-gated sein.');
need(moduleManager.includes("key: 'chargingManagement'") && moduleManager.includes("this._licenseAllowsApp('charging')"), 'ems/module-manager.js: Lademanagement-Gate fehlt.');
need(app.includes('HEMS_APP_IDS'), 'www/ems-apps.js: HEMS-App-Whitelist fehlt.');
need(app.includes('Lizenz: ${_licenseLabel()}'), 'www/ems-apps.js: Lizenzkarte im App-Center fehlt.');
need(app.includes("if (ed === 'eos') return 'Pro'"), 'www/ems-apps.js: Vollprodukt muss sichtbar als Pro bezeichnet werden.');
need(app.includes("Home · max. 50 kW") && app.includes("Pro · frei skalierbar"), 'www/ems-apps.js: Home/Pro-Speicherleistungsprofil fehlt.');
need(html.includes('storageRatedPowerKW') && html.includes('storageLicensePowerProfile'), 'www/ems-apps.html: Speicher-Nennleistung und Lizenzprofil fehlen.');
need(app.includes('fetchLicenseInfoFallback') && app.includes('/api/license/features?t='), 'www/ems-apps.js: No-Cache-Lizenzfallback aus /api/license/info fehlt.');
need(main.includes("app.get('/api/license/features', requireInstaller") && main.includes('...this._nwBuildLicenseFeatureInfo()'), 'main.js: rollengetrennter aktueller Feature-Snapshot fehlt.');
need(!app.includes('_inferLicenseFromSuccessfulInstallerGate') && !app.includes('fetchLicenseInfoFromStateFallback'), 'App-Center: HTTP-Erfolg oder alte States duerfen keinen Grant erzeugen.');
need(app.includes('src.valid === true') && app.includes('src.validUntil <= now + 15000'), 'App-Center: kurze Lease muss aktuell und explizit gueltig sein.');
need(main.includes('res.json({ ok: true, license: cfgOut.license, config: cfgOut'), 'main.js: Installer-API muss Lizenzdaten top-level ausgeben.');
need(app.includes('licenseBlocked') && app.includes('requiredLicense'), 'www/ems-apps.js: UI-Patch muss nicht lizenzierte Apps blockieren.');
need(app.includes('function _maxEvcsCount') && app.includes('els.evcsCount.max = String(_maxEvcsCount())'), 'www/ems-apps.js: HEMS-Wallboxlimit in UI fehlt.');
need(app.includes('fetchLicenseInfoFallback') && app.includes('/api/license/features?t=') && app.includes('normalizeLicenseInfo(currentConfig.license)'), 'www/ems-apps.js: App-Center muss Live-Lizenzinfo als Fallback nachladen.');
const applyConfigIdx = app.indexOf('function applyConfigToUI(cfg)');
const applyConfigBlock = applyConfigIdx >= 0 ? app.slice(applyConfigIdx, applyConfigIdx + 1200) : '';
const licenseAssignIdx = applyConfigBlock.indexOf('currentLicenseInfo = normalizeLicenseInfo(currentConfig.license)');
const rebuildIdx = applyConfigBlock.indexOf('try { buildAppsUI(); } catch (_eBuildApps) {}');
const setAppsIdx = applyConfigBlock.indexOf('setAppsFromConfig(currentConfig);');
need(applyConfigIdx >= 0 && licenseAssignIdx >= 0 && rebuildIdx > licenseAssignIdx && setAppsIdx > rebuildIdx, 'www/ems-apps.js: App-Liste muss nach Lizenzladung neu gebaut werden, sonst bleibt EOS bei "Keine Apps verfügbar" hängen.');
need(!html.includes('TypeScript Shadow'), 'www/ems-apps.html: sichtbare TypeScript-Shadow-Diagnose muss entfernt bleiben.');
need(!html.includes('energyFlowTsMode'), 'www/ems-apps.html: sichtbarer TS-Schaltmodus muss entfernt bleiben.');
need(!html.includes('shadowDiagnostics'), 'www/ems-apps.html: sichtbarer Shadow-Container muss entfernt bleiben.');

if (errors.length) {
  console.error('[license-editions] Fehler:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('[license-editions] OK: Home/Pro-Lizenzmodell (intern HEMS/EOS) und Speicherleistungsprofile sind verdrahtet.');
