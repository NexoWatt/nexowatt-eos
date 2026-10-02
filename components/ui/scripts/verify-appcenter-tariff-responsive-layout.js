#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');

assert(html.includes('nw-config-card--full nw-tariff-provider-card'), 'Tariff provider must be a dedicated full-width card');
assert(html.includes('nw-tariff-provider-layout'), 'Tariff provider layout wrapper missing');
assert(css.includes('#mappingGrid > .nw-tariff-provider-card'), 'Tariff full-width grid rule missing');
assert(css.includes('grid-column: 1 / -1 !important'), 'Tariff card must span full grid width');
assert(css.includes('height: auto !important'), 'Tariff card must grow with content');
assert(css.includes('max-height: none !important'), 'Tariff card max-height must not clip content');
assert(css.includes('overflow: visible !important'), 'Tariff form may not be clipped');
assert(css.includes('@media (max-width: 1024px)'), 'Tablet breakpoint missing');
assert(css.includes('@media (max-width: 520px)'), 'Phone breakpoint missing');
assert(css.includes('grid-template-columns: 1fr'), 'Responsive one-column fallback missing');

console.log('[appcenter-tariff-responsive-layout] OK: tariff provider card is full-width, auto-growing and responsive.');
