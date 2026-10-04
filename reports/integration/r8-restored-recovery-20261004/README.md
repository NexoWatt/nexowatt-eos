# R8-Koordinator für den zurückgenommenen R7-Versuch

Der neue Helfer übernimmt ausschließlich den authentifizierten R4-Zustand mit dem erhaltenen, exakt gebundenen `RESTORED_STOPPED`-Nachweis des veröffentlichten R7. Er erhält die alten R7-Dateien und die ursprüngliche Einrichtung. R7-Quellhelfer und historische signierte Lieferungen werden nicht verändert. Ablauf und Diagnosefelder stehen in der [Betriebsbeschreibung](../../../docs/operations/RECOVER_R4_RESTORED_R7_TO_R8_DE.md).

Die 68 gezielten Prüfungen bestehen unter Node 24.19.0 auf Linux x64. Sie verwenden echte temporäre Dateien, private Dateimodi, atomare Schreibvorgänge, Symlinkwechsel und synchronisierte Verzeichnisse. Dienste, native Probe, Paketprüfung und vollständige Enrollment-Sammlung werden für diese Übergangsverträge ausdrücklich injiziert. Zwei Fälle führen die echte Readiness-Koordination mit injizierten Transporten aus. Dies ist kein nativer ARM64-, PostgreSQL-, Systemd- oder Pi-Gesamtnachweis. Die unverändert wiederverwendete historische Enrollment-Sammlung hat einen separaten authentischen R4-Integrationstest.

Geprüft werden Erfolg und Konfigurationserhalt, strikte alte Journal-/Guard-/Lock-Bindungen, private Dateigrenzen, inaktive alte Prozesse/Dienste, Ablehnung von Fremdzuständen, Fehler während Installation und Aktivierung, erhaltener HTTPS-Ursachencode, Crash-Quiesce und ausschließlich feste Diagnosewerte. Zusätzlich sind einmalige und dauerhafte Verzeichnis-Synchronisierungsfehler nach dem Entsperren sowie ein partieller Guard-Schreibfehler abgedeckt: Die Aktivierungssperre wird unabhängig wiederhergestellt; bei unsicherer Dauerhaftigkeit wird kein erfolgreicher Rücksetzstatus ausgegeben.

- [Quellbindungen und Prüfumfang](verification.json)
- [Vollständige gezielte Testausgabe](coordinator-tests.tap)
- [Historische vollständige R4-Sammlung](../../../tests/system/recover-r4-first-start.integration.cjs)

Der tatsächlich gemeldete Pi-R7-Probelauf erreichte `CONTROLLER_READY` und wurde anschließend zurückgenommen. Die Bereitschafts-Rennbedingung wurde separat reproduziert; ihre alleinige Ursächlichkeit für diesen Pi-Versuch ist damit nicht bewiesen. Dauerhafte R8-Aktivierung, Browser-Login, Reboot, Backup/Restore und Anlagenbetrieb bleiben offen.
