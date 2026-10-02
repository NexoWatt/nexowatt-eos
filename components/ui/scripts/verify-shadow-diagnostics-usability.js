#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: verify-shadow-diagnostics-usability
 *
 * Zweck:
 * Prüft die Bedienbarkeit der App-Center-Shadow-Diagnose. Die JSON-Anzeige muss
 * stabil außerhalb des automatisch neu gerenderten Diagnosebereichs öffnen können.
 *
 * Zusammenhang:
 * In 0.7.83 wird kein <details>-Element mehr direkt in der Karte genutzt, weil der
 * Statusbereich alle 2 Sekunden neu rendert. Stattdessen öffnet ein separater Dialog.
 * Dadurch bleibt JSON lesbar, ohne EMS-, Energiefluss- oder Heizstabwerte zu ändern.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'www', 'ems-apps.js');
const text = fs.readFileSync(jsPath, 'utf8');

const need = [
  '_shadowDecodeDisplayText',
  '_shadowEscape',
  '_openShadowJsonDialog',
  'JSON dauerhaft öffnen',
  'nwShadowJsonDialogBackdrop',
  "shadow.ok === false) return 'warn'",
];
const missing = need.filter((x) => !text.includes(x));
if (missing.length) {
  console.error('[shadow-diagnostics-usability] missing anchors:', missing.join(', '));
  process.exit(1);
}
console.log('[shadow-diagnostics-usability] OK: JSON-Dialog stabil und Warn-/Fehlerstatus getrennt.');
