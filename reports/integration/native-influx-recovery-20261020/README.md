# InfluxDB-Sicherung und Wiederherstellung: rekonstruierte Korrektur

Auftrag vom 20.10.2026, Ausgangsstand `817b44658229fa45b79266ed38d36bc3b52e3649`.
Die verlorenen lokalen Änderungen wurden anhand des vorhandenen Quellcodes und neuer
Prüfungen rekonstruiert. Dies ist kein Nachweis einer bytegleichen Wiederherstellung
des verlorenen Commits. Historische Testzahlen wurden nicht übernommen.

## Verhalten und Bedienung

- InfluxDB 2 erhält für Backup und Restore ausdrücklich `--skip-verify=false` und
  `INFLUX_SKIP_VERIFY=false`. Zertifikatskette und Hostname werden geprüft. Eine
  geerbte Abschaltung der TLS-Prüfung kann diese Vorgabe nicht übersteuern.
- „Lokal“ bezeichnet bei InfluxDB 2 ausdrücklich `http://127.0.0.1:8086`; eine
  geerbte `INFLUX_HOST`-Variable oder ein CLI-Profil darf den Token nicht an ein
  anderes Ziel umleiten. Abweichende Endpunkte sind als „Remote“ zu konfigurieren.
  Vorhandene ausdrücklich konfigurierte HTTP-Ziele bleiben unterstützt.
- Token bleiben außerhalb der Argumentliste. Konfigurierte, getrimmte und
  URL-kodierte Tokenformen werden aus weitergegebenen CLI-Ausgaben entfernt.
- Jede Sicherung benutzt ein eigenes temporäres Verzeichnis mit Modus `0700`.
  Das fertige Archiv erhält `0600` und wird atomar ohne Überschreiben veröffentlicht.
  Vorhandene Dateien, auch Symlinks und während des Laufs entstandene Kollisionen,
  bleiben erhalten. Ein Dateisystem ohne Hardlink-Unterstützung meldet einen Fehler;
  es gibt keinen unsicheren Überschreib-Fallback.
- CLI-, Kompressions- und Restore-Fehler werden weitergegeben. Erst ein wirklich
  veröffentlichter Archivpfad wird registriert. Bei teilweise fehlgeschlagenen
  Mehrfachsicherungen bleiben erfolgreiche Archive erhalten; der Gesamtschritt wird
  nicht als erfolgreich markiert.
- Vor einer Wiederherstellung müssen bestehende `influxdb`-Adapterinstanzen in der
  Administration deaktiviert sein und ihr bestätigter Zustand `.alive` muss `false`
  sein. Diese Bedingungen werden vor und nach dem Entpacken geprüft. Die Software
  schreibt keinen vermeintlichen Stopp in `.alive`. Nach Abschluss aktiviert der
  Betreiber die gewünschten Instanzen wieder. Andere Datenbank-Schreiber muss der
  Betreiber selbst anhalten; diese Prüfung ist keine Datenbank-Sperre.
- Restore entpackt in ein eigenes Verzeichnis `0700`; reguläre Dateien werden
  `0600`. Ein alter gemeinsamer Ordner `influxDBtmp` wird nicht entfernt.
- Ein Restore-Archiv muss genau einen erkennbaren Datenbank-/Bucketnamen enthalten.
  Für Einzelsicherung müssen Name und Manifestformat zur Konfiguration passen;
  für Mehrfachsicherung muss genau ein passendes konfiguriertes Ziel existieren.
  Fehlende, mehrdeutige, fremde oder inkompatible Manifeste werden vor CLI-Ausführung
  und insbesondere vor einem optionalen lokalen InfluxDB-1-DROP abgewiesen.
  Unterstützte Zuordnung: InfluxDB 1 `files[].database`, InfluxDB 2
  `buckets[].bucketName`. Alte InfluxDB-2.0-Manifeste ohne diese Bucketzuordnung
  werden nicht automatisch erraten.
- Der optionale lokale InfluxDB-1-DROP verlangt zusätzlich alle im Manifest
  genannten Metadaten-/Datendateien als vorhandene reguläre Dateien mit passenden
  positiven Größen. Diese Vorprüfung kann keinen späteren erfolgreichen
  Datenbank-Replay garantieren.

