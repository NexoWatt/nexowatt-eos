# Prüfbericht NexoWatt EOS 1.0.13

Datum: 18.09.2026. Basis: vollständiges Repository 1.0.12. Umgebung:
Node.js 24.19.0, Linux, Chromium/Playwright. Keine echte Anlage, kein externer
SMTP-Versand und keine Veröffentlichung auf GitHub/npm.

## Ergebnis

- `npm run admin:build`: erfolgreich; gemeinsamer Seitenkopf enthält das vorhandene Logo als eigenes Build-Asset.
- `npm run build:ts`: erfolgreich; produktive JS-Dateien und typisierte Spiegel synchron.
- `npm run test:all`: vollständig erfolgreich, Exit-Code 0. Enthält Typechecks, Rollen-HTTP-Tests, AC/DC, Speicher, Benachrichtigungen, Dokumentation und Release-Prüfungen.
- `npm run publish:check`: erfolgreich; veröffentlichte Dateien entsprechen dem unveränderlichen Release-Manifest, keine Funde innerhalb der implementierten Secret-Regeln.
- `npm pack --dry-run --json --ignore-scripts`: erfolgreich; 355 Paketdateien stimmen exakt mit der freigegebenen Dateiliste einschließlich Logo überein.
- Zusätzliche Browserprüfungen `verify-stable-1.0.9-browser.cjs` und `verify-stable-1.0.7-notifications-browser.cjs`: erfolgreich. Echte ausgelieferte JS-Bundles und lokaler HTTP-Server; externe Systeme sind Test-Fixtures.
- Historische Rollen-Vertragstests zu Customer-Workspace, DP-Mapping, Rollenaufteilung und App-Center-Sperre: auf die ausdrücklich geänderte Rollenregel angepasst und bestanden.

## Geprüfte Zugriffsfälle

Kunden und alte Kunden-Sessions mit Wildcards bekommen bei Einrichtung,
Konfigurationslesen/-schreiben, DP-Suche/-Zuordnung und NexoLogic HTTP 403;
fehlende/abgelaufene Sessions HTTP 401. Direkte HTML-Pfade, Kurzpfade und
`/static/`-Umwege sind einbezogen. Die Sperren gelten auch bei deaktivierter
Kundenanmeldung sowie offener/LAN-Kundenbedienung. Abgewiesene Schreibversuche
persistieren keine Konfiguration.

Installer und Admin können die Einrichtung laden und speichern; Import,
Speichern und erneutes Laden wurden auch im Browser geprüft. Kunden sehen
keinen Einrichtungseinstieg und bekommen die Raumstruktur über das getrennte
Lesemodell. Schalten einer konfigurierten Geräte-ID funktioniert; eine frei
übergebene DP-ID sowie ein schreibgeschütztes Gerät bewirken keinen Schreibzugriff.
SMTP und Lizenz bleiben Admin-only.

## Logo und Auslieferung

Das Logo wurde im Browser unter `/mail-setup/` dekodiert (192 Pixel Quelldatei),
bei 390 und 1280 Pixel Fensterbreite kontrolliert und zusätzlich unter dem
Admin-Mount `/adapter/nexowatt-ui/react/` geladen. Der reale Runtime-Endpunkt
`/admin.png` liefert erwartungsgemäß 404; der korrigierte Build benötigt ihn
nicht. Keine horizontalen Überläufe in der geprüften Mail-Seite.

Der vollständige Publish-Ablauf wurde in einer frischen Repository-Kopie und
nach simuliertem ZIP-Überkopieren mit alten Admin-Bundles geprüft. Beide
Varianten ohne Entwicklungsabhängigkeiten erfolgreich. Ein zufällig erzeugter
Secret-Testfund blockiert weiterhin. Die lokale Test-Registry veröffentlicht
kein Paket. Ein nativer Windows-Lauf sowie Live-Hardwaretests wurden nicht
durchgeführt; die vorhandenen Pfadtests enthalten Leerzeichen und Umlaute.
