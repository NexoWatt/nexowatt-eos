# Testbericht – NexoWatt UI 0.8.158 RC34

## Ziel

FENECON-Hybridfehler beheben, bei dem interne DC-PV-Beladung aus der physischen ESS-Leistung als externe Stellwirkung interpretiert wurde und trotz Netzbezug ein negativer Lade-Sollwert stehen blieb.

## Korrektur

- direkte NVP-Regelbasis: SetActivePowerEquals-/706-Readback;
- Fallback: direkter Signed-/Split-Sollwert;
- weiterer Fallback: letzter bestätigter Hardwarebefehl;
- Kaltstart: sicherer 0-W-Anker;
- physische ESS-Leistung bleibt für Schutz und Diagnose erhalten.

## Abgesicherter Feldfall

- Netzbezug: +600 W
- Zielnetzbezug: +50 W
- aktive Vorgabe: -50 W
- erwartete neue Vorgabe: +500 W Entladung

## Bestandsschutz

Ausgangspunkt ist ausschließlich NexoWatt UI 0.8.157 RC33. Die EVCS-Multi-Bindings, Alias-Subscriptions, 3-Sekunden-Spiegelreparatur, §14a-Härtung und EEBUS-Direktanbindung bleiben enthalten.
