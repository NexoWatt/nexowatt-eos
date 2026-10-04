# R6: öffentlicher, fest gebundener Testupdate-Einstieg

Stand: 04.10.2026. Kennung `EOS-R6-PUBLIC-UPDATE-ENTRY-20261004`.
Quellbasis: `e699a6d575974574ffc4f48d47fe647f6f147f2a` auf `main`.
Dateihashes und Rohbeleg: `verification.json`, `raw/public-r6-update.tap`.

## Änderung und Vertrag

Zwei neue Werkzeuge übernehmen den vorhandenen R5-Transport für den neuen
R6-Teststand (Revision 6, signierte Sequenz 9). Historische R5-Dateien und
Hashbindungen bleiben unverändert. Der neue Einstieg lässt ausschließlich die
exakten R4-/R5-Ausgangsstände über `update-test-to-r6.cjs` zu; die finale Prüfung
dieser installierten Stände liegt im gesondert geprüften Updater.

`build-public-r6-update-entry.cjs --asset-commit <40-stelliger-Commit>` prüft das
lokale R6-Lieferarchiv einschließlich Signatur, Manifestsequenz, Archivgröße und
Hash sowie die genaue Updaterdatei im signierten Manifest. Es erzeugt exklusiv
`delivery/public-update-test3-r6/update.sh` und `preparation.json`.
Nach Veröffentlichung dieses Einstiegs erzeugt `--entry-commit <Commit>` den
vollständigen gebundenen Befehl in `UPDATE_COMMAND.txt`.

`prepare-public-r6-update-publication.cjs --readback <Asset-Commit>` lädt das
Archiv, den öffentlichen Schlüssel und die Liefermetadaten über die fest
gebundenen öffentlichen HTTPS-URLs zurück. `--command-report <Entry-Commit>`
prüft den Befehl, das tatsächlich committete Einstiegsskript und den vollständigen
Drei-Asset-Nachweis. `--check-stage entry|command <HEAD>` erlaubt ausschließlich
die jeweils neuen, regulären Veröffentlichungsdateien. Es erfolgt keine
Veröffentlichung durch diese Helfer selbst.

Das generierte Skript lädt ausschließlich über HTTPS mit aktiver
Zertifikatsprüfung, ohne Redirects oder TLS-Ausnahmen. Verbindungsaufbau ist auf
20 Sekunden, Archiv-/Schlüsseldownload auf 300 Sekunden und der äußere
Einstiegsskriptdownload auf 120 Sekunden begrenzt; dies übernimmt die vorhandene
R5-Pakettransportgrenze. Größe und SHA-256 müssen vor jeder Ausführung exakt
passen. Keine teilausgeladene Datei wird ausgeführt. Entpackung prüft Pfade,
Dateitypen und Links. Privates Root-Tempverzeichnis, kontrollierte Umgebung,
Root-/Werkzeugprüfung und systemd-Invocation bleiben erhalten. systemd führt den
festen Updater als `nexowatt-eos-test-update-r6` aus; dessen
`--quiesce-incomplete` läuft auch bei abrupt beendetem Koordinator.

Neue Ziel-Release-ID und Zielschlüssel dürfen keinem der beiden historischen
Release-/Schlüsselpaare entsprechen. Die konkreten R6-Pins entstehen erst aus
dem vollständig gebauten Lieferstand; dieser Änderungsbericht erfindet keine.

## Tatsächliche Prüfung

24 Tests bestanden, null Fehler und null Übersprünge:

- Strikte Commit-/R6-Metadaten-/Größen-/Schlüssel-/Hashprüfung einschließlich
  Ablehnung beider historischen Release-/Schlüsselpaare.
- Tatsächliche Bash-/stat-/SHA-Prüfungen für gültige Downloads, falsche Hashes,
  falsche Größe, Curl-Abbruch, Symlinks, Hardlinks und vorhandene Zieldateien;
  ausschließlich Curl wird durch ein enges Fixture ersetzt.
- Tatsächlicher eingebetteter Python-Entpacker mit Hashfehler, Pfadausbruch,
  Links und vorhandenem Ausgabeordner.
- Generierte Bash-Syntax, Aufruf des neuen Updaters, isolierte
  Supervisor-Umgebung und Invocation-Prüfung.
- Reale temporäre Git-Repositories für erlaubte Veröffentlichungsdateien,
  falschen HEAD, Fremdänderungen, fehlende Dateien, Änderungen nach Staging und
  Symlinks. Das Arbeitsrepository wird durch die Tests nicht committet.
- Vollständiger Readback-Vertrag: fehlende/doppelte Assets, falsche Hashes,
  Größen, URLs, Commitbindungen und unsichere Transportangaben werden abgewiesen.

Drei historische R5-Werkzeuge wurden bytegenau mit dem genannten Basiscommit
verglichen und blieben unverändert.

## Noch gesondert nachzuweisen

Die Tests verwenden keine echten veröffentlichten R6-Assets und führen keinen
Pi-Updatevorgang aus. Paketbau/Signatur, öffentliche Veröffentlichung und
HTTPS-Readback müssen mit den anschließend erzeugten konkreten Pins gesondert
belegt werden. Der tatsächliche Pi-Update-, systemd-, Admin-Login-, Reboot- und
Wiederherstellungsnachweis bleibt offen. Keine Produktivfreigabe und keine
CRA-/IEC-Konformitätsbehauptung.
