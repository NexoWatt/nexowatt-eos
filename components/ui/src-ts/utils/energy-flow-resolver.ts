/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Löst verfügbare Energiefluss-Messwerte und erlaubte Ersatzwerte zu einem konsistenten Anlagenbild auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/utils/energy-flow-resolver.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { BuildingLoadBalanceInput, BuildingLoadBalanceResult } from '../contracts/energy-flow';
import { calculateBuildingLoadFromBalance as calculateBuildingLoadWFromResolver } from '../resolvers/energy-flow-resolver';

/**
 * Datei: src-ts/utils/energy-flow-resolver.ts
 *
 * Zweck:
 * Kompatibilitäts-Export für frühe 0.7.61-Testdateien, die den Resolver noch aus dem
 * Utils-Namensraum importieren. Die eigentliche neue Quelle liegt unter
 * `src-ts/resolvers/energy-flow-resolver.ts`.
 *
 * Zusammenhang:
 * Dieser dünne Wrapper verhindert doppelte Fachlogik. Später, wenn der Buildprozess
 * finalisiert ist, werden alte Imports auf `src-ts/resolvers` umgestellt.
 */

export * from '../resolvers/energy-flow-resolver';

/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Kompatibilitätsfunktion für ältere Testdateien, die ein strukturiertes Ergebnis
 * erwarten. Intern nutzt sie den neuen Resolver-Helfer, der nur die Wattzahl liefert.
 */
export function calculateBuildingLoadFromBalance(input: BuildingLoadBalanceInput): BuildingLoadBalanceResult {
  const grid = {
    importW: Number(input.gridImportW) || 0,
    exportW: Number(input.gridExportW) || 0,
    signedW: null,
    source: 'split-dp' as const,
  };
  const storage = {
    chargeW: Number(input.storageChargeW) || 0,
    dischargeW: Number(input.storageDischargeW) || 0,
    signedW: null,
    socPct: null,
    source: 'split-dp' as const,
    signedConvention: 'unknown' as const,
    hasConfiguredStorageDp: true,
  };
  const buildingLoadW = calculateBuildingLoadWFromResolver({
    pvW: input.pvW,
    grid,
    storage,
    additionalKnownLoadW: input.additionalKnownLoadW,
  });
  return {
    buildingLoadW,
    source: buildingLoadW === null ? 'missing' : 'calculated',
    diagnosticText: buildingLoadW === null ? 'Bilanz nicht belastbar.' : 'Gebäudelast wurde aus Bilanz berechnet.',
  };
}
