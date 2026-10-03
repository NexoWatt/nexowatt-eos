/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/module-manager.ts
 * Quell-Hash: sha256:c8f30dc6def2b7c68f31f95b883f248d5461b8f242fb5516e121c94cb85ab2a4
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/module-manager.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt die EMS-Modulreihenfolge her, übergibt den gemeinsamen Kontext und erfasst isoliert Fehler und Laufzeiten je Modul.
 * Daten und Wirkung: Erhält den Engine-Kontext und führt aktivierte Module in der festgelegten Reihenfolge aus. Diagnose und Fehlerisolation gehören zu diesem Ablauf; Modulreihenfolge ist fachlich wirksam.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/module-manager.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
const rc85_runtime_hardening_1 = require("./rc85-runtime-hardening"); // RC88_IMPORT_HARDENING
/**
 * Executable TypeScript source: ems/module-manager.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/module-manager.js`.
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
 * Datei: ems/module-manager.js
 * Rolle im Projekt: EMS-Modulmanager.
 * Zweck: Initialisiert optionale EMS-Module abhängig von Konfiguration und Lizenz.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Modulverwaltung: registriert, initialisiert und tickt die einzelnen EMS-Module.
 * Zusammenhänge:
 * - Module liegen unter ems/modules/*.js und erben meist von BaseModule.
 * - Fehler in einem Modul dürfen den gesamten Adapter möglichst nicht abschießen.
 * Wartungshinweise:
 * - Neue Module hier nur mit klaren Lifecycle-Methoden einhängen.
 */
