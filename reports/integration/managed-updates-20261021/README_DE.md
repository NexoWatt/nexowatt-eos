# Prüfbericht: neue Frischbasis und EOS-Updateknopf

Datum: 21.10.2026. Ausgangscommit:
`5be3a225daa56ad80d824a7a605cb417b897c0cd`.
Geprüfte Änderungen sind durch `verification.json` und
`source-files.sha256.json` gebunden; diese Dateien behaupten keinen
bereits vorhandenen signierten Releasecommit.

## Tatsächlich ausgeführte Prüfungen

Lokale Linux-x64-Umgebung, Node 24.19.0; damit nicht der exakt gepinnte
Release-/Pi-Runtime-Nachweis für Node 24.21.0. Keine echte Installation,
kein systemd und keine physische Geräteaktion in dieser Umgebung.

| Prüfung | Ergebnis | Beleg / Einordnung |
| --- | --- | --- |
| Signierter Kanal, Downloadgrenzen, Auftragssperre, Trust-/Installerregeln, Transaktionsfehler, Frischeinschreibung, HTTP-Berechtigungen, SBOM | 53 PASS | `managed-contracts.tap`; echte lokale Kryptografie/Dateien, injizierte Netzwerk-/Systemdienst-/DB-Grenzen |
| Bestehender Erststart, Enrollment, Quiesce, R11-Rückfall, Produktumfang, Bundles und PostgreSQL-Installer | 165 PASS | `regression.tap`; vor den zwei zusätzlichen Managed-Host-Fixtures ausgeführt |
| PostgreSQL-Installer einschließlich neuer Managed-Frischinstallation und Fehlerbereinigung | 20 PASS | `managed-host-fixtures.tap`; Befehlsdoubles, kein systemd-Installationsnachweis |
| Admin-Postbuild und versiegelte Source/Runtime-Dateien | PASS | `admin-seal.txt`; kein vollständiger React-Neubau |
| Echter lokaler Unix-Socket | BLOCKIERT | `socket-local-blocked.tap`; `listen EPERM` durch Ausführungsumgebung; tatsächlicher Socket inzwischen in CI bestanden |
| Chromium-Browserinteraktion | OFFEN lokal | Chromium-Download scheiterte; zwei Tests in echtem CI-Chromium mit HTTP-Fixtures bestanden |
| Öffentliche Range-Auslieferung | OFFEN | Lokaler HTTPS-Versuch nach fünf Sekunden ohne Verbindung abgebrochen; kein erfolgreicher Rücklesetest |

Zählungen sind je Testlauf und enthalten Überschneidungen; nicht zu einer
Zahl unabhängiger Abnahmekriterien addieren. Der GitHub-Actions-Workflow prüft
nach Veröffentlichung den gepushten Quellstand unter Node 24.21.0. Ergebnisse
werden separat an den ausgeführten Commit gebunden. Die Pipeline hat
Leserechte und veröffentlicht keine Pakete oder Kanalsignaturen.
Das lokale Fehlerprotokoll wurde ausschließlich um absolute Arbeits- und
Fixtureverzeichnisse bereinigt; Testergebnis und Fehlercode bleiben erhalten.

## Prüfung der Sicherheitsgrenzen

Manuell geprüft: getrennte bisherige/neue Adminrouten, Schutz vor widerrufener
Session nach Body-Parsing, keine Client-URL/Kommandos, zwei Signaturen und
persistenter Trust, unveränderliche Commit-URL, begrenzte Downloadzeit/-größe,
exklusiver Auftrag, persistierter Wiederherstellungszustand, Rückfall auf
belegten alten Stand, unveränderte Enrollment-/Datenbank-/Hostverträge.
Mobilbreite und schnelles Schließen/Wiederöffnen des Dialogs wurden im Code
korrigiert und inzwischen in echtem CI-Chromium mit HTTP-Fixtures geprüft.

Die weitergehende Prüfung der System- und Adapterisolation bleibt offen.
Ein manuell bestätigtes Backup wird nicht automatisch erstellt oder auf
Wiederherstellbarkeit getestet. Dieser öffentliche Bericht enthält den
Prüfumfang und Freigabestatus; vertrauliche Betriebsdaten und detaillierte
Angriffsszenarien gehören nicht in die Veröffentlichung.

