# EOS-Testgrundsystem: Host, Dienste und zuverlässiger Start

Stand: 1. Oktober 2026. Geltungsbereich: neue, getrennte Testinstallation;
keine Migration einer bestehenden Anlage, keine Serienfreigabe und keine
CRA-/IEC-Konformitätserklärung.

## Lieferumfang und Grenze

Diese Änderung implementiert einen rootseitigen Installationsbaustein,
eine lesende Vorprüfung und systemd-Dienste. Der vorgeschaltete
Release-Orchestrator muss Signatur, Dateihashes und Adapterrichtlinie prüfen.
`tools/system/install-host.cjs` ist ausschließlich dessen importierter Baustein;
sein direkter CLI-Aufruf verweigert die Installation. Er lädt keine Pakete nach
und führt weder `npm install` noch Paket-Lifecycle-Skripte aus.

Das Profil unterstützt als Prüfziel Debian 12 / Raspberry Pi OS Bookworm mit
64-Bit-ARM oder x86-64, systemd mindestens 252 und der **exakten** Node-Version des
signierten Testartefakts. Node, Redis mit TLS-Unterstützung, OpenSSL und
Systemwerkzeuge müssen zuvor in einer nachvollziehbar gepflegten Testbasis
installiert sein. Die beobachteten Vorprüfwerte werden lokal in
`/etc/nexowatt-eos/host-inventory.json` gespeichert. Ein passender Redis-Versionsstring allein bestätigt weder
TLS-Funktion noch Schwachstellenfreiheit; der anschließende echte TLS-Probe ist
zusätzlich erforderlich. Die OS-Pakete müssen separat inventarisiert, bewertet
und aktualisiert werden. Ein fertiges Betriebssystem-Image ist hiermit nicht
entstanden.

| Bereich | Pfad / Identität | Berechtigung |
|---|---|---|
| Geprüfter Programmstand | `/opt/nexowatt/eos/releases/<sha256>/app` | Root verwaltet, im Dienst schreibgeschützt |
| EOS-Werkzeuge | gleiches Release unter `runtime/` | Root verwaltet, im Dienst schreibgeschützt |
| Aktive Auswahl | `/opt/nexowatt/eos/current` | Root verwaltet |
| Basiskonfiguration | `/etc/nexowatt-eos/iobroker.json` | Root schreibt; Gruppe `eos-runtime` liest |
| Controllerdaten | `/var/lib/nexowatt-eos/iobroker-data` | `eos-runtime` schreibt |
| Protokolle | `/var/log/nexowatt-eos` | `eos-runtime` schreibt; keine manipulationssichere Auditablage |
| Objects-Datenbank | `/var/lib/nexowatt-eos/redis/objects` | Nur `eos-redis-objects` |
| States-Datenbank | `/var/lib/nexowatt-eos/redis/states` | Nur `eos-redis-states` |

Die Konten sind getrennte Systemkonten mit `nologin`, ohne zusätzliche Gruppen,
ohne sudo-Rechte und ohne Docker-Gruppe. Bereits vorhandene gleichnamige Konten,
Gruppen oder Installationspfade werden abgewiesen. Globale sudo-Freigaben für die
neuen Konten werden nach der Kontoanlage geprüft, soweit sudo installiert ist.
`NoNewPrivileges` und eine leere Capability-Menge gelten zusätzlich im Dienst.

## Ablauf

1. Signierten Release prüfen und in das festgelegte Releaseverzeichnis schreiben.
2. Vorprüfung: frische Verzeichnisse/Konten, Bookworm, Architektur, exakte
   Node-Version, systemd, Werkzeuge, Node ohne Datei-Capabilities und freie
   Datenbankports prüfen. Bei Fehler erfolgt keine Dienstinstallation.
3. Konten und getrennte Datenverzeichnisse erzeugen. Individuelle Transportdaten
   mit dem signierten Werkzeug `runtime/transport/redis-tls.cjs` generieren.
4. Geschützte Konfiguration aus dem tatsächlichen Controller-Distributionsprofil
   und dem TLS-Fragment erstellen. Shell-Kommandos, Compact-Modus, Multihost und
   Sentry sind deaktiviert. Daten und Logs werden aus dem Programmverzeichnis
   ausgelagert. systemd bindet die rootverwaltete Konfiguration schreibgeschützt
   auf die erwartete `iobroker-data/iobroker.json`; der Zielpfad wird als reguläre
   neue Datei angelegt, niemals als Konfigurationssymlink.
