'use strict';
// Source-bound, read-only reproduction. This executes only extracted reviewed
// functions against memory stubs; it never imports the adapter or opens a port.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sourceDir = process.env.EOS_ADMIN_SOURCE_DIR || path.resolve(__dirname, '../../../component-sources/eos-admin');
const source = fs.readFileSync(path.join(sourceDir, 'build/main.js'), 'utf8');
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), '7578ee14ea840950ad5164b0063c091c983528ebc32689dec5dc499062fbc92e', 'Reviewed build/main.js hash must match');
const defaults = JSON.parse(fs.readFileSync(path.join(sourceDir, 'io-package.json'), 'utf8')).native;
function section(start, end) {
    const begin = source.indexOf(start);
    const stop = source.indexOf(end, begin + start.length);
    assert.ok(begin >= 0 && stop > begin, 'Reviewed function boundaries must exist');
    return source.slice(begin, stop);
}
const context = vm.createContext({});
vm.runInContext(section('const EOS_STABLE_INITIAL_PASSWORD =', 'class Admin extends') + '\nglobalThis.bootstrap = ensureEosStableInitialAccounts;', context, { timeout: 1000 });
const guardSource = section('    installEosSocketCommandGuard(socketAdmin) {', '    async ensureEosRoleModel()');
const normalization = section('function normalizeAdapterName(value)', 'function normalizeProtectedAdapters(value)');
vm.runInContext(normalization + '\nconst ERROR_PERMISSION = "permissionError";\nclass GuardHarness {\n' + guardSource + '\n}\nglobalThis.GuardHarness = GuardHarness;', context, { timeout: 1000 });
function adapterStub(existing = {}) {
    const objects = structuredClone(existing);
    const passwords = [];
    return {
        objects, passwords, log: { error() {} },
        async getForeignObjectAsync(id) { return objects[id] ? structuredClone(objects[id]) : null; },
        async setForeignObjectAsync(id, obj) { objects[id] = structuredClone(obj); },
        async extendForeignObjectAsync(id, update) {
            const old = objects[id];
            objects[id] = { ...old, ...structuredClone(update), native: { ...old?.native, ...structuredClone(update.native) } };
        },
        async setPasswordAsync(user, credential) {
            // Keep the shared value in process memory only. Never write/log it.
            passwords.push({ user, credential });
            objects[`system.user.${user}`].common.password = '<stubbed-password-hash>';
        },
    };
}
function guard() {
    const harness = new context.GuardHarness();
    harness.log = { warn() {} };
    harness.getEosCachedRole = () => 'installer';
    harness.getProtectedAdapterNames = () => ['eos-admin', 'nexowatt-ui'];
    const socket = { commands: { _checkPermissions: () => false } };
    harness.installEosSocketCommandGuard(socket);
    return socket.commands._checkPermissions;
}
test('ADM7-R01: distributed defaults enable authentication but HTTP on all IPv4 interfaces', () => {
    assert.equal(defaults.auth, true);
    assert.equal(defaults.secure, false);
    assert.equal(defaults.bind, '0.0.0.0');
    assert.equal(defaults.eosRequireFirstLoginPassword, false);
});
test('ADM7-R02: clean bootstrap assigns a shared initial credential to three enabled accounts', async () => {
    const adapter = adapterStub();
    await context.bootstrap(adapter);
    assert.equal(adapter.passwords.length, 3);
    assert.ok(new Set(adapter.passwords.map(item => item.credential)).size === 1, 'Initial credentials are shared');
    assert.ok(Object.values(adapter.objects).every(obj => obj.common.enabled === true), 'New accounts are enabled');
    assert.ok(Object.values(adapter.objects).every(obj => obj.native.nexowattEosAccount.forcePasswordChange === false), 'First-login change flag is cleared');
    assert.ok(!adapter.objects['system.user.admin'], 'This routine does not create the administrator account');
});
test('ADM7-R03: restart preserves a personal password but clears the forced-change state', async () => {
    const personal = { common: { enabled: true, password: '<existing-personal-hash>' }, native: { eosPasswordChangeRequired: true, nexowattEosAccount: { forcePasswordChange: true, passwordInitialized: false } } };
    const adapter = adapterStub({ 'system.user.installer': personal, 'system.user.guest': personal, 'system.user.user': personal });
    await context.bootstrap(adapter);
    assert.equal(adapter.passwords.length, 0, 'Existing nonempty passwords are not replaced');
    assert.ok(Object.values(adapter.objects).every(obj => obj.common.password === '<existing-personal-hash>'));
    assert.ok(Object.values(adapter.objects).every(obj => obj.native.eosPasswordChangeRequired === false && obj.native.nexowattEosAccount.forcePasswordChange === false));
});
test('ADM7-R04: installer command guard accepts a source URL without delegating original denial', () => {
    const permitted = guard()({ _acl: { user: 'system.user.installer' } }, 'cmdExec', () => {}, 'url https://example.invalid/package.tgz');
    assert.equal(permitted, true, 'Only permission result is reproduced; no command is executed');
});
test('ADM7-R05: installer command guard still rejects protected module upgrade', () => {
    const permitted = guard()({ _acl: { user: 'system.user.installer' } }, 'cmdExec', () => {}, 'upgrade eos-admin');
    assert.equal(permitted, false);
});
