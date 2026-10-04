'use strict';

// EOS session boundary. Stored tokens are capabilities: a refreshed capability may
// inherit an existing proof, but must never acquire a new proof merely by being saved.
const { AsyncLocalStorage } = require('node:async_hooks');
const { createHash, randomBytes } = require('node:crypto');
const STAMP = 'nexowattEosSessionV1';
const normalizeUser = value => typeof value === 'string' && /^(?:system\.user\.)?[A-Za-z0-9_.@-]{1,128}$/.test(value)
    ? (value.startsWith('system.user.') ? value : `system.user.${value}`) : null;
const failure = () => new Error('EOS_SESSION_REAUTHENTICATION_REQUIRED');
function stable(value, depth = 0) {
    if (depth > 12) throw failure();
    if (Array.isArray(value)) return value.map(item => stable(item, depth + 1));
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key], depth + 1)]));
    return value;
}
function securityProjection(id, object) {
    if (!object) return null;
    if (id.startsWith('system.user.')) {
        const native = object.native || {};
        return [object.type, object.common?.password, object.common?.enabled === true, object.acl,
            native.nexowattEosAccount?.forcePasswordChange === true,
            native.nexowattEosAccount?.passwordInitialized === true,
            native.nexowattEosAccount?.passwordSetupVersion,
            native.nexowattEosAccount?.passwordInitializationVersion,
            native.nexowattPasswordChangeRequired === true, native.eosPasswordChangeRequired === true,
            native.nexowattFirstLoginPending === true, native.eosFirstLoginRequired === true];
    }
    if (id.startsWith('system.group.')) return [object.type, object.common?.enabled !== false, [...(object.common?.members || [])].sort(), object.common?.acl, object.acl];
    return null;
}

function readGroupRows(result) {
    if (!Array.isArray(result?.rows) || result.rows.length > 1024) throw failure();
    const seen = new Set();
    return result.rows.map(row => {
        const group = row?.value;
        // Controller7's system/group view emits common.name as row.id. That
        // display value can be translated and is never an authority identifier.
        const id = group?._id;
        if (group?.type !== 'group' || typeof id !== 'string'
            || !/^system\.group\.[A-Za-z0-9_.@-]{1,128}$/.test(id) || seen.has(id)) throw failure();
        seen.add(id);
        return group;
    });
}

class EosSessionSecurity {
    constructor(adapter, options = {}) {
        this.adapter = adapter;
        this.epoch = randomBytes(32).toString('hex');
        this.context = new AsyncLocalStorage();
        this.proofs = new WeakMap();
        this.connections = new Map();
        this.maxPending = options.maxPending || 32;
        this.timeoutMs = options.timeoutMs || 2000;
        this.pending = 0;
        // PBKDF2 is local CPU work, not a database read. Its 600k-round,
        // 256-byte upstream format needs a separate bounded budget on ARM.
        this.authenticationTimeoutMs = options.authenticationTimeoutMs || 15000;
        this.maxPendingAuthentications = options.maxPendingAuthentications || 2;
        this.pendingAuthentications = 0;
        this.stopped = false;
        this.getOriginal = adapter.getSession.bind(adapter);
        this.setOriginal = adapter.setSession.bind(adapter);
        this.socketAdmin = null;
        adapter.getSession = (id, callback) => {
            const task = this.bounded(async () => {
                if (typeof id !== 'string' || !/^[ar]:/.test(id) || id.length > 4098) return null;
                const data = await new Promise(resolve => this.getOriginal(id, resolve));
                const stamp = data?.[STAMP];
                const expiry = id.startsWith('a:') ? data?.aExp : data?.rExp;
                if (!stamp || stamp.epoch !== this.epoch || !Number.isFinite(expiry) || expiry <= Date.now()) return null;
                const proof = await this.snapshot(data.user);
                return this.matches(stamp, proof) ? data : null;
            }).catch(() => null);
            if (typeof callback === 'function') { void task.then(callback); return; }
            return task;
        };
        adapter.setSession = (id, ttl, data, callback) => {
            const proof = this.context.getStore();
            const task = this.bounded(async () => {
                if (!proof || !/^[ar]:/.test(id) || !this.matches(proof, await this.snapshot(data?.user))) throw failure();
                const stamped = { ...data, [STAMP]: { ...proof } };
                await new Promise((resolve, reject) => this.setOriginal(id, ttl, stamped, error => error ? reject(error) : resolve()));
                if (proof.epoch !== this.epoch || this.stopped) throw failure();
            });
            if (typeof callback === 'function') { void task.then(() => callback(null), () => callback(failure())); return; }
            return task;
        };
    }

