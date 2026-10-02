# Verschlüsselte Controller-Kommunikation im EOS-Testgrundsystem

Stand: 01.10.2026. Änderung: `EOS-BASE-TRANSPORT-01`.
Implementierung: `runtime/transport/redis-tls.cjs`. Entwicklungs-/Testprofil,
keine Serienfreigabe, keine CRA- oder IEC-Konformitätserklärung.

## Umgesetzte Grenze

Die über die Controller-Datenbanken transportierten Objekte, Zustände und
Nachrichten verwenden zwei getrennte Redis-Instanzen für `objects` und `states`.
Beide lauschen ausschließlich auf `127.0.0.1`, standardmäßig Port 16379 und 16380.
Der Klartext-Port ist mit `port 0` deaktiviert; Server und Clients akzeptieren nur
TLS 1.3. Die Clients prüfen Installations-CA, Gültigkeit und den jeweils passenden
DNS-SAN `eos-objects.internal` beziehungsweise `eos-states.internal`.
Der DNS-Name ist die geprüfte Zertifikatsidentität, keine externe DNS-Abhängigkeit.

Die Bindung betrifft interne Datenbanken. Die bestehenden UI-/Admin-/VPN-Netze
werden dadurch nicht auf LAN-Adressen beschränkt. Tailscale ist nicht Voraussetzung
für lokale Regelung und ersetzt nicht diese Transportauthentifizierung.

Jede frische Installation erhält eine eigene EC-P-256/SHA-256-CA, getrennte
Serverschlüssel und je Datenbank ein zufällig erzeugtes 256-Bit-Passwort. Es gibt
kein Standardpasswort und keinen ausgelieferten privaten Schlüssel. Redis enthält
nur den SHA-256-Passworthash; die geschützte Controllerkonfiguration enthält das
für die Verbindung erforderliche Passwort. Der Default-Redis-Benutzer ist aus.

**Das ist Server-TLS mit Passwortauthentifizierung, kein mTLS pro Adapter.**
Controller und Adapter mit derselben Betriebssystemidentität beziehungsweise
lesbarer Konfiguration teilen weiterhin eine Vertrauenszone. Diese Änderung
verhindert weder bösartigen Code innerhalb eines zugelassenen Adapters noch dessen
Zugriff auf die gemeinsam erreichbaren Daten. Direkte HTTP-, MQTT-, Modbus-, EEBUS-,
OCPP- oder sonstige Adapterverbindungen laufen nicht automatisch durch Redis;
deren konkrete Protokoll-/Geräteprofile müssen gesondert geprüft werden.

## API und Bereitstellung

```sh
node runtime/transport/redis-tls.cjs provision \
  --directory /etc/nexowatt-eos/transport \
  --data-directory /var/lib/nexowatt-eos/redis \
  --objects-port 16379 --states-port 16380

node runtime/transport/redis-tls.cjs probe \
  --config /etc/nexowatt-eos/iobroker.json
```

Die Bereitstellung akzeptiert nur ein **neues** Zielverzeichnis. Vorhandene
Konfiguration, JSONL-Daten oder Redis-Bestände werden niemals überschrieben oder
automatisch migriert. Der Aufrufer erstellt bei externem Datenpfad die Unterordner
`objects`/`states` und deren Besitzrechte. Ohne `--data-directory` entstehen private
Datenordner innerhalb des neuen Bundles für isolierte Tests.

| Ausgabe unter dem Zielverzeichnis | Inhalt / Schutzbedarf |
| --- | --- |
| `redis/objects.conf`, `redis/states.conf` | TLS-only-Serverprofil, ACL-Hash, absolute Zertifikats-/Datenpfade |
| `certs/ca.crt` | Öffentliche Installations-CA |
| `certs/objects.crt`, `certs/states.crt` | Öffentliche Serverzertifikate |
| `certs/objects.key`, `certs/states.key` | Private Schlüssel; nur jeweiliger Redis-Dienst und root |
| `credentials/iobroker-databases.json` | Nur `{objects, states}`-Fragment mit CA und DB-Passwörtern; nur Controller-Dienst und root |
| `manifest.json` | Geheimnisfreie Metadaten, Ports, Fingerprints, Laufzeitgrenzen |

