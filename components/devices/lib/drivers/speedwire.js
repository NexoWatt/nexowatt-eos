'use strict';

/**
 * SMA Speedwire (UDP multicast/unicast) driver.
 *
 * Primary supported payload:
 *   - SMA Energy Meter / Sunny Home Manager meter telegrams (protocol-id 0x6069)
 *
 * This driver is designed as a *listener* (multicast/unicast). It does not poll
 * by sending requests. Instead, it keeps the most recent telegram in memory and
 * serves datapoint reads from that cache.
 */

const dgram = require('node:dgram');
const os = require('node:os');

function _errMsg(err) {
  try { return (err && err.message) ? String(err.message) : String(err); } catch (_) { return ''; }
}

function isMulticastIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  return Number.isFinite(a) && a >= 224 && a <= 239;
}

function listNonInternalIpv4Addresses() {
  try {
    const ifs = os.networkInterfaces();
    const out = [];
    for (const infos of Object.values(ifs || {})) {
      if (!Array.isArray(infos)) continue;
      for (const info of infos) {
        if (!info) continue;
        // Node 18+: family is a string ('IPv4'/'IPv6')
        const family = (info.family || '').toString();
        if (family !== 'IPv4') continue;
        if (info.internal) continue;
        const addr = (info.address || '').toString().trim();
        if (!addr || addr === '0.0.0.0') continue;
        out.push(addr);
      }
    }
    return Array.from(new Set(out));
  } catch (_) {
    return [];
  }
}

function toHex(n, len = 4) {
  try {
    const s = (Number(n) >>> 0).toString(16).toUpperCase();
    return '0x' + s.padStart(len, '0');
  } catch (_) {
    return String(n);
  }
}

function findProtocolIdOffset(buf) {
  // Speedwire telegrams (SMA) typically place the protocol-id at byte offset 16.
  // However, newer devices may use different protocol ids (0x60xx). Therefore we
  // avoid hard-coding specific ids and instead use a robust offset heuristic.
  //
  // Strategy:
  //   1) Fast path: try the known fixed offset 16 and accept it if the high byte is 0x60.
  //   2) Fallback: scan the first 64 bytes for a 0x60xx pattern that is followed by a
  //      plausible meter payload (device address + timestamp + OBIS field header).
  if (!Buffer.isBuffer(buf) || buf.length < 24) return -1;

  // 1) Fixed offset (common for SMA Energy Meter / SHM telegrams)
  try {
    if (buf.length >= 18) {
      const pid = buf.readUInt16BE(16);
      if (((pid >> 8) & 0xFF) === 0x60) return 16;
    }
  } catch (_) {
    // ignore
  }

  // 2) Heuristic scan (limit window to avoid false-positives in payload)
  const headLen = Math.min(buf.length, 64);
  for (let i = 0; i <= headLen - 2; i++) {
    if (buf[i] !== 0x60) continue;

    const payloadStart = i + 2;
    const obisStart = payloadStart + 10; // susyId (2) + serial (4) + timestamp (4)
    if (obisStart + 4 > buf.length) continue;

    const b = buf.readUInt8(obisStart);
    const c = buf.readUInt8(obisStart + 1);
    const d = buf.readUInt8(obisStart + 2);
    const e = buf.readUInt8(obisStart + 3);

    // OBIS terminator is 0.0.0.0 – skip those
    if (b === 0 && c === 0 && d === 0 && e === 0) continue;

    // Measurement type d is commonly 4 (current values) or 8 (counters)
    if (d !== 4 && d !== 8) continue;

    // OBIS c is typically a small positive number (avoid picking random bytes)
    if (c < 1 || c > 200) continue;

    return i;
  }

  return -1;
}

