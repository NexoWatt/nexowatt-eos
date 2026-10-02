# NexoWatt EOS 1.0.19

Dies ist die offizielle Stable-Version 1.0.19 vom 24.09.2026.

## Netzanteil statt Gesamtleistungsgrenze

Unter **AppCenter → Lademanagement → Ladepunkt → Erweitert** steht
**Maximaler Netzanteil je Ladepunkt (W, Nulleinspeisung)**. Die Eingabe bleibt
Installer/Admin vorbehalten. Es ist eine zusätzliche Grenze für den Netzanteil
dieses Verbrauchers, nicht für die gesamte Liegenschaft und nicht für dessen
Gesamtladeleistung. Sie wirkt nur bei aktivierter, freigegebener Nulleinspeisung
mit 0-W-Exportziel; nicht im Diagnosemodus oder bei ausgeschalteter Strategie.

Beispiel: 3.700 W LP-Netzanteil plus 5.000 W diesem LP zugeteilte PV erlauben
bis zu 8.700 W Laden, soweit elektrische und übergeordnete Grenzen dies zulassen.
Hauslast, andere Verbraucher und die Gesamt-Bezugsgrenze werden weiterhin am
NVP berücksichtigt. Ein zweiter LP erhält nicht nochmals dieselben 5.000 W PV.
PV wird als gemeinsames EMS-Budget zugeordnet, nicht als frei konfigurierbarer
Multiplikator und nicht als Schätzung aus der Anlagen-Nennleistung.

| Eingabe | Wirkung bei aktiver Nulleinspeisung |
|---|---|
| Leer | Keine zusätzliche LP-Netzgrenze; übrige Grenzen bleiben wirksam |
| 0 W | Kein Netzanteil, nur bestätigte PV; keine netzgestützte Such-/Halteleistung |
| 3.700 W | Höchstens 3.700 W Netzanteil plus zugeteilte PV |
| Ungültiger gespeicherter Wert | Sicherheitsrückfall auf 0 W Netzanteil |

**Bedeutungsänderung gegenüber 1.0.18:** Der gespeicherte Schlüssel
`boostMaxPowerW` bleibt aus Kompatibilitätsgründen erhalten, ist aber keine
Boost-Gesamtgrenze mehr. Bestehende Werte werden als Netzanteil übernommen.
Außerhalb aktiver Nulleinspeisung greift diese neue Zusatzgrenze nicht.
Vor Inbetriebnahme vorhandene LP-Einstellungen prüfen.

## Auto, Tarif und Zeit-Ziel

- Auto ohne vorrangiges Ziel, günstiges Tarifzeitfenster oder aktive
  Betriebsstrategie verwendet bei Nulleinspeisung **Minimum plus PV**.
- Bei günstigem Tarif darf Auto mehr Netzleistung anfordern, höchstens den
  eingetragenen LP-Netzanteil. PV bleibt zusätzlich möglich.
- Ausdrückliche PV-only-Betriebsstrategien bleiben erhalten. Ein teures
  Tarifzeitfenster erlaubt nicht automatisch das gesamte LP-Netzbudget.
  Die vorhandene Negativpreisregel für die normalen PV-/Min+PV-Modi bleibt
  erhalten, aber auch ihre Netzanforderung wird durch die neue LP-Grenze begrenzt.
- Zielzeit-/SoC-Planung berücksichtigt getrennte Netz- und PV-Energie. Ein
  dringendes Ziel kann den wirtschaftlichen Tarif-Warteentscheid aufheben,
  niemals die LP-Netzgrenze oder Netzschutzgrenzen. Ein unter diesen Grenzen
  nicht erreichbares Ziel wird als gefährdet/nicht erreichbar ausgewiesen.
- Min+PV bezieht als Netzbasis höchstens das technische Minimum und höchstens
  die konfigurierte Netzgrenze; PV kommt zusätzlich hinzu. Boost darf die
  vollständige erlaubte Netzbasis nutzen, bleibt aber ebenfalls begrenzt.

## Messung, Phasen und Taktschutz

