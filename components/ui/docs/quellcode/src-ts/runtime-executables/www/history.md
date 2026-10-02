# src-ts/runtime-executables/www/history.ts

Lädt historische Anlagenwerte und steuert Diagramme, Zeitraumwahl, Zoom sowie die zugehörigen Berichte.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/history.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`resize`](../../../../../src-ts/runtime-executables/www/history.ts#L90) | – | Math.max, Math.round |
| [`scheduleHistoryFrame`](../../../../../src-ts/runtime-executables/www/history.ts#L112) | – | window.requestAnimationFrame, window.setTimeout |
| [`render`](../../../../../src-ts/runtime-executables/www/history.ts#L114) | – | draw, drawPricingHistoryChart, resize |
| [`fmt`](../../../../../src-ts/runtime-executables/www/history.ts#L145) | ts | d.toLocaleTimeString |
| [`eventClientPoint`](../../../../../src-ts/runtime-executables/www/history.ts#L155) | ev | Number, Number.isFinite |
| [`canvasPointFromEvent`](../../../../../src-ts/runtime-executables/www/history.ts#L167) | targetCanvas, ev | Number, eventClientPoint, targetCanvas.getBoundingClientRect |
| [`isMobileHistorySurface`](../../../../../src-ts/runtime-executables/www/history.ts#L182) | – | Boolean, Number, window.matchMedia |
| [`showFloatingTip`](../../../../../src-ts/runtime-executables/www/history.ts#L197) | tip, html, clientX, clientY | Math.max, Math.min, Math.round, Number, isMobileHistorySurface, tip.classList.toggle, tip.getBoundingClientRect |
| [`scheduleHistoryRenderBurst`](../../../../../src-ts/runtime-executables/www/history.ts#L270) | – | clearTimeout, scheduleHistoryFrame, setTimeout |
| [`countRenderableHistoryPoints`](../../../../../src-ts/runtime-executables/www/history.ts#L281) | res | Object.keys |
| [`scan`](../../../../../src-ts/runtime-executables/www/history.ts#L289) | arr | Array.isArray, Number, Number.isFinite, toTsMs |
| [`scheduleHistoryRetry`](../../../../../src-ts/runtime-executables/www/history.ts#L316) | delayMs | Math.max, Number, setTimeout |
| [`bootHistoryOnce`](../../../../../src-ts/runtime-executables/www/history.ts#L330) | – | load, resize, scheduleHistoryRenderBurst |
| [`isPriceSeriesVisible`](../../../../../src-ts/runtime-executables/www/history.ts#L355) | key | String, hiddenPriceSeries.has |
| [`setPriceSeriesVisible`](../../../../../src-ts/runtime-executables/www/history.ts#L362) | key, visible | String, hiddenPriceSeries.add, hiddenPriceSeries.delete |
| [`applyPriceLegendState`](../../../../../src-ts/runtime-executables/www/history.ts#L373) | – | Array.from, document.querySelectorAll, items.forEach |
| [`bindPriceLegendItem`](../../../../../src-ts/runtime-executables/www/history.ts#L390) | el | el.addEventListener, el.hasAttribute, el.setAttribute |
| [`isSeriesVisible`](../../../../../src-ts/runtime-executables/www/history.ts#L422) | key | String, hiddenSeries.has |
| [`setSeriesVisible`](../../../../../src-ts/runtime-executables/www/history.ts#L429) | key, visible | String, hiddenSeries.add, hiddenSeries.delete |
| [`applyLegendState`](../../../../../src-ts/runtime-executables/www/history.ts#L440) | – | Array.from, document.querySelectorAll, items.forEach |
| [`bindLegendItem`](../../../../../src-ts/runtime-executables/www/history.ts#L457) | el | el.addEventListener, el.hasAttribute, el.setAttribute |
| [`getChartMargins`](../../../../../src-ts/runtime-executables/www/history.ts#L495) | – | – |
| [`getExtras`](../../../../../src-ts/runtime-executables/www/history.ts#L511) | – | Array.isArray |
| [`buildSeriesAll`](../../../../../src-ts/runtime-executables/www/history.ts#L524) | – | Object.assign, ex.consumers.forEach, ex.producers.forEach, getExtras |
| [`colorForExtra`](../../../../../src-ts/runtime-executables/www/history.ts#L554) | kind, idx | Math.max, Math.min, Number |
| [`updateLegend`](../../../../../src-ts/runtime-executables/www/history.ts#L565) | – | Array.from, applyLegendState, document.getElementById, ex.consumers.forEach, ex.producers.forEach, getExtras, legend.querySelectorAll |
| [`addItem`](../../../../../src-ts/runtime-executables/www/history.ts#L579) | label, color, key | bindLegendItem, document.createElement, el.appendChild, legend.appendChild |
| [`drawBars`](../../../../../src-ts/runtime-executables/www/history.ts#L617) | – | Math.max, allKeys.filter, allKeys.forEach, bucketizeRange, buckets.map, buildSeriesAll, ctx.clearRect, ctx.fillRect, ctx.fillText, d.toLocaleDateString, keys.slice, y |
| [`y`](../../../../../src-ts/runtime-executables/www/history.ts#L645) | val | – |
| [`draw`](../../../../../src-ts/runtime-executables/www/history.ts#L689) | – | Array.from, Math.max, Object.values, buildSeriesAll, ctx.beginPath, ctx.clearRect, ctx.fillRect, ctx.fillText, ctx.lineTo, ctx.moveTo, ctx.restore, ctx.save, ctx.stroke, drawBars (weitere in der Quelle) |
| [`x`](../../../../../src-ts/runtime-executables/www/history.ts#L723) | t | – |
| [`isNeg`](../../../../../src-ts/runtime-executables/www/history.ts#L760) | k | – |
| [`yPow`](../../../../../src-ts/runtime-executables/www/history.ts#L801) | kw | – |
| [`ySoc`](../../../../../src-ts/runtime-executables/www/history.ts#L821) | pct | Math.max, Math.min, Number |
| [`mapKW`](../../../../../src-ts/runtime-executables/www/history.ts#L839) | k, w | Math.abs, Number, String |
| [`hexToRgba`](../../../../../src-ts/runtime-executables/www/history.ts#L863) | hex, a | String, h.match, parseInt |
| [`line`](../../../../../src-ts/runtime-executables/www/history.ts#L891) | k, color, accessor, dash, width | Number, Number.isFinite, ctx.beginPath, ctx.restore, ctx.save, ctx.setLineDash, ctx.stroke, vals.forEach, xs.forEach |
| [`drawStackedAreas`](../../../../../src-ts/runtime-executables/www/history.ts#L917) | – | Number.isFinite, all.forEach, negKeys.forEach, posKeys.concat, posKeys.forEach |
| [`drawArea`](../../../../../src-ts/runtime-executables/www/history.ts#L957) | k | Math.abs, ctx.beginPath, ctx.closePath, ctx.fill, ctx.lineTo, ctx.moveTo, ctx.restore, ctx.save, ctx.stroke, hexToRgba, x, yPow |
| [`fmtKWAxis`](../../../../../src-ts/runtime-executables/www/history.ts#L1039) | v | Math.abs, Number, Number.isFinite, n.toLocaleString |
| [`bucketizeRange`](../../../../../src-ts/runtime-executables/www/history.ts#L1100) | fromMs, toMs, mode | buckets.filter, cur.getFullYear, cur.getMonth, cur.getTime, cur.setHours, e.getDate, e.setDate, pushBucket, start.getFullYear, start.getMonth |
| [`pushBucket`](../../../../../src-ts/runtime-executables/www/history.ts#L1110) | s, e | buckets.push |
| [`aggregateEnergyKWh`](../../../../../src-ts/runtime-executables/www/history.ts#L1146) | vals, buckets | Math.abs, Math.min, buckets.map |
| [`toTsMs`](../../../../../src-ts/runtime-executables/www/history.ts#L1179) | t | Date.parse, Number, Number.isFinite, Number.isNaN, t.getTime, t.trim |
| [`sumEnergyKWh`](../../../../../src-ts/runtime-executables/www/history.ts#L1205) | vals | Array.isArray, Math.abs |
| [`pickEnergyKwh`](../../../../../src-ts/runtime-executables/www/history.ts#L1231) | counterVal, integratedVal | Math.max, Number, Number.isFinite |
| [`formatMoney2`](../../../../../src-ts/runtime-executables/www/history.ts#L1248) | v | Number, Number.isFinite |
| [`formatPrice2`](../../../../../src-ts/runtime-executables/www/history.ts#L1255) | v | Number, Number.isFinite |
| [`formatKwh2`](../../../../../src-ts/runtime-executables/www/history.ts#L1262) | v | Number, Number.isFinite |
| [`normalizeNumericSeries`](../../../../../src-ts/runtime-executables/www/history.ts#L1269) | vals | Array.isArray, out.push |
| [`valueAtHold`](../../../../../src-ts/runtime-executables/www/history.ts#L1287) | points, ts | Array.isArray, Math.floor, Number, Number.isFinite |
| [`buildPricingIntervals`](../../../../../src-ts/runtime-executables/www/history.ts#L1303) | res | Array.from, Number, Number.isFinite, aggregateEnergyKWh, buckets.map, buckets.push, normalizeNumericSeries |
| [`aggregatePricingIntervals`](../../../../../src-ts/runtime-executables/www/history.ts#L1368) | intervals, fromMs, toMs, mode | Array.isArray, bucketizeRange, buckets.map, src.map |
| [`summarizePricingIntervals`](../../../../../src-ts/runtime-executables/www/history.ts#L1411) | intervals | Array.isArray, Math.max, Math.min, prices.reduce, src.map, src.reduce |
| [`renderPricingCards`](../../../../../src-ts/runtime-executables/www/history.ts#L1445) | summary | card, document.getElementById, formatKwh2, formatMoney2, formatPrice2 |
| [`card`](../../../../../src-ts/runtime-executables/www/history.ts#L1455) | title, val | cards.appendChild, document.createElement |
| [`buildPricingNote`](../../../../../src-ts/runtime-executables/www/history.ts#L1475) | pricing, intervals | Array.isArray, parts.join, parts.push |
| [`syncPricingLegend`](../../../../../src-ts/runtime-executables/www/history.ts#L1491) | – | Array.from, applyPriceLegendState, document.querySelectorAll |
| [`renderPricingHistory`](../../../../../src-ts/runtime-executables/www/history.ts#L1501) | res | Number, aggregatePricingIntervals, buildPricingIntervals, buildPricingNote, document.getElementById, drawPricingHistoryChart, renderPricingCards, resize, section.classList.add, section.classList.remove, summarizePricingIntervals, syncPricingLegend, window.__nxHistoryHidePriceTip |
| [`drawPricingHistoryChart`](../../../../../src-ts/runtime-executables/www/history.ts#L1556) | – | Array.isArray, Math.max, Math.min, Number, document.getElementById, drawLine, fmt, isPriceSeriesVisible, leftVals.push, points.forEach, points.map, priceCtx.beginPath, priceCtx.clearRect, priceCtx.fillRect (weitere in der Quelle) |
| [`x`](../../../../../src-ts/runtime-executables/www/history.ts#L1624) | ts | Math.max, Math.min |
| [`yLeft`](../../../../../src-ts/runtime-executables/www/history.ts#L1634) | val | Math.max, Number |
| [`yRight`](../../../../../src-ts/runtime-executables/www/history.ts#L1641) | val | Math.max, Number |
| [`drawLine`](../../../../../src-ts/runtime-executables/www/history.ts#L1719) | key, accessor, color, dash | Array.isArray, isPriceSeriesVisible, points.forEach, points.map, priceCtx.beginPath, priceCtx.restore, priceCtx.save, priceCtx.setLineDash, priceCtx.stroke |
| [`initPricingTooltip`](../../../../../src-ts/runtime-executables/www/history.ts#L1764) | – | document.addEventListener, document.body.appendChild, document.createElement, priceCanvas.addEventListener, tip.setAttribute, window.addEventListener |
| [`hidePriceTip`](../../../../../src-ts/runtime-executables/www/history.ts#L1792) | silent | drawPricingHistoryChart |
| [`formatHeader`](../../../../../src-ts/runtime-executables/www/history.ts#L1806) | ts | d.toLocaleDateString, d.toLocaleTimeString |
| [`row`](../../../../../src-ts/runtime-executables/www/history.ts#L1818) | label, val | – |
| [`showPriceTipFromEvent`](../../../../../src-ts/runtime-executables/www/history.ts#L1827) | ev | Array.isArray, Math.abs, Math.max, canvasPointFromEvent, drawPricingHistoryChart, formatHeader, formatKwh2, formatMoney2, formatPrice2, hidePriceTip, isPriceSeriesVisible, row, rows.join, rows.push (weitere in der Quelle) |
| [`load`](../../../../../src-ts/runtime-executables/www/history.ts#L1913) | force | Date.now, document.getElementById, from.getTime, reqPromise.finally, scheduleHistoryRenderBurst, to.getTime |
| [`clipArr`](../../../../../src-ts/runtime-executables/www/history.ts#L1994) | arr | Array.isArray, arr.filter |
| [`scan`](../../../../../src-ts/runtime-executables/www/history.ts#L2048) | arr | Array.isArray, Number.isFinite, toTsMs |
| [`exactNum`](../../../../../src-ts/runtime-executables/www/history.ts#L2105) | key | Number, Number.isFinite |
| [`card`](../../../../../src-ts/runtime-executables/www/history.ts#L2116) | title, val | cards.appendChild, document.createElement |
| [`toLocal`](../../../../../src-ts/runtime-executables/www/history.ts#L2189) | dt | d.toISOString, dt.getTime, dt.getTimezoneOffset |
| [`pad2`](../../../../../src-ts/runtime-executables/www/history.ts#L2200) | n | String |
| [`toDateInput`](../../../../../src-ts/runtime-executables/www/history.ts#L2207) | dt | d.getDate, d.getFullYear, d.getMonth, pad2 |
| [`fromDateInput`](../../../../../src-ts/runtime-executables/www/history.ts#L2217) | str | Number, Number.isFinite, String, d.getTime |
| [`getAnchorDate`](../../../../../src-ts/runtime-executables/www/history.ts#L2234) | – | document.getElementById, fromDateInput |
| [`setAnchorDate`](../../../../../src-ts/runtime-executables/www/history.ts#L2245) | d | document.getElementById, toDateInput |
| [`applyRangeForMode`](../../../../../src-ts/runtime-executables/www/history.ts#L2256) | mode | anchor.getFullYear, anchor.getMonth, document.getElementById, endDay.setHours, from.getDate, from.setDate, from.setHours, getAnchorDate, to.getDate, to.setDate, toLocal |
| [`apply`](../../../../../src-ts/runtime-executables/www/history.ts#L2323) | – | stackBtn.classList.toggle |
| [`setActive`](../../../../../src-ts/runtime-executables/www/history.ts#L2381) | mode | __stopAuto, applyRangeForMode, btns.forEach, load, window.__nxHistoryShowZoomReset |
| [`hideTip`](../../../../../src-ts/runtime-executables/www/history.ts#L2434) | silent | draw |
| [`xToTs`](../../../../../src-ts/runtime-executables/www/history.ts#L2448) | x, start, end, L, R, W | Math.max, Math.min |
| [`tsToX`](../../../../../src-ts/runtime-executables/www/history.ts#L2458) | ts, start, end, L, R, W | – |
| [`showTipFromEvent`](../../../../../src-ts/runtime-executables/www/history.ts#L2468) | ev | Array.isArray, Math.abs, Math.floor, Math.max, Math.min, Number, Number.isFinite, Object.entries, buildSeriesAll, canvasPointFromEvent, d.toLocaleDateString, draw, dt.toLocaleTimeString, extraLines.forEach (weitere in der Quelle) |
| [`kv`](../../../../../src-ts/runtime-executables/www/history.ts#L2516) | label, val, unit | Number |
| [`kv2`](../../../../../src-ts/runtime-executables/www/history.ts#L2576) | label, val, unit | Number |
| [`showReset`](../../../../../src-ts/runtime-executables/www/history.ts#L2721) | – | resetBtn.classList.toggle |
| [`addMonths`](../../../../../src-ts/runtime-executables/www/history.ts#L2732) | date, delta | Math.min, d.getDate, d.getFullYear, d.getMonth, d.setDate, d.setMonth |
| [`shiftRange`](../../../../../src-ts/runtime-executables/www/history.ts#L2747) | dir | __stopAuto, addMonths, anchor.getTime, applyRangeForMode, getAnchorDate, isFinite, load, next.getDate, next.getFullYear, next.getTime, next.setDate, next.setFullYear, setAnchorDate, today.getTime (weitere in der Quelle) |
| [`xToTs`](../../../../../src-ts/runtime-executables/www/history.ts#L2803) | x, start, end | Math.max, Math.min, getChartMargins |
| [`setInputs`](../../../../../src-ts/runtime-executables/www/history.ts#L2815) | fromMs, toMs | document.getElementById, toLocal |
| [`clearSel`](../../../../../src-ts/runtime-executables/www/history.ts#L2828) | redraw | draw |
| [`scheduleHistoryTouchDraw`](../../../../../src-ts/runtime-executables/www/history.ts#L2860) | – | window.requestAnimationFrame, window.setTimeout |
| [`run`](../../../../../src-ts/runtime-executables/www/history.ts#L2862) | – | draw |
| [`__toLocal`](../../../../../src-ts/runtime-executables/www/history.ts#L3134) | dt | d.toISOString, dt.getTime, dt.getTimezoneOffset |
| [`__setToNow`](../../../../../src-ts/runtime-executables/www/history.ts#L3141) | – | __toLocal, document.getElementById |
| [`__startAuto`](../../../../../src-ts/runtime-executables/www/history.ts#L3148) | – | __setToNow, __stopAuto, setInterval |
| [`__stopAuto`](../../../../../src-ts/runtime-executables/www/history.ts#L3155) | – | clearInterval |
| [`isNearNow`](../../../../../src-ts/runtime-executables/www/history.ts#L3164) | – | Date.now, Math.abs, isFinite |
| [`connect`](../../../../../src-ts/runtime-executables/www/history.ts#L3181) | – | dot.classList.remove, setTimeout |
| [`close`](../../../../../src-ts/runtime-executables/www/history.ts#L3215) | – | menu.classList.add |
| [`toggle`](../../../../../src-ts/runtime-executables/www/history.ts#L3222) | – | menu.classList.toggle |
