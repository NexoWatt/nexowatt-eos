# PostgreSQL-Anbindung für den EOS-js-controller

Entwicklungsprofil `0.2.0-dev.8`, Backendpakete `0.1.0-dev.2`.
Aktueller Änderungsnachweis: `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`.
Das enthaltene signierte test.2-Archiv bleibt unverändert und enthält diese dev8-Änderungen nicht.
**Keine Installations- oder Anlagenfreigabe.** Der bisherige Installer wird
hier nicht auf ein ungeprüftes PostgreSQL-Profil umgestellt.

## Architektur und Schnittstellen

Der Nutzer hat PostgreSQL am 01.10.2026 als Ziel entschieden. Der tatsächlich
untersuchte js-controller 7.2.2 lädt Objects-/States-Backends über seine
bestehende Erweiterungsschnittstelle. Die neuen Pakete
`@iobroker/db-objects-postgresql` und `@iobroker/db-states-postgresql` exportieren
`Client`; sie starten keinen eigenen Datenbankserver. Der Typ heißt
`postgresql`. Node.js bleibt die Laufzeit. Ein Redis-Server und Lua-Skripte sind
für dieses experimentelle Backend nicht nötig. Das Objects-Paket verwendet
weiterhin überprüfte Teile der vorhandenen ioBroker-Domänenbibliothek; der
Paketname `db-objects-redis` bleibt deshalb im Abhängigkeitsbaum. Es wird nicht
behauptet, dass jede Redis-bezogene Quelldatei aus dem Produkt entfernt ist.

| Schicht | Aufgabe | Grenze |
| --- | --- | --- |
| Objects-Client | Objekt-/Dateioperationen, persönliche Rechte, bekannte Sichten | Clientseitige ioBroker-Rechte ersetzen keine Isolation kompromittierter Adapter. |
| States-Client | Normalisierte States, Sitzungen, Abonnements, Nachrichten und Logs | Nachrichten werden nach Verbindungsausfall nicht als alte Befehle nachgeliefert. |
| Gemeinsamer Store | Parametrisierte SQL-Zugriffe, Transaktionen, TLS und Ereignistransport | Kein beliebiger SQL-Zugang über eine Webschnittstelle; ein kompromittierter Prozess besitzt dennoch seine DB-Rollenrechte. |
| PostgreSQL | Persistenz, Transaktionen, Ablaufzeiten und RLS | Eigener gepflegter Server; konkrete Konfiguration und Zielbetrieb müssen geprüft werden. |

Das Store-Modul verlangt TLS 1.3, CA-/Namensprüfung und Clientzertifikate.
Verbindungsstrings, Passwort-/Umgebungsrückfälle, Unix-Socket-Transport und
abschaltbare Gegenstellenprüfung werden im Laufzeitprofil nicht akzeptiert.
Die lokale SQL-Provisionierung im Testwerkzeug ist eine getrennte
Administrationsgrenze. Die Kryptografie kommt aus Node.js/OpenSSL und
PostgreSQL, nicht aus einem eigenen Algorithmus. TLS schützt keine ruhenden
Datenbankdateien; Datenträgerverschlüsselung und Schlüsselentsperrung bleiben
eigene Produktanforderungen.

## Daten- und Ereignisvertrag

`schema.sql` wird nur als vertrauenswürdige Erstprovisionierung in einer neuen
leeren Testdatenbank ausgeführt. Laufzeitrollen dürfen kein Schema anlegen.
`eos_objects` und `eos_states` besitzen keine Superuser-, Rollenverwaltungs-,
Datenbankerstellungs-, Vererbungs- oder RLS-Umgehungsrechte. RLS beschränkt sie
auf ihre jeweilige Datenklasse. Tabellen gehören einer nicht anmeldbaren
Besitzerrolle. Der Store prüft beim Start Version, Rollen, Eigentümer,
RLS-Aktivierung und relevante Schemarechte; diese Prüfungen ersetzen keine
Abnahme aller wirksamen Policies auf dem tatsächlichen Server.

