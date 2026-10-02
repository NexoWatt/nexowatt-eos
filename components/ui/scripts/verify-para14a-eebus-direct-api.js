'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  Para14aEebusDirectApi,
  HELLO_COMMAND,
  CONTROL_COMMAND,
  IMPLEMENTATION_COMMAND,
  DEFAULT_TIMING_TARGETS_MS,
} = require('../ems/services/para14a-eebus-api');

class FakeAdapter {
  constructor() {
    this.namespace = 'nexowatt-ui.0';
    this.config = {
      installerConfig: { para14a: true },
      countryProfile: { country: 'DE' },
    };
    this.emsEngine = { mm: {} };
    this._nwLicenseOk = true;
    this.log = { debug() {}, warn() {}, info() {}, error() {} };
    this.states = new Map();
    this.objects = new Map();
    this.replies = [];
    this.finalFeedback = [];
    this.tickRequests = [];
  }
  _nwLicenseAllowsAppId() { return true; }
  _nwRequestImmediateEmsTick(reason, delayMs) {
    this.tickRequests.push({ reason, delayMs });
    return true;
  }
  async setObjectNotExistsAsync(id, object) {
    if (!this.objects.has(id)) this.objects.set(id, object);
  }
  async setStateAsync(id, state) { this.states.set(id, state.val); }
  sendTo(target, command, message, callback) {
    if (command === IMPLEMENTATION_COMMAND) {
      this.finalFeedback.push({ target, message });
      if (typeof callback === 'function') callback({ accepted: true });
      return;
    }
    this.replies.push({ target, command, message });
    if (typeof callback === 'function') callback(message);
  }
}

function packet(commandId, overrides = {}) {
  const now = Date.now();
  return {
    schema: CONTROL_COMMAND,
    apiVersion: 1,
    commandId,
    sequence: 1,
    sourceInstance: 'eebus.0',
    sourceDeviceId: 'cls_box_1',
    sourceSki: 'AA:BB',
    sourceProtocol: 'EEBUS-SPINE-IF_CLS_CTRL',
    operation: 'limitConsumption',
    reason: 'lpc',
    mode: 'ems',
    active: true,
    limitW: 4200,
    receivedAtMs: now - 10,
    issuedAtMs: now,
    effectiveFromMs: now,
    validUntilMs: now + 60_000,
    heartbeatAtMs: now,
    heartbeatTimeoutMs: 60_000,
    failsafeLimitW: 3000,
    failsafeDurationMs: 7_200_000,
    implementationTimeoutMs: 5000,
    sourceMsgCounter: 10,
    sourceLimitIds: [1],
    ...overrides,
  };
}

