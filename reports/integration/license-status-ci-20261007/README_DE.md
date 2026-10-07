# Lizenzstatus und CI-Fehlerkorrektur – 07.10.2026

Ausgangsstand: `592cbad4ad2c66e413c72a4efea7f37015cd2d4e` auf `main`.
Dieser Bericht gehört zu den Änderungen im selben Commit; die Dateihashes im
Nachweis binden die lokal geprüften Eingaben. Kein Installations-, Release-,
Produktions- oder CRA-Konformitätsnachweis.

**Nachtest vom 07.10.2026:** Auf `47d67d9d2962e04dfc9276891f49c3ae211d6642`
bestand [EOS security regression 37666232804](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37666232804)
vollständig mit allen sieben Jobs. Die Workflow-Syntaxprüfung
`37666232772` bestand ebenfalls. Einträge weiter unten beschreiben ausdrücklich
die erhaltenen früheren Zwischen- und Fehlstände. Die getrennte CodeQL-Analyse
`37666232856` lief bei dieser Nachweissicherung noch; kein Nullbefund wird daraus
abgeleitet.

| Aktuelle CI-Prüfgruppe | Ergebnis |
|---|---|
| Build, Syntax und isolierte Sicherheitsregression | Bestanden |
| Node-24-, Bootstrap-, Einrichtungs- und Transportverträge | Bestanden |
| Eigene Adapter und zentrale Lizenzen | Bestanden; UI 52 plus 2 Root-Dateifälle, Devices 14, EEBUS Paket 50 plus Lizenz 21 plus Transport 6 und weitere Skripte, OCPP 25/46/7/13, Backup 50; kein übersprungener Ersatz für den Rechtefall |
| Architektur und begrenzte Quell-SBOM | Bestanden; keine vollständige Geräte-SBOM |
| Nativer PostgreSQL-Controllerstart und Neustart | Bestanden |
| Nativer historischer Admin-/UI-Verbund | Bestanden |
| Aktueller nativer R9-Verbund mit NWL3 Home/Pro | Bestanden; alle 14 benannten Prüfgrenzen, echte HTTPS-Anmeldungen und Neustart |

Die aus GitHub gelesenen Job-/Schrittergebnisse und Artefakt-Digests stehen in
`evidence/github-security-47d67d9.json`. Der per ZIP-Digest geprüfte native
Originalbeleg liegt in `evidence/r9-native-47d67d9.json`; App-Inhaltshash:
`cd2f9538116b68d1e4d62b6dc4b8c6160ffd30d5e0e0f26bcb650b6d021f39f3`.
Er benennt den eigenen unsignierten Laboraufbau ausdrücklich. Eine spätere
R9-Buildanforderung braucht den erneuten erfolgreichen Lauf ihres genauen
Marker-Commits und darf diesen Beleg nicht auf einen fremden Commit umetikettieren.

## Bestätigte Ursachen und Änderungen

1. Admin löschte die eingegebene Lizenz vor der Aktivierungsantwort. Jetzt erst
   nach positiv validierter Antwort des zentralen Dienstes (inklusive dessen
   Speicherung/Rückprüfung). Eigener sichtbarer Home-/Pro-Status, Gültigkeit und
   Prüfzeitpunkt; erneutes Öffnen liest gespeicherten Status. Fehler behalten
   die Eingabe und zeigen einen festen Diagnosecode. Veralteter NWL2-only-Hinweis
   entfernt; NWL3-Systemvertrag und bestehende NWL2-Kompatibilität unverändert.
   Anfragen: ein Fünfsekundenbudget inklusive Antwortbody, Abbruch, 32-KiB-Limit,
   keine Redirects/Retry, kein Browser-Speicher. Serverauth, CSRF, Signaturprüfung,
   UUID-Bindung und Verschlüsselung wurden nicht abgeschwächt.
2. [Diagnoselauf 37657806247](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37657806247):
   Job `112917291093` scheiterte bei `npm ci`, weil OCPP keine eingecheckte
   Lockdatei hatte. Neue v3-Lockdatei aus unverändertem `package.json` mit npm
   11.9.0 erzeugt, alle vier `npm ci --ignore-scripts` lokal erfolgreich.
   Neuer unabhängiger Vorabtest prüft Lockdateien, Manifestgleichheit, HTTPS und
   Integritätsangaben, einschließlich negativer Fälle. Kein `npm install`-Fallback.
