// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Wertet konfigurierte Schwellwertbedingungen aus und steuert die daraus resultierenden Verbraucheranforderungen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/threshold-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/threshold-control.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/threshold-control.js`.
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
const { withActuatorShadowContext, priorityForOwner } = require('../services/actuator-shadow-arbiter');
const { recordAcceptedActuatorTransition } = require('../services/accepted-power-effects');
const {
    liveSafetyEnvelope,
    evaluateFlexibleLoadRequest,
    commitFlexibleLoadDecision,
    invalidateSafetyEnvelope,
} = require('../services/safety-envelope');


type AnyRecord = Record<string, any>;
type ThresholdOutputType = 'boolean' | 'number';
type ThresholdRule = AnyRecord & {
    idx: number;
    id: string;
    enabled: boolean;
    name: string;
    inputId: string;
    compare: 'above' | 'below';
    threshold: number | null;
    hysteresis: number;
    minOnSec: number;
    minOffSec: number;
    outType: ThresholdOutputType;
    outputId: string;
    onValue: boolean | number;
    offValue: boolean | number;
    maxAgeMs: number;
    safetyRelevant: boolean;
    estimatedPowerW: number;
    safetyApp: string;
    phaseCount: number;
    voltageV: number;
    userCanToggle: boolean;
    userCanSetThreshold: boolean;
    userCanSetMinOnSec: boolean;
    userCanSetMinOffSec: boolean;
    requireReadback: boolean;
};
type HysteresisMemory = {
    active: boolean;
    initialized?: boolean;
    lastOnMs: number;
    lastOffMs: number;
    lastChangeMs: number;
};
type SafeStopResult = { ok: boolean; attempted: boolean; reason: string };

function num(v: unknown, fallback: number): number;
function num(v: unknown, fallback?: null): number | null;
function num(v: unknown, fallback: number | null = null): number | null {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'string' && !v.trim()) return fallback;
    if (typeof v !== 'number' && typeof v !== 'string') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(v: unknown, minV: number, maxV: number, fallback: number): number;
function clamp(v: unknown, minV: number, maxV: number, fallback?: null): number | null;
function clamp(v: unknown, minV: number, maxV: number, fallback: number | null = null): number | null {
    const parsed = num(v, null);
    const n = parsed === null ? fallback : parsed;
    if (n === null) return fallback;
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}

function safeIndex(i: unknown): number {
    const n = Math.round(Number(i) || 0);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
}

/**
 * Schwellwertsteuerung (generischer Regelbaustein).
 *
 * - Installateur konfiguriert Input/Output, Vergleich, Schwellwert, Hysterese und minOn/minOff.
 * - Optional: Endkunde darf Enable/Schwellwert pro Regel über die VIS anpassen.
 *
 * Robustheit:
 * - fehlende/alte Daten -> keine Schreibaktionen
 * - idempotente Writes (nur bei Änderung)
 */
