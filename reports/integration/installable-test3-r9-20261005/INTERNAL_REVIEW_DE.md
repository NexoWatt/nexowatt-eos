# Interne unabhängige Quellprüfung des R9-Build- und SBOM-Pfads

Stand: 2026-10-05. Ein paralleler interner Reviewer hat die Änderungen unabhängig
von den implementierenden Agents geprüft. Dies ist kein externer Audit. Grundlage
war der gemeinsame Arbeitsstand auf Commit
`4e171e42a290119f285714beb86b669c71db7171` einschließlich noch nicht commiteter
R9-Änderungen; eine abschließende Bindung an den späteren Liefercommit ist damit
nicht behauptet.

## Umfang und Ergebnis

Gelesen wurden `build-revision.cjs`, `verify-candidate.cjs`,
`tools/integration/bind-r9-derivative-sbom.cjs`,
`runtime/release/sbom-binding.cjs` und `runtime/release/embedded-packages.json`.
Im geprüften Paket-, Signatur- und SBOM-Pfad wurde kein materieller Blocker
festgestellt. Die neu bearbeitete native Evidenzprüfung war nicht Gegenstand
eines abschließenden Reviews.

- Das Overlay ist auf direkte Dateien der sechs eigenen Adapter begrenzt.
  Die installierte Root-Abhängigkeitsdatei, fremde und verschachtelte
  NPM-Paketdateien sowie eingebettetes `crypto-js` bleiben an die R8-Bytes und
  Dateimodi gebunden.
- Die sechs aktuellen `package.json` wurden direkt gegen die authentische
  R8-Kopie geprüft. Zugelassen blieben nur die ausdrücklich modellierten
  Node-Engine-Einschränkungen für EEBUS/OCPP und die bereits im gebundenen
  EEBUS-Quelllock vorhandene Mocha-Deklaration. Es fand keine NPM-Auflösung statt.
- Die Ableitung verschiebt frühere Archivhashes in die Abstammung und bindet
  aktuelle eigene Paketbäume gesondert nach Inhalt und Dateimodus. Die sechs
  eingebetteten Lizenzclients erhalten getrennte Elternbeziehungen und müssen
  denselben Inhalt sowie Version 1.0.2 haben.
- Der Kandidatenprüfer rekonstruiert die vollständige signierte Nutzlast aus
  authentischem R8 und dem angegebenen Quellcommit. Er führt keinen
  Kandidatencode aus. Signatur, Dateitabelle und Begleitberichte werden
  gegengeprüft; eine selbst behauptete Kandidaten-Signatur allein reicht nicht.
- Die aktuelle Paketdateiermittlung mit `npm pack --dry-run --json
  --ignore-scripts --offline` ergab 2.061 Quelldateien und keine ausführbare
  eigene Quelldatei. Der untersuchte eigene Overlaybestand erzeugt dadurch
  keinen Konflikt mit der kanonischen Archiv-Modusregel.

## Tatsächlich ausgeführte Prüfungen

Lokale Umgebung: Linux, Node.js `v24.19.0`.

Die authentische R8-Kopie unter `/tmp/eos-r9-r8-base-a_4hhk48` wurde mit
`verifyBase()` vollständig nach den fest kodierten Archiv-, Schlüssel- und
Delivery-Hashes sowie Ed25519-Signatur geprüft. Ergebnis:

- Release-ID `eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`,
  Sequenz 11, 22.842 Nutzlastdateien.
- Die extrahierte Nutzlast unter `/tmp/eos-r9-r8-authenticated/bundle/payload`
  hatte exakt dieselbe vollständige Dateitabelle wie das authentische Manifest.
- Der aktuelle erweiterte `verifySbomBinding()` akzeptierte diesen unveränderten
  R8-Bestand: 686 installierte Pakete, 639 eindeutige NPM-Komponenten,
  drei eingebettete Pakete. Die alten eingebetteten Bindungen bleiben kompatibel.

Folgender Lauf bestand mit **26 Tests, 26 bestanden, 0 fehlgeschlagen,
0 übersprungen**:

```sh
node --test tests/integration/r9-derivative-sbom.test.cjs \
  tests/system/sbom-binding.test.cjs \
  reports/integration/installable-test3-r9-20261005/build-revision.test.cjs
```

Die Tests umfassen unter anderem fremde Datei- und Modusänderungen, geänderte
Paketverträge, versteckte NPM-Grenzen, abweichende Clientkopien, alte
SBOM-Bindungen, fehlende Elternbeziehungen, falsche Scanbehauptungen und
fehlende native Signierevidenz. `git diff --check` für den geprüften Pfad war
ebenfalls erfolgreich.

## Zusätzliches Finding im nativen Testvertrag

Beim begrenzten Mitlesen des neuen nativen Managementtests wurde ein konkreter
Fehler festgestellt: Die Negativprobe in
`tests/integration-r9/management.integration.cjs` erwartete
`EOS_PLATFORM_PROCESS`, während der tatsächliche kanonische Produktionsclient
bei einem unzulässigen Prozesseinstieg `EOS_PLATFORM_ENTRY` ausgibt. Der Test
würde deshalb auch bei korrekt arbeitendem Schutz fehlschlagen.

Der zuständige Agent und der koordinierende Reviewer wurden direkt informiert.
Die beiden Testerwartungen wurden auf `EOS_PLATFORM_ENTRY` korrigiert. Der
Reviewer hat diese Änderung erneut unmittelbar in der Datei geprüft; der
Produktionsschutz blieb unverändert. Der implementierende Agent meldete
zusätzlich 10 bestandene lokale Vertragsprüfungen. Diese Meldung ersetzt
keinen tatsächlich ausgeführten nativen Managementlauf.

## Aussagegrenzen

Dieser Review hat weder signiert noch historische Lieferdateien verändert.
Er hat keinen nativen Node.js-24.21.0-Managementlauf, keinen fertigen signierten
R9-Kandidaten und kein Raspberry-Pi-Update ausgeführt. Die vollständige neue
unsignierte R9-Zusammenstellung nach dem finalen Admin-Seal sowie die native
Quellcommit-/App-Bindung werden separat nachgewiesen. Hardwareabnahme,
physische Adapterfreigabe und Produktionsfreigabe sind nicht behauptet.
