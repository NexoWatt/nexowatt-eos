# src-ts/frontend/feature-visibility-shadow-compare.ts

Vergleicht im Browser die Sichtbarkeitswerte des Shadow-Pfads mit der produktiven Darstellung.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./feature-visibility-diagnostics` | [src-ts/frontend/feature-visibility-diagnostics.ts](../../../../src-ts/frontend/feature-visibility-diagnostics.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`boolOrFalse`](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts#L78) | value | – |
| [`mismatchMessage`](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts#L92) | key, legacyValue, nextValue | – |
| [`compareFeatureVisibility`](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts#L118) | legacy, next | boolOrFalse, mismatchMessage, mismatches.push |
| [`hasBlockingVisibilityMismatch`](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts#L157) | result | result.mismatches.some |
| [`formatFeatureVisibilityShadowLog`](../../../../src-ts/frontend/feature-visibility-shadow-compare.ts#L171) | result | result.mismatches.map |
