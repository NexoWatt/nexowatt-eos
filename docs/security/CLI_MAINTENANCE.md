# Geschützte EOS-Kommandozeile und Wartung

Stand: 30.09.2026. Geltungsbereich: das feste EOS-Linux/systemd-Profil unter
`/opt/iobroker`, Dienstkonto `iobroker`, OS-Node unter `/usr/bin/node`.
Andere Betriebssysteme, Installationspfade und ein eigenständig als root
aufgerufenes Controller-JavaScript sind durch dieses Profil nicht abgedeckt.

## Problem und Sicherheitsgrenze

Ein globaler CLI-Link in den vom Dienstkonto beschreibbaren Runtime-Baum kann
einen privilegierten Wartungsaufruf auf manipulierbaren Code lenken. Die CLI lag
bislang in diesem Baum; Wartungsbefehle konnten zusätzlich entfernte Skripte
herunterladen und ausführen. Privilegierte Skripte dürfen weder aus einem solchen
Baum noch aus einer ungeprüften, veränderlichen Downloadquelle stammen.

Die Änderungen umfassen:

| Komponente | Neue Eigenschaft |
| --- | --- |
| `security/eos-cli.sh` | Unveränderte Vorlage mit festen Pfaden und argumentgetreuer Übergabe, ohne `eval` oder Download |
| `/usr/local/libexec/nexowatt-eos/iobroker` | Root-eigener Wrapper, Modus 0755, geschützte Elternverzeichnisse |
| `/usr/bin/iob`, `/usr/bin/iobroker` und entsprechende `/usr/local/bin`-Einträge | Links unmittelbar auf den geschützten Wrapper; kein globaler Link über den Runtime-Baum |
| Lokale `/opt/iobroker/iob` und `/opt/iobroker/iobroker` | Komfortlinks, die im gestoppten Installationslauf als Dienstkonto angelegt werden; keine Sicherheitsgrenze |
| Controller-CLI | Root-Aufrufer über `runuser`, OS-Benutzer über bestehende `sudo`-Berechtigung, Dienstkonto direkt; JavaScript läuft stets als Dienstkonto |
| Laufzeitumgebung | Fester PATH, leere übergebene Umgebung mit gezielt gesetzten Variablen; kein geerbtes `NODE_OPTIONS` oder `NODE_PATH`; `IOB_NO_SETCAP=true` |
| `start`, `stop`, `restart` | Nur ein separater OS-Administrator, nur die feste Unit `iobroker.service`; Zusatzargumente werden abgelehnt |
| `fix`, `nodejs-update`, `diag` | Rückgabe 69 und erklärter Wartungshinweis; keine heruntergeladenen Skripte |

Es werden keine neuen sudo-Regeln angelegt. Ein OS-Benutzer ohne passende
Administrationsberechtigung erhält dadurch keinen Zugriff. Der Wrapper prüft
Eigentümer und Schreibrechte des Node-Pfades einschließlich Symlinkziel und
Elternverzeichnissen. Die festen OS-Basisprogramme (`stat`, `readlink`, Bash und
der dynamische Loader) gehören zur vorausgesetzten vertrauenswürdigen OS-Basis.
Ein bereits kompromittierter root-Account ist außerhalb dieser Schutzgrenze.

## Einbindung durch Installer und Fixer

`security/install-cli.sh` ist ausschließlich eine Funktionsbibliothek. Ihr Laden
führt keine Installation aus. Der überprüfte Installer bettet die unveränderte
Vorlage als **Daten** in `EOS_CLI_TEMPLATE` ein und ruft `eos_install_cli` im
privilegierten Installationsabschnitt auf. Die Bibliothek führt keine eigene
sudo-Eskalation aus. Installationsquellen und Buildartefakt müssen vor diesem
Schritt vertrauenswürdig und dem geprüften Stand zugeordnet sein.

Voraussetzungen sind root, `EOS_CLI_INSTALL_STOPPED=true`, systemd und ein
inaktiver oder noch nicht vorhandener Dienst. Zusätzlich dürfen keine Prozesse
des Dienstkontos laufen. Ein fehlgeschlagener Status- oder Prozesscheck wird
abgelehnt. Der Installer muss das Wartungsfenster tatsächlich herstellen und
einen Wiederanlauf während der Migration verhindern; der Prozesscheck allein
ist keine dauerhafte Sperre gegen einen parallelen Administrator.

Root-eigene Zielverzeichnisse werden auf Symlinks, Eigentümer und Schreibrechte
geprüft. Die Vorlage wird in einem dort erstellten privaten temporären
Verzeichnis gespeichert und mit `bash -n` geprüft. Die Veröffentlichung erfolgt
je Datei beziehungsweise Link per Rename innerhalb desselben Dateisystems.
Eine bestehende Symlink-Datei wird ersetzt, ohne ihrem Ziel zu folgen. Lokale
Runtime-Links werden unter der Dienstidentität angelegt, sodass root dabei
keinen vom Runtime-Konto manipulierbaren Endpfad beschreibt.

