# src-ts/frontend/runtime-shadow.ts

Kapselt optionale Vergleiche erzeugter Browser-Helfer mit dem bisherigen Laufzeitverhalten.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/runtime-shadow.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeMirrorBaseUrl`](../../../../src-ts/frontend/runtime-shadow.ts#L60) | baseUrl | String, value.endsWith |
| [`shouldRunFrontendTsMirrorShadow`](../../../../src-ts/frontend/runtime-shadow.ts#L77) | queryString | String, query.split |
| [`makeDetail`](../../../../src-ts/frontend/runtime-shadow.ts#L91) | key, ok, messageDe | – |
| [`runFrontendTsMirrorShadowCheck`](../../../../src-ts/frontend/runtime-shadow.ts#L111) | baseUrl | details.every, details.push, display.formatPowerValue, history.buildHistoryToolbarState, import, makeDetail, normalizeMirrorBaseUrl, toolbar.actions.find, visibility.buildCustomerFeatureVisibility |
