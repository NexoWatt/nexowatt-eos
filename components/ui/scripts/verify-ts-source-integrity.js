#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-source-integrity.js
 *
 * Zweck:
 * Prüft die TypeScript-Quellen auf typische Schäden, die bei Merge-Konflikten
 * oder halb kopierten ZIP-Ständen entstehen können.
 *
 * Zusammenhang:
 * Dieser Check läuft ohne TypeScript-Compiler und kann deshalb auch im schnellen
 * `publish:check` verwendet werden. Der eigentliche `typecheck` bleibt separat,
 * weil dafür `npm install` bzw. `npm ci` benötigt wird.
 *
 * Wichtig:
 * Der Check verändert keine Dateien. Er soll nur verhindern, dass abgeschnittene
 * `.ts`-Dateien, Git-Konfliktmarker oder fehlende Kernquellen unbemerkt in Git
 * landen.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_TS = path.join(ROOT, 'src-ts');

/**
 * Code-Teil: walkFiles
 *
 * Zweck:
 * Sammelt rekursiv alle Dateien unter einem Ordner.
 *
 * Zusammenhang:
 * Der Integritätscheck muss alle TypeScript-Quellen prüfen, ohne sich auf eine
 * feste Dateiliste zu verlassen. Neue TS-Dateien werden dadurch automatisch
 * mitgeprüft.
 */
function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Code-Teil: hasGitConflictMarker
 *
 * Zweck:
 * Erkennt echte Git-Konfliktmarker in TypeScript-Dateien.
 *
 * Zusammenhang:
 * Dieser Fall hatte bereits Commit/Publish blockiert. Deshalb wird er zusätzlich
 * zu `npm run check:conflicts` direkt in den TS-Quellen geprüft.
 */
function hasGitConflictMarker(text) {
  return /^(<<<<<<<|=======|>>>>>>>)(?:\s|$)/m.test(text);
}

/**
 * Code-Teil: scanBalancedSyntaxShell
 *
 * Zweck:
 * Führt eine leichte Strukturprüfung durch: Klammern und Kommentare dürfen nicht
 * offensichtlich offen bleiben.
 *
 * Zusammenhang:
 * Das ersetzt nicht `tsc`, fängt aber typische Kopier-/Merge-Schäden ab, z. B.
 * eine Datei, die mitten in einer Funktion oder mitten in einem Kommentar endet.
 *
 * Wichtig:
 * Template-Strings werden bewusst als Zeichenkette behandelt. Für die echte
 * TypeScript-Semantik bleibt `npm run typecheck` zuständig.
 */
function scanBalancedSyntaxShell(text) {
  const stack = [];
  let mode = 'code';
  let quote = '';
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (mode === 'line-comment') {
      if (c === '\n') mode = 'code';
      continue;
    }

    if (mode === 'block-comment') {
      if (c === '*' && n === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === '\\') {
        escaped = true;
        continue;
      }
      if (c === quote) {
        mode = 'code';
        quote = '';
      }
      continue;
    }

    if (c === '/' && n === '/') {
      mode = 'line-comment';
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      mode = 'block-comment';
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      mode = 'string';
      quote = c;
      escaped = false;
      continue;
    }

    if (c === '{' || c === '(' || c === '[') {
      stack.push(c);
    } else if (c === '}' || c === ')' || c === ']') {
      const last = stack.pop();
      const ok = (last === '{' && c === '}') || (last === '(' && c === ')') || (last === '[' && c === ']');
      if (!ok) return `Klammer passt nicht: erwartet Gegenstück zu ${last || 'nichts'}, gefunden ${c}`;
    }
  }

  if (mode === 'block-comment') return 'Datei endet innerhalb eines Block-Kommentars';
  if (mode === 'string') return 'Datei endet innerhalb eines Strings/Template-Strings';
  if (stack.length) return `Offene Klammern am Dateiende: ${stack.join(' ')}`;
  return '';
}

