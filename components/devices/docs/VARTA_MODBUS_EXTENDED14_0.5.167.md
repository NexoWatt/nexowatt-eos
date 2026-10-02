# VARTA – erweitertes Modbus-TCP-Protokoll 14.0 ab 0.5.167

## Umfang

Grundlage ist die bereitgestellte Herstellerdatei `VS-Modbus_V14.0_en_2025-03-12 varta.xlsx`, insbesondere die Blätter `print`, `Pextra_signature` und `counter encryption`. Maßgeblich sind Dokumentversion 14.0, Datum 12.03.2025 und Tabellenstand 14 in Register 1051. Die neue Datei ergänzt die bisherige Public-14-Dokumentation um Steuer- und Diagnosefunktionen. Sie wird nicht mit dem Repository ausgeliefert.

Die bestehenden acht Templates bleiben unter **ESS → VARTA** erhalten: **element, one L, one XL, element backup, pulse, pulse neo, link und flex storage**. Ihre IDs, bisherigen Messwerte und Leistungsvorzeichen bleiben bestehen. Der Registerumfang wird weiterhin je Modell aus der Produktmatrix bestimmt; die erste gemeinsame Herstellerspalte umfasst element / one L / one XL.

Die Erweiterung liefert zusätzliche Messwerte sowie freigebbare Lade-/Entladegrenzen, Pextra, pulse-PSP und Eingabewerte für die VARTA-Visualisierung. Die Frequenzregelungsregister von pulse neo und flex storage sind nach Freischaltung durch VARTA manuell zugänglich. **Pextra ist eine zusätzliche Leistung, kein absoluter Speicher-Sollwert.** Deshalb entsteht daraus kein standardisierter `aliases.v1.ctrl.powerSetpointW`-Regelpfad und auch kein ergänzender `aliases.ctrl.power`-Sollwert. Auch die Frequenzregelung wird wegen der nicht dokumentierten Heartbeat-Fristen nicht automatisch als autonome EOS-Speicherregelung gestartet.

Die Herstellerunterlage beschreibt Register und Protokoll. Schreibfreigaben, Identitätsprüfung, Rücklesen, begrenzte Auftragsgültigkeit und der Verzicht auf automatische Wiederholung sind zusätzliche Entscheidungen dieser Implementierung. Ein erfolgreicher Registerabgleich belegt die Rückmeldung des Geräts, nicht die tatsächlich erreichte physikalische Leistung.

## Einrichtung und Vorgaben

| Einstellung | Vorgabe und Bedeutung |
|---|---|
| Transport / Port | Modbus TCP / 502 |
| Unit-ID | 255 als Herstellerempfehlung; gültiger Adapterbereich 1–255 |
| Adress-Offset | 0; angegebene Registeradressen werden direkt verwendet |
| Lesen / Schreiben | FC3 / ausschließlich FC6; kein FC16-Fallback |
| Mindestabstand je Anfrage | 1.000 ms; bei link 5.000 ms |
| `vartaExtendedEnabled` | Standardmäßig `true`; `false` beschränkt den Betrieb auf den bisherigen Public-Umfang |
| `vartaAllowControlWrites` | Standardmäßig `false`; explizite Freigabe für die erweiterten Steuer- und Visualisierungswerte |
| `vartaAllowScaleFactorWrites` | Standardmäßig `false`; separate Expertenfreigabe für SF-Register |
| `vartaLimitClass` | Standardmäßig leer/unbestätigt; `residential` oder `commercial` nach Bestätigung der Anlagenklasse wählen |
| `vartaLegacyUnpaddedToken` | Standardmäßig `false`; nur für bestätigte Firmware mit dem dokumentierten Fehler bei führenden Token-Nullen einschalten |
| `vartaFrequencyControlEnabled` | Standardmäßig `false`; nur einschalten, nachdem VARTA die Frequenzregelungsregister des konkreten Systems freigeschaltet hat |

Die Anlagenklasse wird nicht allein aus einem Modellnamen geraten. Sie bestimmt, welche nicht nullwertigen UG-/OG-Grenzen der Hersteller annimmt: mindestens 500 W Betrag bei Residential-Systemen bzw. 5.000 W bei Commercial-Systemen. Ohne bestätigte Klasse werden solche Grenzvorgaben abgewiesen. Null bleibt ein eigener dokumentierter Grenzfall und wird nicht auf die Mindestleistung angehoben.

