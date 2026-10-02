# NexoWatt UI 0.8.56 – 0-Einspeise Senken-ACK Verlauf

## Zweck

Version 0.8.56 ergänzt die 0-Einspeise-Fast-Path-Logik um einen ACK-/Statusverlauf je Senke.

Wichtig: Es wird weiterhin **kein Schreibtest pro Regel-Tick** gemacht. Die Regelung bleibt schnell.

## Ablauf

```text
Command wird geschrieben
→ Senke meldet ACK / Status
→ NexoWatt liest ACK nachgelagert
→ ok: Senke bleibt/fällt wieder frei
→ Fehler/Timeout: nur diese Senke wird temporär blockiert
→ nächste Senke oder WR-Abregelung als Fallback
```

## Senken-Reihenfolge

```text
1. Verbrauch zuerst
2. Speicher laden
3. Ladepunkte / Ladestationen
4. flexible Verbraucher
5. Mesh/Microgrid
6. WR-/PV-Abregelung zuletzt
```

## Neue Diagnose

```text
gridConstraints.exportLimit.sinkAckHistoryJson
gridConstraints.exportLimit.sinkAckSummaryJson
gridConstraints.exportLimit.sinkAckLastEventJson
```

Je Senke zusätzlich:

```text
gridConstraints.exportLimit.sinks.<sink>.lastAckAt
gridConstraints.exportLimit.sinks.<sink>.ackOkCount
gridConstraints.exportLimit.sinks.<sink>.ackErrorCount
gridConstraints.exportLimit.sinks.<sink>.ackTimeoutCount
gridConstraints.exportLimit.sinks.<sink>.ackHistoryJson
```

## Konfiguration

Optional nutzbare ACK-States:

```text
zeroExportStorageAckStateId
zeroExportChargingAckStateId
zeroExportFlexLoadAckStateId
zeroExportMeshAckStateId
zeroExportInverterAckStateId
```

Globale Einstellungen:

```text
zeroExportSinkAckRequired
zeroExportSinkAckTimeoutSec
zeroExportSinkBlockSec
```

## Wichtig

ACK-Verlauf ist nur Diagnose und Freigabezustand. Er ersetzt nicht die bestehende Export-Guard-Regelung und erzeugt keine zweite 0-Einspeise-Logik.
