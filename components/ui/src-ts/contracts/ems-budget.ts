/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „ems-budget“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/ems-budget.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { Percent, TimestampMs, Watt } from './units';

/**
 * Datei: src-ts/contracts/ems-budget.ts
 *
 * Zweck:
 * TypeScript-Verträge für die zentrale EMS-Budgetlogik. Diese Werte bilden später die
 * Brücke zwischen Energiefluss, Heizstab, EVCS, Peak-Shaving, KI-Berater und History.
 *
 * Zusammenhang:
 * Die produktive Logik sitzt aktuell noch in `ems/modules/core-limits.js`. Diese Verträge
 * legen fest, welche Eingänge und Ausgänge dieser Bereich langfristig typisiert liefern
 * soll, ohne die Runtime in diesem Migrationsschritt zu verändern.
 *
 * Wichtig:
 * Wattwerte sind immer positiv, sobald sie ein Budget oder eine Reserve beschreiben.
 * Ein Wert von 0 W ist gültig und darf nicht als „fehlend“ behandelt werden.
 */

/** Fachlicher Grund, warum ein Budget begrenzt wurde. */
export type BudgetLimitReason =
  | 'pv-surplus'
  | 'grid-limit'
  | 'storage-reserve'
  | 'peak-shaving'
  | 'para14a'
  | 'manual-limit'
  | 'missing-input'
  | 'none';

/** Beschreibt ein einzelnes Budget-Gate, z. B. PV, Netz oder Gesamtlimit. */
export interface CoreBudgetGate {
  /** Roh verfügbare Leistung vor Abzug von Reserven. */
  rawW: Watt;

  /** Effektiv verfügbare Leistung nach Limits und Reserven. */
  effectiveW: Watt;

  /** Grund für die stärkste Begrenzung. */
  reason: BudgetLimitReason;

  /** Kurzer Diagnosehinweis für Statusseite/Logs. */
  diagnosticText?: string;
}

/** Eingabe für die spätere zentrale EMS-Budgetberechnung. */
export interface CoreBudgetInput {
  /** Zeitpunkt der Messwertbasis. */
  ts: TimestampMs;

  /** Aktuell nutzbarer PV-Überschuss in Watt. */
  pvSurplusW: unknown;

  /** Aktueller Netzbezug in Watt. */
  gridImportW: unknown;

  /** Optionales Netzanschluss-/Peak-Limit in Watt. */
  gridImportLimitW?: unknown;

  /**
   * Optionaler oberer Gesamtbudget-Deckel in Watt.
   *
   * Zweck:
   * Die bestehende JS-Core-Limits-Runtime kennt zusätzliche High-Level-Caps, die nicht
   * identisch mit `PV-Budget + Netz-Headroom` sind. Für den Shadow-Vergleich muss die
   * TS-Schicht diesen Deckel kennen, sonst entstehen scheinbare Abweichungen wie
   * `JS 11000 W` gegen `TS 29700 W`, obwohl nur unterschiedliche Budgetbegriffe
   * verglichen wurden.
   */
  totalBudgetCapW?: unknown;

  /** Aktuelle Speicher-Ladeleistung in Watt. */
  storageChargeW?: unknown;

  /** Aktuelle Speicher-Entladeleistung in Watt. */
  storageDischargeW?: unknown;

  /** Speicher-SoC in Prozent, falls vorhanden. */
  storageSocPct?: unknown;

  /** Mindest-SoC, ab dem Speicherreserve geschützt werden soll. */
  storageReserveSocPct?: unknown;

  /** Leistungsreserve in Watt, die für Speicher/Peak/Grundlast freigehalten werden soll. */
  storageReserveW?: unknown;

  /** Bereits durch andere Verbraucher reservierte Leistung in Watt. */
  alreadyReservedW?: unknown;

  /** True, wenn Speicherentladung für Verbraucher erlaubt ist. */
  allowStorageDischarge?: boolean;

  /** True, wenn Netzbezug für Verbraucher erlaubt ist. */
  allowGridImport?: boolean;

  /** True, wenn ein Peak-Shaving-Zustand aktuell aktiv begrenzt. */
  peakShavingActive?: boolean;

  /** True, wenn §14a oder ein anderes externes Limit aktiv begrenzt. */
  externalLimitActive?: boolean;
}

/** Ergebnis der zentralen Budgetberechnung. */
export interface CoreBudgetSnapshot {
  ts: TimestampMs;
  pv: CoreBudgetGate;
  grid: CoreBudgetGate;
  total: CoreBudgetGate;

  /** Gibt an, ob die Speicherreserve aktuell unterschritten bzw. zu schützen ist. */
  storageReserveActive: boolean;

  /** SoC-Wert, der für die Reserveentscheidung verwendet wurde. */
  storageSocPct: Percent | null;

  /** Leistungsreserve in Watt, die aktiv vom Verbraucherbudget abgezogen wurde. */
  appliedStorageReserveW: Watt;

  /** Leistung, die bereits durch andere Verbraucher/Module reserviert wurde. */
  alreadyReservedW: Watt;

  /** Text, der später in Status/Diagnose angezeigt werden kann. */
  diagnosticText: string;
}
