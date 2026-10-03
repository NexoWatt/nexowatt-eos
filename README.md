<!-- EOS_PRIVATE_GITHUB_INSTALL_START -->
# EOS auf dem Debian-13-Test-Pi installieren

**Signierter ARM64-Teststand: test.3 Revision 4, Sequenz 7.** Das Paket und
der öffentliche Ein-Befehl-Download sind veröffentlicht und zurückgelesen.
Ein GitHub-Token wird für diesen Einstieg nicht benötigt.
**Einstiegsrevision 2** korrigiert den bestätigten `RECOVERY_PATH_OWNER`-Abbruch
bei leeren PostgreSQL-Verzeichnissen im Eigentum von `postgres`.
[Fehlerkorrektur und Nachprüfung](reports/integration/recovery-pg-owner-20261003/README.md).

1. Mit PuTTY/SSH als Benutzer mit sudo-Recht am Pi anmelden.
2. Den folgenden vollständigen Befehl einmal einfügen. Bei Bedarf wird das
   persönliche sudo-Passwort abgefragt.
3. Nach erfolgreicher Installation die angezeigte HTTPS-Adresse öffnen.
   Geräte-CA und Fingerabdruck über die vertrauenswürdige SSH-Verbindung
   übernehmen und den Erststart-Assistenten mit dem Einrichtungscode starten.
   UUID, Lizenz und persönliche Benutzerpasswörter werden im Frontend behandelt.

```bash
/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C SSH_CONNECTION="${SSH_CONNECTION-}" /bin/bash -c 'set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-installer-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 75499 https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/23e1598223b13eb83fac0860079db4d0964f99ce/delivery/public-entry-test3-r4-recovery2/install.sh -o "$d/install.sh"; [[ $(/usr/bin/stat -c %s "$d/install.sh") == 75499 ]] || exit 1; printf '\''%s  %s\n'\'' '\''4f08637c9c2b4de5a233f7e310e67c69c79f2293f1dc4461ce4ea79ce3a478d4'\'' "$d/install.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/install.sh"'
```

Der Befehl lädt das vollständige Installationsskript mit curl in ein neues,
geschütztes Verzeichnis. Größe und SHA-256 werden vor dessen Ausführung geprüft.
Skript und Dateien sind an feste Git-Commits gebunden. Die nachfolgenden
Paket-, Signatur-, Betriebssystem- und Lizenzprüfungen bleiben erhalten.
Node 24.21.0, PostgreSQL 17, EOS und der Erststartdienst werden vorbereitet.

Voraussetzung: Debian 13/Raspberry Pi OS 13, ARM64, laufendes systemd, korrekte Uhr,
bash, sudo, curl, python3 und mindestens 6 GiB freier Speicher. Dieser Einstieg
funktioniert, solange das Repository öffentlich verfügbar ist; der lokale
EOS-Betrieb benötigt keine GitHub-Anbindung.

Unterstützt werden ein frischer Host und ausschließlich der bereits
diagnostizierte R2-Sudo-Abbruch. Dessen Dateien und numerische Kontoidentität
werden erhalten. Andere bestehende Installationen werden abgewiesen; dieser
Befehl ist kein Updater und keine allgemeine Reparaturfunktion. Alte R2-/R3-
Befehle und signierte Dateien bleiben als historische Belege erhalten.

[Befehl als Textdatei](delivery/public-entry-test3-r4-recovery2/INSTALL_COMMAND.txt) ·
[Installation und Pi-Abnahme](docs/operations/STABILITY_TEST4_DE.md) ·
[Änderungen und offene Punkte](reports/integration/stability-20261003/README.md) ·
[Veröffentlichungsnachweis](reports/integration/recovery-pg-owner-20261003/publication.json) ·
[Gebundene App-SBOM](reports/integration/installable-test3-r4-20261003/runtime.cdx.json).

**Die tatsächliche Pi-Vollinstallation, Browser-, Reboot-, Backup-/Restore- und
Geräteabnahme bleiben OFFEN.** Anlagenbefehle bleiben gesperrt. Dieser Stand ist
kein Produktionsrelease und keine CRA-/IEC-Konformitätserklärung. PostgreSQL-
Zertifikate benötigen vor Dauerbetrieb einen separat abgenommenen Erneuerungsweg.
<!-- EOS_PRIVATE_GITHUB_INSTALL_END -->

---

# Aktueller Entwicklungsstand: EOS dev9 – geschützter Erststart

Der neue Installationspfad verlangt Controller und sämtliche sechs Produktadapter
als tatsächliche Laufzeitpakete. Die HTTPS-Ersteinrichtung verwendet einen
kurzlebigen lokalen Besitzcode; Benutzer vergeben ihre Passwörter im Frontend.
Der Assistent führt durch Standort, signierte Lizenz, Anlagenwerte und Geräteplan.
Nicht verfügbare Anlagenangaben bleiben ausdrücklich als offen markiert.
Installation, Einrichtung und Anlagenfreigabe bleiben getrennt.

[**Aktuelle Pi-Testinstallation**](docs/operations/STABILITY_TEST4_DE.md) ·
[Ein-Befehl-Download vorbereiten](docs/operations/ONE_COMMAND_INSTALLATION_DE.md) ·
[Ersteinrichtung und offene Abnahme](docs/operations/FIRST_START_INSTALLATION_DE.md) ·
[Sicherheitsgrenzen](docs/security/FIRST_START_DE.md) ·
[Aktuelle Test- und Buildnachweise](reports/integration/installable-test3-r4-20261003/).

**Der signierte ARM64-Testkandidat `0.2.0-test.3`, Revision 4, ist veröffentlicht.**
Installationsbefehl, SBOM und konkrete Nachweise stehen oben. Revision 3 bleibt
historisch erhalten. UUID-Anzeige, Frontend-Passwortvergabe und
Home-/Pro-Lizenzgrenzen sind umgesetzt.

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
[aktuellen Nachweis](reports/integration/installable-test3-20261003/) separat belegt.

Die ioBroker-Basis und die Herkunft aller übernommenen Komponenten bleiben
nachvollziehbar. Der [historische Upstream-README](docs/history/UPSTREAM_README.md)
enthält die bisherigen technischen Erläuterungen und Urheberrechtshinweise.
Maßgeblich sind zusätzlich die jeweiligen Lizenzdateien der Komponenten und
Abhängigkeiten. Markenwechsel ändert deren Lizenzen nicht. Das Paketmanifest im
Repositoryroot gehört weiterhin zum übernommenen Installer; es allein beschreibt
weder den vollständigen EOS-Produktumfang noch eine Veröffentlichung des Gesamtsystems.