Schreiboperationen und ihre Ereignisse werden gemeinsam bestätigt. Ein
konservativer Transaktionslock je Datenklasse verhindert widersprüchliche
verschachtelte Änderungen und ACL-Prüfungen. Fehler einer inneren Operation
brechen die äußere Transaktion ab. Eine echte Frist beendet die Verbindung und
verhindert spätere SQL-Nachläufe; PostgreSQL begrenzt zusätzlich Anweisungs-,
Sperr- und Leerlaufzeit.

`LISTEN`/`NOTIFY` überträgt nur eine Ereignisreferenz. Die Nutzlast wird unter
der passenden RLS-Rolle aus einer auf 60 Sekunden begrenzten Ablage gelesen.
Ein serieller, begrenzter Empfang erhält die beobachtete Reihenfolge.
Veraltete Ergebnisse einer getrennten Verbindung werden verworfen. Beim Verbindungsaufbau wird nach LISTEN eine Datenbank-Ereignisgrenze gelesen.
Meldungen bis zu dieser Grenze und bis zur zuletzt zugestellten ID werden verworfen,
auch nach Verdrängung aus dem begrenzten Duplikatcache. Die Reihenfolge setzt die
vom Store durchgesetzte Transaktionsserialisierung je Datenklasse voraus. Es gibt
keinen Rückstandabruf nach Wiederverbindung. Bei Lücken oder Überlast wird die
Verbindung als ausgefallen gemeldet; Regelungen müssen aktuelle Zustände neu
lesen und gerätespezifische Ausfallregeln anwenden. Die 60-Sekunden-Frist ist
keine Garantie über dauerhafte oder exakt einmalige Zustellung.

Abgelaufene Werte sind in SQL-Leseabfragen sofort unsichtbar. Ein per
Sitzungslock gewählter Bereiniger je Datenklasse entfernt sie und erzeugt
Ablaufmeldungen. Der Lock wird mit der Datenbankverbindung freigegeben. Je Store
sind höchstens eine Arbeitsverbindung und eine Benachrichtigungsverbindung
vorgesehen. Ein Prozess mit beiden Backends kann damit vier DB-Verbindungen
benötigen. Anzahl der Adapter, PostgreSQL-Grenzen und Pi-Ressourcen müssen
zusammen abgenommen werden.

Eingaben, Mengen, Empfangswarteschlangen und Sucharbeit sind begrenzt.
Einzelwerte dürfen höchstens 16 MiB, Ereignisse 1 MiB und ein Batch maximal
10.000 Schlüssel umfassen. Sammelantworten werden bereits in SQL sowie bei
mehrfach angeforderten Schlüsseln auf insgesamt 16 MiB begrenzt. Diese Grenzen
können zuvor zulässige sehr große Abfragen ablehnen; betroffene Adapter sind
bei der Aufnahme zu prüfen.

## Absichtlich gesperrte Funktionen und offene Risiken

- Beliebige JavaScript-Map-Sichten werden nicht ausgeführt. Nur ausdrücklich
  unterstützte Definitionen sind zugelassen; keine Ersatzimplementierung mit
  `eval`, `new Function` oder selbst entwickelter Kryptografie.
- Die in der Übernahme geprüften Objects-Rechtefehler werden durch vorgelagerte,
  aktuelle Rechteprüfung und Transaktionsgrenzen abgefangen. Die zugehörigen
  Negativtests sind im Bericht ausgewiesen. Daraus folgt keine pauschale
  Fehlerfreiheit der gesamten ioBroker-Bibliothek.
- **Die zwei DB-Rollen sind keine eigene Identität je Adapter.** Gemeinsame
  Dienstkonten und lesbare DB-Zugänge bleiben eine Vertrauensgrenze.
  Serverseitige Rechte pro Adapter/Namespace, Prozessisolation und Widerruf sind
  vor einer produktiven Freigabe umzusetzen und zu prüfen.
