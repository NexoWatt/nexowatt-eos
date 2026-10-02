# EEBUS und OCPP: erster Integrationsreview

Prüfdatum: 30.09.2026. Status: **Quellprüfung mit isolierten Reproduktionen; keine Installations-, Hardware- oder Produktfreigabe**. Beide Repositorys wurden nur gelesen. Keine Produktdateien geändert, keine Netzwerklistener gestartet, keine Steuerbefehle an Geräte gesendet. Die Funde beziehen sich auf die nachstehenden Commits; sie beweisen nicht die Konfiguration eines vorhandenen Kundengeräts.

## Fixierter Umfang

| Komponente | Quelle und Commit | Paketstand / deklarierte Anforderungen |
| --- | --- | --- |
| EEBUS | `NexoWatt/ioBroker.eebus`, `1c0eb410d516b90d60f6e475e6822bf5836bfd66` | `iobroker.eebus` 0.3.0; Node >=20, js-controller >=6.0.11, Admin >=7.7.22 |
| OCPP | `NexoWatt/iobroker.ocpp21`, `ca55a1596e16ba814399de3a781c16d6d61e0f04` | `iobroker.ocpp21` 0.4.0; Node >=20, js-controller >=6.0.0; kein Admin-Minimum im Manifest |

Belege: jeweilige `package.json` und `io-package.json`. Mindestversionen sind Angaben des Quellstands, **keine Empfehlung zur Installation einer alten Runtime**. Die gemeinsame freizugebende Node-/Controller-Version muss mit Admin, UI, Devices und Backitup festgelegt und getestet werden. Das Nutzerprofil Raspberry Pi 5 mit 8/16 GB RAM und SSD ist bekannt; die genaue Distribution, Architektur, Kernel-/Firmware-/Node-Version des genannten „Linux 12 Lite“ ist noch zu erfassen.

EEBUS ist proprietär gemäß `LICENSE` und `package.json:14`; OCPP deklariert MIT in `package.json:6`. OCPP liefert zusätzlich OCA-Schemata mit eigenen Lizenzhinweisen (`ocpp/schemas/NOTICE.md` und Kommentaren in den Schemadateien). Diese separat inventarisieren, nicht pauschal unter MIT führen. Hier erfolgte keine rechtliche Lizenzfreigabe.

## Architektur und vorhandene Schutzmaßnahmen

EEBUS verwendet für SHIP eingehendes HTTPS/WebSocket und ausgehendes `wss://`, jeweils mit lokalem Schlüssel/Zertifikat. Der Adapter ist im Manifest zunächst deaktiviert. Nach Aktivierung sind Discovery, SHIP-Server auf Port 4712 und Auto-Connect standardmäßig aktiv. `autoAcceptNewDevices=false`, `allowCommandsToUntrustedDevices=false`, `commandDryRun=true` und `debugRawMessages=false` sind vorhandene Schutzvorgaben (`io-package.json:59,108–144`). Die eigentliche CLS-Verarbeitung prüft den Truststatus ausdrücklich (`src/lib/eebusRuntime.ts:406–422`). Diese zusätzliche Prüfung begrenzt die Wirkung des unten beschriebenen Handshakefehlers.

OCPP ist im Manifest aktiviert und verwendet Port 9220. Die Identitätsliste ist standardmäßig leer. Rohmitschnitte sind deaktiviert; es bestehen Datenalter-/Watchdog-Prüfungen und begrenzte Hintergrundwarteschlangen. Nicht implementierte Zertifikatsoperationen antworten ausdrücklich negativ (`ocpp/v2base.js:228–233`). Das ist keine implementierte PKI.

Beide Adapter deklarieren `compact:true`. Das bedeutet Compact-Unterstützung, nicht zwingend aktuell gemeinsamen Prozessbetrieb; getrennte Unix-Identitäten oder Prozessisolierung werden dadurch nicht nachgewiesen. Der js-controller ist für beide eine explizite Laufzeitabhängigkeit und gehört zwingend in die gemeinsame Vertrauensgrenze und Integrationstests.

## Befunde und notwendige Maßnahmen

Prioritäten P1/P2 bezeichnen die Reihenfolge der Bearbeitung im EOS-Projekt, keine berechnete CVSS-Einstufung. Kein Befund wurde geschlossen.

### EOS-INT-EEBUS-001 – Discovery-Identität ausgehend nicht ans TLS-Peerzertifikat gebunden (P1)

