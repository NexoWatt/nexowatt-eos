# NexoWatt EOS 1.0.4 – offizielle Stable-Version

**Datum:** 2026-09-11  
**Basis:** vollständiges Repository 1.0.3

## Verhalten

Die Kundenpriorität verteilt den physisch vorhandenen PV-Anteil zwischen Ladepunkten
und Speicher. Sie erzeugt weder zusätzliche PV-Leistung noch eine Netzladefreigabe.
Im PV-geführten Auto-Untermodus bleiben Start-/Stop-Hysterese, technische
Mindestleistung, gewählte Phasenart und alle Netz-/Stationsgrenzen verbindlich.
Unterhalb der fahrbaren Startleistung wird kein teilweiser Startanteil reserviert.
Der Speicher darf den kompletten ungenutzten Überschuss im Rahmen seiner Grenzen laden.

Ist im Automatikmodus Netzladen ausdrücklich freigegeben, bleibt der reguläre
Ladesollwert erhalten. Nur der nach anderen PV-/Min+PV-Ladepunkten noch verfügbare
PV-Anteil wird für den tatsächlich freigegebenen Auto-Ladebedarf reserviert.
Ein wartendes Fahrzeug ohne freigegebenen Sollwert blockiert keinen Auto-PV-Anteil.
Die Summe aller Reservierungen bleibt innerhalb des physischen PV-Budgets;
reines PV-Laden und Auto teilen dieselbe kundenseitige Obergrenze. Min+PV behält
seine netzgestützte technische Basis und den physischen PV-Zusatzanteil.

## Phasen und Übergabe

Die Runtime hat bisher individuelle Umschaltschwellen, Wartezeiten, Herstellerwerte
und laufende Phasen-Timer beim Aufruf der finalen TS-Phasenentscheidung verloren.
Diese Daten werden jetzt durchgängig weitergereicht. Fest 1p / fest 3p bleibt fest;
Auto 1p/3p benötigt einen passenden Schreibpfad. Während Stop/Umschaltung/Settle
bleiben Startreservierungen gesperrt. Bereits real fließende Leistung wird nicht
vorzeitig als frei angenommen. Nach Settle darf auf den aktuellen Phasen geladen
werden; der Cooldown verhindert nur einen weiteren Phasenwechsel.

Beim Hochschalten muss mindestens das konfigurierte 3p-Stromminimum verfügbar sein.
Die Strom-/Leistungsquantisierung und die gewählte aktuelle Phasenzahl werden im
bestehenden finalen Allocation- und Write-Plan geprüft. Ein Maximalwert unterhalb
der technischen Mindestleistung darf kein künstlich verkleinertes Startminimum ergeben.

Die PV-Rekonstruktion berücksichtigt auch laufende Speicherladung. Deshalb wird
PV-Potential nicht unsichtbar, nur weil der Speicher es vor einem EV-Start aufnimmt.
Frische Auto-Istleistung wird einbezogen, Netzbezug und Speicherentladung werden
weiterhin abgezogen. Sollwerte werden nicht als erzeugte PV-Leistung addiert.

## Diagnose

- chargingManagement.control.pvPriorityIncludesAuto
- chargingManagement.control.pvAutoPriorityReservedW
- chargingManagement.control.pvEvcsAutoPriorityMeasuredW
- chargingManagement.control.pvAutoPriorityJson
- vorhandene phaseSelectionJson / Phasenstatus / pvStartReservationW je Ladepunkt

Der alte DP pvPriorityPurePvOnly bleibt aus Kompatibilitätsgründen erhalten und ist false.
Keine zusätzliche unbeschränkte Historie, kein neuer schneller Poller, keine neuen
Produktionsabhängigkeiten. Die vorhandene begrenzte Diagnose-Publikation wird verwendet.

## Prüfumfang und Grenzen

Die Regression umfasst vollständige Regelticks mit echtem TS-Abschlussplan und
Executor gegen simulierte Datenpunkte, zusätzlich reine Budget-/Phasen-Pipeline-Tests.
Sie prüft Auto mit und ohne Netzfreigabe, feste 1p/3p, höhere Mindestströme, DC-
Mindestleistung, geteiltes PV-Budget, Leerlauf/Offline, Phasenwechsel und Settle.
Es wurde keine reale Wallbox oder reale Anlage angesteuert.

Auf der Kundenanlage müssen vor uneingeschränktem Betrieb Herstellerfreigabe für
Phasenwechsel, tatsächliche Phasenrückmeldung bzw. unterstützter Gerätevertrag,
Startgrenzen, Umschaltpause und Speicherübergabe kontrolliert überprüft werden.
Die Releasebezeichnung ist keine Zertifizierung und keine Aussage über einen
nicht durchgeführten Hardware-Dauertest.


## Ausgeführte Softwareprüfungen (11.09.2026)

- Node.js 22.16.0; TypeScript 5.8.3 (lokal vorhandenes Build-Werkzeug).
- Vollständiger `npm run build:ts`: erfolgreich, einschließlich 120 produktiver
  Runtime-Dateien, 483 Runtime-Spiegel und TypeScript-Deklarationsbuild.
- Vollständiger `npm run test:all`: erfolgreich, einschließlich Browser-Regression
  für den Home-AppCenter und der bestehenden Status-/Speicher-/Sicherheitsprüfungen.
- Neue Auto-/Phasen-Regression: 37 Szenariogruppen, einschließlich echter
  Regeltick-/Executor-Codepfade mit simulierten Datenpunkten.
- Zusätzliche PV-Prioritäts-, zentrale Budget-, Speicherrest-, Min+PV- und
  TS-Phasen-Regressionsprüfungen: erfolgreich.
- `publish:check`, `verify-publish.js`, Runtime-Start-Smoke und Stable-Release-Gate:
  erfolgreich. Runtime-Start-Smoke prüft Syntax, lokale Imports und eine mit
  Test-Doubles konstruierbare Startkette, keinen gestarteten Kunden-ioBroker.
- Paketdateien: 323 versiegelte Einträge; npm-Pakettrockenlauf: 324 Einträge.

Eine neue Online-Installation über `npm ci` konnte wegen DNS-/Registry-Zugriffsfehlern
(`EAI_AGAIN`) in der Prüfumgebung nicht abgeschlossen werden. Daher wurden die
Build-/Testwerkzeuge aus lokal vorhandenen Installationen verwendet. Produktions-
und Entwicklungsabhängigkeiten sind gegenüber 1.0.3 unverändert. Eine erfolgreiche
frische Abhängigkeitsinstallation oder ein Live-Hardware-Test wird nicht behauptet.
Die Versionsverfügbarkeit in npm ist vor Veröffentlichung separat zu prüfen; der
bestehende `prepublishOnly`-Guard führt diese Prüfung aus.
