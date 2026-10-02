# src-ts/backend/visibility/feature-visibility.ts

Löst konfigurierte Geräte und Funktionsfreigaben in ein konsistentes Sichtbarkeitsmodell auf.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/visibility/feature-visibility.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/features` | [src-ts/contracts/features.ts](../../../../../src-ts/contracts/features.ts) |
| `../feature-visibility/feature-visibility` | [src-ts/backend/feature-visibility/feature-visibility.ts](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts) |

**Direkt importiert von:**

- [src-ts/backend/visibility/index.ts](../../../../../src-ts/backend/visibility/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`hasRealEvcsProof`](../../../../../src-ts/backend/visibility/feature-visibility.ts#L49) | proofs | buildFeatureVisibilityState |
| [`hasRealStorageFarmProof`](../../../../../src-ts/backend/visibility/feature-visibility.ts#L60) | proofs | buildFeatureVisibilityState |
| [`deriveFeatureVisibility`](../../../../../src-ts/backend/visibility/feature-visibility.ts#L74) | input | buildFeatureVisibilityState |