Für HTTPS muss die ausstellende CA im Vertrauensspeicher der CLI vorhanden sein,
beispielsweise über den Systemvertrauensspeicher oder deren `SSL_CERT_FILE`.
Die Korrektur bietet keine Option zum Abschalten der Zertifikatsprüfung.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis und Beleg |
|---|---|
| Backend-TypeScript, vollständige bestehende Konfiguration | Erfolgreich; `typescript.log`, `environment.json` |
| Finale fokussierte Regressionen | **41 bestanden, 0 fehlgeschlagen, 0 übersprungen**; `focused-tests.tap` |
| Echte Influx-CLI gegen lokale HTTPS-Prüfserver | **6 bestanden, 0 fehlgeschlagen, 0 übersprungen**; `real-cli-tls.tap` |
| Bestehende gesamte Offline-Suite während der Korrektur | **72/74 bestanden**; `offline-tests.log` |
| Beide Offline-Fehler aus separat entpacktem unverändertem Git-Ausgangsstand | Beide reproduziert; `baseline-two-tests.log` |
| Unveränderter Profiltest mit `TZ=UTC` | 1/1 bestanden; `baseline-utc-profile-test.log` |

Die fokussierten Regressionen laden die ausgelieferten JavaScript-Dateien und
ersetzen CLI-Prozess und Archivierung gezielt durch Fehler-/Erfolgsfixtures;
Dateisystem-, Kollisions- und Verzeichnisprüfungen sind real. Abgedeckt sind
TLS-/Hostparameter, Tokenmaskierung, Kollisionen einschließlich Parallelrennen,
fehlende/leere Archive, Teilfehler, Restore-Abbruch, Manifestauswahl,
deaktivierte/aktive/erneut aktivierte Schreiber und ein fehlgeschlagener DROP.

Die sechs echten CLI-Prüfungen verwenden jeweils Backup und Restore mit unbekannter
CA, falschem Hostnamen sowie vertrauenswürdiger CA. Die beiden negativen Fälle
senden **keine HTTP-Anfrage und keinen Token** an den Prüfserver. Der positive Fall
erreicht eine authentifizierte API-Anfrage; der Prüfserver beendet sie absichtlich
mit HTTP 503. Ein synthetisches Manifest ermöglicht den Restore-TLS-Test. Damit
werden TLS und CLI-Argumentverarbeitung, keine Datenwiederherstellung, nachgewiesen.
`real-cli-tls.test.cjs` lässt sich mit `INFLUX_TEST_CLI=/absoluter/pfad/influx node
--test reports/integration/native-influx-recovery-20261020/real-cli-tls.test.cjs`
erneut ausführen; OpenSSL wird benötigt. Die Tests laden keine Binärdatei nach.

Der Prüfling wurde über die offizielle CLI-Dokumentation bezogen:
https://docs.influxdata.com/influxdb/v2/reference/cli/influx/

Download: https://dl.influxdata.com/influxdb/releases/influxdb2-client-2.8.0-linux-amd64.tar.gz

- Beobachteter Archiv-SHA256: `feaa32e02c99815414574265d5471c4f2550b07aef6f8b19907d8a1af98e5d61`
- Beobachteter Binär-SHA256: `ee515aa3d5b6c35331fd34e9df720c7f3fe568a8bc4208f18c4052c6cf1f7563`
- Tatsächliche Selbstauskunft: `Influx CLI dev (git: 8cdf40161d7662e942582086853fca948fc1a842) build_date: 2026-04-22T19:02:28Z`

Der Archivname bezeichnet 2.8.0; die abweichende Selbstauskunft wird unverändert
festgehalten. Die Hashes dokumentieren den verwendeten Prüfling, nicht eine
gesonderte Hersteller-Signaturprüfung. Die Binärdatei gehört nicht zum Produktdiff.

Die zwei Offline-Fehler betreffen unveränderten Code: Der Profiltest erwartet
UTC-Zeit, während diese Shell `TZ=America/Los_Angeles` erbt. Mit `TZ=UTC` besteht
derselbe Ausgangstest. Der SD-Berechtigungstest scheitert bereits am `chown`
auf UID/GID 65534 mit `EINVAL`; der vorgesehene unprivilegierte Kindprozess wird
nicht erreicht. Das beweist weder ein Bestehen noch ein Produktproblem dieses
Berechtigungstests. Die identischen Fehler sind aus `git archive HEAD` des
Ausgangsstands in einem separaten temporären Verzeichnis reproduziert.

