# Veröffentlichter R8-Wiederherstellungsweg – 04.10.2026

R8 / Sequenz 11 ist signiert und veröffentlicht. [Quell-Security](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37221025203),
[CodeQL](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37221025240) und der
[Auslieferungslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37221151680)
sind vollständig erfolgreich.

R8 korrigiert die Lücke zwischen Adapter-Heartbeat und HTTPS-Bereitschaft und
ermöglicht den eng bestimmten Wiederanlauf des authentifizierten, durch R7
zurückgesetzten R4-Erststarts. Der neue Helfer bewahrt bei Fehlern die ursprüngliche
Phase und den festen Fehlercode. Die vorhandenen Daten, Zugangsdaten und Lizenz-
bindungen bleiben erhalten; historische R7-Journale und Lieferungen werden bewahrt.

Die nativen Prüfungen verwenden den echten Controller, Admin und NexoWatt UI mit
PostgreSQL 17.11, gegenseitigem TLS 1.3 und Node 24.21.0 auf Linux x64. Einrichtung
und Upload laufen bereits unter App-Schreibschutz. Beide Starts bestehen echte
HTTPS-Anmeldung, gerätegebundenen gültigen Lizenzstatus, genau drei aktuelle
lebende Prozesse und frische Laufzeitlogprüfung. Stop, Neustart, Enrollment und
vollständiger App-Dateiabgleich sind erfolgreich. Die aktuelle Source-Prüfung
und der Auslieferungslauf bestehen jeweils alle 8 Managementtests ohne Auslassung.

Die getrennte Publikationsstufe rekonstruiert sämtliche erwarteten Paketdateien
vor dem Commit. Der zusätzliche lokale öffentliche Readback authentifiziert alle
22.842 signierten Dateien; 22.722 R7-Appdateien bleiben einschließlich Modi gleich.
114 Host- und sechs Backendbindungen stimmen mit dem freigegebenen Quellcommit
überein. Dieser zusätzliche Dateiprüfer lief ehrlich dokumentiert unter lokalem
Node 24.19.0; der vollständige Hersteller-Verifier lief in CI unter Node 24.21.0.
Es fand lokal keine Kandidatenausführung oder erneute Signierung statt.

Archiv, Schlüssel und Liefermetadaten sowie der öffentliche Einstieg wurden in
der Pipeline tatsächlich per HTTPS heruntergeladen und bytegenau verglichen.
Der Kopierbefehl wurde zusätzlich aus dem unveränderlichen öffentlichen Commit
gelesen und auf exakt 1008 Byte, SHA-256 und Shellsyntax geprüft, ohne ihn auszuführen.

- [Identitäten, Commits, Prüfläufe und Grenzen](PUBLICATION.json)
- [Zusätzliche Archiv-/Signatur-/Dateiprüfung](published-readback.json)
- [Öffentlicher Git-Export der geprüften Dateien](published-export.json)
- [Native Originalbelege und nachvollziehbare Fehlversuche](../management-native-20261004/README.md)
- [Fester R8-Kopierbefehl](../../../delivery/public-recovery-test3-r8/RECOVERY_COMMAND.txt)
- [Ablauf und Nachprüfung auf dem Pi](../../../docs/operations/RECOVER_R4_RESTORED_R7_TO_R8_DE.md)

Der konkrete Pi-Wiederanlauf, Browserbedienung, Geräteneustart, Backup/Restore und
reale Anlagenanbindungen sind noch nicht bestätigt. Physische Anlagensteuerung
bleibt gesperrt; keine Produktionsfreigabe. Die unveränderten Liefermetadaten
geben den Buildzeitpunkt vor Veröffentlichung des öffentlichen Einstiegs wieder;
dessen jetzige Verfügbarkeit ist ausschließlich in diesem separaten
Veröffentlichungsnachweis ergänzt.
