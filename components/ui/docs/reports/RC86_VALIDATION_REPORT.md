# RC86 Validierungsbericht – Version 0.8.211

## Gegenstand

RC86 korrigiert Gate A des Lademanagements und führt die Stabilitätshärtungen aus RC85 in einen installierbaren Feldteststand zusammen. Die zugeordnete Netzanschlussleistung bleibt die absolute, reine NVP-Bezugsgrenze. Die automatisch berechnete 90-%-Schwelle ist ausschließlich der Beginn einer progressiven Soft-Zone und keine starre EVCS-Leistungsobergrenze.

## Verbindliche Sicherheitsinvarianten

- Netzbezug am NVP ist positiv, Netzeinspeisung negativ.
- Die Hard-Grenze begrenzt ausschließlich den tatsächlichen Netzbezug am NVP.
- PV-Erzeugung und bestätigte Speicherentladung erhöhen die lokal mögliche Gesamtleistung, werden jedoch nicht zusätzlich zum bereits signierten NVP doppelt addiert.
- §14a, Not-Aus, Hard-NVP, Phasen-, Leitungs-, Geräte- und finaler Writer-Schutz bleiben sofort wirksam.
- Ein veralteter kanonischer NVP wird nicht durch einen widersprüchlichen lokalen Ersatzwert überstimmt.
- Ein einzelner offline Ladepunkt bleibt eine lokale Teilstörung. Ohne Fahrzeug und bei bestätigten 0 W beträgt seine Sicherheitsreserve 0 W; bei Ausfall während einer Ladung wird die letzte plausible Leistung beziehungsweise eine technische Mindestreserve berücksichtigt.
- Ein nicht gesetztes optionales Phasen- oder §14a-Cap ist kein 0-W-Limit.

## Gate-A-Vertrag

Bei 40 kW Hard-Limit, NVP −1,25 kW, 0 W EVCS-Anforderung und 0 W Offline-Reserve gilt:

```text
Hard-Headroom:       41,25 kW
EVCS-Anforderung:     0,00 kW
Zulässige Leistung:   0,00 kW
Aktive Reduktion:     0,00 kW
Gate-A-Binding:       NEIN
Netzschutz:           überwacht – kein Eingriff
Safety-Stufe:         NORMAL
```

Eine aktive `GRID-IMPORT-LIMIT`-Meldung wird nur gesetzt, wenn eine reale EVCS-Anforderung tatsächlich durch Gate A reduziert wird und kein strengeres Phasen- oder §14a-Gate die Reduktion bereits verursacht.

## Auto- und Betriebsmodi

- Preis-, Tarif-, PV-, Speicher- und Budgetänderungen im Auto-Modus werden entprellt und gerampt; ein Preis-Refresh erzeugt keinen einzelnen 0-W-Zwischenbefehl.
- Eine bestätigte Auto-Anforderung startet am technischen Mindestbereich und erreicht das Ziel kontrolliert über die Folgeticks.
- Explizites Boost, PV, Min+PV und manuelle Vorgaben werden nicht durch die Auto-Entprellung gekappt.
- Eine technische Startprobe wird nach ihrem eigenen Retry-Cooldown wieder freigegeben und erhält keine zweite versteckte Mindestpause.
- Nur echte Safety-Gründe dürfen sofort hart reduzieren oder stoppen.

## Watchdog, Teilstörung und Speicher

- EMS-Module und Ladepunkt-Schreibzugriffe sind zeitlich begrenzt und pro Operation dedupliziert.
- Ein hängender Ladepunktzugriff darf den gesamten EMS-Regeltick nicht dauerhaft blockieren.
- Langfristig gehaltene Diagnose-, Timeout-, Fehler- und Entscheidungsstrukturen sind begrenzt; die Heap-Überwachung ist eine letzte Notbremse vor einem erneuten V8-SIGABRT.
- Speicher-Netzladen bleibt ausschließlich bei aktivem, frischem und günstigem dynamischen Tarif sowie den zusätzlich konfigurierten Freigaben möglich. Bei neutral, teuer, unbekannt oder veraltet übernimmt die Eigenverbrauchsoptimierung.
- Die Objektinitialisierung für `gridConstraints.exportLimit.sinkFieldProtocolJson` bleibt enthalten.

## Durchgeführte Prüfungen

- TypeScript-Gesamtprüfung: bestanden.
- TypeScript-Quellsyntax: 735 Dateien geprüft.
- Produktive Runtime-Executables: 119 Dateien synchron.
- Runtime-Parallelspiegel: 481 Dateien synchron und typgeprüft.
- Core-Limits-, Heating-Rod-, Main-, AppCenter-, LIVE-, History- und SmartHome-Runtime-Typisierungsprüfungen: bestanden.
- RC57 bis RC83 sowie RC85 und RC86: relevante OCPP-, Auto-, Tarif-, Speicher-, §14a-, Forecast-, NVP-, 0-Einspeise-, Safety- und UI-Regressionen bestanden.
- RC59: explizites Boost erreicht den Single Writer unverändert; optionale `null`-Caps erzeugen kein 0-W-Limit.
- RC60/RC61: Auto-Softstart, technische Startprobe, Retry-Cooldown, OCPP/Alfen/generische Wallboxen und lokale Fehlerisolation bestanden.
- RC78/RC86: signed-NVP-Hard-Headroom, progressive Soft-Zone, demand-basiertes Binding und Offline-Reserve bestanden.
- Release-Artefaktprüfung: 304 Paketdateien bestanden.
- Paket-Runtime-Smoke: 175 JS-/MJS-Dateien syntaktisch geprüft; relative `require()`-Pfade und Startkette bestanden.
- `npm pack --dry-run --ignore-scripts`: 305 Tarball-Einträge bestanden.
- `npm publish --dry-run --ignore-scripts`: bestanden.

Der monolithische `test:types`-Runner überschritt nach mehr als einer Stunde das Ausführungslimit, nachdem der überwiegende Teil bereits erfolgreich durchlaufen war. Sämtliche noch ausstehenden Teilkommandos wurden anschließend einzeln ausgeführt und bestanden. Es wurde kein fehlgeschlagener Teiltest ausgeblendet.

## Feldabnahme

RC86 ist ein Feldtestkandidat vor Stable. Für die reale Kundenabnahme sind mindestens zu beobachten:

1. gleicher kanonischer NVP in Gate A, Zentralbudget und Energiefluss;
2. bei 0 W Anforderung kein aktives Gate-A-Binding;
3. leeren Ladepunkt offline nehmen, ohne die übrigen Ladepunkte zu sperren;
4. Preiswechsel ohne kurzen 0-W-Impuls;
5. Hard-NVP-Eingriff spätestens an der konfigurierten Bezugsgrenze;
6. aktueller EMS-Regeltick und kein stetig wachsender Adapter-Heap.
