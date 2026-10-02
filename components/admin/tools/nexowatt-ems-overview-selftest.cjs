#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let failed = false;
const fail = message => { console.error(`[NexoWatt EMS Overview Selftest] ERROR: ${message}`); failed = true; };
const read = rel => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch (error) { fail(`${rel} nicht lesbar: ${error.message}`); return ''; } };
const intro = read('src-admin/src/tabs/Intro.tsx');
const component = read('src-admin/src/components/Intro/NexoWattEmsOverview.tsx');
const css = read('src-admin/src/index.css');
for (const marker of [
    "import NexoWattEmsOverview from '@/components/Intro/NexoWattEmsOverview';",
    '<NexoWattEmsOverview',
]) if (!intro.includes(marker)) fail(`Intro-Vertrag fehlt: ${marker}`);
for (const marker of [
    'nexowatt-ems-overview-v1',
    "getForeignStates('nexowatt-ui.*.info.adminOverview.*')",
    'document.visibilityState',
    'window.setInterval(() => void load(), 5_000)',
    'Diagnose ist rein lesend',
    'system.adapter.nexowatt-ui.*.alive',
]) if (!component.includes(marker)) fail(`Komponenten-Vertrag fehlt: ${marker}`);
if (component.includes('Vollständige EMS-Diagnose öffnen')) fail('Nicht vorhandener Diagnose-Link ist noch aktiv.');
if ((component.match(/NexoWatt EMS · Live-Diagnose/g) || []).length !== 1) fail('EMS-Überschrift ist doppelt oder fehlt.');
if (!css.includes('/* nexowatt-ems-overview-v1 */')) fail('Responsive EMS-CSS fehlt.');
if (/setState\(|setForeignState\(|sendToHost\(/.test(component)) fail('EMS-Overview darf keine ioBroker-Schreiboperation enthalten.');
const assetDir = path.join(root, 'admin', 'assets');
if (fs.existsSync(assetDir)) {
    const scripts = fs.readdirSync(assetDir).filter(name => name.endsWith('.js'));
    const built = scripts.some(name => fs.readFileSync(path.join(assetDir, name), 'utf8').includes('nexowatt-ems-overview-v1'));
    if (!built) fail('Gebautes Admin-Frontend enthält die EMS-Overview-Komponente nicht. Bitte npm run build ausführen.');
}
if (failed) process.exit(1);
console.log('[NexoWatt EMS Overview Selftest] OK: read-only Diagnosekarte, Intro-Einbindung und responsive Darstellung geprüft.');
