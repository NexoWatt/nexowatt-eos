# Nachprüfung: Admin-Ersteinrichtung und interne Kommunikation

Datum: 30.09.2026. **Status: Quellprüfung vor Umsetzung.** Dieser Bericht dokumentiert den geprüften Upstream-Ausgangsstand; er implementiert selbst keine Produktänderung. Die ergänzende Reproduktion führt zwei Originalmethoden nur mit synthetischen Daten in isolierten JavaScript-Kontexten aus. Änderungen und deren Nachtests im aktuellen Lieferstand sind gesondert dokumentiert, unter anderem in [RUNTIME_TLS.md](RUNTIME_TLS.md).

## Kurzentscheidung

**Die Admin-Ersteinrichtung behebt die gefundenen Installer-/Hostlücken nicht automatisch und aktiviert keine Verschlüsselung der internen Datenbankkommunikation.** Ihr Passwort- und SSL-Schritt betrifft das ioBroker-Admin-Webinterface. Datenbank-TLS, individuelle Adapterrechte, Sudo-Policy und Node-Capabilities sind andere Schutzgrenzen.

Eine sichere Implementierung darf deshalb nicht nur `native.secure=true` im Admin oder `secure=true` bei den internen JSONL-Datenbanken setzen. Für diesen Stable-Stand ist ein konkret provisionierter externer Redis mit nativer TLS-Unterstützung technisch möglich. Seine Clientkonfiguration muss zusätzlich vor Verlust durch die vorhandenen Admin-Basiseinstellungen geschützt werden.

## Verifizierte Versionen

Am Prüfungstag abgefragte npm-Distributionstags:

| Komponente | npm stable | npm latest | Zugehöriger Stable-Quellcommit |
|---|---|---|---|
| ioBroker.js-controller | 7.2.2 | 7.2.3 | `88516d65367580088327214bd9decedca77beea7` (Tag v7.2.2) |
| ioBroker.admin | 8.0.14 | 8.0.21 | `e4b39b810f5f12cd6e969e25a39ff6f3188a6608` (Tag v8.0.14) |

Befehle: `npm view iobroker.js-controller dist-tags --json`, entsprechend für Admin, jeweils mit deaktivierten Wiederholungen und zehn Sekunden Abruflimit. Die offizielle `ioBroker/ioBroker.repositories/sources-dist-stable.json` bestätigt 7.2.2 und 8.0.14; abgerufener Blob `225e40b43ce79b06b60690b3918028cf4fecdeee`. Die Git-Tags wurden mittels GitHub-Connector aufgelöst und getrennt read-only geklont.

Das beweist den Stable-Referenzstand am Abrufdatum, **nicht** die auf Dominiques System tatsächlich installierten Versionen oder die Implementierung seines gesonderten EOS-Admin-Forks. Dessen angepasster Wizard liegt in NexoWatt/EOS nicht vor. Die vorherige Master-/Alpha-Quellprüfung wurde für die nachfolgenden Aussagen durch diese Stable-Prüfung ersetzt.

## Was der Stable-Admin-Wizard tatsächlich macht

Alle folgenden Admin-Dateizeilen beziehen sich auf Commit `e4b39b810f5f12cd6e969e25a39ff6f3188a6608`.

- `src-admin/src/dialogs/WizardDialog.tsx:44–54`: Schritte Willkommen, Lizenz, Passwort, Authentifizierung, Portweiterleitung, Einstellungen, Räume, Adapter und Abschluss.
- `WizardDialog.tsx:129–145`: liest bestehende `native.auth`-/`native.secure`-Werte der Admininstanz.
- `WizardDialog.tsx:281–289`: ändert das Passwort des ioBroker-Benutzers `admin`.
- `components/Wizard/WizardAuthSSLTab.tsx:49–106`: bietet Admin-Authentifizierung und Auswahl ohne SSL/selbstsignierte Zertifikate an; das UI bezeichnet ausdrücklich die Kommunikation **mit Admin**.
- `WizardDialog.tsx:410–450`: liest Zertifikatsnamen, schreibt `native.auth`, `native.secure`, `native.certPublic`, `native.certPrivate` der Admininstanz und wechselt die Browseradresse auf HTTPS oder HTTP.
- `WizardDialog.tsx:309–315`: speichert allgemeine Systemeinstellungen im Systemobjekt.
- `components/Wizard/WizardAdaptersTab.tsx:95`: startet ausgewählte Adapterinstallationen.

