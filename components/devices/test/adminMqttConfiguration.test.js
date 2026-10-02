'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Admin MQTT Client-ID suggestions use the current instance and match runtime templates', () => {
  const source = fs.readFileSync(path.join(__dirname, '../admin/index_m.js'), 'utf8');
  const start = source.indexOf('function mqttClientIdFromTemplate(');
  const end = source.indexOf('\nfunction parseMqttUrlForForm(', start);
  assert.ok(start >= 0 && end > start);
  const template = require('../lib/templates.json').templates.find(t => t.id === 'ess.tesvolt.iotGateway.mqttV2');
  for (const instance of [0, 1, '12']) {
    const context = { instance };
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(context.mqttClientIdFromTemplate(template.driverHints.mqtt.defaultClientId, 'ess1'),
      `nexowatt-tesvolt-nexowatt-devices-${instance}-ess1`);
    assert.equal(context.mqttClientIdFromTemplate('custom-{instance}-{deviceId}', 'my storage'),
      `custom-${instance}-my-storage`);
  }
});

test('JSON Admin exposes fixed TESVOLT namespaces and starts with control disabled', () => {
  const fields = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (value.attr) fields.push(value);
    Object.values(value).forEach(walk);
  };
  walk(require('../admin/jsonConfig.json'));
  const mode = fields.find(f => f.attr === 'connection.tesvoltTopicMode');
  const control = fields.find(f => f.attr === 'connection.tesvoltControlEnabled');
  assert.deepEqual(mode.options.map(o => o.value), ['auto', 'ems', 'v2']);
  assert.equal(mode.default, 'auto');
  assert.equal(control.default, false);
});
