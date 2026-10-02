# src-ts/main/api-shadow.ts

Vergleicht Zustands-/Schreibpläne im Shadow-Pfad, damit typisierte Helfer mit dem bisherigen Verhalten abgeglichen werden können.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/main/api-shadow.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./api-state` | [src-ts/main/api-state.ts](../../../../src-ts/main/api-state.ts) |
| `./api-set` | [src-ts/main/api-set.ts](../../../../src-ts/main/api-set.ts) |
| `./state-cache` | [src-ts/main/state-cache.ts](../../../../src-ts/main/state-cache.ts) |

**Direkt importiert von:**

- [src-ts/main/index.ts](../../../../src-ts/main/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`valuesEqualForApiShadow`](../../../../src-ts/main/api-shadow.ts#L71) | a, b | JSON.stringify, Number.isNaN, Object.is |
| [`runtimeApiValue`](../../../../src-ts/main/api-shadow.ts#L93) | raw | extractRawValue |
| [`buildMainApiStateShadowSummary`](../../../../src-ts/main/api-shadow.ts#L109) | cache, generatedAt | Date.now, Object.keys, Object.prototype.hasOwnProperty.call, buildMainApiStateResponse, mismatches.push, mismatches.slice, runtimeApiValue, valuesEqualForApiShadow |
| [`buildMainApiSetShadowSummary`](../../../../src-ts/main/api-shadow.ts#L151) | request, generatedAt | Date.now, buildMainSettingsWritePlan |
