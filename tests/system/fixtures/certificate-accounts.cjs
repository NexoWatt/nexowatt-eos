'use strict';
// Use the real enrollment account constructors and random PBKDF2 credentials.
// No reusable password or derived hash is written to the repository or logs.
const crypto = require('node:crypto');
const { passwordHash, PROFILE } = require('../../../runtime/bootstrap/enrollment.cjs');
const policy = require('../../../runtime/bootstrap/accounts.cjs');
async function credentialHashes() {
    const hashes = [];
    for (let i = 0; i < 3; i++) hashes.push(await passwordHash(crypto.randomBytes(24).toString('base64url')));
    return hashes;
}
function accountState(configHash, hashes) {
    const rows = [{ username: 'commissioning', role: 'installer' }, { username: 'customer', role: 'enduser' }];
    const marker = { _id: 'system.meta.eosEnrollment', type: 'meta', common: { name: 'test enrollment marker' },
        native: { profile: PROFILE, version: 2, state: 'complete', physicalControlEnabled: false,
            runtimeConfigSha256: configHash, accountPolicyVersion: policy.ACCOUNT_POLICY_VERSION, accounts: policy.inventory(rows) } };
    const admin = { _id: 'system.user.admin', type: 'user', common: { enabled: true, password: hashes[0] }, acl: { ...policy.PRIVATE_ACL } };
    const docs = new Map([[marker._id, marker], [admin._id, admin],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }]]);
    for (const [i, row] of rows.entries()) {
        const doc = policy.userDocument(row, hashes[i + 1]);
        if (row.role === 'enduser') {
            doc.native.nexowattPasswordChangeRequired = false;
            doc.native.nexowattEosAccount.passwordInitialized = true;
            doc.native.nexowattEosAccount.passwordSetupVersion = 1;
        }
        docs.set(doc._id, doc);
    }
    for (const role of Object.keys(policy.ROLES)) { const doc = policy.groupDocument(role, rows); docs.set(doc._id, doc); }
    return { marker, docs };
}
function objectDatabase(docs) {
    return { getObjectAsync: async id => structuredClone(docs.get(id)),
        setObjectAsync: async (id, doc) => docs.set(id, structuredClone(doc)),
        getObjectViewAsync: async (_design, view) => ({ rows: [...docs.values()].filter(doc => doc.type === view)
            .map(value => ({ id: value.common?.name || 'display-name-is-not-authority', value: structuredClone(value) })) }) };
}
module.exports = { credentialHashes, accountState, objectDatabase };
