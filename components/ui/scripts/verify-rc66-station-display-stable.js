#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = message => {
  console.error(`[rc66-station-display] FEHLER: ${message}`);
  process.exit(1);
};
const mustContain = (rel, needle, message) => {
  if (!read(rel).includes(needle)) fail(`${message || needle} fehlt in ${rel}`);
};
const mustNotContain = (rel, needle, message) => {
  if (read(rel).includes(needle)) fail(`${message || needle} darf in ${rel} nicht enthalten sein`);
};

const pkg = JSON.parse(read('package.json'));
const parseSemver = value => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(value || '').trim());
  return match ? match.slice(1).map(Number) : null;
};
const isVersionAtLeast = (actualValue, minimumValue) => {
  const actual = parseSemver(actualValue);
  const minimum = parseSemver(minimumValue);
  if (!actual || !minimum) return false;
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] === minimum[index]) continue;
    return actual[index] > minimum[index];
  }
  return true;
};
if (!isVersionAtLeast(pkg.version, '0.8.191')) {
  fail(`Paketversion muss mindestens 0.8.191 sein, ist aber ${pkg.version || 'unbekannt'}`);
}

const logoRel = 'www/assets/nexowatt-eos-logo-wide.png';
const logoPath = path.join(root, logoRel);
if (!fs.existsSync(logoPath)) fail(`Logo fehlt: ${logoRel}`);
const logo = fs.readFileSync(logoPath);
if (logo.length < 20000 || logo.length > 500000) fail(`Logo-Dateigröße unplausibel: ${logo.length} Byte`);
if (logo.toString('hex', 1, 4) !== '504e47') fail('Logo ist keine PNG-Datei');
const width = logo.readUInt32BE(16);
const height = logo.readUInt32BE(20);
if (width < 600 || height < 250 || width <= height) fail(`Logo-Abmessungen unplausibel: ${width}x${height}`);

mustContain('www/dc-station-display.html', '/static/assets/nexowatt-eos-logo-wide.png', 'Logo im Ladebildschirm');
mustContain('www/dc-station-display.html', 'rel="preload" as="image"', 'Logo-Preload');
mustContain('src-ts/runtime-executables/www/dc-station-display.ts', '/static/assets/nexowatt-eos-logo-wide.png', 'Logo in der Runtime');
// The authenticated profile caches inert assets on demand; it never pre-caches protected HTML.
const cacheContract = { self: { location: { origin: 'https://eos.example' }, addEventListener() {} }, URL };
vm.runInNewContext(read('src-ts/runtime-executables/www/sw.ts') + '\nglobalThis.permits = isPublicAsset;', cacheContract);
if (!cacheContract.permits(new URL('https://eos.example/static/assets/nexowatt-eos-logo-wide.png'))) fail('Öffentliches Logo muss cachefähig bleiben.');
for (const protectedPath of ['/dc-station-display.html', '/api/state.json']) {
  if (cacheContract.permits(new URL('https://eos.example' + protectedPath))) fail('Geschützter Inhalt darf nicht im Assetcache landen.');
}
const swSource = read('src-ts/runtime-executables/www/sw.ts');
const cacheVersionMatch = /nexowatt-cache-v(\d+)/.exec(swSource);
if (!cacheVersionMatch || Number(cacheVersionMatch[1]) < 481) {
  fail(`Service-Worker-Cachekennung muss mindestens v481 sein, gefunden: ${cacheVersionMatch ? cacheVersionMatch[0] : 'keine'}`);
}

mustNotContain('www/dc-station-display.html', 'CSV', 'CSV-Schaltfläche im HTML');
mustNotContain('src-ts/runtime-executables/www/dc-station-display.ts', 'operator.csv', 'CSV-Link in der Stationsoberfläche');
mustNotContain('src-ts/runtime-executables/www/dc-station-display.ts', 'csvExport', 'CSV-Bedienelement in der Stationsoberfläche');
// Der Service-/Adminexport bleibt ausdrücklich erhalten.
mustContain('src-ts/runtime-executables/main.ts', "app.get('/api/display/station/:token/operator.csv'", 'CSV-Service-Route');

