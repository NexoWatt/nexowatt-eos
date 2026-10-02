# NexoWatt EOS 1.0.15 – Validierung

Stand: 19.09.2026. Geprüft mit Node.js 24.19.0. Tests verwenden lokale simulierte Messwerte und Loopback-HTTP; keine Feldgeräte, echten E-Mails oder externen Veröffentlichungen.

## Neue Funktionsprüfungen

- Bedarfsabhängige Trafoverteilung, freie Hausreserven, Hysterese, Import/Export, Phasen und Stränge.
- 99 Slaves mit 250-ms-Takt und simulierter Anwendung nach 750 ms; Reservierungsinvarianten und Rückfall bei Ausfall.
- Anlaufbedarf wartender AC-/DC-Punkte, vollständige Mindestfreigaben bei knapper Trafoleistung und Verwerfen veralteter Bedarfsdaten.
- Stabile Befehlsnummer und erster erfolgreicher Anwendungszeitpunkt bei schnellen EMS-Zyklen.
- Dauerhafte Originalzählerstände, Offline-Nachlieferung, ACK nach Speicherung, Neustartabgleich, idempotente Dubletten und Ablehnung veränderter bzw. fehlender Sequenzen.
- Rücksprung über Messlücke und Neustart, neue Zählerepoche, beschädigte Datei und Archivkapazitätsfehler.
- Exakte Randstände, getrennte Bezugs-/Einspeisemengen, ganzzahlige Centrechnung, Teilzeitraum und gesperrter Zählerwechsel.
- Persistente Betreiber-Gesamtfreigaben und Strategiewechsel ohne Protokollneustart.

## Releaseprüfung

Erfolgreich abgeschlossen:

- `npm run admin:build` und `npm run build:ts` einschließlich Typausgabe.
- `npm run docs:build` und `npm run docs:check`; deutsche Modulbeschreibungen, Quellcode-Index und Verknüpfungen aktuell.
- `npm run test:all`: vollständige bisherige Suite einschließlich AC/DC, Speicher, Lizenzen, SmartHome-Rechten, SMTP-/Secret-Schutz und der neuen Microgrid-Prüfungen.
- `npm run publish:check`: Secret-Schutz, aktueller Admin-Build, Versionskonsistenz und unveränderliches Dateimanifest erfolgreich.
- `npm pack --dry-run --json --ignore-scripts`: 370 Paketdateien; keine Veröffentlichung.
- `npm run test:package-runtime-start-smoke`: 214 JS/MJS-Dateien syntaktisch gültig, relative Runtime-Abhängigkeiten vollständig und Adapter-/EMS-/§14a-Startkette konstruierbar.
- Fresh-/Overlay-Prüfung innerhalb der Gesamtsuite: vollständige Publish-Prüfkette ohne Entwicklungsabhängigkeiten; alte Admin-Dateien gesichert, aktuelle Dateien unverändert; echter Test-Secret-Fund blockiert weiterhin. Registry-Antworten wurden lokal simuliert.

Die Mesh-Prüfungen umfassen 20 Kommunikations-/Sicherheitsgruppen, 14 Trafo-/Archivgruppen sowie reale Express-Rollentests bei aktivierter und deaktivierter normaler Kundenanmeldung. Alte Kunden-Wildcards gewähren keinen Zugriff auf Betreiber-/Archivfunktionen. Ungültige Signaturen und übergroße Regel-/Archivnachrichten werden abgewiesen.

Der ausgelieferte React-Build wurde mit Playwright/Chromium geprüft: Installer-Zugang, 99 Teilnehmer, Auswahl des letzten Teilnehmers, gesperrter 100. Slave, Archivoption und Speichern der Betreiber-Gesamtfreigabe; mobile Ansicht ohne horizontalen Seitenüberlauf; keine JavaScript-Fehler. Die Betreiberansicht wurde zusätzlich visuell kontrolliert.

## Gemessene lokale Kommunikationszeiten

Abschließender Lauf, alle 99 Slaves in einem lokalen Testprozess mit simulierten Messwerten:

| Prüfung | Ergebnis |
| --- | ---: |
| Paralleler Handshake plus erste Freigabe aller 99 Slaves | 302 ms insgesamt |
| Warme Verbindungen, 8 Runden im 250-ms-Takt | 792 gültige Antworten |
| Antwortzeit P95 während paralleler Archiv-fsync-Schreibvorgänge | 72 ms |
| Größte Antwortzeit in diesem Lauf | 78 ms |

Der Test misst HTTP-Austausch auf Loopback während 256 zusätzlichen Archivschreibvorgängen. Er misst weder das Tailscale-Netz noch einen realen Zähler-/EMS-/Stellgeräte-Regelkreis. Separat prüft die Protokollsimulation 99 Teilnehmer mit verzögerter Anwendung, Normalbetrieb, Reservierung, Wiederanlauf und Ausfall. Die Laborwerte sind keine garantierte Anlagenlatenz.

## Grenzen der Aussage

Die Prüfungen belegen Softwareverhalten, keine Feldlatenz über Tailscale und keine physische Rückfallwirkung von Geräten. Die projektspezifische Inbetriebnahme mit Trafo-/Hauszählern, gleichzeitigen Lastsprüngen, Teilverbindungen, Master-/Slave-Neustarts und unabhängigen Geräte-Watchdogs bleibt erforderlich. Abrechnungsentwürfe ersetzen keine Prüfung der Eichung oder rechtlichen Abrechnungsvoraussetzungen.
