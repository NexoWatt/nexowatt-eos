# src-ts/frontend/feature-visibility-diagnostics.ts

Bereitet Abweichungen der Feature-Sichtbarkeit für Diagnose und Nachvollziehbarkeit auf.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/feature-visibility-diagnostics.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/frontend/feature-visibility-shadow-compare.ts](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`countIsPositive`](../../../../src-ts/frontend/feature-visibility-diagnostics.ts#L72) | value | Number, Number.isFinite |
| [`diagnostic`](../../../../src-ts/frontend/feature-visibility-diagnostics.ts#L86) | feature, visible, reasonDe | – |
| [`buildCustomerFeatureDiagnostics`](../../../../src-ts/frontend/feature-visibility-diagnostics.ts#L105) | input | countIsPositive, diagnostic |
| [`featureVisibilitySummaryText`](../../../../src-ts/frontend/feature-visibility-diagnostics.ts#L167) | diagnostics | diagnostics.filter, hidden.join, visible.join |
