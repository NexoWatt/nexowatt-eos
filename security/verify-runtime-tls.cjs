#!/usr/bin/env node
'use strict';

// Static, read-only validation of the deliberately narrow EOS Redis TLS profile.
// This does not connect, start services, provision certificates or migrate data.
const fs = require('node:fs');
const { X509Certificate } = require('node:crypto');
const { isIP } = require('node:net');

const DEFAULT_CONFIG = '/opt/iobroker/iobroker-data/iobroker.json';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_CA_BYTES = 128 * 1024;
const PROFILE = 'eos-redis-tls13-config-v1';
const DB_KEYS = new Set([
    'type', 'host', 'port', 'options', 'noFileCache', 'connectTimeout',
    'writeFileInterval', 'dataDir', 'backup', 'jsonlOptions', 'maxQueue', 'enhancedLogging',
]);
const OPTION_KEYS = new Set([
    'auth_pass', 'username', 'db', 'family', 'retry_max_delay', 'retry_max_count',
    'tls', 'enableOfflineQueue', 'maxRetriesPerRequest', 'connectTimeout', 'commandTimeout',
]);
const TLS_KEYS = new Set(['ca', 'servername', 'rejectUnauthorized', 'minVersion', 'maxVersion']);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDnsName(value) {
    return typeof value === 'string' && value.length <= 253 && value.length > 0 &&
        !isIP(value) && value.split('.').every(label =>
            label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
}

function isHost(value) {
    return typeof value === 'string' && (isIP(value) !== 0 || isDnsName(value));
}

function hasUnknownKeys(value, allowed, allowComments = false) {
    return Object.keys(value).some(key => !allowed.has(key) && !(allowComments && key.startsWith('//')));
}

function validCA(pem, now) {
    if (typeof pem !== 'string' || !pem.trim() || Buffer.byteLength(pem) > MAX_CA_BYTES) {
        return false;
    }
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    if (!blocks || blocks.length > 16 ||
        pem.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '').trim()) {
        return false;
    }
    try {
        return blocks.every(block => {
            const cert = new X509Certificate(block);
            const from = Date.parse(cert.validFrom);
            const until = Date.parse(cert.validTo);
            return cert.ca === true && Number.isFinite(from) && Number.isFinite(until) &&
                from <= now && now < until;
        });
    } catch {
        return false;
    }
}

