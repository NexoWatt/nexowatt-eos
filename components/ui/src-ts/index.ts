/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/index.ts
 *
 * Zweck:
 * TypeScript-Einstiegspunkt für die Migrationsbasis.
 *
 * Zusammenhang:
 * Der produktive Adapter startet weiterhin über `main.js`. Diese Datei bündelt
 * zentrale Verträge direkt und stellt reine Helfer bewusst im Namensraum `utils`
 * bereit. Dadurch vermeiden wir Namenskonflikte zwischen Verträgen und Helfern,
 * während die Migration Schritt für Schritt wächst.
 */

export * from './contracts';
export * as utils from './utils';

export * as resolvers from './resolvers';

export * as ems from './ems';

export * from './adapter';
