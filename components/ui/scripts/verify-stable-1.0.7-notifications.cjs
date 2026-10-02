#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const { NotificationPolicy } = require('../lib/notification-policy');
const { NotificationMail, normalizeConfig, validAddress, FROM } = require('../lib/notification-mail');
const HALF = 1800000, DAY = 86400000, T = 1800000000000;
const categories = new Set(['system', 'communications', 'charging', 'inverters', 'grid']);
const event = (id, severity = 'critical', category = 'system') => ({ id, severity, category, title: id, message: 'Fixture' });
const observe = (p, events, now) => p.observe(events, now, categories);
const accept = (p, now) => { const batch = p.batch(now); p.reserve(now); p.complete(batch, now, true); return batch; };

function policyTests() {
  const p = new NotificationPolicy();
  observe(p, [event('hard'), event('normal', 'warning'), event('daily', 'info')], T);
  assert.deepEqual(accept(p, T).map(e => e.id), ['hard']);
  assert.equal(p.batch(T + 59999).length, 0);
  assert.equal(p.batch(T + 60000).length, 0, 'one minute no longer triggers mail');
  assert.equal(p.batch(T + HALF - 1).length, 0);
  assert.deepEqual(accept(p, T + HALF).map(e => e.id), ['normal']);
  assert.equal(p.batch(T + HALF + 120000).length, 0, 'no repeated alarm');
  const restored = new NotificationPolicy(JSON.parse(JSON.stringify(p.snapshot())));
  assert.equal(restored.batch(T + HALF + 120001).length, 0, 'restart keeps delivery history');
  const cadence = new NotificationPolicy(p.snapshot());
  observe(cadence, [event('hard'), event('normal', 'warning'), event('normal2', 'warning'), event('urgent2'), event('daily', 'info')], T + HALF + 1000);
  assert.deepEqual(accept(cadence, T + HALF + 1000).map(e => e.id), ['urgent2'], 'new hard fault bypasses normal batching');
  assert.equal(cadence.batch(T + 2 * HALF - 1).length, 0);
  assert.deepEqual(accept(cadence, T + 2 * HALF).map(e => e.id).sort(), ['normal', 'normal2'], 'persistent and new normal faults are bundled every 30 minutes');
  assert.deepEqual(accept(p, T + DAY + 60000).map(e => e.id).sort(), ['daily', 'hard', 'normal']);
  assert.equal(p.batch(T + DAY + 60001).length, 0);

  const idle = new NotificationPolicy();
  observe(idle, [], T); assert.equal(idle.batch(T + HALF).length, 0);
  observe(idle, [event('later', 'warning')], T + HALF + 1);
  assert.equal(idle.batch(T + HALF + 60001).length, 0, 'idle window cannot make new warnings send early');
  assert.equal(accept(idle, T + 2 * HALF).length, 1);

  const resolvedNormal = new NotificationPolicy();
  observe(resolvedNormal, [event('resolved-normal', 'warning')], T);
  observe(resolvedNormal, [], T + 90000);
  assert.equal(resolvedNormal.batch(T + HALF - 1).length, 0);
  assert.equal(accept(resolvedNormal, T + HALF)[0].resolved, true, 'resolved normal errors are included in the half-hour collection');
  assert.equal(resolvedNormal.batch(T + 2 * HALF).length, 0, 'resolved normal errors are not repeated');

  const failed = new NotificationPolicy();
  observe(failed, [event('hard')], T);
  failed.reserve(T); failed.complete(failed.batch(T), T, false);
  assert.equal(failed.records.get('hard').alertSent, false);
  assert.equal(failed.batch(T + 119999).length, 0);
  assert.equal(new NotificationPolicy(failed.snapshot()).batch(T + 120000).length, 1);
  observe(failed, [], T + 30000);
  const recoveredWhileOffline = accept(failed, T + 120000);
  assert.equal(recoveredWhileOffline.length, 1);
  assert.equal(recoveredWhileOffline[0].resolved, true, 'undelivered critical fault survives recovery during SMTP outage');
  assert.equal(failed.batch(T + DAY).length, 0, 'no duplicate recovery for a resolved delayed alarm');
  const info = new NotificationPolicy();
  observe(info, [event('notice', 'info')], T); observe(info, [], T + 1);
  assert.equal(info.batch(T + 60000).length, 0);
  assert.equal(accept(info, T + DAY)[0].resolved, true, 'short informational events survive until the daily digest');

  const escalation = new NotificationPolicy();
  observe(escalation, [event('adapter', 'warning')], T - HALF);
  assert.equal(accept(escalation, T).length, 1, 'initial warning delivered before escalation');
  observe(escalation, [event('adapter')], T + 61000);
  assert.equal(accept(escalation, T + 61000).length, 1, 'hard escalation is immediate');
  observe(escalation, [event('adapter', 'warning')], T + 61200);
  observe(escalation, [event('adapter')], T + 61400);
  assert.equal(escalation.batch(T + 61400).length, 0, 'severity flapping cannot resend an already notified critical incident');
  observe(escalation, [], T + 62000);
  observe(escalation, [event('adapter')], T + 63000);
  assert.equal(escalation.batch(T + 63000).length, 0, 'short flapping is deduplicated');
  observe(escalation, [], T + 64000);
  observe(escalation, [event('adapter')], T + 365000);
  assert.equal(accept(escalation, T + 365000).length, 1, 'new hard incident after stable recovery');
  observe(escalation, [], T + 366000);
  assert.equal(escalation.batch(T + 700000).length, 0, 'recovery waits for daily digest');
  assert.equal(accept(escalation, T + DAY)[0].kind, 'recovery');

  const debounce = new NotificationPolicy();
  observe(debounce, [event('brief', 'warning')], T);
  observe(debounce, [], T + 50000);
  assert.equal(debounce.batch(T + 60000).length, 0);
  observe(debounce, [event('brief', 'warning')], T + 60001);
  assert.equal(debounce.batch(T + 120000).length, 0, 'continuous minute required');
  observe(debounce, [event('brief', 'warning', 'charging')], T + 120001);
  debounce.observe([], T + 120002, new Set(['system']));
  assert.equal(debounce.records.size, 0, 'disabled categories do not send recoveries');
  observe(debounce, Array.from({ length: 1000 }, (_, i) => event('id' + i)), T);
  assert.equal(debounce.records.size, 256); assert.equal(debounce.batch(T).length, 64);

  const tests = new NotificationPolicy();
  tests.reserve(T, true); tests.complete([], T, true);
  assert.equal(tests.quota(T + 299999, true), false);
  assert.equal(tests.quota(T + 300000, true), true);
  observe(tests, [event('urgent')], T + 1);
  assert.equal(tests.batch(T + 1).length, 1, 'test cooldown cannot delay hard faults');
  const suppressed = new NotificationPolicy();
  observe(suppressed, [event('child')], T); accept(suppressed, T);
  observe(suppressed, [{ ...event('child'), suppressed: true }], T + DAY);
  assert.equal(suppressed.batch(T + DAY).length, 0, 'upstream outage causes no false recovery');
}

