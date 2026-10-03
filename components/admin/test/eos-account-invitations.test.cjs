'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createAccountInvitations } = require('../build/lib/eosAccountInvitations');
const accountPolicy = require('../../../runtime/bootstrap/accounts.cjs');
const { strongHash } = require('../../../runtime/bootstrap/enrollment.cjs');
const clone = value => value === undefined ? null : structuredClone(value);
function fixture() {
    let now = 1800000000000;
    const docs = new Map([
        ['system.meta.eosFirstStart', { native: { schemaVersion: 1, state: 'complete', configurationValidated: true, physicalControlEnabled: false } }],
        ['system.meta.eosEnrollment', { native: { state: 'complete', accountPolicyVersion: 1, firstRunPolicyVersion: 1, accounts: [] } }],
        ['system.user.admin', { _id: 'system.user.admin', type: 'user' }],
        ['system.group.administrator', { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'] } }],
        ...Object.keys(accountPolicy.ROLES).map(role => [accountPolicy.ROLES[role], accountPolicy.groupDocument(role, [])]),
    ]);
    const writes = [];
    const adapter = {
        async getForeignObjectAsync(id) { return clone(docs.get(id)); },
        async setForeignObjectAsync(id, doc) { writes.push(id); docs.set(id, clone(doc)); },
        async extendForeignObjectAsync(id, patch) {
            writes.push(id); const doc = docs.get(id);
            for (const [key, value] of Object.entries(patch)) doc[key] = { ...doc[key], ...clone(value) };
        }, eosSessionSecurity: { revoke() {} },
    };
    const invitations = createAccountInvitations(adapter, { now: () => now });
    const issue = (body = {}) => invitations.issue({ username: 'person', role: 'enduser', ...body }, async () => true);
    const payload = invite => { const password = randomBytes(24).toString('base64url'); return {
        username: invite.username, code: invite.code, password, passwordRepeat: password,
    }; };
    const verifyAccounts = () => accountPolicy.verifyAccounts({
        getObjectAsync: adapter.getForeignObjectAsync,
        getObjectViewAsync: async (_design, type) => ({ rows: [...docs.values()].filter(doc => doc.type === type).map(value => ({ value })) }),
    }, docs.get('system.meta.eosEnrollment'), strongHash);
    return { adapter, docs, writes, invitations, issue, payload, verifyAccounts, advance(ms) { now += ms; } };
}
test('authorized invitation stores disabled account and only hashed code; recipient sets own credential', async () => {
    const x = fixture(); const invite = await x.issue();
    const user = x.docs.get('system.user.person');
    assert.equal(user.common.enabled, false); assert.equal(user.common.password, '');
    assert.equal(JSON.stringify([...x.docs]).includes(invite.code), false);
    assert.equal(user.native.nexowattEosAccount.role, 'enduser');
    await x.verifyAccounts();
    const result = await x.invitations.accept(x.payload(invite));
    assert.equal(result.success, true);
    const active = x.docs.get('system.user.person');
    assert.equal(active.common.enabled, true); assert.match(active.common.password, /^pbkdf2\$600000\$/);
    assert.deepEqual(active.native.nexowattEosAccount.invitation, { consumed: true });
    await x.verifyAccounts();
    await assert.rejects(x.invitations.accept(x.payload(invite)), /invitationInvalid/);
});
test('missing authorization, role escalation and extra payload fields fail before writes', async () => {
    const x = fixture();
    await assert.rejects(x.invitations.issue({ username: 'person', role: 'installer' }, async () => false), /permissionError/);
    for (const body of [{ role: 'admin' }, { username: 'admin' }, { groups: ['system.group.administrator'] }, { password: 'caller-chosen' }]) {
        await assert.rejects(x.issue(body), /invitationInput/);
    }
    assert.equal(x.writes.length, 0);
});
test('unconfigured system cannot invite or activate and no setup field can grant physical control', async () => {
    for (const patch of [{ state: 'pending' }, { configurationValidated: false }, { physicalControlEnabled: true }]) {
        const x = fixture(); Object.assign(x.docs.get('system.meta.eosFirstStart').native, patch);
        await assert.rejects(x.issue(), /setupIncomplete/); assert.equal(x.writes.length, 0);
    }
});
test('missing, wrong, expired and role-injected invitation never activates user', async () => {
    const x = fixture(); const invite = await x.issue();
    for (const patch of [{ code: '' }, { code: randomBytes(24).toString('base64url') }, { role: 'admin' }, { passwordRepeat: 'different' }]) {
        await assert.rejects(x.invitations.accept({ ...x.payload(invite), ...patch }), /invitationInvalid/);
    }
    x.advance(30 * 60 * 1000);
    await assert.rejects(x.invitations.accept(x.payload(invite)), /invitationInvalid/);
    assert.equal(x.docs.get('system.user.person').common.enabled, false);
});
test('parallel activation has exactly one write; persisted consumed code survives service restart', async () => {
    const x = fixture(); const invite = await x.issue(); const body = x.payload(invite);
    const results = await Promise.allSettled([x.invitations.accept(body), x.invitations.accept(body)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'accountBusy').length, 1);
    assert.equal(x.writes.filter(id => id === 'system.user.person').length, 2);
    const restarted = createAccountInvitations(x.adapter);
    await assert.rejects(restarted.accept(body), /invitationInvalid/);
});
test('failed final database write keeps account disabled; retry after restart uses persisted invitation', async () => {
    const x = fixture(); const invite = await x.issue(); const body = x.payload(invite);
    const original = x.adapter.setForeignObjectAsync;
    x.adapter.setForeignObjectAsync = async () => { throw new Error('synthetic I/O failure'); };
    await assert.rejects(x.invitations.accept(body), /I\/O/);
    assert.equal(x.docs.get('system.user.person').common.enabled, false);
    x.adapter.setForeignObjectAsync = original;
    const restarted = createAccountInvitations(x.adapter, { now: () => invite.expiresAt - 1000 });
    assert.equal((await restarted.accept(body)).success, true);
});
test('expiry and changed role during KDF fail closed before final write', async () => {
    const x = fixture(); const invite = await x.issue(); const before = x.writes.length;
    const running = x.invitations.accept(x.payload(invite));
    await new Promise(resolve => setTimeout(resolve, 50));
    x.docs.get('system.group.endkunde').common.members = [];
    await assert.rejects(running, /accountChanged/);
    assert.equal(x.writes.length, before); assert.equal(x.docs.get('system.user.person').common.enabled, false);
});
test('global request budget rejects more than 30 attempts without KDF or writes', async () => {
    const x = fixture();
    for (let index = 0; index < 30; index++) await assert.rejects(x.invitations.accept({}), /invitationInvalid/);
    await assert.rejects(x.invitations.accept({}), /invitationRateLimit/); assert.equal(x.writes.length, 0);
});
test('renewing an expired invitation revokes old code and preserves one inventory/group row', async () => {
    const x = fixture(); const old = await x.issue(); x.advance(31 * 60 * 1000);
    const next = await x.issue(); assert.notEqual(next.code, old.code);
    await assert.rejects(x.invitations.accept(x.payload(old)), /invitationInvalid/);
    assert.equal(x.docs.get('system.meta.eosEnrollment').native.accounts.length, 1);
    assert.deepEqual(x.docs.get('system.group.endkunde').common.members, ['system.user.person']);
});
test('extra administrative membership cannot activate a low-privilege invitation', async () => {
    const x = fixture(); const invite = await x.issue();
    x.docs.set('system.group.administrator', { _id: 'system.group.administrator', common: { members: ['system.user.person'] } });
    await assert.rejects(x.invitations.accept(x.payload(invite)), /invitationInvalid/);
    assert.equal(x.docs.get('system.user.person').common.enabled, false);
});
