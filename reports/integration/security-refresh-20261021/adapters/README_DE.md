# Sicherheitsaktualisierung der eigenen Adapter – 21.10.2026

Dieser Teilbericht umfasst UI, Devices, EEBUS, OCPP und Backup. Er dokumentiert
Quellpakete und lokale Prüfungen. Die neue vollständige Laufzeit, deren SBOM,
Signatur und Installation auf dem Pi sind getrennte Nachweise. Es wird keine
Produktionsfreigabe oder vollständige Behebung aller Schwachstellen erklärt.

## Änderungen

Die Paketidentitäten bleiben unverändert. Keine Produktfunktion, Lizenzprüfung,
Gerätesteuerung, API oder Datenpunktzuordnung wurde für die Paketaktualisierung
geändert. js-controller-Komponenten bleiben in Hauptversion **7**.

| Quellpaket | Geprüfte Änderung |
|---|---|
| UI 1.0.21 | `proxy-addr` 2.0.7 → 2.0.8 |
| Devices 0.5.169 | `follow-redirects` 1.16.0 → 1.16.1; Common-DB 7.2.3 → 7.2.5 |
| EEBUS 0.3.0 | Kein neuer Produktions-Auditbefund; Paket unverändert |
| OCPP 0.4.0 | Paket unverändert; unten beschriebene AJV-Migration bleibt offen |
| Backup 1.0.10 | Controller-Common/DB-Familie 7.2.2 → 7.2.5; Axios 1.19.0 → 1.20.0; Multer 2.2.0 → 2.4.0 |
| Backup, transitiv | `follow-redirects` 1.16.1, `proxy-addr` 2.0.8, `http-cache-semantics` 4.3.0, `ip-address` 10.7.4, `moment` 2.31.0, `brace-expansion` 2.1.7 im 2.x-Zweig, `qs` 6.16.1, `form-data` 2.5.6 im alten 2.x-Zweig |

Explizite, kompatibel geprüfte npm-Overrides halten die sicherheitsrelevanten
transitiven Versionen fest. Die Laufzeitmontage muss diese Overrides an ihrer
Installationswurzel übernehmen: npm berücksichtigt verschachtelte Overrides
eines installierten Adapterpakets allein nicht. Ein tatsächlicher Laufzeitbaum
muss zusätzlich gegen die aufgelösten Versionen geprüft werden.

Der vorher veröffentlichte Laufzeit-SBOM enthält teilweise bereits neuere
Versionen als die Quell-Lockfiles, unter anderem Axios 1.20.0 und Multer 2.4.0.
Diese Quellkorrekturen werden deshalb **nicht** als neue Behebung in der alten
Laufzeit ausgegeben. `runtime-sbom-comparison.json` enthält den paketweisen
Vergleich mit dem unveränderten SBOM vom 15.10.2026 samt Eingabehash. Der alte
SBOM belegt weder eine aktuelle Pi-Installation noch die neue Laufzeitmontage.

## Frische Produktions-Audits

Vorher und nachher wurde jeweils `npm audit --omit=dev --ignore-scripts --json
--fetch-timeout=5000 --fetch-retries=0` ausgeführt. Die vollständigen
maschinenlesbaren Ergebnisse und Lockfile-Hashes liegen daneben. Die Zahlen
sind betroffene Paketknoten einschließlich übergeordneter Abhängigkeiten; sie
sind weder eine Anzahl unabhängiger CVEs noch ein Exploit-Nachweis.

| Quellpaket | Vorher | Nachher |
|---|---:|---:|
| UI | 1 kritisch | 0 |
| Devices | 4 hoch | 3 hoch |
| EEBUS | 0 | 0 |
| OCPP | 3 hoch, 2 mittel | 3 hoch, 2 mittel |
| Backup | 3 kritisch, 16 hoch, 6 mittel | 11 hoch, 4 mittel |

