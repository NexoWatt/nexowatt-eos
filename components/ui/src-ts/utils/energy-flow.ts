/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet normierte Leistungs-/Energieflussgrößen und behandelt signed sowie getrennte Lade-/Entladewerte konsistent.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/utils/energy-flow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type {
  FlowValueSource,
  BuildingLoadBalanceInput,
  GridFlowResolverInput,
  GridFlowResult,
  GridSignedConvention as EnergyGridSignedConvention,
  StorageFlowResolverInput,
  StorageFlowResult,
  StorageSignedConvention,
} from '../contracts/energy-flow';
import type { NullableNumber, Percent, Watt } from '../contracts/units';
import { positiveWatt, toNumberOrNull } from './number';

/**
 * Datei: src-ts/utils/energy-flow.ts
 *
 * Zweck:
 * Reine, typisierte Energiefluss-Helfer für die spätere Migration von Speicher-, Netz-
 * und Bilanzlogik. Diese Datei ist in 0.7.60 noch nicht produktiv verdrahtet.
 *
 * Zusammenhang:
 * Die produktiven JavaScript-Resolver sitzen aktuell noch in `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js`. Diese Datei
 * beschreibt dieselben fachlichen Regeln in kleinen, testbaren TypeScript-Funktionen.
 *
 * Kritische Regeln:
 * - 0 W ist ein gültiger Wert.
 * - Split-DPs und signed DPs sind beide gültig.
 * - Rechenfallback darf nur verwendet werden, wenn kein echter DP vorhanden ist.
 */

/** Eingabe für die Aufteilung eines signed Speicher-DPs. */
export interface SplitSignedStorageInput {
  signedW: unknown;
  socPct?: Percent | null;
  convention?: StorageSignedConvention;
}

/** Eingabe für getrennte Lade-/Entlade-DPs. */
export interface SplitStorageDpInput {
  chargeW?: unknown;
  dischargeW?: unknown;
  socPct?: Percent | null;
  hasChargeDp: boolean;
  hasDischargeDp: boolean;
}

/** Eingabe für rechnerischen Speicherfallback aus einer Energieflussbilanz. */
export interface CalculatedStorageInput {
  pvW?: unknown;
  buildingLoadW?: unknown;
  gridImportW?: unknown;
  gridExportW?: unknown;
  socPct?: Percent | null;
}

/**
 * Code-Teil: splitSignedStoragePower
 *
 * Zweck:
 * Teilt einen signed Speicherleistungswert in positive Lade- und Entladeleistung auf.
 *
 * Zusammenhang:
 * Einige Speicher liefern einen einzigen Leistungs-DP mit Vorzeichen. Andere liefern
 * getrennte DPs. Dieser Helfer bildet die signed Variante so ab, dass spätere Resolver
 * immer mit `chargeW` und `dischargeW` weiterarbeiten können.
 *
 * Wichtig:
 * Die Vorzeichen-Konvention muss bekannt sein. Standard ist `positive-discharge`, also
 * positive Werte = Entladen und negative Werte = Laden.
 */
export function splitSignedStoragePower(input: SplitSignedStorageInput): StorageFlowResult {
  const signed = toNumberOrNull(input.signedW);
  const convention = input.convention || 'positive-discharge';
  if (signed === null) {
    return {
      chargeW: 0,
      dischargeW: 0,
      signedW: null,
      socPct: input.socPct ?? null,
      source: 'missing',
      signedConvention: convention,
      hasConfiguredStorageDp: false,
      diagnosticText: 'Kein signed Speicherwert vorhanden.',
    };
  }

  const positiveMeansDischarge = convention !== 'positive-charge';
  const chargeW = positiveMeansDischarge ? Math.max(0, -signed) : Math.max(0, signed);
  const dischargeW = positiveMeansDischarge ? Math.max(0, signed) : Math.max(0, -signed);

  return {
    chargeW,
    dischargeW,
    signedW: signed as Watt,
    socPct: input.socPct ?? null,
    source: 'signed-dp',
    signedConvention: convention,
    hasConfiguredStorageDp: true,
    diagnosticText: 'Signed Speicher-DP wurde in Laden/Entladen aufgeteilt.',
  };
}

