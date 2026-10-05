# R8 bereits eingerichtet: zusätzlichen Admin-Startassistenten entfernen

Nach erfolgreicher EOS-Einrichtung kann R8 noch den überflüssigen ioBroker-
Assistenten anzeigen. Die Ursache ist korrigiert; für den bereits eingerichteten
R8-Test-Pi gibt es eine kleine, transaktionale Datenbankkorrektur. Sie erhält
Passwort, UUID, EOS-Lizenz und Einstellungen. Telemetrie bleibt deaktiviert.

[R8-Admin-Korrektur und Ablauf](docs/operations/COMPLETE_R8_ADMIN_SETUP_DE.md) ·
[Prüfbelege und noch offene Geräteabnahme](reports/integration/admin-wizard-20261005/README.md).
Die nachstehende R4/R7-Wiederherstellung nicht erneut auf einem bereits
eingerichteten R8-System ausführen.

<!-- EOS_PRIVATE_GITHUB_INSTALL_START -->
# R8: Wiederherstellung nach dem zurückgenommenen R7-Erststart

**test.3 Revision 8, Sequenz 11 ist signiert, veröffentlicht und öffentlich
zurückgelesen.** Die aktuellen Sicherheitsprüfungen, CodeQL und der vollständige
Auslieferungslauf sind grün. Dieser Weg gilt für den gemeldeten Pi-Zustand:
authentifiziertes R4, Sequenz 7, nach R7-Rücksetzung `RESTORED_STOPPED`, erhaltene
Wartungssperren und noch kein abgeschlossener Erststart.

R8 übernimmt die geprüften PostgreSQL-/PID-Korrekturen und repariert die
HTTPS-Bereitschaftsprüfung nach dem Adapterstart. Der neue Wiederherstellungshelfer
bewahrt bei einem Fehler dessen ursprüngliche Phase und festen Fehlercode.
Vorhandene Einrichtung, Passwörter, UUID, Lizenz und Zertifikate werden erhalten.
Ein anderer Ausgangsstand führt zum Abbruch.

Den vollständigen Befehl einmal im SSH-Terminal des betroffenen Test-Pi ausführen:

```bash
/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C /bin/bash -c 'set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-recovery-r8-entry-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 30009 https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/3b5bd2e9debce2f9bfe1aa5c6446f6c2a9e3027e/delivery/public-recovery-test3-r8/recover.sh -o "$d/recover.sh"; [[ -f "$d/recover.sh" && ! -L "$d/recover.sh" && $(/usr/bin/stat -c %h "$d/recover.sh") == 1 && $(/usr/bin/stat -c %u "$d/recover.sh") == 0 && $(/usr/bin/stat -c %s "$d/recover.sh") == 30009 ]] || exit 1; printf '\''%s  %s\n'\'' '\''c4e82b8299f35e85469cacfdc22fa784364bd5d1e0ac128d3bc7c2fd5b29d35f'\'' "$d/recover.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/recover.sh"'
```

Erfolg zeigt `"phase":"FIRST_START_RECOVERED"` und `"sequence":11`.
Anschließend beide Dienste prüfen:

```sh
systemctl show nexowatt-eos-controller.service nexowatt-eos-postgresql.service \
  --property=Id,ActiveState,SubState,Result,ExecMainStatus,NRestarts
```

Beide Dienste sollen `ActiveState=active` und `SubState=running` melden.
Danach an der bisherigen HTTPS-Adresse als `admin` mit dem vorhandenen Passwort
anmelden, abmelden und erneut anmelden. Erst nach erfolgreicher Anmeldung den
normalen Geräteneustart prüfen. Bei einem Fehler die festen Diagnosefelder und
den Dienstzustand auswerten; Sperren und historische Journale erhalten und den
Befehl nicht blind wiederholen.

