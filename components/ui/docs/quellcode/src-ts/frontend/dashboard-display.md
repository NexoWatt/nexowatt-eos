# src-ts/frontend/dashboard-display.ts

Beschreibt und bereitet die Anzeigegrößen des Kunden-Dashboards auf.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/dashboard-display.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/features` | [src-ts/contracts/features.ts](../../../../src-ts/contracts/features.ts) |
| `./display-format` | [src-ts/frontend/display-format.ts](../../../../src-ts/frontend/display-format.ts) |

**Direkt importiert von:**

- [src-ts/frontend/index.ts](../../../../src-ts/frontend/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`buildDashboardValueRows`](../../../../src-ts/frontend/dashboard-display.ts#L62) | input | formatPercentValue, formatPowerValue |
