# src-ts/resolvers/feature-visibility-resolver.ts

Ermittelt die sichtbaren Funktionen aus Konfiguration und Feature-Daten statt aus zufällig vorhandenen Alt-States.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/resolvers/feature-visibility-resolver.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/features` | [src-ts/contracts/features.ts](../../../../src-ts/contracts/features.ts) |

**Direkt importiert von:**

- [src-ts/resolvers/index.ts](../../../../src-ts/resolvers/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`hasText`](../../../../src-ts/resolvers/feature-visibility-resolver.ts#L53) | value | value.trim |
| [`hasRealEvcsPresenceProof`](../../../../src-ts/resolvers/feature-visibility-resolver.ts#L71) | proof | hasText |
| [`hasRealStorageFarmPresenceProof`](../../../../src-ts/resolvers/feature-visibility-resolver.ts#L87) | proof | hasText |
| [`deriveCustomerFeatureVisibility`](../../../../src-ts/resolvers/feature-visibility-resolver.ts#L108) | input | – |
