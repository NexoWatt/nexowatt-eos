# R9: nachvollziehbare SBOM für sechs Adapter-Quellüberlagerungen

Stand: 05.10.2026. Kennung **R9-SBOM-01**. Ausgangspunkt ist die authentifizierte
R8-Testlieferung, Sequenz 11, Release-ID
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`.

`tools/integration/bind-r9-derivative-sbom.cjs` bindet das vorhandene CycloneDX-
1.5-Inventar an die tatsächlich zusammengesetzte R9-App. Der Aufrufer prüft zuerst
die R8-Signatur. Der Binder prüft zusätzlich, dass die übergebene alte SBOM und
die für Vergleiche gelesenen alten Paketmetadaten zu den authentifizierten
Dateihashes und Dateimodi gehören.

## Enger Änderungsrahmen

- Root-`package.json`, Root-`package-lock.json`, fremde installierte Pakete und
  verschachtelte `node_modules` müssen in Inhalt und Ausführbarkeitsmodus
  unverändert bleiben. Auch das eingebettete Drittanbieterpaket `crypto-js`
  darf nicht verändert werden.
- Zulässig sind Quellpaketdateien der sechs expliziten Produkte aus
  `runtime/product/scope.cjs`: Admin, UI, Devices, EEBUS, OCPP und Backup.
  Paketname, Version, Haupteinstieg und sämtliche nicht ausdrücklich
  ausgenommenen Metadaten bleiben gleich. Das gilt insbesondere für produktive,
  optionale und Peer-Abhängigkeiten, Overrides und die übrigen Entwicklungs-
  abhängigkeiten. `files` und `scripts` dürfen den geänderten Lieferumfang und
  dessen Prüfungen beschreiben.
- Nur EEBUS und OCPP dürfen den bisherigen Node-Bereich `>=20` auf genau
  `>=22.0.0 <23 || >=24.0.0 <25` einschränken.
- Nur EEBUS darf `mocha` als direkte Entwicklungsabhängigkeit exakt `11.8.0`
  ergänzen. R8 enthielt keinen EEBUS-Quell-Lock im App-Paket. Deshalb wird dessen
  vorherige Existenz **nicht** als installierte Lock-Evidenz ausgegeben: der
  Binder verlangt den exakt gepinnten Git-Quell-Lock aus dem im signierten R8-
  SBOM genannten Commit `f35789c8453be7ce9bca0bbbf3be870e0ed0a836`, Pfad
  `components/eebus/package-lock.json`, SHA-256
  `7173b59b716b239bc695de87bbdedf6f6df2c4583a4dd5623a99ebbf0eb0f77f`.
  Dort war Mocha 11.8.0 bereits aufgelöst. Es wird kein neues npm-Paket bezogen
  oder in den installierten Abhängigkeitsbaum aufgenommen.

Jeder der sechs Adapter erhält einen aktuellen Inhalts- und Modus-Baumhash
sowie einen Änderungstabellenhash. Frühere Archivhashes stehen ausschließlich
in der Herkunftskette, nicht als falscher Hash der geänderten Dateien.

Die gemeinsame Datei `runtime/release/embedded-packages.json` erfasst Crypto-JS
und sechs getrennte Kopien von `@nexowatt/eos-license-client`. Devices verwendet
`lib/eos-license-client`, die anderen Adapter `packages/eos-license-client`.
R9 verlangt alle sechs Clients mit Version 1.0.2 und identischen Datei-Inhalten.
Jede Kopie hat einen eigenen `bom-ref`, Manifest-/Baumhash und eine Beziehung
zu ihrem tatsächlichen Adapter. Unbekannte Laufzeitabhängigkeiten der
eingebetteten Pakete werden abgewiesen.

Der Offline-Releasegate prüft diese Beziehungen und für R9 außerdem den
gesamten App-Inhalts-/Modushash sowie alle sechs Adapter-Baumhashes. Der
R9-Vertrag folgt der unabhängig geprüften Release-Sequenz 12; bereits einer
der vier gegenüber R8 neuen Clientpfade aktiviert ihn zusätzlich bei isolierten
Dateiprüfungen. Entfernen des SBOM-Assemblymarkers oder der neuen Clientkopien
kann ihn deshalb nicht abschalten. Ein solcher Marker-Ausweg wurde in einer
separaten Quellprüfung tatsächlich reproduziert, korrigiert und negativ getestet.
Python-
Inventarisierung und JavaScript-Gate verwenden dieselbe Pfadliste.

## Tatsächlich ausgeführte Prüfungen

Linux, Node 24.19.0; Befehle ab Repositorywurzel.

| Prüfung | Befehl / Nachweis | Ergebnis |
| --- | --- | --- |
| R9-Positiv-/Negativtests und Offlinegate | `node --test tests/integration/r9-derivative-sbom.test.cjs tests/system/sbom-binding.test.cjs`; `raw/derivative-and-binding.log` | 21/21 bestanden |
| Python-Inventar mit sechs getrennten Clientkopien | `python tests/integration/embedded-sbom.test.py`; `raw/embedded-sbom.log` | 7/7 bestanden |
| Rückwärtsverträglichkeit am authentifizierten R8-Payload | `verifySbomBinding(payload, manifest.files)`; `r8-compatibility.json` | Bestanden: 686 installierte Pakete, 639 eindeutige npm-Komponenten, 3 eingebettete Pakete |
| Release-/Bundle-Regressionen | `node --test tests/system/bundle.test.cjs tests/system/release-cli.test.cjs`; `raw/release-regression.log` | 22/22 bestanden |
| Finaler vollständig zusammengesetzter, unsignierter R9-Payload | Erneuter Aufruf von `verifySbomBinding(payload, inventory(payload), undefined, {sequence: 12})`; `final-unsigned-binding.json` | Bestanden: 686 installierte Pakete, 639 eindeutige npm-Komponenten, 7 eingebettete Pakete |
| Offline-CycloneDX-1.5-Schemastruktur des finalen R9-SBOM | `validate-final-schema.cjs`; `schema-validation.json` | Bestanden, keine Strukturfehler; Format-Anmerkungen `idn-email` und `iri-reference` nicht validiert |

Die Negativtests erfassen unter anderem fremde Datei-/Modusänderungen,
zusätzliche npm-Auflösungsgrenzen, falsche Paketidentität, unzulässige
Abhängigkeiten, manipulierte Altmetadaten, Client-Drift, fehlende Elternbezüge,
veraltete Baumhashes, fehlende oder gefälschte separate EEBUS-Quell-Lock-Belege
und erfundene neue Scanbehauptungen. Die Quell- und
Paketfelder bleiben überprüfbar; es wurde keine Sperre durch eine pauschale
„Metadatenänderungen sind erlaubt“-Ausnahme ersetzt.

Der konkrete vollständig zusammengesetzte R9-Payload wurde am 05.10.2026 um
19:39 UTC erfolgreich vom R9-Builder und danach erneut unabhängig geprüft.
Der vollständige Buildernachweis steht in
[`local-unsigned-payload-verification.json`](../installable-test3-r9-20261005/local-unsigned-payload-verification.json):
authentifizierte R8-Signatur, 22.842 vorherige signierte Dateien, 2.061
Quellpaketdateien, 839 Überlagerungen, 628 entfernte eigene Dateien, 22.194
App-Dateien, 646 SBOM-Komponenten und sechs Derivate. App-Inhalts-Hash:
`352c935eb552fe206c4826915e7a3464a8ec685f693a111def4d94d735c28d86`.
Hash des konkret validierten SBOM:
`9836d5cb6d46098035a6801aca8aefc0f1dcf2179407c69e3c27649a1af42826`.
Der Builder weist die Arbeitskopie ausdrücklich als nicht sauber committet
und den Payload als **unsigniert** aus. Der Test ist keine signierte Lieferung.

Das Python-Schemaprogramm konnte lokal wegen fehlendem `jsonschema` nicht
ausgeführt werden. Der tatsächlich ausgeführte Ersatz verwendet Ajv 8.20.0
und `ajv-formats` aus dem authentifizierten unveränderten R8-Abhängigkeitsbaum
mit den im Repository vorhandenen CycloneDX-1.5-Schemas. Es wird nichts
installiert. Wiederholung (Pfade auf den jeweiligen lokalen Payload anpassen):

```sh
node reports/integration/r9-derivative-sbom-20261005/validate-final-schema.cjs \
  /tmp/eos-r9-final-unsigned-Fhdd9P/payload/sbom.cdx.json \
  /tmp/eos-r9-final-unsigned-Fhdd9P/prepared/r8/bundle/payload/app \
  reports/integration/r9-derivative-sbom-20261005/schema-validation.json
```

Diese Arbeiten führen weder einen neuen Schwachstellenscan noch eine neue
npm-Auflösung, Betriebssystem-/Firmware-Inventarisierung oder einen
Hardwaretest aus. Solche Leistungen und eine Produktionsfreigabe werden in
den maschinenlesbaren Belegen ausdrücklich als nicht durchgeführt markiert.
