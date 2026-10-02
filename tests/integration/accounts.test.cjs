'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const policy = require('../../runtime/bootstrap/accounts.cjs');
const { validatePassword } = require('../../runtime/bootstrap/enrollment.cjs');
const secret = () => crypto.randomBytes(24).toString('base64url');
function fixture() {
    const servicePassword = secret();
    const input = { schemaVersion: 1, accounts: [
        { username: 'commissioning', role: 'installer', password: secret() },
        { username: 'customer', role: 'enduser', password: secret() },
    ] };
    return { servicePassword, input };
}
test('strict input accepts two individual roles and emits nonsecret inventory', () => {
    const { input, servicePassword } = fixture();
    const rows = policy.validateAccounts(input, servicePassword, validatePassword);
    assert.deepEqual(rows, input.accounts);
    assert.notEqual(rows[0], input.accounts[0]);
    const inventory = policy.inventory(rows);
    assert.deepEqual(inventory, [{ userId: 'system.user.commissioning', role: 'installer' }, { userId: 'system.user.customer', role: 'enduser' }]);
    for (const row of rows) assert.ok(!JSON.stringify(inventory).includes(row.password));
});
for (const [name, mutate, code = 'ENROLLMENT_ACCOUNTS_SCHEMA'] of [
    ['unknown root key', f => f.input.allowAdmin = true],
    ['unknown account key', f => f.input.accounts[0].enabled = true],
    ['admin role', f => f.input.accounts[0].role = 'admin'],
    ['reserved admin username', f => f.input.accounts[0].username = 'admin'],
    ['foreign identifier', f => f.input.accounts[0].username = 'system.user.root'],
    ['mixed case identifier', f => f.input.accounts[0].username = 'Admin'],
    ['duplicate identity', f => f.input.accounts[1].username = f.input.accounts[0].username],
    ['only installer', f => f.input.accounts[1].role = 'installer', 'ENROLLMENT_ACCOUNT_ROLES_REQUIRED'],
    ['only one account', f => f.input.accounts.pop()],
    ['too many accounts', f => f.input.accounts = Array.from({ length: 17 }, (_, i) => ({ username: `user${i}`, role: i ? 'enduser' : 'installer', password: secret() }))],
    ['service credential reused', f => f.input.accounts[0].password = f.servicePassword, 'ENROLLMENT_PASSWORD_REUSED'],
    ['temporary credential reused', f => f.input.accounts[1].password = f.input.accounts[0].password, 'ENROLLMENT_PASSWORD_REUSED'],
    ['weak password', f => f.input.accounts[0].password = 'short', 'ENROLLMENT_PASSWORD_POLICY'],
    ['control character', f => f.input.accounts[0].password += '\n', 'ENROLLMENT_PASSWORD_POLICY'],
]) test(`reject ${name}`, () => {
    const f = fixture(); mutate(f);
    assert.throws(() => policy.validateAccounts(f.input, f.servicePassword, validatePassword), error => error.code === code);
});
function enrolledFixture() {
    const { input } = fixture();
    const docs = new Map();
    for (const row of input.accounts) {
        const doc = policy.userDocument(row, 'hash-fixture'); docs.set(doc._id, doc);
    }
    for (const role of Object.keys(policy.ROLES)) { const doc = policy.groupDocument(role, input.accounts); docs.set(doc._id, doc); }
    docs.set('system.user.admin', { _id: 'system.user.admin', type: 'user', common: { enabled: true } });
    docs.set('system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } });
    docs.set('system.group.user', { _id: 'system.group.user', type: 'group', common: { members: [] } });
    const marker = { native: { accountPolicyVersion: 1, accounts: policy.inventory(input.accounts) } };
    const objects = { getObjectAsync: async id => structuredClone(docs.get(id)), getObjectViewAsync: async (_design, view) => ({
        rows: [...docs.values()].filter(doc => doc.type === view).map(value => ({ id: 'untrusted display name', value })),
    }) };
    const strongHash = value => assert.equal(value, 'hash-fixture');
    return { docs, marker, objects, strongHash };
}
test('canonical group IDs work despite untrusted view display name', async () => {
    const f = enrolledFixture(); await policy.verifyAccounts(f.objects, f.marker, f.strongHash);
    const user = f.docs.get('system.user.customer');
    assert.equal(user.native.nexowattPasswordChangeRequired, true);
    assert.equal(user.native.nexowattEosAccount.passwordlessFirstLoginAllowed, false);
    assert.deepEqual(user.acl, policy.PRIVATE_ACL);
    assert.equal(user.acl.object, 0x600);
    for (const scope of Object.values(policy.roleAcl())) assert.ok(Object.values(scope).every(value => value === false));
});
for (const [name, mutate, code] of [
    ['service membership escalation', f => f.docs.get('system.group.administrator').common.members.push('system.user.customer'), 'ENROLLMENT_GROUP_DRIFT'],
    ['legacy inheritance', f => f.docs.get('system.group.endkunde').common.members.push('system.user.commissioning'), 'ENROLLMENT_GROUP_DRIFT'],
    ['new admin alias', f => f.docs.set('system.group.eos-service', { _id: 'system.group.eos-service', type: 'group', common: { members: ['system.user.customer'] } }), 'ENROLLMENT_GROUP_DRIFT'],
    ['raw state write permission', f => f.docs.get('system.group.installateur').common.acl.state.write = true, 'ENROLLMENT_GROUP_DRIFT'],
    ['disabled role', f => f.docs.get('system.group.endkunde').common.enabled = false, 'ENROLLMENT_GROUP_DRIFT'],
    ['world readable password', f => f.docs.get('system.user.customer').acl.object = 0x664, 'ENROLLMENT_ACCOUNT_DRIFT'],
    ['unmanaged identity', f => delete f.docs.get('system.user.customer').native.nexowattEosAccount.managedBy, 'ENROLLMENT_ACCOUNT_DRIFT'],
    ['passwordless account', f => f.docs.get('system.user.customer').native.nexowattEosAccount.passwordlessFirstLoginAllowed = true, 'ENROLLMENT_ACCOUNT_DRIFT'],
    ['unrecorded account', f => f.docs.set('system.user.hidden', { _id: 'system.user.hidden', type: 'user' }), 'ENROLLMENT_UNEXPECTED_USER'],
    ['missing role group', f => f.docs.delete('system.group.endkunde'), 'ENROLLMENT_GROUP_DRIFT'],
    ['missing group policy', f => delete f.docs.get('system.group.endkunde').native.eosAccountPolicyVersion, 'ENROLLMENT_GROUP_DRIFT'],
    ['inconsistent first-login state', f => f.docs.get('system.user.customer').native.nexowattPasswordChangeRequired = false, 'ENROLLMENT_ACCOUNT_STATE'],
    ['inconsistent account marker', f => f.marker.native.accounts[0].role = 'admin', 'ENROLLMENT_ACCOUNT_MARKER'],
    ['malformed marker ID', f => f.marker.native.accounts[0].userId = 7, 'ENROLLMENT_ACCOUNT_MARKER'],
]) test(`read-only enrollment check detects ${name}`, async () => {
    const f = enrolledFixture(); mutate(f);
    await assert.rejects(policy.verifyAccounts(f.objects, f.marker, f.strongHash), error => error.code === code);
});
test('legitimate password initialization or account disable does not mutate role enrollment', async () => {
    const f = enrolledFixture(); const user = f.docs.get('system.user.customer');
    user.native.nexowattPasswordChangeRequired = false;
    user.native.nexowattEosAccount.passwordInitialized = true;
    user.native.nexowattEosAccount.passwordSetupVersion = 1;
    user.common.enabled = false;
    await policy.verifyAccounts(f.objects, f.marker, f.strongHash);
});
