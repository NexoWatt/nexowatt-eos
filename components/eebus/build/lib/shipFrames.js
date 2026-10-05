"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCmiFrame = encodeCmiFrame;
exports.encodeControlFrame = encodeControlFrame;
exports.encodeDataFrame = encodeDataFrame;
exports.encodeEndFrame = encodeEndFrame;
exports.decodeShipFrame = decodeShipFrame;
exports.makeHello = makeHello;
exports.makeProtocolHandshake = makeProtocolHandshake;
exports.makePinState = makePinState;
exports.makePinInput = makePinInput;
exports.makePinError = makePinError;
const SHIP_TYPE_INIT = 0;
const SHIP_TYPE_CONTROL = 1;
const SHIP_TYPE_DATA = 2;
const SHIP_TYPE_END = 3;
function encodeCmiFrame() {
    return Buffer.from([SHIP_TYPE_INIT, 0]);
}
function encodeControlFrame(value) {
    return encodeJsonFrame(SHIP_TYPE_CONTROL, value);
}
function encodeDataFrame(payload) {
    return encodeJsonFrame(SHIP_TYPE_DATA, {
        data: {
            header: {
                protocolId: 'ee1.0',
            },
            payload,
        },
    });
}
function encodeEndFrame(reason = 'unspecific') {
    return encodeJsonFrame(SHIP_TYPE_END, {
        connectionClose: {
            phase: 'announce',
            reason,
        },
    });
}
function decodeShipFrame(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buffer.length >= 1 && buffer[0] >= 0 && buffer[0] <= 3) {
        const typeCode = Number(buffer[0]);
        const rest = buffer.subarray(1);
        if (typeCode === SHIP_TYPE_INIT) {
            return { type: 'init', typeCode, value: { cmiHead: rest.length > 0 ? Number(rest[0]) : undefined } };
        }
        const rawText = rest.toString('utf8');
        const value = parseJsonSafe(rawText);
        return { type: typeCodeToName(typeCode), typeCode, value, rawText };
    }
    const rawText = buffer.toString('utf8');
    return { type: 'json', typeCode: undefined, value: parseJsonSafe(rawText), rawText };
}
function makeHello(phase, waitingMs = 120000) {
    const hello = {
        phase,
        keyMaterialState: {
            updateCounter: 0,
        },
    };
    if (phase === 'pending')
        hello.waiting = waitingMs;
    return { connectionHello: hello };
}
function makeProtocolHandshake(type) {
    return {
        messageProtocolHandshake: {
            handshakeType: type,
            version: {
                major: 1,
                minor: 1,
            },
            formats: {
                format: type === 'select' ? ['JSON-UTF8'] : ['JSON-UTF8'],
            },
        },
    };
}
function makePinState(pinState, inputPermission) {
    const value = { pinState };
    if (inputPermission)
        value.inputPermission = inputPermission;
    return { connectionPinState: value };
}
function makePinInput(pin) {
    return {
        connectionPinInput: {
            pin,
        },
    };
}
function makePinError(error = 1) {
    return {
        connectionPinError: {
            error,
        },
    };
}
function encodeJsonFrame(typeCode, value) {
    const body = Buffer.from(JSON.stringify(value), 'utf8');
    return Buffer.concat([Buffer.from([typeCode]), body]);
}
function typeCodeToName(typeCode) {
    if (typeCode === SHIP_TYPE_CONTROL)
        return 'control';
    if (typeCode === SHIP_TYPE_DATA)
        return 'data';
    if (typeCode === SHIP_TYPE_END)
        return 'end';
    if (typeCode === SHIP_TYPE_INIT)
        return 'init';
    return 'unknown';
}
function parseJsonSafe(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
//# sourceMappingURL=shipFrames.js.map