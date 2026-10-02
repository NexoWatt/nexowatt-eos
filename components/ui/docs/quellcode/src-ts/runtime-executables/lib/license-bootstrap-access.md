# src-ts/runtime-executables/lib/license-bootstrap-access.ts

Begrenzt den Zugang einer noch nicht lizenzierten Anlage auf die autorisierte Lizenz-Einrichtung.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/license-bootstrap-access.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeLicenseBootstrapPath`](../../../../../src-ts/runtime-executables/lib/license-bootstrap-access.ts#L52) | req | String, pathname.replace, pathname.startsWith, raw.search, raw.slice |
| [`isUnlicensedLicenseBootstrapRequest`](../../../../../src-ts/runtime-executables/lib/license-bootstrap-access.ts#L67) | req | LICENSE_BOOTSTRAP_API_METHODS.get, LICENSE_BOOTSTRAP_GET_PATHS.has, String, apiMethods.has, normalizeLicenseBootstrapPath |
