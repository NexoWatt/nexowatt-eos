#!/usr/bin/env node
'use strict';
/** Prüft, dass veraltete/fehlende Dokumentation den Release tatsächlich sperrt. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verify } = require('./verify-code-documentation.cjs');
const { hash } = require('./code-documentation-model.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-code-docs-'));
const source = '/**\n * NexoWatt Quellcode-Erklärung (DE)\n * Aufgabe: Dokumentationsprüfung mit isolierter Testquelle.\n * Daten und Wirkung: Keine Hardware, nur eine konstante Rückgabe.\n * Bei Änderungen: Kommentare und Dokumentation gemeinsam prüfen.\n */\nexport const answer = () => 42;\n';
function write(file, text) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); }
function reset() {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'src-admin-tab/src'), { recursive: true });
  write('src-ts/example.ts', source);
  write('docs/quellcode/src-ts/example.md', '# Testquelle\n');
  write('docs/QUELLCODE_VERKNUEPFUNGEN_DE.md', '# Index\n');
  const manifest = { schema: 1, sources: [{ path: 'src-ts/example.ts', sourceHash: hash(source) }], documents: [
    { path: 'docs/quellcode/src-ts/example.md', hash: hash('# Testquelle\n') },
    { path: 'docs/QUELLCODE_VERKNUEPFUNGEN_DE.md', hash: hash('# Index\n') }
  ] };
  write('docs/code-documentation-manifest.json', JSON.stringify(manifest));
  return manifest;
}
try {
  reset(); assert.equal(verify(root), 1);
  write('src-ts/example.ts', source.replace('42', '43'));
  assert.throws(() => verify(root), /Quelle geändert/);
  reset(); write('src-ts/new.ts', source);
  assert.throws(() => verify(root), /Quelldateien neu/);
  let manifest = reset(); write('src-ts/example.ts', 'export const answer = 42;');
  manifest.sources[0].sourceHash = hash('export const answer = 42;');
  write('docs/code-documentation-manifest.json', JSON.stringify(manifest));
  assert.throws(() => verify(root), /Modulbeschreibung unvollständig/);
  reset(); write('docs/quellcode/src-ts/example.md', '# Veraltet\n');
  assert.throws(() => verify(root), /Verknüpfungsübersicht/);
  manifest = reset(); manifest.documents = [];
  write('docs/code-documentation-manifest.json', JSON.stringify(manifest));
  assert.throws(() => verify(root), /Dokumentationsmanifest unvollständig/);
  reset(); fs.rmSync(path.join(root, 'docs/quellcode/src-ts/example.md'));
  assert.throws(() => verify(root), /ENOENT/);
  console.log('[stable-1.0.11] Dokumentationsprüfung: gültiger Stand sowie sechs Fehlerfälle bestanden.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
