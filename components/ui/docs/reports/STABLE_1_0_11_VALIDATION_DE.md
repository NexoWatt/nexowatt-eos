# Prüfung 1.0.11 – Quellcode-Dokumentation

Basis: vollständiges Repository 1.0.10. Geprüft am 18.09.2026 mit Node.js 24.19.0.

| Prüfung | Ergebnis |
| --- | --- |
| 223 selbst gepflegte TS-/TSX-Quellen | Syntaxbäume ohne Kommentare identisch zur Basis |
| 166 Produkt-JavaScript-Dateien unter main.js, ems, lib und www | Ausführbare Syntax identisch zur Basis; Unterschiede ausschließlich Kommentare |
| React-Admin-Build | HTML, JavaScript und CSS bytegleich zur Basis |
| Dokumentationsprüfung | 223 Modulbeschreibungen und 224 Katalogseiten synchron |
| Negative Dokumentationstests | Quellenänderung, neue Quelle, fehlende Beschreibung, veränderter Katalog, unvollständiges Manifest und fehlende Datei erkannt |
| Neue/aktualisierte Dokumentationslinks | 7.322 lokale Links in 229 Dokumenten auf vorhandene Ziele geprüft |
| npm run test:all | Erfolgreich, einschließlich bestehender EMS-/AC-/DC-/Rollen-/Mail-/Sicherheitsregressionen und neuer Dokumentationsprüfung |
| npm run build:ts | Erfolgreich; kanonische Laufzeit und typisierte Spiegel synchron |
| Browserprüfung 1.0.7 | Geschützter SMTP-Einstieg, Felder/Speichern/Fehler, leeres Passwort beibehalten, Mobilansicht und Sitzungsverlust erfolgreich |
| Browserprüfung 1.0.9 | Kunden-SmartHome-Einstieg/Import/Speichern/Neuladen, Rollen- und Direktzugriffsschutz, Admin-SMTP erfolgreich |
| npm run publish:check / verify-publish | Artefakte, Metadaten, gezielte Secret-Regeln und Syntax erfolgreich geprüft |
| npm pack --dry-run --json --ignore-scripts | 348 npm-Paketdateien; 347 explizit im Artefaktmanifest aufgeführte Dateien plus package.json |

Die Prüfung bewertet die vorhandene Software und isolierte Testfälle. Es wurden keine Mails an Kunden versendet und keine realen Wallboxen/Speicher angesteuert. Der Katalog ist statisch; er ersetzt bei dynamischen API-/State-Verbindungen die fachlichen Erläuterungen nicht. Die automatische Dokumentationsprüfung erkennt Pflegeabweichungen, beweist aber nicht die inhaltliche Richtigkeit jeder Erklärung.
