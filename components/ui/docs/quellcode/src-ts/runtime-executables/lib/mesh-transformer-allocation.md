# src-ts/runtime-executables/lib/mesh-transformer-allocation.ts

Verteilt Trafo-/Strangkapazität nach gemessener Hauslast und gewünschtem Spielraum.

**Daten und Wirkung:** Reine Planung in W/A; keine Netzwerk- oder Geräteschreibzugriffe.

**Bei Änderungen:** Gleichzeitige Lastsprünge, Einspeisung, Phasen, Rückfall und faire Umverteilung testen.

[Originalquelle](../../../../../src-ts/runtime-executables/lib/mesh-transformer-allocation.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| `./mesh-coordinator-contract` | [src-ts/runtime-executables/lib/mesh-coordinator-contract.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-contract.ts) |

**Direkt importiert von:**

- [src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts](../../../../../src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts)

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`waterfill`](../../../../../src-ts/runtime-executables/lib/mesh-transformer-allocation.ts#L14) | rows, key, capacity, desired | Math.max, Math.min, desired.get, out.get, out.set, out.values, rows.filter, rows.map, waiting.filter, waiting.reduce |
| [`transformerProposals`](../../../../../src-ts/runtime-executables/lib/mesh-transformer-allocation.ts#L31) | config, records, groups, sample, wasIntervening, now | Math.max, Math.min, NETWORK_KEYS.map, Number.isFinite, allocationRows.filter, capacityFor, desired.set, floors.get, floors.set, groups.filter, groups.slice, k.endsWith, peers.reduce, proposals.get (weitere in der Quelle) |
| [`capacityFor`](../../../../../src-ts/runtime-executables/lib/mesh-transformer-allocation.ts#L37) | group, k | Math.max, Math.min, k.endsWith, records.reduce |
