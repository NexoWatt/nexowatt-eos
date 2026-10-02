# Prüfbericht: NexoWatt EOS-Grundsystem für die Testumgebung

Stand 01.10.2026 · `0.1.0-test.1` · Änderungskennung `EOS-BASE-20261001`.
Ausgangspunkt des Installer-Repositories:
`adc05680319a9a1c9d0a4b0771b248ebee10dc4e`.
Der konkrete Liefercommit, das signierte Manifest und die Archivhashes werden
im Liefernachweis geführt. Alle Aussagen gelten für diesen Entwicklungsstand.

## Ergebnis und Lieferumfang

Der Controllerkern ist implementiert und in einer isolierten Laborumgebung
tatsächlich gestartet, gestoppt und erneut gestartet worden. Er verwendet
zwei TLS-only Redis-Datenbanken. Gewöhnliche dynamische Installationswege und
ungeprüfte Adapterstarts sind gesperrt. Signierte Erweiterungspakete können
als neuer schreibgeschützter Stand bereitgestellt werden; sie erzeugen noch
keine aktiven Geräteinstanzen.

Das Lieferpaket enthält das **vollständige EOS-Installer-/Grundsystem-Repository**,
ein vorbereitetes Offline-Testbundle mit js-controller 7.2.2 und dessen
aufgelösten Abhängigkeiten sowie Dokumentation, Tests, SBOM und Rohbelege.
Es enthält **keine aktivierten Fachadapter oder Browser-Ersteinrichtung**.
EOS Admin 7, gehärtete UI 1.0.21, Devices, EEBUS, OCPP und Backup bleiben eigene
Integrationsaufgaben. Ihr Design, Quellcode und Energieregelverhalten wurden in
dieser Etappe nicht verändert. Der separate UI-Teststand wird dadurch nicht
automatisch zu einem Bestandteil dieses Core-Bundles.

**Freigabe:** Entwicklungs-/Laborteststand. Keine Serienfreigabe, keine
CRA-/IEC-Konformitätserklärung und keine unabhängige Zertifizierung.

## Sicherheitsmaßnahmen und tatsächliche Prüfung

| Kennung / Bereich | Umsetzung | Nachweis und Grenze |
| --- | --- | --- |
| EOS-BASE-TRANSPORT-01 | Zwei lokale Redis-Instanzen, TLS 1.3, CA-/SAN-Prüfung, getrennte zufällige Passwörter, Klartext aus | echte Redis-/Controller-Clientverbindungen, Nachrichten und PubSub geprüft; keine individuelle Adapteridentität |
| EOS-BASE-BOOTSTRAP-01 | Erststart ohne aktive Adapter; Admin-Erstkonto, Diagnosen, Repositories und automatische Updates gesperrt | echte Einrichtung plus negative Bootstrap-Tests; separate Ersteinrichtung/Lizenzierung offen |
| EOS-TEST-PROFILE-001 | Versions-/Hash-gebundener Controllertransform für ESM und CJS, feste Einstiegspunkte, keine freien Node-Startargumente | echte gebaute Funktionen und vollständiger transformierter Controller geprüft; kein vollständiger Upstream-TS-Neubuild |
| EOS-BASE-RELEASE-01 | Ed25519-signiertes Dateimanifest, exakte Versionen, erneute Datei-/Eigentümerprüfung vor Start | echte Signaturen und Dateimanipulationstests; Hersteller-Schlüsselbetrieb noch einzurichten |
| EOS-BASE-HOST-01 | getrennte Dienstkonten, keine sudo-/Dockergruppe, schreibgeschützter Code/Config, begrenzte Dienste | Hostaktionen simuliert, systemd-Syntax tatsächlich geprüft; echte unprivilegierte Zielausführung offen |
| EOS-BASE-EXTEND-01 | nur zusätzliche freigegebene Pakete, unveränderte bestehende Code-/Abhängigkeitsstände, kontrollierter Rückfall | echte temporäre Dateisystemoperationen, simulierte Dienste; tatsächlicher systemd-Update-/Stromausfalltest offen |

