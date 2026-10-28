# R8 gezielt entfernen: Bestandsaufnahme vorbereitet

Stand: 28.10.2026. Nutzerziel ist die Entfernung der alten EOS-Testinstallation
unter Beibehaltung von Debian und anschließend die signierte Managed16-
Neuinstallation. Es wird kein Neuaufsetzen des Systemmediums ausgeführt.

## Tatsächliche Ausgangsbeobachtung

Vom Nutzer gemeldet: ARM64 (`aarch64`), Debian 13.7/Trixie, `/usr/bin/node`
Version 24.21.0 und 14 EOS-Units. Die Namen entsprechen der normalen R8-
PostgreSQL-Basis. Dateiinhalte, Ownership, Konten und eventuelle Teiländerungen
des fehlgeschlagenen Managed15-Versuchs sind damit noch nicht geprüft.

Der historische Hostvorbereiter kann entweder seinen eigenen Node-Symlink auf
`/opt/nexowatt-node/node-v24.21.0-linux-arm64/bin/node` anlegen oder ein schon
vorhandenes Node akzeptieren. Deshalb beweist die Versionsausgabe nicht, dass
`/usr/bin/node` EOS allein gehört. Der Managed16-Einstieg akzeptiert vorhandenes
Node nur in Version 24.22.1; bei fehlendem Node installiert er seinen gepinnten
Interpreter. Die veröffentlichte signierte Managed16-Lieferung bleibt unverändert.

## Änderung und geprüfte Grenzen

Der eigenständige Standardbibliothek-Helfer
`tools/system/inspect-r8-removal.py` sammelt ausschließlich lesende,
redaktierte Planungsdaten: feste R8-Identität als Booleans, Pfad-/Dienstmetadaten
und Hashes, Node-Symlinkklasse und Paketzuordnung, lokale Konten, fremde
PostgreSQL-Verzeichnisbelegung, bekannte Wartungsdateien und Schutzmarkierungen.
Er startet kein Node, keinen EOS-Code und keine Dienste. Er schreibt und löscht
keine Systemdateien. Der Aufruf benötigt root zum Lesen geschützter Metadaten;
es gibt weder einen Apply- noch einen alternativen Zielverzeichnis-Schalter.

Dateiinhalte werden über descriptorbasierte Pfade ohne Symlink-Folgen begrenzt
gelesen. JSON-Duplikate, übergroße Daten, Hardlinks, FIFOs und unsichere Pfade
werden abgewiesen. Fremde Identitäten, Passwort-/Lizenz-/Zertifikatswerte,
Prozessargumente, Logs und Fehlermeldungsinhalte werden nicht ausgegeben.
Es gibt keine pauschale Aussage über Geheimnisfreiheit beliebiger Hostdaten.

19 gezielte Fixturetests, Python-Syntaxprüfung und ein tatsächlich ausgeführter
lesender Linux-Executor-Smoke-Test bestanden. Zwei Bereiche wurden zuvor
getrennt quellgeprüft (Node/OS sowie Daten/Units); zusätzliche Agenten-Codeprüfung
des fertigen Helfers ohne konkreten Blocker. Keine unabhängige Zertifizierung.
[Maschinenlesbarer Prüfvermerk](verification.json).

`capture_output` begrenzt Ausgaben erst nach dem Prozessende; feste OS-Abfragen
haben jeweils fünf Sekunden Timeout. Der Helfer bestätigt weder einen atomaren
Gesamtzustand noch vollständiges NSS, freie Mount-/Prozessgrenzen oder Lock-
Ownership. `removalApproved: false` verhindert eine Verwechslung mit einer
Deinstallationsfreigabe. Diese Prüfungen und eine authentifizierte Zuordnung
müssen vor einer späteren Mutation erneut erfolgen.

## Geplanter nächster Schritt

[Betreiberanleitung](../../../docs/operations/R8_ENTFERNUNG_VORBEREITEN_DE.md).
Nach der tatsächlichen Pi-Ausgabe wird ein eng begrenzter Stilllegungsplan
abgeleitet. Das Sicherungs-/Rückfallverzeichnis bleibt root-privat auf dem Pi
und enthält gegebenenfalls Datenbankdaten und Geräteschlüssel; niemals hochladen.
Eine Quarantäne wäre noch kein erprobter vollständiger Restore.

Bis dahin sind R8-Entfernung, Node-Umstellung und Managed16-Installation auf
Hardware **NICHT AUSGEFÜHRT**. Kein allgemeiner Deinstaller, keine erfolgreiche
Neuinstallation, keine Produktions-/CRA-Freigabe und kein gelöschter Bestand.
