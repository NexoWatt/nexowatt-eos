#!/usr/bin/env node
'use strict';

/**
 * Plattformunabhängiger Runner für das vollständige NexoWatt-Publish-Gate.
 *
 * Hintergrund:
 * Windows cmd.exe akzeptiert nur eine begrenzte Befehlszeilenlänge. Der frühere
 * package.json-Eintrag enthielt 202 mit `&&` verkettete Prüfungen und war länger
 * als diese Grenze. Dieser Runner liest dieselbe geordnete Prüfliste aus JSON
 * und startet jeden Schritt einzeln, ohne die gesamte Kette an eine Shell zu
 * übergeben. Die Reihenfolge und das fail-closed Verhalten bleiben erhalten.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLAN_FILE = path.join(ROOT, 'scripts', 'publish-check-plan.json');
const PACKAGE_FILE = path.join(ROOT, 'package.json');
const EXPECTED_PACKAGE_COMMAND = 'node scripts/verify-release-artifact.js';
const EXPECTED_FULL_CHECK_COMMAND = 'node scripts/publish-check-runner.js';
const ACTIVE_ENV = 'NEXOWATT_PUBLISH_CHECK_ACTIVE';

const REQUIRED_COMMANDS = [
  'node scripts/ensure-publish-dev-deps.js',
  'npm run typecheck',
  'npm run test:safety-envelope-final-write',
  'npm run test:safety-active-load-stop',
  'npm run test:safety-module-deactivate',
  'npm run test:para14a-central-constraint',
  'npm run test:para14a-eebus-direct-api',
  'npm run test:rc68-para14a-communication-fallback',
  'npm run test:dashboard-lp-status-typing',
  'npm run test:rc69-dashboard-lp-feedback',
  'npm run test:rc72-weather-pv-forecast-auto',
  'npm run test:rc75-pv-forecast-admin-location',
  'npm run test:rc76-pv-forecast-runtime-hardening',
  'npm run test:rc77-pv-forecast-state-cache-bridge',
  'npm run test:rc78-import-only-grid-budget',
  'npm run test:rc79-import-soft-hard-zero-export',
  'npm run test:charging-infrastructure-budget',
  'npm run test:npm-version-free-guard',
  'npm run test:npm-version-free-runtime',
  'node scripts/verify-publish.js',
];

function fail(message) {
  throw new Error(`[publish-check-runner] ${message}`);
}

function readJson(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`${label} konnte nicht gelesen werden: ${error && error.message ? error.message : error}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} ist kein gültiges JSON: ${error && error.message ? error.message : error}`);
  }
}

function normalizeRelativeNodeScript(value) {
  const rel = String(value || '').replace(/\\/g, '/');
  if (!rel || path.posix.isAbsolute(rel) || rel.split('/').includes('..')) {
    fail(`Ungültiger Node-Skriptpfad im Publish-Plan: ${value}`);
  }
  const absolute = path.resolve(ROOT, rel);
  const relativeBack = path.relative(ROOT, absolute);
  if (!relativeBack || relativeBack.startsWith('..') || path.isAbsolute(relativeBack)) {
    fail(`Node-Skript liegt außerhalb des Projekts: ${value}`);
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    fail(`Node-Skript aus Publish-Plan fehlt: ${rel}`);
  }
  return { kind: 'node', display: `node ${rel}`, scriptPath: absolute, rel };
}

function parseCommand(command, pkgScripts) {
  const normalized = String(command || '').trim().replace(/\s+/g, ' ');
  if (!normalized) fail('Leerer Befehl im Publish-Plan.');

  const nodeMatch = normalized.match(/^node ([A-Za-z0-9_.\/-]+\.js)$/);
  if (nodeMatch) return normalizeRelativeNodeScript(nodeMatch[1]);

  const npmMatch = normalized.match(/^npm run ([A-Za-z0-9_.:-]+)$/);
  if (npmMatch) {
    const scriptName = npmMatch[1];
    if (scriptName === 'publish:check' || scriptName === 'prepublishOnly') {
      fail(`Rekursiver npm-Befehl ist im Publish-Plan verboten: ${normalized}`);
    }
    if (!Object.prototype.hasOwnProperty.call(pkgScripts, scriptName)) {
      fail(`npm-Skript aus Publish-Plan fehlt in package.json: ${scriptName}`);
    }
    return { kind: 'npm', display: normalized, scriptName };
  }

  fail(`Nicht erlaubtes Befehlsformat im Publish-Plan: ${normalized}`);
}

function loadAndValidatePlan() {
  const pkg = readJson(PACKAGE_FILE, 'package.json');
  const scripts = pkg && pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
  const publishCommand = String(scripts['publish:check'] || '').trim();
  const fullCheckCommand = String(scripts['test:release:full'] || '').trim();
  if (publishCommand !== EXPECTED_PACKAGE_COMMAND) {
    fail(`package.json scripts.publish:check muss exakt "${EXPECTED_PACKAGE_COMMAND}" sein.`);
  }
  if (fullCheckCommand !== EXPECTED_FULL_CHECK_COMMAND) {
    fail(`package.json scripts.test:release:full muss exakt "${EXPECTED_FULL_CHECK_COMMAND}" sein.`);
  }
  if (publishCommand.length > 256 || fullCheckCommand.length > 256) {
    fail('Publish-/Volltest-Aufruf ist unerwartet lang.');
  }

  const plan = readJson(PLAN_FILE, 'scripts/publish-check-plan.json');
  if (!plan || plan.schemaVersion !== 1) fail('Publish-Plan benötigt schemaVersion=1.');
  if (!Array.isArray(plan.commands) || plan.commands.length === 0) fail('Publish-Plan enthält keine commands-Liste.');
  if (!Number.isInteger(plan.expectedStepCount) || plan.expectedStepCount !== plan.commands.length) {
    fail(`expectedStepCount=${plan.expectedStepCount} passt nicht zu ${plan.commands.length} Befehlen.`);
  }

  const commands = plan.commands.map((command) => String(command || '').trim().replace(/\s+/g, ' '));
  if (commands[0] !== 'node scripts/ensure-publish-dev-deps.js') {
    fail('Erster Publish-Schritt muss die DevDependency-/TypeScript-Vorprüfung sein.');
  }
  if (commands[1] !== 'npm run typecheck') {
    fail('Zweiter Publish-Schritt muss der vollständige TypeScript-Check sein.');
  }
  if (commands.filter((command) => command === commands[0]).length !== 1) {
    fail('DevDependency-Vorprüfung muss genau einmal im Publish-Plan stehen.');
  }
  if (commands.filter((command) => command === 'npm run typecheck').length !== 1) {
    fail('Vollständiger TypeScript-Check muss genau einmal im Publish-Plan stehen.');
  }
  for (const required of REQUIRED_COMMANDS) {
    if (!commands.includes(required)) fail(`Kritischer Publish-Schritt fehlt: ${required}`);
  }

  const parsedSteps = commands.map((command) => parseCommand(command, scripts));
  const longestCommandLength = commands.reduce((max, command) => Math.max(max, command.length), 0);
  return {
    pkg,
    commands,
    parsedSteps,
    longestCommandLength,
    expectedStepCount: plan.expectedStepCount,
  };
}

function npmCliCandidates() {
  const candidates = [];
  const seen = new Set();
  const add = (candidate) => {
    const value = String(candidate || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    if (fs.existsSync(value) && fs.statSync(value).isFile()) candidates.push(value);
  };

  add(process.env.npm_execpath);
  add(process.env.NPM_CLI_JS);
  add(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  add(path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  return candidates;
}

function childEnvironment() {
  return Object.assign({}, process.env, { [ACTIVE_ENV]: '1' });
}

function executeNpmScript(scriptName) {
  const cli = npmCliCandidates()[0];
  if (cli) {
    return spawnSync(process.execPath, [cli, 'run', scriptName], {
      cwd: ROOT,
      env: childEnvironment(),
      stdio: 'inherit',
      shell: false,
    });
  }

  if (process.platform === 'win32') {
    // Nur ein kurzer, streng validierter Skriptname wird an cmd.exe übergeben.
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm run ${scriptName}`], {
      cwd: ROOT,
      env: childEnvironment(),
      stdio: 'inherit',
      shell: false,
    });
  }

  return spawnSync('npm', ['run', scriptName], {
    cwd: ROOT,
    env: childEnvironment(),
    stdio: 'inherit',
    shell: false,
  });
}

function executeStep(step) {
  if (step.kind === 'node') {
    return spawnSync(process.execPath, [step.scriptPath], {
      cwd: ROOT,
      env: childEnvironment(),
      stdio: 'inherit',
      shell: false,
    });
  }
  return executeNpmScript(step.scriptName);
}

function assertChildSuccess(result, display) {
  if (result && result.error) {
    fail(`${display} konnte nicht gestartet werden: ${result.error.message || result.error}`);
  }
  if (!result || result.status !== 0) {
    const signal = result && result.signal ? `, Signal ${result.signal}` : '';
    const status = result && result.status !== null && result.status !== undefined ? result.status : 'unbekannt';
    fail(`${display} fehlgeschlagen (Exit ${status}${signal}).`);
  }
}

function parseDiagnosticRange(totalSteps) {
  const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
  const toArg = process.argv.find((arg) => arg.startsWith('--to='));
  if (!fromArg && !toArg) return { fromIndex: 0, toIndex: totalSteps - 1, partial: false };
  if (process.env.NEXOWATT_ALLOW_PARTIAL_PUBLISH_CHECK !== '1') {
    fail('Teilbereiche sind nur mit NEXOWATT_ALLOW_PARTIAL_PUBLISH_CHECK=1 für Diagnoseläufe zulässig.');
  }
  const from = fromArg ? Number(fromArg.slice('--from='.length)) : 1;
  const to = toArg ? Number(toArg.slice('--to='.length)) : totalSteps;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > totalSteps) {
    fail(`Ungültiger Diagnosebereich: from=${from}, to=${to}, Gesamt=${totalSteps}.`);
  }
  return { fromIndex: from - 1, toIndex: to - 1, partial: true };
}

function runPlan(validated) {
  if (process.env[ACTIVE_ENV] === '1') {
    fail('Rekursiver Aufruf des Publish-Runners erkannt.');
  }

  const range = parseDiagnosticRange(validated.parsedSteps.length);
  const selectedCount = range.toIndex - range.fromIndex + 1;
  const startedAt = Date.now();
  if (range.partial) {
    console.warn(`[publish-check-runner] DIAGNOSE: Fuehre nur Schritte ${range.fromIndex + 1}-${range.toIndex + 1} von ${validated.parsedSteps.length} aus.`);
  } else {
    console.log(`[publish-check-runner] Starte ${validated.parsedSteps.length} Prüfungen ohne lange Shell-Kette ...`);
  }
  for (let index = range.fromIndex; index <= range.toIndex; index += 1) {
    const step = validated.parsedSteps[index];
    const stepStartedAt = Date.now();
    console.log(`\n[publish-check-runner] [${index + 1}/${validated.parsedSteps.length}] ${step.display}`);
    const result = executeStep(step);
    assertChildSuccess(result, step.display);
    const elapsedSec = ((Date.now() - stepStartedAt) / 1000).toFixed(1);
    console.log(`[publish-check-runner] OK [${index + 1}/${validated.parsedSteps.length}] (${elapsedSec}s)`);
  }
  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const scope = range.partial ? `Diagnoseschritte ${range.fromIndex + 1}-${range.toIndex + 1}` : `Alle ${validated.parsedSteps.length} Prüfungen`;
  console.log(`\n[publish-check-runner] OK: ${scope} bestanden (${totalSec}s; ${selectedCount} Schritte).`);
}

function printVerification(validated) {
  console.log(
    `[publish-check-runner] OK: ${validated.expectedStepCount} geordnete Schritte validiert; ` +
    `npm publish nutzt den read-only Artefaktcheck, Volltest-Aufruf ${EXPECTED_FULL_CHECK_COMMAND.length} Zeichen; ` +
    `längster Einzelbefehl ${validated.longestCommandLength} Zeichen; keine Shell-Gesamtkette.`
  );
}

function main() {
  const validated = loadAndValidatePlan();
  if (process.argv.includes('--verify')) {
    printVerification(validated);
    return;
  }
  if (process.argv.includes('--list')) {
    validated.commands.forEach((command, index) => console.log(`${index + 1}\t${command}`));
    return;
  }
  runPlan(validated);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  EXPECTED_PACKAGE_COMMAND,
  EXPECTED_FULL_CHECK_COMMAND,
  REQUIRED_COMMANDS,
  loadAndValidatePlan,
  parseCommand,
  parseDiagnosticRange,
  runPlan,
};
