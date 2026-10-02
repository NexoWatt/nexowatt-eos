# Lizenzverwaltung: simulierte Browserprüfung

Ausgeführt: 2026-09-30T17:33:59.360Z; Chromium 153.0.8010.0.

Umfang: lokale HTML-/JS-Dateien mit vollständig abgefangenen, simulierten Antworten. Keine Verbindung zu ioBroker, Hersteller-Keygen, Geräten oder Produktivdaten. Diese Prüfung weist weder echte HTTP-Zugriffskontrolle noch Verschlüsselung nach.

8 Prüffälle bestanden. Home/Pro-Anzeige, Codefeld-Löschung bei erfolgreicher und fehlgeschlagener Aktivierung, 403-Fehleranzeige, reine Textausgabe von HTML-Testwerten, keine JavaScript-Seitenfehler, kein horizontaler Überlauf bei 360 Pixeln. Desktop- und Mobilbilder wurden visuell auf Lesbarkeit, Abschneiden und Überlagerungen geprüft.

Keine offenen Befunde in diesem begrenzten Prüfumfang.

UI-PREVIEW-01 wurde beim ersten Lauf gefunden und anschließend behoben: Bei HTTP 401/403 blieb zuvor der alte grüne Gültigkeitstext sichtbar. Der Nachtest startet jeweils mit gültigem Pro-Status und bestätigt jetzt den Text „Status derzeit nicht bestätigt.“ mit Fehlerdarstellung. Details unter `closedFindings` in den Rohdaten.

Rohdaten und SHA-256 der tatsächlich dargestellten Quellen: [evidence.json](evidence.json). Screenshots liegen im selben Verzeichnis.

Wiederholung aus dem Repository: `EOS_UI_PREVIEW_CHROMIUM=/pfad/zu/chromium node reports/security/ui-preview/run-preview.cjs`. Zusätzlich muss `CODEX_PRIMARY_RUNTIME_NODE_MODULES` auf eine Laufzeit mit installiertem Playwright zeigen.
