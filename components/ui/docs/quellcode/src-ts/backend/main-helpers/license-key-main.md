# src-ts/backend/main-helpers/license-key-main.ts

Verbindet die Lizenzschlüssel-Prüfung mit den dafür vorgesehenen Adapter-Kern-Hilfen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/main-helpers/license-key-main.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../license/license-key-safety` | [src-ts/backend/license/license-key-safety.ts](../../../../../src-ts/backend/license/license-key-safety.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`decideMainLicenseInput`](../../../../../src-ts/backend/main-helpers/license-key-main.ts#L39) | input | isMaskedLicenseValue, normalizeLicenseInput, shouldStoreLicenseInput |
| [`buildMainMaskedLicenseResult`](../../../../../src-ts/backend/main-helpers/license-key-main.ts#L57) | – | buildMaskedLicenseValidationResult |
