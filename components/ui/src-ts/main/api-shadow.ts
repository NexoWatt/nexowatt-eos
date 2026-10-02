/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Vergleicht Zustands-/Schreibpläne im Shadow-Pfad, damit typisierte Helfer mit dem bisherigen Verhalten abgeglichen werden können.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/main/api-shadow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { buildMainApiStateResponse, type MainApiStateResponse } from './api-state';
import { buildMainSettingsWritePlan, type MainApiSetRequest, type MainApiSetWriteResult } from './api-set';
import { extractRawValue, type MainRawState } from './state-cache';

/**
 * Datei: src-ts/main/api-shadow.ts
 *
 * Zweck:
 * Bereitet den Shadow-/Vergleichsmodus für `/api/state` und `/api/set` vor.
 *
 * Zusammenhang:
 * `main.js` bleibt produktiv weiterhin für API-Antworten und Schreiblogik zuständig.
 * Diese TypeScript-Helfer bauen parallel eine Vergleichsansicht, damit wir später
 * `/api/state` und `/api/set` sicher aus main.js auslagern können.
 *
 * Wichtig:
 * Diese Datei darf keine produktiven Werte überschreiben. Sie liefert nur Diagnose.
 */

export interface MainApiStateShadowSummaryMismatch {
  readonly key: string;
  readonly runtimeValue: unknown;
  readonly tsValue: unknown;
  readonly reason: 'missing-in-ts' | 'extra-in-ts' | 'value-mismatch';
}

export interface MainApiStateShadowSummary {
  readonly ok: boolean;
  readonly source: 'ts-main-api-state-shadow';
  readonly generatedAt: number;
  readonly runtimeCount: number;
  readonly tsCount: number;
  readonly mismatchCount: number;
  readonly mismatches: readonly MainApiStateShadowSummaryMismatch[];
  readonly note: string;
}

export interface MainApiSetShadowSummary {
  readonly ok: boolean;
  readonly source: 'ts-main-api-set-shadow';
  readonly generatedAt: number;
  readonly scope: string;
  readonly key: string;
  readonly supported: boolean;
  readonly plan?: MainApiSetWriteResult['plan'];
  readonly message?: string;
  readonly note: string;
}

/**
 * Code-Teil: valuesEqualForApiShadow
 *
 * Zweck:
 * Vergleicht Werte aus der aktuellen JS-API und der TS-Vorschau robust.
 *
 * Zusammenhang:
 * Der `/api/state`-Shadow darf nicht wegen Objektidentität anschlagen. Für einfache
 * Werte vergleichen wir direkt, für Objekte stabil über JSON.
 *
 * Wichtig:
 * 0, false und leere Strings bleiben gültige Werte und dürfen nicht als fehlend gelten.
 */
function valuesEqualForApiShadow(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  const aObj = a !== null && typeof a === 'object';
  const bObj = b !== null && typeof b === 'object';
  if (aObj || bObj) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (_err) { return false; }
  }
  return false;
}

/**
 * Code-Teil: runtimeApiValue
 *
 * Zweck:
 * Extrahiert den Wert aus der aktuellen Runtime-Antwortform.
 *
 * Zusammenhang:
 * `main.js` liefert aktuell direkt `stateCache` aus. Je nach Quelle kann der Wert als
 * `{ value }` oder `{ val }` vorliegen. Der Shadow nutzt dieselbe Semantik wie die
 * bestehenden StateCache-Helfer.
 */
function runtimeApiValue(raw: MainRawState | undefined): { present: boolean; value: unknown } {
  const picked = extractRawValue(raw);
  return { present: picked.hasValue, value: picked.value };
}

/**
 * Code-Teil: buildMainApiStateShadowSummary
 *
 * Zweck:
 * Baut parallel zur bestehenden `/api/state`-Antwort eine TypeScript-Vorschau und
 * vergleicht beide Wertemengen.
 *
 * Zusammenhang:
 * Diese Funktion ist der sichere Zwischenschritt vor einer späteren produktiven
 * Auslagerung von `/api/state`. Die Runtime bleibt dabei unverändert.
 */
export function buildMainApiStateShadowSummary(cache: Record<string, MainRawState | undefined>, generatedAt = Date.now()): MainApiStateShadowSummary {
  const tsResponse: MainApiStateResponse = buildMainApiStateResponse(cache, { generatedAt });
  const mismatches: MainApiStateShadowSummaryMismatch[] = [];
  const runtimeKeys = Object.keys(cache).filter((key) => runtimeApiValue(cache[key]).present);
  const tsKeys = Object.keys(tsResponse.states || {});
  const allKeys = new Set([...runtimeKeys, ...tsKeys]);

  for (const key of allKeys) {
    const runtime = runtimeApiValue(cache[key]);
    const tsEntry = tsResponse.states[key];
    const tsPresent = !!tsEntry && Object.prototype.hasOwnProperty.call(tsEntry, 'value') && tsEntry.value !== null && tsEntry.value !== undefined;
    if (runtime.present && !tsPresent) {
      mismatches.push({ key, runtimeValue: runtime.value, tsValue: undefined, reason: 'missing-in-ts' });
    } else if (!runtime.present && tsPresent) {
      mismatches.push({ key, runtimeValue: undefined, tsValue: tsEntry ? tsEntry.value : undefined, reason: 'extra-in-ts' });
    } else if (runtime.present && tsPresent && !valuesEqualForApiShadow(runtime.value, tsEntry ? tsEntry.value : undefined)) {
      mismatches.push({ key, runtimeValue: runtime.value, tsValue: tsEntry ? tsEntry.value : undefined, reason: 'value-mismatch' });
    }
  }

  return {
    ok: mismatches.length === 0,
    source: 'ts-main-api-state-shadow',
    generatedAt,
    runtimeCount: runtimeKeys.length,
    tsCount: tsKeys.length,
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 20),
    note: 'Diagnose: /api/state wird weiterhin von main.js geliefert; TypeScript vergleicht nur parallel.',
  };
}

/**
 * Code-Teil: buildMainApiSetShadowSummary
 *
 * Zweck:
 * Erstellt für `/api/set` einen TypeScript-Schreibplan, ohne diesen produktiv auszuführen.
 *
 * Zusammenhang:
 * Damit sehen wir früh, ob die spätere TypeScript-Auslagerung von `settings.*` dieselbe
 * Normalisierung liefern würde wie main.js. Nicht unterstützte Scopes sind kein Fehler.
 */
export function buildMainApiSetShadowSummary(request: MainApiSetRequest, generatedAt = Date.now()): MainApiSetShadowSummary {
  const result = buildMainSettingsWritePlan(request);
  return {
    ok: result.ok || request.scope !== 'settings',
    source: 'ts-main-api-set-shadow',
    generatedAt,
    scope: request.scope,
    key: request.key,
    supported: !!result.ok,
    ...(result.plan ? { plan: result.plan } : {}),
    ...(result.message ? { message: result.message } : {}),
    note: 'Diagnose: /api/set wird weiterhin von main.js ausgeführt; TypeScript erstellt nur einen Vergleichs-Schreibplan.',
  };
}