/**
 * Code-Teil: Klasse `ThresholdControlModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ThresholdControlModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: ThresholdControlModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ThresholdControlModule extends BaseModule {
    declare adapter: AnyRecord;
    declare dp: AnyRecord | null;
    _rules: ThresholdRule[];
    _hyst: Map<string, HysteresisMemory>;
    _stateCache: Map<string, unknown>;
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter: AnyRecord, dpRegistry: AnyRecord | null | undefined) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._rules = [];
        /** @type {Map<string, {active:boolean, lastOnMs:number, lastOffMs:number, lastChangeMs:number}>} */
        this._hyst = new Map();
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
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
    _isEnabled(): boolean {
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableThresholdControl);
    }
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getCfg(): AnyRecord {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.threshold && typeof this.adapter.config.threshold === 'object')
            ? this.adapter.config.threshold
            : {};
        return cfg;
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
    async _setStateIfChanged(id: string, val: unknown): Promise<void> {
        const v = (typeof val === 'number' && !Number.isFinite(val)) ? null : val;
        const prev = this._stateCache.get(id);
        if (prev === v) return;
        this._stateCache.set(id, v); if (this._stateCache.size > 1000) { const __rc85Oldest = this._stateCache.keys().next().value; if (__rc85Oldest !== undefined) this._stateCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
        try {
            await this.adapter.setStateAsync(id, v, true);
        } catch (_e) {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `_normalizeCompare`
     * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _normalizeCompare
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normalizeCompare(raw: unknown): 'above' | 'below' {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'below' || s === '<' || s === 'lt' || s === 'less' || s === 'kleiner') return 'below';
        return 'above';
    }
    /**
     * Code-Teil: _normalizeOutType
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normalizeOutType(raw: unknown): 'boolean' | 'number' {
        const s = String(raw || '').trim().toLowerCase();
        if (s === 'bool' || s === 'boolean' || s === 'switch') return 'boolean';
        return 'number';
    }

    /**
     * Code-Teil: Methode `_buildRulesFromConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _buildRulesFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _buildRulesFromConfig(): void {
        const cfg = this._getCfg();
        const list = Array.isArray(cfg.rules) ? cfg.rules : [];

        const out: ThresholdRule[] = [];
        const used = new Set<number>();

        for (let i = 0; i < list.length; i++) {
            const r = list[i] || {};
            const idx = safeIndex(r.idx ?? r.index ?? (i + 1));
            if (used.has(idx)) continue;
            used.add(idx);

            const enabled = (typeof r.enabled === 'boolean') ? !!r.enabled : false;

            const name = String(r.name || '').trim() || `Regel ${idx}`;

            const inputId = String(r.inputId || r.inputObjectId || '').trim();
            const compare = this._normalizeCompare(r.compare);

            const threshold = clamp(r.threshold, -1e12, 1e12, null);
            const hysteresis = Math.max(0, clamp(r.hysteresis, 0, 1e12, 0));

            const minOnSec = Math.max(0, clamp(r.minOnSec, 0, 86400, 0));
            const minOffSec = Math.max(0, clamp(r.minOffSec, 0, 86400, 0));

            const outType = this._normalizeOutType(r.outputType);
            const outputId = String(r.outputId || r.outputObjectId || '').trim();

            const onValue = (outType === 'boolean')
                ? ((r.onValue === undefined || r.onValue === null) ? true : !!r.onValue)
                : clamp(r.onValue, -1e12, 1e12, 1);

            const offValue = (outType === 'boolean')
                ? ((r.offValue === undefined || r.offValue === null) ? false : !!r.offValue)
                : clamp(r.offValue, -1e12, 1e12, 0);

            const maxAgeMs = Math.max(500, Math.round(clamp(r.maxAgeMs, 500, 10 * 60 * 1000, 5000)));
            // Schwellwertregeln können beliebige Aktoren schalten. Für echte
            // Verbraucher ist deshalb ein Leistungsmodell Pflicht. Nur explizit
            // als nicht energierelevant markierte Ausgänge dürfen die zentrale
            // Anschluss-/§14a-Firewall umgehen.
            const safetyRelevant = r.safetyRelevant !== false;
            const estimatedPowerW = Math.max(0, clamp(
                r.estimatedPowerW ?? r.installedPowerW ?? r.maxPowerW,
                0,
                1e12,
                0,
            ));
            const safetyApp = String(r.safetyApp || r.para14aApp || 'custom').trim() || 'custom';
            const phaseCount = Math.max(1, Math.min(3, Math.round(clamp(r.phaseCount ?? r.phases, 1, 3, 3))));
            const voltageV = clamp(r.voltageV, 200, 260, 230);

            const userCanToggle = (typeof r.userCanToggle === 'boolean') ? !!r.userCanToggle : true;
            const userCanSetThreshold = (typeof r.userCanSetThreshold === 'boolean') ? !!r.userCanSetThreshold : true;
            const userCanSetMinOnSec = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : userCanSetThreshold;
            const userCanSetMinOffSec = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : userCanSetThreshold;

            out.push({
                idx,
                id: `r${idx}`,
                enabled,
                name,
                inputId,
                compare,
                threshold,
                hysteresis,
                minOnSec,
                minOffSec,
                outType,
                outputId,
                onValue,
                offValue,
                maxAgeMs,
                safetyRelevant,
                estimatedPowerW,
                safetyApp,
                phaseCount,
                voltageV,
                userCanToggle,
                userCanSetThreshold,
                userCanSetMinOnSec,
                userCanSetMinOffSec,
                requireReadback: r.requireReadback === true,
            });
        }

        out.sort((a, b) => a.idx - b.idx);
        this._rules = out;
    }

    /**
     * Code-Teil: Methode `_getRule`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getRule
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getRule(idx: number): ThresholdRule | null {
        return this._rules.find((r: ThresholdRule) => r && r.idx === idx) || null;
    }

    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init(): Promise<void> {
        // Always create a stable channel tree.
        await this.adapter.setObjectNotExistsAsync('threshold', {
            type: 'channel',
            common: { name: 'Schwellwertsteuerung' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.rules', {
            type: 'channel',
            common: { name: 'Regeln' },
            native: {},
        });

        await this.adapter.setObjectNotExistsAsync('threshold.user', {
            type: 'channel',
            common: { name: 'User' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id: string, name: string, type: string, role: string, unit: string | undefined = undefined, write = false, def: unknown = undefined): Promise<void> => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type,
                    role,
                    read: true,
                    write: !!write,
                    ...(unit ? { unit } : {}),
                    ...(def !== undefined ? { def } : {}),
                },
                native: {},
            });
        };

        /**
         * Code-Teil: Arrow-Funktion `ensureDefault`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: ensureDefault
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const ensureDefault = async (id: string, val: unknown): Promise<void> => {
            try {
                const s = await this.adapter.getStateAsync(id);
                if (!s || s.val === null || s.val === undefined) {
                    await this.adapter.setStateAsync(id, val, true);
                }
            } catch (_e) {
                try { await this.adapter.setStateAsync(id, val, true); } catch (_e2) {}
            }
        };

        // Build rules from current config
        this._buildRulesFromConfig();

        // Create fixed slots (1..10) so the VIS can rely on stable ids.
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.user.r${i}.enabled`, 'Regel aktiv (User)', 'boolean', 'switch.enable', undefined, true, true);
            await mk(`threshold.user.r${i}.threshold`, 'Schwellwert (User)', 'number', 'level', undefined, true, 0);
            await mk(`threshold.user.r${i}.minOnSec`, 'MinOn (User)', 'number', 'value', 's', true, 0);
            await mk(`threshold.user.r${i}.minOffSec`, 'MinOff (User)', 'number', 'value', 's', true, 0);

            await this.adapter.setObjectNotExistsAsync(`threshold.user.r${i}.mode`, {
                type: 'state',
                common: {
                    name: 'Modus (User)',
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: true,
                    min: 0,
                    max: 2,
                    states: { 0: 'Aus', 1: 'Auto', 2: 'An' },
                },
                native: {},
            });


            await ensureDefault(`threshold.user.r${i}.enabled`, true);

            const enState = await this.adapter.getStateAsync(`threshold.user.r${i}.enabled`);
            const enVal = (enState && enState.val !== null && enState.val !== undefined) ? !!enState.val : true;
            await ensureDefault(`threshold.user.r${i}.mode`, enVal ? 1 : 0);


            const rr = this._getRule(i);
            if (rr && rr.threshold !== null && rr.threshold !== undefined) {
                await ensureDefault(`threshold.user.r${i}.threshold`, Number(rr.threshold));
            } else {
                await ensureDefault(`threshold.user.r${i}.threshold`, 0);
            }
            await ensureDefault(`threshold.user.r${i}.minOnSec`, (rr && rr.minOnSec !== undefined && rr.minOnSec !== null) ? Number(rr.minOnSec) : 0);
            await ensureDefault(`threshold.user.r${i}.minOffSec`, (rr && rr.minOffSec !== undefined && rr.minOffSec !== null) ? Number(rr.minOffSec) : 0);
        }

        // Diagnostics per rule
        for (let i = 1; i <= 10; i++) {
            await this.adapter.setObjectNotExistsAsync(`threshold.rules.r${i}`, {
                type: 'channel',
                common: { name: `Regel ${i}` },
                native: {},
            });

            await mk(`threshold.rules.r${i}.configured`, 'Konfiguriert', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.effectiveEnabled`, 'Effektiv aktiv', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.active`, 'Ausgang aktiv', 'boolean', 'indicator');
            // Der Ausgang kann je nach Regel boolean oder numerisch sein. Ein
            // stabiler mixed-State verhindert Cold-Start-Warnungen, wenn der
            // Safe-Stop vor dem ersten aktiven Regel-Tick den AUS-Wert schreibt.
            await mk(`threshold.rules.r${i}.output`, 'Ausgangswert', 'mixed', 'state');
            await mk(`threshold.rules.r${i}.input`, 'Input', 'number', 'value');
            await mk(`threshold.rules.r${i}.thresholdEff`, 'Schwellwert effektiv', 'number', 'value');
            await mk(`threshold.rules.r${i}.status`, 'Status', 'string', 'text');
            await mk(`threshold.rules.r${i}.lastChange`, 'Letzte Umschaltung (ts)', 'number', 'value.time');
            await mk(`threshold.rules.r${i}.lastWriteOk`, 'Letzter Write OK', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.owner`, 'Aktor-Owner', 'string', 'text');
            await mk(`threshold.rules.r${i}.readbackOk`, 'Readback bestätigt', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.safetyRelevant`, 'Netz-/§14a-Sicherheitsrelevant', 'boolean', 'indicator');
            await mk(`threshold.rules.r${i}.estimatedPowerW`, 'Leistungsmodell', 'number', 'value.power', 'W');
            await mk(`threshold.rules.r${i}.safetyDecision`, 'Safety-Entscheidung', 'string', 'text');
        }

        // Register user states (read) in dpRegistry for deterministic reads
        try {
            const ns = String(this.adapter.namespace || '').trim();
            if (ns && this.dp) {
                for (let i = 1; i <= 10; i++) {
                    await this.dp.upsert({ key: `thr.user.r${i}.enabled`, objectId: `${ns}.threshold.user.r${i}.enabled`, dataType: 'boolean', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.threshold`, objectId: `${ns}.threshold.user.r${i}.threshold`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.mode`, objectId: `${ns}.threshold.user.r${i}.mode`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOnSec`, objectId: `${ns}.threshold.user.r${i}.minOnSec`, dataType: 'number', direction: 'in' });
                    await this.dp.upsert({ key: `thr.user.r${i}.minOffSec`, objectId: `${ns}.threshold.user.r${i}.minOffSec`, dataType: 'number', direction: 'in' });
                }
            }
        } catch (_e) {
            // ignore
        }

        // Register rule input/output datapoints (if mapped)
        try {
            if (this.dp) {
                for (const r of this._rules) {
                    if (r.inputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.in`, objectId: r.inputId, dataType: 'number', direction: 'in' });
                    }
                    if (r.outputId) {
                        await this.dp.upsert({ key: `thr.${r.id}.out`, objectId: r.outputId, dataType: (r.outType === 'boolean' ? 'boolean' : 'number'), direction: 'out' });
                    }
                }
            }
        } catch (_e) {
            // ignore
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
    _ruleOwner(r: ThresholdRule, isManual: boolean): string {
        return isManual ? `manual.threshold.${r.id}` : `threshold.${r.id}`;
    }

    _ruleHasExclusiveAuthority(r: ThresholdRule, owner: string): boolean {
        if (String(owner || '').startsWith('manual.')) return true;
        const matrix = this.adapter && this.adapter._stageAActuatorOwnerById;
        const row = matrix && typeof matrix === 'object' ? matrix[r.outputId] : null;
        const activeOwners = Array.isArray(row && row.activeOwners)
            ? row.activeOwners.map((value: unknown) => String(value || '').trim()).filter(Boolean)
            : [];
        return activeOwners.length === 1 && activeOwners[0] === owner;
    }

    /**
     * Fail-closed Lifecycle-Stopp: Beim Abschalten der App werden alle
     * konfigurierten Regel-Ausgaenge auf ihren expliziten AUS-Wert geschrieben.
     * Das gilt auch fuer nicht energierelevante Smart-Home-Ausgaenge, damit eine
     * deaktivierte Regel keinen zuvor gesetzten Zustand zuruecklaesst.
     */
    async deactivate(): Promise<AnyRecord> {
        this._buildRulesFromConfig();
        const failures: string[] = [];
        let attempted = 0;
        for (const r of this._rules || []) {
            if (!r || !r.outputId) continue;
            try {
                attempted += 1;
                const stopped = await this._forceRuleSafeOff(r, 'module-disabled-safe-stop');
                if (!stopped.ok) failures.push(`${r.id}:${stopped.reason || 'safe-stop-not-confirmed'}`);
            } catch (error: any) {
                failures.push(`${r && r.id || 'unknown'}:${String(error instanceof Error ? error.message : error)}`);
            }
        }
        if (failures.length) throw new Error(`threshold-safe-stop-failed:${failures.join(',')}`);
        return { ok: true, attempted, stopped: attempted };
    }

    /**
     * Erzwingt den expliziten AUS-Wert mit Safety-Prioritaet. Diese Routine wird
     * nicht nur beim Abschalten des gesamten Moduls verwendet, sondern auch,
     * wenn eine einzelne Regel deaktiviert, unvollstaendig oder stale wird.
     * Damit kann kein zuvor eingeschalteter Verbraucher unkontrolliert weiterlaufen.
     */
    async _forceRuleSafeOff(r: ThresholdRule, status = 'safe-stop'): Promise<SafeStopResult> {
        if (!r || !r.outputId) return { ok: true, attempted: false, reason: 'no-output' };
        const dp = this.dp;
        if (!dp || typeof dp.upsert !== 'function') return { ok: false, attempted: false, reason: 'dp-registry-missing' };

        const outKey = `thr.${r.id}.out`;
        await dp.upsert({
            key: outKey,
            objectId: r.outputId,
            dataType: r.outType,
            direction: 'out',
        });
        this._clearActuatorWriteCache(outKey);

        const written = await withActuatorShadowContext(this.adapter, {
            owner: `safety.threshold.${r.id}.hardware-stop`,
            module: 'thresholdControl',
            priority: priorityForOwner('safety.hardware-stop'),
            reason: `${r.name}: fail-closed off`,
            leaseMs: 30000,
            kind: 'safety-stop',
            enforceAuthority: true,
        }, async () => (r.outType === 'boolean'
            ? dp.writeBoolean(outKey, !!r.offValue, false)
            : dp.writeNumber(outKey, Number(r.offValue), false)));

        const actual = await this._readRuleOutput(r);
        const readback = this._readbackMatches(r, false, actual);
        const accepted = written === true || written === null;
        const confirmed = readback === true || (accepted && r.requireReadback !== true);
        if (!confirmed) {
            return {
                ok: false,
                attempted: true,
                reason: !accepted ? 'write-not-accepted' : 'readback-mismatch',
            };
        }

        const now = Date.now();
        this._hyst.set(r.id, {
            active: false,
            initialized: true,
            lastOnMs: 0,
            lastOffMs: now,
            lastChangeMs: now,
        });
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.effectiveEnabled`, false);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.output`, r.offValue);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.active`, false);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.lastWriteOk`, accepted);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.readbackOk`, readback === true);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.lastChange`, now);
        await this._setStateIfChanged(`threshold.rules.r${r.idx}.status`, status);
        return { ok: true, attempted: true, reason: status };
    }

    async _writeRuleOutput(r: ThresholdRule, want: boolean, isManual: boolean): Promise<boolean | null> {
        const owner = this._ruleOwner(r, isManual);
        const reason = `${r.name}: ${want ? 'on' : 'off'}`;
        const enforceAuthority = this._ruleHasExclusiveAuthority(r, owner);
        return withActuatorShadowContext(this.adapter, {
            owner, module: 'thresholdControl', priority: priorityForOwner(owner),
            reason, leaseMs: isManual ? 5 * 60 * 1000 : 20000,
            kind: isManual ? 'manual-threshold' : 'threshold-rule', enforceAuthority,
        }, async () => {
            if (!this.dp) return false;
            const outKey = `thr.${r.id}.out`;
            return r.outType === 'boolean'
                ? this.dp.writeBoolean(outKey, want ? !!r.onValue : !!r.offValue, false)
                : this.dp.writeNumber(outKey, want ? Number(r.onValue) : Number(r.offValue), false);
        });
    }

    async _readRuleOutput(r: ThresholdRule): Promise<unknown> {
        if (!r || !r.outputId || !this.adapter || typeof this.adapter.getForeignStateAsync !== 'function') return null;
        try {
            const state = await this.adapter.getForeignStateAsync(r.outputId);
            return state && state.val !== undefined ? state.val : null;
        } catch (_error) {
            return null;
        }
    }

    _readbackMatches(r: ThresholdRule, want: boolean, value: unknown): boolean | null {
        if (value === null || value === undefined) return null;
        const expected = want ? r.onValue : r.offValue;
        if (r.outType === 'boolean') return !!value === !!expected;
        const a = Number(value); const b = Number(expected);
        return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.001) : false;
    }

    async tick(): Promise<void> {
        const enabled = this._isEnabled();
        const now = Date.now();
        let safetyFailure = '';

        // Update configured flags even if module disabled (UI diagnostics)
        for (let i = 1; i <= 10; i++) {
            const r = this._getRule(i);
            const configured = !!(r && r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            await this._setStateIfChanged(`threshold.rules.r${i}.configured`, configured);
            if (!enabled) {
                await this._setStateIfChanged(`threshold.rules.r${i}.effectiveEnabled`, false);
                await this._setStateIfChanged(`threshold.rules.r${i}.status`, configured ? 'disabled' : 'unconfigured');
            }
        }

        if (!enabled) return;
        const dp = this.dp;
        if (!dp) {
            const reason = 'threshold-dp-registry-missing';
            invalidateSafetyEnvelope(this.adapter, reason, {
                generation: this.adapter?._emsSafetyCycle?.generation,
                emergencyStop: true,
            });
            throw new Error(reason);
        }

        for (const r of this._rules) {
            const id = r.id;
            const idx = r.idx;

            const configured = !!(r.inputId && r.outputId && r.threshold !== null && r.threshold !== undefined);
            if (!configured) {
                await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, false);
                const stopped = await this._forceRuleSafeOff(r, 'unconfigured-safe-stop');
                if (!stopped.ok) {
                    safetyFailure = safetyFailure || `threshold-unconfigured-stop-failed:${r.id}:${stopped.reason}`;
                    invalidateSafetyEnvelope(this.adapter, safetyFailure, {
                        generation: this.adapter?._emsSafetyCycle?.generation,
                        emergencyStop: true,
                    });
                } else if (!stopped.attempted) {
                    await this._setStateIfChanged(`threshold.rules.r${idx}.status`, 'unconfigured');
                }
                continue;
            }

            // User overrides (optional)
            let userEnabled = (this.dp && r.userCanToggle) ? this.dp.getBoolean(`thr.user.r${idx}.enabled`, true) : true;
            // User-Modus (0=Aus, 1=Auto, 2=An). Falls nicht vorhanden: Fallback auf enabled.
            let userMode = 1;
            if (this.dp && r.userCanToggle) {
                const mv = this.dp.getNumber(`thr.user.r${idx}.mode`, NaN);
                if (Number.isFinite(mv)) userMode = Math.max(0, Math.min(2, Math.round(mv)));
                else userMode = userEnabled ? 1 : 0;
            }
            const isManual = (userMode === 0 || userMode === 2);


            let thrEff = Number(r.threshold);
            if (this.dp && r.userCanSetThreshold) {
                const ut = this.dp.getNumber(`thr.user.r${idx}.threshold`, thrEff);
                if (Number.isFinite(ut)) thrEff = ut;
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.thresholdEff`, thrEff);

            const effEnabled = !!(r.enabled && (isManual ? true : userEnabled));
            await this._setStateIfChanged(`threshold.rules.r${idx}.effectiveEnabled`, effEnabled);

            await this._setStateIfChanged(`threshold.rules.r${idx}.owner`, this._ruleOwner(r, isManual));
            await this._setStateIfChanged(`threshold.rules.r${idx}.safetyRelevant`, r.safetyRelevant === true);
            await this._setStateIfChanged(`threshold.rules.r${idx}.estimatedPowerW`, Math.round(Math.max(0, Number(r.estimatedPowerW) || 0)));
            if (!effEnabled) {
                const stopped = await this._forceRuleSafeOff(r, 'inactive-safe-stop');
                if (!stopped.ok) {
                    safetyFailure = safetyFailure || `threshold-disabled-stop-failed:${r.id}:${stopped.reason}`;
                    invalidateSafetyEnvelope(this.adapter, safetyFailure, {
                        generation: this.adapter?._emsSafetyCycle?.generation,
                        emergencyStop: true,
                    });
                }
                continue;
            }

            // Input read (freshness)
            const inKey = `thr.${id}.in`;
            let input = null;
            if (this.dp) {
                input = this.dp.getNumberFresh(inKey, r.maxAgeMs, null);
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.input`, input);

            if (typeof input !== 'number') {
                if (!isManual) {
                    const stopped = await this._forceRuleSafeOff(r, 'stale-safe-stop');
                    if (!stopped.ok) {
                        safetyFailure = safetyFailure || `threshold-stale-stop-failed:${r.id}:${stopped.reason}`;
                        invalidateSafetyEnvelope(this.adapter, safetyFailure, {
                            generation: this.adapter?._emsSafetyCycle?.generation,
                            emergencyStop: true,
                        });
                    }
                    continue;
                }
                // Manuell: keine Eingangsprüfung erforderlich
            }

            // State memory
            const mem = this._hyst.get(id) || { active: false, initialized: false, lastOnMs: 0, lastOffMs: 0, lastChangeMs: 0 };
            const outputBefore = await this._readRuleOutput(r);
            const onReadback = this._readbackMatches(r, true, outputBefore);
            const offReadback = this._readbackMatches(r, false, outputBefore);
            if (!mem.initialized && (onReadback === true || offReadback === true)) { mem.active = onReadback === true; mem.initialized = true; }
            let want = mem.active;
            let status = mem.active ? 'active' : 'inactive';

            if (isManual) {
                // Manuelle Übersteuerung: sofortiges An/Aus
                want = (userMode === 2);
                status = want ? 'manual_on' : 'manual_off';
            } else {
                // Hysteresis thresholds
                const hyst = Math.max(0, Number(r.hysteresis || 0));
                let onThr = thrEff;
                let offThr = thrEff;

                if (r.compare === 'above') offThr = thrEff - hyst;
                else offThr = thrEff + hyst;

                if (!mem.active) {
                    // OFF -> ON
                    if (r.compare === 'above') {
                        if (input >= onThr) want = true;
                    } else {
                        if (input <= onThr) want = true;
                    }
                } else {
                    // ON -> OFF
                    if (r.compare === 'above') {
                        if (input <= offThr) want = false;
                    } else {
                        if (input >= offThr) want = false;
                    }
                }

                // minOn/minOff constraints (anti-flatter)
                // Optional: these parameters can be Endkunden-tunable via VIS (if enabled per rule)
                const canUserMinOn = (typeof r.userCanSetMinOnSec === 'boolean') ? !!r.userCanSetMinOnSec : !!r.userCanSetThreshold;
                const canUserMinOff = (typeof r.userCanSetMinOffSec === 'boolean') ? !!r.userCanSetMinOffSec : !!r.userCanSetThreshold;

                const userMinOnSec = (this.dp && canUserMinOn) ? dp.getNumberFresh(`thr.user.r${idx}.minOnSec`, 7 * 24 * 3600 * 1000, null) : null;
                const userMinOffSec = (this.dp && canUserMinOff) ? dp.getNumberFresh(`thr.user.r${idx}.minOffSec`, 7 * 24 * 3600 * 1000, null) : null;

                const effMinOnSec = (userMinOnSec !== null && userMinOnSec !== undefined && Number.isFinite(userMinOnSec)) ? userMinOnSec : Number(r.minOnSec || 0);
                const effMinOffSec = (userMinOffSec !== null && userMinOffSec !== undefined && Number.isFinite(userMinOffSec)) ? userMinOffSec : Number(r.minOffSec || 0);

                const minOnMs = Math.max(0, Math.round(effMinOnSec * 1000));
                const minOffMs = Math.max(0, Math.round(effMinOffSec * 1000));

                if (!mem.active && want) {
                    // pending ON?
                    if (minOffMs > 0 && mem.lastOffMs > 0 && (now - mem.lastOffMs) < minOffMs) {
                        want = false;
                        status = 'pending_on';
                    }
                } else if (mem.active && !want) {
                    // pending OFF?
                    if (minOnMs > 0 && mem.lastOnMs > 0 && (now - mem.lastOnMs) < minOnMs) {
                        want = true;
                        status = 'pending_off';
                    }
                }
            }

            let safetyDecision = null;
            let safetyStatusOverride = '';
            const effectiveBefore = onReadback === true ? true : (offReadback === true ? false : !!mem.active);
            if (r.safetyRelevant === true) {
                const runtimeSafetyRequired = !!(this.adapter && (
                    this.adapter._nwSafetyEnvelopeRequired === true
                    || this.adapter._emsSafetyCycle
                    || this.adapter.emsEngine
                ));
                const estimatedPowerW = Math.max(0, Number(r.estimatedPowerW) || 0);
                if (want && runtimeSafetyRequired && !(estimatedPowerW > 0)) {
                    // Ohne Leistung kann weder Netzanschlussreserve noch §14a-Cap
                    // belastbar bilanziert werden. Produktiv gilt daher fail-closed.
                    want = false;
                    safetyStatusOverride = 'safety_missing_power_model';
                    safetyDecision = {
                        requestedW: 0,
                        allowedW: 0,
                        forceZero: true,
                        clamped: true,
                        reason: 'threshold-estimated-power-missing',
                        key: `threshold:${r.id}`,
                        app: r.safetyApp || 'custom',
                        envelopeGeneration: Number(this.adapter?._emsSafetyCycle?.generation) || 0,
                    };
                } else {
                    if (runtimeSafetyRequired) {
                        try { liveSafetyEnvelope(this.adapter, this.dp, { now: Date.now() }); } catch (error) {
                            invalidateSafetyEnvelope(this.adapter, `threshold-live-safety-build-failed:${r.id}`, {
                                generation: this.adapter?._emsSafetyCycle?.generation,
                                emergencyStop: true,
                            });
                        }
                    }
                    safetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                        key: `threshold:${r.id}`,
                        app: r.safetyApp || 'custom',
                        deviceKey: r.id,
                        requestedW: want ? estimatedPowerW : 0,
                        currentActualW: effectiveBefore ? estimatedPowerW : 0,
                        currentActualFresh: onReadback === true || offReadback === true || mem.initialized === true,
                        phaseCount: r.phaseCount,
                        voltageV: r.voltageV,
                        deviceCapW: estimatedPowerW > 0 ? estimatedPowerW : null,
                        now: Date.now(),
                    });
                    if (want && (safetyDecision.forceZero === true || Number(safetyDecision.allowedW) + 0.5 < estimatedPowerW)) {
                        // Relais-/Schwellwertausgänge sind nicht stufenlos. Reicht
                        // die Freigabe nicht für die vollständige Last, bleibt AUS.
                        want = false;
                        safetyStatusOverride = String(safetyDecision.reason || 'safety_blocked');
                    }
                }
            }
            await this._setStateIfChanged(`threshold.rules.r${idx}.safetyDecision`, String(safetyDecision && safetyDecision.reason || (r.safetyRelevant ? 'not-evaluated' : 'not-safety-relevant')));

            let wrote: boolean | null = false;
            const commandChanged = want !== effectiveBefore;
            try { wrote = await this._writeRuleOutput(r, want, isManual); } catch (_e) { wrote = false; }
            const readbackAfter = await this._readRuleOutput(r);
            const readbackOk = this._readbackMatches(r, want, readbackAfter);
            const accepted = wrote === true || wrote === null;
            const confirmed = readbackOk === true || (accepted && r.requireReadback !== true);

            // Schwellwertausgänge besitzen kein belastbares Leistungsmodell. Ein neu
            // akzeptierter Zustandswechsel wird deshalb als unsichere Laständerung
            // markiert. Die finale PV-/WR-Regelung wartet dann auf den nächsten
            // frischen NVP-Wert, statt im selben Zyklus gegen einen alten Messwert zu
            // regeln. Ein deduplizierter Write (`null`) ist keine neue physische
            // Änderung und wird nicht erneut verbucht.
            if (wrote === true && commandChanged) {
                recordAcceptedActuatorTransition(this.adapter, {
                    key: `threshold:${r.id}`,
                    accepted: true,
                    commandChanged: true,
                    kind: 'load',
                    source: 'thresholdControl',
                    reason: `${r.name}: ${want ? 'on' : 'off'}`,
                });
            }

            if (confirmed) {
                if (safetyDecision) commitFlexibleLoadDecision(this.adapter, safetyDecision, true);
                if (want !== mem.active || !mem.initialized) {
                    mem.active = want; mem.initialized = true; mem.lastChangeMs = now;
                    if (want) mem.lastOnMs = now; else mem.lastOffMs = now;
                    await this._setStateIfChanged(`threshold.rules.r${idx}.lastChange`, now);
                }
                status = safetyStatusOverride || (isManual ? (want ? 'manual_on' : 'manual_off') : (want ? 'active' : 'inactive'));
            } else if (!accepted) {
                status = 'write_blocked_or_failed';
                if (r.safetyRelevant === true && (effectiveBefore === true || (safetyDecision && Number(safetyDecision.requestedW) > 0))) {
                    safetyFailure = safetyFailure || `threshold-safety-write-failed:${r.id}`;
                    invalidateSafetyEnvelope(this.adapter, safetyFailure, {
                        generation: this.adapter?._emsSafetyCycle?.generation,
                        emergencyStop: true,
                    });
                }
            } else {
                status = 'readback_pending';
            }
            this._hyst.set(id, mem);
            await this._setStateIfChanged(`threshold.rules.r${idx}.lastWriteOk`, accepted);
            await this._setStateIfChanged(`threshold.rules.r${idx}.readbackOk`, readbackOk === true);

            await this._setStateIfChanged(`threshold.rules.r${idx}.active`, mem.active);
            await this._setStateIfChanged(`threshold.rules.r${idx}.status`, status);
        }
        if (safetyFailure) {
            try { this.adapter?._nwRequestImmediateEmsTick?.('safety:threshold-write', 100); } catch (_tickError) {}
            throw new Error(safetyFailure);
        }
    }
}

module.exports = { ThresholdControlModule };
