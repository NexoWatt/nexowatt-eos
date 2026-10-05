# R9-Testableitung: zentrale Freigabe und eigene Adapterpakete

Stand: 05.10.2026. Dieser Vermerk beschreibt Herstellerwerkzeuge und lokale
Prüfungen im noch nicht veröffentlichten Arbeitsstand. Er bescheinigt keine
Signierung, Veröffentlichung, Pi-Aktualisierung oder Anlagenfreigabe.

Die feste Basis ist die authentifizierte R8-Lieferung, Sequenz 11, Release-ID
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`.
Das Archiv ist 97.504.932 Byte groß, SHA-256
`b7c38754cd572cb42462d525337a417d436f31dbf4d149bb9708187881e6c5d3`.
Archiv, Schlüssel, Liefermetadaten und alle signierten Dateien werden vor der
Ableitung geprüft. Die bisherigen Lieferungen werden nicht überschrieben.

## Abgrenzung der Ableitung

Der Builder nimmt die vollständigen Dateitabellen aus
`npm pack --dry-run --json --ignore-scripts --offline` für genau die sechs
vorhandenen eigenen Adapter. Bereits erzeugte und geprüfte Builddateien müssen
vorliegen. Der Builder installiert keine Pakete, führt keine Lifecycle-Skripte
aus, transpiliert nichts und versiegelt keine ungeprüften Dateien.

Dateien unter den sechs direkten Paketwurzeln werden exakt aus diesen Tabellen
übernommen. Nicht mehr gelieferte eigene Dateien, insbesondere alte UI-Assets,
werden kontrolliert entfernt und als Löschungen im Änderungsbeleg gebunden.
Verschachtelte installierte `node_modules`-Bäume sowie sämtliche anderen Pakete,
App-Rootmanifest und Rootlock bleiben einschließlich Dateimodi unverändert.
Die SBOM-Prüfung begrenzt Paketmetadatenänderungen auf die vereinbarten
Quell-/Buildmetadaten und bindet alle sechs zentralen Lizenzclients als eingebettete
Komponenten mit den tatsächlichen Eigentümern. Die eng definierte neue
EEBUS-Mocha-Entwicklungsdeklaration wird gegen den gepinnten historischen
Quelllock geprüft; sie ist keine neue installierte Laufzeitabhängigkeit.

Admin-Prebuilt-Manifest, kanonische UI-Runtimequellen und sechs bytegleiche
Lizenzclientkopien sind zwingende Buildgates. Vor der Signierung müssen alle
übernommenen Dateien im sauberen Quellcommit enthalten sein. Der Arbeitsbaum
wird unmittelbar vor Signierung erneut geprüft. Node 24.21.0 und Linux sind
für Signierung und abschließenden Kandidat-Verifier fest vorgegeben.
Die UI-Paritätsprüfung benötigt die aus `components/ui/package-lock.json`
installierte TypeScript-Version 5.8.3. Vor Vorbereitung und Verifikation ist dort
`npm ci --ignore-scripts --no-audit --no-fund` erforderlich; die Prüfung erzeugt
keine neuen Laufzeitdateien.

Die Zielrevision ist R9 / Sequenz 12 von `0.2.0-test.3`. SQL-Schema, Systemd-
Dateien und der Controller-Ausführungsprofilstand dürfen sich nicht ändern.
Admin und UI bleiben die einzigen zur Managementprüfung zugelassenen Adapter;
die übrigen vier Adapter sind weiterhin installiert und gesperrt. Zentrale
Lizenzgültigkeit ist keine Freigabe der physischen Anlagensteuerung.

## Werkzeuge und überprüfbare Verträge

- `build-revision.cjs`: exportiert `prepareApp({baseDirectory, work, sourceCommit,
  timestamp})` für ausdrücklich unsignierte Vorbereitung. Die Rückgabe enthält
  `app`, `previousApp`, `oldPayload`, Quellabdeckung, Dateiänderungen, Katalog,
  SBOM und Vorabprüfung. Der Arbeitsbaumstatus wird ehrlich festgehalten.
- `build-revision.cjs --native-evidence /absolute/native` (optional zusätzlich
  `--base-directory /absolute/r8`)
  signiert erst aus sauberem Quellstand in ein neues R9-Ausgabeverzeichnis.
- `verify-candidate.cjs <candidateRoot> <sourceCommit> --native-evidence /absolute/native [--base-directory /absolute/r8]`
  rekonstruiert den vollständigen Payload aus authentifiziertem R8 und dem
  vertrauenswürdigen Quellcheckout, vergleicht alle Dateien/Modi, Quellenbelege,
  SBOM, Katalog, Liefermetadaten, Signatur und Hashliste. Er führt keinen Code
  des Kandidaten aus und schreibt nicht in dessen Verzeichnis.

Builder und Verifier verlangen zusätzlich einen an denselben Quellcommit und
den identischen App-Dateibaum gebundenen erfolgreichen nativen Nachweis. Ohne
den ausdrücklichen `--native-evidence`-Pfad ist Signierung nicht möglich.
Die separate R9-Auslieferung muss vor dem signierten Build den verpflichtenden
nativen Managementtest mit PostgreSQL, Controller, Admin und UI bestehen.
Ein erfolgreicher synthetischer Builder-/Verifier-Test ersetzt dieses Gate nicht.

## Lokale Prüfungen und Grenzen

`node --test --test-reporter=tap reports/integration/installable-test3-r9-20261005/build-revision.test.cjs`
besteht mit **7/7** Fällen unter Linux x86_64 / Node 24.19.0. Der Umfang umfasst
kontrollierte Löschung überholter eigener Dateien, Erhalt verschachtelter
Abhängigkeiten und Modi, Ablehnung nicht deklarierter Änderungen, Quelländerung,
Links, doppelte Ziele, unvollständige Paketdateitabellen und falsche
Kandidaten-/Hardwarebehauptungen sowie den verpflichtenden expliziten Pfad zur
nativen Evidenz. Rohbeleg: `builder-contracts.tap`.

Das echte R8-Archiv wurde aus den historischen Git-Dateien ausschließlich in
Scratch materialisiert und vollständig authentifiziert: 22.842 signierte Dateien.
Nach finalem Admin-Prebuilt-Abgleich und UI-Quellparitätsprüfung wurde der gesamte
unsignierte Payload erfolgreich vorbereitet und validiert. 2.061 Quelldateien
führen zu 839 gebundenen Änderungen, darunter 628 Löschungen überholter eigener
Dateien. Der resultierende Appbaum umfasst 22.194 Dateien, der vollständige
Payload 22.316 Dateien. Der SBOM-Binder erfasst 646 Komponenten, sechs
Adapterderivate und sieben eingebettete Komponenten einschließlich crypto-js.

`local-unsigned-payload-verification.json` bindet Quellabdeckung, Änderungsmenge,
Appbaum, Payloadmanifest, Architekturprüfung, SBOM-Beleg und den authentifizierten
R8→R9-Übergang. Der Appinhaltshash lautet
`352c935eb552fe206c4826915e7a3464a8ec685f693a111def4d94d735c28d86`
(ASCII-sortierte Pfad-/Größe-/SHA-256-Tabelle). Der Nachweis bezeichnet den
lokalen Arbeitsbaum ausdrücklich als uncommittet und den Payload als unsigniert;
er ersetzt den verpflichtenden nativen Lauf gegen den späteren sauberen
Quellcommit nicht.

Offen bleiben zum Zeitpunkt dieses Vermerks: finaler nativer R9-Managementlauf,
sauberer Quellcommit, Signierung, unabhängiger signierter Readback, Veröffentlichung
und erfolgreicher R8→R9-Test auf dem Pi. Geräteeinrichtung und Hausanlagentest
bleiben getrennte, ausdrücklich noch nicht ausgeführte Abnahmen.
