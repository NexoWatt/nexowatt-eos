'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getConfig } = require('../build/lib/config');
const { EebusRuntime } = require('../build/lib/eebusRuntime');

class FakeAdapter {
    constructor() {
        this.namespace = 'eebus.0';
        this.log = { debug() {}, warn() {}, info() {}, error() {} };
        this.states = new Map();
    }
    async setStateAsync(id, state) { this.states.set(id, state.val); }
}

function clsCommand(id) {
    const now = Date.now();
    return {
        apiVersion: 1,
        protocol: 'nexowatt-eebus-para14a',
        commandId: id,
        operation: 'limitConsumption',
        active: true,
        limitW: 4200,
        failsafeLimitW: 3000,
        failsafeDurationMs: 7_200_000,
        heartbeatTimeoutMs: 60_000,
        heartbeatAtMs: now,
        receivedAtMs: now - 30,
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

function feedback(commandId, status, controllerApplied) {
    const now = Date.now();
    return {
        schema: 'nexowatt.para14a.implementation.v1',
        apiVersion: 1,
        commandId,
        sequence: 1,
        status,
        controllerApplied,
        physicalImplementationConfirmed: false,
        active: true,
        requestedLimitW: 4200,
        effectiveTotalCapW: 4200,
        acceptedAtMs: now - 20,
        appliedAtMs: now,
        controlLatencyMs: 20,
        reason: controllerApplied ? '' : 'downstream write failed',
    };
}

(async () => {
    const adapter = new FakeAdapter();
    const runtime = new EebusRuntime(
        adapter,
        getConfig({ sendImplementationResultToCls: true }),
        { shipId: 'local', localSki: '11:22' },
        {},
    );
    const sent = [];
    runtime.endpoint = {
        sendSpine(deviceId, datagram) {
            sent.push({ deviceId, datagram });
            return true;
        },
    };

    const successCommand = clsCommand('cmd-success');
    await runtime.handleBridgeImplementation(
        feedback('cmd-success', 'applied', true),
        { command: {}, clsCommand: successCommand },
    );
    assert.equal(sent.length, 2, 'success must send final ResultData followed by effective readback');
    assert.equal(sent[0].datagram.datagram.payload.cmd[0].resultData.errorNumber, 0);
    assert.equal(sent[1].datagram.datagram.payload.cmd[0].function, 'loadControlLimitListData');

    sent.length = 0;
    const noReadbackRuntime = new EebusRuntime(
        adapter,
        getConfig({ sendImplementationResultToCls: false }),
        { shipId: 'local', localSki: '11:22' },
        {},
    );
    noReadbackRuntime.endpoint = runtime.endpoint;
    const noReadbackCommand = clsCommand('cmd-no-readback');
    await noReadbackRuntime.handleBridgeImplementation(
        feedback('cmd-no-readback', 'applied', true),
        { command: {}, clsCommand: noReadbackCommand },
    );
    assert.equal(sent.length, 1, 'correlated final ResultData is mandatory; readback toggle may suppress only the extra notify');
    assert.equal(sent[0].datagram.datagram.payload.cmd[0].resultData.errorNumber, 0);

    sent.length = 0;
    const degradedCommand = clsCommand('cmd-degraded');
    await runtime.handleBridgeImplementation(
        feedback('cmd-degraded', 'degraded', false),
        { command: {}, clsCommand: degradedCommand },
    );
    assert.equal(sent.length, 1, 'degraded implementation must send only a negative correlated result');
    assert.equal(sent[0].datagram.datagram.payload.cmd[0].resultData.errorNumber, 7);

    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'eebusRuntime.ts'), 'utf8');
    const acceptanceSection = source.slice(
        source.indexOf('const acceptance = await this.bridge!.dispatchLimit'),
        source.indexOf('private async publishClsOutcome'),
    );
    assert.doesNotMatch(acceptanceSection, /acceptance\.accepted\s*\?\s*0\s*:\s*7/);
    assert.match(acceptanceSection, /command\.correlation\.ackRequest && !acceptance\.accepted/);

    // writePartial may carry the active flag and limit ID without repeating the
    // numeric limit. The runtime must inherit only the last accepted value from
    // the same trusted peer; null must never be coerced to a numeric zero.
    const partialRuntime = new EebusRuntime(
        adapter,
        getConfig({ allowCommandsToUntrustedDevices: true, autoApplyClsLimits: true }),
        { shipId: 'local', localSki: '11:22' },
        {},
    );
    const partialDispatches = [];
    partialRuntime.bridge = {
        async dispatchLimit(command, reason) {
            partialDispatches.push({ command, reason });
            return {
                accepted: true,
                queued: true,
                commandId: command.commandId,
                acceptedAtMs: Date.now(),
                acceptanceLatencyMs: 0,
            };
        },
    };
    const priorCommand = clsCommand('cmd-prior-limit');
    const partialSource = partialRuntime.getClsState('cls_box_1');
    partialSource.lastCommand = priorCommand;
    partialSource.lastRegularCommand = priorCommand;
    const partialCommand = {
        ...clsCommand('cmd-partial-limit'),
        limitW: null,
        rawSummary: { partial: true },
    };
    await partialRuntime.processClsEvent('cls_box_1', partialCommand);
    assert.equal(partialDispatches.length, 1);
    assert.equal(partialDispatches[0].command.limitW, 4200);
    assert.equal(partialDispatches[0].command.correlation.ackRequest, true);
    assert.equal(
        partialDispatches[0].command.rawSummary.mergedPartialValueFromCommandId,
        priorCommand.commandId,
    );

    // A locally synthesized failsafe-expiry transition must use the same direct
    // EOS path, but it must not emit a second ResultData correlated to the old
    // SPINE write. It is released exactly once after the configured duration.
    const expiryRuntime = new EebusRuntime(
        adapter,
        getConfig({ sendImplementationResultToCls: true }),
        { shipId: 'local', localSki: '11:22' },
        {},
    );
    const expiryDispatches = [];
    expiryRuntime.bridge = {
        async dispatchLimit(command, reason) {
            expiryDispatches.push({ command, reason });
            return {
                accepted: true,
                queued: true,
                commandId: command.commandId,
                acceptedAtMs: Date.now(),
                acceptanceLatencyMs: 0,
            };
        },
    };
    const expiredBase = clsCommand('cmd-failsafe-duration');
    const now = Date.now();
    expiryRuntime.clsSources.set('cls_box_1', {
        deviceId: 'cls_box_1',
        lastCommand: expiredBase,
        lastRegularCommand: expiredBase,
        lastHeartbeatAtMs: now - 121_000,
        heartbeatTimeoutMs: 60_000,
        failsafeLimitW: 3000,
        failsafeDurationMs: 7_200_000,
        failsafeActive: true,
        failsafeActivatedAtMs: now - 7_200_001,
        failsafeExpiredForCommandId: '',
        failsafeRecoveryNoticeAtMs: 0,
        transitionInFlight: false,
        expiryReleasedForCommandId: '',
        lastHeartbeatDiagAtMs: 0,
        lastHeartbeatHealthy: false,
    });
    await expiryRuntime.superviseClsSources();
    assert.equal(expiryDispatches.length, 1);
    assert.equal(expiryDispatches[0].reason, 'failsafe-duration-expired');
    assert.equal(expiryDispatches[0].command.operation, 'release');
    assert.equal(expiryDispatches[0].command.active, false);
    assert.equal(expiryDispatches[0].command.limitW, null);
    assert.equal(expiryDispatches[0].command.correlation.ackRequest, false);
    assert.equal(expiryDispatches[0].command.rawSummary.synthesizedReason, 'failsafe-duration-expired');
    assert.equal(expiryRuntime.clsSources.get('cls_box_1').failsafeActive, false);
    assert.equal(
        expiryRuntime.clsSources.get('cls_box_1').failsafeExpiredForCommandId,
        expiredBase.commandId,
    );
    await expiryRuntime.superviseClsSources();
    assert.equal(expiryDispatches.length, 1, 'expired failsafe must not be re-applied or released repeatedly');

    console.log('Final SPINE implementation result ordering tests passed.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
