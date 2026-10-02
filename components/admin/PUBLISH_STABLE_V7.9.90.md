# npm-Veröffentlichung – NexoWatt EOS Admin 7.9.90 Stable

```powershell
npm login
npm whoami

npm run check:eos-publish-channel
npm run check:eos-package
npm run check:eos-stability

npm publish --dry-run --tag latest
npm publish --tag latest
```

Prüfung:

```powershell
npm view iobroker.eos-admin@latest version
npm dist-tag ls iobroker.eos-admin
```

Erwartet:

```text
latest: 7.9.90
```
