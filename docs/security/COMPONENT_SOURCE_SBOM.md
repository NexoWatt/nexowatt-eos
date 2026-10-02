# Komponentenbezogene Quell-SBOM: begrenzte Entwicklungsevidenz

Stand: 30.09.2026. Werkzeug `tools/sbom/component_sources.py`, Version `0.2.1`.
Eingang: `system/components/source-inventory.json`, Schema-Version **2**. Das Werkzeug ergänzt die
[Installer-Quell-SBOM](SBOM_PIPELINE.md), ersetzt aber keine Build-, Release- oder
Geräte-SBOM. Es verändert keine EOS-Laufzeit, Adapter, Dienste oder Hostkonfiguration.

## Aussage und Grenzen

Der Eingangskatalog umfasst genau neun Komponenten: EOS-Installer, js-controller,
adapter-core, EOS Admin, NexoWatt UI, Devices, EEBUS, OCPP21 und Backitup. Der
js-controller darf nicht durch eine unvollständige Auswahl verschwinden.
Nicht zugängliche Quellen bleiben mit expliziten `null`-Feldern im Katalog und
als fehlende Komponentenkennung in den Metadaten der SBOM sichtbar. Sie erhalten
keine erfundene Paketversion oder Komponente im CycloneDX-Komponentenbaum.

Beobachtete Quellen benötigen einen Paketnamen, eine exakte Semver-Version und
SHA-256 des Paketmanifests. Die Herkunft wird als ausdrücklich unterscheidbarer
`provenance`-Datensatz erfasst:

| Herkunft | Erforderliche Werte | Erlaubter Quellumfang |
| --- | --- | --- |
| `git-commit` | `commit`: 40-stelliger Git-Hash; `archiveSha256`: `null` | `complete-checkout` oder `selected-files` |
| `user-uploaded-archive` | `commit`: `null`; `archiveSha256`: SHA-256 des originalen ZIP-Uploads; `sourceRef`: `null` | `complete-archive` |
| `unresolved` | `commit`: `null`; `archiveSha256`: `null`; beobachtete Paketmetadaten: `null` | `not-accessible` |

Das frühere direkte `component.commit`-Feld ist nicht mehr erlaubt. Gemischte
Herkunftsangaben werden zurückgewiesen. Bei Git-Quellen enthält der VCS-Verweis
nur die unveränderte deklarierte Repository-URL mit einem Herkunftskommentar.
Der Commit bleibt eine getrennte Eigenschaft; seine Verfügbarkeit auf dem
Remote ist ausdrücklich `unverified-by-generator`. Insbesondere ein lokaler,
unveröffentlichter Commit darf keinen vermeintlich erreichbaren GitHub-Tree-Link
erhalten. Bei einem Nutzerarchiv steht der Hash
nur als Eigenschaft mit Scope **`original-uploaded-zip`**. Die angegebene
GitHub-URL ist dann ausschließlich eine deklarierte, ungeprüfte Herkunftsangabe;
es wird kein VCS-Verweis mit erfundenem Commit oder Branch erzeugt. Ein zuvor
fehlgeschlagener GitHub-Zugriff wird durch einen ZIP-Upload nicht nachträglich
als erfolgreich bestätigt. Der Generator prüft nicht selbst den Upload oder
extrahiert Archive: Diese Erhebung muss vor dem Katalogeintrag erfolgen.

Ein vorhandener Checkout oder ein vollständiges Quellarchiv ist keine Sicherheitsfreigabe.
Der Manifesthash steht ausschließlich in einer Eigenschaft mit dem ausdrücklichen
Geltungsbereich **`package.json-only-not-package-artifact`**. Er wird weder als Hash
des gesamten Pakets noch als Integritätsnachweis eines installierten Adapters
ausgegeben. Lizenzangaben bleiben ungeprüfte Quelldeklarationen.

