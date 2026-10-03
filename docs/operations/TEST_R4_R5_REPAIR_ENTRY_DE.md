# Geschützter Reparaturaufruf für den eingerichteten R4-Teststand

Stand: 03.10.2026. Dieser Einstieg dient ausschließlich dem vorhandenen,
vollständig eingerichteten R4-Testsystem. Er ersetzt keinen Erstinstallationslauf.
Der Hersteller erstellt den konkreten Einzeiler erst aus dem gebauten,
signaturgeprüften R5-Archiv und dessen veröffentlichtem Commit. Dieses Dokument
enthält deshalb keinen vorläufigen Befehl mit erfundenen Hashwerten.

## Was der Reparaturbefehl macht

1. Er startet mit Rootrechten, bereinigter Umgebung und festem Werkzeugpfad.
   Unter `/root` entstehen neue private Arbeitsverzeichnisse. Vorhandene Dateien
   werden dort nicht überschrieben.
2. Er lädt das vollständige Reparaturskript über HTTPS von einem festen
   GitHub-Commit. Erst wenn Dateigröße und SHA-256 mit dem Einzeiler übereinstimmen,
   wird das Skript ausgeführt. Es gibt keine gestreamte `curl | bash`-Ausführung.
3. Das Skript lädt das R5-Archiv und dessen öffentlichen Signierschlüssel ebenfalls
   von einem festen Commit. Beide Dateien haben eigene Größen- und Hash-Pins.
   Downloads haben feste Zeit- und Größenlimits; Weiterleitungen sind abgeschaltet.
4. Die eingebetteten geprüften Python-Helfer entpacken ausschließlich reguläre
   Dateien und Verzeichnisse in einen neuen privaten Ordner. Pfadtraversierung,
   Links, Sonderdateien, doppelte Namen und übergroße Archive werden abgewiesen.
   Der vollständige Archivhash wird vor dem Entpacken erneut geprüft.
5. Ein vorübergehender systemd-Dienst führt den eng begrenzten R4→R5-Updater aus.
   Dieser prüft den installierten R4-Ausgangsstand, den neuen Schlüssel, beide
   Release-Signaturen und die signierten Dateiinhalte. Erst danach beginnt er
   den kontrollierten Wechsel. Derselbe geschützte Updater wird als
   `ExecStopPost` zur Bereinigung seiner eigenen unvollständigen Operation
   aufgerufen, auch wenn der Hauptprozess abrupt beendet wurde.
6. Die Arbeitsverzeichnisse und das Reparaturjournal bleiben als lokale Belege
   erhalten. Datenbank, bestehendes Adminpasswort, Lizenz und Gerätezertifikate
   werden durch den Transport nicht ersetzt. Die Erhaltungsprüfungen des Updaters
   bleiben verbindlich.

Der vorübergehende Dienst heißt `nexowatt-eos-test-repair.service`. Gleichzeitig
laufende Reparaturen sind nicht vorgesehen. Nach einem Fehler weder Sperrdateien
löschen noch den frischen Installer über das vorhandene System ausführen.
Zuerst den ausgegebenen Diagnosecode und den lokalen Reparaturzustand prüfen.
Eine angehaltene Testreparatur ist keine Anweisung, den alten Controller mit
umgangenen Startprüfungen erneut zu aktivieren.

## Herstellung und Veröffentlichung

Verbindlicher Generator: `tools/bootstrap/build-public-repair-entry.cjs`.
Er verwendet das echte lokale R5-Archiv unter
`delivery/test-pi-0.2.0-test.3-r5/`, prüft die Signatur und liest alle Archivdateien
gegen das Manifest zurück. Der im Archiv enthaltene Updater muss bytegenau zum
aktuellen geprüften Quelltext passen. Die Erzeugung verändert das Archiv nicht.

Nach Veröffentlichung dieser Lieferdateien auf einem unveränderlichen Commit:

```text
node tools/bootstrap/build-public-repair-entry.cjs --asset-commit <40-stelliger-Commit>
```

Das erzeugt ausschließlich neu:

- `delivery/public-repair-test3-r5/repair.sh`
- `delivery/public-repair-test3-r5/preparation.json`

Nach Veröffentlichung und Rücklesekontrolle dieses Skripts auf einem weiteren
unveränderlichen Commit wird der konkrete Einzeiler erzeugt:

```text
node tools/bootstrap/build-public-repair-entry.cjs --entry-commit <40-stelliger-Commit>
```

Er steht anschließend in `delivery/public-repair-test3-r5/REPAIR_COMMAND.txt`.
Der Generator überschreibt keine bereits erzeugten Lieferdateien. Ein geänderter
Reparaturstand benötigt einen neuen, ausdrücklich benannten Ausgabepfad und neue
Pins. Die ursprünglichen R4-Lieferdateien bleiben erhalten.

Der Workflow `.github/workflows/eos-r5-repair-entry.yml` kann diese Schritte nach
der R5-Veröffentlichung ausführen. Er liest Archiv, öffentlichen Schlüssel und
Liefermetadaten zusätzlich über ihre unveränderlichen öffentlichen HTTPS-URLs
zurück und vergleicht die vollständigen Bytes mit dem geprüften Checkout.
`remote-readback.json` hält die tatsächlich gelesenen URLs und Hashes fest.
Er erstellt zunächst einen lokalen Commit mit dem Einstieg und anschließend
einen zweiten mit dem darauf gepinnten Befehl und `command-verification.json`.
Nur die fünf ausdrücklich benannten neuen Lieferdateien dürfen veröffentlicht
werden; Änderungen an Quellen, historischen Dateien oder sonstige unversionierte
Dateien führen zum Abbruch. Ein normaler Push erfolgt nur, wenn `main` weiterhin
auf dem ursprünglichen Checkout-Commit steht. Bei konkurrierenden Änderungen
wird nichts erzwungen. Vorhandene Einstiegslieferungen werden übersprungen.

## Prüfstand und Grenzen

Die Transportprüfungen liegen in `tests/bootstrap/public-repair-entry.test.cjs`.
Sie prüfen tatsächliche Bash-/Datei-/Hash-Fehler und die paketierten Python-Helfer
mit lokalen Testdateien. Sie führen keine Reparatur auf einem Raspberry Pi aus.
Die systemd-Ausführung einschließlich Prozessabbruch, Neustart, Admin-Anmeldung
und der echte R4→R5-Wechsel müssen zusätzlich auf dem Zielsystem geprüft werden.
Der Transport erweitert weder Adapterfreigaben noch physische Anlagensteuerung.
SBOM und Signaturbindung stammen aus dem echten R5-Build; dieser Einzeiler erzeugt
keine neue Laufzeit-SBOM und begründet keine Produktions- oder CRA-Freigabe.
