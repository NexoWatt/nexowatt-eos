# DEYE-Teststart in frischen Arbeitskopien (0.5.166)

## Nachgestellter Fehler

Der gemeldete Publish-Abbruch nennt `test/deyeModbus.test.js:1:1` und
`test failed` für die gesamte Datei. Diese Zusammenfassung enthält die
ursprüngliche Ausnahme nicht; sie steht bei einem Ladefehler weiter oben.

In einer frisch entpackten 0.5.165-ZIP ohne `node_modules` lässt sich der
dateiweite Abbruch reproduzieren: `Cannot find module 'modbus-serial'` beim
Laden von `deyeModbus.js` über `modbus.js`. Es wird noch kein Einzeltest
ausgeführt. Der Test hat den echten Transport importiert, obwohl seine
Registerprüfungen ausschließlich einen simulierten RTU-Bus verwenden.
Unverfügbare native Serialport-Abhängigkeiten können ebenfalls bereits
beim Import scheitern. Welche Ausnahme in der konkreten Windows-Arbeitskopie
auftrat, ist aus dem übermittelten Abschlussausschnitt nicht beweisbar.

## Korrektur

`test/deyeModbus.test.js` setzt nun die Testdoubles für `modbus-serial` und
`serialport` vor dem Import des Treibers ein. Das entspricht dem bestehenden
VARTA-Testmuster. Der temporäre Modul-Ladehook wird in `finally` zurückgesetzt.
Alle Register-, Einheiten-, Alias-, Schreib- und Fehlerprüfungen bleiben aktiv.

Der neue Test `deyeTestIsolation.test.js` führt die komplette DEYE-Testdatei
in einem separaten Prozess und einer frischen Kopie ohne `node_modules` aus.
Ein vorgeschalteter Ladehook blockiert echte Transportmodule ausdrücklich,
auch wenn sie anderswo installiert wären. Der Test verlangt 22 tatsächlich
ausgeführte und bestandene DEYE-Tests und null übersprungene Tests. Er verwendet
einen Pfad mit Leerzeichen und startet Node ohne zwischengeschaltete Shell.
Der interne Worker-Kontext des übergeordneten Node-Testlaufs wird nicht auf
den unabhängigen Kind-Testlauf übertragen; andernfalls könnte Node diesen
ohne Ausführung überspringen.

Produktive Treiber, Register, Templates, Aliase und Kommunikationsbibliotheken
werden nicht verändert. Insbesondere werden keine Laufzeit-Abhängigkeiten
entfernt und keine Geräteschreibfreigaben erweitert. Die vorhandenen echten
MQTT-/Modbus-TCP-Integrationstests bleiben unverändert erhalten.

## Prüfergebnisse und Grenzen

- Vor Korrektur: Ladeabbruch der DEYE-Datei in einer frischen Kopie ohne
  `modbus-serial` reproduziert.
- Nach Korrektur: 22 DEYE-Tests plus neue Isolationsprüfung erfolgreich, ohne
  installierte Laufzeit-Abhängigkeiten.
- Gesamtsuite ohne Abhängigkeiten: 182 bestanden, keine Fehler; fünf bestehende
  MQTT-/Modbus-TCP-Integrationstests ausdrücklich wegen fehlender Abhängigkeiten
  übersprungen. Dies ist kein Ersatz für den vollständigen Release-Test.
- Gesamtsuite mit frisch installierten Abhängigkeiten: 187 bestanden, keine
  Fehler, keine übersprungenen Tests. Release-Guard und `npm pack --dry-run`
  erfolgreich.
- Ausgeführt unter Linux/Node 24.19.0. Kein direkter Windows-Lauf und keine
  DEYE-Hardwareprüfung durchgeführt. Die Isolationsprüfung reproduziert die
  fehlenden Transport-Abhängigkeiten unabhängig vom Betriebssystem.

## Nutzung unter Windows

Die vollständige 0.5.166-ZIP in einen frischen Ordner entpacken. Im entpackten
Projektordner:

```powershell
node .\scripts\release-guard.cjs
if ($LASTEXITCODE -ne 0) { throw "Projektprüfung fehlgeschlagen." }

npm install
if ($LASTEXITCODE -ne 0) { throw "Installation fehlgeschlagen." }

npm pack --dry-run
if ($LASTEXITCODE -ne 0) { throw "Paketprüfung fehlgeschlagen." }

npm publish
```

Falls weiterhin dieselbe Testdatei scheitert, die vollständige Ausgabe
einschließlich der ersten Ausnahme erzeugen:

```powershell
node --test --test-reporter=spec .\test\deyeModbus.test.js 2>&1 | Tee-Object -FilePath .\deye-test.log
```

Nicht ausschließlich den abschließenden Block `failing tests` auswerten.
Die Meldung davor unterscheidet beispielsweise einen fehlenden Quelltext,
einen Merge-Konflikt, einen Importfehler und eine fehlgeschlagene Assertion.
