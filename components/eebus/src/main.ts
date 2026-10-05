import * as utils from '@iobroker/adapter-core';
const { createLicenseGuard } = require('../packages/eos-license-client');
import { getConfig, isPlaceholderIanaPen, migrateLegacyNativeConfig } from './lib/config';
import { EebusRuntime } from './lib/eebusRuntime';
import { IdentityManager } from './lib/identityManager';
import { ObjectFactory } from './lib/objectFactory';

class EebusAdapter extends utils.Adapter {
    private runtime?: EebusRuntime;
    private licenseGuard?: ReturnType<typeof createLicenseGuard>;
    private startupTimer?: any;
    private runtimeStarting = false;
    private shuttingDown = false;

    public isEosLicenseAllowed(): boolean {
        return this.licenseGuard?.isAllowed() === true;
    }

    public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'eebus',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        await this.setStateAsync('info.connection', { val: false, ack: true });

        this.licenseGuard = createLicenseGuard(this, {
            feature: 'energy',
            onLost: () => {
                // Hold equipment limits; do not disconnect peers or synthesize a release.
                this.runtime?.suspendControl();
                this.log.warn('EOS license unavailable: new EEBUS commands are blocked; protocol telemetry remains active.');
            },
        });
        await this.licenseGuard.start();
        this.startupTimer = this.setInterval(() => {
            void this.startLicensedRuntime().catch(() => this.log.warn('EEBUS licensed startup is not yet available.'));
        }, 1000);
        await this.startLicensedRuntime();
    }

    private async startLicensedRuntime(): Promise<void> {
        if (this.shuttingDown || this.runtime || this.runtimeStarting || !this.isEosLicenseAllowed()) return;
        this.runtimeStarting = true;
        try {
            const nativeConfig = await this.migrateLegacyIdentityNames(this.config || {});
            const config = getConfig(nativeConfig);
            const objectFactory = new ObjectFactory(this);
            await objectFactory.ensureBaseObjects();

            if (isPlaceholderIanaPen(config.ianaPen)) {
                this.log.warn(
                    `EEBUS identity uses IANA PEN ${config.ianaPen}. This is a field-test placeholder. ` +
                        'Enter the officially assigned NexoWatt IANA PEN before production commissioning and before creating new production identities.',
                );
            }

            const identity = await new IdentityManager(this, config).ensureIdentity();
            await objectFactory.publishIdentity(identity, config);

            this.runtime = new EebusRuntime(this, config, identity, objectFactory);
            this.licenseGuard.assertAllowed();
            await this.runtime.start();
            if (this.startupTimer) this.clearInterval(this.startupTimer);
            this.startupTimer = undefined;

            this.subscribeStates('devices.*.control.*');
            this.subscribeStates('devices.*.limits.*');
            this.subscribeStates('devices.*.pairing.*');
            this.subscribeStates('pairing.autoAcceptNewDevices');

            this.log.info(
                `NexoWatt EOS EEBUS adapter started as ${config.deviceType} ` +
                    `(service="${config.serviceName}", brand=${config.brand}, model=${config.model}, category=${config.deviceCategories.join(',')}).`,
            );
        } catch (error) {
            await this.runtime?.stop().catch(() => undefined);
            this.runtime = undefined;
            this.log.error(`NexoWatt EOS EEBUS adapter could not start: ${String(error)}`);
            await this.setStateAsync('info.connection', { val: false, ack: true });
        } finally {
            this.runtimeStarting = false;
        }
    }

    private async migrateLegacyIdentityNames(native: Record<string, unknown>): Promise<Record<string, unknown>> {
        const migration = migrateLegacyNativeConfig(native);
        if (migration.changes.length === 0) {
            return migration.native;
        }

        const changedKeys = Object.keys(migration.native).filter(key => migration.native[key] !== native[key]);
        const instanceObjectId = `system.adapter.${this.namespace}`;

        try {
            const obj = await this.getForeignObjectAsync(instanceObjectId);
            if (!obj) {
                this.log.warn(
                    `Legacy EEBUS identity values were normalized for runtime but could not be persisted because ${instanceObjectId} was not found.`,
                );
                return migration.native;
            }

            const persistedNative = { ...(obj.native || {}) };
            for (const key of changedKeys) {
                persistedNative[key] = migration.native[key];
            }
            obj.native = persistedNative;

            await this.setForeignObjectAsync(instanceObjectId, obj);
            this.log.info(`Migrated legacy EEBUS identity settings: ${migration.changes.join(', ')}.`);
        } catch (error) {
            this.log.warn(`Could not persist migrated EEBUS identity settings: ${String(error)}`);
        }

        return migration.native;
    }

    private async onMessage(obj: any): Promise<void> {
        try {
            await this.runtime?.handleMessage(obj);
        } catch (error) {
            this.log.error(`Could not process adapter message ${String(obj?.command || '')}: ${String(error)}`);
            if (obj?.callback) this.sendTo(obj.from, obj.command, { accepted: false, error: String(error) }, obj.callback);
        }
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state) {
            return;
        }

        try {
            await this.runtime?.handleStateChange(id, state);
        } catch (error) {
            this.log.error(`Could not process state change ${id}: ${String(error)}`);
        }
    }

    private async onUnload(callback: () => void): Promise<void> {
        this.shuttingDown = true;
        if (this.startupTimer) this.clearInterval(this.startupTimer);
        this.startupTimer = undefined;
        try {
            this.unsubscribeStates('devices.*.control.*');
            this.unsubscribeStates('devices.*.limits.*');
            this.unsubscribeStates('devices.*.pairing.*');
            this.unsubscribeStates('pairing.autoAcceptNewDevices');

            await this.licenseGuard?.stop();
            await this.runtime?.stop();
            this.runtime = undefined;
            callback();
        } catch (error) {
            this.log.error(`Unload cleanup failed: ${String(error)}`);
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<ioBroker.AdapterOptions> | undefined) => new EebusAdapter(options);
} else {
    (() => new EebusAdapter())();
}