/**
 * Code-Teil: resolveSplitStorageDps
 *
 * Zweck:
 * Bildet getrennte Speicher-Lade- und Speicher-Entlade-DPs auf ein gemeinsames Ergebnis
 * ab.
 *
 * Zusammenhang:
 * Viele Speichersysteme liefern getrennte DPs. Wenn diese DPs konfiguriert sind, sind
 * sie Quelle der Wahrheit. Ein Wert von 0 W ist dabei ausdrücklich gültig.
 */
export function resolveSplitStorageDps(input: SplitStorageDpInput): StorageFlowResult {
  const hasConfiguredStorageDp = !!(input.hasChargeDp || input.hasDischargeDp);
  return {
    chargeW: input.hasChargeDp ? positiveWatt(input.chargeW) : 0,
    dischargeW: input.hasDischargeDp ? positiveWatt(input.dischargeW) : 0,
    signedW: null,
    socPct: input.socPct ?? null,
    source: hasConfiguredStorageDp ? 'split-dp' : 'missing',
    signedConvention: 'unknown',
    hasConfiguredStorageDp,
    diagnosticText: hasConfiguredStorageDp
      ? 'Getrennte Lade-/Entlade-DPs sind Quelle der Wahrheit; 0 W bleibt gültig.'
      : 'Keine getrennten Speicher-DPs konfiguriert.',
  };
}

/**
 * Code-Teil: calculateStorageFromBalance
 *
 * Zweck:
 * Ermittelt Speicherleistung rechnerisch aus einer Energieflussbilanz.
 *
 * Zusammenhang:
 * Diese Rechnung ist nur ein Fallback für Anlagen ohne echten Speicherleistungs-DP.
 * Produktive Resolver müssen vorher prüfen, ob signed oder split DPs konfiguriert sind.
 *
 * Formel:
 * `storageSignedW = buildingLoadW - pvW - gridImportW + gridExportW`
 * Bei `positive-discharge` bedeutet ein positiver Wert Entladen und ein negativer Wert
 * Laden.
 */
export function calculateStorageFromBalance(input: CalculatedStorageInput): StorageFlowResult {
  const pvW = toNumberOrNull(input.pvW);
  const buildingLoadW = toNumberOrNull(input.buildingLoadW);
  const gridImportW = toNumberOrNull(input.gridImportW);
  const gridExportW = toNumberOrNull(input.gridExportW);

  if (pvW === null || buildingLoadW === null || gridImportW === null || gridExportW === null) {
    return {
      chargeW: 0,
      dischargeW: 0,
      signedW: null,
      socPct: input.socPct ?? null,
      source: 'missing',
      signedConvention: 'positive-discharge',
      hasConfiguredStorageDp: false,
      diagnosticText: 'Bilanz-Fallback nicht möglich, weil PV, Verbrauch oder Netzwerte fehlen.',
    };
  }

  const signedW = buildingLoadW - pvW - gridImportW + gridExportW;
  return {
    chargeW: Math.max(0, -signedW),
    dischargeW: Math.max(0, signedW),
    signedW: signedW as Watt,
    socPct: input.socPct ?? null,
    source: 'calculated',
    signedConvention: 'positive-discharge',
    hasConfiguredStorageDp: false,
    diagnosticText: 'Speicherleistung wurde aus der Bilanz berechnet, weil kein echter Speicher-DP genutzt wurde.',
  };
}

/**
 * Code-Teil: chooseStorageFlowResult
 *
 * Zweck:
 * Wählt aus möglichen Speicherquellen die fachlich korrekte Quelle aus.
 *
 * Zusammenhang:
 * Diese Priorität ist die wichtigste Vertragsregel für die spätere Produktivmigration:
 * split DP oder signed DP schlagen jede Rechenbilanz. Rechenfallback darf nur greifen,
 * wenn kein echter Speicher-DP konfiguriert ist.
 */
export function chooseStorageFlowResult(options: {
  split?: StorageFlowResult;
  signed?: StorageFlowResult;
  calculated?: StorageFlowResult;
}): StorageFlowResult {
  if (options.split?.hasConfiguredStorageDp) return options.split;
  if (options.signed?.hasConfiguredStorageDp) return options.signed;
  if (options.calculated?.source === 'calculated') return options.calculated;
  return options.split || options.signed || options.calculated || {
    chargeW: 0,
    dischargeW: 0,
    signedW: null,
    socPct: null,
    source: 'missing',
    signedConvention: 'unknown',
    hasConfiguredStorageDp: false,
    diagnosticText: 'Keine Speicherquelle verfügbar.',
  };
}

