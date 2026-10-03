# Ein-Befehl-Einstieg: Implementierung und lokale Prüfbelege

Stand: 3. Oktober 2026, Windows x64, Node 24.21.0. Diese Belege betreffen den
neuen Download-/Vorbereitungsweg und die systemd-Vorprüfung. Sie sind **kein
Nachweis einer ausgeführten Pi-Installation**.

## Ausgeführt

| Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| Downloadbuilder und Erststart-Runner | 20 bestanden, 0 Fehler | `node-bootstrap.stdout.log` |
| Python-Vorbereitung | 15 bestanden, 0 Fehler | `python-bootstrap.stderr.log` |
| systemd-Namensraum, gezielte Regressionen | 4 bestanden, 0 Fehler | `unit-namespace.stdout.log` |
| Vollständige PostgreSQL-Hostfixtures auf Windows | 13 bestanden, 4 Fehler, 1 übersprungen | `postgresql-host-fixtures.stdout.log` |
| Tatsächliche Bash-Syntax und generierter Hashcheck | Syntax erfolgreich; Original akzeptiert, manipulierte Datei abgewiesen | `shell-verification.json` |
| Wirkliches signiertes Archiv → Downloadkit → Python-Extraktion | Bestanden; 96 Kitdateien bytegleich, 83 signierte Quellbindungen, offizielles ARM64-Node-Binary extrahiert | `publication-fixture.json` |

Die vier systemd-Regressionen sind im vollständigen Hostfixture-Lauf enthalten;
die Tabellenwerte werden nicht zu einer künstlichen Gesamttestzahl addiert.
Der vollständige Windows-Lauf ist **nicht bestanden**. Seine vier Fehler
betreffen POSIX-Toolownership sowie drei POSIX-Releasepfad-Fixtures
(`PG_INVALID_RELEASE_LAYOUT`). Der reale root-/OpenSSL-Test wurde übersprungen.
Weder Produktionsprüfungen noch ursprüngliche Testanforderungen wurden dafür
abgeschwächt. `run-checks.cjs` dokumentiert diese erwartete Windows-Grenze,
zeichnet aber den tatsächlichen Fehlerstatus und die vollständigen Ausgaben auf.

Die neuen Fixtures prüfen unter anderem: veränderte Downloadbytes vor jeder
APT-Transaktion, Daten-/Clustererhalt, unzulässige Archiveinträge und Pfade,
feste ELF-Architektur, PostgreSQL-Vorbereitungsreihenfolge, IPv4-Mehrdeutigkeit,
fehlendes TTY, falsche Lizenz-/Releasepins und Geheimnisfreiheit normaler
Erfolgs-/Fehlerausgaben. Root-/systemd-/Netzwerkaufrufe werden in diesen Fixtures
ersetzt. Die Dateidaten, Ed25519-/X509-Verarbeitung und Datenarchive werden
tatsächlich verarbeitet.

`commands.json` hält die konkreten Befehle, Exitcodes und Quelldigests fest.
Die absichtlich duplizierten ZIP-Einträge erzeugen eine erhaltene Python-Warnung;
der zugehörige Test verlangt deren Ablehnung.

## Gemeldeter Pi-Ausgangsbefund

`reported-pi-preflight.json` stammt aus dem vom Nutzer eingefügten PuTTY-Protokoll
zum Checkout `5330f94a4f36d6866c83aebc9722af4656c4ee99`.
Die Checkliste ist vollständig: 80 von 81 Prüfungen bestanden, nur
`fresh-unit-namespace` fehlgeschlagen, `changesPerformed:false`.
Der JSON-Nachspann im Anhang ist abgeschnitten; dies wurde nicht verschwiegen
oder zu einem vollständigen Agententest umgedeutet. Die angefragte gesonderte
systemctl-Ausgabe liegt noch nicht vor. Ob auf genau diesem Pi der systemd-
Leertrefferstatus die Ursache war, ist damit nicht abschließend gemessen.

Unabhängig davon war die Annahme im Quellcode falsch: systemd257 kann eine
gefilterte leere Unitliste mit Status 1 beenden. Die neue Prüfung verlangt
deshalb eine erfolgreiche vollständige Liste und erkennt vorhandene EOS-/
ioBroker-Units einschließlich deaktivierter, maskierter und Template-Units.
Ein generischer Status 1 wird weiterhin abgewiesen. Primärquelle:
[systemd257 list-unit-files](https://github.com/systemd/systemd/blob/v257/src/systemctl/systemctl-list-unit-files.c).

## Downloadpaket und reale Grenzen

`publication-fixture.cjs` hat nach Abschluss der neuen signierten Lieferung
den zusätzlichen Integrationstest erfolgreich ausgeführt. Der Lauf wird durch
`publication-fixture.json` samt stdout/stderr belegt. Dabei werden das wirkliche
signierte EOS-Archiv, der tatsächliche Downloadbuilder, alle extrahierten
Kitdateien und das fest gepinnte ARM64-Node-Archiv geprüft. Der NWL2-Publickey ist
dabei ausdrücklich ein isolierter Fixture-Schlüssel; die Beispieladresse ist
unveröffentlicht. Die erzeugten Dateien bleiben unter dem ignorierten `.work/`.
Sie sind kein verwendbarer Herstellerdownload und keine echte Gerätelizenz.

Noch **offen, nicht ausgeführt**: öffentlicher HTTPS-Download, echter
Hersteller-Lizenztrust, native APT-/Node-/systemd-/PostgreSQL-Installation auf
Debian13 ARM64, tatsächliche TTY-/POSIX-Grenzen, Browserablauf auf dem Pi,
Gerätezertifikatsverteilung, Reboot/Abbruch/Recovery, Backup/Restore sowie
alle Hardware-/Anlagentests. Die automatische Ausstellung öffentlich
vertrauenswürdiger Gerätezertifikate und ein Flotten-Updater sind nicht implementiert.

Der neue signierte Payload mit der Vorprüfung steht in
[Revision 2](../installable-test3-r2-20261003/README.md). Die ursprüngliche test.3-
Lieferung und ihre Belege bleiben erhalten. Kein Produktivfreigabeanspruch.
