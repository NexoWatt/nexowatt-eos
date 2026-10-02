# RC81 – Netzanschlussleistung und NVP als zentrale Zuordnung

## Verbindlicher Datenvertrag

Unter **AppCenter → Zuordnung → Allgemein** werden die beiden zentralen Größen der Netzregelung gesetzt:

1. **Netzanschlussleistung (W)** – einzige statische Quelle für die zulässige Netzbezugsleistung.
2. **Netzpunkt-Messung (Import + / Export −)** – einzige Messquelle für den signierten NVP.

Unter **Netzlimits** existieren bewusst weder eine zweite Hard-Limit-Vorgabe noch eine zweite NVP-Datenpunktzuordnung.

## Ableitung der Grenzwerte

Bei einer zugeordneten Netzanschlussleistung von 30.000 W gilt:

```text
Hard-Limit = 30.000 W = 100 %
Reserve    =  3.000 W = 10 %
Soft-Limit = 27.000 W =  90 %
```

Der signierte NVP bleibt die Führungsgröße:

```text
Netzbezug       = positiver NVP
Netzeinspeisung = negativer NVP
```

Eine Einspeisung von 10.100 W ergibt deshalb bei 30.000 W Anschlussleistung:

```text
Hard-Headroom = 30.000 W - (-10.100 W) = 40.100 W
Soft-Headroom = 27.000 W - (-10.100 W) = 37.100 W
```

## Strengere dynamische Grenzen

Ein RLM-, Netzbetreiber- oder anderer autoritativer Deckel darf die aus der Zuordnung stammende Anschlussgrenze nur **absenken**. Er darf sie nicht ersetzen, erhöhen oder bei fehlender Netzanschlussleistung versteckt neu erzeugen.

Wird die wirksame Grenze beispielsweise auf 25.000 W abgesenkt, werden Soft-Limit und Reserve daraus neu berechnet:

```text
Hard-Limit wirksam = 25.000 W
Reserve             =  2.500 W
Soft-Limit wirksam  = 22.500 W
```

## Migration

Alte Konfigurationswerte werden neutralisiert und von der Runtime ignoriert:

- `gridConstraints.importHardLimitW`
- `gridConstraints.gridImportHardLimitW`
- `gridConstraints.gridPowerId`
- ein Legacy-Fallback über `peakShaving.maxPowerW`

Die 0-Einspeisung bleibt unter **Netzlimits**, verwendet jedoch dieselbe zentrale signierte NVP-Messung aus **Zuordnung → Allgemein**.
