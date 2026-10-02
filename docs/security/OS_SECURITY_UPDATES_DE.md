# Automatische Betriebssystemupdates und sichtbarer Status

Stand: 01.10.2026 · Entwicklungsstand `0.2.0-dev.5` · Ausgangscommit
`c18ae242efa69a7e8c79c81d1ce3dc074904aea6`.

Dieser Nachtrag behandelt den automatischen OS-Updatepfad. Die zugehörigen
Prüfergebnisse, Quellhashes und Grenzen stehen in
`reports/integration/os-updates/verification-summary.json`.
**Die Redis-Installationssperre `EOS-HOST-REDIS-20261001` bleibt bestehen.**
Keine Änderung dieses Nachtrags wurde auf dem Pi des Nutzers installiert.

## Auftrag und Abgrenzung

Der Nutzer hat automatische Debian-Sicherheitsupdates mit sichtbarem Status
im EOS-System verlangt. Seine zunächst bestätigte Redis-Festlegung wurde
später am selben Tag durch den Auftrag zur Alternativensuche abgelöst;
SQLite mit AES-256 wurde ausdrücklich zur Prüfung vorgeschlagen. Die
[aktuelle Architekturprüfung](../architecture/DATABASE_TRANSPORT_OPTIONS_DE.md)
trennt Speicherung, Transport und Controller-Kompatibilität. Eine Migration
wurde nicht durchgeführt. InfluxDB2 bleibt davon unabhängig der vorgesehene
Zeitreihenspeicher; seine Installation wurde hier nicht belegt.

Die Bestandsausgabe des Pi beschreibt `nexowatt-eos.service` unter
`/opt/nexowatt-eos`, mit Benutzer und Gruppe `nexowatt`. Dieser Pfad entspricht
nicht dem integrierten Testpaket. Version, Quellherkunft, wirksame Sandbox und
Redis-Nutzung dieses Bestands sind weiterhin unbekannt. Gemeinsame Namen von
Anmelde- und Dienstkonto sind kein Nachweis von sudo-Rechten oder eines Angriffs.
Bestandsdaten werden nicht gelöscht oder durch die Neuinstallation migriert.

## Vertrauensgrenzen

Der OS-Updater läuft als separater systemd-Wartungsdienst. Die Paketverwaltung
muss Systemdateien ändern und Paket-Skripte ausführen können; sie benötigt daher
Hostrechte. Diese Rechte erhält weder der js-controller noch ein Adapter noch
die UI. Es gibt keine Webschnittstelle für Shellbefehle, Paketnamen, Quellen,
Neustarts oder ein frei wählbares Updateprogramm.

Der Updater verwendet die Distributionswerkzeuge APT und `unattended-upgrades`.
APT prüft signierte Repository-Metadaten und die darin gebundenen Paket-Hashes;
HTTPS und fest zugeordnete Archivschlüssel ergänzen diesen Vertrauenspfad.
Es wird keine eigene Kryptografie und kein `curl | bash`-Updatepfad eingeführt.
Debian-Hauptversionswechsel sind kein automatisches Sicherheitsupdate.

Die Ausgabe liegt außerhalb der durch EOS beschreibbaren Datenverzeichnisse:
`/var/lib/nexowatt-eos-os-updates/status.json`. Nur der Hostdienst schreibt dort.
Die UI liest eine begrenzte reguläre Datei, prüft Eigentümer, Zugriffsrechte,
Vorfahren und Feldtypen und gibt nur eine nicht geheime Zusammenfassung aus.
Sitzung, Lizenz und vorhandene Rollenprüfung bleiben vor dem API-Zugriff aktiv.

## Umfang und Betriebsgrenzen

- Debian 12 und 13 werden als getrennte, fest benannte Releases behandelt.
  Auch in den regulären Release-Kanal übernommene Sicherheitskorrekturen müssen
  berücksichtigt werden; Stable-Korrekturen sind nicht automatisch reine
  Sicherheitsänderungen.
- Raspberry Pi verwendet zusätzlich Herstellerpakete für das OS und die
  Hardware. Ein gemischter Herstellerkanal beweist keine vollständige
  Klassifikation als Sicherheitsupdate. Diese Abdeckung bleibt sichtbar.
