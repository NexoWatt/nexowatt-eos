#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const guard = fs.readFileSync(path.join(root, 'scripts', 'verify-npm-version-free.js'), 'utf8');
const artifactGuard = fs.readFileSync(path.join(root, 'scripts', 'verify-release-artifact.js'), 'utf8');
const scripts = pkg.scripts || {};

assert.match(String(scripts['release:check-version-free'] || ''), /verify-npm-version-free\.js/,
  'release:check-version-free must call the version-free guard');
assert.strictEqual(
  String(scripts.prepublishOnly || '').trim(),
  'npm run release:check-version-free && npm run release:prepare && npm run publish:check && npm run test:stable-release && node scripts/verify-publish.js && npm run test:package-runtime-start-smoke',
  'prepublishOnly must check the free version, prepare old admin assets and run every artifact/stable/runtime gate'
);
assert.strictEqual(
  String(scripts['publish:check'] || '').trim(),
  'node scripts/verify-release-artifact.js',
  'publish:check must use the dependency-free immutable artifact verifier'
);
assert.doesNotMatch(String(scripts.prepublishOnly || ''), /sync:|build:|npm install|npm ci|typecheck/,
  'prepublishOnly must not rewrite runtime/source files, install dependencies or depend on a local compiler');
assert.strictEqual(String(pkg.publishConfig?.registry || ''), 'https://registry.npmjs.org/',
  'npm publish must be pinned to the public npm registry');
assert.strictEqual(String(pkg.publishConfig?.access || ''), 'public',
  'unscoped adapter package must remain explicitly public on npm');
assert.match(guard, /https:\/\/registry\.npmjs\.org/,
  'public npm registry must be the explicit default');
assert.match(guard, /statusCode === 404/,
  'only HTTP 404 may release a version for publishing');
assert.match(guard, /statusCode >= 200 && response\.statusCode < 300/,
  'existing package versions must block publishing');
assert.match(guard, /setTimeout\(timeoutMs/,
  'registry requests must be bounded by a timeout');
assert.match(guard, /fail-closed|sicherheitshalber blockiert/i,
  'ambiguous registry failures must block publishing');
assert.match(artifactGuard, /node:crypto/,
  'artifact verifier must hash checked product files');
assert.match(artifactGuard, /release-artifact-manifest\.json/,
  'artifact verifier must use the immutable release manifest');
const artifactCode = artifactGuard.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert.doesNotMatch(artifactCode, /require\(['\"]typescript|node_modules\/typescript|spawnSync|execSync|npm\s+(?:ci|install)/,
  'artifact verification must not depend on TypeScript, node_modules or subprocess installation');

console.log('[npm-version-free-guard] OK: version guard runs first; publish verifies the immutable artifact without npm/TypeScript setup.');
