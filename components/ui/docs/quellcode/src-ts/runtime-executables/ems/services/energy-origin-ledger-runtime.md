# src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts

Bindet Herkunftsbilanz und Ledger-Fortschreibung in den Adapter-Lebenszyklus ein.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./energy-origin-accounting` | [src-ts/runtime-executables/ems/services/energy-origin-accounting.ts](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/energy-ledger.ts](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`EnergyOriginLedgerRuntime.constructor`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L45) | adapter | emptyStorageInventory |
| [`EnergyOriginLedgerRuntime._rawConfig`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L56) | – | – |
| [`EnergyOriginLedgerRuntime._edition`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L61) | – | normalizeEdition, this.adapter._nwCurrentLicenseEdition |
| [`EnergyOriginLedgerRuntime._config`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L73) | – | normalizeOriginConfig, this._edition, this._rawConfig |
| [`EnergyOriginLedgerRuntime.init`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L77) | – | this._ensureStates, this._primeFromStates, this._process |
| [`EnergyOriginLedgerRuntime.tick`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L83) | – | this._process |
| [`EnergyOriginLedgerRuntime._ensureStates`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L87) | – | channel, mk |
| [`channel`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L90) | id, name | a.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L91) | id, name, type, role, unit, def | a.setObjectNotExistsAsync |
| [`EnergyOriginLedgerRuntime._readJsonState`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L129) | id, fallback | JSON.parse, this.adapter.getStateAsync |
| [`EnergyOriginLedgerRuntime._readStringState`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L140) | id, fallback | String, this.adapter.getStateAsync |
| [`EnergyOriginLedgerRuntime._primeFromStates`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L149) | – | Array.isArray, normalizeInventory, this._config, this._readJsonState, this._readStringState |
| [`EnergyOriginLedgerRuntime._readForeignStateSafe`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L165) | dpId | String, this.adapter.getForeignStateAsync, this.adapter.getStateAsync |
| [`EnergyOriginLedgerRuntime._readSamples`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L175) | config, now | Date.now, Math.max, Number, meterSampleFromState, statusRows.push, this._readForeignStateSafe |
| [`EnergyOriginLedgerRuntime._intervalState`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L203) | config, bounds, startSamples, lastSamples, now, extra | Number |
| [`EnergyOriginLedgerRuntime._boundarySamples`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L220) | meters, previousSamples, currentSamples, boundaryTs | interpolateCumulativeSample |
| [`EnergyOriginLedgerRuntime._recordConfig`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L231) | config, reason | Date.now, this._configHistory.slice, this._configHistory.unshift |
| [`EnergyOriginLedgerRuntime._finalizeInterval`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L247) | config, current, boundarySamples | Number, String, calculateOriginInterval, normalizeInventory, this._recentIntervals.slice, this._recentIntervals.unshift |
| [`EnergyOriginLedgerRuntime._evidenceReady`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L270) | config, lastInterval | – |
| [`EnergyOriginLedgerRuntime._publish`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L277) | config, status, meterStatus, lastInterval, now, error | JSON.stringify, Number, Object.keys, String, aggregateIntervals, state, this._evidenceReady |
| [`state`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L310) | id, val | a.setStateAsync |
| [`EnergyOriginLedgerRuntime._process`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts#L336) | _trigger | Date.now, Number, String, emptyStorageInventory, intervalBounds, statusRows.filter, this._boundarySamples, this._config, this._finalizeInterval, this._intervalState, this._primeFromStates, this._publish, this._readSamples, this._recordConfig (weitere in der Quelle) |
