# Nachprüfung der Managed-Installer-Fixture

CI-Lauf `39665823379`, Job `119450458651`, scheiterte auf
`19c250aa6516881587cea045ab384308b37647d1` zweimal an derselben veralteten
Scope-Erwartung. Sequenz 15 wählt korrekt `security-refresh-test` mit
js-controller **7.2.5**; die Fixture erwartete noch `own-adapter-test`.

Die Fixture prüft jetzt den richtigen Scope und lässt einen vollständigen
synthetischen Sieben-Paket-Katalog durch die echte Produktprüfung laufen.
Zusätzliche Ablehnungsfälle für 7.2.2, Version 8 und abweichende installierte
Controller-Metadaten bestätigen den Abbruch vor Befehlen und Host-Schreibzugriffen.
Produktionscode und Freigabeschranken wurden nicht verändert.

Der fokussierte Host-Lauf bestand **23/23 Tests**. Der kombinierte lokale
CI-Befehl bestand **27/28 Tests**; allein der unveränderte Socket-Test scheiterte
am hier nicht erlaubten Unix-Socket-Bind (`EPERM`). Dieser Test hatte im
genannten CI-Lauf bestanden. Kein Test wurde dafür abgeschwächt oder übersprungen.
Lokale Laufzeit: Node 24.19.0, Linux x64 als root; CI-Ziel: Node 24.21.0.

Rohbelege, Dateihashes, Befehle und Grenzen stehen in
`managed-host-19c250a.json` und den beiden zugehörigen TAP-Dateien.
Eine native PostgreSQL-Installation, Pi-Abnahme und der erneute CI-Lauf
wurden in diesem Teilauftrag nicht durchgeführt.
