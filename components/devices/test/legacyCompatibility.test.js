'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const helper = require('./helpers/compatibilityHarness.cjs');
const templatesDoc = JSON.parse(fs.readFileSync(path.join(root, 'lib/templates.json'), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(
  path.join(root, 'test/fixtures/legacy-compatibility-v0.5.143.json'),
  'utf8',
));
const approvedAdditionsDoc = JSON.parse(fs.readFileSync(
  path.join(root, 'test/fixtures/approved-additive-templates.json'),
  'utf8',
));
const approvedDatapointsDoc = JSON.parse(fs.readFileSync(
  path.join(root, 'test/fixtures/approved-additive-datapoints.json'),
  'utf8',
));
const DeviceRuntime = helper.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));

function templateById(id) {
  const template = templatesDoc.templates.find((entry) => entry && entry.id === id);
  assert.ok(template, `missing template ${id}`);
  return template;
}

test('Alias Contract v1 is additive: all 181 production templates remain unchanged and approved new templates are appended', () => {
  assert.equal(baseline.baselineAdapterVersion, '0.5.143');

  assert.equal(approvedAdditionsDoc.schemaVersion, 1);
  assert.equal(approvedDatapointsDoc.schemaVersion, 1);
  const approvedAdditions = approvedAdditionsDoc.templates;
  const approvedDatapoints = approvedDatapointsDoc.templates || {};
  assert.ok(Array.isArray(approvedAdditions));
  const currentIds = templatesDoc.templates.map((template) => template.id).sort();
  const baselineIds = Object.keys(baseline.templates).sort();
  assert.deepEqual(
    currentIds,
    [...baselineIds, ...approvedAdditions].sort(),
    'template catalogue contains an unapproved addition or lost production template',
  );

  for (const templateId of baselineIds) {
    const template = templateById(templateId);
    const expected = baseline.templates[templateId];
    const additiveIds = Array.isArray(approvedDatapoints[templateId])
      ? approvedDatapoints[templateId].map(String)
      : [];
    assert.ok(expected, `${templateId}: missing compatibility baseline`);
    assert.equal(
      Array.isArray(template.datapoints) ? template.datapoints.length : 0,
      expected.datapointCount + additiveIds.length,
      `${templateId}: datapoint count changed`,
    );

    const comparisonTemplate = structuredClone(template);
    if (additiveIds.length) {
      const approved = new Set(additiveIds);
      const currentIds = comparisonTemplate.datapoints.map((dp) => String(dp && dp.id || ''));
      for (const id of approved) {
        assert.equal(currentIds.filter((candidate) => candidate === id).length, 1, `${templateId}: approved additive datapoint ${id} missing or duplicated`);
      }
      comparisonTemplate.datapoints = comparisonTemplate.datapoints.filter((dp) => !approved.has(String(dp && dp.id || '')));
      assert.equal(comparisonTemplate.datapoints.length, expected.datapointCount, `${templateId}: an unapproved existing datapoint was added/removed`);
    }
    assert.equal(
      helper.templateCompatibilityHash(comparisonTemplate),
      expected.templateHash,
      `${templateId}: existing raw template/register definition changed; only explicitly approved additive datapoints are allowed`,
    );
  }
});

test('Alias Contract v1 does not rename, remove or alter any pre-existing aliases.* definition', () => {
  for (const templateId of Object.keys(baseline.templates)) {
    const template = templateById(templateId);
    const expected = baseline.templates[templateId];
    const actual = helper.legacyAliasCompatibility(DeviceRuntime, template);
    assert.equal(actual.count, expected.count, `${template.id}: legacy alias count changed`);
    assert.equal(
      actual.hash,
      expected.hash,
      `${template.id}: legacy alias path/target/type/role/unit/write conversion changed`,
    );
  }
});

test('standard aliases are isolated below aliases.v1 and metadata below aliases.meta', () => {
  for (const template of templatesDoc.templates) {
    const runtime = helper.buildRuntime(DeviceRuntime, template, 'isolation');
    const definitions = runtime._buildAliasDefinitions();
    const legacy = definitions.filter((def) => {
      const pathName = helper.extractLegacyPath(def && def.relId);
      return pathName && !pathName.startsWith('v1.') && !pathName.startsWith('meta.');
    });
    assert.ok(legacy.every((def) => def.aliasContractVersion === undefined), `${template.id}: v1 metadata leaked into legacy alias definition`);
    assert.ok(legacy.every((def) => def.compatibilityAlias !== true), `${template.id}: alias migration created a new legacy compatibility state`);
  }
});

test('runtime contains no object-deletion migration for existing installations', () => {
  const runtimeSource = fs.readFileSync(path.join(root, 'lib/deviceRuntime.js'), 'utf8');
  for (const forbidden of ['deleteObjectAsync', 'delObjectAsync', 'deleteStateAsync', 'delStateAsync']) {
    assert.equal(runtimeSource.includes(forbidden), false, `forbidden destructive migration call: ${forbidden}`);
  }
});

test('CHARGER/DC_CHARGER keep their old aliases while only v1 classifies them as solar chargers', () => {
  for (const id of [
    'charger.goodwe.AbstractGoodWeEtCharger',
    'dc_charger.victron.VictronDcChargerImpl',
  ]) {
    const template = templateById(id);
    const runtime = helper.buildRuntime(DeviceRuntime, template, 'solar');
    const definitions = runtime._buildAliasDefinitions();
    const legacyPaths = definitions
      .map((def) => helper.extractLegacyPath(def && def.relId))
      .filter((pathName) => pathName && !pathName.startsWith('v1.') && !pathName.startsWith('meta.'))
      .sort();
    const v1Paths = definitions
      .map((def) => helper.extractLegacyPath(def && def.relId))
      .filter((pathName) => pathName.startsWith('v1.'));

    assert.equal(runtime.aliasDeviceClass, 'solarCharger', id);
    assert.equal(legacyPaths.length, baseline.templates[id].count, `${id}: old alias count changed`);
    if (id.startsWith('charger.goodwe.')) {
      assert.deepEqual(legacyPaths, ['alarm.offline', 'comm.connected', 'comm.lastError', 'r.power']);
    } else {
      assert.deepEqual(legacyPaths, [
        'alarm.fault',
        'alarm.offline',
        'comm.connected',
        'comm.lastError',
        'r.errorCode',
        'r.statusCode',
      ]);
    }
    assert.ok(v1Paths.includes('v1.r.power'), `${id}: canonical solar power path missing`);
    assert.ok(!v1Paths.includes('v1.ctrl.currentLimitA'), `${id}: solar charger exposed as EV current control`);
    assert.ok(!v1Paths.includes('v1.ctrl.run'), `${id}: solar charger exposed as EV run control`);
  }
});
