/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „heating-rod“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/heating-rod.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { Percent, StateId, TimestampMs, Watt } from './units';

/**
 * Datei: src-ts/contracts/heating-rod.ts
 *
 * Zweck:
 * TypeScript-Verträge für die Heizstab-/Thermiksteuerung.
 *
 * Zusammenhang:
 * Die produktive Runtime sitzt aktuell in `ems/modules/heating-rod-control.js` und nutzt
 * die Budgets aus `core-limits.js`. Diese Verträge beschreiben, welche Konfigurations- und
 * Entscheidungswerte später typisiert zwischen App-Center, EMS-Budget und Heizstab laufen.
 *
 * Kritische Regel:
 * Die Speicherreserve darf nicht durch UI-Refresh oder Defaultwerte überschrieben werden.
 * Außerdem darf ein Heizstab nur die Leistung bekommen, die PV-/Netz-/Reservebudget zulässt.
 */

/** Betriebsart eines Heizstab-/Thermik-Verbrauchers. */
export type HeatingRodMode = 'off' | 'pvAuto' | 'manual';

/** Ergebnis der Stufenauswahl. */
export type HeatingRodDecisionReason =
  | 'off'
  | 'manual'
  | 'pv-budget'
  | 'storage-reserve'
  | 'grid-blocked'
  | 'no-stage'
  | 'missing-budget';

/** Einzelne Heizstabstufe. */
export interface HeatingRodStageConfig {
  stage: number;
  powerW: Watt;
  switchStateId?: StateId;
}

/** Fachliche Heizstab-Konfiguration aus App-Center/Admin. */
export interface HeatingRodDeviceConfig {
  id: string;
  name: string;
  enabled: boolean;
  mode: HeatingRodMode;
  stages: HeatingRodStageConfig[];
  storageReserveW: Watt;
  storageReserveSocPct: Percent;
  allowGridImport: boolean;
  allowStorageDischarge: boolean;
}

/** Eingabe für eine spätere typisierte Heizstabentscheidung. */
export interface HeatingRodDecisionInput {
  ts: TimestampMs;
  device: HeatingRodDeviceConfig;
  availablePvW: unknown;
  availableTotalW: unknown;
  storageSocPct?: unknown;
  storageDischargeW?: unknown;
  gridImportW?: unknown;
}

/** Ergebnis einer Heizstabentscheidung. */
export interface HeatingRodDecision {
  ts: TimestampMs;
  deviceId: string;
  targetStage: number;
  targetPowerW: Watt;
  allowedW: Watt;
  reason: HeatingRodDecisionReason;
  storageReserveActive: boolean;
  diagnosticText: string;
}
