# SBOM-Vorbereitung – Implementierungsstand 2026-09-30

**Status:** implementierte, lokal prüfbare Vorbereitung einer **unvollständigen Quell-SBOM**; keine Build-, Liefer- oder Geräte-SBOM. Kennung `EOS-ARCH-SBOM-01`. Das Werkzeug verändert keine EOS-Funktion, keinen Adapter und keine Benutzeroberfläche.

## Nachweis und Grenzen

`tools/sbom/source_sbom.py` erzeugt CycloneDX **1.7 JSON** nach dem offiziellen Schema. Es liest ausschließlich die root `package.json` und zwei Git-Identitätsnachweise: HEAD-Commit und unverändertes `HEAD:package.json`-Blob. Beobachtet wird derzeit das Installer-Quellpaket `@iobroker/install`, Version `6.0.1`. Der Hash ist der SHA-256 der tatsächlich gelesenen Manifestdatei. Er ist **kein Hash des gesamten Quellbaums oder eines installierten Produkts**. Ein veränderter Gesamtarbeitsbaum wird nicht als sauber bescheinigt; `remainingWorkingTree` bleibt `not-inventoried`.

Die SBOM markiert `lifecycles: pre-build`, `aggregate: incomplete` und `eos:sbom:completeness: partial`. Deklarierte Paketbereiche werden ausschließlich im separaten Coverage-JSON als `unresolved` ausgegeben. Aus `^1.2.3` wird keine angeblich installierte Version `1.2.3`. Es werden keine vollständigen Abhängigkeitskanten, Schwachstellenfreiheit oder Lizenzprüfungen behauptet.

Offen bleiben tatsächliche direkte/transitive Paketversionen, produktiver EOS Admin 7, NexoWatt UI, Devices, Backitup, EEBUS, Controller, Node.js, Linux/Kernel/Firmware sowie das Geräteinventar. Diese Versionen werden nicht aus früheren Gesprächsaussagen übernommen. Eine Root-SBOM ersetzt die separaten SBOMs der später ausgewählten Komponenten und des Images nicht.

## Reproduzierbare Verwendung

Voraussetzung: Python 3.12, Git und die für die Architekturprüfung festgelegte Python-Umgebung mit `jsonschema==4.26.0`. Python-Werkzeug und Schemas werden lokal verwendet; die Generierung hat keinen Netzwerkbedarf und führt kein `npm install` oder Paket-Lifecycle-Skript aus.

```bash
python tools/sbom/source_sbom.py --repo . --output /tmp/eos-source.cdx.json --coverage /tmp/eos-source.coverage.json
python tools/sbom/source_sbom.py --validate /tmp/eos-source.cdx.json
python tests/architecture/sbom.test.py
```

Die Ausgabedateien müssen **neu** sein und ihr Zielverzeichnis muss existieren. Bestehende Dateien, Symlink-Ziele und Symlinks im Verzeichnispfad werden verweigert. Ausgabe erfolgt atomar pro Datei mit Modus `0600`; vorhandene Dateien werden niemals ersetzt. Das Dateipaar ist keine übergreifende Transaktion: Nur Exit-Code 0 plus erfolgreiche Validierung kennzeichnet den vollständig erzeugten Satz. Bei einem I/O-Fehler kann die bereits geschriebene Coverage-Datei stehen bleiben; diese allein ist kein fertiger Nachweis. Der Aufruf benötigt keine Administratorrechte und gehört nicht auf einen privilegierten oder produktionsnahen Runner.

`--validate` prüft offizielles Format und die hier vereinbarte eingeschränkte Quell-Scope-Semantik. Dies ist **keine Signaturprüfung** und beweist nicht die Herkunft einer fremden Datei. Der Import einer späteren Release-SBOM benötigt die verifizierte Release-Signatur und Artefaktbindung.

Für identischen beobachteten Manifeststand und Git-HEAD ist die Ausgabe deterministisch. Es gibt deshalb keinen erfundenen Buildzeitpunkt. Den tatsächlichen Ausführungszeitpunkt protokolliert der aufrufende Test-/CI-Lauf. Autoren, Paket-URLs, Skripte, Konfiguration und Umgebungsvariablen werden nicht exportiert. Nicht-semverartige Abhängigkeitswerte werden redigiert; diese gezielte Datenminimierung ersetzt keinen allgemeinen Geheimnisscan des Lieferpakets.

