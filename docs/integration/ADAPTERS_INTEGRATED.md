# Geräteadapter im integrierten EOS-Entwicklungsstand

Stand: 01.10.2026. Quellpakete sind Devices 0.5.169, EEBUS 0.3.0,
OCPP21 0.4.0 und NexoWatt Backup 1.0.10, jeweils mit den hier beschriebenen
Entwicklungsänderungen. Die Versionsnummern bezeichnen den Ausgangsstand;
Dateihashes in `reports/integrated/adapters/source-inventory.json` binden den
tatsächlichen geänderten Quellstand. Diese vier Komponenten bleiben für
physische Anlagen **deaktiviert und ohne Adapterfreigabe**. Vorhandener Quellcode,
ein installiertes Paket und eine aktivierte Instanz sind getrennte Zustände.

## Architektur und Vertrauensgrenzen

Die Pakete sind getrennte Komponenten außerhalb des unveränderlichen
Controllerkerns. Objekte, Zustände und Messagebox verwenden im EOS-Profil dessen
authentifizierte TLS-1.3-Datenbanken. Das verschlüsselt diesen internen Weg;
es ersetzt weder Geräteprotokoll-Schutz noch eine isolierte Identität pro Adapter.
Code unter derselben ioBroker-Benutzerkennung bleibt eine gemeinsame
Vertrauenszone. Native Konfiguration und Adaptercode sind keine unabhängige
Sicherheitsgrenze gegen einen bereits kompromittierten Adapter.

Keine der nachstehenden Änderungen startet Geräte, schreibt Sollwerte auf eine
Anlage, installiert Hostpakete oder erteilt sudo-/Docker-Rechte. Regelalgorithmen,
Datenpunktnamen und UI-Dateien dieser vier Komponenten wurden nicht umgebaut.
Die bewussten Kompatibilitätsänderungen an TLS und CAN stehen unten.

## Protokollmatrix

