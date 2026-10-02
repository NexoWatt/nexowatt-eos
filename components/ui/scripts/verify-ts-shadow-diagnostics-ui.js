#!/usr/bin/env node
'use strict';

/**
 * Seit 0.8.3 sind TypeScript-Migrations-/Shadow-Diagnosen keine sichtbaren
 * Endkunden-/Installateurkacheln mehr. Die internen JSON-Felder bleiben für
 * Entwicklung, Support und publish:check vorhanden, die UI bleibt aber sauber.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const errors = [];
const need = (ok, msg) => { if (!ok) errors.push(msg); };

const html = read('www/ems-apps.html');
const js = read('www/ems-apps.js');
const main = read('main.js');
const css = read('www/styles.css');

need(!html.includes('id="shadowDiagnostics"'), 'www/ems-apps.html: sichtbarer shadowDiagnostics-Container muss entfernt bleiben.');
need(!html.includes('id="refreshShadowDiagnostics"'), 'www/ems-apps.html: sichtbarer Shadow-Refresh-Button muss entfernt bleiben.');
need(!html.includes('TypeScript Shadow'), 'www/ems-apps.html: sichtbarer TypeScript-Shadow-Titel muss entfernt bleiben.');
need(js.includes('function renderShadowDiagnostics'), 'www/ems-apps.js: interner renderShadowDiagnostics-Helfer fehlt.');
need(!js.includes('renderShadowDiagnostics(data || {})'), 'www/ems-apps.js: Shadow-Diagnose darf nicht mehr automatisch sichtbar gerendert werden.');
need(js.includes('emsBudgetTsShadowJson'), 'www/ems-apps.js: Core-Limits Shadow-JSON wird nicht gelesen.');
need(js.includes('heatingRodTsShadowJson'), 'www/ems-apps.js: Heizstab Shadow-JSON wird nicht gelesen.');
need(js.includes('energyFlowInputsJson'), 'www/ems-apps.js: Energiefluss Shadow-Input wird nicht gelesen.');
need(main.includes("emsBudgetTsShadowJson: await getOwn('ems.budget.tsShadowJson')"), 'main.js: Core-Limits Shadow-JSON fehlt in Diagnose-API.');
need(main.includes("heatingRodTsShadowJson: await getOwn('heatingRod.summary.tsShadowJson')"), 'main.js: Heizstab Shadow-JSON fehlt in Diagnose-API.');
need(main.includes("energyFlowInputsJson: await getOwn('derived.core.building.inputsJson')"), 'main.js: Energiefluss Shadow-JSON fehlt in Diagnose-API.');
need(css.includes('.nw-shadow-badge--ok'), 'www/styles.css: interne Shadow-Ampel-Styles fehlen.');

if (errors.length) {
  console.error('[ts-shadow-diagnostics-ui] Fehler:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('[ts-shadow-diagnostics-ui] OK: TS-Migrationsdiagnose bleibt intern, sichtbare UI ist bereinigt.');