- Weitere bewusste Einschränkungen, etwa Dateiumbenennung und spezielle
  Sichten, stehen in den Paket-READMEs. Ungeprüfte Drittadapter werden nicht
  stillschweigend als kompatibel zugelassen.
- Migration vorhandener EOS-/Redis-/JSONL-Daten, Hostinstaller, sicheres
  Backup/Restore, vollständige UI-/Adapterintegration, echte PostgreSQL-
  Ausfalltests sowie reale Anlagenregelung sind noch nicht abgenommen.

## Prüfung und reproduzierbarer Laborbetrieb

`integration.cjs` erstellt ausschließlich eine neue Labor-Kopie eines exakt
gebundenen Controllers und der drei Backendpakete. Es installiert keine
Pakete auf einer Anlage und lädt nichts aus dem Netz nach. Der Produktinstaller
und seine bisherige Sperre werden dadurch nicht umgangen.

Die Modultests liegen unter `tests/postgresql/`. Response-/Store-Doubles werden
im Ergebnis ausdrücklich von echten SQL- und Servertests getrennt. Das
optionale PGlite-Werkzeug prüft SQL/RLS in einer anderen eingebetteten
PostgreSQL-WASM-Version; es beweist weder TLS noch Mehrprozess- oder Pi-Betrieb.

Das echte Laborwerkzeug `tests/postgresql/fixtures/lab-cluster.cjs` benötigt
PostgreSQL-Binaries und einen **normalen unprivilegierten Linux-Benutzer**.
Es erzeugt eine eigene Datenbank, temporäre Zertifikate und eine freie
Loopback-Portbindung. Es verweigert root und überschreibt keinen bestehenden
Cluster. Diese Arbeitsumgebung bildet nur UID/GID 0 ab; der native Server
konnte hier deshalb nicht gestartet werden. Der Schutz wurde nicht umgangen.

PostgreSQL 17.11 ist der gewählte Debian-13-Prüfstand, `pg` 8.23.1 der
gebundene Node-Treiber. Native Buildherkunft, Testumgebung und konkrete
Nachweise stehen unter `reports/integration/postgresql/`. PostgreSQL 17 wird
laut Upstream bis November 2029 unterstützt. Ein länger laufendes EOS-Produkt
benötigt daher einen getesteten Hauptversionswechsel; kein unveränderter
Datenbankstand wird für die gesamte Produktlebensdauer zugesagt.

## STRIDE und Freigabe

| Bedrohung | Umgesetzte Maßnahme | Offener Nachweis |
| --- | --- | --- |
| Gegenstelle vortäuschen | TLS 1.3, CA/Name, Clientzertifikat, kein unsicherer Rückfall | Echte Negativtests gegen Server; Zertifikatsrotation/Widerruf |
| Daten manipulieren | Parametrisierte SQL-Werte, Transaktionen, RLS-Datenklassen | Echte konkurrierende Änderungen, Policies und per-Adapter-Rechte |
| Handlungen abstreiten | Begrenzte Diagnosecodes ohne sensible Werte | Verbindliche Auditkette und Aufbewahrung im Produkt |
| Informationen offenlegen | TLS, RLS, keine Nutzlast im NOTIFY-Kanal | Ruhende Daten/Backups, Schlüsselgrenzen, kompromittierter Adapter |
| Verfügbarkeit angreifen | Größen-, Arbeits-, Queue- und Zeitgrenzen | Pi-Last, voller Datenträger, Neustart/Stromverlust, Wiederherstellung |
| Rechte ausweiten | Keine Runtime-DDL-/Superuserrechte; keine freien Map-Skripte | Getrennte OS-Identitäten und serverseitige Adapterautorisierung |

Es handelt sich um Entwicklung mit Nachweisen, nicht um einen Penetrationstest,
IEC-Zertifizierung oder CRA-Konformitätserklärung. Die Installationsfreigabe
bleibt gesperrt, bis die fehlenden Sicherheits- und Funktionsnachweise vorliegen.
