'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/main-helpers/settings-write-main.ts
 * Quell-Hash: sha256:b19a0d3348008f86334c374a599afab7147fe739071cdda4566fa64572b96852
 * Erzeugung: npm run sync:ts-backend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.
 * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere
 * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.
 * 2. npm run sync:ts-backend-mirrors ausführen.
 * 3. npm run test:backend-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIN_CUSTOMER_SETTING_KEYS = void 0;
exports.isMainCustomerSettingKey = isMainCustomerSettingKey;
exports.normalizeMainSettingValue = normalizeMainSettingValue;
exports.buildMainSettingsWritePlan = buildMainSettingsWritePlan;
const api_set_helpers_1 = require("../api-state/api-set-helpers");
/**
 * Datei: src-ts/backend/main-helpers/settings-write-main.ts
 *
 * Zweck:
 * Bereitet die spätere Auslagerung von `settings.*`-Schreiblogik aus `main.js` vor.
 *
 * Zusammenhang:
 * Kundeneinstellungen werden aus dem Frontend über `/api/set` geschrieben und danach von
 * Energiefluss, Wetter, KI-Berater, History und SmartHome gelesen. Dieser Helfer definiert,
 * welche Werte sicher in `settings.*` landen dürfen und wie sie normalisiert werden.
 */
/** Erster kontrollierter Satz an Kundeneinstellungen, die wir schrittweise aus `main.js` typisieren. */
exports.MAIN_CUSTOMER_SETTING_KEYS = [
    'aiAdvisorEnabled',
    'aiAdvisorMode',
    'aiAdvisorEvReadyBy',
    'aiAdvisorEvTargetSocPct',
    'aiAdvisorThermalReadyBy',
    'aiAdvisorComfortStart',
    'aiAdvisorComfortEnd',
    'aiAdvisorQuietHoursStart',
    'aiAdvisorQuietHoursEnd',
    'weatherEnabled',
    'weatherUsageMode',
    'weatherApiKey',
    'forecastSourceMode',
    'openMeteoTimezone',
    'pvForecastArrays',
    'openMeteoPvEnabled',
    'forecastFallbackToDatapoints',
    'openMeteoLatitude',
    'openMeteoLongitude',
    'forecastUpdateIntervalMin',
    'forecastHorizonHours',
    'pvForecastPlanningSafetyPct',
    'pvForecastInstalledKwp',
    'pvForecastTiltDeg',
    'pvForecastAzimuthDeg',
    'pvForecastLossPercent',
    'pvForecastInverterLimitW',
    'dynamicTariff',
    'netFeeEnabled',
];
/**
 * Code-Teil: isMainCustomerSettingKey
 *
 * Zweck:
 * Prüft, ob ein Setting-Key zur kontrollierten Kundeneinstellungsgruppe gehört.
 */
function isMainCustomerSettingKey(key) {
    return exports.MAIN_CUSTOMER_SETTING_KEYS.includes((0, api_set_helpers_1.normalizeApiSetKey)(key));
}
/**
 * Code-Teil: normalizeMainSettingValue
 *
 * Zweck:
 * Normalisiert API-Werte für `settings.*`, ohne `false`, `0` oder leere Uhrzeiten zu verlieren.
 */
function normalizeMainSettingValue(key, value) {
    const cleanKey = (0, api_set_helpers_1.normalizeApiSetKey)(key);
    if (cleanKey.endsWith('Enabled') || cleanKey === 'dynamicTariff' || cleanKey === 'netFeeEnabled') {
        if (typeof value === 'boolean')
            return value;
        const s = String(value ?? '').trim().toLowerCase();
        return ['true', '1', 'yes', 'ja', 'on', 'an'].includes(s);
    }
    if (cleanKey.endsWith('Pct')) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    }
    if (/^(openMeteoLatitude|openMeteoLongitude|forecastUpdateIntervalMin|forecastHorizonHours|pvForecastInstalledKwp|pvForecastTiltDeg|pvForecastAzimuthDeg|pvForecastInverterLimitW)$/.test(cleanKey)) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return String(value ?? '').trim();
}
/**
 * Code-Teil: buildMainSettingsWritePlan
 *
 * Zweck:
 * Erstellt einen Schreibplan für `settings.*`, schreibt aber noch nicht selbst.
 *
 * Zusammenhang:
 * Später kann `main.js` diesen Plan verwenden, statt State-ID, Wertnormalisierung und ack-Regel
 * direkt im API-Handler zusammenzubauen.
 */
function buildMainSettingsWritePlan(key, value) {
    const cleanKey = (0, api_set_helpers_1.normalizeApiSetKey)(key);
    const allowed = isMainCustomerSettingKey(cleanKey);
    return {
        stateId: (0, api_set_helpers_1.buildScopedStateId)('settings', cleanKey),
        value: normalizeMainSettingValue(cleanKey, value),
        ack: false,
        reason: `api-set:settings.${cleanKey}`,
        allowed,
    };
}
