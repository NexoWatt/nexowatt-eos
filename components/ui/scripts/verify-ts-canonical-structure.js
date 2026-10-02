#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Datei: scripts/verify-ts-canonical-structure.js
 *
 * Zweck:
 * Prüft, dass die TypeScript-Migration nicht wieder in viele doppelte Baustellen
 * auseinanderläuft. Dieser Check ist eine Reaktion auf die zu große Anzahl von
 * Zwischenbausteinen während der Migration.
 *
 * Zusammenhang:
 * - `src-ts/**` soll TypeScript-Quelle sein und keine gebauten JavaScript-Dateien
 *   enthalten.
 * - Fachlogik darf nur an einer kanonischen Stelle liegen.
 * - Alte Kompatibilitätspfade dürfen bleiben, müssen aber dünne Adapter sein.
 *
 * Wichtig:
 * Diese Prüfung ändert keine Runtime und keine EMS-Logik. Sie schützt nur die
 * Struktur, damit der spätere vollständige TS-Umbau wartbar bleibt.
 */
const root = path.resolve(__dirname, '..');
let failed = false;

function fail(message) {
  console.error(`[ts-canonical] ERROR: ${message}`);
  failed = true;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Code-Teil: walk
 *
 * Zweck:
 * Läuft rekursiv durch einen Ordner und liefert alle Dateien zurück. Wird genutzt,
 * um verbotene Artefakte unter `src-ts/` zuverlässig zu finden.
 */
function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Code-Teil: TypeScript-Quellordner darf keine JS-Spiegel enthalten.
 *
 * Warum:
 * Gebaute JS-Spiegel gehören nach `scripts/`, `lib/ts-mirrors/` oder
 * `www/static/ts-mirrors/`, aber nicht in die TypeScript-Quelle. Sonst ist später
 * unklar, welche Datei gepflegt werden muss.
 */
for (const rel of walk('src-ts')) {
  if (rel.endsWith('.js') || rel.endsWith('.mjs') || rel.endsWith('.cjs')) {
    fail(`Gebautes JavaScript im TypeScript-Quellordner gefunden: ${rel}`);
  }
}

/**
 * Code-Teil: Feature-Sichtbarkeit darf nur eine kanonische Fachlogik haben.
 *
 * Zusammenhang:
 * Der alte Pfad `src-ts/backend/visibility` bleibt vorerst für Tests bestehen, darf
 * aber nur auf `src-ts/backend/feature-visibility` weiterleiten. Dadurch entfernen
 * wir doppelte Logik ohne bestehende Tests zu brechen.
 */
const canonicalVisibility = 'src-ts/backend/feature-visibility/feature-visibility.ts';
const legacyVisibility = 'src-ts/backend/visibility/feature-visibility.ts';
if (!fs.existsSync(path.join(root, canonicalVisibility))) fail(`Kanonische Feature-Sichtbarkeit fehlt: ${canonicalVisibility}`);
if (!fs.existsSync(path.join(root, legacyVisibility))) fail(`Kompatibilitätsadapter fehlt: ${legacyVisibility}`);
else {
  const legacySource = read(legacyVisibility);
  if (!legacySource.includes('Kompatibilitätsadapter')) fail('backend/visibility muss klar als Kompatibilitätsadapter kommentiert sein.');
  if (!legacySource.includes('buildFeatureVisibilityState')) fail('backend/visibility muss die kanonische buildFeatureVisibilityState-Funktion nutzen.');
  if (legacySource.includes('deriveCustomerFeatureVisibility')) fail('backend/visibility enthält noch alte eigene Resolver-Logik statt dünnem Adapter.');
}

/**
 * Code-Teil: Dokumentationsanker für spätere Entfernung überflüssiger Bausteine.
 *
 * Zweck:
 * Stellt sicher, dass im Projekt dokumentiert ist, welche TS-Bausteine dauerhaft
 * kanonisch sind und welche nur während der Migration bestehen bleiben.
 */
const cleanupDoc = 'docs/TYPESCRIPT_CLEANUP_STRATEGY_0787_DE.md';
if (!fs.existsSync(path.join(root, cleanupDoc))) fail(`Cleanup-Dokumentation fehlt: ${cleanupDoc}`);
else {
  const doc = read(cleanupDoc);
  for (const needle of ['Kanonische Quelle', 'Kompatibilitätsadapter', 'Entfernungsregel']) {
    if (!doc.includes(needle)) fail(`Cleanup-Dokumentation enthält den Abschnitt nicht: ${needle}`);
  }
}

if (failed) process.exit(1);
console.log('[ts-canonical] OK: TS-Quellstruktur ist kanonisch, ohne JS-Artefakte in src-ts und ohne doppelte Feature-Sichtbarkeitslogik.');
