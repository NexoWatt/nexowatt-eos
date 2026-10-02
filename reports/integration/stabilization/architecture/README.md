# Statische Architekturprüfung der EOS-Anwendung

Stand: 2026-10-01. Dieser Nachweis betrifft die installierten npm-Anwendungsbäume, nicht das Betriebssystem-Image und nicht die Ausführung auf einem Raspberry Pi. Eine bestandene Prüfung ist eine notwendige Lieferprüfung, keine Hardwarefreigabe oder CRA-Konformitätserklärung.

## Ergebnis des vorhandenen Kandidaten r2

Geprüft wurde der unveränderte Baum `integrated-roles-candidate-r2/app` mit 17.837 Dateien, 2.372 Verzeichnissen, 245.724.307 Bytes, 466 Paketmanifesten einschließlich Wurzelpaket und 9 internen npm-Dateilinks. Die vollständigen Ergebnisse stehen in `r2-linux-x64.json` und `r2-linux-arm64.json`.

| Prüfziel | Ergebnis | Konkreter Befund |
| --- | --- | --- |
| linux-x64 | gesperrt | `esbuild@0.11.23` enthält kein vom Prüfer freigegebenes Zielbinary; `ARCH_ESBUILD_TARGET_BINARY_MISSING` |
| linux-arm64 | gesperrt | derselbe fehlende Zielbinary-Nachweis; der Baum ist nicht als ARM64-Lieferung freigegeben |

Das tatsächlich untersuchte r2-Paket enthält **kein** aktives x64-esbuild-Binary. Die anfängliche Vermutung eines enthaltenen falschen x64-Binary wurde damit für diesen Baum nicht bestätigt. Ein blindes Kopieren eines später mit x64-Optionalpaketen installierten Baums auf ARM64 wäre trotzdem unzulässig und wird mit einem eigenen Negativtest abgefangen. Die bislang mehrere Plattformen nennenden Release-Metadaten reichen als Architekturnachweis nicht aus. Jedes neue installierte Lieferartefakt benötigt genau seinen geprüften Plattformvertrag, Hash und SBOM.

39 mitgelieferte native `.bare`-Dateien gehören zu `bare-fs@4.8.2`, `bare-url@2.5.4` und `bare-path@3.1.2`: jeweils 13 Varianten für Linux, Android, Windows, macOS und iOS. Ihre Paketpfade, Variantennamen, CPU-Header, Dateigrößen und SHA-256-Werte sind im JSON einzeln erfasst. Es handelt sich um Artefakte für die andere Laufzeit Bare, nicht um freigegebene native Node-Add-ons. Die gesichteten Bare-Lader verwenden `require.addon()` beziehungsweise `Bare.platform`; `tar-stream@3.2.1` enthält eine getrennte Bare-/Node-Auswahl. Dies begründet die ausdrücklich begrenzte Inventarklasse, beweist aber keine allgemeine Unerreichbarkeit dieser Dateien. Abweichende Versionen, Pfade, Varianten oder Header werden gesperrt.

`diskusage@1.2.0` deklariert `gypfile: true`, enthält im Kandidaten aber kein natives Node-Add-on. Der exakt gehashte `index.js` verwendet auf dem vorgesehenen Node-24-Vertrag `fs.statfs`. Nur dieser geprüfte Dateistand wird als Quellcode-Ausnahme dokumentiert. Andere GYP-Pakete oder ein abweichender Lader werden gesperrt. Die tatsächliche Host-API und dieses Verhalten bleiben auf dem Zielgerät zu prüfen.

## Neue getrennte Stabilisierungsbäume

Die anschließend separat gebauten Bäume `eos-stabilization-x64/app` und `eos-stabilization-arm64/app` bestehen die statische Prüfung mit dem erklärten externen Node-Vertrag `24.21.0`. Die Berichte liegen unter `../x64/architecture.json` und `../arm64/architecture.json`, die Herkunftsbindungen jeweils unter `architecture-binding.json` daneben. Jeder Baum enthält 17.841 reguläre Dateien, 2.375 Verzeichnisse, 467 Paketmanifeste einschließlich Wurzel und 40 native Dateien einschließlich der 39 Bare-Varianten.

