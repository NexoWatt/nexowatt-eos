/**
 * NexoWatt unattended-upgrade quarantine.
 * This release never enables automatic code installation. A repository label,
 * adapter prefix or free-form publisher field cannot authenticate a release.
 * Existing EOS-managed policies are migrated to none; manual administrator
 * updates remain available. A future signed, version-pinned rollout is separate.
 */

export type NexoWattAutoUpdatePolicy = 'none' | 'patch' | 'minor' | 'major';

interface AdapterObjectLike {
    _id?: string;
    common?: Record<string, any>;
    native?: Record<string, any>;
}

interface NexoWattAutoUpdateAdapter {
    namespace: string;
    host?: string;
    log: {
        debug: (message: string) => void;
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
    };
    getForeignObjectAsync: (id: string) => Promise<any>;
    setForeignObjectAsync: (id: string, object: any, options?: any) => Promise<any>;
    getObjectViewAsync: (design: string, search: string, params: any, options?: any) => Promise<any>;
    getStateAsync: (id: string) => Promise<any>;
    setStateAsync: (id: string, value: any, ack?: boolean) => Promise<any>;
    sendToHostAsync?: (host: string, command: string, message: any) => Promise<any>;
}

export interface NexoWattStableUpdateStatus {
    enabled: boolean;
    repository: string;
    managedAdapters: string[];
    availableStableAdapters: string[];
    lastSync: number;
    lastRepositoryRefresh: number;
    error: string;
    policy: 'none';
    blocked: true;
    source: 'ioBroker-native-auto-upgrade';
}

interface PersistedState {
    previousPolicies?: Record<string, NexoWattAutoUpdatePolicy | null>;
    previousRepositoryEnabled?: boolean | null;
    previousActiveRepo?: string[];
    selectedRepository?: string;
    ownsActiveRepoOrder?: boolean;
    managedAdapters?: string[];
    availableStableAdapters?: string[];
    lastSync?: number;
    lastRepositoryRefresh?: number;
    error?: string;
}

const ADMIN_USER = 'system.user.admin';
const POLICY = 'none' as const;
const BLOCK_REASON = 'UNATTENDED_UPDATES_BLOCKED_UNVERIFIED_RELEASE';
const RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const ENABLED_STATE_ID = 'info.nexowattStableUpdatesEnabled';
const STATUS_STATE_ID = 'info.nexowattStableUpdatesState';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const normalizedName = (value: unknown): string => String(value || '').trim().replace(/^system\.adapter\./, '').replace(/\.\d+$/, '');
const validAdapterName = (name: string): boolean => /^[a-z][a-z0-9-]{0,63}$/.test(name);

// Classification for quarantine ONLY. This is deliberately never an issuer or
// package trust decision; textual metadata provides no evidence of provenance.
export function isNexoWattRepositoryEntry(name: string, _entry?: any): boolean {
    const adapterName = normalizedName(name).toLowerCase();
    return validAdapterName(adapterName) && (adapterName === 'eos-admin'
        || adapterName.startsWith('nexowatt-') || adapterName.startsWith('eos-'));
}

export class NexoWattStableUpdateManager {
    private timer?: NodeJS.Timeout;
    private reconcilePromise?: Promise<NexoWattStableUpdateStatus>;
    private retryTimer?: NodeJS.Timeout;
    private stopped = false;
    private cachedState: PersistedState = {};

    constructor(private readonly adapter: NexoWattAutoUpdateAdapter) {}

    private get instanceId(): string { return `system.adapter.${this.adapter.namespace}`; }

    async start(): Promise<NexoWattStableUpdateStatus> {
        this.stopped = false;
        // Do not leave a legacy auto-install window while browser assets load.
        const status = await this.reconcile('startup-security-migration');
        this.ensurePeriodicTimer();
        return status;
    }

    stop(): void {
        this.stopped = true;
        if (this.timer) clearInterval(this.timer);
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.timer = undefined;
        this.retryTimer = undefined;
    }

    async getStatus(refresh = false): Promise<NexoWattStableUpdateStatus> {
        if (refresh) return this.reconcile('status');
        const persisted = await this.readPersisted();
        return this.statusFromPersisted(persisted.enabled, persisted.state);
    }

    async setEnabled(_enabled: boolean): Promise<NexoWattStableUpdateStatus> {
        if (this.stopped) return this.statusFromPersisted(false, this.cachedState);
        // The former UI/API switch is not an override for release integrity.
        const status = await this.reconcile('settings-security-quarantine');
        this.ensurePeriodicTimer();
        return status;
    }

    async reconcile(reason = 'manual'): Promise<NexoWattStableUpdateStatus> {
        if (this.reconcilePromise) return this.reconcilePromise;
        this.reconcilePromise = this.reconcileInternal(reason).finally(() => { this.reconcilePromise = undefined; });
        return this.reconcilePromise;
    }

