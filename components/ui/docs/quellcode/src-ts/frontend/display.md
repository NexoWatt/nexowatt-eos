# src-ts/frontend/display.ts

Bereitet gemeinsame Anzeigegrößen und deren Formatierung für das Kundenfrontend vor.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/display.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./display-format` | [src-ts/frontend/display-format.ts](../../../../src-ts/frontend/display-format.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`formatPowerValue`](../../../../src-ts/frontend/display.ts#L62) | value | baseFormatPowerValue |
| [`formatPercentageValue`](../../../../src-ts/frontend/display.ts#L73) | value, options | Math.max, Math.min, Math.round, pct.toFixed, toFiniteNumber |
| [`formatEnergyKwhValue`](../../../../src-ts/frontend/display.ts#L88) | valueKwh | formatEnergyValue |
| [`normalizeFeatureKind`](../../../../src-ts/frontend/display.ts#L103) | input | String |
| [`getFeatureLabel`](../../../../src-ts/frontend/display.ts#L121) | input | normalizeFeatureKind |
