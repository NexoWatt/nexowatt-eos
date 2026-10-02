#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const io = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
const standalone = fs.readFileSync(path.join(root, 'NEXOWATT_EOS_STANDALONE.md'), 'utf8');

assert.equal(io.native?.port, 8081, 'fresh EOS Admin instances must default to port 8081');
// Public README contains licensing only; technical documentation stays separate.
assert.ok(license.trim().length > 0, 'LICENSE must not be empty');
assert.equal(readme, license, 'README must contain only the unchanged LICENSE text');
assert.match(standalone, /Standard-Port:\s*`8081`/, 'standalone guide must document port 8081');
assert.doesNotMatch(standalone, /(?:^|\D)8091(?:\D|$)/, 'standalone guide must not advertise legacy port 8091');

console.log('[NexoWatt EOS default port selftest] OK (8081)');
