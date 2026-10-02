# EOS Betriebssystemwartung – Implementierungsstand 2026-10-01

Diese Komponente ist Quellcode für das gesperrte EOS-Testprofil, kein Nachweis
bereits installierter Updates auf dem Raspberry Pi. Die Redis-Neuinstallations-
sperre bleibt unverändert. Kein APT-Update und keine Paketinstallation wurden bei
der Entwicklung auf dem Workspace oder dem Nutzergerät ausgeführt.

## Ablauf und Vertrauensgrenzen

Der feste root-Dienst startet täglich zwischen 02:00 und etwa 02:16 Uhr
Europe/Berlin über systemd. `Persistent=false` verhindert eine überraschende
Nachholinstallation tagsüber. Ein ausgeschaltetes Gerät verpasst das Fenster;
veralteter Status muss deshalb sichtbar bleiben. Es gibt keine automatische
Neustartfreigabe. Paket-Maintainerskripte dürfen Dienste neu starten; weder
unterbrechungsfreier Betrieb noch automatische Aktivierung sämtlicher Fixes
werden zugesagt. Der Dienst besitzt die für APT/dpkg erforderlichen Hostrechte.
Adapter erhalten weder sudo noch einen mutierenden Wartungsendpunkt.

`runner.py` akzeptiert keine Argumente und läuft mit `/usr/bin/python3 -I`.
Unterprozesse erhalten ausschließlich feste Programme/Argumente und eine
bereinigte Umgebung. Die Root-Dateien und Elternverzeichnisse werden auf
Eigentümer, Schreibrechte und Symlinks geprüft. Das Statusverzeichnis ist
root:root 0755, `private` ist root:root 0711: `_apt` kann zu seinem Downloadcache
traversieren, andere Benutzer können das Verzeichnis nicht auflisten oder
schreiben. Temporäre Befehlsausgaben werden mit 0600 angelegt.

APT verwendet eigene Paketlisten, feste öffentliche HTTPS-Quellen und
`Signed-By` mit dem jeweiligen Debian-/Raspberry-Pi-Archivschlüsselbund.
Authentifizierung, TLS-Zertifikatsprüfung und Release-Ablaufprüfung bleiben
aktiv. Host-APT-Quellen, Anmeldedaten und APT-Hooks werden nicht importiert.
Root-eigene APT-Präferenzen sowie dpkg-Holds werden berücksichtigt. Ein Fehler
auch nur einer Quelle macht die Aktualisierung erfolglos; veraltete Teilindizes
werden nicht als erfolgreicher Prüflauf gemeldet. Signatur- und Metadatenprüfung
führt die Distributionssoftware aus, keine selbst entwickelte Kryptografie.

Freigegebene Origins sind exakt Debian mit dem lokalen Codename
`bookworm`/`trixie`, dem entsprechenden `-updates`- und `-security`-Archiv.
Das stabile Basisarchiv ist enthalten, weil Sicherheitskorrekturen dort in
Punktveröffentlichungen zusammengeführt werden können; es enthält auch normale
Fehlerkorrekturen. Beim Raspberry Pi kommt ausschließlich
`origin=Raspberry Pi Foundation,label=Raspberry Pi Foundation,component=main`
mit demselben Codename hinzu. `beta`, `untested`, Backports, fremde Releases und
Drittanbieter sind nicht freigegeben. Ein erkannter Raspberry Pi ohne gültigen
lokalen Hersteller-Schlüsselbund führt zum Fehler, nicht zum stillen Weglassen
der Herstellerpakete. Betriebssystem-Hauptversionswechsel erfolgen nicht.

Die Root-Policy `/etc/nexowatt-eos-os-updates/policy.json` hat ausschließlich
`{"schemaVersion":1,"enabled":true}`. Der zuständige Service darf `enabled`
auf `false` setzen, um automatische Installation abzuwählen. Eigentümer/Rechte
bleiben root:root 0644. Der Timer darf dabei für die Veröffentlichung des
Zustands `disabled` aktiv bleiben. EOS-Benutzer/Adapter dürfen diese Policy
nicht ändern. Bereits laufende Pakettransaktionen werden durch eine nachträglich
geänderte Datei nicht abgebrochen.

## Sichtbarer Status und echte SBOM

