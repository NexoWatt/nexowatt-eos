# src-ts/runtime-executables/lib/mesh-coordinator-writer.ts

Prüft die aktuelle Mesh-Freigabe direkt vor numerischen PV-/Speicher-Schreibzugriffen.

**Daten und Wirkung:** Verarbeitet physische W bzw. Prozent vor der DP-Skalierung. Nur zusätzliche Absenkung, niemals Aufhebung lokaler Netz-/Gerätegrenzen.

**Bei Änderungen:** Gruppenleistung, Nullgrenzen, Rundung und abgelaufene Freigaben prüfen. Nicht unterstützte Geräteschnittstellen bleiben für aktive Mesh-Regelung gesperrt.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-writer.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

- [src-ts/runtime-executables/ems/datapoints.ts](../../../../../src-ts/runtime-executables/ems/datapoints.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`clampMeshWrite`](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-writer.ts#L11) | adapter, registry, key, value | Math.floor, Math.max, Math.min, Number, Number.isFinite, groups.reduce, key.endsWith, registry.getNumber, service.sample, service?.currentLimits |
