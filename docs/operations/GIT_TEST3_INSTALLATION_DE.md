# EOS test.3 Revision 3 aus Git installieren

Stand: 03.10.2026. Für einen **frischen, isolierten Debian-13-/Raspberry-Pi-OS-13-Testhost mit ARM64**. Das Paket enthält Controller, Admin, UI, Devices, EEBUS, OCPP21, Backup und die PostgreSQL-Backends. Es ist ein Installationskandidat für eure Tests. Ein vollständiger Lauf auf dem Pi und sämtliche Hardwaretests sind **offen, nicht ausgeführt**.

Der feste Einstieg verwendet jetzt `delivery/test-pi-0.2.0-test.3-r3/`,
Lieferrevision 3 mit signierter Sequenz 6. Die Runtime-Version bleibt
`0.2.0-test.3`. Diese Revision korrigiert die Sudo-Prüfung für neu angelegte
Dienstkonten: Der Installer verlangt eine erfolgreiche Root-Abfrage mit der
vollständigen C-Locale-Meldung, dass genau dieses Konto kein Sudo ausführen
darf. Die bisherige Prüfung konnte eine solche erfolgreiche Abfrage ablehnen.
Erlaubte Sudo-Kommandos, Fehler oder zusätzliche Ausgaben führen weiterhin zum
Abbruch. Die systemd- und APT-Kompatibilitätskorrekturen bleiben enthalten.
Ältere signierte Archive und ihre Nachweise bleiben unverändert erhalten.

**Nach einem bereits gemeldeten `PG_SUDO_POLICY_REJECTED` nicht einfach erneut
installieren:** Das Dienstkonto `eos-runtime` und Dateien unter
`/opt/nexowatt/eos` können schon angelegt sein. Dieser Host gilt dann nicht mehr
als frisch. Zuerst Dienstkonten, Installationspfade und Fehlernachweise prüfen
und daraus die Wiederherstellung festlegen. Keine Konten oder Bestandsdaten
pauschal löschen und keine Sudoers-Regeln ergänzen. Der neue Installationsblock
ist kein Reparatur- oder Fortsetzungsbefehl.

Für den inzwischen diagnostizierten R2-Abbruch steht ein
[separater geprüfter Wiederanlauf-Befehl](SUDO_ABORT_RECOVERY_DE.md) bereit.
Er erhält die alte Bereitstellung und ihre numerischen Dienstidentitäten,
bevor er Revision 3 startet.

## 1. Voraussetzungen und Repository

Die bereits korrekt vorbereitete Node-/PostgreSQL-Umgebung kann weiterverwendet werden, sofern darauf noch keine EOS-Installation begonnen wurde. Vorausgesetzt werden `/usr/bin/node` **24.21.0**, PostgreSQL **17.11 oder neuer innerhalb 17**, systemd 257+, Python 3, OpenSSL, die Debian-Updatewerkzeuge und mindestens 6 GiB freier Speicher. Der Installer prüft die tatsächlichen Voraussetzungen. Er ersetzt weder vorhandene EOS-Daten noch PostgreSQL-Cluster und lädt keine npm-Pakete nach.