`status.schema.json` definiert den begrenzten Status (maximal 64 KiB). Fehlende
oder unbekannte Zeitpunkte/Zähler sind `null`, nicht erfundene Nullwerte.
`lastSuccessAt` bedeutet erfolgreicher Ablauf von Aktualisierung, Nachprüfung
und Inventarerzeugung; offene Updates, Coverage-Lücken und notwendige
Aktivierungen werden zusätzlich ausgewiesen. Sicherheitsupdates werden anhand
signierter Debian-Security-Origins erkannt. Holds und gepinnte Kandidaten werden
auch dann gezählt, wenn APT sie nicht auswählt. Paketdetails sind auf 50 Zeilen
begrenzt, Gesamtzähler bleiben vollständig. Der API-Leser muss Rohpaketdetails,
Meldungen und Pfade nicht veröffentlichen.

`needrestart -b -r l` prüft ausschließlich, ohne selbst Dienste neu zu starten.
Ein fehlender `/run/reboot-required`-Marker allein ergibt **unknown**. Kernel-
oder Microcode-Status und laufende alte Dienste/Sitzungen werden getrennt
berichtet. Auch needrestart kann Firmware/EEPROM, Container oder alle speziellen
Laufzeiten nicht vollständig bewerten. Die EOS-Timer-Aktivität wird als Snapshot
geprüft. Eine spätere Timer-Deaktivierung ist spätestens durch veraltete Daten
(maximal 36 Stunden) erkennbar, nicht sofort über dieses Statusfile.

Ein aktiver oder nicht eindeutig prüfbarer `apt-daily-upgrade.timer` erzeugt eine
Coverage-Lücke. EOS ändert diesen fremden Zeitplan nicht. Manuelle APT-Aufrufe,
Cronjobs und andere Verwaltungswerkzeuge sind weiterhin außerhalb dieses
Automaten. Das EOS-Zeitfenster schützt daher nicht gegen parallele,
andernorts konfigurierte Wartung. Zielabnahme muss genau einen abgestimmten
Automatisierungsweg nachweisen.

Nach erfolgreichem Paketlauf wird der tatsächliche installierte dpkg-Bestand
als CycloneDX 1.5 JSON nach `installed-packages.cdx.json` geschrieben und über
SHA-256/Erstellungszeit/Komponentenzahl an den Status gebunden. Name, Version und
Architektur stammen aus `dpkg-query`; nicht installierte Pakete werden entfernt.
Lizenzen, Paketdatei-Hashes oder CVE-Freiheit werden nicht erfunden. Diese SBOM
ersetzt die separate npm-/Firmware-/Container-/Produkt-SBOM nicht.

## Offene Grenzen und Freigabekriterien

- **EOS-OS-UPDATES-RUNTIME-PIN-20261001 (hoch, offen):** `nodejs` und `npm` sind
  ausdrücklich von diesem Updater ausgeschlossen, um die exakte signierte
  EOS-Laufzeit nicht unbemerkt zu ersetzen. Verfügbare Debian-Security-Updates
  bleiben als blockiert sichtbar. Eine sichere neue EOS-Laufzeit benötigt den
  regulären geprüften Releaseprozess. Das ist keine vollständige automatische
  Abdeckung aller Software. Der Ausschluss gilt nur für diesen Updater, nicht
  für fremde APT-Automation oder manuelle root-Befehle.
- Raspberry-Pi-main mischt Sicherheits- und Funktionsupdates. Der Automat
  installiert diesen signierten stabilen Herstellerstrom, kann daraus jedoch
  keine vollständige CVE-Abdeckung ableiten und zeigt die Klassifikationslücke.
  Neue Herstellerpakete können Energie-/Netzwerkfunktionen beeinflussen.
- Fremdpakete, manuelle Software, Fremdarchitekturen und Pakete oberhalb aller
  erlaubten Versionsstände bleiben Coverage-Lücken. Die Erfassung beweist
  keine bekannte-Schwachstellen-Freiheit.
- Updatebudget: APT-Refresh 600 s, unattended-upgrade 5.400 s. Nach Timeout
  erhält der Upgrader SIGINT und 300 s zur kontrollierten Beendigung seiner
  MinimalSteps-Transaktion. Danach wird ein Fehler veröffentlicht; ein noch
  laufender Prozess darf mit geerbtem Wartungslock weiter abschließen. Es gibt
  keinen SIGKILL von dpkg durch diesen Runner. Tatsächliche Lockvererbung,
  Abbruchverhalten, Systemabschaltung und Ressourcenmangel sind am Ziel offen.
