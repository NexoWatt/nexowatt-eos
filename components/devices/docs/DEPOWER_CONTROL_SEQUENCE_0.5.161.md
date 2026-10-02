# DEPower AC/DC – stabile Steuersequenz und Prepare-Re-Arm (0.5.161)

## Ausgangslage

Bei der DEPower-DC-Ladestation bleiben die universellen RW-Rückmeldungen teilweise auf beziehungsweise springen nach dem Schreiben wieder auf `0`:

- `cHARGE_MODE`
- `cHARGE_POINT_SET_POWER`

Das ist kein geeigneter Speicher für den NexoWatt-Sollzustand. Die Rohdatenpunkte bilden weiterhin die jeweils vom Gerät gelesene Rückmeldung ab und dürfen deshalb durch den nächsten Modbus-Poll wieder überschrieben werden.

Die verbindliche NexoWatt-Befehlsoberfläche bleibt:

```text
aliases.v1.ctrl.powerLimitW
aliases.v1.ctrl.run
```

## Koordinierter Startablauf

Für einen Leistungs- oder Startbefehl führt der Modbus-Treiber nun unmittelbar nacheinander aus:

1. `cHARGE_MODE = 1` – Charge on command
2. Bei bestätigter Ein-Connector-Station und einem Stationswert von `0 W`: `cHARGE_POINT_SET_POWER = gewünschte Connectorleistung`
3. `eV_SET_CHARGE_POWER_LIMIT = gewünschte Connectorleistung`
4. Startbefehl `cHARGE_COMMAND = 1`

Befindet sich der Connector trotz positiver Leistungsvorgabe und vorhandenen Fahrzeugs weiter in `Prepare`, erzeugt der Adapter begrenzt eine neue Befehlsflanke:

```text
cHARGE_COMMAND = 2
500 ms Pause
cHARGE_COMMAND = 1
```

Die Re-Arm-Sequenz ist auf einen Mindestabstand von fünf Sekunden begrenzt. Ein bereits aktiver Ladevorgang im Zustand `Charging` wird nicht unterbrochen.

## Schutz bestehender Anlagen

- Die Template-IDs bleiben unverändert.
- Es werden keine bestehenden Rohdatenpunkte oder Aliase umbenannt oder entfernt.
- Ein vorhandenes positives Stationslimit wird niemals angehoben oder überschrieben.
- Die Stationsleistung wird nur bei bestätigter Ein-Connector-Station initialisiert.
- `Stop` bleibt ein einzelner, direkter Befehl `cHARGE_COMMAND = 2`.
- Die Roh-RW-Datenpunkte bleiben echte Geräte-Rückmeldungen; NexoWatt macht sie nicht künstlich „sticky“.

## Statusauswertung

`Prepare` zeigt nur an, dass die Fahrzeug-/Connectorvorbereitung läuft. Es gilt daher nicht mehr als bestätigte Ladefreigabe.

```text
Charging (2)     -> chargingReleased = true
SuspendEV (3)    -> chargingReleased = true
Prepare (1)      -> chargingReleased = false
SuspendEVSE (8)  -> chargingReleased = false
```

## Feldtest

Im normalen Betrieb werden ausschließlich die kanonischen Steueraliase beschrieben:

```text
aliases.v1.ctrl.powerLimitW = 11000
aliases.v1.ctrl.run = true
```

Erwarteter Ablauf im Log bei einem festhängenden Connector:

```text
DEPower connector 1 re-armed from Prepare:
chargeMode=1, connectorPower=11000 W,
stationPower initialized=11000 W, command=2->1
```

Anschließend muss `eVSE_STATE` von `Prepare` in `Charging` oder einen nachvollziehbaren Fehler-/Sperrzustand wechseln. Die reale Gerätebestätigung erfolgt im Feldtest.
