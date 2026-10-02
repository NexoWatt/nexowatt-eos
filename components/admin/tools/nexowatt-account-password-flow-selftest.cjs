#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const io = JSON.parse(read('io-package.json'));
for (const file of ['src/main.ts', 'build/main.js']) {
  const code = read(file);
  assert.ok(code.includes('disabledForCredentialMigration: true'));
  assert.ok(code.includes('eosPasswordSetupRequired.has(userId)'));
  assert.ok(!code.includes('setPasswordAsync(account.user, EOS_STABLE_INITIAL_PASSWORD'));
}
assert.equal(io.native.eosRequireFirstLoginPassword, true);
assert.ok(read('adminWww/js/eos-role-bootstrap.js').includes('showFirstLoginPassword(resolved, base);'));
assert.ok(read('adminWww/index.html').includes('eos-account-management.js'));
require('./nexowatt-security-boundaries-selftest.cjs');
