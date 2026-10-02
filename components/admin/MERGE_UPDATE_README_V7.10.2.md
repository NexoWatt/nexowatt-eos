# Merge-Update – NexoWatt EOS Admin 7.10.2

Die 7.10.2-Repository-ZIP kann über den bisherigen Arbeitsordner entpackt werden. Danach muss der geschützte Merge-Workflow ausgeführt werden:

- Windows: `MERGE_UPDATE.cmd`
- PowerShell: `MERGE_UPDATE.ps1`
- Linux/macOS: `./MERGE_UPDATE.sh`

Der Workflow synchronisiert alle Versionsdateien, kompiliert das Backend neu, entfernt veraltete Runtime-Dateien, prüft die Frontend- und Backend-Abhängigkeitsgraphen und führt einen trockenen npm-Paketlauf aus. Er veröffentlicht nicht automatisch.

Wichtig: 7.10.2 ersetzt den fehlerhaften 7.10.1-Stand. Die Updateverwaltung darf ihren Status ausschließlich in `info.nexowattStableUpdatesEnabled` und `info.nexowattStableUpdatesState` speichern.
