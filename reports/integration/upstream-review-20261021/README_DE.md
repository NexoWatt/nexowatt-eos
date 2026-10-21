# EOS: Vergleich mit offiziellen ioBroker-Ständen

Stand: 21.10.2026. Geprüfter EOS-Quellcommit:
`a675d6986890d4f3491e421626223c91cd0d1af6`.

**Ergebnis: neuere Korrekturen sind verfügbar; Aktualisierung und Integration
sind offen.** Dies ist eine Quell-/Versionsprüfung mit aktuellem npm-Audit,
keine durchgeführte Aktualisierung, Anlagenprüfung oder Produktionsfreigabe.

## Umfang und belastbare Ausgangsbasis

Geprüft wurden Produktpins, Admin-Quellen und Lockdatei, die dokumentierte
R9/R10-Laufzeitbasis sowie der daraus ableitende Managed-Builder. Die
Laufzeitversionen stammen aus
`reports/integration/own-adapter-test-20261015/release/runtime.cdx.json`.
Diese SBOM wurde hier gelesen; ein signiertes Binärarchiv wurde in diesem
Prüflauf nicht erneut extrahiert oder ausgeführt. Auf dem Pi installierte
Versionen wurden nicht ausgelesen.

**Quell-Lockdatei und Lieferbasis unterscheiden sich.** Beispielsweise nennt
die Admin-Lockdatei socket-classes 2.3.4, die Laufzeit-SBOM bereits 2.6.2.
Daraus darf weder eine alte Schwachstelle ungeprüft der Lieferung zugeordnet
noch die veraltete Lockdatei bei einem künftigen Neubau übergangen werden.
Dateihashes und Abfragen stehen in `verification.json`.

## Versionsvergleich

| Komponente | EOS-Quellstand / dokumentierte Laufzeitbasis | Offiziell am Prüftag | Bewertung |
| --- | --- | --- | --- |
| js-controller | 7.2.2, mit EOS-Anpassungen | 7.2.5, Stable und Latest; 8.0.0-alpha.8 als Dev | 7.2.5 zur Integration vorsehen; 8 ist noch Vorabstand |
| Admin | Eigener Fork eos-admin 7.10.11 | 8.2.0 Stable; 8.3.0 Latest | Kein numerischer Eins-zu-eins-Vergleich; EOS-Funktionen beim Portieren erhalten |
| socket-classes | Lock 2.3.4; Laufzeitbasis 2.6.2 | 2.10.0 | Neuere Rechtekorrekturen ab 2.7.0/2.7.1 noch zu integrieren |
| webserver | 1.4.0 | 3.3.1 | Größerer Auth-/Webserverwechsel; EOS-Schutzgrenzen nachprüfen |
| ws-server | Lock 4.4.1; Laufzeitbasis 4.5.1 mit EOS-Anpassung | 4.5.2 | Ältere Protokollfixes vorhanden; CPU-Optimierung verfügbar |
| adapter-core | Lock 3.4.1; Laufzeitbasis enthält 3.4.3 und 3.4.1 | 3.4.3 | Auflösungen pro Verbraucher prüfen |

Stable/Latest/Dev wurden zusätzlich über npm abgefragt. Der offizielle
ioBroker-Stable-Katalog bestätigt js-controller 7.2.5 und Admin 8.2.0.
Die eigene Produktversionsnummer belegt keine Gleichwertigkeit mit einem
gleich oder höher nummerierten Upstream-Paket.

## Sicherheitsrelevante Änderungen und Einordnung

- **Controller und Nachrichtenrechte:** 7.2.5 ergänzt den Benutzerkontext
  von Nachrichten. socket-classes ab 2.7.0 kann diesen weiterreichen;
  empfangende Adapter müssen ihn anschließend auch berücksichtigen.
  7.2.4 enthält außerdem Korrekturen an Sitzungen und Array-Verschlüsselung.
- **Socket-Ereignisse:** Ab 2.7.1 prüft Upstream Leserechte auch bei
  Ereigniszustellung. Ältere Fixes bis 2.6.2 sind laut Laufzeit-SBOM bereits
  enthalten. EOS besitzt zusätzliche Rollen-/Sitzungsgrenzen; diese Prüfung
  reproduziert keinen Angriff und erklärt sie nicht zum vollständigen Ersatz.
- **Admin 8.1.0:** Upstream nennt Korrekturen an KI-/MCP-Berechtigungen und
  Diagnosezugriffen. Der untersuchte EOS-Quell- und Buildstand sperrt
  Chat-Befehle bereits serverseitig. Das ist eine bestehende Beschränkung,
  keine nachgewiesene vollständige Übernahme des Upstream-Fixes.
- **Webserver 3.3.0:** Upstream korrigiert SSO-Zustandsbindung und
  Weiterleitungsprüfung. EOS sperrt SSO bereits vor dessen Einbindung.
  Ein Versionswechsel muss diese lokale Vorgabe, OAuth und Sitzungswiderruf
  erhalten; neue SSO-/Cloud-Funktionen werden dadurch nicht freigegeben.
- **ws-server 4.5.2:** Geringerer Kompressionsaufwand ist eine
  Leistungsverbesserung. Die Sicherheitskorrekturen aus 4.5.1 sind in der
  dokumentierten Basis schon vorhanden. Upstream-Messwerte ersetzen keine
  EOS-Messung der Regelungs- oder Lastmanagementzeiten.

