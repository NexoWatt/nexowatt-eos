# TypeScript Release-Plan ab 0.7.58

## Grundregel

Jede neue fachliche Änderung bekommt ab jetzt entweder eine direkte TypeScript-Migration des betroffenen, risikoarmen Bereichs oder mindestens einen passenden Typvertrag.

## Geplante Reihenfolge

1. Kleine Hilfsdateien und Skripte.
2. Reine, nebenwirkungsfreie Resolver-Helfer.
3. Speicher-/Energiefluss-Resolver mit Regressionstests.
4. Core-Limits und Heizstab-Budgetlogik.
5. API-/State-Helfer aus `main.js`.
6. Frontend-Helfer.
7. KI, History und SmartHome in getrennten Schritten.

## Nicht als Big-Bang

`main.js`, `www/app.js`, `ems/modules/core-limits.js` und `ems/modules/heating-rod-control.js` werden nicht komplett in einem Schritt umbenannt. Sie werden stückweise vorbereitet und migriert.
