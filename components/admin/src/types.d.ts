export interface AdminAdapterConfig extends ioBroker.AdapterConfig {
    accessAllowedConfigs: string[];
    accessAllowedTabs: string[];
    accessApplyRights: boolean;
    accessLimit: boolean;
    allowInternalAccess?: { [adapterName: string]: string }; // adapterName: UserName (without system.user)
    auth: boolean;
    autoUpdate: number;
    bind: string;
    cache: boolean;
    certChained: string;
    certPrivate: string;
    certPublic: string;
    defaultUser: string;
    doNotCheckPublicIP: boolean;
    language: ioBroker.Languages;
    leCollection: boolean;
    loadingBackgroundColor: string;
    loadingBackgroundImage: boolean;
    loadingHideLogo: boolean;
    loginBackgroundColor: string;
    loginBackgroundImage: boolean;
    loginHideLogo: boolean;
    loginMotto: string;
    noBasicAuth: boolean;
    port: number;
    secure: boolean;
    thresholdValue: number;
    tmpPath: string;
    tmpPathAllow: boolean;
    ttl: number;
    reverseProxy: {
        globalPath: string;
        paths: { path: string; instance: string }[];
    }[];
    disableMcp?: boolean;
    /** Disable the legacy ioBroker admin.0 instance automatically and keep it on a non-public fallback port. */
    eosLockLegacyAdmin?: boolean;
    /** Fallback port for disabled legacy admin.0. */
    eosLegacyAdminLockPort?: number;
    /** Fallback bind address for disabled legacy admin.0. */
    eosLegacyAdminLockBind?: string;
    /** Keep selected adapters protected from deletion while keeping them updateable. */
    eosProtectAdapterDeletion?: boolean;
    /** Hide and write-protect the legacy ioBroker admin from non-administrator users. */
    eosHideLegacyAdminFromNonAdmins?: boolean;
    /** Backward-compatible single group that may see and change legacy/protected admin components. */
    eosAdminOnlyGroup?: string;
    /** Groups that may see and change legacy/protected admin components. */
    eosAdminOnlyGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    /** Alternative UI key for the same admin-only group list. */
    eosSecurityAdminGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    /** NexoWatt/EOS service groups with the same unrestricted rights as administrators. */
    eosServiceGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    eosNexoWattServiceGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    /** Installer groups for commissioning and troubleshooting without security/expert administration. */
    eosInstallerGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    /** End-user groups for Smart Home and explicitly released EOS/NexoWatt UI areas. */
    eosEndUserGroups?: Array<string | { group?: string; id?: string; name?: string; enabled?: boolean; note?: string }>;
    /** Require installer/end-user accounts to choose a personal password after their first authenticated login. */
    eosRequireFirstLoginPassword?: boolean;
    /** Minimum length for first-login passwords. */
    eosFirstLoginPasswordMinLength?: number;
    /** Automatically assign the standard installer/user account names to the matching EOS role groups. */
    eosAutoAssignDefaultRoleUsers?: boolean;
    /** Allow an explicitly prepared installer/end-user account to claim its first activation without a password. */
    eosPasswordlessFirstLogin?: boolean;
    /** Restrict passwordless first activation to local/private client addresses. */
    eosPasswordlessFirstLoginPrivateNetworkOnly?: boolean;
    /** Lifetime of the short-lived first-activation claim in minutes. */
    eosPasswordClaimTtlMinutes?: number;
    /** Alternative UI key for hiding the legacy admin. */
    eosHideLegacyAdminForNonAdmins?: boolean;
    /** Apply administrator-only ACLs to selected protected adapters. */
    eosApplyAdminOnlyAclToProtectedAdapters?: boolean;
    /** Optional hard ACL mode for protected adapters. Disabled by default because adapter-owned runtime/config behaviour must remain untouched. */
    eosStrictProtectedAdapterAcl?: boolean;
    /** Hide protected adapter delete controls for non-admin groups. */
    eosRestrictProtectedAdapterControls?: boolean;
    /** Adapter names configured by the EOS administrator as protected system components. */
    eosProtectedAdapters?: Array<string | { adapter?: string; name?: string; enabled?: boolean; note?: string; reason?: string }>;
}

