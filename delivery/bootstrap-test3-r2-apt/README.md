# Privater GitHub-Testinstaller: APT-Kompatibilitätskorrektur

Diese neue Bootstrap-Lieferung akzeptiert die `.pgp`-Keyring-Dateien der
offiziellen Raspberry-Pi-OS-ARM64-Paketquellen zusätzlich zu `.gpg` und `.asc`.
Weiterhin sind ausschließlich einzelne Keyring-Dateien unter
`/usr/share/keyrings/` zulässig. APT-Signaturen, Dateirechte, Quellen,
Distributionen und ARM64-Grenzen werden unverändert geprüft.

Die [offizielle pi-gen-Vorlage](https://raw.githubusercontent.com/RPi-Distro/pi-gen/4d8ee447dd3d37e8b0ef8752e460d9082d9d435d/stage0/00-configure-apt/files/raspi.sources)
belegt die Verwendung von `.pgp`. Die tatsächliche APT-Konfiguration des
gemeldeten Test-Pi ist noch unbekannt; dessen konkrete Fehlerursache wurde
damit nicht bestätigt. Ungültige Deb822-Optionen erzeugen nun die festen
Fehlercodes `BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS`,
`BOOTSTRAP_APT_SOURCE_OPTIONS_ENABLED`,
`BOOTSTRAP_APT_SOURCE_OPTIONS_ARCHITECTURES`,
`BOOTSTRAP_APT_SOURCE_OPTIONS_SIGNED_BY` oder
`BOOTSTRAP_APT_SOURCE_OPTIONS_COMPONENTS`.

`INSTALL_COMMAND.txt` enthält den neuen vollständigen SSH-Installationsblock.
Den **gesamten aktuellen Block** aus der
[README auf main](https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md)
kopieren. Alte Befehle bleiben an die alten Bootstrap-Dateien gebunden; ein
erneuter Aufruf eines alten Blocks übernimmt diese Korrektur nicht. Keine
Hashes oder heruntergeladenen Dateien von Hand ändern.

| Datei | SHA-256 |
| --- | --- |
| `github-manifest.json` | `1f2132c9e39b5604bd6368549d8cf1a22daa9016921ecb607a538f9937ce899e` |
| `github-download.py` | `44e007193e77315025e73227be1113166eae1d9901e9655eeacea7fa91a83e28` |
| `prepare-host.py` | `0c208b3025ee40e6131882c78b266e82d213033435d9d421dcbb58828e71ceaa` |
| `installer-kit.zip` | `85425ffb40574031b411621e8c9e7280344a66c358e64c015e218a485a4580ad` |

Das Installerkit enthält 96 Dateien, davon 83 an das signierte Runtime-Manifest
gebunden. Der öffentliche NWL2-Trust mit `kid=nexowattEOS` bleibt unverändert:
140 Bytes, SHA-256
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
Private Herstellerschlüssel werden nicht mitgeliefert.

Die Runtime bleibt **test.3 Revision 2, signierte Sequenz 5**, Release-ID
`f8791884897defb86c07bd58114ef3df4abf5c9bda053694e4406d6ac7e779ef`.
Ihr Archiv und das offizielle Node-Archiv werden unverändert über ihre
bisherigen Blob-IDs bezogen. Die bisherigen Lieferordner bleiben erhalten.

`preparation.json` hält den Zustand vor Veröffentlichung fest und enthält
deshalb `published:false`. Spätere Prüf- und Veröffentlichungsnachweise stehen
im [Prüfbericht](../../reports/integration/github-bootstrap-apt-20261003/).

**Vollständige Pi-Installation und Hardwaretests: OFFEN, nicht ausgeführt.**
`ready:true` erlaubt den Installationsversuch und bestätigt keine erfolgreiche
Zielinstallation oder Produktionsfreigabe. Reale PostgreSQL-/systemd-/TLS-,
Browser-, Lizenz-, Reboot- und Hardwareabnahme bleiben offen. Anlagensteuerung
bleibt gesperrt; ein Flotten-Updater ist nicht Bestandteil dieser Lieferung.
