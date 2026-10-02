#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('src-ts/runtime-executables/www/logic.ts');
const runtime = read('www/logic.js');
const html = read('www/logic.html');
const css = read('www/styles.css');

for (const text of [source, runtime]) {
  assert.match(text, /const byType = nwLE\.lib && nwLE\.lib\.byType/);
  assert.doesNotMatch(text, /nwLE\.library\.byType/);
  assert.match(text, /d\.addEventListener\('mousedown',[\s\S]*nwStartConnect\(node\.id, p\.key\)/);
  assert.match(text, /d\.addEventListener\('click',[\s\S]*nwFinishConnect\(node\.id, p\.key\)/);
  assert.match(text, /d\.addEventListener\('mouseup',[\s\S]*nwFinishConnect\(node\.id, p\.key\)/);
  assert.match(text, /nwApplyConnectVisualState\(\)/);
  assert.match(text, /nwWouldCreateLogicCycle/);
}

assert.match(html, /Ausgang \(rechts\) anklicken oder ziehen/);
assert.match(css, /body\.nw-page-logic \.nw-le\{/);
assert.match(css, /grid-template-columns:\s*minmax\(225px,\s*265px\)\s+minmax\((?:680|720)px,\s*1fr\)\s+minmax\(270px,\s*330px\)/);
assert.match(css, /\.nw-le-port\.is-connect-target/);
assert.match(css, /\.nw-le-port\.is-connect-incompatible/);

console.log('[nexologic-editor-connection-rc44] OK: port lookup, click/drag connection and desktop workspace contract are present.');
