# Integrierte EOS-Entwicklung: Einrichtung und Betriebsgrenzen

Arbeitsstand `0.2.0-dev.2`, 1. Oktober 2026. Maßgeblich für tatsächlich bestandene
Prüfungen ist `reports/integration/branding-roles/verification-summary.json`. Dieses Dokument ist kein Nachweis
einer bereits ausgeführten Installation auf Debian 12, Raspberry Pi oder VMware.

## Umfang

Die Quellen von Admin 7.10.11, UI 1.0.21, Devices 0.5.169, EEBUS 0.3.0,
OCPP21 0.4.0 und Backup 1.0.10 liegen unter `components/`. Sie sind bearbeitete
Entwicklungsstände, keine neue Veröffentlichung dieser Versionsnummern.
Der neue Einrichtungspfad ist auf genau **Admin und UI im Laborprofil** begrenzt.
Die UI zeigt ausdrücklich den gesperrten Steuerungsstatus; Energiefunktionen
bleiben im Quellcode erhalten. Eine gültige Lizenz aktiviert in diesem Profil
keine physischen Schreibbefehle. Für den normalen Anlagenbetrieb fehlt noch die
abgenommene Aktivierung einschließlich gerätespezifischer Ausfallstrategien.

## Voraussetzungen für eine spätere Zielhost-Abnahme

1. Frischer Debian-12-/Bookworm-64-Bit-Testhost mit SSD/Snapshot und den
   Voraussetzungen der `TEST_BASE_QUICKSTART_DE.md`; keine bestehende Anlage.
2. Geprüftes, signiertes **integriertes** Laufzeitpaket mit genau den beiden
   zugelassenen Adaptern. Der alte Kernstand `0.1.0-test.1` reicht dafür nicht.
   Ein Quell-ZIP und eine SBOM sind keine Paketfreigabe.
3. Individuelles, gerätebezogenes Passwort für **NexoWatt Service/Admin** in einer
   root:root-0600-Datei. Dieses Passwort wird keinem Installateur oder Benutzer
   als gemeinsamer Zugang übergeben. Zusätzlich eine geschützte Kontendatei
   root:root 0600 nach `system/integration/accounts.schema.json`: 2 bis 16 Konten,
   mindestens eines mit Rolle `installer` und eines mit Rolle `enduser`.
   Benutzernamen und Passwörter müssen jeweils unterschiedlich sein; persönliche
   Passwörter dürfen nicht dem Servicepasswort entsprechen. Alle Passwörter:
   15 bis 128 Unicode-Zeichen, maximal 256 UTF-8-Bytes, keine Steuerzeichen.
   Beide Dateien bleiben außerhalb des Repositorys; keine Passwörter in
   Shellargumenten, Git, Tickets oder Logs.
4. Herstellerseitige Datei mit öffentlichen Ed25519-Lizenzprüfschlüsseln nach
   dem Admin-Lizenzvertrag. Ein privater Signierschlüssel gehört nie auf EOS.
5. Explizite Liste der DNS-Namen und IP-Adressen, unter denen Browser zugreifen,
   als JSON-Array. LAN und gegebenenfalls Tailscale-Namen/IPs vorsehen. Wildcards
   werden nicht übernommen; localhost/Loopback werden für Prüfungen ergänzt.

## Implementierter Root-Einrichtungspfad

`tools/system/onboard-ui.cjs` nimmt ausschließlich die vier Optionen
`--password-file`, `--accounts-file`, `--license-trust`, `--hosts-file` mit
absoluten Pfaden entgegen.
Dateien und übergeordnete Verzeichnisse müssen root gehören und dürfen weder
gruppen-/weltbeschreibbar noch symbolische Verknüpfungen sein. Die private
Servicepasswortdatei und die Kontendatei dürfen außerdem keine Gruppen-/Weltrechte haben. Der Einstieg liegt
im überprüften schreibgeschützten Release. Kein Webadapter bekommt sudo dafür.

Der Ablauf:

- Signatur, tatsächlichen Programmbaum, exakte Adapteridentitäten und aktive
  Release-/Konfigurationsbindung prüfen; gemeinsame Wartungssperre setzen.