/**
 * Code-Teil: splitSignedGridPower
 *
 * Zweck:
 * Teilt einen signed Netzanschlusspunkt in Netzbezug und Netzeinspeisung auf.
 *
 * Zusammenhang:
 * Genau wie beim Speicher gibt es auch beim Netz unterschiedliche DPs. Manche Anlagen
 * liefern getrennte Import-/Exportwerte, andere einen signed Netzanschlusspunkt.
 */
export function splitSignedGridPower(signedValue: unknown, convention: EnergyGridSignedConvention = 'positive-import'): GridFlowResult {
  const signed = toNumberOrNull(signedValue);
  if (signed === null) {
    return {
      importW: 0,
      exportW: 0,
      signedW: null,
      source: 'missing',
    };
  }

  const positiveMeansImport = convention === 'positive-import';
  return {
    importW: positiveMeansImport ? Math.max(0, signed) : Math.max(0, -signed),
    exportW: positiveMeansImport ? Math.max(0, -signed) : Math.max(0, signed),
    signedW: signed as Watt,
    source: 'signed-dp',
  };
}

/**
 * Code-Teil: resolveSplitGridDps
 *
 * Zweck:
 * Bildet getrennte Netzbezug-/Netzeinspeisung-DPs auf einen gemeinsamen Netzvertrag ab.
 *
 * Zusammenhang:
 * 0 W Netzbezug oder 0 W Einspeisung ist gültig. Fehlende DPs dürfen später nicht dazu
 * führen, dass echte 0-Werte verworfen werden.
 */
export function resolveSplitGridDps(importW: unknown, exportW: unknown, hasImportDp: boolean, hasExportDp: boolean): GridFlowResult {
  const hasAnyDp = !!(hasImportDp || hasExportDp);
  return {
    importW: hasImportDp ? positiveWatt(importW) : 0,
    exportW: hasExportDp ? positiveWatt(exportW) : 0,
    signedW: null,
    source: hasAnyDp ? 'split-dp' as FlowValueSource : 'missing' as FlowValueSource,
  };
}

/**
 * Code-Teil: hasUsableMeasuredStorageSource
 *
 * Zweck:
 * Zeigt an, ob ein Speicherergebnis aus einem echten konfigurierten DP stammt.
 *
 * Zusammenhang:
 * Diese Prüfung schützt History und EMS-Logik davor, einen echten 0-W-Speicherwert
 * durch eine ungewollte Bilanzrechnung zu überschreiben.
 */
export function hasUsableMeasuredStorageSource(result: StorageFlowResult | null | undefined): boolean {
  return !!result && result.hasConfiguredStorageDp && (result.source === 'split-dp' || result.source === 'signed-dp');
}


/**
 * Code-Teil: resolveStorageFlow
 *
 * Zweck:
 * Führt die später produktive Speicher-DP-Priorität in einer kleinen, typisierten
 * Funktion zusammen: Split-DPs zuerst, danach signed DP, danach berechneter Fallback.
 *
 * Zusammenhang:
 * Diese Funktion ist noch nicht in der Adapter-Runtime verdrahtet. Sie bildet aber
 * exakt die fachliche Reihenfolge ab, die später in `main.js`, `www/app.js`,
 * `core-limits.js`, `heating-rod-control.js` und der History gleich gelten muss.
 *
 * Wichtig:
 * Ein konfigurierter Split- oder signed Speicher-DP ist Quelle der Wahrheit. Auch 0 W
 * ist gültig. Der Rechenfallback darf nur benutzt werden, wenn wirklich kein Speicher-
 * DP konfiguriert ist.
 */