In diesen geprüften Wizard-Pfaden werden keine Redis-TLS-Listener, Datenbankpasswörter, Betriebssystem-Sudoersregeln oder individuelle Adapteridentitäten eingerichtet. Der Ersteinrichtungsdialog setzt auch keine pauschale sichere Hostpolicy. Die Auslieferungsvorgaben des unveränderten Adminpakets lauten `auth:false`, `secure:false`, `bind:0.0.0.0` (`io-package.json:224–240`). Das sagt nichts darüber aus, ob ein konkreter EOS-Installer diese Vorgaben bereits gezielt ersetzt hat.

## Was der Stable-Controller initialisiert

Controller-Dateizeilen beziehen sich auf Commit `88516d65367580088327214bd9decedca77beea7`.

`packages/cli/src/lib/setup/setupSetup.ts:1548–1577` erzeugt eine noch fehlende `iobroker.json` aus der ausgelieferten Vorlage, setzt Hosts und gegebenenfalls Redis-Typ/Port. Es generiert dort keine Redis-TLS- oder Datenbankzugangsdaten. Eine bereits bestehende Datei wird in diesem Pfad nicht neu angelegt.

`packages/controller/conf/iobroker-dist.json:25–39,72–87` enthält JSONL auf Loopback, Ports 9001/9000, leere `auth_pass`-Werte. Das `multihostService.secure:true` derselben Datei (19–23) ist **kein** Beleg für TLS der Objekte-/Zustandsdatenbanken.

`setupSetup.ts:350–417` liest bzw. erneuert Systemzertifikate. Das bloße Vorhandensein solcher Zertifikate richtet keinen Redis-TLS-Endpunkt ein.

### File-/JSONL-Backend besitzt hier keinen sicheren TLS-Serverschalter

- `packages/db-objects-file/src/lib/objects/objectsInMemServerRedis.js:999–1017`: Secure-Modus ausdrücklich als nicht unterstützt zurückgewiesen; TCP-Server mittels `net.createServer`.
- `packages/db-states-file/src/lib/states/statesInMemServerRedis.js:528–546`: entsprechender Code.
- `packages/db-objects-jsonl/src/lib/objects/objectsInMemServerRedis.js:1000–1006`: Secure-Modus ausdrücklich für JSONL nicht unterstützt.
- `packages/db-states-jsonl/src/lib/states/statesInMemServerRedis.js:528–534`: entsprechender Pfad.

Die Bezeichnung „Redis-Protokoll“ der internen Datenbanken bedeutet nicht, dass sie die TLS-Funktionen eines nativen Redis-Servers besitzen. Ein allein gesetztes `secure:true` ist deshalb keine korrekte Umsetzung.

### Nachgewiesene externe Redis-Clientfähigkeit

`packages/db-objects-redis/src/lib/objects/objectsInRedisClient.ts:228–312` und `packages/db-states-redis/src/lib/states/statesInRedisClient.ts:202–247` reichen das Objekt `settings.connection.options` an ioredis weiter. Die beiden Passwortzuweisungen (305–306 bzw. 241–242) beziehen ihren Wert aus `options.auth_pass` bzw. `connection.pass`, nicht aus einem frei gesetzten `options.password`. Haupt- und PubSub-Clients verwenden dieselben Optionen (Objects 312,414,620; States 247,345,535).

Beide Pakete deklarieren `ioredis:^4.28.2`; der Controller-Quell-Lockfile enthält 4.28.5, während Admins Frontend-Lockfile 4.31.0 auflöst. Eine endgültige Runtime muss deshalb den **tatsächlich installierten** Clientbaum festhalten.

Die offizielle ioredis-Quelle v4.28.5 `lib/connectors/StandaloneConnector.ts`, Blob `ac38a8460933f283bcbbbb8a79bac34f7fe761b0`, kopiert `options.tls` in Node-Verbindungsoptionen und verwendet bei vorhandenem TLS-Objekt `tls.connect` anstelle von `net.createConnection`. Das belegt die technische Optionskette. TLS-Schlüssel-/CA-Optionen sind Node-TLS-Daten; dort werden keine beliebigen Dateipfade automatisch als PEM-Dateien geladen. Beleg: `evidence/controller-first-run/ioredis-connector-evidence.json`.

Das ist eine belastbare Codegrundlage für eine Implementierung, aber noch kein vollständiger Start-, TLS-, PubSub-, Reconnect- oder Anlagenintegrationstest.