| Tatsächlicher Zielbaum | Aktives Optionalpaket | Header | SHA-256 des esbuild-Binary |
| --- | --- | --- | --- |
| linux-x64 | `@esbuild/linux-x64@0.28.2` | ELF64, Little Endian, Machine 62, statisch | `e1698a3d5c6c0798fee4fd3b5cc816651f460c63d390a7a26ea4beb0b1884100` |
| linux-arm64 | `@esbuild/linux-arm64@0.28.2` | ELF64, Little Endian, Machine 183, statisch | `90bd269553d258e80b19e3ccab4f98f0831f87442a2f056510ce24fd1b425fc2` |

Das Wurzel-Lockfile beider Bäume ist byteidentisch: SHA-256 `81477e727e4abb676b6a5b1af4bb51a3502d443a93b74cbefce9e1c093fd9073`; auch das Wurzelmanifest ist identisch. Der vollständige Dateivergleich in `platform-tree-comparison.json` zeigt 17.846 identische gemeinsame Einträge einschließlich Symlinks. Unterschiedlich sind ausschließlich das jeweilige Plattformpaket mit Binary, `package.json` und README sowie der dazugehörige Plattformpaket-Eintrag im abgeleiteten `node_modules/.package-lock.json`. Nach Entfernen dieses einen Plattformpaket-Eintrags sind beide abgeleiteten Lockfiles strukturell identisch. Die Aussage „nur das Binary unterscheidet sich“ wäre daher zu eng; auch die zugehörigen Paketmetadaten unterscheiden sich erwartungsgemäß.

Die echte Gegenprüfung des x64-Baums als ARM64 in `x64-as-arm64-negative.json` scheitert mit `ARCH_PACKAGE_PLATFORM_MISMATCH`, `ARCH_UNREVIEWED_NATIVE` und `ARCH_ESBUILD_TARGET_BINARY_MISSING`. Eine falsche Plattformkennzeichnung wird damit am tatsächlichen Kandidaten erkannt.

Die Herkunftsbindungen enthalten den Hash des Prüfprogramms, des Testprogramms und TAP-Nachweises, des Architekturberichts, des beobachteten Build-Nachweises, der Wurzel-/esbuild-Manifeste und beider npm-Lockfiles. Der Build-Nachweis und der bestätigte Build-PATH nennen den x64-Buildhost mit Node `24.21.0`; dessen npm-Manifest ist `11.19.0`. Hashes von npm-CLI, npm-Manifest und Node-Executable sind separat gebunden. Diese statischen Architekturprüfungen liefen dagegen unter Host-Node `24.19.0`; das ist im Bericht ausdrücklich vom geprüften Zielvertrag `24.21.0` getrennt. Weder eine Ziel-ARM64-Datei noch das x64-esbuild-Binary wurden durch diese Prüfung ausgeführt. Das Ergebnis bleibt eine statische Lieferprüfung; die tatsächliche Pi-Freigabe steht aus.

## Build-Vertrag für getrennte Plattformbäume

Die aktuellen offiziellen npm-11-Dokumente beschreiben `--cpu`, `--os` und `--libc` als Auswahl der zu installierenden Plattformpakete. Diese Optionen führen keine Cross-Kompilierung aus. `--ignore-scripts` unterdrückt Installationsskripte; `--include=optional` stellt sicher, dass die Optional-Abhängigkeiten nicht gleichzeitig ausgelassen werden. Esbuild dokumentiert, dass `--ignore-scripts` mit installiertem Optional-Binary funktioniert; die Kombination mit ausgelassenen Optional-Abhängigkeiten funktioniert nicht. Ohne Installationsskripte muss insbesondere die sonst dort stattfindende Versionsprüfung anderweitig erfolgen.

Für jeden Zielbaum sind ein frisches, eigenes Verzeichnis, der geprüfte exakte `package.json`-/Lockfile-Stand und dieselben kontrollierten lokalen Komponententarballs zu verwenden. Ein `node_modules`-Verzeichnis darf nicht zwischen den Architekturen übernommen werden. Beispielbefehle **jeweils im frischen Zielverzeichnis**:

```sh
npm ci --ignore-scripts --omit=dev --include=optional --cpu=x64 --os=linux --libc=glibc
```

```sh
npm ci --ignore-scripts --omit=dev --include=optional --cpu=arm64 --os=linux --libc=glibc
```

