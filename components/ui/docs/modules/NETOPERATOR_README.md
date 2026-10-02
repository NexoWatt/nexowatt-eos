# NexoWatt EOS Netzbetreiber-Treiberprofile

Diese Profile bilden herstellerspezifische Register oder Prozessdaten auf das kanonische EOS-Modell ab. Der EOS-Core kennt keine Herstellerregister. Der zertifizierte EZA-/Parkregler bleibt die netzseitig maßgebliche Instanz; die RC50-Grundlage liest, normalisiert, prüft und protokolliert ausschließlich.

## Vorgehen für einen neuen Hersteller

1. Passendes Platzhalterprofil unter `ems/netoperator/drivers/` öffnen.
2. `mappingVersion` auf die dokumentierte Registerlisten-Version setzen.
3. Für jeden vorhandenen Kanal nur die Herstellerangaben eintragen:
   - `area`, `address`, `addressBase`, `dataType`, `registers`,
   - `scale`, `offset`, `byteOrder`, optional `bit` und `enumMap`.
4. Sofern der Regler eigene Quality-/Validity- oder Zeitstempelregister liefert, diese unter `quality` bzw. `timestamp` am Signal ergänzen. Ohne eindeutige Quality-Klassifikation wird ein separates Quality-Signal fail-closed als ungültig behandelt.
5. Nicht unterstützte Signale im Profil mit `address: null` belassen. Die Pflichtsignale und mindestens ein P-Befehl müssen für `ready=true` vollständig gemappt sein.
6. Kommunikations-Watchdog, Signalalter und Fail-Safe mit Hersteller und Netzbetreiber abstimmen.
7. Treiber gegen `acceptance-tests.json` prüfen und die Mapping-Version erhöhen.

## Kanonische Schlüssel

- `grid.command.enable`, `grid.command.trip`, `grid.command.release`
- `grid.p.limit_kw`, `grid.p.target_kw`, `grid.p.target_pct`
- `grid.q.target_kvar`, `grid.cosphi.target`, `grid.mode.p`, `grid.mode.q`
- `pcc.p.actual_kw`, `pcc.q.actual_kvar`, `pcc.u.actual_v`
- `controller.status`, `controller.comm_ok`, `controller.fault_code`, `controller.timestamp`, `controller.source`
- optional schreibend: `eos.ack.command_id`, `eos.status.ready`

## Bereits implementierte Transporte

- `modbus-tcp`: generischer read-only Modbus-TCP-Connector mit FC 1/2/3/4, Skalierung, Bitzugriff, Enum-Mapping und Byte-/Word-Reihenfolge.
- `state-map`: read-only Abbildung vorhandener EOS-Datenpunkte auf das kanonische Modell.

Die Protokollslots `modbus-rtu`, `opc-ua`, `iec-104` und `iec-61850` sind im Treiberstandard reserviert, aber in RC50 noch nicht implementiert.

## Sicherheitsgrenze dieser Version

RC50 liest und normalisiert Werte, protokolliert Befehlsänderungen und prüft Treiberprofile. Die Übergabe bindender Sollwerte an die EOS Operation Engine sowie alle Hardware-/Regler-Writebacks sind absichtlich gesperrt, bis ein reales Herstellerprofil vollständig dokumentiert, gegen T01–T12 abgenommen und projektspezifisch freigegeben wurde.
