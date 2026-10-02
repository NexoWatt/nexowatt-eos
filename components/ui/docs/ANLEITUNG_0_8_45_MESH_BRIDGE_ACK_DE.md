# NexoWatt UI 0.8.45 – Mesh/Microgrid Bridge ACK & Zielstatus

Diese Version ergänzt Rückmeldungen für lokale Mesh/Microgrid-Bridges. Die Mesh/Microgrid-App schreibt weiterhin nur neutrale JSON-Command-States. Die lokale Bridge oder Herstellerintegration kann optional ACK-/Status-States pflegen.

## Einrichtung

Im Installer/App-Center unter **Mesh/Microgrid → Lokale Bridge-Zuordnung** können je Mapping zusätzlich angegeben werden:

```json
{
  "id": "lp1_bridge",
  "nodeId": "lp1",
  "commandStateDp": "0_userdata.0.nexowatt.mesh.lp1.command",
  "ackStateDp": "0_userdata.0.nexowatt.mesh.lp1.ack",
  "statusStateDp": "0_userdata.0.nexowatt.mesh.lp1.status",
  "ackTimeoutSec": 120
}
```

## Rückmeldeformat

Die lokale Bridge kann Text oder JSON schreiben, zum Beispiel:

```json
{
  "status": "accepted",
  "commandId": "mesh_cmd_1",
  "message": "Command angenommen"
}
```

Unterstützte Statuswerte sind unter anderem `accepted`, `executed`, `ok`, `queued`, `blocked`, `error`, `failed` und `timeout`.

## Betreiberansicht

Die Ansicht `/mesh/microgrid` zeigt jetzt:

- Bridge-ACK-Gesamtstatus
- Zielstatus je Mapping
- offene/fehlende ACKs
- Timeout-/Fehlerzustände
- letzte Bridge-Writes

## Sicherheitsgrenze

Die Mesh/Microgrid-App bleibt hersteller- und protokolloffen. Sie schreibt keine OCPP-, Modbus-, MQTT-, REST- oder Hersteller-Rohbefehle. Sie schreibt nur neutrale JSON-Intents in die vom Installateur definierten Command-States.
