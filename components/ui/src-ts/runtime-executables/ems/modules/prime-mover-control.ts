// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt gemeinsame Betriebs- und Leistungsanforderungen steuerbarer Erzeuger.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/prime-mover-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * C3.5 – gemeinsame, typisierte Zustandsmaschine fuer BHKW und Generator.
 *
 * Beide Erzeuger sind keine flexiblen Verbraucher und reservieren deshalb kein
 * Verbrauchsbudget. Ihre reale Erzeugung wirkt ueber den kanonischen NVP und die
 * Energieflussmessung in das zentrale EMS zurueck. Die Start-/Stop-Entscheidung
 * verwendet ausschliesslich frische SoC-, Betriebs- und optional NVP-Werte.
 */

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { BaseModule }: { BaseModule: new (adapter: AnyRecord, dpRegistry: AnyRecord | null) => AnyRecord } = require('./base');
const {
  withActuatorShadowContext,
  priorityForOwner,
  isActuatorAuthorityBlockedResult,
}: {
  withActuatorShadowContext: <T>(adapter: AnyRecord, context: AnyRecord, fn: () => Promise<T> | T) => Promise<T>;
  priorityForOwner: (owner: unknown) => number;
  isActuatorAuthorityBlockedResult: (value: unknown) => boolean;
} = require('../services/actuator-shadow-arbiter');
const { ActuatorCommandContract }: { ActuatorCommandContract: new () => ActuatorContract } = require('../services/actuator-command-contract');
const { resolveCurrentNvpSnapshot }: { resolveCurrentNvpSnapshot: (snapshot: unknown, now: number, maxAgeMs: number) => AnyRecord } = require('../services/measurement-freshness');
const { recordAcceptedActuatorTransition }: { recordAcceptedActuatorTransition: (adapter: AnyRecord, input: AnyRecord) => AnyRecord | null } = require('../services/accepted-power-effects');

type AnyRecord = Record<string, any>;
type PrimeMoverKind = 'bhkw' | 'generator';
type CommandProfile = 'pulse' | 'dual-level' | 'run-level';
type CommandName = 'start' | 'stop';

type PrimeMoverSpec = {
  kind: PrimeMoverKind;
  label: string;
  devicePrefix: 'b' | 'g';
  moduleName: string;
};

type PrimeMoverDevice = {
  idx: number;
  id: string;
  enabled: boolean;
  name: string;
  showInLive: boolean;
  userCanControl: boolean;
  startWriteId: string;
  stopWriteId: string;
  runWriteId: string;
  runningReadId: string;
  powerReadId: string;
  powerScale: number;
  socStartPct: number;
  socStopPct: number;
  minRunMin: number;
  minOffMin: number;
  measurementMaxAgeMs: number;
  socMaxAgeMs: number;
  runningPowerThresholdW: number;
  commandProfile: CommandProfile;
  pulseMs: number;
  requireReadback: boolean;
  commandTimeoutMs: number;
  retryDelayMs: number;
  maxRetries: number;
  faultLockMs: number;
  ownerLeaseMs: number;
  requireGridImportForAutoStart: boolean;
  gridImportStartW: number;
  stopOnGridExportW: number;
  gridMaxAgeMs: number;
};

type DeviceRuntime = {
  wasRunning: boolean | null;
  stateSinceTs: number;
  lastOnMs: number;
  lastOffMs: number;
  lastCmdMs: number;
  lastCmd: string;
  reconstructed: boolean;
};

type ForeignSnapshot<T> = {
  mapped: boolean;
  present: boolean;
  fresh: boolean;
  value: T | null;
  ageMs: number | null;
  changeAgeMs: number | null;
  ts: number | null;
  lc: number | null;
};

type OperationalFeedback = {
  running: ForeignSnapshot<boolean>;
  power: ForeignSnapshot<number>;
  source: string;
};

type SocSnapshot = {
  configured: boolean;
  fresh: boolean;
  value: number | null;
  ageMs: number | null;
  source: string;
};

type WriteAttempt = {
  accepted: boolean;
  blocked: boolean;
  error: string;
};

type ActuatorContract = {
  prepare: (key: string, requested: unknown, now: number, cfg: AnyRecord) => AnyRecord;
  complete: (key: string, requested: unknown, accepted: boolean, readbackOk: boolean | null, actual: unknown, now: number, cfg: AnyRecord) => AnyRecord;
  defer: (key: string, requested: unknown, now: number, delayMs: number, status?: string) => AnyRecord;
  confirmFromReadback: (key: string, requested: unknown, actual: unknown, matches: boolean, now: number) => AnyRecord | null;
  result: (key: string, now?: number, targetChanged?: boolean) => AnyRecord;
  release: (key: string) => void;
};

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, numberOr(value, fallback)));
}

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = text(value).toLowerCase();
  if (['1', 'true', 'on', 'ein', 'running', 'run', 'active'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'aus', 'stopped', 'stop', 'inactive'].includes(normalized)) return false;
  return null;
}

