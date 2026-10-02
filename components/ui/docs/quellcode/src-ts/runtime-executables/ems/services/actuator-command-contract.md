# src-ts/runtime-executables/ems/services/actuator-command-contract.ts

Beschreibt und normalisiert gemeinsame Eigenschaften von Aktor-Befehlen und deren Bestätigungszustand.

**Daten und Wirkung:** Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.

**Bei Änderungen:** Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts) · [Gesamtübersicht](../../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/modules/heating-rod-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/heating-rod-control.ts)
- [src-ts/runtime-executables/ems/modules/multi-use.ts](../../../../../../src-ts/runtime-executables/ems/modules/multi-use.ts)
- [src-ts/runtime-executables/ems/modules/peak-shaving.ts](../../../../../../src-ts/runtime-executables/ems/modules/peak-shaving.ts)
- [src-ts/runtime-executables/ems/modules/prime-mover-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/prime-mover-control.ts)
- [src-ts/runtime-executables/ems/modules/thermal-control.ts](../../../../../../src-ts/runtime-executables/ems/modules/thermal-control.ts)
- [src-ts/runtime-executables/ems/services/nexologic-output-controller.ts](../../../../../../src-ts/runtime-executables/ems/services/nexologic-output-controller.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`num`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L64) | value, fallback, min, max | Math.max, Math.min, Number, Number.isFinite |
| [`stable`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L70) | value, depth | Array.isArray, Math.round, Number.isFinite, Object.keys, String, value.map |
| [`normalized`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L85) | cfg | Math.round, num |
| [`ActuatorCommandContract.prepare`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L98) | keyRaw, requested, nowRaw, cfgRaw | Date.now, Number, Number.isFinite, String, stable, this.states.get, this.states.set |
| [`ActuatorCommandContract.complete`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L132) | keyRaw, requested, acceptedRaw, readbackOk, actual, nowRaw, cfgRaw | Date.now, Number, Number.isFinite, String, normalized, stable, this.prepare, this.result, this.states.get |
| [`ActuatorCommandContract.defer`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L172) | keyRaw, requested, nowRaw, delayMsRaw, statusRaw | Date.now, Math.max, Math.min, Number, Number.isFinite, String, stable, this.prepare, this.result, this.states.get |
| [`ActuatorCommandContract.confirmFromReadback`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L191) | keyRaw, requested, actual, matches, nowRaw | Date.now, Number, Number.isFinite, String, stable, this.result, this.states.get |
| [`ActuatorCommandContract.result`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L208) | keyRaw, nowRaw, targetChanged | Date.now, Number, Number.isFinite, String, this.states.get |
| [`ActuatorCommandContract.release`](../../../../../../src-ts/runtime-executables/ems/services/actuator-command-contract.ts#L232) | keyRaw | String, this.states.delete |
