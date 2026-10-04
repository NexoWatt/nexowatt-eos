'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');
const { Client: UpstreamClient, objectsUtils } = require('@iobroker/db-objects-redis');
const { Facade, Subscription, match } = require('./facade.cjs');
const auth = require('./auth.cjs');
const { reviewView, applyView } = require('./views.cjs');
const ACL_LOCK = 'objects:acl-write';

class Client extends UpstreamClient {
    constructor(settings = {}, dependencies = {}) {
        super({ ...settings, autoConnect: false });
        if (dependencies.store) this.store = dependencies.store;
        else {
            const { Store } = require('@nexowatt/eos-postgresql-store');
            this.store = new Store(settings.connection, { domain: 'objects' });
        }
        this.authorization = new AsyncLocalStorage();
        this.useSets = false;
        this.noLegacyMultihost = true;
        this.defaultNewAcl ||= { owner: auth.ADMIN, ownerGroup: auth.ADMIN_GROUP, object: 0x600, state: 0x600, file: 0x600 };
        this.userSubscriptionContexts = new Map();
        this.systemSubscriptionContexts = new Map();
        this.eventQueue = Promise.resolve();
        this.eventBacklog = 0;
        this.eventBytes = 0;
        this.eventGeneration = 0;
        this.fatalEventFailure = () => {
            if (this.stop) return;
            this.eventGeneration++;
            this.stop = true; this.client = null;
            this.settings.disconnected?.(); this.store.close().catch(() => {});
        };
        this.onStoreEvent = event => {
            const generation = this.eventGeneration;
            if (!this.eventCurrent(generation)) return;
            if (!event || typeof event.channel !== 'string' || Buffer.byteLength(event.channel) > 1024 || !Buffer.isBuffer(event.payload) || event.payload.length > 1024 * 1024) { this.fatalEventFailure(); return; }
            if (this.eventBacklog >= 1000 || this.eventBytes + event.payload.length > 16 * 1024 * 1024) { this.fatalEventFailure(); return; }
            this.eventBacklog++; this.eventBytes += event.payload.length;
            this.eventQueue = this.eventQueue.then(() => this.handleEvent(event, generation)).catch(() => {
                if (this.eventCurrent(generation)) this.fatalEventFailure();
            }).finally(() => { this.eventBacklog--; this.eventBytes -= event.payload.length; });
        };
        this.onDisconnected = () => { this.eventGeneration++; this.settings.disconnected?.(); };
        this.onReconnected = () => {
            if (!this.client || this.stop) return;
            const generation = ++this.eventGeneration;
            this._determineProtocolVersion().then(() => {
                if (this.eventCurrent(generation)) this.settings.connected?.();
            }, () => {
                if (this.eventCurrent(generation)) this.settings.disconnected?.();
            });
        };
        this.store.on('event', this.onStoreEvent);
        this.store.on('disconnected', this.onDisconnected);
        this.store.on('connected', this.onReconnected);
        if (settings.autoConnect !== false) this.connectDb();
    }

    connectDb() {
        if (this.connectionPromise) return this.connectionPromise;
        this.connectionPromise = this.initializeConnection().catch(error => {
            this.connectionPromise = null;
            this.settings.disconnected?.();
            this.log.error('EOS_PG_OBJECTS_CONNECT_FAILED');
            throw error;
        });
        // Existing controller constructors do not await connectDb(). Retain a
        // rejection handler while allowing explicit test callers to observe it.
        this.connectionPromise.catch(() => {});
        return this.connectionPromise;
    }

    async initializeConnection() {
        await this.store.connect();
        this.stop = false;
        this.client = new Facade(this.store);
        this.sub = new Subscription(this.store);
        this.subSystem = new Subscription(this.store);
        await this._determineProtocolVersion();
        const configuration = auth.parse(await this.store.get(this.objNamespace + 'system.config'));
        if (configuration?.common?.defaultNewAcl) this.defaultNewAcl = configuration.common.defaultNewAcl;
        await this.subSystem.psubscribe(this.metaNamespace + '*');
        if (this.settings.change) { await this.subSystem.psubscribe(this.objNamespace + 'system.config'); this.systemSubscriptionContexts.set(this.objNamespace + 'system.config', auth.ADMIN); }
        this.settings.connected?.();
    }

