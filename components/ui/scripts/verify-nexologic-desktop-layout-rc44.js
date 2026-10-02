#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/logic.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');
const logic = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/logic.ts'), 'utf8');

assert.match(html, /<body class="[^"]*nw-page-logic/);
assert.match(html, /<main class="[^"]*nw-logic-page/);
assert.doesNotMatch(html, /nw-page-hero/);
assert.match(css, /body\.nw-page-logic\{[\s\S]*?min-width:1180px;[\s\S]*?overflow-y:scroll !important;/);
assert.match(css, /body\.nw-page-logic \.nw-logic-page\{[\s\S]*?max-width:none !important;[\s\S]*?display:flex;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*?min-height:620px;/);
assert.match(css, /body\.nw-page-logic \.nw-le\{[\s\S]*?grid-template-columns:/);
assert.match(css, /body\.nw-page-logic \.nw-le__board-wrap\{[\s\S]*?overflow:scroll !important;/);
assert.match(css, /@media \(max-width:1199px\)[\s\S]*min-width:1180px/);
assert.match(logic, /function nwSyncLogicViewportMetrics\(\)/);
assert.match(logic, /--nw-logic-topbar-h/);

console.log('[nexologic-desktop-layout-rc44] OK: NexoLogic nutzt den vollständigen Desktop-Arbeitsbereich mit sichtbarer Seiten-/Canvas-Scrollbarkeit und unabhängigen Seitenleisten.');
