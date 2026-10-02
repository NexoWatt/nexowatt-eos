#!/usr/bin/env node
'use strict';
/** Regression für ZIP-Überkopieren und Publish-Vorbereitung. Prüft echte
 * Dateien/Prozesse mit isolierten Artefaktmanifesten; keine Netzveröffentlichung.
 * Alte Bundles müssen gesichert werden, aktuelle Builds und Geheimnisse dürfen
 * niemals durch eine automatische Bereinigung verdeckt oder verändert werden. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { prepare } = require('./prepare-release-assets.cjs');
const guard = require('./check-repository-secrets.cjs');
const repository = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-publish-upgrade-'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
let cases = 0;

/** Jeder Fall hat seinen eigenen Windows-tauglichen Pfad mit Leerzeichen und
 * Unicode sowie eine separate Sicherung. Manifest bildet einen gültigen Build ab. */
function fixture() {
  const folder = path.join(temporary, String(++cases));
  const root = path.join(folder, 'Projekt ä Windows Pfad');
  const backupBase = path.join(folder, 'backups');
  fs.mkdirSync(backupBase, { recursive: true });
  const write = (name, data) => {
    const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data);
  };
  const read = name => fs.readFileSync(path.join(root, name));
  const exists = name => fs.existsSync(path.join(root, name));
  const files = ['admin/react/index.html', 'admin/react/assets/index-current.js', 'admin/react/assets/index-current.css'];
  write(files[0], '<script src="./assets/index-current.js"></script><link href="./assets/index-current.css">');
  write(files[1], 'window.nexowattBuild = true;');
  write(files[2], 'body { color: white; }');
  const seal = () => {
    write('package.json', JSON.stringify({ name: pkg.name, version: pkg.version, files, scripts: pkg.scripts }));
    write('io-package.json', JSON.stringify({ common: { version: pkg.version } }));
    write('scripts/release-artifact-manifest.json', JSON.stringify({ schema: 'nexowatt.release-artifact.v1', package: pkg.name, version: pkg.version,
      files: files.map(name => ({ path: name, size: read(name).length, sha256: hash(read(name)) })) }));
  };
  seal();
  const run = () => prepare(root, { backupBase });
  return { root, backupBase, write, read, exists, files, seal, run };
}

