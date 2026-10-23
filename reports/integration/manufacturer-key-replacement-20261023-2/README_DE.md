# Zweiter Ersatz des Hersteller-Prüfschlüssels am 23.10.2026

Der Betreiber meldete erneut eine nicht mehr verfügbare Schlüsselpassphrase.
Anschließend erzeugte er lokal einen weiteren verschlüsselten Ed25519-Schlüssel
und meldete dessen erfolgreiches erneutes Öffnen. Eine Kompromittierung wurde
nicht gemeldet. Übermittelt wurden nur öffentlicher Schlüssel, SHA-256 und
Ordnerpfad. Private Schlüsseldateien und Passwörter wurden nicht übermittelt;
der tatsächliche private Ordnerpfad wird nicht im Repository gespeichert.

Die neue öffentliche Datei
[`manufacturer-20261023-2.pem`](../../../docs/security/release-trust/manufacturer-20261023-2.pem)
ist kanonisches Ed25519-SPKI-PEM mit 113 Byte einschließlich abschließendem LF.
OpenSSL liest sie und gibt sie bytegleich wieder aus. Ihr SHA-256 stimmt exakt
mit der Betreibermeldung überein:

```text
518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40
```

## Begrenzte Änderung

Ausgangscommit: `671e48faf3b547fc61f552a9a0bd116a986fee90`.
Nur der aktuelle Herstellerhash und der daraus folgende vollständige Hash des
R8-Einstiegserzeugers ändern sich in den Werkzeugen. Die vorherigen öffentlichen
Schlüssel vom 21.10. und vom früheren 23.10. sowie deren Berichte bleiben
historisch unverändert erhalten. Aktuelle Werkzeuge akzeptieren deren Hashes
nicht mehr als Herstellerautorität.

Der qualifizierte Laufzeitquellstand bleibt
`f353dd08bf8ac5897e9b1c357994d4047a82ed6d`: Sequenz 15, Auslieferungsrevision 12,
js-controller 7.2.5 und Node 24.22.1. Beide ursprünglichen CI-ZIPs und die festen
Archivhashes bleiben unverändert. Keine neue Paketauflösung oder Laufzeitänderung.

Die [zuvor geprüfte begrenzte Anpassung des Einstiegserzeugers](../manufacturer-key-replacement-20261023/README_DE.md)
bleibt erhalten: Paket und leerer Kanal werden mit sauberem qualifiziertem
Checkout signiert. Erst nach Entfernung der temporären entschlüsselten Datei
wird der vollständig gebundene Einstiegserzeuger vorübergehend ersetzt und
anschließend wiederhergestellt. Die vollständigen Quellhashes lauten:

- Original aus `f353`: `4709a10de3330ea7de740dda7cbf7f5e45d898c0cf16da470cb681ed4efa2278`.
- Aktuelle Ersatzfassung: `9a5cb7980c45ed1d3f812f70790b682c28f53f36050298c903587d74310ec388`.

`PREVIOUS_KEY_SHA` bleibt deshalb absichtlich auf dem Hash aus `f353`; er ist
eine Quellvergleichskonstante und keine akzeptierte Signierautorität. Der
historische R8-Ausgangsschlüssel bleibt ebenfalls unverändert. Es wird weder
ein Geräteschlüssel automatisch rotiert noch ein Lizenzschlüssel ersetzt.

## Ausgeführte Prüfungen

- Python: **16 bestanden, 0 Fehler, 0 übersprungen**; Quellpins, Ordnerauswahl,
  ZIP-Grenzen und Behandlung kurzlebiger privater Kryptografie-Fixtures.
- Node: **9 bestanden, 0 Fehler, 0 übersprungen**; aktuelle Herstellerbindung,
  beide früheren Herstellerbindungen abgewiesen, R8-Basis, eingebettete Helfer,
  Bash-Syntax, Transport-, Finalisierungs- und Prozessgrenzen.
- Echte temporäre Git-Ablage: Ersatzfassung erzeugt, anschließend bytegleiches
  Original und sauberer Git-Status wiederhergestellt.
- Öffentlicher Schlüssel mit OpenSSL kanonisch zurückgelesen; gemeldeter Hash
  bestätigt. `git diff --check` bestanden.

Umgebung: Linux x64, Node **24.19.0**, Python **3.12.14**, OpenSSL **3.0.13**.
Rohprotokolle: [Python](python-tests.txt), [Node](node-tests.txt).
Dateihashes und Status: [verification.json](verification.json).
Dies sind Werkzeugtests, keine erneute Laufzeitqualifikation mit Node 24.22.1.

## Offene Nachweise

Erneutes Öffnen des privaten Herstellerschlüssels ist ausschließlich
betreiberseitig gemeldet. Der vollständige WSL-Signierlauf mit diesem Schlüssel,
eine getrennte wiederlesbare Sicherung, Veröffentlichung und öffentliche
Rückprüfung des signierten Pakets und daraus erzeugten R8-Befehls bleiben
**OFFEN**. ARM64-/Pi-Migration, systemd-/APT-/Neustart- und Wiederherstellungsabnahme
sowie physische Steuerung wurden hier nicht ausgeführt. Keine Produktions- oder
CRA-Freigabe; historische offene Abhängigkeitsbefunde bleiben unverändert.
