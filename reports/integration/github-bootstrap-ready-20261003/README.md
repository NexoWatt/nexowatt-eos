# Startbereiter privater GitHub-Testinstaller – 3. Oktober 2026

Die Meldung `BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING` stammt aus dem
alten, absichtlich gesperrten Manifest. Die neue Lieferung
[`delivery/bootstrap-test3-r2`](../../../delivery/bootstrap-test3-r2/README.md)
enthält den richtigen öffentlichen Trust und ein geprüftes `ready:true`-
Manifest. Der vollständige neue Befehl steht oben in der
[Haupt-README](../../../README.md). Der alte gepinnte Befehl ändert sich durch
einen Repository-Upload nicht; er muss vollständig ersetzt werden.

## Aufgelöste Schlüsselzuordnung

Der vorhandene lokale EOS Keygen 1.0.1 wurde über seinen normalen Befehl
`node cli.js trust <neue öffentliche Exportdatei im Workspace>` aufgerufen.
Die Existenz seines Standard-Herausgebers wurde vorher geprüft. Dieser Weg
liest den vorhandenen verschlüsselten Datensatz durch die Anwendung, gibt
aber ausschließlich den öffentlichen Trust aus. Er entschlüsselt keinen
privaten Schlüssel, fordert keine Passphrase an und erzeugt keine Lizenz.

Der frische Export stimmt **bytegenau** mit der vorhandenen Download-Datei
und dem öffentlichen Trust im neuen Paket überein: 140 Bytes,
`kid=nexowattEOS`, SHA-256
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Der Ed25519-SPKI-DER-Fingerprint ist
`144e9b8328f4ad52a66617347efaae14c28ffc40011f56a7cc9a7377ec00a411`.
[Provenienz, Programmquellen-Hashes und tatsächlicher Export-Exitcode](license-trust-provenance.json).

Die frühere Rückfrage ist durch diesen direkten Abgleich mit dem bestehenden
lokalen Generator aufgelöst; es wird keine zusätzliche Nutzerbestätigung
behauptet. Das belegt die öffentliche Schlüsselzuordnung, noch keine tatsächliche
Lizenzausstellung, Entsperrung des Generators oder Lizenzannahme auf dem Pi.

## Tatsächlich geprüfte neue Lieferung

Der Herstellerbuilder hat das vollständige bestehende signierte r2-Archiv,
Sequenz 5, gegen den festgelegten Releaseschlüssel geprüft und das echte
Installations-ZIP mit dem obigen öffentlichen Trust erzeugt. Runtime und
historische Lieferungen bleiben unverändert; kein Ersatz-Lizenzschlüssel.

Der unabhängige [Artefaktprüfer](artifact-verification.json) bestätigt:

- Alle drei tatsächlichen Assets entsprechen Git-Blob-ID, SHA-256 und Bytezahl.
- Alle 96 ZIP-Dateien wurden vollständig gelesen und mit den Quellen verglichen;
  83 davon stimmen zusätzlich mit dem signierten Runtime-Manifest überein.
- Die echte Ed25519-Schlüsselkennung und der DER-Fingerprint passen. Die
  Bootstrap-Konfiguration bindet genau diesen Trust und den r2-Releaseschlüssel.
- Loader und Hosthelfer entsprechen den geprüften Quellbytes. Das neue Manifest
  wird vom unveränderten Loader akzeptiert. Signatur-, Host- und Lizenzprüfungen
  werden weiterhin verlangt.
- Der neue Installationsblock entspricht dem Hersteller-Renderer exakt und
  besteht die tatsächliche Bash-Syntaxprüfung für äußeren und inneren Befehl.
  Tokenabfrage einmal verdeckt; keine TLS-/Lizenz-/Signatur-Ausnahmeschalter.

Die [67 bisherigen Regressionstests](../github-bootstrap-20261003/README.md)
werden mit überprüften unveränderten Quell- und Protokollhashes als vorhandene
Nachweise referenziert. Sie wurden nicht als neuer Pi-Lauf umgedeutet.
Der [aktuelle Gesamtprüfstand](verification-summary.json) bindet diese Belege
an die neue Lieferung und dokumentiert die tatsächliche GitHub-Rückleseprüfung.

Nach dem Upload wurden **alle acht geprüften Dateien** aus dem privaten GitHub-
Repository bytegenau zurückgelesen: Loader, neues Manifest, Hosthelfer, Installer-
ZIP, öffentlicher Trust, Installationsblock sowie Node- und EOS-Archiv. Größen,
Git-Blob-IDs und SHA-256 stimmen vollständig. [Tatsächlicher Readback](private-github-readback.json).
Die Anmeldung blieb im Prozessspeicher. Dieser Herstellerlauf verwendet die
Windows-Zertifikatsbasis und ersetzt keinen Debian-/Pi-Test.

## Noch offen

**Nicht ausgeführt, OFFEN:** vollständige Pi-Installation, native Systemd-,
PostgreSQL-, Rechte- und TLS-Abnahme, APT-Lauf, Browser-Zertifikatsimport,
Frontend-Erststart mit echter Gerätelizenz, Reboot, Wiederherstellung und alle
Geräte-/Hardwaretests. Die vom Nutzer gemeldete Sperrmeldung ist lediglich ein
Download-/Abbruchbeleg. Keine Produktionsfreigabe; Anlagensteuerung bleibt
gesperrt. Ein Flotten-Updater ist weiterhin nicht implementiert.
