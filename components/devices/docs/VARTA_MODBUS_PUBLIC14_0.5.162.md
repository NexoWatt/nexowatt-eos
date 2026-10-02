# VARTA – Modbus TCP Public 14 in NexoWatt Devices 0.5.162

## Grundlage und Funktionsgrenze

Implementierungsgrundlage ist ausschließlich die vom Auftraggeber bereitgestellte Herstellerdatei `VS-Modbus_V13.6_en_2022-09-01_freigegeben-public varta.pdf`, Seiten 1–2. **Im Dokument selbst stehen 14.0 public, 12.03.2025 und Tabellenstand 14 (Register 1051).** Der ältere Dateiname ist nicht der implementierte Protokollstand.

Die PDF dokumentiert Messwerte und neun beschreibbare Skalierungsexponenten bei **pulse neo** und **flex storage**. Sie dokumentiert **keine externe Lade-/Entlade-Leistungsvorgabe, Ladefreigabe, Betriebsmodus-Umschaltung oder Steuerungs-Watchdog**. Die vorhandenen Leistungs- und Energie-Verfügbarkeitsregister sind reine Rückmeldungen. Die Integration ist daher ein Monitoringprofil mit optionaler SF-Konfiguration, kein aktiv regelbares EOS-Speicherprofil. Dazu wäre eine zusätzliche, modellspezifische Herstellerspezifikation erforderlich.

Die Produktmatrix, Register und Datentypen sind Herstellerangaben. Die Versionsprüfung, Schreibsperre, Rückleseprüfung, Warteschlangenbegrenzung und Vermeidung von Adress-Fallbacks sind zusätzliche Sicherheitsentscheidungen dieser Adapterimplementierung.

## Acht getrennte Geräte zur Auswahl

Konfigurationspfad: **ESS → VARTA → Gerät**. Keine gemeinsame Sammelauswahl für element / one L / one XL.

| Gerät | Template-ID | Register-Datenpunkte¹ | Dokumentierte Schreibfunktion |
|---|---|---:|---|
| element | `ess.varta.element.modbusTcpV14` | 14 | Keine |
| one L | `ess.varta.oneL.modbusTcpV14` | 14 | Keine |
| one XL | `ess.varta.oneXL.modbusTcpV14` | 14 | Keine |
| element backup | `ess.varta.elementBackup.modbusTcpV14` | 22 | Keine |
| pulse | `ess.varta.pulse.modbusTcpV14` | 21 | Keine |
| pulse neo | `ess.varta.pulseNeo.modbusTcpV14` | 30 | Neun SF-Exponenten, FC6 |
| link | `ess.varta.link.modbusTcpV14` | 11 | Keine |
| flex storage | `ess.varta.flexStorage.modbusTcpV14` | 25 | Neun SF-Exponenten, FC6 |

¹ Zusammengehörige 32-Bit-Wörter und Zeichenketten zählen jeweils als ein Datenpunkt. Zusätzlich entstehen fünf Software-Diagnosedatenpunkte sowie die EOS-Aliase. Die ersten drei Geräte teilen sich laut PDF eine Registerspalte, bleiben aber eigenständige Templates.

## Verbindung und Adressierung

| Einstellung | Vorgabe / Verhalten |
|---|---|
| Protokoll | Modbus TCP |
| Host | Lokale IP-Adresse bzw. auflösbarer Hostname des VARTA-Geräts |
| TCP-Port | 502 laut PDF; bei Bedarf im Adapter konfigurierbar |
| Unit-ID | Herstellerempfehlung 255; Adapter akzeptiert ganzzahlige Werte 1–255 |
| Lesen | FC3 – Read Holding Registers |
| Schreiben | Ausschließlich FC6 – Write Single Holding Register, ausschließlich freigegebene SF-Register |
| Adress-Offset | 0; Tabellenadressen werden wörtlich verwendet |
| Wort-/Byte-Reihenfolge | Pro Datentyp fest vorgegeben; keine globale Uminterpretation durch BE/LE-Auswahl |
| Request-Abstand | Mindestens 1.000 ms, bei link mindestens 5.000 ms |
| SF-Schreibfreigabe | Standardmäßig aus |

