// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/services/para14a-eebus-api.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/services/para14a-eebus-api.js
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
 * Original-Hash: 8f1ebc0b7ba801af2b58001429d143b158f487793fdf47369a1e1ccd45466a28
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
 * Quelle: src-ts/runtime-executables/ems/services/para14a-eebus-api.ts
 * Quell-Hash: sha256:c51a4ee3ce006bad9fbae06ef25e5a2ddf268303f00aa00068156f0defa1905c
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/para14a-eebus-api.js.
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
 * Aufgabe: Bindet §14a-/EEBUS-bezogene Anforderungen und Statusinformationen an die Adapter-API an.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/para14a-eebus-api.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Direkte, versionierte Adapter-zu-Adapter-Schnittstelle zwischen dem
 * NexoWatt EEBUS Gateway und dem zentralen §14a-Regler von NexoWatt EOS.
 *
 * Zeitkritischer Pfad:
 * EEBUS LPC -> ioBroker sendTo -> Ingress im Arbeitsspeicher -> EMS-Tick 0 ms.
 * Diagnose-States werden erst nach der API-Antwort im Hintergrund geschrieben.
 * Eine manuelle Datenpunkt-Zuordnung der CLS-Box ist im Direktbetrieb nicht nötig.
 */
const pkg = require('../../package.json');
const countryProfileService = require('./country-profile-service');
const API_VERSION = 1;
const HELLO_COMMAND = 'nexowatt.para14a.hello.v1';
const CONTROL_COMMAND = 'nexowatt.para14a.command.v1';
const IMPLEMENTATION_COMMAND = 'nexowatt.para14a.implementation.v1';
const DEFAULT_TIMING_TARGETS_MS = Object.freeze({
    acceptance: 250,
    controllerApply: 1000,
    implementationFeedback: 1500,
});
const DEFAULT_IMPLEMENTATION_TIMEOUT_MS = 5000;
const IMPLEMENTATION_TIMEOUT_GUARD_MS = 250;
const RECENT_ACCEPTANCE_TTL_MS = 10 * 60 * 1000;
const MAX_RECENT_ACCEPTANCES = 256;
const RELEVANT_CONTROLLER_MODULES = Object.freeze([
    'para14a',
    'coreLimits',
    'chargingManagement',
    'speicherRegelung',
    'multiUse',
    'thermalControl',
    'heatingRodControl',
    'nvpCoordinator',
]);
/**
 * Code-Teil: finiteOrNull
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
/**
 * Code-Teil: positiveOrNull
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function positiveOrNull(value) {
    const number = finiteOrNull(value);
    return number !== null && number > 0 ? number : null;
}
/**
 * Code-Teil: nonNegativeOrNull
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nonNegativeOrNull(value) {
    const number = finiteOrNull(value);
    return number !== null && number >= 0 ? number : null;
}
/**
 * Code-Teil: clampNumber
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.min(max, Math.max(min, parsed));
}
/**
 * Code-Teil: boundedString
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function boundedString(value, maxLength = 240) {
    return String(value == null ? '' : value).trim().slice(0, maxLength);
}
/**
 * Code-Teil: normalizeInstance
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeInstance(value) {
    return boundedString(value, 120).replace(/^system\.adapter\./, '').toLowerCase();
}
/**
 * Code-Teil: isEebusInstance
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isEebusInstance(value) {
    return /^eebus\.\d+$/.test(normalizeInstance(value));
}
/**
 * Code-Teil: jsonStringifySafe
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function jsonStringifySafe(value) {
    try {
        return JSON.stringify(value);
    }
    catch (_error) {
        return '{}';
    }
}
/**
 * Code-Teil: Para14aEebusDirectApi
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class Para14aEebusDirectApi {
    constructor(adapter) {
        this.adapter = adapter;
        this.initialized = false;
        this.ingress = null;
        this.pending = new Map();
        this.recentAcceptances = new Map();
        this.duplicateCount = 0;
        this.commandCount = 0;
        this.rejectedCount = 0;
        this.implementedCount = 0;
        this.timeoutCount = 0;
        this.supersededCount = 0;
        this.sequence = 0;
        this.timingTargetsMs = { ...DEFAULT_TIMING_TARGETS_MS };
        this.sourceInstance = '';
        this.lastHelloAtMs = 0;
        this.bridgeHeartbeatSec = 30;
        this.helloWatchdog = null;
        this.localFailsafeSignature = '';
    }
    async init() {
        if (this.initialized)
            return;
        this.initialized = true;
        await this._ensureObjects();
        await this._writeDiagnostics({
            'para14a.api.version': API_VERSION,
            'para14a.api.status': 'waiting-for-eebus',
            'para14a.api.connected': false,
            'para14a.api.manualDatapointMappingRequired': false,
            'para14a.api.acceptanceTargetMs': this.timingTargetsMs.acceptance,
            'para14a.api.controlTargetMs': this.timingTargetsMs.controllerApply,
            'para14a.api.feedbackTargetMs': this.timingTargetsMs.implementationFeedback,
            'para14a.api.implementationTimeoutMs': DEFAULT_IMPLEMENTATION_TIMEOUT_MS,
            'para14a.api.pendingCount': 0,
            'para14a.api.lastError': '',
        });
    }
    stop() {
        this.initialized = false;
        this._clearHelloWatchdog();
        for (const pending of this.pending.values())
            this._clearPendingTimer(pending);
        this.pending.clear();
        this.recentAcceptances.clear();
        this.ingress = null;
        this.sourceInstance = '';
        this.lastHelloAtMs = 0;
        this.localFailsafeSignature = '';
        this._background(this._writeDiagnostics({
            'para14a.api.connected': false,
            'para14a.api.pendingCount': 0,
            'para14a.api.status': 'stopped',
        }));
    }
    async handleMessage(obj) {
        const command = boundedString(obj?.command, 160);
        if (command !== HELLO_COMMAND && command !== CONTROL_COMMAND)
            return false;
        if (command === HELLO_COMMAND) {
            this._handleHello(obj);
            return true;
        }
        this._handleControl(obj);
        return true;
    }
    /**
     * Liefert den letzten autorisierten Gateway-Befehl. Gültigkeits-, Paket- und
     * Bridge-Heartbeat werden zusätzlich lokal überwacht. Bei Ablauf bleibt der
     * letzte gültige Vertrag wirksam; fehlt ein nutzbarer Grenzwert, berechnet das
     * zentrale §14a-Modul Pmin,14a. Ein normaler Kommunikations-Fallback ist kein
     * EOS-Not-Aus und erzeugt deshalb niemals selbstständig 0 W.
     */
    getIngress() {
        const current = this.ingress;
        if (!current)
            return null;
        const now = Date.now();
        const validUntilMs = positiveOrNull(current.validUntilMs);
        const heartbeatAtMs = positiveOrNull(current.heartbeatAtMs);
        const heartbeatTimeoutMs = positiveOrNull(current.heartbeatTimeoutMs);
        const validityElapsed = validUntilMs !== null && validUntilMs <= now;
        const heartbeatStale = heartbeatAtMs !== null
            && heartbeatTimeoutMs !== null
            && now - heartbeatAtMs > heartbeatTimeoutMs;
        const helloStale = !this.sourceInstance
            || this.lastHelloAtMs <= 0
            || now - this.lastHelloAtMs > this._helloMaxAgeMs();
        const ageMs = Math.max(0, now - Number(current.receivedAtMs || now));
        const localFailsafeActive = validityElapsed || heartbeatStale || helloStale;
        if (localFailsafeActive) {
            const configuredFailsafeLimitW = nonNegativeOrNull(current.failsafeLimitW);
            const lastValidLimitW = current.active === true ? nonNegativeOrNull(current.limitW) : null;
            const failsafeLimitW = configuredFailsafeLimitW ?? lastValidLimitW;
            const status = validityElapsed
                ? 'local-failsafe-validity-elapsed'
                : (heartbeatStale ? 'local-failsafe-command-heartbeat-stale' : 'local-failsafe-bridge-heartbeat-stale');
            const limitSignature = failsafeLimitW === null ? 'pmin' : String(Math.round(failsafeLimitW));
            const signature = `${current.commandId}|${status}|${limitSignature}`;
            if (signature !== this.localFailsafeSignature) {
                this.localFailsafeSignature = signature;
                try {
                    this.adapter?._nwRequestImmediateEmsTick?.(`eebus-local-failsafe:${status}`, 0);
                }
                catch (_tickError) { }
                this._background(this._writeDiagnostics({
                    'para14a.api.connected': false,
                    'para14a.api.status': status,
                    'para14a.api.active': true,
                    'para14a.api.effectiveLimitW': failsafeLimitW === null ? 0 : Math.round(failsafeLimitW),
                    'para14a.api.lastError': failsafeLimitW === null
                        ? `Local §14a fallback active (${status}); central Pmin,14a is used.`
                        : `Local §14a fallback active (${status}); retained limit ${Math.round(failsafeLimitW)} W.`,
                }));
            }
            return {
                available: true,
                active: true,
                limitW: failsafeLimitW,
                commandId: current.commandId,
                sequence: current.sequence,
                sourceInstance: current.sourceInstance,
                sourceDeviceId: current.sourceDeviceId,
                sourceSki: current.sourceSki,
                sourceProtocol: current.sourceProtocol,
                operation: 'localFailsafe',
                reason: status,
                receivedAtMs: current.receivedAtMs,
                acceptedAtMs: current.acceptedAtMs,
                effectiveFromMs: now,
                validUntilMs,
                heartbeatAtMs,
                heartbeatTimeoutMs,
                failsafeLimitW,
                failsafeDurationMs: finiteOrNull(current.failsafeDurationMs),
                fresh: false,
                stale: true,
                ageMs,
                stalePolicy: 'eos-local-pmin-or-last-valid',
                status,
                localFailsafeActive: true,
                forceZero: false,
                emergencyStop: false,
            };
        }
        this.localFailsafeSignature = '';
        return {
            available: true,
            active: current.active === true,
            limitW: finiteOrNull(current.limitW),
            commandId: current.commandId,
            sequence: current.sequence,
            sourceInstance: current.sourceInstance,
            sourceDeviceId: current.sourceDeviceId,
            sourceSki: current.sourceSki,
            sourceProtocol: current.sourceProtocol,
            operation: current.operation,
            reason: boundedString(current.reason, 120),
            receivedAtMs: current.receivedAtMs,
            acceptedAtMs: current.acceptedAtMs,
            effectiveFromMs: current.effectiveFromMs,
            validUntilMs,
            heartbeatAtMs,
            heartbeatTimeoutMs,
            failsafeLimitW: finiteOrNull(current.failsafeLimitW),
            failsafeDurationMs: finiteOrNull(current.failsafeDurationMs),
            fresh: !validityElapsed && !heartbeatStale,
            stale: validityElapsed || heartbeatStale,
            ageMs,
            stalePolicy: 'gateway-authoritative-hold-until-explicit-transition',
            status: 'direct-api',
            localFailsafeActive: false,
            // Ein normaler §14a-Wert von 0 W wird im zentralen Constraint auf
            // Pmin,14a geklemmt. Er ist ausdrücklich kein EOS-Sicherheitsstopp.
            forceZero: false,
            emergencyStop: false,
        };
    }
    async flushImplementationFeedback(context = {}) {
        if (!this.initialized || this.pending.size === 0)
            return false;
        const snapshot = this.adapter?._para14a && typeof this.adapter._para14a === 'object'
            ? this.adapter._para14a
            : null;
        const snapshotCommandId = boundedString(snapshot?.directCommandId, 180);
        if (!snapshot || !snapshotCommandId)
            return false;
        const pending = this.pending.get(snapshotCommandId);
        if (!pending)
            return false;
        const moduleResults = Array.isArray(context.moduleResults) ? context.moduleResults : [];
        const resultByKey = new Map(moduleResults.map((entry) => [String(entry?.key || ''), entry]));
        const paraResult = resultByKey.get('para14a') || null;
        const coreResult = resultByKey.get('coreLimits') || null;
        const paraApplied = paraResult?.enabled === true && paraResult?.ok === true;
        const coreApplied = coreResult?.enabled === true && coreResult?.ok === true;
        const commandMatches = snapshotCommandId === pending.packet.commandId;
        // Kommt der Befehl während eines bereits laufenden Ticks an, enthält dessen
        // Snapshot noch die alte Command-ID. Dann bleibt der neue Befehl pending und
        // wird erst nach dem bereits vorgemerkten Folgetick bestätigt.
        if (!commandMatches)
            return false;
        const enabledRelevantResults = RELEVANT_CONTROLLER_MODULES
            .map((key) => resultByKey.get(key))
            .filter((entry) => !!entry && entry.enabled === true);
        const failedModules = enabledRelevantResults
            .filter((entry) => entry?.ok !== true)
            .map((entry) => ({ key: String(entry.key || ''), error: boundedString(entry.error, 320) }));
        const now = Date.now();
        const active = snapshot.active === true;
        const effectiveTotalCapW = finiteOrNull(snapshot.totalCapW ?? snapshot.totalBudgetW);
        const requestedLimitW = finiteOrNull(pending.packet.limitW);
        const expectedActive = pending.packet.active === true;
        const minimumW = Math.max(0, finiteOrNull(snapshot.pMinW) ?? 0);
        const expectedLimitW = expectedActive && requestedLimitW !== null
            ? Math.max(minimumW, requestedLimitW)
            : requestedLimitW;
        const capToleranceW = expectedLimitW === null ? 100 : Math.max(100, Math.abs(expectedLimitW) * 0.02);
        const stateMatches = expectedActive
            ? (active
                && effectiveTotalCapW !== null
                && effectiveTotalCapW >= Math.max(0, minimumW - capToleranceW)
                && (expectedLimitW === null || effectiveTotalCapW <= expectedLimitW + capToleranceW))
            : !active;
        const audit = snapshot.consumerAudit && typeof snapshot.consumerAudit === 'object'
            ? snapshot.consumerAudit
            : {};
        const manualFailedCount = Math.max(0, Number(audit.failedCount) || 0);
        const manualWriteFailedCount = Math.max(0, Number(audit.writeFailedCount) || 0);
        const centralControllerApplied = commandMatches && paraApplied && coreApplied && stateMatches;
        const downstreamHealthy = failedModules.length === 0 && manualFailedCount === 0 && manualWriteFailedCount === 0;
        const controllerApplied = centralControllerApplied && downstreamHealthy;
        let status = expectedActive ? 'applied' : 'released';
        let reason = expectedActive
            ? 'Central EOS §14a control and downstream write cycle completed.'
            : 'Central EOS §14a release and downstream write cycle completed.';
        if (!centralControllerApplied) {
            status = 'failed';
            reason = failedModules.length
                ? `Central §14a controller failed in ${failedModules.map((entry) => entry.key).join(', ')}.`
                : (!stateMatches
                    ? 'The central §14a runtime state does not match the accepted CLS command.'
                    : 'The §14a command was not applied by the central EOS constraint and budget modules.');
        }
        else if (!downstreamHealthy) {
            status = 'degraded';
            reason = 'The central §14a budget was calculated, but at least one downstream controller or consumer write path reported an error.';
        }
        const acceptedAtMs = Number(pending.acceptedAtMs || pending.packet.acceptedAtMs || now);
        const receivedAtMs = Number(pending.packet.receivedAtMs || acceptedAtMs);
        const tickStartedAtMs = Number(context.tickStartedAtMs || context.tickStartedAt || now);
        const appliedAtMs = Number(context.appliedAtMs || now);
        const feedbackCreatedAtMs = Date.now();
        const acceptanceLatencyMs = Math.max(0, acceptedAtMs - receivedAtMs);
        const postAcceptanceControlLatencyMs = Math.max(0, appliedAtMs - acceptedAtMs);
        const controlLatencyMs = Math.max(0, appliedAtMs - receivedAtMs);
        const endToEndControlLatencyMs = controlLatencyMs;
        const feedbackLatencyMs = Math.max(0, feedbackCreatedAtMs - receivedAtMs);
        const totalLatencyMs = feedbackLatencyMs;
        const auditSnapshot = snapshot.auditSnapshot && typeof snapshot.auditSnapshot === 'object'
            ? snapshot.auditSnapshot
            : {};
        const feedback = {
            schema: IMPLEMENTATION_COMMAND,
            apiVersion: API_VERSION,
            commandId: pending.packet.commandId,
            sequence: pending.packet.sequence,
            sourceInstance: String(this.adapter?.namespace || 'nexowatt-ui.0'),
            targetInstance: pending.packet.sourceInstance,
            sourceDeviceId: pending.packet.sourceDeviceId,
            sourceSki: pending.packet.sourceSki,
            status,
            reason,
            active,
            requestedLimitW,
            effectiveRequestedLimitW: expectedLimitW,
            minimumW,
            effectiveTotalCapW,
            controllerApplied,
            controllerCycleComplete: true,
            physicalImplementationConfirmed: false,
            readbackVerified: false,
            receivedAtMs,
            acceptedAtMs,
            tickStartedAtMs,
            controllerTickStartedAtMs: tickStartedAtMs,
            appliedAtMs,
            controllerAppliedAtMs: appliedAtMs,
            feedbackCreatedAtMs,
            feedbackAtMs: feedbackCreatedAtMs,
            acceptanceLatencyMs,
            controllerLatencyMs: controlLatencyMs,
            postAcceptanceControlLatencyMs,
            controlLatencyMs,
            endToEndControlLatencyMs,
            feedbackLatencyMs,
            totalLatencyMs,
            withinControlTarget: controlLatencyMs <= this.timingTargetsMs.controllerApply,
            timingTargetsMs: { ...this.timingTargetsMs },
            timingTargetsMet: {
                acceptance: acceptanceLatencyMs <= this.timingTargetsMs.acceptance,
                controllerApply: controlLatencyMs <= this.timingTargetsMs.controllerApply,
                implementationFeedback: feedbackLatencyMs <= this.timingTargetsMs.implementationFeedback,
            },
            nSteuVE: Math.max(0, Number(snapshot.nSteuVE) || 0),
            automaticConsumerCount: Math.max(0, Number(snapshot.automaticConsumerCount) || 0),
            manualConsumerCount: Math.max(0, Number(snapshot.manualConsumerCount) || 0),
            consumerAppliedCount: Math.max(0, Number(audit.appliedCount) || 0),
            consumerFailedCount: manualFailedCount,
            consumerWriteFailedCount: manualWriteFailedCount,
            gridPowerW: finiteOrNull(auditSnapshot.gridPowerW),
            actualSteuVEPowerW: null,
            evcsActualPowerW: finiteOrNull(auditSnapshot.evPowerW),
            details: {
                commandMatches,
                stateMatches,
                centralControllerApplied,
                centralConstraintApplied: paraApplied,
                centralBudgetApplied: coreApplied,
                downstreamHealthy,
                downstreamWritePathHealthy: downstreamHealthy,
                failedModules,
                physicalImplementationConfirmed: false,
                verificationLevel: 'controller-cycle-and-write-path',
                note: 'This feedback confirms the completed central EOS controller and write cycle. Electrical/metrological device readback remains separate.',
            },
        };
        this._completePending(pending, feedback);
        this._background(this._writeDiagnostics({
            'para14a.api.status': feedback.status,
            'para14a.api.effectiveLimitW': Math.round(Number(feedback.effectiveTotalCapW) || 0),
            'para14a.api.lastFeedbackAt': feedbackCreatedAtMs,
            'para14a.api.acceptanceLatencyMs': Math.round(acceptanceLatencyMs),
            'para14a.api.controlLatencyMs': Math.round(controlLatencyMs),
            'para14a.api.feedbackLatencyMs': Math.round(feedbackLatencyMs),
            'para14a.api.acceptanceTargetOk': feedback.timingTargetsMet.acceptance,
            'para14a.api.controlTargetOk': feedback.timingTargetsMet.controllerApply,
            'para14a.api.feedbackTargetOk': feedback.timingTargetsMet.implementationFeedback,
            'para14a.api.pendingCount': this.pending.size,
            'para14a.api.implementedCount': this.implementedCount,
            'para14a.api.lastFeedbackJson': jsonStringifySafe(feedback),
            'para14a.api.lastError': feedback.controllerApplied ? '' : feedback.reason,
        }));
        return true;
    }
    _handleHello(obj) {
        const message = obj?.message && typeof obj.message === 'object' ? obj.message : {};
        const sender = normalizeInstance(obj?.from);
        const declaredSource = normalizeInstance(message.sourceInstance);
        const sourceValid = isEebusInstance(sender) && declaredSource === sender;
        const compatible = Number(message.apiVersion) === API_VERSION;
        const accepted = this.initialized && sourceValid && compatible;
        if (accepted) {
            const timing = message.timingTargetsMs && typeof message.timingTargetsMs === 'object'
                ? message.timingTargetsMs
                : {};
            this.timingTargetsMs = {
                acceptance: clampNumber(timing.acceptance, 50, 5000, DEFAULT_TIMING_TARGETS_MS.acceptance),
                controllerApply: clampNumber(timing.controllerApply, 100, 10000, DEFAULT_TIMING_TARGETS_MS.controllerApply),
                implementationFeedback: clampNumber(timing.implementationFeedback, 200, 15000, DEFAULT_TIMING_TARGETS_MS.implementationFeedback),
            };
            this.bridgeHeartbeatSec = clampNumber(message.bridgeHeartbeatSec, 5, 300, 30);
            this.sourceInstance = sender;
            this.lastHelloAtMs = Date.now();
            this.localFailsafeSignature = '';
            this._armHelloWatchdog(sender, this.lastHelloAtMs);
        }
        const readiness = this._readiness();
        const response = {
            schema: HELLO_COMMAND,
            apiVersion: API_VERSION,
            accepted,
            adapterVersion: String(pkg.version || ''),
            instance: String(this.adapter?.namespace || 'nexowatt-ui.0'),
            readyForControl: readiness.ready,
            readiness,
            manualDatapointMappingRequired: false,
            capabilities: {
                directControl: true,
                immediateCentralTick: true,
                implementationFeedback: true,
                heartbeatAndFailsafeMetadata: true,
                manualDatapointMappingRequired: false,
            },
            timingTargetsMs: { ...this.timingTargetsMs },
            reason: accepted ? '' : (!sourceValid ? 'invalid-eebus-source' : 'unsupported-api-version'),
            error: '',
            ts: Date.now(),
        };
        this._reply(obj, response);
        if (accepted) {
            this._background(this._writeDiagnostics({
                'para14a.api.connected': true,
                'para14a.api.status': readiness.ready ? 'direct-api-ready' : 'direct-api-connected-not-ready',
                'para14a.api.sourceInstance': sender,
                'para14a.api.lastHelloAt': this.lastHelloAtMs,
                'para14a.api.acceptanceTargetMs': this.timingTargetsMs.acceptance,
                'para14a.api.controlTargetMs': this.timingTargetsMs.controllerApply,
                'para14a.api.feedbackTargetMs': this.timingTargetsMs.implementationFeedback,
                'para14a.api.lastError': readiness.ready ? '' : readiness.reason,
            }));
        }
    }
    _handleControl(obj) {
        const message = obj?.message && typeof obj.message === 'object' ? obj.message : {};
        const receivedByUiAtMs = Date.now();
        const validation = this._validatePacket(message, obj?.from);
        if (!validation.ok) {
            this.rejectedCount += 1;
            const response = this._rejectionResponse(message, receivedByUiAtMs, validation.reason);
            this._reply(obj, response);
            const handshakeFault = validation.reason === 'eebus-handshake-required'
                || validation.reason === 'eebus-handshake-expired';
            this._background(this._writeDiagnostics({
                'para14a.api.connected': handshakeFault ? false : true,
                'para14a.api.status': handshakeFault ? 'eebus-handshake-required' : 'rejected',
                'para14a.api.rejectedCount': this.rejectedCount,
                'para14a.api.lastError': validation.reason,
            }));
            return;
        }
        const packet = validation.packet;
        const readiness = this._readiness();
        if (!readiness.ready) {
            this.rejectedCount += 1;
            const response = this._rejectionResponse(packet, receivedByUiAtMs, readiness.reason);
            this._reply(obj, response);
            this._background(this._writeDiagnostics({
                'para14a.api.connected': true,
                'para14a.api.status': 'connected-control-not-ready',
                'para14a.api.rejectedCount': this.rejectedCount,
                'para14a.api.lastError': readiness.reason,
            }));
            return;
        }
        this._pruneRecentAcceptances();
        const pendingDuplicate = this.pending.get(packet.commandId);
        const recentDuplicate = this.recentAcceptances.get(packet.commandId);
        if (pendingDuplicate || recentDuplicate) {
            this.duplicateCount += 1;
            const base = pendingDuplicate?.acceptance || recentDuplicate?.response;
            const duplicateAtMs = Date.now();
            const response = {
                ...(base || {}),
                schema: CONTROL_COMMAND,
                apiVersion: API_VERSION,
                accepted: true,
                queued: !!pendingDuplicate,
                duplicate: true,
                commandId: packet.commandId,
                acceptedAtMs: Number(base?.acceptedAtMs) || duplicateAtMs,
                acceptanceLatencyMs: Number(base?.acceptanceLatencyMs) || Math.max(0, duplicateAtMs - packet.receivedAtMs),
                reason: 'duplicate-command',
                error: '',
            };
            this._reply(obj, response);
            const recentFeedback = recentDuplicate?.feedback;
            if (!pendingDuplicate && recentFeedback) {
                this._setTimer(() => this._sendImplementationFeedback(packet.sourceInstance, recentFeedback), 0);
            }
            this._background(this._writeDiagnostics({
                'para14a.api.duplicateCount': this.duplicateCount,
            }));
            return;
        }
        const acceptedAtMs = Date.now();
        packet.acceptedAtMs = acceptedAtMs;
        const previousIngress = this.ingress;
        this.ingress = packet;
        this.localFailsafeSignature = '';
        // Ein 0-ms-Schnelltick wird vorgemerkt, bevor die Annahme bestätigt wird.
        // Er läuft erst nach dem aktuellen JS-Callstack; pending/Ingress sind bis dahin
        // vollständig gesetzt, Diagnose-I/O ist nicht Teil dieses Pfades.
        const tickQueued = this.adapter?._nwRequestImmediateEmsTick?.(`eebus-cls:${packet.commandId}`, 0) === true;
        if (!tickQueued) {
            this.ingress = previousIngress;
            this.rejectedCount += 1;
            const response = this._rejectionResponse(packet, acceptedAtMs, 'ems-immediate-tick-not-available');
            response.error = 'The central EMS engine could not queue an immediate control cycle.';
            this._reply(obj, response);
            this._background(this._writeDiagnostics({
                'para14a.api.status': 'rejected-no-ems-tick',
                'para14a.api.rejectedCount': this.rejectedCount,
                'para14a.api.lastError': response.error,
            }));
            return;
        }
        this._supersedePending(packet.commandId);
        this.commandCount += 1;
        const response = {
            schema: CONTROL_COMMAND,
            apiVersion: API_VERSION,
            accepted: true,
            queued: true,
            duplicate: false,
            commandId: packet.commandId,
            acceptedAtMs,
            acceptanceLatencyMs: Math.max(0, acceptedAtMs - packet.receivedAtMs),
            reason: 'accepted-for-immediate-central-control',
            error: '',
        };
        const pending = { packet, acceptedAtMs, acceptance: response, timeout: null };
        this.pending.set(packet.commandId, pending);
        this._rememberAcceptance(packet.commandId, response);
        this._armImplementationTimeout(pending);
        this._reply(obj, response);
        this._background(this._writeDiagnostics({
            'para14a.api.connected': true,
            'para14a.api.sourceInstance': packet.sourceInstance,
            'para14a.api.sourceDeviceId': packet.sourceDeviceId,
            'para14a.api.commandId': packet.commandId,
            'para14a.api.status': 'accepted-awaiting-control-cycle',
            'para14a.api.active': packet.active,
            'para14a.api.requestedLimitW': Math.round(Number(packet.limitW) || 0),
            'para14a.api.receivedAt': packet.receivedAtMs,
            'para14a.api.acceptedAt': acceptedAtMs,
            'para14a.api.acceptanceLatencyMs': Math.round(response.acceptanceLatencyMs),
            'para14a.api.acceptanceTargetOk': response.acceptanceLatencyMs <= this.timingTargetsMs.acceptance,
            'para14a.api.pendingCount': this.pending.size,
            'para14a.api.commandCount': this.commandCount,
            'para14a.api.implementationTimeoutMs': packet.implementationTimeoutMs,
            'para14a.api.lastCommandJson': jsonStringifySafe(packet),
            'para14a.api.lastError': '',
        }));
    }
    _rejectionResponse(message, atMs, reason) {
        const receivedAtMs = positiveOrNull(message?.receivedAtMs) || atMs;
        return {
            schema: CONTROL_COMMAND,
            apiVersion: API_VERSION,
            accepted: false,
            queued: false,
            duplicate: false,
            commandId: boundedString(message?.commandId, 180),
            acceptedAtMs: atMs,
            acceptanceLatencyMs: Math.max(0, atMs - receivedAtMs),
            reason,
            error: reason,
        };
    }
    _validatePacket(message, from) {
        const sender = normalizeInstance(from);
        const sourceInstance = normalizeInstance(message.sourceInstance);
        if (!this.initialized)
            return { ok: false, reason: 'direct-api-not-initialized' };
        if (!isEebusInstance(sender) || sourceInstance !== sender) {
            return { ok: false, reason: 'invalid-or-mismatched-eebus-source' };
        }
        if (!this.sourceInstance || this.lastHelloAtMs <= 0 || sender !== this.sourceInstance) {
            return { ok: false, reason: 'eebus-handshake-required' };
        }
        const helloMaxAgeMs = this._helloMaxAgeMs();
        if (Date.now() - this.lastHelloAtMs > helloMaxAgeMs) {
            return { ok: false, reason: 'eebus-handshake-expired' };
        }
        if (String(message.schema || '') !== CONTROL_COMMAND || Number(message.apiVersion) !== API_VERSION) {
            return { ok: false, reason: 'unsupported-direct-api-schema' };
        }
        const commandId = boundedString(message.commandId, 180);
        if (!commandId)
            return { ok: false, reason: 'missing-command-id' };
        const operation = boundedString(message.operation, 80);
        if (operation !== 'limitConsumption' && operation !== 'release') {
            return { ok: false, reason: 'unsupported-control-operation' };
        }
        const active = operation === 'release' ? false : message.active === true;
        const limitW = active ? nonNegativeOrNull(message.limitW) : null;
        if (active && limitW === null)
            return { ok: false, reason: 'active-command-requires-non-negative-limit-w' };
        const receivedAtMs = positiveOrNull(message.receivedAtMs) || Date.now();
        const validUntilMs = positiveOrNull(message.validUntilMs);
        if (validUntilMs !== null && validUntilMs <= Date.now()) {
            return { ok: false, reason: 'command-already-expired' };
        }
        this.sequence = Math.max(this.sequence + 1, Math.max(0, Number(message.sequence) || 0));
        const packet = {
            schema: CONTROL_COMMAND,
            apiVersion: API_VERSION,
            commandId,
            sequence: this.sequence,
            sourceInstance,
            sourceDeviceId: boundedString(message.sourceDeviceId, 160),
            sourceSki: boundedString(message.sourceSki, 180),
            sourceProtocol: boundedString(message.sourceProtocol || 'EEBUS-SPINE-IF_CLS_CTRL', 120),
            operation,
            reason: boundedString(message.reason || operation, 120),
            mode: 'ems',
            active,
            limitW,
            receivedAtMs,
            issuedAtMs: positiveOrNull(message.issuedAtMs),
            effectiveFromMs: positiveOrNull(message.effectiveFromMs),
            validUntilMs,
            heartbeatAtMs: positiveOrNull(message.heartbeatAtMs),
            heartbeatTimeoutMs: positiveOrNull(message.heartbeatTimeoutMs),
            failsafeLimitW: nonNegativeOrNull(message.failsafeLimitW),
            failsafeDurationMs: finiteOrNull(message.failsafeDurationMs),
            implementationTimeoutMs: clampNumber(message.implementationTimeoutMs, 1500, 30000, DEFAULT_IMPLEMENTATION_TIMEOUT_MS),
            sourceMsgCounter: finiteOrNull(message.sourceMsgCounter),
            sourceLimitIds: Array.isArray(message.sourceLimitIds)
                ? message.sourceLimitIds.slice(0, 16).map((value) => boundedString(value, 80))
                : [],
        };
        return { ok: true, packet };
    }
    _readiness() {
        const cfg = this.adapter?.config || {};
        const para14aEnabled = !!cfg?.installerConfig?.para14a;
        const licenseAllowed = typeof this.adapter?._nwLicenseAllowsAppId === 'function'
            ? this.adapter._nwLicenseAllowsAppId('para14a') !== false
            : this.adapter?._nwLicenseOk !== false;
        let countrySupported = false;
        try {
            countrySupported = countryProfileService
                .getConfiguredCountryProfile(cfg)
                .supportsParagraph14a === true;
        }
        catch (_error) {
            countrySupported = false;
        }
        const engineReady = !!(this.adapter?.emsEngine?.mm
            && typeof this.adapter._nwRequestImmediateEmsTick === 'function');
        const ready = this.initialized && para14aEnabled && licenseAllowed && countrySupported && engineReady;
        const reason = ready
            ? ''
            : (!para14aEnabled
                ? '§14a App is not installed and enabled in AppCenter.'
                : (!licenseAllowed
                    ? '§14a is not enabled by the active EOS license.'
                    : (!countrySupported
                        ? 'The configured country profile does not support §14a.'
                        : (!engineReady ? 'The central EOS engine is not ready.' : 'Direct API is not initialized.'))));
        return { ready, para14aEnabled, licenseAllowed, countrySupported, engineReady, reason };
    }
    _helloMaxAgeMs() {
        return Math.max(15000, Math.round(this.bridgeHeartbeatSec * 3000 + 1000));
    }
    _clearHelloWatchdog() {
        if (!this.helloWatchdog)
            return;
        this._clearTimer(this.helloWatchdog);
        this.helloWatchdog = null;
    }
    _armHelloWatchdog(sourceInstance, helloAtMs) {
        this._clearHelloWatchdog();
        const maxAgeMs = this._helloMaxAgeMs();
        this.helloWatchdog = this._setTimer(() => {
            this.helloWatchdog = null;
            if (!this.initialized)
                return;
            if (this.sourceInstance !== sourceInstance || this.lastHelloAtMs !== helloAtMs)
                return;
            if (Date.now() - this.lastHelloAtMs <= maxAgeMs) {
                this._armHelloWatchdog(sourceInstance, helloAtMs);
                return;
            }
            this.localFailsafeSignature = `${this.ingress?.commandId || 'none'}|local-failsafe-bridge-heartbeat-stale|${Math.round(nonNegativeOrNull(this.ingress?.failsafeLimitW) ?? 0)}`;
            try {
                this.adapter?._nwRequestImmediateEmsTick?.('eebus-local-failsafe:bridge-heartbeat-stale', 0);
            }
            catch (_tickError) { }
            this._background(this._writeDiagnostics({
                'para14a.api.connected': false,
                'para14a.api.status': 'local-failsafe-bridge-heartbeat-stale',
                'para14a.api.lastError': 'The EEBUS direct-API heartbeat expired. EOS activated the local fail-closed constraint.',
            }));
        }, maxAgeMs + 25);
    }
    _supersedePending(nextCommandId) {
        for (const [commandId, pending] of this.pending.entries()) {
            if (commandId === nextCommandId)
                continue;
            const now = Date.now();
            const feedback = this._terminalFeedback(pending, 'superseded', `Superseded by newer CLS command ${nextCommandId}.`, now);
            this.supersededCount += 1;
            this._completePending(pending, feedback);
        }
        this._background(this._writeDiagnostics({
            'para14a.api.pendingCount': this.pending.size,
            'para14a.api.supersededCount': this.supersededCount,
        }));
    }
    _setTimer(fn, ms) {
        if (typeof this.adapter?._nwSetTimeout === 'function')
            return this.adapter._nwSetTimeout(fn, ms);
        if (typeof this.adapter?.setTimeout === 'function')
            return this.adapter.setTimeout(fn, ms);
        return setTimeout(fn, ms);
    }
    _clearTimer(timer) {
        if (!timer)
            return;
        if (typeof this.adapter?._nwClearTimeout === 'function')
            this.adapter._nwClearTimeout(timer);
        else if (typeof this.adapter?.clearTimeout === 'function')
            this.adapter.clearTimeout(timer);
        else
            clearTimeout(timer);
    }
    _clearPendingTimer(pending) {
        if (!pending?.timeout)
            return;
        this._clearTimer(pending.timeout);
        pending.timeout = null;
    }
    _armImplementationTimeout(pending) {
        this._clearPendingTimer(pending);
        const remoteTimeoutMs = clampNumber(pending?.packet?.implementationTimeoutMs, 1500, 30000, DEFAULT_IMPLEMENTATION_TIMEOUT_MS);
        const localTimeoutMs = Math.max(1000, remoteTimeoutMs - IMPLEMENTATION_TIMEOUT_GUARD_MS);
        pending.timeout = this._setTimer(() => this._handleImplementationTimeout(pending), localTimeoutMs);
    }
    _handleImplementationTimeout(pending) {
        if (!pending || this.pending.get(pending.packet.commandId) !== pending)
            return;
        const now = Date.now();
        const feedback = this._terminalFeedback(pending, 'failed', `Central EOS implementation feedback was not completed before the ${pending.packet.implementationTimeoutMs || DEFAULT_IMPLEMENTATION_TIMEOUT_MS} ms bridge deadline.`, now);
        feedback.details = {
            ...(feedback.details || {}),
            timeout: true,
            verificationLevel: 'acceptance-only-no-completed-controller-cycle',
        };
        this.timeoutCount += 1;
        this._completePending(pending, feedback);
        this._background(this._writeDiagnostics({
            'para14a.api.status': 'implementation-timeout',
            'para14a.api.pendingCount': this.pending.size,
            'para14a.api.timeoutCount': this.timeoutCount,
            'para14a.api.lastFeedbackAt': now,
            'para14a.api.lastFeedbackJson': jsonStringifySafe(feedback),
            'para14a.api.lastError': feedback.reason,
        }));
    }
    _terminalFeedback(pending, status, reason, atMs) {
        const acceptedAtMs = Number(pending.acceptedAtMs || pending.packet.acceptedAtMs || atMs);
        const receivedAtMs = Number(pending.packet.receivedAtMs || acceptedAtMs);
        const postAcceptanceControlLatencyMs = Math.max(0, atMs - acceptedAtMs);
        const controlLatencyMs = Math.max(0, atMs - receivedAtMs);
        return {
            schema: IMPLEMENTATION_COMMAND,
            apiVersion: API_VERSION,
            commandId: pending.packet.commandId,
            sequence: pending.packet.sequence,
            sourceInstance: String(this.adapter?.namespace || 'nexowatt-ui.0'),
            targetInstance: pending.packet.sourceInstance,
            sourceDeviceId: pending.packet.sourceDeviceId,
            sourceSki: pending.packet.sourceSki,
            status,
            reason,
            active: pending.packet.active === true,
            requestedLimitW: finiteOrNull(pending.packet.limitW),
            effectiveTotalCapW: null,
            controllerApplied: false,
            controllerCycleComplete: false,
            physicalImplementationConfirmed: false,
            readbackVerified: false,
            receivedAtMs,
            acceptedAtMs,
            appliedAtMs: atMs,
            controllerAppliedAtMs: atMs,
            feedbackCreatedAtMs: atMs,
            feedbackAtMs: atMs,
            acceptanceLatencyMs: Math.max(0, acceptedAtMs - receivedAtMs),
            controllerLatencyMs: controlLatencyMs,
            postAcceptanceControlLatencyMs,
            controlLatencyMs,
            endToEndControlLatencyMs: controlLatencyMs,
            feedbackLatencyMs: controlLatencyMs,
            totalLatencyMs: controlLatencyMs,
            timingTargetsMs: { ...this.timingTargetsMs },
            details: {
                physicalImplementationConfirmed: false,
                verificationLevel: 'no-completed-controller-cycle',
            },
        };
    }
    _sendImplementationFeedback(targetInstance, feedback) {
        try {
            this.adapter.sendTo(targetInstance, IMPLEMENTATION_COMMAND, feedback, () => { });
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    _completePending(pending, feedback) {
        this._clearPendingTimer(pending);
        const sent = this._sendImplementationFeedback(pending.packet.sourceInstance, feedback);
        if (!sent) {
            feedback.status = 'failed';
            feedback.controllerApplied = false;
            feedback.reason = `Implementation feedback could not be sent to ${pending.packet.sourceInstance}.`;
        }
        this.pending.delete(pending.packet.commandId);
        if (feedback.status === 'applied' || feedback.status === 'released')
            this.implementedCount += 1;
        this._rememberFeedback(pending.packet.commandId, feedback);
    }
    _rememberAcceptance(commandId, response) {
        const previous = this.recentAcceptances.get(commandId) || {};
        this.recentAcceptances.set(commandId, {
            ...previous,
            response: { ...response },
            expiresAtMs: Date.now() + RECENT_ACCEPTANCE_TTL_MS,
        });
        this._pruneRecentAcceptances();
    }
    _rememberFeedback(commandId, feedback) {
        const previous = this.recentAcceptances.get(commandId) || {};
        this.recentAcceptances.set(commandId, {
            ...previous,
            feedback: { ...feedback },
            expiresAtMs: Date.now() + RECENT_ACCEPTANCE_TTL_MS,
        });
        this._pruneRecentAcceptances();
    }
    _pruneRecentAcceptances() {
        const now = Date.now();
        for (const [commandId, entry] of this.recentAcceptances.entries()) {
            if (entry.expiresAtMs <= now)
                this.recentAcceptances.delete(commandId);
        }
        while (this.recentAcceptances.size > MAX_RECENT_ACCEPTANCES) {
            const first = this.recentAcceptances.keys().next().value;
            if (!first)
                break;
            if (first !== undefined)
                this.recentAcceptances.delete(first);
        }
    }
    _reply(obj, payload) {
        if (!obj?.callback)
            return;
        try {
            this.adapter.sendTo(obj.from, obj.command, payload, obj.callback);
        }
        catch (_error) { }
    }
    _background(promise) {
        void Promise.resolve(promise).catch((error) => {
            try {
                this.adapter?.log?.debug?.(`[§14a direct API] background diagnostic failed: ${String(error)}`);
            }
            catch (_e) { }
        });
    }
    async _ensureObjects() {
        const objects = {
            'para14a.api': { type: 'channel', common: { name: '§14a EEBUS direct API' }, native: {} },
            'para14a.api.version': stateObject('API version', 'number', 'value', false, 1),
            'para14a.api.connected': stateObject('EEBUS direct API connected', 'boolean', 'indicator.connected', false, false),
            'para14a.api.manualDatapointMappingRequired': stateObject('Manual CLS datapoint mapping required', 'boolean', 'indicator', false, false),
            'para14a.api.sourceInstance': stateObject('EEBUS source instance', 'string', 'text', false, ''),
            'para14a.api.sourceDeviceId': stateObject('CLS source device', 'string', 'text', false, ''),
            'para14a.api.commandId': stateObject('Current command ID', 'string', 'text', false, ''),
            'para14a.api.status': stateObject('Direct API status', 'string', 'text', false, 'waiting-for-eebus'),
            'para14a.api.active': stateObject('Direct §14a limit active', 'boolean', 'indicator', false, false),
            'para14a.api.requestedLimitW': stateObject('Requested total limit', 'number', 'value.power', false, 0, 'W'),
            'para14a.api.effectiveLimitW': stateObject('Effective total limit', 'number', 'value.power', false, 0, 'W'),
            'para14a.api.receivedAt': stateObject('Command received at', 'number', 'value.time', false, 0),
            'para14a.api.acceptedAt': stateObject('Command accepted at', 'number', 'value.time', false, 0),
            'para14a.api.lastHelloAt': stateObject('Last EEBUS API handshake', 'number', 'value.time', false, 0),
            'para14a.api.lastFeedbackAt': stateObject('Implementation feedback at', 'number', 'value.time', false, 0),
            'para14a.api.acceptanceLatencyMs': stateObject('API acceptance latency', 'number', 'value.interval', false, 0, 'ms'),
            'para14a.api.controlLatencyMs': stateObject('Central control-cycle latency', 'number', 'value.interval', false, 0, 'ms'),
            'para14a.api.feedbackLatencyMs': stateObject('Implementation feedback latency', 'number', 'value.interval', false, 0, 'ms'),
            'para14a.api.acceptanceTargetOk': stateObject('Acceptance timing target met', 'boolean', 'indicator', false, true),
            'para14a.api.controlTargetOk': stateObject('Controller timing target met', 'boolean', 'indicator', false, true),
            'para14a.api.feedbackTargetOk': stateObject('Feedback timing target met', 'boolean', 'indicator', false, true),
            'para14a.api.acceptanceTargetMs': stateObject('Acceptance timing target', 'number', 'value.interval', false, 250, 'ms'),
            'para14a.api.controlTargetMs': stateObject('Central control timing target', 'number', 'value.interval', false, 1000, 'ms'),
            'para14a.api.feedbackTargetMs': stateObject('Implementation feedback timing target', 'number', 'value.interval', false, 1500, 'ms'),
            'para14a.api.implementationTimeoutMs': stateObject('Implementation watchdog deadline', 'number', 'value.interval', false, 5000, 'ms'),
            'para14a.api.pendingCount': stateObject('Pending direct commands', 'number', 'value', false, 0),
            'para14a.api.commandCount': stateObject('Accepted direct commands', 'number', 'value', false, 0),
            'para14a.api.implementedCount': stateObject('Successfully implemented direct commands', 'number', 'value', false, 0),
            'para14a.api.rejectedCount': stateObject('Rejected direct commands', 'number', 'value', false, 0),
            'para14a.api.duplicateCount': stateObject('Duplicate command count', 'number', 'value', false, 0),
            'para14a.api.timeoutCount': stateObject('Implementation timeout count', 'number', 'value', false, 0),
            'para14a.api.supersededCount': stateObject('Superseded command count', 'number', 'value', false, 0),
            'para14a.api.lastCommandJson': stateObject('Last direct command', 'string', 'json', false, ''),
            'para14a.api.lastFeedbackJson': stateObject('Last implementation feedback', 'string', 'json', false, ''),
            'para14a.api.lastError': stateObject('Last direct API error', 'string', 'text', false, ''),
        };
        for (const [id, object] of Object.entries(objects)) {
            try {
                await this.adapter.setObjectNotExistsAsync(id, object);
            }
            catch (_error) { }
        }
    }
    async _writeDiagnostics(values) {
        for (const [id, value] of Object.entries(values || {})) {
            try {
                await this.adapter.setStateAsync(id, { val: value, ack: true });
            }
            catch (_error) { }
        }
    }
}
/**
 * Code-Teil: stateObject
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function stateObject(name, type, role, write, def, unit) {
    const common = { name, type, role, read: true, write: write === true, def };
    if (unit)
        common.unit = unit;
    return { type: 'state', common, native: {} };
}
module.exports = {
    Para14aEebusDirectApi,
    API_VERSION,
    HELLO_COMMAND,
    CONTROL_COMMAND,
    IMPLEMENTATION_COMMAND,
    DEFAULT_TIMING_TARGETS_MS,
};
