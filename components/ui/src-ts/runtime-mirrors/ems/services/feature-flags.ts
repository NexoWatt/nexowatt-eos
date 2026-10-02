// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/feature-flags.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/feature-flags.js
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
 * Original-Hash: 13794997813dfc671721bfba5736a939161863ff3ca54667cec332e1ed29d188
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/feature-flags.ts
 * Quell-Hash: sha256:dc53649ceae61335864c86b419839d2687c89c72ffe57476deb1754d0cc5633e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/feature-flags.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bestimmt, welche konfigurierten Funktionen im jeweiligen Laufzeitkontext freigegeben sind.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/feature-flags.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/feature-flags.js
 *
 * Zweck:
 * Zentrale Home/Pro-Feature- und Leistungs-Matrix. `eos` bleibt als technischer
 * Legacy-Name und Lizenzschlüssel-Edition kompatibel; im Produkt wird diese
 * Vollausstattung als Pro-Profil behandelt. HEMS bleibt der technische Alias
 * für die Home-Lizenz.
 */
'use strict';

const HOME_APP_IDS = new Set([
  'charging',
  'storage',
  'storagefarm',
  'thermal',
  'heatingrod',
  'threshold',
  'relay',
  'grid',
  'aiAdvisor',
  'tariff',
  'para14a',
  'energyWallet',
  'energyLedger',
  'nlP1',
]);

const APP_FEATURE_MAP = Object.freeze({
  charging: 'chargingManagement',
  peak: 'peakShaving',
  storage: 'storageControl',
  storagefarm: 'storageFarm',
  thermal: 'thermalControl',
  heatingrod: 'heatingRodControl',
  bhkw: 'bhkwControl',
  generator: 'generatorControl',
  threshold: 'thresholdControl',
  relay: 'relayControl',
  grid: 'gridConstraints',
  aiAdvisor: 'aiAdvisor',
  tariff: 'dynamicTariffs',
  para14a: 'para14a',
  multiuse: 'multiUse',
  countryProfile: 'countryProfile',
  energyWallet: 'energyWallet',
  energyLedger: 'energyLedger',
  chargeKiosk: 'chargeKiosk',
  mesh: 'mesh',
  microgrid: 'microgrid',
  meshMicrogrid: 'meshMicrogrid',
  netOperator: 'netOperatorInterface',
  operatingStrategies: 'operatingStrategies',
  nlP1: 'nlP1',
  nlSaldering: 'nlSaldering',
  nlEnergyHub: 'nlEnergyHub',
  aiAutopilot: 'aiAutopilot',
});

const HOME_FEATURES = new Set([
  'dashboard',
  'history',
  'aiAdvisor',
  'smartHome',
  'dynamicTariffs',
  'tariff',
  'chargingManagement',
  'storageControl',
  'storageFarm',
  'thermalControl',
  'heatingRodControl',
  'relayControl',
  'gridConstraints',
  'gridLimits',
  'para14a',
  'thresholdControl',
  'energyFlow',
  'pvForecast',
  'countryProfile',
  'systemLanguage',
  'energyWallet',
  'energyWalletBasic',
  'energyWalletPro',
  'energyWalletDetails',
  'energyWalletRecommendations',
  'energyLedger',
  'energyLedgerBasic',
  'energyOriginAccounting',
  'energyOriginEvidenceExport',
  'nlP1',
  'nlP1Basic',
  'p1Dsmr',
]);

const EOS_ONLY_FEATURES = new Set([
  'peakShaving',
  'multiUse',
  'generatorControl',
  'bhkwControl',
  'advancedChargingPark',
  'advancedDiagnostics',
  'energyWalletOperator',
  'billingExport',
  'chargeKiosk',
  'solarChargeMode',
  'solarChargeBilling',
  'mesh',
  'microgrid',
  'meshMicrogrid',
  'netOperatorInterface',
  'operatingStrategies',
  'neighborSharing',
  'multiSiteWallet',
  'nlSaldering',
  'nlEnergyHub',
  'aiAutopilot',
]);

// Home ist für Einfamilien-/Kleingewerbeanlagen ausgelegt. Die Grenze gilt
// als Lizenz-Hardcap für den finalen Speicherbefehl; Geräte-, SoC-, NVP- und
// Safety-Grenzen können darunter weiterhin enger begrenzen.
const HOME_STORAGE_POWER_LIMIT_W = 50_000;

