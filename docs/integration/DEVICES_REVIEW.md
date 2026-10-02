# NexoWatt Devices – Quellprüfung und Integrationsgrenzen

Stand: 30.09.2026. Vertrauliche Entwicklungsunterlage; keine Produktfreigabe.

## Ergebnis und geprüfter Stand

Der GitHub-Stand von `NexoWatt/nexowatt-devices` ist als **0.5.168** ausgewiesen,
Commit `6de81f6c67294c4b26933c38715b09455c204de2`, Tree
`a479e538ea20b755f930da95a5dee29aa89e9b57`. Er ist eine brauchbare
Integrationsgrundlage, erfüllt das geplante sichere EOS-Profil aber noch nicht.
HTTP und MQTT unterstützen geschützte Verbindungen, erzwingen diese jedoch
nicht. Eine zentrale Lizenzfreigabe sowie eine eigene kryptografische
Modulidentität sind im geprüften Hauptpfad nicht nachgewiesen.

Vierzehn ausgewählte Dateien wurden über das GitHub-Plugin commitgebunden
abgerufen und ihre Bytes gegen die Git-Blob-SHA-1 geprüft. SHA-256, Dateigrößen
und Blobkennungen stehen in
[`devices-observations.json`](../../system/integration/devices-observations.json).
Die private Quellprobe bleibt außerhalb dieses EOS-Repositorys. Es handelt sich
um eine **Teilprüfung**, nicht um ein vollständiges Quellpaket des Adapters.

Die früher benannte ZIP-Version 0.5.169 ist nicht derselbe Stand. Der aktuell auf
dem Raspberry Pi installierte Stand wurde nicht festgestellt. Aus dieser Prüfung
folgt kein Downgrade und keine automatische Auswahl von 0.5.168 für das Produkt.
Quell-, Konfigurations- und Gerätedatenpunkte wurden nicht geändert.

## Komponenten und Controller-Bezug

| Eigenschaft | Festgestellt | Bedeutung für Integration |
| --- | --- | --- |
| Paket | `iobroker.nexowatt-devices` 0.5.168 | Quelle festgehalten, installierter Stand unbekannt |
| Startpfad | `bootstrap.js` → `main.js` → `lib/deviceRuntime.js` | Sungrow-Patch im Bootstrap gehört zur Funktionsbaseline |
| Node-Deklaration | `>=18` | Deklaration ist keine Freigabe jedes passenden Node-Stands |
| Controller-Anbindung | `@iobroker/adapter-core`, State-/Objekt- und Message-APIs | Eigenständige Ende-zu-Ende-Verschlüsselung nicht daraus ableitbar |
| Controller-Mindestversion | Im geprüften `io-package.json` nicht deklariert | Konkrete JS-Controller-Version im Systemmanifest festlegen und testen |
| Compact-Fähigkeit | `common.compact: true` | Kein Beleg, dass Compact aktiviert ist; gemeinsame Prozesse widersprechen geplanter Isolation |
| Lizenzangaben | `UNLICENSED`, `Proprietary`, eigene Internal-Use-Lizenz | Rechte für Kundenauslieferung und Drittkomponenten gesondert dokumentieren |

Das Lockfile in Version 3 enthält 208 Einträge einschließlich Root-Paket.
Die fünf direkten Auflösungen sind `adapter-core` 3.4.3, `modbus-serial` 8.0.25,
`mqtt` 5.16.0, `axios` 1.20.0 und `serialport` 12.0.0. Das sind
**Lockfile-Angaben**, kein aus einem Build oder Gerät erhobenes Inventar.
Abhängigkeiten wurden weder installiert noch vollständig auf Advisories geprüft.
Eine Liefer-SBOM muss den tatsächlich gebauten Dependency-Baum und die nativen
Serialport-Bestandteile für die konkrete Architektur aufnehmen.

Die ioBroker-State- und Objektverbindung wird über den JS-Controller vermittelt.
Die Sicherheit dieser Verbindung hängt von Controller, Transportkonfiguration,
DB, Benutzern und Prozessrechten ab. Die Nutzung von `adapter-core` beweist weder
mTLS noch eine Trennung mehrerer Adapter mit gemeinsamer UID oder gemeinsamer
Datenbankberechtigung. Zustandsänderungen werden im Adapter an Treiber
weitergeleitet; Controller-ACLs dürfen dabei nicht ungeprüft vorausgesetzt werden.

