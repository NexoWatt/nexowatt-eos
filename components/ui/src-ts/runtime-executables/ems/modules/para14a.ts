// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Überführt die konfigurierte §14a-Anforderung in Begrenzungen für steuerbare Verbraucher und veröffentlicht den wirksamen Zustand.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/para14a.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/para14a.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/para14a.js`.
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

'use strict';

const { BaseModule } = require('./base');
const { applySetpoint } = require('../consumers');
const { resolvePara14aSignal, buildPara14aConstraintSnapshot } = require('../../lib/ts-mirrors/ems/para14a/para14a-constraint');
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, dflt = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}

function finiteOrNull(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' && !v.trim()) return null;
    if (typeof v === 'boolean') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
/**
 * Code-Teil: clamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (n < minV) return minV;
    if (n > maxV) return maxV;
    return n;
}
/**
 * Code-Teil: safeIdPart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeIdPart(s) {
    const v = String(s || '').trim();
    if (!v) return '';
    // Keep in sync with Charging-Management's toSafeIdPart()
    return v.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
/**
 * Code-Teil: normalizeConsumerType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeConsumerType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'wärmepumpe' || s === 'waermepumpe' || s === 'heatpump' || s === 'hp' || s === 'wp') return 'heatPump';
    if (s === 'heizstab' || s === 'heaterrod' || s === 'rod') return 'heatingRod';
    if (s === 'klima' || s === 'klimageraet' || s === 'klimagerät' || s === 'aircondition' || s === 'ac') return 'airCondition';
    if (s === 'speicher' || s === 'storage' || s === 'battery') return 'storage';
    return 'custom';
}
/**
 * Code-Teil: normalizeControlType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeControlType(t) {
    const s = String(t || '').trim().toLowerCase();
    if (s === 'onoff' || s === 'on/off' || s === 'switch' || s === 'enable' || s === 'aus' || s === 'sperren') return 'onOff';
    return 'limitW';
}
/**
 * Code-Teil: getGzf
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getGzf(nSteuVE) {
    const n = Math.max(1, Math.round(Number(nSteuVE) || 1));
    if (n <= 1) return 1;
    if (n === 2) return 0.8;
    if (n === 3) return 0.75;
    if (n === 4) return 0.7;
    if (n === 5) return 0.65;
    if (n === 6) return 0.6;
    if (n === 7) return 0.55;
    if (n === 8) return 0.5;
    return 0.45; // >=9
}

/**
 * §14a EnWG helper module.
 *
 * Goals:
 * - Provide a central, adapter-wide §14a state (active/mode)
 * - Compute minimum power distribution (Pmin,14a) for EMS mode
 * - Expose per-wallbox caps via adapter._para14a for Charging-Management
 * - Optionally write setpoints to additional "steuerbare Verbrauchseinrichtungen" (e.g. WP/Heizstab/Klima)
 */
/**
 * Code-Teil: Klasse `Para14aModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: Para14aModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: Para14aModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class Para14aModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._loads = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        this._activeDpKey = '';
        this._emsSetpointDpKey = '';
        this._initialized = false;
        this._signalMemory = { lastFreshActive: null, lastFreshTs: null };
        this._audit = {
            historyInstance: '',
            historyReady: false,
            retentionTargetDays: 730,
            eventSeq: 0,
            traceSeq: 0,
            sessionId: '',
            sessionStartedAt: 0,
            lastTraceAt: 0,
            lastControlSnapshot: null,
            lastControlSignature: '',
        };
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _isEnabled
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _isEnabled() {
        return !!this.adapter?.config?.installerConfig?.para14a;
    }
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getCfg() {
        const cfg = this.adapter?.config?.installerConfig || {};
        return cfg && typeof cfg === 'object' ? cfg : {};
    }

    /**
     * Code-Teil: Methode `_setState`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _setState(id, val, options = {}) {
        const force = !!options.force;
        const ts = Number(options.ts) || Date.now();
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (!force && prev === v) return false;
        this._stateCache.set(id, v); if (this._stateCache.size > 1000) { const __rc85Oldest = this._stateCache.keys().next().value; if (__rc85Oldest !== undefined) this._stateCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
        await this.adapter.setStateAsync(id, { val: v, ack: true, ts });
        try {
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue(id, v, ts);
            }
        } catch {
            // ignore
        }
        return true;
    }

    /**
     * Code-Teil: Methode `_setStateIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setStateIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setStateIfChanged(id, val) {
        return this._setState(id, val, { force: false });
    }
    /**
     * Code-Teil: _setStateForced
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setStateForced(id, val, ts) {
        return this._setState(id, val, { force: true, ts });
    }

    /**
     * Code-Teil: Methode `_roundW`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _roundW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _roundW(v, dflt = 0) {
        const n = Number(v);
        return Number.isFinite(n) ? Math.round(n) : dflt;
    }
    /**
     * Code-Teil: _limitJsonText
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _limitJsonText(v, maxLen = 6000) {
        let s = '';
        try {
            s = (typeof v === 'string') ? v : JSON.stringify(v);
        } catch {
            s = '';
        }
        if (!maxLen || !Number.isFinite(maxLen) || maxLen < 256) maxLen = 6000;
        return s.length > maxLen ? `${s.slice(0, maxLen)}...` : s;
    }

    /**
     * Code-Teil: Methode `_getAdapterNumberFromCache`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAdapterNumberFromCache
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAdapterNumberFromCache(key, dflt = 0) {
        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const n = this.adapter._nwGetNumberFromCache(key);
                if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
        } catch {
            // ignore
        }

        try {
            const rec = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[key] : null;
            const n = Number(rec && rec.value);
            if (Number.isFinite(n)) return n;
        } catch {
            // ignore
        }

        return dflt;
    }

    /**
     * Code-Teil: _newAuditSessionId
     * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    _newAuditSessionId(ts = Date.now()) {
        return `p14a-${Math.round(ts).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /**
     * Code-Teil: Methode `_getAuditControlSignature`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAuditControlSignature
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAuditControlSignature(snapshot) {
        const s = snapshot && typeof snapshot === 'object' ? snapshot : {};
        return JSON.stringify({
            active: !!s.active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: this._roundW(s.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(s.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(s.minPerDeviceW, 0),
            pMinW: this._roundW(s.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(s.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(s.evcsCount, 0))),
        });
    }

    /**
     * Code-Teil: Methode `_buildAuditSnapshot`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildAuditSnapshot
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildAuditSnapshot(data) {
        const s = data && typeof data === 'object' ? data : {};
        const active = !!s.active;
        const failedConsumers = Array.isArray(s.failedConsumers)
            ? s.failedConsumers.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10)
            : [];

        return {
            active,
            source: String(s.source || ''),
            mode: String(s.mode || ''),
            requestedTotalBudgetW: active ? this._roundW(s.requestedTotalBudgetW, 0) : 0,
            effectiveEvcsCapW: active ? this._roundW(s.effectiveEvcsCapW, 0) : 0,
            minPerDeviceW: active ? this._roundW(s.minPerDeviceW, 0) : 0,
            pMinW: active ? this._roundW(s.pMinW, 0) : 0,
            nSteuVE: active ? Math.max(0, Math.round(num(s.nSteuVE, 0))) : 0,
            evcsCount: active ? Math.max(0, Math.round(num(s.evcsCount, 0))) : 0,
            evPowerW: this._roundW(s.evPowerW, 0),
            gridPowerW: this._roundW(s.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(s.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(s.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(s.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(s.consumerWriteFailedCount, 0))),
            failedConsumers,
        };
    }

    /**
     * Code-Teil: Methode `_getAuditChangeReason`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getAuditChangeReason
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAuditChangeReason(prev, next, fallback = 'update') {
        const p = prev && typeof prev === 'object' ? prev : null;
        const n = next && typeof next === 'object' ? next : {};

        if (!p) return fallback;
        if (!p.active && n.active) return 'activate';
        if (p.active && !n.active) return 'release';

        const reasons = [];
        if (p.source !== n.source) reasons.push('source');
        if (p.mode !== n.mode) reasons.push('mode');
        if (p.requestedTotalBudgetW !== n.requestedTotalBudgetW) reasons.push('budget');
        if (p.effectiveEvcsCapW !== n.effectiveEvcsCapW) reasons.push('evcs_cap');
        if (p.minPerDeviceW !== n.minPerDeviceW) reasons.push('min_per_device');
        if (p.pMinW !== n.pMinW) reasons.push('pmin');
        if (p.nSteuVE !== n.nSteuVE) reasons.push('nsteuve');
        if (p.evcsCount !== n.evcsCount) reasons.push('evcs_count');
        return reasons.length ? reasons.slice(0, 3).join('+') : fallback;
    }

    /**
     * Code-Teil: Methode `_initAuditLoggingStates`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _initAuditLoggingStates
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _initAuditLoggingStates(mk) {
        await this.adapter.setObjectNotExistsAsync('para14a.audit', {
            type: 'channel',
            common: { name: '§14a Nachweislog' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('para14a.trace', {
            type: 'channel',
            common: { name: '§14a Verlauf' },
            native: {},
        });

        await mk('para14a.audit.historyEnabled', 'Historie/Influx erkannt', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyInstance', 'Historien-Instanz', 'string', 'text', false);
        await mk('para14a.audit.historyDedicated', 'Eigene §14a Influx-Instanz', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyAutoProvisioned', 'Separate Influx-Bereitstellung', 'boolean', 'indicator', false);
        await mk('para14a.audit.historyProvisionState', 'Historien-Bindungsstatus', 'string', 'text', false);
        await mk('para14a.audit.historyProvisionError', 'Historien-Hinweis/Fehler', 'string', 'text', false);
        await mk('para14a.audit.retentionTargetDays', 'Retention-Ziel (Tage)', 'number', 'value.interval', false, 'd');
        await mk('para14a.audit.sessionActive', '§14a Sitzung aktiv', 'boolean', 'indicator', false);
        await mk('para14a.audit.currentSessionId', 'Aktuelle/letzte Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.audit.eventSeq', 'Ereignis-Sequenz', 'number', 'value', false);
        await mk('para14a.audit.lastEventTs', 'Letztes Ereignis (ts)', 'number', 'value.time', false);
        await mk('para14a.audit.lastEventType', 'Letzter Ereignistyp', 'string', 'text', false);
        await mk('para14a.audit.lastReason', 'Letzter Grund', 'string', 'text', false);
        await mk('para14a.audit.lastSource', 'Letzte Quelle', 'string', 'text', false);
        await mk('para14a.audit.lastMode', 'Letzter Modus', 'string', 'text', false);
        await mk('para14a.audit.lastRequestedTotalBudgetW', 'Letztes Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastEffectiveEvcsCapW', 'Letztes EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastMinPerDeviceW', 'Letzte Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastPMinW', 'Letztes Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastNSteuVE', 'Letzte nSteuVE', 'number', 'value', false);
        await mk('para14a.audit.lastEvcsCount', 'Letzte EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.audit.lastEvPowerW', 'Letzte EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastGridPowerW', 'Letzte Netzleistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.audit.lastConsumerAppliedCount', 'Letzte erfolgreich angewendete Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerFailedCount', 'Letzte fehlgeschlagene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerSkippedCount', 'Letzte übersprungene Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastConsumerWriteFailedCount', 'Letzte Schreibfehler Verbraucher', 'number', 'value', false);
        await mk('para14a.audit.lastResult', 'Letztes Ergebnis', 'string', 'text', false);
        await mk('para14a.audit.lastJson', 'Letztes Ereignis (JSON)', 'string', 'json', false);

        await mk('para14a.trace.seq', 'Trace-Sequenz', 'number', 'value', false);
        await mk('para14a.trace.sampleTs', 'Trace-Zeitstempel', 'number', 'value.time', false);
        await mk('para14a.trace.active', '§14a aktiv', 'boolean', 'indicator', false);
        await mk('para14a.trace.sessionId', 'Sitzungs-ID', 'string', 'text', false);
        await mk('para14a.trace.source', 'Quelle', 'string', 'text', false);
        await mk('para14a.trace.mode', 'Modus', 'string', 'text', false);
        await mk('para14a.trace.requestedTotalBudgetW', 'Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.effectiveEvcsCapW', 'Effektives EVCS-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.pMinW', 'Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.nSteuVE', 'nSteuVE', 'number', 'value', false);
        await mk('para14a.trace.evcsCount', 'EVCS-Anzahl', 'number', 'value', false);
        await mk('para14a.trace.evPowerW', 'EV-Leistung (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.trace.gridPowerW', 'Netzleistung (W)', 'number', 'value.power', false, 'W');
    }

    /**
     * Code-Teil: Methode `_setupAuditHistory`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setupAuditHistory
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setupAuditHistory() {
        let historyInstance = '';
        let dedicatedHistory = false;
        let autoProvisioned = false;
        let provisionState = '';
        let provisionError = '';

        try {
            if (this.adapter && typeof this.adapter._nwEnsurePara14aInfluxInstance === 'function') {
                const historyInfo = await this.adapter._nwEnsurePara14aInfluxInstance();
                if (historyInfo && typeof historyInfo === 'object') {
                    historyInstance = String(historyInfo.instance || '').trim();
                    dedicatedHistory = historyInfo.dedicated === true;
                    autoProvisioned = historyInfo.autoProvisioned === true;
                    provisionState = String(historyInfo.provisionState || '').trim();
                    provisionError = String(historyInfo.provisionError || '').trim();
                }
            }
        } catch (e) {
            provisionState = provisionState || 'provision_error';
            provisionError = String(e?.message || e || '').trim();
        }

        if (!historyInstance) {
            try {
                if (this.adapter && typeof this.adapter._nwDetectInfluxInstance === 'function') {
                    historyInstance = String((await this.adapter._nwDetectInfluxInstance()) || '').trim();
                    if (historyInstance && !provisionState) provisionState = 'fallback_existing';
                }
            } catch {
                historyInstance = '';
            }
        }

        const historyReady = !!historyInstance && !!(this.adapter && typeof this.adapter._nwEnsureInfluxCustom === 'function');
        this._audit.historyInstance = historyInstance;
        this._audit.historyReady = historyReady;

        await this._setStateIfChanged('para14a.audit.historyEnabled', historyReady);
        await this._setStateIfChanged('para14a.audit.historyInstance', historyInstance);
        await this._setStateIfChanged('para14a.audit.historyDedicated', dedicatedHistory);
        await this._setStateIfChanged('para14a.audit.historyAutoProvisioned', autoProvisioned);
        await this._setStateIfChanged('para14a.audit.historyProvisionState', provisionState);
        await this._setStateIfChanged('para14a.audit.historyProvisionError', provisionError);
        await this._setStateIfChanged('para14a.audit.retentionTargetDays', this._audit.retentionTargetDays);

        if (!historyReady) return;

        const metaIds = [
            'para14a.audit.historyEnabled',
            'para14a.audit.historyInstance',
            'para14a.audit.historyDedicated',
            'para14a.audit.historyAutoProvisioned',
            'para14a.audit.historyProvisionState',
            'para14a.audit.historyProvisionError',
            'para14a.audit.retentionTargetDays',
        ];

        const eventIds = [
            'para14a.audit.sessionActive',
            'para14a.audit.currentSessionId',
            'para14a.audit.eventSeq',
            'para14a.audit.lastEventTs',
            'para14a.audit.lastEventType',
            'para14a.audit.lastReason',
            'para14a.audit.lastSource',
            'para14a.audit.lastMode',
            'para14a.audit.lastRequestedTotalBudgetW',
            'para14a.audit.lastEffectiveEvcsCapW',
            'para14a.audit.lastMinPerDeviceW',
            'para14a.audit.lastPMinW',
            'para14a.audit.lastNSteuVE',
            'para14a.audit.lastEvcsCount',
            'para14a.audit.lastEvPowerW',
            'para14a.audit.lastGridPowerW',
            'para14a.audit.lastConsumerAppliedCount',
            'para14a.audit.lastConsumerFailedCount',
            'para14a.audit.lastConsumerSkippedCount',
            'para14a.audit.lastConsumerWriteFailedCount',
            'para14a.audit.lastResult',
        ];

        const traceIds = [
            'para14a.trace.seq',
            'para14a.trace.sampleTs',
            'para14a.trace.active',
            'para14a.trace.sessionId',
            'para14a.trace.source',
            'para14a.trace.mode',
            'para14a.trace.requestedTotalBudgetW',
            'para14a.trace.effectiveEvcsCapW',
            'para14a.trace.minPerDeviceW',
            'para14a.trace.pMinW',
            'para14a.trace.nSteuVE',
            'para14a.trace.evcsCount',
            'para14a.trace.evPowerW',
            'para14a.trace.gridPowerW',
        ];

        for (const id of metaIds) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: true });
        }
        for (const id of [...eventIds, ...traceIds]) {
            await this.adapter._nwEnsureInfluxCustom(id, historyInstance, { changesOnly: false });
        }
    }

    /**
     * Code-Teil: Methode `_emitAuditEvent`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _emitAuditEvent
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _emitAuditEvent(snapshot, eventType, reason, result) {
        const ts = Date.now();
        const eventSeq = Math.max(1, Math.round(num(this._audit.eventSeq, 0)) + 1);
        this._audit.eventSeq = eventSeq;

        const payload = {
            seq: eventSeq,
            ts,
            eventType,
            reason,
            result,
            sessionId: this._audit.sessionId || '',
            active: !!snapshot.active,
            source: String(snapshot.source || ''),
            mode: String(snapshot.mode || ''),
            requestedTotalBudgetW: this._roundW(snapshot.requestedTotalBudgetW, 0),
            effectiveEvcsCapW: this._roundW(snapshot.effectiveEvcsCapW, 0),
            minPerDeviceW: this._roundW(snapshot.minPerDeviceW, 0),
            pMinW: this._roundW(snapshot.pMinW, 0),
            nSteuVE: Math.max(0, Math.round(num(snapshot.nSteuVE, 0))),
            evcsCount: Math.max(0, Math.round(num(snapshot.evcsCount, 0))),
            evPowerW: this._roundW(snapshot.evPowerW, 0),
            gridPowerW: this._roundW(snapshot.gridPowerW, 0),
            consumerAppliedCount: Math.max(0, Math.round(num(snapshot.consumerAppliedCount, 0))),
            consumerFailedCount: Math.max(0, Math.round(num(snapshot.consumerFailedCount, 0))),
            consumerSkippedCount: Math.max(0, Math.round(num(snapshot.consumerSkippedCount, 0))),
            consumerWriteFailedCount: Math.max(0, Math.round(num(snapshot.consumerWriteFailedCount, 0))),
            failedConsumers: Array.isArray(snapshot.failedConsumers) ? snapshot.failedConsumers.slice(0, 10) : [],
        };

        await this._setStateForced('para14a.audit.sessionActive', !!payload.active, ts);
        await this._setStateForced('para14a.audit.currentSessionId', payload.sessionId, ts);
        await this._setStateForced('para14a.audit.eventSeq', payload.seq, ts);
        await this._setStateForced('para14a.audit.lastEventTs', payload.ts, ts);
        await this._setStateForced('para14a.audit.lastEventType', payload.eventType, ts);
        await this._setStateForced('para14a.audit.lastReason', payload.reason, ts);
        await this._setStateForced('para14a.audit.lastSource', payload.source, ts);
        await this._setStateForced('para14a.audit.lastMode', payload.mode, ts);
        await this._setStateForced('para14a.audit.lastRequestedTotalBudgetW', payload.requestedTotalBudgetW, ts);
        await this._setStateForced('para14a.audit.lastEffectiveEvcsCapW', payload.effectiveEvcsCapW, ts);
        await this._setStateForced('para14a.audit.lastMinPerDeviceW', payload.minPerDeviceW, ts);
        await this._setStateForced('para14a.audit.lastPMinW', payload.pMinW, ts);
        await this._setStateForced('para14a.audit.lastNSteuVE', payload.nSteuVE, ts);
        await this._setStateForced('para14a.audit.lastEvcsCount', payload.evcsCount, ts);
        await this._setStateForced('para14a.audit.lastEvPowerW', payload.evPowerW, ts);
        await this._setStateForced('para14a.audit.lastGridPowerW', payload.gridPowerW, ts);
        await this._setStateForced('para14a.audit.lastConsumerAppliedCount', payload.consumerAppliedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerFailedCount', payload.consumerFailedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerSkippedCount', payload.consumerSkippedCount, ts);
        await this._setStateForced('para14a.audit.lastConsumerWriteFailedCount', payload.consumerWriteFailedCount, ts);
        await this._setStateForced('para14a.audit.lastResult', payload.result, ts);
        await this._setStateForced('para14a.audit.lastJson', this._limitJsonText(payload, 7000), ts);

        try {
            if (this.adapter && this.adapter.log && typeof this.adapter.log.info === 'function') {
                this.adapter.log.info(`[§14a/audit] ${eventType} (${reason}) session=${payload.sessionId || '-'} cap=${payload.effectiveEvcsCapW}W budget=${payload.requestedTotalBudgetW}W result=${payload.result}`);
            }
        } catch {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_writeAuditTrace`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _writeAuditTrace
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _writeAuditTrace(snapshot, force = false) {
        const now = Date.now();
        const shouldWrite = !!force || (!!snapshot.active && (now - Number(this._audit.lastTraceAt || 0) >= 60000));
        if (!shouldWrite) return;

        this._audit.lastTraceAt = now;
        const seq = Math.max(1, Math.round(num(this._audit.traceSeq, 0)) + 1);
        this._audit.traceSeq = seq;

        const ts = now;
        await this._setStateForced('para14a.trace.seq', seq, ts);
        await this._setStateForced('para14a.trace.sampleTs', ts, ts);
        await this._setStateForced('para14a.trace.active', !!snapshot.active, ts);
        await this._setStateForced('para14a.trace.sessionId', this._audit.sessionId || '', ts);
        await this._setStateForced('para14a.trace.source', String(snapshot.source || ''), ts);
        await this._setStateForced('para14a.trace.mode', String(snapshot.mode || ''), ts);
        await this._setStateForced('para14a.trace.requestedTotalBudgetW', this._roundW(snapshot.requestedTotalBudgetW, 0), ts);
        await this._setStateForced('para14a.trace.effectiveEvcsCapW', this._roundW(snapshot.effectiveEvcsCapW, 0), ts);
        await this._setStateForced('para14a.trace.minPerDeviceW', this._roundW(snapshot.minPerDeviceW, 0), ts);
        await this._setStateForced('para14a.trace.pMinW', this._roundW(snapshot.pMinW, 0), ts);
        await this._setStateForced('para14a.trace.nSteuVE', Math.max(0, Math.round(num(snapshot.nSteuVE, 0))), ts);
        await this._setStateForced('para14a.trace.evcsCount', Math.max(0, Math.round(num(snapshot.evcsCount, 0))), ts);
        await this._setStateForced('para14a.trace.evPowerW', this._roundW(snapshot.evPowerW, 0), ts);
        await this._setStateForced('para14a.trace.gridPowerW', this._roundW(snapshot.gridPowerW, 0), ts);
    }

    /**
     * Code-Teil: Methode `_handleAuditLogging`
     * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _handleAuditLogging
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _handleAuditLogging(snapshot) {
        const prev = this._audit.lastControlSnapshot;
        const sig = this._getAuditControlSignature(snapshot);
        const prevSig = this._audit.lastControlSignature || '';

        let eventType = '';
        let reason = '';

        if (snapshot.active && !(prev && prev.active)) {
            this._audit.sessionId = this._newAuditSessionId();
            this._audit.sessionStartedAt = Date.now();
            eventType = 'activate';
            reason = this._getAuditChangeReason(prev, snapshot, 'activate');
        } else if (!snapshot.active && prev && prev.active) {
            eventType = 'release';
            reason = this._getAuditChangeReason(prev, snapshot, 'release');
        } else if (snapshot.active && sig !== prevSig) {
            if (!this._audit.sessionId) {
                this._audit.sessionId = this._newAuditSessionId();
                this._audit.sessionStartedAt = Date.now();
            }
            eventType = 'update';
            reason = this._getAuditChangeReason(prev, snapshot, 'update');
        }

        if (eventType) {
            const result = (eventType === 'release')
                ? 'released'
                : (snapshot.consumerFailedCount > 0 || snapshot.consumerWriteFailedCount > 0)
                    ? 'write_failed'
                    : (snapshot.consumerAppliedCount > 0 || snapshot.effectiveEvcsCapW > 0)
                        ? 'applied'
                        : 'ok';
            await this._emitAuditEvent(snapshot, eventType, reason, result);
            await this._writeAuditTrace(snapshot, true);
            if (eventType === 'release') {
                this._audit.sessionId = '';
                this._audit.sessionStartedAt = 0;
            }
        } else {
            await this._writeAuditTrace(snapshot, false);
        }

        this._audit.lastControlSnapshot = Object.assign({}, snapshot);
        this._audit.lastControlSignature = sig;
    }

    /**
     * Code-Teil: Methode `_buildLoadsFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildLoadsFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildLoadsFromConfig() {
        const cfg = this._getCfg();
        const rows = Array.isArray(cfg.para14aConsumers) ? cfg.para14aConsumers : [];

        /** @type {Array<any>} */
        const loads = [];
        const usedIds = new Set();

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i] || {};
            if (r.enabled === false) continue;
            // Seit 0.8.155 werden Ladepunkte, aktive Thermik-/Heizstab-Module und
            // Speicher-Topologien automatisch aus ihren Fachkonfigurationen
            // übernommen. Frühere Auto-Mapping-Zeilen bleiben zur Migration in der
            // Konfiguration erhalten, dürfen aber nicht als zweite SteuVE zählen.
            if (r.automatic === true) continue;

            const name = String(r.name || '').trim();
            const type = normalizeConsumerType(r.type);
            const ctrl = normalizeControlType(r.controlType);

            const setWId = String(r.setPowerWId || r.setWId || '').trim();
            const enableId = String(r.enableId || r.enableWriteId || '').trim();

            // Bekannte Fachmodule duerfen als reine Constraint-Zeile ohne eigenen
            // Hardware-DP konfiguriert werden. Nur ein Custom-Verbraucher benoetigt
            // weiterhin einen expliziten Legacy-Ziel-DP.
            if (!setWId && !enableId && type === 'custom') continue;

            const baseId = safeIdPart(r.key || name || `${type}_${i + 1}`) || `c${i + 1}`;
            let id = baseId;
            let n = 2;
            while (usedIds.has(id)) id = `${baseId}_${n++}`;
            usedIds.add(id);

            const installedPowerW = clamp(num(
                r.installedPowerW
                ?? r.maxPowerW
                ?? r.powerW
                ?? r.ratedW
                ?? 0,
                0,
            ), 0, 1e12);
            const priority = clamp(num(r.priority ?? 100, 100), 1, 999);

            loads.push({
                id,
                key: String(r.key || id),
                name: name || id,
                type,
                controlType: ctrl,
                installedPowerW,
                priority,
                groupId: String(r.groupId || r.para14aGroupId || r.storageConstructId || '').trim(),
                source: String(r.source || 'manual').trim() || 'manual',
                automatic: false,
                setWId,
                enableId,
                // internal dp keys (filled in init)
                setWKey: '',
                enableKey: '',
            });
        }

        // deterministic: priority asc, then name
        loads.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._loads = loads;
    }

    _getStorageControlAuthorityForPara14a() {
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                if (authority && typeof authority === 'object') return authority;
            }
        } catch (_e) {
            // use deterministic fallback below
        }

        const root = (this.adapter && this.adapter.config && typeof this.adapter.config === 'object')
            ? this.adapter.config
            : {};
        const apps = root.emsApps && root.emsApps.apps && typeof root.emsApps.apps === 'object'
            ? root.emsApps.apps
            : {};
        const singleApp = apps.storage && typeof apps.storage === 'object' ? apps.storage : null;
        const singleActive = singleApp
            ? singleApp.installed === true && singleApp.enabled === true
            : root.enableStorageControl === true;
        const farmApp = apps.storagefarm && typeof apps.storagefarm === 'object' ? apps.storagefarm : null;
        const farmEnabled = farmApp
            ? farmApp.installed === true && farmApp.enabled === true
            : root.enableStorageFarm === true;
        const farmCfg = root.storageFarm && typeof root.storageFarm === 'object' ? root.storageFarm : {};
        const farmRows = Array.isArray(farmCfg.storages) ? farmCfg.storages : [];
        const writableRows = farmRows.filter((row) => row && row.enabled !== false && (
            String(row.setSignedPowerId || row.targetPowerObjectId || row.targetPowerId || '').trim()
            || String(row.setChargePowerId || row.targetChargePowerObjectId || row.targetChargePowerId || '').trim()
            || String(row.setDischargePowerId || row.targetDischargePowerObjectId || row.targetDischargePowerId || '').trim()
            || String(row.feneconGridSetpointId || '').trim()
        ));
        const farmDispatchActive = farmEnabled && writableRows.length > 0;
        const selectedTopology = farmDispatchActive ? 'farm' : (singleActive ? 'single' : 'none');
        return {
            selectedTopology,
            writerActive: selectedTopology !== 'none',
            singleAppActive: singleActive,
            farmDispatchActive,
            farm: {
                active: farmEnabled,
                dispatchActive: farmDispatchActive,
                rows: writableRows,
            },
        };
    }

    _singleStorageHasWritableActuatorForPara14a(root, storageCfg) {
        const cfg = storageCfg && typeof storageCfg === 'object' ? storageCfg : {};
        const datapoints = cfg.datapoints && typeof cfg.datapoints === 'object' ? cfg.datapoints : {};
        const directTargets = [
            datapoints.targetPowerObjectId,
            datapoints.targetChargePowerObjectId,
            datapoints.targetDischargePowerObjectId,
            cfg.targetPowerObjectId,
            cfg.targetChargePowerObjectId,
            cfg.targetDischargePowerObjectId,
            datapoints.feneconGridSetpointObjectId,
            cfg.feneconGridSetpointObjectId,
        ];
        if (directTargets.some((value) => String(value || '').trim())) return true;

        const limitTargets = [
            datapoints.maxChargeObjectId,
            datapoints.maxDischargeObjectId,
            cfg.maxChargeObjectId,
            cfg.maxDischargeObjectId,
        ];
        if (limitTargets.some((value) => String(value || '').trim())) return true;

        const enableTargets = [
            datapoints.chargeEnableObjectId,
            datapoints.dischargeEnableObjectId,
            cfg.chargeEnableObjectId,
            cfg.dischargeEnableObjectId,
        ];
        if (enableTargets.some((value) => String(value || '').trim())) return true;

        const vendorProfile = String(cfg.vendorProfile || cfg.manufacturerProfile || '').trim().toLowerCase();
        const e3dcConfigured = cfg.e3dcRscpEnabled === true || vendorProfile === 'e3dc-rscp' || vendorProfile === 'e3dc';
        if (e3dcConfigured) {
            const e3dcTargets = [
                datapoints.e3dcSetPowerModeObjectId,
                datapoints.e3dcSetPowerValueObjectId,
                cfg.e3dcSetPowerModeObjectId,
                cfg.e3dcSetPowerValueObjectId,
            ];
            if (e3dcTargets.some((value) => String(value || '').trim())) return true;
            // The E3/DC adapter mapping can also already be registered in the runtime DP registry.
            try {
                if (this.dp && this.dp.getEntry
                    && this.dp.getEntry('st.e3dcSetPowerMode')
                    && this.dp.getEntry('st.e3dcSetPowerValueW')) return true;
            } catch (_e) {
                // deterministic false fallback below
            }
        }

        try {
            if (this.dp && this.dp.getEntry) {
                const runtimeKeys = [
                    'st.targetPowerW',
                    'st.targetChargePowerW',
                    'st.targetDischargePowerW',
                    'st.maxChargePowerW',
                    'st.maxDischargePowerW',
                    'st.chargeEnable',
                    'st.dischargeEnable',
                    'st.feneconGridSetpointW',
                ];
                if (runtimeKeys.some((key) => {
                    const entry = this.dp.getEntry(key);
                    return !!(entry && String(entry.objectId || '').trim());
                })) return true;
            }
        } catch (_e) {
            // deterministic false fallback below
        }

        void root;
        return false;
    }

    _getAutomaticConsumers() {
        const root = (this.adapter && this.adapter.config && typeof this.adapter.config === 'object')
            ? this.adapter.config
            : {};
        const automatic = [];
        const flowSlots = root.vis && root.vis.flowSlots && typeof root.vis.flowSlots === 'object'
            ? root.vis.flowSlots
            : {};
        const flowConsumers = Array.isArray(flowSlots.consumers) ? flowSlots.consumers : [];
        const isHeatingRodSlot = (slotCfg) => {
            const raw = String(slotCfg && (slotCfg.consumerType || slotCfg.type || slotCfg.category) || '').trim().toLowerCase();
            return ['heatingrod', 'heating_rod', 'heating-rod', 'heizstab', 'rod', 'immersion'].includes(raw);
        };
        const safeSlot = (value, fallback) => Math.max(1, Math.min(10, Math.round(num(value, fallback))));

        if (root.enableThermalControl === true) {
            const thermalCfg = root.thermal && typeof root.thermal === 'object' ? root.thermal : {};
            const rows = Array.isArray(thermalCfg.devices) ? thermalCfg.devices : [];
            rows.forEach((row, index) => {
                if (!row || row.enabled !== true) return;
                const slot = safeSlot(row.slot ?? row.consumerSlot, index + 1);
                const slotCfg = flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object'
                    ? flowConsumers[slot - 1]
                    : {};
                if (isHeatingRodSlot(slotCfg)) return;
                const ctrl = slotCfg.ctrl && typeof slotCfg.ctrl === 'object' ? slotCfg.ctrl : {};
                const hasWritableActuator = !!(
                    String(row.switchWriteId || ctrl.switchWriteId || '').trim()
                    || String(row.setpointWriteId || ctrl.setpointWriteId || '').trim()
                    || String(row.sgReadyAWriteId || row.sgReady1WriteId || ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim()
                    || String(row.sgReadyBWriteId || row.sgReady2WriteId || ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim()
                );
                if (!hasWritableActuator) return;
                const profile = String(row.profile || '').trim().toLowerCase();
                const kind = String(row.kind || row.deviceType || row.type || '').trim().toLowerCase();
                const type = profile === 'cooling'
                    || ['hvac', 'klima', 'ac', 'aircondition', 'air_condition'].includes(kind)
                    ? 'airCondition'
                    : 'heatPump';
                const installedPowerW = clamp(num(
                    row.maxPowerW
                    ?? row.estimatedPowerW
                    ?? row.boostPowerW
                    ?? 0,
                    0,
                ), 0, 1e12);
                const actuatorIds = [
                    row.switchWriteId,
                    row.setpointWriteId,
                    row.sgReadyAWriteId,
                    row.sgReady1WriteId,
                    row.sgReadyBWriteId,
                    row.sgReady2WriteId,
                    ctrl.switchWriteId,
                    ctrl.setpointWriteId,
                    ctrl.sgReadyAWriteId,
                    ctrl.sgReady1WriteId,
                    ctrl.sgReadyBWriteId,
                    ctrl.sgReady2WriteId,
                ].map((value) => String(value || '').trim()).filter(Boolean);
                automatic.push({
                    id: `auto-thermal-c${slot}`,
                    type,
                    controlType: 'limitW',
                    installedPowerW,
                    priority: clamp(num(row.priority ?? (100 + slot), 100 + slot), 1, 999),
                    source: 'thermal-control',
                    automatic: true,
                    actuatorIds,
                });
            });
        }

        if (root.enableHeatingRodControl === true) {
            const heatingCfg = root.heatingRod && typeof root.heatingRod === 'object' ? root.heatingRod : {};
            const rows = Array.isArray(heatingCfg.devices) ? heatingCfg.devices : [];
            rows.forEach((row, index) => {
                if (!row || row.enabled !== true) return;
                const slot = safeSlot(row.slot ?? row.consumerSlot, index + 1);
                const slotCfg = flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object'
                    ? flowConsumers[slot - 1]
                    : {};
                if (!isHeatingRodSlot(slotCfg)) return;
                const stages = Array.isArray(row.stages) ? row.stages : [];
                const ctrl = slotCfg.ctrl && typeof slotCfg.ctrl === 'object' ? slotCfg.ctrl : {};
                const hasStageWrite = stages.some((stage) => stage && String(stage.writeId || stage.dpWriteId || stage.writeDp || '').trim())
                    || Object.keys(ctrl).some((key) => /^(?:heating)?stage\d+writeid$/i.test(key) && String(ctrl[key] || '').trim())
                    || !!String(ctrl.switchWriteId || '').trim();
                if (!hasStageWrite) return;
                const stagePowerW = stages.reduce((sum, stage) => sum + Math.max(0, num(stage && stage.powerW, 0)), 0);
                const installedPowerW = clamp(num(
                    row.maxPowerW
                    ?? (stagePowerW > 0 ? stagePowerW : null)
                    ?? 0,
                    0,
                ), 0, 1e12);
                const actuatorIds = [
                    ...stages.flatMap((stage) => stage ? [stage.writeId, stage.dpWriteId, stage.writeDp] : []),
                    ctrl.switchWriteId,
                    ctrl.setpointWriteId,
                    ...Object.keys(ctrl)
                        .filter((key) => /^(?:heating)?stage\d+writeid$/i.test(key))
                        .map((key) => ctrl[key]),
                ].map((value) => String(value || '').trim()).filter(Boolean);
                automatic.push({
                    id: `auto-heating-rod-c${slot}`,
                    type: 'heatingRod',
                    controlType: 'limitW',
                    installedPowerW,
                    priority: clamp(num(row.priority ?? (200 + slot), 200 + slot), 1, 999),
                    source: 'heating-rod-control',
                    automatic: true,
                    actuatorIds,
                });
            });
        }

        const storageAuthority = this._getStorageControlAuthorityForPara14a();
        const selectedTopology = String(storageAuthority && storageAuthority.selectedTopology || 'none');
        if (selectedTopology === 'single') {
            const storageCfg = root.storage && typeof root.storage === 'object' ? root.storage : {};
            const hasWritableStorageActuator = this._singleStorageHasWritableActuatorForPara14a(root, storageCfg);
            if (storageCfg.allowGridCharge !== false && hasWritableStorageActuator) {
                const datapoints = storageCfg.datapoints && typeof storageCfg.datapoints === 'object'
                    ? storageCfg.datapoints
                    : {};
                const actuatorIds = [
                    datapoints.targetPowerObjectId,
                    datapoints.targetChargePowerObjectId,
                    datapoints.targetDischargePowerObjectId,
                    datapoints.maxChargeObjectId,
                    datapoints.maxDischargeObjectId,
                    datapoints.chargeEnableObjectId,
                    datapoints.dischargeEnableObjectId,
                    datapoints.feneconGridSetpointObjectId,
                    datapoints.e3dcSetPowerModeObjectId,
                    datapoints.e3dcSetPowerValueObjectId,
                    storageCfg.targetPowerObjectId,
                    storageCfg.targetChargePowerObjectId,
                    storageCfg.targetDischargePowerObjectId,
                    storageCfg.maxChargeObjectId,
                    storageCfg.maxDischargeObjectId,
                    storageCfg.chargeEnableObjectId,
                    storageCfg.dischargeEnableObjectId,
                    storageCfg.feneconGridSetpointObjectId,
                    storageCfg.e3dcSetPowerModeObjectId,
                    storageCfg.e3dcSetPowerValueObjectId,
                ].map((value) => String(value || '').trim()).filter(Boolean);
                automatic.push({
                    id: 'auto-storage-single',
                    type: 'storage',
                    controlType: 'limitW',
                    installedPowerW: clamp(num(
                        storageCfg.maxChargeW
                        ?? storageCfg.ratedPowerW
                        ?? storageCfg.selfMaxChargeW
                        ?? 0,
                        0,
                    ), 0, 1e12),
                    priority: clamp(num(storageCfg.para14aPriority ?? 150, 150), 1, 999),
                    groupId: String(storageCfg.para14aGroupId || storageCfg.storageConstructId || '').trim(),
                    source: 'storage-control-single',
                    automatic: true,
                    actuatorIds,
                });
            }
        } else if (selectedTopology === 'farm') {
            const storageFarmCfg = root.storageFarm && typeof root.storageFarm === 'object' ? root.storageFarm : {};
            if (storageFarmCfg.allowGridCharge !== false) {
                const authorityRows = storageAuthority && storageAuthority.farm && Array.isArray(storageAuthority.farm.rows)
                    ? storageAuthority.farm.rows
                    : [];
                const rows = authorityRows.length
                    ? authorityRows
                    : (Array.isArray(storageFarmCfg.storages) ? storageFarmCfg.storages : []);
                rows.forEach((row, index) => {
                    if (!row || row.enabled === false) return;
                    const writable = !!(
                        String(row.setSignedPowerId || row.targetPowerObjectId || row.targetPowerId || '').trim()
                        || String(row.setChargePowerId || row.targetChargePowerObjectId || row.targetChargePowerId || '').trim()
                        || String(row.setDischargePowerId || row.targetDischargePowerObjectId || row.targetDischargePowerId || '').trim()
                        || String(row.feneconGridSetpointId || '').trim()
                    );
                    if (!writable) return;
                    const actuatorIds = [
                        row.setSignedPowerId,
                        row.targetPowerObjectId,
                        row.targetPowerId,
                        row.setChargePowerId,
                        row.targetChargePowerObjectId,
                        row.targetChargePowerId,
                        row.setDischargePowerId,
                        row.targetDischargePowerObjectId,
                        row.targetDischargePowerId,
                        row.feneconGridSetpointId,
                    ].map((value) => String(value || '').trim()).filter(Boolean);
                    automatic.push({
                        id: `auto-storage-farm-${safeIdPart(row.key || row.name || index + 1) || (index + 1)}`,
                        type: 'storage',
                        controlType: 'limitW',
                        installedPowerW: clamp(num(
                            row.maxChargeW
                            ?? row.maxChargePowerW
                            ?? row.maxPowerW
                            ?? row.ratedPowerW
                            ?? 0,
                            0,
                        ), 0, 1e12),
                        priority: clamp(num(row.para14aPriority ?? row.priority ?? (150 + index), 150 + index), 1, 999),
                        // Nur eine ausdrückliche §14a-/Speicherkonstrukt-ID fasst
                        // mehrere physische Speicher zu einer SteuVE zusammen. Die
                        // operative Farm-Gruppe ist dafür bewusst nicht ausreichend.
                        groupId: String(row.para14aGroupId || row.storageConstructId || '').trim(),
                        source: 'storage-control-farm',
                        automatic: true,
                        actuatorIds,
                    });
                });
            }
        }

        automatic.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
        return automatic;
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
        // Create states always (even if the module is disabled) to make troubleshooting easier.
        await this.adapter.setObjectNotExistsAsync('para14a', {
            type: 'channel',
            common: { name: '§14a EnWG' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type, role, writable = false, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!writable,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('para14a.active', '§14a aktiv (wirksam)', 'boolean', 'indicator', false);
        await mk('para14a.forceZero', '§14a erzwingt 0 W', 'boolean', 'indicator', false);
        await mk('para14a.emergencyStop', '§14a Sicherheitsstopp', 'boolean', 'indicator', false);
        await mk('para14a.localFailsafeActive', 'Lokaler §14a-Failsafe aktiv', 'boolean', 'indicator', false);
        await mk('para14a.communicationFallbackActive', '§14a Kommunikations-Fallback aktiv', 'boolean', 'indicator', false);
        await mk('para14a.communicationFallbackReason', '§14a Kommunikations-Fallback Grund', 'string', 'text', false);
        await mk('para14a.fallbackEvcsCapW', '§14a Fallback EVCS-Gesamtbudget (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.mode', '§14a Modus', 'string', 'text', false);
        await mk('para14a.controlSource', '§14a Quelle', 'string', 'text', false);
        await mk('para14a.minPerDeviceW', 'Mindestleistung je Verbraucher (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.nSteuVE', 'Anzahl steuerbare Verbrauchseinrichtungen (nSteuVE)', 'number', 'value', false);
        await mk('para14a.gzf', 'Gleichzeitigkeitsfaktor (GZF)', 'number', 'value', false);
        await mk('para14a.pMinW', 'Mindestleistung gesamt Pmin,14a (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.emsSetpointW', 'Sollwert EMS (W) (optional)', 'number', 'value.power', false, 'W');
        await mk('para14a.evcsTotalCapW', 'EVCS Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.totalCapW', '§14a Gesamtlimit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.storageChargeCapW', '§14a Speicher-Ladegrenze (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.thermalCapW', '§14a Thermik-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.heatingRodCapW', '§14a Heizstab-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.airConditionCapW', '§14a Klima-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.customCapW', '§14a Legacy-/Custom-Limit (W)', 'number', 'value.power', false, 'W');
        await mk('para14a.signalFresh', '§14a Signal frisch', 'boolean', 'indicator', false);
        await mk('para14a.signalAgeMs', '§14a Signalalter (ms)', 'number', 'value.interval', false, 'ms');
        await mk('para14a.signalStatus', '§14a Signalstatus', 'string', 'text', false);
        await mk('para14a.stalePolicy', '§14a Stale-Policy', 'string', 'text', false);
        await mk('para14a.constraintOnly', '§14a als zentraler Constraint', 'boolean', 'indicator', false);
        await mk('para14a.legacyDirectWritesEnabled', 'Legacy-Direktwrites aktiv', 'boolean', 'indicator', false);
        await mk('para14a.unmanagedConsumerCount', 'Nicht zentral angebundene §14a-Verbraucher', 'number', 'value', false);
        await mk('para14a.automaticConsumerCount', 'Automatisch angebundene §14a-Verbraucher', 'number', 'value', false);
        await mk('para14a.manualConsumerCount', 'Zusätzliche manuelle §14a-Verbraucher', 'number', 'value', false);
        await mk('para14a.automaticConsumersJson', 'Automatisch angebundene §14a-Verbraucher (JSON)', 'string', 'text', false);
        await mk('para14a.debug', 'Debug (JSON)', 'string', 'text', false);
        await this._initAuditLoggingStates(mk);

        // Load config and upsert dp mappings
        this._buildLoadsFromConfig();

        const cfg = this._getCfg();

        // Optional activation datapoint
        const activeId = String(cfg.para14aActiveId || '').trim();
        if (activeId && this.dp) {
            this._activeDpKey = 'p14a.active';
            await this.dp.upsert({ key: this._activeDpKey, objectId: activeId, dataType: 'mixed', direction: 'in' });
        } else {
            this._activeDpKey = '';
        }

        // Optional EMS setpoint datapoint (total allowed max net power for all steuVE)
        const spId = String(cfg.para14aEmsSetpointWId || '').trim();
        if (spId && this.dp) {
            this._emsSetpointDpKey = 'p14a.emsSetpointW';
            await this.dp.upsert({ key: this._emsSetpointDpKey, objectId: spId, dataType: 'number', direction: 'in', unit: 'W' });
        } else {
            this._emsSetpointDpKey = '';
        }

        // Upsert datapoints for load actuation
        for (const l of this._loads) {
            const baseKey = `p14a.${l.id}`;
            try {
                if (l.setWId) {
                    const k = `${baseKey}.setW`;
                    await this.dp?.upsert({ key: k, objectId: l.setWId, dataType: 'number', direction: 'out', unit: 'W', deadband: 25 });
                    l.setWKey = k;
                }
                if (l.enableId) {
                    const k = `${baseKey}.enable`;
                    await this.dp?.upsert({ key: k, objectId: l.enableId, dataType: 'boolean', direction: 'out' });
                    l.enableKey = k;
                }

                // Visible states for last applied target
                await this.adapter.setObjectNotExistsAsync(`para14a.consumers.${l.id}`, {
                    type: 'channel',
                    common: { name: l.name },
                    native: {},
                });
                await mk(`para14a.consumers.${l.id}.type`, 'Typ', 'string', 'text', false);
                await mk(`para14a.consumers.${l.id}.targetW`, 'Sollwert (W)', 'number', 'value.power', false, 'W');
                await mk(`para14a.consumers.${l.id}.applied`, 'Angewendet', 'boolean', 'indicator', false);
                await mk(`para14a.consumers.${l.id}.status`, 'Status', 'string', 'text', false);
            } catch (e) {
                this.adapter.log.warn(`[§14a] datapoint init failed for '${l.name}': ${e?.message || e}`);
            }
        }

        await this._setupAuditHistory();
        this._initialized = true;
    }

    /**
     * Code-Teil: Methode `_readActiveSignal`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readActiveSignal
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readActiveSignal() {
        const cfg = this._getCfg();

        // Die direkte EEBUS-/CLS-Schnittstelle hat Vorrang vor manuellen
        // Datenpunkt-Mappings. Der EEBUS-Adapter überwacht Heartbeat,
        // Gültigkeit und Failsafe und übergibt den bereits normalisierten
        // LPC-Befehl im Arbeitsspeicher an EOS.
        try {
            const direct = typeof this.adapter?._nwGetPara14aEebusIngress === 'function'
                ? this.adapter._nwGetPara14aEebusIngress()
                : null;
            if (direct && direct.available === true) {
                const active = direct.active === true;
                const ageMs = Number.isFinite(Number(direct.ageMs)) ? Math.max(0, Number(direct.ageMs)) : null;
                return {
                    active,
                    fresh: direct.fresh === true,
                    stale: direct.stale === true,
                    source: `eebus-direct:${String(direct.sourceInstance || 'eebus')}/${String(direct.sourceDeviceId || 'cls')}`,
                    reason: String(direct.status || direct.reason || (active ? 'direct-active' : 'direct-release')),
                    ageMs,
                    lastFreshActive: active,
                    lastFreshTs: Number.isFinite(Number(direct.receivedAtMs)) ? Number(direct.receivedAtMs) : Date.now(),
                    stalePolicy: String(direct.stalePolicy || 'gateway-supervised-hold-active'),
                    direct: true,
                    directIngress: direct,
                };
            }
        } catch (_directError) {
            // Das vorhandene manuelle DP-Fallback bleibt verfügbar.
        }

        const maxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSignalMaxAgeSec, 30) * 1000));
        const mapped = !!(this._activeDpKey && this.dp);
        const rawValue = mapped ? this.dp.getRaw(this._activeDpKey, null) : null;
        const ageMs = mapped && typeof this.dp.getAgeMs === 'function' ? this.dp.getAgeMs(this._activeDpKey) : null;
        const resolution = resolvePara14aSignal({
            enabled: !!cfg.para14a,
            mapped,
            rawValue,
            ageMs,
            maxAgeMs,
            assumeActiveWithoutSignal: cfg.para14aAssumeActiveWithoutSignal === true,
            stalePolicy: cfg.para14aStalePolicy || 'local-pmin',
            lastFreshActive: this._signalMemory.lastFreshActive,
            lastFreshTs: this._signalMemory.lastFreshTs,
            nowMs: Date.now(),
        });
        if (resolution.fresh) {
            this._signalMemory.lastFreshActive = resolution.lastFreshActive;
            this._signalMemory.lastFreshTs = resolution.lastFreshTs;
        }
        return resolution;
    }



    /**
     * Wird aufgerufen, wenn die §14a-App im AppCenter deaktiviert wird. Die letzte
     * aktive Begrenzung darf dann nicht im zentralen Budget weiterleben.
     */
    async deactivate() {
        this.adapter._para14a = {
            enabled: false,
            active: false,
            forceZero: false,
            emergencyStop: false,
            localFailsafeActive: false,
            communicationFallbackActive: false,
            communicationFallbackReason: '',
            fallbackEvcsCapW: null,
            mode: '',
            source: 'module-disabled',
            totalCapW: null,
            evcsTotalCapW: null,
            appCapsW: {},
            evcsCapsBySafe: {},
            signalFresh: false,
            signalStale: false,
            signalAgeMs: null,
            signalStatus: 'module-disabled',
            stalePolicy: '',
            legacyDirectWritesEnabled: false,
        };
        this._signalMemory = { lastFreshActive: null, lastFreshTs: null };
        if (this._initialized === true) {
            await this._setStateIfChanged('para14a.active', false);
            await this._setStateIfChanged('para14a.forceZero', false);
            await this._setStateIfChanged('para14a.emergencyStop', false);
            await this._setStateIfChanged('para14a.localFailsafeActive', false);
            await this._setStateIfChanged('para14a.communicationFallbackActive', false);
            await this._setStateIfChanged('para14a.communicationFallbackReason', 'module-disabled');
            await this._setStateIfChanged('para14a.fallbackEvcsCapW', 0);
            await this._setStateIfChanged('para14a.signalFresh', false);
            await this._setStateIfChanged('para14a.signalAgeMs', null);
            await this._setStateIfChanged('para14a.signalStatus', 'module-disabled');
            await this._setStateIfChanged('para14a.evcsTotalCapW', 0);
            await this._setStateIfChanged('para14a.totalCapW', 0);
            await this._setStateIfChanged('para14a.storageChargeCapW', 0);
            await this._setStateIfChanged('para14a.thermalCapW', 0);
            await this._setStateIfChanged('para14a.heatingRodCapW', 0);
            await this._setStateIfChanged('para14a.airConditionCapW', 0);
            await this._setStateIfChanged('para14a.constraintOnly', true);
        }
        // Bei einer erneuten Aktivierung werden aktuelle Konfiguration und Mappings
        // vollständig neu eingelesen.
        this._initialized = false;
    }

    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async tick() {
        if (!this.adapter) return;
        // AppCenter kann §14a zur Laufzeit aktivieren. Bevor der erste Tick States
        // schreibt, muessen deren ioBroker-Objekte und DP-Mappings existieren.
        if (this._initialized !== true) await this.init();
        if (this._initialized !== true) return;
        const cfg = this._getCfg();
        const signal = this._readActiveSignal();
        const directIngress = signal && signal.direct === true && signal.directIngress
            ? signal.directIngress
            : null;
        const modeRaw = String(cfg.para14aMode || cfg.para14aControlMode || 'direct').trim().toLowerCase();
        // Ein LPC-Gesamtgrenzwert der CLS-Box ist immer eine EMS-Vorgabe. Die
        // Verteilung auf Ladepunkte, Speicher-Netzladung und Thermik erfolgt
        // anschließend durch den zentralen EOS-Budgetregler.
        const mode = directIngress ? 'ems' : ((modeRaw === 'ems' || modeRaw === 'formula') ? 'ems' : 'direct');
        const minPerDeviceW = clamp(num(cfg.para14aMinPerDeviceW, 4200), 4200, 1e12);
        const signalMaxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSignalMaxAgeSec, 30) * 1000));
        const setpointMaxAgeMs = Math.max(1000, Math.round(num(cfg.para14aSetpointMaxAgeSec, cfg.para14aSignalMaxAgeSec || 30) * 1000));
        const legacyDirectWritesEnabled = cfg.para14aLegacyDirectWritesEnabled === true;

        const evcsList = Array.isArray(this.adapter.evcsList) ? this.adapter.evcsList : [];
        const controllableEvcs = evcsList.filter((wb) => wb && (String(wb.setCurrentAId || '').trim() || String(wb.setPowerWId || '').trim()));
        const evcs = controllableEvcs.map((wb) => ({
            safe: safeIdPart(wb.key || wb.name || wb.index || ''),
            maxPowerW: Math.max(0, num(wb.maxPowerW || wb.maxPower || wb.ratedPowerW, 0)),
        }));
        const automaticConsumers = this._getAutomaticConsumers();
        const automaticActuatorIds = new Set(automaticConsumers
            .flatMap((consumer) => Array.isArray(consumer.actuatorIds) ? consumer.actuatorIds : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean));
        // Upgrade-Schutz: Schnellsetup-Zeilen aus älteren Versionen hatten noch
        // kein `automatic`-Merkmal. Sobald ihr Ziel-DP bereits von einem aktiv
        // automatisch erkannten Fachmodul geführt wird, darf die Altzeile weder
        // als zweite SteuVE zählen noch einen konkurrierenden Legacy-Write auslösen.
        const activeManualLoads = this._loads.filter((load) => {
            const targetIds = [load.setWId, load.enableId]
                .map((value) => String(value || '').trim())
                .filter(Boolean);
            return !targetIds.some((id) => automaticActuatorIds.has(id));
        });
        const manualConsumers = activeManualLoads.map((load) => ({
            id: load.id,
            type: load.type,
            controlType: load.controlType,
            installedPowerW: load.installedPowerW,
            priority: load.priority,
            groupId: load.groupId,
            source: load.source,
            automatic: false,
            setWId: load.setWId,
            enableId: load.enableId,
        }));
        const consumers = automaticConsumers.concat(manualConsumers);
        const gatewayLocalFailsafeActive = !!(directIngress && directIngress.localFailsafeActive === true);
        // Ein aktiviertes §14a-Modul ohne frisches Signal darf weder die gesamte
        // Ladung auf 0 W verriegeln noch unbeschränkt freigeben. EOS aktiviert
        // stattdessen lokal Pmin,14a. Das gilt für fehlende Mappings, ungültige
        // Werte, abgelaufene DP-Signale und einen unterbrochenen EEBUS-/CLS-Kanal.
        const communicationFallbackActive = !!(
            cfg.para14a
            && (signal.fresh !== true || gatewayLocalFailsafeActive)
        );
        const communicationFallbackReason = communicationFallbackActive
            ? `local-pmin:${String(
                gatewayLocalFailsafeActive
                    ? (directIngress && (directIngress.status || directIngress.reason) || 'gateway-local-failsafe')
                    : (signal.reason || 'signal-not-fresh'),
            )}`
            : '';
        const effectiveSignalActive = signal.active === true || communicationFallbackActive;
        const effectiveSignalSource = communicationFallbackActive
            ? `local-pmin-fallback:${String(signal.source || 'unknown')}`
            : String(signal.source || '');

        const directLimitW = finiteOrNull(directIngress && directIngress.limitW);
        const directTotalSetpointW = !communicationFallbackActive && directIngress && signal.active
            && directLimitW !== null
            && directLimitW >= 0
            ? directLimitW
            : null;
        const mappedTotalSetpointRaw = !communicationFallbackActive && signal.active && mode === 'ems' && !directIngress && this._emsSetpointDpKey && this.dp
            ? this.dp.getNumberFresh(this._emsSetpointDpKey, setpointMaxAgeMs, null)
            : null;
        const mappedTotalSetpointW = finiteOrNull(mappedTotalSetpointRaw);
        // Bei Kommunikationsausfall wird bewusst kein alter/externer Sollwert
        // übernommen. Die Constraint-Berechnung fällt dadurch exakt auf das
        // lokale Pmin,14a zurück.
        const externalTotalSetpointW = communicationFallbackActive
            ? null
            : (directTotalSetpointW !== null ? directTotalSetpointW : mappedTotalSetpointW);
        const localFailsafeActive = gatewayLocalFailsafeActive || communicationFallbackActive;

        // §14a ist ein Mindestleistungs-/Netzbezugsvertrag und kein Not-Aus.
        // Ein externer Wert von 0 W sowie ein veraltetes Kommunikationssignal
        // werden durch die Constraint-Berechnung auf Pmin,14a zurückgeführt.
        // Ein echter 0-W-Stopp gehört ausschließlich zum separaten EOS-Safety-
        // Envelope und darf nicht als §14a protokolliert oder verteilt werden.
        const forceZero = false;
        const emergencyStop = false;
        const constraint = buildPara14aConstraintSnapshot({
            active: effectiveSignalActive,
            forceZero,
            emergencyStop,
            communicationFallback: communicationFallbackActive,
            source: effectiveSignalSource,
            mode,
            minPerDeviceW,
            externalTotalSetpointW,
            evcs,
            consumers,
        });

        const fallbackSafe = !!(
            communicationFallbackActive
            && constraint.active === true
            && typeof constraint.totalCapW === 'number'
            && Number.isFinite(constraint.totalCapW)
            && constraint.totalCapW > 0
        );

        this.adapter._para14a = {
            enabled: !!cfg.para14a,
            ...constraint,
            signalFresh: signal.fresh,
            signalStale: signal.stale,
            signalAgeMs: signal.ageMs,
            signalStatus: communicationFallbackActive ? communicationFallbackReason : signal.reason,
            stalePolicy: communicationFallbackActive ? 'local-pmin' : signal.stalePolicy,
            lastFreshActive: typeof signal.lastFreshActive === 'boolean' ? signal.lastFreshActive : null,
            fallbackSafe,
            signalMaxAgeMs,
            legacyDirectWritesEnabled,
            forceZero: constraint.forceZero === true,
            emergencyStop: constraint.emergencyStop === true,
            localFailsafeActive,
            communicationFallbackActive,
            communicationFallbackReason,
            fallbackEvcsCapW: communicationFallbackActive ? constraint.evcsTotalCapW : null,
            failsafeLimitW: directIngress ? finiteOrNull(directIngress.failsafeLimitW) : null,
            emsSetpointW: Number.isFinite(Number(externalTotalSetpointW)) ? Number(externalTotalSetpointW) : 0,
            totalBudgetW: constraint.totalCapW,
            automaticConsumerCount: automaticConsumers.length,
            manualConsumerCount: manualConsumers.length,
            automaticConsumers,
            directApi: !!directIngress,
            directCommandId: directIngress ? String(directIngress.commandId || '') : '',
            directSequence: directIngress ? Number(directIngress.sequence) || 0 : 0,
            directSourceInstance: directIngress ? String(directIngress.sourceInstance || '') : '',
            directSourceDeviceId: directIngress ? String(directIngress.sourceDeviceId || '') : '',
            directReceivedAtMs: directIngress ? Number(directIngress.receivedAtMs) || 0 : 0,
            directAcceptedAtMs: directIngress ? Number(directIngress.acceptedAtMs) || 0 : 0,
            directValidUntilMs: directIngress ? Number(directIngress.validUntilMs) || 0 : 0,
        };

        await this._setStateIfChanged('para14a.active', constraint.active);
        await this._setStateIfChanged('para14a.forceZero', constraint.forceZero === true);
        await this._setStateIfChanged('para14a.emergencyStop', constraint.emergencyStop === true);
        await this._setStateIfChanged('para14a.localFailsafeActive', localFailsafeActive);
        await this._setStateIfChanged('para14a.communicationFallbackActive', communicationFallbackActive);
        await this._setStateIfChanged('para14a.communicationFallbackReason', communicationFallbackActive ? communicationFallbackReason : '');
        await this._setStateIfChanged('para14a.fallbackEvcsCapW', communicationFallbackActive ? Math.round(num(constraint.evcsTotalCapW, 0)) : 0);
        await this._setStateIfChanged('para14a.mode', constraint.mode);
        await this._setStateIfChanged('para14a.controlSource', effectiveSignalSource);
        await this._setStateIfChanged('para14a.minPerDeviceW', Math.round(minPerDeviceW));
        await this._setStateIfChanged('para14a.nSteuVE', constraint.nSteuVE);
        await this._setStateIfChanged('para14a.gzf', constraint.gzf);
        await this._setStateIfChanged('para14a.pMinW', constraint.pMinW);
        await this._setStateIfChanged('para14a.emsSetpointW', Math.round(num(externalTotalSetpointW, 0)));
        await this._setStateIfChanged('para14a.evcsTotalCapW', Math.round(num(constraint.evcsTotalCapW, 0)));
        await this._setStateIfChanged('para14a.totalCapW', Math.round(num(constraint.totalCapW, 0)));
        await this._setStateIfChanged('para14a.storageChargeCapW', Math.round(num(constraint.appCapsW.storage, 0)));
        await this._setStateIfChanged('para14a.thermalCapW', Math.round(num(constraint.appCapsW.thermal, 0)));
        await this._setStateIfChanged('para14a.heatingRodCapW', Math.round(num(constraint.appCapsW.heatingRod, 0)));
        await this._setStateIfChanged('para14a.airConditionCapW', Math.round(num(constraint.appCapsW.airCondition, 0)));
        await this._setStateIfChanged('para14a.customCapW', Math.round(num(constraint.appCapsW.custom, 0)));
        await this._setStateIfChanged('para14a.signalFresh', signal.fresh);
        await this._setStateIfChanged('para14a.signalAgeMs', signal.ageMs === null ? null : Math.round(signal.ageMs));
        await this._setStateIfChanged('para14a.signalStatus', communicationFallbackActive ? communicationFallbackReason : signal.reason);
        await this._setStateIfChanged('para14a.stalePolicy', communicationFallbackActive ? 'local-pmin' : signal.stalePolicy);
        await this._setStateIfChanged('para14a.constraintOnly', !legacyDirectWritesEnabled);
        await this._setStateIfChanged('para14a.legacyDirectWritesEnabled', legacyDirectWritesEnabled);
        await this._setStateIfChanged('para14a.unmanagedConsumerCount', constraint.unmanagedConsumerCount);
        await this._setStateIfChanged('para14a.automaticConsumerCount', automaticConsumers.length);
        await this._setStateIfChanged('para14a.manualConsumerCount', manualConsumers.length);
        await this._setStateIfChanged('para14a.automaticConsumersJson', JSON.stringify(automaticConsumers));

        const consumerAudit = { appliedCount: 0, failedCount: 0, skippedCount: 0, writeFailedCount: 0, failedConsumers: [] };
        for (const load of activeManualLoads) {
            const base = `para14a.consumers.${load.id}`;
            const targetW = constraint.targetCapsById[load.setWId] ?? constraint.targetCapsById[load.enableId] ?? 0;
            await this._setStateIfChanged(`${base}.type`, load.type);
            await this._setStateIfChanged(`${base}.targetW`, Math.round(num(targetW, 0)));
            if (!legacyDirectWritesEnabled) {
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'constraint-only');
                continue;
            }

            // Der Legacy-Pfad darf ausschließlich eine aktive §14a-Grenze
            // verschärfen bzw. auf 0/AUS setzen. Eine positive Wiederfreigabe
            // bei inaktivem Signal würde vor Core-Limits und ohne aktuellen
            // Safety-Envelope erfolgen. Die Wiederaufnahme gehört deshalb
            // zwingend dem zentralen Geräte-Writer des nächsten sicheren Zyklus.
            if (!constraint.active) {
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'legacy-restore-owned-by-central-control');
                continue;
            }
            const writeTarget = Number(targetW);
            if (!Number.isFinite(writeTarget)) {
                consumerAudit.skippedCount += 1;
                await this._setStateIfChanged(`${base}.applied`, false);
                await this._setStateIfChanged(`${base}.status`, 'legacy-limit-invalid');
                continue;
            }
            const consumer = { type: 'load', key: load.id, name: load.name, setWKey: load.setWKey, enableKey: load.enableKey };
            const effectiveTargetW = load.controlType === 'onOff' ? 0 : Math.max(0, writeTarget);
            const result = await applySetpoint({ dp: this.dp, adapter: this.adapter }, consumer, { targetW: Math.round(effectiveTargetW) });
            const status = String(result.status || '');
            if (result.applied && status !== 'skipped') consumerAudit.appliedCount += 1;
            else {
                consumerAudit.failedCount += 1;
                if (status === 'write_failed' || status === 'applied_partial') consumerAudit.writeFailedCount += 1;
                if (consumerAudit.failedConsumers.length < 10) consumerAudit.failedConsumers.push(load.name || load.id);
            }
            await this._setStateIfChanged(`${base}.applied`, !!result.applied);
            await this._setStateIfChanged(`${base}.status`, status);
        }

        const debug = {
            constraint,
            signal,
            communicationFallbackActive,
            communicationFallbackReason,
            effectiveSignalActive,
            effectiveSignalSource,
            legacyDirectWritesEnabled,
            automaticConsumers,
            manualConsumers,
            consumerAudit,
        };
        await this._setStateIfChanged('para14a.debug', JSON.stringify(debug));
        const auditSnapshot = this._buildAuditSnapshot({
            active: constraint.active,
            source: effectiveSignalSource,
            mode: constraint.mode,
            requestedTotalBudgetW: num(constraint.totalCapW, 0),
            effectiveEvcsCapW: num(constraint.evcsTotalCapW, 0),
            minPerDeviceW,
            pMinW: constraint.pMinW,
            nSteuVE: constraint.nSteuVE,
            evcsCount: evcs.length,
            evPowerW: this._getAdapterNumberFromCache('evcs.totalPowerW', 0),
            gridPowerW: this._getAdapterNumberFromCache('ems.gridPowerW', 0),
            consumerAppliedCount: consumerAudit.appliedCount,
            consumerFailedCount: consumerAudit.failedCount,
            consumerSkippedCount: consumerAudit.skippedCount,
            consumerWriteFailedCount: consumerAudit.writeFailedCount,
            failedConsumers: consumerAudit.failedConsumers,
        });
        // Der direkte EEBUS-Rückkanal liest ausschließlich diesen Snapshot
        // nach Abschluss des kompletten Modulmanager-Zyklus. Damit werden
        // Übernahme und tatsächlicher zentraler Regelzyklus sauber getrennt.
        if (this.adapter._para14a && typeof this.adapter._para14a === 'object') {
            this.adapter._para14a.consumerAudit = consumerAudit;
            this.adapter._para14a.auditSnapshot = auditSnapshot;
        }
        await this._handleAuditLogging(auditSnapshot);
    }

}

module.exports = { Para14aModule };
