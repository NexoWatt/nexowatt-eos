'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = require('../src/lib/eosLicenseCore');
const shipped = require('../build/lib/eosLicenseCore');

test('shipped licensing JavaScript includes the exact reviewed source and policy', () => {
    for (const name of ['eosLicenseCore.js', 'eosLicenseService.js', 'eosLicensePolicy.js']) {
        assert.deepEqual(fs.readFileSync(path.join(__dirname, '../build/lib', name)),
            fs.readFileSync(path.join(__dirname, '../src/lib', name)), name);
    }
    assert.equal(typeof require('../build/lib/eosLicenseService').EosLicenseService, 'function');
});

test('actual shipped verifier accepts NWL3 under the same issuer and rejects injected limits', () => {
    const pair = crypto.generateKeyPairSync('ed25519');
    const uuid = '12345678-1234-4234-8234-123456789abc';
    const now = Date.UTC(2026, 9, 3);
    const options = { uuid, now, publicKeys: { test: pair.publicKey.export({ type: 'spki', format: 'pem' }) } };
    function token(edition, extra = {}) {
        const payload = { v: 3, kid: 'test', licenseId: 'build-parity', uuid, edition,
            issuedAt: now, notBefore: now, expiresAt: null, scope: 'system', ...extra };
        const text = `NWL3.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
        return `${text}.${crypto.sign(null, Buffer.from(text), pair.privateKey).toString('base64url')}`;
    }
    for (const edition of ['home', 'pro']) {
        const raw = token(edition);
        assert.deepEqual(shipped.verifyLicense(raw, options), source.verifyLicense(raw, options));
        assert.equal(shipped.verifyLicense(raw, options).scope, 'system');
    }
    assert.throws(() => shipped.verifyLicense(token('home', { limits: { chargePoints: 1000, batteries: 10 } }), options), { code: 'LICENSE_CLAIMS_INVALID' });
});