Das erzeugte CycloneDX-1.7-Dokument enthält `pre-build` und `incomplete`, keine
Produktreleaseversion, keine Dependency-Edges, keine installierten Versionen und
keine Freigabe. Node.js, Betriebssystem, Firmware, aufgelöste Abhängigkeiten und
Geräteinventar bleiben ausdrücklich fehlende Laufzeitbereiche. Die komplette
Quelldatei des Eingangskatalogs wird per SHA-256 gebunden. Das ist keine Signatur
und beweist nicht, dass ihre Commit-, Archivhash- oder Versionsangaben authentisch erhoben
wurden; die zugehörigen Quellprüfungen bleiben erforderlich.

## Eingangsvertrag und Schutzmaßnahmen

- Nur die festgelegten JSON-Felder sind zulässig. Zusätzliche Konfigurationen,
  Passwörter oder Tokens werden nicht übernommen. Doppelte JSON-Schlüssel,
  unzulässige Datentypen und übergroße Eingaben werden abgewiesen.
- Der gemeinsame Leser begrenzt die Eingabe auf 1 MiB, akzeptiert nur reguläre
  Dateien und folgt keinem Symlink an der letzten Pfadkomponente. Ein FIFO wird
  nicht blockierend gelesen. Das Eingabeverzeichnis und die Werkzeuginstallation
  müssen vertrauenswürdig sein; dieser Leser sperrt nicht jede übergeordnete
  Verzeichnisverknüpfung.
- Nur einfache HTTPS-GitHub-Repository-URLs ohne Zugangsdaten, Query, Fragment
  oder zusätzliche Pfade sind erlaubt. URLs sind ausschließlich Metadaten;
  das Werkzeug ruft sie niemals ab. Dokumentpfade müssen relative Markdownpfade
  ohne Traversierung sein. Referenzpfade werden nicht ausgeführt oder geöffnet.
- `approved`, `releaseApproved`, `runtimeIntegrated` und
  `installedInventoryVerified` müssen echte JSON-Booleans mit Wert `false` sein;
  `installedVersion` muss `null` bleiben. Fehlende Quellzugriffe dürfen keine
  beobachteten Versions-, Lizenz-, Commit- oder Hashwerte vortäuschen.
- Das Werkzeug verwendet die lokal eingebundenen, hashgeprüften offiziellen
  CycloneDX-1.7-Schemas über `source_sbom.schema_validator()`. Alle Schema-Referenzen
  werden offline aufgelöst. Zusätzlich vergleicht `validate_document()` das
  Dokument exakt mit der erlaubten Interpretation des Eingangskatalogs. Ein
  formal gültiges CycloneDX-Dokument mit vollständiger/operativer Behauptung,
  geändertem Versionsstand oder Artefakthash wird dadurch zurückgewiesen.
- `source_sbom.write_new()` legt nur eine neue Datei atomar mit Modus `0600` an.
  Bestehende Ziele und Symlinks einschließlich verknüpfter Ausgabeeltern werden
  abgewiesen. Das Ausgabeelternverzeichnis muss schon bestehen. Fehlerausgaben
  verwenden feste Codes, keine Eingabewerte, Pfade oder Tracebacks.

## STRIDE-Bedrohungsanalyse des Werkzeugs

| Kategorie | Bedrohung | Schutz / verbleibende Grenze |
| --- | --- | --- |
| Spoofing | Ein manuell gefüllter Katalog behauptet nicht erhobene Quellen | Pflichtbelege, fehlende Quellen sichtbar, keine installierten/Freigabe-Angaben; Quellenauthentizität muss außerhalb des Generators belegt werden. |
| Tampering | Bereiche oder Versionen werden umgedeutet, Manifesthash als Pakethash dargestellt | Strikter Vertrag, Dateihashbindung, offizielle Schemaprüfung und semantischer Abgleich; kein Schutz gegen Manipulation der vertrauenswürdigen Werkzeugdateien. |
| Repudiation | Das Ergebnis lässt sich keinem Eingang zuordnen | Kataloghash, Basiscommit, Datum und Quellen-Commits beziehungsweise Archivhashes; keine unabhängige Signatur oder Freigabeentscheidung. |
| Information Disclosure | Tokens aus URL, Fehlern oder fremden JSON-Feldern gelangen in die Ausgabe | URL-/Feldbegrenzung, feste Diagnosecodes, Ausgabe `0600`; zulässige Metadaten sind vor Veröffentlichung weiterhin fachlich auf Geheimnisse zu prüfen. |
| Denial of Service | Große, rekursive oder blockierende Eingabe | Bytebegrenzung, Parserfehlerbehandlung, reguläre Dateien und nicht blockierendes Öffnen; das Werkzeug ist kein Netzwerksicherheitsdienst. |
| Elevation of Privilege | Referenzen führen Shell-/Git-/Netzwerkbefehle aus oder überschreiben Dateien | Keine solchen Aufrufe, fest verankerte lokale Helperimporte, Ausgabe ausschließlich als neue Datei; kein Betrieb mit erhöhten Rechten erforderlich. |

