# src-ts/ems/core-limits/core-runtime.ts

Verbindet die typisierten Core-Budget-Ergebnisse mit dem vom Laufzeitmodul verwendeten Kontext.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/core-limits/core-runtime.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../para14a/para14a-constraint` | [src-ts/ems/para14a/para14a-constraint.ts](../../../../../src-ts/ems/para14a/para14a-constraint.ts) |

**Direkt importiert von:**

- [src-ts/ems/core-limits/index.ts](../../../../../src-ts/ems/core-limits/index.ts)
- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L466) | value | Number, Number.isFinite, value.trim |
| [`positive`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L474) | value | Math.max, finiteOrNull |
| [`round`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L479) | value | Math.round, finiteOrNull |
| [`roundNullable`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L484) | value | Math.round, finiteOrNull |
| [`bool`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L489) | value, fallback | Number.isFinite, value.trim |
| [`text`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L500) | value, fallback | String |
| [`clamp`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L505) | value, min, max, fallback | Math.max, Math.min, finiteOrNull |
| [`prepareCoreRuntimeSnapshotInput`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L516) | rawInput | Date.now, bool, clamp, finiteOrNull, positive, round, text |
| [`computeCorePvBudgetFlowRawW`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L630) | input | Math.max, finiteOrNull, positive |
| [`resolveCorePvBudgetPhysicalCap`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L645) | input | Math.max, Math.min, bool, finiteOrNull, positive |
| [`normalizeCorePvAllocationMode`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L707) | value | text |
| [`buildCorePvAllocation`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L716) | input | Math.max, Math.min, Math.round, Number.isFinite, clamp, finiteOrNull, normalizeCorePvAllocationMode, positive, round |
| [`computeCoreCentralBudgetGrant`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L763) | runtime, request | Math.max, Math.min, Number.isFinite, finiteOrNull, positive, resolvePara14aAppCap, round, text |
| [`buildCoreRuntimeBudgetSnapshot`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L826) | rawInput | Date.now, Math.abs, Math.max, Math.min, Math.round, Number.isFinite, bindings.join, bindings.push, bool, buildCorePvAllocation, computeCorePvBudgetFlowRawW, finiteOrNull, positive, prepareCoreRuntimeSnapshotInput (weitere in der Quelle) |
| [`createCoreRuntimeReservationState`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1041) | snapshot | Math.max, finiteOrNull, positive |
| [`cloneReservationConsumers`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1097) | consumers | Object.keys |
| [`calculateCoreRuntimeFlexUsedW`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1109) | consumers, order | Array.from, Object.keys, keys.reduce, round |
| [`buildCoreRuntimeConsumersList`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1121) | consumers, order | Array.from, Object.keys, result.push |
| [`applyCoreRuntimeReservation`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1138) | runtime, request, tsInput | Array.from, Array.isArray, Date.now, Math.floor, Math.max, Math.round, calculateCoreRuntimeFlexUsedW, cloneReservationConsumers, computeCoreCentralBudgetGrant, finiteOrNull, order.includes, order.push, positive, round (weitere in der Quelle) |
| [`applyCoreRuntimeReservationSequence`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1210) | initial, requests, tsInput | Array.from, Array.isArray, Date.now, Math.floor, Math.max, applyCoreRuntimeReservation, calculateCoreRuntimeFlexUsedW, cloneReservationConsumers, entries.push, finiteOrNull, positive |
| [`createCoreRuntimePhase3State`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1240) | snapshot | createCoreRuntimeReservationState |
| [`applyCoreRuntimePhase3Reservation`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1258) | runtime, request, tsInput | Math.floor, Math.max, applyCoreRuntimeReservation, createCoreRuntimePhase3State, finiteOrNull |
| [`applyCoreRuntimePhase3Sequence`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1281) | runtime, requests, tsInput | Math.floor, Math.max, applyCoreRuntimeReservationSequence, createCoreRuntimePhase3State, finiteOrNull |
| [`buildCoreRuntimePhase3PublicationPlan`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1311) | input | buildCoreRuntimePublicationPlan, createCoreRuntimePhase3State |
| [`publicationJson`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1349) | value | JSON.stringify |
| [`buildCoreRuntimePublicationPlan`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1362) | input | Array.from, Array.isArray, Date.now, Math.max, Math.round, bool, buildCoreRuntimeConsumersList, calculateCoreRuntimeFlexUsedW, finiteOrNull, positive, publicationJson, round, roundNullable, sourceParts.join (weitere in der Quelle) |
| [`compareCoreRuntimeBudgetSnapshots`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1566) | legacy, typed, toleranceW | compareBool, compareNumber, compareText |
| [`readPath`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1574) | root, path | path.split |
| [`compareNumber`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1583) | path, tolerance | Math.abs, finiteOrNull, mismatches.push, readPath |
| [`compareBool`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1591) | path | bool, mismatches.push, readPath |
| [`compareText`](../../../../../src-ts/ems/core-limits/core-runtime.ts#L1596) | path | mismatches.push, readPath, text |
