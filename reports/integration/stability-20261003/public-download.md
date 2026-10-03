# Öffentlicher, fest gebundener Testdownload

03.10.2026, Ergänzung zu EOS-STAB-20261003-05. Der Nutzer hat das Repository
öffentlich geschaltet, nachdem das private Actions-Kontingent die Ausführung
verhindert hatte. Diese Sichtbarkeit wurde über die Repository-API bestätigt.
Die Wiederholung von Build und EOS-Sicherheitsprüfungen konnte danach starten.

## Tatsächlicher R4-Lieferstand

- Geprüfter Produktquellstand: `ea3439ee6cb837ae42441dcdea89f9a454fd3c6c`.
- Veröffentlichtes R4-Paket: Commit `7b4aed5543fa2a289a01af391d4da6b233173e11`.
- Build und Veröffentlichung: [Actions 37143231804](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37143231804), erfolgreicher dritter Versuch.
- EOS-CI: [Actions 37143231830](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37143231830), erfolgreicher zweiter Versuch.
- Node 24.21.0 / Linux x64: 174 Produktprüfungen, 66 Root-Fixtures und
  80 Python-Prüfungen; dazu bestehende 41 Node-/57 Python-Sicherheitstests und
  112 Architekturprüfungen. Die Einzelberichte beschreiben ihre Testdoubles.
- Release-ID: `15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8`.
- Archiv: 88.363.976 Bytes, SHA-256
  `c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3`.
- 55 veröffentlichte R4-Dateien wurden anonym von festen Commit-URLs gelesen
  oder aus bereits bytegleichen Quellen übernommen und gegen ihre Git-Blobs
  abgeglichen. Die lokale Netzwerkumgebung verwendet ihren verwalteten Zugang;
  dies ist kein Nachweis des Netzwerks auf dem Pi.

## Öffentlicher Einstieg

`tools/bootstrap/build-public-entry.cjs` ergänzt einen Download ohne Token.
Er verwendet das bereits signierte R4-Archiv, denselben Node-Tarball und das
bereits geprüfte Installer-Kit bytegleich. `delivery/public-assets-test3-r4`
verweist auf diese vorhandenen Git-Blobs. Es gibt keine neue Signatur, keine
neue npm-Auflösung und keine Änderung der App-SBOM.

Das erzeugte Skript enthält den exakten R4-Hostvorbereiter sowie den bisherigen,
eng begrenzten R2-Recoveryhelfer. Ein vorhandener Zustand wird weiterhin nur
bei Übereinstimmung mit dem diagnostizierten R2-Abbruch erhalten und geräumt;
andere Installationen werden abgewiesen. Es gibt keinen allgemeinen Reset.

Der Einzeiler lädt das vollständige Skript mit curl in ein neu angelegtes
root-eigenes Verzeichnis. Er kontrolliert Größe und SHA-256 vor der Ausführung.
Skript und Downloadverzeichnis sind an getrennte, vollständige Git-Commit-IDs
gebunden. Der eigentliche Hostvorbereiter prüft alle drei Dateien vor Entpacken
und Installation erneut; die vorhandenen Release-, Host- und Lizenzprüfungen
bleiben aktiv. Systemkonto und Frontend-Passwörter werden nicht vorgegeben.

Der Tokenweg bleibt als historisch gebundene Alternative erhalten. Wird das
Repository wieder privat, scheitert der öffentliche Weg geschlossen; er
speichert keine Zugangsdaten und fällt nicht automatisch auf fremde Quellen um.
GitHub wird nur zum Bezug der Dateien benötigt, nicht für den lokalen EOS-Betrieb.

## Prüfungen und Grenzen

Vier neue lokale Prüfungen bestanden unter Node 24.19.0 / Linux x64:
feste Commit- und Assetbindung, Ablehnung manipulierten Inputs, unveränderte
eingebettete Vorbereitungsbytes mit begrenztem Recoverypfad und Prüfung des
vollständigen Skripts vor Ausführung. Beide erzeugten Bash-Formen wurden mit
`bash -n` geprüft. Rohbeleg: `raw/public-entry.tap`. Die Tests sind in die EOS-CI
aufgenommen. [Actions 37144888505](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37144888505)
bestand am öffentlichen Quellstand `cad6268e5d0e442fa576fa224babc630f326cb58`
alle drei EOS-Jobs; der Produktjob meldet **178 Node-, 66 Root-Fixture- und
80 Python-Tests**, keine fehlgeschlagen oder übersprungen. Rohbeleg:
`raw/github-public-product-success.log`.

Der erzeugte echte Installer wurde zusätzlich mit `bash -n` und durch
Rücklesen der eingebetteten Python-/Konfigurationsbytes geprüft. Der tatsächliche
Hostvorbereiter akzeptiert diese Konfiguration. Die erneute vollständige
Archivprüfung bestätigte die vorhandene R4-Signatur. Danach wurden Installer,
Kit, Node und Runtime anonym von ihren öffentlichen, festen Commit-URLs geladen:
alle vier Bytezahlen, SHA-256- und Git-Blob-Hashes stimmen. Rohbeleg:
`public-network-readback.json`; wiederholbar mit
`python3 -I -B reports/integration/stability-20261003/verify-public-download.py 16a947182badf052e9866f7cd167056e994ba914`.

Maßgeblich für tatsächlich veröffentlichte Einstiegspins und Rückleseprüfung
ist der abschließende maschinenlesbare Veröffentlichungsnachweis. Ein Quell-
oder Teiltestergebnis wird nicht als bereits erfolgte Veröffentlichung geführt.

Native Debian-13-/ARM64-Installation, HTTPS-Ersteinrichtung auf dem Gerät,
Neustart, Backup/Restore und Hardwareabnahme bleiben OFFEN. Die ergänzende
OS-Paketbestandsliste ist auf dem tatsächlichen Pi zu erfassen. Dies ist ein
Testkandidat mit CRA-Nachweisen, keine CRA-Konformitätserklärung und keine
Produktions- oder Anlagenfreigabe.
