# src-ts/runtime-executables/www/energy-origin-appcenter.ts

Bindet die Einrichtung der Energieherkunfts-Bilanz an den App-Center-Bereich an.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`el`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L27) | key | document.getElementById |
| [`htmlEscape`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L28) | value | String |
| [`safeId`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L29) | value, fallback | String |
| [`maxChargePoints`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L30) | edition | String |
| [`setValue`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L31) | key, value | String, el |
| [`setChecked`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L32) | key, value | el |
| [`readValue`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L33) | key, fallback | String, el |
| [`readNumber`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L34) | key, fallback, min, max | Math.max, Math.min, Number, Number.isFinite, readValue |
| [`checked`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L39) | key | el |
| [`buildChargePoints`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L41) | rows, edition | Array.isArray, container.appendChild, document.createElement, el, list.forEach, maxChargePoints, rows.slice |
| [`collectChargePoints`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L82) | edition | Array.from, document.querySelectorAll, maxChargePoints, rows.slice |
| [`get`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L85) | name | row.querySelector |
| [`value`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L86) | name | String, get |
| [`isChecked`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L87) | name | get |
| [`apply`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L106) | config, edition | Array.isArray, Number, buildChargePoints, setChecked, setValue |
| [`collect`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L131) | existingOrigin, appEnabled, edition | Array.isArray, Math.round, Number, Number.isFinite, checked, collectChargePoints, readNumber, readValue, safeId |
| [`setup`](../../../../../src-ts/runtime-executables/www/energy-origin-appcenter.ts#L165) | options | add.addEventListener, el |
