#!/usr/bin/env node
'use strict';
/**
 * Bereitet überkopierte Repository-Releases ohne Neuaufbau der Laufzeit vor.
 * Der Secret-Guard prüft zuerst den gesamten Arbeitsbaum. Nur unbenutzte,
 * nicht veröffentlichte index-*.js/css aus admin/react/assets werden anschließend
 * außerhalb des Projekts gesichert und aus dem Build-Verzeichnis entfernt.
 * HTML, aktuelle Assets, Quellen, Kundendaten und Git-Index bleiben unverändert.
 * Verknüpfung: prepublishOnly -> release:prepare -> publish:check; npm publish
 * prüft danach weiterhin das vollständige, unveränderliche Artefaktmanifest.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const guard = require('./check-repository-secrets.cjs');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
class PreparationError extends Error {}
const stop = message => { throw new PreparationError(message); };

/** Prüft veröffentlichte Admin-Dateien gegen das versiegelte Manifest. Bei
 * gemischten oder veränderten aktuellen Builds darf nichts bereinigt werden. */
function currentBuild(root) {
  const packageBytes = fs.readFileSync(path.join(root, 'package.json'));
  const manifestBytes = fs.readFileSync(path.join(root, 'scripts/release-artifact-manifest.json'));
  const pkg = JSON.parse(packageBytes);
  const manifest = JSON.parse(manifestBytes);
  if (pkg.name !== 'iobroker.nexowatt-ui' || manifest.package !== pkg.name
      || manifest.version !== pkg.version || manifest.schema !== 'nexowatt.release-artifact.v1'
      || !Array.isArray(pkg.files) || !Array.isArray(manifest.files)) {
    stop('Release-Metadaten passen nicht zusammen; keine Admin-Dateien bereinigt.');
  }
  const declared = pkg.files.filter(name => typeof name === 'string' && name.startsWith('admin/react/')).sort();
  const entries = manifest.files.filter(entry => typeof entry.path === 'string' && entry.path.startsWith('admin/react/'));
  if (!declared.includes('admin/react/index.html') || !declared.some(name => /\/assets\/.*\.js$/.test(name))
      || new Set(declared).size !== declared.length
      || JSON.stringify(declared) !== JSON.stringify(entries.map(entry => entry.path).sort())) {
    stop('Aktuelle Admin-Dateiliste ist unvollständig oder widersprüchlich; keine Bereinigung.');
  }
  const snapshot = [
    { name: 'package.json', digest: hash(packageBytes) },
    { name: 'scripts/release-artifact-manifest.json', digest: hash(manifestBytes) },
  ];
  for (const entry of entries) {
    if (entry.path.includes('\\') || entry.path.split('/').some(part => part === '..' || part === '.' || part === '')) {
      stop('Ungültiger Pfad im Admin-Artefaktmanifest; keine Bereinigung.');
    }
    const file = path.join(root, entry.path);
    if (!fs.lstatSync(file).isFile()) stop('Aktuelle Admin-Datei ist kein reguläres Build-Artefakt; keine Bereinigung.');
    const data = fs.readFileSync(file);
    if (data.length !== entry.size || hash(data) !== entry.sha256) {
      stop(`Aktueller Admin-Build verändert: ${entry.path}. Vollständigen Release verwenden; keine Bereinigung.`);
    }
    snapshot.push({ name: entry.path, digest: entry.sha256 });
  }
  return snapshot;
}

/** Erkennt gleichzeitige Builds/Änderungen zwischen Prüfung und Entfernung.
 * Eine bereits erstellte Sicherung wird bei Fehlern absichtlich beibehalten. */
function assertUnchanged(root, snapshot) {
  for (const entry of snapshot) {
    const file = path.join(root, entry.name);
    if (!fs.lstatSync(file).isFile() || hash(fs.readFileSync(file)) !== entry.digest) {
      stop('Dateien haben sich während der Vorbereitung geändert. Gleichzeitigen Build beenden und erneut prüfen.');
    }
  }
}

/** Gesamtablauf: Sicherheitsprüfung -> bestätigter aktueller Build -> vollständige
 * Sicherung -> erneuter Vergleich -> Entfernen ausschließlich alter Bundles.
 * backupBase ist nur für isolierte Tests injizierbar; niemals innerhalb root. */
