# R8-Stilllegung und Übergabe an Managed16

28.10.2026; eng begrenzter Testhost-Helfer, keine Produktionsfreigabe.
Ausgangspunkt: `18889818426bd063aabce1ce51feffc08e6b1c85` auf `main`.
Quellhash und Ergebnisse stehen in [verification.json](verification.json).

## Umsetzung und Herkunft

Der Nutzer autorisierte R8-Ablösung und Neuinstallation und lieferte die Ausgabe
von `inspect-r8-removal.py`: bekannter R8-Teststand, deaktivierte physische
Steuerung, drei dedizierte Konten, 14 Units, unpaketierter EOS-Node-Symlink,
keine fremden PostgreSQL-Daten oder Managed-Update-Hostrichtlinien. Dies ist ein
vom Nutzer berichteter Zustand, kein eigener Fernzugriff. Keine privaten
Konfigurationen, Journalrohdaten oder Schlüssel wurden übernommen.

Der Helfer prüft diesen engen Bestand vor Ort, lädt die fest gepinnte
R16-Lieferung vor dem Stop, bewahrt R8 mittels privater Umbenennungen auf und
übergibt nach unveränderter Fresh-Host-Prüfung an `install_downloaded()` aus dem
ursprünglichen Managed16-Preparer. Alte Konten und Gruppen behalten ihre
numerischen IDs unter neuen, gesperrten Namen. Keine Konto-/Datenlöschung,
Sudo-Erweiterung oder neuer allgemeiner Root-Dienst.

Der feste R8-Manifesthash authentifiziert die Unit-Hashes. Dies ist keine
vollständige Signatur-/Inhaltsattestation der alten Laufzeit. Alter Interpreter
und installierter EOS-Code werden nicht zur Prüfung ausgeführt. Aktive Setup- /
Finalize-Helfer werden abgewiesen; ihre Stop-Hooks werden nicht zur Reparatur
verwendet. Der neue Installer behält alle Signatur-, Lizenz- und Erststartgrenzen.

Der Managed16-Einstieg bleibt bytegleich zu Commit
`1707dfcb5a12c92ec472899ea1f554ed6850ec02`, 49985 Bytes,
SHA-256 `cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f`.
Erst nach Prüfung dieses gesamten Pins wird sein Preparer geladen.
Keine neue Laufzeit, Signierung oder Änderung historischer Lieferungen.

## Tatsächlich geprüfter Umfang

Python 3.12 auf Linux x64. Dateioperationen erfolgen ausschließlich in zufälligen
root-privaten Testverzeichnissen. POSIX-Lockkonflikte werden mit einem kurzlebigen
Testprozess nachgestellt. systemd, Kontenänderungen, `/proc` und Installeraufrufe
sind kontrollierte Modelle. Keine echte EOS-Stilllegung in dieser Umgebung.
Der bestehende Security-Workflow führt `tests/security/*.test.py` unter sudo aus
und nimmt die neuen Tests auf.

Die Tests umfassen den echten gepinnten Managed16-Einstieg, manipulierte
Eingaben, Kontenkollisionen und sechs unterbrechbare Gruppen-/Kontenumbenennungen,
alle 24 realen Dateiverschiebungen, private Journale, Teilfehler und den
Rückweg ohne Autostart. Ferner geprüft: inodeerhaltende Umbenennungen,
Symlink-Vorfahren, Deskriptoren, Stopreihenfolge, PG-Reste, Service-/Target-
Eigenschaften, UID/Cgroup/Interpreter-Inode, PID-Wechsel, Mounts und POSIX-Locks.

Ergänzende Agentenreviews fanden unter anderem falsche PID-Annahmen bei Targets,
unvollständige Dateisystemprüfung, PID-Wechsel, noch aktive Autostartlinks beim
Restore, fehlende Prüfung vor Kontenrückbenennung und Deskriptor-/Symlink-
Vorfahrenprobleme. Diese wurden korrigiert und mit Regressionstests belegt.
Das ist eine ergänzende Codeprüfung, keine externe Sicherheitszertifizierung.

## Offene Grenzen

Kein echter Pi-/ARM64-/systemd-/APT-Installations-, Stromausfall- oder Hardwaretest.
Root darf keine konkurrierende Hostwartung durchführen. Umbenennungen sind pro
Pfad atomar, nicht als gesamte Transaktion. Nach gesetztem Startschutz kann ein
Abbruch gestoppte Dienste hinterlassen. Der begrenzte Rückweg oder eine konkrete
manuelle Zustandsprüfung ist dann erforderlich. Die Originalablage auf derselben
SD-Karte ist keine unabhängige Sicherung. Ab Beginn des neuen Installers ist
R8-Restore gesperrt, um neue Daten nicht zu überschreiben.

Die [offenen Grenzen der R16-Lieferung](../managed16-publication-20261028/README_DE.md)
und die ausstehende Pi-/Produktionsabnahme bleiben bestehen. Keine Behauptung
vollständiger Sicherheitslückenfreiheit oder wartungsfreien Betriebs.
[Bedienung und Datenumfang](../../../docs/operations/R8_ENTFERNUNG_VORBEREITEN_DE.md).