function validateConfig(config, { now = Date.now() } = {}) {
    const errors = [];
    const add = (scope, code) => errors.push({ scope, code });
    if (!Number.isFinite(now)) {
        add('config', 'INVALID_VALIDATION_TIME');
    }
    if (!isObject(config)) {
        add('config', 'CONFIG_NOT_OBJECT');
    } else {
        for (const scope of ['objects', 'states']) {
            const db = config[scope];
            if (!isObject(db)) {
                add(scope, 'DATABASE_NOT_OBJECT');
                continue;
            }
            if (hasUnknownKeys(db, DB_KEYS, true)) add(scope, 'UNSUPPORTED_DATABASE_OPTION');
            if (db.type !== 'redis') add(scope, 'EXTERNAL_REDIS_REQUIRED');
            if (!isHost(db.host)) add(scope, 'SINGLE_HOST_REQUIRED');
            if (!Number.isInteger(db.port) || db.port < 1 || db.port > 65535) {
                add(scope, 'VALID_TCP_PORT_REQUIRED');
            }
            if (db.enhancedLogging !== undefined && db.enhancedLogging !== false) {
                add(scope, 'ENHANCED_DB_LOGGING_FORBIDDEN');
            }
            const options = db.options;
            if (!isObject(options)) {
                add(scope, 'OPTIONS_NOT_OBJECT');
                continue;
            }
            // In js-controller 7.2.2, options.password is overwritten by auth_pass/pass.
            // Forbid legacy/fallback and transport override fields instead of guessing intent.
            if (hasUnknownKeys(options, OPTION_KEYS)) add(scope, 'UNSUPPORTED_CLIENT_OPTION');
            if (typeof options.auth_pass !== 'string' || options.auth_pass.length < 32 ||
                options.auth_pass.length > 1024 || /[\s\x00-\x1f\x7f]/u.test(options.auth_pass)) {
                add(scope, 'AUTH_PASS_32_TO_1024_NONSPACE_CHARACTERS_REQUIRED');
            }
            if (options.username !== undefined &&
                (typeof options.username !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(options.username))) {
                add(scope, 'INVALID_ACL_USERNAME');
            }
            for (const name of ['db', 'retry_max_delay', 'retry_max_count', 'connectTimeout', 'commandTimeout']) {
                if (options[name] !== undefined &&
                    (!Number.isSafeInteger(options[name]) || options[name] < (name === 'db' ? 0 : 1))) {
                    add(scope, 'INVALID_NUMERIC_CLIENT_OPTION');
                }
            }
            if (options.family !== undefined && ![0, 4, 6].includes(options.family)) {
                add(scope, 'INVALID_ADDRESS_FAMILY');
            }
            if (options.enableOfflineQueue !== undefined && typeof options.enableOfflineQueue !== 'boolean') {
                add(scope, 'INVALID_OFFLINE_QUEUE_OPTION');
            }
            if (options.maxRetriesPerRequest !== undefined &&
                (!Number.isSafeInteger(options.maxRetriesPerRequest) || options.maxRetriesPerRequest < 0)) {
                add(scope, 'INVALID_RETRY_LIMIT');
            }
            const tls = options.tls;
            if (!isObject(tls)) {
                add(scope, 'TLS_OPTIONS_NOT_OBJECT');
                continue;
            }
            if (hasUnknownKeys(tls, TLS_KEYS)) add(scope, 'UNSUPPORTED_TLS_OPTION_OR_CLIENT_KEY');
            if (tls.minVersion !== 'TLSv1.3' ||
                (tls.maxVersion !== undefined && tls.maxVersion !== 'TLSv1.3')) {
                add(scope, 'TLS13_ONLY_REQUIRED');
            }
            if (tls.rejectUnauthorized !== true) add(scope, 'EXPLICIT_PEER_VERIFICATION_REQUIRED');
            if (!isDnsName(tls.servername)) add(scope, 'EXPLICIT_DNS_SERVERNAME_REQUIRED');
            if (!validCA(tls.ca, now)) add(scope, 'VALID_CURRENT_CA_PEM_REQUIRED');
        }
    }
    return {
        profile: PROFILE,
        status: errors.length ? 'CONFIGURATION_REJECTED' : 'STATIC_CONFIGURATION_MATCHES_PROFILE',
        configurationMatchesProfile: errors.length === 0,
        networkVerified: false,
        serverPolicyVerified: false,
        credentialUniquenessVerified: false,
        trustAnchorProvenanceVerified: false,
        adapterIsolationVerified: false,
        releaseGate: 'OPEN_UNTIL_RUNTIME_AND_ADMIN_CONFIG_PRESERVATION_TESTS',
        notices: ['STATIC_CHECK_ONLY', 'ADMIN_8_0_14_BASE_SETTINGS_CAN_REMOVE_TLS'],
        errors,
    };
}

function readConfig(filePath) {
    let fd;
    try {
        // O_NONBLOCK avoids blocking on a FIFO; fstat rejects non-regular files.
        // Reject the final symlink component where O_NOFOLLOW is supported.
        fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) |
            (fs.constants.O_NONBLOCK || 0));
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('INVALID_FILE');
        const data = Buffer.alloc(MAX_FILE_BYTES + 1);
        let size = 0;
        while (size < data.length) {
            const count = fs.readSync(fd, data, size, data.length - size, null);
            if (!count) break;
            size += count;
        }
        if (size > MAX_FILE_BYTES) throw new Error('INVALID_FILE');
        return JSON.parse(data.subarray(0, size).toString('utf8'));
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

function main(argv = process.argv.slice(2)) {
    if (argv.length === 1 && argv[0] === '--help') {
        process.stdout.write('Usage: node security/verify-runtime-tls.cjs [iobroker.json-path]\n' +
            'Read-only static profile check. Default: /opt/iobroker/iobroker-data/iobroker.json\n' +
            'Exit 0: static profile match only; 1: rejected; 2: unreadable/invalid JSON; 64: usage.\n');
        return 0;
    }
    if (argv.length > 1 || (argv[0] && argv[0].startsWith('-'))) {
        process.stdout.write(JSON.stringify({ profile: PROFILE, status: 'INVALID_ARGUMENTS' }) + '\n');
        return 64;
    }
    let config;
    try {
        config = readConfig(argv[0] || DEFAULT_CONFIG);
    } catch {
        // Never print Error.message: JSON/parser/I/O errors may contain secrets or paths.
        process.stdout.write(JSON.stringify({ profile: PROFILE, status: 'CONFIG_READ_OR_JSON_ERROR' }) + '\n');
        return 2;
    }
    const result = validateConfig(config);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result.configurationMatchesProfile ? 0 : 1;
}

if (require.main === module) process.exitCode = main();
module.exports = { validateConfig, readConfig, main };
