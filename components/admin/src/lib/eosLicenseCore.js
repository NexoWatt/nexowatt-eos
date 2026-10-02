'use strict';

// Offline license verification and encrypted local storage. No issuer private
// key or shared secret belongs in this module or in the adapter distribution.
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const MAX_TOKEN_BYTES = 16384;
const MAX_STORE_BYTES = 32768;
const MAX_TIME = 8640000000000000;
const UUID_RE = /^(?:[a-z]{2})?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const KID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ADAPTER_RE = /^[a-z][a-z0-9-]{0,63}$/;
const POSIX = process.platform !== 'win32';
const NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const OWN_UID = typeof process.getuid === 'function' ? process.getuid() : null;

class LicenseError extends Error {
    constructor(code) {
        // Deliberately avoid token, plaintext, path and cryptographic details.
        super(code);
        this.name = 'LicenseError';
        this.code = code;
    }
}

function fail(code) {
    throw new LicenseError(code);
}

function plain(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value, keys) {
    return plain(value) && Object.keys(value).length === keys.length &&
        keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

function validTime(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME;
}

function normalizeUuid(uuid) {
    if (typeof uuid !== 'string' || uuid.length > 128) fail('LICENSE_UUID_INVALID');
    const normalized = uuid.trim().toLowerCase();
    if (!UUID_RE.test(normalized)) fail('LICENSE_UUID_INVALID');
    return normalized;
}

function decode64(value, code, maxBytes) {
    if (typeof value !== 'string' || !value || value.length > Math.ceil(maxBytes * 4 / 3) ||
        !/^[A-Za-z0-9_-]+$/.test(value)) fail(code);
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.length > maxBytes || decoded.toString('base64url') !== value) fail(code);
    return decoded;
}

function parseJson(buffer, code) {
    try {
        // JSON.parse alone replaces malformed UTF-8 and is insufficient here.
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
    } catch (_) {
        fail(code);
    }
}

function validatePublicKeys(publicKeys) {
    if (!plain(publicKeys)) fail('TRUST_INVALID');
    const entries = Object.entries(publicKeys);
    if (entries.length < 1 || entries.length > 32) fail('TRUST_INVALID');
    const result = Object.create(null);
    for (const [kid, pem] of entries) {
        if (!KID_RE.test(kid) || typeof pem !== 'string' || pem.length > 1024 ||
            !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PUBLIC KEY-----\s*$/.test(pem)) {
            fail('TRUST_INVALID');
        }
        try {
            const key = crypto.createPublicKey(pem);
            if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') fail('TRUST_INVALID');
            result[kid] = key.export({ format: 'pem', type: 'spki' }).toString();
        } catch (_) {
            fail('TRUST_INVALID');
        }
    }
    return Object.freeze(result);
}

