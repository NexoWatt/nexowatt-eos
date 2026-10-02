# Implementierungsprüfung – NexoWatt Devices 0.5.169

Stand: 25.09.2026. Grundlage ist das vollständige hochgeladene Repository 0.5.168. Das zweite Projektarchiv enthält 0.5.89 und wurde nicht als Änderungsbasis verwendet.

## Ergebnis und Grenzen

Mehrere reproduzierbare Softwarefehler wurden korrigiert. Die Prüfung umfasst Datenempfang, Verarbeitung, Online-Erkennung, ausgewählte Transportwege und die vorhandenen Regressionstests. Sie ist keine vollständige Freigabe aller Geräte an realer Hardware.

Bei TESVOLT sind alle im bisherigen MQTT-Explorer-Screenshot sichtbaren Messwerte bereits zugeordnet. Der Screenshot ist beschnitten; ein aktueller vollständiger Gateway-Export liegt nicht vor. Deshalb ist noch nicht bestätigt, welche zusätzlichen Werte diese konkrete Anlage veröffentlicht und ob sie nach dem Update vollständig als einzelne Messwerte verfügbar sind. Es wurden keine unbekannten Herstellerfelder, Register oder Einheiten geraten.

## Korrigierte Fehler

| Bereich | Bisheriger Fehler | Korrektur |
|---|---|---|
| TESVOLT EMS/V2-Automatik | Bereits alte gespeicherte Metadaten konnten das Topic-Format festlegen; aktuelle Werte des anderen Formats wurden anschließend verworfen. | Bindung an den ersten aktuellen, auswertbaren Mess-/Statuswert. Metadaten des gewählten Formats werden nachgereicht; reine JSON-Diagnosen bestimmen das Format nicht. Ein Formatwechsel nach Wiederverbindung löscht vorherige Messwerte und Aliase, bevor neue Daten übernommen werden. |
| MQTT-Zahlen | Numerische JSON-Strings konnten Skalierung oder Vorzeichenwechsel umgehen. | Zahl vor den Transformationen prüfen und umwandeln; fehlende Werte bleiben fehlend. |
| TESVOLT Datenfrische | Fehlende State-Felder konnten über einen Standardwert als Daten zählen. | Fehlende/null-Felder und ungültige Zeitstempel bestätigen keinen Heartbeat. Roh-JSON und Metadaten bleiben von Live-Daten getrennt. |
| TESVOLT Teilzugriff | Erfolgreiche Einzelabonnements verdeckten andere verweigerte Topics. | Teilerfolg und verweigerte Topics stehen in der Abonnementdiagnose. Zugängliche Daten werden weiter empfangen. |
| TESVOLT Diagnose | Zusätzliche Felder in Messwertnachrichten waren ohne eigenen Datenpunkt unsichtbar. | Zwölf vollständige JSON-Datenpunkte für bekannte Topics ergänzt. Fehler-/Metadatennachrichten können Aliase aktualisieren, ohne Online-Status oder vorhandene Fehler zu überschreiben. |
| MQTT Client-ID | Standard-ID konnte bei gleichen Geräte-IDs in mehreren Adapterinstanzen kollidieren; Admin verwendete immer Instanz 0. | Instanzbezogener Standard in Treiber und Admin. Gespeicherte manuelle IDs werden beibehalten. |
| Admin | TESVOLT-Format und Steuerfreigabe fehlten in der JSON-Konfiguration. | Beide Einstellungen sind dort ebenfalls verfügbar, Standard bleibt nur Lesen. |
| Runtime | Leere, null- oder ungültige Leseantworten erzeugten einen erfolgreichen Heartbeat. | Online-Erkennung verlangt mindestens einen verwendbaren bekannten Datenpunkt. Echte 0-W-Werte bleiben gültig. |
| Startdiagnose | MQTT-/CANbus-Startfehler bzw. während des Starts gemeldete Fehler konnten überschrieben werden. | Ausgangszustand vor Verbindungsaufbau setzen; danach gemeldete Ergebnisse bewahren. |
| Globale Verbindung | Aktivierte Konfiguration genügte für das globale Verbindungssymbol. | Tatsächliche Online-Heartbeats der gestarteten Geräte werden ausgewertet. |
| HTTP | Fehler aller angefragten Endpunkte wurden verschluckt. | Ursprünglichen Fehler weitergeben; erfolgreiche Teilantworten bleiben nutzbar. Schreibpunkte werden nicht als Leseanfrage ausgeführt. |
| UDP | Gleichzeitige Lese- und Schreibanforderungen konnten dieselbe Antwort übernehmen. | Gemeinsame Warteschlange, Antwortprüfung nach Port und bei IP-Konfiguration auch Adresse, Abbruch offener Aufträge beim Trennen. |

## TESVOLT nach dem Update prüfen