for (const [needle, message] of [
  ['derivePresentationModel', 'abgeleitete Entscheidung/Warnung'],
  ['withPresentationModel', 'sicheres View-Modell'],
  ['renderStatusStrip', 'kompakte Statusleiste'],
  ['renderSummary', 'Stationszusammenfassung'],
  ['renderDecisionPanel', 'EOS-Entscheidungsbereich'],
  ['renderWarningsPanel', 'Warnungs-/Fehlerbereich'],
  ['connectorLayout', 'dynamisches Mehr-LP-Layout'],
  ['--lp-columns', 'dynamische Spaltenzahl'],
  ['vehicleSocPct', 'Fahrzeug-SoC auf der Stationsseite'],
  ['hardwareCommandConfirmed', 'Aktorbestätigung in der Diagnose'],
  ['mappingIssues', 'Zuordnungsfehler in der Diagnose'],
  ['directHardwareWrite', 'Single-Writer-Hinweis'],
]) mustContain('src-ts/runtime-executables/www/dc-station-display.ts', needle, message);

for (const [needle, message] of [
  ['body{overflow:hidden}', 'kein Desktop-Seitenscrollen'],
  ['grid-template-columns:repeat(var(--lp-columns,1)', 'dynamisches LP-Raster'],
  ['data-density="dense"', 'kompakte Darstellung großer Stationen'],
  ['max-height:840px', 'kurzer 16:9-Kioskmodus'],
  ['nw-status-strip', 'Statusleisten-Design'],
  ['nw-summary-grid', 'Übersichtskarten'],
  ['nw-insights-grid', 'Entscheidung und Warnungen'],
  ['nw-energy-split', 'Solar-/Netzanteil pro Session'],
]) mustContain('www/dc-station-display.css', needle, message);

for (const needle of [
  'stationMaxPowerW',
  'tariffActive',
  'gridCapBinding',
  'phaseCapBinding',
  'para14aBinding',
  'storageAssistActive',
  'staleMeter',
  'staleBudget',
  'goalTariffOverride',
  'availabilityOwner',
]) mustContain('src-ts/runtime-executables/main.ts', needle, `Display-Payload ${needle}`);

mustContain('src-ts/runtime-executables/main.ts', "require('./lib/station-display-presentation')", 'typisierter Stationsdisplay-Präsentationshelfer');
mustContain('src-ts/runtime-executables/main.ts', 'summary: presentation.summary', 'typisierte Stationszusammenfassung im Backend-Payload');
mustContain('src-ts/runtime-executables/main.ts', 'decisionLines: presentation.decisionLines', 'typisierte EOS-Entscheidungsgründe im Backend-Payload');
mustContain('src-ts/runtime-executables/main.ts', 'warnings: presentation.warnings', 'typisierte Warnungen im Backend-Payload');
mustContain('src-ts/runtime-executables/main.ts', 'vehicleStateNormalized', 'normalisierter Fahrzeugzustand im LP-Diagnosepayload');
for (const [needle, message] of [
  ['shortDecision', 'verständliche Kurzentscheidung'],
  ['decisionLines: decisionLines.slice(0, 8)', 'strukturierte EOS-Entscheidungsgründe'],
  ['warnings: warnings.slice(0, 12)', 'strukturierte Warnungen'],
  ['never\n * writes states', 'read-only Präsentationsvertrag'],
]) mustContain('src-ts/runtime-executables/lib/station-display-presentation.ts', needle, message);

if (pkg.scripts?.['test:rc66-station-display-browser'] !== 'node scripts/verify-rc66-station-display-browser.js') {
  fail('RC66-Browsertest ist nicht im Paket-Skriptvertrag registriert.');
}
if (!fs.existsSync(path.join(root, 'scripts/verify-rc66-station-display-browser.js'))) {
  fail('RC66-Browsertestdatei fehlt.');
}

if (!(pkg.files || []).includes(logoRel)) fail(`${logoRel} fehlt in package.json.files`);
if (!(pkg.files || []).includes('lib/station-display-presentation.js')) fail('typisierter Präsentationshelfer fehlt in package.json.files');

// Browser-Runtime muss als JavaScript parsebar sein; dabei wird sie nicht ausgeführt.
try {
  new vm.Script(read('www/dc-station-display.js'), { filename: 'www/dc-station-display.js' });
} catch (error) {
  fail(`Stations-Runtime ist syntaktisch ungültig: ${error.message}`);
}

console.log(`[rc66-station-display] OK: modernes Vollbildlayout, NexoWatt-Branding, Mehr-LP-Raster, Status-/Entscheidungsdiagnose, kein CSV-UI und Single-Writer-Vertrag sind abgesichert (${width}x${height}, ${logo.length} Byte).`);
