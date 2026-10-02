# EOS PostgreSQL – Entwicklungs- und Sicherheitsprüfung

Stand: 01.10.2026. Produktstand `0.2.0-dev.6`, Backendpakete `0.1.0-dev.1`.
**Ergebnis: Quellimplementierung mit Teilnachweisen; keine Anlagenfreigabe.**

## Entscheidung und tatsächliche Änderung

PostgreSQL ist gemäß Nutzerentscheidung das Ziel für den zentralen Objects-/
States-Datendienst. Der untersuchte js-controller 7.2.2 besitzt bereits die
erforderliche Backend-Erweiterung. Zwei neue Clients nutzen diese Schnittstelle;
ein gemeinsamer Store übernimmt SQL, Transaktionen und Ereignistransport.
Node.js bleibt die Laufzeit. Das bestehende Installationsprofil wurde nicht
auf eine ungeprüfte Datenbank umgestellt. Auf dem Pi wurde nichts installiert.

Implementiert sind TLS-1.3-Pflicht, CA-/Namensprüfung und Clientzertifikate,
parametrisierte SQL-Zugriffe, getrennte Objects-/States-Rollen mit RLS,
gemeinsame Bestätigung von Daten und Ereignissen, Größen-/Arbeits-/Zeitgrenzen
und begrenzte Ereigniswarteschlangen. Nach Verbindungswechsel werden alte
Ereignisse nicht erneut als Steuerbefehle abgespielt. Diese Aussagen beschreiben
Quellcode und die unten abgegrenzten Tests, keinen bereits abgenommenen Server.

Die Rechteprüfung des übernommenen Objects-Domainclients wurde verstärkt.
Gezielte Tests decken unter anderem fehlenden Abbruch nach Zugriffsverweigerung,
umgehbare Bulk-Leserechte, vom Aufrufer vorgetäuschte Gruppenrechte und indirekte
Datei-Löschpfade ab. Nicht vollständig abgesicherte Datei-Teilbaumoperationen
bleiben für Nichtadministratoren gesperrt. Beliebige JavaScript-Map-Sichten
werden nicht ausgeführt. Deshalb ist vollständige Adapterkompatibilität offen.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Gemeinsamer Vertragslauf | **97/97 bestanden**: Store 23, Store-Review 10, Objects 25, States 29, Labor-Zusammenstellung 10 | SQL-Antwort-/Store-Doubles und Dateien; keine Serververbindung. Objects verwendet den tatsächlichen 7.2.2-Domainclient. |
| SQL und RLS in PGlite | **10 Fälle bestanden**, mit Elternprüfung 11 Node-Tests | PostgreSQL 18.3 WASM, Testwerkzeug; andere Version als native Zielversion 17.11, keine Netzwerk-Authentifizierung. |
| Tatsächlicher Controller-Modullader | Beide PostgreSQL-Clients geladen, kein eingebetteter Server erkannt | Import-/Auswahlprüfung; kein laufender Controller an PostgreSQL. |
| Native Laborumgebung | PostgreSQL 17.11 gebaut; Root-Abweisung geprüft | 1 Schutztest bestanden, 1 TLS-Prüfblock übersprungen; **0 echte TLS-Prüfungen**. |
| Quellreview | Mehrere getrennte Agentenprüfungen und nachgeprüfte Korrekturen | KI-Quellreview; kein unabhängiger externer Penetrationstest. |

Die Teilberichte und der gemeinsame Lauf prüfen teilweise dieselben Fälle.
Ihre Zahlen dürfen nicht als zusätzliche Tests addiert werden. Die Rohprotokolle
und SHA-256-Quellbindungen liegen neben diesem Bericht. Beim endgültigen
Vertragslauf blieben die gebundenen Quellen unverändert.

Fehlgeschlagene Vorläufe bleiben dokumentiert: ein falscher Test-Identitätswechsel
im WASM-Labor, ein zunächst unvollständiger Modul-Suchpfad im gemeinsamen
Testlauf sowie ein vor Abschluss des Objects-Reviews erzeugter Labor-Snapshot.
Die jeweiligen Ursachen, Korrekturen und neuen Läufe sind getrennt erfasst.

## Konkrete Testgrenze