[Vollständiger R8-Befehl als Textdatei](delivery/public-recovery-test3-r8/RECOVERY_COMMAND.txt) ·
[Ablauf und Fehlerbehandlung](docs/operations/RECOVER_R4_RESTORED_R7_TO_R8_DE.md) ·
[Veröffentlichung und Prüfnachweise](reports/integration/r8-release-20261004/README.md) ·
[Erfolgreicher Auslieferungslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37221151680).

Der native Linux-x64-Test mit Node 24.21.0 und PostgreSQL 17.11 besteht Einrichtung
unter Schreibschutz, Controller/Admin/UI, echte HTTPS-Anmeldung, gültige Lizenz,
aktuelle Prozesskennungen, Stop und Neustart sowie den unveränderten App-Dateibaum.
Alle 22.842 signierten Dateien wurden zusätzlich unabhängig geprüft. Der erste
R8-Wiederherstellungslauf auf dem Nutzer-Pi wurde am 05.10.2026 erfolgreich
zurückgemeldet. Browserbedienung, Geräteneustart und reale Geräteanbindungen
bleiben zu bestätigen. Physische Anlagenbefehle bleiben gesperrt; R8 ist ein Teststand.

## Historischer R7-Versuch

Der gemeldete R7-Versuch erreichte die Controller-Bereitschaft, wurde danach jedoch
auf R4 zurückgesetzt. Für diesen zurückgesetzten Zustand gilt der obige R8-Weg.
Den historischen R7-Befehl dafür nicht erneut verwenden.
[Pi-Rückmeldung und damaliger Nachweisstand](reports/integration/r7-release-20261004/README.md).

# Historisch: R6-Testupdate für vollständig eingerichtete R4-/R5-Teststände

R6 enthält die hier beschriebenen Controllerkorrekturen nicht und repariert
keinen abgebrochenen Erststart. Der folgende veröffentlichte Bestandsupdateweg
bleibt für seinen bisherigen Anwendungsbereich dokumentiert.

**test.3 Revision 6, Sequenz 9 ist signiert, veröffentlicht und öffentlich
zurückgelesen.** R6 enthält das NexoWatt-Branding, die Browser-/Login-Korrekturen
und die zwei im bisherigen Backup-Paket fehlenden Hilfsmodule. Controller und
alle sechs Produktadapter sind im Paket enthalten; Gerätefreigaben bleiben
separat zu prüfen.

Dieser Befehl aktualisiert den **vollständig eingerichteten R4- oder R5-Teststand
in einem Aufruf direkt auf R6**. Passwort, Lizenz, UUID, Datenbank und
Gerätezertifikate bleiben erhalten. Vor dem Test eine überprüfte Sicherung
bereitstellen. Den vollständigen Befehl einmal im SSH-Terminal ausführen:

```bash
/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C /bin/bash -c 'set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-update-r6-entry-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 29758 https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/12dc4ebee729ba7255c903bbf5bcf3c35b59338d/delivery/public-update-test3-r6/update.sh -o "$d/update.sh"; [[ -f "$d/update.sh" && ! -L "$d/update.sh" && $(/usr/bin/stat -c %h "$d/update.sh") == 1 && $(/usr/bin/stat -c %u "$d/update.sh") == 0 && $(/usr/bin/stat -c %s "$d/update.sh") == 29758 ]] || exit 1; printf '\''%s  %s\n'\'' '\''9e70583e02c789055c3a2589477b79c94d486833d5d1d494ae4aecdbbedafd0a'\'' "$d/update.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/update.sh"'
```

Größe und SHA-256 werden vor jeder Codeausführung geprüft. Archiv, Schlüssel
und Einstieg sind an feste Commit-URLs gebunden; ein GitHub-Token ist nicht
nötig. Ein systemd-Dienst überwacht den Paketwechsel und dessen Fehlerbehandlung.
Der Befehl richtet kein neues System ein und akzeptiert keine unbekannten oder
bereits auf R6 aktualisierten Ausgangsstände.

