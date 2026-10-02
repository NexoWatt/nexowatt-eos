# Technische Versionshinweise

## 0.5.169 – Implementierungsprüfung und TESVOLT-Datenempfang

- Automatische EMS-/V2-Erkennung wartet auf aktuelle, auswertbare Telemetrie. Alte Metadaten können das falsche Format nicht mehr festlegen.
- Fehlende/null-Felder, Roh-JSON und ungültige Zeitstempel bestätigen keine Datenfrische. Numerische JSON-Strings werden vor Skalierung und Vorzeichenwechsel verarbeitet.
- Zwölf vollständige TESVOLT-JSON-Nachrichten ergänzt; Teilablehnungen der MQTT-Abonnements sind sichtbar. Bestehende Messwertpfade bleiben erhalten.
- Client-ID-Vorschläge und Laufzeitstandard berücksichtigen die Adapter-Instanz. TESVOLT-Format und Steuerfreigabe auch im JSON-Admin verfügbar.
- Leere/ungültige Leseantworten erzeugen keinen Heartbeat. Startfehler bleiben sichtbar; globale Verbindung folgt realen Geräte-Heartbeats.
- HTTP gibt vollständige Anfrageausfälle weiter. UDP serialisiert Abfragen und Befehle, prüft Antwortquellen und bricht offene Aufträge beim Trennen ab.
- [Prüfbericht und TESVOLT-Feldprüfung](IMPLEMENTATION_AUDIT_0.5.169.md). Kein Test am realen Gateway; weitere individuelle Feldzuordnungen benötigen dessen vollständige JSON-Nachrichten.

## 0.5.168 – Lesbare VARTA-Einstellungen im dunklen Admin

- Weißen Materialize-Hintergrund der Herstellerpanels durch die vorhandene dunkle NexoWatt-Fläche ersetzt. Texte und Feldbeschriftungen erhalten einen ausdrücklichen, kontrastreichen Vordergrund.
- Auswahlfelder einschließlich Optionen sowie Checkboxen passen zum dunklen Dialog. Tastaturfokus und mehrzeilige Beschriftungen bleiben sichtbar.
- VARTA-Hinweise in getrennte Abschnitte mit 14-px-Schrift und größerem Zeilenabstand gegliedert. Die Leistungsklasse bleibt auch in schmalen Ansichten verständlich.
- Gleiche Panelkorrektur für DEYE und DEPower, die dieselbe Materialize-Komponente verwenden. Keine Änderung der Treiber, Register, Aliase, Einstellungswerte oder Schreibfreigaben.

Nach dem Update die Admin-Dateien mit `iobroker upload nexowatt-devices` aktualisieren und den Browser mit Strg+F5 neu laden.

## 0.5.167 – VARTA Extended 14: Modellregister und geschützte Steuerzugriffe

- Die acht bestehenden VARTA-Templates werden anhand der bereitgestellten XLSX vom 12.03.2025 erweitert. Modellabhängige Fehler-, Timer-, Temperatur-, Nennleistungs- und Prognosewerte ergänzen den bisherigen Public-Umfang; dessen Messwerte und Template-IDs bleiben erhalten.
- UG-/OG-Grenzen mit positiven Wattbeträgen in den standardisierten Lade-/Entladegrenzaliasen, bestätigter Residential-/Commercial-Klasse, korrektem SINT16-Vorzeichen sowie Register- und Timer-Rückmeldung. Keine angenommene automatische Timerverlängerung.
- Pextra mit dokumentierter CRC16/MODBUS-Challenge-Response, 120-Sekunden-Freigabe, Token-Kompatibilitätsoption und Rücklesen. Pextra bleibt eine additive Herstellervorgabe; keine Gleichsetzung mit einem absoluten EOS-Speichersollwert und keine autonome Erneuerung alter Befehle.
- pulse-PSP, Eingaben für VARTAs Erzeugungsvisualisierung und zusätzliche SFs mit getrennten Freigaben. Frequenzregelungsregister von pulse neo/flex storage erst nach bestätigter Herstelleraktivierung; manuelle Bereitschafts-/Alive-Prüfung ohne erfundenen automatischen Heartbeat.
- Verschlüsselter Entladezähler bleibt ein Rohwert ohne Wh-Alias: echter Schlüssel und SALT fehlen in der Herstellerdatei. Keine Entschlüsselung mit dem ausdrücklich unechten Beispielschlüssel.
- Schreibzugriffe über feste Modelllisten, Identitätsprüfung, FC6, exakte Einheitenskalierung, begrenzte Auftragsgültigkeit und Rücklesen; keine automatische Wiederholung nach Verbindungsfehlern. Erweiterte Steuerzugriffe standardmäßig gesperrt, erweiterte Messwerte aktivierbar bzw. auf Public-Umfang zurückschaltbar.
- Protokoll- und Regressionstests ergänzen die Release-Prüfung; keine reale VARTA-Hardwareprüfung. Einrichtung, Registermatrix und dokumentierte Grenzen: [VARTA Extended 14](VARTA_MODBUS_EXTENDED14_0.5.167.md).

Validiert: 224 automatisierte Tests ohne Fehler oder ausgelassene Tests, Release-Guard und npm-Pack-Probelauf. Die 187 Nicht-VARTA-Templates bleiben unverändert gegenüber 0.5.166. Kein Test an realer VARTA-Hardware.

## 0.5.166 – DEYE-Testinitialisierung ohne echte serielle Transportmodule

- DEYE-Protokolltests importieren den Treiber erst nach Einrichtung ihrer Transport-Testdoubles. Ein frischer Quellordner ohne `modbus-serial` führt dadurch nicht mehr zum dateiweiten Ladeabbruch vor der ersten Prüfung. Der Ladehook wird zuverlässig zurückgesetzt.
- Neuer Regressionstest führt alle 22 DEYE-Prüfungen in einer isolierten Kopie mit blockierten Transportmodulen aus. Pfade mit Leerzeichen, vollständige Ausführung und null übersprungene DEYE-Prüfungen werden berücksichtigt.
- Vollständige Suite mit Abhängigkeiten: 187 bestanden, keine übersprungenen Tests. Ohne Abhängigkeiten: 182 bestanden und fünf vorhandene Transporttests ausdrücklich übersprungen. Release-Guard und Paketprüfung erfolgreich.
- Produktive Treiber, sämtliche 195 Templates, Aliase, TESVOLT-/DEPower-/VARTA-Korrekturen und die vorläufige DEYE-Steuerungsgrenze unverändert. Kein direkter Windows- oder Hardwaretest; nachgestellter Testimportfehler behoben.

