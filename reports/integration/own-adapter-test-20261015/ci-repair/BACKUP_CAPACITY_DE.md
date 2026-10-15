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
