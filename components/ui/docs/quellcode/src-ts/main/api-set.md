# src-ts/main/api-set.ts

Prüft und plant angeforderte Zustandsänderungen vor deren Übernahme durch den zuständigen Adapter-Schreibpfad.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/main/api-set.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/main/api-shadow.ts](../../../../src-ts/main/api-shadow.ts)
- [src-ts/main/index.ts](../../../../src-ts/main/index.ts)
- [src-ts/runtime-executables/main.ts](../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeMainBoolean`](../../../../src-ts/main/api-set.ts#L134) | value | String |
| [`normalizeMainNumber`](../../../../src-ts/main/api-set.ts#L142) | value, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`normalizeMainApiSetValue`](../../../../src-ts/main/api-set.ts#L159) | value, kind, definition | JSON.parse, String, normalizeMainBoolean, normalizeMainNumber |
| [`buildMainSettingsWritePlan`](../../../../src-ts/main/api-set.ts#L181) | request, definitions | definitions.find, normalizeMainApiSetValue |
| [`buildMainApiSetShadowComparison`](../../../../src-ts/main/api-set.ts#L220) | request, definitions | buildMainSettingsWritePlan |