Die Freigabe der Frequenzregelung im Adapter ersetzt keine Herstelleraktivierung. Die XLSX nennt Register 1300–1306 und 2301–2305 als standardmäßig deaktiviert und durch VARTA zu aktivieren. Der Adapter versucht weder eine versteckte Parameteränderung noch eine Umgehung dieser Aktivierung.

Ein vollständiger Abruf braucht mehrere Modbus-Anfragen. Der Mindestabstand gilt auch für Versionsprüfung, Authentifizierung, FC6 und Rücklesen. Erweiterte Messwerte und Schreibabläufe können deshalb viele Sekunden benötigen; bei link entsprechend länger. Eine Pollvorgabe von einer Sekunde bedeutet nicht, dass alle Werte oder Sollwertbestätigungen jede Sekunde verfügbar sind. Anfragen an denselben konfigurierten Host/Port teilen sich innerhalb des Adapterprozesses die vorhandene Warteschlange.

## Ergänzte Register je Modell

**E** = element / one L / one XL, **B** = element backup, **P** = pulse, **N** = pulse neo, **L** = link, **F** = flex storage. Ein Strich bedeutet: in der Herstellerdatei nicht als funktional unterstützt ausgewiesen. Nicht unterstützte Register werden nicht probeweise über benachbarte Adressen gesucht.

| Register | Bedeutung | Typ / Einheit im Adapter | E | B | P | N | L | F |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1072 | Fehlercode | UINT16 | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| 1073 | Timer UG/OG / Pextra-Freigabe | UINT16 / s | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1074 | UG: maximal erlaubte Entladeleistung | SINT16 / W, negativ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1075 | OG: maximal erlaubte Ladeleistung | UINT16 / W, positiv | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1076 | Pextra-Challenge/Antwort | UINT16 | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| 1077 | Pextra: zusätzliche Lade-/Entladeleistung | SINT16 / W | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| 1079–1080 | Verschlüsselter Entladezähler, Low Word zuerst | UINT32 / Rohwert ohne Wh | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| 1081 | Prüfwert des Entladezähler-Schlüssels | UINT16 | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| 1088 | Umgebungstemperatur | SINT16 / °C, Rohwert × 0,1 | – | – | – | ✓ | – | ✓ |
| 1089 | PSP: relative Leistungsanforderung | SINT16 / −100 bis +100 %, Rohwert ÷ 10 | – | – | ✓ | – | – | – |
| 1090–1091 | Nominale AC-Lade-/Entladeleistung | UINT16 / W | – | – | ✓ | ✓ | – | – |
| 1100 | Übergebene lokale Erzeugungsleistung | UINT16 / W | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1101 | Übergebene lokale Erzeugungsenergie heute | UINT16 / Wh, Grundmaß 10 Wh | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1200–1201 | Prognose möglicher Lade-/Entladeleistung | UINT16 / W | – | – | – | – | – | ✓ |
| 1300 | Frequenzregelung bereit | SINT16 / 0 oder 1 | – | – | – | ✓ | – | ✓ |
| 1301–1302 | Verfügbare Lade-/Entladeenergie für Frequenzregelung | UINT16 / Wh | – | – | – | – | – | ✓ |
| 1303 | Gespiegeltes Alive-Signal | SINT16 | – | – | – | ✓ | – | ✓ |
| 1304 | Frequenzregelung aktiv | SINT16 / 0 oder 1 | – | – | – | ✓ | – | ✓ |
| 1305 | Frequenzregelungs-Sollleistung | SINT16 / W, positiv Laden | – | – | – | ✓ | – | ✓ |
| 1306 | Alive-Vorgabe des externen Controllers | SINT16 | – | – | – | ✓ | – | ✓ |