Initial entstehen Verzeichnisse mit 0700 und Dateien mit 0600 für den aufrufenden
Benutzer. Der Host-Installer muss anschließend ausschließlich erforderliche
Traversal-/Leserechte vergeben: private Redis-Dateien `root:eos-redis-objects` bzw.
`root:eos-redis-states` 0640; Controllerfragment `root:eos-runtime` 0640;
öffentliche Zertifikate dürfen 0644 sein. Das Fragment wird kontrolliert in die
vollständige Controllerkonfiguration übernommen; es ist kein Ersatz für übrige
Controllerfelder. Der Transportcode startet keine Dienste und ändert keine
Benutzer, Gruppen, sudoers, Firewall oder Hostinstallation.

Die Probe verwendet zuerst die bestehende strikte Konfigurationsprüfung und
verbindet sich dann tatsächlich per TLS, AUTH und PING. Sie endet nach höchstens
fünf Sekunden je parallel geprüfter Verbindung und zerstört die Sockets bei Fehlern
oder Zeitüberschreitung. Antwortdaten sind auf 32 KiB begrenzt. stdout enthält nur
Statuscodes, keine Zugangsdaten, Antworten oder privaten Schlüssel.
Ein erfolgreicher PING prüft nicht die gesamte Serverkonfiguration oder sämtliche
Adapter. Die bereitgestellten Serverregeln werden separat getestet.

## Rechte, Verfügbarkeit und Grenzen

- Das Runtime-Konto kann `CONFIG`, `MODULE`, `ACL`, `FLUSHALL`, `SHUTDOWN` und andere
  gefährliche Redis-Befehle nicht verwenden. Die Controller benötigen unter anderem
  `INFO`, `KEYS`, `CLIENT SETNAME`, `SCRIPT LOAD` und `SCRIPT EXISTS`; diese Ausnahmen
  sind explizit erlaubt. Lua-Scripting und allgemeine Datenrechte bleiben für die
  bestehende Controller-API erforderlich; dies ist keine Adapterisolation.
- js-controller 7.2.2 versucht beim Verbindungsaufbau einzelne `CONFIG SET`-Befehle.
  Sie werden absichtlich abgewiesen. Die benötigten Werte für Keyspace-Ereignisse
  und Lua-Laufzeit sind schon in den Serverdateien gesetzt. Die dabei protokollierten
  NOPERM-Warnungen wurden im Integrationstest beobachtet und verhindern die
  geprüften Daten-/PubSub-Funktionen nicht.
- AOF mit `appendfsync everysec` ermöglicht Wiederanlauf, ersetzt aber kein Backup.
  Bei hartem Stromausfall können zuletzt nicht synchronisierte Schreibvorgänge
  verloren gehen; Crash-/Stromausfalltests stehen noch aus.
- `maxmemory 256mb` je Instanz, `noeviction` und begrenzte Clientzahl verhindern
  unbegrenztes Wachstum einzelner Datenbanken. Überlast führt zu abgewiesenen
  Schreibvorgängen und muss betrieblich überwacht werden. Die Größen sind eine
  Testvorgabe, keine vermessene Kapazitätsfreigabe für Kundenanlagen.
- Clients haben 3 s Verbindungs- und 5 s Befehlsdeadline; Offline-Warteschlangen sind
  deaktiviert. Neue Befehle während eines Ausfalls schlagen fehl, statt später als
  möglicherweise veraltete Stellbefehle abgearbeitet zu werden. Bereits gesendete
  Befehle können bei Transportverlust einen unklaren Ergebnisstatus haben; für
  gefährliche Aktionen bleiben anwendungsseitige Idempotenz und Datenalter nötig.