// Numerischer Schutz für Konfigurationswerte. Das ist keine Produkt- oder
// Lizenzgrenze, sondern verhindert nur unendliche/ungültige JS-Zahlen.
const STORAGE_PROFILE_NUMERIC_MAX_W = 1_000_000_000_000;

/**
 * Code-Teil: normalizeEdition
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeEdition(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (e === 'eos' || e === 'pro') return 'eos';
  if (e === 'home' || e === 'hems') return 'hems';
  return 'none';
}

/**
 * Code-Teil: editionLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function editionLabel(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return 'Pro';
  if (ed === 'hems') return 'Home';
  return 'Keine Lizenz';
}

/**
 * Code-Teil: productProfileId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function productProfileId(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return 'pro';
  if (ed === 'hems') return 'home';
  return 'none';
}

/**
 * Code-Teil: finitePositivePowerW
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finitePositivePowerW(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(STORAGE_PROFILE_NUMERIC_MAX_W, Math.round(n));
}

/**
 * Code-Teil: nicePowerStepW
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nicePowerStepW(raw) {
  const n = finitePositivePowerW(raw);
  if (n <= 0) return 0;
  const exponent = Math.pow(10, Math.floor(Math.log10(n)));
  const candidates = [1, 2, 5, 10].map((factor) => factor * exponent);
  let best = candidates[0];
  let bestDistance = Math.abs(n - best);
  for (const candidate of candidates.slice(1)) {
    const distance = Math.abs(n - candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return Math.max(1, Math.round(best));
}

/**
 * Liefert das lizenzabhängige Speicher-Leistungsprofil.
 *
 * Home:
 * - finaler Lade-/Entladebefehl maximal 50 kW
 * - konservative Haushalts-Defaults bleiben erhalten
 *
 * Pro (technische Edition `eos`):
 * - kein Lizenz-Hardcap
 * - bei hinterlegter Nennleistung skalieren Rampe, Async-Prognose und
 *   Energiefluss-Plausibilität proportional; die Sollwertauflösung bleibt 1 W,
 *   damit auch Industrieanlagen kleine NVP-Korrekturen exakt ausführen können.
 *   Explizite Expertenwerte gewinnen
 *   später weiterhin gegen diese Defaults.
 */
function storagePerformanceProfile(edition, ratedPowerW = 0) {
  const ed = normalizeEdition(edition);
  const configuredRatedPowerW = finitePositivePowerW(ratedPowerW);

  if (ed === 'hems') {
    const effectiveRatedPowerW = configuredRatedPowerW > 0
      ? Math.min(configuredRatedPowerW, HOME_STORAGE_POWER_LIMIT_W)
      : 0;
    return Object.freeze({
      edition: 'hems',
      id: 'home',
      label: 'Home',
      industrial: false,
      unrestricted: false,
      configuredRatedPowerW,
      effectiveRatedPowerW,
      maxCommandW: HOME_STORAGE_POWER_LIMIT_W,
      defaultStepW: 1,
      defaultMaxDeltaWPerTick: 500,
      defaultPvMaxDeltaWPerTick: 1_500,
      defaultBalancePredictionMaxW: 10_000,
      energyFlowPlausibilityMaxW: 1_000_000,
    });
  }

  if (ed === 'eos') {
    const effectiveRatedPowerW = configuredRatedPowerW;
    // Die Nennleistung skaliert die Dynamik, niemals die Befehlsauflösung.
    // Ein 500-kW-Speicher muss am NVP weiterhin 15 W oder 150 W nachregeln
    // können, sofern sein Geräteprofil diese Auflösung unterstützt.
    const defaultStepW = 1;
    const defaultMaxDeltaWPerTick = effectiveRatedPowerW > 0
      ? Math.max(500, Math.round(effectiveRatedPowerW * 0.05))
      : 500;
    const defaultPvMaxDeltaWPerTick = effectiveRatedPowerW > 0
      ? Math.max(1_500, Math.round(effectiveRatedPowerW * 0.10))
      : 1_500;
    const defaultBalancePredictionMaxW = effectiveRatedPowerW > 0
      ? Math.max(10_000, Math.round(effectiveRatedPowerW * 0.25))
      : 10_000;
    const energyFlowPlausibilityMaxW = effectiveRatedPowerW > 0
      ? Math.max(1_000_000, Math.round(effectiveRatedPowerW * 4))
      : 100_000_000;
    return Object.freeze({
      edition: 'eos',
      id: 'pro',
      label: 'Pro',
      industrial: true,
      unrestricted: true,
      configuredRatedPowerW,
      effectiveRatedPowerW,
      maxCommandW: 0,
      defaultStepW,
      defaultMaxDeltaWPerTick,
      defaultPvMaxDeltaWPerTick,
      defaultBalancePredictionMaxW,
      energyFlowPlausibilityMaxW,
    });
  }

  return Object.freeze({
    edition: 'none',
    id: 'none',
    label: 'Keine Lizenz',
    industrial: false,
    unrestricted: false,
    configuredRatedPowerW,
    effectiveRatedPowerW: 0,
    maxCommandW: 0,
    defaultStepW: 1,
    defaultMaxDeltaWPerTick: 500,
    defaultPvMaxDeltaWPerTick: 1_500,
    defaultBalancePredictionMaxW: 10_000,
    energyFlowPlausibilityMaxW: 1_000_000,
  });
}

