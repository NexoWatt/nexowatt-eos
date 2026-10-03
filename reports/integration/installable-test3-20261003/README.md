# EOS test.3 – Installation aus Git und Lizenzrechte

Dieser Nachweis gehört zum Stand vom 03.10.2026. Er ergänzt die historischen
Berichte; die frühere test.2-Paketprüfung belegt weiterhin keine Vollinstallation.
Aktueller Einstieg: [Git-Installationsanleitung](../../../docs/operations/GIT_TEST3_INSTALLATION_DE.md).

## Geändertes Verhalten

Das vollständige Produkt wird offline einschließlich aller sechs Adapter und
PostgreSQL-Backends zusammengestellt. Zwei Serialport-Pakete verwenden exakt
gebundene ARM64-Bibliotheken mit festem Loader. Derivative und entfernte Dateien
sind getrennt von den Upstream-Archivhashes dokumentiert. Die Installation
verlangt einen echten nativen Ladeversuch auf dem Pi, bevor sie die Hostdienste
einrichtet. Sie bietet keinen Bypass für Signatur, SBOM, Architektur oder Rechte.

Die geschützte Einrichtung zeigt die Geräte-UUID vor Lizenzaktivierung und
Passwortspeicherung. Passwörter werden im HTTPS-Frontend vergeben. Home/Pro
werden über bestätigte NWL2-Leases an die vorhandene UI-Matrix gebunden; engere
signierte Kontingente gelten. Die proprietäre Kennzeichnung der eigenen
NexoWatt-Bestandteile ist enthalten; Drittanbieter- und frühere Rechte bleiben
erhalten. Eine Lizenz hebt die offene technische Geräteabnahme nicht auf.

Ein invocation-gebundener systemd-Stopwächter behandelt unterbrochene
Einrichtungsabschlüsse. Persistente Wartungslocks bleiben für die kontrollierte
Diagnose erhalten. Es wird keine verteilte Rollbacktransaktion behauptet.

## Ausgeführte Prüfungen

| Bereich | Ergebnis | Nachweis |
|---|---|---|
| Zentrale Regression, Setup/Erststart/Buildvertrag | 207 bestanden, 0 Fehler, 3 Skips | [central.json](central-regression/central.json) |
| Lizenzkette und Rollen | 99 + 26 bestanden, 2 POSIX-Skips | [verification.json](licensing/verification.json) |
| Native Loader, Architektur, SBOM-Verträge | 54 Node- und 6 Python-Tests bestanden | [completion.json](native/completion.json) |
| TEST-Archiv und Payloadgates einschließlich Buildverträgen | 39 bestanden, darunter 14 Archiv- und 5 echte Payloadgate-Fälle | [test-archive.json](archive/test-archive.json) |
| Build-Archiv nach Zeitbudgetkorrektur | 14 Archivtests und 2 isolierte Fehlerpfadprüfungen bestanden | [archive.json](archive/writer-timeout/archive.json) |
| Komponentenkatalog aus endgültigem Payload | 24 bestanden, keine Skips | [verification.json](catalog/verification.json) |
| Finalizer/Stopwächter | 28 bestanden | [quiesce.json](finalizer/quiesce.json) |
| Git-Einstieg und Datenextraktion | 5 Node- und 6 Python-Tests bestanden | [verification.json](checkout/verification.json) |
| Gezielte UI-Prüfungen | Typverträge, Syntax, Spiegel, Dokumentation und Artefaktmanifest bestanden | [findings.json](licensing/findings.json) |
| Vollständiger UI-TypeScript-Build und zusätzliche Pflichtgates | Build bestanden; Home-App-Center im echten Headless-Chrome bestanden; 88 Speicherszenarien und 960 Grenzwertfälle bestanden | [summary.json](licensing/developer-gates-local-cache/summary.json) |
| Zusammengesetzt dokumentierte UI-Pflichtstufen | 68 von 71 bestanden; 3 unverändert fehlgeschlagen, kein erfolgreicher Gesamtaufruf behauptet | [summary.json](licensing/developer-gates-local-cache/summary.json) |

