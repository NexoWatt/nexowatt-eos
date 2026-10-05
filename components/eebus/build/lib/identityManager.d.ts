import { EebusConfig } from './config';
import { EebusIdentity } from './eebusTypes';
export declare class IdentityManager {
    private readonly adapter;
    private readonly config;
    constructor(adapter: any, config: EebusConfig);
    ensureIdentity(): Promise<EebusIdentity>;
    private identityFromConfig;
    private generateIdentity;
    private readSkiExtension;
    private deriveSkiFromCertificate;
    private calculateFingerprint;
    private createShipId;
    private persistIdentity;
}
//# sourceMappingURL=identityManager.d.ts.map