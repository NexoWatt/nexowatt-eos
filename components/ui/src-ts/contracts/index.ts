/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/contracts“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/contracts/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/contracts/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die ersten TypeScript-Verträge.
 * Neue TS-Dateien sollen bevorzugt von hier importieren, damit die Migration geordnet bleibt.
 */

export * from './units';
export * from './energy-flow';
export * from './features';
export * from './ai-advisor';
export * from './license';
export * from './datapoints';
export * from './iobroker-states';
export * from './api';
export * from './adapter-api';
export * from './testing';

export * from './ems-budget';

export * from './heating-rod';

export * as apiStateContracts from './api-state';

/**
 * Code-Teil: History-Verträge exportieren
 *
 * Zweck:
 * Macht die History-/Report-Datenverträge für spätere Migrationen zentral verfügbar.
 */
export * from './history';