| Komponente / Weg | Quellstand und Änderung | Freigabegrenze |
|---|---|---|
| Devices HTTP/HTTPS | HTTPS prüft Zertifikat und Hostname; TLS mindestens 1.3. Kein TLS-Prüfungs-Bypass, keine Redirects, keine Proxy-Umgebungsübernahme. Jede Abfrage hat höchstens 5 s inklusive aktivem Abbruch und 1 MiB Antwort-/Requestgrenze. | HTTP bleibt für bestehende Geräteschnittstellen technisch vorhanden und unverschlüsselt. Keine allgemeine Gerätefreigabe; HTTP-Ziel nur nach konkreter Bewertung/Segmentierung. |
| Devices TA-CMI JSON | Derselbe HTTP-Schutz; Fehlercodes ohne URL/Passwort-/Antwortinhalt. | TA-CMI-Modbus-Bridge bleibt ein unverschlüsselter TCP-Server, standardmäßig Port 1502. Ihre Aktivierung ist im EOS-Profil noch nicht freigegeben. |
| Devices MQTT / MQTTS / WSS | `rejectUnauthorized:false` wird vor Verbindung abgelehnt. TLS mindestens 1.3, Gegenstellenprüfung verpflichtend; bestehende CA-Konfiguration bleibt. | `mqtt://`/`ws://` bleiben unverschlüsselt. TESVOLT-Gerät, Gateway-Firmware, Zertifikate und Topics brauchen getrennte Abnahme; vorhandene TLS-Unterstützung beweist sie nicht. |
| Devices Modbus TCP, Kostal TCP, M-Bus TCP | Bestehende Protokoll-/Registerlogik unverändert. | Kein eingebautes TLS/Endgeräte-Authentifizierungsversprechen. Zugriff über ein konkret abgesichertes Gerätenetz; nicht mit internem Redis-TLS verwechseln. |
| Devices Modbus RTU/ASCII, RS485, M-Bus seriell | Bestehende serielle Anbindung. | Physischer Bus ist keine kryptografische Authentifizierung. systemd-Gerätefreigaben sind separat erforderlich und derzeit nicht erteilt. |
| Devices UDP / Speedwire | Bestehende lokale UDP-Kommunikation. | Keine neue Verschlüsselung/Peer-Authentifizierung. Geräterisiko und Paketmanipulation bleiben offene Prüfungen. |
| Devices CAN | Nur `/usr/bin/candump` und `/usr/bin/cansend`; keine konfigurierbaren Programme/zusätzlichen Argumente. Interface und Frames werden geprüft. Senden endet spätestens nach 5 s; stderr ist begrenzt. | CAN selbst unverschlüsselt. Kein CAN-Interface eingerichtet; keine CAN-Hardwareprüfung. Konfigurationen mit eigenen Binärpfaden/Argumenten werden abgelehnt. |
| Devices OneWire | Bestehender Zugriff auf Geräteschnittstellen. | Keine kryptografische Busauthentifizierung; Host-Datei-/Gerätegrants offen. |
| EEBUS SHIP | TLS mindestens 1.3; P-256-TLS-Peerzertifikat erforderlich. Ausgehende Verbindung vergleicht tatsächlich bewiesenen TLS-Schlüssel mit angekündigter SKI und gegebenenfalls SHA-256-Fingerprint. Anwendungsdaten gelangen nur über den Data-Kanal nach aktuellem Vertrauen und vollständiger Hello-/Protokollphase in Message-/CLS-Handler. Control-/JSON-Nachrichten werden streng als Protokollnachrichten geprüft; PIN-Ausgabe erfordert dieselbe vertrauenswürdige Reihenfolge. | Selbstsignierte SHIP-Zertifikate werden über den gepaarten Schlüssel identifiziert, nicht über öffentliche PKI. `rejectUnauthorized:false` im TLS-SHIP-Pfad wird deshalb durch explizite Peerprüfung ergänzt. Vollständige SHIP-/PIN-/SPINE-Konformität und Interoperabilität sind nicht nachgewiesen. |
| EEBUS mDNS | Discovery bleibt UDP 5353 und unverschlüsselte Metadaten. | Discovery erteilt keine Berechtigung; angekündigte Identität muss zum TLS-Schlüssel passen. Verbindungs-/Pairingzeiten und Sessionmengen sind begrenzt und lokal geprüft; Paketflut, Discoveryumfang und reale Paarungsbedienung bleiben weiter zu prüfen. |
| OCPP21 Server | Neuer zwingender root-eigener mTLS-Transport. Nur TLS 1.3, vertrauenswürdige Client-CA und exakt zugeordneter DNS-SAN; kein CN-/Wildcard-Fallback. URL-Identität ist kein Passwortersatz. | Ohne Transportprofil startet der Server nicht. Reale Ladepunkte, Zertifikatsimport, Erneuerung/Widerruf und OCPP-Interoperabilität sind noch nicht abgenommen. |
| Backup lokal / CIFS / NFS / Datenbank / Restore | Bestehende Quellen aufgenommen, nicht automatisch aktiviert. | Shell-/sudo-/Mount-/Restore- und frei konfigurierbare Executable-Pfade sowie separater HTTP-Transferdienst sind offene Blocker. Unveränderlicher EOS-Kern/TLS-Redis passen nicht automatisch zum alten Restore-Pfad. |
| Backup FTP / WebDAV / Cloud | Bestehende Quellen aufgenommen. | Plain-FTP, abschaltbare TLS-Prüfung und optionale Cloud-Datenflüsse sind nicht für das lokale EOS-Profil freigegeben. |

TLS-1.2-only-Geräte verbinden sich mit den neu gehärteten TLS-Pfaden nicht mehr.
Es gibt keinen stillen Rückfall. Dies ist eine bewusst strengere EOS-Testvorgabe,
keine Aussage, dass jede TLS-1.2-Nutzung normwidrig sei. Insbesondere für SHIP muss
die Gerätekombination separat abgeglichen werden. SHIP-SKI verwendet weiterhin
SHA-1 als Protokollbezeichner des öffentlichen EC-Schlüssels, **nicht** zur
Zertifikatssignatur, Softwareintegrität oder als neue allgemeine Kryptografieempfehlung.

## Konfigurationsverträge

### Devices

`package.main=bootstrap.js`, Instanz `nexowatt-devices.0`, `messagebox=true`.
`native.devices` ist die vorhandene Geräteliste; `devicesJson` der bestehende
Migrationsweg. Für die leere Installation bleibt die Liste leer und die Instanz
deaktiviert. Ein konfiguriertes Gerät kann beim Start Watchdogs, Setpoint-Restore
und Wiederholschreiben auslösen: erst nach gerätespezifischer Abnahme aktivieren.

