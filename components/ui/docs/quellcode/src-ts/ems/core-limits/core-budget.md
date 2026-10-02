# src-ts/ems/core-limits/core-budget.ts

Berechnet das zentrale verbleibende Leistungsbudget aus Netzgrenze, Messwerten und reservierten Anforderungen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/core-limits/core-budget.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `../../contracts/ems-budget` | [src-ts/contracts/ems-budget.ts](../../../../../src-ts/contracts/ems-budget.ts) |
| `../../contracts/units` | [src-ts/contracts/units.ts](../../../../../src-ts/contracts/units.ts) |
| `../../utils/number` | [src-ts/utils/number.ts](../../../../../src-ts/utils/number.ts) |

**Direkt importiert von:**

- [src-ts/ems/core-limits/index.ts](../../../../../src-ts/ems/core-limits/index.ts)
- [src-ts/runtime-executables/ems/modules/core-limits.ts](../../../../../src-ts/runtime-executables/ems/modules/core-limits.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`numberPercentOrNull`](../../../../../src-ts/ems/core-limits/core-budget.ts#L41) | value | clampNumber, toNumberOrNull |
| [`gate`](../../../../../src-ts/ems/core-limits/core-budget.ts#L56) | rawW, effectiveW, reason, diagnosticText | Math.max, Math.round |
| [`isStorageReserveActive`](../../../../../src-ts/ems/core-limits/core-budget.ts#L78) | storageSocPct, reserveSocPct, allowStorageDischarge | numberPercentOrNull |
| [`calculatePvBudgetGate`](../../../../../src-ts/ems/core-limits/core-budget.ts#L95) | input | Math.max, Math.round, gate, isStorageReserveActive, numberPercentOrNull, positiveWatt |
| [`calculateGridBudgetGate`](../../../../../src-ts/ems/core-limits/core-budget.ts#L120) | input | Math.max, gate, positiveWatt, toNumberOrNull |
| [`buildCoreBudgetSnapshot`](../../../../../src-ts/ems/core-limits/core-budget.ts#L151) | input | Date.now, Math.max, Math.min, calculateGridBudgetGate, calculatePvBudgetGate, gate, isStorageReserveActive, numberPercentOrNull, positiveWatt, toNumberOrNull |
| [`restBool`](../../../../../src-ts/ems/core-limits/core-budget.ts#L238) | value, fallback | value.trim |
| [`restString`](../../../../../src-ts/ems/core-limits/core-budget.ts#L250) | value, fallback | String |
| [`restNumberOrNull`](../../../../../src-ts/ems/core-limits/core-budget.ts#L256) | value | toNumberOrNull |
| [`restWatt`](../../../../../src-ts/ems/core-limits/core-budget.ts#L261) | value | positiveWatt, restNumberOrNull |
| [`buildCoreForecastGate`](../../../../../src-ts/ems/core-limits/core-budget.ts#L272) | input | Math.max, Math.round, clampNumber, restBool, restNumberOrNull, restString, restWatt |
| [`buildCoreTariffGate`](../../../../../src-ts/ems/core-limits/core-budget.ts#L303) | input | restBool, restNumberOrNull, restString, restWatt |
| [`buildCorePeakTariffGridGates`](../../../../../src-ts/ems/core-limits/core-budget.ts#L333) | input | buildCoreTariffGate, restBool, restNumberOrNull, restString, restWatt |
| [`buildCoreRestGatesShadow`](../../../../../src-ts/ems/core-limits/core-budget.ts#L387) | input | Date.now, buildCoreForecastGate, buildCorePeakTariffGridGates, toNumberOrNull |
| [`buildCoreRestGatesProductive`](../../../../../src-ts/ems/core-limits/core-budget.ts#L419) | input | buildCoreRestGatesShadow |
| [`reservationString`](../../../../../src-ts/ems/core-limits/core-budget.ts#L527) | value, fallback | String |
| [`reservationPositiveWatt`](../../../../../src-ts/ems/core-limits/core-budget.ts#L538) | value, fallback | positiveWatt, toNumberOrNull |
| [`reservationPriority`](../../../../../src-ts/ems/core-limits/core-budget.ts#L549) | value | toNumberOrNull |
| [`calculateCoreBudgetFlexUsedW`](../../../../../src-ts/ems/core-limits/core-budget.ts#L564) | consumers, order | Array.isArray, Math.round, Object.keys, keys.reduce |
| [`buildCoreBudgetConsumersList`](../../../../../src-ts/ems/core-limits/core-budget.ts#L585) | consumers, order | Array.from, Array.isArray, Object.keys, result.push |
| [`computeCoreBudgetReservation`](../../../../../src-ts/ems/core-limits/core-budget.ts#L611) | runtime, request, tsInput | Array.from, Array.isArray, Date.now, Math.max, Math.min, Math.round, Object.keys, calculateCoreBudgetFlexUsedW, order.includes, order.push, positiveWatt, reservationPositiveWatt, reservationPriority, reservationString (weitere in der Quelle) |
| [`restGateNumber`](../../../../../src-ts/ems/core-limits/core-budget.ts#L801) | value | toNumberOrNull |
| [`restGateWatt`](../../../../../src-ts/ems/core-limits/core-budget.ts#L807) | value | positiveWatt, restGateNumber |
| [`restGateNullableWatt`](../../../../../src-ts/ems/core-limits/core-budget.ts#L813) | value | positiveWatt, restGateNumber |
| [`restGateBool`](../../../../../src-ts/ems/core-limits/core-budget.ts#L819) | value, fallback | value.trim |
| [`restGateText`](../../../../../src-ts/ems/core-limits/core-budget.ts#L831) | value, fallback | String |
| [`buildCoreBudgetRestGatesSnapshot`](../../../../../src-ts/ems/core-limits/core-budget.ts#L847) | input | Date.now, Math.max, Math.min, Math.round, restGateBool, restGateNullableWatt, restGateNumber, restGateText, restGateWatt, toNumberOrNull |
| [`compareCoreBudgetRestGates`](../../../../../src-ts/ems/core-limits/core-budget.ts#L916) | js, ts | cmpBool, cmpNum, cmpText |
| [`cmpNum`](../../../../../src-ts/ems/core-limits/core-budget.ts#L925) | field, jsValue, tsValue, tolerance | Math.abs, Math.round, mismatches.push, restGateNumber |
| [`cmpBool`](../../../../../src-ts/ems/core-limits/core-budget.ts#L933) | field, jsValue, tsValue | mismatches.push, restGateBool |
| [`cmpText`](../../../../../src-ts/ems/core-limits/core-budget.ts#L938) | field, jsValue, tsValue | mismatches.push, restGateText |
