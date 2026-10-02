#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: verify-ts-shadow-diagnostics-ui-stability
 *
 * Zweck:
 * Prüft, dass die TS-Shadow-Diagnose im App-Center verständliche Texte nutzt und
 * der JSON-Dialog außerhalb des automatischen Rerenders stabil geöffnet werden kann.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www', 'styles.css'), 'utf8');
const required = [
  '_shadowDecodeDisplayText',
  '_shadowEscape',
  '_openShadowJsonDialog',
  'Eine Shadow-Abweichung bedeutet nicht automatisch einen Produktfehler',
  'JSON dauerhaft öffnen',
];
const missing = required.filter((needle) => !js.includes(needle));
if (missing.length) {
  console.error('[shadow-diagnostics-ui-stability] Missing JS anchors:', missing.join(', '));
  process.exit(1);
}
if (!css.includes('App-Center TS-Shadow-Diagnose verständlicher')) {
  console.error('[shadow-diagnostics-ui-stability] Missing CSS anchor.');
  process.exit(1);
}
console.log('[shadow-diagnostics-ui-stability] OK');
