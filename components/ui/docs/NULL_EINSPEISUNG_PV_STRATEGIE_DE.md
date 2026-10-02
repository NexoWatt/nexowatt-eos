# Gemeinsame PV-Nutzung bei Nulleinspeisung (ab 1.0.17, erweitert in 1.0.20)

Einrichtung ab 1.0.21: [Datenpunkte, Einstellungen und Prüfablauf](NULL_EINSPEISUNG_EINRICHTUNG_DE.md).

Die Erweiterung 1.0.18 ergänzt einen getrennten Taktschutz für bereits laufende
PV-Ladepunkte: gemeinsame begrenzte Netzüberbrückung (Standard 600 W / 45 s)
und Wiederanlaufsperre nach einem PV-Stopp (Standard 180 s). Dieser Netzanteil
wird ausdrücklich nicht als PV gerechnet. Historische Details:
[Release 1.0.18](STABLE_1_0_18_RELEASE_DE.md).

Ab 1.0.19 ersetzt **Maximaler Netzanteil je Ladepunkt (W, Nulleinspeisung)**
die damalige Boost-Gesamtgrenze. Die Einstellung wirkt nur bei aktiver,
freigegebener Nulleinspeisung, gilt auch für Auto und Min+PV und erlaubt
zusätzlich zugeteilte, gemessene PV. 0 erlaubt keinen Netzanteil; leer setzt keine weitere
LP-Netzgrenze. Auto verwendet ohne vorrangigen Tarif-/Ziel-/Strategieentscheid
Minimum plus PV. Voraussetzungen, Grenzen und Beispiele:
[Release 1.0.19](STABLE_1_0_19_RELEASE_DE.md).

Ab 1.0.20 wird an begrenzten Ladepunkten zusätzlich freigegebene, frisch gemessene
und vom Speicherregler bestätigte Speicherleistung separat berücksichtigt.
Sie ist keine PV. Damit kann auch bei 0 W erlaubtem Netzanteil Speicherunterstützung
in einer passenden, ausdrücklich freigegebenen Betriebsart möglich sein;
reines PV-Laden verwendet weiterhin keine Batterie als Ersatz.
Details und Grenzen: [Release 1.0.20](STABLE_1_0_20_RELEASE_DE.md).

## Zweck und Aktivierung

Im EMS-AppCenter unter **Netzlimits** wird die gemeinsame Strategie automatisch
aktiv, wenn Einspeisebegrenzung eingeschaltet, die wirksame lokale Obergrenze
0 W, die Installateurfreigabe erteilt und der Betriebsmodus aktiv ist.
Diagnose/Test aktiviert keine zusätzlichen Prüflasten. Eine Begrenzung auf eine
positive Einspeiseleistung verwendet weiter die bisherige Überschussregelung.

Die Strategie schaltet keine zusätzlichen Apps oder Geräte ein. Aus, Handbetrieb,
Kundenmodi, Nachtfenster, Temperatur-/SoC-Schutz, Leistungsgrenzen, §14a,
Stations-/Phasenlimits, Netzanschlussgrenzen und externe Sperren bleiben wirksam.
Die AppCenter-Oberfläche synchronisiert kanonische und ältere Einstellungsnamen,
damit eine sichtbare Freigabe oder 0-W-Grenze nicht durch einen alten Alias
überstimmt wird.

Nulleinspeisung verbietet keinen Netzbezug. Min+PV, Auto, Boost und die anderen
Apps dürfen ihre nach Betriebsart erlaubte Netzleistung weiter verwenden,
solange Anlagen- und Verbrauchergrenzen eingehalten werden. Die strengen
Fremdenergiebedingungen eines PV-Startversuchs sind kein allgemeines Verbot
von Netzbezug im normalen Betrieb. Ein ausdrücklich reiner PV-Modus bleibt
dagegen von tatsächlicher PV abhängig.

## Speicherfreigabe und Speicher schützen

Bei aktiver Nulleinspeisung führt der Laderegler Netz-, PV- und Speicheranteile
getrennt. Eine Speicheranforderung oder ein hoher SoC allein erhöht die zulässige
Ladeleistung nicht. Die aktuelle Speicherleistung muss frisch gemessen und
vom passenden wirksamen Speicherregler bestätigt sein. Hauslast und geschützte
Verbraucher haben Vorrang; nur der verbleibende Anteil wird einmal auf berechtigte
Ladepunkte verteilt. Bereits am NVP enthaltene Entladung wird nicht erneut dem
globalen Leistungsbudget zugeschlagen.

