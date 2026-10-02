#!/usr/bin/env node
'use strict';
/**
 * Dokumentationsmodell: Erfasst selbst gepflegte TypeScript- und React-Quellen.
 * Die Liste schließt generierte Spiegel, Testfixtures und Typ-Testdateien aus.
 * Gemeinsame Basis für Erzeugung und Release-Prüfung; benötigt keine npm-Pakete.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const roots = ['src-ts', 'src-admin-tab/src'];
const excluded = new Set(['runtime-mirrors', 'tests', 'test-fixtures', 'quality']);
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function sources(root) {
  const out = [];
  function walk(relative) {
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = relative + '/' + item.name;
      if (item.isDirectory() && !excluded.has(item.name)) walk(name);
      else if (item.isFile() && /\.tsx?$/.test(item.name) && !/\.d\.ts$/.test(item.name)) out.push(name);
    }
  }
  for (const directory of roots) walk(directory);
  return out.sort();
}
function description(text) {
  const block = /\/\*\*\s*\n \* NexoWatt Quellcode-Erklärung \(DE\)[\s\S]*?\*\//.exec(text)?.[0] || '';
  const field = key => new RegExp('\\* ' + key + ': ([^\\n]+)').exec(block)?.[1].trim() || '';
  return { purpose: field('Aufgabe'), data: field('Daten und Wirkung'), maintenance: field('Bei Änderungen') };
}
function documentPath(source) { return 'docs/quellcode/' + source.replace(/\.tsx?$/, '.md'); }
module.exports = { roots, sources, description, documentPath, hash };