5. Die geprüfte Release-Sequenz, exakte Node-Version und den externen
   Signierschlüssel-Fingerabdruck in `release-state.json` mit Datei- und
   Verzeichnis-fsync speichern. Bei Schreibfehler startet kein Dienst. Erst
   anschließend Dienste installieren. **Voreinstellung: installiert, deaktiviert und
   ungestartet.** `start` muss vom Orchestrator ausdrücklich gesetzt werden.
6. Bei freigegebenem Teststart beide Datenbanken starten; die Initialisierung
   prüft authentifiziertes TLS und führt gewöhnliches `iobroker setup` aus.
   `setup first` wird nicht verwendet, weil der geprüfte Controller dabei
   vorhandene Admin-/Discovery-/Backitup-Adapter automatisch aktivieren würde.
7. Der separate Bootstrap sperrt Konten/Adapter und setzt das lokale Testprofil.
   Erst nach erfolgreicher Initialisierung erzeugt Root die Startmarke
   `/var/lib/nexowatt-eos/.initialized`. Danach darf der Controller starten.
8. Initialisierung und Controller prüfen vor jedem Start das installierte
   signierte Release gegen rootverwaltete Freigabedaten. Geerbte Node-/TLS-
   und Ladepfad-Overrides werden entfernt. Der Controller prüft anschließend
   beide Datenbanken durch TLS 1.3,
   Gegenstellenprüfung, Authentifizierung und PING. Ein fehlgeschlagener Start
   wird begrenzt wiederholt: höchstens drei Versuche in fünf Minuten, mindestens
   15 Sekunden Abstand beim Controller. Nach dem Prozessstart prüft ein
   begrenzter Readiness-Aufruf den aktuellen Controller-PID, einen frischen
   Alive-State und die erwartete Controller-Version. Erst nach diesem
   `ExecStartPost` ist der Dienststart erfolgreich. Fehler bei der Installationssequenz
   lösen Stoppen und Deaktivieren der EOS-Dienste aus. Schlägt auch dies fehl,
   wird ausdrücklich `HOST_CLEANUP_INCOMPLETE` gemeldet; dann ist die
   Abschaltung nicht nachgewiesen und der Testhost muss kontrolliert werden.

Die Readiness-Prüfung des Grundsystems ist noch kein Nachweis korrekter
Geräteregelung oder vollständiger Anlagenbetriebsbereitschaft. Die Geräteabnahme
bleibt erforderlich.
Fehlerzustände werden nicht durch Löschen von Daten, Umstellen auf Klartext oder
Starten mit einer Ersatzkonfiguration kaschiert. Angelegte Konten, Daten und
Schlüssel bleiben bei Fehlern zur Untersuchung erhalten. Eine Wiederholung ist
wegen des Frischinstallationsschutzes bewusst gesperrt; auf der wegwerfbaren
Test-VM zunächst Snapshot zurückspielen und den dokumentierten Fehler beheben.

Lesende Vorprüfung auf dem späteren Testhost:

```bash
node tools/system/host-preflight.cjs --node-version <Version-aus-signiertem-Release>
```

Dieser Befehl installiert nichts. Den konkreten Root-Installationsaufruf stellt
der signaturprüfende Release-Orchestrator bereit.

## Netzwerke und spätere Adapter

Es gibt keine LAN/IP-Einschränkung für das Controller-Netzwerk. IPv4, IPv6 und
Tailscale-kompatible Netzkommunikation bleiben möglich. Es werden keine
Firewall-, Routing-, SSH- oder Tailscale-Einstellungen verändert. Dies schaltet
auch keine ungeschützte UI frei: Das Grundprofil startet ohne aktive Adapter.
UI-/Admin-Zugang benötigt später dessen geprüfte TLS-, Anmelde- und Rollenregeln.

Nur die beiden Datenbanken lauschen fest auf Loopback, Ports 16379 und 16380,
mit abgeschaltetem Klartextport. Das aktuelle Transportprofil verwendet TLS 1.3
mit geprüfter Serveridentität und je Datenbank einem individuellen Passwort.
Es ist **kein mTLS-Profil** und keine getrennte Identität pro Adapter. Controller
und seine Adapter teilen vorerst das Konto `eos-runtime` und damit eine
Vertrauenszone. Verschlüsselung dieser Datenbankwege ersetzt keine
Autorisierungs- oder Prozessgrenze zwischen bösartigen Adaptern.