1074–1077, 1089, 1100–1101 und 1304–1306 sind laut Tabelle R/W; alle anderen Werte oben sind lesbar. Register 1076 wird vom Adapter für den Pextra-Ablauf verwaltet, nicht als frei zu schreibender Standardsollwert angeboten. Der Erweiterungskatalog umfasst 31 Datenpunktdefinitionen einschließlich SFs; jedes Modell erhält nur seine dokumentierte Teilmenge. Die zusätzlichen Register werden nur in unterstützten Gruppen gelesen. Die bestehende Public-Registerliste ist in [VARTA Public 14](VARTA_MODBUS_PUBLIC14_0.5.162.md) dokumentiert.

Die Temperaturspalte für pulse ist leer, daher wird 1088 dort nicht vorausgesetzt. Bei einer Kaskade beschreibt VARTA 1088 als höchste Umgebungstemperatur der beteiligten Speicher. PSP 1089 ist ausschließlich für pulse funktional ausgewiesen; die Notiz zu pulse neo/flex storage nennt ein vorhandenes Register ab Firmware 1.37 ausdrücklich ohne Funktion. Ein vorhandenes Register ist somit keine Freigabe des entsprechenden Steuerpfads.

1100 und 1101 sind **Eingaben für VARTAs Visualisierung**. Sie begrenzen keinen PV-Wechselrichter und ersetzen keinen vom Speicher gemessenen PV-Sensorwert aus 1102. Für flex storage vermerkt die Datei eine eingeschränkte Funktion ohne Weiterleitung ins Portal. 1200 und 1201 sind unverbindliche Prognosen, keine garantierte Leistung und kein Sollwert.

### Zusätzliche Skalierungsregister

| SF-Register | Zugehöriger Wert | Unterstützte Modelle |
|---|---|---|
| 2074 | UG 1074 | pulse neo, flex storage |
| 2075 | OG 1075 | pulse neo, flex storage |
| 2077 | Pextra 1077 | pulse neo, flex storage |
| 2100 | Erzeugungsleistung 1100 | pulse neo, flex storage |
| 2101 | Erzeugungsenergie 1101 | pulse neo, flex storage |
| 2301 | Frequenzregelung: Ladeenergie 1301 | flex storage |
| 2302 | Frequenzregelung: Entladeenergie 1302 | flex storage |
| 2305 | Frequenzregelung: Sollleistung 1305 | pulse neo, flex storage |

SFs sind SINT16-Zehnerexponenten. Für einen Leistungswert gilt `W = Rohwert × 10^SF`; für 1101 gilt `Wh = Rohwert × 10^(1 + SF2101)`. Modelle ohne zugehörigen SF verwenden das dokumentierte Grundmaß. Beispielsweise entsprechen 181 im Register 1101 bei SF = 0 genau 1.810 Wh bzw. 1,81 kWh, nicht 181 kWh.

Beim Schreiben werden die physikalischen Einheiten zurück in die Registerauflösung gerechnet. Der Rohwert muss exakt darstellbar und innerhalb des jeweiligen UINT16-/SINT16-Bereichs sein; der Treiber rundet einen unpassenden Sollwert nicht stillschweigend auf eine andere Leistung. Fehlende oder ungültige SFs verhindern die betreffende Interpretation bzw. den Schreibzugriff. Die bereits vorhandenen Public-SFs bleiben unverändert und werden weiterhin separat freigegeben.

## Lade-/Entladegrenzen UG und OG

Die standardisierten Grenzaliase `aliases.v1.ctrl.maxChargePowerW` und `aliases.v1.ctrl.maxDischargePowerW` arbeiten beide mit **positiven Wattbeträgen**. Die Entladegrenze wird für UG 1074 ins negative Herstellervorzeichen übersetzt; die Ladegrenze geht positiv an OG 1075. Diese Grenzen begrenzen die interne VARTA-Regelung. Eine Grenze von 4.200 W erzwingt keine tatsächliche Lade- oder Entladeleistung von 4.200 W.

Für SINT16 wird korrektes Zweierkomplement verwendet: `−500` wird zum Registerwort `65036` (`0xFE0C`). Der Kommentar `65535 − |UG|` in `print!Q33` wäre um eins verschoben und wird deshalb nicht als alternative Drahtkodierung übernommen. `print!J34` beschreibt OG als Ladegrenze, nennt im Nullwertsatz aber widersprüchlich „discharging“. Diese Wortwahl wird nicht zur Umkehrung der Registerfunktion verwendet.

