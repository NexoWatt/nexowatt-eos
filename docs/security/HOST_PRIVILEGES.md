# Linux-Hostrechte: begrenzte Installer-Härtung

Änderungsstand: 30.09.2026, `installer_library.sh` Version `2026-09-30`.
Bezug: INS-001, INS-002, INS-006 und INS-008 des Installer-Audits.
Dieser Stand ist eine technische Härtung mit isolierten Tests, keine
Produktivfreigabe, vollständige Sandbox oder CRA-/IEC-Konformitätsbescheinigung.

Fortschreibung 01.10.2026: Upstream hat einen optionalen `--hardened`-Modus ergänzt. Quellenprüfung, Unterschiede zum strengeren EOS-Kandidaten und offene Migrationspunkte stehen in [UPSTREAM_HARDENED_REVIEW_2026-10-01.md](UPSTREAM_HARDENED_REVIEW_2026-10-01.md). Das ist keine Übernahme des Upstream-Patches und keine Aufhebung der folgenden EOS-Grenzen.

## Neue Voreinstellung

Der Linux-Installer verleiht dem Runtime-Konto weder allgemeine noch passwortlose
sudo-Rechte. Auch beliebige andere lokale Benutzer erhalten keine automatische
Dienststeuerung oder Controller-CLI-Freigabe. `/etc/sudoers.d/iobroker` enthält nach
erfolgreicher Einrichtung nur erläuternde Kommentare. Betreiber verwenden ihre
bereits vorhandene, unabhängig verwaltete OS-sudo-Berechtigung. Es wird keine neue
Betreiber-NOPASSWD-Gruppe und kein breit privilegierter Hilfsdienst eingerichtet.

Auch der installierende normale Benutzer wird nicht automatisch in die
Runtime-Gruppe aufgenommen. Bestehende Mitgliedschaften bleiben unverändert.
Operatoren verwenden ihre vorhandenen OS-Verwaltungsrechte. Andere bestehende
sudoers-Dateien, Gruppen wie `sudo` oder
`wheel` und individuelle OS-Konfigurationen werden nicht verändert. Ihre Prüfung
bleibt Teil der Zielsystemabnahme; dieser Patch entzieht nicht nachweislich jede
außerhalb des Installers vergebene Berechtigung.

Die gemeinsame Node-Binärdatei erhält keine globalen Netzwerk-Capabilities mehr.
Für Installer, CLI und systemd muss zusätzlich `IOB_NO_SETCAP=true` gesetzt sein:
Der untersuchte js-controller 7.2.2 kann andernfalls selbst versuchen, diese
Capabilities erneut einzurichten. Die zugehörigen Einstiegspunkte und Units sind
gesondert zu prüfen; ein beliebig gestarteter Controllerprozess wird nicht allein
durch diese Bibliothek kontrolliert.

Die Versionspolicy stammt über `EOS_VERSIONS_JSON` aus dem lokal geprüften bzw.
eingebetteten `versions.json`. Die Bibliothek lädt sie nicht mehr automatisch von
`master`. Ohne übergebenen Inhalt gelten ausschließlich die im Quellstand
enthaltenen Fallbackwerte; gehärtete Einstiegspunkte sollen den geprüften Inhalt
immer mitliefern. Auch die alten Hilfsfunktionen `install_redis` und
`configure_iobroker_redis` verweigern die automatische Bereitstellung ausdrücklich.
Sie verändern weder vorhandene Redis-Dienste noch `iobroker.json`; ein geprüftes
TLS-/Authentifizierungsprofil der tatsächlichen Laufzeit ist separat erforderlich.

## Migration bestehender Systeme

Vor einem Test auf einem bestehenden Gerät vollständige Sicherung, OS-Zugang mit
funktionierendem sudo und einen Wiederherstellungsweg vorsehen. Der Dienst muss
vor einer Rechteumstellung gestoppt und anschließend vollständig neu gestartet
werden. Bereits laufende Prozesse verlieren zusätzliche Gruppen oder bereits
erlangte Rechte nicht durch die Änderung einer Konfigurationsdatei.

1. Eine symbolisch verknüpfte oder unbekannte `/etc/sudoers.d/iobroker` wird nicht
   überschrieben. Die Einrichtung bricht mit einem Hinweis ab. Die Operatorin bzw.
   der Operator muss die fremde Policy prüfen und aus der ioBroker-spezifischen
   Datei entfernen beziehungsweise bewusst migrieren.
