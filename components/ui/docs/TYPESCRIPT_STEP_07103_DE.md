# 0.7.103 – Energiefluss-TS als feste Quelle vorbereiten

## Ziel

Der Energiefluss nutzt bereits den TypeScript-Kandidatenmodus, wenn alle Gates sauber sind. Diese Version reduziert den alten JS-Fallback weiter, indem echte TS-Ticks gezählt werden.

## Neu

- `derived.core.building.tsFixedSourceJson`
- `control.energyFlowTsFixedSourceState`
- App-Center zeigt „Feste TS-Quelle“ und „TS-Fixed Ticks“

## Sicherheitsregel

Der JS-Fallback wird nicht entfernt. Harte Blocker wie Shadow-Mismatch, fehlender TS-Spiegel oder ungültige Kandidatenwerte schalten weiterhin auf JS zurück.

## Nächster Schritt

Wenn `energyFlowSource = ts-candidate` stabil läuft und `tsFixedSourceJson.ready = true` wird, kann der alte Energiefluss-JS-Pfad weiter reduziert werden.
