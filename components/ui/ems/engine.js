/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/engine.ts
 * Quell-Hash: sha256:3924e01d5b015730f7b29024f3ee9fc90ee8b7758cb53814bbcb6438f7b93202
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/engine.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Startet und beendet die EMS-Laufzeit; koordiniert periodische und durch Bedienung oder NVP-Messung ausgelöste Regelzyklen.
 * Daten und Wirkung: Liest Adapter-Konfiguration und Messdaten über DatapointRegistry; übergibt einen gemeinsamen Kontext an ModuleManager. Tick-Sperre und getrennte Heartbeats verhindern parallele Regelzyklen und falsche Offline-Anzeigen.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/engine.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/engine.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/engine.js`.
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
 * Datei: ems/engine.js
 * Rolle im Projekt: EMS-Engine.
 * Zweck: Koordiniert zyklische EMS-Ausführung und reicht Messbasis an Module weiter.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: EMS-Engine-Kapsel: verbindet DatapointRegistry, ModuleManager und zyklische EMS-Berechnungen.
 * Zusammenhänge:
 * - Lädt Module aus ems/modules/* und nutzt ems/datapoints.js.
 * - Wird von main.js initialisiert und gesteuert.
 * Wartungshinweise:
 * - Scheduler/Timer müssen beim Adapter-Unload sauber beendet werden.
 */
'use strict';
const { DatapointRegistry } = require('./datapoints');
const { ModuleManager } = require('./module-manager');
const { applyStorageMeasurementOverrides } = require('./services/storage-override-bridge');
const { buildNvpSnapshotFromRegistry } = require('./services/measurement-freshness');
const { installActuatorShadowArbiter } = require('./services/actuator-shadow-arbiter');
const { deriveChargingConnectorCapacityW, computeChargingInfrastructureCapacity, } = require('./charging-budget-helpers');
/** Code-Teil: clampNumber – bestehender Helfer; Aufrufer und State-/API-Verträge bei Änderungen mitprüfen. */
function clampNumber(n, min, max, fallback) {
    const v = Number(n);
    if (!Number.isFinite(v))
        return fallback;
    return Math.min(max, Math.max(min, v));
}
/**
 * Embedded EMS engine wrapper for nexowatt-ui.
 *
 * Sprint 2.x:
 * - ChargingManagementModule (from nexowatt-multiuse) runs INSIDE the VIS adapter
 * - Per Ladepunkt runtime mode: auto|pv|minpv|boost via chargingManagement.wallboxes.*.userMode
 *
 * Sprint 2.2:
 * - Stationsgruppen (gemeinsame Leistungsgrenze) + Ladepunkt-/Connector-Begriff
 *
 * Sprint 3:
 * - Weitere Multiuse-Module (z.B. Peak Shaving) via ModuleManager
 * - Konfiguration in Admin-UI (jsonConfig) über enablePeakShaving / peakShaving.*
 */
/**
 * Code-Teil: Klasse `EmsEngine`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: EmsEngine. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Engine/Scheduler, der Regelungsmodule zyklisch ausführt.
/**
 * Klasse: EmsEngine
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class EmsEngine {
    /**
     * @param {any} adapter
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.dp = null;
        this.mm = null;
        this._timer = null;
        this._intervalMs = 1000;
        // Independent scheduler liveness. It is deliberately separate from the
        // complete EMS tick, because a legitimate long-running module must not make
        // EOS Admin classify the whole adapter as offline.
        this._schedulerHeartbeatTimer = null;
        this._schedulerHeartbeatRunning = false;
        this._schedulerHeartbeatIntervalMs = 4000;
        this._schedulerHeartbeatSequence = 0;
        // Reaktionspfad für Bedienänderungen: Ein Moduswechsel im Kundenfrontend
        // soll nicht bis zum nächsten regulären Scheduler-Tick warten. Der kurze
        // Debounce fasst API-Write und nachfolgenden StateChange zu genau einem
        // zusätzlichen Tick zusammen; der Tick-Mutex verhindert Überschneidungen.
        this._immediateTickTimer = null;
        this._immediateTickPending = false;
        this._immediateTickReason = '';
        this._immediateTickDebounceMs = 25;
        // NVP-Schnellregler: Neue Zählerproben sollen nicht zusätzlich bis zum
        // nächsten 1-s-Scheduler warten. 75 ms fassen getrennte Import-/Export-
        // Updates derselben Zählerprobe zusammen, bleiben aber deutlich schneller
        // als der reguläre Watchdog-Tick.
        this._nvpFastTickDebounceMs = 75;
        this._fastNvpTickCount = 0;
        this._fastNvpTickLastRequestMs = 0;
        this._nvpSourceIds = new Set();
        this._lastTickStartMs = 0;
        this._lastTickEndMs = 0;
        // Tick mutex (Phase 4.0): prevent overlapping async ticks.
        this._tickRunning = false;
        this._tickSkipCount = 0;
        this._tickSequence = 0;
        this._activeTickId = 0;
        this._staleTickRecoveryCount = 0;
        this._lastStaleTickRecoveryMs = 0;
        this._tickStaleAfterMs = 30000;
        // derived/internal state ids
        this._gridPowerId = '';
        this._gridPowerRawId = '';
        /** @type {number|null} */
        this._gridPowerAvgW = null;
        /** @type {number} */
        this._gridPowerLastTs = 0;
        this._gridPowerLastResolutionSource = '';
    }
    /**
     * Code-Teil: Methode `_setInterval`
     * Zweck: startet einen wiederholten Timer mit Abschaltprüfung des Adapters.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setInterval
     * Zweck: Startet einen wiederholten Timer; der Callback bestimmt die spätere Wirkung.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Ablauf und Zusammenhang: Startet einen wiederholten, gegen Adapter-Shutdown abgesicherten Timer. Verwendet den ioBroker-Timer, sofern verfügbar; dies ist eine Timer-Hilfe und schreibt selbst keine Anlagen-States.
     */
    _setInterval(fn, ms) {
        const a = this.adapter;
        if (!a || a._nwShuttingDown || typeof fn !== 'function')
            return null;
        const guarded = (...args) => {
            if (!this.adapter || this.adapter._nwShuttingDown)
                return;
            return fn(...args);
        };
        return (typeof a.setInterval === 'function') ? a.setInterval(guarded, ms) : setInterval(guarded, ms);
    }
    /** Code-Teil: _clearInterval – bestehender Helfer; Aufrufer und State-/API-Verträge bei Änderungen mitprüfen. */
    /**
     * Ablauf und Zusammenhang: Beendet den wiederholten Timer über die passende Adapter- oder Node-Schnittstelle. Wird beim Stoppen gebraucht, damit keine Regelzyklen weiterlaufen.
     */
    _clearInterval(timer) {
        if (!timer)
            return;
        const a = this.adapter;
        if (a && typeof a.clearInterval === 'function')
            a.clearInterval(timer);
        else
            clearInterval(timer);
    }
    /**
     * Code-Teil: _setTimeout
     * Zweck: Startet einen shutdown-sicheren Einmal-Timer. Bedienänderungen dürfen
     * während des Adapter-Unloads keinen neuen ioBroker-Timer mehr erzeugen.
     */
    _setTimeout(fn, ms) {
        const a = this.adapter;
        if (!a || a._nwShuttingDown || typeof fn !== 'function')
            return null;
        const guarded = (...args) => {
            if (!this.adapter || this.adapter._nwShuttingDown)
                return;
            return fn(...args);
        };
        return (typeof a.setTimeout === 'function') ? a.setTimeout(guarded, ms) : setTimeout(guarded, ms);
    }
    /**
     * Code-Teil: _clearTimeout
     * Zweck: Beendet den Einmal-Timer des schnellen Bedienpfads beim Stoppen der
     * Engine, damit kein verspäteter EMS-Tick nach dem Unload startet.
     */
    _clearTimeout(timer) {
        if (!timer)
            return;
        const a = this.adapter;
        if (a && typeof a.clearTimeout === 'function')
            a.clearTimeout(timer);
        else
            clearTimeout(timer);
    }
    /**
     * Code-Teil: _scheduleImmediateTick
     * Zweck: Plant genau einen zusätzlichen EMS-Tick nach einer Bedienänderung.
     * Läuft gerade ein regulärer Tick, bleibt die Anforderung vorgemerkt und wird
     * im finally-Block dieses Ticks erneut eingeplant. Dadurch gibt es weder
     * parallele Regelzyklen noch unnötige Wartezeit bis zum nächsten Intervall.
     */
    _scheduleImmediateTick(delayMs = this._immediateTickDebounceMs) {
        if (!this.adapter || this.adapter._nwShuttingDown || !this._immediateTickPending)
            return false;
        if (this._immediateTickTimer)
            return true;
        const delay = clampNumber(delayMs, 0, 1000, this._immediateTickDebounceMs);
        this._immediateTickTimer = this._setTimeout(async () => {
            this._immediateTickTimer = null;
            if (!this.adapter || this.adapter._nwShuttingDown || !this._immediateTickPending)
                return;
            // Ein bereits laufender Tick bleibt führend. Sein finally-Block plant die
            // weiterhin vorgemerkte Bedienanforderung unmittelbar danach neu ein.
            if (this._tickRunning)
                return;
            const reason = String(this._immediateTickReason || 'external-control');
            this._immediateTickPending = false;
            this._immediateTickReason = '';
            try {
                // Individual modules and hardware writes own their watchdogs. Wrapping
                // the complete EMS tick in another Promise.race could otherwise let a
                // second cycle mutate the same budgets while the first one still runs.
                await this.tick();
            }
            catch (err) {
                try {
                    this.adapter.log.warn(`[EMS] immediate tick failed (${reason}): ${err?.message || err}`);
                }
                catch (_e) { }
            }
        }, delay);
        return !!this._immediateTickTimer;
    }
    /**
     * Code-Teil: requestImmediateTick
     * Zweck: Öffentliche, debouncte Reaktionsschnittstelle für EVCS-Modus-,
     * Freigabe-, Ziel- und Phasenänderungen. Harte EMS-Grenzen werden nicht
     * umgangen; es wird lediglich der normale zentrale Regelzyklus früher gestartet.
     */
    requestImmediateTick(reason = 'external-control', delayMs = this._immediateTickDebounceMs) {
        if (!this.adapter || this.adapter._nwShuttingDown || !this.dp || !this.mm)
            return false;
        this._immediateTickPending = true;
        this._immediateTickReason = String(reason || 'external-control').slice(0, 160);
        return this._scheduleImmediateTick(delayMs);
    }
    /**
     * Code-Teil: requestNvpTick
     * Zweck: Startet nach einer frischen externen NVP-Zählerprobe einen debouncten
     * vollständigen EMS-Regelzyklus. Der normale Modulmanager und alle Safety-/
     * Authority-Gates bleiben unverändert; nur die zusätzliche Wartezeit bis zum
     * periodischen Scheduler entfällt.
     */
    requestNvpTick(reason = 'nvp-sample') {
        if (!this.adapter || this.adapter._nwShuttingDown || !this.dp || !this.mm)
            return false;
        const cfg = this.adapter.config || {};
        const storageRuntimeRelevant = cfg.enableStorageControl === true || cfg.enableStorageFarm === true;
        if (!storageRuntimeRelevant)
            return false;
        this._fastNvpTickCount += 1;
        this._fastNvpTickLastRequestMs = Date.now();
        try {
            this.adapter.setStateAsync('ems.core.fastNvpTickCount', { val: Math.round(this._fastNvpTickCount), ack: true }).catch(() => { });
            this.adapter.setStateAsync('ems.core.lastFastNvpTickRequest', { val: this._fastNvpTickLastRequestMs, ack: true }).catch(() => { });
        }
        catch (_e) { }
        return this.requestImmediateTick(String(reason || 'nvp-sample'), this._nvpFastTickDebounceMs);
    }
    /**
     * Code-Teil: handleExternalStateChange
     * Zweck: Erkennt eine neue Probe eines tatsächlich konfigurierten externen
     * NVP-Datenpunkts. Interne NexoWatt-Normalisierungs- und Diagnose-States sind
     * bewusst nicht in `_nvpSourceIds` enthalten und können daher keinen Tick-Loop
     * auslösen.
     */
    handleExternalStateChange(id, state) {
        if (!state || !this._nvpSourceIds || this._nvpSourceIds.size === 0)
            return false;
        const objectId = String(id || '').trim();
        if (!objectId || !this._nvpSourceIds.has(objectId))
            return false;
        const numericValue = Number(state.val);
        if (!Number.isFinite(numericValue))
            return false;
        return this.requestNvpTick(`nvp:${objectId.slice(-96)}`);
    }
    /**
     * Ensure small internal helper states (derived values) exist.
     */
    /**
     * Code-Teil: Methode `_ensureInternalStates`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /** Code-Teil: _ensureInternalStates – bestehender Helfer; Aufrufer und State-/API-Verträge bei Änderungen mitprüfen. */
    async _ensureInternalStates() {
        const a = this.adapter;
        await a.setObjectNotExistsAsync('ems', {
            type: 'channel',
            common: { name: 'EMS (intern)' },
            native: {},
        });
        // Core channel for runtime/tick diagnostics (Phase 4.0)
        await a.setObjectNotExistsAsync('ems.core', {
            type: 'channel',
            common: { name: 'EMS Core' },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.tickRunning', {
            type: 'state',
            common: {
                name: 'Tick running',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: false,
                def: false,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.schedulerHeartbeatAt', {
            type: 'state',
            common: {
                name: 'Independent EMS scheduler heartbeat (ts)',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.schedulerHeartbeatSequence', {
            type: 'state',
            common: {
                name: 'Independent EMS scheduler heartbeat sequence',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.schedulerAlive', {
            type: 'state',
            common: {
                name: 'EMS scheduler process alive',
                type: 'boolean',
                role: 'indicator.connected',
                read: true,
                write: false,
                def: false,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.tickSkipCount', {
            type: 'state',
            common: {
                name: 'Tick skipped (re-entrancy) count',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.fastNvpTickCount', {
            type: 'state',
            common: {
                name: 'Fast NVP tick request count',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.lastFastNvpTickRequest', {
            type: 'state',
            common: {
                name: 'Last fast NVP tick request (ts)',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.lastTickStart', {
            type: 'state',
            common: {
                name: 'Last tick start (ts)',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.lastTickEnd', {
            type: 'state',
            common: {
                name: 'Last completed tick (ts)',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.staleTickRecoveryCount', {
            type: 'state',
            common: {
                name: 'Recovered stale EMS tick locks',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.lastStaleTickRecovery', {
            type: 'state',
            common: {
                name: 'Last stale EMS tick recovery (ts)',
                type: 'number',
                role: 'value.time',
                read: true,
                write: false,
                def: 0,
            },
            native: {},
        });
        for (const [id, name] of [
            ['ems.core.lastModuleStarted', 'Last EMS module started'],
            ['ems.core.lastModuleCompleted', 'Last EMS module completed'],
            ['ems.core.lastModuleTimeout', 'Last EMS module timeout/error'],
        ]) {
            await a.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name,
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: false,
                    def: '',
                },
                native: {},
            });
        }
        await a.setObjectNotExistsAsync('ems.core.lastTickDurationMs', {
            type: 'state',
            common: {
                name: 'Last tick duration (ms)',
                type: 'number',
                role: 'value.interval',
                read: true,
                write: false,
                def: 0,
                unit: 'ms',
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.core.lastTickError', {
            type: 'state',
            common: {
                name: 'Last tick error',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                def: '',
            },
            native: {},
        });
        // Raw net grid power (Import + / Export -)
        await a.setObjectNotExistsAsync('ems.gridPowerRawW', {
            type: 'state',
            common: {
                name: 'Netzleistung (W) (intern, roh, Import + / Export -)',
                type: 'number',
                role: 'value.power',
                read: true,
                write: false,
                unit: 'W',
                def: 0,
            },
            native: {},
        });
        // Filtered/averaged net grid power (Import + / Export -)
        // This value is intentionally used by other EMS modules to avoid unstable control due to short spikes.
        await a.setObjectNotExistsAsync('ems.gridPowerW', {
            type: 'state',
            common: {
                name: 'Netzleistung (W) (intern, geglättet, Import + / Export -)',
                type: 'number',
                role: 'value.power',
                read: true,
                write: false,
                unit: 'W',
                def: 0,
            },
            native: {},
        });
        await a.setObjectNotExistsAsync('ems.gridPowerSource', {
            type: 'state',
            common: {
                name: 'Netzleistung Quelle (intern)',
                type: 'string',
                role: 'text',
                read: true,
                write: false,
                def: '',
            },
            native: {},
        });
        const freshnessStates = {
            'ems.gridMeasurementFresh': { name: 'NVP-Messung frisch', type: 'boolean', role: 'indicator', def: false },
            'ems.gridMeasurementStatus': { name: 'NVP-Messstatus', type: 'string', role: 'text', def: 'missing' },
            'ems.gridMeasurementAgeMs': { name: 'NVP-Messwertalter', type: 'number', role: 'value.interval', unit: 'ms', def: -1 },
            'ems.gridHeartbeatAgeMs': { name: 'NVP-Heartbeat-Alter', type: 'number', role: 'value.interval', unit: 'ms', def: -1 },
            'ems.gridConnected': { name: 'NVP-Verbindung', type: 'boolean', role: 'indicator.connected', def: false },
            'ems.gridNvpCoherent': { name: 'NVP zeitlich kohärent', type: 'boolean', role: 'indicator', def: false },
            'ems.gridNvpSkewMs': { name: 'NVP Bezug/Einspeisung Zeitversatz', type: 'number', role: 'value.interval', unit: 'ms', def: -1 },
            'ems.gridMeasurementReason': { name: 'NVP-Messwertgrund', type: 'string', role: 'text', def: '' },
        };
        for (const [id, common] of Object.entries(freshnessStates)) {
            await a.setObjectNotExistsAsync(id, { type: 'state', common: { ...common, read: true, write: false }, native: {} });
        }
        this._gridPowerId = `${a.namespace}.ems.gridPowerW`;
        this._gridPowerRawId = `${a.namespace}.ems.gridPowerRawW`;
    }
    /**
     * Build a multiuse-compatible charging config from VIS config/table.
     */
    /**
     * Code-Teil: Methode `_buildChargingConfig`
     * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /** Code-Teil: _buildChargingConfig – bestehender Helfer; Aufrufer und State-/API-Verträge bei Änderungen mitprüfen. */
    _buildChargingConfig() {
        const adapter = this.adapter;
        const cfg = adapter.config || {};
        // Installer overrides for embedded Charging-Management (Admin-UI: chargingManagement.*)
        const userCm = (cfg.chargingManagement && typeof cfg.chargingManagement === 'object') ? cfg.chargingManagement : {};
        // --- Budget defaults: use configured EVCS max power ---
        const settingsCfg = cfg.settingsConfig || {};
        const ratedKw = Number(settingsCfg.evcsMaxPowerKw || 11);
        const ratedW = Math.round((Number.isFinite(ratedKw) ? ratedKw : 11) * 1000);
        // --- PV surplus source: prefer export power mapping ---
        const dps = cfg.datapoints || {};
        const gridBuyPowerId = (typeof dps.gridBuyPower === 'string' ? dps.gridBuyPower.trim() : '') || '';
        const gridSellPowerId = (typeof dps.gridSellPower === 'string' ? dps.gridSellPower.trim() : '') || '';
        // Optional: direct net grid power (NVP) in W (Import + / Export -)
        const gridPointPowerId = (typeof dps.gridPointPower === 'string' ? dps.gridPointPower.trim() : '') || '';
        // Optional: connection + watchdog for robust STALE_METER detection (especially with aliases)
        const gridPointConnectedIdCfg = (typeof dps.gridPointConnected === 'string' ? dps.gridPointConnected.trim() : '') || '';
        const gridPointWatchdogIdCfg = (typeof dps.gridPointWatchdog === 'string' ? dps.gridPointWatchdog.trim() : '') || '';
        let gridPointConnectedId = gridPointConnectedIdCfg;
        let gridPointWatchdogId = gridPointWatchdogIdCfg;
        // Auto-derive defaults for NexoWatt device-adapter structures: <...devices.<devKey>.*>
        //
        // New (nexowatt-devices adapter):
        //   devices.<id>.aliases.r.heartbeat  (number, increments on real data)  ✅
        //   devices.<id>.aliases.r.lastSeenMs (number, unix ms of last data)     ✅
        //   devices.<id>.aliases.r.online     (boolean, heartbeat within timeout)✅
        //
        // We prefer these because they reliably change even if power values are constant.
        // Fallback remains comm.connected + r.frequency.
        try {
            if (gridPointPowerId && (!gridPointConnectedId || !gridPointWatchdogId)) {
                const id = String(gridPointPowerId);
                const m = id.match(/^(.*?\.devices\.[^.]+)\./);
                if (m && m[1]) {
                    const prefix = m[1] + '.';
                    const looksLikeAliasR = id.includes('.aliases.r.');
                    if (!gridPointConnectedId) {
                        gridPointConnectedId = looksLikeAliasR ? (prefix + 'aliases.r.online') : (prefix + 'comm.connected');
                    }
                    if (!gridPointWatchdogId) {
                        gridPointWatchdogId = looksLikeAliasR ? (prefix + 'aliases.r.heartbeat') : (prefix + 'r.frequency');
                    }
                }
            }
        }
        catch (_e) {
            // ignore
        }
        const pvSurplusPowerId = gridSellPowerId;
        // Default net grid power:
        // 1) If buy/sell or NVP are mapped, use internal normalized state ems.gridPowerW
        // 2) Else (optional) fall back to PeakShaving gridPointPowerId if set in config
        const peakGridPowerId = (cfg.peakShaving && typeof cfg.peakShaving.gridPointPowerId === 'string') ? cfg.peakShaving.gridPointPowerId.trim() : '';
        const defaultGridPowerId = (gridBuyPowerId || gridSellPowerId || gridPointPowerId) ? this._gridPowerId : (peakGridPowerId || '');
        // --- Wallboxes from already normalized evcsList (created in syncSettingsConfigToStates) ---
        const list = Array.isArray(adapter.evcsList) ? adapter.evcsList : [];
        // --- Stationsgruppen (settingsConfig.stationGroups table) ---
        const sgRaw = Array.isArray(settingsCfg.stationGroups) ? settingsCfg.stationGroups : [];
        const stationGroups = [];
        const stationGroupMap = {};
        for (const g of sgRaw) {
            if (!g)
                continue;
            const stationKey = (typeof g.stationKey === 'string' && g.stationKey.trim()) ? g.stationKey.trim() : '';
            if (!stationKey)
                continue;
            const name = (typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : '';
            const maxPowerKw = (g.maxPowerKw !== undefined && g.maxPowerKw !== null && String(g.maxPowerKw).trim() !== '' && Number.isFinite(Number(g.maxPowerKw))) ? Number(g.maxPowerKw) : 0;
            const maxPowerW = Math.max(0, Math.round(maxPowerKw * 1000));
            stationGroups.push({ stationKey, name, maxPowerKw, maxPowerW });
            stationGroupMap[stationKey] = { stationKey, name, maxPowerKw, maxPowerW };
        }
        const wallboxes = [];
        // Global electrical default for W<->A conversion inside the embedded module.
        let globalVoltageV = 230;
        for (const wb of list) {
            if (!wb)
                continue;
            const idx = Number(wb.index);
            if (!Number.isFinite(idx) || idx <= 0)
                continue;
            // Stable key independent from name (treat each entry as a charge point / connector)
            const key = `lp${idx}`;
            const actualPowerWId = (wb.powerId || '').trim();
            const setCurrentAId = (wb.setCurrentAId || '').trim();
            const setPowerWId = (wb.setPowerWId || '').trim();
            // Online detection: prefer explicit online dp (bool), keep statusId as display/status fallback.
            const onlineId = (wb.onlineId || '').trim();
            const statusId = (wb.statusId || '').trim();
            const chargingStateId = (wb.chargingStateId || '').trim();
            const vehicleConnectedId = (wb.vehicleConnectedId || '').trim();
            const chargeDemandId = (wb.chargeDemandId || '').trim();
            const heartbeatId = (wb.heartbeatId || '').trim();
            const dataFreshId = (wb.dataFreshId || '').trim();
            const transactionActiveId = (wb.activeId || wb.transactionActiveId || '').trim();
            const telemetryProfile = String(wb.telemetryProfile || '').trim();
            const vehicleConnectedTrueValues = String(wb.vehicleConnectedTrueValues || '').trim();
            const vehicleConnectedFalseValues = String(wb.vehicleConnectedFalseValues || '').trim();
            const chargeDemandTrueValues = String(wb.chargeDemandTrueValues || '').trim();
            const chargeDemandFalseValues = String(wb.chargeDemandFalseValues || '').trim();
            const statusDemandValues = String(wb.statusDemandValues || wb.statusReadyValues || '').trim();
            const statusConnectedValues = String(wb.statusConnectedValues || '').trim();
            const statusDisconnectedValues = String(wb.statusDisconnectedValues || '').trim();
            const statusNoDemandValues = String(wb.statusNoDemandValues || '').trim();
            // Enable DP (optional)
            const enableId = (wb.enableWriteId || '').trim();
            // charger type / meta
            const chargerTypeRaw = String(wb.chargerType || 'ac').trim().toLowerCase();
            const chargerType = (chargerTypeRaw === 'dc') ? 'DC' : 'AC';
            const phases = (Number(wb.phases) === 1) ? 1 : 3;
            const voltageV = (Number.isFinite(Number(wb.voltageV)) && Number(wb.voltageV) > 0) ? Math.round(Number(wb.voltageV)) : 230;
            if (!Number.isFinite(Number(globalVoltageV)) || Number(globalVoltageV) <= 0)
                globalVoltageV = 230;
            if (globalVoltageV === 230 && voltageV !== 230)
                globalVoltageV = voltageV;
            const controlPreference = String(wb.controlPreference || 'auto').trim().toLowerCase();
            // multiuse expects controlBasis: auto|currentA|powerW|none
            let controlBasis = 'auto';
            if (controlPreference === 'currenta' || controlPreference === 'a' || controlPreference === 'current')
                controlBasis = 'currentA';
            else if (controlPreference === 'powerw' || controlPreference === 'w' || controlPreference === 'power')
                controlBasis = 'powerW';
            else if (controlPreference === 'none' || controlPreference === 'off') {
                // `Aktiv (Regelung)` ist die einzige bewusste Deaktivierung. Alte
                // controlPreference=none-Eintraege duerfen einen vorhandenen Sollwert-DP
                // nicht unsichtbar machen und die Infrastruktur faelschlich auf 0 W setzen.
                controlBasis = (setCurrentAId || setPowerWId) ? 'auto' : 'none';
            }
            const minA = (Number.isFinite(Number(wb.minCurrentA)) ? Number(wb.minCurrentA) : 0);
            const maxA = (Number.isFinite(Number(wb.maxCurrentA)) ? Number(wb.maxCurrentA) : 0);
            const maxPowerW = (Number.isFinite(Number(wb.maxPowerW)) ? Number(wb.maxPowerW) : 0);
            const minPowerW = (Number.isFinite(Number(wb.minPowerW)) ? Number(wb.minPowerW) : 0);
            const stepA = (Number.isFinite(Number(wb.stepA)) ? Number(wb.stepA) : 0);
            const stepW = (Number.isFinite(Number(wb.stepW)) ? Number(wb.stepW) : 0);
            // Default mode from Admin table (runtime state can override)
            let userModeDefault = String(wb.userMode || 'auto').trim().toLowerCase();
            if (userModeDefault === 'min+pv')
                userModeDefault = 'minpv';
            if (!['auto', 'pv', 'minpv', 'boost'].includes(userModeDefault))
                userModeDefault = 'auto';
            // Stationsgruppe/Connector Meta (optional)
            const stationKey = (typeof wb.stationKey === 'string' && wb.stationKey.trim()) ? wb.stationKey.trim() : '';
            const connectorNo = (Number.isFinite(Number(wb.connectorNo)) && Number(wb.connectorNo) > 0) ? Math.round(Number(wb.connectorNo)) : 0;
            const allowBoost = (wb.allowBoost !== false);
            const boostTimeoutMin = (Number.isFinite(Number(wb.boostTimeoutMin)) && Number(wb.boostTimeoutMin) > 0) ? Number(wb.boostTimeoutMin) : 0;
            // Manuell im AppCenter zugeordnete Phasenumschaltung und Speicherfreigabe.
            // Diese Felder duerfen beim TS-Uebergang main.evcsList -> Charging-Config
            // nicht verloren gehen; der nachgelagerte Aktor-Arbiter bleibt das Gate.
            const phaseMode = String(wb.phaseMode || (phases === 1 ? 'fixed-1p' : 'fixed-3p')).trim();
            const phaseSwitchId = String(wb.phaseSwitchId || '').trim();
            const phaseFeedbackId = String(wb.phaseFeedbackId || '').trim();
            const phaseSwitchValue1p = (wb.phaseSwitchValue1p !== undefined && wb.phaseSwitchValue1p !== null && String(wb.phaseSwitchValue1p).trim() !== '') ? wb.phaseSwitchValue1p : 1;
            const phaseSwitchValue3p = (wb.phaseSwitchValue3p !== undefined && wb.phaseSwitchValue3p !== null && String(wb.phaseSwitchValue3p).trim() !== '') ? wb.phaseSwitchValue3p : 3;
            const stopBeforePhaseSwitch = wb.stopBeforePhaseSwitch !== false;
            const phaseSwitchUpThresholdW = Number.isFinite(Number(wb.phaseSwitchUpThresholdW)) ? Number(wb.phaseSwitchUpThresholdW) : 4800;
            const phaseSwitchDownThresholdW = Number.isFinite(Number(wb.phaseSwitchDownThresholdW)) ? Number(wb.phaseSwitchDownThresholdW) : 3700;
            const phaseSwitchUpStableSec = Number.isFinite(Number(wb.phaseSwitchUpStableSec)) ? Number(wb.phaseSwitchUpStableSec) : 300;
            const phaseSwitchDownStableSec = Number.isFinite(Number(wb.phaseSwitchDownStableSec)) ? Number(wb.phaseSwitchDownStableSec) : 120;
            const phaseSwitchCooldownSec = Number.isFinite(Number(wb.phaseSwitchCooldownSec)) ? Number(wb.phaseSwitchCooldownSec) : 900;
            const phaseSwitchSettleSec = Number.isFinite(Number(wb.phaseSwitchSettleSec)) ? Number(wb.phaseSwitchSettleSec) : 30;
            const storageAssistCustomerAllowed = wb.storageAssistCustomerAllowed === true;
            // Aktivierung & Priorität (Installateur-Konfiguration)
            const enabled = (wb && typeof wb.enabled === 'boolean') ? !!wb.enabled : true;
            const prioRaw = Number(wb && wb.priority !== undefined ? wb.priority : NaN);
            const priority = (Number.isFinite(prioRaw) ? Math.max(1, Math.min(999, Math.round(prioRaw))) : 999);
            wallboxes.push({
                key,
                name: wb.name || key,
                enabled,
                priority,
                // Stable mapping to EVCS index (lp1 -> 1, ...) regardless of safe key renaming
                evcsIndex: idx,
                chargerType,
                controlBasis,
                phases,
                voltageV,
                dcCurrentReference: String(wb.dcCurrentReference || '').trim(),
                dcVoltageId: String(wb.dcVoltageId || '').trim(),
                // Stationsmeta
                ...(stationKey ? { stationKey } : {}),
                ...(connectorNo > 0 ? { connectorNo } : {}),
                ...(allowBoost === false ? { allowBoost: false } : { allowBoost: true }),
                ...(boostTimeoutMin > 0 ? { boostTimeoutMin } : {}),
                // 0/ungültig weiterreichen: sperrt bei Nulleinspeisung den Netzanteil,
                // nicht PV. Weglassen würde die zusätzliche LP-Netzgrenze lösen.
                boostMaxPowerW: wb.boostMaxPowerW ?? null,
                // limits
                ...(minA > 0 ? { minA } : {}),
                ...(maxA > 0 ? { maxA } : {}),
                ...(maxPowerW > 0 ? { maxPowerW } : {}),
                ...(minPowerW > 0 ? { minPowerW } : {}),
                ...(stepA > 0 ? { stepA } : {}),
                ...(stepW > 0 ? { stepW } : {}),
                // datapoints
                ...(actualPowerWId ? { actualPowerWId } : {}),
                ...(setCurrentAId ? { setCurrentAId } : {}),
                ...(setPowerWId ? { setPowerWId } : {}),
                ...(enableId ? { enableId } : {}),
                ...(onlineId ? { onlineId } : {}),
                ...(statusId ? { statusId } : {}),
                ...(chargingStateId ? { chargingStateId } : {}),
                ...(vehicleConnectedId ? { vehicleConnectedId } : {}),
                ...(chargeDemandId ? { chargeDemandId } : {}),
                ...(heartbeatId ? { heartbeatId } : {}),
                ...(dataFreshId ? { dataFreshId } : {}),
                ...(transactionActiveId ? { transactionActiveId } : {}),
                ...(telemetryProfile ? { telemetryProfile } : {}),
                ...(vehicleConnectedTrueValues ? { vehicleConnectedTrueValues } : {}),
                ...(vehicleConnectedFalseValues ? { vehicleConnectedFalseValues } : {}),
                ...(chargeDemandTrueValues ? { chargeDemandTrueValues } : {}),
                ...(chargeDemandFalseValues ? { chargeDemandFalseValues } : {}),
                ...(statusDemandValues ? { statusDemandValues } : {}),
                ...(statusConnectedValues ? { statusConnectedValues } : {}),
                ...(statusDisconnectedValues ? { statusDisconnectedValues } : {}),
                ...(statusNoDemandValues ? { statusNoDemandValues } : {}),
                ...(phaseSwitchId ? { phaseSwitchId } : {}),
                ...(phaseFeedbackId ? { phaseFeedbackId } : {}),
                phaseMode,
                phaseSwitchValue1p,
                phaseSwitchValue3p,
                stopBeforePhaseSwitch,
                phaseSwitchUpThresholdW,
                phaseSwitchDownThresholdW,
                phaseSwitchUpStableSec,
                phaseSwitchDownStableSec,
                phaseSwitchCooldownSec,
                phaseSwitchSettleSec,
                storageAssistCustomerAllowed,
                // admin default for runtime user mode
                userModeDefault,
            });
        }
        // Die AppCenter-Angabe ist eine Nennleistung PRO Ladepunkt. Fuer das
        // Gesamtbudget muss deshalb die installierte Leistung aller steuerbaren
        // Ladepunkte summiert werden. Stationsgruppen werden dabei bereits auf ihr
        // gemeinsames Stationslimit begrenzt; die NVP-/Phasen-/§14a-Grenzen folgen
        // spaeter im Lademanagement und koennen diesen Wert nur weiter reduzieren.
        const infrastructure = computeChargingInfrastructureCapacity({
            wallboxes,
            stationGroups,
            fallbackPerConnectorW: ratedW,
        });
        // enableChargingManagement only if at least one controllable wallbox exists
        const anyControl = wallboxes.some(w => (w && w.enabled !== false) && (w.setCurrentAId || w.setPowerWId));
        const infrastructureCapacityW = infrastructure.effectiveCapacityW > 0
            ? infrastructure.effectiveCapacityW
            : (anyControl ? ratedW : 0);
        const chargingCfg = {
            // Keep consistent with multiuse module
            mode: anyControl ? 'mixed' : 'off',
            // PV-only is handled per-wallbox via runtime mode (pv/minpv). Keep global default off.
            pvSurplusOnly: false,
            // Budget: engine (Infrastruktur + Tarif + Peak + externe Gates).
            // `staticMaxChargingPowerW` ist im Engine-Modus die automatisch summierte
            // Infrastrukturgrenze und nicht mehr die Nennleistung nur eines Ladepunkts.
            totalBudgetMode: 'engine',
            staticMaxChargingPowerW: infrastructureCapacityW,
            infrastructureRawCapacityW: infrastructure.rawCapacityW,
            infrastructureCapacityW,
            infrastructureWallboxCount: infrastructure.wallboxCount,
            infrastructureStationCount: infrastructure.stationCount,
            infrastructurePerConnectorFallbackW: ratedW,
            infrastructureHardCapW: 0,
            // PV surplus input (optional)
            ...(pvSurplusPowerId ? { pvSurplusPowerId } : {}),
            // Provide a default NET grid power id (derived from buy/sell) so minpv/pv logic can work out-of-the-box
            ...(defaultGridPowerId ? { gridPowerId: defaultGridPowerId } : {}),
            // Global electrical defaults
            voltageV: globalVoltageV,
            defaultPhases: 3,
            // Stability defaults (anti-flutter, safe)
            // IMPORTANT: Real-world grid meters (esp. NVP / net power aliases) often update on a slower cadence
            // (e.g. 30s..300s) and may not write a new value if the power is stable. A too aggressive
            // timeout causes false "failsafe stale meter" and disables *all* charging.
            // Default to 5 minutes; installers can tighten this in the App-Center if their meter updates faster.
            staleTimeoutSec: 300,
            activityThresholdW: 200,
            stopGraceSec: 30,
            sessionKeepSec: 300,
            // Gate B: PV hysteresis / start-stop protection (for PV-only modes)
            pvStartThresholdW: 800,
            pvStopThresholdW: 200,
            pvStartDelaySec: 10,
            pvStopDelaySec: 30,
            pvAbortImportW: 600,
            pvStartStableSec: 10,
            pvConnectorStopDelaySec: 45,
            pvMinRunSec: 45,
            pvRunDeficitToleranceW: 600,
            pvRampUpAperTick: 0.5,
            pvRampUpWPerTick: 350,
            // Global stepping defaults (per wallbox overrides possible)
            stepA: 0.1,
            stepW: 25,
            // Boost timeouts (minutes). Defaults: AC=300 (5h), DC=60 (1h). 0 = no auto-timeout.
            boostTimeoutMinAc: 300,
            boostTimeoutMinDc: 60,
            // Gate C: Speicher-Unterstützung für Ladepark (optional)
            // Wenn aktiv und der SoC hoch genug ist, kann das EMS per Batterie-Entladung zusätzliche Ladeleistung bereitstellen,
            // ohne den Netzanschluss (Import-Limit) zu überlasten.
            storageAssistEnabled: false,
            storageAssistApply: 'boostOnly', // 'boostOnly' | 'boostAndAuto'
            storageAssistStartSocPct: 60,
            storageAssistStopSocPct: 40,
            // 0 = automatisch (Storage.maxDischargeW), sonst fester Wert
            storageAssistMaxDischargeW: 0,
            // Station groups (optional)
            ...(stationGroups.length ? { stationGroups } : {}),
            // per wallbox list
            wallboxes,
        };
        // Apply selected overrides from Admin-UI (keep safe defaults if empty)
        try {
            const modeOverride = (typeof userCm.mode === 'string') ? userCm.mode.trim() : '';
            // IMPORTANT:
            // "off" is not a configuration variant but a runtime enable/disable.
            // The App-Center already provides the on/off switch (enableChargingManagement).
            // Allowing "off" here caused real-world confusion where Boost/Auto did not react
            // although the app was "Aktiv".
            if (['pvSurplus', 'mixed'].includes(modeOverride))
                chargingCfg.mode = modeOverride;
            if (typeof userCm.pvSurplusOnly === 'boolean')
                chargingCfg.pvSurplusOnly = userCm.pvSurplusOnly;
            const bm = (typeof userCm.totalBudgetMode === 'string') ? userCm.totalBudgetMode.trim() : '';
            if (bm)
                chargingCfg.totalBudgetMode = bm;
            const staticW = Number(userCm.staticMaxChargingPowerW);
            const infrastructureHardCapW = Number(userCm.infrastructureHardCapW);
            if (chargingCfg.totalBudgetMode === 'static') {
                // Im ausdruecklichen Static-Modus bleibt ein manuell gepflegtes
                // Gesamtbudget kompatibel. Dieser Modus ist eine bewusste feste Grenze.
                if (Number.isFinite(staticW) && staticW > 0) {
                    chargingCfg.staticMaxChargingPowerW = Math.round(staticW);
                }
            }
            else if (chargingCfg.totalBudgetMode === 'engine') {
                // Alte Installationen koennen noch den frueheren versteckten 11-kW-Wert
                // in `staticMaxChargingPowerW` besitzen. Im Engine-Modus darf dieser die
                // automatisch summierte Ladeinfrastruktur nicht mehr auf einen einzelnen
                // Ladepunkt begrenzen. Ein optionaler neuer Hard-Cap ist dagegen explizit.
                const hardCapW = Number.isFinite(infrastructureHardCapW) && infrastructureHardCapW > 0
                    ? Math.round(infrastructureHardCapW)
                    : 0;
                chargingCfg.infrastructureHardCapW = hardCapW;
                chargingCfg.staticMaxChargingPowerW = hardCapW > 0
                    ? Math.min(infrastructureCapacityW, hardCapW)
                    : infrastructureCapacityW;
            }
            else if (Number.isFinite(staticW) && staticW > 0) {
                // Kompatibilitaet fuer alternative Budgetmodi; der Wert ist dort nur ein
                // Diagnose-/Fallbackwert und ersetzt nicht deren eigenen Datenpunkt.
                chargingCfg.staticMaxChargingPowerW = Math.round(staticW);
            }
            const budgetId = (typeof userCm.budgetPowerId === 'string') ? userCm.budgetPowerId.trim() : '';
            if (budgetId)
                chargingCfg.budgetPowerId = budgetId;
            const gridId = (typeof userCm.gridPowerId === 'string') ? userCm.gridPowerId.trim() : '';
            if (gridId)
                chargingCfg.gridPowerId = gridId;
            const pvId = (typeof userCm.pvSurplusPowerId === 'string') ? userCm.pvSurplusPowerId.trim() : '';
            if (pvId)
                chargingCfg.pvSurplusPowerId = pvId;
            const voltageV_ = Number(userCm.voltageV);
            if (Number.isFinite(voltageV_) && voltageV_ >= 50 && voltageV_ <= 1000)
                chargingCfg.voltageV = Math.round(voltageV_);
            const phases_ = Number(userCm.defaultPhases);
            if (Number.isFinite(phases_) && (phases_ === 1 || phases_ === 3))
                chargingCfg.defaultPhases = phases_;
            // Stale timeout override (seconds)
            // NOTE:
            // Older builds treated exactly "15" as a legacy default and silently ignored it.
            // For field reliability (and to match installer expectations), we now honor ANY
            // explicit user value including 15s.
            const stale_ = Number(userCm.staleTimeoutSec);
            if (Number.isFinite(stale_) && stale_ >= 1 && stale_ <= 3600) {
                chargingCfg.staleTimeoutSec = Math.round(stale_);
            }
            const thr_ = Number(userCm.activityThresholdW);
            if (Number.isFinite(thr_) && thr_ >= 0)
                chargingCfg.activityThresholdW = Math.round(thr_);
            const pvStart_ = Number(userCm.pvStartThresholdW);
            if (Number.isFinite(pvStart_) && pvStart_ >= 0)
                chargingCfg.pvStartThresholdW = Math.round(pvStart_);
            const pvStop_ = Number(userCm.pvStopThresholdW);
            if (Number.isFinite(pvStop_) && pvStop_ >= 0)
                chargingCfg.pvStopThresholdW = Math.round(pvStop_);
            const pvStartDelay_ = Number(userCm.pvStartDelaySec);
            if (Number.isFinite(pvStartDelay_) && pvStartDelay_ >= 0)
                chargingCfg.pvStartDelaySec = pvStartDelay_;
            const pvStopDelay_ = Number(userCm.pvStopDelaySec);
            if (Number.isFinite(pvStopDelay_) && pvStopDelay_ >= 0)
                chargingCfg.pvStopDelaySec = pvStopDelay_;
            const pvAbortImport_ = Number(userCm.pvAbortImportW);
            if (Number.isFinite(pvAbortImport_) && pvAbortImport_ >= 0)
                chargingCfg.pvAbortImportW = Math.round(pvAbortImport_);
            const pvStartStable_ = Number(userCm.pvStartStableSec);
            if (Number.isFinite(pvStartStable_) && pvStartStable_ >= 0)
                chargingCfg.pvStartStableSec = pvStartStable_;
            const pvConnectorStopDelay_ = Number(userCm.pvConnectorStopDelaySec);
            if (Number.isFinite(pvConnectorStopDelay_) && pvConnectorStopDelay_ >= 0)
                chargingCfg.pvConnectorStopDelaySec = pvConnectorStopDelay_;
            const pvMinRun_ = Number(userCm.pvMinRunSec);
            if (Number.isFinite(pvMinRun_) && pvMinRun_ >= 0)
                chargingCfg.pvMinRunSec = pvMinRun_;
            const pvRunDeficitTolerance_ = Number(userCm.pvRunDeficitToleranceW);
            if (Number.isFinite(pvRunDeficitTolerance_) && pvRunDeficitTolerance_ >= 0)
                chargingCfg.pvRunDeficitToleranceW = Math.round(pvRunDeficitTolerance_);
            const pvRampUpA_ = Number(userCm.pvRampUpAperTick);
            if (Number.isFinite(pvRampUpA_) && pvRampUpA_ >= 0)
                chargingCfg.pvRampUpAperTick = pvRampUpA_;
            const pvRampUpW_ = Number(userCm.pvRampUpWPerTick);
            if (Number.isFinite(pvRampUpW_) && pvRampUpW_ >= 0)
                chargingCfg.pvRampUpWPerTick = Math.round(pvRampUpW_);
            const sg_ = Number(userCm.stopGraceSec);
            if (Number.isFinite(sg_) && sg_ >= 0 && sg_ <= 3600)
                chargingCfg.stopGraceSec = sg_;
            const keep_ = Number(userCm.sessionKeepSec);
            if (Number.isFinite(keep_) && keep_ >= 0 && keep_ <= 86400)
                chargingCfg.sessionKeepSec = keep_;
            const stepA_ = Number(userCm.stepA);
            if (Number.isFinite(stepA_) && stepA_ >= 0)
                chargingCfg.stepA = stepA_;
            const stepW_ = Number(userCm.stepW);
            if (Number.isFinite(stepW_) && stepW_ >= 0)
                chargingCfg.stepW = stepW_;
            const dW_ = Number(userCm.maxDeltaWPerTick);
            if (Number.isFinite(dW_) && dW_ >= 0)
                chargingCfg.maxDeltaWPerTick = dW_;
            const dA_ = Number(userCm.maxDeltaAPerTick);
            if (Number.isFinite(dA_) && dA_ >= 0)
                chargingCfg.maxDeltaAPerTick = dA_;
            const acMin_ = Number(userCm.acMinPower3pW);
            if (Number.isFinite(acMin_) && acMin_ >= 0)
                chargingCfg.acMinPower3pW = acMin_;
            if (typeof userCm.pauseWhenPeakShavingActive === 'boolean')
                chargingCfg.pauseWhenPeakShavingActive = userCm.pauseWhenPeakShavingActive;
            const pb_ = (typeof userCm.pauseBehavior === 'string') ? userCm.pauseBehavior.trim() : '';
            if (pb_)
                chargingCfg.pauseBehavior = pb_;
            const stationMode_ = (typeof userCm.stationAllocationMode === 'string') ? userCm.stationAllocationMode.trim() : '';
            if (stationMode_)
                chargingCfg.stationAllocationMode = stationMode_;
            const btAc_ = Number(userCm.boostTimeoutMinAc);
            if (Number.isFinite(btAc_) && btAc_ >= 0)
                chargingCfg.boostTimeoutMinAc = btAc_;
            const btDc_ = Number(userCm.boostTimeoutMinDc);
            if (Number.isFinite(btDc_) && btDc_ >= 0)
                chargingCfg.boostTimeoutMinDc = btDc_;
            // Gate C: Speicher-Unterstützung
            if (typeof userCm.storageAssistEnabled === 'boolean')
                chargingCfg.storageAssistEnabled = userCm.storageAssistEnabled;
            const saApply_ = (typeof userCm.storageAssistApply === 'string') ? userCm.storageAssistApply.trim() : '';
            if (['boostOnly', 'boostAndAuto'].includes(saApply_))
                chargingCfg.storageAssistApply = saApply_;
            const saStart_ = Number(userCm.storageAssistStartSocPct);
            if (Number.isFinite(saStart_) && saStart_ >= 0 && saStart_ <= 100)
                chargingCfg.storageAssistStartSocPct = saStart_;
            const saStop_ = Number(userCm.storageAssistStopSocPct);
            if (Number.isFinite(saStop_) && saStop_ >= 0 && saStop_ <= 100)
                chargingCfg.storageAssistStopSocPct = saStop_;
            const saMax_ = Number(userCm.storageAssistMaxDischargeW);
            if (Number.isFinite(saMax_) && saMax_ >= 0)
                chargingCfg.storageAssistMaxDischargeW = saMax_;
        }
        catch (_e) { }
        return { anyControl, chargingCfg, stationGroups, stationGroupMap };
    }
    /**
     * Publishes scheduler liveness independently from a full EMS control cycle.
     * The local process object is updated even if a previous ioBroker state write
     * is delayed, so the co-located Admin overview can still distinguish a live
     * scheduler from a stalled regulation tick.
     */
    async _publishSchedulerHeartbeat(reason = 'timer') {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        const now = Date.now();
        const configuredStaleMs = clampNumber(this.adapter?.config?.diagnostics?.emsTickStaleAfterMs, 15000, 300000, this._tickStaleAfterMs);
        const activeTickAgeMs = this._tickRunning && this._lastTickStartMs > 0
            ? Math.max(0, now - this._lastTickStartMs)
            : 0;
        const tickStalled = this._tickRunning && activeTickAgeMs > configuredStaleMs;
        this._schedulerHeartbeatSequence += 1;
        this.adapter._nwEmsSchedulerHealth = {
            heartbeatAt: now,
            sequence: this._schedulerHeartbeatSequence,
            reason: String(reason || 'timer'),
            tickRunning: this._tickRunning === true,
            activeTickAgeMs,
            tickStalled,
            tickStaleAfterMs: configuredStaleMs,
            lastTickStartMs: this._lastTickStartMs,
            lastTickEndMs: this._lastTickEndMs,
        };
        if (this._schedulerHeartbeatRunning)
            return;
        this._schedulerHeartbeatRunning = true;
        try {
            await Promise.allSettled([
                this.adapter.setStateAsync('ems.core.schedulerHeartbeatAt', { val: now, ack: true }),
                this.adapter.setStateAsync('ems.core.schedulerHeartbeatSequence', { val: Math.round(this._schedulerHeartbeatSequence), ack: true }),
                this.adapter.setStateAsync('ems.core.schedulerAlive', { val: true, ack: true }),
            ]);
        }
        finally {
            this._schedulerHeartbeatRunning = false;
        }
    }
    _startSchedulerHeartbeat() {
        if (!this.adapter || this.adapter._nwShuttingDown || this._schedulerHeartbeatTimer)
            return;
        this._publishSchedulerHeartbeat('startup').catch(() => { });
        this._schedulerHeartbeatTimer = this._setInterval(() => {
            this._publishSchedulerHeartbeat('timer').catch(() => { });
        }, this._schedulerHeartbeatIntervalMs);
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
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Ablauf und Zusammenhang: Erzeugt Datenpunkt-Registry und Modulmanager und bereitet die Laufzeit vor. Die Modul-Initialisierung baut auf derselben Adapter-Konfiguration auf, die das App-Center gespeichert hat.
     */
    async init() {
        const adapter = this.adapter;
        await this._ensureInternalStates();
        this._startSchedulerHeartbeat();
        // Scheduler interval from config (Admin UI / jsonConfig)
        const cfgInterval = adapter.config && adapter.config.schedulerIntervalMs;
        // Aktor- und Speicher-Watchdogs muessen spaetestens sekündlich erneuert werden.
        // Eine langsamere Alt-Konfiguration wird deshalb sicher auf 1000 ms begrenzt.
        this._intervalMs = clampNumber(cfgInterval, 250, 1000, 1000);
        const { anyControl, chargingCfg } = this._buildChargingConfig();
        // Respect Admin toggle (default true if undefined)
        const userWantsCharging = (adapter.config.enableChargingManagement !== false);
        // Inject config for embedded modules
        // Wichtig: Charging-Management bleibt grundsätzlich aktiviert (wenn der Installateur es nicht explizit deaktiviert),
        // damit die EMS-States und die EVCS-UI (Modus-Buttons) immer verfügbar sind – auch wenn noch nicht alle Setpoints
        // gemappt sind. Ohne Setpoints werden keine Sollwerte geschrieben (failsafe).
        adapter.config.enableChargingManagement = !!userWantsCharging;
        adapter.config._chargingHasAnySetpoint = !!anyControl;
        adapter.config.chargingManagement = chargingCfg;
        // If PeakShaving/Atypical HLZF is enabled but no gridPointPowerId is set, default to internal derived net grid power
        const peakRuntimeEnabled = !!adapter.config.enablePeakShaving || !!(adapter.config.peakShaving && adapter.config.peakShaving.atypical && adapter.config.peakShaving.atypical.enabled);
        if (peakRuntimeEnabled) {
            adapter.config.peakShaving = adapter.config.peakShaving || {};
            const gp = typeof adapter.config.peakShaving.gridPointPowerId === 'string' ? adapter.config.peakShaving.gridPointPowerId.trim() : '';
            if (!gp && this._gridPowerId) {
                adapter.config.peakShaving.gridPointPowerId = this._gridPowerId;
            }
        }
        // Stufe C2: zentralen Aktor-Arbiter vor allen Modul-/DP-Schreibpfaden installieren; Shadow bleibt als feldkompatibler Rückfall verfügbar.
        this._actuatorShadowArbiter = installActuatorShadowArbiter(adapter);
        // Datapoint registry (multiuse)
        this.dp = new DatapointRegistry(adapter, []);
        await this.dp.init();
        // Register VIS datapoints needed for derived net grid power
        const dps = (adapter.config && adapter.config.datapoints) ? adapter.config.datapoints : {};
        const gridBuyId = (typeof dps.gridBuyPower === 'string') ? dps.gridBuyPower.trim() : '';
        const gridSellId = (typeof dps.gridSellPower === 'string') ? dps.gridSellPower.trim() : '';
        const gridNetId = (typeof dps.gridPointPower === 'string') ? dps.gridPointPower.trim() : '';
        const peakGridId = (adapter.config && adapter.config.peakShaving && typeof adapter.config.peakShaving.gridPointPowerId === 'string')
            ? adapter.config.peakShaving.gridPointPowerId.trim()
            : '';
        this._nvpSourceIds = new Set([gridBuyId, gridSellId, gridNetId, peakGridId]
            .map((value) => String(value || '').trim())
            .filter((value) => value && value !== this._gridPowerId && value !== this._gridPowerRawId));
        // Optional robust freshness: connected + watchdog/heartbeat.
        // NOTE: These inputs are optional, but the engine must never crash if they are not configured.
        // This mirrors the derivation logic used in _buildChargingConfig().
        const gridPointConnectedIdCfg = (typeof dps.gridPointConnected === 'string' ? dps.gridPointConnected.trim() : '') || '';
        const gridPointWatchdogIdCfg = (typeof dps.gridPointWatchdog === 'string' ? dps.gridPointWatchdog.trim() : '') || '';
        let gridPointConnectedId = gridPointConnectedIdCfg;
        let gridPointWatchdogId = gridPointWatchdogIdCfg;
        // Auto-derive defaults for NexoWatt device-adapter structures: <...devices.<devKey>.*>
        // Prefer nexowatt-devices alias watchdog/online when the mapped gridNetId is under .aliases.r.*
        try {
            if (gridNetId && (!gridPointConnectedId || !gridPointWatchdogId)) {
                const id = String(gridNetId);
                const m = id.match(/^(.*?\.devices\.[^.]+)\./);
                if (m && m[1]) {
                    const prefix = m[1] + '.';
                    const looksLikeAliasR = id.includes('.aliases.r.');
                    if (!gridPointConnectedId) {
                        gridPointConnectedId = looksLikeAliasR ? (prefix + 'aliases.r.online') : (prefix + 'comm.connected');
                    }
                    if (!gridPointWatchdogId) {
                        gridPointWatchdogId = looksLikeAliasR ? (prefix + 'aliases.r.heartbeat') : (prefix + 'r.frequency');
                    }
                }
            }
        }
        catch (_e) {
            // ignore
        }
        // Globale Energiefluss-Speicher-DPs sind ausschließlich Runtime-Fallbacks.
        // Der Bridge-Helfer hält sie außerhalb der persistierten Speicher-Konfiguration;
        // manuelle Zuordnungen im Speicher-Reiter bleiben immer autoritativ.
        try {
            await applyStorageMeasurementOverrides(adapter, dps);
        }
        catch (_e) {
            // ignore
        }
        // NOTE on freshness:
        // Real-world meters and aliases may not rewrite a stable value. The device
        // prefix is therefore observed as a bounded heartbeat, while the original
        // measurement timestamp remains unchanged and separately diagnosable.
        if (gridBuyId)
            await this.dp.upsert({ key: 'vis.gridBuyW', objectId: gridBuyId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        if (gridSellId)
            await this.dp.upsert({ key: 'vis.gridSellW', objectId: gridSellId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        if (gridNetId)
            await this.dp.upsert({ key: 'vis.gridNetW', objectId: gridNetId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: true });
        // Optional: storage capacity (kWh) for time-/risk-based charge strategies
        const capKwhId = (typeof dps.storageCapacityKwh === 'string') ? dps.storageCapacityKwh.trim() : '';
        if (capKwhId)
            await this.dp.upsert({ key: 'st.capacityKwh', objectId: capKwhId, dataType: 'number', direction: 'in', unit: 'kWh' });
        // Map internal net grid power to generic keys used by modules as fallback
        // grid.powerW is intentionally the *filtered* value for stable regulation.
        // grid.powerRawW provides the raw signal for safety clamping and debugging.
        if (this._gridPowerId) {
            // Internal canonical NVP states are refreshed only after the external
            // measurement has passed the central freshness/coherence resolver.
            await this.dp.upsert({ key: 'grid.powerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: false });
            await this.dp.upsert({ key: 'ems.gridPowerW', objectId: this._gridPowerId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: false });
        }
        if (this._gridPowerRawId) {
            await this.dp.upsert({ key: 'grid.powerRawW', objectId: this._gridPowerRawId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: false });
            await this.dp.upsert({ key: 'ems.gridPowerRawW', objectId: this._gridPowerRawId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: false });
        }
        // Optional health inputs. connected=false invalidates the measurement;
        // connected=true is not a freshness substitute. A watchdog/heartbeat may
        // confirm an unchanged value only for the configured finite hold window.
        if (gridPointConnectedId) {
            await this.dp.upsert({ key: 'cm.gridConnected', objectId: gridPointConnectedId, dataType: 'boolean', direction: 'in', unit: '', useAliveForStale: false });
        }
        if (gridPointWatchdogId) {
            // IMPORTANT: enable alive-prefix heartbeat here.
            // We do NOT want to depend on the watchdog datapoint itself changing every few seconds.
            // Many adapters use setStateChanged(), so timestamps remain unchanged while a value is stable.
            // With useAliveForStale=true we subscribe to the device prefix (alivePrefix) so that ANY
            // regularly updating meter state keeps the watchdog fresh.
            await this.dp.upsert({ key: 'cm.gridWatchdog', objectId: gridPointWatchdogId, dataType: 'number', direction: 'in', unit: '', useAliveForStale: true });
        }
        // Module manager (PeakShaving / Charging / Tarif / optional Storage etc.)
        this.mm = new ModuleManager(adapter, this.dp);
        await this.mm.init();
        // Subscribe to our own states for convenience (Admin/VIS)
        try {
            adapter.subscribeStates('ems.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('chargingManagement.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('peakShaving.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('tarif.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('speicher.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('thermal.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('threshold.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('gridConstraints.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('aiAdvisor.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('energyWallet.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('chargeKiosk.*');
        }
        catch (_e) { }
        try {
            adapter.subscribeStates('nl.*');
        }
        catch (_e) { }
        // Start scheduler
        if (this._timer)
            this._clearInterval(this._timer);
        this._timer = this._setInterval(() => {
            // Liegt bereits eine debouncte Bedien- oder NVP-Anforderung vor, übernimmt
            // deren unmittelbarer Tick. So werden dieselben Messwerte nicht kurz
            // hintereinander durch Intervall- und Schnellpfad doppelt verarbeitet.
            if (this._immediateTickPending || this._immediateTickTimer)
                return;
            this.tick().catch(err => {
                try {
                    adapter.log.warn(`[EMS] tick failed: ${err?.message || err}`);
                }
                catch (_e) { }
            });
        }, this._intervalMs);
        adapter.log.info(`[EMS] Embedded engine started (interval ${this._intervalMs}ms) — CM=${adapter.config.enableChargingManagement ? 'ON' : 'OFF'} PS=${adapter.config.enablePeakShaving ? 'ON' : 'OFF'}`);
    }
    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /** Code-Teil: tick – bestehender Helfer; Aufrufer und State-/API-Verträge bei Änderungen mitprüfen. */
    /**
     * Ablauf und Zusammenhang: Bildet die frische gemeinsame Messbasis, übernimmt Speicher-Messwertzuordnungen und ruft den Modulmanager auf. Tick-Sperre und Diagnosezeitstempel begrenzen Überlappungen; der finally-Pfad gibt den Lauf wieder frei.
     */
    async tick() {
        if (!this.adapter || this.adapter._nwShuttingDown || !this.dp || !this.mm)
            return;
        // Prevent overlapping async ticks (deterministic scheduler).
        if (this._tickRunning) {
            const now = Date.now();
            const configuredStaleMs = clampNumber(this.adapter?.config?.diagnostics?.emsTickStaleAfterMs, 15000, 300000, this._tickStaleAfterMs);
            const runningAgeMs = this._lastTickStartMs > 0 ? now - this._lastTickStartMs : 0;
            // RC85_STALE_TICK_RECOVERY: Module-level watchdogs normally guarantee a
            // bounded cycle. This final recovery prevents a stale mutex left by an
            // unforeseen runtime edge case from suppressing every future EMS tick.
            if (runningAgeMs >= configuredStaleMs) {
                this._staleTickRecoveryCount += 1;
                this._lastStaleTickRecoveryMs = now;
                this._tickRunning = false;
                this._activeTickId = 0;
                try {
                    this.adapter.log.warn(`[EMS watchdog] stale tick lock recovered after ${Math.round(runningAgeMs)} ms`);
                    await this.adapter.setStateAsync('ems.core.tickRunning', { val: false, ack: true });
                    await this.adapter.setStateAsync('ems.core.staleTickRecoveryCount', { val: Math.round(this._staleTickRecoveryCount), ack: true });
                    await this.adapter.setStateAsync('ems.core.lastStaleTickRecovery', { val: now, ack: true });
                    await this.adapter.setStateAsync('ems.core.lastTickError', { val: `stale-tick-lock-recovered:${Math.round(runningAgeMs)}ms`, ack: true });
                }
                catch (_eRecovery) { }
            }
            else {
                this._tickSkipCount = (Number.isFinite(Number(this._tickSkipCount)) ? Number(this._tickSkipCount) : 0) + 1;
                try {
                    await this.adapter.setStateAsync('ems.core.tickSkipCount', { val: Math.round(this._tickSkipCount), ack: true });
                }
                catch (_e) {
                    // ignore
                }
                return;
            }
        }
        this._tickRunning = true;
        const tickId = ++this._tickSequence;
        this._activeTickId = tickId;
        const tickStart = Date.now();
        this._lastTickStartMs = tickStart;
        this._publishSchedulerHeartbeat('tick-start').catch(() => { });
        try {
            try {
                await this.adapter.setStateAsync('ems.core.tickRunning', { val: true, ack: true });
                await this.adapter.setStateAsync('ems.core.lastTickStart', { val: tickStart, ack: true });
                // reset error on successful tick start
                await this.adapter.setStateAsync('ems.core.lastTickError', { val: '', ack: true });
            }
            catch (_e0) {
                // ignore
            }
            // Derived / normalized net grid power (Import + / Export -).
            try {
                const staleTimeoutSec = clampNumber(this.adapter?.config?.chargingManagement?.staleTimeoutSec ??
                    this.adapter?.config?.storage?.staleTimeoutSec ??
                    this.adapter?.config?.peakShaving?.staleTimeoutSec ??
                    this.adapter?.config?.settings?.deviceStaleTimeoutSec ??
                    300, 1, 3600, 300);
                const staleMs = Math.max(1000, Math.round(staleTimeoutSec * 1000));
                const snapshot = buildNvpSnapshotFromRegistry({
                    registry: this.dp,
                    now: Date.now(),
                    invertGrid: !!this.adapter?.config?.settings?.flowInvertGrid,
                    staleMs,
                    maxSkewMs: clampNumber(this.adapter?.config?.diagnostics?.nvpMaxSkewMs, 250, 30000, 5000),
                    maxHeartbeatHoldMs: clampNumber(this.adapter?.config?.diagnostics?.nvpMeasurementMaxHoldMs, staleMs, 60 * 60 * 1000, Math.max(staleMs * 3, 15 * 60 * 1000)),
                });
                this.adapter._nvpFreshnessSnapshot = snapshot;
                const diagnosticWrites = [
                    ['ems.gridPowerSource', snapshot.source],
                    ['ems.gridMeasurementFresh', snapshot.usable],
                    ['ems.gridMeasurementStatus', snapshot.status],
                    ['ems.gridMeasurementAgeMs', snapshot.measurementAgeMs === null ? -1 : Math.round(snapshot.measurementAgeMs)],
                    ['ems.gridHeartbeatAgeMs', snapshot.heartbeatAgeMs === null ? -1 : Math.round(snapshot.heartbeatAgeMs)],
                    ['ems.gridConnected', snapshot.connected === true],
                    ['ems.gridNvpCoherent', snapshot.coherent],
                    ['ems.gridNvpSkewMs', snapshot.skewMs === null ? -1 : Math.round(snapshot.skewMs)],
                    ['ems.gridMeasurementReason', String(snapshot.reason || '')],
                ];
                for (const [id, value] of diagnosticWrites) {
                    try {
                        await this.adapter.setStateAsync(id, { val: value, ack: true });
                    }
                    catch (_error) { }
                }
                const netW = snapshot.usable && Number.isFinite(Number(snapshot.netW)) ? Number(snapshot.netW) : null;
                if (netW !== null && this._gridPowerId && this._gridPowerRawId) {
                    const nowTs = Date.now();
                    const netRawRounded = Math.round(netW);
                    try {
                        await this.adapter.setStateAsync('ems.gridPowerRawW', { val: netRawRounded, ack: true });
                    }
                    catch (_error) { }
                    const psCfg = this.adapter?.config?.peakShaving || {};
                    const useAvg = psCfg.useAverage !== false;
                    const tauSec = useAvg ? clampNumber(psCfg.smoothingSeconds, 1, 600, 10) : 0;
                    const dtSec = this._gridPowerLastTs > 0 ? Math.max(0.05, Math.min(10, (nowTs - this._gridPowerLastTs) / 1000)) : (this._intervalMs / 1000);
                    const sourceChanged = this._gridPowerLastResolutionSource && this._gridPowerLastResolutionSource !== snapshot.source;
                    this._gridPowerLastTs = nowTs;
                    this._gridPowerLastResolutionSource = snapshot.source;
                    if (!Number.isFinite(Number(this._gridPowerAvgW)) || sourceChanged || !useAvg || tauSec <= 0) {
                        this._gridPowerAvgW = netRawRounded;
                    }
                    else {
                        const alpha = dtSec / (tauSec + dtSec);
                        this._gridPowerAvgW = Number(this._gridPowerAvgW) + alpha * (netRawRounded - Number(this._gridPowerAvgW));
                    }
                    const netAvgRounded = Math.round(Number(this._gridPowerAvgW));
                    try {
                        await this.adapter.setStateAsync('ems.gridPowerW', { val: netAvgRounded, ack: true });
                    }
                    catch (_error) { }
                    try {
                        if (typeof this.dp.handleStateChange === 'function') {
                            this.dp.handleStateChange(this._gridPowerRawId, { val: netRawRounded, ack: true, ts: nowTs, lc: nowTs });
                            this.dp.handleStateChange(this._gridPowerId, { val: netAvgRounded, ack: true, ts: nowTs, lc: nowTs });
                        }
                    }
                    catch (_error) { }
                }
            }
            catch (error) {
                try {
                    this.adapter._nvpFreshnessSnapshot = { ts: Date.now(), usable: false, fresh: false, coherent: false, degraded: false, connected: null, status: 'stale', source: 'resolver-error', reason: String(error?.message || error) };
                    await this.adapter.setStateAsync('ems.gridMeasurementFresh', { val: false, ack: true });
                    await this.adapter.setStateAsync('ems.gridMeasurementStatus', { val: 'stale', ack: true });
                    await this.adapter.setStateAsync('ems.gridMeasurementReason', { val: `resolver-error:${String(error?.message || error)}`.slice(0, 250), ack: true });
                }
                catch (_error) { }
            }
            const meshLeaseAtStart = this.adapter._meshCoordinator?.currentLimits();
            await this.mm.tick();
            this.adapter._meshCoordinator?.markApplied(meshLeaseAtStart);
            // EEBUS/CLS-Implementierungsrückmeldung erst nach dem vollständigen
            // zentralen EMS-Zyklus senden. Der API-Helfer prüft die Command-ID des
            // tatsächlich von §14a verarbeiteten Snapshots und meldet daher niemals
            // einen älteren oder nur angenommenen Befehl als umgesetzt zurück.
            try {
                if (typeof this.adapter._nwFlushPara14aEebusImplementationFeedback === 'function') {
                    await this.adapter._nwFlushPara14aEebusImplementationFeedback({
                        tickStartedAtMs: tickStart,
                        appliedAtMs: Date.now(),
                        moduleResults: Array.isArray(this.mm?.lastTickDiag?.results) ? this.mm.lastTickDiag.results : [],
                    });
                }
            }
            catch (feedbackError) {
                try {
                    this.adapter.log.warn(`[EMS] §14a EEBUS implementation feedback failed: ${feedbackError?.message || feedbackError}`);
                }
                catch (_eFeedback) { }
            }
        }
        catch (err) {
            try {
                await this.adapter.setStateAsync('ems.core.lastTickError', { val: String(err?.message || err), ack: true });
            }
            catch (_e1) {
                // ignore
            }
            throw err;
        }
        finally {
            // An older timed-out cycle must never clear the mutex of a newer cycle.
            const ownsTickLock = this._activeTickId === tickId;
            if (ownsTickLock) {
                this._tickRunning = false;
                this._activeTickId = 0;
            }
            const dur = Date.now() - tickStart;
            this._lastTickEndMs = Date.now();
            this._publishSchedulerHeartbeat('tick-end').catch(() => { });
            try {
                if (ownsTickLock)
                    await this.adapter.setStateAsync('ems.core.tickRunning', { val: false, ack: true });
                await this.adapter.setStateAsync('ems.core.lastTickEnd', { val: this._lastTickEndMs, ack: true });
                await this.adapter.setStateAsync('ems.core.lastTickDurationMs', { val: Math.round(dur), ack: true });
            }
            catch (_e2) {
                // ignore
            }
            // Wurde während dieses Regelzyklus ein Modus oder eine Bedienfreigabe
            // geändert, folgt direkt ein weiterer normaler EMS-Tick. Die kurze
            // Nachlaufverzögerung verhindert einen Busy-Loop und lässt State-Updates
            // desselben Bedienvorgangs zusammenlaufen.
            if (this._immediateTickPending && !this._immediateTickTimer && this.adapter && !this.adapter._nwShuttingDown) {
                this._scheduleImmediateTick(10);
            }
        }
    }
    /**
     * Code-Teil: Methode `stop`
     * Zweck: verwaltet Lifecycle/Ressourcen wie Server, Timer oder SSE-Verbindungen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: stop
     * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Ablauf und Zusammenhang: Beendet periodische, schnelle und Heartbeat-Timer und stoppt die Module. Dieser Pfad gehört zur Adapter-Abschaltung und darf keine neue Stellanforderung planen.
     */
    stop() {
        if (this._schedulerHeartbeatTimer) {
            this._clearInterval(this._schedulerHeartbeatTimer);
            this._schedulerHeartbeatTimer = null;
        }
        this._schedulerHeartbeatRunning = false;
        try {
            this.adapter._nwEmsSchedulerHealth = {
                ...(this.adapter._nwEmsSchedulerHealth || {}),
                heartbeatAt: Date.now(),
                alive: false,
                reason: 'stopped',
            };
        }
        catch (_error) { }
        if (this._timer) {
            this._clearInterval(this._timer);
            this._timer = null;
        }
        if (this._immediateTickTimer) {
            this._clearTimeout(this._immediateTickTimer);
            this._immediateTickTimer = null;
        }
        this._immediateTickPending = false;
        this._immediateTickReason = '';
        this._nvpSourceIds = new Set();
        // Module dürfen eigene Publish-/Pulse-Timer besitzen. Diese werden beim Adapter-
        // Unload explizit beendet, damit kein Modul nachträglich adapter.setTimeout aufruft.
        try {
            if (this.mm && typeof this.mm.stop === 'function')
                this.mm.stop();
        }
        catch (_e) { }
        try {
            if (this._actuatorShadowArbiter && typeof this._actuatorShadowArbiter.uninstall === 'function')
                this._actuatorShadowArbiter.uninstall();
        }
        catch (_e) { }
        this._tickRunning = false;
    }
}
module.exports = { EmsEngine, deriveChargingConnectorCapacityW, computeChargingInfrastructureCapacity };
