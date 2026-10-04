# EOS Objects auf PostgreSQL – Entwicklungsbaustein

Stand: `0.1.0-dev.2`, 1. Oktober 2026. **Keine Produktionsfreigabe.**

Der js-controller kann dieses lokale Paket mit `objects.type: "postgresql"`
über seine vorhandene Datenbank-Schnittstelle laden. Das Paket exportiert
`Client` und `getDefaultPort`, keinen eingebetteten Server. PostgreSQL und sein
Schema werden außerhalb des Adapterprozesses eingerichtet.

## Abgrenzung und Wiederverwendung

Das Paket erweitert den exakt gebundenen `@iobroker/db-objects-redis@7.2.2`
Client, um dessen Datei-, Objekt-, Callback- und Promise-Verträge zu erhalten.
Es erstellt **keine Redis-Verbindung** und führt weder Lua noch Design-Map-Code
aus. Die npm-Abhängigkeit und deren transitive Pakete bleiben im tatsächlichen
Abhängigkeitsbaum und müssen in der Build-SBOM aufgeführt werden.

Die PostgreSQL-Anbindung verwendet ausschließlich den gemeinsamen
`@nexowatt/eos-postgresql-store@0.1.0-dev.2`. Dieser erzwingt verifiziertes TLS 1.3
mit Clientzertifikat und stellt parametrisierte SQL-Operationen bereit. Ein
zusätzlicher zweiter Konstruktorparameter erlaubt ausschließlich im lokalen
Testcode die Übergabe eines Fake Stores; Konfigurations-JSON aktiviert keinen
unsicheren Verbindungsmodus.

## Sicherheitsrelevante Verträge

- Alle öffentlichen Objekt-/Dateioperationen mit Benutzeroptionen verwerfen
  übergebene `acl`, `group`, `groups` und `checked` und lesen aktuelle Benutzer-
  und Gruppenrechte erneut. Deaktivierte oder unbekannte Benutzer scheitern.
- Schreiboperationen und ihre Berechtigungsprüfung laufen in derselben
  PostgreSQL-Transaktion unter der gemeinsamen Objects-Schreibsperre. Dateiinhalt
  und Metadaten sowie Objektänderung und Benachrichtigung werden gemeinsam
  abgeschlossen oder verworfen.
- Der bekannte fehlende Abbruch der globalen Schreibprüfung im 7.2.2-Client wird
  durch die vorgelagerte Prüfung nicht erreicht. `setObject`, `extendObject` und
  `delObject` prüfen zusätzlich das bestehende Objekt vor der Mutation.
- Schlüssel- und Mehrfachabfragen ersetzen die fehlerhafte geerbte Abkürzung
  anhand der Gruppenzugehörigkeit durch eine explizite Prüfung jedes Objekts.
- Rechteänderungen und Datenbanklöschung sind im aktuellen Profil Administratoren
  vorbehalten. Objekt-Dokumente mit gefährlichen Merge-Schlüsseln, Zyklen,
  unendlichen Zahlen oder übermäßiger Tiefe werden verworfen.
- Der Controller 7.2.2 liefert im eigenen Hostobjekt das besondere Node-Objekt
  `process.env`. Ausschließlich beim eigenen Host, mit privilegiertem Kontext
  und exakter Referenz auf dieses Objekt ersetzt der Client die Umgebung durch
  ein leeres Metadatenobjekt. Alle übrigen Daten bleiben streng geprüft; das
  Eingabeobjekt wird nicht verändert. Dies verhindert die Persistierung von
  Umgebungsgeheimnissen und den reproduzierten Host-Schreibabbruch. Feste
  Dokument-Diagnosecodes überstehen die Transaktionsgrenze ohne Rohfehlerdaten.
- Nur exakt hinterlegte Maps aus den überprüften System-Views des Controllers
  werden als strukturierte Filter ausgeführt. Unbekannte Maps und Reduktionen
  scheitern mit `EOS_PG_VIEW_UNSUPPORTED`. Es gibt keinen `eval`-Fallback.
- Primary-Host-Sperren verwenden transaktionale Store-Leases. Lua- und Redis-Set-
  Verwaltungsfunktionen melden ausdrücklich fehlende Unterstützung.
- System- und Benutzerabonnements beachten explizite Benutzerkontexte und prüfen
  Leserechte bei jeder Nachricht erneut. Bei Überlast der begrenzten lokalen
  Ereigniswarteschlange schließt der Client die Verbindung und meldet den Ausfall.

