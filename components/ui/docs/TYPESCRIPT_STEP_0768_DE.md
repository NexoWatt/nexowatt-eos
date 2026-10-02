# 0.7.68 – TypeScript Backend-Spiegel für StateCache, Feature-Sichtbarkeit und Lizenz

Diese Version erweitert die TypeScript-Migration um den ersten backendnahen CommonJS-Spiegel.

## Ziel

Bisher lagen die ersten produktionsnahen TypeScript-Dateien unter `src-ts/backend/`, wurden aber noch nicht als lauffähige JavaScript-Dateien gespiegelt.
Mit 0.7.68 gibt es jetzt die gleiche Strategie wie bei den Wartungsskripten und den Frontend-MJS-Spiegeln:

```text
TypeScript-Quelle = fachliche Wahrheit
CommonJS-Spiegel  = später von Node/main.js nutzbare Runtime-Datei
```

## Neue Spiegelstruktur

```text
src-ts/backend/state-cache/state-cache.ts
  → lib/ts-mirrors/backend/state-cache/state-cache.js

src-ts/backend/feature-visibility/feature-visibility.ts
  → lib/ts-mirrors/backend/feature-visibility/feature-visibility.js

src-ts/backend/license/license-key-safety.ts
  → lib/ts-mirrors/backend/license/license-key-safety.js
```

## Warum diese Bereiche zuerst?

Diese drei Bereiche sind wichtig, aber in 0.7.68 noch ungefährlich:

- **StateCache:** zentrale Regel, dass `0`, `false` und leere Werte nicht versehentlich verloren gehen.
- **Feature-Sichtbarkeit:** EVCS, Speicherfarm, Wetter, SmartHome und KI dürfen nur sichtbar sein, wenn die Anlage sie wirklich besitzt.
- **Lizenz-Sicherheit:** maskierte Werte wie `********` dürfen keinen echten Lizenzschlüssel überschreiben.

Alle drei Bereiche sind spätere Kandidaten für Auslagerungen aus `main.js`, werden aber in 0.7.68 noch nicht produktiv eingebunden.

## Neue Scripts

```bash
npm run sync:ts-backend-mirrors
npm run check:ts-backend-mirrors
npm run test:ts-backend-mirrors
npm run test:backend-mirrors
```

## Pflege-Regel

Wenn eine backendnahe TypeScript-Quelle geändert wird:

```bash
npm run sync:ts-backend-mirrors
npm run test:backend-mirrors
```

Danach müssen TypeScript-Quelle und JS-Spiegel gemeinsam committed werden.

## Wichtig

Es gibt keine produktive Runtime-Änderung:

```text
main.js lädt die neuen Spiegel noch nicht.
Energiefluss, Speicher, Heizstab, KI, History, SmartHome und Lizenz-Runtime bleiben unverändert.
```

0.7.68 ist nur die sichere Build-/Spiegelbasis für spätere Backend-Migrationen.