function normalizeObisValue(c, d, raw) {
  // `raw` is int32 (for d==4) or BigInt (for d==8).

  if (raw === null || raw === undefined) return undefined;

  // Energy meter reading (IEC OBIS measurement type 8): SMA uses Ws.
  if (d === 8) {
    // Convert Ws -> kWh
    try {
      const ws = (typeof raw === 'bigint') ? raw : BigInt(raw);
      const kwh = Number(ws) / 3600000;
      if (!Number.isFinite(kwh)) return undefined;
      return kwh;
    } catch (_) {
      return undefined;
    }
  }

  // Current average values (measurement type 4)
  if (d === 4) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;

    // Currents (mA -> A)
    if (c === 31 || c === 51 || c === 71) return n / 1000;

    // Voltages (mV -> V)
    if (c === 32 || c === 52 || c === 72) return n / 1000;

    // Power factor (0.001)
    if (c === 13 || c === 33 || c === 53 || c === 73) return n / 1000;

    // Frequency (best-effort): common implementations use 0.01 Hz steps
    if (c === 14) return n / 100;

    // Default: power values (SMA spec states 0.1 W resolution)
    // Convert to kW: 0.1 W -> kW => / 10 / 1000 => / 10000
    return n / 10000;
  }

  // Unknown measurement types (manufacturer specific). Provide raw numeric best-effort.
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseEnergyMeterTelegram(buf) {
  // Minimal parser for SMA Speedwire energy meter telegrams.
  // Returns { protocolId, susyId, serialNumber, timestampMs, valuesByCde }.

  if (!Buffer.isBuffer(buf) || buf.length < 40) return null;

  // Optional header sanity: starts with "SMA"\0
  const header = buf.subarray(0, 4).toString('ascii');
  if (!header.startsWith('SMA')) {
    // Not an SMA telegram – ignore silently.
    return null;
  }

  const protoOffset = findProtocolIdOffset(buf);
  if (protoOffset < 0 || protoOffset + 2 >= buf.length) return null;

  const protocolId = buf.readUInt16BE(protoOffset);
  const payloadStart = protoOffset + 2;

  // Payload begins with 6 bytes SMA device address:
  //   susyId (uint16 BE) + serialNumber (uint32 BE)
  if (payloadStart + 10 > buf.length) return null;

  const susyId = buf.readUInt16BE(payloadStart);
  const serialNumber = buf.readUInt32BE(payloadStart + 2);
  const timestampMs = buf.readUInt32BE(payloadStart + 6);

  // OBIS data fields begin after address (6) + timestamp (4)
  let p = payloadStart + 10;
  const valuesByCde = new Map(); // key: `${c}.${d}.${e}`
  const valuesByBcde = new Map(); // key: `${b}:${c}.${d}.${e}`

  // The telegram is fixed-length (600/608 bytes), but it contains an end-marker OBIS.
  while (p + 8 <= buf.length) {
    const b = buf.readUInt8(p);
    const c = buf.readUInt8(p + 1);
    const d = buf.readUInt8(p + 2);
    const e = buf.readUInt8(p + 3);
    p += 4;

    // End of data
    if (b === 0 && c === 0 && d === 0 && e === 0) break;

    let raw;
    if (d === 8) {
      if (p + 8 > buf.length) break;
      try {
        raw = buf.readBigUInt64BE(p);
      } catch (_) {
        // Fallback for environments without BigInt read helper
        const hi = buf.readUInt32BE(p);
        const lo = buf.readUInt32BE(p + 4);
        raw = (BigInt(hi) << 32n) + BigInt(lo);
      }
      p += 8;
    } else {
      if (p + 4 > buf.length) break;
      raw = buf.readInt32BE(p);
      p += 4;
    }

    const val = normalizeObisValue(c, d, raw);
    const keyCde = `${c}.${d}.${e}`;
    const keyBcde = `${b}:${keyCde}`;
    valuesByBcde.set(keyBcde, val);

    // Convenience: keep first-seen value per C/D/E (covers channel 0 vs 1 differences)
    if (!valuesByCde.has(keyCde)) valuesByCde.set(keyCde, val);
  }

  return {
    protocolId,
    susyId,
    serialNumber,
    timestampMs,
    valuesByCde,
    valuesByBcde,
  };
}