## Freigabeentscheidung

Vor der öffentlichen Quellveröffentlichung wurden die vollständigen geänderten
Dateien einschließlich Dokumentation und Testprotokollen auf bekannte
Geheimnismuster geprüft und die relevanten Schlüssel-/Konfigurationsstellen
manuell eingeordnet. Keine operativen Zugangsdaten oder privaten Schlüssel in
diesem Umfang gefunden. `public-source-review.json` bindet Umfang, Regeln,
Dateihashes und Grenzen. Dies ist keine Vollprüfung aller historischen
Repositoryobjekte oder bereits veröffentlichter Binärarchive.

**Quellimplementierung vorhanden, Auslieferung und Pi-Abnahme OFFEN.** Keine
neue Installationsfreigabe. Signierschlüsselverwaltung, Paketbau, echter
HTTPS-Rücklesetest, frischer Debian-/ARM64-/systemd-Erststart, mindestens zwei
Updateknopf-Durchläufe, Stromunterbrechung, Wiederherstellung, Daten-/Lizenz-
Bestandserhalt, physische Geräteverträglichkeit und Zeitziele bleiben offen.

V1 erlaubt eigene Adapterpatches bei unveränderten Versionen/Abhängigkeiten.
Admin 8/React 19, allgemeine Paket-/Hostmigrationen und die vollständige
Bereinigung älterer Node-Engine-Angaben sind damit nicht abgeschlossen.
Keine Produktions-, Anlagen-, Sicherheitsvollständigkeits- oder CRA-Freigabe.

## Erste CI und korrigierte Testvorbereitung

Am Quellcommit `38a2fdbbe2de97011e4d4c7c4f9411b309444243` bestanden die
Vertragsprüfungen und der tatsächliche Unix-Socket-Test unter Node 24.21.0.
Der neue Gesamtlauf blieb zunächst rot: eine kopierte Unit-Testdatei hatte
den Checkout-Eigentümer, und der Browsertest fand die deutsche Schließen-
Beschriftung nicht. Die Testvorbereitung erzeugt die Unit nun als neue
root-eigene Datei; die Browserfixture erhält explizit UTF-8 wie die reale
Adminseite. Die Produkt-Schutzprüfungen wurden nicht gelockert. Die vier
Trust-Fixture-Tests bestehen lokal. Die erneute CI am Commit
`f3f1ce90642463b0940742b529441ed59375695d` besteht: beide Managed-Jobs
(Verträge/root-eigene Fixtures und Chromium) sind grün.
Siehe `ci-fixture-followup.json` und `trust-fixture-followup.tap`.

## CI am veröffentlichten Quellstand

`ci-qualification.json` bindet die Ergebnisse an Commit
`f3f1ce90642463b0940742b529441ed59375695d` und die öffentlichen Actions-Läufe.
Beide Managed-Jobs und alle acht übergreifenden Sicherheits-/Integrationsgruppen
sind bestanden. Die Managed-Gruppen melden 38 PASS/1 SKIP, 44 PASS und
25 PASS; die letzte Gruppe läuft mit root-eigenen temporären Dateien und
enthält den tatsächlichen Unix-Socket. Beide Chromium-Tests sind bestanden.
Die separaten Netzwerk- und Workflowprüfungen bestanden am ausdrücklich
ausgewiesenen früheren Commit; deren Implementierung wurde danach nicht
geändert. Auch der CodeQL-Prüflauf ist erfolgreich abgeschlossen. Dies ist
kein Nachweis vollständiger Schwachstellenfreiheit.

Die erhaltenen Textbelege enthalten nur Testzusammenfassungen. Die erfolgreichen
nativen PostgreSQL-, Adapterprozess-, Backup- und Rückfallprüfungen betreffen
ihre jeweiligen Integrationsumgebungen. Sie ersetzen weder eine vollständige
Managed-systemd-Installation noch die Abnahme auf einem echten Test-Pi.
Der Auslieferungs- und Freigabestatus oben bleibt deshalb unverändert.
