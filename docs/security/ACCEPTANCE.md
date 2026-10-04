# EOS: Änderungen, Migration und Freigabesperren

**CI-Nachtrag vom 04.10.2026:** Die historischen Plattform-Installationsjobs
wurden durch ausdrücklich begrenzte EOS-Installer-Vertragsprüfungen ersetzt.
Schutzregeln für Plattform, Pfade, Rechte und gestoppten Dienst bleiben erhalten;
ein erwarteter Schutzabbruch wird nur mit passender Diagnose als bestandener
Negativtest gewertet. Neue Workflow-Prüfung und gezielte Dateiauslöser vermeiden
wiederkehrende unpassende Installationen bei Dokumentations-Pushes.
[Änderung, konkrete Prüfungen und Grenzen](../../reports/integration/workflow-repair-20261004/README.md).
Dies schließt die unten genannten nativen Installations-/Hardwaregates nicht.
Die folgenden Aussagen dokumentieren weiterhin den historischen Stand vom
30.09.2026; aktuelle R6-Lieferung und Pi-Anleitung stehen in der README auf `main`.

Stand: 30.09.2026. Basis: NexoWatt/EOS Commit `18195cd94f1b0972d093128ab4572742515f7799`.
Lokaler Prüfzweig: `security/eos-first-run-hardening-20260930`.

**Ergebnis:** Die geprüfte Admin-Ersteinrichtung behebt die Installer- und internen Kommunikationsbefunde nicht automatisch. Dieses Paket ist ein lokal getesteter Härtungskandidat für Linux/systemd. Es ist keine produktionsfertige EOS-Auslieferung, keine vollzogene Anlagenmigration und keine CRA-/IEC-Konformitätserklärung.

## Tatsächlich geändert

- Linux erzeugt keine allgemeinen sudo-Rechte für das Dienstkonto oder alle lokalen Benutzer. Bekannte alte Policy und Node-Capabilities werden kontrolliert entfernt; unbekannte Anpassungen führen zum Abbruch. Gerät-/Docker-/Redis-Zugriff wird nicht automatisch gewährt.
- Der globale CLI-Wrapper und die TLS-Prüfung liegen root-eigen außerhalb des Laufzeitbaums. Auch Root-Aufrufe führen Runtime-JavaScript nur unter `iobroker` aus. Dienststeuerung benötigt eine getrennte OS-Administration. Remote-Downloads über `iob fix/diag/nodejs-update` sind abgeschaltet.
- Neuinstallation verwendet lokale bzw. eingebettete Bibliothek, Versionsdaten und Sicherheitshelfer. npm-Lifecycle-Skripte laufen unter dem Dienstkonto. Die Neuinstallation übernimmt keinen vorhandenen Laufzeitbaum.
- Der Fixer verlangt einen gestoppten Dienst ohne Prozesse des Dienstkontos und deaktiviert Autostart vor der Migration. Er führt keine pauschalen Updates, Datenbankkompression oder Datenmigration aus. Bei Fehlern bleibt eine manuell zu prüfende, möglicherweise teilweise geänderte Installation zurück.
- Der Systemd-Dienst erhält `IOB_NO_SETCAP=true`, `NoNewPrivileges=true`, eine leere Capability-Menge und einen statischen TLS-Konfigurationstest vor dem Start. Nach Installation/Wartung bleibt er gestoppt und deaktiviert.
- Der alte `--redis`-Pfad wird verweigert. Es findet weder eine unverschlüsselte Neuinstallation noch ein Überschreiben von `iobroker.json` durch diesen Helfer statt.
- Updater-Logs liegen in einem atomar erzeugten privaten Verzeichnis. SFTP verlangt einen unabhängig verifizierten SHA-256-Hostkey. npm-Wrapper verwenden kein `eval`; die Anweisung zum Abschalten der TLS-Zertifikatsprüfung wurde entfernt.

