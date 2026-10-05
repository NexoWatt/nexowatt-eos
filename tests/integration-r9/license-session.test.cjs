'use strict';

// These are local client/claim validation tests, not native EOS startup evidence.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const core = require('../../components/admin/src/lib/eosLicenseCore.js');
const { createSession, adminToken, uiCookie, statusSummary, uiSummary, issueToken } = require('./license-session.cjs');

const uuid = crypto.randomUUID();
const issuer = crypto.generateKeyPairSync('ed25519').privateKey;
const secret = crypto.randomBytes(32).toString('hex');
const home = ['energy', 'wallet', 'smartHome', 'microgridSlave'];
const pro = [...home, 'microgridMaster', 'multisite', 'billing'];
function safeError(code) {
    return error => error instanceof Error && error.code === code && error.message === code &&
        !String(error.stack).includes(secret) && !Object.hasOwn(error, 'cause');
}
function adminResult(edition) {
    return { status: 200, data: { v: 1, valid: !!edition, code: edition ? 'LICENSE_VALID' : 'LICENSE_MISSING', uuid,
        edition: edition || null, expiresAt: edition ? Date.now() + 60000 : null,
        limits: edition ? { chargePoints: edition === 'home' ? 3 : 7, batteries: edition === 'home' ? 2 : 4 } : {},
        features: edition ? [...(edition === 'home' ? home : pro)] : [] } };
}
function uiResult(edition) {
    return { status: 200, data: { ok: true, valid: !!edition, type: 'central', expiresAt: 0,
        expiryManagedBy: 'eos-admin.0', managedBy: 'eos-admin.0', centralManagement: true,
        validUntil: edition ? Date.now() + 60000 : 0, edition: edition === 'home' ? 'hems' : edition === 'pro' ? 'eos' : 'none',
        maxWallboxes: edition === 'home' ? 3 : edition === 'pro' ? 7 : 0, maxStorages: edition === 'home' ? 2 : edition === 'pro' ? 4 : 0,
        features: { chargingManagement: !!edition, storageControl: !!edition, energyWallet: !!edition,
            smartHome: !!edition, mesh: edition === 'pro', billingExport: edition === 'pro' } } };
}
function loginResult() {
    return { status: 200, data: { ok: true, strict: true, authed: true, user: 'admin', role: 'admin',
        isAdmin: true, passwordChangeRequired: false },
        cookies: [`nw_session=${secret}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600; Secure`] };
}

test('ephemeral NWL2 fixtures verify through the real core with signed Home 3/2 and Pro 7/4 claims', () => {
    for (const edition of ['home', 'pro']) {
        const token = issueToken({ core, issuer, uuid, edition });
        const trust = { nativeManagementLab: crypto.createPublicKey(issuer).export({ type: 'spki', format: 'pem' }).toString() };
        const verified = core.verifyLicense(token, { uuid, publicKeys: trust });
        assert.equal(verified.v === 2 && verified.scope === 'adapters' && verified.uuid === uuid && verified.edition === edition, true);
        assert.deepEqual(verified.adapters, ['nexowatt-ui']);
        assert.deepEqual(verified.limits, edition === 'home' ? { chargePoints: 3, batteries: 2 } : { chargePoints: 7, batteries: 4 });
        assert.deepEqual(verified.features, edition === 'home' ? home : pro);
        assert.equal(Date.now() < verified.expiresAt && verified.expiresAt <= Date.now() + 1800000, true);
    }
});

test('Admin summaries verify UUID and exact entitlements while omitting identity and secrets', () => {
    for (const edition of [null, 'home', 'pro']) {
        const summary = statusSummary(adminResult(edition), uuid, edition);
        assert.equal(summary.uuidMatched, true);
        assert.equal(summary.valid, !!edition);
        assert.equal(summary.edition, edition);
        assert.equal(JSON.stringify(summary).includes(uuid), false);
        assert.equal(['token', 'key', 'licenseId', 'expiresAt', 'uuid'].some(key => Object.hasOwn(summary, key)), false);
        assert.equal(Object.isFrozen(summary) && Object.isFrozen(summary.limits) && Object.isFrozen(summary.features), true);
    }
});

