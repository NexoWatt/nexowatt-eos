/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „datapoints“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/datapoints.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { StateId } from './units';

/**
 * Datei: src-ts/contracts/datapoints.ts
 *
 * Zweck:
 * Gemeinsame Typen für Datenpunkt-Mapping und Datenpunkt-Diagnose.
 *
 * Zusammenhang:
 * Das App-Center schreibt Mapping-Konfigurationen, `main.js` liest die ioBroker-States
 * und Frontend/EMS-Module nutzen daraus kanonische Werte. Änderungen an diesen Strukturen
 * beeinflussen fast alle Projektbereiche.
 */

export type DatapointDirection = 'read' | 'write' | 'readwrite';

export type DatapointValueKind = 'number' | 'boolean' | 'string' | 'json' | 'unknown';

export interface DatapointDefinition {
  key: string;
  label: string;
  direction: DatapointDirection;
  valueKind: DatapointValueKind;
  unit?: string;
  required?: boolean;
}

export interface DatapointBinding {
  key: string;
  id: StateId;
  invert?: boolean;
  scale?: number;
  offset?: number;
}

export interface DatapointReadResult<T = unknown> {
  id: StateId;
  key: string;
  value: T | null;
  ts?: number;
  lc?: number;
  quality?: number;
  source: 'ioBroker' | 'cache' | 'fallback' | 'missing';
}
