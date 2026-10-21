# Sicherheitsabhängigkeiten vom 21.10.2026

UI 1.0.21 hält `proxy-addr` per npm-Override auf 2.0.8. Damit wird die im
Quell-Lockfile vorhandene Version 2.0.7 ersetzt. Eine übergeordnete
EOS-Laufzeitinstallation muss den Override an ihrer Installationswurzel
übernehmen. Der frische Produktions-Audit dieses Quellpakets meldete danach
keinen Befund; dies ist keine allgemeine Sicherheitsgarantie.

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
`reports/integration/security-refresh-20261021/adapters/`.
