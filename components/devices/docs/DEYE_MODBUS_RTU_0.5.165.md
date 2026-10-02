# DEYE Hybrid – vorläufige Modbus-RTU-Profile (0.5.165)

Stand: 17.09.2026. Aufbau auf dem vollständigen Repository 0.5.164; TESVOLT-, DEPower- und VARTA-Arbeiten bleiben erhalten. Keine Freigabe für sämtliche DEYE-Produkte oder Firmwarestände; keine Prüfung an realer DEYE-Hardware.

## Drei auswählbare Konstellationen

| Template-ID | Familie | Register 0 | Umfang |
| --- | --- | --- | --- |
| `ess.deye.singlePhase.modbusRtu` | Einphasiger Hybrid | `0x0300` | V118-PDF, Speicherwerte über den Wechselrichter |
| `ess.deye.threePhaseLv.modbusRtu` | Dreiphasiger Niedervolt-Hybrid | `0x0500` | V105.4-DOC, LV-Einheiten |
| `ess.deye.threePhaseHv.modbusRtu` | Dreiphasiger Hochvolt-Hybrid | `0x0600`, `0x0601` | V105.4-DOC, HV-Einheiten |

Es werden zusätzlich die Phasenangabe (Register 18 bzw. 22) und bei Dreiphasen-Geräten die Ausgangstopologie (Register 25 = 0) geprüft. Die tatsächlichen SKU-/Firmware-Zuordnungen sind noch durch DEYE zu bestätigen. Gerätecode und Phasenprüfung ersetzen diese Bestätigung nicht. String-/Mikrowechselrichter, PCS `0x0800`, Balkonspeicher `0x0900`, Split-Phase-Systeme, eigenständig adressierte BMS und eine automatische Erkennung aller Parallelverbünde sind damit nicht abgedeckt.

## Quellen und offene Protokollstände

- Bereitgestellte Datei `Modbus RTU 单相储能通信规约 V118-single phase.pdf`. Der Dateiname nennt V118, die sichtbare Änderungshistorie endet bei V117 vom 08.04.2021. Das Dokument enthält überlappende Registerbereiche mehrerer Geräteklassen; dieses Profil verwendet die Hybrid-Zuordnung.
- Bereitgestellte Datei `MODBUS RTU三相储能通信规约V105.4-20240814(4)(1).doc`. Die Änderungshistorie reicht trotz älterem Dateinamen bis 13.01.2025. Dreiphasige 32-Bit-Leistungswerte mit zusätzlichen High-Words sind seit V104 beschrieben.
- Protokollversion in Register 2 und Firmwarewerte werden als tatsächliche Registerwerte dargestellt. Aus dem Dateinamen wird keine vermeintlich sichere numerische Firmwarekennung abgeleitet.

## Einrichtung

Unter **ESS → DEYE** eines der drei Profile auswählen. Das Protokoll wird auf **Modbus RTU** beschränkt. Für neue Geräte werden die Einstellungen automatisch ausgefüllt:

| Einstellung | Vorgabe | Bedeutung |
| --- | --- | --- |
| Baudrate | 9600 | In beiden Dokumenten genannt |
| Datenbits / Parität / Stopbits | 8 / keine / 1 | Im dreiphasigen Dokument ausdrücklich genannt; für Einphasen-Familie als vorläufiger Vorgabewert zu bestätigen |
| Unit-ID | 1 | Änderbarer Vorschlag; kein belegter universeller Werkswert. Tatsächliche Geräteadresse 1–247 verwenden |
| Registeroffset | 0 | Tabellenadressen direkt; keine automatische Suche bei Offset −1/+1 |
| Byte-/Wortreihenfolge | High-Byte zuerst / Low-Word zuerst | Im Treiber je Register fest zugeordnet; getrennte High-Words bleiben getrennt adressiert |
| Timeout | 2000 ms | Adapter-Vorgabe, keine zugesicherte Herstellergrenze |
| Abfrageintervall | 5000 ms | Adapter-Vorgabe; ein vollständiger Zyklus enthält mehrere Anfragen |
| Abstand einzelner Anfragen | 50 ms | Vorläufige Adapter-Vorgabe, vom Hersteller zu bestätigen |
| Konfigurationsschreiben | aus | Muss je Gerät ausdrücklich freigegeben werden |
| Remote-Register zusätzlich lesen | aus | Nur bei Dreiphasen-Profilen optional zuschaltbar |