try {
  let f = fixture();
  assert.deepEqual(f.run(), { moved: [], backupDirectory: null });
  assert.equal(fs.readdirSync(f.backupBase).length, 0, 'clean release creates no backup');

  f = fixture();
  const oldJs = 'admin/react/assets/index-previous.js', oldCss = 'admin/react/assets/index-previous.css';
  f.write(oldJs, 'window.previousBuild = true;'); f.write(oldCss, 'body { color: blue; }');
  f.write('admin/react/assets/logo.svg', '<svg/>'); f.write('www/customer-settings.json', '{}');
  const originals = new Map(f.files.map(name => [name, hash(f.read(name))]));
  const result = f.run();
  assert.deepEqual(result.moved.sort(), [oldCss, oldJs]);
  const restore = JSON.parse(fs.readFileSync(path.join(result.backupDirectory, 'restore.json')));
  for (const entry of restore.files) {
    assert.equal(hash(fs.readFileSync(path.join(result.backupDirectory, entry.backup))), entry.sha256);
    assert.equal(f.exists(entry.original), false);
  }
  assert.ok(f.exists('admin/react/assets/logo.svg')); assert.ok(f.exists('www/customer-settings.json'));
  for (const [name, digest] of originals) assert.equal(hash(f.read(name)), digest, 'current artifact preserved');
  assert.deepEqual(f.run(), { moved: [], backupDirectory: null }, 'repeated prepare is harmless');
  assert.deepEqual(guard.checkRepository(f.root).findings, []);

  f = fixture();
  f.write('admin/react/assets/index-current.js', 'import("./index-lazy.js");');
  f.write('admin/react/assets/index-lazy.js', 'import("./index-nested.js");');
  f.write('admin/react/assets/index-nested.js', 'window.nested = true;');
  f.seal(); f.write(oldJs, 'window.old = true;');
  assert.deepEqual(f.run().moved, [oldJs]);
  assert.ok(f.exists('admin/react/assets/index-lazy.js')); assert.ok(f.exists('admin/react/assets/index-nested.js'));

  f = fixture();
  f.files.push('admin/react/assets/index-declared.js');
  f.write('admin/react/assets/index-declared.js', 'window.declared = true;'); f.seal();
  f.write(oldJs, 'window.old = true;');
  assert.deepEqual(f.run().moved, [oldJs]); assert.ok(f.exists('admin/react/assets/index-declared.js'));

  f = fixture(); f.write(oldJs, 'window.old = true;');
  f.write('admin/react/assets/index-current.js', 'window.currentWasEdited = true;');
  assert.throws(f.run, /Aktueller Admin-Build verändert/); assert.ok(f.exists(oldJs));
  assert.equal(fs.readdirSync(f.backupBase).length, 0);

  f = fixture(); f.write(oldJs, 'window.old = true;');
  fs.unlinkSync(path.join(f.root, 'admin/react/assets/index-current.js'));
  assert.throws(f.run); assert.ok(f.exists(oldJs));

  f = fixture(); f.write(oldJs, 'window.old = true;');
  f.write('scripts/release-artifact-manifest.json', '{');
  assert.throws(f.run); assert.ok(f.exists(oldJs));

  // Fresh random fixture values never enter tracked source or diagnostics.
  for (const location of [oldJs, 'admin/react/assets/index-current.js', 'mail-config.js']) {
    f = fixture(); f.write(oldJs, 'window.old = true;');
    const secret = crypto.randomBytes(32).toString('hex');
    f.write(location, JSON.stringify({ host: 'smtp.example.invalid', password: secret }));
    for (const script of ['prepare-release-assets.cjs', 'check-repository-secrets.cjs']) {
      f.write('scripts/' + script, fs.readFileSync(path.join(repository, 'scripts', script)));
    }
    const run = spawnSync(process.execPath, ['scripts/prepare-release-assets.cjs'], { cwd: f.root, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stdout + run.stderr, /literal-smtp-password/);
    assert.equal((run.stdout + run.stderr).includes(secret), false, 'secret never printed');
    assert.ok(f.exists(oldJs), 'even old file with secret must remain for remediation');
  }

  f = fixture(); f.write(oldJs, 'window.old = true;'); f.write('notification-mail.json', '{}');
  const originalError = console.error, messages = [];
  try {
    console.error = message => messages.push(message);
    assert.throws(f.run, /Sicherheitsprüfung blockiert/);
  } finally { console.error = originalError; }
  assert.ok(messages.some(message => message.includes('installation-data-or-private-key')));
  assert.ok(f.exists(oldJs));

  f = fixture(); f.write(oldJs, 'window.old = true;');
  fs.symlinkSync(f.backupBase, path.join(f.root, 'admin/react/assets/linked-directory'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(f.run, /Unsupported repository entry/); assert.ok(f.exists(oldJs));

  f = fixture(); f.write(oldJs, 'window.old = true;'); f.write(oldCss, 'body {}');
  const originalWrite = fs.writeFileSync;
  try {
    fs.writeFileSync = (file, ...args) => {
      if (String(file).startsWith(f.backupBase) && String(file).endsWith('restore.json')) throw new Error('Simulierter Schreibfehler');
      return originalWrite(file, ...args);
    };
    assert.throws(f.run, /Vorbereitung abgebrochen/);
  } finally { fs.writeFileSync = originalWrite; }
  assert.ok(f.exists(oldJs)); assert.ok(f.exists(oldCss), 'all originals survive incomplete backup');

  f = fixture(); f.write(oldJs, 'window.old = true;');
  assert.throws(() => prepare(f.root, { backupBase: f.root }), /außerhalb/); assert.ok(f.exists(oldJs));

  // The real read-only gate fails on overlay leftovers and succeeds after the
  // supported preparation step. It never silently deletes or rebuilds anything.
  f = fixture(); f.write(oldJs, 'window.old = true;');
  for (const script of ['check-repository-secrets.cjs', 'verify-release-artifact.js']) {
    f.write('scripts/' + script, fs.readFileSync(path.join(repository, 'scripts', script)));
  }
  const verify = () => spawnSync(process.execPath, ['scripts/verify-release-artifact.js'], { cwd: f.root, encoding: 'utf8' });
  let checked = verify();
  assert.notEqual(checked.status, 0); assert.ok(f.exists(oldJs));
  assert.match(checked.stdout + checked.stderr, /release:prepare/);
  assert.doesNotMatch(checked.stdout + checked.stderr, /value redacted/);
  f.run(); checked = verify();
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);

  assert.equal(pkg.scripts['release:prepare'], 'node scripts/prepare-release-assets.cjs');
  assert.match(pkg.scripts.prepublishOnly, /release:check-version-free && npm run release:prepare && npm run publish:check/);
  assert.ok(pkg.files.includes('scripts/prepare-release-assets.cjs'));
  assert.ok(pkg.scripts['test:all'].includes('test:stable-1.0.12-publish'));
  console.log(`[stable-1.0.12] OK: ${cases} Upgrade-/Sicherheitsfälle, Sicherungen, indirekte Chunks, Wiederholung, echter Artefakt-Guard und Publish-Vertrag.`);
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
