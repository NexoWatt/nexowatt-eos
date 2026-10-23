# Ersatz des Hersteller-Prüfschlüssels am 23.10.2026

Der Betreiber hat die Passphrase des bisher vorgesehenen Herstellerschlüssels
verloren und lokal ein neues verschlüsseltes Ed25519-Schlüsselpaar erzeugt.
Eine Kompromittierung wurde nicht gemeldet. Übermittelt wurden nur der neue
öffentliche Schlüssel, sein SHA-256 und der lokale Ordnerpfad. Private Schlüssel
und Passwörter wurden weder benötigt noch übernommen.

Die neue öffentliche Datei
[`manufacturer-20261023.pem`](../../../docs/security/release-trust/manufacturer-20261023.pem)
ist kanonisches Ed25519-SPKI-PEM, 113 Byte einschließlich abschließendem LF.
OpenSSL konnte sie lesen und bytegleich erneut ausgeben. Ihr SHA-256 ist:

```text
d8808e00b958f476684005a95f543d9dfb3d4532bd54f31552a701d1e6aabdf6
```

Das erneute Öffnen der verschlüsselten privaten Datei ist eine Betreibermeldung.
Dieser Nachweis bestätigt nicht die tatsächliche Signierung eines Lieferpakets
mit dem neuen Herstellerschlüssel. Der alte öffentliche Schlüssel und bisherige
Prüfberichte bleiben als historische Nachweise unverändert erhalten.

## Änderung und Herkunft

Ausgangscommit dieser Änderung ist
`2a9279db86b6f42b3c55fe4d79b29a5e02e8cccb`. Die qualifizierte Laufzeit bleibt
`f353dd08bf8ac5897e9b1c357994d4047a82ed6d`, Sequenz 15, Auslieferungsrevision 12,
js-controller 7.2.5 und Node 24.22.1. Die beiden vorhandenen CI-ZIPs und ihre
festen Hashes bleiben unverändert. Es findet keine neue Paketauflösung statt.

Der WSL-Helfer bindet den neuen Herstellerhash fest. Ein optionales drittes
Positionsargument wählt ausschließlich einen geschützten, kanonischen absoluten
Schlüsselordner unter dem Linux-Heimverzeichnis; es ersetzt keinen Hash-Pin.
Eine automatische Suche nach Schlüsseln oder ein Rückfall auf andere Schlüssel
findet nicht statt. Der tatsächliche private Ordnerpfad ist nicht im Repository.

Der öffentliche R8-Einstiegserzeuger ändert ausschließlich seine Konstante für
den Hersteller-Prüfschlüssel. Der WSL-Helfer prüft beide vollständigen Fassungen
vor dem Öffnen der privaten Datei:

- Original aus dem qualifizierten Quellstand:
  `4709a10de3330ea7de740dda7cbf7f5e45d898c0cf16da470cb681ed4efa2278`.
- Fassung mit neuem Herstellerhash:
  `319776f5a20716c7a1fe3dd2ca3dea293638e45af7b734a0f6285e444b9bb156`.

Das Original wurde zusätzlich am festen öffentlichen Quellcommit zurückgelesen
und bytegleich mit dem lokalen Ausgangsstand verglichen. Paket und leerer Kanal
werden weiterhin mit sauberem qualifiziertem Checkout signiert. Erst nach dem
Entfernen der temporären entschlüsselten Datei wird der Einstiegserzeuger kurz
ersetzt und anschließend atomar wiederhergestellt. Die abschließende Git-Prüfung
fordert den unveränderten Quellcommit und einen sauberen Arbeitsbaum. Beide
Werkzeughashes erscheinen separat vom Laufzeitquellstand in der öffentlichen
Zusammenfassung. Signatur-, Archiv-, Release- und eingebettete Quellprüfungen
bleiben aktiv. SIGKILL oder Hostausfall können keine Aufräumroutine ausführen;
danach den Helfer erneut mit einer frischen Arbeitsablage starten.

Die historische R8-Vertrauensbasis, Release-ID und Ausgangssequenz 11 bleiben
unverändert. Diese Änderung installiert oder rotiert noch keinen Schlüssel auf
einem Gerät und berührt keine Lizenzschlüssel.

## Ausgeführte Prüfungen

- Python: **16 bestanden, 0 Fehler, 0 übersprungen**. ZIP-Grenzen, echte
  kurzlebige Kryptografie-Fixtures, private temporäre Dateien, neue Ordnerwahl,
  vollständige Quellpins sowie Wiederherstellung bei Erfolg, Fehler und Abbruch.
- Node: **8 bestanden, 0 Fehler, 0 übersprungen**. Neuer Herstellerhash,
  Ablehnung des alten Herstellerhashes, unveränderte R8-Basis, Bash-Syntax,
  eingebettete Helfer, Transportbindung, Finalisierung und Prozessumgebung.
- Zusätzliche echte temporäre Git-Ablage: Ersatzfassung sichtbar verändert,
  danach bytegleiches Original und sauberer Git-Status wiederhergestellt.
- OpenSSL: öffentlicher Ed25519-Schlüssel kanonisch und gemeldeter Hash bestätigt.
- `git diff --check`: bestanden.

Umgebung: Linux x64, Node **24.19.0**, Python **3.12.14**, OpenSSL **3.0.13**.
Diese gezielten Werkzeugtests sind kein neuer Laufzeit-Nativtest unter 24.22.1.
Rohprotokolle: [Python](python-tests.txt), [Node](node-tests.txt).
Dateibindungen und Status: [verification.json](verification.json).
Die früheren tatsächlichen Prüfungen der qualifizierten Eingaben und die
Signierung mit einem Wegwerf-Testschlüssel sind im
[Helferbericht vom 22.10.](../wsl-signing-helper-20261022/README_DE.md) dokumentiert;
sie wurden für diese reine Herstellerbindung nicht erneut ausgeführt.

## Weiterhin offen

Der vollständige WSL-Lauf mit dem neuen tatsächlichen Herstellerschlüssel,
getrennte wiederlesbare Schlüsselsicherung, Veröffentlichung und öffentlicher
Rücklesetest des signierten Pakets und des daraus erzeugten R8-Befehls sind
**OFFEN**. Ebenso offen bleiben der ARM64-/Pi-Test, die direkte Migration,
systemd-/APT-/Neustart- und Wiederherstellungsabnahme sowie physische Steuerung.
Es gibt keine Produktions- oder CRA-Freigabe. Die früher dokumentierten offenen
Abhängigkeitsbefunde werden durch einen Schlüsselersatz nicht behoben.
