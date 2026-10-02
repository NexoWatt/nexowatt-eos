// @ts-nocheck
// 0.7.115 Legacy Compact Cleanup Marker: diagnosticPayloadMode / cleanupRemovalCandidate
/**
 * Heating-Rod Runtime-Migrationshinweis (DE):
 * Diese große Runtime-Spiegeldatei bleibt im normalen Projekt-Typecheck vorerst mit
 * @ts-nocheck geschützt. In 0.7.90 wird sie gezielt typisiert vorbereitet:
 * Adapter-Zugriff, Datenpunkt-Registry, Heizstab-Geräte, Stufenmodell,
 * Speicherreserve und Stufensteuerung bekommen erste TypeScript-Verträge.
 *
 * Wichtig:
 * Die produktive Runtime bleibt ems/modules/heating-rod-control.js. Dieser Spiegel
 * dient als sicherer Migrationsraum und wird zusätzlich in einem gelockerten Check
 * ohne @ts-nocheck kompiliert.
 */
/**
 * TypeScript-Parallelspiegel: ems/modules/heating-rod-control.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/heating-rod-control.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/. Dort ändern, die JS-Laufzeit erzeugen und diesen
 * typisierten Spiegel fachlich abgleichen. Der Funktionskatalog liegt unter docs/quellcode/.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 84c341fa2adb008a9372aba5d3a3e882ef4fca8325063c40146a7ffc194846bf
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




declare const require: any;
declare const module: any;

type HeatingRodUnknownRecord = Record<string, any>;

type HeatingRodStateValue = HeatingRodUnknownRecord & {
    val?: unknown;
    value?: unknown;
    ts?: number;
    lc?: number;
    ack?: boolean;
    q?: number;
};

type HeatingRodDatapointEntry = HeatingRodUnknownRecord & {
    objectId?: string;
    invert?: boolean;
};

type HeatingRodAdapterLike = HeatingRodUnknownRecord & {
    _zeroExportPvOwnedHeatingRod?: Record<string, { owned: boolean; ts: number; source: string }>;
    config?: HeatingRodUnknownRecord;
    stateCache?: Record<string, HeatingRodStateValue>;
    setObjectNotExistsAsync?: (id: string, obj: HeatingRodUnknownRecord) => Promise<void>;
    extendObjectAsync?: (id: string, obj: HeatingRodUnknownRecord) => Promise<void>;
    setStateAsync?: (id: string, value: unknown, ack?: boolean) => Promise<void>;
    setForeignStateAsync?: (id: string, value: unknown, ack?: boolean) => Promise<unknown>;
    getStateAsync?: (id: string) => Promise<HeatingRodStateValue | null | undefined>;
    updateValue?: (id: string, value: unknown, context?: unknown) => unknown;
    _nwGetNumberFromCache?: (key: string, fallback?: unknown) => unknown;
    _nwResolveBatteryFlowFromCache?: (opts?: HeatingRodUnknownRecord) => HeatingRodUnknownRecord;
    _nwGetStorageControlAuthority?: () => HeatingRodUnknownRecord;
    log?: { debug?: (msg: string) => void; info?: (msg: string) => void; warn?: (msg: string) => void; error?: (msg: string) => void };
};

type HeatingRodDpRegistryLike = HeatingRodUnknownRecord & {
    getMeasurementAgeMs?: (key: string) => number;
    getNumber?: (key: string, fallback?: unknown) => unknown;
    getNumberFresh?: (key: string, fallback?: unknown, staleMs?: number) => unknown;
    getBoolean?: (key: string, fallback?: unknown) => unknown;
    getEntry?: (key: string) => HeatingRodDatapointEntry | null | undefined;
    writeBoolean?: (...args: any[]) => boolean | Promise<boolean>;
    lastWriteByObjectId?: Map<string, { val: unknown; ts: number }> | HeatingRodUnknownRecord;
    isStale?: (key: string, staleMs?: number) => boolean;
    getRaw?: (key: string, fallback?: unknown) => unknown;
};

type HeatingRodStageRuntime = HeatingRodUnknownRecord & {
    stage?: number;
    powerW?: number;
    readKey?: string;
    writeKey?: string;
    readId?: string;
    writeId?: string;
    objectId?: string;
    stateId?: string;
    onAboveW?: number;
    offBelowW?: number;
};

type HeatingRodRuntimeDevice = HeatingRodUnknownRecord & {
    id?: string;
    name?: string;
    enabled?: boolean;
    mode?: string;
    userMode?: string;
    maxPowerW?: number;
    minPowerW?: number;
    stageCount?: number;
    stages?: HeatingRodStageRuntime[];
    storageReserveW?: number;
    storageReserveSocPct?: number;
    allowGrid?: boolean;
    allowBatteryDischarge?: boolean;
};

type HeatingRodDeviceRuntime = HeatingRodRuntimeDevice;

type HeatingRodStageControlState = HeatingRodUnknownRecord & {
    targetStage: number;
    lastIncreaseMs: number;
    lastDecreaseMs: number;
    autoOwned?: boolean;
    autoOwnedStage?: number;
    autoOwnedSource?: string;
    autoLastWriteMs?: number;
    autoOwnedSinceMs?: number;
    stagePowerScale?: number;
    budgetLastStepUpMs?: number;
    zeroImportSinceMs?: number;
    zeroDischargeSinceMs?: number;
    zeroCooldownUntilMs?: number;
    zeroLastStepDownMs?: number;
    zeroLastStepUpMs?: number;
    zeroProbe?: any;
    centralZeroProbeGranted?: boolean;
};

type HeatingRodBudgetProtectState = {
    importSinceMs: number;
    dischargeSinceMs: number;
};

type HeatingRodApplyStageOptions = HeatingRodUnknownRecord & {
    force?: boolean;
};

type HeatingRodShadowCompareResult = {
    field: string;
    js: unknown;
    ts: unknown;
} | null;

/**
 * TypeScript-Migrationshinweis (DE): Heizstab-Resolver/Regelungsmodul.
 *
 * Zweck:
 * Dieser Spiegel beschreibt die bestehende Heizstab-Runtime aus `ems/modules/heating-rod-control.js`.
 * Er ist noch nicht produktiv, enthält aber erste echte Verträge für Adapterzugriff,
 * Datenpunkt-Registry, Gerätekonfiguration, Stufensteuerung und Speicherreserve.
 *
 * Zusammenhang:
 * Die Heizstablogik hängt direkt an `core-limits.js`, Speicherreserve, PV-Budget,
 * Netzfreigabe, Speicherentladungsfreigabe und App-Center-Konfiguration. Fehler hier können
 * echte Ausgänge schalten oder Heizstabwerte/History verfälschen.
 *
 * Wichtig:
 * 0 W Budget ist gültig. Speicherreserve-Werte aus dem App-Center dürfen nicht auf Defaults
 * zurückspringen. TypeScript darf hier erst produktiv werden, wenn Budget- und Stufentests
 * auf echten Anlagen sauber sind.
 */

