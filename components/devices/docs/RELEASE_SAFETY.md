# NexoWatt Devices – sichere Release-Prüfung

Die erste Freigabeprüfung wird direkt mit Node.js gestartet. Dadurch erkennt sie auch einen beschädigten Projektstand, bevor ein Paket veröffentlicht wird. Das frühere Windows-Skript `publish-safe.cmd` ist ab Version 0.5.148 nicht mehr Bestandteil der ZIP oder des npm-Pakets. Ab Version 0.5.149 darf eine alte lokale Kopie im Arbeitsordner verbleiben, ohne die Tests zu blockieren; `package.json` und `.npmignore` verhindern weiterhin die Veröffentlichung.

## Prüfung ohne Veröffentlichung

Bei `EJSONPARSE` und einem Hinweis auf `<<<<<<< HEAD` zuerst die
[Wiederherstellung nach einem Git-Merge-Konflikt](NPM_PUBLISH_MERGE_CONFLICT.md)
verwenden. Ein npm-Skript kann eine kaputte `package.json` nicht vorab reparieren,
weil npm die Datei bereits vor dem Ausführen der Skripte einliest.

Im Projektordner:

```powershell
node .\scripts\release-guard.cjs
npm test
npm pack --dry-run
```

Unter Linux sind dieselben Befehle mit `/` statt `\\` verwendbar:

```bash
node ./scripts/release-guard.cjs
npm test
npm pack --dry-run
```

## Geprüft veröffentlichen

Erst nachdem alle drei Prüfungen erfolgreich waren:

```powershell
npm publish
```

Der Ablauf muss vor der Veröffentlichung abgebrochen werden, wenn mindestens einer dieser Punkte fehlschlägt:

- ungelöste Git-Merge-Konflikte
- ungültige JSON-Dateien
- unterschiedliche Versionen in `package.json` und `io-package.json`
- unterschiedliche `admin/templates.json` und `lib/templates.json`
- JavaScript-Syntaxfehler
- automatisierte Adaptertests
- `npm pack --dry-run`

## Schutz vor vermischten Versionen und lokalen Altdateien

`npm test` verwendet das feste Manifest `test/test-manifest.json`. Seit Version
0.5.155 werden ausschließlich die dort freigegebenen Tests ausgeführt. Alte
zusätzliche Dateien wie `test/core.test.js` bleiben lokal möglich, werden aber
weder ausgeführt noch in das npm-Paket aufgenommen.

Dasselbe gilt für zusätzliche Markdown-Dateien im Projektstamm. Die produktive
`package.json`-`files`-Whitelist erlaubt nur `README.md` und `docs/`; `.npmignore`
schließt `test/` sowie weitere Stamm-Markdown-Dateien zusätzlich aus. Solche
Altdateien erscheinen im Release-Guard nur noch als Hinweis.

Hart blockiert werden weiterhin alle Fehler in releaseverwalteten Dateien,
insbesondere fehlende Manifesttests, ungültiges JSON, Merge-Konflikte,
Syntaxfehler, abweichende Template-/Alias-Baselines und fehlgeschlagene Tests.
Damit hängt die Freigabe nicht mehr davon ab, ob eine neue ZIP über einen
langjährig genutzten Windows-Arbeitsordner entpackt wurde.

## Schutz bestehender Anlagen

Vor jeder Freigabe wird zusätzlich die Kompatibilitätsbaseline 0.5.143 geprüft.
Dabei müssen alle 181 Roh-Templates sowie sämtliche bisherigen
`devices.<id>.aliases.*`-Definitionen unverändert bleiben. Alias Contract v1 darf
nur neue Objekte unter `aliases.v1.*` und `aliases.meta.*` hinzufügen.
