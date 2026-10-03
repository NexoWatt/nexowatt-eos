'use strict';

// The license authority is local. No token, signing secret or storage key is
// published through ioBroker objects, states, HTTP status or the messagebox.
const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { TextDecoder } = require('node:util');
const { EncryptedLicenseStore, verifyLicense, validatePublicKeys, normalizeUuid } = require('./eosLicenseCore');

const LEASE_MS = 15000;
const CLOCK_TOLERANCE_MS = 2000;
const DB_TIMEOUT_MS = 2000;
const REQUEST_FEATURES = new Set(['energy', 'wallet', 'smartHome', 'microgridSlave', 'microgridMaster', 'multisite', 'billing']);
const safeCode = error => /^(?:LICENSE|STORAGE|TRUST|SERVICE)_[A-Z_]+$/.test(error?.code || '') ? error.code : 'SERVICE_UNAVAILABLE';
const failure = code => Object.assign(new Error(code), { code });

async function readTrustFile(filename) {
    if (typeof filename !== 'string' || !path.isAbsolute(filename) || filename.includes('\0')
        || path.resolve(filename) !== filename) throw failure('TRUST_PATH');
    // A trust anchor is provisioned by the manufacturer/OS administrator, never
    // accepted as an HTTP request, license payload, adapter state or UI setting.
    // File ownership alone is insufficient: a writable parent allows replacing
    // a root-owned file with a different root-owned public-key file. Validate
    // the entire directory chain, without following symbolic links. Windows
    // needs an ACL-aware provisioner; POSIX mode bits cannot establish trust there.
    if (process.platform === 'win32') throw failure('TRUST_PLATFORM_UNSUPPORTED');
    const directory = path.dirname(filename);
    let current = path.parse(directory).root;
    for (const segment of ['', ...directory.slice(current.length).split(path.sep).filter(Boolean)]) {
        if (segment) current = path.join(current, segment);
        const stat = await fs.lstat(current);
        if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022)) {
            throw failure('TRUST_PERMISSIONS');
        }
    }
    const before = await fs.lstat(filename);
    if (!before.isFile() || before.isSymbolicLink() || before.uid !== 0
        || (before.mode & 0o022) || before.nlink !== 1) throw failure('TRUST_PERMISSIONS');
    const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 32768 || stat.size < 2) throw failure('TRUST_FILE');
        if (stat.uid !== 0 || (stat.mode & 0o022) || stat.nlink !== 1
            || stat.dev !== before.dev || stat.ino !== before.ino) throw failure('TRUST_PERMISSIONS');
        // Bounded read also holds when the file grows after fstat.
        const buffer = Buffer.alloc(32769);
        let total = 0;
        while (total < buffer.length) {
            const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
            if (!bytesRead) break;
            total += bytesRead;
        }
        if (total > 32768) throw failure('TRUST_FILE');
        const keys = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, total)));
        return validatePublicKeys(keys);
    } finally { await handle.close(); }
}

class EosLicenseService {
    constructor(adapter, options = {}) {
        this.adapter = adapter;
        this.options = options;
        this.record = null;
        this.claims = null;
        this.code = 'SERVICE_STARTING';
        this.stopped = false;
        this.pending = 0;
        this.pendingDatabaseRead = false;
        this.databaseTimeoutMs = Number.isSafeInteger(options.databaseTimeoutMs) && options.databaseTimeoutMs > 0
            ? Math.min(options.databaseTimeoutMs, DB_TIMEOUT_MS) : DB_TIMEOUT_MS;
        this.queue = Promise.resolve();
        this.rates = new Map();
        this.wall = options.now || Date.now;
        this.mono = options.monotonic || (() => performance.now());
        this.highWaterMark = 0;
        this.lastPersisted = 0;
        this.lastDiskCheck = 0;
    }

    // Serialize all mutations and checks so replacement/deletion cannot race a
    // grant. Bound the queue; untrusted local adapters cannot allocate forever.
    run(operation) {
        if (this.stopped || this.pending >= 32) return Promise.reject(failure('SERVICE_UNAVAILABLE'));
        this.pending++;
        const job = this.queue.then(async () => {
            this.ensureRunning();
            const result = await operation();
            this.ensureRunning();
            return result;
        });
        this.queue = job.catch(() => undefined);
        return job.finally(() => { this.pending--; });
    }

    ensureRunning() {
        if (this.stopped) throw failure('SERVICE_UNAVAILABLE');
    }

