/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/utils“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/utils/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/utils/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für erste reine TypeScript-Helfer.
 *
 * Wichtig:
 * Diese Helfer werden noch nicht in der produktiven Runtime importiert. Sie dienen
 * in 0.7.58 als Build-/Testbasis für die schrittweise Migration.
 */

export * from './number';
export * from './clock';

export * from './energy-flow';
