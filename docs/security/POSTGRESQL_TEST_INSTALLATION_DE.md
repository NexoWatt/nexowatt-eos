# Sicherheits-/Prüfvermerk PostgreSQL-Testinstaller

02.10.2026 · Quellen 0.2.0-dev.7 · Laufzeit 0.2.0-test.2. Dieser Vermerk ergänzt die dev6-Nachweise, ersetzt sie nicht rückwirkend. Maschinenlesbare aktuelle Ergebnisse: `reports/integration/postgresql-install/verification-summary.json`. Vollständiger Quellhash: äußeres Liefermanifest; Runtime: Ed25519-signierte Manifest-Dateiliste.

## Änderung und Vertrauensgrenzen

Der js-controller lädt zwei feste private Backendpakete über seine vorhandene Datenbank-Erweiterungsschnittstelle. Keine eigene Kryptografie und keine eigene JavaScript-Runtime. Der Installer wählt die Datenbank ausschließlich anhand des bereits signierten, einheitlichen Katalogprofils. Gemischte Profile und beliebige Modulnamen werden abgelehnt. Der historische Redis-Installationsstopp `EOS-HOST-REDIS-20261001` bleibt unverändert aktiv.

PostgreSQL läuft unter `eos-postgres`, Controller und freigegebene Testadapter unter `eos-runtime`; beide ohne sudo/Docker-Gruppen. PostgreSQL bindet nur Loopback:15432. Alle Anwendungszugriffe erfordern TLS 1.3, Serverprüfung und getrennte Objects-/States-Clientzertifikate. TLS-Versionsgrenzen werden in `postgresql.conf` gesetzt; `pg_hba.conf` erzwingt SSL und Zertifikatsauthentifizierung, nicht die TLS-Version. Lokale administrative Unix-Socket-Zugriffe verwenden eine abgeschottete 0700-Socketablage und Peer-Mapping; das ist kein Netzwerk-/Adapter-Bypass.

Der Dienst-OS-Benutzer `eos-postgres` und der Bootstrap-DB-Superuser bleiben eine privilegierte Datenbank-Vertrauensgrenze. Runtime-Rollen haben keine DDL-/Superuser-/Rollenerteilungsrechte, kein TEMP/CREATE auf der Datenbank und RLS-Domänengrenzen. Keine Behauptung einer Identität je Adapter: im aktuellen Profil teilen die Adapter OS-Konto und Klassencredentials. TLS schützt den Transport, nicht gegen bösartigen Code innerhalb dieses gemeinsamen Kontos.

## STRIDE für die neue Installationskomponente

| Bedrohung | Gegenmaßnahme | Nachweis / offene Grenze |
|---|---|---|
| Spoofing: DB-/Client-Imitation | Geräte-CA, SAN-Prüfung, TLS 1.3, Rollen-CN | Reale Zertifikatserzeugung geprüft; native Handshakes erst auf Pi |
| Tampering: Paket-/Konfigurationsaustausch | Ed25519-Dateiliste, root-eigene unveränderliche Runtime, O_EXCL/NoFollow, geschützte Config | Signatur-/Hash-/Negativtests; Root selbst ist Vertrauensgrenze |
| Repudiation: unbelegte Freigabe | Versionsgebundene Rohlogs, Ziel-Prüfbericht, Root-Installstatus | Kein manipulationssicheres externes Auditarchiv behauptet |
| Information disclosure: Schlüssel/SQL-Inhalte | 0600/0640, getrennte Konten, keine Rohfehler/Passwortargumente, SQL-Logging begrenzt | Gemeinsame Adaptercredentials; keine Datenverschlüsselung im Ruhezustand |
| Denial of service: langsame Abfragen/Fehlerstart | SQL-/Verbindungs-/Startzeitlimits, Speicher-/Tasklimits, begrenzte Ereignisverarbeitung | Last, Stromausfall und automatischer Wiederanlauf offen |
| Elevation of privilege: Adapter zu Hostroot | Keine sudo-Regel/Root-API, statische Backendnamen, keine npm-/Shell-Nachinstallation | Per-Adapter-Prozess-/DB-Isolation fehlt; Serviceadministratoren vertrauenswürdig |

## Tatsächliche Prüfarten