function isLikelyMeterTelegram(parsed) {
  // Best-effort guard to reduce the risk of accepting non-meter telegrams.
  // SMA Energy Meter / SHM telegrams contain OBIS current values (d=4) and
  // counters (d=8). We accept a telegram if it contains at least one of the
  // commonly used OBIS keys for import/export power/energy.
  try {
    const m = parsed?.valuesByCde;
    if (!m || typeof m.has !== 'function') return false;
    const keys = ['1.4.0', '2.4.0', '1.8.0', '2.8.0'];
    for (const k of keys) {
      if (m.has(k)) return true;
    }
    // Fallback: any non-trivial OBIS map
    return typeof m.size === 'number' ? (m.size >= 5) : false;
  } catch (_) {
    return false;
  }
}


class SpeedwireHub {
  constructor(adapter, opts) {
    this.adapter = adapter;
    this.port = Number(opts.port || 9522);
    this.multicastGroup = (opts.multicastGroup || '239.12.255.254').toString();
    this.interfaceAddress = (opts.interfaceAddress || '').toString().trim();

    this.socket = null;
    this.started = false;
    this.starting = null;
    this.handlers = new Set();

    // Diagnostics (help users troubleshoot multicast issues)
    this.rxCount = 0;
    this.parsedCount = 0;
    this.lastRxAt = 0;
    this.lastParsedAt = 0;
    this.lastParsedFrom = '';

    // Multicast refresh: some IGMP-snooping switches without an IGMP querier
    // can stop forwarding multicast after a few minutes. Periodically re-joining
    // the group can keep such networks alive.
    this.multicastRefreshMs = Number(opts.multicastRefreshMs || 60000);
    this._refreshTimer = null;
    this._joinedIfaces = [];

    // Best-effort: avoid rejoin spam in case multiple devices detect staleness at once.
    this._lastRefreshAt = 0;

    // Watchdog: handle "no telegram received yet" situations more robustly.
    // In some setups (Docker/LXC/VM, multi-homed hosts, interface flaps), the kernel may not
    // deliver multicast until membership is refreshed or the socket is recreated.
    this.noDataRefreshMs = Number(opts.noDataRefreshMs || 20000);
    this.noDataRestartMs = Number(opts.noDataRestartMs || 120000);
    this.startedAt = 0;
    this._noDataRefreshedAt = 0;
    this._watchdogTimer = null;
    this._restartCount = 0;
    this._lastRestartAt = 0;
    this._restarting = false;
  }

  async _restartSocket(reason = '') {
    if (this._restarting) return;
    if (this.starting) return;
    if (!this.socket) return;

    this._restarting = true;
    const sock = this.socket;
    this.socket = null;
    this.started = false;
    this.starting = null;

    // Reset counters (helps diagnostics after restart)
    this.rxCount = 0;
    this.parsedCount = 0;
    this.lastRxAt = 0;
    this.lastParsedAt = 0;
    this.lastParsedFrom = '';
    this.startedAt = 0;
    this._noDataRefreshedAt = 0;

    await new Promise((resolve) => {
      try { sock.close(() => resolve()); } catch (_) { resolve(); }
    });

    try {
      if (reason) this._logWarn(`[speedwire] Restarting UDP listener (${reason}).`);
      await this.start();
    } catch (e) {
      this._logWarn(`[speedwire] Restart failed: ${_errMsg(e)}`);
    } finally {
      this._restarting = false;
    }
  }

