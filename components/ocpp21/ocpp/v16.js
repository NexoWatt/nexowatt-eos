'use strict';

const crypto = require('node:crypto');
const { createAutoResponder, applyMeterValues, findVinInPayload } = require('./common');

function map16Connector(connectorId) {
  return { evseId: 1, connectorId: Math.max(0, Number(connectorId) || 0) };
}

function registerHandlers(client, ctx) {
  const id = client.stateIdentity || client.identity;
  const protocol = 'ocpp1.6';
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
  const connectorBase = (evseId, connectorId) => ctx.states && typeof ctx.states.connectorBase === 'function'
    ? ctx.states.connectorBase(id, evseId, connectorId)
    : `${id}.connectors.${evseId}_${connectorId}`;

  handle('BootNotification', ({ params }) => {
    const p = params || {};
    const interval = Math.max(10, Number(ctx.config.heartbeatIntervalSec) || 300);
    fireRuntime('noteBoot', id, interval);
    defer('BootNotification', async () => {
      await ctx.states.upsertIdentityMeta(id, {
        protocol,
        vendor: p.chargePointVendor,
        model: p.chargePointModel,
        firmwareVersion: p.firmwareVersion,
        serialNumber: p.chargePointSerialNumber || p.meterSerialNumber,
        chargePointSerialNumber: p.chargePointSerialNumber,
        chargeBoxSerialNumber: p.chargeBoxSerialNumber,
        iccid: p.iccid,
        imsi: p.imsi,
        meterType: p.meterType,
        meterSerialNumber: p.meterSerialNumber,
      });
      await write(`${id}.info.heartbeatInterval`, interval, 'static');
    });
    return { status: 'Accepted', currentTime: new Date().toISOString(), interval };
  });

  handle('Authorize', ({ params }) => {
    const idTag = params && params.idTag;
    if (idTag) defer('Authorize', () => ctx.states.setRfid(id, idTag, undefined));
    return { idTagInfo: { status: 'Accepted' } };
  });

  handle('Heartbeat', () => {
    const now = new Date().toISOString();
    fireRuntime('noteHeartbeat', id, now);
    if (!ctx.runtime || typeof ctx.runtime.noteHeartbeat !== 'function') {
      defer('Heartbeat', () => write(`${id}.info.lastHeartbeat`, now, 'health'), { droppable: true });
    }
    return { currentTime: now };
  });

  handle('StatusNotification', ({ params }) => {
    const p = params || {};
    const { evseId, connectorId } = map16Connector(p.connectorId);
    defer('StatusNotification', async () => {
      await ctx.states.upsertEvseState(id, evseId, connectorId, {
        status: p.status,
        errorCode: p.errorCode,
        info: p.info,
        timestamp: p.timestamp || new Date().toISOString(),
        vendorErrorCode: p.vendorErrorCode,
        vendorId: p.vendorId,
      });
      if (ctx.runtime && typeof ctx.runtime.noteStatus === 'function') {
        await ctx.runtime.noteStatus(id, evseId, connectorId, p.status);
      }
    });
    return {};
  });

  handle('MeterValues', ({ params }) => {
    const p = params || {};
    const { evseId, connectorId } = map16Connector(p.connectorId);
    defer('MeterValues', () => applyMeterValues(ctx, id, evseId, connectorId, p.meterValue, protocol), { droppable: true });
    return {};
  });

  handle('StartTransaction', ({ params }) => {
    const p = params || {};
    if (!(client._transactions instanceof Map)) client._transactions = new Map();
    let txId;
    do {
      txId = crypto.randomInt(1, 0x7fffffff);
    } while (client._transactions.has(String(txId)));
    const meterStart = Number(p.meterStart);
    const connectorId = Math.max(1, Number(p.connectorId) || 1);
    const ts = p.timestamp || new Date().toISOString();

    client._transactions.set(String(txId), {
      connectorId,
      meterStart: Number.isFinite(meterStart) ? meterStart : undefined,
      idTag: p.idTag,
      startedAt: ts,
    });
    client._lastConnectorId = connectorId;
    client._lastTransactionId = txId;

    defer('StartTransaction', async () => {
      await ctx.states.pushTransactionEvent(id, {
        type: 'Start', txId, evseId: 1, connectorId, idTag: p.idTag,
        meterStart: Number.isFinite(meterStart) ? meterStart : undefined,
        chargingState: 'Charging', ts,
      });
      if (Number.isFinite(meterStart)) {
        let base;
        if (ctx.states && typeof ctx.states.ensureConnectorStructure === 'function') {
          base = await ctx.states.ensureConnectorStructure(id, 1, connectorId);
        } else {
          base = connectorBase(1, connectorId);
        }
        if (base) {
          await write(`${base}.energyWh`, meterStart, 'counter');
          await write(`${base}.energyKWh`, meterStart / 1000, 'counter');
        }
      }
    });
    return { transactionId: txId, idTagInfo: { status: 'Accepted' } };
  });

  handle('StopTransaction', ({ params }) => {
    const p = params || {};
    const txId = p.transactionId ?? client._lastTransactionId;
    const txKey = txId === undefined || txId === null ? undefined : String(txId);
    const txMeta = txKey && client._transactions instanceof Map ? client._transactions.get(txKey) : undefined;
    const connectorId = txMeta && Number.isFinite(Number(txMeta.connectorId))
      ? Math.max(1, Number(txMeta.connectorId))
      : (client._lastConnectorId || 1);
    const ts = p.timestamp || new Date().toISOString();
    if (txKey && client._transactions instanceof Map) client._transactions.delete(txKey);

    defer('StopTransaction', async () => {
      if (Array.isArray(p.transactionData)) await applyMeterValues(ctx, id, 1, connectorId, p.transactionData, protocol);
      await ctx.states.pushTransactionEvent(id, {
        type: 'Stop', txId, evseId: 1, connectorId,
        idTag: p.idTag || (txMeta && txMeta.idTag),
        meterStop: Number.isFinite(Number(p.meterStop)) ? Number(p.meterStop) : undefined,
        reason: p.reason, chargingState: 'Idle', ts,
      });
    });
    return { idTagInfo: { status: 'Accepted' } };
  });

  handle('FirmwareStatusNotification', ({ params }) => {
    defer('FirmwareStatusNotification', () => write(`${id}.info.firmwareStatus`, params && params.status, 'status'), { droppable: true });
    return {};
  });

  handle('DiagnosticsStatusNotification', ({ params }) => {
    defer('DiagnosticsStatusNotification', () => write(`${id}.info.diagnosticsStatus`, params && params.status, 'status'), { droppable: true });
    return {};
  });

  handle('DataTransfer', ({ params }) => {
    const p = params || {};
    const vin = findVinInPayload(p.data);
    if (vin) defer('DataTransfer:VIN', () => write(`${id}.info.vin`, vin, 'static'));
    return { status: 'Accepted' };
  });

  client.handle(async ({ method, params }) => {
    fireRuntime('noteMessage', id, method);
    capture(method, params);
    return auto(method, { preferFailure: true });
  });
}

module.exports = { registerHandlers, map16Connector };
