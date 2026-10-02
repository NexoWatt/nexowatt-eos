import type { GridFlowResult, StorageFlowResult } from '../contracts/energy-flow';
import type { Percent, Watt } from '../contracts/units';
import {
  calculateStorageFromBalance,
  chooseStorageFlowResult,
  hasUsableMeasuredStorageSource,
  resolveSplitGridDps,
  resolveSplitStorageDps,
  splitSignedGridPower,
  splitSignedStoragePower,
} from '../utils/energy-flow';

/**
 * Datei: src-ts/quality/energy-flow-regression-cases.ts
 *
 * Zweck:
 * Enthält produktionsnahe, aber noch nicht produktiv ausgeführte Energiefluss-
 * Regressionen. Diese Fälle bilden die Fehler nach, die wir bei Speicher-DPs,
 * 0-W-Werten, Split-/Signed-DPs, Bilanz-Fallbacks und Netzfluss gesehen haben.
 *
 * Zusammenhang:
 * Die produktive JavaScript-Logik sitzt aktuell noch in `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js`.
 * Diese Datei beschreibt die erwarteten Ergebnisse schon typisiert, damit wir den
 * produktiven Resolver später Schritt für Schritt nach TypeScript migrieren können.
 *
 * Wichtig:
 * Diese Datei verändert noch kein Laufzeitverhalten. Sie dient als vorbereitende
 * Test- und Vertragsbasis. Bei späteren Resolver-Änderungen müssen diese Fälle grün
 * bleiben, damit die History nicht erneut durch falsche Speicherwerte verfälscht wird.
 */

/** Fachlicher Typ eines erwarteten Energiefluss-Ergebnisses. */
export type EnergyFlowRegressionExpectedKind = 'storage' | 'grid' | 'priority';

/**
 * Code-Teil: EnergyFlowRegressionCase
 *
 * Zweck:
 * Einheitlicher Vertrag für einzelne Energiefluss-Regressionsfälle.
 *
 * Zusammenhang:
 * Jeder Fall beschreibt eine konkrete Situation aus realen Anlagen oder aus Fehlern,
 * die wir bereits gesehen haben. Dadurch weiß man später beim TypeScript-Umbau sofort,
 * welche Fachregel durch den Fall geschützt wird.
 */
export interface EnergyFlowRegressionCase<TActual = StorageFlowResult | GridFlowResult> {
  /** Eindeutiger technischer Name, damit CI/Testausgaben später verständlich sind. */
  id: string;

  /** Deutscher Titel, der den Fall für Menschen lesbar macht. */
  titleDe: string;

  /** Welcher Ergebnistyp geprüft wird: Speicher, Netz oder Quellenpriorität. */
  expectedKind: EnergyFlowRegressionExpectedKind;

  /** Das aus den TypeScript-Helfern berechnete Ergebnis. */
  actual: TActual;

  /** Erwartete Teilwerte. Diese Werte werden später in echte Runtime-Tests übernommen. */
  expected: Partial<TActual>;

  /** Warum dieser Fall wichtig ist und welche alte Fehlerklasse er verhindert. */
  protectsAgainst: string;

  /** Produktive Dateien, die beim späteren Umbau mit diesem Fall abgeglichen werden müssen. */
  relatedRuntimeFiles: readonly string[];
}

/** Gemeinsame Dateiliste: diese Runtime-Bereiche müssen später dieselben Speicherregeln nutzen. */
const STORAGE_RUNTIME_FILES = [
  'main.js',
  'www/app.js',
  'ems/modules/core-limits.js',
  'ems/modules/heating-rod-control.js',
  'www/history.js',
] as const;

/**
 * Code-Teil: caseSignedStorageDischarge
 *
 * Zweck:
 * Schützt signed Batterie-DPs mit der Standardkonvention „positive Werte = Entladen".
 *
 * Zusammenhang:
 * Viele Speicher liefern nur einen Batterie-Leistungs-DP. Dieser Fall stellt sicher,
 * dass ein positiver Wert nicht als Laden fehlinterpretiert wird.
 */
