# src-ts/backend/main-helpers/settings-write-main.ts

Bereitet die Zuordnung von Kundeneinstellungs-Schreibwünschen im Adapter-Kern vor.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/main-helpers/settings-write-main.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |
| `../api-state/api-set-helpers` | [src-ts/backend/api-state/api-set-helpers.ts](../../../../../src-ts/backend/api-state/api-set-helpers.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isMainCustomerSettingKey`](../../../../../src-ts/backend/main-helpers/settings-write-main.ts#L73) | key | normalizeApiSetKey |
| [`normalizeMainSettingValue`](../../../../../src-ts/backend/main-helpers/settings-write-main.ts#L83) | key, value | Math.max, Math.min, Number, Number.isFinite, String, cleanKey.endsWith, normalizeApiSetKey |
| [`buildMainSettingsWritePlan`](../../../../../src-ts/backend/main-helpers/settings-write-main.ts#L111) | key, value | buildScopedStateId, isMainCustomerSettingKey, normalizeApiSetKey, normalizeMainSettingValue |
