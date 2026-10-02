# NexoWatt UI 0.8.62 – Lastmanagement EVCS Ist/Reservierung Fix

## Zweck

Diese Version korrigiert eine Budget-/Status-Regressionsstelle im Lademanagement.

Symptom im Feld:

```text
Energiefluss / Live: Ladeleistung 0 W
Budget & Gates: EVCS Ist/Soll bleibt bei alter Ladeleistung stehen
Gate A Netz: EVCS-Cap wird durch alte Reservierung verfälscht
```

## Ursache

Das Lademanagement hatte für interne Reservierungen bewusst frühere Setpoints als Fallback im Wert `totalPowerW` gehalten. Dieser Wert ist für Budget-Reservierungen nützlich, darf aber nicht als aktuelle reale Ladeleistung und nicht als EVCS-Leistung für das Netz-Gate benutzt werden.

## Fix

Ab 0.8.62 werden getrennt behandelt:

```text
EVCS Ist         = frisch gemessene Ladeleistung
EVCS Reserviert = geplante / kommandierte Leistung
EVCS Soll        = Zielwert / Setpoint
```

Gate A Netz nutzt für die Netzanschluss-Berechnung nur:

```text
frisch gemessene EVCS-Istleistung
```

Alte Setpoint-Reservierungen werden dort nicht mehr vom Netzbezug abgezogen.

## Neue bzw. korrigierte States

```text
chargingManagement.control.actualW
chargingManagement.control.reserveW
chargingManagement.control.gridEvcsActualForCapW
chargingManagement.control.gridEvcsReserveIgnoredForCapW
chargingManagement.summary.totalPowerW
chargingManagement.summary.totalReservedPowerW
```

## Erwartung nach Update

Wenn die Live-Anzeige zeigt:

```text
Ladestation: 0 W
```

muss im Status erscheinen:

```text
EVCS Ist: 0 W
EVCS Reserviert: optional alter/aktueller Zielwert
EVCS Soll: Zielwert
```

Gate A Netz darf keine alte EVCS-Reservierung mehr als freie Netzkapazität rechnen.

## Wichtig

Diese Version ändert keine Hardware-Schreibpfade und keine Ladepunkt-Ansteuerung. Sie korrigiert die Trennung zwischen realer Messleistung und reserviertem Budget.
