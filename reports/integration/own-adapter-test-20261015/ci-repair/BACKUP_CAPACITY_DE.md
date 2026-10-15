# Eingrenzung des Backup-Abbruchs und Laborkapazität

15.10.2026, lokaler Ausgangscommit `625b86286fa8b863d04fac91a13ab1d7e29aa168`.
Bezug: nativer CI-Lauf `38709402934`, Job `116336763179`, Artefakt `11960238038`.

Die ersten elf nativen Prüfschritte einschließlich aller sechs laufenden
Adapter und Home-/Entzug-/Pro-Wechsel bestanden. Der zwölfte Schritt endete
nach rund 11,48 Sekunden mit `MANAGEMENT_CLI_FAILED`. Das bisherige Artefakt
enthält keinen numerischen CLI-Exitcode und keine genaue Datenbankfehlermeldung.
Eine erfolgreiche Backup-Erstellung ist damit **nicht nachgewiesen**.

Der Codevergleich ergab eine konkrete Abweichung des Prüfstands:
`lab-cluster.cjs` erlaubte 40 Verbindungen, das Produkt in
`runtime/postgresql/host.cjs` unverändert 128. Ein PostgreSQL-Store verwendet
eine Poolverbindung und einen separaten LISTEN-Client. Controller plus sechs
Adapter, drei zusätzliche Prüfclients und zwei Stores der Backup-CLI ergeben
nominal bis zu 38 Verbindungen vor möglichen weiteren Sitzungsclients. Bei
40 Slots und drei Superuser-Reserven stehen den nicht privilegierten Rollen
nur 37 zur Verfügung. Aktuelle Verbindungszahlen wurden im fehlgeschlagenen
Lauf nicht aufgezeichnet. Die beobachtete Laufzeit passt zum vorhandenen
CLI-Verbindungszeitlimit von zehn Sekunden und anschließendem verzögertem Exit;
sie beweist die Fehlerursache nicht allein.

Das feste Profil `management` verwendet nun 128 Verbindungen wie das Produkt.
Das kleine Profil `laboratory` bleibt bei 40. Die üblichen Reserven sind im
Labor ausdrücklich auf drei Superuser-Slots und null zusätzliche reservierte
Slots festgelegt. Es gibt keinen beliebigen Kapazitätsparameter. Die
Produktkonfiguration, Poolgrößen, Rollenrechte, TLS-Prüfungen, Zeitgrenzen und
der Backup-Pfad wurden nicht geändert. Der nächste native Lauf liest die
Kapazität direkt vor dem Backup zurück und prüft die festen Werte; die
CLI-Diagnose ergänzt sichere Klassen und einen numerischen Exitcode.

Lokal bestanden unter Linux x64 mit Node 24.19.0 alle **23/23** Tests der
eigenen Adapter-Prüfhilfen, einschließlich neuer Bindung der Laborkapazität
an die tatsächliche Produktkonfiguration und Ablehnung freier Profile:
[TAP-Beleg](backup-capacity-regression.tap).
Die geänderten Laborkonfiguration und Managementverträge sind syntaktisch
geprüft. Der bestehende authentifizierte R7-Managementvertrag wurde wegen der
hier nicht bereitgestellten separaten R7-Eingaben nicht vollständig ausgeführt.

Die Fehlerursache bleibt bis zum erneuten nativen Lauf eine durch Quellcode
und Zeitverhalten gestützte Hypothese. Die lokale Prüfung startet keine echte
PostgreSQL-Instanz und ersetzt weder native Backup-/Neustartprüfungen noch
ARM64-/Pi-/Stromausfalltests. Signierung, Testgeräteabnahme, Produktions- und
CRA-Freigabe werden hier nicht behauptet.

## Nachprüfung im nativen Lauf und Korrektur des Diagnosezählers

Lauf `38711864143`, Job `116344922983`, Artefakt `11961700712`, Quellmarker
`3d3aaf8e4c7f81e9465a202558716980b34c0615`: Die festen PostgreSQL-Werte wurden
mit `maximum:128`, `superuserReserved:3`, `roleReserved:0`, `ordinarySlots:125`
zurückgelesen. Beide echten Backup-CLIs endeten mit Exit 0 ohne Signal und ohne
erkannte Fehlerklasse; Export, Validierung und Archivierung wurden jeweils
gemeldet. Die anschließende unabhängige Archivprüfung brach im Prüfparser an
`entry.setEncoding` ab. Von 21 geforderten Nachweisen sind bisher nur 16 gesetzt;
Backup-Inhaltsprüfung, Rollback/Neustart und Abschluss sind damit weiterhin offen.

