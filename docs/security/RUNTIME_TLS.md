# EOS Redis-TLS: statische Profilprüfung und Migrationsfreigabe

Stand 30.09.2026. Dieses Werkzeug prüft eine vorhandene Konfigurationsdatei nur
lesend. Es richtet keine Verschlüsselung ein, startet keinen Dienst und migriert
keine Daten. Ein erfolgreicher Lauf belegt ausschließlich das unten definierte
Konfigurationsprofil. Die tatsächliche TLS-Verbindung bleibt separat zu prüfen.

## Aufruf und Ergebnis

```sh
node security/verify-runtime-tls.cjs
node security/verify-runtime-tls.cjs /anderer/installationspfad/iobroker-data/iobroker.json
node --test tests/security/runtime-tls.test.cjs
```

Ohne Pfad wird `/opt/iobroker/iobroker-data/iobroker.json` gelesen. Für macOS,
FreeBSD oder abweichende Installationen ist der tatsächliche Pfad ausdrücklich
anzugeben. Keine Ausführung als root erforderlich, sofern der ausführende Benutzer
die Konfiguration bereits lesen darf. Die Tests benötigen zusätzlich OpenSSL;
das Prüfwerkzeug selbst benötigt nur Node.js.

| Exitcode | Bedeutung |
|---|---|
| 0 | Statisches Profil passt; Netzwerkprüfung und Produktfreigabe bleiben offen. |
| 1 | Unzureichende oder nicht unterstützte Konfiguration. |
| 2 | Datei nicht sicher lesbar, zu groß, kein reguläres File oder ungültiges JSON. |
| 64 | Ungültiger Aufruf. |

Die JSON-Ausgabe enthält feste Diagnosecodes und Abschnittsnamen; keine
Passwörter, Zertifikate, Dateiinhalte oder eingegebenen Pfade. Parser- und
Betriebssystemfehlermeldungen werden bewusst nicht ausgegeben. Die Dateigröße ist
auf 2 MiB begrenzt. Finale Symlinks werden abgewiesen, soweit `O_NOFOLLOW` verfügbar
ist; dies ist kein Schutz gegen alle Änderungen von Verzeichnissen durch lokale
Administratoren. Das Werkzeug verändert die gelesene Datei nicht.

## Verbindliches Profil `eos-redis-tls13-config-v1`

Beide Abschnitte `objects` und `states` müssen vorhanden sein. Verlangt werden:

- `type` exakt `redis`; einzelner Host als DNS-Name oder IP; TCP-Port 1–65535.
  File-/JSONL-Backend, Sentinel-Arrays, Unix-Sockets und URLs sind nicht Teil
  dieses engen Profils. Backendtyp allein sagt nichts über den laufenden Server.
- `options.tls` als Objekt mit `minVersion: "TLSv1.3"`, optional identischem
  `maxVersion`, und ausdrücklich `rejectUnauthorized: true`.
- Ein ausdrücklicher DNS-Name in `options.tls.servername`. Die tatsächliche
  Übereinstimmung mit dem Serverzertifikat muss der TLS-Integrationstest prüfen.
- `options.tls.ca` als PEM-Text mit 1–16 parsebaren CA-Zertifikaten, höchstens
  128 KiB. Jedes Zertifikat muss als CA gekennzeichnet und zur lokalen Prüfzeit
  gültig sein. Dies beweist weder die vertrauenswürdige Herkunft des Trust-Ankers
  noch eine gültige Serverkette. Ein Dateipfad ist kein PEM-Inhalt.
- `options.auth_pass` als nicht leere Zeichenfolge mit 32–1024 Zeichen ohne
  Whitespace/Steuerzeichen. Optionaler ACL-Username: 1–64 Zeichen aus Buchstaben,
  Ziffern, Punkt, Unterstrich und Bindestrich. Die Erzeugung muss mit sicherem
  Zufall pro Installation erfolgen. Eine Längenprüfung beweist weder Entropie
  noch Einzigartigkeit oder serverseitig eingerichtete ACLs.
- Kein Client-Key, PFX, Clientzertifikat, Kennwort zur Entschlüsselung eines Keys
  oder abweichende Transportoption im TLS-Objekt. Ein gemeinsames mTLS-Key-Paar
  aller Adapter wäre ohnehin keine individuelle Adapteridentität.
