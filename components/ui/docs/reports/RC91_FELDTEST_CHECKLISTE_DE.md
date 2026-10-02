# RC91 – Feldtest-Checkliste

## AppCenter und Apps

- Einen unveränderten AppCenter-Reiter speichern und danach die Aktivzustände aller Apps kontrollieren.
- Energy Ledger aktivieren, einen anderen Reiter speichern und anschließend neu laden.
- Mesh/Microgrid aktivieren, einen anderen Reiter speichern und anschließend neu laden.
- DC-Stationsdisplay unter Ladepunkte prüfen; es darf keine zweite Apps-Karte erscheinen und sein Zustand muss erhalten bleiben.
- Adapter neu starten und dieselben Aktivzustände erneut kontrollieren.
- Konfiguration sichern und testweise wieder einlesen; App-Zustände und verschachtelte Konfigurationen müssen erhalten bleiben.

## Laufzeit

- LIVE-Dashboard geöffnet lassen; keine wiederkehrende `resync-error`-Verbindungsschleife.
- `writeErrors` im SSE-Diagnoseblock soll im Normalbetrieb nicht fortlaufend steigen.
- Heap muss nach Start- und Snapshot-Schwankungen ein Plateau erreichen.
- EMS-Regeltick und Admin-Overview-Heartbeat müssen aktuell bleiben.

## Regelung

- NVP unter Softlimit: grüne Überwachung, keine fälschliche Begrenzung.
- Softlimit: weiche Reduktion; Hardlimit: sofortige Safety-Reaktion.
- Einen Ladepunkt offline nehmen: andere Ladepunkte arbeiten mit sicherem Restbudget weiter.
- Speicher, Tarif, PV-Prognose und §14a auf unverändertes Verhalten prüfen.

## Freigabe

Stable erst nach 24 bis 48 Stunden unverändertem Betrieb auf mindestens zwei Anlagen und ohne neue Fehler-, Heap- oder App-Zustandsdrift.
