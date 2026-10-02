# Debian-13-Testhost: Befund und Installationssperre

Stand 01.10.2026 · Quellen `0.2.0-dev.4` · Basiscommit
`cbaac141d6b447c8ba26cb9548f2af40f858542a`.
Maschinenlesbare Quellen-, Artefakt- und Nachweisbindung:
`reports/integration/debian13/verification-summary.json`.

## Entscheidung

**Keine neue Hardwareinstallation freigegeben.** Das bisherige signierte
Testpaket `0.2.0-test.1` wird für Neuinstallationen zurückgezogen. Seine Bytes,
Signatur und historischen Testergebnisse bleiben erhalten. Die neue Lieferung
enthält das vollständige Repository und die korrigierte Vorprüfung, jedoch kein
neues signiertes Laufzeitpaket. Der Rückzug ist keine technische Fernsperre
bereits verteilter Offlinekopien.

Der Nutzer hat einen Pi 5 mit 8 GB, Debian 13.4 ARM64 und einer etwa 64-GB-SD-Karte
gemeldet. Eine SSD wurde nicht angezeigt. Das ist ein geeigneter Testhosttyp;
sein tatsächlicher Redis-Paketbestand ist noch unbekannt. **Aus dem OS-Namen
allein folgt keine nachgewiesene Verwundbarkeit dieses konkreten Geräts.**

## EOS-HOST-REDIS-20261001

Die bisherige Hostprüfung akzeptiert Redis anhand eines Versionsbanners. Sie
prüft weder die Distributionsrevision noch eine Freigabe des konkreten
Hostartefakts. Die signierte npm-SBOM erfasst diese separat installierte
Datenbank nicht. Deshalb konnte die bisherige technische Bereitschaft fälschlich
als hinreichende Installationsvoraussetzung erscheinen.

Die offizielle Debian-Paketübersicht nennt für Trixie
`redis 5:8.0.2-3+deb13u2`. Der Debian-Sicherheitstracker führt diesen Stand für
**CVE-2026-81934** als verwundbar. Betroffen ist ein Speicherfehler bei der
TLS-Verarbeitung vor der Authentifizierung, mit möglicher Codeausführung als
Redis-Dienstkonto. EOS benötigt diesen TLS-Pfad. Die Bindung an `127.0.0.1`
begrenzt die Erreichbarkeit auf lokale Prozesse, beseitigt den Fehler aber nicht.
Ein Exploit gegen EOS wurde nicht ausgeführt; hier liegt eine durch den
Hersteller-/Distributionshinweis begründete Freigabesperre vor.

