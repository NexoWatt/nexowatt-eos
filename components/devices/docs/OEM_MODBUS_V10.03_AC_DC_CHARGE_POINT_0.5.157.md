# OEM Modbus V10.03 AC/DC Charge Point

> **Herstellerzuordnung:** Ab Version 0.5.159 ist das Protokoll als DEPower bestätigt. Die internen `evcs.oem...`-IDs bleiben ausschließlich aus Kompatibilitätsgründen bestehen. Siehe [DEPower Charging SOC 0.5.159](DEPOWER_MODBUS_V10.03_SOC_0.5.159.md).

## Quelle

Implementiert aus `ModBus&TCP-protocol_V10.03-V6.xlsx`. Die Quelldatei nennt keinen Hersteller und keine konkrete Produktfamilie. Die Templates werden deshalb neutral unter **OEM / Modbus V10.03** geführt.

## Templates

- `evcs.oem.modbusV1003.connector1` – Connector 1 (`0x01NN`)
- `evcs.oem.modbusV1003.connector2` – Connector 2 (`0x02NN`)

Beide Templates lesen zusätzlich die universellen Register (`0x00NN`). `GUN_TYPE` unterscheidet AC einphasig, AC dreiphasig und DC.

## Steuerung

- `aliases.v1.ctrl.run = true` schreibt `Charge command = 1` (Start).
- `aliases.v1.ctrl.run = false` schreibt `Charge command = 2` (Stop).
- `aliases.v1.ctrl.powerLimitW` schreibt den Connector-Sollwert `SET_POWER` per FC16 als vollständigen `uint32`.
- Das Protokoll besitzt **keinen laufenden Connector-Stromsollwert**. `FALLBACK_CURRENT` ist ausschließlich der Sicherheitsstrom nach Kommunikationsausfall und wird deshalb bewusst **nicht** als `aliases.v1.ctrl.currentLimitA` veröffentlicht. AC- und DC-Geräte werden über `powerLimitW` geregelt.
- `cHARGE_POINT_SET_POWER` ist zusätzlich als stationweiter Roh-Sollwert verfügbar, wird aber nicht als Connector-Leistungsalias verwendet.

## Sicherheit

- Keine automatische Wiederherstellung alter Start-/Leistungsbefehle nach Neustart.
- Kein zyklischer Keepalive, weil die Quelldatei keinen Sollwert-Watchdog dokumentiert.
- Address-Offset ist fest 0.
- 32-Bit-Wort-/Byte-Reihenfolge ist in der Quelldatei nicht angegeben und bleibt deshalb über die Geräteeinstellung anpassbar; Standard des Adapters ist BE/BE.

## Feldtest

Zuerst Status und Messwerte prüfen. Danach `0 W`, einen kleinen Leistungssollwert und Start/Stop testen. Bei unplausiblen 32-Bit-Werten die Wortreihenfolge in der Gerätekonfiguration prüfen, ohne Registeradressen zu ändern.