1. Bestehendes Gerät unter ESS → TESVOLT → **TESVOLT IoT Gateway (MQTT EMS / V2)** weiterverwenden. Template-ID und bestehende Rohdaten-/Alias-Pfade bleiben erhalten.
2. Für die bisher gezeigte Anlage **EMS/... (ohne V2)** wählen. Brokeradresse und den funktionierenden Herstellerzugang beibehalten, Verbindung `mqtt://<Gateway-IP>:1884`.
3. **Leistungssteuerung ausgeschaltet lassen**, solange parallel zum TEM gelesen wird. Eine Steuerfreigabe ist zum Datenlesen nicht erforderlich. Gespeicherte Steuerfreigaben werden durch das Update nicht umgestellt.
4. Eigene eindeutige Client-ID je Verbindung verwenden. Zwei getrennte EOS-Systeme mit gleicher Instanz- und Geräte-ID benötigen weiterhin unterschiedliche ausdrücklich konfigurierte IDs; die Instanzergänzung allein unterscheidet keine separaten Installationen.
5. Nach Installation Adapter neu starten, Admin-Dateien mit `iobroker upload nexowatt-devices` aktualisieren und Browser mit Strg+F5 neu laden.
6. Unter `nexowatt-devices.0.devices.<Geräte-ID>.` die folgenden Werte prüfen. Bei anderer Instanz die `0` anpassen.

| Datenpunkt | Verwendung |
|---|---|
| `mQTT_ACTIVE_TOPIC_PREFIX` | Für diese Anlage sollte nach erkannten Daten `EMS/` erscheinen. |
| `mQTT_SUBSCRIPTION_STATUS` | Annahme, Teilerfolg und verweigerte Topics erkennen. |
| `mQTT_DISCOVERED_TOPICS_JSON` | Tatsächlich beobachtete Topics einschließlich noch nicht zugeordneter Topics. |
| `mQTT_UNKNOWN_TOPIC_COUNT` | Anzahl empfangener Nachrichten auf noch nicht zugeordneten Topics. |
| `aliases.r.online` / `aliases.r.lastSeenMs` | Datenempfang und letzte erkannte Aktualität beurteilen. |
| `iNVERTER_MEASUREMENTS_JSON` | Vollständige Wechselrichter-Messwertnachricht. |
| `iNVERTER_LIMITS_JSON` / `iNVERTER_ENERGY_JSON` | Grenzwerte und Energiezähler im Originalformat. |
| `bATTERY_ENERGY_JSON` / `bATTERY_ELECTRICAL_JSON` | Batterieenergie, SOC und elektrische Werte im Originalformat. |
| `bATTERY_SYSTEM_STATE_JSON` | Vollständige Batteriezustandsnachricht. |
| `iNVERTER_PARAMETERS_JSON` / `bATTERY_PARAMETERS_JSON` | Geräteparameter und vom Gateway gelieferte Fähigkeiten. |

Die JSON-Datenpunkte erhalten zusätzliche Felder innerhalb der bekannten Topics. Unbekannte neue Topics werden weiterhin als Topic-Namen diagnostiziert und nicht automatisch in Steuer-/Messwertaliase übersetzt. JSON-Werte können Diagnose- oder ältere Daten enthalten; ihre Existenz ist kein Nachweis aktueller Betriebswerte. Vorzeichen und Einheiten der bestehenden Herstellerzuordnung bleiben erhalten.

Falls weiterhin Werte fehlen, bitte die oben genannten Messwert-/Batterie-JSONs sowie `mQTT_SUBSCRIPTION_STATUS` und die Topic-Liste exportieren und konkret nennen, welche Anzeigen fehlen. Bei einem unbekannten Topic zusätzlich dessen vollständigen Payload aus MQTT Explorer liefern. Zugangsdaten werden dafür nicht benötigt. Damit lässt sich zwischen fehlender Veröffentlichung, verweigertem Zugriff, unbekanntem Feld und falscher Zuordnung unterscheiden.

## Kompatibilität und Validierung

- Alle 195 Templates bleiben enthalten. Ausschließlich das TESVOLT-IoT-MQTT-Template erhält additive Rohdatenpunkte und den instanzbezogenen Standard der Client-ID; alle bestehenden TESVOLT-Datenpunktdefinitionen und alle anderen 194 Templates bleiben unverändert.
- Bestehende VARTA-Lesbarkeitskorrekturen sind enthalten. Keine neuen npm-Abhängigkeiten.
- Leistungssteuerung, Grenzwertprüfung, Watchdogs und Betriebsfreigaben wurden mit Regressionstests geprüft; kein automatisches Aufheben von Sperren.
- Die Tests verwenden simulierte Gerätedaten sowie für MQTT/Modbus echte lokale TCP-Verbindungen mit kontrollierten Testgegenstellen. Kein Test am Kundengateway, an Speichern oder Wallboxen; kein direkter Windows-Installationsversuch.
- **260 automatisierte Tests bestanden, 0 Fehler, 0 ausgelassene Tests.** Darunter 45 TESVOLT-Tests mit fünf echten MQTT.js-/TCP-Testverbindungen. Release-Guard bestanden. Laufzeit: Linux, Node 24.19.0, npm 11.9.0. Weitere Angaben stehen in `BUILD_INFO.txt`.

Das vollständige Repository enthält Quellcode, Admin-Dateien, synchronisierte Templates, Paketmanifest/-Lockdatei, Tests und Dokumentation. Installation oder Veröffentlichung auf dem Kundensystem wurde nicht vorgenommen.
