/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vergleicht im Browser die Sichtbarkeitswerte des Shadow-Pfads mit der produktiven Darstellung.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/feature-visibility-shadow-compare.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { CustomerFeatureVisibilitySnapshot } from './feature-visibility-diagnostics';

/**
 * Datei: src-ts/frontend/feature-visibility-shadow-compare.ts
 *
 * Zweck:
 * Bereitet den sicheren Vergleich zwischen alter JavaScript-Sichtbarkeitslogik und
 * neuer TypeScript-Sichtbarkeitslogik vor.
 *
 * Zusammenhang:
 * Bevor EVCS/Farm/SmartHome/Wetter/KI im produktiven Frontend auf TypeScript-Helfer
 * umgestellt werden, muss die neue TS-Entscheidung parallel gegen die alte JS-Logik
 * geprüft werden. Diese Datei liefert dafür einen reinen Vergleichshelfer ohne DOM.
 *
 * Wichtig:
 * Dieser Helfer darf keine Feature-Sichtbarkeit setzen. Er meldet nur Abweichungen.
 * Damit können wir in einem späteren Schritt einen Shadow-Compare in `www/app.js`
 * einbauen, ohne das Dashboard-Verhalten sofort zu verändern.
 */

/** Feature-Schlüssel, die im Kundenfrontend sichtbar/unsichtbar geschaltet werden. */
export type ShadowFeatureKey = keyof CustomerFeatureVisibilitySnapshot;

/** Einzelne Abweichung zwischen alter JS-Logik und neuer TS-Logik. */
export interface FeatureVisibilityShadowMismatch {
  /** Betroffenes Feature, z. B. `hasEvcs` oder `hasStorageFarm`. */
  readonly key: ShadowFeatureKey;
  /** Ergebnis der bestehenden JavaScript-Runtime-Logik. */
  readonly legacyValue: boolean;
  /** Ergebnis der neuen TypeScript-Spiegellogik. */
  readonly nextValue: boolean;
  /** Deutsche Diagnose, warum diese Abweichung wichtig ist. */
  readonly messageDe: string;
}

/** Ergebnis eines kompletten Shadow-Vergleichs. */
export interface FeatureVisibilityShadowCompareResult {
  /** `true`, wenn alte und neue Sichtbarkeit vollständig gleich sind. */
  readonly matches: boolean;
  /** Alle gefundenen Abweichungen. */
  readonly mismatches: ReadonlyArray<FeatureVisibilityShadowMismatch>;
  /** Kompakter deutscher Text für Debug-Konsole oder spätere Diagnose-States. */
  readonly summaryDe: string;
}

/** Reihenfolge ist bewusst stabil, damit Logs und Tests reproduzierbar bleiben. */
const FEATURE_KEYS: ReadonlyArray<ShadowFeatureKey> = [
  'hasEvcs',
  'hasStorageFarm',
  'hasSmartHome',
  'hasWeather',
  'hasAiAdvisor',
];

/**
 * Code-Teil: boolOrFalse
 *
 * Zweck:
 * Normalisiert optionale Feature-Werte zu echten Booleans.
 *
 * Zusammenhang:
 * Bestehende JS-Runtime kann Werte aus `window.__nw*`, Config oder State-Snapshots
 * liefern. Für den Vergleich muss daraus ein eindeutiger boolean werden.
 *
 * Wichtig:
 * Fehlende Werte werden hier als `false` gewertet. Das ist für Feature-Sichtbarkeit
 * sicherer als `true`, weil im Kundenfrontend nur vorhandene Anlagenfunktionen
 * sichtbar sein dürfen.
 */
function boolOrFalse(value: unknown): boolean {
  return value === true;
}

/**
 * Code-Teil: mismatchMessage
 *
 * Zweck:
 * Baut eine fachliche Diagnose für eine Abweichung.
 *
 * Zusammenhang:
 * Diese Texte helfen später im Shadow-Modus, direkt zu erkennen, ob z. B. EVCS oder
 * Speicherfarm durch alte Flags anders bewertet werden als durch die neue TS-Logik.
 */
