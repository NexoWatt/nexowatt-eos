# src-ts/runtime-executables/ems/services/para14a-eebus-api.ts

Bindet §14a-/EEBUS-bezogene Anforderungen und Statusinformationen an die Adapter-API an.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../package.json` | [package.json](../../../../../../package.json) |
| `./country-profile-service` | [src-ts/runtime-executables/ems/services/country-profile-service.ts](../../../../../../src-ts/runtime-executables/ems/services/country-profile-service.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/main.ts](../../../../../../src-ts/runtime-executables/main.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L100) | value | Number, Number.isFinite |
| [`positiveOrNull`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L106) | value | finiteOrNull |
| [`nonNegativeOrNull`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L111) | value | finiteOrNull |
| [`clampNumber`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L116) | value, min, max, fallback | Math.max, Math.min, Number, Number.isFinite |
| [`boundedString`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L122) | value, maxLength | String |
| [`normalizeInstance`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L126) | value | boundedString |
| [`isEebusInstance`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L130) | value | normalizeInstance |
| [`jsonStringifySafe`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L134) | value | JSON.stringify |
| [`Para14aEebusDirectApi.constructor`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L162) | adapter | – |
| [`Para14aEebusDirectApi.init`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L183) | – | this._ensureObjects, this._writeDiagnostics |
| [`Para14aEebusDirectApi.stop`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L201) | – | this._background, this._clearHelloWatchdog, this._clearPendingTimer, this._writeDiagnostics, this.pending.clear, this.pending.values, this.recentAcceptances.clear |
| [`Para14aEebusDirectApi.handleMessage`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L218) | obj | boundedString, this._handleControl, this._handleHello |
| [`Para14aEebusDirectApi.getIngress`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L238) | – | Date.now, Math.max, Math.round, Number, String, boundedString, finiteOrNull, nonNegativeOrNull, positiveOrNull, this._background, this._helloMaxAgeMs, this._writeDiagnostics, this.adapter?._nwRequestImmediateEmsTick |
| [`Para14aEebusDirectApi.flushImplementationFeedback`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L343) | context | Array.isArray, Date.now, Math.abs, Math.max, Math.round, Number, String, boundedString, failedModules.map, finiteOrNull, jsonStringifySafe, moduleResults.map, resultByKey.get, this._background (weitere in der Quelle) |
| [`Para14aEebusDirectApi._handleHello`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L519) | obj | Date.now, Number, String, clampNumber, isEebusInstance, normalizeInstance, this._armHelloWatchdog, this._background, this._readiness, this._reply, this._writeDiagnostics |
| [`Para14aEebusDirectApi._handleControl`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L581) | obj | Date.now, Math.max, Math.round, Number, jsonStringifySafe, this._armImplementationTimeout, this._background, this._pruneRecentAcceptances, this._readiness, this._rejectionResponse, this._rememberAcceptance, this._reply, this._setTimer, this._supersedePending (weitere in der Quelle) |
| [`Para14aEebusDirectApi._rejectionResponse`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L714) | message, atMs, reason | Math.max, boundedString, positiveOrNull |
| [`Para14aEebusDirectApi._validatePacket`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L730) | message, from | Array.isArray, Date.now, Math.max, Number, String, boundedString, clampNumber, finiteOrNull, isEebusInstance, message.sourceLimitIds.slice, nonNegativeOrNull, normalizeInstance, positiveOrNull, this._helloMaxAgeMs |
| [`Para14aEebusDirectApi._readiness`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L801) | – | this.adapter._nwLicenseAllowsAppId |
| [`Para14aEebusDirectApi._helloMaxAgeMs`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L832) | – | Math.max, Math.round |
| [`Para14aEebusDirectApi._clearHelloWatchdog`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L836) | – | this._clearTimer |
| [`Para14aEebusDirectApi._armHelloWatchdog`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L842) | sourceInstance, helloAtMs | this._clearHelloWatchdog, this._helloMaxAgeMs, this._setTimer |
| [`Para14aEebusDirectApi._supersedePending`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L863) | nextCommandId | Date.now, this._background, this._completePending, this._terminalFeedback, this._writeDiagnostics, this.pending.entries |
| [`Para14aEebusDirectApi._setTimer`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L882) | fn, ms | setTimeout, this.adapter._nwSetTimeout, this.adapter.setTimeout |
| [`Para14aEebusDirectApi._clearTimer`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L888) | timer | clearTimeout, this.adapter._nwClearTimeout, this.adapter.clearTimeout |
| [`Para14aEebusDirectApi._clearPendingTimer`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L895) | pending | this._clearTimer |
| [`Para14aEebusDirectApi._armImplementationTimeout`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L901) | pending | Math.max, clampNumber, this._clearPendingTimer, this._setTimer |
| [`Para14aEebusDirectApi._handleImplementationTimeout`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L913) | pending | Date.now, jsonStringifySafe, this._background, this._completePending, this._terminalFeedback, this._writeDiagnostics, this.pending.get |
| [`Para14aEebusDirectApi._terminalFeedback`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L939) | pending, status, reason, atMs | Math.max, Number, String, finiteOrNull |
| [`Para14aEebusDirectApi._sendImplementationFeedback`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L983) | targetInstance, feedback | this.adapter.sendTo |
| [`Para14aEebusDirectApi._completePending`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L992) | pending, feedback | this._clearPendingTimer, this._rememberFeedback, this._sendImplementationFeedback, this.pending.delete |
| [`Para14aEebusDirectApi._rememberAcceptance`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1005) | commandId, response | Date.now, this._pruneRecentAcceptances, this.recentAcceptances.get, this.recentAcceptances.set |
| [`Para14aEebusDirectApi._rememberFeedback`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1015) | commandId, feedback | Date.now, this._pruneRecentAcceptances, this.recentAcceptances.get, this.recentAcceptances.set |
| [`Para14aEebusDirectApi._pruneRecentAcceptances`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1025) | – | Date.now, this.recentAcceptances.delete, this.recentAcceptances.entries, this.recentAcceptances.keys |
| [`Para14aEebusDirectApi._reply`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1037) | obj, payload | this.adapter.sendTo |
| [`Para14aEebusDirectApi._background`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1044) | promise | Promise.resolve |
| [`Para14aEebusDirectApi._ensureObjects`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1050) | – | Object.entries, stateObject, this.adapter.setObjectNotExistsAsync |
| [`Para14aEebusDirectApi._writeDiagnostics`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1093) | values | Object.entries, this.adapter.setStateAsync |
| [`stateObject`](../../../../../../src-ts/runtime-executables/ems/services/para14a-eebus-api.ts#L1100) | name, type, role, write, def, unit | – |
