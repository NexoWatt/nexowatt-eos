// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt Ladeentscheidungen und Auditinformationen über die geschützten Diagnose-Endpunkte bereit.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/charging-diagnostics-api.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/** Read-only backend API for AppCenter charging diagnostics. */
declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;
type Middleware = (...args: any[]) => any;

const parseJsonState = (raw: unknown, fallback: any): any => {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
};
const readOwn = async (adapter: AnyRecord, id: string): Promise<any> => {
  const state = await adapter.getStateAsync(id);
  return state ? state.val : null;
};

function compactSafetyEnvelope(adapter: AnyRecord): AnyRecord {
  const source = adapter?._emsSafetyEnvelope && typeof adapter._emsSafetyEnvelope === 'object' ? adapter._emsSafetyEnvelope : {};
  return {
    valid: source.valid !== false, emergencyStop: source.emergencyStop === true,
    invalidReason: source.invalidReason ? String(source.invalidReason) : '',
    generation: Number.isFinite(Number(source.generation)) ? Number(source.generation) : 0,
    timestamp: Number.isFinite(Number(source.timestamp || source.ts)) ? Number(source.timestamp || source.ts) : 0,
  };
}

async function buildChargingDiagnosticsExtras(adapter: AnyRecord, limitRaw: unknown = 200): Promise<AnyRecord> {
  const limit = Number.isFinite(Number(limitRaw)) ? Math.max(1, Math.min(240, Math.round(Number(limitRaw)))) : 200;
  let audit: AnyRecord | null = null;
  try {
    const iface = adapter?._nwChargingManagementAudit;
    if (iface && typeof iface.getEvents === 'function') audit = iface.getEvents(limit);
  } catch { audit = null; }
  if (!audit || typeof audit !== 'object') {
    const snapshot = parseJsonState(await readOwn(adapter, 'chargingManagement.audit.snapshotJson'), null);
    const events = parseJsonState(await readOwn(adapter, 'chargingManagement.audit.recentEventsJson'), []);
    audit = {
      schemaVersion: 1, snapshot, events: Array.isArray(events) ? events.slice(-limit) : [],
      eventCount: await readOwn(adapter, 'chargingManagement.audit.eventCount'), maxEvents: 240,
      lastEventTs: await readOwn(adapter, 'chargingManagement.audit.lastEventTs'),
    };
  }
  return { ok: true, ts: Date.now(), audit, safetyEnvelope: compactSafetyEnvelope(adapter), stageA: adapter?._stageADiagnostics || null };
}

async function clearChargingDiagnosticsAudit(adapter: AnyRecord): Promise<AnyRecord> {
  const iface = adapter?._nwChargingManagementAudit;
  if (iface && typeof iface.clear === 'function') {
    const result = await iface.clear();
    return result && typeof result === 'object' ? result : { ok: true, cleared: true };
  }
  await adapter.setStateAsync('chargingManagement.audit.recentEventsJson', { val: '[]', ack: true });
  await adapter.setStateAsync('chargingManagement.audit.lastEventJson', { val: '{}', ack: true });
  await adapter.setStateAsync('chargingManagement.audit.eventCount', { val: 0, ack: true });
  await adapter.setStateAsync('chargingManagement.audit.lastEventTs', { val: 0, ack: true });
  return { ok: true, cleared: true, fallback: true };
}

function registerChargingDiagnosticsAuditApi(app: AnyRecord, adapter: AnyRecord, requireInstaller: Middleware): void {
  app.get('/api/ems/charging/audit', requireInstaller, async (req: AnyRecord, res: AnyRecord) => {
    try { return res.json(await buildChargingDiagnosticsExtras(adapter, req?.query?.limit)); }
    catch (error: any) {
      adapter.log?.warn?.(`Charging diagnostics API error: ${error?.message || error}`);
      return res.status(500).json({ ok: false, error: 'internal error' });
    }
  });
  app.post('/api/ems/charging/audit/clear', requireInstaller, async (_req: AnyRecord, res: AnyRecord) => {
    try { return res.json(await clearChargingDiagnosticsAudit(adapter)); }
    catch (error: any) {
      adapter.log?.warn?.(`Charging diagnostics clear API error: ${error?.message || error}`);
      return res.status(500).json({ ok: false, error: 'internal error' });
    }
  });
}

module.exports = { registerChargingDiagnosticsAuditApi, buildChargingDiagnosticsExtras, clearChargingDiagnosticsAudit, compactSafetyEnvelope };
