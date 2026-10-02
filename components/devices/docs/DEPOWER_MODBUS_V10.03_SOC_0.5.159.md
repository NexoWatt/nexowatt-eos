# DEPower Modbus V10.03 – Charging SOC

## Vergleich der Registerdateien

Verglichen wurden die bisherige Datei `ModBus&TCP-protocol_V10.03-V6.xlsx` und die neue DEPower-Datei `ModBus&TCP-protocol_V10.03-V6(1)(1).xlsx`.

Die universellen Register sowie sämtliche bisherigen Connector-Mess- und Steuerregister sind unverändert. Neu hinzugekommen ist ausschließlich:

| Connector | Adresse | Zugriff | Funktion | Datentyp | Einheit |
|---|---:|---|---|---|---|
| 1 | `0x0124` | RO / FC3 | Charging SOC | `UINT16` | `1 %` |
| 2 | `0x0224` | RO / FC3 | Charging SOC | `UINT16` | `1 %` |

## Template-Kompatibilität

Die bereits veröffentlichten internen IDs bleiben erhalten:

- `evcs.oem.modbusV1003.connector1`
- `evcs.oem.modbusV1003.connector2`

Dadurch bleiben vorhandene Gerätekonfigurationen gültig. In der Geräteauswahl werden die Templates ab Version 0.5.159 als **DEPower** angezeigt.

## Datenpunkte und Aliase

Rohdatenpunkt je Connector:

```text
cHARGING_SOC
```

Herstellerunabhängige NexoWatt-Pfade:

```text
aliases.r.soc
aliases.v1.r.soc
```

Der Alias besitzt die Einheit `%` und die Capability `read.soc`. Werte von 0 bis 100 werden übernommen. `0xFFFF`, fehlende Werte und andere Werte außerhalb des gültigen Prozentbereichs werden im Alias als `null` behandelt.

## Abwärtskompatibilität

Der neue SOC-Lesepunkt ist optional und durch eine eigene Modbus-Lesegruppe von `SET_POWER` getrennt. Eine ältere DEPower-Firmware, die `0x0124` beziehungsweise `0x0224` noch nicht bereitstellt, kann deshalb weiterhin Status, Leistung und Steuerbefehle verwenden.
