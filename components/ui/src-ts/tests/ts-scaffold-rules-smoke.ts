import {
  collectTsScaffoldRuleErrors,
  requireBuildConfigDeclarationsOnly,
  requireMinimumSrcTsFiles,
  requirePackageScripts,
  requirePublishCheckStartsWithTypeSafety,
  requireTsconfigIncludesSrcTs,
} from '../scripts/ts-scaffold-rules';

/**
 * Datei: src-ts/tests/ts-scaffold-rules-smoke.ts
 *
 * Zweck:
 * Kleiner TypeScript-Smoke-Test für die neuen Scaffold-Regeln. Der Test erzeugt
 * bewusst einfache Beispielobjekte und prüft, ob die typisierten Funktionen ohne
 * Laufzeitabhängigkeiten nutzbar sind.
 *
 * Zusammenhang:
 * Dieser Test gehört zum schrittweisen JS→TS-Umbau der Wartungsskripte. Er prüft
 * keine produktive EMS-Logik, sondern nur die Qualitätssicherungsregeln für die
 * TypeScript-Migrationsbasis.
 */

/** Beispiel für ein gültiges Skript-Set aus `package.json`. */
const validPackageScripts = {
  scripts: {
    typecheck: 'tsc -p tsconfig.json --noEmit',
    'test:types': 'npm run verify:ts-scaffold && npm run typecheck',
    'build:types': 'tsc -p tsconfig.build.json',
    'test:contracts': 'node scripts/verify-ts-contracts.js',
    'test:ts-scaffold': 'node scripts/verify-ts-scaffold.js',
    'test:all': 'npm run publish:check && npm run test:types',
    'publish:check': 'node scripts/verify-release-artifact.js',
    'test:release:full': 'node scripts/publish-check-runner.js',
    'test:publish-check-runner': 'node scripts/publish-check-runner.js --verify',
  },
};

/** Beispiel für ein gültiges Haupt-tsconfig. */
const validTsconfig = {
  include: ['src-ts/**/*.ts'],
};

/** Beispiel für einen reinen Deklarations-Build. */
const validBuildConfig = {
  compilerOptions: {
    declaration: true,
    emitDeclarationOnly: true,
  },
};

/**
 * Code-Teil: Typisierte Einzelregeln aufrufen.
 * Zweck: Sichert, dass die Funktionen mit kleinen Testobjekten typechecken.
 */
requirePackageScripts(validPackageScripts);
requirePublishCheckStartsWithTypeSafety('.', validPackageScripts);
requireTsconfigIncludesSrcTs(validTsconfig);
requireBuildConfigDeclarationsOnly(validBuildConfig);
requireMinimumSrcTsFiles(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts']);

/**
 * Code-Teil: Gesamtregelblock mit aktuellem Projektwurzelordner ausführen.
 * Zweck: Stellt sicher, dass der Sammler typisiert aufrufbar ist.
 */
const currentProjectResult = collectTsScaffoldRuleErrors('.', validPackageScripts, validTsconfig, validBuildConfig);

/**
 * Wichtig:
 * Wir werfen hier keinen Fehler auf Basis des echten Dateisystems. Dieser Smoke-
 * Test soll den TypeScript-Vertrag prüfen; die echte Dateistruktur prüft das
 * Node-Skript `scripts/verify-ts-scaffold.js`.
 */
const _typedErrorList: string[] = currentProjectResult.errors;
void _typedErrorList;