function verifyLicense(token, options = {}) {
    if (!plain(options)) fail('LICENSE_OPTIONS_INVALID');
    const uuid = normalizeUuid(options.uuid);
    const now = options.now === undefined ? Date.now() : options.now;
    if (!validTime(now)) fail('LICENSE_TIME_INVALID');
    if (typeof token !== 'string' || token.length > MAX_TOKEN_BYTES || !token.startsWith('NWL2.')) {
        fail('LICENSE_FORMAT_INVALID');
    }
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'NWL2') fail('LICENSE_FORMAT_INVALID');
    const payloadBytes = decode64(parts[1], 'LICENSE_FORMAT_INVALID', 10000);
    const signature = decode64(parts[2], 'LICENSE_FORMAT_INVALID', 64);
    if (signature.length !== 64) fail('LICENSE_FORMAT_INVALID');
    const payload = parseJson(payloadBytes, 'LICENSE_FORMAT_INVALID');
    if (!plain(payload) || typeof payload.kid !== 'string' || !KID_RE.test(payload.kid)) {
        fail('LICENSE_CLAIMS_INVALID');
    }
    const publicKeys = validatePublicKeys(options.publicKeys);
    if (!Object.prototype.hasOwnProperty.call(publicKeys, payload.kid)) fail('LICENSE_KEY_UNKNOWN');
    let authentic = false;
    try {
        authentic = crypto.verify(null, Buffer.from(`NWL2.${parts[1]}`, 'ascii'), publicKeys[payload.kid], signature);
    } catch (_) {
        fail('LICENSE_SIGNATURE_INVALID');
    }
    if (!authentic) fail('LICENSE_SIGNATURE_INVALID');
    if (!exactKeys(payload, ['v', 'kid', 'licenseId', 'uuid', 'edition', 'issuedAt', 'notBefore', 'expiresAt', 'adapters', 'limits']) ||
        payload.v !== 2 || typeof payload.licenseId !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(payload.licenseId) ||
        !['home', 'pro'].includes(payload.edition) || !validTime(payload.issuedAt) ||
        !validTime(payload.notBefore) || payload.notBefore < payload.issuedAt ||
        !(payload.expiresAt === null || (validTime(payload.expiresAt) && payload.expiresAt > payload.notBefore)) ||
        !Array.isArray(payload.adapters) || payload.adapters.length < 1 || payload.adapters.length > 64 ||
        !payload.adapters.every(name => typeof name === 'string' && ADAPTER_RE.test(name)) ||
        new Set(payload.adapters).size !== payload.adapters.length ||
        !exactKeys(payload.limits, ['chargePoints', 'batteries']) ||
        !Number.isSafeInteger(payload.limits.chargePoints) || payload.limits.chargePoints < 1 ||
        payload.limits.chargePoints > (payload.edition === 'home' ? 3 : 1000) ||
        !Number.isSafeInteger(payload.limits.batteries) || payload.limits.batteries < 0 ||
        payload.limits.batteries > (payload.edition === 'home' ? 2 : 10)) {
        fail('LICENSE_CLAIMS_INVALID');
    }
    if (normalizeUuid(payload.uuid) !== uuid) fail('LICENSE_UUID_MISMATCH');
    if (now < payload.notBefore || now < payload.issuedAt) fail('LICENSE_NOT_YET_VALID');
    if (payload.expiresAt !== null && now >= payload.expiresAt) fail('LICENSE_EXPIRED');
    const features = ['energy', 'wallet', 'smartHome', 'microgridSlave'];
    if (payload.edition === 'pro') features.push('microgridMaster', 'multisite', 'billing');
    // A fresh immutable result prevents consumer mutation from escalating rights.
    return Object.freeze({
        v: 2,
        kid: payload.kid,
        licenseId: payload.licenseId,
        uuid,
        edition: payload.edition,
        issuedAt: payload.issuedAt,
        notBefore: payload.notBefore,
        expiresAt: payload.expiresAt,
        adapters: Object.freeze([...payload.adapters]),
        limits: Object.freeze({ ...payload.limits }),
        features: Object.freeze(features),
    });
}

function protectedStat(stat, directory = false) {
    if ((directory ? !stat.isDirectory() : !stat.isFile()) ||
        (POSIX && (stat.uid !== OWN_UID || (stat.mode & 0o077) !== 0)) ||
        (!directory && stat.nlink !== 1)) fail('STORAGE_UNSAFE_PATH');
}

