# NexoWatt UI 0.8.55 – 0-Einspeise Senken-Freigabe & schneller Aktivbetrieb

## Zweck

Version 0.8.55 sorgt dafür, dass die 0-Einspeise-Regelung im Aktivbetrieb schnell bleibt.

Wichtig: Es wird nicht vor jedem Regel-Tick ein Schreibtest ausgeführt. Schreibtests gehören zur Inbetriebnahme, nach Mapping-Änderungen, nach Fehlern oder zu manuellen/zyklischen Gesundheitschecks.

## Regel im Betrieb

```text
Schreibtest = Freigabe / Inbetriebnahme / Fehlerdiagnose
Regelbetrieb = schneller Pfad über gespeicherte Freigaben und ACKs
```

## 0-Einspeise-Reihenfolge

```text
1. Verbrauch zuerst
2. Speicher laden
3. Ladepunkte / Ladestationen
4. flexible Verbraucher
5. Mesh/Microgrid
6. WR-/PV-Abregelung zuletzt
```

## Fast-Path

Der Export Guard nutzt im Aktivbetrieb gespeicherte Informationen:

```text
usable
lastAck
blockedUntil
lastWriteTest
lastReason
```

Wenn eine Senke ACK OK meldet, bleibt sie verwendbar.
Wenn eine Senke Fehler, Timeout oder Pending meldet, wird nur diese Senke temporär blockiert.

## Neue States

```text
gridConstraints.exportLimit.fastPathReady
gridConstraints.exportLimit.sinkAvailabilityJson
gridConstraints.exportLimit.activeSinkJson
gridConstraints.exportLimit.fallbackReason
gridConstraints.exportLimit.sinkAckSummaryJson

gridConstraints.exportLimit.sinks.storage.usable
gridConstraints.exportLimit.sinks.storage.lastAck
gridConstraints.exportLimit.sinks.storage.lastWriteTest
gridConstraints.exportLimit.sinks.storage.blockedUntil
gridConstraints.exportLimit.sinks.storage.lastReason

gridConstraints.exportLimit.sinks.charging.*
gridConstraints.exportLimit.sinks.flexLoads.*
gridConstraints.exportLimit.sinks.mesh.*
gridConstraints.exportLimit.sinks.inverter.*
```

## ACK-Konfiguration

Optional je Senke:

```text
zeroExportStorageAckStateId
zeroExportChargingAckStateId
zeroExportFlexLoadAckStateId
zeroExportMeshAckStateId
zeroExportInverterAckStateId
```

Optional global:

```text
zeroExportSinkAckRequired = true/false
zeroExportSinkAckTimeoutSec = 60
zeroExportSinkBlockSec = 120
```

## Wichtig

Diese Version baut keine zweite 0-Einspeise-Regelung.

```text
bestehender Export Guard
+ Senken-Freigabe
+ ACK-/Blockierstatus
+ schneller Aktivbetrieb
```

WR-/PV-Abregelung bleibt die letzte Stufe.
