'use strict';
// Passive observation of REAL PostgreSQL messagebox responses. No synthesized
// response, adapter patch, require hook or injected transport enters the runtime.
// Only safe summary booleans/editions survive; tokens/nonces/identities do not.
class LeaseObserver {
    constructor(names) {
        if (!Array.isArray(names) || names.length !== 5 || new Set(names).size !== 5 ||
            names.some(name => !['nexowatt-ui', 'nexowatt-devices', 'eebus', 'ocpp21', 'nexowatt-backup'].includes(name)))
            throw new Error('OWN_NATIVE_LEASE_SCOPE');
        this.names = Object.freeze([...names]); this.reset();
    }
    reset() { this.seen = new Map(); this.after = Date.now(); }
    observe(id, envelope) {
        if (typeof id !== 'string' || envelope?.command !== 'eos.license.check' ||
            envelope.from !== 'system.adapter.eos-admin.0' || envelope.callback?.ack !== true) return;
        const name = this.names.find(value => id === 'messagebox.system.adapter.' + value + '.0');
        const value = envelope.message;
        if (!name || !value || value.v !== 1 || typeof value.valid !== 'boolean' ||
            !/^[a-f0-9]{32}$/.test(value.nonce || '') || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.code || '')) return;
        if (value.valid && (!['home', 'pro'].includes(value.edition) || value.code !== 'LICENSE_VALID' ||
            !Number.isSafeInteger(value.checkedAt) || value.checkedAt < this.after - 1000 ||
            !Number.isSafeInteger(value.validUntil) || value.validUntil <= Date.now() ||
            value.validUntil - value.checkedAt > 15000)) return;
        this.seen.set(name, { valid: value.valid, edition: value.valid ? value.edition : null, observedAt: Date.now() });
    }
    matches(valid, edition) {
        return this.names.every(name => { const value = this.seen.get(name);
            return value && value.valid === valid && value.edition === edition && value.observedAt >= this.after && Date.now() - value.observedAt < 15000; });
    }
}
module.exports = { LeaseObserver };
