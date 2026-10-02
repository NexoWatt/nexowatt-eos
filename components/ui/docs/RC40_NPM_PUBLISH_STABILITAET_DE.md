# RC40 – reproduzierbarer npm-Publish

Der Releasepfad ist absichtlich **read-only**. Er verändert beim Veröffentlichen weder TypeScript-Quellen noch die produktive JavaScript-Runtime noch deren Spiegel.

## Ursache der vorherigen Fehler

Die frühere RC40-Ausgabe mischte Runtime-Artefakte, die mit TypeScript 5.8.3 erzeugt worden waren, mit einem Lockfile für TypeScript 6.0.3. Ein automatischer Sync während `prepublishOnly` schrieb deshalb zwei produktive Frontend-Dateien unmittelbar vor den Tests um. Dadurch war der tatsächlich geprüfte Stand nicht mehr derselbe wie der ausgelieferte Stand und `test:energy-origin-ledger-foundation` brach ab.

RC40 Publish-Stable behebt dies ohne Änderung an EMS-, Lade-, Speicher-, FENECON-, §14a- oder Safety-Envelope-Logik:

1. TypeScript ist in `package.json` und `package-lock.json` exakt auf **5.8.3** festgelegt – dieselbe Version, mit der die eingecheckten Runtime-Artefakte erzeugt und geprüft wurden.
2. `prepublishOnly` führt nur die npm-Versionsprüfung und anschließend das vollständige, read-only Release-Gate aus.
3. Der Windows-sichere Node-Runner startet alle 202 Prüfungen einzeln; es gibt keine überlange `cmd.exe`-Befehlskette.
4. Eine abweichende oder fehlende Compilerinstallation blockiert den Publish mit einer eindeutigen Meldung. Es werden keine Dateien automatisch repariert oder umgeschrieben.

## Verbindliche Befehle unter Windows

In einem frisch entpackten Projektordner ohne alten `.git`- oder `node_modules`-Ordner:

```powershell
npm ci
npm run publish:check
npm publish
```

`npm publish` führt die Versionsprüfung und das vollständige Gate erneut aus. Eine bereits belegte Version, ein Registry-Fehler oder eine fehlgeschlagene Prüfung blockiert fail-closed.

## Erwartete Schlüsselausgaben

```text
[publish-dev-deps] OK: lokaler TypeScript-Compiler 5.8.3 entspricht dem exakten Release-Pin.
[publish-check-runner] OK: Alle 202 Prüfungen bestanden
```

Die produktive EMS-, Lade-, Speicher-, FENECON-, §14a- und Safety-Envelope-Runtime ist gegenüber RC40 unverändert.
