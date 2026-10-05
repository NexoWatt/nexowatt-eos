'use strict';

// A commissioned topology is required: a live socket or synthetic 1:1 default
// is not evidence of a physical connector count. No secrets are stored here.
function parseChargePointInventory(value) {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('EOS_CONNECTOR_INVENTORY_INVALID');
  const stations = new Map();
  let count = 0;
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || Object.keys(row).sort().join(',') !== 'connectorId,evseId,stationIdentity'
      || typeof row.stationIdentity !== 'string' || row.stationIdentity.length < 1 || row.stationIdentity.length > 128
      || row.stationIdentity.trim() !== row.stationIdentity || /[\x00-\x1f\x7f]/.test(row.stationIdentity)
      || !Number.isSafeInteger(row.evseId) || row.evseId < 1 || row.evseId > 1000
      || !Number.isSafeInteger(row.connectorId) || row.connectorId < 1 || row.connectorId > 1000) {
      throw new Error('EOS_CONNECTOR_INVENTORY_INVALID');
    }
    if (!stations.has(row.stationIdentity)) stations.set(row.stationIdentity, new Set());
    const connectors = stations.get(row.stationIdentity);
    const key = `${row.evseId}:${row.connectorId}`;
    if (connectors.has(key)) throw new Error('EOS_CONNECTOR_INVENTORY_DUPLICATE');
    connectors.add(key);
    count++;
  }
  return { count, stations };
}

function assertStationScope(inventory, entry, limit, payload = {}) {
  if (!inventory || !Number.isSafeInteger(limit) || inventory.count < 1 || inventory.count > limit) {
    throw new Error('EOS_CHARGE_POINT_LIMIT');
  }
  const declared = inventory.stations.get(entry?.rawIdentity);
  if (!declared || !declared.size) throw new Error('EOS_CONNECTOR_INVENTORY_REQUIRED');
  for (const key of entry.connectors || []) {
    const [evse, connector] = key.split(':').map(Number);
    // 0 addresses aggregate measurements; it never proves a physical connector.
    if (evse > 0 && connector > 0 && !declared.has(key)) throw new Error('EOS_CONNECTOR_INVENTORY_MISMATCH');
  }
  const target = payload.evse && typeof payload.evse === 'object' ? payload.evse : payload;
  const evse = target === payload ? target.evseId : target.id;
  const connector = target.connectorId;
  if (evse !== undefined && (!Number.isSafeInteger(evse) || evse < 0)) throw new Error('EOS_CONNECTOR_TARGET_INVALID');
  if (connector !== undefined && (!Number.isSafeInteger(connector) || connector < 0)) throw new Error('EOS_CONNECTOR_TARGET_INVALID');
  if (Number(evse) > 0 && ![...declared].some(key => key.startsWith(`${evse}:`))) throw new Error('EOS_CONNECTOR_TARGET_UNKNOWN');
  if (Number(connector) > 0) {
    const selectedEvse = Number(evse) > 0 ? evse : entry.proto === 'ocpp1.6' ? 1 : undefined;
    if (selectedEvse === undefined || !declared.has(`${selectedEvse}:${connector}`)) throw new Error('EOS_CONNECTOR_TARGET_UNKNOWN');
  }
}

function isTelemetryRequest(method, payload, options) {
  return options?.licenseTelemetry === true && method === 'TriggerMessage'
    && ['MeterValues', 'StatusNotification'].includes(payload?.requestedMessage);
}

module.exports = { parseChargePointInventory, assertStationScope, isTelemetryRequest };