test('malformed, mismatched and widened Admin grants fail with fixed diagnostic codes', () => {
    const variants = [
        result => { result.data.uuid = crypto.randomUUID(); },
        result => { result.data.limits.chargePoints = 50; },
        result => { result.data.limits.batteries = '4'; },
        result => { result.data.features.push(secret); },
        result => { result.data.token = secret; },
        result => { result.data.code = secret; },
        result => { result.status = 302; },
    ];
    for (const mutate of variants) {
        const result = adminResult('pro'); mutate(result);
        assert.throws(() => statusSummary(result, uuid, 'pro'), safeError('R9_LICENSE_STATUS'));
    }
    assert.throws(() => statusSummary(adminResult('home'), uuid, 'pro'), safeError('R9_LICENSE_STATUS'));
    assert.throws(() => statusSummary(adminResult(null), uuid, 'home'), safeError('R9_LICENSE_STATUS'));
});

test('strict UI login requires the Admin role and a protected session cookie', () => {
    assert.equal(uiCookie(loginResult()) === `nw_session=${secret}`, true);
    const mutations = [
        result => { result.data.role = 'installer'; },
        result => { result.data.passwordChangeRequired = true; },
        result => { result.data.strict = false; },
        result => { result.cookies = []; },
        result => { result.cookies.push(...result.cookies); },
        result => { result.cookies[0] = result.cookies[0].replace('; Secure', ''); },
        result => { result.cookies[0] = result.cookies[0].replace('HttpOnly; ', ''); },
        result => { result.cookies[0] = result.cookies[0].replace('Max-Age=3600', 'Max-Age=0'); },
    ];
    for (const mutate of mutations) {
        const result = loginResult(); mutate(result);
        assert.throws(() => uiCookie(result), error => safeError('R9_LICENSE_UI_LOGIN')(error) || safeError('R9_LICENSE_UI_COOKIE')(error));
    }
});

test('UI summaries admit unlicensed read-only information and exact licensed capacities/features', () => {
    for (const edition of [null, 'home', 'pro']) {
        const summary = uiSummary(uiResult(edition), { expectedEdition: edition });
        assert.equal(summary.valid, !!edition);
        assert.equal(summary.centralManagement, true);
        assert.equal(Object.hasOwn(summary, 'validUntil'), false);
        assert.equal(Object.isFrozen(summary) && Object.isFrozen(summary.features), true);
        if (edition) assert.equal(uiSummary(uiResult(edition), { info: false, expectedEdition: edition }).valid, true);
    }
    const wrong = uiResult('pro'); wrong.data.maxWallboxes = 50;
    assert.throws(() => uiSummary(wrong), safeError('R9_LICENSE_UI_STATUS'));
    const stale = uiResult('home'); stale.data.validUntil = Date.now() - 1;
    assert.throws(() => uiSummary(stale), safeError('R9_LICENSE_UI_STATUS'));
    const expanded = uiResult('home'); expanded.data.features.mesh = true;
    assert.throws(() => uiSummary(expanded), safeError('R9_LICENSE_UI_STATUS'));
    const exposed = uiResult('pro'); exposed.data.licenseKey = secret;
    assert.throws(() => uiSummary(exposed), safeError('R9_LICENSE_UI_STATUS'));
    assert.throws(() => uiSummary(uiResult(null), { expectedEdition: 'pro' }), safeError('R9_LICENSE_UI_STATUS'));
});

test('authentication, issuer and core exceptions cannot expose supplied secret values', async () => {
    assert.equal(adminToken({ status: 200, data: { access_token: secret } }) === secret, true);
    assert.throws(() => adminToken({ status: 401, data: { access_token: secret, error: secret } }), safeError('R9_LICENSE_ADMIN_LOGIN'));
    assert.throws(() => issueToken({ core, issuer: secret, uuid, edition: 'home' }), safeError('R9_LICENSE_FIXTURE'));
    assert.throws(() => issueToken({ core: { verifyLicense() { throw new Error(secret); } }, issuer, uuid, edition: 'home' }), safeError('R9_LICENSE_FIXTURE'));
    await assert.rejects(createSession({ ca: 'unused-test-ca', password: secret, uuid, issuer: secret, core }), safeError('R9_LICENSE_FIXTURE'));
    const session = await createSession({ ca: 'unused-test-ca', password: secret, uuid, issuer, core });
    assert.deepEqual(Object.keys(session), ['status', 'activate', 'remove', 'uiInfo', 'uiFeatures']);
    assert.throws(() => session.activate(secret), safeError('R9_LICENSE_EDITION'));
    assert.equal(JSON.stringify(session).includes(secret), false);
});
