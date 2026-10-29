# R8-Testinstallation durch Managed16 ersetzen, Debian behalten

Stand: 29.10.2026. Der Nutzer hat die Ablösung des konkreten R8-Test-Pi
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

[Den vollständigen geprüften PuTTY-Aufruf ausführen](R8_RETIRE_INSTALL_COMMAND.txt).
Er lädt den Helfer von Commit `7309a3ff0d80fc0c2604798b8f487f78508737fd`,
prüft 54599 Bytes und SHA-256
`af366707ee0765cc4aad3b0ca9cdaf1e02f1f4ce4cd3333ff8a4e615a24db65c`.
Die veröffentlichte Datei wurde bytegleich zurückgelesen. Der Aufruf installiert
anschließend R16 automatisch; eine zweite manuelle Installationsrunde ist nicht
erforderlich. Nicht direkt eine veränderliche Datei von `main` als root ausführen.
[Veröffentlichungs- und Befehlsprüfung](../../reports/integration/r8-retirement-20261028/tailscale-publication.json).

Der Ablauf benötigt die offene PuTTY-Sitzung und den vorhandenen sudo-Zugang:

1. Den unveränderten Managed16-Einstieg vollständig laden und seinen festen
   SHA-256-Wert prüfen. Erst danach wird dessen eingebetteter Python-Preparer
   geladen. Die drei festen R16-Archive werden vollständig heruntergeladen
   und hashgeprüft, während R8 noch vorhanden ist.
2. Host, authentifizierten R8-Manifesthash, 14 Unitdateien, Konten, Symlinks,
   Mounts, Prozesse und Paketverwaltung erneut prüfen. Der Manifesthash bindet
   die Unit-Pins; kein installierter EOS-/Node-Code wird zur Prüfung gestartet.
   Distributionsquellen werden mit den ursprünglichen Managed16-Regeln geprüft.
   Zusätzlich wird ausschließlich die bytegenau bekannte öffentliche
   Tailscale-Trixie-Quelldatei erkannt und aus der getrennten EOS-Paketvorbereitung
   ausgelassen. Sie bleibt in der globalen APT-Konfiguration erhalten.
   Die benötigten Pakete werden vor der Stilllegung vollständig vorab geladen;
   der simulierte Paketplan darf keine vorhandenen Pakete ändern oder entfernen.
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
6. Die Fresh-Host-Prüfung des Managed16-Preparers mit dieser eng begrenzten
   APT-Quellentrennung
   ausführen. Paketsperren freigeben und dessen `install_downloaded()` mit den
   bereits geprüften Archiven aufrufen; diese Funktion prüft Host und Dateien
   erneut und startet den ursprünglichen Installer. Paketinstallation erfolgt
   aus dem vorbereiteten, getrennten Cache; ein zusätzlicher Prüfhook kontrolliert
   die tatsächlich an dpkg übergebenen Pakete. Signatur-, Lizenz-, Pfad- und
   Frischhostgrenzen bleiben erhalten.

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

### Gemeldeter Abbruch `BOOTSTRAP_APT_SOURCE`

Am 28.10.2026 meldete der konkrete Test-Pi diesen Code im ersten Host-Preflight.
Zu diesem Zeitpunkt hat der Helfer R8 noch nicht gestoppt, verschoben oder seine
Konten umbenannt. Der Download-Einstieg und die private Arbeitsablage können
bereits vorhanden sein. R16 wurde noch nicht installiert.

Der Code bezeichnet eine abgelehnte Repository-URL oder Distributionssuite.
Er belegt weder eine beschädigte Linux-Installation noch eine bestimmte Ursache.
Paketquellen nicht pauschal überschreiben oder entfernen; den Installer nicht
mit einer abgeschalteten Quellenprüfung erneut starten.

