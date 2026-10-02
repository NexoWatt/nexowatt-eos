# src-ts/frontend/customer-feature-visibility.ts

Übersetzt das Sichtbarkeitsmodell in die für das Kundenfrontend verwendbaren Anzeige-Freigaben.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/frontend/customer-feature-visibility.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/features` | [src-ts/contracts/features.ts](../../../../src-ts/contracts/features.ts) |

**Direkt importiert von:**

- [src-ts/frontend/index.ts](../../../../src-ts/frontend/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`hasText`](../../../../src-ts/frontend/customer-feature-visibility.ts#L68) | value | value.trim |
| [`hasRealEvcsProof`](../../../../src-ts/frontend/customer-feature-visibility.ts#L85) | proof | hasText |
| [`hasRealStorageFarmProof`](../../../../src-ts/frontend/customer-feature-visibility.ts#L103) | proof | hasText |
| [`decideEvcsVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L119) | input | – |
| [`decideStorageFarmVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L136) | input | – |
| [`decideSmartHomeVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L150) | input | – |
| [`decideWeatherVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L160) | input | – |
| [`decideAiAdvisorVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L173) | input | – |
| [`explainCustomerFeatureVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L193) | input | decideAiAdvisorVisibility, decideEvcsVisibility, decideSmartHomeVisibility, decideStorageFarmVisibility, decideWeatherVisibility |
| [`buildCustomerFeatureVisibility`](../../../../src-ts/frontend/customer-feature-visibility.ts#L223) | input | explainCustomerFeatureVisibility |
