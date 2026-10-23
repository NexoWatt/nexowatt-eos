# Hersteller-Schlüssel unter Windows mit WSL 2 vorbereiten

Stand 23.10.2026. Ubuntu unter WSL 2 und Node 24.22.1 sind beim Betreiber
bestätigt. Der folgende Herstellerhelfer bereitet die lokale Signierung der
qualifizierten Sequenz 15 vor. Ein vom Betreiber übermitteltes WSL-Protokoll
meldet inzwischen die lokale Signierung und Rückprüfung mit dem tatsächlichen
Herstellerschlüssel sowie die Erzeugung des R8-Einstiegs. Der Lauf brach danach
an der abschließenden Quellprüfung ab; der öffentliche Export war unvollständig.
Inzwischen wurde die öffentliche Metadaten-ZIP zur Prüfung übermittelt; der
[Nachtrag zur Metadatenlieferung](../../reports/integration/managed15-public-metadata-20261023/README_DE.md)
grenzt den damit belegten Umfang ab. Die unabhängige Prüfung des tatsächlichen
Lieferarchivs, Veröffentlichung und Pi-Abnahme bleiben offen.

## Bestätigter öffentlicher Schlüssel

Der Betreiber hat am 23.10.2026 auch die Passphrase des ersten Ersatzschlüssels
als nicht mehr verfügbar gemeldet. Anschließend meldete er die lokale Erzeugung
und das erfolgreiche erneute Öffnen eines weiteren verschlüsselten Ersatzschlüssels.
Dieser ersetzt die zuvor am selben Tag vorgesehene Herstellerbindung. Eine
Kompromittierung der bisherigen privaten Schlüssel wurde nicht gemeldet.
Übermittelt wurden ausschließlich
der öffentliche Prüfschlüssel, sein Hash und der lokale Ordnerpfad.
Die neue [öffentliche Datei](../security/release-trust/manufacturer-20261023-2.pem)
ist ein kanonisches Ed25519-SPKI-PEM mit 113 Byte einschließlich abschließendem
Zeilenumbruch. Ihr SHA-256 stimmt exakt mit der zuvor gemeldeten Ausgabe
von `sha256sum release-public.pem` überein:

```text
518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40
```

Der private Schlüssel und die Passphrase wurden nicht übermittelt.
Die Prüfung bestätigt Format und Übereinstimmung des öffentlichen Schlüssels.
Das erfolgreiche Öffnen der verschlüsselten Datei und die später im WSL-Protokoll
gemeldete lokale Signierung/Rückprüfung sind Betreibernachweise. Sie ersetzen
keine unabhängige Rückprüfung des tatsächlichen Lieferarchivs. Eine wiederlesbare
getrennte Schlüsselsicherung ist ebenfalls noch nicht nachgewiesen.
Siehe [Ersatzschlüssel und Prüfgrenzen](../../reports/integration/manufacturer-key-replacement-20261023-2/README_DE.md).
Die [öffentliche Datei vom 21.10.](../security/release-trust/manufacturer-20261021.pem)
mit ihrem [Prüfvermerk](../../reports/integration/security-refresh-20261021/install/manufacturer-public-key-20261021.json)
sowie der [erste Ersatzschlüssel vom 23.10.](../security/release-trust/manufacturer-20261023.pem)
mit seinem [Prüfbericht](../../reports/integration/manufacturer-key-replacement-20261023/README_DE.md)
bleiben als historische Nachweise erhalten. Beide früheren Hashes sind für neue
Lieferungen mit dem aktuellen Helfer nicht mehr zulässig.

Den bereits erzeugten Ersatzschlüssel weiterverwenden. **Den folgenden
Erzeugungsblock nicht erneut ausführen**, wenn dieser Schlüssel vorhanden ist.
Sein eigener privater Ordner wird beim Signieren ausdrücklich angegeben;
alte Schlüsseldateien werden nicht gelöscht oder überschrieben. Die neuen
Werkzeuge binden den oben angegebenen öffentlichen Hash fest. Dessen Verankerung
auf dem Pi erfolgt erst durch den authentifizierten Installationseinstieg
beziehungsweise den R8-Übergang; diese Dokumentation ändert kein Gerät.

