#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { CANONICAL_NATIVE_DEFAULTS, ensureReleaseDefaults } = require('./nexowatt-ensure-release-defaults.cjs');

const unsafe = {
    common: { name: 'eos-admin', plugins: { sentry: { dsn: 'test-placeholder' } } },
    native: {
        auth: false,
        port: 8091,
        eosLockLegacyAdmin: false,
        eosHideLegacyAdminFromNonAdmins: false,
        eosHideLegacyBackupFromNonAdmins: false,
        nexowattHideLegacyBackupFromNonAdmins: false,
        eosRequireFirstLoginPassword: false,
    },
};
const repaired = ensureReleaseDefaults(unsafe);
assert.ok(repaired.changes.length >= 7, 'unsafe defaults must be repaired');
assert.equal(Object.hasOwn(repaired.ioPackage.common, 'plugins'), false, 'optional adapter plugins must never be shipped');
for (const [key, expected] of Object.entries(CANONICAL_NATIVE_DEFAULTS)) {
    assert.equal(repaired.ioPackage.native[key], expected, `${key} must be normalized`);
}

const canonical = { native: { ...CANONICAL_NATIVE_DEFAULTS } };
const unchanged = ensureReleaseDefaults(canonical);
assert.equal(unchanged.changes.length, 0, 'canonical defaults must remain unchanged');

console.log('[NexoWatt EOS release defaults selftest] OK');