Nach Erfolg auf der bisherigen HTTPS-Adresse als `admin` mit dem bestehenden
Passwort anmelden. Admin, UI und Backup-Ansicht auf die NexoWatt-Darstellung
prüfen, abmelden, erneut anmelden und anschließend einen normalen Neustart
prüfen. Lizenz und UUID müssen erhalten bleiben. Bei einem Fehler Diagnosecode
und lokale Belege prüfen; keine Sperrdateien löschen oder einen frischen
Installer über die bestehende Installation starten.

[Updatebefehl als Textdatei](delivery/public-update-test3-r6/UPDATE_COMMAND.txt) ·
[Updateablauf, Rückfall und Pi-Testfolge](docs/operations/TEST_R6_UPDATE_DE.md) ·
[Veröffentlichung und zusätzliche öffentliche Rückleseprüfung](reports/integration/r6-release-20261004/PUBLICATION.json) ·
[Build, Signatur und beide Ausgangsstände](reports/integration/installable-test3-r6-20261004/build-verification.json) ·
[App-SBOM](reports/integration/installable-test3-r6-20261004/runtime.cdx.json) ·
[Erfolgreicher R6-Build und Publikationslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37187130650).

**Der echte Pi-Updateversuch, Login, Neustart, Backup/Restore und die
Anlagenabnahme bleiben offen.** Die R6-Paket-/Updateprüfungen und die
EOS-Sicherheits-CI sind bestanden. Die alten plattformübergreifenden CI-Jobs
sind durch [EOS-gerechte Vertragsprüfungen](docs/operations/GITHUB_WORKFLOWS_DE.md)
ersetzt; eine native Vollinstallation bleibt gesondert zu prüfen. Dieser
Bestandsupdateweg führt `dist/install.sh` nicht aus. Physische Anlagenbefehle
bleiben gesperrt.
Dies ist ein Testkandidat, keine Produktions- oder CRA-Konformitätsfreigabe.

Der [historische R5-Reparaturweg](docs/operations/TEST_R4_R5_REPAIR_ENTRY_DE.md)
und die [historische R4-Erstinstallation](docs/operations/STABILITY_TEST4_DE.md)
bleiben als unveränderte Lieferstände dokumentiert. Für dieses historische
R4-/R5-Bestandsupdate gilt ausschließlich der R6-Befehl oben.
<!-- EOS_PRIVATE_GITHUB_INSTALL_END -->

## Quellaktualisierung vom 04.10.2026

Die ergänzende NexoWatt-Logo- und Browser-Anmeldekorrektur wird auf dem vorhandenen
R5-Quellstand geführt. Der reduzierte Erststart, die NWL3-Home-/Pro-Lizenz und
sämtliche sechs Produktadapter des vorhandenen R5-Pakets bleiben erhalten.
[Abgleich, übernommene Änderungen und Prüfungen](reports/integration/github-reconcile-20261004/README.md).

Diese Änderungen sind jetzt im oben gebundenen R6-Testpaket enthalten.
Die historischen R4/R5-Lieferdateien behalten ihre bisherigen Bytes.
Das separat aus einer älteren ZIP-Basis erzeugte test.3-Paket vom 04.10.2026
ersetzt R4/R5 nicht und wird hier nicht als Bestandsupdate angeboten.

---

# Aktueller Entwicklungsstand: EOS dev9 – geschützter Erststart

Der neue Installationspfad verlangt Controller und sämtliche sechs Produktadapter
als tatsächliche Laufzeitpakete. Die HTTPS-Ersteinrichtung verwendet einen
kurzlebigen lokalen Besitzcode; Benutzer vergeben ihre Passwörter im Frontend.
Die neue Quellfassung beschränkt den Assistenten auf Geräte-UUID, signierte
Home-/Pro-Lizenz und Adminpasswort. Anlagenwerte und Geräte folgen bei der
Kundenanbindung. Sie korrigiert außerdem die zu kurze Passwortprüffrist.
[Änderung, Tests und offener Pi-Loginbefund](reports/integration/minimal-first-start-20261003/README.md).
R6 enthält diese Änderungen sowie die oben genannten Branding- und Paketkorrekturen.
Die historischen R4/R5-Dateien bleiben unverändert.
Installation, Einrichtung und Anlagenfreigabe bleiben getrennt.

