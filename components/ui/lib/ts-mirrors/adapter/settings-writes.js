'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/settings-writes.ts
 * Quell-Hash: sha256:dbaa4f9ebe9c88160e3cc79b6088f24bd1b4c422bf77a27477fbe043b3141575
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_SETTING_KEYS = void 0;
exports.isCustomerSettingKey = isCustomerSettingKey;
exports.normalizeSettingValue = normalizeSettingValue;
exports.normalizeSettingsWrite = normalizeSettingsWrite;
/**
 * Datei: src-ts/adapter/settings-writes.ts
 *
 * Zweck:
 * TypeScript-Vorbereitung für einfache Kundeneinstellungen aus `/api/set`.
 *
 * Zusammenhang:
 * Aktuell schreibt `main.js` viele Einstellungen direkt. Diese Datei dokumentiert, welche
 * Keys bewusst erlaubt sind und wie Werte normalisiert werden dürfen.
 */
exports.CUSTOMER_SETTING_KEYS = [
    // KI-Berater: Anzeige, Optimierungsmodus, Komfort-/Ruhezeiten und Prioritäten.
    'aiAdvisorEnabled',
    'aiAdvisorMode',
    'aiAdvisorOptimizationMode',
    'aiAdvisorEvReadyBy',
    'aiAdvisorEvTargetSocPct',
    'aiAdvisorThermalReadyBy',
    'aiAdvisorComfortStart',
    'aiAdvisorComfortEnd',
    'aiAdvisorQuietHoursStart',
    'aiAdvisorQuietHoursEnd',
    'aiAdvisorPriorityStorage',
    'aiAdvisorPriorityEvcs',
    'aiAdvisorPriorityThermal',
    'aiAdvisorPriorityHeatingRod',
    'aiAdvisorPriorityGeneric',
    // Wetter-App: Kundenschalter und API-Zugang.
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
];
/**
 * Migrationshinweis:
 * Diese Liste muss mit `settingsLocalKeys` in `main.js` konsistent bleiben.
 * Sobald `/api/set` produktiv auf diesen TS-Helfer umgestellt wird, darf kein
 * Kundeneinstellungs-Key fehlen, sonst schreibt das Frontend ins Leere.
 */
/** Code-Teil: isCustomerSettingKey. Zweck: Prüft, ob ein Frontend-Key bewusst erlaubt ist. */
function isCustomerSettingKey(key) {
    return exports.CUSTOMER_SETTING_KEYS.includes(key);
}
/**
 * Code-Teil: normalizeSettingValue
 *
 * Zweck:
 * Normalisiert einfache Kundeneinstellungswerte, ohne false/0/'' falsch zu ersetzen.
 */
function normalizeSettingValue(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const raw = value.trim();
        const lower = raw.toLowerCase();
        if (lower === 'true')
            return true;
        if (lower === 'false')
            return false;
        if (raw !== '' && /^-?\d+(\.\d+)?$/.test(raw))
            return Number(raw);
        return raw;
    }
    return '';
}
/**
 * Code-Teil: normalizeSettingsWrite
 *
 * Zweck:
 * Baut aus einem Frontend-Schreibwunsch einen späteren `settings.*`-Schreibplan.
 */
function normalizeSettingsWrite(request) {
    if (request.scope !== 'settings')
        return null;
    if (!isCustomerSettingKey(request.key))
        return null;
    return {
        stateId: `settings.${request.key}`,
        value: normalizeSettingValue(request.value),
        ack: false,
        diagnosticText: `Kundeneinstellung ${request.key} aus ${request.source} vorbereitet.`,
    };
}
