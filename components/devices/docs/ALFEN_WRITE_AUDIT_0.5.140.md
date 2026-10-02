# Alfen ACE Schreiblogik-Audit – 0.5.140

## Ergebnis

Der Verdacht war **teilweise berechtigt**: Der eigentliche Socket-Modbus-Frame in 0.5.139 war korrekt, aber die Implementierung hatte zwei reale Schwachstellen, die einen nicht reagierenden Schreibbefehl verschleiern beziehungsweise beim falschen ACE-Regelmodus ins Leere laufen lassen konnten.

1. Das als „Station“ bezeichnete Profil war tatsächlich nur ein Socket-1-Profil. Für eine Wallbox beziehungsweise ein Netz im ACE-Regelmodus **SCN** existierte damit kein wirksamer SCN-Schreibpfad.
2. Manuelle Modbus-Schreibablehnungen mit Exception 2/3 wurden im Runtime-Pfad behandelt und danach still beendet. In ioBroker sah das dadurch wie ein angenommener, aber ignorierter Befehl aus; `info.lastError` erhielt keine eindeutige Fehlermeldung.

Beide Punkte sind in 0.5.140 korrigiert.

## Referenz

Geprüft wurde gegen **Alfen Modbus for ACE – Configuration Guide v1.0, EN 05/2025**. Der Leitfaden nennt ACE Service Installer 3.4.10-130 und Firmware 4.10 als Bezugsstand.

Relevante Regeln:

- Port 502
- Unit-ID 1/2 für Socket 1/2
- Unit-ID 200 für Station/SCN
- FC03 lesen, FC06 Einzelregister schreiben, FC16 Mehrfachregister schreiben
- Protokolladresse = Dokumentregister minus 1
- Mehrregisterwerte vollständig in einer Anfrage schreiben
- 32-Bit-Werte: Low-Word-First; Bytes innerhalb jedes 16-Bit-Registers in Network Byte Order

## Audit des Socket-Schreibpfads

### Max Current

| Eigenschaft | Soll laut ACE-Leitfaden | Implementierung 0.5.140 |
|---|---:|---:|
| Dokumentregister | 1210..1211 | 1210..1211 |
| Protokolladresse | 1209 | 1209 |
| Länge | 2 Register | 2 Register |
| Datentyp | FLOAT32 | FLOAT32 |
| Funktion | FC16 | FC16 |
| Socket 1 | Unit-ID 1 | Unit-ID 1 |
| Socket 2 | Unit-ID 2 | Unit-ID 2 |
| Wortfolge | Low word first | `wordOrder: le` |
| Bytefolge je Wort | Network order | `byteOrder: be` |

Beispiel für `16 A`:

- IEEE-754 FLOAT32: `0x41800000`
- Register auf der Leitung: `[0x0000, 0x4180]`
- Socket 1, Unit-ID + PDU: `01 10 04 B9 00 02 04 00 00 41 80`
- Socket 2, Unit-ID + PDU: `02 10 04 B9 00 02 04 00 00 41 80`

Damit liegt im Socket-Schreibframe **kein Off-by-one-, FC-, Unit-ID- oder Endian-Fehler** vor.

### Charge Using Phases

- Dokumentregister 1215
- Protokolladresse 1214
- Unit-ID 1 beziehungsweise 2
- nur Werte 1 oder 3

## Korrigierter Station-/SCN-Schreibpfad

Das Profil `evcs.alfen.ng9xx.ace.station.modbusTcp` ist jetzt ein echtes Station/SCN-Profil.

Der neue kombinierte Datenpunkt `sCN_MAX_CURRENT` schreibt denselben Grenzwert atomar auf alle drei Phasen:

- Unit-ID 200
- FC16
- Startadresse 1416 (Dokumentregister 1417)
- Länge 6 Register
- drei vollständige FLOAT32-Werte in einer Anfrage
- dokumentierte Schrittweite 1 A; Werte werden auf volle Ampere gerundet
- `0 A` bleibt Stop, positive Werte unter `6 A` werden auf `6 A` normalisiert

