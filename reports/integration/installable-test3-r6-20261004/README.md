# R6 TEST-Aktualisierung: reproduzierbare Ableitung und Veröffentlichungsprüfung

Dieser Builder erzeugt die neue Revision 6 mit Sequenz 9 aus dem unverändert
signierten R5-ARM64-Laufzeitbaum. Produktversion bleibt `0.2.0-test.3`.
Die historischen R4/R5-Archive und ihre Vertrauensanker bleiben unverändert.

## Quellen und Umfang

- Der R5-Archivhash, die Länge, der öffentliche Schlüssel, die Signatur und die
  Release-ID sind im Builder fest gebunden. Vor Wiederverwendung werden die
  tatsächlichen Archivbytes und alle signierten Dateiinhalte geprüft.
- Admin: alle Dateien des aktuellen Prebuilt-Quell-/Laufzeitmanifests sowie die
  neue Login-Einstiegsdatei werden aus dem sauberen Quellcommit übernommen.
  Das vollständige installierte Paket muss seinen eigenen Prebuilt-Selbsttest
  bestehen. Die vier CommonJS-Sicherheitsmodule sind zusätzlich bytegleich zu
  ihren Quellmodulen gebunden.
- Backup: aktuelle veröffentlichte Admin-Dateien, Paketidentität, io-package,
  Release-Manifest, Paketvalidator und genau die zwei zuvor fehlenden
  Backendmodule `sdCard.js`/`influxDbCli.js` werden übernommen. Alle übrigen
  Backup-Backendbytes bleiben aus dem authentifizierten R5 erhalten.
  Die beiden Helfer wurden vor der Assembly mit dem über den bestehenden Lock
  authentifizierten TypeScript 6.0.3 wiederhergestellt: ihre Bytes entsprechen
  exakt den schon vorher bestehenden Release-Manifesthashes. Der Herkunfts- und
  Testbericht unter `../r6-backup-package-20261004/` wird mit Dateihash gebunden.
  Die Assembly selbst transpiliert nicht. Der tatsächliche vollständige
  Backup-Paketvalidator ist ein Pflichtgate.
- Der tatsächlich installierte App-Root-Lock und sämtliche installierten
  `package.json`-Verträge bleiben unverändert. Der Admin-Quell-Lock wird als
  zusätzliche versiegelte Quelle aufgenommen; sein Paketvertrag wird gegen das
  installierte Paket geprüft. Er ist keine neue npm-Auflösung.
- Alle übrigen App-Dateien müssen bytegleich zum authentifizierten R5 sein.
  Der aktuelle Hostcode, einschließlich des R4/R5→R6-Updaters, wird vollständig
  aus dem Quellcommit gebunden. PostgreSQL-Schema, Systemdateien und
  Adapter-Freigabemetadaten behalten die bisherigen Werte. Die tatsächlichen
  authentifizierten R4- und R5-Manifeste/Kataloge werden jeweils gegen den
  finalen Kandidaten mit dem Update-Vertragsvalidator geprüft.
- Die derivative CycloneDX-SBOM bindet den tatsächlichen Baum, jede Änderung und
  den Quellcommit. Originale Paketarchivhashes werden bei geänderten Paketen nur
  als Herkunft geführt. Kein neuer npm-Build oder Schwachstellenscan wird behauptet.

## Aufruf

Sauberer vollständiger Checkout, Linux mit Node 24; CI nutzt fest Node 24.21.0:

```sh
node reports/integration/installable-test3-r6-20261004/build-revision.cjs
```

Bei Sparse-Checkouts kann ein separater unveränderter R5-Ordner übergeben werden.
Er muss genau das authentifizierte Archiv, `release-public.pem` und
`delivery.json` enthalten; dieselben festen Hash-/Signaturgates gelten:

```sh
node reports/integration/installable-test3-r6-20261004/build-revision.cjs --base-directory /absoluter/pfad/zum/r5-ordner
```

Ergebnisse liegen unter `delivery/test-pi-0.2.0-test.3-r6`; die zusammengesetzte
App unter `.work/runtime-test3-r6-20261004/app`. Bestehende Ergebnisse werden nie
überschrieben. Neue Bytes erfordern eine neue Revision. Die Ed25519-Testsignatur
entsteht mit einem nur im Speicher existierenden Schlüssel; veröffentlicht wird
nur der öffentliche Schlüssel. Der neue Vertrauensanker wird explizit durch den
separaten öffentlichen R6-Updatebefehl gebunden.

## Veröffentlichungsgrenze

`publish-candidate.py` übernimmt ausschließlich neue erlaubte Ausgabedateien.
Wiederholter Quellcode muss bytegleich zum ausgecheckten Commit sein. Vor dem
Kopieren läuft `verify-candidate.cjs` aus dem vertrauenswürdigen Checkout:

1. R5 und Kandidat erneut kryptographisch authentifizieren.
2. Vollständige Quellbindung und exakte App-Differenz unabhängig nachprüfen.
3. Aus den authentifizierten Daten die derivative SBOM und den bisherigen
   Katalog mit neuen Dateibaumhashes rekonstruieren.
4. Den vollständigen erwarteten Payload aus dem Checkout neu zusammensetzen.
   Jede signierte Datei einschließlich Lizenzen, Hostcode, Richtlinien und
   kanonischer Dateimodi muss exakt übereinstimmen.

Dabei wird kein Programm aus dem Kandidatenarchiv ausgeführt. Ausschließlich
Commit-gebundener Prüfcode läuft im Publisher. Die GitHub-Pipeline bindet das
Build-Artefakt zusätzlich an dessen unveränderliche Artefakt-ID und veröffentlicht
nur bei unverändertem `main` durch einen normalen Fast-forward.

## Prüfungen und Grenzen

Die benachbarten Builder-/Publisher-Tests prüfen positive Verträge sowie
manipulierte Quellbindungen, versteckte Änderungen, Löschungen, zusätzliche
Dateien, Metadaten-/SBOM-/Katalog-/Modusersatz und fremde Veröffentlichungsziele.
Die CI führt danach echte OAuth-/Objektbackendtests gegen die zusammengesetzte
App aus und bewahrt die TAP-Ausgaben auf. Erfolgreiche spätere Buildausgaben
stehen in `build-verification.json`, `signed-source-binding.json` sowie den
`assembled-*`-Rohbelegen; dieser Quellbericht ersetzt diese Belege nicht.

Alle sechs eigenen Adapter bleiben installiert. Ausführung und physische
Steuerung werden durch diese Lieferung nicht zusätzlich freigegeben.
Pi-Installation, tatsächlicher systemd-Wechsel, Pi-Passwortlogin und Hausanlage
bleiben bis zum jeweiligen Zieltest **OFFEN**. Keine Produktionsfreigabe und
keine CRA-Konformität werden aus dem Build abgeleitet.
