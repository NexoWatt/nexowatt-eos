#!/usr/bin/env node
'use strict';

/**
 * Read-only release artifact verification.
 *
 * This script deliberately uses only Node.js built-ins. `npm publish` therefore
 * works from a copied release ZIP without `npm ci`, without a particular npm
 * minor version, and without rebuilding the already tested product runtime.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
// Guard the complete source tree as well as the published runtime, before hashing.
const secretGuard = require('./check-repository-secrets.cjs');
try {
  if (!secretGuard.report(secretGuard.checkRepository(root))) process.exit(1);
} catch (_) {
  console.error('[release-artifact] ERROR: Secret check could not be completed.');
  process.exit(1);
}
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const fail = (message) => {
  console.error(`[release-artifact] ERROR: ${message}`);
  process.exit(1);
};
// Vollständige Repository-ZIPs enthalten Quellen und müssen deren Dokumentation
// mitprüfen. Das veröffentlichte npm-Laufzeitpaket enthält diese Quellen nicht.
if (fs.existsSync(path.join(root, 'src-ts')) || fs.existsSync(path.join(root, 'src-admin-tab', 'src'))) {
  try {
    const count = require('./verify-code-documentation.cjs').verify(root);
    console.log(`[release-artifact] Quellcode-Dokumentation aktuell: ${count} Dateien.`);
  } catch (error) {
    fail(`Quellcode-Dokumentation: ${error.message}`);
  }
}
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const normalize = (value) => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');

let pkg;
let ioPackage;
let manifest;
try {
  pkg = readJson('package.json');
  ioPackage = readJson('io-package.json');
  manifest = readJson('scripts/release-artifact-manifest.json');
} catch (error) {
  fail(`Release-Metadaten sind nicht lesbar: ${error && error.message ? error.message : error}`);
}

if (pkg.name !== 'iobroker.nexowatt-ui') fail(`Unerwarteter Paketname: ${pkg.name}`);
if (!pkg.version || pkg.version !== ioPackage.common?.version) {
  fail(`Versionskonflikt: package.json=${pkg.version || '<leer>'}, io-package.json=${ioPackage.common?.version || '<leer>'}`);
}
if (manifest.package !== pkg.name || manifest.version !== pkg.version) {
  fail(`Manifest passt nicht zum Release: ${manifest.package}@${manifest.version} statt ${pkg.name}@${pkg.version}`);
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail('Release-Dateimanifest ist leer.');
if (!Array.isArray(pkg.files) || pkg.files.length === 0) fail('package.json enthält keine explizite files-Liste.');

const expectedPaths = manifest.files.map((entry) => normalize(entry.path));
const packagePaths = pkg.files.map(normalize);
const expectedSet = new Set(expectedPaths);
const packageSet = new Set(packagePaths);
if (expectedSet.size !== expectedPaths.length) fail('Release-Dateimanifest enthält doppelte Pfade.');
if (packageSet.size !== packagePaths.length) fail('package.json files enthält doppelte Pfade.');

const missingInPackageList = expectedPaths.filter((entry) => !packageSet.has(entry));
const unexpectedInPackageList = packagePaths.filter((entry) => !expectedSet.has(entry));
if (missingInPackageList.length || unexpectedInPackageList.length) {
  fail(`Paket-Dateiliste weicht vom geprüften Artefakt ab. Fehlend: ${missingInPackageList.slice(0, 5).join(', ') || '-'}; unerwartet: ${unexpectedInPackageList.slice(0, 5).join(', ') || '-'}`);
}

const forbiddenPath = /(^|\/)(?:node_modules|\.git|\.github|src-ts|src-admin-tab|build(?:-ts|-types)?)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|zip|tgz|map))$/i;
for (const relativePath of packagePaths) {
  if (forbiddenPath.test(relativePath)) fail(`Nicht veröffentlichbarer Pfad in package.json files: ${relativePath}`);
}

for (const entry of manifest.files) {
  const relativePath = normalize(entry.path);
  const absolutePath = path.join(root, relativePath);
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (_error) {
    fail(`Release-Datei fehlt: ${relativePath}`);
  }
  if (!stat.isFile()) fail(`Release-Pfad ist keine Datei: ${relativePath}`);
  const data = fs.readFileSync(absolutePath);
  if (data.length !== Number(entry.size)) fail(`Dateigröße verändert: ${relativePath}`);
  const actualHash = sha256(data);
  if (actualHash !== entry.sha256) fail(`Dateiinhalt verändert: ${relativePath}`);
}

const lifecycle = String(pkg.scripts?.prepublishOnly || '');
const expectedLifecycle = 'npm run release:check-version-free && npm run release:prepare && npm run publish:check && npm run test:stable-release && node scripts/verify-publish.js && npm run test:package-runtime-start-smoke';
if (lifecycle !== expectedLifecycle) {
  fail(`Unerwarteter prepublishOnly-Vertrag: ${lifecycle || '<leer>'}`);
}
if (pkg.scripts?.['publish:check'] !== 'node scripts/verify-release-artifact.js') {
  fail('publish:check verweist nicht auf die read-only Artefaktprüfung.');
}

console.log(`[release-artifact] OK: ${pkg.name}@${pkg.version}, ${manifest.files.length} geprüfte Paketdateien, Produkt-Runtime unverändert.`);
console.log('[release-artifact] OK: Keine Installation oder Aktualisierung von npm/TypeScript erforderlich.');
