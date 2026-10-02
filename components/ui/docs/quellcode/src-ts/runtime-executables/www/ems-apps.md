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
| [`_licenseEdition`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1041) | – | String |
| [`_maxStorageCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1053) | – | _licenseEdition |
| [`_appLicenseFeature`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1058) | appId | String |
| [`_isFeatureLicensed`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1062) | feature | HOME_LICENSE_FEATURES.has, Object.prototype.hasOwnProperty.call, String, _licenseEdition |
| [`_isAppLicensed`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1072) | appId | HEMS_APP_IDS.has, String, _appLicenseFeature, _isFeatureLicensed, _licenseEdition |
| [`_maxEvcsCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1079) | – | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`_licenseLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1084) | – | _licenseEdition |
| [`_storagePowerProfileInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1091) | – | Math.max, Number, Number.isFinite, String, _licenseEdition |
| [`updateStorageLicensePowerUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1111) | – | Number, Number.isFinite, _storagePowerProfileInfo, els.storageRatedPowerKW.removeAttribute |
| [`normalizeLicenseInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1139) | raw | JSON.parse, Math.max, Math.round, Number, Number.isFinite, Object.keys, String, asBool, featuresJsonRaw.trim, unwrap |
| [`unwrap`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1141) | value | Object.prototype.hasOwnProperty.call |
| [`asBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1148) | value | String, unwrap |
| [`_licenseIsUsable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1208) | info | – |
| [`_inferLicenseFromSuccessfulInstallerGate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1212) | data, cfg | normalizeLicenseInfo |
| [`fetchLicenseInfoFallback`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1223) | – | Date.now, fetchJson, normalizeLicenseInfo |
| [`fetchLicenseInfoFromStateFallback`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1232) | – | Date.now, String, fetchJson, normalizeLicenseInfo, readVal |
| [`readVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1235) | key | Object.prototype.hasOwnProperty.call |
| [`_readApiStateValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1276) | statePayload, key, fallback | Object.keys, Object.prototype.hasOwnProperty.call, String |
| [`_parseStorageFarmRuntimeList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1293) | raw | Array.isArray, JSON.parse, String |
| [`_recoverStorageFarmRowsFromStatusRows`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1306) | statusRows | Array.isArray |
| [`_normalizeRecoveredStorageFarmRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1332) | row, index | boolFrom, normalizeStorageVendorProfile, numberFrom, numberOrDefault, textFrom |
| [`textFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1335) | keys | String |
| [`numberFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1346) | keys | Number, Number.isFinite, String, raw.includes, raw.lastIndexOf, raw.replace |
| [`numberOrDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1366) | fallback, keys | numberFrom |
| [`boolFrom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1370) | fallback, keys | Object.prototype.hasOwnProperty.call, String |
| [`hydrateStorageFarmConfigFromRuntimeState`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1434) | cfg | Array.from, Array.isArray, Date.now, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _parseStorageFarmRuntimeList, _readApiStateValue, _recoverStorageFarmRowsFromStatusRows, fetchJson, runtimeGroups.slice (weitere in der Quelle) |
| [`refreshLicenseForAppCenter`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1487) | reason | JSON.stringify, _licenseEdition, _licenseIsUsable, _licenseLabel, buildAppsUI, buildEvcsUI, fetchLicenseInfoFallback, fetchLicenseInfoFromStateFallback, normalizeLicenseInfo, scheduleValidation, setStatus, updateStorageLicensePowerUi |
| [`_decodeShadowDisplayText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1514) | value | String, decodeURIComponent |
| [`_rememberOpenShadowDetails`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1520) | – | document.querySelectorAll |
| [`_ensureSettingsObj`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1536) | – | – |
| [`_ensureFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1542) | – | _ensureSettingsObj |
| [`_getFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1548) | key | Object.prototype.hasOwnProperty.call, _ensureSettingsObj |
| [`_setFlowPowerDpIsW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1558) | key, isW | _ensureFlowPowerDpIsW, document.querySelectorAll |
| [`_collectFlowPowerDpIsWFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1568) | – | document.querySelectorAll |
| [`setStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1578) | msg, kind | – |
| [`setDirty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1586) | – | els.save.setAttribute |
| [`clearDirty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1594) | – | els.save.setAttribute |
| [`setBackupStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1603) | msg, kind | – |
| [`downloadJsonFile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1610) | filename, obj | JSON.stringify, URL.createObjectURL, a.click, document.body.appendChild, document.createElement, setTimeout |
| [`readFileAsText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1627) | file | – |
| [`fetchJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1640) | url, opts | Object.assign, fetch, res.json |
| [`_fmtAge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1656) | ageMs | Math.round, Number, Number.isFinite |
| [`_setBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1668) | inputId, kind, text | document.getElementById, el.classList.add, el.classList.remove |
| [`scheduleValidation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1676) | delayMs | Number.isFinite, clearTimeout, setTimeout |
| [`runValidation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1682) | showStatusMessage | Array.from, JSON.stringify, String, _fmtAge, _setBadge, document.querySelectorAll, fetchJson, ids.push, seen.add, seen.has, setStatus |
| [`deepMerge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1759) | target, patches | Array.isArray, JSON.parse, JSON.stringify, Object.keys, deepMerge |
| [`valueOrEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1775) | v | String |
| [`numOrEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1779) | v | Number.isFinite, String |
| [`_aiSetNumberInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1783) | el, value, def | Number, Number.isFinite, String |
| [`_aiSetCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1790) | el, value, def | – |
| [`_aiSetInputValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1795) | el, value, def | String |
| [`buildAiAdvisorUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1803) | – | String, _aiSetCheckbox, _aiSetInputValue, _aiSetNumberInput |
| [`collectAiAdvisorConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1868) | base | String, deepMerge, n, str |
| [`n`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1871) | el, def, min, max, roundValue | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`str`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1879) | el, def | String |
| [`_nwHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1956) | input | String |
| [`_nwSystemProfileCountry`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1973) | – | String |
| [`buildSystemProfileCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L1979) | – | String, _nwSystemProfileCountry, card.querySelector, card.setAttribute, document.createElement, lang.toUpperCase, sel.addEventListener |
| [`buildNlP1Card`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2042) | – | Number, Number.isFinite, _nwHtmlEscape, _nwSystemProfileCountry, card.setAttribute, document.createElement |
| [`_chargeKioskHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2086) | input | String |
| [`_chargeKioskStations`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2095) | – | Array.isArray |
| [`_chargeKioskToken`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2100) | – | Math.random, crypto.getRandomValues, out.replace |
| [`_chargeKioskAssignedToText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2113) | v | Array.isArray, arr.map |
| [`_chargeKioskStationCatalog`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2118) | – | Array.from, Array.isArray, byKey.values, evcs.forEach, groups.forEach |
| [`ensure`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2125) | rawKey | String, byKey.get, byKey.has, byKey.set |
| [`_chargeKioskAssignedForStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2151) | stationKey | String, _chargeKioskStationCatalog, item.chargepoints.map |
| [`_chargeKioskStationOptionsHtml`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2157) | selectedKey | String, _chargeKioskStationCatalog, options.join |
| [`buildChargeKioskCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2167) | – | _chargeKioskStations, _licenseEdition, add.addEventListener, card.querySelector, card.querySelectorAll, card.setAttribute, document.createElement, stations.map |
| [`refreshChargeKioskAssignmentRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2262) | row | String, _chargeKioskAssignedForStation, _chargeKioskAssignedToText, row.querySelector |
| [`_meshHtmlEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2327) | input | String |
| [`_meshNodes`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2335) | – | Array.isArray |
| [`_meshNodeRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2340) | node, index | Array.isArray, _meshHtmlEscape, n.targetGroupIds.join |
| [`buildMeshMicrogridCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2400) | – | _meshNodes, buildLegacyMeshMicrogridCard, card.appendChild, document.createElement, encodeURIComponent, legacy.appendChild |
| [`buildLegacyMeshMicrogridCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2425) | – | Array.isArray, JSON.stringify, String, _licenseEdition, _meshHtmlEscape, _meshNodes, add.addEventListener, card.querySelector, cfg.tailscale.peerUrls.join, document.createElement |
| [`buildAppCenterStructurePanels`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2534) | – | _isAppLicensed, buildChargeKioskCard, buildMeshMicrogridCard, buildNlP1Card, buildSystemProfileCard, mount, window.NexoWattNetOperatorAppCenter.render, window.NexoWattOperatingStrategiesAppCenter.render |
| [`mount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2535) | el, card | el.appendChild |
| [`setupInstallerBackButton`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2603) | – | btn.addEventListener, btn.setAttribute, buildTarget |
| [`parseQuery`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2608) | – | – |
| [`detectInstance`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2612) | – | Math.max, Math.round, Number, Number.isFinite, String, hash.match, parseQuery, qs.get |
| [`detectAdminOrigin`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2625) | – | String, parseQuery, qs.get |
| [`buildTarget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2658) | – | detectAdminOrigin, detectInstance |
| [`buildAppsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2675) | – | APP_CATALOG.filter, _licenseEdition, _licenseLabel, _maxEvcsCount, actions.appendChild, appendAppConfigNavigation, buildAppCenterStructurePanels, card.appendChild, card.setAttribute, document.createElement, els.appsList.appendChild, getSt, header.appendChild, mkToggle (weitere in der Quelle) |
| [`getSt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2679) | appId | – |
| [`appendAppConfigNavigation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2722) | body, app, st | String, body.appendChild, btn.addEventListener, btn.setAttribute, document.createElement, op.setAttribute, row.appendChild, row.setAttribute |
| [`mkToggle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2786) | id, label, checked, disabled, onLabel, offLabel, toggleKind | bOff.classList.add, bOff.setAttribute, bOn.classList.add, bOn.setAttribute, document.createElement, grp.appendChild, grp.classList.add, grp.setAttribute, wrap.appendChild, wrap.setAttribute |
| [`setAppsFromConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2927) | cfg | applyAppDependentVisibility, document.getElementById, window.nwSyncToggleButtons |
| [`applyAppDependentVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2953) | – | appsTab.click, document.querySelector, isInstalled, toggleCard |
| [`isInstalled`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2955) | appId | document.getElementById |
| [`toggleCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L2960) | cardKey, show | document.querySelector |
| [`_psDefaultWindow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3016) | – | – |
| [`_psGetPeakCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3030) | – | – |
| [`_psGetWindowsFromCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3037) | cfg | Array.isArray |
| [`buildAtypicalWindowsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3044) | – | _psGetPeakCfg, _psGetWindowsFromCfg, document.createElement, els.psAtypicalWindows.appendChild, wins.forEach |
| [`_psCollectWindowRows`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3137) | – | Array.from, String, _psParseNumberList, els.psAtypicalWindows.querySelectorAll, get, out.push |
| [`get`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3143) | field | row.querySelector |
| [`_psUpdateAtypicalFieldState`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3169) | – | String, atypicalIds.forEach, els.psAtypicalWindows.querySelectorAll, standardIds.forEach |
| [`buildPeakShavingUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3204) | – | Math.round, Number, Number.isFinite, String, _psFormatDateList, _psGetPeakCfg, _psNumOrNull, _psSetNumberInput, _psSetSelect, _psSetTextInput, _psThresholdForVoltage, _psUpdateAtypicalFieldState, _psUpdateAtypicalReviewPreview, _psVoltageKey (weitere in der Quelle) |
| [`collectPeakShavingConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3272) | baseCfg | Math.max, Math.min, Math.round, Object.keys, String, _psCollectWindowRows, _psNumOrNull, _psParseDateList, _psThresholdForVoltage, _psVoltageKey, deepMerge, setNum, setStr |
| [`setNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3280) | key, el, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`setStr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3321) | key, el | String |
| [`buildDpTable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3366) | container, fields, getter, setter, options | console.warn, container.appendChild, makeRow, options.afterRow, refreshAllMeta |
| [`isRequiredGroupSatisfied`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3372) | groupName | getVal |
| [`getVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3375) | key | String, fieldInputs.get |
| [`refreshAllMeta`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3385) | – | metaUpdaters.forEach |
| [`makeRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3391) | field | String, _getFlowPowerDpIsW, btn.addEventListener, document.createElement, fieldInputs.set, getter, input.addEventListener, left.appendChild, metaUpdaters.push, right.appendChild, row.appendChild, unitCb.addEventListener, unitCb.setAttribute, unitLabel.appendChild (weitere in der Quelle) |
| [`updateMeta`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3495) | – | String, isRequiredGroupSatisfied |
| [`commitDpValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3529) | – | String, setter |
| [`_ensureVis`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3583) | – | – |
| [`_normalizeFlowConsumerType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3589) | raw | String |
| [`_getFlowConsumerTypeLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3597) | raw | _normalizeFlowConsumerType |
| [`_ensureFlowSlots`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3604) | – | Array.isArray, String, _ensureVis, norm |
| [`norm`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3624) | arr, count, kind | String, _normalizeFlowConsumerType, ensureBool, ensureString, ensureValue, out.push |
| [`ensureString`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3637) | key, def | String |
| [`ensureValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3647) | key, def | – |
| [`ensureBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3656) | key, def | – |
| [`_defaultSlotName`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3710) | kind, idx1based | – |
| [`buildFlowSlotsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3720) | kind, slotCount | FLOW_ICON_CHOICES.forEach, String, _defaultSlotName, _ensureFlowSlots, _getFlowPowerDpIsW, _normalizeFlowConsumerType, addGenericField, addHeatPumpField, advBtn.addEventListener, advanced.appendChild, btn.setAttribute, consumerTypeSelect.addEventListener, container.appendChild, document.createElement (weitere in der Quelle) |
| [`ensureCtrl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3931) | – | _ensureFlowSlots |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L3953) | labelText, id, value, onChange | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, wrap.appendChild |
| [`mkSimpleField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4008) | labelText, id, type, value, placeholder, onChange | String, document.createElement, input.addEventListener, wrap.appendChild |
| [`mkCheckField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4044) | labelText, id, checked, onChange | document.createElement, input.addEventListener, row.appendChild, wrap.appendChild |
| [`addGenericField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4096) | el | ctrlFieldsGeneric.push, ctrlGrid.appendChild |
| [`addHeatPumpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4107) | el | ctrlFieldsHeatPump.push, ctrlGrid.appendChild |
| [`setVisible`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4156) | el, visible | – |
| [`updateConsumerControlVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4166) | – | _normalizeFlowConsumerType, ctrlFieldsGeneric.forEach, ctrlFieldsHeatPump.forEach, setVisible |
| [`buildFlowPvNameRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4215) | – | String, _ensureFlowSlots, document.createElement, input.addEventListener, left.appendChild, right.appendChild, row.appendChild |
| [`_getFlowConsumerSlotCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4268) | slot | Array.isArray, _ensureFlowSlots |
| [`_getFlowConsumerName`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4279) | slot | String, _getFlowConsumerSlotCfg |
| [`_getFlowConsumerTypeForSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4289) | slot | _getFlowConsumerSlotCfg, _normalizeFlowConsumerType |
| [`_getRawHeatingRodDeviceForSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4299) | slot | Array.isArray, _clampInt, arr.find |
| [`_getHeatingRodStageDpPair`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4317) | slot, stageIdx | Array.isArray, String, _getFlowConsumerSlotCfg, _getRawHeatingRodDeviceForSlot |
| [`_countHeatingRodWiredStages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4339) | slot | String, _getHeatingRodStageDpPair |
| [`_thermalDefaultSetpoints`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4353) | profile | String |
| [`_defaultHeatingRodStagePower`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4365) | maxPowerW, stageCount, index | Math.floor, Math.max, Math.round, Number, _clampInt |
| [`_computeHeatingRodStageDefaults`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4379) | maxPowerW, stageCount | Math.max, Math.round, _clampInt, _defaultHeatingRodStagePower, out.push |
| [`_syncHeatingRodDeviceStages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4402) | dev, opts | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _clampInt, _computeHeatingRodStageDefaults, next.push |
| [`_ensureThermalCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4440) | – | Array.isArray, Math.max, Math.round, Number, Number.isFinite, String, _clampInt, _thermalDefaultSetpoints, bySlot.get, bySlot.set, out.push |
| [`_normalizeHeatingRodAutoMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4501) | raw | String |
| [`_heatingRodAutoModeLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4518) | mode | _normalizeHeatingRodAutoMode |
| [`_normalizeHeatingRodClockTime`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4524) | raw, fallback | Math.max, Math.min, Math.round, Number, String |
| [`_ensureHeatingRodCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4539) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _clampInt, _getFlowConsumerSlotCfg, _normalizeHeatingRodAutoMode, _normalizeHeatingRodClockTime, _syncHeatingRodDeviceStages, bySlot.get, bySlot.set (weitere in der Quelle) |
| [`hn`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4586) | key, def, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`zn`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4617) | key, def, min, max, integer | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`_mkCfgInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4721) | type, value, onChange, opts | String, document.createElement, inp.addEventListener |
| [`commit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4744) | – | Number, onChange |
| [`_mkHeatingRodNumberInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4767) | key, value, onChange, opts | String, _mkCfgInput |
| [`flushHeatingRodConfigFromDom`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4779) | – | document.querySelectorAll |
| [`_mkCfgSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4806) | value, options, onChange, opts | document.createElement, sel.addEventListener |
| [`_mkCfgToggle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4828) | checked, onChange, opts | cb.addEventListener, document.createElement |
| [`_mkCfgField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4843) | label, control, hint | document.createElement, wrap.appendChild |
| [`_mkCfgGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4872) | title | document.createElement, wrap.appendChild |
| [`_mkCfgDetailsGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4908) | title, open | document.createElement, wrap.appendChild |
| [`_mkCfgBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4947) | text, tone | document.createElement |
| [`_mkDeviceRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L4973) | title, subtitle, badges | document.createElement, left.appendChild, row.appendChild |
| [`buildThermalUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5023) | – | String, _ensureThermalCfg, cfg.devices.forEach |
| [`syncVisibility`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5141) | – | String |
| [`rebuildHeatingRodUIStable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5161) | reason | String, buildHeatingRodUI, requestAnimationFrame |
| [`buildHeatingRodUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5200) | – | Array.from, _ensureHeatingRodCfg, _getFlowConsumerTypeForSlot, _heatingRodAutoModeLabel, _mkCfgDetailsGroup, _mkCfgField, _mkCfgGroup, _mkCfgInput, _mkCfgSelect, _mkCfgToggle, _mkHeatingRodNumberInput, document.createElement, els.heatingRodDevices.appendChild, grpAuto.body.appendChild (weitere in der Quelle) |
| [`mkStageDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5324) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, wrap.appendChild |
| [`_ensureBhkwCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5596) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, mkDefault, normalized.push, normalized.sort, used.add, used.has |
| [`mkDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5617) | idx | – |
| [`buildBhkwUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5728) | – | _ensureBhkwCfg, _mkDpWrap, actions.appendChild, adv.appendChild, advBtn.addEventListener, body.appendChild, card.appendChild, document.createElement, els.bhkwDevices.appendChild, header.appendChild, headerTop.appendChild, mkCheckbox, mkFieldRow, mkNumInput (weitere in der Quelle) |
| [`mkFieldRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5744) | labelTxt, controlEl, hintTxt | ctrl.appendChild, document.createElement, row.appendChild |
| [`mkTextInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5783) | value, onChange, placeholder | String, document.createElement, i.addEventListener |
| [`mkNumInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5806) | value, onChange | String, document.createElement, i.addEventListener |
| [`mkCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5834) | checked, text, onChange | cb.addEventListener, document.createElement, label.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L5865) | value, opts, onChange | String, document.createElement, s.addEventListener, s.appendChild |
| [`_ensureGeneratorCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6004) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, mkDefault, normalized.push, normalized.sort, used.add, used.has |
| [`mkDefault`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6025) | idx | – |
| [`buildGeneratorUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6127) | – | _ensureGeneratorCfg, _mkDpWrap, actions.appendChild, adv.appendChild, advBtn.addEventListener, body.appendChild, card.appendChild, document.createElement, els.generatorDevices.appendChild, header.appendChild, headerTop.appendChild, mkCheckbox, mkFieldRow, mkNumInput (weitere in der Quelle) |
| [`mkFieldRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6144) | labelTxt, controlEl, hintTxt | ctrl.appendChild, document.createElement, row.appendChild |
| [`mkTextInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6183) | value, onChange, placeholder | String, document.createElement, i.addEventListener |
| [`mkNumInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6206) | value, onChange | String, document.createElement, i.addEventListener |
| [`mkCheckbox`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6232) | checked, text, onChange | cb.addEventListener, document.createElement, label.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6265) | value, opts, onChange | String, document.createElement, s.addEventListener, s.appendChild |
| [`_ensureThresholdCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6401) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, normCompare, normOutType, out.push, out.sort, used.add, used.has |
| [`normOutType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6422) | v | String |
| [`normCompare`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6432) | v | String |
| [`_nextFreeThresholdIdx`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6492) | – | _ensureThresholdCfg, used.has |
| [`buildThresholdUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6506) | – | Number, String, _ensureThresholdCfg, del.addEventListener, document.createElement, document.createTextNode, els.thresholdRules.appendChild, en.addEventListener, enWrap.appendChild, grid.appendChild, head.appendChild, item.appendChild, left.appendChild, listWrap.appendChild (weitere in der Quelle) |
| [`mkHdr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6537) | title, subtitle | document.createElement, wrap.appendChild |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6571) | text | document.createElement |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6592) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6645) | labelText, inputId, value, onChange, placeholder, unit | String, document.createElement, input.addEventListener, mkLabel, row.appendChild, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6691) | labelText, inputId, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6721) | labelText, inputId, value, options, onChange | String, document.createElement, mkLabel, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkBoolSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6755) | labelText, inputId, value, onChange | mkSelectField |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6774) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkLabel, wrap.appendChild |
| [`updateRule`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6811) | idx, patch | Object.assign, String, _ensureThresholdCfg, t2.rules.find |
| [`_ensureRelayCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L6987) | – | Array.isArray, Math.max, Math.min, Math.round, Number, String, normType, numOrNull, out.push, out.sort, used.add, used.has |
| [`normType`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7008) | v | String |
| [`numOrNull`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7018) | v | Number, Number.isFinite |
| [`_nextFreeRelayIdx`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7059) | – | _ensureRelayCfg, used.has |
| [`buildRelayUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7073) | – | Number, String, _ensureRelayCfg, del.addEventListener, document.createElement, document.createTextNode, els.relayControls.appendChild, en.addEventListener, enWrap.appendChild, grid.appendChild, head.appendChild, item.appendChild, left.appendChild, listWrap.appendChild (weitere in der Quelle) |
| [`mkHdr`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7104) | title, subtitle | document.createElement, wrap.appendChild |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7138) | text | document.createElement |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7159) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7212) | labelText, inputId, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkLabel, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7242) | labelText, inputId, value, onChange, unit | String, document.createElement, input.addEventListener, mkLabel, row.appendChild, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7287) | labelText, inputId, value, options, onChange | String, document.createElement, mkLabel, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7321) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkLabel, wrap.appendChild |
| [`updateRelay`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7358) | idx, patch | Object.assign, String, _ensureRelayCfg, r2.relays.find |
| [`_normalizeGridExportControlCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7504) | gc | Math.max, Math.min, Math.round, Number, Number.isFinite, String, probe.trim, value.trim |
| [`_ensureGridConstraintsCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7544) | – | Array.isArray, Math.round, Number, Number.isFinite, Object.prototype.hasOwnProperty.call, _normalizeGridExportControlCfg |
| [`normInv`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7630) | it | Number, Number.isFinite, String |
| [`buildGridConstraintsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7655) | – | Math.max, Math.round, Number, String, _ensureGridConstraintsCfg, advanced.appendChild, advancedFields.appendChild, basic.appendChild, clearAll, commands.appendChild, document.createElement, evuEl.appendChild, field.querySelector, fixedReserveW.toLocaleString (weitere in der Quelle) |
| [`mkMsg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7682) | text | document.createElement |
| [`clearAll`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7701) | – | – |
| [`mkLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7737) | text | document.createElement |
| [`mkFieldWrap`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7758) | labelText | document.createElement, mkLabel, wrap.appendChild |
| [`mkChk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7777) | labelText, inputId, checked, onChange | cb.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkFieldWrap, wrap.appendChild |
| [`mkNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7812) | labelText, inputId, value, onChange, unit, placeholder | String, document.createElement, input.addEventListener, mkFieldWrap, row.appendChild, wrap.appendChild |
| [`mkSelect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7856) | labelText, inputId, value, options, onChange | String, document.createElement, mkFieldWrap, sel.addEventListener, sel.appendChild, wrap.appendChild |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7888) | labelText, inputId, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkFieldWrap, wrap.appendChild |
| [`mkHint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7938) | text | document.createElement |
| [`renderExportGuardRuntimeDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7954) | target | Date.now, document.createElement, fetchJson, target.appendChild |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7962) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`readVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7968) | data, key | Object.prototype.hasOwnProperty.call |
| [`parseJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L7972) | raw | JSON.parse |
| [`renderGridImportRuntimeDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8181) | target | Date.now, document.createElement, fetchJson, target.appendChild |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8189) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`readVal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8196) | data, key | Object.prototype.hasOwnProperty.call |
| [`stageLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8200) | stage | String |
| [`mkZeroSection`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8315) | parent, titleText, id, collapsed | document.createElement, parent.appendChild, section.appendChild |
| [`mkZeroFields`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8328) | parent | document.createElement, parent.appendChild |
| [`mkTitle`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8438) | text | document.createElement |
| [`mkBadge`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8457) | label, ok | document.createElement |
| [`mkInvItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8476) | list, idx, groupPrefix, groupLabel | Number.isFinite, String, advGrid.appendChild, advanced.appendChild, chips.appendChild, delBtn.addEventListener, document.createElement, editBtn.addEventListener, editBtn.setAttribute, kwpInput.addEventListener, kwpInput.setAttribute, meta.appendChild, mkBadge, mkDpField (weitere in der Quelle) |
| [`mkInvGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8625) | target, titleText, list, groupPrefix, groupLabel, inactiveHint | add.addEventListener, document.createElement, listWrap.appendChild, mkHint, mkInvItem, mkTitle, target.appendChild |
| [`_ensurePara14aCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8729) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, PARA14A_TYPES.some, String, ic.para14aActiveId.trim, ic.para14aEmsSetpointWId.trim, out.push |
| [`_mkDpWrap`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8791) | id, value, placeholder, onChange | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener |
| [`rebuildPara14aConsumersUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L8830) | – | Array.isArray, _ensurePara14aCfg, document.createElement, els.para14aConsumers.appendChild, visibleRows.forEach |
| [`buildPara14aUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9021) | – | Math.round, Number, Number.isFinite, String, _ensurePara14aCfg, document.createElement, els.para14aConsumers.appendChild, lock, rebuildPara14aConsumersUI |
| [`lock`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9045) | el | – |
| [`getStorageMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9083) | – | String |
| [`getStorageCoupling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9095) | – | String |
| [`normalizeStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9106) | v | String |
| [`normalizeFeneconControlMode`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9115) | v | String |
| [`isFeneconGridTargetId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9122) | value | String |
| [`isFeneconDirectEssSetpointId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9130) | value | String |
| [`isFeneconGridMeasurementId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9138) | value | String, isFeneconGridTargetId |
| [`isFeneconHybridUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9146) | profile, coupling | String, normalizeStorageVendorProfile |
| [`getStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9156) | – | String, normalizeStorageVendorProfile |
| [`updateStorageCouplingUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9167) | – | getStorageCoupling |
| [`updateStorageVendorProfileUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9178) | – | String, getStorageCoupling, getStorageVendorProfile, isFeneconHybridUi |
| [`rebuildStorageTable`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9214) | – | STORAGE_DP_FIELDS.filter, buildDpTable, getStorageCoupling, getStorageMode, getStorageVendorProfile, updateStorageCouplingUi, updateStorageVendorProfileUi |
| [`_ensureStorageFarmCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9256) | – | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, String.fromCharCode, _clampInt, _normalizeRecoveredStorageFarmRow, grpOut.push, storOut.push |
| [`buildStorageFarmUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9319) | – | Math.max, Math.min, Math.round, Number, Number.isFinite, String, _ensureStorageFarmCfg, _licenseEdition, _maxStorageCount, btn.addEventListener, card.appendChild, detail.appendChild, document.createElement, document.getElementById (weitere in der Quelle) |
| [`mkField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9422) | labelText | document.createElement, wrap.appendChild |
| [`mkDpField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9446) | labelText, id, value, onChange, placeholder | String, b.setAttribute, document.createElement, dpWrap.appendChild, input.addEventListener, mkField, wrap.appendChild |
| [`mkTextField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9492) | labelText, id, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkField, wrap.appendChild |
| [`mkNumField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9518) | labelText, id, value, onChange, placeholder | String, document.createElement, input.addEventListener, mkField, wrap.appendChild |
| [`mkSelectField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9547) | labelText, id, value, options, onChange | String, document.createElement, mkField, sel.addEventListener, wrap.appendChild |
| [`mkCheckField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9577) | labelText, id, checked, onChange | box.addEventListener, document.createElement, document.createTextNode, lbl.appendChild, mkField, wrap.appendChild |
| [`mkGridDivider`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9610) | text | document.createElement |
| [`mkGridHelp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9637) | text | document.createElement |
| [`_ensureStorageMultiUseCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L9987) | – | _clampInt |
| [`_renderStorageMultiUseSummary`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10047) | mu | _clampInt, document.createElement, els.muStorageSummary.appendChild |
| [`buildStorageMultiUseUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10088) | – | _ensureStorageMultiUseCfg, document.createElement, els.muStorageSummary.appendChild, setDisabled, syncFromCfgToUi |
| [`setDisabled`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10108) | d | – |
| [`syncFromCfgToUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10135) | – | _ensureStorageMultiUseCfg, _renderStorageMultiUseSummary, numOrEmpty |
| [`syncFromUiToCfg`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10166) | – | Math.max, _clampInt, _ensureStorageMultiUseCfg, _renderStorageMultiUseSummary, numOrEmpty, scheduleValidation |
| [`_clampInt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10245) | v, min, max, def | Math.max, Math.min, Math.round, Number, Number.isFinite |
| [`_ensureSettingsConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10257) | – | – |
| [`_ensureChargingManagementConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10268) | – | – |
| [`_ensureEvcsList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10279) | count | Array.isArray, _clampInt, _ensureSettingsConfig, _maxEvcsCount, list.push |
| [`_updateEvcsField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10294) | idx, field, value | _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount |
| [`_buildEvcsBoostLimitInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10310) | row, onChange | Math.max, Number, Number.isFinite, String, document.createElement, input.addEventListener, raw.trim |
| [`buildEvcsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10329) | – | Array.isArray, Number, Number.isFinite, String, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, actions.appendChild, body.appendChild, btnAddPort.addEventListener, btnSD.addEventListener, btnSU.addEventListener, card.appendChild (weitere in der Quelle) |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10376) | label, controlEl | controlEl.classList.add, controlEl.matches, ctl.appendChild, ctl.classList.add, document.createElement, row.appendChild |
| [`mkIo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10408) | id, value, onChange | btn.addEventListener, document.createElement, input.addEventListener, valueOrEmpty, wrap.appendChild |
| [`normKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10449) | k | String |
| [`ensureGroupForKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10493) | stationKey | groupIndexByKey.get, groupIndexByKey.has, groupIndexByKey.set, normKey, sc.stationGroups.push |
| [`moveStationGroup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10515) | stationKey, dir | arr.forEach, buildEvcsUI, buildStationGroupsUI, groupIndexByKey.clear, groupIndexByKey.get, normKey |
| [`renameStationKey`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10547) | oldKey, newKey | buildEvcsUI, buildStationGroupsUI, groupIndexByKey.get, normKey |
| [`addPortToStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10586) | stationKey | Math.min, Object.assign, String, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, buildEvcsUI, normKey |
| [`movePortWithinStation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10615) | portIdx, stationKey, dir | buildEvcsUI, normKey |
| [`createPortCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10654) | i, stationKey | Math.round, Number, Number.isFinite, String, _buildEvcsBoostLimitInput, _clampInt, actions.appendChild, adv.appendChild, allowBoostInp.addEventListener, body.addEventListener, body.appendChild, boostTInput.addEventListener, btnDown.addEventListener, btnUp.addEventListener (weitere in der Quelle) |
| [`mkSemanticInput`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10867) | field, placeholder | document.createElement, input.addEventListener, valueOrEmpty |
| [`mkSmallText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10983) | field, placeholder | String, document.createElement, input.addEventListener |
| [`mkNumPhase`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L10995) | field, placeholder, min, step, fallback | Number, Number.isFinite, String, document.createElement, input.addEventListener |
| [`refreshElectricalHint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11143) | – | _ensureSettingsConfig, check.errors.join, window.NexoWattEvcsElectricalLimits.validateEvcsElectricalConfig |
| [`buildStationGroupsUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11328) | – | Array.isArray, _ensureSettingsConfig, arr.forEach, document.createElement, els.stationGroups.appendChild |
| [`collectSettingsConfigFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11430) | – | Array.isArray, Number, Number.isFinite, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _maxEvcsCount, deepMerge, out.evcsList.filter |
| [`applyConfigToUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11456) | cfg | Math.max, Math.round, Number, Number.isFinite, String, _isAppLicensed, _licenseEdition, applyEnergyFlowTsModeToUi, applyTariffProviderUI, buildAiAdvisorUI, buildAppsUI, buildBhkwUI, buildDpTable, buildEvcsUI (weitere in der Quelle) |
| [`afterRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11534) | field, _row, container | buildFlowPvNameRow, container.appendChild |
| [`fetchOcppDiscovery`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11802) | – | Array.isArray, fetchJson |
| [`_ocppStationIdentityFromDp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11813) | id | String, value.match |
| [`_ocppStationIdentityFromRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11824) | row | String, _ocppStationIdentityFromDp |
| [`_ocppStationIdentityFromConnector`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11842) | connector | _ocppStationIdentityFromDp |
| [`_isEmptyEvcsMappingRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11857) | row | – |
| [`_isKnownLegacyNexoWattOcppMapping`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11866) | field, currentId, replacementId | String, _ocppStationIdentityFromDp, current.toLowerCase, lower.endsWith, lower.startsWith, replacement.toLowerCase, replacementLower.startsWith |
| [`_applyOcppConnectorToRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11902) | row, c, opts | Math.max, Math.round, Number, Number.isFinite, Object.assign, String, setField |
| [`setField`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11922) | k, v | String, _isKnownLegacyNexoWattOcppMapping, cur.trim |
| [`ocppAutoDetect`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L11990) | – | Array.isArray, Math.max, Math.min, String, _applyOcppConnectorToRow, _ensureSettingsConfig, buildEvcsUI, buildStationGroupsUI, existingList.some, fetchOcppDiscovery, scheduleValidation, setStatus, window.confirm |
| [`ocppMapExisting`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12043) | – | JSON.stringify, Math.min, String, _applyOcppConnectorToRow, _clampInt, _ensureEvcsList, _ensureSettingsConfig, _ocppStationIdentityFromConnector, buildEvcsUI, buildStationGroupsUI, fetchOcppDiscovery, list.findIndex, list.push, list.slice (weitere in der Quelle) |
| [`_nwNormCat`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12126) | v | String |
| [`_nwDeviceClass`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12135) | dev | String |
| [`_isNwEvcsCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12138) | cat | _nwNormCat |
| [`_isNwEvcsDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12142) | dev | _isNwEvcsCategory, _nwDeviceClass |
| [`_isNwPvDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12146) | dev | _isNwPvInverterCategory, _nwDeviceClass |
| [`_isNwHeatDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12150) | dev | _isNwHeatCategory, _nwDeviceClass |
| [`_isNwStorageDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12154) | dev | _nwDeviceClass |
| [`_isNwMeterDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12158) | dev | _isNwMeterCategory, _nwDeviceClass |
| [`_isNwPvInverterCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12168) | cat | _nwNormCat |
| [`_isNwHeatCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12177) | cat | _nwNormCat |
| [`_nwGetAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12186) | dev, key | String |
| [`_nwGetWritableAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12195) | dev, key | String, _nwGetAlias |
| [`_nwGetAliasUnit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12200) | dev, key | String |
| [`_nwGetDpFallback`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12210) | dev, suffix | String |
| [`_applyNwDeviceToEvcsRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12221) | row, dev, opts | String, _nwGetAlias, _nwGetAliasUnit, _nwGetWritableAlias, _nwNormCat, currentChargeDemandId.startsWith, currentStatusId.startsWith, setIf |
| [`setIf`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12237) | k, v | String |
| [`_classifyHeatDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12343) | dev | String |
| [`_findFreeConsumerSlot`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12362) | range | String |
| [`_isNwMeterCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12378) | cat | _nwNormCat |
| [`_isNwStorageCategory`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12388) | cat | _nwNormCat |
| [`_nwDevHaystack`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12398) | dev | String |
| [`_nwHasAlias`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12413) | dev, key | String, _nwGetAlias |
| [`_nwScoreGridMeter`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12422) | dev | _isNwMeterDevice, _isNwPvDevice, _isNwStorageDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwScorePvSource`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12442) | dev | _isNwMeterDevice, _isNwPvDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwScoreStorage`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12459) | dev | _isNwStorageDevice, _nwDevHaystack, _nwHasAlias, _nwNormCat |
| [`_nwPickBestDevice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12478) | devices, scorer, opts | Array.isArray, Number, Number.isFinite |
| [`_nwApplyFlowDpIfEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12498) | key, value, opts | String, _setFlowPowerDpIsW, document.getElementById, inp.dispatchEvent |
| [`_nwApplyGeneralDpIfEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12528) | key, value | String, els.gridPointConnectedId.dispatchEvent, els.gridPointWatchdogId.dispatchEvent |
| [`_nwAutoMapEnergyFlowFromDevices`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12570) | devices | Array.isArray, String, _ensureFlowSlots, _nwApplyFlowDpIfEmpty, _nwApplyGeneralDpIfEmpty, _nwGetAlias, _nwPickBestDevice, document.getElementById, list.filter, list.some, out.notes.push |
| [`_nwAutoMapStorageAppFromDevices`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12677) | devices | Array.isArray, String, _nwGetAlias, _nwGetWritableAlias, isFeneconDirectEssSetpointId, isFeneconGridMeasurementId, isFeneconGridTargetId, normalizeFeneconControlMode, normalizeStorageVendorProfile, result.notes.push, result.notes.unshift, setEmpty |
| [`setEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12689) | key, value | String |
| [`nwDevicesQuickSetup`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12811) | – | Array.isArray, JSON.stringify, Math.max, Math.round, Number, Number.isFinite, String, _applyNwDeviceToEvcsRow, _clampInt, _classifyHeatDevice, _countHeatingRodWiredStages, _ensureEvcsList, _ensureFlowSlots, _ensureGridConstraintsCfg (weitere in der Quelle) |
| [`addOrUpdate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12897) | dev | JSON.stringify, String, _nwGetAlias, _nwGetWritableAlias, list.find, list.push |
| [`findPara14aMatch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L12973) | dev, setId, enableId | String |
| [`loadConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13138) | – | Date.now, _inferLicenseFromSuccessfulInstallerGate, _licenseIsUsable, applyConfigToUI, clearDirty, fetchJson, fetchLicenseInfoFallback, fetchLicenseInfoFromStateFallback, hydrateStorageFarmConfigFromRuntimeState, normalizeLicenseInfo, scheduleValidation, setStatus |
| [`applyReleaseSafetyGateToPatch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13183) | patch | Array.isArray, restoreArrayIfDangerouslyEmpty, srcRows.slice |
| [`restoreArrayIfDangerouslyEmpty`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13185) | section, key, markerName | Array.isArray, console.warn, currentRows.slice |
| [`collectPatchFromUI`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13229) | – | Array.from, Array.isArray, JSON.parse, Math.max, Math.min, Math.round, Number, Number.isFinite, Object.assign, String, _clampInt, _coupleTariffProviderDatapointsSync, _ensureFlowSlots, _ensurePara14aCfg (weitere in der Quelle) |
| [`readNlP1`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13278) | name | String, document.querySelector |
| [`readNlP1Dp`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13282) | name | String, document.querySelector |
| [`nlp1Number`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13286) | name, fallback, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite, readNlP1 |
| [`readMesh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13382) | row, field | String, row.querySelector |
| [`safeMeshId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13386) | value, fallback | String |
| [`readMeshPowerLimit`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13432) | row, field | Math.round, Number, Number.isFinite, readMesh |
| [`splitLpList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13470) | raw | String |
| [`readCk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13474) | row, field | String, row.querySelector |
| [`readCkPrice`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13478) | row, field | Math.max, Math.min, Math.round, Number, Number.isFinite, readCk |
| [`readCkInt`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13483) | row, field, fallback, min, max | Math.max, Math.min, Math.round, Number, Number.isFinite, readCk |
| [`_storageFarmStorageCount`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13799) | cfg | Array.isArray, sf.storages.filter |
| [`applyAppCenterRegressionSafetyGate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13811) | patch | Date.now, _storageFarmStorageCount, deepMerge, guarded.push |
| [`_sgArray`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13857) | v | Array.isArray |
| [`_sgObject`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13858) | v | – |
| [`_sgNonEmptyString`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13859) | v | String |
| [`_sgCountStorages`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13860) | cfg | _sgArray, _sgObject |
| [`_sgCountGroups`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13861) | cfg | _sgArray, _sgObject |
| [`_sgCountEvcs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13862) | cfg | Math.max, Number, _sgArray, _sgObject |
| [`_sgCountChargeKiosk`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13866) | cfg | _sgArray, _sgObject |
| [`_sgCountMeshNodes`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13867) | cfg | _sgArray, _sgObject |
| [`_sgCountMeshPeers`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13868) | cfg | Math.max, _sgArray, _sgObject |
| [`_sgCountNlP1Mappings`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13874) | cfg | Object.keys, _sgObject |
| [`_sgRestore`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13878) | report, path, reason | report.restored.push |
| [`applyReleaseRegressionSafetyGate`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13882) | patch | _sgArray, _sgCountChargeKiosk, _sgCountEvcs, _sgCountGroups, _sgCountMeshNodes, _sgCountMeshPeers, _sgCountNlP1Mappings, _sgCountStorages, _sgObject, _sgRestore, deepMerge, report.warnings.push |
| [`validateFeneconStorageConfiguration`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13957) | patch | Array.isArray, Math.max, Object.prototype.hasOwnProperty.call, String, _normalizeRecoveredStorageFarmRow, isDirectEssSetpoint, isGridMeasurement, isGridTarget, normalizeFeneconControlMode, rows.filter, sf.storages.filter, validateOne |
| [`normalizeId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13959) | value | String |
| [`sameId`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13960) | a, b | normalizeId |
| [`isPowerBalance`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13965) | value | normalizeId |
| [`isDirectEssSetpoint`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13973) | value | isFeneconDirectEssSetpointId |
| [`isGridTarget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13974) | value | isFeneconGridTargetId |
| [`isGridMeasurement`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13975) | value | isFeneconGridMeasurementId |
| [`validateOne`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L13976) | { name = 'Speicher', vendorProfile, coupling, mode, nativeTarget, essActual, directTargets = [], otherWritableStorageCount = 0 } | String, directIds.push, directIds.some, directTargets.map, isDirectEssSetpoint, isGridMeasurement, isGridTarget, isPowerBalance, normalizeStorageVendorProfile, sameId |
| [`flushDpInputsToConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14105) | – | Array.from, document.querySelectorAll, input.dispatchEvent |
| [`saveConfig`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14118) | – | Array.isArray, JSON.stringify, _maxStorageCount, _storageFarmStorageCount, applyAppCenterRegressionSafetyGate, applyConfigToUI, applyReleaseRegressionSafetyGate, check.errors.join, clearDirty, collectPatchFromUI, fetchJson, flushDpInputsToConfig, setStatus, validateFeneconStorageConfiguration (weitere in der Quelle) |
| [`_showTab`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14154) | tabId | Array.from, btns.forEach, document.querySelectorAll, els.tabs.querySelectorAll, panels.forEach, refreshChargingDiag, refreshEmsStatus |
| [`initTabs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14180) | – | Array.from, _showTab, btns.forEach, els.tabs.querySelectorAll |
| [`initFlowSubtabs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14200) | – | Array.from, btns.forEach, document.getElementById, document.querySelectorAll, show, wrap.querySelectorAll |
| [`show`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14219) | id | String, btns.forEach, panels.forEach |
| [`_fmtTs`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14245) | ts | Number.isFinite, d.getTime, d.toLocaleString |
| [`renderEmsStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14258) | payload | Array.isArray, Number.isFinite, String, _fmtTs, els.emsStatus.appendChild, mkItem |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14267) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_asBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14332) | v | v.trim |
| [`_asNum`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14344) | v, fallback | Number, Number.isFinite |
| [`renderChargingDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14354) | payload | Array.isArray, Math.round, Number.isFinite, String, _asBool, _asNum, els.chargingDiag.appendChild, flags.join, flags.push, mkItem, targetA.toFixed |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14363) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14454) | v | Math.abs, Math.round, Number, Number.isFinite |
| [`_fmtKwh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14466) | v | Number, Number.isFinite, n.toFixed |
| [`_fmtEurKwh`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14477) | v | Number, Number.isFinite, n.toFixed |
| [`_fmtIsoShort`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14488) | v | Number.isFinite, String, d.getTime, d.toLocaleString |
| [`_fmtPct`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14501) | v | Math.round, Number, Number.isFinite |
| [`renderStationsDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14512) | payload | Array.isArray, Math.round, Number, Number.isFinite, String, _fmtW, els.stationsDiag.appendChild, mkItem |
| [`mkItem`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14521) | titleText, subtitleText, rightHtml, statusKind | document.createElement, left.appendChild, row.appendChild |
| [`_fmtBool`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14588) | v, tTrue, tFalse | – |
| [`_parseShadowJson`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14606) | raw, fallback | JSON.parse, String, text.slice |
| [`_shadowDiffList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14632) | shadow | Object.keys, String, add, readList |
| [`add`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14635) | label, jsVal, tsVal, diff | String, out.push |
| [`readList`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14638) | arr, prefix | Array.isArray, arr.forEach |
| [`_shadowKind`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14673) | shadow | _shadowDiffList |
| [`_shadowStatusLabel`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14691) | kind, shadow | – |
| [`_shadowHumanExplanation`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14712) | title, shadow, diffs | Array.isArray, String |
| [`_formatShadowJsonForDisplay`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14734) | value | JSON.stringify |
| [`_shadowDecodeDisplayText`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14750) | value | String, decodeURIComponent |
| [`_shadowEscape`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14768) | value | _shadowDecodeDisplayText |
| [`_openShadowJsonDialog`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14789) | title, payload | _formatShadowJsonForDisplay, _shadowEscape, backdrop.addEventListener, backdrop.querySelector, document.body.appendChild, document.createElement, document.getElementById, existing.remove, text.focus, text.setSelectionRange |
| [`close`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14811) | – | backdrop.remove |
| [`_normalizeEnergyFlowTsModeUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14842) | value | String |
| [`applyEnergyFlowTsModeToUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14858) | cfg | Math.max, Math.min, Math.round, Number, String, _normalizeEnergyFlowTsModeUi, renderEnergyFlowTsModeStatus |
| [`collectEnergyFlowTsMigrationFromUi`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14881) | base | Math.max, Math.min, Math.round, Number, Number.isFinite, _normalizeEnergyFlowTsModeUi, deepMerge |
| [`renderEnergyFlowTsModeStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14908) | readiness | Array.isArray, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _decodeShadowDisplayText, _normalizeEnergyFlowTsModeUi, _shadowEscape, escape, plan.blockedReasons.map, safety.warnings.join |
| [`_renderShadowPlantEvaluationCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L14957) | evaluation | Array.isArray, Number, String, btn.addEventListener, card.querySelector, document.createElement, escape, evaluation.recentSamples.slice, lines.map, recent.map |
| [`_renderHeatingRodTsRuntimeEvaluationCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15012) | evaluation | Array.isArray, Number, String, btn.addEventListener, card.querySelector, document.createElement, escape, evaluation.fallbackReasons.filter, rows.map |
| [`_renderEnergyFlowTsActiveTestCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15111) | activeTest, fixedSource | Array.isArray, Number, String, _decodeShadowDisplayText, activeTest.recentSamples.slice, blockers.join, btn.addEventListener, card.querySelector, document.createElement, escape, latest.blockers.map, lines.map, recent.map |
| [`_renderShadowReadinessCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15165) | readiness | Array.isArray, candidateSafety.blockers.map, candidateSafety.warnings.map, document.createElement, escape, items.map, readiness.blockers.map, readiness.warnings.map |
| [`renderShadowDiagnostics`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15238) | payload | Object.assign, _parseShadowJson, _rememberOpenShadowDetails, _renderEnergyFlowTsActiveTestCard, _renderHeatingRodTsRuntimeEvaluationCard, _renderShadowPlantEvaluationCard, _renderShadowReadinessCard, cards.forEach, document.createElement, els.shadowDiagnostics.appendChild, renderEnergyFlowTsModeStatus |
| [`renderChargingBudget`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15367) | payload | Array.isArray, JSON.parse, Math.max, Math.min, Math.round, Number, Number.isFinite, String, _fmtAge, _fmtBool, _fmtEurKwh, _fmtIsoShort, _fmtKwh, _fmtPct (weitere in der Quelle) |
| [`mkCard`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15396) | titleText, lines, statusKind | b.appendChild, card.appendChild, document.createElement, h.appendChild, statusKind.toUpperCase, top.appendChild |
| [`n`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15461) | x | Number |
| [`b`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15468) | x | – |
| [`refreshChargingDiag`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15746) | – | fetchJson, renderChargingBudget, renderChargingDiag, renderStationsDiag |
| [`refreshEmsStatus`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15760) | – | fetchJson, renderEmsStatus, window.NexoWattNvpDiagnostics?.render |
| [`startStatusPolling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15772) | – | clearInterval, setInterval |
| [`openDpModal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15791) | targetInputId | currentId.split, currentInput.value.trim, currentParts.slice, document.getElementById, els.dpModal.classList.remove, els.dpModal.setAttribute, refreshTree |
| [`closeDpModal`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15820) | – | els.dpModal.classList.add, els.dpModal.setAttribute |
| [`setDpTargetValue`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15833) | id | closeDpModal, document.getElementById, inp.dispatchEvent |
| [`renderBreadcrumb`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15847) | – | els.dpBreadcrumb.appendChild, mkCrumb, sep |
| [`mkCrumb`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15858) | label, prefix, clickable | b.addEventListener, document.createElement |
| [`sep`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15880) | – | document.createElement |
| [`mkDpResultRow`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15905) | primary, meta, onClick | document.createElement, row.addEventListener, row.appendChild |
| [`refreshTree`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15932) | – | Array.isArray, String, document.createElement, els.dpTree.appendChild, encodeURIComponent, fetchJson, metaBits.join, metaBits.push, mkDpResultRow, renderBreadcrumb |
| [`doSearch`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L15997) | – | Array.isArray, String, document.createElement, els.dpResults.appendChild, encodeURIComponent, fetchJson, metaBits.join, metaBits.push, mkDpResultRow |
| [`upOne`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16031) | – | parts.join, parts.pop, treePrefix.split |
| [`getInstallerAdminUrl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16059) | – | String, params.get, ref.hash.indexOf, ref.pathname.includes |
| [`initInstallerBackLink`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16118) | – | getInstallerAdminUrl, link.addEventListener, link.setAttribute |
| [`_updateStorageCoupling`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16175) | – | getStorageCoupling, rebuildStorageTable, scheduleValidation, updateStorageCouplingUi |
| [`_update`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16194) | – | Number, Number.isFinite |
| [`_updateStorageRatedPower`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16217) | – | Math.abs, Math.min, Math.round, Number, Number.isFinite, String, _storagePowerProfileInfo, scheduleValidation, updateStorageLicensePowerUi |
| [`_updateStorageSelfNvpControl`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16246) | – | _clampInt, scheduleValidation |
| [`_updateStorageVendorProfile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16295) | – | String, _clampInt, getStorageCoupling, getStorageVendorProfile, rebuildStorageTable, scheduleValidation, updateStorageVendorProfileUi |
| [`backupRefreshInfo`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16742) | – | String, fetchJson |
| [`backupExport`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16774) | – | backupRefreshInfo, downloadJsonFile, fetchJson, setBackupStatus, ts.toISOString |
| [`backupDoImportFromObj`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16798) | obj | JSON.stringify, backupRefreshInfo, fetchJson, loadConfig, setBackupStatus |
| [`backupImportFromFile`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16811) | file | JSON.parse, backupDoImportFromObj, readFileAsText, setBackupStatus |
| [`backupRestoreFromUserdata`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L16830) | – | backupDoImportFromObj, fetchJson, setBackupStatus, window.confirm |
| [`requireAppCenterAccessBeforeLoad`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L17004) | – | Array.isArray, Date.now, caps.includes, fetch, r.json, window.NW_AUTH.requireCapability |
| [`updateAdminOnlyActions`](../../../../../src-ts/runtime-executables/www/ems-apps.ts#L17021) | – | document.getElementById, window.NW_AUTH.getState |