[**R7: abgebrochenen R4-Erststart wiederherstellen**](docs/operations/RECOVER_R4_FIRST_START_R7_DE.md) ·
[Historisches R6-Bestandsupdate](docs/operations/TEST_R6_UPDATE_DE.md) ·
[Ein-Befehl-Download vorbereiten](docs/operations/ONE_COMMAND_INSTALLATION_DE.md) ·
[Ersteinrichtung und offene Abnahme](docs/operations/FIRST_START_INSTALLATION_DE.md) ·
[Sicherheitsgrenzen](docs/security/FIRST_START_DE.md) ·
[R7-Test- und Buildnachweise](reports/integration/installable-test3-r7-20261004/).

**Der signierte ARM64-Testkandidat `0.2.0-test.3`, Revision 7, ist veröffentlicht.**
Der oben gebundene R7-Befehl gilt nur für den abgebrochenen R4-Erststart.
R6 und die älteren Revisionen bleiben historisch erhalten. NWL3 lizenziert
Home/Pro für das System; bestehende
NWL2-Lizenzen behalten ihre ursprünglichen Grenzen.

**Der neue Quellstand ist keine auf dem Pi abgeschlossene Installation.**
Die historischen signierten Pakete test.1/test.2 enthalten die neuen Quellen
nicht. Der aktuelle Paketbau-/Lieferstatus steht im Prüfbericht; Geräte- und
Hardwareabnahme sind offen, Anlagenbefehle bleiben gesperrt.

---

![NexoWatt](components/admin/admin/img/eos/nexowatt-192.png)

# NexoWatt EOS

**Hauptrepository des integrierten EOS-Systems · `0.2.0-dev.9` · 3. Oktober 2026.**

Die folgenden test.2-/dev7-Angaben beschreiben den historischen Lieferstand.

Neu: signierter **PostgreSQL-Installationskandidat `0.2.0-test.2`** für einen
frischen, isolierten Debian-13-Lite-Test-Pi (ARM64). Er enthält Controller,
EOS Admin, aktuelle UI, Backend, Installer, Prüfungen und Laufzeit-SBOM.
[Aktuelle Installationsanleitung](docs/operations/POSTGRESQL_TEST_INSTALLATION_DE.md).
Native PostgreSQL-/Systemd-/Pi-Abnahme noch offen; keine Produktionsfreigabe.
Devices/EEBUS/OCPP21/Backitup sind Quellen, nicht aktivierte Laufzeitadapter.
Der alte Redis-Installationspfad und `test.1` bleiben gesperrt.

Seit `0.2.0-dev.5`: ein separater Hostdienst für automatische Debian-
Paketupdates und eine authentifizierte, ausschließlich lesbare Statuskarte im
EOS-UI. [Umfang, Bedrohungen, Grenzen und CRA-Bezug](docs/security/OS_SECURITY_UPDATES_DE.md).
Diese Funktion ist noch nicht auf dem Nutzer-Pi installiert oder durch einen
tatsächlichen Debian-Paketupdate-Lauf abgenommen. Die vorhandenen signierten
Testarchive `test.1` sind historische Artefakte und enthalten diese Erweiterung
nicht; der neue PostgreSQL-Kandidat `test.2` enthält sie.