function adapterFixture(now) {
  const systemSecret = randomBytes(32).toString('hex');
  const states = new Map(), foreign = new Map(), debug = new Map(), objects = new Map();
  const settings = { notifyEnabled: true, email: 'customer@example.test' };
  const a = {
    namespace: 'nexowatt-ui.0', config: { ems: { enabled: true }, chargingManagement: { enabled: true, wallboxes: [{ key: 'lp1', name: 'DC 1', enabled: true }] } },
    _notify: { watchedInstances: { instances: [] }, nwDevices: { pvInverters: [] } },
    emsEngine: { mm: { lastTickDiag: { ts: now(), results: [] } } },
    getStateAsync: async id => states.get(id) ?? null,
    getForeignStateAsync: async id => foreign.get(id) ?? null,
    getForeignObjectAsync: async id => id === 'system.config' ? { native: { secret: systemSecret } } : objects.get(id),
    _notifyGetSettingBool: (id, fallback) => settings[id] ?? fallback,
    _notifyGetSettingString: (id, fallback) => settings[id] ?? fallback,
    _notifySetDebugState: async (id, value) => debug.set(id, value),
    _notifyRefreshWatchedInstances: async () => {}, _notifyRefreshNwDevicesCache: async () => {},
  };
  const put = (id, val, ts = now()) => states.set(id, { val, ts });
  const lp = values => { for (const [k, v] of Object.entries(values)) put('chargingManagement.wallboxes.lp1.' + k, v); };
  put('ems.core.lastTickStart', now());
  lp({ online: true, faultActive: false, userEnabled: true, userStationEnabled: true, vehiclePlugged: true, vehicleDemandConfirmed: true, targetPowerW: 10000, actualPowerW: 9500, meterStale: false, statusClass: 'charging', reason: 'charge', hardwareCommandState: 'confirmed' });
  return { a, states, foreign, objects, debug, settings, put, lp };
}