- **PubSub liefert keine Ereignishistorie nach.** Im wiederholten echten Test war
  ein Client bereits `ready`, bevor der Controller sämtliche Subscriptions
  wiederhergestellt hatte; ein in diesem Zeitfenster gesendetes Ereignis kam nicht
  an. Der positive Wiederanlauftest bestätigt daher zuerst die serverseitig
  wiederhergestellten Patterns und liest den aktuellen Zustand erneut. Eine
  lückenlose Ereigniszustellung wird nicht behauptet. Adapter müssen nach Ausfällen
  Zustand/Datenalter abgleichen; anlagenspezifische Failsafes bleiben Pflicht.
- Serverzertifikate gelten 90 Tage, die CA 365 Tage. Der CA-Privatschlüssel wird nach
  der Erstausstellung gelöscht. Im integrierten Entwicklungsstand ergänzt
  [CERTIFICATE_LIFECYCLE.md](../operations/CERTIFICATE_LIFECYCLE.md) die tägliche
  Ablaufprüfung und eine explizite Root-Wartungstransaktion mit neuer CA,
  Dienstneustart, erhaltenen DB-Passwörtern/Daten und geprüften Rückfallpfaden.
  Ein realer Redis-/TLS-Test belegt den Datenbestandserhalt; systemd, Raspberry Pi
  und Stromausfallabnahme bleiben offen. Es gibt keinen automatischen Dienststopp
  durch den Ablaufprüfungs-Timer.
- Ausschließlich eine frische Testinstallation ist unterstützt. Bestehende
  Hausanlagen benötigen eine separat geprüfte Migration mit Bestandsvergleich,
  konsistenter Sicherung und Rückfall; diese Implementierung führt keine aus.

## Bedrohungsmodell / STRIDE

| Bedrohung | Maßnahme | Nachweis / Restgrenze |
| --- | --- | --- |
| Spoofing: falscher DB-Server | CA-/SAN-/Zeitprüfung, TLS 1.3 | Echter TLS-Test mit fremder CA, falschem SAN und abgelaufenem Serverzertifikat abgewiesen |
| Spoofing: unauthentifizierter Client | Zufällige getrennte DB-Passwörter, Default-User aus | Echter Redis verweigert GET/SET ohne AUTH und falsches Passwort |
| Tampering: Abhören/Ändern im Transport | TLS-only-Listener, kein Klartextfallback | Echte Redis-Listener lehnen Klartext/TLS 1.2 ab; Haupt- und PubSub-Verbindungen TLS 1.3 |
| Repudiation: Änderungen unklarer Herkunft | Keine unbewiesene Absenderidentität behaupten | Gemeinsamer DB-Account; manipulationsgeschützte produktive Auditkette offen |
| Information disclosure: Schlüsselabfluss | Private Dateien, kein CA-Schlüssel im Betriebsbundle, redigierte Diagnose | Dateirechte getestet; root bzw. kompromittierte gemeinsame Runtime bleibt Vertrauensgrenze |
| Denial of service: hängende Verbindung | Echte Socket-Deadline, Antwortlimit, keine Offline-Schreibqueue | Socket-Cleanup und Übergröße geprüft; Last-/Stress-/Anlagentests offen |
| Elevation of privilege: Redis-Verwaltung | Gefährliche Befehle per ACL entfernt | CONFIG/MODULE/ACL/FLUSHALL/SHUTDOWN abgewiesen; Hostdienst-Isolation separat |

Zuordnung zu bestehenden Unterlagen:
[`JS_CONTROLLER_SCOPE.md`](../integration/JS_CONTROLLER_SCOPE.md),
[`RUNTIME_TLS.md`](RUNTIME_TLS.md),
[`THREAT_MODEL_SYSTEM.md`](THREAT_MODEL_SYSTEM.md).
Die früher offene reine Runtime-Fähigkeit ist für den **unten genannten
Testaufbau** jetzt belegt. Admin-Konfigurationserhalt, vollständige Adapterisolation,
Hardwarebetrieb und Serienfreigabe bleiben getrennte offene Nachweise.

## Tatsächlich ausgeführte Prüfungen

