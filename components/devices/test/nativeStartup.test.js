'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
function harness(devices, { allowed = true, nativeFailure = false, platformFailure = false } = {}) {
  const events = [], states = new Map(), warnings = [], timers = new Set();
  class Adapter {
    constructor(options) { this.config = options.config; this.namespace = 'nexowatt-devices.0'; this.name = 'nexowatt-devices';
      this.log = { debug() {}, info() {}, warn(value) { warnings.push(value); }, error(value) { warnings.push(value); } }; }
    on() {}
    subscribeStates() {}
    async subscribeForeignObjectsAsync() {}
    async getForeignObjectsAsync() { return {}; }
    async setObjectNotExistsAsync() {}
    async setStateAsync(id, value) { states.set(id, value); }
  }
  class Runtime {
    constructor(_adapter, cfg) { events.push('construct'); this.cfg = cfg; }
    async initObjects() { events.push('objects'); }
    async start() { events.push('start'); this.started = true; }
    async stop() { events.push('stop'); }
  }
  const filename = path.join(root, 'main.js'), nativeRequire = createRequire(filename), mod = { exports: {}, parent: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    __dirname: root, module: mod, process,
    setInterval(fn) { const timer = { fn }; timers.add(timer); return timer; }, clearInterval(timer) { timers.delete(timer); },
    require(name) {
      if (name === '@iobroker/adapter-core') return { Adapter };
      if (name === './lib/eos-license-client') return { assertEosPlatform() { events.push('platform'); if (platformFailure) throw new Error('EOS_PLATFORM'); } };
      if (name === './lib/licenseInventory') return { createInventoryLicenseGuard() { return {
        async start() { events.push('license'); return allowed; }, isAllowed() { return allowed; },
        assertAllowed() { if (!allowed) throw new Error('EOS_LICENSE_REQUIRED'); }, async stop() {},
      }; } };
      if (name === './lib/sungrowFastFeedbackPatch') return { install() { events.push('patch'); } };
      if (name === './lib/deviceRuntime') {
        events.push('native-runtime');
        if (nativeFailure) throw new Error('NATIVE_HOST_CONTRACT');
        return { DeviceRuntime: Runtime };
      }
      return nativeRequire(name);
    },
  }, { filename });
  return { adapter: mod.exports({ config: { devices } }), states, events, warnings, timers };
}
const device = { id: 'configured', templateId: 'generic.http', protocol: 'http' };
async function unload(adapter) { await adapter.onUnload(() => {}); }
test('bootstrap module import never eagerly loads the device runtime or native patch', () => {
  const requests = [], start = () => {}, mod = { exports: {}, parent: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'bootstrap.js'), 'utf8'), {
    module: mod, require(name) { requests.push(name); if (name !== './main') throw new Error('unexpected native import'); return start; },
  });
  assert.equal(mod.exports, start); assert.deepEqual(requests, ['./main']);
});
test('empty commissioning stays offline and licensed client starts while native code remains unloaded', async () => {
  const h = harness([], { nativeFailure: true });
  await h.adapter.onReady();
  assert.deepEqual(h.events, ['platform', 'license']);
  assert.equal(h.states.get('info.connection').val, false); assert.equal(h.timers.size, 0);
  await unload(h.adapter);
});
test('unlicensed or platform-rejected configuration never loads native drivers', async () => {
  for (const options of [{ allowed: false }, { platformFailure: true }]) {
    const h = harness([device], { ...options, nativeFailure: true });
    await h.adapter.onReady();
    assert.ok(!h.events.includes('native-runtime') && !h.events.includes('patch'));
    await unload(h.adapter);
  }
});
test('authorized configured device installs Sungrow patch before creating and starting its runtime', async () => {
  const h = harness([{ ...device }]);
  await h.adapter.onReady();
  assert.deepEqual(h.events, ['platform', 'license', 'patch', 'native-runtime', 'construct', 'objects', 'start']);
  await unload(h.adapter);
});
test('native host rejection still blocks configured runtime and never reports a connection', async () => {
  const h = harness([{ ...device }], { nativeFailure: true });
  await h.adapter.onReady();
  assert.ok(h.events.includes('native-runtime')); assert.ok(!h.events.includes('construct'));
  assert.ok(h.warnings.some(line => line.includes('NATIVE_HOST_CONTRACT')));
  assert.equal(h.states.get('info.connection').val, false); assert.equal(h.adapter.deviceRuntimes.length, 0);
  await unload(h.adapter);
});
