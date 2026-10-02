#!/usr/bin/env node
'use strict';
const path = require('path');
const policy = require(path.join(__dirname, '..', 'adminWww/js/eos-manual-write-policy.js'));
const fail = message => { throw new Error(`[NexoWatt EOS manual write policy selftest] ${message}`); };
const state = (type, role = 'state', extra = {}) => ({
    _id: extra._id || 'test.0.state',
    type: 'state',
    common: { name: 'Test', read: true, write: true, type, role, ...extra.common },
    native: extra.native || {},
});
const item = data => ({ data: data || {} });
const eq = (actual, expected, message) => {
    const a = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
    const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
    if (a !== e) fail(`${message}: expected ${e}, got ${a}`);
};

(async () => {
    for (const name of [
        'getWriteBehavior', 'getDirectWriteValue', 'prepareEditor', 'parseEditorValue',
        'getBinaryOptions', 'isExpertOnlyState', 'toBoolean', 'resolveDirectWriteValue', 'writeManualState',
    ]) if (typeof policy[name] !== 'function') fail(`missing ${name}`);

    const ro = state('number'); ro.common.write = false;
    eq(policy.getWriteBehavior(ro._id, ro, item(), true), 'readonly', 'read-only state became writable');

    const bool = state('boolean', 'switch');
    eq(policy.getWriteBehavior(bool._id, bool, item({ switch: true }), false), 'switch', 'boolean switch behavior');
    eq(policy.getDirectWriteValue(bool._id, bool, item({ switch: true }), false, 'switch'), true, 'boolean switch ON');
    eq(policy.getDirectWriteValue(bool._id, bool, item({ switch: true }), true, 'switch'), false, 'boolean switch OFF');
    eq(policy.getDirectWriteValue(bool._id, bool, item({ switch: true }), 'true', 'switch'), false, 'boolean string true switch OFF');
    eq(policy.getDirectWriteValue(bool._id, bool, item({ switch: true }), 1, 'switch'), false, 'boolean numeric one switch OFF');
    eq(policy.getDirectWriteValue(bool._id, bool, item({ switch: true }), 'false', 'switch'), true, 'boolean string false switch ON');

    const numeric = state('number', 'switch', { common: { states: { 0: 'OFF', 1: 'ON' } } });
    eq(policy.getDirectWriteValue(numeric._id, numeric, item({ switch: true }), 0, 'switch'), 1, 'numeric switch ON');
    eq(policy.getDirectWriteValue(numeric._id, numeric, item({ switch: true }), 1, 'switch'), 0, 'numeric switch OFF');

    const strings = state('string', 'switch', { common: { states: { OFF: 'Aus', ON: 'Ein' } } });
    eq(policy.getDirectWriteValue(strings._id, strings, item({ switch: true }), 'OFF', 'switch'), 'ON', 'string switch ON');
    eq(policy.getDirectWriteValue(strings._id, strings, item({ switch: true }), 'ON', 'switch'), 'OFF', 'string switch OFF');

    const multi = state('number', 'switch', { common: { states: { 0: 'Off', 1: 'Auto', 2: 'On' } } });
    eq(policy.getWriteBehavior(multi._id, multi, item({ switch: true }), true), 'dialog', 'multi-state switch must use dialog');

    const boolButton = state('boolean', 'button');
    eq(policy.getDirectWriteValue(boolButton._id, boolButton, item({ button: true }), false, 'button'), true, 'boolean button value');
    const idleFalseButton = state('boolean', 'button', { _id: 'ocpp21.0.station.control.hardReset', common: { def: false } });
    eq(policy.getDirectWriteValue(idleFalseButton._id, idleFalseButton, item({ button: true }), false, 'button'), true, 'boolean button def=false must trigger true');
    const idleZeroButton = state('number', 'button', { common: { def: 0 } });
    eq(policy.getDirectWriteValue(idleZeroButton._id, idleZeroButton, item({ button: true }), 0, 'button'), 1, 'number button def=0 must trigger active value');
    const explicitFalseButton = state('boolean', 'button', { native: { nexowatt: { manualTriggerValue: false } } });
    eq(policy.getDirectWriteValue(explicitFalseButton._id, explicitFalseButton, item({ button: true }), true, 'button'), false, 'explicit false trigger value');
    const numericButton = state('number', 'button');
    eq(policy.getDirectWriteValue(numericButton._id, numericButton, item({ button: true }), null, 'button'), 1, 'numeric button value');
    const defaultButton = state('string', 'button', { common: { def: 'START' } });
    eq(policy.getDirectWriteValue(defaultButton._id, defaultButton, item({ button: true }), null, 'button'), 'START', 'button common.def');
    const objectButton = state('object', 'button', { common: { def: { command: 'start' } } });
    eq(policy.getWriteBehavior(objectButton._id, objectButton, item({ button: true }), true), 'button', 'object button with common.def');
    eq(policy.getDirectWriteValue(objectButton._id, objectButton, item({ button: true }), null, 'button'), { command: 'start' }, 'object button common.def');

    const scalar = state('number', 'level.temperature');
    eq(policy.getWriteBehavior(scalar._id, scalar, item(), false), 'dialog', 'safe scalar behavior');
    const prepNumber = policy.prepareEditor(scalar, 21.5);
    eq(prepNumber.editorType, 'number', 'number editor type');
    eq(policy.parseEditorValue(scalar, prepNumber.editorType, '22,75'), 22.75, 'number comma parsing');

    const enumState = state('number', 'level', { common: { states: { 0: 'Auto', 1: 'Manual' } } });
    const prepEnum = policy.prepareEditor(enumState, 0);
    eq(prepEnum.editorType, 'states', 'enum editor type');
    eq(policy.parseEditorValue(enumState, prepEnum.editorType, '1'), 1, 'numeric enum parsing');

    const arrayEnum = state('number', 'level', { common: { states: ['Aus', 'Ein'] } });
    eq(policy.normalizeStates(arrayEnum.common.states), [{ key: '0', label: 'Aus' }, { key: '1', label: 'Ein' }], 'array common.states normalization');
    eq(policy.parseEditorValue(arrayEnum, 'states', '1'), 1, 'array enum numeric parsing');

    const legacyEnum = state('string', 'level', { common: { states: 'OFF:Aus;AUTO:Automatik;ON:Ein' } });
    eq(policy.normalizeStates(legacyEnum.common.states), [
        { key: 'OFF', label: 'Aus' },
        { key: 'AUTO', label: 'Automatik' },
        { key: 'ON', label: 'Ein' },
    ], 'legacy common.states normalization');
    eq(policy.parseEditorValue(legacyEnum, 'states', 'AUTO'), 'AUTO', 'legacy enum string parsing');

    const limited = state('number', 'level.temperature', { common: { min: 5, max: 30 } });
    eq(policy.parseEditorValue(limited, 'number', '20,5'), 20.5, 'number min/max accepted');
    let belowRejected = false;
    try { policy.parseEditorValue(limited, 'number', '4.9'); } catch { belowRejected = true; }
    if (!belowRejected) fail('number below common.min was accepted');
    let aboveRejected = false;
    try { policy.parseEditorValue(limited, 'number', '30.1'); } catch { aboveRejected = true; }
    if (!aboveRejected) fail('number above common.max was accepted');

    const arrayState = state('array');
    const prepArray = policy.prepareEditor(arrayState, [1, 2]);
    eq(prepArray.editorType, 'json', 'array editor type');
    eq(policy.parseEditorValue(arrayState, prepArray.editorType, '[3,4]'), [3, 4], 'array parsing');
    let arrayRejected = false;
    try { policy.parseEditorValue(arrayState, 'json', '{"x":1}'); } catch { arrayRejected = true; }
    if (!arrayRejected) fail('array accepted a JSON object');

    const objectState = state('object');
    const prepObject = policy.prepareEditor(objectState, { a: 1 });
    eq(prepObject.editorType, 'json', 'object editor type');
    eq(policy.parseEditorValue(objectState, prepObject.editorType, '{"a":2}'), { a: 2 }, 'object parsing');

    const mixedState = state('mixed');
    eq(policy.prepareEditor(mixedState, null).editorType, 'json', 'mixed universal editor type');
    eq(policy.prepareEditor(mixedState, 'text').value, '"text"', 'mixed string JSON preparation');
    eq(policy.parseEditorValue(mixedState, 'json', '12.5'), 12.5, 'mixed number parsing');
    eq(policy.parseEditorValue(mixedState, 'json', 'true'), true, 'mixed boolean parsing');
    eq(policy.parseEditorValue(mixedState, 'json', '"text"'), 'text', 'mixed string parsing');
    eq(policy.parseEditorValue(mixedState, 'json', '{"a":1}'), { a: 1 }, 'mixed JSON parsing');

    const reset = state('boolean', 'button', { _id: 'ocpp.0.hardReset' });
    eq(policy.getWriteBehavior(reset._id, reset, item({ button: true }), false), 'expert-only', 'hard reset normal mode');
    eq(policy.getWriteBehavior(reset._id, reset, item({ button: true }), true), 'button', 'hard reset expert mode');
    const power = state('number', 'level.power', { _id: 'ess.0.chargePowerW' });
    eq(policy.getWriteBehavior(power._id, power, item(), false), 'expert-only', 'power setpoint normal mode');
    eq(policy.getWriteBehavior(power._id, power, item(), true), 'dialog', 'power setpoint expert mode');

    const explicitSafe = state('number', 'level.power', {
        _id: 'safe.0.power', common: { custom: { nexowatt: { manualWriteExpertOnly: false } } },
    });
    eq(policy.getWriteBehavior(explicitSafe._id, explicitSafe, item(), false), 'dialog', 'explicit safe override');

    const freshSocket = {
        getState: async () => ({ val: true, ack: true }),
        setState: async () => undefined,
    };
    eq(await policy.resolveDirectWriteValue(freshSocket, bool._id, bool, item({ switch: true }), false, 'switch'), false, 'fresh state must override stale switch cache');
    const encodedFreshSocket = { getState: async () => ({ val: '1', ack: true }) };
    eq(await policy.resolveDirectWriteValue(encodedFreshSocket, bool._id, bool, item({ switch: true }), false, 'switch'), false, 'fresh encoded true switch OFF');
    const failedFreshSocket = { getState: async () => { throw new Error('temporary'); } };
    eq(await policy.resolveDirectWriteValue(failedFreshSocket, bool._id, bool, item({ switch: true }), false, 'switch'), true, 'failed fresh read must use cache fallback');

    const calls = [];
    const socket = { setState: async (id, envelope) => { calls.push({ id, envelope }); await new Promise(r => setTimeout(r, 4)); } };
    const first = policy.writeManualState(socket, 'test.0.switch', true);
    const same = policy.writeManualState(socket, 'test.0.switch', true);
    if (first !== same) fail('identical pending writes were not deduplicated');
    const secondValue = policy.writeManualState(socket, 'test.0.switch', false);
    if (secondValue === first) fail('a distinct second value was incorrectly discarded');
    await Promise.all([first, same, secondValue]);
    eq(calls.map(c => c.envelope.val), [true, false], 'queued write order');
    if (calls.some(c => c.envelope.ack !== false || c.envelope.q !== 0)) fail('invalid write envelope');

    console.log('[NexoWatt EOS manual write policy selftest] OK');
})().catch(error => {
    console.error(error.message || error);
    process.exit(1);
});
