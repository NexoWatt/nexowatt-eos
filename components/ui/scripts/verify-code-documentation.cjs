#!/usr/bin/env node
'use strict';
/**
 * Release-Sperre für fehlende oder veraltete Quellcode-Dokumentation.
 * Vergleicht Dateimenge, deutsche Modulkommentare, Quell- und Dokument-Hashes.
 * Dies prüft die Pflege technisch; die fachliche Richtigkeit bleibt Review-Aufgabe.
 */
const fs = require('node:fs');
const path = require('node:path');
const model = require('./code-documentation-model.cjs');
function verify(root) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const manifest = JSON.parse(read('docs/code-documentation-manifest.json'));
  const files = model.sources(root);
  if (manifest.schema !== 1 || JSON.stringify(files) !== JSON.stringify(manifest.sources.map(entry => entry.path))) throw new Error('Quelldateien neu/entfernt: Modulkommentare prüfen und npm run docs:build ausführen.');
  const expectedDocuments = [...files.map(model.documentPath), 'docs/QUELLCODE_VERKNUEPFUNGEN_DE.md'].sort();
  if (!Array.isArray(manifest.documents) || JSON.stringify(manifest.documents.map(entry => entry.path).sort()) !== JSON.stringify(expectedDocuments)) throw new Error('Dokumentationsmanifest unvollständig: npm run docs:build ausführen.');
  for (const entry of manifest.sources) {
    const text = read(entry.path), fields = model.description(text);
    if (Object.values(fields).some(value => value.length < 20)) throw new Error('Deutsche Modulbeschreibung unvollständig: ' + entry.path);
    if (model.hash(text) !== entry.sourceHash) throw new Error('Quelle geändert; Kommentare fachlich prüfen, dann npm run docs:build: ' + entry.path);
  }
  for (const entry of manifest.documents) {
    if (model.hash(read(entry.path)) !== entry.hash) throw new Error('Generierte Verknüpfungsübersicht fehlt/ist verändert: ' + entry.path);
  }
  return files.length;
}
if (require.main === module) { try { console.log(`[code-docs] OK: ${verify(path.resolve(__dirname, '..'))} deutsche Modulbeschreibungen und Quellverknüpfungen synchron.`); } catch (error) { console.error('[code-docs] ' + error.message); process.exitCode = 1; } }
module.exports = { verify };