2. Automatisch migrierbar ist ausschließlich das erkennbare alte
   systemd-Installertemplate: die bisherige Dienstbenutzer-Kopfregel, mindestens
   drei bekannte Runtime-Regeln sowie alle drei globalen Dienststeuerungsregeln;
   zusätzliche fremde Regeln, Includes, Kommentare, unbekannte Programme oder
   nicht standardmäßige Programmpfade führen zum Abbruch. Das ist ein konservativer
   Inhaltsvergleich, kein kryptografischer Herkunftsnachweis. Ältere
   Nicht-systemd-Varianten benötigen eine manuelle Prüfung.
3. Die Ersatzdatei entsteht mit `mktemp` im root-kontrollierten
   `/etc/sudoers.d`. Sie wird auf Eigentümer root und Modus 0440 gesetzt, mit
   `visudo` geprüft und erst dann atomar umbenannt. Bei einem Fehler vor dem
   Umbenennen bleibt die vorherige Policy erhalten. Diese vorhandene Policy kann
   weiterhin unsicher sein; ein Abbruch ist keine erfolgreiche Härtung.
4. Nur die zwei vom alten Installer bekannten Capability-Sets werden automatisch
   entfernt: `cap_net_bind_service,cap_net_raw=eip` sowie diese Kombination mit
   `cap_net_admin`. Die Reihenfolge der Namen ist unerheblich. Andere Sets,
   Modi oder fehlerhafte Abfragen führen vor der Policy-Umstellung zum Abbruch;
   die vorhandenen Einstellungen bleiben zur Administratorprüfung erhalten.
5. Bestehende zusätzliche Gruppenmitgliedschaften `docker` und `redis` werden
   entfernt. Ist eine davon die primäre Gruppe, bricht die Migration vorher ab.
   Sonstige bestehende Gerätegruppen werden nicht ungefragt entzogen. Neue
   Gerätemitgliedschaften werden überhaupt nicht automatisch vergeben.
6. Ein bereits vorhandenes Runtime-Konto mit UID 0 wird abgelehnt, bevor eine
   Policy geändert oder Paketcode als dieses Konto ausgeführt wird. Eine
   automatische Umnummerierung vorhandener Konten erfolgt nicht.

Die Runtime-Rechtekorrektur bricht bei Eigentümer- oder ACL-Fehlern ab und
propagiert den Fehler zum Installer/Fixer. Der ACL-Status wird nur auf stdout
ausgegeben; ein privilegierter Logappend in den Runtime-Baum findet nicht statt.

Policy, Dateicapabilities und Gruppen können nicht als eine gemeinsame atomare
Transaktion geändert werden. Ein später Fehler kann deshalb einen teilweise
gehärteten Stand hinterlassen. Der Aufrufer muss den Fehler propagieren, den
Dienst gestoppt lassen und die verbleibenden Schritte prüfen. Es gibt keinen
automatischen Rückfall auf breite sudo-Rechte.

## Gerätezugriffe gezielt freigeben

Die tatsächlichen Gruppen und Gerätedateien unterscheiden sich je Distribution
und Hardware. Vor einer gezielten Freigabe Gerät, Zugriffsrichtung, Adapter,
Bedarf und Restrisiko dokumentieren. Keine pauschale Gruppenliste übernehmen.

| Möglicher Bedarf | Bisherige Gruppe | Vorgehen |
|---|---|---|
| Serielle USB-/RS485-Schnittstelle | `dialout`, distributionsabhängig | Zugriff auf konkrete Gerätedatei/udev-Regel prüfen; nur für benötigten Adapter freigeben. |
| GPIO oder I²C | `gpio`, `i2c` | Tatsächliche Geräte und mögliche physische Auswirkungen prüfen. |
| Bluetooth | `bluetooth` | D-Bus-/Dienstrechte und Adapterbedarf prüfen; keine globalen Node-Capabilities als Standard. |
| Audio/Video | `audio`, `video` | Nur bei einem ausdrücklich freigegebenen Gerätetreiber erforderlich. |
| Sonstige Hardwaregruppen | `plugdev`, `tty` | Keine allgemeine Freigabe; konkrete Zugriffsanforderung prüfen. |
| Docker-Verwaltung | `docker` | Kein Standardrecht der EOS-Runtime; gegebenenfalls getrennten eng begrenzten Dienst entwerfen. |
| Redis-Dateien | `redis` | Kein Ersatz für authentifizierte Datenbankverbindungen; Runtime nicht pauschal aufnehmen. |

