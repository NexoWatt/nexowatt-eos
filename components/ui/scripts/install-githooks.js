#!/usr/bin/env node
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: scripts/install-githooks.js
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
  Enables repo-local git hooks stored in ./.githooks

  This sets:
    git config core.hooksPath .githooks

  Usage:
    npm run githooks:install
*/

const { execSync } = require('child_process');
const fs = require('node:fs');
const path = require('node:path');
/**
 * Code-Teil: main
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function main() {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (_e) {
    console.error('[githooks] git not found in PATH. Please install Git first.');
    process.exit(1);
  }

  try {
    const root = path.resolve(__dirname, '..');
    const hook = path.join(root, '.githooks', 'pre-commit');
    if (!fs.existsSync(hook)) throw new Error('Pre-commit hook missing; use the full repository ZIP.');
    // ZIP extraction / GitHub web uploads may discard executable permission.
    // Without this, Git can silently skip the security hook on Unix systems.
    fs.chmodSync(hook, 0o755);
    execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });
    console.log('[githooks] Installed: core.hooksPath=.githooks');
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