Quellen, abgerufen am 01.10.2026:
[Debian-Paket](https://packages.debian.org/trixie/redis-server),
[Debian-CVE-Eintrag](https://security-tracker.debian.org/tracker/CVE-2026-81934),
[Redis-Sicherheitsübersicht](https://security-tracker.debian.org/tracker/source-package/redis).
Der abgerufene CVE-Eintrag ist gehasht im Rohbelegordner erhalten.

Für Bookworm nennt Debian `5:7.0.15-1~deb12u10` als Behebung dieses TLS-Befunds.
Daraus folgt keine pauschale Freigabe von Debian 12. Die zusätzlich gelisteten
CVE-2026-82631/82677 betreffen nach den untersuchten Beschreibungen Modulpfade;
EOS lädt keine Redis-Module und sperrt gefährliche Befehle. Ihre Ausnutzbarkeit
im EOS-Profil ist nicht nachgewiesen. Ein konkreter Hostartefakt- und
Konfigurationsnachweis bleibt notwendig. Weitere Trixie-Funde einschließlich
CVE-2026-23479 gehören in die erneute Redis-Auswahlprüfung.

## Änderung und Sicherheitswirkung

Die Vorprüfung erkennt die Diagnoseprofile Debian/Raspberry-Pi-OS 12 und 13.
Sie verlangt für 12 mindestens systemd 252/Redis-Hauptversion 7, für 13
mindestens systemd 257/Redis-Hauptversion 8. Unbekannte OS-Versionen,
unplausible Versionsbanner, ARM32, ungeschützte Werkzeuge, Privilegien,
vorhandene Installationen oder belegte Ports bleiben Ablehnungsgründe.

Zusätzlich hält `redis-security-admission` **alle neuen Installationen** an,
bis ein konkreter behobener Redis-Stand geprüft und aufgenommen wurde.
`prerequisitesReady` ist nur die Diagnose der sonstigen Vorbedingungen;
`ready` bleibt ausdrücklich falsch. Kein CLI-/Umgebungsschalter hebt die Sperre
auf. Der direkte Installer prüft dies vor Staging, Konten und Dienststarts,
auch mit `--start no`. Vorhandene Update-/Aktivierungswege sind nicht durch
diesen gezielten Neuinstallationsschutz geändert.

## Durchgeführte Prüfungen

- **64 Host-/Vorprüfungs-/Release-Vertragstests bestanden**, keine Fehler oder
  übersprungenen Fälle. Enthalten sind die tatsächliche Hostprüfungslogik und
  der direkte Installationsorchestrator mit simuliertem Zielhost sowie
  isolierten Schreibgrenzen. Das sind keine Systemd-/Pi-Installationstests.
- Aus den offiziellen Redis-8.0.2-Quellen mit allen Debian-Patches wurde ein
  TLS-Laborbinary gebaut. Archive stimmen mit SHA256/Größe der über HTTPS
  erhaltenen `.dsc` überein; deren OpenPGP-Signatur wurde nicht unabhängig geprüft.
- Reale Controller-/Redis-/Admin-/UI-/Browserprüfung: **16 TAP-Erfolge**,
  einschließlich eines Elternfalls, entsprechend 15 Stufen. Zertifikatsrotation
  mit AOF-Neustart: **1 Erfolg**. Keine übersprungenen Fälle. Rohprotokolle und
  genaue Befehle liegen im Unterordner `redis8-compatibility`.
- Grenzen: Ubuntu x64, Node 24.21.0, OpenSSL 3.0.13, selbst gebautes Redis mit
  libc-Allocator; keine Debian-Paketbinaries, kein ARM64, kein laufender
  Systemd-Manager. Prozesse liefen als Root mit expliziter Netzinterface-Fixture;
  Browserbedingungen entsprechen dem dokumentierten bisherigen Laborlauf.
- Ein Dateipfadfehler bei der anschließenden Berichtserzeugung ist dokumentiert.
  Die bereits erfolgreichen Tests wurden dafür nicht erneut ausgeführt.

**Funktionale Kompatibilität beseitigt keine bekannte Sicherheitslücke.** Der
Redis-8-Lauf dient ausschließlich der isolierten Analyse; das Binary wird
nicht als EOS-Produktbestand ausgeliefert. Systemd- und OpenSSL-Dokumentprüfung
lieferten keinen konkreten Konfigurationskonflikt, ersetzen aber keine Prüfung
der tatsächlich wirksamen ARM64-Sandbox.

## SBOM, Lizenzen und weitere Abnahme

Controller, Admin, UI und deren installierter npm-Baum bleiben bytegleich zum
bisherigen App-Build `0.2.0-dev.3`. Die vorhandene CycloneDX-SBOM beschreibt
genau diesen unveränderten Baum, kein neues oder bereits installiertes
Gesamtsystem. Die geänderten Hostwerkzeuge sind im Repository-Dateimanifest
gebunden. `redis8-compatibility/test-tool.cdx.json` erfasst zusätzlich das
tatsächlich verwendete Redis-Laborbinary samt Hash und Herkunft; diese
schemageprüfte CycloneDX-Datei ist ausdrücklich kein Zielhostinventar. OS, Redis, Kernel und Firmware werden erst anhand tatsächlicher
Zielpakete inventarisiert. Keine fehlenden Zielversionen werden erfunden.
Redis 8 hat eine andere Lizenzwahl als frühere Redis-Stände; vor einer
Produktaufnahme ist diese gesondert zu bewerten und zu dokumentieren.

Das nächste Arbeitspaket ist die Auswahl eines behobenen Redis-Artefakts mit
Herkunfts-, Advisory-, Lizenz- und ARM64-Nachweis. Danach neues signiertes
Paket und tatsächliche Pi-Installation. Verantwortlich für die spätere
Produktfreigabe ist NexoWatt; eine Risikoakzeptanz wurde nicht erteilt.
Mesh-Timing, weitere Geräteadapter, Wiederherstellung, Fernwartung und die
unabhängige Sicherheitsprüfung bleiben wie zuvor offen. Keine CRA-/IEC-
Konformität oder Produktionsstabilität wird aus diesem Nachtest abgeleitet.
