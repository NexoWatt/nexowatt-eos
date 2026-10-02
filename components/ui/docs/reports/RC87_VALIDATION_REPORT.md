# RC87 Validierungsbericht – NVP-Monitoring ohne falsche Begrenzungsanzeige

**Adapter:** iobroker.nexowatt-ui 0.8.212  
**Release Candidate:** RC87  
**Datum:** 2026-08-26

## Ziel und Änderungsgrenze

RC87 ändert ausschließlich Diagnose-, Ereignis- und Anzeigesemantik. Die produktive Regelung, das NVP-Budget, Gate A, Soft-/Hard-Limit, Safety-Envelope, Ladeverteilung und alle Hardware-Sollwerte bleiben gegenüber RC86 unverändert.

Die Byte-Prüfung gegen RC86 bestätigt, dass `main.js`, EMS-Engine, Modulmanager, sämtliche Dateien unter `ems/modules/`, der finale Safety-Envelope und die RC85-Runtime-Härtung unverändert sind. Der Nachweis liegt in `RC87_CONTROL_INVARIANCE_REPORT.txt`.

## Korrigiertes Verhalten

- Die dauerhafte Überwachung des Netzbezugs am NVP ist ein grüner Normalzustand, solange Soft-/Hard-Limit nicht eingreifen und keine reale Leistungsanforderung reduziert wird.
- `grid-monitor`, `no-charge-demand`, `no-vehicle` und `pv-surplus` werden nicht mehr als globale aktive Begrenzung dargestellt.
- Bei verbundenem Fahrzeug ohne Ladebedarf lautet die Übersicht sinngemäß: **„Kein aktiver Ladebedarf – Netzschutz überwacht“**.
- Unterhalb der Soft-Schwelle lautet der Status sinngemäß: **„NVP-Bezug überwacht – keine aktive Begrenzung“**.
- Das Import-Softlimit wird gelb, das Import-Hardlimit rot dargestellt, sobald der entsprechende Zustand tatsächlich vorliegt.
- Negative NVP-Leistung beziehungsweise Einspeisung löst keine Importbegrenzung aus.
- Eine Exportbegrenzung wird nur dann als bindend angezeigt, wenn das Export-Limit aktiviert, überschritten und im Aktivbetrieb ist. Im Diagnosemodus erscheint ausdrücklich nur **„Export-Limit überschritten – Diagnosemodus“**.
- Bereits gespeicherte falsche Ereignisse wie „Kein Fahrzeug-Ladebedarf begrenzt aktuell die Regelung“ werden beim Einlesen neutralisiert.
- Kleine Änderungen von Speicher-Istwert oder Restbudget erzeugen keine wiederholten, semantisch identischen Übersichtsmeldungen mehr.

## Unveränderte Regelungsfunktionen

- signierter NVP und Import-only-Hard-Limit;
- progressive Soft-Zone bei 90 %;
- Gate-A-Budget und Ladeverteilung;
- Offline-Isolation einzelner Ladepunkte;
- §14a, Phasen-, Geräte- und Stationsschutz;
- finaler Safety-Writer;
- Speicher-, Tarif-, PV- und 0-Einspeiselogik;
- EMS-Watchdog und Speicherhärtung aus RC85/RC86.

## Durchgeführte Prüfungen

Bestanden:

- Release-Artefaktprüfung: **305 Paketdateien**;
- npm-Tarball: **306 Dateien**;
- TypeScript-Syntax: **735 Quelldateien**;
- produktive Runtime-Executables: **119 synchron**;
- Runtime-Spiegel: **481 synchron**;
- TypeScript-Hauptprüfung und Runtime-Mirror-Typecheck;
- Frontend-, Backend-, Adapter- und Main-Helfer-Spiegel;
- RC73 Admin-Übersichtsvertrag;
- RC77 Prognose-Statecache;
- RC78 signed-NVP-/Import-only-Budget;
- RC79 Soft-/Hard-Limit und 0-Einspeisung;
- RC80 feste 10-%-Reserve;
- RC81 zentrale NVP-Zuordnung;
- RC82 permanenter Netzschutz;
- RC83 günstiger Tarif / Logobjekt;
- RC85 Stabilitätsvertrag;
- RC86 Gate-A-/Demand-Binding;
- RC87 Monitoring-/Soft-/Hard-/Export-Anzeigetest;
- npm pack, npm pack --dry-run und npm publish --dry-run --ignore-scripts;
- frisch entpackter npm-Tarball: RC87-Test und Syntaxprüfung aller ausgelieferten JS-/CJS-/MJS-Dateien.

Die monolithische `test:all`-Kette lief 20 Minuten ohne Testfehler und erreichte während der umfangreichen TypeScript-/Mirror-Strecke das Ausführungslimit. Alle für RC87 relevanten Fach-, Typ-, Runtime-, Release- und Paketprüfungen wurden anschließend separat vollständig ausgeführt und bestanden.
