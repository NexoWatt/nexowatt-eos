# APT-Quellenkorrektur für den privaten SSH-Installer

Stand: 03.10.2026. Ausgangscommit auf `main`:
`d7aa023026708b0790495726ef5b0c8217b1cdb2`.
Aktueller Einstieg: [Haupt-README](../../../README.md), Paket
[`bootstrap-test3-r2-apt`](../../../delivery/bootstrap-test3-r2-apt/README.md).

Der Nutzer meldete `BOOTSTRAP_APT_SOURCE_OPTIONS`. Der bisherige Parser erlaubt
bei `Signed-By` nur `.gpg` und `.asc`. Die offiziellen ARM64-Vorlagen von
Raspberry Pi OS verwenden inzwischen `.pgp` direkt unter `/usr/share/keyrings/`.
Damit ist ein Installerfehler anhand echter Vorlagen reproduziert. Die genaue
APT-Konfiguration des Nutzer-Pi wurde noch nicht beobachtet; seine konkrete
Fehlerursache ist dadurch nicht abschließend bestätigt.

## Änderung und Primärbelege

Der Parser akzeptiert zusätzlich `.pgp` in Deb822- und klassischen APT-Quellen.
Pfadgrenzen, feste Origins/Suites, Architekturen, Komponenten und die
Signatur-/TLS-Prüfungen bleiben erhalten. Zusätzliche feste Deb822-Fehlercodes
unterscheiden unbekannte Felder, `Enabled`, `Architectures`, `Signed-By` und
Komponenten, ohne Konfigurationswerte oder Zugangsdaten auszugeben.

Die [reproduzierte Vorher-/Nachher-Prüfung](upstream-source-evidence.json) enthält
Originalbytes und Hashes der beiden offiziellen Vorlagen am pi-gen-Commit
`4d8ee447dd3d37e8b0ef8752e460d9082d9d435d`. Mit `RELEASE` durch `trixie` ersetzt
verweigert der alte Parser beide Vorlagen; der neue akzeptiert zwei Debian-
und einen Raspberry-Pi-Abschnitt. Das ist eine isolierte Parserprüfung,
kein APT-Aufruf. Primärquellen:
[Debian-Vorlage](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/debian.sources),
[Raspberry-Pi-Vorlage](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/raspi.sources),
[Debian-13-Release-Notes](https://www.debian.org/releases/trixie/release-notes/upgrading.html).

Die weiterhin verwendeten `.gpg`-Paketpfade in den nachgelagerten Hostprüfungen
bleiben mit den geschützten Kompatibilitäts-Symlinks der offiziellen Pakete
verwendbar. Der Primärbeleg dokumentiert dazu den tatsächlich gelesenen Inhalt
des offiziellen Raspberry-Pi-Keyring-DEB. Es wurde kein Paket installiert und
kein Keyring verändert.

## Tatsächlich ausgeführte Prüfungen

- **75/75 lokale Prüfungen bestanden:** 27 Node-Bootstrap-/Build-/Erststarttests,
  21 Python-Downloadtests und 27 Hostvorbereitungstests. Die acht neuen Tests
  umfassen gültige `.pgp`-Quellen und weiterhin abgelehnte Pfad-, Origin-,
  Architektur- sowie Trust-Umgehungen.
- [Befehle, Exitcodes und Quell-/Rohloghashes](verification-summary.json),
  [unveränderte Rohprotokolle](raw/). Wiederholbarer Recorder:
  `node tools/integration/record-github-apt-fix.cjs`; er verlangt einen noch
  nicht vorhandenen Rohlogordner und überschreibt keine Nachweise.
- Echter Herstellerbau mit dem bereits zugeordneten öffentlichen Lizenztrust
  und dem bestehenden signierten Runtime-Archiv: [Bauergebnis](../../../delivery/bootstrap-test3-r2-apt/preparation.json).
  Dabei werden Releasesignatur und Quellbindung geprüft.
- [Unabhängige Artefaktprüfung](artifact-verification.json): alle drei Asset-
  Identitäten, sämtliche 96 Installer-ZIP-Mitglieder, 83 Bindungen an das
  signierte Runtime-Manifest, öffentlicher Ed25519-Trust, exakter Befehlsrenderer
  und echte Bash-Syntaxprüfung. Die Releasesignatur wurde in diesem zusätzlichen
  Prüfer nicht erneut geprüft; das übernimmt der Herstellerbuilder.

Die Runtime bleibt `0.2.0-test.3`, Revision 2, Sequenz 5. Runtime-Archiv,
Installer-ZIP und Node-Archiv sind bytegleich zur bisherigen Lieferung.
Nur der Bootstrap bekommt einen neuen unveränderlichen Lieferordner und neue
Pins. Der Loader hat keinen logischen Diff; seine Auslieferungsbytes enthalten
die im Windows-Checkout vorhandenen CRLF-Zeilenenden. Die neue Blob-ID bindet
genau diese tatsächlich geprüften Bytes.

Beim Wechsel auf `main` hatte Git die Zeilenenden von 33 an das Runtime-Manifest
gebundenen Quelldateien im Arbeitsbaum umgesetzt. Für den erneuten Bau wurden
deren ursprüngliche Bytes aus dem hashgeprüften bisherigen Installer-ZIP
wiederhergestellt. Zuvor wurden ausschließlich Zeilenendenunterschiede und
Identität mit dem jeweiligen kanonischen `HEAD`-Git-Blob nachgewiesen.
[Datei- und Hashprotokoll](source-newline-alignment.json).
Diese Dateien enthalten keine neue Git-Inhaltsänderung; die Signatur- und
Quellbindung wurde nicht gelockert.

## Veröffentlichung auf main und tatsächlicher Download

Das Paket wurde mit Commit `1f7faccc6f27cc7ed8715e86b5b1920f157204da` direkt
auf `main` veröffentlicht. Anschließend wurden **alle acht Dateien** über
die authentifizierte private GitHub-Blob-API vollständig zurückgelesen:
Loader, Manifest, Hosthelfer, Installer-ZIP, öffentlicher Trust, SSH-Befehl,
Node- und EOS-Archiv. Bytezahlen, Git-Blob-IDs und SHA-256 stimmen mit den
geprüften Dateien überein.
[Downloadprotokoll](private-github-readback.json),
[Veröffentlichungsnachweis](publication.json) und
[README-/Quell-/Rohlogabgleich](documentation-verification.json).
Der vorhandene Git-Zugang wurde nur im Prozessspeicher verwendet, nicht
ausgegeben oder gespeichert. Der Herstellerlauf nutzt den Windows-
Zertifikatsspeicher; der native Debian-CA-Pfad wurde hier nicht ausgeführt.

## Noch offen

**Nicht ausgeführt, OFFEN:** vollständige Pi-Neuinstallation, echte APT-
Pakettransaktion, native Systemd-/PostgreSQL-/Rechte-/TLS-Abnahme,
Browser-Zertifikatsimport, Ersteinrichtung mit echter Gerätelizenz und
Passwortvergabe, Reboot, Wiederherstellung und Geräte-/Hardwaretests.
Die bisherige `test.2`-Paketprüfung ist kein Vollinstallationsnachweis.
Keine Produktionsfreigabe; Anlagensteuerung bleibt gesperrt. Der private
Download-Einstieg ist weiterhin kein Flotten-Updater.
