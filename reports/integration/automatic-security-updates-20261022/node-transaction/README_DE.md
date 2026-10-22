# Node.js als Teil des signierten EOS-Updates

Stand: 22.10.2026. Ausgangscommit:
`99ef5086bc5b0ee590de17e109b85e4738c973ae`.
Dieses Teilprotokoll betrifft den Updateempfänger und dessen Transaktion.
Hersteller-Paketbau, Erstinstallation, Debian-Updates und Admin-Oberfläche
werden im gemeinsamen Änderungsstand gesondert geprüft.

## Verhalten und Schutzgrenzen

- Die neue Frischbasis verlangt mindestens Node **24.22.1**. Der empfangende
  Code erlaubt ausschließlich exakt bezeichnete stabile Versionen der Linie
  24 ab dieser Untergrenze und verhindert reguläre Versionsrückschritte.
  Eine Versionsnummer allein autorisiert keine Installation: Feed und Paket
  müssen weiterhin zur auf dem Gerät verankerten Herstellerautorität passen.
- Der signierte Lieferumfang enthält `node-runtime/bin/node`, die genaue
  Laufzeitbeschreibung und die unveränderten Upstream-Lizenzhinweise.
  Tatsächliche Bytes, Dateirechte, Ed25519-Signatur, Inventar, ELF-Architektur
  ARM64 und Dateihashes werden vor Ausführung geprüft. Die Beschreibung
  bindet auch den SHA-256 des zugrunde liegenden Herstellerarchivs.
- Node und EOS wechseln über denselben `current`-Zeiger. Aktiver Zustand und
  Node-Version werden vor dem Teststart gemeinsam geschrieben. Scheitern
  Start oder Bereitschaft, wird das vorherige authentifizierte Paar
  wiederhergestellt und erneut geprüft. Bei unklarem Rückfall bleibt die
  bestehende Wartungssperre erhalten. Controller 7.2.5 und die übrigen
  Host-/Abhängigkeitsgrenzen werden nicht durch die Node-Funktion aufgehoben.
- Der Update-Dienst behält den unveränderlichen Koordinator der ersten
  Installation, verwendet jedoch den Node-Interpreter des aktiven Pakets.
  Nach beendetem Auftrag und dauerhaftem Status prüft er das installierte
  Paar und startet seinen Interpreter bei einer Änderung neu. Das gilt auch
  für einen Fehler beim Ergebnisbericht nach bereits erfolgter Aktivierung;
  Fehler-/Wiederherstellungsstatus werden dadurch nicht in Erfolg umgedeutet.
- Debian- und EOS-Wartung teilen die root-geschützte Datei
  `/var/lib/nexowatt-eos-os-updates/private/maintenance.lock`. Der Node-Prozess
  behält deren geöffneten Deskriptor; ein kurzer vertrauenswürdiger
  `flock`-Helfer sperrt dieselbe offene Dateibeschreibung. Der Kernel hält die
  Sperre bis zum Schließen oder Prozessende. Besitzer, Modus, Inode und
  Linkzahl werden geprüft. Der Worker erwirbt sie bereits vor dem Download.
  Normale Belegung führt zu einem wiederholbaren Fehler ohne Aktivierung.
  Abgeschlossene Fehler vor dem Teststart und nachgewiesene Rückfälle werden
  nach dauerhaftem Status bereinigt, damit Wiederholungen den Speicher nicht
  mit Arbeitsverzeichnissen füllen. Unklare Wiederherstellung bleibt erhalten.
- Vollständige Pakete dürfen bis 256 MiB groß sein. Der signierte Feed darf
  einen festen GitHub-Releases-Pfad mit Sequenz und Release-ID verwenden.
  Download-Weiterleitungen sind ausschließlich zum festgelegten
  `release-assets.githubusercontent.com`-Pfad und höchstens zweimal erlaubt.
  Pro 1-MiB-Teilabruf gilt ein einziges absolutes Budget von fünf Sekunden
  einschließlich DNS, TLS, Weiterleitungen und Antwort. Gesamtlänge,
  `Content-Range` und abschließender SHA-256 müssen exakt passen.

## Tatsächlich geprüft

Unter Linux x64 mit Node 24.19.0 bestanden **45 gezielte Tests**:
[TAP-Ausgabe](tests.tap), [Dateibindungen und Grenzen](verification.json).
Sie verwenden echte lokale Dateien, Hash-/Signaturprüfungen, atomare
Zeiger-/Zustandswechsel, `fsync` und echte konkurrierende `flock`-Prozesse.
Systemd, Controllerprozesse, Geräte und native Node-ARM64-Ausführung sind
in den Transaktionstests ausdrücklich simuliert. Die ELF-Datei des
Formatnegativtests ist eine nicht ausgeführte synthetische Fixture.

Geprüft wurden insbesondere manipulierte Schlüssel/Signaturen, falsche
Architektur/Rechte/Links, fehlende Lizenzdatei, unzulässige Versionswechsel,
fremde Koordinatorsperren, Wiederherstellung des Node-/EOS-Paars, fehlerhafte
Status-/Zeigerschreibvorgänge, unerlaubte CDN-Weiterleitungen, das nicht
erneuerte Fünfsekundenbudget und die Dienstneustart-Reihenfolge.

Eine zusätzliche bestehende Prüfung des tatsächlichen Unix-Sockets konnte
in dieser Ausführungsumgebung nicht erfolgreich laufen (`listen EPERM`).
Dieser Versuch ist keine bestandene Socket- oder Pi-Prüfung; der neue
Laufzeitstand benötigt weiterhin CI- und Zielsystemnachweise.

Eine getrennte agentengestützte Quellprüfung fand und veranlasste Korrekturen
für Wartungskollisionen, die Bindung von Folgepaket-Metadaten, den
Pflichtdateinamen des Sperrhelfers sowie den Neustart nach einem Fehler des
Ergebnisberichts. Dies ist keine externe Sicherheitszertifizierung.

## Noch offen

Kein signiertes Herstellerpaket, kein öffentlicher Rücklesetest, keine
Neuinstallation und kein Node-Wechsel auf einem Raspberry Pi wurden hier
ausgeführt. Der neue vollständige Laufzeitbau und seine native Prüfung
müssen den geänderten Quellstand sowie Node 24.22.1 nachweisen; der frühere
24.21.0-Lauf erfüllt das nicht. Physische Regelzeiten, systemd-Neustarts,
Stromausfall und die Wiederherstellung auf dem Zielgerät bleiben offen.
Private Herstellerschlüssel oder Passphrasen wurden nicht empfangen oder
verwendet. Keine Produktions- oder CRA-Freigabe.

Offizielle Sicherheitsbasis:
[Node.js-Sicherheitsmeldung vom 21.10.2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
und [Version 24.22.1](https://nodejs.org/en/blog/release/v24.22.1).
