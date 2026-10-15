# R10: veröffentlichte, nachweisgebundene Testlieferung

Stand: 15.10.2026. **R10 wurde nativ qualifiziert, signiert und veröffentlicht.**
Der öffentliche Update-Einstieg und sein gepinnter Befehl wurden rückgelesen.
Historische R9-/R8-Dateien bleiben unverändert. **Der Pi wurde nicht aktualisiert;
eine Produktionsfreigabe besteht nicht.**

Die Testlieferung `0.2.0-test.3`, Sequenz **13**, liegt unter
`delivery/test-pi-0.2.0-test.3-r10`. Der Builder erzeugt den Kandidaten; die
getrennte [Veröffentlichungspipeline](publication-pipeline.md) prüft und publiziert
ihn. Fehlende, fehlgeschlagene oder nicht zum konkreten Quellstand und Kandidaten
passende native Nachweise verhindern weiterhin die Signierung.

## Tatsächlicher Liefer- und Prüfstand

| Bindung | Wert |
| --- | --- |
| Quellcommit | `ad5bea8de208d6ae2ad4d23b662c9f29701675a0` |
| Release-ID | `9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0` |
| Archiv-SHA-256 | `0744417d8a9ece466a097170bf8636b463cd94dde03203e3df96e8d38290bb55` |
| Archivgröße | 88.999.180 Bytes |
| Signiertes Inventar | 22.331 Dateien |

Der [native Sicherheitslauf 38717983127](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717983127)
bestand alle acht Prüfgruppen einschließlich **21/21 nativer Checks**. Die
[R10-Veröffentlichung 38718750400](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38718750400)
bestand alle vier Jobs: Signierung, unabhängige vollständige Rekonstruktion im
Publishjob sowie Veröffentlichung und öffentlicher Assetvergleich sind belegt.
[CodeQL 38717982998](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982998)
und [Workflowvalidierung 38717982894](https://github.com/NexoWatt/nexowatt-eos/actions/runs/38717982894)
sind ebenfalls erfolgreich abgeschlossen.

Rohbelege: [Delivery](delivery.json), [Buildprüfung](build-verification.json),
[native Workflowbindung](native-workflow.json),
[abschließender Workflowstatus](final-workflow-status.json),
[öffentlicher Assetvergleich](../../../../delivery/public-update-test3-r10/remote-readback.json)
und [unabhängiger Befehlsvergleich](public-command-readback.json).
`published: false` in der unveränderten Buildprüfung beschreibt ihren
Erstellungszeitpunkt vor der anschließenden Veröffentlichung, nicht den heutigen
Lieferstand. Der [veröffentlichte Updatebefehl](https://github.com/NexoWatt/nexowatt-eos/blob/f264bb9f7510a0e2d21637a39f8b9fc9464bdec9/delivery/public-update-test3-r10/UPDATE_COMMAND.txt)
ist auf seinen Commit gepinnt.

Der native Lauf ist kein Zielgerätetest. Pi/ARM64, Systemd-Mountverhalten,
Anlagenanbindungen, vollständiger Restore und die 50-/100-ms-Reaktionsziele
bleiben offen. Bekannte Forge-/AJV-Befunde sind nicht geschlossen. Der
erfolgreiche CodeQL-Lauf belegt keine Abwesenheit von Alerts; eine vollständige
Alert-Aufzählung wurde hier nicht durchgeführt. Eine Produktions- oder
CRA-Konformitätsfreigabe wird daraus nicht abgeleitet.

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
Die getrennte Veröffentlichung und der unabhängig rückgelesene Downloadbefehl
sind in [publication-pipeline.md](publication-pipeline.md) dokumentiert.

`verify-candidate.cjs` wird ausschließlich aus dem vertrauenswürdigen, sauberen
Quellcheckout ausgeführt. Er authentifiziert R9 erneut, rekonstruiert den gesamten
Kandidaten, prüft das vollständige signierte Manifest, SBOM, Quellbindung,
Upload-Abbildung, nativen Nachweis und sämtliche Releaseberichts-Felder. Dateien
aus dem Kandidatenverzeichnis werden nur als Daten gelesen, niemals importiert
oder als Skript gestartet. Ein selbst gewählter Kandidatenschlüssel allein kann
die vollständige Rekonstruktion nicht ersetzen.

Herstelleraufruf nach bestandener nativer CI, nicht auf dem Kunden-Pi.
Die bereits veröffentlichte R10-Lieferung darf damit nicht überschrieben werden:

```sh
node reports/integration/own-adapter-test-20261015/release/build-revision.cjs \
  --native-evidence /absolute/trusted-native-ci-evidence

node reports/integration/own-adapter-test-20261015/release/verify-candidate.cjs \
  /absolute/candidate 40-stellige-commit-sha \
  --native-evidence /absolute/trusted-native-ci-evidence
```

## Historische lokale Implementierungsprüfungen

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
waren in diesem damaligen lokalen Arbeitsschritt **nicht ausgeführt/bestanden**.
Die später bestandenen Releasegates sind oben gesondert dokumentiert.

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
bestanden ebenfalls. Das bleibt ein unsignierter lokaler Nachweis unter Node
24.19.0 mit damals uncommitteten Quellen. Signierung und native Qualifikation
wurden erst in den oben genannten späteren Workflows nachgewiesen.
Der [Shutdown-Bericht](../ci-repair/ADAPTER_SHUTDOWN_DE.md)
beschreibt die tatsächliche Reproduktion, Korrektur und verbleibenden Grenzen.