    private ensurePeriodicTimer(): void {
        if (this.timer || this.stopped) return;
        this.timer = setInterval(() => {
            if (!this.stopped) void this.reconcile('interval').catch(() => this.adapter.log.warn('[NexoWatt stable updates] UNATTENDED_UPDATE_MIGRATION_FAILED'));
        }, RECONCILE_INTERVAL_MS);
        this.timer.unref?.();
    }

    private parseState(value: unknown): PersistedState | null {
        if (value && typeof value === 'object' && !Array.isArray(value)) return clone(value as PersistedState);
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as PersistedState : null;
        } catch {
            return null;
        }
    }

    private async readPersisted(): Promise<{ enabled: boolean; state: PersistedState }> {
        // Legacy 7.10.1 values are read once as a migration fallback. They are
        // never written back to the instance native object.
        let legacyNative: Record<string, any> = {};
        try {
            const instance = await this.adapter.getForeignObjectAsync(this.instanceId);
            legacyNative = instance?.native || {};
        } catch (error) {
            this.adapter.log.debug(`[NexoWatt stable updates] Cannot read legacy native state: ${error instanceof Error ? error.message : error}`);
        }

        const enabled = false;
        let state = Object.keys(this.cachedState).length
            ? clone(this.cachedState)
            : clone((legacyNative.eosNexoWattAutoUpdateState || {}) as PersistedState);

        try {
            const enabledState = await this.adapter.getStateAsync(ENABLED_STATE_ID);
            // Read legacy state for migration availability, never for permission.
            if (enabledState?.val === true) this.adapter.log.debug('[NexoWatt stable updates] Legacy enable flag ignored by security quarantine');
        } catch (error) {
            this.adapter.log.debug(`[NexoWatt stable updates] Cannot read enabled state: ${error instanceof Error ? error.message : error}`);
        }

        try {
            const persistedState = await this.adapter.getStateAsync(STATUS_STATE_ID);
            const parsed = this.parseState(persistedState?.val);
            if (parsed) state = parsed;
        } catch (error) {
            this.adapter.log.debug(`[NexoWatt stable updates] Cannot read status state: ${error instanceof Error ? error.message : error}`);
        }

        this.cachedState = clone(state);
        return { enabled, state };
    }

    private statusFromPersisted(_enabled: boolean, state: PersistedState): NexoWattStableUpdateStatus {
        return {
            enabled: false,
            blocked: true,
            repository: String(state.selectedRepository || ''),
            managedAdapters: Array.isArray(state.managedAdapters) ? state.managedAdapters.map(String).sort() : [],
            availableStableAdapters: Array.isArray(state.availableStableAdapters) ? state.availableStableAdapters.map(String).sort() : [],
            lastSync: Number(state.lastSync || 0),
            lastRepositoryRefresh: Number(state.lastRepositoryRefresh || 0),
            error: String(state.error || BLOCK_REASON),
            policy: POLICY,
            source: 'ioBroker-native-auto-upgrade',
        };
    }

    private async reconcileInternal(reason: string): Promise<NexoWattStableUpdateStatus> {
        const persisted = await this.readPersisted();
        const { enabled } = persisted;
        const state = clone(persisted.state);
        if (this.stopped) return this.statusFromPersisted(enabled, state);
        try {
            return await this.disable(state, reason);
        } catch (error) {
            const message = 'UNATTENDED_UPDATE_MIGRATION_FAILED';
            state.error = message;
            state.lastSync = Date.now();
            if (!this.stopped) await this.persist(enabled, state);
            if (!this.stopped) this.scheduleRetry();
            if (!this.stopped) this.adapter.log.warn(`[NexoWatt stable updates] ${message}`);
            return this.statusFromPersisted(enabled, state);
        }
    }

    private async readInstalledAdapters(): Promise<Map<string, AdapterObjectLike>> {
        const view = await this.adapter.getObjectViewAsync('system', 'adapter', {
            startkey: 'system.adapter.',
            endkey: 'system.adapter.\u9999',
        }, { user: ADMIN_USER });
        const result = new Map<string, AdapterObjectLike>();
        for (const row of view?.rows || []) {
            const object = row?.value || row?.doc;
            const name = normalizedName(object?.common?.name || row?.id || object?._id);
            if (name && object?.common?.version) result.set(name, object);
        }
        return result;
    }

    private async disable(state: PersistedState, reason: string): Promise<NexoWattStableUpdateStatus> {
        const installed = await this.readInstalledAdapters();
        const names = new Set([
            ...[...installed.keys()].filter(name => isNexoWattRepositoryEntry(name)),
            ...Object.keys(state.previousPolicies || {}).filter(validAdapterName),
            ...(Array.isArray(state.managedAdapters) ? state.managedAdapters.filter(name => typeof name === 'string' && validAdapterName(name)) : []),
        ]);
        state.previousPolicies ||= {};
        for (const name of [...names].sort()) {
            if (this.stopped) return this.statusFromPersisted(false, state);
            const current = await this.adapter.getForeignObjectAsync(`system.adapter.${name}`);
            if (!current?.common) continue;
            // Preserve the old value only for an explicitly reviewed later
            // migration. Never restore an automatic policy in this release.
            if (!Object.hasOwn(state.previousPolicies, name)) {
                const previous = current.common.automaticUpgrade;
                state.previousPolicies[name] = ['none', 'patch', 'minor', 'major'].includes(previous) ? previous : null;
            }
            await this.writeAdapterPolicy(name, POLICY);
        }
        const systemConfig = await this.adapter.getForeignObjectAsync('system.config');
        if (systemConfig?.common) {
            let systemConfigChanged = false;
            const auto = systemConfig.common.adapterAutoUpgrade && typeof systemConfig.common.adapterAutoUpgrade === 'object'
                ? clone(systemConfig.common.adapterAutoUpgrade)
                : null;
            if (auto && state.selectedRepository) {
                auto.repositories = auto.repositories && typeof auto.repositories === 'object' ? { ...auto.repositories } : {};
                if (auto.repositories[state.selectedRepository] === true && (state.previousRepositoryEnabled === false || state.previousRepositoryEnabled === null)) {
                    if (state.previousRepositoryEnabled === null || state.previousRepositoryEnabled === undefined) {
                        delete auto.repositories[state.selectedRepository];
                    } else {
                        auto.repositories[state.selectedRepository] = state.previousRepositoryEnabled;
                    }
                    systemConfigChanged = true;
                }
                if (JSON.stringify(systemConfig.common.adapterAutoUpgrade) !== JSON.stringify(auto)) {
                    systemConfig.common.adapterAutoUpgrade = auto;
                    systemConfigChanged = true;
                }
            }
            if (state.ownsActiveRepoOrder && Array.isArray(state.previousActiveRepo)
                && Array.isArray(systemConfig.common.activeRepo)
                && systemConfig.common.activeRepo[0] === state.selectedRepository) {
                systemConfig.common.activeRepo = [...state.previousActiveRepo];
                systemConfigChanged = true;
            }
            if (systemConfigChanged && !this.stopped) {
                await this.adapter.setForeignObjectAsync('system.config', systemConfig, { user: ADMIN_USER });
            }
        }
        state.previousRepositoryEnabled = undefined;
        state.previousActiveRepo = undefined;
        state.ownsActiveRepoOrder = false;
        state.managedAdapters = [...names].sort();
        state.availableStableAdapters = [];
        state.lastSync = Date.now();
        state.error = BLOCK_REASON;
        if (!this.stopped) await this.persist(false, state);
        if (!this.stopped) this.adapter.log.info(`[NexoWatt stable updates] Unattended installation blocked; managed policies quarantined (${reason})`);
        return this.statusFromPersisted(false, state);
    }

    private async writeAdapterPolicy(name: string, policy: NexoWattAutoUpdatePolicy | null): Promise<void> {
        if (!validAdapterName(name)) throw new Error('invalidManagedAdapterName');
        const id = `system.adapter.${name}`;
        const object = await this.adapter.getForeignObjectAsync(id);
        if (!object?.common || this.stopped) return;
        const current = object.common.automaticUpgrade as NexoWattAutoUpdatePolicy | undefined;
        if ((policy === null && current === undefined) || current === policy) return;
        if (policy === null) delete object.common.automaticUpgrade;
        else object.common.automaticUpgrade = policy;
        await this.adapter.setForeignObjectAsync(id, object, { user: ADMIN_USER });
    }

    private async persist(enabled: boolean, state: PersistedState): Promise<void> {
        if (this.stopped) return;
        this.cachedState = clone(state);

        const currentEnabled = await this.adapter.getStateAsync(ENABLED_STATE_ID).catch((): null => null);
        if (currentEnabled?.val !== enabled) {
            await this.adapter.setStateAsync(ENABLED_STATE_ID, enabled, true);
        }

        const serialized = JSON.stringify(state);
        const currentState = await this.adapter.getStateAsync(STATUS_STATE_ID).catch((): null => null);
        const currentSerialized = typeof currentState?.val === 'string'
            ? currentState.val
            : currentState?.val == null ? '' : JSON.stringify(currentState.val);
        if (currentSerialized !== serialized) {
            await this.adapter.setStateAsync(STATUS_STATE_ID, serialized, true);
        }
    }

    private scheduleRetry(): void {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            if (!this.stopped) void this.reconcile('retry').catch(() => this.adapter.log.warn('[NexoWatt stable updates] UNATTENDED_UPDATE_MIGRATION_FAILED'));
        }, 60_000);
        this.retryTimer.unref?.();
    }

}
