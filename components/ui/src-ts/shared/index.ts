/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/shared“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/shared/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { Watt } from '../contracts';

/**
 * Gemeinsame TypeScript-Achse für reine Helfer.
 *
 * Zweck:
 * Hier sollen später ausschließlich nebenwirkungsfreie Hilfsfunktionen liegen,
 * die Backend und Frontend identisch verwenden können.
 *
 * Wichtig:
 * Keine ioBroker-Adapterobjekte, keine DOM-Zugriffe und keine Dateisystemzugriffe
 * in diesem gemeinsamen Bereich. Dadurch bleiben Tests und spätere TS-Migration
 * risikoarm.
 */
export interface SharedMigrationSmokeTest {
  readonly valueW?: Watt;
}

/** Marker-Wert für Typechecks ohne Laufzeitwirkung. */
export const sharedMigrationScaffold = 'shared-ts-scaffold-0758' as const;
