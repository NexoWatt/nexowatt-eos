# Windows-npm-Runner im Release-Test (0.5.156)

## Ursache

Der Arbeitsordner-Isolationstest startet innerhalb von `npm test` zusätzlich
`npm pack --dry-run --json` in einer temporären Kopie. Unter Windows ist eine
`.cmd`-Datei kein direkt ausführbares Programm für `CreateProcess`. Ein direkter
`spawnSync("npm.cmd", ...)` kann deshalb mit `status=null` enden, bevor npm
überhaupt gestartet wurde.

## Korrektur

Während eines npm-Lifecycles stellt npm den Pfad seiner JavaScript-CLI in
`npm_execpath` bereit. Der Test startet diese Datei jetzt über den laufenden
Node-Prozess:

```text
node <npm-cli.js> pack --dry-run --json
```

Damit funktionieren Pfade mit Leerzeichen ebenso wie Windows-Installationen,
ohne `.cmd` direkt zu starten. Nur wenn `npm_execpath` nicht verfügbar ist,
wird auf Windows explizit `cmd.exe /d /s /c npm ...` verwendet.

## Umfang

Die Änderung betrifft ausschließlich den Test- und Veröffentlichungsablauf.
Gerätelaufzeit, Templates, Datenpunkte, Alias Contract v1, Ladepunkt-Freshness
und Schreiblogiken bleiben unverändert.
