# Privater GitHub-Testinstaller mit Hersteller-Prüfschlüssel

Die neue Lieferung bindet den öffentlichen Trust aus dem vorhandenen lokalen
EOS Keygen 1.0.1 ein. Der normale `trust`-Export aus dessen bestehendem
Standard-Herausgeber stimmt bytegenau mit `Downloads/license-trust.json`
überein. Keine Entschlüsselung oder Ausgabe des privaten Signierschlüssels,
keine Passphrase und keine Lizenzerstellung waren dafür erforderlich.

- Öffentlicher Trust: `license-public-trust.json`, 140 Bytes, `kid=nexowattEOS`.
- Trust-SHA-256: `470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`.
- Ed25519-SPKI-DER-Fingerprint: `144e9b8328f4ad52a66617347efaae14c28ffc40011f56a7cc9a7377ec00a411`.
- Runtime unverändert: signierte test.3 Revision 2, Sequenz 5,
  Release-ID `f8791884897defb86c07bd58114ef3df4abf5c9bda053694e4406d6ac7e779ef`.
- Das Installer-ZIP enthält 96 Dateien, davon 83 an das signierte
  Runtime-Manifest gebunden. Node- und Runtime-Archive werden nicht dupliziert.

`INSTALL_COMMAND.txt` ist der vollständige, kopierbare SSH-Installationsblock.
Die [Haupt-README](../../README.md) enthält exakt denselben Befehl.
GitHub-Token werden einmal verdeckt abgefragt und weder gespeichert noch an
APT oder EOS weitergegeben. Die drei Assets, Helfer und das Manifest sind an
feste Git-Blob-IDs, SHA-256 und Größen gebunden. Der bestehende Installer prüft
weiterhin die Release-Signatur sowie Host-, TLS-, Lizenz- und Rechtebedingungen.

Der alte Einstieg unter `bootstrap-test3-r2-pending-trust` bleibt unverändert
gesperrt. Sein Fehler `BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING` wird durch
Verwendung des vollständigen **neuen** README-Befehls behoben.

`preparation.json` dokumentiert den Zeitpunkt vor Veröffentlichung und setzt
deshalb `published:false`. Die späteren tatsächlichen Upload-/Readbacknachweise
stehen im [Prüfbericht](../../reports/integration/github-bootstrap-ready-20261003/README.md).

Vollständige Pi-/Systemd-/PostgreSQL-/Browser-/Lizenz-/Hardwareabnahme **OFFEN**.
`ready:true` bezeichnet den vollständig vorbereiteten Einstieg, keine bereits
ausgeführte Zielinstallation oder Produktionsfreigabe. Anlagensteuerung bleibt
gesperrt; ein Flotten-Updater ist nicht Bestandteil dieser Lieferung.