- Controller stoppen, TLS-Datenbanken benutzen und frische Kernpolicy prüfen.
- Individuelle HTTPS-CA und getrennte Admin-/UI-Schlüssel erzeugen. Der private
  Web-CA-Schlüssel bleibt root-only; Browser erhalten nur das öffentliche CA-Zertifikat.
- Administrator mit PBKDF2-HMAC-SHA256, 600.000 Iterationen und individuellem Salt
  anlegen. Persönliche Konten erhalten eigene Hashes und die Pflicht zum
  Erstpasswortwechsel. Ihre festen Rollen werden in den Enrollmentmarker
  aufgenommen; generische ioBroker-Rechte bleiben ausgeschaltet.
  Das Format ist mit dem geprüften Controller kompatibel. Das ist keine
  Behauptung eines speicherharten KDF oder einer Zielhardware-Laufzeitmessung.
- Beide Instanzen zunächst deaktiviert mit festen Sicherheitseinstellungen
  eintragen; keine Geräteinstanz anlegen.
- Statische Paketdateien durch die feste unprivilegierte Upload-Service-Unit
  bereitstellen. Sie erhält denselben schreibgeschützten Konfigurations-Bind-Mount
  wie der Controller, statt außerhalb dieses Namespace eine leere Platzhalterdatei zu lesen.
- Kontrollierten Start erlauben, frische Adapter-Heartbeats und erwartete
  HTTPS-Authentifizierungsantworten prüfen; Wartungssperre erst danach aufheben.
  Die Admin-Prüfung erwartet die tatsächlich beobachtete feste lokale
  Login-Weiterleitung; beliebige Weiterleitungen oder ungeschütztes HTTP 200
  erfüllen diese Prüfung nicht.

Die temporäre Startfreigabe bindet Prozesskennung, Startzeit im Kernel und Boot-ID.
Abbruch, Prozessende, veraltete Freigabe oder fehlende Freigabe bei bestehender
Wartungssperre verhindert den normalen Service-Neustart. Ein Fehler wird nicht
durch Löschen von Sperrdateien repariert. Den Fehlerbeleg sichern und im ersten
Testlauf zum frischen Snapshot zurückkehren. Der systemd-Mechanismus muss auf
dem Zielhost zusätzlich geprüft werden; Unit-Simulation und isolierte Proc-/TLS-
Tests ersetzen diese Prüfung nicht.

## Persönliche Anmeldung und Passwortvergabe

1. Der NexoWatt-Serviceverantwortliche bereitet die lokalen Konten und die
   Zuordnung zur Anlage vor. Die Rolle ist Teil dieser vertrauten Einrichtung;
   es gibt keine öffentliche Kontoerstellung und keine Rollenwahl in der Anmeldung.
2. Installateur und Benutzer erhalten jeweils nur den eigenen Benutzernamen und
   das eigene temporäre Startpasswort über einen dafür vorgesehenen geschützten
   Übergabeweg. Die Software implementiert keinen Versand dieser Geheimnisse.
3. Erste Anmeldung am HTTPS-Ziel mit diesem Startpasswort. Vor Zugriff auf
   Produktfunktionen muss ein eigenes neues Passwort gesetzt werden; dafür ist
   das bisherige Passwort erneut einzugeben. Auf dieselbe vertrauenswürdige
   Geräteadresse und gültiges Zertifikat achten.
4. Nach erfolgreicher Änderung erneut anmelden. Auf HTTPS-Port 8081 öffnet sich
   für Installateur und Benutzer das NexoWatt-Portal mit Zugang zum Cockpit auf
   demselben Host, Port 8188; für NexoWatt Service bleibt die technische
   Administration verfügbar. Alte Sitzungen werden widerrufen;
   ein zuvor geöffnetes Fenster erhält dadurch keine fortdauernde Berechtigung.
5. Spätere eigene Passwortänderungen sind über den persönlichen Kontopfad möglich.
   Ein Installateur kann damit weder seinen Rang ändern noch Servicepasswörter
   zurücksetzen. Der begrenzte Admin-Kontenweg erlaubt ihm nur das Zurücksetzen
   eines zugehörigen Benutzerkontos; auch danach ist dessen eigenes Passwort neu
   zu vergeben. Servicezugang und übergreifende Wiederherstellung bleiben beim
   NexoWatt-Serviceverantwortlichen.

