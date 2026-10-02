# NexoWatt UI 0.8.41 – Mesh Peer-Handshake & Command-Receiver

## Ziel

Diese Version ergänzt die Mesh/Microgrid-App um eine echte Instanz-zu-Instanz-Grundlage für Feldtests über das getrennte Mesh-Tailscale-Netz.

Wichtig: Die Fernwartung bleibt getrennt vom Mesh/Microgrid-Tailscale.

```text
Tailscale 1 = Fernwartung / Support
Tailscale 2 = Mesh/Microgrid / Energieverbund
```

## Neue Endpunkte

```text
GET  /api/mesh/handshake
GET  /api/mesh/status
POST /api/mesh/command/receive
```

Der Receiver nimmt Remote-Kommandos nur an, wenn die EOS-Lizenz aktiv ist und der Installateur den Receiver im Reiter `Mesh/Microgrid` freigibt.

## Installer-Konfiguration

Im App-Center liegt die Konfiguration weiter im separaten Reiter:

```text
Mesh/Microgrid → Command Receiver / Peer-Handshake
```

Dort einstellen:

```text
Command Receiver aktiv = An
Remote Commands akzeptieren = Ja
Cluster-ID prüfen = Ja/Nein
Lokaler Empfangs-Command-State = z. B. 0_userdata.0.nexowatt.mesh.receivedCommand
Receiver Token optional = gemeinsames Peer-Token
Replay TTL Sekunden = z. B. 900
```

## Sicherheit

Remote-Kommandos werden nicht direkt auf Hardware geschrieben.

Ablauf:

```text
Peer A sendet neutralen Command-Envelope
→ Peer B prüft Token, Cluster-ID und Replay-Schutz
→ Peer B schreibt nur lokalen neutralen JSON-Command-State
→ lokale Bridge übersetzt später hersteller-/protokollspezifisch
```

Damit bleibt NexoWatt offen für OCPP, Modbus, MQTT, REST, Herstelleradapter und NexoWatt-Devices.

## API-Beispiel

```bash
curl -H "x-nexowatt-mesh-token: <TOKEN>" \
  http://100.x.y.z:8188/api/mesh/handshake
```

Command-Empfang:

```bash
curl -X POST \
  -H "content-type: application/json" \
  -H "x-nexowatt-mesh-token: <TOKEN>" \
  -d '{"schema":"nexowatt.mesh-field-command-envelope.v1","clusterId":"cluster_01","localNodeId":"haus_a","commands":[{"commandId":"cmd_1","category":"local_first","nodeId":"lp1","plannedPowerW":3000}]}' \
  http://100.x.y.z:8188/api/mesh/command/receive
```

## Neue States

```text
meshMicrogrid.receiver.enabled
meshMicrogrid.receiver.acceptRemoteCommands
meshMicrogrid.receiver.localCommandStateDp
meshMicrogrid.receiver.status
meshMicrogrid.receiver.lastReceiveAt
meshMicrogrid.receiver.lastCommandJson
meshMicrogrid.receiver.lastAckJson
meshMicrogrid.receiver.processedCommandIdsJson
meshMicrogrid.receiver.replayBlockedCount
meshMicrogrid.tailscale.lastCommandDispatchJson
```

## Wichtig

Die App-Seite `Apps` bleibt reiner App-Katalog. Alle Mesh/Microgrid-Details bleiben im Reiter `Mesh/Microgrid`.
