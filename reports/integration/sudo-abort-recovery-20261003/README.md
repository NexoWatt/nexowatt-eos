# Wiederanlauf des diagnostizierten R2-Sudo-Abbruchs

Stand: 03.10.2026. Ausgangscommit `main`:
`3300a2545baf2937f69ad87a9911f419bdd8ddc0`.

## Tatsächliche Nutzerbeobachtung

Die [neue Pi-Diagnose](user-pi-diagnostic.txt) bestätigt ein gesperrtes
`eos-runtime`-Konto mit UID 999 / GID 985, `/nonexistent` und
`/usr/sbin/nologin`. Die vollständige Ablehnung der Sudo-Rechte liefert
Exitcode 0 unter sudo `1.9.16p2-3+deb13u2`. Damit bestätigt das Zielprotokoll
den bereits in Revision 3 korrigierten Auswertungsfehler.

Die Diagnose zeigt keine Prozesse dieses Kontos, keine Cluster- oder
gefilterten Unitzeilen und keine EOS-Konfigurations-/Daten-/Logverzeichnisse
oder `current`-Verknüpfung. Die Befehlsstatus der Cluster-/Unitabfrage wurden
nicht protokolliert. Das Verzeichnislisting reicht nur bis Tiefe 3 und ist
kein Inhalts-, Signatur- oder Mountnachweis. Diese Grenzen sind in
[Originalhash, Auszugsbildung und Befund](user-pi-observation.json) festgehalten.
Der Agent hat keine SSH-Befehle auf dem Pi selbst ausgeführt.

## Eng begrenzte Wiederherstellung

Der separate Python-Helfer prüft den Zustand unmittelbar vor Änderungen:
geschützte Hostwerkzeuge, Betriebssystem/Systemd, alle relevanten EOS-Pfade,
vollständige erfolgreiche Unit-/Clusterabfragen, lokale und NSS-Kontotabellen,
Passwortsperre, Gruppen, Prozessfreiheit und Mountpunkte.

Die R2-Manifestbytes, rohe Ed25519-Signatur und öffentliche Schlüsseldatei
sind fest gepinnt. Der Helfer prüft zusätzlich die Signatur und sämtliche
22.202 Nutzdateien mit Größe, Hash, Modus und Eigentümern. Zusätzliche Dateien,
Verzeichnisse, Links, Hardlinks, Sonderdateien und fremde Mounts werden abgewiesen.
Der bisherige native Prüfbeleg wird nur als historischer Beleg geprüft und
erhalten; kein Runtime-Code aus dem alten Baum wird ausgeführt.

Nach erfolgreichen Prüfungen entsteht ein privates root-Verzeichnis unter
`/opt/nexowatt/.eos-r2-abort-*`. Das synchronisierte Journal bindet den
Ausgangszustand einschließlich Geräte-/Inodennummer und dokumentiert den
jeweils nächsten Schritt. Der alte Baum wird innerhalb desselben Dateisystems
umbenannt, danach die Gruppe und zuletzt der Benutzer. UID 999 / GID 985
bleiben belegt und Dateieigentümer erhalten. Der neue Name ist
`eos-aborted-runtime`. Kein Konto, Datenbaum, Downloadnachweis oder
PostgreSQL-Cluster wird gelöscht; sudoers wird nicht geändert.

Bei Teilfehlern bleiben Quarantäne und Journal bestehen. Ein weiterer Lauf
verweigert die ungeprüfte Wiederaufnahme; es gibt keinen automatischen Rollback.
Der Wiederanlauf-Einstieg startet den bereits veröffentlichten R3-Installer nur
bei erfolgreichem Abschluss. Er fragt einmal verdeckt nach dem GitHub-Token;
der Recoveryprozess erhält ihn nicht. Die bestehenden R3-Lieferdateien,
Runtime-Signatur, Hersteller-Lizenztrust und Installationspins bleiben unverändert.

## Lokale Nachweise und Grenzen

[Ausführbare Aufzeichnung](record-local.cjs), [Prüfergebnis mit Quell- und Rohloghashes](verification.json).
**33 Python-Tests und 10 Tests des Kopierbefehls bestanden, keine übersprungenen
Tests.** Der separate vollständige R2-Archivvergleich ist ebenfalls bestanden.
Die Python-Tests prüfen echte kleine Dateibäume mit ausdrücklich nachgebildeten
POSIX-Metadaten auf Windows sowie Konto-/Mount-/Prozess-/Unit-Negativfälle,
Mutationsreihenfolge und Abbrüche. OS-Konten- und Dienstbefehle sind dabei
inert ersetzt; diese Tests verändern keine Hostkonten.

Die Kopierbefehltests prüfen die SHA-Prüfung vor Ausführung, den Abbruch vor
R3 bei Fehlern, einmalige Tokenabfrage, saubere Umgebung und die unveränderten
veröffentlichten R3-Pins. Zusätzlich liest der Archivtest das tatsächliche
historische R2-Archiv vollständig, vergleicht alle 22.202 Dateien mit dem
Manifest und prüft dessen Ed25519-Signatur mit Node. Die Python-Suite prüft
dieselbe echte Signatur mit dem verfügbaren lokalen OpenSSL. Das sind
Herstellerprüfungen, keine erneute native Pi-Ausführung.

[Artefakt- und Befehlsbindung](artifact-verification.json): ausgelieferter
Helfer bytegleich zur geprüften Quelle, Kopierbefehl bytegleich zum Renderer
und zur Anleitung, Größen-/SHA-256-/Git-Blob-Pins geprüft. Der tatsächlich
generierte Block wurde mit dem lokalen Git-Bash erfolgreich auf Bash-Syntax
geprüft (`--noprofile --norc -n`); er wurde dabei nicht ausgeführt.

Die zuvor dokumentierten Plattformgrenzen und Fehlläufe der R3-Prüfung bleiben
[unverändert nachvollziehbar](../github-bootstrap-sudo-20261003/README.md).
Dieser Nachweis ersetzt sie nicht durch eine pauschale Gesamtfreigabe.

**Tatsächliche Recovery, native Linux-Konto-/Rename-/fsync-Prüfung, vollständige
Pi-Installation, Browser-Ersteinrichtung, echte Lizenzannahme und Passwortvergabe,
Reboot und Hardware-/Anlagentests: OFFEN.** Keine Produktions- oder Anlagenfreigabe.

[Kopierbefehl und Bedienung](../../../docs/operations/SUDO_ABORT_RECOVERY_DE.md).
