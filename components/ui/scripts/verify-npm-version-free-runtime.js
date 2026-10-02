#!/usr/bin/env node
'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const guardPath = path.join(root, 'scripts', 'verify-npm-version-free.js');

function runGuard(registry) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [guardPath], {
      cwd: root,
      env: {
        ...process.env,
        NEXOWATT_NPM_REGISTRY: registry,
        NEXOWATT_NPM_PACKAGE: 'iobroker.nexowatt-ui',
        NEXOWATT_NPM_VERSION: '9.9.999-test',
        NEXOWATT_NPM_TIMEOUT_MS: '3000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function withStatus(statusCode, fn) {
  const server = http.createServer((_request, response) => {
    response.statusCode = statusCode;
    response.setHeader('content-type', 'application/json');
    response.end(statusCode === 404 ? JSON.stringify({ error: 'not found' }) : JSON.stringify({ version: '9.9.999-test' }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    return await fn(`http://127.0.0.1:${address.port}/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  const free = await withStatus(404, runGuard);
  assert.equal(free.code, 0, `404 must mark the version as free: ${free.stderr}`);
  assert.match(free.stdout, /noch nicht veröffentlicht/i);

  const occupied = await withStatus(200, runGuard);
  assert.equal(occupied.code, 1, '200 must block an already published version');
  assert.match(occupied.stderr, /existiert bereits/i);

  const ambiguous = await withStatus(500, runGuard);
  assert.equal(ambiguous.code, 1, 'ambiguous registry failures must block publishing');
  assert.match(ambiguous.stderr, /nicht eindeutig|blockiert/i);

  console.log('[npm-version-free-runtime] OK: HTTP 404 releases the version; existing and ambiguous registry responses fail closed.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
