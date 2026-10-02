'use strict';
// Server-owned capabilities. Never take this policy from an adapter request.
const { createHash } = require('node:crypto');
const fail = code => Object.assign(new Error(code), { code });
const ensure = (ok, code = 'EOS_CHANNEL_POLICY') => { if (!ok) throw fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function shape(value, fields, code = 'EOS_CHANNEL_POLICY') {
    ensure(plain(value) && Object.keys(value).length === fields.length && fields.every(k => Object.hasOwn(value, k)), code);
}
function peerId(id) { return typeof id === 'string' && /^[a-z][a-z0-9-]{0,31}\.[0-9]{1,3}$/.test(id); }
function stateId(id) {
    return typeof id === 'string' && id.length <= 256 && /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/.test(id) &&
        !/^(system|session|meta|messagebox|log)\./.test(id);
}
function unique(array, maximum, key = x => x) {
    ensure(Array.isArray(array) && array.length <= maximum && new Set(array.map(key)).size === array.length);
}
function compilePolicy(input) {
    shape(input, ['schemaVersion', 'revision', 'peers']);
    ensure(input.schemaVersion === 1 && Number.isSafeInteger(input.revision) && input.revision > 0);
    unique(input.peers, 64, p => p?.id);
    const ids = new Set(input.peers.map(p => p.id)), fingerprints = new Set();
    const peers = new Map();
    for (const peer of input.peers) {
        shape(peer, ['id', 'fingerprint256', 'read', 'write', 'send']);
        ensure(peerId(peer.id) && typeof peer.fingerprint256 === 'string' && /^[a-f0-9]{64}$/.test(peer.fingerprint256) && !/^0+$/.test(peer.fingerprint256));
        ensure(!fingerprints.has(peer.fingerprint256)); fingerprints.add(peer.fingerprint256);
        unique(peer.read, 128); ensure(peer.read.every(stateId));
        unique(peer.write, 128, r => r?.id);
        for (const rule of peer.write) {
            ensure(plain(rule) && ['number', 'boolean', 'string'].includes(rule.type));
            shape(rule, ['id', 'mode', 'type', ...(rule.type === 'number' ? ['min', 'max'] : rule.type === 'string' ? ['maxLength'] : [])]);
            ensure(stateId(rule.id) && ['telemetry', 'request'].includes(rule.mode));
            ensure(rule.id.startsWith(rule.mode === 'telemetry' ? `${peer.id}.` : `eos.requests.${peer.id}.`));
            if (rule.type === 'number') ensure(Number.isFinite(rule.min) && Number.isFinite(rule.max) && rule.min <= rule.max);
            if (rule.type === 'string') ensure(Number.isInteger(rule.maxLength) && rule.maxLength > 0 && rule.maxLength <= 1024);
        }
        unique(peer.send, 32, r => `${r?.to}/${r?.command}`);
        for (const rule of peer.send) {
            shape(rule, ['to', 'command']);
            ensure(ids.has(rule.to) && typeof rule.command === 'string' && /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(rule.command));
        }
        const copy = JSON.parse(JSON.stringify(peer));
        peers.set(peer.fingerprint256, copy);
    }
    return { revision: input.revision, peers };
}
function identify(socket, policy) {
    ensure(socket.authorized === true && socket.getProtocol?.() === 'TLSv1.3', 'EOS_CHANNEL_PEER');
    const certificate = socket.getPeerCertificate();
    ensure(certificate?.raw, 'EOS_CHANNEL_PEER');
    const peer = policy.peers.get(createHash('sha256').update(certificate.raw).digest('hex'));
    ensure(peer && certificate.subject?.CN === peer.id, 'EOS_CHANNEL_PEER');
    return peer;
}
function validateWrite(peer, payload) {
    shape(payload, ['id', 'value'], 'EOS_CHANNEL_REQUEST');
    const rule = peer.write.find(r => r.id === payload.id);
    ensure(rule, 'EOS_CHANNEL_DENIED');
    ensure(typeof payload.value === rule.type, 'EOS_CHANNEL_VALUE');
    if (rule.type === 'number') ensure(Number.isFinite(payload.value) && payload.value >= rule.min && payload.value <= rule.max, 'EOS_CHANNEL_VALUE');
    if (rule.type === 'string') ensure(Buffer.byteLength(payload.value) <= rule.maxLength && !/[\u0000-\u001f\u007f]/.test(payload.value), 'EOS_CHANNEL_VALUE');
    return rule;
}
module.exports = { fail, ensure, shape, compilePolicy, identify, validateWrite, stateId };
