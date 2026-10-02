/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/ems“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/index.ts
 *
 * Zweck:
 * Zentrale TypeScript-Sammelstelle für EMS-nahe Migrationsbereiche.
 *
 * Strukturregel:
 * Fachliche EMS-Module liegen künftig nicht lose unter `utils`, sondern in passenden
 * Domänenordnern. Dadurch bleibt später erkennbar, ob ein TS-Codebereich zu Core-Limits,
 * Heizstab, EVCS, Speicherfarm, Peak-Shaving oder KI gehört.
 */
export * as coreLimits from './core-limits';
export * as heatingRod from './heating-rod';

/** Export: Charging-Management / EVCS TypeScript-Helfer. */
export * as chargingManagement from './charging-management';
