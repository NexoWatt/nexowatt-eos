#!/usr/bin/env node
'use strict';

/** Regression 0.8.130: Detaildiagnose bleibt kompakt; neue Async-Felder gehören nur in JSON/Ringlog. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');
const diagnosticsUi = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
const tariff = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/tariff-status.ts'), 'utf8');
const liveApp = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/app.ts'), 'utf8');

assert(html.includes('id="nvpCoordinatorStatus"'), 'Statusansicht braucht NVP-Koordinator-Karten');
assert(html.includes('id="nvpCoordinatorLog"'), 'Statusansicht braucht Stabilitätslog');
assert(html.includes('id="refreshNvpCoordinator"'), 'Statusansicht braucht manuellen Refresh');
assert(html.includes('/static/ems-apps-nvp-diagnostics.js'), 'Typisierte NVP-Diagnose muss vor der AppCenter-Runtime geladen werden');
assert(diagnosticsUi.includes('function renderNvpCoordinator(payload'), 'Typisierte Installer-UI muss NVP-Diagnose rendern');
assert(diagnosticsUi.includes('(window as AnyRecord).NexoWattNvpDiagnostics = api'), 'Diagnoserenderer braucht eine kleine, explizite Host-API');
assert(ui.includes('window.NexoWattNvpDiagnostics?.render(data || {})'), 'NVP-Diagnose muss über /api/ems/status aktualisiert werden');
assert(main.includes('nvpCoordinator,'), 'EMS-Status-API muss Koordinator-Snapshot liefern');
assert(main.includes('tariffStatus,'), 'EMS-Status-API muss ausführlichen Tarifstatus liefern');
assert(tariff.includes("await mk('tarif.detailStatusText'"), 'Ausführlicher Tariftext braucht eigenen State');
assert(tariff.includes("await this._setIfChanged('tarif.statusText', statusText)"), 'Kompakte LIVE-Zeile muss bestehen bleiben');
assert(tariff.includes("await this._setIfChanged('tarif.detailStatusText', detailStatusText)"), 'Detailkette muss separat veröffentlicht werden');
assert(tariff.includes('const compactParts = [buildCompactStorageText(result), buildCompactEvcsText(tariff)]'), 'LIVE-Zeile muss kompakt aus Wahrheitsstatus und EVCS-Freigabe entstehen');

// Die neue Detaildiagnose darf nicht in die produktive LIVE-Energieflussdatei kopiert werden.
assert(!liveApp.includes('nvpCoordinatorStatus'), 'NVP-Detailkarten dürfen nicht in der LIVE-Energieflussansicht landen');
assert(!liveApp.includes('nvpCoordinatorLog'), 'Stabilitätslog darf nicht in der LIVE-Energieflussansicht landen');

// Baustein 6 erweitert statusJson/logJson, darf die ohnehin umfangreiche
// Statusseite aber nicht um weitere Karten oder Einzelzeilen aufblaehen.
const storageCardMatch = diagnosticsUi.match(/makeCard\('Speicher \/ Speicherfarm', \[([\s\S]*?)\], snap\.storageBlocked/);
assert(storageCardMatch, 'Bestehende kompakte Speicher-Diagnosekarte muss erhalten bleiben');
assert.strictEqual((storageCardMatch[1].match(/\{ label:/g) || []).length, 6, 'Speicherkarte darf durch Async-Interna keine weiteren sichtbaren Zeilen erhalten');
for (const hiddenAsyncField of [
  'storageTelemetryIntervalMs',
  'storageResponseEffectiveGraceMs',
  'storageActualSampleTs',
  'storageAcceptedCommandTs',
  'storageAcceptedCommandTargetW',
]) {
  assert(!diagnosticsUi.includes(hiddenAsyncField), `${hiddenAsyncField} gehoert in statusJson/logJson und nicht als weitere sichtbare Statuszeile in die UI`);
}

console.log('[nvp-coordinator-diagnostics-ui] OK: LIVE-Zeile und Statusseite bleiben kompakt; Async-Details liegen ausschließlich in statusJson/logJson.');
