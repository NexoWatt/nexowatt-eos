// @ts-nocheck
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

function normalizeLanguage(raw, fallback = 'de') {
  const value = String(raw || '').trim().toLowerCase().replace('_', '-');
  const short = value.split('-')[0] || '';
  if (SUPPORTED_LANGUAGES.has(short)) return short;
  const fb = String(fallback || '').trim().toLowerCase().split('-')[0] || 'de';
  return SUPPORTED_LANGUAGES.has(fb) ? fb : 'de';
}

function normalizeCountry(raw, fallback = 'DE') {
  const value = String(raw || '').trim().toUpperCase();
  if (SUPPORTED_COUNTRIES.has(value)) return value;
  const fb = String(fallback || '').trim().toUpperCase();
  return SUPPORTED_COUNTRIES.has(fb) ? fb : 'DE';
}

function getConfiguredCountryProfile(config) {
  const cfg = (config && typeof config === 'object') ? config : {};
  const cp = (cfg.countryProfile && typeof cfg.countryProfile === 'object') ? cfg.countryProfile : {};
  const country = normalizeCountry(cp.country || cp.profile || cfg.country || 'DE', 'DE');
  return Object.assign({}, COUNTRY_PROFILES[country] || COUNTRY_PROFILES.DE, {
    languageMode: 'system',
    configuredLanguage: normalizeLanguage(cp.language || cp.configuredLanguage || COUNTRY_PROFILES[country].defaultLanguage, COUNTRY_PROFILES[country].defaultLanguage),
  });
}

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
