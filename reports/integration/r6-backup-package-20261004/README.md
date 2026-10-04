# R6: Backup-Paket vervollständigt und Assetprüfung korrigiert

04.10.2026 · `iobroker.nexowatt-backup@1.0.10`.

Zwei tatsächlich importierte Backendmodule fehlten im Komponentenbaum:
`build/lib/sdCard.js` und `build/lib/influxDbCli.js`. Sie fehlten auch im älteren
Arbeitsbaum und Original-ZIP; unveränderte TS-Quellen waren vorhanden. Da bereits
`build/main.js` sdCard lädt, betrifft das fehlende Modul den Adapterstart.

Der exakt im vorhandenen Lockfile gebundene TypeScript-Compiler 6.0.3 wurde aus
seinem npm-Tarball in ein separates Herstellerverzeichnis geladen. SHA-512 wurde
gegen das unveränderte Lockfile geprüft; keine Lifecycle-Skripte liefen. Nur die
zwei Quellen wurden mit `transpileModule` und den tatsächlichen Optionen aus
`tsconfig.build.json` kompiliert. Ausschließlich die abschließenden Verweise auf
die ausdrücklich nicht ausgelieferten Sourcemaps wurden entfernt. Das ist keine
vollständige semantische Projekt-Typprüfung.

Beide Ergebnisse stimmen **bytegenau mit den bereits zuvor vorhandenen
Release-Manifestpins** überein. Keine TS-Quelle und kein Backendpin wurde geändert:

| Datei | Bytes | SHA-256 |
| --- | ---: | --- |
| `build/lib/sdCard.js` | 18024 | `1701698d9ebf11c729b2435850fe4bb85609be53c2899cf15ce682561d560e3d` |
| `build/lib/influxDbCli.js` | 5585 | `24aacfe56d1d80504cc47e265f7dc92a11043e89711c9940a8af90ee766f9627` |

Der Publishvalidator erkennt jetzt genau ein Modul-Script und erlaubt am lokalen
`./assets/NAME.js` optional `?v=eos-` mit acht Ziffern. Gelesen wird ausschließlich
der queryfreie Dateiname. Externe/absolute URLs, Slash- und Traversalvarianten,
Encoding, Fragmente, zusätzliche Parameter und mehrere Modul-Scripts werden
verworfen. Das vorhergehende Socket.IO-Script wird nicht mit dem Modul verwechselt.
Der neue Validatorhash ist im Release-Manifest gebunden; die bereits von Root
korrigierten CSS-/Logopins bleiben erhalten. Der neue Resolver-Test ist Quelltest,
keine zusätzliche produktive Abhängigkeit.

## Tatsächliche Prüfungen

- Echter Dashboard-HTML-Fixture und negative URL-/Queryfälle: **3/3 bestanden**.
- Vollständiger vorhandener Publishvalidator gegen isoliertes verifiziertes
  R5-Backup-Paket mit den aktuellen Artefakten: **bestanden, 131 Release-Dateien
  per SHA-256 geprüft**.
- Vorhandene Offlinefälle für EOS-Profil, SD-Karte/-Zugriff und Influx-CLI:
  **35/35 ausgeführte Fälle bestanden**; ein realer Nicht-root-Rechtefall wurde
  nach einem tatsächlichen `chown`-Fehler (`EINVAL`) ausdrücklich ausgeschlossen.
  Diese Umgebung bildet nur UID 0 ab. Der Fall ist **OFFEN**, nicht bestanden.

Prüfpfad: `/workspace/scratch/a8835322738f/tmp/r6-backup-package`.
Die ursprünglichen Fehlversuche bleiben als `*-initial.*` erhalten: Die erste
Resolverfassung nahm das Socket.IO-Script statt des Moduls; der neue Original-HTML-
Test fand dies und die Korrektur wurde nachgeprüft. Der erste Offlineaufruf hatte
zudem falsches Arbeitsverzeichnis und lokale Zeitzone; Wiederholung erfolgte im
Paketverzeichnis mit `TZ=UTC` und genau dem ausgewiesenen Rechtefall ausgeschlossen.

Reproduzierer: `reproduce-two-modules.cjs` (Compilerverzeichnis und frischer
Ausgabeordner als absolute Argumente), Compiler-Ausgabe: `compiler-output.json`.
Alle Quellen-/Compiler-/Ergebnis- und Rohlogbindungen stehen in `evidence.json`.
Die neuen Builddateien müssen trotz Build-Ignore explizit Git-getrackt werden.

Kein Pi-, ARM64-, physischer SD-Karten-, InfluxDB-Server- oder Produktionsnachweis.
Die unveränderte bestehende Influx-Option zum Überspringen der TLS-Prüfung wurde
durch diese bytegleiche Wiederherstellung nicht verändert oder als gehärtet erklärt.