  _startWatchdog() {
    try {
      if (this._watchdogTimer) clearInterval(this._watchdogTimer);
      this._watchdogTimer = setInterval(() => {
        try {
          if (!this.socket || !this.started) return;

          const now = Date.now();
          if (!this.startedAt) this.startedAt = now;

          // "No telegram received yet" for too long -> refresh membership and potentially restart.
          if (this.rxCount === 0) {
            if (this.noDataRefreshMs > 0 && (now - this.startedAt) > this.noDataRefreshMs && !this._noDataRefreshedAt) {
              this._noDataRefreshedAt = now;
              this.refreshMembershipNow('no-telegram-yet');
            }

            if (this.noDataRestartMs > 0 && (now - this.startedAt) > this.noDataRestartMs) {
              // Throttle restarts to avoid spamming on networks that simply block multicast.
              if ((now - this._lastRestartAt) > 300000 && this._restartCount < 3) {
                this._restartCount += 1;
                this._lastRestartAt = now;
                void this._restartSocket(`no telegram after ${now - this.startedAt} ms (attempt ${this._restartCount}/3)`);
              }
            }
          } else {
            // Reset restart counters once we have any traffic.
            this._restartCount = 0;
            this._lastRestartAt = 0;
          }
        } catch (_) {
          // ignore
        }
      }, 10000);
      if (typeof this._watchdogTimer.unref === 'function') this._watchdogTimer.unref();
    } catch (_) {
      // ignore
    }
  }

  refreshMembershipNow(reason = '') {
    try {
      if (!this.socket) return;

      const now = Date.now();
      if (this._lastRefreshAt && (now - this._lastRefreshAt) < 5000) return;
      this._lastRefreshAt = now;

      const ifaces = Array.isArray(this._joinedIfaces) && this._joinedIfaces.length ? this._joinedIfaces : ['default'];
      for (const iface of ifaces) {
        try {
          if (iface === 'default') {
            try { this.socket.dropMembership(this.multicastGroup); } catch (_) { /* ignore */ }
            try { this.socket.addMembership(this.multicastGroup); } catch (_) { /* ignore */ }
          } else {
            try { this.socket.dropMembership(this.multicastGroup, iface); } catch (_) { /* ignore */ }
            try { this.socket.addMembership(this.multicastGroup, iface); } catch (_) { /* ignore */ }
          }
        } catch (_) {
          // ignore per iface
        }
      }

      if (reason) {
        this._logDebug(`[speedwire] Refreshed multicast membership (${reason}).`);
      }
    } catch (_) {
      // ignore
    }
  }

  _logDebug(msg) {
    try {
      if (this.adapter?.log?.debug) this.adapter.log.debug(msg);
    } catch (_) { /* ignore */ }
  }

  _logWarn(msg) {
    try {
      if (this.adapter?.log?.warn) this.adapter.log.warn(msg);
    } catch (_) { /* ignore */ }
  }