Die PDF enthält keine ausdrückliche Erläuterung „0-basiert versus 1-basiert“. Die Implementierung verwendet **die angegebenen Zahlen unmittelbar als Protokolladressen** und liest zuerst FC3@1051. Es gibt weder pauschales „Register minus eins“ noch Nachbaradressensuche. Ist dort nicht Tabellenstand 14 lesbar, werden keine anderen Register interpretiert bzw. beschrieben. Das ersetzt keine Prüfung der tatsächlichen Firmware am Gerät.

Die Herstellerangabe „≤ 1/s“, bei link „≤ 1/5s“, wird auf **jede einzelne Modbus-Anfrage einschließlich Probe-, Schreib- und Rücklesezugriff** angewendet, nicht nur auf den Start eines Pollzyklus. Ein vollständiger Messwertsatz benötigt mehrere Anfragen und deshalb mehrere Sekunden; link benötigt entsprechend länger. Eine Sekunde Pollvorgabe bedeutet nicht, dass alle Werte sekündlich vorliegen.

Zusammenhängende, unterstützte Register werden ohne Überbrücken reservierter Lücken gebündelt (Standard maximal 40 Register pro Lesegruppe). Livewerte, Kapazität und SFs werden im schnellen Zyklus abgefragt. Softwarestände, Seriennummer und Modulanzahl werden beim ersten vollständigen Abruf und danach im langsamen Zyklus (300 Sekunden) mitgelesen. Die Identitätsprüfung vor einem SF-Schreibzugriff erfolgt unabhängig davon erneut.

Anfragen an denselben konfigurierten Host/Port teilen sich innerhalb eines Adapterprozesses eine Warteschlange und den Mindestabstand, auch bei unterschiedlichen Unit-IDs. Unterschiedliche Schreibweisen desselben Hosts (z. B. IP-Adresse und DNS-Name) sowie andere Adapterinstanzen, Prozesse oder externe Modbus-Clients können nicht gemeinsam begrenzt werden. Einen physisch identischen Speicher nicht mehrfach konfigurieren und keinen zweiten aggressiv abfragenden Client parallel betreiben.

## Registerumfang laut PDF

Spaltenkürzel: **E** = element / one L / one XL, **B** = element backup, **P** = pulse, **N** = pulse neo, **L** = link, **F** = flex storage. Die gemeinsame Spalte E dient hier nur der Dokumentation; die Geräteauswahl bleibt getrennt.

| Register | Bedeutung / Datentyp | Einheit im Adapter | E | B | P | N | L | F |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 975–999 | Manufacturer / Type, STRING25 | Text | – | ✓ | – | – | – | – |
| 1000–1016 | Software EMS, STRING17 | Text | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| 1017–1033 | Software ENS, STRING17 | Text | ✓ | ✓ | ✓ | ✓ | – | – |
| 1034–1050 | Software inverter, STRING17 | Text | ✓ | ✓ | ✓ | ✓ | – | – |
| 1051 | Table version, UINT16 | Zahl | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1052–1053 | Timestamp, UINT32, Low Word zuerst | Unix-Sekunden | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1054–1063 | Serial number, STRING10 | Text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1064 | BM installed, UINT16 | Anzahl | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| 1065 | State, UINT16 | Statuscode | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1066 | Active power, SINT16 | W | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1067 | Apparent power, SINT16 | VA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1068 | SOC, UINT16 | % | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1069–1070 | Energy counter AC→DC, UINT32, Low Word zuerst | Wh | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1071 | Installed capacity, UINT16, Grundmaß 10 Wh | Wh | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1078 | Grid power, SINT16 | W | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1082 | Grid frequency, UINT16, Grundmaß 0,01 Hz | Hz | – | ✓ | ✓ | ✓ | – | ✓ |
| 1083 | Available AC charging power, UINT16 | W | – | ✓ | ✓ | ✓ | – | ✓ |
| 1084 | Available AC discharging power, UINT16 | W | – | ✓ | ✓ | ✓ | – | ✓ |
| 1085 | Usable energy for charging, UINT16 | Wh | – | ✓ | ✓ | ✓ | – | ✓ |
| 1086 | Usable energy for discharging, UINT16 | Wh | – | ✓ | ✓ | ✓ | – | ✓ |
| 1087 | Reactive power, SINT16 | var | – | ✓ | ✓ | ✓ | – | – |
| 1102 | PV-sensor power, UINT16 | W | – | ✓ | ✓ | ✓ | – | – |

