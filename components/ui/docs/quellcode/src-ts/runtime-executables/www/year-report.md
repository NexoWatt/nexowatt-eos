# src-ts/runtime-executables/www/year-report.ts

Bereitet jahresbezogene Energie- und Anlagenwerte für die Berichtsseite auf.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/year-report.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`el`](../../../../../src-ts/runtime-executables/www/year-report.ts#L60) | id | document.getElementById |
| [`q`](../../../../../src-ts/runtime-executables/www/year-report.ts#L67) | name | u.searchParams.get |
| [`clampInt`](../../../../../src-ts/runtime-executables/www/year-report.ts#L81) | v, min, max, def | Math.max, Math.min, Math.trunc, Number, Number.isFinite |
| [`toIsoDate`](../../../../../src-ts/runtime-executables/www/year-report.ts#L93) | ms | String, d.getDate, d.getFullYear, d.getMonth |
| [`fmtKwh`](../../../../../src-ts/runtime-executables/www/year-report.ts#L106) | n | Number, Number.isFinite, x.toFixed |
| [`fmtPct`](../../../../../src-ts/runtime-executables/www/year-report.ts#L117) | n | Number, Number.isFinite, x.toFixed |
| [`isFiniteNum`](../../../../../src-ts/runtime-executables/www/year-report.ts#L128) | n | Number, Number.isFinite |
| [`pickEnergyKwh`](../../../../../src-ts/runtime-executables/www/year-report.ts#L137) | counterVal, integratedVal | Math.max, Number, Number.isFinite |
| [`toTsMs`](../../../../../src-ts/runtime-executables/www/year-report.ts#L160) | t | Date.parse, Number, Number.isFinite, Number.isNaN, t.getTime, t.trim |
| [`sumEnergyKWh`](../../../../../src-ts/runtime-executables/www/year-report.ts#L184) | vals | Array.isArray, Math.abs |
| [`setError`](../../../../../src-ts/runtime-executables/www/year-report.ts#L220) | msg | el, err.classList.add, err.classList.remove |
| [`setHint`](../../../../../src-ts/runtime-executables/www/year-report.ts#L237) | html | el |
| [`setMeta`](../../../../../src-ts/runtime-executables/www/year-report.ts#L248) | text | el |
| [`setTableLoading`](../../../../../src-ts/runtime-executables/www/year-report.ts#L258) | – | el |
| [`getYearsFromQuery`](../../../../../src-ts/runtime-executables/www/year-report.ts#L270) | – | clampInt, now.getFullYear, q, years.push |
| [`fetchYear`](../../../../../src-ts/runtime-executables/www/year-report.ts#L284) | year | Date.now, Math.min, encodeURIComponent, fetch |
| [`computeYearTotals`](../../../../../src-ts/runtime-executables/www/year-report.ts#L305) | item | Array.isArray, Math.max, Number, Number.isFinite, pickEnergyKwh, producers.reduce, sumEnergyKWh |
| [`collectDefs`](../../../../../src-ts/runtime-executables/www/year-report.ts#L401) | years, byYear, kind | Array.from, map.entries, years.forEach |
| [`getYearVal`](../../../../../src-ts/runtime-executables/www/year-report.ts#L424) | yearObj, key | Number, Number.isFinite |
| [`renderTable`](../../../../../src-ts/runtime-executables/www/year-report.ts#L434) | rows, years, byYear, { unit = 'kWh', decimals = 1 } | String, el, rows.forEach, years.forEach |
| [`fmt`](../../../../../src-ts/runtime-executables/www/year-report.ts#L462) | n | Number, Number.isFinite, x.toFixed |
| [`renderGroupedTable`](../../../../../src-ts/runtime-executables/www/year-report.ts#L493) | sections, years, byYear | Array.isArray, el, sections.forEach, years.forEach |
| [`esc`](../../../../../src-ts/runtime-executables/www/year-report.ts#L517) | s | String |
| [`renderActiveTab`](../../../../../src-ts/runtime-executables/www/year-report.ts#L564) | – | Math.max, Number.isFinite, Object.create, consumerRows.push, defsC.map, defsP.map, renderGroupedTable, renderTable, sections.forEach, setHint, years.map |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L596) | yr | Array.isArray, arr.find |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L606) | yr | Array.isArray, arr.find |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L614) | yr | getYearVal |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L629) | _yr, y | years.indexOf |
| [`setActiveTab`](../../../../../src-ts/runtime-executables/www/year-report.ts#L699) | tab | Array.from, btns.forEach, document.querySelectorAll, renderActiveTab |
| [`buildCsv`](../../../../../src-ts/runtime-executables/www/year-report.ts#L711) | – | addSection, cRows.push, lines.join, report.consumerDefs.map, report.producerDefs.map |
| [`addSection`](../../../../../src-ts/runtime-executables/www/year-report.ts#L723) | title, rows | lines.push, rows.forEach |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L751) | yr | Array.isArray, arr.find |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L763) | yr | Array.isArray, arr.find |
| [`get`](../../../../../src-ts/runtime-executables/www/year-report.ts#L770) | yr | getYearVal |
| [`downloadCsv`](../../../../../src-ts/runtime-executables/www/year-report.ts#L795) | – | URL.createObjectURL, a.click, a.remove, buildCsv, document.body.appendChild, document.createElement, setTimeout |
| [`load`](../../../../../src-ts/runtime-executables/www/year-report.ts#L814) | – | Promise.all, collectDefs, consumerDefs.some, el, getYearsFromQuery, now.getTime, ok.forEach, renderActiveTab, results.filter, setError, setMeta, setTableLoading, toIsoDate, years.forEach (weitere in der Quelle) |
| [`init`](../../../../../src-ts/runtime-executables/www/year-report.ts#L864) | – | Array.from, backBtn.addEventListener, document.querySelectorAll, el, exportBtn.addEventListener, getYearsFromQuery, infoBtn.addEventListener, load, now.getTime, printBtn.addEventListener, reloadBtn.addEventListener, setMeta, toIsoDate |
| [`setupTopbar`](../../../../../src-ts/runtime-executables/www/year-report.ts#L946) | – | document.addEventListener, document.getElementById, menuBtn.addEventListener, menuDropdown.addEventListener |
| [`close`](../../../../../src-ts/runtime-executables/www/year-report.ts#L967) | – | menuDropdown.classList.add |
| [`toggle`](../../../../../src-ts/runtime-executables/www/year-report.ts#L974) | – | menuDropdown.classList.toggle |
