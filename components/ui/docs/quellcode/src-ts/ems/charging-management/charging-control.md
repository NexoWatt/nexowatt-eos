# src-ts/ems/charging-management/charging-control.ts

Berechnet den für einen Ladepunkt geltenden Modus- und Bedarfsrahmen vor der Verteilung des Ladebudgets.

**Daten und Wirkung:** Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/ems/charging-management/charging-control.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/ems/charging-management/index.ts](../../../../../src-ts/ems/charging-management/index.ts)
- [src-ts/runtime-executables/ems/modules/charging-management.ts](../../../../../src-ts/runtime-executables/ems/modules/charging-management.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`toNumber`](../../../../../src-ts/ems/charging-management/charging-control.ts#L118) | value, fallback | Number, Number.isFinite |
| [`nonNegative`](../../../../../src-ts/ems/charging-management/charging-control.ts#L124) | value | Math.round, toNumber |
| [`toBool`](../../../../../src-ts/ems/charging-management/charging-control.ts#L130) | value | Number.isFinite, String |
| [`buildChargingControlShadowPlan`](../../../../../src-ts/ems/charging-management/charging-control.ts#L146) | input | Math.max, Math.round, String, blockers.push, nonNegative, toBool, toNumber, warnings.push |
| [`compareChargingControlShadowPlan`](../../../../../src-ts/ems/charging-management/charging-control.ts#L220) | input, plan | String, nonNegative |
| [`buildChargingControlProductiveApply`](../../../../../src-ts/ems/charging-management/charging-control.ts#L300) | plan | – |
| [`buildChargingControlProductivePrep`](../../../../../src-ts/ems/charging-management/charging-control.ts#L351) | input, plan, comparison | Array.isArray, blockers.push, buildChargingControlProductiveApply, buildChargingControlShadowPlan, compareChargingControlShadowPlan |
| [`buildChargingControlProductive`](../../../../../src-ts/ems/charging-management/charging-control.ts#L424) | input, plan, comparison | Array.isArray, blockers.push, buildChargingControlProductiveApply, buildChargingControlShadowPlan, compareChargingControlShadowPlan |