3. Derselbe Lauf, Job `112917291785`: `R9_NATIVE_ROOT_FIXTURE_REJECTED:OPT_MODE`.
   Nur der bestätigte disponible Runner darf nach Kontext-/Kandidatenprüfung die
   Schreibbits 0022 am root-eigenen `/opt` entfernen. FD-basierte Identitätsprüfung,
   keine Rekursion, kein Eigentümerwechsel. Falsche UID, Symlinks, ersetzte Inodes,
   vorhandene EOS-Pfade und fehlende CI-Marker bleiben abgewiesen. Produktcode
   und Plattformschutz unverändert. Die reine Diagnose zuvor änderte nichts.

## Lokale Prüfungen

Linux x64, Node 24.19.0, npm 11.9.0; CI verwendet weiterhin Node 24.21.0.

| Prüfung | Ergebnis und Grenze |
|---|---|
| Neue Frontend-Regression gegen alten Code | 13 von 13 zunächst fehlgeschlagen; Fehler reproduziert. |
| Frontend nach Korrektur | 13/13 bestanden; tatsächlich ausgeliefertes JS, DOM/fetch-Fixture, kein Browser. |
| Admin Lizenz-Core/-Service/-Client/-HTTP/-Trust + Frontend + R9-Verträge | 117/117 bestanden, kein Skip. |
| R9-Fixture/Session einzeln | 15/15 bestanden; Root-Syscalls simuliert, kein lokaler Aufbau unter `/opt`. |
| Lock-Vorabtest | 5/5 bestanden, inklusive negativer Prüfdaten. |
| Admin `check:eos-stability` | Exit 0; bestehende Prüfungen vollständig, aktualisiertes Prebuilt-Siegel. |
| Gemeinsame Adapter-Zulassung | 4/4 bestanden. |
| UI Quell-, Auth- und Lizenztests | 52/52 bestanden, dazu TS-Executable-/Mirror-Abgleich, Typecheck und Dokumentationscheck bestanden. |
| Devices Lizenz-Lifecycle | 14/14 bestanden. |
| EEBUS `npm test` | Exit 0; Build, Protokoll-, Paket-, Transport- und Lizenztests. |
| OCPP `npm test` | Exit 0; 25 Core, 46 Paket, 7 Lizenz und 13 Transportprüfungen bestanden. |
| Backup | Typecheck/Publish-Prüfung bestanden. Lokaler Offline-Lauf: 48/50; UTC-Datumstest danach bestanden, echter Rechtefall lokal blockiert (nur UID 0 gemappt, `chown(65534)` → EINVAL). Keine Prüfung entfernt; unverändert in CI als normaler Runner ausführen. |
| Browser | OFFEN: Playwright-Browser fehlt; Download lieferte kein gültiges Archiv. Kein Browser-Erfolg behauptet. |
| Neue OCPP-Lockdatei, npm Audit | NICHT sauber: 11 Einträge (4 high, 6 moderate, 1 low; 0 critical), darunter Entwicklungs- und transitive Abhängigkeiten. Befunde müssen getrennt auf Betroffenheit und geeignete Korrekturen geprüft werden; bestandene Funktionstests sind keine Entwarnung. |

Ausgewählte Rohlogs und Eingabehashes stehen in `evidence/` (beim roten
Frontend-Vorlauf wurden nur abschließende Leerzeichen normalisiert).
Die GitHub-Gesamtprüfung des neuen Commits ist bei Erstellung dieses Berichts
noch ausstehend. Frühere grüne Läufe gelten nicht automatisch für neuen Code.

## Lieferkette, CRA/SBOM und Rückfall

Die neue OCPP-Lockdatei bindet Entwicklungs-/CI-Abhängigkeiten (247 Pakete plus
Root). Das ist keine Aussage, dass alle davon auf dem Pi ausgeliefert werden.
R9 übernimmt weiterhin ausschließlich die authentifizierte R8-Drittanbieterbasis
und ersetzt geprüfte eigene Paketdateien. Die artefaktgebundene R9-SBOM muss bei
jedem Kandidatenbau neu aus dessen tatsächlichen Dateien erzeugt und geprüft
werden. Keine alte SBOM als Nachweis für geänderte Bytes verwenden. Admin enthält
keine neue Runtime-Abhängigkeit; sein Prebuilt-Manifest wurde nach den Tests
aktualisiert. Signierte historische Lieferdateien und öffentliche Installer-Pins
bleiben unverändert. Die CRA-Arbeitsliste bleibt offen, nicht „zertifiziert“.