Die automatische Testzusammenfassung mit Befehlen, Ergebnissen und Rohdateien
steht in `reports/test-base/verification-summary.json`. Testzahlen werden dort
direkt aus den ausgeführten Testprotokollen übernommen, nicht aus geplanten Tests.

## Reale Laborprüfungen

Umgebung: Ubuntu 24.04 x86_64, Node 24.19.0, npm 11.9.0. Veröffentlichte
js-controller-/DB-Clientpakete 7.2.2, aufgelöstes ioredis 4.31.0.
Isoliert gebauter Redis 7.2.10 mit TLS war ausschließlich **Testwerkzeug**.
Herkunft und Hashbindung stehen in `reports/test-base/redis-tooling.json`.
Diese Redis-Version ist kein freigegebener OS-Paketstand für Geräte.

Nachgewiesen wurden:

- TLS 1.3 auf Haupt- und Abonnementverbindungen; Objekt-/State-Schreiben und
  -Lesen, Änderungsbenachrichtigungen und Messagebox-Transport.
- Abweisung falscher CA/SAN, abgelaufener Zertifikate, falscher/fehlender
  Authentifizierung, TLS 1.2, Klartext und gefährlicher Redis-Administrationsbefehle.
- Erhalt persistierter Testzustände und Wiederverbindung nach Redis-Neustart.
- Gewöhnliches `setup` ohne automatische Adapter, gesperrter Bootstrap,
  Controller-Heartbeat mit passender PID, kontrollierter Stopp und Wiederstart.
- Unveränderte TLS-Einstellungen nach dem Setup und strenge Startverweigerung
  bei unpassender Konfiguration oder manipuliertem Paketprofil.

Der volle Controllerlauf nutzte den im Upstream vorhandenen `CI=true`-Pfad für
die Test-UUID. Die native Ermittlung der Netzwerkschnittstellen ist hier
eingeschränkt. UID/GID-Wechsel auf 65534 waren ebenfalls technisch nicht möglich:
das Ausführungsumfeld bildet nur `0 → 0` ab. Daher liefen die erfolgreichen
Controllerprozesse mit Sandbox-UID 0. **Dies beweist nicht die unprivilegierte
systemd-Ausführung, Root-Isolation oder Hardwareidentität des Geräts.**

## Fehler, die während der Integration sichtbar wurden

Die Rohbelege behalten auch Fehlversuche unter
`reports/test-base/integration-attempts/`. Sie wurden nicht nachträglich als
erfolgreiche Prüfungen dargestellt.

1. Der Upstream-Controller benötigt beim Setup ein `tmp`-Verzeichnis im Paket.
   Eine signierte Markerdatei stellt es vor dem Schreibschutz bereit.
2. Das gesperrte Controllerprofil lehnt geerbte `NODE_PATH`-/`NODE_OPTIONS`-Werte
   ab. Die Dienstumgebung entfernt diese sowie weitere TLS-/Loader-Overrides.
3. Nach vollständiger Plugin-Deaktivierung entfernt der Controller alte
   Plugin-States. Bootstrap und Readiness wurden auf diesen belegten Vertrag
   abgestimmt; aktivierte/ungültige Zustände bleiben verboten.
4. Der Client kann nach Reconnect bereits `ready` melden, bevor PubSub-Abonnements
   vollständig wiederhergestellt sind. Ein Ereignis im Zwischenraum ging im
   Test verloren. Der erfolgreiche Nachtest prüft deshalb die serverseitigen
   Subscriptions und gleicht den aktuellen Zustand erneut ab. Eine lückenlose
   Ereigniszustellung oder genau-einmal-Ausführung wird nicht behauptet.
