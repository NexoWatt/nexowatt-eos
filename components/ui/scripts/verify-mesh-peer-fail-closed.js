#!/usr/bin/env node
'use strict';

/** Mesh-/Peer-Sicherheitsregression: Token nur im Header, fehlender Token sperrt. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = ['src-ts/runtime-executables/main.ts', 'main.js'];
for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const start = text.indexOf('const _nwMeshPeerTokenFromReq');
  const end = text.indexOf('const _nwMeshWriteState', start);
  assert.ok(start >= 0 && end > start, `${rel}: token helper missing`);
  const block = text.slice(start, end);
  assert.ok(block.includes("req.headers['x-nexowatt-mesh-token']"), `${rel}: header token missing`);
  assert.ok(!block.includes('req.query'), `${rel}: query token remains allowed`);
  assert.ok(!block.includes('req.body'), `${rel}: body token remains allowed`);
  assert.ok(block.includes('if (!token || !given) return false;'), `${rel}: missing token is not fail-closed`);
  assert.ok(block.includes('crypto.timingSafeEqual'), `${rel}: token compare is not timing-safe`);
  assert.ok(text.includes("app.post('/api/mesh/microgrid/command', requireInstaller"), `${rel}: mesh operator command not installer protected`);
  assert.ok(text.includes("app.post('/api/mesh/local-bridge/release', requireInstaller"), `${rel}: bridge release not installer protected`);
  assert.ok(text.includes("app.post('/api/mesh/peer/fieldtest', requireInstaller"), `${rel}: peer fieldtest POST not installer protected`);
  assert.ok(text.includes("app.get('/api/mesh/peer/fieldtest', requireInstaller"), `${rel}: peer fieldtest GET not installer protected`);
}
console.log('[mesh-peer-fail-closed] OK: receiver requires header token and operator endpoints require installer access.');
