# NexoWatt UI 0.8.61 – Loadmanagement Grid-Cap Fix

## Zweck

Version 0.8.61 korrigiert die Anzeige und die Budget-Sicherheitslogik im Lade-/Lastmanagement.

Gefundener Feldfall:

```text
Netzlimit effektiv: 40 kW
Netzbezug: ca. 34 W
EVCS Ist: ca. 10.97 kW
alte Anzeige EVCS Cap (Netz): 50.94 kW
```

Das war missverständlich und für Kundenanlagen zu riskant.

## Ursache

Die alte Logik hat berechnet:

```text
Grundlast = Netzleistung - EVCS-Ist
EVCS Cap = Netzlimit - Grundlast
```

Wenn Speicher/PV die laufende Ladung stützen, kann diese Grundlast negativ werden:

```text
34 W - 10.97 kW = -10.94 kW
```

Dadurch entstand:

```text
40 kW - (-10.94 kW) = 50.94 kW
```

## Fix

Ab 0.8.61 gilt:

```text
Grundlast wirksam = max(0, Netzleistung - EVCS-Ist)
EVCS Cap (Netz) = min(Netzlimit, Netzlimit - Grundlast wirksam)
```

Damit wird bei 40 kW Anschluss nie mehr ein Netz-Cap über 40 kW angezeigt oder produktiv übernommen.

## Diagnose

Die rohe negative Grundlast bleibt intern als Diagnose sichtbar:

```text
chargingManagement.control.gridBaseLoadRawW
chargingManagement.control.gridLocalSupportW
```

Produktiv genutzt wird aber die geklemmte Grundlast:

```text
chargingManagement.control.gridBaseLoadW >= 0
chargingManagement.control.gridCapEvcsW <= gridImportLimitW_effective
```

## Wichtig

Diese Version ändert keine Hardware-Schreibpfade und baut keine neue Regelung.

Es ist ein Sicherheits-/Diagnosefix für:

```text
Loadmanagement
EVCS Netzbudget
Core-Limits Gate A
Status-Anzeige
```

## Erwartung nach Update

In deinem Beispiel sollte im Status nicht mehr erscheinen:

```text
Grundlast: -10.94 kW
EVCS Cap (Netz): 50.94 kW
```

Sondern konservativ:

```text
Grundlast: 0 W
EVCS Cap (Netz): 40.00 kW
```

Das tatsächliche Ladebudget kann zusätzlich durch Zielgruppen, Ladepunktlimit, PV-Modus, §14a, Phasenlimit oder andere Gates niedriger sein.
