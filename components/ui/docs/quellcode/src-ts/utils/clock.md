# src-ts/utils/clock.ts

Normalisiert Uhrzeiten und Zeitfenster für die zeitabhängige Planung.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/utils/clock.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/units` | [src-ts/contracts/units.ts](../../../../src-ts/contracts/units.ts) |

**Direkt importiert von:**

- [src-ts/utils/index.ts](../../../../src-ts/utils/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isClockTime`](../../../../src-ts/utils/clock.ts#L37) | value | Number, Number.isInteger, value.trim |
| [`normalizeClockTime`](../../../../src-ts/utils/clock.ts#L57) | value, fallback | Number, String, isClockTime, value.split |
| [`clockTimeToMinutes`](../../../../src-ts/utils/clock.ts#L76) | value | Number, normalizeClockTime, safe.split |
| [`isClockTimeInWindow`](../../../../src-ts/utils/clock.ts#L93) | current, start, end | clockTimeToMinutes |
