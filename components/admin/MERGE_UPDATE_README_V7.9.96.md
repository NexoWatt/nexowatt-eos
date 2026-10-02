# NexoWatt EOS Admin 7.9.96 – Merge-Update

Die flache Merge-ZIP direkt in den bestehenden Repository-Ordner entpacken und alle Dateien ersetzen. Anschließend unter Windows `MERGE_UPDATE.cmd`, in PowerShell `./MERGE_UPDATE.ps1` oder unter Linux `./MERGE_UPDATE.sh` starten.

Die Prüfung übernimmt die Inhalte der bereitgestellten EMS-Live-Diagnose-Merge idempotent, synchronisiert sämtliche Versionsdateien auf `7.9.96`, bereinigt alte Runtime-Dateien und führt Paket-, Stabilitäts- sowie npm-Pack-Dry-Run aus. Sie veröffentlicht niemals automatisch.