  async start() {
    if (this.started) return;
    if (this.starting) return await this.starting;

    this.starting = (async () => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.socket = sock;

      sock.on('error', (err) => {
        this._logWarn(`[speedwire] UDP socket error (${this.multicastGroup}:${this.port}): ${_errMsg(err)}`);
        try { sock.close(); } catch (_) { /* ignore */ }
        this.socket = null;
        this.started = false;
        this.starting = null;
      });

      sock.on('message', (msg, rinfo) => {
        try {
          this.rxCount += 1;
          this.lastRxAt = Date.now();

          const parsed = parseEnergyMeterTelegram(msg);
          if (!parsed) return;

          // Guard: only forward telegrams that look like meter/SHM telegrams.
          if (!isLikelyMeterTelegram(parsed)) return;

          this.parsedCount += 1;
          this.lastParsedAt = Date.now();
          this.lastParsedFrom = (rinfo && rinfo.address) ? String(rinfo.address) : '';

          for (const h of this.handlers) {
            try { h(parsed, rinfo); } catch (_) { /* ignore handler errors */ }
          }
        } catch (_) {
          // ignore parse errors (traffic on same port)
        }
      });

      await new Promise((resolve, reject) => {
        sock.once('listening', resolve);
        sock.once('error', reject);
        sock.bind(this.port, '0.0.0.0');
      });

      // Track uptime of the listener for the watchdog.
      this.startedAt = Date.now();
      this._noDataRefreshedAt = 0;

      // Increase UDP receive buffer (helps avoid packet drops on busy systems).
      try {
        // 2 MiB is a reasonable default; the OS may clamp this.
        sock.setRecvBufferSize(2 * 1024 * 1024);
      } catch (_) {
        // ignore
      }

      // Join multicast group when configured. Some installations use unicast.
      // NOTE: On multi-homed systems and inside container/VM setups, joining only the "default" interface
      // can silently pick the wrong NIC. Therefore, if no explicit interfaceAddress is configured, we try to
      // join the group on all non-internal IPv4 interfaces.
      if (isMulticastIp(this.multicastGroup)) {
        const joinedIfaces = [];
        const failedIfaces = [];

        // If an interfaceAddress is configured, treat it as a *preferred* interface,
        // but still try all other non-internal IPv4 addresses as a safety net.
        // This avoids "no telegram received yet" situations due to a mis-selected NIC.
        const ifaces = Array.from(new Set([
          this.interfaceAddress,
          ...listNonInternalIpv4Addresses(),
        ].map((s) => (s || '').toString().trim()).filter((s) => s && s !== '0.0.0.0')));

        // Try explicit interfaces first (best-effort).
        for (const iface of ifaces) {
          try {
            sock.addMembership(this.multicastGroup, iface);
            joinedIfaces.push(iface);
          } catch (e) {
            failedIfaces.push(`${iface} (${_errMsg(e)})`);
          }
        }

        // Fallback: join default interface if we have no successful joins.
        if (!joinedIfaces.length) {
          try {
            sock.addMembership(this.multicastGroup);
            joinedIfaces.push('default');
          } catch (e) {
            failedIfaces.push(`default (${_errMsg(e)})`);
          }
        }

        // Persist for diagnostics / refresh
        try { this._joinedIfaces = joinedIfaces.slice(); } catch (_) { this._joinedIfaces = []; }

        if (joinedIfaces.length) {
          this._logDebug(`[speedwire] Listening on ${this.multicastGroup}:${this.port} via ${joinedIfaces.join(', ')}`);
        }
        if (!joinedIfaces.length) {
          // Still keep socket open – unicast may still work.
          this._logWarn(`[speedwire] Failed to join multicast group ${this.multicastGroup} on any interface (${failedIfaces.join('; ')}). Unicast may still work.`);
        } else if (failedIfaces.length) {
          // Some interfaces may fail in containers/VMs – this is usually fine.
          this._logDebug(`[speedwire] Multicast join partial failures: ${failedIfaces.join('; ')}`);
        }
      } else {
        this._logDebug(`[speedwire] Listening (unicast) on 0.0.0.0:${this.port}`);
      }


      // Periodic multicast refresh (best-effort)
      if (isMulticastIp(this.multicastGroup) && this.multicastRefreshMs > 0) {
        try {
          if (this._refreshTimer) clearInterval(this._refreshTimer);
          this._refreshTimer = setInterval(() => {
            this.refreshMembershipNow('periodic');
          }, Math.max(5000, this.multicastRefreshMs));
          if (typeof this._refreshTimer.unref === 'function') this._refreshTimer.unref();
        } catch (_) {
          // ignore
        }
      }

      // Start watchdog (no-telegram refresh/restart)
      this._startWatchdog();

      this.started = true;
      this.starting = null;
    })();

    return await this.starting;
  }

  addHandler(fn) {
    if (typeof fn !== 'function') return () => {};
    this.handlers.add(fn);
    return () => {
      try { this.handlers.delete(fn); } catch (_) { /* ignore */ }
    };
  }

  async stopIfUnused() {
    if (this.handlers.size) return;
    if (!this.socket) return;

    if (this._refreshTimer) {
      try { clearInterval(this._refreshTimer); } catch (_) { /* ignore */ }
      this._refreshTimer = null;
    }

    if (this._watchdogTimer) {
      try { clearInterval(this._watchdogTimer); } catch (_) { /* ignore */ }
      this._watchdogTimer = null;
    }

    const sock = this.socket;
    this.socket = null;
    this.started = false;
    this.starting = null;

    await new Promise((resolve) => {
      try { sock.close(() => resolve()); } catch (_) { resolve(); }
    });
  }
}

