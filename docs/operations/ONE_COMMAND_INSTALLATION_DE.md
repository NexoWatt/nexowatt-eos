# Ein Befehl zur EOS-Testinstallation

Stand: 3. Oktober 2026. Ziel: Ein Installationsbefehl in einer Root-PuTTY-Sitzung,
danach HTTPS-Ersteinrichtung im Browser. Kunden benötigen weder GitHub-Zugang
noch npm-Zugang, manuell erstellte JSON-Dateien oder Benutzerpasswörter im Terminal.

**Noch kein veröffentlichter Download.** Die Herstelleradresse und der authentische
öffentliche NWL2-Lizenztrust fehlen in dieser Arbeitsumgebung. Es wird keine
funktionierende URL erfunden und kein Ersatz-Lizenzschlüssel ausgeliefert.
Die lokale Geräte-CA muss dem Browser weiterhin vertrauenswürdig bereitgestellt
werden. Eine öffentliche gerätespezifische Zertifikatsausstellung ist noch nicht
implementiert. Der gesamte Lauf auf einem Pi und Hardwaretests sind **OFFEN**.

## Was der neue Einstieg übernimmt

Der Hersteller erzeugt ein festes Downloadpaket mit `tools/bootstrap/build-download.cjs`.
Es enthält ausschließlich die ausgewählten Quellen, den öffentlichen Lizenztrust,
den gepinnten Releaseschlüssel, das vollständige signierte ARM64-Paket und das
offizielle, bereits geprüfte Node-Archiv. Der Browserassistent und seine Lizenz-,
UUID- und Passwortprüfung werden unverändert weiterverwendet.

`INSTALL_COMMAND.txt` enthält einen einzigen kopierbaren Befehl für eine
Root-Sitzung. Er lädt das vollständige Startskript und prüft dessen im Befehl
enthaltenen SHA-256, bevor Bash es ausführt. Der Kunde muss keine Prüfsummen
von Hand vergleichen. Dieser Befehl muss über einen authentischen Herstellerweg
bereitgestellt werden; ein Hash neben einem beliebig ersetzten Download ist
allein kein Herkunftsnachweis.

Der Installer führt anschließend diese Schritte aus:

1. Frischen Debian-13-/Raspberry-Pi-OS-13-ARM64-Host prüfen. Vorhandene EOS-Daten,
   fremde PostgreSQL-Cluster, nicht unterstützte Quellen oder unpassende Node-
   Installationen führen zum Abbruch. Es gibt keinen Force-Schalter.
2. Drei feste HTTPS-Downloads vollständig laden und gegen die eingebetteten
   Größen und Hashes prüfen. Keine Weiterleitung, keine TLS-Ausnahme, kein
   Git-Zugang und keine dynamische npm-Auflösung auf dem Pi.
3. Fehlende Voraussetzungen aus den zugelassenen vorhandenen Distributionsquellen
   installieren. `postgresql-common` kommt vor PostgreSQL 17. Die bisherige
   Clusterkonfiguration wird gesichert; `create_main_cluster=false` verhindert
   einen zusätzlichen Debian-Standardcluster. Bestehende Cluster werden nicht
   gelöscht. Node 24.21.0 wird bei Bedarf aus dem fest gepinnten Archiv installiert.
4. Die lokale IPv4-Adresse ermitteln. Die lokale Zieladresse einer gültigen
   SSH-Verbindung hat Vorrang; sie muss tatsächlich zum Gerät gehören. Bei
   mehreren sonst gleichwertigen Adressen wird nicht geraten.
5. Hostliste und öffentliche Setup-Eingaben automatisch geschützt erstellen.
   Der bisherige Installer prüft Archiv, Signatur, Paketumfang, SBOM, Rechte,
   native Bibliotheken und die tatsächlichen PostgreSQL-/TLS-Grenzen weiter.
6. Nach erfolgreichem Setupstart Browseradresse, öffentlichen CA-Pfad und
   Fingerabdruck ausgeben. Den kurzlebigen Einrichtungscode ausschließlich
   direkt am lokalen Terminal anzeigen, niemals in einer URL oder einem
   normalen Installationsprotokoll.

Das Basisabbild muss eine Root-Terminalsitzung, `bash`, `curl`, `python3`,
funktionierendes systemd, eine korrekte Uhr und mindestens 6 GiB freien Platz
bereitstellen. Node und PostgreSQL müssen nicht vorher manuell eingerichtet sein.
Ein Fehler erhält das private Download-/Prüfverzeichnis. Über einen begonnenen
EOS-Installationslauf wird nicht automatisch erneut installiert.

