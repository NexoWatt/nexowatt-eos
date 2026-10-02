# npm-Veröffentlichung – NexoWatt EOS Admin 7.9.89 Stable

## Vorprüfung

```powershell
npm run check:eos-publish-channel
npm run check:eos-package
npm run check:eos-stability
npm publish --dry-run --tag latest
```

## Veröffentlichung

```powershell
npm login
npm whoami
npm publish --tag latest
```

## Kontrolle

```powershell
npm view iobroker.eos-admin@latest version
npm dist-tag ls iobroker.eos-admin
```

Erwartet:

```text
latest: 7.9.89
```

Bereits veröffentlichte Paketversionen dürfen nicht mit verändertem Inhalt erneut veröffentlicht werden. Jede spätere Änderung benötigt eine höhere Versionsnummer.
