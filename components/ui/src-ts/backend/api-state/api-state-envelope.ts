/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Erzeugt die gemeinsame API-Zustandshülle aus den bereitgestellten Werten und Kontextdaten.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/api-state/api-state-envelope.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { AdapterStateValue, FeatureVisibilityState, LicenseState, TimestampMs } from '../../contracts';
import type { ApiStateEnvelope } from '../../contracts/api-state';

/**
 * Datei: src-ts/backend/api-state/api-state-envelope.ts
 *
 * Zweck:
 * Bereitet die spätere TypeScript-Migration der `/api/state`-Antwort aus `main.js` vor.
 *
 * Zusammenhang:
 * Das Frontend liest `/api/state` für LIVE-Dashboard, History, SmartHome, Speicherfarm und KI.
 * Wenn diese Antwort später typisiert gebaut wird, müssen States, Feature-Sichtbarkeit und
 * Lizenzinformationen zusammenbleiben.
 */

/** Eingaben zum Aufbau einer typisierten `/api/state`-Antwort. */
export interface BuildApiStateEnvelopeInput {
  readonly states: Record<string, AdapterStateValue | undefined>;
  readonly generatedAt?: TimestampMs;
  readonly features?: FeatureVisibilityState;
  readonly license?: LicenseState;
}

/**
 * Code-Teil: buildApiStateEnvelope
 *
 * Zweck:
 * Baut eine minimale, typisierte API-Antwort für `/api/state`.
 *
 * Wichtig:
 * Diese Funktion verändert keine State-Werte. Sie verpackt nur vorhandene Werte in eine klare
 * Antwortstruktur. Dadurch ist sie risikoarm und später gut nach `main.ts` übernehmbar.
 */
export function buildApiStateEnvelope(input: BuildApiStateEnvelopeInput): ApiStateEnvelope {
  const states: ApiStateEnvelope['states'] = {};
  for (const [id, raw] of Object.entries(input.states)) {
    const value = (raw && Object.prototype.hasOwnProperty.call(raw, 'value'))
      ? (raw.value ?? null)
      : ((raw && Object.prototype.hasOwnProperty.call(raw, 'val')) ? (raw.val ?? null) : null);
    const entry: NonNullable<ApiStateEnvelope['states'][string]> = {
      id,
      value: value as NonNullable<ApiStateEnvelope['states'][string]>['value'],
      source: raw === undefined ? 'missing' : 'state-cache',
    };
    if (raw && typeof raw.ts === 'number') entry.ts = raw.ts;
    if (raw && typeof raw.lc === 'number') entry.lc = raw.lc;
    if (raw && typeof raw.ack === 'boolean') entry.ack = raw.ack;
    if (raw && typeof raw.q === 'number') entry.q = raw.q;
    states[id] = entry;
  }

  const envelope: ApiStateEnvelope = {
    ok: true,
    generatedAt: input.generatedAt ?? Date.now(),
    states,
    ...(input.features !== undefined ? { features: input.features } : {}),
    ...(input.license !== undefined ? { license: input.license } : {}),
  };

  return envelope;
}
