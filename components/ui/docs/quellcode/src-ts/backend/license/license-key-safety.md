# src-ts/backend/license/license-key-safety.ts

Unterscheidet echte Lizenzschlüssel von leeren oder maskierten Werten vor dem Speichern.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/license/license-key-safety.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts` | [src-ts/contracts/index.ts](../../../../../src-ts/contracts/index.ts) |

**Direkt importiert von:**

- [src-ts/backend/index.ts](../../../../../src-ts/backend/index.ts)
- [src-ts/backend/license/index.ts](../../../../../src-ts/backend/license/index.ts)
- [src-ts/backend/main-helpers/license-key-main.ts](../../../../../src-ts/backend/main-helpers/license-key-main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeLicenseInput`](../../../../../src-ts/backend/license/license-key-safety.ts#L41) | input | String |
| [`isMaskedLicenseValue`](../../../../../src-ts/backend/license/license-key-safety.ts#L55) | input | MASKED_LICENSE_MARKERS.has, normalizeLicenseInput, normalized.toLowerCase |
| [`shouldStoreLicenseInput`](../../../../../src-ts/backend/license/license-key-safety.ts#L64) | input | isMaskedLicenseValue, normalizeLicenseInput |
| [`buildMaskedLicenseValidationResult`](../../../../../src-ts/backend/license/license-key-safety.ts#L76) | – | – |