Danach ist jeder Baum separat zu prüfen. `NODE_VERSION` bezeichnet die exakte extern bereitgestellte, zuvor freigegebene Node-24-Version; sie wird durch diesen Prüfaufruf weder installiert noch auf ihre Aktualität geprüft:

```sh
node tools/integration/check-runtime-architecture.cjs --app /absolute/app-x64 --platform linux-x64 --node-version "$NODE_VERSION"
node tools/integration/check-runtime-architecture.cjs --app /absolute/app-arm64 --platform linux-arm64 --node-version "$NODE_VERSION"
```

Der neue esbuild-Vertrag verlangt `esbuild` und `@esbuild/linux-<cpu>` in identischer exakter Version, ein passendes installiertes Optionalpaket sowie ein statisches Linux-ELF-Binary mit passendem 64-Bit-Little-Endian-CPU-Header. Der oben dokumentierte neue Stabilisierungsstand erfüllt diesen Vertrag mit Version `0.28.2`; dies gilt nur für die gebundenen geprüften Artefakte. Ein fehlendes Zielpaket im Lockfile oder im installierten Baum muss behoben werden; ein grüner npm-Exitcode allein ist keine Freigabe.

Nach der Prüfung sind pro Zielbaum die tatsächlich installierten Pakete als CycloneDX-SBOM zu erfassen und das gebaute Archiv, der Architekturbericht und die plattformspezifischen Release-Metadaten kryptografisch miteinander zu verknüpfen. Die getrennten Artefakte benötigen getrennte Hashes. Installation, Start, Neustart, Schnittstellen, Adapterverhalten und Update/Rollback sind danach mit genau diesen Artefakten auf ihren Zielsystemen zu testen. Ein x64-VM-Test ersetzt keinen Pi-ARM64-Test.

## Importierbare Schnittstelle und Grenzen

```js
const { checkRuntimeArchitecture } = require('./tools/integration/check-runtime-architecture.cjs');
const report = checkRuntimeArchitecture({
  app: '/absolute/app-arm64',
  platform: 'linux-arm64',
  nodeVersion: '24.21.0' // Beispiel eines exakten Vertrags, keine Versionsfreigabe
});
if (!report.passed) throw new Error('EOS runtime architecture gate failed');
```

Ein bestandener Bericht hat `passed: true`, leere `issues`, `executedTargetCode: false` und `hardwareQualified: false`. Unzulässige Eingaben, Größen-/Tiefenlimits, fehlerhafte JSON-Daten oder instabile Dateien führen zu einer Ausnahme und damit einer gesperrten Freigabe; Befunde liefern `passed: false`. Die CLI schreibt bei normalen Befunden JSON auf stdout und endet mit Status 1. Bei fatalen Fehlern schreibt sie einen begrenzten Fehlercode auf stderr. Aufrufende Build-Werkzeuge müssen beide Fehlerwege sperrend behandeln.

Der Prüfer führt keine App-Module, Installationsskripte oder nativen Zieldateien aus. Er prüft tatsächliche installierte Paketmanifeste gegen Lockfile-Versionen und Plattformattribute, erkennt ELF-, PE- und Mach-O-Header, überprüft bekannte native Pfade und inventarisiert deren Hashes. Alle `.node`-Dateien werden bis zu einem separaten ABI-Vertrag gesperrt; ein CPU-Header beweist keine Node-ABI-Kompatibilität. Esbuild mit dynamischem Loader oder dynamischer ELF-Sektion wird ebenfalls gesperrt. Fremde Native-Dateien und unerkannte Dateien mit nativer Endung werden gesperrt. Interne npm-Dateilinks unter `node_modules/.bin` sind zulässig; sonstige Dateilinks sowie externe, absolute, zyklische und Verzeichnislinks sind unzulässig. Dadurch kann ein nativer Dateipfad nicht durch einen zusätzlichen Symlink von der Dateiprüfung ausgenommen werden.

Ressourcengrenzen: höchstens 50.000 reguläre Dateien, 15.000 Verzeichnisse, Tiefe 40, 512 MiB Gesamtdateigröße, 1 MiB je Paketmanifest, 8 MiB Lockfile, 32 MiB je gehashter nativer Datei, 64 KiB Header-Präfix und 256 Befunde. Verzeichniseinträge werden begrenzt eingelesen. Dateien werden ohne Verfolgen des letzten Symlink-Elements geöffnet; Identität, Größe und Änderungszeit werden während relevanter Lesevorgänge überprüft.

