# src-ts/backend/feature-visibility/feature-visibility.ts

Löst konfigurierte Geräte und Funktionsfreigaben in ein konsistentes Sichtbarkeitsmodell auf.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts` | [src-ts/contracts/index.ts](../../../../../src-ts/contracts/index.ts) |

**Direkt importiert von:**

- [src-ts/backend/feature-visibility/index.ts](../../../../../src-ts/backend/feature-visibility/index.ts)
- [src-ts/backend/index.ts](../../../../../src-ts/backend/index.ts)
- [src-ts/backend/visibility/feature-visibility.ts](../../../../../src-ts/backend/visibility/feature-visibility.ts)
- [src-ts/bridges/feature-visibility-shadow.ts](../../../../../src-ts/bridges/feature-visibility-shadow.ts)
- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`hasText`](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts#L23) | value | value.trim |
| [`hasEvcsPresence`](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts#L36) | proofs | proofs.some |
| [`hasStorageFarmPresence`](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts#L55) | proofs | proofs.filter |
| [`buildFeatureVisibilityState`](../../../../../src-ts/backend/feature-visibility/feature-visibility.ts#L86) | input | hasEvcsPresence, hasStorageFarmPresence |