## Neue wichtige Stolperstelle: Admin kann TLS-Optionen entfernen

Die Basiseinstellungen des Admins sind ein anderer Dialog als der Wizard. Beim Ändern von Objekten oder Zuständen bauen

- `BaseSettingsObjects.tsx:261–297,315`
- `BaseSettingsStates.tsx:264–300,318`

die Datenbankkonfiguration neu auf. `options` enthält anschließend lediglich `auth_pass`, `retry_max_delay`, `retry_max_count`, `db` und `family`. Vorhandene unbekannte Eigenschaften wie `tls` oder `username` werden nicht übernommen.

`src-admin/src/dialogs/BaseSettingsDialog.tsx:235–246` ersetzt den kompletten Abschnitt durch dieses Objekt; 207–222 führt nur auf oberster Ebene einen Merge aus und sendet `writeBaseSettings`. Damit erhält ein alleiniger Installer-TLS-Patch keine dauerhafte sichere Konfiguration, wenn diese Adminfunktion später verwendet wird.

Die Original-`onChange`-Methoden wurden isoliert mit synthetischen Werten ausgeführt; lediglich TypeScript-Typcasts wurden vor der Ausführung entfernt. Beide Fälle verlieren TLS und Username, behalten jedoch Auth-Passwort. Reproduktionsdateien: `evidence/controller-first-run/reproduce.cjs` und `evidence/controller-first-run/result.json`. Die ursprüngliche Reproduktion erfolgte am 30.09.2026, 18:57:09 UTC; der erneute Lauf aus dem eigenständigen Nachweispaket ist in result.json datiert. Kein Browser-/Gesamtsystemtest. Das ist eine bestätigte Konfigurationsverlust-Reproduktion, keine bestandene Sicherheitsabnahme.

Bei einem korrekt TLS-only konfigurierten Redis sollte dieser Verlust zum Verbindungsfehler führen, nicht zu Klartextbetrieb. Ein Klartext-Fallback oder parallel offener ungeschützter Listener würde die Sicherheitswirkung zusätzlich aufheben.

## Host-Kommandos und Schlüsselbereitstellung

`packages/controller/src/main.ts:2951–2958` liest auf `readBaseSettings` die gesamte Konfigurationsdatei und sendet sie im Ergebnis zurück. `writeBaseSettings` prüft die Existenz einiger Hauptabschnitte und schreibt die ganze Datei (2976–3028). Dort ist keine spezielle TLS-Policyvalidierung oder Redaktion von TLS-Privatkeys zu sehen. Nachrichten gelangen aus der Host-Messagebox in `processMessage` (505–522,1973–1983). Das ist hier eine Architekturbeobachtung; die vollständige Authentifizierungs-/Autorisierungskette des Administrationssockets wurde in dieser Nachprüfung nicht als Gesamtsystem angegriffen.

Folge für die Umsetzung: **mTLS-Privatkeys nicht beiläufig als Klartext-PEM in allgemein auslesbare Basiseinstellungen schreiben.** Für eine starke komponentenspezifische mTLS-Identität braucht es gezielte Schlüsselbereitstellung und Prozessgrenzen. Ein Universalzertifikat aller Adapter trennt diese nicht voneinander.

## Hostrechte werden beim Start nicht automatisch minimiert

`packages/controller/src/main.ts:5631–5646` versucht bei neuer oder noch unbekannter Node-Version auf Linux die Dateicapabilities `cap_net_admin`, `cap_net_bind_service` und `cap_net_raw` zu setzen. Der Pfad wird übersprungen, wenn `IOB_NO_SETCAP` exakt `true` ist.

`packages/common-db/src/lib/common/tools.ts:3621–3677` führt die Capabilitysetzung über `sudo setcap` aus. Der Wizard entfernt weder bestehende sudoers-Zugriffe noch solche Capabilities. Auch nach einer einmaligen Bereinigung könnten sie ohne angepasstes Startprofil wieder gesetzt werden, sofern entsprechende Rechte verbleiben.

Im gehärteten Serviceprofil daher `IOB_NO_SETCAP=true` setzen, breite sudoers-Einträge beseitigen, vorhandene Node-Dateicapabilities prüfen und nur nach dokumentiertem Bedarf dedizierten Diensten gewähren. Dieses Environment allein entfernt keine bereits vorhandenen Capabilities. Netzwerkdiscovery oder spezielle Adapter können begründete Einzelrechte benötigen; deren Funktion ist gesondert zu prüfen.