const _hubByKey = new Map();

function getHub(adapter, opts) {
  const port = Number(opts.port || 9522);
  const group = (opts.multicastGroup || '239.12.255.254').toString();
  const iface = (opts.interfaceAddress || '').toString().trim();
  const ns = adapter?.namespace || 'default';
  const key = `${ns}|${group}|${port}|${iface}`;
  let hub = _hubByKey.get(key);
  if (!hub) {
    hub = new SpeedwireHub(adapter, { port, multicastGroup: group, interfaceAddress: iface });
    _hubByKey.set(key, hub);
  }
  return { hub, key };
}


/**
 * Datapoint source schema (speedwire):
 *   {
 *     kind: 'speedwire',
 *     // Either OBIS addressing (recommended)
 *     obis: { c: 1, d: 4, e: 0, b: 0 },
 *     // or a header field
 *     field: 'susyId' | 'serialNumber' | 'timestampMs' | 'protocolId'
 *     // or a computed field
 *     computed: 'netActivePower' | 'netActiveEnergy'
 *   }
 */
class SpeedwireDriver {
  constructor(adapter, deviceCfg /*, template, globalCfg */) {
    this.adapter = adapter;
    this.cfg = deviceCfg;

    const c = this.cfg.connection || {};
    this.multicastGroup = (c.multicastGroup || '239.12.255.254').toString();
    this.port = Number(c.port || 9522);
    this.interfaceAddress = (c.interfaceAddress || '').toString().trim();

    // Optional: filter telegrams by source IP
    this.filterHost = (c.host || c.filterHost || '').toString().trim();

    // Mark device as disconnected if no telegram is received for this time.
    // Default increased to 30000ms to avoid false positives on networks with IGMP-snooping quirks.
    this.staleTimeoutMs = Number(c.staleTimeoutMs || 30000);

    this.unregister = null;
    this.hubKey = null;
    this.hub = null;

    this.lastSeen = 0;
    this.lastParsed = null;

    // Diagnostics: last parsed telegram from any source (before host filter)
    this.lastSeenAny = 0;
    this.lastAnyFrom = '';
    this.lastAnyProtocolId = null;

    // Soft-stale mode: keep returning the last known telegram values even when the
    // stream is stale, instead of throwing an error that would flip the device into
    // "disconnected" state and break downstream logic.
    //
    // Rationale (ioBroker scripts/logic): many automations rely on continuously
    // updated meter states. With multicast hiccups or too aggressive stale timeouts,
    // hard errors can cause "stale:meter" fail-safe triggers. Soft-stale keeps the
    // last known values flowing while still surfacing freshness via additional
    // computed fields (ageMs/stale) and log warnings.
    this.softStale = (c.softStale !== undefined) ? !!c.softStale : true;
    this._lastSoftStaleLogAt = 0;
  }

  async _ensureListener() {
    if (this.hub) return;

    const { hub, key } = getHub(this.adapter, {
      port: this.port,
      multicastGroup: this.multicastGroup,
      interfaceAddress: this.interfaceAddress,
    });

    this.hub = hub;
    this.hubKey = key;

    await this.hub.start();

    this.unregister = this.hub.addHandler((parsed, rinfo) => {
      try {
        // Track any parsed meter telegrams (helps detect filterHost issues)
        this.lastSeenAny = Date.now();
        this.lastAnyFrom = (rinfo && rinfo.address) ? String(rinfo.address).trim() : '';
        this.lastAnyProtocolId = (parsed && typeof parsed.protocolId === 'number') ? parsed.protocolId : null;

        // Optional filter by source IP
        if (this.filterHost && rinfo?.address && String(rinfo.address).trim() !== this.filterHost) return;

        this.lastSeen = Date.now();
        this.lastParsed = parsed;
      } catch (_) {
        // ignore
      }
    });
  }