Neu in `0.2.0-dev.6`: experimentelle PostgreSQL-Backends für Objects und States
über die Erweiterungsschnittstelle des js-controllers. Die Nutzerentscheidung
auf PostgreSQL ist verbindlich aufgenommen. TLS 1.3, eingeschränkte DB-Rollen,
Transaktionen und begrenzte Ereignisverarbeitung sind im Quellcode umgesetzt.
[Architektur, Prüfgrenzen und offene Freigaben](runtime/postgresql/README.md).
Ein echter nativer PostgreSQL-Server konnte in dieser root-only Arbeitsumgebung
nicht gestartet werden. In dev7 ist jetzt ein separater, eingeschränkter
Test-Hostinstaller mit echten Zielprüfungen enthalten. Alte Artefakte bleiben
unverändert und gesperrt. [Neue Sicherheitsgrenzen und offene Befunde](docs/security/POSTGRESQL_TEST_INSTALLATION_DE.md).

Hier werden die EOS-Basis, die eigenen Adapter, das vorhandene UI, der Installer,
Architektur und Sicherheitsnachweise gemeinsam gepflegt. Der maschinenlesbare
Produktumfang steht in [`system/product.json`](system/product.json). EOS baut auf Linux,
Node.js und ioBroker auf. Die sichtbare Produktoberfläche heißt NexoWatt EOS;
technische Paketnamen, Schnittstellen und Urheberrechtshinweise bleiben erhalten.

Das aktive Entwicklungsprofil verbindet den gehärteten js-controller 7.2.2 mit
EOS Admin 7.10.11 und NexoWatt UI 1.0.21. Devices, EEBUS, OCPP21 und Backup sind
vollständig als Laufzeitpakete enthalten, aber noch nicht für den Anlagenbetrieb
aktiviert. UI-Design und Funktionsquellen bleiben erhalten; physische Befehle
sind im Laborprofil weiterhin gesperrt.

## Anmeldung und Rollen

| Rolle | Zuständigkeit im EOS-Produkt |
| --- | --- |
| NexoWatt Service / Admin | Herstellerseitige Administration und Lizenzverwaltung mit eigenem, gerätebezogenem Passwort. |
| Installateur | Persönlicher Zugang, freigegebene Einrichtung und eigene Passwortvergabe; keine Adminrolle. |
| Benutzer | Persönlicher Zugang zu den vorgesehenen Bedienansichten und eigenes Passwort; keine technische Administration. |

Im neuen Erststartprofil richtet der Besitzer über HTTPS das erste feste
Servicekonto `admin` mit eigenem Passwort ein. Nach der Anmeldung erstellt die
Service-Administration berechtigte Einladungen für Installateure und Benutzer.
Jeder Empfänger setzt sein Passwort selbst; es gibt keine gemeinsamen
Standardpasswörter und keinen Terminaldialog für Benutzerpasswörter.
Der Einladungsweg und seine Grenzen stehen im
[Konten- und Steuergrenzenbericht](docs/security/ONBOARDING_ACCOUNTS_REVIEW_DE.md).

## Architektur und Nachweise

- [Systemarchitektur, Datenflüsse und Vertrauensgrenzen](docs/architecture/INTEGRATED_SYSTEM.md)
- [SQLite/AES-256, Transport und Backend-Alternativen](docs/architecture/DATABASE_TRANSPORT_OPTIONS_DE.md)
- [Installation und Abnahme auf dem getrennten Test-Pi](docs/operations/TEST_PI_INSTALLATION_DE.md)
- [Gemeinsame Quellen und kontrollierte Adapteränderungen](docs/development/EOS_SOURCE_WORKFLOW_DE.md)
- [Aktueller Änderungs- und Prüfbericht](docs/security/OS_SECURITY_UPDATES_DE.md)
- [Weiterhin offene Redis-Installationssperre](docs/security/DEBIAN13_TEST_HOST_DE.md)
- [Bedrohungsmodell der Test-Pi-Lieferung](docs/security/TEST_PI_STABILIZATION_THREAT_MODEL_DE.md)
- [CRA-Anforderungen und Nachweismatrix](docs/cra/INTEGRATED_TEST_REQUIREMENTS.md)
- [STRIDE-Bedrohungsmodell](docs/security/INTEGRATED_TEST_THREATS.md)
- [CycloneDX-SBOMs und Buildnachweise](reports/integration/sbom/)
- [Reproduzierbarer Build und SBOM-Werkzeuge](tools/integration/README.md)