## STRIDE und verbleibende Grenzen

| Bedrohung | Maßnahme | Offene Abnahme |
| --- | --- | --- |
| Identitätsvortäuschung | mTLS im Store, aktuelle Rechteprüfung, keine übernommenen Gruppen-Behauptungen | Adapter mit denselben SQL-Zugangsdaten bleiben eine Vertrauensgemeinschaft. Der alte API-Standard ohne Benutzeroption gilt als vertrauenswürdige Serviceoperation. Das ist keine Authentifizierung gegenüber bösartigem Adaptercode. |
| Manipulation | Parametrisierter Store, transaktionale ACL-Prüfung, geschützte Merge-Schlüssel | Reale PostgreSQL-Parallelitäts- und Fehlertests fehlen. |
| Abstreitbarkeit | Tests, Quellhashes und getrennte Prüfberichte | Manipulationsgeschütztes produktives Auditprotokoll fehlt. |
| Informationsabfluss | Objekt-/Dateirechte und erneute Leserechtsprüfung von Ereignissen | Nur geprüfte APIs; kein Schutz vor einem kompromittierten Prozess mit denselben DB-Rechten. Löschereignisse ohne vorheriges ACL-Dokument werden Nichtadministratoren derzeit nicht zugestellt. |
| Dienstverweigerung | Begrenzte Store-Abfragen, begrenztes Wildcard-Matching, Transaktionsbudget, begrenzte Ereigniswarteschlange | RPi-Last, Wiederanlauf, Netzunterbrechung und Prozessabsturz nicht abgenommen. |
| Rechteausweitung | Vorgelagerte Rechteprüfung, atomare Mutationen, keine beliebigen Views/Lua | Vollständige Adapterisolierung und serverseitige Rechte pro Adapter fehlen. |

Weitere Kompatibilitätsgrenzen: Datei-Umbenennung, rekursive Dateilöschung und
Verzeichnislisten bleiben vorläufig Administratoren vorbehalten. Geerbte
Teilbaumprüfungen und Ziel-Dateirechte sind für Nichtadministratoren noch nicht
vollständig sicher nachgewiesen. Subscription-Patterns unterstützen Redis-Globs
einschließlich Klassen und Escape-Zeichen mit einem begrenzten Arbeitsbudget.
Eigene Adapter-Views benötigen eine überprüfte Erweiterung der Definitionen.
Nichtadministratoren ohne explizite Objekt-ACL erhalten keinen Zugriff.
Das ist ein bewusst strenger Entwicklungsstand, keine bestätigte Parität für
alle ioBroker-Adapter. Der Store liefert nach Verbindungsabbruch keine alten
Ereignisse erneut aus; sichere Aktualisierung des Controller-/Adapterzustands
muss noch mit realem PostgreSQL und den Zieladaptern überprüft werden.

## Tatsächlich ausgeführte Prüfung

`tests/postgresql/objects.test.cjs` verwendet den tatsächlichen
ioBroker-7.2.2-Domainclient und einen ausdrücklich bezeichneten Fake Store.
Geprüft werden CRUD und Callback-Verträge, negative Rechtefälle einschließlich
F01, konkurrierender Rechteentzug im Fake-Transaktionsmodell, Dateien und
Rollback, sichere Views, Subscriptions, Leases und Eingabegrenzen.

Diese Tests beweisen **keinen** gestarteten PostgreSQL-Server, TLS-Handshake,
ARM64-Betrieb, vollständigen Controllerstart, Geräte-Failsafe oder CRA-/IEC-
Konformität. Reale Datenmigration, Rückfall, Backup/Wiederherstellung und
Hardware-Abnahme bleiben Freigabesperren.

Nachtrag 04.10.2026: `tests/postgresql/host-object.test.cjs` nutzt zusätzlich den
echten 7.2.2-Hostgenerator und die reale Store-Transaktionslogik. SQL-Treiber und
Transport sind ausdrücklich Testdoubles. Der vorherige Host-Schreibfehler
`EOS_PG_TRANSACTION_FAILED` und die Korrektur wurden damit reproduziert; native
PostgreSQL-/Pi-Abnahme ist daraus nicht ableitbar. Siehe
`reports/integration/controller-startup-20261004/postgresql/README.md`.
