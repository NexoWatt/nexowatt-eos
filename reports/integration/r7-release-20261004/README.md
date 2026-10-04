# Veröffentlichter R7-Wiederherstellungsweg – 04.10.2026

R7 ist signiert und veröffentlicht. Der [Auslieferungslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37195008931) ist vollständig erfolgreich; Quelltests, Workflowvalidierung und CodeQL sind ebenfalls grün.

Der neue Stand korrigiert das Host-Objekt im PostgreSQL-Backend und bindet die PID-Datei an das private Datenverzeichnis. Der Wiederherstellungshelfer ist ausschließlich für den authentifizierten, abgebrochenen R4-Erststart vorgesehen. Vorhandene Zugangsdaten und Einrichtung werden nicht zurückgesetzt.

Der native Test verwendet PostgreSQL 17.11 mit gegenseitig geprüftem TLS 1.3, Node 24.21.0 und den tatsächlichen Controller 7.2.2. Host-Speicherung, Bereitschaft, Stoppen und erneuter Start bestehen. Zusätzlich bestehen 32 Wiederherstellungsverträge, zehn Prüfungen mit dem authentischen R4-Paket und die Tests an den tatsächlich gepackten Admin-/Objects-/Host-Modulen. Der separate Publisher rekonstruiert den vollständigen erwarteten Paketinhalt vor der Veröffentlichung.

Archiv, Schlüssel und Liefermetadaten wurden öffentlich heruntergeladen und bytegenau verglichen. Der öffentliche Einstieg wurde vor der Befehlsveröffentlichung tatsächlich zurückgelesen. Anschließend wurden Einstieg und Kopierbefehl nochmals unabhängig per HTTPS heruntergeladen und mit Git-Inhalt, Größe und SHA-256 abgeglichen.

- [Veröffentlichung, feste Identitäten und Prüfläufe](PUBLICATION.json)
- [Vollständiger Pi-Befehl](../../../delivery/public-recovery-test3-r7/RECOVERY_COMMAND.txt)
- [Ablauf, Statusprüfung und Fehlerbehandlung](../../../docs/operations/RECOVER_R4_FIRST_START_R7_DE.md)
- [Signatur-, Quellbindungs- und Übergangsprüfung](../installable-test3-r7-20261004/build-verification.json)

Der konkrete R4→R7-Wechsel, Browser-Login, Geräteneustart und Backup/Restore auf dem Nutzer-Pi sind noch nicht bestätigt. Physische Anlagenbefehle bleiben gesperrt; dies ist keine Produktionsfreigabe. Die unveränderten Liefermetadaten dokumentieren den Buildzeitpunkt vor Veröffentlichung des öffentlichen Einstiegs; dessen Verfügbarkeit ist im separaten Veröffentlichungsnachweis festgehalten.

## Pi-Rückmeldung vom 04.10.2026, 12:46 Uhr (Europe/Berlin)

Der Nutzer meldet den Controller als `failed/failed`, `Result=exit-code`, `ExecMainStatus=1`, ohne automatische Neustarts. PostgreSQL ist `active/running`. Diese Ausgabe bestätigt keinen erfolgreichen Pi-Test. Installierter Release, Ausführung und Ergebnis des R7-Befehls sind aus den Dienstzuständen allein nicht erkennbar. Benötigt werden die ursprüngliche Reparaturausgabe, ausgewählte Release-/Wiederherstellungsfelder und die letzten Dienstmeldungen. Ursache und Pi-Abnahme bleiben offen; keine erneute Aktivierung oder Löschung von Sperren wurde veranlasst. Die zuvor erfolgreichen Labor-/CI-Prüfungen gelten unverändert ausschließlich für ihre dokumentierte Umgebung.