Ein Quellcommit installiert nichts auf dem Pi. Vor neuer Lieferung sind die
nativen PostgreSQL-/Admin-/UI-Prüfungen gegen denselben App-Inhalt, Signatur und
Publikationsgates nötig. Danach ARM64/Pi, echter Browser, Neustart, Admin-Anmeldung
und Lizenzstatus mit vorhandenem Herstellertresor abnehmen. Physische Adapter
und Anlagenfreigaben bleiben getrennt. Keine Pauschalrechtekorrektur auf dem Pi.
Bei einem Produktfehler nur den dokumentierten signierten Rückfallweg verwenden;
Hersteller-Vertrauensanker, Lizenzdaten und Konten nicht zurücksetzen.

## Zweiter CI-Befund und gezielte Nachkorrektur

Quellstand `0aa9b458db4ee29020f710c6c1b48c7c49475ff3`,
[Lauf 37661833151](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37661833151):
Die beiden ursprünglichen Vorbereitungsfehler sind behoben: alle Lock-Installationen
und der echte root-eigene R9-Aufbau liefen erfolgreich. Fünf Prüfgruppen bestanden.
Die nun tatsächlich ausgeführten nachfolgenden Prüfungen zeigten zwei weitere Fehler:

- UI-Dateirechtestest erwartete Root-Eigentum an einer vom normalen Runner
  erzeugten temporären Datei. Der Test wird fachlich getrennt: HTTPS-/Adaptertests
  bleiben unprivilegiert und verlangen dort Ablehnung. Ein kleiner gesonderter
  verpflichtender Dateitest erzeugt als Root ausschließlich eigene temporäre
  Testdateien und prüft die echte unveränderte Schutzfunktion, einschließlich
  Symlink, Hardlink, zu offenen Dateirechten und schreibbarem Verzeichnis.
  Kein Skip, keine Eigentümersimulation und kein Root-Adapterbetrieb.
- Der echte R9-Lauf erreichte PostgreSQL-mTLS, Setup, Enrollment und Admin-HTTPS,
  aber nicht UI-HTTPS (`MANAGEMENT_PRODUCTION_READINESS_FAILED`, Deadline 8188).
  Die Quellprüfung fand einen konkreten Blocker: Die echte UI-`package.json`
  ist 73.193 Byte groß, während `assertEosPlatform` höchstens 65.536 erlaubte.
  Der neue Test mit genau dieser Datei reproduzierte `EOS_PLATFORM_FORMAT`.
  Alle sechs identischen Clientkopien erlauben jetzt fest höchstens 128 KiB für
  Paketmetadaten. State-/Profillimits bleiben 4/32 KiB; Eigentümer, Links,
  Deskriptoridentität, Paketversion und tatsächlicher Prozesspfad bleiben geprüft.
  Übergrößen und Wachstum während des Lesens werden weiterhin abgewiesen.

Lokal nach dieser Korrektur: 140/140 Lizenz-, Plattform-, Buildparitäts-,
Adapterzulassungs-, Lock- und R9-Vertragstests; Admin-Stabilitätskette Exit 0;
54/54 UI-/Auth-/Lizenz-/Root-Dateiprüfungen. UI-Dokumentation regeneriert und
geprüft. Root-/Non-Root-Gesamtkombination sowie erneuter tatsächlicher nativer
R9-Start werden durch den nächsten CI-Lauf bewertet. Ein gefundener und isoliert
behobener Startblocker ist noch kein erfolgreicher vollständiger R9-Lauf.

Das Backup-Paketmanifest bindet nach bestandenen Lizenz-/Recoverytests den neuen
Hash und die neue Größe genau dieser einen Clientdatei. Die übrigen Einträge und
die Publish-Prüfung bleiben unverändert. EEBUS/OCPP-Gesamttests und Devices-Lizenztests
wurden nach Übernahme des identischen Clients erneut erfolgreich ausgeführt.

