# Hersteller-Schlüssel unter Windows mit WSL 2 vorbereiten

Stand 21.10.2026. Ubuntu unter WSL 2 ist beim Betreiber bestätigt.
Dies bereitet die dauerhafte Schlüsselablage vor. Eine vollständige
Ausführung des EOS-Signierlaufs unter WSL ist damit noch nicht nachgewiesen.

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

Der vollständige Build-Signierer verlangt Linux, Node 24.21.0 und den sauberen
geprüften Quellcommit `a2733fa5561f7327ff3689b7464f8727760fb670`.
Ein späterer Dokumentationscommit ersetzt diesen Herkunftsnachweis nicht.
Die neu erzeugte Update-Autorität ersetzt auch nicht die getrennten,
authentifizierten öffentlichen Prüfschlüssel der vorhandenen NWL3-Lizenzen.

Nachweise: [Formatprüfung](../../reports/integration/security-refresh-20261021/install/windows-key-custody.json).
Offizielle Referenzen:
[WSL](https://learn.microsoft.com/en-us/windows/wsl/install),
[genpkey](https://docs.openssl.org/3.0/man1/openssl-genpkey/),
[PKCS#8](https://docs.openssl.org/3.0/man1/openssl-pkcs8/),
[pkey](https://docs.openssl.org/3.0/man1/openssl-pkey/).