## 0.5.165 – DEYE Hybrid: drei vorläufige RTU-Familienprofile

- Neu unter ESS → DEYE: einphasiger Hybrid, dreiphasiger LV-Hybrid und dreiphasiger HV-Hybrid. Dedizierter Treiber nach den bereitgestellten V118-/V105.4-Unterlagen, Identitäts-/Phasenprüfung; keine pauschale Modell-/Firmwarefreigabe.
- RTU-Auswahl mit 9600 Baud, 8N1, Vorschlag Unit-ID 1, Timeout 2000 ms und Offset 0. Gespeicherte serielle Einstellungen bleiben erhalten. Keine automatische Offset-Suche.
- 32-Bit-Leistung aus getrennten Low-/High-Registern, vorzeichenrichtige Dekodierung, Wh-Energiezähler und unterschiedliche LV-/HV-Einheiten. Unklare Batterie-Skalierung und Richtungen bleiben bis zur Bestätigung unbekannt. Mehrere Batterieeingänge werden nicht ungeprüft aggregiert.
- Vier dokumentierte Konfigurationsgrenzen optional freigebbar: Identität, Wertebereich/Schritt, FC16 und tatsächliches FC3-Rücklesen; keine automatischen Schreibwiederholungen. Grenzen werden nicht als aktive Lade-/Entlade-Sollwerte angeboten.
- Remote-Register bei Dreiphasen-Profilen optional lesbar; aktive Fernsteuerung mangels vollständig definierter Modi, Watchdog- und Prozentbezüge gesperrt. Herstelleranfrage auf Englisch und Deutsch im Repository.
- 186 automatisierte Tests bestanden, davon 22 neue DEYE-Tests mit simulierten RTU-Busantworten. Bestehende 192 Templates unverändert, nun 195 Templates und 2454 v1-Aliasdefinitionen. Legacy-Baseline erhalten. Keine reale DEYE-Hardwareprüfung.
- Alle TESVOLT-, DEPower- und VARTA-Änderungen aus 0.5.164 erhalten; keine neuen Abhängigkeiten.

## 0.5.164 – DEPower-Sollwertwarteschlange, Rücklesen und Energieauflösung

- Neue Leistungsbefehle bleiben erhalten, wenn sie während eines laufenden Schreibvorgangs eintreffen. Alte Erfolge und Fehler können den neuen Auftrag weder bestätigen noch löschen. Die Warteschlange bestätigt den tatsächlich vom Treiber verwendeten Wert.
- DEPower-Steuerfolgen werden vollständig serialisiert. Polling bestätigt keine ungesendeten Steueraliase; das gelesene Leistungslimit bleibt von der Schreibbestätigung getrennt.
- Sitzungs- und Gesamtzähler besitzen getrennte konfigurierbare Wh-Auflösungen sowie unskalierte Rohzähler. Der dokumentierte Standard von 100 Wh je Zählschritt bleibt erhalten. Keine pauschal geratene Faktoränderung für Bestandsanlagen.
- `info.depowerControl` unterscheidet fehlende EOS-Vorgaben, wartende Aufträge und passende/abweichende Modbus-Rückmeldungen. 4,2 kW werden als 4200 W geschrieben.
- Register, vorhandene Alias-Pfade und die TESVOLT-Korrekturen aus 0.5.163 bleiben erhalten. Echte lokale Modbus-TCP-Tests für beide Connectoren ergänzen die Gesamtsuite.
- Einrichtung, Energiekalibrierung und Prüfgrenzen: [DEPower ab 0.5.164](DEPOWER_POWER_ENERGY_0.5.164.md).

## 0.5.163 – TESVOLT EMS-Topics und paralleler Lesebetrieb

- Tatsächliche `EMS/Inverter/...`- und `EMS/Battery/...`-Topics werden zusätzlich zu `EMS/V2/...` empfangen. Auswahl automatisch beim Lesen oder fest auf EMS/EMS-V2; keine Vermischung der erkannten Gerätewerte.
- Standardmäßig reiner Lesebetrieb, auch nach einem Update ohne neue Steuerfreigabe: keine Identitäts-Publishes, keine Null-Sollwerte, keine zyklischen Steuerbefehle.
- Explizite Steuerfreigabe und festes Topic-Format leiten den bestehenden Control-Payload auf den korrekten Pfad. Keine API-Version und keine Steuerfähigkeiten werden aus dem Topic-Namen erfunden. Im unversionierten Profil entfällt ausschließlich die dort nicht belegte APIVersion-V2-Anforderung; `supported_control`, Zustände, Limits und Watchdogs bleiben erforderlich.
- `EMS/Parameters` bleibt die vorhandene TEM-Identität und wird im unversionierten Profil niemals überschrieben. `EMS/Bifi` wird als separate Bifi-Identität gelesen.
- Alte retained Telemetrie, doppelte und zukünftige Zeitstempel sowie lokale Control-Echos halten den Heartbeat nicht künstlich frisch.
- Anleitung und verbleibende Steuergrenzen: [TESVOLT EMS / V2](TESVOLT_EMS_TOPICS_0.5.163.md).

## 0.5.162 – VARTA Public 14, acht getrennte Gerätemodelle

