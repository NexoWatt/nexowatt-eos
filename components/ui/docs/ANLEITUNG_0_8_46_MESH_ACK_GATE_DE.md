# NexoWatt UI 0.8.46 – Mesh/Microgrid Bridge-ACK-Gate

## Ziel

Diese Version ergänzt die Feldtest-Sicherheit der Mesh/Microgrid-App. Wenn eine lokale Bridge nach einem neutralen Mesh-Command kein gültiges ACK liefert, kann NexoWatt weitere Commands zu genau diesem Ziel blockieren.

## Ort im Installer

```text
App-Center → Mesh/Microgrid → Lokale Bridge-Zuordnung
```

Neue Einstellung:

```text
ACK als Gate erforderlich
```

- Aus: ACK wird nur angezeigt.
- An: offene, fehlerhafte, veraltete oder fehlende ACKs blockieren Folge-Commands zu diesem Ziel.

## Wichtig

Mesh/Microgrid schreibt weiterhin keine OCPP-, Modbus-, MQTT-, REST- oder Hersteller-Rohbefehle direkt. Die App schreibt nur neutrale JSON-Intents in vom Installateur konfigurierte Command-States.

## Neue States

```text
meshMicrogrid.localBridge.ackRequired
meshMicrogrid.localBridge.ackGateStatus
meshMicrogrid.localBridge.ackGateBlockedCommandCount
meshMicrogrid.localBridge.ackBlockedTargetsJson
meshMicrogrid.localBridge.targetHealthJson
```

## Feldtest

1. ACK-Auswertung aktivieren.
2. ACK als Gate zunächst auf Aus lassen und Rückmeldungen prüfen.
3. Wenn Bridge-ACK zuverlässig kommt, ACK als Gate aktivieren.
4. Bei Timeout/Fehler wird nur dieses Ziel blockiert. Andere Ziele können weiterlaufen.
