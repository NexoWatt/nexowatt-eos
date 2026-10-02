# EOS: Komponentenbasis und Raspberry-Pi-Integration

Stand 30.09.2026; Architekturrevision `2026-09-30.3`, voriger Integrationscommit `0e34142`. Der Nutzer hat fünf Repository-URLs und Raspberry Pi 5 mit 8/16 GB RAM, SSD und „Linux 12 Lite“ angegeben und anschließend den aktuellen UI-Stand als ZIP geliefert. Der js-controller ist ausdrücklich im Produktscope enthalten.

## Beobachtete Quellen

| Komponente | Beobachtete Quellversion | Git-Commit (kurz) | Bedeutung |
|---|---|---|---|
| EOS-Installer | @iobroker/install 6.0.1 | `0e34142` | Lokaler bisheriger Härtungs-/Integrationsstand |
| js-controller | 7.2.2 | `88516d6` | Vollständiger geprüfter Quellcheckout, einschließlich 14 Teilpaketen |
| Adapter-Core | 3.4.3 | `cc8c32f` | Separate Adapter-Basis; tatsächliche Klassenauflösung pro Adapter noch prüfen |
| EOS Admin | 7.10.9 | `93e155b` | Zusätzlich gefundenes Repository NexoWatt/ioBroker.eos.admin |
| NexoWatt Devices | 0.5.168 | `6de81f6` | Private Quelle über GitHub-Verbindung; ausgewählte Dateien mit Blobhash verifiziert |
| EEBUS | 0.3.0 | `1c0eb41` | NexoWatt/ioBroker.eebus |
| OCPP | 0.4.0 | `ca55a15` | NexoWatt/iobroker.ocpp21, eigenständiger Kommunikationsadapter |
| NexoWatt Backitup | iobroker.nexowatt-backup 1.0.10 | `88dd860` | Repositoryname und installierter Paketname unterscheiden sich |
| NexoWatt UI | **1.0.21** | nicht belegt | Vom Nutzer bestätigtes aktuelles vollständiges Repository-ZIP; durch Archiv-SHA-256 gebunden |

Git-Commits beziehungsweise Archiv-SHA-256, Manifest-SHA-256, Paketnamen und deklarierte Lizenzen stehen in [`source-inventory.json`](../../system/components/source-inventory.json), Schema 2. Dies ist eine Bindung der **beobachteten Quellen**, keine Auswahl für Installation, kein Downgrade und kein Nachweis der derzeit auf dem Raspberry Pi installierten Versionen. Der ursprüngliche UI-Link liefert weiterhin 404; das spätere Nutzerarchiv ist für diese Prüfung die maßgebliche UI-Quelle. Seine Git-Herkunft ist nicht nachgewiesen, daher wird kein Commit erfunden. Archivhash: `90db619ecd754cab335dae92fdc123a48f62ceffb505a2a2b832e119d885eefe`.

Die Quellen anderer Repositories wurden für das Review separat gelesen, nicht in dieses Installer-Repository kopiert. Der neue ZIP-Lieferstand enthält das vollständige EOS-Installer-/Integrationsrepository und seine Nachweise; er wird nicht als vollständiger Quellbaum aller Adapter oder fertiges Systemimage bezeichnet. Insbesondere ist Devices nur in den dokumentierten, hashgeprüften Dateien untersucht. Frühere ZIP-Stände aus anderen Arbeiten können neuer oder inhaltlich anders sein; identische Versionsnummern beweisen keine identischen Bytes.

## js-controller gehört zum Systemkern

Der Scope umfasst Controller, Adapter-/CLI-/Common-/DB-Basis, File-/JSONL-/Redis-Stores für Objekte und Zustände sowie Schnittstellentypen. Hinzu kommen Adapter-Core, Node/OpenSSL, tatsächliche Datenbankserver und Betriebssystem/Firmware. Details und 14 Manifestnachweise: [`JS_CONTROLLER_SCOPE.md`](JS_CONTROLLER_SCOPE.md).

