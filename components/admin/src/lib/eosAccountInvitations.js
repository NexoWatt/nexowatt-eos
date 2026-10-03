'use strict';
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Nach abgeschlossener Ersteinrichtung persönliche Konten einladen.
 * Daten und Wirkung: Speichert ausschließlich den SHA-256-Besitznachweis eines
 * 30 Minuten gültigen Zufallscodes; das Passwort setzt der Empfänger selbst.
 * Bei Änderungen: Rollen, Neustart, Parallelversuche und Teilfehler mitprüfen.
 * Geteilte Runtime-UID ist keine Isolation gegen bereits kompromittierten Code.
 */
const { randomBytes, createHash, timingSafeEqual, pbkdf2 } = require('node:crypto');
const { promisify } = require('node:util');
const ENROLLMENT = 'system.meta.eosEnrollment';
const FIRST_START = 'system.meta.eosFirstStart';
const ROLES = Object.freeze({ installer: 'system.group.installateur', enduser: 'system.group.endkunde' });
const ACL = Object.freeze({ owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x600 });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const validName = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{2,31}$/.test(value)
    && !['admin', 'administrator', 'root', 'service', 'nexowatt', 'eos', 'guest', 'anonymous'].includes(value);
const hash = value => createHash('sha256').update(value).digest('hex');
function validPassword(value) {
    return typeof value === 'string' && [...value].length >= 15 && [...value].length <= 128
        && Buffer.byteLength(value) <= 256 && !/[\u0000-\u001f\u007f]/.test(value);
}

