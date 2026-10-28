# Neue EOS-Testbasis auf einem frisch aufgesetzten Pi

Stand: 28.10.2026. Veröffentlicht ist die signierte Managed-Frischbasis **Sequenz 16,
Lieferrevision 13**, mit js-controller **7.2.5**, gebündeltem Node **24.22.1** und
den sechs EOS-Adaptern. Controller 8 bleibt ausgeschlossen.

Das tatsächlich vom Hersteller signierte Paket ist veröffentlicht und vollständig
öffentlich ohne Anmeldung zurückgelesen: Signatur, Hashes, Dateiinventar,
SBOM, qualifizierte Quellen, Installer und aktiver leerer Updatefeed sind geprüft.
Der vollständige Build und die nativen Tests stammen vom Quellcommit
`f2ea9a7ba67ef46a7de8a4f0ef05eaa672ca38f4`; die Prüfung führt kein ARM64-Programm
aus und ersetzt keine Pi-Abnahme.

**Auf dem frisch vorbereiteten Pi per PuTTY ausführen:**
[Den vollständigen gepinnten Installationsbefehl kopieren](../../delivery/managed16/INSTALL_COMMAND.txt).
Der Befehl lädt den Einstieg vom unveränderlichen Commit
`1707dfcb5a12c92ec472899ea1f554ed6850ec02`, prüft 49.985 Bytes und SHA-256
`cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f`
und führt ihn erst danach aus. Der Einstieg prüft alle drei festen Release-Assets.
Nicht in Windows-WSL oder auf dem alten EOS-Host ausführen.

[Veröffentlichung und vollständiger öffentlicher Downloadtest](../../reports/integration/managed16-publication-20261028/README_DE.md).
Die historische Sequenz 15 und ihr R8-Einstieg bleiben unverändert.

## Vorbereitung des Test-Pi

Die Neuinstallation setzt ein **frisches 64-Bit-Debian-13-/zugelassenes
Raspberry-Pi-OS-13-System mit systemd** voraus. Der vorhandene EOS-Bestand wird
vom Installer erkannt und abgewiesen, niemals automatisch gelöscht oder
übernommen. Dasselbe gilt für bestehende PostgreSQL-Cluster, EOS-Dienstkonten
und Reste früherer Managed-/Netzwerkinstallationen.

Das spätere Neuaufsetzen des Systemmediums ist ein eigener Vorgang. Vorher sind
der konkrete Test-Pi und sein tatsächliches Systemmedium eindeutig zuzuordnen
und benötigte Daten außerhalb dieses Mediums zu sichern. Dieser Stand enthält
keinen Lösch- oder Formatierungsbefehl und hat keinen Pi verändert. Ein leerer
EOS-Ordner allein ersetzt keinen frischen Host.

Für die gewünschte R8-Entfernung unter Beibehaltung von Debian wird eine
[separate lesende Bestandsaufnahme](R8_ENTFERNUNG_VORBEREITEN_DE.md) vorbereitet.
Sie entfernt keine Installation und umgeht keine dieser Voraussetzungen.

Die Basis muss `python3`, `curl`, funktionierendes DNS/HTTPS und eine lokale oder
SSH-Terminalsitzung mit TTY bereitstellen. Nach Prüfung des Frischzustands und
der zugelassenen signierten Distributionsquellen bereitet der Installer
PostgreSQL 17, die benötigten Systemwerkzeuge und den exakt hashgeprüften
ARM64-Node-24.22.1-Interpreter vor. `dnsmasq-base` liefert nur das Programm für
die eigene EOS-Netzwerkintegration; eine globale DHCP-Konfiguration wird damit
nicht als EOS-Netz eingerichtet.

## Fest gebundener Herstellerablauf

1. Die stabilisierten Quellen auf dem späteren Buildcommit vollständig prüfen.
   Der aktuelle native CI-Lauf muss die frisch aufgelöste, anschließend offline
   installierte Runtime **mit Sequenz 16** erzeugen, die tatsächliche SBOM
   binden und die sechs Prozesse, zentrale Lizenzantworten, Backup und Neustart
   prüfen. Buildwerkzeuge bleiben Node 24.22.1 mit benachbart installiertem npm
   11.19.0. Historische native Belege werden nicht auf diesen Build übertragen.
