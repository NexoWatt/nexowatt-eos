# src-ts/backend/main-helpers/api-state-main.ts

Kapselt die typisierten Hilfsschritte zum Aufbau der Zustandsantwort im Adapter-Kern.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/main-helpers/api-state-main.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/iobroker-states` | [src-ts/contracts/iobroker-states.ts](../../../../../src-ts/contracts/iobroker-states.ts) |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |
| `../state-cache/state-cache` | [src-ts/backend/state-cache/state-cache.ts](../../../../../src-ts/backend/state-cache/state-cache.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`toMainApiStateEntry`](../../../../../src-ts/backend/main-helpers/api-state-main.ts#L49) | raw | Number, Number.isFinite, getStateTimestamp, getStateValue, hasExplicitStateValue |
| [`buildMainApiStateResponse`](../../../../../src-ts/backend/main-helpers/api-state-main.ts#L73) | cache, includeKeys, generatedAt | Date.now, Object.keys, toMainApiStateEntry |
