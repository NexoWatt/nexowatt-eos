import { EebusConfig } from './config';
import { ClsControlCommand } from './clsControlParser';
export declare const NEXOWATT_PARA14A_API_VERSION = 1;
export declare const NEXOWATT_PARA14A_HELLO = "nexowatt.para14a.hello.v1";
export declare const NEXOWATT_PARA14A_COMMAND = "nexowatt.para14a.command.v1";
export declare const NEXOWATT_PARA14A_IMPLEMENTATION = "nexowatt.para14a.implementation.v1";
export type Para14aBridgeReason = 'lpc' | 'release' | 'bridge-failsafe' | 'failsafe-duration-expired' | 'validity-expired';
export interface Para14aBridgeCommand {
    schema: typeof NEXOWATT_PARA14A_COMMAND;
    apiVersion: 1;
    commandId: string;
    sequence: number;
    sourceInstance: string;
    sourceDeviceId: string;
    sourceSki: string;
    sourceProtocol: 'EEBUS-SPINE-IF_CLS_CTRL';
    operation: 'limitConsumption' | 'release';
    reason: Para14aBridgeReason;
    mode: 'ems';
    active: boolean;
    limitW: number | null;
    receivedAtMs: number;
    issuedAtMs: number;
    effectiveFromMs: number | null;
    validUntilMs: number | null;
    heartbeatAtMs: number | null;
    heartbeatTimeoutMs: number;
    failsafeLimitW: number | null;
    failsafeDurationMs: number | null;
    implementationTimeoutMs: number;
    sourceMsgCounter: number | null;
    sourceLimitIds: Array<number | string>;
}
export interface Para14aBridgeAcceptance {
    schema?: string;
    apiVersion?: number;
    accepted: boolean;
    queued?: boolean;
    duplicate?: boolean;
    commandId?: string;
    acceptedAtMs?: number;
    acceptanceLatencyMs?: number;
    reason?: string;
    error?: string;
}
export interface Para14aImplementationFeedback {
    schema: typeof NEXOWATT_PARA14A_IMPLEMENTATION;
    apiVersion: 1;
    commandId: string;
    sequence: number;
    sourceInstance?: string;
    status: 'applied' | 'released' | 'degraded' | 'failed' | 'superseded';
    controllerApplied: boolean;
    physicalImplementationConfirmed?: boolean;
    active: boolean;
    requestedLimitW: number | null;
    effectiveTotalCapW: number | null;
    actualSteuVEPowerW?: number | null;
    evcsActualPowerW?: number | null;
    gridPowerW?: number | null;
    receivedAtMs?: number;
    acceptedAtMs: number;
    acceptanceLatencyMs?: number;
    tickStartedAtMs?: number;
    controllerTickStartedAtMs?: number;
    appliedAtMs: number;
    controllerAppliedAtMs?: number;
    controlLatencyMs: number;
    controllerLatencyMs?: number;
    postAcceptanceControlLatencyMs?: number;
    feedbackCreatedAtMs?: number;
    feedbackAtMs?: number;
    feedbackLatencyMs?: number;
    readbackVerified?: boolean;
    withinControlTarget?: boolean;
    reason?: string;
    details?: Record<string, unknown>;
}
export interface Para14aPendingContext {
    command: Para14aBridgeCommand;
    clsCommand: ClsControlCommand;
    acceptance?: Para14aBridgeAcceptance;
}
export interface BridgeMessageResult {
    handled: boolean;
    accepted: boolean;
    error?: string;
}
type ImplementationCallback = (feedback: Para14aImplementationFeedback, context?: Para14aPendingContext) => void | Promise<void>;
/**
 * Versioned, event-driven ioBroker message API between ioBroker.eebus and
 * nexowatt-ui. The control path never depends on diagnostic state writes and
 * therefore needs no manual CLS datapoint mapping.
 */
export declare class NexoWattPara14aBridge {
    private readonly adapter;
    private readonly config;
    private readonly onImplementation;
    private heartbeatTimer?;
    private sequence;
    private readonly pending;
    private readonly recentAcceptances;
    private started;
    private commandCount;
    private rejectedCount;
    private implementedCount;
    private timeoutCount;
    private targetInstance;
    private readyForControl;
    constructor(adapter: any, config: EebusConfig, onImplementation: ImplementationCallback);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Forwards an active LPC limit or release directly to the central EOS
     * controller. Heartbeat and failsafe configuration remain local metadata;
     * synthesized failsafe/recovery transitions use this same method.
     */
    dispatchLimit(clsCommand: ClsControlCommand, reason?: Para14aBridgeReason): Promise<Para14aBridgeAcceptance>;
    handleMessage(command: string, message: unknown, from?: string): Promise<BridgeMessageResult>;
    contextFor(commandId: string): Para14aPendingContext | undefined;
    private toBridgeCommand;
    private handshake;
    private sendRequestWithRetry;
    private sendRequest;
    private resolveTargetInstance;
    private rejectPending;
    private armImplementationTimeout;
    private handleImplementationTimeout;
    private clearPendingTimer;
    private removePending;
    private publishStaticStates;
    private publishCommand;
    private publishAcceptance;
    private publishImplementation;
    private isExpectedSender;
    private setState;
    private background;
    private nextSequence;
    private prunePending;
    private rememberAcceptance;
    private rememberImplementation;
}
export {};
//# sourceMappingURL=nexowattBridge.d.ts.map