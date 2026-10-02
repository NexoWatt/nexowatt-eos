#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www', 'styles.css'), 'utf8');
const required = ['_openShadowJsonDialog', 'nw-shadow-json-dialog', '_shadowStatusLabel', 'nw-shadow-badge--wait'];
const missing = required.filter((x) => !app.includes(x) && !css.includes(x));
if (missing.length) { console.error('[shadow-json-ui] Missing markers: ' + missing.join(', ')); process.exit(1); }
if (app.includes('<summary>JSON anzeigen</summary>')) { console.error('[shadow-json-ui] Old details JSON viewer still present.'); process.exit(1); }
console.log('[shadow-json-ui] OK');