    getStatus() { return { type: 'postgresql', server: false }; }
    async validateMetaObject(id) {
        const object = await this.getObject(id);
        if (!object || object.type !== 'meta') throw new Error('EOS_PG_META_OBJECT_REQUIRED');
    }
    async _rm(id, name, options, meta) {
        // unlink()/delFile() can enter this helper directly for directories;
        // guard the actual recursive operation, not only the public rm() API.
        if (!auth.admin(options)) throw auth.denied();
        return UpstreamClient.prototype._rm.call(this, id, name, options, meta);
    }
    checkFileRights(id, name, supplied, flag, callback) {
        auth.resolve(this.store, this.objNamespace, supplied).then(options => {
            objectsUtils.checkFileRights(this, id, name, options, flag, callback);
        }, error => callback?.(error));
    }
    async destroy() {
        this.eventGeneration++;
        this.stop = true;
        this.store.removeListener('event', this.onStoreEvent);
        this.store.removeListener('disconnected', this.onDisconnected);
        this.store.removeListener('connected', this.onReconnected);
        await this.sub?.quit(); await this.subSystem?.quit();
        await this.store.close();
        this.client = null; this.sub = null; this.subSystem = null;
    }
    _getKeysViaScan(pattern) { return this.store.keys(pattern); }
    _getKeys(pattern, options, callback, dontModify) {
        const operation = (async () => {
            const keys = (await this.store.keys(this.objNamespace + pattern)).sort();
            const result = [];
            for (let offset = 0; offset < keys.length; offset += 10000) {
                const subset = keys.slice(offset, offset + 10000);
                const rows = await this.store.getMany(subset);
                for (let index = 0; index < subset.length; index++) if (auth.objectRight(auth.parse(rows[index]), options, 'read')) result.push(dontModify ? subset[index] : subset[index].slice(this.objNamespace.length));
            }
            return result;
        })();
        operation.then(value => callback(null, value), callback);
    }
    _getObjects(ids, options, callback, dontModify) {
        const operation = (async () => {
            if (!Array.isArray(ids) || ids.length > 100000) throw new Error('EOS_PG_OBJECT_KEYS_INVALID');
            const keys = dontModify ? ids : ids.map(id => this.objNamespace + id);
            if (keys.some(key => typeof key !== 'string' || !key.startsWith(this.objNamespace))) throw new Error('EOS_PG_OBJECT_NAMESPACE_INVALID');
            const result = [];
            for (let index = 0; index < keys.length; index += 10000) {
                for (const value of await this.store.getMany(keys.slice(index, index + 10000))) {
                    const document = auth.parse(value);
                    result.push(auth.objectRight(document, options, 'read') ? document : { error: 'permissionError' });
                }
            }
            return result;
        })();
        operation.then(value => callback(null, value), callback);
    }
    async loadLuaScripts() { throw new Error('EOS_PG_LUA_UNSUPPORTED'); }
    async activateSets() { throw new Error('EOS_PG_REDIS_SETS_UNSUPPORTED'); }
    async deactivateSets() { this.useSets = false; }
    async setExists() { return false; }
    async migrateToSets() { throw new Error('EOS_PG_REDIS_SETS_UNSUPPORTED'); }
    async isSystemLocaleSupported() { return true; } // comparisons are JS, not locale-sensitive SQL
    setPrimaryHost(ttlMs) { return this.store.leaseAcquire(this.metaNamespace + 'objects.primaryHost', this.hostname, ttlMs); }
    extendPrimaryHostLock(ttlMs) { return this.store.leaseExtend(this.metaNamespace + 'objects.primaryHost', this.hostname, ttlMs); }
    releasePrimaryHost() { return this.store.leaseRelease(this.metaNamespace + 'objects.primaryHost', this.hostname); }
    async subscribePrimaryHost() { this.primaryHostSubscribed = true; }
    async getPrimaryHost() { return this.client.get(this.metaNamespace + 'objects.primaryHost'); }

    getUserGroup(user, callback) {
        const promise = auth.resolve(this.store, this.objNamespace, { user }).then(options => [user, options.groups, options.acl]);
        if (!callback) return promise;
        promise.then(result => callback(...result), () => callback(user, [], auth.rights(false)));
    }

