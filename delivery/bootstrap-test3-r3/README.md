# Privater GitHub-Installer für test.3 Revision 3

Dieser Bootstrap bindet die neue signierte Revision 3 mit Sequenz 6 und der
korrigierten Sudo-Rechteprüfung. Die vorherige APT-.pgp-Korrektur bleibt enthalten.
Der vollständige neue SSH-Befehl steht in `INSTALL_COMMAND.txt` und der
[README auf main](https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md).
Alte fest gepinnte Befehle laden weiterhin ihre bisherige Lieferung.

| Datei | SHA-256 |
| --- | --- |
| github-manifest.json | `3fe525dbcca620709e7767e6d474842650b50406d3a0ae8ae2a4aedd82b7ad2b` |
| github-download.py | `89194c388e023bad6dca7347a132d24f45927d3710a635cf7ba9e4ea491177c6` |
| prepare-host.py | `77ba3b5b5883e71f2dd8403414874b8f452f15489ec22d2036551a20e35905cd` |
| installer-kit.zip | `f3fd1903e0653ffe6cc0b44952ba9876e1ccbf2975a58195031f749f4174cba6` |

Das Kit enthält 96 Dateien und 83 Bindungen an
das signierte Runtime-Manifest. Der öffentliche Lizenztrust mit
`kid=nexowattEOS` bleibt unverändert, SHA-256
`470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f`. Private Herstellerschlüssel sind nicht enthalten.
Release-ID: `343e639e8283f40df3608281c62a1fd7cd6cac4e7492b2b2bbdb0ebdd1484828`.

Nach `PG_SUDO_POLICY_REJECTED` können Dienstkonten und Runtime-Staging
bereits existieren. Der neue Befehl ist für einen frischen Testhost. Der
Restzustand des betroffenen Pi muss vor einem Wiederanlauf geprüft werden;
keine pauschale Löschung und keine Abschaltung von Sicherheitsprüfungen.

[Aktuelle Prüf- und Veröffentlichungsnachweise](../../reports/integration/github-bootstrap-sudo-20261003/README.md).
`preparation.json` hält den Zustand des Paketbaus vor dem Upload fest;
sein `published:false` wird nachträglich nicht umgeschrieben.

**Vollständige Pi-Installation, Wiederanlauf und Hardwaretests: OFFEN.**
Keine Produktionsfreigabe, keine freigegebene Anlagensteuerung und kein
Flotten-Updater.
