'use strict';

const { EventEmitter } = require('node:events');

function match(pattern, text) {
    if (typeof pattern !== 'string' || Buffer.byteLength(pattern) > 1024) throw new Error('EOS_PG_PATTERN_INVALID');
    if (typeof text !== 'string' || Buffer.byteLength(text) > 1024) throw new Error('EOS_PG_PATTERN_VALUE_INVALID');
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


class Subscription extends EventEmitter {
    constructor(store) { super(); this.store = store; this.patterns = new Set(); this.channels = new Set(); }
    psubscribe(pattern, callback) {
        const operation = Promise.resolve().then(() => {
            match(pattern, '');
            if (!this.patterns.has(pattern) && this.patterns.size >= 1024) throw new Error('EOS_PG_SUBSCRIPTION_LIMIT');
            this.patterns.add(pattern); return this.patterns.size;
        });
        if (callback) operation.then(value => callback(null, value), callback);
        return operation;
    }
    async punsubscribe(pattern) { this.patterns.delete(pattern); return this.patterns.size; }
    async subscribe(channel) { this.channels.add(channel); return this.channels.size; }
    dispatch(event) {
        const payload = Buffer.isBuffer(event.payload) ? event.payload.toString('utf8') : String(event.payload);
        if (this.channels.has(event.channel)) this.emit('message', event.channel, payload);
        for (const pattern of this.patterns) if (match(pattern, event.channel)) this.emit('pmessage', pattern, event.channel, payload);
    }
    async quit() { this.patterns.clear(); this.channels.clear(); this.removeAllListeners(); }
}

class Facade extends EventEmitter {
    constructor(store) { super(); this.store = store; }
    async get(key) { const value = await this.store.get(key); return value === null ? null : value.toString('utf8'); }
    getBuffer(key) { return this.store.get(key); }
    async mget(keys) {
        const values = [];
        for (let index = 0; index < keys.length; index += 10000) values.push(...await this.store.getMany(keys.slice(index, index + 10000)));
        return values.map(value => value === null ? null : value.toString('utf8'));
    }
    async set(key, value) { await this.store.set(key, value); return 'OK'; }
    del(...keys) { return this.store.delete(keys.flat()); }
    async exists(key) { return await this.store.get(key) === null ? 0 : 1; }
    publish(channel, payload) { return this.store.publish(channel, payload); }
    rename(from, to) { return this.store.rename(from, to); }
    multi(commands) {
        // Only the small compatibility vocabulary is admitted. There is no SQL
        // text, Lua or Redis command execution entry point in this facade.
        return { exec: () => this.store.transaction(async () => {
            const result = [];
            for (const [name, ...args] of commands) {
                if (!['set', 'del', 'rename'].includes(name)) throw new Error('EOS_PG_COMMAND_UNSUPPORTED');
                result.push([null, await this[name](...args)]);
            }
            return result;
        }, { lockKey: 'objects:acl-write' }) };
    }
    async quit() { this.removeAllListeners(); }
}

module.exports = { Facade, Subscription, match };