/** Ein globaler Schreibauftrag begrenzt KDF-Last und verhindert verlorene Inventarupdates. */
function createAccountInvitations(adapter, { now = Date.now } = {}) {
    let busy = false;
    let windowStart = 0;
    let attempts = 0;
    async function locked(operation) {
        if (busy) fail('accountBusy');
        busy = true;
        try { return await operation(); } finally { busy = false; }
    }
    async function complete() {
        const setup = await adapter.getForeignObjectAsync(FIRST_START);
        const enrollment = await adapter.getForeignObjectAsync(ENROLLMENT);
        if (setup?.native?.schemaVersion !== 1 || setup.native.state !== 'complete'
            || setup.native.configurationValidated !== true || setup.native.physicalControlEnabled !== false
            || enrollment?.native?.state !== 'complete' || enrollment.native.firstRunPolicyVersion !== 1
            || !Array.isArray(enrollment.native.accounts)) fail('setupIncomplete');
        return enrollment;
    }
    async function issue(body, authorize) {
        if (!exact(body, ['username', 'role']) || !validName(body.username) || !Object.hasOwn(ROLES, body.role)) fail('invitationInput');
        return locked(async () => {
            if (typeof authorize !== 'function' || await authorize() !== true) fail('permissionError');
            const marker = await complete();
            const id = `system.user.${body.username}`;
            const existing = await adapter.getForeignObjectAsync(id);
            const listed = marker.native.accounts.filter(row => row.userId === id);
            const renewing = existing?.type === 'user' && existing.common?.enabled === false
                && existing.common.password === '' && listed.length === 1 && listed[0].role === body.role
                && existing.native?.nexowattEosAccount?.role === body.role
                && existing.native.nexowattEosAccount.invitation?.consumed === false;
            if ((existing || listed.length) && !renewing) fail('accountExists');
            if (!renewing && marker.native.accounts.length >= 16) fail('accountLimit');
            const group = await adapter.getForeignObjectAsync(ROLES[body.role]);
            if (group?.type !== 'group' || group.common?.enabled === false || !Array.isArray(group.common?.members)) fail('accountPolicy');
            const code = randomBytes(24).toString('base64url');
            const expiresAt = now() + 30 * 60 * 1000;
            const account = { managedBy: 'eos-host-enrollment', policyVersion: 1, role: body.role,
                passwordInitialized: false, passwordSetupVersion: 0, passwordlessFirstLoginAllowed: false,
                invitation: { digest: hash(code), expiresAt, consumed: false } };
            if (await authorize() !== true) fail('permissionError');
            // Every partial state is disabled. Inventory/group writes never supply
            // a usable credential. A failed partial enrollment requires host repair.
            await adapter.setForeignObjectAsync(id, { _id: id, type: 'user', common: {
                name: body.username, enabled: false, password: '' }, native: {
                nexowattPasswordChangeRequired: true, nexowattEosAccount: account }, acl: { ...ACL } });
            await adapter.extendForeignObjectAsync(group._id, { common: { members: [...new Set([...group.common.members, id])].sort() } });
            await adapter.extendForeignObjectAsync(ENROLLMENT, { native: { accounts: [
                ...marker.native.accounts.filter(row => row.userId !== id), { userId: id, role: body.role },
            ].sort((a, b) => a.userId.localeCompare(b.userId)) } });
            return { username: body.username, role: body.role, code, expiresAt, acceptancePath: '/nexowatt/account/accept' };
        });
    }
    async function accept(body) {
        // Global limit bounds work independently of arbitrary usernames/IP spoofing.
        const time = now();
        if (time - windowStart >= 60000) { windowStart = time; attempts = 0; }
        if (++attempts > 30) fail('invitationRateLimit');
        if (!exact(body, ['username', 'code', 'password', 'passwordRepeat']) || !validName(body.username)
            || typeof body.code !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(body.code)
            || !validPassword(body.password) || body.password !== body.passwordRepeat) fail('invitationInvalid');
        return locked(async () => {
            const marker = await complete();
            const id = `system.user.${body.username}`;
            const user = await adapter.getForeignObjectAsync(id);
            const account = user?.native?.nexowattEosAccount;
            const invitation = account?.invitation;
            if (user?.type !== 'user' || user.common?.enabled !== false || user.common.password !== ''
                || account.managedBy !== 'eos-host-enrollment' || account.policyVersion !== 1
                || !Object.hasOwn(ROLES, account.role) || !marker.native.accounts.some(row => row.userId === id && row.role === account.role)
                || invitation?.consumed !== false || !Number.isSafeInteger(invitation.expiresAt) || invitation.expiresAt <= now()
                || !/^[a-f0-9]{64}$/.test(invitation.digest || '')
                || !timingSafeEqual(Buffer.from(hash(body.code), 'hex'), Buffer.from(invitation.digest, 'hex'))) fail('invitationInvalid');
            const original = JSON.stringify(user);
            const groups = await Promise.all(['system.group.administrator', ...Object.values(ROLES)]
                .map(groupId => adapter.getForeignObjectAsync(groupId)));
            const memberships = groups.filter(group => group?.common?.members?.includes(id));
            if (memberships.length !== 1 || memberships[0]._id !== ROLES[account.role]
                || memberships[0].common.enabled === false) fail('invitationInvalid');
            const salt = randomBytes(16).toString('hex');
            const derived = await promisify(pbkdf2)(body.password, salt, 600000, 256, 'sha256');
            await complete();
            if (invitation.expiresAt <= now() || JSON.stringify(await adapter.getForeignObjectAsync(id)) !== original
                || JSON.stringify(await Promise.all(['system.group.administrator', ...Object.values(ROLES)]
                    .map(groupId => adapter.getForeignObjectAsync(groupId)))) !== JSON.stringify(groups)) fail('accountChanged');
            // Credential, enabled bit and consumed code commit in one object write.
            // A reboot sees either disabled invitation or completed personal account.
            await adapter.setForeignObjectAsync(id, { ...user, common: { ...user.common, enabled: true,
                password: `pbkdf2$600000$${derived.toString('hex')}$${salt}` }, native: {
                ...user.native, nexowattPasswordChangeRequired: false, eosPasswordChangeRequired: false,
                nexowattEosAccount: { ...account, passwordInitialized: true, passwordSetupVersion: 1,
                    passwordInitializationVersion: 1, passwordInitializedBy: 'self', forcePasswordChange: false,
                    passwordSetAt: new Date(now()).toISOString(), invitation: { consumed: true } } } });
            adapter.eosSessionSecurity?.revoke();
            return { success: true, loginPath: '/index.html?login' };
        });
    }
    return { issue, accept };
}
module.exports = { createAccountInvitations, validPassword, validName };
