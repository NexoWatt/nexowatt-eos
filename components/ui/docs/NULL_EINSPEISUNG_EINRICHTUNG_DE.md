# Nulleinspeisung einrichten – EOS 1.0.21

Als **Admin oder Installateur** im **EMS-AppCenter → Netzlimits** einrichten.
Hier stehen Nulleinspeisung, Wechselrichter-Zuordnung und Diagnose zusammen.
Kunden bedienen ihre freigegebenen Verbraucher, ändern aber keine technischen
Datenpunkt-Zuordnungen.

## 1. Messung und Anschlussgrenze

Unter **Zuordnung → Allgemein** die tatsächliche Netzanschlussleistung und den
**signierten Netzpunkt (NVP)** hinterlegen. Er muss den gesamten Netzaustausch
der Anlage erfassen: **positiv = Bezug, negativ = Einspeisung**. Keinen reinen
Bezugszähler, Energiezähler in kWh oder Wechselrichterausgang als Ersatz verwenden.
Netzlimits zeigt diese zentrale Zuordnung an; es gibt keine zweite Anschlussgrenze.

Die PV-Erzeugung ebenfalls messen: passende zentrale PV-Summe oder einzelne
Wechselrichter-Istleistungen zuordnen. Summen und enthaltene Einzelwerte nicht
doppelt einrichten. Bei Hybridanlagen PV und Batterie sauber auseinanderhalten.
Zusätzliche PV-Startversuche erfordern direkte, höchstens 5 Sekunden alte
Messnachweise. Ein größeres Stale-Timeout macht seltene Messungen nicht schneller.

## 2. Wechselrichter zuordnen

Im Wechselrichter-Abschnitt unter **Netzlimits** jeden zu regelnden Wechselrichter
anlegen und benennen. Seine Bezugsleistung muss positiv sein. Intern heißt das
bisherige Feld `kwp`: Die Regelung verwendet den Wert mal 1.000 als maximale
Leistung in W und als Gewicht für die Verteilung. Bei Prozentvorgaben muss der
Wert zur Leistung passen, auf die sich **100 % am tatsächlichen Datenpunkt**
beziehen. Nicht ungeprüft die DC-Modulleistung einsetzen.

| Datenpunkt | Bedeutung | Verwendung |
| --- | --- | --- |
| PV-Istleistung (W), Lesen | Tatsächlich erzeugte Leistung | PV-Messung/Summierung, wenn keine passende zentrale PV-Summe zugeordnet ist. |
| PV-Erzeugungsgrenze (W), Schreiben | Obergrenze der erzeugten Wirkleistung | Wenn der Wechselrichter eine Leistungsbegrenzung in W erwartet. |
| PV-Erzeugungsgrenze (%), Schreiben | Obergrenze von 0 bis 100 % | Wenn der Wechselrichter Prozent erwartet; Bezugsleistung prüfen. |
| Netzeinspeisegrenze (W), Schreiben | Erlaubte Einspeisung am vom Gerät geregelten Netzpunkt | Nur für eine echte herstellerseitige Einspeisebegrenzung mit passender Netzpunktmessung. |

**Einspeise-Limit 0 W bedeutet keine Einspeisung. PV-Limit 0 W bedeutet keine
PV-Erzeugung. Diese Datenpunkte dürfen nicht verwechselt werden.** Bei PV-Limit
W/% berechnet EOS fortlaufend die zur lokalen Aufnahme passende Erzeugungsgrenze.
Beim Einspeise-Limit übergibt EOS die Exportgrenze; der Herstellerregler führt
die PV anhand seiner eigenen Netzpunktmessung nach.

Nur passende Schreibschnittstellen zuordnen. Nicht denselben Datenpunkt als
W- und Prozentziel oder mehrfach für unterschiedliche Wechselrichter eintragen.
Ein Wert in W ist nicht automatisch kW oder ein herstellerspezifischer Rohwert;
die Geräteanbindung muss ihn passend normieren. Ein Messdatenpunkt ist kein
Schreibziel. Eine ausgefüllte Zuordnung beweist keine Befehlsannahme am Gerät.

Mehrere WR erhalten anteilige Vorgaben nach ihrer hinterlegten Bezugsleistung.
Die separate EVU-Relaisregelung darf keine konkurrierenden Zuordnungen desselben
Schreibziels erhalten. Gemeldete Zuordnungskonflikte vor Aktivierung beheben.
Bei fehlerhaften Gruppen sperrt EOS positive Vorgaben und versucht nur auf
eindeutig geeigneten Ausgängen eine Begrenzung auf 0. Eine fehlende oder
mehrdeutige Geräteanbindung kann dadurch nicht repariert werden.

## 3. Grundeinstellungen

| Einstellung | Eintrag / Bedeutung |
| --- | --- |
| Einspeisebegrenzung | Einschalten und zunächst im Diagnose/Testmodus einrichten. |
| Lokale Sicherheitsobergrenze Einspeisung | **0 W** für Nulleinspeisung. |
| Installateurfreigabe | Nach Prüfung von Zuordnung und Messrichtung erteilen. |
| Betriebsart | Erst nach Prüfung **Aktiv** wählen. Diagnose schreibt keine dynamischen WR-Vorgaben; separate EVU-Relaisvorgaben sind davon unabhängig. |
| Ziel-Netzbezug / Bias | Bestehender Standard **80 W**; kleine Bezugsreserve um die Nullgrenze, anlagenbezogen abstimmen. |
| Totband / Deadband | Bestehender Standard **50 W**; kleine Abweichungen lösen nicht sofort eine neue Änderung aus. |
| Rückfallgrenze bei externem Reglerausfall | Für eine 0-W-Anlage **0 W**. Betrifft externe Führungsdaten und ersetzt keinen Geräte-Watchdog. |

