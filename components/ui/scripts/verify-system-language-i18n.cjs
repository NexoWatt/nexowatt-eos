#!/usr/bin/env node
'use strict';

/**
 * Prüft den DE/NL-Systemsprachvertrag des NexoWatt UI-Adapters.
 *
 * Die Systemsprache stammt aus system.config.common.language. Sprache und
 * Länderprofil bleiben getrennt: NL-Sprache übersetzt die UI, das NL-Marktprofil
 * aktiviert P1/DSMR und deaktiviert die ausschließlich deutsche §14a-App.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failures = 0;

function rel(p) { return String(p).replace(/\\/g, '/'); }
function fail(message) { failures += 1; console.error(`[system-language-i18n] ERROR: ${message}`); }
function ok(message) { console.log(`[system-language-i18n] OK: ${message}`); }
function read(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { fail(`Pflichtdatei fehlt: ${file}`); return ''; }
  return fs.readFileSync(abs, 'utf8');
}
function readJson(file) {
  try { return JSON.parse(read(file)); }
  catch (error) { fail(`Ungültiges JSON in ${file}: ${error.message}`); return {}; }
}
function requireContains(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} fehlt: ${needle}`);
}

const localeSource = read('src-ts/runtime-executables/www/nw-i18n.ts');
const mainSource = read('src-ts/runtime-executables/main.ts');
const countryModule = read('src-ts/runtime-executables/ems/modules/country-profile.ts');
const localeApiSource = read('src-ts/runtime-executables/ems/services/locale-api-service.ts');
const moduleManager = read('src-ts/runtime-executables/ems/module-manager.ts');
const appSource = read('src-ts/runtime-executables/www/app.ts');
const swSource = read('src-ts/runtime-executables/www/sw.ts');
const nlCatalog = readJson('www/i18n/nl.json');
const deCatalog = readJson('www/i18n/de.json');
const enCatalog = readJson('www/i18n/en.json');

const profileService = require(path.join(root, 'ems', 'services', 'country-profile-service.js'));
const nlProfile = profileService.getConfiguredCountryProfile({ countryProfile: { country: 'NL' } });
if (nlProfile.country !== 'NL' || nlProfile.supportsP1Dsmr !== true || nlProfile.supportsParagraph14a !== false) {
  fail('NL-Marktprofil aktiviert P1/DSMR bzw. deaktiviert §14a nicht korrekt.');
}
const nlLocale = profileService.buildLocaleInfo({ countryProfile: { country: 'NL' } }, 'nl', 'system.config.common.language');
if (nlLocale.language !== 'nl' || nlLocale.htmlLang !== 'nl' || nlLocale.country !== 'NL') {
  fail('NL-Locale wird nicht korrekt aus Systemsprache und Marktprofil gebildet.');
}

requireContains(mainSource, "app.get('/api/locale'", 'Locale-API');
requireContains(localeApiSource, "await adapter._nwRefreshSystemLanguage('api-locale')", 'Live-Neuladen der Systemsprache');
requireContains(localeSource, "system.config.common.language", 'Dokumentierter Systemsprachvertrag');
requireContains(localeSource, "POLL_INTERVAL_MS = 3000", 'Sprach-Polling');
requireContains(localeSource, "global.__nwLocale", 'Frontend-Locale-Snapshot');
requireContains(localeSource, "nexowatt:languagechange", 'Live-Sprachwechsel-Event');
requireContains(localeSource, "data-nw-market", 'Marktprofil-Sichtbarkeit');
requireContains(countryModule, "< 5000", 'Country-Profile-Aktualisierung');
requireContains(moduleManager, 'supportsParagraph14a === true', '§14a-Marktgating');
requireContains(moduleManager, "key: 'nlP1'", 'NL-P1/DSMR-Modul');
requireContains(swSource, "'nw-i18n.js'", 'Service-Worker I18N-Runtime');
requireContains(swSource, "'i18n/nl.json'", 'Service-Worker NL-Katalog');

if (appSource.includes('return nwUiLocaleTag();')) fail('Rekursiver Locale-Fallback in www/app.ts gefunden.');

const htmlDir = path.join(root, 'www');
const htmlPages = fs.readdirSync(htmlDir).filter((name) => name.endsWith('.html'));
for (const page of htmlPages) {
  const html = read(path.join('www', page));
  if (page === 'dc-station-display.html') {
    const stationSource = read('src-ts/runtime-executables/www/dc-station-display.ts');
    if (!stationSource.includes("nl: {")) fail('DC-Stationsdisplay enthält keinen niederländischen Sprachkatalog.');
    continue;
  }
  if (!html.includes('/static/nw-i18n.js')) fail(`${page} lädt die zentrale I18N-Runtime nicht.`);
}

for (const [name, catalog] of [['de', deCatalog], ['nl', nlCatalog], ['en', enCatalog]]) {
  if (!catalog.meta || catalog.meta.language !== name) fail(`${name}.json hat keine passende meta.language.`);
  if (!catalog.text || typeof catalog.text !== 'object') fail(`${name}.json enthält keine Texttabelle.`);
  if (!Array.isArray(catalog.patterns)) fail(`${name}.json enthält keine Pattern-Liste.`);
}

const requiredNl = {
  'Systemstatus': 'Systeemstatus',
  'Alle Systeme normal': 'Alle systemen werken normaal',
  'Netzbezug': 'Netafname',
  'Netzeinspeisung': 'Teruglevering',
  'Eigenverbrauch': 'Eigen verbruik',
  'Speicher': 'Batterij',
  'Ladestation': 'Laadstation',
  'Lademanagement': 'Laadbeheer',
  'Einstellungen': 'Instellingen',
  'Historie': 'Historie',
  'Speicherfarm': 'Batterijfarm',
  'App-Center': 'App-center',
  'Deutschland': 'Duitsland',
  'Niederlande': 'Nederland',
};
for (const [source, expected] of Object.entries(requiredNl)) {
  const actual = nlCatalog.text && nlCatalog.text[source];
  if (actual !== expected) fail(`NL-Übersetzung ${JSON.stringify(source)}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}.`);
}

const requiredMarketFiles = {
  'www/index.html': ['data-nw-market="DE"'],
  'www/settings.html': ['data-nw-market="DE"'],
  'www/ems-apps.html': ['data-tab="para14a"', 'data-nw-market="DE"'],
};
for (const [file, needles] of Object.entries(requiredMarketFiles)) {
  const text = read(file);
  for (const needle of needles) requireContains(text, needle, `${file} Marktkennzeichnung`);
}

const localeAwareSources = [
  'src-ts/runtime-executables/www/app.ts',
  'src-ts/runtime-executables/www/report-common.ts',
  'src-ts/runtime-executables/www/evcs-report.ts',
  'src-ts/runtime-executables/www/rfid-report.ts',
];
for (const file of localeAwareSources) {
  const text = read(file);
  requireContains(text, 'NexoWattI18n', `${file} dynamische Locale`);
  const hardcoded = text.split(/\r?\n/).filter((line) => /toLocale(?:String|DateString|TimeString)\(['"]de-DE['"]|new Intl\.NumberFormat\(['"]de-DE['"]/.test(line));
  if (hardcoded.length) fail(`${file} enthält noch fest verdrahtete de-DE-Ausgabe: ${hardcoded[0].trim()}`);
}

if (failures) {
  console.error(`[system-language-i18n] FEHLGESCHLAGEN: ${failures} Problem(e).`);
  process.exit(1);
}

ok(`${htmlPages.length} HTML-Seiten, Locale-API, Marktprofil und DE/NL-Kataloge geprüft.`);
