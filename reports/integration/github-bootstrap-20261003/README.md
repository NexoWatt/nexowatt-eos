# Privater GitHub-Einstieg: Prüfstand 3. Oktober 2026

Der neue Downloadweg für `NexoWatt/nexowatt-eos` ist implementiert und lokal
geprüft. **67/67 fokussierte Tests bestanden:** 27 Node-/Hersteller-/Bash-Tests,
21 Python-Downloadtests und 19 Hostvorbereitungstests. Befehle, Exitcodes,
Rohprotokolle und Quellhashes stehen in [verification-summary.json](verification-summary.json).

Der echte Herstellerbuilder wurde mit einem ausschließlich öffentlichen,
isolierten Fixture-Schlüssel ausgeführt. Er prüfte das vorhandene signierte
test.3-r2-Archiv und erzeugte das Installations-ZIP. Alle **96 ZIP-Dateien**
wurden unabhängig zurückgelesen und mit den Quellen verglichen; **83 Dateien**
sind zusätzlich an das signierte Runtime-Manifest gebunden. Die drei tatsächlichen
Assets wurden auf Git-Blob-ID, SHA-256 und Größe geprüft. Alte Lieferungen blieben
unverändert. Dieser Testschlüssel wird **nicht** als Herstellertrust ausgeliefert.

Die Tests prüfen unter anderem abgeschnittene oder veränderte Downloads,
falsche Blobs, falsche Größen, Redirects, Authfehler, fremde Repositoryangaben,
manipulierte Helfer, fehlenden Lizenztrust, unveränderte Quelldateien und erneute
lokale Hashprüfung vor Hoständerungen. Ein echter Bash-Prozess prüft sowohl
Heredoc und inneren Befehl als auch die FD3-Übergabe bei ursprünglich exportiertem
Token und aktivem `allexport`. Der in der Review gefundene Exportattributfehler
ist behoben; die Regression ist im erfolgreichen Lauf enthalten.

Der [echte private Archiv-Readback](private-archive-readback.json) lädt das
Node-Archiv und das vollständige EOS-Archiv über die feste GitHub-Raw-Blob-API
und verifiziert alle Bytes. Die vorhandene Git-Anmeldung wurde nur im Speicher
verwendet; keine Zugangsdaten im Bericht. Der Herstellerlauf verwendet die
Windows-Zertifikatsbasis und lehnt fremde CA-Umgebungsvariablen vor dem
Credentialabruf ab. Dies prüft **nicht** den Debian-CA-Pfad oder Pi-Dateirechte.

## Noch fehlende Herstellerzuordnung

Der vorhandene Export `Downloads/license-trust.json` ist ein gültiges
Ed25519-SPKI-Trustobjekt mit `kid=nexowattEOS`. Datei-SHA-256:
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Öffentlicher DER-Fingerprint:
`144e9b8328f4ad52a66617347efaae14c28ffc40011f56a7cc9a7377ec00a411`.
Die Exportlogik des vorhandenen Keygen 1.0.1 ist kompatibel. Dies belegt noch
nicht, dass dieser Schlüssel für die vom Nutzer gewünschte Lizenzverwaltung
verwendet wird. Diese Zuordnung wurde angefragt und ist noch **offen**.

Deshalb ist die [vorbereitete Lieferung](../../../delivery/bootstrap-test3-r2-pending-trust/README.md)
absichtlich `ready:false`; der README-Befehl ist klar als noch gesperrt markiert
und beendet sich vor Paketinstallation. Es wird kein privater Tresor geöffnet,
kein Ersatzschlüssel erzeugt und kein ungeprüfter Schlüssel in ein aktives
Installationspaket übernommen. Nach Bestätigung entsteht eine neue gebundene
Lieferung mit echtem öffentlichen Trust; auf dem Pi bleibt nur die Tokenabfrage.

## Offene Zielabnahme

**Nicht ausgeführt, OFFEN:** kompletter Pi-Installationslauf, native Debian-
UID-/Systemd-/PostgreSQL-/TLS-Prüfungen, APT-Transaktionen, Browser-CA-Import,
Frontend-Erststart mit echter Lizenz, Reboot/Abbruch/Wiederherstellung und
sämtliche Geräte-/Hardwaretests. Keine Produktionsfreigabe; Anlagensteuerung
bleibt gesperrt. Der private Git-Download ist kein implementierter Flottenupdater.

Der Runtime-Stand bleibt [test.3 Revision 2](../installable-test3-r2-20261003/README.md).
Die historische test.2-Paketprüfung ist weiterhin kein Installationsnachweis.
