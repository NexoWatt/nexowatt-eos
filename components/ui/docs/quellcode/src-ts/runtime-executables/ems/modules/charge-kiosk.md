# src-ts/runtime-executables/ems/modules/charge-kiosk.ts

Stellt den Laufzeitbereich für die Lade-Kiosk-Funktion und dessen Konfigurations-/Statusbezug bereit.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`toSafeId`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L36) | input | String |
| [`normalizeAssignedChargepoints`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L44) | raw | Array.isArray, Math.max, Math.round, Number, String, out.includes, out.push, s.match, toSafeId |
| [`normalizeAllowedModes`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L59) | raw | Array.isArray, String, out.includes, out.push |
| [`normalizeBool`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L73) | raw, fallback | String |
| [`normalizeTimeoutSec`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L82) | raw, fallback | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`normalizeRefreshSec`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L87) | raw, fallback | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`normalizeLayoutMode`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L92) | raw, connectorCount | String |
| [`normalizeControlBridge`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L112) | raw | String |
| [`normalizeProtocolHint`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L121) | raw | String |
| [`normalizeStation`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L126) | row, index, globalCfg | Math.max, Number, String, normalizeAllowedModes, normalizeAssignedChargepoints, normalizeBool, normalizeControlBridge, normalizeLayoutMode, normalizeProtocolHint, normalizeRefreshSec, normalizeTimeoutSec, toSafeId |
| [`normalizeChargeKioskStations`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L174) | cfg | Array.isArray, rows.map |
| [`ChargeKioskModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L181) | adapter, dpRegistry | super |
| [`ChargeKioskModule._config`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L186) | – | – |
| [`ChargeKioskModule._stations`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L193) | – | normalizeChargeKioskStations, this._config |
| [`ChargeKioskModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L197) | – | this._ensureBaseStates, this._publish |
| [`ChargeKioskModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L202) | – | this._publish |
| [`ChargeKioskModule._ensureBaseStates`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L206) | – | a.setObjectNotExistsAsync, mk |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L212) | id, name, type, role, unit, def | a.setObjectNotExistsAsync |
| [`ChargeKioskModule._ensureStationStates`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L234) | station | Array.isArray, Date.now, JSON.parse, JSON.stringify, Math.max, Math.round, Number, Object.keys, String, a.setObjectNotExistsAsync, a.setStateAsync, connectors.filter, connectors.slice, encodeURIComponent (weitere in der Quelle) |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L241) | suffix, name, type, role, unit, def | a.setObjectNotExistsAsync |
| [`ChargeKioskModule._readNumber`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L396) | id, fallback | Number, Number.isFinite, this.adapter.getStateAsync |
| [`ChargeKioskModule._publish`](../../../../../../src-ts/runtime-executables/ems/modules/charge-kiosk.ts#L406) | reason | Date.now, JSON.stringify, a.setStateAsync, actionableStations.filter, publicStations.map, stations.filter, stations.map, stations.some, this._config, this._ensureBaseStates, this._ensureStationStates, this._stations |
