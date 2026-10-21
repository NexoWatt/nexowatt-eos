# Nachweis der frisch aufgebauten Controller-7-Testbasis

Geprüfter Laufzeitquellstand:
`a2733fa5561f7327ff3689b7464f8727760fb670`.
Controller **7.2.5**, Node **24.21.0**, npm **11.19.0**; Sequenz **15**.
Controller 8 ist weiterhin ausgeschlossen.

Der vollständige [Sicherheitslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39670690111)
bestand alle acht ausgeführten Jobs. Der historische R9-Job wurde wie
vorgesehen nicht ausgeführt. Der neue native Job baute die neue Laufzeit,
prüfte deren tatsächliche PostgreSQL-Objektschnittstelle und startete alle
sechs eigenen Adapter. Lizenzaktivierung und -widerruf, HTTPS-Anmeldung,
logische Sicherung und Neustart bestanden. ARM64-Dateien wurden statisch
geprüft; die tatsächliche Prozessausführung erfolgte im Linux-x64-Labor.
Das ist keine echte Pi-, systemd-, Hardware- oder Stromausfallabnahme.
Ein vollständiger Restore und ein vollständiges Systembackup werden damit
ebenfalls nicht behauptet.

Der getrennte [Managed-Installer-Lauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39670690151)
bestand Vertrags- und Browsertests. Die Ergebnisse der
[CodeQL-Analyse](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39670690075)
werden in `qualified-a2733fa.json` gesondert geführt; ein laufender Scan ist
kein bestandener Scan und ein erfolgreicher Scan allein kein Nachweis, dass
keine Warnungen bestehen.

Nachtrag: Der erste CodeQL-Versuch hat seine SARIF-Ergebnisse hochgeladen,
wurde am 21.10.2026 um 20:45 UTC aber beim anschließenden Verpacken der
Analysedaten abgebrochen. Der Job gilt als **abgebrochen, nicht bestanden**.
Ein erneuter Lauf am identischen Quellstand ist erforderlich. Nachfolgende
Versuche sind am oben verlinkten Lauf zu prüfen; dieser Bericht behauptet
für einen späteren Versuch kein vorweggenommenes Ergebnis.

Das erzeugte unsigned-Archiv wurde als Herstellertransport zurückgelesen.
Hash-, Quell-, SBOM- und native Nachweise sind separat gebunden. Weder dieses
Archiv noch ein grüner Laborlauf ersetzen eine Herstellersignatur.
Die konkreten Artefaktidentitäten und Ergebnisse stehen im
[nativen Nachweis](native-a2733fa/README_DE.md), der zusätzliche
Abhängigkeitsbefund in der [Braces-/Chokidar-Prüfung](../audit/braces-chokidar-a2733fa.md).
Die später veröffentlichte Dokumentation ändert den geprüften Quellcommit
nicht: Für die Signierung sind genau dieser saubere Quellstand und die dazu
gehörenden unveränderten Paket-/Nachweisdateien erforderlich.

Der Audit dieses tatsächlichen Laufzeitbaums ist verfügbar und offen:
26 betroffene Paketknoten, davon 20 hoch und 6 mittel, keine kritisch
eingestuften. Mehrere Knoten führen auf dieselben Advisories zurück. Neben
Forge, AJV/OCPP und der alten optionalen Backup-/Dropbox-Kette ist auch der
neuere `braces`-Befund offen. Eine vollständige Erreichbarkeitsanalyse oder
Risikoakzeptanz wird daraus nicht abgeleitet.

Noch ausstehend sind die dauerhafte Hersteller-Schlüsselbereitstellung,
authentifizierter öffentlicher Lizenzprüfschlüsselbestand, Signierung,
öffentliches Installationspaket und gültiger signierter Updatefeed samt
Rückleseprüfung. Danach folgen Frischinstallation und Updateknopf-Test auf
dem tatsächlichen Pi. Der bestehende R11-Befehl installiert diese neue
Basis nicht. Private Schlüssel und echte Betriebsdaten gehören nicht in
die öffentliche Lieferung.