Umgebung: Ubuntu 24.04 x86_64, Node.js 24.19.0. Redis-Testwerkzeug 7.2.10 mit TLS
aus offiziellem Quellarchiv gebaut; Quellarchiv SHA-256
`e576ad54bc53770649c556933ecd555b975e3dac422e46356102436a437b43c7`.
Dies ist ein Testwerkzeug, keine Auswahl/Freigabe einer Redis-Produktversion.
Veröffentlichte npm-Pakete `iobroker.js-controller`, `@iobroker/db-objects-redis` und
`@iobroker/db-states-redis` jeweils 7.2.2; tatsächlich aufgelöstes ioredis 4.31.0.
Die Abhängigkeiten wurden außerhalb des Repositorys mit deaktivierten npm-Lifecycle-
Skripten installiert. Lockfile dieses Testbaums SHA-256
`0ab196ab344b093ba542b11fc9580edf8e470ad688cce9e43ac11a4c3f11c9c7`.

```sh
node --test tests/system/transport.test.cjs

EOS_TEST_REDIS_SERVER=/absolute/path/to/redis-server \
EOS_TEST_CONTROLLER_ROOT=/absolute/path/to/controller-test-project \
node --test tests/system/transport-redis.integration.cjs

EOS_TEST_REDIS_SERVER=/absolute/path/to/redis-server \
EOS_TEST_CONTROLLER_ROOT=/absolute/path/to/pinned-controller-app \
node --test tests/system/transport-controller.integration.cjs
```

`EOS_TEST_CONTROLLER_ROOT` enthält `package.json` und `node_modules` der genannten
Pakete. Fehlende Werkzeuge führen zu einem Fehler, nicht zu still übersprungenen
Tests. Sämtliche Testzertifikate, Passwörter und Redis-Daten liegen in temporären
privaten Verzeichnissen außerhalb des Quellbaums und werden nach dem Test entfernt.

| Prüfreihe | Ergebnis / Geltungsbereich |
| --- | --- |
| Provisionierung und Transportprobe | 13 Tests bestanden; echtes TLS, teilweise bewusst kleine RESP-Protokollfixtures |
| Redis-/Controllerintegration | 9 fachliche Untertests plus umschließender Test; echte veröffentlichte DB-Clients und zwei echte Redis-Server |
| Objekte/Zustände/PubSub | Schreiben, Lesen, Ereigniszustellung und geprüfte TLS-Sockets bestanden |
| Controller-Nachrichten | `pushMessage`/`subscribeMessage` über echte TLS-Redis-Verbindungen bestanden |
| Negativtests | Falsches Passwort/CA/SAN, fehlende AUTH, Klartext/TLS 1.2 sowie gesperrte Verwaltungsbefehle abgewiesen |
| Wiederanlauf | Normaler Redis-Neustart, persistierter Zustand, Client-Reconnect und erneute PubSub-Zustellung bestanden |
| Vollständiger Controllerprozess | 4 fachliche Untertests plus umschließender Test bestanden: normales `setup`, gehärtete Initialisierung, Alive/PID mit Readiness-Gate, kontrolliertes Stoppen, Verifikation und Neustart; Testumgebung mit upstream CI-Modus, keine Adapter/Geräte |
| RPi 5 / Linux 12 / Tailscale / Stromausfall / Penetrationstest | Hier nicht ausgeführt |