Den realen RS485-Port auswählen und die Geräteadresse prüfen. Bereits gespeicherte serielle Einstellungen werden nicht ungefragt überschrieben. Kein automatisches Schreiben beim Start, Wiederverbinden oder per Keepalive.

Den freigegebenen RS485-Anschluss und seine Pinbelegung dem konkreten Gerät zuordnen. Ein BMS-/Zähleranschluss ist nicht automatisch ein externer EMS-Anschluss. Ein zusätzlicher RTU-Master darf nicht ungeprüft auf einen bereits von einem Logger/Master bedienten Bus gesetzt werden; Koexistenz/Topologie sind Teil der Herstelleranfrage.

## Messwerte und Einheiten

- Batteriestand, Spannung, Strom, PV-Eingangsleistungen, Netz-/Wechselrichter-/Lastleistung, Energiezähler, Warn-/Fehlerwörter und verfügbare Identitätswerte.
- Leistung intern in W, Energie in Wh. Ein Zählschritt von 0,1 kWh entspricht **100 Wh**, nicht 0,1 Wh. Tageszähler und Gesamtzähler sind eigene Messwerte; Tageswerte werden nicht als Sitzungsenergie bezeichnet.
- Dreiphasig: Netz-Gesamtleistung aus **625 + 690**, Wechselrichter-Gesamtleistung aus **636 + 694**, Last-Gesamtleistung aus **653 + 659**. Vorzeichenbehaftete 32-Bit-Zusammensetzung; keine Begrenzung/Fehlinterpretation bei 32767 W. Die getrennten Register werden in aufeinanderfolgenden Anfragen gelesen; das Protokoll liefert keine bestätigte atomare Snapshot-/Latch-Funktion.
- Batteriespannung: LV 0,01 V/Schritt, HV 0,1 V/Schritt. PV-Leistung: LV 1 W/Schritt, HV 10 W/Schritt.
- Register 590 bezeichnet die Leistungsauflösung widersprüchlich als `H:1W H:10W`. Deshalb bleibt `battery.powerRaw` ein vorzeichenbehafteter Rohwert. Im Admin kann nach verlässlicher Bestätigung 1 W oder 10 W pro Schritt ausgewählt werden. Einphasig Register 190: dokumentierte 1 W/Schritt.
- Batterieleistungsrichtung wird ausdrücklich bestätigt: positiv Entladen oder positiv Laden. Der EOS-Alias `aliases.v1.r.power` verwendet **positiv Entladen / negativ Laden**. Bei fehlender Bestätigung bleibt er `null`; Lade-/Entladeleistungsaliase bleiben dann ebenfalls unbekannt.
- Netzrichtung ist für einphasig Register 169 dokumentiert: positiv Bezug, negativ Einspeisung. Bei Dreiphasen-Profilen muss die Richtung im Admin bestätigt werden, bevor `aliases.v1.r.gridPower` einen Wert liefert. `grid.power` zeigt den Hersteller-Messwert in W ohne unbestätigte Vorzeichenumkehr.
- Einzelne Batterieeingänge bleiben getrennt. Register 24 = 0/1 wird als ein Eingang interpretiert. Bei mehreren/unbekannten Eingängen werden weder Gesamt-SOC noch Gesamt-Batterieleistung geraten. Batterie-2-Felder nur zusammen mit der gemeldeten Eingangszahl beurteilen; Nullen belegen keinen angeschlossenen zweiten Speicher.
- Einphasige Batterietemperatur: `(Register 182 − 1000) / 10`. Unklare dreiphasige Temperatur-/Batterie-2-Stromdefinitionen bleiben ausdrücklich Rohwerte.
- PV-Gesamtleistung nur bei 1–4 gemeldeten MPPTs mit vollständig verfügbaren Einzelwerten. Bei mehr Eingängen wird kein unvollständiger Gesamtwert veröffentlicht.
- Nicht unterstützte optionale Register liefern unbekannte Werte mit Diagnose. Fehlende High-Words werden nicht als 0 interpretiert. Verbindungsfehler, verkürzte Antworten und fehlende Pflichtregister werden als Fehler behandelt.

