# TESVOLT IoT Gateway – EMS / V2, Version 0.5.163

## Ursache und Grundlage

Die TESVOLT-Antwort vom 15.09.2026 bestätigt paralleles **Lesen** bei weiterhin laufendem TEM. Der beigefügte MQTT-Explorer-Screenshot zeigt `EMS/Inverter/...`, `EMS/Battery/...`, `EMS/Bifi` und `EMS/Parameters`. Der bisherige Adapter abonnierte ausschließlich `EMS/APIVersion` und `EMS/V2/#`; die tatsächlichen unversionierten Topics konnten so nicht empfangen werden.

`localhost` ist im Screenshot der Name der MQTT-Explorer-Verbindung, kein Teil des Topic-Pfads und keine einzutragende Gateway-Adresse.

Basis dieser Korrektur ist das hochgeladene vollständige Repository 0.5.162. Alle anderen Hersteller-Templates sowie alle bisherigen TESVOLT-Rohdatenpunkte und Alias-Pfade sind unverändert. Der technische Template-Schlüssel `ess.tesvolt.iotGateway.mqttV2` bleibt erhalten; der Anzeigename umfasst nun EMS / V2.

## Einrichtung für diese Anlage

Im bestehenden TESVOLT-Gerät folgende Einstellungen speichern:

| Einstellung | Wert |
|---|---|
| Kategorie / Hersteller | ESS / TESVOLT |
| Template | TESVOLT IoT Gateway (MQTT EMS / V2) |
| Protokoll / Transport | MQTT / `mqtt` |
| Broker | Tatsächliche lokale IP des IoT Gateways |
| Port | `1884` |
| Benutzername / Kennwort | Der von TESVOLT geprüfte Zugang |
| Client-ID | Eine eigene, innerhalb dieses Brokers eindeutige ID, z. B. `nexowatt-vosskamp-ess1` |
| TESVOLT Topic-Format | Für den Screenshot: `EMS/... (ohne V2)`; alternativ automatisch beim Lesen |
| Leistungssteuerung durch NexoWatt EOS aktivieren | Für paralleles Auslesen **aus** |

Speichern und den Adapter neu starten. Das Gateway muss nicht neu gestartet werden. Den Speicher beim parallelen Lesetest noch nicht der aktiven EOS-Leistungsregelung zuordnen.

**Update-Verhalten:** Fehlt die neue Einstellung `tesvoltControlEnabled`, gilt immer Lesebetrieb. Auch bestehende V2-Steuerinstallationen müssen für die weitere Regelung bewusst `EMS/V2/...` und die Steuerfreigabe speichern. Brokeradresse, Zugangsdaten und andere Geräte werden nicht automatisch geändert.

Im Lesebetrieb wird kein MQTT-PUBLISH gesendet – auch keine EMS-Registrierung und kein 0-W-Sollwert bei Start, Wiederverbindung oder Stopp. Eine lesende Verbindung benötigt keine Schreibrechte.

## Topic-Zuordnung und Diagnose

Automatik liest zunächst `EMS/#` und bindet die erste erkannte passende Namespace an die bestehenden Werte. Für eine bekannte Anlage ist die feste Auswahl eindeutig. Bei verweigerten Wildcards werden bekannte Topics einzeln abonniert. Zugängliche Messwert-Topics genügen für den Empfang; fehlende optionale Topics verhindern nicht mehr alle anderen Daten. Ein positiver SUBACK allein bestätigt noch keinen Datenfluss.

| Tatsächliches Topic | Inhalt / wichtige Datenpunkte |
|---|---|
| `EMS/Inverter/Parameters` | Seriennummer, Nennleistungen, optionale Fähigkeiten; zusätzlich vollständiges JSON |
| `EMS/Inverter/Measurements` | AC-/DC-Spannungen, Wirk-/Blindleistung; `aCTIVE_POWER` |
| `EMS/Inverter/Limits` | AC-Lade-/Entladegrenzen; `aLLOWED_CHARGE_POWER`, `aLLOWED_DISCHARGE_POWER` |
| `EMS/Inverter/Energy` | Lade-/Entladeenergie |
| `EMS/Inverter/State` | Wechselrichterzustand |
| `EMS/Inverter/Control` | Beobachteter Control-Payload; `iNVERTER_CONTROL_JSON` |
| `EMS/Battery/Parameters` | Kapazität, optionale Fähigkeiten; zusätzlich vollständiges JSON |
| `EMS/Battery/Energy` | `bATTERY_SOC`, Energieinhalt |
| `EMS/Battery/Electrical` | DC-Spannung, Leistung, DC-Limits |
| `EMS/Battery/SystemState` | `bATTERY_SYSTEM_STATE_TEXT`, numerischer Zustand |
| `EMS/Battery/Errors` | Fehlerliste |
| `EMS/Battery/Control` | Nur lesende Anzeige; `bATTERY_CONTROL_JSON` |
| `EMS/Bifi` | Separate Bifi-Identität; `bIFI_SERIAL_NUMBER` |
| `EMS/Parameters` | Identität/Software des vorhandenen TEM |

Die entsprechenden V2-Daten werden weiterhin aus `EMS/V2/...` gelesen. Bifi wird nicht fälschlich als Seriennummer des IoT Gateways ausgegeben. Nicht veröffentlichte Felder werden nicht erfunden.

Neue Diagnosewerte unter `devices.<Geräte-ID>.`:

