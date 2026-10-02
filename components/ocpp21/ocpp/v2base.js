'use strict';

const {
  createAutoResponder,
  applyMeterValues,
  extractEnergyImportRegisterWh,
  findVinInPayload,
} = require('./common');

function registerV2Handlers(client, ctx, protocol) {
  const id = client.stateIdentity || client.identity;
  const auto = createAutoResponder(protocol, { vendorId: 'NexoWatt' });

  const logDeferredError = (label, error) => {
    if (ctx.log && ctx.log.warn) ctx.log.warn(`Deferred OCPP processing failed (${id}, ${label}): ${error && error.stack || error}`);
  };
  const defer = (label, task, options = {}) => {
    if (ctx && typeof ctx.defer === 'function') {
      const queued = ctx.defer(id, label, task, options);
      if (queued !== false) return true;
      if (options.droppable === true) return false;
    }
    Promise.resolve().then(task).catch((error) => logDeferredError(label, error));
    return true;
  };
  const fireRuntime = (method, ...args) => {
    try {
      const fn = ctx.runtime && ctx.runtime[method];
      if (typeof fn !== 'function') return;
      const result = fn(...args);
      if (result && typeof result.catch === 'function') result.catch((error) => logDeferredError(`runtime:${method}`, error));
    } catch (error) {
      logDeferredError(`runtime:${method}`, error);
    }
  };
  const write = async (stateId, value, category = 'status') => {
    if (ctx.setStateFreshAsync) return ctx.setStateFreshAsync(stateId, value, true, category);
    if (ctx.setStateChangedAsync) return ctx.setStateChangedAsync(stateId, value, true);
  };
  const capture = (method, params) => {
    if (!ctx.config || ctx.config.captureRawMessages !== true) return false;
    return defer(`capture:${method}`, async () => {
      if (ctx.dp && typeof ctx.dp.capture === 'function') await ctx.dp.capture(id, protocol, 'in', method, params);
    }, { droppable: true });
  };
  const handle = (method, fn) => {
    client.handle(method, async (msg) => {
      const safeMsg = msg || { params: {} };
      fireRuntime('noteMessage', id, method);
      const response = fn(safeMsg);
      capture(method, safeMsg.params);
      return response;
    });
  };

  handle('BootNotification', ({ params }) => {
    const p = params || {};
    const cs = p.chargingStation || {};
    const modem = cs.modem || {};
    const interval = Math.max(10, Number(ctx.config.heartbeatIntervalSec) || 300);
    fireRuntime('noteBoot', id, interval);
    defer('BootNotification', async () => {
      await ctx.states.upsertIdentityMeta(id, {
        protocol,
        vendor: cs.vendorName,
        model: cs.model,
        firmwareVersion: cs.firmwareVersion,
        serialNumber: cs.serialNumber,
        iccid: modem.iccid,
        imsi: modem.imsi,
      });
      await write(`${id}.info.heartbeatInterval`, interval, 'static');
    });
    return { status: 'Accepted', currentTime: new Date().toISOString(), interval };
  });

  handle('Heartbeat', () => {
    const now = new Date().toISOString();
    fireRuntime('noteHeartbeat', id, now);
    if (!ctx.runtime || typeof ctx.runtime.noteHeartbeat !== 'function') {
      defer('Heartbeat', () => write(`${id}.info.lastHeartbeat`, now, 'health'), { droppable: true });
    }
    return { currentTime: now };
  });

  handle('Authorize', ({ params }) => {
    const p = params || {};
    const token = p.idToken && p.idToken.idToken;
    const tokenType = p.idToken && p.idToken.type;
    if (token) defer('Authorize', () => ctx.states.setRfid(id, token, tokenType));
    return { idTokenInfo: { status: 'Accepted' } };
  });

  handle('StatusNotification', ({ params }) => {
    const p = params || {};
    const evseId = Math.max(0, Number(p.evseId) || 1);
    const connectorId = Math.max(0, Number(p.connectorId) || 1);
    defer('StatusNotification', async () => {
      await ctx.states.upsertEvseState(id, evseId, connectorId, {
        status: p.connectorStatus,
        timestamp: p.timestamp || new Date().toISOString(),
      });
      if (ctx.runtime && typeof ctx.runtime.noteStatus === 'function') {
        await ctx.runtime.noteStatus(id, evseId, connectorId, p.connectorStatus);
      }
    });
    return {};
  });

  handle('MeterValues', ({ params }) => {
    const p = params || {};
    const evseId = Math.max(0, Number(p.evseId) || 1);
    const connectorId = Math.max(0, Number(p.connectorId) || 1);
    defer('MeterValues', () => applyMeterValues(ctx, id, evseId, connectorId, p.meterValue, protocol), { droppable: true });
    return {};
  });

  handle('TransactionEvent', ({ params }) => {
    const p = params || {};
    const evseId = Math.max(0, Number(p.evse && p.evse.id) || 1);
    const connectorId = Math.max(0, Number(p.evse && p.evse.connectorId) || 1);
    const txInfo = p.transactionInfo || {};
    const txId = txInfo.transactionId;
    const idTag = p.idToken && p.idToken.idToken;
    const idTokenType = p.idToken && p.idToken.type;
    const ts = p.timestamp || new Date().toISOString();
    const wh = extractEnergyImportRegisterWh(p.meterValue, protocol);
    const type = p.eventType === 'Started' ? 'Start' : p.eventType === 'Ended' ? 'Stop' : 'Update';

    defer('TransactionEvent', async () => {
      if (Array.isArray(p.meterValue)) await applyMeterValues(ctx, id, evseId, connectorId, p.meterValue, protocol);
      if (typeof p.numberOfPhasesUsed === 'number') await write(`${id}.transactions.numberPhases`, p.numberOfPhasesUsed, 'status');
      await ctx.states.pushTransactionEvent(id, {
        type, txId, evseId, connectorId, idTag, idTokenType,
        meterStart: type === 'Start' ? wh : undefined,
        meterStop: type === 'Stop' ? wh : undefined,
        reason: type === 'Stop' ? (txInfo.stoppedReason || p.triggerReason) : undefined,
        chargingState: txInfo.chargingState,
        triggerReason: p.triggerReason,
        seqNo: p.seqNo,
        ts,
      });
    });
    return p.idToken ? { idTokenInfo: { status: 'Accepted' } } : {};
  });

  handle('FirmwareStatusNotification', ({ params }) => {
    defer('FirmwareStatusNotification', () => write(`${id}.info.firmwareStatus`, params && params.status, 'status'), { droppable: true });
    return {};
  });

  handle('LogStatusNotification', ({ params }) => {
    defer('LogStatusNotification', () => write(`${id}.info.logStatus`, params && params.status, 'status'), { droppable: true });
    return {};
  });

  handle('DataTransfer', ({ params }) => {
    const p = params || {};
    const vin = findVinInPayload(p.data);
    if (vin) defer('DataTransfer:VIN', () => write(`${id}.info.vin`, vin, 'static'));
    return { status: 'Accepted' };
  });

  handle('NotifyEVChargingNeeds', ({ params }) => {
    const p = params || {};
    const needs = p.chargingNeeds || {};
    const dc = needs.dcChargingParameters || {};
    const ac = needs.acChargingParameters || {};
    const v2x = needs.v2xChargingParameters || {};
    const finite = (...values) => {
      for (const value of values) {
        if (value === undefined || value === null || String(value).trim() === '') continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
      }
      return undefined;
    };
    const evseId = Math.max(0, Number(p.evseId) || 1);
    const timestamp = p.timestamp || new Date().toISOString();
    const soc = finite(dc.stateOfCharge, needs.stateOfCharge);
    const fields = {
      evseId,
      lastUpdate: timestamp,
      energyTransferMode: needs.requestedEnergyTransfer,
      departureTime: needs.departureTime,
      socPercent: soc,
      targetSocPercent: finite(v2x.targetSoC),
      fullSocPercent: finite(dc.fullSoC),
      bulkSocPercent: finite(dc.bulkSoC),
      energyRequestWh: finite(dc.energyAmount, ac.energyAmount),
      batteryCapacityWh: finite(dc.evEnergyCapacity),
      maxPowerW: finite(dc.evMaxPower, v2x.maxChargePower),
      maxCurrentA: finite(dc.evMaxCurrent, ac.evMaxCurrent, v2x.maxChargeCurrent),
      maxVoltageV: finite(dc.evMaxVoltage, ac.evMaxVoltage, v2x.maxVoltage),
      maxScheduleTuples: finite(p.maxScheduleTuples),
    };

    defer('NotifyEVChargingNeeds', async () => {
      if (ctx.states && typeof ctx.states.ensureStructure === 'function') await ctx.states.ensureStructure(id, evseId, 1);
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        const category = /socPercent$/i.test(key) ? 'soc' : 'status';
        await write(`${id}.vehicle.${key}`, value, category);
      }
      if (soc !== undefined) {
        const socId = ctx.states && typeof ctx.states.ensureMeasurementState === 'function'
          ? await ctx.states.ensureMeasurementState(id, 'socPercent', '%', {
            name: { en: 'Vehicle state of charge', de: 'Fahrzeug-Ladezustand' },
            role: 'value.battery', unit: '%', key: 'socPercent',
          })
          : await ctx.states.ensureAggState(id, 'SoC', '%');
        await write(socId, soc, 'soc');
        if (ctx.runtime && typeof ctx.runtime.noteSoc === 'function') {
          await ctx.runtime.noteSoc(id, timestamp);
        }
      }
    });
    return { status: 'Accepted' };
  });

  handle('NotifyReport', ({ params }) => {
    defer('NotifyReport', async () => {
      if (ctx.dm && typeof ctx.dm.ingestNotifyReport === 'function') await ctx.dm.ingestNotifyReport(id, protocol, params || {});
    }, { droppable: true });
    return {};
  });

  // Certificate/security workflows require a PKI backend. Fail explicitly until one is configured.
  handle('SignCertificate', () => ({ status: 'Rejected' }));
  handle('Get15118EVCertificate', () => ({ status: 'Failed', exiResponse: '' }));
  handle('GetCertificateStatus', () => ({ status: 'Failed' }));
  handle('InstallCertificate', () => ({ status: 'Rejected' }));
  handle('CertificateSigned', () => ({ status: 'Rejected' }));

  client.handle(async ({ method, params }) => {
    fireRuntime('noteMessage', id, method);
    capture(method, params);
    return auto(method, { preferFailure: true });
  });
}

module.exports = { registerV2Handlers };
