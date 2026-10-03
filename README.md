<!-- EOS_PRIVATE_GITHUB_INSTALL_START -->
# EOS per SSH auf einem neuen Pi installieren

Verbindlicher Projektzweig für neue Arbeiten und Installationsanleitungen ist
[`main`](https://github.com/NexoWatt/nexowatt-eos/tree/main).

**Der Testinstaller enthält jetzt den öffentlichen Prüfschlüssel eurer vorhandenen
EOS-Lizenzverwaltung.** Auf dem Pi genügt die einmalige verdeckte Eingabe des
GitHub-Tokens. Git und eine manuelle Übertragung der Schlüsseldatei sind nicht nötig.

1. Per SSH am frischen Debian-13-/Raspberry-Pi-OS-13-Pi mit **ARM64** anmelden.
   Falls die Sitzung noch nicht als `root` läuft, zuerst `sudo -i` ausführen.
2. Den **gesamten folgenden Block** zusammen kopieren und in die SSH-Sitzung einfügen.
   Den GitHub-Token erst bei der verdeckten Abfrage eingeben und Enter drücken.
   Er benötigt Leserecht auf `NexoWatt/nexowatt-eos`.
3. Die automatische Installation abwarten und anschließend die im Terminal
   angezeigte HTTPS-Adresse für den Erststart verwenden.

Das Basisabbild benötigt `bash`, `curl`, `python3`, laufendes systemd, eine
korrekte Uhr und mindestens 6 GiB freien Platz. Node und PostgreSQL werden
bei Bedarf automatisch vorbereitet. Vorhandene EOS-Daten oder PostgreSQL-
Cluster werden nicht überschrieben.

**Bei `BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING`:** Du verwendest noch
den alten, fest gebundenen Befehl. Er bleibt gesperrt. Ersetze ihn vollständig
durch diesen aktuellen Block; ändere keine Hashes oder Manifestdateien von Hand.

**Korrektur für `BOOTSTRAP_APT_SOURCE_OPTIONS` (03.10.2026):** Der aktuelle
Installer akzeptiert auch die `.pgp`-Schlüsseldateien der offiziellen
Raspberry-Pi-OS-Paketquellen. Bei diesem Fehler den **gesamten neuen Block**
kopieren und erneut starten. Der alte Befehl lädt weiterhin den alten Installer.
Falls erneut ein APT-Fehler erscheint, den vollständigen Fehlercode zur Prüfung
weitergeben. Paketquellen und Signaturprüfungen müssen dafür nicht verändert werden.


**Nach `PG_SUDO_POLICY_REJECTED`:** Revision 3 korrigiert die Sudo-Abfrage
für neue Dienstkonten. Für den diagnostizierten Abbruch der Revision 2 gibt
es einen [eigenen Wiederanlauf-Befehl mit einmaliger Tokenabfrage](docs/operations/SUDO_ABORT_RECOVERY_DE.md).
Er prüft die alte Bereitstellung vollständig, erhält sie in Quarantäne und
startet anschließend Revision 3. Der folgende normale Installationsblock
bleibt für einen frischen Host.

```bash
/bin/bash <<'EOS_INSTALL'
# EOS_GITHUB_BOOTSTRAP_VERSION=2026-10-03
set +x
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 ]] || { echo 'EOS: Bitte zuerst sudo -i ausfuehren.' >&2; exit 1; }
[[ -x /usr/bin/curl && -x /usr/bin/python3 ]] || { echo 'EOS: curl und python3 werden im Basisabbild benoetigt.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
set +a
unset eos_token
read -r -s -p 'GitHub-Token: ' eos_token </dev/tty
printf '\n' >/dev/tty
[[ $eos_token =~ ^[A-Za-z0-9_]{20,512}$ ]] || { echo 'EOS: Tokenformat ungueltig.' >&2; exit 1; }
eos_stage=$(/usr/bin/mktemp -d /root/eos-download-XXXXXXXX)
printf 'header = "Authorization: Bearer %s"\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize 14631 --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/ea168948332e365f59c1798a79d8439863b8e098' -o "$eos_stage/github-download.py"
printf '%s  %s\n' '89194c388e023bad6dca7347a132d24f45927d3710a635cf7ba9e4ea491177c6' "$eos_stage/github-download.py" | /usr/bin/sha256sum --check --status
exec 3< <(printf '%s\n' "$eos_token")
unset eos_token
exec /usr/bin/env -i PATH="$PATH" LC_ALL=C SSH_CONNECTION="${SSH_CONNECTION-}" /usr/bin/python3 -I -B "$eos_stage/github-download.py" --manifest-blob 03a04702f31571814021f3de5ebd0586859c1404 --manifest-sha256 3fe525dbcca620709e7767e6d474842650b50406d3a0ae8ae2a4aedd82b7ad2b
EOS_INSTALL
```

Nach erfolgreichem Start zeigt das Terminal die konkrete Browseradresse,
den öffentlichen CA-Pfad mit Fingerabdruck und den kurzlebigen Einrichtungscode.
Die Geräte-CA über den vertrauenswürdigen Zugang übernehmen und im Browser
vertrauen. Dann den Assistenten öffnen und den Einrichtungscode eingeben.
Die **UUID ist vor Lizenzaktivierung und Passwortvergabe sichtbar und kopierbar**.
Die dafür erzeugte Lizenz im Assistenten eintragen; Benutzerpasswörter werden
ausschließlich im Frontend vergeben. Lizenzbereiche und Kontingente bleiben
serverseitig geprüft.

[Anleitung und Voraussetzungen](docs/operations/ONE_COMMAND_INSTALLATION_DE.md) ·
[Sicherheitsgrenzen](docs/security/PRIVATE_GITHUB_BOOTSTRAP_DE.md) ·
[Sudo-Korrektur und aktuelle Paketnachweise](reports/integration/github-bootstrap-sudo-20261003/README.md) ·
[Prüfschlüsselzuordnung](reports/integration/github-bootstrap-ready-20261003/README.md).

**Vollständige Pi-Installation und Hardwaretests: OFFEN, nicht ausgeführt.**
Dieser Einstieg ist für die Testumgebung; Anlagensteuerung bleibt gesperrt.
Er ist kein Flotten-Updater.

<!-- EOS_PRIVATE_GITHUB_INSTALL_END -->

---

# Aktueller Entwicklungsstand: EOS dev9 – geschützter Erststart

Der neue Installationspfad verlangt Controller und sämtliche sechs Produktadapter
als tatsächliche Laufzeitpakete. Die HTTPS-Ersteinrichtung verwendet einen
kurzlebigen lokalen Besitzcode; Benutzer vergeben ihre Passwörter im Frontend.
Der Assistent führt durch Standort, signierte Lizenz, Anlagenwerte und Geräteplan.
Nicht verfügbare Anlagenangaben bleiben ausdrücklich als offen markiert.
Installation, Einrichtung und Anlagenfreigabe bleiben getrennt.

[**Aus Git installieren und testen**](docs/operations/GIT_TEST3_INSTALLATION_DE.md) ·
[Ein-Befehl-Download vorbereiten](docs/operations/ONE_COMMAND_INSTALLATION_DE.md) ·
[Ersteinrichtung und offene Abnahme](docs/operations/FIRST_START_INSTALLATION_DE.md) ·
[Sicherheitsgrenzen](docs/security/FIRST_START_DE.md) ·
[Aktuelle Test- und Buildnachweise](reports/integration/installable-test3-r3-20261003/).

**Der signierte vollständige ARM64-Installationskandidat `0.2.0-test.3`, Revision 3, ist enthalten.**
[Lieferung und Fingerabdrücke](delivery/test-pi-0.2.0-test.3-r3/README.md). UUID-Anzeige,
Frontend-Passwortvergabe und Home-/Pro-Lizenzgrenzen sind umgesetzt.

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
