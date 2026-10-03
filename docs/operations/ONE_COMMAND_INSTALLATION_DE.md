# EOS aus dem privaten GitHub-Repository installieren

Stand: 3. Oktober 2026. Der Einstieg lädt das vollständige signierte ARM64-
Testpaket direkt aus **[NexoWatt/nexowatt-eos](https://github.com/NexoWatt/nexowatt-eos)**.
Ein Installationsblock in einer Root-Terminalsitzung genügt; der GitHub-Token
wird einmal verdeckt abgefragt. Git muss auf dem Pi nicht installiert sein.
Eigenes Webhosting, npm-Zugang und manuell erstellte Setup-Dateien entfallen.

**Aktueller Status:** Ein öffentlicher NWL2-Trustexport mit der Schlüsselkennung
`nexowattEOS` liegt vor und entspricht dem Format des vorhandenen Generators.
Seine Zuordnung zum gewünschten Herstellerschlüssel ist noch vom Nutzer zu
bestätigen. Eine gültige Schlüsselstruktur allein belegt diese Zuordnung nicht.
Der Einstieg wird deshalb noch nicht als abschließend startbereit ausgewiesen.
Die vollständige Pi-Installation, systemd-/PostgreSQL-Abnahme und sämtliche
Hardwaretests sind **OFFEN, nicht ausgeführt**.

## So läuft der Teststart ab

1. Einen frischen, isolierten Debian-13-/Raspberry-Pi-OS-13-Testdatenträger mit
   ARM64 verwenden und per PuTTY/SSH oder lokal eine Root-Terminalsitzung öffnen
   (gegebenenfalls zunächst `sudo -i`). Das Basisabbild benötigt `bash`, `curl`,
   `python3`, laufendes systemd, eine korrekte Uhr und mindestens 6 GiB freien Platz.
2. Einen gültigen GitHub-PAT mit Zugriff auf genau `NexoWatt/nexowatt-eos`
   bereithalten. Bei einem fein abgestuften Token: Ressourceninhaber `NexoWatt`,
   nur dieses Repository und **Contents: Read-only** auswählen. Je nach
   Organisationsrichtlinie muss der Token zuerst freigegeben sein.
3. Den vollständigen aktuellen Installationsblock aus der **[README](../../README.md)**
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
unterstützt. Das vorhandene EOS-Archiv mit 88.546.534 Bytes und das Node-Archiv
mit 30.843.004 Bytes liegen darunter. [GitHub-Primärdokumentation](https://docs.github.com/en/rest/git/blobs#get-a-blob).

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
Der bestätigte Export muss zum `kid` der später ausgestellten NWL2-Lizenzen
passen. Den Lizenztrust-Hash und den Releaseschlüssel-Pin der
[Revision-2-Lieferung](../../delivery/test-pi-0.2.0-test.3-r2/README.md) über den
Hersteller-Übergabeweg bestätigen.

Herstellerbeispiel mit zu ersetzenden Platzhaltern:

```sh
node tools/bootstrap/build-github-download.cjs \
  --license-trust /ABSOLUTER/PFAD/license-trust.json \
  --license-trust-sha256 BESTAETIGTER_LIZENZTRUST_SHA256 \
  --release-public-key-sha256 BESTAETIGTER_RELEASEKEY_SHA256 \
  --output /ABSOLUTER/REPOSITORYPFAD/delivery/bootstrap-test3-r2
```

Die Ausgabe muss ein **neuer direkter Unterordner von `delivery/`** im
Arbeitsrepository sein; alle angegebenen Dateipfade sind absolut. Der Builder
prüft das bestehende signierte r2-Archiv erneut, bindet die übernommenen
Runtime-/Systemhelfer an die Quellen und prüft das erzeugte Installerkit durch
erneutes Lesen. Das Runtime-Archiv bleibt unverändert. Es wird kein Token in
die Ausgabe aufgenommen und nichts automatisch hochgeladen.

Der Ausgabeordner enthält `github-download.py`, `prepare-host.py`,
`github-manifest.json`, `installer-kit.zip`, die öffentliche Datei
`license-public-trust.json`, `preparation.json` und `INSTALL_COMMAND.txt`.
Das vorhandene r2-Archiv und das offizielle Node-Archiv bleiben an ihren
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

Prüfbelege: [Bootstrap-Prüfbericht](../../reports/integration/bootstrap-20261003/README.md)
und [signierte Revision 2](../../reports/integration/installable-test3-r2-20261003/README.md).
