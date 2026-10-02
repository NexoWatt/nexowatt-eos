import type { GridFlowResult, StorageFlowResult } from '../contracts/energy-flow';
import type { Watt } from '../contracts/units';
import {
  calculateStorageFromBalance,
  chooseStorageFlowResult,
  resolveSplitGridDps,
  resolveSplitStorageDps,
  splitSignedGridPower,
  splitSignedStoragePower,
} from '../utils/energy-flow';

/**
 * Datei: src-ts/tests/energy-flow-regression-matrix.ts
 *
 * Zweck:
 * Produktionsnahe Testmatrix für die spätere TypeScript-Migration der Energiefluss-
 * Resolver. Diese Datei wird noch nicht vom Adapter zur Laufzeit geladen, sondern von
 * TypeScript geprüft und vom Strukturcheck gegen versehentliches Entfernen abgesichert.
 *
 * Zusammenhang:
 * Die produktiven Resolver sitzen aktuell noch in JavaScript (`main.js`, `www/app.js`,
 * `ems/modules/core-limits.js`, `ems/modules/heating-rod-control.js`). Diese Matrix legt
 * die fachlichen Pflichtfälle fest, die beim späteren produktiven TS-Umbau unverändert
 * funktionieren müssen.
 *
 * Kritische Regeln:
 * - 0 W ist ein gültiger Messwert und darf nicht als fehlend gelten.
 * - Split-DPs und signed DPs sind beide gültige Speicherquellen.
 * - Rechenfallback darf echte gemappte Speicher-DPs niemals überschreiben.
 * - Netz signed/split muss dieselben positiven Import-/Exportwerte liefern.
 */

/** Ergebnis, das ein Speichertestfall fachlich erwarten muss. */
interface ExpectedStorageFlow {
  chargeW: Watt;
  dischargeW: Watt;
  source: StorageFlowResult['source'];
  hasConfiguredStorageDp: boolean;
}

/** Ergebnis, das ein Netztestfall fachlich erwarten muss. */
interface ExpectedGridFlow {
  importW: Watt;
  exportW: Watt;
  source: GridFlowResult['source'];
}

/**
 * Code-Teil: assertStorageFlowContract
 *
 * Zweck:
 * Verknüpft einen erwarteten Speichervertrag mit einem echten `StorageFlowResult`.
 * Die Funktion wirft absichtlich nicht zur Laufzeit, weil diese Datei aktuell nur vom
 * TypeScript-Compiler geprüft wird.
 *
 * Zusammenhang:
 * Später können diese Fälle nahezu unverändert in echte Unit-Tests übernommen werden.
 */
function assertStorageFlowContract(_result: StorageFlowResult, _expected: ExpectedStorageFlow): void {
  // Absichtlich leer: Der TypeScript-Compiler prüft hier die Struktur der Werte.
}

/**
 * Code-Teil: assertGridFlowContract
 *
 * Zweck:
 * Stellt sicher, dass Netz-Testfälle die erwartete Vertragsstruktur nutzen.
 *
 * Zusammenhang:
 * Diese Struktur wird später für echte Netz-Resolver-Tests wiederverwendet.
 */
function assertGridFlowContract(_result: GridFlowResult, _expected: ExpectedGridFlow): void {
  // Absichtlich leer: Compile-only Test für Verträge und Signaturen.
}

/**
 * Testfall: Split-DPs mit 0 W.
 *
 * Warum wichtig:
 * Genau dieser Fall hat in der Vergangenheit Speicher-/History-Werte verfälscht. Wenn
 * getrennte Lade-/Entlade-DPs konfiguriert sind und beide 0 W liefern, ist das ein echter
 * gültiger Messzustand. Es darf kein Bilanz-Fallback darübergelegt werden.
 */
const storageSplitZero = resolveSplitStorageDps({
  chargeW: 0,
  dischargeW: 0,
  socPct: 44,
  hasChargeDp: true,
  hasDischargeDp: true,
});
assertStorageFlowContract(storageSplitZero, {
  chargeW: 0,
  dischargeW: 0,
  source: 'split-dp',
  hasConfiguredStorageDp: true,
});

/**
 * Testfall: Signed Speicher-DP mit positiver Entladung.
 *
 * Warum wichtig:
 * Viele Speicher liefern nur einen einzigen Leistungs-DP. Bei der Standardkonvention
 * bedeutet ein positiver Wert Entladen und ein negativer Wert Laden.
 */