Bewusst gesetzte Bestandswerte bleiben erhalten. Bei besonderen Tarifsituationen
kann der bestehende Regler eine höhere Bezugsreserve verwenden; den wirksamen
NVP-Zielwert zeigt die Diagnose. Anlagen- und Verbraucher-Bezugsgrenzen gelten weiter.

## 4. PV nutzen, obwohl am Netzpunkt kein Überschuss sichtbar ist

Bei abgeregelter PV kann am NVP 0 W stehen, obwohl Sonnenleistung verfügbar wäre.
Die gemeinsame Strategie kann dann einen begrenzten Startversuch für genau einen
Verbraucher erlauben und anhand echter Messwerte die PV-Nachlieferung prüfen.

- **Maximale zusätzliche PV-Prüflast:** Standard **4.200 W**. Obergrenze eines
  Startversuchs, keine normale Ladeleistungsgrenze und keine zugesicherte PV.
  **0 W** sperrt zusätzliche Teststarts.
- **Gemeinsame Netzüberbrückung:** Standard **600 W für 45 s** für bereits
  laufende PV-Ladung bei kurzen Einbrüchen. Dies ist ausdrücklich Netzenergie.
  0 W oder 0 s deaktiviert die Überbrückung.
- **Pause nach PV-Ladestopp:** Standard **180 s**. Weitere geräteseitige
  Mindestlaufzeiten und Phasenwechsel-Sperren gelten weiterhin.

Startversuche können kurz Netz- oder Speicherenergie beanspruchen. Falls das
nicht zulässig ist, Prüflast auf 0 W setzen. Auch die technische Mindestleistung
eines DC-Geräts muss innerhalb des zulässigen Budgets liegen. Eine Anforderung
allein zählt nicht als nachgewiesene PV-Leistung.

## 5. Verbraucher passend einstellen

**Wallbox:** technische Minima/Maxima, Istleistung und Steuerung passend zum Gerät
zuordnen. Für AC-Phasenumschaltung zusätzlich Schreibdatenpunkt, soweit verfügbar eine Rückmeldung und
**AC-Phasenmodus Auto PV 1p/3p** einrichten. Lademodus **Auto** allein ändert einen
fest auf 3p eingestellten Ladepunkt nicht auf 1p. Bei 230 V und 6 A ergeben sich
etwa 1,38 kW bei 1p bzw. 4,14 kW bei 3p; Geräteschritte können höhere Minima verlangen.

**Maximaler Netzanteil je Ladepunkt:** beispielsweise **3.700 W**, wenn der
Verbraucher höchstens diesen Netzanteil nutzen darf. Zugeordnete PV darf die
Gesamtladung darüber anheben. Freigegebene, bestätigte Speicherunterstützung zählt
separat. Bei aktiver Nulleinspeisung gilt die Netzanteilgrenze auch für Auto und
Min+PV und hebt kein Anlagen- oder Phasenlimit auf.

**Speicher:** globale Freigaben, SoC-Grenzen und Kundenauswahl „Schützen“ oder
„Mitnutzen“ beachten. Mitnutzen allein garantiert keine Leistung; die Entladung
muss freigegeben und gemessen sein. Reines PV-Laden rechnet Batterieenergie
weiterhin nicht als PV.

**Heizstab:** Stufen oder Leistungssteuerung, Istleistung, Temperaturmessung und
Temperaturgrenzen prüfen. Nur freigegebene Verbraucher nehmen an der Automatik
teil. Netz-, Temperatur- und Speicherschutz bleiben vorrangig.

## 6. Optionale Command-States

Die optionalen Speicher-/Ladepunkt-/Flex-/Mesh-Command-States sind neutrale
**JSON-Schnittstellen** für speziell eingerichtete Integrationen. Für bereits
über EOS konfigurierte Geräte müssen sie nicht zusätzlich ausgefüllt werden.
Hier keine gewöhnlichen Zahlen-Sollwerte von Wechselrichtern oder Wallboxen zuordnen.

## 7. Speichern, prüfen und freigeben

1. Speichern und erneut öffnen: Zuordnungen müssen erhalten bleiben. Im
   Diagnosebetrieb NVP-Richtung und plausible PV-Istwerte prüfen.
2. Fehlende Schreibziele, Bezugsleistungen und Konflikte beheben. Diagnose kann
   Zuordnungen prüfen, aber ohne Schreiben keine Geräteannahme beweisen.
3. Unter kontrollierten Bedingungen Aktiv wählen und reale WR-Reaktion sowie
   NVP-Messung beobachten.
4. Lastwechsel, Wolken, Speicherzustände und Kommunikationsausfall testen. Die
   Leistung muss nachführen; wiederholtes Laden/Stoppen gezielt untersuchen.

Bei fehlender NVP-Messung kann EOS einen begrenzenden Befehl an erreichbare Geräte
senden. Bei ausgefallener Gerätekommunikation ist keine Zustellung zugesichert.
Deshalb den geräteeigenen Kommunikations-Watchdog/Rückfall projektgerecht
einrichten. Softwaretests ersetzen diesen Anlagentest nicht.

Technische Details: [PV-Strategie](NULL_EINSPEISUNG_PV_STRATEGIE_DE.md).
