# src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts

Zeigt NVP-bezogene Messwerte, Netzgrenzen und Regelungsdiagnosen im App-Center an.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`finiteNumber`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L29) | value | Number, Number.isFinite |
| [`fmtW`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L35) | value | Math.abs, Math.round, finiteNumber |
| [`fmtTs`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L42) | value | Number.isFinite, date.getTime, date.toLocaleString, finiteNumber |
| [`fmtAge`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L53) | value | Math.max, Math.round, finiteNumber |
| [`fmtBool`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L60) | value | – |
| [`text`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L62) | value, fallback | String |
| [`makeCard`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L67) | titleText, rows, kind | body.appendChild, card.appendChild, document.createElement, header.appendChild, row.appendChild |
| [`renderNvpCoordinator`](../../../../../src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.ts#L108) | payload | Array.isArray, String, document.createElement, document.getElementById, finiteNumber, fmtAge, fmtBool, fmtTs, fmtW, left.appendChild, logMount.appendChild, logMount.replaceChildren, makeCard, mount.appendChild (weitere in der Quelle) |
