# Veröffentlichung 7.9.94

```powershell
npm login
npm whoami
npm run normalize:eos-release
npm run check:eos-publish-channel
npm run check:eos-package
npm run check:eos-stability
npm publish --dry-run --tag latest
npm publish --tag latest
```

Danach prüfen:

```powershell
npm view iobroker.eos-admin@latest version
npm dist-tag ls iobroker.eos-admin
```