Der erste native Fehlbeleg bleibt als `evidence/r9-native-0aa9b45.json` erhalten.
Die `node-forge`-Advisory [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
führt zum Prüfzeitpunkt keine gepatchte Version; ein erzwungenes npm-Downgrade ist
kein belastbarer Produktsicherheitsnachweis. Die übrigen Audit-Einträge umfassen
auch Entwicklungswerkzeuge und abhängige Elternpakete, nicht elf unabhängig
bestätigte Exploitpfade. Befundbewertung und geeignete Dependency-Upgrades bleiben
ausdrücklich offen; kein Auditfilter wurde gesetzt und kein Befund unterdrückt.

## Abgleich des UI-TypeScript-Spiegels

Auf `203f8fa371700b8151cd15d4b374c0763a3c92f9`, Lauf `37664109237`,
bestanden bereits beide echten Root-Dateirechtetests und alle 52 normalen
UI-/Auth-/Lizenztests. Der anschließende Build-Abgleich entdeckte den noch alten
TypeScript-Parallelspiegel des geänderten Plattformlesers. Mit dem bestehenden
`sync:ts-runtime-mirrors`-Generator wurde ausschließlich dieser Spiegel erneuert
(neues 128-KiB-Limit samt beiden Aufrufen und Herkunftshash). Manuell typisierte
andere Spiegel wurden nicht verändert. Danach bestanden Executable-Abgleich
(135 Dateien), Mirror-Abgleich (501 Dateien), Mirror-Typecheck, `docs:build`
und `docs:check` (237 Quellbeschreibungen). Rohbeleg: `evidence/ui-build-mirror-check.log`.

### Tatsächlicher nativer Erfolg auf 203f8fa

Im selben Lauf `37664109237` bestand der aktuelle native R9-Job `112938797512`
vollständig: echte PostgreSQL-17.11-mTLS-Verbindungen, Admin-/UI-HTTPS-Anmeldung,
unlizenzierter Verwaltungsstart, NWL3 Home 3/2, Lizenzentzug, NWL3 Pro 50/10,
Neustart mit erhaltener Freigabe, unveränderte App-Dateien und Ablehnung eines
nicht zugelassenen Prozesses. Kein physischer Adapter wurde gestartet.
Der bereinigte, an diesen Commit und App-Hash gebundene Beleg liegt in
`evidence/r9-native-203f8fa.json`. Auch die historischen nativen Controller- und
Admin/UI-Prüfungen bestanden. Der Gesamtlauf war wegen des oben dokumentierten
TS-Spiegelabgleichs noch rot; dies wird nicht als vollständig grüne CI ausgegeben.
Der nachfolgende Spiegelcommit braucht einen eigenen erfolgreichen Gesamtlauf.

## OCPP-Transportfixture im normalen GitHub-Runner

Auf `7bd9d63a71c57bf15c0a3cf06eee50ca940b57b0`, Lauf `37665136358`,
bestanden nun auch sämtliche UI-Spiegel-, TypeScript- und Dokumentationsprüfungen,
Devices und EEBUS. Die OCPP-Kern-, Paket- und Lizenztests bestanden ebenfalls.
Die bisherige Transportfixture scheiterte vor dem TLS-Aufbau an `EACCES` beim
Anlegen von `/root/eos-ocpp-security-*` als unprivilegierter Runner. Der lokale
Root-Lauf konnte diesen Unterschied nicht aufdecken.

Die CI führt nun dieselben vier OCPP-Prüfgruppen vollständig aus: Core, Paket
und Lizenz als normaler Benutzer, ausschließlich die vorhandene isolierte
Transportfixture mit `sudo node --test`. Diese Fixture verlangt UID 0 ausdrücklich,
erzeugt eigene temporäre Schlüssel und bindet ausschließlich einen zufälligen
Loopback-Port. Kein Adapter-Hauptprozess, Anlagenkontakt, Paketinstallationsskript
oder Produktverzeichnis läuft dabei privilegiert. Der echte Profilleser und alle
TLS-/SAN-/Zertifikats-Negativfälle bleiben unverändert. Ein Wechsel in ein
schreibbares `/tmp` oder fingiertes Dateieigentum wäre keine gültige Korrektur.
Ein Gesamttimeout begrenzt die Fixture auf 60 Sekunden. Das ist keine Aussage über
die noch offene Dienstbenutzer-/Hardwareabnahme auf dem Pi.

Lokal bestanden alle 13 Transportfälle ohne Skip; Rohbeleg
`evidence/ocpp-root-transport.tap`, Eingabebindung in
`evidence/ocpp-fixture-source-inputs.json`. Der lokale Workflow-Linter konnte
sein fest gepinntes Werkzeug wegen Proxy-Timeout nicht laden; die verpflichtende
GitHub-Workflowprüfung bleibt maßgeblich und wird nicht umgangen. Im vorherigen
Lauf `37665136358` bestanden inzwischen alle sechs anderen Sicherheitsjobs,
einschließlich der erneuten aktuellen R9-Qualifikation `112942316356`.

## Kurze Abnahme auf dem eigenen Pi nach dem passenden TEST-Update

Der hier beschriebene Sollzustand muss auf der veröffentlichten R9-Lieferung
mit diesen Quellen geprüft werden; alte R8-Seiten enthalten die Korrektur nicht.
Vorher die Voraussetzungen und den Rückfallweg der
[R9-Testanleitung](../../../docs/operations/TEST_R9_UPDATE_DE.md) beachten.

1. Admin über die vertrauenswürdige Geräte-HTTPS-Verbindung öffnen und normal
   anmelden. Im Lizenzbereich Geräte-UUID und vorhandenen Lizenzstatus prüfen.
2. Einen für diese UUID erzeugten Home- oder Pro-NWL3-Schlüssel eingeben und
   aktivieren. Erst nach bestätigter Speicherung darf das Eingabefeld leer
   werden; gleichzeitig muss „EOS Home/Pro aktiviert · Lizenz gültig“ erscheinen.
3. Seite neu laden und erneut anmelden: Edition, Gültigkeit und Prüfzeitpunkt
   müssen weiterhin sichtbar sein. Der vollständige gespeicherte Schlüssel
   wird bewusst nicht zurückgegeben.
4. Nach einem kontrollierten Pi-Neustart Admin, UI und denselben Lizenzstatus
   prüfen. Den Versions-/Release-Stand und das Ergebnis festhalten.
5. Bei einem Fehler nur den angezeigten Diagnosecode und den Release-Stand
   melden. Eine vorhandene gültige Lizenz nicht für einen Fehlertest löschen;
   Schlüssel, Passwörter und private Zertifikate gehören nicht in Screenshots.

Diese Bedienprüfung ist noch OFFEN. Die bereits bestandenen CI-Prüfungen
ersetzen weder den echten Browser noch Dienstrechte, Update und Hardware auf
dem Pi. Physische Adapter bleiben bis zur jeweiligen Anlagenabnahme gesperrt.
Neue Befunde und nächste Schritte stehen mit den Kennungen
`EOS-LICENSE-STATUS-20261007`, `EOS-PLATFORM-METADATA-20261007` und
`EOS-OCPP-LOCK-AUDIT-20261007` im vorhandenen Befundregister; alte Befundzustände
bleiben erhalten.

## Tatsächlich veröffentlichte R9-Testlieferung

Die anschließende, ausschließlich den Buildmarker ändernde Anforderung
`ab95661567533935f4e26e478a36c552cc5e0dc5` bestand den eigenen vollständigen
[Security-Lauf 37667636597](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37667636597).
Der [Lieferlauf 37668413232](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37668413232)
bestand alle vier Jobs: Anforderungsprüfung, Bau/Signierung/Readback, unabhängige
Rekonstruktion/Veröffentlichung und öffentlicher Updatebefehl. Frühere Belege
wurden nicht auf diesen neuen Quellcommit umgeschrieben.

| Bindung | Veröffentlichter Wert |
|---|---|
| Version | `0.2.0-test.3`, Revision 9, Sequenz 12 |
| Archiv-Commit | `a7fb2ac48bb375c63bc3cd7a5576cda271fc9736` |
| Einstieg-Commit | `8dd76a9563a07e6daf973ca9370718933a6c170c` |
| Befehls-Commit | `1b2708ad47d0d88b818e8eeb301bd25d7fbe51b6` |
| Release-ID | `97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000` |
| Archiv | 88.944.737 Byte; SHA-256 `8adad353b83de5f396cb9402442f430d65f70e9538390e8b02b6073bc21e7d31` |
| Einstieg | 29.906 Byte; SHA-256 `3eceb24333bc60f18d8b437a0dd1faf2807ecec2820ad270d360aa6df5f810a5` |
| Gebundener App-Inhalt | `cd2f9538116b68d1e4d62b6dc4b8c6160ffd30d5e0e0f26bcb650b6d021f39f3` |
| Signierte Dateien / Runtime-SBOM | 22.316 Dateien / 646 CycloneDX-1.5-Komponenten |

Die generierten Rohbelege und die maschinenlesbare SBOM stehen unter
`reports/integration/installable-test3-r9-20261005/`. Die öffentliche
Transportprüfung verglich Archiv, Schlüssel und Liefermetadaten bytegenau.
Zusätzlich wurde der veröffentlichte Einstieg über seine fest gepinnte Raw-URL
gelesen und lokal auf obige Größe und SHA-256 geprüft. `sha256sum -c bundle.sha256`
bestand für das aus Git zurückgelesene Archiv und den öffentlichen Schlüssel.
Der Betreiberbefehl bestand `bash -n`; die Hauptanleitung übernimmt ihn bytegenau
aus der veröffentlichten Textdatei. Keine dieser Prüfungen führt ein Pi-Update aus.

Dieser Stand übernimmt die authentifizierten R8-Drittanbieterbytes. Der
SBOM-Beleg benennt deshalb `vulnerabilityScanPerformed=false` und
`operatingSystemInventoryIncluded=false`. Die elf OCPP-CI-Auditknoten sind weiter
offen und keine aktuelle vollständige Bewertung der ausgelieferten Runtime.
Die Benutzer-, Geräte- und Produktionsfreigaben bleiben wie oben abgegrenzt.
