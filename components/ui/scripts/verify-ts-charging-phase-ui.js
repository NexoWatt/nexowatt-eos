#!/usr/bin/env node
'use strict';

/**
 * Verify EVCS AC 1p/3p phase UI is wired in the customer modal and EVCS page.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function need(cond, msg) {
  if (!cond) {
    console.error('[charging-phase-ui] ERROR: ' + msg);
    process.exit(1);
  }
}

const appTs = read('src-ts/runtime-executables/www/app.ts');
const evcsTs = read('src-ts/runtime-executables/www/evcs.ts');
const indexHtml = read('www/index.html');
const mainTs = read('src-ts/runtime-executables/main.ts');
const cmTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');

need(indexHtml.includes('id="evcsPhaseRow"'), 'LIVE-Modal enthält keinen AC-Phasenmodus-Block.');
need(indexHtml.includes('data-phase-mode="fixed-1p"') && indexHtml.includes('data-phase-mode="fixed-3p"') && indexHtml.includes('data-phase-mode="auto-pv"'), 'LIVE-Modal bietet nicht 1p/3p/Auto-PV an.');
need(appTs.includes('evcsPhaseButtons') && appTs.includes("apiSet('ems', 'evcs.1.phaseMode'"), 'LIVE-TS schreibt den Phasenmodus nicht über /api/set.');
need(appTs.includes('phaseSwitchSupported') && appTs.includes('phaseCooldownRemainingMs'), 'LIVE-TS zeigt Phasenumschalt-Diagnose/Cooldown nicht an.');
need(appTs.includes('function evcsPhaseSwitchDpAssigned') && appTs.includes('phaseSwitchId || row.phaseSwitchKey || row.phaseModeWriteId'), 'LIVE-TS prüft die Phasen-Haupt-DP-Zuordnung nicht aus /config.');
need(appTs.includes('const hasPhaseSwitchDp = evcsPhaseSwitchDpAssigned(1) || supported === true') && appTs.includes('phaseRow.style.display = (!!hasEms && isAc && hasPhaseSwitchDp)'), 'LIVE-Phasenbedienung muss bei zugeordnetem DP sichtbar und ohne Haupt-DP unsichtbar bleiben.');
need(evcsTs.includes('data-ems-phase-mode-btn') && evcsTs.includes('evcs.${idx}.phaseMode'), 'EVCS-Seite hat keine pro-Ladepunkt-Phasenmodus-Bedienung.');
need(evcsTs.includes('function evcsPhaseSwitchDpAssigned') && evcsTs.includes('const phaseSwitchMapped = evcsPhaseSwitchDpAssigned(i)'), 'EVCS-Seite prüft die Phasen-Haupt-DP-Zuordnung nicht aus der Ladepunkt-Konfiguration.');
need(evcsTs.includes('const phaseSupported = phaseSwitchMapped || emsPhaseSupported === true') && evcsTs.includes('const showPhaseUi = hasEms && phaseSupported'), 'EVCS-Seite muss Phasenbedienung bei zugeordnetem DP anzeigen und ohne Haupt-DP ausblenden.');
need(!appTs.includes('Kein Phasenumschalt-DP zugeordnet') && !evcsTs.includes('Kein Phasenumschalt-DP zugeordnet'), 'Phasenbedienung darf bei fehlendem Haupt-DP nicht gesperrt sichtbar sein.');
need(mainTs.includes('phaseMode|userPhaseMode') && mainTs.includes('chargingManagement.wallboxes.${safe}.userPhaseMode'), 'Backend /api/set erlaubt den Phasenmodus-User-Override nicht.');
need(mainTs.includes('prime(`${base}.phaseSwitchSupported`)') && mainTs.includes('primeKey(`${base}.phaseSwitchSupported`)'), '/api/state primed die EVCS-Phasenstates nicht für LIVE/EVCS.');
need(cmTs.includes("'userPhaseMode'") && cmTs.includes('phaseSwitchSupported') && cmTs.includes('userPhaseMode = normalizePhaseModeRuntime'), 'Charging-Management wertet userPhaseMode nicht als Runtime-Override aus.');
const appJs = read('www/app.js');
const evcsJs = read('www/evcs.js');
need(appJs.includes('evcsPhaseRow') && evcsJs.includes('data-ems-phase-mode-btn'), 'Runtime-JS ist nicht aus den TS-Phasen-UI-Quellen synchronisiert.');
need(appJs.includes('const hasPhaseSwitchDp = evcsPhaseSwitchDpAssigned(1) || supported === true') && evcsJs.includes('const phaseSupported = phaseSwitchMapped || emsPhaseSupported === true'), 'Runtime-JS nutzt die Phasen-DP-Zuordnung aus /config nicht korrekt.');
need(!appJs.includes('Kein Phasenumschalt-DP zugeordnet') && !evcsJs.includes('Kein Phasenumschalt-DP zugeordnet'), 'Runtime-JS enthält noch sichtbare Gesperrt-Hinweise für fehlende Haupt-DPs.');

console.log('[charging-phase-ui] OK: EVCS AC-Phasenmodus zeigt 1p/3p/Auto-PV bei zugeordnetem Phasen-Haupt-DP und bleibt sonst unsichtbar.');
