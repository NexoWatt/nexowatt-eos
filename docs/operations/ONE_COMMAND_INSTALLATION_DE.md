# EOS aus dem privaten GitHub-Repository installieren

Stand: 3. Oktober 2026. Der Einstieg lädt das vollständige signierte ARM64-
Testpaket direkt aus **[NexoWatt/nexowatt-eos](https://github.com/NexoWatt/nexowatt-eos)**.
Ein Installationsblock in einer Root-Terminalsitzung genügt; der GitHub-Token
wird einmal verdeckt abgefragt. Git muss auf dem Pi nicht installiert sein.
Eigenes Webhosting, npm-Zugang und manuell erstellte Setup-Dateien entfallen.

**Aktueller Status:** Der öffentliche NWL2-Prüfschlüssel mit der Schlüsselkennung
`nexowattEOS` wurde über den normalen öffentlichen Trustexport des vorhandenen
lokalen Lizenzgenerators zugeordnet und in
[`delivery/bootstrap-test3-r3`](../../delivery/bootstrap-test3-r3/)
eingebunden. Das neue Manifest ist für den Installationsversuch freigeschaltet
(`ready: true`). Auf dem Pi ist keine manuelle Schlüsseldatei mehr erforderlich.
Die vollständige Pi-Installation, systemd-/PostgreSQL-/TLS-Abnahme, der
Browser-Gesamtlauf, eine reale Lizenzaktivierung, Reboot und sämtliche
Hardwaretests sind weiterhin **OFFEN, nicht ausgeführt**.

Die aktuelle Lieferung verwendet **test.3 Revision 3, signierte Sequenz 6**.
Sie korrigiert die Sudo-Prüfung neu angelegter Dienstkonten. Eine erfolgreiche
Root-Abfrage mit der vollständigen Meldung, dass genau das Dienstkonto kein
Sudo ausführen darf, wird jetzt richtig ausgewertet. Tatsächlich erlaubte
Sudo-Kommandos, fehlgeschlagene Abfragen und zusätzliche Ausgaben werden
weiterhin abgelehnt.

**Nach `PG_SUDO_POLICY_REJECTED` auf dem bereits verwendeten Pi zuerst den
Teillauf prüfen.** `eos-runtime` und Dateien unter `/opt/nexowatt/eos` können
schon vorhanden sein. Den neuen Block auf diesem Gerät nicht einfach erneut
ausführen: Er bleibt ein Neuinstallationsverfahren und überschreibt diesen
Zustand nicht. Fehlernachweise erhalten; Dienstkonten, Verzeichnisse und
Dienststatus zunächst nur lesen. Danach eine Wiederherstellung passend zum
tatsächlichen Zustand festlegen. Konten oder Bestandsdaten nicht pauschal
löschen und keine zusätzlichen Sudoers-Regeln vergeben.

Bei `BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING` wurde der frühere, fest
gebundene Installationsblock ausgeführt. Dieser bleibt unverändert gesperrt und
beendet sich vor der Paketinstallation. Den **gesamten Block** erneut aus der
[aktuellen README auf main](https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md)
kopieren und in der SSH-Root-Sitzung ausführen. Einzelne Hashes oder Dateien auf
dem Pi müssen dafür nicht geändert werden.

Die aktuelle Bootstrap-Lieferung berücksichtigt außerdem die `.pgp`-Keyring-
Dateien der offiziellen Raspberry-Pi-OS-ARM64-Paketquellen. Die frühere
Vorprüfung akzeptierte hier nur `.gpg` und `.asc`. Diese Kompatibilitätslücke
ist korrigiert. Im inzwischen vorliegenden Pi-Protokoll passieren die
Quellenprüfung und APT-Aufrufe; der spätere Abbruch betrifft die Sudo-Prüfung.
Das Protokoll belegt keine vollständige Installation. Auch für diese
Korrektur den **gesamten aktuellen README-Block** kopieren: Ein bereits
gespeicherter Befehl lädt wegen seiner festen Hashbindung weiterhin die alte
Bootstrap-Version.

## So läuft der Teststart ab

1. Einen frischen, isolierten Debian-13-/Raspberry-Pi-OS-13-Testdatenträger mit
   ARM64 verwenden und per PuTTY/SSH oder lokal eine Root-Terminalsitzung öffnen
   (gegebenenfalls zunächst `sudo -i`). Das Basisabbild benötigt `bash`, `curl`,
   `python3`, laufendes systemd, eine korrekte Uhr und mindestens 6 GiB freien Platz.
2. Einen gültigen GitHub-PAT mit Zugriff auf genau `NexoWatt/nexowatt-eos`
   bereithalten. Bei einem fein abgestuften Token: Ressourceninhaber `NexoWatt`,
   nur dieses Repository und **Contents: Read-only** auswählen. Je nach
   Organisationsrichtlinie muss der Token zuerst freigegeben sein.
3. Den vollständigen aktuellen Installationsblock aus der **[README auf main](https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md)**
   kopieren und einmal in die Root-Sitzung einfügen. Den Token erst bei der
   verdeckten Abfrage eingeben; keine Tokenwerte in den Befehl einsetzen.
4. Die automatische Vorbereitung und Installation abwarten. Nach erfolgreichem
   Start werden die konkrete HTTPS-Browseradresse, der öffentliche CA-Pfad und
   der CA-Fingerabdruck angezeigt. Der kurzlebige Einrichtungscode erscheint
   ausschließlich direkt im Terminal.

Der GitHub-PAT dient nur zum Lesen der privaten Installationsdateien. Er wird
nicht in URLs, Kommandoargumenten, Umgebungsvariablen oder Dateien gespeichert
und nicht an APT oder die EOS-Laufzeit weitergegeben. Benutzerpasswörter werden
erst im HTTPS-Assistenten vergeben. GitHub dokumentiert die benötigte
[Contents-Leseberechtigung](https://docs.github.com/en/rest/git/blobs#get-a-blob)
und die mögliche [Organisationsfreigabe für PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

Bereits korrekt vorbereitete Node-/PostgreSQL-Pakete können auf einem weiterhin
frischen Host vorhanden sein. Erforderlich sind Node **24.21.0** und PostgreSQL
**17.11 oder neuer innerhalb 17**. Vorhandene EOS-Daten, PostgreSQL-Cluster oder
unpassende Node-Installationen werden nicht überschrieben. Fehlende Voraussetzungen
richtet der Installer selbst ein; vorhandene Cluster müssen nicht und dürfen
für diesen Ablauf nicht automatisch gelöscht werden.

## Was automatisch geprüft und eingerichtet wird

Der kopierte Befehl bindet den Startloader an eine feste Git-Blob-ID und einen
SHA-256. Erst nach vollständigem Download und SHA-256-Prüfung wird er ausgeführt.
Der Loader prüft anschließend Manifest, Vorbereitungscode und Installationsdateien
gegen ihre Größen, Git-Blob-SHA-1 und zusätzlich SHA-256, bevor die betreffenden
Programme geladen oder Archive entpackt werden. Es wird kein wechselnder
Branchinhalt als Installationsprogramm ausgeführt. Die HTTPS-Verbindungen gehen
ausschließlich an die festgelegte GitHub-API; Weiterleitungen werden abgelehnt.

GitHub liefert die Dateien über seine Raw-Blob-API, die Blobs bis **100 MB**
unterstützt. Der Builder und die Paketprüfung prüfen die Größen aller drei
Archive gegen diese Transportgrenze. Die konkreten Größen und Hashes stehen
im gebundenen `github-manifest.json` der aktuellen Lieferung.
[GitHub-Primärdokumentation](https://docs.github.com/en/rest/git/blobs#get-a-blob).

Nach erfolgreicher Downloadprüfung folgen die bestehenden Installationsschritte:

- Voraussetzungen aus den geprüften vorhandenen Debian-/Raspberry-Pi-OS-
  Paketquellen installieren. Vor PostgreSQL 17 wird `postgresql-common`
  eingerichtet und `create_main_cluster=false` gesetzt, damit kein zusätzlicher
  Distributionscluster entsteht. Node wird bei Bedarf aus dem fest gepinnten
  offiziellen Archiv installiert.
- Die lokale IPv4-Adresse ermitteln. Die tatsächlich zum Gerät gehörende
  Zieladresse der SSH-Verbindung hat Vorrang. Bei mehreren sonst gleichwertigen
  Adressen bricht der Einstieg mit einem Hinweis ab.
- Hostliste und öffentliche Setup-Eingaben geschützt anlegen. Der vorhandene
  Installer prüft weiterhin Release-Signatur, alle Paketbytes, Produktumfang,
  SBOM, Rechte, den nativen Ladeversuch und die tatsächlichen PostgreSQL-/TLS-
  Grenzen. Der native Ladeversuch öffnet keine Geräte.
- PostgreSQL und den geschützten Erststart-Assistenten starten. Bei Fehlern
  bleiben die privaten Download-/Prüfbelege erhalten. Eine teilweise begonnene
  EOS-Installation wird nicht automatisch überschrieben oder wiederholt.

Die Prüfung der Paketquellen erlaubt einzelne Keyring-Dateien unter
`/usr/share/keyrings/` mit `.gpg`, `.asc` oder `.pgp`. Die offizielle
[Raspberry-Pi-OS-Quelle](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/raspi.sources)
verwendet ebenso wie die zugehörige
[Debian-Quelle](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/debian.sources)
die Endung `.pgp`. APT-Signaturprüfung, erlaubte Quellen und ARM64-Beschränkung
gelten unverändert. Zusätzliche Trust-Optionen werden nicht zugelassen.

Bei ungültigen Deb822-Optionen nennt der neue Bootstrap den betroffenen
Bereich, ohne den Inhalt der Quelldatei auszugeben:

| Fehler | Betroffener Bereich |
| --- | --- |
| `BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS` | Nicht erlaubtes zusätzliches Feld |
| `BOOTSTRAP_APT_SOURCE_OPTIONS_ENABLED` | Ungültiger Wert für `Enabled` |
| `BOOTSTRAP_APT_SOURCE_OPTIONS_ARCHITECTURES` | Andere Architektur als `arm64` |
| `BOOTSTRAP_APT_SOURCE_OPTIONS_SIGNED_BY` | Nicht erlaubter Keyring-Pfad oder Dateityp |
| `BOOTSTRAP_APT_SOURCE_OPTIONS_COMPONENTS` | Fehlende oder nicht erlaubte Komponenten |

Bei einem erneuten Abbruch den genauen Fehler und die betroffene öffentliche
Paketquellen-Konfiguration prüfen; keine Signatur- oder Quellenprüfung abschalten.
Die APT-Kompatibilitätskorrektur bleibt im Bootstrap enthalten. Die aktuelle
Runtime test.3 Revision 3, signierte Sequenz 6 enthält zusätzlich die
korrigierte Sudo-Prüfung der Dienstkonten.

## Browser: UUID, Lizenz und Passwort

Das öffentliche Geräte-CA-Zertifikat `/etc/nexowatt-eos/web/ca.crt` über den
vertrauenswürdigen lokalen Zugang übernehmen, seinen angezeigten Fingerabdruck
abgleichen und im verwendeten Browser beziehungsweise Zertifikatsspeicher
vertrauen. Danach die ausgegebene Adresse `https://PI-IP:8443` öffnen und den
lokalen Einrichtungscode eingeben. Private `.key`-Dateien bleiben auf dem Pi;
Zertifikatswarnungen werden nicht übergangen.

Die echte Geräte-UUID ist im Lizenzschritt sichtbar und kopierbar, **bevor**
eine Lizenz aktiviert oder das Benutzerpasswort gespeichert wird. Mit dieser
UUID die Lizenz im vorhandenen Hersteller-Generator ausstellen und im
Assistenten prüfen. Passwort, Standort, Anlagenwerte und Geräteplan werden
anschließend dort erfasst. Zurückgestellte Angaben bleiben ausdrücklich offen.

Home-/Pro-Modulrechte und Kontingente gelten weiterhin serverseitig; engere
signierte Grenzen gewinnen. Eine Lizenz hebt die noch offene technische
Anlagenabnahme und Steuerungssperre dieses Testprofils nicht auf. Nach dem
Abschluss sind Admin über HTTPS 8081 und UI über HTTPS 8188 erreichbar.
[Lizenzmatrix](../../components/ui/docs/security/EOS_LICENSE_ENTITLEMENTS_2026-10-03_DE.md)
und [vollständiger Erststartablauf](FIRST_START_INSTALLATION_DE.md).

## Einmalige Vorbereitung durch NexoWatt

Diese Schritte gehören auf das Hersteller-Buildsystem, nicht auf den Test-Pi.
Der öffentliche Trustexport wird zusammen mit dem kleinen Installerkit im
privaten Repository bereitgestellt. Er enthält ausschließlich die Zuordnung
`kid` zu öffentlichen Ed25519-SPKI-Schlüsseln; der private Herstellerschlüssel
und der Generator-Tresor werden weder veröffentlicht noch auf den Pi übertragen.
Der zugeordnete Export muss zum `kid` der später ausgestellten NWL2-Lizenzen
passen. Für diese Lieferung wurde mit `node cli.js trust <Ausgabedatei>` ein
neuer öffentlicher Export des vorhandenen lokalen Generators erstellt. Er ist
bytegleich mit dem zuvor vorliegenden Export aus dem Downloadordner: 140 Bytes,
SHA-256 `470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Der Vorgang exportiert ausschließlich öffentliche Prüfdaten; es wurden weder
ein privater Schlüssel exportiert noch eine neue Lizenz ausgestellt. Die
Zuordnung zum lokalen Generator ersetzt keine reale Lizenzprüfung auf dem Pi.
Bei einer späteren Lieferung den Lizenztrust-Hash und den Releaseschlüssel-Pin der
[Revision-3-Lieferung](../../delivery/test-pi-0.2.0-test.3-r3/README.md) über den
Hersteller-Übergabeweg bestätigen.

Herstellerbeispiel mit zu ersetzenden Platzhaltern:

```sh
node tools/bootstrap/build-github-download.cjs \
  --license-trust /ABSOLUTER/PFAD/license-trust.json \
  --license-trust-sha256 BESTAETIGTER_LIZENZTRUST_SHA256 \
  --release-public-key-sha256 BESTAETIGTER_RELEASEKEY_SHA256 \
  --output /ABSOLUTER/REPOSITORYPFAD/delivery/bootstrap-neue-lieferung
```

Die Ausgabe muss ein **neuer direkter Unterordner von `delivery/`** im
Arbeitsrepository sein; alle angegebenen Dateipfade sind absolut. Der Builder
prüft das bestehende signierte r3-Archiv erneut, bindet die übernommenen
Runtime-/Systemhelfer an die Quellen und prüft das erzeugte Installerkit durch
erneutes Lesen. Das Runtime-Archiv bleibt unverändert. Es wird kein Token in
die Ausgabe aufgenommen und nichts automatisch hochgeladen.

Der Ausgabeordner enthält `github-download.py`, `prepare-host.py`,
`github-manifest.json`, `installer-kit.zip`, die öffentliche Datei
`license-public-trust.json`, `preparation.json` und `INSTALL_COMMAND.txt`.
Das vorhandene r3-Archiv und das offizielle Node-Archiv bleiben an ihren
bereits versionierten Lieferpfaden. Die erzeugten Dateien müssen vollständig
im privaten Repository verfügbar sein, bevor der zugehörige Inhalt von
`INSTALL_COMMAND.txt` in die README übernommen und für den Teststart verwendet
wird. Der Nutzer kopiert diesen fertigen Block; er muss selbst keine Hashes
zusammenstellen oder Hosting einrichten.

Der Einstieg ist eine **Neuinstallation**, kein Flotten-Updater. Für spätere
Updates bleiben eine dauerhafte Herstellersignaturkette, Versions-/Rückrollschutz
und geprüfte Datenbank-/Wiederherstellungsabläufe erforderlich. `git pull` im
Laufzeitverzeichnis ist kein Updateverfahren. Vollständige Pi-Installation,
systemd, Browser-Gesamtlauf, Reboot, Recovery und Hardwareabnahme bleiben bis
zur tatsächlichen Ausführung **OFFEN**.

Prüfbelege: [Aktuelle Sudo-Prüfung und GitHub-Lieferung](../../reports/integration/github-bootstrap-sudo-20261003/README.md),
[vorherige APT-Kompatibilitätskorrektur](../../reports/integration/github-bootstrap-apt-20261003/),
[Herstellertrust und vorheriger GitHub-Einstieg](../../reports/integration/github-bootstrap-ready-20261003/README.md),
[Bootstrap-Prüfbericht](../../reports/integration/bootstrap-20261003/README.md)
und [signierte Revision 3](../../reports/integration/installable-test3-r3-20261003/README.md).