Alle Register in dieser Tabelle sind ausschließlich lesbar. Nicht unterstützte Register werden für das jeweilige Modell weder angelegt noch abgefragt. Auch größere Lesegruppen dürfen diese Lücken nicht durchlaufen. Insbesondere erhält flex storage keine Modulanzahl, ENS-/Inverter-Version, Blindleistung oder PV-Sensorleistung aus den dafür nicht freigegebenen Registern.

### Beschreibbare Skalierungsexponenten – nur pulse neo und flex storage

| SF-Register | Datenpunkt | Zugehöriger Messwert |
|---|---|---|
| 2066 | `sF_ACTIVE_POWER` | 1066 Wirkleistung |
| 2067 | `sF_APPARENT_POWER` | 1067 Scheinleistung |
| 2069 | `sF_CHARGE_ENERGY` | 1069/1070 Ladeenergiezähler |
| 2071 | `sF_CAPACITY` | 1071 Kapazität |
| 2078 | `sF_GRID_POWER` | 1078 Netzleistung |
| 2083 | `sF_AVAILABLE_CHARGE_POWER` | 1083 verfügbare Ladeleistung |
| 2084 | `sF_AVAILABLE_DISCHARGE_POWER` | 1084 verfügbare Entladeleistung |
| 2085 | `sF_USABLE_CHARGE_ENERGY` | 1085 verfügbare Ladeenergie |
| 2086 | `sF_USABLE_DISCHARGE_ENERGY` | 1086 verfügbare Entladeenergie |

Typ jeweils **SINT16**, Zugriff **R/W über FC3/FC6**. Die Register enthalten Zehnerexponenten, **keine Leistungen in Watt**. Register 2078 ist insbesondere kein alternativer Netzleistungs-Messwert für Gewerbespeicher, sondern dessen Skalierungsfaktor.

## Umrechnung und Vorzeichen

Zeichenketten werden als **ein Zeichen pro 16-Bit-Registerwert** gelesen. Sie sind keine zwei ASCII-Zeichen pro Register. Bei einer Null-Registerzelle endet die Zeichenkette; ein normales Null-High-Byte vor einem ASCII-Zeichen beendet sie nicht.

Zeitstempel und Ladeenergie werden als `low + high × 65536` zusammengesetzt. Die Werte bleiben unsigned, auch oberhalb von 2.147.483.647. Signed-Leistungen werden als SINT16 dekodiert. Nicht dokumentierte Sentinelwerte werden nicht erfunden.

Für pulse neo und flex storage gilt `Messwert = Rohwert × 10^SF`, einschließlich der Grundmaßeinheit des Messwertregisters. Deshalb gilt für Kapazität in Wh `Rohwert × 10^(1 + SF2071)` und für Frequenz `Rohwert × 10^-2`. Modelle ohne SF-Unterstützung verwenden nur die dokumentierte Grundmaßeinheit.

Beispiele bei SF = 0:

| Messung | Herstellernaher Datenpunkt | Normalisierter EOS-Alias |
|---|---|---|
| Speicher lädt mit 1.200 W | `aCTIVE_POWER = +1200` | `aliases.v1.r.power = -1200` |
| Speicher entlädt mit 500 W | `aCTIVE_POWER = -500` | `aliases.v1.r.power = +500` |
| Netzbezug 400 W | `gRID_POWER = -400` | `aliases.v1.r.gridPower = +400` |
| Einspeisung 400 W | `gRID_POWER = +400` | `aliases.v1.r.gridPower = -400` |
| Kapazitätsregister enthält 960 | `iNSTALLED_CAPACITY = 9600 Wh` | Kein künstlicher Kapazitäts-Sollwert |
| Frequenzregister enthält 5001 | `gRID_FREQUENCY = 50.01 Hz` | Keine weitere Skalierung |

