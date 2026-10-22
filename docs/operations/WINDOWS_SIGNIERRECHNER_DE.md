# Hersteller-Schlüssel unter Windows mit WSL 2 vorbereiten

Stand 21.10.2026. Ubuntu unter WSL 2 ist beim Betreiber bestätigt.
Dies bereitet die dauerhafte Schlüsselablage vor. Eine vollständige
Ausführung des EOS-Signierlaufs unter WSL ist damit noch nicht nachgewiesen.

## Bestätigter öffentlicher Schlüssel

Der Betreiber hat die erfolgreiche lokale Schlüsselerzeugung gemeldet und
anschließend ausschließlich den öffentlichen Prüfschlüssel übermittelt.
Die [öffentliche Datei](../security/release-trust/manufacturer-20261021.pem)
ist ein kanonisches Ed25519-SPKI-PEM mit 113 Byte einschließlich abschließendem
Zeilenumbruch. Ihr SHA-256 stimmt exakt mit der zuvor gemeldeten Ausgabe
von `sha256sum release-public.pem` überein:

```text
95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248
```

Der private Schlüssel und die Passphrase wurden nicht übermittelt.
Diese Prüfung bestätigt Format und Übereinstimmung des öffentlichen Schlüssels;
ein Signier-/Verifikationstest mit dem tatsächlichen privaten Schlüssel und
eine wiederlesbare getrennte Sicherung sind noch nicht nachgewiesen.
[Prüfvermerk](../../reports/integration/security-refresh-20261021/install/manufacturer-public-key-20261021.json).

Den bestehenden Schlüssel weiterverwenden. **Den folgenden Erzeugungsblock
nicht erneut ausführen**, wenn die Schlüssel bereits vorhanden sind.
Der öffentliche Schlüssel wird erst mit der signierten Frischlieferung auf
dem Pi verankert; seine Ablage in der Dokumentation installiert keine Autorität.

## Einmalige Erzeugung auf einem neuen Signierrechner

In PowerShell oder der Windows-Eingabeaufforderung Ubuntu öffnen:

```powershell
wsl -d Ubuntu
```

Den folgenden Block als normalen Ubuntu-Benutzer ohne `sudo` ausführen.
Er benötigt das Ubuntu-Paket `openssl`. Bei `openssl: command not found`
zunächst `sudo apt update && sudo apt install openssl` ausführen.

Eine lange, einzigartige Passphrase im Passwortmanager bereithalten.
OpenSSL fragt sie verdeckt zweimal zur Verschlüsselung und anschließend
erneut zum Lesen des verschlüsselten Schlüssels ab. Keine Passphrase in
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
wird erst mit den exakten geprüften Laufzeit-/Nachweisdateien eingerichtet.
Der private Schlüssel wird dafür nicht an GitHub oder in den Chat übertragen.

Seit dem Sicherheitsrelease vom 21.10.2026 wird die neue Frischlieferung unter
Linux mit Node 24.22.1 vorbereitet. Der zuvor qualifizierte Quellcommit
`a2733fa5561f7327ff3689b7464f8727760fb670` gehört zur früheren Node-24.21.0-Basis
und darf nicht als Nachweis für das neue Paket verwendet werden. Der Signierlauf
benötigt den neu qualifizierten sauberen Quellcommit, dessen genaue vorbereitete
Laufzeit-/Nachweisdateien und das hashgeprüfte offizielle ARM64-Node-Archiv.
Ein späterer Dokumentationscommit ersetzt diesen Herkunftsnachweis nicht.
Siehe [Node- und Linux-Aktualisierung](AUTOMATISCHE_SICHERHEITSUPDATES_DE.md).

Für Paketauflösung und Build wird zusätzlich exakt **npm 11.19.0** benötigt.
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

Nachweise: [ursprüngliche Formatprüfung](../../reports/integration/security-refresh-20261021/install/windows-key-custody.json)
(an den Dokumentationsstand `20efcdc99b3dfbe5e34ad614b45cae70f9e22bc7` gebunden)
und [Prüfung des übermittelten öffentlichen Herstellerschlüssels](../../reports/integration/security-refresh-20261021/install/manufacturer-public-key-20261021.json).
Offizielle Referenzen:
[WSL](https://learn.microsoft.com/en-us/windows/wsl/install),
[genpkey](https://docs.openssl.org/3.0/man1/openssl-genpkey/),
[PKCS#8](https://docs.openssl.org/3.0/man1/openssl-pkcs8/),
[pkey](https://docs.openssl.org/3.0/man1/openssl-pkey/).
