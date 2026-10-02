# NexoWatt UI 0.8.44 – Mesh/Microgrid Local Bridge Mapping

## Zweck

Version 0.8.44 verbindet die aktiven Mesh/Microgrid-Command-Intents mit lokalen Bridge-Command-States. Damit kann eine NexoWatt-Instanz im Feld gezielt je Knoten oder Zielgerät einen neutralen JSON-Befehl ausgeben.

Die Funktion bleibt hersteller- und protokolloffen:

- kein direkter OCPP-Write
- kein direkter Modbus-Write
- kein direkter MQTT-Write
- kein direkter Hersteller-Rohbefehl
- keine direkte Hardwaresteuerung aus dem Mesh/Microgrid-Modul

Die Umsetzung übernimmt eine lokale Bridge, ein Geräteadapter, ein Herstelleradapter oder eine zweite NexoWatt-Instanz im separaten Mesh-Tailscale.

## Konfiguration

Pfad im App-Center:

```text
Mesh/Microgrid → Lokale Bridge-Zuordnung
```

Dort können gesetzt werden:

```text
Lokale Bridge aktiv
Ausgabemodus: global / mapped / both
Default Bridge Command-State
Bridge-Zuordnungen JSON
```

Beispiel für eine Bridge-Zuordnung:

```json
[
  {
    "id": "lp1_bridge",
    "nodeId": "lp1",
    "commandStateDp": "0_userdata.0.nexowatt.mesh.lp1.command",
    "type": "chargepoint",
    "maxPowerW": 11000,
    "directions": ["increase_local_use", "defer_or_reduce_low_priority_load"]
  }
]
```

## Ausgabe

Bei freigegebenem Aktivmodus schreibt NexoWatt neutrale JSON-Envelopes in die konfigurierten Command-States.

Schema:

```text
nexowatt.mesh-local-bridge-envelope.v1
```

Diese Envelopes enthalten nur Intents, keine Hardwarebefehle.

## Diagnose

Neue States:

```text
meshMicrogrid.localBridge.enabled
meshMicrogrid.localBridge.outputMode
meshMicrogrid.localBridge.mappingCount
meshMicrogrid.localBridge.mappedCommandCount
meshMicrogrid.localBridge.unmappedCommandCount
meshMicrogrid.localBridge.routeReady
meshMicrogrid.localBridge.mappingsJson
meshMicrogrid.localBridge.mappedCommandsJson
meshMicrogrid.localBridge.unmappedCommandsJson
meshMicrogrid.localBridge.lastWriteStatus
meshMicrogrid.localBridge.lastWritesJson
meshMicrogrid.localBridge.summaryJson
```

## App-Center-Regel

Die Detailkonfiguration liegt ausschließlich im Reiter:

```text
Mesh/Microgrid
```

Der Reiter Apps bleibt nur App-Katalog.