## Einmalige Vorbereitung durch NexoWatt

Diese Schritte erfolgen auf dem Hersteller-Buildsystem, nicht beim Kunden:

- Eine kontrollierte HTTPS-Adresse für einen unveränderlichen Test-Download
  bereitstellen. Private Git-Quellen bleiben privat; nur die dafür vorgesehenen
  Installationsdateien werden ausgeliefert.
- Aus dem bestehenden NWL2-Lizenzgenerator den **öffentlichen** Trust exportieren:
  direktes JSON-Objekt `{ "Schluesselkennung": "-----BEGIN PUBLIC KEY-----\n..." }`.
  Zulässig sind 1–32 Ed25519-SPKI-Schlüssel. Den Hash über den internen
  vertrauenswürdigen Freigabeweg bestätigen. Kein privater Lizenzschlüssel.
- Den Releaseschlüssel-Pin aus der [Revision-2-Lieferung](../../delivery/test-pi-0.2.0-test.3-r2/README.md)
  unabhängig bestätigen und den vollständigen Quellstand prüfen.

Beispiel eines **Herstellerbefehls mit zu ersetzenden Platzhaltern**, kein
Installationsbefehl für den Pi:

```sh
node tools/bootstrap/build-download.cjs \
  --base-url https://EURE-DOWNLOAD-DOMAIN/test/eos-test3-r2 \
  --license-trust /ABSOLUTER/PFAD/license-public-trust.json \
  --license-trust-sha256 BESTAETIGTER_LIZENZTRUST_SHA256 \
  --release-public-key-sha256 BESTAETIGTER_RELEASEKEY_SHA256 \
  --output /ABSOLUTER/NEUER/AUSGABEORDNER
```

Der Builder akzeptiert nur eine neue Ausgabe. Er prüft das signierte Archiv
vollständig erneut, bindet die enthaltenen Runtime-/Systemhelfer an die lokalen
Quellen und liest das erzeugte Installations-ZIP wieder zurück. Er lädt nichts
hoch. Die vier Dateien `install.sh`, `installer-kit.zip`,
`node-v24.21.0-linux-arm64.tar.xz` und `eos-0.2.0-test.3-linux-arm64.tar.gz`
müssen unter der angegebenen HTTPS-Basisadresse liegen. `build-record/` bleibt
beim Hersteller. Erst nach tatsächlichem Hosting- und Pi-Test den erzeugten
Kundenbefehl weitergeben.

Die Downloadprüfung nutzt die dokumentierten Größen-/Zeit-/Protokollgrenzen von
[curl](https://curl.se/docs/manpage.html). Die Clusteroption stammt aus der
[Debian-Dokumentation](https://manpages.debian.org/trixie/postgresql-common/pg_createcluster.1.en.html#DEFAULT_VALUES).

## Browser und laufende Systeme

Im Assistenten ist die echte Geräte-UUID nach Eingabe des Einrichtungscodes
vor der Lizenzaktivierung und Passwortvergabe sichtbar und kopierbar. Danach
wird die dafür erzeugte Lizenz geprüft. Home-/Pro-Bereiche und Kontingente
bleiben serverseitig begrenzt; die technische Anlagenfreigabe ist weiterhin offen.

Das aktuelle HTTPS-Profil erzeugt eine eigene Geräte-CA. Ein Installationsbefehl
auf dem Pi kann das Vertrauen des entfernten Browsers nicht automatisch ändern.
Für den vollständig unterbrechungsfreien Ablauf sind gerätespezifische öffentliche
Zertifikate, deren sichere Ausstellung und Erneuerung noch zu implementieren und
zu testen. Gemeinsame private Zertifikatsschlüssel oder das Übergehen einer
Browserwarnung sind kein Bestandteil des Ablaufs.

Der Einstieg ist eine **Neuinstallation**, kein Flotten-Updater. Revision 2
verwendet weiterhin einen kurzlebigen TEST-Signierer. Dauerhafte Releases und
spätere Updates benötigen eine getrennt eingerichtete Herstellersignaturkette,
autorisierte Geräte-Downloads, Versions-/Rückrollschutz und getestete
Datenbank-/Wiederherstellungsabläufe. `git pull` auf dem Laufzeitverzeichnis ist
kein Updateverfahren.

Prüfbelege: [Bootstrap-Prüfbericht](../../reports/integration/bootstrap-20261003/README.md)
und [neue signierte Lieferung](../../reports/integration/installable-test3-r2-20261003/README.md).