Diese Gruppen überschneiden sich und dürfen nicht als Gesamtzahl unabhängiger
Tests addiert werden. Rohprotokolle und SHA-256-Bindungen stehen bei jeder
Gruppe. Wo Datenbank, systemd, Geräte oder DOM ersetzt wurden, steht dies im
jeweiligen Nachweis. Echte lokale TLS-Verbindungen sind kein Pi-Nachweis.

Der endgültige Build liegt unter [build-final](build-final/); vorherige
Buildbefehle und Ergebnisdateien bleiben unter [build](build/) erhalten. Der erste
Schemaprüfversuch scheiterte am Dateizugriff auf den lokal installierten Python-
Validator im Sandboxkonto. Der erneute Lauf verwendete denselben Validator
mit freigegebenem Dateizugriff. Der fehlgeschlagene Versuch bleibt erhalten.
Die Abhängigkeiten wurden aus dem vorbereiteten Offlinecache aufgelöst; der
erzeugte Lock ist gebunden. Beliebige Cachezustände sind kein Nachweis eines
reproduzierbaren identischen Builds. Ein neuer temporärer TEST-Signierer
ändert Schlüssel, Signatur und Archivhash; bei identischem Manifest bleibt
die manifestbasierte Release-ID gleich. Der erste Paketlauf wurde kontrolliert
beendet, um redundante vollständige Architekturscans zusammenzufassen. Der
neue Lauf behält die zwingende Prüfung und den erneuten Vergleich aller Bytes.
Der folgende reale Paketlauf wurde korrekt mit `BUILD_COMPONENT_DIGEST`
abgewiesen: Der Katalog enthielt noch drei beim Packen entfernte npm-`.bin`-
Startdateien der UI. Der Produzent berechnet die Kataloghashes jetzt aus dem
tatsächlichen finalen Payloadinventar. Die ablehnende Prüfung bleibt unverändert.
Ein weiterer Schreibversuch endete mit `TEST_ARCHIVE_IO`; das erhaltene Archiv
war abgeschnitten (76.890.918 Bytes, EOF beim Lesen; letzter lesbarer Eintrag
`app/node_modules/lodash/fp/_mapping.js`). Es wurde weder freigegeben noch
ausgeliefert. Das Zeitbudget ausschließlich des Build-Archivwerkzeugs wurde
von 5 auf 20 Minuten erhöht; Installer- und Laufzeitgrenzen bleiben unverändert.

## Fehlgeschlagene und offene übergeordnete Prüfungen

Der vollständige UI-Build `npm run build:ts` **besteht** mit den deklarierten
Compilerpaketen aus dem vorhandenen lokalen Cache. Ursprüngliche Compiler-/
Typfehler und getrennte Fortsetzungen der Pflichtgates bleiben unter
[licensing](licensing/) dokumentiert. Die neue Lizenzprüfung erforderte eine
explizit autorisierte positive Speichertest-Fixture; zusätzlich wird dort die
Sperre ohne bestätigte Lizenz geprüft. Diese Korrektur ist im endgültigen Paket.
Der gesamte Aufruf `npm run test:all` wird trotzdem **nicht als bestanden**
ausgewiesen: exakte POSIX-0600- und O_NOFOLLOW-Prüfungen sind unter Windows
nicht erfolgreich; der Mesh-Test überschreitet sein unverändertes 200-ms-Budget.
Die getrennten Folgeprüfungen ersetzen keinen erfolgreichen Gesamtaufruf.
Frühere Pfadfixture-,
OpenSSL-PATH- und zu kurze Testclient-Timeoutfehler bleiben in `attempt-1`
erhalten; Produktions-KDF und HTTP-Grenzen wurden dafür nicht gelockert.

**Offen, nicht ausgeführt:** vollständige Installation auf Linux/ARM64,
tatsächliches Laden der nativen Bibliotheken, PostgreSQL/mTLS/Rollen,
systemd-Dienste und POSIX-Dateirechte, echte Browserdarstellung und kompletter
Login/UUID-/Lizenzablauf auf dem Gerät, Reboot, SIGTERM/SIGKILL/Stromausfall,
Recovery, Backup/Restore und sämtliche Geräte-/Anlagen-/Hardwaretests.

Das Paket ist ein Kandidat für einen frischen isolierten Testhost. Es erteilt
keine physische Steuerfreigabe, Produktionsfreigabe oder Konformitätserklärung.