async function smtpFixture() {
  const sockets = new Set(), messages = [], envelopes = [];
  let reject = false;
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8'); socket.write('220 local-fixture ESMTP\r\n');
    let buffer = '', data = false, content = '';
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n'), line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (data) {
          if (line === '.') { data = false; messages.push(content); content = ''; socket.write('250 accepted\r\n'); }
          else content += line + '\r\n';
        } else if (/^EHLO|^HELO/.test(line)) socket.write('250-local-fixture\r\n250 OK\r\n');
        else if (/^MAIL|^RCPT/.test(line)) { envelopes.push(line); socket.write(reject && /^RCPT/.test(line) ? '550 recipient rejected\r\n' : '250 OK\r\n'); }
        else if (/^DATA/.test(line)) { data = true; socket.write('354 send data\r\n'); }
        else if (/^QUIT/.test(line)) socket.end('221 bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, messages, envelopes, reject: value => { reject = value; },
    close: async () => { for (const s of sockets) s.destroy(); await new Promise(resolve => server.close(resolve)); } };
}

async function integrationTests() {
  const testPassword = randomBytes(32).toString('hex');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nw-mail-fixture-'));
  const smtp = await smtpFixture();
  let now = T, attempts = 0, transportOptions;
  const f = adapterFixture(() => now);
  const service = new NotificationMail(f.a, { directory, now: () => now, createTransport: options => {
    transportOptions = options;
    // Only this fixture replaces production TLS/auth with a loopback SMTP server.
    const transport = require('nodemailer').createTransport({ host: '127.0.0.1', port: smtp.port, secure: false, ignoreTLS: true, connectionTimeout: 2000, socketTimeout: 2000 });
    return { close: () => transport.close(), sendMail: args => { attempts++; return transport.sendMail(args); } };
  } });
  try {
    assert.equal(validAddress('a@example.test'), true);
    for (const bad of ['a@example.test,b@example.test', 'a@example.test\r\nBcc: x@x.test', 'bad', 'Name <a@example.test>']) assert.equal(validAddress(bad), false);
    assert.throws(() => normalizeConfig({ enabled: true, host: 'smtp.example.test' }), /erforderlich/);
    await service.configure({ enabled: true, host: 'smtp.example.test', user: 'local-test-user', password: testPassword, port: 465 });
    assert.equal(service.publicConfig().passwordSet, true);
    assert.equal(JSON.stringify(service.publicConfig()).includes(testPassword), false);
    const stored = await fs.readFile(path.join(directory, 'notification-mail.json'), 'utf8');
    assert.equal(stored.includes(testPassword), false); assert.equal(stored.includes('smtp.example.test'), false);
    assert.equal((await fs.stat(path.join(directory, 'notification-mail.json'))).mode & 0o777, 0o600);
    await service.configure({ ...service.publicConfig(), password: '' });
    assert.equal(service.config.password, testPassword);
    const reload = new NotificationMail(f.a, { directory, now: () => now });
    await reload.init(); assert.equal(reload.config.password, testPassword); reload.close();
    assert.deepEqual(await service.test('customer@example.test'), { ok: true, status: 'smtp-accepted' });
    assert.equal(transportOptions.requireTLS, true); assert.equal(transportOptions.secure, true);
    assert.equal(transportOptions.tls.rejectUnauthorized, true); assert.equal(transportOptions.tls.minVersion, 'TLSv1.2');
    assert.equal(smtp.messages.length, 1); assert.ok(smtp.envelopes.includes('MAIL FROM:<info@nexowatt.com>'));
    assert.ok(smtp.envelopes.includes('RCPT TO:<customer@example.test>'));
    assert.equal((await service.test('customer@example.test')).ok, false, 'test rate limit');

    assert.deepEqual(await service.collect(categories), []);
    f.a._nwEmsInitError = 'fixture initialization failed';
    assert.equal((await service.collect(categories)).find(e => e.id === 'ems:init').severity, 'critical');
    f.a._nwEmsInitError = '';
    f.lp({ faultActive: true }); now += 30000;
    await Promise.all([service.tick(), service.tick(), service.tick()]);
    assert.equal(attempts, 2, 'hard fault sends immediately and concurrent ticks serialize');
    assert.equal(f.debug.get('lastMailResult'), 'smtp-accepted');
    await service.tick(); assert.equal(attempts, 2, 'no duplicate on next tick');
    f.lp({ faultActive: false, actualPowerW: 0 }); now += 10000;
    await service.tick(); now += 59999; await service.tick(); assert.equal(attempts, 2);
    now++; await service.tick(); assert.equal(attempts, 2, 'no mail after just one minute');
    now = T + 30000 + HALF - 1; f.put('ems.core.lastTickStart', now); await service.tick(); assert.equal(attempts, 2);
    now++; f.put('ems.core.lastTickStart', now); await service.tick(); assert.equal(attempts, 3, 'normal fault in half-hour batch');
    for (const reason of ['user_stop', 'phase_switch', 'pv_wait', 'peak_budget', 'rfid', 'pause']) {
      f.lp({ reason }); assert.equal((await service.collect(categories)).some(e => e.id.endsWith(':interrupted')), false, reason);
    }
    f.lp({ reason: 'charge', statusClass: 'finished' });
    assert.equal((await service.collect(categories)).some(e => e.id.endsWith(':interrupted')), false);
    f.lp({ actualPowerW: 9500, statusClass: 'charging', hardwareCommandState: 'write-not-confirmed', applyStatus: 'unchanged' });
    assert.equal((await service.collect(categories)).some(e => e.id.endsWith(':write')), false, 'unchanged command is not a failed write');
    f.lp({ applyStatus: 'executor_error:timeout' });
    assert.equal((await service.collect(categories)).some(e => e.id.endsWith(':write')), true);
    f.lp({ applyStatus: 'ocpp-zero-held-not-stopped', userEnabled: false });
    assert.equal((await service.collect(categories)).find(e => e.id.endsWith(':stop')).severity, 'critical');
    f.lp({ applyStatus: 'applied', userEnabled: true, hardwareCommandState: 'confirmed' });
    f.put('gridConstraints.zeroExport.action', 'curtail');
    assert.equal((await service.collect(categories)).some(e => e.id === 'grid:failsafe'), false);
    f.put('gridConstraints.zeroExport.action', 'failsafe');
    assert.equal((await service.collect(categories)).find(e => e.id === 'grid:failsafe').severity, 'critical');
    f.put('gridConstraints.zeroExport.action', '');
    f.a.emsEngine.mm.lastTickDiag = { ts: now, results: [{ key: 'speicherRegelung', enabled: true, ok: false }, { key: 'peakShaving', enabled: false, ok: false }, { key: 'pvForecast', enabled: true, ok: false }] };
    assert.deepEqual((await service.collect(categories)).filter(e => e.id.startsWith('module:')).map(e => e.id), ['module:speicherRegelung']);
    f.a.emsEngine.mm.lastTickDiag.results = [];
    f.put('ems.core.lastTickStart', now);
    f.a._notify.watchedInstances.instances = ['modbus.0'];
    f.objects.set('system.adapter.modbus.0', { common: { enabled: true } });
    f.foreign.set('system.adapter.modbus.0.alive', { val: false, ts: now });
    assert.equal((await service.collect(categories)).find(e => e.id === 'adapter:modbus.0').severity, 'critical');
    f.objects.set('system.adapter.modbus.0', { common: { enabled: false } });
    assert.equal((await service.collect(categories)).some(e => e.id === 'adapter:modbus.0'), false, 'disabled adapter ignored');
    f.put('storageFarm.storagesStatusJson', JSON.stringify([{ dispatchKey: 'ess1', name: 'ESS', dispatchBlockedReasons: ['fault_active'], state: 'online' }]));
    assert.equal((await service.collect(categories)).find(e => e.id === 'storage:ess1').severity, 'critical');
    f.a._notify.nwDevices.pvInverters = [{ id: 'pv1', name: 'PV', dp: { connected: 'device.0.connected' } }];
    f.foreign.set('device.0.connected', { val: true, ts: T - DAY });
    assert.equal((await service.collect(categories)).some(e => e.id.startsWith('inverter:')), false, 'unchanged connection true does not go stale');

    smtp.reject(true); now += 300000;
    const lastSuccess = f.debug.get('lastMailTs');
    assert.equal((await service.test('customer@example.test')).ok, false);
    assert.equal(f.debug.get('lastMailTs'), lastSuccess, 'rejected SMTP does not report success');
    assert.equal(service.policy.nextAttempt > now, true);
    assert.equal((await service.test('customer@example.test')).ok, false, 'failure backoff');
    service.transport.close(); service.transport = { close() {}, sendMail: async () => { throw Object.assign(new Error('private password in server response'), { code: 'ETIMEDOUT' }); } };
    assert.equal((await service.send('customer@example.test', 'test', 'body')).error.includes('private password'), false);
    await service.configure({ ...service.publicConfig(), enabled: false, clearPassword: true });
    assert.equal(service.publicConfig().passwordSet, false);
    assert.equal((await service.test('customer@example.test')).ok, false);
  } finally { service.close(); await smtp.close(); await fs.rm(directory, { recursive: true, force: true }); }
}

(async () => {
  policyTests(); await integrationTests();
  const main = await fs.readFile(path.join(__dirname, '../main.js'), 'utf8');
  assert.ok(main.includes("app.get('/api/installer/notification-mail', requireMailAdmin"));
  assert.ok(main.includes("app.post('/api/installer/notification-mail', requireMailAdmin"));
  assert.ok(main.includes('recipient_forbidden'));
  assert.ok(!main.includes("sendToAsync('email"));
  console.log('[1.0.7 notifications] OK: immediate/30min/daily, escalation, durable dedup, recovery, categories, real loopback SMTP, rejection/backoff, encryption, TLS options, module/AC/DC fault monitoring.');
})().catch(error => { console.error(error); process.exitCode = 1; });
