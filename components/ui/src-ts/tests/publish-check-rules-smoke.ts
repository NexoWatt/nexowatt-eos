import {
  collectPublishRuleErrors,
  requireIoCommonBasics,
  requireNodeEngine22,
  requirePackageName,
} from '../scripts/publish-check-rules';

/**
 * Datei: src-ts/tests/publish-check-rules-smoke.ts
 *
 * Zweck:
 * Compile-only-Test für die erste echte JS→TS-Migration im Bereich
 * Wartungs-/Publish-Skripte.
 *
 * Zusammenhang:
 * `scripts/verify-publish.js` nutzt zur Laufzeit noch die JS-Spiegeldatei
 * `scripts/publish-check-rules.js`. Diese Testdatei stellt sicher, dass die
 * TypeScript-Quelle `src-ts/scripts/publish-check-rules.ts` weiter korrekt
 * typisiert ist und typische Eingaben annimmt.
 *
 * Wichtig:
 * Dieser Test führt keine ioBroker-Instanz aus. Er prüft nur, ob die Verträge und
 * Rückgabewerte der Publish-Regeln typisiert zusammenpassen. Die echte Laufzeit-
 * Prüfung bleibt `npm run publish:check`.
 */

/**
 * Code-Teil: gültiges Beispielpaket.
 * Zweck: Zeigt, welche Minimaldaten die Publish-Regeln erwarten.
 * TypeScript: Das Objekt wird bewusst ohne vollständige package.json-Typen gebaut,
 * damit die Regeln unabhängig von npm-internen Typdefinitionen bleiben.
 */
const validPackageExample = {
  name: 'iobroker.nexowatt-ui',
  version: '0.7.59',
  engines: { node: '>=22' },
};

/**
 * Code-Teil: gültiger ioBroker-common-Ausschnitt.
 * Zweck: Beschreibt die Metadaten, die für den Adapter-Checker wichtig sind.
 */
const validCommonExample = {
  name: 'nexowatt-ui',
  version: '0.7.59',
  type: 'visualization',
  connectionType: 'local',
  dataSource: 'poll',
  authors: ['NexoWatt'],
  adminUI: { config: 'json' },
  tier: 3,
  dependencies: [{ 'js-controller': '>=6.0.11' }],
  globalDependencies: [{ admin: '>=7.0.0' }],
  licenseInformation: { type: 'limited' },
  news: {},
};

/**
 * Code-Teil: Einzelregeln typisiert aufrufen.
 * Zweck: TypeScript muss erkennen, dass die Regeln ein PublishRuleResult liefern.
 */
const packageNameResult = requirePackageName(validPackageExample);
const nodeEngineResult = requireNodeEngine22(validPackageExample);
const commonResults = requireIoCommonBasics(validCommonExample);

/**
 * Code-Teil: Gesamtsammler typisiert aufrufen.
 * Zweck: Prüft, ob die JS-Publish-Prüfung später eine reine Liste deutscher
 * Fehlermeldungen verarbeiten kann.
 */
const collectedErrors = collectPublishRuleErrors(validPackageExample, { common: validCommonExample });

export const publishCheckRuleSmokeExamples = {
  packageNameResult,
  nodeEngineResult,
  commonResults,
  collectedErrors,
};
