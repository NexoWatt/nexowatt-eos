# NexoWatt UI – TypeScript-Migrationsplan

Ziel: Der Adapter soll schrittweise von JavaScript auf TypeScript umgestellt werden, ohne Funktionalität zu verlieren.

## 1. Grundregel

Keine komplette Umstellung auf einmal.

Stattdessen:

```text
Änderung an einem Bereich
  -> Kommentare prüfen/ergänzen
  -> Datenvertrag definieren
  -> Typen ergänzen
  -> kleinen Bereich nach TypeScript migrieren
  -> Tests ausführen
```

## 2. Reihenfolge

### Phase 1: Typen neben JavaScript vorbereiten

- JSDoc `@typedef` für kritische Datenstrukturen.
- Dokumente in `docs/*` als fachliche Vorlage nutzen.
- Keine Buildsystem-Änderung, wenn nicht nötig.

### Phase 2: Hilfsdateien migrieren

Geeignete Kandidaten:

```text
ems/datapoints.js
ems/reasons.js
ems/module-manager.js
scripts/verify-publish.js
```

Warum:

- relativ klar begrenzt.
- wenig DOM-Abhängigkeit.
- gute Testbarkeit.

### Phase 3: EMS-Module migrieren

Reihenfolge:

```text
base.js
core-limits.js
heating-rod-control.js
peak-shaving.js
ai-advisor.js
charging-management.js
```

Wichtig:

- zuerst Typen für Config, StateCache, Snapshot und Ergebnisobjekte.
- immer Split-/Signed-DP-Tests ausführen.

### Phase 4: Frontend migrieren

Reihenfolge:

```text
www/report-common.js
www/history.js
www/storagefarm.js
www/evcs.js
www/app.js
www/ems-apps.js
www/smarthome.js
```

Frontend ist schwieriger, weil viele DOM-IDs und optionale Elemente beteiligt sind.

### Phase 5: React/Admin

`src-admin-tab/src/*` ist langfristig der natürliche TypeScript-/TSX-Bereich.

Build-Bundles in `admin/react/assets/*` nicht manuell ändern.

## 3. Wichtige Typen

Später brauchen wir mindestens:

```ts
interface AdapterConfig {}
interface DatapointMapping {}
interface StateCacheEntry {}
interface EnergyFlowSnapshot {}
interface StorageFlowResult {}
interface GridFlowResult {}
interface HeatingRodConfig {}
interface AiAdvisorSuggestion {}
interface FeatureVisibility {}
```

## 4. Testpflicht pro Migration

Jede TypeScript-Migration muss mindestens prüfen:

```text
node/build check
npm pack --dry-run
Adapter Start/Stop
info.connection
relevante Regression
```

Für Energiefluss zusätzlich:

```text
Speicher Split-DP
Speicher Signed-DP
Speicher 0 W
kein Speicher-DP mit Fallback
History bleibt korrekt
```

## 5. Kommentarregel während Migration

Beim Migrieren bleiben deutsche Kommentare erhalten. Wenn Typen klar genug sind, dürfen überflüssige technische Kommentare reduziert werden.

Nicht entfernen:

- fachliche Regeln.
- Datenfluss-Hinweise.
- „Nicht kaputt machen“-Hinweise.

## Ergänzung 0.7.56 – erster TypeScript-Scaffold

Mit Version 0.7.56 wurde der erste echte TypeScript-Migrationsbereich angelegt.

```text
tsconfig.json
src-ts/contracts/*.ts
```

Diese Dateien enthalten noch keine produktive Runtime-Logik. Sie definieren zuerst fachliche Verträge für Energiefluss, Speicher, Feature-Sichtbarkeit, KI-Berater, Lizenz und Datenpunkte.

Regel für kommende Änderungen: Wenn ein Codebereich fachlich angefasst wird, bekommt er entweder direkt TypeScript oder mindestens einen passenden TypeScript-Vertrag.



## Ergänzung 0.7.58 – Build-/Testbasis

Mit 0.7.58 wurden mehrere TypeScript-Konfigurationen getrennt:

```text
tsconfig.base.json
tsconfig.json
tsconfig.build.json
tsconfig.contracts.json
```

Außerdem gibt es Compile-only-Beispiele unter `src-ts/test-fixtures/`. Diese Beispiele laden keine Adapterlogik, prüfen aber die wichtigsten Typverträge für Energiefluss, Feature-Sichtbarkeit, KI-Berater und Lizenz.


## Ergänzung 0.7.60

Siehe `docs/TYPESCRIPT_STEP_0760_DE.md` für die ersten reinen TypeScript-Energiefluss-Helfer.


## 0.7.60 - Energiefluss-Helfer als TypeScript

In 0.7.60 wurden erste reine TypeScript-Helfer für Speicher- und Netzfluss ergänzt. Diese Helfer sind noch nicht produktiv verdrahtet, dokumentieren aber bereits die spätere Logik für signed DPs, Split-DPs und Bilanzfallbacks.
