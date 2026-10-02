# NexoWatt UI 0.8.56 – 0-Einspeise Senken-ACK-Verlauf

## Zweck

Diese Version ergänzt für den schnellen 0-Einspeise-Aktivbetrieb einen ACK-/Status-Verlauf je Senke.

Wichtig: Es wird weiterhin **kein Schreibtest pro Regel-Tick** gemacht. Der Schreibtest bleibt Inbetriebnahme-/Fehlerdiagnose. Im laufenden Betrieb wird nur der vorhandene ACK-/Status-State der jeweiligen Senke nachgelagert gelesen.

## 0-Einspeise-Reihenfolge

```text
1. Verbrauch zuerst
2. Speicher laden
3. Ladepunkte / Ladestationen
4. flexible Verbraucher
5. Mesh/Microgrid
6. WR-/PV-Abregelung zuletzt
```

## Neue/erweiterte Diagnose

```text
gridConstraints.exportLimit.sinkAckSummaryJson
gridConstraints.exportLimit.sinkAckHistoryJson
gridConstraints.exportLimit.sinkAckFieldProtocolJson
```

Je Senke:

```text
gridConstraints.exportLimit.sinks.storage.ackHistoryJson
gridConstraints.exportLimit.sinks.charging.ackHistoryJson
gridConstraints.exportLimit.sinks.flexLoads.ackHistoryJson
gridConstraints.exportLimit.sinks.mesh.ackHistoryJson
gridConstraints.exportLimit.sinks.inverter.ackHistoryJson
```

## Verhalten im Aktivbetrieb

```text
Command schreiben
→ ACK danach beobachten
→ bei OK Senke freigeben
→ bei pending warten
→ bei error/timeout nur diese Senke blockieren
→ nächste Senke nutzen
→ WR-Abregelung zuletzt
```

## Wichtig

Diese Funktion baut keine zweite 0-Einspeise-Regelung und keinen zweiten Export Guard. Sie erweitert nur die vorhandene Grid-Constraints-/Export-Guard-Diagnose und den schnellen Senkenpfad.