BLE, Raw-Sockets, niedrige TCP-Ports, Docker, OS-Paketinstallationen und Adapter,
die bisher sudo-Werkzeuge verwendet haben, können durch diese Umstellung ihre
Funktion verlieren. Dies ist sichtbar zu behandeln und gerätespezifisch zu lösen.

## Admin-, Adapter- und Node-Updates

Normale Paketdateien im Runtime-Verzeichnis bleiben für `iobroker` schreibbar;
dieser Patch macht nicht den gesamten Codebaum unveränderlich. Damit bleiben
Adapter in einer gemeinsamen Runtime-Vertrauenszone. Ob Admin-/Controllerupdates
mit den tatsächlichen Versionen ohne die entfernten Hostrechte funktionieren,
muss in der Integrationsumgebung geprüft werden. Insbesondere native Module,
OS-Pakete, Dienste und gerätespezifische Installationsskripte können abweichende
Anforderungen haben. Der Installer fügt bei solchen Fehlern keine breiten
Berechtigungen wieder hinzu.

Die npm-Shellwrapper verwenden direkte Aufrufe mit unveränderten `"$@"`-Argumenten
anstelle von `eval`. Die Umschaltung zum Dienstkonto gilt nur für das eigentliche
Runtime-Verzeichnis und seine Unterverzeichnisse, nicht für ähnlich beginnende
Pfade. Betreiber können für diese Umschaltung ihre vorhandene OS-sudo-Berechtigung
benötigen. npm-Aufrufe außerhalb des Runtime-Verzeichnisses behalten bewusst das
aufrufende Konto; npm als root bleibt daher eine separat zu vermeidende
Betriebsentscheidung.

Dynamisch bezogene Upstream-Pakete, TLS/Adapteridentitäten, gemeinsamer
Runtime-Code, sichere Geräte-Fallbacks und die unveränderlichen CLI-/Wartungspfade
sind zusätzliche Sicherheitsgrenzen. Diese Bibliotheksänderung beweist ihre
Absicherung nicht. Die FreeBSD-Regeln wurden in diesem begrenzten Linux-Patch
nicht umgebaut und gelten nicht als entsprechend gehärtet.

## Prüfstand und offene Abnahme

Isolierte Tests: `python3 tests/security/host-policy.test.py`. Sie extrahieren die
tatsächlichen Funktionen aus der Bibliothek. Sämtliche privilegierten Vorgänge,
Benutzer-/Gruppenänderungen und Capability-Operationen sind Command-Stubs; nur
Wegwerfdateien werden geschrieben. Der dortige `visudo`-Fehler ist ebenfalls
simuliert. Diese Tests prüfen Entscheidungen und Generierung, nicht echte
Kernel-/sudo-Durchsetzung.

Abgedeckt sind neue/reproduzierbare Policy ohne Rechte, erkennbare Altmigration,
Ablehnung fremder und symlinkbasierter Policy, Erhalt der Altdatei bei
Validierungsfehler, beide bekannten Capability-Sets, Abbruch bei fremden
Capabilities, gezielte Gruppenmigration und unveränderte npm-Argumente sowie
Verzeichnisgrenzen, Ablehnung eines UID-0-Runtimekontos sowie Fehlerpropagierung
bei Eigentümer-/ACL-Korrektur. Shellsyntax ist separat mit `bash -n installer_library.sh`
prüfbar.

Zusätzliche Negativtests prüfen die Verweigerung beider Redis-Helfer ohne
Hostoperationen und die Übernahme lokaler Versionsdaten ohne Netzwerkabruf.

Vor Freigabe offen: vollständige Installation und Migration in einer getrennten
Linux-Ziel-VM, `sudo -l`/Negativaufrufe als echtes Runtime- und fremdes Benutzerkonto,
Kontrolle aller sudoers-/Gruppenrechte, `getcap` nach Controllerneustart und
Node-Update, Start-/Stop-/Restart, Admin-Ersteinrichtung, Adapterinstallation und
-update, Backup/Wiederherstellung und die betroffenen Gerätefunktionen. Ergebnisse
müssen am tatsächlich gebauten Commit mit Rohlogs dokumentiert werden. Keine
dieser offenen Prüfungen wird durch die isolierten Tests als bestanden ersetzt.
