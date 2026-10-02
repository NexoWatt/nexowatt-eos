# NexoWatt EOS 1.0.14 – Microgrid-Ausbau

Die offizielle Stable-Version des Repositorys erweitert die Microgrid-App um einen festen EOS-Master mit bis zu 99 Slaves über ein separat betriebenes Tailscale-Netz. Der neue Regelbetrieb benötigt projektspezifische Inbetriebnahme; die Softwareprüfung ist kein Nachweis einer realen Anlage mit 100 Geräten.

## Änderungen

- Eigene Slave-Verbindungen mit Keep-alive, festem Anfrage-Timeout, begrenzten Nachrichten und individuellen HMAC-Schlüsseln. Keine serielle 99-Geräte-Abfrage im EMS-Zyklus.
- Befristete, an Sitzung/Knoten/Konfiguration gebundene Masterbudgets; Rückfall, Reservierung unbestätigter Altbudgets, gemeinsamer Störbetrieb und begrenzter Wiederanlauf.
- Haus-, Strang-, Phasen- und Kategoriegrenzen; lokale SafetyEnvelope und finale generische Speicher-/PV-Schreibpfade prüfen aktuelle Grenzen erneut.
- Installer-/Admin-Einrichtung mit Paarung, 99-Teilnehmerübersicht, Antwortzeit, Messwertalter, Bestätigung und reserviertem Budget. Kunden erhalten keinen Zugriff auf Einrichtung und Nachbarhaus-Diagnosen.
- Verschlüsselte Instanzkonfiguration; beschädigte Konfiguration verriegelt statt Schutz stillschweigend auszuschalten. Bisherige Mesh-Feldteststeuerung wird bei eingerichtetem Coordinator ausgeschlossen.
- Schnellere npm-Vorprüfung: CommonJS-Syntax wird ohne einen neuen Node-Prozess je Datei kompiliert. ESM und Syntaxfehler laufen weiterhin durch `node --check`. Alle bisherigen Publish-Gates bleiben erhalten; es wird weder beim Publizieren neu gebaut noch neu versiegelt.
- Ein zusammengefasstes Microgrid-Störungsereignis nutzt die bestehende Benachrichtigungspolitik: Anlaufprobleme normal, Verlust einer zuvor laufenden Regelung oder verriegelte Konfiguration kritisch; Wiederholschutz bleibt aktiv.
- PWA-Cache v513, aktualisierte deutsche Quellcode-Erklärungen und neue Regressionstests.

## Einsatzgrenzen

[Einrichtung, Sicherheitsvertrag und Ausbaustufen](MICROGRID_MASTER_SLAVE_DE.md) vor Aktivierung lesen. Der unabhängige Geräte-Watchdog und die physische Rückfallwirkung müssen vor Ort geprüft werden. Die neue aktive Speicheranbindung unterstützt zunächst generische W-Sollwerte bzw. numerische W-Limits; Hersteller-Sondermodi und Speicherfarmen bleiben für Mesh-Aktivierung gesperrt. Aktive Topologieänderungen und Energie-Abrechnungsarchive sind nicht Bestandteil dieser Ausbaustufe.

Vorhandene AC/DC-Regelung, SmartHome-Rollen, SMTP-Verwaltung sowie Home-/Pro-Speicherfarm-Lizenzgrenzen bleiben Teil der Gesamtregression. Es wurden keine echten Geräte angesteuert, E-Mails gesendet oder externe Veröffentlichungen durchgeführt.

## Prüfungen

Der separate Prüfbericht beschreibt die tatsächlich ausgeführten Softwaretests: [Validierung 1.0.14](reports/STABLE_1_0_14_VALIDATION_DE.md).

## npm veröffentlichen

Das vollständige Repository übernehmen, einschließlich `scripts`, `package.json` und des gebauten Admin-Verzeichnisses. `npm publish --tag latest` bleibt der normale Befehl; der Versionsguard muss die Zielversion auf npm freigeben. Die ZIP allein veröffentlicht nichts. Sicherheitsprüfung, Hashmanifest, Stable-Metadaten, Runtime-Abhängigkeiten und Start-Smoke bleiben aktiv.
