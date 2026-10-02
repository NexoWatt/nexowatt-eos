/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/grid-constraints.ts
 * Quell-Hash: sha256:8dde31f9fdd4a88f35f089e85f73f82c542752448b2211885ae4451387b3595c
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/grid-constraints.js.
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
 * Aufgabe: Fasst netzseitige Einschränkungen für die nachfolgenden EMS-Entscheidungen zusammen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/grid-constraints.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/grid-constraints.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/grid-constraints.js`.
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
 * Datei: ems/modules/grid-constraints.js
 * Rolle im Projekt: Netz-/Regelconstraints.
 * Zweck: Verarbeitet Netzvorgaben, §14a, Limitierungen und Sperrfenster.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: EMS-Regelungsmodul: verarbeitet Konfiguration, States und Budgets für eine bestimmte Energie-Funktion.
 * Zusammenhänge:
 * - Wird von ems/module-manager.js initialisiert und zyklisch getickt.
 * - main.js veröffentlicht die entstehenden States und APIs.
 * Wartungshinweise:
 * - Keine UI-spezifische Logik einbauen; Ausgabe über States/API bereitstellen.
 */


'use strict';

const crypto = require('crypto');
const { BaseModule } = require('./base');
const { resolveCurrentNvpSnapshot } = require('../services/measurement-freshness');
const { isActuatorAuthorityBlockedResult } = require('../services/actuator-shadow-arbiter');
const { ReasonCodes } = require('../reasons');
const { resolveGridImportLimitPolicy, resolveZeroExportPvTarget } = require('../services/grid-import-limit-policy');

/**
 * Grid constraints module (Netz & EVU):
 * - RLM (15-min demand) dynamic cap
 * - Zero export (Nulleinspeisung) via PV/WR curtail control if available
 *
 * This module is designed to be manufacturer-independent by mapping datapoints
 * (Modbus/REST/etc.) to generic keys.
 */
/**
 * Code-Teil: Klasse `GridConstraintsModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: GridConstraintsModule. Aufgabe: berechnet oder normalisiert Energiefluss-/Leistungswerte. Signed-DP, Split-DP und Fallback-Rechnung dürfen nicht vermischt werden. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: GridConstraintsModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class GridConstraintsModule extends BaseModule {
    /**
     * Code-Teil: constructor
     * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
     * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
     * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        this._lastStateWriteMs = 0;

        // RLM accumulator
        this._rlm = {
            intervalMs: 15 * 60 * 1000,
            intervalStartMs: 0,
            importedWs: 0,
            lastUpdateMs: 0,
        };

        // PV curtail setpoints (if no readback)
        this._pv = {
            lastMode: 'off', // resolved mode
            limitW: null,
            limitPct: null,
        };

        // EVU stage (Relais 60/30/0)
        this._pvEvu = {
            lastStagePct: null,
        };
        this._pvWriteTargetIds = new Map();
        this._pvWriteZeroSafe = new Map();

        // 0.8.55: Schneller 0-Einspeise-Aktivbetrieb.
        // 0.8.56: ACK-Verlauf/Feldprotokoll je Senke ohne Schreibtest pro Tick.
        // Schreibtests laufen nicht in jedem Regel-Tick. Diese Runtime hält
        // letzte ACK-/Blockierinformationen je Senke, damit der Export Guard
        // im Aktivbetrieb sofort auf freigegebene Ziele schreiben kann und bei
        // Fehlern ohne Verzögerung auf die nächste Senke bzw. WR-Abregelung fällt.
        this._zeroExportSinkRuntime = {};
        this._zeroExportSinkAckHistory = {};

        // Der ModuleManager kann die dynamische PV-/WR-Regelung bewusst bis
        // nach der Speicherregelung verschieben. Direkte Instanzen und ältere
        // Tests behalten dagegen das bisherige Verhalten (`tick()` führt beide
        // Phasen aus), solange dieses Flag nicht gesetzt wird.
        this._deferDynamicPv = false;
        this._lastPlanningContext = null;
        this._lastDynamicResult = null;
        this._importLimitRuntime = { stage: 'normal', releaseCandidateAtMs: 0 };

        // RC93: Eine einzige Führungsquelle für die Einspeisegrenze.
        // Ein aktivierter, in Betrieb genommener und vom Installateur freigegebener
        // EZA-/Parkregler darf die lokale EOS-Obergrenze ausschließlich verschärfen.
        // Fällt diese Quelle aus, greift der dokumentierte Fail-Safe-Vertrag; ein
        // paralleler zweiter PV-Regler wird ausdrücklich nicht erzeugt.
        this._exportLimitAuthorityRuntime = {
            lastValidAllowedExportPowerW: null,
            lastValidEffectiveMaxFeedInW: null,
            lastValidAt: 0,
            lastValidUntil: 0,
            lastCommandId: '',
            decisionSignature: '',
            audit: [],
            auditHeadHash: '',
        };
    }

    /**
     * Aktiviert die zweiphasige Ausführung im zentralen EMS:
     * 1. Netz-/RLM-Planung vor den Verbrauchern,
     * 2. dynamische PV-Abregelung nach dem Speicher-Sollwert.
     */
    setDeferredDynamicPv(enabled) {
        this._deferDynamicPv = enabled === true;
    }

    _isEnabled() {
        // RC82: Netzlimits ist ein dauerhaft aktiver Kernschutz. Die Modulfreigabe
        // erfolgt zentral über Lizenz/Systemstart; ein veraltetes Legacy-Flag oder
        // ein importiertes Backup darf den NVP-Schutz nicht mehr abschalten.
        return true;
    }
    /**
     * Code-Teil: _cfg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _cfg() {
        return this.adapter.config.gridConstraints || {};
    }

    /**
     * Code-Teil: _isExportLimitInstallerApproved
     * Zweck: Erzwingt die von NexoWatt gewünschte Installateur-Freigabe für jede Einspeisebegrenzung.
     * Zusammenhang: DE und NL nutzen dieselbe Grid-Constraints-Logik; das Kundenfrontend darf diese Schutzfunktion
     * nicht aktivieren oder ändern. Bestehende Installationen mit bereits aktiver 0-Einspeisung bleiben aus
     * Rückwärtskompatibilitätsgründen freigegeben, wenn das neue Flag noch fehlt.
     */
    _isExportLimitInstallerApproved(cfg) {
        if (!cfg || typeof cfg !== 'object') return false;
        // App-Center nutzt ab 0.8.28 den neutraleren Namen `exportLimitInstallerApproved`.
        // Legacy-Installationen bleiben über `zeroExportInstallerApproved` kompatibel.
        if (typeof cfg.exportLimitInstallerApproved === 'boolean') return !!cfg.exportLimitInstallerApproved;
        if (typeof cfg.zeroExportInstallerApproved === 'boolean') return !!cfg.zeroExportInstallerApproved;
        // Rückwärtskompatibilität: Wenn eine bestehende Anlage bereits Nulleinspeisung aktiv hatte,
        // darf das Update diese Schutzfunktion nicht ungefragt abschalten.
        return !!cfg.zeroExportEnabled;
    }

    /**
     * Lokale EOS-Sicherheitsobergrenze am Netzverknüpfungspunkt.
     * 0 W bleibt echte Nulleinspeisung. Ein externer zertifizierter Regler darf
     * diese Grenze dynamisch nur absenken, niemals über diesen Wert anheben.
     */
    _getConfiguredMaxFeedInPowerW(cfg) {
        const candidates = [
            cfg?.exportLimitMaxFeedInW,
            cfg?.zeroExportMaxExportW,
            cfg?.maxFeedInPowerW,
            cfg?.maxExportW,
            cfg?.allowedFeedInW,
        ];
        for (const v of candidates) {
            if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) continue;
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) return Math.round(n);
        }
        return 0;
    }

    _getFallbackExportPowerW(cfg, configuredMaxFeedInW = null) {
        const localMaxW = configuredMaxFeedInW === null
            ? this._getConfiguredMaxFeedInPowerW(cfg || {})
            : Math.max(0, Math.round(Number(configuredMaxFeedInW) || 0));
        const candidates = [cfg?.fallbackExportPowerW, cfg?.externalFallbackExportPowerW];
        for (const value of candidates) {
            if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) continue;
            const n = Number(value);
            if (Number.isFinite(n) && n >= 0) return Math.min(localMaxW, Math.round(n));
        }
        return localMaxW;
    }

    _getNetOperatorActivation() {
        const config = this.adapter && this.adapter.config && typeof this.adapter.config === 'object'
            ? this.adapter.config
            : {};
        const gridCfg = config.gridConstraints && typeof config.gridConstraints === 'object'
            ? config.gridConstraints
            : {};
        const iface = config.netOperatorInterface && typeof config.netOperatorInterface === 'object'
            ? config.netOperatorInterface
            : {};
        const app = config.emsApps && config.emsApps.apps && config.emsApps.apps.netOperator
            ? config.emsApps.apps.netOperator
            : null;
        const appEnabled = app && typeof app === 'object'
            ? app.installed === true && app.enabled === true
            : (config.enableNetOperatorInterface === true || iface.enabled === true);
        const exportGuardEnabled = gridCfg.zeroExportEnabled === true;
        const exportGuardInstallerApproved = this._isExportLimitInstallerApproved(gridCfg);
        const exportGuardRunMode = this._getExportLimitRunMode(gridCfg);
        const expected = appEnabled
            && iface.enabled === true
            && String(iface.mode || '').toLowerCase() === 'active'
            && iface.commissioned === true
            && iface.installerApproved === true
            && exportGuardEnabled
            && exportGuardInstallerApproved
            && exportGuardRunMode === 'active';
        return {
            expected,
            appEnabled,
            interfaceEnabled: iface.enabled === true,
            mode: String(iface.mode || 'off').toLowerCase(),
            commissioned: iface.commissioned === true,
            installerApproved: iface.installerApproved === true,
            exportGuardEnabled,
            exportGuardInstallerApproved,
            exportGuardRunMode,
            failSafePolicy: ['project-specific', 'last-valid', 'release', 'block'].includes(String(iface.failSafePolicy || ''))
                ? String(iface.failSafePolicy)
                : 'project-specific',
            lastValidHoldSec: Math.max(0, Math.min(3600, Math.round(this._num(iface.lastValidHoldSec, 60)))),
        };
    }

    _resolveExternalAllowedExportPowerW(envelope, cfg) {
        const command = envelope && envelope.command && typeof envelope.command === 'object' ? envelope.command : {};
        const values = envelope && envelope.values && typeof envelope.values === 'object' ? envelope.values : {};
        const finiteOrNull = (value) => {
            if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };
        const action = String(command.action || 'monitor');
        if (action === 'trip' || action === 'inhibit') {
            return { usable: true, allowedExportPowerW: 0, setpointKind: action, reason: String(command.reason || action) };
        }
        if (command.binding !== true) {
            return { usable: false, released: true, setpointKind: 'released', reason: String(command.reason || 'no-binding-command') };
        }
        if (action !== 'active-power-constraint') {
            return { usable: false, noActivePowerLimit: true, setpointKind: action, reason: 'binding-command-without-active-power-limit' };
        }

        // Standardisierte W-Vorgabe des Netzbetreiber-Moduls hat Vorrang.
        // `null`/leere Werte werden strikt abgewiesen; Number(null) darf niemals
        // versehentlich als 0-W-Nulleinspeisung interpretiert werden.
        const standardizedAllowedW = finiteOrNull(envelope && envelope.allowedExportPowerW);
        if (standardizedAllowedW !== null && standardizedAllowedW >= 0) {
            return { usable: true, allowedExportPowerW: Math.round(standardizedAllowedW), setpointKind: 'allowedExportPowerW', reason: 'certified-controller-standardized-export-limit' };
        }

        const pLimitKw = finiteOrNull(values['grid.p.limit_kw']);
        if (pLimitKw !== null && pLimitKw >= 0) {
            return { usable: true, allowedExportPowerW: Math.round(pLimitKw * 1000), setpointKind: 'grid.p.limit_kw', reason: 'certified-controller-p-limit' };
        }
        // Kanonischer Vertrag: positive Werte sind zulässige Einspeisung am NAP.
        const pTargetKw = finiteOrNull(values['grid.p.target_kw']);
        if (pTargetKw !== null && pTargetKw >= 0) {
            return { usable: true, allowedExportPowerW: Math.round(pTargetKw * 1000), setpointKind: 'grid.p.target_kw', reason: 'certified-controller-p-target-positive-export' };
        }
        const pTargetPct = finiteOrNull(values['grid.p.target_pct']);
        if (pTargetPct !== null && pTargetPct >= 0 && pTargetPct <= 100) {
            const groupRatedW = this._sumRatedW(this._normalizeInvList(cfg && cfg.pvCurtailInvertersZero));
            const ratedW = Math.max(0, Number(this._getRatedPvW(cfg || {})) || groupRatedW || 0);
            if (ratedW > 0) {
                return { usable: true, allowedExportPowerW: Math.round(ratedW * pTargetPct / 100), setpointKind: 'grid.p.target_pct', reason: 'certified-controller-p-target-percent' };
            }
            return { usable: false, invalid: true, setpointKind: 'grid.p.target_pct', reason: 'rated-pv-power-missing-for-percent-command' };
        }
        return { usable: false, invalid: true, setpointKind: 'active-power-constraint', reason: 'external-active-power-command-missing-or-ambiguous' };
    }

    /**
     * Ermittelt die allein wirksame Führungsquelle für die Einspeisebegrenzung.
     * Der zertifizierte Regler wird nur dann bindend, wenn App, Aktivmodus,
     * Inbetriebnahme und Installerfreigabe gleichzeitig vorliegen. EOS bleibt
     * der einzige Asset-Writer und setzt die strengere Grenze über den bestehenden
     * Export-Guard um; die Netzbetreiber-Schnittstelle selbst bleibt read-only.
     */
    _resolveExportLimitAuthority(cfg, nowMs = Date.now()) {
        const now = Math.max(0, Math.round(Number(nowMs) || Date.now()));
        const configuredMaxFeedInW = this._getConfiguredMaxFeedInPowerW(cfg || {});
        const fallbackExportPowerW = this._getFallbackExportPowerW(cfg || {}, configuredMaxFeedInW);
        const activation = this._getNetOperatorActivation();
        const envelope = this.adapter && this.adapter._netOperatorEnvelope && typeof this.adapter._netOperatorEnvelope === 'object'
            ? this.adapter._netOperatorEnvelope
            : null;
        const base = {
            schema: 'nexowatt.grid.export-limit-authority.v1',
            timestamp: now,
            configuredMaxFeedInW,
            fallbackExportPowerW,
            effectiveMaxFeedInW: configuredMaxFeedInW,
            allowedExportPowerW: null,
            controlSource: 'eos-local',
            source: 'NexoWatt EOS Netzlimits',
            quality: 'local',
            lastUpdate: now,
            validUntil: 0,
            commandId: '',
            setpointKind: 'local-static-limit',
            reason: activation.expected ? 'certified-controller-envelope-not-ready' : 'certified-controller-not-activated',
            externalExpected: activation.expected,
            externalActive: false,
            externalBinding: false,
            failSafePolicy: activation.failSafePolicy,
            activation,
            localUpperBoundApplied: true,
        };
        if (!activation.expected) return base;

        const source = String((envelope && (envelope.source || envelope.controllerSource)) || 'EZA-/Parkregler');
        const commandId = String(envelope && envelope.command && envelope.command.commandId || '');
        const maxAgeMs = Math.max(1000, Math.round(this._num(
            envelope && envelope.maxAgeMs,
            this._num(this.adapter?.config?.netOperatorInterface?.signalMaxAgeSec, 5) * 1000,
        )));
        const receivedAt = Math.max(0, Math.round(Number(envelope && (envelope.receivedAt || envelope.generatedAt)) || 0));
        const declaredValidUntil = Math.max(0, Math.round(Number(envelope && envelope.validUntil) || 0));
        const validUntil = declaredValidUntil || (receivedAt > 0 ? receivedAt + maxAgeMs : 0);
        const envelopeEligible = !!(envelope
            && envelope.externalExportLimitEligible === true
            && envelope.active === true
            && envelope.commissioned === true
            && envelope.installerApproved === true
            && String(envelope.operationEngineIntegration || '') === 'grid-export-limit-active');
        const envelopeFresh = !!(envelopeEligible
            && envelope.valid === true
            && envelope.fresh === true
            && envelope.commOk === true
            && (validUntil <= 0 || now <= validUntil));

        if (envelopeFresh) {
            const resolved = this._resolveExternalAllowedExportPowerW(envelope, cfg || {});
            if (resolved.usable) {
                const allowedExportPowerW = Math.max(0, Math.round(Number(resolved.allowedExportPowerW) || 0));
                const effectiveMaxFeedInW = Math.min(configuredMaxFeedInW, allowedExportPowerW);
                this._exportLimitAuthorityRuntime.lastValidAllowedExportPowerW = allowedExportPowerW;
                this._exportLimitAuthorityRuntime.lastValidEffectiveMaxFeedInW = effectiveMaxFeedInW;
                this._exportLimitAuthorityRuntime.lastValidAt = receivedAt || now;
                this._exportLimitAuthorityRuntime.lastValidUntil = validUntil;
                this._exportLimitAuthorityRuntime.lastCommandId = commandId;
                return {
                    ...base,
                    effectiveMaxFeedInW,
                    allowedExportPowerW,
                    controlSource: 'certified-controller',
                    source,
                    quality: 'good',
                    lastUpdate: receivedAt || now,
                    validUntil,
                    commandId,
                    setpointKind: resolved.setpointKind,
                    reason: resolved.reason,
                    externalActive: true,
                    externalBinding: true,
                };
            }
            if (resolved.released || resolved.noActivePowerLimit) {
                return {
                    ...base,
                    source,
                    quality: resolved.noActivePowerLimit ? 'good-no-active-power-limit' : 'good-released',
                    lastUpdate: receivedAt || now,
                    validUntil,
                    commandId,
                    setpointKind: resolved.setpointKind,
                    reason: resolved.reason,
                    externalActive: true,
                    externalBinding: false,
                };
            }
        }

        const policy = activation.failSafePolicy;
        const rt = this._exportLimitAuthorityRuntime || {};
        const holdMs = activation.lastValidHoldSec * 1000;
        const lastValidUsable = policy === 'last-valid'
            && Number.isFinite(Number(rt.lastValidAllowedExportPowerW))
            && Number(rt.lastValidAt || 0) > 0
            && holdMs > 0
            && now - Number(rt.lastValidAt) <= holdMs;
        let effectiveMaxFeedInW = fallbackExportPowerW;
        let allowedExportPowerW = null;
        let controlSource = 'eos-local-fallback';
        let quality = envelope ? (envelope.commOk === false ? 'communication-error' : envelope.fresh === false ? 'stale' : 'invalid') : 'missing';
        let reason = `certified-controller-${quality}-${policy}`;
        let setpointKind = 'fallback-export-power';
        if (policy === 'block') {
            effectiveMaxFeedInW = 0;
            allowedExportPowerW = 0;
            controlSource = 'certified-controller-failsafe';
            quality = `${quality}-blocked`;
            reason = 'certified-controller-failsafe-block';
            setpointKind = 'fail-safe-block';
        } else if (lastValidUsable) {
            allowedExportPowerW = Math.max(0, Math.round(Number(rt.lastValidAllowedExportPowerW) || 0));
            effectiveMaxFeedInW = Math.min(configuredMaxFeedInW, allowedExportPowerW);
            controlSource = 'certified-controller-last-valid';
            quality = 'held-last-valid';
            reason = 'certified-controller-last-valid-within-hold-time';
            setpointKind = 'last-valid';
        } else if (policy === 'release') {
            effectiveMaxFeedInW = configuredMaxFeedInW;
            controlSource = 'eos-local-fallback';
            quality = `${quality}-released-to-eos`;
            reason = 'certified-controller-failsafe-release-to-eos';
            setpointKind = 'local-static-limit';
        } else if (policy === 'last-valid') {
            reason = 'certified-controller-last-valid-unavailable-use-fallback';
        }
        return {
            ...base,
            effectiveMaxFeedInW: Math.max(0, Math.round(effectiveMaxFeedInW)),
            allowedExportPowerW,
            controlSource,
            source,
            quality,
            lastUpdate: receivedAt || Number(rt.lastValidAt || 0),
            validUntil,
            commandId: commandId || String(rt.lastCommandId || ''),
            setpointKind,
            reason,
        };
    }

    /** Kompatibler Zugriff für die bestehende Regelstrecke. */
    _getMaxFeedInPowerW(cfg) {
        return this._resolveExportLimitAuthority(cfg || {}).effectiveMaxFeedInW;
    }

    /**
     * Code-Teil: _getExportLimitRunMode
     * Zweck: Trennt die installateurseitige Inbetriebnahme der Einspeisebegrenzung in Diagnose/Test und Aktivbetrieb.
     * Zusammenhang: Im Diagnosemodus berechnet und veröffentlicht NexoWatt alle Export-Guard-Werte, schreibt aber keine
     * WR-/PV-Setpoints. Dadurch kann der Installateur die Richtung, Messwerte und Schreibfähigkeit prüfen, ohne Hardware
     * zu beeinflussen. Die bestehende Regelstrecke bleibt unverändert; diese Funktion ist nur ein Sicherheits-Gate davor.
     */
    _getExportLimitRunMode(cfg) {
        const raw = String(
            cfg?.exportLimitRunMode ??
            cfg?.zeroExportRunMode ??
            cfg?.exportGuardMode ??
            'active'
        ).trim().toLowerCase();
        if (raw === 'diagnostic' || raw === 'test' || raw === 'dryrun' || raw === 'dry-run' || raw === 'simulation') return 'diagnostic';
        if (raw === 'active' || raw === 'on' || raw === 'write' || raw === 'productive') return 'active';
        return 'active';
    }

    /**
     * Code-Teil: _isExportLimitDiagnosticMode
     * Zweck: Kleine, gut auffindbare Sicherheitsprüfung für alle Stellen, die entscheiden müssen, ob WR-Setpoints
     * geschrieben werden dürfen. Wichtig: Dieser Modus gilt nur für die dynamische Einspeisebegrenzung, nicht für
     * separate EVU-Relaisvorgaben.
     */
    _isExportLimitDiagnosticMode(cfg) {
        return this._getExportLimitRunMode(cfg) === 'diagnostic';
    }

    /**
     * Code-Teil: _buildExportLimitTarget
     * Zweck: Übersetzt die Installateurvorgabe „maximale Einspeisung“ in einen NVP-Regelzielwert.
     * Zusammenhang: Vorzeichenkonvention bleibt zentral: Netzleistung + = Bezug, - = Einspeisung.
     * Beispiel: maxFeedInPowerW=3000 und Bias=80 ergibt Ziel -2920 W. Wird mehr exportiert, regelt
     * die bestehende PV-Curtail-Logik herunter. Damit bauen wir keinen zweiten Regler.
     */
    _buildExportLimitTarget(cfg, tariffGridImportPreferred) {
        const authority = this._resolveExportLimitAuthority(cfg || {});
        const mesh = this.adapter?._meshCoordinator?.currentLimits();
        const maxFeedInPowerW = Math.min(Math.max(0, authority.effectiveMaxFeedInW), mesh?.required ? mesh.limits.exportW : Infinity);
        const baseBiasW = Math.max(0, this._num(cfg.zeroExportBiasW, 80));
        const negativeBiasW = tariffGridImportPreferred ? Math.max(0, this._num(cfg.zeroExportNegativePriceImportBiasW, 1000)) : 0;
        const biasW = tariffGridImportPreferred ? Math.max(baseBiasW, negativeBiasW) : baseBiasW;
        const deadbandW = Math.max(0, this._num(cfg.zeroExportDeadbandW, 50));
        const targetGridW = biasW - maxFeedInPowerW;
        return { maxFeedInPowerW, baseBiasW, biasW, deadbandW, targetGridW, authority };
    }

    _num(v, dflt = 0) {
        const n = Number(v);
        return Number.isFinite(n) ? n : dflt;
    }
    /**
     * Code-Teil: _clamp
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _clamp(v, minV, maxV) {
        const n = Number(v);
        if (!Number.isFinite(n)) return minV;
        return Math.min(Math.max(n, minV), maxV);
    }

    async _isTariffGridImportPreferred() {
        try {
            const tv = (this.adapter && this.adapter._tarifVis) ? this.adapter._tarifVis : null;
            if (tv && (tv.gridImportPreferred || tv.netzbezugBevorzugt || tv.negativeActive)) return true;
            const st = await this.adapter.getStateAsync('tarif.netzbezugBevorzugt');
            return !!(st && st.val);
        } catch {
            return false;
        }
    }

    _exportLimitAuditHash(event) {
        const payload = {
            schema: String(event && event.schema || ''),
            timestamp: Number(event && event.timestamp || 0),
            controlSource: String(event && event.controlSource || ''),
            source: String(event && event.source || ''),
            quality: String(event && event.quality || ''),
            configuredMaxFeedInW: Number(event && event.configuredMaxFeedInW || 0),
            allowedExportPowerW: event && event.allowedExportPowerW !== null ? Number(event.allowedExportPowerW) : null,
            fallbackExportPowerW: Number(event && event.fallbackExportPowerW || 0),
            effectiveMaxFeedInW: Number(event && event.effectiveMaxFeedInW || 0),
            validUntil: Number(event && event.validUntil || 0),
            commandId: String(event && event.commandId || ''),
            reason: String(event && event.reason || ''),
            previousHash: String(event && event.previousHash || ''),
        };
        return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }

    async _restoreExportLimitAuthorityAudit() {
        try {
            if (!this.adapter || typeof this.adapter.getStateAsync !== 'function') return;
            const state = await this.adapter.getStateAsync('gridConstraints.exportLimit.authority.decisionAuditJson');
            if (!state || typeof state.val !== 'string' || !state.val.trim()) return;
            const parsed = JSON.parse(state.val);
            if (!Array.isArray(parsed)) return;
            const verified = [];
            const tail = parsed.slice(-200);
            // Bei begrenzter Historie kann der erste sichtbare Eintrag auf einen
            // bereits verworfenen Vorgänger zeigen. Dieser Hash ist der Startanker
            // des überprüften Ausschnitts und darf nicht fälschlich als Manipulation gelten.
            let previousHash = tail.length ? String(tail[0] && tail[0].previousHash || '') : '';
            for (const raw of tail) {
                if (!raw || typeof raw !== 'object' || String(raw.previousHash || '') !== previousHash) break;
                const expected = this._exportLimitAuditHash(raw);
                if (!raw.hash || expected !== String(raw.hash)) break;
                verified.push(raw);
                previousHash = String(raw.hash);
            }
            this._exportLimitAuthorityRuntime.audit = verified;
            this._exportLimitAuthorityRuntime.auditHeadHash = verified.length
                ? String(verified[verified.length - 1].hash || '')
                : '';
            const last = verified.length ? verified[verified.length - 1] : null;
            if (last) this._exportLimitAuthorityRuntime.decisionSignature = JSON.stringify([
                last.controlSource, last.source, last.quality, last.allowedExportPowerW,
                last.fallbackExportPowerW, last.effectiveMaxFeedInW, last.validUntil,
                last.commandId, last.reason,
            ]);
        } catch (_e) {
            this._exportLimitAuthorityRuntime.audit = [];
            this._exportLimitAuthorityRuntime.auditHeadHash = '';
            this._exportLimitAuthorityRuntime.decisionSignature = '';
        }
    }

    _appendExportLimitAuthorityAudit(authority) {
        const a = authority && typeof authority === 'object' ? authority : {};
        const signature = JSON.stringify([
            a.controlSource, a.source, a.quality, a.allowedExportPowerW,
            a.fallbackExportPowerW, a.effectiveMaxFeedInW, a.validUntil,
            a.commandId, a.reason,
        ]);
        if (signature === this._exportLimitAuthorityRuntime.decisionSignature) return null;
        const event = {
            schema: 'nexowatt.grid.export-limit-authority-audit.v1',
            timestamp: Date.now(),
            controlSource: String(a.controlSource || 'eos-local'),
            source: String(a.source || ''),
            quality: String(a.quality || ''),
            configuredMaxFeedInW: Math.max(0, Math.round(Number(a.configuredMaxFeedInW) || 0)),
            allowedExportPowerW: a.allowedExportPowerW === null || a.allowedExportPowerW === undefined ? null : Math.max(0, Math.round(Number(a.allowedExportPowerW) || 0)),
            fallbackExportPowerW: Math.max(0, Math.round(Number(a.fallbackExportPowerW) || 0)),
            effectiveMaxFeedInW: Math.max(0, Math.round(Number(a.effectiveMaxFeedInW) || 0)),
            validUntil: Math.max(0, Math.round(Number(a.validUntil) || 0)),
            commandId: String(a.commandId || ''),
            reason: String(a.reason || ''),
            previousHash: String(this._exportLimitAuthorityRuntime.auditHeadHash || ''),
        };
        event.hash = this._exportLimitAuditHash(event);
        this._exportLimitAuthorityRuntime.audit.push(event);
        this._exportLimitAuthorityRuntime.audit = this._exportLimitAuthorityRuntime.audit.slice(-200);
        this._exportLimitAuthorityRuntime.auditHeadHash = event.hash;
        this._exportLimitAuthorityRuntime.decisionSignature = signature;
        return event;
    }

    async _publishExportLimitAuthorityStates(authority) {
        const a = authority && typeof authority === 'object' ? authority : this._resolveExportLimitAuthority(this._cfg());
        const event = this._appendExportLimitAuthorityAudit(a);
        const set = async (id, value) => { try { await this.adapter.setStateAsync(id, value, true); } catch (_e) {} };
        await set('gridConstraints.exportLimit.controlSource', String(a.controlSource || 'eos-local'));
        await set('gridConstraints.exportLimit.authority.expected', a.externalExpected === true);
        await set('gridConstraints.exportLimit.authority.active', a.externalActive === true);
        await set('gridConstraints.exportLimit.authority.binding', a.externalBinding === true);
        await set('gridConstraints.exportLimit.authority.allowedExportPowerW', a.allowedExportPowerW === null || a.allowedExportPowerW === undefined ? -1 : Math.max(0, Math.round(Number(a.allowedExportPowerW) || 0)));
        await set('gridConstraints.exportLimit.authority.fallbackExportPowerW', Math.max(0, Math.round(Number(a.fallbackExportPowerW) || 0)));
        await set('gridConstraints.exportLimit.authority.validUntil', Math.max(0, Math.round(Number(a.validUntil) || 0)));
        await set('gridConstraints.exportLimit.authority.source', String(a.source || ''));
        await set('gridConstraints.exportLimit.authority.quality', String(a.quality || ''));
        await set('gridConstraints.exportLimit.authority.lastUpdate', Math.max(0, Math.round(Number(a.lastUpdate) || 0)));
        await set('gridConstraints.exportLimit.authority.commandId', String(a.commandId || ''));
        await set('gridConstraints.exportLimit.authority.failSafePolicy', String(a.failSafePolicy || 'project-specific'));
        await set('gridConstraints.exportLimit.authority.reason', String(a.reason || ''));
        await set('gridConstraints.exportLimit.authority.decisionJson', JSON.stringify(a));
        await set('gridConstraints.exportLimit.authority.decisionAuditJson', JSON.stringify(this._exportLimitAuthorityRuntime.audit || []));
        await set('gridConstraints.exportLimit.authority.auditHeadHash', String(this._exportLimitAuthorityRuntime.auditHeadHash || ''));
        if (event) await set('gridConstraints.exportLimit.authority.lastAuditEventJson', JSON.stringify(event));
    }

    async init() {
        if (!this._isEnabled()) return;

        // Channel tree
        await this.adapter.setObjectNotExistsAsync('gridConstraints', {
            type: 'channel',
            common: { name: 'Netz-Constraints (RLM / Nulleinspeisung)' },
            native: {},
        });

        for (const ch of ['control', 'importLimits', 'rlm', 'zeroExport', 'exportLimit', 'exportLimit.authority', 'exportLimit.commissioning', 'exportLimit.sinks', 'exportLimit.sinks.storage', 'exportLimit.sinks.charging', 'exportLimit.sinks.flexLoads', 'exportLimit.sinks.mesh', 'exportLimit.sinks.inverter', 'pvCurtail']) {
            await this.adapter.setObjectNotExistsAsync(`gridConstraints.${ch}`, {
                type: 'channel',
                common: { name: ch },
                native: {},
            });
        }

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        const mk = async (id, name, type = 'number', role = 'value') => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('gridConstraints.control.status', 'Status', 'string', 'text');
        await mk('gridConstraints.control.reason', 'Reason', 'string', 'text');
        await mk('gridConstraints.control.maxImportW_final', 'Hard maximum allowed import (W)', 'number', 'value.power');
        await mk('gridConstraints.control.maxImportW_planning', 'Soft planning maximum allowed import (W)', 'number', 'value.power');
        await mk('gridConstraints.control.minImportTargetW', 'Min import target (W) for zero export', 'number', 'value.power');
        await mk('gridConstraints.control.lastUpdate', 'Last update (ts)', 'number', 'value.time');


        // Zweistufige Importbegrenzung (nur Bezug; Einspeisung bleibt negativ).
        await mk('gridConstraints.importLimits.enabled', 'Soft import limit enabled', 'boolean', 'indicator');
        await mk('gridConstraints.importLimits.hardLimitW', 'Hard import limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.softLimitW', 'Soft import limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.planningLimitW', 'Planning import limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.reserveW', 'Reserve between soft and hard limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.hysteresisW', 'Soft-limit hysteresis (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.releaseDelayMs', 'Soft-limit release delay (ms)', 'number', 'value.interval');
        await mk('gridConstraints.importLimits.signedNvpW', 'Signed NVP (+ import / - export)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.softHeadroomW', 'Headroom to soft limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.hardHeadroomW', 'Headroom to hard limit (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.requiredReductionW', 'Required flexible-load reduction (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.stage', 'Import limit stage', 'string', 'text');
        await mk('gridConstraints.importLimits.reason', 'Import limit reason', 'string', 'text');
        await mk('gridConstraints.importLimits.source', 'Import limit source', 'string', 'text');
        await mk('gridConstraints.importLimits.baseConnectionPowerW', 'Assigned grid connection power (W)', 'number', 'value.power');
        await mk('gridConstraints.importLimits.softLimitMode', 'Soft limit mode', 'string', 'text');
        await mk('gridConstraints.importLimits.releasePending', 'Soft-limit release pending', 'boolean', 'indicator');

        // RLM
        await mk('gridConstraints.rlm.enabled', 'RLM enabled', 'boolean', 'indicator');
        await mk('gridConstraints.rlm.limitW', 'RLM limit (W)', 'number', 'value.power');
        await mk('gridConstraints.rlm.safetyMarginW', 'RLM safety margin (W)', 'number', 'value.power');
        await mk('gridConstraints.rlm.intervalStart', 'Interval start (ts)', 'number', 'value.time');
        await mk('gridConstraints.rlm.elapsedSec', 'Elapsed (s)', 'number', 'value.interval');
        await mk('gridConstraints.rlm.remainingSec', 'Remaining (s)', 'number', 'value.interval');
        await mk('gridConstraints.rlm.importedWs', 'Imported energy (Ws) in interval', 'number', 'value');
        await mk('gridConstraints.rlm.avgW', 'Average import power in interval (W)', 'number', 'value.power');
        await mk('gridConstraints.rlm.capNowW', 'Cap now (W) to stay within 15-min avg', 'number', 'value.power');

        // Zero export
        await mk('gridConstraints.zeroExport.enabled', 'Zero export enabled', 'boolean', 'indicator');
        await mk('gridConstraints.zeroExport.targetImportBiasW', 'Target import bias (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.deadbandW', 'Deadband (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.exportW', 'Current export (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.controlGridW', 'NVP used for coordinated PV control (+ import / - export)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.controlExportW', 'Residual export used for coordinated PV control (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.action', 'Action', 'string', 'text');
        await mk('gridConstraints.zeroExport.installerApproved', 'Installer approved export limit', 'boolean', 'indicator');
        await mk('gridConstraints.zeroExport.maxFeedInPowerW', 'Max allowed feed-in power (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.targetGridW', 'Grid target (+ import / - export)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.modeLabel', 'Export limit mode label', 'string', 'text');

        await mk('gridConstraints.zeroExport.pvActualW', 'Current PV production (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.localAbsorptionW', 'Local consumption plus storage charging (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.pvFeedForwardTargetW', 'PV feed-forward target (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.pvFeedbackCorrectionW', 'PV feedback correction from NVP (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.storageActualW', 'Storage actual power (+ discharge / - charge)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.storageTargetW', 'Storage target power (+ discharge / - charge)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.storageDischargeConflict', 'PV curtailment conflicts with storage discharge', 'boolean', 'indicator');
        await mk('gridConstraints.zeroExport.estimatedCurtailmentW', 'Estimated PV curtailment (W)', 'number', 'value.power');
        await mk('gridConstraints.zeroExport.pvSetpointReason', 'PV setpoint reason', 'string', 'text');
        await mk('gridConstraints.zeroExport.pvActualSource', 'PV actual source', 'string', 'text');

        // Export Guard Diagnose (read-only): Diese States zeigen Einspeisung vs. Installateur-Limit,
        // negative-Preis-Strategie und WR-Schreibfähigkeit. Die eigentliche Regelung bleibt weiterhin
        // die bestehende Grid-Constraints-/PV-Curtail-Logik; hier entsteht bewusst kein zweiter Regler.
        await mk('gridConstraints.exportLimit.enabled', 'Export Guard enabled', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.installerApproved', 'Installer approved', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.configuredMaxFeedInW', 'Configured max feed-in (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.effectiveMaxFeedInW', 'Effective max feed-in (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.currentExportW', 'Current export (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.controlExportW', 'Residual export after coordinated storage response (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.controlOverLimitW', 'Residual export above limit after coordinated storage response (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.remainingFeedInW', 'Remaining allowed feed-in (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.exportOverLimitW', 'Export above limit (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.usagePercent', 'Export limit usage (%)', 'number', 'value.percent');
        await mk('gridConstraints.exportLimit.targetGridW', 'Grid target (+ import / - export)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.statusLabel', 'Export Guard status label', 'string', 'text');
        await mk('gridConstraints.exportLimit.runMode', 'Export Guard run mode', 'string', 'text');
        await mk('gridConstraints.exportLimit.diagnosticOnly', 'Export Guard diagnostic only', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.plannedAction', 'Export Guard planned action', 'string', 'text');
        await mk('gridConstraints.exportLimit.installerMessage', 'Export Guard installer message', 'string', 'text');
        await mk('gridConstraints.exportLimit.installerChecklistJson', 'Export Guard installer checklist JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.negativePriceActive', 'Negative price strategy active', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.negativePriceStrategy', 'Negative price strategy', 'string', 'text');
        await mk('gridConstraints.exportLimit.writeCapable', 'WR write capable', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.writeWarning', 'WR write warning', 'string', 'text');
        await mk('gridConstraints.exportLimit.missingWriteDatapointsJson', 'Missing WR write datapoints JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.curtailmentRequiredW', 'Required curtailment (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.estimatedCurtailmentW', 'Estimated curtailment (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.unusedPvPowerW', 'Unused PV power due to Export Guard (W)', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.displayJson', 'Export Guard display JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.summaryJson', 'Export Guard summary JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.controlSource', 'Wirksame Führungsquelle der Einspeisegrenze', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.expected', 'Zertifizierter Regler wird erwartet', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.authority.active', 'Zertifizierter Regler ist wirksame Quelle', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.authority.binding', 'Externe Wirkleistungsvorgabe ist bindend', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.authority.allowedExportPowerW', 'Extern erlaubte Einspeiseleistung; -1 = keine P-Vorgabe', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.authority.fallbackExportPowerW', 'EOS-Rückfallgrenze bei Reglerausfall', 'number', 'value.power');
        await mk('gridConstraints.exportLimit.authority.validUntil', 'Externe Vorgabe gültig bis', 'number', 'value.time');
        await mk('gridConstraints.exportLimit.authority.source', 'Quelle der wirksamen Vorgabe', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.quality', 'Qualität der Vorgabe', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.lastUpdate', 'Letzte Aktualisierung der Vorgabe', 'number', 'value.time');
        await mk('gridConstraints.exportLimit.authority.commandId', 'Externe Command-ID', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.failSafePolicy', 'Fail-Safe-Vertrag', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.reason', 'Begründung der Quellenwahl', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.decisionJson', 'Vollständige Führungsquellenentscheidung JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.authority.decisionAuditJson', 'Verkettetes Führungsquellen-Audit JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.authority.auditHeadHash', 'Hash des letzten Audit-Eintrags', 'string', 'text');
        await mk('gridConstraints.exportLimit.authority.lastAuditEventJson', 'Letztes Führungsquellen-Auditereignis JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkPriorityOrderJson', '0-export sink priority order JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkPriorityPlanJson', '0-export sink priority plan JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.nextSinkAction', 'Next 0-export sink action', 'string', 'text');
        await mk('gridConstraints.exportLimit.sinkCommandEnvelopeJson', '0-export sink neutral command envelope JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkCommandWriteStatus', '0-export sink command write status', 'string', 'text');
        await mk('gridConstraints.exportLimit.sinkCommandWriteJson', '0-export sink command write JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkCommandLastError', '0-export sink command last error', 'string', 'text');

        // 0.8.55: Senken-Freigabe und schneller Aktivbetrieb.
        // 0.8.56: Senken-ACK-Verlauf und Feldprotokoll.
        // Diese States sind die schnelle Betriebsdiagnose: keine Schreibtests pro Tick,
        // sondern Nutzung gespeicherter Freigaben/ACKs und zielweises Blockieren bei Fehlern.
        await mk('gridConstraints.exportLimit.sinkAvailabilityJson', '0-export sink availability JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.fastPathReady', '0-export fast path ready', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.activeSinkJson', '0-export active sink JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.fallbackReason', '0-export fallback reason', 'string', 'text');
        await mk('gridConstraints.exportLimit.sinkAckSummaryJson', '0-export sink ACK summary JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkAckHistoryJson', '0-export sink ACK history JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkAckFieldProtocolJson', '0-export sink ACK field protocol JSON', 'string', 'json');
        // RC83: Das kombinierte Feldprotokoll wird im schnellen 0-Einspeise-Pfad
        // zyklisch geschrieben. Das Objekt muss zwingend vor dem ersten Write
        // existieren, sonst erzeugt ioBroker alle paar Sekunden eine Warnung.
        await mk('gridConstraints.exportLimit.sinkFieldProtocolJson', '0-export sink field protocol JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.sinkAckOkCount', '0-export sink ACK ok count', 'number', 'value');
        await mk('gridConstraints.exportLimit.sinkAckPendingCount', '0-export sink ACK pending count', 'number', 'value');
        await mk('gridConstraints.exportLimit.sinkAckErrorCount', '0-export sink ACK error count', 'number', 'value');
        await mk('gridConstraints.exportLimit.sinkAckTimeoutCount', '0-export sink ACK timeout count', 'number', 'value');
        await mk('gridConstraints.exportLimit.sinkAckLastEvent', '0-export sink last ACK event', 'string', 'text');
        for (const sink of ['storage', 'charging', 'flexLoads', 'mesh', 'inverter']) {
            await mk(`gridConstraints.exportLimit.sinks.${sink}.usable`, `${sink} usable for zero export`, 'boolean', 'indicator');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.lastAck`, `${sink} last ACK`, 'string', 'text');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.lastWriteTest`, `${sink} last write-test`, 'string', 'text');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.blockedUntil`, `${sink} blocked until`, 'number', 'value.time');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.lastReason`, `${sink} last reason`, 'string', 'text');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.ackHistoryJson`, `${sink} ACK history JSON`, 'string', 'json');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.ackOkCount`, `${sink} ACK ok count`, 'number', 'value');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.ackErrorCount`, `${sink} ACK error count`, 'number', 'value');
            await mk(`gridConstraints.exportLimit.sinks.${sink}.ackTimeoutCount`, `${sink} ACK timeout count`, 'number', 'value');
        }

        // 0.8.54: 0-Einspeise Inbetriebnahme-Assistent.
        // Der Assistent baut keine zweite Regelstrecke. Er bewertet nur die vorhandene
        // Export-Guard-/Grid-Constraints-Logik und macht für den Installateur sichtbar,
        // ob Smartmeter, WR-Write, Speicher-/LP-Senken, Testmodus und Aktivfreigabe passen.
        await mk('gridConstraints.exportLimit.commissioning.status', '0-export commissioning status', 'string', 'text');
        await mk('gridConstraints.exportLimit.commissioning.stage', '0-export commissioning stage', 'string', 'text');
        await mk('gridConstraints.exportLimit.commissioning.ready', '0-export commissioning ready', 'boolean', 'indicator');
        await mk('gridConstraints.exportLimit.commissioning.scorePercent', '0-export commissioning score', 'number', 'value.percent');
        await mk('gridConstraints.exportLimit.commissioning.nextStep', '0-export commissioning next step', 'string', 'text');
        await mk('gridConstraints.exportLimit.commissioning.lastReason', '0-export commissioning reason', 'string', 'text');
        await mk('gridConstraints.exportLimit.commissioning.checklistJson', '0-export commissioning checklist JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.commissioning.writeTestPreviewJson', '0-export commissioning write-test preview JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.commissioning.sinkStatusJson', '0-export commissioning sink status JSON', 'string', 'json');
        await mk('gridConstraints.exportLimit.commissioning.reportJson', '0-export commissioning report JSON', 'string', 'json');

        // PV curtail debug
        await mk('gridConstraints.pvCurtail.mode', 'Curtail mode (resolved)', 'string', 'text');
        await mk('gridConstraints.pvCurtail.setpointW', 'PV limit setpoint (W)', 'number', 'value.power');
        await mk('gridConstraints.pvCurtail.setpointPct', 'PV limit setpoint (%)', 'number', 'value');
        await mk('gridConstraints.pvCurtail.applied', 'Curtail applied', 'boolean', 'indicator');
        await mk('gridConstraints.pvCurtail.evuStagePct', 'EVU stage (%)', 'number', 'value');
        await mk('gridConstraints.pvCurtail.evuRelays', 'EVU relays (60/30/0)', 'string', 'text');
        await mk('gridConstraints.pvCurtail.estimatedCurtailmentW', 'Estimated curtailment (W)', 'number', 'value.power');

        await this._restoreExportLimitAuthorityAudit();

        // Datapoint mapping
        const cfg = this._cfg();
        const dp = this.dp;

        // RC81: Der NVP wird ausschließlich zentral unter Zuordnung → Allgemein
        // (`datapoints.gridPointPower`) gemappt und als gefiltertes `grid.powerW`
        // bereitgestellt. Ein zweites Modul-Mapping würde Vorzeichen, Stale-Status
        // und Regelhoheit auseinanderlaufen lassen und wird daher nicht mehr angelegt.

        // PV/WR curtail controls
        if (cfg.pvFeedInLimitWId) {
            await dp.upsert({ key: 'pv.feedInLimitW', objectId: String(cfg.pvFeedInLimitWId).trim(), dataType: 'number', direction: 'out', unit: 'W' });
            await this._rememberPvWriteTarget(cfg.pvFeedInLimitWId);
        }
        if (cfg.pvLimitWId) {
            await dp.upsert({ key: 'pv.limitW', objectId: String(cfg.pvLimitWId).trim(), dataType: 'number', direction: 'out', unit: 'W' });
            await this._rememberPvWriteTarget(cfg.pvLimitWId);
        }
        if (cfg.pvLimitPctId) {
            await dp.upsert({ key: 'pv.limitPct', objectId: String(cfg.pvLimitPctId).trim(), dataType: 'number', direction: 'out', unit: '%' });
            await this._rememberPvWriteTarget(cfg.pvLimitPctId);
        }
        if (cfg.pvRatedPowerWId) {
            await dp.upsert({ key: 'pv.ratedPowerW', objectId: String(cfg.pvRatedPowerWId).trim(), dataType: 'number', direction: 'in', unit: 'W' });
        }

        // PV Abregelung (EVU Relais) – Inputs
        if (cfg.pvEvuRelay60Id) {
            await dp.upsert({ key: 'pv.evu.relay60', objectId: String(cfg.pvEvuRelay60Id).trim(), dataType: 'boolean', direction: 'in' });
        }
        if (cfg.pvEvuRelay30Id) {
            await dp.upsert({ key: 'pv.evu.relay30', objectId: String(cfg.pvEvuRelay30Id).trim(), dataType: 'boolean', direction: 'in' });
        }
        if (cfg.pvEvuRelay0Id) {
            await dp.upsert({ key: 'pv.evu.relay0', objectId: String(cfg.pvEvuRelay0Id).trim(), dataType: 'boolean', direction: 'in' });
        }

        // PV Abregelung – Wechselrichter-Gruppen (pro WR: optional 3 Setpoints)
        /**
         * Code-Teil: Arrow-Funktion `upsertInvList`
         * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: upsertInvList
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const upsertInvList = async (list, prefix) => {
            const arr = Array.isArray(list) ? list : [];
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i];
                if (!it || typeof it !== 'object') continue;
                const feedIn = String(it.feedInLimitWId || '').trim();
                const limitW = String(it.pvLimitWId || '').trim();
                const limitPct = String(it.pvLimitPctId || '').trim();
                if (feedIn) {
                    await dp.upsert({ key: `${prefix}.${i}.feedInLimitW`, objectId: feedIn, dataType: 'number', direction: 'out', unit: 'W' });
                }
                if (limitW) {
                    await dp.upsert({ key: `${prefix}.${i}.limitW`, objectId: limitW, dataType: 'number', direction: 'out', unit: 'W' });
                }
                if (limitPct) {
                    await dp.upsert({ key: `${prefix}.${i}.limitPct`, objectId: limitPct, dataType: 'number', direction: 'out', unit: '%' });
                }
                for (const id of [feedIn, limitW, limitPct].filter(Boolean)) await this._rememberPvWriteTarget(id);
            }
        };

        await upsertInvList(cfg.pvCurtailInvertersEvu, 'pv.evu');
        await upsertInvList(cfg.pvCurtailInvertersZero, 'pv.zero');
    }

    _resolveCurtailMode(cfg) {
        const mode = String(cfg.pvCurtailMode || 'auto');
        if (mode && mode !== 'auto') return mode;

        if (cfg.pvFeedInLimitWId) return 'feedInLimitW';
        if (cfg.pvLimitWId) return 'pvLimitW';
        if (cfg.pvLimitPctId) return 'pvLimitPct';
        return 'off';
    }

    _normalizeInvList(list) {
        const arr = Array.isArray(list) ? list : [];
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const it = arr[i];
            if (!it || typeof it !== 'object') continue;
            const kwpRaw = typeof it.kwp === 'string' ? it.kwp.replace(',', '.') : it.kwp;
            const kwp = Number(kwpRaw);
            const ratedW = (Number.isFinite(kwp) && kwp > 0) ? Math.round(kwp * 1000) : 0;
            out.push({
                idx: i,
                name: String(it.name || '').trim(),
                ratedW,
            });
        }
        return out;
    }

    _sumRatedW(invList) {
        return (Array.isArray(invList) ? invList : []).reduce((sum, it) => sum + (Number(it?.ratedW) || 0), 0);
    }

    /**
     * Merkt die Schreibseite eines ioBroker-Alias für die Konfliktprüfung. Die
     * Auflösung erfolgt bei der Initialisierung, nicht mit DB-Zugriff je Tick.
     * Die Read-Seite eines getrennten Alias ist ausdrücklich kein Schreibziel.
     */
    async _rememberPvWriteTarget(objectId) {
        const original = String(objectId || '').trim();
        let target = original;
        const seen = new Set();
        let zeroSafe = typeof this.adapter?.getForeignObjectAsync === 'function';
        while (target && !seen.has(target) && seen.size < 8 && typeof this.adapter?.getForeignObjectAsync === 'function') {
            seen.add(target);
            let obj;
            try { obj = await this.adapter.getForeignObjectAsync(target); } catch (_e) { zeroSafe = false; break; }
            if (obj?.common?.type !== 'number' || obj?.common?.write !== true) zeroSafe = false;
            // Alias-Ausdrücke und implizite min/max-Skalierungen können 0 logisch
            // in einen positiven physischen Wert verwandeln. Fehlerfall-Nullung
            // bleibt deshalb auf bestätigte direkte Zahlenausgänge beschränkt.
            const expression = obj?.common?.alias?.write;
            if (expression !== undefined && String(expression).trim() !== '' && String(expression).trim() !== 'val') zeroSafe = false;
            const alias = obj?.common?.alias?.id;
            if (alias) zeroSafe = false;
            const next = typeof alias === 'string' ? alias : alias && typeof alias === 'object' ? alias.write : '';
            if (alias && !next) zeroSafe = false;
            if (!next) break;
            target = String(next).trim();
            if (seen.has(target) || seen.size >= 8) zeroSafe = false;
        }
        if (original) {
            this._pvWriteTargetIds.set(original, target || original);
            this._pvWriteZeroSafe.set(original, zeroSafe);
        }
    }

    /**
     * Prüft WR-Konfiguration vor einem Hardwarebefehl: jede Gruppenzeile braucht
     * eine positive Bezugsleistung und einen Ausgang. Ein physischer Ausgang
     * darf nur eine Sollwertart/einen aktiven Regler haben. EVU und Export Guard
     * werden hier nicht zu einer neuen Regelung verschmolzen. Diagnose prüft die
     * spätere Aktivkonfiguration, schreibt aber weiterhin keine WR-Sollwerte.
     */
    _pvMappingStatus(cfg, group = 'zero', diagnostic = false) {
        const groups = { zero: [], evu: [] };
        const problems = { zero: [], evu: [] };
        const readGroup = (name, list, prefix) => {
            for (const [i, row] of (Array.isArray(list) ? list : []).entries()) {
                const label = String(row?.name || `WR ${i + 1}`);
                const rated = Number(typeof row?.kwp === 'string' ? row.kwp.replace(',', '.') : row?.kwp);
                if (!Number.isFinite(rated) || Math.round(rated * 1000) <= 0) problems[name].push(`${label}: Bezugsleistung muss größer als 0 kW sein`);
                const targets = [
                    ['feedInLimitW', row?.feedInLimitWId], ['limitW', row?.pvLimitWId], ['limitPct', row?.pvLimitPctId],
                ].filter(([, id]) => typeof id === 'string' && id.trim());
                if (!targets.length) problems[name].push(`${label}: kein WR-Schreibdatenpunkt zugeordnet`);
                for (const [kind, rawId] of targets) {
                    const objectId = rawId.trim();
                    groups[name].push({ key: `${prefix}.${i}.${kind}`, objectId, physicalId: this._pvWriteTargetIds.get(objectId) || objectId, label });
                }
            }
        };
        readGroup('zero', cfg.pvCurtailInvertersZero, 'pv.zero');
        readGroup('evu', cfg.pvCurtailInvertersEvu, 'pv.evu');
        // Der etablierte Sammelausgang bleibt gültig; er darf ebenfalls nicht
        // gleichzeitig durch eine EVU-Gruppenzeile anders beschrieben werden.
        if (!Array.isArray(cfg.pvCurtailInvertersZero) || !cfg.pvCurtailInvertersZero.length) {
            const mode = this._resolveCurtailMode(cfg);
            const item = { feedInLimitW: ['pv.feedInLimitW', cfg.pvFeedInLimitWId], pvLimitW: ['pv.limitW', cfg.pvLimitWId], pvLimitPct: ['pv.limitPct', cfg.pvLimitPctId] }[mode];
            if (item && typeof item[1] === 'string' && item[1].trim()) {
                const objectId = item[1].trim();
                groups.zero.push({ key: item[0], objectId, physicalId: this._pvWriteTargetIds.get(objectId) || objectId, label: 'Sammelausgang' });
            }
        }
        const activeZero = cfg.zeroExportEnabled === true && (diagnostic || (this._isExportLimitInstallerApproved(cfg) && !this._isExportLimitDiagnosticMode(cfg)));
        const active = { zero: group === 'zero' || activeZero, evu: group === 'evu' || cfg.pvEvuEnabled === true };
        const seen = new Map();
        for (const name of ['zero', 'evu']) {
            if (!active[name]) continue;
            for (const target of groups[name]) {
                const prev = seen.get(target.physicalId);
                if (prev) {
                    const message = `Schreibziel mehrfach belegt: ${prev.target.label} (${prev.name}) / ${target.label} (${name}); getrennte Regler oder Sollwertarten dürfen denselben Ausgang nicht verwenden`;
                    problems[name].push(message);
                    if (prev.name !== name) problems[prev.name].push(message);
                } else seen.set(target.physicalId, { name, target });
            }
        }
        return { valid: problems[group].length === 0, issues: [...new Set(problems[group])], targets: groups[group] };
    }

    /**
     * Ungültige WR-Gruppen werden niemals mit positiven Sollwerten bedient.
     * Nur bereits normalisierte, unverfälschte numerische Limit-Ausgänge erhalten
     * 0 W/0 %. Ein unbekannter DP, positives Mindestlimit oder Offset wird nicht
     * blind beschrieben. Die Diagnose nennt weiterhin den Konfigurationsfehler;
     * ein erfolgreicher ioBroker-Write ist keine Hardware-Wirkungsbestätigung.
     */
    async _stopInvalidPvMappings(status) {
        let applied = false;
        const seen = new Set();
        for (const target of status.targets) {
            if (seen.has(target.physicalId)) continue;
            if (this._pvWriteZeroSafe.get(target.objectId) !== true) continue;
            const e = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry(target.key) : null;
            if (!e || e.objectId !== target.objectId || e.dataType !== 'number' || e.direction !== 'out'
                || e.invert === true || Number(e.offset || 0) !== 0 || !(Number(e.scale ?? 1) > 0)
                || Number(e.min || 0) > 0 || (e.max !== undefined && Number(e.max) < 0)) continue;
            seen.add(target.physicalId);
            const ok = await this.dp.writeNumber(target.key, 0, false);
            applied = applied || ok === true || ok === null;
        }
        return applied;
    }

    /**
     * Prüft positive Vorgaben erneut unmittelbar vor jedem einzelnen Write.
     * Ändert sich während eines await die aktive Konfiguration, werden bereits
     * berechnete höhere Folgekommandos verworfen. Bereits an den Geräteadapter
     * übergebene Befehle können hier nicht rückwirkend zurückgerufen werden.
     */
    async _writeValidatedPvLimit(key, value, cfg) {
        if (this._cfg() !== cfg) return false;
        const group = key.startsWith('pv.evu.') ? 'evu' : 'zero';
        const enabled = group === 'evu' ? cfg.pvEvuEnabled === true
            : cfg.zeroExportEnabled === true && this._isExportLimitInstallerApproved(cfg) && !this._isExportLimitDiagnosticMode(cfg);
        const mapping = this._pvMappingStatus(cfg, group);
        const target = mapping.targets.find(item => item.key === key);
        const entry = this.dp && typeof this.dp.getEntry === 'function' ? this.dp.getEntry(key) : null;
        // /config setzt die neue Konfiguration vor dem EMS-Neustart. In diesem
        // Fenster darf ein neuer Sollwert nie in die alte DP-Zuordnung laufen.
        if (!enabled || !mapping.valid || !target || !entry || entry.objectId !== target.objectId
            || entry.dataType !== 'number' || entry.direction !== 'out') return false;
        return this.dp.writeNumber(key, value, false);
    }
    /**
     * Code-Teil: _getEvuStagePct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getEvuStagePct(cfg) {
        const dp = this.dp;
        const r60 = dp ? dp.getBoolean('pv.evu.relay60', false) : false;
        const r30 = dp ? dp.getBoolean('pv.evu.relay30', false) : false;
        const r0 = dp ? dp.getBoolean('pv.evu.relay0', false) : false;

        // Strictest wins if multiple active
        let pct = 100;
        if (r0) pct = 0;
        else if (r30) pct = 30;
        else if (r60) pct = 60;

        return { pct, r60, r30, r0 };
    }

    async _tickPvEvu(nowMs, cfg) {
        const enabled = !!cfg.pvEvuEnabled;
        const inv = this._normalizeInvList(cfg.pvCurtailInvertersEvu);

        if (!enabled || inv.length === 0) {
            // keep states meaningful
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuStagePct', 100, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuRelays', enabled ? 'no_wr' : 'disabled', true);
            return { enabled: false, stagePct: 100 };
        }

        const mapping = this._pvMappingStatus(cfg, 'evu');
        if (!mapping.valid) {
            await this._stopInvalidPvMappings(mapping);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuStagePct', 0, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuRelays', `invalid_mapping: ${mapping.issues.join(' | ')}`, true);
            return { enabled: true, stagePct: 0, action: 'invalid_mapping', issues: mapping.issues };
        }

        const s = this._getEvuStagePct(cfg);
        const stagePct = Math.max(0, Math.min(100, Math.round(Number(s.pct))));
        const relaysStr = `${s.r60 ? 1 : 0}/${s.r30 ? 1 : 0}/${s.r0 ? 1 : 0}`;

        await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuStagePct', stagePct, true);
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.evuRelays', relaysStr, true);

        // Write per WR (all available setpoints)
        for (const it of inv) {
            const ratedW = Math.max(0, Number(it.ratedW) || 0);
            const limitW = Math.round(ratedW * stagePct / 100);
            await this._writeValidatedPvLimit(`pv.evu.${it.idx}.feedInLimitW`, limitW, cfg);
            await this._writeValidatedPvLimit(`pv.evu.${it.idx}.limitW`, limitW, cfg);
            await this._writeValidatedPvLimit(`pv.evu.${it.idx}.limitPct`, stagePct, cfg);
        }

        this._pvEvu.lastStagePct = stagePct;
        return { enabled: true, stagePct };
    }

    _getCurrentPvPowerW(cfg) {
        const staleMs = Math.max(1000, Math.round(this._num(cfg && cfg.pvActualStaleSec, 30) * 1000));
        const dp = this.dp;
        if (dp) {
            for (const key of ['ps.pvW', 'ps.pvPowerW', 'cm.pvPowerW', 'pv.powerW']) {
                try {
                    const value = dp.getNumberFresh(key, staleMs, null);
                    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                        return { usable: true, valueW: value, source: key };
                    }
                } catch (_e) {}
            }
        }

        const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : {};
        for (const key of ['ems.budget.pvPowerW', 'derived.core.pv.totalW', 'pvPower', 'productionTotal']) {
            const rec = cache && cache[key];
            if (!rec || typeof rec !== 'object') continue;
            const raw = Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec.val;
            const value = Number(raw);
            const ts = Number(rec.ts || rec.lc || 0);
            const fresh = !(ts > 0) || Date.now() - ts <= staleMs;
            if (fresh && Number.isFinite(value) && value >= 0) {
                return { usable: true, valueW: value, source: key };
            }
        }
        return { usable: false, valueW: null, source: '' };
    }

    async _publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, ratedW, nextW = null) {
        const ff = feedForward && typeof feedForward === 'object' ? feedForward : {};
        const storageActualW = Number.isFinite(Number(control && control.storageActualW)) ? Number(control.storageActualW) : 0;
        const storageTargetW = Number.isFinite(Number(control && control.storageTargetW)) ? Number(control.storageTargetW) : 0;
        const pvActualW = pvActual && pvActual.usable && Number.isFinite(Number(pvActual.valueW)) ? Number(pvActual.valueW) : 0;
        const targetW = Number.isFinite(Number(ff.targetW)) ? Number(ff.targetW) : 0;
        const appliedTargetW = Number.isFinite(Number(nextW)) ? Number(nextW) : targetW;
        await this.adapter.setStateAsync('gridConstraints.zeroExport.pvActualW', Math.round(pvActualW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.localAbsorptionW', Math.round(Number(ff.localAbsorptionW) || 0), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.pvFeedForwardTargetW', Math.round(targetW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.pvFeedbackCorrectionW', Math.round(Number(ff.feedbackCorrectionW) || 0), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.storageActualW', Math.round(storageActualW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.storageTargetW', Math.round(storageTargetW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.storageDischargeConflict', ff.storageDischargeConflict === true, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.estimatedCurtailmentW', Math.round(Math.max(0, Number(ratedW || 0) - appliedTargetW)), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.pvSetpointReason', String(ff.reason || ''), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.pvActualSource', String(pvActual && pvActual.source || ''), true);
    }

    async _tickZeroExportGroup(nowMs, gridW, cfg, gridStale, control = {}) {
        const enabled = !!cfg.zeroExportEnabled;
        const approved = this._isExportLimitInstallerApproved(cfg);
        const inv = this._normalizeInvList(cfg.pvCurtailInvertersZero);
        const rawGridW = Number.isFinite(Number(control && control.rawGridW))
            ? Number(control.rawGridW)
            : Number(gridW || 0);
        const controlGridW = Number.isFinite(Number(control && control.controlGridW))
            ? Number(control.controlGridW)
            : Number(gridW || 0);

        const tariffGridImportPreferred = await this._isTariffGridImportPreferred();
        const { maxFeedInPowerW, biasW, deadbandW, targetGridW } = this._buildExportLimitTarget(cfg, tariffGridImportPreferred);
        const modeLabel = maxFeedInPowerW > 0 ? `max_export_${maxFeedInPowerW}W` : 'zero_export';

        await this.adapter.setStateAsync('gridConstraints.zeroExport.enabled', enabled, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.installerApproved', !!approved, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.maxFeedInPowerW', Math.round(maxFeedInPowerW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.targetGridW', Math.round(targetGridW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.modeLabel', modeLabel, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.targetImportBiasW', Math.round(biasW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.deadbandW', Math.round(deadbandW), true);

        const exportW = Math.max(0, -rawGridW);
        const controlExportW = Math.max(0, -controlGridW);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.exportW', Math.round(exportW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.controlGridW', Math.round(controlGridW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.controlExportW', Math.round(controlExportW), true);

        // Mark mode to make it obvious in status/debug
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.mode', 'group', true);

        if (!enabled) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'off', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: false, biasW, deadbandW, exportW, maxFeedInPowerW, targetGridW };
        }

        if (!approved) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'awaiting_installer_approval', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: false, biasW, deadbandW, exportW, maxFeedInPowerW, targetGridW };
        }

        if (inv.length === 0) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'no_wr', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: true, biasW, deadbandW, exportW };
        }

        const mapping = this._pvMappingStatus(cfg, 'zero');
        if (!mapping.valid) {
            const applied = await this._stopInvalidPvMappings(mapping);
            this._pv.limitW = 0;
            this._pv.limitPct = 0;
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'invalid_mapping', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', applied, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', 0, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
            return { enabled: true, biasW, deadbandW, exportW, action: 'invalid_mapping', applied, issues: mapping.issues };
        }

        // If we cannot measure grid power reliably, go failsafe (cut PV / export)
        if (gridStale) {
            let applied = false;
            for (const it of inv) {
                const ok1 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.feedInLimitW`, 0, cfg);
                const ok2 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.limitW`, 0, cfg);
                const ok3 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.limitPct`, 0, cfg);
                applied = applied || (ok1 === true || ok1 === null) || (ok2 === true || ok2 === null) || (ok3 === true || ok3 === null);
            }
            this._pv.limitW = 0;
            this._pv.limitPct = 0;
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'failsafe_stale', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', applied, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', 0, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
            return { enabled: true, biasW, deadbandW, exportW };
        }

        const ratedSumW = this._sumRatedW(inv);
        if (!(ratedSumW > 0)) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'missing_rated', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: true, biasW, deadbandW, exportW };
        }

        // RC79: Feed-forward nach lokaler Aufnahme. `controlGridW` enthaelt
        // bereits die akzeptierte Speicherladung und flexible Lasten. Damit folgt
        // die PV-Vorgabe dem realen Verbrauch plus Speicheraufnahme; nur der nicht
        // nutzbare Rest wird am WR abgeregelt.
        const errorW = targetGridW - controlGridW; // positiv => verbleibende Einspeisung oberhalb des Limits
        const pvActual = this._getCurrentPvPowerW(cfg);
        if (typeof this._pv.limitW !== 'number' || !Number.isFinite(this._pv.limitW) || this._pv.limitW > ratedSumW) {
            this._pv.limitW = ratedSumW;
        }
        const feedForward = resolveZeroExportPvTarget({
            ratedPvW: ratedSumW,
            pvActualW: pvActual.valueW,
            projectedNvpW: controlGridW,
            targetNvpW: targetGridW,
            storageActualW: control && control.storageActualW,
            storageTargetW: control && control.storageTargetW,
            storageDischargeDeadbandW: cfg.zeroExportStorageDischargeDeadbandW,
            currentLimitW: this._pv.limitW,
        });

        if (Math.abs(errorW) <= deadbandW && feedForward.storageDischargeConflict !== true) {
            // Auch nach Neustart/Änderung muss ein explizites Einspeiselimit
            // ankommen, wenn der NVP bereits im Totband liegt. Nur den statischen
            // Exportdeckel schreiben; keine spekulative PV-Erzeugung freigeben.
            let feedInApplied = false;
            for (const it of inv) {
                if (!String(cfg.pvCurtailInvertersZero[it.idx]?.feedInLimitWId || '').trim()) continue;
                const shareW = Math.round(maxFeedInPowerW * it.ratedW / ratedSumW);
                const ok = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.feedInLimitW`, shareW, cfg);
                feedInApplied = feedInApplied || ok === true || ok === null;
            }
            await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, ratedSumW, this._pv.limitW);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'within_deadband', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', feedInApplied, true);
            return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action: 'within_deadband', applied: feedInApplied, setpointW: this._pv.limitW, setpointPct: this._pv.limitPct, mode: 'group', feedForward };
        }

        const fastTripW = Math.max(0, this._num(cfg.pvCurtailFastTripExportW, 500));
        const hardRawGuardW = Math.max(0, this._num(control && control.hardRawGuardW, this._num(cfg.nvpCoordinatorHardRawExportW, 0)));
        const fastTrip = (fastTripW > 0 && controlExportW >= fastTripW)
            || (hardRawGuardW > 0 && exportW >= hardRawGuardW);

        const maxDeltaW = Math.max(0, this._num(cfg.pvCurtailMaxDeltaWPerTick, 8000));
        const prev = this._pv.limitW;
        const releaseForStorageDischarge = feedForward.storageDischargeConflict === true;
        const feedForwardTargetW = feedForward.usable && Number.isFinite(Number(feedForward.targetW))
            ? this._clamp(Number(feedForward.targetW), 0, ratedSumW)
            : null;
        const fallbackTargetW = this._clamp(prev - errorW, 0, ratedSumW);
        // Import bzw. steigender lokaler Verbrauch gibt nur genau die zusaetzlich
        // benoetigte PV-Leistung frei. Eine pauschale Freigabe auf 100 % wuerde bei
        // langsamer Verbraucher-/Speicherreaktion sofort wieder Einspeisung erzeugen.
        // Nur ein gleichzeitiges Speicher-Entladen waehrend PV abgeregelt ist loest
        // die Abregelung vollstaendig und unverzueglich auf.
        const rawNext = releaseForStorageDischarge
            ? ratedSumW
            : (feedForwardTargetW !== null ? feedForwardTargetW : fallbackTargetW);
        const fastRelease = rawNext > prev;

        let next = rawNext;
        const effMaxDelta = (fastTrip || fastRelease || releaseForStorageDischarge)
            ? Math.max(maxDeltaW, Math.abs(prev - rawNext))
            : maxDeltaW;
        if (effMaxDelta > 0) {
            const d = rawNext - prev;
            if (Math.abs(d) > effMaxDelta) next = prev + Math.sign(d) * effMaxDelta;
        }

        next = this._clamp(next, 0, ratedSumW);
        this._pv.limitW = next;

        const pct = this._clamp((next / ratedSumW) * 100, 0, 100);
        this._pv.limitPct = pct;

        // Write per WR
        let applied = false;
        for (const it of inv) {
            const ratedW = Math.max(0, Number(it.ratedW) || 0);
            const invLimitW = ratedSumW > 0 ? Math.round(next * (ratedW / ratedSumW)) : 0;
            // Herstellerneutral: Wenn ein WR ein explizites Einspeise-Limit unterstützt, bekommt er
            // seinen Anteil der installateurseitig erlaubten Gesamteinspeisung. Bei maxFeedInPowerW=0
            // bleibt das die klassische Nulleinspeisung.
            const invFeedInLimitW = ratedSumW > 0 ? Math.round(maxFeedInPowerW * (ratedW / ratedSumW)) : 0;
            const ok1 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.feedInLimitW`, invFeedInLimitW, cfg);
            const ok2 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.limitW`, invLimitW, cfg);
            const ok3 = await this._writeValidatedPvLimit(`pv.zero.${it.idx}.limitPct`, pct, cfg);
            applied = applied || (ok1 === true || ok1 === null) || (ok2 === true || ok2 === null) || (ok3 === true || ok3 === null);
        }

        const action = releaseForStorageDischarge
            ? 'group_release_storage_discharge'
            : (tariffGridImportPreferred
                ? ((fastTrip || fastRelease) ? 'tariff_negative_group_feedforward_fast' : 'tariff_negative_group_feedforward')
                : ((fastTrip || fastRelease) ? 'group_feedforward_fast' : 'group_feedforward'));
        await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, ratedSumW, next);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.action', action, true);
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', applied, true);
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', Math.round(next), true);
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', Math.round(pct * 10) / 10, true);

        return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action, applied, setpointW: Math.round(next), setpointPct: Math.round(pct * 10) / 10, mode: 'group', feedForward };
    }

    _isStaleGrid(cfg) {
        const staleTimeoutSec = this._num(cfg.staleTimeoutSec, 15);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const central = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, Date.now(), Math.max(staleMs, 10000));
        if (central.current) return !central.usable;

        const dp = this.dp;
        if (!dp) return true;

        // RC81: Nur der zentral zugeordnete und gefilterte NVP ist autoritativ.
        return !!dp.isStale('grid.powerW', staleMs);
    }

    _getGridW(cfg) {
        const staleTimeoutSec = this._num(cfg.staleTimeoutSec, 15);
        const staleMs = Math.max(1, Math.round(staleTimeoutSec * 1000));

        const central = resolveCurrentNvpSnapshot(this.adapter && this.adapter._nvpFreshnessSnapshot, Date.now(), Math.max(staleMs, 10000));
        if (central.current) return central.usable ? central.netW : null;

        const dp = this.dp;
        if (!dp) return null;

        // RC81: Der gefilterte globale NVP aus Zuordnung → Allgemein ist die
        // einzige Messquelle. Verdeckte Modul-/Peak-Shaving-Fallbacks sind nicht
        // zulässig, weil sie Vorzeichen- und Stale-Verträge umgehen könnten.
        const gridW = dp.getNumberFresh('grid.powerW', staleMs, null);
        return (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null;
    }

    async _tickRlm(nowMs, gridW, cfg) {
        const enabled = !!cfg.rlmEnabled;
        const aligned = cfg.rlmAligned !== false;
        const safetyMarginW = Math.max(0, this._num(cfg.rlmSafetyMarginW, 0));
        const limitWraw = this._num(cfg.rlmLimitW, 0);
        const limitW = Math.max(0, limitWraw - safetyMarginW);

        // Update states for visibility (even if disabled)
        await this.adapter.setStateAsync('gridConstraints.rlm.enabled', enabled, true);
        await this.adapter.setStateAsync('gridConstraints.rlm.limitW', Math.round(limitWraw), true);
        await this.adapter.setStateAsync('gridConstraints.rlm.safetyMarginW', Math.round(safetyMarginW), true);

        if (!enabled || !Number.isFinite(limitW) || limitW <= 0) {
            await this.adapter.setStateAsync('gridConstraints.rlm.capNowW', 0, true);
            return { enabled: false, capNowW: null, avgW: null, limitW: null };
        }

        const intervalMs = this._rlm.intervalMs;

        const intervalStartMs = aligned ? (Math.floor(nowMs / intervalMs) * intervalMs) : (this._rlm.intervalStartMs || nowMs);
        if (!this._rlm.intervalStartMs || intervalStartMs !== this._rlm.intervalStartMs) {
            // New interval
            this._rlm.intervalStartMs = intervalStartMs;
            this._rlm.importedWs = 0;
            this._rlm.lastUpdateMs = nowMs;
        }

        // dt
        let dtSec = (nowMs - (this._rlm.lastUpdateMs || nowMs)) / 1000;
        if (!Number.isFinite(dtSec) || dtSec < 0) dtSec = 0;
        // clamp dt to avoid huge catch-ups after pauses/restarts
        dtSec = Math.min(dtSec, 10);

        this._rlm.lastUpdateMs = nowMs;

        const importW = Math.max(0, Number(gridW) || 0);
        this._rlm.importedWs += importW * dtSec;

        const elapsedSec = Math.max(0, (nowMs - this._rlm.intervalStartMs) / 1000);
        const remainingSec = Math.max(1, (intervalMs / 1000) - elapsedSec);

        const allowWs = limitW * (intervalMs / 1000);
        const remWs = allowWs - this._rlm.importedWs;

        let capNowW = remWs / remainingSec;
        if (!Number.isFinite(capNowW)) capNowW = 0;
        capNowW = this._clamp(capNowW, 0, limitW);

        const avgW = (elapsedSec > 0) ? (this._rlm.importedWs / elapsedSec) : 0;

        await this.adapter.setStateAsync('gridConstraints.rlm.intervalStart', this._rlm.intervalStartMs, true);
        await this.adapter.setStateAsync('gridConstraints.rlm.elapsedSec', Math.round(elapsedSec), true);
        await this.adapter.setStateAsync('gridConstraints.rlm.remainingSec', Math.round(remainingSec), true);
        await this.adapter.setStateAsync('gridConstraints.rlm.importedWs', Math.round(this._rlm.importedWs), true);
        await this.adapter.setStateAsync('gridConstraints.rlm.avgW', Math.round(avgW), true);
        await this.adapter.setStateAsync('gridConstraints.rlm.capNowW', Math.round(capNowW), true);

        return { enabled: true, capNowW, avgW, limitW };
    }

    async _tickZeroExport(nowMs, gridW, cfg, gridStale, control = {}) {
        const enabled = !!cfg.zeroExportEnabled;
        const approved = this._isExportLimitInstallerApproved(cfg);
        const rawGridW = Number.isFinite(Number(control && control.rawGridW))
            ? Number(control.rawGridW)
            : Number(gridW || 0);
        const controlGridW = Number.isFinite(Number(control && control.controlGridW))
            ? Number(control.controlGridW)
            : Number(gridW || 0);

        const tariffGridImportPreferred = await this._isTariffGridImportPreferred();
        const { maxFeedInPowerW, biasW, deadbandW, targetGridW } = this._buildExportLimitTarget(cfg, tariffGridImportPreferred);
        const modeLabel = maxFeedInPowerW > 0 ? `max_export_${maxFeedInPowerW}W` : 'zero_export';

        await this.adapter.setStateAsync('gridConstraints.zeroExport.enabled', enabled, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.installerApproved', !!approved, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.maxFeedInPowerW', Math.round(maxFeedInPowerW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.targetGridW', Math.round(targetGridW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.modeLabel', modeLabel, true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.targetImportBiasW', Math.round(biasW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.deadbandW', Math.round(deadbandW), true);

        const exportW = Math.max(0, -rawGridW);
        const controlExportW = Math.max(0, -controlGridW);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.exportW', Math.round(exportW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.controlGridW', Math.round(controlGridW), true);
        await this.adapter.setStateAsync('gridConstraints.zeroExport.controlExportW', Math.round(controlExportW), true);

        if (!enabled) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'off', true);
            return { enabled: false, biasW, deadbandW, exportW, maxFeedInPowerW, targetGridW };
        }

        if (!approved) {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'awaiting_installer_approval', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: false, biasW, deadbandW, exportW, maxFeedInPowerW, targetGridW };
        }

        // Determine curtail mode
        const modeResolved = this._resolveCurtailMode(cfg);
        this._pv.lastMode = modeResolved;
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.mode', modeResolved, true);

        const mapping = this._pvMappingStatus(cfg, 'zero');
        if (!mapping.valid) {
            const applied = await this._stopInvalidPvMappings(mapping);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'invalid_mapping', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', applied, true);
            return { enabled: true, biasW, deadbandW, exportW, action: 'invalid_mapping', applied, issues: mapping.issues };
        }

        // If we cannot measure grid power reliably, go failsafe (if possible)
        if (gridStale) {
            const ok = await this._applyCurtailFailsafe(cfg, modeResolved);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'failsafe_stale', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', !!ok, true);
            return { enabled: true, biasW, deadbandW, exportW };
        }

        // Nothing to do if we have no control channel
        if (modeResolved === 'off') {
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'no_control', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            return { enabled: true, biasW, deadbandW, exportW };
        }

        // feed-in limit: best for "hard 0 export"
        if (modeResolved === 'feedInLimitW') {
            // Einspeise-Limit-Datenpunkte bekommen die vom Installateur erlaubte Exportleistung.
            // 0 W entspricht Nulleinspeisung; Werte >0 erlauben kontrollierte Maximal-Einspeisung.
            const ok = await this._writeValidatedPvLimit('pv.feedInLimitW', maxFeedInPowerW, cfg);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', `feedInLimitW=${Math.round(maxFeedInPowerW)}`, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', ok === true || ok === null, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', Math.round(maxFeedInPowerW), true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
            return { enabled: true, biasW, deadbandW, exportW, maxFeedInPowerW, targetGridW };
        }

        // Dynamische PV-Leistungsgrenze: Feed-forward aus realer lokaler Aufnahme
        // plus NVP-Fehler. Speicherladung und bereits akzeptierte flexible Lasten
        // sind im koordinierten `controlGridW` enthalten. Dadurch wird zuerst lokal
        // verbraucht/gespeichert und nur der verbleibende Ueberschuss abgeregelt.
        const errorW = targetGridW - controlGridW; // positiv => verbleibende Einspeisung oberhalb des Installateur-Limits
        const pvActual = this._getCurrentPvPowerW(cfg);
        const fastTripW = Math.max(0, this._num(cfg.pvCurtailFastTripExportW, 500));
        const hardRawGuardW = Math.max(0, this._num(control && control.hardRawGuardW, this._num(cfg.nvpCoordinatorHardRawExportW, 0)));
        const fastTrip = (fastTripW > 0 && controlExportW >= fastTripW)
            || (hardRawGuardW > 0 && exportW >= hardRawGuardW);

        if (modeResolved === 'pvLimitW') {
            const maxDeltaW = Math.max(0, this._num(cfg.pvCurtailMaxDeltaWPerTick, 8000));
            const ratedW = this._getRatedPvW(cfg);
            // Legacy-Fallback fuer Anlagen ohne hinterlegte WR-Nennleistung. Der
            // reale Feed-forward-Zielwert bleibt trotzdem endlich; nur die volle
            // Freigabe bei Speicher-Entladung nutzt den bisherigen hohen Maximalwert.
            const maxW = (ratedW > 0) ? ratedW : 1_000_000;

            if (typeof this._pv.limitW !== 'number' || !Number.isFinite(this._pv.limitW)) {
                const mappedLimitW = this.dp ? this.dp.getNumber('pv.limitW', null) : null;
                this._pv.limitW = mappedLimitW !== null && mappedLimitW !== undefined && Number.isFinite(Number(mappedLimitW))
                    ? this._clamp(Number(mappedLimitW), 0, maxW)
                    : ((ratedW > 0) ? ratedW : maxW);
            }

            const prev = this._clamp(this._pv.limitW, 0, maxW);
            const feedForward = resolveZeroExportPvTarget({
                ratedPvW: ratedW,
                pvActualW: pvActual.valueW,
                projectedNvpW: controlGridW,
                targetNvpW: targetGridW,
                storageActualW: control && control.storageActualW,
                storageTargetW: control && control.storageTargetW,
                storageDischargeDeadbandW: cfg.zeroExportStorageDischargeDeadbandW,
                currentLimitW: prev,
            });
            // Ohne bekannte Nennleistung kann der reine Helfer keine vollstaendige
            // Freigabe ableiten. Der Grundsatz bleibt trotzdem: PV niemals kuenstlich
            // begrenzen, waehrend der Speicher gleichzeitig entlaedt.
            const releaseForStorageDischarge = feedForward.storageDischargeConflict === true
                || (feedForward.storageDischarging === true && prev < maxW - 1);

            if (Math.abs(errorW) <= deadbandW && !releaseForStorageDischarge) {
                const diagnosticRatedW = ratedW > 0 ? ratedW : Math.max(0, Number(pvActual.valueW) || 0, prev);
                await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, diagnosticRatedW, prev);
                await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'within_deadband', true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
                return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action: 'within_deadband', applied: false, setpointW: prev, setpointPct: 0, mode: modeResolved, feedForward };
            }

            const feedForwardTargetW = feedForward.usable && Number.isFinite(Number(feedForward.targetW))
                ? this._clamp(Number(feedForward.targetW), 0, maxW)
                : null;
            const fallbackTargetW = this._clamp(prev - errorW, 0, maxW);
            const rawNext = releaseForStorageDischarge
                ? maxW
                : (feedForwardTargetW !== null ? feedForwardTargetW : fallbackTargetW);
            const fastRelease = rawNext > prev;

            let next = rawNext;
            const effMaxDelta = (fastTrip || fastRelease || releaseForStorageDischarge)
                ? Math.max(maxDeltaW, Math.abs(prev - rawNext))
                : maxDeltaW;
            if (effMaxDelta > 0) {
                const d = rawNext - prev;
                if (Math.abs(d) > effMaxDelta) next = prev + Math.sign(d) * effMaxDelta;
            }

            next = this._clamp(next, 0, maxW);
            this._pv.limitW = next;

            const ok = await this._writeValidatedPvLimit('pv.limitW', next, cfg);
            const action = releaseForStorageDischarge
                ? 'pvLimitW_release_storage_discharge'
                : (tariffGridImportPreferred
                    ? ((fastTrip || fastRelease) ? 'tariff_negative_pvLimitW_feedforward_fast' : 'tariff_negative_pvLimitW_feedforward')
                    : ((fastTrip || fastRelease) ? 'pvLimitW_feedforward_fast' : 'pvLimitW_feedforward'));
            const diagnosticRatedW = ratedW > 0 ? ratedW : Math.max(0, Number(pvActual.valueW) || 0, next);
            await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, diagnosticRatedW, next);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', action, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', ok === true || ok === null, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', Math.round(next), true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', ratedW > 0 ? Math.round((next / ratedW) * 1000) / 10 : 0, true);

            return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action, applied: ok === true || ok === null, setpointW: Math.round(next), setpointPct: ratedW > 0 ? Math.round((next / ratedW) * 1000) / 10 : 0, mode: modeResolved, feedForward };
        }

        if (modeResolved === 'pvLimitPct') {
            const ratedW = this._getRatedPvW(cfg);
            if (!(ratedW > 0)) {
                await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'pvLimitPct_missing_rated', true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
                return { enabled: true, biasW, deadbandW, exportW };
            }

            const maxDeltaPct = Math.max(0, this._num(cfg.pvCurtailMaxDeltaPctPerTick, 10));
            if (typeof this._pv.limitPct !== 'number' || !Number.isFinite(this._pv.limitPct)) {
                const mappedLimitPct = this.dp ? this.dp.getNumber('pv.limitPct', null) : null;
                this._pv.limitPct = mappedLimitPct !== null && mappedLimitPct !== undefined && Number.isFinite(Number(mappedLimitPct))
                    ? this._clamp(Number(mappedLimitPct), 0, 100)
                    : 100;
            }

            const prev = this._clamp(this._pv.limitPct, 0, 100);
            const currentLimitW = ratedW * prev / 100;
            const feedForward = resolveZeroExportPvTarget({
                ratedPvW: ratedW,
                pvActualW: pvActual.valueW,
                projectedNvpW: controlGridW,
                targetNvpW: targetGridW,
                storageActualW: control && control.storageActualW,
                storageTargetW: control && control.storageTargetW,
                storageDischargeDeadbandW: cfg.zeroExportStorageDischargeDeadbandW,
                currentLimitW,
            });
            const releaseForStorageDischarge = feedForward.storageDischargeConflict === true;

            if (Math.abs(errorW) <= deadbandW && !releaseForStorageDischarge) {
                await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, ratedW, currentLimitW);
                await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'within_deadband', true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
                return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action: 'within_deadband', applied: false, setpointW: Math.round(currentLimitW), setpointPct: prev, mode: modeResolved, feedForward };
            }

            const feedForwardTargetPct = feedForward.usable && Number.isFinite(Number(feedForward.targetW))
                ? this._clamp((Number(feedForward.targetW) / ratedW) * 100, 0, 100)
                : null;
            const deltaPct = (errorW / ratedW) * 100;
            const fallbackTargetPct = this._clamp(prev - deltaPct, 0, 100);
            const rawNext = releaseForStorageDischarge
                ? 100
                : (feedForwardTargetPct !== null ? feedForwardTargetPct : fallbackTargetPct);
            const fastRelease = rawNext > prev;

            let next = rawNext;
            const effMaxDeltaPct = (fastTrip || fastRelease || releaseForStorageDischarge)
                ? Math.max(maxDeltaPct, Math.abs(prev - rawNext))
                : maxDeltaPct;
            if (effMaxDeltaPct > 0) {
                const d = rawNext - prev;
                if (Math.abs(d) > effMaxDeltaPct) next = prev + Math.sign(d) * effMaxDeltaPct;
            }

            next = this._clamp(next, 0, 100);
            this._pv.limitPct = next;
            const nextW = ratedW * next / 100;

            const ok = await this._writeValidatedPvLimit('pv.limitPct', next, cfg);
            const action = releaseForStorageDischarge
                ? 'pvLimitPct_release_storage_discharge'
                : (tariffGridImportPreferred
                    ? ((fastTrip || fastRelease) ? 'tariff_negative_pvLimitPct_feedforward_fast' : 'tariff_negative_pvLimitPct_feedforward')
                    : ((fastTrip || fastRelease) ? 'pvLimitPct_feedforward_fast' : 'pvLimitPct_feedforward'));
            await this._publishZeroExportFeedForwardDiagnostics(feedForward, pvActual, control, ratedW, nextW);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', action, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', ok === true || ok === null, true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', Math.round(nextW), true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', Math.round(next * 10) / 10, true);

            return { enabled: true, biasW, deadbandW, exportW, controlExportW, rawGridW, controlGridW, errorW, action, applied: ok === true || ok === null, setpointW: Math.round(nextW), setpointPct: Math.round(next * 10) / 10, mode: modeResolved, feedForward };
        }

        await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'unknown_mode', true);
        await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
        return { enabled: true, biasW, deadbandW, exportW };
    }


    /**
     * Code-Teil: _exportWriteDiagnostics
     * Zweck: Prüft herstellerneutral, ob die gewählte WR-/PV-Brücke überhaupt schreiben kann.
     * Zusammenhang: Die Diagnose ist absichtlich read-only. Sie nutzt dieselben Mapping-Informationen
     * wie die bestehende PV-Curtail-Logik und erzeugt keinen zweiten Regelpfad.
     */
    /**
     * Code-Teil: _zeroExportSinkPriorityPlan
     * Zweck: Definiert die fachlich richtige Reihenfolge für echte 0‑Einspeise-Anlagen.
     * Wichtig: Verbrauch kommt immer zuerst, weil echter Haus-/Anlagenverbrauch bereits am
     * Netzanschlusspunkt wirkt und nicht „geschaltet“ werden muss. Danach werden steuerbare
     * Senken vorbereitet: Speicher laden, Ladepunkte, flexible Verbraucher, Mesh/Microgrid.
     * Erst danach darf WR-/PV-Abregelung die Restleistung begrenzen. So bauen wir keine zweite
     * Einspeiseregelung, sondern ergänzen den bestehenden Export Guard um eine klare Field-Order.
     */
    _zeroExportSinkRuntimeFor(id) {
        if (!this._zeroExportSinkRuntime || typeof this._zeroExportSinkRuntime !== 'object') this._zeroExportSinkRuntime = {};
        if (!this._zeroExportSinkRuntime[id]) this._zeroExportSinkRuntime[id] = { usable: true, lastAck: 'unknown', blockedUntil: 0, lastWriteTest: 'not_per_tick', lastReason: '' };
        return this._zeroExportSinkRuntime[id];
    }

    _zeroExportSinkConfig(cfg) {
        const s = cfg || {};
        const commonTimeout = Math.max(5, Math.min(3600, Math.round(Number(s.zeroExportSinkAckTimeoutSec || s.zeroExportAckTimeoutSec || 60) || 60)));
        const blockSec = Math.max(5, Math.min(3600, Math.round(Number(s.zeroExportSinkBlockSec || s.zeroExportBlockSec || 120) || 120)));
        const commonAckRequired = s.zeroExportSinkAckRequired === true || s.zeroExportAckRequired === true;
        const make = (id, commandStateId, ackStateId, ackRequired) => ({
            id,
            commandStateId: String(commandStateId || '').trim(),
            ackStateId: String(ackStateId || '').trim(),
            ackRequired: ackRequired === true || commonAckRequired,
            ackTimeoutSec: commonTimeout,
            blockSec,
        });
        return {
            storageCharge: make('storageCharge', s.zeroExportStorageChargeCommandStateId || s.storageChargeCommandStateId, s.zeroExportStorageAckStateId || s.storageAckStateId || s.storageChargeAckStateId, s.zeroExportStorageAckRequired),
            chargingStations: make('chargingStations', s.zeroExportChargingCommandStateId || s.chargingCommandStateId, s.zeroExportChargingAckStateId || s.chargingAckStateId || s.evcsAckStateId, s.zeroExportChargingAckRequired),
            flexLoads: make('flexLoads', s.zeroExportFlexLoadCommandStateId || s.flexLoadCommandStateId, s.zeroExportFlexLoadAckStateId || s.flexLoadAckStateId || s.heatingRodAckStateId, s.zeroExportFlexLoadAckRequired),
            meshMicrogrid: make('meshMicrogrid', s.zeroExportMeshCommandStateId || s.meshMicrogridCommandStateId, s.zeroExportMeshAckStateId || s.meshMicrogridAckStateId, s.zeroExportMeshAckRequired),
            inverterCurtailment: make('inverterCurtailment', '', s.zeroExportInverterAckStateId || s.inverterAckStateId || s.pvCurtailAckStateId, s.zeroExportInverterAckRequired),
        };
    }

    _classifyZeroExportSinkAck(raw) {
        const txt = String(raw == null ? '' : raw).toLowerCase();
        if (!txt) return { status: 'unknown', ok: false, usable: true, severity: 'warn', reason: 'Kein ACK-Wert vorhanden.' };
        if (/(ok|accepted|success|succeeded|executed|done|completed|true|ack)/.test(txt)) return { status: 'ok', ok: true, usable: true, severity: 'info', reason: 'ACK OK.' };
        if (/(pending|queued|running|processing|waiting)/.test(txt)) return { status: 'pending', ok: false, usable: false, severity: 'warn', reason: 'ACK wartet; Folge-Commands werden bis zum ACK zurückgehalten.' };
        if (/(error|fail|failed|rejected|blocked|timeout|offline|false)/.test(txt)) return { status: 'error', ok: false, usable: false, severity: 'critical', reason: 'ACK meldet Fehler oder Blockierung.' };
        return { status: 'unknown', ok: false, usable: true, severity: 'warn', reason: 'ACK-Wert unbekannt; Senke bleibt nur diagnostisch freigegeben.' };
    }

    async _readZeroExportAckState(id) {
        const stateId = String(id || '').trim();
        if (!stateId || !this.adapter) return null;
        try {
            if (typeof this.adapter.getForeignStateAsync === 'function') return await this.adapter.getForeignStateAsync(stateId);
            if (typeof this.adapter.getStateAsync === 'function') return await this.adapter.getStateAsync(stateId);
        } catch (_e) {}
        return null;
    }


    _rememberZeroExportSinkAck(sink, row, maxRows = 20) {
        const id = String(sink || '').trim();
        if (!id) return [];
        if (!this._zeroExportSinkAckHistory || typeof this._zeroExportSinkAckHistory !== 'object') this._zeroExportSinkAckHistory = {};
        if (!Array.isArray(this._zeroExportSinkAckHistory[id])) this._zeroExportSinkAckHistory[id] = [];
        const list = this._zeroExportSinkAckHistory[id];
        const hash = `${row && row.status}|${row && row.reason}|${row && row.ackStateId}|${row && row.lastWriteTs}|${row && row.ackTs}|${row && row.event}`;
        const last = list.length ? list[list.length - 1] : null;
        if (last && last._hash === hash && Date.now() - Number(last.ts || 0) < 10_000) return list;
        list.push({ ...(row || {}), _hash: hash, directHardwareWrite: false, neutralCommandOnly: true });
        this._zeroExportSinkAckHistory[id] = list.slice(-Math.max(1, Math.min(100, Number(maxRows) || 20)));
        return this._zeroExportSinkAckHistory[id];
    }

    /**
     * Code-Teil: _updateZeroExportSinkAcks
     * Zweck: Hält den ACK-Verlauf je 0-Einspeise-Senke aktuell.
     * Wichtig: Kein Schreibtest pro Tick. Diese Funktion liest nur ACK-/Status-States,
     * führt kurze Historien und blockiert nur die betroffene Senke bei Timeout/Fehler.
     */
    async _updateZeroExportSinkAcks(cfg, sinkPriority) {
        const now = Date.now();
        const sinkCfg = this._zeroExportSinkConfig(cfg || {});
        const steps = Array.isArray(sinkPriority && sinkPriority.steps) ? sinkPriority.steps : [];
        const ids = ['storageCharge', 'chargingStations', 'flexLoads', 'meshMicrogrid', 'inverterCurtailment'];
        const rows = [];
        for (const id of ids) {
            const step = steps.find(s => s && s.id === id) || {};
            const cfgRow = sinkCfg[id] || { id };
            const rt = this._zeroExportSinkRuntimeFor(id);
            const lastWriteTs = Number(rt.lastWriteTs || 0);
            let status = rt.lastAck || (cfgRow.ackRequired ? 'waiting' : 'not_required');
            let reason = rt.lastReason || '';
            let value = null;
            let ackTs = 0;
            let event = 'ack_read';
            if (cfgRow.ackStateId) {
                const st = await this._readZeroExportAckState(cfgRow.ackStateId);
                if (st) {
                    value = st.val;
                    ackTs = Number(st.ts || st.lc || 0) || now;
                    const cls = this._classifyZeroExportSinkAck(st.val);
                    status = cls.status;
                    reason = cls.reason;
                    if (lastWriteTs && ackTs < lastWriteTs && cfgRow.ackRequired && now - lastWriteTs > cfgRow.ackTimeoutSec * 1000) {
                        status = 'timeout';
                        reason = `ACK nicht innerhalb von ${cfgRow.ackTimeoutSec}s nach letztem Command aktualisiert.`;
                    }
                } else if (cfgRow.ackRequired && lastWriteTs && now - lastWriteTs > cfgRow.ackTimeoutSec * 1000) {
                    status = 'timeout';
                    reason = `ACK-State nicht lesbar oder nicht aktualisiert: ${cfgRow.ackStateId}`;
                } else if (cfgRow.ackRequired) {
                    status = 'pending';
                    reason = 'ACK erforderlich; Rückmeldung steht aus.';
                }
            } else if (cfgRow.ackRequired) {
                status = 'missing_ack_mapping';
                reason = 'ACK ist erforderlich, aber kein ACK-State ist konfiguriert.';
            }
            const critical = ['timeout', 'error', 'missing_ack_mapping', 'missing_ack_state'].includes(status);
            if (status === 'ok') {
                if (rt.blockedUntil && rt.blockedUntil > now) event = 'auto_release';
                rt.blockedUntil = 0;
                rt.usable = true;
                rt.autoReleaseCount = Number(rt.autoReleaseCount || 0) + (event === 'auto_release' ? 1 : 0);
            } else if (critical) {
                rt.usable = false;
                rt.blockedUntil = Math.max(Number(rt.blockedUntil || 0), now + cfgRow.blockSec * 1000);
            }
            rt.lastAck = status;
            rt.lastAckAt = ackTs || Number(rt.lastAckAt || 0);
            rt.lastReason = reason;
            if (status === 'ok') rt.ackOkCount = Number(rt.ackOkCount || 0) + 1;
            if (status === 'error' || status === 'missing_ack_mapping') rt.ackErrorCount = Number(rt.ackErrorCount || 0) + 1;
            if (status === 'timeout') rt.ackTimeoutCount = Number(rt.ackTimeoutCount || 0) + 1;
            const row = {
                schema: 'nexowatt.zero-export-sink-ack.v1', ts: now, sink: id, label: step.label || id,
                event, ackStateId: cfgRow.ackStateId || '', status, reason, value,
                lastWriteTs, ackTs: ackTs || 0, blockedUntil: Number(rt.blockedUntil || 0),
            };
            rows.push(row);
            this._rememberZeroExportSinkAck(id, row, 20);
        }
        return this._zeroExportSinkAckHistorySummary(rows);
    }

    _zeroExportSinkAckHistorySummary(rows = null) {
        const ids = ['storageCharge', 'chargingStations', 'flexLoads', 'meshMicrogrid', 'inverterCurtailment'];
        const history = this._zeroExportSinkAckHistory && typeof this._zeroExportSinkAckHistory === 'object' ? this._zeroExportSinkAckHistory : {};
        const perSink = ids.map((id) => {
            const list = Array.isArray(history[id]) ? history[id].map(e => ({ ...e, _hash: undefined })) : [];
            const rt = this._zeroExportSinkRuntimeFor(id);
            return { sink: id, history: list, last: list.length ? list[list.length - 1] : null, ackOkCount: Number(rt.ackOkCount || 0), ackErrorCount: Number(rt.ackErrorCount || 0), ackTimeoutCount: Number(rt.ackTimeoutCount || 0), autoReleaseCount: Number(rt.autoReleaseCount || 0) };
        });
        const all = perSink.flatMap(x => x.history || []).sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
        return {
            schema: 'nexowatt.zero-export-sink-ack-history.v1',
            ts: Date.now(),
            status: all.some(e => e && ['timeout','error','missing_ack_mapping'].includes(e.status)) ? 'warn' : 'ok',
            rows: Array.isArray(rows) ? rows : [],
            history: Object.fromEntries(perSink.map(x => [x.sink, x.history])),
            perSink,
            okCount: perSink.reduce((s,x)=>s+Number(x.ackOkCount||0),0),
            pendingCount: all.filter(e=>e && e.status==='pending').length,
            errorCount: perSink.reduce((s,x)=>s+Number(x.ackErrorCount||0),0),
            timeoutCount: perSink.reduce((s,x)=>s+Number(x.ackTimeoutCount||0),0),
            autoReleaseCount: perSink.reduce((s,x)=>s+Number(x.autoReleaseCount||0),0),
            lastEvent: all.length ? all[0] : null,
            note: 'ACK-Verlauf/Feldprotokoll je Senke. Kein Schreibtest pro Regel-Tick.',
        };
    }

    _rememberZeroExportSinkAck(id, row, maxRows = 20) {
        const sink = String(id || '').trim();
        if (!sink) return [];
        if (!this._zeroExportSinkAckHistory || typeof this._zeroExportSinkAckHistory !== 'object') this._zeroExportSinkAckHistory = {};
        const list = Array.isArray(this._zeroExportSinkAckHistory[sink]) ? this._zeroExportSinkAckHistory[sink] : [];
        list.push({ schema: 'nexowatt.zero-export-sink-ack-event.v1', ts: Date.now(), sink, ...(row || {}) });
        this._zeroExportSinkAckHistory[sink] = list.slice(-Math.max(1, Math.min(100, Number(maxRows) || 20)));
        return this._zeroExportSinkAckHistory[sink];
    }

    _zeroExportSinkAckSummary() {
        const history = this._zeroExportSinkAckHistory && typeof this._zeroExportSinkAckHistory === 'object' ? this._zeroExportSinkAckHistory : {};
        const rows = ['storageCharge', 'chargingStations', 'flexLoads', 'meshMicrogrid', 'inverterCurtailment'].map((sink) => {
            const list = Array.isArray(history[sink]) ? history[sink] : [];
            const last = list.length ? list[list.length - 1] : null;
            const okCount = list.filter(r => ['ok','written'].includes(String(r && (r.status || r.lastAck)))).length;
            const pendingCount = list.filter(r => /pending|waiting/i.test(String(r && (r.status || r.lastAck || '')))).length;
            const errorCount = list.filter(r => /error|failed|rejected|blocked/i.test(String(r && (r.status || r.lastAck || '')))).length;
            const timeoutCount = list.filter(r => /timeout|expired/i.test(String(r && (r.status || r.lastAck || '')))).length;
            return { sink, eventCount: list.length, okCount, pendingCount, errorCount, timeoutCount, last };
        });
        const all = rows.flatMap(r => Array.isArray(history[r.sink]) ? history[r.sink] : []);
        const lastEvent = all.slice().sort((a,b) => Number(b.ts||0) - Number(a.ts||0))[0] || null;
        return {
            schema: 'nexowatt.zero-export-sink-ack-history.v1',
            ts: Date.now(),
            rows,
            history,
            okCount: rows.reduce((a,r)=>a+(r.okCount||0),0),
            pendingCount: rows.reduce((a,r)=>a+(r.pendingCount||0),0),
            errorCount: rows.reduce((a,r)=>a+(r.errorCount||0),0),
            timeoutCount: rows.reduce((a,r)=>a+(r.timeoutCount||0),0),
            lastEvent,
            note: 'ACK-Verlauf/Feldprotokoll je Senke. Kein Schreibtest pro Tick.',
        };
    }

    async _zeroExportSinkAvailability(cfg, sinkPriority) {
        const now = Date.now();
        const sinkCfg = this._zeroExportSinkConfig(cfg || {});
        const steps = Array.isArray(sinkPriority && sinkPriority.steps) ? sinkPriority.steps : [];
        const out = {
            schema: 'nexowatt.zero-export-sink-availability.v1',
            ts: now,
            fastPath: true,
            reason: 'Schreibtests laufen nur bei Inbetriebnahme/Änderung/Fehler; Aktivbetrieb nutzt gespeicherte ACK-/Freigabedaten.',
            sinks: {},
            summary: { usableCount: 0, blockedCount: 0, ackRequiredCount: 0, waitingCount: 0, errorCount: 0 },
        };
        for (const step of steps) {
            const id = step && step.id;
            if (!id || id === 'localConsumption') continue;
            const cfgRow = sinkCfg[id] || { id };
            const rt = this._zeroExportSinkRuntimeFor(id);
            const mapped = !!(step && step.mapped);
            let usable = mapped && !(rt.blockedUntil && rt.blockedUntil > now);
            let lastAck = rt.lastAck || 'not_required';
            let reason = mapped ? 'Senke ist grundsätzlich gemappt.' : 'Senke ist nicht gemappt.';
            let ackAgeSec = null;
            if (cfgRow.ackRequired) out.summary.ackRequiredCount += 1;
            if (cfgRow.ackStateId) {
                const st = await this._readZeroExportAckState(cfgRow.ackStateId);
                if (st) {
                    const classified = this._classifyZeroExportSinkAck(st.val);
                    ackAgeSec = st.ts ? Math.max(0, Math.round((now - Number(st.ts || 0)) / 1000)) : null;
                    lastAck = classified.status;
                    reason = classified.reason;
                    if (classified.ok) {
                        rt.blockedUntil = 0;
                        rt.usable = true;
                        usable = mapped;
                    } else if (cfgRow.ackRequired) {
                        usable = false;
                        if (classified.status === 'pending') out.summary.waitingCount += 1;
                        if (classified.status === 'error') out.summary.errorCount += 1;
                    }
                    rt.lastAck = lastAck;
                    rt.lastReason = reason;
                } else if (cfgRow.ackRequired) {
                    usable = false;
                    lastAck = 'missing_ack_state';
                    reason = `ACK-State nicht lesbar: ${cfgRow.ackStateId}`;
                    out.summary.errorCount += 1;
                }
            } else if (cfgRow.ackRequired) {
                usable = false;
                lastAck = 'missing_ack_mapping';
                reason = 'ACK ist erforderlich, aber kein ACK-State ist konfiguriert.';
                out.summary.errorCount += 1;
            }
            if (rt.blockedUntil && rt.blockedUntil > now) {
                usable = false;
                reason = rt.lastReason || `Senke bis ${new Date(rt.blockedUntil).toISOString()} blockiert.`;
            }
            rt.usable = usable;
            const sinkRow = {
                id,
                label: step.label || id,
                mapped,
                commandStateId: cfgRow.commandStateId || step.commandStateId || '',
                ackStateId: cfgRow.ackStateId || '',
                ackRequired: !!cfgRow.ackRequired,
                usable,
                lastAck,
                lastWriteTest: rt.lastWriteTest || 'not_per_tick',
                blockedUntil: Number(rt.blockedUntil || 0),
                ackAgeSec,
                reason,
            };
            out.sinks[id] = sinkRow;
            const previousAck = rt._lastHistoryAck || '';
            const previousReason = rt._lastHistoryReason || '';
            if (lastAck && (previousAck !== lastAck || previousReason !== reason)) {
                this._rememberZeroExportSinkAck(id, { event: 'ack_read', status: lastAck, lastAck, ackStateId: cfgRow.ackStateId || '', ackAgeSec, usable, blockedUntil: Number(rt.blockedUntil || 0), reason }, 20);
                rt._lastHistoryAck = lastAck;
                rt._lastHistoryReason = reason;
            }
            if (usable) out.summary.usableCount += 1;
            else out.summary.blockedCount += 1;
        }
        out.fastPathReady = Object.values(out.sinks).some((s) => s && s.usable) || (sinkPriority && sinkPriority.nextAction === 'inverterCurtailment');
        return out;
    }

    _applyZeroExportAvailabilityToPlan(sinkPriority, availability) {
        const plan = sinkPriority || {};
        const av = availability && availability.sinks ? availability.sinks : {};
        if (!Array.isArray(plan.steps)) return plan;
        const order = ['chargingStations', 'flexLoads', 'storageCharge', 'meshMicrogrid', 'inverterCurtailment'];
        const requiredW = Math.max(0, Math.round(Number(plan.requestedReductionW || plan.exportOverLimitW || 0)));
        if (requiredW <= 0) return plan;
        const next = order.find((id) => {
            if (id === 'inverterCurtailment') return plan.steps.find(s => s.id === id && s.mapped);
            const row = av[id];
            return row && row.usable === true && row.commandStateId;
        }) || 'mappingRequired';
        plan.nextAction = next;
        plan.steps = plan.steps.map((s) => ({ ...s, activeCandidate: s.id === next, requestedPowerW: s.id === 'localConsumption' ? s.requestedPowerW : (s.id === next ? requiredW : 0), availability: av[s.id] || null }));
        plan.commandEnvelope = { ...(plan.commandEnvelope || {}), nextAction: next, commands: plan.steps.filter(s => s.commandStateId && s.requestedPowerW > 0 && (!s.availability || s.availability.usable !== false)).map(s => ({
            schema: 'nexowatt.zero-export-sink-command.v1',
            sink: s.id,
            label: s.label,
            requestedPowerW: s.requestedPowerW,
            commandStateId: s.commandStateId,
            reason: '0-Einspeisung Schnellpfad: Schreibtest nicht pro Tick, gespeicherte Freigabe/ACK wird genutzt.',
            directHardwareWrite: false,
            neutralCommandOnly: true,
        })) };
        return plan;
    }

    _zeroExportSinkPriorityPlan(cfg, exportOverLimitW, currentExportW, estimatedCurtailmentW) {
        const hasText = (v) => String(v || '').trim().length > 0;
        const enabled = !!(cfg && cfg.zeroExportEnabled);
        const maxFeedInW = this._getMaxFeedInPowerW(cfg || {});
        const requiredW = Math.max(0, Math.round(Number(exportOverLimitW) || 0));
        // Für aktive Senken-Commands darf nur die aktuelle Überschreitung verteilt werden.
        // `estimatedCurtailmentW` bleibt Diagnosewert für WR-/PV-Abregelung und darf
        // nicht als Speicher-/Ladepunkt-Sollleistung missverstanden werden.
        const requestedReductionW = requiredW;
        const diagnosticCurtailmentW = Math.max(0, Math.round(Number(estimatedCurtailmentW) || 0));
        const order = [
            'localConsumption',
            'chargingStations',
            'flexLoads',
            'storageCharge',
            'meshMicrogrid',
            'inverterCurtailment',
        ];
        const labels = {
            localConsumption: '1 Verbrauch zuerst / Eigenverbrauch am Netzpunkt',
            chargingStations: '2 freigegebene Ladepunkte / Wallboxen / DC-Stationen',
            flexLoads: '3 freigegebene flexible Verbraucher / Heizstab / Wärmelast',
            storageCharge: '4 verbleibenden PV-Überschuss in den Speicher laden',
            meshMicrogrid: '5 Mesh/Microgrid-Zielgruppen / Nachbar-Verbund',
            inverterCurtailment: '6 Wechselrichter abregeln als letzte Stufe',
        };
        const mapped = {
            localConsumption: true,
            storageCharge: hasText(cfg?.zeroExportStorageChargeCommandStateId) || hasText(cfg?.batteryChargePowerWId) || hasText(cfg?.storageChargePowerWId),
            chargingStations: hasText(cfg?.zeroExportChargingCommandStateId) || hasText(cfg?.chargingCommandStateId) || hasText(cfg?.evChargePowerWId),
            flexLoads: hasText(cfg?.zeroExportFlexLoadCommandStateId) || hasText(cfg?.flexLoadCommandStateId) || hasText(cfg?.heatingRodPowerWId),
            meshMicrogrid: hasText(cfg?.zeroExportMeshCommandStateId) || hasText(cfg?.meshMicrogridCommandStateId),
            inverterCurtailment: this._exportWriteDiagnostics(cfg || {}, Array.isArray(cfg?.pvCurtailInvertersZero) && cfg.pvCurtailInvertersZero.length ? 'group' : this._resolveCurtailMode(cfg || {})).writable,
        };
        const now = Date.now();
        const usableByRuntime = (id) => {
            const row = this._zeroExportSinkRuntimeFor ? this._zeroExportSinkRuntimeFor(id) : null;
            if (!row) return true;
            if (row.blockedUntil && row.blockedUntil > now) return false;
            return row.usable !== false;
        };
        const nextAction = requiredW <= 0
            ? 'observe'
            : (mapped.chargingStations && usableByRuntime('chargingStations') ? 'chargingStations'
                : mapped.flexLoads && usableByRuntime('flexLoads') ? 'flexLoads'
                    : mapped.storageCharge && usableByRuntime('storageCharge') ? 'storageCharge'
                        : mapped.meshMicrogrid && usableByRuntime('meshMicrogrid') ? 'meshMicrogrid'
                            : mapped.inverterCurtailment ? 'inverterCurtailment'
                                : 'mappingRequired');
        const steps = order.map((id, index) => ({
            index: index + 1,
            id,
            label: labels[id],
            mapped: !!mapped[id],
            activeCandidate: id === nextAction,
            requestedPowerW: id === 'localConsumption' ? Math.max(0, Math.round(Number(currentExportW) || 0)) : (id === nextAction ? requestedReductionW : 0),
            commandStateId: id === 'storageCharge' ? String(cfg?.zeroExportStorageChargeCommandStateId || '')
                : id === 'chargingStations' ? String(cfg?.zeroExportChargingCommandStateId || '')
                    : id === 'flexLoads' ? String(cfg?.zeroExportFlexLoadCommandStateId || '')
                        : id === 'meshMicrogrid' ? String(cfg?.zeroExportMeshCommandStateId || '')
                            : '',
            note: id === 'localConsumption'
                ? 'Wirkt automatisch als natürliche Senke. Dieser Schritt wird nicht aktiv geschaltet.'
                : id === 'inverterCurtailment'
                    ? 'Letzte Stufe: WR/PV-Abregelung nur für Restleistung nach Verbrauch, freigegebenen flexiblen Lasten, Speicher und Mesh/Microgrid.'
                    : 'Neutraler Command-State/Mapping kann diese Senke aktivieren. Die konkrete Hardwaresteuerung bleibt bei lokaler Bridge/Adapter.',
        }));
        const commandEnvelope = {
            schema: 'nexowatt.zero-export-sink-priority-command.v1',
            mode: maxFeedInW === 0 ? 'zero_export' : 'export_limit',
            enabled,
            maxFeedInW,
            requestedReductionW,
            diagnosticCurtailmentW,
            directHardwareWrite: false,
            neutralCommandOnly: true,
            priorityOrder: order,
            nextAction,
            commands: steps.filter(s => s.commandStateId && s.requestedPowerW > 0).map(s => ({
                schema: 'nexowatt.zero-export-sink-command.v1',
                sink: s.id,
                label: s.label,
                requestedPowerW: s.requestedPowerW,
                commandStateId: s.commandStateId,
                reason: '0-Einspeisung: Verbrauch und freigegebene flexible Lasten zuerst, dann Speicherladung, WR-Abregelung nur für den Rest.',
                directHardwareWrite: false,
                neutralCommandOnly: true,
            })),
        };
        return {
            schema: 'nexowatt.zero-export-sink-priority.v1',
            enabled,
            maxFeedInW,
            zeroExport: maxFeedInW === 0,
            requestedReductionW,
            diagnosticCurtailmentW,
            currentExportW: Math.max(0, Math.round(Number(currentExportW) || 0)),
            exportOverLimitW: requiredW,
            order,
            steps,
            nextAction,
            commandEnvelope,
            summary: 'Reihenfolge: Verbrauch zuerst, freigegebene Ladepunkte und flexible Verbraucher, dann Speicher laden, Mesh/Microgrid, WR-Abregelung zuletzt.',
        };
    }

    _exportWriteDiagnostics(cfg, modeResolved) {
        const mode = String(modeResolved || '').trim() || 'off';
        const missing = [];
        const rows = [];
        const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
        const add = (id, ok, label, required = true, nextStep = '') => {
            rows.push({ id, ok: !!ok, label, required: !!required, nextStep });
            if (!ok && required) missing.push(label);
        };
        // Konfigurationsbereitschaft ist kein ACK-/Hardware-Nachweis. Auch die
        // Diagnose muss fehlende Bezugsleistung und konkurrierende Ziele zeigen,
        // bevor der Installateur vom Diagnose- in den Aktivmodus wechselt.
        const mapping = this._pvMappingStatus(cfg || {}, 'zero', true);
        for (const [i, issue] of mapping.issues.entries()) {
            add(`pv.mapping.${i}`, false, issue, true, 'Bezugsleistung und eindeutige Schreibzuordnung im App-Center korrigieren.');
        }
        if (mode === 'group') {
            const list = Array.isArray(cfg && cfg.pvCurtailInvertersZero) ? cfg.pvCurtailInvertersZero : [];
            if (!list.length) missing.push('WR-Gruppe Einspeisebegrenzung: keine Wechselrichter angelegt');
            list.forEach((it, i) => {
                const idx = Number(it && it.index) || (i + 1);
                const name = (it && String(it.name || '').trim()) || `WR ${idx}`;
                const hasFeed = hasText(it && it.feedInLimitWId) || hasText(it && it.pvFeedInLimitWId);
                const hasLimitW = hasText(it && it.pvLimitWId) || hasText(it && it.limitWId);
                const hasLimitPct = hasText(it && it.pvLimitPctId) || hasText(it && it.limitPctId);
                const ok = hasFeed || hasLimitW || hasLimitPct;
                add(
                    `pv.zero.${idx}`,
                    ok,
                    `${name}: kein WR-Write-Datenpunkt für Einspeise-/PV-Limit zugeordnet`,
                    true,
                    'In der WR-Gruppe mindestens Einspeise-Limit W, PV-Limit W oder PV-Limit % als Write-Datenpunkt zuordnen.'
                );
                if (ok) {
                    rows.push({
                        id: `pv.zero.${idx}.capability`,
                        ok: true,
                        required: false,
                        label: `${name}: Schreibbrücke vorhanden (${hasFeed ? 'Feed-in W' : hasLimitW ? 'PV W' : 'PV %'})`,
                        nextStep: '',
                    });
                }
            });
        } else if (mode === 'feedInLimitW') {
            add('pv.feedInLimitW', hasText(cfg && cfg.pvFeedInLimitWId), 'PV/WR Feed-in-Limit W nicht zugeordnet', true, 'Legacy-Schreibdatenpunkt „Einspeise-Limit (W)“ zuordnen oder WR-Gruppe nutzen.');
        } else if (mode === 'pvLimitW') {
            add('pv.limitW', hasText(cfg && cfg.pvLimitWId), 'PV-Leistungsbegrenzung W nicht zugeordnet', true, 'Legacy-Schreibdatenpunkt „PV-Limit (W)“ zuordnen oder WR-Gruppe nutzen.');
        } else if (mode === 'pvLimitPct') {
            add('pv.limitPct', hasText(cfg && cfg.pvLimitPctId), 'PV-Leistungsbegrenzung % nicht zugeordnet', true, 'Legacy-Schreibdatenpunkt „PV-Limit (%)“ zuordnen oder WR-Gruppe nutzen.');
        } else {
            missing.push('Keine WR-/PV-Write-Datenpunkte für die Einspeisebegrenzung zugeordnet');
            rows.push({ id: 'off', ok: false, required: true, label: 'Keine steuerbare WR-/PV-Brücke', nextStep: 'WR-Gruppe oder Legacy-PV-Curtail-Write-Datenpunkt zuordnen.' });
        }
        const nextStep = missing.length
            ? 'WR-Zuordnung im App-Center prüfen: positive Bezugsleistung, mindestens ein Schreibdatenpunkt je WR und keine mehrfach belegten aktiven Schreibziele.'
            : 'Konfiguration bereit; dies bestätigt noch keine Hardware-Reaktion. Diagnose prüfen, anschließend im Aktivmodus Sollwert und reale WR-/NVP-Reaktion kontrollieren.';
        return {
            schema: 'nexowatt.grid.export-write-capability.v2',
            mode,
            writable: missing.length === 0,
            missing,
            rows,
            nextStep,
        };
    }

    /**
     * Code-Teil: _estimateCurtailmentW
     * Zweck: Schätzt die aktuell notwendige Abregelungsleistung für Anzeige, Wallet und Export Guard Diagnose.
     * Zusammenhang: Diese Schätzung zählt nicht selbst Energie und schreibt keine Hardware. Sie macht nur sichtbar,
     * wie viel PV-Leistung wegen Einspeiselimit/negativer Preise voraussichtlich ungenutzt bleibt.
     */
    _estimateCurtailmentW(cfg, modeResolved, exportOverLimitW) {
        const over = Math.max(0, Number(exportOverLimitW) || 0);
        const mode = String(modeResolved || '').trim() || 'off';
        let estimate = over;
        try {
            if (mode === 'group') {
                const inv = this._normalizeInvList(cfg && cfg.pvCurtailInvertersZero);
                const rated = this._sumRatedW(inv);
                const active = (typeof this._pv.limitW === 'number' && Number.isFinite(this._pv.limitW)) ? Math.max(0, this._pv.limitW) : rated;
                if (rated > 0) estimate = Math.max(estimate, rated - active);
            } else if (mode === 'feedInLimitW') {
                const rated = this._getRatedPvW(cfg);
                const active = this._getMaxFeedInPowerW(cfg);
                if (rated > 0) estimate = Math.max(estimate, rated - active);
            } else if (mode === 'pvLimitW') {
                const rated = this._getRatedPvW(cfg);
                const active = (typeof this._pv.limitW === 'number' && Number.isFinite(this._pv.limitW)) ? Math.max(0, this._pv.limitW) : rated;
                if (rated > 0) estimate = Math.max(estimate, rated - active);
            } else if (mode === 'pvLimitPct') {
                const rated = this._getRatedPvW(cfg);
                const pct = (typeof this._pv.limitPct === 'number' && Number.isFinite(this._pv.limitPct)) ? this._clamp(this._pv.limitPct, 0, 100) : 100;
                if (rated > 0) estimate = Math.max(estimate, rated * (1 - pct / 100));
            }
        } catch (_e) {}
        return Math.max(0, Math.round(estimate));
    }

    /**
     * Code-Teil: _writeZeroExportSinkCommands
     * Zweck: Schreibt die aus der bestehenden Export-Guard-Regelung abgeleiteten
     * 0-Einspeise-Senken als neutrale JSON-Commands in die vom Installateur
     * angegebenen Command-States. Das ist keine zweite Regelung und keine direkte
     * Hardwaresteuerung; lokale Bridges/Adapter entscheiden herstelleroffen über
     * OCPP, Modbus, MQTT, REST oder Herstellerdatenpunkte.
     */
    async _writeZeroExportSinkCommands(sinkPriority, context) {
        const commands = sinkPriority && sinkPriority.commandEnvelope && Array.isArray(sinkPriority.commandEnvelope.commands) ? sinkPriority.commandEnvelope.commands : [];
        const availability = context && context.sinkAvailability && context.sinkAvailability.sinks ? context.sinkAvailability.sinks : {};
        const result = {
            schema: 'nexowatt.zero-export-sink-command-write-result.v1',
            ts: Date.now(),
            status: 'idle',
            commandCount: commands.length,
            writtenCount: 0,
            failedCount: 0,
            results: [],
            skippedCount: 0,
            blockedCount: 0,
            directHardwareWrite: false,
            neutralCommandOnly: true,
        };
        if (!commands.length) {
            result.status = 'no_commands';
            return result;
        }
        for (const cmd of commands) {
            const stateId = String(cmd && cmd.commandStateId || '').trim();
            if (!stateId) continue;
            const av = availability && availability[cmd.sink] ? availability[cmd.sink] : null;
            if (av && av.usable === false) {
                result.blockedCount += 1;
                result.skippedCount += 1;
                result.results.push({ stateId, sink: cmd.sink, status: 'blocked-by-sink-availability', requestedPowerW: Math.max(0, Math.round(Number(cmd.requestedPowerW) || 0)), reason: av.reason || 'Senke ist aktuell nicht freigegeben.' });
                continue;
            }
            const envelope = {
                schema: 'nexowatt.zero-export-sink-target-command.v1',
                ts: Date.now(),
                source: 'nexowatt-ui.gridConstraints.exportLimit',
                sink: cmd.sink,
                label: cmd.label,
                requestedPowerW: Math.max(0, Math.round(Number(cmd.requestedPowerW) || 0)),
                reason: cmd.reason || '0-Einspeise Senkenpriorität',
                exportOverLimitW: Math.max(0, Math.round(Number(context && context.exportOverLimitW) || 0)),
                currentExportW: Math.max(0, Math.round(Number(context && context.currentExportW) || 0)),
                maxFeedInW: Math.max(0, Math.round(Number(context && context.maxFeedInW) || 0)),
                priorityOrder: sinkPriority.order || [],
                nextAction: sinkPriority.nextAction || 'observe',
                directHardwareWrite: false,
                neutralCommandOnly: true,
            };
            try {
                const json = JSON.stringify(envelope);
                let writeResult = null;
                if (this.adapter && typeof this.adapter.setForeignStateAsync === 'function') writeResult = await this.adapter.setForeignStateAsync(stateId, { val: json, ack: false });
                else if (this.adapter && typeof this.adapter.setStateAsync === 'function') writeResult = await this.adapter.setStateAsync(stateId, { val: json, ack: false });
                if (isActuatorAuthorityBlockedResult(writeResult)) {
                    result.blockedCount += 1;
                    result.skippedCount += 1;
                    result.results.push({
                        stateId,
                        sink: cmd.sink,
                        status: 'blocked-by-actuator-authority',
                        blockedByOwner: String(writeResult.blockedByOwner || ''),
                        requestedPowerW: envelope.requestedPowerW,
                    });
                    continue;
                }
                result.writtenCount += 1;
                const rt = this._zeroExportSinkRuntimeFor ? this._zeroExportSinkRuntimeFor(cmd.sink) : null;
                if (rt) {
                    rt.lastWriteTs = Date.now();
                    rt.lastAck = 'pending';
                    rt.lastWriteTest = rt.lastWriteTest || 'not_per_tick';
                    const cfgRow = this._zeroExportSinkConfig ? this._zeroExportSinkConfig(this.adapter && this.adapter.config ? this.adapter.config : {})[cmd.sink] : null;
                    if (cfgRow && cfgRow.ackRequired) {
                        rt.usable = false;
                        rt.blockedUntil = Date.now() + Math.max(5, Number(cfgRow.ackTimeoutSec || 60)) * 1000;
                        rt.lastReason = 'Command geschrieben; wartet auf ACK, kein erneuter Schreibtest im Regel-Tick.';
                    }
                }
                result.results.push({ stateId, sink: cmd.sink, status: 'written', requestedPowerW: envelope.requestedPowerW });
            } catch (e) {
                result.failedCount += 1;
                const rt = this._zeroExportSinkRuntimeFor ? this._zeroExportSinkRuntimeFor(cmd.sink) : null;
                if (rt) {
                    const cfgRow = this._zeroExportSinkConfig ? this._zeroExportSinkConfig(this.adapter && this.adapter.config ? this.adapter.config : {})[cmd.sink] : null;
                    rt.usable = false;
                    rt.lastAck = 'write_error';
                    rt.blockedUntil = Date.now() + Math.max(5, Number(cfgRow && cfgRow.blockSec || 120)) * 1000;
                    rt.lastReason = String(e && e.message ? e.message : e);
                }
                result.results.push({ stateId, sink: cmd.sink, status: 'error', error: String(e && e.message ? e.message : e) });
            }
        }
        result.status = result.failedCount
            ? (result.writtenCount ? 'partial-error' : 'error')
            : (result.writtenCount ? (result.blockedCount ? 'partial-blocked' : 'written') : (result.blockedCount ? 'blocked' : 'no_targets'));
        return result;
    }

    /**
     * Code-Teil: _buildZeroExportCommissioningAssistant
     * Zweck: Baut den 0-Einspeise-Inbetriebnahme-Assistenten als reine Diagnose-/Prüfschicht.
     * Zusammenhang: Diese Funktion nutzt ausschließlich vorhandene Export-Guard-/Grid-Constraints-Daten.
     * Sie baut keine zweite Regelung, schreibt keine Hardware und ersetzt keine WR-/Speicherlogik.
     * Sie macht nur sichtbar, ob die Feld-Inbetriebnahme sauber vorbereitet ist.
     */
    _buildZeroExportCommissioningAssistant(cfg, ctx) {
        const c = ctx && typeof ctx === 'object' ? ctx : {};
        const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
        const sink = c.sinkPriority || {};
        const write = c.write || { writable: false, missing: [] };
        const maxFeedInW = Math.max(0, Math.round(Number(c.maxFeedInW) || 0));
        const zeroExport = maxFeedInW === 0;
        const gridFresh = typeof c.gridW === 'number' && Number.isFinite(c.gridW);
        const storageMapped = hasText(cfg && cfg.zeroExportStorageChargeCommandStateId);
        const chargingMapped = hasText(cfg && cfg.zeroExportChargingCommandStateId);
        const flexMapped = hasText(cfg && cfg.zeroExportFlexLoadCommandStateId);
        const meshMapped = hasText(cfg && cfg.zeroExportMeshCommandStateId);
        const neutralSinkMapped = storageMapped || chargingMapped || flexMapped || meshMapped;
        const sinkSteps = Array.isArray(sink.steps) ? sink.steps : [];
        const sinkOrder = sinkSteps.length ? sinkSteps.map(s => s.id) : ['localConsumption', 'chargingStations', 'flexLoads', 'storageCharge', 'meshMicrogrid', 'inverterCurtailment'];
        const expectedOrder = ['localConsumption', 'chargingStations', 'flexLoads', 'storageCharge', 'meshMicrogrid', 'inverterCurtailment'];
        const sinkOrderOk = expectedOrder.every((id, idx) => sinkOrder[idx] === id);
        const diagnostic = c.diagnosticOnly === true || String(c.runMode || '') === 'diagnostic';
        const active = String(c.runMode || '') === 'active';
        const sinkWrite = c.sinkWriteResult || {};
        const sinkWriteOk = ['written', 'partial-error', 'diagnostic_only', 'blocked_not_allowed', 'no_commands'].includes(String(sinkWrite.status || ''));
        const items = [];
        const add = (id, label, ok, required, nextStep, value = null) => {
            items.push({ id, label, ok: !!ok, required: required !== false, nextStep: nextStep || '', value });
        };

        add('export_guard_enabled', 'Export Guard / Einspeisebegrenzung aktiv', !!c.enabled, true, 'Im Reiter Netzlimits/Einspeisebegrenzung aktivieren.');
        add('installer_approved', 'Installateurfreigabe gesetzt', !!c.approved, true, 'Installateurfreigabe erst nach Mapping-/Vorzeichenprüfung setzen.');
        add('zero_export_limit', 'Maximale Einspeisung ist 0 W', zeroExport, true, 'Für echte 0-Einspeisung maximale Einspeisung auf 0 W setzen.', maxFeedInW);
        add('grid_meter_fresh', 'Smartmeter / Netzpunkt plausibel', gridFresh, true, 'Netzpunkt-/Smartmeter-Mapping prüfen. Vorzeichen: Bezug positiv, Einspeisung negativ.');
        add('run_mode_safe', 'Betriebsart Diagnose oder Aktiv', diagnostic || active, true, 'Neue Anlagen zuerst im Diagnose/Testmodus prüfen, danach Aktivmodus freigeben.', c.runMode || '');
        add('wr_write_capable', 'WR-Konfiguration plausibel (kein Hardware-ACK-Nachweis)', !!write.writable, true, write.nextStep || 'WR-Gruppe oder PV-Curtail-Write-Datenpunkt zuordnen.');
        add('sink_order', 'Senkenreihenfolge korrekt', sinkOrderOk, true, 'Reihenfolge muss Verbrauch → freigegebene Ladepunkte → flexible Verbraucher → Speicher → Mesh/Microgrid → WR-Abregelung sein.', sinkOrder);
        add('storage_sink', 'Speicher-Lade-Command-State optional vorhanden', storageMapped, false, 'Speicher als dritte steuerbare Senke nach freigegebenen Ladepunkten und flexiblen Verbrauchern zuordnen.', cfg && cfg.zeroExportStorageChargeCommandStateId || '');
        add('charging_sink', 'Ladepunkt-Command-State optional vorhanden', chargingMapped, false, 'Ladepunkt-/DC-Station-Bridge als erste steuerbare Senke nach dem natürlichen Verbrauch zuordnen.', cfg && cfg.zeroExportChargingCommandStateId || '');
        add('flex_sink', 'Flexible Verbraucher optional vorhanden', flexMapped, false, 'Heizstab/Wärmepumpe/Relaisverbraucher als zweite steuerbare Senke nach den Ladepunkten zuordnen.', cfg && cfg.zeroExportFlexLoadCommandStateId || '');
        add('mesh_sink', 'Mesh/Microgrid optional vorhanden', meshMapped, false, 'Mesh/Microgrid-Zielgruppen optional nach lokalen Senken nutzen.', cfg && cfg.zeroExportMeshCommandStateId || '');
        add('neutral_sink_or_wr', 'Mindestens WR-Write oder neutrale Senke vorhanden', !!write.writable || neutralSinkMapped, true, 'Ohne WR-Write und ohne neutrale Senken kann nur angezeigt, aber nicht geregelt werden.');
        add('sink_command_pipeline', 'Senken-Command-Pipeline plausibel', sinkWriteOk, false, 'Im Diagnosemodus wird nur Vorschau angezeigt; im Aktivmodus Schreibstatus prüfen.', sinkWrite.status || '');

        const required = items.filter(i => i.required);
        const okRequired = required.filter(i => i.ok).length;
        const score = required.length ? Math.round((okRequired / required.length) * 100) : 0;
        const blockers = required.filter(i => !i.ok);
        const warnings = items.filter(i => !i.required && !i.ok);
        const ready = blockers.length === 0;
        const stage = !c.enabled ? 'disabled'
            : !c.approved ? 'awaiting_installer_approval'
                : blockers.length ? 'mapping_required'
                    : diagnostic ? 'diagnostic_ready'
                        : active ? 'active_ready' : 'ready';
        const nextStep = blockers.length
            ? blockers[0].nextStep
            : diagnostic
                ? 'Diagnose/Testmodus prüfen: Sollwert-Vorschau, Senkenreihenfolge, WR-Writefähigkeit und ACKs beobachten. Danach bewusst auf Aktiv stellen.'
                : '0-Einspeise-Kaskade ist bereit. Verbrauch und freigegebene flexible Lasten zuerst, dann Speicher, Mesh/Microgrid und WR-Abregelung nur für den Rest.';
        const writeTestPreview = {
            schema: 'nexowatt.zero-export-commissioning.write-test-preview.v1',
            diagnosticOnly: !!diagnostic,
            directHardwareWrite: false,
            neutralCommandOnly: true,
            currentExportW: Math.max(0, Math.round(Number(c.currentExportW) || 0)),
            exportOverLimitW: Math.max(0, Math.round(Number(c.exportOverLimitW) || 0)),
            maxFeedInW,
            plannedSinkAction: sink.nextAction || 'observe',
            wrWriteCapable: !!write.writable,
            wrWriteMode: write.mode || '',
            neutralCommands: sink && sink.commandEnvelope && Array.isArray(sink.commandEnvelope.commands) ? sink.commandEnvelope.commands : [],
            note: 'Write-Test-Vorschau: keine direkte Hardwaresteuerung; echte Writes nur im bestehenden Export Guard Aktivmodus bzw. über neutrale lokale Bridges.',
        };
        const sinkStatus = {
            schema: 'nexowatt.zero-export-commissioning.sink-status.v1',
            order: expectedOrder,
            localConsumption: { available: true, active: true, note: 'Verbrauch wirkt immer zuerst als natürliche Senke am Netzpunkt.' },
            chargingStations: { mapped: chargingMapped, commandStateId: cfg && cfg.zeroExportChargingCommandStateId || '', priority: 2 },
            flexLoads: { mapped: flexMapped, commandStateId: cfg && cfg.zeroExportFlexLoadCommandStateId || '', priority: 3 },
            storageCharge: { mapped: storageMapped, commandStateId: cfg && cfg.zeroExportStorageChargeCommandStateId || '', priority: 4 },
            meshMicrogrid: { mapped: meshMapped, commandStateId: cfg && cfg.zeroExportMeshCommandStateId || '', priority: 5 },
            inverterCurtailment: { mapped: !!write.writable, priority: 6, note: 'Letzte Stufe nach Verbrauch, freigegebenen Ladepunkten/flexiblen Verbrauchern, Speicher und Mesh/Microgrid.' },
        };
        return {
            schema: 'nexowatt.zero-export-commissioning.v1',
            status: ready ? (diagnostic ? 'ready_diagnostic' : 'ready') : 'blocked',
            stage,
            ready,
            scorePercent: score,
            nextStep,
            lastReason: blockers.length ? blockers.map(b => b.label).join(' | ') : (warnings.length ? warnings.map(w => w.label).join(' | ') : 'Alle Pflichtprüfungen bestanden.'),
            blockers,
            warnings,
            checklist: { schema: 'nexowatt.zero-export-commissioning.checklist.v1', items },
            writeTestPreview,
            sinkStatus,
            report: {
                schema: 'nexowatt.zero-export-commissioning.report.v1',
                generatedAt: Date.now(),
                zeroExport,
                runMode: c.runMode,
                enabled: !!c.enabled,
                installerApproved: !!c.approved,
                scorePercent: score,
                ready,
                nextStep,
                currentExportW: Math.max(0, Math.round(Number(c.currentExportW) || 0)),
                exportOverLimitW: Math.max(0, Math.round(Number(c.exportOverLimitW) || 0)),
                writeDiagnostics: write,
                sinkPriority: sink,
                sinkCommandWrite: sinkWrite,
            },
        };
    }

    /**
     * Code-Teil: _publishExportLimitStates
     * Zweck: Veröffentlicht die neue Export-Guard-Sicht für UI, Diagnose und Energy Wallet.
     * Zusammenhang: Die Werte werden aus der bestehenden Grid-Constraints-Regelung abgeleitet. Dadurch gibt es
     * keine zweite Einspeisebegrenzung und keine doppelte Abregelungslogik.
     */
    async _publishExportLimitStates(cfg, enabled, approved, maxFeedInPowerW, biasW, gridW, exportW, action, modeResolved, negativePriceActive, runModeOverride = null, coordination = null) {
        const set = async (id, val) => { try { await this.adapter.setStateAsync(id, val, true); } catch (_e) {} };
        const authority = coordination && coordination.authority && typeof coordination.authority === 'object'
            ? coordination.authority
            : this._resolveExportLimitAuthority(cfg || {});
        const configuredMaxW = Math.max(0, Math.round(Number(authority.configuredMaxFeedInW) || 0));
        const effectiveMaxW = Math.max(0, Math.round(Number(authority.effectiveMaxFeedInW ?? maxFeedInPowerW) || 0));
        const currentExportW = Math.max(0, Math.round(Number(exportW) || 0));
        const coordinated = !!(coordination && coordination.coordinated === true);
        const controlExportW = coordination && Number.isFinite(Number(coordination.controlExportW))
            ? Math.max(0, Math.round(Number(coordination.controlExportW)))
            : currentExportW;
        const targetGridW = Math.round((Number(biasW) || 0) - effectiveMaxW);
        const remainingW = Math.max(0, effectiveMaxW - currentExportW);
        const overLimitW = Math.max(0, currentExportW - effectiveMaxW);
        const controlOverLimitW = Math.max(0, controlExportW - effectiveMaxW);
        const usagePercent = effectiveMaxW > 0 ? Math.round((currentExportW / effectiveMaxW) * 100) : (currentExportW > 0 ? 999 : 0);
        const mode = modeResolved || 'off';
        const runMode = runModeOverride || this._getExportLimitRunMode(cfg);
        const diagnosticOnly = enabled && runMode === 'diagnostic';
        const write = this._exportWriteDiagnostics(cfg, mode);
        const estimateW = this._estimateCurtailmentW(cfg, mode, coordinated ? controlOverLimitW : overLimitW);
        let sinkPriority = this._zeroExportSinkPriorityPlan(
            cfg,
            coordinated ? controlOverLimitW : overLimitW,
            coordinated ? controlExportW : currentExportW,
            estimateW,
        );
        const sinkAckSummary = await this._updateZeroExportSinkAcks(cfg || {}, sinkPriority);
        let sinkAvailability = await this._zeroExportSinkAvailability(cfg, sinkPriority);
        sinkPriority = this._applyZeroExportAvailabilityToPlan(sinkPriority, sinkAvailability);
        sinkAvailability = await this._zeroExportSinkAvailability(cfg, sinkPriority);
        const sinkCommandReadyRaw = !!(sinkPriority && sinkPriority.commandEnvelope && Array.isArray(sinkPriority.commandEnvelope.commands) && sinkPriority.commandEnvelope.commands.length);
        // Im zentral koordinierten EMS haben Speicher, EVCS und flexible Lasten
        // ihre Sollwerte bereits über ihre eigenen Policy-/Safety-Gates erhalten.
        // Hier darf deshalb keine zweite neutrale Senken-Schreibstrecke starten.
        const sinkCommandReady = !coordinated && sinkCommandReadyRaw;
        const requiredW = enabled && approved ? (coordinated ? controlOverLimitW : overLimitW) : 0;
        const plannedAction = !enabled
            ? 'off'
            : !approved
                ? 'awaiting_installer_approval'
                : diagnosticOnly
                    ? (sinkCommandReady ? `would_dispatch_sink_${sinkPriority.nextAction}_${Math.max(0, Math.round(requiredW))}W` : `would_limit_${Math.max(0, Math.round(requiredW))}W`)
                        : sinkCommandReady
                        ? `dispatch_sink_${sinkPriority.nextAction}`
                        : !write.writable
                            ? 'mapping_required'
                            : String(action || 'active');
        const statusLabel = !enabled
            ? 'off'
            : !approved
                ? 'awaiting_installer_approval'
                : diagnosticOnly
                    ? 'diagnostic_only'
                    : sinkCommandReady
                        ? 'sink_priority_command_ready'
                        : !write.writable
                            ? 'missing_wr_write_datapoints'
                            : requiredW > 0
                                ? (coordinated ? 'residual_export_above_limit' : 'export_above_limit')
                                : negativePriceActive
                                    ? 'negative_price_guard_active'
                                    : 'within_limit';
        const negativeStrategy = negativePriceActive ? `negative_price_import_bias_${Math.max(0, Math.round(Number(biasW) || 0))}W` : 'normal_export_limit';
        const warning = write.writable ? '' : write.missing.join(' | ');
        const installerMessage = !enabled
            ? 'Export Guard ist deaktiviert.'
            : !approved
                ? 'Installateurfreigabe fehlt. Es wird nicht geregelt.'
                : diagnosticOnly
                    ? 'Diagnose/Testmodus aktiv: NexoWatt berechnet die Einspeisebegrenzung, schreibt aber keine WR-/PV-Setpoints.'
                    : !write.writable
                        ? 'WR-Konfiguration unvollständig oder widersprüchlich. Bezugsleistungen und eindeutige Schreibziele prüfen; reguläre WR-Regelung ist nicht bereit.'
                        : authority.controlSource === 'certified-controller'
                            ? `Zertifizierter EZA-/Parkregler ist führend. EOS setzt die strengere externe Grenze von ${effectiveMaxW} W über den bestehenden Export Guard um.`
                            : authority.externalExpected
                                ? `Externer Regler ist vorgesehen, aktuell greift ${authority.controlSource} mit ${effectiveMaxW} W (${authority.reason}).`
                                : negativePriceActive
                                    ? 'Negativer Preis erkannt: Export Guard nutzt die konfigurierte Negative-Preis-Strategie.'
                                    : 'EOS regelt die Einspeisegrenze lokal und bleibt einziger Asset-Writer.';
        const checklist = {
            schema: 'nexowatt.grid.export-guard.installer-checklist.v1',
            runMode,
            diagnosticOnly,
            enabled: !!enabled,
            installerApproved: !!approved,
            meterFresh: typeof gridW === 'number' && Number.isFinite(gridW),
            writeCapable: !!write.writable,
            currentExportW,
            controlExportW,
            controlOverLimitW,
            coordinated,
            configuredMaxFeedInW: configuredMaxW,
            effectiveMaxFeedInW: effectiveMaxW,
            exportLimitAuthority: authority,
            exportOverLimitW: overLimitW,
            plannedAction,
            negativePriceActive: !!negativePriceActive,
            zeroExportSinkPriority: sinkPriority,
            sinkAvailability,
            sinkCommandReady,
            nextStep: write.nextStep || '',
            missingWriteDatapoints: write.missing || [],
        };
        const summary = {
            schema: 'nexowatt.grid.export-limit.diagnostics.v1',
            enabled: !!enabled,
            installerApproved: !!approved,
            configuredMaxFeedInW: configuredMaxW,
            effectiveMaxFeedInW: effectiveMaxW,
            controlSource: String(authority.controlSource || 'eos-local'),
            exportLimitAuthority: authority,
            currentExportW,
            controlExportW,
            controlOverLimitW,
            coordinated,
            remainingFeedInW: remainingW,
            exportOverLimitW: overLimitW,
            usagePercent,
            targetGridW,
            statusLabel,
            runMode,
            diagnosticOnly,
            plannedAction,
            installerMessage,
            negativePriceActive: !!negativePriceActive,
            negativePriceStrategy: negativeStrategy,
            action: String(action || ''),
            mode,
            writeCapable: !!write.writable,
            writeWarning: warning,
            missingWriteDatapoints: write.missing,
            curtailmentRequiredW: requiredW,
            estimatedCurtailmentW: estimateW,
            unusedPvPowerW: estimateW,
            zeroExportSinkPriority: sinkPriority,
            sinkAvailability,
            sinkAckSummary,
            fastPathReady: !!(sinkAvailability && sinkAvailability.fastPathReady),
            sinkCommandReady,
            updatedAt: Date.now(),
        };
        const sinkWriteResult = enabled && approved && !diagnosticOnly && sinkCommandReady
            ? await this._writeZeroExportSinkCommands(sinkPriority, { exportOverLimitW: overLimitW, currentExportW, maxFeedInW: effectiveMaxW, sinkAvailability })
            : { schema: 'nexowatt.zero-export-sink-command-write-result.v1', ts: Date.now(), status: coordinated ? 'handled_by_central_ems' : (diagnosticOnly ? 'diagnostic_only' : (sinkCommandReady ? 'blocked_not_allowed' : 'no_commands')), commandCount: sinkPriority && sinkPriority.commandEnvelope && Array.isArray(sinkPriority.commandEnvelope.commands) ? sinkPriority.commandEnvelope.commands.length : 0, writtenCount: 0, failedCount: 0, results: [], directHardwareWrite: false, neutralCommandOnly: true };
        summary.zeroExportSinkCommandWrite = sinkWriteResult;
        checklist.zeroExportSinkCommandWrite = sinkWriteResult;
        const commissioning = this._buildZeroExportCommissioningAssistant(cfg, {
            enabled,
            approved,
            runMode,
            diagnosticOnly,
            write,
            sinkPriority,
            sinkAvailability,
            sinkWriteResult,
            currentExportW,
            exportOverLimitW: overLimitW,
            maxFeedInW: effectiveMaxW,
            gridW,
            mode,
            negativePriceActive,
            estimatedCurtailmentW: estimateW,
        });
        summary.commissioning = commissioning;
        checklist.commissioning = commissioning.report || {};
        await this._publishExportLimitAuthorityStates(authority);
        await set('gridConstraints.exportLimit.enabled', !!enabled);
        await set('gridConstraints.exportLimit.installerApproved', !!approved);
        await set('gridConstraints.exportLimit.configuredMaxFeedInW', configuredMaxW);
        await set('gridConstraints.exportLimit.effectiveMaxFeedInW', effectiveMaxW);
        await set('gridConstraints.exportLimit.currentExportW', currentExportW);
        await set('gridConstraints.exportLimit.controlExportW', controlExportW);
        await set('gridConstraints.exportLimit.controlOverLimitW', controlOverLimitW);
        await set('gridConstraints.exportLimit.remainingFeedInW', remainingW);
        await set('gridConstraints.exportLimit.exportOverLimitW', overLimitW);
        await set('gridConstraints.exportLimit.usagePercent', usagePercent);
        await set('gridConstraints.exportLimit.targetGridW', targetGridW);
        await set('gridConstraints.exportLimit.statusLabel', statusLabel);
        await set('gridConstraints.exportLimit.runMode', runMode);
        await set('gridConstraints.exportLimit.diagnosticOnly', !!diagnosticOnly);
        await set('gridConstraints.exportLimit.plannedAction', plannedAction);
        await set('gridConstraints.exportLimit.installerMessage', installerMessage);
        await set('gridConstraints.exportLimit.installerChecklistJson', JSON.stringify(checklist));
        await set('gridConstraints.exportLimit.negativePriceActive', !!negativePriceActive);
        await set('gridConstraints.exportLimit.negativePriceStrategy', negativeStrategy);
        await set('gridConstraints.exportLimit.writeCapable', !!write.writable);
        await set('gridConstraints.exportLimit.writeWarning', warning);
        await set('gridConstraints.exportLimit.missingWriteDatapointsJson', JSON.stringify(write));
        await set('gridConstraints.exportLimit.curtailmentRequiredW', requiredW);
        await set('gridConstraints.exportLimit.estimatedCurtailmentW', estimateW);
        await set('gridConstraints.exportLimit.unusedPvPowerW', estimateW);
        await set('gridConstraints.exportLimit.sinkPriorityOrderJson', JSON.stringify(sinkPriority.steps || []));
        await set('gridConstraints.exportLimit.sinkPriorityPlanJson', JSON.stringify(sinkPriority));
        await set('gridConstraints.exportLimit.nextSinkAction', sinkPriority.nextAction || 'observe');
        await set('gridConstraints.exportLimit.sinkCommandEnvelopeJson', JSON.stringify(sinkPriority.commandEnvelope || {}));
        await set('gridConstraints.exportLimit.sinkCommandWriteStatus', String(sinkWriteResult.status || 'idle'));
        await set('gridConstraints.exportLimit.sinkCommandWriteJson', JSON.stringify(sinkWriteResult));
        await set('gridConstraints.exportLimit.sinkCommandLastError', (sinkWriteResult.results || []).filter(r => r && r.status === 'error').map(r => `${r.stateId}: ${r.error}`).join(' | '));
        await set('gridConstraints.exportLimit.sinkAvailabilityJson', JSON.stringify(sinkAvailability || {}));
        await set('gridConstraints.exportLimit.fastPathReady', !!(sinkAvailability && sinkAvailability.fastPathReady));
        await set('gridConstraints.exportLimit.activeSinkJson', JSON.stringify((sinkPriority.steps || []).find(s => s && s.activeCandidate) || {}));
        await set('gridConstraints.exportLimit.fallbackReason', String((sinkAvailability && sinkAvailability.reason) || ''));
        await set('gridConstraints.exportLimit.sinkAckSummaryJson', JSON.stringify(sinkAckSummary || {}));
        await set('gridConstraints.exportLimit.sinkAckHistoryJson', JSON.stringify((sinkAckSummary && sinkAckSummary.history) || {}));
        await set('gridConstraints.exportLimit.sinkFieldProtocolJson', JSON.stringify({ schema: 'nexowatt.zero-export-field-protocol.v1', ts: Date.now(), sinkAckSummary, sinkCommandWrite: sinkWriteResult, activeSink: sinkAvailability && sinkAvailability.activeSink || null, fallbackReason: sinkAvailability && sinkAvailability.fallbackReason || '' }));
        await set('gridConstraints.exportLimit.sinkAckOkCount', Number(sinkAckSummary && sinkAckSummary.okCount || 0));
        await set('gridConstraints.exportLimit.sinkAckPendingCount', Number(sinkAckSummary && sinkAckSummary.pendingCount || 0));
        await set('gridConstraints.exportLimit.sinkAckErrorCount', Number(sinkAckSummary && sinkAckSummary.errorCount || 0));
        await set('gridConstraints.exportLimit.sinkAckTimeoutCount', Number(sinkAckSummary && sinkAckSummary.timeoutCount || 0));
        await set('gridConstraints.exportLimit.sinkAckLastEvent', JSON.stringify((sinkAckSummary && sinkAckSummary.lastEvent) || {}));
        const sinkAckHistory = this._zeroExportSinkAckSummary ? this._zeroExportSinkAckSummary() : { schema: 'nexowatt.zero-export-sink-ack-history.v1', rows: [], history: {} };
        await set('gridConstraints.exportLimit.sinkAckHistoryJson', JSON.stringify(sinkAckHistory.history || {}));
        await set('gridConstraints.exportLimit.sinkAckFieldProtocolJson', JSON.stringify(sinkAckHistory));
        await set('gridConstraints.exportLimit.sinkAckOkCount', Number(sinkAckHistory.okCount || 0));
        await set('gridConstraints.exportLimit.sinkAckPendingCount', Number(sinkAckHistory.pendingCount || 0));
        await set('gridConstraints.exportLimit.sinkAckErrorCount', Number(sinkAckHistory.errorCount || 0));
        await set('gridConstraints.exportLimit.sinkAckTimeoutCount', Number(sinkAckHistory.timeoutCount || 0));
        await set('gridConstraints.exportLimit.sinkAckLastEvent', sinkAckHistory.lastEvent ? `${sinkAckHistory.lastEvent.sink}:${sinkAckHistory.lastEvent.status || sinkAckHistory.lastEvent.lastAck || ''}` : '');
        const sinkStateMap = { storage: 'storageCharge', charging: 'chargingStations', flexLoads: 'flexLoads', mesh: 'meshMicrogrid', inverter: 'inverterCurtailment' };
        for (const key of Object.keys(sinkStateMap)) {
            const row = sinkAvailability && sinkAvailability.sinks ? sinkAvailability.sinks[sinkStateMap[key]] || {} : {};
            await set(`gridConstraints.exportLimit.sinks.${key}.usable`, row.usable === true);
            await set(`gridConstraints.exportLimit.sinks.${key}.lastAck`, String(row.lastAck || 'unknown'));
            await set(`gridConstraints.exportLimit.sinks.${key}.lastWriteTest`, String(row.lastWriteTest || 'not_per_tick'));
            await set(`gridConstraints.exportLimit.sinks.${key}.blockedUntil`, Number(row.blockedUntil || 0));
            await set(`gridConstraints.exportLimit.sinks.${key}.lastReason`, String(row.reason || ''));
            const histKey = sinkStateMap[key] || row.id;
            const hist = sinkAckSummary && sinkAckSummary.history ? sinkAckSummary.history[histKey] || [] : [];
            const rt = this._zeroExportSinkRuntimeFor ? this._zeroExportSinkRuntimeFor(histKey) : {};
            await set(`gridConstraints.exportLimit.sinks.${key}.ackHistoryJson`, JSON.stringify(hist));
            await set(`gridConstraints.exportLimit.sinks.${key}.ackOkCount`, Number(rt.ackOkCount || 0));
            await set(`gridConstraints.exportLimit.sinks.${key}.ackErrorCount`, Number(rt.ackErrorCount || 0));
            await set(`gridConstraints.exportLimit.sinks.${key}.ackTimeoutCount`, Number(rt.ackTimeoutCount || 0));
        }
        await set('gridConstraints.exportLimit.commissioning.status', String(commissioning.status || 'unknown'));
        await set('gridConstraints.exportLimit.commissioning.stage', String(commissioning.stage || 'unknown'));
        await set('gridConstraints.exportLimit.commissioning.ready', commissioning.ready === true);
        await set('gridConstraints.exportLimit.commissioning.scorePercent', Math.max(0, Math.min(100, Math.round(Number(commissioning.scorePercent) || 0))));
        await set('gridConstraints.exportLimit.commissioning.nextStep', String(commissioning.nextStep || ''));
        await set('gridConstraints.exportLimit.commissioning.lastReason', String(commissioning.lastReason || ''));
        await set('gridConstraints.exportLimit.commissioning.checklistJson', JSON.stringify(commissioning.checklist || {}));
        await set('gridConstraints.exportLimit.commissioning.writeTestPreviewJson', JSON.stringify(commissioning.writeTestPreview || {}));
        await set('gridConstraints.exportLimit.commissioning.sinkStatusJson', JSON.stringify(commissioning.sinkStatus || {}));
        await set('gridConstraints.exportLimit.commissioning.reportJson', JSON.stringify(commissioning.report || commissioning));
        await set('gridConstraints.exportLimit.displayJson', JSON.stringify(summary));
        await set('gridConstraints.exportLimit.summaryJson', JSON.stringify(summary));
        await set('gridConstraints.pvCurtail.estimatedCurtailmentW', estimateW);
    }

    _getRatedPvW(cfg) {
        const explicit = this._num(cfg.pvRatedPowerW, 0);
        if (explicit > 0) return explicit;
        const dp = this.dp;
        const v = dp ? dp.getNumber('pv.ratedPowerW', 0) : 0;
        return this._num(v, 0);
    }

    async _applyCurtailFailsafe(cfg, modeResolved) {
        try {
            if (modeResolved === 'feedInLimitW') {
                const ok = await this.dp.writeNumber('pv.feedInLimitW', 0, false);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', 0, true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
                return ok === true || ok === null;
            }
            if (modeResolved === 'pvLimitW') {
                const ok = await this.dp.writeNumber('pv.limitW', 0, false);
                this._pv.limitW = 0;
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', 0, true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
                return ok === true || ok === null;
            }
            if (modeResolved === 'pvLimitPct') {
                const ok = await this.dp.writeNumber('pv.limitPct', 0, false);
                this._pv.limitPct = 0;
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointW', 0, true);
                await this.adapter.setStateAsync('gridConstraints.pvCurtail.setpointPct', 0, true);
                return ok === true || ok === null;
            }
        } catch {
            // ignore
        }
        return false;
    }

    async tickPlanning() {
        if (!this._isEnabled()) return null;

        const cfg = this._cfg();
        const nowMs = Date.now();

        // Gemeinsamer, kanonischer NVP. Diese Phase läuft vor Speicher/Verbrauchern
        // und veröffentlicht ausschließlich Netzgrenzen sowie statische EVU-Vorgaben.
        const gridStale = this._isStaleGrid(cfg);
        const gridW = this._getGridW(cfg);

        let status = 'ok';
        let reason = ReasonCodes.OK || 'OK';
        if (gridStale || !(typeof gridW === 'number' && Number.isFinite(gridW))) {
            status = 'stale_meter';
            reason = ReasonCodes.STALE_METER || 'STALE_METER';
        }

        let rlm = { enabled: false, capNowW: null };
        if (!gridStale && (typeof gridW === 'number' && Number.isFinite(gridW))) {
            rlm = await this._tickRlm(nowMs, gridW, cfg);
        } else {
            await this._tickRlm(nowMs, 0, { ...cfg, rlmEnabled: !!cfg.rlmEnabled });
        }

        // Netzbetreiber-/EVU-Stufen sind harte statische Vorgaben und bleiben
        // unabhängig vom nachgelagerten Speicher-/PV-Koordinator aktiv.
        await this._tickPvEvu(nowMs, cfg);

        // RC81 Single Source of Truth:
        // Die statische Bezugsgrenze stammt ausschließlich aus
        // Zuordnung → Allgemein → Netzanschlussleistung. Alte Netzlimits- oder
        // Peak-Shaving-Overrides dürfen diese physische Vorgabe weder ersetzen
        // noch erhöhen. RLM darf eine vorhandene Basis nur dynamisch absenken.
        const instLimitW = this._num(this.adapter.config.installerConfig?.gridConnectionPower, 0);
        const connectionLimitW = (typeof instLimitW === 'number' && Number.isFinite(instLimitW) && instLimitW > 0)
            ? instLimitW
            : 0;
        let maxImportFinal = connectionLimitW;
        let importLimitSource = connectionLimitW > 0 ? 'assignment' : 'unconfigured';
        if (maxImportFinal > 0 && cfg.rlmEnabled && rlm && typeof rlm.capNowW === 'number' && Number.isFinite(rlm.capNowW) && rlm.capNowW > 0) {
            const reduced = Math.min(maxImportFinal, rlm.capNowW);
            if (reduced < maxImportFinal) importLimitSource = 'assignment+rlm';
            maxImportFinal = reduced;
        }

        const importPolicy = resolveGridImportLimitPolicy({
            nowMs,
            hardLimitW: maxImportFinal,
            // RC80: Soft ist verbindlich Hard minus exakt 10 %. Frühere
            // explizite Soft-/Reservewerte werden bewusst nicht mehr übergeben.
            hysteresisW: cfg.importSoftHysteresisW,
            releaseDelaySec: cfg.importSoftReleaseDelaySec,
            signedNvpW: gridW,
            nvpUsable: !gridStale && typeof gridW === 'number' && Number.isFinite(gridW),
            previousStage: this._importLimitRuntime && this._importLimitRuntime.stage,
            releaseCandidateAtMs: this._importLimitRuntime && this._importLimitRuntime.releaseCandidateAtMs,
        });
        this._importLimitRuntime = {
            stage: importPolicy.stage,
            releaseCandidateAtMs: importPolicy.releaseCandidateAtMs,
        };
        this.adapter._gridImportLimitPolicy = { ...importPolicy, ts: nowMs };

        await this.adapter.setStateAsync('gridConstraints.control.maxImportW_final', Math.round(importPolicy.hardLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.control.maxImportW_planning', Math.round(importPolicy.planningLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.enabled', importPolicy.enabled === true, true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.hardLimitW', Math.round(importPolicy.hardLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.softLimitW', Math.round(importPolicy.softLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.planningLimitW', Math.round(importPolicy.planningLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.reserveW', Math.round(importPolicy.reserveW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.hysteresisW', Math.round(importPolicy.hysteresisW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.releaseDelayMs', Math.round(importPolicy.releaseDelayMs || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.signedNvpW', Math.round(importPolicy.signedNvpW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.softHeadroomW', Math.round(importPolicy.softHeadroomW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.hardHeadroomW', Math.round(importPolicy.hardHeadroomW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.requiredReductionW', Math.round(importPolicy.requiredReductionW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.stage', String(importPolicy.stage || ''), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.reason', String(importPolicy.reason || ''), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.source', importLimitSource, true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.baseConnectionPowerW', Math.round(connectionLimitW || 0), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.softLimitMode', String(importPolicy.softLimitMode || ''), true);
        await this.adapter.setStateAsync('gridConstraints.importLimits.releasePending', importPolicy.releasePending === true, true);

        if (status === 'ok' && importPolicy.stage === 'hard') {
            status = 'hard_import_limit';
            reason = 'HARD_IMPORT_LIMIT';
        } else if (status === 'ok' && importPolicy.stage === 'soft') {
            status = 'soft_import_limit';
            reason = 'SOFT_IMPORT_LIMIT';
        }

        const exportTarget = this._buildExportLimitTarget(cfg, false);
        const minImportTargetW = cfg.zeroExportEnabled ? Math.round(Math.max(0, exportTarget.biasW)) : 0;
        await this.adapter.setStateAsync('gridConstraints.control.minImportTargetW', minImportTargetW, true);
        await this.adapter.setStateAsync('gridConstraints.control.status', status, true);
        await this.adapter.setStateAsync('gridConstraints.control.reason', reason, true);
        await this.adapter.setStateAsync('gridConstraints.control.lastUpdate', nowMs, true);

        this._lastPlanningContext = {
            ts: nowMs,
            cfg,
            gridStale,
            gridW: (typeof gridW === 'number' && Number.isFinite(gridW)) ? gridW : null,
            status,
            reason,
            rlm,
            maxImportFinal: importPolicy.hardLimitW,
            maxImportPlanning: importPolicy.planningLimitW,
            importPolicy,
            minImportTargetW,
        };
        return this._lastPlanningContext;
    }

    /**
     * Zweite Regelphase: Erst nachdem Speicher/Farm ihren finalen Sollwert und
     * das Write-Ergebnis veröffentlicht haben, darf die PV-/WR-Regelung den
     * verbleibenden NVP-Export bearbeiten. `controlGridW` ist dabei bereits um
     * die noch ausstehende Speicherreaktion bereinigt; Diagnosewerte bleiben
     * stets auf dem echten RAW-NVP.
     */
    async tickPostStorage(coordinator = null) {
        if (!this._isEnabled()) return null;

        const cfg = this._cfg();
        const nowMs = Date.now();
        const planned = this._lastPlanningContext && (nowMs - Number(this._lastPlanningContext.ts || 0)) <= 10000
            ? this._lastPlanningContext
            : null;
        const coordinatorRaw = coordinator && Number.isFinite(Number(coordinator.rawNvpW))
            ? Number(coordinator.rawNvpW)
            : null;
        const fallbackRaw = planned && Number.isFinite(Number(planned.gridW))
            ? Number(planned.gridW)
            : this._getGridW(cfg);
        const rawGridW = coordinatorRaw !== null
            ? coordinatorRaw
            : ((typeof fallbackRaw === 'number' && Number.isFinite(fallbackRaw)) ? fallbackRaw : 0);
        const controlGridW = coordinator && Number.isFinite(Number(coordinator.pvControlNvpW))
            ? Number(coordinator.pvControlNvpW)
            : rawGridW;
        const gridStale = coordinator && typeof coordinator.nvpUsable === 'boolean'
            ? !coordinator.nvpUsable
            : (planned ? !!planned.gridStale : this._isStaleGrid(cfg));
        const hardRawGuardW = coordinator && Number.isFinite(Number(coordinator.hardRawGuardW))
            ? Math.max(0, Number(coordinator.hardRawGuardW))
            : 0;

        const hasZeroGroup = Array.isArray(cfg.pvCurtailInvertersZero) && cfg.pvCurtailInvertersZero.length > 0;
        const exportGuardDiagnosticOnly = this._isExportLimitDiagnosticMode(cfg);
        const control = {
            rawGridW,
            controlGridW,
            hardRawGuardW,
            storageActualW: coordinator && Number.isFinite(Number(coordinator.storageActualW)) ? Number(coordinator.storageActualW) : 0,
            storageTargetW: coordinator && Number.isFinite(Number(coordinator.storageTargetW)) ? Number(coordinator.storageTargetW) : 0,
            storageCommandCredited: coordinator && coordinator.storageCommandCredited === true,
            flexibleNetLoadDeltaW: coordinator && Number.isFinite(Number(coordinator.flexibleNetLoadDeltaW)) ? Number(coordinator.flexibleNetLoadDeltaW) : 0,
        };

        let ze = { enabled: !!cfg.zeroExportEnabled, diagnosticOnly: exportGuardDiagnosticOnly };
        if (cfg.zeroExportEnabled && exportGuardDiagnosticOnly) {
            const tariffGridImportPreferredForDiag = await this._isTariffGridImportPreferred();
            const targetForDiag = this._buildExportLimitTarget(cfg, tariffGridImportPreferredForDiag);
            const exportWForDiag = Math.max(0, -rawGridW);
            const controlExportWForDiag = Math.max(0, -controlGridW);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.enabled', true, true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.installerApproved', !!this._isExportLimitInstallerApproved(cfg), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.maxFeedInPowerW', Math.round(targetForDiag.maxFeedInPowerW), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.targetGridW', Math.round(targetForDiag.targetGridW), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.modeLabel', targetForDiag.maxFeedInPowerW > 0 ? `max_export_${targetForDiag.maxFeedInPowerW}W` : 'zero_export', true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.targetImportBiasW', Math.round(targetForDiag.biasW), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.deadbandW', Math.round(targetForDiag.deadbandW), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.exportW', Math.round(exportWForDiag), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.controlGridW', Math.round(controlGridW), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.controlExportW', Math.round(controlExportWForDiag), true);
            await this.adapter.setStateAsync('gridConstraints.zeroExport.action', 'diagnostic_only', true);
            await this.adapter.setStateAsync('gridConstraints.pvCurtail.applied', false, true);
            ze = {
                enabled: true,
                diagnosticOnly: true,
                rawGridW,
                controlGridW,
                exportW: exportWForDiag,
                controlExportW: controlExportWForDiag,
                action: 'diagnostic_only',
                applied: false,
                mode: hasZeroGroup ? 'group' : this._resolveCurtailMode(cfg),
            };
        } else {
            ze = hasZeroGroup
                ? await this._tickZeroExportGroup(nowMs, controlGridW, cfg, gridStale, control)
                : await this._tickZeroExport(nowMs, controlGridW, cfg, gridStale, control);
        }

        // Export-Guard-Diagnose verwendet weiterhin ausschließlich den echten
        // Messwert. Der prognostizierte Rest-NVP steuert nur den Aktor.
        const tariffGridImportPreferred = await this._isTariffGridImportPreferred();
        const exportTargetDiag = this._buildExportLimitTarget(cfg, tariffGridImportPreferred);
        let zeroAction = '';
        try {
            const st = await this.adapter.getStateAsync('gridConstraints.zeroExport.action');
            zeroAction = st && st.val !== undefined && st.val !== null ? String(st.val) : '';
        } catch (_e) {}
        const modeResolvedDiag = hasZeroGroup ? 'group' : this._resolveCurtailMode(cfg);
        await this._publishExportLimitStates(
            cfg,
            !!cfg.zeroExportEnabled,
            this._isExportLimitInstallerApproved(cfg),
            exportTargetDiag.maxFeedInPowerW,
            exportTargetDiag.biasW,
            rawGridW,
            Math.max(0, -rawGridW),
            zeroAction,
            modeResolvedDiag,
            tariffGridImportPreferred,
            this._getExportLimitRunMode(cfg),
            {
                coordinated: true,
                controlExportW: Math.max(0, -controlGridW),
                authority: exportTargetDiag.authority,
            }
        );

        this._lastDynamicResult = {
            ts: nowMs,
            rawGridW: Math.round(rawGridW),
            controlGridW: Math.round(controlGridW),
            gridStale,
            ...ze,
            action: String((ze && ze.action) || zeroAction || ''),
            mode: String((ze && ze.mode) || modeResolvedDiag || ''),
        };
        return this._lastDynamicResult;
    }

    async tick() {
        await this.tickPlanning();
        if (!this._deferDynamicPv) await this.tickPostStorage();
    }
}

module.exports = { GridConstraintsModule };
