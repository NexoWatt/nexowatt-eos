# Reproduzierbare Build-Eingaben: EOS Admin-/UI-Laborstand

Entwicklungsstand 0.2.0-dev.1. Diese Dateien sind **kein signierter Geräteinstaller** und keine Produktionsfreigabe. Sie dienen der Wiederherstellung des bewerteten npm-Baums auf einem getrennten Buildhost mit Node.js 24.19.0 / npm 11.9.0. Die tatsächlichen Prüfgrenzen stehen im Gesamtbericht des Repositorys.

Enthalten sind die unveränderten lokalen npm-Archive für EOS Admin 7.10.11 und NexoWatt UI 1.0.21 sowie `app/package.json` und `app/package-lock.json`. Die Archive liegen bewusst neben `app/` unter `packages/`, weil die Lockdatei diese relativen Pfade verwendet. `inputs.sha256.json` bindet diese Eingaben. Die Registry-Pakete selbst sind nicht mitgeliefert; `npm ci` benötigt dafür Netzwerkzugriff beziehungsweise einen passenden verifizierten npm-Cache. Ein Offline-Installer wird damit nicht behauptet.

Aus dem Hauptverzeichnis des vollständigen EOS-Repositorys nach Prüfung der Eingabehashes:

```sh
cd delivery/reproducible-ui-lab/app
npm ci --ignore-scripts --omit=dev --no-audit --no-fund
cd ../../..
```

Lifecycle-Hooks bleiben ausgeschaltet. Ein Integritätsfehler ist ein Abbruchgrund. Keine `--force`-Option hinzufügen. Die Root-Abhängigkeiten nennen exakte Versionen; Archivquelle und SRI sind im Lock erhalten. Das OAuth-Override im Root ist Teil des überprüften Baums und darf nicht entfernt werden.

Nach `npm ci` ist der Controller noch das unveränderte npm-Original. **Vor einem Laborstart ist die überprüfte EOS-Transformation zwingend:**

```sh
node <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const transform = require('./runtime/controller-profile/transform.cjs');
const app = path.resolve('delivery/reproducible-ui-lab/app');
const adapters = [
  { package: 'iobroker.eos-admin', version: '7.10.11', main: 'build/main.js' },
  { package: 'iobroker.nexowatt-ui', version: '1.0.21', main: 'main.js' },
];
const evidence = transform.applyToBuild(app, adapters);
transform.verifyBuildProfile(app, adapters);
fs.writeFileSync('delivery/reproducible-ui-lab/replayed-controller-transform.json',
  JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
JS
```

Die Transformation akzeptiert nur die erwarteten Originalbytes und wird auf einem bereits transformierten Baum abgelehnt. Ein erneuter `npm ci` stellt die Originale wieder her und erfordert anschließend eine erneute Transformation. Der hier verwendete Controllerstand entfernt außerdem automatische Änderungen an Node-Dateicapabilities; die Laufzeit erhält keine Hostprivilegien durch diesen Startpfad.

Danach erneut eine SBOM erzeugen und mit `tools/integration/bind-sbom.py` an den tatsächlichen Baum und den Transformationsnachweis binden. Dieser Ablauf aktiviert keine Adapter und erzeugt keine Herstellerfreigabe. Einrichtung, HTTPS-Vertrauen, Rollen und Lizenzprüfung folgen dem gesonderten Laborablauf. Der Prüfstand hat keine freigegebene physische Anlagensteuerung.