Ohne vom Installer erlaubte Kunden-Speicherfunktion bleibt die normale
Speicher-Eigenverbrauchsregelung maßgeblich. Bei erlaubter Kundenfunktion
bedeutet „Mitnutzen“ aus in Auto, Boost und Min+PV Speicherschutz; „Mitnutzen“ an
fordert Unterstützung innerhalb der bestehenden globalen Speicher-/MultiUse-
Freigaben an. Geschützte Ladepunkte erhalten keinen Speicher-Zusatzanteil.

Min+PV und Auto ohne vorrangigen Tarif-/Zielentscheid nutzen Speicher nur zur
Stützung des technischen Minimums; PV darf zusätzlich laden. Boost und passende
Normal-/Zielanforderungen dürfen mehr bestätigte Unterstützung verwenden.
Die Zukunftsplanung rechnet weiterhin konservativ mit Netz und PV und verspricht
keine zukünftige Batterieenergie. Fehlende oder veraltete Nachweise entziehen
den Speicheranteil bis zur letzten Prüfung vor dem Hardware-Schreiben.

Bestätigte Batterieunterstützung kann die aktuelle Phasenzahl halten, aber
allein keine 1p→3p-Hochschaltung auslösen. Ohne bereits gemessene Unterstützung
gibt es keinen spekulativen Start über eine unter dem technischen Minimum
liegende Netzgrenze. Die vorhandenen Phasenwechsel- und Wiederanlaufsperren
bleiben erhalten.

## Warum ein gemeinsamer Startversuch erforderlich sein kann

Ein Wechselrichter kann PV bereits auf den Hausverbrauch abregeln. Der NVP zeigt
dann 0 W Einspeisung, obwohl weitere Sonnenleistung verfügbar wäre. Gemessener
Überschuss allein startet in dieser Situation keinen neuen Verbraucher.
Nennleistung, Forecast und Differenz zwischen Nennleistung und Abregelung sind
kein Beweis für momentan lieferbare PV-Leistung.

Der neue Koordinator vergibt daher höchstens **eine befristete Prüffreigabe**
für einen konkreten Verbraucher. Er prüft echte PV-, NVP-, Batterie- und
Verbraucherleistung. Ein weiterer Verbraucher kann nicht gleichzeitig dieselbe
Prüffreigabe nutzen. Die Sollleistung wird weiterhin vom vorhandenen jeweiligen
Geräteregler geschrieben; es entsteht kein zweiter Hardware-Writer.

## Verbraucher und Mindestleistungen

- **AC-Ladepunkte:** Anlauf mit der tatsächlich konfigurierten, darstellbaren
  Mindeststromstärke der aktiven Phasenzahl; keine angenommene Phase oder
  unterschrittene Mindeststromstärke. Leistungs-/Stromschritte und Maxima gelten.
- **DC-Ladepunkte:** Die konfigurierte technische Mindestleistung sowie
  Leistungs-/Strombasis und Maximalwerte bleiben maßgeblich. Keine AC-6-A-Regel
  und keine Phasenumschaltung für DC.
- **Phasenfähige AC-Wallboxen:** Der bestehende Automat stoppt zuerst, prüft
  Stillstand, schaltet und wartet die Einschwingzeit ab. Ein zusätzlicher
  1p→3p-Test erfordert konfigurierte Automatik, geeignete Zuordnung, frische
  Phasenrückmeldung, stabil erreichte einphasige Maximalleistung sowie
  abgelaufene Sperrzeiten. Prüfwatt werden nicht als stabile PV-Leistung
  ausgegeben. Keine Umschaltung unter Last.
- **Heizstäbe:** Die zentrale Strategie ersetzt bei aktiver Nulleinspeisung die
  unabhängigen älteren Forecast-Proben. Nur vollständige physisch mögliche
  Stufen werden freigegeben. Doppelte Relaiszuordnung erzeugt keine zusätzliche
  Stufe. Stufensummen dürfen Geräte-/Gesamtgrenzen nicht überschreiten.
- **Speicher:** Nur eindeutig regelbare Ladeleistungs-Sollwerte mit tatsächlicher
  Batterie- und SoC-Rückmeldung nehmen an Prüflasten teil. Ladegrenzen,
  SoC-/Policy-/Lizenzschutz, Herstellerhoheit und Farmzuordnung bleiben erhalten.
  Reine Freigaben oder maximale Ladegrenzen ohne präzisen Lastabruf erhalten
  keinen Versuch. Eine bestehende Hersteller-No-Write-Situation bleibt gesperrt.