    async _applyViewFunc(view, params = {}, options = {}) {
        reviewView(view); // Reject text before querying, including code suffixes.
        if (params === null || typeof params !== 'object' || Array.isArray(params)) throw new Error('EOS_PG_VIEW_PARAMS_INVALID');
        const start = params.startkey ?? '';
        const end = params.endkey ?? '\u9999';
        if (typeof start !== 'string' || typeof end !== 'string' || start.length > 1024 || end.length > 1024) throw new Error('EOS_PG_VIEW_RANGE_INVALID');
        const wildcard = end.indexOf('\u9999');
        const keys = (await this.store.keys(this.objNamespace + '*')).filter(key => {
            const id = key.slice(this.objNamespace.length);
            if (start === end) return id === start;
            if (wildcard !== -1 && wildcard < end.length - 1) return id.startsWith(end.slice(0, wildcard)) && id.endsWith(end.slice(wildcard + 1)) && id >= start;
            return id >= start && id <= end;
        }).sort();
        const documents = [];
        for (let index = 0; index < keys.length; index += 10000) {
            for (const value of await this.store.getMany(keys.slice(index, index + 10000))) {
                const object = auth.parse(value);
                if (object && auth.objectRight(object, options, 'read')) documents.push(object);
            }
        }
        return applyView(view, documents);
    }

    eventCurrent(generation) {
        return !this.stop && !!this.client && this.store.connected && this.eventGeneration === generation;
    }