Die VARTA-Werte durchlaufen keine zusätzliche heuristische Frequenzkorrektur oder pauschale Rundung auf ganze W/Wh; die dokumentierte SF-Auflösung bleibt erhalten.

Der herstellernahe Datenpunkt enthält bereits die umgerechnete physikalische Einheit, nicht zwingend die unveränderte Registerzahl. Nur das Vorzeichen bleibt dort herstellergetreu. Die vereinheitlichten EOS-Aliase drehen Speicher- und Netzleistung entsprechend dem bestehenden EOS-Vertrag um.

SFs werden bei jedem relevanten Abruf neu gelesen. Ein fehlender oder nicht sinnvoll in eine endliche Zahl umrechenbarer SF ergibt für den zugehörigen Messwert **null**, niemals einen stillen Ersatzexponenten 0 oder einen alten Cachewert. SOC außerhalb 0–100 wird ebenfalls null, nicht auf den Bereich begrenzt. Registerfehler sind kein Beleg für eine tatsächliche Leistung von 0 W.

## EOS-Datenpunkte und Fähigkeiten

Alle Pfade liegen unter `nexowatt-devices.<Instanz>.devices.<Geräte-ID>.`.

Beispiele für standardisierte, nur lesbare Aliase, je nach Modellverfügbarkeit:

- `aliases.v1.r.soc`, `r.power`, `r.powerAc`, `r.powerCharge`, `r.powerDischarge`.
- `aliases.v1.r.gridPower`, `r.energyCharge`, `r.statusCode`, `alarm.fault`.
- `aliases.v1.r.allowedChargePower`, `r.allowedDischargePower`, `r.pvPower` bei unterstützten Modellen.

Die Modellklasse ist **storageSystem**, passend zur Kategorie ESS. Der vorhandene Alias Contract v1 wird nicht verändert. Zusätzliche Lesewerte wie `aliases.r.capacity`, `r.usableChargeEnergy`, `r.usableDischargeEnergy`, `r.gridFrequency`, `r.statusText` und `r.controlSupported` liegen im ergänzenden Aliasbereich ohne v1, soweit sie im unveränderten Vertrag nicht definiert sind. Die ursprünglichen herstellernahen Register-Datenpunkte bleiben ebenfalls zugänglich.

Es gibt bewusst keine `ctrl.*`-Aliase, keine Schreibfähigkeiten für Leistungsregelung, keine erfundene Batteriespannung/-temperatur und keinen Entlade-Gesamtenergiezähler. `usable energy for discharging` ist verfügbarer Energieinhalt, **nicht** ein kumulierter Entladezähler. Die Schreibbarkeit der SF-Konfiguration wird nicht als Speicher-Steuerfähigkeit beworben.

Statuscodes: 0 BUSY, 1 RUN, 2 CHARGE, 3 DISCHARGE, 4 STANDBY, 5 ERROR, 6 PASSIVE, 7 ISLANDING. `alarm.fault` ist nur bei 5 wahr. Fehlende oder unbekannte Zustände werden nicht als bestätigter Normalzustand behandelt.

## Experten-Schreibzugriffe

**Für normales Monitoring ausgeschaltet lassen.** Änderungen an SFs verändern die Darstellung für alle lesenden Systeme. Die PDF nennt keinen empfohlenen Betriebswert, keine engere erlaubte Exponentenspanne und keine Vorgabe zur Persistenz über Neustarts. Daher nimmt der Adapter keine automatische Normalisierung oder Wiederherstellung der SFs vor.

