#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function need(rel, needle, msg) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[energy-ledger] FEHLER: ${msg || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
function match(rel, regex, msg) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[energy-ledger] FEHLER: ${msg || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}

/** Vergleicht Paketversionen numerisch und unterstützt damit auch Patch-Versionen ab 100. */
function requirePackageVersionAtLeast(minVersion, message) {
  const pkg = JSON.parse(read('package.json'));
  const parse = value => {
    const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? match.slice(1).map(Number) : null;
  };
  const actual = parse(pkg.version);
  const minimum = parse(minVersion);
  let valid = Boolean(actual && minimum);
  if (valid) {
    valid = false;
    for (let index = 0; index < actual.length; index += 1) {
      if (actual[index] === minimum[index]) continue;
      valid = actual[index] > minimum[index];
      break;
    }
    if (actual.every((part, index) => part === minimum[index])) valid = true;
  }
  if (!valid) {
    console.error(`[energy-ledger] FEHLER: ${message || `Paketversion >= ${minVersion}`} (ist ${pkg.version || 'unbekannt'})`);
    process.exit(1);
  }
}

need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'nexowatt.local-kwh-ledger.v2', 'Ledger-Schema v2');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'chargeKiosk.stations.*.lastSessionsByLpJson', 'Charge-Kiosk-Sessionquelle dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'OCPP, Modbus, MQTT', 'Hersteller-/Protokolloffenheit dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'processedSessionKeysJson', 'Deduplikation der Sessions');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'entriesRecentJson', 'kompakte Ledger-Eintragsliste');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'todayCsvJson', 'CSV-Exportbasis');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'keine eichrechtsverbindliche Abrechnung', 'rechtlicher Hinweis');
need('src-ts/runtime-executables/ems/module-manager.ts', 'EnergyLedgerModule', 'ModuleManager registriert EnergyLedgerModule');
need('src-ts/runtime-executables/ems/module-manager.ts', "this._licenseAllowsApp('energyLedger')", 'Home/Pro-Lizenzgate für Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', "id: 'energyLedger'", 'App-Center führt Energieherkunft & Ladebilanz');
need('src-ts/runtime-executables/www/ems-apps.ts', 'schreibt aber niemals auf Hardware', 'Installer-Hinweis: read-only');
need('src-ts/runtime-executables/ems/services/feature-flags.ts', "'energyLedger',", 'Energy Ledger ist im Home-App-/Featureumfang enthalten');
need('src-ts/runtime-executables/ems/services/energy-origin-accounting.ts', 'nexowatt.energy-origin-ledger.v1', '15-Minuten Herkunftsledger vorhanden');
need('src-ts/runtime-executables/main.ts', "ensurePlainObj('energyLedger'", 'Default-Config energyLedger');
requirePackageVersionAtLeast('0.8.27', 'Paketversion >= 0.8.27');
console.log('[energy-ledger] OK: Legacy-Ledger und Home/Pro-Energieherkunftsgrundlage sind statisch abgesichert.');
