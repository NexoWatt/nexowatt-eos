# Installationstest 7.9.96

```bash
cd /opt/iobroker
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.96
iobroker upload eos-admin
iobroker restart eos-admin.0
```

Danach Browser-Cache vollständig neu laden und Admin-, Installateur- sowie Endkundenanmeldung prüfen.
