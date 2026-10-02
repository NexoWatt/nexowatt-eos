# Veröffentlichung – NexoWatt EOS Admin 7.10.2

Diese Repository-ZIP enthält bereits das vollständig kompilierte und geprüfte Release-Artefakt. Für die Veröffentlichung sind **weder `npm install` noch `npm ci` erforderlich**.

Im entpackten Repository zuerst den npm-Trockenlauf ausführen:

```powershell
npm publish --dry-run
```

Wenn der Trockenlauf ohne Fehler endet, direkt veröffentlichen:

```powershell
npm publish
```

`prepublishOnly` und `prepack` verwenden ausschließlich mitgelieferte Node.js-Prüfskripte. Sie starten weder `tsc` noch `tsx` und laden keine Entwicklungsabhängigkeiten nach. Das versiegelte SHA-256-Manifest kontrolliert, dass Quellstand, Frontend und vorkompiliertes Backend seit der Freigabe nicht verändert wurden. Zusätzlich werden die vollständige lokale Backend-Modulkette, die JavaScript-Syntax und der tatsächliche npm-Paketinhalt geprüft.

Nur nach eigenen Änderungen an TypeScript- oder Frontend-Quellen ist ein Entwicklungs-Build erforderlich. Der hier bereitgestellte Release-Stand darf unverändert direkt mit `npm publish` veröffentlicht werden.

Die bereits veröffentlichte Version 7.10.1 darf nicht überschrieben werden. Da der Veröffentlichungsversuch von 7.10.2 vor dem Upload im Lifecycle abgebrochen wurde, bleibt dieser reparierte Stand auf Version 7.10.2.
