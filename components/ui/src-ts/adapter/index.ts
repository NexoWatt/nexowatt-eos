/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/adapter“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/adapter/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die TypeScript-Vorbereitung der Adapter-API-Schicht.
 *
 * Zusammenhang:
 * Alles unter `src-ts/adapter/*` gehört fachlich zu `main.js`: StateCache, HTTP-API,
 * Schreibpläne und `info.connection`. Produktive Runtime bleibt in 0.7.63 weiterhin JS.
 */

/**
 * Code-Teil: Adapter-API-Exportpunkt
 *
 * Zweck:
 * Bündelt die vorbereiteten TypeScript-Helfer für `main.js`, damit spätere Runtime-
 * Auslagerungen nur noch einen stabilen Importpfad benötigen.
 *
 * Zusammenhang:
 * Produktiv bleibt `main.js`; diese Datei definiert nur die spätere modulare Grenze.
 */
export * as stateCache from './state-cache';
export * as apiState from './api-state';
export * as apiSet from './api-set';
export * as connectionState from './connection-state';
export * as settingsWrites from './settings-writes';
