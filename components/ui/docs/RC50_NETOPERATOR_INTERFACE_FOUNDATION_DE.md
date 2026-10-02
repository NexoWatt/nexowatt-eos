# RC50 – Netzbetreiber-Schnittstellen-App: technische Grundlage

## Ziel

RC50 bereitet in NexoWatt EOS eine eigene App `netoperator-interface` für die nachgelagerte Anbindung zertifizierter EZA-/Parkregler vor.

Die Systemgrenze bleibt eindeutig:

```text
Netzbetreiber / Fernwirktechnik
→ zertifizierter EZA-/Parkregler
→ NexoWatt EOS Netzbetreiber-Schnittstelle
→ EOS Operation Engine
→ PV, Speicher, Ladeinfrastruktur und steuerbare Verbraucher
```

Der zertifizierte Regler bleibt die netzseitig maßgebliche Instanz am Netzanschlusspunkt. RC50 ersetzt keine zertifizierte Reglerfunktion und gibt noch keine Netzbetreiber-Vorgabe an Asset-Writer weiter.

## Sicherheitszustand in RC50

```text
Standard: deaktiviert
Lesen/Diagnose: vorbereitet
Hardware-Schreibzugriff: gesperrt
Operation-Engine-Integration: vorbereitet, nicht aktiv
Herstellerprofile: Platzhalter ohne Registeradressen
```

Ein Herstellerprofil mit fehlenden Pflichtsignalen bleibt im Zustand `mapping-required` und öffnet keine zyklische Modbus-Verbindung.

## Kanonisches Datenmodell

Der EOS-Core arbeitet ausschließlich mit diesen Schlüsseln:

- `grid.command.enable`
- `grid.command.trip`
- `grid.command.release`
- `grid.p.limit_kw`
- `grid.p.target_kw`
- `grid.p.target_pct`
- `grid.q.target_kvar`
- `grid.cosphi.target`
- `grid.mode.p`
- `grid.mode.q`
- `pcc.p.actual_kw`
- `pcc.q.actual_kvar`
- `pcc.u.actual_v`
- `controller.status`
- `controller.comm_ok`
- `controller.fault_code`
- `controller.timestamp`
- `controller.source`
- `eos.ack.command_id`
- `eos.status.ready`

Die Priorität ist fest:

1. Trip / Abschaltung
2. Freigabe / Sperre
3. P-Limit / P-Sollwert
4. Q / cos phi
5. EOS-Betriebsstrategie
6. Komfort- und Kostenoptimierung

## Treiberprofil

Herstellerspezifische Informationen liegen ausschließlich unter:

```text
ems/netoperator/drivers/<hersteller>.json
```

Später müssen pro Register bzw. Variable nur diese Angaben ergänzt werden:

- kanonischer EOS-Schlüssel
- Registeradresse oder Datenpunkt-ID
- Funktionscode / Registerbereich
- Datentyp
- Registeranzahl
- Skalierung und Offset
- Vorzeichen
- Byte-/Word-Reihenfolge
- Enum-Zuordnung
- Quality-/Validity-Signal und gültige Codes
- Zeitstempel-Signal
- Watchdog, Timeout und Fail-Safe-Vertrag
- Mapping-Version

Es dürfen keine Registerwerte geraten werden. Ein Profil wird erst `ready`, wenn alle Pflichtsignale und mindestens ein P-Befehl vollständig gemappt sind.

## Vorbereitete Herstellerprofile

- WAGO Power Plant Control
- Beckhoff TwinCAT 3 Power Control / TF8360
- Phoenix Contact PCU / SOL-SA-PCU-41XX
- meteocontrol blue'Log XC / PPC
- Bachmann SPPC
- energielenker EZA-Regler
- Siemens SICAM A8000
- generische Modbus-TCP-Vorlage

Alle Profile haben in RC50 die Mapping-Version `0.0.0`, enthalten keine erfundenen Registeradressen und bleiben read-only.

## Transporte