- Grundlage ist die bereitgestellte Hersteller-PDF: intern Version 14.0 public vom 12.03.2025, Tabellenstand 14. Der ältere Dateiname wird nicht als Registerstand verwendet.
- Acht getrennte ESS-Templates unter VARTA: element, one L, one XL, element backup, pulse, pulse neo, link, flex storage. Registerumfang pro Modell nach den tatsächlichen Häkchen der PDF; kein gemeinsamer Vollumfang für alle Geräte.
- FC3-Lesegruppen ausschließlich über unterstützte zusammenhängende Register. Ein Zeichen pro Register, 32-Bit-Werte mit Low Word zuerst, SINT16-Vorzeichen, 10-Wh-Kapazität und 0,01-Hz-Frequenz werden berücksichtigt. Bei neo/flex sind die neun dynamischen SFs Bestandteil der jeweiligen Messwertumrechnung.
- Einzelanfragen werden mindestens 1 Sekunde, bei link 5 Sekunden auseinandergehalten. Ein vollständiger Messwertsatz ist deshalb nicht zwingend sekündlich verfügbar. Warteschlange je konfiguriertem Host/Port; Wiederverbindung nach Transportfehler bleibt möglich, vorher wartende SF-Befehle werden nicht wiederholt.
- Nur neun ausdrücklich dokumentierte SF-Konfigurationsregister bei pulse neo/flex storage sind beschreibbar. Standardmäßig gesperrt; explizite Expertenfreigabe, Tabellen-/Seriennummernprüfung, Zielprobe, genau ein FC6 und passendes FC3-Rücklesen erforderlich. Kein FC16-Fallback und keine automatische Start-/Watchdog-/Restore-Schreibfolge.
- Keine Lade-/Entlade-Sollwerte oder Freigaben erfunden. Das öffentliche Protokoll stellt diese nicht bereit; externe Speicherregelung ist mit diesen Profilen nicht verfügbar.
- EOS-Speicheraliase verwenden positiv Entladen / negativ Laden, Netzleistung positiv Bezug / negativ Einspeisung. Reine Verfügbarkeitswerte bleiben lesbar, nicht steuerbar. Kein fingierter Entladezähler, Spannungswert oder Steuerungsalias. Geräteklasse storageSystem; bestehender Alias Contract v1 unverändert.
- Unbekannte Tabelle oder fehlende SFs ergeben gesperrte Interpretation bzw. null statt geratenen Messwerten. Separate Diagnosen trennen Verbindung, Tabellenunterstützung und externe Steuerbarkeit.
- Automatisierte Prüfung: 145 Tests, davon 34 neue VARTA-Tests; simulierter Geräteverkehr und echter Timerabstand, keine reale VARTA-Hardwareprüfung. Bestehende 184 Templates und Legacy-Aliase bleiben unverändert. Neu insgesamt 192 Templates und 2.415 v1-Aliasdefinitionen.
- Frische Installation bestehender npm-Abhängigkeiten in dieser Umgebung mangels DNS-Auflösung nicht verifiziert; keine neuen externen Abhängigkeiten. Anleitung: `VARTA_MODBUS_PUBLIC14_0.5.162.md`.

## 0.5.161 – DEPower-Steuersequenz und Prepare-Re-Arm

- Die universellen DEPower-RW-Datenpunkte bleiben echte Geräte-Rückmeldungen und dürfen nach einem Poll wieder auf den vom Ladepunkt gemeldeten Wert zurückspringen. Sie werden nicht mehr als dauerhafter NexoWatt-Sollwert vorausgesetzt.
- `aliases.v1.ctrl.powerLimitW` und `aliases.v1.ctrl.run` sind die verbindliche Befehlsoberfläche. Vor einer positiven Leistungs-/Startvorgabe koordiniert der Treiber `Charge mode=1`, optional die Stationsleistung einer bestätigten Ein-Connector-Station, das Connector-Leistungslimit und den Startbefehl.
- Bleibt ein angeschlossenes Fahrzeug trotz positiver Vorgabe in `Prepare`, erzeugt der Treiber begrenzt eine neue Stop-zu-Start-Flanke (`2 -> 1`) nach gesetztem Modus und Leistungswert. Ein aktiver Ladevorgang wird dabei nicht unterbrochen.
- Ein bestehendes positives Stationslimit bleibt unverändert; nur ein nicht gesetzter beziehungsweise mit `0 W` zurückgemeldeter Wert wird bei bestätigter Ein-Connector-Station initialisiert.
- `Prepare` gilt nicht mehr als bestätigte Ladefreigabe. `chargingReleased=true` wird nur für `Charging` und `SuspendEV` ausgegeben; `SuspendEVSE` bleibt gesperrt.
- Register, Template-IDs, Rohdatenpunkte, bestehende Alias-Pfade und alle anderen Herstellerlogiken bleiben unverändert.

## 0.5.160 – TESVOLT MQTT-Datenempfang, SUBACK-Diagnose und EMS-V2-Bootstrap

- TESVOLT verwendet nun standardmäßig `mqtt://` auf Port `1884`, passend zur bestätigten Gateway-Konfiguration ohne TLS. Bestehende Gerätekonfigurationen werden nicht überschrieben.
- Der Adapter abonniert `EMS/APIVersion` und den V2-Filter `EMS/V2/#`. Lehnt eine manuelle ACL den Wildcard-Filter ab, werden die bekannten V2-Topics automatisch einzeln abonniert.
- MQTT-SUBACK-Ergebnisse werden vollständig geprüft. Ein akzeptierter CONNACK bei verweigerten Leserechten wird nicht mehr fälschlich nur als „verbunden“ dargestellt.
- Das laut V2-Spezifikation vom externen EMS zu veröffentlichende retained Objekt `EMS/V2/Parameters` wird mit NexoWatt-Seriennummer, Adapterversion und ISO-8601-Zeitstempel gesendet.
- Neue Diagnosedatenpunkte zeigen Abonnementstatus, Bootstrap, letztes Topic, Nachrichten-/Telemetriezähler und entdeckte unbekannte V2-Topics.
- Ein No-Data-Wächter meldet explizit, wenn Brokerverbindung und Abonnements bestehen, das IoT Gateway aber keine V2-Telemetrie veröffentlicht.
- Lokale Echos von `EMS/V2/Parameters` oder `EMS/V2/Inverter/Control` gelten nicht als Gateway-Telemetrie und können den Heartbeat nicht künstlich frisch halten.
- TESVOLT-Leistungsregelung, Vorzeichen, Sollwert-Watchdog, bestehende Aliase und alle anderen Templates bleiben unverändert.

## 0.5.159 – DEPower Charging-SOC und SOC-Alias

- Die neue DEPower-Registerdatei wurde vollständig gegen die bisherige V10.03/V6-Datei verglichen. Einzige Registeränderung ist `Charging SOC`: Connector 1 auf `0x0124`, Connector 2 auf `0x0224`, jeweils FC3, `UINT16`, Schrittweite `1 %`.
- Die beiden bestehenden Template-IDs bleiben aus Rückwärtskompatibilität unverändert. Hersteller, Anzeigename und Quelldokument werden nun korrekt als DEPower geführt.
- Neuer Rohdatenpunkt `cHARGING_SOC` je Connector; er wird als optionaler, isolierter 2-s-Leseblock abgefragt, damit ältere Firmware ohne dieses Register die bisherigen Mess- und Steuerregister nicht beeinträchtigt.
- Neue Legacy-/Standardaliase `aliases.r.soc` und `aliases.v1.r.soc` mit Einheit `%` sowie Capability `read.soc`.
- Der SOC-Alias akzeptiert nur Werte von 0 bis 100 %. Modbus-Sentinel `0xFFFF` und andere unplausible Werte bleiben im Rohdatenpunkt diagnostizierbar, werden im Alias jedoch als `null` ausgegeben.
- Unveränderte SOC-Werte werden nach erfolgreichen Ladepunkt-Polls regelmäßig frisch bestätigt, ohne bei Kommunikationsausfall eine künstliche Datenfrische vorzutäuschen.
- Alle bisherigen Register, Start-/Stop-Befehle, Leistungsbegrenzungen, Datenpunkt-IDs und bestehenden Alias-Pfade bleiben unverändert.