Die interne Objects-/States-Kommunikation nutzt TLS 1.3; Admin und UI verlangen
HTTPS und serverseitige Anmeldung. Ein kompromittierter Adapter im gemeinsamen
Dienstkonto bleibt jedoch innerhalb derselben Vertrauenszone wie der Controller.
Eine gesonderte kryptografische Identität je Adapter ist noch offen.

`delivery/test-pi-0.2.0-test.1/` bewahrt das zurückgezogene historische ARM64-Testbundle
mit Controller/Admin/UI und das gebundene Node-24.21.0-Archiv. Es ist derzeit
nicht zur Neuinstallation zu verwenden. Der öffentliche
Testschlüssel muss vor Verwendung über den bestätigten Übergabeweg geprüft werden.
Die älteren Reproduktionsordner und Nachweise bleiben historische Lieferstände.

Das vollständige UI-Pflichtgate ist weiterhin rot: Mesh-Anfragen überschreiten
unter Last sporadisch das unveränderte Zeitbudget. Die verbesserte Diagnose und
reduzierte Planungsarbeit schließen diesen Befund nicht. Im integrierten
Laborprofil wird der Mesh-Koordinator nicht gestartet; physische Mutationen
bleiben serverseitig gesperrt. Das ist keine Freigabe einer Anlagenregelung.

Zielhost-Abnahme, sichere Geräteaktivierung, kontrollierte Aufnahme zusätzlicher
Adapter, Backup/Restore und Fernwartungsprüfung bleiben Freigabearbeiten.
Dieser Entwicklungsstand ist keine CRA-/IEC-Konformitätserklärung oder
Produktionsfreigabe. Maßgeblich sind jeweils Quell-/Artefaktbindung und Zeitpunkt
des konkreten Prüfberichts; frühere Ergebnisse gelten nicht automatisch für
veränderte Dateien.

## Herkunft und Lizenzen

**NexoWatt EOS ist hinsichtlich der eigenen, nicht anderweitig lizenzierten
NexoWatt-Bestandteile proprietär. Nutzung, Installation, Änderung und Weitergabe
setzen die vorherige schriftliche Erlaubnis von NexoWatt voraus.** Maßgeblich ist
die [Lizenz](LICENSE); die [Drittanbieterhinweise](THIRD_PARTY_NOTICES.md) grenzen
die übernommenen Bestandteile und bestehende Lizenzrechte ab.

Eine technische Einrichtung ohne aktivierten EOS-Lizenzschlüssel erteilt keine
vertragliche Nutzungsberechtigung. Bereits wirksam eingeräumte Rechte an früheren
Fassungen, insbesondere MIT-Rechte, bleiben unberührt. Der
[Änderungsnachweis vom 03.10.2026](docs/development/LICENSING_CHANGE_2026-10-03_DE.md)
beschreibt den damaligen Lizenzstand; die neue Runtime-Lieferung wird im
[aktuellen Nachweis](reports/integration/installable-test3-r6-20261004/) separat belegt.

Die ioBroker-Basis und die Herkunft aller übernommenen Komponenten bleiben
nachvollziehbar. Der [historische Upstream-README](docs/history/UPSTREAM_README.md)
enthält die bisherigen technischen Erläuterungen und Urheberrechtshinweise.
Maßgeblich sind zusätzlich die jeweiligen Lizenzdateien der Komponenten und
Abhängigkeiten. Markenwechsel ändert deren Lizenzen nicht. Das Paketmanifest im
Repositoryroot gehört weiterhin zum übernommenen Installer; es allein beschreibt
weder den vollständigen EOS-Produktumfang noch eine Veröffentlichung des Gesamtsystems.