Die Core-Prozessprüfung kopiert die tatsächlich gepinnte Controller-App in eine
temporäre Installation. Die Laufzeitkonfiguration deaktiviert Multihost, Sentry,
Compact-Mode und Shellbefehle. Es läuft ausdrücklich `setup` und nicht `setup first`;
kein Admin-/Discovery-/Backup-Adapter wird dabei installiert oder gestartet.
Ein fehlgeschlagenes Setup oder eine fehlgeschlagene Härtung verhindert im Test
den nächsten Startschritt. Vor dem Versiegeln der App muss ihr
`node_modules/iobroker.js-controller/tmp` als leeres Verzeichnis vorhanden sein,
weil Upstream-Setup dieses andernfalls anlegen möchte.
Die Sicherheitsvariante wurde auch mit den tatsächlich transformierten
Controllerdateien geprüft. Ein Lauf mit geerbtem `NODE_PATH` wurde durch den neuen
Startschutz abgewiesen; die Testprozesse verwenden nun wie das Hostprofil leere
`NODE_PATH`/`NODE_OPTIONS`. Der Schutz wurde nicht abgeschwächt.
Die Integration deckte zusätzlich einen Schnittstellenfehler auf: Der Controller
entfernt nach deaktivierter Pluginregistrierung die zugehörigen Sentry-States.
Die Initialisierungsprüfung erwartete zuvor zwingend einen vorhandenen
`enabled=false`-State. Sie akzeptiert jetzt dessen Abwesenheit nur beim passenden
EOS-Controllerprofil mit ausgeschalteter Pluginregistrierung; vorhandene aktivierte
oder falsch typisierte Werte bleiben gesperrt. Dieser Fehler wurde vor der
erneuten Gesamtprüfung korrigiert.

Die Entwicklungsumgebung erlaubt `os.networkInterfaces()` nicht. Der native
UUID-Erzeugungspfad bricht mit `uv_interface_addresses` ab; dafür ist ein
fehlgeschlagener Lauf dokumentiert. Für die erfolgreiche Core-Prüfung wird deshalb
**nur im Testprozess** `CI=true` gesetzt: Der Controller verwendet dann seinen
eigenen festen CI-Test-Identifier. Dieser Identifier darf nicht in Geräteimages
übernommen werden. `EOS_TEST_NATIVE_UUID=1` aktiviert im Test den normalen
UUID-Pfad und reproduziert hier die Umgebungsgrenze. Die Produktinitialisierung
und individuelle Geräteidentität sind auf der Zielplattform weiterhin zu prüfen.

`EOS_TEST_UNPRIVILEGED=1` versucht zusätzlich App-Dateien root-eigen und
schreibgeschützt, die Konfiguration root-eigen 0444 und nur das Datenverzeichnis
für UID/GID 65534 schreibbar zu machen; Setup, Bootstrap und Controller würden dann
unter dieser UID laufen. **Dieser Lauf ist hier blockiert:** Die Sandbox bildet
nur UID/GID 0 ab; schon `chown(...,65534,65534)` scheitert mit EINVAL. Das wurde nicht
durch lockerere Produktrechte umgangen. Der erfolgreiche Prozesslauf unter der
verfügbaren Sandbox-UID ist kein Nachweis unprivilegierter systemd-Isolation oder
Read-only-Mounts; diese Abnahme bleibt offen.

Erste Testversuche erforderten Korrekturen an Testannahmen: Eine nicht lesende
TLS-Fixture konsumierte das TCP-Ende nicht; sie liest nun eingehende Daten. Der
Controller ruft `connected` bei bereits als bereit markiertem Redis-Reconnect nicht
erneut auf; die Wiederanlaufprüfung bewertet deshalb echte Socket-Bereitschaft,
serverseitig bestätigte Subscriptions, erhaltene Daten und erneute Ereigniszustellung.
Das dabei beobachtete Zustellfenster ist oben als verbleibende Grenze dokumentiert.
Diese Anpassungen umgehen keine
Produktfehler oder Sicherheitsprüfungen.

## Primärquellen

- [Redis TLS-Konfiguration](https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/)
- [Redis ACLs](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
- [Controller-Prüfquellstand 7.2.2](https://github.com/ioBroker/ioBroker.js-controller/tree/88516d65367580088327214bd9decedca77beea7)

Die geprüften npm-Artefakte sind von diesem Quellcheckout als eigene Prüfbasis
unterschieden. Eine Übereinstimmung aller Buildbytes mit dem Tag wurde hier nicht
behauptet. Keine rechtliche Konformitätsaussage wird aus diesem Transportnachweis
abgeleitet.