## 0.5.158 – TESVOLT MQTT Client-ID, TLS-Einrichtung und CONNACK-Diagnose

- Der tatsächliche Gerätedialog zeigt jetzt MQTT-Transport (`mqtts`, `mqtt`, `wss`, `ws`), Port, feste Client-ID, TLS-Zertifikatsprüfung, CA-Datei, SNI, CONNACK-Timeout, Reconnect, Keepalive und Clean Session.
- TESVOLT wird mit `mqtts`, Port `1884` und der stabilen Client-ID `nexowatt-tesvolt-<Geräte-ID>` vorbelegt. Die vier TESVOLT-Regel-/Freshness-Zeitwerte sind nun ebenfalls im benutzerdefinierten Dialog sichtbar.
- Ohne explizite Client-ID verwendet der Runtime-Treiber einen deterministischen Fallback statt des bisherigen Zufallssuffixes. Broker-ACLs können dadurch dauerhaft auf dieselbe NexoWatt-ID freigeschaltet werden.
- Die MQTT-Fehlerdiagnose unterscheidet Autorisierungs-/Zugangsdatenfehler, TLS-/Zertifikatsfehler, CONNACK-Timeout und TCP-Ablehnung. Log und `info.lastError` enthalten Broker und wirksame Client-ID, aber niemals das Passwort.
- Ein primärer CONNACK-/Autorisierungsfehler wird nicht mehr durch nachfolgende generische `connection closed`- oder `heartbeat timeout`-Meldungen überschrieben.
- Passwörter werden beim Speichern nicht mehr getrimmt, weil Leerzeichen Bestandteil eines gültigen Credentials sein können.
- TESVOLT-Topics, Leistungssteuerung, Watchdogs, Datenpunkte und bestehende Aliase bleiben unverändert.

## 0.5.157 – OEM Modbus V10.03 AC-/DC-Ladepunkte

- Zwei neue additive Templates für Connector 1 und Connector 2 des bereitgestellten Modbus/TCP-Protokolls V10.03.
- Ein Template deckt abhängig von `GUN_TYPE` AC-Wallboxen (ein- oder dreiphasig) und DC-Ladestationen ab.
- Eingelesen werden Stations-/Connectorstatus, Steckerzustand, Fehler, AC-/DC-Spannung und -Strom, Phasen-/Gesamtleistung, Gesamt-/Sitzungsenergie, Ladedauer sowie zulässige Strom-/Leistungsgrenzen.
- Start/Stop wird sicher auf `Charge command` 1/2 abgebildet; die Leistungsbegrenzung schreibt atomar per FC16 auf das jeweilige 32-Bit-`SET_POWER`-Register.
- `FALLBACK_CURRENT` ist nur der Sicherheitsstrom nach Kommunikationsausfall und wird nicht als dynamischer NexoWatt-Stromsollwert missbraucht; die reguläre AC-/DC-Regelung erfolgt über `aliases.v1.ctrl.powerLimitW`.
- Phasenströme und Phasenspannungen werden für AC-Geräte zusätzlich auf die einheitlichen v1-Aliase gespiegelt; bei DC-Geräten liefert `r.currentA` den dokumentierten DC-Strom.
- Für NexoWatt UI stehen die standardisierten Alias-Contract-v1-Pfade für Status, Verfügbarkeit, Fahrzeug, Laden, Leistung, Iststrom, Energie, Run und Leistungsgrenze bereit.
- Die Register beginnen laut Quelldatei direkt bei `0x0000`, `0x0100` und `0x0200`; deshalb erzwingt das Template Address-Offset 0. Unit-ID und 32-Bit-Wortreihenfolge bleiben in der Gerätekonfiguration prüfbar, da sie in der Quelldatei nicht festgelegt sind.
- Kein bestehendes Template, kein Rohdatenpunkt und kein Legacy-Alias wurde geändert.

## 0.5.156 – Windows-npm-Aufruf im Release-Isolationstest korrigiert

- Der Fehler `actual: null, expected: 0` entstand im Test `workspaceIsolation.test.js`: Unter Windows kann `spawnSync("npm.cmd", ...)` enden, bevor npm gestartet wird; `status` ist dann `null`.
- Der verschachtelte `npm pack --dry-run --json`-Test wird jetzt über `process.execPath` und die von npm bereitgestellte `npm_execpath`-JavaScript-CLI gestartet. Dadurch ist kein direkter `.cmd`-Start mehr nötig.
- Falls `npm_execpath` außerhalb eines npm-Lifecycles nicht verfügbar ist, verwendet Windows einen expliziten `cmd.exe /d /s /c`-Fallback.
- Eine simulierte Windows-Auflösung ist im freigegebenen Test enthalten, damit dieser Fehler künftig vor der Ausgabe erkannt wird.
- Laufzeit, Ladepunkt-Freshness, alle 182 Templates, Register, Datenpunkte, Aliase und Steuerlogiken bleiben unverändert.

## 0.5.155 – Release-Prüfung von lokalen Altdateien entkoppelt

- Die Freigabeprüfung bewertet jetzt ausschließlich releaseverwaltete Dateien. Harmlos verbliebene Dateien in einem bestehenden Windows-Arbeitsordner dürfen den Build nicht mehr blockieren.
- Zusätzliche Markdown-Dateien im Projektstamm wie `CHANGELOG.md`, `NEXOWATT_REVIEW.md` oder `README.de.md` werden nur noch als Hinweis gemeldet. Veröffentlicht werden weiterhin ausschließlich `README.md` und der Ordner `docs/`.
- Zusätzliche `test/*.test.js`-Dateien wie eine alte `core.test.js` werden weder syntaktisch als Releasequelle bewertet noch ausgeführt. `npm test` startet ausschließlich die im festen `test/test-manifest.json` freigegebenen Tests.
- `package.json` darf den Ordner `test/` oder eine breite Wildcard nicht in die npm-`files`-Whitelist aufnehmen. `.npmignore` schließt `test/` und zusätzliche Markdown-Dateien im Projektstamm ergänzend aus.
- Fehlende Manifesttests, ungültige verwaltete JSON-Dateien, Merge-Konflikte, JavaScript-Syntaxfehler, Template-/Alias-Regressionen und fehlschlagende freigegebene Tests bleiben harte Release-Blocker.
- Laufzeit, Ladepunkt-Freshness aus 0.5.154, alle 182 Templates, Register, Datenpunkte, Aliase und Steuerlogiken bleiben unverändert.

