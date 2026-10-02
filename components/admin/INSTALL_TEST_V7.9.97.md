# Installationstest 7.9.97

```bash
cd /opt/iobroker
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.97
iobroker upload eos-admin
iobroker restart eos-admin.0
```

Danach Browser mit `Strg + F5` vollständig neu laden. Für EMS-Livedaten muss `iobroker.nexowatt-ui` mindestens `0.8.198` installiert und gestartet sein.