Der Eingabebaum muss ruhend und gegen parallele Änderungen geschützt sein. Die Prüfung erzeugt keinen Dateisystem-Snapshot und ersetzt keine Isolation gegenüber einem böswilligen gleichzeitigen Schreiber. Headerprüfung ist keine vollständige Binärformatvalidierung, Malware-Erkennung, Signaturprüfung oder SBOM. Verschlüsselte, komprimierte und in anderen Dateien eingebettete native Nutzlasten werden nicht vollständig erkannt. Node selbst ist nicht im App-Baum enthalten; seine Herkunft, Integrität, CPU, genaue Version und `fs.statfs`-API sind Host-Nachweise. Der glibc-Zielvertrag, Kernel, Redis und Geräteschnittstellen werden hier nicht ausgeführt oder qualifiziert.

## Bedrohungsanalyse (STRIDE)

| Kategorie | Bedrohung an dieser Grenze | Maßnahme und verbleibende Grenze |
| --- | --- | --- |
| Spoofing | x64-Datei trägt ARM64-Paketnamen; fremdes Paket imitiert Bare | CPU-Header gegen Plattform, exakte bekannte Paketpfade/Versionen und Varianten; Herkunft muss zusätzlich über Paketintegrität belegt werden |
| Tampering | Lockfile-/Manifestdrift, vertauschte native Datei, Symlink-Ausbruch | Tatsächliche Manifeste, Lockfile-Versionen, Native-Hashes, Linkregeln und Dateistabilitätsprüfungen; Eingabebaum muss gegen gleichzeitige Manipulation geschützt sein |
| Repudiation | Unbelegte Aussage „ARM64 getestet“ | Maschinenlesbarer Bericht mit explizit statischem Status, Hashes, Testprotokoll und `hardwareQualified: false`; Signieren und Archivbindung erfolgen im Releaseprozess |
| Information Disclosure | Pfade lesen außerhalb des Kandidaten; unnötige Inhaltsausgabe | Kein Folgen externer Links, relative Berichtspfade und begrenzte Fehlercodes; die Prüfung liest nur freigegebene lokale Eingaben |
| Denial of Service | Sehr große Dateien, tiefe Verzeichnisse, manipulierte Headeroffsets | Explizite Größen-, Anzahl-, Tiefen- und Headergrenzen; Grenzverletzung sperrt die Freigabe |
| Elevation of Privilege | Build führt unreviewte Zielbinärdatei oder Installationsskripte aus | Prüfer startet keine Prozesse und lädt keinen App-Code; Build erfolgt ohne Lifecycle-Skripte; spätere gezielte Runtime-Tests benötigen eigene Isolation |

## Automatisierte Nachweise

`tests/integration/runtime-architecture.test.cjs` prüft 19 Szenarien einschließlich korrekter getrennter ARM64-/x64-Fixtures, falscher Plattform, fehlendem/esbuild-fremdem Binary, falschen Versionen und Paketpfaden, fehlenden Plattformattributen, Node-Add-ons, unbekannten nativen Dateien, Headergrenzen, Bare-Ausnahmen, GYP-Ausnahmen, Lockfiledrift, Symlink-Ausbruch und Eingabelimits. Die Binärdateien dieser Unit-Tests sind synthetische Header-Fixtures; sie werden niemals ausgeführt und belegen keine Runtimefunktion. `unit-tests.tap` enthält das unveränderte Testergebnis. `verification.json` bindet diese Nachweise an den Prüfcode.

## Primärquellen

Abgerufen/geprüft am 2026-10-01:

- npm CLI v11, Konfiguration (`cpu`, `os`, `libc`, `ignore-scripts`, `include`): <https://docs.npmjs.com/cli/v11/using-npm/config/>
- npm CLI v11, Paketmanifest (`cpu`, `os`, `libc`, `optionalDependencies`): <https://docs.npmjs.com/cli/v11/configuring-npm/package-json/>
- Esbuild, Installation, Plattformwechsel und Installationsskripte: <https://esbuild.github.io/getting-started/>
- Lokale Primärartefakte: Paketmanifeste, `diskusage/index.js`, Bare-Lader und `tar-stream` des exakt gehashten r2-Lockfile-Stands.