Die genauen Schnittstellen und Rollen stehen in
`docs/security/BRANDING_ROLES_DE.md`. Die Einrichtung benötigt zunächst lokale
rootgeschützte Zugangsdaten. Ein rein browserbasierter, geheimnisloser erster
Aktivierungsweg und MFA sind nicht implementiert. Dienstleisterzuordnung,
Einzelausgabe und sichere Aufbewahrung des Servicezugangs benötigen weiterhin
einen geregelten Betriebsprozess; der technische Kontoname `admin` identifiziert
für sich allein noch keine natürliche Person.

Der neue Enrollmentmarker hat Version 2. Ein eingerichteter Stand
`0.2.0-dev.1` lässt sich damit nicht still übernehmen. Im Entwicklungstest den
frischen Snapshot wiederherstellen und die aktuelle Einrichtung ausführen;
keine Marker löschen oder manuell erhöhen. Fehlgeschlagene Teilprovisionierung
bleibt gestoppt. Eine produktive Kontenmigration ist ein gesonderter Auftrag mit
Rückfall- und Wiederherstellungstest.

Nach erfolgreicher Einrichtung die geschützten temporären Eingabedateien gemäß
lokalem Geheimnisverfahren entfernen; sie gehören weder in Backups des
Quellrepositorys noch in Prüfberichte. Der Prozess speichert sie nicht als
Klartext in seinen Nachweisen. JavaScript-Strings lassen sich jedoch nicht
zuverlässig aus dem Prozessspeicher löschen; eine sichere Datenträgerlöschung
wird durch Dateilöschen nicht zugesichert.

## Browser, Lizenzen und Netze

Admin benutzt HTTPS-Port 8081, UI HTTPS-Port 8188, TLS 1.3. Die Listener binden derzeit an `0.0.0.0` (IPv4).
LAN und Tailscale benötigen passende Routen und Zugriffsregeln; IPv6-Erreichbarkeit
ist damit nicht implementiert oder nachgewiesen. Die Anwendung ersetzt keine
vorhandenen Routen oder Firewallregeln. Browser müssen der jeweiligen Geräte-CA vertrauen
und über einen im Zertifikat enthaltenen Namen zugreifen. Keine Empfehlung zum
Abschalten der Zertifikatsprüfung oder dauerhaften Übergehen von Warnungen.

Anmeldung und eigene Passwortvergabe bleiben ohne aktive Lizenz erreichbar.
Die Lizenzverwaltung ist ausschließlich dem angemeldeten Serviceadministrator
vorbehalten und bleibt für Einrichtung und Wiederherstellung auch ohne aktive
Lizenz zugänglich. Die Lizenz wird offline asymmetrisch geprüft
und lokal authentifiziert verschlüsselt gespeichert. UI fragt begrenzte,
kurzlebige Freigaben vom Admin über die TLS-gesicherte Messagebox ab. Das ist eine
gemeinsame ioBroker-Vertrauenszone, keine kryptografische Absenderisolation gegen
einen bereits kompromittierten Adapter mit gleichen DB-/Dateirechten.

Tailscale wird durch diese Einrichtung weder angemeldet noch als Subnet-Router
oder Exit-Node konfiguriert. Für einen späteren Test wird der Testhost dem vom
Betreiber gewählten Tailnet zugeordnet, der Servicezugang auf berechtigte
Identitäten beschränkt und die Erreichbarkeit von SSH/HTTPS ausdrücklich geprüft.
Keine Tailscale-Schlüssel oder Kundenzugänge werden im Lieferpaket mitgegeben.

## Grenze für Mesh- und Maschine-zu-Maschine-Zugriffe

Auch die vorhandenen Mesh-HTTP-Endpunkte liegen hinter der allgemeinen
Anmeldung. Ein unbeaufsichtigter, nicht angemeldeter Mesh-/M2M-Aufruf erhält im
aktuellen Previewprofil HTTP 401. Die Software stellt dafür noch keine eigene
Maschinenidentität, mTLS-Clientzulassung oder freigegebenen Dienstkontoablauf
bereit. Persönliche Installateur-/Servicezugänge sind kein Ersatz für diese
noch fehlende Schnittstelle und werden hierfür nicht verteilt.

