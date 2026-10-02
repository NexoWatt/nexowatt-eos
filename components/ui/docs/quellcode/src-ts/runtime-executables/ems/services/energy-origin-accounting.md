# src-ts/runtime-executables/ems/services/energy-origin-accounting.ts

Ordnet Energieflüsse ihrer Herkunft zu und berechnet die daraus abgeleiteten Bilanzanteile.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `node:crypto` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteNumber`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L45) | value, fallback | Number, Number.isFinite |
| [`clamp`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L50) | value, min, max | Math.max, Math.min, finiteNumber |
| [`round`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L55) | value, digits | Math.max, Math.min, Math.round, finiteNumber |
| [`safeId`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L61) | input, fallback | String |
| [`normalizeEdition`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L69) | raw | String |
| [`stableClone`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L76) | value | Array.isArray, Object.keys, stableClone, value.map |
| [`canonicalJson`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L84) | value | JSON.stringify, stableClone |
| [`sha256Hex`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L88) | value | String, crypto.createHash |
| [`hashObject`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L92) | value | canonicalJson, sha256Hex |
| [`intervalBounds`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L96) | ts, intervalMinutes | Date.now, Math.floor, Math.max, Math.min, Math.round, finiteNumber |
| [`normalizeUnit`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L103) | raw | String |
| [`toKwh`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L110) | value, unit, factor | Number.isFinite, finiteNumber, normalizeUnit |
| [`normalizeMeter`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L118) | row, fallbackRole, index | String, finiteNumber, normalizeUnit, safeId |
| [`defaultRoleMeters`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L143) | origin | roleMap.map |
| [`normalizeChargePoint`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L164) | row, index | Math.max, Math.round, String, finiteNumber, normalizeUnit, safeId |
| [`normalizeOriginConfig`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L189) | rawConfig, editionRaw | Array.from, Array.isArray, Math.max, Math.min, Math.round, String, clamp, defaultRoleMeters, finiteNumber, hashObject, meterByKey.set, meterByKey.values, normalizeEdition, normalizeMeter (weitere in der Quelle) |
| [`emptyStorageInventory`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L279) | config | Math.max, clamp, finiteNumber, round |
| [`normalizeInventory`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L294) | raw, config | Math.max, emptyStorageInventory, finiteNumber, round |
| [`meterSampleFromState`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L310) | meter, state, now | Date.now, Math.max, Number.isFinite, finiteNumber, toKwh |
| [`interpolateCumulativeSample`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L331) | previous, current, boundaryTs | Math.max, Number.isFinite, clamp |
| [`deltaFromSamples`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L345) | start, end | Math.max, Number.isFinite, finiteNumber, round |
| [`splitProportional`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L353) | total, weights | Array.isArray, Math.max, finiteNumber, rows.forEach, rows.reduce |
| [`withdrawStorage`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L371) | inventoryRaw, dischargeKwh, efficiencyPct | Math.max, Math.min, Object.values, clamp, finiteNumber, normalizeInventory, round, splitProportional |
| [`addStorageCharge`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L405) | inventoryRaw, chargeSources, chargeKwh, efficiencyPct | Date.now, Math.max, Object.values, clamp, finiteNumber, normalizeInventory, round |
| [`roleDeltaMap`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L431) | meters, startSamples, endSamples | deltaFromSamples, meterResults.push, round |
| [`sumValid`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L461) | rows | Array.isArray, round |
| [`sourcePoolForDirectLoads`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L465) | { pvKwh, otherRenewableKwh, gridKwh, storageSources, directDemandKwh, storageChargeKwh, gridExportKwh, allocationMethod } | Math.max, Math.min, Object.entries, Object.fromEntries, Object.values, finiteNumber, round |
| [`allocateSourcesToLoads`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L548) | sourcePool, loads, allocationMethod | Array.isArray, Math.max, Object.entries, assignByWeights, finiteNumber, loads.filter, renewableKeys.has, round, rows.filter |
| [`assignByWeights`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L556) | source, amount, selectedRows | Math.max, Math.min, active.map, eligible.filter, eligible.some, finiteNumber, round, selectedRows.filter, splitProportional |
| [`evaluateEvidence`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L610) | config, meterResults, evcsBreakdown, quality | chargePoints.filter, clamp, finiteNumber, publicCps.every, round |
| [`buildQuality`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L693) | config, meterResults, balance | Math.abs, Math.max, finiteNumber, requiredRoles.filter, round |
| [`calculateOriginInterval`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L714) | { config: rawConfig, startSamples, endSamples, storageInventory, previousHash = '', startTs, endTs, edition } | Date.now, Math.max, Math.round, Object.entries, String, addStorageCharge, allocateSourcesToLoads, buildQuality, canonicalJson, chargePointBreakdown.push, evaluateEvidence, evcsRows.map, evcsRows.reduce, finiteNumber (weitere in der Quelle) |
| [`aggregateIntervals`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L850) | intervals | Array.isArray, Math.max, String, round, rows.filter, sum |
| [`sum`](../../../../../../src-ts/runtime-executables/ems/services/energy-origin-accounting.ts#L852) | selector | round, rows.reduce |