Der Treiber prüft Tabellenstand, Seriennummer, Modellfreigabe, Anlagenklasse, SF und Wertebereich, schreibt genau das freigegebene Register und liest es zurück. Für eine erfolgreiche UG-/OG-Bestätigung muss zusätzlich der Timer 1073 positiv sein. Ein passender Grenzwert bei inaktivem Timer wird als fehlgeschlagene Bestätigung gemeldet.

Die Tabelle nennt 120 Sekunden bis zum automatischen Löschen von UG/OG, erklärt jedoch nicht eindeutig, welcher UG-/OG-Zugriff den Timer startet oder erneuert. Der Adapter nimmt keinen solchen Refresh an und startet für einen Grenzbefehl nicht ungefragt eine Pextra-Authentifizierung. Insbesondere besitzt link keinen Pextra-Token. Das tatsächliche Timerverhalten der eingesetzten Firmware muss deshalb bei der Inbetriebnahme geprüft werden; Rücklesen allein ersetzt diese Prüfung nicht.

## Pextra: Challenge-Response und 120-Sekunden-Timer

Pextra 1077 ist eine **zusätzliche** Lade-/Entladeleistung innerhalb der VARTA-Regelung. Der Datenpunkt und ergänzende Herstelleraliase behalten diese Bedeutung; sie werden nicht als absoluter EOS-Leistungssollwert oder als Start-/Stop-Freigabe ausgegeben. Die Pextra-Seite legt zudem keine eigenständige eindeutige Vorzeichenbeschreibung fest. Die Implementierung bewahrt deshalb das native Vorzeichen, statt daraus einen universellen Regelvertrag abzuleiten.

Jeder neue Pextra-Auftrag durchläuft einen neuen Challenge-Response-Ablauf: bisherigen Timer aus 1073 und Challenge aus 1076 lesen, Antwort berechnen, Antwort per FC6 an 1076 schreiben, erneuerte Timerfreigabe prüfen und erst anschließend den Pextra-Wert schreiben und zurücklesen. Die Timerprüfung berücksichtigt die vergangene Zeit und verlangt einen neu gestarteten 120-Sekunden-Zeitraum; die Restlaufzeit eines älteren Befehls genügt nicht. Die Antwort wird über CRC16/MODBUS aus der im Protokoll festgelegten ASCII-Zeichenfolge und der vierstelligen großgeschriebenen Hex-Darstellung der Challenge berechnet.

Die dokumentierten Beispiele dienen als feste Prüfwerte:

| Challenge | Antwort bei vierstelliger Darstellung |
|---|---|
| `0x7CED` | `0xFCD6` |
| `0xCDB1` | `0x1ABF` |
| `0x099A` | `0x9216` |
| `0x4955` | `0x8512` |

`Pextra_signature!C50` weist auf Linux-EMS-Firmware hin, die führende Nullen irrtümlich weglässt. Dafür existiert die ausdrückliche Kompatibilitätsoption `vartaLegacyUnpaddedToken`. Es gibt keine automatische zweite Authentifizierungsvariante und keine Folge von geratenen Antwortversuchen.

Laut Protokoll erneuert ausschließlich eine gültige Tokenantwort den Timer auf 120 Sekunden. Das erneute Schreiben von 1077 allein verlängert ihn nicht. Nach Ablauf fällt Pextra auf 0 zurück. Der Adapter erneuert diesen Timer nicht autonom im Hintergrund und stellt alte Pextra-Befehle nach Start oder Wiederverbindung nicht wieder her. Für eine neue Vorgabe ist ein neuer externer Auftrag erforderlich.

Die Unterlage widerspricht sich bei der Frage, ob eine gültige Antwort in 1076 stehen bleibt (`C9`) oder jeder Antwortversuch eine neue Challenge erzeugt (`A25`). Deshalb ist ein bloßer Gleichheitsvergleich mit der geschriebenen Tokenantwort kein ausreichender Erfolgsnachweis. Timer und Rückmeldung des eigentlichen Pextra-Werts werden ausgewertet.

## PSP und Frequenzregelung

