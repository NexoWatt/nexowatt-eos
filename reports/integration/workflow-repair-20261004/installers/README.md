# Installer-Workflows: EOS-Vertrag statt Upstream-Autostart

Bezug: Nutzerauftrag vom 04.10.2026, wiederkehrende fehlerhafte GitHub-Läufe nach
Uploads korrigieren. Basis: `6f1b9a7d2ee0d3bd322667a7a132227e13658b4f`.

Die bisherigen Workflows erwarteten eine ioBroker-Neuinstallation unter Linux,
macOS und FreeBSD mit automatisch erreichbarem HTTP-Admin. Das widerspricht dem
bereits dokumentierten EOS-Shellprofil: Linux/systemd, geschützte OS-Werkzeuge und
anschließend gestoppter/deaktivierter Dienst. FreeBSD wurde deshalb absichtlich
verweigert; macOS verwendete zudem eine ungeeignete ältere Bash. Der Linux-Runner
besaß ungeschützte Installationsverzeichnisse. Keine dieser Schutzprüfungen wurde
für diese CI-Korrektur abgeschwächt.

`test.yml` prüft jetzt den tatsächlichen lokalen Build und die Sicherheitsverträge
mit jeder akzeptierten Node-Hauptversion aus `versions.json` (aktuell 22/24/26).
Die ausgewählte Node-Version wird vor der Prüfung kontrolliert. Es gibt keine
Änderung oder Entfernung der System-Node-Installation, keine APT-Installation und
keine Erwartung eines automatisch gestarteten HTTP-Dienstes. Die TLS-, SFTP-,
Hostrichtlinien-, Wrapper-, Service- und privaten Logprüfungen bleiben wirksam.

`freebsd.yml` prüft die bewusste Ablehnung von FreeBSD, Darwin und Linux ohne
systemd. Dafür laufen die tatsächlichen eingebetteten Preflight-Abschnitte beider
erzeugter Dateien mit inerten Plattformabfragen. Exakt Exitcode 1, die erwartete
Fehlermeldung und ausschließlich der bekannte Bibliotheksbanner sind erforderlich.
Eine andere Fehlermeldung, ein Syntaxfehler oder unerwarteter Erfolg bestehen die
Prüfung nicht. Der Installer-/Fixer-Rumpf ist vollständig abgeschnitten und wird
auch bei einem fehlerhaften Preflight nicht ausgeführt.

Der neue Helfer prüft außerdem die eingebetteten lokalen Eingaben bytegenau
(einschließlich der definierten Bash-Regel zum Entfernen abschließender LF), die
Shellsyntax sowie erfolgreiche und abgewiesene Preflight-Fälle. Tokens erhalten
nur Leserechte; Actions sind mit vollständigen Commit-SHAs gebunden. Relevante
Pfadfilter verhindern erneute Installer-Läufe bei reinen Liefer-/Dokumentänderungen.
Fehlschläge bleiben blockierend; es gibt kein `continue-on-error`.

## Prüfbelege und Grenzen

`local-results.json` bindet die tatsächlich ausgeführten Befehle, Exitcodes,
Umgebung und Rohlog-Prüfsummen an den Basiscommit und die geänderten Dateihashes.
Die danebenliegenden Logs enthalten die unveränderten lokalen Prüfausgaben.
Die erste Entwicklungsversion der neuen Assertions übersah den vorhandenen
`library: loaded`-Banner; dieser Erwartungsfehler wurde vor dem dokumentierten
Abnahmelauf korrigiert. Produktquellen wurden dafür nicht verändert.

Die lokalen Nachweise gelten für die darin aufgezeichnete Node-Version. Der
GitHub-Matrixlauf wird erst nach Veröffentlichung bewertet. Vollinstallation,
APT/NodeSource, reale Systemd-/UID-Grenzen, native macOS-/FreeBSD-Ausführung,
alte Bash und der Pi-Test sind damit nicht als bestanden nachgewiesen. Die
Produkt- und Anlagenfreigabe bleibt getrennt.
