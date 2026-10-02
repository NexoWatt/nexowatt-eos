# src-ts/runtime-executables/www/operating-strategies-rule-builder.ts

Übersetzt die Eingaben des Strategie-Regelbauers in die gespeicherte Regelstruktur.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`esc`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L60) | value | String |
| [`clone`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L66) | value | JSON.parse, JSON.stringify |
| [`record`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L69) | value | Array.isArray |
| [`list`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L70) | value | Array.isArray, value.filter |
| [`text`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L71) | value, fallback | String |
| [`bool`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L75) | value, fallback | – |
| [`number`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L76) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`nullableNumber`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L81) | value, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`integer`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L86) | value, fallback, min, max | Math.round, number |
| [`safeId`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L87) | value, fallback | text |
| [`localDateTimeValue`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L91) | value | pad, value.getDate, value.getFullYear, value.getHours, value.getMinutes, value.getMonth |
| [`pad`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L92) | part | String |
| [`withUniqueIds`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L96) | items, prefix | items.map |
| [`requirementLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L111) | value | – |
| [`requirementTone`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L117) | value | – |
| [`ruleTypeLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L123) | value | – |
| [`metricLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L135) | value | – |
| [`metricUnit`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L159) | value | – |
| [`operatorLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L176) | value | – |
| [`defaultSchedule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L181) | ruleType | WEEKDAYS.slice |
| [`normalizeSchedule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L192) | input, ruleType | Array.from, Array.isArray, SCHEDULE_MODES.includes, WEEKDAYS.slice, defaultSchedule, integer, record, source.weekdays.map, text |
| [`defaultCondition`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L210) | index | Date.now |
| [`normalizeCondition`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L221) | input, index | BOOLEAN_METRICS.has, OPERATORS.includes, STRING_METRICS.has, String, allowedMetrics.includes, number, record, safeId, text |
| [`defaultRule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L244) | type, index | Date.now, RULE_TYPES.includes, defaultCondition, defaultSchedule |
| [`normalizeRule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L305) | input, index, profileIds | PROFILE_SCOPES.includes, REQUIREMENTS.includes, RULE_TYPES.includes, defaultRule, integer, list, normalizeSchedule, number, profileIds.includes, profileScopeRaw.replace, record, safeId, sourcePolicies.includes, text (weitere in der Quelle) |
| [`normalizeRules`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L359) | input, profileIds | list, withUniqueIds |
| [`defaultSimulation`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L363) | activeProfileId | localDateTimeValue |
| [`normalizeResourceState`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L378) | input | nullableNumber, number, record, text |
| [`normalizeSimulation`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L396) | input, activeProfileId | Object.keys, localDateTimeValue, number, record, text |
| [`normalizeCatalog`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L418) | input | list |
| [`ensureSimulationStates`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L442) | simulationInput, resourcesInput | normalizeCatalog, normalizeSimulation, resources.forEach |
| [`resourceName`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L455) | resources, id | resources.find |
| [`templateCondition`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L459) | sourceRef, metric, operator, value, index | Date.now, normalizeCondition |
| [`createCustomerExampleRules`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L463) | resourcesInput, existingRulesInput | WEEKDAYS.slice, existing.map, normalizeCatalog, normalizeRules, push, resources.find, templateCondition |
| [`push`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L476) | templateKey, rule | existingTemplateKeys.has, generated.push, normalizeRule |
| [`profileMatches`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L555) | rule, activeProfileId | – |
| [`metricValue`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L560) | condition, simulation | Object.prototype.hasOwnProperty.call, record |
| [`compare`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L570) | actual, operator, expected | Number, Number.isFinite, String |
| [`conditionDescription`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L583) | condition, resources | BOOLEAN_METRICS.has, metricLabel, metricUnit, operatorLabel, resourceName |
| [`minutesUntilDeadline`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L590) | nowLocal, dueTime, dueDay | Math.max, Math.round, Number, Number.isNaN, due.getDate, due.getTime, due.setDate, due.setHours, due.setSeconds, now.getTime |
| [`timeMinutes`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L603) | value, fallback | Math.max, Math.min, Number, text |
| [`isInTimeWindow`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L609) | current, start, end | – |
| [`currentWeekday`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L614) | nowLocal | Number.isNaN, value.getDay, value.getTime |
| [`scheduleEvaluation`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L621) | ruleInput, nowLocal | Number.isNaN, currentWeekday, isInTimeWindow, normalizeSchedule, now.getHours, now.getMinutes, now.getTime, record, schedule.weekdays.includes, text, timeMinutes |
| [`minutesUntilLocalTime`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L644) | nowLocal, targetTime | Number.isNaN, now.getHours, now.getMinutes, now.getTime, timeMinutes |
| [`evaluateNightReserve`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L654) | configInput, resourcesInput, simulationInput | Math.max, Math.min, Math.round, Number.isNaN, absoluteMin.toFixed, isInTimeWindow, list, minutesUntilLocalTime, missingPct.toFixed, needKWh.toFixed, normalizeCatalog, normalizeResourceState, normalizeSimulation, now.getHours (weitere in der Quelle) |
| [`validateRule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L751) | ruleInput, resourcesInput, activeProfileId | errors.push, normalizeCatalog, normalizeRule, resources.find, rule.conditions.forEach, warnings.push |
| [`evaluateRule`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L784) | ruleInput, config, resources, simulation | Math.max, Math.min, Math.round, Number, averageKw.toFixed, detailParts.join, detailParts.push, gap.toFixed, gapPct.toFixed, list, minutesUntilDeadline, needKWh.toFixed, normalizeResourceState, normalizeRule (weitere in der Quelle) |
| [`simulate`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L909) | configInput, resourcesInput, simulationInput | candidateIndexes.forEach, decisions.push, decisions.slice, ensureSimulationStates, evaluateNightReserve, list, normalizeCatalog, normalizeRules, record, rules.map, sorted.filter, sorted.reduce, text |
| [`catalogOptions`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L969) | resources, selected, includeSystem | esc, knownIds.has, options.join, options.push, resources.forEach, resources.map |
| [`profileOptions`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L983) | profiles, selected | options.join, profiles.forEach |
| [`metricOptions`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L992) | sourceRef, selected | metrics.map |
| [`operatorOptions`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L997) | metric, selected | BOOLEAN_METRICS.has, STRING_METRICS.has, allowed.map |
| [`conditionValueField`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1002) | ruleIndex, conditionIndex, condition | BOOLEAN_METRICS.has, STRING_METRICS.has, esc |
| [`conditionsHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1010) | rule, ruleIndex, resources | rule.conditions.map |
| [`scheduleFieldsHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1023) | rule, index | WEEKDAYS.map, esc, normalizeSchedule |
| [`targetFieldsHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1042) | rule, index | esc |
| [`ruleCardHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1067) | rule, index, profiles, resources, liveEnabled | catalogOptions, conditionsHtml, esc, profileOptions, requirementLabel, requirementTone, resourceName, ruleTypeLabel, scheduleFieldsHtml, targetFieldsHtml, text, validateRule, validation.errors.map, validation.warnings.map |
| [`cascadeHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1100) | rules, resources | enabled.map, rules.filter |
| [`simulationResourceHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1110) | resource, index, state | esc |
| [`decisionTone`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1131) | status | – |
| [`decisionStatusLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1136) | status | – |
| [`simulationResultHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1141) | result | decisions.map, esc, list |
| [`styles`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1158) | – | – |
| [`render`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1217) | configInput, resourcesInput | cascadeHtml, ensureSimulationStates, esc, list, normalizeCatalog, normalizeRules, profiles.map, record, resources.map, rules.map, simulationResultHtml, styles, text |
| [`syncRulesFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1269) | configInput | clone, document.querySelectorAll, list, normalizeRules, record, rules.forEach |
| [`syncSimulationFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1323) | configInput, resourcesInput | clone, document.querySelectorAll, ensureSimulationStates, normalizeCatalog, normalizeSimulation, record, text |
| [`syncFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1345) | configInput, resourcesInput | syncRulesFromDom, syncSimulationFromDom |
| [`demoSimulation`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1351) | configInput, resourcesInput | clone, date.setHours, ensureSimulationStates, localDateTimeValue, normalizeCatalog, record, resources.forEach |
| [`bindEvents`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1388) | options | addRule.addEventListener, customerExample.addEventListener, document.getElementById, document.querySelectorAll, loadDemo.addEventListener, runSimulation.addEventListener |
| [`resetSimulationResult`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1501) | – | – |
| [`getLastSimulationResult`](../../../../../src-ts/runtime-executables/www/operating-strategies-rule-builder.ts#L1525) | – | clone |