- Fremdquellen, manuell installierte Binaries, Node.js, npm-Abhängigkeiten und
  EOS-Adapter werden nicht allein durch eine Debian-Paketaktualisierung gepflegt.
  Der signierte EOS-Updatepfad bleibt dafür erforderlich.
- Die exakt freigegebene Node-Laufzeit darf nicht unbemerkt von APT ersetzt
  werden. Zurückgehaltene relevante Updates müssen als blockiert erscheinen;
  sie sind keine erfolgreich behobenen Schwachstellen.
- Ein Timer oder ein konfiguriertes `enabled`-Feld ist kein Erfolgsnachweis.
  Versuch, erfolgreicher Lauf, Paketbestand, offene Updates und beobachteter
  Timerzustand werden getrennt geführt. Fehlende, ungültige, veraltete oder aus
  der Zukunft stammende Statusdaten dürfen keinen grünen Zustand erzeugen.
- Es erfolgt kein automatischer Rechnerneustart. Ein installiertes Paket kann
  weiterhin einen Dienst-, Sitzungs- oder Kernelneustart benötigen.
  Paket-Skripte können Dienste während eines Updates neu starten. Eine
  unterbrechungsfreie Anlagenregelung wird deshalb nicht behauptet; das
  Wartungsfenster und die Geräte-Failsafes müssen auf der Zielanlage abgenommen
  werden.
- Ein abschaltbarer Updatepfad darf nicht still als aktiv angezeigt werden.
  Das sichere Zurückstellen eines Wartungslaufs und die Nutzerinformation
  gehören zum Betriebsverfahren. Ein manuelles Unterbrechen von dpkg ist
  keine Rückfallstrategie.

## STRIDE für diese Änderung

| Kategorie | Konkrete Bedrohung | Maßnahme und verbleibende Grenze |
| --- | --- | --- |
| Spoofing | Fremdes Paketarchiv liefert angebliche Sicherheitsupdates | Feste Quellen und Schlüsselbindung, APT-Metadatenprüfung; Schlüssel- und Herstellervertrauen bleiben externe Voraussetzungen. |
| Tampering | Adapter verändert Updater, Richtlinie oder Status | Rootgeschützte Code-/Konfigurationspfade und getrenntes Statusverzeichnis; UI verweigert Links und unsichere Rechte. Kompromittiertes Host-Root liegt außerhalb dieser Grenze. |
| Repudiation | Ein fehlgeschlagener Lauf erscheint als erfolgreich | Getrennte Zeitpunkte, feste Fehlercodes, Paketinventar und Hashbezug; lokale Nachweise sind keine unabhängige Fernattestierung. |
| Information Disclosure | Paketlogs, Quellenzugänge oder Geheimnisse gelangen in die UI | Geschlossener Statusvertrag, Zusammenfassung statt Rohprotokollen; bestehende Authentifizierung bleibt erforderlich. |
| Denial of Service | APT-Lock, Netzausfall, voller Datenträger oder unterbrochene Paketinstallation | Begrenzte Abrufe, Fehlerzustände und schonender Abbruch; keine Paketinstallation im API-Prozess. Stromverlust und tatsächliche Wiederaufnahme sind Hardware-Abnahmen. |
| Elevation of Privilege | Webbenutzer oder Adapter steuert Root-Paketverwaltung | Nur lesbarer fester API-Pfad, kein sudo/Polkit-Auftrag aus EOS. Signierte Distributionspakete führen bestimmungsgemäß privilegierte Installationsskripte aus. |

## SBOM und Nachweise

Am Entwicklungsstand wurden folgende Prüfungen ausgeführt:

| Prüfung | Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Host-, Installer-, Release- und Bundleverträge | 84 bestanden | Isolierte Dateisystem-/Befehls-Fixtures, systemd-Grammatikprüfung; kein installierter Pi. |
| Python-Updater | 22 bestanden | Fehler-/Abbruchpfade und Schemas; echter APT-Konfigurationsparser nur lesend. Keine echte Pakettransaktion oder Python-APT-Cacheintegration. |
| Statusdatei und HTTPS-API | 34 bestanden | Echte Route mit Controller-/Status-Fixtures; Authentifizierung und Eingabegrenzen. |
| Bestehende Anmeldung und Kontorollen | 34 bestanden | Gezielte Regression, kein kompletter Produkt-Pentest. |
| Python-Produzent zu JavaScript-Verbraucher | 2 bestanden | Tatsächliche Module, synthetische Zustände; keine Hoständerungen. |
| Chromium und visuelle Abnahme | bestanden | Desktop/Mobil, Offline, Browser-Zwischenspeicher, Injection/Fehleranzeige; isolierter Root-Laborbrowser ohne Sandbox, genauer temporärer Zertifikatsschlüssel freigegeben. |
| Quell-/Dokumentationsabgleich, Paket-Dryrun, ergänzende Quell-SBOM | bestanden | Offline; kein neues signiertes Laufzeitpaket und keine Veröffentlichung. |

Der frühere 82-Test-Lauf bleibt als Zwischenstand erhalten und wird nicht zu
den 84 endgültigen Hostprüfungen addiert. Nach dem Fund eines generierten
Python-Caches wurde die Bundlegrenze so ergänzt, dass Cachedateien nicht still
in die Lieferung gelangen; dafür wurden zwei Negativtests hinzugefügt.
Die frühere 41/43-Regression war durch eine noch nicht ergänzte Test-Fixture
verursacht und ist mit der Korrektur dokumentiert. Zwei zunächst fehlgeschlagene
Aufrufe des Quell-SBOM-Prüfers betrafen die lokale Python-Umgebung; die
anschließende Offline-Schemaprüfung verwendete die vorhandenen Prüfbibliotheken.

Eine getrennte KI-Codeprüfung fand und prüfte unter anderem Korrekturen an
Kernelpaket-Zugriff, APT-Konfigurationsisolation, Holds, Statusvertrag und
Browser-Frische nach. Sie ist kein unabhängiger externer Penetrationstest.
Das vorhandene offene Mesh-Timing-Gate wurde nicht erneut ausgeführt oder
durch diese erfolgreichen Teilprüfungen geschlossen.

Der neue Inventarpfad erfasst tatsächlich installierte dpkg-Pakete als
CycloneDX-JSON. Ein Paketinventar ist kein Schwachstellenscan. Insbesondere
zeigt es nicht allein, ob ein laufender Prozess bereits die neue Bibliothek
verwendet. npm-/EOS-Build-SBOM, OS-Inventar und Quell-SBOM bleiben getrennte
Artefakte mit jeweils eigener Geltungsgrenze.

Die historischen signierten Laufzeitpakete und ihre SBOMs bleiben unverändert.
Sie enthalten diese neue Funktion nicht. Diese Lieferung ist ein vollständiger
Quellstand; sie enthält keine neue signierte und auf ARM64 abgenommene Runtime.
`reports/integration/os-updates/source-supplement.cdx.json` bindet die geänderten
Produktquellen mit SHA256. Diese Ergänzung ist bewusst keine erfundene
Zielhost-SBOM. Betrieb und noch nötige Hardwareprüfungen:
[`OS_SECURITY_UPDATES_DE.md`](../operations/OS_SECURITY_UPDATES_DE.md).

## CRA-Einordnung der Redis-Lücke

Eine neu erkannte Lücke macht ein Entwicklungsprojekt nicht dauerhaft
konformitätsunfähig. Der betroffene Stand wird gesperrt, durch einen konkret
behobenen Stand ersetzt und erneut geprüft. Die tatsächliche Produktbetroffenheit
und die Umsetzung werden dokumentiert. Eine Risikoakzeptanz ersetzt die
wesentlichen Anforderungen nicht. TLS abzuschalten ist für EOS keine geeignete
Behebung, weil damit die vereinbarte Transportabsicherung entfiele.

