export type ShipMessageType = 'init' | 'control' | 'data' | 'end' | 'json' | 'unknown';
export interface DecodedShipFrame {
    type: ShipMessageType;
    typeCode: number | undefined;
    value: unknown;
    rawText?: string;
}
export declare function encodeCmiFrame(): any;
export declare function encodeControlFrame(value: unknown): any;
export declare function encodeDataFrame(payload: unknown): any;
export declare function encodeEndFrame(reason?: string): any;
export declare function decodeShipFrame(data: any): DecodedShipFrame;
export declare function makeHello(phase: 'pending' | 'ready' | 'aborted', waitingMs?: number): Record<string, unknown>;
export declare function makeProtocolHandshake(type: 'announceMax' | 'select'): Record<string, unknown>;
export declare function makePinState(pinState: 'required' | 'optional' | 'pinOk' | 'none', inputPermission?: 'busy' | 'ok'): Record<string, unknown>;
export declare function makePinInput(pin: string): Record<string, unknown>;
export declare function makePinError(error?: number): Record<string, unknown>;
//# sourceMappingURL=shipFrames.d.ts.map