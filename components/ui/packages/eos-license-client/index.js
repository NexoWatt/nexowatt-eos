'use strict';

/**
 * EOS license protocol v1. No license token, signing key or vault key leaves Admin.
 * Messagebox is a trusted local bus, not a boundary against a compromised ioBroker
 * runtime or the same OS user. See docs/licensing/ADAPTER_INTEGRATION.md.
 */
const { randomBytes } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { assertEosPlatform } = require('./eos-platform');

const COMMAND = 'eos.license.check';
const MAX_LEASE_MS = 15_000;
const MAX_TIMEOUT_MS = 2_000;
const REFRESH_INTERVAL_MS = 5_000;
const FEATURES = Object.freeze([
    'energy', 'wallet', 'smartHome', 'microgridSlave', 'microgridMaster', 'multisite', 'billing',
]);
const HOME_FEATURES = new Set(['energy', 'wallet', 'smartHome', 'microgridSlave']);
const RESPONSE_KEYS = new Set(['v', 'nonce', 'valid', 'code', 'edition', 'features', 'limits', 'checkedAt', 'validUntil']);

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isCount(value, maximum) {
    return Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

class LicenseError extends Error {
    constructor(code) {
        super(`EOS license denied: ${code}`);
        this.name = 'LicenseError';
        this.code = code;
    }
}

/**
 * @param {object} adapter ioBroker adapter with name, namespace and sendTo.
 * @param {object} options Immutable feature and quantity requirements for this guard.
 * @param {function({code:string}): (void|Promise<void>)} options.onLost Required
 *   adapter-specific safe-state transition. It must not log keys or stop hardware blindly.
 * @returns {{start: function():Promise<boolean>, refresh:function():Promise<boolean>,
 * stop:function():Promise<void>, isAllowed:function():boolean,
 * assertAllowed:function():void, isFeatureAllowed:function(string):boolean,
 * assertFeatureAllowed:function(string):void, getStatus:function():object}}
 */
function createLicenseGuard(adapter, options = {}) {
    if (!adapter || !/^[a-z][a-z0-9-]{0,63}$/.test(adapter.name || '')
        || !new RegExp(`^${adapter.name}\\.(?:0|[1-9][0-9]*)$`).test(adapter.namespace || '')
        || typeof adapter.sendTo !== 'function') {
        throw new TypeError('An ioBroker adapter with its own name, namespace and sendTo is required');
    }
    if (!isRecord(options) || typeof options.onLost !== 'function') {
        throw new TypeError('onLost safe-state callback is required');
    }
    const adminInstance = options.adminInstance === undefined ? 'eos-admin.0' : options.adminInstance;
    if (typeof adminInstance !== 'string' || !/^eos-admin\.(?:0|[1-9][0-9]{0,5})$/.test(adminInstance)) {
        throw new TypeError('adminInstance must be an explicit eos-admin instance');
    }
    const feature = options.feature === undefined ? 'energy' : options.feature;
    if (!FEATURES.includes(feature)) {
        throw new TypeError('Unsupported EOS license feature');
    }
    const suppliedRequired = options.required === undefined ? {} : options.required;
    if (!isRecord(suppliedRequired)
        || Object.keys(suppliedRequired).some(key => key !== 'chargePoints' && key !== 'batteries')
        || (Object.hasOwn(suppliedRequired, 'chargePoints') && !isCount(suppliedRequired.chargePoints, 1000))
        || (Object.hasOwn(suppliedRequired, 'batteries') && !isCount(suppliedRequired.batteries, 10))) {
        throw new TypeError('required accepts only integer chargePoints (0..1000) and batteries (0..10)');
    }
    const required = Object.freeze({ ...suppliedRequired });
    const timeoutMs = options.timeoutMs === undefined ? MAX_TIMEOUT_MS : options.timeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new TypeError('timeoutMs must be an integer between 10 and 2000');
    }
    const name = adapter.name;
    const onLost = options.onLost;
    let current = null;
    let pending = null;
    let expiryTimer = null;
    let refreshTimer = null;
    let stopped = false;
    let lossNotified = false;
    let safeStatePending = false;
    let safeStateFailed = false;
    let lossTask = Promise.resolve();
    let code = 'NOT_CHECKED';

    function reportSafeStateFailure() {
        safeStateFailed = true;
        safeStatePending = false;
        current = null;
        code = 'SAFE_STATE_FAILED';
        try {
            adapter.log?.error?.('EOS license: adapter safe-state callback failed; operation remains denied');
        } catch {
            // Failure reporting must never restore permission or produce an unhandled rejection.
        }
    }

    function invalidate(reason) {
        current = null;
        clearTimeout(expiryTimer);
        expiryTimer = null;
        code = safeStateFailed ? 'SAFE_STATE_FAILED' : reason;
        if (!lossNotified) {
            lossNotified = true;
            safeStatePending = true;
            try {
                const result = onLost(Object.freeze({ code }));
                if (result && typeof result.then === 'function') {
                    lossTask = Promise.resolve(result).then(
                        () => { safeStatePending = false; },
                        reportSafeStateFailure,
                    );
                } else {
                    safeStatePending = false;
                    lossTask = Promise.resolve();
                }
            } catch {
                reportSafeStateFailure();
                lossTask = Promise.resolve();
            }
        }
    }

    function isAllowed() {
        if (!current || stopped || safeStateFailed || safeStatePending) {
            return false;
        }
        if (performance.now() >= current.monotonicUntil || Date.now() >= current.validUntil) {
            invalidate('LEASE_EXPIRED');
            return false;
        }
        return true;
    }

    function isFeatureAllowed(requestedFeature) {
        return isAllowed() && FEATURES.includes(requestedFeature) && current.features.includes(requestedFeature);
    }

    function validateResponse(response, check) {
        const now = Date.now();
        if (!isRecord(response) || Object.keys(response).some(key => !RESPONSE_KEYS.has(key))
            || response.v !== 1 || response.nonce !== check.nonce
            || typeof response.valid !== 'boolean' || typeof response.code !== 'string'
            || !/^[A-Z][A-Z0-9_]{0,63}$/.test(response.code)) {
            return { error: 'INVALID_RESPONSE' };
        }
        if (!response.valid) {
            return { error: 'LICENSE_DENIED' };
        }
        if (response.code !== 'LICENSE_VALID' || !['home', 'pro'].includes(response.edition)
            || !Array.isArray(response.features) || response.features.length > FEATURES.length
            || response.features.some(item => !FEATURES.includes(item))
            || new Set(response.features).size !== response.features.length
            || !response.features.includes(feature)
            || (response.edition === 'home' && response.features.some(item => !HOME_FEATURES.has(item)))
            || !isRecord(response.limits)
            || Object.keys(response.limits).length !== 2
            || !Object.hasOwn(response.limits, 'chargePoints') || !Object.hasOwn(response.limits, 'batteries')
            || !isCount(response.limits.chargePoints, response.edition === 'home' ? 3 : 1000)
            || !isCount(response.limits.batteries, response.edition === 'home' ? 2 : 10)
            || Object.entries(required).some(([key, value]) => response.limits[key] < value)) {
            return { error: 'ENTITLEMENT_MISMATCH' };
        }
        if (!Number.isSafeInteger(response.checkedAt) || !Number.isSafeInteger(response.validUntil)
            || response.checkedAt < check.wallStart - 1000 || response.checkedAt > now + 1000
            || response.validUntil <= now || response.validUntil <= response.checkedAt
            || response.validUntil - response.checkedAt > MAX_LEASE_MS
            || response.validUntil - now > MAX_LEASE_MS
            || performance.now() - check.monotonicStart >= timeoutMs) {
            return { error: 'STALE_RESPONSE' };
        }
        return {
            value: {
                edition: response.edition,
                features: [...response.features],
                limits: { ...response.limits },
                checkedAt: response.checkedAt,
                validUntil: response.validUntil,
                monotonicUntil: Math.min(
                    check.monotonicStart + MAX_LEASE_MS,
                    performance.now() + response.validUntil - now,
                ),
            },
        };
    }

    function finish(check, response, failure) {
        if (check.done) {
            return; // Expired, cancelled and duplicate callbacks can never reopen the guard.
        }
        check.done = true;
        clearTimeout(check.timer);
        if (pending === check) {
            pending = null;
        }
        let result;
        try {
            result = failure ? { error: failure } : validateResponse(response, check);
        } catch {
            result = { error: 'INVALID_RESPONSE' };
        }
        if (stopped || safeStateFailed || safeStatePending || result.error) {
            invalidate(stopped ? 'STOPPED' : safeStatePending ? 'SAFE_STATE_PENDING' : result.error || 'SAFE_STATE_FAILED');
            check.resolve(false);
            return;
        }
        current = result.value;
        code = 'LICENSE_VALID';
        lossNotified = false;
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => invalidate('LEASE_EXPIRED'), Math.max(0, current.monotonicUntil - performance.now()));
        expiryTimer.unref?.();
        check.resolve(isAllowed());
    }

    function refresh() {
        if (stopped || safeStateFailed) {
            return Promise.resolve(false);
        }
        if (pending) {
            return pending.promise; // Coalesce concurrent callers; each dispatched request has a new nonce.
        }
        isAllowed(); // Expire a stale lease before initiating a new request.
        try {
            assertEosPlatform(name);
        } catch (error) {
            invalidate(/^EOS_PLATFORM_[A-Z_]+$/.test(error?.code || '') ? error.code : 'EOS_PLATFORM_UNAVAILABLE');
            return Promise.resolve(false);
        }
        let nonce;
        try {
            nonce = randomBytes(16).toString('hex');
        } catch {
            invalidate('NONCE_ERROR');
            return Promise.resolve(false);
        }
        const check = {
            nonce,
            wallStart: Date.now(),
            monotonicStart: performance.now(),
            done: false,
            timer: null,
            resolve: null,
            promise: null,
        };
        check.promise = new Promise(resolve => { check.resolve = resolve; });
        pending = check;
        check.timer = setTimeout(() => finish(check, null, 'TIMEOUT'), timeoutMs);
        // Keep this timeout referenced: callers awaiting the first decision must always settle.
        try {
            const result = adapter.sendTo(adminInstance, COMMAND, {
                v: 1,
                nonce: check.nonce,
                adapter: name,
                feature,
                required: { ...required },
            }, response => finish(check, response));
            if (result && typeof result.then === 'function') {
                Promise.resolve(result).catch(() => finish(check, null, 'TRANSPORT_ERROR'));
            }
        } catch {
            finish(check, null, 'TRANSPORT_ERROR');
        }
        return check.promise;
    }

    function start() {
        if (!stopped && !refreshTimer) {
            refreshTimer = setInterval(() => { void refresh(); }, REFRESH_INTERVAL_MS);
            refreshTimer.unref?.();
        }
        return refresh();
    }

    function stop() {
        stopped = true;
        clearInterval(refreshTimer);
        refreshTimer = null;
        invalidate('STOPPED');
        if (pending) {
            finish(pending, null, 'STOPPED');
        }
        return lossTask;
    }

    return Object.freeze({
        start,
        refresh,
        stop,
        isAllowed,
        isFeatureAllowed,
        assertAllowed() {
            if (!isAllowed()) {
                throw new LicenseError(code);
            }
        },
        assertFeatureAllowed(requestedFeature) {
            if (!isFeatureAllowed(requestedFeature)) {
                throw new LicenseError(isAllowed() ? 'FEATURE_NOT_LICENSED' : code);
            }
        },
        getStatus() {
            if (!isAllowed()) {
                return { valid: false, code };
            }
            return {
                valid: true, code, edition: current.edition, features: [...current.features],
                limits: { ...current.limits }, checkedAt: current.checkedAt, validUntil: current.validUntil,
            };
        },
    });
}

module.exports = Object.freeze({ assertEosPlatform, createLicenseGuard, LicenseError, COMMAND, MAX_LEASE_MS, MAX_TIMEOUT_MS, REFRESH_INTERVAL_MS });