- Keine unbekannten Client-/TLS-Optionen, kein altes `pass`/`password` als
  Authentifizierungsquelle und kein irreführendes Datenbank-`secure:true`.
  Unbekannte Datenbankoptionen werden ebenfalls abgewiesen; Kommentare mit
  `//`-Präfix sowie die üblichen Backup-/JSONL-/Timeout-Metadaten werden erhalten.
  TLS 1.2 ist bewusst außerhalb dieses Profils; ein abweichendes Profil benötigt
  eine begründete eigene Prüfung statt einer stillen Aufweichung.
- Keine erweiterte DB-Protokollierung. Bekannte zusätzliche Clientoptionen
  werden auf passende Datentypen geprüft. Warteschlangen-/Retry-Werte sind damit
  noch nicht für eine konkrete Energieanlage als betrieblich sicher bewertet.

Erlaubte zusätzliche Clientoptionen: `db`, `family`, `retry_max_delay`,
`retry_max_count`, `enableOfflineQueue`, `maxRetriesPerRequest`, `connectTimeout`
und `commandTimeout`. Für die vier Zeit-/Zählwerte außer `db` sind positive sichere
Ganzzahlen erforderlich; `db` und `maxRetriesPerRequest` dürfen null im numerischen
Sinn (`0`) sein, nicht als JSON-Wert `null`. Ein unendlicher Retry-Modus mittels
`maxRetriesPerRequest: null` wird nicht akzeptiert.

Es erfolgt kein Portscan, kein Redis-AUTH, kein Zertifikatshandshake und kein
Lesen von ioBroker-States. Auch ein erfolgreicher statischer Lauf belegt keinen
geschlossenen Klartextlistener, keine Firewallregel und keine Adapterisolation.
`releaseGate` bleibt deshalb ausdrücklich offen. Das Werkzeug ist ein manueller
bzw. in CI aufzurufender Prüfschritt, kein automatisch aktiver Dienstschutz.

## Nachgewiesene Stable-Semantik und Admin-Falle

Prüfgrundlage ist js-controller 7.2.2, Commit
`88516d65367580088327214bd9decedca77beea7`. Die Redis-Clients reichen
`connection.options` an ioredis weiter. `options.password` wird dabei aus
`options.auth_pass` bzw. `connection.pass` überschrieben. Das Profil akzeptiert
deshalb ausschließlich den ersten Pfad. ioredis 4.28.5 kopiert `options.tls` in
Node-TLS-Verbindungsoptionen. Es liest dabei keine PEM-Dateipfade automatisch ein.

Die internen File-/JSONL-Datenbankserver dieses Stands unterstützen den
TLS-Servermodus ausdrücklich nicht. HTTPS im Admin-Wizard verschlüsselt das
Webinterface; es stellt keine Datenbank-TLS-Verbindung her.

Admin 8.0.14, Commit `e4b39b810f5f12cd6e969e25a39ff6f3188a6608`, baut in den
Objekte-/Zustands-Basiseinstellungen `options` neu auf. Dabei können `tls` und
`username` entfernt werden. Dieser Verlust wurde isoliert anhand der originalen
`onChange`-Methoden reproduziert. Die TLS-Profilprüfung erkennt das fehlende
TLS-Objekt danach. Sie verhindert die Änderung jedoch nicht.

**Freigabesperre:** Vor Serienfreigabe muss der ausgelieferte Admin-Fork die
TLS-Eigenschaften verlässlich erhalten und unzulässige Änderungen serverseitig
verwerfen, oder eine gleichwertig geprüfte Konfigurationsverwaltung diese Aufgabe
übernehmen. Ein Hinweis, den Dialog nicht zu benutzen, ist keine dauerhafte
Durchsetzung. Ein echter TLS-only-Server muss die nach einem Konfigurationsverlust
versuchte Klartextverbindung ablehnen; niemals einen Klartext-Fallback hinzufügen.

Zusätzlich liefert `readBaseSettings` im Controller die gesamte Konfigurationsdatei
zurück. Client-Privatkeys als Inline-PEM würden dadurch mit der Konfiguration
verteilt. Für individuelles mTLS sind eine gesonderte sichere Schlüsselzuführung,
Prozessgrenzen und Berechtigungen nötig. Die hier geprüfte Basis ist TLS mit
Serverprüfung und passwortbasierter Clientauthentifizierung, kein mTLS-Nachweis.

## Migrationsplan und erforderliche Abnahme