## Offene Befunde

Prioritäten sind interne Bearbeitungsprioritäten. Es wurde kein CVE zugeordnet
und keine vollständige Ausnutzbarkeit im ausgelieferten System behauptet.
Die maschinenlesbaren Befunde ordnen jeweils STRIDE-Kategorien und vorhandene
`EOS-REQ-*`-Anforderungen zu. Betroffene Grenzen sind Geräte-/Brokernetz zur
Adapterlaufzeit, Controller-Statebus zu Gerätetreibern, Adapterprozess zu
fremden Konfigurationsobjekten sowie Runtime zu Protokollen und Geheimnissen.
Die genannten Gegenmaßnahmen sind geplant und wurden durch diese Prüfung
nicht implementiert. Eine exakte normative IEC-/CRA-Klauselzuordnung bleibt
der Systembewertung vorbehalten.

| Kennung | Priorität | Beobachtung und nächste Maßnahme |
| --- | --- | --- |
| EOS-INT-DEV-001 | Hoch | HTTP akzeptiert Klartext und kann die TLS-Gegenstellenprüfung abschalten. Sichere Profile mit CA-Verteilung durchsetzen; notwendige Legacy-Geräte getrennt betreiben. |
| EOS-INT-DEV-002 | Mittel | HTTP nutzt standardmäßig 8 Sekunden; höhere Werte sind möglich. Keine expliziten Abort-, Antwortgrößen- oder Redirectgrenzen im geprüften Aufruf. Echte Gesamtdeadline und begrenzte Antworten/Zielwechsel vorsehen. |
| EOS-INT-DEV-003 | Mittel | HTTP-Fehlerlog enthält den kompletten Anfragepfad. Ein synthetischer Query-Token bleibt sichtbar. Diagnoseausgaben bereinigen. |
| EOS-INT-DEV-004 | Mittel | Ein als numerisch deklarierter HTTP-Datenpunkt kann Objekt oder `null` an die Runtime zurückgeben. Vertrag am Treiberausgang prüfen; Hardwarewirkung ist nicht nachgewiesen. |
| EOS-INT-DEV-005 | Hoch | MQTT erlaubt `mqtt://` und `rejectUnauthorized=false`. `mqtts://` mit Prüfung funktioniert als Konfigurationspfad ebenfalls; sichere Vorgaben und gerätespezifische Migration fehlen. |
| EOS-INT-DEV-006 | Mittel | Sichtbare MQTT-Promise-Warteschlange und Topic-Sammlung haben keine explizite Obergrenze. Queue-/Payload-/Topiclimits und Überlastverhalten prüfen. |
| EOS-INT-DEV-007 | Mittel | Der Adapter migriert beim Start auch fremde Adapterobjekte. Migration in autorisierte Systemverwaltung verlagern und eigenen Schreibscope begrenzen. |
| EOS-INT-DEV-008 | Hoch | Zentrale Lizenzfreigabe und geschützte Credentialfelder im geprüften Hauptpfad nicht nachgewiesen. Berechtigungsdienst, Secret-Speicherung und Migration implementieren. |
| EOS-INT-DEV-009 | Niedrig | Zusätzliche OCPP-Quellkopie ohne nachgewiesenen aktiven Paketpfad. Pflege- und Paketumfang klären, keinen zweiten Listener unterstellen. |

Transportbefunde setzen eine unsichere Konfiguration bzw. einen erreichbaren
Netzpfad voraus. Die aktuelle Kunden-/Testgerätekonfiguration ist unbekannt.
HTTP verwendet ohne Insecure-Option keinen eigenen unsicheren HTTPS-Agent;
MQTT erhält bei entsprechender Konfiguration die Zertifikatsprüfung. Diese
positiven Kontrollen sind ebenfalls im lokalen Harness enthalten.

Bei HTTP wurden nur die Treiberrückgaben geprüft. Aus dem Rückgabewert eines
Objekts oder `null` folgt noch nicht, dass ein falscher Hardware-Sollwert gesetzt
wurde; weitere Laufzeit- und Protokollprüfungen sind nötig. Für MQTT wurden 200
synthetische Topics erfasst, kein Angriff mit hoher Last und kein Speicherausfall
erzeugt. Broker-ACLs und nachgelagerte Schutzmaßnahmen wurden nicht geprüft.

