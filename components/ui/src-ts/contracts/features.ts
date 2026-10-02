/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert den gemeinsamen TypeScript-Datenvertrag „features“, auf den sich die importierenden Bereiche beim Austausch ihrer Werte beziehen.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/features.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { StateId } from './units';

/**
 * Datei: src-ts/contracts/features.ts
 *
 * Zweck:
 * Verträge für die Feature-Sichtbarkeit im Kunden-Frontend.
 *
 * Warum das wichtig ist:
 * In den letzten UI-Versionen wurden teilweise Funktionen angezeigt, die in einer
 * Kundenanlage gar nicht vorhanden waren. Diese Typen halten fest, welche Bedingungen
 * erfüllt sein müssen, bevor EVCS, Speicherfarm oder SmartHome sichtbar sein dürfen.
 */

/** Sichtbarkeit der Hauptfunktionen im Kunden-Frontend. */
export interface FeatureVisibilityState {
  /** EVCS nur sichtbar, wenn mindestens ein echter Ladepunkt mit Mess-/Steuer-DP konfiguriert ist. */
  hasEvcs: boolean;

  /** Speicherfarm nur sichtbar, wenn Farm aktiv und echte Farmspeicher konfiguriert sind. */
  hasStorageFarm: boolean;

  /** SmartHome nur sichtbar, wenn das Feature im Installer aktiviert wurde. */
  hasSmartHome: boolean;

  /** Wetter nur sichtbar, wenn Wetter-App aktiv und Daten vorhanden sind. */
  hasWeather: boolean;

  /** KI-Berater nur sichtbar, wenn App aktiv und Kundenschalter an ist. */
  hasAiAdvisor: boolean;
}

/** Minimaler Nachweis, dass ein Ladepunkt wirklich existiert. */
export interface EvcsPresenceProof {
  index: number;
  name?: string;
  measuredPowerDp?: StateId;
  controlDp?: StateId;
  hasAnyRealDatapoint: boolean;
}

/** Minimaler Nachweis, dass ein Speicherfarm-Speicher wirklich existiert. */
export interface StorageFarmPresenceProof {
  index: number;
  name?: string;
  socDp?: StateId;
  chargeDp?: StateId;
  dischargeDp?: StateId;
  signedPowerDp?: StateId;
  hasAnyRealDatapoint: boolean;
}
