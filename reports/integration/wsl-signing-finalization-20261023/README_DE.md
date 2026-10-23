# Abschlussfehler nach erfolgreicher lokaler Signierung

Ausgangscommit: `106e84852d082716f7cc4addc884a6570c64e2d3`.
Das Betreiberprotokoll meldet erfolgreiche Paket-/Kanalsignierung, lokale
Archiv-Rückprüfung, Entfernung der temporären entschlüsselten Datei und
Erzeugung des R8-Einstiegs. Anschließend stoppte der Helfer mit
`Qualifizierter Quellstand nach R8-Einstieg nicht sauber wiederhergestellt`.
Die tatsächlichen Herstellerdateien liegen dieser Prüfung nicht vor.

## Ursache und Korrektur

`build-managed-test.cjs` prüft den Quellstand vor dem Schreiben seiner drei
Lieferdateien. Diese entstehen danach unter `delivery/managed-test-15/`,
das nicht in den Git-Ausschlussregeln steht. Die Schlussprüfung behandelte
deshalb die eigenen Ausgaben als Quelländerung. Der Fehler wurde unabhängig
in einer echten temporären Git-Ablage reproduziert.

Die Korrektur bindet weiterhin Commit `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Sie verweigert alle von Git gemeldeten Änderungen an versionierten oder
vorgemerkten Dateien. Unter den von Git angezeigten unversionierten Dateien
erlaubt sie nur diese drei exakten Pfade:

- `delivery/managed-test-15/eos-linux-arm64.tar.gz`
- `delivery/managed-test-15/release-public.pem`
- `delivery/managed-test-15/delivery.json`

Keine pauschale Ausnahme für `delivery/`, keine Unterdrückung unversionierter
Dateien und keine Änderung der bisherigen Git-Ausschlussregeln. Der originale
Einstiegserzeuger wird bytegleich wiederhergestellt. Ein leerer Git-Status
nach Erzeugung der Lieferung wird nicht behauptet.

## Abschluss ohne privaten Schlüssel

`sign-qualified-r8-wsl.py --finish ABS_WORKDIR` ist ausschließlich an folgende
öffentliche Identitäten des gemeldeten Laufs gebunden:

| Inhalt | Größe / Identität |
|---|---|
| Release-ID | `95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534` |
| Archiv | 134278673 Byte, SHA-256 `dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44` |
| Prüfschlüssel | 113 Byte, SHA-256 `518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40` |
| Liefermetadaten | 2632 Byte, SHA-256 `bd16e1cd02cf5816c869030686d5aec2a7d9f796a30aa4fd3c2d0d1048675d43` |
| R8-Einstieg | 81554 Byte, SHA-256 `42a66e9aa3a1a5f71a438d6606ffeebfdef5e55de4884bb906f8559e58293d67` |

Nach Pfad-, Eigentümer-, Rechte-, Dateityp- und Quellenprüfung prüft der Helfer
den signierten leeren Kanal einschließlich Ablaufzeit. Mit dem vollständig
hashgebundenen Einstiegserzeuger prüft er die Archivsignatur und liest das
gesamte Archiv zurück. Er erzeugt Einstieg und Vorbereitungsmetadaten temporär
neu und vergleicht beide bytegenau. Danach stellt er die Originalquelle wieder
her und prüft erneut den qualifizierten Quellstand.

Erst danach entsteht `public-finished/`. Kopierte Dateien werden nochmals auf
Größe und Hash geprüft; Archiv und PEM müssen zur Lieferung beziehungsweise
zur festen Autorität passen. Die kopierten Liefermetadaten bleiben zusätzlich
an ihren konkreten Recovery-Hash gebunden. Die Metadaten-ZIP enthält nur sechs
explizite öffentliche Dateien. Keine rekursive Übernahme der Arbeitsablage
oder privater Dateien, keine Überschreibung vorhandener Ziele.

Der Abschluss liest keinen privaten Schlüssel, fragt kein Passwort ab, signiert
nichts erneut und lädt keine Eingaben nach. Bei Abbruch während des Exports
kann ein teilweises `public-finished/` verbleiben; ein Folgeaufruf verweigert
dessen Überschreiben. Ausgaben aufbewahren und den Fehler prüfen lassen.

## Ausgeführte Prüfungen und Grenzen

**41 Python-Tests bestanden, 0 Fehler, 0 übersprungen**. Darunter echte temporäre
Git-Ablagen mit dem reproduzierten Fehler, positive Drei-Dateien-Ausnahme,
geänderte/vorgemerkte/umbenannte Quellen, zusätzliche unversionierte Pfade,
Dateitypen, Eigentümer, Rechte, Größenänderungen während des Kopierens,
Exportbindungen, keine Überschreibungen, ZIP-Allowlist und Vorab-Abbrüche.
Export-Fixtures sind ausdrücklich unsignierte Testdaten und behaupten keine
Archivsignaturprüfung. Die bisherigen kurzlebigen Kryptografie-Fixtures sind
weiterhin enthalten; kein tatsächlicher Herstellerschlüssel wurde verwendet.

Umgebung: Linux x64, Python 3.12.14, Node 24.19.0 zur Syntaxprüfung des
eingebetteten Abschluss-JavaScripts, OpenSSL 3.0.13. Python-AST, JavaScript-Syntax
und `git diff --check` bestanden. [Rohprotokoll](python-tests.txt),
[Quell-/Protokollbindungen](verification.json). Unveränderte Node-Einstiegstests
wurden nicht wiederholt.

Der vollständige Abschluss mit den tatsächlichen Herstellerdateien ist **OFFEN**.
Das Betreiberprotokoll ersetzt keinen unabhängigen Nachweis einer veröffentlichten
Lieferung. Veröffentlichung, öffentlicher Download-/Signatur-Readback, R8-/ARM64-/
Pi-Migration, systemd-/APT-/Neustart- und Wiederherstellungsabnahme sowie physische
Steuerung bleiben offen. Laufzeit, js-controller 7.2.5, Node 24.22.1, Schlüsselbindung
und frühere offene Abhängigkeitsbefunde bleiben unverändert. Keine Produktions-
oder CRA-Freigabe.
