#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const built = fs.readFileSync(path.join(root, 'build/lib/web.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'src/lib/web.ts'), 'utf8');
const begin = built.search(/^[ \t]+getEosPasswordUserName\(userId\) \{/m);
const end = built.indexOf('async destroyEosRequestSessions', begin);
assert(begin >= 0 && end > begin, 'password methods not found in built backend');
const methods = built.slice(begin, end);
const sandbox = { module: { exports: null }, EOS_PASSWORD_SERVICE_USER: 'system.user.admin' };
vm.runInNewContext(`module.exports = class Harness {\nconstructor(adapter){this.adapter=adapter;}\n${methods}\n}`, sandbox);
const Harness = sandbox.module.exports;
(async () => {
  const calls = [];
  const userObject = { _id: 'system.user.user', common: { password: '$2b$hash' }, native: { keep: true } };
  const adapter = {
    eosSessionSecurity: { revoke() { calls.push(['revoke']); } },
    setPasswordAsync: async (user, password, options) => calls.push(['set', user, password, options]),
    checkPasswordAsync: async (user, password, options) => { calls.push(['check', user, password, options]); return [true, `system.user.${user}`]; },
    getForeignObjectAsync: async id => { calls.push(['get', id]); return JSON.parse(JSON.stringify(userObject)); },
    extendForeignObjectAsync: async (id, patch, options) => calls.push(['extend', id, patch, options]),
    setForeignObjectAsync: async () => { throw new Error('full user object replacement must not be used'); },
  };
  const harness = new Harness(adapter);
  await harness.setEosUserPassword('system.user.user', 'NexoWatt2025!');
  // The controller atomically validates proof and writes the new hash. Revoking
  // before this write invalidates its own proof; revoke immediately afterwards,
  // before verification can report success or yield further access.
  assert.deepEqual(calls[0].slice(0, 3), ['set', 'user', 'NexoWatt2025!']);
  assert.deepEqual(calls[1], ['revoke'], 'Existing sessions must be revoked immediately after the atomic password write');
  assert.deepEqual(calls[2].slice(0, 3), ['check', 'user', 'NexoWatt2025!']);
  await harness.updateEosAccountMetadata('system.user.user', (native, account) => {
    account.passwordInitialized = true;
    native.nexowattPasswordChangeRequired = false;
  });
  const extend = calls.find(row => row[0] === 'extend');
  assert(extend, 'native metadata was not extended');
  assert.equal(extend[1], 'system.user.user');
  assert.equal(extend[2].native.keep, true);
  assert.equal(extend[2].native.nexowattEosAccount.passwordInitialized, true);
  assert(!Object.prototype.hasOwnProperty.call(extend[2], 'common'), 'password/common must not be overwritten by metadata update');
  for (const code of [source, built]) {
    assert.match(code, /setPasswordAsync\(userName, password/);
    assert.match(code, /checkPasswordAsync\(userName, password/);
    assert.match(code, /extendForeignObjectAsync/);
    assert.match(code, /passwordVerificationFailed/);
  }
  console.log('[NexoWatt EOS password write] OK: real account name, verified password API and metadata-only update');
})().catch(error => { console.error(error.stack || error); process.exit(1); });
