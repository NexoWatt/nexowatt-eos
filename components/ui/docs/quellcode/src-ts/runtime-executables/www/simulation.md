# src-ts/runtime-executables/www/simulation.ts

Verbindet Simulations-Eingaben und Auswertung mit dem dafür vorgesehenen Backend-Bereich.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/simulation.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`$`](../../../../../src-ts/runtime-executables/www/simulation.ts#L66) | id | document.getElementById |
| [`sleep`](../../../../../src-ts/runtime-executables/www/simulation.ts#L101) | ms | – |
| [`esc`](../../../../../src-ts/runtime-executables/www/simulation.ts#L108) | s | String |
| [`setBusy`](../../../../../src-ts/runtime-executables/www/simulation.ts#L122) | busy | – |
| [`badge`](../../../../../src-ts/runtime-executables/www/simulation.ts#L141) | cls, text | esc |
| [`api`](../../../../../src-ts/runtime-executables/www/simulation.ts#L150) | path, opts | JSON.parse, JSON.stringify, fetch, res.text |
| [`renderInstances`](../../../../../src-ts/runtime-executables/www/simulation.ts#L177) | defaultId | _instances.some, document.createElement, elInstance.appendChild |
| [`renderStatus`](../../../../../src-ts/runtime-executables/www/simulation.ts#L203) | st | badge, d.toLocaleString, esc, msgLines.join, msgLines.push, parts.join, parts.push |
| [`currentInstanceId`](../../../../../src-ts/runtime-executables/www/simulation.ts#L231) | – | String |
| [`renderScenarioCatalog`](../../../../../src-ts/runtime-executables/www/simulation.ts#L243) | catalog, preferredSelectedId | Array.isArray, String, _scenarios.some, document.createElement, elScenSelect.appendChild, renderScenarioDesc |
| [`renderScenarioDesc`](../../../../../src-ts/runtime-executables/www/simulation.ts#L279) | – | String, esc, lines.join, lines.push |
| [`renderScenarioStatus`](../../../../../src-ts/runtime-executables/www/simulation.ts#L295) | st | Math.round, Number, badge, esc, extra.join, extra.push, parts.join, parts.push |
| [`refreshDiscover`](../../../../../src-ts/runtime-executables/www/simulation.ts#L323) | – | Array.isArray, api, renderInstances |
| [`refreshStatus`](../../../../../src-ts/runtime-executables/www/simulation.ts#L334) | – | api, renderStatus |
| [`refreshScenarios`](../../../../../src-ts/runtime-executables/www/simulation.ts#L345) | forceCatalog | Array.isArray, String, api, currentInstanceId, encodeURIComponent, renderScenarioCatalog, renderScenarioDesc, renderScenarioStatus |
| [`refreshAll`](../../../../../src-ts/runtime-executables/www/simulation.ts#L377) | – | refreshDiscover, refreshScenarios, refreshStatus, setBusy |
| [`enable`](../../../../../src-ts/runtime-executables/www/simulation.ts#L393) | – | api, refreshScenarios, refreshStatus, setBusy, sleep |
| [`disable`](../../../../../src-ts/runtime-executables/www/simulation.ts#L411) | – | api, refreshScenarios, refreshStatus, setBusy, sleep |
| [`startScenario`](../../../../../src-ts/runtime-executables/www/simulation.ts#L428) | – | String, api, currentInstanceId, refreshScenarios, sleep |
| [`stopScenario`](../../../../../src-ts/runtime-executables/www/simulation.ts#L444) | – | api, currentInstanceId, refreshScenarios, sleep |
| [`resetScenario`](../../../../../src-ts/runtime-executables/www/simulation.ts#L458) | – | api, currentInstanceId, refreshScenarios, sleep |
