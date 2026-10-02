import { formatEnergyKwh, formatPercent, formatPowerW } from '../frontend/display-format';

/**
 * Datei: src-ts/tests/frontend-display-smoke.ts
 *
 * Zweck:
 * Compile-only Smoke-Test für die Anzeigeformatierung.
 *
 * Zusammenhang:
 * Verhindert, dass die ersten Frontend-TypeScript-Helfer versehentlich untypisiert oder unbrauchbar
 * werden. Dieser Test hat keine Runtime-Wirkung im Adapter.
 */

const powerText: string = formatPowerW(1500);
const percentText: string = formatPercent(39);
const energyText: string = formatEnergyKwh(123.4);

if (!powerText || !percentText || !energyText) throw new Error('Anzeigeformatierung darf keine leeren Strings liefern.');
