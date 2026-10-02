#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/build-ts-ems-mirrors.js
 *
 * Zweck:
 * Baut erste EMS-nahe TypeScript-Dateien als CommonJS-Spiegel unter `lib/ts-mirrors/ems/**`.
 *
 * Zusammenhang:
 * Diese Spiegel sind die Brücke zwischen der neuen TypeScript-Quelle und der späteren
 * produktiven Node.js-Runtime. In 0.7.76 werden Core-Limits und Heizstab damit nur
 * importierbar/testbar gemacht; die produktive Runtime bleibt weiterhin JavaScript.
 *
 * Pflege-Regel:
 * Änderungen immer zuerst unter `src-ts/ems/**` oder `src-ts/utils/**` vornehmen und
 * danach `npm run sync:ts-ems-mirrors` ausführen.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const tsConfig = path.join(root, 'tsconfig.ems-mirrors.json');
const localTsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/utils/number.ts',
    builtRel: 'build-ts/ems-mirrors/utils/number.js',
    mirrorRel: 'lib/ts-mirrors/utils/number.js',
    purpose: 'Gemeinsame Zahlenhelfer für EMS-Spiegel',
  },
  {
    sourceRel: 'src-ts/ems/core-limits/core-budget.ts',
    builtRel: 'build-ts/ems-mirrors/ems/core-limits/core-budget.js',
    mirrorRel: 'lib/ts-mirrors/ems/core-limits/core-budget.js',
    purpose: 'Core-Limits-/EMS-Budget-Spiegel für spätere Shadow-Vergleiche',
  },
  {
    sourceRel: 'src-ts/ems/core-limits/core-runtime.ts',
    builtRel: 'build-ts/ems-mirrors/ems/core-limits/core-runtime.js',
    mirrorRel: 'lib/ts-mirrors/ems/core-limits/core-runtime.js',
    purpose: 'Typisierte produktive Core-Runtime für PV, Grants, Headroom und Budget-Snapshots',
  },
  {
    sourceRel: 'src-ts/ems/heating-rod/heating-rod-decision.ts',
    builtRel: 'build-ts/ems-mirrors/ems/heating-rod/heating-rod-decision.js',
    mirrorRel: 'lib/ts-mirrors/ems/heating-rod/heating-rod-decision.js',
    purpose: 'Heizstab-Entscheidungsspiegel für spätere Shadow-Vergleiche',
  },
  {
    sourceRel: 'src-ts/ems/ai-advisor/ai-advisor-payload.ts',
    builtRel: 'build-ts/ems-mirrors/ems/ai-advisor/ai-advisor-payload.js',
    mirrorRel: 'lib/ts-mirrors/ems/ai-advisor/ai-advisor-payload.js',
    purpose: 'KI-Berater-Publish-Payload für produktive, sichere Vorschlagsnormalisierung',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-control.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-control.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-control.js',
    purpose: 'EVCS-/Charging-Management-Control-Shadow für die spätere TypeScript-Übernahme',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-allocation.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-allocation.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-allocation.js',
    purpose: 'EVCS-/Wallbox-Allocation-Shadow und Produktiv-Vorbereitung',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-phase-selection.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-phase-selection.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-phase-selection.js',
    purpose: 'EVCS-AC-Phasenwahl 1p/3p für PV-Überschussladen mit Hysterese und Cooldown',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-write-plan.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-write-plan.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-write-plan.js',
    purpose: 'EVCS-Setpoint-Write-Plan-Shadow ohne produktive ioBroker-Schreiboperationen',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-normal-source.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-normal-source.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-normal-source.js',
    purpose: 'EVCS-TypeScript-Normalquelle-Lockdown mit JavaScript nur als Executor und hartem Fallback',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-management-runtime.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-management-runtime.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-management-runtime.js',
    purpose: 'EVCS-/Charging-Management-TS-Vorbereitung für Sichtbarkeit, Budgetreservierung und Shadow-Vergleich',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-management.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-management.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-management.js',
    purpose: 'EVCS-/Charging-Management-TS-Vorbereitung für Ladepunkte, Sichtbarkeit und Budgetreservierung',
  },
  {
    sourceRel: 'src-ts/ems/charging-management/charging-budget.ts',
    builtRel: 'build-ts/ems-mirrors/ems/charging-management/charging-budget.js',
    mirrorRel: 'lib/ts-mirrors/ems/charging-management/charging-budget.js',
    purpose: 'Charging-Management-/EVCS-Budget-Caps für Shadow-Vergleich und spätere produktive TS-Übernahme',
  },
  {
    sourceRel: 'src-ts/ems/para14a/para14a-constraint.ts',
    builtRel: 'build-ts/ems-mirrors/ems/para14a/para14a-constraint.js',
    mirrorRel: 'lib/ts-mirrors/ems/para14a/para14a-constraint.js',
    purpose: '§14a-Signalfrische und zentrale Constraint-Verteilung ohne direkte Hardware-Writes',
  },
];

/**
 * Code-Teil: fail
 * Zweck: Bricht Build oder Check mit eindeutiger Fehlermeldung ab.
 */
