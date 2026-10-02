# RC55 – Auto-Arbitrierung für EOS Betriebsstrategien

Version: 0.8.179 / RC55

## Ziel

Die Betriebsstrategien dürfen vorhandene Ladepunkt-Modi nicht überschreiben. Eine Strategie kann nur innerhalb des Modus **Auto** und nur nach ausdrücklicher Auswahl **Auto-Quelle: Betriebsstrategie** einen zeitlich begrenzten Planungswunsch an das bestehende Lademanagement übergeben.

## Sicherheitsvertrag

1. App installiert/aktiviert allein übernimmt kein Gerät.
2. Standardwert aller vorhandenen und neuen Ladepunkte bleibt `Auto-Quelle = Standard`.
3. Teilnahme wird pro Ressource ausdrücklich aktiviert.
4. `shadow` und `commissioning` berechnen und protokollieren, übergeben aber keinen produktiven Sollwert.
5. `active` benötigt eine separate Inbetriebnahmebestätigung.
6. Jeder Strategiewunsch besitzt eine TTL. Abgelaufene Anforderungen werden verworfen.
7. Bei Fehler, veralteter Telemetrie oder fehlendem Wunsch erfolgt der Rückfall auf Standard-Auto (oder explizit auf Pause).
8. Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel entziehen der Strategie sofort die Zuständigkeit.
9. Die Strategie schreibt niemals direkt auf OCPP-, Modbus- oder Geräte-Datenpunkte.
10. Gerätesicherheit, Netzbetreiber, §14a, Parkregler, Sicherungen, Stations- und Phasengrenzen bleiben übergeordnet.

## Übergabekette

```text
Betriebsstrategie (Ziel / min / target / max / TTL)
                    ↓
Auto-Arbitrierung (Berechtigung + MUSS/SOLL/KANN)
                    ↓
vorhandenes Lademanagement (elektrische Verteilung)
                    ↓
Safety / §14a / Parkregler / Stationsgrenzen
                    ↓
einziger vorhandener Geräte-Writer
```

## Inbetriebnahmestufen

- **Shadow:** Vergleich der Strategie mit der bisherigen Auto-Ausgabe; keine Übergabe.
- **Commissioning:** Testwerte, Rückmeldungen und Grenzfälle werden geprüft; keine dauerhafte Übergabe.
- **Active:** Nur nach bestätigter Ressourcenzuordnung und Freigabe; weiterhin kein direkter Hardware-Writer in der Strategie.

## Abnahmekriterien vor erster produktiver Freigabe

- Moduswechsel Auto ↔ Boost/Manuell/PV ohne konkurrierende Writer
- TTL- und Watchdog-Rückfall
- veraltete OCPP-Telemetrie
- Kommunikationsabbruch
- §14a und Stationslimit gleichzeitig aktiv
- Mehrfachladepunkte an einer Station
- Adapter-Neustart während aktiver Strategie
- Rückkehr auf Standard-Auto ohne 0-W-Zwischenimpuls
- Sollwert und Rückmeldung plausibilisiert
