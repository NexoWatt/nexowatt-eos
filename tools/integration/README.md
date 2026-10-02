# Integration bauen und SBOM erzeugen

Diese Werkzeuge laufen ausschließlich auf einem getrennten Buildhost. Sie sind keine Laufzeit-Installationsschnittstelle und starten keine Adapter. Ein erfolgreicher Build erteilt keine Adapterfreigabe.

## Voraussetzungen

Der aktuelle Builder verlangt Node.js 24.21.0 und dessen mitgelieferte npm-CLI 11.19.0. Er startet npm ausdrücklich mit demselben Node-Executable; PATH kann keinen anderen Interpreter auswählen. Die früheren Nachweise nennen ihre damaligen Laufzeiten gesondert. Python 3.12 wurde für Inventar/Bindung verwendet; die optionale vollständige JSON-Schema-Prüfung benötigt `jsonschema` einschließlich `referencing`. Die Schema-Dateien liegen lokal unter `vendor/cyclonedx-1.5/`; keine Schema-Downloads während der Prüfung.

## Quellen und explizite Kompilierung

`components/` enthält die Quellen. `build-runtime.cjs` kopiert sie zuerst in einen frischen externen Ordner. `npm pack` und `npm install` laufen offline und mit `--ignore-scripts`; `prepack`/`prepare`/`postinstall` werden also nicht still ausgeführt. Ein fehlender `main`-Einstiegspunkt stoppt den Build.

EEBUS benötigt vorab eine isolierte Kopie und explizite TypeScript-Kompilierung. Seine ursprünglich enthaltene Lockdatei entsprach nicht dem aktuellen Manifest. Der dokumentierte Erstaufbau hat deshalb Abhängigkeiten neu aufgelöst und den ursprünglichen Lock als historischen Beleg erhalten. Der geprüfte neue Lock ist jetzt nach `components/eebus/package-lock.json` übernommen: isoliertes `npm ci --ignore-scripts` und TypeScript 5.9.3 entsprechend der Deklaration `^5.9.2` wurden tatsächlich ausgeführt. Die 68 sauber neu erzeugten Builddateien sind bytegleich zum getesteten Repository-Stand; 21 Sicherheits-/Ressourcentests und vier bisherige Prüfscripte bestanden. Dies ist keine Reproduktion aus dem fehlerhaften ursprünglichen Lock. Weitere Builds verwenden den korrigierten Lockstand.

Admin-/UI-Änderungen müssen fertig gebaut und getestet sein, bevor ein endgültiger Kandidat gepackt wird. Ein während der Bearbeitung erzeugter Bewertungsbaum ist kein freigegebener Endstand.

Beispiel für eine Zusammenstellung mit bereits gebauter EEBUS-Kopie:

```sh
node tools/integration/build-runtime.cjs \
  --output /pfad/frischer-buildordner \
  --platform linux-arm64 \
  --eebus-source /pfad/gepruefte-eebus-buildkopie
```

Nur Admin und UI zusammenstellen:

```sh
node tools/integration/build-runtime.cjs \
  --output /pfad/frischer-admin-ui-kandidat \
  --platform linux-arm64 \
  --components admin,ui
```

Ergebnis: `app/`, `packages/`, isolierte `sources/`, `logs/` und `build-evidence.json`. Der erste Lauf löst Abhängigkeiten aus dem vorbereiteten Cache auf; fehlende Inhalte stoppen mit BUILD_OFFLINE_CACHE_MISS. Ein öffentlicher Download muss getrennt ohne private EOS-Paketmetadaten vorbereitet werden. Anschließend liegen exakte Root-Versionen und ein konkreter Lock einschließlich Archivintegrität vor. Explizite `overrides` der Quellkomponenten werden am Installationsroot zusammengeführt; widersprüchliche Vorgaben stoppen den Build. npm würde untergeordnete Paket-Overrides sonst ignorieren. Zur Wiederholung `app/package*.json` und denselben Nachbarordner `packages/` in einen frischen Arbeitsbereich kopieren und dort ausführen:

```sh
npm ci --offline --ignore-scripts --omit=dev --include=optional --no-audit --no-fund --os=linux --cpu=arm64 --libc=glibc
```

