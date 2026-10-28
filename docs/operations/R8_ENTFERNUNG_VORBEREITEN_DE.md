# R8-Testinstallation durch Managed16 ersetzen, Debian behalten

Stand: 28.10.2026. Der Nutzer hat die Ablösung des konkreten R8-Test-Pi
beauftragt. Seine Rückmeldung zur lesenden Bestandsaufnahme bestätigt den
bekannten R8-Stand, deaktivierte physische Steuerung und die zugehörigen
EOS-Dateien/Konten. Der neue Helfer prüft diese Bedingungen vor Ort erneut.
Ein erfolgreiches Prüfergebnis allein war keine ausgeführte Stilllegung.

## Ablauf

`tools/system/retire-r8-for-managed16.py` ist ausschließlich für diesen
Debian-13-ARM64-Testbestand vorgesehen: R8-Release-ID
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`, Sequenz 11,
Node 24.21.0 und die drei bestätigten Dienstidentitäten. Keine anderen
Installationen, Force-Optionen oder frei wählbaren Löschziele werden unterstützt.

Der veröffentlichte, gepinnte PuTTY-Aufruf wird nach dem Byte-Readback des
Helfers in dieser Anleitung ergänzt. Nicht direkt eine veränderliche Datei
von `main` als root ausführen.

Der Ablauf benötigt die offene PuTTY-Sitzung und den vorhandenen sudo-Zugang:

1. Den unveränderten Managed16-Einstieg vollständig laden und seinen festen
   SHA-256-Wert prüfen. Erst danach wird dessen eingebetteter Python-Preparer
   geladen. Die drei festen R16-Archive werden vollständig heruntergeladen
   und hashgeprüft, während R8 noch vorhanden ist.
2. Host, authentifizierten R8-Manifesthash, 14 Unitdateien, Konten, Symlinks,
   Mounts, Prozesse und Paketverwaltung erneut prüfen. Der Manifesthash bindet
   die Unit-Pins; kein installierter EOS-/Node-Code wird zur Prüfung gestartet.
   APT-Quellen werden mit den unveränderten Managed16-Regeln geprüft.
3. Bestehende APT/dpkg-Sperrdateien mit POSIX-Sperren reservieren, den eigenen
   EOS-Startschutz setzen, Aktivierungsquellen und Dienste geordnet stoppen.
   PostgreSQL erhält sein normales systemd-Stopverfahren. Verbliebene Prozesse,
   Mounts, Portbelegung oder PG-PID-/Socketreste führen zum Abbruch.
4. Exakte Autostartlinks, 14 Unitdateien, sechs EOS-Wurzeln und den alten
   `/usr/bin/node`-Symlink auf demselben Dateisystem in
   `/root/eos-r8-retired-…/original/` verschieben. Die Ablage ist root-eigen mit
   Modus 0700. Jede Umbenennung wird privat protokolliert; keine rekursive
   Löschung, Kopie oder Änderung numerischer Dateieigentümer erfolgt.
5. `eos-runtime`, `eos-postgres` und `eos-setup` samt ihren Gruppen in
   `eos-r8-runtime`, `eos-r8-postgres` und `eos-r8-setup` umbenennen. UID/GID,
   gesperrte Anmeldedaten und `/nonexistent`/`nologin` bleiben erhalten.
   Die alten numerischen IDs bleiben belegt. R16 legt eigene Dienstkonten an.
6. Die vollständige, unveränderte Fresh-Host-Prüfung des Managed16-Preparers
   ausführen. Paketsperren freigeben und dessen `install_downloaded()` mit den
   bereits geprüften Archiven aufrufen; diese Funktion prüft Host und Dateien
   erneut und startet den ursprünglichen Installer.

Es wird keine neue Laufzeit signiert. Ziel bleibt die veröffentlichte
Managed16-Testlieferung mit **js-controller 7.2.5**, Node **24.22.1** und Release-ID
`06f8e06f923b180c0bcbb03f6f853f402cf5a8649a1e6b8172d34262aca63e3d`.
Controller 8 wird nicht installiert.

## Erhaltene Ressourcen und private Daten

Der Stilllegungshelfer verändert keine SSH-/Netzwerkkonfiguration, fremden
PostgreSQL-Cluster, generischen PostgreSQL-Verzeichnisse oder Linux-Pakete.
Der alte Node-Versionsordner bleibt stehen. `create_main_cluster=false` und
die Distributions-Timer bleiben erhalten; unbekannte EOS-Hostrichtlinien werden
nicht entfernt. Der nachfolgende R16-Installer führt seine dokumentierte
Paket- und Hostkonfiguration aus.

Die Rückfallablage enthält alte Datenbanken, Geräteschlüssel und Konfiguration.
**Diese Ablage nicht hochladen oder ins öffentliche Repository übernehmen.**
Das ist eine lokale Aufbewahrung der Originale, keine unabhängige oder bereits
auf dem Pi erprobte Datensicherung. R16 übernimmt diese alten Daten nicht
automatisch. Die neue Einrichtung folgt dem vorhandenen
[Managed16-Neuinstallationsweg](MANAGED_NEUINSTALLATION_DE.md).

## Abbruch und begrenzter Rückweg

Bei Abweichungen erscheinen feste Fehlercodes, keine Rohkonfiguration,
Kennwörter oder Prozessargumente. Ein Fehler vor der Stilllegung belässt R8;
nach gesetztem Startschutz können Dienste bereits gestoppt sein. Der Helfer
startet R8 dann nicht automatisch und löscht keine Rückfallablage.
Keine zweite Wartungs-/Installationssitzung parallel starten.

Vor `INSTALLING_MANAGED16` unterstützt derselbe geprüfte Helfer:

```text
sudo /usr/bin/python3 -I -B /root/eos-r8-entry-…/retire.py --restore-stopped /root/eos-r8-retired-…
```

Die Pfade müssen die tatsächlich ausgegebenen privaten Ablagen sein;
Auslassungszeichen sind kein ausführbarer Befehl. Der Rückweg prüft
Original-Inodes, Konten, Startschutz und gestoppte Dienste vor Änderungen.
Dateien und Kontennamen werden zurückgeführt, Autostartlinks bleiben in der
Quarantäne. Dienste werden nicht gestartet. Unterbrochene Umbenennungen sind
anhand der Dateien wiederaufnehmbar; unbekannte Zustände, ein Abbruch schon
beim Anlegen des Startschutzes oder laufende Dienste erfordern gesonderte
Prüfung. Ein Stromausfalltest am Pi steht aus.

Ab `INSTALLING_MANAGED16` ist dieser Rückweg gesperrt: Der neue Installer kann
bereits eigene Daten angelegt haben. Diese dürfen nicht durch einen pauschalen
R8-Restore überschrieben werden. Die ursprünglichen R8-Daten bleiben privat
erhalten. Installationsabbrüche anhand des konkreten Fehlercodes behandeln.

## Nachweis und verbleibende Abnahme

[Quell- und Fixtureprüfungen](../../reports/integration/r8-retirement-20261028/README_DE.md)
decken Pfadgrenzen, Kontenumbenennung, Abbrüche/Rückweg, Paketsperren, PID-Wechsel
und Installerbindung ab. Sie ersetzen keine reale systemd-/ARM64-/APT-/Pi-
Installation. Erststart, Browservertrauen, Lizenz, Neustart, Backup/Restore,
Folgeupdates und Hardwareabnahme bleiben am Test-Pi zu prüfen.

Die frühere [lesende Bestandsaufnahme](R8_INSPECTION_COMMAND.txt) und ihre
[Nachweise](../../reports/integration/r8-retirement-preparation-20261028/README_DE.md)
bleiben als Vorgeschichte erhalten.