function fail(message, code = 1) {
  console.error(`[build-ts-ems-mirrors] ERROR: ${message}`);
  process.exit(code);
}

/**
 * Code-Teil: normalizeNewlines
 * Zweck: Macht Dateivergleiche unter Windows/Linux stabil.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: resolveTscCommand
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler aus `node_modules`. Falls der lokale
 * Compiler fehlt, wird ein globales `tsc` verwendet. `publish:check` ruft dieses Skript
 * nur im Check-Modus auf und bleibt damit für schnelle Git-Prüfungen handhabbar.
 */
function resolveTscCommand() {
  if (fs.existsSync(localTsc)) return { command: process.execPath, argsPrefix: [localTsc] };
  return { command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc', argsPrefix: [] };
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest Pflichtdateien und bricht bei fehlenden Dateien sofort ab.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return normalizeNewlines(fs.readFileSync(file, 'utf8'));
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet den Hash der TypeScript-Quelle. Der Hash steht im JS-Spiegel und verhindert,
 * dass TypeScript-Quelle und Runtime-Spiegel unbemerkt auseinanderlaufen.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: runTypescriptCompiler
 *
 * Zweck:
 * Kompiliert nur die EMS-Spiegelquellen. Produktive Dateien wie `main.js`,
 * `ems/modules/core-limits.js` oder `heating-rod-control.js` werden nicht überschrieben.
 */
function runTypescriptCompiler() {
  if (!fs.existsSync(tsConfig)) fail(`tsconfig fehlt: ${path.relative(root, tsConfig)}`);
  const tsc = resolveTscCommand();
  const result = spawnSync(tsc.command, [...tsc.argsPrefix, '-p', tsConfig], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    fail('TypeScript-Build für EMS-Spiegel fehlgeschlagen. Falls tsc fehlt: npm install oder npm ci ausführen.', result.status || 1);
  }
}

/**
 * Code-Teil: generatedHeader
 *
 * Zweck:
 * Erzeugt den Kopf der Spiegeldatei. Der Hinweis verhindert, dass jemand versehentlich
 * die generierte JS-Datei statt der TypeScript-Quelle bearbeitet.
 */
function generatedHeader(spec) {
  return [
    "'use strict';",
    '',
    '/**',
    ' * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.',
    ' *',
    ` * Quelle: ${spec.sourceRel}`,
    ` * Quell-Hash: sha256:${sourceHash(spec.sourceRel)}`,
    ' * Erzeugung: npm run sync:ts-ems-mirrors',
    ' *',
    ' * Zweck:',
    ` * ${spec.purpose}.`,
    ' *',
    ' * Zusammenhang:',
    ' * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-',
    ' * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.',
    ' *',
    ' * Pflege-Regel:',
    ' * 1. Änderung zuerst in src-ts/ vornehmen.',
    ' * 2. npm run sync:ts-ems-mirrors ausführen.',
    ' * 3. npm run test:ems-mirrors prüfen.',
    ' */',
    '',
  ].join('\n');
}

/**
 * Code-Teil: normalizeBuiltOutput
 * Zweck: Entfernt doppelte Strict-Header und setzt den erklärenden Generator-Kopf davor.
 */
function normalizeBuiltOutput(spec) {
  let text = readRequired(spec.builtRel);
  text = text.replace(/^"use strict";\s*/g, '').replace(/^'use strict';\s*/g, '');
  return generatedHeader(spec) + text.replace(/\s+$/g, '') + '\n';
}

/**
 * Code-Teil: buildAllMirrorTexts
 * Zweck: Führt den TypeScript-Build aus und erzeugt die erwarteten JS-Spiegeltexte.
 */
function buildAllMirrorTexts() {
  runTypescriptCompiler();
  return mirrorSpecs.map((spec) => ({ spec, text: normalizeBuiltOutput(spec) }));
}

/**
 * Code-Teil: checkMirrorIsCurrent
 * Zweck: Prüft, ob der eingecheckte Spiegel exakt zum aktuellen TS-Build passt.
 */
function checkMirrorIsCurrent(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  const current = fs.existsSync(mirrorPath) ? normalizeNewlines(fs.readFileSync(mirrorPath, 'utf8')) : '';
  if (current !== nextText) {
    fail(`${spec.mirrorRel} ist nicht synchron. Bitte npm run sync:ts-ems-mirrors ausführen und committen.`);
  }
}

/**
 * Code-Teil: writeRuntimeMirror
 * Zweck: Schreibt die generierte JS-Spiegeldatei in den eingecheckten Mirror-Bereich.
 */
function writeRuntimeMirror(spec, nextText) {
  const mirrorPath = path.join(root, spec.mirrorRel);
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, nextText, 'utf8');
  console.log(`[build-ts-ems-mirrors] wrote ${spec.mirrorRel}`);
}

const mirrors = buildAllMirrorTexts();
if (checkOnly) {
  for (const { spec, text } of mirrors) checkMirrorIsCurrent(spec, text);
  console.log('[build-ts-ems-mirrors] OK: EMS-CJS-Spiegel sind synchron.');
} else {
  for (const { spec, text } of mirrors) writeRuntimeMirror(spec, text);
}