## 0.5.154 – Ladepunkt-Messwerte bleiben auch im Leerlauf frisch

- Ursache der `Messwert-Failsafe · safe-zero`-Meldung war kein MENNEKES-Registerfehler: Der generische State-Cache unterdrückte identische `setState()`-Aufrufe. Bei einem gesunden, aber inaktiven Ladepunkt blieben `0 W`, `false` und unveränderte Statuswerte daher mit einem alten ioBroker-Zeitstempel stehen.
- Nach jedem tatsächlich erfolgreichen Ladepunkt-Snapshot werden sicherheitsrelevante Rückmeldungen jetzt in begrenztem Takt erneut bestätigt. Standard sind 5 Sekunden; bei abweichendem Polling gilt weiterhin der reale Empfangstakt des Geräts.
- Erfasst werden Legacy- und Alias-Contract-v1-Pfade für Verbindung/Offline, Status, Verfügbarkeit, Fahrzeug verbunden, Laden, Leistung, Phasenströme und Iststrom.
- Statische Metadaten, Firmwarewerte, Energiezähler und Sollwert-/Befehlsaliase bleiben änderungsbasiert, damit ioBroker und Historien nicht unnötig belastet werden.
- Die Frische wird ausschließlich bei echten erfolgreichen Geräteantworten erneuert. Bei Timeout, Offlinezustand oder leerem Snapshot wird kein aktueller Messzeitpunkt vorgetäuscht; Heartbeat, `lastSeenMs` und `online` bleiben an reale Kommunikation gekoppelt.
- Die Korrektur gilt zentral für alle Templates der Geräteklasse `evCharger` (`EVCS`/`EVSE`), einschließlich MENNEKES, ABL, Alfen, KEBA, Weidmüller, go-e, Webasto, Heidelberg, Spelsberg und Alpitronic. Register, Rohdatenpunkte, bestehende Alias-Pfade und sämtliche Schreiblogiken bleiben unverändert.

## 0.5.153 – TESVOLT MQTT-V2 zyklisch, TLS-fähig und failsafe

- TESVOLT hat bestätigt, dass Leistungssollwerte zyklisch erwartet werden und das externe EMS nach standardmäßig 30 Sekunden ohne Sollwert als offline gilt. Das IoT-Gateway beziehungsweise der Wechselrichter fällt dann abhängig vom Adapter auf `0 W` und/oder Standby zurück.
- Das Template sendet den vollständigen `EMS/V2/Inverter/Control`-Payload jetzt standardmäßig alle 5 Sekunden. `Power` und `Reactive_Power` werden immer gemeinsam übertragen; `State=grid_connected` wird bei gemeldeter State-Capability ebenfalls zyklisch gesendet.
- Ein lokaler EOS-Sollwert-Watchdog setzt nach standardmäßig 20 Sekunden ohne frische Vorgabe aktiv `0 W`. Refreshintervall, Sollwert-Frische, Telemetrie-Frische und Tracking-Verzögerung sind je Gerät konfigurierbar.
- Nach Adapterstart oder MQTT-Wiederverbindung wird zunächst `0 W` gesendet. Ein vorheriger Nicht-Null-Sollwert wird niemals automatisch fortgesetzt; dafür ist ein neuer EOS-Befehl erforderlich. Beim kontrollierten Adapterstopp wird bestmöglich ein letzter `0-W`-Befehl gesendet.
- Da TESVOLT keine separate Befehlsquittung liefert, werden neue Diagnose-Datenpunkte aus `Inverter/Measurements.Power` abgeleitet: gesendeter Sollwert, Abweichung, Trackingstatus, Tracking-OK und letzter Publish-Zeitpunkt.
- MQTT/TLS wurde um `mqtts://`, Zertifikatsprüfung, optionale private CA-Datei und SNI/Servername erweitert. Benutzername und Kennwort dienen der Authentifizierung; die Transportverschlüsselung erfolgt über TLS.
- Die standardmäßige TESVOLT-Publikation von etwa 500 ms wird mit einem konfigurierbaren 5-s-Stale-Timeout abgesichert. Wechselrichterzustand und AC-Grenzen dürfen nicht mehr bis zu 30/60 Sekunden alt sein.
- `DC_Connection_Request=false` öffnet laut TESVOLT aktiv die DC-Schütze. Weil die Ampace-Batterie dies im aktuellen Bifi-Stand noch nicht umsetzt, bleibt `Battery/Control` im normalen NexoWatt-Steuerpfad bewusst deaktiviert.
- Ausgangsbasis ist 0.5.152; FENECON ctrlBalancing0, Alfen-Status-/Schreibkorrekturen, ABL-Failsafes sowie alle bestehenden Datenpunkte und Legacy-Aliase bleiben unverändert.

## 0.5.152 – Alfen ACE Mode-3-Status korrekt dekodieren

- Ursache des dauerhaft angezeigten Status `Operative` war nicht die Wallbox-Steuerung, sondern die Dekodierung des fünf Register langen Mode-3-Strings.
- Bei der Alfen-Verbindung ist für 32-Bit-Zahlen `wordOrder=LE` erforderlich. Diese numerische Wortreihenfolge wurde bisher fälschlich auch auf ASCII-Strings angewendet und kehrte deren komplette Registerfolge um. Dadurch begann der dekodierte String mit einem Nullbyte und wurde als leer beziehungsweise `Unknown` gelesen.
- Alfen-STRING-/ASCII-Werte werden jetzt unabhängig von der numerischen Wortreihenfolge in fortlaufender Registerreihenfolge und mit Network Byte Order dekodiert. Das gilt auch für die direkte Tabellenadress-Kompatibilitätsvariante.
- Damit liefert `mODE3_STATE` wieder `A`, `B1`, `B2`, `C1`, `C2`, `D1`, `D2`, `E` oder `F`. Bei Zustand `A` zeigen `status/statusText` künftig `No vehicle (A)`, `vehicleConnected=false` und `charging=false`, während `available=true` weiterhin separat die Betriebsbereitschaft der EVSE beschreibt.
- Keine Registeradresse, kein Template-Datenpunkt, kein Legacy-/v1-Alias und keine Alfen-Schreib-/Keepalive-Logik wurde verändert.

