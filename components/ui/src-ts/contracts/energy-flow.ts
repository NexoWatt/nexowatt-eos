/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „energy-flow“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/energy-flow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { Percent, StateId, TimestampMs, Watt } from './units';

/**
 * Datei: src-ts/contracts/energy-flow.ts
 *
 * Zweck:
 * TypeScript-Verträge für den Energiefluss. Diese Typen beschreiben die wichtigste
 * Fachregel im Projekt: PV, Netz, Speicher, Gebäude und optionale Verbraucher müssen
 * in Frontend, Backend, History, Heizstab und KI gleich interpretiert werden.
 *
 * Kritische Regel:
 * Speicher können als signed DP, als getrennte Lade-/Entlade-DPs oder gar nicht
 * gemappt sein. Wenn echte DPs vorhanden sind, sind sie Quelle der Wahrheit.
 */

/** Quelle, aus der ein Energieflusswert stammt. */
export type FlowValueSource =
  | 'mapped-dp'
  | 'signed-dp'
  | 'split-dp'
  | 'calculated'
  | 'default-zero'
  | 'missing';

/** Richtung einer signed Batterie-Leistung. */
export type StorageSignedConvention =
  | 'positive-discharge'
  | 'positive-charge'
  | 'unknown';

/** Vorzeichen-Konvention eines signed Netzanschlusspunktes. */
export type GridSignedConvention =
  | 'positive-import'
  | 'positive-export'
  | 'unknown';

/**
 * Qualitätsstufe einer Resolver-Entscheidung.
 *
 * Zweck:
 * Spätere Runtime-Resolver müssen nicht nur wissen, welchen Zahlenwert sie nutzen,
 * sondern auch, ob dieser aus einem echten DP, aus einer Bilanzrechnung oder aus
 * einem fehlenden/ungültigen konfigurierten DP kommt.
 */
export type FlowResolverQuality =
  | 'measured'
  | 'calculated'
  | 'configured-missing'
  | 'missing';

/**
 * Ergebnis der Speicherauflösung.
 *
 * Zusammenhang:
 * Dieser Vertrag ist Vorlage für Resolver in `main.js`, `www/app.js`,
 * `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js`.
 */
export interface StorageFlowResult {
  /** Speicher lädt in Watt. Immer positiv oder 0. */
  chargeW: Watt;

  /** Speicher entlädt in Watt. Immer positiv oder 0. */
  dischargeW: Watt;

  /** Signed Batterie-Leistung, falls vorhanden. Konvention wird über `signedConvention` erklärt. */
  signedW: Watt | null;

  /** Speicher-SoC in Prozent, falls vorhanden. */
  socPct: Percent | null;

  /** Quelle der verwendeten Speicherwerte. */
  source: FlowValueSource;

  /** Vorzeichen-Konvention, wenn `signedW` verwendet wurde. */
  signedConvention: StorageSignedConvention;

  /** Gibt an, ob ein echter Speicher-DP gemappt war. Dann darf kein Fallback darübergelegt werden. */
  hasConfiguredStorageDp: boolean;

  /** Diagnosehinweis für UI/Logs, warum ein Fallback genutzt oder nicht genutzt wurde. */
  diagnosticText?: string;

  /** Typisierte Qualitätsstufe der Entscheidung; vorbereitet für spätere Runtime-Diagnose. */
  quality?: FlowResolverQuality;
}


/** Netzfluss nach Aufteilung in Bezug und Einspeisung. */
export interface GridFlowResult {
  /** Netzbezug in Watt. Immer positiv oder 0. */
  importW: Watt;

  /** Netzeinspeisung in Watt. Immer positiv oder 0. */
  exportW: Watt;

  /** Signed Netzanschlusspunkt, falls vorhanden. */
  signedW: Watt | null;

  /** Quelle der Netzwerte. */
  source: FlowValueSource;
}

/**
 * Zentrale Momentaufnahme des Energieflusses.
 *
 * Wichtig für spätere TypeScript-Migration:
 * Diese Struktur sollte langfristig die gemeinsame Datenbasis für LIVE, History,
 * Heizstab, KI-Berater und EMS-Budgetlogik werden.
 */
export interface EnergyFlowSnapshot {
  ts: TimestampMs;
  pvW: Watt;
  buildingLoadW: Watt | null;
  grid: GridFlowResult;
  storage: StorageFlowResult;
  evcsW: Watt;
  heatingRodW: Watt;
  thermalW: Watt;
  residualLoadW: Watt | null;
}

/** Mapping-Beschreibung für einen einzelnen Energiefluss-DP. */
export interface EnergyFlowDatapointMapping {
  key: string;
  id: StateId;
  unit?: string;
  invert?: boolean;
  sourceHint?: 'pv' | 'grid' | 'storage' | 'load' | 'evcs' | 'thermal' | 'other';
}


/**
 * Eingabe für den zukünftigen TypeScript-Speicherresolver.
 *
 * Zweck:
 * Beschreibt alle Messwert-Varianten, die der Adapter seit der alten Version
 * unterstützen muss: signed Batterie-DP, getrennte Lade-/Entlade-DPs und
 * optionaler Rechenfallback.
 *
 * Wichtig:
 * Ein konfigurierter Speicher-DP mit 0 W ist ein gültiger Messwert. Diese
 * Struktur unterscheidet daher ausdrücklich zwischen „DP ist konfiguriert“
 * und „DP-Wert ist numerisch 0“.
 */
