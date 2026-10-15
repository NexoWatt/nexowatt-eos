# EOS-OWN-UPDATE-20261015: begrenzter Sechs-Adapter-Testupdate

Stand: 15.10.2026. Quellbasis `e4616fec2a56cd7c6c013df090bdda00a0c37f54`
plus die hier benannten Kandidatenänderungen. Der historische R9-Updater und
seine signierten Lieferdateien bleiben unverändert.

## Zweck und erlaubte Änderung

`tools/system/update-test-own-adapters.cjs` ist ein neuer, eigenständiger
Root-Koordinator für genau diesen Übergang:

- Quelle: authentifizierter, aktiver R9-Teststand, Sequenz 12, Node 24.21.0,
  ARM64, Release `97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000`,
  Schlüsselhash `018e554d65105fa012fcd443f23077018fcd6e6bcf03af8f6fdedffdc4f74b04`.
- Ziel: gesondert signierter und unabhängig gepinnter Teststand, Sequenz 13,
  unveränderte Komponentenversionsnummern und Controller 7.2.2, exakt sechs
  eigene Adapter. Ein noch nicht erzeugter Zielrelease-/Schlüsselhash wird
  **nicht** vorweggenommen.
- Hinzu kommen vier kontrolliert erzeugte Instanzen: Devices, EEBUS, OCPP und
  Backup. Ihre initialen Konfigurationen enthalten keine physischen Zielgeräte;
  EEBUS/OCPP warten auf bewusste Einrichtung, automatische Backupziele bleiben aus.
- Admin/UI-Dateien einschließlich verschachtelter Abhängigkeiten und Dateimodi
  müssen vollständig unverändert gegenüber R9 bleiben. Ein späterer Management-
  Frontendwechsel benötigt eine andere ausdrücklich geprüfte Migration.
- Einzige Host-Unitänderung: exakt die geprüfte Upload-Unit mit dem festen
  Asset-only-Helfer. Keine zusätzlichen Betriebssystemrechte, keine Änderung
  des DB-Schemas, der Controller-Unit, der Konten oder der TLS-/Lizenzdaten.

R9 hat die historische R8-Erstabschlussdatei absichtlich erhalten. Deshalb wird
deren R8-Releasekennung zusammen mit dem root-geschützten erfolgreichen
R8→R9-Statusjournal validiert. Eine frei behauptete R9-Erstabschlussdatei oder
ein Journal mit Rückfall-/Fehlerphase genügt nicht.

## Zustandsfolge und Fehlerbehandlung

1. Root-/ARM64-/Node-/systemd-Aufrufbindung, Quellstand, Abschlussnachweis,
   vollständige alte/neue Signaturen, Host-Units und unveränderte Schutzdateien
   prüfen. Aktives PostgreSQL und funktionsfähige Admin-/UI-Basis verlangen.
2. Root-eigenes Wartungsschloss und Zusatzguard erzeugen; Zielpaket unverändert
   stagen und dessen native Abhängigkeiten prüfen. Kein bestehendes
   Wartungsschloss oder alter Enrollmentplan wird überschrieben.
3. Controller stoppen. Controller- und Upload-Service müssen gestoppt sein;
   zusätzlich darf kein Prozess mit realer, effektiver, gespeicherter oder
   Dateisystem-UID des `eos-runtime`-Kontos mehr vorhanden sein.
4. Enrollmentplan erstellen. Vor dem ersten DB-Schreibvorgang den vollständigen
   Plan und die alte authentifizierte Upload-Unit mit `0600`, `O_EXCL`,
   `O_NOFOLLOW`, Datei- und Verzeichnis-`fsync` journalisieren. Instanzplan enthält
   nur neue Standardkonfigurationen sowie Hashbindungen der bestehenden
   Managementinstanzen; keine Benutzerpasswörter oder vorhandenen Lizenzwerte.
5. Vier neue Instanzen und eigenen Marker gemäß dem separat geprüften
   Enrollmentprotokoll anlegen; danach die exakte neue Upload-Unit atomar
   installieren und systemd neu einlesen.
6. Releasezeiger und Releasezustand gemeinsam auf das neue Paket ausrichten.
   Assets ausschließlich im unprivilegierten vorhandenen Dienst-Sandboxprofil
   hochladen; keine generische CLI-`upload`-Metadatenmigration. Erneut alle
   Runtimeprozesse als gestoppt bestätigen. Nur der feste Upload-Start erhält
   270 Sekunden Aufruferfrist, damit die vorhandene 240-Sekunden-Unitgrenze
   auf einem Pi wirksam werden kann; andere Dienstbefehle behalten 90 Sekunden.
7. Zeitlich an den Koordinator gebundenen Start erlauben. Admin/UI-HTTPS,
   frische Lebenszeichen aller sechs Instanzen und die feste Sechs-Adapter-
   Enrollmentpolicy prüfen. Zusätzlich müssen frisch bestätigte Statuswerte
   (`ack: true`, Zeitstempel ab diesem Start) EEBUS `waiting` und entweder
   OCPP `awaiting_transport_enrollment` mit Backup `ready` oder OCPP
   `awaiting_license` mit Backup `waiting_license` ergeben. Ein Lebenszeichen
   bei fehlgeschlagener Initialisierung genügt nicht. Erst dann Erfolg
   journalisieren und Wartungsschloss entfernen. Gerätedaten oder physische
   Regelwirkung werden nicht behauptet.