Bei pulse neo und flex storage erscheint im Admin eine ausdrücklich gekennzeichnete Expertenoption. Die gespeicherte Geräteoption heißt `vartaAllowScaleFactorWrites` und muss den booleschen Wert `true` haben. Ohne diese Freigabe weist der Treiber jeden SF-Schreibauftrag zurück, selbst wenn der Register-Datenpunkt seine protokollseitige Eigenschaft R/W besitzt. Die Freigabe wird beim Wechsel des Gerätemodells in der individuellen Geräteoberfläche zurückgesetzt.

Jeder freigegebene Schreibauftrag durchläuft diese Reihenfolge:

1. Prüfung gegen die feste, modellspezifische SF-Allowlist. Ein übergebener abweichender FC, Offset oder Registerpfad wird nicht übernommen. Ganzzahliger SINT16-Wert −32768 bis +32767; keine booleschen Werte, Brüche, NaN oder Überläufe.
2. Erneutes FC3-Lesen von 1051–1063: Tabellenstand muss 14 sein und die Seriennummer aus STRING10 muss neun Ziffern besitzen. Das ist eine Plausibilitätsprüfung, keine kryptografische Geräteauthentifizierung oder automatische Erkennung des ausgewählten Modells.
3. FC3-Probe des genauen SF-Zielregisters.
4. Ein einzelner FC6-Zugriff mit genau einem 16-Bit-Wert.
5. FC3-Rücklesen desselben SF-Registers. Nur Übereinstimmung bestätigt den Auftrag. Ablehnung, Timeout oder Abweichung erzeugt einen Fehler; kein automatischer Wiederholungsversuch und kein FC16-Fallback.

Auch alle fünf Schritte respektieren den Request-Abstand. Der nächste Live-Abruf liest betroffene Messwerte und SFs neu; einschließlich der Kapazität. Die mehrteiligen Lesezyklen sind keine vom Gerät zugesicherte atomare Momentaufnahme. Währenddessen sollte kein anderes System parallel SFs ändern.

Maximal acht SF-Schreibaufträge können ausstehen; weitere werden abgewiesen. Ein Transport-Reset verwirft vorher wartende Aufträge, statt sie nach Wiederverbindung unbemerkt auszuführen. Beim Stoppen werden wartende Operationen abgebrochen und keine Steuerwerte wiederhergestellt. Es gibt keine Start-, Stop-, Reconnect- oder Watchdog-Schreibzugriffe.

Ein erfolgreicher FC6-Schreibzugriff mit SF-Rückmeldung ist **kein Nachweis eines Lade-/Entladebefehls**. Wurde ein Schreibtelegramm vor einem Verbindungsabbruch bereits übertragen, kann sein Ergebnis unklar sein: den realen Registerwert erneut lesen, nicht blind wiederholen.

## Diagnose und Fehlerverhalten

| Diagnose-Datenpunkt | Bedeutung |
|---|---|
| `diagnostics.tableSupported` | Letzter gelesener Tabellenstand ist 14 |
| `diagnostics.scalingValid` | Benötigte Skalierungen des Abrufs sind verfügbar und umrechenbar; kein allgemeiner „alle Messwerte gültig“-Indikator |
| `diagnostics.externalControlSupported` | Immer false für dieses öffentliche Protokoll |
| `diagnostics.scaleFactorWritesEnabled` | Konfigurierte Expertenfreigabe bei einem SF-fähigen Modell; garantiert noch keine Geräteannahme |
| `diagnostics.note` | Hinweise zu nicht unterstützter Tabelle, optional fehlenden Registern, ungültigen SFs und Funktionsgrenze |

Bei einem anderen Tabellenstand bleiben Versionszahl und Diagnose sichtbar; alle interpretierten Mess- und SF-Werte werden null. Es wird kein kompatibler älterer/neuerer Stand unterstellt, da die PDF Rückwärtskompatibilität ausdrücklich nicht garantiert.

