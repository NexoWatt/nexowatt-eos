#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-history-runtime-typing.js
 *
 * Zweck:
 * Prüft den gezielten TypeScript-Migrationsschritt für den History-Spiegel
 * `src-ts/runtime-mirrors/www/history.ts`.
 *
 * Zusammenhang:
 * Die produktive History-Seite läuft weiterhin über `www/history.js`. Diese Prüfung
 * nimmt den TS-Spiegel, entfernt temporär `@ts-nocheck` und kompiliert ihn in einem
 * gelockerten Browser-Migrationsmodus. So sehen wir, ob die ersten History-Verträge
 * tragfähig sind, ohne Chart-/Report-Runtime produktiv umzuschalten.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { spawnTypeScript, writeTypeScriptSpawnDiagnostics } = require('./typescript-invocation');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'src-ts', 'runtime-mirrors', 'www', 'history.ts');

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Sichert ab, dass die gezielten History-Typverträge und Migrationskommentare nicht
 * versehentlich durch einen rohen Spiegel-Sync überschrieben wurden.
 */
function requireContains(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[ts-history-runtime-typing] Missing ${label}: ${marker}`);
  }
}

/**
 * Code-Teil: resolveTypeScriptBinary
 *
 * Zweck:
 * Nutzt bevorzugt den lokalen TypeScript-Compiler. Der Check gehört nur zur Migration;
 * die produktive Adapter-Runtime hängt nicht davon ab.
 */

/**
 * Code-Teil: buildTemporaryCheckFiles
 *
 * Zweck:
 * Erstellt eine temporäre History-Vertragskopie ohne `@ts-nocheck`. Die komplette
 * Browser-Runtime bleibt noch Legacy-Code; dieser Check kompiliert deshalb bewusst den
 * Vertrags-/Headerbereich vor der IIFE. So prüfen wir die neuen History-Typen, ohne die
 * komplette Canvas-/DOM-Migration in einem einzigen Schritt zu erzwingen.
 */
function extractHistoryTypeBlock(source) {
  const start = source.indexOf('type HistoryTimestampMs');
  const end = source.indexOf('(function(){', start);
  if (start < 0 || end < 0) {
    throw new Error('[ts-history-runtime-typing] History-Typblock konnte nicht extrahiert werden.');
  }
  return source.slice(start, end);
}

function buildTemporaryCheckFiles(source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-history-ts-'));
  const tempSource = path.join(tempDir, 'history-types-check.ts');
  const tempConfig = path.join(tempDir, 'tsconfig.json');
  const typeBlock = extractHistoryTypeBlock(source);
  const harness = `${typeBlock}\n\n` + `
const point: HistoryPoint = [Date.now(), 0];
const series: HistorySeries = { values: [point], unit: 'W', label: 'PV' };
const map: HistorySeriesMap = { pv: series };
const response: HistoryApiResponse = { series: map, extras: { consumers: [], producers: [] } };
const bucket: HistoryBucket = { start: Date.now() - 3600000, end: Date.now(), kwh: 0 };
const interval: PricingInterval = { start: bucket.start, end: bucket.end, importKwh: 0 };
const flags: HistoryConfigFlags = { hasEvcs: false, hasStorageFarm: false, hasTariff: true, hasWeather: false };
const domRefs: HistoryDomRefs = { chart: null, chartContext: null };
void response;
void interval;
void flags;
void domRefs;
`;
  fs.writeFileSync(tempSource, harness, 'utf8');
  fs.writeFileSync(tempConfig, JSON.stringify({
    extends: path.join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      strict: true,
      module: 'NodeNext',
      moduleResolution: 'nodenext',
      lib: ['ES2022', 'DOM'],
      types: []
    },
    files: [tempSource]
  }, null, 2), 'utf8');
  return { tempDir, tempConfig };
}

function main() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  requireContains(source, 'History Runtime-Migrationshinweis (DE)', 'deutscher History-Migrationskommentar');
  requireContains(source, 'type HistoryPoint', 'HistoryPoint-Vertrag');
  requireContains(source, 'interface HistorySeries', 'HistorySeries-Vertrag');
  requireContains(source, 'type HistorySeriesMap', 'HistorySeriesMap-Vertrag');
  requireContains(source, 'type HistoryRange', 'HistoryRange-Vertrag');
  requireContains(source, 'interface HistoryBucket', 'HistoryBucket-Vertrag');
  if (!source.includes('interface PricingInterval') && !source.includes('type PricingInterval') && !source.includes('type HistoryPricingIntervalContract')) {
    throw new Error('[ts-history-runtime-typing] Missing PricingInterval-Vertrag');
  }
  requireContains(source, 'interface HistoryConfigFlags', 'Feature-Flag-Vertrag');
  requireContains(source, 'interface HistoryApiResponse', 'API-Antwort-Vertrag');
  requireContains(source, 'interface HistoryDomRefs', 'DOM-Referenzen-Vertrag');
  requireContains(source, 'History-Browser-Runtime-IIFE', 'IIFE-Migrationskommentar');

  const { tempDir, tempConfig } = buildTemporaryCheckFiles(source);
  const result = spawnTypeScript(repoRoot, ['-p', tempConfig, '--pretty', 'false'], { cwd: repoRoot, encoding: 'utf8' });
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_e) {}
  if (result.status !== 0) {
    writeTypeScriptSpawnDiagnostics(result);
    throw new Error('[ts-history-runtime-typing] History-Vertragsbereich ist ohne @ts-nocheck noch nicht kompilierbar.');
  }
  console.log('[ts-history-runtime-typing] OK: History-Spiegel ist gezielt typisiert und in gelockertem Migrationsmodus kompilierbar.');
}

try { main(); } catch (err) { console.error(err && err.message ? err.message : err); process.exit(1); }
