'use strict';
const https = require('node:https');
const tls = require('node:tls');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { fail, ensure, shape } = require('./policy.cjs');
const { tlsOptions, LIMITS } = require('./server.cjs');
// No redirects, plaintext, environment credentials, or automatic command retry.
class ChannelClient {
    constructor(config) {
        shape(config, ['host', 'port', 'tls'], 'EOS_CHANNEL_CONFIG');
        ensure(typeof config.host === 'string' && (net.isIP(config.host) || /^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(config.host)), 'EOS_CHANNEL_CONFIG');
        ensure(Number.isInteger(config.port) && config.port > 0 && config.port <= 65535, 'EOS_CHANNEL_CONFIG');
        this.config = { host: config.host, port: config.port, ...tlsOptions(config.tls), checkServerIdentity: tls.checkServerIdentity };
        this.epoch = null; this.active = 0; this.closed = false; this.requests = new Set();
    }
    _request(path, envelope, deadline) {
        ensure(!this.closed, 'EOS_CHANNEL_CLOSED');
        const remaining = deadline - performance.now(); ensure(remaining > 0, 'EOS_CHANNEL_DEADLINE');
        const data = envelope ? JSON.stringify(envelope) : null;
        ensure(!data || Buffer.byteLength(data) <= LIMITS.body, 'EOS_CHANNEL_SIZE');
        return new Promise((resolve, reject) => {
            let finished = false, size = 0, chunks = [];
            const request = https.request({ ...this.config, path, method: data ? 'POST' : 'GET', agent: false,
                headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} });
            this.requests.add(request);
            const finish = (error, result) => {
                if (finished) return; finished = true; clearTimeout(timer); this.requests.delete(request); chunks = [];
                error ? reject(error) : resolve(result);
            };
            const timer = setTimeout(() => { finish(fail('EOS_CHANNEL_DEADLINE')); request.destroy(); }, remaining);
            request.on('socket', socket => socket.once('secureConnect', () => {
                if (socket.authorized !== true || socket.getProtocol() !== 'TLSv1.3') { finish(fail('EOS_CHANNEL_TLS')); request.destroy(); }
            }));
            request.once('error', () => finish(fail('EOS_CHANNEL_CONNECTION')));
            request.once('response', response => {
                const invalid = () => { finish(fail('EOS_CHANNEL_RESPONSE')); response.destroy(); request.destroy(); };
                if (response.headers['content-type'] !== 'application/json') return invalid();
                response.on('data', chunk => { size += chunk.length; if (size > LIMITS.response) invalid(); else chunks.push(chunk); });
                response.once('error', invalid); response.once('aborted', invalid);
                response.once('end', () => {
                    try {
                        const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
                        if (response.statusCode !== 200 || result?.ok !== true) {
                            const code = /^EOS_CHANNEL_[A-Z_]+$/.test(result?.code || '') ? result.code : 'EOS_CHANNEL_RESPONSE';
                            if (code === 'EOS_CHANNEL_SESSION' || code === 'EOS_CHANNEL_REVOKED') this.epoch = null;
                            return finish(fail(code));
                        }
                        if (envelope) ensure(result.id === envelope.id && Object.hasOwn(result, 'result'), 'EOS_CHANNEL_RESPONSE');
                        else ensure(typeof result.epoch === 'string' && /^[0-9a-f-]{36}$/.test(result.epoch), 'EOS_CHANNEL_RESPONSE');
                        finish(null, result);
                    } catch { invalid(); }
                });
            });
            request.end(data);
        });
    }
    async call(op, payload) {
        ensure(!this.closed, 'EOS_CHANNEL_CLOSED'); ensure(this.active < LIMITS.perPeer, 'EOS_CHANNEL_BUSY'); this.active++;
        const started = performance.now(), issuedAt = Date.now(), deadline = started + LIMITS.deadline;
        try {
            if (!this.epoch) this.epoch = (await this._request('/v1/session', null, deadline)).epoch;
            const envelope = { v: 1, epoch: this.epoch, id: randomUUID(), issuedAt, expiresAt: issuedAt + LIMITS.deadline, op, payload };
            const response = await this._request('/v1/rpc', envelope, deadline);
            return response.result;
        } finally { this.active--; }
    }
    readState(id) { return this.call('state.read', { id }); }
    writeState(id, value) { return this.call('state.write', { id, value }); }
    send(to, command, data) { return this.call('message.send', { to, command, data }); }
    async receive() {
        const messages = await this.call('message.receive', {});
        ensure(Array.isArray(messages), 'EOS_CHANNEL_RESPONSE');
        return messages.filter(message => Number.isSafeInteger(message.expiresAt) && message.expiresAt > Date.now());
    }
    close() { this.closed = true; for (const request of this.requests) request.destroy(); this.requests.clear(); }
}
module.exports = { ChannelClient };