Für einen noch unvorbereiteten Datenträger gelten ausschließlich die Abschnitte **2 und 3** der [Betriebssystem- und Node-Vorbereitung](POSTGRESQL_TEST_INSTALLATION_DE.md#2-paket-übernehmen-und-betriebssystem-vorbereiten). Die dortigen alten test.2-Installations- und Passwortbefehle nicht für test.3 verwenden. Git muss ebenfalls aus der offiziellen Distribution installiert sein.

Dabei die alten ZIP-/Arbeitsverzeichnisse durch den aktuellen Checkout
`/root/Nexowatt-EOS-test3` ersetzen. Aus dem früheren Lieferordner wird nur das
dort dokumentierte, hashgeprüfte offizielle Node-Archiv wiederverwendet.

In einer lokalen Administratorsitzung (`sudo -i`) klonen. Den ausgegebenen
Commit über den vereinbarten Übergabeweg authentisieren, **bevor** Programme
aus dem Checkout als root ausgeführt werden:

```sh
git clone --single-branch --branch main \
  https://github.com/NexoWatt/nexowatt-eos.git /root/Nexowatt-EOS-test3
cd /root/Nexowatt-EOS-test3
git rev-parse HEAD
```

Erst nach diesem Abgleich die Vorprüfung starten:

```sh
cd /root/Nexowatt-EOS-test3
/usr/bin/node tools/system/install-from-checkout.cjs preflight
```

Repositoryzugriff erfolgt mit eurem vorhandenen berechtigten Git-Zugang. Der Checkout und seine Eltern müssen root gehören und dürfen nicht durch andere Benutzer beschreibbar sein. Den Commit über den vereinbarten Übergabeweg authentisieren, bevor Programme daraus als root ausgeführt werden. Bei `ready: false` die gemeldete Ursache beheben; keine Prüfungen abschalten und keine Bestandsdaten löschen.

## 2. Öffentliche Eingaben bereitstellen

Unter `/root/eos-input-test3/` werden nur diese öffentlichen Eingaben benötigt:

- `hosts.json`: JSON-Array der tatsächlich verwendeten DNS-Namen/IP-Adressen, beispielsweise `["eos-pi.local"]`.
- `license-public-trust.json`: authentischer öffentlicher Trust-Export aus eurer NWL2-Lizenzverwaltung. Der private Herstellerschlüssel bleibt bei der Lizenzverwaltung.
- Der unabhängig bestätigte SHA-256 dieses Trust-Exports.

```sh
install -d -m 0700 /root/eos-input-test3
```

Hostliste dort anlegen und den vorhandenen öffentlichen Trust-Export über euren vertrauenswürdigen Übergabeweg bereitstellen. Die Dateien müssen root gehören, reguläre Dateien sein und dürfen keine Symlinks sein. Der Name in `--origin` muss in `hosts.json` stehen. Keine Benutzerpasswörter in Dateien oder Kommandoargumenten vorbereiten.

Der Trust-Export ist ein direktes JSON-Objekt, das Schlüsselkennungen auf
Ed25519-SPKI-Publickeys abbildet: `{"euer-key-id":"-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----\n"}`.
Das Beispiel beschreibt nur die Form. Den tatsächlichen Export übernehmen;
die Kennung muss zum `kid` der erzeugten NWL2-Lizenz passen. Zulässig sind
1 bis 32 öffentliche Schlüssel, kein Array, zusätzlicher Wrapper oder Zertifikat.

Den öffentlichen **Release**-Schlüssel zusätzlich anhand des getrennt bestätigten Fingerabdrucks abgleichen. Der Fingerabdruck dieses Kandidaten steht in [der Lieferung Revision 3](../../delivery/test-pi-0.2.0-test.3-r3/README.md). Ein Schlüssel und Hash aus derselben unbestätigten Quelle beweisen keine Herstellerherkunft. Der neue Testsignierer hat einen anderen öffentlichen Schlüssel; keinen Fingerabdruck einer älteren Lieferung verwenden.

## 3. Prüfen und installieren

Die Platzhalter durch die bestätigten öffentlichen Hashes und euren tatsächlichen Hostnamen ersetzen:

```sh
cd /root/Nexowatt-EOS-test3
/usr/bin/node tools/system/install-from-checkout.cjs install \
  --release-public-key-sha256 BESTAETIGTER_RELEASE_KEY_SHA256 \
  --origin https://eos-pi.local:8443 \
  --hosts-file /root/eos-input-test3/hosts.json \
  --license-trust /root/eos-input-test3/license-public-trust.json \
  --license-trust-sha256 BESTAETIGTER_LIZENZ_TRUST_SHA256
```

Der Einstieg prüft Host und Archivehash, entpackt begrenzt als Daten in ein neues rootgeschütztes Verzeichnis, prüft Signatur, alle Paketbytes, SBOM und Produktumfang und führt auf dem Pi den gebundenen nativen Ladeversuch aus. Dieser öffnet keine Geräte. Erst danach beginnt die Systeminstallation. Der echte Ziel-Ladenachweis wird unter `/opt/nexowatt/eos/verified/<releaseId>/native-acceptance.json` festgehalten. Ein erfolgreicher statischer Build ersetzt ihn nicht.

Nach erfolgreicher Installation laufen PostgreSQL und der geschützte HTTPS-Assistent. Benutzerpasswörter werden ausschließlich im Browser vergeben. Der Installer meldet Status und Pfade, keine geheimen Werte. Bei Fehlern Ausgabe und Dienststatus für die Diagnose erhalten; Einrichtungscodes, Tokens, Schlüssel und Passwortdaten nicht in Berichte kopieren. Teilweise Installationen werden nicht blind wiederholt oder automatisch überschrieben.

## 4. Ersteinrichtung und Lizenz

Über den vertrauenswürdigen lokalen Zugang das Geräte-CA-Zertifikat `/etc/nexowatt-eos/web/ca.crt` samt Fingerabdruck abgleichen und im verwalteten Browser vertrauen. Dann `https://eos-pi.local:8443` öffnen. Den lokalen Einrichtungscode aus `/etc/nexowatt-eos/setup-code.txt` nur am Gerät anzeigen und im Formular eingeben.

**Die vollständige Geräte-UUID erscheint im Lizenzschritt und lässt sich kopieren, bevor ein Passwort gespeichert oder eine Lizenz aktiviert wurde.** Mit dieser UUID die Lizenz in eurem vorhandenen Lizenzgenerator erzeugen und anschließend im Assistenten prüfen. Passwort, Standort, Anlagenwerte und Geräteplan dort erfassen. Ausdrücklich zurückgestellte Angaben bleiben offen.

Die signierte Lizenz gibt die bestehende UI-Matrix frei: Home mit höchstens 3 Ladepunkten, 2 Speichern und 50 kW Speicherleistung; Pro mit höchstens 10 Speichern, den Pro-Bereichen und ohne zusätzlichen Lizenz-Leistungsdeckel. Engere signierte Kontingente gelten immer. Die aktuelle UI bearbeitet höchstens 50 Ladepunkte, auch wenn eine Pro-Lizenz mehr zulässt. Fehlende, ungültige oder abgelaufene Rechte sperren die Funktionen. [Vollständige Matrix und Prüfgrenzen](../../components/ui/docs/security/EOS_LICENSE_ENTITLEMENTS_2026-10-03_DE.md).

Nach erfolgreichem Abschluss sind Admin auf HTTPS 8081 und UI auf HTTPS 8188 erreichbar. Die Lizenz hebt die ausstehende technische Anlagenabnahme und die Steuerungssperre dieses Testprofils nicht auf. Detaillierter Browserablauf, Codeerneuerung und Fehlerzustände: [Erststartanleitung](FIRST_START_INSTALLATION_DE.md).

## 5. Nachweise auf dem Pi

Auf dem Zielhost sind noch nachzuweisen: vollständige Installation, nativer Ladeversuch, PostgreSQL/mTLS/Rollen, korrekte Dienstkonten und Dateirechte, Browserdarstellung, UUID-Kopie, Passwort/Login, Home-/Pro-Grenzen, Lizenzablauf/-entfernung, Neustart, unterbrochener Abschluss, Wiederherstellung und sämtliche Geräte-/Hardwaretests. Ergebnisse mit Commit, Release-ID, Zeitpunkt, Testschritten und bereinigten Statusprotokollen dokumentieren. test.2-Paketprüfung und lokale Windows-Tests sind dafür kein Ersatz. **Keine Produktionsfreigabe.**

Nachweise: [Signierte Revision 3](../../reports/integration/installable-test3-r3-20261003/README.md)
und [Sudo-Prüfung und neuer GitHub-Einstieg](../../reports/integration/github-bootstrap-sudo-20261003/README.md).
