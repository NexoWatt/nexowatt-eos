'use strict';

const assert = require('node:assert/strict');
const { getConfig } = require('../build/lib/config');
const {
    NexoWattPara14aBridge,
    NEXOWATT_PARA14A_COMMAND,
    NEXOWATT_PARA14A_HELLO,
    NEXOWATT_PARA14A_IMPLEMENTATION,
} = require('../build/lib/nexowattBridge');

class FakeAdapter {
    constructor({ readyForControl = true, dropControlCallback = false, controlCallbackDelayMs = 0 } = {}) {
        this.namespace = 'eebus.0';
        this.host = 'host-a';
        this.readyForControl = readyForControl;
        this.dropControlCallback = dropControlCallback;
        this.controlCallbackDelayMs = controlCallbackDelayMs;
        this.log = { debug() {}, warn() {}, info() {}, error() {} };
        this.states = new Map();
        this.requests = [];
    }
    setTimeout(fn, ms) { return setTimeout(fn, ms); }
    clearTimeout(timer) { clearTimeout(timer); }
    setInterval(fn, ms) { return setInterval(fn, ms); }
    clearInterval(timer) { clearInterval(timer); }
    async setStateAsync(id, state) { this.states.set(id, state.val); }
    async getForeignObjectsAsync() {
        return {
            'system.adapter.nexowatt-ui.0': { common: { enabled: true, host: 'host-a' } },
        };
    }
    sendTo(target, command, message, callback) {
        this.requests.push({ target, command, message });
        if (command === NEXOWATT_PARA14A_HELLO) {
            callback({
                accepted: true,
                apiVersion: 1,
                adapterVersion: '0.8.156',
                readyForControl: this.readyForControl,
                readiness: {
                    ready: this.readyForControl,
                    reason: this.readyForControl ? '' : '§14a App is not enabled.',
                },
            });
            return;
        }
        if (command === NEXOWATT_PARA14A_COMMAND) {
            if (this.dropControlCallback) return;
            const response = {
                schema: NEXOWATT_PARA14A_COMMAND,
                apiVersion: 1,
                accepted: true,
                queued: true,
                commandId: message.commandId,
                acceptedAtMs: message.receivedAtMs + 20,
                acceptanceLatencyMs: 20,
            };
            if (this.controlCallbackDelayMs > 0) {
                setTimeout(() => callback(response), this.controlCallbackDelayMs);
            } else {
                callback(response);
            }
            return;
        }
        callback?.({ accepted: true });
    }
}

