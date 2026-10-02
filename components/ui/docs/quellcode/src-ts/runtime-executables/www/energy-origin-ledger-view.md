# src-ts/runtime-executables/www/energy-origin-ledger-view.ts

Stellt die Herkunftsbilanz und ihre Ledger-Einträge im Browser dar.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`$`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L19) | id | document.getElementById |
| [`locale`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L21) | – | String |
| [`fmtKwh`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L25) | v, digits | Number, Number.isFinite, locale |
| [`fmtPct`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L26) | v | Number, Number.isFinite, locale |
| [`fmtTs`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L27) | v | Number, Number.isFinite, String, locale |
| [`esc`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L32) | v | String |
| [`setText`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L33) | id, value | $ |
| [`redirectToLive`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L34) | – | window.location.replace |
| [`ensureFeatureAccess`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L37) | – | Date.now, document.body.classList.add, fetch, redirectToLive, res.json |
| [`get`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L51) | obj, path, fallback | – |
| [`unknownFor`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L56) | row | Math.max, Number, get |
| [`renderMeterStatus`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L62) | payload | $, Array.isArray, esc, rows.filter, rows.map, setText |
| [`renderInventory`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L70) | payload | $, fmtKwh |
| [`renderLast`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L75) | payload | $, esc, fmtKwh, fmtTs, get, setText |
| [`renderEvidence`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L81) | payload | $, esc, fmtKwh, get, reason |
| [`reason`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L85) | x | Array.isArray, x.reasonCodes.join |
| [`renderRows`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L89) | rows | $, Array.isArray, list.slice |
| [`render`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L100) | payload | $, Math.max, Math.min, Number, encodeURIComponent, fmtKwh, fmtPct, renderEvidence, renderInventory, renderLast, renderMeterStatus, renderRows, setText |
| [`load`](../../../../../src-ts/runtime-executables/www/energy-origin-ledger-view.ts#L120) | – | $, Date.now, String, encodeURIComponent, esc, fetch, redirectToLive, render, res.json, setText |
