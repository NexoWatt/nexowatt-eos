/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Löst verfügbare Energiefluss-Messwerte und erlaubte Ersatzwerte zu einem konsistenten Anlagenbild auf.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/resolvers/energy-flow-resolver.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type {
  BuildingLoadBalanceInput,
  EnergyFlowSnapshot,
  GridFlowResolverInput,
  GridFlowResult,
  StorageFlowResolverInput,
  StorageFlowResult,
} from '../contracts/energy-flow';
import type { TimestampMs, Watt } from '../contracts/units';
import {
  calculateStorageFromBalance,
  resolveSplitGridDps,
  resolveSplitStorageDps,
  splitSignedGridPower,
  splitSignedStoragePower,
} from '../utils/energy-flow';
import { positiveWatt, toNumberOrNull } from '../utils/number';

/**
 * Datei: src-ts/resolvers/energy-flow-resolver.ts
 *
 * Zweck:
 * Produktionsnahe TypeScript-Vorbereitung für die spätere Energiefluss-Auflösung.
 * Diese Datei wird in 0.7.61 noch nicht in der Adapter-Runtime verwendet. Sie bildet
 * aber exakt die fachlichen Regeln ab, die später aus `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js` herausgelöst
 * werden sollen.
 *
 * Zusammenhang:
 * Der Resolver nutzt die in 0.7.60 angelegten kleinen Energiefluss-Helfer und fasst sie
 * zu einer realistischeren Resolver-Schicht zusammen. Dadurch können wir Split-DPs,
 * signed DPs und berechnete Fallbacks schon jetzt typisiert testen, ohne die produktive
 * Logik zu riskieren.
 *
 * Wichtig für spätere Änderungen:
 * - Ein konfigurierter Speicher-DP mit 0 W bleibt gültig.
 * - Split- oder signed Speicher-DPs dürfen nicht durch Bilanzrechnung überschrieben werden.
 * - Rechenfallback ist nur erlaubt, wenn wirklich kein Speicher-DP konfiguriert ist.
 * - Diese Regeln schützen LIVE-Dashboard, History, Heizstab und KI vor verfälschten Werten.
 */

/** Erweiterte Speicher-Eingabe für die produktionsnahe Resolver-Vorbereitung. */
export interface ResolveStorageFlowInput extends StorageFlowResolverInput {
  /** Optionaler Bilanz-Fallback, der nur bei fehlenden echten Speicher-DPs genutzt wird. */
  balance?: BuildingLoadBalanceInput;
}

/** Eingabe für den zukünftigen zentralen Energiefluss-Snapshot. */
export interface BuildEnergyFlowSnapshotInput {
  ts: TimestampMs;
  pvW?: unknown;
  buildingLoadW?: unknown;
  grid: GridFlowResolverInput;
  storage: ResolveStorageFlowInput;
  evcsW?: unknown;
  heatingRodW?: unknown;
  thermalW?: unknown;
}

/**
 * Code-Teil: configuredStorageZeroResult
 *
 * Zweck:
 * Erzeugt ein sicheres 0-W-Ergebnis für einen konfigurierten Speicher-DP, dessen Wert
 * gerade nicht numerisch gelesen werden kann.
 *
 * Zusammenhang:
 * Diese Hilfsfunktion ist bewusst konservativ. Wenn ein echter Speicher-DP konfiguriert
 * ist, darf der Adapter nicht einfach eine Bilanzrechnung darüberlegen. Sonst können
 * Historie, Heizstab-Budget und KI-Berater falsche Speicherwerte bekommen.
 */
function configuredStorageZeroResult(sourceText: 'signed-dp' | 'split-dp', input: StorageFlowResolverInput): StorageFlowResult {
  return {
    chargeW: 0,
    dischargeW: 0,
    signedW: null,
    socPct: toNumberOrNull(input.socPct),
    source: 'default-zero',
    signedConvention: input.signedConvention || 'unknown',
    hasConfiguredStorageDp: true,
    diagnosticText: `${sourceText} ist konfiguriert, liefert aber keinen numerischen Wert; 0 W bleibt Quelle der Wahrheit und verhindert einen Rechenfallback.`,
  };
}

/**
 * Code-Teil: calculatedStorageFromBalanceInput
 *
 * Zweck:
 * Erstellt den Speicher-Fallback aus einer Bilanz, wenn kein echter Speicher-DP vorhanden
 * ist.
 *
 * Zusammenhang:
 * Die Rechnung selbst liegt in `calculateStorageFromBalance`. Diese Wrapper-Funktion
 * dokumentiert, wann sie genutzt werden darf: ausschließlich ohne konfigurierten signed
 * oder Split-Speicher-DP.
 */
