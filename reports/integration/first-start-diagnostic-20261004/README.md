# Dateidiagnose für abgebrochenen EOS-Erststart

Änderung `EOS-FIRST-START-DIAGNOSTIC-01`, 04.10.2026. Ausgangsstand siehe
`verification.json`; neue Dateien ändern keine historischen signierten Pakete.

Anlass ist die vom Nutzer gemeldete R4-Installation mit beendetem Controller,
aktivem PostgreSQL und Wartungssperre. Ein normaler R6-Updater setzt einen
erfolgreichen Erststart voraus. Die neue Diagnose macht den noch fehlenden
Dateizustand sichtbar, ohne Nutzerdaten zurückzusetzen.

Der allein mit Node-Standardbibliotheken arbeitende Helfer ist auf feste Pfade
begrenzt. Er liest normale, einfach verknüpfte Dateien mit Größenlimit und prüft
Besitz/Rechte. Verzeichnisdeskriptoren halten geprüfte Elternpfade fest, damit ein
austauschbarer Onboarding-Elternpfad nicht auf fremde Dateien umleitet. Ausgabe
besteht aus festen Statuswerten, bekannten Revisionsbezeichnungen, begrenzten
Schemanummern und booleschen Vergleichen. Fehlermeldungen und unbekannte
Zeichenfolgen werden nicht übernommen. Weder Runtime-Code aus dem installierten
Baum noch Datenbank-Clients werden geladen.

Ausgeführt: `node --test tests/system/first-start-diagnostic.test.cjs`.
Die Tests prüfen tatsächliche Dateigrenzen und Ausgaben auf einem Linux-
Testdateisystem: unveränderte Inhalte/Rechte/Verzeichnisse, Geheimnisunterdrückung,
unbekannte Kennungen, abweichende Bindungen, symbolische/hart verknüpfte Dateien,
Elternpfade, Dateigrößen, JSON/UTF-8, Besitz/Rechte und Ablehnung von CLI-Optionen.
Rohbeleg und Ergebnis liegen neben diesem Bericht.

**OFFEN:** Ausführung auf dem Nutzer-Pi, Prüfung signierter installierter Dateien,
Datenbankmarker und Lizenz, Zustand aller Dienste, Wiederherstellung und
Controller-/Login-/Neustarttest. Dieser Helfer repariert keinen Laufzeitfehler
und erteilt niemals eine Start- oder Produktionsfreigabe.
