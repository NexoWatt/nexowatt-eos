# src-ts/main/state-cache.ts

Normalisiert Zugriffe auf gespeicherte ioBroker-Werte und unterscheidet fehlende Werte von gültigen Null-/False-Werten.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/main/state-cache.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/main/api-shadow.ts](../../../../src-ts/main/api-shadow.ts)
- [src-ts/main/api-state.ts](../../../../src-ts/main/api-state.ts)
- [src-ts/main/index.ts](../../../../src-ts/main/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`hasOwn`](../../../../src-ts/main/state-cache.ts#L68) | obj, key | Object.prototype.hasOwnProperty.call |
| [`extractRawValue`](../../../../src-ts/main/state-cache.ts#L82) | raw | hasOwn |
| [`normalizeMainState`](../../../../src-ts/main/state-cache.ts#L99) | id, raw | extractRawValue |
| [`hasPresentMainValue`](../../../../src-ts/main/state-cache.ts#L123) | entry | – |
| [`isMainStateFresh`](../../../../src-ts/main/state-cache.ts#L137) | entry, options | Date.now, Math.max, Number, Number.isFinite, hasPresentMainValue |
| [`readFirstMainState`](../../../../src-ts/main/state-cache.ts#L157) | cache, ids, fallback | hasPresentMainValue, normalizeMainState |
| [`readMainNumber`](../../../../src-ts/main/state-cache.ts#L166) | cache, ids, fallback | Number, Number.isFinite, readFirstMainState |
| [`readMainBoolean`](../../../../src-ts/main/state-cache.ts#L173) | cache, ids, fallback | String, readFirstMainState |
| [`readMainString`](../../../../src-ts/main/state-cache.ts#L184) | cache, ids, fallback | String, readFirstMainState |
