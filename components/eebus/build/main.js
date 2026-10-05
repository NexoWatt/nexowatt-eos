"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const { createLicenseGuard } = require('../packages/eos-license-client');
const config_1 = require("./lib/config");
const eebusRuntime_1 = require("./lib/eebusRuntime");
const identityManager_1 = require("./lib/identityManager");
const objectFactory_1 = require("./lib/objectFactory");
class EebusAdapter extends utils.Adapter {
    runtime;
    licenseGuard;
    startupTimer;
    runtimeStarting = false;
    shuttingDown = false;
    isEosLicenseAllowed() {
        return this.licenseGuard?.isAllowed() === true;
    }
    constructor(options = {}) {
        super({
            ...options,
            name: 'eebus',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    async onReady() {
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
    async startLicensedRuntime() {
        if (this.shuttingDown || this.runtime || this.runtimeStarting || !this.isEosLicenseAllowed())
            return;
        this.runtimeStarting = true;
        try {
            const nativeConfig = await this.migrateLegacyIdentityNames(this.config || {});
            const config = (0, config_1.getConfig)(nativeConfig);
            const objectFactory = new objectFactory_1.ObjectFactory(this);
            await objectFactory.ensureBaseObjects();
            if ((0, config_1.isPlaceholderIanaPen)(config.ianaPen)) {
                this.log.warn(`EEBUS identity uses IANA PEN ${config.ianaPen}. This is a field-test placeholder. ` +
                    'Enter the officially assigned NexoWatt IANA PEN before production commissioning and before creating new production identities.');
            }
            const identity = await new identityManager_1.IdentityManager(this, config).ensureIdentity();
            await objectFactory.publishIdentity(identity, config);
            this.runtime = new eebusRuntime_1.EebusRuntime(this, config, identity, objectFactory);
            this.licenseGuard.assertAllowed();
            await this.runtime.start();
            if (this.startupTimer)
                this.clearInterval(this.startupTimer);
            this.startupTimer = undefined;
            this.subscribeStates('devices.*.control.*');
            this.subscribeStates('devices.*.limits.*');
            this.subscribeStates('devices.*.pairing.*');
            this.subscribeStates('pairing.autoAcceptNewDevices');
            this.log.info(`NexoWatt EOS EEBUS adapter started as ${config.deviceType} ` +
                `(service="${config.serviceName}", brand=${config.brand}, model=${config.model}, category=${config.deviceCategories.join(',')}).`);
        }
        catch (error) {
            await this.runtime?.stop().catch(() => undefined);
            this.runtime = undefined;
            this.log.error(`NexoWatt EOS EEBUS adapter could not start: ${String(error)}`);
            await this.setStateAsync('info.connection', { val: false, ack: true });
        }
        finally {
            this.runtimeStarting = false;
        }
    }
    async migrateLegacyIdentityNames(native) {
        const migration = (0, config_1.migrateLegacyNativeConfig)(native);
        if (migration.changes.length === 0) {
            return migration.native;
        }
        const changedKeys = Object.keys(migration.native).filter(key => migration.native[key] !== native[key]);
        const instanceObjectId = `system.adapter.${this.namespace}`;
        try {
            const obj = await this.getForeignObjectAsync(instanceObjectId);
            if (!obj) {
                this.log.warn(`Legacy EEBUS identity values were normalized for runtime but could not be persisted because ${instanceObjectId} was not found.`);
                return migration.native;
            }
            const persistedNative = { ...(obj.native || {}) };
            for (const key of changedKeys) {
                persistedNative[key] = migration.native[key];
            }
            obj.native = persistedNative;
            await this.setForeignObjectAsync(instanceObjectId, obj);
            this.log.info(`Migrated legacy EEBUS identity settings: ${migration.changes.join(', ')}.`);
        }
        catch (error) {
            this.log.warn(`Could not persist migrated EEBUS identity settings: ${String(error)}`);
        }
        return migration.native;
    }
    async onMessage(obj) {
        try {
            await this.runtime?.handleMessage(obj);
        }
        catch (error) {
            this.log.error(`Could not process adapter message ${String(obj?.command || '')}: ${String(error)}`);
            if (obj?.callback)
                this.sendTo(obj.from, obj.command, { accepted: false, error: String(error) }, obj.callback);
        }
    }
    async onStateChange(id, state) {
        if (!state) {
            return;
        }
        try {
            await this.runtime?.handleStateChange(id, state);
        }
        catch (error) {
            this.log.error(`Could not process state change ${id}: ${String(error)}`);
        }
    }
    async onUnload(callback) {
        this.shuttingDown = true;
        if (this.startupTimer)
            this.clearInterval(this.startupTimer);
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
        }
        catch (error) {
            this.log.error(`Unload cleanup failed: ${String(error)}`);
            callback();
        }
    }
}
if (require.main !== module) {
    module.exports = (options) => new EebusAdapter(options);
}
else {
    (() => new EebusAdapter())();
}
//# sourceMappingURL=main.js.map