#!/usr/bin/env node
'use strict';

/**
 * Generates the immutable npm artifact contract exclusively from
 * `package.json.files`.
 *
 * Repository-only files such as release reports, tsconfig files, .npmignore,
 * build output or local tooling may exist in the repo ZIP, but can never leak
 * into the npm manifest unless they are explicitly listed in package.json.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const ioPath = path.join(root, 'io-package.json');
const targetPath = path.join(root, 'scripts', 'release-artifact-manifest.json');

function fail(message) {
  console.error(`[release-manifest] ERROR: ${message}`);
  process.exit(1);
}
function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

let pkg;
let ioPackage;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  ioPackage = JSON.parse(fs.readFileSync(ioPath, 'utf8'));
} catch (error) {
  fail(`Paketmetadaten nicht lesbar: ${error && error.message ? error.message : error}`);
}

if (pkg.name !== 'iobroker.nexowatt-ui') fail(`Unerwarteter Paketname: ${pkg.name || '<leer>'}`);
if (!pkg.version || pkg.version !== ioPackage.common?.version) {
  fail(`Versionskonflikt: package.json=${pkg.version || '<leer>'}, io-package.json=${ioPackage.common?.version || '<leer>'}`);
}
if (!Array.isArray(pkg.files) || pkg.files.length === 0) fail('package.json files ist leer.');

const normalized = pkg.files.map(normalize);
if (new Set(normalized).size !== normalized.length) fail('package.json files enthält doppelte Pfade.');

const files = normalized.map((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (_error) {
    fail(`Paketdatei fehlt: ${relativePath}`);
  }
  if (!stat.isFile()) fail(`Paketpfad ist keine Datei: ${relativePath}`);
  const data = fs.readFileSync(absolutePath);
  return { path: relativePath, size: data.length, sha256: sha256(data) };
});

const manifest = {
  schema: 'nexowatt.release-artifact.v1',
  package: pkg.name,
  version: pkg.version,
  files,
};
fs.writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[release-manifest] OK: ${pkg.name}@${pkg.version}, ${files.length} Paketdateien.`);