## Einmalige Erzeugung auf einem neuen Signierrechner

In PowerShell oder der Windows-Eingabeaufforderung Ubuntu öffnen:

```powershell
wsl -d Ubuntu
```

Den folgenden Block als normalen Ubuntu-Benutzer ohne `sudo` ausführen.
Er benötigt das Ubuntu-Paket `openssl`. Bei `openssl: command not found`
zunächst `sudo apt update && sudo apt install openssl` ausführen.

Eine lange, einzigartige Passphrase zuerst im Passwortmanager speichern.
OpenSSL fragt dasselbe Passwort verdeckt zweimal zur Verschlüsselung und
Bestätigung und anschließend erneut zum Lesen des verschlüsselten Schlüssels ab.
Es handelt sich um ein Passwort, nicht um drei verschiedene. Keine Passphrase in
einen Befehl, eine Umgebungsvariable, einen Chat oder ein Protokoll schreiben.

```bash
(
set -euo pipefail
umask 077
[[ $EUID -ne 0 && "$HOME" == /home/* ]] || {
  echo "Bitte als normaler Ubuntu-Benutzer im Linux-Heimverzeichnis ausfuehren." >&2
  exit 1
}
command -v openssl >/dev/null
eos_signing_dir="$HOME/nexowatt-signing"
mkdir -m 700 -- "$eos_signing_dir"

openssl genpkey -algorithm ED25519 |
  openssl pkcs8 -topk8 -scrypt \
    -out "$eos_signing_dir/release-private.encrypted.pem"

openssl pkey \
  -in "$eos_signing_dir/release-private.encrypted.pem" \
  -pubout -out "$eos_signing_dir/release-public.pem"

cd "$eos_signing_dir"
sha256sum release-public.pem
)
```

Der Ordner wird frisch mit Modus 0700 angelegt. `umask 077` begrenzt die
Dateirechte auf den Eigentümer. Eine bestehende Ablage führt zum Abbruch;
sie wird nicht überschrieben. Bei einem Fehler vorhandene Dateien prüfen,
den Ordner nicht löschen und keinen bereits verwendeten Schlüssel ersetzen.

Der private Schlüssel durchläuft die Verbindung zwischen den beiden
OpenSSL-Prozessen im Klartext; dauerhaft geschrieben wird nur das
passwortverschlüsselte PKCS#8-PEM. `-scrypt` verwendet scrypt mit AES-256-CBC.
Der öffentliche Schlüssel wird als SPKI-PEM ausgegeben. Sein Dateihash ist
der vom EOS-Signierer erwartete öffentliche Fingerabdruck; nicht den Hash
der privaten Datei verwenden. Die Zeile zu `release-public.pem` darf zur
Abstimmung weitergegeben werden. Der private Schlüssel und die Passphrase
bleiben beim Hersteller.

Die Ablage gehört in das Linux-Heimverzeichnis außerhalb jedes Repositories,
nicht unter `/mnt/c`, auf den Desktop oder in einen Synchronisationsordner.
WSL ist keine Sicherheitsgrenze gegenüber Programmen des Windows-Benutzers.
Vor der ersten Auslieferung die verschlüsselte private Datei und den
öffentlichen Schlüssel separat gesichert aufbewahren und die Wiederlesbarkeit
prüfen; die Passphrase separat im Passwortmanager behalten.

Die bestehenden Werkzeuge `build-managed-test.cjs` und
`sign-managed-channel.cjs` nehmen keine Passphrase entgegen. Die verschlüsselte
Masterdatei darf daher nicht direkt als `--private-key` übergeben werden.
Für die eigentliche Signierung ist ein kontrollierter lokaler Schritt mit
temporärer entschlüsselter Datei, Eigentümerrechten 0600, unabhängiger Prüfung
des öffentlichen Fingerabdrucks und Aufräumen erforderlich. Dieser Schritt
wird durch den unten beschriebenen, auf feste Eingaben begrenzten Helfer ausgeführt.
Der private Schlüssel wird dafür nicht an GitHub oder in den Chat übertragen.

