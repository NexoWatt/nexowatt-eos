#!/usr/bin/env node
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: scripts/bump-version.js
 * Rolle im Projekt: Build-/Wartungsskript.
 * Zweck: Hilfsskript für Versionierung, Publish-Prüfung, Hooks oder Sicherheit im Releaseprozess.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Wartungs-/Release-Skript für Versionierung, Prüfung oder Sicherheits-/Publish-Aufgaben.
 * Zusammenhänge:
 * - Wird über npm scripts oder Release-Prozess aufgerufen.
 * - Prüft bzw. verändert Metadaten, aber keine EMS-Laufzeitlogik.
 * Wartungshinweise:
 * - Skripte müssen auf Windows und Linux robust laufen.
 */

/*
  NexoWatt UI – version bump helper

  Updates all relevant adapter versions:
    - package.json.version
    - package-lock.json.version / packages[""].version
    - io-package.json.common.version
    - www/manifest.webmanifest.version / appVersion

  The deprecated top-level io-package.json.version is removed because
  ioBroker uses common.version and the publish check rejects the duplicate.

  Usage:
    node scripts/bump-version.js [patch|minor|major] [--dry-run] [--quiet]

  Notes:
    - Default bump type is "patch".
    - Keeps formatting stable (2-space JSON + trailing newline).
*/

const fs = require('fs');
const path = require('path');
/**
 * Code-Teil: readJson
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return { raw, json: JSON.parse(raw) };
}
/**
 * Code-Teil: writeJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function writeJson(filePath, obj) {
  const out = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(filePath, out, 'utf8');
}
/**
 * Code-Teil: parseSemver
 * Zweck: Parst Rohdaten in ein sicheres internes Format.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function parseSemver(v) {
  const s = String(v || '').trim();
  const m = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(s);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3])
  };
}
/**
 * Code-Teil: bumpSemver
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function bumpSemver(v, type) {
  const p = parseSemver(v);
  if (!p) {
    throw new Error(`Invalid version format: "${v}" (expected x.y.z)`);
  }
  const t = String(type || 'patch').toLowerCase();
  if (t === 'patch') return `${p.major}.${p.minor}.${p.patch + 1}`;
  if (t === 'minor') return `${p.major}.${p.minor + 1}.0`;
  if (t === 'major') return `${p.major + 1}.0.0`;
  throw new Error(`Unknown bump type: "${type}" (use patch|minor|major)`);
}
/**
 * Code-Teil: main
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function main() {
  const args = process.argv.slice(2);
  /**
   * Code-Teil: bumpType
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const bumpType = (args.find((a) => !a.startsWith('--')) || 'patch').toLowerCase();
  const dryRun = args.includes('--dry-run');
  const quiet = args.includes('--quiet');

  const root = path.join(__dirname, '..');
  const pkgPath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');
  const ioPath = path.join(root, 'io-package.json');
  const manifestPath = path.join(root, 'www', 'manifest.webmanifest');

  const pkg = readJson(pkgPath);
  const lock = fs.existsSync(lockPath) ? readJson(lockPath) : null;
  const io = readJson(ioPath);
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;

  const pkgVer = pkg.json && pkg.json.version ? String(pkg.json.version) : '';
  const ioVer = io.json && io.json.common && io.json.common.version ? String(io.json.common.version) : '';
  const ioTopVer = io.json && io.json.version ? String(io.json.version) : '';

  const current = pkgVer || ioVer || ioTopVer;
  if (!current) {
    throw new Error('Unable to detect current version (package.json.version / io-package.json.common.version).');
  }

  if (pkgVer && ioVer && pkgVer !== ioVer) {
    throw new Error(
      `Version mismatch: package.json=${pkgVer} vs io-package.json.common.version=${ioVer}. ` +
        'Please align them first (or fix manually) before bumping.'
    );
  }

  // Legacy packages may still contain a top-level version. It is not a
  // second source of truth and will be removed on every real bump.
  if (ioTopVer && ioVer && ioTopVer !== ioVer && !quiet) {
    console.warn(`[version] Ignoring deprecated io-package.json.version=${ioTopVer}; common.version=${ioVer} is authoritative.`);
  }

  const next = bumpSemver(current, bumpType);

  if (!quiet) {
    console.log(`[version] ${current} -> ${next}${dryRun ? ' (dry-run)' : ''}`);
  }

  if (dryRun) return;

  pkg.json.version = next;
  if (lock && lock.json && typeof lock.json === 'object') {
    // npm lockfileVersion 2/3 führt die Projektversion sowohl oben als auch im
    // Root-Paket. Beide Werte müssen mit package.json identisch bleiben, damit
    // ZIP-/Publish-Prüfungen keinen veralteten Release-Stand ausliefern.
    lock.json.version = next;
    lock.json.packages = lock.json.packages && typeof lock.json.packages === 'object' ? lock.json.packages : {};
    lock.json.packages[''] = lock.json.packages[''] && typeof lock.json.packages[''] === 'object' ? lock.json.packages[''] : {};
    lock.json.packages[''].version = next;
  }
  io.json.common = io.json.common && typeof io.json.common === 'object' ? io.json.common : {};
  io.json.common.version = next;
  delete io.json.version;

  if (manifest && manifest.json && typeof manifest.json === 'object') {
    manifest.json.version = next;
    manifest.json.appVersion = next;
  }

  writeJson(pkgPath, pkg.json);
  if (lock) writeJson(lockPath, lock.json);
  writeJson(ioPath, io.json);
  if (manifest) writeJson(manifestPath, manifest.json);
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
}