function calculatedStorageFromBalanceInput(input: ResolveStorageFlowInput): StorageFlowResult {
  if (toNumberOrNull(input.calculatedSignedW) !== null) {
    return splitSignedStoragePower({
      signedW: input.calculatedSignedW,
      socPct: toNumberOrNull(input.socPct),
      convention: 'positive-discharge',
    });
  }

  const balance = input.balance;
  if (!balance) {
    return {
      chargeW: 0,
      dischargeW: 0,
      signedW: null,
      socPct: toNumberOrNull(input.socPct),
      source: 'missing',
      signedConvention: input.signedConvention || 'unknown',
      hasConfiguredStorageDp: false,
      diagnosticText: 'Kein Speicher-DP und keine vollständige Bilanz für Fallback vorhanden.',
    };
  }

  return calculateStorageFromBalance({
    pvW: balance.pvW,
    buildingLoadW: balance.additionalKnownLoadW ?? undefined,
    gridImportW: balance.gridImportW,
    gridExportW: balance.gridExportW,
    socPct: toNumberOrNull(input.socPct),
  });
}

/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Löst Speicher-Laden und Speicher-Entladen nach unserer fachlichen Priorität auf.
 *
 * Priorität:
 * 1. Getrennte Lade-/Entlade-DPs, wenn konfiguriert.
 * 2. Signed Batterie-Leistungs-DP, wenn konfiguriert.
 * 3. Rechenfallback, nur wenn kein Speicher-DP konfiguriert ist.
 *
 * Warum das kritisch ist:
 * In den letzten Versionen haben falsche Fallbacks historische Speicherwerte verfälscht.
 * Diese Funktion hält die Regel typisiert fest, damit spätere Runtime-Migrationen nicht
 * wieder Split-DPs, signed DPs oder gültige 0-W-Werte überschreiben.
 *
 * Merksatz:
 * Bilanz-Fallback bleibt gesperrt, sobald ein echter Speicher-DP konfiguriert ist.
 */
export function resolveStorageFlow(input: ResolveStorageFlowInput): StorageFlowResult {
  if (input.hasConfiguredSplitDp) {
    return resolveSplitStorageDps({
      chargeW: input.chargeW,
      dischargeW: input.dischargeW,
      socPct: toNumberOrNull(input.socPct),
      hasChargeDp: true,
      hasDischargeDp: true,
    });
  }

  if (input.hasConfiguredSignedDp) {
    const signed = toNumberOrNull(input.signedW);
    if (signed === null) return configuredStorageZeroResult('signed-dp', input);
    return splitSignedStoragePower({
      signedW: signed,
      socPct: toNumberOrNull(input.socPct),
      convention: input.signedConvention || 'positive-discharge',
    });
  }

  return calculatedStorageFromBalanceInput(input);
}

/**
 * Code-Teil: configuredGridZeroResult
 *
 * Zweck:
 * Erzeugt ein sicheres 0-W-Netzergebnis, wenn ein Netz-DP konfiguriert ist, aber aktuell
 * keinen numerischen Wert liefert.
 *
 * Zusammenhang:
 * Genau wie beim Speicher ist 0 W ein gültiger Zustand. Später darf ein fehlender Momentwert
 * nicht automatisch zu falschem Import/Export führen.
 */
function configuredGridZeroResult(): GridFlowResult {
  return {
    importW: 0,
    exportW: 0,
    signedW: null,
    source: 'default-zero',
  };
}

/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Löst Netzbezug und Netzeinspeisung aus Split-DPs oder signed Netzanschlusspunkt auf.
 *
 * Zusammenhang:
 * Die Netzwerte sind Basis für Energiefluss, Speicher-Fallback, History und Peak-Shaving.
 * Deshalb wird hier dieselbe Prioritätsregel wie beim Speicher vorbereitet: echte DPs
 * schlagen berechnete oder fehlende Werte.
 */
export function resolveGridFlow(input: GridFlowResolverInput): GridFlowResult {
  if (input.hasConfiguredSplitDp) {
    return resolveSplitGridDps(input.importW, input.exportW, true, true);
  }

  if (input.hasConfiguredSignedDp) {
    const signed = toNumberOrNull(input.signedW);
    if (signed === null) return configuredGridZeroResult();
    return splitSignedGridPower(signed, input.signedConvention || 'positive-import');
  }

  return {
    importW: 0,
    exportW: 0,
    signedW: null,
    source: 'missing',
  };
}

