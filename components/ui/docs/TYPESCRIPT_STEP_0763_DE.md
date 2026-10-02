# 0.7.63 – TypeScript Backend-API und StateCache-Vorbereitung

Diese Version ist der nächste kontrollierte TypeScript-Migrationsschritt. Sie verändert keine produktive Runtime-Logik.

## Warum dieser Schritt?

Nach Energiefluss, Core-Limits und Heizstab bereiten wir jetzt die Bereiche vor, die später aus `main.js` herausgelöst werden sollen:

- StateCache-Normalisierung
- `/api/set`-Schreibplanung
- Feature-Sichtbarkeit für Kundenanlagen

Diese Bereiche sind kritisch, weil sie Dashboard, History, SmartHome, KI-Berater und App-Center verbinden.

## Neue Dateien

```text
src-ts/backend/state-cache/state-cache.ts
src-ts/backend/api-state/api-set-helpers.ts
src-ts/quality/backend-api-state-cases.ts
src-ts/tests/backend-api-state-smoke.ts
src-ts/tests/backend-api-state-runtime.ts
tsconfig.backend-api-state.json
scripts/verify-ts-backend-api-state.js
```

## Ordnerstruktur

Die neuen Dateien wurden bewusst fachlich einsortiert:

```text
src-ts/backend/state-cache/
```

für StateCache-Helfer aus `main.js`.

```text
src-ts/backend/api-state/
```

für API-/State-Antworten und `/api/set`-nahe Helfer.

```text
src-ts/quality/
```

für wiederverwendbare Regressionfälle.

```text
src-ts/tests/
```

für Compile- und Runtime-Tests.

## Wichtige Regeln

- `0 W` ist gültig.
- `false` ist gültig.
- `value` hat Vorrang vor Legacy-`val`.
- `/api/set`-Keys werden normalisiert, bevor State-IDs gebaut werden.
- EVCS wird nur sichtbar, wenn ein echter Ladepunktnachweis vorhanden ist.
- Speicherfarm wird nur sichtbar, wenn echte Farmspeicher vorhanden sind.

## Keine Runtime-Änderung

Die produktiven Dateien bleiben unverändert:

```text
main.js
www/app.js
ems/modules/*
```

Diese Version bereitet nur die spätere Migration vor.