## 0.5.151 – FENECON ctrlBalancing0 / SetGridActivePower

- Das bestehende Template `ess.fenecon.FeneconHomeEssImpl` wurde additiv um den in der FENECON-Dokumentation gezeigten `ctrlBalancing0`-Block erweitert.
- Neue optionale Lesepunkte: Component-ID (`890`), Blocklänge (`906`), OpenEMS-Hash/-Blocklänge (`910/911`), Controllerstatus (`912`) sowie Hash/Blocklänge von `ControllerEssBalancingImpl` (`990/991`).
- Neuer Schreibpunkt `sET_GRID_ACTIVE_POWER` auf Holding-Register `992`, FC16, `FLOAT32`, Big Endian. Die Rohansicht bleibt wie bei den übrigen FENECON-Leistungswerten in `kW`; das FEMS erhält Watt.
- Vorzeichen: `0` = Ausregelung am Netzanschluss auf null, negativ = gewünschte Einspeisung, positiv = gewünschter Netzbezug.
- Standardisierte Steuerpfade: `aliases.v1.ctrl.gridSetpointW` und `aliases.v1.ctrl.napSetpointW`. Bestehende `aliases.*` bleiben unverändert.
- Weil FENECON nach App-Updates Registerblöcke verschieben kann, prüft der Treiber vor dem ersten Schreiben und nach jeder Neuverbindung, ob an Register `890` tatsächlich die Component-ID `ctrlBalancing0` liegt. Bei Abweichung wird der Schreibzugriff sicher blockiert.
- Alle bisherigen FENECON-Rohdatenpunkte, Register, Einheiten, Schreiblogiken und Legacy-Aliase bleiben gegen die Produktionsbaseline unverändert; es werden ausschließlich acht neue Datenpunkte ergänzt.

## 0.5.150 – TESVOLT IoT Gateway MQTT EMS Interface V2

- Neues, separates Template `ess.tesvolt.iotGateway.mqttV2`; das bestehende TESVOLT-Modbus-/Vermarkter-Template bleibt unverändert.
- MQTT-JSON-Treiber verarbeitet jetzt mehrere Datenpunkte aus demselben Topic und aktualisiert eventgetriebene Legacy-/v1-Aliase aus einem vollständigen Wertesnapshot.
- API-, Gateway-, Wechselrichter- und Batteriedaten, SOC, AC-/DC-Leistung, Energie, Zustände, Fehlerlisten sowie dynamische Lade-/Entladegrenzen werden über die dokumentierten `EMS/V2/...`-Topics gelesen.
- Wirkleistung wird atomar über `EMS/V2/Inverter/Control` publiziert. Die TESVOLT-Vorzeichenkonvention wird auf den NexoWatt-Standard `+ Entladen / - Laden` umgerechnet.
- Nicht-null Sollwerte benötigen API V2, `Power` in `supported_control`, frischen Wechselrichterzustand, frischen Batteriezustand `normal` und frische AC-Grenzen; Sollwerte werden auf `P_Max_Charge`/`P_Max_Discharge` begrenzt.
- Veraltete oder bei MQTT-Ausfall eingefrorene AC-/DC-Leistung wird aktiv auf `0 W` gesetzt. Ältere `ts_create`-Nachrichten überschreiben keine neueren Werte.
- `Battery/Control`/DC-Schütz, retained Schützbefehle, Sollwert-Watchdog und TLS-Sonderkonfiguration bleiben bis zur TESVOLT-Rückmeldung bewusst deaktiviert.
- Alle 181 bestehenden Produktionstemplates und Legacy-Aliase bleiben gegen die 0.5.143-Baseline unverändert; nur das neue 182. Template wird additiv ergänzt.

## 0.5.149 – Windows-Publish-Test gegen lokale Altdatei gehärtet

- Der Testfehler `actual: true, expected: false` entsteht, wenn im alten Windows-Arbeitsordner noch `publish-safe.cmd` aus einer früheren Version liegt.
- Der Adapter- und ABL-Laufzeitcode ist davon nicht betroffen; fehlgeschlagen ist ausschließlich die Paket-/Dokumentationsprüfung.
- Eine lokal verbliebene `publish-safe.cmd` blockiert `npm test` und `npm publish` jetzt nicht mehr. Sie bleibt über die `package.json`-`files`-Whitelist und zusätzlich über `.npmignore` sicher vom npm-Paket ausgeschlossen.
- Der Release-Guard zeigt die lokale Altdatei nur als Hinweis an und prüft weiterhin, dass sie nicht zur Veröffentlichung freigegeben ist.
- Der ABL-eMH1-Failsafe aus 0.5.148 bleibt unverändert: Nicht-Ladezustände, fehlende/ungültige Phasenströme und Kommunikationsausfälle setzen die abgeleiteten Strom- und Leistungsaliase auf `0`.

## 0.5.148 – ABL eMH1: veraltete Ladeleistung sicher auf 0 setzen

- Die ABL eMH1 liefert keinen direkten Leistungswert; `aliases.r.power` und `powerEstimated` werden weiterhin aus der Summe der drei Phasenströme mal 230 V berechnet.
- Meldet EVCC2/3 einen Nicht-Ladezustand (`A/B/E/F`), `null`/NaN-Ströme oder fehlt der atomare R5-Stromblock, werden Strom- und Leistungsaliase sofort auf `0` gesetzt.
- Dasselbe Failsafe greift bei Modbus-Kommunikationsfehlern, Heartbeat-Timeout und direkt nach dem Adapterstart ohne frische Messung.
- Die Rohdatenpunkte `cURRENT_L1/L2/L3` bleiben unverändert und dürfen weiterhin `null` anzeigen; nur die operativen Legacy- und v1-Aliase werden sicher genullt.
- Register, ABL-PWM-Steuerung, Alias-IDs und alle anderen Herstellerlogiken bleiben unverändert.
- 60 automatisierte Tests prüfen unter anderem Laden, A1 mit Nullwerten, fehlenden R5-Block, Transportfehler, Heartbeat-Timeout und die vollständige Legacy-Kompatibilität.

