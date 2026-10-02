#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-feature-visibility-preview-runtime.js
 *
 * Zweck:
 * Prüft den neuen 0.7.73-Zwischenschritt der TypeScript-Migration.
 *
 * Zusammenhang:
 * In main.js wird der TypeScript-Spiegel für Feature-Sichtbarkeit zunächst nur
 * als Diagnose und ab 0.7.74 als autoritative Sichtbarkeit mit Fallback geladen.
 * Diese Prüfung stellt sicher, dass der Preview-Codeanker weiterhin vorhanden ist.
 */

const fs = require('fs');
const path = require('path');

/** Prüft, ob ein erwarteter Marker in einer Datei steht. */
function requireMarker(file, marker, label) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(marker)) {
    throw new Error(`[feature-visibility-preview] Missing marker: ${label}`);
  }
}

const root = path.join(__dirname, '..');
const mainFile = path.join(root, 'main.js');
const mirrorFile = path.join(root, 'lib', 'ts-mirrors', 'backend', 'feature-visibility', 'feature-visibility.js');

requireMarker(mainFile, 'const featureVisibilityTsPreview = (() => {', 'preview calculation in main.js');
requireMarker(mainFile, "require('./lib/ts-mirrors/backend/feature-visibility/feature-visibility')", 'backend mirror require');
requireMarker(mainFile, 'featureVisibilityTsPreview,', 'preview field in /config response');
requireMarker(mainFile, '0.7.74 macht diesen Spiegel für die Feature-Sichtbarkeit autoritativ', 'German migration comment');
requireMarker(mirrorFile, 'exports.buildFeatureVisibilityState', 'backend feature visibility mirror export');

console.log('[feature-visibility-preview] OK: TS preview runtime markers present.');
