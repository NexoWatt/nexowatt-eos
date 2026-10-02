# src-ts/backend/state-cache/state-cache.ts

Normalisiert Zugriffe auf gespeicherte ioBroker-Werte und unterscheidet fehlende Werte von gültigen Null-/False-Werten.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/state-cache/state-cache.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/iobroker-states` | [src-ts/contracts/iobroker-states.ts](../../../../../src-ts/contracts/iobroker-states.ts) |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |

**Direkt importiert von:**

- [src-ts/backend/main-helpers/api-state-main.ts](../../../../../src-ts/backend/main-helpers/api-state-main.ts)
- [src-ts/backend/main-helpers/state-cache-main.ts](../../../../../src-ts/backend/main-helpers/state-cache-main.ts)
- [src-ts/backend/state-cache/index.ts](../../../../../src-ts/backend/state-cache/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`getStateValue`](../../../../../src-ts/backend/state-cache/state-cache.ts#L42) | entry, fallback | Object.prototype.hasOwnProperty.call |
| [`getStateTimestamp`](../../../../../src-ts/backend/state-cache/state-cache.ts#L59) | entry, fallback | Number, Number.isFinite |
| [`hasExplicitStateValue`](../../../../../src-ts/backend/state-cache/state-cache.ts#L78) | entry | Object.prototype.hasOwnProperty.call |
| [`normalizeCachedState`](../../../../../src-ts/backend/state-cache/state-cache.ts#L95) | id, entry | Number, Number.isFinite, getStateTimestamp, getStateValue |
| [`readNumberFromCache`](../../../../../src-ts/backend/state-cache/state-cache.ts#L111) | cache, key, fallback | Number, Number.isFinite, getStateValue |
| [`readBooleanFromCache`](../../../../../src-ts/backend/state-cache/state-cache.ts#L124) | cache, key, fallback | String, getStateValue |
| [`readStringFromCache`](../../../../../src-ts/backend/state-cache/state-cache.ts#L141) | cache, key, fallback | String, getStateValue |
