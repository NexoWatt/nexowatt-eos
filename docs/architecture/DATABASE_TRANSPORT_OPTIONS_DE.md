# Datenbank, AES-256 und Adapterkommunikation

Stand: 01.10.2026 · historische Alternativenprüfung aus `0.2.0-dev.5`.

**Fortschreibung:** Der Nutzer hat anschließend PostgreSQL gewählt. Die
Implementierung und verbleibenden Grenzen in `0.2.0-dev.6` beschreibt
[die PostgreSQL-Architektur](../../runtime/postgresql/README.md). Die folgenden
Abschnitte bewahren die ursprüngliche Entscheidungsvorbereitung; es ist
weiterhin keine Bestandsmigration ausgeführt.

## Aktuelle Entscheidung und Grenzen

Der Nutzer hat die frühere Festlegung auf Redis am 01.10.2026 aufgehoben und
eine geeignete Alternative verlangt. Anschließend hat er ausdrücklich SQLite
mit AES-256 zur Prüfung vorgeschlagen. Die bestehende Installationssperre
`EOS-HOST-REDIS-20261001` bleibt offen. Keine neue Datenbank, kein neuer
Transportdienst und keine neue Verschlüsselungsbibliothek wurde installiert.
Der automatische OS-Updatepfad dieses Quellstands bleibt davon unabhängig.

AES-256 bezeichnet einen Verschlüsselungsalgorithmus mit Schlüssellänge.
Es ersetzt weder ein Kommunikationsprotokoll noch Rechteprüfung, sichere
Schlüsselaufbewahrung oder die Korrektur von Speicherfehlern. Die gemeldeten
Redis-/Valkey-Implementierungsfehler belegen keinen Bruch von TLS 1.3.

## Die drei unterschiedlichen Aufgaben

| Aufgabe | Geeigneter Ansatz | Grenze |
| --- | --- | --- |
| Daten auf SD-Karte/SSD schützen | SQLite mit einer geprüften SQLCipher-Version; AES-256 und Integritätsprüfung | Schützt keine Netzwerkverbindung und keinen bereits berechtigten laufenden Prozess. |
| Adapterverbindungen schützen | TLS 1.3 mit Zertifikatsprüfung; AES-256-GCM ist eine standardisierte Option | Gegenseitige Identitäten und Rechte müssen zusätzlich eingerichtet und geprüft werden. |
| Objects, States und Nachrichten bereitstellen | Mit js-controller kompatibler Daten- und Nachrichtendienst | SQLite allein bietet diese ioBroker-Schnittstellen nicht. |

Die normale SQLite-Bibliothek enthält keine transparente Datenbankverschlüsselung.
SQLCipher ist ein eigener, mit SQLite integrierter Build. Laut Hersteller nutzt
er AES-256-CBC und HMAC-SHA512 für die Datenbankseiten; die Kombination ist nicht
mit ungeschütztem CBC gleichzusetzen. Die offizielle SQLite Encryption Extension
(SEE) ist eine weitere, gesondert lizenzierte Möglichkeit. Für EOS wurde noch
keine konkrete SQLCipher-/SEE-Version, Node-Anbindung oder ARM64-Datei geprüft
oder freigegeben. Die Bezeichnung AES-256 allein genügt nicht zur Auswahl.

SQLCipher schützt auch Datenbankseiten im WAL/Journal; temporäre Dateien,
Klartext-Exporte, Protokolle, Backups und Speicherabbilder müssen zusätzlich
betrachtet werden. Ein Schlüssel neben der Datenbank auf derselben entwendeten
SD-Karte schützt nicht hinreichend gegen diesen Diebstahlfall. Automatischer
Neustart, lokale Autonomie und sichere Schlüsselentsperrung sind gemeinsam zu
entwerfen. Ein TPM oder Secure Element wird für den vorhandenen Pi nicht als
vorhanden vorausgesetzt. Wiederherstellung und Rotation brauchen eigene Tests.

## Kompatibilität des aktuellen Controllers

Das integrierte Profil verwendet js-controller 7.2.2 und Redis-basierte
Objects-/States-Clients. Zusätzlich zur Speicherung hängen daran PubSub,
Subscriptions, Ablaufzeiten, Objektsichten und Lua-/Skriptoperationen.
`runtime/bootstrap/initialize.cjs` initialisiert explizit die Redis-Clients.
Eine Änderung des Datenbanknamens oder des Dateisuffixes implementiert keinen
SQLite-Backendvertrag. Auch ein SQL-Adapter für historische Messwerte ersetzt
die Objects-/States-Datenbank des Controllers nicht.