PSP 1089 bei pulse verwendet einen nativen Bereich von −1000 bis +1000 in Tausendsteln. Der Adapter rechnet diesen in **−100 bis +100 % mit 0,1-%-Auflösung** um; beispielsweise schreibt eine Vorgabe von 25 % den Registerwert 250. Es wird nicht automatisch mit den Nennleistungen 1090/1091 in einen Watt-Sollwert für EOS umgerechnet: Die Unterlage definiert dafür weder einen vollständigen Vorzeichenvertrag noch einen Steuerungs-Watchdog. PSP bleibt ein ausdrücklich freizugebender Herstellerzugriff.

Für pulse neo und flex storage kann nach bestätigter VARTA-Freischaltung der Frequenzregelungsblock genutzt werden. 1300 muss für Aktivierung bzw. Leistungsanforderung Bereitschaft melden. 1304 = 1 aktiviert die Regelung auf 1305; 1304 = 0 deaktiviert sie und bleibt auch ohne Bereitschaft als expliziter Auftrag möglich. Bei 1305 ist das Vorzeichen ausdrücklich dokumentiert: **positiv Laden, negativ Entladen**, skaliert mit 2305. Ein an 1306 geschriebenes Alive-Signal wird sowohl durch Rücklesen von 1306 als auch gegen die Spiegelung in 1303 geprüft.

Die Datei legt für diesen Alive-Mechanismus weder einen maximalen Abstand noch eine Ablaufzeit oder einen sicheren Ausfallzustand fest. Der Adapter sendet daher keinen erfundenen automatischen Heartbeat und aktiviert die Frequenzregelung nicht beim Start, bei einem gewöhnlichen Leistungsauftrag oder nach Wiederverbindung. Es entsteht kein standardisierter `aliases.v1.ctrl.powerSetpointW`-Pfad. Für eine autonome EOS-Frequenzregelung sind zunächst VARTAs verbindliche Vorgaben zu Alive-Takt, Ausfallverhalten und Aktivierungsreihenfolge erforderlich.

## Datenpunkte und Aliase verwenden

Alle folgenden Pfade beginnen unter `nexowatt-devices.<Instanz>.devices.<Geräte-ID>.`. Steueraliase werden nur bei freigegebenem Steuerzugriff und passendem Modell angelegt; Frequenzaliase benötigen zusätzlich `vartaFrequencyControlEnabled = true`. Die native Registerebene verwendet bereits die angegebene physikalische Einheit, nicht die unverändert übertragenen Registerwörter.

| Funktion | Nativer Datenpunkt | Steueralias und Eingabe |
|---|---|---|
| Ladegrenze OG | `cHARGE_LIMIT` | `aliases.v1.ctrl.maxChargePowerW`: positiver W-Betrag; ergänzend `aliases.ctrl.maxChargePowerW` |
| Entladegrenze UG | `dISCHARGE_LIMIT` | `aliases.v1.ctrl.maxDischargePowerW`: positiver W-Betrag wird für das native Register negiert; ergänzend `aliases.ctrl.maxDischargePowerW` |
| Pextra | `aDDITIONAL_POWER` | `aliases.ctrl.additionalPowerW`: zusätzliche W-Leistung mit nativem Vorzeichen |
| pulse-PSP | `pOWER_FRACTION` | `aliases.ctrl.powerFractionPct`: −100 bis +100 %, natives Vorzeichen |
| Visualisierung: PV-Leistung / Tagesenergie | `eXTERNAL_PV_POWER` / `eXTERNAL_PV_ENERGY` | `aliases.ctrl.externalPvPowerW` / `aliases.ctrl.externalPvEnergyWh`: W bzw. Wh |
| Frequenzregelung aktiv | `fREQUENCY_ACTIVE` | `aliases.ctrl.frequencyActive`: `true` / `false`; nativer Datenpunkt 1 / 0 |
| Frequenzregelungs-Sollleistung | `fREQUENCY_POWER` | `aliases.ctrl.frequencyPowerW`: W, positiv Laden / negativ Entladen |
| Alive-Vorgabe | `fREQUENCY_ALIVE` | `aliases.ctrl.frequencyAlive`: vorzeichenbehaftete 16-Bit-Ganzzahl |

