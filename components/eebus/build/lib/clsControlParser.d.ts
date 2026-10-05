export type ClsCommandOperation = 'limitConsumption' | 'release' | 'heartbeat' | 'failsafeConfiguration';
export interface SpineCorrelation {
    specificationVersion: string;
    msgCounter: number | null;
    ackRequest: boolean;
    cmdClassifier: string;
    functionName: string;
    sourceAddress: Record<string, unknown> | null;
    destinationAddress: Record<string, unknown> | null;
    limitIds: Array<number | string>;
}
export interface ClsControlCommand {
    apiVersion: 1;
    protocol: 'nexowatt-eebus-para14a';
    commandId: string;
    operation: ClsCommandOperation;
    active: boolean;
    limitW: number | null;
    failsafeLimitW: number | null;
    failsafeDurationMs: number | null;
    heartbeatTimeoutMs: number | null;
    heartbeatAtMs: number | null;
    receivedAtMs: number;
    effectiveFromMs: number | null;
    expiresAtMs: number | null;
    sourceDeviceId: string;
    sourceSki: string;
    correlation: SpineCorrelation;
    rawSummary: Record<string, unknown>;
}
interface ParseContext {
    deviceId: string;
    sourceSki?: string;
    receivedAtMs?: number;
}
/**
 * Parses the subset of SPINE needed by IF_CLS_CTRL/LPC. The parser accepts both
 * normal object-shaped JSON and the array-heavy SPINE JSON representation used by
 * several field devices.
 */
export declare class ClsControlParser {
    private readonly memoryByDevice;
    parse(message: unknown, context: ParseContext): ClsControlCommand[];
    getDiagnostics(deviceId: string): Record<string, unknown>;
    private getMemory;
}
/** Converts SPINE's array-of-single-field-objects representation into plain objects. */
export declare function normalizeSpineJson(value: unknown): unknown;
export declare function buildSpineResultDatagram(command: ClsControlCommand, localMsgCounter: number, errorNumber: number, description?: string): Record<string, unknown> | null;
/**
 * Sends the accepted/effective LPC limit back over the already discovered
 * LoadControl feature. This is a controller readback, not a substitute for
 * MPC/MGCP measurement data.
 */
export declare function buildSpineLimitReadbackDatagram(command: ClsControlCommand, localMsgCounter: number, active: boolean, effectiveLimitW: number | null): Record<string, unknown> | null;
export {};
//# sourceMappingURL=clsControlParser.d.ts.map