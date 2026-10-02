# NexoWatt EOS 1.0.9

Dies ist die offizielle Stable-Version 1.0.9.

## Bedienung und Rollen

| Funktion | Kunde | Installer | Admin |
| --- | --- | --- | --- |
| SmartHome einrichten und speichern | Ja, gemäß Kunden-Zugriffsrichtlinie | Ja | Ja |
| SmartHome-Datenpunkte suchen und zuordnen | Ja, gemäß Kunden-Zugriffsrichtlinie | Ja | Ja |
| App-Center und Anlageneinrichtung | Nein | Ja | Ja |
| SMTP-Versand konfigurieren | Nein | Nein | Ja |
| Lizenz lesen und verwalten | Nein | Nein | Ja |

„SmartHome einrichten“ ist direkt in SmartHome und unter Einstellungen erreichbar.
Die vorhandenen Kundenrichtlinien (offene Bedienung, Anlagen-LAN/VPN oder
Kundensitzung) bleiben wirksam. Die Aktionsleiste des Gebäude-Editors bricht
auf schmalen Displays um, sodass Speichern erreichbar bleibt. Beliebige Datenpunkt-Testschreibzugriffe und
vollständige Anlagen-Backups bleiben im Installer-/Admin-Bereich.

SMTP- und Lizenzverwaltung prüfen die Admin-Rolle serverseitig und in der
Oberfläche. Direkte Links, API-Aufrufe, alte Installer-Sitzungen mit früheren
Lizenzrechten und deaktivierte allgemeine Kunden-Authentifizierung öffnen diese
Bereiche nicht. Die Lizenzaktivierung bleibt für Admins auch ohne aktive Lizenz
erreichbar. Das Installer-App-Center erhält nur die benötigten Feature-Grenzen.

Home unterstützt weiterhin höchstens 2 konfigurierte Speicher, Pro höchstens 10.
Die AC-/DC-Regelung und die Meldeintervalle bleiben erhalten: harte Fehler sofort
bei Erkennung, normale Fehler gebündelt alle 30 Minuten, übrige Meldungen täglich.

## Repository

Alle Markdown-Dateien liegen unter `docs/`, ältere Berichte unter `docs/reports/`.
Die [Startseite](README.md), der [Changelog](CHANGELOG.md), Paketpfade,
Dokumentationslinks und Release-Prüfungen verwenden die neue Struktur.

## Prüfung und Grenzen

Die Zugriffsprüfung verwendet den tatsächlichen lokalen Express-Webserver mit
simuliertem ioBroker-Speicher und Mailtransport. Sie prüft Admin, Installer und
Kunde, direkte URLs und APIs, alte/abgelaufene Sitzungen, Lizenzaktivierung sowie
SmartHome speichern und neu laden. Der zusätzliche Browsertest verwendet die
gebauten Oberflächen. Am 17.09.2026 bestanden: `npm run test:all`,
`npm run build:ts`, Admin-Build sowie der zusätzliche Rollen-/SmartHome-Browsertest.
Damit sind auch die bisherigen AC/DC-, Speicher- und Benachrichtigungstests
eingeschlossen. Paketversiegelung und npm-Paketinhalt werden abschließend geprüft.

Es werden dabei keine Kunden-E-Mails versendet und keine realen Ladepunkte oder
Speichersysteme angesteuert. Eine Aussage zur Regelung an der konkreten Anlage
setzt deren Inbetriebnahmeprüfung voraus.
