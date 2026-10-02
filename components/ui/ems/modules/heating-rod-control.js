/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/heating-rod-control.ts
 * Quell-Hash: sha256:069461b3b1d07ee9a85c283a76953d3ba03297671309995fda5e09f122e4c992
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/heating-rod-control.js.
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
 * Aufgabe: Leitet aus Temperatur, Freigaben und Energieüberschuss eine begrenzte Heizstab-Anforderung ab.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/heating-rod-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/heating-rod-control.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/heating-rod-control.js`.
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
 * Datei: ems/modules/heating-rod-control.js
 * Rolle im Projekt: Heizstabregelung.
 * Zweck: Regelt Heizstab-Freigaben aus PV-Budget, Speicherreserve, Temperatur und Schutzlogik.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Heizstab-Regelung: berechnet Freigaben, Stufen, Speicherreserve und PV-/Netzbedingungen für Heizstabsteuerung.
 * Zusammenhänge:
 * - Nutzt Budgets aus core-limits.js und Config aus App-Center.
 * - Schreibt Heizstab-States und Stufenausgänge.
 * Wartungshinweise:
 * - Speicherreserve und PV-Budget dürfen nicht durch falsche Batterie-Fallbacks verfälscht werden.
 */

'use strict';


/**
 * Datenvertrag: HeatingRodRuntime
 * Zweck: Beschreibt die laufende Heizstab-Regelung: Budget, Reserve, Freigaben, Stufen und aktuelle Leistung.
 * Zusammenhang: App-Center schreibt Config; core-limits.js liefert Budget; dieses Modul schreibt Heizstab-States.
 * TypeScript-Ziel: HeatingRodRuntime und HeatingRodConfig als getrennte Interfaces modellieren.
 */

/**
 * Vertragsstelle: Speicherreserve
 * Zweck: Speicherreserve-Werte aus dem App-Center dürfen nicht auf Defaults zurückspringen.
 * Wichtig: Änderungen an Config-Speichern immer mit UI-Speichern und anschließendem Reload prüfen.
 */


const { BaseModule } = require('./base');
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract } = require('../services/actuator-command-contract');
const { recordAcceptedPowerTarget, recordAcceptedActuatorTransition } = require('../services/accepted-power-effects');
const { resolveHeatingRodStrategyOverlay } = require('../services/operating-strategy-runtime');
const { readZeroExportMode, requestZeroExportProbe, isZeroExportGrantValid } = require('../services/zero-export-pv-coordinator');
const {
    liveSafetyEnvelope,
    evaluateFlexibleLoadRequest,
    commitFlexibleLoadDecision,
    invalidateSafetyEnvelope,
} = require('../services/safety-envelope');


/**
 * Code-Teil: requireHeatingRodTsMirror
 *
 * Zweck:
 * Lädt den aus TypeScript erzeugten Heizstab-Entscheidungsspiegel.
 *
 * Zusammenhang:
 * In 0.7.77 dient dieser Spiegel ausschließlich zum Shadow-Vergleich. Die reale
 * Heizstab-Schaltlogik bleibt komplett in `heating-rod-control.js`.
 */
function requireHeatingRodTsMirror() {
    try {
        return require('../../lib/ts-mirrors/ems/heating-rod/heating-rod-decision');
    } catch (_e) {
        return null;
    }
}

/**
 * Code-Teil: compareHeatingRodShadowField
 *
 * Zweck:
 * Vergleicht alte JS-Entscheidung und neue TS-Entscheidung für ein Feld.
 *
 * Wichtig:
 * Der Vergleich ist Diagnose. Er darf niemals eine Stufe, Leistung oder einen
 * Ausgang überschreiben.
 */
function compareHeatingRodShadowField(field, jsValue, tsValue, toleranceW = 5) {
    const js = Number(jsValue);
    const ts = Number(tsValue);
    if (Number.isFinite(js) || Number.isFinite(ts)) {
        // Nur Leistungswerte dürfen eine kleine Rundungs-/Messmodelltoleranz nutzen.
        // Zielstufen sind diskrete Hardwarezustände und müssen exakt übereinstimmen.
        const tolerance = field === 'targetPowerW' ? Math.max(0, Number(toleranceW) || 0) : 0;
        const ok = Number.isFinite(js) && Number.isFinite(ts) && Math.abs(js - ts) <= tolerance;
        return ok ? null : { field, js: Number.isFinite(js) ? Math.round(js) : null, ts: Number.isFinite(ts) ? Math.round(ts) : null };
    }
    return jsValue === tsValue ? null : { field, js: jsValue, ts: tsValue };
}

/**
 * Code-Teil: isHeatingRodShadowBlockingMismatch
 *
 * Zweck:
 * Trennt eine echte Schaltabweichung von einer rein diagnostischen Leistungsmodell-
 * Abweichung. Für die Hardware ist die Zielstufe maßgeblich; `targetPowerW` wird nach
 * der Stufenwahl weiterhin aus dem produktiven, angelernten Leistungsmodell berechnet.
 *
 * Sicherheitsregel:
 * Eine abweichende Zielstufe oder ein Shadow-Laufzeitfehler bleibt blockierend und wird
 * als Warnung protokolliert. Eine reine Watt-Abweichung bei identischer Zielstufe darf
 * weder die TS-Normalpfadbewertung blockieren noch das Warnprotokoll zyklisch füllen.
 */
function isHeatingRodShadowBlockingMismatch(mismatch) {
    const field = String(mismatch && mismatch.field || '');
    return field === 'targetStage' || field === 'exception';
}
function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function clamp(v, minV, maxV) {
    const n = Number(v);
    if (!Number.isFinite(n)) return minV;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}
function safeSlot(slot) {
    const s = Math.round(Number(slot) || 0);
    if (s < 1) return 1;
    if (s > 10) return 10;
    return s;
}
function nowMs() {
    return Date.now();
}
function normalizeMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'manual' || s === 'manuell') return 'manual';
    if (s === 'off' || s === 'aus' || s === '0') return 'off';
    return 'pvAuto';
}
function normalizeUserMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s || s === 'inherit' || s === 'system') return 'inherit';
    if (s === 'auto' || s === 'pvauto' || s === 'pv' || s === 'pva') return 'pvAuto';
    if (s === 'manual1' || s === 'stufe1' || s === 'level1') return 'manual1';
    if (s === 'manual2' || s === 'stufe2' || s === 'level2') return 'manual2';
    if (s === 'manual3' || s === 'stufe3' || s === 'level3') return 'manual3';
    if (s === 'off' || s === 'aus' || s === '0') return 'off';
    return 'inherit';
}

/**
 * Normalisiert eine lokale Uhrzeit im Format HH:MM. Die Heizstab-Nachtsperre
 * arbeitet absichtlich ohne Wetter-/Cloud-Abhängigkeit und folgt der lokalen
 * Systemzeit des EOS-Controllers.
 */
function normalizeHeatingRodTimeOfDay(raw, fallback = '00:00') {
    const source = String(raw ?? '').trim();
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(source);
    if (!match) return String(fallback || '00:00');
    const hour = Math.max(0, Math.min(23, Math.round(Number(match[1]) || 0)));
    const minute = Math.max(0, Math.min(59, Math.round(Number(match[2]) || 0)));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function heatingRodTimeOfDayMinutes(value) {
    const normalized = normalizeHeatingRodTimeOfDay(value, '00:00');
    const [hour, minute] = normalized.split(':').map(Number);
    return (hour * 60) + minute;
}

/**
 * Liefert den konfigurierten Nachtzeitraum. Ein Fenster über Mitternacht wird
 * korrekt behandelt. Start == Ende bedeutet bei aktivierter Sperre bewusst
 * 24 Stunden manuelle Freigabe, damit eine Fehlkonfiguration nicht heimlich
 * PV-Auto einschaltet.
 */
function resolveHeatingRodNightPvAutoLock(cfg = {}, timestamp = Date.now()) {
    const enabled = cfg.blockPvAutoAtNight !== false;
    const startTime = normalizeHeatingRodTimeOfDay(cfg.nightStartTime, '20:00');
    const endTime = normalizeHeatingRodTimeOfDay(cfg.nightEndTime, '06:00');
    const startMinute = heatingRodTimeOfDayMinutes(startTime);
    const endMinute = heatingRodTimeOfDayMinutes(endTime);
    const date = new Date(Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now());
    const currentMinute = (date.getHours() * 60) + date.getMinutes();
    let active = false;
    if (enabled) {
        if (startMinute === endMinute) active = true;
        else if (startMinute < endMinute) active = currentMinute >= startMinute && currentMinute < endMinute;
        else active = currentMinute >= startMinute || currentMinute < endMinute;
    }
    return {
        enabled,
        active,
        startTime,
        endTime,
        currentMinute,
        reason: !enabled
            ? 'night-lock-disabled'
            : (active ? 'night-window-manual-release-only' : 'outside-night-window'),
    };
}
/**
 * Code-Teil: normalizeHeatingRodAutoMode
 * Zweck: Normalisiert die Betriebsart, die hinter dem einen sichtbaren Auto-Button liegt.
 * Zusammenhang: `pvAuto` bleibt der Kundenmodus im Frontend; diese Auswahl entscheidet intern,
 * ob Auto nach gemessenem PV-Überschuss am NVP oder nach 0-W-Einspeisung/Forecast regelt.
 * TypeScript: Beim späteren Ausbau als Union-Typ `'pvSurplus' | 'zeroExportForecast'` führen.
 */
function normalizeHeatingRodAutoMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'zeroexportforecast' || s === 'zero-export-forecast' || s === 'zero_export_forecast'
        || s === 'zeroexport' || s === 'zero-export' || s === 'zero_export'
        || s === 'zerofeedin' || s === 'zero-feed-in' || s === 'zero_feed_in'
        || s === 'zero' || s === '0w' || s === '0-w' || s === '0_w'
        || s === '0einspeisung' || s === '0-einspeisung' || s === '0_einspeisung'
        || s === 'zeroeinspeisung' || s === 'forecast') return 'zeroExportForecast';
    return 'pvSurplus';
}
function normalizeConsumerType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'generic';
    if (s === 'heatingrod' || s === 'heating_rod' || s === 'heating-rod' || s === 'immersion' || s === 'heizstab' || s === 'rod') return 'heatingRod';
    if (s === 'heatpump' || s === 'heat_pump' || s === 'heat-pump' || s === 'waermepumpe' || s === 'wärmepumpe' || s === 'hvac' || s === 'klima') return 'heatPump';
    return 'generic';
}
function defaultStagePower(maxPowerW, stageCount, idx) {
    const cnt = Math.max(1, Math.round(Number(stageCount) || 1));
    const maxW = Math.max(0, Math.round(Number(maxPowerW) || 0));
    if (!maxW) return 0;
    const base = Math.floor(maxW / cnt);
    const rest = maxW - (base * cnt);
    return base + (idx === cnt - 1 ? rest : 0);
}
/**
 * Code-Teil: computeStageDefaults
 * Zweck: Berechnet abgeleitete Werte.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function computeStageDefaults(maxPowerW, stageCount) {
    const stages = [];
    let cumulative = 0;
    for (let i = 0; i < stageCount; i++) {
        const powerW = defaultStagePower(maxPowerW, stageCount, i);
        cumulative += powerW;
        const offMargin = Math.max(100, Math.round(powerW * 0.4));
        stages.push({
            index: i + 1,
            powerW,
            onAboveW: cumulative,
            offBelowW: Math.max(0, cumulative - offMargin),
        });
    }
    return stages;
}
function quickManualLevelToStageCount(stageCount, level) {
    const cnt = Math.max(1, Math.round(Number(stageCount) || 1));
    const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
    const fractions = [0.25, 0.5, 0.75];
    const target = Math.ceil(cnt * fractions[lvl - 1]);
    return Math.max(1, Math.min(cnt, target));
}

/**
 * Code-Teil: Klasse `HeatingRodControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: HeatingRodControlModule. Aufgabe: gehört zur Heizstab-/Thermiksteuerung. Speicherreserve, PV-Budget und Freigaben müssen mit core-limits übereinstimmen. Zusammenhang: Heizstabregelung, PV-Freigabe, Speicherreserve und Stufensteuerung.
