# Testinstallation Revision 4 auf dem Pi

Stand: 03.10.2026. Ziel: isolierter Debian-13-/Raspberry-Pi-OS-13-Host, ARM64,
systemd und ausreichend freier Speicher. Keine laufende Kundenanlage migrieren.
Die tatsächliche Pi-Abnahme ist noch offen. Der Nutzerlauf mit dem ursprünglichen
öffentlichen Einstieg scheiterte an `RECOVERY_PATH_OWNER`. Einstiegsrevision 2
behebt dessen bestätigte PostgreSQL-Eigentümerprüfung. Der Nutzer meldet nun den
erreichten geschützten Erststart; Browserabschluss, Login und Neustart sind offen
([Zielrückmeldung](../../reports/integration/recovery-pg-owner-20261003/user-pi-first-start-observation.json)).

## Installation

Den aktuellen vollständigen Einzeiler in der [README auf main](../../README.md)
verwenden. Er beginnt mit `/usr/bin/sudo /usr/bin/env -i`, verlangt bei Bedarf
das persönliche sudo-Passwort und setzt eine kontrollierte Ausführungsumgebung.
Das öffentlich bereitgestellte R4-Paket benötigt keinen GitHub-Token. Skript
und Downloadverzeichnis sind an feste Git-Commit-IDs gebunden. Wird das
Repository wieder privat, bricht dieser Downloadweg ab.

`curl` lädt die fest gebundenen Bestandteile. Vor ihrer Ausführung werden die
Bytezahl und SHA-256-Pins kontrolliert; das Laufzeitpaket besitzt zusätzlich ein
signiertes Manifest. APT bereitet die benötigten Debian-Pakete vor. Der eigene
PostgreSQL-Cluster und die EOS-Dienste werden durch den Hostinstaller eingerichtet.
Keine manuelle Eingabe von Benutzerpasswörtern im Terminal erforderlich.

Der Einzeiler ist kein Updater. Eine bereits erfolgreich installierte R4-Version
nicht damit überschreiben. Alte Token-/R3-Befehle bleiben historische Nachweise;
für die neue Testinstallation gilt ausschließlich der aktuelle README-Einstieg.

Für den bekannten R2-Sudo-Abbruch erkennt derselbe Einstieg die vorhandene
Bereitstellung und schaltet den eng begrenzten Wiederherstellungshelfer vor.
Er prüft Version, Dateien, Konten, Dienste und fehlende Nutzdaten. Nur der exakt
bekannte Zustand wird in Quarantäne erhalten; andere Zustände werden abgewiesen.
Weder Konto-/Datenlöschung noch eine allgemeine Reset-/Force-Funktion existieren.

## Korrektur des gemeldeten Recovery-Abbruchs

Der aktuelle README-Befehl lädt `public-entry-test3-r4-recovery2` aus einem neuen
festen Commit. Nur dieser Einstieg enthält die Korrektur. Der alte Befehl mit
Installer-SHA-256 `f6ad2f72…` bleibt ein historischer Beleg und lädt weiterhin die
alte Prüfung. Das signierte Laufzeitpaket bleibt Revision 4 / Sequenz 7.

Auf dem diagnostizierten Test-Pi den neuen vollständigen README-Befehl einmal
verwenden. Eigentümer der PostgreSQL-Verzeichnisse nicht manuell umstellen und
keine R2-Dateien oder Konten entfernen. Der Helfer verifiziert das tatsächliche
lokale `postgres`-Konto; dessen zusätzliche Gruppe `ssl-cert` ist zulässig.
Die beiden Containerverzeichnisse müssen weiterhin echte, leere Verzeichnisse
mit sicheren Rechten und root-geschützten Vorfahren sein. Eine leere Ausgabe
von `pg_lsclusters` allein genügt dafür nicht.

Erwarteter Verlauf: vollständige R2-Prüfung, Ausgabe des geschützten
Sicherungsverzeichnisses, Erhalt der ursprünglichen numerischen Kontoidentität,
anschließend normale R4-Vorbereitung. Bei erneutem Abbruch Fehlercode und
Ausgabe melden. Eine bereits teilweise durchgeführte Sicherung wird nicht
blind fortgesetzt. [Befund, Tests und Pins](../../reports/integration/recovery-pg-owner-20261003/README.md).

