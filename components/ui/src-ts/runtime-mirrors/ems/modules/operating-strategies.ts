// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/operating-strategies.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/operating-strategies.js
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
 * Original-Hash: d46acc43bd97690bb51095d5263c8cbd71ae0e6e93dfb7c50ae14cb77534f3d0
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
 * Quelle: src-ts/runtime-executables/ems/modules/operating-strategies.ts
 * Quell-Hash: sha256:d78b7c1fd23ee84b6e6642c3874235a0326c4df8f164e907ac47c0c04db539a3
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/operating-strategies.js.
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
 * Aufgabe: Verbindet gespeicherte Betriebsstrategien mit den zur Laufzeit wirksamen Anforderungen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/operating-strategies.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/operating-strategies.js
 *
 * Die Betriebsstrategien-Engine ist ein reiner Planer. Sie schreibt niemals
 * direkt auf Hardware-Datenpunkte, sondern erzeugt pro Ressource genau eine
 * priorisierte, zeitlich begrenzte Anforderung. Die bestehenden Fachmodule
 * bleiben die einzigen Hardware-Writer und wenden weiterhin §14a, Parkregler,
 * Anschluss-, Stations-, Geräte- und Kommunikationsgrenzen an.
 */
'use strict';

const { BaseModule } = require('./base');
const {
    isLinkLiveEligible,
    operatingStrategiesAppActive,
    isOperatingStrategiesLiveConfig,
} = require('../services/operating-strategy-runtime');

const REQUIREMENT_ORDER = { must: 0, should: 1, can: 2 };
const SUPPORTED_LIVE_PREFIXES = ['evcs:', 'thermal:', 'heatingRod:', 'storage:', 'storagefarm:'];

