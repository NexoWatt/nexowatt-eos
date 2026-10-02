'use strict';

// Real modbus-serial TCP transport against an in-process V10.03 register server.
// This validates the wire protocol; it does not emulate a vehicle or charger firmware.
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
let available = false;
try { require.resolve('modbus-serial'); require.resolve('mqtt'); available = true; } catch (_) {}

async function station(t, connector) {
  const base = connector * 0x100;
  const registers = new Map([[0x10, 1], [0x13, 1], [base + 1, 2], [base + 0x20, 1]]);
  const uint32 = (address, value) => { registers.set(address, value >>> 16); registers.set(address + 1, value & 65535); };
  uint32(0x1b, 32000);
  uint32(base + 0x22, 11000);
  uint32(base + 0x11, 10927);
  uint32(base + 0x13, 1810);
  uint32(base + 0x15, 311);
  const frames = [];
  const sockets = new Set();
  const behavior = { ignorePower: false, rejectPower: false };
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    let pending = Buffer.alloc(0);
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 7 && pending.length >= 6 + pending.readUInt16BE(4)) {
        const length = 6 + pending.readUInt16BE(4);
        const frame = pending.subarray(0, length);
        pending = pending.subarray(length);
        const fc = frame[7];
        const address = frame.readUInt16BE(8);
        const count = frame.readUInt16BE(10);
        const item = { fc, address, count, unitId: frame[6] };
        let pdu;
        if (fc === 3 || fc === 4) {
          pdu = Buffer.alloc(2 + count * 2);
          pdu[0] = fc;
          pdu[1] = count * 2;
          for (let i = 0; i < count; i++) pdu.writeUInt16BE(registers.get(address + i) || 0, 2 + i * 2);
        } else if (fc === 16) {
          item.values = Array.from({ length: count }, (_, i) => frame.readUInt16BE(13 + i * 2));
          if (behavior.rejectPower && address === base + 0x22) {
            pdu = Buffer.from([fc | 0x80, 3]);
          } else {
            if (!(behavior.ignorePower && address === base + 0x22)) item.values.forEach((value, i) => registers.set(address + i, value));
            pdu = frame.subarray(7, 12);
          }
        } else {
          pdu = Buffer.from([fc | 0x80, 1]);
        }
        frames.push(item);
        const response = Buffer.alloc(7 + pdu.length);
        frame.copy(response, 0, 0, 7);
        response.writeUInt16BE(pdu.length + 1, 4);
        pdu.copy(response, 7);
        socket.write(response);
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  });
  return { port: server.address().port, frames, behavior };
}

function runtimeFor(t, connector, port) {
  const { DeviceRuntime } = require('../lib/deviceRuntime');
  const { ModbusDriver } = require('../lib/drivers/modbus');
  const template = require('../lib/templates.json').templates.find(t => t.id === `evcs.oem.modbusV1003.connector${connector}`);
  const states = new Map();
  const adapter = {
    namespace: 'nexowatt-devices.0', log: { debug() {}, info() {}, warn() {}, error() {} },
    async setStateAsync(id, state) { states.set(id, state); },
    async getStateAsync(id) { return states.get(id.replace(/^nexowatt-devices\.0\./, '')) || null; },
  };
  for (const [id, val] of Object.entries({ gUN_COUNT: 1, cHARGE_POINT_SET_POWER: 32000, eVSE_STATE: 2, 'aliases.v1.ctrl.run': true })) {
    states.set(`devices.dc.${id}`, { val, ack: true });
  }
  const cfg = { id: 'dc', templateId: template.id, category: 'EVCS', manufacturer: 'DEPower', protocol: 'modbusTcp', connection: {
    host: '127.0.0.1', port, unitId: 7, addressOffset: 1,
    depowerSessionEnergyWhPerTick: 10, depowerTotalEnergyWhPerTick: 1,
  } };
  const runtime = new DeviceRuntime(adapter, cfg, template, {});
  runtime.driver = new ModbusDriver(adapter, cfg, template, {});
  t.after(async () => runtime.driver.disconnect());
  for (const dp of template.datapoints) {
    runtime.dpById.set(dp.id, dp);
    runtime.dpByStateRelId.set(runtime.relStateId(dp), dp);
  }
  runtime.aliasDefs = runtime._buildAliasDefinitions();
  runtime.aliasByStateRelId = new Map(runtime.aliasDefs.map(d => [d.relId, d]));
  runtime._writeQueueEnabled = true;
  runtime._writeThrottleMs = 250;
  runtime._startWriteLoop = () => {};
  runtime._persistSetpointValueIfNeeded = async () => {};
  return { runtime, states, template };
}