Die nachgelagerten Mesh-HMAC- und Körpergrößengrenzen werden im Quelltest mit
einem ausdrücklich authentifizierten Installateurkontext geprüft. Das belegt
keinen unbeaufsichtigten Meshbetrieb. Meshquellen bleiben erhalten; die sichere
M2M-Zulassung und ihre Geräte-/Wiederanlaufprüfung sind vor Aktivierung dieses
Betriebsmodus separat fertigzustellen.

## Bisher tatsächlich geprüfter Browserablauf

Der abschließende r2-Paketkandidat wurde mit echten Redis-, Controller-, Admin- und
UI-Prozessen sowie HeadlessChrome 153.0.8010.0 geprüft. Die erste persönliche
Passwortvergabe, das Rollenportal, Installateur-Dialoge und Cockpitnavigation
waren Bestandteil des bestandenen Laufs. Details und Hashes:
`reports/integration/branding-roles/ui-controller-summary.json` (14 Stufen,
15 TAP-Ergebnisse einschließlich Parent; alle bestanden).
Der Lauf verwendet ausdrücklich eine OS-Schnittstellen-Fixture, UID 0 und eine
ausgeschaltete Chromium-Sandbox; die Web-Sicherheitsfunktionen blieben aktiv.
Der Browser akzeptierte nur die beiden temporären Server-SPKI-Werte. Das ist
keine Anleitung, Zertifikatswarnungen auf einer Anlage zu umgehen, und keine
Abnahme der CA-Einrichtung auf Kundengeräten. Diese begrenzte Prüfung ersetzt keinen vollständigen Funktions-/Gerätetest.

Der vollständige UI-Pflichtlauf `npm run test:all` für r2 ist am unveränderten
99-Peer-Mesh-Timingtest fehlgeschlagen (`stale_or_invalid_lease` bei einem
250-ms-Takt). Ursache und Abhilfe sind noch offen; der erfolgreiche Anmelde-/
Rollenlauf hebt dieses Entwicklungsfreigabegate nicht auf. Gate: `UI-MESH-PERF-20261001`. Genau ein separater Mesh-Aufruf bestand mit
792 Antworten (P95 92 ms, Maximum 121 ms); er ersetzt den fehlgeschlagenen
Gesamtlauf nicht. Rohbeleg und Einordnung:
`components/ui/reports/security/roles-20261001/final-verification.json` und
`test-all-final-r2.log` in demselben Ordner.
Unbeaufsichtigter Meshbetrieb und physische Steuerung bleiben gesperrt.

## Sicherheitsnachweise und verbleibende Abnahmen

- Architektur: `docs/architecture/INTEGRATED_SYSTEM.md`.
- Anforderungen und STRIDE: `docs/cra/INTEGRATED_TEST_REQUIREMENTS.md`,
  `docs/security/INTEGRATED_TEST_THREATS.md`, `system/integration/requirements.json`.
- Aktueller Build-SBOM-Nachweis und Grenzen: `reports/integration/sbom/branding-roles/`; ältere Inventare bleiben historische Stände.
- Zertifikatsverfahren: `docs/operations/CERTIFICATE_LIFECYCLE.md`.
- Geräte-/Protokollstatus: `docs/integration/ADAPTERS_INTEGRATED.md`.

Offen bleiben insbesondere echte Debian-/Pi-Ausführung unter getrennten
Dienstkonten, grafische Browserabnahme und vollständiger Einrichtungs-/Recoveryprozess, MFA, Tailscale-Zugriffsprüfung,
physische Failsafes, Stromausfall-/SSD-Abnahme, allgemeine Updates/Migrationen und
vollständige verschlüsselte Backup-Wiederherstellung. Das vorliegende UI-Laborprofil
ist kein freigegebenes, vollständig nutzbares Anlagenprodukt.

Passwort-KDF-Ausgangspunkt: OWASP Password Storage Cheat Sheet, abgerufen am
1. Oktober 2026, https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html.