'use strict';
const { SpeicherMappingModule } = require('./modules/storage-mapping');
const { SpeicherRegelungModule } = require('./modules/storage-control');
const { NetOperatorInterfaceModule } = require('./modules/netoperator-interface');
const { GridConstraintsModule } = require('./modules/grid-constraints');
const { NvpCoordinatorModule } = require('./modules/nvp-coordinator');
const { PeakShavingModule } = require('./modules/peak-shaving');
const { TariffProviderModule } = require('./modules/tariff-provider');
const { TarifVisModule } = require('./modules/tarif-vis');
const { TariffStatusModule } = require('./modules/tariff-status');
const { PvForecastModule } = require('./modules/pv-forecast');
const { ChargingManagementModule } = require('./modules/charging-management');
const { MultiUseModule } = require('./modules/multi-use');
const { Para14aModule } = require('./modules/para14a');
const { CoreLimitsModule } = require('./modules/core-limits');
const { OperatingStrategiesModule } = require('./modules/operating-strategies');
const { ThermalControlModule } = require('./modules/thermal-control');
const { HeatingRodControlModule } = require('./modules/heating-rod-control');
const { NexoLogicBudgetModule } = require('./modules/nexologic-budget');
const { BhkwControlModule } = require('./modules/bhkw-control');
const { GeneratorControlModule } = require('./modules/generator-control');
const { ThresholdControlModule } = require('./modules/threshold-control');
const { AiAdvisorModule } = require('./modules/ai-advisor');
const { CountryProfileModule } = require('./modules/country-profile');
const { EnergyWalletModule } = require('./modules/energy-wallet');
const { ChargeKioskModule } = require('./modules/charge-kiosk');
const { EnergyLedgerModule } = require('./modules/energy-ledger');
const { NlP1DsmrModule } = require('./modules/nl-p1-dsmr');
const { MeshMicrogridModule } = require('./modules/mesh-microgrid');
const { StageADiagnosticsModule } = require('./modules/stage-a-diagnostics');
const { withActuatorShadowContext, priorityForOwner } = require('./services/actuator-shadow-arbiter');
const { beginAcceptedPowerEffectCycle } = require('./services/accepted-power-effects');
const featureFlags = require('./services/feature-flags');
const { beginSafetyCycle, markSafetyModuleStarted, markSafetyModuleResult, invalidateSafetyEnvelope, } = require('./services/safety-envelope');
const SAFETY_CRITICAL_MODULES = new Set([
    'gridConstraints',
    'peakShaving',
    'para14a',
    'coreLimits',
    'chargingManagement',
    'speicherRegelung',
    'multiUse',
    'thermalControl',
    'heatingRodControl',
    'nexoLogicBudget',
    'thresholdControl',
]);
// Diese Module besitzen reale flexible Last-/Speicher-Aktoren. Deaktivieren
// bedeutet deshalb nicht nur "nicht mehr ticken", sondern einen bestaetigten
// physischen 0-/AUS-Handover – auch beim Adapterstart mit bereits deaktivierter
// App oder bei einem Lizenzwechsel.
const SAFETY_ACTUATOR_MODULES = new Set([
    'chargingManagement',
    'speicherRegelung',
    'multiUse',
    'thermalControl',
    'heatingRodControl',
    'nexoLogicBudget',
    'thresholdControl',
]);
const keyFromModule = (moduleRow) => String((moduleRow && moduleRow.key) || 'unknown');
/**
 * Code-Teil: Klasse `ModuleManager`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: ModuleManager. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: Modulverwaltung für installierte EMS-Apps und Modul-Lifecycle.
/**
 * Klasse: ModuleManager
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class ModuleManager {
    /**
     * @param {any} adapter
     * @param {*} dpRegistry
     */
    constructor(adapter, dpRegistry) {
        this.adapter = adapter;
        this.dp = dpRegistry || null;
        /** @type {Array<{key: string, instance: any, enabledFn: () => boolean}>} */
        this.modules = [];
        this._lastDiagLogMs = 0;
        this._lastDiagWriteMs = 0;
        this._tickCount = 0;
        // Dynamische AppCenter-Umschaltungen duerfen ein Modul nicht ticken, bevor
        // dessen States und Datenpunkt-Mappings initialisiert wurden. Der Lifecycle
        // wird deshalb pro Modulzeile nachgefuehrt und bei Bedarf lazy gestartet.
        this._moduleInitRetryMs = 30000;
        this._moduleErrorLogAt = new Map();
        // RC88_MEMORY_GUARD: The heap monitor is bound to the real adapter
        // instance so it can close slow SSE clients before buffered live data
        // grows into an OOM. Runtime/watchdog counters are included in the
        // diagnostics but remain bounded.
        this._stopHeapMonitor = (0, rc85_runtime_hardening_1.startRc85HeapMonitor)(this.adapter?.log || console, {
            intervalMs: 30000,
            warnRatio: 0.65,
            pressureRatio: 0.75,
            restartRatio: 0.86,
            emergencyRatio: 0.92,
            sustainedSamples: 2,
            getDiagnostics: () => ({
                runtime: (0, rc85_runtime_hardening_1.rc88RuntimeHardeningSnapshot)(),
                adapter: this.adapter?._nwGetMemoryDiagnostics?.() || null,
            }),
            onPressure: (sample) => this.adapter?._nwHandleHeapPressure?.(sample),
            onBeforeRestart: (sample) => this.adapter?._nwPrepareControlledRestart?.(sample),
        });
        // Last tick diagnostics (always captured, even if diagnostics are disabled)
        /**
         * @type {{
         *   ts: number,
         *   totalMs: number,
         *   results: Array<{key: string, enabled: boolean, ok: boolean, ms: number, error?: string}>,
         *   errors: Array<string>
         * }|null}
         */
        this.lastTickDiag = null;
    }
    /**
     * Code-Teil: Methode `_getDiagCfg`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getDiagCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _licenseEdition() {
        // Der Adapter prüft die lebende zentrale Lease. Alte Beobachtungs-States
        // und lokale Editionslabels sind keine Berechtigung für einen Modultick.
        try {
            return featureFlags.normalizeEdition(this.adapter?._nwCurrentLicenseEdition?.());
        }
        catch (_e) { }
        return 'none';
    }
    _licenseAllowsApp(appId) {
        // Dieselbe serverseitige Entscheidung wie App-Center/API einschließlich
        // signierter Kontingente. Fehlender Prüfer oder Ausnahme sperrt das Modul.
        try {
            return this.adapter?._nwLicenseAllowsAppId?.(String(appId || '')) === true;
        }
        catch (_e) {
            return false;
        }
    }
    _getDiagCfg() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.diagnostics) ? this.adapter.config.diagnostics : null;
        const enabled = !!(cfg && cfg.enabled);
        const writeStates = enabled && (cfg.writeStates !== false);
        const logLevel = (cfg && (cfg.logLevel === 'info' || cfg.logLevel === 'debug')) ? cfg.logLevel : 'debug';
        const maxJsonLenNum = cfg ? Number(cfg.maxJsonLen) : NaN;
        const maxJsonLen = (Number.isFinite(maxJsonLenNum) && maxJsonLenNum >= 1000) ? maxJsonLenNum : 20000;
        const logIntSecNum = cfg ? Number(cfg.logIntervalSec) : NaN;
        const logIntervalSec = (Number.isFinite(logIntSecNum) && logIntSecNum >= 0) ? logIntSecNum : 10;
        const logIntervalMs = Math.round(logIntervalSec * 1000);
        const stIntSecNum = cfg ? Number(cfg.stateIntervalSec) : NaN;
        const stateIntervalSec = (Number.isFinite(stIntSecNum) && stIntSecNum >= 0) ? stIntSecNum : 10;
        const stateIntervalMs = Math.round(stateIntervalSec * 1000);
        const alwaysOnError = enabled && (cfg ? (cfg.alwaysOnError !== false) : true);
        return { enabled, writeStates, logLevel, maxJsonLen, logIntervalMs, stateIntervalMs, alwaysOnError };
    }
    /**
     * Code-Teil: Methode `_diagLog`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _diagLog
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _diagLog(level, msg) {
        const lvl = (level === 'info' || level === 'debug') ? level : 'debug';
        const fn = (this.adapter && this.adapter.log && typeof this.adapter.log[lvl] === 'function')
            ? this.adapter.log[lvl]
            : (this.adapter && this.adapter.log ? this.adapter.log.debug : null);
        try {
            if (fn)
                fn.call(this.adapter.log, msg);
        }
        catch {
            // ignore
        }
    }
    /**
     * Code-Teil: Methode `_limitJson`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _limitJson
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _limitJson(obj, maxLen) {
        let s = '';
        try {
            s = JSON.stringify(obj);
        }
        catch {
            s = '[]';
        }
        if (!maxLen || !Number.isFinite(maxLen) || maxLen < 1000)
            maxLen = 20000;
        return s.length > maxLen ? (s.slice(0, maxLen) + '...') : s;
    }
    /**
     * Initialisiert ein Modul genau einmal, bevor dessen erster Regel-Tick laeuft.
     * AppCenter-Aenderungen koennen enabledFn zur Laufzeit von false auf true setzen;
     * ohne diesen Guard wuerde das Modul States schreiben, deren Objekte nie angelegt
     * wurden. Fehlgeschlagene Initialisierungen werden begrenzt erneut versucht.
     */
    async _ensureModuleInitialized(moduleRow, reason = 'module-init', cycleId = 'init') {
        const m = moduleRow || null;
        if (!m || !m.instance)
            return false;
        if (m.initialized === true)
            return true;
        const now = Date.now();
        if (Number.isFinite(Number(m.initRetryAfterMs)) && now < Number(m.initRetryAfterMs))
            return false;
        if (typeof m.instance.init !== 'function') {
            m.initialized = true;
            return true;
        }
        try {
            const initContext = {
                owner: keyFromModule(m),
                module: keyFromModule(m),
                priority: priorityForOwner(keyFromModule(m)),
                reason: 'module-init',
                cycleId,
                leaseMs: 15000,
            };
            if (reason && reason !== 'module-init')
                initContext.reason = String(reason);
            await withActuatorShadowContext(this.adapter, initContext, () => m.instance.init());
            m.initialized = true;
            m.initRetryAfterMs = 0;
            m.initError = '';
            return true;
        }
        catch (e) {
            const err = String((e && e.message) ? e.message : e);
            m.initialized = false;
            m.initRetryAfterMs = now + Math.max(1000, Number(this._moduleInitRetryMs) || 30000);
            if (m.initError !== err)
                this.adapter.log.warn(`Module '${keyFromModule(m)}' init error: ${err}`);
            m.initError = err;
            return false;
        }
    }
    /**
     * Beendet einen deaktivierten Hardwarepfad genau einmal und meldet den
     * Erfolg an den Safety-Latch. Ein fehlender oder fehlgeschlagener Safe-Stop
     * gilt bei Aktormodulen als kritischer Fehler und wird im naechsten Zyklus
     * erneut versucht.
     */
    async _deactivateModule(moduleRow, cycleId = 'disabled', force = false) {
        const m = moduleRow || null;
        if (!m || !m.instance)
            return true;
        const key = keyFromModule(m);
        const safetyActuator = SAFETY_ACTUATOR_MODULES.has(key);
        const shouldRun = force === true || m.lastEnabled === true || (safetyActuator && m.deactivated !== true);
        if (!shouldRun)
            return true;
        try {
            // RC79: Auch ein beim Cold-Start deaktiviertes Aktormodul muss zuerst
            // seine Objektstruktur anlegen. Mehrere deactivate()-Pfade schreiben
            // Diagnose-/Summary-States; ohne vorheriges init() erzeugt ioBroker
            // Warnungen wie "State ... has no existing object". Die Initialisierung
            // geschieht weiterhin unter dem Actuator-Shadow und darf keine aktive
            // Regelung ausloesen; unmittelbar danach folgt der bestaetigte Safe-Stop.
            if (safetyActuator && m.initialized !== true) {
                const initialized = await this._ensureModuleInitialized(m, 'module-disabled-object-init', cycleId);
                if (!initialized)
                    throw new Error(String(m.initError || 'safety-deactivate-init-failed'));
            }
            if (safetyActuator && typeof m.instance.deactivate !== 'function') {
                throw new Error('safety-deactivate-hook-missing');
            }
            let result = null;
            if (typeof m.instance.deactivate === 'function') {
                result = await withActuatorShadowContext(this.adapter, {
                    owner: key,
                    module: key,
                    priority: priorityForOwner(key),
                    reason: 'module-disabled-safe-stop',
                    cycleId,
                    leaseMs: 5000,
                }, () => m.instance.deactivate());
            }
            if (result === false || (result && typeof result === 'object' && result.ok === false)) {
                throw new Error(String(result && result.error || 'safe-stop-not-confirmed'));
            }
            m.deactivated = true;
            m.deactivateError = '';
            // Bei einer spaeteren Reaktivierung werden Konfiguration und DP-Mappings
            // neu eingelesen. Always-init-Module bleiben initialisiert.
            if (m.alwaysInit !== true)
                m.initialized = false;
            return true;
        }
        catch (e) {
            const error = String((e && e.message) ? e.message : e);
            m.deactivated = false;
            m.deactivateError = error;
            this.adapter.log.warn(`Module '${key}' deactivate error: ${error}`);
            if (safetyActuator) {
                if (!this.adapter._nwSafetyCriticalFaults || typeof this.adapter._nwSafetyCriticalFaults !== 'object')
                    this.adapter._nwSafetyCriticalFaults = {};
                const fault = { generation: cycleId, key, error: `deactivate:${error}`, ts: Date.now() };
                this.adapter._nwSafetyCriticalFault = fault;
                this.adapter._nwSafetyCriticalFaults[key] = fault;
                invalidateSafetyEnvelope(this.adapter, `critical-module-deactivate-failed:${key}:${error}`, {
                    generation: cycleId,
                    emergencyStop: true,
                });
                try {
                    this.adapter?._nwRequestImmediateEmsTick?.(`safety:module-deactivate:${key}`, 100);
                }
                catch (_tickError) { }
            }
            return false;
        }
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
     * Ablauf und Zusammenhang: Initialisiert die zusammengestellten EMS-Module und ihre gemeinsamen Dienste. Aktivierung, Reihenfolge und Fehlerzustände bestimmen, welche Module später am Regelzyklus teilnehmen.
     */
    async init() {
        // Länderprofil / Systemsprache – immer aktiv, damit DE/NL und UI-Sprache zentral bereitstehen.
        this.modules.push({
            key: 'countryProfile',
            instance: new CountryProfileModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Speicher-Zuordnung (Installateur) – registriert st.* Datenpunkte
        this.modules.push({
            key: 'speicherMapping',
            instance: new SpeicherMappingModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Netzbetreiber-Schnittstelle hinter dem zertifizierten EZA-/Parkregler.
        // Sie liest und normalisiert ausschließlich die Regler-Vorgaben. Bei aktivem,
        // in Betrieb genommenem und freigegebenem Regler konsumiert GridConstraints
        // den validierten Envelope als Führungsgrenze. Dieses Modul schreibt selbst
        // weder Wechselrichter noch Speicher oder Ladepunkte.
        this.modules.push({
            key: 'netOperatorInterface',
            instance: new NetOperatorInterfaceModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('netOperator') && !!(this.adapter && this.adapter.config && (this.adapter.config.enableNetOperatorInterface === true ||
                (this.adapter.config.netOperatorInterface && this.adapter.config.netOperatorInterface.enabled === true))),
        });
        // Grid constraints (RLM / Nulleinspeisung). Im zentralen EMS wird die
        // dynamische PV-/WR-Regelung bewusst in zwei Phasen geteilt: Planung
        // vor den Aktoren, Rest-Einspeisung nach dem Speicher/Farm-Sollwert.
        const gridConstraintsModule = new GridConstraintsModule(this.adapter, this.dp);
        gridConstraintsModule.setDeferredDynamicPv(true);
        this._gridConstraintsModule = gridConstraintsModule;
        this.modules.push({
            key: 'gridConstraints',
            instance: gridConstraintsModule,
            enabledFn: () => true,
        });
        // Peak shaving
        this.modules.push({
            key: 'peakShaving',
            instance: new PeakShavingModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('peak') && (!!this.adapter.config.enablePeakShaving || !!(this.adapter.config.peakShaving && this.adapter.config.peakShaving.atypical && this.adapter.config.peakShaving.atypical.enabled)),
        });
        // §14a EnWG (steuerbare Verbrauchseinrichtungen)
        // Runs BEFORE Charging-Management so it can provide caps via adapter._para14a.
        this.modules.push({
            key: 'para14a',
            instance: new Para14aModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('para14a') && require('./services/country-profile-service').getConfiguredCountryProfile(this.adapter?.config || {}).supportsParagraph14a === true && !!(this.adapter?.config?.installerConfig?.para14a),
        });
        // Direkte Tarifprovider (Tibber/EnergyZero/ENTSO-E/Ostrom/Custom REST).
        // Publiziert ausschließlich normalisierte Preis-DPs und läuft bewusst vor TarifVis,
        // damit die bestehenden Speicher-/EVCS-/Tariflogiken ohne externen Adapter arbeiten.
        this.modules.push({
            key: 'tariffProvider',
            instance: new TariffProviderModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Tarif (VIS) – stellt Ladepark-Deckel bereit
        this.modules.push({
            key: 'tarifVis',
            instance: new TarifVisModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // PV Forecast (Provider-agnostisch) – liefert kWh/24h usw. für PV-aware Strategien
        // Runs after Tarife (independent), before storage-control so the snapshot is fresh.
        this.modules.push({
            key: 'pvForecast',
            instance: new PvForecastModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Core Caps/Budgets (Snapshot) – runs after sources (peak/tariff/14a) and before actuators.
        this.modules.push({
            key: 'coreLimits',
            instance: new CoreLimitsModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Betriebsstrategien: reiner Planer ohne Hardware-Writer. Das Modul läuft
        // nach den zentralen Limits und vor den Fachaktoren, damit Lade-, Speicher-,
        // Thermik- und Heizstabmodule im selben Tick nur eine frische, zeitlich
        // begrenzte Strategieanforderung lesen. Die Fachmodule bleiben Single Writer.
        this.modules.push({
            key: 'operatingStrategies',
            instance: new OperatingStrategiesModule(this.adapter, this.dp),
            enabledFn: () => {
                if (!this._licenseAllowsApp('operatingStrategies'))
                    return false;
                const config = this.adapter && this.adapter.config ? this.adapter.config : {};
                const app = config.emsApps && config.emsApps.apps ? config.emsApps.apps.operatingStrategies : null;
                return !!(app && app.installed === true && app.enabled === true
                    && config.operatingStrategies && config.operatingStrategies.enabled === true);
            },
        });
        // Charging management
        this.modules.push({
            key: 'chargingManagement',
            instance: new ChargingManagementModule(this.adapter, this.dp),
            enabledFn: () => {
                if (!this._licenseAllowsApp('charging'))
                    return false;
                // Backwards compatible default:
                // Older installations may not have the new EMS config persisted yet.
                // If the flag is missing (undefined/null), we enable the module so the
                // runtime control states exist and the EVCS page can operate consistently.
                // If the user explicitly disables it in Admin, we respect that.
                const v = this.adapter && this.adapter.config ? this.adapter.config.enableChargingManagement : undefined;
                if (typeof v === 'boolean')
                    return v;
                // Safe-ish default for upgrades: enable if there is at least one configured
                // chargepoint entry (EVCS list/table). Even without mapped setpoints, the
                // module will simply not write anything, but it will expose states.
                try {
                    const cnt = Number(this.adapter && this.adapter.config && this.adapter.config.settingsConfig && this.adapter.config.settingsConfig.evcsCount);
                    if (Number.isFinite(cnt) && cnt > 0)
                        return true;
                    const list = (this.adapter && Array.isArray(this.adapter.evcsList)) ? this.adapter.evcsList : [];
                    if (list && list.length)
                        return true;
                }
                catch {
                    // ignore
                }
                return false;
            },
        });
        // Niederlande P1/DSMR Basis: normalisiert P1-Daten für Netafname/Teruglevering.
        // Das Modul bleibt read-only und ist bewusst hersteller-/adapteroffen. Es läuft für
        // Home und EOS, wenn NL ausgewählt ist oder der Installer P1 explizit aktiviert.
        this.modules.push({
            key: 'nlP1',
            instance: new NlP1DsmrModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('nlP1') && !!(this.adapter && this.adapter.config && ((this.adapter.config.countryProfile && String(this.adapter.config.countryProfile.country || '').toUpperCase() === 'NL') ||
                (this.adapter.config.nlP1 && this.adapter.config.nlP1.enabled === true))),
        });
        // Energie-Wertkonto (read-only): Home + EOS. Bewertet PV-Nutzung in Euro, schaltet aber nichts.
        this.modules.push({
            key: 'energyWallet',
            instance: new EnergyWalletModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('energyWallet') && !(this.adapter && this.adapter.config && this.adapter.config.energyWallet && this.adapter.config.energyWallet.enabled === false),
        });
        // EOS DC Station Display / Charge Kiosk: tokenisierte Display-Seiten pro DC-Ladestation.
        this.modules.push({
            key: 'chargeKiosk',
            instance: new ChargeKioskModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('chargeKiosk') && !!(this.adapter && this.adapter.config && (this.adapter.config.enableChargeKiosk === true ||
                (this.adapter.config.chargeKiosk && this.adapter.config.chargeKiosk.enabled === true))),
        });
        // EOS Local kWh Ledger: read-only Grundlage für Betreiberwerte, spätere Abrechnung,
        // Nachbarschaftsversorgung und Microgrid/Energy-Hub-Logik. Das Modul nutzt neutrale
        // NexoWatt-Sessiondaten und ist bewusst nicht auf OCPP oder einen Hersteller begrenzt.
        this.modules.push({
            key: 'energyLedger',
            instance: new EnergyLedgerModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('energyLedger') && !!(this.adapter && this.adapter.config && (this.adapter.config.enableEnergyLedger === true ||
                (this.adapter.config.energyLedger && this.adapter.config.energyLedger.enabled === true) ||
                (this.adapter.config.chargeKiosk && this.adapter.config.chargeKiosk.enabled === true))),
        });
        // EMS-App Microgrid: AppCenter-Zustand gibt den zugehörigen Koordinator frei.
        // Der schnelle Netzkanal liefert Grenzen an die vorhandenen EMS-Writer.
        // Dieses Bestandsmodul pausiert bei eingerichtetem Koordinator, damit niemals
        // zwei Regelpfade parallel schreiben (siehe MeshMicrogridModule.tick).
        this.modules.push({
            key: 'meshMicrogrid',
            instance: new MeshMicrogridModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('meshMicrogrid') && !!(this.adapter && this.adapter.config && (this.adapter.config.enableMeshMicrogrid === true ||
                (this.adapter.config.meshMicrogrid && this.adapter.config.meshMicrogrid.enabled === true))),
        });
        // Speicher-Regelung (Sollleistung/Reserve/PV/Lastspitze)
        // Läuft NACH dem Lademanagement, damit EVCS-StorageAssist im gleichen Tick berücksichtigt wird.
        // Das Modul bleibt unter der Speicherlizenz initialisiert, damit ein Wechsel zwischen
        // Einzelspeicher und Speicherfarm sowie Policy-/Diagnosewerte ohne Modul-Neustart
        // konsistent bleiben. Hardware schreibt es ausschließlich, wenn die zentrale
        // Speicher-Autorität genau eine beschreibbare Topologie ausgewählt hat.
        this.modules.push({
            key: 'speicherRegelung',
            instance: new SpeicherRegelungModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('storage'),
        });
        // MultiUse nutzt ausschließlich den nach EVCS und Speicher verbleibenden
        // zentralen Gesamt-/PV-Grant. Es läuft deshalb vor Thermik und Heizstab;
        // bestätigte MultiUse-Leistung wird im selben Tick zentral reserviert.
        this.modules.push({
            key: 'multiUse',
            instance: new MultiUseModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('multiuse') && !!this.adapter.config.enableMultiUse,
        });
        // Thermische Steuerung (Wärmepumpe/Klima)
        // Läuft NACH dem Lademanagement, damit PV‑Restbudget (pvCapEffective - EVCS used)
        // innerhalb des gleichen Ticks genutzt werden kann.
        this.modules.push({
            key: 'thermalControl',
            instance: new ThermalControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('thermal') && !!this.adapter.config.enableThermalControl,
        });
        // Gestufte Heizstäbe (native 1..12 Stufen)
        // Läuft NACH der Thermik. Damit bekommen Wärmepumpen/Klima zuerst das PV‑Budget,
        // Heizstäbe nutzen anschließend den verbleibenden Restüberschuss.
        this.modules.push({
            key: 'heatingRodControl',
            instance: new HeatingRodControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('heatingrod') && !!this.adapter.config.enableHeatingRodControl,
        });
        // C3.4: Budgetierte NexoLogic-Ausgaenge nutzen ausschließlich den nach
        // EVCS, Speicher, MultiUse, Thermik und Heizstab verbleibenden zentralen
        // Grant. Nicht budgetierte Alt-Ausgaenge bleiben ereignisgetrieben.
        this.modules.push({
            key: 'nexoLogicBudget',
            instance: new NexoLogicBudgetModule(this.adapter, this.dp),
            enabledFn: () => this.adapter?.config?.enableNexoLogic !== false,
        });
        // BHKW Steuerung (Start/Stop, SoC-geführt)
        this.modules.push({
            key: 'bhkwControl',
            instance: new BhkwControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('bhkw') && !!this.adapter.config.enableBhkwControl,
        });
        this.modules.push({
            key: 'generatorControl',
            instance: new GeneratorControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('generator') && !!this.adapter.config.enableGeneratorControl,
        });
        // Schwellwertsteuerung (generische Regeln)
        // Läuft NACH der Thermik, damit PV‑Restbudget bereits berücksichtigt ist (falls relevant).
        this.modules.push({
            key: 'thresholdControl',
            instance: new ThresholdControlModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('threshold') && !!this.adapter.config.enableThresholdControl,
        });
        // Baustein 5C: PV-/WR-Regelung ist der letzte physische NVP-Aktor.
        // Speicher/Farm, Wallboxen, MultiUse, Thermik, Heizstab, NexoLogic und
        // lokale Erzeuger haben vorher ihre akzeptierten Änderungen in das
        // Same-cycle-Ledger eingetragen. Die PV bearbeitet ausschließlich den Rest.
        this.modules.push({
            key: 'nvpCoordinator',
            instance: new NvpCoordinatorModule(this.adapter, this.dp, gridConstraintsModule, () => true),
            enabledFn: () => true,
        });
        // Die sichtbare Tarifwahrheit wird erst nach Speicher-, Verbraucher-,
        // Erzeuger- und finaler PV-Entscheidung aufgebaut.
        this.modules.push({
            key: 'tariffStatus',
            instance: new TariffStatusModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // KI‑Energieberater / KI‑Optimierung (advisory only)
        // Runs late in the tick so it can read the fresh budget/tariff/peak/storage snapshots.
        this.modules.push({
            key: 'aiAdvisor',
            instance: new AiAdvisorModule(this.adapter, this.dp),
            enabledFn: () => this._licenseAllowsApp('aiAdvisor') && !!(this.adapter.config.enableAiAdvisor || this.adapter.config.enableAiOptimization),
        });
        // Stufe A ist eine rein lesende Feld-Diagnose. Sie läuft bewusst zuletzt,
        // damit Mapping-, Owner- und Frischezustände aller Module im selben Tick
        // vollständig sichtbar sind, ohne einen Hardware-Sollwert zu verändern.
        this.modules.push({
            key: 'stageADiagnostics',
            instance: new StageADiagnosticsModule(this.adapter, this.dp),
            enabledFn: () => true,
        });
        // Init modules
        // Hinweis: Einige Module stellen UI-States bereit (z. B. EVCS), die auch dann
        // vorhanden sein sollen, wenn die Logik aktuell deaktiviert ist.
        const alwaysInit = new Set(['operatingStrategies', 'chargingManagement', 'netOperatorInterface', 'nvpCoordinator', 'aiAdvisor', 'energyWallet', 'stageADiagnostics']);
        for (const m of this.modules) {
            const enabled = !!(m && typeof m.enabledFn === 'function' ? m.enabledFn() : false);
            m.enabled = enabled;
            m.lastEnabled = enabled;
            m.deactivated = false;
            m.alwaysInit = alwaysInit.has(m.key);
            const shouldInit = enabled || m.alwaysInit;
            if (shouldInit)
                await this._ensureModuleInitialized(m, 'module-init', 'init');
            // Cold-start-Failsafe: Ein vor dem Neustart aktiver Hardware-Sollwert
            // darf nicht weiterlaufen, nur weil die App inzwischen deaktiviert ist.
            if (!enabled && SAFETY_ACTUATOR_MODULES.has(String(m.key || ''))) {
                await this._deactivateModule(m, 'init', true);
            }
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
     * Zusammenhang: Teil von EMS-Kern: Engine, Module, Datenpunkte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Ablauf und Zusammenhang: Führt die aktiven Module im vorgesehenen Ablauf aus und erfasst deren Ergebnis einzeln. Gemeinsame Budgets und Sicherheitszustände verbinden aufeinanderfolgende Module; eine parallele Umstellung würde diese Reihenfolge verändern.
     */
    async tick() {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        const diag = this._getDiagCfg();
        const now = Date.now();
        const t0 = now;
        this._tickCount = (this._tickCount || 0) + 1;
        this.adapter._nwActiveEmsCycleId = this._tickCount;
        // P0-Safety: Ein Fehler eines sicherheitsrelevanten Moduls bleibt über
        // Zyklusgrenzen hinweg verriegelt. Erst ein vollständig erfolgreicher
        // Tick desselben Moduls löscht den Fault; Core-Limits gibt positive
        // Verbraucher danach bewusst erst im nächsten sauberen Zyklus frei.
        if (!this.adapter._nwSafetyCriticalFaults || typeof this.adapter._nwSafetyCriticalFaults !== 'object' || Array.isArray(this.adapter._nwSafetyCriticalFaults)) {
            this.adapter._nwSafetyCriticalFaults = {};
        }
        this.adapter._nwSafetyCriticalFault = null;
        let criticalFaultCleared = false;
        let criticalFaultRaised = false;
        beginSafetyCycle(this.adapter, this._tickCount, now);
        beginAcceptedPowerEffectCycle(this.adapter, this._tickCount, now);
        /** @type {Array<{key: string, enabled: boolean, ok: boolean, ms: number, error?: string}>} */
        const results = [];
        /** @type {Array<string>} */
        const errors = [];
        for (const m of this.modules) {
            if (!this.adapter || this.adapter._nwShuttingDown)
                break;
            const enabled = !!(m && typeof m.enabledFn === 'function' && m.enabledFn());
            const key = String((m && m.key) || 'unknown');
            if (!enabled) {
                const deactivated = await this._deactivateModule(m, this._tickCount);
                if (m)
                    m.lastEnabled = false;
                if (!deactivated) {
                    const error = String(m && m.deactivateError || 'safe-stop-not-confirmed');
                    criticalFaultRaised = SAFETY_CRITICAL_MODULES.has(key) || criticalFaultRaised;
                    markSafetyModuleResult(this.adapter, key, false, error, this._tickCount, Date.now());
                    results.push({ key, enabled: false, ok: false, ms: 0, error });
                    continue;
                }
                markSafetyModuleResult(this.adapter, key, true, 'disabled-safe', this._tickCount, Date.now());
                if (SAFETY_CRITICAL_MODULES.has(key) && this.adapter._nwSafetyCriticalFaults[key]) {
                    delete this.adapter._nwSafetyCriticalFaults[key];
                    criticalFaultCleared = true;
                }
                results.push({ key, enabled: false, ok: true, ms: 0 });
                continue;
            }
            if (!m || !m.instance || typeof m.instance.tick !== 'function') {
                const missingError = 'module-instance-or-tick-missing';
                if (SAFETY_CRITICAL_MODULES.has(key)) {
                    const fault = { generation: this._tickCount, key, error: missingError, ts: Date.now() };
                    this.adapter._nwSafetyCriticalFault = fault;
                    this.adapter._nwSafetyCriticalFaults[key] = fault;
                    criticalFaultRaised = true;
                    invalidateSafetyEnvelope(this.adapter, `critical-module-missing:${key}`, { generation: this._tickCount, emergencyStop: true });
                    markSafetyModuleResult(this.adapter, key, false, missingError, this._tickCount, Date.now());
                    results.push({ key, enabled: true, ok: false, ms: 0, error: missingError });
                }
                else {
                    results.push({ key, enabled: false, ok: true, ms: 0 });
                }
                continue;
            }
            const initialized = await this._ensureModuleInitialized(m, 'module-lazy-init', this._tickCount);
            m.lastEnabled = true;
            m.deactivated = false;
            if (!initialized) {
                const initError = String(m.initError || 'module-init-pending');
                if (SAFETY_CRITICAL_MODULES.has(key)) {
                    const fault = { generation: this._tickCount, key, error: initError, ts: Date.now() };
                    this.adapter._nwSafetyCriticalFault = fault;
                    this.adapter._nwSafetyCriticalFaults[key] = fault;
                    criticalFaultRaised = true;
                    invalidateSafetyEnvelope(this.adapter, `critical-module-init-failed:${key}`, { generation: this._tickCount, emergencyStop: true });
                }
                results.push({ key, enabled: true, ok: false, ms: 0, error: initError });
                markSafetyModuleResult(this.adapter, key, false, initError, this._tickCount, Date.now());
                continue;
            }
            const t1 = Date.now();
            let ok = true;
            let errMsg = '';
            markSafetyModuleStarted(this.adapter, key, this._tickCount, t1);
            this.adapter._nwLastEmsModuleStarted = { key, ts: t1, cycleId: this._tickCount };
            try {
                await this.adapter.setStateAsync('ems.core.lastModuleStarted', { val: key, ack: true });
            }
            catch (_stateError) { }
            try {
                const configuredTimeoutMs = Number(this.adapter?.config?.diagnostics?.emsModuleTimeoutMs);
                const timeoutMs = Number.isFinite(configuredTimeoutMs)
                    ? Math.max(2000, Math.min(60000, configuredTimeoutMs))
                    : (key === 'chargingManagement' ? 15000 : 10000);
                // RC85_MODULE_WATCHDOG: a single non-returning module/device call
                // must not freeze the complete EMS scheduler. The helper also
                // deduplicates unresolved work so no Promise pile-up can grow the
                // V8 heap on every one-second cycle.
                const isolated = await (0, rc85_runtime_hardening_1.rc85RunIsolatedResult)(`ems-module:${key}`, timeoutMs, () => withActuatorShadowContext(this.adapter, { owner: key, module: key, priority: priorityForOwner(key), reason: 'module-tick', cycleId: this._tickCount, leaseMs: 15000 }, () => m.instance.tick()), this.adapter?.log || console);
                if (!isolated.ok) {
                    const prefix = isolated.timedOut
                        ? 'module-timeout'
                        : (isolated.skipped ? 'module-still-in-flight' : 'module-error');
                    throw new Error(`${prefix}:${key}:${isolated.error?.message || 'unknown'}`);
                }
                this.adapter._nwLastEmsModuleCompleted = { key, ts: Date.now(), cycleId: this._tickCount };
                try {
                    await this.adapter.setStateAsync('ems.core.lastModuleCompleted', { val: key, ack: true });
                }
                catch (_stateError) { }
            }
            catch (e) {
                ok = false;
                errMsg = String((e && e.message) ? e.message : e);
                errors.push(`${key}: ${errMsg}`);
                if (SAFETY_CRITICAL_MODULES.has(key)) {
                    const fault = { generation: this._tickCount, key, error: errMsg, ts: Date.now() };
                    this.adapter._nwSafetyCriticalFault = fault;
                    this.adapter._nwSafetyCriticalFaults[key] = fault;
                    criticalFaultRaised = true;
                    invalidateSafetyEnvelope(this.adapter, `critical-module-tick-failed:${key}`, { generation: this._tickCount, emergencyStop: true });
                }
                const errorSignature = `${key}:${errMsg}`.slice(0, 240);
                const lastErrorLogAt = this._moduleErrorLogAt.get(errorSignature) || 0;
                const nowError = Date.now();
                if (nowError - lastErrorLogAt >= 60000) {
                    this._moduleErrorLogAt.set(errorSignature, nowError);
                    while (this._moduleErrorLogAt.size > 128) {
                        const oldest = this._moduleErrorLogAt.keys().next().value;
                        if (!oldest)
                            break;
                        this._moduleErrorLogAt.delete(oldest);
                    }
                    this.adapter.log.warn(`Modul '${key}': Fehler im Regel-Tick: ${errMsg}`);
                }
                try {
                    await this.adapter.setStateAsync('ems.core.lastModuleTimeout', { val: `${key}: ${errMsg}`.slice(0, 500), ack: true });
                }
                catch (_stateError) { }
            }
            markSafetyModuleResult(this.adapter, key, ok, errMsg, this._tickCount, Date.now());
            if (ok && SAFETY_CRITICAL_MODULES.has(key) && this.adapter._nwSafetyCriticalFaults[key]) {
                delete this.adapter._nwSafetyCriticalFaults[key];
                criticalFaultCleared = true;
            }
            const ms = Date.now() - t1;
            results.push({ key, enabled: true, ok, ms, ...(ok ? {} : { error: errMsg }) });
        }
        const totalMs = Date.now() - t0;
        // Ein neuer Fehler löst schnellstmöglich den nächsten Safe-Zero-Zyklus
        // aus. Nach Fehlerbehebung ist ebenfalls ein weiterer kompletter Zyklus
        // erforderlich, weil Core-Limits den persistenten Fault zu Beginn dieses
        // Durchlaufs noch korrekt als Sperre gesehen hat.
        if (criticalFaultRaised || criticalFaultCleared) {
            try {
                this.adapter?._nwRequestImmediateEmsTick?.(criticalFaultRaised ? 'safety:critical-module-fault' : 'safety:critical-module-recovered', criticalFaultRaised ? 100 : 0);
            }
            catch (_tickError) { }
        }
        // Persist last results for UI/Installer APIs
        try {
            this.lastTickDiag = {
                ts: now,
                totalMs,
                results,
                errors,
            };
        }
        catch (_e) {
            // ignore
        }
        if (!this.adapter || this.adapter._nwShuttingDown || !diag.enabled)
            return;
        const hasError = errors.length > 0;
        const shouldLog = (diag.logIntervalMs <= 0)
            || ((now - (this._lastDiagLogMs || 0)) >= diag.logIntervalMs)
            || (diag.alwaysOnError && hasError);
        const shouldWrite = diag.writeStates && ((diag.stateIntervalMs <= 0)
            || ((now - (this._lastDiagWriteMs || 0)) >= diag.stateIntervalMs)
            || (diag.alwaysOnError && hasError));
        const parts = results
            .filter(r => r.enabled)
            .map(r => `${r.key}:${r.ms}ms${r.ok ? '' : '!'}`);
        const summary = `tick ${totalMs}ms` + (parts.length ? (' | ' + parts.join(' ')) : '');
        if (shouldLog) {
            this._lastDiagLogMs = now;
            this._diagLog(diag.logLevel, `[DIAG] ${summary}`);
        }
        if (shouldWrite) {
            this._lastDiagWriteMs = now;
            try {
                await this.adapter.setStateAsync('diagnostics.lastTick', t0, true);
                await this.adapter.setStateAsync('diagnostics.lastTickMs', totalMs, true);
                await this.adapter.setStateAsync('diagnostics.summary', summary, true);
                await this.adapter.setStateAsync('diagnostics.tickCount', this._tickCount, true);
                await this.adapter.setStateAsync('diagnostics.lastLog', this._lastDiagLogMs || 0, true);
                await this.adapter.setStateAsync('diagnostics.lastWrite', now, true);
                const modulesJson = this._limitJson(results, diag.maxJsonLen);
                await this.adapter.setStateAsync('diagnostics.modules', modulesJson, true);
                const errText = hasError ? errors.slice(0, 10).join(' | ') : '';
                await this.adapter.setStateAsync('diagnostics.errors', errText, true);
            }
            catch (e) {
                this.adapter.log.debug(`Diagnostics state write failed: ${String((e && e.message) ? e.message : e)}`);
            }
        }
    }
    /**
     * Code-Teil: stop
     * Zweck: Beendet optionale Modul-Timer und Publish-Queues beim Adapter-Unload.
     * Zusammenhang: Verhindert, dass ein Modul nach Beginn des ioBroker-Shutdowns neue
     * adapter.setTimeout-Aufrufe oder State-Publishes startet.
     */
    /**
     * Ablauf und Zusammenhang: Beendet Module und Laufzeitüberwachung. Wird von der Engine beim Stoppen aufgerufen, damit Modul-Timer und weitere Hintergrundarbeit nicht fortlaufen.
     */
    stop() {
        try {
            this._stopHeapMonitor?.();
        }
        catch (_error) { }
        this._stopHeapMonitor = undefined;
        try {
            (0, rc85_runtime_hardening_1.rc88ClearRuntimeHardening)();
        }
        catch (_error) { }
        for (const m of this.modules || []) {
            try {
                if (m && m.instance && typeof m.instance.stop === 'function')
                    m.instance.stop();
            }
            catch (_e) {
                // Ein fehlerhaftes Modul darf den restlichen Shutdown nicht blockieren.
            }
        }
    }
}
module.exports = { ModuleManager };