/**
 * Klasse: HeatingRodControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class HeatingRodControlModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen können Heizstab-Freigaben und Reservelogik beeinflussen; Speicherreserve und PV-Budget testen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, {targetStage:number,lastIncreaseMs:number,lastDecreaseMs:number}>} */
        this._stageCtl = new Map();
        this._actuatorContract = new ActuatorCommandContract();
        /** @type {Map<string, {requestedStage:number,capturedAt:number}>} */
        this._para14aHeldStages = new Map();
        /** @type {{importSinceMs:number, dischargeSinceMs:number}} */
        this._budgetProtect = { importSinceMs: 0, dischargeSinceMs: 0 };
        /**
         * Diagnose-Speicher: Heizstab-TS-Produktivpfad auf echter Anlage.
         *
         * Zweck:
         * Sammelt kleine In-Memory-Samples, ob TypeScript den Heizstab wirklich geführt
         * hat oder ob die Runtime auf JavaScript zurückfallen musste.
         *
         * Wichtig:
         * Diese Samples werden nicht in History geschrieben und nach Adapter-Neustart
         * bewusst neu gesammelt. Sie sind nur Beobachtung für die Migration.
         */
        this._heatingRodTsRuntimeSamples = [];
        // TS-Migration 0.7.110: merkt, wann der Heizstab nach stabiler Runtime-Auswertung
        // als normaler TypeScript-Pfad vorbereitet ist. JavaScript bleibt nur Notfallback.
        this._heatingRodTsNormalSourceState = null;
    }

    _isPara14aActive() {
        return !!(this.adapter && this.adapter._para14a && this.adapter._para14a.active === true);
    }

    _para14aOwner(d) {
        return `para14a.heatingRod.${d.id}`;
    }

    _para14aOptions(d, extra = {}) {
        return {
            owner: this._para14aOwner(d),
            enforceAuthority: true,
            leaseMs: 20000,
            kind: 'para14a-heating-rod',
            releaseAuthority: false,
            ...extra,
        };
    }

    /**
     * Code-Teil: Methode `_isEnabled`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _isEnabled() {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableHeatingRodControl);
    }
        _getCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.heatingRod && typeof this.adapter.config.heatingRod === 'object')
            ? this.adapter.config.heatingRod
            : {};
        return cfg;
    }

    /**
     * Code-Teil: Methode `_getVisFlowSlots`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
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
        // Own adapter states must also reach the live /api/state cache immediately.
        // Otherwise the VIS can briefly see stale/0 values (e.g. Heizstab in Energiefluss).
        try {
            if (this.adapter && typeof this.adapter.updateValue === 'function') {
                this.adapter.updateValue(String(id), v, Date.now());
            }
        } catch (_e) {
            // ignore cache mirror failures
        }
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

            const slotCfg = (flowConsumers[slot - 1] && typeof flowConsumers[slot - 1] === 'object') ? flowConsumers[slot - 1] : {};
            const ctrl = (slotCfg.ctrl && typeof slotCfg.ctrl === 'object') ? slotCfg.ctrl : {};
            const consumerType = normalizeConsumerType(slotCfg.consumerType || slotCfg.type || slotCfg.category);

            /**
             * Code-Teil: Arrow-Funktion `configuredStageCount`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
                        const configuredStageCount = (() => {
                let cnt = 0;
                const prevStages = Array.isArray(r.stages) ? r.stages : [];
                for (let s = 1; s <= 12; s++) {
                    const prev = (prevStages[s - 1] && typeof prevStages[s - 1] === 'object') ? prevStages[s - 1] : {};
                    const wId = String(prev.writeId || prev.dpWriteId || prev.writeDp || ctrl[`stage${s}WriteId`] || ctrl[`heatingStage${s}WriteId`] || ((s === 1) ? (ctrl.switchWriteId || '') : '') || '').trim();
                    const rId = String(prev.readId || prev.dpReadId || prev.readDp || ctrl[`stage${s}ReadId`] || ctrl[`heatingStage${s}ReadId`] || ((s === 1) ? (ctrl.switchReadId || '') : '') || '').trim();
                    if (wId || rId) cnt = s;
                }
                return cnt;
            })();

            const stageCount = clamp(num(r.stageCount, configuredStageCount || (Array.isArray(r.stages) ? r.stages.length : 0) || 3), 1, 12);
            const maxPowerW = clamp(num(r.maxPowerW, Math.max(2000, stageCount * 2000)), 0, 1e12);
            const mode = normalizeMode(r.mode);
            const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;
            const minOnSec = clamp(num(r.minOnSec, 60), 0, 86400);
            const minOffSec = clamp(num(r.minOffSec, 60), 0, 86400);
            const priority = clamp(num(r.priority, 200 + slot), 1, 999);
            const boostDurationMin = clamp(num(r.boostDurationMin, cfg.boostDurationMin ?? 60), 0, 1440);
            const requireReadback = r.requireReadback !== false;
            const readbackTimeoutSec = clamp(num(r.readbackTimeoutSec, 5), 0.25, 120);
            const retryDelaySec = clamp(num(r.retryDelaySec, 3), 0.25, 120);
            const maxRetries = clamp(num(r.maxRetries, 3), 0, 20);
            const faultLockSec = clamp(num(r.faultLockSec, 60), 1, 24 * 60 * 60);
            const name = String(r.name || slotCfg.name || '').trim() || `Heizstab ${slot}`;
            const powerId = String(dps[`consumer${slot}Power`] || '').trim();
            const switchWriteFallback = String(ctrl.switchWriteId || '').trim();
            const switchReadFallback = String(ctrl.switchReadId || '').trim();

            const defaults = computeStageDefaults(maxPowerW, stageCount);
            const stages = [];
            let wiredStages = 0;
            let cumulative = 0;
            for (let s = 1; s <= stageCount; s++) {
                const prevStages = Array.isArray(r.stages) ? r.stages : [];
                const prev = (prevStages[s - 1] && typeof prevStages[s - 1] === 'object') ? prevStages[s - 1] : {};
                const writeId = String(
                    prev.writeId ||
                    prev.dpWriteId ||
                    prev.writeDp ||
                    ctrl[`stage${s}WriteId`] ||
                    ctrl[`heatingStage${s}WriteId`] ||
                    ((s === 1) ? switchWriteFallback : '') ||
                    ''
                ).trim();
                const readId = String(
                    prev.readId ||
                    prev.dpReadId ||
                    prev.readDp ||
                    ctrl[`stage${s}ReadId`] ||
                    ctrl[`heatingStage${s}ReadId`] ||
                    ((s === 1) ? switchReadFallback : '') ||
                    ''
                ).trim();
                const def = defaults[s - 1];
                const powerW = clamp(num(prev.powerW, def.powerW), 0, 1e12);
                cumulative += powerW;
                const onAboveW = clamp(num(prev.onAboveW, def.onAboveW), 0, 1e12);
                const offBelowW = clamp(num(prev.offBelowW, def.offBelowW), 0, onAboveW);
                if (writeId && wiredStages === (s - 1)) wiredStages = s;
                stages.push({
                    index: s,
                    powerW,
                    onAboveW,
                    offBelowW,
                    writeId,
                    readId,
                    writeKey: '',
                    readKey: '',
                });
            }

            out.push({
                configIndex: i,
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                minOnSec,
                minOffSec,
                priority,
                boostDurationMin,
                requireReadback,
                readbackTimeoutSec,
                retryDelaySec,
                maxRetries,
                faultLockSec,
                maxPowerW,
                stageCount,
                wiredStages,
                consumerType,
                powerId,
                stages,
                userEnabledKey: `hr.user.c${slot}.regEnabled`,
                userModeKey: `hr.user.c${slot}.mode`,
                pWKey: '',
            });
        }

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
        await this.adapter.setObjectNotExistsAsync('heatingRod', {
            type: 'channel',
            common: { name: 'Heizstab' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('heatingRod.summary', {
            type: 'channel',
            common: { name: 'Summary' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('heatingRod.user', {
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
            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}`, {
                type: 'channel',
                common: { name: `Consumer ${i}` },
                native: {},
            });

            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}.regEnabled`, {
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

            await this.adapter.setObjectNotExistsAsync(`heatingRod.user.c${i}.mode`, {
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
                        pvAuto: 'Auto',
                        manual1: 'Manuell Stufe 1',
                        manual2: 'Manuell Stufe 2',
                        manual3: 'Manuell Stufe 3',
                        off: 'Aus',
                    },
                },
                native: {},
            });

            await ensureDefault(`heatingRod.user.c${i}.regEnabled`, true);
            await ensureDefault(`heatingRod.user.c${i}.mode`, 'inherit');
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

        await mk('heatingRod.summary.pvCapW', 'PV cap (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.evcsUsedW', 'EVCS used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.thermalUsedW', 'Thermal budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.currentHeatingRodW', 'Current heating rod load (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageReserveW', 'Reserved storage charge power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageChargeW', 'Storage charge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.storageDischargeW', 'Storage discharge power used for coordination (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableRawW', 'PV available raw (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAvailableW', 'PV available after thermal (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.appliedTotalW', 'Applied total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetUsedW', 'Budget used (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateTotalW', 'Budget gate total (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateRemainingW', 'Budget gate remaining after EVCS (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGatePvW', 'Budget gate PV for heating rod (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateEffectiveW', 'Budget gate effective for heating rod (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.budgetGateSource', 'Budget gate source', 'string', 'text');
        await mk('heatingRod.summary.gridImportW', 'Grid import used for heating rod gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.gridImportLimitW', 'Allowed grid import in PV auto (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.gridImportExceeded', 'Grid import above heating rod limit', 'boolean', 'indicator');
        await mk('heatingRod.summary.storageDischargeExceeded', 'Storage discharge above heating rod limit', 'boolean', 'indicator');
        await mk('heatingRod.summary.debugJson', 'Debug JSON', 'string', 'json');
        await mk('heatingRod.summary.tsShadowJson', 'TypeScript Heizstab Shadow-Vergleich (JSON)', 'string', 'json');
        await mk('heatingRod.summary.source', 'Heizstab Entscheidungsquelle', 'string', 'text');
        await mk('heatingRod.summary.tsProductiveJson', 'TypeScript Heizstab Produktivstatus (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsRuntimeEvaluationJson', 'TypeScript Heizstab Runtime-Auswertung (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsNormalSourceJson', 'TypeScript Heizstab Normalpfad-Status (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsFallbackPolicyJson', 'TypeScript Heizstab JS-Notfallback-Policy (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyReferenceJson', 'TypeScript Heizstab Legacy-JS-Referenzdiagnose (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyCleanupJson', 'TypeScript Heizstab Legacy-JS-Cleanup (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyRemovalPlanJson', 'TypeScript Heizstab Legacy-JS-Entfernungsplan (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyDebugBridgeJson', 'TypeScript Heizstab Legacy-JS-Debug-Brücke (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyPrunedJson', 'TypeScript Heizstab Legacy-JS-Referenzdetails bereinigt (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyRemovalCandidateJson', 'TypeScript Heizstab Legacy-JS-Entfernungskandidat (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyFinalCleanupJson', 'TypeScript Heizstab Legacy-JS-Final-Cleanup (JSON)', 'string', 'json');
        await mk('heatingRod.summary.tsLegacyNormalDiagnosticsJson', 'TypeScript Heizstab Legacy-JS-Normaldiagnose entfernt (JSON)', 'string', 'json');
        await mk('heatingRod.summary.legacyJsReferenceJson', 'Heizstab Legacy-JS-Referenzdiagnose Alias (JSON)', 'string', 'json');
        await mk('heatingRod.summary.autoMode', 'Heizstab Auto-Betriebsart', 'string', 'text');
        await mk('heatingRod.summary.zeroExportActive', 'Zero/minus feed-in logic active', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportCanProbe', 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportReason', 'Zero/minus feed-in reason', 'string', 'text');
        await mk('heatingRod.summary.zeroExportPvNowW', 'Zero/minus feed-in PV now (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportPotentialW', 'Zero/minus feed-in usable potential (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportBudgetW', 'Zero/minus feed-in central budget cap (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportBudgetSource', 'Zero/minus feed-in budget source', 'string', 'text');
        await mk('heatingRod.summary.zeroExportForecastOk', 'Zero/minus feed-in forecast ok', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportFeedInAtLimit', 'Zero/minus feed-in limit reached', 'boolean', 'indicator');
        await mk('heatingRod.summary.pvAutomationMinW', 'PV-Auto minimum PV power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationPvNowW', 'PV-Auto current PV power used for gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationAllowed', 'PV-Auto allowed by minimum PV power', 'boolean', 'indicator');
        await mk('heatingRod.summary.nightPvAutoBlockEnabled', 'PV-Auto nachts gesperrt', 'boolean', 'indicator');
        await mk('heatingRod.summary.nightWindowActive', 'Nachtfenster aktiv', 'boolean', 'indicator');
        await mk('heatingRod.summary.nightStartTime', 'Nachtfenster Beginn', 'string', 'text');
        await mk('heatingRod.summary.nightEndTime', 'Nachtfenster Ende', 'string', 'text');
        await mk('heatingRod.summary.nightManualOnly', 'Nachts nur manuelle Freigabe', 'boolean', 'indicator');
        await mk('heatingRod.summary.nightBlockReason', 'Nachtfreigabe Status', 'string', 'text');
        await mk('heatingRod.summary.lastUpdate', 'Last update', 'number', 'value.time');
        await mk('heatingRod.summary.status', 'Status', 'string', 'text');

        this._buildDevicesFromConfig();

        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                await this.dp.upsert({ key: 'hr.cm.active', objectId: `${ns}.chargingManagement.control.active`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.budgetW', objectId: `${ns}.chargingManagement.control.budgetW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.remainingW', objectId: `${ns}.chargingManagement.control.remainingW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvCapRawW', objectId: `${ns}.chargingManagement.control.pvCapRawW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvCapW', objectId: `${ns}.chargingManagement.control.pvCapEffectiveW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvAvailable', objectId: `${ns}.chargingManagement.control.pvAvailable`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.usedW', objectId: `${ns}.chargingManagement.control.usedW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvSurplusNoEvRawW', objectId: `${ns}.chargingManagement.control.pvSurplusNoEvRawW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.pvSurplusNoEvAvg5mW', objectId: `${ns}.chargingManagement.control.pvSurplusNoEvAvg5mW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.gridW', objectId: `${ns}.chargingManagement.control.gridImportW`, dataType: 'number', direction: 'in', unit: 'W' });
                await this.dp.upsert({ key: 'hr.cm.staleMeter', objectId: `${ns}.chargingManagement.control.staleMeter`, dataType: 'boolean', direction: 'in' });
                await this.dp.upsert({ key: 'hr.cm.staleBudget', objectId: `${ns}.chargingManagement.control.staleBudget`, dataType: 'boolean', direction: 'in' });
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `hr.user.c${i}.regEnabled`, objectId: `${ns}.heatingRod.user.c${i}.regEnabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `hr.user.c${i}.mode`, objectId: `${ns}.heatingRod.user.c${i}.mode`, dataType: 'string', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

        for (const d of this._devices) {
            await this.adapter.setObjectNotExistsAsync(`heatingRod.devices.${d.id}`, {
                type: 'channel',
                common: { name: d.name },
                native: {},
            });

            await mk(`heatingRod.devices.${d.id}.slot`, 'Slot', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.name`, 'Name', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.enabled`, 'Enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.mode`, 'Mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.userEnabled`, 'User enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.userMode`, 'User mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.effectiveEnabled`, 'Effective enabled', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.effectiveMode`, 'Effective mode', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.strategyEligible`, 'Betriebsstrategie zulässig', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.strategyActive`, 'Betriebsstrategie aktiv', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.strategyFallbackActive`, 'Betriebsstrategie Rückfall aktiv', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.strategyAction`, 'Betriebsstrategie Aktion', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.strategyMaxPowerW`, 'Betriebsstrategie Leistungsgrenze', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.strategyReason`, 'Betriebsstrategie Grund', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.strategyExpiresAt`, 'Betriebsstrategie gültig bis', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.boostActive`, 'Boost active', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.boostUntil`, 'Boost until (ts)', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.override`, 'Override', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.consumerType`, 'Consumer type', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.maxPowerW`, 'Max power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.stageCount`, 'Configured stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.wiredStages`, 'Wired stages', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetStage`, 'Target stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.currentStage`, 'Current stage', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.targetW`, 'Target power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.appliedW`, 'Applied power (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.measuredW`, 'Measured (W)', 'number', 'value.power', 'W');
            await mk(`heatingRod.devices.${d.id}.status`, 'Status', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.owner`, 'Aktor-Owner', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.writeAccepted`, 'Write akzeptiert', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.readbackOk`, 'Readback bestätigt', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.writePending`, 'Write/Readback ausstehend', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.retryCount`, 'Write-Wiederholungen', 'number', 'value');
            await mk(`heatingRod.devices.${d.id}.faultLocked`, 'Aktor-Fehlerverriegelung', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.faultUntil`, 'Aktor-Fehlerverriegelung bis', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.writeContractStatus`, 'Aktor-Vertragsstatus', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.autoMode`, 'Auto-Betriebsart', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.zeroExportActive`, 'Zero/minus feed-in active', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportReason`, 'Zero/minus feed-in reason', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.zeroExportCanProbe`, 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, 'Zero/minus feed-in next probe at', 'number', 'value.time');
            await mk(`heatingRod.devices.${d.id}.nightWindowActive`, 'Nachtfenster aktiv', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.nightPvAutoBlocked`, 'PV-Auto durch Nachtfenster gesperrt', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.nightManualReleaseAllowed`, 'Manuelle Nachtfreigabe zulässig', 'boolean', 'indicator');

            if (this.dp && d.powerId) {
                const k = `hr.${d.id}.pW`;
                await this.dp.upsert({ key: k, objectId: d.powerId, dataType: 'number', direction: 'in', unit: 'W' });
                d.pWKey = k;
            }

            for (const stage of d.stages) {
                if (this.dp && stage.writeId) {
                    const k = `hr.${d.id}.s${stage.index}.w`;
                    await this.dp.upsert({ key: k, objectId: stage.writeId, dataType: 'boolean', direction: 'out' });
                    stage.writeKey = k;
                }
                if (this.dp && stage.readId) {
                    const k = `hr.${d.id}.s${stage.index}.r`;
                    await this.dp.upsert({ key: k, objectId: stage.readId, dataType: 'boolean', direction: 'in' });
                    stage.readKey = k;
                }
            }

            if (!this._stageCtl.has(d.id)) {
                this._stageCtl.set(d.id, { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 });
            }
        }
    }

    /**
     * Fail-closed Lifecycle-Stopp: Alle konfigurierten Heizstabstufen werden
     * beim Deaktivieren und beim Start mit ausgeschalteter App physisch AUS
     * geschrieben. Der Stopp nutzt die Installer-Konfiguration direkt und ist
     * deshalb nicht von einem vorherigen Regel-Tick abhaengig.
     */
    async deactivate() {
        if (!Array.isArray(this._devices) || !this._devices.length) this._buildDevicesFromConfig();
        const failures = [];
        let attempted = 0;
        for (const d of this._devices || []) {
            try {
                this._publishZeroExportOwnership(d, false, 'module-disabled');
                requestZeroExportProbe(this.adapter, { key: `heatingRod:${d.id}`, now: Date.now(), eligible: false });
                if (this.dp && typeof this.dp.upsert === 'function') {
                    for (const stage of d.stages || []) {
                        if (stage.writeId && !stage.writeKey) {
                            stage.writeKey = `hr.${d.id}.s${stage.index}.w`;
                            await this.dp.upsert({ key: stage.writeKey, objectId: stage.writeId, dataType: 'boolean', direction: 'out' });
                        }
                        if (stage.readId && !stage.readKey) {
                            stage.readKey = `hr.${d.id}.s${stage.index}.r`;
                            await this.dp.upsert({ key: stage.readKey, objectId: stage.readId, dataType: 'boolean', direction: 'in' });
                        }
                    }
                }
                if (!d.wiredStages || !(d.stages || []).some((stage) => stage && stage.writeKey)) continue;
                attempted += 1;
                const feedback = this._readStageFeedback(d, null);
                const result = await this._applyStageState(d, 0, feedback, {
                    force: true,
                    reason: 'module-disabled-safe-stop',
                    releaseAuthority: true,
                    enforceAuthority: false,
                    leaseMs: 0,
                    kind: 'heating-rod-module-disabled',
                });
                if (!(result && result.accepted === true)) failures.push(`${d.id}:${String(result && result.status || 'write-not-accepted')}`);
                this._actuatorContract.release(`heatingRod:${d.id}`);
                const ctl = this._stageCtl.get(d.id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
                ctl.targetStage = 0;
                this._stageCtl.set(d.id, ctl);
                try {
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'module-disabled-safe-stop');
                } catch (_diagnosticError) {}
            } catch (error) {
                failures.push(`${d && d.id || 'unknown'}:${String(error && error.message || error)}`);
            }
        }
        try {
            await this._setStateIfChanged('heatingRod.summary.appliedTotalW', 0);
            await this._setStateIfChanged('heatingRod.summary.budgetUsedW', 0);
            await this._setStateIfChanged('heatingRod.summary.status', attempted ? 'module-disabled-safe-stop' : 'module-disabled-no-actuators');
        } catch (_diagnosticError) {}
        if (failures.length) throw new Error(`heating-rod-safe-stop-failed:${failures.join(',')}`);
        return { ok: true, attempted, stopped: attempted };
    }

    /**
     * Code-Teil: Methode `_readCacheNumber`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheNumber
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheNumber(key, fallback = null) {
        if (!key) return fallback;
        try {
            if (this.adapter && typeof this.adapter._nwGetNumberFromCache === 'function') {
                const v = this.adapter._nwGetNumberFromCache(String(key), null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
        } catch (_e) {
            // ignore
        }
        try {
            const cache = this.adapter && this.adapter.stateCache;
            const rec = cache && cache[String(key)];
            const raw = (rec && typeof rec === 'object' && rec.value !== undefined) ? rec.value : rec;
            const n = Number(raw);
            if (Number.isFinite(n)) return n;
        } catch (_e) {
            // ignore
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readNumberAny`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readNumberAny
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readNumberAny(keys, staleMs, fallback = null) {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const key of list) {
            if (!key) continue;
            try {
                const hasDpEntry = !!(this.dp && this.dp.getEntry && this.dp.getEntry(key));
                if (hasDpEntry) {
                    // Registered datapoints carry freshness metadata. If such a datapoint is
                    // stale, never resurrect the old value from the raw adapter cache. This is
                    // especially important for Batterie-Entladen: an old discharge value would
                    // otherwise block Heizstab step-up although the live NVP/PV budget is clean.
                    if (typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) continue;
                    const v = this.dp.getNumberFresh ? this.dp.getNumberFresh(key, staleMs, null) : this.dp.getNumber(key, null);
                    if (typeof v === 'number' && Number.isFinite(v)) return v;
                    continue;
                }
            } catch (_e) {
                // ignore and try the raw cache fallback for unregistered aliases below
            }
            const c = this._readCacheNumber(key, null);
            if (typeof c === 'number' && Number.isFinite(c)) return c;
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readNumberMaxAny`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readNumberMaxAny
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readNumberMaxAny(keys, staleMs, fallback = null) {
        const list = Array.isArray(keys) ? keys : [keys];
        let best = null;
        for (const key of list) {
            if (!key) continue;
            let val = null;
            try {
                const hasDpEntry = !!(this.dp && this.dp.getEntry && this.dp.getEntry(key));
                if (hasDpEntry) {
                    if (typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) continue;
                    const v = this.dp.getNumberFresh ? this.dp.getNumberFresh(key, staleMs, null) : this.dp.getNumber(key, null);
                    if (typeof v === 'number' && Number.isFinite(v)) val = v;
                } else {
                    const c = this._readCacheNumber(key, null);
                    if (typeof c === 'number' && Number.isFinite(c)) val = c;
                }
            } catch (_e) {
                const c = this._readCacheNumber(key, null);
                if (typeof c === 'number' && Number.isFinite(c)) val = c;
            }
            if (typeof val === 'number' && Number.isFinite(val)) {
                best = best === null ? val : Math.max(best, val);
            }
        }
        return best === null ? fallback : best;
    }

    /**
     * Code-Teil: Methode `_readBooleanAny`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readBooleanAny
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readBooleanAny(keys, staleMs, fallback = null) {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const key of list) {
            if (!key) continue;
            try {
                const hasDpEntry = !!(this.dp && this.dp.getEntry && this.dp.getEntry(key));
                if (hasDpEntry) {
                    if (typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) continue;
                    const v = this.dp.getBoolean ? this.dp.getBoolean(key, null) : null;
                    if (v !== null && v !== undefined) return !!v;
                    continue;
                }
            } catch (_e) {
                // ignore and try the raw cache fallback for unregistered aliases below
            }
            const raw = this._readCacheRaw(key, null);
            if (raw === null || raw === undefined) continue;
            if (typeof raw === 'boolean') return raw;
            if (typeof raw === 'number') return raw !== 0;
            if (typeof raw === 'string') {
                const t = raw.trim().toLowerCase();
                if (['true', '1', 'on', 'yes', 'active', 'enabled'].includes(t)) return true;
                if (['false', '0', 'off', 'no', 'inactive', 'disabled'].includes(t)) return false;
            }
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_getBudgetGateCfg`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getBudgetGateCfg
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getBudgetGateCfg() {
        const cfg = this._getCfg();
        const zero = (cfg.zeroExport && typeof cfg.zeroExport === 'object') ? cfg.zeroExport : {};
        /**
         * Code-Teil: pickNum
         * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
         * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
         * Wartung/TypeScript: Änderungen können Heizstab-Freigaben und Reservelogik beeinflussen; Speicherreserve und PV-Budget testen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
         */
        const pickNum = (keys, def, minV = 0, maxV = 1e12) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const key of list) {
                const raw = (cfg[key] !== undefined && cfg[key] !== null && cfg[key] !== '') ? cfg[key] : zero[key];
                if (raw === null || raw === undefined || raw === '') continue;
                const n = Number(raw);
                if (Number.isFinite(n)) return Math.round(clamp(n, minV, maxV));
            }
            return Math.round(clamp(def, minV, maxV));
        };

        return {
            useBudgetGates: true,
            // Robust defaults: Heizstab is a stepped, slow thermal load. Small NVP
            // oscillations must be tolerated instead of instantly dropping a stage.
            maxGridImportW: pickNum(['maxGridImportW', 'gridImportToleranceW', 'pvMaxGridImportW', 'pvImportToleranceW', 'gridImportTripW'], 250, 0, 1000000),
            gridImportHoldSec: pickNum(['gridImportHoldSec', 'gridImportTripSec', 'pvGridImportHoldSec'], 45, 0, 3600),
            hardGridImportW: pickNum(['hardGridImportW', 'pvHardGridImportW'], 1500, 0, 1000000),
            storageDischargeToleranceW: pickNum(['storageDischargeToleranceW', 'pvStorageDischargeToleranceW'], 300, 0, 1000000),
            storageDischargeHoldSec: pickNum(['storageDischargeHoldSec', 'storageDischargeTripSec', 'pvStorageDischargeHoldSec'], 45, 0, 3600),
            hardStorageDischargeW: pickNum(['hardStorageDischargeW', 'pvHardStorageDischargeW'], 2000, 0, 1000000),
            // Ein zusätzlicher Exportabstand wäre bei 0-Einspeisung unerfüllbar:
            // Der zentrale Regler prüft stattdessen NVP, PV und Batterie live.
            budgetSafetyReserveW: readZeroExportMode(this.adapter).active
                ? 0 : pickNum(['budgetSafetyReserveW', 'pvSafetyReserveW'], 200, 0, 1000000),
            stageUpDelaySec: pickNum(['stageUpDelaySec', 'budgetStageUpDelaySec', 'pvStageUpDelaySec'], 20, 0, 3600),
            minStageRunSec: pickNum(['minStageRunSec', 'minAutoStageRunSec', 'pvMinStageRunSec'], 120, 0, 86400),
            cooldownAfterOffSec: pickNum(['cooldownAfterOffSec', 'autoCooldownAfterOffSec', 'pvCooldownAfterOffSec'], 180, 0, 86400),
        };
    }

    /**
     * Code-Teil: Methode `_readStorageSnapshot`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readStorageSnapshot
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readStorageSnapshot(staleMs) {
        const rootCfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const storageAuthority = (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function')
            ? this.adapter._nwGetStorageControlAuthority()
            : {
                selectedTopology: rootCfg.enableStorageControl === true ? 'single' : 'none',
                writerActive: rootCfg.enableStorageControl === true,
                reason: rootCfg.enableStorageControl === true ? 'single-active' : 'no-active-storage-output',
            };
        const storageTopology = String(storageAuthority.selectedTopology || 'none');
        let chargeW = 0;
        let dischargeW = 0;
        let usedCentralStorageFlow = false;
        try {
            const flow = (this.adapter && typeof this.adapter._nwResolveBatteryFlowFromCache === 'function')
                ? this.adapter._nwResolveBatteryFlowFromCache({ maxAgeMs: staleMs, deadbandW: 25 })
                : null;
            if (flow && typeof flow === 'object') {
                usedCentralStorageFlow = true;
                chargeW = Math.max(0, Math.round(Number(flow.chargeW) || 0));
                dischargeW = Math.max(0, Math.round(Number(flow.dischargeW) || 0));
            }
        } catch (_eFlow) {}

        if (!usedCentralStorageFlow) {
            // Fallback fuer Alt-Runtimes bleibt strikt topologiebezogen. Eine Farm
            // darf nie auf Einzelwerte zurueckfallen und umgekehrt.
            if (storageTopology === 'farm') {
                chargeW = Math.max(0, num(this._readNumberAny(['storageFarm.totalChargePowerW'], staleMs, null), 0));
                dischargeW = Math.max(0, num(this._readNumberAny(['storageFarm.totalDischargePowerW'], staleMs, null), 0));
            } else if (storageTopology === 'single') {
                chargeW = Math.max(0, num(this._readNumberAny(['storageChargePower'], staleMs, null), 0));
                dischargeW = Math.max(0, num(this._readNumberAny(['storageDischargePower'], staleMs, null), 0));

                const batteryPowerW = this._readNumberAny(['batteryPower'], staleMs, null);
                if (typeof batteryPowerW === 'number' && Number.isFinite(batteryPowerW)) {
                    const flowBatteryMapped = !!(rootCfg.datapoints && String(rootCfg.datapoints.batteryPower || '').trim());
                    const invBattery = flowBatteryMapped && !!(rootCfg.settings && rootCfg.settings.flowInvertBattery);
                    const signedW = Math.round(invBattery ? -batteryPowerW : batteryPowerW);
                    const noiseW = 25;
                    if (signedW < -noiseW) {
                        chargeW = Math.max(chargeW, Math.abs(signedW));
                        dischargeW = 0;
                    } else if (signedW > noiseW) {
                        dischargeW = Math.max(dischargeW, signedW);
                        chargeW = 0;
                    }
                }
            }
        }

        const socPct = storageTopology === 'farm'
            ? this._readNumberAny([
                'storageFarm.totalSocOnline',
                'storageFarm.totalSoc',
                'storageFarm.medianSoc',
            ], staleMs, null)
            : (storageTopology === 'single'
                ? this._readNumberAny(['storageSoc'], staleMs, null)
                : null);

        return {
            chargeW: Math.round(chargeW),
            dischargeW: Math.round(dischargeW),
            socPct: (typeof socPct === 'number' && Number.isFinite(socPct)) ? socPct : null,
            topology: storageTopology,
            writerActive: !!storageAuthority.writerActive,
            authorityReason: String(storageAuthority.reason || ''),
        };
    }

    /**
     * Code-Teil: Methode `_computeBasePvAvailableW`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeBasePvAvailableW(currentHeatingRodW = 0) {
        const cfg = this._getCfg();
        const gateCfg = this._getBudgetGateCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
                const finite = (v) => (typeof v === 'number' && Number.isFinite(v));

        const cmActive = this._readBooleanAny(['hr.cm.active', 'chargingManagement.control.active'], staleMs, null);
        const cmStaleMeter = this._readBooleanAny(['hr.cm.staleMeter', 'chargingManagement.control.staleMeter'], staleMs, false);
        const cmStaleBudget = this._readBooleanAny(['hr.cm.staleBudget', 'chargingManagement.control.staleBudget'], staleMs, false);

        const cmBudgetWRaw = this._readNumberAny(['hr.cm.budgetW', 'chargingManagement.control.budgetW'], staleMs, null);
        const cmRemainingWRaw = this._readNumberAny(['hr.cm.remainingW', 'chargingManagement.control.remainingW'], staleMs, null);
        const cmUsedWRaw = this._readNumberAny(['hr.cm.usedW', 'chargingManagement.control.usedW'], staleMs, null);
        const cmPvCapEffectiveRaw = this._readNumberAny(['hr.cm.pvCapW', 'chargingManagement.control.pvCapEffectiveW'], staleMs, null);
        const cmPvCapRawRaw = this._readNumberAny(['hr.cm.pvCapRawW', 'chargingManagement.control.pvCapRawW'], staleMs, null);
        const cmPvNoEvRaw = this._readNumberAny(['hr.cm.pvSurplusNoEvRawW', 'chargingManagement.control.pvSurplusNoEvRawW'], staleMs, null);
        const cmPvNoEvAvg = this._readNumberAny(['hr.cm.pvSurplusNoEvAvg5mW', 'chargingManagement.control.pvSurplusNoEvAvg5mW'], staleMs, null);
        const cmPvAvailable = this._readBooleanAny(['hr.cm.pvAvailable', 'chargingManagement.control.pvAvailable'], staleMs, null);

        const pvCapW = finite(cmPvCapEffectiveRaw) ? Math.max(0, cmPvCapEffectiveRaw) : 0;
        const evcsUsedW = finite(cmUsedWRaw) ? Math.max(0, cmUsedWRaw) : 0;
        const currentW = Math.max(0, num(currentHeatingRodW, 0));

        const gridW = this._readNumberAny([
            'hr.cm.gridW',
            'chargingManagement.control.gridImportW',
            'grid.powerRawW',
            'grid.powerW',
            'ps.gridPowerW'
        ], staleMs, null);
        const gridKnown = finite(gridW);
        const exportW = gridKnown ? Math.max(0, -gridW) : 0;
        const importW = gridKnown ? Math.max(0, gridW) : 0;
        const storage = this._readStorageSnapshot(staleMs);
        const storageTargetSocPct = clamp(num(cfg.storageTargetSocPct, 90), 0, 100);
        const storageReserveCfgW = Math.max(0, Math.round(num(cfg.storageReserveW, 1000)));
        const storageKnown = storage.chargeW > 0
            || storage.dischargeW > 0
            || (typeof storage.socPct === 'number' && Number.isFinite(storage.socPct))
            || storage.writerActive === true;
        const storageReserveW = (storageKnown && !(typeof storage.socPct === 'number' && storage.socPct >= storageTargetSocPct))
            ? storageReserveCfgW
            : 0;
        // Speicherreserve sauber bilanzieren: Was der Speicher bereits lädt, erfüllt zuerst
        // die Reserve. Nur die noch fehlende Reserve wird vom Heizstab-Budget abgezogen;
        // Speicherladung oberhalb der Reserve darf als nutzbarer PV-Überschuss gelten.
        const storageReserveMissingW = Math.max(0, storageReserveW - Math.max(0, storage.chargeW));
        const storageChargeUsableW = storageReserveW > 0
            ? Math.max(0, Math.max(0, storage.chargeW) - storageReserveW)
            : Math.max(0, storage.chargeW);

        // Gate A/T/§14a/Peak: consume the remaining central budget after EVCS.
        // This is intentionally read-only: Heizstab does not change the load management budget engine.
        let totalGateRemainingW = Number.POSITIVE_INFINITY;
        let totalGateBudgetW = Number.POSITIVE_INFINITY;
        let totalGateSource = 'unlimited';
        const cmLooksActive = cmActive === true
            || evcsUsedW > 0
            || (finite(cmBudgetWRaw) && cmBudgetWRaw > 0)
            || (finite(cmRemainingWRaw) && cmRemainingWRaw > 0);
        if (gateCfg.useBudgetGates && cmLooksActive && !cmStaleBudget && finite(cmRemainingWRaw)) {
            totalGateRemainingW = Math.max(0, cmRemainingWRaw);
            totalGateBudgetW = finite(cmBudgetWRaw) ? Math.max(0, cmBudgetWRaw) : totalGateRemainingW + evcsUsedW;
            totalGateSource = 'chargingManagement.remainingW';
        } else {
            try {
                const caps = (this.adapter && this.adapter._emsCaps && typeof this.adapter._emsCaps === 'object') ? this.adapter._emsCaps : null;
                const cap = caps && caps.evcsHighLevel ? num(caps.evcsHighLevel.capW, null) : null;
                if (gateCfg.useBudgetGates && typeof cap === 'number' && Number.isFinite(cap) && cap > 0) {
                    totalGateBudgetW = Math.max(0, cap);
                    totalGateRemainingW = Math.max(0, cap - evcsUsedW);
                    totalGateSource = `ems.core.${String(caps.evcsHighLevel.binding || 'highLevel')}`;
                }
            } catch (_e) {
                // ignore core fallback
            }
        }

        // Gate B: prefer the same PV surplus gate that EVCS uses when it is active.
        // It is reconstructed without EVCS; therefore add the current Heizstab load back in,
        // otherwise an already running stage would collapse its own PV budget at 0 export.
        let cmPvGateW = null;
        let cmPvGateSource = '';
        if (!cmStaleMeter) {
            const candidates = [];
            if (finite(cmPvCapEffectiveRaw) && cmPvCapEffectiveRaw > 0) candidates.push({ k: 'cm.pvCapEffectiveW', w: cmPvCapEffectiveRaw });
            if (finite(cmPvCapRawRaw) && cmPvCapRawRaw > 0) candidates.push({ k: 'cm.pvCapRawW', w: cmPvCapRawRaw });
            if (finite(cmPvNoEvRaw) && cmPvNoEvRaw > 0) candidates.push({ k: 'cm.pvSurplusNoEvRawW', w: cmPvNoEvRaw });
            if (finite(cmPvNoEvAvg) && cmPvNoEvAvg > 0) candidates.push({ k: 'cm.pvSurplusNoEvAvg5mW', w: cmPvNoEvAvg });
            if (candidates.length) {
                const best = candidates.reduce((a, b) => (b.w > a.w ? b : a), candidates[0]);
                // The EVCS PV gate reports the currently visible PV surplus. For Heizstab
                // targeting this is a total flexible-load budget: keep the already running
                // Heizstab stage in the budget and only reserve actual battery charging power.
                // A storage reserve must not blindly eat visible NVP export, otherwise the rod
                // can get stuck on stage 1 although several kW are still exported.
                cmPvGateW = Math.max(0, best.w - evcsUsedW + currentW + storageChargeUsableW - storage.dischargeW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);
                cmPvGateSource = `${best.k}+nvp-follow`;
            } else if (cmPvAvailable === false && finite(cmPvCapEffectiveRaw)) {
                cmPvGateW = Math.max(0, currentW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);
                cmPvGateSource = 'cm.pvAvailable.false_hold_only';
            }
        }

        // Fallback/second truth: NVP balance without Heizstab as flexible load.
        // import above the configured tolerance consumes the budget; small import remains allowed
        // to keep the stages running calmly like PV-only EV charging.
        const importExcessW = gridKnown ? Math.max(0, importW - gateCfg.maxGridImportW) : 0;
        const usableStorageChargeForNvpW = storageChargeUsableW;
        const nvpSurplusBeforeFlexW = gridKnown
            ? Math.max(0, exportW + currentW + usableStorageChargeForNvpW - storage.dischargeW - importExcessW)
            : 0;
        const nvpAvailableW = Math.max(0, nvpSurplusBeforeFlexW - storageReserveMissingW - gateCfg.budgetSafetyReserveW);

        let pvBudgetGateW = nvpAvailableW;
        let pvBudgetSource = gridKnown ? 'nvp+ownLoad+storageReserve' : 'no-fresh-nvp';
        let pvBudgetFromCentral = false;
        let forecastGate = null;
        let forecastUsable = false;
        let forecastStepCapW = 0;
        const pvNowW = this._readPvNowW(staleMs);
        if (cmPvGateW !== null && Number.isFinite(cmPvGateW) && cmPvGateW > pvBudgetGateW) {
            pvBudgetGateW = cmPvGateW;
            pvBudgetSource = cmPvGateSource || 'cm.pvGate';
        }

        // Primary future path: central EMS Budget & Gates.
        // Charging reserves EVCS first, Thermal reserves second, Heizstab follows the remaining PV budget.
        // We still apply Heizstab-specific Speicherreserve/Sicherheitsreserve here, because this app owns
        // the staged relay decision and must protect manual/external channels.
        const centralRuntimePresent = !!(this.adapter && this.adapter._emsBudget);
        let centralBudgetSnapshotUsed = false;
        let centralTariffImportGrantValid = false;
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            const snap = rt && typeof rt.peek === 'function' ? rt.peek() : null;
            const age = snap && Number.isFinite(Number(snap.ts)) ? (Date.now() - Number(snap.ts)) : Number.POSITIVE_INFINITY;
            if (snap && age <= staleMs) {
                centralBudgetSnapshotUsed = true;
                const remTotal = Number(snap.remainingTotalW);
                if (Number.isFinite(remTotal) && remTotal >= 0) {
                    // Core-Limits rekonstruiert das physikalische Budget bereits inklusive
                    // der aktuell laufenden Heizstableistung. Da der Heizstab in diesem Tick
                    // noch nicht reserviert hat, darf seine eigene Leistung hier nicht erneut
                    // addiert werden. Das verhindert doppelte PV-Nutzung.
                    const totalGrant = typeof rt.getTotalGrant === 'function'
                        ? rt.getTotalGrant({ key: 'heatingRod', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const centralTotalW = totalGrant && Number.isFinite(Number(totalGrant.grantW))
                        ? Math.max(0, Number(totalGrant.grantW))
                        : Math.max(0, remTotal);
                    totalGateRemainingW = Math.min(totalGateRemainingW, centralTotalW);
                    totalGateBudgetW = Number.isFinite(totalGateBudgetW) ? totalGateBudgetW : centralTotalW;
                    totalGateSource = 'ems.budget.central-total-grant';
                }

                const fg = snap.gates && snap.gates.forecast ? snap.gates.forecast : null;
                if (fg && typeof fg === 'object') {
                    forecastGate = fg;
                    forecastUsable = !!fg.usable;
                    const fVals = [fg.nowW, fg.avgNext1hW, fg.avgNext3hW].map(Number).filter(Number.isFinite).map(v => Math.max(0, v));
                    forecastStepCapW = fVals.length ? Math.max(...fVals, pvNowW) : pvNowW;
                }

                const remPv = Number(snap.remainingPvW);
                if (Number.isFinite(remPv) && remPv >= 0) {
                    // Autoritativer Grant nach EVCS, Speicher und Thermik. Die aktuell
                    // laufende Heizstableistung ist bereits Teil der physikalischen
                    // Core-Rekonstruktion und wird deshalb nicht noch einmal addiert.
                    const pvGrant = typeof rt.getPvGrant === 'function'
                        ? rt.getPvGrant({ key: 'heatingRod', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    let centralPvW = pvGrant && Number.isFinite(Number(pvGrant.grantW))
                        ? Math.max(0, Number(pvGrant.grantW))
                        : Math.max(0, remPv);
                    // Der Speicher lief in der zentralen Modulreihenfolge bereits
                    // vor dem Heizstab und hat seinen tatsaechlich angeforderten
                    // PV-Anteil reserviert. Eine zweite lokale Speicherreserve
                    // wuerde denselben Anteil doppelt abziehen und waere ein
                    // Parallelbudget. Hier bleibt deshalb nur der allgemeine
                    // Sicherheitsabstand des Heizstabs.
                    centralPvW = Math.max(0, centralPvW - gateCfg.budgetSafetyReserveW);
                    // Der NVP bleibt der physikalische Sicherheitscheck. Er darf den
                    // zentralen Grant nur reduzieren, niemals ein zweites Budget erzeugen.
                    if (gridKnown) centralPvW = Math.min(centralPvW, Math.max(0, nvpAvailableW));
                    pvBudgetGateW = centralPvW;
                    pvBudgetSource = 'ems.budget.central-pv-grant+nvpPhysicalCap';
                    pvBudgetFromCentral = true;
                }

                const tariffGate = snap.gates && snap.gates.tariff ? snap.gates.tariff : null;
                const tariffImportPreferred = !!(tariffGate && tariffGate.gridImportPreferred);
                if (tariffImportPreferred && Number.isFinite(remTotal) && remTotal >= 0) {
                    // Gate E: Auch bei Negativpreis stammt die Freigabe aus dem
                    // zentralen Gesamtbudget. Eigene Last wird nicht doppelt addiert.
                    const tariffGrant = typeof rt.getTotalGrant === 'function'
                        ? rt.getTotalGrant({ key: 'heatingRod', requestedW: Number.MAX_SAFE_INTEGER })
                        : null;
                    const tariffAvailableW = tariffGrant && Number.isFinite(Number(tariffGrant.grantW))
                        ? Math.max(0, Number(tariffGrant.grantW))
                        : Math.max(0, remTotal);
                    pvBudgetGateW = Math.max(0, tariffAvailableW - gateCfg.budgetSafetyReserveW);
                    pvBudgetSource = 'ems.budget.tariffNegative.central-total-grant';
                    pvBudgetFromCentral = true;
                    // Nur ein frischer echter Gesamt-Grant mit nutzbarem NVP
                    // darf die lokale PV-only-Bezugsabschaltung ersetzen.
                    // Restwerte/Fallbacks allein sind keine Netzfreigabe.
                    centralTariffImportGrantValid = age >= 0 && age <= Math.min(staleMs, 5000)
                        && snap.gates && snap.gates.grid && snap.gates.grid.measurementUsable === true
                        && tariffGrant && finite(tariffGrant.grantW) && tariffGrant.grantW > 0;
                }
            }
        } catch (_e) {
            // Die zentrale Runtime bleibt autoritativ. Ein Fehler darf keinen
            // zweiten lokalen CM-/NVP-Budgetpfad aktivieren.
        }

        if (centralRuntimePresent && !centralBudgetSnapshotUsed) {
            pvBudgetGateW = 0;
            totalGateRemainingW = 0;
            totalGateBudgetW = 0;
            pvBudgetSource = 'ems.budget.central-stale-or-invalid-blocked';
            totalGateSource = 'ems.budget.central-stale-or-invalid-blocked';
            pvBudgetFromCentral = true;
        }

        const effectiveGateW = Math.max(0, Math.min(
            pvBudgetGateW,
            Number.isFinite(totalGateRemainingW) ? totalGateRemainingW : Number.POSITIVE_INFINITY
        ));

        const source = `${pvBudgetSource}|${totalGateSource}`;
        const gridImportActive = !!(gridKnown && importW > gateCfg.maxGridImportW);
        const storageDischargeActive = !!(storage.dischargeW > gateCfg.storageDischargeToleranceW);
        const nonPvEnergyActive = !!(gridImportActive || storageDischargeActive);
        const forceOff = effectiveGateW <= 50 && currentW > 0 && (importW > gateCfg.hardGridImportW || storage.dischargeW > gateCfg.hardStorageDischargeW);

        return {
            pvCapW: centralRuntimePresent ? Math.max(0, pvBudgetGateW) : Math.max(pvBudgetGateW, pvCapW, nvpSurplusBeforeFlexW),
            evcsUsedW,
            availableW: effectiveGateW,
            source,
            gateCfg,
            useBudgetGates: !!gateCfg.useBudgetGates,
            budgetGateTotalW: Number.isFinite(totalGateBudgetW) ? Math.max(0, totalGateBudgetW) : null,
            budgetGateRemainingW: Number.isFinite(totalGateRemainingW) ? Math.max(0, totalGateRemainingW) : null,
            budgetGatePvW: Math.max(0, pvBudgetGateW),
            budgetGateEffectiveW: Math.max(0, effectiveGateW),
            budgetGateSource: source,
            pvBudgetFromCentral: !!pvBudgetFromCentral,
            tariffGridImportPreferred: String(pvBudgetSource || '').includes('tariffNegative'),
            // Die aktuelle gesamte Auto-Last muss innerhalb aller zentralen
            // Restgrenzen liegen. Eine echte Überlast behält den Abschaltpfad.
            zeroExportTariffImportAllowed: readZeroExportMode(this.adapter).active
                && gridKnown && centralTariffImportGrantValid === true
                && effectiveGateW > 0 && effectiveGateW >= currentW,
            pvNowW,
            forecastGate,
            forecastUsable,
            forecastStepCapW: Math.max(0, Math.round(forecastStepCapW || pvNowW || 0)),
            cmActive,
            cmStaleMeter: !!cmStaleMeter,
            cmStaleBudget: !!cmStaleBudget,
            cmPvAvailable,
            cmPvCapEffectiveW: pvCapW,
            cmPvCapRawW: finite(cmPvCapRawRaw) ? Math.max(0, cmPvCapRawRaw) : 0,
            cmPvSurplusNoEvRawW: finite(cmPvNoEvRaw) ? Math.max(0, cmPvNoEvRaw) : 0,
            gridKnown,
            gridW: gridKnown ? gridW : null,
            importW,
            importToleranceW: gateCfg.maxGridImportW,
            gridImportActive,
            exportW,
            currentHeatingRodW: currentW,
            storageChargeW: storage.chargeW,
            storageDischargeW: storage.dischargeW,
            dischargeToleranceW: gateCfg.storageDischargeToleranceW,
            storageDischargeActive,
            nonPvEnergyActive,
            storageSocPct: storage.socPct,
            storageReserveW,
            storageReserveMissingW,
            storageChargeUsableW,
            storageTargetSocPct,
            usableStorageChargeForNvpW,
            stageUpDelaySec: gateCfg.stageUpDelaySec,
            nvpSurplusBeforeFlexW,
            cmAvailableW: (cmPvGateW !== null && Number.isFinite(cmPvGateW)) ? Math.max(0, cmPvGateW) : 0,
            nvpAvailableW,
            forceOff,
        };
    }

    /**
     * Code-Teil: Methode `_updateBudgetGateProtection`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _updateBudgetGateProtection
     * Zweck: Prüft NVP-/Batterieleistung in W und Schutzhaltezeiten gegen now (ms).
     * Rückgabe: Abschalt-/Reduktionsgründe; pflegt nur lokale Schutzzeitpunkte.
     * Sicherheit: Bei aktiver Nulleinspeisung darf ein frischer zentraler Tarif-
     * Gesamt-Grant erlaubten Netzbezug von der lokalen PV-only-Hartgrenze
     * ausnehmen. Gesamt-/Geräte-/§14a-Limits und Batterieschutz bleiben wirksam.
     * Ohne diese explizite Freigabe bleibt die bisherige Abschaltung unverändert.
     */
    _updateBudgetGateProtection(pvBase, now) {
        const cfg = (pvBase && pvBase.gateCfg) ? pvBase.gateCfg : this._getBudgetGateCfg();
        const st = this._budgetProtect || { importSinceMs: 0, dischargeSinceMs: 0 };
        const tariffImportPreferred = !!(pvBase && pvBase.tariffGridImportPreferred);
        const zeroExportTariffImportAllowed = tariffImportPreferred
            && pvBase.zeroExportTariffImportAllowed === true
            && readZeroExportMode(this.adapter).active;
        const importActive = !!(!tariffImportPreferred && pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.maxGridImportW);
        const dischargeActive = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.storageDischargeToleranceW);
        const hardImport = !!(!zeroExportTariffImportAllowed && pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.hardGridImportW);
        const hardDischarge = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.hardStorageDischargeW);
        if (importActive) {
            if (!st.importSinceMs) st.importSinceMs = now;
        } else {
            st.importSinceMs = 0;
        }
        if (dischargeActive) {
            if (!st.dischargeSinceMs) st.dischargeSinceMs = now;
        } else {
            st.dischargeSinceMs = 0;
        }

        const importHoldMs = importActive && st.importSinceMs ? Math.max(0, now - st.importSinceMs) : 0;
        const dischargeHoldMs = dischargeActive && st.dischargeSinceMs ? Math.max(0, now - st.dischargeSinceMs) : 0;
        const hardOff = !!(hardImport || hardDischarge);
        const reduceNow = hardOff
            || (importActive && importHoldMs >= Math.max(0, cfg.gridImportHoldSec * 1000))
            || (dischargeActive && dischargeHoldMs >= Math.max(0, cfg.storageDischargeHoldSec * 1000));
        const reason = hardOff
            ? (hardImport ? 'hard_grid_import' : 'hard_storage_discharge')
            : (reduceNow ? (importActive ? 'grid_import_hold' : 'storage_discharge_hold') : (importActive || dischargeActive ? 'watch' : 'ok'));

        this._budgetProtect = st;
        return {
            importActive,
            dischargeActive,
            hardImport,
            hardDischarge,
            importHoldMs,
            dischargeHoldMs,
            hardOff,
            reduceNow,
            watchActive: !!((importActive || dischargeActive) && !reduceNow),
            reason,
        };
    }

    /**
     * Code-Teil: Methode `_getZeroExportCfg`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getZeroExportCfg() {
        const cfg = this._getCfg();
        const gateCfg = this._getBudgetGateCfg();
        const raw = (cfg.zeroExport && typeof cfg.zeroExport === 'object')
            ? cfg.zeroExport
            : ((cfg.zeroFeedIn && typeof cfg.zeroFeedIn === 'object') ? cfg.zeroFeedIn : {});

        /**
         * Code-Teil: Arrow-Funktion `n`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const n = (keyList, def, minV = 0, maxV = 1e12) => {
            const keys = Array.isArray(keyList) ? keyList : [keyList];
            for (const key of keys) {
                if (!key) continue;
                const v = raw[key];
                if (v === null || v === undefined || v === '') continue;
                const nr = Number(v);
                if (Number.isFinite(nr)) return Math.round(clamp(nr, minV, maxV));
            }
            return Math.round(clamp(def, minV, maxV));
        };

        // Betriebsart des einen Auto-Buttons: neue Konfiguration (`cfg.autoMode`) hat Vorrang.
        // Alte Installationen mit `zeroExport.enabled=true` werden nur dann automatisch migriert,
        // wenn noch keine explizite Betriebsart gespeichert wurde. So kann ein späteres Zurückstellen
        // auf PV-Überschuss nicht durch ein altes Detail-Flag wieder überschrieben werden.
        const explicitAutoMode = cfg.autoMode ?? cfg.automationMode ?? raw.autoMode ?? raw.mode;
        const legacyZeroEnabled = !!(raw.enabled || raw.active);
        const autoMode = normalizeHeatingRodAutoMode(explicitAutoMode || (legacyZeroEnabled ? 'zeroExportForecast' : 'pvSurplus'));

        return {
            autoMode,
            enabled: autoMode === 'zeroExportForecast',
            feedInLimitW: n(['feedInLimitW', 'allowedExportW', 'exportLimitW'], 0, 0, 1000000),
            feedInToleranceW: n(['feedInToleranceW', 'exportToleranceW'], 150, 0, 100000),
            targetExportBufferW: n(['targetExportBufferW', 'exportBufferW'], 100, 0, 100000),
            minPvPowerW: n(['minPvPowerW', 'minCurrentPvW'], 1000, 0, 1000000),
            requireForecast: raw.requireForecast === false ? false : true,
            minForecastPeakW: n(['minForecastPeakW', 'forecastMinPeakW'], 1000, 0, 1000000),
            minForecastKwh6h: clamp(num(raw.minForecastKwh6h ?? raw.forecastMinKwh6h, 0.5), 0, 100000),
            storageFullSocPct: n(['storageFullSocPct', 'storagePrioritySocPct'], 95, 0, 100),
            gridImportTripW: gateCfg.maxGridImportW,
            gridImportTripSec: gateCfg.gridImportHoldSec,
            hardGridImportW: gateCfg.hardGridImportW,
            storageDischargeToleranceW: gateCfg.storageDischargeToleranceW,
            storageDischargeTripSec: gateCfg.storageDischargeHoldSec,
            hardStorageDischargeW: gateCfg.hardStorageDischargeW,
            stepUpDelaySec: n(['stepUpDelaySec', 'stepUpWaitSec'], 60, 0, 86400),
            stepDownDelaySec: n(['stepDownDelaySec', 'stepDownWaitSec'], 5, 0, 86400),
            cooldownSec: n(['cooldownSec', 'probeCooldownSec'], 60, 0, 86400),
            probeObserveSec: n(['probeObserveSec', 'pvFollowCheckSec', 'pvNachregelCheckSec'], 45, 0, 3600),
            probeMinPvRisePct: n(['probeMinPvRisePct', 'pvRiseMinPct', 'pvAnstiegMinPct'], 20, 0, 1000),
            probeMinPvRiseW: n(['probeMinPvRiseW', 'pvRiseMinW', 'pvAnstiegMinW'], 150, 0, 1000000),
            probeRetrySec: n(['probeRetrySec', 'retryAfterFailedRiseSec', 'pvRiseRetrySec'], 600, 0, 86400),
        };
    }

    /**
     * Code-Teil: Methode `_getPvAutomationMinW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getPvAutomationMinW() {
        const cfg = this._getCfg();

        // Global PV-Auto enable threshold. This is intentionally separate from
        // zeroExport.minPvPowerW: the latter only guards additional probe/test loads
        // for hidden/abgeregelte PV. If no explicit value exists yet, use 800 W.
        const candidates = [
            cfg.minPvPowerW,
            cfg.pvAutoMinPvPowerW,
            cfg.minCurrentPvW
        ];

        for (const raw of candidates) {
            if (raw === null || raw === undefined || raw === '') continue;
            const n = Number(raw);
            if (Number.isFinite(n)) return Math.max(0, Math.round(clamp(n, 0, 1000000)));
        }
        return 800;
    }

    /**
     * Code-Teil: Methode `_readCacheRaw`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readCacheRaw
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readCacheRaw(key, fallback = null) {
        if (!key) return fallback;
        try {
            const cache = this.adapter && this.adapter.stateCache;
            const rec = cache && cache[String(key)];
            if (rec && typeof rec === 'object' && rec.value !== undefined) return rec.value;
            if (rec !== undefined) return rec;
        } catch (_e) {
            // ignore
        }
        return fallback;
    }

    /**
     * Code-Teil: Methode `_readPvNowW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readPvNowW
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readPvNowW(staleMs) {
        const basePv = this._readNumberAny([
            'pvPower',
            'productionTotal',
            'derived.core.pv.totalW',
            'ems.budget.pvPowerW',
            // PeakShaving registers the current PV input as ps.pvW. Keep the old
            // ps.pvPowerW alias as compatibility fallback.
            'ps.pvW',
            'ps.pvPowerW',
            'chargingManagement.control.pvPowerW',
            'cm.pvPowerW'
        ], staleMs, null);
        const farmPv = this._readNumberAny(['storageFarm.totalPvPowerW'], staleMs, null);
        let pv = 0;
        if (typeof basePv === 'number' && Number.isFinite(basePv)) pv = Math.max(pv, basePv);
        if (typeof farmPv === 'number' && Number.isFinite(farmPv)) pv = Math.max(pv, farmPv);
        return Math.max(0, Math.round(pv));
    }

    /**
     * Code-Teil: Methode `_readForecastSnapshot`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readForecastSnapshot
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readForecastSnapshot() {
        // Prefer the in-memory snapshot from PvForecastModule. It is updated in the
        // same ModuleManager cycle before Heizstab, so it is fresher and more reliable
        // than reading the already-published ioBroker states back from cache.
        try {
            const snap = this.adapter && this.adapter._pvForecast;
            if (snap && typeof snap === 'object' && snap.ts) {
                return {
                    valid: !!snap.valid,
                    peakW: Math.max(0, num(snap.peakWNext24h, 0)),
                    kwh6h: Math.max(0, num(snap.kwhNext6h, 0)),
                    kwh12h: Math.max(0, num(snap.kwhNext12h, 0)),
                    kwh24h: Math.max(0, num(snap.kwhNext24h, 0)),
                };
            }
        } catch (_e) {
            // fall through to state-cache fallback
        }

        /**
         * Code-Teil: Arrow-Funktion `boolVal`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
                const boolVal = (key) => {
            const raw = this._readCacheRaw(key, null);
            if (raw === true || raw === 1 || raw === '1') return true;
            if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
            return false;
        };
        /**
         * Code-Teil: numVal
         * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
         * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
         * Wartung/TypeScript: Änderungen können Heizstab-Freigaben und Reservelogik beeinflussen; Speicherreserve und PV-Budget testen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
         */
        const numVal = (keys, fallback = 0) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const key of list) {
                const v = this._readCacheNumber(key, null);
                if (typeof v === 'number' && Number.isFinite(v)) return v;
            }
            return fallback;
        };

        const peakW = Math.max(0, numVal([
            'forecast.pv.peakWNext24h',
            'forecast.pv.maxPowerNext24h',
            'pvForecast.peakWNext24h',
            'pvForecast.maxPowerW'
        ], 0));
        const kwh6h = Math.max(0, numVal([
            'forecast.pv.kwhNext6h',
            'forecast.pv.energyNext6hKwh',
            'pvForecast.kwhNext6h'
        ], 0));
        const kwh12h = Math.max(0, numVal([
            'forecast.pv.kwhNext12h',
            'forecast.pv.energyNext12hKwh',
            'pvForecast.kwhNext12h'
        ], 0));
        const kwh24h = Math.max(0, numVal([
            'forecast.pv.kwhNext24h',
            'forecast.pv.energyNext24hKwh',
            'pvForecast.kwhNext24h'
        ], 0));

        const valid = boolVal('forecast.pv.valid')
            || boolVal('pvForecast.valid')
            || peakW > 0
            || kwh6h > 0
            || kwh12h > 0
            || kwh24h > 0;

        return { valid, peakW, kwh6h, kwh12h, kwh24h };
    }

    /**
     * Code-Teil: Methode `_computeZeroExportInfo`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeZeroExportInfo(pvBase) {
        const cfg = this._getZeroExportCfg();
        const centralMode = readZeroExportMode(this.adapter);
        // Der App-Center-Schalter übernimmt die gesamte Auto-Strategie. Auch ein
        // diagnostischer/gesperrter Zentralmodus sperrt alte Forecast-Proben.
        if (centralMode.enabled) {
            return {
                active: centralMode.active, central: true, canProbe: false,
                reason: centralMode.reason, cfg: { ...cfg, autoMode: 'zeroExportCentral' },
                pvNowW: Math.max(0, num(pvBase && pvBase.pvNowW, 0)),
                zeroPotentialW: 0, zeroPotentialSource: 'central-exclusive-probe',
                zeroBudgetW: Math.max(0, num(pvBase && pvBase.budgetGateRemainingW, 0)),
            };
        }
        if (!cfg.enabled) {
            return { active: false, canProbe: false, reason: 'auto_mode_pv_surplus', cfg };
        }
        if (!pvBase || !pvBase.gridKnown) {
            return { active: true, canProbe: false, reason: 'grid_unknown', cfg };
        }

        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        // 0-W-Einspeisung darf nicht nur den sichtbaren NVP-Export betrachten. Bei
        // abgeregelten Hybrid-/WR-Systemen steigt die PV-/Hybridleistung erst, wenn
        // eine Last zugeschaltet wird. Deshalb wird PV-Ist nur als Signal genutzt;
        // die eigentliche Freigabe kommt aus Forecast + zentralem Restbudget.
        const pvNowW = this._readPvNowW(staleMs);
        const feedLimitW = Math.max(0, Math.round(num(cfg.feedInLimitW, 0)));
        const tolW = Math.max(0, Math.round(num(cfg.feedInToleranceW, 0)));
        const exportW = Math.max(0, Math.round(num(pvBase.exportW, 0)));

        // For a true 0-feed-in plant the export value sits close to 0. For a minus-feed-in
        // plant (e.g. -1 kW allowed) the plant is at the cap when measured export is close
        // to the configured allowed export magnitude.
        const exportWindowW = Math.max(tolW, Math.round(num(cfg.targetExportBufferW, 0)));
        const feedInAtLimit = feedLimitW > 0
            ? exportW >= Math.max(0, feedLimitW - exportWindowW)
            : exportW <= exportWindowW;

        const forecast = this._readForecastSnapshot();
        const forecastOk = !cfg.requireForecast || (
            forecast.valid && (
                forecast.peakW >= cfg.minForecastPeakW
                || forecast.kwh6h >= cfg.minForecastKwh6h
                || forecast.kwh12h >= Math.max(cfg.minForecastKwh6h, cfg.minForecastKwh6h * 1.5)
                || forecast.kwh24h >= Math.max(cfg.minForecastKwh6h, cfg.minForecastKwh6h * 2)
            )
        );

        // Zentrale Budgetlogik bleibt führend: EVCS und Thermik reservieren vor dem
        // Heizstab. Für 0-W-Anlagen wird nur ein zusätzliches PV-Potential aufgebaut,
        // aber niemals über das zentrale Rest-/Netzbudget hinaus geschaltet.
        const gateCfg = (pvBase && pvBase.gateCfg) ? pvBase.gateCfg : this._getBudgetGateCfg();
        const currentOwnW = Math.max(0, Math.round(num(pvBase.currentHeatingRodW, 0)));
        const safetyW = Math.max(0, Math.round(num(gateCfg.budgetSafetyReserveW, 0)));
        const evcsUsedW = Math.max(0, Math.round(num(pvBase.evcsUsedW, 0)));
        const storageReserveMissingW = Math.max(0, Math.round(num(pvBase.storageReserveMissingW, 0)));
        const storageChargeUsableW = Math.max(0, Math.round(num(pvBase.storageChargeUsableW, 0)));
        const storageDischargeW = Math.max(0, Math.round(num(pvBase.storageDischargeW, 0)));
        const liveBudgetW = Math.max(0, Math.round(num(pvBase.nvpAvailableW, 0)));
        const forecastPowerW = Math.max(
            0,
            Math.round(num(pvBase.forecastStepCapW, 0)),
            Math.round(num(forecast.peakW, 0)),
            pvNowW
        );
        const totalGateRaw = Number(pvBase.budgetGateRemainingW);
        const totalBudgetCapW = Number.isFinite(totalGateRaw) ? Math.max(0, Math.round(totalGateRaw)) : Number.POSITIVE_INFINITY;
        const totalBudgetForDiagW = Number.isFinite(totalBudgetCapW) ? totalBudgetCapW : 0;

        // Forecast-Potential: grobe Dach-/Hybrid-Erwartung nach EVCS-Priorität,
        // Speicherreserve und Sicherheitsabstand. Es ist nur eine Obergrenze für
        // stufenweise Tests; der Live-Guard am NVP/Speicher entscheidet weiterhin.
        const forecastPotentialW = forecastOk
            ? Math.max(0, forecastPowerW - evcsUsedW - storageReserveMissingW - safetyW)
            : 0;
        // Live-Potential: bestätigte Leistung aus laufendem Heizstab, NVP-Bilanz und
        // zusätzlicher Speicherladung. Dadurch fällt eine stabile Stufe bei 0 W Export
        // nicht auf 0 zurück, nur weil der NVP weiterhin sauber geregelt ist.
        const livePotentialW = Math.max(0, liveBudgetW, currentOwnW + storageChargeUsableW - storageDischargeW - safetyW);
        const rawPotentialW = Math.max(currentOwnW, livePotentialW, forecastPotentialW);
        const zeroPotentialW = Math.max(0, Math.round(Math.min(
            rawPotentialW,
            Number.isFinite(totalBudgetCapW) ? totalBudgetCapW : rawPotentialW
        )));

        const pvNowOk = pvNowW >= Math.max(0, cfg.minPvPowerW);
        const forecastSignalOk = forecastOk && forecastPowerW >= Math.max(0, cfg.minPvPowerW);
        const liveSignalOk = liveBudgetW >= Math.max(0, Math.min(cfg.minPvPowerW, Math.max(50, safetyW))) || currentOwnW > 50;
        const pvSignalOk = !!(pvNowOk || forecastSignalOk || liveSignalOk);
        const soc = (typeof pvBase.storageSocPct === 'number' && Number.isFinite(pvBase.storageSocPct)) ? pvBase.storageSocPct : null;
        const storageKnown = soc !== null || num(pvBase.storageChargeW, 0) > 0 || num(pvBase.storageDischargeW, 0) > 0;
        const storageReady = !storageKnown
            || storageReserveMissingW <= Math.max(50, safetyW)
            || storageChargeUsableW > 0
            || (soc !== null && soc >= cfg.storageFullSocPct)
            || (forecastPotentialW > 0 && storageDischargeW <= cfg.storageDischargeToleranceW);
        const noSoftNonPv = !(pvBase.importW > cfg.gridImportTripW || pvBase.storageDischargeW > cfg.storageDischargeToleranceW);
        const noHardNonPv = !(pvBase.importW > cfg.hardGridImportW || pvBase.storageDischargeW > cfg.hardStorageDischargeW);
        const totalBudgetOk = !Number.isFinite(totalBudgetCapW) || totalBudgetCapW > 50;

        let reason = 'ready';
        if (!feedInAtLimit) reason = 'feed_in_not_at_limit';
        else if (!pvSignalOk) reason = 'pv_or_forecast_signal_too_low';
        else if (!forecastOk) reason = 'forecast_not_ok';
        else if (!totalBudgetOk || zeroPotentialW <= 50) reason = 'central_budget_zero';
        else if (!noHardNonPv) reason = 'non_pv_hard_block';
        else if (!noSoftNonPv) reason = 'non_pv_watch';

        const canProbe = !!(feedInAtLimit && pvSignalOk && forecastOk && totalBudgetOk && zeroPotentialW > 50 && noHardNonPv && noSoftNonPv);
        const potentialSource = forecastPotentialW >= livePotentialW
            ? 'forecast+central-budget-after-priority'
            : 'nvp-confirmed-own-load+storage-flow';

        return {
            active: true,
            canProbe,
            reason,
            cfg,
            pvNowW,
            feedInAtLimit,
            forecastOk,
            forecast,
            storageReady,
            pvNowOk,
            pvSignalOk,
            forecastSignalOk,
            liveSignalOk,
            exportW,
            feedInLimitW: feedLimitW,
            feedInToleranceW: tolW,
            forecastPowerW,
            forecastPotentialW: Math.round(forecastPotentialW),
            livePotentialW: Math.round(livePotentialW),
            zeroPotentialW,
            zeroBudgetW: totalBudgetForDiagW,
            zeroPotentialSource: potentialSource,
            storageReserveMissingW,
            storageChargeUsableW,
            evcsUsedW,
            noSoftNonPv,
            noHardNonPv,
        };
    }


    /**
     * Code-Teil: Methode `_stageActuatorKey`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _stageActuatorKey(stage, idx) {
        if (!stage || typeof stage !== 'object') return `stage:${idx + 1}`;
        const keyCandidates = [stage.writeKey, stage.readKey];
        for (const key of keyCandidates) {
            const k = String(key || '').trim();
            if (!k) continue;
            try {
                const entry = this.dp && this.dp.getEntry ? this.dp.getEntry(k) : null;
                const objectId = String(entry && entry.objectId ? entry.objectId : '').trim();
                if (objectId) return objectId;
            } catch (_e) {
                // ignore
            }
        }
        const id = String(stage.writeId || stage.readId || '').trim();
        return id || `stage:${idx + 1}`;
    }

    /**
     * Code-Teil: Methode `_capDevicePower`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _capDevicePower(d, valueW) {
        const v = Math.max(0, Math.round(num(valueW, 0)));
        const maxW = Math.max(0, Math.round(num(d && d.maxPowerW, 0)));
        return maxW > 0 ? Math.min(v, maxW) : v;
    }
        _sumStagePower(d, stageCount) {
        const cnt = Math.max(0, Math.min(Math.round(Number(stageCount) || 0), d.stages.length));
        const byActuator = new Map();
        for (let i = 0; i < cnt; i++) {
            const stage = d.stages[i];
            const key = this._stageActuatorKey(stage, i);
            const powerW = Math.max(0, num(stage && stage.powerW, 0));
            byActuator.set(key, Math.max(byActuator.get(key) || 0, powerW));
        }
        let sum = 0;
        for (const powerW of byActuator.values()) sum += powerW;
        return this._capDevicePower(d, sum);
    }

    _maxStageForPara14aBudget(d, budgetW, observedStage = 0, measuredW = null) {
        const availableW = Math.max(0, num(budgetW, 0));
        const maxStage = Math.max(0, Math.min(d.wiredStages || d.stageCount || 0, d.stageCount || 0));
        let allowedStage = 0;
        for (let stage = 1; stage <= maxStage; stage++) {
            const stageW = this._sumStagePowerModel(d, stage, observedStage, measuredW);
            if (stageW <= (availableW + 25)) allowedStage = stage;
            else break;
        }
        return allowedStage;
    }

    _maxStageForStrategyPower(d, maxPowerW, observedStage = 0, measuredW = null) {
        // Kein Strategie-Cap (null/undefined) lässt den normalen Auto-Regler
        // unverändert zu. Eine explizite 0 W bleibt dagegen ein echter Stopp.
        if (maxPowerW === null || maxPowerW === undefined || !Number.isFinite(Number(maxPowerW))) {
            return Math.max(0, Math.min(d.wiredStages || d.stageCount || 0, d.stageCount || 0));
        }
        const availableW = Math.max(0, Number(maxPowerW));
        const maxStage = Math.max(0, Math.min(d.wiredStages || d.stageCount || 0, d.stageCount || 0));
        let allowedStage = 0;
        for (let stage = 1; stage <= maxStage; stage++) {
            const stageW = this._sumStagePowerModel(d, stage, observedStage, measuredW);
            if (stageW <= (availableW + 25)) allowedStage = stage;
            else break;
        }
        return allowedStage;
    }

    async _enforcePara14aObservedStage(d, observedStage, measuredW, feedback, budgetW, label) {
        const key = String(d && d.id || '').trim();
        let held = key ? this._para14aHeldStages.get(key) : null;
        if (!held) {
            held = {
                requestedStage: Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d.wiredStages || d.stageCount || 0)),
                capturedAt: Date.now(),
            };
            if (key) this._para14aHeldStages.set(key, held);
        }

        const requestedStage = Math.max(0, Math.min(
            Math.round(Number(held.requestedStage) || 0),
            d.wiredStages || d.stageCount || 0,
        ));
        const availableW = Math.max(0, num(budgetW, 0));
        const allowedStage = this._maxStageForPara14aBudget(d, availableW, observedStage, measuredW);
        const targetStage = Math.min(requestedStage, allowedStage);
        const observedW = this._resolveObservedPowerW(
            d,
            measuredW,
            feedback,
            this._sumStagePowerModel(d, observedStage, observedStage, measuredW),
        );
        const overBudget = observedW > (availableW + 50);
        const mustWrite = observedStage !== targetStage || overBudget;
        let res = {
            applied: false,
            accepted: true,
            writeAccepted: false,
            writePartial: false,
            status: 'within_budget',
            targetStage,
        };
        const targetW = this._sumStagePowerModel(d, targetStage, observedStage, measuredW);
        if (mustWrite) {
            res = await this._applyStageState(
                d,
                targetStage,
                feedback,
                this._para14aOptions(d, {
                    force: true,
                    releaseAuthority: false,
                    reason: `§14a Heizstab ${label}`,
                }),
            );
            const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                ? Math.max(0, measuredW)
                : Math.max(0, feedback && feedback.appliedPowerW || this._sumStagePower(d, observedStage));
            this._recordAcceptedHeatingEffect(d, res, baselineW, targetW, `§14a Heizstab ${label}`);
        }
        return {
            res,
            requestedStage,
            targetStage,
            targetW,
            usedW: Math.max(0, observedW, res && res.accepted ? targetW : 0),
            limited: requestedStage > targetStage || overBudget,
        };
    }

    async _restorePara14aHeldStage(d, feedback, observedStage, measuredW, label = 'manual') {
        const key = String(d && d.id || '').trim();
        const held = key ? this._para14aHeldStages.get(key) : null;
        if (!held) return null;

        const requestedStage = Math.max(0, Math.min(
            Math.round(Number(held.requestedStage) || 0),
            d.wiredStages || d.stageCount || 0,
        ));
        const reason = `§14a Heizstab Freigabe ${label}`;
        const res = await this._applyStageState(d, requestedStage, feedback, {
            owner: this._para14aOwner(d),
            enforceAuthority: false,
            releaseAuthority: true,
            leaseMs: 0,
            kind: 'para14a-heating-rod-release',
            force: true,
            reason,
        });
        const targetW = this._sumStagePowerModel(d, requestedStage, observedStage, measuredW);
        const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
            ? Math.max(0, measuredW)
            : Math.max(0, feedback && feedback.appliedPowerW || this._sumStagePower(d, observedStage));
        this._recordAcceptedHeatingEffect(d, res, baselineW, targetW, reason);
        const restored = !!(res && res.accepted === true);
        if (restored && key) this._para14aHeldStages.delete(key);
        const observedW = this._resolveObservedPowerW(d, measuredW, feedback, this._sumStagePower(d, observedStage));
        return {
            res,
            restored,
            requestedStage,
            targetStage: requestedStage,
            targetW,
            usedW: Math.max(0, observedW, restored ? targetW : 0),
            status: `${restored ? 'para14a_restored' : 'para14a_restore_pending'}_${label}_${String(res && res.status || '')}`,
        };
    }

    /**
     * Code-Teil: Methode `_stageOnSetForTarget`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _stageOnSetForTarget(d, stageCount) {
        const cnt = Math.max(0, Math.min(Math.round(Number(stageCount) || 0), d.stages.length));
        const out = new Set();
        for (let i = 0; i < cnt; i++) {
            const stage = d.stages[i];
            // Only stages with an actual write datapoint can change a physical actuator.
            // If no writeKey exists, fall back to a unique virtual key so legacy setups
            // still step down by one row.
            const key = this._stageActuatorKey(stage, i);
            out.add(key);
        }
        return out;
    }

    /**
     * Code-Teil: Methode `_sameStageOnSet`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _sameStageOnSet(a, b) {
        if (!a || !b || a.size !== b.size) return false;
        for (const k of a.values()) {
            if (!b.has(k)) return false;
        }
        return true;
    }

    /**
     * Code-Teil: Methode `_previousPhysicalStageBelow`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _previousPhysicalStageBelow(d, observedStage) {
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d.stages.length));
        if (obs <= 0) return 0;
        const currentSet = this._stageOnSetForTarget(d, obs);
        for (let target = obs - 1; target >= 0; target--) {
            const set = this._stageOnSetForTarget(d, target);
            if (!this._sameStageOnSet(currentSet, set)) return target;
        }
        return 0;
    }

    /**
     * Code-Teil: Methode `_nextPhysicalStageAbove`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _nextPhysicalStageAbove(d, observedStage) {
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d.stages.length));
        const currentSet = this._stageOnSetForTarget(d, obs);
        for (let target = obs + 1; target <= d.stages.length; target++) {
            const set = this._stageOnSetForTarget(d, target);
            if (!this._sameStageOnSet(currentSet, set)) return target;
        }
        return obs;
    }

    /**
     * Code-Teil: Methode `_readMeasuredW`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readMeasuredW
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readMeasuredW(d, staleMs = null) {
        if (!(this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey))) return null;
        let v = null;
        try {
            if (Number.isFinite(Number(staleMs)) && staleMs > 0 && typeof this.dp.getNumberFresh === 'function') {
                v = this.dp.getNumberFresh(d.pWKey, staleMs, null);
            } else {
                v = this.dp.getNumber(d.pWKey, null);
            }
        } catch (_e) {
            v = null;
        }
        return (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    }


    /**
     * Code-Teil: _hasMeasuredPowerW
     * Zweck: Trennt einen gueltigen Messwert (auch exakt 0 W) von einem fehlenden
     * Messwert. Diese Unterscheidung verhindert, dass Stufen-Nennleistungen eine
     * reale 0-W-Messung im Energiefluss oder in der Budgetdiagnose ueberlagern.
     */
    _hasMeasuredPowerW(measuredW) {
        return typeof measuredW === 'number' && Number.isFinite(measuredW);
    }

    /**
     * Prüft ausschließlich den Leistungs-Messkanal für zentrale PV-Testlasten.
     * Ein Ausgangsbefehl oder ein Relaiszustand beweist keinen Energieverbrauch
     * (z. B. offener Thermostat). Ohne überprüfbare Frische keine neue Testlast.
     */
    _readZeroExportActualW(d, staleMs) {
        if (!(this.dp && d.pWKey && this.dp.getEntry && this.dp.getEntry(d.pWKey))) return null;
        try {
            // Heartbeat/Liveness darf alte Messwerte nicht verjüngen. Die
            // Prüflast verlangt das Alter der ursprünglichen Leistungsmessung.
            if (typeof this.dp.getMeasurementAgeMs !== 'function') return null;
            const ageMs = this.dp.getMeasurementAgeMs(d.pWKey);
            const maxAgeMs = Math.min(5000, Math.max(0, Number(staleMs) || 0));
            if (typeof ageMs !== 'number' || !Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxAgeMs) return null;
            if (typeof this.dp.getNumberFresh === 'function') {
                const value = this.dp.getNumberFresh(d.pWKey, maxAgeMs, null);
                return this._hasMeasuredPowerW(value) && value >= 0 ? value : null;
            }
            const value = this.dp.getNumber(d.pWKey, null);
            return this._hasMeasuredPowerW(value) && value >= 0 ? value : null;
        } catch (_e) {
            return null;
        }
    }

    /**
     * Führt die zentrale 0-Einspeise-Testfreigabe auf den realen Stufenplan zurück.
     * Eingänge in W: bestätigtes PV-Restbudget, Gesamtgrenze, Istleistung; Zeit in ms.
     * Testleistung bleibt eine befristete Einzel-Freigabe und wird niemals zu PV
     * erklärt. Ganze Stufen müssen in PV-Budget oder aktive Freigabe passen;
     * Nachlaufzeiten und TS-Fallback dürfen diesen Deckel später nicht anheben.
     */
    _applyCentralZeroExportStageStrategy(d, observedStage, pvBase, options = {}) {
        const now = Math.max(0, Number(options.now) || Date.now());
        const mode = readZeroExportMode(this.adapter);
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(observedStage, Number(st.targetStage) || 0);
        const measuredW = options.actualW;
        const stagePower = (stage) => {
            const actuators = new Map();
            for (let index = 0; index < Math.min(stage, d.stages.length); index++) {
                const row = d.stages[index];
                const key = this._stageActuatorKey(row, index);
                actuators.set(key, Math.max(actuators.get(key) || 0, Math.max(0, Number(row.powerW) || 0)));
            }
            const physicalW = [...actuators.values()].reduce((sum, value) => sum + value, 0);
            // Erst die vollständige reale Stufe berechnen, dann gegen maxW
            // prüfen. Vorzeitiges Kappen auf maxPowerW würde z. B. zwei 3-kW-
            // Relais bei einem 4-kW-Gerätelimit fälschlich als 4 kW ausgeben.
            return Math.max(physicalW, this._sumStagePowerModel(d, stage, observedStage, measuredW));
        };
        const wiredMaxStage = Math.max(0, Math.min(d.wiredStages || 0, d.stageCount || 0));
        const maxW = Math.max(0, Math.min(
            Number(d.maxPowerW) || 0,
            Number.isFinite(Number(options.maxW)) ? Number(options.maxW) : 0,
        ));
        const baseW = Math.min(maxW, Math.max(0, Number(options.baseW) || 0));
        const stageForBudget = (budgetW) => {
            let result = 0;
            for (let stage = 1; stage <= wiredMaxStage; stage++) {
                if (stagePower(stage) <= budgetW) result = stage;
                else break;
            }
            return result;
        };
        const baseStage = stageForBudget(baseW);
        const nextStage = Math.min(wiredMaxStage, this._nextPhysicalStageAbove(d, baseStage));
        const nextW = nextStage > baseStage ? stagePower(nextStage) : baseW;
        const gateCfg = pvBase && pvBase.gateCfg || this._getBudgetGateCfg();
        const cooldownMs = Math.max(Number(d.minOffSec) || 0,
            currentStage <= 0 ? Number(gateCfg.cooldownAfterOffSec) || 0 : 0) * 1000;
        const localCooldown = st.lastDecreaseMs > 0 && now - st.lastDecreaseMs < cooldownMs;
        const protection = options.budgetProtection || {};
        const eligible = mode.active && options.eligible === true && !localCooldown
            && protection.hardOff !== true && protection.reduceNow !== true
            && (protection.watchActive !== true || st.centralZeroProbeGranted === true)
            && options.actualFresh === true && pvBase && pvBase.gridKnown === true
            && ((nextW > baseW && nextW <= maxW) || st.centralZeroProbeGranted === true);
        // Alte Einzelproben werden nicht in die gemeinsame Freigabe übernommen.
        st.zeroProbe = null;
        const probe = requestZeroExportProbe(this.adapter, {
            key: `heatingRod:${d.id}`, now, baseW, nextW, maxW,
            priority: 300, eligible, actualW: Math.max(0, Number(measuredW) || 0),
            actualFresh: options.actualFresh === true,
            technicalMinW: stagePower(this._nextPhysicalStageAbove(d, 0)), phaseTransition: false,
        });
        const probeAllowed = mode.active && probe && probe.granted === true;
        st.centralZeroProbeGranted = probeAllowed;
        this._stageCtl.set(d.id, st);
        const allowedW = Math.min(maxW, Math.max(baseW,
            probeAllowed ? Math.max(0, Number(probe.targetW) || 0) : 0));
        const stageCap = stageForBudget(allowedW);
        let targetStage = stageCap;
        if (targetStage > currentStage && options.eligible !== true) targetStage = currentStage;
        if (targetStage > currentStage && !probeAllowed) {
            targetStage = this._limitBudgetStageStepUp(d, targetStage, observedStage, now);
        }
        targetStage = Math.min(targetStage, stageCap);
        return {
            targetStage, stageCap, allowedW, reduceNow: targetStage < currentStage,
            hardOff: protection.hardOff === true, probe,
            reason: String(probe && probe.reason || mode.reason || 'central-pv-budget'),
            nextAllowedAt: Math.max(0, Number(probe && probe.validUntil) || 0),
        };
    }

    /**
     * Code-Teil: _resolveObservedPowerW
     * Zweck: Liefert die beste beobachtete Heizstableistung. Ein frischer,
     * manuell zugeordneter Leistungs-DP ist immer autoritativ, einschliesslich
     * 0 W. Nur wenn dieser fehlt, darf Stufen-Readback bzw. ein Modell-Fallback
     * verwendet werden. Kommando-/Budgetreservierung bleibt davon getrennt.
     */
    _resolveObservedPowerW(d, measuredW, feedback = null, fallbackW = 0) {
        if (this._hasMeasuredPowerW(measuredW)) {
            return this._capDevicePower(d, Math.max(0, Number(measuredW)));
        }
        if (feedback && feedback.anyKnown) {
            return this._capDevicePower(d, Math.max(0, Number(feedback.appliedPowerW) || 0));
        }
        return this._capDevicePower(d, Math.max(0, Number(fallbackW) || 0));
    }

    /**
     * Code-Teil: Methode `_readStageFeedback`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readStageFeedback
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _readStageFeedback(d, staleMs = null) {
        /** @type {Array<boolean|null>} */
        const states = [];
        const powerByActuator = new Map();
        let contiguous = 0;
        let anyKnown = false;

        /**
         * Code-Teil: Arrow-Funktion `readBoolFresh`
         * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: readBoolFresh
         * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const readBoolFresh = (key) => {
            if (!(this.dp && key && this.dp.getEntry && this.dp.getEntry(key))) return { known: false, value: null, stale: false };
            try {
                if (Number.isFinite(Number(staleMs)) && staleMs > 0 && typeof this.dp.isStale === 'function' && this.dp.isStale(key, staleMs)) {
                    return { known: false, value: null, stale: true };
                }
                const value = this.dp.getBoolean ? this.dp.getBoolean(key, null) : null;
                return { known: value !== null && value !== undefined, value, stale: false };
            } catch (_e) {
                return { known: false, value: null, stale: false };
            }
        };

        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            let val = null;

            // Prefer a fresh feedback/read DP. If the feedback DP is stale, fall back
            // to the write/state DP. This is important for KNX/OpenKNX installations
            // where read objects may stay old for hours while the EMS has just written
            // the relay. A stale false feedback must not reset PV-Auto back to stage 1
            // on every tick and block step-up although the NVP/PV budget is available.
            const read = stage.readKey ? readBoolFresh(stage.readKey) : { known: false, value: null, stale: false };
            if (read.known) {
                val = read.value;
            } else if (this.dp && stage.writeKey && this.dp.getEntry && this.dp.getEntry(stage.writeKey)) {
                try { val = this.dp.getBoolean ? this.dp.getBoolean(stage.writeKey, null) : null; } catch (_e) { val = null; }
            }

            states.push(val);
            if (val !== null && val !== undefined) anyKnown = true;
            if (val === true) {
                const key = this._stageActuatorKey(stage, i);
                const powerW = Math.max(0, num(stage.powerW, 0));
                powerByActuator.set(key, Math.max(powerByActuator.get(key) || 0, powerW));
            }
        }
        for (let i = 0; i < states.length; i++) {
            if (states[i] === true) contiguous = i + 1;
            else if (states[i] === false) break;
            else break;
        }
        let appliedPowerW = 0;
        for (const powerW of powerByActuator.values()) appliedPowerW += powerW;
        return {
            states,
            anyKnown,
            currentStage: contiguous,
            appliedPowerW: this._capDevicePower(d, appliedPowerW),
        };
    }

    /**
     * Code-Teil: Methode `_ensureStageCtlState`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _ensureStageCtlState(id, observedStage = 0) {
        const prev = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const obs = Math.max(0, Math.round(Number(observedStage) || 0));
        if (!Number.isFinite(prev.targetStage)) prev.targetStage = obs;

        const target = Math.max(0, Math.round(Number(prev.targetStage) || 0));
        const ownedStage = Math.max(0, Math.round(Number(prev.autoOwnedStage) || 0));
        const autoOwned = !!(prev.autoOwned && Math.max(target, ownedStage) > 0);

        if (autoOwned) {
            // PV-Auto must not lose its target just because a read/feedback DP lags
            // behind or is stale. Otherwise each tick resets targetStage to the
            // currently observed lower stage and the stepped controller can never
            // climb from stage 1 to stage 2/3/4 despite enough PV budget.
            // If a higher physical stage is observed, sync upwards so external
            // intervention can still be detected by _getAutoOwnership().
            if (obs > target) prev.targetStage = obs;
        } else if (obs !== target) {
            prev.targetStage = obs;
        }

        this._stageCtl.set(id, prev);
        return prev;
    }

    /**
     * Code-Teil: Methode `_stagePowerScale`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _stagePowerScale(d, observedStage = 0, measuredW = null) {
        const st = (d && d.id && this._stageCtl && this._stageCtl.get) ? (this._stageCtl.get(d.id) || null) : null;
        const learned = st && Number.isFinite(Number(st.stagePowerScale)) ? clamp(Number(st.stagePowerScale), 0.25, 4) : 1;
        const obs = Math.max(0, Math.min(Math.round(Number(observedStage) || 0), d && d.stages ? d.stages.length : 0));
        const measured = Number(measuredW);
        if (obs <= 0 || !Number.isFinite(measured) || measured <= 50) return learned;
        const configuredW = Math.max(0, this._sumStagePower(d, obs));
        if (configuredW <= 50) return learned;
        const ratio = measured / configuredW;
        if (!Number.isFinite(ratio) || ratio <= 0) return learned;
        // Clamp keeps a noisy meter from destroying the stage model, but still corrects
        // common setups where the configured default says 2 kW/stage and the real rod is 1 kW/stage.
        const scale = clamp(ratio, 0.25, 4);
        if (d && d.id && this._stageCtl && this._stageCtl.set) {
            const next = Object.assign({}, st || { targetStage: obs, lastIncreaseMs: 0, lastDecreaseMs: 0 }, { stagePowerScale: scale });
            this._stageCtl.set(d.id, next);
        }
        return scale;
    }

    /**
     * Code-Teil: Methode `_sumStagePowerModel`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _sumStagePowerModel(d, stageCount, observedStage = 0, measuredW = null) {
        const configuredW = this._sumStagePower(d, stageCount);
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        return this._capDevicePower(d, Math.round(configuredW * scale));
    }


    /**
     * Code-Teil: _buildHeatingRodTsStageModel
     *
     * Zweck:
     * Übergibt dem TS-Entscheidungsspiegel exakt dieselben kumulierten und angelernten
     * Stufenleistungen, die auch der produktive Heizstabpfad verwendet.
     *
     * Zusammenhang:
     * `stage.powerW` beschreibt die einzelne physische Stufe. Die TS-Entscheidung
     * erwartet dagegen die kumulierte Leistung je erreichbarer Zielstufe. Zusätzlich
     * muss der aus realer Messleistung gelernte `stagePowerScale` berücksichtigt werden.
     * Ohne diese Vereinheitlichung konnte bei identischer Zielstufe ein dauerhaftes
     * `targetPowerW`-Mismatch entstehen; bei mehreren gleich großen Einzelstufen war
     * sogar eine falsche höhere TS-Zielstufe möglich.
     */
    _buildHeatingRodTsStageModel(d, observedStage = 0, measuredW = null) {
        const stageDefs = (Array.isArray(d && d.stages) ? d.stages : [])
            .filter(st => st && Number.isFinite(Number(st.powerW)) && Number(st.powerW) > 0);
        if (!stageDefs.length) return [];
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        return stageDefs.map((st, idx) => {
            const stageNo = Math.max(1, Math.round(Number(st.index || st.stage || (idx + 1)) || (idx + 1)));
            const configuredW = this._sumStagePower(d, stageNo);
            const modeledW = this._capDevicePower(d, Math.round(configuredW * scale));
            return { stage: stageNo, powerW: Math.max(0, modeledW) };
        });
    }
        _stageThresholdModel(d, stageIndexZeroBased, key, observedStage = 0, measuredW = null, fallbackStageCount = null) {
        const stage = d && d.stages ? d.stages[stageIndexZeroBased] : null;
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        const raw = stage && Number.isFinite(Number(stage[key])) ? Math.max(0, Number(stage[key])) : null;
        if (raw !== null) return Math.round(raw * scale);
        const cnt = fallbackStageCount !== null ? fallbackStageCount : (stageIndexZeroBased + 1);
        return this._sumStagePowerModel(d, cnt, observedStage, measuredW);
    }

    /**
     * Code-Teil: Methode `_computeDesiredStage`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeDesiredStage(d, remainingW, currentStage, measuredW = null) {
        let stage = Math.max(0, Math.min(Math.round(Number(currentStage) || 0), d.stageCount));
        const budgetW = Math.max(0, Math.round(num(remainingW, 0)));

        while (stage > 0) {
            const offBelowW = this._stageThresholdModel(d, stage - 1, 'offBelowW', currentStage, measuredW, stage);
            if (budgetW < Math.max(0, offBelowW)) stage--;
            else break;
        }

        while (stage < d.stageCount) {
            const thresholdCfgW = this._stageThresholdModel(d, stage, 'onAboveW', currentStage, measuredW, stage + 1);
            const nextPowerW = this._sumStagePowerModel(d, stage + 1, currentStage, measuredW);
            // Use the lower of the explicit threshold and the learned real cumulative power.
            // This lets PV-Auto follow the real hardware when the default/configured stage
            // power is too high, without breaking installers that intentionally entered
            // higher thresholds for hysteresis.
            const onAboveW = Math.max(0, Math.min(thresholdCfgW, nextPowerW || thresholdCfgW));
            if (budgetW >= onAboveW) stage++;
            else break;
        }

        return Math.max(0, Math.min(stage, d.stageCount));
    }

    /**
     * Code-Teil: Methode `_limitBudgetStageStepUp`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _limitBudgetStageStepUp
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _limitBudgetStageStepUp(d, desiredStage, observedStage, now) {
        const cfg = this._getBudgetGateCfg();
        const st = this._ensureStageCtlState(d.id, observedStage);
        const base = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let target = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        if (target <= base) return target;

        const nextPhysical = this._nextPhysicalStageAbove(d, base);
        if (nextPhysical > base) target = Math.min(target, nextPhysical);
        const waitMs = Math.max(0, Math.round(num(cfg.stageUpDelaySec, 10) * 1000));
        const lastUp = Math.max(num(st.budgetLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
        if (waitMs > 0 && lastUp > 0 && (now - lastUp) < waitMs) return base;

        st.budgetLastStepUpMs = now;
        this._stageCtl.set(d.id, st);
        return target;
    }

    /**
     * Code-Teil: Methode `_applyTiming`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _applyTiming(d, desiredStage, observedStage) {
        const st = this._ensureStageCtlState(d.id, observedStage);
        const now = nowMs();
        const gateCfg = this._getBudgetGateCfg();
        const minOnMs = Math.max(
            Math.max(0, Math.round(num(d.minOnSec, 0) * 1000)),
            Math.max(0, Math.round(num(gateCfg.minStageRunSec, 0) * 1000))
        );
        const minOffMsBase = Math.max(0, Math.round(num(d.minOffSec, 0) * 1000));
        let currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage) || 0), d.stageCount));

        if (desiredStage > currentStage) {
            const cooldownMs = currentStage <= 0
                ? Math.max(minOffMsBase, Math.max(0, Math.round(num(gateCfg.cooldownAfterOffSec, 0) * 1000)))
                : minOffMsBase;
            if (cooldownMs > 0 && st.lastDecreaseMs > 0 && (now - st.lastDecreaseMs) < cooldownMs) {
                return currentStage;
            }
            st.targetStage = desiredStage;
            st.lastIncreaseMs = now;
            this._stageCtl.set(d.id, st);
            return desiredStage;
        }

        if (desiredStage < currentStage) {
            if (minOnMs > 0 && st.lastIncreaseMs > 0 && (now - st.lastIncreaseMs) < minOnMs) {
                return currentStage;
            }
            st.targetStage = desiredStage;
            st.lastDecreaseMs = now;
            this._stageCtl.set(d.id, st);
            return desiredStage;
        }

        return currentStage;
    }

    /**
     * Code-Teil: Methode `_applyBudgetFollowerStageStrategy`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _applyBudgetFollowerStageStrategy
     * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _applyBudgetFollowerStageStrategy(d, desiredStage, observedStage, pvBase, budgetProtection, now, pvAutomationAllowedByMin = true) {
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let targetStage = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        let reason = 'budget_follow';

        const hardOff = !!(budgetProtection && budgetProtection.hardOff);
        const reduceNow = !!(budgetProtection && budgetProtection.reduceNow);
        const watchActive = !!(budgetProtection && budgetProtection.watchActive);

        if (hardOff || reduceNow) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            targetStage = hardOff ? 0 : this._previousPhysicalStageBelow(d, reduceBase);
            st.lastDecreaseMs = now;
            st.targetStage = targetStage;
            this._stageCtl.set(d.id, st);
            reason = hardOff ? 'hard_protect' : String((budgetProtection && budgetProtection.reason) || 'protect_reduce');
            return { targetStage, reduceNow: true, hardOff, reason };
        }

        // PV minimum is a start/step-up gate, not a nervous OFF command. Once PV-Auto
        // owns a stage, NVP import and storage-discharge gates decide when it must go down.
        if (!pvAutomationAllowedByMin && targetStage > currentStage) {
            targetStage = currentStage;
            reason = 'pv_min_hold_no_step_up';
        }

        // Gate D / PV-Forecast: only a step-up guard. It never allows battery use and it
        // never forces a manual/external stage down. If live PV + short forecast cannot plausibly
        // support the next cumulative stage, wait instead of climbing into Akku-Bezug.
        if (targetStage > currentStage && pvBase && pvBase.forecastUsable && !pvBase.tariffGridImportPreferred) {
            const capW = Math.max(0, Math.round(num(pvBase.forecastStepCapW, 0)));
            if (capW > 0) {
                let cappedStage = currentStage;
                for (let s = currentStage + 1; s <= targetStage; s++) {
                    const needW = this._sumStagePowerModel(d, s, observedStage, null);
                    if (needW <= capW + Math.max(150, Math.round(num((pvBase.gateCfg || {}).budgetSafetyReserveW, 200)))) cappedStage = s;
                    else break;
                }
                if (cappedStage < targetStage) {
                    targetStage = cappedStage;
                    reason = 'forecast_step_cap';
                }
            }
        }

        // During small grid/storage oscillations we hold the current physical stage.
        // The configured hold timers in _updateBudgetGateProtection decide later
        // whether a real down-step is necessary.
        if (watchActive && targetStage > currentStage) {
            targetStage = currentStage;
            reason = String((budgetProtection && budgetProtection.reason) || 'gate_watch');
        }
        if (targetStage < currentStage) {
            targetStage = currentStage;
            reason = watchActive ? 'hold_while_gate_watch' : 'hold_budget_hysteresis';
        }

        if (targetStage > currentStage) {
            targetStage = this._limitBudgetStageStepUp(d, targetStage, observedStage, now);
            if (targetStage > currentStage) reason = 'step_up_budget_ok';
            else reason = 'step_up_wait';
        }

        return { targetStage, reduceNow: false, hardOff: false, reason };
    }

    /**
     * Code-Teil: Methode `_applyZeroExportStageStrategy`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroInfo, now, measuredW = null) {
        const info = zeroInfo || this._computeZeroExportInfo(pvBase);
        const cfg = (info && info.cfg) ? info.cfg : this._getZeroExportCfg();
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
        let targetStage = Math.max(0, Math.min(Math.round(Number(desiredStage) || 0), d.stageCount));
        let reason = (info && info.reason) ? String(info.reason) : 'zero_export';
        const pvNowW = Math.max(0, Math.round(num(info && info.pvNowW, 0)));
        let reduceNow = false;
        let hardOff = false;

        const importActive = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.gridImportTripW);
        const dischargeActive = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.storageDischargeToleranceW);
        const hardImport = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) > cfg.hardGridImportW);
        const hardDischarge = !!(pvBase && num(pvBase.storageDischargeW, 0) > cfg.hardStorageDischargeW);
        const zeroPotentialW = Math.max(0, Math.round(num(info && info.zeroPotentialW, 0)));
        const stageBudgetToleranceW = Math.max(50, Math.round(num((pvBase && pvBase.gateCfg && pvBase.gateCfg.budgetSafetyReserveW), 200)));
        // Gerätespezifischer Budgetdeckel: Die Leistung der vorhandenen Heizstab-Stufen
        // kommt aus der aktuellen App-Konfiguration. Es werden keine separaten 0-W-Stufen
        // gepflegt; die 0-W-Strategie nutzt denselben Stufenplan wie der Auto-Button.
        const maxStageForZeroBudget = (budgetW) => {
            const budget = Math.max(0, Math.round(num(budgetW, 0)));
            let maxStage = 0;
            for (let s = 1; s <= d.stageCount; s++) {
                const needW = this._sumStagePowerModel(d, s, observedStage, measuredW);
                if (needW <= budget + stageBudgetToleranceW) maxStage = s;
                else break;
            }
            return Math.max(0, Math.min(maxStage, d.stageCount));
        };
        const budgetStageCap = maxStageForZeroBudget(zeroPotentialW);
        if (targetStage > budgetStageCap) {
            targetStage = budgetStageCap;
            reason = 'zero_export_budget_stage_cap';
        }

        if (importActive) {
            if (!st.zeroImportSinceMs) st.zeroImportSinceMs = now;
        } else {
            st.zeroImportSinceMs = 0;
        }
        if (dischargeActive) {
            if (!st.zeroDischargeSinceMs) st.zeroDischargeSinceMs = now;
        } else {
            st.zeroDischargeSinceMs = 0;
        }

        const importHoldMs = importActive && st.zeroImportSinceMs ? (now - st.zeroImportSinceMs) : 0;
        const dischargeHoldMs = dischargeActive && st.zeroDischargeSinceMs ? (now - st.zeroDischargeSinceMs) : 0;
        hardOff = hardImport || hardDischarge;
        reduceNow = hardOff
            || (importActive && importHoldMs >= Math.max(0, cfg.gridImportTripSec * 1000))
            || (dischargeActive && dischargeHoldMs >= Math.max(0, cfg.storageDischargeTripSec * 1000));

        if (reduceNow) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            const lower = hardOff ? 0 : this._previousPhysicalStageBelow(d, reduceBase);
            targetStage = Math.min(targetStage, lower);
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.zeroProbe = null;
            st.targetStage = targetStage;
            reason = hardOff ? 'hard_non_pv_reduce' : (importActive ? 'grid_import_reduce' : 'storage_discharge_reduce');
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: true,
                hardOff,
                reason,
                importHoldMs,
                dischargeHoldMs,
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        // Speicher-Vorrang wird in der 0-W-Betriebsart nicht mehr als harte SoC-Sperre
        // umgesetzt. Speicherreserve und EVCS-Priorität stecken bereits im zentralen Budget;
        // echte Batterieentladung wird weiter unten über den Live-Guard reduziert. Damit kann
        // eine 0-Einspeiseanlage ihr abgeregeltes PV-Potential nutzen, ohne den Akku leerzuziehen.
        if (info && info.active && info.storagePriorityReduce === true && Math.max(currentStage, observedStage, targetStage) > 0) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            targetStage = Math.min(targetStage, this._previousPhysicalStageBelow(d, reduceBase));
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.zeroProbe = null;
            st.targetStage = targetStage;
            reason = 'storage_priority_reduce';
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: true,
                hardOff: false,
                reason,
                importHoldMs,
                dischargeHoldMs,
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        // Ohne Netzpunktmessung fehlt der harte 0-W-Schutz. In dieser Situation
        // hält die 0-W-/Forecast-Betriebsart keine Auto-Stufe fest, sondern reduziert
        // kontrolliert, bis wieder belastbare NVP-Daten vorliegen.
        if (info && info.active && String(info.reason || '') === 'grid_unknown' && Math.max(currentStage, observedStage, targetStage) > 0) {
            const reduceBase = Math.max(currentStage, observedStage, targetStage);
            targetStage = this._previousPhysicalStageBelow(d, reduceBase);
            st.zeroCooldownUntilMs = now + Math.max(0, cfg.cooldownSec * 1000);
            st.zeroLastStepDownMs = now;
            st.lastDecreaseMs = now;
            st.zeroProbe = null;
            st.targetStage = targetStage;
            reason = 'grid_unknown_reduce';
            this._stageCtl.set(d.id, st);
            return {
                targetStage,
                reduceNow: true,
                hardOff: false,
                reason,
                importHoldMs,
                dischargeHoldMs,
                nextAllowedAt: st.zeroCooldownUntilMs || 0,
            };
        }

        const probe = (st.zeroProbe && typeof st.zeroProbe === 'object') ? st.zeroProbe : null;
        if (probe) {
            const probeStage = Math.max(0, Math.min(Math.round(Number(probe.stage) || 0), d.stageCount));
            const probeStillOn = probeStage > 0 && Math.max(currentStage, observedStage, targetStage) >= probeStage;
            if (!probeStillOn) {
                st.zeroProbe = null;
            } else {
                const observeMs = Math.max(0, Math.round(num(cfg.probeObserveSec, 45) * 1000));
                const startMs = Math.max(0, Math.round(num(probe.startMs, now)));
                const elapsedMs = Math.max(0, now - startMs);
                if (observeMs > 0 && elapsedMs < observeMs) {
                    targetStage = Math.max(targetStage, probeStage);
                    st.targetStage = targetStage;
                    reason = 'probe_observing_pv_rise';
                    this._stageCtl.set(d.id, st);
                    return {
                        targetStage: st.targetStage,
                        reduceNow: false,
                        hardOff: false,
                        reason,
                        importHoldMs,
                        dischargeHoldMs,
                        nextAllowedAt: startMs + observeMs,
                    };
                }

                const riseW = Math.max(0, pvNowW - Math.max(0, Math.round(num(probe.basePvW, 0))));
                const addedPowerW = Math.max(0, Math.round(num(probe.addedPowerW, 0)));
                const needRiseW = Math.max(
                    Math.max(0, Math.round(num(cfg.probeMinPvRiseW, 150))),
                    Math.round(addedPowerW * Math.max(0, num(cfg.probeMinPvRisePct, 20)) / 100)
                );

                const probePowerW = this._sumStagePowerModel(d, probeStage, observedStage, measuredW);
                const nvpStable = !!(pvBase && pvBase.gridKnown && num(pvBase.importW, 0) <= cfg.gridImportTripW);
                const storageStable = !!(num(pvBase && pvBase.storageDischargeW, 0) <= cfg.storageDischargeToleranceW);
                const budgetStillOk = probePowerW <= zeroPotentialW + stageBudgetToleranceW;
                const pvRiseOk = riseW + 1 >= needRiseW;
                // Bei Hybrid-/0-Einspeiseanlagen ist ein separater PV-Anstieg nicht immer als
                // eigener DP sichtbar. Die Probe gilt deshalb auch als bestätigt, wenn NVP,
                // Speicherentladung und zentrales Budget nach Ablauf der Beobachtung stabil sind.
                if (!pvRiseOk && !(nvpStable && storageStable && budgetStillOk)) {
                    const reduceBase = Math.max(currentStage, observedStage, targetStage, probeStage);
                    targetStage = this._previousPhysicalStageBelow(d, reduceBase);
                    st.zeroCooldownUntilMs = now + Math.max(0, cfg.probeRetrySec * 1000);
                    st.zeroLastStepDownMs = now;
                    st.lastDecreaseMs = now;
                    st.zeroProbe = null;
                    st.targetStage = targetStage;
                    reason = `probe_pv_rise_failed_${riseW}of${needRiseW}W`;
                    this._stageCtl.set(d.id, st);
                    return {
                        targetStage,
                        reduceNow: true,
                        hardOff: false,
                        reason,
                        importHoldMs,
                        dischargeHoldMs,
                        nextAllowedAt: st.zeroCooldownUntilMs || 0,
                    };
                }

                st.zeroProbe = null;
                reason = pvRiseOk ? `probe_pv_rise_ok_${riseW}of${needRiseW}W` : 'probe_nvp_budget_ok';
                // Nach einer bestätigten Probe erst den bestätigten Zustand halten.
                // Die nächste Stufe wird frühestens im folgenden Tick bewertet, damit
                // Hybrid-/0-W-Anlagen nicht mehrere Relais in einem Rechenschritt ziehen.
                st.targetStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.stageCount));
                this._stageCtl.set(d.id, st);
                return {
                    targetStage: st.targetStage,
                    reduceNow: false,
                    hardOff: false,
                    reason,
                    importHoldMs,
                    dischargeHoldMs,
                    nextAllowedAt: 0,
                };
            }
        }

        const cooldownActive = !!(st.zeroCooldownUntilMs && now < st.zeroCooldownUntilMs);
        const canProbe = !!(info && info.active && info.canProbe && !cooldownActive);

        if (canProbe) {
            const baseStage = Math.max(currentStage, observedStage, targetStage);
            const nextStage = this._nextPhysicalStageAbove(d, baseStage);
            const lastUp = Math.max(num(st.zeroLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
            const stepWaitMs = Math.max(0, cfg.stepUpDelaySec * 1000);
            const nextAllowedByBudget = nextStage > baseStage && nextStage <= budgetStageCap;
            const mayStep = nextAllowedByBudget && (!lastUp || (now - lastUp) >= stepWaitMs);
            if (mayStep) {
                const basePowerW = this._sumStagePowerModel(d, baseStage, observedStage, measuredW);
                const nextPowerW = this._sumStagePowerModel(d, nextStage, observedStage, measuredW);
                targetStage = Math.max(targetStage, nextStage);
                st.zeroLastStepUpMs = now;
                st.zeroProbe = {
                    stage: nextStage,
                    baseStage,
                    basePvW: pvNowW,
                    addedPowerW: Math.max(0, nextPowerW - basePowerW),
                    startMs: now,
                };
                reason = 'probe_step_up_budget_ok';
            } else {
                reason = (nextStage <= baseStage)
                    ? 'max_physical_stage'
                    : (!nextAllowedByBudget ? 'zero_budget_stage_cap' : 'waiting_step_up_delay');
            }
        } else if (cooldownActive) {
            reason = 'cooldown';
        }

        st.targetStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.stageCount));
        this._stageCtl.set(d.id, st);

        return {
            targetStage: st.targetStage,
            reduceNow: false,
            hardOff: false,
            reason,
            importHoldMs,
            dischargeHoldMs,
            nextAllowedAt: st.zeroCooldownUntilMs || 0,
        };
    }

    _deviceOwner(d, manual = false) {
        return manual ? `manual.heatingRod.${d.id}` : `heatingRod.${d.id}`;
    }

    _deviceActuatorIds(d) {
        const ids = [];
        for (let i = 0; i < d.stages.length; i++) {
            const id = this._stageActuatorKey(d.stages[i], i);
            if (id && !String(id).startsWith('stage:') && !ids.includes(id)) ids.push(id);
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

    _contractCfg(d, requireReadback) {
        return {
            requireReadback: requireReadback === true,
            ackTimeoutMs: Math.round(Math.max(250, num(d.readbackTimeoutSec, 5) * 1000)),
            retryDelayMs: Math.round(Math.max(250, num(d.retryDelaySec, 3) * 1000)),
            maxRetries: Math.max(0, Math.round(num(d.maxRetries, 3))),
            faultLockMs: Math.round(Math.max(1000, num(d.faultLockSec, 60) * 1000)),
        };
    }

    async _publishHeatingContract(d, owner, result) {
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.owner`, owner);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.writeAccepted`, !!result.accepted);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.readbackOk`, result.readbackOk === true);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.writePending`, !!result.pending);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.retryCount`, Math.max(0, Math.round(Number(result.retryCount) || 0)));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.faultLocked`, !!result.faultLocked);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.faultUntil`, Math.max(0, Math.round(Number(result.faultUntil) || 0)));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.writeContractStatus`, String(result.status || ''));
    }

    /**
     * Code-Teil: Methode `_writeBoolForce`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        async _writeBoolForce(key, value, force = false, shadowContext = null) {
        if (!(this.dp && key && this.dp.getEntry)) return false;
        const entry = this.dp.getEntry(key);
        if (!entry) return false;
        const execute = async () => {
            if (!force && this.dp.writeBoolean) {
                return this.dp.writeBoolean(key, !!value, false);
            }
            let raw = !!value;
            if (entry.invert) raw = !raw;
            try {
                const writeResult = await this.adapter.setForeignStateAsync(entry.objectId, raw, false);
                if (writeResult && writeResult.__nexowattActuatorAuthorityBlocked === true) return false;
                if (this.dp.lastWriteByObjectId && typeof this.dp.lastWriteByObjectId.set === 'function') {
                    this.dp.lastWriteByObjectId.set(entry.objectId, { val: raw ? 1 : 0, ts: Date.now() });
                }
                return true;
            } catch (err) {
                this.adapter.log.warn(`Heizstab-Datapoint write failed for '${entry.objectId}': ${err?.message || err}`);
                return false;
            }
        };
        return shadowContext ? withActuatorShadowContext(this.adapter, shadowContext, execute) : execute();
    }

    /**
     * Code-Teil: Methode `_applyStageState`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _applyStageState(d, targetStage, feedback, options = {}) {
        if (!d.wiredStages || d.wiredStages < 1) {
            return { applied: false, accepted: false, writeAccepted: false, writePartial: false, status: 'no_stage_write_dp' };
        }

        const zeroExportGrant = options && options.zeroExportGrant;
        const zeroGrantValid = () => !zeroExportGrant || isZeroExportGrantValid(
            this.adapter, `heatingRod:${d.id}`, zeroExportGrant.leaseId, Date.now(),
        );
        // Die Entscheidung kann während asynchroner Status-/Hardwarezugriffe
        // ablaufen. Eine zurückgenommene Prüflast fällt unmittelbar auf AUS;
        // der rekursive Sicherheitsaufruf hat keine Testfreigabe mehr.
        const stopExpiredZeroGrant = () => this._applyStageState(d, 0, feedback, {
            ...options, zeroExportGrant: null, force: true, releaseAuthority: true,
            reason: 'Heizstab zentrale 0-Einspeise-Freigabe abgelaufen',
        });
        if (!zeroGrantValid()) return stopExpiredZeroGrant();

        const requestedStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.wiredStages));
        let effectiveStage = requestedStage;
        const manual = options && options.manual === true;
        const owner = String(options && options.owner || '').trim() || this._deviceOwner(d, manual);
        let reason = String(options && options.reason || `Heizstab Stufe ${effectiveStage}`);
        const requireReadback = d.requireReadback === true && !!(feedback && feedback.anyKnown);
        const contractCfg = this._contractCfg(d, requireReadback);
        const contractKey = `heatingRod:${d.id}`;
        const now = Date.now();
        let safetyDecision = null;
        let safetyForcedStop = false;
        const requestedPowerW = this._sumStagePower(d, requestedStage);
        const contractBefore = this._actuatorContract.result(contractKey, now);
        const trackedStage = Math.max(
            0,
            Math.min(
                Math.round(Number(this._stageCtl.get(d.id)?.targetStage) || 0),
                d.wiredStages,
            ),
        );
        const contractStage = Math.max(
            0,
            Math.min(Math.round(Number(contractBefore && contractBefore.requested) || 0), d.wiredStages),
        );
        const currentStage = feedback && feedback.anyKnown
            ? Math.max(0, Math.min(Math.round(Number(feedback.currentStage) || 0), d.wiredStages))
            : Math.max(trackedStage, contractStage);
        const currentActualW = this._sumStagePower(d, currentStage);
        const safetyProbeW = Math.max(requestedPowerW, currentActualW);
        if (safetyProbeW > 0 && this.adapter && (this.adapter._nwSafetyEnvelopeRequired === true || this.adapter._emsSafetyCycle)) {
            let envelope = null;
            try {
                envelope = liveSafetyEnvelope(this.adapter, this.dp, {
                    now,
                    generation: this.adapter?._emsSafetyCycle?.generation,
                });
            } catch (error) {
                envelope = invalidateSafetyEnvelope(this.adapter, `heating-rod-live-safety-build-failed:${d.id}:${String(error && error.message || error)}`, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    now,
                    emergencyStop: true,
                });
            }
            safetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                key: contractKey,
                app: 'heatingRod',
                deviceKey: d.id,
                requestedW: safetyProbeW,
                currentActualW: feedback && feedback.anyKnown ? currentActualW : 0,
                currentActualFresh: !!(feedback && feedback.anyKnown),
                phaseCount: Math.max(1, Math.min(3, Number(envelope && envelope.phase && envelope.phase.requiredCount) || 3)),
                voltageV: Number(envelope && envelope.phase && envelope.phase.voltageV) || 230,
                deviceCapW: Number.isFinite(Number(d.maxPowerW)) && Number(d.maxPowerW) > 0 ? Number(d.maxPowerW) : requestedPowerW,
                now,
            });
            const allowedW = Math.max(0, Math.floor(Number(safetyDecision.allowedW) || 0));
            effectiveStage = 0;
            if (requestedStage > 0) {
                for (let stage = 1; stage <= requestedStage; stage++) {
                    if (this._sumStagePower(d, stage) <= allowedW + 1) effectiveStage = stage;
                    else break;
                }
            }
            const effectivePowerW = this._sumStagePower(d, effectiveStage);
            const safetyBlocked = safetyDecision.forceZero === true
                || safetyDecision.blocked === true
                || (requestedStage > 0 && effectiveStage <= 0);
            safetyForcedStop = effectiveStage <= 0 && safetyProbeW > 0 && safetyBlocked;
            safetyDecision = {
                ...safetyDecision,
                allowedW: effectivePowerW,
                blocked: safetyForcedStop,
                clamped: requestedStage > 0 ? effectiveStage < requestedStage : safetyForcedStop,
                forceZero: safetyForcedStop,
                reservation: {
                    targetW: effectivePowerW,
                    deltaW: Math.max(0, effectivePowerW - currentActualW),
                    phaseDeltaW: envelope && envelope.phase && envelope.phase.required === true
                        ? Math.max(0, effectivePowerW - currentActualW)
                        : 0,
                    app: 'heatingRod',
                },
            };
            if (safetyDecision.clamped) reason = `${reason} | ${String(safetyDecision.reason || 'Safety begrenzt')}`;
        }
        const forceAllWrites = !!(options && options.force) || safetyForcedStop;
        if (forceAllWrites) this._actuatorContract.release(contractKey);
        if (!forceAllWrites && feedback && feedback.anyKnown && Number(feedback.currentStage) === effectiveStage) {
            const confirmed = this._actuatorContract.confirmFromReadback(contractKey, effectiveStage, feedback.currentStage, true, now);
            if (confirmed) {
                await this._publishHeatingContract(d, owner, confirmed);
                if (!zeroGrantValid()) return stopExpiredZeroGrant();
                if (safetyDecision) commitFlexibleLoadDecision(this.adapter, safetyDecision, true);
                return { applied: true, accepted: true, writeAccepted: false, writePartial: false, status: confirmed.status, targetStage: effectiveStage, readbackOk: true, contract: confirmed, safetyDecision };
            }
        }
        const decision = this._actuatorContract.prepare(contractKey, effectiveStage, now, contractCfg);
        if (!decision.allowed) {
            const current = this._actuatorContract.result(contractKey, now, decision.targetChanged);
            await this._publishHeatingContract(d, owner, current);
            if (!zeroGrantValid()) return stopExpiredZeroGrant();
            return { applied: false, accepted: false, writeAccepted: false, writePartial: false, status: current.status, targetStage: effectiveStage, readbackOk: current.readbackOk, contract: current };
        }
        let anyTrue = false;
        let anyFalse = false;
        const shadowContext = {
            owner,
            module: 'heatingRodControl',
            priority: priorityForOwner(owner),
            reason,
            leaseMs: Number.isFinite(Number(options && options.leaseMs))
                ? Math.max(0, Number(options.leaseMs))
                : (manual ? 5 * 60 * 1000 : 20000),
            kind: String(options && options.kind || (manual ? 'manual-heating-rod' : 'heating-rod-control')),
            enforceAuthority: options && options.enforceAuthority === true
                ? true
                : this._deviceHasExclusiveAuthority(d, owner),
            releaseAuthority: safetyForcedStop || (options && options.releaseAuthority !== undefined
                ? options.releaseAuthority === true
                : effectiveStage <= 0),
        };

        // One KNX/relay object may be reused in more than one virtual stage. Writing every row in
        // sequence would otherwise send ON and then OFF to the same datapoint in a single tick.
        // Coalesce by writeKey and write the OR-result exactly once.
        const grouped = new Map();
        for (let i = 0; i < d.stages.length; i++) {
            const stage = d.stages[i];
            if (!stage.writeKey) continue;
            const writeKey = String(stage.writeKey).trim();
            if (!writeKey) continue;
            const actuatorKey = this._stageActuatorKey(stage, i);
            const shouldOn = i < effectiveStage;
            const observed = Array.isArray(feedback && feedback.states) ? feedback.states[i] : null;
            const g = grouped.get(actuatorKey) || { writeKey, shouldOn: false, observedKnown: false, observed: null };
            g.writeKey = g.writeKey || writeKey;
            g.shouldOn = g.shouldOn || shouldOn;
            if (observed !== null && observed !== undefined) {
                g.observedKnown = true;
                // For duplicated rows the read value should be identical. If not, prefer true so
                // an OFF target is still forced, while an ON target is not suppressed accidentally.
                g.observed = (g.observed === true || observed === true) ? true : !!observed;
            }
            grouped.set(actuatorKey, g);
        }

        for (const g of grouped.values()) {
            // Vor jedem einzelnen Relais prüfen, auch nach einem vorigen await.
            // Bei Widerruf werden bereits geschaltete Stufen ebenfalls AUS gesetzt.
            if (!zeroGrantValid()) return stopExpiredZeroGrant();
            const force = forceAllWrites || (!!g.observedKnown && g.observed !== g.shouldOn);
            const res = await this._writeBoolForce(g.writeKey, g.shouldOn, force, shadowContext);
            if (res === true) anyTrue = true;
            if (res === false) anyFalse = true;
        }
        if (!zeroGrantValid()) return stopExpiredZeroGrant();

        let status = 'unchanged';
        if (anyFalse && anyTrue) status = 'applied_partial';
        else if (anyFalse) status = 'write_failed';
        else if (anyTrue) status = 'applied';

        const accepted = !anyFalse;
        const feedbackAfter = this._readStageFeedback(d, null);
        const readbackOk = feedbackAfter && feedbackAfter.anyKnown ? Number(feedbackAfter.currentStage) === effectiveStage : null;
        const contract = this._actuatorContract.complete(contractKey, effectiveStage, accepted, readbackOk, feedbackAfter && feedbackAfter.currentStage, Date.now(), contractCfg);
        await this._publishHeatingContract(d, owner, contract);
        if (safetyDecision) commitFlexibleLoadDecision(this.adapter, safetyDecision, accepted || contract.confirmed === true);
        if ((safetyDecision || safetyForcedStop) && !(accepted || contract.confirmed === true) && (requestedStage > 0 || safetyForcedStop)) {
            invalidateSafetyEnvelope(this.adapter, `heating-rod-write-not-confirmed:${d.id}:${String(contract.status || status || 'unknown')}`, {
                generation: this.adapter?._emsSafetyCycle?.generation,
                now: Date.now(),
                emergencyStop: true,
            });
            try { this.adapter?._nwRequestImmediateEmsTick?.(`safety:heating-rod-write:${d.id}`, 0); } catch (_tickError) {}
        }
        return { applied: contract.confirmed, accepted, writeAccepted: anyTrue, writePartial: anyTrue && anyFalse, status: contract.status || status, targetStage: effectiveStage, readbackOk, contract, safetyDecision, safetyForcedStop };
    }

    _recordAcceptedHeatingEffect(d, result, baselineW, targetW, reason) {
        if (!result || result.writeAccepted !== true) return;
        if (result.writePartial === true) {
            recordAcceptedActuatorTransition(this.adapter, {
                key: `heatingRod:${d.id}`,
                accepted: true,
                kind: 'load',
                source: 'heatingRodControl',
                reason: `${String(reason || result.status || '')}:partial`,
            });
            return;
        }
        const baseline = (typeof baselineW === 'number' && Number.isFinite(baselineW))
            ? Math.max(0, baselineW)
            : null;
        recordAcceptedPowerTarget(this.adapter, {
            key: `heatingRod:${d.id}`,
            targetW: Math.max(0, Math.round(Number(targetW) || 0)),
            baselineW: baseline,
            accepted: true,
            uncertain: baseline === null,
            kind: 'load',
            source: 'heatingRodControl',
            reason: String(reason || result.status || ''),
        });
    }

    /**
     * Code-Teil: Methode `_getOverrides`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getOverrides() {
        return (this.adapter && this.adapter._heatingRodOverrides && typeof this.adapter._heatingRodOverrides === 'object')
            ? this.adapter._heatingRodOverrides
            : {};
    }
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
        const boostActive = boostUntil > 0 && now < boostUntil;
        return { boostUntil, boostActive };
    }

    /**
     * Code-Teil: Methode `_setStageCtlTarget`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setStageCtlTarget
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _setStageCtlTarget(id, targetStage, observedStage = null) {
        const st = this._stageCtl.get(id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const prev = Math.max(0, Math.round(Number(observedStage !== null && observedStage !== undefined ? observedStage : st.targetStage) || 0));
        const next = Math.max(0, Math.round(Number(targetStage) || 0));
        const now = nowMs();
        if (next > prev) st.lastIncreaseMs = now;
        else if (next < prev) st.lastDecreaseMs = now;
        st.targetStage = next;
        this._stageCtl.set(id, st);
        return st;
    }

    /**
     * Code-Teil: Methode `_markAutoOwnership`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * In-Memory-Nachweis für die zentrale PV-Rekonstruktion, keine Hardwarewirkung.
     * Nur frische EOS-eigene PV-Auto-Last darf als flexible Last zurückgerechnet
     * werden; Handbetrieb bleibt Hauslast. BOOST besitzt ebenfalls Schreibrechte,
     * deshalb prüft der Core zusätzlich den effektiven Modus `pvAuto`.
     */
    _publishZeroExportOwnership(d, owned, source = '', now = nowMs()) {
        if (!this.adapter || !d || !d.id) return;
        if (!this.adapter._zeroExportPvOwnedHeatingRod) this.adapter._zeroExportPvOwnedHeatingRod = Object.create(null);
        this.adapter._zeroExportPvOwnedHeatingRod[d.id] = { owned: owned === true, ts: now, source: String(source || '') };
    }

        _markAutoOwnership(d, owned, targetStage = 0, source = '') {
        if (!d || !d.id) return null;
        const st = this._stageCtl.get(d.id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
        const stage = Math.max(0, Math.round(Number(targetStage) || 0));
        const now = nowMs();
        st.autoOwned = !!(owned && stage > 0);
        st.autoOwnedStage = st.autoOwned ? stage : 0;
        st.autoOwnedSource = st.autoOwned ? String(source || 'pvAuto') : '';
        st.autoLastWriteMs = now;
        if (st.autoOwned && !st.autoOwnedSinceMs) st.autoOwnedSinceMs = now;
        if (!st.autoOwned) st.autoOwnedSinceMs = 0;
        this._stageCtl.set(d.id, st);
        this._publishZeroExportOwnership(d, st.autoOwned, st.autoOwnedSource, now);
        return st;
    }

    /**
     * Code-Teil: Methode `_getAutoOwnership`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _getAutoOwnership(d, observedStage = 0, measuredW = null, feedback = null) {
        const st = (d && d.id && this._stageCtl && this._stageCtl.get) ? (this._stageCtl.get(d.id) || {}) : {};
        const target = Math.max(0, Math.round(Number(st.targetStage) || 0));
        const obs = Math.max(0, Math.round(Number(observedStage) || 0));
        const measured = (typeof measuredW === 'number' && Number.isFinite(measuredW)) ? Math.max(0, measuredW) : 0;
        const applied = Math.max(0, Number(feedback && feedback.appliedPowerW) || 0);
        const loadPresent = obs > 0 || measured > 50 || applied > 50;
        const autoOwned = !!(st.autoOwned && target > 0 && loadPresent);
        const externalManual = !!(loadPresent && (!autoOwned || (obs > 0 && target > 0 && obs > target)));
        this._publishZeroExportOwnership(d, autoOwned && !externalManual, st.autoOwnedSource);
        return { st, target, observedStage: obs, loadPresent, autoOwned, externalManual };
    }

    /**
     * Code-Teil: Methode `_readOwnStateValue`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _readOwnStateValue
     * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _readOwnStateValue(id, fallback = null) {
        try {
            const st = await this.adapter.getStateAsync(String(id));
            if (!st || st.val === null || st.val === undefined) return fallback;
            return st.val;
        } catch (_e) {
            return fallback;
        }
    }

    /**
     * Code-Teil: Methode `_restoreAutoOwnershipIfLikely`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        async _restoreAutoOwnershipIfLikely(d, pvAutomationActive, observedStage = 0, measuredW = null, feedback = null) {
        if (!d || !d.id || !pvAutomationActive) return false;
        const own = this._getAutoOwnership(d, observedStage, measuredW, feedback);
        if (own.autoOwned) return true;
        if (!own.loadPresent || own.observedStage <= 0) return false;

        // After adapter restart/update the in-memory ownership is empty, although
        // the KNX/relay stage may still be the EMS PV-Auto stage from before.
        // Restore only with strong evidence from persisted own states. Manual/external
        // KNX switching remains protected and is never adopted just because Auto(PV) is selected.
        const prefix = `heatingRod.devices.${d.id}`;
        const lastTargetRaw = await this._readOwnStateValue(`${prefix}.targetStage`, null);
        const lastStatus = String(await this._readOwnStateValue(`${prefix}.status`, '') || '').toLowerCase();
        const lastOverride = String(await this._readOwnStateValue(`${prefix}.override`, '') || '').toLowerCase();
        const lastTarget = Math.max(0, Math.round(Number(lastTargetRaw) || 0));

        const manualEvidence = /^manual/.test(lastStatus)
            || lastStatus.includes('external_manual')
            || lastStatus.includes('manual_allowed')
            || lastStatus.includes('manual_cfg')
            || lastStatus.startsWith('off_')
            || lastOverride.includes('manual');
        if (manualEvidence) return false;

        const autoEvidence = lastStatus.includes('pv_auto')
            || lastStatus.includes('budget')
            || lastStatus.includes('step_up')
            || lastStatus.includes('gate_')
            || lastStatus.includes('zero_')
            || lastStatus.includes('storage_protect')
            || lastStatus.includes('pv_only_protect')
            || lastOverride === 'boost';
        if (!autoEvidence || lastTarget <= 0) return false;
        if (own.observedStage > lastTarget) return false;

        this._setStageCtlTarget(d.id, lastTarget, own.observedStage);
        this._markAutoOwnership(d, true, lastTarget, 'pvAuto_restore');
        return true;
    }

    /**
     * Code-Teil: Methode `_observeManualExternal`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        async _observeManualExternal(d, observedStage, measuredW, feedback, status = 'external_manual_knx_observed') {
        const usedW = this._resolveObservedPowerW(
            d,
            measuredW,
            feedback,
            this._sumStagePower(d, observedStage),
        );
        this._setStageCtlTarget(d.id, observedStage, observedStage);
        this._markAutoOwnership(d, false, observedStage, 'external_manual');
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, status);
        await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_external');
        return Math.round(usedW);
    }

    /**
     * Code-Teil: Methode `_computeQuickManualStage`
     * Zweck: berechnet abgeleitete Werte; Änderungen können Energiefluss/History/Regelungen beeinflussen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
        _computeQuickManualStage(d, userMode) {
        const m = normalizeUserMode(userMode);
        if (m === 'manual1') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 1));
        if (m === 'manual2') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 2));
        if (m === 'manual3') return Math.min(d.wiredStages || d.stageCount, quickManualLevelToStageCount(d.stageCount, 3));
        return 0;
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    
    /**
     * Code-Teil: _buildHeatingRodTsRuntimeSample
     *
     * Zweck:
     * Baut aus dem aktuellen Heizstab-Produktivstatus ein kleines Diagnose-Sample.
     *
     * Zusammenhang:
     * 0.7.109 beobachtet auf echter Anlage, ob der Heizstab wirklich durch TypeScript
     * geführt wird oder ob JavaScript-Fallbacks auftreten. Die Samples sind die Basis
     * für `heatingRod.summary.tsRuntimeEvaluationJson`.
     *
     * Wichtig:
     * Das Sample verändert keine Zielstufe und schreibt keine Stufen-DPs. Es beschreibt
     * nur, was die produktive Runtime ohnehin entschieden hat.
     */
    _buildHeatingRodTsRuntimeSample(productive) {
        const entries = Array.isArray(productive && productive.entries) ? productive.entries : [];
        const fallbackReasons = Array.isArray(productive && productive.fallbackReasons)
            ? productive.fallbackReasons.map(r => String(r || '')).filter(Boolean)
            : [];
        const activeCount = entries.filter(e => e && e.active).length;
        const fallbackCount = entries.filter(e => e && e.fallback).length;
        // 0.7.112: blockierende Mismatches und alte JS-Referenzdiagnose werden getrennt.
        const mismatchCount = entries.reduce((sum, e) => sum + (Array.isArray(e && e.mismatches) ? e.mismatches.length : 0), 0);
        const jsReferenceMismatchCount = entries.reduce((sum, e) => sum + (Array.isArray(e && e.referenceMismatches) ? e.referenceMismatches.length : 0), 0);
        const jsReferenceBlockingCount = entries.filter(e => e && e.jsReferenceBlocking).length;
        const normalPathTakenOverCount = entries.filter(e => e && e.normalPathTakenOver).length;
        const legacyJsPathReducedCount = entries.filter(e => e && e.legacyJsPathReduced).length;
        const jsReferenceReducedCount = entries.filter(e => e && e.jsReferenceReduced).length;
        const hardFallbackOnlyCount = entries.filter(e => e && e.hardFallbackOnly).length;
        const emergencyFallbackCount = entries.filter(e => e && e.emergencyFallback).length;
        const hardSafetyBlockCount = entries.filter(e => e && e.hardSafetyBlock).length;
        const hasRuntimeError = fallbackReasons.some(r => /error|exception|runtime/i.test(r));
        const ok = entries.length > 0 && activeCount > 0 && hardSafetyBlockCount === 0 && emergencyFallbackCount === 0 && jsReferenceBlockingCount === 0 && !hasRuntimeError;
        return {
            ts: Date.now(),
            source: 'heating-rod-ts-runtime-sample-v1',
            ok,
            active: !!(productive && productive.active),
            productive: !!(productive && productive.productive),
            fallback: !!(productive && productive.fallback),
            activeCount,
            fallbackCount,
            mismatchCount,
            blockingMismatchCount: mismatchCount,
            jsReferenceMismatchCount,
            jsReferenceBlockingCount,
            normalPathActiveCount: entries.filter(e => e && e.source === 'ts-heating-rod-normal').length,
            normalPathTakenOverCount,
            legacyJsPathReducedCount,
            jsReferenceReducedCount,
            hardFallbackOnlyCount,
            emergencyFallbackCount,
            hardSafetyBlockCount,
            softFallbackCount: fallbackReasons.filter(r => !this._isHeatingRodHardFallbackReason(r)).length,
            deviceCount: entries.length,
            fallbackReasons,
            jsFallbackMode: normalPathTakenOverCount > 0 ? 'hard-blockers-only' : 'normal-safety-fallback',
            jsPathReductionStage: normalPathTakenOverCount > 0 ? 'notfallback-only' : 'candidate-monitoring',
            jsReferenceDecisionMode: normalPathTakenOverCount > 0 ? 'diagnostic-only' : 'blocking-until-normal-ready',
            hardFallback: hardSafetyBlockCount > 0 || fallbackReasons.some(r => this._isHeatingRodHardFallbackReason(r)),
        };
    }

    /**
     * Code-Teil: _summarizeHeatingRodTsRuntimeSamples
     *
     * Zweck:
     * Verdichtet die letzten Heizstab-TS-Samples zu einem lesbaren Status für App-Center
     * und Diagnose-States.
     *
     * Zusammenhang:
     * Der nächste Migrationsteil soll den alten JS-Heizstabpfad reduzieren. Dafür müssen
     * wir wissen, ob TypeScript auf echter Anlage stabil aktiv war oder ob Fallbacks
     * auftreten.
     */
    _summarizeHeatingRodTsRuntimeSamples(samples) {
        const list = Array.isArray(samples) ? samples.slice(-60) : [];
        const sampleCount = list.length;
        const okCount = list.filter(s => s && s.ok).length;
        const activeCount = list.filter(s => s && s.active).length;
        const fallbackCount = list.filter(s => s && s.fallback).length;
        const hardFallbackCount = list.filter(s => s && s.hardFallback).length;
        const mismatchCount = list.reduce((sum, s) => sum + (Number(s && s.mismatchCount) || 0), 0);
        const blockingMismatchCount = list.reduce((sum, s) => sum + (Number(s && s.blockingMismatchCount) || 0), 0);
        const jsReferenceMismatchCount = list.reduce((sum, s) => sum + (Number(s && s.jsReferenceMismatchCount) || 0), 0);
        const normalPathActiveCount = list.reduce((sum, s) => sum + (Number(s && s.normalPathActiveCount) || 0), 0);
        const normalPathTakenOverCount = list.reduce((sum, s) => sum + (Number(s && s.normalPathTakenOverCount) || 0), 0);
        const legacyJsPathReducedCount = list.reduce((sum, s) => sum + (Number(s && s.legacyJsPathReducedCount) || 0), 0);
        const jsReferenceReducedCount = list.reduce((sum, s) => sum + (Number(s && s.jsReferenceReducedCount) || 0), 0);
        const jsReferenceBlockingCount = list.reduce((sum, s) => sum + (Number(s && s.jsReferenceBlockingCount) || 0), 0);
        const hardFallbackOnlyCount = list.reduce((sum, s) => sum + (Number(s && s.hardFallbackOnlyCount) || 0), 0);
        const emergencyFallbackCount = list.reduce((sum, s) => sum + (Number(s && s.emergencyFallbackCount) || 0), 0);
        const hardSafetyBlockCount = list.reduce((sum, s) => sum + (Number(s && s.hardSafetyBlockCount) || 0), 0);
        let consecutiveOk = 0;
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] && list[i].ok) consecutiveOk++;
            else break;
        }
        let consecutiveFallback = 0;
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] && list[i].fallback) consecutiveFallback++;
            else break;
        }
        const reasons = [];
        for (const s of list) {
            for (const r of (Array.isArray(s && s.fallbackReasons) ? s.fallbackReasons : [])) {
                if (r && !reasons.includes(r)) reasons.push(r);
            }
        }
        const stable = sampleCount >= 5 && consecutiveOk >= 5 && hardFallbackCount === 0 && blockingMismatchCount === 0;
        const status = stable && normalPathTakenOverCount > 0 ? 'ts-normal-hard-fallback-only' : (stable ? 'ts-stable' : (fallbackCount ? 'fallback-observed' : (sampleCount ? 'collecting' : 'waiting')));
        return {
            source: 'heating-rod-ts-runtime-evaluation-v1',
            ts: Date.now(),
            sampleCount,
            okCount,
            activeCount,
            fallbackCount,
            hardFallbackCount,
            mismatchCount,
            blockingMismatchCount,
            jsReferenceMismatchCount,
            normalPathActiveCount,
            normalPathTakenOverCount,
            legacyJsPathReducedCount,
            jsReferenceReducedCount,
            jsReferenceBlockingCount,
            hardFallbackOnlyCount,
            emergencyFallbackCount,
            hardSafetyBlockCount,
            jsFallbackMode: normalPathTakenOverCount > 0 ? 'hard-blockers-only' : 'normal-safety-fallback',
            jsReferenceDecisionMode: normalPathTakenOverCount > 0 ? 'diagnostic-only' : 'blocking-until-normal-ready',
            jsPathReductionStage: normalPathTakenOverCount > 0 ? 'notfallback-only' : 'candidate-monitoring',
            consecutiveOk,
            consecutiveFallback,
            okRatioPct: sampleCount ? Math.round((okCount / sampleCount) * 1000) / 10 : 0,
            stable,
            status,
            fallbackReasons: reasons,
            last: list.length ? list[list.length - 1] : null,
            nextAction: stable && normalPathTakenOverCount > 0
                ? 'Heizstab-TS ist Normalpfad. JavaScript ist nur noch Notfallback bei harten Blockern.'
                : (stable
                    ? 'Heizstab-TS läuft stabil. JS-Fallback kann weiter begrenzt werden.'
                    : (fallbackCount ? 'Fallback-Gründe prüfen, bevor der alte JS-Heizstabpfad weiter reduziert wird.' : 'Weitere Heizstab-TS-Samples sammeln.')),
        };
    }

    /**
     * Code-Teil: _updateHeatingRodTsRuntimeEvaluation
     *
     * Zweck:
     * Hängt das aktuelle Sample in den In-Memory-Puffer und liefert die verdichtete
     * Auswertung zurück.
     *
     * Wichtig:
     * Diese Funktion ist reine Beobachtung. Keine Heizstabstufe und kein Budgetwert wird
     * hier verändert.
     */
    _updateHeatingRodTsRuntimeEvaluation(productive) {
        const sample = this._buildHeatingRodTsRuntimeSample(productive || {});
        const current = Array.isArray(this._heatingRodTsRuntimeSamples) ? this._heatingRodTsRuntimeSamples : [];
        this._heatingRodTsRuntimeSamples = current.concat(sample).slice(-60);
        return this._summarizeHeatingRodTsRuntimeSamples(this._heatingRodTsRuntimeSamples);
    }

    /**
     * Code-Teil: _updateHeatingRodTsNormalSourceState
     *
     * Zweck:
     * Bereitet den TypeScript-Heizstabpfad als normalen Runtime-Pfad vor, sobald
     * mehrere echte Adapter-Ticks stabil über TS liefen.
     *
     * Zusammenhang:
     * 0.7.110 reduziert den alten JavaScript-Fallback weiter. Der Fallback bleibt aber
     * bei harten Fehlern erhalten: fehlender TS-Spiegel, Runtimefehler oder JS/TS-Mismatch.
     * Diese Funktion ändert keine Zielstufe selbst; sie bewertet nur, ob TS als
     * Normalpfad markiert werden darf.
     *
     * Sicherheitsregel:
     * Bei jedem Fallback, Mismatch oder Runtimefehler wird der Normalpfad-Status
     * zurückgesetzt. Erst nach stabilen TS-Ticks wird `ready=true`.
     */
    _updateHeatingRodTsNormalSourceState(productive, evaluation) {
        const now = Date.now();
        const previous = this._heatingRodTsNormalSourceState && typeof this._heatingRodTsNormalSourceState === 'object'
            ? this._heatingRodTsNormalSourceState
            : {};
        const active = !!(productive && productive.active && productive.productive && !productive.fallback);
        const mismatchCount = Number(evaluation && evaluation.mismatchCount) || 0;
        const blockingMismatchCount = Number(evaluation && evaluation.blockingMismatchCount) || 0;
        const jsReferenceMismatchCount = Number(evaluation && evaluation.jsReferenceMismatchCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const fallbackCount = Number(evaluation && evaluation.fallbackCount) || 0;
        const stable = !!(evaluation && evaluation.stable);
        const minTsTicks = 8;
        const emergencyFallback = !active || hardFallbackCount > 0 || blockingMismatchCount > 0;
        const hardFallback = emergencyFallback || (!previous.ready && fallbackCount > 0);
        const consecutiveTsTicks = hardFallback ? 0 : (Math.max(0, Number(previous.consecutiveTsTicks) || 0) + 1);
        const consecutiveJsFallbackTicks = hardFallback ? (Math.max(0, Number(previous.consecutiveJsFallbackTicks) || 0) + 1) : 0;
        const totalTsTicks = Math.max(0, Number(previous.totalTsTicks) || 0) + (active ? 1 : 0);
        const totalJsFallbackTicks = Math.max(0, Number(previous.totalJsFallbackTicks) || 0) + (hardFallback ? 1 : 0);
        const ready = (previous.ready === true && !emergencyFallback) || (stable && consecutiveTsTicks >= minTsTicks && !hardFallback);
        const fallbackReasons = Array.isArray(productive && productive.fallbackReasons) ? productive.fallbackReasons : [];
        const status = ready ? 'ts-normal-ready' : (active ? 'ts-normal-collecting' : 'js-fallback-active');
        const state = {
            source: 'heating-rod-ts-normal-source-v1',
            ts: now,
            ready,
            status,
            active,
            stable,
            minTsTicks,
            consecutiveTsTicks,
            consecutiveJsFallbackTicks,
            totalTsTicks,
            totalJsFallbackTicks,
            fallbackCount,
            hardFallbackCount,
            mismatchCount,
            blockingMismatchCount,
            jsReferenceMismatchCount,
            fallbackReasons,
            normalPathActiveCount: Number(evaluation && evaluation.normalPathActiveCount) || 0,
            normalPathTakenOverCount: Number(evaluation && evaluation.normalPathTakenOverCount) || 0,
            legacyJsPathReducedCount: Number(evaluation && evaluation.legacyJsPathReducedCount) || 0,
            jsReferenceReducedCount: Number(evaluation && evaluation.jsReferenceReducedCount) || 0,
            jsReferenceBlockingCount: Number(evaluation && evaluation.jsReferenceBlockingCount) || 0,
            hardFallbackOnlyCount: Number(evaluation && evaluation.hardFallbackOnlyCount) || 0,
            emergencyFallbackCount: Number(evaluation && evaluation.emergencyFallbackCount) || 0,
            hardSafetyBlockCount: Number(evaluation && evaluation.hardSafetyBlockCount) || 0,
            normalPathTakenOver: ready,
            legacyJsPathRole: ready ? 'emergency-fallback-only' : 'safety-reference',
            legacyJsDecisionMode: ready ? 'not-authoritative' : 'reference-gate',
            jsReferenceDecisionMode: ready ? 'diagnostic-only' : 'blocking-until-normal-ready',
            jsFallbackMode: ready ? 'hard-blockers-only' : 'normal-safety-fallback',
            jsFallbackLimitedToHardBlockers: ready,
            jsPathReductionStage: ready ? 'notfallback-only' : 'candidate-monitoring',
            lastSource: ready ? 'ts-heating-rod-normal' : (active ? 'ts-heating-rod' : 'js-runtime'),
            nextAction: ready
                ? 'Heizstab-TS ist als Normalpfad vorbereitet. JavaScript bleibt nur Notfallback bei harten Blockern.'
                : (active ? 'Weitere stabile TS-Heizstab-Ticks sammeln.' : 'Fallback-Gründe prüfen; TS-Normalpfad noch nicht aktiv.'),
        };
        this._heatingRodTsNormalSourceState = state;
        return state;
    }

    /**
     * Code-Teil: _runHeatingRodTsShadowComparison
     *
     * Zweck:
     * Lässt den TypeScript-Heizstab-Entscheidungsspiegel parallel rechnen und
     * vergleicht die Zielstufe mit der alten JavaScript-Runtime.
     *
     * Zusammenhang:
     * Dieser Vergleich ist die sichere Vorstufe für eine spätere TS-Umstellung der
     * Heizstabentscheidung. In 0.7.77 bleibt die JS-Runtime autoritativ und schreibt
     * weiterhin alle echten Ausgänge/States.
     */
    _runHeatingRodTsShadowComparison(entries) {
        const mirror = requireHeatingRodTsMirror();
        const evaluate = mirror && typeof mirror.evaluateHeatingRodDecision === 'function' ? mirror.evaluateHeatingRodDecision : null;
        if (!evaluate) {
            return {
                available: false,
                ok: false,
                exactMatch: false,
                source: 'missing-ts-mirror',
                entries: [],
                mismatches: [],
                diagnosticMismatches: [],
                blockingMismatchCount: 0,
                diagnosticMismatchCount: 0,
                skippedCount: 0,
            };
        }
        const out = [];
        const allMismatches = [];
        let skippedCount = 0;
        for (const entry of Array.isArray(entries) ? entries : []) {
            try {
                const d = entry.device || {};
                const effectiveMode = normalizeMode(entry.effectiveMode || d.mode || 'pvAuto');
                const zeroExportActive = entry.zeroExportActive === true;
                const jsStatus = String(entry.jsStatus || '').trim().toLowerCase();
                const explicitSkipReason = String(entry.skipReason || '').trim();
                const separateSafetyOrOwnershipPath = /manual|external|para14a_limited|storage_protect|pv_only_protect|zero_export/.test(jsStatus);
                // Der typisierte Entscheidungsspiegel bildet ausschließlich den normalen
                // PV-/Budget-Autopfad ab. Manuelle Stufen, AUS und die 0-W-/Forecast-
                // Strategie besitzen eigene Schreib- und Sicherheitsverträge. Ein Vergleich
                // dieser fachlich unterschiedlichen Pfade wäre kein echter Fehlernachweis.
                if (explicitSkipReason || zeroExportActive || effectiveMode !== 'pvAuto' || separateSafetyOrOwnershipPath || d.enabled === false) {
                    skippedCount += 1;
                    out.push({
                        deviceId: d.id || entry.deviceId || 'unknown',
                        ok: true,
                        exactMatch: true,
                        skipped: true,
                        skipReason: explicitSkipReason
                            || (zeroExportActive
                                ? 'zero-export-forecast-js-strategy'
                                : (effectiveMode !== 'pvAuto'
                                    ? `mode-${effectiveMode}`
                                    : (d.enabled === false ? 'device-disabled' : `separate-path-${jsStatus || 'unknown'}`))),
                        mismatches: [],
                        diagnosticMismatches: [],
                        js: { targetStage: entry.jsTargetStage, targetW: entry.jsTargetW, status: entry.jsStatus || '' },
                        ts: null,
                    });
                    continue;
                }
                const stages = this._buildHeatingRodTsStageModel(
                    d,
                    Math.max(0, Math.round(Number(entry.observedStage) || 0)),
                    Number.isFinite(Number(entry.measuredW)) ? Number(entry.measuredW) : null,
                );
                const input = {
                    ts: Date.now(),
                    device: {
                        id: d.id || entry.deviceId || 'unknown',
                        enabled: !!d.enabled,
                        mode: effectiveMode,
                        allowGridImport: !!(entry.allowGridImport),
                        allowStorageDischarge: !(entry.storageProtectActive),
                        storageReserveSocPct: Number.isFinite(Number(entry.storageReserveSocPct)) ? Number(entry.storageReserveSocPct) : 0,
                        storageReserveW: Math.max(0, Math.round(Number(entry.storageReserveW) || 0)),
                        stages,
                    },
                    availablePvW: Math.max(0, Math.round(Number(entry.availablePvW) || 0)),
                    availableTotalW: Math.max(0, Math.round(Number(entry.availableTotalW) || 0)),
                    storageSocPct: Number.isFinite(Number(entry.storageSocPct)) ? Number(entry.storageSocPct) : null,
                };
                const ts = evaluate(input);
                const diagnosticMismatches = [
                    compareHeatingRodShadowField('targetStage', entry.jsTargetStage, ts && ts.targetStage),
                    compareHeatingRodShadowField('targetPowerW', entry.jsTargetW, ts && ts.targetPowerW),
                ].filter(Boolean);
                const blockingMismatches = diagnosticMismatches.filter(isHeatingRodShadowBlockingMismatch);
                if (diagnosticMismatches.length) {
                    for (const m of diagnosticMismatches) allMismatches.push({ deviceId: input.device.id, ...m });
                }
                out.push({
                    deviceId: input.device.id,
                    ok: blockingMismatches.length === 0,
                    exactMatch: diagnosticMismatches.length === 0,
                    mismatches: blockingMismatches,
                    diagnosticMismatches,
                    js: { targetStage: entry.jsTargetStage, targetW: entry.jsTargetW, status: entry.jsStatus || '' },
                    ts: { targetStage: ts ? ts.targetStage : null, targetW: ts ? ts.targetPowerW : null, reason: ts ? ts.reason : '' },
                });
            } catch (e) {
                const mismatch = { deviceId: entry && entry.deviceId || 'unknown', field: 'exception', js: null, ts: e && e.message ? e.message : String(e) };
                allMismatches.push(mismatch);
                out.push({
                    deviceId: mismatch.deviceId,
                    ok: false,
                    exactMatch: false,
                    mismatches: [mismatch],
                    diagnosticMismatches: [mismatch],
                    js: null,
                    ts: null,
                });
            }
        }
        const blockingMismatches = allMismatches.filter(isHeatingRodShadowBlockingMismatch);
        const result = {
            available: true,
            source: 'ts-mirror-shadow',
            ok: blockingMismatches.length === 0,
            exactMatch: allMismatches.length === 0,
            entries: out,
            mismatches: blockingMismatches,
            diagnosticMismatches: allMismatches,
            blockingMismatchCount: blockingMismatches.length,
            diagnosticMismatchCount: allMismatches.length,
            skippedCount,
        };
        if (blockingMismatches.length) {
            const now = Date.now();
            if (!this._heatingRodTsShadowLastWarnMs || now - this._heatingRodTsShadowLastWarnMs > 60000) {
                this._heatingRodTsShadowLastWarnMs = now;
                try {
                    this.adapter.log && this.adapter.log.warn && this.adapter.log.warn(`[heating-rod-ts-shadow] JS/TS switching mismatch: ${blockingMismatches.map(m => `${m.deviceId}.${m.field}`).join(', ')}`);
                } catch (_eLog) {}
            }
        }
        return result;
    }

    /**
     * Code-Teil: _isHeatingRodTsNormalPathReady
     *
     * Zweck:
     * Prüft, ob der Heizstab-TS-Pfad bereits als Normalpfad vorbereitet wurde.
     *
     * Zusammenhang:
     * 0.7.111 baut den alten JS-Pfad weiter ab. Sobald der TS-Pfad über mehrere
     * echte Adapter-Ticks stabil war, darf eine reine JS/TS-Referenzabweichung den
     * TS-Normalpfad nicht mehr automatisch blockieren. Harte Sicherheitsblocker
     * bleiben aber weiterhin aktiv.
     *
     * Wichtig:
     * Diese Funktion schaltet keine Stufe. Sie liest nur den vorher gesammelten
     * Normalpfad-Status aus `heatingRod.summary.tsNormalSourceJson` bzw. dem
     * internen In-Memory-Status.
     */
    _isHeatingRodTsNormalPathReady() {
        const state = this._heatingRodTsNormalSourceState && typeof this._heatingRodTsNormalSourceState === 'object'
            ? this._heatingRodTsNormalSourceState
            : null;
        return !!(state && state.ready === true && String(state.status || '') === 'ts-normal-ready');
    }

    /**
     * Code-Teil: _isHeatingRodHardFallbackReason
     *
     * Zweck:
     * Klassifiziert, ob ein JS-Fallback im Heizstabpfad ein echter Notfallback ist.
     *
     * Zusammenhang:
     * Ab 0.7.112 wird der alte JavaScript-Heizstabpfad auf harte Notfälle begrenzt.
     * Reine Watt-/Modellabweichungen bleiben Diagnose. Eine abweichende Zielstufe ist
     * dagegen ein echter Schaltkonflikt und bleibt auch im TS-Normalpfad fail-closed.
     */
    _isHeatingRodHardFallbackReason(reason) {
        const r = String(reason || '').toLowerCase();
        if (!r) return false;
        return /missing-ts-mirror|ts-runtime-error|runtime-error|exception|ts-js-stage-mismatch|stage-mismatch|switching-mismatch|storage-protect|pv-protect|safety|protect-blocks|hard-block/i.test(r);
    }

    /**
     * Code-Teil: _getHeatingRodTsFallbackPolicy
     *
     * Zweck:
     * Beschreibt die Rolle des alten JS-Pfads im aktuellen Heizstab-TS-Migrationszustand.
     * Vor dem TS-Normalpfad bleibt JS Referenz; danach ist JS nur noch Notfallback.
     */
    _getHeatingRodTsFallbackPolicy(normalPathReady) {
        const ready = !!normalPathReady;
        return {
            source: 'heating-rod-ts-fallback-policy-v1',
            mode: ready ? 'hard-blockers-only' : 'normal-safety-fallback',
            jsFallbackMode: ready ? 'hard-blockers-only' : 'normal-safety-fallback',
            legacyJsPathRole: ready ? 'emergency-fallback-only' : 'safety-reference',
            jsReferenceMode: ready ? 'diagnostic-only' : 'blocking-reference',
            jsReferenceDecisionMode: ready ? 'diagnostic-only' : 'blocking-until-normal-ready',
            jsReferenceDecisionUsed: !ready,
            legacyJsReferenceMode: ready ? 'diagnostic-cleanup-only' : 'blocking-reference',
            legacyJsReferencePathStage: ready ? 'diagnostic-cleanup' : 'blocking-reference',
            legacyJsReferenceUsedForDecision: !ready,
            legacyJsReferenceCleanupReady: ready,
            hardSafetyFallbackOnly: ready,
            oldJsDecisionReduced: ready,
        };
    }

    /**
     * Code-Teil: _buildHeatingRodLegacyReferenceDiagnostic
     *
     * Zweck:
     * Verschiebt die alte JavaScript-Heizstabreferenz weiter aus dem Entscheidungsweg
     * heraus in eine eigene Diagnose-/Cleanup-Struktur.
     *
     * Zusammenhang:
     * Ab 0.7.113 soll die alte JS-Referenz nicht mehr als normale Entscheidungsbremse
     * auftreten, sobald der TS-Normalpfad stabil ist. Wir behalten die JS-Referenz aber
     * als Diagnose und Notfallvergleich, damit man auf echten Anlagen weiterhin sieht,
     * ob alte und neue Logik auseinanderlaufen.
     *
     * Wichtig:
     * Diese Funktion schaltet keinen Heizstab und schreibt keine Stufe. Sie erstellt nur
     * eine JSON-Diagnose für `heatingRod.summary.tsLegacyReferenceJson`.
     */
    _buildHeatingRodLegacyReferenceDiagnostic(productive, evaluation, normalSource) {
        const entries = Array.isArray(productive && productive.entries) ? productive.entries : [];
        const normalReady = !!(normalSource && normalSource.ready);
        const referenceMismatches = [];
        const blockingReferenceMismatches = [];
        for (const entry of entries) {
            const list = Array.isArray(entry && entry.referenceMismatches) ? entry.referenceMismatches : [];
            for (const mismatch of list) {
                const item = {
                    deviceId: String(entry && (entry.deviceId || entry.id) || 'unknown'),
                    field: String(mismatch && mismatch.field || ''),
                    js: mismatch && Object.prototype.hasOwnProperty.call(mismatch, 'js') ? mismatch.js : null,
                    ts: mismatch && Object.prototype.hasOwnProperty.call(mismatch, 'ts') ? mismatch.ts : null,
                    mode: normalReady ? 'diagnostic-only' : 'blocking-before-normal',
                };
                referenceMismatches.push(item);
                if (!normalReady && entry && entry.jsReferenceBlocking) blockingReferenceMismatches.push(item);
            }
        }
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const fallbackReasons = Array.isArray(evaluation && evaluation.fallbackReasons) ? evaluation.fallbackReasons.map(x => String(x || '')).filter(Boolean) : [];
        const diagnosticOnly = normalReady;
        /**
         * Code-Teil: Legacy-JS-Referenzdiagnose komprimieren
         *
         * Zweck:
         * Sobald der TS-Heizstab-Normalpfad stabil ist, sollen alte JS-Referenzdetails
         * nicht mehr als großer Entscheidungsblock mitlaufen. Wir behalten Zähler und
         * eine kleine Probe, verschieben vollständige Mismatch-Listen aber aus dem
         * normalen Diagnosepfad heraus.
         *
         * Zusammenhang:
         * Das reduziert Doppelpfade und verhindert, dass die alte JS-Referenz weiterhin
         * wie ein gleichwertiger Runtime-Baustein wirkt. Harte Notfallbacks bleiben
         * über `fallbackReasons` und Schutzblocker sichtbar.
         */
        const referenceMismatchSample = diagnosticOnly ? referenceMismatches.slice(0, 2) : referenceMismatches.slice(0, 20);
        const blockingReferenceMismatchSample = diagnosticOnly ? [] : blockingReferenceMismatches.slice(0, 20);
        return {
            source: 'heating-rod-legacy-js-reference-cleanup-v3',
            ts: Date.now(),
            active: entries.length > 0,
            normalPathReady: normalReady,
            diagnosticOnly,
            decisionImpact: diagnosticOnly ? 'none' : 'blocks-until-normal-ready',
            cleanupStage: diagnosticOnly ? 'legacy-reference-pruned-diagnostic-only' : 'legacy-reference-still-safety-gate',
            diagnosticPayloadMode: diagnosticOnly ? 'minimal-counts-and-sample' : 'full-safety-diagnostics',
            legacyReferenceDetailsSuppressed: diagnosticOnly,
            duplicateReferenceDetailsRemoved: diagnosticOnly,
            fullReferenceDetailsRetained: !diagnosticOnly,
            legacyJsPathRole: diagnosticOnly ? 'diagnostic-and-emergency-fallback' : 'safety-reference',
            legacyJsDecisionMode: diagnosticOnly ? 'diagnostic-only' : 'reference-gate',
            jsFallbackMode: diagnosticOnly ? 'hard-blockers-only' : 'normal-safety-fallback',
            jsReferenceDecisionMode: diagnosticOnly ? 'diagnostic-only' : 'blocking-until-normal-ready',
            jsReferenceDecisionUsed: !diagnosticOnly,
            referenceMismatchCount: referenceMismatches.length,
            blockingReferenceMismatchCount: blockingReferenceMismatches.length,
            hardSafetyBlockCount,
            hardFallbackCount,
            fallbackReasons,
            referenceMismatchSample,
            blockingReferenceMismatchSample,
            referenceMismatches: diagnosticOnly ? [] : referenceMismatches.slice(0, 20),
            blockingReferenceMismatches: diagnosticOnly ? [] : blockingReferenceMismatches.slice(0, 20),
            nextAction: diagnosticOnly
                ? 'Alte JS-Referenz ist kompaktiert und nur noch Diagnose/Notfallback. Nächster Schritt: Cleanup-Entfernung vorbereiten.'
                : 'TS-Normalpfad noch nicht bereit; alte JS-Referenz bleibt bis dahin Sicherheitsgate.',
        };
    }

    /**
     * Code-Teil: _buildHeatingRodTsLegacyCleanupState
     *
     * Zweck:
     * Fasst die Restrolle des alten JS-Heizstabpfads in einem separaten Cleanup-Status
     * zusammen. Damit wird sichtbar, wann der JS-Referenzpfad nur noch Diagnose ist.
     */
    _buildHeatingRodTsLegacyCleanupState(productive, evaluation, normalSource, fallbackPolicy, legacyReference) {
        const normalReady = !!(normalSource && normalSource.ready);
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const ready = normalReady && hardSafetyBlockCount === 0 && hardFallbackCount === 0 && blockingReferenceMismatchCount === 0;
        return {
            source: 'heating-rod-ts-legacy-cleanup-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-js-reference-diagnostic-only' : (normalReady ? 'legacy-js-reference-cleanup-pending' : 'legacy-js-reference-active'),
            normalPathReady: normalReady,
            legacyJsReferenceInDecisionPath: !ready,
            legacyJsReferenceMovedToDiagnostics: ready,
            legacyJsReferenceCleanupReady: ready,
            legacyJsReferenceCleanupStage: ready ? 'diagnostics-compact-cleanup' : (normalReady ? 'diagnostic-pending' : 'candidate-monitoring'),
            // Backward-kompatibler Diagnoseanker für ältere Prüfskripte: gleicher Zustand wie diagnostics-compact-cleanup.
            cleanupStageAlias: ready ? 'legacy-reference-compact-diagnostic-only' : (normalReady ? 'diagnostic-pending' : 'candidate-monitoring'),
            legacyReferencePayloadMode: legacyReference && legacyReference.diagnosticPayloadMode || (ready ? 'compact-counts-and-sample' : 'full-safety-diagnostics'),
            legacyReferenceDetailsSuppressed: !!(legacyReference && legacyReference.legacyReferenceDetailsSuppressed),
            cleanupRemovalCandidate: ready && !!(legacyReference && legacyReference.legacyReferenceDetailsSuppressed),
            oldJsReferenceRemovalStage: ready ? 'ready-after-compact-diagnostics' : 'not-ready',
            legacyJsPathRole: ready ? 'diagnostic-emergency-fallback' : 'safety-reference',
            jsDecisionPath: ready ? 'ts-normal-authoritative' : 'js-reference-guarded',
            jsFallbackMode: fallbackPolicy && fallbackPolicy.jsFallbackMode || (ready ? 'hard-blockers-only' : 'normal-safety-fallback'),
            referenceMismatchCount: Number(legacyReference && legacyReference.referenceMismatchCount) || 0,
            blockingReferenceMismatchCount,
            keepJsFor: ready ? ['hard-safety-fallback', 'compact-diagnostic-summary'] : ['safety-reference', 'hard-safety-fallback', 'diagnostic-snapshot'],
            nextAction: ready
                ? 'Die alte JS-Referenz ist kompakt und nur noch Diagnose/Cleanup; TS-Normalpfad bleibt entscheidend.'
                : 'Die alte JS-Referenz wird noch beobachtet, bis der TS-Normalpfad stabil übernommen ist.',
        };
    }

    /**
     * Code-Teil: _buildHeatingRodTsLegacyRemovalPlanState
     *
     * Zweck:
     * Bereitet den späteren Abbau der alten JavaScript-Heizstabreferenz als klaren
     * Entfernungs-/Cleanup-Plan vor. Dieser Schritt entfernt noch keinen JS-Code, trennt
     * aber sauber, welche Teile nur noch Diagnose sind und welche Teile als harte
     * Notfallbremse erhalten bleiben müssen.
     *
     * Zusammenhang:
     * Ab 0.7.115 soll der alte JS-Referenzpfad nicht weiter als unklare zweite
     * Entscheidungswelt mitlaufen. Wenn TS-Normalpfad und Legacy-Cleanup stabil sind,
     * wird JS als Entfernungs-Kandidat markiert: Diagnose ja, Notfallback ja, normale
     * Entscheidung nein.
     *
     * Wichtig:
     * Diese Funktion schreibt keine Zielstufe und löscht keinen Fallback. Sie erzeugt nur
     * die JSON-Diagnose `heatingRod.summary.tsLegacyRemovalPlanJson`.
     */
    _buildHeatingRodTsLegacyRemovalPlanState(productive, evaluation, normalSource, fallbackPolicy, legacyCleanup, legacyReference) {
        const normalReady = !!(normalSource && normalSource.ready);
        const cleanupReady = !!(legacyCleanup && legacyCleanup.ready);
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const readyForRemoval = normalReady && cleanupReady && hardSafetyBlockCount === 0 && hardFallbackCount === 0 && blockingReferenceMismatchCount === 0;
        const diagnosticOnly = !!(legacyReference && legacyReference.decisionImpact === 'none') || cleanupReady;
        return {
            source: 'heating-rod-ts-legacy-removal-plan-v1',
            ts: Date.now(),
            ready: readyForRemoval,
            status: readyForRemoval ? 'legacy-js-reference-removal-prepared' : (normalReady ? 'legacy-js-reference-removal-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            cleanupReady,
            diagnosticOnly,
            decisionImpact: readyForRemoval ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            jsFallbackMode: fallbackPolicy && fallbackPolicy.jsFallbackMode || (readyForRemoval ? 'hard-blockers-only' : 'normal-safety-fallback'),
            legacyJsPathRole: readyForRemoval ? 'emergency-fallback-and-debug-only' : 'safety-reference',
            legacyJsDecisionMode: readyForRemoval ? 'diagnostic-only' : 'reference-gate',
            jsReferenceDecisionUsed: readyForRemoval ? false : !(legacyReference && legacyReference.jsReferenceDecisionUsed === false),
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardSafetyBlockCount,
            hardFallbackCount,
            removableParts: readyForRemoval
                ? ['legacy-js-reference-decision-gate', 'normal-reference-mismatch-blocker', 'duplicate-reference-reason-as-blocker']
                : [],
            keepParts: ['hard-safety-fallback', 'runtime-error-fallback', 'diagnostic-snapshot'],
            removalStage: readyForRemoval ? 'prepared-for-code-cleanup' : 'observe-before-cleanup',
            nextAction: readyForRemoval
                ? 'Alte JS-Referenz kann im nächsten Cleanup-Schritt weiter reduziert werden; harte Notfallbacks bleiben erhalten.'
                : 'Vor Code-Cleanup weiter beobachten: TS-Normalpfad, harte Fallbacks und Blocking-Mismatches müssen stabil sauber sein.',
        };
    }


    /**
     * Code-Teil: _buildHeatingRodTsLegacyDebugBridgeState
     *
     * Zweck:
     * Führt den alten JavaScript-Heizstabpfad nur noch als kompakte Debug-Brücke,
     * sobald der TS-Normalpfad und der Removal-Plan stabil genug sind.
     *
     * Zusammenhang:
     * 0.7.116 soll keine weitere zweite Entscheidungswelt offenhalten. Die alte
     * JS-Referenz bleibt für Fehleranalyse und harte Sicherheitsnotfälle vorhanden,
     * blockiert aber den TS-Normalpfad nicht mehr als normale Referenzbremse.
     *
     * Wichtig:
     * Diese Funktion trifft keine Heizstabentscheidung und schaltet keine Stufe. Sie
     * beschreibt nur die Restrolle des alten JS-Pfads in
     * `heatingRod.summary.tsLegacyDebugBridgeJson`.
     */
    _buildHeatingRodTsLegacyDebugBridgeState(productive, evaluation, normalSource, fallbackPolicy, legacyCleanup, legacyRemovalPlan, legacyReference) {
        const normalReady = !!(normalSource && normalSource.ready);
        const cleanupReady = !!(legacyCleanup && legacyCleanup.ready);
        const removalReady = !!(legacyRemovalPlan && legacyRemovalPlan.ready);
        const diagnosticOnly = !!(legacyReference && legacyReference.decisionImpact === 'none');
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const debugBridgeActive = normalReady && cleanupReady && removalReady && diagnosticOnly && hardSafetyBlockCount === 0;
        const referenceSample = legacyReference && Array.isArray(legacyReference.referenceMismatchSample)
            ? legacyReference.referenceMismatchSample.slice(0, debugBridgeActive ? 2 : 5)
            : [];
        const fallbackReasons = Array.isArray(evaluation && evaluation.fallbackReasons)
            ? evaluation.fallbackReasons.map(x => String(x || '')).filter(Boolean).slice(0, 8)
            : [];
        return {
            source: 'heating-rod-legacy-js-debug-bridge-v1',
            ts: Date.now(),
            ready: debugBridgeActive,
            status: debugBridgeActive ? 'legacy-js-debug-bridge-only' : (normalReady ? 'legacy-js-debug-bridge-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            cleanupReady,
            removalReady,
            diagnosticOnly,
            debugBridgeActive,
            decisionImpact: debugBridgeActive ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            legacyJsPathRole: debugBridgeActive ? 'debug-bridge-and-hard-fallback-only' : (legacyRemovalPlan && legacyRemovalPlan.legacyJsPathRole || 'safety-reference'),
            legacyJsDecisionMode: debugBridgeActive ? 'debug-only' : (legacyRemovalPlan && legacyRemovalPlan.legacyJsDecisionMode || 'reference-gate'),
            jsReferenceDecisionMode: debugBridgeActive ? 'debug-only' : (legacyReference && legacyReference.jsReferenceDecisionMode || 'blocking-until-normal-ready'),
            jsReferenceDecisionUsed: !debugBridgeActive,
            jsFallbackMode: debugBridgeActive ? 'hard-blockers-only' : (fallbackPolicy && fallbackPolicy.jsFallbackMode || 'normal-safety-fallback'),
            fullReferencePayloadAllowed: !debugBridgeActive,
            diagnosticPayloadMode: debugBridgeActive ? 'debug-bridge-compact' : (legacyReference && legacyReference.diagnosticPayloadMode || 'full-safety-diagnostics'),
            debugPayloadSuppressed: debugBridgeActive,
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardSafetyBlockCount,
            hardFallbackCount,
            fallbackReasons,
            referenceMismatchSample: referenceSample,
            debugSummary: {
                referenceMismatchCount,
                blockingReferenceMismatchCount,
                hardSafetyBlockCount,
                hardFallbackCount,
                sample: referenceSample,
            },
            removableNow: debugBridgeActive ? ['legacy-reference-full-mismatch-list', 'legacy-reference-normal-decision-gate'] : [],
            keepForSafety: ['hard-safety-fallback', 'runtime-error-fallback', 'compact-debug-bridge'],
            cleanupStage: debugBridgeActive ? 'debug-bridge-only' : 'prepare-debug-bridge',
            nextAction: debugBridgeActive
                ? 'Alte JS-Referenz ist nur noch Debug-Brücke und harte Notbremse. Nächster Schritt: doppelte Referenzdetails weiter entfernen.'
                : 'TS-Normalpfad und Removal-Plan weiter beobachten, bevor die JS-Referenz zur reinen Debug-Brücke wird.',
        };
    }


    /**
     * Code-Teil: _buildHeatingRodTsLegacyPrunedState
     *
     * Zweck:
     * Verschiebt doppelte Details der alten JS-Heizstabreferenz aus dem normalen
     * Diagnosepfad heraus, sobald der TS-Normalpfad stabil ist und die Debug-Brücke
     * aktiv ist.
     *
     * Zusammenhang:
     * Vor 0.7.117 wurden dieselben JS/TS-Referenzinformationen parallel in mehreren
     * JSONs geführt: `tsLegacyReferenceJson`, `tsLegacyCleanupJson`,
     * `tsLegacyRemovalPlanJson`, `tsLegacyDebugBridgeJson` und Alias
     * `legacyJsReferenceJson`. Diese Funktion reduziert diese Doppelung: Im stabilen
     * TS-Normalpfad bleiben nur Zähler, eine kleine Probe und der Notfallback-Hinweis.
     *
     * Wichtig:
     * Diese Funktion schaltet keine Stufe und entfernt keinen harten Fallback. Sie
     * bereitet nur den Cleanup der alten JS-Referenzdetails vor.
     */
    _buildHeatingRodTsLegacyPrunedState(legacyReference, legacyCleanup, legacyRemovalPlan, legacyDebugBridge, normalSource, evaluation) {
        const normalReady = !!(normalSource && normalSource.ready);
        const debugBridgeActive = !!(legacyDebugBridge && legacyDebugBridge.debugBridgeActive);
        const cleanupReady = !!(legacyCleanup && legacyCleanup.cleanupRemovalCandidate);
        const removalReady = !!(legacyRemovalPlan && legacyRemovalPlan.removalCandidate);
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const referenceSample = Array.isArray(legacyReference && legacyReference.referenceMismatchSample)
            ? legacyReference.referenceMismatchSample.slice(0, debugBridgeActive ? 1 : 3)
            : [];
        const ready = normalReady && debugBridgeActive && cleanupReady && blockingReferenceMismatchCount === 0;
        return {
            source: 'heating-rod-legacy-js-reference-pruned-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-reference-details-pruned' : (normalReady ? 'prune-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            debugBridgeActive,
            cleanupReady,
            removalReady,
            decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            legacyJsPathRole: ready ? 'debug-bridge-and-hard-fallback-only' : (legacyDebugBridge && legacyDebugBridge.legacyJsPathRole || 'safety-reference'),
            jsReferenceDecisionUsed: !ready,
            jsReferenceDecisionMode: ready ? 'debug-only' : (legacyReference && legacyReference.jsReferenceDecisionMode || 'blocking-until-normal-ready'),
            jsFallbackMode: ready ? 'hard-blockers-only' : (legacyDebugBridge && legacyDebugBridge.jsFallbackMode || 'normal-safety-fallback'),
            duplicateReferenceDetailsRemoved: ready,
            fullReferencePayloadRemoved: ready,
            fullReferenceDetailsRetained: !ready,
            fullReferencePayloadAllowed: !ready,
            diagnosticPayloadMode: ready ? 'pruned-counts-only' : (legacyReference && legacyReference.diagnosticPayloadMode || 'full-safety-diagnostics'),
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardSafetyBlockCount,
            hardFallbackCount,
            referenceMismatchSample: referenceSample,
            removedFromNormalPayload: ready
                ? ['referenceMismatches', 'blockingReferenceMismatches', 'full-js-reference-snapshot']
                : [],
            removedFromNormalDebug: ready
                ? ['referenceMismatches', 'blockingReferenceMismatches', 'fullLegacyReferencePayload']
                : [],
            retainedForDebug: ['referenceMismatchCount', 'blockingReferenceMismatchCount', 'referenceMismatchSample', 'hardFallbackCount', 'fallbackReasons'],
            retainedFields: ['referenceMismatchCount', 'blockingReferenceMismatchCount', 'hardFallbackCount', 'hardSafetyBlockCount', 'referenceMismatchSample'],
            compactLegacyReference: {
                source: 'heating-rod-legacy-js-pruned-compact-reference-v1',
                referenceMismatchCount,
                blockingReferenceMismatchCount,
                hardFallbackCount,
                hardSafetyBlockCount,
                decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
                jsReferenceDecisionUsed: !ready,
                payloadMode: ready ? 'pruned-counts-only' : 'compact-pending',
                sample: ready ? referenceSample.slice(0, 1) : [],
            },
            prunedAliasTarget: ready ? 'tsLegacyPrunedJson' : 'tsLegacyReferenceJson',
            cleanupStage: ready ? 'legacy-reference-pruned-debug-bridge' : 'legacy-reference-prune-pending',
            nextAction: ready
                ? 'Doppelte JS-Referenzdetails sind aus dem normalen Heizstab-Diagnosepfad entfernt; JS bleibt nur Notfallback/Debug-Brücke.'
                : 'TS-Normalpfad/Debug-Brücke weiter beobachten, bevor doppelte JS-Referenzdetails vollständig reduziert werden.',
        };
    }


    /**
     * Code-Teil: _buildHeatingRodTsLegacyPrunedDebugState
     *
     * Zweck:
     * Entfernt den alten vollständigen JS-Referenzpayload aus dem normalen Heizstab-
     * Diagnoseweg und ersetzt ihn durch eine kleine, bereinigte Debug-Brücke.
     *
     * Zusammenhang:
     * Ab 0.7.117 ist der TS-Heizstab-Normalpfad die fachliche Hauptquelle. Die alte
     * JavaScript-Referenz darf im Normalfall nicht mehr wie ein zweiter gleichwertiger
     * Entscheidungsbaum mitlaufen. Sie bleibt nur als Notfallback-/Debug-Hinweis.
     *
     * Wichtig:
     * Diese Funktion schaltet keinen Heizstab. Sie reduziert nur Diagnose- und Cleanup-
     * Daten, damit wir die alte JS-Referenz später sauber entfernen können.
     */
    _buildHeatingRodTsLegacyPrunedDebugState(productive, evaluation, normalSource, legacyDebugBridge, legacyReference) {
        const normalReady = !!(normalSource && normalSource.ready);
        const bridgeReady = !!(legacyDebugBridge && legacyDebugBridge.ready);
        const debugBridgeActive = !!(legacyDebugBridge && legacyDebugBridge.debugBridgeActive);
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const referenceSample = legacyReference && Array.isArray(legacyReference.referenceMismatchSample)
            ? legacyReference.referenceMismatchSample.slice(0, 1)
            : [];
        const ready = normalReady && bridgeReady && debugBridgeActive && blockingReferenceMismatchCount === 0 && hardSafetyBlockCount === 0;
        return {
            source: 'heating-rod-legacy-js-pruned-debug-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-js-reference-pruned' : (normalReady ? 'legacy-js-reference-prune-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            debugBridgeReady: bridgeReady,
            debugBridgeActive,
            legacyJsPathRole: ready ? 'pruned-debug-bridge-and-hard-fallback-only' : (legacyDebugBridge && legacyDebugBridge.legacyJsPathRole || 'safety-reference'),
            decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            jsFallbackMode: ready ? 'hard-blockers-only' : (legacyDebugBridge && legacyDebugBridge.jsFallbackMode || 'normal-safety-fallback'),
            pruned: ready,
            fullReferencePayloadRemoved: ready,
            fullReferencePayloadAllowed: !ready,
            duplicateReferenceDiagnosticsReduced: ready,
            diagnosticPayloadMode: ready ? 'pruned-counts-only' : (legacyDebugBridge && legacyDebugBridge.diagnosticPayloadMode || 'full-safety-diagnostics'),
            retainedFields: ['referenceMismatchCount', 'blockingReferenceMismatchCount', 'hardFallbackCount', 'hardSafetyBlockCount', 'referenceMismatchSample'],
            removedFromNormalDebug: ready ? ['referenceMismatches', 'blockingReferenceMismatches', 'fullLegacyReferencePayload'] : [],
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            referenceMismatchSample: ready ? referenceSample : (legacyReference && Array.isArray(legacyReference.referenceMismatchSample) ? legacyReference.referenceMismatchSample.slice(0, 3) : []),
            compactLegacyReference: {
                source: 'heating-rod-legacy-js-pruned-compact-reference-v1',
                referenceMismatchCount,
                blockingReferenceMismatchCount,
                hardFallbackCount,
                hardSafetyBlockCount,
                decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
                jsReferenceDecisionUsed: !ready,
                payloadMode: ready ? 'pruned-counts-only' : 'compact-pending',
                sample: ready ? referenceSample : [],
            },
            nextAction: ready
                ? 'Vollständige JS-Referenzdetails sind aus dem normalen Diagnosepfad entfernt. JS bleibt nur Debug-/Notfallbrücke.'
                : 'Pruning wartet auf stabile TS-Normalquelle und aktive Debug-Brücke.',
        };
    }

    /**
     * Code-Teil: _buildHeatingRodTsLegacyRemovalCandidateState
     *
     * Zweck:
     * Markiert den alten JavaScript-Heizstabpfad als konkreten Entfernungs-Kandidaten,
     * sobald TS-Normalpfad, Debug-Brücke und Pruned-Diagnose stabil sind.
     *
     * Zusammenhang:
     * Die vorherigen Schritte haben die alte JS-Referenz aus dem normalen
     * Entscheidungsweg in Diagnose, Debug-Brücke und Notfallback verschoben. Dieser
     * Status fasst jetzt zusammen, was später wirklich entfernt werden darf und was als
     * harte Sicherheitsnotbremse noch bleiben muss.
     *
     * Wichtig:
     * Diese Funktion löscht keinen Code und trifft keine Heizstabentscheidung. Sie ist
     * ein Cleanup-Vertrag für den nächsten Schritt: TS bleibt Normalpfad, JS bleibt nur
     * Notfallback/Debug-Brücke.
     */
    _buildHeatingRodTsLegacyRemovalCandidateState(legacyReference, legacyCleanup, legacyRemovalPlan, legacyDebugBridge, legacyPruned, normalSource, evaluation) {
        const normalReady = !!(normalSource && normalSource.ready);
        const cleanupReady = !!(legacyCleanup && legacyCleanup.ready);
        const removalReady = !!(legacyRemovalPlan && legacyRemovalPlan.ready);
        const debugBridgeReady = !!(legacyDebugBridge && (legacyDebugBridge.ready || legacyDebugBridge.debugBridgeActive));
        const prunedReady = !!(legacyPruned && legacyPruned.ready);
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const decisionImpact = prunedReady ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate');
        const ready = normalReady && cleanupReady && removalReady && debugBridgeReady && prunedReady && blockingReferenceMismatchCount === 0;
        const compactReference = legacyPruned && legacyPruned.compactLegacyReference
            ? legacyPruned.compactLegacyReference
            : {
                source: 'heating-rod-legacy-js-removal-candidate-compact-reference-v1',
                referenceMismatchCount,
                blockingReferenceMismatchCount,
                hardFallbackCount,
                hardSafetyBlockCount,
                decisionImpact,
                payloadMode: ready ? 'removal-candidate-compact' : 'removal-candidate-pending',
            };
        return {
            source: 'heating-rod-legacy-js-removal-candidate-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-js-path-removal-candidate' : (normalReady ? 'legacy-js-path-removal-candidate-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            cleanupReady,
            removalPlanReady: removalReady,
            debugBridgeReady,
            prunedReady,
            candidateForRemoval: ready,
            cleanupComplete: ready,
            oldJsReferenceRemovalCandidate: ready,
            legacyJsPathRole: ready ? 'emergency-fallback-debug-bridge-only' : 'cleanup-pending',
            legacyJsDecisionMode: ready ? 'no-normal-decision-role' : 'reference-gate-pending',
            decisionImpact: ready ? 'none' : decisionImpact,
            jsReferenceDecisionUsed: !ready,
            jsFallbackMode: ready ? 'hard-blockers-only' : (legacyDebugBridge && legacyDebugBridge.jsFallbackMode || 'normal-safety-fallback'),
            diagnosticPayloadMode: ready ? 'removal-candidate-compact' : (legacyPruned && legacyPruned.diagnosticPayloadMode || 'prune-pending'),
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            compactReference,
            removableParts: ready
                ? [
                    'legacy-reference-normal-decision-gate',
                    'legacy-reference-full-payload-in-normal-diagnostics',
                    'duplicate-js-reference-blocking-mismatch-list',
                    'legacy-js-reference-as-standard-runtime-path',
                ]
                : [],
            keepParts: ['hard-safety-fallback', 'runtime-error-fallback', 'compact-debug-bridge', 'manual-external-safety-guard'],
            removalBlockedBy: ready ? [] : [
                !normalReady ? 'ts-normal-not-ready' : '',
                !cleanupReady ? 'legacy-cleanup-not-ready' : '',
                !removalReady ? 'removal-plan-not-ready' : '',
                !debugBridgeReady ? 'debug-bridge-not-ready' : '',
                !prunedReady ? 'legacy-pruned-not-ready' : '',
                blockingReferenceMismatchCount > 0 ? 'blocking-reference-mismatches' : '',
            ].filter(Boolean),
            nextAction: ready
                ? 'Heizstab-Cleanup ist abgeschlossen: alter JS-Referenzpfad ist Entfernungskandidat. JS bleibt nur Notfallback/Debug-Brücke.'
                : 'Vor Entfernung weiter beobachten: TS-Normalpfad, Debug-Brücke und Pruned-Diagnose müssen bereit sein.',
        };
    }

    /**
     * Code-Teil: _buildHeatingRodTsLegacyFinalCleanupState
     *
     * Zweck:
     * Schließt die normale Heizstab-Diagnose vom alten vollständigen JavaScript-
     * Referenzpfad ab. Wenn TS als Normalpfad stabil ist und der alte JS-Pfad bereits
     * als Entfernungskandidat markiert wurde, bleibt JS nur noch als kompakte Debug-
     * Brücke und harte Notfallreserve sichtbar.
     *
     * Zusammenhang:
     * Vorherige Schritte haben den alten JS-Heizstabpfad in Pruning, Debug-Brücke und
     * Removal-Candidate zerlegt. Diese Funktion bündelt den finalen Diagnosezustand,
     * damit `debugJson` und `legacyJsReferenceJson` nicht mehr die vollständige alte
     * JS-Referenzdiagnose in der normalen Anzeige mitschleppen müssen.
     *
     * Wichtig:
     * Diese Funktion löscht keinen Sicherheitsfallback und schaltet keinen Heizstab.
     * Sie verschiebt nur alte Referenzdetails aus der normalen Diagnose in einen
     * kompakten Cleanup-/Debug-Status.
     */
    _buildHeatingRodTsLegacyFinalCleanupState(legacyReference, legacyPruned, legacyRemovalCandidate, legacyDebugBridge, normalSource, evaluation) {
        const normalReady = !!(normalSource && normalSource.ready);
        const removalReady = !!(legacyRemovalCandidate && legacyRemovalCandidate.ready);
        const prunedReady = !!(legacyPruned && legacyPruned.ready);
        const debugBridgeReady = !!(legacyDebugBridge && (legacyDebugBridge.ready || legacyDebugBridge.debugBridgeActive));
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || Number(legacyRemovalCandidate && legacyRemovalCandidate.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || Number(legacyRemovalCandidate && legacyRemovalCandidate.blockingReferenceMismatchCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || Number(legacyRemovalCandidate && legacyRemovalCandidate.hardFallbackCount) || 0;
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || Number(legacyRemovalCandidate && legacyRemovalCandidate.hardSafetyBlockCount) || 0;
        const sample = legacyRemovalCandidate && legacyRemovalCandidate.compactReference && Array.isArray(legacyRemovalCandidate.compactReference.sample)
            ? legacyRemovalCandidate.compactReference.sample.slice(0, 1)
            : (legacyPruned && legacyPruned.compactLegacyReference && Array.isArray(legacyPruned.compactLegacyReference.sample) ? legacyPruned.compactLegacyReference.sample.slice(0, 1) : []);
        const ready = normalReady && removalReady && prunedReady && debugBridgeReady && blockingReferenceMismatchCount === 0;
        const compactDebugBridge = {
            source: 'heating-rod-legacy-js-final-compact-debug-v1',
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            decisionImpact: ready ? 'none' : (legacyRemovalCandidate && legacyRemovalCandidate.decisionImpact || legacyPruned && legacyPruned.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            payloadMode: ready ? 'final-cleanup-compact-debug' : 'final-cleanup-pending',
            sample,
        };
        return {
            source: 'heating-rod-legacy-js-final-cleanup-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-js-reference-removed-from-normal-diagnostics' : (normalReady ? 'legacy-js-final-cleanup-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            removalCandidateReady: removalReady,
            prunedReady,
            debugBridgeReady,
            decisionImpact: ready ? 'none' : (legacyRemovalCandidate && legacyRemovalCandidate.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            jsReferenceNormalDiagnosticRole: ready ? 'removed-from-normal-diagnostics' : 'still-visible-for-safety',
            legacyJsPathRole: ready ? 'debug-bridge-and-hard-fallback-only' : 'cleanup-pending',
            legacyAliasTarget: ready ? 'tsLegacyFinalCleanupJson.compactDebugBridge' : 'tsLegacyRemovalCandidateJson',
            normalDebugPayloadMode: ready ? 'ts-normal-with-compact-legacy-debug' : 'legacy-reference-visible',
            normalDiagnosticsPayload: ready ? 'ts-normal-with-compact-legacy-debug' : 'legacy-reference-visible',
            normalDiagnosticPayload: ready ? 'ts-normal-no-full-js-reference' : 'ts-normal-with-legacy-reference',
            legacyReferenceRemovedFromNormalDiagnostics: ready,
            fullLegacyReferenceRemovedFromNormalDiagnostics: ready,
            fullLegacyReferenceRemovedFromDebugJson: ready,
            legacyReferenceJsonCompacted: ready,
            legacyReferenceDetailsSuppressed: ready,
            removalFinalized: ready,
            cleanupStage: ready ? 'legacy-reference-normal-diagnostics-removed' : 'legacy-reference-final-cleanup-pending',
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            compactDebugBridge,
            retainedForEmergencyDebug: ['hardFallbackCount', 'hardSafetyBlockCount', 'referenceMismatchCount', 'blockingReferenceMismatchCount', 'compactDebugBridge'],
            removedFromNormalDiagnostics: ready
                ? ['tsLegacyReferenceJson.fullPayload', 'legacyReference.fullPayload', 'referenceMismatches.fullList', 'blockingReferenceMismatches.fullList']
                : [],
            keepParts: ['hard-safety-fallback', 'runtime-error-fallback', 'compact-debug-bridge'],
            nextAction: ready
                ? 'Alte JS-Referenz ist aus der normalen Heizstabdiagnose entfernt. JS bleibt nur kompakte Debug-Brücke und harte Notfallreserve.'
                : 'TS-Normalpfad/Removal-Candidate weiter beobachten, bevor die alte JS-Referenz aus der normalen Diagnose entfernt wird.',
        };
    }



    /**
     * Code-Teil: _buildHeatingRodTsLegacyNormalDiagnosticsState
     *
     * Zweck:
     * Entfernt die alte vollständige JavaScript-Heizstabreferenz aus der normalen
     * Runtime-Diagnose, sobald der TS-Normalpfad stabil und der alte JS-Pfad als
     * Entfernungskandidat markiert ist.
     *
     * Zusammenhang:
     * Die vorherigen Versionen haben den JS-Pfad bereits von „normale Referenz“ zu
     * „Debug-Brücke / harte Notbremse“ verschoben. Diese Funktion schließt den
     * normalen Diagnosepfad ab: In `debugJson` und `legacyJsReferenceJson` landet dann
     * nur noch eine kompakte Zusammenfassung, keine vollständige JS-Entscheidungswelt.
     *
     * Wichtig:
     * Es wird keine Heizstab-Stufe geschaltet und kein Sicherheitsfallback gelöscht.
     * JS bleibt bei harten Blockern verfügbar; nur die normale Diagnose-Doppelung wird
     * final bereinigt.
     */
    _buildHeatingRodTsLegacyNormalDiagnosticsState(legacyRemovalCandidate, legacyPruned, legacyDebugBridge, legacyReference, evaluation) {
        const removalReady = !!(legacyRemovalCandidate && legacyRemovalCandidate.ready);
        const prunedReady = !!(legacyPruned && legacyPruned.ready);
        const debugBridgeReady = !!(legacyDebugBridge && (legacyDebugBridge.ready || legacyDebugBridge.debugBridgeActive));
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const referenceMismatchCount = Number(legacyRemovalCandidate && legacyRemovalCandidate.referenceMismatchCount || legacyPruned && legacyPruned.referenceMismatchCount || legacyReference && legacyReference.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyRemovalCandidate && legacyRemovalCandidate.blockingReferenceMismatchCount || legacyPruned && legacyPruned.blockingReferenceMismatchCount || legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const ready = removalReady && prunedReady && debugBridgeReady && blockingReferenceMismatchCount === 0;
        const sample = legacyRemovalCandidate && legacyRemovalCandidate.compactReference && Array.isArray(legacyRemovalCandidate.compactReference.sample)
            ? legacyRemovalCandidate.compactReference.sample.slice(0, 1)
            : (legacyPruned && legacyPruned.compactLegacyReference && Array.isArray(legacyPruned.compactLegacyReference.sample) ? legacyPruned.compactLegacyReference.sample.slice(0, 1) : []);
        const compactReference = {
            source: 'heating-rod-legacy-js-normal-diagnostics-compact-v1',
            status: ready ? 'legacy-js-reference-normal-diagnostics-removed' : 'legacy-js-reference-normal-diagnostics-pending',
            decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            legacyJsPathRole: ready ? 'debug-bridge-and-hard-fallback-only' : 'cleanup-pending',
            diagnosticPayloadMode: ready ? 'compact-debug-only' : 'full-safety-diagnostics',
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            sample,
        };
        return {
            source: 'heating-rod-legacy-js-normal-diagnostics-cleanup-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'normal-diagnostics-cleaned' : 'normal-diagnostics-cleanup-pending',
            normalDiagnosticsRemoved: ready,
            fullLegacyReferenceRemovedFromDebugJson: ready,
            fullLegacyReferenceRemovedFromAlias: ready,
            legacyReferenceAliasMode: ready ? 'compact-debug-only' : 'compatibility-full-fallback',
            debugJsonLegacyReferenceMode: ready ? 'compact-debug-only' : 'full-reference-allowed',
            decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            jsFallbackMode: ready ? 'hard-blockers-only' : (legacyDebugBridge && legacyDebugBridge.jsFallbackMode || 'normal-safety-fallback'),
            legacyJsPathRole: ready ? 'debug-bridge-and-hard-fallback-only' : 'cleanup-pending',
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardFallbackCount,
            hardSafetyBlockCount,
            compactReference,
            removedFromNormalDiagnostics: ready
                ? ['tsLegacyReferenceJson-full-payload', 'legacyJsReferenceJson-full-payload', 'debugJson.legacyReference-full-payload']
                : [],
            keptForEmergency: ['hard-safety-fallback', 'runtime-error-fallback', 'compact-debug-bridge'],
            cleanupStage: ready ? 'legacy-reference-normal-diagnostics-removed' : 'awaiting-removal-candidate',
            nextAction: ready
                ? 'Heizstab-Cleanup abgeschlossen: alte JS-Referenz ist aus der Normaldiagnose entfernt und bleibt nur als kompakte Debug-/Notfallbrücke.'
                : 'Warten bis Removal-Candidate, Pruned-Diagnose und Debug-Brücke bereit sind.',
        };
    }

    /**
     * Code-Teil: _isHeatingRodTsHardSafetyBlock
     *
     * Zweck:
     * Bewertet, ob eine TS-Heizstabentscheidung trotz Normalpfad-Status aus
     * Sicherheitsgründen blockiert werden muss.
     *
     * Zusammenhang:
     * Der JS-Pfad wird abgebaut, aber nicht als Notbremse entfernt. Wenn Speicher-
     * oder PV-Schutz die JS-Referenz auf 0 W zwingt und TS trotzdem einschalten will,
     * bleibt das ein harter Fallback-Grund.
     */
    _isHeatingRodTsHardSafetyBlock(entry, tsStage) {
        const stage = Math.max(0, Math.round(Number(tsStage) || 0));
        const jsStage = Math.max(0, Math.round(Number(entry && entry.jsTargetStage) || 0));
        const status = String(entry && entry.jsStatus || '');
        const storageProtect = !!(entry && entry.storageProtectActive);
        const pvProtect = /pv_only_protect|storage_protect|zero_export|protect/i.test(status);
        if (stage <= 0) return null;
        if (storageProtect && jsStage <= 0) return 'storage-protect-blocks-ts-normal';
        if (pvProtect && jsStage <= 0) return 'pv-protect-blocks-ts-normal';
        return null;
    }

    /**
     * Code-Teil: _evaluateHeatingRodTsProductiveDecision
     *
     * Zweck:
     * Nutzt den TypeScript-Heizstab-Entscheidungsspiegel als produktive Quelle für
     * die Zielstufe. Vor dem TS-Normalpfad muss der TS-Vorschlag noch mit der bisherigen
     * JS-Referenz übereinstimmen. Sobald der Normalpfad stabil bereit ist, wird TS
     * autoritativ und JS dient nur noch als Referenz-/Notfallback.
     *
     * Zusammenhang:
     * 0.7.111 übernimmt den stabilen TS-Normalpfad weiter: Die bestehende
     * JavaScript-Runtime bleibt als Referenz und Sicherheitsnetz erhalten. Nach stabiler
     * Runtime-Auswertung blockiert eine reine Watt-/Modellabweichung die TS-Zielstufe
     * nicht. Eine abweichende Zielstufe bleibt jedoch immer ein harter Schaltkonflikt.
     *
     * Sicherheitsregel:
     * Bei fehlendem TS-Spiegel, Runtimefehler oder Zielstufenabweichung bleibt der
     * JS-Zielwert autoritativ. Nur `targetPowerW` darf bei identischer Zielstufe als
     * reine Referenzdiagnose gespeichert werden.
     */
    _evaluateHeatingRodTsProductiveDecision(entry) {
        const mirror = requireHeatingRodTsMirror();
        const evaluate = mirror && typeof mirror.evaluateHeatingRodDecision === 'function' ? mirror.evaluateHeatingRodDecision : null;
        const fallback = (reason, extra = {}) => {
            const normalPathReady = !!(extra && extra.normalPathReady) || this._isHeatingRodTsNormalPathReady();
            const hardFallback = !!(extra && extra.hardSafetyBlock) || this._isHeatingRodHardFallbackReason(reason);
            const policy = this._getHeatingRodTsFallbackPolicy(normalPathReady);
            return {
                source: 'js-runtime',
                active: false,
                fallback: true,
                fallbackReason: reason,
                targetStage: Math.max(0, Math.round(Number(entry && entry.jsTargetStage) || 0)),
                targetW: Math.max(0, Math.round(Number(entry && entry.jsTargetW) || 0)),
                ts: null,
                reason: '',
                mismatches: [],
                referenceMismatches: [],
                blockingReferenceMismatches: [],
                diagnosticReferenceMismatches: [],
                input: null,
                normalPathReady,
                normalPathTakenOver: false,
                jsReferenceReduced: false,
                jsReferenceMismatch: false,
                jsReferenceMode: policy.jsReferenceMode,
                jsReferenceDecisionMode: policy.jsReferenceDecisionMode,
                jsReferenceBlocking: !normalPathReady,
                legacyJsReferencePathStage: normalPathReady ? 'diagnostic-cleanup' : 'blocking-reference',
                legacyJsReferenceUsedForDecision: !normalPathReady,
                legacyJsReferenceCleanupReady: !!normalPathReady,
                legacyJsPathReduced: !!normalPathReady,
                legacyJsPathRole: policy.legacyJsPathRole,
                jsFallbackMode: policy.jsFallbackMode,
                emergencyFallback: hardFallback,
                hardFallbackOnly: normalPathReady && hardFallback,
                hardSafetyBlock: hardFallback,
                ...extra,
            };
        };
        // Der TS-Spiegel modelliert den normalen PV-/Budgetpfad. Die 0-W-/Forecast-
        // Strategie arbeitet bewusst mit Probe-Stufen und Live-Netzpunktwächter und
        // bleibt deshalb hier JS-autoritativer Pfad, damit TS den Probe-Zielwert nicht
        // mit einem klassischen Überschussziel überschreibt.
        if (entry && entry.zeroExportActive) {
            return fallback('zero-export-forecast-js-strategy', { zeroExportActive: true });
        }
        if (!evaluate) return fallback('missing-ts-mirror');
        try {
            const d = entry && entry.device || {};
            const stages = this._buildHeatingRodTsStageModel(
                d,
                Math.max(0, Math.round(Number(entry && entry.observedStage) || 0)),
                Number.isFinite(Number(entry && entry.measuredW)) ? Number(entry.measuredW) : null,
            );
            const input = {
                ts: Date.now(),
                device: {
                    id: d.id || entry.deviceId || 'unknown',
                    enabled: !!d.enabled,
                    mode: String(entry.effectiveMode || d.mode || 'pvAuto'),
                    allowGridImport: !!(entry.allowGridImport),
                    allowStorageDischarge: !(entry.storageProtectActive),
                    storageReserveSocPct: Number.isFinite(Number(entry.storageReserveSocPct)) ? Number(entry.storageReserveSocPct) : 0,
                    storageReserveW: Math.max(0, Math.round(Number(entry.storageReserveW) || 0)),
                    stages,
                },
                availablePvW: Math.max(0, Math.round(Number(entry.availablePvW) || 0)),
                availableTotalW: Math.max(0, Math.round(Number(entry.availableTotalW) || 0)),
                storageSocPct: Number.isFinite(Number(entry.storageSocPct)) ? Number(entry.storageSocPct) : null,
            };
            const ts = evaluate(input);
            const tsStage = Math.max(0, Math.round(Number(ts && ts.targetStage) || 0));
            const tsPowerW = Math.max(0, Math.round(Number(ts && ts.targetPowerW) || 0));
            const referenceMismatches = [
                compareHeatingRodShadowField('targetStage', entry.jsTargetStage, ts && ts.targetStage),
                compareHeatingRodShadowField('targetPowerW', entry.jsTargetW, ts && ts.targetPowerW),
            ].filter(Boolean);
            const blockingReferenceMismatches = referenceMismatches.filter(isHeatingRodShadowBlockingMismatch);
            const diagnosticReferenceMismatches = referenceMismatches.filter(mismatch => !isHeatingRodShadowBlockingMismatch(mismatch));
            const normalPathReady = !!(entry && entry.normalPathReady) || this._isHeatingRodTsNormalPathReady();
            const mismatches = blockingReferenceMismatches;
            const policy = this._getHeatingRodTsFallbackPolicy(normalPathReady);
            const hardSafetyBlock = this._isHeatingRodTsHardSafetyBlock(entry, tsStage);
            if (hardSafetyBlock) {
                return fallback(hardSafetyBlock, {
                    input,
                    ts: { targetStage: tsStage, targetW: tsPowerW, reason: ts && ts.reason },
                    mismatches,
                    referenceMismatches,
                    blockingReferenceMismatches,
                    diagnosticReferenceMismatches,
                    normalPathReady,
                    normalPathTakenOver: false,
                    hardSafetyBlock: true,
                    emergencyFallback: true,
                    hardFallbackOnly: normalPathReady,
                    legacyJsPathRole: policy.legacyJsPathRole,
                    jsReferenceMode: policy.jsReferenceMode,
                    jsReferenceDecisionMode: policy.jsReferenceDecisionMode,
                    jsReferenceBlocking: !normalPathReady,
                    legacyJsReferencePathStage: normalPathReady ? 'diagnostic-cleanup' : 'blocking-reference',
                    legacyJsReferenceUsedForDecision: !normalPathReady,
                    legacyJsReferenceCleanupReady: !!normalPathReady,
                    jsReferenceReduced: false,
                });
            }
            if (blockingReferenceMismatches.length) {
                return fallback('ts-js-stage-mismatch', {
                    input,
                    ts: { targetStage: tsStage, targetW: tsPowerW, reason: ts && ts.reason },
                    mismatches,
                    referenceMismatches,
                    blockingReferenceMismatches,
                    diagnosticReferenceMismatches,
                    normalPathReady,
                    jsReferenceMismatch: !!(referenceMismatches.length),
                    jsReferenceMode: 'blocking-reference',
                    jsReferenceDecisionMode: 'blocking-stage-mismatch',
                    jsReferenceBlocking: true,
                    legacyJsReferencePathStage: 'blocking-reference',
                    legacyJsReferenceUsedForDecision: true,
                    legacyJsReferenceCleanupReady: false,
                    legacyJsPathReduced: false,
                    jsReferenceReduced: false,
                    normalPathTakenOver: false,
                    emergencyFallback: true,
                    hardFallbackOnly: normalPathReady,
                    hardSafetyBlock: false,
                });
            }
            return {
                source: normalPathReady ? 'ts-heating-rod-normal' : 'ts-heating-rod',
                active: true,
                fallback: false,
                fallbackReason: '',
                targetStage: tsStage,
                targetW: tsPowerW,
                reason: ts && ts.reason || '',
                input,
                ts,
                mismatches,
                referenceMismatches,
                blockingReferenceMismatches,
                diagnosticReferenceMismatches,
                normalPathReady,
                normalPathTakenOver: !!normalPathReady,
                jsReferenceMismatch: !!(referenceMismatches.length),
                jsReferenceMode: policy.jsReferenceMode,
                jsReferenceDecisionMode: policy.jsReferenceDecisionMode,
                jsReferenceBlocking: false,
                legacyJsReferencePathStage: normalPathReady ? 'diagnostic-cleanup' : 'blocking-reference',
                legacyJsReferenceUsedForDecision: !normalPathReady,
                legacyJsReferenceCleanupReady: !!normalPathReady,
                legacyJsPathReduced: !!normalPathReady,
                legacyJsPathRole: policy.legacyJsPathRole,
                jsFallbackMode: policy.jsFallbackMode,
                jsReferenceReduced: !!(normalPathReady && referenceMismatches.length),
                hardFallbackOnly: false,
                emergencyFallback: false,
                hardSafetyBlock: false,
            };
        } catch (e) {
            return fallback('ts-runtime-error', { error: e && e.message ? e.message : String(e) });
        }
    }

    async tick() {
        if (!this._isEnabled()) return;

        const now = nowMs();
        const centralZeroMode = readZeroExportMode(this.adapter);
        const nightPvAutoLock = resolveHeatingRodNightPvAutoLock(this._getCfg(), now);

        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const preFeedbackById = new Map();
        let currentHeatingRodW = 0;
        let currentAutoHeatingRodW = 0;
        try {
            for (const d of this._devices) {
                const measuredW = this._readMeasuredW(d, staleMs);
                const feedback = this._readStageFeedback(d, staleMs);
                const observedStagePre = feedback && feedback.anyKnown ? feedback.currentStage : (this._stageCtl.get(d.id)?.targetStage || 0);
                const measuredKnown = this._hasMeasuredPowerW(measuredW);
                const feedbackKnown = !!(feedback && feedback.anyKnown);
                let usedW = this._resolveObservedPowerW(d, measuredW, feedback, 0);
                const own = this._getAutoOwnership(d, observedStagePre, measuredW, feedback);
                // Nur wenn weder Leistungs-DP noch Stufen-Readback eine Messung
                // liefern, darf fuer einen EMS-eigenen Aktor das Stufenmodell als
                // Schaetzung dienen. Eine frische 0-W-Messung bleibt 0 W.
                if (!measuredKnown && !feedbackKnown && own.autoOwned && usedW <= 50) {
                    usedW = this._sumStagePowerModel(d, Math.max(0, own.target || observedStagePre), observedStagePre, measuredW);
                }
                currentHeatingRodW += usedW;
                if (own.autoOwned) {
                    // Testbefehle sind noch keine PV-Istleistung. Im Zentralmodus
                    // darf nur ein frischer Leistungs-Messwert zurück ins Budget.
                    const actualW = centralZeroMode.enabled ? this._readZeroExportActualW(d, Math.min(staleMs, 5000)) : usedW;
                    currentAutoHeatingRodW += this._hasMeasuredPowerW(actualW) ? Math.max(0, actualW) : 0;
                }
                preFeedbackById.set(d.id, { measuredW, feedback });
            }
        } catch (_e) {
            currentHeatingRodW = 0;
            currentAutoHeatingRodW = 0;
        }

        // Only add EMS/PV-Auto-owned heating-rod load back into the NVP budget.
        // A KNX/manual stage is an ordinary house load and must not inflate the
        // automatic step-up budget.
        const pvBase = this._computeBasePvAvailableW(currentAutoHeatingRodW);
        const budgetProtection = this._updateBudgetGateProtection(pvBase, now);
        const zeroExportInfo = this._computeZeroExportInfo(pvBase);
        // Diese Betriebsart bestimmt nur die interne Auto-Strategie. Im Kunden-UI bleibt
        // weiterhin genau ein Auto-Button (`pvAuto`) sichtbar.
        const heatingRodAutoMode = centralZeroMode.enabled ? 'zeroExportCentral'
            : normalizeHeatingRodAutoMode(zeroExportInfo && zeroExportInfo.cfg && zeroExportInfo.cfg.autoMode);
        const zeroExportStrategyActive = centralZeroMode.enabled ? centralZeroMode.active
            : heatingRodAutoMode === 'zeroExportForecast' && !!zeroExportInfo.active;
        const minPvAutomationW = this._getPvAutomationMinW();
        const pvNowForAutomationW = this._readPvNowW(staleMs);
        const pvAutomationAllowedByMin = minPvAutomationW <= 0 || pvNowForAutomationW >= minPvAutomationW;
        const thermalUsedW = Math.max(0, num(this.adapter && this.adapter._thermalBudgetUsedW, 0));
        // Wenn pvBase aus der zentralen EMS-Budget-Schicht kommt, ist Thermik mit
        // Priorität 200 dort bereits abgezogen. Dann darf Heizstab Thermik NICHT
        // noch einmal abziehen, sonst startet/steigt PV-Auto trotz freiem Gate nicht.
        const pvBudgetFromCentral = !!(pvBase && pvBase.pvBudgetFromCentral);
        const thermalDeductedW = pvBudgetFromCentral ? 0 : thermalUsedW;
        let remainingW = Math.max(0, num(pvBase.availableW, 0) - thermalDeductedW);
        let remainingTotalW = pvBase.budgetGateRemainingW !== null && Number.isFinite(Number(pvBase.budgetGateRemainingW))
            ? Math.max(0, Number(pvBase.budgetGateRemainingW)) : 0;
        const para14aActive = this._isPara14aActive();
        const para14aCapRaw = para14aActive
            && this.adapter
            && this.adapter._para14a
            && this.adapter._para14a.appCapsW
            ? Number(this.adapter._para14a.appCapsW.heatingRod)
            : null;
        let para14aRemainingW = para14aActive
            ? (Number.isFinite(para14aCapRaw) ? Math.max(0, para14aCapRaw) : 0)
            : Number.POSITIVE_INFINITY;
        const consumeHeatingRodW = (rawW, countsForPara14a = true) => {
            const usedW = Math.max(0, num(rawW, 0));
            remainingW = Math.max(0, remainingW - usedW);
            remainingTotalW = Math.max(0, remainingTotalW - usedW);
            if (para14aActive && countsForPara14a) {
                para14aRemainingW = Math.max(0, para14aRemainingW - usedW);
            }
            return usedW;
        };
        let appliedTotalW = 0;
        // budgetUsedW is intentionally only EMS/PV-Auto-owned heating-rod load.
        // Extern/manual KNX heat is ordinary house load and must not be reserved again
        // in ems.budget, otherwise the central PV budget is double-counted.
        let budgetUsedW = 0;

        // TS-Migration 0.7.108: sammelt produktive Heizstab-TS-Entscheidungen pro Gerät.
        // Die JS-Referenz bleibt Fallback, wenn TS und JS nicht exakt übereinstimmen.
        const heatingRodTsProductiveEntries = [];

        for (const d of this._devices) {
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.slot`, d.slot);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.name`, d.name);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.enabled`, !!d.enabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.mode`, String(d.mode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.consumerType`, String(d.consumerType));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.maxPowerW`, Math.round(num(d.maxPowerW, 0)));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.stageCount`, d.stageCount);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.wiredStages`, d.wiredStages);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.autoMode`, heatingRodAutoMode);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportActive`, !!zeroExportStrategyActive);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportCanProbe`, !!(zeroExportStrategyActive && zeroExportInfo.canProbe));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroExportInfo.reason || ''));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num((this._stageCtl.get(d.id) || {}).zeroCooldownUntilMs, 0)));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.nightWindowActive`, !!nightPvAutoLock.active);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.nightPvAutoBlocked`, false);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.nightManualReleaseAllowed`, !!nightPvAutoLock.active);

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
            userMode = normalizeUserMode(userMode);

            const pre = preFeedbackById.get(d.id) || {};
            const measuredW = (typeof pre.measuredW === 'number' && Number.isFinite(pre.measuredW)) ? pre.measuredW : this._readMeasuredW(d, staleMs);
            if (typeof measuredW === 'number' && Number.isFinite(measuredW)) {
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.measuredW`, Math.round(measuredW));
            }

            const feedback = pre.feedback || this._readStageFeedback(d, staleMs);
            const observedStage = feedback.anyKnown ? feedback.currentStage : (this._stageCtl.get(d.id)?.targetStage || 0);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.currentStage`, observedStage);

            const ov = this._readOverrideForDevice(d, now);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostActive`, !!ov.boostActive);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.boostUntil`, ov.boostUntil ? Math.round(ov.boostUntil) : 0);

            const cfgMode = normalizeMode(d.mode);
            const baseMode = (userMode !== 'inherit') ? userMode : cfgMode;
            const manualStage = this._computeQuickManualStage(d, baseMode);
            const pvModeRequested = (baseMode === 'pvAuto' || baseMode === 'inherit');
            const pvAutomationActive = !!d.enabled && !!userEnabled && pvModeRequested;
            const explicitOff = baseMode === 'off';
            const effectiveMode = ov.boostActive
                ? 'boost'
                : (manualStage > 0
                    ? `manual${Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)))}`
                    : (explicitOff ? 'off' : (pvAutomationActive ? 'pvAuto' : String(baseMode || 'pvAuto'))));
            // d.enabled and userEnabled mean "PV-Auto darf schreiben". They must not block
            // manual customer steps, boost, or an installer/customer doing a manual switch on
            // the native KNX/relay datapoints while PV regulation is disabled.
            const effectiveEnabled = !!(ov.boostActive || manualStage > 0 || pvAutomationActive);

            // Eine Testfreigabe endet sofort beim Wechsel zu Handbetrieb, AUS,
            // Nachtblock oder fehlender Verdrahtung. Der Coordinator schreibt nie
            // selbst auf Relais; die bestehenden Geräte-/Schutzpfade bleiben zuständig.
            if (centralZeroMode.enabled && (effectiveMode !== 'pvAuto' || !pvAutomationActive
                || nightPvAutoLock.active || d.consumerType !== 'heatingRod' || d.wiredStages < 1)) {
                requestZeroExportProbe(this.adapter, { key: `heatingRod:${d.id}`, now, eligible: false });
            }

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveMode`, String(effectiveMode));
            const strategyAliases = [
                `heatingRod:${Math.max(1, Number(d.configIndex || 0) + 1)}`,
                `heatingRod:${String(d.id || '')}`,
            ];
            const strategyOverlay = resolveHeatingRodStrategyOverlay(this.adapter, strategyAliases, { now, effectiveMode });
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyEligible`, strategyOverlay.eligible === true);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyActive`, strategyOverlay.active === true);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyFallbackActive`, strategyOverlay.fallbackPause === true);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyAction`, String(strategyOverlay.action || 'standard'));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyMaxPowerW`, Number.isFinite(Number(strategyOverlay.maxPowerW)) ? Math.max(0, Math.round(Number(strategyOverlay.maxPowerW))) : null);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyReason`, String(strategyOverlay.reason || ''));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.strategyExpiresAt`, Math.max(0, Math.round(Number(strategyOverlay.request && strategyOverlay.request.expiresAt) || 0)));

            if (d.consumerType !== 'heatingRod') {
                this._para14aHeldStages.delete(String(d.id));
                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'slot_type_mismatch');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Temporary boost: always full configured/wired power for the configured duration.
            if (ov.boostActive) {
                this._para14aHeldStages.delete(String(d.id));
                const fullStage = Math.max(0, Math.min(d.wiredStages || d.stageCount, d.stageCount));
                const para14aMaxStage = para14aActive && d.enabled === true
                    ? this._maxStageForPara14aBudget(d, para14aRemainingW, observedStage, measuredW)
                    : fullStage;
                const desiredStage = Math.min(fullStage, para14aMaxStage);
                const para14aLimited = desiredStage < fullStage;
                const res = await this._applyStageState(
                    d,
                    desiredStage,
                    feedback,
                    para14aActive && d.enabled === true
                        ? this._para14aOptions(d, {
                            force: true,
                            releaseAuthority: false,
                            reason: para14aLimited ? 'Heizstab Boost durch §14a begrenzt' : 'Heizstab Boost unter §14a',
                        })
                        : { force: true, manual: true, reason: 'Heizstab Boost' },
                );
                const requestedStage = Math.max(0, Math.min(num(res.targetStage, desiredStage), d.wiredStages || d.stageCount));
                const appliedStage = res.accepted ? requestedStage : observedStage;
                if (res.accepted) this._setStageCtlTarget(d.id, requestedStage, observedStage);
                this._markAutoOwnership(d, res.accepted && requestedStage > 0, appliedStage, 'boost');
                const targetW = this._sumStagePower(d, requestedStage);
                const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW || this._sumStagePower(d, observedStage));
                this._recordAcceptedHeatingEffect(d, res, baselineW, targetW, 'Heizstab Boost');
                const observedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                const usedW = consumeHeatingRodW(Math.max(observedW, res.accepted ? targetW : 0), d.enabled === true);

                appliedTotalW += Math.round(res.accepted ? targetW : this._sumStagePower(d, appliedStage));
                budgetUsedW += Math.round(usedW);

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, requestedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `${para14aLimited ? 'para14a_limited_boost' : 'boost'}_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'boost');
                continue;
            }

            // Manual customer steps (1/2/3) bypass the PV automatik, but still use native stage writes.
            if (manualStage > 0) {
                this._para14aHeldStages.delete(String(d.id));
                const para14aMaxStage = para14aActive && d.enabled === true
                    ? this._maxStageForPara14aBudget(d, para14aRemainingW, observedStage, measuredW)
                    : manualStage;
                const desiredStage = Math.min(manualStage, para14aMaxStage);
                const para14aLimited = desiredStage < manualStage;
                const res = await this._applyStageState(
                    d,
                    desiredStage,
                    feedback,
                    para14aActive && d.enabled === true
                        ? this._para14aOptions(d, {
                            force: true,
                            releaseAuthority: false,
                            reason: para14aLimited ? 'Heizstab manuelle Stufe durch §14a begrenzt' : 'Heizstab manuelle Stufe unter §14a',
                        })
                        : { force: true, manual: true, reason: 'Heizstab manuelle Stufe' },
                );
                const requestedStage = Math.max(0, Math.min(num(res.targetStage, desiredStage), d.wiredStages || d.stageCount));
                const appliedStage = res.accepted ? requestedStage : observedStage;
                if (res.accepted) this._setStageCtlTarget(d.id, requestedStage, observedStage);
                this._markAutoOwnership(d, false, appliedStage, 'manual_mode');
                const targetW = this._sumStagePower(d, requestedStage);
                const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW || this._sumStagePower(d, observedStage));
                this._recordAcceptedHeatingEffect(d, res, baselineW, targetW, 'Heizstab manuelle Stufe');
                const observedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                const usedW = consumeHeatingRodW(Math.max(observedW, res.accepted ? targetW : 0), d.enabled === true);
                const level = Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)));

                appliedTotalW += Math.round(res.accepted ? targetW : this._sumStagePower(d, appliedStage));

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, requestedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `${para14aLimited ? `para14a_limited_manual${level}` : `manual${level}`}_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, `manual${level}`);
                continue;
            }

            // End-customer disabled PV regulation (Regelung AUS): do NOT write OFF.
            // The native actuator may now be switched manually in ioBroker/KNX or via the
            // manual stage buttons above. We only observe/balance so manual heat is not
            // immediately overwritten by the EMS tick.
            if (!userEnabled && pvModeRequested) {
                if (para14aActive && d.enabled === true) {
                    const guard = await this._enforcePara14aObservedStage(
                        d,
                        observedStage,
                        measuredW,
                        feedback,
                        para14aRemainingW,
                        'Regelung aus / manuell',
                    );
                    const usedW = consumeHeatingRodW(guard.usedW, true);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, guard.targetStage, observedStage);
                    this._markAutoOwnership(d, false, guard.targetStage, 'para14a_manual_allowed');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, guard.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(guard.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `${guard.limited ? 'para14a_limited' : 'para14a_guard'}_regulation_off_${String(guard.res.status || '')}`);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldStage(
                    d,
                    feedback,
                    observedStage,
                    measuredW,
                    'regulation_off',
                );
                if (restore) {
                    const usedW = consumeHeatingRodW(restore.usedW, false);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, restore.targetStage, observedStage);
                    this._markAutoOwnership(d, false, restore.targetStage, 'manual_allowed');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, restore.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(restore.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, restore.restored ? 'manual_allowed' : 'para14a_release');
                    continue;
                }

                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), false);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'regulation_off_manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                continue;
            }

            // Installer config: manual = only observe/balance, no writes. Useful for diagnostics / external logic.
            if (baseMode === 'manual') {
                if (para14aActive && d.enabled === true) {
                    const guard = await this._enforcePara14aObservedStage(
                        d,
                        observedStage,
                        measuredW,
                        feedback,
                        para14aRemainingW,
                        'manueller Betriebsmodus',
                    );
                    const usedW = consumeHeatingRodW(guard.usedW, true);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, guard.targetStage, observedStage);
                    this._markAutoOwnership(d, false, guard.targetStage, 'para14a_manual_cfg');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, guard.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(guard.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `${guard.limited ? 'para14a_limited' : 'para14a_guard'}_manual_cfg_${String(guard.res.status || '')}`);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldStage(
                    d,
                    feedback,
                    observedStage,
                    measuredW,
                    'manual_cfg',
                );
                if (restore) {
                    const usedW = consumeHeatingRodW(restore.usedW, false);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, restore.targetStage, observedStage);
                    this._markAutoOwnership(d, false, restore.targetStage, 'manual_cfg');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, restore.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(restore.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, restore.restored ? '' : 'para14a_release');
                    continue;
                }

                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), false);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'manual_cfg');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (baseMode === 'off') {
                this._para14aHeldStages.delete(String(d.id));
                const res = await this._applyStageState(d, 0, feedback, { force: true, manual: userMode !== 'inherit', reason: 'Heizstab aus' });
                const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW || this._sumStagePower(d, observedStage));
                this._recordAcceptedHeatingEffect(d, res, baselineW, 0, 'Heizstab aus');
                this._setStageCtlTarget(d.id, 0, observedStage);
                this._markAutoOwnership(d, false, 0, 'off');
                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), d.enabled === true);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `off_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Installer/admin disabled PV-Auto for this Heizstab device: observe only.
            // This is intentionally not an OFF command, so the customer can still switch
            // the physical Heizstab manually outside PV automation.
            if (!d.enabled && pvModeRequested) {
                const restore = await this._restorePara14aHeldStage(
                    d,
                    feedback,
                    observedStage,
                    measuredW,
                    'installer_disabled',
                );
                if (restore) {
                    const usedW = consumeHeatingRodW(restore.usedW, false);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, restore.targetStage, observedStage);
                    this._markAutoOwnership(d, false, restore.targetStage, 'manual_allowed');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, restore.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(restore.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, restore.restored ? 'manual_allowed' : 'para14a_release');
                    continue;
                }

                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), false);
                appliedTotalW += Math.round(usedW);
                this._setStageCtlTarget(d.id, observedStage, observedStage);
                this._markAutoOwnership(d, false, observedStage, 'manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, observedStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, this._sumStagePower(d, observedStage));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'pv_auto_disabled_manual_allowed');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_allowed');
                continue;
            }

            // Global PV-Auto minimum: this is now only a start/step-up gate.
            // It must not be a hard OFF, because small cloud/PV transients would otherwise
            // kill a stable stage and external KNX/manual switching would feel broken.
            const pvMinBlocksStepUp = !!(pvAutomationActive && !pvBase.tariffGridImportPreferred && !pvAutomationAllowedByMin);

            if (d.wiredStages < 1) {
                this._para14aHeldStages.delete(String(d.id));
                const usedW = consumeHeatingRodW(this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                ), false);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'no_stage_write_dp');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            if (pvAutomationActive) {
                await this._restoreAutoOwnershipIfLikely(d, pvAutomationActive, observedStage, measuredW, feedback);
            }
            const ownNow = this._getAutoOwnership(d, observedStage, measuredW, feedback);
            if (pvAutomationActive && ownNow.externalManual) {
                if (centralZeroMode.enabled) requestZeroExportProbe(this.adapter, { key: `heatingRod:${d.id}`, now, eligible: false });
                if (para14aActive && d.enabled === true) {
                    const guard = await this._enforcePara14aObservedStage(
                        d,
                        observedStage,
                        measuredW,
                        feedback,
                        para14aRemainingW,
                        'externe manuelle Schaltung',
                    );
                    const usedW = consumeHeatingRodW(guard.usedW, true);
                    appliedTotalW += Math.round(usedW);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, guard.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(guard.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `${guard.limited ? 'para14a_limited' : 'para14a_guard'}_external_manual_${String(guard.res.status || '')}`);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'para14a');
                    continue;
                }

                const restore = await this._restorePara14aHeldStage(
                    d,
                    feedback,
                    observedStage,
                    measuredW,
                    'external_manual',
                );
                if (restore) {
                    const usedW = consumeHeatingRodW(restore.usedW, false);
                    appliedTotalW += Math.round(usedW);
                    this._setStageCtlTarget(d.id, restore.targetStage, observedStage);
                    this._markAutoOwnership(d, false, restore.targetStage, 'external_manual');
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, restore.targetStage);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(restore.targetW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, restore.status);
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, restore.restored ? 'manual_external' : 'para14a_release');
                    continue;
                }

                const usedW = consumeHeatingRodW(
                    await this._observeManualExternal(d, observedStage, measuredW, feedback, 'external_manual_knx_observed'),
                    false,
                );
                appliedTotalW += usedW;
                continue;
            }

            // Nachtbetrieb: PV-Auto darf im konfigurierten Zeitfenster niemals
            // selbstständig laufen. Explizite Kundenfreigaben (Manual 1/2/3,
            // Boost oder eine klar erkannte externe KNX-/Relais-Schaltung) wurden
            // bereits in den vorherigen Zweigen behandelt und bleiben erlaubt.
            // Damit wird nur die automatische Eigentümerschaft aktiv auf 0 gesetzt.
            if (pvAutomationActive && nightPvAutoLock.active) {
                this._para14aHeldStages.delete(String(d.id));
                const res = await this._applyStageState(d, 0, feedback, {
                    force: true,
                    manual: false,
                    owner: this._deviceOwner(d, false),
                    enforceAuthority: true,
                    releaseAuthority: true,
                    kind: 'heating-rod-night-pv-auto-lock',
                    reason: `Heizstab PV-Auto Nachtblock ${nightPvAutoLock.startTime}-${nightPvAutoLock.endTime}`,
                });
                const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                    ? Math.max(0, measuredW)
                    : Math.max(0, feedback.appliedPowerW || this._sumStagePowerModel(d, observedStage, observedStage, measuredW));
                this._recordAcceptedHeatingEffect(d, res, baselineW, 0, 'Heizstab PV-Auto Nachtblock');
                if (res.accepted) this._setStageCtlTarget(d.id, 0, observedStage);
                this._markAutoOwnership(d, false, 0, 'night_pv_auto_blocked');
                const observedUsedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePowerModel(d, observedStage, observedStage, measuredW),
                );
                const usedW = consumeHeatingRodW(observedUsedW, d.enabled === true);
                appliedTotalW += Math.round(usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.nightPvAutoBlocked`, true);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `night_pv_auto_blocked_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'manual_release_required');
                continue;
            }

            this._para14aHeldStages.delete(String(d.id));
            const strategyAction = String(strategyOverlay.action || 'standard').toLowerCase();
            const strategyPause = strategyOverlay.fallbackPause === true
                || (strategyOverlay.active && ['pause', 'off', 'disable', 'block', 'stop'].includes(strategyAction));
            const strategyStageCap = strategyPause
                ? 0
                : this._maxStageForStrategyPower(d, strategyOverlay.maxPowerW, observedStage, measuredW);
            let desiredStage = 0;
            let zeroDecision = null;
            let budgetDecision = null;
            // Die globale Betriebsart ersetzt nur den Algorithmus hinter `pvAuto`;
            // die Kundenbedienung bleibt ein einzelner Auto-Button. Im 0-W-/Forecast-Modus
            // darf der sichtbare NVP-Überschuss NICHT als Startbudget dienen, weil WR/Speicher
            // ihn bei 0-Einspeisung absichtlich auf 0 W halten.
            if (centralZeroMode.enabled) {
                const actualW = this._readZeroExportActualW(d, Math.min(staleMs, 5000));
                const strategyCapW = strategyPause ? 0 : Math.max(0, this._sumStagePower(d, strategyStageCap));
                zeroDecision = this._applyCentralZeroExportStageStrategy(d, observedStage, pvBase, {
                    now, baseW: remainingW,
                    maxW: Math.min(remainingTotalW, para14aRemainingW, strategyCapW),
                    actualW, actualFresh: this._hasMeasuredPowerW(actualW),
                    eligible: !strategyPause && !pvMinBlocksStepUp,
                    budgetProtection,
                });
                desiredStage = zeroDecision.targetStage;
                budgetDecision = { targetStage: desiredStage, reduceNow: zeroDecision.reduceNow,
                    hardOff: zeroDecision.hardOff, reason: 'central-zero-export' };
                zeroExportInfo.canProbe = zeroExportInfo.canProbe || !!(zeroDecision.probe && zeroDecision.probe.granted);
                if (zeroDecision.probe && zeroDecision.probe.granted) zeroExportInfo.reason = zeroDecision.reason;
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportCanProbe`, !!(zeroDecision.probe && zeroDecision.probe.granted));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, zeroDecision.reason);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, zeroDecision.nextAllowedAt);
            } else if (zeroExportStrategyActive) {
                const st = this._ensureStageCtlState(d.id, observedStage);
                desiredStage = Math.max(0, Math.min(Math.round(Number(st.targetStage ?? observedStage) || 0), d.stageCount));
                budgetDecision = { targetStage: desiredStage, reduceNow: false, hardOff: false, reason: 'zero_export_replaces_pv_surplus' };
                zeroDecision = this._applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroExportInfo, now, measuredW);
                desiredStage = Math.max(0, Math.min(num(zeroDecision.targetStage, desiredStage), d.stageCount));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroDecision.reason || zeroExportInfo.reason || ''));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num(zeroDecision.nextAllowedAt, 0)));
            } else {
                desiredStage = this._computeDesiredStage(d, remainingW, observedStage, measuredW);
                budgetDecision = this._applyBudgetFollowerStageStrategy(d, desiredStage, observedStage, pvBase, budgetProtection, now, !pvMinBlocksStepUp);
                desiredStage = Math.max(0, Math.min(num(budgetDecision.targetStage, desiredStage), d.stageCount));
            }

            // Betriebsstrategien dürfen den vorhandenen PV-/0-Einspeise-Regler
            // ausschließlich begrenzen oder pausieren. Sie erhöhen niemals eine
            // bereits vom Fachmodul berechnete Stufe.
            desiredStage = Math.min(desiredStage, strategyStageCap);

            // Reiner PV-Betrieb: bei Netzbezug oder Speicherentladung keine Stufe halten
            // oder neu zuschalten. Bei aktivem 0-Einspeise-Sondermodus werden kurze Transienten
            // nicht sofort gekillt, sondern erst nach den konfigurierten Schutzzeiten.
            let forceNonPvDown = !!(strategyPause || (budgetDecision && budgetDecision.reduceNow) || (budgetProtection && budgetProtection.reduceNow));
            if (zeroExportStrategyActive) forceNonPvDown = !!(forceNonPvDown || (zeroDecision && zeroDecision.reduceNow));
            if (forceNonPvDown) {
                // Reduce to the next lower *physical* actuator set. This is important for
                // installations that accidentally map several virtual stages to the same KNX/relay
                // datapoint: targetStage 3 -> 2 would otherwise still keep the same actuator ON.
                const hardOff = !!(strategyPause || (budgetProtection && budgetProtection.hardOff) || (zeroDecision && zeroDecision.hardOff));
                const lowerPhysicalStage = hardOff
                    ? 0
                    : this._previousPhysicalStageBelow(d, Math.max(observedStage, desiredStage));
                desiredStage = Math.min(desiredStage, lowerPhysicalStage);
            }

            const forceStorageProtectOff = !!(pvBase.forceOff && desiredStage <= 0 && !(zeroExportStrategyActive && zeroDecision && !zeroDecision.reduceNow));
            let targetStage = forceStorageProtectOff
                ? 0
                : (forceNonPvDown ? desiredStage : this._applyTiming(d, desiredStage, observedStage));
            if (forceStorageProtectOff || forceNonPvDown) this._setStageCtlTarget(d.id, targetStage, observedStage);
            const jsTargetStageBeforeTs = Math.max(0, Math.min(targetStage, d.stageCount, d.wiredStages));
            const jsTargetWBeforeTs = this._sumStagePowerModel(d, jsTargetStageBeforeTs, observedStage, measuredW);
            const tsProductiveDecision = this._evaluateHeatingRodTsProductiveDecision({
                normalPathReady: this._isHeatingRodTsNormalPathReady(),
                device: d,
                deviceId: d.id,
                jsTargetStage: jsTargetStageBeforeTs,
                jsTargetW: jsTargetWBeforeTs,
                jsStatus: zeroExportStrategyActive ? 'zero_export_forecast_auto' : (forceStorageProtectOff ? 'storage_protect' : (forceNonPvDown ? 'pv_only_protect' : 'pv_auto')),
                observedStage,
                measuredW,
                zeroExportActive: !!zeroExportStrategyActive,
                effectiveMode,
                availablePvW: Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                availableTotalW: pvBase && pvBase.budgetGateEffectiveW !== null && pvBase.budgetGateEffectiveW !== undefined ? Math.max(0, Number(pvBase.budgetGateEffectiveW) || 0) : Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                allowGridImport: !!(pvBase && (pvBase.tariffGridImportPreferred || (pvBase.budgetGateTotalW !== null && pvBase.budgetGateTotalW !== undefined))),
                storageProtectActive: !!(pvBase && pvBase.forceOff),
                storageSocPct: pvBase ? pvBase.storageSocPct : null,
                storageReserveSocPct: Number(this._getCfg().storageReserveSocPct || this._getCfg().storageTargetSocPct || 0) || 0,
                storageReserveW: pvBase ? Math.max(0, Number(pvBase.storageReserveW) || 0) : 0,
            });
            if (tsProductiveDecision && tsProductiveDecision.active) {
                targetStage = Math.max(0, Math.min(Number(tsProductiveDecision.targetStage) || 0, d.stageCount, d.wiredStages));
            }
            // Der TS-Normalpfad darf die vom Strategieplaner gesetzte Obergrenze
            // nicht wieder anheben.
            targetStage = Math.min(targetStage, strategyStageCap);
            // Weder Mindestlaufzeit noch TS-Fallback darf eine entzogene Probe
            // halten oder eine nur teilweise finanzierbare Relaisstufe einschalten.
            if (centralZeroMode.enabled && zeroDecision) targetStage = Math.min(targetStage, zeroDecision.stageCap);
            const para14aMaxStage = para14aActive && d.enabled === true
                ? this._maxStageForPara14aBudget(d, para14aRemainingW, observedStage, measuredW)
                : targetStage;
            const para14aLimitedAuto = para14aActive && d.enabled === true && targetStage > para14aMaxStage;
            if (para14aLimitedAuto) targetStage = para14aMaxStage;
            heatingRodTsProductiveEntries.push({
                deviceId: d.id,
                source: tsProductiveDecision && tsProductiveDecision.source || 'js-runtime',
                active: !!(tsProductiveDecision && tsProductiveDecision.active),
                fallback: !!(tsProductiveDecision && tsProductiveDecision.fallback),
                fallbackReason: tsProductiveDecision && tsProductiveDecision.fallbackReason || '',
                jsTargetStage: jsTargetStageBeforeTs,
                tsTargetStage: tsProductiveDecision && tsProductiveDecision.ts ? tsProductiveDecision.ts.targetStage : null,
                finalTargetStage: targetStage,
                jsTargetW: Math.round(jsTargetWBeforeTs),
                tsTargetW: tsProductiveDecision && tsProductiveDecision.ts ? tsProductiveDecision.ts.targetPowerW : null,
                observedStage,
                measuredW,
                effectiveMode,
                zeroExportActive: !!zeroExportStrategyActive,
                availablePvW: Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                availableTotalW: pvBase && pvBase.budgetGateEffectiveW !== null && pvBase.budgetGateEffectiveW !== undefined
                    ? Math.max(0, Number(pvBase.budgetGateEffectiveW) || 0)
                    : Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                allowGridImport: !!(pvBase && (pvBase.tariffGridImportPreferred || (pvBase.budgetGateTotalW !== null && pvBase.budgetGateTotalW !== undefined))),
                storageProtectActive: !!(pvBase && pvBase.forceOff),
                storageSocPct: pvBase ? pvBase.storageSocPct : null,
                storageReserveSocPct: Number(this._getCfg().storageReserveSocPct || this._getCfg().storageTargetSocPct || 0) || 0,
                storageReserveW: pvBase ? Math.max(0, Number(pvBase.storageReserveW) || 0) : 0,
                reason: tsProductiveDecision && (tsProductiveDecision.reason || tsProductiveDecision.fallbackReason) || '',
                mismatches: tsProductiveDecision && tsProductiveDecision.mismatches || [],
                jsReferenceMismatch: !!(tsProductiveDecision && (tsProductiveDecision.jsReferenceMismatch || (Array.isArray(tsProductiveDecision.referenceMismatches) && tsProductiveDecision.referenceMismatches.length))),
                referenceMismatches: tsProductiveDecision && Array.isArray(tsProductiveDecision.referenceMismatches) ? tsProductiveDecision.referenceMismatches : [],
                blockingReferenceMismatches: tsProductiveDecision && Array.isArray(tsProductiveDecision.blockingReferenceMismatches) ? tsProductiveDecision.blockingReferenceMismatches : [],
                diagnosticReferenceMismatches: tsProductiveDecision && Array.isArray(tsProductiveDecision.diagnosticReferenceMismatches) ? tsProductiveDecision.diagnosticReferenceMismatches : [],
                normalPathReady: !!(tsProductiveDecision && tsProductiveDecision.normalPathReady),
                normalPathTakenOver: !!(tsProductiveDecision && tsProductiveDecision.normalPathTakenOver),
                legacyJsPathRole: tsProductiveDecision && tsProductiveDecision.legacyJsPathRole || '',
                legacyJsPathReduced: !!(tsProductiveDecision && tsProductiveDecision.legacyJsPathReduced),
                jsReferenceMode: tsProductiveDecision && tsProductiveDecision.jsReferenceMode || '',
                jsReferenceDecisionMode: tsProductiveDecision && tsProductiveDecision.jsReferenceDecisionMode || '',
                jsReferenceBlocking: !!(tsProductiveDecision && tsProductiveDecision.jsReferenceBlocking),
                jsReferenceReduced: !!(tsProductiveDecision && tsProductiveDecision.jsReferenceReduced),
                hardFallbackOnly: !!(tsProductiveDecision && tsProductiveDecision.hardFallbackOnly),
                emergencyFallback: !!(tsProductiveDecision && tsProductiveDecision.emergencyFallback),
                jsFallbackMode: tsProductiveDecision && tsProductiveDecision.jsFallbackMode || '',
                hardSafetyBlock: !!(tsProductiveDecision && tsProductiveDecision.hardSafetyBlock),
                shadowSkipReason: para14aLimitedAuto
                    ? 'para14a-limited-after-decision'
                    : (tsProductiveDecision && tsProductiveDecision.fallback
                        && String(tsProductiveDecision.fallbackReason || '') !== 'ts-js-stage-mismatch'
                        ? String(tsProductiveDecision.fallbackReason || '')
                        : ''),
            });
            const offWouldTouchLoad = targetStage <= 0 && ((typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 50) || Math.max(0, feedback.appliedPowerW || 0) > 0 || observedStage > 0);
            const mayWriteOff = !!(ownNow.autoOwned || strategyPause || forceStorageProtectOff || forceNonPvDown || para14aLimitedAuto);
            if (targetStage <= 0 && offWouldTouchLoad && !mayWriteOff) {
                const usedW = consumeHeatingRodW(
                    await this._observeManualExternal(d, observedStage, measuredW, feedback, 'manual_external_off_protected'),
                    false,
                );
                appliedTotalW += usedW;
                continue;
            }
            const forcePvWrite = !!(strategyPause || forceStorageProtectOff || forceNonPvDown || para14aLimitedAuto || (targetStage <= 0 && mayWriteOff && offWouldTouchLoad));
            const zeroExportGrant = zeroDecision && zeroDecision.probe && zeroDecision.probe.granted
                ? { leaseId: zeroDecision.probe.leaseId } : null;
            const res = await this._applyStageState(
                d,
                targetStage,
                feedback,
                para14aActive && d.enabled === true
                    ? this._para14aOptions(d, {
                        force: forcePvWrite,
                        zeroExportGrant,
                        releaseAuthority: false,
                        reason: para14aLimitedAuto
                            ? 'Heizstab PV-Auto durch §14a begrenzt'
                            : (zeroExportStrategyActive ? 'Heizstab 0-Einspeisung unter §14a' : 'Heizstab PV-Auto unter §14a'),
                    })
                    : { force: forcePvWrite, zeroExportGrant, reason: zeroExportStrategyActive ? 'Heizstab 0-Einspeisung' : 'Heizstab PV-Auto' },
            );
            const requestedStage = Math.max(0, Math.min(num(res.targetStage, targetStage), d.wiredStages));
            const appliedStage = res.accepted ? requestedStage : observedStage;
            if (res.accepted) this._setStageCtlTarget(d.id, requestedStage, observedStage);
            this._markAutoOwnership(d, res.accepted && requestedStage > 0, appliedStage, zeroExportStrategyActive ? 'zeroExportForecast' : 'pvAuto');
            const targetW = this._sumStagePowerModel(d, requestedStage, observedStage, measuredW);
            const baselineW = (typeof measuredW === 'number' && Number.isFinite(measuredW))
                ? Math.max(0, measuredW)
                : Math.max(0, feedback.appliedPowerW || this._sumStagePowerModel(d, observedStage, observedStage, measuredW));
            this._recordAcceptedHeatingEffect(d, res, baselineW, targetW, zeroExportStrategyActive ? 'Heizstab 0-Einspeisung' : 'Heizstab PV-Auto');
            const observedUsedW = this._resolveObservedPowerW(
                d,
                measuredW,
                feedback,
                this._sumStagePowerModel(d, observedStage, observedStage, measuredW),
            );
            // Fuer EMS-eigene PV-Auto-Stufen wird ein bestaetigter Zielwert sofort
            // als Budget reserviert, damit andere Verbraucher denselben PV-Rest nicht
            // doppelt erhalten. Die sichtbare/diagnostische Istleistung bleibt jedoch
            // der manuell zugeordnete Messwert (auch 0 W).
            const usedW = consumeHeatingRodW(Math.max(observedUsedW, res.accepted ? targetW : 0), d.enabled === true);

            appliedTotalW += Math.round(res.accepted ? targetW : this._sumStagePowerModel(d, appliedStage, observedStage, measuredW));
            budgetUsedW += Math.round(usedW);

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, requestedStage);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
            const zeroSuffix = zeroDecision && zeroDecision.reason ? `_zero_${String(zeroDecision.reason)}` : '';
            const gateSuffix = budgetProtection && budgetProtection.reason && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : '';
            const budgetSuffix = budgetDecision && budgetDecision.reason && budgetDecision.reason !== 'budget_follow' ? `_budget_${String(budgetDecision.reason)}` : '';
            const pvMinSuffix = pvMinBlocksStepUp ? `_pv_min_hold_${pvNowForAutomationW}of${minPvAutomationW}W` : '';
            const strategySuffix = strategyOverlay.active || strategyOverlay.fallbackPause
                ? `_strategy_${strategyPause ? 'pause' : `cap_${strategyStageCap}`}`
                : '';
            const autoStatusBase = forceStorageProtectOff
                ? `storage_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}${strategySuffix}`
                : (forceNonPvDown ? `pv_only_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}${strategySuffix}` : `${String(res.status || 'pv_auto')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}${strategySuffix}`);
            const autoStatus = para14aLimitedAuto ? `para14a_limited_${autoStatusBase}` : autoStatusBase;
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, autoStatus);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
        }

        // TS-Shadow-Diagnose: vergleicht ausschließlich Geräte, die in diesem Tick den
        // normalen produktiven PV-/Budget-Entscheidungspfad tatsächlich erreicht haben.
        // Manuelle, deaktivierte, Boost- oder sonstige Sonderpfade werden dadurch nicht
        // mit einem fachlich unpassenden TS-Modell verglichen und erzeugen keine falschen
        // Warnungen. Dieser Block bleibt reine Diagnose und schaltet keine Ausgänge.
        const heatingRodTsShadowDevices = new Map((this._devices || []).map(device => [device.id, device]));
        const heatingRodTsShadowEntries = (heatingRodTsProductiveEntries || []).map(entry => ({
            device: heatingRodTsShadowDevices.get(entry.deviceId) || {},
            deviceId: entry.deviceId,
            jsTargetStage: entry.jsTargetStage,
            jsTargetW: entry.jsTargetW,
            jsStatus: entry.reason || '',
            skipReason: entry.shadowSkipReason || '',
            observedStage: entry.observedStage,
            measuredW: entry.measuredW,
            effectiveMode: entry.effectiveMode,
            zeroExportActive: entry.zeroExportActive,
            availablePvW: entry.availablePvW,
            availableTotalW: entry.availableTotalW,
            allowGridImport: entry.allowGridImport,
            storageProtectActive: entry.storageProtectActive,
            storageSocPct: entry.storageSocPct,
            storageReserveSocPct: entry.storageReserveSocPct,
            storageReserveW: entry.storageReserveW,
        }));
        const heatingRodTsShadow = this._runHeatingRodTsShadowComparison(heatingRodTsShadowEntries);
        const heatingRodTsProductive = {
            source: 'ts-heating-rod-productive',
            active: heatingRodTsProductiveEntries.some(e => e && e.active),
            productive: heatingRodTsProductiveEntries.some(e => e && e.active),
            fallback: heatingRodTsProductiveEntries.some(e => e && e.fallback),
            activeCount: heatingRodTsProductiveEntries.filter(e => e && e.active).length,
            fallbackCount: heatingRodTsProductiveEntries.filter(e => e && e.fallback).length,
            fallbackReasons: Array.from(new Set(heatingRodTsProductiveEntries.filter(e => e && e.fallbackReason).map(e => String(e.fallbackReason)))),
            normalPathTakenOverCount: heatingRodTsProductiveEntries.filter(e => e && e.normalPathTakenOver).length,
            jsReferenceReducedCount: heatingRodTsProductiveEntries.filter(e => e && e.jsReferenceReduced).length,
            hardSafetyBlockCount: heatingRodTsProductiveEntries.filter(e => e && e.hardSafetyBlock).length,
            hardFallbackOnlyCount: heatingRodTsProductiveEntries.filter(e => e && e.hardFallbackOnly).length,
            emergencyFallbackCount: heatingRodTsProductiveEntries.filter(e => e && e.emergencyFallback).length,
            jsReferenceBlockingCount: heatingRodTsProductiveEntries.filter(e => e && e.jsReferenceBlocking).length,
            legacyJsReferenceUsedForDecisionCount: heatingRodTsProductiveEntries.filter(e => e && e.legacyJsReferenceUsedForDecision).length,
            legacyJsReferenceDiagnosticOnlyCount: heatingRodTsProductiveEntries.filter(e => e && e.legacyJsReferenceUsedForDecision === false).length,
            normalPathActiveCount: heatingRodTsProductiveEntries.filter(e => e && e.source === 'ts-heating-rod-normal').length,
            legacyJsPathRole: heatingRodTsProductiveEntries.some(e => e && e.normalPathTakenOver) ? 'emergency-fallback-only' : 'safety-reference',
            jsReferenceDecisionMode: heatingRodTsProductiveEntries.some(e => e && e.normalPathTakenOver) ? 'diagnostic-only' : 'blocking-until-normal-ready',
            jsFallbackMode: heatingRodTsProductiveEntries.some(e => e && e.normalPathTakenOver) ? 'hard-blockers-only' : 'normal-safety-fallback',
            entries: heatingRodTsProductiveEntries,
        };
        const heatingRodTsRuntimeEvaluation = this._updateHeatingRodTsRuntimeEvaluation(heatingRodTsProductive);
        const heatingRodTsNormalSource = this._updateHeatingRodTsNormalSourceState(heatingRodTsProductive, heatingRodTsRuntimeEvaluation);
        heatingRodTsRuntimeEvaluation.normalSource = heatingRodTsNormalSource;
        heatingRodTsProductive.runtimeEvaluation = heatingRodTsRuntimeEvaluation;
        heatingRodTsProductive.normalSource = heatingRodTsNormalSource;
        heatingRodTsProductive.effectiveSource = heatingRodTsProductive && heatingRodTsProductive.active && heatingRodTsNormalSource && heatingRodTsNormalSource.ready
            ? 'ts-heating-rod-normal'
            : (heatingRodTsProductive && heatingRodTsProductive.active ? 'ts-heating-rod' : 'js-runtime');
        const heatingRodTsFallbackPolicy = {
            source: 'heating-rod-ts-fallback-policy-v1',
            ts: Date.now(),
            mode: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'hard-blockers-only' : 'normal-safety-fallback',
            hardBlockersOnly: !!(heatingRodTsNormalSource && heatingRodTsNormalSource.ready),
            jsFallbackLimitedToHardBlockers: !!(heatingRodTsNormalSource && heatingRodTsNormalSource.ready),
            normalPathTakenOver: !!(heatingRodTsNormalSource && heatingRodTsNormalSource.normalPathTakenOver),
            legacyJsReferenceMode: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'diagnostic-only' : 'blocking-reference',
            jsReferenceDecisionUsed: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'diagnostic-only' : 'blocking-before-normal',
            legacyJsReferenceInDecisionPath: !(heatingRodTsNormalSource && heatingRodTsNormalSource.ready),
            legacyJsReferenceMovedToDiagnostics: !!(heatingRodTsNormalSource && heatingRodTsNormalSource.ready),
            legacyJsReferenceCleanupStage: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'diagnostics-cleanup' : 'candidate-monitoring',
            effectiveSource: heatingRodTsProductive.effectiveSource,
            allowedHardReasons: ['missing-ts-mirror', 'ts-runtime-error', 'ts-js-stage-mismatch', 'storage-protect-blocks-ts-normal', 'pv-protect-blocks-ts-normal'],
            jsReferenceReducedCount: heatingRodTsProductive.jsReferenceReducedCount || 0,
            hardSafetyBlockCount: heatingRodTsProductive.hardSafetyBlockCount || 0,
            emergencyFallbackCount: heatingRodTsProductive.emergencyFallbackCount || 0,
            fallbackReasons: heatingRodTsProductive.fallbackReasons || [],
        };
        heatingRodTsProductive.fallbackPolicy = heatingRodTsFallbackPolicy;
        const heatingRodTsLegacyReference = this._buildHeatingRodLegacyReferenceDiagnostic(heatingRodTsProductive, heatingRodTsRuntimeEvaluation, heatingRodTsNormalSource);
        const heatingRodTsLegacyCleanup = this._buildHeatingRodTsLegacyCleanupState(heatingRodTsProductive, heatingRodTsRuntimeEvaluation, heatingRodTsNormalSource, heatingRodTsFallbackPolicy, heatingRodTsLegacyReference);
        const heatingRodTsLegacyRemovalPlan = this._buildHeatingRodTsLegacyRemovalPlanState(heatingRodTsProductive, heatingRodTsRuntimeEvaluation, heatingRodTsNormalSource, heatingRodTsFallbackPolicy, heatingRodTsLegacyCleanup, heatingRodTsLegacyReference);
        const heatingRodTsLegacyDebugBridge = this._buildHeatingRodTsLegacyDebugBridgeState(heatingRodTsProductive, heatingRodTsRuntimeEvaluation, heatingRodTsNormalSource, heatingRodTsFallbackPolicy, heatingRodTsLegacyCleanup, heatingRodTsLegacyRemovalPlan, heatingRodTsLegacyReference);
        const heatingRodTsLegacyPruned = this._buildHeatingRodTsLegacyPrunedState(heatingRodTsLegacyReference, heatingRodTsLegacyCleanup, heatingRodTsLegacyRemovalPlan, heatingRodTsLegacyDebugBridge, heatingRodTsNormalSource, heatingRodTsRuntimeEvaluation);
        const heatingRodTsLegacyRemovalCandidate = this._buildHeatingRodTsLegacyRemovalCandidateState(heatingRodTsLegacyReference, heatingRodTsLegacyCleanup, heatingRodTsLegacyRemovalPlan, heatingRodTsLegacyDebugBridge, heatingRodTsLegacyPruned, heatingRodTsNormalSource, heatingRodTsRuntimeEvaluation);
        const heatingRodTsLegacyFinalCleanup = this._buildHeatingRodTsLegacyFinalCleanupState(heatingRodTsLegacyReference, heatingRodTsLegacyPruned, heatingRodTsLegacyRemovalCandidate, heatingRodTsLegacyDebugBridge, heatingRodTsNormalSource, heatingRodTsRuntimeEvaluation);
        const heatingRodTsLegacyNormalDiagnostics = this._buildHeatingRodTsLegacyNormalDiagnosticsState(heatingRodTsLegacyRemovalCandidate, heatingRodTsLegacyPruned, heatingRodTsLegacyDebugBridge, heatingRodTsLegacyReference, heatingRodTsRuntimeEvaluation);
        heatingRodTsProductive.legacyReference = heatingRodTsLegacyReference;
        heatingRodTsProductive.legacyCleanup = heatingRodTsLegacyCleanup;
        heatingRodTsProductive.legacyRemovalPlan = heatingRodTsLegacyRemovalPlan;
        heatingRodTsProductive.legacyDebugBridge = heatingRodTsLegacyDebugBridge;
        heatingRodTsProductive.legacyPrunedDebug = heatingRodTsLegacyPruned;
        heatingRodTsProductive.legacyPruned = heatingRodTsLegacyPruned;
        heatingRodTsProductive.legacyRemovalCandidate = heatingRodTsLegacyRemovalCandidate;
        heatingRodTsProductive.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
        heatingRodTsProductive.legacyNormalDiagnostics = heatingRodTsLegacyNormalDiagnostics;
        heatingRodTsRuntimeEvaluation.legacyReference = heatingRodTsLegacyReference;
        heatingRodTsRuntimeEvaluation.legacyCleanup = heatingRodTsLegacyCleanup;
        heatingRodTsRuntimeEvaluation.legacyRemovalPlan = heatingRodTsLegacyRemovalPlan;
        heatingRodTsRuntimeEvaluation.legacyDebugBridge = heatingRodTsLegacyDebugBridge;
        heatingRodTsRuntimeEvaluation.legacyPrunedDebug = heatingRodTsLegacyPruned;
        heatingRodTsRuntimeEvaluation.legacyPruned = heatingRodTsLegacyPruned;
        heatingRodTsRuntimeEvaluation.legacyRemovalCandidate = heatingRodTsLegacyRemovalCandidate;
        heatingRodTsRuntimeEvaluation.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
        heatingRodTsRuntimeEvaluation.legacyNormalDiagnostics = heatingRodTsLegacyNormalDiagnostics;
        if (heatingRodTsNormalSource && typeof heatingRodTsNormalSource === 'object') {
            heatingRodTsNormalSource.legacyReference = heatingRodTsLegacyReference;
            heatingRodTsNormalSource.legacyCleanup = heatingRodTsLegacyCleanup;
            heatingRodTsNormalSource.legacyRemovalPlan = heatingRodTsLegacyRemovalPlan;
            heatingRodTsNormalSource.legacyDebugBridge = heatingRodTsLegacyDebugBridge;
            heatingRodTsNormalSource.legacyPrunedDebug = heatingRodTsLegacyPruned;
            heatingRodTsNormalSource.legacyPruned = heatingRodTsLegacyPruned;
            heatingRodTsNormalSource.legacyRemovalCandidate = heatingRodTsLegacyRemovalCandidate;
            heatingRodTsNormalSource.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
            heatingRodTsNormalSource.legacyNormalDiagnostics = heatingRodTsLegacyNormalDiagnostics;
        }
        heatingRodTsFallbackPolicy.legacyReference = heatingRodTsLegacyReference;
        heatingRodTsFallbackPolicy.legacyCleanup = heatingRodTsLegacyCleanup;
        heatingRodTsFallbackPolicy.legacyRemovalPlan = heatingRodTsLegacyRemovalPlan;
        heatingRodTsFallbackPolicy.legacyDebugBridge = heatingRodTsLegacyDebugBridge;
        heatingRodTsFallbackPolicy.legacyPrunedDebug = heatingRodTsLegacyPruned;
        heatingRodTsFallbackPolicy.legacyPruned = heatingRodTsLegacyPruned;
        heatingRodTsFallbackPolicy.legacyRemovalCandidate = heatingRodTsLegacyRemovalCandidate;
        heatingRodTsFallbackPolicy.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
        heatingRodTsFallbackPolicy.legacyNormalDiagnostics = heatingRodTsLegacyNormalDiagnostics;
        heatingRodTsLegacyRemovalPlan.legacyDebugBridge = heatingRodTsLegacyDebugBridge;
        heatingRodTsLegacyRemovalPlan.legacyPrunedDebug = heatingRodTsLegacyPruned;
        heatingRodTsLegacyRemovalPlan.legacyPruned = heatingRodTsLegacyPruned;
        heatingRodTsLegacyRemovalPlan.legacyRemovalCandidate = heatingRodTsLegacyRemovalCandidate;
        heatingRodTsLegacyRemovalPlan.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
        heatingRodTsLegacyRemovalPlan.legacyFinalCleanup = heatingRodTsLegacyFinalCleanup;
        heatingRodTsLegacyRemovalPlan.legacyNormalDiagnostics = heatingRodTsLegacyNormalDiagnostics;

        this.adapter._heatingRodBudgetUsedW = Math.round(budgetUsedW);

        // Central EMS Budget & Gates reservation. Heizstab is normally a lower-priority PV consumer
        // after Ladepunkte/Thermik. This is diagnostics + downstream accounting only; manual KNX
        // channels remain protected by the ownership logic above.
        try {
            const rt = this.adapter && this.adapter._emsBudget;
            if (rt && typeof rt.reserve === 'function') {
                const used = Math.max(0, Math.round(budgetUsedW || 0));
                const tariffImportPreferred = !!(pvBase && pvBase.tariffGridImportPreferred);
                rt.reserve({
                    key: 'heatingRod',
                    app: 'heatingRodControl',
                    label: 'Heizstab',
                    priority: 300,
                    requestedW: used,
                    reserveW: used,
                    pvReserveW: tariffImportPreferred ? 0 : used,
                    // Istleistung und Reservierung bleiben getrennt: 0 W aus dem
                    // zugeordneten Mess-DP ist ein gueltiger Istwert und darf nicht
                    // durch Stufen-/Sollleistung ersetzt werden.
                    actualW: Math.max(0, Math.round(Number.isFinite(Number(currentHeatingRodW)) ? Number(currentHeatingRodW) : 0)),
                    pvOnly: !tariffImportPreferred,
                    // Budget-Diagnose: bei gleichem Frontend-Auto-Button sichtbar machen,
                    // ob der Heizstab gerade klassisch nach NVP-Überschuss oder per
                    // 0-W-/Forecast-Strategie geführt wird.
                    mode: tariffImportPreferred ? 'tariffNegative' : (zeroExportStrategyActive ? 'zeroExportForecast' : 'pvAuto'),
                });
            }
        } catch (_e) {
            // budget diagnostics only
        }

        await this._setStateIfChanged('heatingRod.summary.pvCapW', Math.round(num(pvBase.pvCapW, 0)));
        await this._setStateIfChanged('heatingRod.summary.evcsUsedW', Math.round(num(pvBase.evcsUsedW, 0)));
        await this._setStateIfChanged('heatingRod.summary.thermalUsedW', Math.round(thermalUsedW));
        await this._setStateIfChanged('heatingRod.summary.currentHeatingRodW', Math.round(currentHeatingRodW));
        await this._setStateIfChanged('heatingRod.summary.storageReserveW', Math.round(num(pvBase.storageReserveW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageChargeW', Math.round(num(pvBase.storageChargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.storageDischargeW', Math.round(num(pvBase.storageDischargeW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableRawW', Math.round(num(pvBase.availableW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAvailableW', Math.round(Math.max(0, num(pvBase.availableW, 0) - thermalDeductedW)));
        await this._setStateIfChanged('heatingRod.summary.appliedTotalW', Math.round(appliedTotalW));
        await this._setStateIfChanged('heatingRod.summary.budgetUsedW', Math.round(budgetUsedW));
        await this._setStateIfChanged('heatingRod.summary.budgetGateTotalW', pvBase.budgetGateTotalW === null ? 0 : Math.round(num(pvBase.budgetGateTotalW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateRemainingW', pvBase.budgetGateRemainingW === null ? 0 : Math.round(num(pvBase.budgetGateRemainingW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGatePvW', Math.round(num(pvBase.budgetGatePvW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateEffectiveW', Math.round(num(pvBase.budgetGateEffectiveW, 0)));
        await this._setStateIfChanged('heatingRod.summary.budgetGateSource', String(pvBase.budgetGateSource || pvBase.source || ''));
        await this._setStateIfChanged('heatingRod.summary.gridImportW', Math.round(num(pvBase.importW, 0)));
        await this._setStateIfChanged('heatingRod.summary.gridImportLimitW', Math.round(num(pvBase.importToleranceW, 0)));
        await this._setStateIfChanged('heatingRod.summary.gridImportExceeded', !!(budgetProtection && budgetProtection.importActive));
        await this._setStateIfChanged('heatingRod.summary.storageDischargeExceeded', !!(budgetProtection && budgetProtection.dischargeActive));
        await this._setStateIfChanged('heatingRod.summary.autoMode', heatingRodAutoMode);
        await this._setStateIfChanged('heatingRod.summary.zeroExportActive', !!zeroExportStrategyActive);
        await this._setStateIfChanged('heatingRod.summary.zeroExportCanProbe', !!(zeroExportStrategyActive && zeroExportInfo.canProbe));
        await this._setStateIfChanged('heatingRod.summary.zeroExportReason', String(zeroExportInfo.reason || ''));
        await this._setStateIfChanged('heatingRod.summary.zeroExportPvNowW', Math.round(num(zeroExportInfo.pvNowW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportPotentialW', Math.round(num(zeroExportInfo.zeroPotentialW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportBudgetW', Math.round(num(zeroExportInfo.zeroBudgetW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportBudgetSource', String(zeroExportInfo.zeroPotentialSource || ''));
        await this._setStateIfChanged('heatingRod.summary.zeroExportForecastOk', !!(zeroExportStrategyActive && zeroExportInfo.forecastOk));
        await this._setStateIfChanged('heatingRod.summary.zeroExportFeedInAtLimit', !!(zeroExportStrategyActive && zeroExportInfo.feedInAtLimit));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationMinW', Math.round(num(minPvAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationPvNowW', Math.round(num(pvNowForAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationAllowed', !!pvAutomationAllowedByMin);
        await this._setStateIfChanged('heatingRod.summary.nightPvAutoBlockEnabled', !!nightPvAutoLock.enabled);
        await this._setStateIfChanged('heatingRod.summary.nightWindowActive', !!nightPvAutoLock.active);
        await this._setStateIfChanged('heatingRod.summary.nightStartTime', String(nightPvAutoLock.startTime || '20:00'));
        await this._setStateIfChanged('heatingRod.summary.nightEndTime', String(nightPvAutoLock.endTime || '06:00'));
        await this._setStateIfChanged('heatingRod.summary.nightManualOnly', !!nightPvAutoLock.active);
        await this._setStateIfChanged('heatingRod.summary.nightBlockReason', String(nightPvAutoLock.reason || ''));
        await this._setStateIfChanged('heatingRod.summary.tsShadowJson', JSON.stringify(heatingRodTsShadow || {}));
        await this._setStateIfChanged('heatingRod.summary.source', heatingRodTsProductive && heatingRodTsProductive.effectiveSource ? heatingRodTsProductive.effectiveSource : (heatingRodTsProductive && heatingRodTsProductive.active ? 'ts-heating-rod' : 'js-runtime'));
        await this._setStateIfChanged('heatingRod.summary.jsFallbackMode', String(heatingRodTsNormalSource && heatingRodTsNormalSource.jsFallbackMode || heatingRodTsProductive && heatingRodTsProductive.jsFallbackMode || 'normal-safety-fallback'));
        await this._setStateIfChanged('heatingRod.summary.tsProductiveJson', JSON.stringify(heatingRodTsProductive || {}));
        await this._setStateIfChanged('heatingRod.summary.tsRuntimeEvaluationJson', JSON.stringify(heatingRodTsRuntimeEvaluation || {}));
        await this._setStateIfChanged('heatingRod.summary.tsNormalSourceJson', JSON.stringify(heatingRodTsNormalSource || {}));
        await this._setStateIfChanged('heatingRod.summary.tsFallbackPolicyJson', JSON.stringify(heatingRodTsFallbackPolicy || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyReferenceJson', JSON.stringify(heatingRodTsLegacyReference || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyCleanupJson', JSON.stringify(heatingRodTsLegacyCleanup || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyRemovalPlanJson', JSON.stringify(heatingRodTsLegacyRemovalPlan || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyDebugBridgeJson', JSON.stringify(heatingRodTsLegacyDebugBridge || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyPrunedJson', JSON.stringify(heatingRodTsLegacyPruned || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyRemovalCandidateJson', JSON.stringify(heatingRodTsLegacyRemovalCandidate || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyFinalCleanupJson', JSON.stringify(heatingRodTsLegacyFinalCleanup || {}));
        await this._setStateIfChanged('heatingRod.summary.tsLegacyNormalDiagnosticsJson', JSON.stringify(heatingRodTsLegacyNormalDiagnostics || {}));
        await this._setStateIfChanged('heatingRod.summary.legacyJsReferenceJson', JSON.stringify(heatingRodTsLegacyNormalDiagnostics && heatingRodTsLegacyNormalDiagnostics.ready ? heatingRodTsLegacyNormalDiagnostics.compactReference : (heatingRodTsLegacyRemovalCandidate && heatingRodTsLegacyRemovalCandidate.ready ? heatingRodTsLegacyRemovalCandidate.compactReference : (heatingRodTsLegacyPruned && heatingRodTsLegacyPruned.ready ? heatingRodTsLegacyPruned.compactLegacyReference : (heatingRodTsLegacyDebugBridge && heatingRodTsLegacyDebugBridge.debugBridgeActive ? heatingRodTsLegacyDebugBridge : (heatingRodTsLegacyReference || {}))))));
        await this._setStateIfChanged('heatingRod.summary.debugJson', JSON.stringify({
            source: pvBase.source,
            tsShadow: heatingRodTsShadow || null,
            tsProductive: heatingRodTsProductive || null,
            tsRuntimeEvaluation: heatingRodTsRuntimeEvaluation || null,
            tsNormalSource: heatingRodTsNormalSource || null,
            tsFallbackPolicy: heatingRodTsFallbackPolicy || null,
            legacyReference: heatingRodTsLegacyFinalCleanup && heatingRodTsLegacyFinalCleanup.ready ? (heatingRodTsLegacyFinalCleanup.compactDebugBridge || heatingRodTsLegacyFinalCleanup.compactReference || null) : (heatingRodTsLegacyNormalDiagnostics && heatingRodTsLegacyNormalDiagnostics.ready ? heatingRodTsLegacyNormalDiagnostics.compactReference : (heatingRodTsLegacyPruned && heatingRodTsLegacyPruned.ready ? heatingRodTsLegacyPruned.compactLegacyReference : (heatingRodTsLegacyReference || null))),
            tsLegacyCleanup: heatingRodTsLegacyCleanup || null,
            tsLegacyDebugBridge: heatingRodTsLegacyDebugBridge || null,
            tsLegacyPruned: heatingRodTsLegacyPruned || null,
            tsLegacyRemovalCandidate: heatingRodTsLegacyRemovalCandidate || null,
            tsLegacyFinalCleanup: heatingRodTsLegacyFinalCleanup || null,
            tsLegacyNormalDiagnostics: heatingRodTsLegacyNormalDiagnostics || null,
            legacyDebugBridge: heatingRodTsLegacyDebugBridge || null,
            pvAutomationMinW: Math.round(num(minPvAutomationW, 0)),
            pvAutomationPvNowW: Math.round(num(pvNowForAutomationW, 0)),
            pvAutomationAllowed: !!pvAutomationAllowedByMin,
            nightPvAutoLock,
            gridKnown: !!pvBase.gridKnown,
            gridW: pvBase.gridW,
            importW: Math.round(num(pvBase.importW, 0)),
            importToleranceW: Math.round(num(pvBase.importToleranceW, 0)),
            gridImportActive: !!pvBase.gridImportActive,
            exportW: Math.round(num(pvBase.exportW, 0)),
            currentHeatingRodW: Math.round(currentHeatingRodW),
            currentAutoHeatingRodW: Math.round(currentAutoHeatingRodW),
            storageChargeW: Math.round(num(pvBase.storageChargeW, 0)),
            storageDischargeW: Math.round(num(pvBase.storageDischargeW, 0)),
            dischargeToleranceW: Math.round(num(pvBase.dischargeToleranceW, 0)),
            storageDischargeActive: !!pvBase.storageDischargeActive,
            nonPvEnergyActive: !!pvBase.nonPvEnergyActive,
            storageSocPct: pvBase.storageSocPct,
            storageReserveW: Math.round(num(pvBase.storageReserveW, 0)),
            storageReserveMissingW: Math.round(num(pvBase.storageReserveMissingW, 0)),
            storageChargeUsableW: Math.round(num(pvBase.storageChargeUsableW, 0)),
            storageTargetSocPct: pvBase.storageTargetSocPct,
            nvpSurplusBeforeFlexW: Math.round(num(pvBase.nvpSurplusBeforeFlexW, 0)),
            usableStorageChargeForNvpW: Math.round(num(pvBase.usableStorageChargeForNvpW, 0)),
            stageUpDelaySec: Math.round(num(pvBase.stageUpDelaySec, 0)),
            nvpAvailableW: Math.round(num(pvBase.nvpAvailableW, 0)),
            cmAvailableW: Math.round(num(pvBase.cmAvailableW, 0)),
            availableW: Math.round(num(pvBase.availableW, 0)),
            thermalUsedW: Math.round(thermalUsedW),
            thermalDeductedW: Math.round(thermalDeductedW),
            pvBudgetFromCentral: !!pvBudgetFromCentral,
            forceOff: !!pvBase.forceOff,
            budgetGate: {
                useBudgetGates: !!pvBase.useBudgetGates,
                totalW: pvBase.budgetGateTotalW,
                remainingW: pvBase.budgetGateRemainingW,
                pvW: Math.round(num(pvBase.budgetGatePvW, 0)),
                effectiveW: Math.round(num(pvBase.budgetGateEffectiveW, 0)),
                source: pvBase.budgetGateSource,
                pvBudgetFromCentral: !!pvBase.pvBudgetFromCentral,
                tariffGridImportPreferred: !!pvBase.tariffGridImportPreferred,
                cmActive: pvBase.cmActive,
                cmStaleMeter: !!pvBase.cmStaleMeter,
                cmStaleBudget: !!pvBase.cmStaleBudget,
                cmPvAvailable: pvBase.cmPvAvailable,
                cmPvCapEffectiveW: Math.round(num(pvBase.cmPvCapEffectiveW, 0)),
                cmPvCapRawW: Math.round(num(pvBase.cmPvCapRawW, 0)),
                cmPvSurplusNoEvRawW: Math.round(num(pvBase.cmPvSurplusNoEvRawW, 0)),
                forecastUsable: !!pvBase.forecastUsable,
                forecastStepCapW: Math.round(num(pvBase.forecastStepCapW, 0)),
                protection: budgetProtection || null,
            },
            zeroExport: {
                autoMode: heatingRodAutoMode,
                active: !!zeroExportStrategyActive,
                canProbe: !!(zeroExportStrategyActive && zeroExportInfo.canProbe),
                reason: zeroExportInfo.reason,
                pvNowW: Math.round(num(zeroExportInfo.pvNowW, 0)),
                feedInAtLimit: !!zeroExportInfo.feedInAtLimit,
                feedInLimitW: Math.round(num(zeroExportInfo.feedInLimitW, 0)),
                forecastOk: !!zeroExportInfo.forecastOk,
                forecast: zeroExportInfo.forecast || null,
                forecastPowerW: Math.round(num(zeroExportInfo.forecastPowerW, 0)),
                forecastPotentialW: Math.round(num(zeroExportInfo.forecastPotentialW, 0)),
                livePotentialW: Math.round(num(zeroExportInfo.livePotentialW, 0)),
                zeroPotentialW: Math.round(num(zeroExportInfo.zeroPotentialW, 0)),
                zeroBudgetW: Math.round(num(zeroExportInfo.zeroBudgetW, 0)),
                zeroPotentialSource: zeroExportInfo.zeroPotentialSource || '',
                pvSignalOk: !!zeroExportInfo.pvSignalOk,
                noSoftNonPv: !!zeroExportInfo.noSoftNonPv,
                noHardNonPv: !!zeroExportInfo.noHardNonPv,
                evcsUsedW: Math.round(num(zeroExportInfo.evcsUsedW, 0)),
                storageReserveMissingW: Math.round(num(zeroExportInfo.storageReserveMissingW, 0)),
                storageReady: !!zeroExportInfo.storageReady,
            },
        }));
        await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
        await this._setStateIfChanged('heatingRod.summary.status', (this._devices && this._devices.length) ? `ok_${pvBase.source}${!pvAutomationAllowedByMin ? '_pv_min_block' : ''}${pvBase.forceOff ? '_storage_protect' : ''}${budgetProtection && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : ''}${zeroExportStrategyActive ? `_zero_${String(zeroExportInfo.reason || 'active')}` : ''}` : 'no_devices');
    }
}

module.exports = { HeatingRodControlModule, resolveHeatingRodNightPvAutoLock };