`src/lib/discoveryService.ts:68–98` übernimmt SKI, Host und Pfad aus mDNS. `src/lib/shipEndpoint.ts:133–166` verbindet mit `rejectUnauthorized:false` und übernimmt `node.safeId`/`node.ski` direkt in die Session. In diesem ausgehenden Pfad wird das tatsächlich verbundene Peerzertifikat nicht gelesen oder gegen die gespeicherte Vertrauensidentität geprüft. `eebusRuntime.ts:1032–1038` entscheidet Trust anschließend anhand der Gerätekennung. Mock-Reproduktion bestätigt Zertifikatslesezähler 0 und Übernahme der behaupteten Identität.

Angriffsbedingung: Angreifer kann Discovery/Verbindungsziel im erreichbaren Gerätenetz beeinflussen; besonders relevant ist die Nachahmung einer bereits vertrauten Kennung nach Trennung/Neuverbindung. Wirkung: Eine verschlüsselte Verbindung kann einer falschen Gegenstelle zugeordnet werden; Auswirkungen auf die Regelung sind im vollständigen Integrationsversuch zu bestimmen. Kein realer Netzwerkangriff wurde ausgeführt.

Maßnahme: SHIP-konforme Bindung der Vertrauensentscheidung an das tatsächliche Peerzertifikat/SKI, konsistente SKI-Ableitung, Wiederverbindung und Zertifikatswechsel prüfen; mDNS nur als Discovery behandeln. Selbstsignierte SHIP-Zertifikate erfordern eine bewusste Vertrauensprüfung; allein `rejectUnauthorized:false` ist daher nicht die gesamte Begründung des Befunds.

### EOS-INT-EEBUS-002 – Daten-/Handshakezustände lassen Verarbeitung vor abgeschlossenem Pairing zu (P1)

`shipEndpoint.ts:323–340` reicht Data-Frames ohne Prüfung von `dataExchangeReady` an die Runtime weiter. `:378–395,451–455` kann durch empfangenes `connectionPinState: none` den Datenaustausch aktivieren, ohne an dieser Stelle Trust, Hello oder Protokollzustand zu prüfen. Beide Verhaltensweisen wurden isoliert reproduziert.

`eebusRuntime.ts:406–422` weist CLS-Befehle unbekannter Peers weiterhin ab; deshalb ist **kein pauschaler unauthentifizierter CLS-Steuerzugriff nachgewiesen**. Generische Datenanalyse/-publikation läuft jedoch in `:345–381` unabhängig von dieser CLS-Prüfung. Der Zustand „paired-data-exchange“ allein ist kein belastbarer Vertrauensnachweis.

Maßnahme: explizite erlaubte Zustandsübergänge, Data-Gate vor jeder Nutzdatenverarbeitung, getrennte authentifizierte Identität und Freigabe, negative Tests für falsche Reihenfolge, unbekannte Peers, Wiederholungen und Wiederverbindung. Aufnahme von Messdaten erst nach erfolgreicher Gerätezuordnung.

### EOS-INT-OCPP-001 – Stationsanmeldung prüft keinen kryptografischen Identitätsnachweis (P1)

`ocpp/server.js:19–30` prüft ausschließlich die URL-Identität und optional deren Eintrag in der Allowlist. Eine leere Liste akzeptiert jede nichtleere Identität; auch eine erlaubte Identität wird ohne Kennwort-/Zertifikatsnachweis akzeptiert. Beide Fälle wurden im echten Auth-Callback mit ersetztem RPC-Server reproduziert. Fehlende Identität und nicht erlaubte Identität werden korrekt abgewiesen.

Angriffsbedingung: Zugriff auf den OCPP-Endpunkt. Wirkung: Unberechtigte Gegenstellen können die Anmeldung einer Ladestation behaupten; Einfluss auf Telemetrie/Sitzungsersatz/Regelung erfordert den vollständigen Test. Eine URL-Allowlist ist kein Besitznachweis.

Maßnahme: geeignetes OCPP-Sicherheitsprofil pro unterstützter Station festlegen, individuelle Credentials oder Clientzertifikate und serverseitige Bindung an Stations-ID; Enrollment und Rotation vorsehen. Nicht unterstützte Altgeräte ausdrücklich separat bewerten.

### EOS-INT-OCPP-002 – Direkter Adapterendpunkt ohne konfigurierte TLS-Schicht, Bindung an alle IPv4-Adressen (P1)