Seit dem Sicherheitsrelease vom 21.10.2026 wird die neue Frischlieferung unter
Linux mit Node 24.22.1 vorbereitet. Der zuvor qualifizierte Quellcommit
`a2733fa5561f7327ff3689b7464f8727760fb670` gehört zur früheren Node-24.21.0-Basis
und darf nicht als Nachweis für das neue Paket verwendet werden. Der Signierlauf
benötigt den neu qualifizierten sauberen Quellcommit
`f353dd08bf8ac5897e9b1c357994d4047a82ed6d`, dessen genaue vorbereitete
Laufzeit-/Nachweisdateien und das hashgeprüfte offizielle ARM64-Node-Archiv.
Dieser neue Gesamtbuild und die Rückprüfung seines unsignierten Transportarchivs
sind im [CI-Nachweis](../../reports/integration/automatic-security-updates-20261022/automatic-install/ci/qualification.json)
dokumentiert. Ein späterer Dokumentationscommit ersetzt diesen Buildstand nicht.
Siehe [Node- und Linux-Aktualisierung](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).

## Qualifiziertes Paket lokal signieren

Der Helfer [sign-qualified-r8-wsl.py](../../tools/bootstrap/sign-qualified-r8-wsl.py)
läuft außerhalb des separaten Signier-Checkouts als normaler Ubuntu-Benutzer.
Er erwartet den bereits hashgeprüften Interpreter
`~/nexowatt-build/node-v24.22.1-linux-x64/bin/node`, den oben bestätigten Schlüssel
und mindestens 5 GiB freien Platz unter `/home`. `unzip` und npm werden für
diesen Signierlauf nicht benötigt. Beide originalen ZIP-Downloads des
[qualifizierten CI-Laufs](https://github.com/NexoWatt/nexowatt-eos/actions/runs/39736782733)
werden als erste zwei Positionsargumente übergeben. Das optionale dritte
Argument ist der absolute Pfad zum privaten Schlüsselordner unter dem eigenen
Linux-Heimverzeichnis. Für den neu erzeugten Ersatzschlüssel diesen Pfad
ausdrücklich angeben; den Platzhalter im Beispiel durch seinen tatsächlichen
Ordnernamen ersetzen. Ohne drittes Argument wird `~/nexowatt-signing` verwendet,
aber weiterhin ausschließlich der neue feste Schlüsselhash akzeptiert:

```bash
/usr/bin/python3 -I -B /absoluter/gepruefter/pfad/sign-qualified-r8-wsl.py \
  /mnt/c/Users/User/Downloads/eos-unsigned-f353dd0.zip \
  /mnt/c/Users/User/Downloads/eos-native-f353dd0.zip \
  "$HOME/nexowatt-signing-neu-<Ordnerkennung>"
```

Vor Ausführung den Helfer aus einem festgelegten veröffentlichten Commit laden
und seinen separat mitgeteilten SHA-256 prüfen. Keinen veränderlichen
`main`-Download ungeprüft starten. Der Helfer prüft Größe und Hash beider ZIPs
vor dem Entpacken, feste Mitgliedslisten, das innere Archiv und die gebundenen
Laufzeit-/Native-Nachweise. Er lädt nur den festen Quellcommit und das offizielle,
hashgeprüfte ARM64-Node-Archiv. Es findet keine neue npm-Auflösung statt.
Ein abweichender oder alter öffentlicher Schlüssel wird abgewiesen; das
Verzeichnisargument ist keine freie Wahl einer Update-Autorität.

Erst danach fragt OpenSSL am lokalen Terminal nach dem Schlüsselpasswort.
Eine temporäre entschlüsselte Datei liegt mit Modus 0600 in einem privaten
0700-Verzeichnis unter dem geprüften tmpfs `/dev/shm`. Der daraus abgeleitete
öffentliche Hash muss zum bekannten Herstellerhash passen. Paket und anfänglich
leerer Update-Kanal werden signiert und lokal rückgeprüft. Die temporäre Datei
wird bei Erfolg, Fehler, Strg+C und behandeltem SIGTERM entfernt. SIGKILL und
Hostabsturz können keine Aufräumroutine ausführen; tmpfs ersetzt keine Kontrolle
des Signierrechners und kann abhängig vom Host in Swap gelangen. Die verschlüsselte
Masterdatei bleibt erhalten. Niemals private Schlüssel oder Passwörter übertragen.

Der signierte Laufzeitinhalt stammt weiterhin aus dem sauberen qualifizierten
Quellstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`. Erst nach Paket-/Kanalsignierung
und Entfernung der temporären Schlüsseldatei wird der öffentliche R8-Einstieg
mit der neuen Herstellerbindung erzeugt. Dazu verwendet der Helfer vorübergehend
die ausschließlich im Schlüsselhash geänderte, vollständig hashgebundene Fassung
des Einstiegserzeugers und stellt dessen Original anschließend wieder her.
Beide vollständigen Werkzeughashes werden bereits vor der Entschlüsselung
geprüft und getrennt vom Laufzeitquellstand in `summary.json` ausgewiesen.
Die Paket-/Signaturprüfung bleibt aktiv. Bei Fehler oder behandeltem Abbruch
wird die Originaldatei ebenfalls wiederhergestellt; nach SIGKILL oder Hostausfall
den Helfer neu in einer frischen Arbeitsablage starten. Die vorhandenen ZIPs,
CI-Nachweise, historische R8-Vertrauensbasis und Lizenzschlüssel werden durch
diese Herstellerbindung nicht ersetzt.

Die abschließende Quellprüfung weist Änderungen an versionierten oder für einen
Commit vorgemerkten Dateien weiterhin ab. Bei von Git angezeigten unversionierten Dateien erlaubt
sie ausschließlich `delivery/managed-test-15/eos-linux-arm64.tar.gz`,
`delivery/managed-test-15/release-public.pem` und
`delivery/managed-test-15/delivery.json`. Diese vom Build erzeugten Ausgaben
wurden zuvor irrtümlich als Quelländerung behandelt. Zusätzliche unversionierte
Dateien bleiben unzulässig; der Lieferordner wird nicht pauschal ausgenommen.
Die bisherigen Git-Ausschlussregeln für lokale Builddaten bleiben unverändert.

Quell-Checkout und Build laufen mit `umask 022`, damit öffentliche Lieferdateien
die vorgeschriebenen Modi behalten. Der übergeordnete Arbeitsordner ist 0700.
Der Helfer erzeugt unter `~/eos-sign-15-*/public/` ausschließlich die vorgesehenen
öffentlichen Lieferdateien, darunter `eos-linux-arm64.tar.gz`, `delivery.json`,
`test.json`, `summary.json` und den R8-Einstieg. `eos-public-metadata.zip` enthält
nur sechs ausdrücklich aufgezählte öffentliche Metadatendateien, kein Paket und
keinen privaten Schlüssel. Für die Abstimmung genügt zuerst die abschließende
JSON-Ausgabe beziehungsweise diese Metadaten-ZIP. Keine gesamten Arbeits- oder
Schlüsselordner hochladen.

Der leere Kanal ist 30 Tage gültig und bietet Sequenz 15 nicht erneut an.
Herstellerseitige Erneuerung des Kanals sowie Prüfung und Signierung zukünftiger
Node-Patches bleiben erforderlich. Die Anlage installiert nur freigegebene
Updates nach ihrer bestehenden Richtlinie. Veröffentlichung, öffentlicher
Download-/Signatur-Readback und tatsächlicher R8-Pi-Test folgen getrennt; dieser
Helfer führt sie nicht aus und gibt noch keinen Pi-Installationsbefehl aus.

## Öffentlichen Export nach dem Abschlussfehler fortsetzen

Das übermittelte WSL-Protokoll meldet eine erfolgreiche Paket-/Kanalsignierung,
lokale Rückprüfung, Entfernung der temporären entschlüsselten Datei und
Erzeugung des öffentlichen R8-Einstiegs. Anschließend erschien
`Qualifizierter Quellstand nach R8-Einstieg nicht sauber wiederhergestellt`.
Die Ursache war die abschließende Git-Prüfung der drei erwarteten unversionierten
Lieferdateien. Der Fehler wurde unabhängig reproduziert; dies ist kein
unabhängiger Signatur- oder Archivnachweis für die Dateien des Betreiberrechners.

Für diesen bereits signierten Arbeitsstand gibt es einen getrennten Abschlussweg.
Den korrigierten Helfer aus dem festgelegten veröffentlichten Commit herunterladen
und seinen separat mitgeteilten SHA-256 prüfen. Danach als normaler Ubuntu-Benutzer
den tatsächlichen vorhandenen Arbeitsordner als absoluten Pfad einsetzen:

```bash
/usr/bin/python3 -I -B /absoluter/gepruefter/pfad/sign-qualified-r8-wsl.py \
  --finish "$HOME/eos-sign-15-<Arbeitskennung>"
```

Dieser Aufruf ist fest an das konkrete Release und die Hashes und Größen von
Archiv, Liefermetadaten und R8-Einstieg aus dem gemeldeten Lauf gebunden. Er ist
kein allgemeiner Reparatur- oder Exportbefehl. Er prüft kanonische Pfade,
Eigentümer und Rechte, den qualifizierten Quellcommit sowie die genau erlaubten
Lieferdateien. Zusätzlich prüft er den signierten leeren Kanal einschließlich
Ablaufzeit und die Archivsignatur mit vollständiger Rückleseprüfung. Der Helfer
erzeugt Einstieg und Vorbereitungsmetadaten erneut in einem temporären
Unterordner und vergleicht beide bytegenau mit den vorhandenen Dateien. Danach
stellt er den ursprünglichen Einstiegserzeuger wieder her und kontrolliert den
Quellstand erneut mit derselben begrenzten Ausnahme für die drei Lieferdateien.

Erst nach diesen Prüfungen entsteht ein neuer Ordner `public-finished/` innerhalb
der bisherigen Arbeitsablage. Er enthält nur die erlaubten öffentlichen Dateien,
die Zusammenfassung und die Metadaten-ZIP. Der bisherige Ordner `public/` bleibt
erhalten. Existiert `public-finished/` bereits, stoppt der Helfer ohne Überschreiben.
Ein Abbruch während des Exports kann einen teilweise gefüllten Zielordner
hinterlassen. Diesen aufbewahren und die Fehlermeldung prüfen lassen; ein
erneuter Aufruf überschreibt oder repariert ihn nicht automatisch.

Der Abschluss liest keinen privaten Schlüssel, fragt kein Passwort ab, signiert
nichts erneut und lädt keine Eingaben nach. Er verändert keine Anlage und
veröffentlicht keine Dateien. Einen fehlgeschlagenen
Prüfschritt nicht durch manuelles Ändern von Metadaten, Quellpins oder Signaturen
umgehen. Erst die erfolgreiche Abschlussausgabe beziehungsweise die erlaubte
öffentliche Metadaten-ZIP zur weiteren Prüfung übermitteln; keine vollständigen
Arbeits- oder Schlüsselordner hochladen.

Die unabhängige Prüfung des tatsächlichen signierten Lieferarchivs bleibt bis
zu ihrem eigenen Nachweis offen. Öffentliche Veröffentlichung/Rückprüfung und
R8-Pi-Abnahme sind weiterhin separate Schritte. Siehe
[Korrektur und Prüfgrenzen](../../reports/integration/wsl-signing-finalization-20261023/README_DE.md).

## Erhaltene öffentliche Metadatenlieferung

Die öffentliche Datei `eos-public-metadata.zip` wurde am 23.10.2026 übermittelt
und für die gesonderte Prüfung sicher extrahiert. Der
[Prüfvermerk](../../reports/integration/managed15-public-metadata-20261023/README_DE.md)
dokumentiert die Prüfung der Metadatenbindung, des signierten Kanals und des
aus diesen Angaben erzeugten R8-Einstiegs. Diese Metadatenlieferung enthält
das eigentliche signierte Laufzeitarchiv nicht. Angaben wie
`archiveReadbackVerified` beschreiben den lokalen Herstellerlauf und ersetzen
keine unabhängige Rückprüfung der vollständigen Archivdatei.

Für den nächsten Prüfschritt die vollständige öffentliche Datei
`eos-linux-arm64.tar.gz` aus `public-finished/` unverändert separat bereitstellen.
Die Metadaten-ZIP genügt dafür nicht. Keine privaten Schlüsseldateien,
Passwörter oder vollständigen Arbeits- beziehungsweise Schlüsselordner
übermitteln. Archivprüfung, Veröffentlichung mit öffentlicher Rückprüfung
und Installation/Abnahme auf dem Pi bleiben offen.

## Toolchain für eine neue Paketauflösung

Für eine neue Paketauflösung und einen neuen Laufzeitbuild wird zusätzlich
exakt **npm 11.19.0** benötigt. Diesen Abschnitt für die Signierung der bereits
qualifizierten ZIPs überspringen.
Node 24.22.1 bringt npm 11.19.1 mit; diese Werkzeuge werden deshalb getrennt
festgelegt. npm wird ausschließlich auf dem Hersteller-Buildrechner verwendet
und nicht mit dem Node-Laufzeitpaket auf den Pi ausgeliefert.

Den folgenden Schritt nur in einer vorbereiteten, vom normalen Benutzer
beschreibbaren Node-24.22.1-Buildumgebung ausführen, nicht auf der Anlage. Er
installiert npm in genau die Node-Distribution, deren Interpreter anschließend
den Build ausführt; ein abweichendes npm aus `PATH` genügt nicht. Die privaten
Signierdateien werden dabei nicht gelesen oder verwendet.

```bash
(
set -euo pipefail
[[ "$(node --version)" == v24.22.1 ]]
eos_node_prefix=$(node -p "require('node:path').resolve(require('node:path').dirname(process.execPath), '..')")
eos_npm_cli="$eos_node_prefix/lib/node_modules/npm/bin/npm-cli.js"
[[ -f "$eos_npm_cli" && ! -L "$eos_npm_cli" ]]
node "$eos_npm_cli" install --global --prefix "$eos_node_prefix" npm@11.19.0 \
  --registry=https://registry.npmjs.org/ --strict-ssl=true \
  --ignore-scripts --no-audit --no-fund --fetch-timeout=5000 --fetch-retries=0
[[ "$(node "$eos_npm_cli" --version)" == 11.19.0 ]]
node -e "const p=require('node:path'); const f=p.resolve(p.dirname(process.execPath),'../lib/node_modules/npm/package.json'); if(require(f).version!=='11.19.0') process.exit(1); console.log('Manufacturer toolchain: Node '+process.versions.node+', adjacent npm '+require(f).version);"
)
```
Die neu erzeugte Update-Autorität ersetzt auch nicht die getrennten,
authentifizierten öffentlichen Prüfschlüssel der vorhandenen NWL3-Lizenzen.

Historische Nachweise: [ursprüngliche Formatprüfung](../../reports/integration/security-refresh-20261021/install/windows-key-custody.json)
(an den Dokumentationsstand `20efcdc99b3dfbe5e34ad614b45cae70f9e22bc7` gebunden)
und [Prüfung des damaligen öffentlichen Herstellerschlüssels](../../reports/integration/security-refresh-20261021/install/manufacturer-public-key-20261021.json).
Aktueller [Änderungs- und Prüfvermerk](../../reports/integration/manufacturer-key-replacement-20261023-2/README_DE.md).
Offizielle Referenzen:
[WSL](https://learn.microsoft.com/en-us/windows/wsl/install),
[genpkey](https://docs.openssl.org/3.0/man1/openssl-genpkey/),
[PKCS#8](https://docs.openssl.org/3.0/man1/openssl-pkcs8/),
[pkey](https://docs.openssl.org/3.0/man1/openssl-pkey/).