HTTP/TA-CMI: `connection.caCertificate` akzeptiert begrenztes PEM-CA-Material;
`timeoutMs`/`timeout` werden auf höchstens 5000 ms begrenzt. Die Flags
`insecureTls`, `insecureTLS`, `allowInsecureTls` bzw. `rejectUnauthorized:false`
werden abgelehnt. Zertifikatsmaterial muss separat auf dem Gerät bereitgestellt
werden. MQTT behält `caCertificate`/`ca`/`caFile` und `servername`; dieser
CA-Dateipfad und die gesamte Native-Konfiguration sind weiter separat zu prüfen.

### EEBUS

`package.main=build/main.js`, Instanz `eebus.0`, `messagebox=true`.
Die alte Rootdatei `main.js` ist ein früherer Datenpunkt-Prototyp und **nicht** der
Paket-Einstieg. Vor Paketbildung muss TypeScript erfolgreich kompiliert werden.
Das ursprünglich gelieferte `package-lock.json` war noch Version 0.0.1. Es wurde
durch die isoliert installierte Auflösung für 0.3.0 ersetzt; die ursprüngliche
Datei bleibt unter `reports/integration/sbom/eebus-original-source-lock.json`
erhalten. Der abschließende Compiler ist TypeScript 5.9.3 und erfüllt die
deklarierte Anforderung `^5.9.2`. Der frühere 5.8.3-Lauf ist nur ein historischer
Zwischennachweis.

Für einen späteren kontrollierten Test: `autoAcceptNewDevices=false`,
`allowCommandsToUntrustedDevices=false`, `commandDryRun=true`,
`debugRawMessages=false`; kein unkontrolliertes Auto-Enroll. Auch `autoApplyClsLimits`
und der NexoWatt-Bridge-Pfad dürfen erst nach Funktions-/Sicherheitsabnahme
freigegeben werden. Trust-Revocation trennt nun sofort die Sitzung. WebSocket-
Payload höchstens 256 KiB, höchstens 32 wartende Frames pro Sitzung, 64 TCP-
gleichzeitige Verbindungen einschließlich ausgehender/registrierender Sitzungen.
TLS-/WebSocket-Aufbau ist auf 5 s und die gesamte Paarungsphase auf 120 s begrenzt.
Wiederholte Discovery startet keine parallelen Verbindungen zur gleichen
Gegenstelle. Stop beendet offene Verbindungen; verspätete Close-/Error-Ereignisse
eines ersetzten Sockets löschen dessen Nachfolgesitzung nicht. Diese engen
Ressourcentests sind noch keine vollständige DoS-Abnahme.

### OCPP21

`package.main=main.js`, Instanz `ocpp21.0`. Das bisherige Profil hatte
`messagebox` nicht deklariert. Es gibt weiterhin **keine implementierte zentrale
Lizenzabfrage in diesem Adapter**. `native.port` und eine native Identity-Allowlist
können den zwingenden Transport nicht abschalten oder seinen Bind-Port ersetzen.

Feste Dateien unter `/etc/nexowatt-eos/ocpp21/`:

* `transport.json`: root-eigen, keine Gruppen-/Fremdschreibrechte.
* `server.crt`, `client-ca.crt`: PEM; kein privater Schlüssel enthalten.
* `server.key`: root-eigen, keine Fremdrechte, nur notwendige Servicegruppe lesend.

Alle Verzeichnisvorfahren müssen root-eigen, symlinkfrei und ohne
Gruppen-/Fremdschreibrechte sein. Dateien sind regulär, nicht hartverlinkt und
höchstens 64 KiB. Native Konfiguration und Umgebungsvariablen können keinen
anderen Transportprofilpfad auswählen. Die folgende Konfiguration ist ein
**Formatbeispiel ohne enthaltene Zertifikate oder automatische Freischaltung**:

```json
{
  "schemaVersion": 1,
  "profile": "eos-ocpp-mtls-v1",
  "host": "0.0.0.0",
  "port": 9220,
  "identities": [
    { "identity": "stationA", "dnsName": "station-a.ocpp.invalid" }
  ]
}
```

