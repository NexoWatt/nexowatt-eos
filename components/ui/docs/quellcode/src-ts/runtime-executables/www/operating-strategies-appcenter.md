# src-ts/runtime-executables/www/operating-strategies-appcenter.ts

Verbindet die App-Center-Einrichtung von Betriebsstrategien mit den Backend-Daten.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`setStatus`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L29) | – | – |
| [`getEdition`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L30) | – | – |
| [`byId`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L36) | id | document.getElementById |
| [`esc`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L37) | value | String |
| [`clone`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L43) | value | JSON.parse, JSON.stringify |
| [`record`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L46) | value | Array.isArray |
| [`list`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L47) | value | Array.isArray, value.filter |
| [`text`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L48) | value, fallback | String |
| [`bool`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L52) | value, fallback | – |
| [`number`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L53) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`integer`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L58) | value, fallback, min, max | Math.round, number |
| [`safeId`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L59) | value, fallback | text |
| [`withUniqueIds`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L64) | items, prefix | items.map |
| [`edition`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L78) | – | String, getEdition |
| [`ruleBuilder`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L85) | – | record |
| [`defaultNightReserve`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L87) | targetSocPct | – |
| [`defaultProfiles`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L100) | – | defaultNightReserve |
| [`defaultControlContract`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L119) | – | – |
| [`defaultConfig`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L129) | – | builder.defaultSimulation, defaultControlContract, defaultProfiles, ruleBuilder |
| [`normalizeMappings`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L169) | input | keys.forEach, record |
| [`normalizeSystemMappings`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L192) | input | record, text |
| [`normalizeCustomResource`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L204) | input, index | bool, controlTypes.includes, failSafePolicies.includes, integer, normalizeMappings, number, powerUnits.includes, record, resourceTypes.includes, safeId, text |
| [`normalizeProfile`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L239) | input, index | Math.min, modes.includes, number, record, safeId, seasons.includes, text |
| [`normalizeLink`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L266) | input | bool, integer, normalizeMappings, record, roles.includes, sourceId.startsWith, text |
| [`normalizeConfig`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L289) | input | Array.from, builder.normalizeRules, builder.normalizeSimulation, clone, defaultConfig, defaultControlContract, defaultProfiles, integer, list, normalizeSystemMappings, normalizedProfiles.map, normalizedRules.map, profileIds.has, record (weitere in der Quelle) |
| [`truthyDp`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L364) | value | text |
| [`mappedCount`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L368) | values | values.forEach |
| [`eosAppActive`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L377) | config, appId, enableFlag | record |
| [`flowSlotFor`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L384) | config, slot | Math.max, list, record |
| [`flowControlMappings`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L388) | ctrlInput, includeStages | reads.push, record, writes.push |
| [`deriveStorageFarmResources`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L415) | config | eosAppActive, list, record |
| [`deriveStorageResource`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L445) | config | eosAppActive, mappedCount, normalizeMappings, number, record, text |
| [`deriveEvcsResources`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L500) | config | eosAppActive, list, record |
| [`deriveFlowConsumerResources`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L530) | config | eosAppActive, list, record |
| [`deriveModuleDevices`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L560) | config, key, label, tab, resourceType | eosAppActive, list, record |
| [`deriveExistingResources`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L609) | config | combined.filter, deriveEvcsResources, deriveFlowConsumerResources, deriveModuleDevices, deriveStorageFarmResources, deriveStorageResource |
| [`applyRoleOverride`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L627) | resourceInput, roleOverride | clone |
| [`strategyResourceCatalog`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L638) | – | builder.normalizeCatalog, deriveExistingResources, list, ruleBuilder |
| [`linkBySourceId`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L670) | sourceId | list, normalizeLink, sourceId.startsWith |
| [`resourceTypeLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L689) | type | – |
| [`controlTypeLabel`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L702) | type | – |
| [`badge`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L714) | label, tone | esc |
| [`gotoTabButton`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L718) | tab | esc |
| [`existingReadMappingInput`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L722) | resource, link, key, label | esc, record, safeId, text |
| [`existingReadMappingsHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L736) | resource, link | fields.map, fields.push |
| [`existingResourcesHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L752) | resources | edition, record, resources.map, text |
| [`dpInput`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L803) | resource, index, key, label, write | esc, record, text |
| [`customResourcesHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L816) | resources | resources.map |
| [`profilesHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L848) | profiles, resources | profiles.map, resources.filter |
| [`styleHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L879) | – | – |
| [`renderHtml`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L931) | – | badge, customResourcesHtml, deriveExistingResources, edition, esc, existingResourcesHtml, list, profilesHtml, record, ruleBuilder, strategyResourceCatalog, styleHtml, systemMapField, text |
| [`systemMapField`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L943) | key, label | esc |
| [`syncLinksFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L980) | – | deriveExistingResources, document.querySelectorAll, list, out.filter, rendered.map |
| [`find`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L988) | selector, attr | Array.from, document.querySelectorAll |
| [`syncCustomFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1029) | – | document.querySelectorAll, list, resources.map |
| [`syncProfilesFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1048) | – | byId, document.querySelectorAll, list, profiles.map, text |
| [`syncGlobalFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1070) | – | byId, integer, record |
| [`syncFromDom`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1088) | – | builder.syncFromDom, byId, document.querySelectorAll, getCheck, getValue, integer, normalizeConfig, normalizeSystemMappings, record, ruleBuilder, strategyResourceCatalog, syncCustomFromDom, syncLinksFromDom, syncProfilesFromDom |
| [`getCheck`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1090) | id, fallback | byId |
| [`getValue`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1091) | id, fallback | byId, text |
| [`rerender`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1119) | – | bindEvents, renderHtml |
| [`bindEvents`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1125) | – | activeProfile.addEventListener, addProfile.addEventListener, addResource.addEventListener, autoImport.addEventListener, builder.bindEvents, byId, document.querySelectorAll, ruleBuilder |
| [`getConfig`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1207) | – | – |
| [`updateConfig`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1208) | next | normalizeConfig |
| [`getResources`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1209) | – | strategyResourceCatalog |
| [`syncAll`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1210) | – | syncFromDom |
| [`render`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1216) | mount, config, enabled | builder.resetSimulationResult, normalizeConfig, record, rerender, ruleBuilder |
| [`apply`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1227) | config, selectedEdition | document.getElementById, record, render |
| [`collect`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1237) | existing, enabled, selectedEdition | builder.normalizeRules, builder.normalizeSimulation, byId, clone, defaultControlContract, deriveExistingResources, edition, list, normalizeConfig, record, ruleBuilder, syncFromDom, text |
| [`setup`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1290) | options | – |
| [`simulate`](../../../../../src-ts/runtime-executables/www/operating-strategies-appcenter.ts#L1303) | config, resources | builder.simulate, ruleBuilder, strategyResourceCatalog |
