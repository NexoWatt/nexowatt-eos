# src-ts/bridges/feature-visibility-shadow.ts

Vergleicht alternative Feature-Sichtbarkeitsberechnungen diagnostisch, ohne daraus einen zweiten produktiven Steuerpfad aufzubauen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/bridges/feature-visibility-shadow.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/features` | [src-ts/contracts/features.ts](../../../../src-ts/contracts/features.ts) |
| `../backend/feature-visibility/feature-visibility` | [src-ts/backend/feature-visibility/feature-visibility.ts](../../../../src-ts/backend/feature-visibility/feature-visibility.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeFeatureVisibilityState`](../../../../src-ts/bridges/feature-visibility-shadow.ts#L80) | value | – |
| [`compareFeatureVisibility`](../../../../src-ts/bridges/feature-visibility-shadow.ts#L101) | legacy, next | normalizeFeatureVisibilityState |
| [`buildFeatureVisibilityShadowReport`](../../../../src-ts/bridges/feature-visibility-shadow.ts#L133) | input, legacy | buildFeatureVisibilityState, compareFeatureVisibility, normalizeFeatureVisibilityState |
