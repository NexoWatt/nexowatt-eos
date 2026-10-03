# Recovery: PostgreSQL-Verzeichnisse mit Dienstkonto-Eigentümer

Stand: 03.10.2026. Befundkennung: **NW-EOS-261003-RECOVERY-PG-OWNER**.
Status: Ursache bestätigt; Quellkorrektur und lokale Nachprüfung bestanden.
Veröffentlichung und Zielabnahme werden gesondert nachgewiesen.
Betroffen: `tools/bootstrap/recover-sudo-abort.py` und der öffentliche
Installationsstart mit dem darin eingebetteten Recovery-Helfer.

## Fehler und Zielbeobachtung

Der Nutzer meldet auf dem Pi erneut `RECOVERY_PATH_OWNER` beim öffentlichen
R4-Installationsstart. Der betroffene Einstieg ist auf Commit
`16a947182badf052e9866f7cd167056e994ba914` und Installer-SHA-256
`f6ad2f72f5c50d99dc91097867a83b83790512290fd4a64e1c3c80744e968c84`
gebunden. Sein eingebetteter Recovery-Helfer hat SHA-256
`66104780fda7c92368e21d5baf88528ba7788a8055ccfc091d919c3a161efce4`.

Die anschließend vom Nutzer ausgeführte, lesende Diagnose zeigt:

| Pfad | Eigentümer | Modus | Typ |
| --- | --- | --- | --- |
| `/etc` | root:root, 0:0 | 0755 | Verzeichnis |
| `/etc/postgresql` | postgres:postgres, 102:106 | 0755 | Verzeichnis |
| `/var` | root:root, 0:0 | 0755 | Verzeichnis |
| `/var/lib` | root:root, 0:0 | 0755 | Verzeichnis |
| `/var/lib/postgresql` | postgres:postgres, 102:106 | 0755 | Verzeichnis |

`id postgres` meldet UID 102, Hauptgruppe 106 und zusätzlich `ssl-cert` (105).
`pg_lsclusters` zeigt nur die Kopfzeile. Die gezielte Suche nach Verzeichnissen
mit dem Präfix `.eos-r2-abort-` unter `/opt/nexowatt` erzeugt keine Ausgabe.
Die Diagnose ist als [Nutzerbeobachtung](user-pi-observation.json) abgelegt;
der Agent hatte keinen SSH-Zugriff und führte sie nicht selbst auf dem Pi aus.

Die Diagnose enthält keine protokollierten Befehlsstatus. Eine leere
Clusterliste beweist nicht, dass beide PostgreSQL-Verzeichnisse leer sind.
Auch die leere `find`-Ausgabe ist kein vollständiger Pfad-, Mount- oder
Journalnachweis; der Filter erfasst nur Verzeichnisse auf der angegebenen
Ebene. Die Live-Prüfung des Recovery-Helfers muss diese Grenzen weiter prüfen.

## Ursache und Sicherheitsgrenze

Im betroffenen Helfer ruft `preflight()` für `/etc/postgresql` und
`/var/lib/postgresql` die allgemeine Funktion `trusted_path()` auf. Diese
verlangt auf jeder Pfadkomponente `st_uid == 0` und meldet sonst
`RECOVERY_PATH_OWNER`. Damit wird bereits der nachgewiesene Eigentümer 102
abgewiesen, bevor die anschließende Leerheitsprüfung erreicht wird. Das ist
eine zu enge Anwendung der Schutzprüfung auf die PostgreSQL-Containerpfade.
Die Besitzerangaben 102:106 sind Zielbeobachtungen, keine neuen fest kodierten
UID-/GID-Vorgaben für andere Installationen.

Die gezeigte Installationsausgabe enthält weder die Meldung über die
vollständig abgeschlossene R2-Prüfung noch über eine angelegte geschützte
Sicherung. Zusammen mit der Prüfreihenfolge passt dies zu einem Abbruch
vor den Recovery-Umbenennungen. Ein unabhängiger vollständiger Vorher-/Nachher-
Vergleich des Pi-Dateisystems liegt damit nicht vor.

Die Korrektur ist auf die Prüfung dieser zwei möglichen leeren
PostgreSQL-Verzeichnisse begrenzt: root-geschützte Vorfahren beibehalten,
zulässige Eigentümer gegen das tatsächliche lokale PostgreSQL-Konto prüfen,
Links, unsichere Schreibrechte und vorhandene Inhalte weiterhin ablehnen.
Die allgemeine Root-Eigentümerprüfung für ausführbare Werkzeuge und
geschützte Konfiguration bleibt erhalten. Konten-, Prozess-, Mount-,
R2-Artefakt-, Signatur- und Journalprüfungen bleiben erforderlich.