## 0.5.147 – Alfen ACE adaptive Schreibadressierung

- Der offizielle ACE-Pfad bleibt unverändert: Socket 1/2 schreibt zuerst per FC16 auf Protokolladresse `1209` (Dokumentregister `1210..1211`) mit Low-Word-First.
- Nur nach Modbus Exception 2 wird zusätzlich die direkte Tabellenadresse `1210` getestet. Exception 3, Timeouts oder andere Fehler lösen keinen Adresswechsel aus.
- Für die Kompatibilitätsvariante wird die 32-Bit-Wortreihenfolge anhand des konfigurierten Safe Current erkannt; unplausible Subnormalwerte werden verworfen.
- Die funktionierende Variante wird pro Unit-ID im laufenden Treiber gespeichert und anschließend auch für die zugehörigen Steuer-Rückmeldungen verwendet.
- Werden beide Adressvarianten abgelehnt, nennt die Diagnose die fehlenden ACE-Advanced-Settings `Allow writing maximum currents` und `Enable sockets`.
- Templates, Rohdatenpunkte, bestehende `aliases.*`-Pfade und der additive Alias Contract unter `aliases.v1.*` bleiben unverändert.
- 59 automatisierte Tests prüfen unter anderem die offizielle Variante, Exception-2-Fallback, Wortreihenerkennung, Cache, Phasenbefehl, SCN-Block und den Exception-3-Schutz.

## 0.5.146 – Alias-Standard gegen Bestandsanlagen abgesichert

- Der gemeldete `ERR_ASSERTION`-Fehler wurde auf einen vermischten lokalen Quellordner beziehungsweise eine alte Testdatei eingegrenzt. Die freigegebene Testsuite läuft jetzt über ein festes Testmanifest. Zusätzliche alte `*.test.js`-Dateien werden bereits vom Release-Guard mit einer eindeutigen Meldung blockiert.
- Alias Contract v1 ist jetzt technisch strikt additiv: bestehende `devices.<id>.aliases.*`-Definitionen werden weder ergänzt, umbenannt, ersetzt noch in ihrer Schreibumrechnung verändert. Neue Standardpfade liegen ausschließlich unter `aliases.v1.*`; Metadaten liegen unter `aliases.meta.*`.
- Die acht Legacy-Abweichungen aus 0.5.144/0.5.145 wurden zurückgenommen. Das betrifft zusätzliche Kompatibilitätsaliase bei KEBA, Alfen und Weidmüller sowie die veränderte Legacy-Behandlung von `CHARGER`/`DC_CHARGER`. Die v1-Geräteklassifizierung bleibt erhalten.
- Eine permanente Kompatibilitätsbaseline vergleicht alle 181 Roh-Templates und sämtliche Legacy-Aliasdefinitionen gegen den freigegebenen Stand 0.5.143. Register, Datenpunkt-IDs, Typen, Rollen, Einheiten, Ziel-DPs und Schreibumrechnungen müssen identisch bleiben.
- Der Runtime-Code enthält keine Objekt- oder State-Löschmigration. Bestehende Anlagen behalten ihre bisherigen Pfade und Werte; v1-Objekte werden nur zusätzlich erzeugt.
- Ungültige Modbus-Schreibwerte werden weiterhin im Treiber abgelehnt. Der ioBroker-State-Callback fängt die Exception absichtlich ab und schreibt den vollständigen Fehler nach `devices.<id>.info.lastError`, statt den Adapterprozess abstürzen zu lassen.
- 54 automatisierte Tests einschließlich Legacy-Kompatibilität, ABL-/Alfen-Schreibpfaden, Sungrow, TA CMI und Weidmüller bestanden.

## 0.5.145 – Dokumentationsstruktur bereinigt

- Die technische Markdown-Dokumentation liegt jetzt gesammelt unter `docs/`.
- Im Projektstamm bleibt nur `README.md`, damit GitHub und npm sofort wieder die eigentliche Adapterübersicht anzeigen.
- Frühere Versionshinweise wurden aus dem Kopf der Haupt-README in diese Datei verschoben.
- Der Release-Guard blockiert künftig zusätzliche Markdown-Dateien im Projektstamm.

## 0.5.144 Alias Contract v1 – fester Standard für die NexoWatt-UI

- Alle 181 Templates besitzen jetzt eine explizite Geräteklasse und den stabilen Vertrag `aliasContract.schemaVersion = 1`.
- Neue automatische Integrationen verwenden ausschließlich `devices.<id>.aliases.v1.*`; dort sind Pfade, Datentypen, Rollen und Einheiten verbindlich festgelegt.
- Unter `devices.<id>.aliases.meta.manifest` stehen Geräteklasse, Template, Hersteller, Modell, Fähigkeiten und eventuell fehlende Pflichtaliase maschinenlesbar als JSON bereit.
- Standardisierte Einheiten im v1-Namensraum: `W`, `Wh`, `A`, `V`, `°C`, `s`, `%`, `Hz` und Unix-Zeitstempel in `ms`.
- Herstellerumrechnungen bleiben im Device-Adapter. Beispiel: EOS schreibt bei ABL weiterhin Ampere, während der Treiber intern auf den PWM-Tastgrad umrechnet; FENECON-/SolaX-kW-Werte werden für die UI automatisch in Watt umgesetzt.
- `EVCS` und `EVSE` sind `evCharger`; `CHARGER` und `DC_CHARGER` sind dagegen `solarCharger` und können dadurch nicht mehr als Wallbox im UI erscheinen.
- Bestehende `aliases.*` bleiben für installierte Anlagen vollständig erhalten. Dynamische TA-CMI-Zuordnungen werden zusätzlich auf kanonische Heizungsaliase gespiegelt.
- Der Release-Guard und die Tests prüfen den Aliasvertrag gegen sämtliche Templates bei jedem Build.

## 0.5.143 ABL eMH1 Ampere-Vorgabe korrekt auf PWM umgesetzt

