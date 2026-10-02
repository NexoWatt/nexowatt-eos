# NexoWatt EOS 1.0.20

Dies ist die offizielle Stable-Version 1.0.20 vom 24.09.2026.

## Nulleinspeisung und erlaubter Netzbezug

Nulleinspeisung begrenzt die Abgabe ins öffentliche Netz. Sie verbietet keinen
Netzbezug. Wallboxen und andere EMS-Verbraucher arbeiten weiter innerhalb ihrer
Freigaben, Betriebsarten und Netzgrenzen. Ohne PV kann Min+PV beziehungsweise
Auto ohne vorrangigen Tarif-/Zielentscheid mit seinem erlaubten Minimum laden;
Boost kann die erlaubte Netzleistung nutzen. Reines PV-Laden benötigt weiterhin
bestätigte PV und wird nicht unbemerkt zu Netz- oder Batterieladen.

Die seit 1.0.19 vorhandene zusätzliche LP-Netzgrenze wirkt ausschließlich bei
aktiver, freigegebener Nulleinspeisung mit 0-W-Exportziel. Diagnosebetrieb und
abgeschaltete Nulleinspeisung aktivieren diese Zusatzregel nicht. Die allgemeinen
NVP-, Stations-, Phasen-, Geräte- und §14a-Grenzen bleiben vorrangig.

## Speicher gezielt mitnutzen oder schützen

1.0.19 konnte freigegebene Speicherunterstützung zwar im Gesamtbudget erfassen,
aber an einem zusätzlich netzbegrenzten LP anschließend wieder abschneiden.
1.0.20 führt für solche Ladepunkte einen eigenen bestätigten Speicheranteil:

**Zulässige Ladeleistung = erlaubter Netzanteil + zugeteilte PV + freigegebener,
gemessener Speicheranteil**, jeweils weiter begrenzt durch Betriebsart,
technische Grenzen und das gemeinsame EMS-Budget.

Der Speicheranteil ist keine PV-Leistung. Eine Entladeanforderung, ein hoher
SoC oder eine eingestellte maximale Entladeleistung allein reichen nicht als
Nachweis. Benötigt werden die passende Speicherfreigabe, eine frische wirksame
Bestätigung des Speicherreglers und frische Messwerte. Hauslast und geschützte
Verbraucher werden zuerst berücksichtigt. Der verbleibende Anteil wird nur
einmal über berechtigte Ladepunkte verteilt. Die bereits am NVP berücksichtigte
gemessene Entladung erhöht das globale Leistungsbudget nicht ein zweites Mal.

Die vorhandene Entscheidung „Speicher mitnutzen“ beziehungsweise „Speicher
schützen“ bleibt maßgeblich. Mitnutzung setzt die vom Installer erlaubte
Kundenfunktion sowie die bestehenden Speicher-/MultiUse-Freigaben voraus.
Ein geschützter Ladepunkt erhält keinen Speicher-Zusatzanteil. Ohne eingerichtete
Kundenfunktion bleibt die bestehende normale Speicher-Eigenverbrauchsregelung
maßgeblich; das ist keine automatisch aktivierte Schutzanforderung.

Bei erlaubter Kundenfunktion bedeutet ausgeschaltete Speicher-Mitnutzung in
Auto, Boost und Min+PV „Speicher schützen“; eingeschaltet fordert sie Unterstützung
an, soweit die globalen Speicher-/MultiUse-Freigaben dies tatsächlich erlauben.

| Betriebsart | Verwendung bestätigter Speicherunterstützung |
|---|---|
| Min+PV / Auto ohne vorrangigen Tarif-/Zielentscheid | Stützt höchstens das technische Lademinimum; PV darf weiter aufstocken |
| Boost / entsprechend freigegebene Normal- oder Zielanforderung | Darf innerhalb der übrigen Grenzen zusätzlich genutzt werden |
| Reines PV-Laden | Kein Batterieanteil als Ersatz für fehlende PV |
| Speicher schützen | Kein Batterie-Zusatzanteil für diesen Ladepunkt |

Die Zielplanung verspricht keine zukünftige Batterieenergie: Sie plant weiter
konservativ mit Netz- und PV-Anteilen. Zusätzliche aktuelle Speicherunterstützung
kann nur berücksichtigt werden, wenn die laufende Planung entsprechende
Ladeleistung anfordert und alle Quellenfreigaben vorliegen.

