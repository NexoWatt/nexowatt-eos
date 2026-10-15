# Asset-only Helper: Prüfbericht 15.10.2026

Arbeitsbasis: `e4616fec2a56cd7c6c013df090bdda00a0c37f54`, veränderter lokaler Quellbaum; kein Commit oder veröffentlichtes Release dieses Berichts.

## Ergebnis und Umfang

72 isolierte Tests bestanden: 21 Asset-Helper, 4 Upload-Unit, 32 Enrollment und 15 native Harness-Vertrags-/Archivparserprüfungen. Tatsächliche Befehlsausgabe steht in `contracts.log`; `source-sha256.txt` bindet die geprüften Helper-/Unit-/Enrollment-Dateien. Umgebung Linux x64, Node 24.19.0, nicht die qualifizierte Zielversion 24.21.0. Syntaxprüfung und `git diff --check` bestanden separat.

Der tatsächliche Helper wird gegen In-Memory-Objects-/Dateiclients und die echten Enrollmentvalidatoren geprüft. Es wird keine PostgreSQL-, HTTPS-, Systemd-, Signatur-, Pi- oder Hardwareabnahme behauptet. Die Verbindungseinstellungen enthalten nur inerte Fixturewerte und stellen keine echten TLS-Zugangsdaten dar.

## Behobener Fehler

Die unveränderte R9-CLI `upload NAME` führt Objekt-Upgrades aus und kann bestehende Instanzen verändern. Die rohe Upload-API hat zusätzlich mögliche Restart-Seiteneffekte im WWW-Pfad und verschluckt Datei-Schreibfehler. Der neue Helper verwendet stattdessen ausschließlich begrenzte, feste Quell-Dateipfade und die tatsächliche Dateispeicher-API, ohne CLI-/Upgrade-/Restart-Aufruf.

Readback prüft jede Länge, SHA-256 und MIME-Angabe. Die vollständigen sechs Instanzdokumente und vier Marker müssen vorher/nachher identisch sein. Benutzerdateien und nicht ausdrücklich enthaltene Pfade werden nicht gelöscht. Ein dokumentierter Teilfehler kann mit denselben signierten Quelldateien wiederholt werden; er wird nicht als Erfolg gemeldet.

## Negativprüfung und Peerreview

Abgewiesen werden laufende oder unbestätigt gestoppte Prozesse, Zusatzinstanzen, TLS-Downgrade, Namespace-Kollision, ungeschützte/fehlende Quellpfade, Symlinks, Hardlinks, unsichere Rechte, Übergröße, Schreibfehler, falscher Readback, Quellenänderung und unerwartete Instanz-/Markeränderung. Nach erfolgreichem Upload funktioniert im Test der originale exakte Enrollment-Rollback.

Ein unabhängiger Peer fand zunächst einen ignorierten Fehler bei der Clientbereinigung. Dieser wurde behoben: alle Clients werden bereinigt; Cleanupfehler verhindern einen sonst erfolgreichen Abschluss und ersetzen nicht den ursprünglichen sicheren Fehler. Der Peer führte anschließend 25 Helper-/Unit-Tests erfolgreich aus und meldete keinen weiteren eng begrenzten Helper-Implementierungsblocker. Das ist Peerreview, keine externe Zertifizierung.

## Offene Abnahme

Der echte native Sechs-Adapterlauf muss den Helper mit geschützter Kandidaten-App und realen PostgreSQL-Clients vor dem Start sowie nach erneutem Enrollment ausführen. Authentifizierte Admin-HTTPS-Abrufe müssen die neuen Konfigurationsdateien nachweisen. Exakte Vor-/Nachstartmigration, Alt-Release-Asset-Rückfall, signierte Lieferung, Pi/ARM64, reale Systemd-Mountgrenzen, Anlagenfunktionen und CRA-/Produktionsabnahme bleiben gesonderte Nachweise. Die zuständigen Integrationsmodule und deren Quellenbindung werden parallel vervollständigt.
