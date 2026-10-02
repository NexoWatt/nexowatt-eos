# 0.7.56 – TypeScript-Migrationsbasis

Diese Version legt die erste technische Grundlage für die schrittweise Migration von JavaScript nach TypeScript.

## Grundregel

Ab jetzt gilt für neue fachliche Änderungen:

1. Der betroffene Codebereich wird deutsch kommentiert.
2. Der fachliche Datenvertrag wird geprüft oder ergänzt.
3. Kleine risikoarme Bereiche dürfen direkt nach TypeScript migriert werden.
4. Kritische Bereiche bekommen zuerst TypeScript-Verträge und werden später schrittweise ausgelagert.

## Warum noch kein kompletter Umbau?

Der Adapter läuft produktiv weiterhin über JavaScript-Dateien wie `main.js`, `www/app.js` und die Module unter `ems/modules`. Ein kompletter Umbau auf einmal wäre zu riskant, weil Energiefluss, History, Heizstab, KI-Berater und Lizenzlogik eng gekoppelt sind.

Die TypeScript-Migration startet deshalb mit Verträgen unter `src-ts/contracts`.

## Neue Dateien

```text
tsconfig.json
docs/development/TYPESCRIPT_README.md
src-ts/contracts/units.ts
src-ts/contracts/energy-flow.ts
src-ts/contracts/features.ts
src-ts/contracts/ai-advisor.ts
src-ts/contracts/license.ts
src-ts/contracts/datapoints.ts
src-ts/contracts/iobroker-states.ts
src-ts/contracts/index.ts
```

## Wichtigste Verträge

### EnergyFlowSnapshot

Beschreibt die gemeinsame Sicht auf PV, Netz, Speicher, Verbrauch und optionale Verbraucher.

### StorageFlowResult

Beschreibt die Speicherauflösung:

- signed DP
- getrennte Lade-/Entlade-DPs
- berechneter Fallback
- Quelle der verwendeten Daten

Kritisch: `0 W` ist ein gültiger Wert und darf nicht als fehlend interpretiert werden.

### FeatureVisibilityState

Beschreibt, wann EVCS, Speicherfarm, SmartHome, Wetter und KI-Berater im Kundenfrontend sichtbar sein dürfen.

### AiAdvisorSuggestion

Beschreibt die Struktur eines KI-Berater-Vorschlags, inklusive Kategorie, Priorität, Handlung und Zeitfenster.

### LicenseState

Beschreibt Lizenzstatus und Lizenzstufe. Maskierte Platzhalter wie `********` dürfen nie als echter Lizenzschlüssel gespeichert werden.

## Prüfung

```bash
npm run typecheck
```

Der Typecheck prüft aktuell nur `src-ts/**/*.ts`. Die bestehende JavaScript-Laufzeit wird dadurch nicht verändert.

## Nächster sinnvoller TypeScript-Schritt

Als erste echte Migration würde sich ein kleiner risikoarmer Bereich eignen:

```text
scripts/verify-publish.js → scripts/verify-publish.ts
```

Oder eine reine Hilfsdatei:

```text
src-ts/utils/number.ts
src-ts/utils/license.ts
```

Kritische Dateien wie `main.js`, `www/app.js`, `core-limits.js` und `heating-rod-control.js` werden erst später in Teilstücken migriert.