Der Ausführungsraum stellt ausschließlich UID/GID 0 bereit. PostgreSQL
verweigert den Serverstart als root. Diese Sicherheitsprüfung wurde nicht
umgangen. Echte TLS-/Zertifikats-Negativtests und ein Controller-Starttest sind
als ausführbare Laborprüfungen vorbereitet, hier aber **nicht ausgeführt**.
Der nächste native Lauf benötigt einen normalen unprivilegierten Benutzer in
einer isolierten VM oder auf dem Test-Pi und einen ausschließlich dafür
erzeugten leeren Prüfcluster. Die Bestandsinstallation ist dafür kein Testziel.

## Offene Freigabesperren

| ID | Fehlender Nachweis oder Umsetzung | Bedeutung |
| --- | --- | --- |
| PG-01 | Eigene OS-/DB-Identitäten und serverseitige Namespace-Rechte je Adapter | Zwei gemeinsame Datenklassenrollen verhindern keinen Angriff eines kompromittierten Adapters auf andere Adapter derselben Klasse. Clientseitige ACLs reichen dafür nicht. |
| PG-02 | Native PostgreSQL-17.11-, mTLS-, Zertifikatsrotation-/Widerrufs- und Wiederverbindungstests | Weder erfolgreicher TLS-Aufbau noch die erwarteten Serverablehnungen sind bisher praktisch nachgewiesen. |
| PG-03 | Vollständiger Controller-, Admin-, UI- und kuratierter Adapterbetrieb | Modulladen und Vertragstests belegen keine vollständige Funktionskompatibilität. Bestehendes Design soll erhalten bleiben; dieser Stand ist noch keine UI-Abnahme. |
| PG-04 | Datenmigration, überprüftes Backup/Restore und Rückkehr zum vorherigen Zustand | Bestehende EOS-/Redis-/JSONL-/SQLite-Daten dürfen nicht automatisch überschrieben werden. |
| PG-05 | Pi-ARM64-Last, konkurrierende Clients, begrenzte Verbindungskapazität, voller Datenträger, Stromverlust und sichere Anlagenreaktion | Globale Transaktionslocks, bis zu vier DB-Verbindungen pro Prozess und begrenzte Ereignisspeicherung benötigen reale Belastungs-/Ausfalltests. |
| PG-06 | Schutz ruhender Daten und Backups, Schlüsselaufbewahrung, Auditkette | TLS verschlüsselt den Transport; es verschlüsselt keine PostgreSQL-Dateien auf dem Datenträger. |
| PG-07 | Produktinstaller, vollständiger Release-Lock, signierte Artefakte, vollständige tatsächliche Zielsystem-SBOM und Update-/Supportprozess | Neue Pakete sind private Entwicklungsquellen. Historische Runtime-SBOMs gelten nicht automatisch für das neue Profil. PostgreSQL-17-Supportende erfordert eine geplante Hauptversionsmigration. |
| PG-08 | Produktbezogene CRA-/IEC-Anwendbarkeit und Abschluss aller Nachweise | Eine Datenbankauswahl oder ein Modultest ist keine Konformitätserklärung und kein Nachweis funktionaler Sicherheit der Anlagenregelung. |

STRIDE-Maßnahmen und Grenzen stehen in `runtime/postgresql/README.md` und den
Paket-READMEs; die Schnittstellen sind in
`docs/architecture/INTERFACE_CONTRACTS.md` dokumentiert.

## SBOM und Liefergrenze

Der öffentliche, tatsächlich installierte `pg`-Abhängigkeitsbaum und die neuen
Quellkomponenten werden in getrennten CycloneDX-1.5-Nachweisen geführt. Der
Quellnachtrag ist keine vollständige Stückliste des auf dem Pi laufenden
Betriebssystems. PGlite ist ausschließlich ein Laborwerkzeug. Historische
vollständige Runtime-SBOMs und zurückgehaltene Testartefakte behalten ihren
ursprünglichen Geltungsbereich. Einzelheiten und Dateihashes stehen in
`sbom-verification.json`.

Geliefert wird das vollständige Entwicklungsrepository mit Tests und Belegen.
Das Archiv ist **kein freigegebener PostgreSQL-Installer**. Die bestehenden
Installations-/Freigabesperren bleiben bestehen.
