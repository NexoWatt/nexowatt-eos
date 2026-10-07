# Lizenzstatus und CI-Fehlerkorrektur – 07.10.2026

Ausgangsstand: `592cbad4ad2c66e413c72a4efea7f37015cd2d4e` auf `main`.
Dieser Bericht gehört zu den Änderungen im selben Commit; die Dateihashes im
Nachweis binden die lokal geprüften Eingaben. Kein Installations-, Release-,
Produktions- oder CRA-Konformitätsnachweis.

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