Zu den ergänzenden `aliases.ctrl.*`-Pfaden bestehen gleichnamige `aliases.r.*`-Rückmeldungen, etwa `aliases.r.additionalPowerW` oder `aliases.r.maxDischargePowerW`. Für die Timerkontrolle dient `cONTROL_REMAINING_S` bzw. `aliases.r.controlRemainingS`; Bereitschaft und Alive-Spiegelung liegen unter `aliases.r.frequencyReady` und `aliases.r.frequencyAliveMirror`. Das normale Messleistungs-Alias `aliases.v1.r.power` bleibt beim EOS-Vorzeichen **positiv Entladen / negativ Laden**. Das ausdrücklich herstellernative `aliases.ctrl.frequencyPowerW` verwendet das umgekehrte Vorzeichen.

Die speziellen Pextra-, PSP-, Visualisierungs- und Frequenzaliase erweitern den Herstellerbereich, nicht den standardisierten absoluten EOS-Regelvertrag. Automatische EOS-Anbindungen müssen die tatsächlich im Aliasmanifest ausgewiesenen Fähigkeiten verwenden; der fehlende absolute `ctrl.powerSetpointW` darf nicht durch einen ähnlich benannten Spezialalias ersetzt werden.

## Verschlüsselter Entladezähler

1079/1080 werden mit Low Word zuerst zu einem 32-Bit-Rohwert zusammengesetzt. Die Herstellerdatei beschreibt eine XOR-Entschlüsselung und eine Schlüsselprüfung über 1081. Der echte **KEY und SALT fehlen ausdrücklich** und sollen nur unter zusätzlicher NDA bereitgestellt werden. Der im Beispiel abgedruckte Schlüssel ist laut Dokument nicht der tatsächliche Schlüssel.

Der Adapter gibt deshalb nur den verschlüsselten Rohwert und den Prüfwert aus, ohne Energieeinheit und ohne `r.energyDischarge`-Alias. Es wird kein Beispieldatenschlüssel eingebaut und kein plausibel aussehender Wh-/kWh-Wert aus dem verschlüsselten Zähler errechnet. Außerdem vermerken die Kommentare der XLSX ungeprüfte Entschlüsselung bzw. nicht funktionierende Skalierung; die echte Zählerauswertung braucht eine gesonderte Bestätigung mit gültigen Herstellerdaten.

## Schreibbestätigung und Fehlerverhalten

Jeder Schreibweg verwendet die feste modellspezifische Registerliste, eine frische Tabellen-/Seriennummernprüfung und den vorgesehenen FC6-Zugriff. Ein übergebener anderer Registerpfad, Datentyp, Offset oder Funktionscode erweitert diese Freigabe nicht. Werte müssen numerisch gültig und in der dokumentierten Einheit exakt darstellbar sein. Die konfigurierte Freigabe wird beim Auftrag erneut geprüft.

Ein erweiterter Steuerauftrag hat ab Eingang eine begrenzte Gültigkeit von **30 Sekunden, bei link 60 Sekunden**. Sein Alter wird beim Verlassen der Warteschlange und nach dem vorgeschriebenen Anfrageabstand unmittelbar vor jedem FC6 erneut geprüft. Diese Frist betrifft Steueraufträge, nicht die separat freigegebene SF-Konfiguration. Durch lange Abrufe veraltete Vorgaben werden abgewiesen. Transportfehler, Rückleseabweichung oder fehlende Gerätefreigabe erzeugen einen Fehler statt einer positiven Bestätigung. Aufträge werden nicht automatisch wiederholt oder nach Wiederverbindung nachgeholt. Nach einem Abbruch kann ein bereits gesendeter FC6 dennoch gewirkt haben; zur Klärung den realen Registerwert und den Timer lesen.

Eine nicht unterstützte Tabelle, fehlende optionale Register oder ungültige Skalierungen ergeben keine erfundenen Nullmessungen. Die bisherigen Versions-, Skalierungs- und Verbindungsdiagnosen bleiben relevant. Eine Online-Verbindung beweist weder einen aktiven Steuerweg noch eine tatsächlich angenommene Leistungsanforderung. Ebenso bedeutet eine freigegebene manuelle Herstellerfunktion noch keine verfügbare absolute EOS-Regelung.