function prepare(root, { backupBase = os.tmpdir() } = {}) {
  root = path.resolve(root);
  const result = guard.checkRepository(root);
  const blocked = result.findings.filter(entry => entry.rule !== 'obsolete-admin-entry-bundle');
  if (blocked.length) {
    guard.report({ files: result.files, findings: blocked });
    stop('Sicherheitsprüfung blockiert. Keine alten Bundles entfernt; Zugangsdatenfund zuerst beheben.');
  }
  const obsolete = result.findings.filter(entry => entry.rule === 'obsolete-admin-entry-bundle');
  if (!obsolete.length) return { moved: [], backupDirectory: null };
  const snapshot = currentBuild(root);
  const backups = obsolete.map(entry => {
    if (!/^admin\/react\/assets\/index-[\w-]+\.(?:js|css)$/.test(entry.file)) stop('Unzulässiger Bereinigungspfad.');
    const file = path.join(root, entry.file);
    if (!fs.lstatSync(file).isFile()) stop('Altes Bundle ist keine reguläre Datei; keine Bereinigung.');
    const data = fs.readFileSync(file);
    if (guard.inspectContent(entry.file, data).length) stop('Altes Bundle enthält einen Sicherheitsfund; keine Bereinigung.');
    return { name: entry.file, data, digest: hash(data) };
  });
  const relativeBackup = path.relative(root, path.resolve(backupBase));
  if (!relativeBackup || (!relativeBackup.startsWith('..' + path.sep) && relativeBackup !== '..' && !path.isAbsolute(relativeBackup))) {
    stop('Sicherung muss außerhalb des Repositorys liegen; keine Bereinigung.');
  }
  const backupDirectory = fs.mkdtempSync(path.join(path.resolve(backupBase), 'nexowatt-admin-assets-'));
  try {
    // copy + verify + unlink funktioniert auch bei getrennten Laufwerken unter
    // Windows. Zuerst ALLE Kopien bestätigen, erst danach Originale entfernen.
    for (const entry of backups) {
      const destination = path.join(backupDirectory, path.basename(entry.name));
      fs.writeFileSync(destination, entry.data, { flag: 'wx', mode: 0o600 });
      if (hash(fs.readFileSync(destination)) !== entry.digest) stop('Sicherung konnte nicht bestätigt werden.');
    }
    fs.writeFileSync(path.join(backupDirectory, 'restore.json'), JSON.stringify({
      project: root, createdAt: new Date().toISOString(),
      files: backups.map(entry => ({ original: entry.name, backup: path.basename(entry.name), sha256: entry.digest })),
    }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    assertUnchanged(root, [...snapshot, ...backups]);
    for (const entry of backups) fs.unlinkSync(path.join(root, entry.name));
  } catch (_) {
    // Keine ungefilterten Dateisystem-/Parserfehler ausgeben: Der Bericht darf
    // keine eingelesenen Daten enthalten. Geschriebene Sicherungen bleiben erhalten.
    stop(`Vorbereitung abgebrochen. Vorhandene Sicherungen bleiben unter ${backupDirectory}; Projekt erneut prüfen.`);
  }
  return { moved: backups.map(entry => entry.name), backupDirectory };
}

if (require.main === module) {
  try {
    if (process.argv.length > 2) stop('Aufruf ohne Zusatzparameter: npm run release:prepare');
    const result = prepare(path.resolve(__dirname, '..'));
    if (result.moved.length) {
      for (const name of result.moved) console.log(`[release-prepare] Altes Admin-Bundle gesichert: ${name}`);
      console.log(`[release-prepare] Sicherung: ${result.backupDirectory}`);
      console.log('[release-prepare] Bei Git-Verwendung Bereinigung vor dem Commit mit git add -u -- admin/react/assets übernehmen.');
    } else console.log('[release-prepare] OK: Keine alten Admin-Bundles; Sicherheitsprüfung erfolgreich.');
  } catch (error) {
    console.error('[release-prepare] BLOCKED: ' + (error instanceof PreparationError ? error.message : 'Repository oder Release-Artefakte nicht vollständig prüfbar; keine Freigabe.'));
    process.exitCode = 1;
  }
}
module.exports = { prepare };
