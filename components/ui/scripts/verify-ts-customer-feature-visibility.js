#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-customer-feature-visibility.js
 *
 * Zweck:
 * Prüft, ob die TypeScript-Vorbereitung für die kundenseitige Feature-Sichtbarkeit
 * vollständig vorhanden ist.
 *
 * Zusammenhang:
 * Dieser Check läuft ohne `tsc` und kann deshalb auch in `publish:check` genutzt
 * werden. Der eigentliche Runtime-Test läuft separat über den TypeScript-Build.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function requireFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Pflichtdatei fehlt: ${rel}`);
  }
  return read(rel);
}

function requireContains(text, needle, rel) {
  if (!text.includes(needle)) {
    throw new Error(`Erwarteter Inhalt fehlt in ${rel}: ${needle}`);
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Prüft Datei- und Kommentaranker der Feature-Visibility-Migrationsvorbereitung.
 */
function main() {
  const source = requireFile('src-ts/frontend/customer-feature-visibility.ts');
  const cases = requireFile('src-ts/quality/customer-feature-visibility-cases.ts');
  const runtime = requireFile('src-ts/tests/customer-feature-visibility-runtime.ts');
  requireFile('tsconfig.customer-feature-visibility.json');

  for (const fn of ['hasRealEvcsProof', 'hasRealStorageFarmProof', 'buildCustomerFeatureVisibility']) {
    requireContains(source, `export function ${fn}`, 'src-ts/frontend/customer-feature-visibility.ts');
  }
  for (const anchor of ['Code-Teil: customerFeatureVisibilityCases', 'ohne Wallbox', 'Speicherfarm']) {
    requireContains(cases, anchor, 'src-ts/quality/customer-feature-visibility-cases.ts');
  }
  for (const anchor of ['runCustomerFeatureVisibilityRuntimeTest', 'Sichtbarkeitsfälle']) {
    requireContains(runtime, anchor, 'src-ts/tests/customer-feature-visibility-runtime.ts');
  }
  console.log('[ts-customer-feature-visibility-check] OK: Feature-Visibility-Vorbereitung vorhanden.');
}

main();