- **Weitere Thermikverbraucher:** Nutzen weiterhin das gemeinsame bestätigte
  PV-Budget und ihre eigenen Schutz-/Mindestlaufzeiten. Unbestimmte Lasten wie
  SG-Ready werden nicht als präzise Prüflast behandelt.

## Getrennte Budgets und Bestätigung

Die zentrale physikalische Bilanz verwendet die signierte NVP-Leistung
(positiv Bezug, negativ Einspeisung), gemessene flexible Aufnahme, Batterieladung
und abgezogene Batterieentladung. Bei Nulleinspeisung erzeugen Heizstab-/Thermik-
Sollwerte kein PV-Budget. Bei Heizstab/Thermik werden nur aktuell durch die
PV-Automatik geführte Lasten zurückgerechnet; Handbetrieb, Boost und externe
Übernahme bleiben dort Hauslast. Ab 1.0.19 wird bei geregelten EV-Ladepunkten
die vollständige frische Aufnahme einschließlich ihres Netzanteils verwendet:
Der signierte NVP zieht den Netzbezug bereits einmal ab. Ein zusätzlicher
Abzug am EV würde das PV-Budget zyklisch verkleinern. Direkte frische
Leistungspunkte werden herangezogen, doppelte Zählerzuordnungen zählen nur einmal.

Unbestätigte Prüflast wird konservativ exklusiv zurückgehalten, auch bevor ihre
erste Istmeldung eintrifft. Sie zählt zum elektrischen Gesamtbudget, aber nicht
als PV-Reservierung. Der Koordinator bestätigt sie erst nach tatsächlicher
Lastaufnahme und plausibler PV-Nachlieferung ohne anhaltende Fremdversorgung.
Im nächsten Core-Zyklus endet die Prüffreigabe gleichzeitig mit der Freigabe der
bestätigten Istleistung für das gemeinsame Budget. Eine alte Lease darf nicht
neben einer neuen PV-Zuteilung weiterlaufen.

Die sonst konfigurierte PV-Exportreserve (z. B. 500 W) wird nur im aktiven
Nulleinspeisebetrieb nicht vom laufenden rekonstruierten Budget abgezogen: Eine
solche Reserve würde Lasten bei jeder Nullbilanz wieder reduzieren. Die
signierte Messbilanz und der separate Export-Guard schützen weiterhin.

Der bereits konfigurierte kleine Importbias der Einspeiseregelung (Standard
80 W) ist **Netzleistung, keine PV**. Ein vorher bestätigter laufender Verbraucher
kann einen fehlenden kleinen Anteil innerhalb dieses Bias behalten, damit eine
technische Mindeststufe nicht ständig ausfällt. Die Summe aller solchen
Betriebsanteile bleibt auf den konfigurierten Bias begrenzt; dieser Pfad erhöht
keine Last. Er wird separat als `operatingMarginW` ausgewiesen und endet bei
fehlendem Nachweis, Stopp, Entladung oder unzulässigem Bezug. Für den neuen
Koordinator wird der zulässige Bias zusätzlich auf höchstens 250 W begrenzt.

## Prüflastgrenzen und Fehlerrücknahme

Die neue Einstellung **maximale zusätzliche Prüflast** beträgt standardmäßig
4.200 W, einstellbar durch Installer/Admin von 0 bis 50.000 W. 0 sperrt neue
Versuche; normale gemessene Überschussregelung bleibt bestehen. Eine höhere
DC-Mindestleistung als diese Grenze startet nicht spekulativ. Die Grenze ist
keine zugesicherte verfügbare Leistung und hebt kein anderes Limit auf.

Weitere Grenzen:

- Direkte Messnachweise höchstens 5 s alt; fehlend, leer, ungültig oder veraltet
  ist nicht dasselbe wie ein frischer 0-W-Messwert.
- Vorhandene Speicher erfordern gerichtete echte Messwerte. Ein einzelner
  Lade-Splitkanal oder eine aus der Hausbilanz errechnete Batterieleistung
  schließt Entladung nicht sicher aus. Bei Farmen wird auch Bruttoentladung
  berücksichtigt.
- Normaler Versuch maximal 30 s, davon maximal 20 s ohne Verbraucherreaktion.
  Nach tatsächlichem Lastbeginn gilt eine kurze 3-s-Einschwingphase.
- Phasenversuch höchstens 90 s für Stoppen/Umschalten und insgesamt 120 s;
  bestehende Gerätewartezeiten werden nicht verkürzt.
