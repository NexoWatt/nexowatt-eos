# src-ts/runtime-executables/www/cockpit-shell.ts

Steuert gemeinsame Rahmen- und Navigationselemente des Kunden-Cockpits.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/cockpit-shell.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

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
| [`nwNormalizeBrandHeader`](../../../../../src-ts/runtime-executables/www/cockpit-shell.ts#L61) | – | Array.prototype.slice.call, document.querySelectorAll, document.title.replace, pwaTitles.forEach, titles.forEach |
| [`nwEnsureEnergyLedgerNavigation`](../../../../../src-ts/runtime-executables/www/cockpit-shell.ts#L83) | topbar | Array.prototype.find.call, document.createElement, document.getElementById, dropdown.appendChild, dropdown.insertBefore, dropdown.querySelectorAll, tab.addEventListener, tab.setAttribute, tabs.appendChild, tabs.insertBefore, tabs.querySelector, tabs.querySelectorAll, topbar.querySelector |
