# Sicherheitsabhängigkeiten vom 21.10.2026

UI 1.0.21 hält `proxy-addr` per npm-Override auf 2.0.8 und
`follow-redirects` auf 1.16.1. `@iobroker/adapter-core` ist exakt auf 3.4.3
angehoben, damit die neue gemeinsame Laufzeit keine zusätzliche alte Kopie 3.4.1
benötigt. Dessen Controller-Common-DB-Peer löst im Quell-Lockfile auf 7.2.5 auf;
die Controller-Hauptversion bleibt 7. Eine übergeordnete EOS-Laufzeitinstallation
muss die Overrides an ihrer Installationswurzel übernehmen.

Nach der ersten isolierten `proxy-addr`-Korrektur meldete der Produktions-Audit
keinen Befund. Nach Aufnahme des neuen Common-DB-Peers meldet der erneute Audit
drei hoch eingestufte Paketknoten derselben bereits bekannten, ungepatchten
Forge-Kette (`adapter-core` → Common-DB → `node-forge` 1.4.0). Der Befund bleibt
offen; ein früherer Nullbefund wird nicht auf den geänderten Baum übertragen.

Das aktuelle Artefaktmanifest wurde mit dem vorhandenen Generator an die bereits
vorhandenen zentralen Lizenzdateien angepasst. Die alten Text-Erwartungen im
RC67-Lizenztest wurden auf den vorhandenen Home-/Pro-Lizenzstatus aktualisiert.
Anmeldung, Capability, lokale Lizenz-Schreibsperre und Testprofil-Sperre der
Gerätesteuerung werden weiterhin geprüft; Produktlogik wurde nicht geändert.

TypeScript-Build, Artefaktprüfung, Paket-Trockenlauf, Authentifizierung,
Update-Status, Rollen/SSE/Service-Worker, Public API und Startkette wurden lokal
geprüft. Der vollständige Testlauf bleibt an der fehlenden Chromium-Installation
für den Home-AppCenter-Browsertest offen. Linux/x64 mit Node 24.19.0 ersetzt
keinen ARM64-/Pi-Test unter der Zielversion.

Die zugehörigen Dateihashes, Audit-Rohdaten, tatsächlichen Prüfergebnisse und
Grenzen stehen im Gesamtprojekt unter
`reports/integration/security-refresh-20261021/adapters/`; der nachfolgende
Adapter-Core-Abgleich ist separat in `UI_ADAPTER_CORE_PIN_DE.md` und
`ui-adapter-core-followup.json` dokumentiert.
