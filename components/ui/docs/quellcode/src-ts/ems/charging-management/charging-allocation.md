# src-ts/ems/charging-management/charging-allocation.ts

Verteilt das begrenzte Ladebudget auf die zugelassenen Ladepunkte und deren elektrische Grenzen.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-allocation.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/ems/charging-management/index.ts](../../../../../src-ts/ems/charging-management/index.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`finiteOrNull`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L420) | value | Number, Number.isFinite, value.trim |
| [`nonNegative`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L431) | value, fallback | Math.round, finiteOrNull |
| [`nonNegativeFloat`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L437) | value, fallback | Number, finiteOrNull, v.toFixed |
| [`physicalPvBudgetW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L449) | input | Math.max, Math.round, finiteOrNull, nonNegative |
| [`purePvBudgetW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L462) | input | Math.max, Math.min, Math.round, finiteOrNull, physicalPvBudgetW |
| [`boolValue`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L469) | value, fallback | Number.isFinite, value.trim |
| [`str`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L480) | value, fallback | String |
| [`safeKey`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L485) | value, fallbackIndex | raw.toLowerCase, str |
| [`normalizeControlBasis`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L492) | value | str |
| [`allocationSafe`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L499) | allocation, fallbackIndex | safeKey |
| [`buildAllocationMap`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L503) | allocations | allocations.forEach |
| [`buildPhaseDecisionMap`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L521) | input | Array.isArray, wallboxes.forEach |
| [`wantsTsNativeAllocation`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L532) | input | boolValue |
| [`isJsComparisonDiagnosticOnly`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L536) | input, plan | boolValue, wantsTsNativeAllocation |
| [`normalizedChargingMode`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L557) | wb | String, raw.includes |
| [`modeAllowsPrearmedSetpoint`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L577) | wb | normalizedChargingMode |
| [`commandDemandAllowed`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L581) | wb | modeAllowsPrearmedSetpoint |
| [`floorToPositiveStep`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L587) | value, step | Math.floor |
| [`ceilToPositiveStep`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L593) | value, step | Math.ceil |
| [`powerFactorWPerA`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L599) | wb | Math.max |
| [`technicalMinPowerW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L603) | wb | Math.max, Math.round, ceilToPositiveStep, powerFactorWPerA |
| [`technicalMaxPowerW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L615) | wb | Math.floor, Math.max, Math.min, floorToPositiveStep, powerFactorWPerA |
| [`quantizeTargetDown`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L632) | wb, requestedW | Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, floorToPositiveStep, powerFactorWPerA, technicalMaxPowerW |
| [`capFromBinding`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L656) | binding, cap | Math.max, Math.round, boolValue, finiteOrNull |
| [`effectiveNativeBudgetW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L662) | input, candidates | Math.max, Math.min, Math.round, Number.isFinite, String, boolValue, budgetMode.endsWith, budgetMode.includes, candidates.reduce, capFromBinding, finiteOrNull |
| [`isChargingCandidate`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L691) | wb | commandDemandAllowed, normalizedChargingMode |
| [`finalGuardPriority`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L702) | a, b | a.safe.localeCompare, normalizedChargingMode |
| [`appendAllocationSafetyReason`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L726) | current, reason | String, reasons.includes, reasons.join, reasons.push |
| [`actualPowerReservationW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L732) | wallbox | Math.max, Number.isFinite |
| [`zeroExportStorageCreditW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L751) | wallbox | Math.floor, Math.max, Math.min, finiteOrNull, normalizedChargingMode, technicalMinPowerW |
| [`gridBaseForPowerW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L760) | wallbox | Math.min, normalizedChargingMode, technicalMinPowerW |
| [`pvReservationForPowerW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L770) | wallbox, powerW | Math.max, Number.isFinite, gridBaseForPowerW, zeroExportStorageCreditW |
| [`validZeroExportProbeW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L790) | wallbox, input | Date.now, Math.min, Number, boolValue, nonNegative, normalizedChargingMode, technicalMaxPowerW |
| [`applyFinalAllocationSafetyGuards`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L800) | planRaw, input | Date.now, Math.abs, Math.max, Math.min, Number, Number.isFinite, String, actualPowerReservationW, actualPurePvReservationBySafe.get, actualPurePvReservationBySafe.set, actualPvReservationBySafe.get, actualPvReservationBySafe.set, actualReservationBySafe.get, actualReservationBySafe.set (weitere in der Quelle) |
| [`compareNativeCandidates`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1039) | a, b | a.wb.safe.localeCompare |
| [`nativePriorityGroupKey`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1068) | candidate | Math.floor |
| [`buildStationCaps`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1077) | candidates | Math.max, Math.min, String, caps.get, caps.set |
| [`stationResourceW`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1089) | candidate, stationRemaining | Math.max, Number, String, stationRemaining.get, stationRemaining.has |
| [`pvRequiredForIncrement`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1095) | candidate, incrementW | Math.max, pvReservationForPowerW |
| [`maxIncrementByPv`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1110) | candidate, pvRemainingW | Math.max, gridBaseForPowerW, zeroExportStorageCreditW |
| [`applyTsNativeAllocationPlan`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1123) | plannedRaw, input | Math.floor, Math.max, Math.min, Number, Number.isFinite, String, active.filter, activeByStation.get, activeByStation.has, activeByStation.set, allCandidates.filter, allCandidates.map, buildStationCaps, candidates.map (weitere in der Quelle) |
| [`consume`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1157) | candidate, incrementW | Math.max, Math.min, Number, Number.isFinite, String, pvRequiredForIncrement, quantizeTargetDown, stationRemaining.get, stationRemaining.has, stationRemaining.set, stationResourceW |
| [`normalizeWallboxPlan`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1351) | wallbox, index, allocation, input, phaseDecision | Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, boolValue, effectiveMode.trim, finiteOrNull, nonNegative, nonNegativeFloat, safeKey, str, wallbox.boostMaxPowerW.trim (weitere in der Quelle) |
| [`buildChargingAllocationShadowPlan`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1536) | input | Array.isArray, Date.now, Math.max, Math.round, Number, allocationMap.entries, applyFinalAllocationSafetyGuards, applyTsNativeAllocationPlan, blockers.push, boolValue, buildAllocationMap, buildPhaseDecisionMap, explicitTotalCurrent.toFixed, finiteOrNull (weitere in der Quelle) |
| [`compareChargingAllocationShadowPlan`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1670) | input, plan | Array.isArray, allocations.forEach, cmpNumber, plan.wallboxes.map |
| [`pushMismatch`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1672) | field, js, ts, diff, safe | mismatches.push |
| [`cmpNumber`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1678) | field, jsValue, tsValue, tolerance, safe | Math.abs, Number, diff.toFixed, finiteOrNull, pushMismatch |
| [`buildChargingAllocationApply`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1717) | plan | plan.wallboxes.map |
| [`collectProductiveBlockers`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1728) | input, plan, comparison | Array.from, Array.isArray, blockers.push, isJsComparisonDiagnosticOnly, plan.wallboxes.some |
| [`collectNormalSourceBlockers`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1736) | plan | Array.from, Array.isArray, blockers.push, plan.wallboxes.some |
| [`normalSourceWarnings`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1742) | plan, comparison | Array.from, Array.isArray, Number, Number.isFinite, warnings.push |
| [`buildChargingAllocationProductivePrep`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1754) | input, plan, comparison | Array.from, Array.isArray, buildChargingAllocationApply, buildChargingAllocationShadowPlan, collectProductiveBlockers, compareChargingAllocationShadowPlan, isJsComparisonDiagnosticOnly, wantsTsNativeAllocation |
| [`buildChargingAllocationProductive`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1799) | input, plan, comparison | Array.from, Array.isArray, buildChargingAllocationApply, buildChargingAllocationShadowPlan, collectProductiveBlockers, compareChargingAllocationShadowPlan, isJsComparisonDiagnosticOnly, wantsTsNativeAllocation |
| [`buildChargingAllocationNormalSource`](../../../../../src-ts/ems/charging-management/charging-allocation.ts#L1864) | input, plan, comparison | Number, Number.isFinite, buildChargingAllocationApply, buildChargingAllocationShadowPlan, collectNormalSourceBlockers, compareChargingAllocationShadowPlan, normalSourceWarnings |