function clsCommand(id, active = true) {
    const now = Date.now();
    return {
        apiVersion: 1,
        protocol: 'nexowatt-eebus-para14a',
        commandId: id,
        operation: active ? 'limitConsumption' : 'release',
        active,
        limitW: active ? 4200 : null,
        failsafeLimitW: 3000,
        failsafeDurationMs: 7_200_000,
        heartbeatTimeoutMs: 60_000,
        heartbeatAtMs: now,
        receivedAtMs: now - 10,
        effectiveFromMs: now,
        expiresAtMs: now + 60_000,
        sourceDeviceId: 'cls_box_1',
        sourceSki: 'AA:BB',
        correlation: {
            specificationVersion: '1.3.0',
            msgCounter: 17,
            ackRequest: true,
            cmdClassifier: 'write',
            functionName: 'loadControlLimitListData',
            sourceAddress: { device: 7 },
            destinationAddress: { device: 1 },
            limitIds: [1],
        },
        rawSummary: {},
    };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const adapter = new FakeAdapter();
    const config = getConfig({
        nexowattBridgeEnabled: true,
        nexowattUiInstance: 'auto',
        nexowattBridgeHeartbeatSec: 300,
        nexowattBridgeRequestTimeoutMs: 750,
        nexowattImplementationTimeoutMs: 5000,
        autoApplyClsLimits: true,
    });
    const implementations = [];
    const bridge = new NexoWattPara14aBridge(adapter, config, async (feedback, context) => {
        implementations.push({ feedback, context });
    });
    await bridge.start();
    assert.equal(adapter.states.get('bridge.connected'), true);
    assert.equal(adapter.states.get('bridge.readyForControl'), true);
    assert.equal(adapter.states.get('bridge.status'), 'direct-api-ready');
    const hello = adapter.requests.find((entry) => entry.command === NEXOWATT_PARA14A_HELLO);
    assert.equal(hello.message.bridgeHeartbeatSec, 300);
    assert.deepEqual(hello.message.timingTargetsMs, {
        acceptance: 250,
        controllerApply: 1000,
        implementationFeedback: 1500,
    });

    const command = clsCommand('cmd-1');
    const accepted = await bridge.dispatchLimit(command, 'lpc');
    assert.equal(accepted.accepted, true);
    const sent = adapter.requests.find((entry) => entry.command === NEXOWATT_PARA14A_COMMAND && entry.message.commandId === 'cmd-1');
    assert.ok(sent);
    assert.equal(sent.message.implementationTimeoutMs, 5000);
    assert.equal(sent.message.mode, 'ems');

    const nullMetadataCommand = clsCommand('cmd-null-metadata');
    nullMetadataCommand.failsafeLimitW = null;
    nullMetadataCommand.failsafeDurationMs = null;
    nullMetadataCommand.heartbeatAtMs = null;
    nullMetadataCommand.correlation.msgCounter = null;
    const nullMetadataAcceptance = await bridge.dispatchLimit(nullMetadataCommand, 'lpc');
    assert.equal(nullMetadataAcceptance.accepted, true);
    const nullMetadataPacket = adapter.requests.find(
        (entry) => entry.command === NEXOWATT_PARA14A_COMMAND && entry.message.commandId === 'cmd-null-metadata',
    ).message;
    assert.equal(nullMetadataPacket.failsafeLimitW, null);
    assert.equal(nullMetadataPacket.failsafeDurationMs, null);
    assert.equal(nullMetadataPacket.heartbeatAtMs, null);
    assert.equal(nullMetadataPacket.sourceMsgCounter, null);

    // Retransmission with the same command ID must not issue a second EOS write.
    const countBeforeDuplicate = adapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length;
    const duplicate = await bridge.dispatchLimit(command, 'lpc');
    assert.equal(duplicate.accepted, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(adapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length, countBeforeDuplicate);

    const receivedAtMs = sent.message.receivedAtMs;
    const appliedAtMs = receivedAtMs + 90;
    const feedbackCreatedAtMs = receivedAtMs + 110;
    const feedbackResult = await bridge.handleMessage(NEXOWATT_PARA14A_IMPLEMENTATION, {
        schema: NEXOWATT_PARA14A_IMPLEMENTATION,
        apiVersion: 1,
        commandId: 'cmd-1',
        sequence: sent.message.sequence,
        status: 'applied',
        controllerApplied: true,
        physicalImplementationConfirmed: false,
        active: true,
        requestedLimitW: 4200,
        effectiveTotalCapW: 4200,
        actualSteuVEPowerW: null,
        evcsActualPowerW: 3900,
        receivedAtMs,
        acceptedAtMs: accepted.acceptedAtMs,
        acceptanceLatencyMs: 20,
        tickStartedAtMs: receivedAtMs + 25,
        appliedAtMs,
        controlLatencyMs: 90,
        postAcceptanceControlLatencyMs: 70,
        feedbackCreatedAtMs,
        feedbackLatencyMs: 110,
    }, 'system.adapter.nexowatt-ui.0');
    assert.equal(feedbackResult.accepted, true);
    assert.equal(implementations.length, 1);
    assert.equal(implementations[0].context.clsCommand.commandId, 'cmd-1');
    assert.equal(implementations[0].feedback.evcsActualPowerW, 3900);
    assert.equal(adapter.states.get('bridge.lastControlLatencyMs'), 90);
    assert.equal(adapter.states.get('bridge.lastFeedbackLatencyMs'), 110);
    assert.equal(bridge.contextFor('cmd-1'), undefined);

    // A completed duplicate is answered from the idempotency cache without a
    // second EOS write, while the final implementation result is replayed.
    const implementationCountBeforeReplay = implementations.length;
    const eosWriteCountBeforeReplay = adapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length;
    const completedDuplicate = await bridge.dispatchLimit(command, 'lpc');
    assert.equal(completedDuplicate.duplicate, true);
    await sleep(10);
    assert.equal(implementations.length, implementationCountBeforeReplay + 1);
    assert.equal(adapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length, eosWriteCountBeforeReplay);

    const invalidSender = await bridge.handleMessage(NEXOWATT_PARA14A_IMPLEMENTATION, {
        schema: NEXOWATT_PARA14A_IMPLEMENTATION,
        apiVersion: 1,
        commandId: 'x',
        sequence: 1,
        status: 'failed',
        controllerApplied: false,
        active: true,
        requestedLimitW: 4200,
        effectiveTotalCapW: null,
        acceptedAtMs: Date.now(),
        appliedAtMs: Date.now(),
        controlLatencyMs: 0,
    }, 'system.adapter.other.0');
    assert.equal(invalidSender.accepted, false);

    const timeoutCommand = clsCommand('cmd-timeout');
    const timeoutAcceptance = await bridge.dispatchLimit(timeoutCommand, 'lpc');
    assert.equal(timeoutAcceptance.accepted, true);
    const pending = bridge.contextFor('cmd-timeout');
    assert.ok(pending);
    await bridge.handleImplementationTimeout(pending);
    assert.equal(implementations.at(-1).feedback.status, 'failed');
    assert.equal(implementations.at(-1).feedback.controllerApplied, false);
    assert.equal(bridge.contextFor('cmd-timeout'), undefined);

    await bridge.stop();

    // A genuine retransmission may arrive before the first ioBroker callback.
    // Both callers must share the same in-flight acceptance and only one EOS
    // control message may be emitted.
    const inFlightAdapter = new FakeAdapter({ controlCallbackDelayMs: 40 });
    const inFlightBridge = new NexoWattPara14aBridge(inFlightAdapter, config, async () => {});
    await inFlightBridge.start();
    const inFlightCommand = clsCommand('cmd-in-flight-duplicate');
    const firstInFlight = inFlightBridge.dispatchLimit(inFlightCommand, 'lpc');
    await sleep(5);
    const secondInFlight = inFlightBridge.dispatchLimit(inFlightCommand, 'lpc');
    const [firstInFlightResult, secondInFlightResult] = await Promise.all([firstInFlight, secondInFlight]);
    assert.equal(firstInFlightResult.accepted, true);
    assert.equal(secondInFlightResult.accepted, true);
    assert.equal(secondInFlightResult.duplicate, true);
    assert.equal(
        inFlightAdapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length,
        1,
        'an in-flight SPINE retransmission must share the original acceptance request',
    );
    await inFlightBridge.stop();

    const notReadyAdapter = new FakeAdapter({ readyForControl: false });
    const notReadyBridge = new NexoWattPara14aBridge(notReadyAdapter, config, async () => {});
    await notReadyBridge.start();
    assert.equal(notReadyAdapter.states.get('bridge.connected'), true);
    assert.equal(notReadyAdapter.states.get('bridge.readyForControl'), false);
    assert.equal(notReadyAdapter.states.get('bridge.status'), 'direct-api-connected-not-ready');
    assert.match(String(notReadyAdapter.states.get('bridge.lastError')), /not enabled/i);
    await notReadyBridge.stop();

    // A lost ioBroker callback must not cause a second time-critical control send.
    // The same SPINE command may be retransmitted later with the same commandId and
    // is then handled by the normal idempotency path.
    const droppedAdapter = new FakeAdapter({ dropControlCallback: true });
    const droppedConfig = getConfig({
        nexowattBridgeEnabled: true,
        nexowattUiInstance: 'auto',
        nexowattBridgeHeartbeatSec: 300,
        nexowattBridgeRequestTimeoutMs: 100,
        nexowattImplementationTimeoutMs: 5000,
        autoApplyClsLimits: true,
    });
    const droppedBridge = new NexoWattPara14aBridge(droppedAdapter, droppedConfig, async () => {});
    await droppedBridge.start();
    const droppedResult = await droppedBridge.dispatchLimit(clsCommand('cmd-lost-callback'), 'lpc');
    assert.equal(droppedResult.accepted, false);
    assert.equal(
        droppedAdapter.requests.filter((entry) => entry.command === NEXOWATT_PARA14A_COMMAND).length,
        1,
        'time-critical control command must be sent exactly once',
    );
    await droppedBridge.stop();

    console.log('NexoWatt direct bridge tests passed.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
