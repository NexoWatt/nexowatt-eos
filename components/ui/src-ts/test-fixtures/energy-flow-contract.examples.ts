import type { EnergyFlowSnapshot, GridFlowResult, StorageFlowResult } from '../contracts/energy-flow';

/**
 * Datei: src-ts/test-fixtures/energy-flow-contract.examples.ts
 *
 * Zweck:
 * Diese Datei enthält bewusst einfache Beispielobjekte für die Energiefluss-Typen.
 * Sie wird nicht vom Adapter geladen. Sie wird nur von TypeScript kompiliert.
 *
 * Warum das wichtig ist:
 * Beim späteren Umbau von JavaScript nach TypeScript sehen wir sofort, ob die
 * fachlichen Verträge für Speicher, Netz und Energiefluss noch zusammenpassen.
 */

/**
 * Beispiel: Speicher mit getrennten Lade-/Entlade-DPs.
 *
 * Fachregel:
 * Wenn Split-DPs gemappt sind, sind sie Quelle der Wahrheit. 0 W ist gültig.
 */
export const splitStorageExample: StorageFlowResult = {
  chargeW: 0,
  dischargeW: 0,
  signedW: null,
  socPct: 44,
  source: 'split-dp',
  signedConvention: 'unknown',
  hasConfiguredStorageDp: true,
  diagnosticText: 'Split-DPs vorhanden; kein rechnerischer Fallback notwendig.',
};

/**
 * Beispiel: Speicher mit signed DP.
 *
 * Fachregel:
 * Das Vorzeichen muss vor der Anzeige eindeutig in Laden/Entladen aufgeteilt werden.
 */
export const signedStorageExample: StorageFlowResult = {
  chargeW: 2800,
  dischargeW: 0,
  signedW: -2800,
  socPct: 61,
  source: 'signed-dp',
  signedConvention: 'positive-discharge',
  hasConfiguredStorageDp: true,
};

/**
 * Beispiel: Netz mit getrenntem Import/Export.
 */
export const splitGridExample: GridFlowResult = {
  importW: 0,
  exportW: 2400,
  signedW: null,
  source: 'split-dp',
};

/**
 * Beispiel: Vollständiger LIVE-Snapshot.
 *
 * Zusammenhang:
 * Diese Form soll langfristig die Basis für Dashboard, History, Heizstab,
 * Core-Limits und KI-Berater werden.
 */
export const liveSnapshotExample: EnergyFlowSnapshot = {
  ts: 1760000000000,
  pvW: 6500,
  buildingLoadW: 1700,
  grid: splitGridExample,
  storage: signedStorageExample,
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
  residualLoadW: null,
};
