# Native PostgreSQL-Prüfung: schreibbare Laborkonfiguration korrigiert

Am 04.10.2026 scheiterte der erste native Lauf
`37193261349`, Job `111409718615`, Quellstand
`4366f8a` beim Controllerstart mit `EOS_PG_CONFIG`. Der Lauf hatte
PostgreSQL 17.11 aufgebaut, beide mTLS-Identitäten gegen leere Tabellen geprüft
und die gewöhnliche Controller-CLI-Einrichtung abgeschlossen. Der Controller
wurde in diesem Lauf **nicht** betriebsbereit; Start-/Neustartprüfung fehlgeschlagen.

Die Ursache dieses Laborfehlers unterscheidet sich vom zuvor reproduzierten
Hostobjektfehler: Die unveränderte CLI 7.2.2 ergänzt beim Setup für beide
Datenbanken `options.retry_max_delay = 5000`, auch beim PostgreSQL-Backend.
Die bisher schreibbare Labordatei übernahm diese Redis-Option. Der strikt
begrenzte PostgreSQL-Konfigurationsvalidator wies sie beim nächsten Start
korrekt ab.

Das echte Produkt bindet dagegen seine geschützte Konfiguration in
`system/postgresql-test/systemd/nexowatt-eos-initialize.service` per
`BindReadOnlyPaths` ein. Die bestehende CLI fängt einen verweigerten
Konfigurationsschreibversuch ab und beendet das Setup regulär. Eine nachträgliche
Konfigurationskorrektur oder Lockerung des Validators ist dafür nicht nötig.

Der native Test stellt nun diese Schreibverweigerung im unprivilegierten
Laborprozess mit Dateimodus `0400` nach, prüft `EACCES` vor dem Setup und die
entsprechende tatsächlich ausgegebene CLI-Diagnose. Danach müssen die
Konfigurationsbytes exakt unverändert sein und erneut die strenge
Profilvalidierung bestehen. Es gibt kein Zurückschreiben einer möglicherweise
veränderten Konfiguration. Die vorhandene echte PostgreSQL-/Controller-
Start-, Bereitschafts- und Neustartprüfung bleibt unverändert erforderlich.

Lokale Belege: `setup-normalization.json` dokumentiert die tatsächliche
Ausführung des Konfigurationsnormalisierungsblocks aus der vorhandenen,
hashgebundenen Controller-CLI 7.2.2 mit ausschließlich künstlichen Werten.
Vorher bestehen beide PostgreSQL-Konfigurationen, anschließend scheitern
beide exakt mit `EOS_PG_CONFIG`. Dies ist eine lokale Quellblockreproduktion
unter Node 24.19.0, kein zusätzlicher PostgreSQL- oder Pi-Lauf.
`contract.log` enthält drei bestandene Prüfungen der Beziehung zwischen
Produkt-Unit, Laborfixture und unverändert strikter Konfigurationsprüfung.

Der native Lauf nach dieser Fixturekorrektur muss gesondert ausgewertet
werden. Dateimodus im Labor beweist weder echte systemd-Bind-Mount-Grenzen
noch Pi-, Adapter-, Anlagen- oder Produktionsfreigabe.