Der alte Diagnosewert `connections:16` darf nicht als Cluster-Gesamtzahl gelten:
Die Abfrage filterte `pg_stat_activity.backend_type`, dessen Werte für andere
Rollen ohne zusätzliche Statistikrechte ausgeblendet werden können. Die Abfrage
verwendet jetzt `pg_stat_database.numbackends WHERE datname=current_database()`.
Der veröffentlichte Feldname `currentDatabaseConnections` bezeichnet ausdrücklich
alle Verbindungen zur aktuellen Datenbank, nicht zum gesamten Cluster. Die
bestehende Objects-Verbindung wird einmal wiederverwendet; es gibt weder neue
Verbindungen noch neue Rechte oder eine Ausgabe von Rollen-/Datenbanknamen.
Grundlage: [PostgreSQL-17-Dokumentation zur Statistikansicht](https://www.postgresql.org/docs/17/monitoring-stats.html).

Der ursprüngliche Fehler bei 40 Slots ist dadurch weiter eingegrenzt, aber
ohne damaligen Exitcode oder Datenbankfehler weiterhin nicht eindeutig bewiesen.
Das nach dem Abbruch bei der Abschlussprüfung erkannte `RUNTIME_ERROR_LOGGED`
bleibt ebenfalls offen: Die letzte erfolgreiche Protokollprüfung fand am Ende
des Pro-Lizenzwechsels statt. Danach umfasst das ungescannte Fenster beide
Backup-Aufrufe, den Parserabbruch und das Herunterfahren. Das vorhandene
bereinigte Artefakt erlaubt keine Zuordnung allein zum Herunterfahren.
Die Fehlerprüfung bleibt aktiv.

## Begrenzte Laufzeitdiagnose vor erneutem CI-Lauf

Der Logleser liefert intern die ohnehin geprüften neuen Bytes an einen festen
Klassifikator. Nur die sechs bekannten Adapteridentitäten, `controller` oder
`unscoped` und fest programmierte Fehlerklassen werden gespeichert. Dazu gehören
DB-/Importfehler sowie `Unload cleanup failed:`, `Cannot set alive state to false:`
und `Cannot stop`. Keine erfassten Textteile, Pfade, fremden Adapterkennungen,
Datenbankwerte oder Geheimnisse werden exportiert. Die von adapter-core
verwendete Schreibweise `Unhandled promise rejection.` wird zusätzlich als der
bereits fatale Indikator `UNHANDLED_REJECTION` erkannt.

Die native Prüfung speichert pro Boot höchstens 32 kumulierte Scanstände mit
festen Phasen: nach Start/Lizenzwechseln, nach jedem Backup und vor/nach Stop
einschließlich Cleanup. Der Scanstand wird vor dem Fehlerwurf aufgenommen.
Ein Fehler bleibt freigabeblockierend; keine Ausnahme oder Produktänderung
wurde aus der noch ungeklärten Shutdown-Hypothese abgeleitet.

Am 15.10.2026 bestanden lokal unter Node 24.19.0, Linux x64, **31/31** Tests mit
`node --test --test-reporter=tap tests/integration-own-adapters/*.test.cjs`.
Enthalten sind Privatsphäre-Negativtests, der aktuelle Datenbankzähler mit einer
einzigen bestehenden Abfrage, getrennte Vor-/Nach-Stop-Snapshots, Ablehnung
beliebiger Phasennamen und begrenzte Nachweismenge sowie die parallel reparierte
Archivprüfung. Syntaxprüfung und `git diff --check` bestanden ebenfalls.
[Rohbeleg](backup-diagnostics-regression.tap) und
[Quell-/Beleghashes](backup-diagnostics-summary.json) beziehen sich auf diesen
lokalen Stand. Die zusätzliche native Diagnose und neue Datenbankzählung wurden
hier noch nicht in einem echten PostgreSQL-/Sechs-Adapterlauf ausgeführt.
