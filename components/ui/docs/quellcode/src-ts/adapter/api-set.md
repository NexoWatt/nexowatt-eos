# src-ts/adapter/api-set.ts

Prüft und plant angeforderte Zustandsänderungen vor deren Übernahme durch den zuständigen Adapter-Schreibpfad.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/adapter/api-set.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/api` | [src-ts/contracts/api.ts](../../../../src-ts/contracts/api.ts) |
| `../contracts/units` | [src-ts/contracts/units.ts](../../../../src-ts/contracts/units.ts) |

**Direkt importiert von:**

- [src-ts/adapter/index.ts](../../../../src-ts/adapter/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeBoolean`](../../../../src-ts/adapter/api-set.ts#L32) | value | String |
| [`normalizeNumber`](../../../../src-ts/adapter/api-set.ts#L39) | value, def, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`normalizeApiValue`](../../../../src-ts/adapter/api-set.ts#L53) | value, kind, def, min, max | JSON.parse, Number, String, normalizeBoolean, normalizeNumber |
| [`buildSettingsWritePlan`](../../../../src-ts/adapter/api-set.ts#L72) | request, definitions | definitions.find, normalizeApiValue |