Der Ladepunkt verbindet sich per `wss://<EOS-Hostname>:9220/ocpp/stationA`.
Sein Clientzertifikat muss von `client-ca.crt` validiert werden und den genauen
DNS-SAN `station-a.ocpp.invalid` besitzen. Der Ladepunkt muss seinerseits das
EOS-Serverzertifikat prüfen. Die Adapterquelle vergibt keine Zertifikate und
installiert keine CA auf einem Ladepunkt. 128 konfigurierte Identitäten und
128 TCP-Verbindungen, 256 KiB WebSocket-Payload; keine pauschale Leistungszusage.

### Backup

`package.main=build/main.js`, Instanz `nexowatt-backup.0`, `messagebox=true`.
Keine Instanzaktivierung und keine Übernahme des alten `sudoMount=true`-Defaults.
Die alte Sicherung/Restore-Implementierung darf nicht als Wiederherstellungsweg
für den signierten, schreibgeschützten EOS-Lieferbaum freigegeben werden.
Ein enger, getrennt berechtigter Backup-/Restore-Dienst mit Verschlüsselung,
Integritätsprüfung und Zielsystem-Restore-Test ist noch erforderlich.

## Zentrale Lizenzverwaltung

Der vorhandene Client unter `components/admin/packages/eos-license-client`
stellt `createLicenseGuard(adapter, options)` bereit. Vertrag: explizites
`adminInstance: "eos-admin.0"`, `feature: "energy"`, ganzzahlige
`required.chargePoints`/`required.batteries`, verpflichtendes `onLost`.
Requests heißen `eos.license.check`; 2 s Timeout, 15 s maximale Lease,
5 s Refresh. Kein Token oder privater Schlüssel wird an Adapter verteilt.

Diese vier Adapter importieren den Client **noch nicht**. Enrollment-/UI-
Freigabe und laufender Anlagenbetrieb brauchen getrennte Entscheidungen:
Lizenzverlust darf nicht unbeabsichtigt Netzlimits, CLS-Begrenzung, bereits
laufende Ladevorgänge oder Schutz-/Watchdogfunktionen abschalten. Ein
gerätespezifischer Übergang fehlt noch. Eine statische Paketfreigabe ersetzt
weder die zentrale Entitlementprüfung noch sichere Übergangstests. Die
Messagebox-Lease ist außerdem keine kryptografisch getrennte Adapteridentität
innerhalb derselben kompromittierten Laufzeit.

## Befunde, Bedrohungen und Nachweise

| Kennung | STRIDE / Grenze | Umsetzung / Status |
|---|---|---|
| NW-EOS-ADP-261001-01 | Spoofing/Tampering: EEBUS Daten vor Vertrauen, mDNS statt TLS-Schlüssel | Quellpfad korrigiert; ursprüngliche zehn Tests waren für spätere Control-/PIN-Befunde nicht vollständig. Abschließender Lauf: 21/21 einschließlich neuer Frame-/Ressourcenfälle. SHIP-/PIN-/Hardwareabnahme offen. |
| NW-EOS-ADP-261001-02 | Spoofing/Information disclosure: OCPP Plain-WS/URL-Allowlist | Zwingendes mTLS-Profil, SAN-Bindung; 13 gemeldete Testpasses inklusive 11 Subtests. Ein realer OCPP-Heartbeat und negative TLS/Auth-Fälle, keine Ladehardware. |
| NW-EOS-ADP-261001-03 | Tampering/DoS/Disclosure: Devices HTTP-TLS-Bypass, unbegrenzte Antwort/Fehlerinhalt | TLS-Prüfung, Deadline/Abort, Größen-/Redirectgrenzen, Fehlerredaktion. 6 gezielte Tests einschließlich echter lokaler HTTP-Sockets positiv. |
| NW-EOS-ADP-261001-04 | Elevation: frei konfigurierbare CAN-Programme | Feste Programme/Argumentvertrag, 3 Validierungstests. Kein CAN-Gerätetest; Binary-/OS-Lieferbindung offen. |
| NW-EOS-ADP-261001-05 | Elevation/Tampering/Disclosure: Backup-Shell/Restore/HTTP/TLS-Bypass | Offen; Adapter nicht freigegeben. |
| NW-EOS-ADP-261001-06 | Spoofing/Tampering: unverschlüsselte Legacy-Geräteprotokolle | Offen; pro Gerät/Netz zu bewerten, keine pauschale Verschlüsselungsbehauptung. |
| NW-EOS-ADP-261001-07 | Autorisierung/Verfügbarkeit: Lizenztransition im Anlagenbetrieb | Offen; kein improvisierter Abschaltpfad eingebaut. |
| NW-EOS-ADP-261001-08 | Lifecycle/Repudiation: Geräte-PKI, Widerruf, Enrollment und Rollen | Offen; eigener Prüf-/Betriebsprozess und Zielgeräteversuche erforderlich. |
| NW-EOS-ADP-261001-09 | Spoofing/Tampering: Control-/JSON-Frames erreichen Anwendung außerhalb Data-Gate | Im erweiterten Vorher-Lauf reproduziert; streng klassifizierte Protokollframes, kein generischer Callback-Fallback. Finaler 21er-Lauf positiv, nur auf Code-/Laborebene geschlossen. |
| NW-EOS-ADP-261001-10 | Information disclosure: PIN vor trusted Protokollphase/nach Widerruf | Vorher mit synthetischer PIN reproduziert; aktuelle Vertrauens-/Phasenprüfung vor jeder PIN-Ausgabe. Positiver legitimer Pairingfall und negative Reihenfolgen im finalen Lauf; keine Hardwarefreigabe. |

