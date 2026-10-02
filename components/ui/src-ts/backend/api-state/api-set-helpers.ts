/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert Schreibanforderungen und deren Antworten für den Zustands-API-Pfad.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/api-state/api-set-helpers.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { ApiSetRequest, ApiSetResponse, StateWritePlan } from '../../contracts/api';

/**
 * Datei: src-ts/backend/api-state/api-set-helpers.ts
 *
 * Zweck:
 * Reine TypeScript-Helfer für spätere `/api/set`-Logik aus `main.js`.
 *
 * Zusammenhang:
 * Das Frontend schreibt Einstellungen, Mappings, Lizenz- und Steuerwerte über API-Endpunkte.
 * Aktuell liegt die produktive Logik in `main.js`. Diese Datei bereitet eine kleine,
 * typisierte und testbare Schreibplanung vor.
 */

/**
 * Code-Teil: normalizeApiSetKey
 *
 * Zweck:
 * Entfernt gefährliche Randpunkte und Whitespace aus einem API-Key.
 *
 * Wichtig:
 * Aus `scope` und `key` wird später eine State-ID gebaut. Leere oder kaputte Keys dürfen nicht
 * zu falschen Adapter-States führen.
 */
export function normalizeApiSetKey(key: unknown): string {
  return String(key ?? '').trim().replace(/^\.+|\.+$/g, '');
}

/**
 * Code-Teil: buildScopedStateId
 *
 * Zweck:
 * Baut eine lokale Adapter-State-ID aus Scope und Key.
 *
 * Beispiel:
 * `settings` + `aiAdvisorEnabled` wird zu `settings.aiAdvisorEnabled`.
 */
export function buildScopedStateId(scope: string, key: string): string {
  const cleanScope = normalizeApiSetKey(scope);
  const cleanKey = normalizeApiSetKey(key);
  return [cleanScope, cleanKey].filter(Boolean).join('.');
}

/**
 * Code-Teil: planApiStateWrite
 *
 * Zweck:
 * Erstellt aus einem API-Set-Request eine geplante State-Schreiboperation.
 *
 * Wichtig:
 * Diese Funktion schreibt noch nichts. Sie hält nur die spätere Regel fest, dass API-Requests
 * als Steuer-/Konfigurationsschreibungen standardmäßig `ack=false` verwenden.
 */
export function planApiStateWrite(request: ApiSetRequest, ack = false): StateWritePlan {
  const stateId = request.id ? normalizeApiSetKey(request.id) : buildScopedStateId(request.scope, request.key);
  return {
    stateId,
    value: request.value,
    ack,
    reason: `api-set:${request.scope}.${request.key}`,
  };
}

/**
 * Code-Teil: createApiSetResponse
 *
 * Zweck:
 * Baut eine kleine typisierte Antwort für erfolgreiche Set-Operationen.
 */
export function createApiSetResponse(request: ApiSetRequest, plan: StateWritePlan): ApiSetResponse {
  return {
    ok: true,
    scope: request.scope,
    key: request.key,
    writtenStateId: plan.stateId,
    message: 'queued',
  };
}
