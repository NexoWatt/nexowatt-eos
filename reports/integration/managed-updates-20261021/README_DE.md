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
| Echter lokaler Unix-Socket | BLOCKIERT | `socket-local-blocked.tap`; `listen EPERM` durch Ausführungsumgebung; CI-Prüfung vorgesehen |
| Chromium-Browserinteraktion | OFFEN lokal | Chromium-Download scheiterte; CI prüft echtes Chromium mit HTTP-Fixtures |
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
korrigiert; Browsernachweis erst nach tatsächlichem Testlauf.

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
