# NexoWatt EOS Admin v20 - TTL/Abmeldezeit-Härtung

Diese Version härtet die Admin-Konfiguration gegen ungültige Werte bei der Abmeldezeit/Login-Timeout ab.

## Änderungen

- `native.ttl` wird beim Start backendseitig normalisiert.
- Werte unter 120 Sekunden, leere Werte, `0`, `NaN` oder Textwerte fallen auf 3600 Sekunden zurück.
- Obergrenze: 31.536.000 Sekunden (1 Jahr).
- `jsonConfig.json5` enthält jetzt `default: 3600`, `min: 120` und `max: 31536000`.

## CLI-Recovery

```bash
cd /opt/iobroker
iobroker set admin.0 --ttl 3600 --enabled true
iobroker restart admin.0
```

Wenn der Admin nicht startet:

```bash
cd /opt/iobroker
npm install "iobroker.admin@npm:@nexowatt/iobroker.admin@7.9.20" --omit=dev
iobroker upload admin
iobroker start admin.0
```
