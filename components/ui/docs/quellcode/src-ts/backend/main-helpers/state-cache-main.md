# src-ts/backend/main-helpers/state-cache-main.ts

Kapselt die State-Cache-Zugriffe des Adapter-Kerns mit den dafür vorgesehenen Datenverträgen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/backend/main-helpers/state-cache-main.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/iobroker-states` | [src-ts/contracts/iobroker-states.ts](../../../../../src-ts/contracts/iobroker-states.ts) |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |
| `../state-cache/state-cache` | [src-ts/backend/state-cache/state-cache.ts](../../../../../src-ts/backend/state-cache/state-cache.ts) |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`readMainStateValue`](../../../../../src-ts/backend/main-helpers/state-cache-main.ts#L49) | cache, key, fallback | getStateTimestamp, getStateValue, hasExplicitStateValue |
| [`readMainNumber`](../../../../../src-ts/backend/main-helpers/state-cache-main.ts#L79) | cache, key, fallback | readNumberFromCache |
| [`readMainBoolean`](../../../../../src-ts/backend/main-helpers/state-cache-main.ts#L92) | cache, key, fallback | readBooleanFromCache |
| [`readMainString`](../../../../../src-ts/backend/main-helpers/state-cache-main.ts#L102) | cache, key, fallback | readStringFromCache |
| [`normalizeMainCacheEntry`](../../../../../src-ts/backend/main-helpers/state-cache-main.ts#L112) | cache, key | normalizeCachedState |
