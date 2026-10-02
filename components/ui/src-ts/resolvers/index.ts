/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/resolvers“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/resolvers/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/resolvers/index.ts
 *
 * Zweck:
 * Bündelt die ersten produktionsnahen TypeScript-Resolver.
 *
 * Zusammenhang:
 * In 0.7.61 wird hier zunächst nur der Energiefluss-Resolver exportiert. Später folgen
 * weitere Resolver für Lizenz, Feature-Sichtbarkeit, App-Center und ioBroker-Statecache.
 */

export * from './energy-flow-resolver';

export * from './feature-visibility-resolver';
