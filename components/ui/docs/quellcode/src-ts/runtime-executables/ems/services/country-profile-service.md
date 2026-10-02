# src-ts/runtime-executables/ems/services/country-profile-service.ts

Löst Länderprofil-Einstellungen in gemeinsam verwendbare Profilinformationen auf.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)
- [src-ts/runtime-executables/ems/modules/country-profile.ts](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts)
- [src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts](../../../../../../src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts)
- [src-ts/runtime-executables/ems/services/para14a-eebus-api.ts](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts)
- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`normalizeLanguage`](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts#L52) | raw, fallback | SUPPORTED_LANGUAGES.has, String, value.split |
| [`normalizeCountry`](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts#L60) | raw, fallback | SUPPORTED_COUNTRIES.has, String |
| [`getConfiguredCountryProfile`](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts#L67) | config | Object.assign, normalizeCountry, normalizeLanguage |
| [`buildLocaleInfo`](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts#L77) | config, systemLanguage, source | getConfiguredCountryProfile, normalizeLanguage |
| [`readIoBrokerSystemLanguage`](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts#L90) | adapter | adapter.getForeignObjectAsync, normalizeLanguage |
