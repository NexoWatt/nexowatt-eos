# Veröffentlichter R8-Wiederherstellungsweg – 04.10.2026

**Nachtrag 05.10.2026:** Der Nutzer hat den erfolgreichen R8-Wiederherstellungslauf
auf seinem Pi mit `FIRST_START_RECOVERED`, Sequenz 11 und Dienstresultat
`success` / Exitcode 0 zurückgemeldet. [Bereinigter Rückmeldebeleg](pi-recovery-observation-20261005.json).
Browser-Anmeldung, normaler Geräteneustart und Anlagenabnahme bleiben offen.

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

Zum Veröffentlichungszeitpunkt waren Pi-Wiederanlauf, Browserbedienung,
Geräteneustart, Backup/Restore und reale Anlagenanbindungen noch nicht bestätigt.
Der spätere Pi-Recoverylauf ist unten separat dokumentiert. Physische Anlagensteuerung
bleibt gesperrt; keine Produktionsfreigabe. Die unveränderten Liefermetadaten
geben den Buildzeitpunkt vor Veröffentlichung des öffentlichen Einstiegs wieder;
dessen jetzige Verfügbarkeit ist ausschließlich in diesem separaten
Veröffentlichungsnachweis ergänzt.

## Erste Pi-Rückmeldung vom 05.10.2026, vor der Erfolgsmeldung

Der Nutzer meldet weiterhin Controller `failed` mit `ExecMainStatus=1` und
PostgreSQL `active/running`. Der ausschließlich lesende Auszug der fünf
R8-Diagnosefelder meldet `R8_DIAGNOSEDATEI_NICHT_VORHANDEN`.
Die mitgelieferten letzten 80 Controller-Journaleinträge reichen vom
03.10.2026, 21:50:02, bis 04.10.2026, 12:45:37 (jeweils UTC+02:00).
Sie zeigen die alten R4-PID-Schreibfehler und den bekannten R7-Probelauf mit
Sequenz 10, `CONTROLLER_READY`, anschließendem SIGTERM und gestoppten Adaptern.
Ein R8-Controllerstart, Sequenz 11 oder `FIRST_START_RECOVERED` ist darin
nicht nachgewiesen. Private Rohlogs und Netzwerkadressen werden nicht übernommen.

Aus dieser Rückmeldung folgt kein neuer reproduzierter R8-Laufzeitfehler.
Offen bleibt, ob R8 noch nicht ausgeführt wurde oder bereits vor Anlage des
Journals beziehungsweise vor dem Controllerstart abbrach. Das fehlende Journal
allein beweist keine der beiden Möglichkeiten. Nächster benötigter Beleg ist
die Terminalausgabe des festen R8-Reparaturbefehls. Der Einstieg verwendet
`systemd-run --wait --pipe --collect`; sein Fehler-JSON muss daher nicht im
Systemd-Journal vorhanden sein. Eine bereits erfolgte Ausführung wird nicht
blind wiederholt, und vorhandene Wartungssperren bleiben erhalten.

Der öffentliche Stand `247066badf7feb643ec593a830ec03b5e2375e03` und die drei oben
verlinkten erfolgreichen CI-Läufe wurden am 05.10. nochmals abgeglichen. Seit
dem geprüften Quellcommit sind nur Liefer- und Nachweisdateien hinzugekommen;
Laufzeitcode, Tests und Workflows sind unverändert. Diese Rückmeldung wurde
inhaltlich geprüft; es wurde kein neuer Testlauf, Paketbau oder Pi-Eingriff
ausgeführt. Die Zielgeräteabnahme bleibt offen.

## Erfolgreiche R8-Wiederherstellung auf dem Pi, 05.10.2026

Die nachfolgende Terminalrückmeldung des Nutzers zeigt die Ausführung des festen
R8-Befehls: erwartete Release-ID
`eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`,
`FIRST_START_RECOVERED`, Sequenz 11, Systemd-Ergebnis `success` und Exitcode 0.
Gemeldete Laufzeit: 4 min 59,742 s; CPU-Zeit: 34,674 s. Dies ist ein vom Nutzer
übermittelter Zielgerätebeleg, kein direkter Fernzugriff oder eigener neuer Testlauf.

`REPAIR_NO_INCOMPLETE_TRIAL` ist der normale erfolgreiche Aufräum-Nachlauf bei
bereits aufgehobener Aktivierungssperre. Das vorherige `signatureVerified:false`
mit `codeExecuted:false` stammt nur vom Entpacker. Die anschließende
R8-Koordinatorprüfung verlangt die gültige Signatur und Dateihashes vor der
Umstellung. Diese Trennung wurde im unveränderten Quellcode abgeglichen.

Damit ist die bisher offene tatsächliche Ausführung dieses R8-Wiederherstellungswegs
auf dem Nutzer-Pi erfolgreich zurückgemeldet. Noch ausstehend sind eine separate
Dienststatusaufnahme danach, Browser-Login/Logout/Login, normaler Geräteneustart,
Backup/Restore, Dauerbetrieb und reale Geräteanbindungen. Die festen Felder
`hardwareTested:false`, `physicalControlEnabled:false` und
`productionReleaseApproved:false` bleiben unverändert; der gemeldete Erfolg ist
keine allgemeine Hardware-, Anlagen- oder Produktionsfreigabe. Keine Änderung
an Laufzeitcode, signierten Lieferdateien oder dem bestehenden Prüfstand.