- Abbruchschwelle für Fremdenergie während des Versuchs: 20 Wh nach Messbilanz.
  Abtastung und Aktorreaktion können den tatsächlichen Wert darüber hinaus erhöhen. Netz-/Batterie-
  Versorgung wird nach der Einschwingphase zurückgenommen; harte vorhandene
  Schutzgrenzen wirken früher.
- Fehlversuch: gemeinsamer Wiederholschutz 5 min. Erfolgreiche Übergabe:
  mindestens 5 s bis zur nächsten Erprobung. Wiederholte Aufrufe verlängern
  die Lease nicht. Zeitrücksprung entzieht Freigaben.
- Jeder Verbraucher prüft die aktuelle Lease und seine normalen Grenzen erneut
  unmittelbar vor dem Hardware-Schreiben, auch nach asynchronen Operationen.

Ein kurzer Netzbezug oder eine kurze Batterieentladung beim Erproben ist
physikalisch möglich. Die genannten Softwaregrenzen sind keine Garantie für
transientenfreie Nulleinspeisung und ersetzen keinen Anlagenschutz. Wenn selbst
kurze Anlaufversuche nicht zulässig sind, ist die Prüflastgrenze 0 zu verwenden.
Dann werden nur bereits nachgewiesene PV-Budgets genutzt.

Dies betrifft die zusätzlichen PV-Startversuche. Unabhängig davon bleiben
der nach Betriebsart erlaubte Netzbezug und die getrennt bestätigte
Speicherunterstützung verfügbar.

## Quellcode und Diagnose

- `src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts`:
  gemeinsame Messvoraussetzungen, Arbitration, Lease, Bestätigung, Biasanteil.
- `src-ts/runtime-executables/ems/services/zero-export-storage-credit.ts`:
  getrennte Speicherquellenprüfung und verbleibende Unterstützung nach Hauslast
  und geschützten Verbrauchern, ohne Batterie als PV zu zählen.
- `src-ts/runtime-executables/ems/modules/core-limits.ts` und
  `src-ts/ems/core-limits/core-runtime.ts`: physikalische Bilanz, Ausschluss
  unbestätigter Leistung, einheitliche Snapshot-/TS-Rechnung.
- `charging-management.ts` sowie typisierte Lade-/Phasenauswahl: punktbezogene
  Freigabe, technische Mindestwerte, Stop/Schaltfolge, finale Prüfung.
- `heating-rod-control.ts`, `storage-control.ts`: Gerätefreigaben, echte
  Rückmeldung, getrennte Reservierung und bestehende Hardware-Schreibpfade.
- `src-ts/runtime-executables/www/ems-apps.ts`: AppCenter-Konfiguration und
  Diagnose; kanonische und ältere Export-Einstellungsnamen synchron.

States unter `ems.zeroExportPv`: `active`, `status`, `reason`, `owner`, `probeW`,
`energyWh`, `validUntil`, `operatingMarginW`, `snapshotJson`.
Diese Diagnose beschreibt die Softwarefreigabe, keine Empfangsbestätigung des
Aktors. Originalquellen enthalten die fachlichen Kommentare; JavaScript wird
über den bestehenden Runtime-Build erzeugt, typisierte Spiegel bleiben erhalten.
Die LP-Diagnose weist den separat zugeteilten Speicheranteil als
`zeroExportStorageCreditW` neben `zeroExportGridMaxW` und `zeroExportPvCreditW` aus.

## Inbetriebnahme und Testgrenze

Die automatische Prüfung umfasst Szenarien und simulierte echte Modul-Ticks,
unter anderem AC/DC-Mindestwerte, exklusive Freigaben, Phasenfolge, Stufen,
physikalische Budgetübernahme, Bias, Frische, Sperren und Widerruf.
Sie ersetzt keinen Feldtest mit der jeweiligen Wechselrichter-, Zähler-,
Wallbox- und Heizstabkombination.

Vor produktiver Freigabe projektspezifisch im Diagnosebetrieb Vorzeichen,
Original-Messalter, Schreibzuordnungen, Maxima, SoC-/Temperaturgrenzen und
Phasenrückmeldung prüfen. Anschließend mit begrenzter Prüflast testen:
PV-Nachlieferung, Wolken/Lastsprung, Kommunikationsausfall, deaktiviertes Modul,
Verbraucherabbruch, Batterieentladung und Phasenwechsel. Messkurven am NVP und
reale Aktorrückmeldungen auswerten. Keine Aussage über zertifizierte Schutz- oder
Inselnetzfunktionen wird aus diesen Softwaretests abgeleitet.