Mehrere Einzeldateien bilden keine transaktionale Gesamtinstallation. Bei einem
Fehler bleibt der Dienst gestoppt; der Operator prüft den gemeldeten Schritt
und führt die geprüfte Installation erneut aus. Bestehende Verzeichnisse an
erwarteten Datei-/Linkpositionen werden nicht rekursiv gelöscht.

`eos_install_runtime_guard` installiert optional die überprüfte Quelle aus
`EOS_TLS_VALIDATOR_SOURCE` nach
`/usr/local/libexec/nexowatt-eos/verify-runtime-tls.cjs` (root, 0644). Auch dafür
gelten Stopp- und Pfadprüfungen. `node --check` prüft nur Syntax und führt den
Validator nicht aus. Fehlende oder syntaktisch fehlerhafte Quelle ersetzt einen
vorhandenen Validator nicht. Inhaltliche TLS-Prüfungen und die systemd-Einbindung
sind getrennte Komponenten; diese Installationsfunktion bescheinigt weder eine
aktive Verschlüsselung noch eine korrekte Zertifikatsbereitstellung.

## Bedienung und Migration

- Normale CLI-Aufrufe wie `iobroker status` verwenden immer die Dienstidentität.
  Ein eventuell übergebenes `--allow-root` ändert diese Identität nicht.
- `iobroker start`, `stop` und `restart` steuern ausschließlich den Gesamtdienst.
  Befehle mit Zusatzargumenten, etwa `restart adapter.0`, sind in diesem Profil
  gesperrt; einzelne Adapter werden über die authentifizierte Admin-Oberfläche
  verwaltet. Dies ist eine bewusste Änderung gegenüber der allgemeinen CLI.
- OS-Wartung muss mit einem versionierten, überprüften lokalen EOS-Wartungspaket
  unter einem getrennten Administratorkonto erfolgen. Für die gesperrten drei
  Wartungskurzbefehle wird kein ungeprüfter Ersatz angeboten.
- Vor Umstellung System-/Konfigurationssicherung und geordnetes Wartungsfenster
  herstellen. Rückfall mit einem konkret gesicherten bisherigen Systemstand
  prüfen; das Wiederherstellen des alten Wrappers stellt auch dessen Risiken
  wieder her und ist keine abgesicherte Serienfreigabe.

## Nachweise und offene Grenzen

Ausführen: `python3 tests/security/wrapper.test.py`,
`bash -n security/eos-cli.sh` und `bash -n security/install-cli.sh`.

Die Python-Tests verwenden ausschließlich temporäre Dateien innerhalb des
Repository-Arbeitsverzeichnisses. Produktionspfade werden für die Tests
umgeschrieben. `id`, `runuser`, `sudo`, `systemctl`, `pgrep` und der Node-Aufruf
sind kontrollierte Test-Doubles; für `node --check` wird die echte installierte
Node-Syntaxprüfung auf der temporären Datei verwendet. `stat` liest echte
Metadaten innerhalb der Fixtures; die im Container beschreibbaren äußeren
Arbeitsverzeichnis-Vorfahren werden als geschützte OS-Eltern modelliert. Der
Fremdeigentümer-Negativtest modelliert den stat-Eigentümerwert, weil die
Container-UID-Abbildung fremde `chown`-Werte nicht unterstützt.

Geprüft werden Identitäts-Routing und Argumentübergabe, Umgebungshygiene,
Sperrung der Wartungs-/Dienstbefehle, Ablehnung unsicherer Datei-/Elternrechte und
Symlinkziele, sichere Installation, Stoppvoraussetzungen und Erhalt eines
bestehenden Validators bei fehlerhaftem Update. Ein Test-Doppel für `runuser`
weist die Argumente nach, **keinen echten Linux-Identitätswechsel**. Die Rohbelege
und der konkrete Quellstand werden im zugehörigen Gesamtprüfpaket geführt.

Noch auszuführen: reale Installation/Migration auf den freigegebenen
Linux-Distributionen, echte sudo/runuser-/systemd-Integration, privilegienfreier
Controllerstart, Rückfall und Funktionstests der freigegebenen Adapter/Geräte.
Alle Adapter behalten zunächst die gemeinsame Dienstidentität und können
weiterhin gegenseitig deren beschreibbare Dateien und Daten erreichen. Die CLI
schafft keine Adapterisolation, Datenbank-ACLs, TLS-Verschlüsselung oder
Sicherheitszertifizierung. Diese Grenzen bleiben im EOS-Gesamtbefundregister
offen, bis sie mit passenden Integrationsnachweisen bewertet wurden.