## Ersteinrichtung

Nach erfolgreicher Installation zeigt das Terminal HTTPS-Adresse, Geräte-CA mit
Fingerabdruck und Einrichtungscode. Die CA über die bereits vertrauenswürdige
SSH-Verbindung übernehmen und den Fingerabdruck vergleichen. Danach im Browser
vertrauen und den Assistenten öffnen. Zertifikatsprüfung nicht abschalten.

Den Einrichtungscode eingeben. Die UUID für den Lizenzgenerator kopieren,
Lizenz zuordnen und das persönliche Servicepasswort im Frontend vergeben.
Standort und Anlagenplan ausfüllen oder fehlende Angaben ausdrücklich offenlassen.
Weitere Installateur-/Benutzerkonten erhalten persönliche Einladungen.

[Windows: Geräte-CA mit Fingerabdruck prüfen, importieren und bei Bedarf den
Einrichtungscode erneuern](WINDOWS_GERAETE_CA_DE.md).

Eine ausbleibende Antwort gilt nicht als erfolgreiche Einrichtung. Nach einem
unklaren Abschluss liest der Browser zuerst den Gerätestatus. Er sendet Passwort
und Abschluss nicht automatisch erneut. Nur ein bestätigter noch offener Zustand
erlaubt einen bewussten neuen Versuch. Anlagensteuerung bleibt gesperrt.

## Abnahme auf dem Test-Pi

1. Release-ID, Revision, Node-/PostgreSQL-/OS-Version und Installationsphase
   aufzeichnen. Keine Passwörter, Token, Einrichtungscodes oder privaten Schlüssel.
2. Einrichtung, Anmeldung und Rollen im tatsächlichen Browser prüfen.
3. Erst nach erfolgreicher Einrichtung den Test-Pi regulär neu starten und
   Datenbank, Controller, Anmeldung und gespeicherte Einstellungen nachprüfen.
4. Einen geregelten Datenbank-/Dienstneustart sowie Netzwerkverlust während des
   Assistenten prüfen. Kein wiederholtes blindes Ausführen des Installers.
5. Backup/Restore und Geräteabnahme separat durchführen. Bis dahin ist dieser
   Stand weder Produktionsrelease noch Freigabe einer Anlagenregelung.

Zur rein lesenden ersten Diagnose:

```bash
systemctl --failed --no-pager
systemctl list-units --all --no-pager 'nexowatt-eos*'
/usr/bin/node --version
/usr/lib/postgresql/17/bin/postgres --version
```

Die ersten beiden Befehle zeigen fehlgeschlagene beziehungsweise vorhandene
EOS-Dienste; die letzten beiden zeigen die tatsächlich aufgerufenen Versionen.
Bei Installationsabbruch zusätzlich den Fehlercode und die neu angezeigte Phase
melden. Nicht eigenständig Reste löschen, Konten entfernen, Sperren umgehen oder
den Installer als Reparaturtool wiederholen.

Für die ergänzende Bestandsaufnahme des tatsächlichen Pi-Basissystems nach
erfolgreicher Installation:

```bash
dpkg-query -W -f='${binary:Package}\t${Version}\t${Architecture}\n' > eos-host-packages.tsv
```

Das liest ausschließlich die installierten Debian-Paketversionen aus und
schreibt sie in eine lokale Texttabelle. Zusammen mit Release-ID, OS- und
Node-Version dem Zielhostbericht zuordnen. Die Tabelle ergänzt die gebundene
App-SBOM; sie ist selbst keine vollständige CycloneDX-SBOM oder
Schwachstellenprüfung des Betriebssystems.

Der PostgreSQL-Zertifikatsprüfer erneuert keine Zertifikate. Für längere Tests ist
der 90-Tage-Lebenszyklus zu berücksichtigen; vor Dauerbetrieb muss der separate
Rotations-/Wiederherstellungsweg implementiert und abgenommen sein.

[Änderungen, SBOM und offene CRA-/Sicherheitsnachweise](../../reports/integration/stability-20261003/README.md).
