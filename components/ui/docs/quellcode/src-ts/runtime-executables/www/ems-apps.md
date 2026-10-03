# src-ts/runtime-executables/www/ems-apps.ts

Verbindet App-Center-Eingaben, Modulkonfiguration und Datenpunktzuordnung mit den geschützten Backend-Endpunkten.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/ems-apps.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`syncGridInvert`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L375) | val | – |
| [`_psVoltageKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L426) | v | String |
| [`_psThresholdForVoltage`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L436) | v | Object.prototype.hasOwnProperty.call, _psVoltageKey |
| [`_psNumOrNull`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L441) | v | Number, Number.isFinite |
| [`_psParseNumberList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L446) | value, min, max | String, out.sort |
| [`_psFormatNumberList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L467) | arr | Array.isArray, arr.map |
| [`_psNormalizeDateToken`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L471) | token | String, s.match |
| [`_psParseDateList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L479) | value | String, out.sort |
| [`_psFormatDateList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L496) | arr | Array.isArray, arr.map |
| [`_psSetNumberInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L500) | el, value | Number, Number.isFinite, String |
| [`_psSetTextInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L506) | el, value | String |
| [`_psRound2`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L511) | n | Math.round, Number, Number.isFinite |
| [`_psBuildAtypicalReviewFromUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L516) | – | Math.max, Math.min, _psNumOrNull, _psThresholdForVoltage |
| [`_psUpdateAtypicalReviewPreview`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L566) | – | Math.round, _psBuildAtypicalReviewFromUi, _psRound2, parts.join, parts.push |
| [`_psAtypicalReviewExportUrl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L588) | format | Math.round, String, _psNumOrNull, params.set, params.toString |
| [`_psAtypicalReviewDefaultStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L607) | – | – |
| [`_psOpenAtypicalReviewExport`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L611) | format | String, _psAtypicalReviewExportUrl, setTimeout, window.open |
| [`_psRefreshAtypicalReviewExportStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L626) | – | Array.isArray, Math.round, Number, String, _psNumOrNull, fetchJson, params.set, params.toString |
| [`_psSetSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L653) | el, value, fallback | Array.from, String, options.includes |
| [`_tpEl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L758) | id | document.getElementById |
| [`_tpStr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L759) | id, fallback | String, _tpEl |
| [`_tpBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L763) | id, fallback | _tpEl |
| [`_tpNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L767) | id, fallback | Number, Number.isFinite, _tpStr |
| [`_tpSet`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L771) | id, value | String, _tpEl |
| [`_setTariffProviderStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L777) | text, kind | String, _tpEl |
| [`loadTariffProviderRegistry`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L783) | force | Date.now, fetchJson |
| [`_tariffProviderInternalDpIds`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L789) | – | – |
| [`_coupleTariffProviderDatapointsSync`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L794) | – | String, _tariffProviderInternalDpIds, document.getElementById |
| [`coupleTariffProviderDatapoints`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L812) | showStatus | _coupleTariffProviderDatapointsSync, _setTariffProviderStatus, loadTariffProviderRegistry |
| [`collectTariffProviderConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L823) | – | Math.max, Math.min, Math.round, String, _tpBool, _tpNum, _tpStr |
| [`applyTariffProviderUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L881) | config | String, _tpSet, loadTariffProviderRegistry |
| [`testTariffProviderConnection`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L931) | – | JSON.stringify, Number, Number.isFinite, _setTariffProviderStatus, collectTariffProviderConfig, coupleTariffProviderDatapoints, fetchJson |
| [`_licenseEdition`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1043) | – | Date.now, Number.isSafeInteger |
| [`_maxStorageCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1049) | – | Math.min, Number.isSafeInteger, _licenseEdition |
| [`_appLicenseFeature`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1054) | appId | String |
| [`_isFeatureLicensed`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1058) | feature | Object.prototype.hasOwnProperty.call, String, _licenseEdition |
| [`_isAppLicensed`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1064) | appId | _appLicenseFeature, _isFeatureLicensed |
| [`_maxEvcsCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1068) | – | Math.min, Number.isSafeInteger, _licenseEdition |
| [`_licenseLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1073) | – | _licenseEdition |
| [`_storagePowerProfileInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1080) | – | _licenseEdition, _licenseLabel |
| [`updateStorageLicensePowerUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1086) | – | Number, Number.isFinite, _storagePowerProfileInfo, els.storageRatedPowerKW.removeAttribute |
| [`normalizeLicenseInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1117) | raw | Array.isArray, Date.now, Number.isSafeInteger, Object.keys, count |
| [`count`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1125) | value, max | Math.min, Number.isSafeInteger |
| [`_licenseIsUsable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1139) | info | – |
| [`fetchLicenseInfoFallback`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1143) | – | Date.now, fetchJson, normalizeLicenseInfo |
| [`_readApiStateValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1167) | statePayload, key, fallback | Object.keys, Object.prototype.hasOwnProperty.call, String |
| [`_parseStorageFarmRuntimeList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1184) | raw | Array.isArray, JSON.parse, String |
| [`_recoverStorageFarmRowsFromStatusRows`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1197) | statusRows | Array.isArray |
| [`_normalizeRecoveredStorageFarmRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1223) | row, index | boolFrom, normalizeStorageVendorProfile, numberFrom, numberOrDefault, textFrom |
| [`textFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1226) | keys | String |
| [`numberFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1237) | keys | Number, Number.isFinite, String, raw.includes, raw.lastIndexOf, raw.replace |
| [`numberOrDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1257) | fallback, keys | numberFrom |
| [`boolFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1261) | fallback, keys | Object.prototype.hasOwnProperty.call, String |
| [`hydrateStorageFarmConfigFromRuntimeState`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1325) | cfg | Array.from, Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _parseStorageFarmRuntimeList, _readApiStateValue, _recoverStorageFarmRowsFromStatusRows, fetchJson, runtimeGroups.slice (weitere in der Quelle) |
| [`refreshLicenseForAppCenter`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1378) | reason | _licenseEdition, _licenseLabel, buildAppsUI, buildEvcsUI, fetchLicenseInfoFallback, normalizeLicenseInfo, rights, scheduleValidation, setStatus, updateStorageLicensePowerUi |
| [`rights`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1384) | info | JSON.stringify |
| [`_decodeShadowDisplayText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1405) | value | String, decodeURIComponent |
| [`_rememberOpenShadowDetails`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1411) | – | document.querySelectorAll |
| [`_ensureSettingsObj`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1427) | – | – |
| [`_ensureFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1433) | – | _ensureSettingsObj |
| [`_getFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1439) | key | Object.prototype.hasOwnProperty.call, _ensureSettingsObj |
| [`_setFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1449) | key, isW | _ensureFlowPowerDpIsW, document.querySelectorAll |
| [`_collectFlowPowerDpIsWFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1459) | – | document.querySelectorAll |
| [`setStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1469) | msg, kind | – |
| [`setDirty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1477) | – | els.save.setAttribute |
| [`clearDirty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1485) | – | els.save.setAttribute |
| [`setBackupStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1494) | msg, kind | – |
| [`downloadJsonFile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1501) | filename, obj | JSON.stringify, URL.createObjectURL, a.click, document.body.appendChild, document.createElement, setTimeout |
| [`readFileAsText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1518) | file | – |
| [`fetchJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1531) | url, opts | Object.assign, fetch, res.json |
| [`_fmtAge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1547) | ageMs | Math.round, Number, Number.isFinite |
| [`_setBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1559) | inputId, kind, text | document.getElementById, el.classList.add, el.classList.remove |
| [`scheduleValidation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1567) | delayMs | Number.isFinite, clearTimeout, setTimeout |
| [`runValidation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1573) | showStatusMessage | Array.from, JSON.stringify, String, _fmtAge, _setBadge, document.querySelectorAll, fetchJson, ids.push, seen.add, seen.has, setStatus |
| [`deepMerge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1650) | target, patches | Array.isArray, JSON.parse, JSON.stringify, Object.keys, deepMerge |
| [`valueOrEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1666) | v | String |
| [`numOrEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1670) | v | Number.isFinite, String |
| [`_aiSetNumberInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1674) | el, value, def | Number, Number.isFinite, String |
| [`_aiSetCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1681) | el, value, def | – |
| [`_aiSetInputValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1686) | el, value, def | String |
| [`buildAiAdvisorUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1694) | – | String, _aiSetCheckbox, _aiSetInputValue, _aiSetNumberInput |
| [`collectAiAdvisorConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1759) | base | String, deepMerge, n, str |
| [`n`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1762) | el, def, min, max, roundValue | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`str`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1770) | el, def | String |
| [`_nwHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1847) | input | String |
| [`_nwSystemProfileCountry`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1864) | – | String |
| [`buildSystemProfileCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1870) | – | String, _nwSystemProfileCountry, card.querySelector, card.setAttribute, document.createElement, lang.toUpperCase, sel.addEventListener |
| [`buildNlP1Card`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1933) | – | Number, Number.isFinite, _nwHtmlEscape, _nwSystemProfileCountry, card.setAttribute, document.createElement |
| [`_chargeKioskHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1977) | input | String |
| [`_chargeKioskStations`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1986) | – | Array.isArray |
| [`_chargeKioskToken`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1991) | – | Math.random, crypto.getRandomValues, out.replace |
| [`_chargeKioskAssignedToText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2004) | v | Array.isArray, arr.map |
| [`_chargeKioskStationCatalog`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2009) | – | Array.from, Array.isArray, byKey.values, evcs.forEach, groups.forEach |
| [`ensure`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2016) | rawKey | String, byKey.get, byKey.has, byKey.set |
| [`_chargeKioskAssignedForStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2042) | stationKey | String, _chargeKioskStationCatalog, item.chargepoints.map |
| [`_chargeKioskStationOptionsHtml`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2048) | selectedKey | String, _chargeKioskStationCatalog, options.join |
| [`buildChargeKioskCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2058) | – | _chargeKioskStations, _licenseEdition, add.addEventListener, card.querySelector, card.querySelectorAll, card.setAttribute, document.createElement, stations.map |
| [`refreshChargeKioskAssignmentRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2153) | row | String, _chargeKioskAssignedForStation, _chargeKioskAssignedToText, row.querySelector |
| [`_meshHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2218) | input | String |
| [`_meshNodes`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2226) | – | Array.isArray |
| [`_meshNodeRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2231) | node, index | Array.isArray, _meshHtmlEscape, n.targetGroupIds.join |
| [`buildMeshMicrogridCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2291) | – | _meshNodes, buildLegacyMeshMicrogridCard, card.appendChild, document.createElement, encodeURIComponent, legacy.appendChild |
| [`buildLegacyMeshMicrogridCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2316) | – | Array.isArray, JSON.stringify, String, _licenseEdition, _meshHtmlEscape, _meshNodes, add.addEventListener, card.querySelector, cfg.tailscale.peerUrls.join, document.createElement |
| [`buildAppCenterStructurePanels`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2425) | – | _isAppLicensed, buildChargeKioskCard, buildMeshMicrogridCard, buildNlP1Card, buildSystemProfileCard, mount, window.NexoWattNetOperatorAppCenter.render, window.NexoWattOperatingStrategiesAppCenter.render |
| [`mount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2426) | el, card | el.appendChild |
| [`setupInstallerBackButton`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2494) | – | btn.addEventListener, btn.setAttribute, buildTarget |
| [`parseQuery`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2499) | – | – |
| [`detectInstance`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2503) | – | Math.max, Math.round, Number, Number.isFinite, String, hash.match, parseQuery, qs.get |
| [`detectAdminOrigin`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2516) | – | String, parseQuery, qs.get |
| [`buildTarget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2549) | – | detectAdminOrigin, detectInstance |
| [`buildAppsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2566) | – | APP_CATALOG.filter, _licenseEdition, _licenseLabel, _maxEvcsCount, _maxStorageCount, actions.appendChild, appendAppConfigNavigation, buildAppCenterStructurePanels, card.appendChild, card.setAttribute, document.createElement, els.appsList.appendChild, getSt, header.appendChild (weitere in der Quelle) |
| [`getSt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2570) | appId | – |
| [`appendAppConfigNavigation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2613) | body, app, st | String, body.appendChild, btn.addEventListener, btn.setAttribute, document.createElement, op.setAttribute, row.appendChild, row.setAttribute |
| [`mkToggle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2677) | id, label, checked, disabled, onLabel, offLabel, toggleKind | bOff.classList.add, bOff.setAttribute, bOn.classList.add, bOn.setAttribute, document.createElement, grp.appendChild, grp.classList.add, grp.setAttribute, wrap.appendChild, wrap.setAttribute |
| [`setAppsFromConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2818) | cfg | applyAppDependentVisibility, document.getElementById, window.nwSyncToggleButtons |
| [`applyAppDependentVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2844) | – | appsTab.click, document.querySelector, isInstalled, toggleCard |
| [`isInstalled`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2846) | appId | document.getElementById |
| [`toggleCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2851) | cardKey, show | document.querySelector |
| [`_psDefaultWindow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2907) | – | – |
| [`_psGetPeakCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2921) | – | – |
| [`_psGetWindowsFromCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2928) | cfg | Array.isArray |
| [`buildAtypicalWindowsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2935) | – | _psGetPeakCfg, _psGetWindowsFromCfg, document.createElement, els.psAtypicalWindows.appendChild, wins.forEach |
| [`_psCollectWindowRows`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3028) | – | Array.from, String, _psParseNumberList, els.psAtypicalWindows.querySelectorAll, get, out.push |
| [`get`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3034) | field | row.querySelector |
| [`_psUpdateAtypicalFieldState`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3060) | – | String, atypicalIds.forEach, els.psAtypicalWindows.querySelectorAll, standardIds.forEach |
| [`buildPeakShavingUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3095) | – | Math.round, Number, Number.isFinite, String, _psFormatDateList, _psGetPeakCfg, _psNumOrNull, _psSetNumberInput, _psSetSelect, _psSetTextInput, _psThresholdForVoltage, _psUpdateAtypicalFieldState, _psUpdateAtypicalReviewPreview, _psVoltageKey (weitere in der Quelle) |
| [`collectPeakShavingConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3163) | baseCfg | Math.max, Math.min, Math.round, Object.keys, String, _psCollectWindowRows, _psNumOrNull, _psParseDateList, _psThresholdForVoltage, _psVoltageKey, deepMerge, setNum, setStr |
| [`setNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3171) | key, el, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`setStr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3212) | key, el | String |
| [`buildDpTable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3257) | container, fields, getter, setter, options | console.warn, container.appendChild, makeRow, options.afterRow, refreshAllMeta |
| [`isRequiredGroupSatisfied`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3263) | groupName | getVal |
| [`getVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3266) | key | String, fieldInputs.get |
| [`refreshAllMeta`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3276) | – | metaUpdaters.forEach |
| [`makeRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3282) | field | String, _getFlowPowerDpIsW, btn.addEventListener, document.createElement, fieldInputs.set, getter, input.addEventListener, left.appendChild, metaUpdaters.push, right.appendChild, row.appendChild, unitCb.addEventListener, unitCb.setAttribute, unitLabel.appendChild (weitere in der Quelle) |
| [`updateMeta`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3386) | – | String, isRequiredGroupSatisfied |
| [`commitDpValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3420) | – | String, setter |
| [`_ensureVis`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3474) | – | – |
| [`_normalizeFlowConsumerType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3480) | raw | String |
| [`_getFlowConsumerTypeLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3488) | raw | _normalizeFlowConsumerType |
| [`_ensureFlowSlots`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3495) | – | Array.isArray, String, _ensureVis, norm |
| [`norm`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3515) | arr, count, kind | String, _normalizeFlowConsumerType, ensureBool, ensureString, ensureValue, out.push |
| [`ensureString`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3528) | key, def | String |
| [`ensureValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3538) | key, def | – |
| [`ensureBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3547) | key, def | – |
| [`_defaultSlotName`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3601) | kind, idx1based | – |
| [`buildFlowSlotsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3611) | kind, slotCount | FLOW_ICON_CHOICES.forEach, String, _defaultSlotName, _ensureFlowSlots, _getFlowPowerDpIsW, _normalizeFlowConsumerType, addGenericField, addHeatPumpField, advBtn.addEventListener, advanced.appendChild, btn.setAttribute, consumerTypeSelect.addEventListener, container.appendChild, document.createElement (weitere in der Quelle) |
| [`ensureCtrl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3822) | – | _ensureFlowSlots |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3844) | labelText, id, value, onChange | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, wrap.appendChild |
| [`mkSimpleField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3899) | labelText, id, type, value, placeholder, onChange | String, document.createElement, input.addEventListener, wrap.appendChild |
| [`mkCheckField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3935) | labelText, id, checked, onChange | document.createElement, input.addEventListener, row.appendChild, wrap.appendChild |
| [`addGenericField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3987) | el | ctrlFieldsGeneric.push, ctrlGrid.appendChild |
| [`addHeatPumpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3998) | el | ctrlFieldsHeatPump.push, ctrlGrid.appendChild |
| [`setVisible`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4047) | el, visible | – |
| [`updateConsumerControlVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4057) | – | _normalizeFlowConsumerType, ctrlFieldsGeneric.forEach, ctrlFieldsHeatPump.forEach, setVisible |
| [`buildFlowPvNameRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4106) | – | String, _ensureFlowSlots, document.createElement, input.addEventListener, left.appendChild, right.appendChild, row.appendChild |
| [`_getFlowConsumerSlotCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4159) | slot | Array.isArray, _ensureFlowSlots |
| [`_getFlowConsumerName`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4170) | slot | String, _getFlowConsumerSlotCfg |
| [`_getFlowConsumerTypeForSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4180) | slot | _getFlowConsumerSlotCfg, _normalizeFlowConsumerType |
| [`_getRawHeatingRodDeviceForSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4190) | slot | Array.isArray, _clampInt, arr.find |
| [`_getHeatingRodStageDpPair`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4208) | slot, stageIdx | Array.isArray, String, _getFlowConsumerSlotCfg, _getRawHeatingRodDeviceForSlot |
| [`_countHeatingRodWiredStages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4230) | slot | String, _getHeatingRodStageDpPair |
| [`_thermalDefaultSetpoints`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4244) | profile | String |
| [`_defaultHeatingRodStagePower`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4256) | maxPowerW, stageCount, index | Math.floor, Math.max, Math.round, Number, _clampInt |
| [`_computeHeatingRodStageDefaults`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4270) | maxPowerW, stageCount | Math.max, Math.round, _clampInt, _defaultHeatingRodStagePower, out.push |
| [`_syncHeatingRodDeviceStages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4293) | dev, opts | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _clampInt, _computeHeatingRodStageDefaults, next.push |
| [`_ensureThermalCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4331) | – | Array.isArray, Math.max, Math.round, Number, Number.isFinite, String, _clampInt, _thermalDefaultSetpoints, bySlot.get, bySlot.set, out.push |
| [`_normalizeHeatingRodAutoMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4392) | raw | String |
| [`_heatingRodAutoModeLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4409) | mode | _normalizeHeatingRodAutoMode |
| [`_normalizeHeatingRodClockTime`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4415) | raw, fallback | Math.max, Math.min, Math.round, Number, String |
| [`_ensureHeatingRodCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4430) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _clampInt, _getFlowConsumerSlotCfg, _normalizeHeatingRodAutoMode, _normalizeHeatingRodClockTime, _syncHeatingRodDeviceStages, bySlot.get, bySlot.set (weitere in der Quelle) |
| [`hn`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4477) | key, def, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`zn`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4508) | key, def, min, max, integer | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`_mkCfgInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4612) | type, value, onChange, opts | String, document.createElement, inp.addEventListener |
| [`commit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4635) | – | Number, onChange |
| [`_mkHeatingRodNumberInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4658) | key, value, onChange, opts | String, _mkCfgInput |
| [`flushHeatingRodConfigFromDom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4670) | – | document.querySelectorAll |
| [`_mkCfgSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4697) | value, options, onChange, opts | document.createElement, sel.addEventListener |
| [`_mkCfgToggle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4719) | checked, onChange, opts | cb.addEventListener, document.createElement |
| [`_mkCfgField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4734) | label, control, hint | document.createElement, wrap.appendChild |
| [`_mkCfgGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4763) | title | document.createElement, wrap.appendChild |
| [`_mkCfgDetailsGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4799) | title, open | document.createElement, wrap.appendChild |
| [`_mkCfgBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4838) | text, tone | document.createElement |
| [`_mkDeviceRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4864) | title, subtitle, badges | document.createElement, left.appendChild, row.appendChild |
| [`buildThermalUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4914) | – | String, _ensureThermalCfg, cfg.devices.forEach |
| [`syncVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5032) | – | String |
| [`rebuildHeatingRodUIStable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5052) | reason | String, buildHeatingRodUI, requestAnimationFrame |
| [`buildHeatingRodUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5091) | – | Array.from, _ensureHeatingRodCfg, _getFlowConsumerTypeForSlot, _heatingRodAutoModeLabel, _mkCfgDetailsGroup, _mkCfgField, _mkCfgGroup, _mkCfgInput, _mkCfgSelect, _mkCfgToggle, _mkHeatingRodNumberInput, document.createElement, els.heatingRodDevices.appendChild, grpAuto.body.appendChild (weitere in der Quelle) |
| [`mkStageDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5215) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, wrap.appendChild |
| [`_ensureBhkwCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5487) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, mkDefault, normalized.push, normalized.sort, used.add, used.has |
| [`mkDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5508) | idx | – |
| [`buildBhkwUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5619) | – | _ensureBhkwCfg, _mkDpWrap, actions.appendChild, adv.appendChild, advBtn.addEventListener, body.appendChild, card.appendChild, document.createElement, els.bhkwDevices.appendChild, header.appendChild, headerTop.appendChild, mkCheckbox, mkFieldRow, mkNumInput (weitere in der Quelle) |
| [`mkFieldRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5635) | labelTxt, controlEl, hintTxt | ctrl.appendChild, document.createElement, row.appendChild |
| [`mkTextInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5674) | value, onChange, placeholder | String, document.createElement, i.addEventListener |
| [`mkNumInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5697) | value, onChange | String, document.createElement, i.addEventListener |
| [`mkCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5725) | checked, text, onChange | cb.addEventListener, document.createElement, label.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5756) | value, opts, onChange | String, document.createElement, s.addEventListener, s.appendChild |
| [`_ensureGeneratorCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5895) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, mkDefault, normalized.push, normalized.sort, used.add, used.has |
| [`mkDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5916) | idx | – |
| [`buildGeneratorUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6018) | – | _ensureGeneratorCfg, _mkDpWrap, actions.appendChild, adv.appendChild, advBtn.addEventListener, body.appendChild, card.appendChild, document.createElement, els.generatorDevices.appendChild, header.appendChild, headerTop.appendChild, mkCheckbox, mkFieldRow, mkNumInput (weitere in der Quelle) |
| [`mkFieldRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6035) | labelTxt, controlEl, hintTxt | ctrl.appendChild, document.createElement, row.appendChild |
| [`mkTextInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6074) | value, onChange, placeholder | String, document.createElement, i.addEventListener |
| [`mkNumInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6097) | value, onChange | String, document.createElement, i.addEventListener |
| [`mkCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6123) | checked, text, onChange | cb.addEventListener, document.createElement, label.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6156) | value, opts, onChange | String, document.createElement, s.addEventListener, s.appendChild |
| [`_ensureThresholdCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6292) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, normCompare, normOutType, out.push, out.sort, used.add, used.has |
| [`normOutType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6313) | v | String |
| [`normCompare`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6323) | v | String |
| [`_nextFreeThresholdIdx`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6383) | – | _ensureThresholdCfg, used.has |
| [`buildThresholdUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6397) | – | Number, String, _ensureThresholdCfg, del.addEventListener, document.createElement, document.createTextNode, els.thresholdRules.appendChild, en.addEventListener, enWrap.appendChild, grid.appendChild, head.appendChild, item.appendChild, left.appendChild, listWrap.appendChild (weitere in der Quelle) |
| [`mkHdr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6428) | title, subtitle | document.createElement, wrap.appendChild |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6462) | text | document.createElement |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6483) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6536) | labelText, inputId, value, onChange, placeholder, unit | String, document.createElement, input.addEventListener, mkLabel, row.appendChild, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6582) | labelText, inputId, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6612) | labelText, inputId, value, options, onChange | String, document.createElement, mkLabel, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkBoolSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6646) | labelText, inputId, value, onChange | mkSelectField |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6665) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkLabel, wrap.appendChild |
| [`updateRule`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6702) | idx, patch | Object.assign, String, _ensureThresholdCfg, t2.rules.find |
| [`_ensureRelayCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6878) | – | Array.isArray, Math.max, Math.min, Math.round, Number, String, normType, numOrNull, out.push, out.sort, used.add, used.has |
| [`normType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6899) | v | String |
| [`numOrNull`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6909) | v | Number, Number.isFinite |
| [`_nextFreeRelayIdx`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6950) | – | _ensureRelayCfg, used.has |
| [`buildRelayUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6964) | – | Number, String, _ensureRelayCfg, del.addEventListener, document.createElement, document.createTextNode, els.relayControls.appendChild, en.addEventListener, enWrap.appendChild, grid.appendChild, head.appendChild, item.appendChild, left.appendChild, listWrap.appendChild (weitere in der Quelle) |
| [`mkHdr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6995) | title, subtitle | document.createElement, wrap.appendChild |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7029) | text | document.createElement |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7050) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7103) | labelText, inputId, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7133) | labelText, inputId, value, onChange, unit | String, document.createElement, input.addEventListener, mkLabel, row.appendChild, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7178) | labelText, inputId, value, options, onChange | String, document.createElement, mkLabel, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7212) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkLabel, wrap.appendChild |
| [`updateRelay`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7249) | idx, patch | Object.assign, String, _ensureRelayCfg, r2.relays.find |
| [`_normalizeGridExportControlCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7395) | gc | Math.max, Math.min, Math.round, Number, Number.isFinite, String, probe.trim, value.trim |
| [`_ensureGridConstraintsCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7435) | – | Array.isArray, Math.round, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, _normalizeGridExportControlCfg |
| [`normInv`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7521) | it | Number, Number.isFinite, String |
| [`buildGridConstraintsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7546) | – | Math.max, Math.round, Number, String, _ensureGridConstraintsCfg, advanced.appendChild, advancedFields.appendChild, basic.appendChild, clearAll, commands.appendChild, document.createElement, evuEl.appendChild, field.querySelector, fixedReserveW.toLocaleString (weitere in der Quelle) |
| [`mkMsg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7573) | text | document.createElement |
| [`clearAll`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7592) | – | – |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7628) | text | document.createElement |
| [`mkFieldWrap`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7649) | labelText | document.createElement, mkLabel, wrap.appendChild |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7668) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkFieldWrap, wrap.appendChild |
| [`mkNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7703) | labelText, inputId, value, onChange, unit, placeholder | String, document.createElement, input.addEventListener, mkFieldWrap, row.appendChild, wrap.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7747) | labelText, inputId, value, options, onChange | String, document.createElement, mkFieldWrap, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7779) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkFieldWrap, wrap.appendChild |
| [`mkHint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7829) | text | document.createElement |
| [`renderExportGuardRuntimeDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7845) | target | Date.now, document.createElement, fetchJson, target.appendChild |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7853) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`readVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7859) | data, key | Object.prototype.hasOwnProperty.call |
| [`parseJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7863) | raw | JSON.parse |
| [`renderGridImportRuntimeDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8072) | target | Date.now, document.createElement, fetchJson, target.appendChild |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8080) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`readVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8087) | data, key | Object.prototype.hasOwnProperty.call |
| [`stageLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8091) | stage | String |
| [`mkZeroSection`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8206) | parent, titleText, id, collapsed | document.createElement, parent.appendChild, section.appendChild |
| [`mkZeroFields`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8219) | parent | document.createElement, parent.appendChild |
| [`mkTitle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8329) | text | document.createElement |
| [`mkBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8348) | label, ok | document.createElement |
| [`mkInvItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8367) | list, idx, groupPrefix, groupLabel | Number.isFinite, String, advGrid.appendChild, advanced.appendChild, chips.appendChild, delBtn.addEventListener, document.createElement, editBtn.addEventListener, editBtn.setAttribute, kwpInput.addEventListener, kwpInput.setAttribute, meta.appendChild, mkBadge, mkDpField (weitere in der Quelle) |
| [`mkInvGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8516) | target, titleText, list, groupPrefix, groupLabel, inactiveHint | add.addEventListener, document.createElement, listWrap.appendChild, mkHint, mkInvItem, mkTitle, target.appendChild |
| [`_ensurePara14aCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8620) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, PARA14A_TYPES.some, String, ic.para14aActiveId.trim, ic.para14aEmsSetpointWId.trim, out.push |
| [`_mkDpWrap`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8682) | id, value, placeholder, onChange | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener |
| [`rebuildPara14aConsumersUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8721) | – | Array.isArray, _ensurePara14aCfg, document.createElement, els.para14aConsumers.appendChild, visibleRows.forEach |
| [`buildPara14aUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8912) | – | Math.round, Number, Number.isFinite, String, _ensurePara14aCfg, document.createElement, els.para14aConsumers.appendChild, lock, rebuildPara14aConsumersUI |
| [`lock`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8936) | el | – |
| [`getStorageMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8974) | – | String |
| [`getStorageCoupling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8986) | – | String |
| [`normalizeStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8997) | v | String |
| [`normalizeFeneconControlMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9006) | v | String |
| [`isFeneconGridTargetId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9013) | value | String |
| [`isFeneconDirectEssSetpointId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9021) | value | String |
| [`isFeneconGridMeasurementId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9029) | value | String, isFeneconGridTargetId |
| [`isFeneconHybridUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9037) | profile, coupling | String, normalizeStorageVendorProfile |
| [`getStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9047) | – | String, normalizeStorageVendorProfile |
| [`updateStorageCouplingUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9058) | – | getStorageCoupling |
| [`updateStorageVendorProfileUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9069) | – | String, getStorageCoupling, getStorageVendorProfile, isFeneconHybridUi |
| [`rebuildStorageTable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9105) | – | STORAGE_DP_FIELDS.filter, buildDpTable, getStorageCoupling, getStorageMode, getStorageVendorProfile, updateStorageCouplingUi, updateStorageVendorProfileUi |
| [`_ensureStorageFarmCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9147) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, String.fromCharCode, _clampInt, _normalizeRecoveredStorageFarmRow, grpOut.push, storOut.push |
| [`buildStorageFarmUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9210) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, String, _ensureStorageFarmCfg, _licenseEdition, _maxStorageCount, btn.addEventListener, card.appendChild, detail.appendChild, document.createElement, document.getElementById (weitere in der Quelle) |
| [`mkField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9313) | labelText | document.createElement, wrap.appendChild |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9337) | labelText, id, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkField, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9383) | labelText, id, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkField, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9409) | labelText, id, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkField, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9438) | labelText, id, value, options, onChange | String, document.createElement, mkField, sel.addEventListener, wrap.appendChild |
| [`mkCheckField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9468) | labelText, id, checked, onChange | box.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkField, wrap.appendChild |
| [`mkGridDivider`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9501) | text | document.createElement |
| [`mkGridHelp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9528) | text | document.createElement |
| [`_ensureStorageMultiUseCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9878) | – | _clampInt |
| [`_renderStorageMultiUseSummary`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9938) | mu | _clampInt, document.createElement, els.muStorageSummary.appendChild |
| [`buildStorageMultiUseUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9979) | – | _ensureStorageMultiUseCfg, document.createElement, els.muStorageSummary.appendChild, setDisabled, syncFromCfgToUi |
| [`setDisabled`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9999) | d | – |
| [`syncFromCfgToUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10026) | – | _ensureStorageMultiUseCfg, _renderStorageMultiUseSummary, numOrEmpty |
| [`syncFromUiToCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10057) | – | Math.max, _clampInt, _ensureStorageMultiUseCfg, _renderStorageMultiUseSummary, numOrEmpty, scheduleValidation |
| [`_clampInt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10136) | v, min, max, def | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`_ensureSettingsConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10148) | – | – |
| [`_ensureChargingManagementConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10159) | – | – |
| [`_ensureEvcsList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10170) | count | Array.isArray, _clampInt, _ensureSettingsConfig, _maxEvcsCount, list.push |
| [`_updateEvcsField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10185) | idx, field, value | _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount |
| [`_buildEvcsBoostLimitInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10201) | row, onChange | Math.max, Number, Number.isFinite, String, document.createElement, input.addEventListener, raw.trim |
| [`buildEvcsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10220) | – | Array.isArray, Number, Number.isFinite, String, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, actions.appendChild, body.appendChild, btnAddPort.addEventListener, btnSD.addEventListener, btnSU.addEventListener, card.appendChild (weitere in der Quelle) |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10267) | label, controlEl | controlEl.classList.add, controlEl.matches, ctl.appendChild, ctl.classList.add, document.createElement, row.appendChild |
| [`mkIo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10299) | id, value, onChange | btn.addEventListener, document.createElement, input.addEventListener, valueOrEmpty, wrap.appendChild |
| [`normKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10340) | k | String |
| [`ensureGroupForKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10384) | stationKey | groupIndexByKey.get, groupIndexByKey.has, groupIndexByKey.set, normKey, sc.stationGroups.push |
| [`moveStationGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10406) | stationKey, dir | arr.forEach, buildEvcsUI, buildStationGroupsUI, groupIndexByKey.clear, groupIndexByKey.get, normKey |
| [`renameStationKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10438) | oldKey, newKey | buildEvcsUI, buildStationGroupsUI, groupIndexByKey.get, normKey |
| [`addPortToStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10477) | stationKey | Math.min, Object.assign, String, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, buildEvcsUI, normKey |
| [`movePortWithinStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10506) | portIdx, stationKey, dir | buildEvcsUI, normKey |
| [`createPortCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10545) | i, stationKey | Math.round, Number, Number.isFinite, String, _buildEvcsBoostLimitInput, _clampInt, actions.appendChild, adv.appendChild, allowBoostInp.addEventListener, body.addEventListener, body.appendChild, boostTInput.addEventListener, btnDown.addEventListener, btnUp.addEventListener (weitere in der Quelle) |
| [`mkSemanticInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10758) | field, placeholder | document.createElement, input.addEventListener, valueOrEmpty |
| [`mkSmallText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10874) | field, placeholder | String, document.createElement, input.addEventListener |
| [`mkNumPhase`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10886) | field, placeholder, min, step, fallback | Number, Number.isFinite, String, document.createElement, input.addEventListener |
| [`refreshElectricalHint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11034) | – | _ensureSettingsConfig, check.errors.join, window.NexoWattEvcsElectricalLimits.validateEvcsElectricalConfig |
| [`buildStationGroupsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11219) | – | Array.isArray, _ensureSettingsConfig, arr.forEach, document.createElement, els.stationGroups.appendChild |
| [`collectSettingsConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11321) | – | Array.isArray, Number, Number.isFinite, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, deepMerge, out.evcsList.filter |
| [`applyConfigToUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11347) | cfg | Math.max, Math.round, Number, Number.isFinite, String, _isAppLicensed, _licenseEdition, applyEnergyFlowTsModeToUi, applyTariffProviderUI, buildAiAdvisorUI, buildAppsUI, buildBhkwUI, buildDpTable, buildEvcsUI (weitere in der Quelle) |
| [`afterRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11425) | field, _row, container | buildFlowPvNameRow, container.appendChild |
| [`fetchOcppDiscovery`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11693) | – | Array.isArray, fetchJson |
| [`_ocppStationIdentityFromDp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11704) | id | String, value.match |
| [`_ocppStationIdentityFromRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11715) | row | String, _ocppStationIdentityFromDp |
| [`_ocppStationIdentityFromConnector`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11733) | connector | _ocppStationIdentityFromDp |
| [`_isEmptyEvcsMappingRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11748) | row | – |
| [`_isKnownLegacyNexoWattOcppMapping`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11757) | field, currentId, replacementId | String, _ocppStationIdentityFromDp, current.toLowerCase, lower.endsWith, lower.startsWith, replacement.toLowerCase, replacementLower.startsWith |
| [`_applyOcppConnectorToRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11793) | row, c, opts | Math.max, Math.round, Number, Number.isFinite, Object.assign, String, setField |
| [`setField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11813) | k, v | String, _isKnownLegacyNexoWattOcppMapping, cur.trim |
| [`ocppAutoDetect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11881) | – | Array.isArray, Math.max, Math.min, String, _applyOcppConnectorToRow, _ensureSettingsConfig, buildEvcsUI, buildStationGroupsUI, existingList.some, fetchOcppDiscovery, scheduleValidation, setStatus, window.confirm |
| [`ocppMapExisting`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11934) | – | JSON.stringify, Math.min, String, _applyOcppConnectorToRow, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _ocppStationIdentityFromConnector, buildEvcsUI, buildStationGroupsUI, fetchOcppDiscovery, list.findIndex, list.push, list.slice (weitere in der Quelle) |
| [`_nwNormCat`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12017) | v | String |
| [`_nwDeviceClass`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12026) | dev | String |
| [`_isNwEvcsCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12029) | cat | _nwNormCat |
| [`_isNwEvcsDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12033) | dev | _isNwEvcsCategory, _nwDeviceClass |
| [`_isNwPvDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12037) | dev | _isNwPvInverterCategory, _nwDeviceClass |
| [`_isNwHeatDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12041) | dev | _isNwHeatCategory, _nwDeviceClass |
| [`_isNwStorageDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12045) | dev | _nwDeviceClass |
| [`_isNwMeterDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12049) | dev | _isNwMeterCategory, _nwDeviceClass |
| [`_isNwPvInverterCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12059) | cat | _nwNormCat |
| [`_isNwHeatCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12068) | cat | _nwNormCat |
| [`_nwGetAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12077) | dev, key | String |
| [`_nwGetWritableAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12086) | dev, key | String, _nwGetAlias |
| [`_nwGetAliasUnit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12091) | dev, key | String |
| [`_nwGetDpFallback`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12101) | dev, suffix | String |
| [`_applyNwDeviceToEvcsRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12112) | row, dev, opts | String, _nwGetAlias, _nwGetAliasUnit, _nwGetWritableAlias, _nwNormCat, currentChargeDemandId.startsWith, currentStatusId.startsWith, setIf |
| [`setIf`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12128) | k, v | String |
| [`_classifyHeatDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12234) | dev | String |
| [`_findFreeConsumerSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12253) | range | String |
| [`_isNwMeterCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12269) | cat | _nwNormCat |
| [`_isNwStorageCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12279) | cat | _nwNormCat |
| [`_nwDevHaystack`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12289) | dev | String |
| [`_nwHasAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12304) | dev, key | String, _nwGetAlias |
| [`_nwScoreGridMeter`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12313) | dev | _isNwMeterDevice, _isNwPvDevice, _isNwStorageDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwScorePvSource`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12333) | dev | _isNwMeterDevice, _isNwPvDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwScoreStorage`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12350) | dev | _isNwStorageDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwPickBestDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12369) | devices, scorer, opts | Array.isArray, Number, Number.isFinite |
| [`_nwApplyFlowDpIfEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12389) | key, value, opts | String, _setFlowPowerDpIsW, document.getElementById, inp.dispatchEvent |
| [`_nwApplyGeneralDpIfEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12419) | key, value | String, els.gridPointConnectedId.dispatchEvent, els.gridPointWatchdogId.dispatchEvent |
| [`_nwAutoMapEnergyFlowFromDevices`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12461) | devices | Array.isArray, String, _ensureFlowSlots, _nwApplyFlowDpIfEmpty, _nwApplyGeneralDpIfEmpty, _nwGetAlias, _nwPickBestDevice, document.getElementById, list.filter, list.some, out.notes.push |
| [`_nwAutoMapStorageAppFromDevices`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12568) | devices | Array.isArray, String, _nwGetAlias, _nwGetWritableAlias, isFeneconDirectEssSetpointId, isFeneconGridMeasurementId, isFeneconGridTargetId, normalizeFeneconControlMode, normalizeStorageVendorProfile, result.notes.push, result.notes.unshift, setEmpty |
| [`setEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12580) | key, value | String |
| [`nwDevicesQuickSetup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12702) | – | Array.isArray, JSON.stringify, Math.max, Math.round, Number, Number.isFinite, String, _applyNwDeviceToEvcsRow, _clampInt, _classifyHeatDevice, _countHeatingRodWiredStages, _ensureEvcsList, _ensureFlowSlots, _ensureGridConstraintsCfg (weitere in der Quelle) |
| [`addOrUpdate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12788) | dev | JSON.stringify, String, _nwGetAlias, _nwGetWritableAlias, list.find, list.push |
| [`findPara14aMatch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12864) | dev, setId, enableId | String |
| [`loadConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13029) | – | Date.now, applyConfigToUI, clearDirty, fetchJson, fetchLicenseInfoFallback, hydrateStorageFarmConfigFromRuntimeState, scheduleValidation, setStatus |
| [`applyReleaseSafetyGateToPatch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13062) | patch | Array.isArray, restoreArrayIfDangerouslyEmpty, srcRows.slice |
| [`restoreArrayIfDangerouslyEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13064) | section, key, markerName | Array.isArray, console.warn, currentRows.slice |
| [`collectPatchFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13108) | – | Array.from, Array.isArray, JSON.parse, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.assign, String, _clampInt, _coupleTariffProviderDatapointsSync, _ensureFlowSlots, _ensurePara14aCfg (weitere in der Quelle) |
| [`readNlP1`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13157) | name | String, document.querySelector |
| [`readNlP1Dp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13161) | name | String, document.querySelector |
| [`nlp1Number`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13165) | name, fallback, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite, readNlP1 |
| [`readMesh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13261) | row, field | String, row.querySelector |
| [`safeMeshId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13265) | value, fallback | String |
| [`readMeshPowerLimit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13311) | row, field | Math.round, Number, Number.isFinite, readMesh |
| [`splitLpList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13349) | raw | String |
| [`readCk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13353) | row, field | String, row.querySelector |
| [`readCkPrice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13357) | row, field | Math.max, Math.min, Math.round, Number, Number.isFinite, readCk |
| [`readCkInt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13362) | row, field, fallback, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite, readCk |
| [`_storageFarmStorageCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13678) | cfg | Array.isArray, sf.storages.filter |
| [`applyAppCenterRegressionSafetyGate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13690) | patch | Date.now, _storageFarmStorageCount, deepMerge, guarded.push |
| [`_sgArray`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13736) | v | Array.isArray |
| [`_sgObject`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13737) | v | – |
| [`_sgNonEmptyString`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13738) | v | String |
| [`_sgCountStorages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13739) | cfg | _sgArray, _sgObject |
| [`_sgCountGroups`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13740) | cfg | _sgArray, _sgObject |
| [`_sgCountEvcs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13741) | cfg | Math.max, Number, _sgArray, _sgObject |
| [`_sgCountChargeKiosk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13745) | cfg | _sgArray, _sgObject |
| [`_sgCountMeshNodes`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13746) | cfg | _sgArray, _sgObject |
| [`_sgCountMeshPeers`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13747) | cfg | Math.max, _sgArray, _sgObject |
| [`_sgCountNlP1Mappings`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13753) | cfg | Object.keys, _sgObject |
| [`_sgRestore`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13757) | report, path, reason | report.restored.push |
| [`applyReleaseRegressionSafetyGate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13761) | patch | _sgArray, _sgCountChargeKiosk, _sgCountEvcs, _sgCountGroups, _sgCountMeshNodes, _sgCountMeshPeers, _sgCountNlP1Mappings, _sgCountStorages, _sgObject, _sgRestore, deepMerge, report.warnings.push |
| [`validateFeneconStorageConfiguration`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13836) | patch | Array.isArray, Math.max, Object.prototype.hasOwnProperty.call, String, _normalizeRecoveredStorageFarmRow, isDirectEssSetpoint, isGridMeasurement, isGridTarget, normalizeFeneconControlMode, rows.filter, sf.storages.filter, validateOne |
| [`normalizeId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13838) | value | String |
| [`sameId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13839) | a, b | normalizeId |
| [`isPowerBalance`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13844) | value | normalizeId |
| [`isDirectEssSetpoint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13852) | value | isFeneconDirectEssSetpointId |
| [`isGridTarget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13853) | value | isFeneconGridTargetId |
| [`isGridMeasurement`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13854) | value | isFeneconGridMeasurementId |
| [`validateOne`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13855) | { name = 'Speicher', vendorProfile, coupling, mode, nativeTarget, essActual, directTargets = [], otherWritableStorageCount = 0 } | String, directIds.push, directIds.some, directTargets.map, isDirectEssSetpoint, isGridMeasurement, isGridTarget, isPowerBalance, normalizeStorageVendorProfile, sameId |
| [`flushDpInputsToConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13984) | – | Array.from, document.querySelectorAll, input.dispatchEvent |
| [`saveConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13997) | – | Array.isArray, JSON.stringify, _maxStorageCount, _storageFarmStorageCount, applyAppCenterRegressionSafetyGate, applyConfigToUI, applyReleaseRegressionSafetyGate, check.errors.join, clearDirty, collectPatchFromUI, fetchJson, flushDpInputsToConfig, setStatus, validateFeneconStorageConfiguration (weitere in der Quelle) |
| [`_showTab`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14033) | tabId | Array.from, btns.forEach, document.querySelectorAll, els.tabs.querySelectorAll, panels.forEach, refreshChargingDiag, refreshEmsStatus |
| [`initTabs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14059) | – | Array.from, _showTab, btns.forEach, els.tabs.querySelectorAll |
| [`initFlowSubtabs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14079) | – | Array.from, btns.forEach, document.getElementById, document.querySelectorAll, show, wrap.querySelectorAll |
| [`show`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14098) | id | String, btns.forEach, panels.forEach |
| [`_fmtTs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14124) | ts | Number.isFinite, d.getTime, d.toLocaleString |
| [`renderEmsStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14137) | payload | Array.isArray, Number.isFinite, String, _fmtTs, els.emsStatus.appendChild, mkItem |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14146) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_asBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14211) | v | v.trim |
| [`_asNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14223) | v, fallback | Number, Number.isFinite |
| [`renderChargingDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14233) | payload | Array.isArray, Math.round, Number.isFinite, String, _asBool, _asNum, els.chargingDiag.appendChild, flags.join, flags.push, mkItem, targetA.toFixed |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14242) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14333) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`_fmtKwh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14345) | v | Number, Number.isFinite, n.toFixed |
| [`_fmtEurKwh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14356) | v | Number, Number.isFinite, n.toFixed |
| [`_fmtIsoShort`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14367) | v | Number.isFinite, String, d.getTime, d.toLocaleString |
| [`_fmtPct`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14380) | v | Math.round, Number, Number.isFinite |
| [`renderStationsDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14391) | payload | Array.isArray, Math.round, Number, Number.isFinite, String, _fmtW, els.stationsDiag.appendChild, mkItem |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14400) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_fmtBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14467) | v, tTrue, tFalse | – |
| [`_parseShadowJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14485) | raw, fallback | JSON.parse, String, text.slice |
| [`_shadowDiffList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14511) | shadow | Object.keys, String, add, readList |
| [`add`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14514) | label, jsVal, tsVal, diff | String, out.push |
| [`readList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14517) | arr, prefix | Array.isArray, arr.forEach |
| [`_shadowKind`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14552) | shadow | _shadowDiffList |
| [`_shadowStatusLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14570) | kind, shadow | – |
| [`_shadowHumanExplanation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14591) | title, shadow, diffs | Array.isArray, String |
| [`_formatShadowJsonForDisplay`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14613) | value | JSON.stringify |
| [`_shadowDecodeDisplayText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14629) | value | String, decodeURIComponent |
| [`_shadowEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14647) | value | _shadowDecodeDisplayText |
| [`_openShadowJsonDialog`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14668) | title, payload | _formatShadowJsonForDisplay, _shadowEscape, backdrop.addEventListener, backdrop.querySelector, document.body.appendChild, document.createElement, document.getElementById, existing.remove, text.focus, text.setSelectionRange |
| [`close`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14690) | – | backdrop.remove |
| [`_normalizeEnergyFlowTsModeUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14721) | value | String |
| [`applyEnergyFlowTsModeToUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14737) | cfg | Math.max, Math.min, Math.round, Number, String, _normalizeEnergyFlowTsModeUi, renderEnergyFlowTsModeStatus |
| [`collectEnergyFlowTsMigrationFromUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14760) | base | Math.max, Math.min, Math.round, Number, Number.isFinite, _normalizeEnergyFlowTsModeUi, deepMerge |
| [`renderEnergyFlowTsModeStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14787) | readiness | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _decodeShadowDisplayText, _normalizeEnergyFlowTsModeUi, _shadowEscape, escape, plan.blockedReasons.map, safety.warnings.join |
| [`_renderShadowPlantEvaluationCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14836) | evaluation | Array.isArray, Number, String, btn.addEventListener, card.querySelector, document.createElement, escape, evaluation.recentSamples.slice, lines.map, recent.map |
| [`_renderHeatingRodTsRuntimeEvaluationCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14891) | evaluation | Array.isArray, Number, String, btn.addEventListener, card.querySelector, document.createElement, escape, evaluation.fallbackReasons.filter, rows.map |
| [`_renderEnergyFlowTsActiveTestCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14990) | activeTest, fixedSource | Array.isArray, Number, String, _decodeShadowDisplayText, activeTest.recentSamples.slice, blockers.join, btn.addEventListener, card.querySelector, document.createElement, escape, latest.blockers.map, lines.map, recent.map |
| [`_renderShadowReadinessCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15044) | readiness | Array.isArray, candidateSafety.blockers.map, candidateSafety.warnings.map, document.createElement, escape, items.map, readiness.blockers.map, readiness.warnings.map |
| [`renderShadowDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15117) | payload | Object.assign, _parseShadowJson, _rememberOpenShadowDetails, _renderEnergyFlowTsActiveTestCard, _renderHeatingRodTsRuntimeEvaluationCard, _renderShadowPlantEvaluationCard, _renderShadowReadinessCard, cards.forEach, document.createElement, els.shadowDiagnostics.appendChild, renderEnergyFlowTsModeStatus |
| [`renderChargingBudget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15246) | payload | Array.isArray, JSON.parse, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _fmtAge, _fmtBool, _fmtEurKwh, _fmtIsoShort, _fmtKwh, _fmtPct (weitere in der Quelle) |
| [`mkCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15275) | titleText, lines, statusKind | b.appendChild, card.appendChild, document.createElement, h.appendChild, statusKind.toUpperCase, top.appendChild |
| [`n`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15340) | x | Number |
| [`b`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15347) | x | – |
| [`refreshChargingDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15625) | – | fetchJson, renderChargingBudget, renderChargingDiag, renderStationsDiag |
| [`refreshEmsStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15639) | – | fetchJson, renderEmsStatus, window.NexoWattNvpDiagnostics?.render |
| [`startStatusPolling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15651) | – | clearInterval, setInterval |
| [`openDpModal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15670) | targetInputId | currentId.split, currentInput.value.trim, currentParts.slice, document.getElementById, els.dpModal.classList.remove, els.dpModal.setAttribute, refreshTree |
| [`closeDpModal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15699) | – | els.dpModal.classList.add, els.dpModal.setAttribute |
| [`setDpTargetValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15712) | id | closeDpModal, document.getElementById, inp.dispatchEvent |
| [`renderBreadcrumb`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15726) | – | els.dpBreadcrumb.appendChild, mkCrumb, sep |
| [`mkCrumb`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15737) | label, prefix, clickable | b.addEventListener, document.createElement |
| [`sep`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15759) | – | document.createElement |
| [`mkDpResultRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15784) | primary, meta, onClick | document.createElement, row.addEventListener, row.appendChild |
| [`refreshTree`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15811) | – | Array.isArray, String, document.createElement, els.dpTree.appendChild, encodeURIComponent, fetchJson, metaBits.join, metaBits.push, mkDpResultRow, renderBreadcrumb |
| [`doSearch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15876) | – | Array.isArray, String, document.createElement, els.dpResults.appendChild, encodeURIComponent, fetchJson, metaBits.join, metaBits.push, mkDpResultRow |
| [`upOne`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15910) | – | parts.join, parts.pop, treePrefix.split |
| [`getInstallerAdminUrl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15938) | – | String, params.get, ref.hash.indexOf, ref.pathname.includes |
| [`initInstallerBackLink`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15997) | – | getInstallerAdminUrl, link.addEventListener, link.setAttribute |
| [`_updateStorageCoupling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16054) | – | getStorageCoupling, rebuildStorageTable, scheduleValidation, updateStorageCouplingUi |
| [`_update`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16073) | – | Number, Number.isFinite |
| [`_updateStorageRatedPower`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16096) | – | Math.abs, Math.min, Math.round, Number, Number.isFinite, String, _storagePowerProfileInfo, scheduleValidation, updateStorageLicensePowerUi |
| [`_updateStorageSelfNvpControl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16125) | – | _clampInt, scheduleValidation |
| [`_updateStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16174) | – | String, _clampInt, getStorageCoupling, getStorageVendorProfile, rebuildStorageTable, scheduleValidation, updateStorageVendorProfileUi |
| [`backupRefreshInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16621) | – | String, fetchJson |
| [`backupExport`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16653) | – | backupRefreshInfo, downloadJsonFile, fetchJson, setBackupStatus, ts.toISOString |
| [`backupDoImportFromObj`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16677) | obj | JSON.stringify, backupRefreshInfo, fetchJson, loadConfig, setBackupStatus |
| [`backupImportFromFile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16690) | file | JSON.parse, backupDoImportFromObj, readFileAsText, setBackupStatus |
| [`backupRestoreFromUserdata`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16709) | – | backupDoImportFromObj, fetchJson, setBackupStatus, window.confirm |
| [`requireAppCenterAccessBeforeLoad`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16883) | – | Array.isArray, Date.now, caps.includes, fetch, r.json, window.NW_AUTH.requireCapability |
| [`updateAdminOnlyActions`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16900) | – | document.getElementById, window.NW_AUTH.getState |
