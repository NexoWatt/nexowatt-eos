#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const quarantine = path.join(root, '.nexowatt-release-local');
const manifestPath = path.join(quarantine, 'manifest.json');

function rootMarkdownExtras() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => path.extname(name).toLowerCase() === '.md' && name !== 'README.md')
    .sort();
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) return [];
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.files)) {
    throw new Error('ungültiges Quarantäne-Manifest');
  }
  return data.files.map((name) => String(name));
}

function restore() {
  if (!fs.existsSync(manifestPath)) return 0;
  const files = readManifest();
  for (const name of files) {
    const source = path.join(quarantine, name);
    const target = path.join(root, name);
    if (!fs.existsSync(source)) continue;
    if (fs.existsSync(target)) {
      throw new Error(`Wiederherstellung blockiert: ${name} existiert bereits im Projektstamm`);
    }
    fs.renameSync(source, target);
  }
  fs.rmSync(manifestPath, { force: true });
  try { fs.rmdirSync(quarantine); } catch { /* directory may contain a manual recovery file */ }
  if (files.length) console.log(`Release-Sanitizer: ${files.length} lokale Markdown-Datei(en) wiederhergestellt`);
  return files.length;
}

function prepare() {
  // Recover a previous interrupted pack before creating a fresh quarantine.
  restore();
  const files = rootMarkdownExtras();
  if (!files.length) {
    console.log('Release-Sanitizer: keine zusätzlichen Stamm-Markdown-Dateien');
    return 0;
  }

  fs.mkdirSync(quarantine, { recursive: true });
  for (const name of files) {
    fs.renameSync(path.join(root, name), path.join(quarantine, name));
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`);
  console.log(`Release-Sanitizer: ${files.length} lokale Markdown-Datei(en) nur für den Packvorgang ausgeblendet`);
  return files.length;
}

function main() {
  const action = process.argv[2];
  try {
    if (action === 'prepare') prepare();
    else if (action === 'restore' || action === 'recover') restore();
    else throw new Error('Aufruf: node scripts/package-sanitize.cjs prepare|restore|recover');
  } catch (error) {
    console.error(`Release-Sanitizer ABBRUCH: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { prepare, restore, rootMarkdownExtras };
