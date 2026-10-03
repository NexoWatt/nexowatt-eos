# EOS-CI: ausgewählte Produktregressionen und klare Abnahmegrenzen

Stand: 03.10.2026. Ausgangspunkt: `66a3762f75e9e0ffc56159fe7142f6059dd550b3`.
Bezug: Stabilisierung des GitHub-Installationswegs, Bootstrap, Ersteinrichtung,
Sudo-Abbruchbehandlung und PostgreSQL-Konfiguration. Die parallelen Änderungen
am Installationsstand werden gemeinsam mit diesem Vermerk veröffentlicht.

## Änderung

Die vorhandene `.github/workflows/security-review.yml` berücksichtigt jetzt
auch Änderungen an `runtime/**`, `components/**`, `delivery/**`, Lockdateien
und den zentralen Arbeits-/Installationsanweisungen. Bisher konnten reine
Runtime- oder Komponentenänderungen diesen EOS-Workflow umgehen.

Der bestehende Security-Job bleibt vollständig erhalten und nutzt künftig
das festgelegte Node.js `24.21.0`. Der Architektur-/SBOM-Job bleibt erhalten.
Ein zusätzlicher Job auf GitHub-hosted Ubuntu 24.04 prüft eine ausdrücklich
aufgeführte Auswahl von Bootstrap-, Onboarding-, PostgreSQL-, Adapterkanal-
und Sudo-/Preflight-Tests. Es gibt keinen pauschalen Integrationsglob und
keine Installation veränderlicher npm-Abhängigkeiten. Die beiden verwendeten
Actions sind an vollständige, am 03.10.2026 gegen ihre offiziellen
GitHub-Referenzen geprüfte Commit-SHAs gebunden; Tokenrechte bleiben
`contents: read`, Checkout-Credentials werden nicht gespeichert.

## Auswahl und Voraussetzungen

| Auswahl | Tatsächlicher Umfang / Voraussetzungen |
|---|---|
| Bootstrap-Builder, erster Start, neuer Stability-Einstieg | Synthetische öffentliche Vertrauensdaten, temporäre Dateien, echtes Bash-Syntaxprüfen und OpenSSL; kein echtes Herunterladen oder Ausführen eines Installationspakets |
| Onboarding | Konten-/Konfigurations-/Frontendverträge, echte lokale HTTPS-Verbindungen und Fehlerfälle; feste Gerätevorlagen aus dem Repository, kein echter Anlagenzugriff |
| PostgreSQL Store/States | Konfigurations-, Zustands- und Replayverträge mit Testdoubles; kein PostgreSQL-Server und kein nativer `pg`-Treiber |
| PostgreSQL Dateirechte | Neuer `provision-permissions.test.cjs`: echte POSIX-Dateimodi und OpenSSL unter umask 022/077; Root-Metadatengrenze und UID modelliert, keine Dienstkonten angelegt |
| Adapterkanal | Echte Loopback-TLS-Verbindungen, eigene Testzertifikate, negative Authentifizierungs-/Protokollfälle, begrenzte Nachrichten; Zustandsbackend modelliert |
| Sudo/Preflight | Temporäre `/root`-Verzeichnisse; deshalb eigener sudo-Testschritt auf einem wegwerfbaren GitHub-Runner. Hostbefehle und Dienstaktionen sind Fixtures, keine echte Installation |
| Python Download/Host/Recovery | Auswahl `PayloadTests GuardTests MutationTests` beim Recovery-Test; Datei-, Eingabe- und Ablaufverträge mit kontrollierten Fixtures |

Die Objects-Verträge brauchen zusätzlich `@iobroker/db-objects-redis`, der
Store-Review den echten `pg@8.23.1`-Treiber. Archiv-/Publikationstests benötigen
authentische Lieferarchive. Diese Voraussetzungen werden nicht durch
Platzhalter ersetzt. Insbesondere bleibt `ArchivedPinTests` für die konkrete
R2-Lieferung separat bestehen; der neue Source-Job führt diese Klasse nicht
aus und meldet sie nicht als bestanden.