Zusätzliche Adapter werden in einem neuen signierten, richtliniengeprüften
Release vorbereitet. Das laufende Dienstkonto kann den schreibgeschützten
Releasebaum nicht durch eine Admin-/CLI-Installation verändern. Beliebiger
JavaScript-Code bleibt jedoch grundsätzlich ausführbar, wenn ein entsprechend
mächtiger Adapter zugelassen wird; er ist im leeren Grundprofil nicht enthalten.

`PrivateDevices=yes` sperrt Gerätezugriffe des Grundprofils. Für RS485/USB,
Bluetooth oder vergleichbare Adapter sind konkrete, getrennt geprüfte
Gerätefreigaben nötig. Keine pauschale Mitgliedschaft in privilegierten Gruppen.
Die Speicher-/Prozessgrenzen sind Testvorgaben, keine Leistungsgarantie. Last,
Redis-Speicherfüllung, SSD, Versorgung, Reboots und physische Failsafes müssen auf
den Zielgeräten mit den tatsächlich zugelassenen Adaptern gemessen werden.

## Bedrohungen und Prüfbezug

| STRIDE | Maßnahme | Restpunkt / Nachweis |
|---|---|---|
| Spoofing | Eigene Dienstkonten; individueller Datenbankzugang und geprüfter TLS-Server | Gemeinsame Controller-/Adapteridentität bleibt |
| Tampering | Root-Release, striktes Dateisystem, geschützte Konfigurationsbindung | Signaturprüfung vorgeschaltet; Datenbankinhalt bleibt innerhalb der Vertrauenszone veränderbar |
| Repudiation | Journald und begrenzte Dateiprotokolle | Noch keine unabhängige, manipulationssichere Auditkette |
| Information Disclosure | Getrennte Redis-Schlüssel und beschränkte Konfigurationsrechte | Runtime kann eigene DB-Zugänge lesen; kein Schutz vor Root/Kernkompromittierung |
| Denial of Service | Startlimit, PING-Deadline, Memory-/Task-Grenzen | Zielhardware, Last und Wiederanlauf nach DB-Ausfall noch zu prüfen |
| Elevation of Privilege | NoNewPrivileges, keine Capabilities, keine sudo-/Docker-Rechte, geschützter Programmbaum | Zulassungsprozess und kontrollierte Geräteausnahmen gesondert prüfen |

Anforderungsbezug: bestehende `system/security/requirements.json`,
`system/security/threat-model.json`, CRA-Nachweisstruktur und
IEC-62443-orientierter Entwicklungsprozess; keine zusätzliche Normerfüllung aus
Unit-Dateien oder erfolgreicher Syntaxprüfung ableiten.

## Tatsächlich geprüfter Umfang

`tests/system/host.test.cjs` prüft positive und negative Vorprüfungen,
Versionsabweichung, bestehende Konten, besetzte Ports, Node-Capabilities,
Symlink-/Überschreibschutz, deaktivierte Installation, privilegierte Gruppen,
Startreihenfolge und Abbruchverhalten. Systemkommandos werden in diesen Tests
aufgezeichnet/simuliert; es wurden keine Hostkonten, systemd-Dienste oder
Firewallregeln dieser Entwicklungsmaschine verändert.

Zusätzlich wurde `systemd-analyze verify` tatsächlich in einem isolierten
Dateisystem-Fixture mit allen vier Unit-Dateien ausgeführt. Das prüft die Syntax
und Abhängigkeiten mit systemd 255 der Entwicklungsumgebung. Es startet keine
Dienste und ersetzt keine systemd-252-/Bookworm-/RPi-5-Prüfung.
Rohbeleg: `reports/test-base/host-tests.tap`.

Primärquellen / überprüfter Quellstand:

- systemd-Projekt, Ausführungs-/Sandboxoptionen:
  https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml
- Redis, TLS-Port und Authentifizierung:
  https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- ioBroker js-controller 7.2.2, Commit
  `88516d65367580088327214bd9decedca77beea7`:
  `packages/common-db/src/lib/common/tools.ts` (`IOBROKER_DATA_DIR`) und
  `packages/cli/src/lib/setup.ts` (Unterscheidung `setup` / `setup first`).