/**
 * Code-Teil: record
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function record(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * Code-Teil: list
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function list(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function text(value, fallback = '') {
    const normalized = String(value === null || value === undefined ? '' : value).trim();
    return normalized || fallback;
}

/**
 * Code-Teil: num
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Code-Teil: nullableNumber
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(value, minValue, maxValue) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return minValue;
    return Math.max(minValue, Math.min(maxValue, parsed));
}

/**
 * Code-Teil: safeId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function safeId(value) {
    return text(value).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'resource';
}

/**
 * Code-Teil: safeWallboxKey
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function safeWallboxKey(value) {
    return text(value).replace(/[^a-zA-Z0-9_-]/g, '_') || 'lp';
}

/**
 * Code-Teil: toBool
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function toBool(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = text(value).toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'active', 'online', 'enabled', 'ready'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no', 'nein', 'inactive', 'offline', 'disabled', 'fault'].includes(normalized)) return false;
    return fallback;
}

/**
 * Code-Teil: timeMinutes
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function timeMinutes(value, fallback = 0) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text(value));
    if (!match) return fallback;
    return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Code-Teil: isInTimeWindow
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isInTimeWindow(current, start, end) {
    if (start === end) return true;
    return start < end ? current >= start && current < end : current >= start || current < end;
}

/**
 * Code-Teil: weekdayKey
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function weekdayKey(date) {
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()] || '';
}

/**
 * Code-Teil: compare
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function compare(actual, operator, expected) {
    if (operator === 'eq') return String(actual) === String(expected);
    if (operator === 'neq') return String(actual) !== String(expected);
    const left = Number(actual);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === 'lt') return left < right;
    if (operator === 'lte') return left <= right;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    return false;
}

/**
 * Code-Teil: minutesUntilDeadline
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function minutesUntilDeadline(now, dueTime, dueDay) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text(dueTime));
    if (!match) return null;
    const due = new Date(now.getTime());
    due.setSeconds(0, 0);
    due.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (dueDay === 'next-day') due.setDate(due.getDate() + 1);
    else if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
    return Math.max(0, Math.round((due.getTime() - now.getTime()) / 60000));
}

/**
 * Code-Teil: minutesUntilTime
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function minutesUntilTime(now, targetTime) {
    const target = timeMinutes(targetTime, -1);
    if (target < 0) return null;
    const current = now.getHours() * 60 + now.getMinutes();
    const delta = (target - current + 1440) % 1440;
    return delta === 0 ? 1440 : delta;
}

/**
 * Code-Teil: appActive
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function appActive(config, appId, enableFlag = '') {
    const app = record(record(record(config.emsApps).apps)[appId]);
    if (app.installed !== true || app.enabled !== true) return false;
    if (enableFlag && config[enableFlag] !== true) return false;
    return true;
}

/**
 * Code-Teil: countMappedValues
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function countMappedValues(values) {
    return list(values).filter((entry) => text(entry)).length;
}

/**
 * Code-Teil: mappedValuesFromKeys
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mappedValuesFromKeys(source, keys) {
    const row = record(source);
    return list(keys).map((key) => row[key]);
}

const EVCS_READ_KEYS = [
    'powerId', 'actualPowerWId', 'energyTotalId', 'energySessionId', 'statusId',
    'activeId', 'vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'onlineId',
    'vehicleSocId', 'phaseFeedbackId',
];
const EVCS_WRITE_KEYS = [
    'setCurrentAId', 'setPowerWId', 'enableWriteId', 'lockWriteId', 'phaseSwitchId',
];
const FARM_READ_KEYS = [
    'socId', 'signedPowerId', 'chargePowerId', 'dischargePowerId', 'gridPowerId',
    'pvPowerId', 'availableId', 'faultId', 'chargeAllowedId', 'dischargeAllowedId',
];
const FARM_WRITE_KEYS = [
    'feneconGridSetpointId', 'setSignedPowerId', 'setChargePowerId',
    'setDischargePowerId', 'maxChargePowerId', 'maxDischargePowerId',
    'chargeEnableId', 'dischargeEnableId', 'runWriteId',
];

/**
 * Code-Teil: OperatingStrategiesModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class OperatingStrategiesModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._stateCache = new Map();
        this._activity = new Map();
        this._registeredMappings = new Map();
        this._thermalLatches = new Map();
        this._latchesDirty = false;
    }

    _cfg() {
        return record(this.adapter && this.adapter.config && this.adapter.config.operatingStrategies);
    }

    async _setStateIfChanged(id, value) {
        const normalized = typeof value === 'number' && !Number.isFinite(value) ? null : value;
        if (this._stateCache.get(id) === normalized) return;
        this._stateCache.set(id, normalized); if (this._stateCache.size > 1000) { const __rc85Oldest = this._stateCache.keys().next().value; if (__rc85Oldest !== undefined) this._stateCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
        await this.adapter.setStateAsync(id, normalized, true);
        try { this.adapter.updateValue?.(id, normalized, Date.now()); } catch (_error) {}
    }

    async init() {
        await this.adapter.setObjectNotExistsAsync('operatingStrategies', {
            type: 'channel',
            common: { name: 'Betriebsstrategien' },
            native: {},
        });
        await this.adapter.setObjectNotExistsAsync('operatingStrategies.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });
/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const mk = async (id, name, type = 'string', role = 'text', unit = '') => {
            const common = { name, type, role, read: true, write: false };
            if (unit) common.unit = unit;
            await this.adapter.setObjectNotExistsAsync(`operatingStrategies.summary.${id}`, {
                type: 'state',
                common,
                native: {},
            });
        };
        await mk('appEnabled', 'App aktiviert', 'boolean', 'indicator');
        await mk('mode', 'Betriebsmodus', 'string', 'text');
        await mk('activeControl', 'Live-Steueranforderungen aktiv', 'boolean', 'indicator');
        await mk('controlReason', 'Freigabe-/Sperrgrund', 'string', 'text');
        await mk('activeProfileId', 'Aktives Profil', 'string', 'text');
        await mk('resourceCount', 'Aktive Ressourcen', 'number', 'value');
        await mk('decisionCount', 'Entscheidungen', 'number', 'value');
        await mk('selectedCount', 'Ausgewählte Anforderungen', 'number', 'value');
        await mk('blockedCount', 'Blockierte Regeln', 'number', 'value');
        await mk('lastUpdate', 'Letzte Auswertung', 'number', 'value.time');
        await mk('hardwareWrites', 'Direkte Hardware-Schreibvorgänge', 'number', 'value');
        await mk('status', 'Status', 'string', 'text');
        await mk('requestsJson', 'Aktive Anforderungen (JSON)', 'string', 'json');
        await mk('decisionsJson', 'Entscheidungen (JSON)', 'string', 'json');
        await mk('resourcesJson', 'Ressourcenstatus (JSON)', 'string', 'json');
        await mk('thermalLatchesJson', 'Thermische Strategie-Latches (JSON)', 'string', 'json');

        // Eine um 19:00 Uhr gestartete Kühlhauspause muss einen Adapter-Neustart
        // überstehen. Es werden ausschließlich Planungszustände restauriert; keine
        // Hardware-Sollwerte werden hier geschrieben.
        try {
            const state = await this.adapter.getStateAsync('operatingStrategies.summary.thermalLatchesJson');
            const parsed = state && state.val ? JSON.parse(String(state.val)) : {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const now = Date.now();
                for (const [key, value] of Object.entries(parsed)) {
                    if (!value || typeof value !== 'object') continue;
                    const releaseAt = num(value.releaseAt, 0);
                    const releaseUntil = num(value.releaseUntil, 0);
                    if (Math.max(releaseAt, releaseUntil) > now - 24 * 60 * 60 * 1000) {
                        this._thermalLatches.set(key, value);
                    }
                }
            }
        } catch (_error) {
            this._thermalLatches.clear();
        }
    }

    async deactivate() {
        const runtime = {
            version: 3,
            ts: Date.now(),
            appEnabled: false,
            activeControl: false,
            controlReason: 'module-deactivated',
            requestsByResource: {},
            storageOverlaysByResource: {},
            decisionsByResource: {},
            resourceAliases: {},
        };
        this.adapter._nwOperatingStrategiesRuntime = runtime;
        this.adapter._nwOperatingStrategyRuntime = runtime;
        await this._setStateIfChanged('operatingStrategies.summary.activeControl', false);
        await this._setStateIfChanged('operatingStrategies.summary.status', 'deactivated');
        await this._setStateIfChanged('operatingStrategies.summary.requestsJson', '{}');
    }

    _deriveResources(config) {
        const resources = [];
        const aliases = {};

        if (appActive(config, 'storagefarm', 'enableStorageFarm')) {
            const rows = list(record(config.storageFarm).storages);
            rows.forEach((row, index) => {
                const dpCount = countMappedValues([
                    ...mappedValuesFromKeys(row, FARM_READ_KEYS),
                    ...mappedValuesFromKeys(row, FARM_WRITE_KEYS),
                ]);
                if (row && row.enabled === true && dpCount > 0) {
                    const sourceId = `storagefarm:${index + 1}`;
                    resources.push({
                        sourceId,
                        nativeType: 'storage',
                        resourceType: 'storage',
                        name: text(row.name, `Speicher ${index + 1}`),
                        usableCapacityKWh: num(row.usableCapacityKWh ?? row.capacityKWh, 0),
                        efficiencyPct: clamp(row.efficiencyPct ?? 92, 1, 100),
                        maxPowerW: Math.max(0, num(row.maxChargePowerW ?? row.maxPowerW, 0)),
                        configIndex: index,
                        runtimeId: `farm${index + 1}`,
                        nativeMappings: {
                            socReadId: text(row.socId),
                            powerReadId: text(row.signedPowerId || row.chargePowerId || row.dischargePowerId),
                            onlineReadId: text(row.availableId),
                            alarmReadId: text(row.faultId),
                            capacityReadId: text(row.capacityReadId),
                        },
                    });
                    aliases[sourceId] = sourceId;
                }
            });
        } else if (appActive(config, 'storage', 'enableStorageControl')) {
            const storage = record(config.storage);
            const storageDps = record(storage.datapoints);
            const globalDps = record(config.datapoints);
            const mappedCount = countMappedValues([
                storageDps.socObjectId, storageDps.powerObjectId,
                storageDps.chargePowerObjectId, storageDps.dischargePowerObjectId,
                storageDps.targetPowerObjectId, storageDps.maxChargeObjectId,
                storageDps.maxDischargeObjectId, storageDps.chargeEnableObjectId,
                storageDps.dischargeEnableObjectId, storageDps.runObjectId,
                globalDps.storageSoc, globalDps.storagePower,
                globalDps.storageChargePower, globalDps.storageDischargePower,
            ]);
            if (storage.enabled !== false && mappedCount > 0) {
                resources.push({
                    sourceId: 'storage:primary',
                    nativeType: 'storage',
                    resourceType: 'storage',
                    name: text(storage.name, 'Speicher'),
                    usableCapacityKWh: num(storage.usableCapacityKWh ?? storage.capacityKWh, 0),
                    efficiencyPct: clamp(storage.efficiencyPct ?? 92, 1, 100),
                    maxPowerW: Math.max(0, num(storage.maxChargeW ?? storage.ratedPowerW, 0)),
                    configIndex: 0,
                    runtimeId: 'primary',
                    nativeMappings: {
                        socReadId: text(storageDps.socObjectId || globalDps.storageSoc),
                        powerReadId: text(storageDps.powerObjectId || storageDps.chargePowerObjectId || storageDps.dischargePowerObjectId || globalDps.storagePower || globalDps.storageChargePower || globalDps.storageDischargePower),
                        onlineReadId: text(storageDps.onlineObjectId || storageDps.availableObjectId),
                        alarmReadId: text(storageDps.alarmObjectId || storageDps.faultObjectId),
                        capacityReadId: text(storageDps.capacityObjectId),
                    },
                });
                aliases['storage:primary'] = 'storage:primary';
            }
        }

        if (appActive(config, 'charging') && config.enableChargingManagement === true) {
            const rows = list(record(config.settingsConfig).evcsList);
            rows.forEach((row, index) => {
                const mappedCount = countMappedValues([
                    ...mappedValuesFromKeys(row, EVCS_READ_KEYS),
                    ...mappedValuesFromKeys(row, EVCS_WRITE_KEYS),
                ]);
                if (!row || row.enabled !== true || mappedCount <= 0) return;
                const sourceId = `evcs:lp${index + 1}`;
                const key = text(row.key || row.id || row.name, `lp${index + 1}`);
                const maxPowerW = Math.max(0, num(row.maxPowerW, 0));
                resources.push({
                    sourceId,
                    nativeType: 'chargingPoint',
                    resourceType: 'chargingPoint',
                    name: text(row.name, `Ladepunkt ${index + 1}`),
                    usableCapacityKWh: num(row.vehicleCapacityKWh ?? row.batteryCapacityKWh, String(row.chargerType || '').toUpperCase() === 'DC' ? 200 : 60),
                    efficiencyPct: clamp(row.chargingEfficiencyPct ?? 92, 1, 100),
                    minPowerW: Math.max(0, num(row.minPowerW, 0)),
                    maxPowerW,
                    configIndex: index,
                    runtimeId: safeWallboxKey(key),
                    evcsIndex: Math.max(1, Math.round(num(row.evcsIndex, index + 1))),
                    nativeMappings: {
                        powerReadId: text(row.powerId || row.actualPowerWId),
                        energyReadId: text(row.energySessionId || row.energyTotalId),
                        stateReadId: text(row.statusId),
                        socReadId: text(row.vehicleSocId),
                        onlineReadId: text(row.onlineId || row.heartbeatId || row.activeId),
                        capacityReadId: text(row.vehicleCapacityReadId),
                    },
                });
                aliases[sourceId] = sourceId;
            });
        }

        if (appActive(config, 'thermal', 'enableThermalControl')) {
            const rows = list(record(config.thermal).devices);
            rows.forEach((row, index) => {
                if (!row || row.enabled !== true) return;
                const slot = Math.max(1, Math.min(10, Math.round(num(row.slot ?? row.consumerSlot, index + 1))));
                const flowSlot = list(record(record(config.vis).flowSlots).consumers)[slot - 1] || {};
                const ctrl = record(flowSlot.ctrl);
                const thermalIds = [
                    record(config.datapoints)[`consumer${slot}Power`],
                    row.powerReadId, row.temperatureReadId, row.alarmReadId, row.onlineReadId, row.stateReadId,
                    ctrl.switchWriteId, ctrl.switchReadId, ctrl.setpointWriteId, ctrl.setpointReadId,
                    ctrl.sgReadyAWriteId, ctrl.sgReadyAReadId, ctrl.sgReadyBWriteId, ctrl.sgReadyBReadId,
                    ctrl.sgReady1WriteId, ctrl.sgReady1ReadId, ctrl.sgReady2WriteId, ctrl.sgReady2ReadId,
                ];
                const mappedCount = thermalIds.filter((entry) => text(entry)).length;
                if (mappedCount <= 0) return;
                const sourceId = `thermal:${index + 1}`;
                resources.push({
                    sourceId,
                    nativeType: 'thermal',
                    resourceType: 'thermal',
                    name: text(row.name || flowSlot.name, `Thermisches Gerät ${slot}`),
                    maxPowerW: Math.max(0, num(row.maxPowerW ?? row.estimatedPowerW, 0)),
                    minPowerW: 0,
                    configIndex: index,
                    runtimeId: `c${slot}`,
                    nativeMappings: {
                        powerReadId: text(row.powerReadId || record(config.datapoints)[`consumer${slot}Power`]),
                        temperatureReadId: text(row.temperatureReadId),
                        alarmReadId: text(row.alarmReadId),
                        onlineReadId: text(row.onlineReadId),
                        stateReadId: text(row.stateReadId || ctrl.switchReadId || ctrl.setpointReadId),
                    },
                });
                aliases[`thermal:c${slot}`] = sourceId;
                aliases[sourceId] = sourceId;
            });
        }

        if (appActive(config, 'heatingrod', 'enableHeatingRodControl')) {
            const rows = list(record(config.heatingRod).devices);
            rows.forEach((row, index) => {
                if (!row || row.enabled !== true) return;
                const slot = Math.max(1, Math.min(10, Math.round(num(row.slot ?? row.consumerSlot, index + 1))));
                const flowSlot = list(record(record(config.vis).flowSlots).consumers)[slot - 1] || {};
                const ctrl = record(flowSlot.ctrl);
                const stageIds = [];
                for (let stage = 1; stage <= 12; stage += 1) {
                    const stageCfg = list(row.stages)[stage - 1] || {};
                    stageIds.push(
                        stageCfg.writeId, stageCfg.dpWriteId, stageCfg.writeDp,
                        stageCfg.readId, stageCfg.dpReadId, stageCfg.readDp,
                        ctrl[`stage${stage}WriteId`], ctrl[`stage${stage}ReadId`],
                        ctrl[`heatingStage${stage}WriteId`], ctrl[`heatingStage${stage}ReadId`],
                    );
                }
                const heatingIds = [
                    record(config.datapoints)[`consumer${slot}Power`],
                    row.powerReadId, row.alarmReadId, row.onlineReadId, row.stateReadId,
                    ctrl.switchWriteId, ctrl.switchReadId,
                    ...stageIds,
                ];
                const mappedCount = heatingIds.filter((entry) => text(entry)).length;
                if (mappedCount <= 0) return;
                const sourceId = `heatingRod:${index + 1}`;
                resources.push({
                    sourceId,
                    nativeType: 'heatingRod',
                    resourceType: 'thermal',
                    resourceSubtype: 'heatingRod',
                    name: text(row.name || flowSlot.name, `Heizstab ${slot}`),
                    maxPowerW: Math.max(0, num(row.maxPowerW, 0)),
                    minPowerW: 0,
                    configIndex: index,
                    runtimeId: `c${slot}`,
                    nativeMappings: {
                        powerReadId: text(row.powerReadId || record(config.datapoints)[`consumer${slot}Power`]),
                        alarmReadId: text(row.alarmReadId),
                        onlineReadId: text(row.onlineReadId),
                        stateReadId: text(row.stateReadId || ctrl.switchReadId),
                    },
                });
                aliases[`heatingRod:c${slot}`] = sourceId;
                aliases[sourceId] = sourceId;
            });
        }

        const flowSlots = list(record(record(config.vis).flowSlots).consumers);
        const datapoints = record(config.datapoints);
        flowSlots.forEach((slot, index) => {
            if (!slot || slot.enabled !== true) return;
            const ctrl = record(slot.ctrl);
            const flowMappings = [
                datapoints[`consumer${index + 1}Power`],
                ctrl.switchWriteId, ctrl.switchReadId,
                ctrl.setpointWriteId, ctrl.setpointReadId,
                ctrl.sgReadyAWriteId, ctrl.sgReadyAReadId,
                ctrl.sgReadyBWriteId, ctrl.sgReadyBReadId,
                ctrl.sgReady1WriteId, ctrl.sgReady1ReadId,
                ctrl.sgReady2WriteId, ctrl.sgReady2ReadId,
            ];
            for (let stage = 1; stage <= 12; stage += 1) {
                flowMappings.push(
                    ctrl[`stage${stage}WriteId`], ctrl[`stage${stage}ReadId`],
                    ctrl[`heatingStage${stage}WriteId`], ctrl[`heatingStage${stage}ReadId`],
                );
            }
            const mappedCount = countMappedValues(flowMappings);
            if (mappedCount <= 0) return;
            const consumerType = text(slot.consumerType || slot.type || slot.category, 'generic').toLowerCase();
            if (['heatingrod', 'heating_rod', 'heating-rod', 'heizstab', 'heatpump', 'heat_pump', 'heat-pump', 'cooling'].includes(consumerType)) return;
            resources.push({
                sourceId: `flow-consumer:${index + 1}`,
                nativeType: 'flowConsumer',
                resourceType: 'consumer',
                name: text(slot.name, `Verbraucher ${index + 1}`),
                maxPowerW: 0,
                configIndex: index,
                runtimeId: `c${index + 1}`,
                nativeMappings: {
                    powerReadId: text(datapoints[`consumer${index + 1}Power`]),
                    stateReadId: text(ctrl.switchReadId || ctrl.setpointReadId),
                },
                observeOnly: true,
            });
        });

        list(record(config.operatingStrategies).customResources).forEach((row, index) => {
            if (!row || row.enabled === false) return;
            const mappings = record(row.mappings);
            // Benutzerdefinierte Ressourcen gehören erst dann in den aktiven
            // Ressourcen-/Entscheidungskatalog, wenn mindestens ein Datenpunkt
            // tatsächlich zugeordnet wurde. Leere Entwürfe bleiben ausschließlich
            // im Konfigurationsbereich sichtbar und blähen Laufzeit/Diagnose nicht auf.
            if (countMappedValues(Object.values(mappings)) <= 0) return;
            resources.push({
                sourceId: `custom:${text(row.id, String(index + 1))}`,
                nativeType: 'custom',
                resourceType: text(row.resourceType, 'consumer'),
                resourceSubtype: text(row.resourceSubtype),
                name: text(row.name, `Benutzerdefinierte Ressource ${index + 1}`),
                usableCapacityKWh: num(row.usableCapacityKWh, 0),
                efficiencyPct: clamp(row.efficiencyPct ?? 92, 1, 100),
                minPowerW: Math.max(0, num(row.minPowerW, 0)),
                maxPowerW: Math.max(0, num(row.maxPowerW, 0)),
                configIndex: index,
                runtimeId: text(row.id, String(index + 1)),
                custom: row,
                observeOnly: true,
            });
        });

        const seen = new Set();
        return {
            resources: resources.filter((entry) => {
                if (!entry || !entry.sourceId || seen.has(entry.sourceId)) return false;
                seen.add(entry.sourceId);
                return true;
            }),
            aliases,
        };
    }

    _linkMap(cfg) {
        const map = new Map();
        list(cfg.resourceLinks).forEach((entry) => {
            const id = text(entry && entry.sourceId);
            if (id) map.set(id, entry);
        });
        return map;
    }

    async _ensureMappedKey(sourceId, field, objectId, dataType = 'mixed') {
        const id = text(objectId);
        if (!id || !this.dp || typeof this.dp.upsert !== 'function') return '';
        const key = `os.${safeId(sourceId)}.${field}`;
        if (this._registeredMappings.get(key) !== id) {
            await this.dp.upsert({
                key,
                objectId: id,
                dataType,
                direction: 'in',
                useAliveForStale: true,
            });
            this._registeredMappings.set(key, id);
        }
        return key;
    }

    async _readMappings(sourceId, mappings, staleTimeoutSec) {
        const staleMs = Math.max(1000, clamp(staleTimeoutSec, 1, 86400) * 1000);
        const result = {};
        const specs = [
            ['powerW', 'powerReadId', 'number'],
            ['energyKWh', 'energyReadId', 'number'],
            ['state', 'stateReadId', 'mixed'],
            ['socPct', 'socReadId', 'number'],
            ['temperatureC', 'temperatureReadId', 'number'],
            ['alarm', 'alarmReadId', 'mixed'],
            ['online', 'onlineReadId', 'mixed'],
            ['capacityKWh', 'capacityReadId', 'number'],
            ['forecastEnergyKWh', 'forecastEnergyReadId', 'number'],
            ['surplusPowerW', 'surplusPowerReadId', 'number'],
        ];
        let freshestAgeMs = null;
        for (const [field, mappingKey, dataType] of specs) {
            const objectId = text(record(mappings)[mappingKey]);
            if (!objectId) continue;
            const key = await this._ensureMappedKey(sourceId, field, objectId, dataType);
            if (!key) continue;
            let raw = null;
            let ageMs = null;
            try {
                raw = this.dp.getRaw(key, null);
                const age = this.dp.getAgeMs(key);
                ageMs = Number.isFinite(age) && age >= 0 ? age : null;
            } catch (_error) {}
            if (ageMs !== null && (freshestAgeMs === null || ageMs < freshestAgeMs)) freshestAgeMs = ageMs;
            if (field === 'alarm' || field === 'online') result[field] = toBool(raw, null);
            else if (field === 'state') result[field] = raw === null || raw === undefined ? null : String(raw);
            else result[field] = nullableNumber(raw);
            result[`${field}AgeMs`] = ageMs;
            result[`${field}Fresh`] = ageMs !== null && ageMs <= staleMs;
        }
        result.freshestAgeMs = freshestAgeMs;
        result.anyMappedFresh = freshestAgeMs !== null && freshestAgeMs <= staleMs;
        return result;
    }

    async _readOwnState(id) {
        try {
            const state = await this.adapter.getStateAsync(id);
            if (!state) return { value: null, ageMs: null, fresh: false };
            const ts = Number(state.ts || state.lc || 0);
            const ageMs = ts > 0 ? Math.max(0, Date.now() - ts) : null;
            return { value: state.val, ageMs, fresh: ageMs !== null };
        } catch (_error) {
            return { value: null, ageMs: null, fresh: false };
        }
    }

    _updateActivity(sourceId, active, now) {
        const previous = this._activity.get(sourceId) || { active: !!active, changedAt: now };
        if (previous.active !== !!active) {
            previous.active = !!active;
            previous.changedAt = now;
        }
        this._activity.set(sourceId, previous);
        const durationMin = Math.max(0, (now - previous.changedAt) / 60000);
        return active
            ? { runDurationMin: durationMin, offDurationMin: 0 }
            : { runDurationMin: 0, offDurationMin: durationMin };
    }

    async _resourceState(resource, link, now) {
        const staleTimeoutSec = Math.max(1, num(link && link.staleTimeoutSec, resource.nativeType === 'chargingPoint' ? 30 : 60));
        const mappings = {
            ...record(resource.custom && resource.custom.mappings),
            ...record(resource.nativeMappings),
            ...record(link && link.mappings),
        };
        const mapped = await this._readMappings(resource.sourceId, mappings, staleTimeoutSec);
        const state = {
            socPct: mapped.socPct ?? null,
            temperatureC: mapped.temperatureC ?? null,
            powerW: mapped.powerW ?? null,
            energyKWh: mapped.energyKWh ?? null,
            capacityKWh: mapped.capacityKWh ?? (resource.usableCapacityKWh > 0 ? resource.usableCapacityKWh : null),
            online: mapped.online,
            alarm: mapped.alarm,
            active: false,
            fresh: mapped.anyMappedFresh,
            state: mapped.state || 'idle',
            runDurationMin: 0,
            offDurationMin: 0,
            source: 'mapped',
            temperatureFresh: mapped.temperatureCFresh === true,
            temperatureKnown: mapped.temperatureC !== null && mapped.temperatureC !== undefined,
            onlineKnown: mapped.online !== null && mapped.online !== undefined,
            alarmKnown: mapped.alarm !== null && mapped.alarm !== undefined,
            socFresh: mapped.socPctFresh === true,
            powerFresh: mapped.powerWFresh === true,
        };

        if (resource.nativeType === 'storage') {
            if (state.socPct === null && this.dp) {
                try {
                    const value = this.dp.getNumber('st.socPct', null);
                    const age = this.dp.getAgeMs('st.socPct');
                    if (Number.isFinite(value)) state.socPct = clamp(value, 0, 100);
                    if (Number.isFinite(age)) {
                        state.socFresh = age <= staleTimeoutSec * 1000;
                        state.fresh = state.socFresh;
                    }
                } catch (_error) {}
            }
            if (state.powerW === null && this.dp) {
                try {
                    const value = this.dp.getNumber('st.powerW', null);
                    if (Number.isFinite(value)) state.powerW = value;
                } catch (_error) {}
            }
            state.online = state.online === null ? state.fresh : state.online;
            state.onlineKnown = true;
            state.alarm = state.alarm === true;
            state.alarmKnown = state.alarmKnown || false;
            state.active = Number.isFinite(state.powerW) ? Math.abs(state.powerW) > 50 : false;
            state.state = state.powerW > 50 ? 'discharging' : (state.powerW < -50 ? 'charging' : 'idle');
            state.source = 'storage-runtime';
        } else if (resource.nativeType === 'chargingPoint') {
            const base = `chargingManagement.wallboxes.${resource.runtimeId}`;
            const power = await this._readOwnState(`${base}.actualPowerW`);
            const online = await this._readOwnState(`${base}.online`);
            const active = await this._readOwnState(`${base}.vehicleDemandConfirmed`);
            const status = await this._readOwnState(`${base}.vehicleStateNormalized`);
            const energy = await this._readOwnState(`${base}.sessionEnergyKWh`);
            const soc = await this._readOwnState(`evcs.${resource.evcsIndex}.vehicleSoc`);
            if (state.powerW === null && Number.isFinite(Number(power.value))) state.powerW = Number(power.value);
            if (state.energyKWh === null && Number.isFinite(Number(energy.value))) state.energyKWh = Number(energy.value);
            if (state.socPct === null && Number.isFinite(Number(soc.value))) state.socPct = clamp(Number(soc.value), 0, 100);
            if (soc.ageMs !== null) state.socFresh = soc.ageMs <= staleTimeoutSec * 1000;
            if (state.online === null) state.online = toBool(online.value, false);
            state.onlineKnown = online.value !== null && online.value !== undefined;
            state.active = toBool(active.value, false) === true;
            state.state = text(status.value, state.active ? 'charging' : 'idle');
            const ages = [power.ageMs, online.ageMs, active.ageMs].filter((value) => Number.isFinite(value));
            const freshest = ages.length ? Math.min(...ages) : null;
            state.fresh = mapped.anyMappedFresh || (freshest !== null && freshest <= staleTimeoutSec * 1000);
            state.alarm = state.alarm === true;
            state.source = 'charging-runtime';
        } else if (resource.nativeType === 'thermal') {
            const base = `thermal.devices.${resource.runtimeId}`;
            const measured = await this._readOwnState(`${base}.measuredW`);
            const applied = await this._readOwnState(`${base}.applied`);
            const status = await this._readOwnState(`${base}.status`);
            const enabled = await this._readOwnState(`${base}.effectiveEnabled`);
            if (state.powerW === null && Number.isFinite(Number(measured.value))) state.powerW = Number(measured.value);
            state.active = toBool(applied.value, false) === true || (Number.isFinite(state.powerW) && state.powerW > 50);
            state.state = text(status.value, state.active ? 'on' : 'off');
            if (state.online === null) state.online = toBool(enabled.value, true);
            state.alarm = state.alarm === true;
            const ages = [measured.ageMs, status.ageMs, enabled.ageMs].filter((value) => Number.isFinite(value));
            const freshest = ages.length ? Math.min(...ages) : null;
            state.fresh = mapped.anyMappedFresh || (freshest !== null && freshest <= staleTimeoutSec * 1000);
            state.source = 'thermal-runtime';
        } else if (resource.nativeType === 'heatingRod') {
            const base = `heatingRod.devices.${resource.runtimeId}`;
            const measured = await this._readOwnState(`${base}.measuredW`);
            const stage = await this._readOwnState(`${base}.currentStage`);
            const status = await this._readOwnState(`${base}.status`);
            const enabled = await this._readOwnState(`${base}.effectiveEnabled`);
            if (state.powerW === null && Number.isFinite(Number(measured.value))) state.powerW = Number(measured.value);
            state.active = Number(stage.value) > 0 || (Number.isFinite(state.powerW) && state.powerW > 50);
            state.state = text(status.value, state.active ? 'on' : 'off');
            if (state.online === null) state.online = toBool(enabled.value, true);
            state.alarm = state.alarm === true;
            const ages = [measured.ageMs, stage.ageMs, status.ageMs].filter((value) => Number.isFinite(value));
            const freshest = ages.length ? Math.min(...ages) : null;
            state.fresh = mapped.anyMappedFresh || (freshest !== null && freshest <= staleTimeoutSec * 1000);
            state.source = 'heating-rod-runtime';
        } else {
            state.online = state.online === null ? mapped.anyMappedFresh : state.online;
            state.alarm = state.alarm === true;
            state.active = Number.isFinite(state.powerW) ? Math.abs(state.powerW) > 50 : /on|active|running/i.test(text(state.state));
        }

        const durations = this._updateActivity(resource.sourceId, state.active, now);
        state.runDurationMin = durations.runDurationMin;
        state.offDurationMin = durations.offDurationMin;
        if (state.online === null) state.online = false;
        if (state.alarm === null) state.alarm = false;
        return state;
    }

    async _systemState(cfg) {
        const mappings = record(cfg.systemMappings);
        const mapped = await this._readMappings('system', {
            temperatureReadId: mappings.outsideTemperatureReadId,
            forecastEnergyReadId: mappings.pvForecastReadId,
            surplusPowerReadId: mappings.pvSurplusReadId,
            powerReadId: mappings.gridPowerReadId,
            energyReadId: mappings.electricityPriceReadId,
            stateReadId: mappings.cheapTariffReadId,
        }, 300);
        const budget = record(this.adapter && this.adapter._emsBudget);
        const gates = record(budget.gates);
        const raw = record(budget.raw);
        const tariff = record(gates.tariff);
        const forecast = record(gates.forecast);
        const now = new Date();
        const gridPowerW = mapped.powerW !== null && mapped.powerW !== undefined ? mapped.powerW : nullableNumber(raw.gridW);
        const pvForecastKWh = mapped.forecastEnergyKWh !== null && mapped.forecastEnergyKWh !== undefined
            ? mapped.forecastEnergyKWh
            : nullableNumber(forecast.kwhNext24h);
        const pvSurplusW = mapped.surplusPowerW !== null && mapped.surplusPowerW !== undefined
            ? mapped.surplusPowerW
            : nullableNumber(record(gates.pv).effectiveW);
        const currentPrice = mapped.energyKWh !== null && mapped.energyKWh !== undefined
            ? mapped.energyKWh
            : (Number.isFinite(Number(tariff.currentPriceEurKwh)) ? Number(tariff.currentPriceEurKwh) * 100 : null);
        const cheapMapped = mapped.state === null || mapped.state === undefined ? null : toBool(mapped.state, null);
        return {
            outsideTemperatureC: mapped.temperatureC ?? null,
            pvForecastKWh,
            pvSurplusW,
            gridPowerW,
            electricityPriceCtKWh: currentPrice,
            weekend: now.getDay() === 0 || now.getDay() === 6,
            cheapTariff: cheapMapped !== null ? cheapMapped : (tariff.gridImportPreferred === true || tariff.negativeActive === true),
        };
    }

    _schedule(rule, now) {
        const schedule = record(rule.schedule);
        const weekdays = list(schedule.weekdays);
        const day = weekdayKey(now);
        if (weekdays.length && !weekdays.includes(day)) return { active: false, reason: 'weekday-not-enabled' };
        const mode = text(schedule.mode, rule.ruleType === 'thermalPause' ? 'dailyTime' : 'continuous');
        const current = now.getHours() * 60 + now.getMinutes();
        if (mode === 'continuous') return { active: true, reason: 'continuous' };
        if (mode === 'dailyTime') {
            const start = timeMinutes(schedule.atTime, rule.ruleType === 'thermalPause' ? 19 * 60 : 0);
            const end = (start + Math.max(1, num(schedule.windowMinutes, 30))) % 1440;
            return isInTimeWindow(current, start, end)
                ? { active: true, reason: 'daily-window-active' }
                : { active: false, reason: 'outside-daily-window' };
        }
        const start = timeMinutes(schedule.startTime, 19 * 60);
        const end = timeMinutes(schedule.endTime, 7 * 60);
        return isInTimeWindow(current, start, end)
            ? { active: true, reason: 'time-window-active' }
            : { active: false, reason: 'outside-time-window' };
    }

    _profileMatches(rule, activeProfileId) {
        const scope = text(rule.profileScope, 'active');
        if (scope === 'all' || scope === 'active') return true;
        return scope.replace(/^profile:/, '') === activeProfileId;
    }

    _metricValue(condition, system, states) {
        const sourceRef = text(condition.sourceRef, 'system');
        if (sourceRef === 'system') {
            const value = system[text(condition.metric)];
            return { available: value !== null && value !== undefined, value };
        }
        const state = states[sourceRef];
        if (!state) return { available: false, value: null };
        const value = state[text(condition.metric)];
        return { available: value !== null && value !== undefined, value };
    }

    _nextLocalTimeMs(now, value, fallback = '07:00') {
        const targetMinutes = timeMinutes(value, timeMinutes(fallback, 7 * 60));
        const target = new Date(now.getTime());
        target.setSeconds(0, 0);
        target.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
        if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
        return target.getTime();
    }

    _setThermalLatch(key, value) {
        if (!key) return;
        this._thermalLatches.set(key, value);
        this._latchesDirty = true;
    }

    _clearThermalLatch(key) {
        if (!key || !this._thermalLatches.has(key)) return;
        this._thermalLatches.delete(key);
        this._latchesDirty = true;
    }

    _thermalSafetyRelease(base, key, now, minRunDurationMin, headline, reasons = []) {
        const releaseUntil = now.getTime() + Math.max(1, num(minRunDurationMin, 5)) * 60000;
        this._setThermalLatch(key, {
            status: 'release',
            startedAt: num(record(this._thermalLatches.get(key)).startedAt, now.getTime()),
            releaseAt: now.getTime(),
            releaseUntil,
        });
        return {
            ...base,
            status: 'safety',
            action: 'release',
            headline,
            reasons,
        };
    }

    _baseDecision(rule, resource) {
        return {
            ruleId: text(rule.id),
            name: text(rule.name, 'Regel'),
            requirement: text(rule.requirement, 'should'),
            priority: clamp(rule.priority, 1, 100),
            targetResourceId: text(rule.targetResourceId),
            targetResourceName: resource ? resource.name : text(rule.targetResourceId, 'nicht zugeordnet'),
            ruleType: text(rule.ruleType),
            status: 'inactive',
            selected: false,
            action: 'none',
            requestedPowerW: null,
            targetEnergyKWh: null,
            deadline: 0,
            headline: '',
            details: '',
            reasons: [],
            energySourcePolicy: text(record(rule.target).energySourcePolicy, 'pv-preferred'),
        };
    }

    _evaluateRule(rule, activeProfileId, resourcesById, states, system, now) {
        const resource = resourcesById[text(rule.targetResourceId)];
        const base = this._baseDecision(rule, resource);
        if (rule.enabled === false) return { ...base, headline: 'Regel deaktiviert' };
        if (!this._profileMatches(rule, activeProfileId)) return { ...base, headline: 'Profil nicht aktiv' };
        if (!resource) return { ...base, status: 'blocked', headline: 'Zielressource fehlt', reasons: ['Die zugeordnete Ressource ist im EOS nicht aktiv oder nicht vollständig eingerichtet.'] };
        if (resource.strategyEnabled !== true) return { ...base, status: 'blocked', headline: 'Ressource nicht freigegeben', reasons: ['Die Ressource ist nicht für Betriebsstrategien vorgemerkt.'] };

        const state = states[resource.sourceId] || {};
        const safety = record(rule.safety);
        const ruleType = text(rule.ruleType);
        const thermalLatchKey = ruleType === 'thermalPause' ? `${text(rule.id)}::${resource.sourceId}` : '';
        const minRunDurationMin = Math.max(0, num(safety.minRunDurationMin, 5));
/**
 * Code-Teil: thermalRelease
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const thermalRelease = (headline, reasons) => this._thermalSafetyRelease(base, thermalLatchKey, now, minRunDurationMin, headline, reasons);

        if (safety.requireOnline !== false) {
            const onlineKnown = ruleType === 'thermalPause' ? state.onlineKnown === true : state.online !== null && state.online !== undefined;
            if (!onlineKnown || state.online !== true) {
                return ruleType === 'thermalPause'
                    ? thermalRelease('Sicher freigeben', ['Ressource ist offline oder Online-Status fehlt.'])
                    : { ...base, status: 'blocked', headline: 'Ressource offline', reasons: ['Online-Status ist nicht erfüllt.'] };
            }
        }
        if (safety.blockOnAlarm !== false) {
            const alarmKnown = ruleType === 'thermalPause' ? state.alarmKnown === true : true;
            if (!alarmKnown || state.alarm === true) {
                return ruleType === 'thermalPause'
                    ? thermalRelease('Sicher freigeben', [alarmKnown ? 'Alarmstatus aktiv.' : 'Alarmstatus fehlt.'])
                    : { ...base, status: 'blocked', headline: 'Alarmstatus aktiv oder unbekannt', reasons: ['Die Zielressource meldet eine Störung oder keinen belastbaren Alarmstatus.'] };
            }
        }
        if (safety.requireFresh !== false) {
            const fresh = ruleType === 'thermalPause' ? state.temperatureFresh === true : state.fresh === true;
            if (!fresh) {
                return ruleType === 'thermalPause'
                    ? thermalRelease('Sicher freigeben', ['Temperaturmesswert ist veraltet oder fehlt.'])
                    : { ...base, status: 'blocked', headline: 'Messwerte veraltet', reasons: ['Die Messwertqualität reicht für eine aktive Anforderung nicht aus.'] };
            }
        }

        if (ruleType === 'thermalPause') {
            const maxTemperatureC = num(safety.maxTemperatureC, 7);
            const maxOffDurationMin = Math.max(1, num(safety.maxOffDurationMin, 480));
            const minStopDurationMin = Math.max(0, num(safety.minStopDurationMin, 5));
            const hysteresisC = Math.max(0, num(safety.hysteresisC, 1));
            if (!Number.isFinite(Number(state.temperatureC))) {
                return thermalRelease('Sicher freigeben', ['Temperaturwert fehlt.']);
            }
            if (Number(state.temperatureC) >= maxTemperatureC) {
                return {
                    ...thermalRelease('Temperaturgrenze erreicht', ['Wiedereinschalten/Freigabe erforderlich.']),
                    details: `${Number(state.temperatureC).toFixed(1)} °C ≥ ${maxTemperatureC.toFixed(1)} °C`,
                };
            }
            if (num(state.offDurationMin, 0) >= maxOffDurationMin) {
                return thermalRelease('Maximale Abschaltdauer erreicht', ['Wiedereinschalten/Freigabe erforderlich.']);
            }

            const latch = record(this._thermalLatches.get(thermalLatchKey));
            if (text(latch.status) === 'release') {
                if (num(latch.releaseUntil, 0) > now.getTime()) {
                    return { ...base, status: 'safety', action: 'release', headline: 'Sicherer Wiederanlauf aktiv', reasons: ['Mindestlaufzeit nach Strategiepause wird eingehalten.'] };
                }
                this._clearThermalLatch(thermalLatchKey);
            } else {
                if (num(latch.releaseAt, 0) > now.getTime()) {
                    return { ...base, status: 'request', action: 'pause', headline: 'Thermische Nachtpause aktiv', reasons: ['Die freigegebene Pause bleibt bis zum geplanten Ende oder bis zu einer Sicherheitsgrenze aktiv.'] };
                }
                if (num(latch.releaseAt, 0) > 0 && num(latch.releaseAt, 0) <= now.getTime()) {
                    return thermalRelease('Geplantes Pausenende erreicht', ['Wiederanlauf wird für die Mindestlaufzeit freigegeben.']);
                }
            }

            const alreadyOff = state.active !== true || /pause|off|blocked/i.test(text(state.state));
            if (!alreadyOff && num(state.runDurationMin, 0) < minRunDurationMin) {
                return { ...base, status: 'inactive', headline: 'Mindestlaufzeit noch aktiv', reasons: ['Die Ressource wird nicht vorzeitig pausiert.'] };
            }
            if (alreadyOff && num(state.offDurationMin, 0) < minStopDurationMin) {
                return { ...base, status: 'inactive', headline: 'Mindeststillstandszeit noch aktiv', reasons: ['Eine neue Strategieentscheidung wartet bis zum Ende der Mindeststillstandszeit.'] };
            }
            if (!alreadyOff && Number(state.temperatureC) > maxTemperatureC - hysteresisC) {
                return { ...base, status: 'inactive', headline: 'Temperaturreserve zu klein', reasons: ['Hysterese verhindert eine neue Pause.'] };
            }
        }

        const schedule = this._schedule(rule, now);
        if (!schedule.active) return { ...base, status: 'inactive', headline: 'Zeitplan nicht aktiv', reasons: [schedule.reason] };

        const missing = [];
        const failed = [];
        list(rule.conditions).filter((entry) => entry && entry.enabled !== false).forEach((condition) => {
            const actual = this._metricValue(condition, system, states);
            if (!actual.available) missing.push(`${text(condition.sourceRef)}:${text(condition.metric)} fehlt`);
            else if (!compare(actual.value, text(condition.operator, 'eq'), condition.value)) failed.push(`${text(condition.sourceRef)}:${text(condition.metric)} nicht erfüllt (Ist ${String(actual.value)})`);
        });
        if (missing.length) return { ...base, status: 'blocked', headline: 'Bedingungsmesswert fehlt', reasons: missing };
        if (failed.length) return { ...base, status: 'inactive', headline: 'Bedingungen nicht erfüllt', reasons: failed };

        const target = record(rule.target);
        if (ruleType === 'thermalPause') {
            const scheduleCfg = record(rule.schedule);
            const safety = record(rule.safety);
            const plannedEnd = this._nextLocalTimeMs(now, text(scheduleCfg.endTime, '07:00'), '07:00');
            const maxEnd = now.getTime() + Math.max(1, num(safety.maxOffDurationMin, 480)) * 60000;
            const releaseAt = Math.min(plannedEnd, maxEnd);
            this._setThermalLatch(thermalLatchKey, {
                status: 'pause',
                startedAt: now.getTime(),
                releaseAt,
                releaseUntil: 0,
            });
            return {
                ...base,
                status: 'request',
                action: 'pause',
                headline: 'Thermische Pause aktiviert',
                details: `Geplante Freigabe spätestens ${new Date(releaseAt).toLocaleString('de-DE')}.`,
                reasons: ['Zeitplan, Bedingungen und Sicherheitsgrenzen sind erfüllt.'],
            };
        }
        if (ruleType === 'targetSoc') {
            const safety = record(rule.safety);
            const currentSoc = nullableNumber(state.socPct);
            if (currentSoc === null) return { ...base, status: 'blocked', headline: 'SoC fehlt', reasons: ['Für das SoC-Ziel ist ein aktueller SoC erforderlich.'] };
            if (safety.requireFresh !== false && state.socFresh !== true) {
                return { ...base, status: 'blocked', headline: 'SoC veraltet', reasons: ['Das SoC-Ziel wird nur mit einem aktuellen SoC ausgewertet.'] };
            }
            const targetSoc = clamp(target.value, 0, 100);
            if (currentSoc >= targetSoc) return { ...base, status: 'completed', headline: `SoC-Ziel ${targetSoc.toFixed(0)} % erreicht`, details: `Aktuell ${currentSoc.toFixed(1)} %.` };
            const capacityKWh = nullableNumber(state.capacityKWh) ?? nullableNumber(resource.usableCapacityKWh);
            const efficiency = Math.max(0.01, clamp(resource.efficiencyPct ?? 92, 1, 100) / 100);
            const needKWh = capacityKWh !== null ? (capacityKWh * (targetSoc - currentSoc) / 100) / efficiency : null;
            const minutes = minutesUntilDeadline(now, text(target.dueTime, '12:00'), text(target.dueDay, 'next-day'));
            let requestedPowerW = needKWh !== null && minutes !== null && minutes > 0 ? Math.round((needKWh / (minutes / 60)) * 1000) : null;
            if (requestedPowerW === null || requestedPowerW <= 0) requestedPowerW = Math.max(0, num(resource.minPowerW, 0));
            if (resource.minPowerW > 0) requestedPowerW = Math.max(requestedPowerW, resource.minPowerW);
            if (resource.maxPowerW > 0) requestedPowerW = Math.min(requestedPowerW, resource.maxPowerW);
            return {
                ...base,
                status: 'request',
                action: 'charge-to-soc',
                requestedPowerW,
                targetSocPct: targetSoc,
                deadline: now.getTime() + Math.max(0, minutes || 0) * 60000,
                headline: `SoC-Ziel ${targetSoc.toFixed(0)} % bis ${text(target.dueTime, '12:00')}`,
                details: needKWh === null ? 'Kapazität fehlt; Mindest-/Maximalleistung wird verwendet.' : `Energiebedarf ca. ${needKWh.toFixed(1)} kWh.`,
            };
        }
        if (ruleType === 'targetEnergy') {
            const currentEnergy = nullableNumber(state.energyKWh);
            if (currentEnergy === null) return { ...base, status: 'blocked', headline: 'Energiezähler fehlt', reasons: ['Für das Energieziel ist ein aktueller Energiezähler erforderlich.'] };
            const targetEnergy = Math.max(0, num(target.value, 0));
            const missingEnergy = Math.max(0, targetEnergy - currentEnergy);
            if (missingEnergy <= 0) return { ...base, status: 'completed', headline: 'Energieziel erreicht' };
            const minutes = minutesUntilDeadline(now, text(target.dueTime, '12:00'), text(target.dueDay, 'next-day'));
            let requestedPowerW = minutes !== null && minutes > 0 ? Math.round((missingEnergy / (minutes / 60)) * 1000) : 0;
            if (resource.minPowerW > 0) requestedPowerW = Math.max(requestedPowerW, resource.minPowerW);
            if (resource.maxPowerW > 0) requestedPowerW = Math.min(requestedPowerW, resource.maxPowerW);
            return {
                ...base,
                status: 'request',
                action: 'deliver-energy',
                requestedPowerW,
                targetEnergyKWh: targetEnergy,
                deadline: now.getTime() + Math.max(0, minutes || 0) * 60000,
                headline: `Noch ${missingEnergy.toFixed(1)} kWh bis ${text(target.dueTime, '12:00')}`,
            };
        }
        if (ruleType === 'switchState') {
            const action = ['on', 'off', 'pause', 'release'].includes(text(target.state)) ? text(target.state) : 'on';
            return {
                ...base,
                status: 'request',
                action,
                requestedPowerW: action === 'on' && resource.maxPowerW > 0 ? resource.maxPowerW : null,
                headline: `${action} anfordern`,
            };
        }
        return {
            ...base,
            status: 'request',
            action: 'target-power',
            requestedPowerW: Math.max(0, Math.round(num(target.value, 0))),
            headline: `${Math.max(0, Math.round(num(target.value, 0)))} W anfordern`,
        };
    }

    _evaluateNightReserve(cfg, activeProfileId, resourcesById, states, now) {
        const profile = list(cfg.profiles).find((entry) => text(entry && entry.id) === activeProfileId)
            || list(cfg.profiles).find((entry) => entry && entry.enabled !== false);
        if (!profile || profile.enabled === false) return null;
        const reserve = record(profile.nightReserve);
        if (reserve.enabled === false) return null;
        let resource = resourcesById[text(reserve.storageResourceId)];
        if (!resource) resource = Object.values(resourcesById).find((entry) => entry.resourceType === 'storage' && entry.strategyEnabled === true);
        const base = {
            ruleId: `night-reserve-${text(profile.id, 'profile')}`,
            name: `Nachtenergie-Reserve · ${text(profile.name, 'Profil')}`,
            requirement: 'must',
            priority: 95,
            targetResourceId: resource ? resource.sourceId : text(reserve.storageResourceId),
            targetResourceName: resource ? resource.name : 'nicht zugeordnet',
            ruleType: 'nightReserve',
            status: 'inactive',
            selected: false,
            action: 'none',
            requestedPowerW: null,
            headline: '',
            details: '',
            reasons: [],
            energySourcePolicy: 'pv-preferred',
        };
        if (!resource) return { ...base, status: 'blocked', headline: 'Speicher für Nachtreserve fehlt' };
        if (resource.strategyEnabled !== true) return { ...base, status: 'blocked', headline: 'Speicher nicht freigegeben' };
        const state = states[resource.sourceId] || {};
        if (state.online !== true || state.fresh !== true || state.alarm === true || !Number.isFinite(Number(state.socPct))) {
            return { ...base, status: 'blocked', headline: 'Speicherzustand nicht belastbar', reasons: ['Online-, Frische-, Alarm- oder SoC-Prüfung fehlgeschlagen.'] };
        }
        const targetSocPct = clamp(reserve.targetSocPct, 0, 100);
        const absoluteMinSocPct = Math.min(targetSocPct, clamp(reserve.absoluteMinSocPct, 0, 100));
        const startTime = text(reserve.startTime, '18:00');
        const endTime = text(reserve.endTime, '07:00');
        const current = now.getHours() * 60 + now.getMinutes();
        const isNight = isInTimeWindow(current, timeMinutes(startTime, 18 * 60), timeMinutes(endTime, 7 * 60));
        if (isNight) {
            if (Number(state.socPct) <= absoluteMinSocPct) {
                return {
                    ...base,
                    status: 'safety',
                    action: 'block-discharge-below-floor',
                    targetSocPct,
                    absoluteMinSocPct,
                    storagePhase: 'night-floor',
                    headline: 'Absolute Speicheruntergrenze schützen',
                };
            }
            return {
                ...base,
                status: 'request',
                action: 'release-for-night-load',
                targetSocPct,
                absoluteMinSocPct,
                storagePhase: 'night-release',
                headline: 'Nachtenergie für Grundverbrauch freigeben',
            };
        }
        const capacityKWh = nullableNumber(state.capacityKWh) ?? nullableNumber(resource.usableCapacityKWh);
        const efficiency = Math.max(0.01, clamp(resource.efficiencyPct ?? 92, 1, 100) / 100);
        const missingPct = Math.max(0, targetSocPct - Number(state.socPct));
        const needKWh = capacityKWh !== null ? (capacityKWh * missingPct / 100) / efficiency : null;
        const minutes = minutesUntilTime(now, startTime);
        const requestedPowerW = needKWh !== null && minutes !== null && minutes > 0 ? Math.round((needKWh / (minutes / 60)) * 1000) : null;
        return {
            ...base,
            status: 'request',
            action: Number(state.socPct) >= targetSocPct ? 'protect-reserve' : 'build-and-protect-reserve',
            requestedPowerW,
            targetSocPct,
            absoluteMinSocPct,
            storagePhase: 'day-protect',
            headline: Number(state.socPct) >= targetSocPct ? 'Nachtenergie-Reserve gesichert' : `Nachtenergie-Reserve auf ${targetSocPct.toFixed(0)} % aufbauen`,
        };
    }

    _selectDecisions(decisions) {
        const candidates = decisions
            .map((decision, index) => ({ decision, index }))
            .filter((entry) => ['request', 'safety'].includes(entry.decision.status))
            .sort((a, b) => {
                if (a.decision.status !== b.decision.status) return a.decision.status === 'safety' ? -1 : 1;
                const reqDiff = (REQUIREMENT_ORDER[a.decision.requirement] ?? 9) - (REQUIREMENT_ORDER[b.decision.requirement] ?? 9);
                if (reqDiff) return reqDiff;
                return num(b.decision.priority, 0) - num(a.decision.priority, 0);
            });
        const selected = new Set();
        candidates.forEach(({ decision, index }) => {
            const target = text(decision.targetResourceId, `rule:${decision.ruleId}`);
            if (!selected.has(target)) {
                selected.add(target);
                decisions[index].selected = true;
            } else if (decisions[index].status === 'request') {
                decisions[index].status = 'shadowed';
                decisions[index].headline = 'Durch höher priorisierte Regel zurückgestellt';
            }
        });
        return decisions;
    }

    _globalControlState(cfg, config) {
        const appEnabled = operatingStrategiesAppActive(config);
        const activeControl = isOperatingStrategiesLiveConfig(cfg, appEnabled);
        const autoControl = record(cfg.autoControl);
        let reason = 'active';
        if (!appEnabled) reason = 'app-disabled';
        else if (cfg.enabled !== true) reason = 'strategy-disabled';
        else if (text(cfg.mode) !== 'active') reason = 'observe-mode';
        else if (cfg.commissioningConfirmed !== true) reason = 'commissioning-not-confirmed';
        else if (cfg.controlTakeoverEnabled !== true || cfg.writeExecutionEnabled !== true) reason = 'live-control-not-enabled';
        else if (autoControl.enabled === false) reason = 'auto-control-disabled';
        else if (text(autoControl.stage) !== 'active') reason = 'shadow-stage';
        return { appEnabled, activeControl, reason };
    }

    async tick() {
        const nowMs = Date.now();
        const now = new Date(nowMs);
        const cfg = this._cfg();
        const config = this.adapter && this.adapter.config ? this.adapter.config : {};
        const global = this._globalControlState(cfg, config);
        const ttlMs = Math.max(3000, Math.min(60000, Math.round(num(record(cfg.autoControl).requestTtlSeconds, 15) * 1000)));
        const activeProfileId = text(cfg.activeProfileId, text(list(cfg.profiles)[0] && list(cfg.profiles)[0].id, 'winter'));
        const { resources, aliases } = this._deriveResources(config);
        const linkMap = this._linkMap(cfg);
        const resourcesById = {};
        resources.forEach((resource) => {
            const link = linkMap.get(resource.sourceId) || null;
            resource.link = link;
            resource.strategyEnabled = !!(link && link.enabled === true);
            resource.controlEligible = !!(global.activeControl && isLinkLiveEligible(link) && !resource.observeOnly && SUPPORTED_LIVE_PREFIXES.some((prefix) => resource.sourceId.startsWith(prefix)));
            resourcesById[resource.sourceId] = resource;
        });

        const system = await this._systemState(cfg);
        const states = {};
        for (const resource of resources) {
            states[resource.sourceId] = await this._resourceState(resource, resource.link, nowMs);
        }

        const decisions = list(cfg.rules).map((rule) => this._evaluateRule(rule, activeProfileId, resourcesById, states, system, now));
        const reserveDecision = this._evaluateNightReserve(cfg, activeProfileId, resourcesById, states, now);
        if (reserveDecision) decisions.push(reserveDecision);
        this._selectDecisions(decisions);

        const requestsByResource = {};
        const storageOverlaysByResource = {};
        const decisionsByResource = {};
        decisions.forEach((decision) => {
            const resourceId = text(decision.targetResourceId);
            if (resourceId && !decisionsByResource[resourceId]) decisionsByResource[resourceId] = decision;
            if (!decision.selected || !resourceId) return;
            const resource = resourcesById[resourceId];
            const controlEligible = !!(resource && resource.controlEligible);
            const request = {
                version: 3,
                source: 'operatingStrategies',
                ruleId: text(decision.ruleId),
                name: text(decision.name),
                targetResourceId: resourceId,
                requirement: text(decision.requirement, 'should'),
                priority: num(decision.priority, 50),
                status: text(decision.status),
                action: text(decision.action),
                requestedPowerW: nullableNumber(decision.requestedPowerW),
                minPowerW: resource ? Math.max(0, num(resource.minPowerW, 0)) : 0,
                maxPowerW: resource ? Math.max(0, num(resource.maxPowerW, 0)) : 0,
                targetSocPct: nullableNumber(decision.targetSocPct),
                targetEnergyKWh: nullableNumber(decision.targetEnergyKWh),
                deadline: Math.max(0, num(decision.deadline, 0)),
                absoluteMinSocPct: nullableNumber(decision.absoluteMinSocPct),
                energySourcePolicy: text(decision.energySourcePolicy, 'pv-preferred'),
                headline: text(decision.headline),
                reason: text(decision.headline || list(decision.reasons)[0], 'strategy-decision'),
                selected: true,
                controlEligible,
                controlReason: controlEligible ? 'live-eligible' : (resource ? (global.activeControl ? 'resource-not-live-commissioned' : global.reason) : 'resource-missing'),
                issuedAt: nowMs,
                expiresAt: nowMs + ttlMs,
            };
            requestsByResource[resourceId] = request;

            if (resource && resource.resourceType === 'storage') {
                let minSocPct = null;
                let targetSocPct = nullableNumber(decision.targetSocPct);
                let absoluteMinSocPct = nullableNumber(decision.absoluteMinSocPct);
                let phase = text(decision.storagePhase);
                if (decision.ruleType === 'nightReserve') {
                    if (decision.action === 'release-for-night-load' || decision.action === 'block-discharge-below-floor') minSocPct = absoluteMinSocPct;
                    else minSocPct = targetSocPct;
                } else if (decision.action === 'charge-to-soc' && targetSocPct !== null) {
                    minSocPct = targetSocPct;
                    absoluteMinSocPct = targetSocPct;
                    phase = 'target-soc-protect';
                }
                if (minSocPct !== null) {
                    storageOverlaysByResource[resourceId] = {
                        source: 'operatingStrategies',
                        ruleId: request.ruleId,
                        selected: true,
                        action: request.action,
                        minSocPct: clamp(minSocPct, 0, 100),
                        targetSocPct: clamp(targetSocPct ?? minSocPct, 0, 100),
                        absoluteMinSocPct: clamp(absoluteMinSocPct ?? minSocPct, 0, 100),
                        phase,
                        reason: request.reason,
                        controlEligible,
                        issuedAt: nowMs,
                        expiresAt: nowMs + ttlMs,
                    };
                }
            }
        });

        const runtime = {
            schemaVersion: 3,
            version: 3,
            generatedAt: nowMs,
            ts: nowMs,
            expiresAt: nowMs + ttlMs,
            appEnabled: global.appEnabled,
            activeControl: global.activeControl,
            controlReason: global.reason,
            activeProfileId,
            systemState: system,
            system,
            resources,
            statesByResource: states,
            resourceStates: states,
            resourceAliases: aliases,
            requestsByResource,
            storageOverlaysByResource,
            decisionsByResource,
            decisions,
            hardwareWrites: 0,
        };
        this.adapter._nwOperatingStrategyRuntime = runtime;
        this.adapter._nwOperatingStrategiesRuntime = runtime;

        if (this._latchesDirty) {
            this._latchesDirty = false;
            const latchObject = {};
            for (const [key, value] of this._thermalLatches.entries()) latchObject[key] = value;
            await this._setStateIfChanged('operatingStrategies.summary.thermalLatchesJson', JSON.stringify(latchObject));
        }

        const selectedCount = Object.keys(requestsByResource).length;
        const blockedCount = decisions.filter((entry) => entry.status === 'blocked').length;
        await this._setStateIfChanged('operatingStrategies.summary.appEnabled', global.appEnabled);
        await this._setStateIfChanged('operatingStrategies.summary.mode', text(cfg.mode, 'observe'));
        await this._setStateIfChanged('operatingStrategies.summary.activeControl', global.activeControl);
        await this._setStateIfChanged('operatingStrategies.summary.controlReason', global.reason);
        await this._setStateIfChanged('operatingStrategies.summary.activeProfileId', activeProfileId);
        await this._setStateIfChanged('operatingStrategies.summary.resourceCount', resources.length);
        await this._setStateIfChanged('operatingStrategies.summary.decisionCount', decisions.length);
        await this._setStateIfChanged('operatingStrategies.summary.selectedCount', selectedCount);
        await this._setStateIfChanged('operatingStrategies.summary.blockedCount', blockedCount);
        await this._setStateIfChanged('operatingStrategies.summary.lastUpdate', nowMs);
        await this._setStateIfChanged('operatingStrategies.summary.hardwareWrites', 0);
        await this._setStateIfChanged('operatingStrategies.summary.status', global.activeControl ? 'active-request-planner' : `observe-${global.reason}`);
        await this._setStateIfChanged('operatingStrategies.summary.requestsJson', JSON.stringify(requestsByResource));
        await this._setStateIfChanged('operatingStrategies.summary.decisionsJson', JSON.stringify(decisions.slice(0, 200)));
        await this._setStateIfChanged('operatingStrategies.summary.resourcesJson', JSON.stringify(resources.map((resource) => ({
            sourceId: resource.sourceId,
            name: resource.name,
            type: resource.nativeType,
            strategyEnabled: resource.strategyEnabled,
            controlEligible: resource.controlEligible,
            state: states[resource.sourceId],
        }))));
    }
}

module.exports = { OperatingStrategiesModule };