| Diagnose | Aussage des letzten erfolgreichen Abrufs |
|---|---|
| `diagnostics.externalControlSupported` | Tabellenstand 14 und erweiterter Protokollbetrieb; beschreibt vorhandene Spezialsteuerfunktionen, keine absolute EOS-Regelfähigkeit |
| `diagnostics.controlWritesEnabled` | Unterstützte Tabelle, erweiterter Betrieb und konfigurierte Steuer-Schreibfreigabe |
| `diagnostics.frequencyControlEnabled` | Unterstützte Tabelle, passendes Modell und konfigurierte Frequenzfreigabe; tatsächliche Gerätebereitschaft separat über 1300 prüfen |
| `diagnostics.tokenMode` | Gewählter Algorithmusmodus: `documented-4-digit-hex` oder `legacy-unpadded` |
| `diagnostics.note` | Optionale Registerfehler, fehlende Skalierung und Hinweise zum jeweiligen Protokollumfang |

Diese Diagnosen werden durch Polling aktualisiert; sie sind keine Quittung eines einzelnen FC6 und kein fortlaufender Heartbeat der Frequenzregelung. Für Annahme, Frische und Wirkung eines Befehls sind dessen Schreibbestätigung, die echte Register-/Timer-Rückmeldung und die aktuellen Messwerte gemeinsam maßgeblich.

## Inbetriebnahme und Prüfung am Gerät

1. Repository 0.5.167 einspielen und Adapter-/Admin-Dateien nach dem vorhandenen Updateablauf aktualisieren. Das tatsächliche VARTA-Modell auswählen; vorhandene Modell-IDs bleiben gültig.
2. Host, TCP-Port 502, Unit-ID 255 und Offset 0 prüfen. Zunächst alle Schreibfreigaben ausgeschaltet lassen. Nicht denselben Speicher mehrfach mit unterschiedlichen Hostnamen konfigurieren.
3. Ersten vollständigen Abruf abwarten. Tabellenstand 14, Seriennummer, SOC, Leistungsvorzeichen, zusätzliche Temperatur-/Nennleistungswerte und Einheiten mit der Geräteanzeige vergleichen. Wegen der Anfrageabstände ausreichend Zeit einplanen.
4. Für UG/OG die Anlagenklasse mit den Angaben des konkreten Systems bestätigen, anschließend die Steuerfreigabe einschalten. Einen passenden, innerhalb der Anlagenleistung liegenden Grenzwert vorgeben und Registerrückmeldung, Timer sowie tatsächliches Verhalten kontrollieren. Bei ausbleibendem Timer keine erfolgreiche Limitregelung voraussetzen.
5. Pextra getrennt von UG/OG prüfen: neue Vorgabe, Challenge-Response, Timer und Rücklesen beobachten. Die additive Wirkung und den Rückfall von Pextra nach Timerablauf am Gerät prüfen. Den Token-Kompatibilitätsmodus nur bei bestätigter betroffener Firmware verwenden.
6. Frequenzregelung erst nach VARTA-Aktivierung des konkreten Systems freigeben. Bereitschaft und manuelle Alive-Spiegelung prüfen. Vor Einbindung in eine automatische Regelung die fehlenden Takt-/Timeout-Vorgaben vom Hersteller einholen.
7. Bei Abweichungen Modell, EMS-Firmware, Tabellenstand, betroffene Register, SFs, Timer und konkrete Fehlermeldung festhalten. Auf dieser Grundlage lässt sich eine Firmwarebesonderheit prüfen, ohne Adressen, Einheiten oder Kontrollsequenzen zu erraten.

Die automatisierten Protokolltests prüfen unter anderem die Modellmatrix, Dekodierung, Skalierung, Token-Beispiele, Freigaben, Timer- und Rückleseverhalten sowie den Erhalt der bisherigen Profile. Den ausgeführten Release-Testumfang dokumentiert der [Versionshinweis 0.5.167](CHANGELOG.md). **Es fand kein Test an einer realen VARTA-Anlage statt.** Gerätespezifische Firmware und tatsächliche Leistungsannahme müssen bei der Inbetriebnahme bestätigt werden.
