# src-ts/runtime-executables/www/app.ts

Verbindet das Kunden-Dashboard mit Livewerten, Energieflussanzeige, Bedienaktionen und Kundeneinstellungen.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/app.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./static/ts-mirrors/frontend/live-dashboard-format.mjs` | [src-ts/frontend/live-dashboard-format.ts](../../../../../src-ts/frontend/live-dashboard-format.ts) |
| `/static/ts-mirrors/frontend/customer-feature-visibility.mjs` | Node-Bordmittel oder externe Paketabhängigkeit. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`nwUiLocaleTag`](../../../../../src-ts/runtime-executables/www/app.ts#L93) | – | String, lang.startsWith, window.NexoWattI18n.localeTag |
| [`loadLiveDashboardTsFormat`](../../../../../src-ts/runtime-executables/www/app.ts#L95) | – | import |
| [`nxTryTsDashboardFormat`](../../../../../src-ts/runtime-executables/www/app.ts#L114) | name, args | fn |
| [`nwNormalizeBrandHeader`](../../../../../src-ts/runtime-executables/www/app.ts#L131) | – | Array.prototype.slice.call, document.querySelectorAll, document.title.replace, pwaTitles.forEach, topbarTitles.forEach |
| [`arcLenFromDeg`](../../../../../src-ts/runtime-executables/www/app.ts#L156) | r, deg | – |
| [`setArcAtAngle`](../../../../../src-ts/runtime-executables/www/app.ts#L163) | selector, r, angleDeg, arcDeg | Math.max, Math.min, arcLenFromDeg, dash.toFixed, document.querySelector, el.setAttribute, offset.toFixed |
| [`placeIconAtAngle`](../../../../../src-ts/runtime-executables/www/app.ts#L179) | sel, angleDeg | Math.cos, Math.max, Math.sin, document.querySelector, wrap.getBoundingClientRect |
| [`setArcInSlot`](../../../../../src-ts/runtime-executables/www/app.ts#L203) | selector, r, slotIndex, slotFillPct | L.toFixed, Math.max, Math.min, document.querySelector, el.setAttribute, start.toFixed |
| [`setArc`](../../../../../src-ts/runtime-executables/www/app.ts#L222) | selector, r, valuePct | Math.max, Math.min, dash.toFixed, document.querySelector, el.setAttribute, rest.toFixed |
| [`setDonut`](../../../../../src-ts/runtime-executables/www/app.ts#L236) | cls, pct, inner | Math.max, Math.min, dash.toFixed, document.querySelector, el.setAttribute, rest.toFixed |
| [`formatHours`](../../../../../src-ts/runtime-executables/www/app.ts#L255) | h | Math.floor, Math.round, isFinite |
| [`applyEnergyWebResponsiveLayout`](../../../../../src-ts/runtime-executables/www/app.ts#L277) | nextCfg | Math.floor, Math.max, Math.min, Math.round, Object.assign, _flowUiNum, document.querySelector, wrap.style.removeProperty, wrap.style.setProperty |
| [`scheduleEnergyWebResponsiveLayout`](../../../../../src-ts/runtime-executables/www/app.ts#L330) | nextCfg | Object.assign, cancelAnimationFrame, requestAnimationFrame |
| [`_flowUiNum`](../../../../../src-ts/runtime-executables/www/app.ts#L362) | v, fallback | Number, Number.isFinite |
| [`stabilizeFlowSigned`](../../../../../src-ts/runtime-executables/www/app.ts#L372) | key, rawW, opts | Date.now, Math.abs, Math.sign, _flowUiNum |
| [`stabilizeFlowAbs`](../../../../../src-ts/runtime-executables/www/app.ts#L418) | key, rawW, opts | Math.abs, Math.max, Object.assign, _flowUiNum, stabilizeFlowSigned |
| [`applyFlowCoreLabels`](../../../../../src-ts/runtime-executables/www/app.ts#L429) | – | document.getElementById |
| [`scheduleRender`](../../../../../src-ts/runtime-executables/www/app.ts#L452) | force | Date.now, Math.max, clearTimeout, setTimeout |
| [`scheduleLiveTelemetryRender`](../../../../../src-ts/runtime-executables/www/app.ts#L486) | force | Date.now, Math.max, clearTimeout, scheduleRender, setTimeout |
| [`formatPower`](../../../../../src-ts/runtime-executables/www/app.ts#L519) | v | Number, isNaN, n.toFixed, nxTryTsDashboardFormat |
| [`formatEnergyKwh`](../../../../../src-ts/runtime-executables/www/app.ts#L538) | v | Math.abs, Number, isFinite, isNaN, n.toFixed, nxTryTsDashboardFormat |
| [`formatCurrencyEur`](../../../../../src-ts/runtime-executables/www/app.ts#L550) | v | Number, isFinite, isNaN, n.toFixed |
| [`formatPowerSigned`](../../../../../src-ts/runtime-executables/www/app.ts#L562) | v | Math.abs, Number, abs.toFixed, isNaN, nxTryTsDashboardFormat |
| [`formatFlowPower`](../../../../../src-ts/runtime-executables/www/app.ts#L578) | v, decimals | Number, isNaN, nxTryTsDashboardFormat |
| [`formatNum`](../../../../../src-ts/runtime-executables/www/app.ts#L593) | v, suffix | Number, isNaN, n.toFixed |
| [`formatNum`](../../../../../src-ts/runtime-executables/www/app.ts#L609) | v, suffix | Number, isNaN |
| [`formatPricePerKwh`](../../../../../src-ts/runtime-executables/www/app.ts#L620) | v | Number, isNaN, n.toFixed |
| [`nwParsePriceCurve`](../../../../../src-ts/runtime-executables/www/app.ts#L642) | raw | Array.isArray, Date.parse, JSON.parse, Number.isFinite, normalizePriceEurPerKwh, out.push, out.sort, raw.trim |
| [`normalizePriceEurPerKwh`](../../../../../src-ts/runtime-executables/www/app.ts#L666) | v | Math.abs, Number, Number.isFinite |
| [`nwNiceStep`](../../../../../src-ts/runtime-executables/www/app.ts#L742) | range, targetTicks | Math.floor, Math.log10, Math.max, Math.pow, Number |
| [`nwClamp`](../../../../../src-ts/runtime-executables/www/app.ts#L760) | v, lo, hi | Math.max, Math.min, Number, Number.isFinite |
| [`nwQuantile`](../../../../../src-ts/runtime-executables/www/app.ts#L771) | arr, q | Array.isArray, Math.floor, Math.max, Math.min, Number |
| [`nwMedian`](../../../../../src-ts/runtime-executables/www/app.ts#L789) | arr | nwQuantile |
| [`nwResolveTariffThresholds`](../../../../../src-ts/runtime-executables/www/app.ts#L798) | pricesEur, cheapCandidate, expensiveCandidate | Array.isArray, Math.max, Math.min, Number, Number.isFinite, isValid, nwQuantile |
| [`isValid`](../../../../../src-ts/runtime-executables/www/app.ts#L818) | v | Number.isFinite |
| [`nwAggregateCurve`](../../../../../src-ts/runtime-executables/www/app.ts#L849) | curve, dayStartMs, dayEndMs, targetIntervalMs | Array.isArray, Math.max, Math.min, Number, Number.isFinite, out.push |
| [`nwFormatCt`](../../../../../src-ts/runtime-executables/www/app.ts#L899) | vEurKwh | Number, isNaN |
| [`nwTariffColorForPrice`](../../../../../src-ts/runtime-executables/www/app.ts#L909) | priceEurKwh, cheapThr, expensiveThr | Number, Number.isFinite |
| [`nwDrawTariffForecastChart`](../../../../../src-ts/runtime-executables/www/app.ts#L924) | canvas, curve, opts | Array.isArray, Date.now, Math.abs, Math.ceil, Math.floor, Math.max, Math.min, Math.round, Number, Number.isFinite, String, canvas.getContext, ctx.beginPath, ctx.clearRect (weitere in der Quelle) |
| [`xOf`](../../../../../src-ts/runtime-executables/www/app.ts#L1004) | tMs | nwClamp |
| [`yOf`](../../../../../src-ts/runtime-executables/www/app.ts#L1014) | pCt | nwClamp |
| [`initTariffForecastTooltip`](../../../../../src-ts/runtime-executables/www/app.ts#L1098) | – | btn.addEventListener, card.addEventListener, document.addEventListener, document.body.appendChild, document.createElement, document.getElementById, tip.addEventListener, tip.querySelector, tip.setAttribute, window.addEventListener |
| [`v`](../../../../../src-ts/runtime-executables/www/app.ts#L1147) | k | – |
| [`tsOf`](../../../../../src-ts/runtime-executables/www/app.ts#L1157) | k | Number |
| [`getTodayRange`](../../../../../src-ts/runtime-executables/www/app.ts#L1167) | – | d0.getTime, d0.setHours, d1.getTime |
| [`update`](../../../../../src-ts/runtime-executables/www/app.ts#L1179) | – | Array.isArray, Date.now, Math.max, Math.min, Number, Number.isFinite, _fmtTimeHHmm, curveToday.map, getTodayRange, nwAggregateCurve, nwDrawTariffForecastChart, nwFormatCt, nwMedian, nwParsePriceCurve (weitere in der Quelle) |
| [`place`](../../../../../src-ts/runtime-executables/www/app.ts#L1253) | – | Math.round, anchor.getBoundingClientRect, nwClamp, tip.classList.add, tip.classList.contains, tip.classList.remove, tip.getBoundingClientRect |
| [`show`](../../../../../src-ts/runtime-executables/www/app.ts#L1296) | anchor | clearInterval, place, requestAnimationFrame, setInterval, tip.classList.add, update |
| [`hide`](../../../../../src-ts/runtime-executables/www/app.ts#L1315) | – | clearInterval, clearTimeout, tip.classList.remove |
| [`toggle`](../../../../../src-ts/runtime-executables/www/app.ts#L1327) | anchor | hide, show |
| [`_fmtTempC`](../../../../../src-ts/runtime-executables/www/app.ts#L1422) | v | Number, isNaN |
| [`_fmtPct`](../../../../../src-ts/runtime-executables/www/app.ts#L1432) | v | Number, isNaN |
| [`_fmtKmh`](../../../../../src-ts/runtime-executables/www/app.ts#L1442) | v | Number, isNaN |
| [`_fmtNumLocal`](../../../../../src-ts/runtime-executables/www/app.ts#L1452) | v, digits | Number, isNaN, n.toFixed, n.toLocaleString, nwUiLocaleTag |
| [`_fmtTimeHHmm`](../../../../../src-ts/runtime-executables/www/app.ts#L1468) | ts | Number, String, d.getHours, d.getMinutes, isNaN |
| [`_pickWeatherIcon`](../../../../../src-ts/runtime-executables/www/app.ts#L1481) | code, text | Number, String, isNaN, t.includes |
| [`setWidth`](../../../../../src-ts/runtime-executables/www/app.ts#L1512) | id, pct | Math.max, Math.min, document.getElementById |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L1523) | id, text | document.getElementById |
| [`nwSetDisplay`](../../../../../src-ts/runtime-executables/www/app.ts#L1534) | id, visible, displayValue | document.getElementById |
| [`nwSetElementVisible`](../../../../../src-ts/runtime-executables/www/app.ts#L1545) | el, visible, displayValue | el.classList.toggle |
| [`nwAsBool`](../../../../../src-ts/runtime-executables/www/app.ts#L1556) | v, def | String |
| [`nwFeatureMappedRow`](../../../../../src-ts/runtime-executables/www/app.ts#L1571) | row | fields.some |
| [`nwConfiguredEvcsRows`](../../../../../src-ts/runtime-executables/www/app.ts#L1584) | inputCfg | Array.isArray, list.filter |
| [`nwEvcsFeatureFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1602) | inputCfg | Number, Number.isFinite, nwConfiguredEvcsRows |
| [`nwEvcsCountFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1622) | inputCfg | Math.max, Math.round, Number, Number.isFinite |
| [`nwOptionalFeatureFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1638) | inputCfg, key, fallback | – |
| [`nwSmartHomeFeatureFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1646) | inputCfg | nwOptionalFeatureFromConfig |
| [`nwStorageFarmAppCenterActiveFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1650) | inputCfg | – |
| [`nwStorageFarmHasRealRowsFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1664) | inputCfg | Array.isArray, rows.filter |
| [`nwStorageFarmFeatureFromConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L1683) | inputCfg, stateSnapshot | Number, Number.isFinite, nwAsBool, nwStorageFarmAppCenterActiveFromConfig, nwStorageFarmHasRealRowsFromConfig |
| [`nwTsFeatureVisibilityShadowEnabled`](../../../../../src-ts/runtime-executables/www/app.ts#L1729) | – | String, qs.get, window.localStorage.getItem |
| [`nwBuildTsFeatureVisibilityInput`](../../../../../src-ts/runtime-executables/www/app.ts#L1754) | inputCfg, stateSnapshot | Array.isArray, String, nwAsBool, nwConfiguredEvcsRows, nwSmartHomeFeatureFromConfig, nwStorageFarmFeatureFromConfig, rows.map, storageFarmStorages.map |
| [`nwRunTsFeatureVisibilityShadowCheck`](../../../../../src-ts/runtime-executables/www/app.ts#L1808) | inputCfg, stateSnapshot, legacyVisibility | console.debug, console.warn, import, keys.filter, mod.buildCustomerFeatureVisibility, nwBuildTsFeatureVisibilityInput, nwTsFeatureVisibilityShadowEnabled |
| [`nwApplyCustomerFeatureVisibility`](../../../../../src-ts/runtime-executables/www/app.ts#L1834) | inputCfg, stateSnapshot | document.getElementById, evSide.closest, evcsCard.classList.toggle, menuEvcsLink.classList.toggle, menuStorageFarmLink.classList.toggle, nwEvcsCountFromConfig, nwEvcsFeatureFromConfig, nwRunTsFeatureVisibilityShadowCheck, nwSetElementVisible, nwSmartHomeFeatureFromConfig, nwStorageFarmFeatureFromConfig, tabEvcs.classList.toggle, tabStorageFarm.classList.toggle, tile.querySelector |
| [`nwFormatDashboardTimestamp`](../../../../../src-ts/runtime-executables/www/app.ts#L1892) | ts | Number, Number.isFinite, String, d.getDate, d.getFullYear, d.getHours, d.getMinutes, d.getMonth, d.getSeconds |
| [`nwLatestStateTimestamp`](../../../../../src-ts/runtime-executables/www/app.ts#L1910) | keys | Array.isArray, Date.now, Object.keys, keys.forEach |
| [`scanKey`](../../../../../src-ts/runtime-executables/www/app.ts#L1919) | k | Number, Number.isFinite |
| [`nwSetLiveOnline`](../../../../../src-ts/runtime-executables/www/app.ts#L1941) | isOnline | document.getElementById, dot.classList.toggle, setText |
| [`updateDashboardShellUi`](../../../../../src-ts/runtime-executables/www/app.ts#L1954) | data | Math.abs, Math.max, Math.round, Number, Number.isFinite, String, coerceNumber, d, document.getElementById, formatFlowPower, liveDot.classList.contains, nwApplyCustomerFeatureVisibility, nwEvcsFeatureFromConfig, nwFormatDashboardTimestamp (weitere in der Quelle) |
| [`_svgEl`](../../../../../src-ts/runtime-executables/www/app.ts#L2011) | tag, attrs | Object.entries, String, document.createElementNS, el.setAttribute |
| [`initEnergyWebExtras`](../../../../../src-ts/runtime-executables/www/app.ts#L2027) | flowSlots | Array.isArray, Math.max, Math.min, Number.isFinite, Object.assign, String, bhkwAll.filter, consumersAll.filter, document.getElementById, genAll.filter, nwEvcsFeatureFromConfig, parts.every, placeConsumersRightArc, placeProducersLeftArc (weitere in der Quelle) |
| [`placeItem`](../../../../../src-ts/runtime-executables/www/app.ts#L2128) | item, x, y, kind, idx, rNode | Math.max, Number, String, _svgEl, flowExtras.consumers.push, flowExtras.producers.push, formatFlowPower, g.addEventListener, g.appendChild, g.classList.add, g.setAttribute, gLines.appendChild, gNodes.appendChild, icoText.appendChild (weitere in der Quelle) |
| [`_readTranslate`](../../../../../src-ts/runtime-executables/www/app.ts#L2249) | id, fallback | Number, Number.isFinite, document.getElementById, el.getAttribute, tr.match |
| [`placeSpecialProducer`](../../../../../src-ts/runtime-executables/www/app.ts#L2276) | item, x, y, role, rNode | Array.isArray, Math.max, String, _svgEl, flowExtras.special.push, formatFlowPower, g.appendChild, g.setAttribute, gLines.appendChild, gNodes.appendChild, icoText.appendChild, rawLabel.slice |
| [`placeSpecialLowerLeftArc`](../../../../../src-ts/runtime-executables/www/app.ts#L2351) | items | Array.isArray, Math.cos, Math.max, Math.min, Math.sin, Number.isFinite, items.filter, placeSpecialProducer |
| [`clampFlowPoint`](../../../../../src-ts/runtime-executables/www/app.ts#L2441) | pt | Math.max, Math.min |
| [`sampleAngles`](../../../../../src-ts/runtime-executables/www/app.ts#L2451) | startDeg, endDeg, count | Array.from, Math.round |
| [`buildConsumerAngles`](../../../../../src-ts/runtime-executables/www/app.ts#L2470) | count | Math.ceil, sampleAngles, upper.concat |
| [`nudgeAway`](../../../../../src-ts/runtime-executables/www/app.ts#L2501) | pt, blocker, minDist | Math.hypot, Number.isFinite |
| [`resolveExtraNodePoint`](../../../../../src-ts/runtime-executables/www/app.ts#L2529) | kind, x, y, rNode, placed | Array.isArray, clampFlowPoint, fixedBlockers.concat, fixedBlockers.push, nudgeAway |
| [`placeConsumersRightArc`](../../../../../src-ts/runtime-executables/www/app.ts#L2571) | items | Math.cos, Math.min, Math.sin, buildConsumerAngles, placeItem, placed.push, resolveExtraNodePoint |
| [`placeProducersLeftArc`](../../../../../src-ts/runtime-executables/www/app.ts#L2602) | items | Math.cos, Math.sin, placeItem |
| [`isHeatingRodFlowItem`](../../../../../src-ts/runtime-executables/www/app.ts#L2673) | it | String |
| [`resolveHeatingRodFlowPower`](../../../../../src-ts/runtime-executables/www/app.ts#L2686) | it, d, fallbackRaw | Math.abs, Math.max, Math.round, Number, Number.isFinite, readN |
| [`readN`](../../../../../src-ts/runtime-executables/www/app.ts#L2694) | key | Number, Number.isFinite, d |
| [`updateEnergyWebExtras`](../../../../../src-ts/runtime-executables/www/app.ts#L2726) | d | Array.isArray, Math.abs, Number, d, formatFlowPower, isHeatingRodFlowItem, resolveHeatingRodFlowPower, setNodeActive, setRev, setText, show, stabilizeFlowAbs, stabilizeFlowSigned, sumSpecialPower |
| [`show`](../../../../../src-ts/runtime-executables/www/app.ts#L2734) | id, abs | Math.max, Math.min, Number, String, document.getElementById |
| [`setRev`](../../../../../src-ts/runtime-executables/www/app.ts#L2754) | id, rev | document.getElementById, el.classList.toggle |
| [`setNodeActive`](../../../../../src-ts/runtime-executables/www/app.ts#L2765) | nodeId, active | document.getElementById |
| [`sumSpecialPower`](../../../../../src-ts/runtime-executables/www/app.ts#L2800) | role, devices | Array.isArray, Number, Number.isFinite, String, d |
| [`setRingSegment`](../../../../../src-ts/runtime-executables/www/app.ts#L2864) | cls, pct | Math.max, Math.min, document.querySelector, el.setAttribute |
| [`computeDerived`](../../../../../src-ts/runtime-executables/www/app.ts#L2880) | – | Math.max, Math.min, Number, getGridImportExport, getNormalizedBatteryFlow, pick |
| [`get`](../../../../../src-ts/runtime-executables/www/app.ts#L2926) | k | – |
| [`pick`](../../../../../src-ts/runtime-executables/www/app.ts#L2933) | keys | coerceNumber, get |
| [`coerceNumber`](../../../../../src-ts/runtime-executables/www/app.ts#L2947) | v | Number.isFinite, String, parseFloat, s.replace |
| [`clamp01`](../../../../../src-ts/runtime-executables/www/app.ts#L2963) | v, lo, hi | Math.max, Math.min, Number.isFinite |
| [`isMappedDatapoint`](../../../../../src-ts/runtime-executables/www/app.ts#L2973) | key | Object.prototype.hasOwnProperty.call, String |
| [`getGridImportExport`](../../../../../src-ts/runtime-executables/www/app.ts#L2993) | read | Math.max, coerceNumber, getter, isMappedDatapoint |
| [`getStateAgeMs`](../../../../../src-ts/runtime-executables/www/app.ts#L3029) | key | Date.now, Math.max, Number, Number.isFinite |
| [`getFlowFreshMaxAgeMs`](../../../../../src-ts/runtime-executables/www/app.ts#L3045) | – | Math.max, Math.round, coerceNumber |
| [`getFreshFlowNumber`](../../../../../src-ts/runtime-executables/www/app.ts#L3061) | key, opts | Number, Number.isFinite, coerceNumber, getFlowFreshMaxAgeMs, getStateAgeMs, isMappedDatapoint |
| [`getStableFlowNumber`](../../../../../src-ts/runtime-executables/www/app.ts#L3078) | key, opts | Object.assign, getFreshFlowNumber |
| [`getConfiguredDatapointId`](../../../../../src-ts/runtime-executables/www/app.ts#L3089) | key | String |
| [`getBalanceDerivedBatteryFlow`](../../../../../src-ts/runtime-executables/www/app.ts#L3104) | opts | Math.abs, Math.max, Math.round, Number, Number.isFinite, coerceNumber, getGridImportExport, isMappedDatapoint, nwStorageFarmFeatureFromConfig, read |
| [`read`](../../../../../src-ts/runtime-executables/www/app.ts#L3114) | k | – |
| [`preferBalanceDerivedBatteryFlow`](../../../../../src-ts/runtime-executables/www/app.ts#L3171) | current, opts | Math.max, Number, Number.isFinite, Object.assign, String, getBalanceDerivedBatteryFlow |
| [`getNormalizedBatteryFlow`](../../../../../src-ts/runtime-executables/www/app.ts#L3195) | – | Math.abs, Math.max, Number, Number.isFinite, fromSigned, getBalanceDerivedBatteryFlow, getConfiguredDatapointId, getStableFlowNumber, nwStorageFarmFeatureFromConfig |
| [`fromSigned`](../../../../../src-ts/runtime-executables/www/app.ts#L3219) | raw, src | Math.abs, Number, Number.isFinite |
| [`getCanonicalPvPowerW`](../../../../../src-ts/runtime-executables/www/app.ts#L3304) | readValue | Math.abs, Math.max, Number, Number.isFinite, d, nwStorageFarmFeatureFromConfig |
| [`render`](../../../../../src-ts/runtime-executables/www/app.ts#L3336) | – | Math.max, Math.round, Number, String, _fmtKmh, _fmtNumLocal, _fmtPct, _fmtTempC, _fmtTimeHHmm, _pickWeatherIcon, autarkyN.toFixed, clamp01, co2FromPvT.toFixed, coerceNumber (weitere in der Quelle) |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L3344) | k | – |
| [`pct`](../../../../../src-ts/runtime-executables/www/app.ts#L3380) | v | Math.abs |
| [`bootstrap`](../../../../../src-ts/runtime-executables/www/app.ts#L3593) | – | Date.now, Object.keys, String, applyFlowCoreLabels, bindToggleButtonGroups, cfgRes.json, console.warn, document.documentElement.setAttribute, document.getElementById, fetch, initBhkwModal, initEnergyWebExtras, initGeneratorModal, initRelayModal (weitere in der Quelle) |
| [`applyConfigSnapshot`](../../../../../src-ts/runtime-executables/www/app.ts#L3679) | nextCfg | Math.max, Math.round, Number, Number.isFinite, applyFlowCoreLabels, console.warn, document.getElementById, initEnergyWebExtras, menuEvcsLink.classList.toggle, menuSmartHomeLink.classList.toggle, menuStorageFarmLink.classList.toggle, nwApplyCustomerFeatureVisibility, nwEvcsFeatureFromConfig, nwSmartHomeFeatureFromConfig (weitere in der Quelle) |
| [`refreshConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L3756) | – | applyConfigSnapshot, console.warn, fetch, refreshConfig, scheduleRender |
| [`startEvents`](../../../../../src-ts/runtime-executables/www/app.ts#L3811) | – | console.warn, document.getElementById, dot.classList.remove, setTimeout |
| [`initMenu`](../../../../../src-ts/runtime-executables/www/app.ts#L3853) | – | btn.addEventListener, document.addEventListener, document.getElementById, menu.addEventListener, settingsBtn.addEventListener |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L3874) | – | menu.classList.toggle |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L3881) | – | menu.classList.add |
| [`initSettingsPanel`](../../../../../src-ts/runtime-executables/www/app.ts#L3920) | – | JSON.parse, String, applySoc, document.getElementById, dynToggle.addEventListener, elRef.addEventListener, elSoc.addEventListener, energyWalletToggle.addEventListener, localStorage.getItem, netFeeModelSel.addEventListener, netFeeTabs.querySelectorAll, netFeeToggle.addEventListener, normalizePriorityValue, notifyTestBtn.addEventListener (weitere in der Quelle) |
| [`updatePriorityLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L3950) | – | Number |
| [`updateTariffModeLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L3961) | – | Number |
| [`updateDynVisibility`](../../../../../src-ts/runtime-executables/www/app.ts#L3978) | – | syncToggleButtonsForInputId |
| [`updateEnergyWalletSettingsVisibility`](../../../../../src-ts/runtime-executables/www/app.ts#L3986) | – | syncToggleButtonsForInputId |
| [`normalizePriorityValue`](../../../../../src-ts/runtime-executables/www/app.ts#L4007) | – | Number, Number.isFinite, String |
| [`snapPriority`](../../../../../src-ts/runtime-executables/www/app.ts#L4034) | – | Number, Number.isFinite, String, updatePriorityLabel |
| [`snapTariffMode`](../../../../../src-ts/runtime-executables/www/app.ts#L4056) | – | Number, Number.isFinite, String, updateTariffModeLabel |
| [`setDynSubTab`](../../../../../src-ts/runtime-executables/www/app.ts#L4091) | tab | netFeeTabs.querySelectorAll |
| [`updateNetFeeUi`](../../../../../src-ts/runtime-executables/www/app.ts#L4110) | opts | String, setDynSubTab, syncToggleButtonsForInputId |
| [`updatePvSeasonUi`](../../../../../src-ts/runtime-executables/www/app.ts#L4165) | – | pvSeasonAiToggle.dispatchEvent, syncToggleButtonsForInputId |
| [`_nwBool`](../../../../../src-ts/runtime-executables/www/app.ts#L4230) | v | String |
| [`updateWeatherVisibility`](../../../../../src-ts/runtime-executables/www/app.ts#L4241) | – | _nwBool, syncToggleButtonsForInputId |
| [`updateWeatherModeUi`](../../../../../src-ts/runtime-executables/www/app.ts#L4266) | – | String, weatherBtns.querySelectorAll |
| [`applySoc`](../../../../../src-ts/runtime-executables/www/app.ts#L4444) | – | document.getElementById |
| [`applyInitialTabFromUrl`](../../../../../src-ts/runtime-executables/www/app.ts#L4475) | – | String, params.get, tryActivate, window.location.replace |
| [`tryActivate`](../../../../../src-ts/runtime-executables/www/app.ts#L4500) | – | btn.classList.contains, btn.click, document.querySelector, setTimeout |
| [`_nwCssEscapeIdent`](../../../../../src-ts/runtime-executables/www/app.ts#L4520) | s | CSS.escape, String |
| [`syncToggleGroup`](../../../../../src-ts/runtime-executables/www/app.ts#L4533) | groupEl, checked | Array.from, btns.forEach, groupEl.querySelectorAll |
| [`syncToggleButtonsForInputId`](../../../../../src-ts/runtime-executables/www/app.ts#L4548) | inputId | _nwCssEscapeIdent, document.getElementById, document.querySelectorAll |
| [`syncAllToggleButtons`](../../../../../src-ts/runtime-executables/www/app.ts#L4561) | – | document.querySelectorAll |
| [`bindToggleButtonGroups`](../../../../../src-ts/runtime-executables/www/app.ts#L4580) | – | document.addEventListener, syncAllToggleButtons |
| [`hideAllPanels`](../../../../../src-ts/runtime-executables/www/app.ts#L4656) | – | document.body.classList.remove, document.querySelector, document.querySelectorAll |
| [`showDashboardTab`](../../../../../src-ts/runtime-executables/www/app.ts#L4668) | tab | String, document.body.classList.toggle, document.querySelector, document.querySelectorAll |
| [`loadConfig`](../../../../../src-ts/runtime-executables/www/app.ts#L4700) | – | console.warn, fetch, r.json |
| [`bindInputValue`](../../../../../src-ts/runtime-executables/www/app.ts#L4714) | el, stateKey | String, el.addEventListener, sk.slice, sk.startsWith, v.trim |
| [`updatePvSurplusSettingsUi`](../../../../../src-ts/runtime-executables/www/app.ts#L4793) | – | String, block.classList.toggle, document.getElementById, row.classList.toggle |
| [`setupPvSurplusSettingsUi`](../../../../../src-ts/runtime-executables/www/app.ts#L4810) | – | document.getElementById, enabled.addEventListener, select.addEventListener, updatePvSurplusSettingsUi |
| [`initSettingsPageTabs`](../../../../../src-ts/runtime-executables/www/app.ts#L4827) | – | Array.from, activatePage, buttons.forEach, document.querySelector, wrap.querySelectorAll |
| [`normalizePage`](../../../../../src-ts/runtime-executables/www/app.ts#L4838) | value | String, allowed.includes, buttons.map |
| [`activatePage`](../../../../../src-ts/runtime-executables/www/app.ts#L4857) | value | buttons.forEach, normalizePage, renderSettingsLogPanel, sessionStorage.setItem, wrap.querySelectorAll |
| [`_nwSettingsStateValue`](../../../../../src-ts/runtime-executables/www/app.ts#L4890) | key | – |
| [`_nwSettingsText`](../../../../../src-ts/runtime-executables/www/app.ts#L4900) | value, fallback | String |
| [`_nwSettingsBool`](../../../../../src-ts/runtime-executables/www/app.ts#L4911) | value | String |
| [`_nwSettingsCount`](../../../../../src-ts/runtime-executables/www/app.ts#L4925) | value | Math.round, Number, Number.isFinite, String |
| [`_nwSettingsTs`](../../../../../src-ts/runtime-executables/www/app.ts#L4935) | value | Number, Number.isFinite, nwUiLocaleTag |
| [`_nwSettingsPower`](../../../../../src-ts/runtime-executables/www/app.ts#L4946) | value | Number, Number.isFinite, formatPower |
| [`_nwSettingsDays`](../../../../../src-ts/runtime-executables/www/app.ts#L4956) | value | Math.round, Number, Number.isFinite |
| [`_nwSettingsJson`](../../../../../src-ts/runtime-executables/www/app.ts#L4966) | value | JSON.parse, JSON.stringify, _nwSettingsText |
| [`renderSettingsLogPanel`](../../../../../src-ts/runtime-executables/www/app.ts#L4977) | – | String, _nwSettingsBool, _nwSettingsCount, _nwSettingsDays, _nwSettingsJson, _nwSettingsPower, _nwSettingsStateValue, _nwSettingsText, _nwSettingsTs, document.getElementById, document.querySelector, set |
| [`set`](../../../../../src-ts/runtime-executables/www/app.ts#L5004) | id, value | document.getElementById |
| [`setupSettingsReportButtons`](../../../../../src-ts/runtime-executables/www/app.ts#L5088) | – | btn.addEventListener, document.getElementById |
| [`setupSettings`](../../../../../src-ts/runtime-executables/www/app.ts#L5107) | – | document.querySelectorAll, initSettingsPageTabs, renderSettingsLogPanel, setupPvSurplusSettingsUi, setupRfidBillingUi, setupRfidLearningUi, setupRfidWhitelistUi, setupSettingsReportButtons |
| [`parseJsonSafe`](../../../../../src-ts/runtime-executables/www/app.ts#L5130) | raw, fallback | JSON.parse, JSON.stringify |
| [`storageFarmGetStatusList`](../../../../../src-ts/runtime-executables/www/app.ts#L5143) | – | Array.isArray, parseJsonSafe |
| [`storageFarmUpdateModeLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L5155) | – | String, document.getElementById |
| [`storageFarmUpdateSummary`](../../../../../src-ts/runtime-executables/www/app.ts#L5168) | – | Number, document.getElementById, formatPower |
| [`storageFarmRenderStatusRows`](../../../../../src-ts/runtime-executables/www/app.ts#L5187) | list | Array.isArray, document.getElementById, list.forEach |
| [`mkCell`](../../../../../src-ts/runtime-executables/www/app.ts#L5212) | txt, label | String, d.setAttribute, document.createElement |
| [`storageFarmApply`](../../../../../src-ts/runtime-executables/www/app.ts#L5275) | – | storageFarmGetStatusList, storageFarmRenderStatusRows, storageFarmUpdateModeLabel, storageFarmUpdateSummary |
| [`initStorageFarmPanel`](../../../../../src-ts/runtime-executables/www/app.ts#L5289) | – | btnReload.addEventListener, document.getElementById, storageFarmApply |
| [`loadRfidCustomerState`](../../../../../src-ts/runtime-executables/www/app.ts#L5305) | – | Array.isArray, Date.now, JSON.stringify, Number, Object.assign, String, fetch, response.json |
| [`setupRfidWhitelistUi`](../../../../../src-ts/runtime-executables/www/app.ts#L5330) | – | btnAdd.addEventListener, btnReload.addEventListener, btnSave.addEventListener, document.getElementById, readWhitelistFromState, render |
| [`normRfid`](../../../../../src-ts/runtime-executables/www/app.ts#L5343) | v | String |
| [`safeText`](../../../../../src-ts/runtime-executables/www/app.ts#L5350) | v | String |
| [`readWhitelistFromState`](../../../../../src-ts/runtime-executables/www/app.ts#L5357) | – | Array.isArray, JSON.parse, String, arr.map |
| [`setMsg`](../../../../../src-ts/runtime-executables/www/app.ts#L5383) | t | – |
| [`render`](../../../../../src-ts/runtime-executables/www/app.ts#L5390) | – | setMsg |
| [`save`](../../../../../src-ts/runtime-executables/www/app.ts#L5440) | – | JSON.stringify, cleaned.push, fetch, normRfid, render, safeText, seen.add, seen.has, setMsg |
| [`reload`](../../../../../src-ts/runtime-executables/www/app.ts#L5473) | – | loadRfidCustomerState, readWhitelistFromState, render, setMsg |
| [`setupRfidLearningUi`](../../../../../src-ts/runtime-executables/www/app.ts#L5546) | – | applyUi, btnAdd.addEventListener, btnLearn.addEventListener, document.getElementById, loadRfidCustomerState |
| [`setMsg`](../../../../../src-ts/runtime-executables/www/app.ts#L5560) | t | – |
| [`setLearningActive`](../../../../../src-ts/runtime-executables/www/app.ts#L5567) | active | JSON.stringify, fetch |
| [`readStateVal`](../../../../../src-ts/runtime-executables/www/app.ts#L5584) | key | – |
| [`stopLearningPoll`](../../../../../src-ts/runtime-executables/www/app.ts#L5590) | – | clearTimeout |
| [`pollLearningState`](../../../../../src-ts/runtime-executables/www/app.ts#L5594) | – | Date.now, applyUi, loadRfidCustomerState, readStateVal, setTimeout, stopLearningPoll |
| [`startLearningPoll`](../../../../../src-ts/runtime-executables/www/app.ts#L5603) | – | Date.now, pollLearningState |
| [`applyUi`](../../../../../src-ts/runtime-executables/www/app.ts#L5613) | – | Number, String, nwUiLocaleTag, readStateVal, setMsg |
| [`setupRfidBillingUi`](../../../../../src-ts/runtime-executables/www/app.ts#L5686) | – | String, applyMode, btnOpen.addEventListener, document.getElementById, modeWrap.querySelectorAll, now.getFullYear, now.getMonth, pad2, renderOptions |
| [`pad2`](../../../../../src-ts/runtime-executables/www/app.ts#L5703) | n | Number, String |
| [`setMsg`](../../../../../src-ts/runtime-executables/www/app.ts#L5710) | t | – |
| [`getWhitelist`](../../../../../src-ts/runtime-executables/www/app.ts#L5717) | – | Array.isArray, JSON.parse, window.__nwRfidWhitelist.get |
| [`renderOptions`](../../../../../src-ts/runtime-executables/www/app.ts#L5743) | – | Array.isArray, String, document.createElement, getWhitelist, sel.appendChild |
| [`applyMode`](../../../../../src-ts/runtime-executables/www/app.ts#L5793) | m | modeWrap.querySelectorAll, monthRow.classList.toggle, setMsg, yearRow.classList.toggle |
| [`setupInstaller`](../../../../../src-ts/runtime-executables/www/app.ts#L5880) | – | btn.addEventListener, cancel.addEventListener, document.getElementById, form.addEventListener, refreshLock |
| [`refreshLock`](../../../../../src-ts/runtime-executables/www/app.ts#L5893) | – | fetch, formBox.classList.toggle, formBox.querySelectorAll, loginBox.classList.toggle, r.json |
| [`doLogin`](../../../../../src-ts/runtime-executables/www/app.ts#L5913) | – | JSON.stringify, String, alert, fetch, refreshLock |
| [`initInstallerPanel`](../../../../../src-ts/runtime-executables/www/app.ts#L5957) | – | document.getElementById, document.querySelectorAll |
| [`initTabs`](../../../../../src-ts/runtime-executables/www/app.ts#L5973) | – | buttons.forEach, document.querySelectorAll |
| [`renderSmartHome`](../../../../../src-ts/runtime-executables/www/app.ts#L5992) | – | Number, document.getElementById, get, onTxt |
| [`onTxt`](../../../../../src-ts/runtime-executables/www/app.ts#L5999) | v | – |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6006) | k | – |
| [`get`](../../../../../src-ts/runtime-executables/www/app.ts#L6013) | path | d |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6045) | k | – |
| [`pctDeg`](../../../../../src-ts/runtime-executables/www/app.ts#L6070) | val, maxDeg | Math.max, Math.min |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6089) | id, t | document.getElementById |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6129) | k | – |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6152) | id, t | document.getElementById |
| [`pct`](../../../../../src-ts/runtime-executables/www/app.ts#L6190) | v | Math.max, Math.min |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6221) | k | – |
| [`pctDeg`](../../../../../src-ts/runtime-executables/www/app.ts#L6246) | val, maxDeg | Math.max, Math.min |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6265) | id, t | document.getElementById |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6305) | k | – |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6328) | id, t | document.getElementById |
| [`pct`](../../../../../src-ts/runtime-executables/www/app.ts#L6366) | v | Math.max, Math.min |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L6389) | k | – |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6398) | id, txt | document.getElementById |
| [`setSideValue`](../../../../../src-ts/runtime-executables/www/app.ts#L6413) | id, val | document.getElementById |
| [`updateEmsControlUi`](../../../../../src-ts/runtime-executables/www/app.ts#L6423) | – | Number, Number.isFinite, String, card.classList.toggle, document.getElementById, formatPower, formatPricePerKwh, modal.classList.contains, modeWrap.querySelectorAll, prioWrap.querySelectorAll, setText, v, window.nwSyncToggleButtons |
| [`v`](../../../../../src-ts/runtime-executables/www/app.ts#L6438) | k | – |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L6466) | id, txt | document.getElementById |
| [`initEmsControlModal`](../../../../../src-ts/runtime-executables/www/app.ts#L6631) | – | closeBtn.addEventListener, document.getElementById, energyDetailsBtn.addEventListener, modal.addEventListener, modeWrap.querySelectorAll, openBtn.addEventListener, openSettingsBtn.addEventListener, prioWrap.querySelectorAll, tariffToggle.addEventListener |
| [`setSetting`](../../../../../src-ts/runtime-executables/www/app.ts#L6652) | key, value | JSON.stringify, fetch |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L6675) | e | e.preventDefault, modal.classList.remove, updateEmsControlUi |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L6686) | – | modal.classList.add |
| [`initThresholdModal`](../../../../../src-ts/runtime-executables/www/app.ts#L6746) | – | card.addEventListener, closeBtn.addEventListener, document.addEventListener, document.getElementById, modal.addEventListener |
| [`setHint`](../../../../../src-ts/runtime-executables/www/app.ts#L6763) | msg, isError | String |
| [`apiSet`](../../../../../src-ts/runtime-executables/www/app.ts#L6774) | key, value | JSON.stringify, fetch, resp.json, setHint |
| [`renderModal`](../../../../../src-ts/runtime-executables/www/app.ts#L6806) | – | Array.isArray, configured.forEach, document.createElement, listEl.appendChild, setHint |
| [`v`](../../../../../src-ts/runtime-executables/www/app.ts#L6817) | k | – |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/app.ts#L6845) | r | Math.max, Math.min, Math.round, Number, Number.isFinite, String, body.appendChild, box.appendChild, btnWrap.appendChild, ctl.appendChild, document.createElement, head.appendChild, inp.addEventListener, mkBtn (weitere in der Quelle) |
| [`prettyStatus`](../../../../../src-ts/runtime-executables/www/app.ts#L6880) | raw | String |
| [`mkKpi`](../../../../../src-ts/runtime-executables/www/app.ts#L6925) | label, valueText | box.appendChild, document.createElement |
| [`setActive`](../../../../../src-ts/runtime-executables/www/app.ts#L6982) | uiVal | Array.from, btnWrap.querySelectorAll |
| [`mkBtn`](../../../../../src-ts/runtime-executables/www/app.ts#L7001) | label, uiVal, sendMode | String, b.addEventListener, b.classList.add, document.createElement |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L7144) | e | e.preventDefault, modal.classList.remove, renderModal |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L7155) | – | modal.classList.add |
| [`initRelayModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7180) | – | card.addEventListener, closeBtn.addEventListener, document.addEventListener, document.getElementById, modal.addEventListener |
| [`setHint`](../../../../../src-ts/runtime-executables/www/app.ts#L7199) | msg, isError | String |
| [`apiSet`](../../../../../src-ts/runtime-executables/www/app.ts#L7210) | idx, prop, value | JSON.stringify, fetch, resp.json, setHint |
| [`fetchSnapshot`](../../../../../src-ts/runtime-executables/www/app.ts#L7242) | – | fetch, r.json |
| [`renderModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7265) | – | Array.isArray, document.createElement, fetchSnapshot, listEl.appendChild, relays.filter, setHint, shown.forEach |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/app.ts#L7304) | r | Number, Number.isFinite, String, body.appendChild, box.appendChild, btnWrap.appendChild, ctl.appendChild, document.createElement, head.appendChild, inp.addEventListener, mkBtn, mkKpi, row.appendChild |
| [`mkKpi`](../../../../../src-ts/runtime-executables/www/app.ts#L7348) | label, valueText | box.appendChild, document.createElement |
| [`mkBtn`](../../../../../src-ts/runtime-executables/www/app.ts#L7393) | label, val | b.addEventListener, document.createElement |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L7472) | e | clearInterval, e.preventDefault, modal.classList.remove, renderModal, setInterval |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L7495) | – | clearInterval, modal.classList.add |
| [`initBhkwModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7522) | – | card.addEventListener, closeBtn.addEventListener, document.addEventListener, document.getElementById, modal.addEventListener |
| [`setHint`](../../../../../src-ts/runtime-executables/www/app.ts#L7541) | msg, isError | String |
| [`apiSet`](../../../../../src-ts/runtime-executables/www/app.ts#L7552) | idx, prop, value | JSON.stringify, fetch, resp.json, setHint |
| [`fetchSnapshot`](../../../../../src-ts/runtime-executables/www/app.ts#L7584) | – | fetch, r.json |
| [`renderModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7607) | – | Array.isArray, devices.filter, document.createElement, fetchSnapshot, listEl.appendChild, setHint, shown.forEach |
| [`mkKpi`](../../../../../src-ts/runtime-executables/www/app.ts#L7648) | label, valueText | box.appendChild, document.createElement |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/app.ts#L7674) | d | Math.round, Number, Number.isNaN, String, addBtn, body.appendChild, cmdRow.appendChild, ctl.appendChild, document.createElement, head.appendChild, mkKpi, modeBox.appendChild, row.appendChild, startBtn.addEventListener (weitere in der Quelle) |
| [`addBtn`](../../../../../src-ts/runtime-executables/www/app.ts#L7745) | val, label | b.addEventListener, b.classList.toggle, document.createElement, grp.appendChild |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L7821) | e | clearInterval, e.preventDefault, modal.classList.remove, renderModal, setInterval |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L7843) | – | clearInterval, modal.classList.add |
| [`initGeneratorModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7866) | – | card.addEventListener, closeBtn.addEventListener, document.addEventListener, document.getElementById, modal.addEventListener |
| [`setHint`](../../../../../src-ts/runtime-executables/www/app.ts#L7885) | msg, isError | String |
| [`apiSet`](../../../../../src-ts/runtime-executables/www/app.ts#L7896) | idx, prop, value | JSON.stringify, fetch, resp.json, setHint |
| [`fetchSnapshot`](../../../../../src-ts/runtime-executables/www/app.ts#L7928) | – | fetch, r.json |
| [`renderModal`](../../../../../src-ts/runtime-executables/www/app.ts#L7951) | – | Array.isArray, devices.filter, document.createElement, fetchSnapshot, listEl.appendChild, setHint, shown.forEach |
| [`mkKpi`](../../../../../src-ts/runtime-executables/www/app.ts#L7992) | label, valueText | box.appendChild, document.createElement |
| [`mkRow`](../../../../../src-ts/runtime-executables/www/app.ts#L8018) | d | Math.round, Number, Number.isNaN, String, addBtn, body.appendChild, cmdRow.appendChild, ctl.appendChild, document.createElement, head.appendChild, mkKpi, modeBox.appendChild, row.appendChild, startBtn.addEventListener (weitere in der Quelle) |
| [`addBtn`](../../../../../src-ts/runtime-executables/www/app.ts#L8089) | val, label | b.addEventListener, b.classList.toggle, document.createElement, grp.appendChild |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L8165) | e | clearInterval, e.preventDefault, modal.classList.remove, renderModal, setInterval |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L8187) | – | clearInterval, modal.classList.add |
| [`updateRelayUi`](../../../../../src-ts/runtime-executables/www/app.ts#L8210) | – | Array.isArray, String, card.classList.add, card.classList.remove, document.getElementById, relays.filter, setText, visible.filter |
| [`updateThresholdUi`](../../../../../src-ts/runtime-executables/www/app.ts#L8249) | – | Array.isArray, String, card.classList.add, card.classList.remove, configured.filter, document.getElementById, rules.filter, setText |
| [`updateBhkwUi`](../../../../../src-ts/runtime-executables/www/app.ts#L8288) | – | Array.isArray, Number, String, card.classList.add, card.classList.remove, devs.filter, document.getElementById, setText, sv |
| [`sv`](../../../../../src-ts/runtime-executables/www/app.ts#L8331) | k | – |
| [`updateGeneratorUi`](../../../../../src-ts/runtime-executables/www/app.ts#L8351) | – | Array.isArray, Number, String, card.classList.add, card.classList.remove, devs.filter, document.getElementById, setText, sv |
| [`sv`](../../../../../src-ts/runtime-executables/www/app.ts#L8393) | k | – |
| [`_ensureThermalConsumerTiles`](../../../../../src-ts/runtime-executables/www/app.ts#L8418) | – | _thermalConsTiles.set, document.createElement, document.getElementById, grid.appendChild, tile.addEventListener, tile.setAttribute |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L8466) | – | console.warn, openFlowQc |
| [`_labelThermalMode`](../../../../../src-ts/runtime-executables/www/app.ts#L8500) | mode | String, m.toLowerCase |
| [`updateThermalConsumerUi`](../../../../../src-ts/runtime-executables/www/app.ts#L8521) | – | Array.isArray, Math.abs, Math.max, Number, Number.isFinite, String, _ensureThermalConsumerTiles, _labelThermalMode, _thermalConsTiles.get, document.getElementById, formatPower, normalizeConsumerType, sv |
| [`normalizeConsumerType`](../../../../../src-ts/runtime-executables/www/app.ts#L8548) | raw | String |
| [`sv`](../../../../../src-ts/runtime-executables/www/app.ts#L8569) | k | – |
| [`updateEnergyWeb`](../../../../../src-ts/runtime-executables/www/app.ts#L8652) | – | Date.now, Math.abs, Math.max, Number, Number.isFinite, String, T, d, document.getElementById, formatFlowPower, getCanonicalPvPowerW, getGridImportExport, getNormalizedBatteryFlow, isNaN (weitere in der Quelle) |
| [`d`](../../../../../src-ts/runtime-executables/www/app.ts#L8659) | k | – |
| [`T`](../../../../../src-ts/runtime-executables/www/app.ts#L8797) | id, t | document.getElementById |
| [`show`](../../../../../src-ts/runtime-executables/www/app.ts#L8821) | id, on | document.getElementById |
| [`toggleRev`](../../../../../src-ts/runtime-executables/www/app.ts#L8844) | id, on | document.getElementById, el.classList.toggle |
| [`_nwAiAdvisorStateValue`](../../../../../src-ts/runtime-executables/www/app.ts#L8946) | key, fallback | – |
| [`_nwAiAdvisorBool`](../../../../../src-ts/runtime-executables/www/app.ts#L8961) | key, fallback | String, _nwAiAdvisorStateValue |
| [`_nwAiAdvisorPriorityLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L8976) | p | Number, Number.isFinite, String |
| [`_nwAiAdvisorCategoryLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L8996) | c | String |
| [`_nwEnergyWalletStateValue`](../../../../../src-ts/runtime-executables/www/app.ts#L9022) | key, fallback | Object.prototype.hasOwnProperty.call |
| [`_nwEnergyWalletNum`](../../../../../src-ts/runtime-executables/www/app.ts#L9031) | key, fallback | Number, Number.isFinite, _nwEnergyWalletStateValue |
| [`_nwEnergyWalletMoney`](../../../../../src-ts/runtime-executables/www/app.ts#L9036) | value | Number, Number.isFinite, n.toFixed, n.toLocaleString, nwUiLocaleTag |
| [`_nwEnergyWalletKwh`](../../../../../src-ts/runtime-executables/www/app.ts#L9043) | value | Number, Number.isFinite, n.toFixed, n.toLocaleString, nwUiLocaleTag |
| [`_nwEnergyWalletPricePerKwh`](../../../../../src-ts/runtime-executables/www/app.ts#L9049) | value | Number, Number.isFinite, n.toFixed, n.toLocaleString, nwUiLocaleTag |
| [`_nwEnergyWalletAgeLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L9055) | seconds | Math.max, Math.round, Number |
| [`_nwEnergyWalletEnsureExtendedUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9064) | card | card.appendChild, document.createElement, document.getElementById |
| [`updateEnergyWalletLiveUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9101) | – | Math.round, String, _nwEnergyWalletAgeLabel, _nwEnergyWalletEnsureExtendedUi, _nwEnergyWalletKwh, _nwEnergyWalletMoney, _nwEnergyWalletNum, _nwEnergyWalletPricePerKwh, _nwEnergyWalletStateValue, card.classList.toggle, document.getElementById, eg.classList.toggle, priceEl.classList.toggle, setText (weitere in der Quelle) |
| [`setText`](../../../../../src-ts/runtime-executables/www/app.ts#L9116) | id, text | document.getElementById |
| [`_nwAiAdvisorParseSuggestions`](../../../../../src-ts/runtime-executables/www/app.ts#L9167) | – | Array.isArray, JSON.parse, String, _nwAiAdvisorStateValue, arr.filter |
| [`updateAiAdvisorLiveUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9182) | – | String, _nwAiAdvisorBool, _nwAiAdvisorCategoryLabel, _nwAiAdvisorParseSuggestions, _nwAiAdvisorPriorityLabel, _nwAiAdvisorStateValue, badgeEl.setAttribute, card.classList.toggle, document.createElement, document.getElementById, item.appendChild, listEl.appendChild, suggestions.slice, toggleBtn.addEventListener (weitere in der Quelle) |
| [`openSettings`](../../../../../src-ts/runtime-executables/www/app.ts#L9304) | – | bindToggleButtonGroups, document.getElementById, document.querySelector, initSettingsPanel, sbtn.click, sec.classList.remove, setupSettings |
| [`qs`](../../../../../src-ts/runtime-executables/www/app.ts#L9343) | id | document.getElementById |
| [`apiSet`](../../../../../src-ts/runtime-executables/www/app.ts#L9378) | scope, key, value | JSON.stringify, fetch, r.text |
| [`touchGoalEdit`](../../../../../src-ts/runtime-executables/www/app.ts#L9443) | ms | Date.now |
| [`goalEditLocked`](../../../../../src-ts/runtime-executables/www/app.ts#L9453) | – | Date.now |
| [`bindGoalLock`](../../../../../src-ts/runtime-executables/www/app.ts#L9462) | el, ms | el.addEventListener |
| [`bump`](../../../../../src-ts/runtime-executables/www/app.ts#L9470) | – | touchGoalEdit |
| [`clampUiMode`](../../../../../src-ts/runtime-executables/www/app.ts#L9488) | v | Math.max, Math.min, Math.round, Number, isFinite |
| [`normalizeEmsMode`](../../../../../src-ts/runtime-executables/www/app.ts#L9499) | raw | String |
| [`normalizeEvcsPhaseMode`](../../../../../src-ts/runtime-executables/www/app.ts#L9510) | raw | String, s.replace |
| [`phaseModeLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L9519) | mode | normalizeEvcsPhaseMode |
| [`evcsConfigRow`](../../../../../src-ts/runtime-executables/www/app.ts#L9534) | index | Array.isArray, Math.max, Math.round, Number |
| [`evcsPhaseSwitchDpAssigned`](../../../../../src-ts/runtime-executables/www/app.ts#L9545) | index | String, evcsConfigRow |
| [`evcsStorageAssistCustomerAllowed`](../../../../../src-ts/runtime-executables/www/app.ts#L9550) | index | evcsConfigRow |
| [`applyStorageAssistUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9555) | enabled | btns.forEach, storageAssistButtons.querySelectorAll |
| [`evcsConfiguredPhaseMode`](../../../../../src-ts/runtime-executables/www/app.ts#L9566) | index, fallbackPhases | Number, String, evcsConfigRow, normalizeEvcsPhaseMode |
| [`applyPhaseModeUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9573) | mode | btns.forEach, normalizeEvcsPhaseMode, phaseButtons.querySelectorAll |
| [`legacyNumToMode`](../../../../../src-ts/runtime-executables/www/app.ts#L9585) | n | clampUiMode |
| [`nextTsFromTimeInput`](../../../../../src-ts/runtime-executables/www/app.ts#L9597) | hhmm | Number, String, d.getDate, d.getTime, d.setDate, d.setHours, isFinite, now.getTime, s.split, snapHhmmTo15Min |
| [`snapHhmmTo15Min`](../../../../../src-ts/runtime-executables/www/app.ts#L9621) | hhmm | Math.floor, Math.max, Math.min, Math.round, Number, String, isFinite, s.split |
| [`clockValueFromTs`](../../../../../src-ts/runtime-executables/www/app.ts#L9642) | ts | Number, Number.isFinite, String, dt.getHours, dt.getMinutes |
| [`modeToLegacyNum`](../../../../../src-ts/runtime-executables/www/app.ts#L9660) | mode | normalizeEmsMode |
| [`ensureAutoVisibility`](../../../../../src-ts/runtime-executables/www/app.ts#L9672) | – | autoBtn.classList.toggle, buttons.querySelector |
| [`applyModeUi`](../../../../../src-ts/runtime-executables/www/app.ts#L9683) | mode | btns.forEach, buttons.querySelectorAll, normalizeEmsMode |
| [`fmtP`](../../../../../src-ts/runtime-executables/www/app.ts#L9937) | val | Math.abs, Number, n.toFixed |
| [`openFlowQc`](../../../../../src-ts/runtime-executables/www/app.ts#L10237) | kind, idx | window.__nwFlowQcOpen |
| [`resetGaugeSmoothing`](../../../../../src-ts/runtime-executables/www/app.ts#L10298) | – | – |
| [`smoothGaugePower`](../../../../../src-ts/runtime-executables/www/app.ts#L10311) | valueW, maxW, opts | Math.abs, Math.max, Math.round, Number |
| [`showMsg`](../../../../../src-ts/runtime-executables/www/app.ts#L10345) | t, kind | – |
| [`modeLabel`](../../../../../src-ts/runtime-executables/www/app.ts#L10356) | m | String, s.toLowerCase |
| [`getSlotMeta`](../../../../../src-ts/runtime-executables/www/app.ts#L10375) | k, i | Number, arr.find |
| [`getEntry`](../../../../../src-ts/runtime-executables/www/app.ts#L10387) | k, i | Number, arr.find |
| [`readStateNumber`](../../../../../src-ts/runtime-executables/www/app.ts#L10399) | key, fallback | Number, Number.isFinite |
| [`getHeatingRodDeviceCfg`](../../../../../src-ts/runtime-executables/www/app.ts#L10416) | idx | Array.isArray, Math.round, Number, devices.find |
| [`setFlowGaugeFill`](../../../../../src-ts/runtime-executables/www/app.ts#L10431) | valueW, maxW | Math.abs, Math.max, Math.min, Number, formatPower |
| [`resolveFlowPower`](../../../../../src-ts/runtime-executables/www/app.ts#L10451) | readbackData | Math.abs, Math.max, Number, Number.isFinite, String, getEntry, getHeatingRodDeviceCfg, getSlotMeta, readStateNumber |
| [`updatePower`](../../../../../src-ts/runtime-executables/www/app.ts#L10490) | readbackData | Math.abs, Number, String, formatPower, formatPowerSigned, resolveFlowPower, setFlowGaugeFill, smoothGaugePower |
| [`renderModeButtons`](../../../../../src-ts/runtime-executables/www/app.ts#L10508) | modes, activeMode | Array.isArray, list.forEach |
| [`readback`](../../../../../src-ts/runtime-executables/www/app.ts#L10530) | – | Array.isArray, Date.now, Math.ceil, Math.max, Number, Number.isFinite, String, fetch, formatPower, modeLabel, qp.toString, r.json, renderModeButtons, showMsg (weitere in der Quelle) |
| [`setSwitch`](../../../../../src-ts/runtime-executables/www/app.ts#L10656) | v | JSON.stringify, fetch, setTimeout, showMsg |
| [`setSetpoint`](../../../../../src-ts/runtime-executables/www/app.ts#L10680) | v | JSON.stringify, Number, Number.isFinite, fetch, setTimeout, showMsg |
| [`setRegEnabled`](../../../../../src-ts/runtime-executables/www/app.ts#L10706) | enable | JSON.stringify, fetch, setTimeout, showMsg |
| [`setMode`](../../../../../src-ts/runtime-executables/www/app.ts#L10731) | mode | JSON.stringify, String, fetch, setTimeout, showMsg |
| [`setBoost`](../../../../../src-ts/runtime-executables/www/app.ts#L10758) | enable | JSON.stringify, fetch, setTimeout, showMsg |
| [`open`](../../../../../src-ts/runtime-executables/www/app.ts#L10783) | kind, idx | Number, String, clearInterval, getSlotMeta, isFinite, modal.classList.remove, readback, renderModeButtons, resetGaugeSmoothing, setInterval, showMsg, updatePower, window.nwSyncToggleButtons |
| [`close`](../../../../../src-ts/runtime-executables/www/app.ts#L10878) | – | clearInterval, modal.classList.add, resetGaugeSmoothing, showMsg |