Der Installer verwendet derzeit noch den veränderlichen npm-Tag `stable`. Die in dieser Etappe beobachteten Quellstände ändern das nicht. GitHub-Release 7.2.3, ioBroker-Stable-Liste 7.2.2, npm-Dist-Tag und installierter Controller bleiben unterschiedliche Beobachtungen. Vor einem Systemrelease sind exakte Artefakte, Quellzuordnung und gemeinsame Kompatibilität festzulegen. Es wird hier kein Controllerupgrade ausgelöst.

## Ergebnis der gezielten Sicherheitsprüfung

[`finding-register.json`](../../system/integration/finding-register.json) verknüpft **33 offene Befunde und Integrationspunkte** aus den fünf Adapterberichten mit den vorhandenen EOS-Anforderungen. Die Liste enthält auch Nachweislücken und Quellpflegepunkte; sie ist keine Liste von 27 bestätigten CVEs. Controllerbeobachtungen stehen zusätzlich im eigenen Bericht. Frühere Befundkennungen bleiben bestehen.

| Bereich | Wichtigster offener Punkt | Nachweis |
|---|---|---|
| Admin 7 | Gemeinsame Erstkennwörter und Rücknahme der Wechselpflicht; HTTP-Vorgabe und optionales TLS | [`ADMIN7_REVIEW.md`](ADMIN7_REVIEW.md), isolierte Funktions-/Guardtests |
| Controller | `secure:true` macht File-/JSONL-Server nicht zu TLS-Servern; Ablehnung beendet den Startpfad im gelesenen Code nicht sofort | [`JS_CONTROLLER_SCOPE.md`](JS_CONTROLLER_SCOPE.md), statische Quellbeobachtung, kein neuer echter Listener-Test |
| OCPP | Behauptete Stations-ID ohne Besitznachweis; direkte WS-Schnittstelle ohne konfigurierte TLS-Schicht | [`EEBUS_OCPP_REVIEW.md`](EEBUS_OCPP_REVIEW.md), Server-Stubs |
| EEBUS | Vorhandene TLS-Verbindung bindet die ausgehende Discovery-Identität im gelesenen Pfad nicht an das Peerzertifikat | Derselbe Bericht; bestehende separate CLS-Trustprüfung ausdrücklich berücksichtigt |
| Backitup | Temporäre Datei-Server ohne eigene Authentifizierung; Remote-Influx-HTTPS setzt `--skip-verify` | [`BACKUP_REVIEW.md`](BACKUP_REVIEW.md), isolierte Originalfunktions-/Server-Stubs |
| UI 1.0.21 | HTTP, standardmäßig anonyme Kundensteuerung und gemeinsames HMAC-Lizenzgeheimnis; weitere Sitzungs-/Eingabepunkte | [`UI_SECURITY_REVIEW.md`](UI_SECURITY_REVIEW.md), zehn Speicher-/Stubprüfungen |
| Devices | Klartext/abschaltbare Peerprüfung möglich, unzureichend begrenzte HTTP-/MQTT-Pfade und fremde Objektmigration | [`DEVICES_REVIEW.md`](DEVICES_REVIEW.md), Axios-/MQTT-/Adapter-Stubs |

Der Backup-Publish-Validator ist **fehlgeschlagen**: `build/lib/sdCard.js` und `build/lib/influxDbCli.js` fehlen im geprüften Gitbaum. EEBUS hat ein veraltetes Lockfile, OCPP kein Lockfile. Es wurden keine npm-Lifecycle-Skripte oder vollständigen Adapterinstallationen zur Behebung ausgeführt. Eine funktionierende Sicherheitsgrenze oder vollständige Build-SBOM wird daraus nicht abgeleitet.

Erfolgreiche Befundreproduktionen bedeuten: Das unerwünschte Verhalten wurde im isolierten Ausschnitt bestätigt. Sie bedeuten nicht, dass der Adapter einen Sicherheitstest bestanden hat. Exploitbedingungen, tatsächliche Erreichbarkeit, vorgeschaltete Kontrollen und Gerätewirkung sind je Befund ausgewiesen. Keine echte Netzwerk-/Geräteattacke und keine unabhängige Penetrationsprüfung durchgeführt.

## Hardwareprofil und Bestandserhalt