In RC50 implementiert:

- Modbus TCP
- EOS-Datenpunkt-Mapping (`state-map`) für Entwicklung und Simulation

Als Treiberslots reserviert, aber noch nicht implementiert:

- Modbus RTU
- OPC UA
- IEC 60870-5-104
- IEC 61850

Ein ausgewählter, noch nicht implementierter Transport endet mit einer eindeutigen Diagnose und erzeugt keinen Hardwarezugriff.

## Modbus-TCP-Grundlage

Vorbereitet sind:

- Funktionscodes 1, 2, 3 und 4
- 0- und 1-basierte Registeradressen
- Bool, Bit, Int/UInt 16/32/64, Float 32/64, Enum, String und Zeitstempel
- Byte-/Word-Reihenfolgen `AB`, `BA`, `ABCD`, `BADC`, `CDAB`, `DCBA`
- Skalierung und Offset
- Connection- und Request-Timeout
- serielle Request-Queue pro Verbindung
- MBAP- und Antwortlängenprüfung
- getrennte Pflicht- und optionale Signalfehler

## Qualität und Frische

Ein Wert besteht intern aus:

```text
value
valid
timestamp
quality
source
reason
```

`null`, `undefined`, leere Strings, ungültige Quality-Codes und stale Werte werden nie als physikalische `0` oder `false` interpretiert.

Bei einem separaten Quality-Signal muss das Herstellerprofil die guten, veralteten und schlechten Codes ausdrücklich definieren. Ein unbekannter Code ist fail-closed ungültig.

## UI und Rollen

### AppCenter / Installer

- Modul aktivieren
- Herstellerprofil auswählen
- Transport parametrieren
- Signalalter und Auditgröße festlegen
- Fail-Safe-Vertrag dokumentieren
- Treiber/Verbindung read-only prüfen
- eigenes Treiberprofil als JSON laden

### Betreiberansicht

- Regler- und Kommunikationsstatus
- Quelle und aktiver Modus
- Freigabe, Sperre und Trip
- P-/Q-/cos-phi-Vorgaben
- P-/Q-/Spannungs-Istwerte am NAP
- letztes empfangenes und letztes gültiges Telegramm
- Bindungsanzeige
- Ereignisprotokoll

Die Roh-/Registeransicht ist ausschließlich Installer/Admin zugänglich.

## Audit

Bei einer geänderten externen Entscheidung werden mindestens protokolliert:

- Quelle
- Zeitstempel
- Treiber und Mapping-Version
- vorherige Entscheidung
- neue Entscheidung
- Priorität
- Begründung
- Reaktion
- Ergebnis

## Abnahmesuite

`ems/netoperator/acceptance-tests.json` enthält T01 bis T12 als einheitlichen Vertrag:

- Kommunikation
- 0-kW-Limit
- dynamische P-Reduktion
- Trip
- Freigabe
- Q
- cos phi
- Kommunikationsverlust
- stale Daten
- Neustart
- BESS + PV
- Logging

RC50 implementiert nur die sichere Grundlagen-, Diagnose- und Teststruktur. Die operative Umsetzung von T02–T07 und T11 bleibt bis zu einem echten Herstellerprofil, Capability-Check, Projektfreigabe und Feldtest gesperrt.

## Erweiterung eines Herstellers

Sobald eine vollständige Registerliste vorliegt:

1. vorhandenes Herstellerprofil kopieren bzw. vervollständigen;
2. Adressen, Datentypen, Skalierungen und Endianness eintragen;
3. Quality-, Zeitstempel- und Watchdog-Vertrag ergänzen;
4. `mappingVersion` erhöhen;
5. Profilvalidierung und Verbindungstest ausführen;
6. T01–T12 gegen Simulator/Testgerät prüfen;
7. erst nach dokumentierter Abnahme die spätere Operation-Engine-Integration separat freigeben.

Der EOS-Core und das kanonische Datenmodell müssen für normale Registerergänzungen nicht geändert werden.