/**
 * Code-Teil: requireCoreSourceFiles
 *
 * Zweck:
 * Prüft, ob die Kern-Dateien der aktuellen TS-Migrationsstruktur vorhanden sind.
 *
 * Zusammenhang:
 * Diese Dateien bilden aktuell die Migrationsbasis für Contracts, Utils,
 * Resolver, Frontend-Helfer und Adapter-State/API. Wenn eine davon fehlt, ist
 * der TS-Stand nicht vollständig.
 */
function requireCoreSourceFiles(errors) {
  const required = [
    'src-ts/contracts/index.ts',
    'src-ts/contracts/energy-flow.ts',
    'src-ts/contracts/features.ts',
    'src-ts/utils/clock.ts',
    'src-ts/utils/number.ts',
    'src-ts/utils/energy-flow.ts',
    'src-ts/utils/index.ts',
    'src-ts/resolvers/energy-flow-resolver.ts',
    'src-ts/resolvers/feature-visibility-resolver.ts',
    'src-ts/frontend/display-format.ts',
    'src-ts/frontend/customer-feature-visibility.ts',
    'src-ts/adapter/state-cache.ts',
    'src-ts/scripts/publish-check-rules.ts',
  ];
  for (const rel of required) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) errors.push(`Pflichtdatei fehlt: ${rel}`);
  }
}

/**
 * Code-Teil: verifyTypeScriptSourceIntegrity
 *
 * Zweck:
 * Führt alle Integritätsprüfungen für `src-ts` aus und sammelt verständliche
 * Fehlermeldungen.
 *
 * Zusammenhang:
 * Wird von `npm run check:ts-source-integrity` und künftig von `publish:check`
 * genutzt, bevor weitere TS-Migrationsschritte auf einem beschädigten Stand
 * aufbauen könnten.
 */
function verifyTypeScriptSourceIntegrity() {
  const errors = [];
  if (!fs.existsSync(SRC_TS)) {
    errors.push('Ordner src-ts fehlt.');
    return errors;
  }

  requireCoreSourceFiles(errors);

  const files = walkFiles(SRC_TS).filter((file) => /\.tsx?$/.test(file));
  if (!files.length) errors.push('Keine TypeScript-Dateien unter src-ts gefunden.');

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const text = fs.readFileSync(file, 'utf8');
    if (!text.trim()) {
      errors.push(`Leere TypeScript-Datei: ${rel}`);
      continue;
    }
    if (hasGitConflictMarker(text)) {
      errors.push(`Git-Konfliktmarker in TS-Datei: ${rel}`);
    }
    /**
     * Code-Teil: Runtime-Spiegel von der leichten Klammerheuristik ausnehmen.
     *
     * Zweck:
     * `src-ts/runtime-mirrors/`, `src-ts/runtime-executables/` und `src-ts/runtime-exec/` enthalten große
     * JS-kompatible Runtime-Spiegel bzw. kanonische Runtime-Quellen. Die einfache
     * Heuristik kann bei komplexen Regex-/Template-String-Konstruktionen falsch
     * anschlagen. Diese Dateien werden deshalb durch Hash-/Executable-Checks
     * abgesichert, während Konfliktmarker hier weiter geprüft werden.
     */
    if (!rel.startsWith('src-ts/runtime-mirrors/') && !rel.startsWith('src-ts/runtime-executables/') && !rel.startsWith('src-ts/runtime-exec/')) {
      const syntaxProblem = scanBalancedSyntaxShell(text);
      if (syntaxProblem) {
        errors.push(`${rel}: ${syntaxProblem}`);
      }
    }
  }

  return errors;
}

if (require.main === module) {
  const errors = verifyTypeScriptSourceIntegrity();
  if (errors.length) {
    console.error('[ts-source-integrity] Fehler:');
    for (const error of errors) console.error(' - ' + error);
    process.exit(1);
  }
  console.log('[ts-source-integrity] OK: TypeScript-Quellen wirken vollständig und konfliktfrei.');
}

module.exports = {
  verifyTypeScriptSourceIntegrity,
  scanBalancedSyntaxShell,
};
