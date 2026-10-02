'use strict';
// Isolated reproduction of stable Admin's original onChange methods.
// Only TypeScript's "as string" casts are removed; no browser, service or network.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const excerpts = JSON.parse(fs.readFileSync(path.join(__dirname, 'admin-onchange-excerpts.json'), 'utf8'));
const results = [];
for (const excerpt of excerpts) {
  const name = excerpt.component;
  const file = excerpt.path;
  const method = excerpt.method;
  assert.equal(crypto.createHash('sha256').update(method).digest('hex'), excerpt.excerpt_sha256);
  const body = method.slice(method.indexOf('{') + 1, method.lastIndexOf('}')).replaceAll(' as string', '');
  const original = { type: 'redis', host: '127.0.0.1', port: 6380, options: { auth_pass: 'TEST_VALUE_NOT_A_SECRET', tls: { ca: 'TEST_CA', rejectUnauthorized: true, servername: 'test.invalid' }, username: 'test-client', db: 1 } };
  const state = {
    type: 'redis', host: '127.0.0.1', port: '6380', noFileCache: false,
    connectTimeout: '5000', writeFileInterval: '5000', dataDir: '',
    options_auth_pass: original.options.auth_pass, options_retry_max_delay: '5000', options_retry_max_count: '19', options_db: '1', options_family: '0',
    backup_disabled: false, backup_files: '24', backup_hours: '48', backup_period: '120', backup_path: '',
    jsonlOptions_autoCompress_sizeFactor: '2', jsonlOptions_autoCompress_sizeFactorMinimumSize: '25000', jsonlOptions_throttleFS_intervalMs: '60000', jsonlOptions_throttleFS_maxBufferedCommands: '100',
  };
  let emitted;
  const fixture = { state, props: { settings: original, onChange: x => { emitted = x; } } };
  vm.runInNewContext(`(function(){${body}}).call(fixture)`, { fixture }, { timeout: 1000 });
  assert.ok(emitted);
  assert.equal(emitted.options.tls, undefined);
  assert.equal(emitted.options.username, undefined);
  assert.equal(emitted.options.auth_pass, original.options.auth_pass);
  // Dialog updates the complete section, then shallow-merges only the root.
  const oldRoot = { system: { marker: true }, objects: original, states: original, log: {} };
  const newRoot = { ...oldRoot, [name.toLowerCase()]: emitted };
  assert.equal(newRoot[name.toLowerCase()].options.tls, undefined);
  results.push({ component: name, file, source_sha256: excerpt.source_sha256, excerpt_sha256: excerpt.excerpt_sha256, observedOptionsKeys: Object.keys(emitted.options), tlsRemoved: true, usernameRemoved: true, authPassPreserved: true });
}
console.log(JSON.stringify({ at_utc: new Date().toISOString(), admin_version: '8.0.14', commit: 'e4b39b810f5f12cd6e969e25a39ff6f3188a6608', scope: 'isolated original onChange method execution, synthetic state; not browser/end-to-end', outcome: 'Security-relevant configuration loss reproduced; not a passing security test', results }, null, 2));
