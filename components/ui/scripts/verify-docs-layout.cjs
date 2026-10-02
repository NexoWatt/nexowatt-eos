#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const skipped = new Set(['node_modules', '.git', 'build', 'build-ts', 'build-types', '.cache', 'coverage']);
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.md$/i.test(entry.name)) {
      count++;
      assert.ok(path.relative(root, file).startsWith('docs' + path.sep), `Markdown outside docs: ${file}`);
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\]\(([^\s)]+)\)/g)) {
        const target = match[1].split('#')[0].split('?')[0];
        if (!target || /^(?:[\w+.-]+:|\/)/.test(target)) continue;
        assert.ok(fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target))), `Broken link: ${path.relative(root, file)} -> ${target}`);
      }
    }
  }
}
walk(root);
const pkg = require('../package.json');
for (const file of pkg.files.filter(file => /\.md$/i.test(file))) {
  assert.ok(file.startsWith('docs/'), file);
  assert.ok(fs.existsSync(path.join(root, file)), file);
}
assert.equal(require('../io-package.json').common.readme, 'https://github.com/NexoWatt/NexoWatt-ui/blob/main/docs/README.md');
console.log(`[docs-layout] OK: ${count} Markdown files under docs, local links and package paths valid.`);
