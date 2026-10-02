# NexoWatt EOS Admin 7.9.95 – Merge-Update

Diese ZIP ist absichtlich **flach aufgebaut**. `package.json`, `io-package.json`, `src-admin` und alle übrigen Repository-Dateien liegen direkt auf der ersten ZIP-Ebene.

## Anwendung auf einem bestehenden Windows-Arbeitsordner

1. Den vorhandenen Repository-Ordner sichern oder committen.
2. Die Datei `NexoWatt_EOS_Admin_7.9.95_MERGE_INTO_EXISTING_FOLDER.zip` **direkt in den bestehenden Ordner** entpacken.
3. Bei der Windows-Abfrage **„Dateien im Ziel ersetzen“** wählen.
4. Im Repository `MERGE_UPDATE.cmd` starten oder in PowerShell `./MERGE_UPDATE.ps1` ausführen.
5. Erst nach der grünen Abschlussmeldung veröffentlichen.

Der Versionsabgleich repariert automatisch stale Werte in:

- `io-package.json` – Top-Level und `common.version`
- `package-lock.json`
- `src-admin/package.json`
- `src-admin/package-lock.json`
- `src-admin/src/version.json`
- `NEXOWATT_EOS_BUILD_INFO.json`
- aktuellem Repository-Eintrag und dessen unpkg-URLs

`.git`, `node_modules` und lokale Git-Historie werden durch das Skript nicht gelöscht.

## npm-Veröffentlichung

```powershell
npm login
npm whoami
npm publish --dry-run --tag latest
npm publish --tag latest
```
