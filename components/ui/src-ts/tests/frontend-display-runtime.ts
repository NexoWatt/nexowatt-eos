import { buildDashboardValueRows } from '../frontend/dashboard-display';
import { formatEnergyKwhValue, formatPercentageValue, formatPowerValue, getFeatureLabel, normalizeFeatureKind } from '../frontend/display';
import { buildHistoryToolbarState } from '../frontend/history-controls';
import { dashboardWithoutEvcs, historyWithoutEvcs } from '../quality/frontend-display-cases';

/**
 * Datei: src-ts/tests/frontend-display-runtime.ts
 *
 * Zweck:
 * Kleiner Runtime-Test für die neuen Frontend-Display-Helfer.
 *
 * Zusammenhang:
 * Dieser Test läuft nach dem TypeScript-Compile mit Node. Er prüft bewusst nur reine Helfer ohne DOM
 * und ohne produktive VIS-Logik.
 */

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: erwartet ${String(expected)}, erhalten ${String(actual)}`);
}

/**
 * Code-Teil: runFrontendDisplayRuntimeTest
 *
 * Zweck:
 * Führt die kleinen Frontend-Display-Regressionen bewusst ohne Browser/DOM aus.
 *
 * Zusammenhang:
 * Dieser Test sichert die ersten TS-Frontend-Helfer ab, bevor wir später `www/app.js`,
 * `www/history.js` oder SmartHome-Anzeigen schrittweise auslagern.
 */
export function runFrontendDisplayRuntimeTest(): void {
  assertEqual(formatPowerValue(0).text, '0 W', '0 W bleibt gültiger Leistungswert');
  assertEqual(formatPowerValue(1530).text, '1.5 kW', 'Leistung wird ab 1000 W als kW formatiert');
  assertEqual(formatPowerValue(-1400).text, '-1.4 kW', 'Negative signed Werte bleiben erkennbar');
  assertEqual(formatPercentageValue(129).text, '100 %', 'Prozentwerte werden standardmäßig auf 100 % begrenzt');
  assertEqual(formatPercentageValue(39.4, { decimals: 1 }).text, '39.4 %', 'Prozentwerte unterstützen Dezimalstellen');
  assertEqual(formatEnergyKwhValue(1234).text, '1.23 MWh', 'Große Energiemengen werden als MWh angezeigt');
  assertEqual(normalizeFeatureKind('Speicherfarm'), 'storagefarm', 'Speicherfarm-Alias wird erkannt');
  assertEqual(getFeatureLabel('EVCS').shortLabel, 'EVCS', 'EVCS-Label bleibt stabil');

  const rows = buildDashboardValueRows(dashboardWithoutEvcs);
  assertEqual(rows.find((row) => row.key === 'evcs')?.visible, false, 'Ladestation darf ohne Wallbox nicht sichtbar sein');

  const toolbar = buildHistoryToolbarState(historyWithoutEvcs);
  assertEqual(toolbar.actions.find((action) => action.key === 'evcsPdf')?.visible, false, 'EVCS PDF darf ohne Wallbox nicht sichtbar sein');
}

runFrontendDisplayRuntimeTest();
console.log('[ts-frontend-display] OK: Frontend-Display-Helfer bestanden.');
