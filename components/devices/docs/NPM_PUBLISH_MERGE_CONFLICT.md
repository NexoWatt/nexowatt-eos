# npm publish: EJSONPARSE nach einem Git-Merge-Konflikt

Der gemeldete Fehler vom 17.09.2026 enthält `<<<<<<< HEAD` in Zeile 3 der
`package.json`. Das ist eine Git-Konfliktmarkierung und kein gültiges JSON.
Die Datei enthält noch nicht aufgelöste Alternativen eines Merge-Konflikts.
Der gemeldete Versuch ist bereits beim Einlesen der Paketmetadaten gescheitert.

Die aktuelle vollständige Repository-ZIP 0.5.166 wurde geprüft:
gültige `package.json`, konsistente Versionen, keine Konfliktmarkierungen.
Die konkrete Windows-Arbeitskopie aus der Fehlermeldung lag nicht vor; ihre
Konfliktseiten und andere lokale Änderungen wurden daher nicht zusammengeführt.

## Vollständigen geprüften Stand verwenden

1. Den bisherigen Ordner `C:\Users\User\Desktop\ioBroker\nexowatt-devices`
   unverändert behalten. Er enthält eventuell lokale Änderungen und Git-Zustand.
2. Die vollständige ZIP
   `iobroker.nexowatt-devices-0.5.166-DEYE_TEST_FIX_REPOSITORY.zip` herunterladen.
3. Die ZIP nach `C:\Users\User\Desktop\ioBroker` in einen **neuen, leeren**
   Ordner entpacken. Sie enthält den Projektordner
   `iobroker.nexowatt-devices-0.5.166`. Kein erneuter Git-Pull/Merge ist nötig,
   um diesen geprüften Stand zu bauen.
4. PowerShell im entpackten Projektordner öffnen. Dort müssen `package.json`,
   `io-package.json`, `lib`, `admin`, `scripts` und `test` nebeneinander liegen.

Die drei DEYE-Profile und die bisherigen TESVOLT-, DEPower- und VARTA-Korrekturen
sind in diesem vollständigen Stand enthalten. Keine Änderung der Paketversion
allein wegen des JSON-Fehlers notwendig.

## PowerShell: prüfen und veröffentlichen

Die Fehlerprüfungen sind auch für Windows PowerShell 5.1 ausgeschrieben.
Ein fehlgeschlagener externer Befehl muss den Ablauf vor dem Publish stoppen.

```powershell
Set-Location "$env:USERPROFILE\Desktop\ioBroker\iobroker.nexowatt-devices-0.5.166" -ErrorAction Stop

node .\scripts\release-guard.cjs
if ($LASTEXITCODE -ne 0) { throw "Projektprüfung fehlgeschlagen. Nicht veröffentlichen." }

npm install
if ($LASTEXITCODE -ne 0) { throw "Installation fehlgeschlagen. Nicht veröffentlichen." }

npm pack --dry-run
if ($LASTEXITCODE -ne 0) { throw "Paketprüfung fehlgeschlagen. Nicht veröffentlichen." }

npm publish
if ($LASTEXITCODE -ne 0) { throw "npm publish fehlgeschlagen. Ausgabe prüfen." }
```

`npm pack --dry-run` führt in diesem Repository automatisch Release-Prüfung und
vollständige Tests aus. `npm publish` benötigt den vorgesehenen npm-Account und
dessen Berechtigung für das Paket. Es wurde aus der Entwicklungsumgebung keine
Veröffentlichung vorgenommen.

## Bestehende Git-Arbeitskopie anschließend abgleichen

Die frische ZIP hebt einen offenen Merge in der bisherigen Arbeitskopie nicht
auf. In deren Ordner zuerst den Zustand und die betroffenen Dateien anzeigen:

```powershell
git status
git diff --name-only --diff-filter=U
```

Jede Konfliktdatei mit dem geprüften Stand und den beabsichtigten eigenen
Änderungen abgleichen. Nicht nur die Marker entfernen: Es dürfen auch keine
doppelten Versionsfelder oder vermischten Code-Alternativen übrig bleiben.
Anschließend erneut `node .\scripts\release-guard.cjs` ausführen. Nur tatsächlich
aufgelöste Dateien gezielt mit `git add <Datei>` markieren und das von
`git status` angezeigte Merge-/Rebase-Verfahren abschließen. Keine pauschalen
Reset-/Checkout-/Stash-Befehle sind zur Wiederherstellung des ZIP-Stands nötig.

## Nachprüfung

Der konkrete Fehler wurde in einer separaten temporären Kopie mit
Windows-Zeilenenden nachgestellt. Der direkt über Node gestartete Release-Guard
meldet die Konfliktzeilen und das ungültige JSON und beendet sich mit Code 1.
Der aktuelle, konfliktfreie Stand besteht Release-Guard, 187 Tests und
`npm pack --dry-run`. Gerätecode und Templates entsprechen 0.5.165;
Paketversion 0.5.166 korrigiert zusätzlich die DEYE-Testinitialisierung.
Details: [DEYE-Teststart](DEYE_TEST_STARTUP_0.5.166.md).