async function statIfExists(filename) {
    try {
        return await fsp.lstat(filename);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

/** AES-256-GCM storage, scoped to one normalized device UUID.
 * POSIX: private directory/files, current owner, no symlinks/hard-linked files.
 * Windows additionally requires an installer-provisioned private account ACL.
 * Same-UID/root attackers and full-disk rollback require an external trust root.
 */
class EncryptedLicenseStore {
    constructor({ directory, uuid } = {}) {
        if (typeof directory !== 'string' || !path.isAbsolute(directory) || directory.includes('\0')) {
            fail('STORAGE_DIRECTORY_INVALID');
        }
        this.directory = path.resolve(directory);
        if (this.directory === path.parse(this.directory).root) fail('STORAGE_DIRECTORY_INVALID');
        this.uuid = normalizeUuid(uuid);
        this.keyPath = path.join(this.directory, 'storage.key');
        this.licensePath = path.join(this.directory, 'license.enc');
        this.aad = Buffer.from(JSON.stringify(['NexoWatt EOS license store', 1, this.uuid]), 'utf8');
        this._tail = Promise.resolve();
    }

    _run(operation) {
        const result = this._tail.then(async () => {
            try {
                await this._prepareDirectory();
                return await operation();
            } catch (error) {
                if (error instanceof LicenseError) throw error;
                fail('STORAGE_IO_ERROR');
            }
        });
        this._tail = result.catch(() => {});
        return result;
    }

    async _prepareDirectory() {
        // Walk before creating: recursive mkdir otherwise follows existing links.
        const parsed = path.parse(this.directory);
        let current = parsed.root;
        const segments = this.directory.slice(parsed.root.length).split(path.sep).filter(Boolean);
        for (let index = 0; index < segments.length; index++) {
            current = path.join(current, segments[index]);
            let stat = await statIfExists(current);
            if (!stat) {
                try {
                    await fsp.mkdir(current, { mode: 0o700 });
                } catch (error) {
                    if (error.code !== 'EEXIST') throw error;
                }
                stat = await fsp.lstat(current);
            }
            if (!stat.isDirectory() || stat.isSymbolicLink()) fail('STORAGE_UNSAFE_PATH');
            if (POSIX && stat.uid !== OWN_UID && stat.uid !== 0) fail('STORAGE_UNSAFE_PATH');
            // Shared temporary roots are allowed only with the sticky bit. The
            // private final directory must still be owned by this service UID.
            if (POSIX && (stat.mode & 0o022) && !(stat.mode & 0o1000)) fail('STORAGE_UNSAFE_PATH');
            if (index === segments.length - 1) protectedStat(stat, true);
        }
    }

    async _read(filename, maxBytes) {
        const before = await statIfExists(filename);
        if (!before) return null;
        protectedStat(before);
        let handle;
        try {
            handle = await fsp.open(filename, fs.constants.O_RDONLY | NOFOLLOW);
            const stat = await handle.stat();
            protectedStat(stat);
            if (before.dev !== stat.dev || before.ino !== stat.ino) fail('STORAGE_UNSAFE_PATH');
            if (stat.size > maxBytes) fail('STORAGE_SIZE_INVALID');
            const buffer = Buffer.alloc(maxBytes + 1);
            let total = 0;
            while (total < buffer.length) {
                const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
                if (bytesRead === 0) break;
                total += bytesRead;
            }
            if (total > maxBytes) fail('STORAGE_SIZE_INVALID');
            return buffer.subarray(0, total);
        } finally {
            if (handle) await handle.close();
        }
    }

    async _key(create, hasLicense) {
        let key = await this._read(this.keyPath, 32);
        if (!key && hasLicense) fail('STORAGE_KEY_MISSING');
        if (!key && create) {
            const candidate = crypto.randomBytes(32);
            let handle;
            try {
                handle = await fsp.open(this.keyPath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | NOFOLLOW, 0o600);
                await handle.writeFile(candidate);
                await handle.sync();
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            } finally {
                candidate.fill(0);
                if (handle) await handle.close();
            }
            key = await this._read(this.keyPath, 32);
        }
        if (key && key.length !== 32) fail('STORAGE_KEY_INVALID');
        return key;
    }

    _decode(encrypted, key) {
        const envelope = parseJson(encrypted, 'STORAGE_FORMAT_INVALID');
        if (!exactKeys(envelope, ['v', 'alg', 'iv', 'ciphertext', 'tag']) || envelope.v !== 1 || envelope.alg !== 'A256GCM') {
            fail('STORAGE_FORMAT_INVALID');
        }
        const iv = decode64(envelope.iv, 'STORAGE_FORMAT_INVALID', 12);
        const tag = decode64(envelope.tag, 'STORAGE_FORMAT_INVALID', 16);
        const ciphertext = decode64(envelope.ciphertext, 'STORAGE_FORMAT_INVALID', 20000);
        if (iv.length !== 12 || tag.length !== 16) fail('STORAGE_FORMAT_INVALID');
        let plaintext;
        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
            decipher.setAAD(this.aad);
            decipher.setAuthTag(tag);
            plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        } catch (_) {
            fail('STORAGE_AUTH_FAILED');
        }
        try {
            const data = parseJson(plaintext, 'STORAGE_FORMAT_INVALID');
            this._validateData(data);
            return data;
        } finally {
            plaintext.fill(0);
        }
    }

    _validateData(data) {
        if (!exactKeys(data, ['token', 'highWaterMark']) || typeof data.token !== 'string' ||
            !data.token.startsWith('NWL2.') || data.token.length > MAX_TOKEN_BYTES ||
            !validTime(data.highWaterMark)) fail('STORAGE_DATA_INVALID');
    }

    async _syncDirectory() {
        // Directory fsync is a POSIX durability primitive, unavailable on Windows.
        if (!POSIX) return;
        const handle = await fsp.open(this.directory, fs.constants.O_RDONLY | NOFOLLOW);
        try {
            protectedStat(await handle.stat(), true);
            await handle.sync();
        } finally {
            await handle.close();
        }
    }

    async _atomicWrite(content) {
        const temporary = path.join(this.directory, `.license-${crypto.randomBytes(12).toString('hex')}.tmp`);
        let handle;
        try {
            handle = await fsp.open(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | NOFOLLOW, 0o600);
            await handle.writeFile(content);
            await handle.sync();
            await handle.close();
            handle = null;
            const existing = await statIfExists(this.licensePath);
            if (existing) protectedStat(existing);
            await fsp.rename(temporary, this.licensePath);
            await this._syncDirectory();
        } finally {
            if (handle) await handle.close();
            try {
                await fsp.unlink(temporary);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
    }

    async load() {
        return this._run(async () => {
            const encrypted = await this._read(this.licensePath, MAX_STORE_BYTES);
            if (!encrypted) return null;
            const key = await this._key(false, true);
            try {
                return this._decode(encrypted, key);
            } finally {
                key.fill(0);
            }
        });
    }

    async save(data) {
        // Snapshot inputs now so callers cannot mutate queued writes.
        this._validateData(data);
        const snapshot = { token: data.token, highWaterMark: data.highWaterMark };
        return this._run(async () => {
            const existing = await this._read(this.licensePath, MAX_STORE_BYTES);
            const key = await this._key(true, existing !== null);
            let plaintext;
            try {
                if (existing && this._decode(existing, key).highWaterMark > snapshot.highWaterMark) {
                    fail('STORAGE_CLOCK_ROLLBACK');
                }
                const iv = crypto.randomBytes(12);
                const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
                cipher.setAAD(this.aad);
                plaintext = Buffer.from(JSON.stringify(snapshot), 'utf8');
                const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
                const envelope = JSON.stringify({
                    v: 1,
                    alg: 'A256GCM',
                    iv: iv.toString('base64url'),
                    ciphertext: ciphertext.toString('base64url'),
                    tag: cipher.getAuthTag().toString('base64url'),
                });
                await this._atomicWrite(envelope);
            } finally {
                key.fill(0);
                if (plaintext) plaintext.fill(0);
            }
        });
    }

    async clear() {
        return this._run(async () => {
            const stat = await statIfExists(this.licensePath);
            if (!stat) return;
            protectedStat(stat);
            await fsp.unlink(this.licensePath);
            await this._syncDirectory();
        });
    }
}

module.exports = { LicenseError, normalizeUuid, validatePublicKeys, verifyLicense, EncryptedLicenseStore };