## Vorbereitete Konfiguration und Steuerungsgrenze

Vier ausdrücklich dokumentierte Grenzen sind nach manueller Freigabe über ihre Datenpunkte schreibbar. Es werden **keine** EOS-Leistungssteuerungsaliase daraus erzeugt:

| Datenpunkt | Einphasig | Dreiphasig LV/HV | Wertebereich/Schritt |
| --- | --- | --- | --- |
| `settings.maxChargeCurrent` | 210 | 108 | 0–185 A, Schritt 1 A |
| `settings.maxDischargeCurrent` | 211 | 109 | 0–185 A, Schritt 1 A |
| `settings.gridChargeCurrent` | 230 | 128 | 0–185 A, Schritt 1 A |
| `settings.maxExportPower` | 245 | 143 | LV/einphasig 0–8000 W, Schritt 1 W; HV 0–80000 W, Schritt 10 W |

Das sind die Bereiche des bereitgestellten Dokuments, keine Bestätigung der zulässigen Batterie-/Anlagenauslegung für jedes Modell. Diese Grenzen erzwingen weder Laden noch Entladen; die Betriebsart, BMS-Grenzen und interne Regelung bleiben maßgeblich. Eine Einspeisegrenze von 4200 W ist kein Batterie-Sollwert von 4200 W.

Je Schreibzugriff: Opt-in, Bereich/Schritt, Familie/Phasen/Topologie, Unit-ID und zehnstellige ASCII-Seriennummer prüfen, Zielregister lesen, genau ein FC16 senden, tatsächlichen Wert mit FC3 rücklesen. Abweichung, Ausnahme oder Timeout führen zum Fehler ohne automatischen Wiederholungsversuch. Änderungen an einer Datapunkt-Quelladresse erweitern die feste Schreib-Whitelist nicht. Bei Stop/Transportreset werden noch wartende Transaktionen verworfen; ein bereits an den Bus übergebener Befehl lässt sich nicht zurückholen.

Register 1100/1101/1104/1105/1109/1110/1111 sind für dreiphasige Geräte als optionale **Lese-Diagnosen** vorbereitet. Aktive Remote-Schreibzugriffe bleiben gesperrt: Modi, Watchdog-Erneuerung, Prozentbezugsleistung, Vorzeichen und Rückkehrverhalten sind nicht ausreichend beschrieben. `diagnostics.externalControlSupported=false`. BMS-Übertragungsregister werden nicht beschrieben; insbesondere wird kein SOC fingiert.

## Prüfumfang

186 automatisierte Tests bestanden, darunter 22 neue DEYE-Tests mit simulierten RTU-Busantworten durch die regulären Transport-Methoden. Geprüft: Profile, Datenformate, getrennte 32-Bit-Wörter, Wh-Faktoren, LV/HV-Skalierungen, unbekannte Werte, Admin-/Runtime-Vorgaben, Aliaszuordnung, erlaubte/abgewiesene FC16-Schreibzugriffe mit Rücklesen, Abbruch und Wiederverbindung. Die bestehenden lokalen MQTT-/Modbus-TCP-Transporttests bleiben enthalten. Keine reale DEYE-RS485-Verbindung und kein Last-/Speichertest durchgeführt.

186 Tests ersetzen die Herstellerbestätigung und die Inbetriebnahme am konkreten Gerät nicht. Eine dokumentierte Anfrage auf Englisch und Deutsch liegt in `DEYE_MANUFACTURER_INQUIRY_EN_DE.md`.
