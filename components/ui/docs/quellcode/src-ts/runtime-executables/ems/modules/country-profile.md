# src-ts/runtime-executables/ems/modules/country-profile.ts

Stellt das konfigurierte Länderprofil und dazugehörige Regeln für andere EMS-Bereiche bereit.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/country-profile-service` | [src-ts/runtime-executables/ems/services/country-profile-service.ts](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`CountryProfileModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L24) | adapter, dpRegistry | super |
| [`CountryProfileModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L30) | – | this._ensureStates, this._publish |
| [`CountryProfileModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L35) | – | Date.now, this._publish |
| [`CountryProfileModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L41) | – | a.setObjectNotExistsAsync |
| [`CountryProfileModule._publish`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L69) | reason, force | Date.now, JSON.stringify, Object.assign, String, profileSvc.buildLocaleInfo, profileSvc.getConfiguredCountryProfile, profileSvc.readIoBrokerSystemLanguage, set |
| [`set`](../../../../../../src-ts/runtime-executables/ems/modules/country-profile.ts#L84) | id, val | a.setStateAsync |
