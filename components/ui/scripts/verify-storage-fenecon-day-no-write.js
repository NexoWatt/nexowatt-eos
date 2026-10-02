#!/usr/bin/env node
'use strict';

/**
 * RC38 regression: Ein exklusiver FENECON/OpenEMS-DC-/Hybrid-Speicher nutzt
 * im Automatikmodus eine eindeutige PV-abhaengige Reglerhoheit:
 * - PV > 500 W: FEMS-Eigenregelung (kein zyklischer EOS-Leistungsbefehl)
 * - PV < 500 W: EOS-Regelung nach Entprellung
 * - PV = 500 W: bisherige Reglerhoheit bleibt bestehen
 * - fehlende/veraltete PV: fail-safe FEMS-Eigenregelung
 * Ein expliziter 0-W-Stopp wird nachgelagert durch die zentrale 0-W-Firewall
 * durchgesetzt und ist deshalb auch unter FEMS-Regelhoheit zulaessig.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolveControlMode,
  resolveHybridAuthority,
  validateSingleConfig,
} = require('../ems/services/fenecon-hybrid-control');

const root = path.join(__dirname, '..');
const storageTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
const serviceTs = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/services/fenecon-hybrid-control.ts'), 'utf8');
const appHtml = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');

// Produktiver Vertrag und Integrationsanker.
assert.doesNotMatch(storageTs, /_handleFeneconHybridPassThrough/);
assert.doesNotMatch(storageTs, /fenecon-day-no-write/);
assert.match(serviceTs, /PV oberhalb der Freigabeschwelle -> FEMS-Eigenregelung/);
assert.match(serviceTs, /PV unterhalb der Uebernahmeschwelle -> EOS-Regelung/);
assert.match(storageTs, /handoverZeroRequired/);
assert.match(storageTs, /write-zero-override/);
assert.match(appHtml, /PV &gt; 500 W/);
assert.match(appHtml, /PV &lt; 500 W/);

const directCfg = {
  vendorProfile: 'fenecon-openems',
  coupling: 'dc',
  feneconControlMode: 'auto',
  feneconEssActualPowerId: 'fems.ess0.ActivePower',
  setSignedPowerId: 'fems.ess0.SetActivePowerEquals',
  feneconPvPassthroughThresholdW: 500,
  feneconPvReleaseThresholdW: 500,
  feneconPvPassthroughDelaySec: 10,
  feneconPvReleaseDelaySec: 120,
};
const nativeCfg = {
  ...directCfg,
  feneconGridSetpointId: 'fems.ctrlBalancing0.SetGridActivePower',
};
const base = 1_000_000;

function authority(config, runtime) {
  return resolveHybridAuthority(config, {
    writableStorageCount: 1,
    otherWritableStorageCount: 0,
    ...runtime,
  });
}

// Technischer EOS-Schreibpfad bleibt deterministisch aufgeloest.
assert.equal(resolveControlMode(directCfg, { writableStorageCount: 1 }).mode, 'direct-ess');
assert.equal(resolveControlMode(nativeCfg, { writableStorageCount: 1 }).mode, 'fems-grid');
assert.equal(validateSingleConfig(directCfg).ok, true);
assert.equal(validateSingleConfig(nativeCfg).ok, true);

// Bereits aktive FEMS-Regelung bleibt bei PV > 500 W ohne Write.
let result = authority(nativeCfg, {
  nowMs: base,
  pvW: 800,
  pvFresh: true,
  previousAuthority: 'fems',
});
assert.equal(result.authority, 'fems');
assert.equal(result.noWrite, true);
assert.equal(result.transitionPending, false);

// FEMS -> EOS erst nach dauerhaft PV < 500 W.
result = authority(nativeCfg, {
  nowMs: base,
  pvW: 300,
  pvFresh: true,
  previousAuthority: 'fems',
});
assert.equal(result.authority, 'fems');
assert.equal(result.transitionPending, true);
const belowSinceMs = result.pvBelowSinceMs;
assert.equal(belowSinceMs, base);

result = authority(nativeCfg, {
  nowMs: base + 119_999,
  pvW: 300,
  pvFresh: true,
  previousAuthority: 'fems',
  pvBelowSinceMs: belowSinceMs,
});
assert.equal(result.authority, 'fems');
assert.equal(result.noWrite, true);

result = authority(nativeCfg, {
  nowMs: base + 120_000,
  pvW: 300,
  pvFresh: true,
  previousAuthority: 'fems',
  pvBelowSinceMs: belowSinceMs,
});
assert.equal(result.authority, 'nexowatt');
assert.equal(result.noWrite, false);

// EOS -> FEMS erst nach 10 s stabiler PV > 500 W.
result = authority(directCfg, {
  nowMs: base,
  pvW: 800,
  pvFresh: true,
  previousAuthority: 'nexowatt',
});
assert.equal(result.authority, 'nexowatt');
assert.equal(result.transitionPending, true);
const aboveSinceMs = result.pvAboveSinceMs;
assert.equal(aboveSinceMs, base);

result = authority(directCfg, {
  nowMs: base + 9_999,
  pvW: 800,
  pvFresh: true,
  previousAuthority: 'nexowatt',
  pvAboveSinceMs: aboveSinceMs,
});
assert.equal(result.authority, 'nexowatt');
assert.equal(result.noWrite, false);

result = authority(directCfg, {
  nowMs: base + 10_000,
  pvW: 800,
  pvFresh: true,
  previousAuthority: 'nexowatt',
  pvAboveSinceMs: aboveSinceMs,
});
assert.equal(result.authority, 'fems');
assert.equal(result.noWrite, true);

// Exakt 500 W und ein optionales Umschaltband verursachen kein Pendeln.
for (const previousAuthority of ['fems', 'nexowatt']) {
  const exact = authority(nativeCfg, {
    nowMs: base,
    pvW: 500,
    pvFresh: true,
    previousAuthority,
  });
  assert.equal(exact.authority, previousAuthority, JSON.stringify(exact));
  assert.equal(exact.noWrite, previousAuthority === 'fems');
}
const bandCfg = {
  ...nativeCfg,
  feneconPvPassthroughThresholdW: 550,
  feneconPvReleaseThresholdW: 450,
};
assert.equal(authority(bandCfg, { nowMs: base, pvW: 500, pvFresh: true, previousAuthority: 'fems' }).authority, 'fems');
assert.equal(authority(bandCfg, { nowMs: base, pvW: 500, pvFresh: true, previousAuthority: 'nexowatt' }).authority, 'nexowatt');

// Fehlende, leere oder veraltete PV ist nie eine echte 0-W-Messung.
for (const runtime of [
  { pvW: null, pvFresh: false },
  { pvW: '', pvFresh: true },
  { pvW: '   ', pvFresh: true },
  { pvW: 0, pvFresh: false },
]) {
  const stale = authority(nativeCfg, {
    nowMs: base,
    previousAuthority: 'nexowatt',
    ...runtime,
  });
  assert.equal(stale.authority, 'fems', JSON.stringify({ runtime, stale }));
  assert.equal(stale.noWrite, true);
}

// Explizite Expertenmodi und gemischte Farmen bleiben unter EOS-Hoheit.
for (const feneconControlMode of ['direct-ess', 'fems-grid']) {
  const explicit = authority({ ...nativeCfg, feneconControlMode }, {
    nowMs: base,
    pvW: 2000,
    pvFresh: true,
    previousAuthority: 'fems',
  });
  assert.equal(explicit.authority, 'nexowatt');
  assert.equal(explicit.noWrite, false);
}
const mixed = resolveHybridAuthority(nativeCfg, {
  nowMs: base,
  pvW: 2000,
  pvFresh: true,
  previousAuthority: 'fems',
  writableStorageCount: 2,
  otherWritableStorageCount: 1,
  directTargetAvailable: true,
});
assert.equal(mixed.authority, 'nexowatt');
assert.equal(mixed.noWrite, false);
assert.equal(mixed.mode, 'direct-ess');

// Fehlende Schreibziele bleiben fail-closed.
const blocked = authority({
  vendorProfile: 'fenecon-openems',
  coupling: 'dc',
  feneconControlMode: 'auto',
  feneconEssActualPowerId: 'fems.ess0.ActivePower',
}, {
  nowMs: base,
  pvW: 100,
  pvFresh: true,
  previousAuthority: 'fems',
});
assert.equal(blocked.authority, 'blocked');
assert.equal(blocked.noWrite, false);

// Ein direkter Batterie-Sollwert darf nie als FEMS-Netzziel durchgehen.
const invalid = validateSingleConfig({
  ...directCfg,
  feneconControlMode: 'fems-grid',
  feneconGridSetpointId: 'nexowatt-devices.0.devices.ess1.aliases.ctrl.powerSetpointW',
});
assert.equal(invalid.ok, false);
assert.match(invalid.reason, /grid-target|equals/);

console.log('[storage-fenecon-day-no-write] OK: PV-abhaengige FEMS/EOS-Reglerhoheit, Entprellung, Umschaltband, stale-PV-Failsafe und 0-W-Override-Integration verifiziert.');