`tools/system/inspect-managed16-apt.py` erklärt diese Prüfung ausschließlich
lesend. Es findet den bereits heruntergeladenen, exakt gepinnten Managed16-
Einstieg, lädt dessen unveränderten Parser ohne Installerstart und lässt dessen
erste Ablehnung bestehen. Ausgegeben werden Quellenordinal, Dateihash,
Format, feste Prüfergebnisse und ausschließlich bekannte öffentliche
Host-/Pfad-/Suitebezeichnungen. Unbekannte Werte, Dateinamen, URLs,
Benutzerinformationen, Query-/Fragmentinhalte und Ausnahmedetails fehlen.
Es werden keine APT-Dateien verändert, Dienste gesteuert oder Pakete installiert.
[Den hashgebundenen Diagnoseaufruf in PuTTY ausführen](R8_APT_INSPECTION_COMMAND.txt).
Er ist an Commit `38c93eb35430be3a1364a09493703e82c1a3222c` und SHA-256
`4c016dcd4d97ad93140d9815db8ed66cf3155c7ec9e06279b8e99de86df2794e` gebunden;
die öffentliche Datei wurde bytegleich zurückgelesen. Der Download legt nur
den geprüften Helfer in einer neuen privaten Arbeitsablage ab.

Die anschließende Rückmeldung identifizierte `pkgs.tailscale.com`. Der gemeldete
Dateihash `5a1b21b30892bf22fb5d7c4f52fefe9b65efda2100e82abba2e0849da2a2264b`
stimmt exakt mit der [öffentlichen Tailscale-Trixie-Quelldatei](https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list)
überein. Die alte Quellenprüfung hatte diese Drittquelle nicht berücksichtigt.
Dies ist kein Nachweis eines Schadprogramms oder einer beschädigten Debian-Basis.
[Diagnose und Fortschritt](../../reports/integration/r8-retirement-20261028/apt-inspection.json).

### Installation über die bestehende VPN-Verbindung

Für diesen gemeldeten Zustand bleibt Tailscale aktiv. Der neue Helfer entfernt
weder Tailscale noch seine Paketquelle oder Schlüsseldatei und führt keinen
Netzwerk- oder Geräte-Neustart aus. Die EOS-Paketvorbereitung verwendet eigene
Quellkopien, Paketlisten und Archive; globale APT-Hooks werden nicht geladen.
Die Tailscale-Quelle beeinflusst dadurch keine EOS-Paketauswahl.

Vorhandene Pakete werden in dieser Ferninstallation nicht aktualisiert.
Benötigt eine neue Abhängigkeit eine solche Änderung, endet die Vorbereitung
vor dem EOS-Stop. Ein eigener Hook prüft diese Grenze unmittelbar vor dpkg
erneut. Das ist eine Grenze dieser einmaligen Installation; die spätere
Linux-Sicherheitswartung hat ihren eigenen dokumentierten Ablauf.

Vorher und nachher prüft der Helfer Tailscale-Paketversion, laufenden Dienst mit
PID/Startzeit sowie die lokale Adress- und Routenzuordnung der SSH-Sitzung.
Diese Werte bleiben ausschließlich im Arbeitsspeicher und werden nicht ausgegeben.
Die Prüfungen erkennen beobachtete Änderungen, garantieren aber keine
unterbrechungsfreie Netzverbindung. Keine zweite Paketwartung parallel starten.

Der signierte R16-Netzwerkzusatz startet ohne eingerichtetes Gerätenetz;
seine Installation ändert keine Schnittstellenadressen oder Routen. Die
Ersteinrichtung kann die lokale Tailscale-IPv4-Adresse aus `SSH_CONNECTION`
für ihre HTTPS-Adresse und Zertifikate verwenden. Der PuTTY-Aufruf muss diese
Variable wie vorgegeben an den Installer weiterreichen.

**Updateumfang:** Die EOS-Linux-Wartung nutzt ihrerseits isolierte Debian-/
Raspberry-Pi-Quellen. Sie aktualisiert Tailscale nicht. Der R16-Installer stellt
die globale periodische APT-Wartung auf den EOS-Ablauf um; eine zuvor darüber
laufende Tailscale-Automatik wäre damit nicht erhalten. Tailscales eigener
Updater bzw. eine gezielte Paketwartung bleiben möglich, ihre Aktivierung
wurde auf diesem Pi noch nicht festgestellt. Tailscale gehört deshalb nicht
zum nachgewiesenen automatischen Updateumfang von EOS.

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
