"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexoWattPara14aBridge = exports.NEXOWATT_PARA14A_IMPLEMENTATION = exports.NEXOWATT_PARA14A_COMMAND = exports.NEXOWATT_PARA14A_HELLO = exports.NEXOWATT_PARA14A_API_VERSION = void 0;
const sanitizer_1 = require("./sanitizer");
exports.NEXOWATT_PARA14A_API_VERSION = 1;
exports.NEXOWATT_PARA14A_HELLO = 'nexowatt.para14a.hello.v1';
exports.NEXOWATT_PARA14A_COMMAND = 'nexowatt.para14a.command.v1';
exports.NEXOWATT_PARA14A_IMPLEMENTATION = 'nexowatt.para14a.implementation.v1';
/**
 * Versioned, event-driven ioBroker message API between ioBroker.eebus and
 * nexowatt-ui. The control path never depends on diagnostic state writes and
 * therefore needs no manual CLS datapoint mapping.
 */
class NexoWattPara14aBridge {
    adapter;
    config;
    onImplementation;
    heartbeatTimer;
    sequence = 0;
    pending = new Map();
    recentAcceptances = new Map();
    started = false;
    commandCount = 0;
    rejectedCount = 0;
    implementedCount = 0;
    timeoutCount = 0;
    targetInstance = 'nexowatt-ui.0';
    readyForControl = false;
    constructor(adapter, config, onImplementation) {
        this.adapter = adapter;
        this.config = config;
        this.onImplementation = onImplementation;
    }
    async start() {
        this.started = true;
        this.targetInstance = await this.resolveTargetInstance();
        await this.publishStaticStates();
        await this.handshake();
        this.heartbeatTimer = this.adapter.setInterval(() => void this.handshake(), this.config.nexowattBridgeHeartbeatSec * 1000);
    }
    async stop() {
        this.started = false;
        if (this.heartbeatTimer) {
            this.adapter.clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        for (const entry of this.pending.values())
            this.clearPendingTimer(entry);
        this.pending.clear();
        this.recentAcceptances.clear();
        this.readyForControl = false;
        await this.setState('bridge.connected', false);
        await this.setState('bridge.readyForControl', false);
        await this.setState('bridge.pendingCount', 0);
        await this.setState('bridge.status', 'stopped');
    }
    /**
     * Forwards an active LPC limit or release directly to the central EOS
     * controller. Heartbeat and failsafe configuration remain local metadata;
     * synthesized failsafe/recovery transitions use this same method.
     */
    async dispatchLimit(clsCommand, reason) {
        if (this.adapter.isEosLicenseAllowed?.() !== true) {
            return { accepted: false, queued: false, reason: 'EOS_LICENSE_REQUIRED', commandId: clsCommand.commandId };
        }
        if (clsCommand.operation !== 'limitConsumption' && clsCommand.operation !== 'release') {
            return {
                accepted: false,
                queued: false,
                commandId: clsCommand.commandId,
                acceptedAtMs: Date.now(),
                acceptanceLatencyMs: Math.max(0, Date.now() - clsCommand.receivedAtMs),
                reason: 'unsupported-operation',
                error: `Direct controller accepts only limit/release, got ${clsCommand.operation}.`,
            };
        }
        const existing = this.pending.get(clsCommand.commandId);
        if (existing?.acceptance)
            return { ...existing.acceptance, duplicate: true };
        if (existing?.acceptancePromise) {
            const response = await existing.acceptancePromise;
            return { ...response, duplicate: true };
        }
        const packet = this.toBridgeCommand(clsCommand, reason);
        const recent = this.recentAcceptances.get(clsCommand.commandId);
        if (recent && recent.expiresAtMs > Date.now()) {
            if (recent.feedback) {
                const replayContext = {
                    command: packet,
                    clsCommand,
                    acceptance: recent.response,
                };
                this.adapter.setTimeout(() => void this.onImplementation({ ...recent.feedback }, replayContext), 0);
            }
            return { ...recent.response, duplicate: true };
        }
        const pending = { command: packet, clsCommand };
        this.commandCount += 1;
        this.pending.set(packet.commandId, pending);
        this.prunePending();
        this.background(this.publishCommand(packet));
        if (!this.config.nexowattBridgeEnabled) {
            return this.rejectPending(pending, packet, 'bridge-disabled', 'NexoWatt direct §14a bridge is disabled.');
        }
        if (!this.config.autoApplyClsLimits) {
            return this.rejectPending(pending, packet, 'automatic-control-disabled', 'Automatic application of CLS limits is disabled.');
        }
        const acceptancePromise = (async () => {
            try {
                // Der zeitkritische Regelbefehl wird genau einmal gesendet. Ein
                // Transport-Retry würde die maximale Annahmezeit verdoppeln und könnte
                // nach einem verlorenen Callback eine zweite, zeitlich verspätete
                // Protokolltransaktion erzeugen. Echte SPINE-Wiederholungen bleiben über
                // die stabile commandId vollständig idempotent. Auch eine Wiederholung,
                // die noch während des ersten ioBroker-Callbacks eintrifft, wartet auf
                // genau dieses Annahmeergebnis und löst keinen zweiten Send aus.
                const response = await this.sendRequest(this.targetInstance, exports.NEXOWATT_PARA14A_COMMAND, packet, this.config.nexowattBridgeRequestTimeoutMs);
                const acceptedAtMs = finiteOrNull(response?.acceptedAtMs) ?? Date.now();
                const normalized = {
                    accepted: response?.accepted === true,
                    queued: response?.queued === true,
                    duplicate: response?.duplicate === true,
                    commandId: String(response?.commandId || packet.commandId),
                    acceptedAtMs,
                    acceptanceLatencyMs: finiteOrNull(response?.acceptanceLatencyMs)
                        ?? Math.max(0, acceptedAtMs - packet.receivedAtMs),
                    reason: String(response?.reason || ''),
                    error: String(response?.error || ''),
                    schema: String(response?.schema || ''),
                    apiVersion: Number(response?.apiVersion) || undefined,
                };
                pending.acceptance = normalized;
                if (!normalized.accepted) {
                    this.rejectedCount += 1;
                    this.removePending(packet.commandId);
                }
                else {
                    this.rememberAcceptance(packet.commandId, normalized);
                    this.armImplementationTimeout(pending);
                }
                this.background(this.publishAcceptance(normalized, packet.receivedAtMs));
                return normalized;
            }
            catch (error) {
                return this.rejectPending(pending, packet, 'bridge-request-failed', String(error));
            }
        })();
        pending.acceptancePromise = acceptancePromise;
        return acceptancePromise;
    }
    async handleMessage(command, message, from = '') {
        if (command !== exports.NEXOWATT_PARA14A_IMPLEMENTATION)
            return { handled: false, accepted: false };
        if (!this.isExpectedSender(from)) {
            return {
                handled: true,
                accepted: false,
                error: `Unexpected feedback sender: ${String(from || 'unknown')}`,
            };
        }
        const feedback = normalizeImplementationFeedback(message);
        if (!feedback) {
            return { handled: true, accepted: false, error: 'Invalid implementation feedback payload.' };
        }
        const context = this.pending.get(feedback.commandId);
        if (context)
            this.clearPendingTimer(context);
        if (feedback.status === 'applied' || feedback.status === 'released')
            this.implementedCount += 1;
        this.background(this.publishImplementation(feedback));
        this.rememberImplementation(feedback.commandId, feedback);
        await this.onImplementation(feedback, context);
        this.removePending(feedback.commandId);
        return { handled: true, accepted: true };
    }
    contextFor(commandId) {
        return this.pending.get(commandId);
    }
    toBridgeCommand(clsCommand, reason) {
        const heartbeatTimeoutMs = finiteOrNull(clsCommand.heartbeatTimeoutMs)
            ?? this.config.clsHeartbeatTimeoutSec * 1000;
        const resolvedReason = reason
            ?? (clsCommand.operation === 'release' ? 'release' : 'lpc');
        return {
            schema: exports.NEXOWATT_PARA14A_COMMAND,
            apiVersion: exports.NEXOWATT_PARA14A_API_VERSION,
            commandId: clsCommand.commandId,
            sequence: this.nextSequence(),
            sourceInstance: String(this.adapter.namespace || 'eebus.0'),
            sourceDeviceId: clsCommand.sourceDeviceId,
            sourceSki: clsCommand.sourceSki,
            sourceProtocol: 'EEBUS-SPINE-IF_CLS_CTRL',
            operation: clsCommand.operation === 'release' ? 'release' : 'limitConsumption',
            reason: resolvedReason,
            mode: 'ems',
            active: clsCommand.active,
            limitW: finiteOrNull(clsCommand.limitW),
            receivedAtMs: clsCommand.receivedAtMs,
            issuedAtMs: Date.now(),
            effectiveFromMs: finiteOrNull(clsCommand.effectiveFromMs),
            validUntilMs: finiteOrNull(clsCommand.expiresAtMs),
            heartbeatAtMs: finiteOrNull(clsCommand.heartbeatAtMs),
            heartbeatTimeoutMs: Math.max(1000, heartbeatTimeoutMs),
            failsafeLimitW: finiteOrNull(clsCommand.failsafeLimitW),
            failsafeDurationMs: finiteOrNull(clsCommand.failsafeDurationMs),
            implementationTimeoutMs: this.config.nexowattImplementationTimeoutMs,
            sourceMsgCounter: finiteOrNull(clsCommand.correlation.msgCounter),
            sourceLimitIds: clsCommand.correlation.limitIds.slice(0, 16),
        };
    }
    async handshake() {
        if (!this.started || !this.config.nexowattBridgeEnabled)
            return;
        if (this.config.nexowattUiInstance === 'auto')
            this.targetInstance = await this.resolveTargetInstance();
        const sentAtMs = Date.now();
        const hello = {
            schema: exports.NEXOWATT_PARA14A_HELLO,
            apiVersion: exports.NEXOWATT_PARA14A_API_VERSION,
            sourceInstance: String(this.adapter.namespace || 'eebus.0'),
            sentAtMs,
            bridgeHeartbeatSec: this.config.nexowattBridgeHeartbeatSec,
            capabilities: {
                directControl: true,
                lpc: true,
                heartbeat: true,
                failsafe: true,
                implementationFeedback: true,
                manualDatapointMappingRequired: false,
            },
            timingTargetsMs: {
                acceptance: this.config.nexowattAcceptanceTargetMs,
                controllerApply: this.config.nexowattControlTargetMs,
                implementationFeedback: this.config.nexowattFeedbackTargetMs,
            },
        };
        try {
            const response = await this.sendRequestWithRetry(this.targetInstance, exports.NEXOWATT_PARA14A_HELLO, hello, this.config.nexowattBridgeRequestTimeoutMs, 2);
            const connected = response?.accepted === true
                && Number(response?.apiVersion) === exports.NEXOWATT_PARA14A_API_VERSION;
            const readyForControl = connected && response?.readyForControl === true;
            this.readyForControl = readyForControl;
            const readinessReason = String(response?.readiness?.reason
                || response?.reason
                || (connected ? 'EOS direct API is connected but not ready for §14a control.' : 'Handshake rejected'));
            await this.setState('bridge.connected', connected);
            await this.setState('bridge.readyForControl', readyForControl);
            await this.setState('bridge.status', readyForControl
                ? 'direct-api-ready'
                : (connected ? 'direct-api-connected-not-ready' : `rejected:${String(response?.reason || 'unknown')}`));
            await this.setState('bridge.lastHandshakeAt', Date.now());
            await this.setState('bridge.lastRoundTripMs', Math.max(0, Date.now() - sentAtMs));
            await this.setState('bridge.remoteVersion', String(response?.adapterVersion || ''));
            await this.setState('bridge.targetInstance', this.targetInstance);
            await this.setState('bridge.lastError', readyForControl ? '' : String(response?.error || readinessReason));
        }
        catch (error) {
            this.readyForControl = false;
            await this.setState('bridge.connected', false);
            await this.setState('bridge.readyForControl', false);
            await this.setState('bridge.status', 'target-unavailable');
            await this.setState('bridge.lastError', String(error));
        }
    }
    async sendRequestWithRetry(targetInstance, command, message, timeoutMs, attempts = 1) {
        let lastError;
        const maxAttempts = Math.max(1, Math.min(2, Math.round(attempts)));
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await this.sendRequest(targetInstance, command, message, timeoutMs);
            }
            catch (error) {
                lastError = error;
                if (attempt >= maxAttempts)
                    break;
                await new Promise((resolve) => {
                    const timer = this.adapter.setTimeout(() => {
                        this.adapter.clearTimeout(timer);
                        resolve();
                    }, 50);
                });
            }
        }
        throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown bridge error'));
    }
    sendRequest(targetInstance, command, message, timeoutMs) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const timer = this.adapter.setTimeout(() => {
                if (settled)
                    return;
                settled = true;
                reject(new Error(`Timeout after ${timeoutMs} ms while calling ${targetInstance}/${command}`));
            }, timeoutMs);
            try {
                if (command === exports.NEXOWATT_PARA14A_COMMAND && this.adapter.isEosLicenseAllowed?.() !== true) {
                    throw new Error('EOS_LICENSE_REQUIRED');
                }
                this.adapter.sendTo(targetInstance, command, message, (response) => {
                    if (settled)
                        return;
                    settled = true;
                    this.adapter.clearTimeout(timer);
                    resolve(response);
                });
            }
            catch (error) {
                if (settled)
                    return;
                settled = true;
                this.adapter.clearTimeout(timer);
                reject(error);
            }
        });
    }
    async resolveTargetInstance() {
        if (this.config.nexowattUiInstance !== 'auto')
            return this.config.nexowattUiInstance;
        try {
            if (typeof this.adapter.getForeignObjectsAsync === 'function') {
                const objects = await this.adapter.getForeignObjectsAsync('system.adapter.nexowatt-ui.*', 'instance');
                const localHost = String(this.adapter.host || this.adapter.common?.host || '');
                const candidates = Object.entries(objects || {})
                    .map(([objectId, objectValue]) => {
                    const id = objectId.replace(/^system\.adapter\./, '');
                    const common = objectValue?.common || {};
                    return {
                        id,
                        enabled: common.enabled !== false,
                        sameHost: !!localHost && String(common.host || '') === localHost,
                        index: Number(id.split('.').pop()) || 0,
                    };
                })
                    .filter(candidate => /^nexowatt-ui\.\d+$/.test(candidate.id))
                    .sort((a, b) => Number(b.enabled) - Number(a.enabled)
                    || Number(b.sameHost) - Number(a.sameHost)
                    || a.index - b.index);
                if (candidates.length > 0)
                    return candidates[0].id;
            }
        }
        catch (error) {
            this.adapter.log.debug(`Could not auto-detect nexowatt-ui instance: ${String(error)}`);
        }
        return 'nexowatt-ui.0';
    }
    async rejectPending(pending, packet, reason, error) {
        const now = Date.now();
        const response = {
            accepted: false,
            queued: false,
            commandId: packet.commandId,
            acceptedAtMs: now,
            acceptanceLatencyMs: Math.max(0, now - packet.receivedAtMs),
            reason,
            error,
        };
        pending.acceptance = response;
        this.rejectedCount += 1;
        this.removePending(packet.commandId);
        this.background(this.publishAcceptance(response, packet.receivedAtMs));
        return response;
    }
    armImplementationTimeout(entry) {
        this.clearPendingTimer(entry);
        entry.timeout = this.adapter.setTimeout(() => void this.handleImplementationTimeout(entry), Math.max(1500, Number(entry.command.implementationTimeoutMs) || this.config.nexowattImplementationTimeoutMs));
    }
    async handleImplementationTimeout(entry) {
        if (!this.pending.has(entry.command.commandId))
            return;
        this.timeoutCount += 1;
        const now = Date.now();
        const acceptedAtMs = finiteOrNull(entry.acceptance?.acceptedAtMs) ?? now;
        const feedback = {
            schema: exports.NEXOWATT_PARA14A_IMPLEMENTATION,
            apiVersion: 1,
            commandId: entry.command.commandId,
            sequence: entry.command.sequence,
            sourceInstance: this.targetInstance,
            status: 'failed',
            controllerApplied: false,
            physicalImplementationConfirmed: false,
            active: entry.command.active,
            requestedLimitW: entry.command.limitW,
            effectiveTotalCapW: null,
            receivedAtMs: entry.command.receivedAtMs,
            acceptedAtMs,
            acceptanceLatencyMs: Math.max(0, acceptedAtMs - entry.command.receivedAtMs),
            appliedAtMs: now,
            controlLatencyMs: Math.max(0, now - entry.command.receivedAtMs),
            feedbackCreatedAtMs: now,
            feedbackLatencyMs: Math.max(0, now - entry.command.receivedAtMs),
            reason: `No final EOS implementation feedback within ${Math.max(1500, Number(entry.command.implementationTimeoutMs) || this.config.nexowattImplementationTimeoutMs)} ms.`,
            details: { timeout: true },
        };
        this.background(this.publishImplementation(feedback));
        this.rememberImplementation(feedback.commandId, feedback);
        await this.onImplementation(feedback, entry);
        this.removePending(entry.command.commandId);
    }
    clearPendingTimer(entry) {
        if (!entry.timeout)
            return;
        this.adapter.clearTimeout(entry.timeout);
        entry.timeout = undefined;
    }
    removePending(commandId) {
        const entry = this.pending.get(commandId);
        if (entry)
            this.clearPendingTimer(entry);
        this.pending.delete(commandId);
        this.background(this.setState('bridge.pendingCount', this.pending.size));
    }
    async publishStaticStates() {
        await this.setState('bridge.enabled', this.config.nexowattBridgeEnabled);
        await this.setState('bridge.readyForControl', false);
        await this.setState('bridge.targetInstance', this.targetInstance);
        await this.setState('bridge.apiVersion', exports.NEXOWATT_PARA14A_API_VERSION);
        await this.setState('bridge.manualDatapointMappingRequired', false);
        await this.setState('bridge.acceptanceTargetMs', this.config.nexowattAcceptanceTargetMs);
        await this.setState('bridge.controlTargetMs', this.config.nexowattControlTargetMs);
        await this.setState('bridge.feedbackTargetMs', this.config.nexowattFeedbackTargetMs);
        await this.setState('bridge.implementationTimeoutMs', this.config.nexowattImplementationTimeoutMs);
        await this.setState('bridge.clsHeartbeatTimeoutMs', this.config.clsHeartbeatTimeoutSec * 1000);
        await this.setState('bridge.status', this.config.nexowattBridgeEnabled ? 'starting' : 'disabled');
    }
    async publishCommand(packet) {
        await this.setState('cls.active', packet.active);
        await this.setState('cls.limitW', packet.limitW ?? 0);
        await this.setState('cls.commandId', packet.commandId);
        await this.setState('cls.sourceDeviceId', packet.sourceDeviceId);
        await this.setState('cls.receivedAt', packet.receivedAtMs);
        await this.setState('cls.validUntil', packet.validUntilMs ?? 0);
        await this.setState('cls.failsafeLimitW', packet.failsafeLimitW ?? 0);
        await this.setState('cls.failsafeDurationMs', packet.failsafeDurationMs ?? 0);
        await this.setState('cls.failsafeActive', packet.reason === 'bridge-failsafe');
        if (packet.heartbeatAtMs) {
            await this.setState('cls.heartbeatLastAt', packet.heartbeatAtMs);
            await this.setState('cls.heartbeatAgeMs', Math.max(0, Date.now() - packet.heartbeatAtMs));
            await this.setState('cls.heartbeatHealthy', Date.now() - packet.heartbeatAtMs <= packet.heartbeatTimeoutMs);
        }
        await this.setState('bridge.lastCommandId', packet.commandId);
        await this.setState('bridge.lastCommandJson', (0, sanitizer_1.jsonStringifySafe)(packet));
        await this.setState('bridge.pendingCount', this.pending.size);
        await this.setState('bridge.commandCount', this.commandCount);
    }
    async publishAcceptance(response, receivedAtMs) {
        const latency = finiteOrNull(response.acceptanceLatencyMs)
            ?? Math.max(0, Date.now() - receivedAtMs);
        await this.setState('bridge.lastAcceptanceLatencyMs', latency);
        await this.setState('bridge.lastAccepted', response.accepted === true);
        await this.setState('bridge.lastResult', response.accepted ? 'accepted' : 'rejected');
        await this.setState('bridge.timingAcceptanceOk', response.accepted === true && latency <= this.config.nexowattAcceptanceTargetMs);
        await this.setState('bridge.lastError', response.accepted ? '' : String(response.error || response.reason || 'rejected'));
        await this.setState('bridge.pendingCount', this.pending.size);
        await this.setState('bridge.rejectedCount', this.rejectedCount);
    }
    async publishImplementation(feedback) {
        const feedbackCreatedAtMs = Number(feedback.feedbackCreatedAtMs) || Date.now();
        const receivedAtMs = Number(feedback.receivedAtMs)
            || Number(feedback.acceptedAtMs)
            || feedbackCreatedAtMs;
        const appliedAtMs = Number(feedback.appliedAtMs) || feedbackCreatedAtMs;
        const controlLatency = Math.max(0, Number(feedback.controlLatencyMs) || (appliedAtMs - receivedAtMs));
        const feedbackLatency = Math.max(0, Number(feedback.feedbackLatencyMs) || (feedbackCreatedAtMs - receivedAtMs));
        await this.setState('bridge.lastControlLatencyMs', controlLatency);
        await this.setState('bridge.lastFeedbackLatencyMs', feedbackLatency);
        await this.setState('bridge.timingControlOk', controlLatency <= this.config.nexowattControlTargetMs);
        await this.setState('bridge.timingFeedbackOk', feedbackLatency <= this.config.nexowattFeedbackTargetMs);
        await this.setState('bridge.lastResult', feedback.status);
        await this.setState('bridge.lastError', feedback.controllerApplied === true ? '' : String(feedback.reason || feedback.status));
        await this.setState('bridge.lastImplementationJson', (0, sanitizer_1.jsonStringifySafe)(feedback));
        await this.setState('bridge.pendingCount', this.pending.size);
        await this.setState('bridge.implementedCount', this.implementedCount);
        await this.setState('bridge.timeoutCount', this.timeoutCount);
    }
    isExpectedSender(from) {
        const normalized = String(from || '')
            .trim()
            .toLowerCase()
            .replace(/^system\.adapter\./, '');
        return normalized === this.targetInstance.toLowerCase();
    }
    async setState(id, value) {
        await this.adapter.setStateAsync(id, { val: value, ack: true });
    }
    background(promise) {
        void promise.catch(error => {
            try {
                this.adapter.log.debug(`NexoWatt §14a bridge diagnostics failed: ${String(error)}`);
            }
            catch (_error) {
                // Diagnostics must never interfere with the control path.
            }
        });
    }
    nextSequence() {
        this.sequence += 1;
        if (this.sequence > 2147483640)
            this.sequence = 1;
        return this.sequence;
    }
    prunePending() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, context] of this.pending.entries()) {
            if (context.command.issuedAtMs < cutoff)
                this.removePending(id);
        }
        while (this.pending.size > 128) {
            const first = this.pending.keys().next().value;
            if (!first)
                break;
            this.removePending(first);
        }
        for (const [id, entry] of this.recentAcceptances.entries()) {
            if (entry.expiresAtMs <= Date.now())
                this.recentAcceptances.delete(id);
        }
        while (this.recentAcceptances.size > 256) {
            const first = this.recentAcceptances.keys().next().value;
            if (!first)
                break;
            this.recentAcceptances.delete(first);
        }
    }
    rememberAcceptance(commandId, response) {
        const previous = this.recentAcceptances.get(commandId);
        this.recentAcceptances.set(commandId, {
            ...previous,
            response: { ...response },
            expiresAtMs: Date.now() + 10 * 60 * 1000,
        });
    }
    rememberImplementation(commandId, feedback) {
        const previous = this.recentAcceptances.get(commandId);
        if (!previous)
            return;
        this.recentAcceptances.set(commandId, {
            ...previous,
            feedback: { ...feedback },
            expiresAtMs: Date.now() + 10 * 60 * 1000,
        });
    }
}
exports.NexoWattPara14aBridge = NexoWattPara14aBridge;
function normalizeImplementationFeedback(value) {
    const rec = value && typeof value === 'object' ? value : null;
    if (!rec
        || rec.schema !== exports.NEXOWATT_PARA14A_IMPLEMENTATION
        || Number(rec.apiVersion) !== exports.NEXOWATT_PARA14A_API_VERSION)
        return null;
    const commandId = String(rec.commandId || '').trim();
    if (!commandId)
        return null;
    const status = String(rec.status || 'failed');
    if (!['applied', 'released', 'degraded', 'failed', 'superseded'].includes(status))
        return null;
    return {
        ...rec,
        schema: exports.NEXOWATT_PARA14A_IMPLEMENTATION,
        apiVersion: 1,
        commandId,
        sequence: Math.max(0, Math.round(Number(rec.sequence) || 0)),
        status,
        controllerApplied: rec.controllerApplied === true,
        physicalImplementationConfirmed: rec.physicalImplementationConfirmed === true,
        active: rec.active === true,
        requestedLimitW: finiteOrNull(rec.requestedLimitW),
        effectiveTotalCapW: finiteOrNull(rec.effectiveTotalCapW),
        actualSteuVEPowerW: finiteOrNull(rec.actualSteuVEPowerW),
        evcsActualPowerW: finiteOrNull(rec.evcsActualPowerW),
        gridPowerW: finiteOrNull(rec.gridPowerW),
        receivedAtMs: Math.max(0, Number(rec.receivedAtMs) || 0),
        acceptedAtMs: Math.max(0, Number(rec.acceptedAtMs) || 0),
        acceptanceLatencyMs: Math.max(0, Number(rec.acceptanceLatencyMs) || 0),
        tickStartedAtMs: Math.max(0, Number(rec.tickStartedAtMs ?? rec.controllerTickStartedAtMs) || 0),
        controllerTickStartedAtMs: Math.max(0, Number(rec.controllerTickStartedAtMs ?? rec.tickStartedAtMs) || 0),
        appliedAtMs: Math.max(0, Number(rec.appliedAtMs ?? rec.controllerAppliedAtMs) || Date.now()),
        controllerAppliedAtMs: Math.max(0, Number(rec.controllerAppliedAtMs ?? rec.appliedAtMs) || Date.now()),
        controlLatencyMs: Math.max(0, Number(rec.controlLatencyMs ?? rec.controllerLatencyMs) || 0),
        controllerLatencyMs: Math.max(0, Number(rec.controllerLatencyMs ?? rec.controlLatencyMs) || 0),
        postAcceptanceControlLatencyMs: Math.max(0, Number(rec.postAcceptanceControlLatencyMs) || 0),
        feedbackCreatedAtMs: Math.max(0, Number(rec.feedbackCreatedAtMs ?? rec.feedbackAtMs) || Date.now()),
        feedbackAtMs: Math.max(0, Number(rec.feedbackAtMs ?? rec.feedbackCreatedAtMs) || Date.now()),
        feedbackLatencyMs: Math.max(0, Number(rec.feedbackLatencyMs) || 0),
        readbackVerified: rec.readbackVerified === true,
    };
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
//# sourceMappingURL=nexowattBridge.js.map