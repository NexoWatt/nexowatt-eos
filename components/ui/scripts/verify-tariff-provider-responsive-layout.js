#!/usr/bin/env node
'use strict';

/** Dynamic tariff provider form must occupy a full, auto-growing responsive AppCenter row. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert.match(html, /nw-config-card--full nw-tariff-provider-card/);
assert.match(html, /nw-tariff-provider-layout/);
assert.match(html, /nw-tariff-provider-grid--provider/);
assert.match(html, /nw-tariff-provider-grid--market/);
assert.match(html, /nw-tariff-provider-checks/);
assert.match(html, /nw-tariff-provider-actions/);
assert.match(css, /\.nw-tariff-provider-card\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/);
assert.match(css, /\.nw-tariff-provider-card[\s\S]*height:\s*auto\s*!important/);
assert.match(css, /#mappingGrid\s*\{[\s\S]*grid-auto-rows:\s*max-content/);
assert.match(css, /overflow:\s*visible\s*!important/);
assert.match(css, /@media \(max-width:\s*1024px\)/);
assert.match(css, /@media \(max-width:\s*520px\)/);
assert.match(css, /grid-template-columns:\s*repeat\(auto-fit/);
assert.match(css, /overflow-wrap:\s*anywhere/);

console.log('[tariff-provider-responsive-layout] OK: tariff provider card is full-width, auto-height and responsive without overflowing neighbouring cards.');