1. Installierten Controller, alle DB-Client-/Adapter-Core-Versionen, Redis-Paket,
   Node.js, Admin-Fork und aktuelle Konfiguration erfassen. Die Quellreferenz ist
   kein Beleg für die tatsächlich installierten Versionen. Geheimnisse nicht in
   Bericht, Git oder Terminalausgabe übernehmen.
2. Wiederherstellbare Sicherung von Objekten, Zuständen, Dateien und Konfiguration
   erstellen; Wiederherstellung auf einem getrennten Testsystem nachweisen.
   Keine vorhandene JSONL-Anlage blind auf ein leeres Redis umschalten.
3. Dedizierten unprivilegierten Redis-Dienst mit nativer TLS-Unterstützung
   bereitstellen. Nur benötigte Interfaces binden, Klartextport deaktivieren,
   eigene Serveridentität und Trust-Anker provisionieren. Private CA-/Serverkeys
   außerhalb der ioBroker-Basiseinstellungen schützen. Ablauf, Erneuerung und
   Wiederherstellung dokumentieren.
4. Individuelle Installationszugangsdaten und passende Redis-ACLs einrichten;
   benötigte Befehle, Schlüssel und PubSub-Kanäle anhand echter Clients ermitteln.
   Kein ungeprüftes `+@all` als endgültige Minimalberechtigung ausgeben.
5. Datenbankmigration bei kontrolliertem Stillstand im Testsystem ausführen;
   Bestände und fachlich relevante Werte vergleichen. Konfiguration atomar
   bereitstellen, TLS-Eigenschaften im Admin erhalten, dieses statische Profil
   vor und nach Adminänderung, Neustart sowie Update prüfen.
6. Echte Integrationsprüfung: korrekte Verbindung; falsche CA, falscher SAN,
   abgelaufenes Serverzertifikat, fehlendes/falsches Passwort und Klartextzugriff
   müssen scheitern. Haupt-/PubSub-/Reconnect-Verbindungen prüfen; alle offenen
   Listener und IPv4/IPv6-Regeln erfassen. Kein Geheimnis im Mitschnittbericht.
7. Last, Warteschlangenalter, Wiederholungen, Zeitfehler, Ausfall und Wiederanlauf
   auf dem Zielgerät prüfen. Gerätebezogene Ersatzstrategien müssen Netz- und
   Gerätegrenzen erhalten. Keine pauschale Abschaltung wichtiger Schutzfunktionen.
8. Rückfall auf den vollständigen vorherigen Stand mit Daten und Konfiguration
   testen. Einen gegebenenfalls unverschlüsselten Altstand nicht als Erfüllung
   des neuen Verschlüsselungsprofils freigeben. Erst nach diesen Nachweisen die
   tatsächliche Releaseentscheidung dokumentieren.

## Quellen und Prüfstatus

- [js-controller 7.2.2](https://github.com/ioBroker/ioBroker.js-controller/tree/88516d65367580088327214bd9decedca77beea7):
  `packages/db-objects-redis/src/lib/objects/objectsInRedisClient.ts:228–312`,
  `packages/db-states-redis/src/lib/states/statesInRedisClient.ts:202–247`,
  `packages/controller/src/main.ts:2951–3028`.
- [Admin 8.0.14](https://github.com/ioBroker/ioBroker.admin/tree/e4b39b810f5f12cd6e969e25a39ff6f3188a6608):
  `BaseSettingsObjects.tsx:261–315`, `BaseSettingsStates.tsx:264–318`,
  `BaseSettingsDialog.tsx:207–246` unter `src-admin/src/`.
- [ioredis 4.28.5 TLS-Connector](https://github.com/redis/ioredis/blob/v4.28.5/lib/connectors/StandaloneConnector.ts).
- [Redis TLS](https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/).

Die automatisierten Tests prüfen valide/ungültige Profile, Verschlechterungen,
falsche Typen, den Admin-Konfigurationsverlust, begrenztes Dateilesen,
Exitcodes und die Vermeidung von Geheimnissen in der Ausgabe. Sie verwenden
synthetische Konfigurationen und temporäre Testzertifikate. Sie ersetzen keinen
Redis-, Hardware-, Penetrations- oder Konformitätstest. Keine IEC-/CRA-Konformität
und keine Produktionsfreigabe wird aus einem Profil-Match abgeleitet.