## Lokal ausgeführte Prüfung

| Prüfung | Ergebnis | Rohbeleg |
|---|---|---|
| Explizite Node-Auswahl, als unprivilegierter Benutzer in einer zugänglichen temporären Quellkopie | **174 bestanden**, 0 fehlgeschlagen, 0 übersprungen | `ci-node.tap` |
| Sudo-/Preflight-Fixtures mit temporären Root-Verzeichnissen | **65 bestanden**, 0 fehlgeschlagen, 0 übersprungen | `ci-root-fixtures.tap` |
| Python Downloader / Hostvorbereitung / Recovery-Fixtures, unprivilegiert | **21 / 27 / 32 bestanden** | `ci-python.log` |
| Workflow-YAML, alle 15 eingebetteten Bash-Schritte, Triggerpfade und vollständige Action-SHA-Pins | **Bestanden**: YAML-Parser, `bash -n`, Inhaltsprüfung | `ci-verification.json` |

Lokale Umgebung: Linux x86_64, Node.js **24.19.0**, Python 3.12.14,
OpenSSL 3.0.13. Die CI ist auf **24.21.0** eingestellt; ein erfolgreicher
GitHub-Lauf der geänderten Workflow-Datei wird erst nach dem Commit belegt.
Die bisherigen Security-/Architekturjobs wurden im Rahmen dieser lokalen
Auswahl nicht erneut vollständig ausgeführt. Actionlint ist lokal nicht
vorhanden; die YAML-/Bash-Prüfung ist kein Ersatz für den GitHub-Lauf.

Die ersten lokalen Anläufe trafen auf Sandbox-Prozessbeschränkungen bzw.
noch unvollständig oder mit zusätzlichem Zeilenumbruch materialisierte
Quellfixtures. Die Fixtures wurden gegen ihre Git-Blob-Hashes hergestellt;
Quell-/Schutzprüfungen wurden nicht gelockert. Der abschließende Lauf benutzt
die vollständige oben genannte Auswahl. Hashes der Workflow-Datei und der
abschließenden Rohbelege stehen in `ci-verification.json`. Der einfache
Logmustercheck fand keine privaten PEM-Schlüssel oder GitHub-Tokenmuster;
das ist kein umfassender Geheimnis- oder Sicherheitstest.

## Historische Workflows und offene Freigabegrenzen

- Die alten Linux/macOS-, FreeBSD- und Windows-/NPX-Workflows bleiben
  unverändert. Sie decken historische ioBroker-Installer ab und verlangen
  teilweise Plattformen oder HTTP-Autostart, die das EOS-Profil bewusst
  abweist. Rote Jobs werden nicht durch Abschalten von Schutzprüfungen
  bereinigt. Ihre Anforderungen müssen separat auf aktuelle Produktprofile
  abgebildet werden.
- Der bisher grüne Workflow namens `Deploy` ist ein Windows-Installtest;
  bei normalen Branch-Pushes bleibt sein tatsächlicher Veröffentlichungsjob
  übersprungen. Er belegt keine EOS-Lieferung.
- Der zuletzt abgeschlossene CodeQL-Lauf scheiterte am deaktivierten
  Code-Scanning-Ergebnisupload. Die Repository-Freischaltung und ein
  vollständiger neuer Lauf bleiben offen; daraus wird weder ein Codefehler
  noch Schwachstellenfreiheit abgeleitet.
- **OFFEN:** Ausführung des endgültig signierten Pakets auf dem frischen
  Debian-13-ARM64-Ziel, echte APT-/systemd-/PostgreSQL-Installation, HTTPS-
  Ersteinrichtung, Neustart, Backup/Restore, reale Betriebssystemgrenzen und
  Geräte-/Anlagentests. Diese Source-CI ersetzt keine dieser Abnahmen.

Ein grüner fokussierter Lauf stellt keine Produktionsfreigabe, keine
Hardwareabnahme und keine CRA-/IEC-Konformitätsbewertung dar.
