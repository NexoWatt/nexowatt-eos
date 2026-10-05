export type EosFeature = 'energy' | 'wallet' | 'smartHome' | 'microgridSlave' | 'microgridMaster' | 'multisite' | 'billing';
export interface EosLicenseStatus {
    valid: boolean;
    code: string;
    edition?: 'home' | 'pro';
    features?: EosFeature[];
    limits?: { chargePoints: number; batteries: number };
    checkedAt?: number;
    validUntil?: number;
}
export interface EosLicenseGuard {
    start(): Promise<boolean>;
    refresh(): Promise<boolean>;
    stop(): Promise<void>;
    isAllowed(): boolean;
    assertAllowed(): void;
    isFeatureAllowed(feature: string): boolean;
    assertFeatureAllowed(feature: string): void;
    getStatus(): EosLicenseStatus;
}
export function createLicenseGuard(adapter: {
    name: string;
    namespace: string;
    sendTo: (...args: any[]) => any;
    log?: { error?: (message: string) => void };
}, options: {
    onLost: (event: Readonly<{ code: string }>) => void | Promise<void>;
    adminInstance?: string;
    feature?: EosFeature;
    required?: { chargePoints?: number; batteries?: number };
    timeoutMs?: number;
}): EosLicenseGuard;
export function assertEosPlatform(adapterName: string): true;
export class LicenseError extends Error { readonly code: string; }
export const COMMAND: 'eos.license.check';
export const MAX_LEASE_MS: 15000;
export const MAX_TIMEOUT_MS: 2000;
export const REFRESH_INTERVAL_MS: 5000;