- Die Wartung hat MemoryHigh=768 MiB und MemoryMax=1,5 GiB. Zusammen mit dem
  Controllerlimit von 6 GiB und Redis können auf dem 8-GB-Pi unter Last
  Speicherengpässe/OOM auch während einer Pakettransaktion entstehen. Ein
  getöteter Lauf kann nur als Fehler oder später veralteter Status erscheinen;
  reale ARM64-Lastabnahme und Recovery sind vor Freigabe erforderlich.
- APT ist kein atomarer A/B-Updateprozess. Stromausfall, Speichermangel,
  Konfigurationskonflikte, unterbrochene dpkg-Zustände, Rückfall und
  Wiederherstellung benötigen reale Tests. Automatische dpkg-Reparatur ist
  ausgeschaltet. Keine Produktions-/CRA-/IEC-Freigabe durch diese Implementierung.
- Echte Debian-12/13-/ARM64-APT-Transaktionen, Kernel/Boot-Firmware, systemd-
  Sandbox, Reboots, Paket-Service-Restarts, Internet-/DNS-/Uhrfehler und
  Gerätesicherheit unter Wartungsunterbrechungen wurden hier nicht ausgeführt.

## STRIDE und Prüfbezug

| Risiko | Maßnahme / verbleibende Grenze |
|---|---|
| Spoofing | HTTPS-Gegenstellenprüfung plus distributionsspezifische Signed-By-Schlüssel; keine globalen Trust-Ausnahmen. |
| Tampering | Feste Origins, isolierter APT-Konfigurationspfad, Root-Dateigrenzen, O_NOFOLLOW, atomare Status-/SBOM-Dateien. Root-Kompromittierung bleibt außerhalb dieser Grenze. |
| Repudiation | Echte Versuch-/Erfolg-Zeitpunkte, feste Fehlercodes, Status-SBOM-SHA-256; keine behaupteten Hardwareerfolge. |
| Information Disclosure | Keine Host-APT-Zugangsdaten im Automaten, Status ohne Befehlsstderr; UI projiziert nur freigegebene Zähler/Felder. |
| Denial of Service | Ein Lauf pro Lock, Zeitbudgets, keine automatische Neustartschleife; Maintainer-Neustarts, OOM und dpkg-Ausfälle brauchen Zieltests. |
| Elevation of Privilege | Keine Adapter-Sudo/API-Mutation, feste root-Aufgabe mit geprüftem Code/Config; signierte Paket-Maintainerskripte sind selbst privilegierte Lieferkettenkomponenten. |

`tests/system/os-updates.test.py` führt Offline-Negativ-/Positivtests aus:
Origins/Signaturen, Holds/Pins, unbekannte Profile, Policy, Timer-Lücken,
Status-/SBOM-Schemas, Dateigrenzen, Fehlerhistorie, Abbruch und unterlassene
Folgebefehle. Die Orchestrierung wird mit kontrolliert injizierten Befehlen und
Paketcache geprüft. Ein echter `apt-config dump` prüft ausschließlich das
Einlesen der festen Konfiguration auf Workspace-APT 2.8.3 (Ubuntu x64).
`python3-apt` ist dort nicht vorhanden; Ziel-Cacheintegration bleibt offen.
Tests benötigen die vorhandene Offline-Testabhängigkeit jsonschema 4.26.0,
nicht auf dem Produkt selbst.

## Primärquellen, geprüft am 2026-10-01

- Debian unattended-upgrades: https://sources.debian.org/src/unattended-upgrades/2.12/README.md
- Debian APT-Konfiguration: https://manpages.debian.org/trixie/apt/apt.conf.5.en.html
- Debian APT-Verifikation: https://manpages.debian.org/trixie/apt/apt-secure.8.en.html
- Debian Release-Metadaten: https://deb.debian.org/debian/dists/trixie/Release
- Debian Security-Metadaten: https://security.debian.org/debian-security/dists/trixie-security/Release
- Raspberry Pi InRelease: https://archive.raspberrypi.com/debian/dists/trixie/InRelease
- Raspberry Pi Bookworm InRelease: https://archive.raspberrypi.com/debian/dists/bookworm/InRelease
- needrestart Batch-Vertrag: https://github.com/liske/needrestart/blob/master/README.batch.md
- needrestart Debian 13: https://manpages.debian.org/trixie/needrestart/needrestart.1.en.html
- systemd Sandbox: https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html

Die Raspberry-Pi-Metadaten wurden per HTTPS gelesen, nicht hier selbst mit
OpenPGP verifiziert. Die tatsächliche Signaturverifikation ist zwingender
Bestandteil des späteren APT-Laufs mit dem installierten Archivschlüsselbund.