Es wird kein `chown`, keine Löschung, kein Datenbank-Reset und kein
pauschaler Prüfungs-Bypass als Abhilfe eingeführt. Die bereits veröffentlichte
Installationsdatei und ihre Pins bleiben historische Belege; ein korrigierter
Helfer benötigt einen neu gebundenen öffentlichen Einstieg.

## Liefer- und SBOM-Bezug

Die Korrektur betrifft die vorgeschaltete Wiederherstellung des diagnostizierten
R2-Abbruchs. Das signierte R4-Runtimearchiv wird dafür nicht neu gebaut oder
umgeschrieben:

| Bindung | Unveränderter Wert |
| --- | --- |
| Runtime / Lieferrevision / Sequenz | `0.2.0-test.3` / 4 / 7 |
| Release-ID | `15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8` |
| Archiv-SHA-256 | `c1d418a66b3678fb19f4487ece9871da81cf7a583af59a6d889c799d7c6dd1b3` |
| Archivgröße | 88.363.976 Byte |
| App-SBOM-SHA-256 | `1b4b155abdc097582b2664fc47f5862f5140ed06f1cf1f1fa83da824a2463348` |

Herkunft: [R4-Liefermanifest](../../../delivery/test-pi-0.2.0-test.3-r4/delivery.json),
[R4-App-Wiederverwendung](../installable-test3-r4-20261003/app-reuse.json),
[bisherige öffentliche Einstiegsvorbereitung](../../../delivery/public-entry-test3-r4/preparation.json).
Die SBOM beschreibt den unverändert übernommenen App-Abhängigkeitsbaum.
Diese Fehlerkorrektur ist kein neuer Schwachstellenscan und kein vollständiges
Inventar des tatsächlichen Pi-Betriebssystems.

## Nachprüfung und Freigabe

Der neue Helfer hat SHA-256
`d1c4739bfa1c9d3b144a3abef7715a05c212cc062a0da72a9d16ca588095ba06`.
Die lokale Nachprüfung umfasst **47 bestandene Recovery-Prüfungen**, darunter
14 neue PostgreSQL-Fälle sowie die echte Prüfung der historischen
R2-Ed25519-Signatur. **12 Bootstrap-/Shell-Vertragstests** bestanden ebenfalls.
Keine Fehler oder übersprungenen Tests im abschließenden Lauf.

Die [Vorher-/Nachher-Reproduktion](raw/owner-regression-before-after.json)
verwendet die modellierten Zielrechte 102:106 / 0755 und leere Verzeichnisse:
der alte Quellhash stoppt mit `RECOVERY_PATH_OWNER`; der korrigierte erreicht
die weiterhin unabhängige Clusterprüfung. Die 14 neuen Fälle wurden zusätzlich
separat geprüft; sie sind eine Teilmenge der 47 und werden nicht hinzuaddiert.
Reale lokale Verzeichnis-/Deskriptoroperationen und die Archivsignaturprüfung
sind von simulierten Eigentümern, Konten und Hostbefehlen zu unterscheiden.
Es wurden keine Konten auf dem Pi geändert.

Der neue Einstieg wird exklusiv unter
`delivery/public-entry-test3-r4-recovery2` erzeugt. Das unveränderte R4-Archiv
wurde dabei erneut vollständig einschließlich Signatur geprüft. Die exakten
eingebetteten Vorbereiter-/Recoverybytes, die Konfiguration und Bash-Syntax
wurden zusätzlich geprüft. [Maschinenlesbarer Prüfbeleg](verification.json).
Die ursprüngliche Installationsdatei blieb bytegleich.

Ein erster lokaler Testlauf hatte ein fehlendes öffentliches R2-Schlüssel-
Testartefakt im partiellen Arbeitsverzeichnis gemeldet. Nach authentisiertem
Nachladen bestand die vollständige Suite; der erste Lauf ist als
`raw/recovery-python-tests-initial-missing-key.log` erhalten. Ein zunächst in
der Ausführungs-Sandbox hängen gebliebener Node-/Bash-Testlauf wurde abgebrochen;
der erfolgreiche Lauf mit erlaubten Kindprozessen steht in `raw/public-entry.tap`.
Dies sind lokale Testumgebungsereignisse, keine weiteren Pi-Fehler.

**Native Recovery auf dem Nutzer-Pi, anschließende Vollinstallation,
Browser-Ersteinrichtung, Reboot und Hardware-/Anlagenbetrieb sind weiterhin
OFFEN.** Der bisherige Installationsversuch ist mit dem genannten Fehler
abgebrochen. Ein erfolgreicher lokaler oder CI-Nachtest ersetzt diese
Zielprüfungen nicht. Keine Produktions-, CRA- oder IEC-Konformitätsfreigabe.