## Aktueller Abhängigkeitsscan

Ausgeführt: `npm audit --omit=dev --ignore-scripts --json --fetch-timeout=5000 --fetch-retries=0`
in `components/admin`, Linux/x64, Node 24.19.0, npm 11.9.0.
Exitcode 1 wegen Befunden. Keine Installation, Lifecycle-Ausführung oder
automatische Reparatur.

Der Scan meldet **drei Paketknoten: zwei high, einen critical**; dabei sind
vier Advisory-Zuordnungen enthalten. Die Einstufung stammt vom Advisory und
beweist keine entsprechende Ausnutzbarkeit des EOS-Gesamtsystems.

| Paket | Admin-Lock | Dokumentierte Laufzeitbasis | Verfügbare Korrektur / Einordnung |
| --- | --- | --- | --- |
| compression | 1.8.1 | 1.8.2 | Fix 1.8.2 bereits in Lieferbasis; Lockangleichung offen |
| follow-redirects | 1.16.0 | 1.16.0 | Fix 1.16.1; konkrete Aufrufvoraussetzungen noch bewerten |
| proxy-addr | 2.0.7 | 2.0.7 | Fix 2.0.8; konkrete Proxykonfiguration entscheidend |

Die geprüfte Admin-Webimplementierung setzt selbst kein `trust proxy`.
Damit ist die Advisory-Voraussetzung nicht automatisch nachgewiesen.
Eine vollständige Aufruf-/Konfigurationsanalyse und ein aktuelles
Live-Inventar liegen nicht vor. Keine pauschale VEX-Nichtbetroffenheit.

Der bestehende Forge-Befund bleibt offen: npm Latest ist weiterhin 1.4.0;
GHSA-86w9-cpqp-85rv nennt beim Abruf keine gepatchte Version.
Die frühere eingeschränkte Aufrufpfadbewertung bleibt ein separater Nachweis.
Die bestehende OCPP-/AJV-Migration wird durch diesen Vergleich nicht geschlossen.

## Reihenfolge für die Übernahme

1. Neue vollständige Laufzeitbasis mit den geprüften Dependency-Korrekturen
   aufbauen und Quell-Lockdateien mit der tatsächlichen Lieferung abgleichen.
2. js-controller 7.2.5 und socket-classes gemeinsam integrieren; vorhandene
   PostgreSQL-, Rollen-, Lizenz-, Backup- und EOS-Controller-Anpassungen erhalten.
3. Webserver-/Admin-Portierung einschließlich eigener UI, OAuth und
   gesperrter Zusatzfunktionen separat qualifizieren.
4. Frische SBOM, erneuter Audit, positive und negative Berechtigungstests,
   reale Anmeldung/Abmeldung/Neustart, sechs Adapterprozesse und Rückfall prüfen.
5. Erst anschließend signierten Teststand und Pi-Abnahme bereitstellen.

Der aktuelle Managed-V1-Pfad erlaubt eigene Adapterquellpatches bei
unveränderten Versionen/Abhängigkeiten. Controller- und Dependencywechsel
brauchen eine qualifizierte neue Basis bzw. einen erweiterten Migrationspfad.
Sie lassen sich nicht allein durch Ersetzen einer Versionsnummer als
installierbares Button-Update freigeben. Vorhandene signierte Lieferdateien
bleiben unverändert.

## Quellen und Grenzen

- [Offizieller Stable-Katalog](https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist-stable.json)
- [Controller 7.2.5](https://github.com/ioBroker/ioBroker.js-controller/releases/tag/v7.2.5)
- [Controller-Changelog am Releasecommit](https://github.com/ioBroker/ioBroker.js-controller/blob/e4c842b9056eb5b0b18bb56e70611821ecb3cc80/CHANGELOG.md)
- [Admin 8.1.0](https://github.com/ioBroker/ioBroker.admin/releases/tag/v8.1.0), [Admin 8.3.0](https://github.com/ioBroker/ioBroker.admin/releases/tag/v8.3.0)
- [Socket-Klassen](https://github.com/ioBroker/ioBroker.socket-classes/blob/ed064e866877fffc45851ff1025b957b8478004c/README.md)
- [Webserver](https://github.com/ioBroker/webserver/blob/24da5f9a1452bb317ba5084e065b18a5a932cb73/README.md)
- [WebSocket-Server](https://github.com/ioBroker/ioBroker.ws.server)
- [compression-Advisory](https://github.com/advisories/GHSA-vc2v-76pw-4v95)
- [proxy-addr-Advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)
- [follow-redirects: 1](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8), [2](https://github.com/advisories/GHSA-8r9p-f939-6h3c)
- [Forge-Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv)

Öffentliche Releaseinformationen, Versionsmetadaten und bereinigte
Prüfzusammenfassungen; keine Schlüssel, Kundendaten, internen Angriffsabläufe
oder Produktivlogs. Keine vollständige Prüfung aller Drittadapter,
Frontend-Bundles, OS-/Node-/DB-Pakete, historischen Binärarchive oder Anlagen.
Grüne frühere Funktions-/CodeQL-Läufe ersetzen keinen aktuellen
Abhängigkeitsscan und schließen diese Integrationsaufgaben nicht.