Tatsächlich ausgeführt unter Linux x64/Node 24.19.0:

* Devices vollständiges bestehendes und erweitertes Testmanifest: **270 Tests,
  270 bestanden, 0 übersprungen**. Enthält lokale simulierte MQTT-/Modbus-Endpunkte;
  kein Kunden-/Hausanlagengerät. Ein erster Lauf hatte eine erwartete Regression
  der alten Fehleridentitäts-Assertion nach Fehlerredaktion und 7 fehlende
  Transportabhängigkeiten; Rohbeleg bleibt erhalten, korrigierter vollständiger
  Lauf ist getrennt abgelegt.
* EEBUS: Abschließender TypeScript-**5.9.3**-Build und **21/21** Frame-/PIN-/
  Ressourcentests positiv; vier bestehende Konfigurations-, CLS-Parser-, Bridge-
  und Result-Order-Skripte gegen diesen Build ebenfalls positiv. 16 Fälle prüfen
  SHIP-/PIN-Grenzen, fünf die Verbindungsressourcen. Ein Fall verwendet tatsächliche
  lokale TLS-/WebSocket-Sockets während absichtlich verzögerter Registrierung;
  weitere Ressourcenfälle verwenden Timer-/Socket-Fixtures. OpenSSL erzeugte
  flüchtige Testzertifikate; ihre Schlüssel sind kein Lieferinhalt. Der frühere
  5.8.3-Lauf mit 21/21 sowie die ersten zehn Fälle bleiben historische Stände.
  `eebus-control-bypass-before-fix.tap` erhält den Vorher-Lauf mit 11 Erfolgen und
  fünf Fehlern. Der abschließende `reports/integration/sbom/eebus-final-security.tap`
  enthält den abschließend erneut ausgeführten TAP-13-Lauf; Zähler und Hash sind
  im Bericht ausdrücklich gebunden.
* OCPP: **25** bestehende Core-Tests positiv. **13** Security-Testpasses
  (11 Subtests plus zwei übergeordnete Tests) mit tatsächlich installiertem
  `ocpp-rpc@2.2.1` und echten TLS-Sockets positiv. Root-Dateirechte wurden mit
  UID 0 im Labor getestet; Zielservice-UID/Berechtigungen noch nicht abgenommen.

Die Control-/JSON-Reproduktion erreicht den tatsächlichen CLS-Parser mit einem
synthetischen 4.200-W-Befehl, führt jedoch keine Geräteaktion aus. Die zusätzliche
Vertrauensprüfung in `processClsEvent` begrenzt die Aussage über unberechtigte
physische Schreibzugriffe. Quellkorrektur und Laborregression schließen diese
engen Befunde; Protokollinteroperabilität, zentrale Lizenztransition und alle
physischen Instanzenfreigaben bleiben offen.

Rohbelege: `reports/integrated/adapters/`. `verification.json` enthält Befehle,
Umgebung und Ergebniszahlen. Die Quelleninventur ergänzt die vom tatsächlichen
Build erzeugte SBOM; sie ist selbst **keine** vollständige Produkt-/OS-SBOM.
Kein npm-/GitHub-Publish und keine CRA-/IEC-/Produktivfreigabe aus diesen Tests.