/**
 * Code-Teil: maxStoragePowerW
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function maxStoragePowerW(edition) {
  return storagePerformanceProfile(edition, 0).maxCommandW;
}

/**
 * Code-Teil: allKnownFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allKnownFeatures() {
  return new Set([...HOME_FEATURES, ...EOS_ONLY_FEATURES]);
}

/**
 * Code-Teil: buildFeatureMap
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildFeatureMap(edition) {
  const ed = normalizeEdition(edition);
  const out = {};
  for (const feature of allKnownFeatures()) {
    out[feature] = ed === 'eos' ? true : (ed === 'hems' ? HOME_FEATURES.has(feature) : false);
  }
  return out;
}

/**
 * Code-Teil: appFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function appFeature(appId) {
  const id = String(appId || '').trim();
  return APP_FEATURE_MAP[id] || id;
}

/**
 * Code-Teil: appIdToFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function appIdToFeature(appId) {
  return appFeature(appId);
}

/**
 * Code-Teil: allowsFeature
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allowsFeature(edition, feature) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  return HOME_FEATURES.has(String(feature || '').trim());
}

/**
 * Code-Teil: allowsApp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function allowsApp(edition, appId) {
  const ed = normalizeEdition(edition);
  if (ed === 'eos') return true;
  if (ed !== 'hems') return false;
  const id = String(appId || '').trim();
  return HOME_APP_IDS.has(id) || allowsFeature(ed, appFeature(id));
}

/**
 * Code-Teil: maxWallboxes
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function maxWallboxes(edition) {
  const ed = normalizeEdition(edition);
  if (ed === 'hems') return 3;
  if (ed === 'eos') return 0;
  return 0;
}

// 0 means no licensed storage systems (never unlimited).
function maxStorages(edition) {
  const ed = normalizeEdition(edition);
  return ed === 'hems' ? 2 : (ed === 'eos' ? 10 : 0);
}

/**
 * Code-Teil: homeIncludedApps
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function homeIncludedApps() {
  return Array.from(HOME_APP_IDS);
}

/**
 * Code-Teil: homeIncludedFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function homeIncludedFeatures() {
  return Array.from(HOME_FEATURES);
}

/**
 * Code-Teil: eosOnlyFeatures
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function eosOnlyFeatures() {
  return Array.from(EOS_ONLY_FEATURES);
}

/**
 * Code-Teil: eosOnlyApps
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function eosOnlyApps() {
  return Object.keys(APP_FEATURE_MAP).filter((appId) => !HOME_APP_IDS.has(appId));
}

module.exports = {
  HOME_APP_IDS,
  APP_FEATURE_MAP,
  HOME_FEATURES,
  EOS_ONLY_FEATURES,
  HOME_STORAGE_POWER_LIMIT_W,
  STORAGE_PROFILE_NUMERIC_MAX_W,
  normalizeEdition,
  editionLabel,
  productProfileId,
  storagePerformanceProfile,
  maxStoragePowerW,
  allKnownFeatures,
  buildFeatureMap,
  appFeature,
  appIdToFeature,
  allowsFeature,
  allowsApp,
  maxWallboxes,
  maxStorages,
  homeIncludedApps,
  homeIncludedFeatures,
  eosOnlyFeatures,
  eosOnlyApps,
};