for (const connector of [1, 2]) {
  test(`DEPower connector ${connector}: alias -> FC16 4200 W -> FC3 readback and independently scaled energy counters`,
    { skip: !available && 'Run npm install for real Modbus TCP transport tests', timeout: 15000 }, async t => {
      const server = await station(t, connector);
      const { runtime, states, template } = runtimeFor(t, connector, server.port);
      const ctrl = 'devices.dc.aliases.v1.ctrl.powerLimitW';
      const rb = 'devices.dc.aliases.v1.r.powerLimitW';
      const readIds = ['eV_SET_CHARGE_POWER_LIMIT', 'aCTIVE_POWER', 'eNERGY_SESSION', 'aCTIVE_PRODUCTION_ENERGY', 'eNERGY_SESSION_RAW', 'mETER_ENERGY_TOTAL_RAW'];
      const poll = async () => {
        const values = await runtime.driver.readDatapoints(template.datapoints.filter(d => readIds.includes(d.id)));
        await runtime._updateAliases(values, { connected: true });
        return values;
      };
      await poll();
      assert.equal(states.get(rb).val, 11000);
      await runtime.handleStateChange(`nexowatt-devices.0.${ctrl}`, { val: 4200, ack: false });
      await runtime._flushWriteQueueOnce();
      assert.equal(states.get(ctrl).val, 4200);
      assert.equal(states.get(rb).val, 11000, 'write echo must not masquerade as readback');
      const values = await poll();
      assert.equal(states.get(rb).val, 4200);
      assert.equal(states.get('devices.dc.aliases.v1.r.power').val, 10927, 'measured power stays independent of limit');
      assert.equal(states.get('devices.dc.aliases.v1.r.energyTotal').val, 1810);
      assert.equal(states.get('devices.dc.aliases.v1.r.energySession').val, 3110);
      assert.equal(values.eNERGY_SESSION_RAW, 311);
      assert.equal(values.mETER_ENERGY_TOTAL_RAW, 1810);
      assert.deepEqual(server.frames.filter(f => f.fc === 16), [
        { fc: 16, address: 0x13, count: 1, unitId: 7, values: [1] },
        { fc: 16, address: connector * 0x100 + 0x22, count: 2, unitId: 7, values: [0, 4200] },
      ]);

      // Firmware may echo FC16 while retaining its previous applied limit.
      server.behavior.ignorePower = true;
      await runtime.handleStateChange(ctrl, { val: 6000, ack: false });
      await runtime._flushWriteQueueOnce();
      await poll();
      assert.equal(states.get(ctrl).val, 6000);
      assert.equal(states.get(rb).val, 4200);
      assert.equal(JSON.parse(states.get('devices.dc.info.depowerControl').val).status, 'readback_differs');

      server.behavior.rejectPower = true;
      await runtime.handleStateChange(ctrl, { val: 7000, ack: false });
      await runtime._flushWriteQueueOnce();
      await poll();
      assert.equal(states.get(ctrl).val, 6000, 'rejected request must not be acknowledged by polling');
      assert.match(states.get('devices.dc.info.lastError').val, /[Ii]llegal|exception/i);
    });
}
