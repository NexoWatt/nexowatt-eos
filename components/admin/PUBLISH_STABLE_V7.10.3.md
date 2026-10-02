# NPM-Veröffentlichung 7.10.4

Aus einer frisch entpackten Repository-ZIP ausführen:

```powershell
npm publish --dry-run
npm publish
```

Der Publish-Workflow ist dependency-frei und darf weder `tsc`, `tsx`, `npm install` noch einen verschachtelten `npm pack`-Prozess verlangen.