Der untersuchte JSONL-Backendcode ist ebenfalls kein fertig verschlüsselter
Ersatz: Er verwirft `settings.secure` und eröffnet einen TCP-Server. Die
statische Prüfung fand zudem dynamische Auswertung von Objektsichten. Ein
TLS-Wrapper allein beweist weder sichere Autorisierung noch ungefährliche
Skriptverarbeitung. Hier wurde kein Angriff ausgeführt; eine ausnutzbare Lücke
im laufenden Nutzerbestand wird daraus nicht behauptet.

Die vom Nutzer gezeigte Datei `/var/lib/nexowatt-eos/eos.sqlite` beweist weder
ihre Verschlüsselung noch ihre Funktion als Controller-Backend. Inhalt, Header
und Schlüssel wurden nicht gelesen. Das bestehende Pi-System hat einen anderen
Dienst-/Installationspfad als unser integriertes Testprofil.

## Prüfbarer Entwurf für vollständigen Redis-Verzicht

Eine mögliche Architektur ist ein eigener, eingeschränkt laufender EOS-
Datenservice: Er besitzt allein die lokale SQLCipher-Datei und ihren Schlüssel.
Adapter greifen über authentifizierte, autorisierte TLS-Verbindungen auf
begrenzte Fachoperationen zu. Eine kompatible Controller-Anbindung übernimmt
Objects, States und Ereignisse. Es gibt keinen freien SQL-Zugang für Adapter.

Für echte Identitäten pro Adapter sind getrennte Prozesse mit wirksamer
Schlüssel- und Betriebssystemisolation erforderlich. Verschiedene Zertifikate
im derzeit gemeinsamen Dienstkonto reichen dafür nicht aus. Verbindungsabbruch,
erneute Anmeldung, Ereignisverlust, Reihenfolge, Rückstau und Wiederabgleich
werden Teil des Schnittstellenvertrags. SQLite erlaubt nur einen gleichzeitigen
Schreiber je Datenbankdatei; das muss mit der tatsächlichen EOS-Last gemessen
werden. UI und Gerätefunktionen sollen erhalten bleiben, sind aber nach dem
Umbau erneut abzunehmen. Dies ist ein Entwurf, keine bereits gebaute Komponente.

| STRIDE-Risiko | Geforderte Maßnahme | Noch erforderlicher Nachweis |
| --- | --- | --- |
| Identität vortäuschen / Rechte ausweiten | Pro Adapter isolierte Identität, minimale Objekt-/State-Rechte | Fremdes Zertifikat, fremder Namensraum, Widerruf und kompromittierter Adapter |
| Daten manipulieren | Integritätsprüfung, parametrisierte Abfragen, validierte Fachoperationen | Beschädigte Datei, manipuliertes Ereignis, ungültige Eingabe |
| Handlungen abstreiten | Begrenzte Protokolle mit Identität und Zeitbezug, ohne Schlüssel | Manipulationsgrenzen, Speicherlimit und Zugriff auf Protokolle |
| Daten offenlegen | TLS, geschützte Schlüssel, verschlüsselte Backups | Falscher Schlüssel, SD-Diebstahlszenario, WAL/Temp/Export-Prüfung |
| Dienst überlasten | Begrenzte Nachrichten, Warteschlangen, Laufzeit- und Ressourcenlimits | Last, langsame Leser, voller Datenträger, Verbindungsflut |
| Unsichere Anlagenzustände | Frischeprüfung und gerätespezifischer Wiederanlauf | Stromverlust, Kommunikationsausfall, Restore und reale Geräte |

## PostgreSQL als weiterer Kandidat

Der Nutzer hat PostgreSQL als TLS-1.3-fähige Alternative vorgeschlagen.
Die offizielle Dokumentation bestätigt die Fähigkeit mit geeignetem Build und
OpenSSL. Die Aussage, `pg_hba.conf` begrenze die TLS-Version, ist jedoch zu
korrigieren: `ssl_min_protocol_version` legt die Untergrenze in
`postgresql.conf` fest; `hostssl` in `pg_hba.conf` erlaubt eine Regel nur für
verschlüsselte TCP-Verbindungen. Zusätzlich sind TLS zu aktivieren,
Zertifikatsprüfung auf beiden Seiten, konkrete Rollen und die gesamte
Regelreihenfolge zu prüfen. Andere passende `host`-Regeln dürfen keinen
Klartextzugang offenlassen. Unix-Sockets sind eine getrennte lokale Grenze.