const storageSignedDischarge = splitSignedStoragePower({
  signedW: 1800,
  socPct: 62,
  convention: 'positive-discharge',
});
assertStorageFlowContract(storageSignedDischarge, {
  chargeW: 0,
  dischargeW: 1800,
  source: 'signed-dp',
  hasConfiguredStorageDp: true,
});

/**
 * Testfall: Signed Speicher-DP mit negativer Ladeleistung.
 *
 * Warum wichtig:
 * Ein negativer signed Wert darf nicht als Fehler interpretiert werden, sondern beschreibt
 * bei Standardkonvention eine Ladeleistung.
 */
const storageSignedCharge = splitSignedStoragePower({
  signedW: -2500,
  socPct: 50,
  convention: 'positive-discharge',
});
assertStorageFlowContract(storageSignedCharge, {
  chargeW: 2500,
  dischargeW: 0,
  source: 'signed-dp',
  hasConfiguredStorageDp: true,
});

/**
 * Testfall: Bilanz-Fallback ohne Speicher-DP.
 *
 * Warum wichtig:
 * Wenn wirklich kein Speicher-DP vorhanden ist, darf die Bilanzrechnung die Anzeige
 * retten. Diese Rechnung ist aber nur Fallback, nicht Quelle der Wahrheit.
 */
const storageCalculated = calculateStorageFromBalance({
  pvW: 6500,
  buildingLoadW: 1700,
  gridImportW: 0,
  gridExportW: 2000,
  socPct: 44,
});
assertStorageFlowContract(storageCalculated, {
  chargeW: 2800,
  dischargeW: 0,
  source: 'calculated',
  hasConfiguredStorageDp: false,
});

/**
 * Testfall: Quellenpriorität Split schlägt Fallback.
 *
 * Warum wichtig:
 * Ein berechneter Speicherwert darf niemals einen echten konfigurierten Split-DP
 * überschreiben. Das schützt Energiefluss, Heizstab und historische Werte.
 */
const chosenSplitOverCalculated = chooseStorageFlowResult({
  split: storageSplitZero,
  calculated: storageCalculated,
});
assertStorageFlowContract(chosenSplitOverCalculated, {
  chargeW: 0,
  dischargeW: 0,
  source: 'split-dp',
  hasConfiguredStorageDp: true,
});

/**
 * Testfall: Quellenpriorität signed schlägt Fallback.
 *
 * Warum wichtig:
 * Auch signed DPs sind echte gemappte Speicherquellen. Sie dürfen nicht von der
 * Bilanzrechnung ersetzt werden.
 */
const chosenSignedOverCalculated = chooseStorageFlowResult({
  signed: storageSignedCharge,
  calculated: storageCalculated,
});
assertStorageFlowContract(chosenSignedOverCalculated, {
  chargeW: 2500,
  dischargeW: 0,
  source: 'signed-dp',
  hasConfiguredStorageDp: true,
});

/**
 * Testfall: Signed Netz-DP bei Einspeisung.
 *
 * Warum wichtig:
 * Der Netzanschlusspunkt kann signed sein. Bei `positive-import` bedeutet ein negativer
 * Wert Einspeisung.
 */
const gridSignedExport = splitSignedGridPower(-2400, 'positive-import');
assertGridFlowContract(gridSignedExport, {
  importW: 0,
  exportW: 2400,
  source: 'signed-dp',
});

/**
 * Testfall: Split-Netz-DPs.
 *
 * Warum wichtig:
 * Getrennte Import-/Export-DPs müssen wie Speicher-Split-DPs 0 W als gültigen Wert
 * behalten.
 */
const gridSplit = resolveSplitGridDps(0, 2400, true, true);
assertGridFlowContract(gridSplit, {
  importW: 0,
  exportW: 2400,
  source: 'split-dp',
});

/**
 * Code-Teil: energyFlowRegressionMatrix
 *
 * Zweck:
 * Exportiert alle Fälle in einer Form, die spätere Runtime-Unit-Tests wiederverwenden
 * können. Dadurch müssen wir die fachlichen Beispiele nicht doppelt pflegen.
 */
export const energyFlowRegressionMatrix = {
  storageSplitZero,
  storageSignedDischarge,
  storageSignedCharge,
  storageCalculated,
  chosenSplitOverCalculated,
  chosenSignedOverCalculated,
  gridSignedExport,
  gridSplit,
};