PV-Aufstockung bei einem netzbegrenzten LP braucht frische NVP-, PV- und
Speicherdaten aus dem zentralen Core-Snapshot (höchstens fünf Sekunden).
Batterieentladung ist kein PV-Nachweis. Fehlt der Nachweis, bleibt höchstens
die erlaubte Netzbasis; unterhalb der technischen Mindestleistung wird gestoppt.
Die finale Schreibprüfung wiederholt die Quellenfreigabe nach asynchronen
Operationen. Alte Budgets dürfen nicht als zusätzliche Netzleistung weiterlaufen.

Der Core rekonstruiert bei Nulleinspeisung die vollständige frisch gemessene
Aufnahme geregelter EV-Ladepunkte. Der signierte NVP zieht den Netzbezug genau
einmal ab. Letzte Sollwerte sind kein Ersatz für Leistungsmessungen; doppelte
Messpunkt-Zuordnungen werden nicht doppelt gezählt. Ein abgeregelter, tatsächlich
noch ladender LP reserviert seinen Anteil bis zur messbaren Rücknahme.

Bei 230 V benötigen typische 6 A einphasig 1.380 W, dreiphasig 4.140 W.
3.700 W Netz ohne PV reichen daher nicht für dieses dreiphasige Minimum.
Mit ausreichend PV ist dreiphasiges Laden möglich. Nur eine eingerichtete und
freigegebene Phasenautomatik darf wechseln: bestehende Stabilitätszeiten,
Stopp vor Umschaltung, Rückmeldungen und Einschwingzeit bleiben erhalten.
Feste Phasen werden nicht überschrieben. DC nutzt seine eigenen Minima,
Maxima und Stellschritte, nicht die AC-Phasenautomatik.

Bestehender PV-Taktschutz, begrenzte Haltefreigaben und Wiederanlaufsperren
bleiben wirksam. Auch Halten und Suchlast dürfen die LP-Netzgrenze nicht
überschreiten. PV-abhängige Min+PV-/Boost-LP mit Netzgrenze unter dem Minimum
erhalten nach einem PV-Stopp ebenfalls die Wiederanlaufsperre. Harte Schutz-
grenzen und verlorene Messwerte haben Vorrang vor Komfort-Mindestlaufzeiten.

Diagnose je LP: `zeroExportGridLimitActive`, `zeroExportGridMaxW` und
`zeroExportPvCreditW`. Der historische State `boostMaxPowerW` bleibt vorhanden.

## Quellen und Prüfung

Kanonische Quellen: `src-ts/runtime-executables/ems/modules/charging-management.ts`,
`core-limits.ts`, die Dienste `zero-export-pv-coordinator.ts`,
`forecast-target-runtime-bridge.ts`, `forecast-aware-target-planner.ts`,
`src-ts/ems/charging-management/charging-allocation.ts`,
`charging-phase-selection.ts` sowie AppCenter und Konfigurationsbrücken.
Deutsche Erläuterungen und generierte Verknüpfungsverzeichnisse bleiben enthalten.

`test:stable-1.0.19-grid-share` prüft Netz/PV-Aufteilung, 120 Mehr-LP-Fälle,
Istleistungsreservierung, Zielplanung, echte Regelticks und finale Writer für
AC/DC, Tarif-/Zielentscheidungen, PV-Ausfall und Betrieb ohne Nulleinspeisung.
`test:zero-export-pv` enthält zusätzlich 120 Core-Rückkopplungszyklen,
Batterieabzug, Messalter sowie die bestehenden Verbraucher- und Taktschutztests.
Die unveränderte schnelle npm-Prüfkette verwendet fertige Artefakte; ein Publish
baut und versiegelt die getesteten Produktdateien nicht automatisch neu.

## Anlagenbezogene Freigabe bleibt erforderlich

Dies ist eine Softwarebegrenzung, kein zertifizierter Schutz gegen kurzzeitige
Netztransienten. Mess-/Kommunikations-/Aktorverzögerungen und reale Spannungen
können Abweichungen verursachen. Gerade bei DC müssen Mess- und Stellwerte auf
passende Bezugsseiten geprüft werden; AC-Eingang und DC-Ausgang sind wegen
Wandlungsverlusten nicht identisch. Tarif-/Ziel-/Phasenwechsel, PV-Wegfall und
Kommunikationsausfall mit der konkreten Anlage prüfen. Eine technische oder
vertragliche Bezugsgrenze darf nicht allein aus einem Softwaretest als erfüllt
erklärt werden. Die ZIP veröffentlicht nichts und ändert keine Live-Anlage.
