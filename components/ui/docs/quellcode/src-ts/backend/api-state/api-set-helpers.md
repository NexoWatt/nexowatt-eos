# src-ts/backend/api-state/api-set-helpers.ts

Normalisiert Schreibanforderungen und deren Antworten für den Zustands-API-Pfad.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/api-state/api-set-helpers.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/api` | [src-ts/contracts/api.ts](../../../../../src-ts/contracts/api.ts) |

**Direkt importiert von:**

- [src-ts/backend/api-state/index.ts](../../../../../src-ts/backend/api-state/index.ts)
- [src-ts/backend/main-helpers/settings-write-main.ts](../../../../../src-ts/backend/main-helpers/settings-write-main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeApiSetKey`](../../../../../src-ts/backend/api-state/api-set-helpers.ts#L33) | key | String |
| [`buildScopedStateId`](../../../../../src-ts/backend/api-state/api-set-helpers.ts#L46) | scope, key | normalizeApiSetKey |
| [`planApiStateWrite`](../../../../../src-ts/backend/api-state/api-set-helpers.ts#L62) | request, ack | buildScopedStateId, normalizeApiSetKey |
| [`createApiSetResponse`](../../../../../src-ts/backend/api-state/api-set-helpers.ts#L78) | request, plan | – |