[`RPI5_PROFILE.md`](../hardware/RPI5_PROFILE.md) dokumentiert 8- und 16-GB-Varianten getrennt. SSD-Schnittstelle, Netzteil, Kühlung, genaue Distribution, 32-/64-Bit-Nutzerland, Kernel und EEPROM sind noch unbekannt. Debian 12 ist inzwischen im LTS-Zeitraum bis 30.06.2028; Raspberry Pi bietet Bookworm Lite weiterhin als Legacy mit Sicherheitsupdates an. Das belegt weder den Patchstand des Geräts noch den Support aller npm-/Firmwarekomponenten. Primärquellen und Abrufdatum stehen im Hardwareprofil. Kein automatisches OS-Upgrade und keine Leistungsfreigabe anhand der RAM-Größe.

Design, Navigation, Datenpunktnamen, Einheiten, Geräteprofile, Regelprioritäten und Offlinefunktionen bleiben Vorgaben. In dieser Etappe wurde kein Adapterproduktcode geändert. Das aktuelle UI-Archiv ist aufgenommen; Referenzfälle und installierter Versionsstand müssen vor Migration abgeglichen werden. „Admin-HTTPS eingeschaltet“ ist kein Beleg für verschlüsselte Controller-/Adapterkommunikation. UI-Prüfung: [`UI_SECURITY_REVIEW.md`](UI_SECURITY_REVIEW.md); Funktionsbestand: [`UI_COMPATIBILITY_BASELINE.md`](UI_COMPATIBILITY_BASELINE.md).

## Umsetzungsreihenfolge

1. Das datensparsame Geräte-/Versionsinventar erheben und mit den nun erfassten Quellständen abgleichen. Keine älteren Gitstände über möglicherweise neuere Feldteststände installieren. Das Nutzer-UI-Archiv bleibt eine eigene Herkunft neben Git-Commits.
2. Admin-Erstzugang und Lizenz-/Identitätsgrenze umsetzen: individuelle Ersteinrichtung, geschützter Erstkontakt, serverseitige Freigaben, Schlüsselablage. Vorhandene Konten und Rollen kontrolliert migrieren.
3. Controller-/DB-Kommunikation mit kompatiblen Clients schützen und Berechtigungen trennen; positive/negative echte Verbindungen, PubSub, Wiederanlauf und Konfigurationserhalt prüfen.
4. OCPP-/EEBUS-Peeridentitäten sowie Devices-Transport-/Eingabegrenzen härten; Gerätefunktionen gegen Referenzfälle prüfen. Klartext-Feldprotokolle als begrenzte Ausnahmen behandeln.
5. Backup-Upload/Download an authentisierte API anbinden, Zertifikatsprüfung erhalten, Backupgeheimnisse/Archive schützen und Restore mit dem begrenzten Wartungsdienst integrieren. Fehlende Builddateien aus geprüftem Build erzeugen.
6. Zusammengehörigen Systemstand mit exakten Artefakten, vollständiger Build-SBOM, signierten Updates, Migration und RPi-Tests freigeben. Herstellerprozesse und CRA-/IEC-Nachweise bleiben erforderlich.

## Prüfwerkzeuge und STRIDE dieser Etappe

Der neue Komponenten-SBOM-Generator erzeugt ausschließlich ein unvollständiges Quellinventar; Bedrohungsanalyse und Tests stehen in [`COMPONENT_SOURCE_SBOM.md`](../security/COMPONENT_SOURCE_SBOM.md). Die Architekturprüfung unterscheidet `source-observed` von implementierter Isolation und Produktfreigabe. Der neue Negativtest verhindert die Gleichsetzung.

Die Komponenten-Reviews behandeln Identitätsfälschung, Manipulation, fehlende Nachvollziehbarkeit, Geheimnisoffenlegung, Ressourcenerschöpfung und Rechteausweitung anhand konkreter Codepfade. Die bestehenden STRIDE-Szenarien und Anforderungen bleiben offen. Reproduktionstests sind Entwicklungswerkzeuge für exakt genannte Quellstände; sie laden Quellausschnitte mit Stubs und gehören nicht auf Kundenhardware oder privilegierte Runner.