2. Genau diesen unsignierten Runtime-Transport samt nativen Belegen auf dem
   Herstellerrechner prüfen und mit `build-managed-test.cjs --sequence 16`
   lokal signieren. Der vollständige Aufruf benötigt zusätzlich die gebundenen
   Runtime-/Belegpfade, den geschützten privaten Schlüsselpfad, dessen bestätigten
   öffentlichen Hash und das offizielle gepinnte ARM64-Node-Archiv. Der neue
   `tools/bootstrap/sign-qualified-managed16-wsl.py` bindet die tatsächlich
   geprüften Commit-/Artefaktpins; sein separater Auslieferungscommit wird
   nicht als Runtime-Buildcommit verwendet. `sign-qualified-r8-wsl.py` bleibt ausschließlich für seine historische
   Sequenz-15-Qualifikation zuständig.
3. Der private Signierschlüssel und seine Passphrase bleiben auf dem vorhandenen
   WSL-Signierrechner. Sie werden weder hochgeladen noch auf den Pi kopiert.
   Öffentliche Releaseidentität und Prüfschlüssel werden danach unabhängig mit
   Signatur, vollständigem Archivinhalt, SBOM und Quellbindung zurückgeprüft.
4. `build-managed-download.cjs` erzeugt ausschließlich die feste Frischbasis 16.
   Benötigt werden `--base-url`, `--license-trust`,
   `--license-trust-sha256`, `--release-public-key-sha256`, `--output` und
   `--node-archive`. Der reale Releasepfad muss seine tatsächliche Release-ID
   enthalten. Der Generator verwendet `prepare-managed16-host.py` und den
   festen `first-start-managed.cjs`-Einstieg. Das historische
   `prepare-managed-host.py` bleibt für den R8-/Sequenz-15-Transport erhalten.
5. Große Dateien als neue Release-Assets veröffentlichen, die kleine
   `install.sh` an einem unveränderlichen Git-Commit bereitstellen und erst
   danach mit `--finalize-command` und `--entry-base-url` den genauen Befehl
   erzeugen. Vor Übergabe alle öffentlichen Bytes ohne Anmeldung vollständig
   gegen Hash, Signatur und Quelle zurücklesen. Lokale Finalisierung behauptet
   ausdrücklich noch keinen erfolgreichen öffentlichen Download.

Die vorhandene öffentliche Lizenztrustquelle ist
`delivery/bootstrap-test3-r4/license-public-trust.json`: 140 Bytes, Kennung
`nexowattEOS`, SHA-256
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Der [Herkunftsbeleg](../../reports/integration/github-bootstrap-ready-20261003/license-trust-provenance.json)
ordnet sie dem öffentlichen Export des damaligen vorhandenen Lizenzgenerators
zu. Der heutige Admin akzeptiert dieses öffentliche Schlüsselformat für NWL2
und NWL3; eine tatsächliche NWL3-Aktivierung mit dem vorgesehenen zentralen
Aussteller bleibt im neuen Erststart zu prüfen. Der alte Herkunftsbeleg
behauptet keine aktuelle Serveridentität oder tatsächlich absolvierte
Lizenzaktivierung. Ein privater Lizenzschlüssel wird dafür nicht benötigt.

## Erststart und folgende Updates

Auf dem frischen Pi wird ausschließlich der oben verlinkte gepinnte
Installationsbefehl verwendet. Die Einrichtung erfolgt über HTTPS; der
Einrichtungscode erscheint nur im kontrollierenden Terminal. Einrichtungscode
und Kennwörter nicht in öffentliche Logs oder Chats kopieren. Geräte-CA, Anmeldung,
Anlagenidentität und Lizenzaktivierung werden vor der Abnahme geprüft.

Nach Einrichtung übernimmt der bestehende signierte Updatekanal weitere
freigegebene EOS-Stände über den Admin-Updateknopf. Reine freigegebene Node-24-
Updates können im vorgesehenen Nachtfenster automatisch installiert werden;
Linux-Sicherheitsupdates laufen über den getrennten geschützten OS-Dienst.
Das erfordert weiterhin gültige vom Hersteller signierte Angebote. Ein leerer
Feed installiert kein Folgepaket, und ein Codecommit allein aktualisiert keinen
Pi. Die [Automatikgrenzen](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md) bleiben erhalten.

Offen bleiben die tatsächliche ARM64-Frischinstallation, APT-/systemd-/TLS-
Abnahme, Lizenzaktivierung, Reboot, Backup/Wiederherstellung, Updateknopf und
zwei aufeinanderfolgende Updates einschließlich Rückfall und Konkurrenz zur
OS-Wartung. Bis dahin besteht keine Pi-, Anlagen- oder Produktionsfreigabe.
