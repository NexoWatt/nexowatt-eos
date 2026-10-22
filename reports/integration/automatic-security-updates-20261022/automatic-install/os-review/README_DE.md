# Linux-Automatik und R8-Übernahme – 22.10.2026

Quellbasis `02257b74c9124f504979d9bc012af27451719aca`; die tatsächlich geprüften
Dateihashes, Umgebung, Befehle und Ergebnisse stehen in `verification.json`.

Die vorhandene Linux-Wartung installiert bereits selbstständig: eingeschaltete
Policy, täglicher Timer um 02:00 Uhr Europe/Berlin mit bis zu 15 Minuten
Zufallsverzögerung und tatsächlicher Aufruf von `unattended-upgrade`. Freigegeben
sind signierte Debian-Archive desselben Codenamens (`bookworm` oder `trixie`),
gegebenenfalls Raspberry-Pi-main desselben Codenamens. Das ist kein
Distributions-Hauptversionswechsel. Der stabile Basisstrom enthält auch
Fehlerkorrekturen ohne gesonderte Sicherheitsklassifizierung. Node/npm werden
hier bewusst nicht installiert; dafür ist der signierte EOS-Node-Pfad zuständig.

Der neue begrenzte Helfer `tools/system/migrate-r8-os-maintenance.cjs` übernimmt
diese Zuständigkeit bei der direkten R8-Migration. Der übergeordnete Koordinator
muss vorher beide Releases authentifizieren und den von `prepare` gelieferten
Plan dauerhaft privat journalisieren. Der Helfer besitzt keinen CLI-Einstieg,
keine freie Befehls-/Pfadwahl und startet keine Paketinstallation.

- Vorbereitung liest ausschließlich: exakt veröffentlichter R8-Pfad,
  unveränderte eingeschaltete R8-OS-Policy, root-eigene Dateien, geschütztes
  `private`-Verzeichnis mit 0711 für APT-Cachezugriff, leere 0600-Lockdatei oder
  deren Abwesenheit sowie bekannte Timerzustände. Fremde `policy-rc.d`-/APT-
  Dateien und eine bewusst abgeschaltete OS-Policy werden nicht überschrieben.
- Übernahme stoppt nur Timerplanung. Laufende OS-/APT-Dienste führen vor und
  nach dem Timerstopp zum Abbruch; sie werden niemals beendet. Der eigene
  OS-Timer bleibt bis zum erfolgreichen Abschluss durch den Koordinator
  gestoppt. Der fremde APT-Upgrade-Timer wird deaktiviert/maskiert. Feste
  Paket-Servicepolicy und APT-Konfiguration stammen aus dem geprüften Ziel;
  die wirksamen periodischen APT-Schalter werden zurückgelesen.
- Danach erwirbt der Koordinator den gemeinsamen Kernel-Lock vor den übrigen
  Hoständerungen. Die ursprüngliche OS-Policy, Statushistorie und tatsächliche
  Paket-SBOM werden nicht zurückgesetzt.
- Rückfall prüft die gesamte feste Dateiliste vor Änderungen, entfernt nur
  unverändert eigene neue Dateien und stellt die vorherigen Timerzustände
  wieder her. Unbekannte Zustände werden nicht überschrieben. Er erfolgt nach
  Rücknahme von Release/Units und `daemon-reload`, solange der Koordinator den
  gemeinsamen Lock hält. Eine neu angelegte leere 0600-Lockdatei bleibt bewusst
  erhalten: Das Löschen eines gehaltenen Lock-Inodes könnte parallele Locks
  ermöglichen. Diese Datei aktiviert keine Wartung und enthält keine Daten.

**Prüfung:** 8 neue Übernahme-/Rückfallverträge, 7 bestehende Installations-/Status-
Verträge und 28 Python-OS-Verträge bestanden. Enthalten sind fremde Dateien,
Symlinks, aktive Paketwartung, Start-Rennen nach Vorbereitung, veränderte
Planpfade/-Inhalte, partielle Übernahme, unveränderte Lock-Inodes und verweigerter
Rückfall bei zwischenzeitlich geänderter Datei. Rohbelege liegen in
`node-contracts.txt` und `python-contracts.txt`. Die Systemkommandos der
Migration sind simuliert; einzig vorhandenes `apt-config` wird in den
bestehenden Python-Verträgen rein lesend ausgeführt.

Automatische Reboots bleiben aus. Paketinstallation und Aktivierung sind
unterschiedlich: zurückgestellte Dienste/Kernel bleiben sichtbar als
Aktivierungs-/Neustartbedarf. Der Standard-Paketservicepfad wird zurückgestellt;
privilegierte Paket-Maintainerskripte können diese Konvention umgehen.
Ausgeschaltete Geräte holen das Fenster nicht tagsüber nach (`Persistent=false`).
Belegter gemeinsamer Lock verschiebt den Lauf; veralteter Erfolg bleibt sichtbar.
Holds, Pins, Drittquellen und fehlende/unklare Aktivierung sind keine grünen
Vollständigkeitsnachweise.

Echte R8-Pi-Migration, systemd/APT/dpkg, ARM64-Last, Reboot, Stromausfall,
Wiederherstellung und Anlagenverhalten bleiben **OFFEN**. Dieser Helferbericht
belegt keine vollständige Koordinatorintegration und keine Produktionsfreigabe.