Automatisierte Regressionen, Kommando-/Clientdoubles, tatsächliche OpenSSL-Zertifikatserzeugung und Offlineprüfung des signierten ARM64-Dateibaums sind getrennt ausgewiesen. Der Driver-Passwortfallbacktest nutzt den echten pg-Client, aber keinen nativen Server. Ergänzende SQL/RLS-Prüfungen unter PGlite/WASM sind kein PostgreSQL-17-, TLS-, Systemd- oder Hardwaretest.

Der Runtime-npm-Baum wird nicht online an eine Registry/Auditstelle gesendet. Ein früher verweigerter vollständiger Online-Install-/Auditlauf wurde nicht wiederholt. Öffentliche, einzeln festgelegte Test-/Driver-Abhängigkeiten wurden gesondert bezogen; der private App-Build bleibt offline. Die 482 beobachteten npm-Paketinstallationen und drei bekannten eingebetteten Paketkopien sind in der Laufzeit-SBOM gebunden. Das ist keine vollständige SBOM von Linux, Firmware oder kompilierten Frontendtransitiven. Die OS-SBOM wird erst aus dem tatsächlich installierten Zielsystem erzeugt.

## Offene Befunde und Freigabegrenzen

| Kennung | Status / nächster Nachweis |
|---|---|
| EOS-PG-INTEGRATION-20261001 | Offen: realer PG17-/Controller-/Admin-/UI-Gesamtlauf auf ARM64; native Tests hier durch Root-only-Umgebung blockiert |
| EOS-PG-ISOLATION-20261002 | Offen: Rollen/Namespaces und OS-Isolation je Adapter; gemeinsame Klassenrollen genügen dafür nicht |
| EOS-PG-LIFECYCLE-20261002 | Offen: PG- und Web-Zertifikatsrotation, Wechsel/Abbruch/Rückfall, Widerruf; test.2 höchstens 30 Tage testen |
| EOS-PG-RECOVERY-20261002 | Offen: Backup/Restore, SQL-/JSON-Migration, Stromausfall, DB-Ausfall und kontrollierte Wiederaufnahme |
| EOS-PG-ADAPTERS-20261002 | Offen: Devices/EEBUS/OCPP21/Backitup sind Quellen, nicht aktivierte/testabgenommene Runtime-Komponenten |
| EOS-OS-UPDATES-RUNTIME-PIN-20261001 | Offen: echte APT-Transaktion, Serviceaktivierung und Pflege gepinnter Node-/npm-Komponenten; UI meldet Lücken, keine pauschale Grünanzeige |
| EOS-PG-ASSESSMENT-20261002 | Offen: aktueller vollständiger Abhängigkeits-/CVE-Abgleich, unabhängiger Pentest und formale Produktfreigabe |

Keine bekannten Fehler durch Entfernen eines Gates „behoben“. Ein natives Testergebnis darf erst nach tatsächlicher Ausführung auf `passed` gesetzt werden. PostgreSQL ist nicht schwachstellenfrei; Patchpflege und produktbezogene Risikobewertung bleiben erforderlich.

## CRA/IEC-Nachweise

Dieses Arbeitspaket unterstützt nachvollziehbare Sicherheitsanforderungen, sichere Voreinstellungen, Minimierung von Rechten, reproduzierbare Artefakte und SBOM-/Schwachstellenprozesse. Es ist **keine** Konformitätserklärung, Zertifizierung, SL-Einstufung oder unabhängige Prüfung. IEC 62443-4-1/-4-2/-3-3 bleiben getrennt nach tatsächlichem Produktscope und Einsatz zu bewerten. Physische Schutz- und Regelungsfunktionen werden nicht durch Datenbank-TLS nachgewiesen.

Herstellerpflichten, Produktklassifizierung, vollständige technische Unterlagen, Support-/Updatezeitraum, Schwachstellenbehandlung/Meldungen, anwendbare Normen und Konformitätsverfahren sind vor Marktfreigabe gesondert abzuschließen. Keine neuen gesetzlichen Frist-/Normfassungsbehauptungen werden mit dieser Codeänderung getroffen.

Primärquellen für die technischen Einstellungen (02.10.2026):

- <https://www.postgresql.org/docs/17/auth-cert.html>
- <https://www.postgresql.org/docs/17/runtime-config-connection.html>
- <https://www.postgresql.org/support/security/>
- <https://manpages.debian.org/trixie/postgresql-common/pg_createcluster.1.en.html>
