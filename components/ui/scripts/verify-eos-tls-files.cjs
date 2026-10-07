'use strict';
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Root-Dateischutz des unveränderten ausgelieferten TLS-Lesers wirklich prüfen.
 * Daten und Wirkung: Nur ein eigenes zufälliges temporäres Verzeichnis mit
 * ephemeren Zertifikaten; keine Produktpfade, Dienste oder Eigentümeränderungen.
 * Bei Änderungen: Als UID 0 separat starten. HTTP-/Adaptertests bleiben ohne Root.
 * Fehlender Root-Kontext ist ein Fehler, kein Skip und keine Eigentümersimulation.
 * Verknüpfung: docs/security/EOS_UI_INTEGRATED_DE.md
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const integrated = require('../lib/eos-integrated.js');
const tls = require('./eos-tls-fixture.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('UI-TLS-FILES: real root-owned key is readable and test requires the correct UID', () => {
  assert.equal(process.getuid?.(), 0, 'run this isolated file test as root, not the HTTP suite');
  assert.equal(fs.lstatSync(tls.directory).uid, 0);
  assert.equal(fs.lstatSync(tls.keyPath).uid, 0);
  // Compare hashes so a failed assertion cannot print even the ephemeral key.
  assert.equal(digest(integrated.readProtectedFile(tls.keyPath, true, tls.directory)), digest(tls.key));
});

test('UI-TLS-FILES: public key permissions, writable directory, symlink and hardlink are rejected', () => {
  assert.equal(process.getuid?.(), 0);
  fs.chmodSync(tls.keyPath, 0o644);
  try { assert.throws(() => integrated.readProtectedFile(tls.keyPath, true, tls.directory), /EOS_TLS_FILE/); }
  finally { fs.chmodSync(tls.keyPath, 0o600); }
  for (const create of [fs.symlinkSync, fs.linkSync]) {
    const link = path.join(tls.directory, 'link.key'); create(tls.keyPath, link);
    try { assert.throws(() => integrated.readProtectedFile(link, true, tls.directory)); }
    finally { fs.unlinkSync(link); }
  }
  fs.chmodSync(tls.directory, 0o777);
  try { assert.throws(() => integrated.readProtectedFile(tls.keyPath, true, tls.directory), /EOS_TLS_DIRECTORY/); }
  finally { fs.chmodSync(tls.directory, 0o700); }
  assert.equal(digest(integrated.readProtectedFile(tls.keyPath, true, tls.directory)), digest(tls.key));
});
