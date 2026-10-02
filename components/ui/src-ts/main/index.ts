/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/main“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/main/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die ersten echten TypeScript-Helfer aus main.js.
 *
 * Zusammenhang:
 * Diese Helfer werden in 0.7.98 noch nicht produktiv von main.js genutzt. Sie sind aber
 * echte, kompilierbare TS-Module mit CommonJS-Spiegeln unter `lib/ts-mirrors/main/`.
 */
/**
 * Code-Teil: Main-Helfer exportieren
 *
 * Zweck:
 * Bündelt die einzelnen TypeScript-Helfer für StateCache, /api/state, /api/set,
 * info.connection und Lizenz. Später kann main.ts über diesen Exportpunkt gezielt
 * Teile aus main.js übernehmen, ohne direkte Querimporte zu verteilen.
 */
export * from './state-cache';
export * from './api-state';
export * from './api-set';
export * from './info-connection';
export * from './license-key';
export { buildMainApiStateShadowSummary, buildMainApiSetShadowSummary } from './api-shadow';
export type { MainApiStateShadowSummary, MainApiSetShadowSummary } from './api-shadow';
