# TESVOLT IoT Gateway – MQTT-Datenempfang und EMS-V2-Bootstrap (0.5.160)

> Historischer Versionsstand. Für die Einrichtung ab 0.5.163 gilt [TESVOLT EMS / V2](TESVOLT_EMS_TOPICS_0.5.163.md), insbesondere Port 1884 ohne TLS, unversionierte Topics und der standardmäßige Lesebetrieb.

## Ausgangslage

Der MQTT-Broker des TESVOLT IoT Gateways akzeptierte den NexoWatt-Client auf Port 1884, es kamen jedoch keine Mess- oder Statusdaten im Adapter an. Ein erfolgreicher MQTT-CONNACK bestätigt nur die Anmeldung; Leserechte für Topics und die aktive Veröffentlichung der EMS-V2-Daten sind damit noch nicht nachgewiesen.

## Korrekturen

- TESVOLT wird entsprechend der Herstellerantwort standardmäßig mit `mqtt://<Gateway>:1884` ohne TLS eingerichtet. Benutzername und Kennwort dienen der Authentifizierung.
- Der Adapter abonniert die in der V2-Spezifikation vorgesehene API-Version `EMS/APIVersion` sowie `EMS/V2/#`.
- Wird der Wildcard-Filter durch eine manuelle Broker-ACL abgelehnt, versucht der Adapter automatisch die bekannten V2-Topics einzeln.
- SUBACK-Ergebnisse werden ausgewertet. Eine angenommene Brokerverbindung bei gleichzeitig verweigerten Topic-Abonnements wird klar als Protokoll-/ACL-Fehler gemeldet.
- Das in der Spezifikation vom externen EMS geforderte retained Identitätsobjekt wird auf `EMS/V2/Parameters` veröffentlicht. Enthalten sind `ts_create`, eine stabile NexoWatt-EMS-Seriennummer und die Adapterversion.
- Ein Zeitwächter meldet, wenn Verbindung und Abonnements bestehen, aber keine V2-Telemetrie vom Gateway eintrifft.
- Unbekannte neue `EMS/V2/...`-Topics werden als Diagnose erfasst, ohne bestehende Datenpunktzuordnungen zu verändern.

## Neue Diagnosedatenpunkte

- `mQTT_SUBSCRIPTION_OK`
- `mQTT_SUBSCRIPTION_STATUS`
- `mQTT_SUBSCRIPTION_COUNT`
- `mQTT_BOOTSTRAP_STATUS`
- `mQTT_EMS_PARAMETERS_PUBLISHED`
- `mQTT_LAST_TOPIC`
- `mQTT_LAST_MESSAGE_MS`
- `mQTT_MESSAGE_COUNT`
- `mQTT_GATEWAY_MESSAGE_COUNT`
- `mQTT_TELEMETRY_MESSAGE_COUNT`
- `mQTT_UNKNOWN_TOPIC_COUNT`
- `mQTT_DISCOVERED_TOPICS_JSON`

## Erforderliche Gateway-ACL

Lesen/Abonnieren:

- `EMS/APIVersion`
- `EMS/V2/#`

Schreiben/Publizieren:

- `EMS/V2/Parameters`
- `EMS/V2/Inverter/Control`

`EMS/V2/Battery/Control` bleibt im NexoWatt-Steuerpfad weiterhin gesperrt.

## Rückwärtskompatibilität

Die Änderung betrifft ausschließlich das additive TESVOLT-IoT-Gateway-Template und die allgemeine MQTT-Diagnose. Bestehende Rohdatenpunkte, Legacy-Aliase, Alias Contract v1, Speicher-Vorzeichen, Leistungsgrenzen und alle anderen Hersteller-Templates bleiben unverändert.
