# src-ts/runtime-executables/www/os-update-status.ts

Zeigt den schreibgeschützten Betriebssystem-Updatezustand in den bestehenden Einstellungen an.

**Daten und Wirkung:** Fragt die authentifizierte Status-API maximal einmal pro Minute ab und setzt ausschließlich textContent; kein Update-/Neustartbefehl.

**Bei Änderungen:** Warnungen bei Fehlern, veralteten Daten, Offlinebetrieb und gesperrten Sitzungen mit dem API-Vertrag testen.

[Originalquelle](../../../../../src-ts/runtime-executables/www/os-update-status.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`text`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L17) | id, value | document.getElementById |
| [`date`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L19) | value | – |
| [`count`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L20) | value | Number.isSafeInteger, String |
| [`boolean`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L21) | value | – |
| [`requirement`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L22) | value | – |
| [`warning`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L31) | message | text |
| [`render`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L37) | result | boolean, count, date, requirement, text, warning |
| [`poll`](../../../../../src-ts/runtime-executables/www/os-update-status.ts#L62) | – | clearTimeout, fetch, render, response.json, setTimeout, warning |