function stateTimestamp(state: AnyRecord | null | undefined, field: 'ts' | 'lc'): number | null {
  const value = Number(state && state[field]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeCommandProfile(raw: unknown): CommandProfile {
  const value = text(raw).toLowerCase();
  if (['runlevel', 'run-level', 'run', 'single-level', 'singlelevel', 'enable'].includes(value)) return 'run-level';
  if (['level', 'duallevel', 'dual-level', 'two-wire', 'twowire'].includes(value)) return 'dual-level';
  return 'pulse';
}

function emptySnapshot<T>(mapped = false): ForeignSnapshot<T> {
  return { mapped, present: false, fresh: false, value: null, ageMs: null, changeAgeMs: null, ts: null, lc: null };
}

export class PrimeMoverControlModule extends BaseModule {
  public adapter: AnyRecord;
  public dp: AnyRecord | null;
  public devices: PrimeMoverDevice[] = [];
  private readonly spec: PrimeMoverSpec;
  private readonly runtime = new Map<string, DeviceRuntime>();
  private readonly actuatorContract: ActuatorContract = new ActuatorCommandContract();
  private readonly stateCache = new Map<string, unknown>();
  private readonly maxDevices = 10;
  private inited = false;

  constructor(adapter: AnyRecord, dpRegistry: AnyRecord | null, spec: PrimeMoverSpec) {
    super(adapter, dpRegistry);
    this.adapter = adapter;
    this.dp = dpRegistry || null;
    this.spec = spec;
  }

  async init(): Promise<void> {
    await this.ensureObjects();
    await this.loadConfig();
    this.inited = true;
  }

  private root(): string { return this.spec.kind; }
  private deviceId(index: number): string { return `${this.spec.devicePrefix}${index}`; }
  private deviceBase(device: PrimeMoverDevice): string { return `${this.root()}.devices.${device.id}`; }
  private userBase(device: PrimeMoverDevice): string { return `${this.root()}.user.${device.id}`; }
  private automaticOwner(device: PrimeMoverDevice): string { return `${this.root()}.${device.id}`; }
  private manualOwner(device: PrimeMoverDevice): string { return `manual.${this.root()}.${device.id}`; }

  private async ensureObjects(): Promise<void> {
    const channel = (id: string, name: string) => this.adapter.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const state = (id: string, name: string, type: string, role: string, writable = false, defaultValue?: unknown, unit = '') => {
      const common: AnyRecord = { name, type, role, read: true, write: writable };
      if (defaultValue !== undefined) common.def = defaultValue;
      if (unit) common.unit = unit;
      return this.adapter.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await channel(this.root(), this.spec.label);
    await channel(`${this.root()}.devices`, `${this.spec.label} Geraete`);
    await channel(`${this.root()}.user`, `${this.spec.label} Bedienung`);

    const definitions: Array<[string, string, string, string, unknown, string]> = [
      ['running', 'Laeuft', 'boolean', 'indicator.running', false, ''],
      ['runningFresh', 'Laufstatus frisch', 'boolean', 'indicator', false, ''],
      ['runningAgeMs', 'Alter Laufstatus', 'number', 'value.interval', null, 'ms'],
      ['runningSource', 'Quelle Laufstatus', 'string', 'text', '', ''],
      ['powerW', 'Leistung', 'number', 'value.power', null, 'W'],
      ['powerFresh', 'Leistung frisch', 'boolean', 'indicator', false, ''],
      ['powerAgeMs', 'Alter Leistung', 'number', 'value.interval', null, 'ms'],
      ['socPct', 'SoC', 'number', 'value.battery', null, '%'],
      ['socFresh', 'SoC frisch', 'boolean', 'indicator', false, ''],
      ['socAgeMs', 'Alter SoC', 'number', 'value.interval', null, 'ms'],
      ['socSource', 'SoC Quelle', 'string', 'text', '', ''],
      ['nvpW', 'NVP Leistung', 'number', 'value.power', null, 'W'],
      ['nvpFresh', 'NVP frisch', 'boolean', 'indicator', false, ''],
      ['nvpStatus', 'NVP Status', 'string', 'text', '', ''],
      ['centralBudgetStatus', 'Einbindung zentrales EMS', 'string', 'text', '', ''],
      ['status', 'Status', 'string', 'text', '', ''],
      ['reason', 'Grund', 'string', 'text', '', ''],
      ['lastCommand', 'Letzter Befehl', 'string', 'text', '', ''],
      ['lastCommandTs', 'Letzter Befehl Zeitstempel', 'number', 'value.time', 0, ''],
      ['stateSinceTs', 'Realer Zustand seit', 'number', 'value.time', 0, ''],
      ['stateReconstructed', 'Zustand nach Neustart rekonstruiert', 'boolean', 'indicator', false, ''],
      ['owner', 'Aktor Owner', 'string', 'text', '', ''],
      ['requestedCommand', 'Angeforderter Befehl', 'string', 'text', '', ''],
      ['writeAccepted', 'Write akzeptiert', 'boolean', 'indicator', false, ''],
      ['writeConfirmed', 'Write durch Readback bestaetigt', 'boolean', 'indicator', false, ''],
      ['readbackOk', 'Readback bestaetigt', 'boolean', 'indicator', false, ''],
      ['readbackFresh', 'Readback frisch', 'boolean', 'indicator', false, ''],
      ['readbackAgeMs', 'Alter Readback', 'number', 'value.interval', null, 'ms'],
      ['writePending', 'Write ausstehend', 'boolean', 'indicator', false, ''],
      ['retryCount', 'Wiederholungen', 'number', 'value', 0, ''],
      ['faultLocked', 'Fehlerverriegelung', 'boolean', 'indicator', false, ''],
      ['faultUntil', 'Fehlerverriegelung bis', 'number', 'value.time', 0, ''],
      ['writeContractStatus', 'Aktor Vertragsstatus', 'string', 'text', '', ''],
      ['minRunRemainingSec', 'Verbleibende Mindestlaufzeit', 'number', 'value.interval', 0, 's'],
      ['minOffRemainingSec', 'Verbleibender Mindeststillstand', 'number', 'value.interval', 0, 's'],
    ];

    for (let index = 1; index <= this.maxDevices; index++) {
      const id = this.deviceId(index);
      const base = `${this.root()}.devices.${id}`;
      const user = `${this.root()}.user.${id}`;
      await channel(base, `${this.spec.label} ${index}`);
      await channel(user, `${this.spec.label} ${index} Bedienung`);
      for (const [suffix, name, type, role, defaultValue, unit] of definitions) {
        await state(`${base}.${suffix}`, name, type, role, false, defaultValue, unit);
      }
      await state(`${user}.mode`, 'Modus auto/manual/off', 'string', 'text', true, 'auto');
      await state(`${user}.command`, 'Befehl start/stop', 'string', 'text', true, '');
    }
  }

  private async loadConfig(): Promise<void> {
    const rootConfig = this.adapter?.config?.[this.spec.kind];
    const config = rootConfig && typeof rootConfig === 'object' ? rootConfig : {};
    const rows = Array.isArray(config.devices) ? config.devices : [];
    const used = new Set<number>();
    const devices: PrimeMoverDevice[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex] || {};
      const index = Math.max(1, Math.min(this.maxDevices, Math.round(numberOr(row.idx ?? row.index, rowIndex + 1))));
      if (used.has(index)) continue;
      used.add(index);
      const runningReadId = text(row.runningReadId || row.runningObjectId || row.runningId);
      const powerReadId = text(row.powerReadId || row.powerObjectId || row.powerId);
      const device: PrimeMoverDevice = {
        idx: index,
        id: this.deviceId(index),
        enabled: row.enabled === true,
        name: text(row.name) || `${this.spec.label} ${index}`,
        showInLive: row.showInLive !== false,
        userCanControl: row.userCanControl !== false,
        startWriteId: text(row.startWriteId || row.startObjectId || row.startId),
        stopWriteId: text(row.stopWriteId || row.stopObjectId || row.stopId),
        runWriteId: text(row.runWriteId || row.runObjectId || row.enableWriteId || row.enableId),
        runningReadId,
        powerReadId,
        powerScale: bounded(row.powerScale, 1, 0.000001, 1000000),
        socStartPct: bounded(row.socStartPct, 25, 0, 100),
        socStopPct: bounded(row.socStopPct, 60, 0, 100),
        minRunMin: bounded(row.minRunMin, 10, 0, 1440),
        minOffMin: bounded(row.minOffMin, 5, 0, 1440),
        measurementMaxAgeMs: Math.round(bounded(row.maxAgeSec, 30, 1, 3600) * 1000),
        socMaxAgeMs: Math.round(bounded(row.socMaxAgeSec, 60, 1, 3600) * 1000),
        runningPowerThresholdW: Math.max(0, numberOr(row.runningPowerThresholdW, 100)),
        commandProfile: normalizeCommandProfile(row.commandType || row.commandProfile || row.cmdType),
        pulseMs: Math.round(bounded(row.pulseMs ?? row.pulseDurationMs, 800, 50, 10000)),
        requireReadback: typeof row.requireReadback === 'boolean' ? row.requireReadback : !!(runningReadId || powerReadId),
        commandTimeoutMs: Math.round(bounded(row.commandTimeoutSec ?? row.readbackTimeoutSec, 60, 0.25, 300) * 1000),
        retryDelayMs: Math.round(bounded(row.retryDelaySec, 15, 0.25, 300) * 1000),
        maxRetries: Math.round(bounded(row.maxRetries, 2, 0, 20)),
        faultLockMs: Math.round(bounded(row.faultLockSec, 300, 1, 86400) * 1000),
        ownerLeaseMs: Math.round(bounded(row.ownerLeaseSec, 30, 5, 600) * 1000),
        requireGridImportForAutoStart: typeof row.requireGridImportForAutoStart === 'boolean'
          ? row.requireGridImportForAutoStart
          : row.requireFreshNvpForStart === true,
        gridImportStartW: Math.max(0, numberOr(row.gridImportStartW ?? row.minGridImportWForStart, 0)),
        stopOnGridExportW: Math.max(0, numberOr(row.stopOnGridExportW, 0)),
        gridMaxAgeMs: Math.round(bounded(row.gridMaxAgeSec ?? row.nvpMaxAgeSec, 15, 1, 3600) * 1000),
      };
      devices.push(device);
    }
    devices.sort((left, right) => left.idx - right.idx);
    this.devices = devices;

    if (this.dp) {
      for (const device of devices) {
        if (device.runningReadId) {
          await this.dp.upsert({ key: `${this.root()}.${device.id}.running`, name: `${device.name} Laufstatus`, objectId: device.runningReadId, dataType: 'boolean', direction: 'in', unit: '', scale: 1, offset: 0, invert: false, deadband: 0, note: 'Betriebs-Readback' });
        }
        if (device.powerReadId) {
          await this.dp.upsert({ key: `${this.root()}.${device.id}.powerW`, name: `${device.name} Leistung`, objectId: device.powerReadId, dataType: 'number', direction: 'in', unit: 'W', scale: device.powerScale, offset: 0, invert: false, deadband: 0, note: 'Erzeugerleistung' });
        }
      }
    }

    for (const device of devices) {
      const modeId = `${this.userBase(device)}.mode`;
      const existing = await this.adapter.getStateAsync(modeId).catch(() => null);
      if (!existing || existing.val === null || existing.val === undefined || existing.val === '') {
        await this.adapter.setStateAsync(modeId, 'auto', true);
      }
    }
  }

  private getRuntime(id: string): DeviceRuntime {
    const existing = this.runtime.get(id);
    if (existing) return existing;
    const created: DeviceRuntime = { wasRunning: null, stateSinceTs: 0, lastOnMs: 0, lastOffMs: 0, lastCmdMs: 0, lastCmd: '', reconstructed: false };
    this.runtime.set(id, created);
    return created;
  }

  private async setIfChanged(id: string, value: unknown): Promise<void> {
    const normalized = typeof value === 'number' && !Number.isFinite(value) ? null : value;
    if (this.stateCache.get(id) === normalized) return;
    this.stateCache.set(id, normalized); if (this.stateCache.size > 1000) { const __rc85Oldest = this.stateCache.keys().next().value; if (__rc85Oldest !== undefined) this.stateCache.delete(__rc85Oldest); } // RC85_BOUNDED_COLLECTION
    const previous = await this.adapter.getStateAsync(id).catch(() => null);
    if (previous && previous.val === normalized) return;
    await this.adapter.setStateAsync(id, normalized, true).catch(() => undefined);
    try { this.adapter.updateValue?.(id, normalized, Date.now()); } catch (_error) {}
  }

  private async readForeign<T>(objectId: string, maxAgeMs: number, parse: (value: unknown) => T | null): Promise<ForeignSnapshot<T>> {
    if (!objectId || typeof this.adapter?.getForeignStateAsync !== 'function') return emptySnapshot<T>(!!objectId);
    const now = Date.now();
    try {
      const state = await this.adapter.getForeignStateAsync(objectId);
      if (!state) return emptySnapshot<T>(true);
      const ts = stateTimestamp(state, 'ts');
      const lc = stateTimestamp(state, 'lc');
      const ageMs = ts === null ? null : Math.max(0, now - ts);
      const changeAgeMs = lc === null ? null : Math.max(0, now - lc);
      return {
        mapped: true,
        present: true,
        fresh: ageMs !== null && ageMs <= maxAgeMs,
        value: parse(state.val),
        ageMs,
        changeAgeMs,
        ts,
        lc,
      };
    } catch (_error) {
      return emptySnapshot<T>(true);
    }
  }

  private async socSnapshot(maxAgeMs: number): Promise<SocSnapshot> {
    const now = Date.now();
    const config = this.adapter?.config || {};
    const farmInfo = this.adapter?._nwGetStorageFarmRuntimeInfo?.();
    const fallbackFarmDispatchActive = !!farmInfo?.dispatchActive;
    const fallbackSingleActive = config.enableStorageControl === true;
    const authority = (typeof this.adapter?._nwGetStorageControlAuthority === 'function')
      ? this.adapter._nwGetStorageControlAuthority()
      : {
        selectedTopology: fallbackFarmDispatchActive ? 'farm' : (fallbackSingleActive ? 'single' : 'none'),
        reason: fallbackFarmDispatchActive
          ? 'legacy-writable-farm-active'
          : (fallbackSingleActive ? 'legacy-single-active' : 'no-active-storage-output'),
      };
    const topology = text(authority?.selectedTopology || 'none').toLowerCase();

    if (topology === 'farm') {
      // BHKW und Generator muessen dieselbe Farm-Sicht wie Speicherregler,
      // Tarife und Core-Budget verwenden. Ein alter Einzel-SoC darf einen
      // fehlenden oder veralteten Farm-SoC niemals kaschieren.
      let firstPresent: SocSnapshot | null = null;
      const candidates = [
        { id: 'storageFarm.totalSocOnline', source: 'storage-farm-online' },
        { id: 'storageFarm.totalSoc', source: 'storage-farm-total' },
      ];
      for (const candidate of candidates) {
        const state = await this.adapter.getStateAsync(candidate.id).catch(() => null);
        if (!state) continue;
        const ts = stateTimestamp(state, 'ts');
        const ageMs = ts === null ? null : Math.max(0, now - ts);
        const parsed = finiteNumberOrNull(state.val);
        const value = parsed !== null && parsed >= 0 && parsed <= 100 ? parsed : null;
        const snapshot: SocSnapshot = {
          configured: true,
          fresh: value !== null && ageMs !== null && ageMs <= maxAgeMs,
          value,
          ageMs,
          source: candidate.source,
        };
        if (snapshot.fresh) return snapshot;
        if (!firstPresent) firstPresent = snapshot;
      }
      return firstPresent || {
        configured: true,
        fresh: false,
        value: null,
        ageMs: null,
        source: `storage-farm-missing:${text(authority?.reason || 'unknown')}`,
      };
    }

    if (topology === 'single') {
      const overrideId = text(config.datapoints?.storageSoc);
      if (overrideId) {
        const age = Number(this.adapter?._nwGetCacheAgeMs?.('storageSoc', now));
        const value = finiteNumberOrNull(this.adapter?._nwGetNumberFromCacheFresh?.('storageSoc', maxAgeMs, null, now));
        return { configured: true, fresh: value !== null, value, ageMs: Number.isFinite(age) ? age : null, source: 'appcenter-override' };
      }
      const singleId = text(config.storage?.datapoints?.socObjectId);
      if (singleId) {
        const age = Number(this.dp?.getAgeMs?.('st.socPct'));
        const value = finiteNumberOrNull(this.dp?.getNumberFresh?.('st.socPct', maxAgeMs, null));
        return { configured: true, fresh: value !== null, value, ageMs: Number.isFinite(age) ? age : null, source: 'single-storage' };
      }
      const age = Number(this.adapter?._nwGetCacheAgeMs?.('storageSoc', now));
      const value = finiteNumberOrNull(this.adapter?._nwGetNumberFromCacheFresh?.('storageSoc', maxAgeMs, null, now));
      return { configured: false, fresh: value !== null, value, ageMs: Number.isFinite(age) ? age : null, source: value !== null ? 'automatic-single' : 'single-missing' };
    }

    return {
      configured: false,
      fresh: false,
      value: null,
      ageMs: null,
      source: `storage-none:${text(authority?.reason || 'no-active-storage-output')}`,
    };
  }

  private nvpSnapshot(device: PrimeMoverDevice): AnyRecord {
    return resolveCurrentNvpSnapshot(this.adapter?._nvpFreshnessSnapshot, Date.now(), Math.max(device.gridMaxAgeMs, 1000));
  }

  private async operationalFeedback(device: PrimeMoverDevice): Promise<OperationalFeedback> {
    const power = await this.readForeign<number>(device.powerReadId, device.measurementMaxAgeMs, (value) => {
      const parsed = finiteNumberOrNull(value);
      return parsed !== null ? Math.abs(parsed * device.powerScale) : null;
    });
    const direct = await this.readForeign<boolean>(device.runningReadId, device.measurementMaxAgeMs, parseBoolean);
    if (direct.mapped) {
      return { running: direct, power, source: direct.fresh ? 'running-readback' : 'running-readback-stale' };
    }
    if (power.mapped && power.fresh && typeof power.value === 'number') {
      return { running: { ...power, value: power.value >= device.runningPowerThresholdW }, power, source: 'power-threshold' };
    }
    return { running: direct, power, source: power.mapped ? 'power-stale' : 'missing' };
  }

  private actuatorIds(device: PrimeMoverDevice): string[] {
    return Array.from(new Set([device.startWriteId, device.stopWriteId, device.runWriteId].map(text).filter(Boolean)));
  }

  private exclusiveAuthority(device: PrimeMoverDevice, owner: string): boolean {
    if (owner.startsWith('manual.')) return true;
    const matrix = this.adapter?._stageAActuatorOwnerById;
    const ids = this.actuatorIds(device);
    if (!ids.length || !matrix || typeof matrix !== 'object') return false;
    return ids.every((id) => {
      const owners = Array.isArray(matrix[id]?.activeOwners) ? matrix[id].activeOwners.map(text).filter(Boolean) : [];
      return owners.length === 1 && owners[0] === owner;
    });
  }

  private contractConfig(device: PrimeMoverDevice): AnyRecord {
    return {
      requireReadback: device.requireReadback && !!(device.runningReadId || device.powerReadId),
      ackTimeoutMs: device.commandTimeoutMs,
      retryDelayMs: device.retryDelayMs,
      maxRetries: device.maxRetries,
      faultLockMs: device.faultLockMs,
    };
  }

  private async publishContract(device: PrimeMoverDevice, owner: string, command: string, result: AnyRecord, readback: ForeignSnapshot<boolean>): Promise<void> {
    const base = this.deviceBase(device);
    await this.setIfChanged(`${base}.owner`, owner);
    await this.setIfChanged(`${base}.requestedCommand`, command);
    await this.setIfChanged(`${base}.writeAccepted`, result?.accepted === true);
    await this.setIfChanged(`${base}.writeConfirmed`, result?.confirmed === true);
    await this.setIfChanged(`${base}.readbackOk`, result?.readbackOk === true);
    await this.setIfChanged(`${base}.readbackFresh`, readback.fresh);
    await this.setIfChanged(`${base}.readbackAgeMs`, readback.ageMs);
    await this.setIfChanged(`${base}.writePending`, result?.pending === true);
    await this.setIfChanged(`${base}.retryCount`, Math.max(0, Math.round(numberOr(result?.retryCount, 0))));
    await this.setIfChanged(`${base}.faultLocked`, result?.faultLocked === true);
    await this.setIfChanged(`${base}.faultUntil`, Math.max(0, numberOr(result?.faultUntil, 0)));
    await this.setIfChanged(`${base}.writeContractStatus`, text(result?.status));
  }

  private async rawWrite(objectId: string, value: unknown): Promise<WriteAttempt> {
    try {
      const result = await this.adapter.setForeignStateAsync(objectId, value, false);
      if (isActuatorAuthorityBlockedResult(result)) {
        return { accepted: false, blocked: true, error: text((result as AnyRecord).reason || 'blocked-by-authority') };
      }
      return { accepted: true, blocked: false, error: '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.adapter?.log?.warn?.(`[${this.root()}] write failed for '${objectId}': ${message}`);
      return { accepted: false, blocked: false, error: message };
    }
  }

  private writeContext(device: PrimeMoverDevice, owner: string, reason: string, manual: boolean, releaseAuthority: boolean): AnyRecord {
    return {
      owner,
      module: this.spec.moduleName,
      priority: priorityForOwner(owner),
      reason,
      leaseMs: manual ? 5 * 60 * 1000 : device.ownerLeaseMs,
      kind: `${this.root()}-command`,
      enforceAuthority: this.exclusiveAuthority(device, owner),
      releaseAuthority,
    };
  }

  private async pulseWrite(device: PrimeMoverDevice, objectId: string, owner: string, reason: string, manual: boolean): Promise<WriteAttempt> {
    if (!objectId || this.adapter?._nwShuttingDown) return { accepted: false, blocked: false, error: 'missing-target-or-shutdown' };
    const attempt = await withActuatorShadowContext(this.adapter, this.writeContext(device, owner, reason, manual, false), () => this.rawWrite(objectId, true));
    if (!attempt.accepted) return attempt;
    const reset = async () => {
      if (this.adapter?._nwShuttingDown) return;
      // Der Puls-Reset gehoert zum selben Aktorvertrag wie der Start-/Stop-Puls.
      // Ein kuenstlicher Safety-Owner wuerde mit einer laufenden manuellen Lease
      // konkurrieren und koennte den Reset selbst blockieren.
      await withActuatorShadowContext(this.adapter, {
        ...this.writeContext(device, owner, `${reason}:pulse-reset`, manual, true),
        kind: `${this.root()}-pulse-reset`,
      }, () => this.rawWrite(objectId, false));
    };
    if (typeof this.adapter?._nwSetTimeout === 'function') this.adapter._nwSetTimeout(() => { void reset(); }, device.pulseMs);
    else if (typeof this.adapter?.setTimeout === 'function' && !this.adapter._nwShuttingDown) this.adapter.setTimeout(() => { void reset(); }, device.pulseMs);
    else this.adapter?.log?.warn?.(`[${this.root()}] pulse reset for '${objectId}' could not be scheduled safely`);
    return attempt;
  }

  private async writeDesired(device: PrimeMoverDevice, desiredRunning: boolean, owner: string, reason: string, manual: boolean): Promise<WriteAttempt> {
    if (device.commandProfile === 'run-level') {
      const target = device.runWriteId || (device.startWriteId === device.stopWriteId ? device.startWriteId : '');
      if (!target) return { accepted: false, blocked: false, error: 'missing-run-write' };
      return withActuatorShadowContext(this.adapter, this.writeContext(device, owner, reason, manual, !desiredRunning), () => this.rawWrite(target, desiredRunning));
    }
    if (device.commandProfile === 'dual-level') {
      if (device.startWriteId && device.startWriteId === device.stopWriteId) {
        return withActuatorShadowContext(this.adapter, this.writeContext(device, owner, reason, manual, !desiredRunning), () => this.rawWrite(device.startWriteId, desiredRunning));
      }
      const active = desiredRunning ? device.startWriteId : device.stopWriteId;
      const inactive = desiredRunning ? device.stopWriteId : device.startWriteId;
      if (!active || !inactive) return { accepted: false, blocked: false, error: 'missing-dual-level-write' };
      const neutral = await withActuatorShadowContext(this.adapter, this.writeContext(device, owner, `${reason}:neutralize`, manual, false), () => this.rawWrite(inactive, false));
      if (!neutral.accepted) return neutral;
      return withActuatorShadowContext(this.adapter, this.writeContext(device, owner, reason, manual, !desiredRunning), () => this.rawWrite(active, true));
    }
    return this.pulseWrite(device, desiredRunning ? device.startWriteId : device.stopWriteId, owner, reason, manual);
  }

  private async requestState(device: PrimeMoverDevice, desiredRunning: boolean, reason: string, manual: boolean, readback: ForeignSnapshot<boolean>): Promise<AnyRecord> {
    const owner = manual ? this.manualOwner(device) : this.automaticOwner(device);
    const command: CommandName = desiredRunning ? 'start' : 'stop';
    const key = `${this.root()}:${device.id}:running`;
    const config = this.contractConfig(device);
    const now = Date.now();
    const confirmed = this.actuatorContract.confirmFromReadback(key, desiredRunning, readback.value, readback.fresh && readback.value === desiredRunning, now);
    if (confirmed) {
      await this.publishContract(device, owner, command, confirmed, readback);
      return confirmed;
    }
    const runtime = this.getRuntime(device.id);
    if (!manual && device.requireReadback !== true && runtime.lastCmd === command && runtime.lastCmdMs > 0) {
      const settleRemainingMs = device.commandTimeoutMs - (now - runtime.lastCmdMs);
      if (settleRemainingMs > 0) {
        const deferred = this.actuatorContract.defer(key, desiredRunning, now, settleRemainingMs, 'command-settle-wait');
        await this.publishContract(device, owner, command, deferred, readback);
        return deferred;
      }
    }
    const decision = this.actuatorContract.prepare(key, desiredRunning, now, config);
    if (!decision.allowed) {
      const current = this.actuatorContract.result(key, now, decision.targetChanged);
      await this.publishContract(device, owner, command, current, readback);
      return current;
    }
    const attempt = await this.writeDesired(device, desiredRunning, owner, reason, manual);
    if (attempt.blocked) {
      const deferred = this.actuatorContract.defer(key, desiredRunning, now, Math.min(device.retryDelayMs, 5000), 'blocked-by-authority');
      await this.publishContract(device, owner, command, deferred, readback);
      return deferred;
    }
    const after = (await this.operationalFeedback(device)).running;
    const readbackOk = after.fresh && after.value === desiredRunning ? true : null;
    const result = this.actuatorContract.complete(key, desiredRunning, attempt.accepted, readbackOk, after.value, Date.now(), config);
    await this.publishContract(device, owner, command, result, after);
    if (attempt.accepted) {
      // BHKW/Generator haben ohne Nennleistungsmodell keine sichere sofortige
      // Leistungsprognose. Der finale PV-Aktor wartet deshalb bei einem frisch
      // akzeptierten Start/Stop mindestens auf den nächsten NVP-Messzyklus,
      // statt im selben Tick gegen einen noch nicht reagierten Erzeuger zu regeln.
      recordAcceptedActuatorTransition(this.adapter, {
        key: `${this.root()}:${device.id}`,
        accepted: true,
        kind: 'generation',
        source: this.spec.moduleName,
        reason: `${reason}:${command}`,
      });
      runtime.lastCmdMs = Date.now();
      runtime.lastCmd = command;
      await this.setIfChanged(`${this.deviceBase(device)}.lastCommand`, command);
      await this.setIfChanged(`${this.deviceBase(device)}.lastCommandTs`, runtime.lastCmdMs);
      await this.setIfChanged(`${this.deviceBase(device)}.reason`, reason);
    }
    return result;
  }

  private updateRuntimeFromReadback(device: PrimeMoverDevice, snapshot: ForeignSnapshot<boolean>, now: number): void {
    if (!snapshot.fresh || typeof snapshot.value !== 'boolean') return;
    const runtime = this.getRuntime(device.id);
    const sinceTs = Math.max(0, Math.min(now, snapshot.lc || snapshot.ts || now));
    if (runtime.wasRunning === null) {
      runtime.wasRunning = snapshot.value;
      runtime.stateSinceTs = sinceTs;
      runtime.reconstructed = true;
      if (snapshot.value) runtime.lastOnMs = sinceTs;
      else runtime.lastOffMs = sinceTs;
      return;
    }
    if (runtime.wasRunning !== snapshot.value) {
      runtime.wasRunning = snapshot.value;
      runtime.stateSinceTs = sinceTs;
      if (snapshot.value) runtime.lastOnMs = sinceTs;
      else runtime.lastOffMs = sinceTs;
    }
  }

  private normalizeMode(value: unknown): 'auto' | 'manual' | 'off' {
    const mode = text(value).toLowerCase();
    if (mode === 'manuell') return 'manual';
    if (mode === 'aus') return 'off';
    return mode === 'manual' || mode === 'off' ? mode : 'auto';
  }

  private canActuate(device: PrimeMoverDevice): boolean {
    if (device.commandProfile === 'run-level') return !!(device.runWriteId || (device.startWriteId && device.startWriteId === device.stopWriteId));
    return !!(device.startWriteId && device.stopWriteId);
  }

  async tick(): Promise<void> {
    if (!this.inited || !this.devices.length) return;
    const now = Date.now();
    for (const device of this.devices) {
      if (!device.enabled) continue;
      const base = this.deviceBase(device);
      const user = this.userBase(device);
      const feedback = await this.operationalFeedback(device);
      const running = feedback.running;
      const power = feedback.power;
      const soc = await this.socSnapshot(device.socMaxAgeMs);
      const nvp = this.nvpSnapshot(device);
      this.updateRuntimeFromReadback(device, running, now);
      const runtime = this.getRuntime(device.id);
      const minRunMs = Math.round(device.minRunMin * 60000);
      const minOffMs = Math.round(device.minOffMin * 60000);
      const minRunRemainingSec = running.value === true && runtime.lastOnMs
        ? Math.max(0, Math.ceil((minRunMs - (now - runtime.lastOnMs)) / 1000))
        : 0;
      const minOffRemainingSec = running.value === false && runtime.lastOffMs
        ? Math.max(0, Math.ceil((minOffMs - (now - runtime.lastOffMs)) / 1000))
        : 0;

      await this.setIfChanged(`${base}.running`, typeof running.value === 'boolean' ? running.value : false);
      await this.setIfChanged(`${base}.runningFresh`, running.fresh);
      await this.setIfChanged(`${base}.runningAgeMs`, running.ageMs);
      await this.setIfChanged(`${base}.runningSource`, feedback.source);
      await this.setIfChanged(`${base}.powerW`, typeof power.value === 'number' ? Math.round(power.value) : null);
      await this.setIfChanged(`${base}.powerFresh`, power.fresh);
      await this.setIfChanged(`${base}.powerAgeMs`, power.ageMs);
      await this.setIfChanged(`${base}.socPct`, typeof soc.value === 'number' ? Math.round(soc.value * 10) / 10 : null);
      await this.setIfChanged(`${base}.socFresh`, soc.fresh);
      await this.setIfChanged(`${base}.socAgeMs`, soc.ageMs);
      await this.setIfChanged(`${base}.socSource`, soc.source);
      await this.setIfChanged(`${base}.nvpW`, nvp.usable ? Math.round(Number(nvp.netW) || 0) : null);
      await this.setIfChanged(`${base}.nvpFresh`, nvp.usable === true);
      await this.setIfChanged(`${base}.nvpStatus`, text(nvp.status || nvp.reason));
      await this.setIfChanged(`${base}.centralBudgetStatus`, 'producer-via-nvp');
      await this.setIfChanged(`${base}.stateSinceTs`, runtime.stateSinceTs);
      await this.setIfChanged(`${base}.stateReconstructed`, runtime.reconstructed);
      await this.setIfChanged(`${base}.minRunRemainingSec`, minRunRemainingSec);
      await this.setIfChanged(`${base}.minOffRemainingSec`, minOffRemainingSec);

      const modeState = await this.adapter.getStateAsync(`${user}.mode`).catch(() => null);
      const mode = this.normalizeMode(modeState?.val);
      const commandState = await this.adapter.getStateAsync(`${user}.command`).catch(() => null);
      const command = text(commandState?.val).toLowerCase();

      if (command === 'start' || command === 'stop') {
        if (mode === 'manual') await this.requestState(device, command === 'start', `manual:${command}`, true, running);
        else await this.setIfChanged(`${base}.reason`, 'manual:ignored_not_manual');
        await this.setIfChanged(`${user}.command`, '');
      }

      let status = '';
      let reason = '';
      if (!this.canActuate(device)) {
        status = 'Konfiguration unvollstaendig (Start/Stop-Write fehlt)';
        reason = 'config:missing-write';
      } else if (mode === 'off') {
        status = 'Aus';
        reason = 'off';
        if ((running.fresh && running.value === true) || (!running.fresh && runtime.wasRunning === true) || runtime.lastCmd === 'start') {
          await this.requestState(device, false, 'off:stop', true, running);
          reason = 'off:stop';
        }
      } else if (mode === 'manual') {
        status = 'Manuell';
        reason = 'manual';
      } else if (!soc.fresh || typeof soc.value !== 'number') {
        status = 'Auto (SoC fehlt/veraltet)';
        reason = 'auto:stale_soc';
      } else if (!running.fresh || typeof running.value !== 'boolean') {
        status = 'Auto (Laufstatus fehlt/veraltet)';
        reason = 'auto:stale_running';
      } else {
        const startAt = Math.min(device.socStartPct, device.socStopPct);
        const stopAt = Math.max(device.socStartPct, device.socStopPct);
        const canStartByTime = !runtime.lastOffMs || now - runtime.lastOffMs >= minOffMs;
        const canStopByTime = !runtime.lastOnMs || now - runtime.lastOnMs >= minRunMs;
        const startNeedsNvp = device.requireGridImportForAutoStart || device.gridImportStartW > 0;
        const gridImportW = nvp.usable ? Math.max(0, Number(nvp.netW) || 0) : 0;
        const gridExportW = nvp.usable ? Math.max(0, -(Number(nvp.netW) || 0)) : 0;

        if (running.value && device.stopOnGridExportW > 0 && nvp.usable && gridExportW >= device.stopOnGridExportW) {
          status = `Auto (Stop bei Export >= ${Math.round(device.stopOnGridExportW)} W)`;
          reason = canStopByTime ? 'auto:stop_grid_export' : 'auto:stop_blocked_min_run';
          if (canStopByTime) await this.requestState(device, false, reason, false, running);
        } else if (!running.value && soc.value <= startAt) {
          status = `Auto (Start bei <= ${startAt}%)`;
          if (!canStartByTime) reason = 'auto:start_blocked_min_off';
          else if (startNeedsNvp && !nvp.usable) reason = 'auto:start_blocked_stale_nvp';
          else if (device.gridImportStartW > 0 && gridImportW < device.gridImportStartW) reason = 'auto:start_blocked_grid_import';
          else {
            reason = 'auto:start_soc_low';
            await this.requestState(device, true, reason, false, running);
          }
        } else if (running.value && soc.value >= stopAt) {
          status = `Auto (Stop bei >= ${stopAt}%)`;
          reason = canStopByTime ? 'auto:stop_soc_high' : 'auto:stop_blocked_min_run';
          if (canStopByTime) await this.requestState(device, false, reason, false, running);
        } else {
          status = running.value ? 'Auto (laeuft)' : 'Auto (bereit)';
          reason = 'auto:idle';
        }
      }
      await this.setIfChanged(`${base}.status`, status);
      if (reason) await this.setIfChanged(`${base}.reason`, reason);
    }
  }
}

module.exports = { PrimeMoverControlModule };