Bei einem Fehler nach dem Stoppen werden Startfreigabe und beide Dienste
angehalten. Ein Rückfall darf nur die exakt zum eigenen geschützten Plan
passenden neuen Instanzen/Marker entfernen, **bevor** der alte Releasezeiger
oder der alte Controller wieder aktiviert wird. Die alte Upload-Unit wird
bytegenau wiederhergestellt. Änderungen durch fremde Akteure, unklare
Schreibzustände, defekte Journale oder ein fehlgeschlagener Rückfall lassen das
System gesperrt und gestoppt; keine fremden Konfigurationen werden überschrieben.

Neue, nach dem Rückfall nicht mehr referenzierte statische Adapterassets können
in der DB verbleiben. Sie sind keine ausführbaren Instanzen. Eine pauschale
Namespace-Löschung findet nicht statt. Die wieder benutzten Admin/UI-Assetbytes
sind aufgrund der vollständigen R9-Präfixbindung unverändert kompatibel.

## Tatsächlich ausgeführte Prüfungen

Linux x64, lokale Node-Version **24.19.0**, 15.10.2026:

```sh
node --test tests/system/update-own-adapters.test.cjs
```

**35/35 bestanden.** Echte temporäre Dateien, atomare Schreibvorgänge,
`fsync`, Dateirechte und Symlinkwechsel; Dienste, DB-Verbindungen, native
Paketprüfung und Enrollment-Aufrufe sind in diesen Koordinatortests ausdrücklich
Testdoppel. Echte Signatur-/Payloadmanipulationen werden zusätzlich vor
Diensteffekten geprüft.

Nachgewiesene Fälle: fehlende/falsche Quell- und Abschlussbindung; Geheimnisarme
Fehlerausgabe; Signatur-/Schlüssel-/Unitdrift; fremde Locks; Fehler beim Staging,
bei nativer Prüfung, Stop, Planpersistenz, teilweise angewendetem Enrollment,
Unit-/Assetupload, Start, Bereitschaft, Journal und Entsperren; Planänderung,
Plan-Symlink, offene Planrechte, fehlerhafter Enrollmentrollback; tatsächlicher
`/proc`-Scanner mit UID- und Statusnegativfällen; vollständige Admin/UI-Präfixbindung;
frische passive Startzustände einschließlich Lizenzkorrelation. Veraltete,
unbestätigte, widersprüchliche Werte und Fehler-/Start-/Stoppzustände werden
nicht als bereit gewertet.

Zusammen mit Backup-Layout, unveränderten PID-/R9-Updatetests und dem separaten
Enrollment-Test wurden im abschließenden gemeinsamen Lauf **119/119** Fälle
ausgeführt. Darin enthalten sind drei Unitinstallationsfehler: Fehler vor/nach
dem atomaren Unitwechsel und Fehler beim anschließenden `daemon-reload` sowie
die ausschließlich für den exakten Uploadstart verlängerte, feste Aufruferfrist.

```sh
node --test tests/system/backup-state.test.cjs \
  tests/system/controller-pid-state.test.cjs \
  tests/system/update-own-adapters.test.cjs \
  tests/system/update-test-to-r9.test.cjs \
  tests/integration/own-adapter-enrollment.test.cjs
```

Maßgeblich sind diese konkreten Testläufe, nicht eine fiktive native Hardwareabnahme.

## Noch offen und Freigabegrenze

- Echter ARM64-/Pi-/systemd-Updatelauf, Stromausfall und Restore auf Zielhardware
  sind hier **nicht ausgeführt**.
- Native Sechs-Adapter-Integration, Assetreadback, Start/Neustart und logischer
  Backup-Canarytest werden im getrennten nativen Prüfpfad geführt. Dieser Bericht
  erklärt dessen noch ausstehenden Ergebnisstand nicht vorab für bestanden.
- PostgreSQL-Operationen behalten ihre lokalen Connect-/Querygrenzen; die
  vollständige Rootoperation muss im gepinnten, zeitbegrenzten systemd-
  Supervisor laufen. Ein gekillter Koordinator hinterlässt seine dauerhafte
  Startsperre und den Plan; es gibt keinen blinden automatischen DB-Replay.
- Gesamtbackup/Restore, unabhängig bewertete Schwachstellen, Geräteabnahme,
  Reaktionszeiten, OS-/Firmware-SBOM und CRA-Konformitätsverfahren bleiben
  separate Nachweise. Dieser Kandidat ist keine Produktionsfreigabe.
- Ein veröffentlichter Installationsbefehl setzt erst die erfolgreichen
  Signier-, SBOM-, Test-, Publikations- und Download-Readbackgates voraus.

Verantwortung: EOS-Entwicklung; Zielhardwaretests gemeinsam mit dem Betreiber.