- NexoWatt EOS gibt den Ladestrom weiterhin über `aliases.ctrl.currentLimitA` in Ampere vor. Der Adapter rechnet intern auf den ABL-Datenpunkt `sET_ICMAX_DUTY_CYCLE_PCT` und Register `0x0014` um.
- Die Umrechnung folgt der ABL-/IEC-61851-Tabelle und wird auf 0,1 % nach unten begrenzt: `6 A = 10 %`, `10 A = 16,6 %`, `16 A = 26,6 %`, `32 A = 53,3 %`, `51 A = 85 %`, `80 A = 96 %`.
- `0 A` oder eine Vorgabe unter `6 A` wird als `100 %` geschrieben. Das ist bei ABL die normale Warte-/Pausevorgabe „kein Strom verfügbar“.
- `aliases.ctrl.run` und `aliases.ctrl.chargeEnable` schreiben beim Sperren jetzt ebenfalls `100 %` und stellen beim Freigeben den letzten aktiven PWM-Wert wieder her.
- Das Service-Register `mODIFY_STATE` (`0x0005`) wird nicht mehr für die normale Ladepause verwendet und ist eindeutig als Experten-/Servicebefehl gekennzeichnet.
- Neue Rückmeldungen: `aliases.r.waitingForCurrent` und `aliases.r.chargingReleased`.
- Die Hersteller-Beispieltelegramme wurden automatisiert geprüft: `10 A -> 16,6 % -> 0x00A6` sowie `Warten -> 100 % -> 0x03E8`.

## 0.5.142 ABL eMH1 Modbus-ASCII-Lesegruppen korrigiert

- Die Warnung `UID1 FC3 1-3 ... timeout waiting for response` wurde auf einen Fehler in unserer generischen Register-Gruppierung zurückgeführt.
- ABL verlangt für `0x0001..0x0002` eine exakte R2-Anfrage und für `0x0003` eine separate R1-Anfrage. Diese beiden Befehle wurden bisher fälschlich zu `:010300010003F8` zusammengefasst.
- Ab 0.5.142 sendet der Adapter `:010300010002F9` und `:010300030001F8` getrennt.
- Auch die Blöcke `0x0006..0x0007` (R2) und `0x002E..0x0032` (R5) bleiben als exakte ABL-Protokollanfragen erhalten.
- Andere Modbus-Templates bleiben unverändert; die neue Gruppengrenze wirkt nur bei ausdrücklich markierten Datenpunkten.

## 0.5.141 ABL eMH1 Stromrückmeldung korrigiert

- `aliases.ctrl.currentLimitA` bleibt das Stromlimit **je Phase**. Bei `10 %` PWM entspricht das `6 A`.
- `aliases.r.currentTotalA` addiert nicht mehr L1+L2+L3. Der Alias liefert jetzt den höchsten gemessenen Phasenstrom und ist dadurch direkt mit dem Stromlimit vergleichbar.
- Neue eindeutige Rückmeldungen: `aliases.r.currentA`, `aliases.r.currentL1`, `aliases.r.currentL2`, `aliases.r.currentL3`, `aliases.r.currentLimitA` und `aliases.r.currentLimitPct`.
- Die rechnerische Summe der Phasenströme bleibt unter `aliases.r.currentPhaseSumA` erhalten und wird ausschließlich für die geschätzte Ladeleistung verwendet.
- Beispiel aus dem Feldtest: `3 × 5,5 A` ergeben als tatsächlichen Ladestrom `5,5 A`; nur die Leistungsrechnung verwendet `16,5 A × 230 V = 3.795 W`.
- Die IEC-61851-PWM-Umrechnung wurde an der exakten Grenze `85 % = 51 A` korrigiert.

## 0.5.140 Alfen ACE Schreiblogik-Audit

- Socket-Schreibframe gegen den Alfen-Leitfaden *Modbus for ACE v1.0* erneut vollständig geprüft: Socket 1/2 verwenden Unit-ID `1`/`2`, FC16, Protokolladresse `1209` (Dokumentregister `1210..1211`) und einen 32-Bit-Float mit Low-Word-First/Network-Byte-Order.
- Das bisherige `station`-Template war trotz seines Namens nur ein Socket-1-Profil. Es ist jetzt ein echtes Station/SCN-Profil auf Unit-ID `200` und schreibt den Strom für L1/L2/L3 atomar in einer FC16-Anfrage ab Protokolladresse `1416`.
- Manuelle Alfen-Schreibfehler (Modbus Exception 2/3) werden nicht mehr still verworfen, sondern in `info.lastError` und mit einer konkreten ACE-Konfigurationsdiagnose angezeigt.
- Erfolgreich quittierte Alfen-Schreibzugriffe protokollieren Unit-ID, FC, Adresse, Länge, Registerwörter und Datenbytes. Die Meldung unterscheidet ausdrücklich zwischen Transportannahme und tatsächlicher Berücksichtigung durch ACE.
- Der Strombefehl wird nur noch über den 5-s-Validity-Watchdog erneuert; der zusätzliche, zeitgleiche Post-Write-Repeat wurde entfernt.
- Automatisierte Pakettests prüfen die exakten Socket- und SCN-Registerfolgen sowie den Fehlerpfad.

## 0.5.108 KEBA KeContact P40/P40 Pro Modbus TCP V1.02

- KEBA-P40-Template gegen den Programmers Guide V1.02 umgesetzt: Unit-ID 255, Port 502, FC3 Lesen, FC6 Schreiben, keine Mehrfachregister-Leseblöcke über mehrere Registerwerte.
- Alle KEBA-Stromwerte werden im Adapter als Ampere geführt; intern werden mA-Register der Wallbox beim Lesen nach A und beim Schreiben von A nach mA umgerechnet.
- Native Schreib-Datenpunkte wie `sET_CHARGING_CURRENT` und `sET_FAILSAFE_CURRENT` erwarten jetzt A (`0` oder `6..32`) und schreiben daraus automatisch `0` bzw. `6000..32000` mA per FC6.
- KEBA-Aliase für `aliases.ctrl.currentLimitA`, `aliases.ctrl.run`, `aliases.ctrl.chargeEnable`, `aliases.ctrl.failsafeCurrentA`, Status, Leistung und Energie ergänzt/stabilisiert.

## 0.5.107 Modbus-Stabilität

- Globale Modbus-Härtung: Templates lesen standardmäßig lückensicherer, mit kleineren Registerblöcken und temporärem Skip optional fehlerhafter Read-Gruppen.
- KEBA KeContact P40: Modbus/TCP nutzt jetzt den KEBA-Default Unit-ID 255, Address-Offset 0, isoliertes Polling nach OpenEMS-/KEBA-Registerlayout und stabile Aliase für Status, Stromlimit und Ladefreigabe.
- Optionales KEBA-Register `idTag` wird nicht mehr automatisch gepollt, weil es je nach Firmware nicht zuverlässig lesbar ist.
