#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-core-limits-productive.js
 *
 * Zweck:
 * Prüft den 0.7.105-Schritt: Core-Limits nutzt den TypeScript-Spiegel produktiv für
 * zentrale Budget-Gates, bleibt aber bei Fehlern/Abweichungen auf JavaScript-Fallback.
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(msg) { console.error('[ts-core-limits-productive] ERROR: ' + msg); process.exit(1); }
function must(text, marker, label) { if (!text.includes(marker)) fail(`${label} fehlt: ${marker}`); }
function has(rel, marker, label) { must(read(rel), marker, label); }

const core = read('ems/modules/core-limits.js');
must(core, '_applyCoreBudgetTsProductiveSnapshot', 'produktive TS-Übernahmefunktion');
must(core, "mode: 'central-background-ts-core'", 'TS-Core-Budget-Modus');
must(core, "source: 'ts-core-budget'", 'TS-Core-Budget-Quelle');
must(core, "reason: 'shadow-ok'", 'TS wird nur nach Shadow-OK aktiv');
must(core, "fallback: true", 'JS-Fallback-Status');
must(core, "let budgetSnapshot = this._makeBudgetSnapshot", 'BudgetSnapshot ist für TS-Übernahme ersetzbar');
must(core, "budgetSnapshot = this._applyCoreBudgetTsProductiveSnapshot", 'produktive TS-Übernahme wird vor makeBudgetRuntime angewendet');
must(core, "ems.budget.source", 'Budget-Quelle-State');
must(core, "ems.budget.tsProductiveJson", 'TS-Produktivdiagnose-State');
must(core, "JSON.stringify(b.tsProductive || {})", 'TS-Produktivdiagnose wird geschrieben');

const mainText = read('main.js');
must(mainText, 'emsBudgetTsProductiveJson', 'App-Center-Diagnose liest Core-Limits TS-Produktivstatus');
must(mainText, 'emsBudgetSource', 'App-Center-Diagnose liest Budget-Quelle');

const mirror = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-budget.js'));
if (!mirror || typeof mirror.buildCoreBudgetSnapshot !== 'function') fail('TS-Core-Budget-Mirror exportiert buildCoreBudgetSnapshot nicht.');
const sample = mirror.buildCoreBudgetSnapshot({
  ts: 1,
  pvSurplusW: 2400,
  storageReserveW: 400,
  alreadyReservedW: 0,
  storageSocPct: 0,
  storageReserveSocPct: 100,
  allowStorageDischarge: false,
  gridImportW: 1000,
  gridImportLimitW: 5000,
  allowGridImport: true,
  totalBudgetCapW: 3000,
});
if (!sample || !sample.pv || sample.pv.effectiveW !== 2000) fail('TS-Core-Budget PV-Gate liefert unerwarteten Wert.');
if (!sample.total || sample.total.effectiveW !== 3000) fail('TS-Core-Budget Total-Cap wird nicht korrekt angewendet.');
console.log('[ts-core-limits-productive] OK: Core-Limits TS-Produktivpfad ist vorbereitet und abgesichert.');