Der offizielle Debian-Sicherheitstracker führt das angebotene Trixie-Paket
`5:8.0.2-3+deb13u2` beim Abruf am 01.10.2026 weiterhin als von
`CVE-2026-81934` betroffen. Ein Updateautomat kann eine noch nicht in seinem
freigegebenen Kanal verfügbare Korrektur nicht installieren. Ein Exploit gegen
EOS und eine betroffene Redis-Installation auf dem Nutzer-Pi wurden nicht
nachgewiesen.

Die Hauptpflichten des CRA gelten ab 11.12.2027, die Hersteller-Meldepflichten
für aktiv ausgenutzte Schwachstellen und schwerwiegende Sicherheitsvorfälle
bereits seit 11.09.2026. Die Aufnahme einer CVE in den Debian-Tracker belegt
allein weder aktive Ausnutzung noch einen meldepflichtigen Vorfall bei NexoWatt.
Support, Schwachstellenbehandlung, Produktabgrenzung, Nachweise und das
anwendbare Konformitätsverfahren bleiben gesonderte Herstelleraufgaben.
Dieser Nachtrag ist keine Konformitätserklärung und kein unabhängiger Pentest.

Primärquellen, geprüft am 01.10.2026:

- [Debian Redis-Advisory](https://security-tracker.debian.org/tracker/CVE-2026-81934)
- [Debian unattended-upgrade-Handbuch](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html)
- [Raspberry Pi OS und Paketpflege](https://www.raspberrypi.com/documentation/computers/os.html)
- [CRA, Verordnung (EU) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng)
- [EU-Kommission: CRA-Zusammenfassung](https://digital-strategy.ec.europa.eu/en/policies/cra-summary)
- [EU-Kommission: Meldepflichten](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting)

Der vollständige EUR-Lex-Abruf war in dieser Sitzung durch eine Bot-Prüfung
eingeschränkt. Die Datums-/Prozessangaben wurden direkt bei der EU-Kommission
gegengeprüft; keine angebliche neue verbindliche Rechtsprüfung wird daraus
abgeleitet.

## Geprüfte Alternative: Valkey

Auf die Nachfrage des Nutzers wurde Valkey als möglicher anderer Datenbankserver
untersucht. Die Verschlüsselungsbasis bleibt TLS mit geprüften Zertifikaten.
Valkey unterstützt das RESP-Protokoll und Redis-Clients; daraus folgt noch kein
bestandener Test unseres Controllers, seiner Lua-/PubSub-Funktionen oder der
Persistenz auf dem Pi.

Die offizielle Valkey-Meldung `GHSA-53mc-f3m3-99vh` nennt für die verwandte
TLS-Lücke `CVE-2026-56684` die behobenen Stände 7.2.14, 8.0.10, 8.1.9, 9.0.5
und 9.1.1. Debian führt am 01.10.2026 sein Trixie-Paket
`8.1.1+dfsg1-3+deb13u2` weiterhin als betroffen. Ein bloßer Wechsel zu diesem
Paket ist deshalb keine Behebung. Eine pauschale Schwachstellenfreiheit neuerer
Valkey-Versionen wird ebenfalls nicht behauptet.

Ein Wechsel erfordert ausdrücklich freigegebene Artefakte und echte
Engine-Erkennung; ein umbenanntes Binary oder ein kompatibles Redis-Versionsfeld
ersetzt diese Prüfung nicht. Die Upstream-Migrationsdokumentation beschränkt
die Datenformatkompatibilität auf Redis bis 7.2. Redis-8-AOF-/RDB-Dateien dürfen
daher nicht ungeprüft übernommen werden. TLS-/ACL-, Controller-, Persistenz-,
Wiederherstellungs- und ARM64-Tests wären erforderlich. **Keine Migration
implementiert; keine neue Laufzeitfreigabe.**

- [Valkey TLS-Dokumentation](https://valkey.io/topics/tls/)
- [Valkey-Migrationsgrenzen](https://valkey.io/topics/migration/)
- [Valkey-Herstelleradvisory](https://github.com/valkey-io/valkey/security/advisories/GHSA-53mc-f3m3-99vh)
- [Debian Valkey-CVE-Bewertung](https://security-tracker.debian.org/tracker/CVE-2026-56684)