    async readObject(id) {
        this.ensureRunning();
        // ioBroker exposes no cancellation handle for this call. Allow only one
        // outstanding read, even after timeout: a stalled database cannot grow
        // an unbounded set of abandoned operations through repeated checks.
        if (this.pendingDatabaseRead) throw failure('SERVICE_UNAVAILABLE');
        this.pendingDatabaseRead = true;
        let timer;
        let settled = false;
        const result = await new Promise((resolve, reject) => {
            const finish = (error, object) => {
                this.pendingDatabaseRead = false;
                if (settled) return; // Timed-out completion has no state effect.
                settled = true;
                clearTimeout(timer);
                if (error) reject(failure('SERVICE_UNAVAILABLE'));
                else resolve(object);
            };
            timer = setTimeout(() => {
                settled = true;
                reject(failure('SERVICE_TIMEOUT'));
            }, this.databaseTimeoutMs);
            Promise.resolve().then(() => this.adapter.getForeignObjectAsync(id)).then(
                object => finish(null, object), error => finish(error),
            );
        });
        this.ensureRunning();
        return result;
    }

    async start() {
        return this.run(async () => {
            try {
                const object = await this.readObject('system.meta.uuid');
                this.uuid = normalizeUuid(object?.native?.uuid);
                const directory = this.options.directory || this.options.resolveDirectory?.();
                if (!directory) throw failure('SERVICE_DIRECTORY');
                this.store = new EncryptedLicenseStore({ directory, uuid: this.uuid });
                this.keys = this.options.publicKeys || await readTrustFile(this.options.trustFile || '/etc/nexowatt-eos/license-trust.json');
                this.ensureRunning();
                validatePublicKeys(this.keys);
                this.record = await this.store.load();
                this.ensureRunning();
                this.highWaterMark = this.record?.highWaterMark || 0;
                this.lastPersisted = this.highWaterMark;
                this.lastWall = this.wall();
                this.lastMono = this.mono();
                this.clockWallAnchor = this.lastWall;
                this.clockMonoAnchor = this.lastMono;
                await this.evaluate();
            } catch (error) {
                this.claims = null;
                this.code = safeCode(error);
            }
            this.ensureRunning();
            this.adapter.log.info(`[EOS licensing] ${this.code}`);
            this.timer = setInterval(() => { void this.run(() => this.evaluate()).catch(() => undefined); }, 5000);
            this.timer.unref?.();
            return this.statusView();
        });
    }

