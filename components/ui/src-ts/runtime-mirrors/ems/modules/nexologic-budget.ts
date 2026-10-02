// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/nexologic-budget.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/nexologic-budget.js
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
 * Original-Hash: 1a5ada76a7134f618c9ac8f544ff4c1f5ce3b9a06d6f474d1d4685fdff7a8841
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
 * Quelle: src-ts/runtime-executables/ems/modules/nexologic-budget.ts
 * Quell-Hash: sha256:3175985202dc871f795bd3212dbcdb4c4d04dc3ae0128f1b01b89f48361837dd
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/nexologic-budget.js.
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
 * Aufgabe: Bindet NexoLogic-Verbraucheranforderungen in das gemeinsame EMS-Leistungsbudget ein.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/nexologic-budget.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexoLogicBudgetModule = void 0;
const { BaseModule } = require('./base');
const { recordAcceptedActuatorTransition } = require('../services/accepted-power-effects');
const { liveSafetyEnvelope, evaluateFlexibleLoadRequest, commitFlexibleLoadDecision, invalidateSafetyEnvelope, } = require('../services/safety-envelope');
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
function text(value) {
    return String(value === undefined || value === null ? '' : value).trim();
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
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: NexoLogicBudgetModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class NexoLogicBudgetModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this.adapter = adapter;
        this.dp = dpRegistry;
    }
    async init() {
        const states = {
            active: ['boolean', 'indicator.working', 'NexoLogic Budgetmodul aktiv'],
            status: ['string', 'text', 'NexoLogic Budgetstatus'],
            intentCount: ['number', 'value', 'NexoLogic Budget-Intents'],
            requestedW: ['number', 'value.power', 'NexoLogic angeforderte Leistung', 'W'],
            grantedW: ['number', 'value.power', 'NexoLogic zentral freigegebene Leistung', 'W'],
            reservedW: ['number', 'value.power', 'NexoLogic zentral reservierte Leistung', 'W'],
            blockedCount: ['number', 'value', 'NexoLogic budget-/arbiterblockierte Ausgaenge'],
            safetyBlockedCount: ['number', 'value', 'NexoLogic durch Netz-/§14a-Safety blockierte Ausgaenge'],
            safetyClampedCount: ['number', 'value', 'NexoLogic durch Netz-/§14a-Safety begrenzte Ausgaenge'],
            safetyStatus: ['string', 'text', 'NexoLogic Safety-Status'],
            intentsJson: ['string', 'json', 'NexoLogic Budget-Intents JSON'],
        };
        for (const [name, spec] of Object.entries(states)) {
            await this.adapter.setObjectNotExistsAsync(`nexoLogic.control.${name}`, {
                type: 'state',
                common: { name: spec[2], type: spec[0], role: spec[1], read: true, write: false, unit: spec[3] },
                native: {},
            });
        }
        await this.adapter.setStateAsync('nexoLogic.control.active', { val: true, ack: true });
    }
    async set(name, value) {
        if (!this.adapter || this.adapter._nwShuttingDown)
            return;
        try {
            const id = `nexoLogic.control.${name}`;
            const current = await this.adapter.getStateAsync(id).catch(() => null);
            if (current && current.val === value)
                return;
            await this.adapter.setStateAsync(id, { val: value, ack: true });
        }
        catch (_error) { }
    }
    /**
     * Fail-closed Lifecycle-Stopp fuer budgetierte NexoLogic-Ausgaenge. Der
     * Output-Controller erhaelt fuer jeden bekannten Intent einen expliziten
     * 0-W-Grant; ein nicht bestaetigter Release verriegelt den Modulmanager.
     */
    async deactivate() {
        const engine = this.adapter?.logicEngine;
        const intents = engine && typeof engine.getBudgetIntents === 'function' ? engine.getBudgetIntents() : [];
        const rows = Array.isArray(intents) ? intents : [];
        const failures = [];
        let attempted = 0;
        if (rows.length && (!engine || typeof engine.applyBudgetGrant !== 'function')) {
            throw new Error('nexologic-safe-stop-failed:output-controller-missing');
        }
        for (const intent of rows) {
            const key = text(intent?.key);
            if (!key)
                continue;
            attempted += 1;
            try {
                const result = await engine.applyBudgetGrant(key, 0);
                const reservedW = Math.max(0, num(result?.budgetReservedW, num(intent?.currentReservedW, 0)));
                const stopped = reservedW <= 0.5 && !!(result && (result.accepted === true || result.confirmed === true || result.status === 'released' || result.status === 'off'));
                if (!stopped)
                    failures.push(`${key}:${text(result?.status || 'release-not-confirmed')}`);
            }
            catch (error) {
                failures.push(`${key}:${text(error instanceof Error ? error.message : error)}`);
            }
        }
        await Promise.all([
            this.set('active', false),
            this.set('status', attempted ? 'module-disabled-safe-stop' : 'module-disabled-no-intents'),
            this.set('requestedW', 0),
            this.set('grantedW', 0),
            this.set('reservedW', 0),
        ]);
        if (failures.length)
            throw new Error(`nexologic-safe-stop-failed:${failures.join(',')}`);
        return { ok: true, attempted, stopped: attempted };
    }
    async tick() {
        const engine = this.adapter?.logicEngine;
        const central = this.adapter?._emsBudget;
        const intents = engine && typeof engine.getBudgetIntents === 'function' ? engine.getBudgetIntents() : [];
        const rows = Array.isArray(intents) ? intents.slice().sort((a, b) => num(a?.budgetPriority, 900) - num(b?.budgetPriority, 900) || text(a?.key).localeCompare(text(b?.key))) : [];
        let requestedW = 0;
        let grantedW = 0;
        let reservedW = 0;
        let blockedCount = 0;
        let safetyBlockedCount = 0;
        let safetyClampedCount = 0;
        let safetyFailure = '';
        let safetyStatus = 'ready';
        const diagnostics = [];
        const centralReady = !!(central && typeof central.getPvGrant === 'function' && typeof central.getTotalGrant === 'function' && typeof central.reserve === 'function');
        for (const intent of rows) {
            const intentActive = intent?.active !== false;
            const releasePending = intent?.releasePending === true;
            const reqW = intentActive ? Math.max(0, num(intent?.requestedW, 0)) : 0;
            requestedW += reqW;
            let grantW = 0;
            let grantSource = 'central-budget-missing';
            if (centralReady && reqW > 0 && !releasePending) {
                const req = {
                    key: `nexoLogic:${text(intent.key)}`,
                    app: 'nexoLogic',
                    label: `NexoLogic ${text(intent.graphId)}/${text(intent.nodeId)}`,
                    priority: Math.max(0, Math.round(num(intent.budgetPriority, 900))),
                    requestedW: reqW,
                    applyEvcsAllocationCap: false,
                };
                const grant = intent.budgetMode === 'pv' ? central.getPvGrant(req) : central.getTotalGrant(req);
                grantW = Math.max(0, Math.min(reqW, num(grant?.grantW, 0)));
                grantSource = text(grant?.source || grant?.reason || 'central-grant');
            }
            grantedW += grantW;
            // C3.4 / RC39: Das zentrale Budget ist eine Planungsfreigabe, aber noch
            // kein Sicherheitsnachweis. Unmittelbar vor applyBudgetGrant wird daher
            // der aktuelle NVP-/Phasen-/§14a-Envelope neu aufgebaut und der Grant ein
            // zweites Mal fail-closed geklemmt.
            const runtimeSafetyRequired = !!(this.adapter && (this.adapter._nwSafetyEnvelopeRequired === true
                || this.adapter._emsSafetyCycle
                || this.adapter.emsEngine));
            if (runtimeSafetyRequired) {
                try {
                    liveSafetyEnvelope(this.adapter, this.dp, {
                        now: Date.now(),
                        generation: this.adapter?._emsSafetyCycle?.generation,
                    });
                }
                catch (error) {
                    invalidateSafetyEnvelope(this.adapter, `nexologic-live-safety-build-failed:${text(intent.key)}:${text(error instanceof Error ? error.message : error)}`, {
                        generation: this.adapter?._emsSafetyCycle?.generation,
                        emergencyStop: true,
                    });
                }
            }
            const params = intent?.meta?.params && typeof intent.meta.params === 'object' ? intent.meta.params : {};
            const currentReservedW = Math.max(0, num(intent?.currentReservedW, 0));
            const safetyDecision = evaluateFlexibleLoadRequest(this.adapter, {
                key: `nexoLogic:${text(intent.key)}`,
                app: text(params.safetyApp || params.para14aApp || 'custom') || 'custom',
                deviceKey: text(intent.key),
                requestedW: releasePending ? 0 : grantW,
                currentActualW: currentReservedW,
                currentActualFresh: true,
                phaseCount: Math.max(1, Math.min(3, Math.round(num(params.phaseCount ?? params.phases, 3)))),
                voltageV: Math.max(200, Math.min(260, num(params.voltageV, 230))),
                deviceCapW: reqW > 0 ? reqW : null,
                now: Date.now(),
            });
            const safetyGrantW = releasePending ? 0 : Math.max(0, Math.min(grantW, num(safetyDecision?.allowedW, 0)));
            if (safetyDecision?.blocked === true || safetyDecision?.forceZero === true)
                safetyBlockedCount += 1;
            if (safetyGrantW + 0.5 < grantW)
                safetyClampedCount += 1;
            if (safetyDecision?.reason)
                safetyStatus = text(safetyDecision.reason);
            const result = engine && typeof engine.applyBudgetGrant === 'function'
                ? await engine.applyBudgetGrant(intent.key, safetyGrantW)
                : null;
            const usedW = Math.max(0, num(result?.budgetReservedW, 0));
            if (result && (result.accepted === true || result.confirmed === true || result.pending === true)) {
                recordAcceptedActuatorTransition(this.adapter, {
                    key: `nexoLogic:${text(intent.key)}`,
                    accepted: true,
                    kind: 'load',
                    source: 'nexoLogicBudget',
                    reason: text(result?.status || grantSource),
                });
            }
            // Reserviert wird ausschließlich das vom Output-Controller bestätigte
            // effektive Ziel. Das verhindert Doppelbelegung des verbleibenden
            // Netz-/Phasen-/§14a-Headrooms im selben EMS-Zyklus.
            if (safetyDecision && usedW > 0) {
                const committedDecision = {
                    ...safetyDecision,
                    allowedW: usedW,
                    forceZero: false,
                    reservation: {
                        targetW: usedW,
                        deltaW: Math.max(0, usedW - currentReservedW),
                        phaseDeltaW: Math.max(0, usedW - currentReservedW),
                        app: safetyDecision.app,
                    },
                };
                commitFlexibleLoadDecision(this.adapter, committedDecision, true);
            }
            const gateMustStop = intent?.budgetAction !== 'clamp' && safetyGrantW + 0.5 < reqW;
            const safetyStopRequired = releasePending
                || safetyDecision?.forceZero === true
                || safetyGrantW <= 0
                || gateMustStop;
            const stopNotSettled = safetyStopRequired && usedW > 0 && !(result?.confirmed === true && result?.readbackFresh === true);
            const writeRejected = safetyStopRequired && result && result.accepted !== true && result.confirmed !== true;
            if (runtimeSafetyRequired && (stopNotSettled || writeRejected || (safetyStopRequired && !result))) {
                safetyFailure = safetyFailure || `nexologic-safety-stop-not-confirmed:${text(intent.key)}`;
                invalidateSafetyEnvelope(this.adapter, safetyFailure, {
                    generation: this.adapter?._emsSafetyCycle?.generation,
                    emergencyStop: true,
                });
            }
            reservedW += usedW;
            if (result && (result.status === 'authority-blocked' || result.faultLocked || (safetyGrantW <= 0 && reqW > 0)))
                blockedCount += 1;
            if (centralReady && usedW > 0) {
                central.reserve({
                    key: `nexoLogic:${text(intent.key)}`,
                    app: 'nexoLogic',
                    label: `NexoLogic ${text(intent.graphId)}/${text(intent.nodeId)}`,
                    priority: Math.max(0, Math.round(num(intent.budgetPriority, 900))),
                    requestedW: reqW,
                    reserveW: usedW,
                    pvReserveW: intent.budgetMode === 'pv' ? usedW : 0,
                    actualW: usedW,
                    pvOnly: intent.budgetMode === 'pv',
                    mode: intent.budgetMode,
                });
            }
            diagnostics.push({
                key: intent.key,
                owner: intent.owner,
                targetId: intent.targetId,
                budgetMode: intent.budgetMode,
                requestedW: Math.round(reqW),
                grantW: Math.round(grantW),
                safetyGrantW: Math.round(safetyGrantW),
                safetyReason: text(safetyDecision?.reason || ''),
                safetyBlocked: safetyDecision?.blocked === true || safetyDecision?.forceZero === true,
                reservedW: Math.round(usedW),
                releasePending,
                status: text(result?.status || grantSource),
            });
        }
        await Promise.all([
            this.set('status', !centralReady && rows.length ? 'central-budget-missing' : (blockedCount ? 'limited' : (rows.length ? 'active' : 'idle'))),
            this.set('intentCount', rows.length),
            this.set('requestedW', Math.round(requestedW)),
            this.set('grantedW', Math.round(grantedW)),
            this.set('reservedW', Math.round(reservedW)),
            this.set('blockedCount', blockedCount),
            this.set('safetyBlockedCount', safetyBlockedCount),
            this.set('safetyClampedCount', safetyClampedCount),
            this.set('safetyStatus', safetyFailure || safetyStatus),
            this.set('intentsJson', JSON.stringify(diagnostics.slice(0, 100))),
        ]);
        if (safetyFailure) {
            try {
                this.adapter?._nwRequestImmediateEmsTick?.('safety:nexologic-write', 100);
            }
            catch (_tickError) { }
            throw new Error(safetyFailure);
        }
    }
}
exports.NexoLogicBudgetModule = NexoLogicBudgetModule;
module.exports = { NexoLogicBudgetModule };
