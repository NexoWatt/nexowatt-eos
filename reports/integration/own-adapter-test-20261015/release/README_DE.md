# R10: neuer, nachweisgebundener Testpaket-Builder

Stand: 15.10.2026. **Implementierung, noch keine erzeugte oder veröffentlichte
R10-Lieferung.** Historische R9-/R8-Dateien bleiben unverändert.

Der Builder bereitet ausschließlich eine neue Testlieferung `0.2.0-test.3`,
Sequenz **13**, unter `delivery/test-pi-0.2.0-test.3-r10` vor. Er veröffentlicht
nichts und installiert nichts auf einem Pi. Fehlende, fehlgeschlagene oder nicht
zum konkreten Quellstand und Kandidaten passende native Nachweise verhindern
die Signierung.

## Eingaben und Schutzgrenzen

- Vollständig authentifizierte R9-Basis: Archivgröße/-hash, öffentlicher
  Schlüsselhash, Delivery-Metadatenhash, Signatur, Release-ID und Datei-Inventar.
- Sechs aktuelle eigene Paketdateilisten aus `npm pack --dry-run --json
  --ignore-scripts --offline`. Keine Abhängigkeitsauflösung, keine Lifecycle-Hooks.
- Unveränderte bestehende Admin-Prebuilt-Prüfung, UI-TS/Runtime-Paritätsprüfung
  und sechs bytegleiche zentrale Lizenzclients.
- Exakt sechs eigene Adapter im Controllerprofil; zusätzliche JavaScript- oder
  beliebige Fremdadapter werden dadurch nicht zugelassen.
- Außer den eigenen Paketdateien sind ausschließlich die Controllerprofil-JSON,
  die zwei quell-/ausgabehashgebundenen Backup-CLI-Dateien und die zwei ebenso
  gebundenen Adapterkern-Dateien für den einmaligen Shutdown-Abschluss veränderbar.
- Root-Lockfile, Abhängigkeitsversionen, native Module, übrige Fremdpaketdateien
  und PostgreSQL-Schema bleiben erhalten. Als einzige Systemd-Änderung wird die
  geprüfte `system/own-adapter-test/systemd/nexowatt-eos-upload.service` samt
  byteidentischem Quelltemplate nach
  `system/postgresql-test/systemd/nexowatt-eos-upload.service` abgebildet.
  Alle anderen Systemdateien müssen zur R9-Basis exakt gleich bleiben.
- Bestehende Paketidentitäten und Laufzeitabhängigkeiten bleiben gleich.
  Neue Scripts-/Files-Metadaten sowie die explizit geprüfte öffentliche
  Repositoryangabe des Backup-Pakets sind zulässig, keine beliebigen Ausnahmen.
- Die SBOM wird mit tatsächlichen App-Datei-/Modustabellen, Derivat-Abstammung,
  eingebetteten Lizenzclients, Backup-/Shutdown-Transformationen und Änderungen neu gebunden.
  Dies ist **kein neuer vollständiger Schwachstellenscan** und enthält weiterhin
  kein OS-/Firmwareinventar.

## Native Nachweise sind zwingend

`native-evidence.cjs` erwartet folgende Dateien aus der zugehörigen nativen CI:

- `own-adapters-native-prepared.json`
- `own-adapters-source-binding.json`
- `own-adapters-native-evidence.json`
- `own-adapters-native.tap`

Alle müssen aus der vertrauenswürdigen, isolierten Testpipeline kommen. Der
Builder vergleicht den sauberen exakten Git-Commit, die neu rekonstruierte
App-Contenttabelle, die authentifizierte Baseline sowie Paketquellen/Overlays.
Das ist keine Schnittstelle für ungeprüfte vom Zielgerät gelieferte JSON-Dateien.

Erforderlich sind unter anderem: Node 24.21.0, PostgreSQL 17.11, tatsächliche
sechs Adapterprozesse, HTTPS-Anmeldung, Home/Pro-Aktivierung, Widerruf, Neustart,
Konfigurationsassets aller Adapter, Enrollment-Rückfall vor und nach Start und
zwei inhaltlich untersuchte logische Backups. Alle 21 Checks umfassen ebenfalls
den nachweislich instanz-/marker-erhaltenden Asset-Upload und den tatsächlichen
Backup-Adapter-Bereitschaftsstatus. Fehlende Checks, übersprungene oder
fehlgeschlagene TAP-Tests, falsche App-/Quellbindung, Laufzeitfehler und
unvollständige Backupnachweise werden abgewiesen.

Auch ein vollständig bestandener nativer x64-Test ist **keine** ARM64-, Pi-,
Systemd-Mount-, Anlagen- oder vollständige Wiederherstellungsabnahme.

## Signierung und Veröffentlichung

Nur bei erfolgreicher Gesamtprüfung und sauberem, committed Quellstand unter
Node 24.21.0 verwendet der Builder den vorhandenen TEST-Archivpfad mit einem
neu erzeugten Ed25519-KeyObject im Arbeitsspeicher. Der private Schlüssel wird
nicht geschrieben oder committed. Ein neuer Testschlüssel macht den Archivhash
nicht bitidentisch zu früheren Builds; kanonische Manifestbytes bleiben bei
identischen Eingaben reproduzierbar. Speicherlöschung wird nicht behauptet.

