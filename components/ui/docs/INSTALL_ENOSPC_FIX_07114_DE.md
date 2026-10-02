# 0.7.114 – Installations-Hotfix gegen ENOSPC

## Problem

Beim Installieren über ioBroker/GitHub kann npm mit folgendem Fehler abbrechen:

```text
TAR_ENTRY_ERROR ENOSPC: no space left on device
```

Die Ursache ist kein Syntaxfehler im Adapter, sondern fehlender Speicherplatz auf dem ioBroker-Host während npm Pakete entpackt.

## Änderung in 0.7.114

- Runtime-Paket deutlich verschlankt.
- `devDependencies` aus der installierbaren Runtime entfernt und als `xDevDependenciesForDevelopmentOnly` dokumentiert.
- `files` in `package.json` auf echte Runtime-Dateien reduziert.

## Wichtig

Die TypeScript-Quellen bleiben im Repo-ZIP vorhanden. Für die laufende ioBroker-Installation werden sie aber nicht mehr über npm mitinstalliert.

## Wenn der Host trotzdem voll ist

Dann Speicher prüfen:

```bash
df -h
df -ih
du -h -d1 /home/iobroker/.npm /opt/iobroker /var/log 2>/dev/null | sort -h
```

Cache bereinigen:

```bash
sudo -u iobroker npm cache clean --force --cache /home/iobroker/.npm
rm -rf /home/iobroker/.npm/_cacache/tmp/*
```