PostgreSQL bietet Rollen, Transaktionen und TLS, ist aber kein austauschbarer
Redis-Protokollserver. `LISTEN`/`NOTIFY` ersetzt die Controller-Verträge nicht:
Benachrichtigungen haben eigene Transaktions-/Warteschlangenregeln und eine
begrenzte Nutzlast. Persistierte Ereignisse mit Wiederabgleich und getrennten
Berechtigungen wären zu entwerfen. TLS verschlüsselt keine PostgreSQL-Dateien
auf dem Datenträger; Dateisystem-/Datenträgerverschlüsselung oder geeigneter
Schutz ausgewählter Daten sind eine eigene Aufgabe.

Die Einstufung lautet deshalb **geeigneter Prüfkandidat für einen neu
entwickelten EOS-Datendienst**, nicht bereits nachgewiesen geeigneter
Ersatz unseres Controllers. Version, Debian-13-ARM64-Paket, Advisories,
Ressourcenbedarf mit allen Adaptern, Migration und Backup/Restore wurden
für PostgreSQL in diesem Arbeitsschritt nicht geprüft. Kein SQL-Backend
wurde eingebaut und keine Leistung auf dem 8-GB-Pi gemessen.

## Vergleich und nächste Entscheidung

Valkey 8.1.10 und 9.1.2 sind alternative Prüfkandidaten mit ähnlichem
Protokoll und weiterhin gemeinsamem Redis-Codeerbe. Die Hersteller-Releases
enthalten Sicherheitskorrekturen; das vorhandene Debian-13-Valkey-Paket ist
deshalb nicht automatisch geeignet. Herkunft der konkreten ARM64-Artefakte,
offene Advisories, Controller-Kompatibilität und Wiederherstellung bleiben
ungeprüft. Redis-8-Daten dürfen nicht blind als Valkey-Dateien übernommen werden.

SQLite/SQLCipher ist ein sinnvoller Kandidat für lokale EOS-Daten. Als Ersatz
des gesamten Controller-Backends erfordert es erheblich mehr Entwicklung und
Regressionstests als ein kompatibler, korrigierter Server. Daher wird es hier
nicht als kurzfristig einsatzbereiter oder grundsätzlich schwachstellenfreier
Ersatz freigegeben. Eine Entscheidung muss Wartung, Sicherheitsrisiken und
Funktionsnachweise gemeinsam berücksichtigen. Keine der Varianten begründet
für sich CRA-/IEC-Konformität. Ein neuer tatsächlicher Build benötigt eine
eigene SBOM einschließlich nativer Bibliotheken und Kryptografieprovider.

## Quellen und Prüfumfang

Herstellerdokumentation und statische Quellprüfung; keine SQLite-/SQLCipher-
Integration, keine Migration und kein Hardwaretest ausgeführt. Die bestehenden
OS-Update-Tests prüfen diese Architekturvarianten nicht.

- [SQLite: Einsatzbereiche und Parallelität](https://www.sqlite.org/whentouse.html)
- [SQLite: Sicherheitsgrenzen und Härtung](https://www.sqlite.org/security.html)
- [SQLCipher: Verschlüsselung, Integrität, WAL und temporäre Dateien](https://www.zetetic.net/sqlcipher/design/)
- [SQLite Encryption Extension und Lizenz](https://www.sqlite.org/see/doc/trunk/www/readme.wiki)
- [TLS 1.3 und AES-256-GCM, RFC 8446](https://www.rfc-editor.org/rfc/rfc8446)
- [PostgreSQL: TLS-Konfiguration](https://www.postgresql.org/docs/18/runtime-config-connection.html)
- [PostgreSQL: Verbindungsregeln](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL: Speicher- und Transportverschlüsselung](https://www.postgresql.org/docs/18/encryption-options.html)
- [PostgreSQL: NOTIFY-Vertrag](https://www.postgresql.org/docs/18/sql-notify.html)
- [Valkey 8.1.10](https://github.com/valkey-io/valkey/releases/tag/8.1.10)
- [Valkey 9.1.2](https://github.com/valkey-io/valkey/releases/tag/9.1.2)
- [Valkey Migrationsgrenzen](https://valkey.io/topics/migration/)
- [Debian: Valkey TLS-Befund](https://security-tracker.debian.org/tracker/CVE-2026-56684)
