# NexoWatt UI 0.8.42 – Mesh/Microgrid Feldtest mit zwei Instanzen

## Ziel

Diese Version ergänzt die Feldtest-Diagnose für zwei NexoWatt-Instanzen, die über ein separates Mesh/Microgrid-Tailscale-Netz miteinander verbunden sind.

Die bestehende Trennung bleibt erhalten:

- Tailscale Fernwartung: Support / Zugriff von außen.
- Tailscale Mesh/Microgrid: Kommunikation zwischen NexoWatt-Instanzen.

## Wichtige Sicherheitsregel

Die Mesh/Microgrid-App schreibt weiterhin keine Hardware direkt.

Der Ablauf bleibt:

```text
Mesh/Microgrid Planung
→ neutraler Command-Envelope
→ Peer-Receiver
→ lokaler JSON-Command-State
→ lokale Bridge / Herstelleradapter / OCPP / Modbus / MQTT / REST
```

## Neue Betreiberansicht

Die Seite `/mesh/microgrid` zeigt zusätzlich:

- Zwei-Instanzen-Feldteststatus
- Peer-Matrix
- Handshake-Status je Peer
- Command-ACK je Peer
- Command-/ACK-Verlauf
- Fehlerdiagnose für Token, Cluster-ID, TTL und Replay-Schutz

## Manueller Feldtest

In der Betreiberansicht gibt es den Button:

```text
Peer-Handshake + Probe-Command testen
```

Dieser ruft auf:

```text
POST /api/mesh/peer/fieldtest
```

Der Test prüft:

- `/api/mesh/handshake`
- `/api/mesh/status`
- `/api/mesh/command/receive` mit einem neutralen Probe-Command

Der Probe-Command hat `plannedPowerW = 0` und `probeOnly = true`.

## Voraussetzungen pro Instanz

- EOS-Lizenz aktiv
- Mesh/Microgrid installiert und aktiviert
- separate Mesh-Tailscale-IP erreichbar
- gleiche Cluster-ID
- Peer-Token auf beiden Seiten passend
- Command Receiver auf Zielinstanz aktiv
- lokaler Receiver-Command-State auf Zielinstanz gesetzt

## Keine Konfiguration im Apps-Reiter

Die Detailkonfiguration bleibt im eigenen Reiter:

```text
Mesh/Microgrid
```

Der Apps-Reiter bleibt nur App-Katalog.
