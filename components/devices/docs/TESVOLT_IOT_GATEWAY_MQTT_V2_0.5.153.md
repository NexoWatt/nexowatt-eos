# TESVOLT IoT Gateway – MQTT EMS Interface V2 (0.5.153)

> Historischer Versionsstand. Für die Einrichtung ab 0.5.163 gilt [TESVOLT EMS / V2](TESVOLT_EMS_TOPICS_0.5.163.md), insbesondere Port 1884 ohne TLS, unversionierte Topics und der standardmäßige Lesebetrieb.

## Ziel und Abgrenzung

Das eigenständige Template

```text
ess.tesvolt.iotGateway.mqttV2
```

bindet das TESVOLT IoT Gateway als MQTT-Broker an NexoWatt EOS an. Das bereits
vorhandene Modbus-Template
`ess.tesvolt.TesvoltEnergyManagerVermarkter` bleibt unverändert und wird nicht
migriert oder ersetzt.

Grundlage ist die TESVOLT-Spezifikation **„EMS-Interface (MQTT) – V2“** sowie
die technische Rückmeldung von TESVOLT vom August 2026. Die API-Version wird
über `EMS/APIVersion` ermittelt; für dieses Template muss `V2` gemeldet werden.

## Sichere MQTT-Verbindung

TESVOLT nennt für das IoT Gateway Port `1884`, Benutzername und Kennwort sowie
eine verschlüsselte Verbindung. Im Adapter wird Transportverschlüsselung über
`mqtts://`/TLS umgesetzt. Benutzername und Kennwort authentifizieren den
Client, ersetzen aber keine TLS-Verschlüsselung.

Beispiel:

```text
Kategorie:  Batteriespeicher / ESS
Hersteller: TESVOLT
Template:   TESVOLT IoT Gateway (MQTT EMS Interface V2)
Protokoll:  mqtt
URL:        mqtts://<Gateway-IP-oder-Hostname>:1884
Benutzer:   TESVOLT-Zugang
Passwort:   TESVOLT-Zugang
```

Zusätzliche TLS-Felder:

```text
Verify TLS certificate
TLS CA certificate file
TLS server name / SNI
```

Eine private oder selbst signierte CA kann als Datei auf dem NexoWatt-
Controller hinterlegt werden. `Verify TLS certificate` sollte im produktiven
Betrieb aktiviert bleiben. Die exakte Zertifikatskette und der auf dem Gateway
konfigurierte Hostname müssen bei der Inbetriebnahme mit TESVOLT abgeglichen
werden.

TESVOLT weist darauf hin, dass die aktuelle Gateway-Konfiguration ursprünglich
auf Wendeware zugeschnitten ist. Für NexoWatt muss der MQTT-Zugang derzeit
händisch in den Gateway-Konfigurationsdateien eingerichtet werden; eine WebUI-
Provisionierung gibt es noch nicht.

## Eingelesene Topics

```text
EMS/APIVersion
EMS/V2/Parameters
EMS/V2/TesvoltIoTGateway
EMS/V2/Inverter/Parameters
EMS/V2/Inverter/Limits
EMS/V2/Inverter/Measurements
EMS/V2/Inverter/Energy
EMS/V2/Inverter/State
EMS/V2/Inverter/Errors
EMS/V2/Battery/Parameters
EMS/V2/Battery/Energy
EMS/V2/Battery/Electrical
EMS/V2/Battery/SystemState
EMS/V2/Battery/Errors
```

Damit stehen unter anderem API-/Geräteinformationen, SOC, AC-/DC-Leistung,
Energie, Zustände, Fehlerlisten sowie dynamische Lade- und Entladegrenzen zur
Verfügung. Fehlerlisten sind nur zur Anzeige vorgesehen; Regelentscheidungen
stützen sich auf `Inverter/State`, `Battery/SystemState` und die aktuellen
Grenzen.

## Vorzeichenkonvention

TESVOLT:

```text
Power > 0  = laden
Power < 0  = entladen
```

NexoWatt EOS:

```text
Leistung > 0  = entladen
Leistung < 0  = laden
```

Der Treiber invertiert Mess- und Sollwerte automatisch.

| NexoWatt-Sollwert | Bedeutung | TESVOLT `Power` |
|---:|---|---:|
| `+5000 W` | 5 kW entladen | `-5000` |
| `-5000 W` | 5 kW laden | `+5000` |
| `0 W` | Neutral-/Stoppsollwert | `0` |

## Zyklische Leistungsvorgabe

TESVOLT erwartet zyklische Sollwerte. Bleibt ein neuer Sollwert länger als
standardmäßig 30 Sekunden aus, wird das externe EMS als offline behandelt. Die
konkrete Reaktion ist wechselrichterabhängig; typischerweise wird auf `0 W`
beziehungsweise Standby zurückgefallen.

NexoWatt verwendet deshalb folgende Standardwerte:

```text
TESVOLT setpoint refresh interval:     5.000 ms
NexoWatt command freshness timeout:   20.000 ms
TESVOLT telemetry stale timeout:       5.000 ms
Setpoint tracking delay:               3.000 ms
```