Eine Modbus-Exception 1/2/3 für eine optionale Lesegruppe führt zu null für diese Gruppe und einer Diagnose. Es wird nicht automatisch durch Nachbarregister gescannt. Fehler einer Gruppe mit Kernwerten (Status, Wirkleistung, SOC), Transportfehler und unvollständige Antworten lassen den Abruf scheitern und gehen in die normale Runtime-Verbindungsdiagnose ein. Bei Transportfehlern kann der nächste Poll eine neue Verbindung aufbauen. Alte Werte nach Kommunikationsverlust dürfen nur zusammen mit Online-/Last-Seen-Diagnose bewertet werden.

Heartbeat-Standard: 60 Sekunden, bei link 120 Sekunden, damit die mehrteiligen Abfragen nicht allein wegen des vorgeschriebenen Request-Abstands als ausgefallen gelten. Kommunikation/Online bedeutet nicht automatisch „Tabelle unterstützt“ oder „Speicher regelbar“; diese Fragen beantworten die getrennten Diagnose-/Fähigkeitswerte.

## Inbetriebnahme

Zuerst Repository 0.5.162 einspielen und Adapter-/Admin-Dateien wie im vorhandenen NexoWatt-Updateablauf aktualisieren. Danach das tatsächliche Modell unter ESS → VARTA auswählen, Host eingeben und zunächst TCP 502 / Unit-ID 255 / SF-Schreibfreigabe aus belassen. Keine fremden Default-Offsets oder SunSpec-Scans übernehmen.

Nach dem ersten vollständigen Abruf `tABLE_VERSION = 14`, Seriennummer, SOC, Status, Leistungsvorzeichen und Größenordnungen mit dem Gerät vergleichen. Bei link mehrere Anfrageabstände abwarten. Bei unbekannter Tabelle oder abweichender Registerdarstellung vor weiteren Schritten den passenden Herstellerstand beschaffen. Die PDF enthält keine gerätespezifische Menüanleitung zur Freischaltung des Modbus-Servers; eine solche wird hier nicht erfunden.

Den Speicher mit diesem Profil in EOS **nur als Messwertquelle**, nicht als extern steuerbaren Speicher zuweisen. Eine erforderliche Lade-/Entladeregelung ist mit der vorliegenden Dokumentation nicht implementierbar; dafür ist die ergänzende freigegebene Steuerungsspezifikation des Herstellers erforderlich.

## Implementierung und Prüfungen

Neue Implementierungsdateien: `lib/vartaProtocol.js`, `lib/drivers/vartaModbus.js`. Acht additive Templates in beiden Katalogkopien, gezielte VARTA-Auswahl in der bestehenden Runtime, VARTA-spezifische Aliasdefinitionen und Expertenoption in beiden Admin-Konfigurationsformaten. Der bisherige allgemeine Modbus-Treiber, die bisherigen 184 Templates und der Alias Contract v1 werden nicht umgeschrieben.

`test/vartaModbus.test.js` prüft die unabhängig übertragene Gerätematrix, Datendekodierung, Vorzeichen, Lesegruppen, SFs, Schreibschutz und FC6-Rücklesen, fehlende Register, Versionswechsel, Queue-/Abbruchverhalten, Wiederverbindung nach Runtime-Transportfehler sowie die Admin-Auswahl. Neben simulierten Zeitabständen wird der echte Timer mit zwei Clientaufrufen geprüft. Die vorhandenen Regressionstests werden weiter ausgeführt; der globale Katalogtest berücksichtigt die acht Ergänzungen und 107 zusätzlichen v1-Aliase.

**Prüfgrenze:** Testantworten und Verbindungswiederkehr sind simuliert. Es fand kein Test an einem realen VARTA-Speicher statt. Ein frischer Download/Installationslauf der bereits vorhandenen npm-Abhängigkeiten war in der Build-Umgebung wegen fehlender DNS-Auflösung des npm-Registers nicht möglich; es wurden keine neuen externen Runtime-Abhängigkeiten hinzugefügt. Hersteller-Firmwarevarianten und tatsächliche FC6-Annahme sind vor Ort zu bestätigen. Details zum jeweils ausgeführten Testumfang stehen im Releaseeintrag.
