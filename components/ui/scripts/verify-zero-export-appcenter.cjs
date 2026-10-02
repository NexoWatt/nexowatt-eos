#!/usr/bin/env node
'use strict';

/**
 * Netzlimits-AppCenter: Prüft echte Lade-/Editier-/Speicherpfade in einem kleinen
 * DOM-Modell. Verhindert, dass alte exportLimit*-Aliase eine sichtbare Freigabe
 * oder 0-W-Grenze beim Speichern wieder überschreiben. Keine Hardwarezugriffe.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourceFiles = [
  'src-ts/runtime-executables/www/ems-apps.ts',
  'src-ts/runtime-mirrors/www/ems-apps.ts',
];

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.handlers = {}; this.textContent = ''; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(name, callback) { this.handlers[name] = callback; }
  setAttribute(name, value) { this[name] = value; }
  set innerHTML(_value) { this.children = []; }
  querySelector(tag) { return this.children.find((child) => child.tag === tag) || this.children.map((child) => child.querySelector(tag)).find(Boolean) || null; }
  byId(id) { return this.id === id ? this : this.children.map((child) => child.byId(id)).find(Boolean); }
  text() { return [this.textContent, ...this.children.map((child) => child.text())].join(' '); }
}

function extract(source, names) {
  const file = ts.createSourceFile('ems-apps.ts', source, ts.ScriptTarget.Latest, true);
  const found = {};
  let saveStatement = '';
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) found[node.name.text] = node.getText(file);
    if (ts.isExpressionStatement(node) && node.getText(file).startsWith('patch.gridConstraints =')) saveStatement = node.getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file);
  for (const name of names) assert.ok(found[name], `${name} fehlt`);
  assert.ok(saveStatement.includes('_normalizeGridExportControlCfg'), 'Save muss denselben Alias-Vertrag anwenden');
  return { code: names.map((name) => found[name]).join('\n'), saveStatement };
}

async function check(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const extracted = extract(source, ['_normalizeGridExportControlCfg', '_ensureGridConstraintsCfg', 'buildGridConstraintsUI']);
  const zero = new Element('div');
  const evuPv = new Element('div');
  const states = {
    'ems.zeroExportPv.active': { value: true },
    'ems.zeroExportPv.status': { value: 'observing' },
    'ems.zeroExportPv.reason': { value: 'test-current-pv-response' },
    'ems.zeroExportPv.owner': { value: 'evcs:1' },
    'ems.zeroExportPv.probeW': { value: 1380 },
    'ems.zeroExportPv.operatingMarginW': { value: 80 },
    'ems.zeroExportPv.energyWh': { value: 1.25 },
    'ems.zeroExportPv.validUntil': { value: Date.now() + 1000 },
  };
  const context = vm.createContext({
    currentConfig: { gridConstraints: {} },
    els: { gridConstraintsZero: zero, gridConstraintsPvCurtail: evuPv },
    document: { createElement: (tag) => new Element(tag), createTextNode: (text) => Object.assign(new Element('text'), { textContent: text }) },
    fetchJson: async () => states,
    scheduleValidation() {},
    deepMerge: (...args) => Object.assign({}, ...args),
  });
  vm.runInContext(ts.transpile(extracted.code, { target: ts.ScriptTarget.ES2022 }), context);
  const normalize = context._normalizeGridExportControlCfg;
  assert.equal(normalize({}).zeroExportProbeMaxW, 4200);
  assert.equal(normalize({ zeroExportProbeMaxW: 0 }).zeroExportProbeMaxW, 0);
  assert.equal(normalize({ zeroExportProbeMaxW: -50 }).zeroExportProbeMaxW, 0);
  assert.equal(normalize({ zeroExportProbeMaxW: 99000 }).zeroExportProbeMaxW, 50000);
  assert.equal(normalize({ zeroExportProbeMaxW: 'invalid' }).zeroExportProbeMaxW, 4200);
  assert.equal(normalize({ exportLimitMaxFeedInW: '', zeroExportMaxExportW: 300 }).exportLimitMaxFeedInW, 300);
  assert.equal(normalize({ exportLimitMaxFeedInW: -1, zeroExportMaxExportW: 500 }).exportLimitMaxFeedInW, 500);
  assert.equal(normalize({ zeroExportRunMode: 'test' }).exportLimitRunMode, 'diagnostic');

  context.currentConfig.gridConstraints = {
    zeroExportEnabled: true,
    exportLimitInstallerApproved: false,
    zeroExportInstallerApproved: true,
    exportLimitMaxFeedInW: 0,
    zeroExportMaxExportW: 6000,
    fallbackExportPowerW: 5000,
  };
  context.buildGridConstraintsUI();
  let gc = context.currentConfig.gridConstraints;
  assert.equal(gc.zeroExportInstallerApproved, false, 'Angezeigte Freigabe entspricht wirksamer kanonischer Freigabe');
  assert.equal(gc.zeroExportMaxExportW, 0, 'Kanonische 0 darf nicht als fehlend behandelt werden');
  assert.equal(gc.fallbackExportPowerW, 0);
  assert.equal(zero.byId('gc_zeroExportBiasW').value, '80', 'Bias zeigt den Runtime-Standard');
  assert.equal(zero.byId('gc_zeroExportDeadbandW').value, '50', 'Deadband zeigt den Runtime-Standard');
  assert.equal(zero.byId('gc_zero_tuning').tag, 'details');
  assert.equal(zero.byId('gc_zero_tuning').open, undefined, 'Expertenparameter standardmäßig geschlossen');
  assert.equal(zero.byId('gc_zero_commands').tag, 'details');
  assert.equal(zero.byId('gc_zero_legacy').tag, 'details');
  const approval = zero.byId('gc_zeroExportInstallerApproved');
  assert.equal(approval.checked, false);
  approval.checked = true;
  approval.handlers.change();
  const limit = zero.byId('gc_zeroExportMaxExportW');
  limit.value = '700';
  limit.handlers.change();
  const probe = zero.byId('gc_zeroExportProbeMaxW');
  assert.equal(probe.min, '0');
  assert.equal(probe.max, '50000');
  probe.value = '0';
  probe.handlers.change();
  vm.runInContext('var patch = {}; ' + extracted.saveStatement, context);
  assert.equal(context.patch.gridConstraints.exportLimitInstallerApproved, true);
  assert.equal(context.patch.gridConstraints.zeroExportInstallerApproved, true);
  assert.equal(context.patch.gridConstraints.exportLimitMaxFeedInW, 700);
  assert.equal(context.patch.gridConstraints.zeroExportMaxExportW, 700);
  assert.equal(context.patch.gridConstraints.zeroExportProbeMaxW, 0);
  const toggle = zero.byId('gc_zeroExportEnabled');
  toggle.checked = false;
  toggle.handlers.change();
  vm.runInContext(extracted.saveStatement, context);
  assert.equal(context.patch.gridConstraints.exportLimitInstallerApproved, false, 'Abschalten widerruft beide Freigabe-Aliase');
  assert.equal(context.patch.gridConstraints.zeroExportInstallerApproved, false);
  assert.equal(context.patch.gridConstraints.zeroExportEnabled, false);

  gc.zeroExportEnabled = true;
  context.buildGridConstraintsUI();
  await new Promise((resolve) => setImmediate(resolve));
  const visible = zero.text();
  for (const text of ['gemeinsames Leistungsbudget', 'kurzzeitig Netzstrom oder Speicherenergie', 'Auto PV 1p/3p', 'observing', 'evcs:1', '1.25 Wh', '80 W', 'zählt nicht als PV-Überschuss']) assert.ok(visible.includes(text), `${relativePath}: ${text} fehlt`);
  delete states['ems.zeroExportPv.active'];
  context.buildGridConstraintsUI();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(zero.text().includes('Noch keine Runtime-Daten'), 'Fehlende Diagnose ist nicht Aktiv=false');

  // Echte Editor-Ereignisse: WR-Messung und Schreibziele überleben jeden
  // Neuzeichnungs-/Speicherzyklus, unabhängig von EVU-/0-Einspeise-Aktivierung.
  gc.zeroExportBiasW = 0;
  gc.zeroExportDeadbandW = 0;
  gc.pvEvuEnabled = true;
  gc.zeroExportEnabled = false;
  gc.pvCurtailInvertersZero = [{ name: 'Dach', kwp: '5,5', pvPowerReadId: 'wr.actual', pvLimitWId: 'wr.setW' }];
  gc.pvCurtailInvertersEvu = [{ name: 'EVU', kwp: 4, pvPowerReadId: 'evu.actual', pvLimitPctId: 'evu.setPct' }];
  context.buildGridConstraintsUI();
  gc = context.currentConfig.gridConstraints;
  assert.equal(gc.pvCurtailInvertersZero[0].kwp, 5.5, 'Deutsches Dezimalkomma bleibt gültig');
  assert.equal(zero.byId('gc_zero_inv_0_pvRead').value, 'wr.actual');
  assert.equal(zero.byId('gc_zero_inv_0_limitW').value, 'wr.setW');
  assert.ok(evuPv.byId('gc_evu_inv_0_pvRead'), 'EVU-Zuordnung bleibt im EVU-Bereich');
  assert.ok(!evuPv.byId('gc_zero_inv_0_pvRead'), '0-Einspeise-Zuordnung nur im Netzlimits-Bereich');
  const mappedRead = zero.byId('gc_zero_inv_0_pvRead');
  mappedRead.value = 'wr.updatedActual';
  mappedRead.handlers.change();
  const mappedWrite = zero.byId('gc_zero_inv_0_limitW');
  mappedWrite.value = 'wr.updatedSetW';
  mappedWrite.handlers.change();
  const add = zero.byId('gc_zero_inverters').children.flatMap((child) => child.children).find((child) => child.tag === 'button' && child.textContent === 'Wechselrichter hinzufügen');
  assert.ok(add, 'WR kann unter Netzlimits bei ausgeschalteter Regelung hinzugefügt werden');
  add.handlers.click();
  assert.equal(gc.pvCurtailInvertersZero.length, 2);
  assert.equal(zero.byId('gc_zero_inv_0_pvRead').value, 'wr.updatedActual', 'Hinzufügen verwirft keine Messung');
  assert.equal(zero.byId('gc_zero_inv_0_limitW').value, 'wr.updatedSetW');
  assert.equal(gc.pvCurtailInvertersEvu[0].pvPowerReadId, 'evu.actual');
  gc.zeroExportEnabled = true;
  context.buildGridConstraintsUI();
  assert.equal(zero.byId('gc_zeroExportBiasW').value, '0');
  assert.equal(zero.byId('gc_zeroExportDeadbandW').value, '0');
  vm.runInContext(extracted.saveStatement, context);
  assert.equal(context.patch.gridConstraints.pvCurtailInvertersZero[0].pvPowerReadId, 'wr.updatedActual');
  assert.equal(context.patch.gridConstraints.pvCurtailInvertersZero[0].pvLimitWId, 'wr.updatedSetW');
  const legacyMode = zero.byId('gc_legacy_mode');
  legacyMode.value = 'pvLimitW';
  legacyMode.handlers.change();
  const legacyRating = zero.byId('gc_legacy_ratedPowerW');
  legacyRating.value = '10000';
  legacyRating.handlers.change();
  const legacyWrite = zero.byId('gc_legacy_pvW');
  legacyWrite.value = 'legacy.outputW';
  legacyWrite.handlers.change();
  context.buildGridConstraintsUI();
  assert.equal(zero.byId('gc_legacy_pvW').value, 'legacy.outputW', 'Legacy-Editor muss echte Backend-Felder speichern');
  vm.runInContext(extracted.saveStatement, context);
  assert.equal(context.patch.gridConstraints.pvCurtailMode, 'pvLimitW');
  assert.equal(context.patch.gridConstraints.pvLimitWId, 'legacy.outputW');
  assert.equal(context.patch.gridConstraints.pvRatedPowerW, 10000);
  assert.equal(context.patch.gridConstraints.pvCurtailLegacy, undefined);
  const allIds = [];
  const walk = (node) => { if (node.id) allIds.push(node.id); node.children.forEach(walk); };
  walk(zero); walk(evuPv);
  assert.equal(new Set(allIds).size, allIds.length, 'Keine doppelten IDs zwischen WR-Gruppen');
  await new Promise((resolve) => setImmediate(resolve));
  const diagnose = zero.byId('gc_zero_status').children[1].children.find((child) => child.className === 'nw-help');
  assert.ok(diagnose.children.some((child) => child.tag === 'details' && !child.open), 'Lange Runtime-Diagnose bleibt eingeklappt');
  context.currentConfig.gridConstraints = { pvCurtailLegacy: { mode: 'pvPct', pvLimitPctId: 'old.pct', pvLimitWId: 'old.w' }, pvLimitWId: '' };
  context._ensureGridConstraintsCfg();
  assert.equal(context.currentConfig.gridConstraints.pvLimitPctId, 'old.pct', 'Alter Entwurf nur bei fehlendem kanonischem Feld migriert');
  assert.equal(context.currentConfig.gridConstraints.pvLimitWId, '', 'Explizit leere Zuordnung bleibt leer');
  assert.equal(context.currentConfig.gridConstraints.pvCurtailMode, 'pvLimitPct', 'Legacy-Modus auf echten Regler-Vertrag normalisiert');


}

(async () => {
  const html = fs.readFileSync(path.join(root, 'www/ems-apps.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'www/styles.css'), 'utf8');
  assert.ok(html.includes('class="nw-config-card nw-zero-card"'), '0-Einspeisung hat eigene vollständige Karte');
  assert.match(css, /#nw-tabpanel-grid \.nw-zero-card\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/, 'Karte über alle Rasterspalten');
  for (const relativePath of sourceFiles) await check(relativePath);
  console.log('[zero-export-appcenter] OK: Alias-/Save-Vertrag, komplette Kartenbreite, WR-Zuordnung/Neuzeichnen, Messwerte, Defaults und aufklappbare Diagnose in Quelle/Typed Mirror.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