Alle Werte sind im Geräte-Dialog konfigurierbar. Das Refreshintervall muss
deutlich unter dem auf dem Gateway eingestellten EMS-Offline-Timeout liegen.

### Failsafe-Verhalten

- Jeder gültige Sollwert wird alle fünf Sekunden erneut veröffentlicht.
- Aktualisiert die übergeordnete EOS-Regelung den Befehl länger als 20 Sekunden
  nicht, sendet der Device Adapter aktiv `0 W`.
- Nach Adapterstart oder MQTT-Wiederverbindung wird zunächst `0 W` gesendet.
- Ein früherer, nicht-null Sollwert wird nach einer Wiederverbindung niemals
  automatisch fortgesetzt; dafür ist ein neuer EOS-Schreibbefehl erforderlich.
- Bei einem kontrollierten Adapterstopp wird bestmöglich ein letzter
  `0-W`-Befehl gesendet.
- Bei einem harten Netz- oder Prozessausfall übernimmt anschließend der
  konfigurierbare TESVOLT-Timeout.

Damit wird berücksichtigt, dass ein Wechselrichter während eines kurzen
IoT-Gateway-Neustarts den vorherigen Sollwert zunächst beibehalten kann.

## Vollständiger Control-Payload

TESVOLT hat bestätigt, dass Wirk- **und** Blindleistung gesendet werden müssen.
Das Template veröffentlicht daher bei jedem Zyklus mindestens:

```json
{
  "Power": 20000,
  "Reactive_Power": 0
}
```

Wenn `State` als steuerbare Größe gemeldet wird, wird zusätzlich regelmäßig

```json
"State": "grid_connected"
```

gesendet. Dies wird insbesondere beim KACO-Wechselrichter genutzt, um nicht
mehr anliegende Fehler zu quittieren.

Der MQTT-Befehl wird mit QoS 0 und `retain=false` auf
`EMS/V2/Inverter/Control` veröffentlicht.

## Dynamische Grenzen und Freigaben

Ein Sollwert ungleich `0 W` wird nur gesendet, wenn:

- MQTT verbunden ist,
- API V2 bestätigt wurde,
- `Power` in `supported_control` enthalten ist,
- Batterie- und Wechselrichterzustand frisch und zulässig sind,
- aktuelle AC-Grenzen vorhanden sind.

Die Vorgabe wird auf `P_Max_Charge` beziehungsweise `P_Max_Discharge` begrenzt.
Die DC-Grenzen unter `Battery/Electrical` bleiben Diagnosewerte; maßgeblich für
den AC-Sollwert sind die Inverter-Limits.

## Sollwertüberwachung ohne separates Acknowledgement

TESVOLT liefert keine gesonderte Annahmebestätigung. Deshalb wird die Reaktion
aus `Inverter/Measurements.Power` abgeleitet.

Neue Diagnose-Datenpunkte:

```text
cOMMANDED_ACTIVE_POWER
sETPOINT_TRACKING_ERROR
sETPOINT_TRACKING_STATUS
sETPOINT_TRACKING_OK
lAST_SETPOINT_SENT_MS
```

Mögliche Statuswerte:

```text
idle
pending
following
deviating
measurement_stale
measurement_invalid
offline
safe_connect
safe_reconnect
safe_stale
safe_blocked
safe_disconnect
```

`following` bedeutet lediglich, dass die gemessene Wirkleistung innerhalb der
konfigurierten Toleranz dem gesendeten Sollwert folgt. Es ist keine separate
Protokollquittung.

## Aktualisierungsrate und Datenfrische

TESVOLT nennt standardmäßig etwa 500 ms Publikationsintervall; der Wert ist in
den jeweiligen Gateway-Adaptern konfigurierbar. NexoWatt verwendet deshalb
einen konfigurierbaren Stale-Timeout von standardmäßig fünf Sekunden. Alte
`ts_create`-Nachrichten überschreiben keine neueren Werte. Veraltete oder bei
MQTT-Ausfall eingefrorene Leistungswerte werden aktiv auf `0 W` gesetzt.

## Battery Control / DC-Schütz

TESVOLT hat klargestellt:

```text
DC_Connection_Request = true   -> Schütze schließen
DC_Connection_Request = false  -> Schütze öffnen
```

Im aktuellen Bifi-/Ampace-Stand kann die Batterie das aktive Öffnen noch nicht
umsetzen. Aus Sicherheitsgründen bleibt `EMS/V2/Battery/Control` deshalb im
normalen NexoWatt-Steuerpfad weiterhin deaktiviert. Es gibt keine Verknüpfung
mit `ctrl.run` oder anderen Standardaliassen.

## Noch offen für eine Serienintegration

- Exakte TLS-Zertifikatskette, Hostname/SNI und Provisionierungsablauf je
  Gateway.
- Reproduzierbare NexoWatt-Konfiguration statt manueller Änderung einzelner
  Gateway-Configs.
- Priorität bei parallelen Sollwerten über MQTT, Modbus, Vermarkter oder andere
  Steuerquellen.

Für den ersten Kundenfeldtest ist die Schnittstelle mit den oben beschriebenen
Failsafes nutzbar. Für einen breiteren Rollout sollte TESVOLT einen dokumentierten
oder automatisierbaren Provisionierungsweg bereitstellen.
