# Prüfung NexoWatt EOS 1.0.16

Stand: 19.09.2026. Ausgangsbasis: vollständiges Repository 1.0.15.

## Umfang und Ergebnis

Die gemeinsame EMS-App-Sichtbarkeit, geschützte Seiten/APIs, Installation und Aktivierung, Versionsmigration bestehender Verbünde sowie der Schutz aktiver Konfigurationen vor Aus/Deinstallation wurden geprüft. Der vollständige Lauf `npm run test:all` ist erfolgreich abgeschlossen. Es wurden keine Tests oder Release-Sicherheitsprüfungen entfernt.

## Prüfumgebung und Grenzen

Node.js 24.19.0 und npm 11.9.0 auf Linux; reale Express-Routen mit ioBroker-Fixtures sowie Chromium/Playwright für die ausgelieferte Oberfläche. Konfigurationen und Zählerarchive liegen während der Tests in temporären Verzeichnissen. Keine Verbindung zu produktiven Geräten, SMTP-Konten oder Tailscale-Standorten. Die Tests ersetzen keine Inbetriebnahme der realen elektrischen Anlage.

## Geprüftes Verhalten

- Microgrid-Einrichtung, Master/Slave-Betrieb, Betreiberübersicht und optionales Zählerarchiv sind über den gemeinsamen EMS-App-Reiter erreichbar. Der bisherige separate Installer-Eintrag entfällt.
- Nicht installiert: kein Microgrid-Konfigurationsreiter, kein Betrieb, keine Kommunikation und keine Archivaufzeichnung. Direkte und alte Seiten-/API-Zugriffe werden gesperrt. Die Katalogkarte bleibt zum Installieren sichtbar.
- Installiert, aber inaktiv: Einrichtung ist möglich, aktive Regelung und Kommunikationskanäle bleiben gesperrt. Aktivieren, Deaktivieren und erneutes Aktivieren einer Diagnoseanlage folgen dem AppCenter-Zustand.
- Bereits konfigurierte Verbünde aus 1.0.14/1.0.15 werden einmalig der EMS-App zugeordnet; Paarungen, Grenzwerte und Protokollzustand bleiben erhalten. Eine spätere ausdrückliche Deinstallation wird nicht durch die Migration rückgängig gemacht.
- Eine aktiv in Betrieb genommene oder verriegelte Anlage kann weder über AppCenter-Speichern noch über Backup-Import ihres Schutzes beraubt werden. Bei von außen manipulierten App-Flags bleiben die erforderlichen lokalen Rückfallgrenzen wirksam. Eine kontrollierte physische Außerbetriebnahme ist weiterhin erforderlich; ein automatischer Außerbetriebnahme-Assistent ist nicht Bestandteil dieser Änderung.
- Die Speichersperre verhindert konkurrierende App- und Microgrid-Konfigurationsänderungen. Alte Bridge-/Feldtest-Schreibwege sind bei inaktiver App sowie bei Zuständigkeit des Master/Slave-Reglers gesperrt.
- Browserprüfung: eingebetteter EMS-Reiter, 99 Slaves, mobile Darstellung, ausgeblendete Konfiguration nach Deinstallation und entfernter Installer-Eintrag. Direkte API-Rollenprüfung mit aktivierter und deaktivierter Anmeldung; alte Kunden-Wildcards gewähren keine Microgrid-Einrichtung.
- 20 Kommunikations-/Schutzprüfgruppen sowie 14 Trafo-/Zählerarchivprüfgruppen bestanden: Ausfälle, Wiederverbindung, Lease-Ablauf, Replay, Neustart, Budgetreservierung, endgültige Schreibgrenzen, Offline-Nachlieferung, Dubletten und Archivfehler.
- Im abschließenden lokalen HTTP-Test mit 99 warmen Kanälen und paralleler Archivspeicherung: 792 Antworten, P95 80 ms, Maximum 81 ms. Diese Werte stammen ausschließlich aus Loopback-Simulationen und sind keine Zusage für Tailscale oder reale Geräte.
- Bestehende Regressionen für AC/DC-Laden, Netzanschlussschutz, Speicher, Home-/Pro-Lizenzen, Benutzerrechte, Benachrichtigungen und Dokumentation bestanden.

## Build und Auslieferungsprüfungen

- `npm run admin:build`: ausgelieferte React-Oberfläche erfolgreich gebaut.
- `npm run build:ts`: TypeScript-Build erfolgreich; manuell typisierte Spiegel erhalten.
- `npm run test:all`: vollständiger Prüflauf erfolgreich, einschließlich realer Browserprüfungen.
- `npm run docs:check`: 232 deutsche Modulbeschreibungen mit Quellverknüpfungen synchron. Alle 551 Markdown-Dateien liegen unter `docs/`.
- `npm run release:prepare` und `npm run publish:check`: Sicherheitsprüfung und unveränderliche Paketartefakte geprüft.
- `test:publish-overlay`: vollständige Publish-Prüfkette gegen eine lokale Test-Registry für frische Kopie und Überkopieren über alte Admin-Assets bestanden; aktuelle Dateien bleiben bytegleich. Ein echter Secret-Testfund blockiert weiterhin ohne Offenlegung seines Werts.

Die zwei angepassten älteren Tests prüfen die geänderten Verträge: AppCenter als einzige Aktivierungsquelle sowie Freigabe der neuen Speichersperre auch bei einem Lizenzfehler. Die bisherigen Lizenz- und Sicherheitsassertionen bleiben erhalten. Es erfolgte keine Veröffentlichung auf npm oder GitHub.