## Ausführung und Nachweis

Dieselben Entwicklungsabhängigkeiten wie für die vorhandenen Architekturwerkzeuge
verwenden; die dort gebundenen CPython-3.12-/Linux-x86-64-Wheels sind **keine**
ARM64-Produktruntime-Freigabe. Aus dem Repository ausführen:

```bash
.venv/bin/python tools/sbom/component_sources.py \
  --inventory system/components/source-inventory.json --check-only
.venv/bin/python tests/architecture/component-sources.test.py
.venv/bin/python tools/sbom/component_sources.py \
  --inventory system/components/source-inventory.json \
  --output sbom/eos-component-sources.cdx.json
```

Für jede erneute Erzeugung einen noch nicht vorhandenen Ausgabepfad verwenden.
`--check-only` erzeugt keine Datei; zusammen mit `--output` ist der Modus ungültig.
Die Ausgabe des Prüfbefehls bestätigt nur Katalogvertrag und begrenzte
CycloneDX-Darstellung. Sie ist keine Komponenten-, Sicherheits- oder Gerätefreigabe.

Am 30.09.2026 wurden lokal **29 isolierte Tests bestanden** und der tatsächliche
Eingangskatalog erfolgreich mit `--check-only` geprüft. Testumgebung:
`/workspace/scratch/6383b3161c96/architecture-lock-venv/bin/python` mit den
vorhandenen gebundenen Entwicklungsabhängigkeiten. Die Tests prüfen unter anderem
fehlende UI-Quellen, Controller-Pflicht, Semver-Ranges, Zugangsdaten in URLs,
Traversal, unzulässige Freigaben, falsch zugeordnete Hashes, Parsergrenzen,
Symlinks/FIFOs, Nichtüberschreiben und Ausführung ohne Netzwerk-/Prozessaufrufe.
Die Erweiterung prüft außerdem korrekte Archivherkunft, Null-Commit,
inkonsistente Git-/Archivkombinationen und das Verbot erfundener VCS-Verweise
beziehungsweise hochgestufter Paketartefakthashes. Ein zusätzlicher Negativtest
weist nachträglich konstruierte GitHub-Tree-Verweise für Git-Quellen zurück.
Der aktuelle Katalog enthält
die UI als bereitgestelltes Quellarchiv; die weiterhin unvollständige SBOM
erfasst damit neun beobachtete Quellen.
Kein Adapter wurde dafür gestartet oder installiert. Eine vollständige
Abhängigkeitsauflösung, Schwachstellenprüfung und Hardwareprüfung wurde mit
diesem Werkzeug nicht durchgeführt.

## Weiterer Nachweisbedarf

Die Quellreviews müssen die beobachteten Versionen und Commits fachlich bestätigen.
Für die Freigabe folgt eine separate SBOM aus dem tatsächlichen reproduzierbar
gebundenen Build samt transitiven Abhängigkeiten, OS-/Firmwarebestand,
Lizenzprüfung, Artefakthashes und Inventarabgleich. Auch ausgewählte Dateien aus
einem Repository sind noch kein vollständiger Produktbuild. Bis dahin bleiben
die bestehenden Systemfreigabegates und Hardwaretests offen.
