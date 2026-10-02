# TESVOLT IoT Gateway – MQTT-Verbindung und Diagnose (0.5.158)

> Historischer Versionsstand. Für die Einrichtung ab 0.5.163 gilt [TESVOLT EMS / V2](TESVOLT_EMS_TOPICS_0.5.163.md), insbesondere Port 1884 ohne TLS, unversionierte Topics und der standardmäßige Lesebetrieb.

## Anlass

Beim ersten Feldtest antwortete der Broker auf Port `1884` mit
`MQTT not authorised`. Port `1883` lieferte dagegen nur
`CONNACK timeout`, `connection closed` und nachgelagert einen
`MQTT heartbeat timeout`.

Die TESVOLT-V2-Spezifikation nennt Port `1884` und eine erforderliche
Autorisierung. Der Broker war auf 1884 daher erreichbar; die Ablehnung lag in
der Authentifizierung oder Broker-ACL. TESVOLT hatte zusätzlich erklärt, dass
die Gateway-Konfiguration standardmäßig auf Wendeware zugeschnitten sein kann
und für andere Clients manuell angepasst werden muss.

## Neue MQTT-Felder im Gerätedialog

Für alle MQTT-Geräte stehen jetzt direkt im benutzerdefinierten Gerätedialog
zur Verfügung:

```text
MQTT Transport: mqtts / mqtt / wss / ws
Broker URL oder Host/IP
MQTT Port
Feste MQTT Client-ID
Username
Password
TLS-Zertifikat prüfen
TLS Servername / SNI
TLS CA-Datei
CONNACK Timeout
Reconnect Intervall
MQTT Keepalive
Clean Session
```

Für das Template `ess.tesvolt.iotGateway.mqttV2` gelten folgende Defaults:

```text
Transport:  mqtts
Port:       1884
Client-ID:  nexowatt-tesvolt-<Geräte-ID>
Timeout:    10.000 ms
Reconnect:  5.000 ms
Keepalive:  30 s
```

Die Client-ID ist sichtbar und dauerhaft gespeichert. Dadurch kann dieselbe
ID in der TESVOLT-Gateway-ACL freigegeben werden.

## Keine zufällige Client-ID mehr

Früher erzeugte der MQTT-Treiber ohne Konfiguration bei jedem Start eine neue
Client-ID mit Zufallssuffix. Das erschwerte Broker-ACLs und konnte bei einem
Gateway mit fest freigegebenen Client-IDs zu `Not authorized` führen.

Ab 0.5.158 wird eine stabile ID verwendet:

```text
Template-Vorgabe vorhanden:
  nexowatt-tesvolt-<Geräte-ID>

Generischer MQTT-Fallback:
  nexowatt-<Instanz>-<Geräte-ID>
```

Eine explizit eingetragene Client-ID hat immer Vorrang und wird unverändert an
den Broker übergeben.

## Aussagekräftige Verbindungslogs

Vor dem Verbindungsversuch protokolliert der Adapter ohne Geheimnisse:

```text
Broker
Client-ID
Username konfiguriert / nicht konfiguriert
TLS aktiviert / deaktiviert
Zertifikatsprüfung aktiviert / deaktiviert
```

Passwörter werden niemals geloggt. Zugangsdaten in einer URL werden für die
Logausgabe entfernt.

MQTT-Fehler werden getrennt ausgewertet:

```text
Not authorized / Broker-ACL
Bad username or password
TLS-/Zertifikatsfehler
CONNACK-/Connect-Timeout
TCP connection refused
sonstiger Transportfehler
```

Beispiel:

```text
MQTT authorization rejected; CONNACK/reason=5 (not authorized):
broker=mqtts://192.168.1.50:1884;
clientId="nexowatt-tesvolt-tesvolt1";
username=configured.
The broker is reachable. Check the TESVOLT IoT Gateway user/password
and its MQTT ACL/allowed Client-ID.
```

## Primärfehler bleibt erhalten

Ein Authentifizierungsfehler wurde bisher kurz darauf teilweise von
`MQTT connection closed` oder `MQTT heartbeat timeout` überschrieben. Dadurch
war im Datenpunkt `info.lastError` nicht mehr die eigentliche Ursache sichtbar.

Ab 0.5.158 gilt:

```text
CONNACK-/TLS-/Autorisierungsfehler
        ↓
wird als Primärfehler gespeichert
        ↓
Close/Offline/Heartbeat verwenden denselben Fehlertext
        ↓
Primärfehler wird erst nach erfolgreichem Connect gelöscht
```

Der Heartbeat bleibt weiterhin die richtige Freshness-Sicherung, kann aber die
ursprüngliche Broker-Ablehnung nicht mehr verdecken.

## TESVOLT-spezifische Regelparameter

Die bereits vorhandenen, vorher nur im JSON-Konfigurationsschema sichtbaren
Werte sind jetzt auch im tatsächlichen Gerätedialog einstellbar:

```text
Sollwert-Wiederholung:           5.000 ms
EOS-Sollwert-Timeout:           20.000 ms
Telemetrie-Stale-Timeout:        5.000 ms
Sollwert-Tracking-Verzögerung:   3.000 ms
```

Die Leistungsvorgabe, Vorzeichenumrechnung, dynamischen Grenzen, zyklische
Wiederholung und 0-W-Failsafes aus 0.5.153 bleiben unverändert.

## Feldtest

Empfohlene Konfiguration:

```text
Transport:  mqtts
Host/IP:    <TESVOLT-IoT-Gateway>
Port:       1884
Client-ID:  nexowatt-tesvolt-tesvolt1
Username:   laut Gateway-Konfiguration
Password:   laut Gateway-Konfiguration
```

Danach ist die erste Logzeile entscheidend. Bei einer erneuten
`authorization rejected`-Meldung ist Port 1884 erreichbar; dann muss exakt die
im Log genannte Client-ID zusammen mit Benutzer und Topic-ACL im Gateway
freigegeben werden. Bei einem TLS-Fehler sind dagegen CA, SNI und
Zertifikatsprüfung zu kontrollieren.

## Rückwärtskompatibilität

Die Änderung betrifft nur MQTT-Verbindungsparameter, Diagnose und Admin-UI.
Nicht verändert wurden:

- TESVOLT MQTT Topics und JSON-Payloads
- Leistungs- und Vorzeichenlogik
- Sollwert-Watchdog und zyklisches Refresh
- bestehende Rohdatenpunkte
- `aliases.*`
- `aliases.v1.*`
- andere Hersteller-Templates
