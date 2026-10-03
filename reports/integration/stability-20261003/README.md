# Stabilisierung der Ein-Befehl-Testinstallation

03.10.2026. Ausgangspunkt: `main` Commit
`66a3762f75e9e0ffc56159fe7142f6059dd550b3`. Nutzerauftrag: vollständige,
nachvollziehbare Pi-Testinstallation, Frontend-Ersteinrichtung, CRA-Unterlagen
und SBOM. Autorisierte Änderungen erfolgen gemäß `AGENTS.md` auf `main`.

## Ergebnis und Grenzen

**Zielrückmeldung / Einstiegskorrektur:** Der ursprüngliche öffentliche Einstieg
scheiterte auf dem Nutzer-Pi an `RECOVERY_PATH_OWNER`. Der [neue, separat
gebundene Einstieg 2](../recovery-pg-owner-20261003/README.md) korrigiert die
Prüfung leerer PostgreSQL-Verzeichnisse. R4-Runtime und App-SBOM bleiben
unverändert. [Aktueller Veröffentlichungsnachweis](../recovery-pg-owner-20261003/publication.json).

**Aktualisierung:** R4 ist gebaut, veröffentlicht und zusammen mit dem
tokenfreien öffentlichen Download vollständig zurückgelesen. Der konkrete
[Veröffentlichungsnachweis](publication.json) nennt den Produktquellstand,
die Commits für Dateien und Einstieg, Signatur, SBOM-Hash und tatsächliche Tests.
[Öffentlicher Download und Wiederholung der GitHub-Prüfungen](public-download.md).

Dieser Stand korrigiert konkrete Installations- und Erststartfehler und liefert
den signierten ARM64-Kandidaten **test.3 Revision 4, Sequenz 7**. Ein neues
Artefakt gilt erst mit dem erfolgreichen Buildbericht als erzeugt; Veröffentlichung
und Rücklesen werden getrennt dokumentiert. Die bloße Aufnahme der Quellen oder
ein grüner Teiltest ist keine bestandene Gesamtinstallation.

Die neue Erstinstallation umfasst die vorhandenen Produktpakete einschließlich
Node und PostgreSQL-Vorbereitung. Benutzerpasswörter werden ausschließlich im
geschützten Erststart-Frontend vergeben. Die bekannten Sperren für nicht
abgenommene Anlagenbefehle, zusätzliche Adapter und JavaScript bleiben wirksam.

## Befunde und Maßnahmen

| Kennung | Befund | Maßnahme / Nachweis | Status |
| --- | --- | --- | --- |
| EOS-STAB-20261003-01 | Root-Bootstrap verwendet umask 077. `mkdir(mode=0755)` erzeugte den PostgreSQL-Konfigurationsordner tatsächlich mit 0700; das separate Dienstkonto kann ihn nicht betreten. | Explizites chmod 0755 nach exklusiver Verzeichnisanlage. Echte OpenSSL-/Dateirechteprüfungen unter umask 022 und 077; private Schlüssel weiterhin 0600, CA-Unterordner 0700. | Quellkorrektur nachgeprüft; native Dienst-/Pi-Abnahme offen. |
| EOS-STAB-20261003-02 | Eine nicht abschließende Browseranfrage konnte Einrichtung und Statusanzeige unbegrenzt blockieren. | Gemeinsames 5-s-Budget einschließlich Body, Abort, Zustandsabgleich vor manuellem Neuversuch, maximal 180 s Statusabfrage. | 17 Frontend-Logiktests bestanden; echter Browser-/Pi-Test offen. |
| EOS-STAB-20261003-03 | Sicher ausgegebene Installerfehler verloren die bereits ermittelte Installationsphase. | Elf feste Phasen im Fehlerbericht; unbekannte Werte bleiben unterdrückt. | 16 isolierte Tests bestanden. |
| EOS-STAB-20261003-04 | Grüne Security-CI deckte zentrale Bootstrap-/Onboarding-/PG-/Adapterkanalpfade nicht ab; runtime/components fehlten im Trigger. | Explizite zusätzliche EOS-Vertragstests, korrigierte Trigger und Ziel-Node-Version. Bestehende Gates bleiben erhalten. | Lokale Ergebnisse und neuer CI-Lauf getrennt im CI-Bericht. |
| EOS-STAB-20261003-05 | Frischinstallation und bereits diagnostizierter R2-Abbruch verlangten unterschiedliche Einstiege. | Ein generierter Kopierblock; nur bei vorhandener Bereitstellung wird der separat gepinnte, eng begrenzte R2-Recoveryhelfer vorgeschaltet. | Shell-/Pin-/Recovery-Vertragstests; tatsächliche Ziel-Recovery offen. |
| EOS-STAB-20261003-06 / NW-EOS-261003-RECOVERY-PG-OWNER | Recovery verwendet Root-Eigentümerprüfung für leere postgres-eigene PostgreSQL-Containerverzeichnisse und stoppt den Nutzerlauf. | Eng begrenzte Eigentümerprüfung mit lokal/NSS-verifizierter PostgreSQL-Identität; 47 Recovery- und 12 Bootstrap-Tests, Vorher-/Nachher-Beleg. | Lokal und EOS-CI nachgeprüft; erneute Pi-Recovery und Installation offen. |

