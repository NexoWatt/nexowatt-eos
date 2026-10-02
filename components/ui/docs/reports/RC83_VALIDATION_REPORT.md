# RC83 Validierungsbericht – NexoWatt UI 0.8.208

## Freigabestand

**Release-Kandidat:** `0.8.208 / RC83`  
**Ziel:** Speicher-Netzladen ausschließlich bei frischem günstigem Tarif sowie vollständige Beseitigung der Warnflut für `gridConstraints.exportLimit.sinkFieldProtocolJson`.

## Fachliche Korrekturen

### Speicher-Netzladen

- Dynamischer Tarif muss aktiv sein.
- Aktueller Preis muss frisch sein.
- Tarifzustand muss exakt `günstig` sein.
- Neutral, teuer, unbekannt, Tarif aus und ein veralteter Preis sperren Netzladen sofort.
- Bei aktiviertem variablem Netzentgelt ist zusätzlich das konfigurierte NT-/Quartalsfenster Pflicht.
- Außerhalb der Freigabe erzeugt TarifVis keinen eigenen Speicher-Sollwert; die normale Eigenverbrauchsoptimierung übernimmt.
- Ein einzelner persistierter Freigabe-State wird nicht mehr als Fallback verwendet.
- Tarif-, Reserve- und Lastspitzen-Nachladequellen werden unmittelbar vor dem Hardware-Write erneut geprüft.
- Herstellerprofile und die 0-W-Firewall können die ursprüngliche Netzladequelle nicht mehr verdecken.
- Jeder andere negative Speicher-Sollwert wird bei gesperrtem Netzladen physikalisch auf den real lokal verfügbaren PV-Überschuss begrenzt.
- Ein bereits validierter direkter PV-/Last-Feed-forward bleibt zulässig. Dadurch funktioniert die Eigenverbrauchsladung auch bei kurzzeitig verzögerter Batterie-Telemetrie, ohne teuren Netzstrom freizugeben.

### ioBroker-Warnflut

- `gridConstraints.exportLimit.sinkFieldProtocolJson` wird in `GridConstraintsModule.init()` als String-/JSON-State angelegt.
- Die Objektanlage liegt garantiert vor dem zyklischen State-Write.
- Nach Adapterneustart entstehen keine neuen Warnungen zu diesem fehlenden Objekt.

## Automatisierte Prüfung

Der finale Repository-Stand wurde mit folgenden Ergebnissen geprüft:

- vollständiges `npm run test:all`: bestanden;
- eigener RC83-Vertragstest: bestanden;
- 41 zusätzliche Speicher-/Speicherfarm-/Hersteller-Regressionsgruppen: bestanden;
- Sungrow-Hybrid-PV-/Last-Feed-forward bei verzögerter Batterie-Istleistung: bestanden;
- TypeScript-Typecheck der kanonischen Quellen und Runtime-Spiegel: bestanden;
- 733 TypeScript-Quelldateien syntaktisch geprüft;
- 118 produktive Runtime-Executables synchron;
- 480 Runtime-Spiegel synchron;
- Paket-Runtime-Smoke mit 173 JS-/MJS-Dateien: bestanden;
- Release-Artefakt mit 299 expliziten Paketdateien: bestanden;
- npm-Pack-/Publish-Dry-Run mit 300 Tarball-Einträgen: bestanden.

Der RC83-Vertragstest umfasst insbesondere:

- vollständige Tarif-Freigabematrix;
- fail-closed Verhalten bei veraltetem oder inkonsistentem Snapshot;
- zusätzliches NT-/Quartalsfenster bei aktivem variablem Netzentgelt;
- finale Sperre von Tarif-, Reserve- und Lastspitzen-Nachladebefehlen;
- physikalische PV-Überschussbegrenzung für Hersteller-, Hold- und Rampenpfade;
- validierten PV-/Last-Feed-forward als sichere Eigenverbrauchs-Ausnahme;
- Source-Rekonstruktion nach Herstellerprofil und 0-W-Firewall;
- dynamische Objektinitialisierung von `sinkFieldProtocolJson`;
- Reihenfolge Objektanlage vor State-Write.

## Feldabnahme vor Stable

Am realen System sind insbesondere zu bestätigen:

1. Wechsel `günstig → neutral` beendet laufendes Speicher-Netzladen unmittelbar.
2. Neutral/teuer führt ausschließlich zur Eigenverbrauchsoptimierung.
3. Günstig außerhalb eines aktivierten NT-/Quartalsfensters lädt nicht aus dem Netz.
4. PV-Überschussladen bleibt auch bei träger Batterie-Telemetrie funktionsfähig.
5. Nach Neustart entstehen keine neuen `sinkFieldProtocolJson has no existing object`-Warnungen.

Nach dieser Feldabnahme kann derselbe Quellstand ohne weitere Funktionsänderung als Stable veröffentlicht werden.
