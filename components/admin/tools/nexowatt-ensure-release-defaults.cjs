#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CANONICAL_NATIVE_DEFAULTS = Object.freeze({
    auth: true,
    secure: true,
    noBasicAuth: true,
    autoUpdate: 0,
    eosAutoAssignDefaultRoleUsers: false,
    eosAutoAssignStandardAccounts: false,
    eosPasswordlessFirstLogin: false,
    port: 8081,
    eosLockLegacyAdmin: true,
    eosHideLegacyAdminFromNonAdmins: true,
    eosHideLegacyBackupFromNonAdmins: true,
    nexowattHideLegacyBackupFromNonAdmins: true,
    eosRequireFirstLoginPassword: true,
});

/**
 * Enforce mandatory source defaults for every NexoWatt EOS sales release.
 * This normalizes the repository io-package.json only. Existing installed
 * instance configuration is not overwritten during adapter startup.
 */
function ensureReleaseDefaults(ioPackage) {
    if (!ioPackage || typeof ioPackage !== 'object' || Array.isArray(ioPackage)) {
        throw new TypeError('io-package.json must contain a JSON object');
    }
    const native = ioPackage.native && typeof ioPackage.native === 'object' && !Array.isArray(ioPackage.native)
        ? ioPackage.native
        : (ioPackage.native = {});
    const changes = [];
    // Integrated appliance adapters do not load telemetry or other optional
    // controller plugins. CI flags and opt-out preferences are not a boundary.
    if (ioPackage.common && Object.hasOwn(ioPackage.common, 'plugins')) {
        changes.push({ key: 'common.plugins', value: null });
        delete ioPackage.common.plugins;
    }
    for (const [key, value] of Object.entries(CANONICAL_NATIVE_DEFAULTS)) {
        if (native[key] !== value) {
            changes.push({ key, previous: native[key], value });
            native[key] = value;
        }
    }
    return {
        ioPackage,
        changed: changes.length > 0,
        fields: changes.map(change => change.key === 'common.plugins' ? change.key : `native.${change.key}`),
        changes,
    };
}

function ensureFile(filePath) {
    const absolute = path.resolve(filePath);
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    const result = ensureReleaseDefaults(parsed);
    if (result.changed) {
        fs.writeFileSync(absolute, `${JSON.stringify(result.ioPackage, null, 2)}\n`, 'utf8');
    }
    return { file: absolute, ...result };
}

if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    const target = process.argv[2] || path.join(root, 'io-package.json');
    try {
        const result = ensureFile(target);
        if (result.changed) {
            console.log(
                `[NexoWatt EOS release defaults] repaired ${result.changes.length} canonical value(s): ${result.changes.map(change => change.key).join(', ')}`,
            );
        } else {
            console.log('[NexoWatt EOS release defaults] OK (canonical sales defaults already present)');
        }
    } catch (error) {
        console.error(`[NexoWatt EOS release defaults] ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

module.exports = { CANONICAL_NATIVE_DEFAULTS, ensureReleaseDefaults, ensureFile };