Ein eingetragener LP-Netzanteil von 0 W bleibt ein Verbot des Netzanteils.
In freigegebenen Betriebsarten kann nun zusätzlich bestätigte Speicherleistung
berücksichtigt werden; die frühere Kurzbeschreibung „0 W = nur PV“ gilt für
diesen ausdrücklich freigegebenen Speicherfall nicht mehr. Leer bedeutet
weiterhin keine zusätzliche LP-Netzgrenze. Bestehende Werte unter dem internen
Schlüssel `boostMaxPowerW` behalten die seit 1.0.19 dokumentierte Bedeutung als
Netzanteil, nicht als Gesamtleistungsgrenze.

## Messverlust, Mindestleistung und Phasen

Entfällt die Quellen- oder Speicherfreigabe, wird der zusätzliche Speicheranteil
entzogen. Die Prüfung erfolgt erneut vor dem endgültigen Stellwert. Erlaubte
Netzleistung und bestätigte PV dürfen weiterlaufen, sofern sie für das technische
Minimum reichen. Darunter wird unter Beachtung des vorhandenen Wiederanlaufschutzes
gestoppt. Eine Komfort-Mindestlaufzeit hebt harte Quellen- oder Schutzgrenzen
nicht auf.

Die Ladepunktdiagnose weist den separaten Anteil als
`zeroExportStorageCreditW` zusätzlich zu Netzgrenze und PV-Anteil aus.

Speicherunterstützung kann eine bereits verwendete Phase beziehungsweise
Phasenzahl stabilisieren. Sie löst allein keine Hochschaltung von einer auf
drei Phasen aus. Bestehende Stabilitätszeiten, Stopp vor Umschaltung, Rückmeldungen
und Einschwingzeit bleiben erhalten. DC nutzt seine eigenen Mindestleistungen
und Stellschritte.

Es gibt keinen spekulativen Kaltstart über eine Netzgrenze unterhalb der
technischen Mindestleistung: Ohne bereits gemessene zulässige Speicherstützung
darf die Wallbox nicht vorauseilend zusätzlichen Netzstrom ziehen. Die Regelung
fordert auch keine blinde Batterieentladung an, nur um einen noch nicht
gestarteten Verbraucher vorauszusetzen. Beispiel: 3.700 W Netz allein reichen
bei 230 V und 6 A nicht für das dreiphasige Minimum von 4.140 W. Ohne ausreichende
bestätigte lokale Quellen muss eine freigegebene Einphasenoption verwendet
werden oder die Ladung warten.

## Andere Apps und Bestandslogik

Die normale PV-Überschusslogik außerhalb aktiver Nulleinspeisung bleibt erhalten.
Ebenso bleiben Prioritäten, Temperatur- und Gerätefreigaben der übrigen Apps
maßgeblich. Eine eng begrenzte Heizstabkorrektur beseitigt einen unabhängigen
Fehler: Ein fehlendes optionales Leistungslimit wird nicht mehr als explizites
0-W-Limit ausgelegt. Damit kann der vorhandene Tarifbetrieb seine erlaubte
Netzleistung nutzen. Eine tatsächlich eingetragene Grenze bleibt wirksam.

## Prüfung und Quellcode

Die Regression `test:stable-1.0.20-storage` prüft die getrennte Quellenfreigabe,
Mehr-Ladepunkt-Verteilung und reale Regel-/Writer-Pfade. Die bestehende
`test:zero-export-pv`-Kette enthält zusätzlich die Heizstab-Tarifregression.
Beide gehören dauerhaft zu `test:all`; die Stable-Prüfung kontrolliert die
Registrierung und die Paketdateien. Die vorhandenen Speicher-, AC/DC-,
Phasen-, Tarif-/Ziel- und Legacy-Regressionen bleiben in der Freigabekette.

Die fachlichen Originalquellen stehen unter
`src-ts/runtime-executables/ems/` und `src-ts/ems/charging-management/`.
Deutsche Kommentare erklären Quellen, Einheiten, Freigaben und Writer-Grenzen.
Die schnelle npm-Publish-Kette verwendet geprüfte fertige Artefakte; sie baut
oder versiegelt Produktdateien beim Veröffentlichen nicht automatisch neu.

Softwareprüfungen ersetzen keine Anlageninbetriebnahme. Mess-, Kommunikations-
und Aktorverzögerungen können kurzzeitige Abweichungen verursachen. Vor dem
Livebetrieb insbesondere Speicherverlust, PV-Ausfall, AC-Phasenwechsel,
DC-Mess-/Stellwert-Bezugsseiten und die reale NVP-Grenze prüfen. Die ZIP
veröffentlicht nichts und steuert keine Live-Anlage an.