Null Auditmeldungen bedeuten keine allgemeine Fehlerfreiheit. Ein erneuter
Registry-Abruf kann später zusätzliche oder anders bewertete Meldungen liefern.

## Verbleibende Abhängigkeiten

### Forge

`node-forge` 1.4.0 bleibt über Common-DB enthalten. Zum Prüfzeitpunkt nennt die
Registry keine neuere veröffentlichte Version; die Meldung
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) bleibt
offen. Die mehreren hoch eingestuften Paketknoten sind überwiegend dieselbe
transitive Forge-Kette. Die frühere begrenzte Aufrufpfadbewertung steht im
[R9-Nachprüfbericht](../../own-adapter-test-20261015/dependency-review/README_DE.md).
Sie ersetzt keine vollständige Bewertung des neu montierten Runtimebaums.

### OCPP / AJV

Das aktuell veröffentlichte `ocpp-rpc` 2.2.1 bindet exakt AJV 8.14.0. Die
Meldung [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
ist damit weiterhin vorhanden. Der neue isolierte Regressionstest lädt alle
drei tatsächlichen Validatoren, prüft gültige und ungültige Heartbeats und
bestätigt, dass `$data` nicht aktiviert ist. Das ist ein begrenzter Nachweis der
getesteten Konfiguration, kein pauschaler Ausschluss der Meldung.

Ein bloßer AJV-Override ist inkompatibel: ältere URN-Schema-IDs und die
Validierungsaufrufe in `ocpp-rpc` müssen gemeinsam migriert werden. Der
[frühere Nachweis](../../own-adapter-test-20261015/dependency-review/README_DE.md)
reproduziert diesen Fehler bereits mit AJV 8.20.0. Ein gepatchtes OCPP-Paket ist
nicht veröffentlicht. Es wurde deshalb weder eine ungetestete Bibliothekskopie
eingeführt noch die Validierung abgeschaltet. Der vorhandene Befund
**EOS-OCPP-LOCK-AUDIT-20261007** bleibt offen.

### Backup / Dropbox

`dropbox-v2-api` 2.5.12 ist weiterhin die veröffentlichte Version und bindet
`request` 2.88.2. Die verbleibenden Meldungen betreffen `request`
([GHSA-p8p7-x288-28g6](https://github.com/advisories/GHSA-p8p7-x288-28g6)),
`tough-cookie` 2.5.0
([GHSA-72xf-g2v4-qvf3](https://github.com/advisories/GHSA-72xf-g2v4-qvf3)) und
`uuid` 3.4.0 ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)).
Ein kompatibles Update der aufrufenden Bibliothek ist nicht veröffentlicht.

Dropbox ist eine vorhandene optionale Produktfunktion und wurde nicht entfernt.
Quellprüfung: Der Upload benötigt einen konfigurierten Zugang und Archive; die
Listenfunktion benötigt einen Zugang und die passende Speicherauswahl. Die
verwendeten API-Ressourcen setzen feste Dropbox-Endpunkte und
`followRedirect: false`; sie aktivieren keinen Cookie-Jar. Die untersuchten
Request-Helfer laden UUID v4; die UUID-Meldung betrifft andere Varianten. Diese
beobachteten Grenzen sind keine vollständige Nichterreichbarkeitsbewertung und
keine Freigabe für sämtliche möglichen Konfigurationen. Eine saubere Migration
benötigt positive und negative Upload-, Download-, Listen-, Lösch- und
Authentifizierungstests einschließlich Abbruch und Ressourcenfreigabe. Es wurden
keine echten Cloud-Zugänge oder Kundendaten für diese Prüfung verwendet.

## Ausgeführte Prüfungen und Grenzen

Umgebung: Linux/x64, Node 24.19.0, npm 11.9.0. Installation der Testabhängigkeiten
mit `npm ci --ignore-scripts --no-audit --no-fund`; keine npm-Lifecycle-Hooks.
Dies ist kein Zieltest unter Node 24.21.0/ARM64, systemd oder auf dem Pi.

| Prüfung | Ergebnis |
|---|---|
| Neue Abhängigkeitsregression | 5/5 bestanden: tatsächliche Modulauflösung, Loopback-Redirect mit synthetischen Headern, Request-Query/Multipart-Kompatibilität, begrenzter Upload mit Dateibereinigung, OCPP-Validatoren |
| Devices `npm test` | 289/289 bestanden nach finaler Lockfile-Aktualisierung |
| EEBUS `npm test` | Bestanden einschließlich TypeScript-Build, Konfiguration, Bridge/CLS, Paket, SHIP/TLS und Lizenz-/Inbetriebnahmetests |
| OCPP `npm test` | Bestanden: 25 Kern-, 46 Paket-, 25 Lizenz-/Inbetriebnahme- und 15 Transporttests; reale lokale TLS-Verbindungen mit synthetischen Zertifikaten |
| UI, gezielte Sicherheitsprüfungen | 28 Auth-, 34 Update-Status- und 26 Rollen/SSE/Service-Worker-Tests sowie Public-API- und Startkettenprüfung bestanden |
| UI `build:ts`, `publish:check` und Paket-Trockenlauf | Bestanden; 408 inventarisierte Runtime-Dateien, 409 npm-Paketeinträge |
| UI `test:all` | Nicht vollständig bestanden: nach Korrektur des alten Textvertrags bis zum Home-AppCenter-Browsertest ausgeführt; fehlendes Chromium beendet den Lauf. Folgende Tests der Kette dadurch nicht ausgeführt |
| Backup `TZ=UTC npm test` | Paket 78, Typen 3, Unit 1 und EOS-Profil 2 bestanden; SD-Zweig 26/27 bestanden, dann `chown` auf Test-UID mit `EINVAL` in dieser Containerumgebung fehlgeschlagen |
| Backup, anschließend separat | Influx-CLI 7/7 sowie Lizenz/Start/Restore/Archive/Influx-Sicherheit 72/72 bestanden |
| Alle fünf npm-Pakete | `npm pack --dry-run --json --ignore-scripts` bestanden; daraus folgt keine vollständige Freigabe |

Der erste Backup-Lauf ohne `TZ=UTC` traf außerdem auf eine bestehende
zeitzonenabhängige Dateinamen-Erwartung. Der UTC-Wiederholungslauf bestätigt den
EOS-Profiltest, behebt aber nicht die fehlende Containerberechtigung des
separaten SD-Tests. Es wurde kein fehlgeschlagener Test durch einen Skip als
bestanden gezählt.

Der UI-Artefaktvertrag war bereits vor dieser Änderung gegenüber den aktuellen
Lizenzdateien veraltet. Der vorhandene Generator hat das **aktuelle** Manifest
an sechs schon vorhandene Dateiinhalte und drei schon gelistete zusätzliche
Dateien angepasst. Der RC67-Test erwartete alte UI-Texte, obwohl der bestehende
Code bereits den zentralen Home-/Pro-Lizenzstatus ausgibt. Nur diese Texterwartungen
und die zugehörige Erklärung wurden korrigiert; die Prüfungen auf Anmeldung,
Capability, lokale Schreibsperre und gesperrte Gerätesteuerung bleiben erhalten.
Der TypeScript-Testspiegel wurde mit dem vorhandenen Generator synchronisiert.
Historische Lieferarchive, Signaturen und Nachweise wurden nicht verändert.

Reproduzierbarer zusätzlicher Regressionstest nach Installation der fünf
Komponentenabhängigkeiten:

```sh
timeout 20s node --test reports/integration/security-refresh-20261021/adapters/dependency-regression.test.cjs
```

`verification.json` bindet Änderungen und Belege an Dateihashes. Tests mit
Mocks oder synthetischen Loopback-Gegenstellen ersetzen weder Hardwareprüfungen
noch den noch ausstehenden frischen Gesamt-Laufzeitnachweis.