Vor dem Signieren muss `update-test-own-adapters.cjs` den authentifizierten
R9→R10-Übergang prüfen. Anschließend werden Archiv, Signatur und Übergang erneut
aus dem echten Archiv geprüft. Ausgabe ausschließlich in ein **neues** Ziel;
kein Überschreiben existierender Lieferungen, kein Force-/Bypass-Schalter.
Eine separate Veröffentlichung und ein unabhängig rückgelesener Downloadbefehl
gehören nicht zu diesem Builderauftrag.

`verify-candidate.cjs` wird ausschließlich aus dem vertrauenswürdigen, sauberen
Quellcheckout ausgeführt. Er authentifiziert R9 erneut, rekonstruiert den gesamten
Kandidaten, prüft das vollständige signierte Manifest, SBOM, Quellbindung,
Upload-Abbildung, nativen Nachweis und sämtliche Releaseberichts-Felder. Dateien
aus dem Kandidatenverzeichnis werden nur als Daten gelesen, niemals importiert
oder als Skript gestartet. Ein selbst gewählter Kandidatenschlüssel allein kann
die vollständige Rekonstruktion nicht ersetzen.

Herstelleraufruf nach bestandener nativer CI, nicht auf dem Kunden-Pi:

```sh
node reports/integration/own-adapter-test-20261015/release/build-revision.cjs \
  --native-evidence /absolute/trusted-native-ci-evidence

node reports/integration/own-adapter-test-20261015/release/verify-candidate.cjs \
  /absolute/candidate 40-stellige-commit-sha \
  --native-evidence /absolute/trusted-native-ci-evidence
```

## Tatsächlich ausgeführte Prüfungen dieses Implementierungsschritts

Linux/x64, Node **24.19.0**, 14 isolierte Vertragstests bestanden:
[release-contract.tap](release-contract.tap). Die positiven Eingangsdaten dieser
Tests sind ausdrücklich **synthetische Unit-Test-Fixtures**, keine nativen
Erfolgsbelege und keine Eingabe für eine tatsächliche Signierung.
Syntaxprüfung aller neuen Module und `git diff --check` bestanden.

Eine erste reale, unsignierte R9-Rekonstruktion stoppte vor dem Anlegen eines
Kandidaten an der fehlenden UI-Testabhängigkeit `typescript`. Nach regulärer
Installation der gesperrten UI-Testabhängigkeiten bestand dieser Prebuilt-Schritt;
der nächste Versuch stoppte beim Source-Overlay mit `R9_SOURCE_CHANGED`, weil
parallel bearbeitete Paketdateien zwischen Dateiliste und Kopie verändert wurden.
Beide Schutzprüfungen wurden nicht umgangen; der erste Teilbaum blieb unsigniert.

Der anschließende frische Versuch nach Einfrieren der Komponenten hat die reale
Rekonstruktion, Gesamt-Payloadprüfung, SBOM-Dateibindung, kanonischen Modi und den
strikten R9→R10-Übergang **bestanden**: 22.329 Payloaddateien, 45 App-Dateideltas.
Admin-, UI- und Devices-Pakete sind vollständig unverändert; EEBUS hat 12,
OCPP 12, Backup 18, das Controllerprofil eine und die Backup-CLI zwei Änderungen.
Insbesondere war **keine Ausnahme** von der vollständigen Admin-/UI-Präfixbindung
erforderlich. Die tatsächlich gepackten Quellen unterscheiden sich hier von
zusätzlichen, nicht gepackten Checkout-Assets.

Nachweis: [unsigned-payload-verification.json](unsigned-payload-verification.json).
Dies war ein lokaler **unsignierter Implementierungscheck** mit Node 24.19.0 und
noch nicht committed Quelländerungen; kein qualifizierter Releasebuild und kein
nativer Erfolgsbeleg. Die Laufzeit-SBOM bindet 686 installierte Pakete, 639
eindeutige npm-Komponenten und sieben eingebettete Komponenten. Eine neue
Schwachstellenprüfung oder ein OS-Inventar wird damit nicht behauptet.
Qualifizierter nativer Test, Signierung, neues Archiv-Readback und Veröffentlichung
sind für diesen Arbeitsschritt **nicht ausgeführt/bestanden**.

Ein separater unabhängiger Review des begrenzten Updaters einschließlich
35/35 wiederholter Fehlerinjektionstests steht in
[updater-independent-review.md](updater-independent-review.md).

## Ergänzung: gepinnte Shutdown-Korrektur

Nach dem reproduzierten Shutdown-Wettlauf im vierten nativen Lauf wurde die
Ableitung um genau zwei gepinnte Adapterkern-Dateien erweitert. Die
[lokale vollständige Rekonstruktion](shutdown-payload-verification.json)
bestand erneut: 22.201 App-Dateien, 22.331 Payloaddateien, 51 App-Deltas,
vollständige SBOM-, Quellen- und R9→R10-Übergangsprüfung. Die
[60 Integrations-/SBOM-Vertragstests](shutdown-integration-contracts.tap)
bestanden ebenfalls. Das ist ein unsignierter lokaler Nachweis unter Node
24.19.0 mit uncommitteten Quellen; Signierung und native Qualifikation bleiben
gesonderte Gates. Der [Shutdown-Bericht](../ci-repair/ADAPTER_SHUTDOWN_DE.md)
beschreibt die tatsächliche Reproduktion, Korrektur und verbleibenden Grenzen.
