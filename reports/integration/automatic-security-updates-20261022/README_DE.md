# Node-Lieferung und automatische Linux-Sicherheitsupdates

Stand: 22.10.2026. Ausgangscommit:
`99ef5086bc5b0ee590de17e109b85e4738c973ae`.
Auftrag: Node.js bei EOS-Updates mitliefern und die automatischen
Linux-Sicherheitsupdates zuverlässig ausführen. js-controller bleibt 7.2.5.

## Anlass und neue Lieferanforderung

Die [offizielle Node-Sicherheitsmeldung](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
vom 21.10.2026 nennt korrigierte Versionen 22.23.4, 24.22.1 und 26.12.1.
Für die EOS-Frischbasis wird **24.22.1** verwendet. Die Meldung betrifft unter
anderem DNS-/TLS-Prüfungen, Brotli, HTTP und den Permission-Modus. Aus der
Paketbetroffenheit wird keine ungeprüfte konkrete Ausnutzbarkeit jeder Lücke
im EOS-Profil abgeleitet. Der bisher vorgesehene Stand 24.21.0 wird für die
neue Lieferung ersetzt.

Offizielle Quelle für Version und Archivpins:
<https://nodejs.org/en/blog/release/v24.22.1>.

| Archiv | SHA-256 |
| --- | --- |
| node-v24.22.1-linux-arm64.tar.xz | dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e |
| node-v24.22.1-linux-x64.tar.xz | 6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6 |

Die Pins wurden aus der offiziellen Release-Seite gelesen. Das ist für sich
kein hier ausgeführter PGP-Signaturtest oder Binärdatei-Downloadnachweis.
Die tatsächlichen Archive müssen beim Build dieselben Hashes besitzen.

## Prüfbereiche

- Node-Paket: erlaubtes Archiv, Architektur, Binärdatei, Lizenz, SBOM und
  native Evidenz gehören zum gleichen vorbereiteten Stand.
- Node-Transaktion: Herstellervertrauen, vollständiger Download, Versionsgrenze,
  gemeinsamer Wechsel von Node/EOS, Bereitschaft, Rückfall und dauerhafter Status.
- OS-Automatik: bekannte Quellen, Paketprüfung, Wartungssperre,
  Neustartbehandlung und tatsächlicher Aktivierungsstatus.
- Admin: vorhandene technische Rollen, bereinigter Status, installierte und
  angebotene Node-Version sowie offene OS-Aktualisierungen.
- Integration: frischer Gesamtbuild und native sechs-Adapter-Prüfung unter
  Node 24.22.1; der bisherige grüne a2733fa-Lauf wird nicht umetikettiert.

## Tatsächlich ausgeführte lokale Prüfungen

Der gemeinsame Lauf über 23 betroffene Node-Testsuiten bestand mit **271/271**
Tests, ohne Fehler oder ausgelassene Tests. Dabei wurden die ursprünglichen
Serialport-Paketbäume als geprüfte Dateifixture verwendet. Die zusätzliche
abschließende Fresh-SBOM-Suite bestand mit **9/9**. OS-Python-Prüfungen bestanden
mit **28/28**. Der Admin-Prebuilt-Selbsttest bestätigte 1.498 versiegelte
Quell-/Laufzeitdateien und 31 Backend-Laufzeitdateien. 64 geänderte JS-/Python-
Dateien bestanden die Syntaxprüfung; die geänderten Shell-/Workflow-Verträge
wurden zusätzlich geprüft. Die eng begrenzte Suche nach privaten PEM-Blöcken
und GitHub-Tokens fand in den geänderten Dateien keinen Treffer; sie ersetzt
keine allgemeine Geheimnis- oder Schwachstellenfreiheitserklärung.

Die Ausführungsumgebung dieser lokalen Tests war **Node 24.19.0, Linux x64**,
nicht der neue Zielinterpreter. Tatsächliche Dateiprüfungen, Kryptografie,
Kernel-flock und Fehler-/Rückfallmodelle sind damit belegt. Ein unter Node
24.22.1 neu gebauter Gesamtstand muss zusätzlich die verpflichtenden CI-
Prüfungen und die spätere ARM64-/Pi-Abnahme bestehen. Browser- und lokale
Socket-Ausführung waren in diesem Container eingeschränkt; ihre CI-Gates
bleiben verpflichtend. Zum Zeitpunkt dieser lokalen Prüfung lag noch kein
CI-Ergebnis vor. Der anschließend ausgeführte Gesamtbuild ist unten getrennt
mit seinem tatsächlichen Quellcommit dokumentiert.

Teilnachweise (Testzahlen überlappen und werden nicht addiert):

| Bereich | Beleg |
| --- | --- |
| Gemeinsamer Endstand und Quellhashes | `verification.json`, `integrated.tap` |
| Node-Transaktion und echte Wartungssperre | [node-transaction](node-transaction/README_DE.md) |
| Paket, Bootstrap, SBOM und spätere Versionen | [node-package](node-package/README_DE.md) |
| Installation, native Verträge und Zertifikatdienst | [core](core/README_DE.md) |
| OS-Automatik und Neustartstatus | [os](os/README_DE.md) |
| Admin, Berechtigungen und Statusdarstellung | [admin](admin/README_DE.md) |

Die gemeinsamen Quellhashes binden den integrierten Stand. Teilberichte
dokumentieren ihren jeweiligen tatsächlichen Prüfzeitpunkt; bei später
geänderten gemeinsam verwendeten Dateien gilt zusätzlich der Endstandnachweis.
Unveränderte historische Lieferungen, ihre Schlüssel und ihre Prüfberichte
werden nicht überschrieben. Private Herstellerschlüssel, Passphrasen,
Kundendaten und echte Lizenzdateien gehören nicht zum öffentlichen Inhalt.

## Neuer Gesamtbuild und tatsächliche Rückprüfung

Der korrigierte Lauf [39725865926](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725865926)
am Quellcommit `06ed52f636d0da58d56a86646cdbe4ba601f1776` bestand alle acht
ausgeführten Sicherheitsjobs. Der vorherige Abbruch durch die abweichende
gebündelte npm-Version ist im [separaten Fehlerbericht](node-package/CI_TOOLCHAIN_FOLLOWUP_DE.md)
erhalten. Der neue Lauf verwendete tatsächlich Node **24.22.1** und den
festgelegten Hersteller-Buildhelfer npm **11.19.0**. npm wird nicht ausgeliefert.

Der frische native Linux-x64-Test bestand **15/15** Prüfungen einschließlich
Erststart, sechs Adapterprozessen, zentraler Lizenzen, logischem Backup und
Neustart. Paketaufbau, tatsächliche SBOM, ARM64-Node-Download und Archivhash
wurden ebenfalls geprüft. Die Browserprüfungen am unveränderten Laufzeitcode
des vorhergehenden Commits bestanden mit 4/4 Update- und 5/5 Netzwerkfällen.
Auch [CodeQL](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725865712)
und die [Workflow-Prüfung](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725865795)
für den neuen Quellcommit sind erfolgreich abgeschlossen. Die vollständigen
[Managed-Update-Verträge](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725191148)
und die [Netzwerkqualifikation](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39725190974)
sind ebenfalls grün; der anschließende Compiler-Fix änderte keinen der dabei
geprüften Laufzeit-, Installer-, Admin- oder Testbäume.

Das CI-Archiv wurde anschließend erneut heruntergeladen. Beide ZIP-Digests,
der enthaltene Tarball und alle **22.441** Inventarzeilen stimmen überein.
`verifyPrepared` und `verifyNativeEvidence` bestätigten den heruntergeladenen
Baum, **22.431** App-Dateien, Node-Metadaten/-Binärdatei/-Lizenz, die tatsächliche
SBOM und den nativen Nachweis für denselben Commit. Lokal wurde die ARM64-
Binärdatei dabei nicht ausgeführt. Details: [CI-Verifikation](ci/verification.json)
und [Rücklesevermerk](ci/artifact-readback.json). Die [tatsächliche SBOM](ci/runtime.cdx.json),
der [Buildrecord](ci/runtime-build.json), [native TAP](ci/own-adapters-native.tap)
und die zugehörigen bereinigten Nachweise sind zusätzlich im Repository erhalten.

Das unsignierte Archiv hat **134.040.451 Byte** und SHA-256
`9854adfb48b52074a67a443bc77756132efc767e9e9c1f2cdb026f41087a17ff`.
Es ist Herstellertransport und kein freigegebener Installationsbefehl.

Der [Audit des tatsächlichen neuen Lockbaums](ci/actual-production-audit.json)
enthält weiterhin **26 betroffene Paketknoten: 20 hoch, 6 mittel, 0 kritisch**.
Dies sind keine 26 unabhängig gezählten Sicherheitslücken. Die konkrete
Erreichbarkeit wurde dadurch nicht nachgewiesen; die Befunde bleiben offen.
Node-Aktualisierung und grüne Integration bedeuten keine vollständige
Schwachstellenfreiheit oder Produktionsfreigabe.

## Noch erforderliche Zielnachweise

Die Veröffentlichung des Quellcodes installiert keine Updates auf einem Pi.
Signierter neuer Lieferstand, authentisches NWL3-Vertrauen, öffentlicher
Rücklesetest und Pi-Erstinstallation bleiben erforderlich. Hinzu kommen echte
OS-Paketläufe, systemd-Sandbox, mehrere aufeinanderfolgende Node-/EOS-Updates,
Unterbrechung und Wiederherstellung sowie Anlagen- und Reaktionszeitmessungen.
Keine Produktions-, CRA- oder vollständige Schwachstellenfreiheitsbehauptung.

[Betriebsablauf](../../../docs/operations/AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).