## Was diese Änderungen ausdrücklich noch nicht leisten

Der TLS-Validator kontrolliert das Konfigurationsformat für externe Redis-Clients mit TLS 1.3, expliziter Gegenstellenprüfung, CA und Zugangsdaten. **Er provisioniert keinen Redis-Dienst und weist keinen tatsächlichen TLS-Handshake nach.** Das Standard-JSONL-Profil wird abgewiesen. Die Startprüfung schützt nicht vor nachträglicher oder gleichzeitiger Manipulation durch einen kompromittierten Prozess. Sie ersetzt weder im Controller erzwungene Regeln noch unveränderliche Sicherheitskonfiguration.

Admin 8.0.14 kann TLS-Optionen in den Basiseinstellungen verlieren. Sein Wizard garantiert außerdem kein HTTPS ab dem ersten Passwort. Diese Upstream-Komponenten wurden untersucht, in diesem Installer-Repository aber nicht verändert. Der eigene EOS-Admin und die jeweiligen Adapterquellen fehlen hier. Deren Berechtigungen, Kommunikationskanäle, Reconnect-Verhalten und HTTPS-Fehlerpfade sind offene Arbeit.

Gemeinsame OS-Identität und gemeinsame DB-Zugangsdaten trennen kompromittierte Adapter nicht voneinander. Feldprotokolle, Mehrhostbetrieb, Fernzugriff und Browserkommunikation werden durch eine DB-TLS-Prüfung nicht automatisch verschlüsselt. mTLS pro Adapter erfordert getrennte Identitäten, Schlüsselbereitstellung und Autorisierung.

Die npm-Runtime-Abhängigkeiten werden weiterhin über veränderliche Tags aufgelöst; Lockdatei, vollständiges Release-Manifest, signierte Updatekette und SBOM des tatsächlichen Lieferstands sind offen. Windows-/NPX-Pfade sind nicht gehärtet und nicht Teil dieses Linux-Profils. Die alten plattformübergreifenden CI-Abläufe erwarten automatischen HTTP-Start; sie sind kein positiver Nachweis für diesen bewusst gestoppten Kandidaten und müssen vor einer Freigabe durch echte abgesicherte Installationstests ergänzt werden. Ihre Anforderungen werden nicht durch die isolierten Tests als erfüllt markiert.

## Migration auf einem isolierten Testabbild

1. Tatsächlich installierte Versionen, Hardware/OS, Adapterliste, Verbindungen und benötigte Geräte-/Netzrechte inventarisieren. Quellcode des EOS-Admin und aller ausgelieferten eigenen Adapter bereitstellen.
2. Vollständiges Backup erstellen, Wiederherstellung auf getrenntem Abbild nachweisen und Wartungsfenster mit sicherem Anlagenzustand planen. Ein bloßer Export ohne Restoretest reicht nicht.
3. Ausgechecktes Prüfpaket und Versionshash außerhalb des Dienstkontos schützen. Bestehende sudo-Konfiguration, Capabilities, Gruppen und Systemd-Unit gesondert sichern. Dienst und alle Dienstkontoprozesse stoppen.
4. Lokalen Fixer ausführen. Fremde sudoers-Regeln oder unbekannte Capabilities bewusst prüfen; Abbruch nicht durch pauschales Überschreiben umgehen. Eine eigene Policy darf nicht automatisch in allgemeine Rechte zurückfallen.
5. Auf dem Abbild native Redis-TLS-Dienste, individuelle Zugangsdaten und Zertifikatsbetrieb einrichten. Daten/Dateien/Objekte/Zustände mit unterstütztem Verfahren migrieren und vergleichen. Admin-Konfigurationserhalt und sichere Erstbereitstellung im tatsächlichen EOS-Quellcode implementieren. Siehe `RUNTIME_TLS.md`.
6. Nachstehende Nachweise erbringen. Erst danach Dienstaktivierung und Rollout freigeben. Kein automatischer Rollback auf die alten breiten sudo-Rechte oder auf Klartext.

