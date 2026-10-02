# Installationstest 7.9.95

```bash
cd /opt/iobroker
iobroker stop eos-admin.0
npm install --no-save --omit=dev iobroker.eos-admin@7.9.95
iobroker upload eos-admin
iobroker restart eos-admin.0
```

Version prüfen:

```bash
node -p "require('/opt/iobroker/node_modules/iobroker.eos-admin/package.json').version"
```
