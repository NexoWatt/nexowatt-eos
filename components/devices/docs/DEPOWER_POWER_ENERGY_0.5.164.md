# DEPower – Sollwerte, Rücklesen und Energieauflösung ab 0.5.164

Diese Version enthält die TESVOLT-EMS/MQTT-Korrekturen aus 0.5.163. Bestehende Geräte-, Template- und Alias-IDs bleiben erhalten.

## Befund und Korrektur

Die Schreibwarteschlange änderte einen Eintrag während dessen Modbus-Aufruf noch lief. Ein später eingetroffener Sollwert konnte dadurch bestätigt und anschließend gelöscht werden, obwohl nur der frühere Wert gesendet worden war. Reproduziert wurde beispielsweise die Reduzierung von 11.000 auf 4.200 W. Neue Befehle ersetzen jetzt den Warteschlangeneintrag; der laufende Schreibvorgang kann seinen Nachfolger weder bestätigen noch löschen. Auch ein Fehler des alten Auftrags verbraucht keine Wiederholungsversuche des neuen Auftrags. Vom Treiber angepasste Werte werden korrekt bestätigt.

Die DEPower-Steuerfolgen sind zusätzlich vollständig serialisiert. Gleichzeitige Aufrufe können nicht mehr über einen gemeinsam genutzten Rekursionszähler die Reihenfolge umgehen. Die vorhandene Prepare-Behandlung und die Begrenzung der Stationsleistung bleiben erhalten.

DEPower-Steueraliase werden nur nach einem erfolgreichen Schreibaufruf bestätigt. Der Poll bestätigt keinen lediglich vorgemerkten oder abgelehnten Befehl. `r.powerLimitW` wird ausschließlich aus dem gelesenen Register aktualisiert; eine FC16-Antwort wird nicht als Geräte-Rückmeldung eingesetzt. Ein Modbus-Schreibabschluss belegt allein noch nicht, dass das Fahrzeug mit dieser Leistung lädt.

## EOS-Zuordnung für eine DC-Ladestation

Präfix: `nexowatt-devices.0.devices.<Geräte-ID>.aliases.v1.`

| Zweck | Pfad relativ zum Präfix | Einheit / Wert |
| --- | --- | --- |
| Leistungs-Sollwert schreiben | `ctrl.powerLimitW` | W; 4,2 kW = **4200**, `ack=false` |
| Laden freigeben / stoppen | `ctrl.run` | Boolean; true / false, `ack=false` |
| Vom Gerät gemeldetes Limit | `r.powerLimitW` | W; nur lesen |
| Gemessene Ladeleistung | `r.power` | W; nur lesen |
| Sitzungsenergie | `r.energySession` | Wh |
| Gesamtzähler | `r.energyTotal` | Wh |

Im EOS-Ladepunkt muss der Anschluss als **DC**, die Regelungsbasis als **Leistung / powerW** und die gewünschte Min+PV-Mindestleistung als **4200 W** konfiguriert sein. Die tatsächliche Vorgabe kann durch PV-Angebot, Standortgrenzen und Ladefreigaben abweichen. Der Geräteadapter berechnet den Min+PV-Sollwert nicht selbst und setzt keine pauschale Mindestleistung für andere Anlagen.

Bestehende EOS-Zuordnungen auf einen alten Gerätepfad oder auf den nur lesbaren `r.powerLimitW` müssen in der installierten EOS-Konfiguration berichtigt werden. Dieses Repository enthält den Geräteadapter; es ändert keine laufende EOS-Instanz. In der verfügbaren EOS-Referenz wird eine bereits eingetragene Zuordnung nicht automatisch ersetzt.

## Registerprüfung

Quelle ist die bereitgestellte Arbeitsmappe `ModBus&TCP-protocol_V10.03-V6(1)(1).xlsx`. Ihre Registeradressen sind bereits nullbasiert. Die Prüfung ergab keinen belegten Anlass, benachbarte Register probeweise zu beschreiben.

| Funktion | Connector 1 | Connector 2 | Kodierung |
| --- | --- | --- | --- |
| Charge mode | 0x0013 | 0x0013 | FC16, UInt16, 1 = command |
| Connector-Leistungslimit | 0x0122 | 0x0222 | FC16 schreiben / FC3 lesen; UInt32, W |
| Start / Stop | 0x0121 | 0x0221 | FC16, UInt16; 1 = Start, 2 = Stop |
| Gesamtenergie | 0x0113 | 0x0213 | FC3, UInt32 |
| Sitzungsenergie | 0x0115 | 0x0215 | FC3, UInt32 |

4.200 W ergeben bei BE/BE die zwei Registerwörter `[0, 4200]` (`0x0000`, `0x1068`). Eine bereits positive Stationsbegrenzung wird nicht angehoben. `fALLBACK_CURRENT` ist kein laufender DC-Stromsollwert.

## Energie und Faktorfehler

Leistung in kW und geladene Energie in kWh sind unterschiedliche Größen. Die gezeigten 10.927 W entsprechen korrekt 10,927 kW. Eine geladene Energiemenge von 1,81 kWh entspricht dagegen **1810 Wh**.