## Offene Abnahmegates

| Gate | Erforderlicher Nachweis | Status dieses Pakets |
|---|---|---|
| Vollinstallation/Bestandsmigration | Frischinstallation, erneuter Fixerlauf, Fehler während Migration, Reboot, Backup/Restore auf Ziel-OS | Nicht ausgeführt; Umgebung besitzt kein nutzbares Systemd-Testabbild |
| Tatsächliche Hostgrenzen | Runtime darf keine Rootwerkzeuge, Dienststeuerung oder geschützte Wrapper verändern; OS-Admin kann zulässige Wartung ausführen | Isolierte Stubs geprüft; reale UID-/sudo-/Capability-Grenzen offen |
| Interne Verschlüsselung | Reale Controller-/Redis-/Adapter-Verbindungen einschließlich PubSub, Reconnect und Neustart | Nicht ausgeführt; Validator ist statisch |
| Negative TLS-/Authfälle | Falsche/abgelaufene CA, falscher SAN, falsches Passwort, TLS 1.0/1.1/1.2 und Klartext verweigert; kein Ausweichpfad | Konfigurationsfehler isoliert geprüft; reale Server-/Netztests offen |
| Admin-Ersteinrichtung | Geschützter Erstkontakt, verpflichtende Anmeldung, Zertifikatsfehler ohne HTTP, Abbruch/Reload/Restore, Erhalt der DB-TLS-Einstellungen | Upstream-Schwächen reproduziert; Korrekturen im EOS-Admin offen |
| Adapter und Anlage | Minimale Rechte, autorisierte Befehle, Wiederholungen/veraltete Werte, Ausfallzustand und Wiederanlauf je Gerät | Quellen und konkrete Zielanlage fehlen |
| Lieferung und Betrieb | Reproduzierbare Artefakte, SBOM, signierte Updates, getesteter Rollback, Support-/Meldeprozess | Teilweise SFTP-Härtung; Gesamtprozess offen |
| Recht/Normen | Produktgrenze, CRA-Einstufung, vollständige anwendbare Normtexte, Anforderungen und unabhängige Nachweise | Thematische Zuordnung in `CRA_IEC_SCOPE.md`; keine Konformität |

## Zuordnung zum ersten Sicherheitsbericht

| Befund NW-EOS-260930 | Nachbearbeitung im Kandidaten |
|---|---|
| 01 / 02: sudo- und ALL-Rechte | Codepfade geändert; echte Rechte-/Migrationstests offen |
| 03: veränderbarer globaler Wrapper | Root-eigener Einstieg implementiert; vorhandene Runtime bleibt gemeinsame Vertrauenszone |
| 04: Updater-Logpfad | Private atomare Ablage implementiert und isoliert geprüft |
| 05 / 06: Klartext-Redis / Konfigurationsverlust | Unsicherer Automatismus abgeschaltet; TLS-Provisionierung und Datenmigration offen |
| 07: veränderlicher Fremdcode | Lokale/eingebettete Helfer und keine Remote-CLI-Wartung; npm-/Releasekette weiter offen |
| 08: SFTP-Hostkey | Pflichtprüfung implementiert; echter Server-/Rotations-/Deploytest offen |
| 09 / 10: Windows-Eingaben / Dienstkonto | Unverändert offen, außerhalb des Linux-Profils |
| 11: SBOM-/CI-/Release-Nachweise | Fokussierte CI ergänzt; vollständige Produktnachweise offen |
| 12: Abschalten der Zertifikatsprüfung | Anweisung entfernt; kein entsprechender unsicherer Installationslauf ausgeführt |

Kein Befund ist damit pauschal als am ausgelieferten EOS-Gesamtprodukt geschlossen markiert. Rohresultate und Quellstand müssen bei jeder Änderung gemeinsam fortgeschrieben werden.
