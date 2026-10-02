#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/verify-npm-registry-version.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function must(needle, msg) { if (!script.includes(needle)) { console.error('[npm-release-guard] FEHLER:', msg || needle); process.exit(1); } }
must('npm', 'npm view wird genutzt');
must('versions', 'Versionen werden aus Registry gelesen');
must('ETARGET', 'ETARGET-Kontext ist dokumentiert');
must('NEXOWATT_NPM_PACKAGE', 'Paketname kann überschrieben werden');
if (!pkg.scripts || !String(pkg.scripts['release:verify-npm'] || '').includes('verify-npm-registry-version.js')) {
  console.error('[npm-release-guard] FEHLER: package.json Script release:verify-npm fehlt.');
  process.exit(1);
}
console.log('[npm-release-guard] OK: npm Registry Release Guard vorhanden.');
