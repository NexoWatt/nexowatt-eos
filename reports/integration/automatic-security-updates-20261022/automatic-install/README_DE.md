# Selbstständige Sicherheitsupdates und direkter R8-Übergang

Stand: 22.10.2026. Quellbasis `02257b74c9124f504979d9bc012af27451719aca`;
die tatsächlichen geänderten Quellen sind über SHA-256 in den Teilberichten
und im [gemeinsamen Prüflauf](integration/verification.json) gebunden.

Der Nutzer hat den Auftrag präzisiert: Linux-Sicherheitsupdates und Node-Updates
innerhalb der freigegebenen Hauptversion sollen ohne Updateknopf installiert
werden. Der neue Stand soll außerdem unmittelbar auf einem gesunden R8
installierbar sein, ohne R9, R10 und R11 einzeln nachzuziehen.

## Änderung und Sicherheitswirkung

- Die vorhandene tägliche Linux-Automatik bleibt innerhalb der zugelassenen
  signierten Distributionsquellen und der vorhandenen Debian-Version.
- Der Node-Dienst installiert ausdrücklich freigegebene, signierte reine
  Node-24-Pakete selbstständig im Zeitfenster 02:30–03:00 Europe/Berlin. Der
  Empfänger verlangt unveränderte App-, Katalog- und Hostdateien, eine neuere
  Node-Version, gültige Signaturen und eine passende Ausgangs-ID. Ein dauerhaft
  erfasster Versuch pro Tag begrenzt Wiederholungen. Manueller Wartungs- oder
  Sicherungsnachweis wird nicht erfunden.
- Der Herstellerpfad erhält die authentifizierten Ausgangsdateien exakt,
  bindet die neue Node-Datei und die tatsächliche SBOM neu und verlangt neue
  native Nachweise vor Signierung. Er unterscheidet beibehaltene Produktquellen
  vom aktuellen Herstellungswerkzeug. Ein Folgepaket wurde hier nicht erzeugt.
- Der getrennte direkte R8-Koordinator übernimmt die genaue Sequenz 11 in
  Sequenz 15 einschließlich dauerhafter Updateautorität, neuer Dienste und vier
  passiver Adapterinstanzen. Konten, vorhandene Managementkonfiguration,
  Lizenzvertrauen, TLS und Datenbank bleiben erhalten. Er verändert ausschließlich
  die Controller-Version im vorhandenen Core-Marker und ergänzt die festen
  Enrollment-Dokumente. js-controller bleibt bei 7.2.5.
- Node-/EOS- und OS-Operationen benutzen einen gemeinsamen Kernel-Lock.
  Kandidatenfehler verlangen einen überprüften Rückfall oder einen gesperrten
  Wiederherstellungszustand. Ausstehende Kernel-/Dienstaktivierungen bleiben
  sichtbar; eine pauschale automatische Anlagenneustartfreigabe entsteht nicht.

## Tatsächlich geprüft

Der gemeinsame lokale Lauf bestand **324 Node-Tests ohne Skip und 42 Python-Tests**
(5 Node-Archiv-, 6 vorbereitete-Archiv-, 3 R8-Download- und 28 OS-Fälle).
Das Admin-Siegel bestand für 1498 Dateien, davon 31 Backend-Laufzeitdateien.
Die geprüften Implementierungsdateien blieben während des Laufs unverändert.
Umgebung: Linux x64, **Node 24.19.0**, Python 3.12.14. Das ist kein lokaler
Ausführungsnachweis für Node 24.22.1 oder ARM64.

Reale Dateioperationen, Signaturen, Größen-/Hashprüfung und Kernel-Lockkonkurrenz
wurden ausgeführt. Systemd, APT, Datenbank und native Kandidatenstarts sind in
den Transaktionsverträgen durch Testdoubles ersetzt. Fehler nach jedem der elf
Enrollment-Schreibschritte und nach jedem der sechs Rückfallschritte wurden
geprüft. Unbekannte Dokumentänderungen verhindern eine teilweise Löschung.

Das tatsächlich veröffentlichte signierte R8-Archiv wurde zusätzlich anhand
seines festen Hashes, seiner Ed25519-Signatur und seines vollständigen Inventars
mit dem aktuellen Validator geprüft. Die genaue Ausgangsidentität, alle 14 Units,
SQL-Schema, OS-Policy und bestehende Admin-Rechteprojektion sind statisch belegt.
Das Archiv wurde weder verändert noch ausgeführt.

Zusätzliche interne Agentenreviews fanden zwei Herstellergrenzen, die vor diesem
gemeinsamen Lauf korrigiert wurden: exakte Ableitung der gesamten SBOM sowie
PAX-/Archivgrenzen vor der Interpretation. Der restriktive R8-Aufruf mit
`UMask=0077` erhält durch ausdrücklich gesetzte Modi lesbare öffentliche
Release-Metadaten und Dienstdateien. Zertifikats-Timer werden während des
Hostwechsels pausiert und kontrolliert wiederhergestellt. Diese Reviews sind
keine unabhängige Zertifizierung.

Teilnachweise: [Node-Empfänger](node-receiver/README.md),
[Herstellerpakete](packaging/README_DE.md), [Admin](admin/README_DE.md),
[OS-Übernahme](os-review/README_DE.md), [R8-Einstieg](r8-entry/README_DE.md),
[R8-Migration](../../r8-direct-managed-20261022/README.md).

## Offene Liefer- und Zielprüfungen

Die geänderten Quellen sind noch kein signiertes neues Installationspaket.
Die eigene WSL-Signierung, Veröffentlichung mit vollständiger öffentlicher
Rückprüfung und der tatsächliche R8-Übergang auf dem Pi fehlen. Der direkte
Einstieg prüft die nötigen Hostwerkzeuge; R8 garantiert `nftables` und
`dnsmasq-base` noch nicht. Diese Voraussetzungen müssen vor der Umstellung
erfüllt sein, benötigen aber keine Zwischenversion von EOS.

Offen bleiben der vollständige R8-Systemd-/PostgreSQL-Migrationslauf,
Rückfall der tatsächlichen alten Webdateien, Unterbrechung/Stromausfall,
zwei aufeinanderfolgende automatische Node-Updates, echte APT-Läufe und
Kernel-/Dienstaktivierung auf dem Zielgerät. Der bisherige native Nachweis am
Commit `06ed52f636d0da58d56a86646cdbe4ba601f1776` qualifiziert seinen damaligen
Stand und wird nicht als Nachweis dieser neuen Migration umgedeutet.

Die 20 hohen und 6 moderaten betroffenen Paketknoten des vorherigen tatsächlichen
Dependency-Audits bleiben offen; dieses Inkrement ändert ihre Abhängigkeiten
nicht. Keine Aussage über vollständige Schwachstellenfreiheit, Produktions-,
CRA-, physische Anlagen- oder 50-/100-ms-Freigabe.