function message(command, payload, callback) {
  return {
    command,
    message: payload,
    from: 'system.adapter.eebus.0',
    callback,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const unboundAdapter = new FakeAdapter();
  const unboundApi = new Para14aEebusDirectApi(unboundAdapter);
  await unboundApi.init();
  let unboundReply;
  await unboundApi.handleMessage(message(CONTROL_COMMAND, packet('cmd-without-handshake'), (response) => { unboundReply = response; }));
  assert.equal(unboundReply.accepted, false);
  assert.equal(unboundReply.reason, 'eebus-handshake-required');
  unboundApi.stop();

  const adapter = new FakeAdapter();
  const api = new Para14aEebusDirectApi(adapter);
  await api.init();

  let helloReply;
  await api.handleMessage(message(HELLO_COMMAND, {
    schema: HELLO_COMMAND,
    apiVersion: 1,
    sourceInstance: 'eebus.0',
    bridgeHeartbeatSec: 5,
    timingTargetsMs: {
      acceptance: 250,
      controllerApply: 1000,
      implementationFeedback: 1500,
    },
  }, (response) => { helloReply = response; }));
  assert.equal(helloReply.accepted, true);
  assert.equal(helloReply.readyForControl, true);
  assert.equal(helloReply.manualDatapointMappingRequired, false);
  assert.deepEqual(helloReply.timingTargetsMs, DEFAULT_TIMING_TARGETS_MS);

  let acceptance;
  const activePacket = packet('cmd-active');
  await api.handleMessage(message(CONTROL_COMMAND, activePacket, (response) => { acceptance = response; }));
  assert.equal(acceptance.accepted, true);
  assert.equal(acceptance.queued, true);
  assert.equal(adapter.tickRequests.at(-1).delayMs, 0);
  assert.equal(api.getIngress().active, true);
  assert.equal(api.getIngress().limitW, 4200);

  adapter._para14a = {
    directCommandId: 'cmd-active',
    active: true,
    totalCapW: 4200,
    nSteuVE: 1,
    automaticConsumerCount: 1,
    manualConsumerCount: 0,
    consumerAudit: { appliedCount: 0, failedCount: 0, skippedCount: 0, writeFailedCount: 0 },
    auditSnapshot: { gridPowerW: 3500, evPowerW: 4000 },
  };
  const appliedAtMs = Date.now();
  const flushed = await api.flushImplementationFeedback({
    tickStartedAtMs: appliedAtMs - 20,
    appliedAtMs,
    moduleResults: [
      { key: 'para14a', enabled: true, ok: true, ms: 1 },
      { key: 'coreLimits', enabled: true, ok: true, ms: 1 },
      { key: 'chargingManagement', enabled: true, ok: true, ms: 2 },
      { key: 'speicherRegelung', enabled: true, ok: true, ms: 2 },
      { key: 'multiUse', enabled: false, ok: true, ms: 0 },
      { key: 'thermalControl', enabled: false, ok: true, ms: 0 },
      { key: 'heatingRodControl', enabled: false, ok: true, ms: 0 },
      { key: 'nvpCoordinator', enabled: true, ok: true, ms: 1 },
    ],
  });
  assert.equal(flushed, true);
  const feedback = adapter.finalFeedback.at(-1).message;
  assert.equal(feedback.status, 'applied');
  assert.equal(feedback.controllerApplied, true);
  assert.equal(feedback.physicalImplementationConfirmed, false);
  assert.equal(feedback.actualSteuVEPowerW, null);
  assert.equal(feedback.evcsActualPowerW, 4000);
  assert.ok(Number.isFinite(feedback.tickStartedAtMs));
  assert.ok(Number.isFinite(feedback.appliedAtMs));
  assert.ok(Number.isFinite(feedback.feedbackCreatedAtMs));
  assert.equal(feedback.controlLatencyMs, feedback.controllerLatencyMs);
  assert.ok(feedback.totalLatencyMs >= feedback.feedbackLatencyMs);
  assert.ok(feedback.controlLatencyMs >= feedback.postAcceptanceControlLatencyMs);
  assert.equal(feedback.details.centralControllerApplied, true);

  // Retransmission after completion returns the cached acceptance and replays the
  // final implementation feedback idempotently for a repeated SPINE request.
  const feedbackCountBeforeDuplicate = adapter.finalFeedback.length;
  let duplicateReply;
  await api.handleMessage(message(CONTROL_COMMAND, activePacket, (response) => { duplicateReply = response; }));
  assert.equal(duplicateReply.accepted, true);
  assert.equal(duplicateReply.duplicate, true);
  assert.equal(duplicateReply.queued, false);
  await sleep(10);
  assert.equal(adapter.finalFeedback.length, feedbackCountBeforeDuplicate + 1);

  // RC49: Ein abgelaufener Heartbeat bleibt ein aktiver §14a-Vertrag,
  // wird aber niemals als 0-W-Not-Aus interpretiert. Ein zu kleiner lokaler
  // Fallbackwert wird im zentralen Constraint auf Pmin,14a geklemmt.
  let staleReply;
  const stalePacket = packet('cmd-stale-metadata', {
    heartbeatAtMs: Date.now() - 70_000,
    heartbeatTimeoutMs: 60_000,
    failsafeLimitW: 3000,
  });
  await api.handleMessage(message(CONTROL_COMMAND, stalePacket, (response) => { staleReply = response; }));
  assert.equal(staleReply.accepted, true);
  const staleIngress = api.getIngress();
  assert.equal(staleIngress.active, true);
  assert.equal(staleIngress.limitW, 3000);
  assert.equal(staleIngress.localFailsafeActive, true);
  assert.equal(staleIngress.forceZero, false);
  assert.equal(staleIngress.emergencyStop, false);
  assert.match(String(staleIngress.stalePolicy || ''), /pmin|last-valid/i);

  // A failed downstream/write path must withhold the positive CLS readback.
  adapter._para14a = {
    directCommandId: 'cmd-stale-metadata',
    active: true,
    totalCapW: 4200,
    pMinW: 4200,
    consumerAudit: { appliedCount: 0, failedCount: 1, skippedCount: 0, writeFailedCount: 1 },
    auditSnapshot: {},
  };
  await api.flushImplementationFeedback({
    tickStartedAtMs: Date.now() - 5,
    appliedAtMs: Date.now(),
    moduleResults: [
      { key: 'para14a', enabled: true, ok: true, ms: 1 },
      { key: 'coreLimits', enabled: true, ok: true, ms: 1 },
      { key: 'chargingManagement', enabled: true, ok: false, ms: 1, error: 'write blocked' },
    ],
  });
  assert.equal(adapter.finalFeedback.at(-1).message.status, 'degraded');
  assert.equal(adapter.finalFeedback.at(-1).message.controllerApplied, false);

  // Ein normaler aktiver 0-W-Befehl bleibt §14a und ist kein EOS-Not-Aus.
  // Die zentrale Constraint-Berechnung meldet anschließend mindestens Pmin,14a.
  let zeroReply;
  const zeroPacket = packet('cmd-zero-clamped', {
    limitW: 0,
    failsafeLimitW: 0,
    sourceMsgCounter: 11,
  });
  await api.handleMessage(message(CONTROL_COMMAND, zeroPacket, (response) => { zeroReply = response; }));
  assert.equal(zeroReply.accepted, true);
  const zeroIngress = api.getIngress();
  assert.equal(zeroIngress.active, true);
  assert.equal(zeroIngress.limitW, 0);
  assert.equal(zeroIngress.forceZero, false);
  assert.equal(zeroIngress.emergencyStop, false);
  adapter._para14a = {
    directCommandId: 'cmd-zero-clamped',
    active: true,
    pMinW: 4200,
    totalCapW: 4200,
    consumerAudit: { appliedCount: 0, failedCount: 0, skippedCount: 0, writeFailedCount: 0 },
    auditSnapshot: {},
  };
  await api.flushImplementationFeedback({
    tickStartedAtMs: Date.now() - 5,
    appliedAtMs: Date.now(),
    moduleResults: [
      { key: 'para14a', enabled: true, ok: true, ms: 1 },
      { key: 'coreLimits', enabled: true, ok: true, ms: 1 },
      { key: 'nvpCoordinator', enabled: true, ok: true, ms: 1 },
    ],
  });
  const zeroFeedback = adapter.finalFeedback.at(-1).message;
  assert.equal(zeroFeedback.status, 'applied');
  assert.equal(zeroFeedback.requestedLimitW, 0);
  assert.equal(zeroFeedback.effectiveRequestedLimitW, 4200);
  assert.equal(zeroFeedback.effectiveTotalCapW, 4200);

  // Release is confirmed after the complete central cycle reports inactive.
  let releaseReply;
  const releasePacket = packet('cmd-release', {
    operation: 'release', active: false, limitW: null, reason: 'release',
    heartbeatAtMs: null, failsafeLimitW: null, failsafeDurationMs: null,
    sourceMsgCounter: null,
  });
  await api.handleMessage(message(CONTROL_COMMAND, releasePacket, (response) => { releaseReply = response; }));
  assert.equal(releaseReply.accepted, true);
  const releaseIngress = api.getIngress();
  assert.equal(releaseIngress.limitW, null);
  assert.equal(releaseIngress.heartbeatAtMs, null);
  assert.equal(releaseIngress.failsafeLimitW, null);
  assert.equal(releaseIngress.failsafeDurationMs, null);
  adapter._para14a = {
    directCommandId: 'cmd-release',
    active: false,
    totalCapW: 0,
    consumerAudit: { appliedCount: 0, failedCount: 0, skippedCount: 0, writeFailedCount: 0 },
    auditSnapshot: {},
  };
  await api.flushImplementationFeedback({
    tickStartedAtMs: Date.now() - 5,
    appliedAtMs: Date.now(),
    moduleResults: [
      { key: 'para14a', enabled: true, ok: true, ms: 1 },
      { key: 'coreLimits', enabled: true, ok: true, ms: 1 },
      { key: 'nvpCoordinator', enabled: true, ok: true, ms: 1 },
    ],
  });
  assert.equal(adapter.finalFeedback.at(-1).message.status, 'released');
  assert.equal(adapter.finalFeedback.at(-1).message.controllerApplied, true);

  api.stop();

  const root = path.join(__dirname, '..');
  const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
  const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  const paraSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/para14a.ts'), 'utf8');
  assert.match(mainSource, /new Para14aEebusDirectApi\(this\)/);
  assert.match(mainSource, /this\.on\('message', this\.onMessage\.bind\(this\)\)/);
  assert.match(engineSource, /_nwFlushPara14aEebusImplementationFeedback/);
  assert.match(engineSource, /requestImmediateTick\(reason = 'external-control', delayMs/);
  assert.match(paraSource, /_nwGetPara14aEebusIngress/);
  assert.match(paraSource, /const mode = directIngress \? 'ems'/);

  console.log('§14a EEBUS direct API tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
