/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vergleicht Formatierungsergebnisse diagnostisch mit dem erwarteten bisherigen Anzeigeverhalten.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/display-format-canary.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/frontend/display-format-canary.ts
 *
 * Zweck:
 * Diese Datei ist der erste sichere Laufzeit-Canary für die Frontend-TypeScript-Migration.
 * Sie vergleicht die alten JavaScript-Formatter aus `www/app.js` mit den neuen TypeScript-
 * Formatter-Spiegeln, ohne die Anzeige bereits produktiv umzuschalten.
 *
 * Zusammenhang:
 * - `src-ts/frontend/display-format.ts` enthält die neue typisierte Formatierung.
 * - `www/static/ts-mirrors/frontend/display-format.mjs` ist der generierte Browser-Spiegel.
 * - `www/app.js` lädt diesen Canary optional und loggt nur Diagnoseinformationen.
 *
 * Wichtig:
 * Dieser Canary darf keine UI-Werte verändern. Er ist nur ein Sicherheitsgurt, damit wir
 * später die Anzeigeformatierung kontrolliert auf TypeScript umstellen können.
 */

/** Kleine Menge an Formatfunktionen, die der Canary aus dem TS-Spiegel erwartet. */
export interface DisplayFormatterMirrorApi {
  readonly formatPowerValue: (value: unknown, options?: { readonly signed?: boolean; readonly decimals?: number }) => { readonly text: string };
  readonly formatEnergyValue: (value: unknown) => { readonly text: string };
  readonly formatPercentValue: (value: unknown) => { readonly text: string };
}

/** Legacy-Formatter aus `www/app.js`, die weiterhin Quelle der produktiven Anzeige bleiben. */
export interface LegacyDisplayFormatterApi {
  readonly formatPower: (value: unknown) => string;
  readonly formatEnergyKwh: (value: unknown) => string;
  readonly formatPercent?: (value: unknown) => string;
}

/** Einzelner Vergleichsfall zwischen Legacy-JS und TS-Spiegel. */
export interface DisplayFormatterCanaryCase {
  readonly key: string;
  readonly kind: 'power' | 'energy' | 'percent';
  readonly value: unknown;
  readonly expectedLegacy?: string;
}

/** Ergebnis eines einzelnen Canary-Vergleichs. */
export interface DisplayFormatterCanaryResult {
  readonly key: string;
  readonly kind: DisplayFormatterCanaryCase['kind'];
  readonly ok: boolean;
  readonly legacyText: string;
  readonly mirrorText: string;
}

/** Zusammenfassung, die `www/app.js` in die Konsole schreiben kann. */
export interface DisplayFormatterCanarySummary {
  readonly ok: boolean;
  readonly checked: number;
  readonly mismatches: readonly DisplayFormatterCanaryResult[];
  readonly results: readonly DisplayFormatterCanaryResult[];
}

/**
 * Code-Teil: defaultDisplayFormatterCanaryCases
 *
 * Zweck:
 * Enthält bewusst kleine, aber fachlich kritische Anzeige-Testwerte.
 *
 * Zusammenhang:
 * Die Fälle spiegeln Probleme aus dem Projekt wider: `0 W` darf nicht verschwinden,
 * kW-Werte müssen lesbar bleiben und Prozentwerte wie `0 %` sind gültig.
 */
export const defaultDisplayFormatterCanaryCases: readonly DisplayFormatterCanaryCase[] = Object.freeze([
  { key: 'power-zero', kind: 'power', value: 0 },
  { key: 'power-small', kind: 'power', value: 120 },
  { key: 'power-kw', kind: 'power', value: 1400 },
  { key: 'power-negative-storage', kind: 'power', value: -1400 },
  { key: 'energy-zero', kind: 'energy', value: 0 },
  { key: 'energy-mwh', kind: 'energy', value: 1234 },
  { key: 'percent-zero', kind: 'percent', value: 0 },
  { key: 'percent-normal', kind: 'percent', value: 39 },
]);

/**
 * Code-Teil: normalizeDisplayTextForCanary
 *
 * Zweck:
 * Normalisiert Anzeige-Texte für den Vergleich, ohne produktive UI-Ausgabe zu verändern.
 *
 * Zusammenhang:
 * Der alte JavaScript-Formatter und der neue TypeScript-Formatter dürfen anfangs leicht
 * unterschiedliche Nachkommastellen liefern. Für 0.7.73 loggen wir solche Abweichungen nur,
 * damit später bewusst entschieden wird, welcher Text Standard wird.
 */
export function normalizeDisplayTextForCanary(text: unknown): string {
  return String(text ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Code-Teil: runDisplayFormatterCanary
 *
 * Zweck:
 * Vergleicht die produktive Legacy-Formatierung mit dem TypeScript-Spiegel.
 *
 * Zusammenhang:
 * `www/app.js` ruft diese Funktion optional nach dem Laden der MJS-Spiegel auf. Das Ergebnis
 * wird nur als Diagnose gespeichert/geloggt. Die Live-Anzeige nutzt in diesem Schritt weiter
 * die vorhandene JavaScript-Formatierung.
 */
export function runDisplayFormatterCanary(
  mirror: DisplayFormatterMirrorApi,
  legacy: LegacyDisplayFormatterApi,
  cases: readonly DisplayFormatterCanaryCase[] = defaultDisplayFormatterCanaryCases,
): DisplayFormatterCanarySummary {
  const results: DisplayFormatterCanaryResult[] = [];

  for (const item of cases) {
    let legacyText = '';
    let mirrorText = '';

    if (item.kind === 'power') {
      legacyText = legacy.formatPower(item.value);
      mirrorText = mirror.formatPowerValue(item.value).text;
    } else if (item.kind === 'energy') {
      legacyText = legacy.formatEnergyKwh(item.value);
      mirrorText = mirror.formatEnergyValue(item.value).text;
    } else {
      legacyText = legacy.formatPercent ? legacy.formatPercent(item.value) : `${Math.round(Number(item.value) || 0)} %`;
      mirrorText = mirror.formatPercentValue(item.value).text;
    }

    const normalizedLegacy = normalizeDisplayTextForCanary(item.expectedLegacy ?? legacyText);
    const normalizedMirror = normalizeDisplayTextForCanary(mirrorText);
    results.push({
      key: item.key,
      kind: item.kind,
      ok: normalizedLegacy === normalizedMirror,
      legacyText,
      mirrorText,
    });
  }

  const mismatches = results.filter((row) => !row.ok);
  return {
    ok: mismatches.length === 0,
    checked: results.length,
    mismatches,
    results,
  };
}