export function resolveStorageFlow(input: StorageFlowResolverInput): StorageFlowResult {
  const hasChargeDp = input.hasConfiguredChargeDp ?? (!!input.hasConfiguredSplitDp && input.chargeW !== undefined);
  const hasDischargeDp = input.hasConfiguredDischargeDp ?? (!!input.hasConfiguredSplitDp && input.dischargeW !== undefined);
  const hasSplitDp = !!(input.hasConfiguredSplitDp || hasChargeDp || hasDischargeDp);

  if (hasSplitDp) {
    return resolveSplitStorageDps({
      chargeW: input.chargeW,
      dischargeW: input.dischargeW,
      socPct: input.socPct as StorageFlowResult['socPct'],
      hasChargeDp,
      hasDischargeDp,
    });
  }

  if (input.hasConfiguredSignedDp) {
    return splitSignedStoragePower({
      signedW: input.signedW,
      socPct: input.socPct as StorageFlowResult['socPct'],
      convention: input.signedConvention || 'positive-discharge',
    });
  }

  const calculatedSigned = toNumberOrNull(input.calculatedSignedW);
  if (calculatedSigned !== null) {
    const result = splitSignedStoragePower({
      signedW: calculatedSigned,
      socPct: input.socPct as StorageFlowResult['socPct'],
      convention: input.signedConvention || 'positive-discharge',
    });
    return {
      ...result,
      source: 'calculated',
      hasConfiguredStorageDp: false,
      diagnosticText: input.calculatedReason || 'Speicherleistung wurde vorbereitet aus Bilanz-Fallback berechnet.',
    };
  }

  return {
    chargeW: 0,
    dischargeW: 0,
    signedW: null,
    socPct: (input.socPct as StorageFlowResult['socPct']) ?? null,
    source: 'missing',
    signedConvention: input.signedConvention || 'unknown',
    hasConfiguredStorageDp: false,
    diagnosticText: 'Kein Speicher-DP und kein berechneter Fallback verfügbar.',
  };
}

/**
 * Code-Teil: resolveGridFlow
 *
 * Zweck:
 * Führt die spätere Netz-DP-Priorität zusammen: getrennte Import-/Export-DPs zuerst,
 * danach signed Netzanschlusspunkt.
 *
 * Zusammenhang:
 * Der Netzfluss ist Grundlage für Energiefluss, Speicherfallback, Peak-Shaving,
 * Heizstab-Budget und History. Deshalb muss auch hier 0 W als gültiger Wert gelten.
 */
export function resolveGridFlow(input: GridFlowResolverInput): GridFlowResult {
  const hasImportDp = input.hasConfiguredImportDp ?? (!!input.hasConfiguredSplitDp && input.importW !== undefined);
  const hasExportDp = input.hasConfiguredExportDp ?? (!!input.hasConfiguredSplitDp && input.exportW !== undefined);
  const hasSplitDp = !!(input.hasConfiguredSplitDp || hasImportDp || hasExportDp);

  if (hasSplitDp) return resolveSplitGridDps(input.importW, input.exportW, hasImportDp, hasExportDp);
  if (input.hasConfiguredSignedDp) return splitSignedGridPower(input.signedW, input.signedConvention || 'positive-import');

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
 * Bereitet die spätere Gebäudelast-Bilanzrechnung vor.
 *
 * Zusammenhang:
 * Wenn kein echter Gebäudeverbrauchs-DP vorhanden ist, kann Verbrauch aus PV, Netz und
 * Speicher hergeleitet werden. Diese Rechnung darf aber niemals echte Speicher-DPs
 * überschreiben, weil sonst History und Heizstab-Budget verfälscht werden können.
 *
 * Formel:
 * `buildingLoadW = pvW + gridImportW + storageDischargeW - gridExportW - storageChargeW + additionalKnownLoadW`
 */
export function calculateBuildingLoadFromBalance(input: BuildingLoadBalanceInput): Watt | null {
  const pvW = toNumberOrNull(input.pvW);
  const gridImportW = toNumberOrNull(input.gridImportW);
  const gridExportW = toNumberOrNull(input.gridExportW);
  const storageChargeW = toNumberOrNull(input.storageChargeW);
  const storageDischargeW = toNumberOrNull(input.storageDischargeW);
  const additionalKnownLoadW = toNumberOrNull(input.additionalKnownLoadW) ?? 0;

  if (pvW === null || gridImportW === null || gridExportW === null || storageChargeW === null || storageDischargeW === null) {
    return null;
  }

  return Math.max(0, pvW + gridImportW + storageDischargeW - gridExportW - storageChargeW + additionalKnownLoadW) as Watt;
}
