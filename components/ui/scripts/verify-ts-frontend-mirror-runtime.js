#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-frontend-mirror-runtime.js
 *
 * Zweck:
 * Führt echte Laufzeittests gegen die generierten MJS-Spiegel im `www`-Ordner aus.
 *
 * Zusammenhang:
 * `verify-ts-frontend-mirrors.js` prüft Struktur, Hash und Exporte. Dieser Test geht
 * einen Schritt weiter und nutzt die generierten Browsermodule wie spätere Runtime-
 * Imports. Dadurch erkennen wir früh, wenn der Spiegel zwar existiert, aber fachlich
 * falsche Ergebnisse liefert.
 */

const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: fail
 * Zweck: Bricht den Runtime-Check mit klarer Fehlermeldung ab.
 */
function fail(message) {
  console.error(`[verify-ts-frontend-mirror-runtime] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: importMirror
 *
 * Zweck:
 * Importiert einen eingecheckten MJS-Spiegel direkt aus dem statischen `www`-Bereich.
 */
async function importMirror(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

/**
 * Code-Teil: assert
 * Zweck: Kleine Testhilfe ohne zusätzliches Testframework.
 */
function assert(condition, message) {
  if (!condition) fail(message);
}

async function main() {
  const display = await importMirror('www/static/ts-mirrors/frontend/display-format.mjs');
  const canary = await importMirror('www/static/ts-mirrors/frontend/display-format-canary.mjs');
  const visibility = await importMirror('www/static/ts-mirrors/frontend/customer-feature-visibility.mjs');
  const diagnostics = await importMirror('www/static/ts-mirrors/frontend/feature-visibility-diagnostics.mjs');
  const history = await importMirror('www/static/ts-mirrors/frontend/history-controls.mjs');
  const runtimeShadow = await importMirror('www/static/ts-mirrors/frontend/runtime-shadow.mjs');
  const shadow = await importMirror('www/static/ts-mirrors/frontend/feature-visibility-shadow-compare.mjs');

  /**
   * Code-Teil: Leistungsformatierung prüfen
   * Zweck: 0 W muss in den erzeugten Browsermodulen gültig bleiben.
   */
  assert(display.formatPowerValue(0).text === '0 W', 'display-format: 0 W muss gültig formatiert werden.');
  assert(display.formatPowerValue(1400).text === '1.4 kW', 'display-format: 1400 W muss 1.4 kW ergeben.');

  /**
   * Code-Teil: Display-Canary prüfen
   * Zweck: Der MJS-Spiegel muss eine Laufzeitdiagnose liefern können, ohne die UI zu verändern.
   */
  const canaryReport = canary.runDisplayFormatterCanary(display, {
    formatPower: (value) => display.formatPowerValue(value).text,
    formatEnergyKwh: (value) => display.formatEnergyValue(value).text,
    formatPercent: (value) => display.formatPercentValue(value).text,
  });
  assert(canaryReport.checked >= 4, 'display-format-canary: Es müssen mehrere Fälle geprüft werden.');
  assert(Array.isArray(canaryReport.results), 'display-format-canary: Ergebnisliste fehlt.');

  /**
   * Code-Teil: Feature-Sichtbarkeit prüfen
   * Zweck: EVCS/Farm dürfen ohne echte Nachweise nicht sichtbar werden.
   */
  const state = visibility.buildCustomerFeatureVisibility({
    evcsProofs: [],
    storageFarmEnabled: true,
    storageFarmProofs: [],
    smartHomeEnabled: false,
    weatherEnabled: true,
    weatherHasData: false,
    aiAdvisorInstalled: true,
    aiAdvisorCustomerEnabled: true,
  });
  assert(state.hasEvcs === false, 'customer-feature-visibility: EVCS muss ohne Ladepunkt ausgeblendet bleiben.');
  assert(state.hasStorageFarm === false, 'customer-feature-visibility: Farm muss ohne Farmspeicher ausgeblendet bleiben.');
  assert(state.hasAiAdvisor === true, 'customer-feature-visibility: KI darf bei aktivem Kundenschalter sichtbar sein.');

  /**
   * Code-Teil: Diagnose prüfen
   * Zweck: Die Diagnose muss erklären, warum EVCS/Farm unsichtbar sind.
   */
  const rows = diagnostics.buildCustomerFeatureDiagnostics({
    visibility: state,
    evcsEnabled: true,
    evcsProofCount: 0,
    storageFarmEnabled: true,
    storageFarmProofCount: 0,
    weatherEnabled: true,
    weatherHasData: false,
    aiAdvisorInstalled: true,
    aiAdvisorCustomerEnabled: true,
  });
  const reasonText = rows.map((row) => row.reasonDe).join(' | ');
  assert(reasonText.includes('kein echter Ladepunkt'), 'feature-visibility-diagnostics: EVCS-Begründung fehlt.');
  assert(reasonText.includes('kein echter Farmspeicher'), 'feature-visibility-diagnostics: Farm-Begründung fehlt.');

  /**
   * Code-Teil: History-Aktion prüfen
   * Zweck: EVCS-PDF darf ohne echte Wallbox nicht angeboten werden.
   */
  const toolbar = history.buildHistoryToolbarState({ mode: 'day', hasEvcs: false, hasTariff: true, canLoad: true });
  const evcsPdf = toolbar.actions.find((action) => action.key === 'evcsPdf');
  assert(evcsPdf && evcsPdf.visible === false, 'history-controls: EVCS PDF muss ohne Wallbox unsichtbar bleiben.');

  /**
   * Code-Teil: Runtime-Shadow-Brücke prüfen
   * Zweck: Der neue optionale Shadow-Check muss die vorhandenen MJS-Spiegel importieren
   * können und darf keine falsche EVCS/KI-Sichtbarkeit melden.
   */
  const mirrorBase = pathToFileURL(path.join(root, 'www/static/ts-mirrors/frontend/')).href;
  const shadowReport = await runtimeShadow.runFrontendTsMirrorShadowCheck(mirrorBase);
  assert(shadowReport && shadowReport.ok === true, 'runtime-shadow: Shadow-Check muss erfolgreich sein.');
  assert(runtimeShadow.shouldRunFrontendTsMirrorShadow('?tsShadow=1') === true, 'runtime-shadow: ?tsShadow=1 muss aktivieren.');
  assert(runtimeShadow.shouldRunFrontendTsMirrorShadow('?tsShadow=0') === false, 'runtime-shadow: ?tsShadow=0 darf nicht aktivieren.');

  /**
   * Code-Teil: Feature-Shadow-Vergleich prüfen
   * Zweck: Der MJS-Spiegel muss Abweichungen zwischen alter JS-Logik und neuer TS-Logik erkennen.
   */
  const compare = shadow.compareFeatureVisibility({ hasEvcs: true, hasStorageFarm: false }, { hasEvcs: false, hasStorageFarm: false });
  assert(compare.matches === false, 'feature-visibility-shadow: EVCS-Abweichung muss erkannt werden.');
  assert(shadow.hasBlockingVisibilityMismatch(compare) === true, 'feature-visibility-shadow: EVCS-Abweichung muss blockierend sein.');

  console.log('[verify-ts-frontend-mirror-runtime] OK: Frontend-MJS-Spiegel liefern erwartete Runtime-Ergebnisse.');
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