    async handleEvent(event, generation = this.eventGeneration) {
        if (!this.eventCurrent(generation)) return;
        const channel = event.channel;
        const payload = Buffer.isBuffer(event.payload) ? event.payload.toString('utf8') : String(event.payload);
        let workBudget = 2000000;
        const matches = pattern => {
            const simple = !/[?*\[\\]/.test(pattern) || pattern.endsWith('*') && !/[?*\[\\]/.test(pattern.slice(0, -1));
            workBudget -= Buffer.byteLength(pattern) * (simple ? 1 : Buffer.byteLength(channel));
            if (workBudget < 0) throw new Error('EOS_PG_SUBSCRIPTION_WORK_LIMIT');
            return match(pattern, channel);
        };
        if (event.expired && channel === this.metaNamespace + 'objects.primaryHost') {
            if (this.primaryHostSubscribed) this.settings.primaryHostLost?.();
            return;
        }
        if (channel.startsWith(this.metaNamespace)) {
            if (channel === this.metaNamespace + 'objects.protocolVersion' && this.activeProtocolVersion !== undefined && payload !== this.activeProtocolVersion) this.fatalEventFailure();
            return;
        }
        if (channel.startsWith(this.objNamespace)) {
            const id = channel.slice(this.objNamespace.length);
            const object = payload === 'null' ? null : JSON.parse(payload);
            if (id === 'system.config' && object?.common?.defaultNewAcl) this.defaultNewAcl = structuredClone(object.common.defaultNewAcl);
            // No stale meta-object cache: metadata can change or be deleted by
            // another process between file operations.
            delete this.existingMetaObjects[id];
            for (const [pattern, user] of this.systemSubscriptionContexts) {
                if (!matches(pattern)) continue;
                const options = await auth.resolve(this.store, this.objNamespace, { user }).catch(() => null);
                if (!this.eventCurrent(generation)) return;
                if (options && options.acl.object.read && (object ? auth.objectRight(object, options, 'read') : auth.admin(options))) { this.settings.change?.(id, object); break; }
            }
            for (const [pattern, user] of this.userSubscriptionContexts) {
                if (!matches(pattern)) continue;
                const options = await auth.resolve(this.store, this.objNamespace, { user }).catch(() => null);
                if (!this.eventCurrent(generation)) return;
                if (options && options.acl.object.read && (object ? auth.objectRight(object, options, 'read') : auth.admin(options))) { this.settings.changeUser?.(id, object); break; }
            }
        } else if (channel.startsWith(this.fileNamespace)) {
            for (const [pattern, user] of this.userSubscriptionContexts) {
                if (!matches(pattern)) continue;
                const options = await auth.resolve(this.store, this.objNamespace, { user }).catch(() => null);
                if (!this.eventCurrent(generation)) return;
                if (!options?.acl.file.read) continue;
                const raw = channel.slice(this.fileNamespace.length);
                const separator = raw.indexOf('$%$');
                if (separator < 0) continue;
                const id = raw.slice(0, separator), name = raw.slice(separator + 3).replace(/\$%\$data$/, '');
                // checkFileRights re-evaluates the current metadata ACL.
                const allowed = await new Promise(resolve => this.checkFileRights(id, name, options, 4, error => resolve(!error)));
                if (!this.eventCurrent(generation)) return;
                if (allowed) this.settings.changeFileUser?.(id, name, payload === 'null' ? null : Number.parseInt(payload, 10));
                break;
            }
        }
    }

    async authorizeMutation(name, args, options) {
        if (['destroyDB', 'chownObject', 'chmodObject', 'chownFile', 'chmodFile', 'rename', 'rm'].includes(name) && !auth.admin(options)) throw auth.denied();
        if (['setObject', 'extendObject', 'delObject'].includes(name)) {
            const id = args[0];
            if (typeof id !== 'string' || !id || Buffer.byteLength(id) > 1000) throw new Error('EOS_PG_OBJECT_ID_INVALID');
            if (id.startsWith('system.user.') || id.startsWith('system.group.')) auth.requireRight(options, 'users', name === 'delObject' ? 'delete' : 'write');
            const oldObject = auth.parse(await this.store.get(this.objNamespace + id));
            if (oldObject && !auth.objectRight(oldObject, options, 'write')) throw auth.denied();
            if (!oldObject && name !== 'delObject') auth.requireRight(options, 'object', 'create');
            if (name !== 'delObject') {
                args[1] = auth.prepareHostDocument(id, args[1], options, this.hostname);
                auth.validateDocument(args[1]); auth.protectAcl(oldObject, args[1], options);
            }
        }
    }

    async invoke(name, args, spec) {
        const action = async () => {
            if (!this.client || this.stop) throw new Error('DB closed');
            if (['subscribe', 'subscribeUser'].includes(name)) {
                const patterns = Array.isArray(args[0]) ? args[0] : [args[0]];
                if (!patterns.length || patterns.length > 1024 || patterns.some(pattern => typeof pattern !== 'string' || !pattern.length || Buffer.byteLength(pattern) > 1000)) throw new Error('EOS_PG_SUBSCRIPTION_INVALID');
            }
            const options = await auth.resolve(this.store, this.objNamespace, args[spec.options]);
            auth.requireRight(options, spec.domain || 'object', spec.action);
            if (spec.adminOnly && !auth.admin(options)) throw auth.denied();
            if (spec.mutates) await this.authorizeMutation(name, args, options);
            args[spec.options] = options;
            const execute = () => spec.promise ? UpstreamClient.prototype[name].apply(this, args) : new Promise((resolve, reject) => {
                const callback = (error, ...values) => error ? reject(error) : resolve(values);
                const callArgs = args.slice(0, spec.options + 1);
                callArgs.push(callback, ...args.slice(spec.options + 1));
                const result = UpstreamClient.prototype[name].apply(this, callArgs);
                if (result && typeof result.then === 'function') result.catch(reject);
            });
            const result = await this.authorization.run(options, execute);
            if (name === 'getObject' && result[0] && !auth.objectRight(result[0], options, 'read')) throw auth.denied();
            if (name === 'getObjectList' && result[0]?.rows) result[0].rows = result[0].rows.filter(row => auth.objectRight(row.value, options, 'read'));
            if (name === 'findObject' && result[0] && !auth.objectRight(auth.parse(await this.store.get(this.objNamespace + result[0])), options, 'read')) throw auth.denied();
            if (name === 'objectExists' && result && !auth.objectRight(auth.parse(await this.store.get(this.objNamespace + args[0])), options, 'read')) throw auth.denied();
            if (['subscribe', 'subscribeUser', 'subscribeUserFile'].includes(name)) {
                const patterns = name === 'subscribeUserFile' ? (Array.isArray(args[1]) ? args[1] : [args[1]]).map(pattern => this.getFileId(args[0], pattern, false)) : (Array.isArray(args[0]) ? args[0] : [args[0]]).map(pattern => this.objNamespace + pattern);
                const contexts = name === 'subscribe' ? this.systemSubscriptionContexts : this.userSubscriptionContexts;
                for (const pattern of patterns) contexts.set(pattern, options.user);
            }
            if (['unsubscribe', 'unsubscribeUser', 'unsubscribeUserFile'].includes(name)) {
                const patterns = name === 'unsubscribeUserFile' ? (Array.isArray(args[1]) ? args[1] : [args[1]]).map(pattern => this.getFileId(args[0], pattern, false)) : (Array.isArray(args[0]) ? args[0] : [args[0]]).map(pattern => this.objNamespace + pattern);
                const contexts = name === 'unsubscribe' ? this.systemSubscriptionContexts : this.userSubscriptionContexts;
                for (const pattern of patterns) contexts.delete(pattern);
            }
            return spec.promise ? [result] : result;
        };
        return spec.mutates ? this.store.transaction(action, { lockKey: ACL_LOCK }) : action();
    }
}

// A uniform gate is applied before every inherited public data access method.
// Parent callbacks are converted to one Promise settlement; no denied operation
// reaches the inherited missing-return write check in version 7.2.2.
const methods = {
    getObject: { options: 1, action: 'read' }, getKeys: { options: 1, action: 'list' }, getObjects: { options: 1, action: 'read' }, getObjectsByPattern: { options: 1, action: 'read' },
    getObjectView: { options: 3, action: 'list' }, getObjectList: { options: 1, action: 'list' }, findObject: { options: 2, action: 'list' },
    setObject: { options: 2, action: 'write', mutates: true }, extendObject: { options: 2, action: 'write', mutates: true }, delObject: { options: 1, action: 'delete', mutates: true },
    chownObject: { options: 1, action: 'write', mutates: true }, chmodObject: { options: 1, action: 'write', mutates: true }, destroyDB: { options: 0, action: 'write', mutates: true },
    objectExists: { options: 1, action: 'list', promise: true }, fileExists: { options: 2, action: 'list', domain: 'file', promise: true },
    writeFile: { options: 3, action: 'write', domain: 'file', mutates: true }, readFile: { options: 2, action: 'read', domain: 'file', result: values => ({ file: values[0], mimeType: values[1] }) },
    readDir: { options: 2, action: 'list', domain: 'file', adminOnly: true }, unlink: { options: 2, action: 'delete', domain: 'file', mutates: true }, delFile: { options: 2, action: 'delete', domain: 'file', mutates: true },
    rename: { options: 3, action: 'write', domain: 'file', mutates: true }, touch: { options: 2, action: 'write', domain: 'file', mutates: true }, rm: { options: 2, action: 'delete', domain: 'file', mutates: true },
    mkdir: { options: 2, action: 'create', domain: 'file', mutates: true }, chownFile: { options: 2, action: 'write', domain: 'file', mutates: true }, chmodFile: { options: 2, action: 'write', domain: 'file', mutates: true },
    enableFileCache: { options: 1, action: 'write' }, subscribe: { options: 1, action: 'list' }, unsubscribe: { options: 1, action: 'list' }, subscribeUser: { options: 1, action: 'list' }, unsubscribeUser: { options: 1, action: 'list' },
    subscribeUserFile: { options: 2, action: 'list', domain: 'file', promise: true }, unsubscribeUserFile: { options: 2, action: 'list', domain: 'file', promise: true }
};
for (const [name, spec] of Object.entries(methods)) {
    Object.defineProperty(Client.prototype, name, { value: function (...supplied) {
        let callback;
        if (typeof supplied[spec.options + 1] === 'function') [callback] = supplied.splice(spec.options + 1, 1);
        else if (typeof supplied[supplied.length - 1] === 'function') callback = supplied.pop();
        while (supplied.length <= spec.options) supplied.push(undefined);
        const promise = this.invoke(name, supplied, spec);
        if (callback) { promise.then(values => callback(null, ...values), error => callback(error)); return; }
        return promise.then(values => spec.result ? spec.result(values) : values[0]);
    } });
}

module.exports = { Client, getDefaultPort: () => 5432, objectsUtils };