`io-package.json` deklariert keine `encryptedNative`-/`protectedNative`-Felder.
Die Treiber verwenden Verbindungszugänge aus der Gerätekonfiguration. Das ist
eine offene Integrationsgrenze; eine Aussage über vorhandene Verschlüsselung
des gesamten Datenträgers oder der realen Controller-Datenbank ist damit nicht
verbunden. Adapter dürfen künftig nur passende lokale Freigaben erhalten und
nicht den privaten Signierschlüssel oder den kompletten Lizenzschlüssel lesen.

## OCPP-Verantwortung und Funktionserhalt

`ocpp/server.js` ist byteidentisch zur in dieser Arbeitsumgebung vorliegenden
OCPP21-Quellprobe; SHA-256:
`11a6f331dfcd675c84b589d2bbb5aabddb7b1a818536ef12beaa5b4ed8c1d2a6`.
In den geprüften Start-/Runtimeimports wird diese Kopie nicht eingebunden.
`package.files` enthält kein `ocpp/`, die direkten Dependencies kein `ocpp-rpc`.
Das belegt eine Quellkopie, **keinen zweiten aktiven OCPP-Server**. Eine spätere
Bereinigung setzt die Prüfung des vollständigen Referenzbaums und tatsächlichen
npm-/ZIP-Pakets voraus. Die OCPP21-Komponente erhält eine eigene Prüfung.

Zu erhalten sind bestehende Geräte-Templates, Aliasverträge, Datenpunktnamen,
Datentypen, Einheiten, Sollwertrichtungen, Lade-/Speicherlogik und Failsafes.
Im MQTT-Treiber sind bereits Tesvolt-spezifische Frische-, Zeitstempel- und
Leistungsgrenzen sichtbar. Diese dürfen durch eine allgemeine Sicherheits-
oder Lizenzschicht nicht umgangen oder ersatzlos entfernt werden. Verschlüsselte
EOS-interne Kommunikation macht unverschlüsselte Feldprotokolle nicht nachträglich
sicher. Solche Geräte brauchen gesonderte Zonen, eingeschränkte Netzwerkpfade
und dokumentierte verbleibende Risiken.

## Ausgeführte Prüfungen und Nachweisgrenzen

Der neue Harness
[`devices-source-review.test.cjs`](../../tests/integration/devices-source-review.test.cjs)
lädt ausschließlich die hashgebundene Quellprobe. Axios, MQTT,
Controller-Adapterklasse und betroffene Dateizugriffe werden ersetzt.
Es wurden keine Netzwerklistener geöffnet, Dependencies installiert oder
Gerätebefehle gesendet. Ergebnis auf Linux/x86_64 mit Node 24.19.0:
**13 von 13 lokalen Prüfungen bestanden**. Das bedeutet, dass die genannten
Kontrollen und Lücken reproduziert wurden; es bedeutet **nicht**, dass 13
Sicherheitsanforderungen des Produkts erfüllt sind.

```bash
EOS_DEVICES_SOURCE=/pfad/zur/geprueften/quellprobe \
  node --test --test-reporter=tap tests/integration/devices-source-review.test.cjs
```

Der Rohbeleg liegt unter
[`devices-source-review.tap`](../../reports/integration/devices-source-review.tap).
Die Quelle muss unabhängig aus dem angegebenen privaten Repository bezogen
werden; der Harness lehnt abweichende Dateihashes vor dem Laden ab.
Die native Projekt-Testsuite, das vollständige Bootstrap-Verhalten,
Real-Controller-Integration, RPi5/ARM64, 8/16-GB-Auslastung, SSD-Ausfälle sowie
Geräte-, Installations-, Wiederherstellungs- und Regressionstests sind offen.

Für die nächste Integration: tatsächlichen installierten Stand aufnehmen,
Admin-7-/JS-Controller-Versionen binden, Geheimnisse und Rechte migrieren,
Treibergrenzen härten und mit positiven, negativen und Hardware-Regressionstests
nachweisen. Die Befunde werden als Input in System-Threat-Model und CRA-Unterlagen
übernommen. IEC-62443-/CRA-Erfüllung, unabhängige Prüfung und Serienfreigabe sind
mit dieser Teilprüfung nicht bescheinigt.
