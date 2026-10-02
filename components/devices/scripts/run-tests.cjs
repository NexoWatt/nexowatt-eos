#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'test', 'test-manifest.json');

function fail(message) {
  console.error(`TEST-ABBRUCH: ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`test/test-manifest.json ist ungültig oder fehlt: ${error.message}`);
}

if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.tests) || manifest.tests.length === 0) {
  fail('test/test-manifest.json hat ein ungültiges Format');
}

const tests = manifest.tests.map((name) => {
  const safeName = String(name || '');
  if (!/^[A-Za-z0-9._-]+\.test\.js$/.test(safeName)) {
    fail(`ungültiger Testdateiname im Manifest: ${JSON.stringify(name)}`);
  }
  const filePath = path.join(root, 'test', safeName);
  if (!fs.existsSync(filePath)) fail(`Testdatei fehlt: test/${safeName}`);
  return filePath;
});

const result = spawnSync(process.execPath, ['--test', ...tests], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
});

if (result.error) fail(result.error.message);
process.exit(typeof result.status === 'number' ? result.status : 1);