/**
 * Code-Teil: calculateBuildingLoadFromBalance
 *
 * Zweck:
 * Berechnet den Gebäudeverbrauch aus PV, Netz und Speicher, wenn kein direkter
 * Verbrauchs-DP vorhanden ist.
 *
 * Formel:
 * Gebäude = PV + Netzbezug + Speicherentladung - Netzeinspeisung - Speicherladung
 *
 * Wichtig:
 * Diese Berechnung darf später nur genutzt werden, wenn die Eingangsquellen fachlich
 * sauber aufgelöst wurden. Sonst erzeugt der Verbrauchswert falsche Folgewerte in History
 * und KPI-Kacheln.
 */
export function calculateBuildingLoadFromBalance(input: {
  pvW: unknown;
  grid: GridFlowResult;
  storage: StorageFlowResult;
  additionalKnownLoadW?: unknown;
}): Watt | null {
  const pvW = toNumberOrNull(input.pvW);
  if (pvW === null) return null;

  const additionalKnownLoadW = positiveWatt(input.additionalKnownLoadW);
  const calculated = pvW
    + input.grid.importW
    + input.storage.dischargeW
    - input.grid.exportW
    - input.storage.chargeW
    + additionalKnownLoadW;

  return Math.max(0, calculated) as Watt;
}

/**
 * Code-Teil: buildEnergyFlowSnapshot
 *
 * Zweck:
 * Baut eine vollständige, typisierte Energiefluss-Momentaufnahme aus Rohwerten.
 *
 * Zusammenhang:
 * Diese Funktion ist die spätere Zielstruktur für die Migration von Backend- und
 * Frontend-Resolvern. Sie ist in 0.7.61 noch nicht produktiv aktiv, bildet aber schon
 * die Reihenfolge ab, die wir später in Runtime-Code übernehmen wollen.
 */
export function buildEnergyFlowSnapshot(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot {
  const grid = resolveGridFlow(input.grid);
  const storage = resolveStorageFlow({
    ...input.storage,
    balance: input.storage.balance || {
      pvW: input.pvW,
      gridImportW: grid.importW,
      gridExportW: grid.exportW,
      additionalKnownLoadW: input.buildingLoadW,
    },
  });

  const directBuildingLoad = toNumberOrNull(input.buildingLoadW);
  const buildingLoadW = directBuildingLoad === null
    ? calculateBuildingLoadFromBalance({
      pvW: input.pvW,
      grid,
      storage,
      additionalKnownLoadW: undefined,
    })
    : Math.max(0, directBuildingLoad) as Watt;

  const evcsW = positiveWatt(input.evcsW);
  const heatingRodW = positiveWatt(input.heatingRodW);
  const thermalW = positiveWatt(input.thermalW);

  return {
    ts: input.ts,
    pvW: positiveWatt(input.pvW),
    buildingLoadW,
    grid,
    storage,
    evcsW,
    heatingRodW,
    thermalW,
    residualLoadW: buildingLoadW === null ? null : Math.max(0, buildingLoadW - evcsW - heatingRodW - thermalW) as Watt,
  };
}


/**
 * Code-Teil: createEnergyFlowSnapshot
 *
 * Zweck:
 * Rückwärtskompatibler Alias für die produktionsnahe Snapshot-Funktion.
 *
 * Zusammenhang:
 * Erste Regressionstests und spätere Migrationsschritte nutzen teilweise den Begriff
 * `createEnergyFlowSnapshot`, während die fachliche Implementierung aktuell
 * `buildEnergyFlowSnapshot` heißt. Der Alias vermeidet doppelte Logik und hält die
 * Testverträge stabil.
 */
export function createEnergyFlowSnapshot(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot {
  return buildEnergyFlowSnapshot(input);
}


/**
 * Code-Teil: buildEnergyFlowSnapshotFromInputs
 *
 * Zweck:
 * Rückwärtskompatibler Alias für frühe Regressionstests.
 *
 * Zusammenhang:
 * Einige Testdateien benennen die Zielstruktur ausdrücklich als „aus Eingaben bauen“.
 * Damit keine doppelte Logik entsteht, leitet dieser Alias direkt auf
 * `buildEnergyFlowSnapshot` weiter.
 */
export function buildEnergyFlowSnapshotFromInputs(input: BuildEnergyFlowSnapshotInput): EnergyFlowSnapshot {
  return buildEnergyFlowSnapshot(input);
}
