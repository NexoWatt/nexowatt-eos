/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/frontend“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AiAdvisorSuggestion, FeatureVisibilityState } from '../contracts';

/**
 * Frontend-TypeScript-Einstieg für die schrittweise Migration.
 *
 * Zweck:
 * Diese Datei enthält noch keine produktive Browserlogik. Sie prüft nur, dass
 * zentrale VIS-Verträge im Frontend-Kontext ohne Node-spezifische Typen nutzbar sind.
 *
 * Zusammenhang:
 * Spätere Versionen lagern aus `www/app.js`, `www/history.js` und
 * `www/smarthome.js` zunächst reine Format-/Visibility-Helfer hierher aus.
 */
export interface FrontendMigrationSmokeTest {
  readonly featureVisibility?: FeatureVisibilityState;
  readonly topSuggestion?: AiAdvisorSuggestion;
}

/** Marker-Wert für Typechecks ohne Laufzeitwirkung. */
export const frontendMigrationScaffold = 'frontend-ts-scaffold-0758' as const;

export * from './display-format';
export * from './customer-feature-visibility';

export * from './dashboard-display';
export * from './history-controls';
export * from './display-format-canary';
