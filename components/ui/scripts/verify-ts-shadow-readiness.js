#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-shadow-readiness.js
 *
 * Zweck:
 * Prüft, ob die Auswertung der TS-Shadow-Diagnose und die vorbereitete
 * Umschaltbereitschaft vorhanden sind.
 *
 * Zusammenhang:
 * 0.7.79 bereitet die spätere Energiefluss-Umschaltung vor, schaltet aber noch
 * nichts produktiv um. Dieser Check verhindert, dass die Diagnose- und
 * Sicherheitsanker versehentlich entfernt werden.
 */

const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(cond, msg) { if (!cond) { console.error('[ts-shadow-readiness] ' + msg); process.exit(1); } }

const main = read('main.js');
const ui = read('www/ems-apps.js');
const css = read('www/styles.css');

need(main.includes('_nwEvaluateEnergyFlowSwitchReadinessFromControl'), 'main.js: Backend-Auswertung der TS-Umschaltbereitschaft fehlt.');
need(main.includes('control.tsShadowReadiness = this._nwEvaluateEnergyFlowSwitchReadinessFromControl(control);'), 'main.js: Diagnose-API hängt tsShadowReadiness nicht an.');
need(main.includes('readyForEnergyFlowSwitch'), 'main.js: Energiefluss-Freigabefeld fehlt.');
need(main.includes('Auch wenn `readyForEnergyFlowSwitch` true ist'), 'main.js: Sicherheitskommentar zur Nicht-Umschaltung fehlt.');
need(ui.includes('function _renderShadowReadinessCard'), 'www/ems-apps.js: Readiness-Karte fehlt.');
need(ui.includes('ctrl.tsShadowReadiness'), 'www/ems-apps.js: UI liest tsShadowReadiness nicht.');
need(css.includes('.nw-shadow-readiness-card'), 'www/styles.css: Readiness-Styles fehlen.');

console.log('[ts-shadow-readiness] OK: Shadow-Auswertung und Umschaltbereitschaft sind vorbereitet.');
