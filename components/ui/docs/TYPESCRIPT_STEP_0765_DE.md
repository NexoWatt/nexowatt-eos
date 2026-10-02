# TypeScript-Schritt 0.7.65 – Frontend-Helfer und Feature-Sichtbarkeit

## Ziel

Dieser Schritt bereitet kleine, DOM-unabhängige Frontend-Helfer in TypeScript vor.
Es werden noch keine produktiven Browserdateien ersetzt.

## Neue Dateien

```text
src-ts/frontend/display-format.ts
src-ts/frontend/customer-feature-visibility.ts
src-ts/quality/frontend-display-cases.ts
src-ts/tests/frontend-display-runtime.ts
scripts/verify-ts-frontend-display.js
tsconfig.frontend-display.json
```

## Warum diese Dateien in `src-ts/frontend/` liegen

Die neuen Helfer gehören fachlich zum Kunden-Frontend. Sie enthalten keine ioBroker-
Adapterlogik, keine EMS-Regelung und keine DOM-Abhängigkeit. Später können Teile aus
`www/app.js`, `www/history.js` und `www/cockpit-shell.js` kontrolliert hierher migriert
werden.

## Kritische Regeln

- `0 W` bleibt ein gültiger Anzeigewert.
- EVCS wird nur sichtbar, wenn ein echter Ladepunkt mit realem Datenpunkt vorhanden ist.
- Speicherfarm wird nur sichtbar, wenn das Feature aktiv ist und echte Speicher vorhanden sind.
- KI-Berater benötigt Installer-Aktivierung und darf vom Kunden ausgeschaltet werden.

## Runtime-Auswirkung

Keine. Die produktiven JavaScript-Dateien importieren diese TypeScript-Dateien in 0.7.65
noch nicht.