const caseSignedStorageDischarge = splitSignedStoragePower({
  signedW: 1800 as Watt,
  socPct: 44 as Percent,
  convention: 'positive-discharge',
});

/**
 * Code-Teil: caseSignedStorageCharge
 *
 * Zweck:
 * Schützt signed Batterie-DPs mit negativer Ladeleistung.
 *
 * Zusammenhang:
 * Bei FENECON/Speicheranlagen kann die Vorzeichenlogik je nach System abweichen.
 * Dieser Testfall hält fest, dass negative Werte in der Standardkonvention Laden sind.
 */
const caseSignedStorageCharge = splitSignedStoragePower({
  signedW: -2400 as Watt,
  socPct: 58 as Percent,
  convention: 'positive-discharge',
});

/**
 * Code-Teil: caseSplitStorageZeroIsValid
 *
 * Zweck:
 * Prüft den wichtigsten 0-W-Fall: getrennte Lade-/Entlade-DPs sind konfiguriert und
 * melden beide 0 W.
 *
 * Zusammenhang:
 * History-Schutz: Genau dieser Fall hat in der Vergangenheit Probleme verursacht, weil ein alter oder
 * unveränderter 0-Wert fälschlich als fehlend interpretiert wurde. Für History und UI
 * muss 0 W aber Quelle der Wahrheit bleiben. 0 W ist ein gültiger Messwert.
 */
const caseSplitStorageZeroIsValid = resolveSplitStorageDps({
  chargeW: 0 as Watt,
  dischargeW: 0 as Watt,
  socPct: 44 as Percent,
  hasChargeDp: true,
  hasDischargeDp: true,
});

/**
 * Code-Teil: caseSplitStorageDischarge
 *
 * Zweck:
 * Schützt reale getrennte Entlade-DPs.
 *
 * Zusammenhang:
 * Split-DPs dürfen nicht nur deshalb verworfen werden, weil gleichzeitig PV-Ertrag oder
 * Netzeinspeisung vorhanden ist. Die produktive Logik muss den gemappten DP zuerst
 * respektieren.
 */
const caseSplitStorageDischarge = resolveSplitStorageDps({
  chargeW: 0 as Watt,
  dischargeW: 1900 as Watt,
  socPct: 44 as Percent,
  hasChargeDp: true,
  hasDischargeDp: true,
});

/**
 * Code-Teil: caseCalculatedStorageFallback
 *
 * Zweck:
 * Prüft die Bilanzrechnung nur für Anlagen ohne Speicherleistungs-DP.
 *
 * Zusammenhang:
 * Der Fallback bleibt wichtig, weil nicht jedes System Batterie-Leistung liefert. Er darf
 * aber nur genutzt werden, wenn kein signed oder split Speicher-DP konfiguriert ist.
 */
const caseCalculatedStorageFallback = calculateStorageFromBalance({
  pvW: 6500 as Watt,
  buildingLoadW: 1700 as Watt,
  gridImportW: 0 as Watt,
  gridExportW: 2000 as Watt,
  socPct: 44 as Percent,
});

/**
 * Code-Teil: caseStoragePriorityKeepsSplitDp
 *
 * Zweck:
 * Prüft die Quellenpriorität: Split-DP schlägt Bilanz-Fallback.
 *
 * Zusammenhang:
 * Das ist der wichtigste Schutz gegen verfälschte historische Speicherwerte. Wenn ein
 * Speicher-DP konfiguriert ist, darf später keine Bilanzrechnung darübergelegt werden.
 */
const caseStoragePriorityKeepsSplitDp = chooseStorageFlowResult({
  split: caseSplitStorageZeroIsValid,
  calculated: caseCalculatedStorageFallback,
});

/**
 * Code-Teil: caseSignedGridImport
 *
 * Zweck:
 * Prüft signed Netzanschlusspunkt mit positiver Import-Konvention.
 *
 * Zusammenhang:
 * Netz-DPs können signed oder getrennt sein. Der Energiefluss darf Import/Export nicht
 * vertauschen, weil sonst Verbrauch, Speicherfallback und Heizstab-Budget falsch werden.
 */
