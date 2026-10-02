// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet Anlageninformationen für den Energieberater auf; seine Bewertung ersetzt keine Freigabe des produktiven Regelpfads.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/ai-advisor.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/ai-advisor.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/ai-advisor.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/ai-advisor.js
 * Rolle im Projekt: KI-Energieberater.
 * Zweck: Erzeugt beratende Empfehlungen aus Wetter, PV, Tarif, Speicher, EVCS, Peak und Lernwerten.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: KI-Energieberater: erzeugt rein beratende Vorschläge aus Wetter, PV, Tarif, Speicher, EVCS, Peak-Shaving und Lern-/Anomaliewerten.
 * Zusammenhänge:
 * - Liest viele Runtime-States und Konfigurationen, veröffentlicht aiAdvisor.* States.
 * - Frontend zeigt Vorschläge in www/app.js; App-Center konfiguriert Schwellwerte in www/ems-apps.js.
 * Wartungshinweise:
 * - Berater darf keine Geräte schalten; nur Vorschläge erzeugen. Feature-Sichtbarkeit und Lizenzstufen beachten.
 */


'use strict';


/**
 * Datenvertrag: AiAdvisorSuggestion
 * Zweck: Beschreibt einzelne KI-Empfehlungen, die als JSON-State und im LIVE-Dashboard angezeigt werden.
 * Zusammenhang: ems/modules/ai-advisor.js schreibt aiAdvisor.*; www/app.js rendert die Vorschläge.
 * TypeScript-Ziel: Kategorie, Severity und Vorschlagsobjekt als Union Types/Interfaces typisieren.
 */

/**
 * Vertragsstelle: KI bleibt beratend
 * Zweck: Der KI-Berater darf keine Geräte schalten, sondern nur Texte und Vorschläge veröffentlichen.
 * Wichtig: Hardware-Sichtbarkeit beachten; keine EVCS-/Farm-Vorschläge ohne echte Konfiguration.
 */


const { BaseModule } = require('./base');
/**
 * Code-Teil: aiAdvisorPayloadTsMirror
 *
 * Zweck:
 * Lädt den aus TypeScript erzeugten KI-Payload-Helfer. Dieser Helfer übernimmt ab
 * 0.7.115 produktiv die sichere Ausgabe-Normalisierung für `aiAdvisor.*` States.
 *
 * Zusammenhang:
 * Die fachlichen Vorschläge entstehen weiterhin in dieser JS-Datei. TypeScript formt
 * daraus stabile JSON-/Top-/Count-/Severity-Werte für Dashboard und History.
 *
 * Fallback:
 * Wenn der Spiegel fehlt oder Fehler wirft, bleibt die alte JS-Normalisierung aktiv.
 */
let aiAdvisorPayloadTsMirror = null;
try {
    aiAdvisorPayloadTsMirror = require('../../lib/ts-mirrors/ems/ai-advisor/ai-advisor-payload.js');
} catch (_eAiAdvisorPayloadTsMirror) {
    aiAdvisorPayloadTsMirror = null;
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return n;
    return Math.max(min, Math.min(max, n));
}
/**
 * Code-Teil: bool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function bool(v, fallback = false) {
    if (v === true || v === 1 || v === '1') return true;
    if (v === false || v === 0 || v === '0') return false;
    const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
    if (['true', 'on', 'yes', 'ja', 'active', 'aktiv', 'an'].includes(s)) return true;
    if (['false', 'off', 'no', 'nein', 'inactive', 'inaktiv', 'aus'].includes(s)) return false;
    return !!fallback;
}
/**
 * Code-Teil: finiteNumber
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function finiteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}
/**
 * Code-Teil: round
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function round(v, digits = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const p = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
    return Math.round(n * p) / p;
}
/**
 * Code-Teil: makeHash
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function makeHash(obj) {
    try { return JSON.stringify(obj); } catch (_e) { return String(Date.now()); }
}
/**
 * Code-Teil: pad2
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function pad2(v) { return String(Math.max(0, Math.round(Number(v) || 0))).padStart(2, '0'); }
/**
 * Code-Teil: formatKw
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatKw(w) {
    const n = Number(w);
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(2) + ' MW';
    if (abs >= 1000) return (n / 1000).toFixed(1) + ' kW';
    return Math.round(n) + ' W';
}
/**
 * Code-Teil: formatKwh
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatKwh(kwh) {
    const n = Number(kwh);
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + ' MWh';
    return n.toFixed(1) + ' kWh';
}
/**
 * Code-Teil: formatPrice
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatPrice(eurKwh) {
    const n = Number(eurKwh);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(3) + ' €/kWh';
}
/**
 * Code-Teil: formatPct
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatPct(v, digits = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(Math.max(0, Math.min(2, Math.round(Number(digits) || 0)))) + ' %';
}
/**
 * Code-Teil: formatTemp
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatTemp(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(Math.abs(n) < 10 ? 1 : 0) + ' °C';
}
/**
 * Code-Teil: textContainsAny
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function textContainsAny(value, needles) {
    const hay = String(value || '').toLowerCase();
    return (Array.isArray(needles) ? needles : []).some((needle) => hay.includes(String(needle).toLowerCase()));
}
/**
 * Code-Teil: weatherLine
 * Zweck: Verarbeitet Wetter-/Prognosedaten für Anzeige oder KI-Beratung.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function weatherLine(text, minC, maxC, precipPct) {
    const parts = [];
    if (text) parts.push(String(text));
    if (Number.isFinite(Number(minC)) || Number.isFinite(Number(maxC))) parts.push(`${formatTemp(minC)}–${formatTemp(maxC)}`);
    if (Number.isFinite(Number(precipPct))) parts.push(`Regenrisiko ${formatPct(precipPct)}`);
    return parts.filter(Boolean).join(', ');
}
/**
 * Code-Teil: buildWeatherSummary
 * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function buildWeatherSummary(s) {
    if (!s || !s.weatherEnabled) return 'Wetterprognose deaktiviert.';
    const parts = [];
    const today = [];
    if (s.weatherText) today.push(String(s.weatherText));
    if (finiteNumber(s.weatherTempC)) today.push(formatTemp(s.weatherTempC));
    if (finiteNumber(s.weatherCloudPct)) today.push(`Bewölkung ${formatPct(s.weatherCloudPct)}`);
    if (finiteNumber(s.weatherWindKmh)) today.push(`Wind ${Math.round(s.weatherWindKmh)} km/h`);
    if (today.length) parts.push(`Heute: ${today.join(', ')}`);
    const tomorrow = weatherLine(s.weatherTomorrowText, s.weatherTomorrowMinC, s.weatherTomorrowMaxC, s.weatherTomorrowPrecipPct);
    if (tomorrow) parts.push(`Morgen: ${tomorrow}`);
    return parts.join(' · ') || 'Wetterprognose aktiv.';
}
/**
 * Code-Teil: isPeakShavingConfigured
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isPeakShavingConfigured(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    if (cfg.enablePeakShaving === true) return true;
    const ps = (cfg.peakShaving && typeof cfg.peakShaving === 'object') ? cfg.peakShaving : {};
    const atypical = (ps.atypical && typeof ps.atypical === 'object') ? ps.atypical : {};
    return ps.enabled === true || atypical.enabled === true;
}


const EVCS_MAPPING_FIELDS = [
    'powerId', 'energyTotalId', 'energySessionId', 'statusId', 'activeId', 'modeId', 'onlineId',
    'setCurrentAId', 'setPowerWId', 'enableWriteId', 'lockWriteId', 'rfidReadId', 'vehicleSocId',
];
/**
 * Code-Teil: evcsRowHasMapping
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function evcsRowHasMapping(row) {
    const r = (row && typeof row === 'object') ? row : {};
    return EVCS_MAPPING_FIELDS.some((key) => String(r[key] === null || r[key] === undefined ? '' : r[key]).trim().length > 0);
}
/**
 * Code-Teil: inferEvcsAvailable
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function inferEvcsAvailable(adapter, settingsCfg) {
    const cfg = (adapter && adapter.config && typeof adapter.config === 'object') ? adapter.config : {};
    const sc = (settingsCfg && typeof settingsCfg === 'object') ? settingsCfg : ((cfg.settingsConfig && typeof cfg.settingsConfig === 'object') ? cfg.settingsConfig : {});
    if (typeof sc.evcsAvailable === 'boolean') return sc.evcsAvailable;
    const lists = [];
    if (Array.isArray(sc.evcsList)) lists.push(sc.evcsList);
    if (Array.isArray(adapter && adapter.evcsList)) lists.push(adapter.evcsList);
    if (Array.isArray(cfg.evcsList)) lists.push(cfg.evcsList);
    if (cfg.chargingManagement && Array.isArray(cfg.chargingManagement.wallboxes)) lists.push(cfg.chargingManagement.wallboxes);
    if (lists.some((list) => list.some(evcsRowHasMapping))) return true;
    return false;
}
/**
 * Code-Teil: evcsPhrase
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function evcsPhrase(hasEvcs, withArticle = true) {
    return hasEvcs ? (withArticle ? 'EV-Laden, Heizstab und andere flexible Lasten' : 'EV-Laden, Heizstab und andere flexible Verbraucher') : (withArticle ? 'Heizstab und andere flexible Lasten' : 'Heizstab und andere flexible Verbraucher');
}
/**
 * Code-Teil: storageRowHasMapping
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageRowHasMapping(row) {
    const r = (row && typeof row === 'object') ? row : {};
    const keys = [
        'socId', 'socPctId', 'socStateId', 'powerId', 'powerWId', 'chargePowerId', 'dischargePowerId',
        'setPowerId', 'setChargePowerId', 'setDischargePowerId', 'onlineId', 'enabledId', 'pvPowerId',
    ];
    return keys.some((key) => String(r[key] === null || r[key] === undefined ? '' : r[key]).trim().length > 0);
}
/**
 * Code-Teil: configuredStorageFarmRows
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function configuredStorageFarmRows(adapter) {
    const cfg = (adapter && adapter.config && typeof adapter.config === 'object') ? adapter.config : {};
    const sf = (cfg.storageFarm && typeof cfg.storageFarm === 'object') ? cfg.storageFarm : {};
    const lists = [];
    if (Array.isArray(sf.storages)) lists.push(sf.storages);
    if (Array.isArray(sf.batteries)) lists.push(sf.batteries);
    if (Array.isArray(cfg.storageFarmStorages)) lists.push(cfg.storageFarmStorages);
    return lists.reduce((acc, list) => acc.concat(list.filter((row) => row && row.enabled !== false && storageRowHasMapping(row))), []);
}
/**
 * Code-Teil: storageSocLooksPlausible
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageSocLooksPlausible(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
}
/**
 * Code-Teil: buildPeakStateText
 * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function buildPeakStateText(s, limitW, usagePct) {
    const statusRaw = String(s && s.peakStatus || '').trim();
    const suffix = statusRaw ? ` · Status ${statusRaw}` : '';
    if (!limitW || !Number.isFinite(Number(limitW)) || Number(limitW) <= 0) {
        return (s && s.peakConfigured ? 'Lastspitzenkappung bereit, aber kein Netzanschlusslimit verfügbar.' : 'Lastspitzenkappung nicht konfiguriert.') + suffix;
    }
    const state = s && s.peakActive
        ? 'Lastspitzenkappung aktiv'
        : (s && s.peakConfigured ? 'Lastspitzenkappung bereit' : 'Lastspitzenkappung nicht konfiguriert');
    return `${formatKw(s && s.gridImportW)} von ${formatKw(limitW)} (${formatPct(usagePct)}) · ${state}${suffix}`;
}
/**
 * Code-Teil: shortIsoWindow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function shortIsoWindow(from, to) {
    const f = String(from || '').trim();
    const t = String(to || '').trim();
    /**
     * Code-Teil: fmt
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const fmt = (s) => {
        if (!s) return '';
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        const today = new Date();
        const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate();
        const prefix = sameDay ? 'heute ' : (isTomorrow ? 'morgen ' : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}. `);
        return prefix + `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    };
    if (f && t) return `${fmt(f)}–${fmt(t).replace(/^heute\s+|^morgen\s+/, '')}`;
    return fmt(f) || fmt(t) || '';
}
/**
 * Code-Teil: parseClockMinutes
 * Zweck: Parst Rohdaten in ein sicheres internes Format.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function parseClockMinutes(value, fallback = null) {
    const raw = String(value === null || value === undefined ? '' : value).trim();
    const m = raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (!m) return fallback;
    const h = Number(m[1]);
    const min = Number(m[2] || 0);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return fallback;
    return h * 60 + min;
}
/**
 * Code-Teil: minutesUntilClock
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function minutesUntilClock(value, now = new Date()) {
    const target = parseClockMinutes(value, null);
    if (target === null) return null;
    const current = now.getHours() * 60 + now.getMinutes();
    let diff = target - current;
    if (diff <= 0) diff += 1440;
    return diff;
}
/**
 * Code-Teil: formatClockMinutes
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatClockMinutes(totalMinutes) {
    const n = ((Math.round(Number(totalMinutes) || 0) % 1440) + 1440) % 1440;
    return `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;
}
/**
 * Code-Teil: formatDurationMinutes
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatDurationMinutes(minutes) {
    const n = Math.max(0, Math.round(Number(minutes) || 0));
    if (n < 90) return `${n} min`;
    return `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')} min`;
}
/**
 * Code-Teil: formatClockMs
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatClockMs(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '—';
    const d = new Date(n);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
/**
 * Code-Teil: tsToShortWindow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function tsToShortWindow(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '';
    const d = new Date(n);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const day = target === today ? 'heute' : (target === today + 86400000 ? 'morgen' : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`);
    return `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
/**
 * Code-Teil: formatWindowHour
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatWindowHour(hour) {
    const h = ((Math.round(Number(hour) || 0) % 24) + 24) % 24;
    return `${pad2(h)}:00–${pad2((h + 1) % 24)}:00`;
}
/**
 * Code-Teil: isInsideClockWindow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isInsideClockWindow(nowMs, startValue, endValue) {
    const d = new Date(Number(nowMs) || Date.now());
    const now = d.getHours() * 60 + d.getMinutes();
    const start = parseClockMinutes(startValue, null);
    const end = parseClockMinutes(endValue, null);
    if (start === null || end === null || start === end) return false;
    if (start < end) return now >= start && now < end;
    return now >= start || now < end;
}
/**
 * Code-Teil: seasonFromDate
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function seasonFromDate(now = new Date()) {
    const month = (now instanceof Date ? now : new Date(now)).getMonth() + 1;
    if (month === 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'autumn';
}
/**
 * Code-Teil: seasonLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function seasonLabel(season) {
    const s = String(season || '').toLowerCase();
    if (s === 'winter') return 'Winter';
    if (s === 'spring') return 'Frühjahr';
    if (s === 'summer') return 'Sommer';
    if (s === 'autumn') return 'Herbst';
    return 'Saison';
}
/**
 * Code-Teil: normalizeOptimizationMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeOptimizationMode(value) {
    const s = String(value || 'balanced').trim().toLowerCase();
    if (['cost', 'kosten', 'preis'].includes(s)) return 'cost';
    if (['autarky', 'autarkie', 'self', 'eigenverbrauch'].includes(s)) return 'autarky';
    if (['co2', 'co₂', 'carbon', 'klima'].includes(s)) return 'co2';
    if (['comfort', 'komfort'].includes(s)) return 'comfort';
    if (['peak', 'netz', 'lastspitze'].includes(s)) return 'peak';
    return 'balanced';
}
/**
 * Code-Teil: optimizationModeLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function optimizationModeLabel(mode) {
    const m = normalizeOptimizationMode(mode);
    if (m === 'cost') return 'Kosten';
    if (m === 'autarky') return 'Autarkie';
    if (m === 'co2') return 'CO₂';
    if (m === 'comfort') return 'Komfort';
    if (m === 'peak') return 'Peak-Schutz';
    return 'Balance';
}
/**
 * Code-Teil: average
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function average(list, field) {
    const vals = (Array.isArray(list) ? list : []).map((x) => field ? Number(x && x[field]) : Number(x)).filter(Number.isFinite);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}
/**
 * Code-Teil: percentile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function percentile(list, field, pct) {
    const vals = (Array.isArray(list) ? list : []).map((x) => field ? Number(x && x[field]) : Number(x)).filter(Number.isFinite).sort((a, b) => a - b);
    if (!vals.length) return null;
    const idx = Math.max(0, Math.min(vals.length - 1, Math.round((vals.length - 1) * (Number(pct) || 0))));
    return vals[idx];
}
/**
 * Code-Teil: safeJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeJson(value, fallback) {
    try { return JSON.stringify(value); } catch (_e) { return fallback; }
}
/**
 * Code-Teil: toSafeIdPart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toSafeIdPart(value) {
    return String(value === null || value === undefined ? '' : value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
/**
 * Code-Teil: priorityText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function priorityText(priorities, options = {}) {
    const labels = { evcs: 'Wallbox', thermal: 'Thermik', heatingRod: 'Heizstab', storage: 'Speicherreserve', generic: 'sonstige Lasten' };
    const hasEvcs = options && options.hasEvcs !== false;
    const entries = Object.keys(labels)
        .filter((key) => hasEvcs || key !== 'evcs')
        .map((key) => ({ key, label: labels[key], value: Number(priorities && priorities[key]) || 0 }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);
    if (!entries.length) return 'Prioritäten prüfen';
    return entries.slice(0, 5).map((x, i) => `${i + 1}. ${x.label}`).join(' · ');
}

/**
 * KI-Energieberater / AI Advisor.
 * Advisory-only: no actuator setpoints are written here.
 */
