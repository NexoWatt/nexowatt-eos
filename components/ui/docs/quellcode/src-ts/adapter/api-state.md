# src-ts/adapter/api-state.ts

Bereitet die Wertehülle der Zustands-API für die konsumierenden Browserbereiche auf.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/adapter/api-state.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/api` | [src-ts/contracts/api.ts](../../../../src-ts/contracts/api.ts) |
| `../contracts/iobroker-states` | [src-ts/contracts/iobroker-states.ts](../../../../src-ts/contracts/iobroker-states.ts) |
| `../contracts/units` | [src-ts/contracts/units.ts](../../../../src-ts/contracts/units.ts) |
| `./state-cache` | [src-ts/adapter/state-cache.ts](../../../../src-ts/adapter/state-cache.ts) |

**Direkt importiert von:**

- [src-ts/adapter/index.ts](../../../../src-ts/adapter/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`toApiStateEntry`](../../../../src-ts/adapter/api-state.ts#L34) | id, raw | isStateValuePresent, normalizeStateEntry |
| [`shouldExposeStateKey`](../../../../src-ts/adapter/api-state.ts#L46) | key, options | Array.isArray, options.includeOnlyKeys.includes |
| [`buildApiStateResponse`](../../../../src-ts/adapter/api-state.ts#L57) | cache, options | Date.now, Object.entries, shouldExposeStateKey, toApiStateEntry |
