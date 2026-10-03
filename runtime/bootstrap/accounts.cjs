'use strict';
// EOS-ACCOUNT-01: bootstrap authority stays on the host. Browser clients cannot
// choose a role, add group memberships or obtain the service credential.
const { isDeepStrictEqual } = require('node:util');
const ROLES = Object.freeze({ installer: 'system.group.installateur', enduser: 'system.group.endkunde' });
const ACCOUNT_POLICY_VERSION = 1;
const MAX_ACCOUNTS = 16;
const PRIVATE_ACL = Object.freeze({ owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x600 });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
const reserved = new Set(['admin', 'administrator', 'root', 'service', 'nexowatt', 'eos', 'guest', 'anonymous']);
function validUserName(value) {
    return typeof value === 'string' && /^[a-z][a-z0-9_-]{2,31}$/.test(value) && !reserved.has(value);
}
function validateAccounts(value, servicePassword, validatePassword) {
    if (!exact(value, ['schemaVersion', 'accounts']) || value.schemaVersion !== 1 ||
        !Array.isArray(value.accounts) || value.accounts.length < 2 || value.accounts.length > MAX_ACCOUNTS) fail('ENROLLMENT_ACCOUNTS_SCHEMA');
    const names = new Set(); const passwords = new Set([servicePassword]); const roles = new Set();
    for (const row of value.accounts) {
        if (!exact(row, ['username', 'role', 'password']) || !validUserName(row.username) ||
            !Object.hasOwn(ROLES, row.role) || names.has(row.username)) fail('ENROLLMENT_ACCOUNTS_SCHEMA');
        validatePassword(row.password);
        if (passwords.has(row.password)) fail('ENROLLMENT_PASSWORD_REUSED');
        names.add(row.username); passwords.add(row.password); roles.add(row.role);
    }
    if (roles.size !== 2) fail('ENROLLMENT_ACCOUNT_ROLES_REQUIRED');
    return value.accounts.map(row => ({ ...row }));
}
function roleAcl() {
    // Product HTTP routes perform their own role checks. No general ioBroker
    // database, shell, messagebox or file permissions are granted to people.
    return Object.fromEntries(Object.entries({ object: ['list', 'read', 'write', 'delete'],
        state: ['list', 'read', 'write', 'create', 'delete'], users: ['list', 'read', 'write', 'create', 'delete'],
        other: ['execute', 'http', 'sendto'], file: ['list', 'read', 'write', 'create', 'delete'] })
        .map(([scope, actions]) => [scope, Object.fromEntries(actions.map(action => [action, false]))]));
}
function userDocument(row, password) {
    return { _id: `system.user.${row.username}`, type: 'user', common: { name: row.username, enabled: true, password },
        native: { nexowattPasswordChangeRequired: true, nexowattEosAccount: {
            managedBy: 'eos-host-enrollment', policyVersion: ACCOUNT_POLICY_VERSION, role: row.role,
            passwordInitialized: false, passwordSetupVersion: 0, passwordlessFirstLoginAllowed: false,
        } }, acl: { ...PRIVATE_ACL },
        from: 'system.host.eos-enrollment', ts: Date.now() };
}
function groupDocument(role, rows) {
    return { _id: ROLES[role], type: 'group', common: { name: role === 'installer' ? 'EOS Installateur' : 'EOS Benutzer',
        members: rows.filter(row => row.role === role).map(row => `system.user.${row.username}`).sort(), acl: roleAcl() },
        native: { eosAccountPolicyVersion: ACCOUNT_POLICY_VERSION },
        acl: { ...PRIVATE_ACL },
        from: 'system.host.eos-enrollment', ts: Date.now() };
}
function inventory(rows) { return rows.map(({ username, role }) => ({ userId: `system.user.${username}`, role })).sort((a, b) => a.userId.localeCompare(b.userId)); }
async function verifyAccounts(objects, marker, strongHash) {
    const enrolled = marker?.native?.accounts;
    const firstRun = marker?.native?.firstRunPolicyVersion === 1;
    if (marker?.native?.accountPolicyVersion !== ACCOUNT_POLICY_VERSION || !Array.isArray(enrolled) ||
        enrolled.length < (firstRun ? 0 : 2) || enrolled.length > MAX_ACCOUNTS) fail('ENROLLMENT_ACCOUNT_MARKER');
    const known = new Map();
    for (const row of enrolled) {
        if (!exact(row, ['userId', 'role']) || typeof row.userId !== 'string' || !validUserName(row.userId.replace(/^system\.user\./, '')) ||
            !row.userId.startsWith('system.user.') || !Object.hasOwn(ROLES, row.role) || known.has(row.userId)) fail('ENROLLMENT_ACCOUNT_MARKER');
        known.set(row.userId, row.role);
        const user = await objects.getObjectAsync(row.userId);
        if (user?._id !== row.userId || user.type !== 'user' || typeof user.common?.enabled !== 'boolean' ||
            user.native?.nexowattEosAccount?.managedBy !== 'eos-host-enrollment' ||
            user.native.nexowattEosAccount.policyVersion !== ACCOUNT_POLICY_VERSION ||
            user.native.nexowattEosAccount.role !== row.role ||
            user.native.nexowattEosAccount.passwordlessFirstLoginAllowed !== false ||
            !isDeepStrictEqual(user.acl, PRIVATE_ACL)) fail('ENROLLMENT_ACCOUNT_DRIFT');
        const account = user.native.nexowattEosAccount;
        const pending = user.native.nexowattPasswordChangeRequired === true &&
            account.passwordInitialized === false && account.passwordSetupVersion === 0;
        const initialized = user.native.nexowattPasswordChangeRequired === false &&
            account.passwordInitialized === true && account.passwordSetupVersion === 1 &&
            user.native.eosPasswordChangeRequired !== true;
        if (!pending && !initialized) fail('ENROLLMENT_ACCOUNT_STATE');
        const invitation = account.invitation;
        const invited = firstRun && pending && user.common.enabled === false && user.common.password === '' &&
            exact(invitation, ['digest', 'expiresAt', 'consumed']) && /^[a-f0-9]{64}$/.test(invitation.digest) &&
            Number.isSafeInteger(invitation.expiresAt) && invitation.expiresAt > 0 && invitation.consumed === false;
        if (!invited) strongHash(user.common.password);
        const consumed = (initialized || pending) && invitation?.consumed === true && (exact(invitation, ['consumed']) ||
            exact(invitation, ['consumed', 'acceptedAt']) && Number.isSafeInteger(invitation.acceptedAt) && invitation.acceptedAt > 0);
        if (invitation !== undefined && !invited && !consumed) fail('ENROLLMENT_INVITATION_STATE');
    }
    if (!firstRun && new Set(known.values()).size !== 2) fail('ENROLLMENT_ACCOUNT_MARKER');
    const result = await objects.getObjectViewAsync('system', 'group', { startkey: 'system.group.', endkey: 'system.group.\u9999' });
    if (!Array.isArray(result?.rows) || result.rows.length > 32) fail('ENROLLMENT_GROUP_DRIFT');
    const groups = new Map();
    for (const row of result.rows) {
        // ioBroker group views use the translated display name in row.id.
        const group = row.value || row.doc;
        if (group?.type !== 'group' || typeof group._id !== 'string' || groups.has(group._id) ||
            !Array.isArray(group.common?.members)) fail('ENROLLMENT_GROUP_DRIFT');
        groups.set(group._id, group);
        const expected = group._id === 'system.group.administrator' ? ['system.user.admin'] :
            Object.values(ROLES).includes(group._id) ? [...known].filter(([, role]) => ROLES[role] === group._id).map(([id]) => id).sort() : [];
        if (!isDeepStrictEqual([...group.common.members].sort(), expected) || group.common.enabled === false) fail('ENROLLMENT_GROUP_DRIFT');
    }
    if (!groups.has('system.group.administrator')) fail('ENROLLMENT_GROUP_DRIFT');
    for (const id of Object.values(ROLES)) if (!groups.has(id) || !isDeepStrictEqual(groups.get(id).common.acl, roleAcl()) ||
        !isDeepStrictEqual(groups.get(id).acl, PRIVATE_ACL) ||
        groups.get(id).native?.eosAccountPolicyVersion !== ACCOUNT_POLICY_VERSION) fail('ENROLLMENT_GROUP_DRIFT');
    const users = await objects.getObjectViewAsync('system', 'user', { startkey: 'system.user.', endkey: 'system.user.\u9999' });
    if (!Array.isArray(users?.rows) || users.rows.length !== known.size + 1) fail('ENROLLMENT_UNEXPECTED_USER');
    const seen = new Set();
    for (const row of users.rows) {
        const user = row.value || row.doc;
        if (user?.type !== 'user' || seen.has(user._id) || user._id !== 'system.user.admin' && !known.has(user._id)) fail('ENROLLMENT_UNEXPECTED_USER');
        seen.add(user._id);
    }
}
module.exports = { ROLES, ACCOUNT_POLICY_VERSION, MAX_ACCOUNTS, PRIVATE_ACL, validUserName, validateAccounts, roleAcl, userDocument, groupDocument, inventory, verifyAccounts };
