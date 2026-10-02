import type {
  AiAdvisorSuggestion,
  DatapointReadResult,
  EnergyFlowSnapshot,
  FeatureVisibilityState,
  LicenseValidationResult,
  StorageFlowResult,
} from '../contracts';

/**
 * Datei: src-ts/tests/contracts-smoke.ts
 *
 * Zweck:
 * Compile-only Smoke-Test der TypeScript-Verträge.
 *
 * Zusammenhang:
 * Diese Datei wird vom Adapter nicht geladen. Sie erzeugt nur Beispielobjekte
 * gegen die Verträge aus `src-ts/contracts/*`, damit Änderungen an Verträgen
 * früh durch `npm run typecheck` auffallen.
 */
const storageExample: StorageFlowResult = {
  chargeW: 0,
  dischargeW: 0,
  signedW: 0,
  socPct: 44,
  source: 'split-dp',
  signedConvention: 'positive-discharge',
  hasConfiguredStorageDp: true,
  diagnosticText: 'Getrennte Lade-/Entlade-DPs sind Quelle der Wahrheit; 0 W ist gültig.',
};

const flowExample: EnergyFlowSnapshot = {
  ts: Date.now(),
  pvW: 2800,
  buildingLoadW: 400,
  storage: storageExample,
  grid: {
    importW: 0,
    exportW: 2400,
    signedW: -2400,
    source: 'split-dp',
  },
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
  residualLoadW: 0,
};

const featureExample: FeatureVisibilityState = {
  hasEvcs: false,
  hasStorageFarm: false,
  hasSmartHome: true,
  hasWeather: true,
  hasAiAdvisor: true,
};

const suggestionExample: AiAdvisorSuggestion = {
  id: 'daily-plan-example',
  category: 'dailyPlan',
  severity: 'info',
  priority: 50,
  title: 'Tagesfahrplan prüfen',
  text: 'Beispielvorschlag für den Typvertrag.',
  action: 'Keine Aktion; dieser Eintrag ist nur ein Typ-Smoketest.',
  window: 'test',
  confidence: 100,
};

const licenseExample: LicenseValidationResult = {
  ok: true,
  status: 'valid',
  tier: 'home',
  reason: 'Example license result for TypeScript contract smoke test.',
};

const readExample: DatapointReadResult<number> = {
  id: 'example.0.storage.chargeW',
  key: 'storageChargePower',
  value: 0,
  source: 'ioBroker',
  ts: Date.now(),
  lc: Date.now(),
  quality: 0,
};

export const contractSmokeExamples = {
  flowExample,
  featureExample,
  suggestionExample,
  licenseExample,
  readExample,
};