Die Protokolltabelle nennt für beide Energiezähler **0,1 kWh pro Rohzählschritt = 100 Wh pro Zählschritt**. Dieser dokumentierte Standard bleibt voreingestellt. Die Screenshots enthalten keine zeitgleichen Rohregister und Referenzzählerstände, mit denen sich eine abweichende Firmwareauflösung beider Zähler eindeutig bestimmen ließe. Ein Faktor 100 für die Tagesanzeige beweist nicht denselben Faktor für den Sitzungszähler.

Im Geräte-Dialog lassen sich unter **DEPower – Energiezähler** beide Auflösungen getrennt auswählen:

| Konfiguration | Bedeutung | Standard |
| --- | --- | --- |
| `connection.depowerSessionEnergyWhPerTick` | Wh je Rohzählschritt des Sitzungszählers | 100 |
| `connection.depowerTotalEnergyWhPerTick` | Wh je Rohzählschritt des Gesamtzählers | 100 |

Zulässige Werte: 0,1 / 1 / 10 / 100 / 1000 Wh. Die Umrechnung erfolgt genau einmal im Treiber nach kWh; die bestehenden v1-Aliase wandeln anschließend nach Wh. Die Rohdatenpunkte heißen `eNERGY_SESSION_RAW` und `mETER_ENERGY_TOTAL_RAW`. Sie lesen dieselben Register ohne Skalierung. Die Umrechnung verändert weder Leistung noch Sollwerte.

Zur Bestimmung jeweils gleichzeitig Rohzähler und Stationsanzeige ablesen. Für den Gesamtzähler sind zwei Messpunkte während derselben Sitzung hilfreich: `Wh je Zählschritt = zusätzliche Energie in kWh × 1000 / zusätzliche Rohzählschritte`.

Rechenbeispiele, **keine Messung der Kundenanlage**:

- Rohwert 1810 und nachgewiesene Auflösung 1 Wh/Zählschritt ergeben 1810 Wh = 1,81 kWh. Mit dem Tabellenstandard wären es 181 kWh.
- Rohwert 311 und nachgewiesene Auflösung 10 Wh/Zählschritt ergeben 3110 Wh = 3,11 kWh.

EOS muss für die v1-Energiealiase die Eingabeeinheit Wh verwenden. Historische Tagesbasen und bereits gespeicherte Statistiken werden durch das Umstellen eines aktuellen Zählerfaktors nicht rückwirkend berichtigt. Die EOS-Tagesbasis muss zum korrigierten Gesamtzähler passen; vorherige Daten dürfen nicht ohne passenden Zeitraum/Faktor pauschal umgerechnet werden.

## Diagnose nach dem Update

`devices.<Geräte-ID>.info.depowerControl` zeigt als JSON den zuletzt in diesem Adapterlauf angeforderten Leistungswert und ein tatsächlich gepolltes Registerlimit:

- `no_command`: Seit Adapterstart wurde noch kein Leistungsbefehl registriert. Ein vorhandenes Limit der Station wird nicht als EOS-Auftrag übernommen.
- `pending`: Ein Auftrag wartet noch auf Abschluss; es gibt noch keine Bestätigung dieses Auftrags.
- `readback_matches`: Gelesenes Limit und angeforderter Wert stimmen überein.
- `readback_differs`: Der aktuelle Registerwert weicht von der Vorgabe ab. Geräte-/Kommunikationsfehler stehen zusätzlich unter `info.lastError`.

`requestedW`, `readbackW`, `lastWriteAt` und `readbackAt` halten die Werte und Zeitpunkte auseinander. Bei Verbindungsverlust bleibt der letzte Befund mit seinem alten Zeitstempel stehen; `info.connection` beziehungsweise `r.online` zeigt die fehlende Verbindung. Eine übereinstimmende Register-Rückmeldung ist keine Messung der Fahrzeugleistung.

Wenn Min+PV weiter 0 W als EMS-Sollwert anzeigt und `no_command` gemeldet wird, zuerst EOS-Zuordnung und Mindestleistung prüfen. Wird 4200 angefordert, aber 11000 zurückgelesen, sind Befehlsannahme beziehungsweise ein anderer schreibender Teilnehmer zu prüfen. Für die verbleibende Energiekalibrierung werden zeitgleiche Rohwerte und Stationszählerstände benötigt.

## Prüfung und Grenzen

Automatisierte Regressionen prüfen überlappende Befehle, Fehler während eines laufenden Schreibvorgangs, beide Alias-Namensräume, unabhängige Zählerauflösung und die Trennung zwischen Auftrag und Rückmeldung. Zwei Tests verwenden den echten `modbus-serial`-TCP-Client gegen einen lokalen Registerserver: Alias → FC16 → FC3, Connector 1 und 2, exakte 4200-W-Kodierung, ignorierte und abgelehnte Vorgaben sowie Energie-Rohwerte und Umrechnung. Die Gesamtsuite enthält weiterhin die TESVOLT-Tests mit echtem MQTT.js/TCP-Transport.

Keine Verbindung zur Kundenanlage, keine Messung der DEPower-Firmware und kein echter Ladeversuch wurden durchgeführt. Das erforderliche Hardware-Minimum und die konkrete Energieauflösung lassen sich aus dem Adaptertest nicht ableiten.
