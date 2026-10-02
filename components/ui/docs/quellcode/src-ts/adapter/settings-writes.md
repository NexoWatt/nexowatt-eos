# src-ts/adapter/settings-writes.ts

Prüft und normalisiert Kundeneinstellungen für ihre Übernahme in Adapter-States.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../src-ts/adapter/settings-writes.ts) · [Gesamtübersicht](../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../contracts/adapter-api` | [src-ts/contracts/adapter-api.ts](../../../../src-ts/contracts/adapter-api.ts) |

**Direkt importiert von:**

- [src-ts/adapter/index.ts](../../../../src-ts/adapter/index.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isCustomerSettingKey`](../../../../src-ts/adapter/settings-writes.ts#L70) | key | – |
| [`normalizeSettingValue`](../../../../src-ts/adapter/settings-writes.ts#L80) | value | Number, Number.isFinite, raw.toLowerCase, value.trim |
| [`normalizeSettingsWrite`](../../../../src-ts/adapter/settings-writes.ts#L100) | request | isCustomerSettingKey, normalizeSettingValue |