/**
 * Code-Teil: Klasse `AiAdvisorModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: AiAdvisorModule. Aufgabe: gehört zur KI-/Prognose-/Peak-Beratung. Die KI bleibt beratend und darf keine Verbraucher direkt schalten. Zusammenhang: KI-Energieberater, Vorschläge, Peak-/Wetter-/Speicher-/EV-Logik.
/**
 * Klasse: AiAdvisorModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class AiAdvisorModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Die KI darf nur beraten und keine Verbraucher schalten; Lizenz- und Kundenschalter beachten. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._inited = false;
        this._lastRunMs = 0;
        this._lastHash = '';
        this._lastDisabledWriteMs = 0;
        this._samples = [];
        this._peakHourBuckets = Array.from({ length: 24 }, () => 0);
        this._forecastChecks = [];
        this._forecastQualityPct = null;
        this._forecastQualityText = '';
        this._lastLearning = { anomaly: false, anomalyText: '', forecastQualityPct: null, peakLearningText: '' };
        this._lastPlan = { mode: 'balanced', items: [], text: '' };
    }

    /**
     * Code-Teil: Methode `_cachedValue`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _cachedValue
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _cachedValue(id, fallback) {
        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[id] : null;
            if (rec && Object.prototype.hasOwnProperty.call(rec, 'value') && rec.value !== undefined && rec.value !== null && String(rec.value).trim() !== '') return rec.value;
        } catch (_e) {}
        return fallback;
    }

    /**
     * Code-Teil: Methode `_cfg`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _cfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _cfg() {
        const c = (this.adapter && this.adapter.config && this.adapter.config.aiAdvisor && typeof this.adapter.config.aiAdvisor === 'object') ? this.adapter.config.aiAdvisor : {};
        const cats = (c.categories && typeof c.categories === 'object') ? c.categories : {};
        const prioCfg = (c.priorities && typeof c.priorities === 'object') ? c.priorities : {};
        const minPriority = String(c.minPriority || 'info').trim().toLowerCase();
        const customerEnabled = bool(this._cachedValue('settings.aiAdvisorEnabled', true), true);
        const configuredEnabled = c.enabled !== false;
        const showOnLiveCfg = (c.showInLive !== undefined) ? c.showInLive : c.showOnLive;
        const optimizationMode = normalizeOptimizationMode(this._cachedValue('settings.aiAdvisorMode', this._cachedValue('settings.aiAdvisorOptimizationMode', c.optimizationMode || c.mode || 'balanced')));
        const dailyPlanEnabled = c.dailyPlanEnabled !== false && c.dayPlanEnabled !== false;
        const learningEnabled = c.learningEnabled !== false && c.peakLearningEnabled !== false;
        const seasonLogicEnabled = c.seasonLogicEnabled !== false && c.seasonalStrategyEnabled !== false;
        const priorityStorage = clamp(num(this._cachedValue('settings.aiAdvisorPriorityStorage', c.priorityStorage ?? prioCfg.storage ?? 90), 90), 1, 100);
        const priorityEvcs = clamp(num(this._cachedValue('settings.aiAdvisorPriorityEvcs', c.priorityEvcs ?? prioCfg.evcs ?? 80), 80), 1, 100);
        const priorityThermal = clamp(num(this._cachedValue('settings.aiAdvisorPriorityThermal', c.priorityThermal ?? prioCfg.thermal ?? 60), 60), 1, 100);
        const priorityHeatingRod = clamp(num(this._cachedValue('settings.aiAdvisorPriorityHeatingRod', c.priorityHeatingRod ?? prioCfg.heatingRod ?? 45), 45), 1, 100);
        const priorityGeneric = clamp(num(this._cachedValue('settings.aiAdvisorPriorityGeneric', c.priorityGeneric ?? prioCfg.generic ?? 40), 40), 1, 100);
        return {
            enabled: configuredEnabled && customerEnabled,
            customerEnabled,
            configuredEnabled,
            advisoryOnly: true,
            showInLive: showOnLiveCfg !== false,
            optimizationMode,
            minIntervalSec: clamp(num(c.minIntervalSec ?? c.intervalSec, 60), 10, 3600),
            maxSuggestions: clamp(num(c.maxSuggestions, 6), 1, 10),
            minPriority: ['info', 'warning', 'action', 'critical'].includes(minPriority) ? minPriority : 'info',
            pvSurplusThresholdW: clamp(num(c.pvSurplusThresholdW ?? c.exportHighW, 1500), 0, 1000000),
            highImportThresholdW: clamp(num(c.highImportThresholdW ?? c.importHighW, 3000), 0, 10000000),
            peakNearLimitPct: clamp(num(c.peakNearLimitPct ?? c.peakConnectionUsageWarnPct ?? c.gridConnectionWarnPct, 90), 50, 100),
            peakCriticalLimitPct: clamp(num(c.peakCriticalLimitPct ?? c.peakConnectionUsageCriticalPct ?? c.gridConnectionCriticalPct, 98), 90, 120),
            weatherRainRiskPct: clamp(num(c.weatherRainRiskPct ?? c.weatherRainProbabilityPct, 60), 0, 100),
            lowSocPct: clamp(num(c.lowSocPct, 25), 0, 100),
            highSocPct: clamp(num(c.highSocPct, 85), 0, 100),
            minSocForDischargePct: clamp(num(c.minSocForDischargePct, 35), 0, 100),
            pvForecastMinKwh: clamp(num(c.pvForecastMinKwh, 5), 0, 100000),
            pvPeakMinW: clamp(num(c.pvPeakMinW ?? c.pvForecastHighW, 3000), 0, 10000000),
            cheapPriceMarginEurKwh: clamp(num(c.cheapPriceMarginEurKwh, 0.03), 0, 10),
            expensivePriceMarginEurKwh: clamp(num(c.expensivePriceMarginEurKwh, 0.05), 0, 10),
            staleTimeoutSec: clamp(num(c.staleTimeoutSec, 300), 30, 86400),
            includeInstallerHints: c.includeInstallerHints !== false,
            dailyPlanEnabled,
            dayPlanEnabled: dailyPlanEnabled,
            evGoalPlanningEnabled: c.evGoalPlanningEnabled !== false && c.evGoalEnabled !== false,
            storageStrategyEnabled: c.storageStrategyEnabled !== false,
            learningEnabled,
            peakLearningEnabled: learningEnabled,
            anomalyDetectionEnabled: c.anomalyDetectionEnabled !== false,
            forecastQualityEnabled: c.forecastQualityEnabled !== false,
            seasonLogicEnabled,
            seasonalStrategyEnabled: seasonLogicEnabled,
            comfortHintsEnabled: c.comfortHintsEnabled !== false && c.comfortWindowsEnabled !== false,
            co2HintsEnabled: c.co2HintsEnabled !== false && c.co2Enabled !== false,
            comfortStart: String(this._cachedValue('settings.aiAdvisorComfortStart', c.comfortStart || '06:00') || '06:00'),
            comfortEnd: String(this._cachedValue('settings.aiAdvisorComfortEnd', c.comfortEnd || '22:00') || '22:00'),
            quietHoursStart: String(this._cachedValue('settings.aiAdvisorQuietHoursStart', c.quietHoursStart || '22:00') || '22:00'),
            quietHoursEnd: String(this._cachedValue('settings.aiAdvisorQuietHoursEnd', c.quietHoursEnd || '06:00') || '06:00'),
            evReadyBy: String(this._cachedValue('settings.aiAdvisorEvReadyBy', c.evReadyBy || c.evDepartureTime || '07:00') || '07:00'),
            evTargetSocPct: clamp(num(this._cachedValue('settings.aiAdvisorEvTargetSocPct', c.evTargetSocPct ?? c.defaultEvTargetSocPct ?? 80), 80), 20, 100),
            evBatteryCapacityKwh: clamp(num(c.evBatteryCapacityKwh, 60), 10, 250),
            thermalReadyBy: String(this._cachedValue('settings.aiAdvisorThermalReadyBy', c.thermalReadyBy || c.warmWaterReadyBy || '18:00') || '18:00'),
            anomalyMinSamples: clamp(num(c.anomalyMinSamples, 12), 4, 10000),
            anomalyFactor: clamp(num(c.anomalyFactor ?? c.anomalyMultiplier, 2.2), 1.1, 20),
            anomalyMinImportW: clamp(num(c.anomalyMinImportW ?? c.anomalyHighLoadW, 5000), 0, 100000000),
            anomalyHighLoadW: clamp(num(c.anomalyHighLoadW ?? c.anomalyMinImportW, 5500), 500, 100000000),
            nightBaseLoadW: clamp(num(c.nightBaseLoadW, 900), 100, 100000000),
            evUrgentRemainingMin: clamp(num(c.evUrgentRemainingMin, 90), 15, 1440),
            forecastQualityWarnPct: clamp(num(c.forecastQualityWarnPct, 65), 0, 100),
            co2LowGPerKwh: clamp(num(c.co2LowGPerKwh, 250), 0, 2000),
            co2HighGPerKwh: clamp(num(c.co2HighGPerKwh, 500), 0, 2000),
            priorities: { storage: priorityStorage, evcs: priorityEvcs, thermal: priorityThermal, heatingRod: priorityHeatingRod, generic: priorityGeneric },
            categories: {
                tariff: cats.tariff !== false,
                pv: cats.pv !== false,
                storage: cats.storage !== false,
                evcs: cats.evcs !== false,
                peak: cats.peak !== false,
                weather: cats.weather !== false,
                heating: cats.heating !== false,
                plan: cats.plan !== false && cats.dailyPlan !== false,
                dailyPlan: cats.dailyPlan !== false && cats.plan !== false,
                anomaly: cats.anomaly !== false,
                comfort: cats.comfort !== false,
                learning: cats.learning !== false,
                co2: cats.co2 !== false,
                system: cats.system !== false,
            },
        };
    }

    /**
     * Code-Teil: Methode `init`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        if (this._inited) return;
        await this._ensureStates();
        this._inited = true;
    }
    /**
     * Code-Teil: _ensureStates
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _ensureStates() {
        const a = this.adapter;
        await a.setObjectNotExistsAsync('aiAdvisor', { type: 'channel', common: { name: 'KI-Energieberater' }, native: {} });
        await a.setObjectNotExistsAsync('aiAdvisor.suggestions', { type: 'channel', common: { name: 'KI-Energieberater Vorschläge' }, native: {} });
        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, unit = undefined) => {
            await a.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false, ...(unit ? { unit } : {}) },
                native: {},
            });
        };
        await mk('aiAdvisor.enabled', 'KI-Energieberater aktiv', 'boolean', 'indicator');
        await mk('aiAdvisor.advisoryOnly', 'Nur Beratung, keine Schaltentscheidungen', 'boolean', 'indicator');
        await mk('aiAdvisor.showInLive', 'In LIVE anzeigen', 'boolean', 'indicator');
        await mk('aiAdvisor.showOnLive', 'In LIVE anzeigen', 'boolean', 'indicator');
        await mk('aiAdvisor.status', 'Status', 'string', 'text');
        await mk('aiAdvisor.severity', 'Höchste Priorität / Severity', 'string', 'text');
        await mk('aiAdvisor.headline', 'Kurz-Hinweis', 'string', 'text');
        await mk('aiAdvisor.summary', 'Zusammenfassung', 'string', 'text');
        await mk('aiAdvisor.count', 'Anzahl Vorschläge', 'number', 'value');
        await mk('aiAdvisor.score', 'Optimierungs-Score', 'number', 'value', '%');
        await mk('aiAdvisor.peakUsagePct', 'Netzanschluss-Auslastung', 'number', 'value', '%');
        await mk('aiAdvisor.peakStateText', 'Peak-Shaving Status', 'string', 'text');
        await mk('aiAdvisor.gridConnectionLimitW', 'Netzanschlusslimit', 'number', 'value.power', 'W');
        await mk('aiAdvisor.peakWarnThresholdW', 'Peak-Vorwarnschwelle', 'number', 'value.power', 'W');
        await mk('aiAdvisor.weatherSummary', 'Wetter-Prognose Zusammenfassung', 'string', 'text');
        await mk('aiAdvisor.storageSocPct', 'Speicher-SoC für KI-Beratung', 'number', 'value.battery', '%');
        await mk('aiAdvisor.storageSocSource', 'Speicher-SoC Quelle für KI-Beratung', 'string', 'text');
        await mk('aiAdvisor.dailyPlanText', 'KI-Tagesfahrplan Text', 'string', 'text');
        await mk('aiAdvisor.dailyPlanJson', 'KI-Tagesfahrplan JSON', 'string', 'json');
        await mk('aiAdvisor.evPlanText', 'EV-Zielplanung Text', 'string', 'text');
        await mk('aiAdvisor.optimizationMode', 'Optimierungsziel', 'string', 'text');
        await mk('aiAdvisor.comfortWindowSummary', 'Komfortfenster Zusammenfassung', 'string', 'text');
        await mk('aiAdvisor.season', 'Saisonlogik', 'string', 'text');
        await mk('aiAdvisor.anomalyText', 'Anomalie-Erkennung Text', 'string', 'text');
        await mk('aiAdvisor.forecastQualityPct', 'Prognosequalität', 'number', 'value', '%');
        await mk('aiAdvisor.forecastQualityText', 'Prognosequalität Text', 'string', 'text');
        await mk('aiAdvisor.peakLearningText', 'Lastspitzen-Lernfunktion Text', 'string', 'text');
        await mk('aiAdvisor.peakLearningJson', 'Lastspitzen-Lernfunktion JSON', 'string', 'json');
        await mk('aiAdvisor.topTitle', 'Top-Vorschlag Titel', 'string', 'text');
        await mk('aiAdvisor.topText', 'Top-Vorschlag Text', 'string', 'text');
        await mk('aiAdvisor.topAction', 'Top-Vorschlag Handlung', 'string', 'text');
        await mk('aiAdvisor.topWindow', 'Top-Vorschlag Zeitfenster', 'string', 'text');
        await mk('aiAdvisor.topCategory', 'Top-Vorschlag Kategorie', 'string', 'text');
        await mk('aiAdvisor.suggestionsJson', 'Vorschläge JSON', 'string', 'json');
        await mk('aiAdvisor.snapshotJson', 'KI-Energieberater Snapshot JSON', 'string', 'json');
        await mk('aiAdvisor.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time');
        await mk('aiAdvisor.nextUpdate', 'Nächste Aktualisierung', 'number', 'value.time');
        for (let i = 1; i <= 8; i++) {
            await a.setObjectNotExistsAsync(`aiAdvisor.suggestions.${i}`, { type: 'channel', common: { name: `Vorschlag ${i}` }, native: {} });
            await mk(`aiAdvisor.suggestions.${i}.title`, `Vorschlag ${i} Titel`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.text`, `Vorschlag ${i} Text`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.action`, `Vorschlag ${i} Handlung`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.severity`, `Vorschlag ${i} Severity`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.category`, `Vorschlag ${i} Kategorie`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.window`, `Vorschlag ${i} Zeitfenster`, 'string', 'text');
            await mk(`aiAdvisor.suggestions.${i}.impact`, `Vorschlag ${i} Wirkung`, 'string', 'text');
        }
    }

    /**
     * Code-Teil: Methode `_readState`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readState
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readState(localId, fallback = null) {
        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[localId] : null;
            if (rec && rec.value !== undefined && rec.value !== null) return rec.value;
        } catch (_e) {}
        try {
            const st = await this.adapter.getStateAsync(localId);
            if (st && st.val !== undefined && st.val !== null) return st.val;
        } catch (_e2) {}
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readNumber(keys, fallback = null) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v === null || v === undefined) continue;
            if (typeof v === 'string' && v.trim() === '') continue;
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_dpNumberFresh`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _dpNumberFresh
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _dpNumberFresh(key, maxAgeMs, fallback = null) {
        try {
            if (this.dp && typeof this.dp.getNumberFresh === 'function') {
                const v = this.dp.getNumberFresh(key, maxAgeMs, null);
                if (Number.isFinite(Number(v))) return Number(v);
            }
        } catch (_e) {}
        try {
            if (this.dp && typeof this.dp.getNumber === 'function') {
                const v = this.dp.getNumber(key, null);
                if (Number.isFinite(Number(v))) return Number(v);
            }
        } catch (_e2) {}
        return fallback;
    }

    /**
     * Code-Teil: Methode `_isStorageFarmActive`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _isStorageFarmActive
     * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getStorageControlAuthority() {
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                if (authority && typeof authority === 'object') return authority;
            }
            const cfg = (this.adapter && this.adapter.config && typeof this.adapter.config === 'object') ? this.adapter.config : {};
            const farm = (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : null;
            const farmDispatchActive = !!(farm && farm.dispatchActive);
            const singleActive = cfg.enableStorageControl === true;
            const selectedTopology = farmDispatchActive ? 'farm' : (singleActive ? 'single' : 'none');
            return {
                selectedTopology,
                writerActive: selectedTopology !== 'none',
                reason: farmDispatchActive ? 'writable-farm-active' : (singleActive ? 'single-active' : 'no-active-storage-output'),
            };
        } catch (_e) {
            return { selectedTopology: 'none', writerActive: false, reason: 'authority-error' };
        }
    }

    async _isStorageFarmActive() {
        const authority = this._getStorageControlAuthority();
        return String(authority.selectedTopology || 'none') === 'farm';
    }

    /**
     * Code-Teil: Methode `_readStorageSocPct`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readStorageSocPct
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readStorageSocPct(staleTimeoutSec = 300) {
        const staleMs = Math.max(30000, Number(staleTimeoutSec || 300) * 1000);
        const regularCandidates = [
            // storageSoc ist der generische, im Kunden-Frontend sichtbare Speicher-SoC.
            // Dieser Wert muss für die KI Vorrang haben, damit Dashboard und Beratung dieselbe Quelle nutzen.
            { key: 'storageSoc', type: 'state' },
            { key: 'speicher.regelung.socPct', type: 'state' },
            { key: 'speicher.socPct', type: 'state' },
            { key: 'batterySOC', type: 'state' },
            { key: 'batterySoc', type: 'state' },
            { key: 'batterySocPct', type: 'state' },
            { key: 'st.socPct', type: 'dp' },
        ];
        const farmCandidatesOnlineFirst = [
            { key: 'storageFarm.totalSocOnline', type: 'state' },
            { key: 'storageFarm.totalSoc', type: 'state' },
            { key: 'storageFarm.medianSoc', type: 'state' },
        ];
        const farmCandidatesTotalFirst = [
            { key: 'storageFarm.totalSoc', type: 'state' },
            { key: 'storageFarm.medianSoc', type: 'state' },
            { key: 'storageFarm.totalSocOnline', type: 'state' },
        ];
        /**
         * Code-Teil: Arrow-Funktion `readCandidate`
         * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: readCandidate
         * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const readCandidate = async (entry) => {
            const raw = entry.type === 'dp' ? this._dpNumberFresh(entry.key, staleMs, null) : await this._readNumber([entry.key], null);
            return storageSocLooksPlausible(raw) ? Number(raw) : null;
        };
        /**
         * Code-Teil: readFirst
         * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const readFirst = async (list) => {
            for (const entry of list) {
                const value = await readCandidate(entry);
                if (value !== null) return { value, source: entry.key };
            }
            return { value: null, source: '' };
        };

        const authority = this._getStorageControlAuthority();
        const storageTopology = String(authority.selectedTopology || 'none');
        const farmActive = storageTopology === 'farm';
        if (farmActive) {
            const socSourcesTotal = await this._readNumber(['storageFarm.socSourcesTotal'], 0);
            const socSourcesOnline = await this._readNumber(['storageFarm.socSourcesOnline'], 0);
            const farm = await readFirst(Number(socSourcesOnline) > 0 ? farmCandidatesOnlineFirst : farmCandidatesTotalFirst);
            // Bei ausgewaehlter Farm darf ein fehlender Farm-SoC nicht durch einen
            // alten Einzel-Speicherwert kaschiert werden. Die Beratung meldet die
            // Quelle dann explizit als unbekannt/degradiert.
            if (farm.value !== null && Number(socSourcesTotal) > 0) {
                return {
                    value: farm.value,
                    source: farm.source,
                    farmActive: true,
                    topology: storageTopology,
                    writerActive: !!authority.writerActive,
                    authorityReason: String(authority.reason || ''),
                };
            }
            return {
                value: null,
                source: 'storageFarm:no-soc-source',
                farmActive: true,
                topology: storageTopology,
                writerActive: !!authority.writerActive,
                authorityReason: String(authority.reason || ''),
            };
        }

        if (storageTopology === 'single') {
            const regular = await readFirst(regularCandidates);
            return {
                value: regular.value,
                source: regular.source,
                farmActive: false,
                topology: storageTopology,
                writerActive: !!authority.writerActive,
                authorityReason: String(authority.reason || ''),
            };
        }

        return {
            value: null,
            source: 'storage:none',
            farmActive: false,
            topology: 'none',
            writerActive: false,
            authorityReason: String(authority.reason || ''),
        };
    }

    /**
     * Code-Teil: Methode `_readString`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readString
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readString(keys, fallback = '') {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readBool`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readBool
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readBool(keys, fallback = false) {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
            const v = await this._readState(k, null);
            if (v !== null && v !== undefined) return bool(v, fallback);
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_chargingWallboxKeys`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _chargingWallboxKeys
     * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _chargingWallboxKeys() {
        const keys = [];
        try {
            const cfg = (this.adapter && this.adapter.config && this.adapter.config.chargingManagement && typeof this.adapter.config.chargingManagement === 'object') ? this.adapter.config.chargingManagement : {};
            const list = Array.isArray(cfg.wallboxes) ? cfg.wallboxes : [];
            for (let i = 0; i < list.length; i++) {
                const wb = list[i] || {};
                const raw = wb.key || wb.id || wb.index || wb.name || `lp${i + 1}`;
                const safe = toSafeIdPart(raw);
                if (safe) keys.push(safe);
            }
        } catch (_e) {}
        for (let i = 1; i <= 8; i++) keys.push(`lp${i}`);
        return Array.from(new Set(keys.filter(Boolean)));
    }

    /**
     * Code-Teil: Methode `_readEvGoals`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readEvGoals
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readEvGoals(evcsAvailable = true) {
        const out = [];
        if (!evcsAvailable) return out;
        const keys = this._chargingWallboxKeys();
        for (const safe of keys) {
            const base = `chargingManagement.wallboxes.${safe}`;
            const goalEnabled = await this._readBool([`${base}.goalEnabled`], false);
            const goalActive = await this._readBool([`${base}.goalActive`], false);
            const vehiclePlugged = await this._readBool([`${base}.vehiclePlugged`], false);
            const goalFinishTs = await this._readNumber([`${base}.goalFinishTs`], 0);
            const goalTargetSocPct = await this._readNumber([`${base}.goalTargetSocPct`], null);
            const goalRemainingMin = await this._readNumber([`${base}.goalRemainingMin`], null);
            const goalDesiredPowerW = await this._readNumber([`${base}.goalDesiredPowerW`], null);
            const goalRequiredPowerW = await this._readNumber([`${base}.goalRequiredPowerW`], null);
            const goalShortfallW = await this._readNumber([`${base}.goalShortfallW`], null);
            const goalStatus = await this._readString([`${base}.goalStatus`], '');
            const chargingPowerW = await this._readNumber([`${base}.actualPowerW`, `${base}.powerW`, `${base}.usedW`], null);
            const hasData = goalEnabled || goalActive || vehiclePlugged || (Number.isFinite(Number(goalFinishTs)) && Number(goalFinishTs) > 0) || (goalStatus && goalStatus !== 'idle');
            if (!hasData) continue;
            out.push({
                id: safe,
                label: safe.toUpperCase(),
                goalEnabled,
                goalActive,
                vehiclePlugged,
                goalFinishTs: Number.isFinite(Number(goalFinishTs)) ? Number(goalFinishTs) : 0,
                goalTargetSocPct: finiteNumber(goalTargetSocPct) ? goalTargetSocPct : null,
                goalRemainingMin: finiteNumber(goalRemainingMin) ? goalRemainingMin : null,
                goalDesiredPowerW: finiteNumber(goalDesiredPowerW) ? goalDesiredPowerW : null,
                goalRequiredPowerW: finiteNumber(goalRequiredPowerW) ? goalRequiredPowerW : null,
                goalShortfallW: finiteNumber(goalShortfallW) ? goalShortfallW : null,
                goalStatus,
                chargingPowerW: finiteNumber(chargingPowerW) ? Math.max(0, chargingPowerW) : null,
            });
        }
        return out;
    }

    /**
     * Code-Teil: Methode `_snapshot`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _snapshot
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _snapshot() {
        const gridRawW = await this._readNumber(['ems.gridPowerRawW', 'grid.powerRawW', 'gridPointPower'], null);
        const gridW = await this._readNumber(['ems.budget.gridW', 'ems.gridPowerW', 'grid.powerW'], gridRawW || 0);
        const gridImportW = await this._readNumber(['ems.budget.gridImportW', 'gridBuyPower'], Math.max(0, num(gridRawW, gridW || 0)));
        const gridExportW = await this._readNumber(['ems.budget.gridExportW', 'gridSellPower'], Math.max(0, -(num(gridRawW, gridW || 0))));
        const pvPowerW = await this._readNumber(['ems.budget.pvPowerW', 'derived.core.pv.totalW', 'pvPower', 'productionTotal'], 0);
        const pvBudgetW = await this._readNumber(['ems.budget.pvBudgetW', 'ems.budget.remainingPvW'], 0);
        const consumptionTotalW = await this._readNumber(['consumptionTotal', 'ems.budget.consumptionTotalW', 'building.powerW', 'loadPower'], null);
        const productionEnergyKwh = await this._readNumber(['productionEnergyKwh', 'pvEnergyKwh', 'production.energyKwh'], null);

        const cfgGridConnectionW = num(this.adapter && this.adapter.config && this.adapter.config.installerConfig ? this.adapter.config.installerConfig.gridConnectionPower : 0, 0);
        const gridConnectionLimitW = await this._readNumber(['ems.core.gridConnectionLimitW_cfg', 'installer.gridConnectionPower', 'installerConfig.gridConnectionPower'], cfgGridConnectionW || null);
        const gridImportLimitEffectiveW = await this._readNumber(['ems.core.gridImportLimitW_effective', 'chargingManagement.control.gridImportLimitW_effective'], null);
        const gridImportLimitSource = await this._readString(['ems.core.gridImportLimitW_source'], '');

        const storageSocInfo = await this._readStorageSocPct((this._cfg && this._cfg().staleTimeoutSec) || 300);
        const storageSocPct = storageSocInfo.value;
        const storageTopology = String(storageSocInfo.topology || 'none');
        const storageFarmActive = storageTopology === 'farm';
        const storageSocSource = storageSocInfo.source || '';
        // Beratung und Tagesplanung duerfen keine Leistungswerte der nicht
        // ausgewaehlten Speichertopologie einmischen. Das zentrale Budget bleibt
        // als kompatibler, bereits topologieaufgeloester Fallback zulaessig.
        const storageChargeW = storageTopology === 'farm'
            ? await this._readNumber(['storageFarm.totalChargePowerW', 'ems.budget.storageChargeW'], 0)
            : (storageTopology === 'single'
                ? await this._readNumber(['storageChargePower', 'ems.budget.storageChargeW'], 0)
                : 0);
        const storageDischargeW = storageTopology === 'farm'
            ? await this._readNumber(['storageFarm.totalDischargePowerW', 'ems.budget.storageDischargeW'], 0)
            : (storageTopology === 'single'
                ? await this._readNumber(['storageDischargePower', 'ems.budget.storageDischargeW'], 0)
                : 0);

        let evcsUsedW = await this._readNumber(['chargingManagement.control.usedW', 'evcs.totalPowerW', 'consumptionEvcs'], 0);
        const thermalUsedW = await this._readNumber(['thermal.summary.budgetUsedW'], 0);
        const heatingRodUsedW = await this._readNumber(['heatingRod.summary.budgetUsedW'], 0);
        let houseLoadW = await this._readNumber(['ems.budget.loadW', 'ems.budget.houseLoadW', 'derived.core.load.totalW', 'buildingConsumptionW', 'consumptionTotal', 'consumptionHouse'], null);
        if (!finiteNumber(houseLoadW)) {
            houseLoadW = Math.max(0, num(pvPowerW, 0) + Math.max(0, num(gridImportW, 0)) + Math.max(0, num(storageDischargeW, 0)) - Math.max(0, num(gridExportW, 0)) - Math.max(0, num(storageChargeW, 0)));
        }

        const aiCfg = (this.adapter && this.adapter.config && this.adapter.config.aiAdvisor && typeof this.adapter.config.aiAdvisor === 'object') ? this.adapter.config.aiAdvisor : {};
        const settingsCfg = (this.adapter && this.adapter.config && this.adapter.config.settingsConfig && typeof this.adapter.config.settingsConfig === 'object') ? this.adapter.config.settingsConfig : {};
        const evcsAvailable = inferEvcsAvailable(this.adapter, settingsCfg);
        if (!evcsAvailable) evcsUsedW = 0;
        const evcsCountRaw = evcsAvailable ? num(settingsCfg.evcsCount ?? this.adapter.evcsCount, Array.isArray(this.adapter && this.adapter.evcsList) ? this.adapter.evcsList.length : 0) : 0;
        const evcsCount = evcsAvailable ? Math.max(0, Math.min(20, Math.round(num(evcsCountRaw, 0)))) : 0;
        let evConnectedCount = 0;
        let evVehicleSocPct = null;
        let evStatusText = '';
        let evMode = '';
        if (evcsAvailable && evcsCount > 0) {
            for (let i = 1; i <= evcsCount; i++) {
                const status = await this._readString([`evcs.${i}.status`], '');
                const active = await this._readBool([`evcs.${i}.active`], false);
                const connectedByStatus = /charging|connected|plug|suspendedev|preparing|laden|verbunden/i.test(status || '');
                if (active || connectedByStatus) evConnectedCount += 1;
                if (!evStatusText && status) evStatusText = status;
                if (!evMode) evMode = await this._readString([`evcs.${i}.mode`], '');
                const soc = await this._readNumber([`evcs.${i}.vehicleSoc`, `evcs.${i}.vehicleSocPct`, `evcs.${i}.socPct`], null);
                if (finiteNumber(soc)) evVehicleSocPct = evVehicleSocPct === null ? soc : Math.min(evVehicleSocPct, soc);
            }
        }
        const connectedCount = evcsAvailable ? await this._readNumber(['chargingManagement.control.connectedCount', 'evcs.connectedCount'], null) : null;
        if (evcsAvailable && finiteNumber(connectedCount) && connectedCount > 0) evConnectedCount = Math.max(evConnectedCount, Math.round(connectedCount));
        const evTargetSocPct = evcsAvailable ? await this._readNumber(['settings.aiAdvisorEvTargetSocPct', 'chargingManagement.targetSocPct', 'evcs.1.targetSoc', 'evcs.1.targetSocPct'], num(aiCfg.evTargetSocPct ?? aiCfg.defaultEvTargetSocPct, 80)) : null;
        const evBatteryCapacityKwh = evcsAvailable ? num(aiCfg.evBatteryCapacityKwh, 60) : null;
        const evReadyBy = evcsAvailable ? await this._readString(['settings.aiAdvisorEvReadyBy', 'chargingManagement.readyBy', 'evcs.1.readyBy', 'evcs.1.departureTime'], String(aiCfg.evReadyBy || aiCfg.evDepartureTime || '07:00')) : '';
        const evMinutesUntilReady = evcsAvailable ? minutesUntilClock(evReadyBy, new Date()) : null;
        const evEnergyNeededKwh = (evcsAvailable && finiteNumber(evVehicleSocPct) && finiteNumber(evTargetSocPct) && finiteNumber(evBatteryCapacityKwh))
            ? Math.max(0, (evBatteryCapacityKwh * (Math.min(100, evTargetSocPct) - Math.max(0, evVehicleSocPct))) / 100)
            : null;

        const tariffActive = await this._readBool(['tarif.aktiv', 'ems.budget.tariff.active'], false);
        const tariffState = await this._readString(['tarif.state', 'ems.budget.tariff.state'], '');
        const priceNow = await this._readNumber(['tarif.preisAktuellEurProKwh', 'ems.budget.tariff.currentPriceEurKwh'], null);
        const priceAvg = await this._readNumber(['tarif.preisDurchschnittEurProKwh'], null);
        const priceCheapThreshold = await this._readNumber(['tarif.preisSchwelleGuensigEurProKwh'], null);
        const nextCheapFrom = await this._readString(['tarif.naechstesGuensigVon'], '');
        const nextCheapTo = await this._readString(['tarif.naechstesGuensigBis'], '');
        const negativeActive = await this._readBool(['tarif.negativpreisAktiv', 'ems.budget.tariff.negativeActive'], false);
        const gridImportPreferred = await this._readBool(['tarif.netzbezugBevorzugt', 'ems.budget.tariff.gridImportPreferred'], negativeActive);
        const co2IntensityGPerKwh = await this._readNumber(['tarif.co2IntensityGPerKwh', 'grid.co2IntensityGPerKwh', 'co2.gridIntensityGPerKwh'], null);

        const pvForecastUsable = await this._readBool(['ems.budget.forecast.usable', 'forecast.pv.valid'], false);
        const pvKwh6 = await this._readNumber(['ems.budget.forecast.kwhNext6h', 'forecast.pv.kwhNext6h'], 0);
        const pvKwh12 = await this._readNumber(['ems.budget.forecast.kwhNext12h', 'forecast.pv.kwhNext12h'], 0);
        const pvKwh24 = await this._readNumber(['ems.budget.forecast.kwhNext24h', 'forecast.pv.kwhNext24h'], 0);
        const pvPeak24W = await this._readNumber(['ems.budget.forecast.peakNext24h', 'forecast.pv.peakWNext24h'], 0);
        const forecastQualityPct = await this._readNumber(['ems.budget.forecast.qualityPct', 'forecast.pv.qualityPct', 'forecast.qualityPct'], null);
        const forecastErrorPct = await this._readNumber(['ems.budget.forecast.errorPct', 'forecast.pv.errorPct', 'forecast.errorPct'], null);

        const weatherEnabled = await this._readBool(['settings.weatherEnabled'], false);
        const weatherTempC = await this._readNumber(['weatherTempC'], null);
        const weatherText = await this._readString(['weatherText'], '');
        const weatherCloudPct = await this._readNumber(['weatherCloudPct'], null);
        const weatherWindKmh = await this._readNumber(['weatherWindKmh'], null);
        const weatherTomorrowMinC = await this._readNumber(['weatherTomorrowMinC'], null);
        const weatherTomorrowMaxC = await this._readNumber(['weatherTomorrowMaxC'], null);
        const weatherTomorrowPrecipPct = await this._readNumber(['weatherTomorrowPrecipPct'], null);
        const weatherTomorrowCode = await this._readNumber(['weatherTomorrowCode'], null);
        const weatherTomorrowText = await this._readString(['weatherTomorrowText'], '');

        const peakActive = await this._readBool(['peakShaving.control.active'], false);
        const peakLimitW = await this._readNumber(['peakShaving.control.limitW', 'ems.core.gridImportLimitW_effective'], null);
        const peakOverW = await this._readNumber(['peakShaving.control.overW'], 0);
        const peakStatus = await this._readString(['peakShaving.control.status'], '');
        const hlzfActive = await this._readBool(['peakShaving.atypical.activeWindow'], false);
        const para14aActive = await this._readBool(['para14a.active', 'ems.core.para14aActive'], false);
        const peakStatusLower = String(peakStatus || '').toLowerCase();
        const peakConfigured = isPeakShavingConfigured(this.adapter && this.adapter.config)
            || (finiteNumber(peakLimitW) && peakLimitW > 0 && !['disabled', 'off', 'inactive', 'aus'].includes(peakStatusLower));
        const evGoals = evcsAvailable ? await this._readEvGoals(evcsAvailable) : [];

        return {
            ts: Date.now(),
            gridRawW,
            gridW,
            gridImportW: Math.max(0, num(gridImportW, 0)),
            gridExportW: Math.max(0, num(gridExportW, 0)),
            gridConnectionLimitW: finiteNumber(gridConnectionLimitW) && gridConnectionLimitW > 0 ? gridConnectionLimitW : null,
            gridImportLimitEffectiveW: finiteNumber(gridImportLimitEffectiveW) && gridImportLimitEffectiveW > 0 ? gridImportLimitEffectiveW : null,
            gridImportLimitSource,
            pvPowerW: Math.max(0, num(pvPowerW, 0)),
            pvBudgetW: Math.max(0, num(pvBudgetW, 0)),
            consumptionTotalW: finiteNumber(consumptionTotalW) ? Math.max(0, num(consumptionTotalW, 0)) : null,
            productionEnergyKwh: finiteNumber(productionEnergyKwh) ? productionEnergyKwh : null,
            storageSocPct: finiteNumber(storageSocPct) ? storageSocPct : null,
            storageSocSource,
            storageFarmActive,
            storageChargeW: Math.max(0, num(storageChargeW, 0)),
            storageDischargeW: Math.max(0, num(storageDischargeW, 0)),
            evcsAvailable,
            evcsCount,
            evcsUsedW: evcsAvailable ? Math.max(0, num(evcsUsedW, 0)) : 0,
            thermalUsedW: Math.max(0, num(thermalUsedW, 0)),
            heatingRodUsedW: Math.max(0, num(heatingRodUsedW, 0)),
            houseLoadW: Math.max(0, num(houseLoadW, 0)),
            evConnectedCount: Math.max(0, Math.round(num(evConnectedCount, 0))),
            evVehicleSocPct: finiteNumber(evVehicleSocPct) ? evVehicleSocPct : null,
            evTargetSocPct: finiteNumber(evTargetSocPct) ? evTargetSocPct : null,
            evBatteryCapacityKwh: finiteNumber(evBatteryCapacityKwh) ? evBatteryCapacityKwh : null,
            evReadyBy,
            evMinutesUntilReady: finiteNumber(evMinutesUntilReady) ? evMinutesUntilReady : null,
            evEnergyNeededKwh: finiteNumber(evEnergyNeededKwh) ? evEnergyNeededKwh : null,
            evStatusText,
            evMode,
            tariffActive,
            tariffState,
            priceNow,
            priceAvg,
            priceCheapThreshold,
            nextCheapFrom,
            nextCheapTo,
            negativeActive,
            gridImportPreferred,
            co2IntensityGPerKwh: finiteNumber(co2IntensityGPerKwh) ? co2IntensityGPerKwh : null,
            pvForecastUsable,
            pvKwh6: Math.max(0, num(pvKwh6, 0)),
            pvKwh12: Math.max(0, num(pvKwh12, 0)),
            pvKwh24: Math.max(0, num(pvKwh24, 0)),
            pvPeak24W: Math.max(0, num(pvPeak24W, 0)),
            forecastQualityPct: finiteNumber(forecastQualityPct) ? forecastQualityPct : null,
            forecastErrorPct: finiteNumber(forecastErrorPct) ? forecastErrorPct : null,
            weatherEnabled,
            weatherTempC: finiteNumber(weatherTempC) ? weatherTempC : null,
            weatherText,
            weatherCloudPct: finiteNumber(weatherCloudPct) ? weatherCloudPct : null,
            weatherWindKmh: finiteNumber(weatherWindKmh) ? weatherWindKmh : null,
            weatherTomorrowMinC: finiteNumber(weatherTomorrowMinC) ? weatherTomorrowMinC : null,
            weatherTomorrowMaxC: finiteNumber(weatherTomorrowMaxC) ? weatherTomorrowMaxC : null,
            weatherTomorrowPrecipPct: finiteNumber(weatherTomorrowPrecipPct) ? weatherTomorrowPrecipPct : null,
            weatherTomorrowCode: finiteNumber(weatherTomorrowCode) ? weatherTomorrowCode : null,
            weatherTomorrowText,
            peakActive,
            peakLimitW: finiteNumber(peakLimitW) && peakLimitW > 0 ? peakLimitW : null,
            peakOverW: Math.max(0, num(peakOverW, 0)),
            peakStatus,
            peakConfigured,
            hlzfActive,
            para14aActive,
            evGoals,
        };
    }

    /**
     * Code-Teil: Methode `_updateLearning`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _updateLearning
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _updateLearning(snapshot, cfg) {
        const s = Object.assign({}, snapshot || {});
        const now = Number(s.ts) || Date.now();
        const d = new Date(now);
        const hour = d.getHours();
        const sample = {
            ts: now,
            hour,
            gridImportW: Math.max(0, Number(s.gridImportW) || 0),
            gridExportW: Math.max(0, Number(s.gridExportW) || 0),
            pvPowerW: Math.max(0, Number(s.pvPowerW) || 0),
            houseLoadW: Math.max(0, Number(s.houseLoadW) || Number(s.consumptionTotalW) || 0),
        };
        const last = this._samples.length ? this._samples[this._samples.length - 1] : null;
        if (!last || now - last.ts >= 30000) this._samples.push(sample);
        const keepFrom = now - 72 * 3600 * 1000;
        this._samples = this._samples.filter((it) => it && it.ts >= keepFrom).slice(-5000);

        const peakBase = finiteNumber(s.gridConnectionLimitW) && s.gridConnectionLimitW > 0 ? s.gridConnectionLimitW : (finiteNumber(s.peakLimitW) && s.peakLimitW > 0 ? s.peakLimitW : null);
        const peakWarnW = peakBase ? peakBase * ((cfg.peakNearLimitPct || 90) / 100) : null;
        if (cfg.learningEnabled && peakWarnW && sample.gridImportW >= peakWarnW * 0.78) {
            this._peakHourBuckets[hour] = (Number(this._peakHourBuckets[hour]) || 0) + clamp(sample.gridImportW / Math.max(1000, peakWarnW), 0.25, 2.5);
        }
        if (cfg.learningEnabled && (!last || now - last.ts >= 5 * 60000)) this._peakHourBuckets = this._peakHourBuckets.map((v) => Math.max(0, (Number(v) || 0) * 0.997));
        let topHour = -1;
        let topScore = 0;
        this._peakHourBuckets.forEach((v, idx) => { if ((Number(v) || 0) > topScore) { topScore = Number(v) || 0; topHour = idx; } });
        s.peakRiskHour = topHour >= 0 && topScore >= 1.5 ? topHour : null;
        s.peakRiskWindow = s.peakRiskHour !== null ? formatWindowHour(s.peakRiskHour) : '';
        s.peakLearningJson = JSON.stringify({ hours: this._peakHourBuckets.map((v, idx) => ({ hour: idx, score: round(v, 2) || 0 })), topHour: s.peakRiskHour, topWindow: s.peakRiskWindow });
        const older = this._samples.filter((it) => it && it.ts < now - 10 * 60000);
        const sameHour = older.filter((it) => Math.abs((Number(it.hour) || 0) - hour) <= 1 || Math.abs((Number(it.hour) || 0) - hour) >= 23);
        const baselineSet = sameHour.length >= Math.min(6, older.length) ? sameHour : older;
        const baselineW = average(baselineSet, 'houseLoadW');
        const p95W = percentile(baselineSet, 'houseLoadW', 0.95);
        const flexW = Math.max(0, Number(s.evcsUsedW) || 0) + Math.max(0, Number(s.thermalUsedW) || 0) + Math.max(0, Number(s.heatingRodUsedW) || 0);
        const unexplainedW = Math.max(0, sample.houseLoadW - flexW);
        const quietActive = isInsideClockWindow(now, cfg.quietHoursStart, cfg.quietHoursEnd);
        const anomalyLimitW = Math.max(Number(cfg.anomalyMinImportW) || 0, baselineW ? baselineW * (Number(cfg.anomalyFactor) || 2.2) : 0, p95W ? p95W * 1.25 : 0);
        const enoughSamples = baselineSet.length >= (Number(cfg.anomalyMinSamples) || 12);
        s.anomalyBaselineW = baselineW;
        s.anomalyP95W = p95W;
        s.anomalyDetected = false;
        s.anomalyText = '';
        if (cfg.anomalyDetectionEnabled) {
            if (quietActive && unexplainedW >= cfg.nightBaseLoadW && Math.max(0, Number(s.evcsUsedW) || 0) < 200) {
                s.anomalyDetected = true;
                s.anomalyText = s.evcsAvailable ? `Ungewöhnliche Grundlast im Ruhefenster: etwa ${formatKw(unexplainedW)} ohne erkennbare Wallbox-/Thermiklast.` : `Ungewöhnliche Grundlast im Ruhefenster: etwa ${formatKw(unexplainedW)} ohne erkennbare Thermik-/Heizstablast.`;
            } else if (unexplainedW >= cfg.anomalyHighLoadW) {
                s.anomalyDetected = true;
                s.anomalyText = `Ungewöhnlich hoher Gebäudeverbrauch: etwa ${formatKw(unexplainedW)} nicht durch bekannte flexible Verbraucher erklärt.`;
            } else if (enoughSamples && sample.houseLoadW >= anomalyLimitW && sample.houseLoadW > 0) {
                s.anomalyDetected = true;
                s.anomalyText = `Der Gebäudeverbrauch liegt deutlich über dem gelernten Bereich (${formatKw(sample.houseLoadW)} statt typisch ${baselineW ? formatKw(baselineW) : '—'}).`;
            }
        }

        if (finiteNumber(s.forecastQualityPct)) {
            this._forecastQualityPct = clamp(Number(s.forecastQualityPct), 0, 100);
            this._forecastQualityText = `PV-Prognosequalität ca. ${formatPct(this._forecastQualityPct)}.`;
        } else if (finiteNumber(s.forecastErrorPct)) {
            this._forecastQualityPct = clamp(100 - Math.abs(Number(s.forecastErrorPct)), 0, 100);
            this._forecastQualityText = `PV-Prognosequalität ca. ${formatPct(this._forecastQualityPct)}.`;
        } else if (cfg.forecastQualityEnabled && s.pvForecastUsable && finiteNumber(s.productionEnergyKwh) && s.pvKwh6 > 0.5) {
            const lastCheck = this._forecastChecks.length ? this._forecastChecks[this._forecastChecks.length - 1] : null;
            if (!lastCheck || now - lastCheck.ts >= 60 * 60000) this._forecastChecks.push({ ts: now, forecastKwh6: s.pvKwh6, productionEnergyKwh: s.productionEnergyKwh, resolved: false });
        }
        for (const check of this._forecastChecks) {
            if (!check || check.resolved) continue;
            const age = now - check.ts;
            if (age >= 5.75 * 3600000 && age <= 9 * 3600000 && finiteNumber(s.productionEnergyKwh) && finiteNumber(check.productionEnergyKwh)) {
                const actual = Math.max(0, Number(s.productionEnergyKwh) - Number(check.productionEnergyKwh));
                const forecast = Math.max(0.1, Number(check.forecastKwh6) || 0);
                const errPct = Math.abs(actual - forecast) / forecast * 100;
                const q = clamp(100 - errPct, 0, 100);
                check.resolved = true;
                check.actualKwh = actual;
                check.qualityPct = q;
                check.errPct = errPct;
            }
        }
        this._forecastChecks = this._forecastChecks.filter((it) => it && now - it.ts <= 30 * 3600000).slice(-48);
        const recentResolved = this._forecastChecks.filter((it) => it && it.resolved && finiteNumber(it.qualityPct)).slice(-8);
        if (recentResolved.length) {
            this._forecastQualityPct = round(average(recentResolved, 'qualityPct'), 0);
            const lastQ = recentResolved[recentResolved.length - 1];
            this._forecastQualityText = `PV-Prognosequalität ca. ${formatPct(this._forecastQualityPct)} (letzte Prüfung: Forecast ${formatKwh(lastQ.forecastKwh6)}, Ist ${formatKwh(lastQ.actualKwh)}).`;
        }
        s.forecastQualityPct = this._forecastQualityPct;
        s.forecastQualityText = this._forecastQualityText || (s.pvForecastUsable ? 'PV-Prognose aktiv; Qualität wird nach den ersten Vergleichsfenstern bewertet.' : 'PV-Prognose nicht verfügbar.');
        s.season = seasonFromDate(new Date(now));
        s.seasonLabel = seasonLabel(s.season);
        s.comfortActive = isInsideClockWindow(now, cfg.comfortStart, cfg.comfortEnd);
        s.quietActive = quietActive;
        s.comfortWindow = `${cfg.comfortStart || '06:00'}–${cfg.comfortEnd || '22:00'}`;
        s.quietWindow = `${cfg.quietHoursStart || '22:00'}–${cfg.quietHoursEnd || '06:00'}`;
        s.optimizationMode = cfg.optimizationMode;
        this._lastLearning = {
            anomaly: !!s.anomalyDetected,
            anomalyText: s.anomalyText || '',
            peakLearningText: s.peakRiskWindow ? `Gelerntes Peak-Risiko im Fenster ${s.peakRiskWindow}.` : 'Lernprofil wird aufgebaut.',
            forecastQualityPct: s.forecastQualityPct,
            forecastQualityText: s.forecastQualityText,
            byHour: this._peakHourBuckets.map((v, idx) => ({ hour: idx, score: round(v, 2) || 0 })),
        };
        return s;
    }

    /**
     * Code-Teil: Methode `_makeDailyPlan`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _makeDailyPlan
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _makeDailyPlan(s, cfg) {
        const items = [];
        /**
         * Code-Teil: add
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const add = (time, title, text, priority, category) => {
            if (!title || !text) return;
            items.push({ time: String(time || ''), title: String(title), text: String(text), priority: Math.round(Number(priority) || 0), category: String(category || 'system') });
        };
        const tariffState = String(s.tariffState || '').toLowerCase();
        const currentCheap = !!(s.negativeActive || s.gridImportPreferred || tariffState.includes('günstig') || tariffState.includes('guenstig') || tariffState.includes('cheap'));
        const currentExpensive = !!(tariffState.includes('teuer') || tariffState.includes('expensive'));
        const surplusW = Math.max(Number(s.gridExportW) || 0, Number(s.pvBudgetW) || 0);
        const hasEvcs = !!s.evcsAvailable && (Number(s.evcsCount) > 0 || Number(s.evConnectedCount) > 0 || Number(s.evcsUsedW) > 100);
        const surplusTargets = hasEvcs ? 'Wallbox, Warmwasser oder andere flexible Verbraucher' : 'Warmwasser, Heizstab oder andere flexible Verbraucher';
        const peakLimit = finiteNumber(s.gridConnectionLimitW) && s.gridConnectionLimitW > 0 ? s.gridConnectionLimitW : (finiteNumber(s.peakLimitW) && s.peakLimitW > 0 ? s.peakLimitW : s.gridImportLimitEffectiveW);
        const peakUsagePct = peakLimit ? (s.gridImportW / peakLimit * 100) : 0;
        if (peakLimit && peakUsagePct >= (cfg.peakNearLimitPct || 90)) add('jetzt', 'Peak-Schutz', `Netzbezug bei ${formatPct(peakUsagePct)}: flexible Lasten nach Priorität reduzieren (${priorityText(cfg.priorities, { hasEvcs })}).`, 95, 'peak');
        if (surplusW >= cfg.pvSurplusThresholdW) add('jetzt', 'PV-Überschuss nutzen', `${formatKw(surplusW)} Überschuss in ${surplusTargets} legen.`, 86, 'pv');
        if (currentCheap) add('jetzt', 'Günstigen Tarif nutzen', `Preisfenster nutzen${finiteNumber(s.priceNow) ? ` (${formatPrice(s.priceNow)})` : ''}, solange Peak-Reserve bleibt.`, 84, 'tariff');
        else if (currentExpensive) add('jetzt vermeiden', 'Teures Tarif-/Lastfenster', hasEvcs ? 'EV-Laden und Heizstab möglichst verschieben; Speicherreserve nur gezielt nutzen.' : 'Heizstab und andere flexible Lasten möglichst verschieben; Speicherreserve nur gezielt nutzen.', 80, 'tariff');
        if (s.nextCheapFrom) add(shortIsoWindow(s.nextCheapFrom, s.nextCheapTo) || 'nächstes Tarif-Fenster', 'Nächstes günstiges Zeitfenster', 'Planbare Lasten in dieses Fenster verschieben.', 68, 'tariff');
        if (s.pvForecastUsable && (s.pvKwh24 > 0 || s.pvPeak24W > 0)) add('Sonnenfenster', 'PV-Prognose einplanen', `${formatKwh(s.pvKwh24)} in 24h erwartet${s.pvPeak24W > 0 ? `, Peak ${formatKw(s.pvPeak24W)}` : ''}. Speicher-Headroom und flexible Lasten darauf abstimmen.`, 70, 'forecast');
        if (hasEvcs && s.evConnectedCount > 0) {
            if (finiteNumber(s.evEnergyNeededKwh) && s.evEnergyNeededKwh > 1) add(`bis ${s.evReadyBy || cfg.evReadyBy}`, 'EV-Ziel erreichen', `${formatKwh(s.evEnergyNeededKwh)} bis Ziel-SoC ${formatPct(s.evTargetSocPct || cfg.evTargetSocPct)} nachladen; PV-/Tariffenster bevorzugen.`, s.evMinutesUntilReady !== null && s.evMinutesUntilReady < 180 ? 90 : 74, 'evcs');
            else add(`bis ${s.evReadyBy || cfg.evReadyBy}`, 'EV-Komfort prüfen', 'Fahrzeug ist verbunden; Ziel-SoC/Abfahrtszeit prüfen, damit PV und Tarif sauber geplant werden können.', 52, 'evcs');
        }
        const activeGoals = hasEvcs ? (Array.isArray(s.evGoals) ? s.evGoals : []).filter((g) => g && (g.goalEnabled || g.goalActive)) : [];
        if (activeGoals.length) {
            const next = activeGoals.slice().sort((a, b) => (Number(a.goalFinishTs || 0) || Infinity) - (Number(b.goalFinishTs || 0) || Infinity))[0];
            add(tsToShortWindow(next.goalFinishTs) || 'EV-Ziel', 'EV-Zielladen absichern', `${next.label}: Ziel ${next.goalTargetSocPct !== null ? `${round(next.goalTargetSocPct, 0)} %` : 'gesetzt'}${next.goalFinishTs ? ` bis ${formatClockMs(next.goalFinishTs)}` : ''}.`, 82, 'evcs');
        }
        if (s.weatherEnabled) {
            const rainy = (finiteNumber(s.weatherTomorrowPrecipPct) && s.weatherTomorrowPrecipPct >= cfg.weatherRainRiskPct) || textContainsAny(`${s.weatherTomorrowText || ''} ${s.weatherText || ''}`, ['regen', 'schauer', 'gewitter', 'schnee', 'bedeckt']);
            const sunny = !rainy && (textContainsAny(`${s.weatherTomorrowText || ''} ${s.weatherText || ''}`, ['sonnig', 'klar', 'heiter']) || (finiteNumber(s.weatherTomorrowPrecipPct) && s.weatherTomorrowPrecipPct <= 25));
            if (rainy) add('heute / morgen', 'Speicherreserve wettergeführt', 'Schwächeres PV-Fenster erwartet: Speicher nicht unnötig leeren und Komfortlasten auf sichere Fenster legen.', 72, 'weather');
            if (sunny) add('morgen', 'PV-Headroom vorbereiten', 'Gutes PV-Fenster erwartet: unnötige Netzladung vermeiden und Speicherplatz für PV freihalten.', 66, 'weather');
        }
        if (cfg.seasonLogicEnabled) {
            if (s.season === 'winter') add('laufend', 'Winterstrategie', 'Reserve höher gewichten, weil PV-Fenster kürzer und Wärmelasten relevanter sind.', 54, 'storage');
            if (s.season === 'summer') add('tagsüber', 'Sommerstrategie', hasEvcs ? 'PV-Headroom und Eigenverbrauch hoch gewichten; Abendspitzen durch EV/Kühlung vermeiden.' : 'PV-Headroom und Eigenverbrauch hoch gewichten; Abendspitzen durch Kühlung/Heizstab vermeiden.', 54, 'pv');
        }
        if (s.peakRiskWindow) add(s.peakRiskWindow, 'Gelerntes Peak-Fenster entschärfen', 'Große flexible Lasten nicht gleichzeitig starten.', 74, 'learning');
        if (s.anomalyDetected) add('prüfen', 'Anomalie prüfen', s.anomalyText, 88, 'anomaly');
        if (!items.length) add('heute', 'Weiter beobachten', 'Keine starken Optimierungssignale; größere Verbraucher in PV- oder günstige Tarifzeiten legen.', 30, 'system');
        const sorted = items.sort((a, b) => b.priority - a.priority).slice(0, 6);
        const text = `Modus ${optimizationModeLabel(cfg.optimizationMode)}: ` + sorted.slice(0, 4).map((it) => `${it.time}: ${it.title}`).join(' · ');
        return { mode: cfg.optimizationMode, modeLabel: optimizationModeLabel(cfg.optimizationMode), season: s.season, seasonLabel: s.seasonLabel, items: sorted, text };
    }

    /**
     * Code-Teil: Methode `_pushSuggestion`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _pushSuggestion
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _pushSuggestion(list, item) {
        if (!item || !item.id) return;
        const severityWeight = { critical: 5, warning: 4, success: 3, info: 2, neutral: 1 };
        list.push({
            id: String(item.id),
            category: String(item.category || 'general'),
            severity: String(item.severity || 'info'),
            priority: Math.max(0, Math.round(Number(item.priority) || 0)),
            title: String(item.title || ''),
            text: String(item.text || ''),
            action: String(item.action || ''),
            reason: String(item.reason || ''),
            window: String(item.window || ''),
            impact: String(item.impact || ''),
            confidence: clamp(num(item.confidence, 70), 0, 100),
            icon: String(item.icon || '💡'),
            rankWeight: (Number(item.priority) || 0) + (severityWeight[String(item.severity || 'info')] || 1),
        });
    }

    /**
     * Code-Teil: Methode `_buildSuggestions`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildSuggestions
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildSuggestions(s, cfg) {
        const out = [];
        s.weatherSummary = s.weatherSummary || buildWeatherSummary(s);
        const tariffState = String(s.tariffState || '').toLowerCase();
        const currentCheap = !!(
            s.negativeActive || s.gridImportPreferred || tariffState.includes('günstig') || tariffState.includes('guenstig') || tariffState.includes('cheap') ||
            (finiteNumber(s.priceNow) && finiteNumber(s.priceCheapThreshold) && s.priceNow <= s.priceCheapThreshold) ||
            (finiteNumber(s.priceNow) && finiteNumber(s.priceAvg) && s.priceNow <= (s.priceAvg - cfg.cheapPriceMarginEurKwh))
        );
        const currentExpensive = !!(tariffState.includes('teuer') || tariffState.includes('expensive') || (finiteNumber(s.priceNow) && finiteNumber(s.priceAvg) && s.priceNow >= (s.priceAvg + cfg.expensivePriceMarginEurKwh)));
        const hasStorage = s.storageSocPct !== null;
        const storageEnough = !hasStorage || s.storageSocPct >= cfg.minSocForDischargePct;
        const hasEvcs = !!s.evcsAvailable && (Number(s.evcsCount) > 0 || Number(s.evConnectedCount) > 0 || Number(s.evcsUsedW) > 100);
        const evLoadW = hasEvcs ? Math.max(0, Number(s.evcsUsedW) || 0) : 0;
        const hasFlexibleLoad = (evLoadW > 100 || s.thermalUsedW > 100 || s.heatingRodUsedW > 100) || !!(this.adapter && this.adapter.config && ((hasEvcs && this.adapter.config.enableChargingManagement) || this.adapter.config.enableThermalControl || this.adapter.config.enableHeatingRodControl));
        const flexibleLoadLabel = evcsPhrase(hasEvcs, true);
        const flexibleConsumerLabel = evcsPhrase(hasEvcs, false);
        const pvSurplusTargets = hasEvcs ? 'Wallbox, Warmwasser oder andere flexible Verbraucher' : 'Warmwasser, Heizstab oder andere flexible Verbraucher';
        const configuredGridLimitW = finiteNumber(s.gridConnectionLimitW) && s.gridConnectionLimitW > 0 ? s.gridConnectionLimitW : null;
        const effectiveGridLimitW = finiteNumber(s.peakLimitW) && s.peakLimitW > 0 ? s.peakLimitW : (finiteNumber(s.gridImportLimitEffectiveW) && s.gridImportLimitEffectiveW > 0 ? s.gridImportLimitEffectiveW : null);
        const peakReferenceLimitW = configuredGridLimitW || effectiveGridLimitW;
        const peakUsagePct = peakReferenceLimitW ? (s.gridImportW / peakReferenceLimitW * 100) : null;
        const peakWarnThresholdW = peakReferenceLimitW ? (peakReferenceLimitW * (cfg.peakNearLimitPct / 100)) : null;
        const peakNearLimit = peakReferenceLimitW && Number.isFinite(peakUsagePct) && peakUsagePct >= cfg.peakNearLimitPct;
        const peakCriticalLimit = peakReferenceLimitW && Number.isFinite(peakUsagePct) && peakUsagePct >= cfg.peakCriticalLimitPct;
        const peakReadinessText = s.peakActive
            ? 'Lastspitzenkappung ist aktiv.'
            : (s.peakConfigured ? 'Lastspitzenkappung ist vorbereitet und wird bei Überschreiten des konfigurierten Limits aktiv.' : 'Lastspitzenkappung ist aktuell nicht konfiguriert – der KI-Berater warnt nur und schaltet nichts automatisch.');

        if (s.peakActive || s.hlzfActive || s.peakOverW > 0) {
            const lim = peakReferenceLimitW || s.peakLimitW;
            const pctText = lim ? ` (${formatPct((s.gridImportW / lim) * 100)} von ${formatKw(lim)})` : '';
            this._pushSuggestion(out, {
                id: 'peak-window-protect', category: 'peak', severity: s.peakOverW > 0 ? 'critical' : 'warning', priority: 98, icon: '⚡',
                title: s.hlzfActive ? 'Hochlastzeitfenster / Lastspitze aktiv' : 'Lastspitzenkappung aktiv',
                text: s.peakOverW > 0 ? `Aktuell liegt der Netzbezug etwa ${formatKw(s.peakOverW)} über dem Limit${pctText}. Lastspitzenkappung ist aktiv.` : `Der Netzbezug wird aktuell durch ${s.hlzfActive ? 'HLZF/§19' : 'Lastspitzenkappung'} begrenzt${pctText || (finiteNumber(s.peakLimitW) ? ` (Limit ${formatKw(s.peakLimitW)})` : '')}.`,
                action: `${flexibleLoadLabel} nach Priorität pausieren/reduzieren (${priorityText(cfg.priorities, { hasEvcs })}), bis der Netzanschluss wieder unter der Grenze liegt.`,
                window: 'jetzt', impact: 'Leistungspreis / Netzanschluss schützen', confidence: 92,
            });
        } else if (peakNearLimit) {
            const remainingW = Math.max(0, peakReferenceLimitW - s.gridImportW);
            const warnText = peakWarnThresholdW ? `Die Vorwarnschwelle liegt bei ${formatPct(cfg.peakNearLimitPct)} = ${formatKw(peakWarnThresholdW)}.` : '';
            this._pushSuggestion(out, {
                id: 'peak-near-grid-connection-limit', category: 'peak', severity: peakCriticalLimit ? 'critical' : 'warning', priority: peakCriticalLimit ? 97 : 92, icon: peakCriticalLimit ? '🛑' : '🚧',
                title: peakCriticalLimit ? 'Netzanschluss am Limit' : `Netzanschluss zu ${formatPct(cfg.peakNearLimitPct)} ausgelastet`,
                text: `Aktuell werden ${formatKw(s.gridImportW)} von ${formatKw(peakReferenceLimitW)} genutzt (${formatPct(peakUsagePct)}). ${warnText} ${peakReadinessText}`.replace(/\s+/g, ' ').trim(),
                action: s.peakConfigured ? `Jetzt optimieren: flexible Lasten nach Priorität reduzieren oder verschieben (${priorityText(cfg.priorities, { hasEvcs })})${hasStorage && storageEnough ? ', Speicherentladung als Stütze prüfen' : ''}. Es bleiben nur etwa ${formatKw(remainingW)} Reserve bis zum Netzanschlusslimit.` : `Peak-Shaving im Installer/App-Center prüfen. Bis dahin flexible Lasten manuell reduzieren oder verschieben${hasStorage && storageEnough ? ' und Speicherstützung prüfen' : ''}. Es bleiben nur etwa ${formatKw(remainingW)} Reserve.`,
                window: 'jetzt', impact: 'Lastspitze vermeiden', confidence: s.peakConfigured ? 90 : 82,
            });
        }

        if (cfg.dailyPlanEnabled && s.dayPlan && Array.isArray(s.dayPlan.items) && s.dayPlan.items.length) {
            this._pushSuggestion(out, { id: 'ai-day-plan', category: 'plan', severity: 'info', priority: (cfg.optimizationMode === 'comfort' ? 82 : 76), icon: '🗓️', title: 'Tagesfahrplan erstellt', text: s.dayPlan.text, action: 'Planbare Verbraucher anhand dieser Reihenfolge einplanen; der Berater schaltet weiterhin nichts automatisch.', window: 'heute', impact: 'Vorausschauende Planung', confidence: 76 });
        }
        const activeEvGoals = hasEvcs ? (Array.isArray(s.evGoals) ? s.evGoals : []).filter((g) => g && (g.goalEnabled || g.goalActive)) : [];
        if (hasEvcs && cfg.evGoalPlanningEnabled && (activeEvGoals.length || (s.evConnectedCount > 0 && finiteNumber(s.evEnergyNeededKwh)))) {
            const urgent = activeEvGoals.length ? activeEvGoals.slice().sort((a, b) => (finiteNumber(a.goalRemainingMin) ? a.goalRemainingMin : 999999) - (finiteNumber(b.goalRemainingMin) ? b.goalRemainingMin : 999999))[0] : null;
            const remaining = urgent && finiteNumber(urgent.goalRemainingMin) ? urgent.goalRemainingMin : s.evMinutesUntilReady;
            const shortfall = urgent && finiteNumber(urgent.goalShortfallW) ? Math.max(0, urgent.goalShortfallW) : 0;
            const isUrgent = (remaining !== null && remaining <= cfg.evUrgentRemainingMin) || shortfall > 500;
            this._pushSuggestion(out, {
                id: 'ev-target-planning', category: 'evcs', severity: isUrgent ? 'warning' : 'info', priority: isUrgent ? 90 : 72, icon: '🚗', title: 'EV-Zielplanung aktiv',
                text: urgent ? `${urgent.label}: Ziel ${urgent.goalTargetSocPct !== null ? `${round(urgent.goalTargetSocPct, 0)} %` : 'gesetzt'}${urgent.goalFinishTs ? ` bis ${tsToShortWindow(urgent.goalFinishTs)}` : ''}${shortfall > 0 ? `, aktuell fehlen ca. ${formatKw(shortfall)} Ladeleistung.` : '.'}` : `${formatKwh(s.evEnergyNeededKwh)} fehlen bis ${formatPct(s.evTargetSocPct || cfg.evTargetSocPct)} Ziel-SoC, bereit bis ${s.evReadyBy || cfg.evReadyBy}${remaining !== null ? ` (${formatDurationMinutes(remaining)})` : ''}.`,
                action: currentCheap || s.negativeActive ? 'Jetzt laden, solange Tarif und Peak-Reserve passen.' : 'PV- und günstige Tariffenster priorisieren; bei knapper Abfahrtszeit Ladeleistung rechtzeitig freigeben.',
                window: urgent && urgent.goalFinishTs ? tsToShortWindow(urgent.goalFinishTs) : `bis ${s.evReadyBy || cfg.evReadyBy}`, impact: 'Mobilität sicherstellen', confidence: urgent ? 82 : 70,
            });
        }

        if (s.weatherEnabled) {
            const rainyTomorrow = (finiteNumber(s.weatherTomorrowPrecipPct) && s.weatherTomorrowPrecipPct >= cfg.weatherRainRiskPct) || textContainsAny(`${s.weatherTomorrowText || ''} ${s.weatherText || ''}`, ['regen', 'schauer', 'gewitter', 'schnee', 'bedeckt']);
            const sunnyTomorrow = !rainyTomorrow && (textContainsAny(`${s.weatherTomorrowText || ''} ${s.weatherText || ''}`, ['sonnig', 'klar', 'heiter']) || (finiteNumber(s.weatherTomorrowPrecipPct) && s.weatherTomorrowPrecipPct <= 25));
            if (cfg.storageStrategyEnabled && rainyTomorrow && hasStorage) this._pushSuggestion(out, { id: 'weather-storage-reserve', category: 'weather', severity: s.storageSocPct < cfg.lowSocPct ? 'warning' : 'info', priority: s.storageSocPct < cfg.lowSocPct ? 82 : 68, icon: '🌧️', title: 'Speicherstrategie nach Wetter', text: `Wetter: ${s.weatherSummary}. Für morgen ist ein schwächeres PV-Fenster möglich.`, action: hasEvcs ? 'Speicherreserve nicht unnötig leeren; EV/Warmwasser eher in sichere Tarif- oder PV-Fenster legen.' : 'Speicherreserve nicht unnötig leeren; Warmwasser/Heizstab eher in sichere Tarif- oder PV-Fenster legen.', window: 'heute / morgen', impact: 'Reserve & Autarkie', confidence: 75 });
            if (cfg.storageStrategyEnabled && sunnyTomorrow && hasStorage) this._pushSuggestion(out, { id: 'weather-pv-headroom', category: 'weather', severity: 'success', priority: 64, icon: '☀️', title: 'PV-Headroom vorbereiten', text: `Wetter: ${s.weatherSummary}. Gutes PV-Fenster wahrscheinlich.`, action: 'Speicher nicht unnötig per Netz füllen; Platz für PV freihalten und flexible Lasten in die Sonne legen.', window: 'morgen', impact: 'Eigenverbrauch erhöhen', confidence: 72 });
            if (finiteNumber(s.weatherTomorrowMinC) && s.weatherTomorrowMinC <= 3 && hasFlexibleLoad) this._pushSuggestion(out, { id: 'weather-cold-thermal-plan', category: 'weather', severity: 'info', priority: 60, icon: '❄️', title: 'Kalte Nacht einplanen', text: `Die Prognose meldet bis ${formatTemp(s.weatherTomorrowMinC)}. Wärmelasten können später teurer oder peak-relevant werden.`, action: 'Warmwasser, Heizstab oder Wärmepumpe bevorzugt in günstige Tarif- oder PV-Fenster legen, ohne das Peak-Limit zu reißen.', window: 'nächste Nacht', impact: 'Komfort und Peak optimieren', confidence: 68 });
        }

        if (cfg.seasonLogicEnabled) {
            if (s.season === 'winter' && hasStorage) this._pushSuggestion(out, { id: 'season-winter-storage', category: 'storage', severity: 'info', priority: 55, icon: '🧊', title: 'Winterstrategie', text: 'Kürzere PV-Fenster und höhere Wärmelasten: Speicherreserve und Komfortziele höher gewichten.', action: hasEvcs ? 'Abends nicht zu aggressiv entladen und Warmwasser/EV möglichst in sichere Tarif- oder PV-Fenster legen.' : 'Abends nicht zu aggressiv entladen und Warmwasser/Heizstab möglichst in sichere Tarif- oder PV-Fenster legen.', window: 'laufend', impact: 'Reserve & Komfort', confidence: 66 });
            if (s.season === 'summer') this._pushSuggestion(out, { id: 'season-summer-pv', category: 'pv', severity: 'success', priority: 54, icon: '🌞', title: 'Sommerstrategie', text: 'Lange PV-Fenster: Eigenverbrauch und Speicher-Headroom sind besonders wertvoll.', action: hasEvcs ? 'Große Verbraucher tagsüber staffeln und Abendspitzen durch EV/Kühlung vermeiden.' : 'Große Verbraucher tagsüber staffeln und Abendspitzen durch Kühlung/Heizstab vermeiden.', window: 'tagsüber', impact: 'Eigenverbrauch & Peak', confidence: 66 });
        }

        if (s.anomalyDetected) this._pushSuggestion(out, { id: 'anomaly-detected', category: 'anomaly', severity: 'warning', priority: 87, icon: '🔎', title: 'Ungewöhnlichen Verbrauch prüfen', text: s.anomalyText, action: 'Geräteliste/SmartHome prüfen und nicht benötigte Verbraucher ausschalten oder in ein passendes Fenster verschieben.', window: 'jetzt prüfen', impact: 'Fehlverbrauch vermeiden', confidence: 74 });
        if (s.peakRiskWindow && !peakNearLimit) this._pushSuggestion(out, { id: 'peak-learning-risk', category: 'learning', severity: 'info', priority: 68, icon: '📈', title: 'Gelernte Lastspitze beachten', text: `Die Lastspitzen-Lernfunktion markiert ${s.peakRiskWindow} als typisches Peak-Risiko.`, action: `Flexible Verbraucher vorsorglich staffeln: ${priorityText(cfg.priorities, { hasEvcs })}.`, window: s.peakRiskWindow, impact: 'Peak vermeiden', confidence: 70 });
        if (cfg.forecastQualityEnabled && finiteNumber(s.forecastQualityPct) && s.forecastQualityPct < cfg.forecastQualityWarnPct) this._pushSuggestion(out, { id: 'forecast-quality-low', category: 'forecast', severity: 'info', priority: 57, icon: '🎯', title: 'Prognosequalität vorsichtig bewerten', text: `${s.forecastQualityText} Empfehlungen werden konservativer gewichtet.`, action: 'Bei niedriger Prognosequalität Speicherreserve erhöhen und harte Lastverschiebungen vermeiden.', window: 'laufend', impact: 'Risiko reduzieren', confidence: 70 });

        if (cfg.optimizationMode === 'co2' && finiteNumber(s.co2IntensityGPerKwh)) {
            const clean = s.co2IntensityGPerKwh <= cfg.co2LowGPerKwh;
            const dirty = s.co2IntensityGPerKwh >= cfg.co2HighGPerKwh;
            if (clean || dirty) this._pushSuggestion(out, { id: clean ? 'co2-clean-window' : 'co2-high-window', category: 'co2', severity: clean ? 'success' : 'info', priority: clean ? 75 : 65, icon: clean ? '🌱' : '🌫️', title: clean ? 'CO₂-günstiges Zeitfenster' : 'CO₂-intensive Netzphase', text: `Aktuelle CO₂-Intensität: ${Math.round(s.co2IntensityGPerKwh)} g/kWh.`, action: clean ? 'Flexible Lasten bevorzugen, solange Peak-Reserve bleibt.' : 'Nicht dringende Netzlasten verschieben; PV/Speicher bevorzugen.', window: 'jetzt', impact: 'CO₂-Optimierung', confidence: 72 });
        }
        if (cfg.optimizationMode === 'autarky' && s.gridExportW >= cfg.pvSurplusThresholdW) this._pushSuggestion(out, { id: 'autarky-mode-surplus', category: 'pv', severity: 'success', priority: 75, icon: '🏡', title: 'Autarkie-Modus: Überschuss nutzen', text: `${formatKw(s.gridExportW)} Einspeisung erkannt.`, action: `Eigenverbrauch erhöhen: ${pvSurplusTargets} staffeln.`, window: 'jetzt', impact: 'Autarkie erhöhen', confidence: 78 });
        if (cfg.optimizationMode === 'peak' && peakReferenceLimitW) this._pushSuggestion(out, { id: 'peak-mode-reserve', category: 'peak', severity: peakNearLimit ? 'warning' : 'info', priority: peakNearLimit ? 90 : 56, icon: '🛡️', title: 'Peak-Schutz-Modus', text: `Netzanschluss-Auslastung aktuell ${formatPct(peakUsagePct || 0)}.`, action: `Lasten konsequent nach Priorität staffeln: ${priorityText(cfg.priorities, { hasEvcs })}.`, window: 'laufend', impact: 'Lastspitzen vermeiden', confidence: 72 });

        if (s.negativeActive || s.gridImportPreferred) this._pushSuggestion(out, { id: 'negative-price-window', category: 'tariff', severity: 'success', priority: 88, icon: '€', title: s.negativeActive ? 'Negativpreis-Fenster nutzen' : 'Günstiges Netzladefenster', text: s.negativeActive ? 'Der aktuelle Strompreis ist negativ bzw. sehr günstig.' : 'Der Tarif bevorzugt aktuell Netzbezug.', action: `Flexible Lasten jetzt nutzen${hasStorage ? ', Speicherladung prüfen' : ''}, solange Peak-Reserve bleibt.`, window: 'jetzt', impact: 'Kosten senken', confidence: 86 });
        else if (currentExpensive && hasFlexibleLoad) this._pushSuggestion(out, { id: 'expensive-price-avoid-loads', category: 'tariff', severity: 'warning', priority: 74, icon: '💸', title: 'Teures Tarif-Fenster', text: finiteNumber(s.priceNow) ? `Aktueller Preis ${formatPrice(s.priceNow)} liegt über dem Vergleichswert.` : 'Der aktuelle Tarifzustand ist teuer.', action: `${flexibleConsumerLabel} verschieben oder reduzieren, wenn Komfortziele es erlauben.`, window: 'jetzt', impact: 'Kosten vermeiden', confidence: 78 });
        if (s.nextCheapFrom && !currentCheap) this._pushSuggestion(out, { id: 'next-cheap-window', category: 'tariff', severity: 'info', priority: 62, icon: '⏱️', title: 'Nächstes günstiges Zeitfenster', text: `Günstiges Tarif-Fenster: ${shortIsoWindow(s.nextCheapFrom, s.nextCheapTo) || s.nextCheapFrom}.`, action: hasEvcs ? 'Planbare Lasten bis dahin zurückstellen, sofern Komfort und EV-Zielzeiten passen.' : 'Planbare Lasten bis dahin zurückstellen, sofern Komfortziele passen.', window: shortIsoWindow(s.nextCheapFrom, s.nextCheapTo), impact: 'Kosten optimieren', confidence: 72 });
        if (s.gridExportW >= cfg.pvSurplusThresholdW) this._pushSuggestion(out, { id: 'pv-surplus-use', category: 'pv', severity: 'success', priority: 82, icon: '☀️', title: 'PV-Überschuss verfügbar', text: `Aktuell werden etwa ${formatKw(s.gridExportW)} eingespeist.`, action: `${pvSurplusTargets} einschalten bzw. erhöhen, solange kein Peak-Risiko besteht.`, window: 'jetzt', impact: 'Eigenverbrauch erhöhen', confidence: 82 });
        if (s.pvForecastUsable && (s.pvKwh24 >= cfg.pvForecastMinKwh || s.pvPeak24W >= cfg.pvPeakMinW)) this._pushSuggestion(out, { id: 'pv-forecast-plan', category: 'forecast', severity: 'info', priority: 66, icon: '🔮', title: 'PV-Prognose einplanen', text: `${formatKwh(s.pvKwh24)} PV-Ertrag in den nächsten 24h erwartet, Peak ca. ${formatKw(s.pvPeak24W)}.`, action: hasStorage ? 'Speicher-Headroom für PV freihalten und flexible Lasten in das Sonnenfenster legen.' : 'Flexible Lasten in das Sonnenfenster legen.', window: 'nächste 24h', impact: 'Autarkie erhöhen', confidence: 75 });
        if (hasStorage && s.storageSocPct <= cfg.lowSocPct) this._pushSuggestion(out, { id: 'storage-low-reserve', category: 'storage', severity: 'warning', priority: 78, icon: '🔋', title: 'Speicherreserve niedrig', text: `Der Speicher liegt bei ${round(s.storageSocPct, 0)} %.`, action: 'Reservegrenze prüfen; flexible Lasten eher in PV- oder günstige Tariffenster verschieben.', window: 'bis Reserve erholt ist', impact: 'Reserve schützen', confidence: 80 });
        if (s.gridImportW >= cfg.highImportThresholdW && !currentCheap && !s.negativeActive && !peakNearLimit && !s.peakActive && !(s.peakOverW > 0)) this._pushSuggestion(out, { id: 'high-grid-import', category: 'grid', severity: 'warning', priority: 70, icon: '📉', title: 'Hoher Netzbezug erkannt', text: `Aktuell werden etwa ${formatKw(s.gridImportW)} aus dem Netz bezogen.`, action: 'Nicht dringende Verbraucher verschieben; bei Speicher prüfen, ob Entladen freigegeben ist.', window: 'jetzt', impact: 'Netzbezug senken', confidence: 72 });
        if (s.para14aActive) this._pushSuggestion(out, { id: 'para14a-active', category: 'grid', severity: 'warning', priority: 84, icon: '🚦', title: '§14a-Leistungsbegrenzung aktiv', text: 'Der Netzbetreiber-/EMS-Deckel für steuerbare Verbraucher ist aktiv.', action: 'Komfortverbraucher priorisieren und nicht notwendige Verbraucher verschieben.', window: 'jetzt', impact: 'Netzvorgabe einhalten', confidence: 85 });
        if (cfg.comfortHintsEnabled && s.quietActive && (evLoadW + s.thermalUsedW + s.heatingRodUsedW) > 500 && cfg.optimizationMode !== 'comfort') this._pushSuggestion(out, { id: 'comfort-quiet-hours-flex-load', category: 'comfort', severity: 'info', priority: 63, icon: '🌙', title: 'Ruhezeit: flexible Lasten prüfen', text: `Im Ruhefenster ${s.quietWindow} laufen flexible Verbraucher mit etwa ${formatKw(evLoadW + s.thermalUsedW + s.heatingRodUsedW)}.`, action: 'Nur laufen lassen, wenn Komfortziel, Abfahrtszeit oder günstiger Tarif wichtiger ist; sonst in PV-/Tariffenster verschieben.', window: 'jetzt', impact: 'Komfort / Geräusch / Peak', confidence: 70 });
        if (cfg.includeInstallerHints && !configuredGridLimitW) this._pushSuggestion(out, { id: 'setup-grid-connection-limit', category: 'setup', severity: 'info', priority: 32, icon: '🔌', title: 'Netzanschlussleistung hinterlegen', text: 'Für korrekte Peak-Shaving-Vorwarnungen fehlt die konfigurierte Netzanschlussleistung.', action: 'Im Installer die Netzanschlussleistung eintragen, z. B. 30000 W für einen 30-kW-Anschluss.', window: 'Setup', impact: 'Peak-Beratung verbessern', confidence: 72 });
        if (cfg.includeInstallerHints && !s.tariffActive && !finiteNumber(s.priceNow)) this._pushSuggestion(out, { id: 'setup-tariff', category: 'setup', severity: 'info', priority: 30, icon: '🧭', title: 'Dynamischen Tarif anbinden', text: 'Für bessere Zeitvorschläge fehlt aktuell ein frisches Preis-/Tarifsignal.', action: 'Im App-Center Tarife/Preisprognose zuordnen.', window: 'Setup', impact: 'KI-Beratung verbessern', confidence: 70 });
        if (cfg.includeInstallerHints && !s.pvForecastUsable) this._pushSuggestion(out, { id: 'setup-pv-forecast', category: 'setup', severity: 'info', priority: 28, icon: '☀️', title: 'PV-Forecast aktivieren', text: 'Für vorausschauende Empfehlungen fehlt eine nutzbare PV-Prognose.', action: 'PV-Forecast im App-Center einrichten, damit Verbraucher zeitlich besser geplant werden können.', window: 'Setup', impact: 'Prognosequalität erhöhen', confidence: 70 });

        const seen = new Set();
        const deduped = [];
        for (const s0 of out.sort((a, b) => (b.rankWeight - a.rankWeight) || (b.priority - a.priority))) {
            if (seen.has(s0.id)) continue;
            seen.add(s0.id);
            const clean = Object.assign({}, s0);
            delete clean.rankWeight;
            deduped.push(clean);
        }
        const minPriorityMap = { info: 0, warning: 60, action: 75, critical: 90 };
        const minPrio = minPriorityMap[cfg.minPriority] || 0;
        /**
         * Code-Teil: Arrow-Funktion `categoryAllowed`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: categoryAllowed
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const categoryAllowed = (item) => {
            const cat = String(item && item.category || 'system').toLowerCase();
            const cats = cfg.categories || {};
            if (cat === 'tariff') return cats.tariff !== false;
            if (cat === 'pv' || cat === 'forecast') return cats.pv !== false;
            if (cat === 'storage') return cats.storage !== false;
            if (cat === 'evcs') return cats.evcs !== false;
            if (cat === 'peak') return cats.peak !== false;
            if (cat === 'weather') return cats.weather !== false;
            if (cat === 'heating' || cat === 'thermal') return cats.heating !== false;
            if (cat === 'dailyplan' || cat === 'daily-plan' || cat === 'plan') return cats.dailyPlan !== false && cats.plan !== false;
            if (cat === 'anomaly') return cats.anomaly !== false;
            if (cat === 'comfort') return cats.comfort !== false;
            if (cat === 'learning') return cats.learning !== false;
            if (cat === 'co2' || cat === 'co₂') return cats.co2 !== false;
            if (cat === 'grid' || cat === 'setup' || cat === 'system' || cat === 'general') return cats.system !== false;
            return true;
        };
        let filtered = deduped.filter((item) => categoryAllowed(item) && (Number(item.priority) || 0) >= minPrio);
        if (!filtered.length) {
            this._pushSuggestion(filtered, { id: 'system-balanced', category: 'system', severity: 'success', priority: 20, icon: '✅', title: 'System läuft wirtschaftlich unauffällig', text: 'Aktuell erkennt der KI-Energieberater keine dringende Optimierung.', action: 'Weiter beobachten; größere Verbraucher möglichst in PV- oder günstige Tariffenster legen.', window: 'laufend', impact: 'Monitoring', confidence: 65 });
            filtered = filtered.filter((item) => categoryAllowed(item));
        }
        return filtered.slice(0, cfg.maxSuggestions);
    }

    /**
     * Code-Teil: Methode `_score`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _score
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _score(snapshot, suggestions) {
        let score = 72;
        if (suggestions && suggestions.length) score -= Math.min(22, suggestions.reduce((sum, it) => sum + (it.severity === 'critical' ? 8 : it.severity === 'warning' ? 5 : 2), 0));
        if (snapshot.gridExportW > 1000) score += 3;
        const peakBase = finiteNumber(snapshot.gridConnectionLimitW) && snapshot.gridConnectionLimitW > 0 ? snapshot.gridConnectionLimitW : snapshot.peakLimitW;
        if (peakBase && snapshot.gridImportW >= peakBase) score -= 20;
        else if (peakBase && snapshot.gridImportW >= peakBase * 0.9) score -= 12;
        if (snapshot.pvForecastUsable) score += 4;
        if (snapshot.weatherEnabled) score += 2;
        if (snapshot.tariffActive || finiteNumber(snapshot.priceNow)) score += 4;
        if (snapshot.storageSocPct !== null && snapshot.storageSocPct < 15) score -= 8;
        if (snapshot.anomalyDetected) score -= 10;
        if (finiteNumber(snapshot.forecastQualityPct) && snapshot.forecastQualityPct < 50) score -= 4;
        return clamp(Math.round(score), 0, 100);
    }

    /**
     * Code-Teil: Methode `_set`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _set
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _set(localId, value) {
        try { await this.adapter.setStateAsync(localId, { val: value, ack: true }); } catch (_e) {}
        try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue(localId, value, Date.now()); } catch (_e2) {}
    }
    /**
     * Code-Teil: _publishDisabled
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _publishDisabled(cfg, now) {
        if ((now - (this._lastDisabledWriteMs || 0)) < 60000) return;
        this._lastDisabledWriteMs = now;
        const disabledByCustomer = cfg.customerEnabled === false;
        await this._set('aiAdvisor.enabled', false);
        await this._set('aiAdvisor.advisoryOnly', true);
        await this._set('aiAdvisor.showInLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.showOnLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.status', 'disabled');
        await this._set('aiAdvisor.severity', 'neutral');
        await this._set('aiAdvisor.headline', 'KI-Energieberater deaktiviert');
        await this._set('aiAdvisor.summary', disabledByCustomer ? 'Die beratende KI ist in den Kundeneinstellungen deaktiviert.' : 'Die beratende KI ist im App-Center deaktiviert.');
        await this._set('aiAdvisor.count', 0);
        await this._set('aiAdvisor.score', 0);
        await this._set('aiAdvisor.peakUsagePct', 0);
        await this._set('aiAdvisor.peakStateText', '');
        await this._set('aiAdvisor.gridConnectionLimitW', 0);
        await this._set('aiAdvisor.peakWarnThresholdW', 0);
        await this._set('aiAdvisor.weatherSummary', '');
        await this._set('aiAdvisor.storageSocPct', 0);
        await this._set('aiAdvisor.storageSocSource', '');
        await this._set('aiAdvisor.dailyPlanText', '');
        await this._set('aiAdvisor.dailyPlanJson', '[]');
        await this._set('aiAdvisor.evPlanText', '');
        await this._set('aiAdvisor.optimizationMode', cfg.optimizationMode || 'balanced');
        await this._set('aiAdvisor.comfortWindowSummary', '');
        await this._set('aiAdvisor.season', seasonFromDate(new Date()));
        await this._set('aiAdvisor.anomalyText', '');
        await this._set('aiAdvisor.forecastQualityPct', 0);
        await this._set('aiAdvisor.forecastQualityText', '');
        await this._set('aiAdvisor.peakLearningText', '');
        await this._set('aiAdvisor.peakLearningJson', '[]');
        await this._set('aiAdvisor.topTitle', '');
        await this._set('aiAdvisor.topText', '');
        await this._set('aiAdvisor.topAction', '');
        await this._set('aiAdvisor.topWindow', '');
        await this._set('aiAdvisor.topCategory', '');
        await this._set('aiAdvisor.suggestionsJson', '[]');
        await this._set('aiAdvisor.snapshotJson', JSON.stringify({ ts: now, enabled: false }));
        await this._set('aiAdvisor.lastUpdate', now);
        await this._set('aiAdvisor.nextUpdate', now + 60000);
        for (let i = 1; i <= 8; i++) {
            await this._set(`aiAdvisor.suggestions.${i}.title`, '');
            await this._set(`aiAdvisor.suggestions.${i}.text`, '');
            await this._set(`aiAdvisor.suggestions.${i}.action`, '');
            await this._set(`aiAdvisor.suggestions.${i}.severity`, '');
            await this._set(`aiAdvisor.suggestions.${i}.category`, '');
            await this._set(`aiAdvisor.suggestions.${i}.window`, '');
            await this._set(`aiAdvisor.suggestions.${i}.impact`, '');
        }
    }

    /**
     * Code-Teil: Methode `_publish`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _publish
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _publish(snapshot, suggestions, cfg) {
        const now = Date.now();
        const jsScore = this._score(snapshot, suggestions);
        let normalizedSuggestions = Array.isArray(suggestions) ? suggestions : [];
        let aiPayload = null;
        try {
            if (aiAdvisorPayloadTsMirror && typeof aiAdvisorPayloadTsMirror.buildAiAdvisorPublishPayload === 'function') {
                aiPayload = aiAdvisorPayloadTsMirror.buildAiAdvisorPublishPayload({
                    suggestions: normalizedSuggestions,
                    score: jsScore,
                    showInLive: cfg.showInLive,
                    dailyPlanText: snapshot.dayPlan && snapshot.dayPlan.text || '',
                    learning: this._lastLearning || {},
                    maxSuggestions: 8,
                });
                if (aiPayload && aiPayload.ok && Array.isArray(aiPayload.suggestions)) {
                    normalizedSuggestions = aiPayload.suggestions;
                }
            }
        } catch (e) {
            aiPayload = { ok: false, source: 'js-fallback', error: e && e.message ? e.message : String(e) };
            try { this.adapter && this.adapter.log && this.adapter.log.warn && this.adapter.log.warn('[ai-advisor-ts-payload] Fallback auf JS-Payload: ' + aiPayload.error); } catch (_eLog) {}
        }
        suggestions = normalizedSuggestions;
        const top = aiPayload && aiPayload.top ? aiPayload.top : (suggestions && suggestions.length ? suggestions[0] : null);
        const score = aiPayload && Number.isFinite(Number(aiPayload.score)) ? Number(aiPayload.score) : jsScore;
        const severity = aiPayload && aiPayload.severity ? String(aiPayload.severity) : (top ? String(top.severity || 'info') : 'neutral');
        const headline = aiPayload && aiPayload.headline ? String(aiPayload.headline) : (top ? `${top.icon || '💡'} ${top.title}` : 'KI-Energieberater bereit');
        const summary = aiPayload && aiPayload.summary ? String(aiPayload.summary) : (top ? String(top.text || '') : 'Keine aktuellen Hinweise.');
        const jsonSuggestions = aiPayload && aiPayload.suggestionsJson ? String(aiPayload.suggestionsJson) : safeJson(suggestions || [], '[]');
        const peakReferenceLimitW = (finiteNumber(snapshot.gridConnectionLimitW) && snapshot.gridConnectionLimitW > 0)
            ? snapshot.gridConnectionLimitW
            : ((finiteNumber(snapshot.peakLimitW) && snapshot.peakLimitW > 0) ? snapshot.peakLimitW : ((finiteNumber(snapshot.gridImportLimitEffectiveW) && snapshot.gridImportLimitEffectiveW > 0) ? snapshot.gridImportLimitEffectiveW : null));
        const peakUsagePct = peakReferenceLimitW ? (snapshot.gridImportW / peakReferenceLimitW * 100) : 0;
        const peakWarnThresholdW = peakReferenceLimitW ? (peakReferenceLimitW * ((cfg.peakNearLimitPct || 90) / 100)) : 0;
        const peakStateText = buildPeakStateText(snapshot, peakReferenceLimitW, peakUsagePct);
        const weatherSummary = buildWeatherSummary(snapshot);
        const dailyPlan = snapshot.dayPlan || { mode: cfg.optimizationMode, modeLabel: optimizationModeLabel(cfg.optimizationMode), items: [], text: '' };
        const evPlanText = (snapshot.evcsAvailable && snapshot.evConnectedCount > 0)
            ? (finiteNumber(snapshot.evEnergyNeededKwh) && snapshot.evEnergyNeededKwh > 1
                ? `${formatKwh(snapshot.evEnergyNeededKwh)} bis ${formatPct(snapshot.evTargetSocPct || cfg.evTargetSocPct)} Ziel-SoC nachladen · bereit bis ${snapshot.evReadyBy || cfg.evReadyBy}.`
                : `Fahrzeug verbunden · Ziel-SoC ${formatPct(snapshot.evTargetSocPct || cfg.evTargetSocPct)} · bereit bis ${snapshot.evReadyBy || cfg.evReadyBy}.`)
            : 'Kein verbundenes Fahrzeug erkannt.';
        const comfortWindowSummary = `${cfg.comfortStart || '06:00'}–${cfg.comfortEnd || '22:00'} · Ruhezeit ${cfg.quietHoursStart || '22:00'}–${cfg.quietHoursEnd || '06:00'}`;
        const learning = this._lastLearning || {};
        const snap = {
            ts: now,
            enabled: true,
            advisoryOnly: true,
            showInLive: cfg.showInLive !== false,
            status: 'ok',
            score,
            peakUsagePct,
            peakStateText,
            weatherSummary,
            dailyPlan,
            evPlanText,
            comfortWindowSummary,
            learning,
            severity,
            top,
            suggestions,
            raw: snapshot,
            tsPayload: aiPayload ? { source: aiPayload.source || 'unknown', ok: aiPayload.ok !== false, count: aiPayload.count || 0, fallback: aiPayload.ok === false } : { source: 'js-fallback', ok: false },
        };
        const hash = makeHash(aiPayload && aiPayload.hashPayload ? aiPayload.hashPayload : { suggestions, score, severity, show: cfg.showInLive, plan: dailyPlan.text || '', anomaly: learning.anomalyText || '', forecastQuality: learning.forecastQualityPct });
        const contentChanged = hash !== this._lastHash;
        this._lastHash = hash;

        await this._set('aiAdvisor.enabled', true);
        await this._set('aiAdvisor.advisoryOnly', true);
        await this._set('aiAdvisor.showInLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.showOnLive', cfg.showInLive !== false);
        await this._set('aiAdvisor.status', 'ok');
        await this._set('aiAdvisor.severity', severity);
        await this._set('aiAdvisor.headline', headline);
        await this._set('aiAdvisor.summary', summary);
        await this._set('aiAdvisor.count', aiPayload && Number.isFinite(Number(aiPayload.count)) ? Number(aiPayload.count) : (Array.isArray(suggestions) ? suggestions.length : 0));
        await this._set('aiAdvisor.score', score);
        await this._set('aiAdvisor.peakUsagePct', round(peakUsagePct, 1) || 0);
        await this._set('aiAdvisor.peakStateText', peakStateText);
        await this._set('aiAdvisor.gridConnectionLimitW', peakReferenceLimitW || 0);
        await this._set('aiAdvisor.peakWarnThresholdW', round(peakWarnThresholdW, 0) || 0);
        await this._set('aiAdvisor.weatherSummary', weatherSummary);
        await this._set('aiAdvisor.storageSocPct', round(snapshot.storageSocPct, 1) || 0);
        await this._set('aiAdvisor.storageSocSource', snapshot.storageSocSource || '');
        await this._set('aiAdvisor.dailyPlanText', dailyPlan.text || '');
        await this._set('aiAdvisor.dailyPlanJson', safeJson(dailyPlan.items || [], '[]'));
        await this._set('aiAdvisor.evPlanText', evPlanText);
        await this._set('aiAdvisor.optimizationMode', cfg.optimizationMode || 'balanced');
        await this._set('aiAdvisor.comfortWindowSummary', comfortWindowSummary);
        await this._set('aiAdvisor.season', snapshot.season || seasonFromDate(new Date()));
        await this._set('aiAdvisor.anomalyText', snapshot.anomalyText || '');
        await this._set('aiAdvisor.forecastQualityPct', round(snapshot.forecastQualityPct, 1) || 0);
        await this._set('aiAdvisor.forecastQualityText', snapshot.forecastQualityText || '');
        await this._set('aiAdvisor.peakLearningText', learning.peakLearningText || '');
        await this._set('aiAdvisor.peakLearningJson', snapshot.peakLearningJson || '[]');
        await this._set('aiAdvisor.topTitle', top ? top.title : '');
        await this._set('aiAdvisor.topText', top ? top.text : '');
        await this._set('aiAdvisor.topAction', top ? top.action : '');
        await this._set('aiAdvisor.topWindow', top ? top.window : '');
        await this._set('aiAdvisor.topCategory', top ? top.category : '');
        if (contentChanged) {
            await this._set('aiAdvisor.suggestionsJson', jsonSuggestions);
            await this._set('aiAdvisor.snapshotJson', JSON.stringify(snap));
        } else {
            try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue('aiAdvisor.suggestionsJson', jsonSuggestions, now); } catch (_e) {}
            try { if (typeof this.adapter.updateValue === 'function') this.adapter.updateValue('aiAdvisor.snapshotJson', JSON.stringify(snap), now); } catch (_e) {}
        }
        await this._set('aiAdvisor.lastUpdate', now);
        await this._set('aiAdvisor.nextUpdate', now + Math.round(cfg.minIntervalSec * 1000));

        for (let i = 1; i <= 8; i++) {
            const s0 = (Array.isArray(suggestions) && suggestions[i - 1]) ? suggestions[i - 1] : null;
            await this._set(`aiAdvisor.suggestions.${i}.title`, s0 ? s0.title : '');
            await this._set(`aiAdvisor.suggestions.${i}.text`, s0 ? s0.text : '');
            await this._set(`aiAdvisor.suggestions.${i}.action`, s0 ? s0.action : '');
            await this._set(`aiAdvisor.suggestions.${i}.severity`, s0 ? s0.severity : '');
            await this._set(`aiAdvisor.suggestions.${i}.category`, s0 ? s0.category : '');
            await this._set(`aiAdvisor.suggestions.${i}.window`, s0 ? s0.window : '');
            await this._set(`aiAdvisor.suggestions.${i}.impact`, s0 ? s0.impact : '');
        }
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        if (!this._inited) await this.init();
        const cfg = this._cfg();
        const now = Date.now();
        if (!cfg.enabled) {
            await this._publishDisabled(cfg, now);
            return;
        }
        const minMs = Math.max(10000, Math.round(cfg.minIntervalSec * 1000));
        if (this._lastRunMs && (now - this._lastRunMs) < minMs) return;
        this._lastRunMs = now;
        let snapshot = await this._snapshot();
        snapshot = this._updateLearning(snapshot, cfg);
        snapshot.dayPlan = this._makeDailyPlan(snapshot, cfg);
        this._lastPlan = snapshot.dayPlan;
        const suggestions = this._buildSuggestions(snapshot, cfg);
        await this._publish(snapshot, suggestions, cfg);
    }
}

module.exports = { AiAdvisorModule };