## Was im Installer sicher umsetzbar ist

Für eine **neue, klar abgegrenzte Installation** kann der Installer anhand der belegten Optionskette ein eigenes natives Redis-TLS-Profil provisionieren. Die kleinste Variante ohne Client-Privatkeys in der ioBroker-Konfigurationsdatei ist:

1. Dedizierter Redis-Dienst, auf Loopback gebunden, ausschließlich TLS; Klartextport deaktiviert. Betrieb als separater unprivilegierter Benutzer.
2. Eindeutige Installations-CA/Serveridentität mit festgelegtem SAN, geschützten Schlüsseln, dokumentierter Lebensdauer und Erneuerung. Öffentliche CA als PEM im Client-TLS-Objekt; Serveridentität und Zertifikatskette zwingend prüfen.
3. Zufällige individuelle Datenbankzugangsdaten pro Installation; serverseitige ACLs passend zum tatsächlich benötigten Befehls-/Schlüssel-/PubSub-Umfang. Clientpasswort über den belegten `auth_pass`-Pfad. Kein gemeinsam eingebautes Passwort.
4. Beide Datenbankclients einschließlich PubSub über TLS; sichere Protokolluntergrenze und kein Klartext-Fallback. Konfiguration atomar schreiben und bestehende Konfigurationen/Migration bewusst behandeln.
5. TLS-Eigenschaften bei Adminänderungen erhalten bzw. unzulässige Änderungen durch einen wirksamen Konfigurationsschutz verwerfen; kein stilles Wiederanlegen einer Klartextverbindung.
6. Positiv-/Negativtests: echter Redis, korrekte CA/Identität, falsche CA/SAN, falsches Passwort, verweigerter Klartext, Start, PubSub, Reconnect, Neustart und anschließend Hardware-/Failsafe-Tests.

Diese Variante liefert **TLS plus passwortbasierte Clientauthentifizierung**, nicht mTLS und nicht individuelle Adapterisolation. Sie lässt sich ohne erfundene Runtime-Optionsnamen entwickeln; der konkrete Lieferstand muss aber tatsächlich getestet werden.

Wenn das Produktziel mTLS **je Adapter** lautet, reichen Installeränderungen allein nicht: geschützte dienstspezifische Clientkeys, unterschiedliche Identitäten, verlässliche Autorisierung und Betriebssystemgrenzen sind nötig. Bei gleicher OS-Identität bzw. auslesbaren gemeinsamen Credentials bleiben die Adapter in einer gemeinsamen Vertrauenszone.

Eine bestehende JSONL-Anlage darf nicht durch einen Installer blind auf eine leere Redis-Datenbank umgestellt werden. Dazu gehören Backup, Migration der Objekte/Zustände/Dateien, erfolgreicher Vergleich und getesteter Rückfall. Für eine bestehende Anlage sind die tatsächlichen Versionen und Konfigurationen Voraussetzung.

## Quellen und Status

Alle Codebefunde lassen sich über diese gepinnten offiziellen Referenzen mit den genannten relativen Pfaden prüfen:

- Controller: https://github.com/ioBroker/ioBroker.js-controller/tree/88516d65367580088327214bd9decedca77beea7
- Admin: https://github.com/ioBroker/ioBroker.admin/tree/e4b39b810f5f12cd6e969e25a39ff6f3188a6608
- Offizielle Stable-Liste: https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist-stable.json
- npm Controller: https://registry.npmjs.org/iobroker.js-controller
- npm Admin: https://registry.npmjs.org/iobroker.admin
- ioredis TLS-Connector v4.28.5: https://github.com/redis/ioredis/blob/v4.28.5/lib/connectors/StandaloneConnector.ts
- Redis TLS: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis ACL: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/

Dieser Bericht und die beigefügten Quellausschnitte dokumentieren die Ausgangsbefunde. Die beiden erfolgreichen Reproduktionsläufe bestätigen den Konfigurationsverlust; sie zählen nicht als bestandene Härtungsnachtests. Das Paket benötigt keinen Upstream-Clone und keine Netzwerkverbindung. Aus dem Repository-Hauptverzeichnis ausführen:

```sh
node docs/security/evidence/controller-first-run/reproduce.cjs
```

Provenienz, Dateihashes und Lizenzen liegen im selben Nachweisordner. Keine IEC-/CRA-Konformität oder Produktionsfreigabe bescheinigt.