`ocpp/server.js:12–17,37–39` konfiguriert keinen TLS-Server und ruft `listen(port, '0.0.0.0')` auf. `main.js:1801–1802` übergibt keine TLS-/Hostkonfiguration. Die dokumentierte Geräte-URL lautet `ws://…` (`README.de.md:162`). Der isolierte Test bestätigt die übergebenen Optionen und Bindeadresse; ein Live-TLS-Handshake wurde nicht ausgeführt. Ein möglicherweise extern vorhandener Reverse-Proxy wurde nicht untersucht.

Maßnahme: authentifizierter verschlüsselter Stationskanal; Bindung/Firewall an vorgesehenes Gerätenetz. Bei TLS-Terminierung außerhalb des Adapters auch den Weg zur Runtime absichern und die Stationsidentität manipulationssicher weitergeben. Bloßes Umbenennen der URL auf `wss://` genügt nicht.

### EOS-INT-OCPP-003 – Schema-Strenge beim Start ausdrücklich abgeschaltet (P2)

`main.js:1801` setzt `strictMode:false`, obwohl `ocpp/server.js:14` ansonsten true verwendet. Das ist ein belegter Konfigurationsbefund; nicht die Behauptung, dass keinerlei fachliche Eingabeprüfung vorhanden sei. Viele numerische Werte werden im Adapter bereits begrenzt. Die mitgelieferten Schemata allein beweisen keine vollständige eingehende Validierung.

Maßnahme: pro Protokollversion die akzeptierten Nachrichten und Grenzen definieren, Schema-/Semantikvalidierung durchsetzen; Abweichungen echter Stationen gezielt und dokumentiert behandeln. Größen-/Raten-/Parallelitätsgrenzen vor teurer Verarbeitung prüfen.

### EOS-INT-OCPP-004 – RFID-/Tokenfreigabe pauschal „Accepted“ (P1 bei Zugangskontrollbedarf)

`ocpp/v16.js:83–87` und `ocpp/v2base.js:86–92` beantworten Authorize ohne Berechtigungsentscheidung mit Accepted. Das ist von der Stationsanmeldung und von der kommerziellen EOS-Lizenz zu trennen. Für ausdrücklich frei zugängliches Laden kann eine Freigaberegel gewollt sein; sie darf nicht als vorhandene RFID-Zugangskontrolle beworben werden.

Maßnahme: gewünschten Betriebsmodus festlegen, standardmäßig keine unbekannten Tokens freigeben, falls Kunden-/Nutzerautorisierung Teil des Produkts ist. Ein expliziter Free-Charging-Modus benötigt Rollenrechte, sichtbaren Zustand und passende Dokumentation; bestehende Ladeabläufe müssen bei der Migration gezielt geprüft werden.

### EOS-INT-SUPPLY-001 – Kein konsistenter aufgelöster Abhängigkeitsstand beider Adapter (P2)

EEBUS `package-lock.json:1–18` beschreibt 0.0.1/MIT/Node >=16 und nur adapter-core, während `package.json` 0.3.0/proprietär/Node >=20 und zusätzlich bonjour-service/ws beschreibt. Diese beiden Runtimepakete fehlen im Lockfile. OCPP liefert kein package-lock; `package.json:39–45` enthält Versionsbereiche. Daraus keine vollständige Build-SBOM oder reproduzierbaren Installationsstand ableiten.

Maßnahme: reproduzierbare Auflösung im getrennten Build erstellen, Quellen/Integritäten prüfen, Lock-/Artefakt-/SBOM-Bindung herstellen und Abhängigkeiten anhand des tatsächlich gelieferten Baums bewerten. Kein npm-Install oder Advisory-Scan wurde in diesem Review ausgeführt; es werden keine CVEs behauptet.

## Weitere offene Sicherheitsgrenzen