`npm ci` darf bei Integritätsfehlern nicht durch `--force` oder Abschalten der Prüfung ersetzt werden. Änderungen am Lock sind mit der ursprünglichen Abweichung und unabhängigen Quellen zu dokumentieren. Die Controllertransformation, Adapterzulassung und Signaturprüfung folgen als separate Schritte; dieser Baum startet noch keinen gehärteten Controller.

## Getrennte Inventare

```sh
python3 tools/integration/source-inventory.py \
  --register system/integration/components.json \
  --sbom reports/integration/sbom/source-lock-inventory.cdx.json
```

Dieses Inventar stellt Quellen und deklarierte Lockeinträge dar, einschließlich Entwicklung und Frontend. Es behauptet keine Installation, Bundlezugehörigkeit oder Freigabe.

Im tatsächlichen `app/`-Verzeichnis:

```sh
npm sbom --offline --omit=dev --sbom-format=cyclonedx > /pfad/runtime.npm.cdx.json
```

Ein vollständiger neuer Remote-Audit des privaten EOS-Baums wurde durch die automatische Freigabeprüfung wegen möglicher Offenlegung privater Paketmetadaten blockiert. Öffentliche Dependency-Teilprüfungen und frühere Audit-Snapshots werden getrennt geführt; sie sind kein aktueller vollständiger EOS-Audit. Anzahl betroffener Paketknoten und unabhängiger Sicherheitslücken unterscheiden.

Danach aus dem Repository:

```sh
python3 tools/integration/bind-sbom.py \
  --app /pfad/build/app \
  --npm-sbom /pfad/runtime.npm.cdx.json \
  --out /pfad/runtime.cdx.json \
  --coverage /pfad/runtime.coverage.json
python3 tools/integration/validate-sbom.py /pfad/runtime.cdx.json \
  --output /pfad/runtime.schema-validation.json
```

Nach tatsächlicher Controllertransformation zusätzlich `--transform-evidence /pfad/controller-transform.json` an `bind-sbom.py` übergeben. Dadurch werden die lokal veränderten Komponenten kenntlich gemacht und ihre Dateihashes geprüft; upstream Archivhashes beschreiben deren Vorgänger. Für das aktuelle Admin-Profil gehört dazu auch die exakt geprüfte Ableitung von `@iobroker/ws-server@4.5.1` mit 1-MiB-Nachrichteneingang. Die SBOM-Bindung verlangt beide Controller-/CLI-Komponenten weiterhin und akzeptiert den zusätzlichen Transport ausschließlich mit dem gebundenen Adminprofil, der richtigen Paketversion und den geprüften Original-/Ergebnishashes.

Die aktuellen Build-Eingaben liegen in `delivery/reproducible-stabilization-lab/`; aktuelle plattformspezifische SBOMs, Schema- und Wiederholungsbelege unter `reports/integration/stabilization/{x64,arm64}/`. Das signierte ARM64-Testbundle liegt unter `delivery/test-pi-0.2.0-test.1/`. `delivery/reproducible-roles-lab/` gehört zum historischen dev.2-Stand. `delivery/reproducible-ui-lab/` sowie die vorherigen SBOM-Dateien sind historische Stände und werden durch neue Werkzeugläufe nicht umgedeutet.

Die SBOM-Bindung prüft tatsächliche Manifestidentität, Lockbezug, npm-Aliase und Abhängigkeitsreferenzen. Explizit bekannte eingebettete Paketkopien werden mit Dateibaumhash und ihrem tatsächlichen Adapter als Abhängigkeit ergänzt: `crypto-js` im Admin sowie der Lizenzclient jeweils im Admin und in der UI. Die drei Verzeichnisse enthalten zwei unterschiedliche Paketidentitäten; gleiche Namen/Versionen in zwei Adaptern werden nicht als dieselbe Dateikopie behandelt. Sie rekonstruiert keine unbekannten Frontend-Bundles. OS-Pakete, Node-Binary, Redis-Binary, Firmware, Gerätedaten und tatsächlich aktivierte Adapter benötigen eigene Inventare.

## Prüfbefehle

```sh
node --test tests/integration/build-runtime.test.cjs
python3 tests/integration/source-inventory.test.py
python3 tests/integration/embedded-sbom.test.py
python3 tests/system/sbom-test-base.test.py
```

Bedrohungsmodell, Grenzen und architektonischer Zusammenhang stehen in `docs/architecture/INTEGRATED_SYSTEM.md`.
