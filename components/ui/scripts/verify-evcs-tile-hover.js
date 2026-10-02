#!/usr/bin/env node
/**
 * NexoWatt 0.8.73 Regressionstest: EVCS-Kacheln dürfen beim Hover nicht grün
 * blinken. Die grüne Umrandung ist ein Ladezustand (`nw-tile--state-on`) und
 * darf nicht durch allgemeine `.nw-tile:hover`-Regeln entstehen.
 */
const fs = require('fs');
const css = fs.readFileSync('www/styles.css', 'utf8');
const required = [
  'body.nw-page-evcs #evcsList .nw-tile:not(.nw-tile--state-on):hover',
  'border-color:rgba(255,255,255,.075) !important',
  'body.nw-page-evcs #evcsList .nw-tile.nw-tile--state-on',
  'border-color:rgba(0,230,118,.86) !important',
  'transform:none !important'
];
const missing = required.filter((needle) => !css.includes(needle));
if (missing.length) {
  console.error('[evcs-tile-hover] Fehlende CSS-Regeln:', missing.join(' | '));
  process.exit(1);
}
console.log('[evcs-tile-hover] OK: Hover bleibt passiv; grüne Umrandung nur bei aktiver Ladung.');
