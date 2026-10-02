#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-tsconfig-modern.js
 *
 * Zweck:
 * Prüft die TypeScript-Konfigurationen auf veraltete Compiler-Optionen, die mit
 * TypeScript 6 bereits Warnungen erzeugen und in TypeScript 7 nicht mehr funktionieren.
 *
 * Zusammenhang:
 * VS Code meldete `moduleResolution=node10` als veraltet. Ursache ist die alte Option
 * `moduleResolution: "Node"`, die intern als node10 behandelt wird. Dieser Check verhindert,
 * dass wir diesen alten Resolver später versehentlich wieder einführen.
 *
 * Wichtig:
 * Wir unterdrücken die Warnung bewusst NICHT mit `ignoreDeprecations`. Ziel ist eine echte
 * Vorbereitung auf TypeScript 7, nicht das Verstecken der Meldung.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Code-Teil: findTsconfigFiles
 *
 * Zweck:
 * Sammelt alle `tsconfig*.json` Dateien im Projektwurzelverzeichnis.
 *
 * Zusammenhang:
 * Die TS-Migration nutzt mehrere spezialisierte Konfigurationsdateien. Alle müssen die
 * gleiche Zukunftsregel einhalten: kein `node`/`node10`/`node16` Resolver, kein Warn-Verstecken.
 */
function findTsconfigFiles() {
  return fs.readdirSync(ROOT)
    .filter((name) => /^tsconfig.*\.json$/.test(name))
    .map((name) => path.join(ROOT, name));
}

/**
 * Code-Teil: loadJson
 *
 * Zweck:
 * Lädt eine JSON-Datei mit verständlicher Fehlermeldung.
 *
 * Zusammenhang:
 * Kaputte tsconfig-Dateien führen sonst erst später in VS Code oder im Build zu schwer
 * nachvollziehbaren Fehlern. Dieser Check soll früh und klar abbrechen.
 */
function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)} ist kein gültiges JSON: ${err.message}`);
  }
}

/**
 * Code-Teil: validateConfig
 *
 * Zweck:
 * Prüft eine einzelne TypeScript-Konfiguration auf TS-7-kritische Optionen.
 *
 * Wichtig:
 * - `moduleResolution: "Node"` ist der alte node10-Modus und wird ab TS7 entfernt.
 * - `moduleResolution: "node16"` ist zwar nicht deprecated, wirkt aber für unser Node-22/24-Ziel unnötig alt.
 * - Für Node-nahe TS-Dateien nutzen wir `module: "NodeNext"` + `moduleResolution: "nodenext"`.
 * - Frontend-MJS-Spiegel dürfen `moduleResolution: "Bundler"` nutzen.
 * - `ignoreDeprecations` darf hier nicht genutzt werden, weil es den Fehler nur versteckt.
 */
function validateConfig(file) {
  const rel = path.relative(ROOT, file);
  const json = loadJson(file);
  const compilerOptions = json.compilerOptions || {};
  const moduleResolution = String(compilerOptions.moduleResolution || '').toLowerCase();
  const errors = [];

  const moduleKind = String(compilerOptions.module || '').toLowerCase();
  if (moduleResolution === 'node' || moduleResolution === 'node10' || moduleResolution === 'node16') {
    errors.push(`${rel}: moduleResolution=${compilerOptions.moduleResolution} ist für unsere TS6/TS7-Strategie nicht erlaubt. Nutze nodenext für Node-nahe Dateien oder bundler für Frontend-Mirror-Builds.`);
  }
  if (moduleResolution === 'nodenext' && moduleKind !== 'nodenext') {
    errors.push(`${rel}: moduleResolution=nodenext benötigt module=NodeNext.`);
  }
  if (moduleResolution === 'bundler' && !['es2022', 'esnext', 'preserve'].includes(moduleKind)) {
    errors.push(`${rel}: moduleResolution=bundler sollte nur mit module=ES2022/ESNext/Preserve genutzt werden.`);
  }
  if (!moduleResolution) {
    errors.push(`${rel}: moduleResolution fehlt. Setze nodenext oder bundler explizit.`);
  }
  if (Object.prototype.hasOwnProperty.call(compilerOptions, 'ignoreDeprecations')) {
    errors.push(`${rel}: ignoreDeprecations darf nicht gesetzt werden. Wir beheben Deprecations statt sie zu verstecken.`);
  }
  return errors;
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Führt die moderne tsconfig-Prüfung aus und beendet den Prozess mit Exit-Code 1,
 * wenn eine veraltete Option gefunden wurde.
 */
function main() {
  const errors = [];
  for (const file of findTsconfigFiles()) errors.push(...validateConfig(file));
  if (errors.length) {
    console.error('[tsconfig-modern] Fehler:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }
  console.log('[tsconfig-modern] OK: TypeScript-Resolver sind NodeNext/Bundler-kompatibel und ohne Deprecation-Unterdrückung.');
}

main();
