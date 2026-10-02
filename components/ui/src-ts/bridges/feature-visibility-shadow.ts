/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vergleicht alternative Feature-Sichtbarkeitsberechnungen diagnostisch, ohne daraus einen zweiten produktiven Steuerpfad aufzubauen.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/bridges/feature-visibility-shadow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { FeatureVisibilityState } from '../contracts/features';
import { buildFeatureVisibilityState, type BuildFeatureVisibilityInput } from '../backend/feature-visibility/feature-visibility';

/**
 * Datei: src-ts/bridges/feature-visibility-shadow.ts
 *
 * Zweck:
 * Bereitet den späteren Shadow-Vergleich zwischen alter JavaScript-Feature-Sichtbarkeit
 * und neuer TypeScript-Sichtbarkeit vor.
 *
 * Zusammenhang:
 * Die produktive Runtime in `main.js`, `www/app.js`, `www/cockpit-shell.js` und den
 * Unterseiten wird in 0.7.73 noch nicht verändert. Dieser Bridge-Code erzeugt nur eine
 * sichere Vergleichsschicht, die später aktiviert werden kann, ohne sofort die Anzeige-
 * Logik zu ersetzen.
 *
 * Wichtig für spätere Änderungen:
 * - EVCS darf ohne echten Ladepunkt nicht sichtbar werden.
 * - Speicherfarm darf ohne echte Farm-Konfiguration nicht sichtbar werden.
 * - Die TypeScript-Entscheidung darf später erst produktiv werden, wenn die Shadow-
 *   Vergleiche keine fachlichen Abweichungen mehr zeigen.
 */

/** Name eines sichtbaren Kundenfeatures. */
export type FeatureVisibilityKey = keyof FeatureVisibilityState;

/** Ergebnis für ein einzelnes abweichendes Feature im Shadow-Vergleich. */
export interface FeatureVisibilityMismatch {
  /** Feature, bei dem alte JS-Logik und neue TS-Logik auseinanderlaufen. */
  readonly key: FeatureVisibilityKey;
  /** Wert der bisherigen JavaScript-/Runtime-Logik. */
  readonly legacyValue: boolean;
  /** Wert der neuen TypeScript-Vorbereitung. */
  readonly nextValue: boolean;
  /** Menschlich lesbarer Hinweis für Log/Diagnose. */
  readonly message: string;
}

/** Gesamtergebnis eines Feature-Sichtbarkeits-Shadow-Vergleichs. */
export interface FeatureVisibilityShadowReport {
  /** Ergebnis der bisherigen JS-Logik, das später aus der Runtime übergeben wird. */
  readonly legacy: FeatureVisibilityState;
  /** Ergebnis der neuen TS-Logik aus `buildFeatureVisibilityState`. */
  readonly next: FeatureVisibilityState;
  /** Abweichungen zwischen beiden Welten. Leere Liste = Verhalten passt zusammen. */
  readonly mismatches: ReadonlyArray<FeatureVisibilityMismatch>;
  /** true, wenn keine Abweichungen vorhanden sind. */
  readonly isMatch: boolean;
}

const visibilityKeys: ReadonlyArray<FeatureVisibilityKey> = [
  'hasEvcs',
  'hasStorageFarm',
  'hasSmartHome',
  'hasWeather',
  'hasAiAdvisor',
];

/**
 * Code-Teil: normalizeFeatureVisibilityState
 *
 * Zweck:
 * Normalisiert eine teilweise Feature-Sichtbarkeit auf eindeutige boolesche Werte.
 *
 * Zusammenhang:
 * Später kann die alte JavaScript-Runtime einzelne Felder aus `main.js` oder `www/app.js`
 * liefern. Dieser Helfer verhindert, dass `undefined` unterschiedlich interpretiert wird.
 *
 * Wichtig:
 * `false` ist ein gültiger Wert und darf niemals als „fehlend“ behandelt werden.
 */
export function normalizeFeatureVisibilityState(value: Partial<FeatureVisibilityState> | undefined): FeatureVisibilityState {
  return {
    hasEvcs: value?.hasEvcs === true,
    hasStorageFarm: value?.hasStorageFarm === true,
    hasSmartHome: value?.hasSmartHome === true,
    hasWeather: value?.hasWeather === true,
    hasAiAdvisor: value?.hasAiAdvisor === true,
  };
}

/**
 * Code-Teil: compareFeatureVisibility
 *
 * Zweck:
 * Vergleicht alte JavaScript-Sichtbarkeit und neue TypeScript-Sichtbarkeit feldweise.
 *
 * Zusammenhang:
 * Dieser Vergleich ist die spätere Grundlage für einen Shadow-Modus: Die Anzeige bleibt
 * zunächst bei der alten Runtime, während Abweichungen der TS-Logik nur diagnostiziert
 * werden. So vermeiden wir, dass EVCS/Speicherfarm wieder falsch sichtbar werden.
 */
export function compareFeatureVisibility(
  legacy: Partial<FeatureVisibilityState> | undefined,
  next: Partial<FeatureVisibilityState> | undefined,
): ReadonlyArray<FeatureVisibilityMismatch> {
  const normalizedLegacy = normalizeFeatureVisibilityState(legacy);
  const normalizedNext = normalizeFeatureVisibilityState(next);

  return visibilityKeys
    .filter((key) => normalizedLegacy[key] !== normalizedNext[key])
    .map((key) => ({
      key,
      legacyValue: normalizedLegacy[key],
      nextValue: normalizedNext[key],
      message: `Feature-Sichtbarkeit weicht ab: ${String(key)} legacy=${normalizedLegacy[key]} ts=${normalizedNext[key]}`,
    }));
}

/**
 * Code-Teil: buildFeatureVisibilityShadowReport
 *
 * Zweck:
 * Baut einen vollständigen Shadow-Bericht aus Eingabe-Nachweisen und altem Runtime-Ergebnis.
 *
 * Zusammenhang:
 * Später kann `main.js` oder `www/app.js` hier seine bisherige Sichtbarkeit übergeben.
 * Die TypeScript-Seite berechnet denselben Zustand aus den Nachweisen. Abweichungen werden
 * zuerst nur geloggt und nicht produktiv geschaltet.
 *
 * TypeScript-Migrationsregel:
 * Diese Funktion ist ein Bridge-Baustein. Sie darf die produktive Runtime erst ersetzen,
 * wenn Regressionstests und echte Anlagentests zeigen, dass `mismatches` leer bleiben.
 */
export function buildFeatureVisibilityShadowReport(
  input: BuildFeatureVisibilityInput,
  legacy: Partial<FeatureVisibilityState> | undefined,
): FeatureVisibilityShadowReport {
  const normalizedLegacy = normalizeFeatureVisibilityState(legacy);
  const next = buildFeatureVisibilityState(input);
  const mismatches = compareFeatureVisibility(normalizedLegacy, next);

  return {
    legacy: normalizedLegacy,
    next,
    mismatches,
    isMatch: mismatches.length === 0,
  };
}