  async disconnect() {
    if (this.unregister) {
      try { this.unregister(); } catch (_) { /* ignore */ }
      this.unregister = null;
    }
    const key = this.hubKey;
    const hub = this.hub;
    this.hubKey = null;
    this.hub = null;

    // Try to stop the hub if nobody uses it anymore.
    try {
      if (hub) await hub.stopIfUnused();
    } catch (_) { /* ignore */ }

    // Cleanup global map if the hub stopped
    try {
      if (key && hub && !hub.socket) _hubByKey.delete(key);
    } catch (_) { /* ignore */ }
  }

  async writeDatapoint(/* dp, value */) {
    throw new Error('Speedwire driver is read-only (meter telegram listener).');
  }

  _getObisValue(src) {
    const parsed = this.lastParsed;
    if (!parsed) return undefined;

    const obis = src?.obis || {};
    const c = Number(obis.c);
    const d = Number(obis.d);
    const e = (obis.e !== undefined && obis.e !== null) ? Number(obis.e) : 0;
    const b = (obis.b !== undefined && obis.b !== null) ? Number(obis.b) : null;

    if (!Number.isFinite(c) || !Number.isFinite(d)) return undefined;
    const keyCde = `${c}.${d}.${e}`;
    if (b !== null && Number.isFinite(b)) {
      const keyBcde = `${b}:${keyCde}`;
      if (parsed.valuesByBcde?.has(keyBcde)) return parsed.valuesByBcde.get(keyBcde);
    }
    if (parsed.valuesByCde?.has(keyCde)) return parsed.valuesByCde.get(keyCde);
    return undefined;
  }

  _computeNetActivePower() {
    // kW: import - export
    const imp = this._getObisValue({ obis: { c: 1, d: 4, e: 0 } });
    const exp = this._getObisValue({ obis: { c: 2, d: 4, e: 0 } });
    const a = (typeof imp === 'number' && Number.isFinite(imp)) ? imp : 0;
    const b = (typeof exp === 'number' && Number.isFinite(exp)) ? exp : 0;
    return a - b;
  }

  _computeNetActiveEnergy() {
    // kWh: import - export
    const imp = this._getObisValue({ obis: { c: 1, d: 8, e: 0 } });
    const exp = this._getObisValue({ obis: { c: 2, d: 8, e: 0 } });
    const a = (typeof imp === 'number' && Number.isFinite(imp)) ? imp : 0;
    const b = (typeof exp === 'number' && Number.isFinite(exp)) ? exp : 0;
    return a - b;
  }