Beispiel für `16 A`:

- Register: `[0x0000,0x4180, 0x0000,0x4180, 0x0000,0x4180]`
- Unit-ID + PDU: `C8 10 05 88 00 06 0C 00 00 41 80 00 00 41 80 00 00 41 80`

Die einzelnen SCN-Sollwerte liegen korrekt auf:

- L1: 1416
- L2: 1418
- L3: 1420

Die zugehörigen Diagnosewerte liegen auf:

- Remaining Valid Time L1/L2/L3: 1422 / 1424 / 1426
- SCN Safe Current: 1428
- SCN Max Current Enable: 1430

## Fehlerbehandlung und Feld-Diagnose

Ab 0.5.140:

- Ein manuell ausgelöster Alfen-Schreibfehler mit Modbus Exception 2/3 wird in `info.lastError` sichtbar.
- Ein normal quittierter FC16-Zugriff erzeugt für die ersten Versuche einen exakten Logeintrag mit Datenpunkt, Unit-ID, FC, Adresse, Länge, Registerwörtern und Datenbytes.
- Die Meldung behauptet nicht, dass ACE den Setpoint bereits angewendet hat. Dafür sind die Readbacks maßgeblich.

Interpretation der Readbacks:

| Beobachtung | Wahrscheinliche Bedeutung |
|---|---|
| Valid Time bleibt unverändert und Sollwert-Readback ändert sich nicht | Telegramm abgelehnt, falsches Profil/Unit-ID oder EMS-Schreibfunktion nicht freigeschaltet |
| Sollwert und Valid Time ändern sich, `setpointAccountedFor=false` | ACE hat den Wert empfangen, berücksichtigt ihn aber im aktiven Regelmodus nicht; häufig `Enable sockets` oder Socket/SCN-Modus falsch |
| `setpointAccountedFor=true`, tatsächlicher Grenzwert bleibt kleiner | anderer interner Setpoint, Safe Current, Netzlimit, SCN-Verteilung oder Fahrzeugreaktion begrenzt |
| gültiger FC16-Response, danach schneller Rückfall | Validity Time läuft ab oder ein anderer Client überschreibt den Wert |

## ACE-Konfigurationscheck

### Socket-Profil

- Active Load Balancing lizenziert und aktiviert
- Data Source = Energy Management System
- Protocol Selection = Modbus TCP/IP
- TCP/IP EMS Control Mode = Socket
- Allow reading = aktiv
- Allow writing maximum currents = aktiv
- Enable sockets = aktiv
- Safe Current gesetzt
- Validity Time größer als 5 s

### Station/SCN-Profil

- dieselben Grundvoraussetzungen
- TCP/IP EMS Control Mode = SCN
- SCN-Max-Current-Funktion aktiviert (`sCN_MAX_CURRENT_ENABLE` muss 1 liefern)

## Watchdog

Der Max-Current-Befehl wird nach einem expliziten Kommando alle 5 Sekunden erneuert. In 0.5.139 existierten zwei zeitlich überlappende Wiederholungspfade; in 0.5.140 übernimmt nur noch der Validity-Watchdog die zyklische Stromaktualisierung. Die Phasenwahl wird nicht zyklisch geschrieben.

## Automatisierte Prüfung

Die Regressionstests prüfen:

- Synchronität von Admin- und Runtime-Templates
- exakte Socket-Adressen, Unit-IDs und Endian-Konfiguration
- exakte Socket-1-/Socket-2-PDU-Bytes
- Ignorieren alter manueller Unit-ID-/Address-Offset-Werte bei Alfen
- atomaren SCN-Drei-Phasen-Write auf Unit-ID 200
- sichtbare Fehlerbehandlung für manuelle Exception-2/3-Schreibfehler
- vorhandenen Accepted-Write-Trace

Die Prüfung ist ein Code- und Pakettest. Eine physische Alfen-Wallbox stand in dieser Umgebung nicht zur Verfügung; die endgültige Feldbestätigung erfolgt über Write-Trace und die genannten ACE-Readbacks.
