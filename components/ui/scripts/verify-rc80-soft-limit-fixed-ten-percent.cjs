#!/usr/bin/env node
'use strict';

/**
 * RC80 – versionsneutraler Sicherheitsvertrag
 * Verbindliche Soft-Limit-Regel:
 * - Reserve = exakt 10 % des wirksamen NVP-/Hard-Limits
 * - Soft-Limit = exakt 90 % des wirksamen Hard-Limits
 * - keine 1-kW-Mindestreserve, keine 3-kW-Maximalreserve
 * - keine manuelle/Legacy-Uebersteuerung oder Deaktivierung
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const {
  resolveAutoReserveW,
  resolveGridImportLimitPolicy,
} = require(path.join(root, 'ems/services/grid-import-limit-policy.js'));

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function verifyPair(hardLimitW, expectedReserveW, expectedSoftW) {
  assert.strictEqual(resolveAutoReserveW(hardLimitW, 999999), expectedReserveW, `Reserve fuer ${hardLimitW} W`);
  const policy = resolveGridImportLimitPolicy({
    hardLimitW,
    softLimitEnabled: false,
    softLimitW: 1,
    reserveW: 1,
    signedNvpW: 0,
    nvpUsable: true,
  });
  assert.strictEqual(policy.enabled, hardLimitW > 0, `Soft muss bei ${hardLimitW} W automatisch aktiv sein`);
  assert.strictEqual(policy.hardLimitW, hardLimitW);
  assert.strictEqual(policy.reserveW, expectedReserveW);
  assert.strictEqual(policy.configuredReserveW, expectedReserveW);
  assert.strictEqual(policy.softLimitW, expectedSoftW);
  assert.strictEqual(policy.planningLimitW, expectedSoftW);
  assert.strictEqual(policy.softLimitW + policy.reserveW, policy.hardLimitW, 'Soft plus Reserve muss Hard exakt ergeben');
  assert.strictEqual(policy.softLimitMode, hardLimitW > 0 ? 'fixed-10-percent' : 'disabled');
}

(() => {
  const pkg = JSON.parse(read('package.json'));
  const io = JSON.parse(read('io-package.json'));
  // Der RC-Vertrag gilt auch für spätere Patchstände. Entscheidend ist eine
  // gültige und über alle Release-Metadaten synchronisierte SemVer-Version.
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(io.common.version, pkg.version);

  // 1) Keine Mindestreserve: 5 kW ergeben exakt 500 W Reserve.
  verifyPair(5000, 500, 4500);

  // 2) Feldstandard: 30 kW ergeben 3 kW Reserve / 27 kW Soft.
  verifyPair(30000, 3000, 27000);

  // 3) Keine Maximalreserve: 100 kW ergeben exakt 10 kW Reserve.
  verifyPair(100000, 10000, 90000);

  // 4) Auf ganze Watt gerundet, aber Summe bleibt exakt konsistent.
  verifyPair(33333, 3333, 30000);

  // 5) Alte manuelle Werte und Deaktivierung duerfen die Policy nicht beeinflussen.
  const legacy = resolveGridImportLimitPolicy({
    hardLimitW: 50000,
    softLimitEnabled: false,
    softLimitW: 12345,
    reserveW: 777,
    signedNvpW: 44000,
    nvpUsable: true,
  });
  assert.strictEqual(legacy.softLimitW, 45000);
  assert.strictEqual(legacy.reserveW, 5000);
  assert.strictEqual(legacy.stage, 'normal');
  const atSoft = resolveGridImportLimitPolicy({
    hardLimitW: 50000,
    softLimitEnabled: false,
    softLimitW: 12345,
    reserveW: 777,
    signedNvpW: 45000,
    nvpUsable: true,
  });
  assert.strictEqual(atSoft.stage, 'soft');

  // 6) Signierter NVP bleibt erhalten: Einspeisung vergroessert beide Headrooms.
  const exportCase = resolveGridImportLimitPolicy({
    hardLimitW: 30000,
    signedNvpW: -10100,
    nvpUsable: true,
  });
  assert.strictEqual(exportCase.softHeadroomW, 37100);
  assert.strictEqual(exportCase.hardHeadroomW, 40100);

  // 7) UI bietet keine ueberschreibbaren Soft-/Reservefelder mehr an.
  const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
  assert(ui.includes('Soft‑Limit: ${fixedSoftW.toLocaleString'));
  assert(ui.includes('Reserve: ${fixedReserveW.toLocaleString'));
  assert(ui.includes('W (10 %).'));
  assert(!ui.includes("mkChk('Soft‑Limit verwenden'"));
  assert(!ui.includes("mkNum('Soft‑Limit explizit'"));
  assert(!ui.includes("mkNum('Reserve unter Hard‑Limit'"));
  assert(ui.includes('gc.importSoftLimitW = 0;'));
  assert(ui.includes('gc.importSoftReserveW = 0;'));

  // 8) Produktive Runtime uebergibt keine Legacy-Overrides mehr.
  const grid = read('src-ts/runtime-executables/ems/modules/grid-constraints.ts');
  const policyStart = grid.indexOf('const importPolicy = resolveGridImportLimitPolicy({');
  const policyEnd = grid.indexOf('});', policyStart);
  assert(policyStart >= 0 && policyEnd > policyStart);
  const policyBlock = grid.slice(policyStart, policyEnd);
  assert(!policyBlock.includes('softLimitW: cfg.importSoftLimitW'));
  assert(!policyBlock.includes('reserveW: cfg.importSoftReserveW'));
  assert(!policyBlock.includes('softLimitEnabled: cfg.importSoftLimitEnabled'));

  // 9) Hard-Safety bleibt getrennt und der Browsercache wird aktualisiert.
  const safety = read('src-ts/runtime-executables/ems/services/safety-envelope.ts');
  assert(safety.includes('maxImportW - signedNvpW'));
  assert(!safety.includes('gridImportLimitW_planning'));
  assert(read('src-ts/runtime-executables/www/sw.ts').match(/const CACHE_NAME = 'nexowatt-cache-v\d+'/));

  // 10) Dokumentation nennt explizit das Ende der 1-/3-kW-Klammer.
  const docs = read('docs/RC80_SOFT_LIMIT_FIXED_TEN_PERCENT_DE.md');
  assert(docs.includes('5.000 W | 500 W | 4.500 W'));
  assert(docs.includes('100.000 W | 10.000 W | 90.000 W'));
  assert(docs.includes('mindestens 1 kW und höchstens 3 kW entfällt vollständig'));

  console.log('[RC80] OK: Soft-Reserve immer exakt 10 %, Soft-Limit immer 90 %, keine Mindest-/Maximalgrenze und keine Legacy-Uebersteuerung.');
})();
