# 0.7.84 - Shadow-Diagnose auf echter Anlage auswerten

Diese Version bewertet Shadow-Diagnosen auf echten Anlagen verständlicher.

## Ziel

Der Installer soll im App-Center sehen, ob reale Shadow-Samples stabil genug sind, damit wir mit der TypeScript-Migration weitergehen können.

## Neue Diagnose

- `control.tsShadowPlantEvaluation` sammelt Rolling-Samples.
- `control.tsShadowRealPlantEvaluation` liefert eine Sofortauswertung.
- App-Center-Karte „Reale Anlagen-Auswertung“.

## Wichtig

Die produktive Runtime bleibt JavaScript. Diese Version schaltet keine Energiefluss-, Budget- oder Heizstabwerte auf TypeScript um.

## Nächster Schritt

Wenn die reale Anlagen-Auswertung über mehrere Samples stabil ist, kann im nächsten Schritt die Energiefluss-TS-Kandidatenphase gezielter getestet werden.
