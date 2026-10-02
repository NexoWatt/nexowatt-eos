# src-ts/runtime-executables/ems/modules/energy-ledger.ts

Verknüpft die Energiebilanz-/Ledger-Funktion mit dem Laufzeitkontext und den dafür veröffentlichten Werten.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./base` | [src-ts/runtime-executables/ems/modules/base.ts](../../../../../../src-ts/runtime-executables/ems/modules/base.ts) |
| `../services/energy-origin-ledger-runtime` | [src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/module-manager.ts](../../../../../../src-ts/runtime-executables/ems/module-manager.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`safeId`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L52) | input, fallback | String |
| [`normalizeLp`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L60) | input | Math.max, Math.round, Number, String, s.match, safeId |
| [`num`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L66) | value, fallback | Number, Number.isFinite |
| [`round`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L71) | value, digits | Math.max, Math.min, Math.pow, Math.round, Number, Number.isFinite |
| [`localDayKey`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L78) | ms | Date.now, Number, String, d.getDate, d.getFullYear, d.getMonth |
| [`localMonthKey`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L83) | ms | Date.now, Number, String, d.getFullYear, d.getMonth |
| [`localYearKey`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L88) | ms | Date.now, Number, String, d.getFullYear |
| [`emptyPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L93) | – | – |
| [`uniquePush`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L107) | list, value | String, list.includes, list.push |
| [`addToPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L114) | acc, entry | num, round, uniquePush |
| [`buildKwhSourceMix`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L127) | totalKwh, solarKwh, gridKwh, valueEur | Math.max, Math.min, part, round, rows.filter, rows.push |
| [`part`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L133) | source, label, kwh, local | Math.max, Math.min, Math.round, Number, round |
| [`addEntrySourceFields`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L158) | entry | buildKwhSourceMix |
| [`filterEntriesByPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L169) | entries, period, keys | Array.isArray, String, list.filter, list.slice |
| [`sourceSummaryFromEntries`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L179) | entries | Array.isArray, Number, Object.create, Object.values, String, addEntrySourceFields, safeId |
| [`roundRow`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L198) | row | Object.prototype.hasOwnProperty.call, round |
| [`csvFoundationForPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L211) | period, entries, summary | Date.now, String, encodeURIComponent, filterEntriesByPeriod, filtered.map |
| [`buildWalletBridge`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L226) | summary, sourceSummary | Date.now |
| [`buildOperatorView`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L241) | summary, entries, sourceSummary | Array.isArray, Date.now |
| [`normalizeSessionEntry`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L261) | station, lpRaw, row | Date.now, Math.max, Math.min, Math.round, String, buildKwhSourceMix, localDayKey, localMonthKey, localYearKey, normalizeLp, num, round, safeId |
| [`sanitizeStations`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L322) | cfg | Array.isArray, rows.map |
| [`EnergyLedgerModule.constructor`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L337) | adapter, dpRegistry | emptyPeriod, localDayKey, localMonthKey, localYearKey, super |
| [`EnergyLedgerModule._cfg`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L352) | – | – |
| [`EnergyLedgerModule._recentLimit`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L358) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, this._cfg |
| [`EnergyLedgerModule._processedLimit`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L363) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, this._cfg |
| [`EnergyLedgerModule._isEnabled`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L368) | – | this._cfg |
| [`EnergyLedgerModule.init`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L378) | – | this._ensureStates, this._originLedger.init, this._primeFromStates, this._publish |
| [`EnergyLedgerModule.tick`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L385) | – | this._ensurePeriodRollovers, this._isEnabled, this._originLedger.tick, this._publish, this._scanChargeKioskSessions |
| [`EnergyLedgerModule._ensureStates`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L396) | – | channel, mk, this._ensurePeriodStates |
| [`channel`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L399) | id, name | a.setObjectNotExistsAsync |
| [`mk`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L400) | id, name, type, role, unit, def | a.setObjectNotExistsAsync |
| [`EnergyLedgerModule._ensurePeriodStates`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L456) | prefix, label, mk | mk |
| [`EnergyLedgerModule._primeFromStates`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L472) | – | Array.isArray, this._readJsonState, this._readPeriod |
| [`EnergyLedgerModule._readJsonState`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L483) | id, fallback | JSON.parse, this.adapter.getStateAsync |
| [`EnergyLedgerModule._readNumberState`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L494) | id, fallback | Number, Number.isFinite, this.adapter.getStateAsync |
| [`EnergyLedgerModule._readStringState`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L504) | id, fallback | String, this.adapter.getStateAsync |
| [`EnergyLedgerModule._readPeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L513) | prefix, expectedKey | Array.isArray, Math.max, Math.round, emptyPeriod, this._readJsonState, this._readNumberState, this._readStringState |
| [`EnergyLedgerModule._ensurePeriodRollovers`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L531) | – | Date.now, emptyPeriod, localDayKey, localMonthKey, localYearKey |
| [`EnergyLedgerModule._scanChargeKioskSessions`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L541) | – | Object.entries, added.push, normalizeSessionEntry, safeId, sanitizeStations, this._acceptEntry, this._processed.has, this._readJsonState |
| [`EnergyLedgerModule._acceptEntry`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L569) | entry | Array.from, Math.max, addEntrySourceFields, addToPeriod, processed.slice, this._processed.add, this._processedLimit, this._recentEntries.slice, this._recentEntries.unshift, this._recentLimit |
| [`EnergyLedgerModule._periodSummary`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L584) | acc, key | Array.isArray, Math.max, Math.round, num, round |
| [`EnergyLedgerModule._publish`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L604) | status, scan | Array.from, Array.isArray, Date.now, JSON.stringify, Number, String, a.setStateAsync, buildOperatorView, buildWalletBridge, csvFoundationForPeriod, entries.slice, sourceSummaryFromEntries, this._isEnabled, this._periodSummary (weitere in der Quelle) |
| [`EnergyLedgerModule._writePeriod`](../../../../../../src-ts/runtime-executables/ems/modules/energy-ledger.ts#L682) | prefix, data | JSON.stringify, a.setStateAsync |
