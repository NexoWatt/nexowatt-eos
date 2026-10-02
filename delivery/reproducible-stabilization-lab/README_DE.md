# Reproduzierbare Eingaben für EOS 0.2.0-dev.3

Die zwei lokalen npm-Archive und `app/package*.json` gehören zu den getrennt aufgebauten x64-/ARM64-Kandidaten unter `reports/integration/stabilization/`. Die Lockdatei ist für beide Ziele identisch; installiert wird ausschließlich das jeweilige esbuild-Zielpaket. Ein frischer Offline-`npm ci` hat je 466 installierte Manifestdateien unverändert reproduziert. Diese Eingaben sind kein bereits transformiertes Laufzeitverzeichnis.

Auf einem getrennten Buildhost mit der geprüften offiziellen Node-24.21.0-/npm-11.19.0-Toolchain, vorbereitetem öffentlichen Paketcache und einer neuen Kopie dieses Verzeichnisses:

```sh
cd app
npm ci --offline --ignore-scripts --omit=dev --include=optional --no-audit --no-fund --os=linux --cpu=arm64 --libc=glibc
```

Für x64 ausschließlich `--cpu=x64` verwenden. Fehlende Cacheinhalte stoppen den Aufbau; private EOS-Metadaten nicht durch einen ungeprüften Online-Wiederholungsversuch offenlegen. Vor Laufzeitnutzung folgen Controller-/CLI-/WebSocket-Transformation, Architekturprüfung, neue SBOM-Bindung, Katalogprüfung und Signatur. Befehle und Grenzen stehen in `tools/integration/README.md`; die eigentliche Test-Pi-Installation verwendet das fertig signierte Bundle unter `delivery/test-pi-0.2.0-test.1/` und führt kein npm auf dem Pi aus.

Die unveränderten technischen Adapterversionen bezeichnen lokale EOS-Ableitungen, keine Gleichheit mit gleichnamigen Registry-Artefakten. Maßgeblich sind Archive-SHA256/SHA512, Quellstand und Transformationsnachweise. Der esbuild-Advisory wurde im tatsächlichen Controller-Lader nachgeprüft; ein vollständiger neuer Remote-Audit des privaten Gesamtbaums ist nicht ausgeführt.
