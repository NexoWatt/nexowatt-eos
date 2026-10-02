#!/usr/bin/env node
'use strict';

/** Verbindliche Kundenanmeldung und vorhandene Browser-Härtung statisch absichern.
 * Laufzeitnachweis: verify-eos-auth-security.cjs prüft echte HTTP-Routen. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const admin = JSON.parse(fs.readFileSync(path.join(root, 'admin/jsonConfig.json'), 'utf8'));
assert.strictEqual(pkg.native.accessControl.customerWritePolicy, 'session', 'customer login must be the default');
assert.strictEqual(pkg.native.accessControl.allowedOrigins, '', 'allowedOrigins default must be empty');
assert.ok(admin.items && admin.items.sicherheit, 'security admin tab missing');

for (const rel of ['src-ts/runtime-executables/main.ts', 'main.js']) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(text.includes("const customerWritePolicy = 'session'"), `${rel}: mandatory session policy missing`);
  assert.ok(text.includes('const authEnabled = true'), `${rel}: mandatory auth missing`);
  assert.ok(text.includes('const protectWrites = true'), `${rel}: write protection missing`);
  assert.ok(!text.includes("customerWritePolicy === 'all'") && !text.includes("customerWritePolicy === 'lan'"), `${rel}: legacy bypass remains`);
  assert.ok(text.includes('nwRequestRemoteIp(req)'), `${rel}: socket IP evaluation missing`);
  assert.ok(text.includes("req.socket && req.socket.remoteAddress"), `${rel}: real socket address missing`);
  assert.ok(!text.includes("req.headers['x-forwarded-for']"), `${rel}: untrusted forwarded header is used`);
  assert.ok(text.includes('origin_forbidden'), `${rel}: browser origin protection missing`);
  assert.ok(text.includes('login_rate_limited'), `${rel}: login rate limit missing`);
  assert.ok(text.includes("'X-Content-Type-Options'"), `${rel}: security headers missing`);
}
assert.deepStrictEqual(admin.items.sicherheit.items['accessControl.customerWritePolicy'].options.map(option => option.value), ['session']);
console.log('[customer-write-policy] OK: mandatory authenticated writes, secure default and no trusted forwarded IP bypass.');