    clock() {
        const now = this.wall();
        const mono = this.mono();
        if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(mono)) throw failure('LICENSE_CLOCK');
        // Keep a fixed elapsed-time anchor. Resetting it to each observed wall
        // clock would let frequent <2s checks conceal an indefinitely frozen or
        // gradually slowed clock. Only a forward wall adjustment raises it.
        const expected = this.clockWallAnchor + Math.max(0, mono - this.clockMonoAnchor);
        if (mono < this.lastMono || now + CLOCK_TOLERANCE_MS < Math.max(this.highWaterMark, expected)) {
            this.clockFault = true;
        }
        if (this.clockFault) throw failure('LICENSE_CLOCK_ROLLBACK');
        if (now > expected) {
            this.clockWallAnchor = now;
            this.clockMonoAnchor = mono;
        }
        this.lastWall = now;
        this.lastMono = mono;
        this.highWaterMark = Math.max(this.highWaterMark, now);
        return now;
    }

    async evaluate() {
        try {
            this.ensureRunning();
            if (!this.keys || !this.store || !this.uuid) throw failure(this.code || 'SERVICE_UNAVAILABLE');
            this.clock();
            const object = await this.readObject('system.meta.uuid');
            if (normalizeUuid(object?.native?.uuid) !== this.uuid) throw failure('LICENSE_UUID_CHANGED');
            // Re-read the encrypted record at every check: deleted/tampered files
            // must not leave a cached perpetual entitlement alive.
            this.record = await this.store.load();
            this.ensureRunning();
            if (!this.record) throw failure('LICENSE_MISSING');
            const now = this.clock();
            if (now + CLOCK_TOLERANCE_MS < this.record.highWaterMark) throw failure('LICENSE_CLOCK_ROLLBACK');
            this.highWaterMark = Math.max(this.highWaterMark, this.record.highWaterMark);
            this.claims = verifyLicense(this.record.token, { uuid: this.uuid, publicKeys: this.keys, now });
            // At most once a minute; encrypted high-water mark limits ordinary
            // clock rollback across restart. It is not a hardware anti-rollback counter.
            if (now - this.lastPersisted >= 60000) {
                await this.store.save({ token: this.record.token, highWaterMark: this.highWaterMark });
                this.ensureRunning();
                this.lastPersisted = this.highWaterMark;
            }
            this.code = 'LICENSE_VALID';
        } catch (error) {
            this.claims = null;
            this.code = safeCode(error);
        }
        return this.claims;
    }

    statusView() {
        return {
            v: 1, valid: !this.stopped && !!this.claims, code: this.stopped ? 'SERVICE_UNAVAILABLE' : this.code, uuid: this.uuid || null,
            edition: this.claims?.edition || null, expiresAt: this.claims?.expiresAt ?? null,
            limits: this.claims ? { ...this.claims.limits } : {},
            features: this.claims ? [...this.claims.features] : [],
            // License ID, raw token and key material deliberately not returned.
        };
    }

    status() { return this.run(async () => { await this.evaluate(); return this.statusView(); }); }

    activate(token) {
        return this.run(async () => {
            if (!this.keys || !this.store || !this.uuid) throw failure(this.code);
            this.clock();
            const object = await this.readObject('system.meta.uuid');
            if (normalizeUuid(object?.native?.uuid) !== this.uuid) throw failure('LICENSE_UUID_CHANGED');
            const now = this.clock();
            verifyLicense(token, { uuid: this.uuid, publicKeys: this.keys, now });
            // Validate before replacing: a failed import preserves the old record.
            await this.store.save({ token, highWaterMark: this.highWaterMark });
            this.ensureRunning();
            this.lastPersisted = this.highWaterMark;
            await this.evaluate();
            if (!this.claims) throw failure(this.code);
            this.adapter.log.info('[EOS licensing] LICENSE_ACTIVATED');
            return this.statusView();
        });
    }

    remove() {
        return this.run(async () => {
            this.claims = null;
            this.record = null;
            this.code = 'LICENSE_MISSING';
            if (!this.store) throw failure('SERVICE_UNAVAILABLE');
            await this.store.clear();
            this.ensureRunning();
            this.adapter.log.info('[EOS licensing] LICENSE_REMOVED');
            return this.statusView();
        });
    }

    rateAllowed(sender) {
        const now = this.mono();
        for (const [key, rate] of this.rates) if (now - rate.start >= 60000) this.rates.delete(key);
        const rate = this.rates.get(sender);
        if (rate) return ++rate.count <= 30;
        if (this.rates.size >= 256) return false;
        this.rates.set(sender, { start: now, count: 1 });
        return true;
    }

    async check(sender, request) {
        const nonce = typeof request?.nonce === 'string' && /^[a-f0-9]{32}$/.test(request.nonce) ? request.nonce : '';
        const deny = code => {
            const now = this.wall();
            return { v: 1, nonce, valid: false, code, edition: null, features: [], limits: {}, checkedAt: now, validUntil: now };
        };
        const match = /^system\.adapter\.([a-z0-9][a-z0-9-]{0,63})\.(0|[1-9]\d{0,4})$/.exec(sender || '');
        if (!match || !nonce || !request || Array.isArray(request) || request.v !== 1 || request.adapter !== match[1] || !REQUEST_FEATURES.has(request.feature)) return deny('LICENSE_REQUEST');
        if (Object.keys(request).some(key => !['v', 'nonce', 'adapter', 'feature', 'required'].includes(key))) return deny('LICENSE_REQUEST');
        const required = request.required ?? {};
        if (!required || typeof required !== 'object' || Array.isArray(required) || Object.keys(required).some(key => !['chargePoints', 'batteries'].includes(key) || !Number.isSafeInteger(required[key]) || required[key] < 0 || required[key] > 1000)) return deny('LICENSE_REQUEST');
        if (!this.rateAllowed(sender)) return deny('LICENSE_RATE_LIMIT');
        try {
            return await this.run(async () => {
                await this.evaluate();
                const claims = this.claims;
                if (!claims) return deny(this.code);
                // Sender identity is trusted only inside ioBroker's local bus.
                // An adapter with database/OS compromise is outside this boundary.
                const instance = await this.readObject(sender);
                if (!instance || instance.type !== 'instance' || instance.common?.enabled !== true || instance.common?.name !== match[1]) return deny('LICENSE_ADAPTER_DISABLED');
                // Scope is produced only by the authenticated strict verifier.
                // A system license covers enabled local adapters; their OS and
                // admission permissions remain independent of licensing.
                if (claims.scope !== 'system' && (claims.scope !== 'adapters' || !claims.adapters.includes(match[1]))) return deny('LICENSE_ADAPTER');
                if (!claims.features.includes(request.feature)) return deny('LICENSE_FEATURE');
                if (Object.keys(required).some(key => required[key] > claims.limits[key])) return deny('LICENSE_LIMIT');
                const now = this.clock();
                // Re-check deadline after asynchronous DB access.
                if (claims.expiresAt !== null && now >= claims.expiresAt) return deny('LICENSE_EXPIRED');
                return { v: 1, nonce, valid: true, code: 'LICENSE_VALID', edition: claims.edition,
                    features: [...claims.features], limits: { ...claims.limits }, checkedAt: now,
                    validUntil: Math.min(now + LEASE_MS, claims.expiresAt ?? Number.MAX_SAFE_INTEGER) };
            });
        } catch (error) {
            this.claims = null;
            this.code = safeCode(error);
            return deny(this.code);
        }
    }

    stop() {
        this.stopped = true;
        this.code = 'SERVICE_UNAVAILABLE';
        clearInterval(this.timer);
        this.claims = null;
        this.record = null;
    }
}

module.exports = { EosLicenseService, readTrustFile, safeCode, LEASE_MS, DB_TIMEOUT_MS };