5. Die unabhängige Gegenprüfung innerhalb des Entwicklungsteams fand Fehler
   beim Rückfall nach Journal-/Schreibfehlern sowie beim Neustartlimit. Diese
   Fehler werden durch gezielte Negativtests abgesichert. Eine solche interne
   Gegenprüfung ist kein unabhängiger zertifizierter Penetrationstest.

## Abhängigkeiten und SBOM

Der tatsächliche npm-Baum enthält 253 Paketverzeichnisse und 250 eindeutige
Komponenten. CycloneDX 1.5 ist an Lockfile, Paketidentitäten und die kontrollierten
Controlleränderungen gebunden; die JSON-Schemaprüfung wurde offline ausgeführt.
Eigene Runtime-/Installerdateien sind zusätzlich durch die vollständige signierte
Dateiliste gebunden. OS-Pakete, Node-Binärdatei, Gerätefirmware und separat
ausgelieferte Adapter sind noch kein vollständiger Produkt-SBOM-Bestand.

`npm audit` meldet **drei moderate Paketbefunde derselben esbuild-Kette**.
Die untersuchte Nutzung ruft die Transformationsfunktion auf; der betroffene
Entwicklungsserver wird in dieser Testbasis nicht eingerichtet. Details,
Advisory und Bewertungsgrenzen stehen in
[`TEST_BASE_COMPONENTS.md`](../integration/TEST_BASE_COMPONENTS.md).
Es wird weder ein ungeprüftes Zwangsupdate durchgeführt noch ein Gesamtbefund
„keine Schwachstellen“ ausgegeben.

## Offene Produkt- und Zielgeräteprüfungen

| Restpunkt | Auswirkung / nächster Schritt |
| --- | --- |
| Echte Debian-12-/RPi-systemd-Abnahme | Dateirechte, Dienstkonten, restriktive Mounts, erster Start und Wiederstart auf 8-/16-GB-Geräten nachweisen |
| Fachadapter-Ersteinrichtung | bestehende Admin-/UI-/Gerätefunktionen und zentrale asymmetrische, geschützt gespeicherte Lizenzierung integrieren |
| Separate Adapter-Vertrauensgrenzen | TLS mit gemeinsam nutzbaren Datenbankrechten schützt nicht vor kompromittiertem zugelassenem Adaptercode |
| Direkte Adapter-/Geräteverbindungen | HTTP/MQTT/Modbus/OCPP/EEBUS separat aufnehmen; sie werden nicht automatisch durch Redis verschlüsselt |
| Zertifikatslebenszyklus | Testzertifikate 90 Tage, automatische Erneuerung/Alarmierung und geordneter Austausch fehlen |
| Geräte-Failsafe / Wiederaufnahme | frische Zustände, Grenzen, Kommunikationsausfälle und ausstehende Stellbefehle gerätespezifisch prüfen |
| Updates / Backup / Stromverlust | additive Paketpfade getestet; echte Wiederherstellung, SSD-Druck und unterbrochene Aktivierung auf Zielsystem noch offen |
| Tailscale | keine neue LAN-Sperre; tatsächlicher VPN-Zugriff, Rollen und Firewallregeln auf der Anlage prüfen |
| CRA-/IEC-Gesamtprodukt | Produktabgrenzung, Support/Schwachstellenprozess, vollständige Risikobewertung und anwendbares Konformitätsverfahren fortführen |

Der vorhandene Prozessbezug zu IEC 62443-4-1, technischen Anforderungen aus
62443-4-2/3-3, OWASP ASVS und CRA bleibt eine Anforderungszuordnung. Weder dieser
Code noch die Prüfzahlen ersetzen den vollständigen, releasebezogenen Nachweis.

## Testanleitung und Übergabe

Die ausführbaren Schritte und Soll-Ergebnisse stehen in
[`TEST_BASE_QUICKSTART_DE.md`](../operations/TEST_BASE_QUICKSTART_DE.md).
Es wurden keine Produktivanlage, globalen Firewallregeln oder Tailscale-Konten
verändert und keine GitHub-/npm-Veröffentlichung vorgenommen.
