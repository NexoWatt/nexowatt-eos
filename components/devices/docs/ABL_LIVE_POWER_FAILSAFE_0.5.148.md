# ABL eMH1 – Live-Strom- und Leistungs-Failsafe 0.5.148

## Fehlerbild

Die ABL eMH1 EVCC2/3 liefert keinen direkten Leistungswert. Der Adapter berechnet deshalb die Ladeleistung aus den drei Phasenströmen:

```text
P ≈ (I_L1 + I_L2 + I_L3) × 230 V
```

Wenn das Fahrzeug getrennt wurde oder die Phasenstrommessung nicht verfügbar war, lieferte EVCC2/3 für die Stromregister den dokumentierten Sentinel `0x03E8`. Der Modbus-Treiber setzte die Rohdatenpunkte korrekt auf `null`. Die berechneten Aliaswerte wurden bei einem nicht berechenbaren Ergebnis jedoch nicht überschrieben und behielten dadurch den letzten gültigen Strom- beziehungsweise Leistungswert.

## Korrektur

Nur für das Template

```text
evcs.abl.emh1.evcc2_3.modbusAscii
```

werden die operativen Live-Aliase jetzt aktiv auf `0` gesetzt, wenn mindestens eine der folgenden Bedingungen eintritt:

- EVCC2/3 meldet einen Nicht-Ladezustand. Positive Ladeleistung ist nur in `C2`, `C3` oder `C4` zulässig.
- Alle Phasenströme sind `null`, `NaN` oder anderweitig nicht numerisch.
- Der atomare R5-Leseblock `0x002E..0x0032` fehlt in einem Polling-Durchlauf.
- Die Modbus-Kommunikation fällt aus.
- Der Geräte-Heartbeat läuft in den Offline-Timeout.
- Der Adapter startet neu und hat noch keine frische Messung erhalten.

Betroffene Legacy- und v1-Aliase:

```text
aliases.r.currentL1
aliases.r.currentL2
aliases.r.currentL3
aliases.r.currentA
aliases.r.currentTotalA
aliases.r.currentPhaseSumA
aliases.r.power
aliases.r.powerEstimated

aliases.v1.r.currentL1
aliases.v1.r.currentL2
aliases.v1.r.currentL3
aliases.v1.r.currentA
aliases.v1.r.currentPhaseSumA
aliases.v1.r.power
aliases.v1.r.powerEstimated
```

Die Rohdatenpunkte `cURRENT_L1`, `cURRENT_L2` und `cURRENT_L3` bleiben unverändert und dürfen weiterhin `null` anzeigen. Dadurch bleibt der Diagnosewert „Messung nicht verfügbar“ erhalten, während Energiefluss, Historie und Regelung mit einem sicheren tatsächlichen Verbraucherwert von `0 W` arbeiten.

## Unverändert

- Keine Registeradresse wurde geändert.
- Das ABL-R5-Leseformat bleibt unverändert.
- Die Ampere-zu-PWM-Steuerung auf Register `0x0014` bleibt unverändert.
- `currentLimitA`, `currentLimitPct`, `chargingReleased` und `waitingForCurrent` bleiben getrennte Sollwert-/Freigaberückmeldungen.
- Bestehende Datenpunkt- und Alias-IDs bleiben identisch.
- Andere Hersteller und Templates behalten ihr bisheriges Last-Value-Verhalten.