## Schemaherkunft und Offlinevalidierung

Quelle: [CycloneDX-Spezifikation](https://cyclonedx.org/specification/overview/) und [offizieller Git-Tag 1.7](https://github.com/CycloneDX/specification/tree/4b3f59453366e27c8073fd24e98bf21ef8892c8e). Abgerufen am 30.09.2026. Vendort ist Commit `4b3f59453366e27c8073fd24e98bf21ef8892c8e`; die vier unveränderten JSON-Schemata einschließlich SPDX-, JSF- und Kryptografie-Referenzen sowie die Apache-2.0-Lizenz liegen in `tools/sbom/vendor/cyclonedx-1.7/`. `PROVENANCE.json` enthält die einzelnen SHA-256-Werte. Der Validator prüft diese Hashes vor Verwendung; jede Referenz wird ausschließlich aus dem lokalen Registry aufgelöst. Ein gemeinsam manipuliertes Schema und Hashmanifest kann diese Integritätskontrolle umgehen: Der geprüfte Repository-/Release-Stand bleibt die Vertrauenswurzel.

## Bedrohungsmodell (STRIDE)

| ID | Bedrohung / Grenze | Implementierte Gegenmaßnahme | Nachweis / Restpunkt |
|---|---|---|---|
| SBOM-S1 | Vorgebliche installierte/komplette Komponenten | Fester source/pre-build-Scope; unaufgelöste Bereiche separat; `incomplete` erzwungen | Tests für complete-/operations-Manipulation und erfundenes Inventar; spätere reale Buildinventur offen |
| SBOM-T1 | Manipulierte oder mehrdeutige Manifestdaten | Begrenztes JSON, keine Duplicate Keys/NaN, strikte Namen-/Versionsprüfung, SHA-256 und HEAD-Manifestvergleich | Negative JSON-/Metadatentests; Hash ist keine Signatur |
| SBOM-R1 | Nicht nachvollziehbarer Herkunftsnachweis | Generatorversion, Git-HEAD, Manifesthash, vendorte Schemabelege | CI muss Laufzeitpunkt und Releaseartefakthash zusätzlich archivieren |
| SBOM-I1 | Geheimnisse in Paketmetadaten/URLs gelangen in Bericht | Nur erforderliche Felder, keine Autoren/URLs/Config/Umgebung; nicht-semverartige Spezifikationen redigiert; Fehlercodes statt Rohwerte | Test mit synthetischen Geheimnissentinels; frei gewählte Paketnamen sind keine Geheimnisablage |
| SBOM-D1 | Übergröße, fehlerhafte Struktur, Symlink-/FIFO-Eingaben | Maximal 1 MiB Manifest, begrenzte Namen/Einträge, reguläre Datei ohne finalen Symlink, Git-Zeitlimit | Größen-/Strukturtests; nur betreute lokale Repositorys, keine beliebig großen fremden Git-Objekte |
| SBOM-E1 | Skriptausführung oder Überschreiben fremder Dateien | Kein npm, keine Shell, keine Git-Status-/Diff-Filter, keine Netzwerkauflösung; `O_NOFOLLOW`/Directory-FDs/atomare neue Dateien | Test eines bösartigen Git-clean-Filters, Symlink- und Bestandsdateitests; Prozess ohne root ausführen |

## Automatisierung und nächste Lieferstufe

Bei relevanten Repositoryänderungen kann CI diese Vorbereitung erneut erstellen, validieren und mit den Testergebnissen archivieren. Das bedeutet einen tatsächlichen CI-Aufruf, keine dauerhaft laufende Hintergrundüberwachung. Eine spätere Release-Pipeline muss **aus dem aufgelösten und tatsächlich gebündelten Lieferstand** die vollständigen Komponenten einschließlich nativer/OS-Pakete erfassen, deren Lizenzen prüfen, Schwachstellen zuordnen, Quellen/Hashes binden und die SBOM mit dem Release signiert veröffentlichen. Quell-, Build- und Geräteinventar bleiben dabei unterscheidbare Nachweise.

**Freigabegrenze:** Dieses Werkzeug bereitet nachvollziehbare Daten vor. Die vorhandenen Inventarlücken bleiben Releasehindernisse für die Behauptung einer vollständigen EOS-Produkt-SBOM. Eine SBOM allein weist weder CRA-Konformität noch IEC-Konformität nach.
