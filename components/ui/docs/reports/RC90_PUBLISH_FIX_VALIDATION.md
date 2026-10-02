# RC90 Publish-Manifest-Fix

## Ursache

Das Release-Artefaktmanifest war vor den letzten RC90-Änderungen erzeugt worden.
Dadurch enthielt es noch Hashwerte aus RC89 beziehungsweise aus einem früheren
RC90-Zwischenstand. Die ausgelieferten Dateien selbst waren vorhanden, aber der
read-only Publish-Guard musste korrekt abbrechen.

Betroffen waren zehn versiegelte Paketdateien, darunter `io-package.json`,
`main.js`, mehrere Regressionstests und `www/manifest.webmanifest`.

## Korrektur

Das Manifest wurde nach Abschluss aller RC90-Dateiänderungen aus der endgültigen
`package.json.files`-Liste neu erzeugt. Es wurden keine EMS-, Lade-, Speicher-,
NVP-, Tarif-, Forecast-, §14a- oder Hardware-Regelungen verändert.

## Abnahme

Die Freigabe erfolgt nur, wenn:

- `npm run publish:check` erfolgreich ist,
- die npm-Version weiterhin frei ist,
- `npm publish --dry-run` einschließlich `prepublishOnly` erfolgreich ist,
- das finale ZIP nach erneutem Entpacken denselben Publish-Check besteht.

## Zusätzliche Testhärtung

Der RC90-Regressions-Test enthielt selbst die gesuchten Marker und konnte sich
bei direktem Aufruf fälschlich als Runtime-Datei einlesen. Der Test schließt nun
seine eigene Datei und weitere Testverzeichnisse ausdrücklich aus. Er ist
zusätzlich als `test:rc90` in `package.json` registriert und Bestandteil von
`test:all`. Diese Änderung betrifft ausschließlich die Release-Prüfung, nicht
die Adapter-Runtime.
