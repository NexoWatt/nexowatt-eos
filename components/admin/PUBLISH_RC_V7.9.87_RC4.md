# NexoWatt EOS Admin 7.9.87-rc.4 auf npm latest veröffentlichen

Diese Version wird auf ausdrückliche Entscheidung für die kontrollierte Produktabnahme über den npm-Dist-Tag `latest` bereitgestellt. Der Quellstand akzeptiert ausschließlich die exakt eingetragene Version 7.9.87-rc.4 für diesen Kanal.

## Prüfung

```powershell
npm run check:eos-publish-channel
npm run check:eos-package
npm run check:eos-stability
npm publish --dry-run --tag latest
```

Die letzte Zeile muss eine Veröffentlichung mit `tag latest` ankündigen.

## Veröffentlichung

```powershell
npm login
npm whoami
npm publish --tag latest
```

Im Repository liegt zusätzlich `.npmrc` mit `tag=latest`. Ein einfaches `npm publish` verwendet deshalb ebenfalls `latest`; der ausdrückliche Befehl bleibt eindeutiger.

## Dist-Tags kontrollieren

```powershell
npm dist-tag ls iobroker.eos-admin
npm view iobroker.eos-admin@latest version
```

Erwartet:

```text
latest: 7.9.87-rc.4
```

Ein eventuell noch vorhandener älterer `rc`-Tag ist für die normale Installation ohne Bedeutung.

## Installation

```bash
cd /opt/iobroker
npm install --no-save --omit=dev iobroker.eos-admin@latest
iobroker upload eos-admin
iobroker restart eos-admin.0
```

## Rückfall

```bash
cd /opt/iobroker
npm install --no-save --omit=dev iobroker.eos-admin@7.9.86
iobroker upload eos-admin
iobroker restart eos-admin.0
```

Nach bestandener Abnahme wird die identische freigegebene Programmlogik als Version `7.9.87` ohne Prerelease-Suffix veröffentlicht.
