# npm-Veröffentlichung 7.9.95

Nach dem Entpacken der Merge-ZIP zuerst `MERGE_UPDATE.cmd` ausführen. Danach:

```powershell
npm login
npm whoami
npm publish --dry-run --tag latest
npm publish --tag latest
```

Kontrolle:

```powershell
npm view iobroker.eos-admin@latest version
```
