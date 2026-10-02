# NexoWatt EOS 1.0.12 – offizielle Stable-Version

## Ursache des Publish-Abbruchs

Beim Überkopieren einer neuen Repository-ZIP bleiben Dateien mit alten Namen erhalten. Die seit 1.0.10 aktive Prüfung erkannte unbenutzte `admin/react/assets/index-*.js/css` und brach ab. Die pauschale Meldung „value redacted“ war für diesen Dateistrukturfehler irreführend: Ein altes Bundle allein ist noch kein Zugangsdatenfund. Der frische Release-Ordner war geprüft, dieser typische Update-Pfad zuvor unzureichend abgesichert.

## Korrektur

`npm publish` führt nach der Versionsprüfung automatisch `npm run release:prepare` aus. Der Ablauf benötigt nur Node-Bordmittel und baut die Produktlaufzeit nicht neu.

1. Gesamten Projektbaum auf die bestehenden Sicherheitsregeln prüfen. Echte Zugangsdaten-/Installationsdatenfunde blockieren vor jeder Bereinigung.
2. Aktuelle veröffentlichte Admin-Dateien gegen das Release-Manifest prüfen. Bei fehlenden oder veränderten aktuellen Dateien abbrechen.
3. Nur unbenutzte, nicht veröffentlichte `index-*.js/css` im Admin-Build auswählen. Direkte und indirekte Verweise sowie ausdrücklich veröffentlichte Dateien bleiben erhalten.
4. Alte Dateien im Betriebssystem-Temp-Verzeichnis außerhalb des Projekts sichern, Prüfsummen vergleichen und Wiederherstellungsinformationen schreiben. Der Sicherungspfad wird ausgegeben.
5. Nach erneutem Dateivergleich ausschließlich diese alten Build-Dateien aus dem Projekt entfernen. Quellen, aktuelle Assets, Kundeneinstellungen und Git-Index bleiben unverändert.
6. Die bisherigen Artefakt-, Stable-, Metadaten- und Startkettenprüfungen ausführen. Keine automatische Neuversiegelung und kein Abschalten von Prüfungen.

`npm run publish:check` bleibt eine rein lesende Prüfung. Wer sie einzeln auf einem überkopierten Arbeitsverzeichnis ausführt, bereitet dieses einmal mit `npm run release:prepare` vor. Im regulären `npm publish` passiert das automatisch. Wiederholtes Vorbereiten ist unschädlich.

## Verwendung unter Windows

Die vollständige ZIP in das Projektverzeichnis übernehmen, einschließlich `package.json`, `scripts/` und `admin/react/`. Danach wie gewohnt:

```powershell
npm publish --tag latest
```

Zur lokalen Vorprüfung ohne Veröffentlichung:

```powershell
npm run release:prepare
npm run publish:check
```

Wenn das Projekt mit Git gepflegt wird, die entfernten Altdateien vor dem Commit mit erfassen:

```powershell
git add -u -- admin/react/assets
```

Das Skript ändert den Git-Index absichtlich nicht selbst. Die Sicherung liegt im angezeigten Temp-Verzeichnis; `restore.json` ordnet Dateinamen, ursprüngliche Pfade und SHA-256-Prüfsummen zu. Das Temp-Verzeichnis ist keine dauerhafte Projektablage.

## Dauerhafte Absicherung

Der neue Regressionstest prüft den Überkopierfall, Sicherungen, wiederholtes Vorbereiten, indirekte Chunks, deklarierte Assets, veränderte/fehlende aktuelle Dateien, beschädigte Metadaten, echte Geheimnisse, Installationsdaten, Verzeichnisverknüpfungen und einen simulierten Sicherungsfehler. Die bestehende Sicherheitsprüfung samt Git-Index-Test bleibt bestehen. Der veraltete statische Test des Publish-Vertrags wurde an die vollständige aktuelle Prüfkette angepasst.

Diese Änderung betrifft Release-Werkzeuge. Produktquellen, AC/DC-Regelung, Speichergrenzen, Rollen, Benachrichtigungsintervalle und die Quellcode-Dokumentation aus 1.0.11 bleiben erhalten. Alle Markdown-Dateien verbleiben unter `docs/`.
