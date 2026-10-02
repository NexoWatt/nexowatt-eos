# Stable-Veröffentlichung 7.9.97

```powershell
npm login
npm whoami
npm run check:eos-release
npm publish --dry-run --tag latest
npm publish --tag latest
```

Das geprüfte Tarball kann alternativ direkt veröffentlicht werden:

```powershell
npm publish .\iobroker.eos-admin-7.9.97.tgz --tag latest
```