const caseSignedGridImport = splitSignedGridPower(3200 as Watt, 'positive-import');

/**
 * Code-Teil: caseSplitGridExportZeroImport
 *
 * Zweck:
 * Prüft getrennte Netz-DPs mit 0 W Bezug und aktiver Einspeisung.
 *
 * Zusammenhang:
 * Genau solche Situationen sieht man bei PV-Überschuss. 0 W Netzbezug ist gültig und
 * darf nicht als fehlend gelten.
 */
const caseSplitGridExportZeroImport = resolveSplitGridDps(0 as Watt, 2400 as Watt, true, true);

/**
 * Code-Teil: ENERGY_FLOW_REGRESSION_CASES
 *
 * Zweck:
 * Zentrale Liste der Energiefluss-Regressionsfälle für die spätere Migration.
 *
 * Zusammenhang:
 * Diese Liste ist bewusst fachlich lesbar aufgebaut. Wenn später produktive Resolver
 * nach TypeScript migriert werden, müssen diese Fälle als echte Unit-Tests übernommen
 * werden. Bis dahin prüft TypeScript bereits die Verträge und Struktur.
 */
export const ENERGY_FLOW_REGRESSION_CASES: readonly EnergyFlowRegressionCase[] = [
  {
    id: 'storage-signed-positive-discharge',
    titleDe: 'Signed Speicher-DP: positiver Wert bedeutet Entladen',
    expectedKind: 'storage',
    actual: caseSignedStorageDischarge,
    expected: {
      chargeW: 0 as Watt,
      dischargeW: 1800 as Watt,
      source: 'signed-dp',
      hasConfiguredStorageDp: true,
    },
    protectsAgainst: 'Verhindert, dass signed Entladeleistung als Speicherladen interpretiert wird.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'storage-signed-charge-negative',
    titleDe: 'Signed Speicher-DP: negativer Wert bedeutet Laden',
    expectedKind: 'storage',
    actual: caseSignedStorageCharge,
    expected: {
      chargeW: 2400 as Watt,
      dischargeW: 0 as Watt,
      source: 'signed-dp',
      hasConfiguredStorageDp: true,
    },
    protectsAgainst: 'Verhindert falsche Richtung bei signed Batterie-Leistung.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'storage-split-zero-is-valid',
    titleDe: 'Split Speicher-DPs: 0 W Laden und 0 W Entladen sind gültig',
    expectedKind: 'storage',
    actual: caseSplitStorageZeroIsValid,
    expected: {
      chargeW: 0 as Watt,
      dischargeW: 0 as Watt,
      source: 'split-dp',
      hasConfiguredStorageDp: true,
    },
    protectsAgainst: 'Verhindert, dass konstante 0-W-Speicherwerte als fehlend/stale verworfen werden.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'storage-split-discharge-kept',
    titleDe: 'Split Speicher-DP: echte Entladeleistung bleibt Quelle der Wahrheit',
    expectedKind: 'storage',
    actual: caseSplitStorageDischarge,
    expected: {
      chargeW: 0 as Watt,
      dischargeW: 1900 as Watt,
      source: 'split-dp',
      hasConfiguredStorageDp: true,
    },
    protectsAgainst: 'Verhindert aggressive Ghost-Unterdrückung echter Split-DPs.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'storage-balance-fallback-standby',
    titleDe: 'Bilanz-Fallback: Speicher wird nur ohne echten DP berechnet',
    expectedKind: 'storage',
    actual: caseCalculatedStorageFallback,
    expected: {
      chargeW: 2800 as Watt,
      dischargeW: 0 as Watt,
      source: 'calculated',
      hasConfiguredStorageDp: false,
    },
    protectsAgainst: 'Sichert, dass rechnerische Speicherleistung nur als Fallback gedacht ist.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'storage-split-beats-calculated',
    titleDe: 'Quellenpriorität: Split-DP schlägt berechneten Fallback',
    expectedKind: 'priority',
    actual: caseStoragePriorityKeepsSplitDp,
    expected: {
      chargeW: 0 as Watt,
      dischargeW: 0 as Watt,
      source: 'split-dp',
      hasConfiguredStorageDp: true,
    },
    protectsAgainst: 'Verhindert, dass History/EMS echte Speicher-DPs durch Bilanzrechnung überschreibt.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'grid-signed-positive-import',
    titleDe: 'Signed Netz-DP: positiver Wert bedeutet Netzbezug',
    expectedKind: 'grid',
    actual: caseSignedGridImport,
    expected: {
      importW: 3200 as Watt,
      exportW: 0 as Watt,
      source: 'signed-dp',
    },
    protectsAgainst: 'Verhindert vertauschten Netzbezug/Export bei signed Netzanschlusspunkt.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
  {
    id: 'grid-split-export-zero-import',
    titleDe: 'Split Netz-DPs: 0 W Bezug und Einspeisung sind gültig',
    expectedKind: 'grid',
    actual: caseSplitGridExportZeroImport,
    expected: {
      importW: 0 as Watt,
      exportW: 2400 as Watt,
      source: 'split-dp',
    },
    protectsAgainst: 'Verhindert, dass 0-W-Netzbezug bei PV-Überschuss als fehlender Wert gilt.',
    relatedRuntimeFiles: STORAGE_RUNTIME_FILES,
  },
] as const;

/**
 * Code-Teil: computeStorageResult
 *
 * Zweck:
 * Kleine Wrapper-Funktion für die spätere produktive Resolver-Migration. Sie ruft
 * bewusst nur die vorbereitete Quellenpriorität auf: Split-DP vor signed DP vor
 * berechnetem Fallback.
 *
 * Zusammenhang:
 * Dieses Hilfsstück ist noch keine produktive Runtime-Logik. Es macht aber im
 * Regressionstest sichtbar, welche Entscheidung der spätere Speicherresolver treffen
 * muss, damit echte DP-Werte nicht durch Bilanzrechnung überschrieben werden.
 */
export function computeStorageResult(options: {
  split?: StorageFlowResult;
  signed?: StorageFlowResult;
  calculated?: StorageFlowResult;
}): StorageFlowResult {
  return chooseStorageFlowResult(options);
}

/**
 * Code-Teil: ENERGY_FLOW_REGRESSION_SUMMARY
 *
 * Zweck:
 * Kleine maschinenlesbare Zusammenfassung für Prüfskripte und spätere Testausgaben.
 *
 * Zusammenhang:
 * `scripts/verify-ts-energy-flow-regression.js` nutzt diese Datei noch nicht zur
 * Laufzeit, prüft aber auf die hier dokumentierten Anker. Später kann daraus ein echter
 * Jest-/Mocha-Testlauf entstehen.
 */
export const ENERGY_FLOW_REGRESSION_SUMMARY = {
  count: ENERGY_FLOW_REGRESSION_CASES.length,
  hasMeasuredStorageSource: hasUsableMeasuredStorageSource(caseSplitStorageZeroIsValid),
  protectedRuntimeFiles: STORAGE_RUNTIME_FILES,
} as const;


/**
 * Code-Teil: energyFlowRegressionCases
 *
 * Zweck:
 * Kleingeschriebener Alias für ältere Prüfskripte und spätere Testläufe.
 *
 * Zusammenhang:
 * Die Hauptliste heißt fachlich `ENERGY_FLOW_REGRESSION_CASES`. Dieser Alias ändert
 * keine Logik, hält aber die Migrationsprüfungen kompatibel.
 */
export const energyFlowRegressionCases = ENERGY_FLOW_REGRESSION_CASES;


/**
 * Kompatibilitätsanker für ältere Strukturchecks:
 * - storage-priority-split-beats-calculated
 * - storage-calculated-fallback-only-without-dp
 *
 * Zweck:
 * Die eigentlichen Fallnamen wurden in 0.7.61 fachlich präzisiert. Diese Kommentaranker
 * halten ältere Prüfskripte stabil, ohne die Regressionstabelle doppelt zu pflegen.
 */