    bounded(operation) {
        if (this.stopped || this.pending >= this.maxPending) return Promise.reject(failure());
        this.pending++;
        // A timed-out database operation keeps its slot until it really settles. Repeated
        // timeouts cannot create an unbounded backlog in a disconnected controller.
        const work = Promise.resolve().then(operation).finally(() => { this.pending--; });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(failure()), this.timeoutMs);
            work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
        });
    }

    authenticate(operation) {
        const failure = code => Object.assign(new Error(code), { code });
        if (this.stopped || this.pendingAuthentications >= this.maxPendingAuthentications) {
            return Promise.reject(failure('EOS_AUTHENTICATION_BUSY'));
        }
        this.pendingAuthentications++;
        // Node's PBKDF2 callback cannot cancel submitted native work. Retain
        // its slot after a timeout until it truly settles; never queue retries.
        const work = Promise.resolve().then(operation).finally(() => { this.pendingAuthentications--; });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(failure('EOS_AUTHENTICATION_TIMEOUT')), this.authenticationTimeoutMs);
            work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
        });
    }

    async snapshot(candidate) {
        const userId = normalizeUser(candidate);
        if (!userId || this.stopped) throw failure();
        const epoch = this.epoch;
        const [user, result] = await Promise.all([
            this.adapter.getForeignObjectAsync(userId),
            this.adapter.getObjectViewAsync('system', 'group', { startkey: 'system.group.', endkey: 'system.group.\u9999' }),
        ]);
        if (!user || user.type !== 'user' || user.common?.enabled !== true || typeof user.common?.password !== 'string'
            || !user.common.password || epoch !== this.epoch || this.stopped) throw failure();
        const groups = readGroupRows(result).map(group => [group._id, securityProjection(group._id, group)])
            .sort((a, b) => a[0].localeCompare(b[0]));
        const text = JSON.stringify(stable([userId, securityProjection(userId, user), groups]));
        if (Buffer.byteLength(text) > 1024 * 1024) throw failure();
        return { epoch, userId, fingerprint: createHash('sha256').update(text).digest('hex') };
    }

    matches(a, b) {
        return !this.stopped && a?.epoch === this.epoch && a?.epoch === b?.epoch
            && a?.userId === b?.userId && a?.fingerprint === b?.fingerprint;
    }

    bindOAuthModel(model) {
        for (const name of ['getUser', 'getRefreshToken', 'saveToken']) if (typeof model?.[name] !== 'function') throw failure();
        const getUser = model.getUser.bind(model);
        const getRefresh = model.getRefreshToken.bind(model);
        const save = model.saveToken.bind(model);
        model.getUser = async (name, password) => {
            try {
                // Match the existing EOS enrollment/password-change limits before
                // object reads or native password work can consume bounded slots.
                if (!normalizeUser(name) || typeof password !== 'string' || !password
                    || Buffer.byteLength(password, 'utf8') > 256 || Array.from(password).length > 128) return null;
                const result = await this.authenticate(async () => {
                    const before = await this.bounded(() => this.snapshot(name));
                    const user = await getUser(name, password);
                    if (!user || !this.matches(before, await this.bounded(() => this.snapshot(user.id)))) return null;
                    return { user, before };
                });
                if (!result || !this.matches(result.before, result.before)) return null;
                // Only a still-live request receives the proof. A hash callback
                // arriving after the authentication deadline cannot mint tokens.
                this.proofs.set(result.user, result.before);
                return result.user;
            } catch (error) {
                if (['EOS_AUTHENTICATION_TIMEOUT', 'EOS_AUTHENTICATION_BUSY'].includes(error?.code)) {
                    try { this.adapter.log?.warn?.(error.code); } catch { /* Logging must not reopen authentication. */ }
                }
                return null;
            }
        };
        model.getRefreshToken = async token => {
            try {
                return await this.bounded(async () => {
                    const stored = await new Promise(resolve => this.adapter.getSession(`r:${token}`, resolve));
                    if (!stored?.[STAMP]) return null;
                    const result = await getRefresh(token);
                    if (!result?.user || !this.matches(stored[STAMP], await this.snapshot(result.user.id))) return null;
                    this.proofs.set(result.user, stored[STAMP]);
                    return result;
                });
            } catch { return null; }
        };
        model.saveToken = async (token, client, user) => {
            const proof = user && this.proofs.get(user);
            if (!proof) throw failure();
            return this.bounded(async () => {
                if (!this.matches(proof, await this.snapshot(user.id))) throw failure();
                return this.context.run(proof, () => save(token, client, user));
            });
        };
    }

    handleObjectChange(id, object, previous) {
        if (!/^system\.(?:user|group)\./.test(id)) return;
        try {
            if (JSON.stringify(stable(securityProjection(id, object))) === JSON.stringify(stable(securityProjection(id, previous)))) return;
        } catch { /* Malformed security objects also revoke all sessions. */ }
        this.revoke();
    }

    revoke() {
        this.epoch = randomBytes(32).toString('hex');
        for (const client of this.connections.keys()) this.disconnect(client);
    }

    disconnect(client) {
        const record = this.connections.get(client);
        if (record) record.revoked = true;
        this.connections.delete(client);
        try { this.socketAdmin?.unsubscribeSocket(client); } catch { /* transport still closes */ }
        try { client.emit?.('reauthenticate'); } catch { /* transport still closes */ }
        try {
            if (typeof client.disconnect === 'function') client.disconnect(true);
            else client.close?.();
        } catch { /* command and publication guards remain denied */ }
    }

    isSocketAllowed(client) {
        const record = this.connections.get(client);
        return !!record && !record.revoked && !this.stopped && record.epoch === this.epoch;
    }

    bindSockets(socketAdmin) {
        if (typeof socketAdmin.addEventHandler !== 'function' || typeof socketAdmin.__updateSession !== 'function'
            || typeof socketAdmin.__getUserFromSocket !== 'function') throw failure();
        this.socketAdmin = socketAdmin;
        socketAdmin.addEventHandler('connect', client => {
            if (this.connections.size >= 256) { this.disconnect(client); return; }
            this.connections.set(client, { epoch: this.epoch, revoked: false });
            // Also clean up connections that close before upstream installs its post-auth hooks.
            client.on?.('disconnect', () => this.connections.delete(client));
        });
        socketAdmin.addEventHandler('disconnect', client => this.connections.delete(client));
        const update = socketAdmin.__updateSession.bind(socketAdmin);
        socketAdmin.__updateSession = client => this.isSocketAllowed(client) && update(client);
        const originalAuth = socketAdmin.__getUserFromSocket.bind(socketAdmin);
        socketAdmin.__getUserFromSocket = (client, callback) => {
            const epoch = this.epoch;
            originalAuth(client, (error, user, expiry) => {
                if (error || epoch !== this.epoch || !this.isSocketAllowed(client)) { this.disconnect(client); callback('reauthentication required'); return; }
                void this.bounded(() => this.snapshot(user)).then(proof => {
                    if (epoch !== this.epoch || !this.isSocketAllowed(client)) { this.disconnect(client); callback('reauthentication required'); return; }
                    this.connections.get(client).proof = proof;
                    callback(null, user, expiry);
                }, () => { this.disconnect(client); callback('reauthentication required'); });
            });
        };
        // Polling is an additional missed-event safeguard, not a grace period for normal
        // user/group events: those call revoke synchronously before publication.
        this.timer = setInterval(() => {
            for (const [client, record] of this.connections) {
                if (!record.proof || record.checking || record.revoked) continue;
                record.checking = true;
                void this.bounded(() => this.snapshot(record.proof.userId)).then(current => {
                    if (!this.matches(record.proof, current)) this.disconnect(client);
                }, () => this.disconnect(client)).finally(() => { record.checking = false; });
            }
        }, 5000);
        this.timer.unref?.();
    }

    stop() { this.stopped = true; clearInterval(this.timer); this.revoke(); }
}
module.exports = { EosSessionSecurity, securityProjection, readGroupRows };

