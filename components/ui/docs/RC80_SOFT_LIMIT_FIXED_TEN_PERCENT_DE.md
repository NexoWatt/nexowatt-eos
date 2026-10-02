# RC80 – Soft-Limit fest auf 10 % Reserve der NVP-Vorgabe

## Verbindliche Regel

Das Hard-Limit ist die maximal zulässige Netzbezugsleistung am Netzverknüpfungspunkt (NVP). Das Soft-Limit wird nicht mehr manuell eingestellt und besitzt keine Mindest- oder Maximalreserve.

```text
Soft-Reserve = Hard-Limit × 10 %
Soft-Limit   = Hard-Limit − Soft-Reserve
             = Hard-Limit × 90 %
```

Die Berechnung erfolgt auf ganze Watt gerundet. Soft-Limit und Reserve ergeben zusammen immer exakt das wirksame Hard-Limit.

## Beispiele

| Wirksame NVP-/Hard-Vorgabe | Reserve 10 % | Soft-Limit 90 % |
|---:|---:|---:|
| 5.000 W | 500 W | 4.500 W |
| 30.000 W | 3.000 W | 27.000 W |
| 100.000 W | 10.000 W | 90.000 W |

Die bisherige Begrenzung der Reserve auf mindestens 1 kW und höchstens 3 kW entfällt vollständig.

## AppCenter

Unter **AppCenter → Netzlimits** wird nur das Hard-Limit konfiguriert. Das Soft-Limit wird automatisch berechnet und lesend angezeigt. Frühere Konfigurationswerte für ein explizites Soft-Limit oder eine manuelle Reserve werden beim Laden neutralisiert und von der Laufzeit nicht mehr ausgewertet.

Hysterese und Wiederfreigabe-Verzögerung bleiben einstellbar, weil sie nur das dynamische Regelverhalten stabilisieren und nicht die 10-Prozent-Grenze verändern.

## Safety-Vertrag

- Flexible Lasten planen gegen das feste 90-Prozent-Soft-Limit.
- Der finale Safety-Envelope prüft weiterhin das 100-Prozent-Hard-Limit.
- Der signierte NVP bleibt Führungsgröße: Netzbezug positiv, Einspeisung negativ.
- Eine dynamisch strengere RLM- oder Netzbetreibergrenze wird zuerst zum wirksamen Hard-Limit; anschließend werden daraus erneut exakt 10 % Reserve und 90 % Soft-Limit berechnet.
