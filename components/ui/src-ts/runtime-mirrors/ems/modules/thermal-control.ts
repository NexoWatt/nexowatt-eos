// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/thermal-control.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/thermal-control.js
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
 * Original-Hash: c1da1f93a2685825e5be4536ea51aabb03a05e8f1a23df3ed4b8a103f9de80ed
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
 * Quelle: src-ts/runtime-executables/ems/modules/thermal-control.ts
 * Quell-Hash: sha256:b095439ab1de1c97c7bb68cd1a286732a39e23a339294cf145c22b54e231a5c6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/thermal-control.js.
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
 * Aufgabe: Koordiniert freigegebene thermische Verbraucher anhand von Temperatur, Betriebsbedingungen und verfügbarem Leistungsbudget.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/thermal-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/thermal-control.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/thermal-control.js`.
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
 * Datei: ems/modules/thermal-control.js
 * Rolle im Projekt: Thermikregelung.
 * Zweck: Steuert thermische Verbraucher wie Wärmepumpe/Warmwasser nach EMS-Strategie.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Thermik-/Wärmesteuerung: flexible Wärmelasten, Warmwasser, SG-Ready-ähnliche Freigaben und Budgets.
 * Zusammenhänge:
 * - Nutzt zentrale EMS-Budgets und ggf. Wetter-/Tariffenster.
 * - Kann mit KI-Komfortfenstern zusammenhängen.
 * Wartungshinweise:
 * - Komfortzeiten und Netzlimits dürfen nicht gegeneinander arbeiten.
 */

'use strict';

const { BaseModule } = require('./base');
const { resolveThermalStrategyOverlay } = require('../services/operating-strategy-runtime');
const { applySetpoint } = require('../consumers');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract } = require('../services/actuator-command-contract');
const { recordAcceptedPowerTarget } = require('../services/accepted-power-effects');
const {
    liveSafetyEnvelope,
    evaluateFlexibleLoadRequest,
    commitFlexibleLoadDecision,
    invalidateSafetyEnvelope,
} = require('../services/safety-envelope');
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
function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
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
function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}
/**
 * Code-Teil: safeSlot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function safeSlot(slot) {
    const s = Math.round(Number(slot) || 0);
    if (s < 1) return 1;
    if (s > 10) return 10;
    return s;
}
/**
 * Code-Teil: nowMs
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nowMs() {
    return Date.now();
}
/**
 * Code-Teil: normalizeType
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'power';

    // SG-Ready (2 Relais)
    if (s === 'sgready' || s === 'sg-ready' || s === 'sg_ready' || s === 'sg') return 'sgready';

    // Explicit
    if (s === 'power' || s === 'w' || s === 'powerw' || s === 'heizstab' || s === 'heatingrod' || s === 'rod') return 'power';

    // Temperature/setpoint based
    if (s === 'setpoint' || s === 'temp' || s === 'temperature' || s === 'temperaturec' || s === '°c') return 'setpoint';
    if (s === 'heatpump' || s === 'wp' || s === 'waermepumpe' || s === 'wärmepumpe') return 'setpoint';
    if (s === 'hvac' || s === 'klima' || s === 'ac' || s === 'aircondition' || s === 'air_condition') return 'setpoint';

    return 'power';
}
/**
 * Code-Teil: normalizeProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeProfile(raw, type) {
    const s = String(raw || '').trim().toLowerCase();
    if (type !== 'setpoint') return 'none';
    if (s === 'heating' || s === 'heat' || s === 'heizen' || s === 'warmwasser' || s === 'ww') return 'heating';
    if (s === 'cooling' || s === 'cool' || s === 'kuehlen' || s === 'kühlen') return 'cooling';
    return 'heating';
}
/**
 * Code-Teil: defaultSetpointsForProfile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function defaultSetpointsForProfile(profile) {
    if (profile === 'cooling') {
        return { on: 20, off: 24, boost: 18, unit: '°C' };
    }
    // heating (default)
    return { on: 55, off: 45, boost: 60, unit: '°C' };
}

/**
 * Thermische Verbraucher (Wärmepumpe/Heizung/Klima) – PV‑Überschuss‑Regelung.
 *
 * Phase 4.4:
 * - Regeltyp pro Slot: Leistung (W) oder Setpoint (z.B. °C)
 * - Boost-Override (Zeit) + Manual-Hold nach Schnellsteuerung, damit PV-Auto nicht sofort überschreibt
 * - Für Setpoint-Geräte: Schätzleistung (W) zur PV-Budgetierung
 */
/**
 * Code-Teil: Klasse `ThermalControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ThermalControlModule. Aufgabe: gehört zur Heizstab-/Thermiksteuerung. Speicherreserve, PV-Budget und Freigaben müssen mit core-limits übereinstimmen. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: ThermalControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ThermalControlModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, {on:boolean, lastOnMs:number, lastOffMs:number}>} */
        this._hyst = new Map();
        /**
         * Ursprüngliche manuelle/externe Aktoranforderungen, die während einer
         * aktiven §14a-Begrenzung nur temporär geklemmt werden. Nach Freigabe
         * wird exakt dieser Zustand wiederhergestellt; normale Auto-/Boost-
         * Betriebsarten berechnen ihren Wunsch dagegen in jedem Tick neu.
         * @type {Map<string, any>}
         */
        this._para14aHeldRequests = new Map();
        this._actuatorContract = new ActuatorCommandContract();
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThermalControl);
    }
        _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.thermal && typeof this.adapter.config.thermal === 'object')
            ? this.adapter.config.thermal
            : {};
        return cfg;
    }

    /**
     * Code-Teil: Methode `_getManualHoldMin`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getManualHoldMin() {
        const cfg = this._getCfg();
        return clamp(num(cfg.manualHoldMin, 20), 0, 24 * 60);
    }
    /**
     * Code-Teil: _getVisFlowSlots
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisFlowSlots() {
        const vis = (this.adapter && this.adapter.config && this.adapter.config.vis && typeof this.adapter.config.vis === 'object')
            ? this.adapter.config.vis
            : {};
        const fs = (vis.flowSlots && typeof vis.flowSlots === 'object') ? vis.flowSlots : {};
        const arr = Array.isArray(fs.consumers) ? fs.consumers : [];
        return arr;
    }

    /**
     * Code-Teil: Methode `_getDatapoints`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getDatapoints() {
        return (this.adapter && this.adapter.config && this.adapter.config.datapoints && typeof this.adapter.config.datapoints === 'object')
            ? this.adapter.config.datapoints
            : {};
    }
        _getOverrides() {
        const a = this.adapter;
        if (!a) return {};
        if (!a._thermalOverrides || typeof a._thermalOverrides !== 'object') a._thermalOverrides = {};
        return a._thermalOverrides;
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
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v); if (this._stateCache.size > 1000) { const __rc85Oldest = this._stateCache.keys().next().value; if (__rc85Oldest !== undefined) this._stateCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
        await this.adapter.setStateAsync(id, v, true);
    }

    /**
     * Code-Teil: Methode `_buildDevicesFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _buildDevicesFromConfig() {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.devices) ? cfg.devices : [];

        const flowConsumers = this._getVisFlowSlots();
        const dps = this._getDatapoints();

        /** @type {Array<any>} */
        const out = [];
        const usedSlots = new Set();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const slot = safeSlot(r.slot ?? r.consumerSlot ?? (i + 1));
            if (usedSlots.has(slot)) continue;
            usedSlots.add(slot);

            const enabled = (typeof r.enabled === 'boolean') ? r.enabled : false;
            const modeRaw = String(r.mode || 'pvAuto').trim().toLowerCase();
            const mode = (modeRaw === 'manual' || modeRaw === 'off') ? modeRaw : 'pvAuto';

            const type = normalizeType(r.type || r.deviceType || r.kind);
            const profile = normalizeProfile(r.profile, type);

            const maxPowerW = clamp(num(r.maxPowerW, 2500), 0, 1e12);
            const startSurplusW = clamp(num(r.startSurplusW, 800), 0, 1e12);
            const stopSurplusW = clamp(num(r.stopSurplusW, 300), 0, 1e12);
            const minOnSec = clamp(num(r.minOnSec, 300), 0, 86400);
            const minOffSec = clamp(num(r.minOffSec, 300), 0, 86400);
            const priority = clamp(num(r.priority, 100 + slot), 1, 999);

            const slotCfg = (flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object') ? flowConsumers[slot - 1] : {};
            const slotTypeRaw = String(slotCfg.consumerType || slotCfg.type || slotCfg.category || '').trim().toLowerCase();
            if (slotTypeRaw === 'heatingrod' || slotTypeRaw === 'heating_rod' || slotTypeRaw === 'heating-rod' || slotTypeRaw === 'heizstab' || slotTypeRaw === 'rod' || slotTypeRaw === 'immersion') {
                continue;
            }
            const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};

            const name = String(r.name || slotCfg.name || '').trim() || `Thermal ${slot}`;

            const powerId = String(dps[`consumer${slot}Power`] || '').trim();
            const switchWriteId = String(ctrl.switchWriteId || '').trim();
            const setpointWriteId = String(ctrl.setpointWriteId || '').trim();

            // Optional SG-Ready wiring (2 relays)
            const sgReadyAWriteId = String(ctrl.sgReadyAWriteId || ctrl.sgReady1WriteId || '').trim();
            const sgReadyBWriteId = String(ctrl.sgReadyBWriteId || ctrl.sgReady2WriteId || '').trim();
            const sgReadyAInvert = !!(ctrl.sgReadyAInvert || ctrl.sgReady1Invert);
            const sgReadyBInvert = !!(ctrl.sgReadyBInvert || ctrl.sgReady2Invert);

            const boostEnabled = (typeof r.boostEnabled === 'boolean') ? !!r.boostEnabled : true;
            const boostDurationMin = clamp(num(r.boostDurationMin, 30), 0, 24 * 60);

            // For setpoint devices: derive reasonable default setpoints by profile.
            const defSp = defaultSetpointsForProfile(profile);
            const autoOnSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOnSetpoint)) ? Number(r.autoOnSetpoint) : defSp.on)
                : null;
            const autoOffSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.autoOffSetpoint)) ? Number(r.autoOffSetpoint) : defSp.off)
                : null;
            const boostSetpoint = (type === 'setpoint')
                ? (Number.isFinite(Number(r.boostSetpoint)) ? Number(r.boostSetpoint) : defSp.boost)
                : null;

            // For setpoint/SG-Ready devices: power estimate used for PV budget allocation.
            const estimatedPowerW = (type === 'setpoint' || type === 'sgready')
                ? clamp(num(r.estimatedPowerW, 1500), 0, 1e12)
                : null;

            const boostPowerW = (type === 'power')
                ? clamp(num(r.boostPowerW, maxPowerW), 0, 1e12)
                : null;

            const requireReadback = r.requireReadback === true;
            const readbackTimeoutSec = clamp(num(r.readbackTimeoutSec, 5), 0.25, 120);
            const retryDelaySec = clamp(num(r.retryDelaySec, 3), 0.25, 120);
            const maxRetries = clamp(num(r.maxRetries, 3), 0, 20);
            const faultLockSec = clamp(num(r.faultLockSec, 60), 1, 24 * 60 * 60);

            out.push({
                configIndex: i,
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                type,
                profile,
                maxPowerW,
                startSurplusW,
                stopSurplusW,
                minOnSec,
                minOffSec,
                priority,

                boostEnabled,
                boostDurationMin,
                boostPowerW,
                autoOnSetpoint,
                autoOffSetpoint,
                boostSetpoint,
                estimatedPowerW,
                requireReadback,
                readbackTimeoutSec,
                retryDelaySec,
                maxRetries,
                faultLockSec,

                powerId,
                switchWriteId,
                setpointWriteId,

                sgReadyAWriteId,
                sgReadyBWriteId,
                sgReadyAInvert,
                sgReadyBInvert,


                // User overrides (end customer UI)
                userEnabledKey: `th.user.c${slot}.regEnabled`,
                userModeKey: `th.user.c${slot}.mode`,

                // dp keys (filled in init)
                pWKey: '',
                enableKey: '',
                setWKey: '',

                // SG-Ready dp keys (filled in init)
                sg1Key: '',
                sg2Key: '',
            });
        }

        // deterministic order
        out.sort((a, b) => {
            const pa = num(a.priority, 100);
            const pb = num(b.priority, 100);
            if (pa !== pb) return pa - pb;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        this._devices = out;
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
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('thermal', {
            type: 'channel',
            common: { name: 'Wärmepumpe & Klima' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('thermal.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        
        // Endkunde/Bedienung: persistente User-States pro Verbraucher-Slot (Regelung an/aus + Betriebsmodus).
        // Diese States werden durch die VIS (Schnellsteuerung) gesetzt und überschreiben (optional) die Installer-Konfiguration.
        await this.adapter.setObjectNotExistsAsync('thermal.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `ensureDefault`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
                const ensureDefault = async (id, val) => {
            try {
                const s = await this.adapter.getStateAsync(id);
                if (!s || s.val === null || s.val === undefined) {
                    await this.adapter.setStateAsync(id, val, true);
                }
            } catch (_e) {
                try { await this.adapter.setStateAsync(id, val, true); } catch (_e2) {}
            }
        };

        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}`, {
                type: 'channel',
                common: { name: `Consumer ${i}` },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.regEnabled`, {
                type: 'state',
                common: {
                    name: 'Regelung aktiv',
                    type: 'boolean',
                    role: 'switch.enable',
                    read: true,
                    write: true,
                    def: true,
                },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`thermal.user.c${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Betriebsmodus',
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: true,
                    def: 'inherit',
                    states: {
                        inherit: 'System',
                        pvAuto: 'Auto (PV)',
                        manual: 'Manuell',
                        off: 'Aus',
                    },
                },
                native: {},
            });

            await ensureDefault(`thermal.user.c${i}.regEnabled`, true);
            await ensureDefault(`thermal.user.c${i}.mode`, 'inherit');
        }

/**
 * Code-Teil: Arrow-Funktion `mk`
 * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
const mk = async (id, name, type, role, unit = undefined) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: false,
                    ...(unit ? { unit } : {}),
                },
                native: {},
            });
        };

        await mk('thermal.summary.pvCapW', 'PV cap (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.evcsUsedW', 'EVCS used (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.pvAvailableW', 'PV available for thermal (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('thermal.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('thermal.summary.status', 'Status', 'string', 'text');

        // Build devices & register DPs
        this._buildDevicesFromConfig();

        // Read inputs from charging management (remaining PV after EVCS)
        // Subscribe to local states (namespace.*) via dpRegistry for deterministic reads.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'th.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'th.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
            }
        } catch (_e) {
            // ignore
        }

        
        // User overrides: local states (Regelung + Mode) werden über dpRegistry gecached, damit die Tick-Logik deterministisch bleibt.
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `th.user.c${i}.regEnabled`, objectId: `${ns}.thermal.user.c${i}.regEnabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `th.user.c${i}.mode`, objectId: `${ns}.thermal.user.c${i}.mode`, dataType: 'string', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

// Per device: create channel + register setpoints
        for (const d of this._devices) {
            await this.adapter.setObjectNotExistsAsync(`thermal.devices.${d.id}`, {
                type: 'channel',
                common: { name: d.name },
                native: {},
            });

            await mk(`thermal.devices.${d.id}.slot`, 'Slot', 'number', 'value');
            await mk(`thermal.devices.${d.id}.enabled`, 'Enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.mode`, 'Mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.userEnabled`, 'User enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.userMode`, 'User mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.effectiveEnabled`, 'Effective enabled', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.effectiveMode`, 'Effective mode', 'string', 'text');
            await mk(`thermal.devices.${d.id}.strategyEligible`, 'Betriebsstrategie zulässig', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.strategyActive`, 'Betriebsstrategie aktiv', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.strategyFallbackActive`, 'Betriebsstrategie Rückfall aktiv', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.strategyAction`, 'Betriebsstrategie Aktion', 'string', 'text');
            await mk(`thermal.devices.${d.id}.strategyRequestedPowerW`, 'Betriebsstrategie Leistungsgrenze', 'number', 'value.power', 'W');
            await mk(`thermal.devices.${d.id}.strategyReason`, 'Betriebsstrategie Grund', 'string', 'text');
            await mk(`thermal.devices.${d.id}.strategyFallback`, 'Betriebsstrategie Rückfall', 'string', 'text');
            await mk(`thermal.devices.${d.id}.strategyExpiresAt`, 'Betriebsstrategie gültig bis', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.type`, 'Type', 'string', 'text');
            await mk(`thermal.devices.${d.id}.profile`, 'Profile', 'string', 'text');

            // targetW is kept for backward compatibility; interpret via targetUnit/targetKind.
            await mk(`thermal.devices.${d.id}.targetW`, 'Target', 'number', 'value');
            await mk(`thermal.devices.${d.id}.targetUnit`, 'Target unit', 'string', 'text');
            await mk(`thermal.devices.${d.id}.targetKind`, 'Target kind', 'string', 'text');

            await mk(`thermal.devices.${d.id}.applied`, 'Applied', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.status`, 'Status', 'string', 'text');
            await mk(`thermal.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');
            await mk(`thermal.devices.${d.id}.owner`, 'Aktor-Owner', 'string', 'text');
            await mk(`thermal.devices.${d.id}.writeAccepted`, 'Write akzeptiert', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.readbackOk`, 'Readback bestätigt', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.writePending`, 'Write/Readback ausstehend', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.retryCount`, 'Write-Wiederholungen', 'number', 'value');
            await mk(`thermal.devices.${d.id}.faultLocked`, 'Aktor-Fehlerverriegelung', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.faultUntil`, 'Aktor-Fehlerverriegelung bis', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.writeContractStatus`, 'Aktor-Vertragsstatus', 'string', 'text');

            // Overrides (written internally via API)
            await mk(`thermal.devices.${d.id}.boostActive`, 'Boost active', 'boolean', 'indicator');
            await mk(`thermal.devices.${d.id}.boostUntil`, 'Boost until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.manualUntil`, 'Manual hold until (ts)', 'number', 'value.time');
            await mk(`thermal.devices.${d.id}.override`, 'Override', 'string', 'text');

            // DP mapping (read)
            if (this.dp && d.powerId) {
                const k = `th.${d.id}.pW`;
                await this.dp.upsert({ key: k, objectId: d.powerId, dataType: 'number', direction: 'in', unit: 'W' });
                d.pWKey = k;
            }

            // DP mapping (actuation)
            if (this.dp && d.switchWriteId) {
                const k = `th.${d.id}.en`;
                await this.dp.upsert({ key: k, objectId: d.switchWriteId, dataType: 'boolean', direction: 'out' });
                d.enableKey = k;
            }

            // Optional SG-Ready actuation (two digital outputs)
            if (this.dp && d.sgReadyAWriteId) {
                const k = `th.${d.id}.sg1`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyAWriteId, dataType: 'boolean', direction: 'out' });
                d.sg1Key = k;
            }
            if (this.dp && d.sgReadyBWriteId) {
                const k = `th.${d.id}.sg2`;
                await this.dp.upsert({ key: k, objectId: d.sgReadyBWriteId, dataType: 'boolean', direction: 'out' });
                d.sg2Key = k;
            }
            if (this.dp && d.setpointWriteId) {
                const k = `th.${d.id}.set`;
                const unit = (d.type === 'setpoint') ? '°C' : 'W';
                const deadband = (d.type === 'setpoint') ? 0.2 : 25;
                await this.dp.upsert({ key: k, objectId: d.setpointWriteId, dataType: 'number', direction: 'out', unit, deadband });
                d.setWKey = k;
            }

            // init hysteresis state
            if (!this._hyst.has(d.id)) {
                this._hyst.set(d.id, { on: false, lastOnMs: 0, lastOffMs: 0 });
            }
        }
    }

    /**
     * Fail-closed Lifecycle-Stopp fuer AppCenter-AUS, Lizenzverlust und den
     * Adapterstart mit deaktivierter Thermik. Die Ausgaenge werden auch ohne
     * vorherigen Tick aus der Installer-Konfiguration aufgebaut und physisch
     * auf AUS/0 beziehungsweise den konfigurierten Aus-Setpoint geschrieben.
     */
    async deactivate() {
        if (!Array.isArray(this._devices) || !this._devices.length) this._buildDevicesFromConfig();
        const failures = [];
        let attempted = 0;

        for (const d of this._devices || []) {
            try {
                if (this.dp && typeof this.dp.upsert === 'function') {
                    if (d.switchWriteId && !d.enableKey) {
                        d.enableKey = `th.${d.id}.en`;
                        await this.dp.upsert({ key: d.enableKey, objectId: d.switchWriteId, dataType: 'boolean', direction: 'out' });
                    }
                    if (d.sgReadyAWriteId && !d.sg1Key) {
                        d.sg1Key = `th.${d.id}.sg1`;
                        await this.dp.upsert({ key: d.sg1Key, objectId: d.sgReadyAWriteId, dataType: 'boolean', direction: 'out' });
                    }
                    if (d.sgReadyBWriteId && !d.sg2Key) {
                        d.sg2Key = `th.${d.id}.sg2`;
                        await this.dp.upsert({ key: d.sg2Key, objectId: d.sgReadyBWriteId, dataType: 'boolean', direction: 'out' });
                    }
                    if (d.setpointWriteId && !d.setWKey) {
                        d.setWKey = `th.${d.id}.set`;
                        await this.dp.upsert({
                            key: d.setWKey,
                            objectId: d.setpointWriteId,
                            dataType: 'number',
                            direction: 'out',
                            unit: d.type === 'setpoint' ? '°C' : 'W',
                        });
                    }
                }
                const actType = (d.type === 'sgready' || d.sg1Key || d.sg2Key) ? 'sgready' : String(d.type || 'power');
                const hasActuator = !!(d.enableKey || d.setWKey || d.sg1Key || d.sg2Key);
                if (!hasActuator) continue;
                attempted += 1;
                const consumer = this._thermalConsumerForActType(d, actType);
                const target = actType === 'setpoint'
                    ? { enable: false, setpoint: Number.isFinite(Number(d.autoOffSetpoint)) ? Number(d.autoOffSetpoint) : null }
                    : (actType === 'sgready' ? { state: 'off' } : { targetW: 0, enable: false });
                const result = await this._applyThermalCommand(
                    d,
                    actType,
                    consumer,
                    target,
                    'module-disabled-safe-stop',
                    {
                        owner: `thermal.${d.id}`,
                        enforceAuthority: false,
                        releaseAuthority: true,
                        leaseMs: 0,
                        kind: 'thermal-module-disabled',
                        forceWrite: true,
                        requireReadback: false,
                    },
                );
                if (!(result && result.accepted === true)) failures.push(`${d.id}:${String(result && result.status || 'write-not-accepted')}`);
                this._actuatorContract.release(`thermal:${d.id}`);
                this._para14aHeldRequests.delete(String(d.id));
                try {
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, result && result.accepted === true);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'module-disabled-safe-stop');
                } catch (_diagnosticError) {}
            } catch (error) {
                failures.push(`${d && d.id || 'unknown'}:${String(error && error.message || error)}`);
            }
        }
        try {
            await this._setStateIfChanged('thermal.summary.appliedTotalW', 0);
            await this._setStateIfChanged('thermal.summary.budgetUsedW', 0);
            await this._setStateIfChanged('thermal.summary.status', attempted ? 'module-disabled-safe-stop' : 'module-disabled-no-actuators');
        } catch (_diagnosticError) {}
        if (failures.length) throw new Error(`thermal-safe-stop-failed:${failures.join(',')}`);
        return { ok: true, attempted, stopped: attempted };
    }

    /**
     * Code-Teil: Methode `_computePvAvailableW`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computePvAvailableW() {
        const cfg = this._getCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        // Primary: central EMS Budget & Gates. Charging management reserves EVCS first,
        // thermal consumers get the next priority layer, and heating rods receive the remaining PV budget.
        const centralRuntimePresent = !!(this.adapter && this.adapter._emsBudget);
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            const snap = rt && typeof rt.peek === 'function' ? rt.peek() : null;
            const age = snap && Number.isFinite(Number(snap.ts)) ? (Date.now() - Number(snap.ts)) : Number.POSITIVE_INFINITY;
            if (snap && age <= staleMs) {
                const pvTotalW = snap.gates && snap.gates.pv ? Number(snap.gates.pv.effectiveW) : 0;
                const remainingPvW = Number(snap.remainingPvW);
                const tariffGate = snap.gates && snap.gates.tariff ? snap.gates.tariff : null;
                const tariffImportPreferred = !!(tariffGate && tariffGate.gridImportPreferred);
                const remainingTotalW = Number(snap.remainingTotalW);
                if (Number.isFinite(remainingPvW) && remainingPvW >= 0) {
                    const evcs = snap.consumers && snap.consumers.evcs ? snap.consumers.evcs : null;
                    const evcsUsedW = evcs && Number.isFinite(Number(evcs.reserveW)) ? Math.max(0, Number(evcs.reserveW)) : 0;
                    const totalGrant = typeof rt.getTotalGrant === 'function'
                        ? rt.getTotalGrant({ key: 'thermal', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const pvGrant = !tariffImportPreferred && typeof rt.getPvGrant === 'function'
                        ? rt.getPvGrant({ key: 'thermal', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const availableByTariffW = tariffImportPreferred
                        ? (totalGrant && Number.isFinite(Number(totalGrant.grantW))
                            ? Math.max(0, Number(totalGrant.grantW))
                            : (Number.isFinite(remainingTotalW) && remainingTotalW >= 0 ? Math.max(0, remainingTotalW) : null))
                        : null;
                    const availablePvGrantW = pvGrant && Number.isFinite(Number(pvGrant.grantW))
                        ? Math.max(0, Number(pvGrant.grantW))
                        : Math.max(0, remainingPvW);
                    const para14aActive = !!(snap.gates && snap.gates.para14a && snap.gates.para14a.active === true);
                    const para14aAvailableW = para14aActive
                        ? (totalGrant && Number.isFinite(Number(totalGrant.grantW))
                            ? Math.max(0, Number(totalGrant.grantW))
                            : (Number.isFinite(remainingTotalW) && remainingTotalW >= 0 ? Math.max(0, remainingTotalW) : 0))
                        : null;
                    return {
                        pvCapW: Math.max(0, Number.isFinite(pvTotalW) ? pvTotalW : availablePvGrantW),
                        evcsUsedW,
                        availableW: availableByTariffW !== null ? availableByTariffW : availablePvGrantW,
                        para14aAvailableW,
                        source: availableByTariffW !== null ? 'ems.budget.tariffNegative' : 'ems.budget.central-grant',
                    };
                }
            }
        } catch (_e) {
            // Die zentrale Runtime bleibt autoritativ. Ein Fehler darf kein
            // lokales Parallelbudget aus NVP/Charging-States aktivieren.
        }

        if (centralRuntimePresent) {
            return {
                pvCapW: 0,
                evcsUsedW: 0,
                availableW: 0,
                para14aAvailableW: this._isPara14aActive() ? 0 : null,
                source: 'ems.budget.central-stale-or-invalid-blocked',
            };
        }

        // Legacy fallback: Nur fuer Alt-Laufzeiten ohne Core-Limits. Sobald die
        // zentrale Runtime existiert, wird niemals auf ein zweites lokales
        // PV-Budget ausgewichen.
        const pvCapW = this.dp ? this.dp.getNumberFresh('th.cm.pvCapW', staleMs, null) : null;
        const usedW = this.dp ? this.dp.getNumberFresh('th.cm.usedW', staleMs, null) : null;

        if (typeof pvCapW === 'number' && Number.isFinite(pvCapW) && pvCapW > 0) {
            const u = (typeof usedW === 'number' && Number.isFinite(usedW)) ? Math.max(0, usedW) : 0;
            const p14a = this.adapter && this.adapter._para14a;
            const p14aCap = p14a && p14a.active === true && p14a.appCapsW
                ? Number(p14a.appCapsW.thermal)
                : null;
            return {
                pvCapW,
                evcsUsedW: u,
                availableW: Math.max(0, pvCapW - u),
                para14aAvailableW: Number.isFinite(p14aCap) ? Math.max(0, p14aCap) : null,
                source: 'cm',
            };
        }

        // Fallback: net grid power (import + / export -)
        let gridW = this.dp ? this.dp.getNumberFresh('grid.powerW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('grid.powerRawW', staleMs, null) : null;
        if (typeof gridW !== 'number') gridW = this.dp ? this.dp.getNumberFresh('ps.gridPowerW', staleMs, null) : null;

        const avail = Math.max(0, -Number(gridW || 0));
        const p14a = this.adapter && this.adapter._para14a;
        const p14aCap = p14a && p14a.active === true && p14a.appCapsW
            ? Number(p14a.appCapsW.thermal)
            : null;
        return {
            pvCapW: avail,
            evcsUsedW: 0,
            availableW: avail,
            para14aAvailableW: Number.isFinite(p14aCap) ? Math.max(0, p14aCap) : null,
            source: 'grid',
        };
    }

    /**
     * Code-Teil: Methode `_hysteresisOnOff`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _hysteresisOnOff(id, desiredOn, minOnSec, minOffSec) {
        const h = this._hyst.get(id) || { on: false, lastOnMs: 0, lastOffMs: 0, initialized: false };
        const now = nowMs();

        const minOnMs = Math.max(0, Math.round(num(minOnSec, 0) * 1000));
        const minOffMs = Math.max(0, Math.round(num(minOffSec, 0) * 1000));

        // First use: do not artificially block the initial transition from OFF -> ON.
        if (!h.initialized) {
            h.initialized = true;
            if (h.on) {
                if (!h.lastOnMs) h.lastOnMs = Math.max(0, now - minOnMs);
            } else {
                if (!h.lastOffMs) h.lastOffMs = 0;
            }
        }

        let on = !!h.on;

        if (desiredOn && !on) {
            if (minOffMs > 0 && h.lastOffMs > 0 && (now - h.lastOffMs) < minOffMs) {
                on = false;
            } else {
                on = true;
                h.lastOnMs = now;
            }
        } else if (!desiredOn && on) {
            if (minOnMs > 0 && h.lastOnMs > 0 && (now - h.lastOnMs) < minOnMs) {
                on = true;
            } else {
                on = false;
                h.lastOffMs = now;
            }
        }

        h.on = on;
        this._hyst.set(id, h);
        return on;
    }

    /**
     * Code-Teil: Methode `_computeBandDesiredOn`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeBandDesiredOn(id, availableW, startW, stopW) {
        const h = this._hyst.get(id) || { on: false };
        const wasOn = !!h.on;
        const start = Math.max(0, Math.max(num(startW, 0), num(stopW, 0)));
        const stop = Math.max(0, Math.min(num(startW, 0), num(stopW, 0)));
        const avail = Math.max(0, num(availableW, 0));
        if (wasOn) return avail > stop;
        return avail >= start && avail > 0;
    }

    /**
     * Code-Teil: Methode `_readOverrideForDevice`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOverrideForDevice
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readOverrideForDevice(d, now) {
        const ovAll = this._getOverrides();
        const ov = (ovAll && typeof ovAll === 'object' && ovAll[d.id] && typeof ovAll[d.id] === 'object') ? ovAll[d.id] : {};

        const boostUntil = clamp(num(ov.boostUntilMs, 0), 0, 1e18);
        const manualUntil = clamp(num(ov.manualUntilMs, 0), 0, 1e18);

        const boostActive = boostUntil > 0 && now < boostUntil;
        const manualActive = manualUntil > 0 && now < manualUntil;

        return { boostActive, boostUntil, manualActive, manualUntil };
    }

    _deviceOwner(d, manual = false) {
        return manual ? `manual.thermal.${d.id}` : `thermal.${d.id}`;
    }

    _deviceActuatorIds(d) {
        const ids = [];
        for (const key of [d.enableKey, d.setWKey, d.sg1Key, d.sg2Key]) {
            try {
                const entry = key && this.dp && this.dp.getEntry ? this.dp.getEntry(key) : null;
                const id = String(entry && entry.objectId || '').trim();
                if (id && !ids.includes(id)) ids.push(id);
            } catch (_e) {}
        }
        return ids;
    }

    _deviceHasExclusiveAuthority(d, owner) {
        if (String(owner || '').startsWith('manual.')) return true;
        const matrix = this.adapter && this.adapter._stageAActuatorOwnerById;
        const ids = this._deviceActuatorIds(d);
        if (!ids.length || !matrix || typeof matrix !== 'object') return false;
        return ids.every((id) => {
            const row = matrix[id];
            const activeOwners = Array.isArray(row && row.activeOwners)
                ? row.activeOwners.map((value) => String(value || '').trim()).filter(Boolean)
                : [];
            return activeOwners.length === 1 && activeOwners[0] === owner;
        });
    }

    _contractCfg(d, requireReadback = null) {
        return {
            requireReadback: requireReadback === null ? d.requireReadback === true : requireReadback === true,
            ackTimeoutMs: Math.round(Math.max(250, num(d.readbackTimeoutSec, 5) * 1000)),
            retryDelayMs: Math.round(Math.max(250, num(d.retryDelaySec, 3) * 1000)),
            maxRetries: Math.max(0, Math.round(num(d.maxRetries, 3))),
            faultLockMs: Math.round(Math.max(1000, num(d.faultLockSec, 60) * 1000)),
        };
    }

    async _readEntryState(key) {
        try {
            const entry = key && this.dp && this.dp.getEntry ? this.dp.getEntry(key) : null;
            const id = String(entry && entry.objectId || '').trim();
            if (!id || !this.adapter || typeof this.adapter.getForeignStateAsync !== 'function') return null;
            const state = await this.adapter.getForeignStateAsync(id);
            return state && state.val !== undefined ? state.val : null;
        } catch (_e) {
            return null;
        }
    }

    async _readThermalReadback(d, actType) {
        if (actType === 'sgready') {
            return {
                sg1: await this._readEntryState(d.sg1Key),
                sg2: await this._readEntryState(d.sg2Key),
                enable: await this._readEntryState(d.enableKey),
            };
        }
        if (actType === 'setpoint') {
            return {
                setpoint: await this._readEntryState(d.setWKey),
                enable: await this._readEntryState(d.enableKey),
            };
        }
        return {
            targetW: await this._readEntryState(d.setWKey),
            enable: await this._readEntryState(d.enableKey),
        };
    }

    _isPara14aActive() {
        return !!(this.adapter && this.adapter._para14a && this.adapter._para14a.active === true);
    }

    _para14aOwner(d) {
        return `para14a.thermal.${d.id}`;
    }

    _estimatedThermalPowerW(d, measuredW = null) {
        if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) {
            return Math.max(0, measuredW);
        }
        const configured = num(d && d.estimatedPowerW, num(d && d.maxPowerW, 1500));
        return Math.max(0, configured > 0 ? configured : 1500);
    }

    _decodeSgReadyState(d, actual) {
        let sg1 = actual && typeof actual.sg1 === 'boolean' ? actual.sg1 : null;
        let sg2 = actual && typeof actual.sg2 === 'boolean' ? actual.sg2 : null;
        if (sg1 !== null && d.sgReadyAInvert) sg1 = !sg1;
        if (sg2 !== null && d.sgReadyBInvert) sg2 = !sg2;
        if (sg1 === true && sg2 === true) return 'boost';
        if (sg1 === true && sg2 !== true) return 'on';
        if (sg1 !== true && sg2 === true) return 'block';
        if (actual && actual.enable === true) return 'on';
        return 'off';
    }

    _thermalConsumerForActType(d, actType) {
        if (actType === 'setpoint') {
            return { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
        }
        if (actType === 'sgready') {
            return {
                type: 'sgready',
                key: d.id,
                name: d.name,
                sg1Key: d.sg1Key,
                sg2Key: d.sg2Key,
                enableKey: d.enableKey,
                invert1: !!d.sgReadyAInvert,
                invert2: !!d.sgReadyBInvert,
            };
        }
        return { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
    }

    _thermalDisplayTarget(actType, target) {
        if (actType === 'setpoint') {
            const raw = target && target.setpoint;
            return raw !== null && raw !== undefined && Number.isFinite(Number(raw)) ? Number(raw) : 0;
        }
        if (actType === 'sgready') {
            const raw = String(target && target.state || 'off').trim().toLowerCase();
            return raw === 'boost' ? 2 : (raw === 'on' ? 1 : 0);
        }
        return Math.max(0, num(target && target.targetW, 0));
    }

    _capturePara14aThermalRequest(d, actType, actual, measuredW) {
        const key = String(d && d.id || '').trim();
        const existing = key ? this._para14aHeldRequests.get(key) : null;
        if (existing && existing.actType === actType) return existing;

        const estimateW = this._estimatedThermalPowerW(d, measuredW);
        let target;
        let requestedLoadW = 0;

        if (actType === 'setpoint') {
            const hasEnable = !!String(d.enableKey || '').trim();
            const rawSetpoint = actual && actual.setpoint;
            const hasSetpoint = rawSetpoint !== null && rawSetpoint !== undefined && Number.isFinite(Number(rawSetpoint));
            const currentSetpoint = hasSetpoint ? Number(rawSetpoint) : null;
            const offSetpoint = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint))
                ? d.autoOffSetpoint
                : currentSetpoint;
            const activeBySetpoint = currentSetpoint !== null
                && (!(typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) || Math.abs(currentSetpoint - d.autoOffSetpoint) > 0.01);
            const currentlyOn = hasEnable
                ? actual && actual.enable === true
                : ((typeof measuredW === 'number' && measuredW > 50) || activeBySetpoint);
            requestedLoadW = currentlyOn ? estimateW : 0;
            target = {
                enable: currentlyOn,
                setpoint: currentSetpoint !== null
                    ? currentSetpoint
                    : (currentlyOn
                        ? ((typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint)) ? d.autoOnSetpoint : offSetpoint)
                        : offSetpoint),
            };
        } else if (actType === 'sgready') {
            const state = this._decodeSgReadyState(d, actual);
            const currentlyOn = state === 'on' || state === 'boost';
            requestedLoadW = currentlyOn ? estimateW : 0;
            target = { state };
        } else {
            const rawTarget = actual && actual.targetW;
            const hasTarget = rawTarget !== null && rawTarget !== undefined && Number.isFinite(Number(rawTarget));
            const targetW = hasTarget
                ? Math.max(0, Number(rawTarget))
                : ((typeof measuredW === 'number' && measuredW > 50) ? estimateW : 0);
            requestedLoadW = targetW;
            target = { targetW };
        }

        const held = {
            actType,
            target,
            requestedLoadW: Math.max(0, requestedLoadW),
            capturedAt: Date.now(),
        };
        if (key) this._para14aHeldRequests.set(key, held);
        return held;
    }

    async _restorePara14aHeldThermalRequest(d, actType, measuredW, label = 'manual') {
        const key = String(d && d.id || '').trim();
        const held = key ? this._para14aHeldRequests.get(key) : null;
        if (!held || held.actType !== actType) return null;

        const consumer = this._thermalConsumerForActType(d, actType);
        const target = held.target && typeof held.target === 'object' ? { ...held.target } : {};
        const reason = `§14a Thermik Freigabe ${label}`;
        const res = await this._applyThermalCommand(d, actType, consumer, target, reason, {
            owner: this._para14aOwner(d),
            enforceAuthority: false,
            releaseAuthority: true,
            leaseMs: 0,
            kind: 'para14a-thermal-release',
            forceWrite: true,
        });
        this._recordAcceptedThermalEffect(d, res, measuredW, held.requestedLoadW, reason);

        const restored = !!(res && (res.accepted === true || res.confirmed === true || res.applied === true));
        if (restored && key) this._para14aHeldRequests.delete(key);
        const measured = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
            ? Math.max(0, measuredW)
            : 0;
        return {
            res,
            restored,
            usedW: Math.max(measured, restored ? Math.max(0, held.requestedLoadW) : measured),
            requestedLoadW: Math.max(0, held.requestedLoadW),
            displayTarget: this._thermalDisplayTarget(actType, target),
            status: `${restored ? 'para14a_restored' : 'para14a_restore_pending'}_${label}_${String(res && res.status || '')}`,
        };
    }

    /**
     * §14a-Sicherheitsguard fuer manuelle/extern gehaltene Thermik. Der
     * Kundenwunsch bleibt in der UI erhalten, der reale Aktor wird waehrend
     * einer aktiven Netzbetreiberbegrenzung jedoch mit hoeherer Autoritaet auf
     * das verbleibende Thermik-Budget geklemmt.
     */
    async _enforcePara14aThermalGuard(d, actType, measuredW, allowedW, label = 'manual') {
        const availableW = Math.max(0, num(allowedW, 0));
        const actual = await this._readThermalReadback(d, actType);
        const held = this._capturePara14aThermalRequest(d, actType, actual, measuredW);
        const owner = this._para14aOwner(d);
        const options = {
            owner,
            enforceAuthority: true,
            leaseMs: 20000,
            kind: 'para14a-thermal',
            releaseAuthority: false,
        };

        let targetLoadW = 0;
        const requestedLoadW = Math.max(0, num(held && held.requestedLoadW, 0));
        let targetState = null;
        const consumer = this._thermalConsumerForActType(d, actType);
        const reason = `§14a Thermik ${label}`;

        if (actType === 'setpoint') {
            const requestedTarget = held && held.target && typeof held.target === 'object' ? held.target : {};
            const requestedOn = requestedTarget.enable === true || requestedLoadW > 0;
            const permit = requestedOn && requestedLoadW <= (availableW + 25);
            const rawActualSetpoint = actual && actual.setpoint;
            const actualSetpoint = rawActualSetpoint !== null && rawActualSetpoint !== undefined && Number.isFinite(Number(rawActualSetpoint))
                ? Number(rawActualSetpoint)
                : null;
            const offSetpoint = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint))
                ? d.autoOffSetpoint
                : actualSetpoint;
            targetLoadW = permit ? requestedLoadW : 0;
            targetState = {
                enable: permit,
                setpoint: permit ? requestedTarget.setpoint : offSetpoint,
            };
        } else if (actType === 'sgready') {
            const requestedState = String(held && held.target && held.target.state || 'off').trim().toLowerCase();
            const requestedOn = requestedState === 'on' || requestedState === 'boost';
            const permit = requestedOn && requestedLoadW <= (availableW + 25);
            targetLoadW = permit ? requestedLoadW : 0;
            targetState = { state: permit ? requestedState : 'off' };
        } else {
            const requestedTargetW = Math.max(0, num(held && held.target && held.target.targetW, requestedLoadW));
            targetLoadW = Math.min(requestedTargetW, availableW);
            targetState = { targetW: targetLoadW };
        }

        const limited = requestedLoadW > (targetLoadW + 1)
            || (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > (availableW + 50));
        const res = await this._applyThermalCommand(d, actType, consumer, targetState, reason, options);
        this._recordAcceptedThermalEffect(d, res, measuredW, targetLoadW, reason);
        const measured = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
            ? Math.max(0, measuredW)
            : 0;
        const usedW = Math.max(measured, res && res.accepted ? Math.max(0, targetLoadW) : measured);
        return {
            res,
            usedW,
            targetLoadW,
            displayTarget: this._thermalDisplayTarget(actType, targetState),
            limited,
            status: `${limited ? 'para14a_limited' : 'para14a_guard'}_${label}_${String(res && res.status || '')}`,
        };
    }

    _thermalReadbackMatches(d, actType, target, actual) {
        if (!actual || typeof actual !== 'object') return null;
/**
 * Code-Teil: boolMatch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const boolMatch = (value, expected) => value === null || value === undefined ? null : !!value === !!expected;
/**
 * Code-Teil: numMatch
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const numMatch = (value, expected) => {
            if (expected === null || expected === undefined) return null;
            const a = Number(value); const b = Number(expected);
            if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
            return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
        };
        const results = [];
        if (actType === 'sgready') {
            const raw = String(target && target.state || 'off').trim().toLowerCase();
            let sg1 = raw === 'on' || raw === 'boost' || raw === '1' || raw === '2';
            let sg2 = raw === 'boost' || raw === 'block' || raw === '2' || raw === '3';
            if (d.sgReadyAInvert) sg1 = !sg1;
            if (d.sgReadyBInvert) sg2 = !sg2;
            if (d.sg1Key) results.push(boolMatch(actual.sg1, sg1));
            if (d.sg2Key) results.push(boolMatch(actual.sg2, sg2));
            if (d.enableKey) results.push(boolMatch(actual.enable, raw !== 'off' && raw !== 'normal' && raw !== 'block'));
        } else if (actType === 'setpoint') {
            if (d.setWKey && target && target.setpoint !== undefined && target.setpoint !== null) results.push(numMatch(actual.setpoint, target.setpoint));
            if (d.enableKey && target && target.enable !== undefined && target.enable !== null) results.push(boolMatch(actual.enable, target.enable));
        } else {
            if (d.setWKey) results.push(numMatch(actual.targetW, Math.max(0, Number(target && target.targetW) || 0)));
            if (d.enableKey) results.push(boolMatch(actual.enable, Number(target && target.targetW) > 0));
        }
        const known = results.filter((value) => value !== null);
        if (!known.length) return null;
        return known.every((value) => value === true);
    }

    async _publishThermalContract(d, owner, result) {
        await this._setStateIfChanged(`thermal.devices.${d.id}.owner`, owner);
        await this._setStateIfChanged(`thermal.devices.${d.id}.writeAccepted`, !!result.accepted);
        await this._setStateIfChanged(`thermal.devices.${d.id}.readbackOk`, result.readbackOk === true);
        await this._setStateIfChanged(`thermal.devices.${d.id}.writePending`, !!result.pending);
        await this._setStateIfChanged(`thermal.devices.${d.id}.retryCount`, Math.max(0, Math.round(Number(result.retryCount) || 0)));
        await this._setStateIfChanged(`thermal.devices.${d.id}.faultLocked`, !!result.faultLocked);
        await this._setStateIfChanged(`thermal.devices.${d.id}.faultUntil`, Math.max(0, Math.round(Number(result.faultUntil) || 0)));
        await this._setStateIfChanged(`thermal.devices.${d.id}.writeContractStatus`, String(result.status || ''));
    }

    async _applyThermalCommand(d, actType, consumer, target, reason, options = {}) {
        const manual = options.manual === true;
        const owner = String(options.owner || '').trim() || this._deviceOwner(d, manual);
        const cfg = this._contractCfg(d, options.requireReadback === undefined ? null : options.requireReadback);
        const key = `thermal:${d.id}`;
        const now = Date.now();
        let safeTarget = target && typeof target === 'object' ? { ...target } : {};
        let safetyDecision = null;
        let safetyForcedStop = false;
        let measuredSafetyW = null;
        try {
            if (d.pWKey && typeof this.dp?.getNumberFresh === 'function') {
                measuredSafetyW = this.dp.getNumberFresh(d.pWKey, 30000, null);
                if (!Number.isFinite(Number(measuredSafetyW))) measuredSafetyW = null;
            }
        } catch (_measurementError) {
            measuredSafetyW = null;
        }
        const estimatedLoadW = this._estimatedThermalPowerW(d, measuredSafetyW);
/**
 * Code-Teil: targetLoadW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const targetLoadW = (candidate) => {
            const value = candidate && typeof candidate === 'object' ? candidate : {};
            const state = String(value.state || '').trim().toLowerCase();
            if (actType === 'setpoint') return value.enable === true ? estimatedLoadW : 0;
            if (actType === 'sgready') return state === 'on' || state === 'boost' ? estimatedLoadW : 0;
            return Math.max(0, Number(value.targetW) || 0);
        };
        const requestedLoadW = targetLoadW(safeTarget);

        // Die Safety-Firewall muss auch einen bereits aktiven Verbraucher
        // abschalten können, wenn der neue Plan ohnehin 0/AUS verlangt. Sonst
        // könnte ein ungültiger Envelope über den Readback-/No-change-Pfad einen
        // alten Hardwarezustand weiterlaufen lassen.
        const actualBefore = await this._readThermalReadback(d, actType);
        const readbackActive = actType === 'sgready'
            ? ['on', 'boost'].includes(this._decodeSgReadyState(d, actualBefore))
            : (actType === 'setpoint'
                ? actualBefore && actualBefore.enable === true
                : !!(actualBefore && (actualBefore.enable === true || Number(actualBefore.targetW) > 0)));
        const contractBefore = this._actuatorContract.result(key, now);
        const priorRequestedLoadW = targetLoadW(contractBefore && contractBefore.requested);
        const existingCommandW = readbackActive || priorRequestedLoadW > 0
            ? Math.max(estimatedLoadW, priorRequestedLoadW)
            : 0;
        const existingLoadW = Math.max(
            measuredSafetyW === null ? 0 : Math.max(0, Number(measuredSafetyW) || 0),
            existingCommandW,
        );
        const safetyProbeW = Math.max(requestedLoadW, existingLoadW);

        if (safetyProbeW > 0 && this.adapter && (this.adapter._nwSafetyEnvelopeRequired === true || this.adapter._emsSafetyCycle)) {
            let envelope = null;
            try {
                envelope = liveSafetyEnvelope(this.adapter, this.dp, {
                    now,
                    generation: this.adapter?._emsSafetyCycle?.generation,
                });
            } catch (error) {
                envelope = invalidateSafetyEnvelope(this.adapter, `thermal-live-safety-build-failed:${d.id}:${String(error && error.message || error)}`, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    now,
                    emergencyStop: true,
                });
            }
            safetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                key,
                app: 'thermal',
                deviceKey: d.id,
                requestedW: safetyProbeW,
                currentActualW: measuredSafetyW === null ? 0 : Math.max(0, Number(measuredSafetyW) || 0),
                currentActualFresh: measuredSafetyW !== null,
                phaseCount: Math.max(1, Math.min(3, Number(envelope && envelope.phase && envelope.phase.requiredCount) || 3)),
                voltageV: Number(envelope && envelope.phase && envelope.phase.voltageV) || 230,
                deviceCapW: Number.isFinite(Number(d.maxPowerW)) && Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : estimatedLoadW,
                now,
            });
            const allowedW = Math.max(0, Math.floor(Number(safetyDecision.allowedW) || 0));
            if (requestedLoadW > 0) {
                if (actType === 'setpoint') {
                    const permitted = allowedW + 1 >= requestedLoadW;
                    if (!permitted) {
                        safeTarget.enable = false;
                        if (Number.isFinite(Number(d.autoOffSetpoint))) safeTarget.setpoint = Number(d.autoOffSetpoint);
                    }
                } else if (actType === 'sgready') {
                    if (allowedW + 1 < requestedLoadW) safeTarget = { state: 'off' };
                } else {
                    safeTarget.targetW = Math.min(requestedLoadW, allowedW);
                    if (Object.prototype.hasOwnProperty.call(safeTarget, 'enable')) safeTarget.enable = safeTarget.targetW > 0;
                }
            }
            const effectiveTargetW = targetLoadW(safeTarget);
            const safetyBlocked = safetyDecision.forceZero === true
                || safetyDecision.blocked === true
                || (requestedLoadW > 0 && effectiveTargetW <= 0);
            safetyForcedStop = effectiveTargetW <= 0 && safetyProbeW > 0 && safetyBlocked;
            safetyDecision = {
                ...safetyDecision,
                allowedW: effectiveTargetW,
                blocked: safetyForcedStop,
                clamped: requestedLoadW > 0 ? effectiveTargetW < requestedLoadW : safetyForcedStop,
                forceZero: safetyForcedStop,
                reservation: {
                    targetW: effectiveTargetW,
                    deltaW: Math.max(0, effectiveTargetW - Math.max(0, Number(measuredSafetyW) || 0)),
                    phaseDeltaW: envelope && envelope.phase && envelope.phase.required === true
                        ? Math.max(0, effectiveTargetW - Math.max(0, Number(measuredSafetyW) || 0))
                        : 0,
                    app: 'thermal',
                },
            };
            if (safetyDecision.clamped) reason = `${String(reason || 'Thermik')} | ${String(safetyDecision.reason || 'Safety begrenzt')}`;
        }

        const forceWrite = options.forceWrite === true || safetyForcedStop;
        if (forceWrite) this._actuatorContract.release(key);
        const readbackBefore = this._thermalReadbackMatches(d, actType, safeTarget, actualBefore);
        const confirmed = forceWrite
            ? null
            : this._actuatorContract.confirmFromReadback(key, safeTarget, actualBefore, readbackBefore === true, now);
        if (confirmed) {
            await this._publishThermalContract(d, owner, confirmed);
            if (safetyDecision) commitFlexibleLoadDecision(this.adapter, safetyDecision, true);
            return { applied: true, accepted: true, writeAccepted: false, confirmed: true, readbackOk: true, status: confirmed.status, contract: confirmed, safetyDecision };
        }
        const decision = this._actuatorContract.prepare(key, safeTarget, now, cfg);
        if (!decision.allowed) {
            const current = this._actuatorContract.result(key, now, decision.targetChanged);
            await this._publishThermalContract(d, owner, current);
            return { applied: false, accepted: false, writeAccepted: false, confirmed: false, readbackOk: current.readbackOk, status: current.status, contract: current };
        }
        const enforceAuthority = options.enforceAuthority === true || this._deviceHasExclusiveAuthority(d, owner);
        const writeRes = await withActuatorShadowContext(this.adapter, {
            owner,
            module: 'thermalControl',
            priority: priorityForOwner(owner),
            reason,
            leaseMs: Number.isFinite(Number(options.leaseMs)) ? Math.max(0, Number(options.leaseMs)) : (manual ? 5 * 60 * 1000 : 20000),
            kind: String(options.kind || (manual ? 'manual-thermal' : 'thermal-control')),
            enforceAuthority,
            releaseAuthority: options.releaseAuthority === true || safetyForcedStop,
        }, () => applySetpoint({ dp: this.dp, adapter: this.adapter }, consumer, safeTarget));
        const accepted = !!(writeRes && writeRes.applied === true);
        const actualAfter = await this._readThermalReadback(d, actType);
        const readbackOk = this._thermalReadbackMatches(d, actType, safeTarget, actualAfter);
        const contract = this._actuatorContract.complete(key, safeTarget, accepted, readbackOk, actualAfter, Date.now(), cfg);
        await this._publishThermalContract(d, owner, contract);
        if (safetyDecision) commitFlexibleLoadDecision(this.adapter, safetyDecision, accepted || contract.confirmed === true);
        if ((safetyDecision || safetyForcedStop) && !(accepted || contract.confirmed === true) && (requestedLoadW > 0 || safetyForcedStop)) {
            invalidateSafetyEnvelope(this.adapter, `thermal-write-not-confirmed:${d.id}:${String(contract.status || writeRes && writeRes.status || 'unknown')}`, {
                generation: this.adapter?._emsSafetyCycle?.generation,
                now: Date.now(),
                emergencyStop: true,
            });
            try { this.adapter?._nwRequestImmediateEmsTick?.(`safety:thermal-write:${d.id}`, 0); } catch (_tickError) {}
        }
        return {
            ...writeRes,
            applied: contract.confirmed,
            accepted,
            writeAccepted: accepted,
            confirmed: contract.confirmed,
            readbackOk,
            status: contract.status,
            contract,
            safetyDecision,
            safetyForcedStop,
        };
    }

    _recordAcceptedThermalEffect(d, result, measuredW, targetLoadW, reason) {
        if (!result || result.writeAccepted !== true) return;
        const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
            ? Math.max(0, measuredW)
            : null;
        recordAcceptedPowerTarget(this.adapter, {
            key: `thermal:${d.id}`,
            targetW: Math.max(0, Math.round(Number(targetLoadW) || 0)),
            baselineW,
            accepted: true,
            uncertain: baselineW === null,
            kind: 'load',
            source: 'thermalControl',
            reason: String(reason || result.status || ''),
        });
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        async tick() {
        if (!this._isEnabled()) return;

        const now = nowMs();

        const pv = this._computePvAvailableW();
        let remainingW = Math.max(0, num(pv.availableW, 0));
        const para14aActive = this._isPara14aActive();
        let para14aRemainingW = para14aActive
            ? Math.max(0, num(pv.para14aAvailableW, 0))
            : Number.POSITIVE_INFINITY;
/**
 * Code-Teil: consumeControlledW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const consumeControlledW = (rawW, countAgainstPara14a = true) => {
            const usedW = Math.max(0, num(rawW, 0));
            remainingW = Math.max(0, remainingW - usedW);
            if (para14aActive && countAgainstPara14a) para14aRemainingW = Math.max(0, para14aRemainingW - usedW);
            return usedW;
        };
/**
 * Code-Teil: availableForAutomationW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const availableForAutomationW = () => para14aActive
            ? Math.max(0, Math.min(remainingW, para14aRemainingW))
            : Math.max(0, remainingW);
/**
 * Code-Teil: para14aOptions
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const para14aOptions = (d, extra = {}) => para14aActive
            ? {
                owner: this._para14aOwner(d),
                enforceAuthority: true,
                leaseMs: 20000,
                kind: 'para14a-thermal',
                releaseAuthority: false,
                ...extra,
            }
            : extra;

        let appliedTotalW = 0;
        let budgetUsedW = 0;
        const ctx = { dp: this.dp, adapter: this.adapter };
        // Der Core darf nur aktuelle PV-Automatiklast in sein PV-Budget
        // zurückrechnen. Dieser Modusnachweis ist getrennt von der direkten
        // Leistungsmessung; er erzeugt selbst keinen Leistungswert.
        this.adapter._zeroExportPvOwnedThermal = {};

        for (const d of this._devices) {
            // Publish static info
            await this._setStateIfChanged(`thermal.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`thermal.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.mode`, String(d.mode));

            // User overrides (VIS): enable/disable automation + override operating mode.
            // Values are cached via dpRegistry (local states under thermal.user.*).
            let userEnabled = true;
            try {
                if (this.dp && d.userEnabledKey && this.dp.getEntry && this.dp.getEntry(d.userEnabledKey)) {
                    const b = this.dp.getBoolean(d.userEnabledKey, true);
                    userEnabled = (b === null || b === undefined) ? true : !!b;
                }
            } catch (_e) {
                userEnabled = true;
            }

            let userMode = 'inherit';
            try {
                if (this.dp && d.userModeKey && this.dp.getEntry && this.dp.getEntry(d.userModeKey)) {
                    const raw = this.dp.getRaw(d.userModeKey, null);
                    if (raw !== null && raw !== undefined) userMode = String(raw).trim();
                }
            } catch (_e) {
                userMode = 'inherit';
            }

            /**
             * Code-Teil: Arrow-Funktion `normMode`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
                        const normMode = (m) => {
                const s = String(m || '').trim().toLowerCase();
                if (!s || s === 'inherit' || s === 'system') return 'inherit';
                if (s === 'auto' || s === 'pvauto' || s === 'pv' || s === 'pva') return 'pvAuto';
                if (s === 'manual' || s === 'manuell') return 'manual';
                if (s === 'off' || s === 'aus' || s === '0') return 'off';
                return 'inherit';
            };

            userMode = normMode(userMode);

            const effectiveEnabled = !!d.enabled && !!userEnabled;
            const effectiveMode = (userMode !== 'inherit') ? userMode : String(d.mode || 'pvAuto');
            const strategyAliases = [
                `thermal:${Math.max(1, Number(d.configIndex || 0) + 1)}`,
                `thermal:${String(d.id || '')}`,
            ];
            const strategyOverlay = resolveThermalStrategyOverlay(this.adapter, strategyAliases, { now, effectiveMode });

            await this._setStateIfChanged(`thermal.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`thermal.devices.${d.id}.effectiveMode`, String(effectiveMode));
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyEligible`, strategyOverlay.eligible === true);
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyActive`, strategyOverlay.active === true);
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyFallbackActive`, strategyOverlay.fallbackPause === true);
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyAction`, String(strategyOverlay.action || 'standard'));
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyRequestedPowerW`, Number.isFinite(Number(strategyOverlay.requestedPowerW)) ? Math.max(0, Math.round(Number(strategyOverlay.requestedPowerW))) : null);
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyReason`, String(strategyOverlay.reason || ''));
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyFallback`, String(strategyOverlay.fallback || 'standardAuto'));
            await this._setStateIfChanged(`thermal.devices.${d.id}.strategyExpiresAt`, Math.max(0, Math.round(Number(strategyOverlay.request && strategyOverlay.request.expiresAt) || 0)));

            await this._setStateIfChanged(`thermal.devices.${d.id}.type`, String(d.type));
            await this._setStateIfChanged(`thermal.devices.${d.id}.profile`, String(d.profile));

            const actType = (d.type === 'sgready' || d.sg1Key || d.sg2Key) ? 'sgready' : String(d.type || 'power');
            const targetUnit = (actType === 'setpoint') ? '°C' : (actType === 'sgready' ? '—' : 'W');
            const targetKind = (actType === 'setpoint') ? 'setpoint' : (actType === 'sgready' ? 'sgready' : 'power');
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetUnit`, targetUnit);
            await this._setStateIfChanged(`thermal.devices.${d.id}.targetKind`, targetKind);

            // Read measured power if mapped
            let measuredW = null;
            if (this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey)) {
                measuredW = this.dp.getNumber(d.pWKey, null);
                if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                    await this._setStateIfChanged(`thermal.devices.${d.id}.measuredW`, Math.round(measuredW));
                }
            }

            // Overrides
            const ov = this._readOverrideForDevice(d, now);
            // Manuell, Aus und Boost bleiben Hauslast. Der Core prüft zusätzlich
            // die Frische dieses Nachweises und des gemappten Leistungszählers.
            this.adapter._zeroExportPvOwnedThermal[d.id] = {
                owned: effectiveEnabled && effectiveMode === 'pvAuto' && !ov.boostActive && !ov.manualActive,
                ts: now,
            };
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`thermal.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);
            await this._setStateIfChanged(`thermal.devices.${d.id}.manualUntil`, ov.manualUntil ? Math.round(ov.manualUntil) : 0);

            const heldManualContext = !effectiveEnabled
                || (ov.manualActive && !ov.boostActive)
                || effectiveMode === 'manual';
            if (!heldManualContext) this._para14aHeldRequests.delete(String(d.id));

            // A customer may pause normal automation, but an active §14a command
            // must still remain authoritative for every configured controllable
            // thermal device. Devices disabled in the installer configuration are
            // intentionally not auto-linked and remain untouched.
            if (!effectiveEnabled) {
                const para14aControllable = d.enabled === true && this._deviceActuatorIds(d).length > 0;
                if (para14aActive && para14aControllable) {
                    const guard = await this._enforcePara14aThermalGuard(
                        d,
                        actType,
                        measuredW,
                        para14aRemainingW,
                        userEnabled ? 'disabled' : 'regulation_off',
                    );
                    const used = consumeControlledW(guard.usedW);
                    appliedTotalW += Math.max(0, Math.round(used));
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, guard.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!guard.res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, guard.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldThermalRequest(
                    d,
                    actType,
                    measuredW,
                    userEnabled ? 'disabled' : 'regulation_off',
                );
                if (restore) {
                    const used = consumeControlledW(restore.usedW, false);
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, restore.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!(restore.res && restore.res.applied));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, restore.restored ? '' : 'para14a_release');
                    continue;
                }

                const used = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? consumeControlledW(measuredW, false)
                    : 0;
                budgetUsedW += Math.max(0, Math.round(used));
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, userEnabled ? 'disabled' : 'regulation_off');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Manual-hold normally preserves the customer command. §14a is the
            // only allowed pre-emption and clamps the real actuator while the
            // original manual request remains stored for later restoration.
            if (ov.manualActive && !ov.boostActive) {
                if (para14aActive) {
                    const guard = await this._enforcePara14aThermalGuard(d, actType, measuredW, para14aRemainingW, 'manual_hold');
                    const used = consumeControlledW(guard.usedW);
                    appliedTotalW += Math.max(0, Math.round(used));
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, guard.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!guard.res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, guard.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'manual_hold_para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldThermalRequest(d, actType, measuredW, 'manual_hold');
                if (restore) {
                    const used = consumeControlledW(restore.usedW);
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, restore.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!(restore.res && restore.res.applied));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, restore.restored ? 'manual_hold' : 'para14a_release');
                    continue;
                }

                const used = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? consumeControlledW(measuredW)
                    : 0;
                budgetUsedW += Math.max(0, Math.round(used));
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual_hold');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'manual_hold');
                continue;
            }

            // Boost override (force on)
            if (ov.boostActive && d.boostEnabled) {
                let usedW = 0;
                const boostAvailableW = para14aActive ? para14aRemainingW : Number.POSITIVE_INFINITY;
                const estimateW = this._estimatedThermalPowerW(d, measuredW);

                if (actType === 'setpoint') {
                    const sp = (typeof d.boostSetpoint === 'number' && Number.isFinite(d.boostSetpoint))
                        ? d.boostSetpoint
                        : (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint) ? d.autoOnSetpoint : null);
                    const spOff = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;
                    const permitted = !para14aActive || estimateW <= (boostAvailableW + 25);

                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const command = { enable: permitted, setpoint: permitted ? sp : spOff };
                    const res = await this._applyThermalCommand(
                        d,
                        actType,
                        consumer,
                        command,
                        permitted ? 'Thermik Boost Setpoint' : 'Thermik Boost durch §14a begrenzt',
                        para14aActive ? para14aOptions(d) : { manual: true },
                    );
                    const commandedLoadW = permitted ? estimateW : 0;
                    this._recordAcceptedThermalEffect(d, res, measuredW, commandedLoadW, 'Thermik Boost Setpoint');

                    const displaySp = permitted ? sp : spOff;
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (displaySp !== null && displaySp !== undefined && Number.isFinite(Number(displaySp))) ? Number(displaySp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${permitted ? 'boost' : 'para14a_limited_boost'}_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? commandedLoadW : 0);
                } else if (actType === 'sgready') {
                    const permitted = !para14aActive || estimateW <= (boostAvailableW + 25);
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await this._applyThermalCommand(
                        d,
                        actType,
                        consumer,
                        { state: permitted ? 'boost' : 'off' },
                        permitted ? 'Thermik Boost SG-Ready' : 'Thermik Boost SG-Ready durch §14a begrenzt',
                        para14aActive ? para14aOptions(d) : { manual: true },
                    );
                    const commandedLoadW = permitted ? estimateW : 0;
                    this._recordAcceptedThermalEffect(d, res, measuredW, commandedLoadW, 'Thermik Boost SG-Ready');

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, permitted ? 2 : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${permitted ? 'boost' : 'para14a_limited_boost'}_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? commandedLoadW : 0);
                } else {
                    const requestedW = clamp(num(d.boostPowerW, d.maxPowerW), 0, num(d.maxPowerW, 0));
                    const targetW = para14aActive ? Math.min(requestedW, boostAvailableW) : requestedW;
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(
                        d,
                        actType,
                        consumer,
                        { targetW },
                        targetW + 1 < requestedW ? 'Thermik Boost Leistung durch §14a begrenzt' : 'Thermik Boost Leistung',
                        para14aActive ? para14aOptions(d) : { manual: true },
                    );
                    this._recordAcceptedThermalEffect(d, res, measuredW, targetW, 'Thermik Boost Leistung');

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(targetW));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${targetW + 1 < requestedW ? 'para14a_limited_boost' : 'boost'}_${String(res.status || '')}`);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'boost');

                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? Math.max(0, Math.round(targetW)) : 0);
                }

                usedW = consumeControlledW(usedW);
                appliedTotalW += Math.max(0, Math.round(usedW));
                budgetUsedW += Math.max(0, Math.round(usedW));
                continue;
            }

            // Manual mode is preserved during normal operation; §14a may still
            // reduce or stop the actuator with its dedicated safety owner.
            if (effectiveMode === 'manual') {
                if (para14aActive) {
                    const guard = await this._enforcePara14aThermalGuard(d, actType, measuredW, para14aRemainingW, 'manual');
                    const used = consumeControlledW(guard.usedW);
                    appliedTotalW += Math.max(0, Math.round(used));
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, guard.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!guard.res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, guard.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, 'para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldThermalRequest(d, actType, measuredW, 'manual');
                if (restore) {
                    const used = consumeControlledW(restore.usedW);
                    budgetUsedW += Math.max(0, Math.round(used));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, restore.displayTarget);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!(restore.res && restore.res.applied));
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.override`, restore.restored ? '' : 'para14a_release');
                    continue;
                }

                const used = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? consumeControlledW(measuredW)
                    : 0;
                budgetUsedW += Math.max(0, Math.round(used));
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, false);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, 'manual');
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // Off -> actively disable/zero (if DPs exist)
            if (effectiveMode === 'off') {
                let usedW = 0;

                if (actType === 'setpoint') {
                    const sp = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;
                    const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { enable: false, setpoint: sp }, 'Thermik aus Setpoint', para14aActive
                        ? para14aOptions(d)
                        : { manual: userMode !== 'inherit', releaseAuthority: true });
                    this._recordAcceptedThermalEffect(d, res, measuredW, 0, 'Thermik aus Setpoint');

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (sp !== null && sp !== undefined && Number.isFinite(Number(sp))) ? Number(sp) : 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else if (actType === 'sgready') {
                    const consumer = {
                        type: 'sgready',
                        key: d.id,
                        name: d.name,
                        sg1Key: d.sg1Key,
                        sg2Key: d.sg2Key,
                        enableKey: d.enableKey,
                        invert1: !!d.sgReadyAInvert,
                        invert2: !!d.sgReadyBInvert,
                    };
                    const res = await this._applyThermalCommand(d, actType, consumer, { state: 'off' }, 'Thermik aus SG-Ready', para14aActive
                        ? para14aOptions(d)
                        : { manual: userMode !== 'inherit', releaseAuthority: true });
                    this._recordAcceptedThermalEffect(d, res, measuredW, 0, 'Thermik aus SG-Ready');

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                } else {
                    const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                    const res = await this._applyThermalCommand(d, actType, consumer, { targetW: 0 }, 'Thermik aus Leistung', para14aActive
                        ? para14aOptions(d)
                        : { manual: userMode !== 'inherit', releaseAuthority: true });
                    this._recordAcceptedThermalEffect(d, res, measuredW, 0, 'Thermik aus Leistung');

                    await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                    await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                }

                // While ramping down, we still account measured usage.
                if (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0) usedW = measuredW;
                usedW = consumeControlledW(usedW);
                appliedTotalW += Math.max(0, Math.round(usedW));
                budgetUsedW += Math.max(0, Math.round(usedW));
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');
                continue;
            }

            // PV auto
            let usedW = 0;

            const startW = Math.max(0, num(d.startSurplusW, 0));
            const stopW = Math.max(0, num(d.stopSurplusW, 0));

            const autoAvailableW = availableForAutomationW();
            const nativeDesiredOn = this._computeBandDesiredOn(d.id, autoAvailableW, startW, stopW);
            const strategyAction = String(strategyOverlay.action || 'standard').toLowerCase();
            const strategyPause = strategyOverlay.fallbackPause === true
                || (strategyOverlay.active && ['pause', 'off', 'disable', 'block'].includes(strategyAction));
            const strategyRelease = strategyOverlay.active && ['release', 'on', 'enable'].includes(strategyAction);
            const strategyDesiredOn = strategyPause ? false : (strategyRelease ? true : nativeDesiredOn);
            // Die finale Entscheidung läuft weiterhin durch die vorhandenen Geräte-Schutzzeiten.
            // Auch eine Strategie darf Mindestlauf- und Mindeststillstandszeit nicht umgehen.
            const requestedOn = this._hysteresisOnOff(d.id, strategyDesiredOn, d.minOnSec, d.minOffSec);

            const estimatedLoadW = this._estimatedThermalPowerW(d, measuredW);
            const strategySafetyRelease = strategyRelease && strategyOverlay.safetyRelease === true;
            const strategyGridRelease = strategyRelease && strategyOverlay.allowGridImport === true;
            const strategyReleaseBudget = strategySafetyRelease || strategyGridRelease;
            const binaryBudgetW = strategyReleaseBudget
                ? (para14aActive ? Math.max(0, para14aRemainingW) : Math.max(autoAvailableW, estimatedLoadW))
                : autoAvailableW;
            const binaryOn = requestedOn && (!para14aActive || estimatedLoadW <= (binaryBudgetW + 25));
            const para14aBinaryLimited = para14aActive && requestedOn && !binaryOn;

            if (actType === 'setpoint') {
                const spOn = (typeof d.autoOnSetpoint === 'number' && Number.isFinite(d.autoOnSetpoint)) ? d.autoOnSetpoint : null;
                const spOff = (typeof d.autoOffSetpoint === 'number' && Number.isFinite(d.autoOffSetpoint)) ? d.autoOffSetpoint : null;

                const consumer = { type: 'setpoint', key: d.id, name: d.name, setKey: d.setWKey, enableKey: d.enableKey };
                const res = await this._applyThermalCommand(
                    d,
                    actType,
                    consumer,
                    { enable: !!binaryOn, setpoint: binaryOn ? spOn : spOff },
                    para14aBinaryLimited ? 'Thermik PV-Auto durch §14a begrenzt' : (binaryOn ? 'Thermik PV-Auto ein' : 'Thermik PV-Auto aus'),
                    para14aActive ? para14aOptions(d) : { releaseAuthority: !binaryOn },
                );
                const commandedLoadW = binaryOn ? estimatedLoadW : 0;
                this._recordAcceptedThermalEffect(d, res, measuredW, commandedLoadW, binaryOn ? 'Thermik PV-Auto ein' : 'Thermik PV-Auto aus');

                const targetSp = binaryOn ? spOn : spOff;
                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, (targetSp !== null && targetSp !== undefined && Number.isFinite(Number(targetSp))) ? Number(targetSp) : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${para14aBinaryLimited ? 'para14a_limited_' : ''}${String(res.status || (binaryOn ? 'on' : 'off'))}`);
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (binaryOn) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? commandedLoadW : 0);
                } else {
                    usedW = 0;
                }
            } else if (actType === 'sgready') {
                const consumer = {
                    type: 'sgready',
                    key: d.id,
                    name: d.name,
                    sg1Key: d.sg1Key,
                    sg2Key: d.sg2Key,
                    enableKey: d.enableKey,
                    invert1: !!d.sgReadyAInvert,
                    invert2: !!d.sgReadyBInvert,
                };
                const res = await this._applyThermalCommand(
                    d,
                    actType,
                    consumer,
                    { state: binaryOn ? 'on' : 'off' },
                    para14aBinaryLimited ? 'Thermik PV-Auto SG-Ready durch §14a begrenzt' : (binaryOn ? 'Thermik PV-Auto SG-Ready ein' : 'Thermik PV-Auto SG-Ready aus'),
                    para14aActive ? para14aOptions(d) : { releaseAuthority: !binaryOn },
                );
                const commandedLoadW = binaryOn ? estimatedLoadW : 0;
                this._recordAcceptedThermalEffect(d, res, measuredW, commandedLoadW, binaryOn ? 'Thermik PV-Auto SG-Ready ein' : 'Thermik PV-Auto SG-Ready aus');

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, binaryOn ? 1 : 0);
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${para14aBinaryLimited ? 'para14a_limited_' : ''}${String(res.status || (binaryOn ? 'on' : 'off'))}`);
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                if (binaryOn) {
                    usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                        ? Math.max(0, measuredW)
                        : (res.accepted ? commandedLoadW : 0);
                } else {
                    usedW = 0;
                }
            } else {
                let requestedPowerW = requestedOn ? Math.max(0, num(d.maxPowerW, 0)) : 0;
                if (strategyOverlay.active && Number.isFinite(Number(strategyOverlay.requestedPowerW))) {
                    requestedPowerW = Math.min(requestedPowerW, Math.max(0, Number(strategyOverlay.requestedPowerW)));
                }
                const powerBudgetW = strategyReleaseBudget
                    ? (para14aActive ? Math.max(0, para14aRemainingW) : requestedPowerW)
                    : autoAvailableW;
                const desiredW = requestedOn ? Math.min(powerBudgetW, requestedPowerW) : 0;
                const para14aPowerLimited = para14aActive && requestedOn && desiredW + 1 < requestedPowerW;

                const consumer = { type: 'load', key: d.id, name: d.name, setWKey: d.setWKey, enableKey: d.enableKey };
                const res = await this._applyThermalCommand(
                    d,
                    actType,
                    consumer,
                    { targetW: desiredW },
                    para14aPowerLimited ? 'Thermik PV-Auto Leistung durch §14a begrenzt' : (desiredW > 0 ? 'Thermik PV-Auto Leistung' : 'Thermik PV-Auto aus'),
                    para14aActive ? para14aOptions(d) : { releaseAuthority: desiredW <= 0 },
                );
                this._recordAcceptedThermalEffect(d, res, measuredW, desiredW, desiredW > 0 ? 'Thermik PV-Auto Leistung' : 'Thermik PV-Auto aus');

                await this._setStateIfChanged(`thermal.devices.${d.id}.targetW`, Math.round(desiredW));
                await this._setStateIfChanged(`thermal.devices.${d.id}.applied`, !!res.applied);
                await this._setStateIfChanged(`thermal.devices.${d.id}.status`, `${para14aPowerLimited ? 'para14a_limited_' : ''}${String(res.status || '')}`);
                await this._setStateIfChanged(`thermal.devices.${d.id}.override`, '');

                usedW = (typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 0)
                    ? Math.max(0, measuredW)
                    : (res.accepted ? Math.max(0, Math.round(desiredW)) : 0);
            }

            usedW = consumeControlledW(usedW);
            appliedTotalW += Math.max(0, Math.round(usedW));
            budgetUsedW += Math.max(0, Math.round(usedW));
        }

        this.adapter._thermalBudgetUsedW = Math.round(budgetUsedW);

        // Central EMS Budget & Gates reservation for downstream apps.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const used = Math.max(0, Math.round(budgetUsedW || 0));
                const tariffImportPreferred = String(pv.source || '').includes('tariffNegative');
                rt.reserve({
                    key: 'thermal',
                    app: 'thermalControl',
                    label: 'Thermik',
                    priority: 200,
                    requestedW: used,
                    reserveW: used,
                    pvReserveW: tariffImportPreferred ? 0 : used,
                    pvOnly: !tariffImportPreferred,
                    mode: tariffImportPreferred ? 'tariffNegative' : 'pvAuto',
                });
            }
        } catch (_e) {
            // budget diagnostics only
        }

        await this._setStateIfChanged('thermal.summary.pvCapW', Math.round(num(pv.pvCapW, 0)));
        await this._setStateIfChanged('thermal.summary.evcsUsedW', Math.round(num(pv.evcsUsedW, 0)));
        await this._setStateIfChanged('thermal.summary.pvAvailableW', Math.round(num(pv.availableW, 0)));
        await this._setStateIfChanged('thermal.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('thermal.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('thermal.summary.lastUpdate', now);
        await this._setStateIfChanged('thermal.summary.status', (this._devices && this._devices.length) ? `ok_${pv.source}` : 'no_devices');
    }
}

module.exports = { ThermalControlModule };
