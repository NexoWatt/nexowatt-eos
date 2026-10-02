'use strict';

const assert = require('node:assert/strict');
const {
    ClsControlParser,
    buildSpineLimitReadbackDatagram,
    buildSpineResultDatagram,
} = require('../build/lib/clsControlParser');

function datagram(msgCounter, classifier, command, extraHeader = {}) {
    return {
        datagram: {
            header: {
                specificationVersion: '1.3.0',
                addressSource: { device: 7, entity: [1], feature: 4 },
                addressDestination: { device: 1, entity: [0], feature: 5 },
                msgCounter,
                ackRequest: true,
                cmdClassifier: classifier,
                ...extraHeader,
            },
            payload: { cmd: [command] },
        },
    };
}

const parser = new ClsControlParser();
const ctx = { deviceId: 'cls_box_1', sourceSki: 'AA:BB', receivedAtMs: 1_000_000 };

const limitEvents = parser.parse(datagram(10, 'write', {
    function: 'loadControlLimitListData',
    loadControlLimitListData: {
        loadControlLimitData: [{
            limitId: 3,
            limitType: 'consumptionActivePower',
            isLimitActive: true,
            value: { number: 4200, scale: 0 },
            timePeriod: { startTime: 'PT0S', endTime: 'PT30S' },
        }],
    },
}), ctx);
assert.equal(limitEvents.length, 1);
assert.equal(limitEvents[0].operation, 'limitConsumption');
assert.equal(limitEvents[0].active, true);
assert.equal(limitEvents[0].limitW, 4200);
assert.equal(limitEvents[0].expiresAtMs, ctx.receivedAtMs + 30_000);
assert.equal(limitEvents[0].correlation.ackRequest, true);
assert.deepEqual(limitEvents[0].correlation.limitIds, [3]);

// Multiple consumption limits are aggregated fail-restrictively; production
// limits belong to the separate EZA path and must not enter §14a consumption.
const aggregateEvents = parser.parse(datagram(10.5, 'write', {
    function: 'loadControlLimitListData',
    loadControlLimitListData: {
        loadControlLimitData: [
            { limitId: 30, limitType: 'consumptionActivePower', isLimitActive: true, value: { number: 8000, scale: 0 } },
            { limitId: 31, limitType: 'consumptionActivePower', isLimitActive: true, value: { number: 4200, scale: 0 } },
            { limitId: 32, limitType: 'productionActivePower', isLimitActive: true, value: { number: 0, scale: 0 } },
        ],
    },
}), { ...ctx, receivedAtMs: ctx.receivedAtMs + 50 });
assert.equal(aggregateEvents.length, 1);
assert.equal(aggregateEvents[0].limitW, 4200);
assert.deepEqual(aggregateEvents[0].correlation.limitIds, [30, 31]);

const releaseEvents = parser.parse(datagram(11, 'writePartial', {
    loadControlLimitListData: {
        loadControlLimitData: [{ limitId: 3, isLimitActive: false }],
    },
}), { ...ctx, receivedAtMs: ctx.receivedAtMs + 100 });
assert.equal(releaseEvents.length, 1);
assert.equal(releaseEvents[0].operation, 'release');
assert.equal(releaseEvents[0].active, false);
assert.equal(releaseEvents[0].limitW, null);

// Array-heavy SPINE JSON representation used by multiple field devices.
const arrayHeavy = [{ datagram: [{
    header: [
        { specificationVersion: '1.3.0' },
        { addressSource: [{ device: 7 }, { entity: [1] }, { feature: 4 }] },
        { addressDestination: [{ device: 1 }, { entity: [0] }, { feature: 5 }] },
        { msgCounter: 12 },
        { ackRequest: true },
        { cmdClassifier: 'write' },
    ],
    payload: [{ cmd: [[
        { function: 'loadControlLimitListData' },
        { loadControlLimitListData: [{ loadControlLimitData: [[
            { limitId: 4 },
            { isLimitActive: true },
            { value: [{ number: 3500 }, { scale: 0 }] },
        ]] }] },
    ]] }],
}] }];
const arrayEvents = parser.parse(arrayHeavy, { ...ctx, receivedAtMs: ctx.receivedAtMs + 200 });
assert.equal(arrayEvents.length, 1);
assert.equal(arrayEvents[0].limitW, 3500);
assert.deepEqual(arrayEvents[0].correlation.limitIds, [4]);

// DeviceConfiguration and heartbeat memory are attached to the next LPC command.
parser.parse(datagram(20, 'notify', {
    deviceConfigurationKeyValueDescriptionListData: {
        deviceConfigurationKeyValueDescriptionData: [
            { keyId: 1, keyName: 'FailsafeConsumptionActivePowerLimit' },
            { keyId: 2, keyName: 'FailsafeDurationMinimum' },
        ],
    },
}), ctx);
const configEvents = parser.parse(datagram(21, 'notify', {
    deviceConfigurationKeyValueListData: {
        deviceConfigurationKeyValueData: [
            { keyId: 1, value: { scaledNumber: { number: 3000, scale: 0 } } },
            { keyId: 2, value: { duration: 'PT2H' } },
        ],
    },
}), ctx);
assert.equal(configEvents.length, 1);
assert.equal(configEvents[0].operation, 'failsafeConfiguration');
assert.equal(configEvents[0].failsafeLimitW, 3000);
assert.equal(configEvents[0].failsafeDurationMs, 7_200_000);

const heartbeatAt = Date.parse('2026-08-05T17:00:00.000Z');
const heartbeatEvents = parser.parse(datagram(22, 'notify', {
    deviceDiagnosisHeartbeatData: {
        timestamp: '2026-08-05T17:00:00.000Z',
        heartbeatTimeout: 'PT45S',
        heartbeatCounter: 8,
    },
}), ctx);
assert.equal(heartbeatEvents.length, 1);
assert.equal(heartbeatEvents[0].operation, 'heartbeat');
assert.equal(heartbeatEvents[0].heartbeatAtMs, heartbeatAt);
assert.equal(heartbeatEvents[0].heartbeatTimeoutMs, 45_000);

const inherited = parser.parse(datagram(23, 'write', {
    loadControlLimitListData: {
        loadControlLimitData: [{ limitId: 9, isLimitActive: true, value: { number: 6000, scale: 0 } }],
    },
}), { ...ctx, receivedAtMs: ctx.receivedAtMs + 300 })[0];
assert.equal(inherited.failsafeLimitW, 3000);
assert.equal(inherited.failsafeDurationMs, 7_200_000);
assert.equal(inherited.heartbeatAtMs, heartbeatAt);
assert.equal(inherited.heartbeatTimeoutMs, 45_000);

const result = buildSpineResultDatagram(inherited, 100, 0, 'implemented');
assert.equal(result.datagram.header.msgCounterReference, 23);
assert.equal(result.datagram.payload.cmd[0].resultData.errorNumber, 0);
const readback = buildSpineLimitReadbackDatagram(inherited, 101, true, 5900);
assert.equal(readback.datagram.payload.cmd[0].loadControlLimitListData.loadControlLimitData[0].value.number, 5900);

console.log('CLS control parser tests passed.');
