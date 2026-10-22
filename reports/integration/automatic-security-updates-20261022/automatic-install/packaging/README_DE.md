# Herstellerwerkzeuge für automatische Node-Pakete

Stand: 22.10.2026. Bezug: automatische Node-24-Installation ohne Bedienklick.
Ausgangscommit `02257b74c9124f504979d9bc012af27451719aca`; die tatsächlich
geprüften neuen Dateien sind in `verification.json` durch SHA-256 gebunden.

## Änderung und Sicherheitsgrenze

- Der Vorbereitungspfad prüft ein signiertes Managed-Ausgangspaket gegen den
  unabhängig vorgegebenen öffentlichen Schlüssel. Nur eine strikt höhere
  freigegebene Node-24-Version ist zulässig.
- App und Katalog werden aus diesem Paket übernommen. Node-Binärdatei,
  Lizenztext und Metadaten stammen aus dem exakt gepinnten offiziellen Archiv.
  Der abgeleitete Buildnachweis unterscheidet den aktuellen Werkzeugcommit
  von dem Commit der erhaltenen Quellen. Der ursprüngliche Auflösungslock
  muss exakt zum signierten Nachweis passen.
- Der Signierer verlangt neue native Nachweise für den gleichen vorbereiteten
  Baum, Node-Stand, Quellcommit und Buildnachweis. Anschließend übernimmt er
  auch die Hostdateien aus der authentifizierten Ausgangspayload. Die genaue
  abgeleitete SBOM, das getestete App-Inventar und der Katalog werden verglichen;
  nur drei Node-Dateien und zwei abgeleitete Nachweise dürfen abweichen.
- Der unsignierte Transport erhält einen getrennten Typ mit enger Dateiliste.
  Er behauptet keine neue npm-Auflösung. PAX-Größen werden vor Interpretation
  begrenzt; Transportmetadaten, kanonische Tar-Header, Trailer und unveränderte
  Eingabedatei werden geprüft. Links, zusätzliche Dateien und unpassende
  Transporttypen werden abgewiesen.
- Private Herstellerschlüssel bleiben außerhalb von Quell- und Lieferbaum.
  Die Werkzeuge veröffentlichen nichts und verändern keine Anlage.

## Tatsächlich geprüft

Umgebung: Linux-Container, Node **24.19.0**, Python **3.12.14**. Diese lokale
Node-Version prüft ausschließlich die Werkzeugverträge; sie wird nicht als
native Qualifikation von Node 24.22.1 oder einer Folgeversion ausgegeben.

`node --test --test-reporter=tap tests/integration/node-only-package.test.cjs`:
**7 bestanden, 0 fehlgeschlagen, 0 übersprungen**. Geprüft wurden unveränderte
App-/Host-/Katalogbytes auch unter `umask 077`, zwei aufeinanderfolgende
Provenienzableitungen, Versionsgrenzen, manipulierte Build-/App-/SBOM-Daten,
falsches Vertrauen, eine manipulierte echte Ed25519-Testsignatur und der
signierte Automatikmarker. Der SBOM-Test verwendet zusätzlich die tatsächlich
zurückgelesene frühere SBOM als Ausgangsdaten und prüft unveränderte
npm-Komponenten; er erteilt dieser früheren Lieferung keine neue Freigabe.

`python3 -I -B tests/integration/prepared-runtime-archive.test.py`:
**6 bestanden**. Beide Transporttypen, reproduzierbare Rundreise, fehlende
Dateien, falsche Provenienz, Dateimanipulation, Traversal, Links, zusätzliche
Mitglieder, übergroßer PAX-Header und falsche Schemas wurden geprüft.

Eine getrennte KI-Codeprüfung hat zwei konkrete Grenzen beanstandet:
vollständige Bindung der abgeleiteten SBOM und PAX-Ressourcenbegrenzung vor
`tarfile`. Beide Änderungen sind implementiert und durch Negativtests
abgedeckt. Diese Prüfung ist keine unabhängige Zertifizierung.

Rohbelege: `node-only.tap`, `prepared-transport.txt`, `verification.json`.
Herstelleranleitung: [Node-Automatik](../../../../../docs/operations/NODE_AUTOMATIK_HERSTELLER_DE.md).

## Offen

Kein zukünftiges Node-Archiv wurde heruntergeladen, ausgeführt oder als
Lieferung qualifiziert. Die aktuelle 24.22.1-Basis darf nicht als gleiches
Versionspaket umgepackt werden. Neue native x64-Belege, ARM64-/Pi-Abnahme,
signierte Auslieferung und öffentlicher Bytevergleich sind für eine konkrete
Folgeversion noch erforderlich. Die alten nativen 24.22.1-Belege bleiben
historisch gebunden. Kein Pi, systemd-Dienst oder APT-Lauf wurde hier geändert.
Bestehende Abhängigkeitsbefunde, Anlagenzeitmessungen und Produktionsfreigabe
werden durch diese Werkzeugprüfung nicht geschlossen.
