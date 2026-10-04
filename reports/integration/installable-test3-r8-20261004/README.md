# R8-Kandidat nach gestopptem R7-Rückfall

Stand 04.10.2026: neue Herstellerwerkzeuge für Revision 8 / Sequenz 11 von
`0.2.0-test.3`, Linux ARM64 mit Node 24.21.0. **Noch nicht signiert, veröffentlicht
oder auf dem Pi geprüft.** Der R7-Versuch erreichte laut Pi-Rückmeldung die
Controller-Bereitschaft und wurde anschließend zurückgenommen. Die ursprüngliche
Fehlerphase ist nicht erhalten; zurück blieb ein gesperrter, gestoppter R4-Stand. Die neuen Werkzeuge behandeln
nur diesen eng bestimmten Wiederaufnahmeweg; sie überschreiben keine R7-Lieferung.

## Tatsächliche Ableitung

Die Basis ist die veröffentlichte R7-Lieferung aus Commit
`be4da7c316467e5b274b1e2f293e3dc4ef72721b`: Archivgröße 97.495.870 Byte,
SHA-256 `a8273ad1bf23bdd2ae50f45afea8875c04e31c40464dea3c3a2c5ffca921b64a`,
Release-ID `d400cab68939e60e22b619b78b3ecc4a4043afbfe6e21696934db42ba586d5a3`.
Archiv, Schlüssel, Liefermetadaten und jede signierte Datei werden authentifiziert.

Der gesamte App-Baum bleibt **byte- und modusgleich** zu R7. Das umfasst die
bereits korrigierten PID-Module und alle PostgreSQL-Backendmodule. Die sechs
Backendquellen werden mit ihren tatsächlichen App-Dateien verglichen; jede
weitere App-/Abhängigkeitsänderung führt zum Abbruch. Es gibt keine erneute
PID-Transformation, Paketinstallation, npm-Auflösung oder Transpilation.

Neu übernommen werden die geprüften Hostquellen einschließlich korrigiertem
`tools/system/onboard-ui.cjs` und dem neuen
`tools/system/recover-r4-restored-r7-to-r8.cjs`. Der Builder verweigert einen
Kandidaten ohne diese beiden Änderungen. Der historische R7-Reparaturhelfer
bleibt bytegleich, da der neue Koordinator dessen geprüfte Datenvalidierung
wiederverwendet. Systemd-Units und PostgreSQL-Schema dürfen sich nicht ändern.

Die CycloneDX-SBOM erhält den neuen Host-Quellbezug, während sämtliche
Komponenten, Abhängigkeitsgraphen, Ursprungsnachweise und vorhandenen
R7-Paketderivate unverändert bleiben. Die vollständige App-Dateitabelle wird
zusätzlich einschließlich Dateimodi gebunden. Ein neuer Schwachstellenscan wird
nicht behauptet. Aufnahmeberechtigungen und physische Steuerfunktionen bleiben
unverändert beschränkt.

## Übergang und unabhängige Prüfung

Builder und Verifier authentifizieren neben R7 auch den wirklichen R4-Ausgangsstand.
Der R4→R8-Übergang vergleicht die tatsächlichen Manifeste und Kataloge; er darf
weder SQL-/Systemmigration noch andere Aufnahmeberechtigungen voraussetzen.
Katalogrevision 7 ist die neue Lieferrevision, keine Datenbankmigration.

Der R7-Herkunftsnachweis bindet Release-ID, Schlüssel, Sequenz 10, Revision 7 und
die vom Zielhelfer verlangte Phase `RESTORED_STOPPED`. Das beweist die Identität
des beibehaltenen Release. **Das konkrete geschützte Pi-Journal und seine
Konfigurationsbindung werden erst auf dem Zielgerät geprüft**; der Buildbericht
behauptet hierfür ausdrücklich keinen bereits ausgeführten Nachweis.

`verify-candidate.cjs` führt keinen Kandidatencode aus. Es rekonstruiert den
vollständigen Payload aus authentifiziertem R7 und dem sauberen Quellcheckout,
prüft jeden Pfad, Hash, Modus, Katalog, SBOM und jede Hostdatei sowie exakt beide
Liefermetadaten, Quellenbindung, Buildbericht und `bundle.sha256`.
Der Publisher nimmt ausschließlich die festgelegten neuen Dateien auf; vorhandene
Lieferungen und Quelltexte dürfen nicht ersetzt werden. TAP-Nachweise mit Fehlern,
übersprungenen Tests oder fehlenden Abschlusszahlen werden verworfen.

## Herstelleraufruf

Erst nach sauberem Quellcommit und bestandenem verpflichtendem nativen
Managementtest mit PostgreSQL; Builder und abschließender Verifier verwenden
identischen Node-Patchstand und dieselbe Linux-Architektur:

```sh
node reports/integration/installable-test3-r8-20261004/build-revision.cjs
node reports/integration/installable-test3-r8-20261004/verify-candidate.cjs /absolute/candidate-root <40-stelliger-Quellcommit>
python3 -I -B reports/integration/installable-test3-r8-20261004/publish-candidate.py /absolute/candidate-root <40-stelliger-Quellcommit>
```

