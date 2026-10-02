// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-evcs-station-permission.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-evcs-station-permission.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 66bd34d3327eb83ce26358631c1c94a887cfad3fbd191626503b2a4d4e6384dc
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/**
 * Code-Teil: contains
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const contains = (text, needle, label) => assert.ok(text.includes(needle), `${label}: missing ${needle}`);
/**
 * Code-Teil: notContains
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const notContains = (text, needle, label) => assert.ok(!text.includes(needle), `${label}: forbidden ${needle}`);

/**
 * Code-Teil: verifyConsumerEnableSemantics
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function verifyConsumerEnableSemantics() {
  const { applyEvcsSetpoint } = require(path.join(ROOT, 'ems', 'consumers', 'evcs.js'));

/**
 * Code-Teil: makeCtx
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const makeCtx = () => {
    const writes = [];
    const entries = new Map([
      ['evcs.lp1.setA', { objectId: 'test.current' }],
      ['evcs.lp1.enable', { objectId: 'test.enable' }],
    ]);
    return {
      writes,
      ctx: {
        adapter: { log: { debug() {} } },
        dp: {
          getEntry(key) { return entries.get(key) || null; },
          async writeNumber(key, value) { writes.push({ kind: 'number', key, value }); return true; },
          async writeBoolean(key, value) { writes.push({ kind: 'boolean', key, value }); return true; },
        },
      },
    };
  };

  const consumer = {
    type: 'evcs',
    key: 'lp1',
    controlBasis: 'currentA',
    setAKey: 'evcs.lp1.setA',
    setWKey: '',
    enableKey: 'evcs.lp1.enable',
  };

  {
    const { ctx, writes } = makeCtx();
    const result = await applyEvcsSetpoint(ctx, consumer, { targetW: 0, targetA: 0, basis: 'currentA', enable: true });
    assert.equal(result.applied, true, 'PV waiting command must be accepted');
    assert.deepEqual(writes, [
      { kind: 'number', key: 'evcs.lp1.setA', value: 0 },
      { kind: 'boolean', key: 'evcs.lp1.enable', value: true },
    ], 'PV waiting must write 0 A while keeping station enabled');
  }

  {
    const { ctx, writes } = makeCtx();
    const result = await applyEvcsSetpoint(ctx, consumer, { targetW: 0, targetA: 0, basis: 'currentA', enable: false });
    assert.equal(result.applied, true, 'explicit customer station block must be accepted');
    assert.deepEqual(writes, [
      { kind: 'number', key: 'evcs.lp1.setA', value: 0 },
      { kind: 'boolean', key: 'evcs.lp1.enable', value: false },
    ], 'explicit customer station block must write 0 A and disable hardware');
  }

  {
    const { ctx, writes } = makeCtx();
    const result = await applyEvcsSetpoint(ctx, consumer, { targetW: 4200, targetA: 6, basis: 'currentA', enable: true });
    assert.equal(result.applied, true, 'active charging command must be accepted');
    assert.deepEqual(writes, [
      { kind: 'number', key: 'evcs.lp1.setA', value: 6 },
      { kind: 'boolean', key: 'evcs.lp1.enable', value: true },
    ], 'active charging must write current and keep station enabled');
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function main() {
  const appTs = read('src-ts/runtime-executables/www/app.ts');
  const appJs = read('www/app.js');
  const evcsTs = read('src-ts/runtime-executables/www/evcs.ts');
  const evcsJs = read('www/evcs.js');
  const mainTs = read('src-ts/runtime-executables/main.ts');
  const mainJs = read('main.js');
  const chargingTs = read('src-ts/runtime-executables/ems/modules/charging-management.ts');
  const chargingJs = read('ems/modules/charging-management.js');
  const appCenterTs = read('src-ts/runtime-executables/www/ems-apps.ts');

  for (const [text, label] of [[appTs, 'app.ts'], [appJs, 'app.js']]) {
    contains(text, "d('chargingManagement.wallboxes.lp1.userStationEnabled')", label);
    contains(text, "'evcs.1.stationEnabled'", label);
    contains(text, 'PV mode with 0 W means waiting, not disabled', label);
    const toggleStart = text.indexOf('if (toggle){');
    const toggleEnd = text.indexOf('if (regToggle){', toggleStart);
    assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, `${label}: single EVCS toggle block not found`);
    const block = text.slice(toggleStart, toggleEnd);
    notContains(block, "'1.active'", `${label} station toggle`);
    notContains(block, "scope = hasPerBoxActive", `${label} station toggle`);
  }

  for (const [text, label] of [[evcsTs, 'evcs.ts'], [evcsJs, 'evcs.js']]) {
    contains(text, 'd(`${cm}.userStationEnabled`)', label);
    contains(text, "key: `evcs.${idx}.stationEnabled`", label);
    contains(text, 'activeId remains read-only connector/session status', label);
    contains(text, '<span>Ladestation</span>', label);
  }

  for (const [text, label] of [[mainTs, 'main.ts'], [mainJs, 'main.js']]) {
    contains(text, 'stationEnabled|userStationEnabled', `${label} API parser`);
    contains(text, 'chargingManagement.wallboxes.${safe}.userStationEnabled', `${label} API writer`);
    contains(text, 'api-legacy-migration:${id}', `${label} legacy UI migration`);
    contains(text, 'niemals auf den gelesenen Connector-/Fahrzeugstatus (`activeId`)', `${label} activeId separation`);
  }

  for (const [text, label] of [[chargingTs, 'charging-management.ts'], [chargingJs, 'charging-management.js']]) {
    contains(text, "await mk('userStationEnabled'", `${label} state`);
    contains(text, "await mk('stationEnabled'", `${label} effective state`);
    contains(text, 'const stationEnabled = cfgEnabled && userStationEnabled && !rfidLockActive;', `${label} station permission`);
    contains(text, 'const enabled = stationEnabled && userEnabled;', `${label} effective control`);
    contains(text, 'setpointTarget.enable = availability.requested === true;', `${label} access-only hardware enable request`);
    contains(text, 'resolveEvcsAvailabilityRequest({', `${label} dedicated availability owner`);
    contains(text, '!w.userStationEnabled || !w.userEnabled || w.rfidLockActive', `${label} safe stop`);
    contains(text, 'let online = cfgEnabled;', `${label} disable-write reachability`);
  }

  contains(appCenterTs, 'Fahrzeug/Ladevorgang aktiv (lesen, optional)', 'AppCenter activeId label');
  notContains(appCenterTs, "mkRow('Freigabe (optional)'", 'AppCenter activeId label');

  await verifyConsumerEnableSemantics();
  console.log('[evcs-station-permission] OK: PV waiting keeps the station enabled; only an explicit customer block disables it; activeId remains read-only status.');
}

main().catch((err) => {
  console.error('[evcs-station-permission] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