const { BaseModule } = require('./base');
const { readZeroExportMode, requestZeroExportProbe, isZeroExportGrantValid } = require('../services/zero-export-pv-coordinator');


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
function compareHeatingRodShadowField(field: string, jsValue: unknown, tsValue: unknown, toleranceW = 5): HeatingRodShadowCompareResult {
    const js = Number(jsValue);
    const ts = Number(tsValue);
    if (Number.isFinite(js) || Number.isFinite(ts)) {
        const tolerance = field === 'targetPowerW' ? Math.max(0, Number(toleranceW) || 0) : 0;
        const ok = Number.isFinite(js) && Number.isFinite(ts) && Math.abs(js - ts) <= tolerance;
        return ok ? null : { field, js: Number.isFinite(js) ? Math.round(js) : null, ts: Number.isFinite(ts) ? Math.round(ts) : null };
    }
    return jsValue === tsValue ? null : { field, js: jsValue, ts: tsValue };
}

function isHeatingRodShadowBlockingMismatch(mismatch: HeatingRodShadowCompareResult): boolean {
    const field = String(mismatch && mismatch.field || '');
    return field === 'targetStage' || field === 'exception';
}
/**
 * Code-Teil: num
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
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
    if (Number.isFinite(minV) && n < minV) return minV;
    if (Number.isFinite(maxV) && n > maxV) return maxV;
    return n;
}
/**
 * Code-Teil: safeSlot
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeSlot(slot) {
    const s = Math.round(Number(slot) || 0);
    if (s < 1) return 1;
    if (s > 10) return 10;
    return s;
}
/**
 * Code-Teil: nowMs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nowMs() {
    return Date.now();
}
/**
 * Code-Teil: normalizeMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeMode(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'manual' || s === 'manuell') return 'manual';
    if (s === 'off' || s === 'aus' || s === '0') return 'off';
    return 'pvAuto';
}
/**
 * Code-Teil: normalizeUserMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
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
 * Code-Teil: normalizeConsumerType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeConsumerType(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'generic';
    if (s === 'heatingrod' || s === 'heating_rod' || s === 'heating-rod' || s === 'immersion' || s === 'heizstab' || s === 'rod') return 'heatingRod';
    if (s === 'heatpump' || s === 'heat_pump' || s === 'heat-pump' || s === 'waermepumpe' || s === 'wärmepumpe' || s === 'hvac' || s === 'klima') return 'heatPump';
    return 'generic';
}
/**
 * Code-Teil: defaultStagePower
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
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
/**
 * Code-Teil: quickManualLevelToStageCount
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
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
// 0.7.112 Notfallback-Marker: jsFallbackLimitedToHardBlockers / hard-blockers-only / jsReferenceMismatches
class HeatingRodControlModule extends BaseModule {
    [key: string]: any;

    /** Feld: adapter — Zugriff auf ioBroker-Konfiguration, StateCache, Logging und State-Schreibvorgänge. */
    adapter: HeatingRodAdapterLike;

    /** Feld: dp — Datenpunkt-Registry mit gemappten Heizstab-/Budget-/Feedback-DPs. */
    dp: HeatingRodDpRegistryLike;

    /** Feld: _devices — Laufzeitliste der konfigurierten Heizstab-Geräte. */
    _devices: HeatingRodRuntimeDevice[];

    /** Feld: _stateCache — lokaler Modulcache; 0 W und false bleiben gültige Werte. */
    _stateCache: Map<string, any>;

    /** Feld: _stageCtl — Legacy-kompatibler Stufenregler; die Detailform ist oben als Vertrag beschrieben. */
    _stageCtl: Map<string, HeatingRodStageControlState>;

    /** Feld: _budgetProtect — Schutzfenster gegen zu schnelle Netz-/Speicherfreigabe. */
    _budgetProtect: HeatingRodBudgetProtectState;

    /** Feld: _heatingRodTsShadowLastWarnMs — drosselt reine Diagnosewarnungen. */
    _heatingRodTsShadowLastWarnMs?: number;


    /**
     * Code-Teil: typisierte Klassenfelder
     *
     * Zweck:
     * Dokumentiert die internen Laufzeitfelder der Heizstab-Regelung direkt in der Klasse.
     * Dadurch kann TypeScript prüfen, dass Methoden nicht auf zufällige dynamische Felder
     * zugreifen, sondern auf bekannte Zustände.
     *
     * Zusammenhang:
     * `_devices` kommt aus App-Center/Config, `_stageCtl` schützt Stufenwechsel vor Flattern,
     * `_budgetProtect` hält Netz-/Speicher-Schutzzeiten und `adapter`/`dp` verbinden das Modul
     * mit ioBroker-States und Datenpunkt-Mapping.
     */
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen können Heizstab-Freigaben und Reservelogik beeinflussen; Speicherreserve und PV-Budget testen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter: HeatingRodAdapterLike, dpRegistry: HeatingRodDpRegistryLike) {
        super(adapter, dpRegistry);

        /** @type {Array<any>} */
        this._devices = [];
        /** @type {Map<string, any>} */
        this._stateCache = new Map();
        /** @type {Map<string, {targetStage:number,lastIncreaseMs:number,lastDecreaseMs:number}>} */
        this._stageCtl = new Map();
        /** @type {{importSinceMs:number, dischargeSinceMs:number}} */
        this._budgetProtect = { importSinceMs: 0, dischargeSinceMs: 0 };
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
        return !!(this.adapter && this.adapter.config && this.adapter.config.enableHeatingRodControl);
    }
    /**
     * Code-Teil: _getCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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
    /**
     * Code-Teil: _getDatapoints
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _buildDevicesFromConfig
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
            /**
             * Code-Teil: configuredStageCount
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
                slot,
                id: `c${slot}`,
                name,
                enabled,
                mode,
                minOnSec,
                minOffSec,
                priority,
                boostDurationMin,
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
        /**
         * Code-Teil: ensureDefault
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
                        pvAuto: 'Auto (PV)',
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
        await mk('heatingRod.summary.zeroExportActive', 'Zero/minus feed-in logic active', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportCanProbe', 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportReason', 'Zero/minus feed-in reason', 'string', 'text');
        await mk('heatingRod.summary.zeroExportPvNowW', 'Zero/minus feed-in PV now (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.zeroExportForecastOk', 'Zero/minus feed-in forecast ok', 'boolean', 'indicator');
        await mk('heatingRod.summary.zeroExportFeedInAtLimit', 'Zero/minus feed-in limit reached', 'boolean', 'indicator');
        await mk('heatingRod.summary.pvAutomationMinW', 'PV-Auto minimum PV power (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationPvNowW', 'PV-Auto current PV power used for gate (W)', 'number', 'value.power', 'W');
        await mk('heatingRod.summary.pvAutomationAllowed', 'PV-Auto allowed by minimum PV power', 'boolean', 'indicator');
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
            await mk(`heatingRod.devices.${d.id}.zeroExportActive`, 'Zero/minus feed-in active', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportReason`, 'Zero/minus feed-in reason', 'string', 'text');
            await mk(`heatingRod.devices.${d.id}.zeroExportCanProbe`, 'Zero/minus feed-in probe allowed', 'boolean', 'indicator');
            await mk(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, 'Zero/minus feed-in next probe at', 'number', 'value.time');

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
            // Bei zentraler 0-Einspeisung ersetzt der Live-Guard den Exportabstand.
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
    /**
     * Code-Teil: _computeBasePvAvailableW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _computeBasePvAvailableW(currentHeatingRodW = 0) {
        const cfg = this._getCfg();
        const gateCfg = this._getBudgetGateCfg();
        const staleTimeoutSec = clamp(num(cfg.staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        /**
         * Code-Teil: finite
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
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
    /**
     * Code-Teil: _getZeroExportCfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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

        return {
            enabled: !!(raw.enabled || raw.active),
            feedInLimitW: n(['feedInLimitW', 'allowedExportW', 'exportLimitW'], 1000, 0, 1000000),
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
    /**
     * Code-Teil: _getPvAutomationMinW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
        /**
         * Code-Teil: boolVal
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _computeZeroExportInfo
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
            return { active: false, canProbe: false, reason: 'disabled', cfg };
        }
        if (!pvBase || !pvBase.gridKnown) {
            return { active: true, canProbe: false, reason: 'grid_unknown', cfg };
        }

        const staleTimeoutSec = clamp(num(this._getCfg().staleTimeoutSec, 15), 1, 3600);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));
        // Use only the actually measured PV generation for this guard. The reconstructed
        // NVP/own-load budget can include a running Heizstab and must not masquerade as
        // fresh PV generation; otherwise PV-Auto may keep regulating although the roof
        // generation has already fallen away.
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

        const pvNowOk = pvNowW >= Math.max(0, cfg.minPvPowerW);
        const soc = (typeof pvBase.storageSocPct === 'number' && Number.isFinite(pvBase.storageSocPct)) ? pvBase.storageSocPct : null;
        const storageKnown = soc !== null || num(pvBase.storageChargeW, 0) > 0 || num(pvBase.storageDischargeW, 0) > 0;
        const storageReady = !storageKnown || soc === null || soc >= cfg.storageFullSocPct;
        const noHardNonPv = !(pvBase.importW > cfg.hardGridImportW || pvBase.storageDischargeW > cfg.hardStorageDischargeW);

        let reason = 'ready';
        if (!feedInAtLimit) reason = 'feed_in_not_at_limit';
        else if (!pvNowOk) reason = 'pv_now_too_low';
        else if (!forecastOk) reason = 'forecast_not_ok';
        else if (!storageReady) reason = 'storage_priority';
        else if (!noHardNonPv) reason = 'non_pv_hard_block';

        const canProbe = !!(feedInAtLimit && pvNowOk && forecastOk && storageReady && noHardNonPv);

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
            exportW,
            feedInLimitW: feedLimitW,
            feedInToleranceW: tolW,
        };
    }


    /**
     * Code-Teil: Methode `_stageActuatorKey`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _stageActuatorKey
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _capDevicePower
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _capDevicePower(d, valueW) {
        const v = Math.max(0, Math.round(num(valueW, 0)));
        const maxW = Math.max(0, Math.round(num(d && d.maxPowerW, 0)));
        return maxW > 0 ? Math.min(v, maxW) : v;
    }
    /**
     * Code-Teil: _sumStagePower
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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

    /**
     * Code-Teil: Methode `_stageOnSetForTarget`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _stageOnSetForTarget
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _sameStageOnSet
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _previousPhysicalStageBelow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _nextPhysicalStageAbove
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    _readZeroExportActualW(d: HeatingRodRuntimeDevice, staleMs: number): number | null {
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
                return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
            }
            const value = this.dp.getNumber(d.pWKey, null);
            return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
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
    _applyCentralZeroExportStageStrategy(d: HeatingRodRuntimeDevice, observedStage: number, pvBase: HeatingRodUnknownRecord, options: HeatingRodUnknownRecord = {}): HeatingRodUnknownRecord {
        const now = Math.max(0, Number(options.now) || Date.now());
        const mode = readZeroExportMode(this.adapter);
        const st = this._ensureStageCtlState(d.id, observedStage);
        const currentStage = Math.max(observedStage, Number(st.targetStage) || 0);
        const measuredW = options.actualW;
        const stagePower = (stage: number): number => {
            const actuators = new Map<string, number>();
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
        const stageForBudget = (budgetW: number): number => {
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
    /**
     * Code-Teil: _ensureStageCtlState
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _stagePowerScale
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _sumStagePowerModel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _sumStagePowerModel(d, stageCount, observedStage = 0, measuredW = null) {
        const configuredW = this._sumStagePower(d, stageCount);
        const scale = this._stagePowerScale(d, observedStage, measuredW);
        return this._capDevicePower(d, Math.round(configuredW * scale));
    }

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
    /**
     * Code-Teil: _stageThresholdModel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
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
    /**
     * Code-Teil: _computeDesiredStage
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _applyTiming
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _applyZeroExportStageStrategy
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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

        // Speicher-Vorrang darf nur die zusätzliche 0-Einspeise-Testlast sperren.
        // Normaler, am Netzpunkt/Speicherladung rekonstruierter PV-Überschuss darf weiter genutzt
        // werden. Deshalb reduzieren wir hier nur, wenn aus der normalen PV-Bilanz kein Ziel mehr
        // übrig ist (targetStage <= 0), aber noch eine physische Stufe läuft.
        if (info && info.active && info.storageReady === false && targetStage <= 0 && Math.max(currentStage, observedStage) > 0) {
            const reduceBase = Math.max(currentStage, observedStage);
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

                if (riseW + 1 < needRiseW) {
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
                reason = `probe_pv_rise_ok_${riseW}of${needRiseW}W`;
            }
        }

        const cooldownActive = !!(st.zeroCooldownUntilMs && now < st.zeroCooldownUntilMs);
        const canProbe = !!(info && info.active && info.canProbe && !cooldownActive);

        if (canProbe) {
            const baseStage = Math.max(currentStage, observedStage, targetStage);
            const nextStage = this._nextPhysicalStageAbove(d, baseStage);
            const lastUp = Math.max(num(st.zeroLastStepUpMs, 0), num(st.lastIncreaseMs, 0));
            const stepWaitMs = Math.max(0, cfg.stepUpDelaySec * 1000);
            const mayStep = nextStage > baseStage && (!lastUp || (now - lastUp) >= stepWaitMs);
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
                reason = 'probe_step_up';
            } else {
                reason = (nextStage <= baseStage) ? 'max_physical_stage' : 'waiting_step_up_delay';
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

    /**
     * Code-Teil: Methode `_writeBoolForce`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _writeBoolForce
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _writeBoolForce(key, value, force = false) {
        if (!(this.dp && key && this.dp.getEntry)) return false;
        const entry = this.dp.getEntry(key);
        if (!entry) return false;

        if (!force && this.dp.writeBoolean) {
            return this.dp.writeBoolean(key, !!value, false);
        }

        let raw = !!value;
        if (entry.invert) raw = !raw;

        try {
            const writeResult = await this.adapter.setForeignStateAsync(entry.objectId, raw, false);
            if (writeResult && typeof writeResult === 'object' && (writeResult as { __nexowattActuatorAuthorityBlocked?: boolean }).__nexowattActuatorAuthorityBlocked === true) return false;
            if (this.dp.lastWriteByObjectId && typeof this.dp.lastWriteByObjectId.set === 'function') {
                this.dp.lastWriteByObjectId.set(entry.objectId, { val: raw ? 1 : 0, ts: Date.now() });
            }
            return true;
        } catch (err) {
            this.adapter.log.warn(`Heizstab-Datapoint write failed for '${entry.objectId}': ${err?.message || err}`);
            return false;
        }
    }

    /**
     * Code-Teil: Methode `_applyStageState`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    async _applyStageState(d, targetStage, feedback, options: HeatingRodApplyStageOptions = {}) {
        if (!d.wiredStages || d.wiredStages < 1) {
            return { applied: false, status: 'no_stage_write_dp' };
        }

        const zeroExportGrant = options && options.zeroExportGrant;
        const zeroGrantValid = () => !zeroExportGrant || isZeroExportGrantValid(
            this.adapter, `heatingRod:${d.id}`, zeroExportGrant.leaseId, Date.now(),
        );
        const stopExpiredZeroGrant = () => this._applyStageState(d, 0, feedback, {
            ...options, zeroExportGrant: null, force: true,
        });
        if (!zeroGrantValid()) return stopExpiredZeroGrant();
        const effectiveStage = Math.max(0, Math.min(Math.round(Number(targetStage) || 0), d.wiredStages));
        const forceAllWrites = !!(options && options.force);
        let anyTrue = false;
        let anyFalse = false;

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
            // Nach jedem await erneut prüfen; Widerruf schaltet alle Stufen AUS.
            if (!zeroGrantValid()) return stopExpiredZeroGrant();
            const force = forceAllWrites || (!!g.observedKnown && g.observed !== g.shouldOn);
            const res = await this._writeBoolForce(g.writeKey, g.shouldOn, force);
            if (res === true) anyTrue = true;
            if (res === false) anyFalse = true;
        }
        if (!zeroGrantValid()) return stopExpiredZeroGrant();

        let status = 'unchanged';
        if (anyFalse && anyTrue) status = 'applied_partial';
        else if (anyFalse) status = 'write_failed';
        else if (anyTrue) status = 'applied';

        return { applied: !anyFalse, status, targetStage: effectiveStage };
    }

    /**
     * Code-Teil: Methode `_getOverrides`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getOverrides
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
     * Code-Teil: _markAutoOwnership
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * In-Memory-Nachweis für die zentrale PV-Rekonstruktion, keine Hardwarewirkung.
     * Nur frische EOS-eigene PV-Auto-Last darf als flexible Last zurückgerechnet
     * werden; Handbetrieb bleibt Hauslast. BOOST besitzt ebenfalls Schreibrechte,
     * deshalb prüft der Core zusätzlich den effektiven Modus `pvAuto`.
     */
    _publishZeroExportOwnership(d: HeatingRodRuntimeDevice, owned: boolean, source = '', now = nowMs()): void {
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
    /**
     * Code-Teil: _getAutoOwnership
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getAutoOwnership(d, observedStage = 0, measuredW = null, feedback = null) {
        const st: HeatingRodStageControlState = (d && d.id && this._stageCtl && this._stageCtl.get) ? (this._stageCtl.get(d.id) || { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 }) : { targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 };
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
    /**
     * Code-Teil: _restoreAutoOwnershipIfLikely
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _observeManualExternal
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
    /**
     * Code-Teil: _computeQuickManualStage
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
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
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */

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
     * Code-Teil: _buildHeatingRodTsLegacyFinalCleanupState
     *
     * Zweck:
     * Schließt die Bereinigung der alten JavaScript-Heizstabreferenz im normalen
     * Diagnosepfad ab. Wenn TS-Normalpfad, Debug-Brücke, Pruned-Diagnose und
     * Entfernungskandidat bereit sind, wird die alte JS-Referenz nicht mehr als
     * normaler Diagnosebaum ausgegeben, sondern nur noch als kompakte Debug-/Notfallbrücke.
     *
     * Zusammenhang:
     * Die vorherigen Versionen haben die alte JS-Referenz schrittweise reduziert:
     * - normaler Blocker -> Diagnose
     * - Diagnose -> kompakte Debug-Brücke
     * - Debug-Brücke -> Entfernungskandidat
     * 0.7.119 markiert diesen Zustand als finalen Cleanup für den normalen Diagnosepfad.
     *
     * Wichtig:
     * Diese Funktion entfernt keinen Sicherheitsfallback und trifft keine Stufenentscheidung.
     * Harte Schutzfälle bleiben weiterhin über den JS-Notfallback abgesichert.
     */
    _buildHeatingRodTsLegacyFinalCleanupState(legacyReference, legacyPruned, legacyRemovalCandidate, legacyDebugBridge, normalSource, evaluation) {
        const normalReady = !!(normalSource && normalSource.ready);
        const prunedReady = !!(legacyPruned && legacyPruned.ready);
        const removalReady = !!(legacyRemovalCandidate && legacyRemovalCandidate.ready);
        const debugReady = !!(legacyDebugBridge && (legacyDebugBridge.debugBridgeActive || legacyDebugBridge.ready));
        const hardSafetyBlockCount = Number(evaluation && evaluation.hardSafetyBlockCount) || 0;
        const hardFallbackCount = Number(evaluation && evaluation.hardFallbackCount) || 0;
        const referenceMismatchCount = Number(legacyReference && legacyReference.referenceMismatchCount) || 0;
        const blockingReferenceMismatchCount = Number(legacyReference && legacyReference.blockingReferenceMismatchCount) || 0;
        const ready = normalReady && prunedReady && removalReady && debugReady && blockingReferenceMismatchCount === 0;
        const compactDebugBridge = (legacyRemovalCandidate && legacyRemovalCandidate.compactReference)
            || (legacyPruned && legacyPruned.compactLegacyReference)
            || (legacyDebugBridge && legacyDebugBridge.compactDebugBridge)
            || {
                source: 'heating-rod-legacy-js-final-compact-reference-v1',
                referenceMismatchCount,
                blockingReferenceMismatchCount,
                hardSafetyBlockCount,
                hardFallbackCount,
                decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
                payloadMode: ready ? 'final-cleanup-counts-only' : 'final-cleanup-pending',
                sample: legacyReference && Array.isArray(legacyReference.referenceMismatchSample) ? legacyReference.referenceMismatchSample.slice(0, ready ? 1 : 3) : [],
            };
        return {
            source: 'heating-rod-legacy-js-final-cleanup-v1',
            ts: Date.now(),
            ready,
            status: ready ? 'legacy-js-reference-removed-from-normal-diagnostics' : (normalReady ? 'legacy-js-reference-final-cleanup-pending' : 'ts-normal-not-ready'),
            normalPathReady: normalReady,
            prunedReady,
            removalCandidateReady: removalReady,
            debugBridgeReady: debugReady,
            decisionImpact: ready ? 'none' : (legacyReference && legacyReference.decisionImpact || 'safety-gate'),
            jsReferenceDecisionUsed: !ready,
            legacyJsPathRole: ready ? 'emergency-fallback-debug-bridge-only' : 'cleanup-pending',
            jsFallbackMode: ready ? 'hard-blockers-only' : (legacyDebugBridge && legacyDebugBridge.jsFallbackMode || 'normal-safety-fallback'),
            normalDiagnosticsPayload: ready ? 'ts-normal-with-compact-js-debug-only' : 'legacy-reference-still-visible',
            normalDebugPayloadMode: ready ? 'compact-debug-bridge-only' : 'full-or-pruned-legacy-reference',
            legacyReferenceRemovedFromNormalDiagnostics: ready,
            fullLegacyReferenceRemovedFromNormalDiagnostics: ready,
            legacyReferenceStateRole: ready ? 'compact-debug-alias-only' : 'legacy-reference-alias',
            legacyJsReferenceJsonTarget: ready ? 'tsLegacyFinalCleanupJson.compactDebugBridge' : 'legacy-reference-fallback',
            referenceMismatchCount,
            blockingReferenceMismatchCount,
            hardSafetyBlockCount,
            hardFallbackCount,
            compactDebugBridge,
            removedNormalDiagnosticsFields: ready
                ? ['legacyReference', 'referenceMismatches', 'blockingReferenceMismatches', 'fullLegacyReferencePayload', 'fullLegacyReferenceSnapshot']
                : [],
            retainedDiagnosticsFields: ready
                ? ['referenceMismatchCount', 'blockingReferenceMismatchCount', 'hardFallbackCount', 'hardSafetyBlockCount', 'compactDebugBridge']
                : ['legacyReference', 'referenceMismatches', 'blockingReferenceMismatches'],
            keepJsFor: ['hard-safety-fallback', 'runtime-error-fallback', 'manual-external-safety-guard', 'compact-debug-bridge'],
            removableNow: ready ? ['normal-diagnostic-legacy-reference-tree', 'duplicate-js-reference-alias-payload'] : [],
            nextAction: ready
                ? 'Alter JS-Referenzbaum ist aus der normalen Heizstab-Diagnose entfernt. JS bleibt nur kompakte Debug-Brücke und harte Notbremse.'
                : 'Finaler Cleanup wartet auf TS-Normalpfad, Pruned-Diagnose und Entfernungskandidat.',
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


    _isHeatingRodHardFallbackReason(reason) {
        const r = String(reason || '').toLowerCase();
        if (!r) return false;
        return /missing-ts-mirror|ts-runtime-error|runtime-error|exception|ts-js-stage-mismatch|stage-mismatch|switching-mismatch|storage-protect|pv-protect|safety|protect-blocks|hard-block/i.test(r);
    }

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
     * JavaScript-Runtime bleibt als Referenz und Sicherheitsnetz erhalten, aber nach
     * stabiler Runtime-Auswertung blockiert ein reiner JS/TS-Referenzunterschied nicht
     * mehr automatisch die TS-Zielstufe.
     *
     * Sicherheitsregel:
     * Bei fehlendem TS-Spiegel oder Runtimefehler bleibt der JS-Zielwert autoritativ.
     * JS/TS-Abweichungen bleiben vor dem Normalpfad ein Fallback-Grund; im Normalpfad
     * werden sie nur noch als Referenzdiagnose gespeichert.
     */
    _evaluateHeatingRodTsProductiveDecision(entry) {
        const mirror = requireHeatingRodTsMirror();
        const evaluate = mirror && typeof mirror.evaluateHeatingRodDecision === 'function' ? mirror.evaluateHeatingRodDecision : null;
        const fallback = (reason: string, extra: any = {}) => {
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

        try {
            const p14a = (this.adapter && this.adapter._para14a && typeof this.adapter._para14a === 'object') ? this.adapter._para14a : null;
            if (p14a && p14a.active) {
                for (const d of this._devices) requestZeroExportProbe(this.adapter, { key: `heatingRod:${d.id}`, now, eligible: false });
                await this._setStateIfChanged('heatingRod.summary.status', 'paused_by_14a');
                await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
                this.adapter._heatingRodBudgetUsedW = 0;
                return;
            }
        } catch (_e) {
            // ignore
        }

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
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportActive`, !!zeroExportInfo.active);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportCanProbe`, !!zeroExportInfo.canProbe);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroExportInfo.reason || ''));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num((this._stageCtl.get(d.id) || ({ targetStage: 0, lastIncreaseMs: 0, lastDecreaseMs: 0 } as HeatingRodStageControlState)).zeroCooldownUntilMs, 0)));

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
            if (centralZeroMode.enabled && (effectiveMode !== 'pvAuto' || !pvAutomationActive
                || d.consumerType !== 'heatingRod' || d.wiredStages < 1)) {
                requestZeroExportProbe(this.adapter, { key: `heatingRod:${d.id}`, now, eligible: false });
            }

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userEnabled`, !!userEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.userMode`, String(userMode));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveEnabled`, !!effectiveEnabled);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.effectiveMode`, String(effectiveMode));

            if (d.consumerType !== 'heatingRod') {
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, 0);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, 'slot_type_mismatch');
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
                continue;
            }

            // Temporary boost: always full configured/wired power for the configured duration.
            if (ov.boostActive) {
                const fullStage = Math.max(0, Math.min(d.wiredStages || d.stageCount, d.stageCount));
                const res = await this._applyStageState(d, fullStage, feedback, { force: true });
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, fullStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
                this._markAutoOwnership(d, effectiveTargetStage > 0, effectiveTargetStage, 'boost');
                const targetW = this._sumStagePower(d, effectiveTargetStage);
                const observedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                const usedW = Math.max(observedW, targetW);

                appliedTotalW += Math.round(targetW);
                budgetUsedW += Math.round(usedW);
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `boost_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, 'boost');
                continue;
            }

            // Manual customer steps (1/2/3) bypass the PV automatik, but still use native stage writes.
            if (manualStage > 0) {
                const res = await this._applyStageState(d, manualStage, feedback, { force: true });
                const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, manualStage), d.wiredStages || d.stageCount));
                this._setStageCtlTarget(d.id, effectiveTargetStage, observedStage);
                this._markAutoOwnership(d, false, effectiveTargetStage, 'manual_mode');
                const targetW = this._sumStagePower(d, effectiveTargetStage);
                const observedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                const usedW = Math.max(observedW, targetW);
                const level = Math.min(3, Math.max(1, Math.round(Number(String(baseMode).replace('manual', '')) || 1)));

                appliedTotalW += Math.round(targetW);
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);

                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, `manual${level}_${String(res.status || '')}`);
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, `manual${level}`);
                continue;
            }

            // End-customer disabled PV regulation (Regelung AUS): do NOT write OFF.
            // The native actuator may now be switched manually in ioBroker/KNX or via the
            // manual stage buttons above. We only observe/balance so manual heat is not
            // immediately overwritten by the EMS tick.
            if (!userEnabled && pvModeRequested) {
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
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
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
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
                const res = await this._applyStageState(d, 0, feedback, { force: true });
                this._setStageCtlTarget(d.id, 0, observedStage);
                this._markAutoOwnership(d, false, 0, 'off');
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
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
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
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
                const usedW = this._resolveObservedPowerW(
                    d,
                    measuredW,
                    feedback,
                    this._sumStagePower(d, observedStage),
                );
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
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
                const usedW = await this._observeManualExternal(d, observedStage, measuredW, feedback, 'external_manual_knx_observed');
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
                appliedTotalW += usedW;
                continue;
            }

            let desiredStage = 0;
            let zeroDecision: any = null;
            let budgetDecision: any = null;
            if (centralZeroMode.enabled) {
                const actualW = this._readZeroExportActualW(d, Math.min(staleMs, 5000));
                zeroDecision = this._applyCentralZeroExportStageStrategy(d, observedStage, pvBase, {
                    now, baseW: remainingW, maxW: remainingTotalW,
                    actualW, actualFresh: this._hasMeasuredPowerW(actualW),
                    eligible: !pvMinBlocksStepUp, budgetProtection,
                });
                desiredStage = zeroDecision.targetStage;
                budgetDecision = { targetStage: desiredStage, reduceNow: zeroDecision.reduceNow,
                    hardOff: zeroDecision.hardOff, reason: 'central-zero-export' };
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportCanProbe`, !!(zeroDecision.probe && zeroDecision.probe.granted));
                await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, zeroDecision.reason);
            } else {
                desiredStage = this._computeDesiredStage(d, remainingW, observedStage, measuredW);
                budgetDecision = this._applyBudgetFollowerStageStrategy(d, desiredStage, observedStage, pvBase, budgetProtection, now, !pvMinBlocksStepUp);
                desiredStage = Math.max(0, Math.min(num(budgetDecision.targetStage, desiredStage), d.stageCount));
                if (zeroExportInfo.active) {
                    zeroDecision = this._applyZeroExportStageStrategy(d, desiredStage, observedStage, pvBase, zeroExportInfo, now, measuredW);
                    desiredStage = Math.max(0, Math.min(num(zeroDecision.targetStage, desiredStage), d.stageCount));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportReason`, String(zeroDecision.reason || zeroExportInfo.reason || ''));
                    await this._setStateIfChanged(`heatingRod.devices.${d.id}.zeroExportNextAllowedAt`, Math.round(num(zeroDecision.nextAllowedAt, 0)));
                }
            }

            // Reiner PV-Betrieb: bei Netzbezug oder Speicherentladung keine Stufe halten
            // oder neu zuschalten. Bei aktivem 0-Einspeise-Sondermodus werden kurze Transienten
            // nicht sofort gekillt, sondern erst nach den konfigurierten Schutzzeiten.
            let forceNonPvDown = !!((budgetDecision && budgetDecision.reduceNow) || (budgetProtection && budgetProtection.reduceNow));
            if (zeroExportInfo.active) forceNonPvDown = !!(forceNonPvDown || (zeroDecision && zeroDecision.reduceNow));
            if (forceNonPvDown) {
                // Reduce to the next lower *physical* actuator set. This is important for
                // installations that accidentally map several virtual stages to the same KNX/relay
                // datapoint: targetStage 3 -> 2 would otherwise still keep the same actuator ON.
                const hardOff = !!((budgetProtection && budgetProtection.hardOff) || (zeroDecision && zeroDecision.hardOff));
                const lowerPhysicalStage = hardOff
                    ? 0
                    : this._previousPhysicalStageBelow(d, Math.max(observedStage, desiredStage));
                desiredStage = Math.min(desiredStage, lowerPhysicalStage);
            }

            const forceStorageProtectOff = !!(pvBase.forceOff && desiredStage <= 0 && !(zeroExportInfo.active && zeroDecision && !zeroDecision.reduceNow));
            let targetStage = forceStorageProtectOff
                ? 0
                : (forceNonPvDown ? desiredStage : this._applyTiming(d, desiredStage, observedStage));
            if (forceStorageProtectOff || forceNonPvDown) this._setStageCtlTarget(d.id, targetStage, observedStage);
            const jsTargetStageBeforeTs = Math.max(0, Math.min(targetStage, d.stageCount, d.wiredStages));
            const jsTargetWBeforeTs = this._sumStagePowerModel(d, jsTargetStageBeforeTs, observedStage, measuredW);
            const tsProductiveDecision: any = this._evaluateHeatingRodTsProductiveDecision({
                normalPathReady: this._isHeatingRodTsNormalPathReady(),
                device: d,
                deviceId: d.id,
                jsTargetStage: jsTargetStageBeforeTs,
                jsTargetW: jsTargetWBeforeTs,
                jsStatus: forceStorageProtectOff ? 'storage_protect' : (forceNonPvDown ? 'pv_only_protect' : 'pv_auto'),
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
            // Mindestlaufzeit und TS-Fallback dürfen keine entzogene Teststufe halten.
            if (centralZeroMode.enabled && zeroDecision) targetStage = Math.min(targetStage, zeroDecision.stageCap);
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
                reason: tsProductiveDecision && (tsProductiveDecision.reason || tsProductiveDecision.fallbackReason) || '',
                mismatches: tsProductiveDecision && tsProductiveDecision.mismatches || [],
                jsReferenceMismatch: !!(tsProductiveDecision && (tsProductiveDecision.jsReferenceMismatch || (Array.isArray(tsProductiveDecision.mismatches) && tsProductiveDecision.mismatches.length))),
                normalPathReady: !!(tsProductiveDecision && tsProductiveDecision.normalPathReady),
                jsReferenceReduced: !!(tsProductiveDecision && tsProductiveDecision.jsReferenceReduced),
                hardSafetyBlock: !!(tsProductiveDecision && tsProductiveDecision.hardSafetyBlock),
            });
            const offWouldTouchLoad = targetStage <= 0 && ((typeof measuredW === 'number' && Number.isFinite(measuredW) && measuredW > 50) || Math.max(0, feedback.appliedPowerW || 0) > 0 || observedStage > 0);
            const mayWriteOff = !!(ownNow.autoOwned || forceStorageProtectOff || forceNonPvDown);
            if (targetStage <= 0 && offWouldTouchLoad && !mayWriteOff) {
                const usedW = await this._observeManualExternal(d, observedStage, measuredW, feedback, 'manual_external_off_protected');
                remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);
                appliedTotalW += usedW;
                continue;
            }
            const forcePvWrite = !!(forceStorageProtectOff || forceNonPvDown || (targetStage <= 0 && mayWriteOff && offWouldTouchLoad));
            const zeroExportGrant = zeroDecision && zeroDecision.probe && zeroDecision.probe.granted
                ? { leaseId: zeroDecision.probe.leaseId } : null;
            const res = await this._applyStageState(d, targetStage, feedback, { force: forcePvWrite, zeroExportGrant });
            const effectiveTargetStage = Math.max(0, Math.min(num(res.targetStage, targetStage), d.wiredStages));
            this._markAutoOwnership(d, effectiveTargetStage > 0, effectiveTargetStage, 'pvAuto');
            const targetW = this._sumStagePowerModel(d, effectiveTargetStage, observedStage, measuredW);
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
            const usedW = Math.max(observedUsedW, targetW);

            appliedTotalW += Math.round(targetW);
            budgetUsedW += Math.round(usedW);
            remainingW = Math.max(0, remainingW - usedW);
                remainingTotalW = Math.max(0, remainingTotalW - usedW);

            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetStage`, effectiveTargetStage);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.targetW`, Math.round(targetW));
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.appliedW`, Math.round(usedW));
            const zeroSuffix = zeroDecision && zeroDecision.reason ? `_zero_${String(zeroDecision.reason)}` : '';
            const gateSuffix = budgetProtection && budgetProtection.reason && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : '';
            const budgetSuffix = budgetDecision && budgetDecision.reason && budgetDecision.reason !== 'budget_follow' ? `_budget_${String(budgetDecision.reason)}` : '';
            const pvMinSuffix = pvMinBlocksStepUp ? `_pv_min_hold_${pvNowForAutomationW}of${minPvAutomationW}W` : '';
            const autoStatus = forceStorageProtectOff
                ? `storage_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}`
                : (forceNonPvDown ? `pv_only_protect_${String(res.status || '')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}` : `${String(res.status || 'pv_auto')}${zeroSuffix}${gateSuffix}${budgetSuffix}${pvMinSuffix}`);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.status`, autoStatus);
            await this._setStateIfChanged(`heatingRod.devices.${d.id}.override`, '');
        }

        // TS-Shadow-Diagnose: sammelt pro Gerät den JS-Zielzustand und die Budgetdaten.
        // Wichtig: Dieser Block ist nur Diagnose und darf keine Ausgänge schalten.
        const heatingRodTsShadowEntries = [];
        for (const d of this._devices || []) {
            heatingRodTsShadowEntries.push({
                device: d,
                deviceId: d.id,
                jsTargetStage: this._stateCache.get(`heatingRod.devices.${d.id}.targetStage`) ?? 0,
                jsTargetW: this._stateCache.get(`heatingRod.devices.${d.id}.targetW`) ?? 0,
                jsStatus: this._stateCache.get(`heatingRod.devices.${d.id}.status`) ?? '',
                availablePvW: Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                availableTotalW: pvBase && pvBase.budgetGateEffectiveW !== null && pvBase.budgetGateEffectiveW !== undefined ? Math.max(0, Number(pvBase.budgetGateEffectiveW) || 0) : Math.max(0, Number(pvBase && pvBase.availableW) || 0),
                allowGridImport: !!(pvBase && (pvBase.tariffGridImportPreferred || (pvBase.budgetGateTotalW !== null && pvBase.budgetGateTotalW !== undefined))),
                storageProtectActive: !!(pvBase && pvBase.forceOff),
                storageSocPct: pvBase ? pvBase.storageSocPct : null,
                storageReserveSocPct: Number(this._getCfg().storageReserveSocPct || this._getCfg().storageTargetSocPct || 0) || 0,
                storageReserveW: pvBase ? Math.max(0, Number(pvBase.storageReserveW) || 0) : 0,
            });
        }
        const heatingRodTsShadow = this._runHeatingRodTsShadowComparison(heatingRodTsShadowEntries);
        const heatingRodTsProductive = {
            source: 'ts-heating-rod-productive',
            active: heatingRodTsProductiveEntries.some(e => e && e.active),
            productive: heatingRodTsProductiveEntries.some(e => e && e.active),
            fallback: heatingRodTsProductiveEntries.some(e => e && e.fallback),
            activeCount: heatingRodTsProductiveEntries.filter(e => e && e.active).length,
            fallbackCount: heatingRodTsProductiveEntries.filter(e => e && e.fallback).length,
            fallbackReasons: Array.from(new Set(heatingRodTsProductiveEntries.filter(e => e && e.fallbackReason).map(e => String(e.fallbackReason)))),
            jsReferenceReducedCount: heatingRodTsProductiveEntries.filter(e => e && e.jsReferenceReduced).length,
            hardSafetyBlockCount: heatingRodTsProductiveEntries.filter(e => e && e.hardSafetyBlock).length,
            entries: heatingRodTsProductiveEntries,
        };

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
                    mode: tariffImportPreferred ? 'tariffNegative' : 'pvAuto',
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
        await this._setStateIfChanged('heatingRod.summary.zeroExportActive', !!zeroExportInfo.active);
        await this._setStateIfChanged('heatingRod.summary.zeroExportCanProbe', !!zeroExportInfo.canProbe);
        await this._setStateIfChanged('heatingRod.summary.zeroExportReason', String(zeroExportInfo.reason || ''));
        await this._setStateIfChanged('heatingRod.summary.zeroExportPvNowW', Math.round(num(zeroExportInfo.pvNowW, 0)));
        await this._setStateIfChanged('heatingRod.summary.zeroExportForecastOk', !!zeroExportInfo.forecastOk);
        await this._setStateIfChanged('heatingRod.summary.zeroExportFeedInAtLimit', !!zeroExportInfo.feedInAtLimit);
        await this._setStateIfChanged('heatingRod.summary.pvAutomationMinW', Math.round(num(minPvAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationPvNowW', Math.round(num(pvNowForAutomationW, 0)));
        await this._setStateIfChanged('heatingRod.summary.pvAutomationAllowed', !!pvAutomationAllowedByMin);
        await this._setStateIfChanged('heatingRod.summary.tsShadowJson', JSON.stringify(heatingRodTsShadow || {}));
        await this._setStateIfChanged('heatingRod.summary.source', heatingRodTsProductive && heatingRodTsProductive.active ? 'ts-heating-rod' : 'js-runtime');
        await this._setStateIfChanged('heatingRod.summary.tsProductiveJson', JSON.stringify(heatingRodTsProductive || {}));
        await this._setStateIfChanged('heatingRod.summary.debugJson', JSON.stringify({
            source: pvBase.source,
            tsShadow: heatingRodTsShadow || null,
            tsProductive: heatingRodTsProductive || null,
            pvAutomationMinW: Math.round(num(minPvAutomationW, 0)),
            pvAutomationPvNowW: Math.round(num(pvNowForAutomationW, 0)),
            pvAutomationAllowed: !!pvAutomationAllowedByMin,
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
                active: !!zeroExportInfo.active,
                canProbe: !!zeroExportInfo.canProbe,
                reason: zeroExportInfo.reason,
                pvNowW: Math.round(num(zeroExportInfo.pvNowW, 0)),
                feedInAtLimit: !!zeroExportInfo.feedInAtLimit,
                feedInLimitW: Math.round(num(zeroExportInfo.feedInLimitW, 0)),
                forecastOk: !!zeroExportInfo.forecastOk,
                forecast: zeroExportInfo.forecast || null,
                storageReady: !!zeroExportInfo.storageReady,
            },
        }));
        await this._setStateIfChanged('heatingRod.summary.lastUpdate', now);
        await this._setStateIfChanged('heatingRod.summary.status', (this._devices && this._devices.length) ? `ok_${pvBase.source}${!pvAutomationAllowedByMin ? '_pv_min_block' : ''}${pvBase.forceOff ? '_storage_protect' : ''}${budgetProtection && budgetProtection.reason !== 'ok' ? `_gate_${String(budgetProtection.reason)}` : ''}${zeroExportInfo.active ? `_zero_${String(zeroExportInfo.reason || 'active')}` : ''}` : 'no_devices');
    }
}

module.exports = { HeatingRodControlModule };