## Lieferumfang und offene Nachweise

Geänderte Laufzeitdateien: `build/lib/influxDbCli.js`,
`build/lib/scripts/12-influxDB.js`, `build/lib/restore/influxDB.js`, jeweils mit
passender TypeScript-Quelle. Dazu die angepassten Erwartungen in der bestehenden
ausgelieferten `test/influxdb-cli.js`. Die zusätzliche
`test/influx-safety.test.cjs` ist eine Quellcode-/CI-Prüfung; sie wird in der
Sicherheits-CI ausdrücklich aufgerufen. Die Paketversion blieb unverändert; die
anschließende Manifestkorrektur ist unten dokumentiert. Die Integrationsfreigabe der nativen
Lieferdateien erfolgt separat im übergeordneten R11-Bericht.

**OFFEN:** echter InfluxDB-Server mit Datenbestand und Restore-Rundlauf,
Produktionszertifikate, ioBroker-Lebenszyklus auf dem Zielgerät, Pi/Hardware,
Last/Parallelität externer Datenbank-Schreiber und echte SD-Berechtigungsprüfung.
Die Zustandstests ersetzen keine exklusive Schreibsperre. Kein Produktions- oder
Anlagenfreigabenachweis, kein Docker-Nachweis.

## CI-Nachprüfung und Release-Manifest

Der Security-CI-Lauf [39387039999, Job 118509485163](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39387039999/job/118509485163)
bestand für den Quellmarker `e8edca868d3cec4a22fb267f15b417654985603b` sämtliche **74 Offline-Tests** und die
zusätzlichen **34 Influx-Sicherheitsregressionen**, jeweils ohne Fehlschlag oder
Überspringen. Damit wurden auch die beiden oben dokumentierten lokalen
Umgebungsgrenzen in der Linux-CI erfolgreich geprüft. Die 7 bestehenden
CLI-Tests gehören zu den 74 Offline-Tests; 7 + 34 entsprechen den 41 lokalen
fokussierten Tests und sind keine zusätzlichen Tests.
Der erneut über GitHub gelesene Logauszug liegt in
`ci-39387039999-backup-excerpt.log` mit den ursprünglichen Zeitstempeln.

Anschließend verweigerte der unveränderte Publish-Validator die Freigabe: Die
Größen/Hashes der drei geänderten JavaScript-Dateien und der bestehenden
`test/influxdb-cli.js` waren in `release-manifest.json` noch auf dem Ausgangsstand.
Dieser Fehler wurde durch Aktualisierung **nur dieser vier vorhandenen Einträge**
behoben. Dateiliste (141 Einträge), Paketname, Version `1.0.10` und alle anderen
Einträge bleiben unverändert. Der Validator wurde nicht geändert oder umgangen.

Vor dem Aktualisieren wurde die TypeScript-Kompilation erneut in ein separates
temporäres Verzeichnis ausgeführt und die Übereinstimmung aller drei ausgelieferten
JavaScript-Dateien geprüft. Danach meldete `prepare:publish` einen bereits sauberen
Stand; `node components/backitup/scripts/validate-publish.cjs` bestand einschließlich
**141 SHA-256-Prüfungen**. Belege: `publish-typescript.log`,
`publish-manifest-update.json`, `publish-prepare.log`, `publish-validate.log`.
Der etablierte `prepare:publish`-Schritt räumt Dateien anhand des Manifests auf;
er erzeugt keine neuen Hashes. Die vier Werte wurden deshalb deterministisch aus
den zuvor geprüften Dateien erneuert.

Zusätzlicher, ausschließlich metadatenbezogener Lieferpfad:
`app/node_modules/iobroker.nexowatt-backup/release-manifest.json`.
Eine vollständige Freigabe des neuen Quellmarkers durch die CI steht bei Erstellung
dieses Nachtrags noch aus. Der erfolgreiche lokale Manifestvalidator allein ist
keine solche Freigabe.

Die Textlogs wurden nur um Leerzeichen am Zeilenende bereinigt; Inhalte und Ergebnisse bleiben unverändert.
