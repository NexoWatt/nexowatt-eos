# Test.3 Revision 2: erneute signierte Lieferung

03.10.2026. Laufzeitversion `0.2.0-test.3`, Lieferrevision 2, signierte
Manifestsequenz 5. Ziel bleibt ein frischer isolierter Debian-13-ARM64-Testhost.

Diese Revision nimmt die korrigierte systemd-Namensraumprüfung in die signierte
Laufzeit auf. Sie wertet eine erfolgreiche vollständige Unitliste aus und
verweigert vorhandene EOS-/ioBroker-Units, Fehler und unvollständige Antworten.
Es wurden keine Installations- oder Native-Gates abgeschaltet.

Der App-Baum aus dem erfolgreichen vorherigen Build `eos-first-start-build-20261003-f`
wird ohne npm-Auflösung oder Änderungen kopiert. `app-reuse.json` bindet beide
vollständig gelesenen Datei-Inventare und die bytegleich übernommenen Lock-/SBOM-
und Transformationsnachweise. Deren ursprüngliche Buildpfade und Zeitangaben
bleiben erkennbar; sie werden nicht als neuer npm-Build ausgegeben.

Der wiederholbare Ablauf steht in [build-revision.cjs](build-revision.cjs):

```powershell
node reports/integration/installable-test3-r2-20261003/build-revision.cjs
```

Er verlangt die angegebene vorhandene Entwicklungsablage, Node 24.21.0 und
frische Ausgabe-/Logdateien. Ein erneuter Aufruf überschreibt keine Lieferung.
Der Lauf prüft den gesamten neuen Payload einschließlich Produktkatalog,
SBOM-Bindung und Native-Architektur. Danach erzeugt er eine neue Ed25519-
Testsignatur mit ausschließlich im Arbeitsspeicher gehaltenem privatem Schlüssel
und prüft sämtliche Tar-Mitglieder samt Signatur erneut. Vor Übernahme werden
die erwarteten Runtime-/Systemdateien sowie die festgelegten Paket- und
Lizenzdateien gegen den aktuellen Quellstand gebunden.

Die gezielten Regressionen bestehen: **20 Tests, 20 bestanden, keine übersprungen**.
Beleg: `revision-regression.stdout.log` und zugehörige Kommando-/Fehlerdateien.
Sie prüfen unter anderem falsche Revisionen, Sequenzen, Schlüsselpins,
veränderte Archivmitglieder und die Bindung des Katalogs an ausgelieferte Dateien.

Der tatsächliche Buildabschluss und die neuen Archive-/Schlüssel-/Release-Hashes
stehen in `build-verification.json`, `archive-delivery-verification.json`,
`signed-source-binding.json` und der neuen
[Lieferung](../../../delivery/test-pi-0.2.0-test.3-r2/README.md).
`historical-delivery-preservation.json` weist die unveränderten früheren
test.1-, test.2- und test.3-Lieferdateien aus.

**Offen, nicht ausgeführt:** Installation auf dem Pi, nativer Linux-ARM64-
Ladeversuch, PostgreSQL/systemd/POSIX-Rechte, echter Browserablauf, Reboot,
Abbruch/Recovery, Backup/Restore und sämtliche Hardware-/Anlagentests.
Die früher dokumentierten Grenzen der vollständigen UI-Testsuite bleiben
bestehen; dieser Verpackungslauf führt sie nicht erneut aus und erklärt sie
nicht nachträglich für bestanden. Keine Produktionsfreigabe.
