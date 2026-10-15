'use strict';
// Called by check-r9-runtime.cjs after manifest-bound byte inspection.
// Only local validator code and fixed schemas run. No adapter/server entry.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
assert.equal(process.argv.length, 3);
const app = process.argv[2];
const ocpp = path.join(app, 'node_modules/ocpp-rpc');
const { createValidator } = require(path.join(ocpp, 'lib/validator.js'));
const standard = require(path.join(ocpp, 'lib/standard-validators.js'));
const results = [];
assert.deepEqual(standard.map(v => v.subprotocol), ['ocpp1.6', 'ocpp2.0.1', 'ocpp2.1']);
for (const v of standard) assert.notEqual(v._ajv.opts.$data, true);
results.push('all_three_bundled_validators_load_without_data_option');
const heartbeat = standard[0];
assert.equal(heartbeat.validate('urn:Heartbeat.req', {}), true);
assert.throws(() => heartbeat.validate('urn:Heartbeat.req', { injected: true }));
results.push('valid_heartbeat_accepted_extra_property_rejected');
let dataKeys = 0;
function walk(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) { if (key === '$data') dataKeys++; walk(child); }
}
for (const name of ['ocpp1_6.json', 'ocpp2_0_1.json', 'ocpp2_1.json'])
  walk(JSON.parse(fs.readFileSync(path.join(ocpp, 'lib/schemas', name), 'utf8')));
assert.equal(dataKeys, 0);
results.push('bundled_schemas_have_no_data_references');
assert.throws(() => createValidator('probe', [{
  $id: 'urn:eos:probe', type: 'object', properties: {
    pattern: { type: 'string' }, value: { type: 'string', pattern: { $data: '1/pattern' } }
  }
}]), /schema is invalid/);
results.push('dynamic_data_pattern_schema_rejected_by_actual_factory');
// Regression evidence for NOT doing a blind fixed-version override.
const CurrentAjv = require(path.join(app, 'node_modules/ajv'));
assert.equal(require(path.join(app, 'node_modules/ajv/package.json')).version, '8.20.0');
const legacySchemas = JSON.parse(fs.readFileSync(path.join(ocpp, 'lib/schemas/ocpp1_6.json'), 'utf8'));
assert.throws(() => new CurrentAjv({ strictSchema: false }).addSchema(legacySchemas), /URN|URI|urn/);
results.push('blind_ajv_820_override_reproduces_legacy_urn_failure');
process.stdout.write(JSON.stringify({ ok: true, checks: results, groupsPassed: results.length,
  maximumProcessTimeMs: 5000, networkListenersStarted: false, adapterEntryPointsExecuted: false }));
