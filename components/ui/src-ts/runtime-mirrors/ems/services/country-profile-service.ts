// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/country-profile-service.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/country-profile-service.js
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
 * Original-Hash: cd6a12e3daf5f12e9cb1682069d134fb2af11b01434a21085808f9f034543c92
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
 * Quelle: src-ts/runtime-executables/ems/services/country-profile-service.ts
 * Quell-Hash: sha256:e29b35a5951d0eb8ea73d2a31816b22f6ab4cc9538602ad5613ab151db09d951
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/country-profile-service.js.
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
 * Aufgabe: Löst Länderprofil-Einstellungen in gemeinsam verwendbare Profilinformationen auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/country-profile-service.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/country-profile-service.js
 *
 * Zweck:
 * Kleine gemeinsame Runtime-Helfer für Länderprofil, ioBroker-Systemsprache und
 * spätere DE/NL-Marktfunktionen. Diese Datei ist bewusst JS-kompatibles TypeScript,
 * weil sie per sync:ts-runtime-executables als Runtime-JS ausgeliefert wird.
 */
'use strict';

const SUPPORTED_LANGUAGES = new Set(['de', 'en', 'nl']);
const SUPPORTED_COUNTRIES = new Set(['DE', 'NL']);

const COUNTRY_PROFILES = {
  DE: {
    country: 'DE',
    label: 'Deutschland',
    defaultLanguage: 'de',
    currency: 'EUR',
    gridImportLabel: 'Netzbezug',
    gridExportLabel: 'Einspeisung',
    selfConsumptionLabel: 'Eigenverbrauch',
    supportsP1Dsmr: false,
    supportsSalderingExit: false,
    supportsEnergyHub: false,
    supportsParagraph14a: true,
  },
  NL: {
    country: 'NL',
    label: 'Nederland',
    defaultLanguage: 'nl',
    currency: 'EUR',
    gridImportLabel: 'Netafname',
    gridExportLabel: 'Teruglevering',
    selfConsumptionLabel: 'Eigen verbruik',
    supportsP1Dsmr: true,
    supportsSalderingExit: true,
    supportsEnergyHub: true,
    supportsParagraph14a: false,
  },
};

/**
 * Code-Teil: normalizeLanguage
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeLanguage(raw, fallback = 'de') {
  const value = String(raw || '').trim().toLowerCase().replace('_', '-');
  const short = value.split('-')[0] || '';
  if (SUPPORTED_LANGUAGES.has(short)) return short;
  const fb = String(fallback || '').trim().toLowerCase().split('-')[0] || 'de';
  return SUPPORTED_LANGUAGES.has(fb) ? fb : 'de';
}

/**
 * Code-Teil: normalizeCountry
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeCountry(raw, fallback = 'DE') {
  const value = String(raw || '').trim().toUpperCase();
  if (SUPPORTED_COUNTRIES.has(value)) return value;
  const fb = String(fallback || '').trim().toUpperCase();
  return SUPPORTED_COUNTRIES.has(fb) ? fb : 'DE';
}

/**
 * Code-Teil: getConfiguredCountryProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function getConfiguredCountryProfile(config) {
  const cfg = (config && typeof config === 'object') ? config : {};
  const cp = (cfg.countryProfile && typeof cfg.countryProfile === 'object') ? cfg.countryProfile : {};
  const country = normalizeCountry(cp.country || cp.profile || cfg.country || 'DE', 'DE');
  return Object.assign({}, COUNTRY_PROFILES[country] || COUNTRY_PROFILES.DE, {
    languageMode: 'system',
    configuredLanguage: normalizeLanguage(cp.language || cp.configuredLanguage || COUNTRY_PROFILES[country].defaultLanguage, COUNTRY_PROFILES[country].defaultLanguage),
  });
}

/**
 * Code-Teil: buildLocaleInfo
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function buildLocaleInfo(config, systemLanguage, source = 'system.config') {
  const profile = getConfiguredCountryProfile(config);
  const effectiveLanguage = normalizeLanguage(systemLanguage || profile.defaultLanguage, profile.defaultLanguage);
  return {
    language: effectiveLanguage,
    htmlLang: effectiveLanguage,
    source: systemLanguage ? source : 'country-profile-default',
    country: profile.country,
    countryLabel: profile.label,
    currency: profile.currency,
  };
}

/**
 * Code-Teil: readIoBrokerSystemLanguage
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function readIoBrokerSystemLanguage(adapter) {
  try {
    if (!adapter || typeof adapter.getForeignObjectAsync !== 'function') return '';
    const obj = await adapter.getForeignObjectAsync('system.config');
    const common = obj && obj.common && typeof obj.common === 'object' ? obj.common : {};
    const language = common.language || common.lang || common.systemLanguage || '';
    return normalizeLanguage(language, '');
  } catch (_e) {
    return '';
  }
}

module.exports = {
  COUNTRY_PROFILES,
  normalizeLanguage,
  normalizeCountry,
  getConfiguredCountryProfile,
  buildLocaleInfo,
  readIoBrokerSystemLanguage,
};