function mismatchMessage(key: ShadowFeatureKey, legacyValue: boolean, nextValue: boolean): string {
  const featureName: Record<ShadowFeatureKey, string> = {
    hasEvcs: 'EVCS/Ladestation',
    hasStorageFarm: 'Speicherfarm',
    hasSmartHome: 'SmartHome',
    hasWeather: 'Wetter',
    hasAiAdvisor: 'KI-Berater',
  };
  return `${featureName[key]} weicht ab: alte JS-Logik=${legacyValue ? 'sichtbar' : 'unsichtbar'}, neue TS-Logik=${nextValue ? 'sichtbar' : 'unsichtbar'}.`;
}

/**
 * Code-Teil: compareFeatureVisibility
 *
 * Zweck:
 * Vergleicht zwei vollständige Sichtbarkeitszustände.
 *
 * Zusammenhang:
 * Späterer Kandidat für einen Shadow-Compare in `www/app.js`. Die bestehende Runtime
 * berechnet weiter die echte Anzeige; die TS-Logik läuft parallel und liefert nur
 * Diagnose, falls sich Entscheidungen unterscheiden.
 *
 * Wichtig:
 * Diese Funktion verändert keine DOM-Elemente und keine globalen Flags. Sie ist
 * dadurch risikoarm und kann vor einer produktiven Umstellung getestet werden.
 */
export function compareFeatureVisibility(
  legacy: Partial<CustomerFeatureVisibilitySnapshot>,
  next: Partial<CustomerFeatureVisibilitySnapshot>
): FeatureVisibilityShadowCompareResult {
  const mismatches: FeatureVisibilityShadowMismatch[] = [];

  for (const key of FEATURE_KEYS) {
    const legacyValue = boolOrFalse(legacy[key]);
    const nextValue = boolOrFalse(next[key]);
    if (legacyValue !== nextValue) {
      mismatches.push({
        key,
        legacyValue,
        nextValue,
        messageDe: mismatchMessage(key, legacyValue, nextValue),
      });
    }
  }

  const matches = mismatches.length === 0;
  return {
    matches,
    mismatches,
    summaryDe: matches
      ? 'Feature-Sichtbarkeit: alte JS-Logik und neue TS-Logik stimmen überein.'
      : `Feature-Sichtbarkeit: ${mismatches.length} Abweichung(en) zwischen JS- und TS-Logik.`,
  };
}

/**
 * Code-Teil: hasBlockingVisibilityMismatch
 *
 * Zweck:
 * Erkennt Abweichungen, die für Kundenanlagen besonders kritisch wären.
 *
 * Zusammenhang:
 * EVCS und Speicherfarm dürfen niemals sichtbar werden, wenn sie nicht vorhanden sind.
 * Darum werden Abweichungen bei diesen Features später als besonders wichtig geloggt.
 */
export function hasBlockingVisibilityMismatch(result: FeatureVisibilityShadowCompareResult): boolean {
  return result.mismatches.some((item) => item.key === 'hasEvcs' || item.key === 'hasStorageFarm');
}

/**
 * Code-Teil: formatFeatureVisibilityShadowLog
 *
 * Zweck:
 * Baut einen kompakten deutschen Logtext aus dem Vergleichsergebnis.
 *
 * Zusammenhang:
 * Für den späteren Runtime-Shadow-Modus wollen wir keine großen Objekte ungefiltert
 * in die Browserkonsole schreiben, sondern verständliche kurze Diagnosezeilen.
 */
export function formatFeatureVisibilityShadowLog(result: FeatureVisibilityShadowCompareResult): string {
  if (result.matches) return result.summaryDe;
  return `${result.summaryDe} ${result.mismatches.map((item) => item.messageDe).join(' ')}`;
}
