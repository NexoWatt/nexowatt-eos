# R5: überprüfbare Ableitung des signierten R4-Testpakets

Dieses Verzeichnis enthält den Buildauftrag und nach erfolgreichem Build seine
Nachweise. Das Vorhandensein des Buildskripts allein bedeutet keinen gebauten
oder auf einem Raspberry Pi getesteten Lieferstand.

`build-revision.cjs` verlangt einen sauberen Git-Checkout und bindet den
tatsächlichen Commit. Es verifiziert das festgelegte R4-Archiv vollständig,
extrahiert dessen ARM64-App und übernimmt unveränderte Abhängigkeiten exakt.
Vier überprüfte CommonJS-Dateien des Admin werden aus den bytegleichen
Quell-/Build-Dateien übernommen: Sitzungsprüfung sowie Lizenzkern, Lizenzdienst
und neue Lizenzrichtlinie. Dazu kommen Startseiten-HTML/CSS und die korrigierte
PostgreSQL-Objects-Implementierung. Alle anderen App-Dateien müssen unverändert
bleiben. Unbenutzte alte Source-Maps bleiben als unveränderte Altdateien erhalten;
die neuen CommonJS-Dateien verweisen nicht darauf.

Das ist eine nachvollziehbare Ableitung mit expliziter Dateiliste, kein neuer
npm-Abhängigkeitsbuild und kein TypeScript-/Frontend-Build. Die SBOM übernimmt
das authentifizierte Paketinventar, markiert tatsächlich geänderte Komponenten
als Ableitungen, verschiebt bisherige Archivhashes in die Herkunftsnachweise
und bindet die neuen Dateibäume. Eine neue Schwachstellenprüfung oder eine
vollständige OS-/Firmware-/Frontend-Abhängigkeitsanalyse wird nicht behauptet.

Runtime und Hostwerkzeuge werden aus dem aktuellen Checkout neu zusammengestellt.
Die unveränderten systemd-Units und das unveränderte Datenbankschema sind eine
Voraussetzung der eng begrenzten R4-Reparatur. Ein neuer flüchtiger
Ed25519-Testschlüssel signiert Revision 5, Sequenz 8. Der private Schlüssel wird
nicht gespeichert. Das Archiv wird vollständig zurückgelesen, und alle neuen
Overlay-/Hostdateien werden gegen ihre Quellen gebunden. Frühere Lieferdateien
werden erneut auf Bytegleichheit geprüft.

Ausgaben nach erfolgreichem Build:

- `delivery/test-pi-0.2.0-test.3-r5/`: ARM64-Archiv, öffentlicher Testschlüssel,
  `delivery.json`, Prüfsummen.
- Hier: `runtime.cdx.json`, `runtime-derivative-sbom.json`,
  `signed-source-binding.json`, `build-verification.json`, `delivery.json`.

Die Quelle des Schlüssels und der neue Release-Hash müssen für den bestehenden
Pi unabhängig im neuen unveränderlichen Downloadbefehl festgelegt werden.
`eos-base extend` und der Neuinstallationspfad ersetzen diese Reparatur nicht.
Der gezielte Updater muss durch systemd mit `ExecStopPost` beaufsichtigt werden.
Siehe `../r4-r5-update-20261003/README.md`.

Hardwaretest, echte Pi-Aktualisierung, Passwort-Login und Anlageninbetriebnahme
bleiben bis zu ihren tatsächlichen Nachweisen offen. Physische Adapter werden
durch diesen Build nicht freigegeben.