- `mQTT_ACTIVE_TOPIC_PREFIX`: `EMS/`, `EMS/V2/` oder Warten auf Daten.
- `mQTT_CONTROL_ENABLED`: konfigurierte Steuerfreigabe.
- `mQTT_CONTROL_STATUS`: `monitoring_only`, Bereitschaft oder konkreter Sperrgrund.

Vorhandene Diagnosewerte zeigen SUBACK, Topic-Liste und Nachrichtenanzahl. `mQTT_TELEMETRY_MESSAGE_COUNT` zählt empfangene Geräte-Topics, auch noch nicht zugeordnete; tatsächliche Datenfrische wird separat geprüft. `aliases.r.online` und Heartbeat werden nur von verwendbaren aktuellen Mess-/Statusnachrichten aktualisiert. Metadaten und Control-Echos genügen dafür nicht.

Der Screenshot muss z. B. SOC `34,5 %`, Wechselrichter-DC-Spannung `949,2 V`, Batterie-DC-Spannung `947,7 V`, AC-Lade-/Entladegrenzen `92.000 W` und Batteriezustand `restricted` liefern. Die Vorzeichenumrechnung bleibt wie im bestehenden Herstellerprofil: TESVOLT `Power=+20 W` wird in EOS zu `-20 W` (Laden). Die Vorzeichen sind im Feld vor aktiver Regelung anhand des tatsächlichen Energieflusses abzugleichen; ein Screenshot bei nahezu 0 W beweist sie allein nicht.

## Leistungssteuerung

TESVOLT hat in der aktuellen Nachricht **nur den parallelen Lesezugriff bestätigt**. Gleichzeitige aktive Regelung durch TEM und EOS ist damit nicht zugesagt.

Nach abgestimmter Übergabe der Regelung:

1. Passendes Topic-Format fest auswählen; Automatik erlaubt keine Schreibbefehle.
2. Steuerfreigabe aktivieren und erforderliche Publish-Rechte einrichten.
3. `mQTT_CONTROL_STATUS`, frische Zustände/Limits und `iNVERTER_SUPPORTED_CONTROL` prüfen.
4. Bestehende EOS-Speicher-Sollwertaliase verwenden; zyklische Sollwerte und Watchdog bleiben aktiv.

Das unversionierte Profil veröffentlicht auf `EMS/Inverter/Control`; V2 auf `EMS/V2/Inverter/Control`. Bestehendes Payload-Schema und Vorzeichen bleiben erhalten, z. B. 5 kW Entladen aus EOS:

```json
{"Power":-5000,"Reactive_Power":0,"State":"grid_connected"}
```

`State` folgt wie bisher den gemeldeten Fähigkeiten. QoS 0, `retain=false`; Wiederholung standardmäßig alle 5 Sekunden, EOS-Sollwerttimeout 20 Sekunden. Nach Wiederverbindung wird kein alter Nicht-Null-Befehl automatisch fortgesetzt. Im aktivierten Steuerbetrieb gelten weiterhin die bisherigen 0-W-Failsafes.

V2 verlangt weiterhin `APIVersion=V2`. Beim explizit gewählten unversionierten EMS-Profil wird keine nicht veröffentlichte API-Version verlangt. Für beide Profile bleibt `Power` in `supported_control` erforderlich. Eine beobachtete `Control`-Nachricht beweist weder eigene Schreibrechte noch die Annahme eines EOS-Sollwerts.

**Grenzen des vorliegenden Nachweises:** Der Screenshot zeigt `restricted`; damit bleiben Nicht-Null-Befehle gesperrt. Im sichtbaren Ausschnitt ist außerdem kein `supported_control` nachgewiesen. Fehlt es auch im vollständigen Parameters-Payload, muss TESVOLT die unterstützten Steuerfelder bereitstellen bzw. die passende Schnittstellenkonfiguration bestätigen. Diese Prüfungen werden nicht durch eine vermutete Freigabe ersetzt. Der Schreibpfad wurde mit explizit simulierten Fähigkeiten und Normalzustand getestet; eine funktionierende Leistungsregelung an dieser realen Anlage ist dadurch noch nicht bestätigt.

`EMS/Parameters` wird im unversionierten Profil nie überschrieben. Die V2-Identitätsregistrierung erfolgt nur bei aktivierter V2-Steuerung. `Battery/Control` bleibt im Steuerpfad gesperrt; es werden keine Batterie-Schütze durch NexoWatt geschaltet.

## Validierung

Die anonymisierte Screenshot-Fixture umfasst ausschließlich lesbare Felder des Anhangs. Für Live-Replays werden die Zeitstempel auf den Testzeitpunkt gesetzt; alte Zeitstempel werden separat geprüft.

Tests decken beide Namespaces, die bestehenden Aliase, Lesebetrieb ohne Publishes, MQTT-Wiederverbindung, Einzel-Topic-ACL-Fallback, Vorzeichen, Payloads, Limits, fehlende Fähigkeiten, `restricted`, Watchdogs und veraltete retained Nachrichten ab. Drei Tests verwenden den echten MQTT.js-Client über lokale TCP-Verbindungen und einen kontrollierten Testbroker. Ohne installierte npm-Abhängigkeiten werden nur diese Transporttests übersprungen; für vollständige Freigabe deshalb zuerst `npm install` ausführen.

Keine Verbindung zum Kunden-Gateway und kein Hardwaretest wurden durchgeführt.