export interface StorageFlowResolverInput {
  /** Signed Speicherleistung, falls ein einzelner Batterie-Leistungs-DP gemappt wurde. */
  signedW?: unknown;

  /** Getrennter Ladeleistungs-DP, falls das Speichersystem split-DPs liefert. */
  chargeW?: unknown;

  /** Getrennter Entladeleistungs-DP, falls das Speichersystem split-DPs liefert. */
  dischargeW?: unknown;

  /** Speicher-SoC in Prozent, falls vorhanden. */
  socPct?: unknown;

  /** True, wenn ein signed Batterie-DP fachlich konfiguriert/gemappt ist. */
  hasConfiguredSignedDp?: boolean;

  /** True, wenn Lade- oder Entlade-DP fachlich konfiguriert/gemappt ist. */
  hasConfiguredSplitDp?: boolean;

  /** True, wenn ein Ladeleistungs-DP fachlich konfiguriert ist. */
  hasConfiguredChargeDp?: boolean;

  /** True, wenn ein Entladeleistungs-DP fachlich konfiguriert ist. */
  hasConfiguredDischargeDp?: boolean;

  /** Vorzeichen-Konvention für signed Speicherleistung. */
  signedConvention?: StorageSignedConvention;

  /** Fallback aus Bilanzrechnung. Darf nur genutzt werden, wenn kein echter Speicher-DP vorhanden ist. */
  calculatedSignedW?: unknown;


  /** PV-Leistung für einen optionalen Bilanz-Fallback. */
  pvW?: unknown;

  /** Gebäudelast für einen optionalen Bilanz-Fallback. */
  buildingLoadW?: unknown;

  /** Netzbezug für einen optionalen Bilanz-Fallback. */
  gridImportW?: unknown;

  /** Netzeinspeisung für einen optionalen Bilanz-Fallback. */
  gridExportW?: unknown;

  /** Diagnosehinweis, warum ein berechneter Wert entstanden ist. */
  calculatedReason?: string;
}


/** Eingabe für den zukünftigen TypeScript-Netzresolver. */
export interface GridFlowResolverInput {
  /** Signed Netzanschlusspunkt, falls vorhanden. */
  signedW?: unknown;

  /** Getrennter Netzbezug in Watt. */
  importW?: unknown;

  /** Getrennte Netzeinspeisung in Watt. */
  exportW?: unknown;

  /** True, wenn ein signed Netz-DP konfiguriert ist. */
  hasConfiguredSignedDp?: boolean;

  /** True, wenn Import- oder Export-DP konfiguriert ist. */
  hasConfiguredSplitDp?: boolean;

  /** True, wenn ein Netzbezugs-DP fachlich konfiguriert ist. */
  hasConfiguredImportDp?: boolean;

  /** True, wenn ein Netzeinspeisungs-DP fachlich konfiguriert ist. */
  hasConfiguredExportDp?: boolean;

  /** Vorzeichen-Konvention für signed Netzleistung. */
  signedConvention?: GridSignedConvention;
}

/** Eingabe für reine Bilanzrechnung des Gebäudeverbrauchs. */
export interface BuildingLoadBalanceInput {
  pvW?: unknown;
  gridImportW?: unknown;
  gridExportW?: unknown;
  storageChargeW?: unknown;
  storageDischargeW?: unknown;
  additionalKnownLoadW?: unknown;
}

/**
 * Eingabe für einen produktionsnahen, aber noch nicht verdrahteten Energiefluss-Resolver.
 *
 * Zweck:
 * Dieser Vertrag bündelt die Werte, die später aus `main.js`, `www/app.js`,
 * `core-limits.js` und `heating-rod-control.js` in einen gemeinsamen TypeScript-
 * Resolver fließen sollen.
 *
 * Wichtig:
 * Diese Struktur ist bewusst konservativ. Direkte Messwerte müssen vor berechneten
 * Fallbacks stehen, damit Historie und Dashboard keine falschen Ersatzwerte schreiben.
 */
export interface EnergyFlowResolverInput {
  /** Zeitpunkt der Momentaufnahme in Millisekunden. */
  ts: TimestampMs;

  /** PV-Leistung in Watt. Negative Werte werden im Resolver auf 0 normalisiert. */
  pvW?: unknown;

  /** Optional direkt gemessener Gebäudeverbrauch. Wenn vorhanden, ist dieser Wert Quelle der Wahrheit. */
  buildingLoadW?: unknown;

  /** Netzwerte, signed oder split. */
  grid: GridFlowResolverInput;

  /** Speicherwerte, signed, split oder berechnet. */
  storage: StorageFlowResolverInput;

  /** Optionale Verbraucherleistungen, die später für Restlast/KPIs genutzt werden. */
  evcsW?: unknown;
  heatingRodW?: unknown;
  thermalW?: unknown;
}



/** Ergebnis einer Gebäudelast-Bilanzrechnung. */
export interface BuildingLoadBalanceResult {
  /** Gebäudelast in Watt oder null, wenn die Bilanz nicht belastbar ist. */
  buildingLoadW: Watt | null;

  /** Quelle der Gebäudelast. Aktuell nur calculated/missing als Vorbereitung. */
  source: FlowValueSource;

  /** Diagnosehinweis für Tests, UI oder spätere Logs. */
  diagnosticText: string;
}
