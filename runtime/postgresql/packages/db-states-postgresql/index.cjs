'use strict';

const { isDeepStrictEqual } = require('node:util');
const { randomInt } = require('node:crypto');

const MAX_KEY_BYTES = 1024;
const MAX_VALUE_BYTES = 16 * 1024 * 1024;
const MAX_EVENT_BYTES = 1024 * 1024;
const MAX_SUBSCRIPTIONS = 1024;
const MAX_PENDING_EVENTS = 1024;
const MAX_PENDING_EVENT_BYTES = 16 * 1024 * 1024;
const PROTOCOL_VERSION = '4';

function fail(code) { return new Error(code); }
function keyString(value) {
    if (typeof value !== 'string' || !value.length || Buffer.byteLength(value) > MAX_KEY_BYTES || /[\u0000-\u001f\u007f]/u.test(value)) {
        throw fail('EOS_PG_STATES_INVALID_KEY');
    }
    return value;
}
function namespace(value, fallback) {
    const name = value === undefined ? fallback : value;
    if (typeof name !== 'string' || name.length > 128 || !/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(name)) throw fail('EOS_PG_STATES_INVALID_NAMESPACE');
    return `${name}.`;
}
function json(value, max = MAX_VALUE_BYTES) {
    let encoded;
    try {
        encoded = JSON.stringify(value, (_key, item) => {
            if (typeof item === 'bigint' || typeof item === 'function' || typeof item === 'symbol' || (typeof item === 'number' && !Number.isFinite(item))) {
                throw fail('EOS_PG_STATES_INVALID_JSON');
            }
            return item;
        });
    } catch { throw fail('EOS_PG_STATES_INVALID_JSON'); }
    if (encoded === undefined) throw fail('EOS_PG_STATES_INVALID_JSON');
    if (Buffer.byteLength(encoded) > max) throw fail('EOS_PG_STATES_VALUE_TOO_LARGE');
    return encoded;
}
function parse(value, reviveBuffers = false) {
    if (value === null) return null;
    try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(value);
        return JSON.parse(decoded, reviveBuffers ? (_key, item) => {
            if (item && typeof item === 'object' && item.type === 'Buffer' && Array.isArray(item.data)) {
                if (!item.data.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) throw fail('EOS_PG_STATES_INVALID_BUFFER');
                return Buffer.from(item.data);
            }
            return item;
        } : undefined);
    } catch { throw fail('EOS_PG_STATES_INVALID_STORED_JSON'); }
}
function expiration(seconds) {
    if (seconds === undefined || seconds === null || seconds === 0) return null;
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 2147483647) throw fail('EOS_PG_STATES_INVALID_EXPIRY');
    return seconds * 1000;
}

