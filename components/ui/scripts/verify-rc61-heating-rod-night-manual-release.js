#!/usr/bin/env node
'use strict';

/**
 * RC61 – Heizstab-Nachtfreigabe.
 *
 * Vertrag:
 * - PV-Auto ist im konfigurierten Nachtfenster gesperrt.
 * - Manuelle Stufen, Boost und eindeutig erkannte externe Hand-Schaltungen
 *   werden vor dem Nachtblock behandelt und bleiben zulässig.
 * - Das Zeitfenster ist lokal, über Mitternacht konfigurierbar und standardmäßig
 *   von 20:00 bis 06:00 aktiv.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  resolveHeatingRodNightPvAutoLock,
} = require('../ems/modules/heating-rod-control');

function localTs(hour, minute = 0) {
  return new Date(2026, 7, 15, hour, minute, 0, 0).getTime();
}

// Standardfenster über Mitternacht.
{
  const cfg = {};
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(19, 59)).active, false);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(20, 0)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(23, 59)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(0, 0)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(5, 59)).active, true);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(6, 0)).active, false);
}

// Benutzerdefiniertes Fenster sowie explizite Deaktivierung.
{
  const cfg = { blockPvAutoAtNight: true, nightStartTime: '22:30', nightEndTime: '04:15' };
  const active = resolveHeatingRodNightPvAutoLock(cfg, localTs(23, 0));
  assert.strictEqual(active.enabled, true);
  assert.strictEqual(active.active, true);
  assert.strictEqual(active.startTime, '22:30');
  assert.strictEqual(active.endTime, '04:15');
  assert.match(active.reason, /manual.*only|manual-release-only/);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(12, 0)).active, false);
  assert.strictEqual(resolveHeatingRodNightPvAutoLock({ ...cfg, blockPvAutoAtNight: false }, localTs(23, 0)).active, false);
}

// Start == Ende ist bewusst fail-safe ganztägig nur manuell.
{
  const cfg = { blockPvAutoAtNight: true, nightStartTime: '00:00', nightEndTime: '00:00' };
  assert.strictEqual(resolveHeatingRodNightPvAutoLock(cfg, localTs(12, 0)).active, true);
}

// Strukturelle Schutzanker: explizite Freigaben müssen vor dem PV-Auto-Nachtblock
// ausgewertet werden; der Nachtblock muss vor der normalen Auto-Stufenberechnung liegen.
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/heating-rod-control.ts'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/www/ems-apps.ts'), 'utf8');

const boostIndex = source.indexOf('if (ov.boostActive)');
const manualIndex = source.indexOf('if (manualStage > 0)');
const externalManualIndex = source.indexOf('if (pvAutomationActive && ownNow.externalManual)');
const nightIndex = source.indexOf('if (pvAutomationActive && nightPvAutoLock.active)');
const autoStageIndex = source.indexOf('const strategyAction = String(strategyOverlay.action');

for (const [name, index] of Object.entries({ boostIndex, manualIndex, externalManualIndex, nightIndex, autoStageIndex })) {
  assert(index >= 0, `Fehlender RC61-Codeanker: ${name}`);
}
assert(boostIndex < nightIndex, 'Boost muss vor dem Nachtblock zulässig bleiben.');
assert(manualIndex < nightIndex, 'Manuelle Stufen müssen vor dem Nachtblock zulässig bleiben.');
assert(externalManualIndex < nightIndex, 'Externe Hand-Schaltung muss vor dem Nachtblock zulässig bleiben.');
assert(nightIndex < autoStageIndex, 'Der Nachtblock muss die normale PV-Auto-Berechnung vor dem Schreiben stoppen.');

for (const needle of [
  'blockPvAutoAtNight',
  'nightStartTime',
  'nightEndTime',
  'night_pv_auto_blocked',
  'manual_release_required',
  'PV-Auto nachts sperren',
]) {
  assert(source.includes(needle) || uiSource.includes(needle), `Fehlender Nachtfreigabe-Anker: ${needle}`);
}

console.log('[rc61-heating-rod-night-manual-release] OK: PV-Auto ist nachts gesperrt; Manual/Boost/externe Handfreigabe bleiben vorgeordnet zulässig.');