  async readDatapoints(datapoints) {
    await this._ensureListener();

    const now = Date.now();

    if (!this.lastParsed || !this.lastSeen) {
      // Special case: data is arriving but filtered by host
      if (this.filterHost && this.lastSeenAny && this.lastAnyFrom && this.lastAnyFrom !== this.filterHost) {
        const e = new Error(
          `Speedwire: telegrams are received from ${this.lastAnyFrom}, but device Host/IP filter is set to ${this.filterHost}. ` +
          `Update the device Host/IP or clear the filter.`
        );
        e.code = 'E_SPEEDWIRE_NO_DATA';
        throw e;
      }

      // Special case: UDP traffic is arriving but we cannot parse it
      if (this.hub && this.hub.rxCount > 0 && this.hub.parsedCount === 0) {
        const e = new Error(
          `Speedwire: UDP packets are arriving on ${this.multicastGroup}:${this.port}, but none could be parsed as an SMA meter telegram. ` +
          `This can happen if the device uses a newer protocol-id/format.`
        );
        e.code = 'E_SPEEDWIRE_NO_DATA';
        throw e;
      }

      const e = new Error(
        `Speedwire: no telegram received yet (group ${this.multicastGroup}:${this.port}${this.filterHost ? (', filter ' + this.filterHost) : ''}).` +
        ` Joined interfaces: ${Array.isArray(this.hub?._joinedIfaces) && this.hub._joinedIfaces.length ? this.hub._joinedIfaces.join(', ') : 'n/a'}.` +
        ` Hint: set "Interface address" to the ioBroker host IPv4 in the SMA LAN (especially on Docker/LXC/VM or multi-NIC hosts) and ensure UDP multicast 239.12.255.254:9522 is not blocked.`
      );
      e.code = 'E_SPEEDWIRE_NO_DATA';
      throw e;
    }

    const ageMs = (this.lastSeen && Number.isFinite(this.lastSeen)) ? (now - this.lastSeen) : Number.POSITIVE_INFINITY;
    const isStale = (this.staleTimeoutMs > 0 && ageMs > this.staleTimeoutMs);

    if (isStale) {
      // Best-effort self-heal: force a multicast re-join when we detect staleness.
      try {
        if (this.hub && typeof this.hub.refreshMembershipNow === 'function') {
          this.hub.refreshMembershipNow('stale-detected');
        }
      } catch (_) {
        // ignore
      }

      // Soft-stale: keep serving last known values so downstream logic continues.
      // We still emit a throttled warning so the user sees the freshness problem.
      if (this.softStale) {
        const throttleMs = 30000;
        if (!this._lastSoftStaleLogAt || (now - this._lastSoftStaleLogAt) > throttleMs) {
          this._lastSoftStaleLogAt = now;
          try {
            this.adapter?.log?.warn && this.adapter.log.warn(
              `[${this.cfg?.id || 'meter'}] Speedwire stale (age ${ageMs} ms > ${this.staleTimeoutMs} ms) – continuing with cached values (softStale).`
            );
          } catch (_) { /* ignore */ }
        }
      } else {
        const e = new Error(
          `Speedwire: telegram stream stale (no telegram within ${this.staleTimeoutMs} ms). Check multicast/IGMP and network path.`
        );
        e.code = 'E_SPEEDWIRE_STALE';
        // Provide extra diagnostic context without affecting log-throttling.
        e.details = {
          ageMs,
          staleTimeoutMs: this.staleTimeoutMs,
          lastSeen: this.lastSeen,
          lastAnyFrom: this.lastAnyFrom,
          lastAnyProtocolId: this.lastAnyProtocolId,
          hubRxCount: this.hub ? this.hub.rxCount : undefined,
          hubParsedCount: this.hub ? this.hub.parsedCount : undefined,
        };
        throw e;
      }
    }

    const parsed = this.lastParsed;
    const out = {};
    const dps = Array.isArray(datapoints) ? datapoints : [];
    for (const dp of dps) {
      const src = dp?.source || {};
      if (src.kind !== 'speedwire') continue;
      if (dp.rw === 'wo') continue;

      let val;

      if (src.field) {
        if (src.field === 'susyId') val = parsed.susyId;
        if (src.field === 'serialNumber') val = parsed.serialNumber;
        if (src.field === 'timestampMs') val = parsed.timestampMs;
        if (src.field === 'protocolId') val = parsed.protocolId;
        // Freshness helpers
        if (src.field === 'lastSeenUnixMs') val = this.lastSeen;
        if (src.field === 'ageMs') val = ageMs;
        if (src.field === 'stale') val = isStale;
      } else if (src.computed) {
        if (src.computed === 'netActivePower') val = this._computeNetActivePower();
        if (src.computed === 'netActiveEnergy') val = this._computeNetActiveEnergy();
      } else if (src.obis) {
        val = this._getObisValue(src);
      }

      if (val === undefined) continue;
      out[dp.id] = val;
    }

    return out;
  }
}

module.exports = {
  SpeedwireDriver,
  // exported for unit tests / diagnostics
  parseEnergyMeterTelegram,
  normalizeObisValue,
  findProtocolIdOffset,
  isLikelyMeterTelegram,
  toHex,
};
