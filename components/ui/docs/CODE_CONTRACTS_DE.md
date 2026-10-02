# NexoWatt UI – Code-Verträge für spätere TypeScript-Typen

Diese Datei beschreibt zentrale Datenverträge. Sie soll später direkt in TypeScript-Interfaces überführt werden.

## 1. EnergyFlowSnapshot

```ts
interface EnergyFlowSnapshot {
  pvW: number;
  gridImportW: number;
  gridExportW: number;
  storageChargeW: number;
  storageDischargeW: number;
  storageSocPct: number | null;
  buildingLoadW: number;
  evcsLoadW: number;
}
```

Fachliche Regeln:

- Alle Leistungswerte in Watt.
- Import/Export positiv getrennt.
- Speicher Laden/Entladen positiv getrennt.
- `storageSocPct` kann `null` sein, wenn kein Speicher vorhanden ist.

## 2. StorageFlowResult

```ts
type StorageSource = 'split-dp' | 'signed-dp' | 'calculated' | 'missing';

interface StorageFlowResult {
  chargeW: number;
  dischargeW: number;
  signedW: number | null;
  socPct: number | null;
  source: StorageSource;
  hasConfiguredDp: boolean;
}
```

Regeln:

- Split-DP und Signed-DP sind beide gültig.
- Fallback nur, wenn kein DP konfiguriert ist.
- 0 W ist gültig.

## 3. FeatureVisibility

```ts
interface FeatureVisibility {
  hasEvcs: boolean;
  hasStorageFarm: boolean;
  hasSmartHome: boolean;
  hasWeather: boolean;
  hasAiAdvisor: boolean;
}
```

Regeln:

- Feature wird nur angezeigt, wenn echte Konfiguration vorhanden ist.
- Alte Default-States dürfen Features nicht sichtbar machen.

## 4. AiAdvisorSuggestion

```ts
type AiSeverity = 'success' | 'info' | 'warning' | 'critical';

type AiCategory =
  | 'tariff'
  | 'pv'
  | 'storage'
  | 'evcs'
  | 'peak'
  | 'weather'
  | 'heating'
  | 'plan'
  | 'strategy'
  | 'comfort'
  | 'anomaly'
  | 'forecastQuality'
  | 'system';

interface AiAdvisorSuggestion {
  id: string;
  category: AiCategory;
  severity: AiSeverity;
  priority: number;
  title: string;
  text: string;
  action: string;
  window?: string;
  impact?: string;
  confidence?: number;
}
```

Regeln:

- KI gibt nur Empfehlungen.
- Keine direkte Steuerung.
- Vorschläge ohne vorhandene Hardware vermeiden.

## 5. HeatingRodRuntime

```ts
interface HeatingRodRuntime {
  enabled: boolean;
  autoMode: boolean;
  pvBudgetW: number;
  storageReserveW: number;
  allowGrid: boolean;
  allowStorageDischarge: boolean;
  activeStep: number;
  powerW: number;
}
```

Regeln:

- `storageReserveW` darf nicht auf Default zurückspringen.
- Heizstab nutzt Core-Budget.
- Stufenlogik und DP-Zuordnung getrennt halten.

## 6. ApiStateResponse

```ts
interface ApiStateResponse {
  states: Record<string, StateCacheEntry>;
  config?: unknown;
  ts?: number;
}

interface StateCacheEntry {
  value: unknown;
  ts?: number;
  lc?: number;
  ack?: boolean;
}
```

Regeln:

- Frontend muss fehlende States robust behandeln.
- Backend darf keine State-Bedeutung ohne Dokumentation ändern.

## Ergänzung 0.7.56 – TypeScript-Verträge

Die wichtigsten Code-Verträge existieren jetzt zusätzlich als echte TypeScript-Typen unter:

```text
src-ts/contracts
```

Diese TS-Verträge sind die Vorlage für die spätere Migration der JavaScript-Resolver und EMS-Module. Besonders wichtig sind `StorageFlowResult`, `EnergyFlowSnapshot`, `FeatureVisibilityState` und `AiAdvisorSuggestion`.



## Ergänzung 0.7.58 – Build-/Testbasis

Mit 0.7.58 wurden mehrere TypeScript-Konfigurationen getrennt:

```text
tsconfig.base.json
tsconfig.json
tsconfig.build.json
tsconfig.contracts.json
```

Außerdem gibt es Compile-only-Beispiele unter `src-ts/test-fixtures/`. Diese Beispiele laden keine Adapterlogik, prüfen aber die wichtigsten Typverträge für Energiefluss, Feature-Sichtbarkeit, KI-Berater und Lizenz.
