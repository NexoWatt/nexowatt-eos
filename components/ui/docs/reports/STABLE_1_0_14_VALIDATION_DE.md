# Validierung 1.0.14

Umgebung: Linux, Node.js 24.19.0, lokaler Chromium, simulierte ioBroker-States und Messungen. Keine externe Veröffentlichung, kein echtes Tailnet und keine physische Geräteansteuerung. Vorheriger Stand: 1.0.13.

## Gezielte Prüfungen

- 99 Teilnehmer, Abweisung eines 100. Slaves, doppelte IDs, fehlerhafte Rückfallsummen.
- Individuelles HMAC, Manipulation, alte Sequenzen/Boots/Revisionen, Master-Neustart und verspätete Antworten.
- Konservative Reservierungen, gemeinsamer Rückfall bei fehlendem Teilnehmer, erneute Stabilitätsprüfung nach Hauptzählerausfall, langsamer Wiederanlauf.
- Gemeinsame SafetyEnvelope: Boost-Anfrage und mehrere Ladepunkte teilen das Kategorie-Budget; Ablauf/Phasenabsenkung gibt alte Planung nicht frei.
- Numerische finale PV-/Speichergrenzen, Nullgrenzen, Exportbudget.
- Echte HTTP-Kommunikation auf Loopback mit 99 gleichzeitig gestarteten Slaves. Handshake und erste Freigabe lagen in den gezielten Läufen bei ungefähr 140–300 ms (im abschließenden Gesamtlauf: 154 ms) für die gesamte Gruppe. Ein fehlerhafter Kanal blockierte die anderen 98 nicht. Dies ist keine zugesagte Feldlatenz.
- Verschlüsselte Konfigurationsspeicherung, Wiederladen, beschädigte Datei sowie fehlende Datei nach Aktivierung: Verriegelung statt Freigabe.
- Reale Express-Routen: Installer/Admin, abgewiesene Kunden und alte Wildcard-Sessions, Auth aktiviert/deaktiviert, Schlüssel nicht in GET, unsignierte Nachrichten und zu große Bodies abgewiesen.
- Ausgelieferter React-Build in Chromium: 99 Teilnehmer, Auswahl des letzten Slaves, gesperrte Hinzufügen-Schaltfläche bei 99, mobile Breite und keine JavaScript-Laufzeitfehler.
- Ein gemeinsames Mesh-Meldeereignis: Diagnose stumm, Anlaufwarnung normal, späterer Regelungsausfall und Konfigurationsverriegelung kritisch.

## Publish-Leistung

Für dieselben 210 ausgelieferten JavaScript-Dateien brauchte die neue reine Syntaxprüfung etwa 665 ms statt 11.629 ms mit einem separaten Node-Aufruf je Datei (Faktor 17,5). Diese Messung erfolgte auf Linux, betrifft nur die Syntaxprüfung und ist keine zugesagte Windows-Publish- oder Netzwerk-Uploadzeit. Die vollständige Publish-Prüfkette und die Sicherheitsgates bleiben aktiv.

## Release-Gates

Erfolgreich ausgeführt: `npm run test:all` (Exit 0, einschließlich der 19 neuen Microgrid-Prüfgruppen sowie HTTP-/Browser-Prüfung), `npm run build:ts`, `npm run publish:check`, Dokumentationsprüfung, Paket-Runtime-Smoke und `npm pack --dry-run --json --ignore-scripts`. Die Fresh-/Overlay-Prüfung führt die echte `prepublishOnly`-Kette gegen eine lokale 404-Testregistry aus, ohne extern zu veröffentlichen. Ein künstlicher Secret-Fund blockierte weiterhin ohne Ausgabe seines Werts.

Vor Aktivierung auf einer Anlage sind tatsächliche Tailscale-Laufzeiten, Zählerfrische, Gerätebestätigungen, unabhängige Watchdogs und reale Rückfallzeiten nachzuweisen. Nicht unterstützte Speicher-Sondermodi und Live-Topologieänderungen bleiben gesperrt; weitere Ausbaustufen stehen im [Einrichtungsdokument](../MICROGRID_MASTER_SLAVE_DE.md).
