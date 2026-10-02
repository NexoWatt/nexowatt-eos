#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-productive.js
 *
 * Zweck:
 * Prüft den 0.7.108-Schritt: Heizstab-Entscheidungen dürfen produktiv aus dem
 * TypeScript-Spiegel übernommen werden, mit identischer Zielstufe und mit
 * JS-Sicherheitsfallback. Reine Wattmodell-Abweichungen bleiben Diagnose.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function read(rel) { const f = path.join(ROOT, rel); if (!fs.existsSync(f)) throw new Error(`Missing ${rel}`); return fs.readFileSync(f, 'utf8'); }
function must(text, needle, label) { if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`); }
const runtime = read('ems/modules/heating-rod-control.js');
const mirror = read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts');
const main = read('main.js');
must(runtime, '_evaluateHeatingRodTsProductiveDecision', 'produktiver Heizstab-TS-Entscheidungshelfer');
must(runtime, "'ts-heating-rod'", 'TS-Heizstab-Quelle');
must(runtime, "'ts-heating-rod-normal'", 'TS-Heizstab-Normalquelle');
must(runtime, "fallback('ts-js-stage-mismatch'", 'JS-Fallback bei Zielstufenmismatch');
must(runtime, 'heatingRod.summary.source', 'Heizstab-Quellen-State');
must(runtime, 'heatingRod.summary.tsProductiveJson', 'Heizstab-Produktivdiagnose-State');
must(runtime, 'heatingRodTsProductiveEntries', 'Produktive Einträge pro Gerät');
must(runtime, 'targetStage = Math.max(0, Math.min(Number(tsProductiveDecision.targetStage)', 'Zielstufe aus TS wird übernommen');
must(mirror, '_evaluateHeatingRodTsProductiveDecision', 'Runtime-Spiegel enthält produktiven TS-Helfer');
must(main, 'heatingRodTsProductiveJson', 'Diagnose-API liest TS-Produktivstatus');
must(main, 'heatingRodSource', 'Diagnose-API liest Heizstab-Quelle');
const ts = require(path.join(ROOT, 'lib/ts-mirrors/ems/heating-rod/heating-rod-decision.js'));
const d = ts.evaluateHeatingRodDecision({
  ts: 1,
  device: { id: 'hr1', name: 'HR1', enabled: true, mode: 'pvAuto', stages: [{ stage: 1, powerW: 1000 }, { stage: 2, powerW: 2000 }], storageReserveW: 0, storageReserveSocPct: 20, allowGridImport: false, allowStorageDischarge: true },
  availablePvW: 2100,
  availableTotalW: 2100,
  storageSocPct: 80,
});
if (!d || d.targetStage !== 2 || d.targetPowerW !== 2000) throw new Error('TS-Heizstabentscheidung wählt nicht die größte passende Stufe.');
console.log('[ts-heating-rod-productive] OK: Heizstab-TS-Produktivpfad und JS-Fallback sind vorhanden.');