Builder/Verifier erlauben optional `--base-directory /absolute/r7-directory`;
sämtliche fest gebundenen R7-Pins bleiben verpflichtend. Der Builder verlangt
ein neues Ausgabeverzeichnis und sauberen Checkout. Private TEST-Signierschlüssel
werden ausschließlich vorübergehend im Speicher erzeugt. Diese Aufrufe
aktualisieren keinen Pi.

## Ausgeführte Prüfungen und offene Gates

- Lokaler Linux-x64-/Node-24.19.0-Lauf: 14/14 Builder-/Verifier-/SBOM-Verträge
  bestanden (`local-contract-tests.tap`). Unter anderem werden veränderte App-
  Bytes/Modi, fehlende Reparaturhelfer, unveränderte fehlerhafte Bereitschafts-
  prüfung, unerlaubte Schema-/Berechtigungsänderungen und falsche Berichtsaussagen
  zurückgewiesen.
- 17/17 isolierte Publikationsprüfungen bestanden (`local-publication-tests.log`).
  Diese verwenden synthetische Artefakte und sind kein Signatur-/Pi-Test.
- Das echte R7-Archiv wurde vollständig authentifiziert und seine 22.722
  App-Dateien einschließlich aller Modi unverändert wiederverwendet. Der neue
  vollständige Payload mit **22.842 Dateien** wurde unabhängig rekonstruiert
  und verglichen: `local-unsigned-payload-verification.json`. Darin sind die
  tatsächlich geprüften Quellen mit SHA-256 gebunden; der finale Koordinator
  hat SHA-256 `136637eaeadabf6c5d0d10504efcfac8968cfd674d9128c8402d460d35fcaf68`.
  Der authentifizierte R4→R8-Übergang besteht: Sequenz 7→11, Katalogrevision
  3→7, SQL-Schema und Systemdateien unverändert. Der beibehaltene R7-Nachweis
  wurde zusätzlich an die authentifizierte veröffentlichte Lieferung gebunden.
  Der Arbeitsbaum war ausdrücklich noch unsauber; keine Signierung fand statt.

Ein separater KI-Quellreview bestätigt ohne konkreten Blocker die R7-Pins,
App-Identität, verpflichtenden Hoständerungen, vollständige Rekonstruktion und
Publikationsgrenzen; 14/14 und 17/17 Tests wurden dabei nochmals ausgeführt.
Dies ist keine unabhängige Zertifizierung oder zusätzliche Signatur-/Pi-Prüfung.

Offen bleiben sauberer finaler Quellcommit, verpflichtender nativer Test des
vollständigen Managementstarts, signierter Kandidatenbau, unabhängiger Archiv-
Readback und tatsächlicher Pi-Wiederanlauf. Ein bestandener nativer x64-Lauf wäre
kein ARM64-/Systemd-/Anlagentest und keine Produktionsfreigabe.

## Korrektur des historischen Größeninventars

Der erste verpflichtende R8-Lauf `37219795121` bestand beide nativen Tests und
brach danach im Builder mit `BUNDLE_SIZE` ab. Die frühen 123 historischen
Lieferdateien summieren sich auf 1.091.881.744 Byte und wurden irrtümlich wie
ein einzelner Payload gegen dessen 1-GiB-Grenze geprüft. Das aktuelle R7-Archiv
ist mit 97.495.870 Byte kleiner als die unveränderte Einzeldateigrenze.

Builder und Verifier inventarisieren historische Lieferungen jetzt mit einem
eigenen Scanner. Er hält die bisherigen Grenzen für Einzeldateien, Dateizahl,
Verzeichnistiefe und Einträge sowie sämtliche Pfad-, Link- und Modusprüfungen
ein. Nur die Summe verschiedener alter Archive ist keine Payloadgröße mehr.
Die Produktgrenzen und die vollständige Prüfung jedes neuen Payloads bleiben
unverändert. Alle historischen Dateien werden weiterhin einzeln gehasht und
vor der Veröffentlichung auf unveränderte Bytes geprüft.

17/17 Builder-/Verifier-/SBOM-Verträge einschließlich drei neuer Regressionen
und 17/17 Publikationsverträge bestanden unter lokalem Node 24.19.0. Die
Regression erzeugt tatsächlich eine sparse Dateisammlung von 1 GiB plus einem
Byte: Der bestehende Payloadscanner verweigert sie weiterhin, während das
Historieninventar sämtliche Dateien korrekt erfasst. Unsichere Dateitypen,
Links, übergroße Einzeldateien, privilegierte Modi und unsichere Pfade bleiben
gesperrt. Details und Quellpins: `history-limit-fix.json`; rohe Nachweise:
`history-limit-contracts.tap` und `history-limit-publication.log`.

Dieser Nachweis ist kein neuer Signatur-, Pi- oder Hardwarelauf. Der neue
Quellcommit muss die verpflichtende Pipeline erneut vollständig bestehen.
