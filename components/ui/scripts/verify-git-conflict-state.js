#!/usr/bin/env node
/**
 * Datei: scripts/verify-git-conflict-state.js
 *
 * Zweck:
 * Prüft den lokalen Git-Arbeitsbaum auf ungelöste Merge-Konflikte.
 *
 * Zusammenhang:
 * Dieses Skript ist kein Adapter-Runtime-Code. Es schützt die Entwicklung und den
 * GitHub-Upload davor, dass Konfliktmarker oder unmerged files in das Repository
 * committed werden. Genau das blockiert sonst `git commit` und später auch CI.
 *
 * Wichtig:
 * - Wenn kein `.git`-Ordner vorhanden ist, beendet sich das Skript erfolgreich.
 *   Ein entpacktes npm-/ZIP-Paket soll dadurch nicht fehlschlagen.
 * - Konfliktmarker werden nur erkannt, wenn sie am Zeilenanfang stehen. Dadurch
 *   wird absichtlich kein normaler String/RegEx im Code als Konflikt behandelt.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const gitDir = path.join(root, '.git');
const conflictMarkerRe = /^(<<<<<<<|=======|>>>>>>>)(\s|$)/;
const skipDirs = new Set(['.git', 'node_modules', 'build-ts', 'dist', '.cache']);
const skipExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.zip', '.tgz', '.gz', '.br', '.pdf', '.woff', '.woff2', '.map']);
let failed = false;

/**
 * Code-Teil: fail
 * Zweck: Meldet einen Konflikt als Fehler und setzt den Exit-Code.
 * Zusammenhang: Wird sowohl für Git-Index-Konflikte als auch für echte Marker
 * in Dateien genutzt. Der Prozess läuft weiter, damit mehrere Fehler sichtbar werden.
 */
function fail(message) {
  failed = true;
  console.error(`[git-conflicts] ERROR: ${message}`);
}

/**
 * Code-Teil: walk
 * Zweck: Sammelt alle prüfbaren Textdateien im Projekt.
 * Zusammenhang: Wir schließen Build-/Dependency-/Binärordner aus, damit die Prüfung
 * schnell bleibt und keine generierten oder binären Dateien gelesen werden.
 */
function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_err) { return out; }
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && !skipExt.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

/**
 * Code-Teil: checkGitUnmergedFiles
 * Zweck: Fragt Git nach Dateien mit ungelöstem Merge-Status.
 * Zusammenhang: Genau dieser Zustand erzeugt die Meldung
 * `Committing is not possible because you have unmerged files`.
 */
function checkGitUnmergedFiles() {
  if (!fs.existsSync(gitDir)) return;
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    // Git ist optional. Wenn Git nicht vorhanden ist, soll ein entpacktes Paket
    // nicht scheitern. In einem echten Repo sieht der Entwickler die Warnung.
    console.warn('[git-conflicts] WARN: Git konnte nicht geprüft werden.');
    return;
  }
  const files = String(result.stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (const file of files) fail(`ungelöste Git-Konfliktdatei: ${file}`);
}

/**
 * Code-Teil: checkConflictMarkers
 * Zweck: Sucht echte Konfliktmarker direkt in Textdateien.
 * Zusammenhang: Selbst wenn der Git-Index schon bereinigt wurde, dürfen Marker wie
 * `<<<<<<< HEAD` nicht im Code zurückbleiben.
 */
function checkConflictMarkers() {
  for (const file of walk(root)) {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch (_err) { continue; }
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (conflictMarkerRe.test(lines[i])) {
        fail(`${rel}:${i + 1} enthält Konfliktmarker: ${lines[i].slice(0, 80)}`);
        break;
      }
    }
  }
}

checkGitUnmergedFiles();
checkConflictMarkers();

if (failed) {
  process.exitCode = 1;
} else {
  console.log('[git-conflicts] OK: keine ungelösten Git-Konflikte erkannt.');
}
