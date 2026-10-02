export type ShipMessageType = 'init' | 'control' | 'data' | 'end' | 'json' | 'unknown';

export interface DecodedShipFrame {
    type: ShipMessageType;
    typeCode: number | undefined;
    value: unknown;
    rawText?: string;
}

const SHIP_TYPE_INIT = 0;
const SHIP_TYPE_CONTROL = 1;
const SHIP_TYPE_DATA = 2;
const SHIP_TYPE_END = 3;

export function encodeCmiFrame(): any {
    return Buffer.from([SHIP_TYPE_INIT, 0]);
}

export function encodeControlFrame(value: unknown): any {
    return encodeJsonFrame(SHIP_TYPE_CONTROL, value);
}

export function encodeDataFrame(payload: unknown): any {
    return encodeJsonFrame(SHIP_TYPE_DATA, {
        data: {
            header: {
                protocolId: 'ee1.0',
            },
            payload,
        },
    });
}

export function encodeEndFrame(reason = 'unspecific'): any {
    return encodeJsonFrame(SHIP_TYPE_END, {
        connectionClose: {
            phase: 'announce',
            reason,
        },
    });
}

export function decodeShipFrame(data: any): DecodedShipFrame {
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

export function makeHello(phase: 'pending' | 'ready' | 'aborted', waitingMs = 120000): Record<string, unknown> {
    const hello: Record<string, unknown> = {
        phase,
        keyMaterialState: {
            updateCounter: 0,
        },
    };
    if (phase === 'pending') hello.waiting = waitingMs;
    return { connectionHello: hello };
}

export function makeProtocolHandshake(type: 'announceMax' | 'select'): Record<string, unknown> {
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

export function makePinState(pinState: 'required' | 'optional' | 'pinOk' | 'none', inputPermission?: 'busy' | 'ok'): Record<string, unknown> {
    const value: Record<string, unknown> = { pinState };
    if (inputPermission) value.inputPermission = inputPermission;
    return { connectionPinState: value };
}

export function makePinInput(pin: string): Record<string, unknown> {
    return {
        connectionPinInput: {
            pin,
        },
    };
}

export function makePinError(error = 1): Record<string, unknown> {
    return {
        connectionPinError: {
            error,
        },
    };
}

function encodeJsonFrame(typeCode: number, value: unknown): any {
    const body = Buffer.from(JSON.stringify(value), 'utf8');
    return Buffer.concat([Buffer.from([typeCode]), body]);
}

function typeCodeToName(typeCode: number): ShipMessageType {
    if (typeCode === SHIP_TYPE_CONTROL) return 'control';
    if (typeCode === SHIP_TYPE_DATA) return 'data';
    if (typeCode === SHIP_TYPE_END) return 'end';
    if (typeCode === SHIP_TYPE_INIT) return 'init';
    return 'unknown';
}

function parseJsonSafe(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