- **Interne Kommunikation/Lizenz:** EEBUS sendet an UI über ioBroker `sendTo` (`src/lib/nexowattBridge.ts:441–463`). Das ist hier kein selbstständiger mTLS- oder signierter Modulvertrag. Transportverschlüsselung und Rechte hängen von Controller/DB-Konfiguration ab und wurden nicht als vorhanden bescheinigt. Im gelesenen EEBUS-/OCPP-Laufzeitcode wurde keine zentrale EOS-Lizenz-/Entitlementprüfung gefunden. Signierte Rechte statt eines gemeinsamen Roh-Lizenzschlüssels in jedem Adapter integrieren; notwendige Schutz-/Wiederherstellungsfunktionen von kommerzieller Freigabe unterscheiden.
- **EEBUS TLS-Profil:** `shipEndpoint.ts:86,143` erlaubt TLS ab 1.2. Das ist eine Abweichung vom gewünschten internen EOS-TLS-1.3-Profil, aber kein Beleg, dass TLS 1.2 in jeder EEBUS-Geräteverbindung pauschal unsicher oder unzulässig ist. Aktuelle SHIP-Anforderungen und Geräteinteroperabilität konkret prüfen; erforderliche Protokollausnahmen separat freigeben.
- **Schlüsselpersistenz:** `io-package.json:83–91` deklariert encrypted/protected Native-Felder. `identityManager.ts:158–178` schreibt den Schlüssel über `setForeignObjectAsync`. Ob und wie der konkrete Controllerstand dabei Verschlüsselung und Zugriffsschutz durchsetzt, bleibt durch DB-/Restart-/Backup-Prüfungen nachzuweisen; die Deklaration allein ist kein At-Rest-Test.
- **Ressourcen/Failsafe:** SHIP-WebSocket-Optionen setzen keine eigenen engen `maxPayload`-/Sessiongrenzen; Bibliotheksdefaults sind hier nicht aufgelöst worden. Flooding, viele mDNS-Knoten, Verbindungsabbrüche, veraltete Messwerte, CLS-Failsafe und sichere Wiederaufnahme auf RPi 5 unter definierter Last prüfen. Keine erfundenen Latenz- oder RAM-Zusagen.

## Tatsächlich ausgeführte Prüfungen

Umgebung: isolierter Linux-Workspace, Node **v24.19.0**, keine Produktinstallation. Befehle relativ zum gemeinsamen Arbeitsverzeichnis:

```sh
node --test --test-reporter=tap audit/protocol-review/source-behavior.test.cjs
node --test --test-reporter=tap component-sources/ocpp21/test/core.test.js
```

- 7/7 Quellverhaltensprüfungen bestanden. Davon bestätigen sechs das oben beschriebene unerwünschte Verhalten; eine prüft bestehende Ablehnungen. **Bestanden bedeutet hier reproduziert, nicht abgesichert.**
- 25/25 vorhandene OCPP-Coretests bestanden. Fachliche Hilfsfunktionen und Mock-Handler, kein OCPP-Server-/Wallboxtest.
- EEBUS-Code wurde für die Reproduktion mit Node `stripTypeScriptTypes({mode:'transform'})` transformiert und mit kontrolliertem VM-Loader geladen; WebSocket/RPCServer sind Stubs. Node kennzeichnet den Transformationsmechanismus experimentell. Das ist kein vollständiger TypeScript-Build und kein kryptografischer Wire-Test.
- Rohbelege: `audit/protocol-review/source-behavior.tap`, `audit/protocol-review/ocpp-core.tap`; Reproduktionsskript im selben Verzeichnis. Die Übergabe muss diese Belege zusammen mit den fixierten Quellen enthalten.

Nicht ausgeführt: vollständiger EEBUS-Build, npm-/ioBroker-Integrationstests, Controller-/DB-TLS-Tests, reales Pairing/mTLS, negatives Zertifikat-/Replay-/DoS-Testprofil, Install/Upgrade/Backup-Restore, ARM64-/RPi5-Lasttests, reale Ladestation/CLS-Steuerbox, unabhängiger Penetrationstest. CRA-/IEC-Zuordnung erfolgt als technische Nachweislücke in der Systemdokumentation; dieser Bericht erklärt keine Norm- oder Produktkonformität.

## Nächster Integrationsschritt

Zuerst Quellen-/Versionsmanifest einschließlich js-controller fixieren und Baseline von Datenpunkten, Rollen, Pairing und Lade-/CLS-Verhalten sichern. Danach EEBUS-Identitätsbindung/Zustandsmaschine und OCPP-Transport/Stationsauthentifizierung mit positiven und negativen Tests umsetzen. Bestehendes Design und fachliche Datenpunkte erhalten; notwendige Sicherheitsänderungen an Enrollment, Rollen oder Free-Charging ausdrücklich migrieren. Freigabe erst nach erfolgreicher Prüfung der tatsächlichen Lieferkonfiguration.