Teilberichte: [Erststart](onboarding.md), [Installerdiagnose](installer-diagnostics.md),
[CI](ci.md), [PostgreSQL-Rechte](postgresql-permissions.md).

## Lieferkette und SBOM

Der R4-Bau verwendet den vollständig authentisierten, bereits gelieferten
R3-App-Baum bytegleich. Das vermeidet eine unbeabsichtigte Neuauflösung von
npm-Abhängigkeiten. Ursprüngliche Lockdatei, CycloneDX-Laufzeit-SBOM und
Transformationsbelege bleiben an genau diesen App-Baum gebunden. Ihre historischen
Umgebungsangaben werden nicht in angebliche neue Buildläufe umgeschrieben.

Die geänderten Host-/Runtimequellen erhalten ein neues Payload-Inventar, einen
neuen Release-Hash, eine neue Testsignatur und eine höhere Sequenz. Archiv,
signiertes Manifest, SBOM-Hash und die tatsächlichen App-Dateien werden zusammen
geprüft. Fehlende historische kompilierte EEBUS-/Backup-Einstiege dürfen nur mit
explizitem, hashgebundenem R3-Wiederverwendungsnachweis übernommen werden.
Der Compilerlauf wird dadurch nicht als erneut durchgeführt dargestellt.

Maßgeblich: `../installable-test3-r4-20261003/build-verification.json`,
`../installable-test3-r4-20261003/runtime.cdx.json`, Quellbindung und
`../../../delivery/test-pi-0.2.0-test.3-r4/delivery.json` nach erfolgreichem Bau.
Ein flüchtiger Test-Signaturschlüssel ersetzt keine Produktionsschlüsselverwaltung.
Der authentisierte öffentliche Lizenzprüfanker wird unverändert weiterverwendet;
private Lizenzschlüssel werden weder benötigt noch veröffentlicht.

Die wiederverwendete App-SBOM ist keine Bestandsliste des späteren Pi-Basissystems.
Die tatsächlich installierten Debian-/PostgreSQL-/Node-Versionen und deren
Lieferkettennachweise gehören zusätzlich zur Zielhost-Abnahme. Ein Payload-
Dateiinventar ersetzt diese Betriebssystem-Komponentenliste nicht.

## Noch offene Freigaben

- Native Installation auf Debian 13 ARM64 mit PostgreSQL 17, Node 24.21.0 und
  systemd; echter Browserabschluss, Login und Reboot/Wiederanlauf.
- Backup und Wiederherstellung, Abbruch bei Datenträger-/Stromausfall und
  tatsächliche APT-Transaktionen. Der bisherige 1.800-s-APT-Timeout benötigt vor
  weitergehender Betriebsfreigabe eine gesonderte Prozess-/Recoveryprüfung.
- Das gespeicherte vollständige UI-Pflichtgate enthält weiterhin den Mesh-
  Zeitbudgetfehler. Keine Frist wurde gelockert, keine Anlagenfreigabe daraus
  abgeleitet. Die Testinstallation aktiviert den Mesh-Koordinator nicht.
- PostgreSQL-Zertifikate laufen nach 90 Tagen ab; Überwachung ist vorhanden,
  automatische Rotation/Widerruf sind nicht implementiert. Kein Dauerbetrieb
  ohne geplanten und abgenommenen Erneuerungsweg.
- Gemeinsame Runtime-Identität der Basisadapter; keine behauptete Isolation pro
  Adapter. Der neue Erweiterungskanal und freie JavaScript-Logiken bleiben gesperrt.
- CodeQL-/Repository-Freischaltung und alte Upstream-Plattformjobs haben eigene
  offene Befunde. Die neuen EOS-Tests ersetzen diese Ergebnisse nicht.

## CRA-/Sicherheitsnachweise

Diese Änderung verbindet Risiko, Korrektur, Tests, Quellstand und ausgeliefertes
Artefakt. Sie führt die bestehende CRA-/IEC-Arbeit fort, ist aber keine juristische
Konformitätsbewertung, unabhängige Zertifizierung oder vollständige Freigabe.
Die Produktgrenze umfasst weiterhin Linux-/Node-/Datenbankbasis, eigene und
mitgelieferte Drittkomponenten; der lokale Betriebsmodus ändert sich nicht.

Kein Test mit simulierten Konten, kontrollierter Uhr oder TLS-Laborserver wird
als Pi-/Anlagentest geführt. `verification.json` enthält die tatsächlichen lokalen
Ergebnisse und die verbleibenden Grenzen. Der konkrete GitHub-Lauf und ein späterer
Zielhostbericht müssen mit ihrem jeweiligen Commit/Release-Hash festgehalten werden.