// Iterative wildcard matching avoids RegExp backtracking for adapter-controlled patterns.
// Redis glob semantics: *, ?, character classes/ranges, ^ negation and backslash escapes.
function globMatch(pattern, text) {
    if (!/[*?\[\\]/.test(pattern)) return pattern === text;
    if (pattern.endsWith('*') && !/[*?\[\\]/.test(pattern.slice(0, -1))) return text.startsWith(pattern.slice(0, -1));
    // Redis applies its glob syntax to UTF-8 bytes; exact non-ASCII identifiers
    // must not split into UTF-16 pattern halves versus code-point text units.
    pattern = Buffer.from(pattern, 'utf8').toString('latin1');
    text = Buffer.from(text, 'utf8').toString('latin1');
    const tokens = [];
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (char === '*') { if (tokens.at(-1)?.type !== '*') tokens.push({ type: '*' }); }
        else if (char === '?') tokens.push({ type: '?' });
        else if (char === '\\' && i + 1 < pattern.length) tokens.push({ type: 'literal', value: pattern[++i] });
        else if (char === '[') {
            let j = i + 1;
            const negated = pattern[j] === '^'; if (negated) j++;
            const chars = [];
            while (j < pattern.length && pattern[j] !== ']') {
                let from = pattern[j++];
                if (from === '\\' && j < pattern.length) from = pattern[j++];
                if (pattern[j] === '-' && j + 1 < pattern.length && pattern[j + 1] !== ']') {
                    j++; let to = pattern[j++]; if (to === '\\' && j < pattern.length) to = pattern[j++];
                    chars.push([from, to]);
                } else chars.push([from, from]);
            }
            if (j === pattern.length || !chars.length) tokens.push({ type: 'literal', value: '[' });
            else { tokens.push({ type: 'class', negated, chars }); i = j; }
        } else tokens.push({ type: 'literal', value: char });
    }
    let current = new Set([0]);
    const closure = values => {
        for (const n of values) if (tokens[n]?.type === '*') values.add(n + 1);
        return values;
    };
    current = closure(current);
    for (const character of text) {
        const next = new Set();
        for (const n of current) {
            const token = tokens[n]; if (!token) continue;
            if (token.type === '*') next.add(n);
            else if (token.type === '?' || (token.type === 'literal' && token.value === character)) next.add(n + 1);
            else if (token.type === 'class') {
                const match = token.chars.some(([from, to]) => character >= from && character <= to);
                if (match !== token.negated) next.add(n + 1);
            }
        }
        current = closure(next); if (!current.size) return false;
    }
    return closure(current).has(tokens.length);
}

function normalizeState(state, oldState) {
    if (!state || typeof state !== 'object' || Array.isArray(state) || Buffer.isBuffer(state)) state = { val: state };
    oldState = oldState && typeof oldState === 'object' ? oldState : { val: null };
    const normalized = {
        val: state.val === undefined ? oldState.val : state.val,
        ack: state.ack === undefined ? false : state.ack === null ? oldState.ack || false : state.ack,
        ts: typeof state.ts === 'number' ? state.ts < 946681200000 ? state.ts * 1000 : state.ts : Date.now(),
        q: state.q === undefined ? 0 : state.q,
        from: state.from,
    };
    if (typeof state.c === 'string' && state.c) normalized.c = state.c.substring(0, 512);
    if (state.user !== undefined) normalized.user = state.user;
    normalized.lc = typeof state.lc === 'number' ? state.lc : !oldState.lc || !isDeepStrictEqual(oldState.val, normalized.val) ? normalized.ts : oldState.lc;
    return { normalized, ttlMs: expiration(state.expire) };
}

class Client {
    constructor(settings = {}, injection = {}) {
        this.settings = settings;
        this.namespaceRedis = namespace(settings.redisNamespace, 'io');
        this.namespaceMsg = namespace(settings.namespaceMsg, 'messagebox');
        this.namespaceLog = namespace(settings.namespaceLog, 'log');
        this.namespaceSession = namespace(settings.namespaceSession, 'session');
        this.metaNamespace = namespace(settings.metaNamespace, 'meta');
        const prefixes = [this.namespaceRedis, this.namespaceMsg, this.namespaceLog, this.namespaceSession, this.metaNamespace];
        if (prefixes.some((prefix, index) => prefixes.some((other, otherIndex) => index !== otherIndex && prefix.startsWith(other)))) throw fail('EOS_PG_STATES_NAMESPACE_COLLISION');
        this._system = new Set(); this._user = new Set(); this._messages = new Set(); this._logs = new Set();
        this._ready = false; this._closed = false; this._connecting = false; this._initialized = false;
        this._generation = 0; this._pendingEvents = 0; this._pendingEventBytes = 0;
        this._messageId = randomInt(0, 100000001); this._logId = randomInt(0, 100000001);
        // Dependency injection is a code-only test seam, never a setting read from iobroker.json.
        this.store = injection.store || new (require('@nexowatt/eos-postgresql-store').Store)(settings.connection, { domain: 'states' });
        this._eventListener = event => this._event(event);
        this._disconnectedListener = () => this._disconnect();
        this._connectedListener = () => {
            if (this._initialized && !this._connecting && !this._closed) void this.connectDb().catch(() => this._diagnostic('EOS_PG_STATES_RECONNECT_FAILED'));
        };
        this.store.on('event', this._eventListener);
        this.store.on('disconnected', this._disconnectedListener);
        this.store.on('connected', this._connectedListener);
        if (settings.autoConnect !== false) void this.connectDb().catch(() => this._diagnostic('EOS_PG_STATES_CONNECT_FAILED'));
    }
    _diagnostic(code) { try { this.settings.logger?.warn?.(code); } catch {} }
    _notify(callback, ...args) { if (typeof callback === 'function') setImmediate(() => { try { callback(...args); } catch { this._diagnostic('EOS_PG_STATES_CALLBACK_FAILED'); } }); }
    _disconnect() { const wasReady = this._ready; this._ready = false; this._generation++; if (wasReady) this._notify(this.settings.disconnected); }
    _assertReady() { if (this._closed || !this._ready || !this.store.connected) throw fail('EOS_PG_STATES_DB_UNAVAILABLE'); }
    _qualified(prefix, id) { return keyString(prefix + keyString(id)); }
    async _call(callback, operation, session = false) {
        let result;
        try { result = await operation(); }
        catch (error) { if (typeof callback !== 'function') throw error; setImmediate(callback, error); return; }
        if (typeof callback !== 'function') return result;
        if (session) setImmediate(callback, result);
        else if (result === undefined) setImmediate(callback, null);
        else setImmediate(callback, null, result);
    }
    async connectDb() {
        if (this._closed) throw fail('EOS_PG_STATES_DB_UNAVAILABLE');
        if (this._connecting) return this._connectionPromise;
        this._connecting = true;
        this._connectionPromise = (async () => {
            try {
                if (!this.store.connected) await this.store.connect();
                await this._determineProtocolVersion();
                if (this._closed) throw fail('EOS_PG_STATES_DB_UNAVAILABLE');
                const wasReady = this._ready; this._ready = true; this._initialized = true;
                if (!wasReady) this._notify(this.settings.connected);
            } catch (error) { this._disconnect(); throw error; }
            finally { this._connecting = false; }
        })();
        return this._connectionPromise;
    }
    async _determineProtocolVersion() {
        if (!this.store.connected || this._closed) throw fail('EOS_PG_STATES_DB_UNAVAILABLE');
        await this.store.update(`${this.metaNamespace}states.protocolVersion`, async current => {
            const version = current?.toString('utf8') || PROTOCOL_VERSION;
            if (version !== PROTOCOL_VERSION) throw fail('EOS_PG_STATES_PROTOCOL_UNSUPPORTED');
            this.activeProtocolVersion = version;
            return { value: version, ttlMs: null, result: undefined };
        });
    }
    getStatus() { return { type: 'postgresql', server: false }; }
    setState(id, state, callback) {
        return this._call(callback, async () => {
            this._assertReady(); const key = this._qualified(this.namespaceRedis, id);
            return this.store.update(key, async current => {
                const { normalized, ttlMs } = normalizeState(state, parse(current));
                const value = json(normalized, MAX_EVENT_BYTES);
                return { value, ttlMs, event: { channel: key, payload: value }, result: id };
            });
        });
    }
    setStateAsync(id, state) { return this.setState(id, state); }
    async setRawState(id, state) {
        this._assertReady(); const key = this._qualified(this.namespaceRedis, id);
        await this.store.set(key, json(state), { ttlMs: null }); return id;
    }
    getState(id, callback) { return this._call(callback, async () => { this._assertReady(); return parse(await this.store.get(this._qualified(this.namespaceRedis, id))); }); }
    getStateAsync(id) { return this.getState(id); }
    getStates(keys, callback, dontModify) {
        return this._call(callback, async () => {
            this._assertReady(); if (!Array.isArray(keys) || keys.length > 10000) throw fail('EOS_PG_STATES_INVALID_KEYS');
            const qualified = keys.map(id => dontModify ? this._qualifiedInput(id) : this._qualified(this.namespaceRedis, id));
            return (await this.store.getMany(qualified)).map(value => parse(value));
        });
    }
    _qualifiedInput(id) { keyString(id); if (!id.startsWith(this.namespaceRedis)) throw fail('EOS_PG_STATES_NAMESPACE_DENIED'); return id; }
    _destroyDBHelper(keys, callback) {
        return this._call(callback, async () => {
            this._assertReady(); if (!Array.isArray(keys) || keys.length > 100000) throw fail('EOS_PG_STATES_INVALID_KEYS');
            const qualified = keys.map(id => this._qualifiedInput(id));
            for (let i = 0; i < qualified.length; i += 10000) await this.store.delete(qualified.slice(i, i + 10000));
        });
    }
    destroyDB(callback) { return this._call(callback, async () => { this._assertReady(); await this._destroyDBHelper(await this.store.keys(`${this.namespaceRedis}*`)); }); }
    async destroy() {
        if (this._closed) return;
        this._closed = true; this._ready = false; this._generation++;
        this.store.off('event', this._eventListener); this.store.off('disconnected', this._disconnectedListener); this.store.off('connected', this._connectedListener);
        this._system.clear(); this._user.clear(); this._messages.clear(); this._logs.clear(); await this.store.close();
    }
    delState(id, callback) { return this._call(callback, async () => { this._assertReady(); const key = this._qualified(this.namespaceRedis, id); await this.store.delete(key, { event: { channel: key, payload: 'null' } }); return id; }); }
    getKeys(pattern, callback, dontModify) {
        return this._call(callback, async () => { this._assertReady(); const keys = await this.store.keys(this._qualified(this.namespaceRedis, pattern)); return dontModify ? keys : keys.map(key => key.substring(this.namespaceRedis.length)); });
    }
    _subscription(set, prefix, id, remove, callback) {
        return this._call(callback, async () => {
            this._assertReady(); const qualified = this._qualified(prefix, id);
            if (remove) set.delete(qualified);
            else {
                const count = this._system.size + this._user.size + this._messages.size + this._logs.size;
                if (!set.has(qualified) && count >= MAX_SUBSCRIPTIONS) throw fail('EOS_PG_STATES_SUBSCRIPTION_LIMIT');
                set.add(qualified);
            }
        });
    }
    subscribe(pattern, asUser, callback) { if (typeof asUser === 'function') { callback = asUser; asUser = false; } return this._subscription(asUser ? this._user : this._system, this.namespaceRedis, pattern, false, callback); }
    subscribeUser(pattern, callback) { return this.subscribe(pattern, true, callback); }
    unsubscribe(pattern, asUser, callback) { if (typeof asUser === 'function') { callback = asUser; asUser = false; } return this._subscription(asUser ? this._user : this._system, this.namespaceRedis, pattern, true, callback); }
    unsubscribeUser(pattern, callback) { return this.unsubscribe(pattern, true, callback); }
    async pushMessage(id, message) {
        this._assertReady(); const channel = this._qualified(this.namespaceMsg, id);
        if (!message || typeof message !== 'object' || Array.isArray(message)) throw fail('EOS_PG_STATES_INVALID_MESSAGE');
        const value = json({ ...message, _id: this._messageId }, MAX_EVENT_BYTES);
        this._messageId = (this._messageId + 1) % 4294967295; await this.store.publish(channel, value);
    }
    subscribeMessage(id, callback) { return this._subscription(this._messages, this.namespaceMsg, typeof id === 'string' && id.startsWith('.') ? id.substring(1) : id, false, callback); }
    unsubscribeMessage(id, callback) { return this._subscription(this._messages, this.namespaceMsg, typeof id === 'string' && id.startsWith('.') ? id.substring(1) : id, true, callback); }
    pushLog(id, log, callback) {
        return this._call(callback, async () => {
            this._assertReady(); const channel = this._qualified(this.namespaceLog, id);
            if (!log || typeof log !== 'object' || Array.isArray(log)) throw fail('EOS_PG_STATES_INVALID_LOG');
            const value = json({ ...log, _id: this._logId }, MAX_EVENT_BYTES); this._logId = (this._logId + 1) % 4294967295;
            await this.store.publish(channel, value); return id;
        });
    }
    subscribeLog(id, callback) { return this._subscription(this._logs, this.namespaceLog, id, false, callback); }
    unsubscribeLog(id, callback) { return this._subscription(this._logs, this.namespaceLog, id, true, callback); }
    getSession(id, callback) { return this._call(callback, async () => { this._assertReady(); return parse(await this.store.get(this._qualified(this.namespaceSession, id))); }, true); }
    setSession(id, expireS, obj, callback) { return this._call(callback, async () => { this._assertReady(); const ttlMs = expiration(expireS); if (ttlMs === null) throw fail('EOS_PG_STATES_INVALID_EXPIRY'); await this.store.set(this._qualified(this.namespaceSession, id), json(obj), { ttlMs }); }); }
    destroySession(id, callback) { return this._call(callback, async () => { this._assertReady(); await this.store.delete(this._qualified(this.namespaceSession, id)); }); }
    async getProtocolVersion() { this._assertReady(); return (await this.store.get(`${this.metaNamespace}states.protocolVersion`))?.toString('utf8') ?? null; }
    async setProtocolVersion(version) {
        this._assertReady(); if (String(version) !== PROTOCOL_VERSION) throw fail('EOS_PG_STATES_PROTOCOL_UNSUPPORTED');
        const key = `${this.metaNamespace}states.protocolVersion`; await this.store.set(key, PROTOCOL_VERSION, { event: { channel: key, payload: PROTOCOL_VERSION }, ttlMs: null });
    }
    _event(event) {
        if (!this._ready || this._closed || !event || typeof event.channel !== 'string' || !Buffer.isBuffer(event.payload)) return;
        if (Buffer.byteLength(event.channel) > MAX_KEY_BYTES || event.payload.length > MAX_EVENT_BYTES) { this._diagnostic('EOS_PG_STATES_EVENT_LIMIT'); this._disconnect(); return; }
        if (event.channel === `${this.metaNamespace}states.protocolVersion`) {
            if (event.payload.toString('utf8') !== this.activeProtocolVersion) this._disconnect();
            return;
        }
        let matchingBudget = 2000000;
        const dispatch = (subscriptions, callback, stripPrefix) => {
            if (typeof callback !== 'function' || !this._ready) return;
            // Redis emits once per matched pattern; preserve that behavior for overlapping subscriptions.
            for (const pattern of subscriptions) {
                const simple = !/[*?\[\\]/.test(pattern) || pattern.endsWith('*') && !/[*?\[\\]/.test(pattern.slice(0, -1));
                matchingBudget -= Buffer.byteLength(pattern) * (simple ? 1 : Buffer.byteLength(event.channel));
                if (matchingBudget < 0) { this._diagnostic('EOS_PG_STATES_MATCH_LIMIT'); this._disconnect(); return; }
                if (!globMatch(pattern, event.channel)) continue;
                if (this._pendingEvents >= MAX_PENDING_EVENTS || this._pendingEventBytes + event.payload.length > MAX_PENDING_EVENT_BYTES) {
                    this._diagnostic('EOS_PG_STATES_EVENT_LIMIT'); this._disconnect(); return;
                }
                try {
                    const value = parse(event.payload, true);
                    const generation = this._generation;
                    this._pendingEvents++; this._pendingEventBytes += event.payload.length;
                    setImmediate(() => {
                        this._pendingEvents--; this._pendingEventBytes -= event.payload.length;
                        if (this._closed || !this._ready || this._generation !== generation) return;
                        try { callback(stripPrefix ? event.channel.substring(this.namespaceRedis.length) : event.channel, value); }
                        catch { this._diagnostic('EOS_PG_STATES_CALLBACK_FAILED'); }
                    });
                } catch { this._diagnostic('EOS_PG_STATES_EVENT_INVALID'); this._disconnect(); return; }
                // Expiry key events in 7.2.2 use a single .find(), not pattern delivery.
                if (event.expired) break;
            }
        };
        if (event.channel.startsWith(this.namespaceRedis)) {
            dispatch(this._system, this.settings.change, true); dispatch(this._user, this.settings.changeUser, true);
        } else if (!event.expired) {
            dispatch(this._messages, this.settings.change, false); dispatch(this._logs, this.settings.change, false);
        }
    }
}

module.exports = { Client, Server: null, getDefaultPort: () => 5432 };
