# src-ts/frontend/display-format-canary.ts

Vergleicht Formatierungsergebnisse diagnostisch mit dem erwarteten bisherigen Anzeigeverhalten.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/display-format-canary.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/frontend/index.ts](../../../../src-ts/frontend/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeDisplayTextForCanary`](../../../../src-ts/frontend/display-format-canary.ts#L98) | text | String |
| [`runDisplayFormatterCanary`](../../../../src-ts/frontend/display-format-canary.ts#L113) | mirror, legacy, cases | Math.round, Number, legacy.formatEnergyKwh, legacy.formatPercent, legacy.formatPower, mirror.formatEnergyValue, mirror.formatPercentValue, mirror.formatPowerValue, normalizeDisplayTextForCanary, results.filter, results.push |
