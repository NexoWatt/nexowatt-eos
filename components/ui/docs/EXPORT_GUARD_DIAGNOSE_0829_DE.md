# NexoWatt UI 0.8.29 – Export Guard Diagnose

Diese Version erweitert die Einspeisebegrenzung um sichtbare Diagnose- und Wertdaten.

## Ziel

Der Installateur gibt weiterhin frei, ob eine Einspeisebegrenzung aktiv ist und welche maximale Einspeiseleistung erlaubt ist. Die neue Diagnose zeigt zusätzlich:

- aktuelle Einspeisung gegen erlaubtes Limit,
- verbleibende Einspeiseleistung,
- Einspeisung oberhalb des Limits,
- geschätzte Abregelungsleistung,
- fehlende WR-/PV-Write-Datenpunkte,
- negative-Preis-Strategie,
- vorbereitete Wallet-Werte für abgeregelte kWh und nicht genutzten PV-Wert.

## Wichtig

Die Regelung bleibt die vorhandene Grid-Constraints-/PV-Curtail-Logik. Es wurde kein zweiter Regler gebaut. Die neuen Werte sind Diagnose-, Anzeige- und Wallet-Brückenwerte.
