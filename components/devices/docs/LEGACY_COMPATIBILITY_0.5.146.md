# Bestandsanlagen-Kompatibilität 0.5.146

## Ziel

Alias Contract v1 darf die bereits in Kundenanlagen verwendeten Rohdatenpunkte und Legacy-Aliase nicht verändern. Die Standardisierung wird daher ausschließlich als zusätzliche Schicht bereitgestellt.

## Unveränderte Bestandsoberfläche

Diese Bereiche bleiben gegenüber dem Produktionsstand 0.5.143 unverändert:

```text
devices.<id>.<herstellerspezifische Rohdatenpunkte>
devices.<id>.aliases.r.*
devices.<id>.aliases.ctrl.*
devices.<id>.aliases.alarm.*
devices.<id>.aliases.comm.*
```

Geprüft werden pro Template unter anderem:

- Datenpunkt-ID und Anzahl der Rohdatenpunkte
- Register-/Protokolldefinitionen im vollständigen Template
- Alias-ID, Typ, Rolle, Einheit und Les-/Schreibbarkeit
- Ziel-Datenpunkt und optionaler Spiegel-Datenpunkt
- `fromDevice`, `toDevice`, `get` und `toMirrorDevice`

## Nur zusätzliche Standardpfade

Neuere NexoWatt-Komponenten verwenden ausschließlich:

```text
devices.<id>.aliases.v1.*
devices.<id>.aliases.meta.*
```

Die v1-Pfade können Einheiten normalisieren oder Herstellerverfahren kapseln. Sie verändern jedoch nicht die darunterliegenden Legacy-Aliase. Bei ABL bleibt zum Beispiel die Ampere-zu-PWM-Umrechnung sowohl beim bisherigen Alias als auch beim v1-Alias identisch.

## Automatischer Kompatibilitätsschutz

Die Datei `test/fixtures/legacy-compatibility-v0.5.143.json` enthält die freigegebenen Prüfsummen für alle 181 Templates und deren Legacy-Aliasoberfläche. `test/legacyCompatibility.test.js` vergleicht jeden Build dagegen.

Ein Build wird blockiert, sobald eine Alias-Standard-Änderung unbeabsichtigt:

- ein bestehendes Alias entfernt oder hinzufügt,
- einen Ziel-Datenpunkt ändert,
- Typ, Rolle oder Einheit verändert,
- eine Schreibumrechnung verändert,
- Register-/Templateinhalte verändert oder
- eine destruktive Objektmigration einführt.

Bewusste spätere Geräteverbesserungen sind weiterhin möglich, müssen aber ausdrücklich als Geräteänderung geprüft und die Kompatibilitätsbaseline kontrolliert aktualisiert werden.

## Vermischte lokale Projektordner

Die Tests werden über `test/test-manifest.json` gestartet. Befinden sich alte Testdateien aus einer vorherigen Version im lokalen Ordner, bricht der Release-Guard mit einer klaren Mischversionsmeldung ab. Neue ZIP-Versionen dürfen deshalb nicht über einen alten Quellordner kopiert werden; der alte Ordner wird umbenannt oder gelöscht und die ZIP wird in einen leeren Ordner entpackt.
