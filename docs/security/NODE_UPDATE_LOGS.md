# Private Protokolle des Node-Updaters

Änderungsstand: 30.09.2026. Bezug: **NW-EOS-260930-04**, vorhersehbarer Logpfad
im schreibbaren ioBroker-Laufzeitverzeichnis.

`node-update.sh` erzeugt für jeden Aufruf atomar mit `mktemp -d` ein eigenes
Verzeichnis `/tmp/iob-nodejs-update.XXXXXXXXXX`. Der zufällige Suffix wird von
`mktemp` vergeben. `TMPDIR` und das ioBroker-Logverzeichnis werden dafür nicht
verwendet. Das Verzeichnis hat Modus **0700**, die Protokolldateien **0600** und
gehören dem aufrufenden Wartungsbenutzer. Die lokale `umask 077` wird in
Subshells gesetzt; die ursprüngliche Prozess-umask bleibt erhalten.

Die Hauptdatei heißt `update.log`; stdout und stderr werden weiter auf Terminal
und Datei gespiegelt. Die npm-Kompatibilitätsprüfung schreibt ihr Nebenprotokoll
nach `npm-dryrun.log` im selben privaten Verzeichnis. Es gibt keine vorhersehbare
gemeinsame Datei `/tmp/npm_dryrun.log` mehr. Scheitert die sichere
Protokollinitialisierung, wird vor den nachfolgenden Updateschritten abgebrochen.

Für Logerzeugung, Eigentümer oder Nachbearbeitung werden weder `sudo touch`,
`sudo chown` noch `sudo sed` verwendet. Die bisherige Suche/Löschung alter
Runtime-Logdateien entfällt. Die Hauptdatei bleibt als Rohprotokoll einschließlich
eventueller ANSI-Farbcodes erhalten; eine nachträgliche Änderung während des
asynchronen `tee`-Schreibens findet nicht statt. Die bestehende getrennte
Bereinigung temporärer NodeSource-Schlüsseldateien wurde nicht umgebaut.

## Betrieb und Nachweise

Der konkrete Logpfad erscheint beim Start auf dem Terminal. Der Wartungsbenutzer
kann die Protokolle lesen und für Support oder einen Prüfbericht gezielt in eine
geschützte Ablage kopieren. Vor Weitergabe auf Geheimnisse, Kundendaten und
betriebliche Informationen prüfen: apt-/npm-Ausgaben werden nicht automatisch
inhaltlich anonymisiert. Eine ioBroker-Adapterlaufzeit unter anderem Benutzer
erhält nicht automatisch Zugriff auf diese Dateien.

Die Dateien bleiben nach Abschluss für die Diagnose erhalten. `/tmp` ist keine
dauerhafte Nachweisablage und kann durch Neustart oder Systembereinigung geleert
werden. Benötigte Nachweise rechtzeitig gesichert archivieren; nicht mehr benötigte
eigenen Laufverzeichnisse gezielt löschen. Das Skript löscht nicht selbstständig
die Verzeichnisse anderer oder älterer Läufe.

Die Verzeichnisrechte schützen gegenüber anderen unprivilegierten Benutzern,
nicht vor Root oder einem Angreifer unter derselben Benutzeridentität. Ein
ordnungsgemäß geschütztes lokales `/tmp`, vertrauenswürdige Systemprogramme und
die bestehenden Wartungsberechtigungen werden vorausgesetzt. Die Änderung
ist keine vollständige Härtung der Node-Update-/Paketverwaltung.

## Reproduzierbare Prüfung

```sh
python3 tests/security/node-update-log.test.py
bash -n node-update.sh
```

Der Python-Test extrahiert die tatsächlich vorhandenen Bashfunktionen `log`,
`init_logging`, `cleanup` und `compatibility_check`. Nur diese Funktionen werden
in isolierten Shellprozessen aufgerufen. `sudo`, npm und gefährliche
Dateiverwaltungsbefehle sind Stubs. Die Tests prüfen Dateirechte und Besitzer,
Spiegelung beider Ausgabekanäle, Lauftrennung, vorgelegte Runtime-Symlinks,
ignoriertes `TMPDIR`, beibehaltene alte Logs, privaten npm-Ausgabepfad sowie
Abbruch bei fehlgeschlagenem `mktemp`. Nur testeigene temporäre Dateien werden
erzeugt oder anschließend entfernt. Kein Systemupdate, kein echtes npm und keine
privilegierten Systemaktionen werden ausgeführt.

Offen bleibt ein vollständiger Update-/Rollbacklauf auf einem getrennten
repräsentativen EOS-Testabbild mit dem echten Wartungskonto. Diese isolierten
Tests sind keine Herstellerfreigabe oder CRA-/IEC-Konformitätsbescheinigung.
