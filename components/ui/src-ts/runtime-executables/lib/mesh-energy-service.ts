// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Optionales Haus-Zählerarchiv, Offline-Nachlieferung und prüfbare Abrechnungsentwürfe.
 * Daten und Wirkung: Liest kumulative Bezugs-/Einspeisezähler, archiviert Originalstände
 * und überträgt eigene HMAC-Batches. Kein Zugriff auf Sollwerte oder Regel-Leases.
 * Verknüpfungen: mesh-energy-journal bestätigt erst nach fsync; mesh-coordinator kapselt
 * Schlüssel und Rollen; MeshAccountingPanel zeigt Qualität, Zähler und Perioden.
 * Bei Änderungen: Zählerwechsel, Rücksprung, Zeitfehler, Tarifrechnung und Ausfälle testen.
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('./mesh-coordinator-contract');
const { EnergyJournal, hash } = require('./mesh-energy-journal');
const defaults = () => ({ enabled: false, intervalMs: 600000, maxAgeMs: 60000, maxSkewMs: 5000, maxArchiveMB: 1024,
  meter: { id: '', epoch: '', importDp: '', exportDp: '', unit: 'kWh', calibrated: false, calibrationUntil: '' },
  tariff: { importEuroKwh: 0, exportEuroKwh: 0, periodFeeEuro: 0 }, operatorName: '' });
function validateAccounting(raw, config) {
  const out = defaults(); out.enabled = raw?.enabled === true;
  out.intervalMs = C.number(raw?.intervalMs ?? out.intervalMs, 'Zählerintervall ms', 60000, 3600000);
  out.maxAgeMs = C.number(raw?.maxAgeMs ?? out.maxAgeMs, 'Zähler-Messwertalter ms', 1000, out.intervalMs);
  out.maxSkewMs = C.number(raw?.maxSkewMs ?? out.maxSkewMs, 'Zähler-Zeitversatz ms', 0, 10000);
  out.maxArchiveMB = C.number(raw?.maxArchiveMB ?? out.maxArchiveMB, 'Archivgrenze MiB je Haus', 16, 16384);
  out.operatorName = String(raw?.operatorName || '').trim().slice(0, 150);
  for (const k of Object.keys(out.meter)) {
    if (k === 'calibrated') out.meter[k] = raw?.meter?.calibrated === true;
    else out.meter[k] = String(raw?.meter?.[k] || (k === 'unit' ? 'kWh' : '')).trim().slice(0, k.endsWith('Dp') ? 512 : 128);
  }
  if (!['Wh','kWh'].includes(out.meter.unit)) throw new Error('Zählereinheit muss Wh oder kWh sein.');
  for (const k of Object.keys(out.tariff)) {
    const value = C.number(raw?.tariff?.[k] ?? 0, k, 0, k === 'periodFeeEuro' ? 1e6 : 100);
    const microEuro = Math.round(value * 1e6);
    out.tariff[k] = k === 'periodFeeEuro' ? Number((BigInt(microEuro) + 5000n) / 10000n) / 100 : microEuro / 1e6;
  }
  if (out.enabled && config.role === 'off') throw new Error('Zuerst Master oder Slave einrichten.');
  if (out.enabled && config.localParticipates) {
    for (const k of ['id','epoch','importDp','exportDp']) if (!out.meter[k]) throw new Error(`Haus-NVP-Zähler: ${k} fehlt.`);
    if (out.meter.importDp === out.meter.exportDp) throw new Error('Bezug und Einspeisung brauchen getrennte kumulative Zählerstände.');
    if (!out.meter.calibrated || !/^\d{4}-\d{2}-\d{2}$/.test(out.meter.calibrationUntil) || !Number.isFinite(Date.parse(out.meter.calibrationUntil)) || Date.parse(out.meter.calibrationUntil + 'T23:59:59Z') < Date.now()) throw new Error('Geeichten Zähler und gültiges Eichfristdatum bestätigen.');
  }
  return out;
}
const requestId = () => crypto.randomBytes(16).toString('hex');
const asTime = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) ? Date.parse(value) : NaN;
class MeshEnergyService {
  constructor(coordinator) {
    this.c = coordinator; this.journals = new Map(); this.busyNodes = new Set(); this.rate = new Map(); this.ack = 0; this.error = ''; this.peerStatus = new Map(); this.stopped = false; this.startedAt = Date.now();
  }
  settings() { return this.c.accounting || defaults(); }
  async journal(nodeId, local = false) {
    const identity = `${this.c.config.siteId}/${nodeId}/${local ? 'local' : 'master'}`;
    if (this.journals.has(identity)) return this.journals.get(identity);
    C.id(nodeId, 'Knoten'); C.id(this.c.config.siteId, 'Standort');
    const journal = new EnergyJournal(path.join(this.c.directory, 'mesh-energy', this.c.config.siteId, local ? 'local' : 'master', nodeId), this.settings().maxArchiveMB * 1024 * 1024);
    this.journals.set(identity, journal); await journal.init(); return journal;
  }
  /** Ein echter Quellenzeitstempel wird mitgespeichert. Fehlende oder alte Werte
   * bleiben ausdrücklich Lücken; sie werden weder als Null noch als Schätzung verbucht. */
  async capture() {
    const config = this.c.config; const settings = this.settings(); const meter = settings.meter;
    const journal = await this.journal(config.nodeId, true); await journal.init();
    const capturedAt = Date.now(); let at = capturedAt; const previous = journal.last;
    let quality = 'ok'; let sourceAt = []; let values = [null, null];
    try {
      const states = await Promise.all([meter.importDp, meter.exportDp].map(id => this.c.adapter.getForeignStateAsync(id)));
      sourceAt = states.map(s => Number.isFinite(s?.ts) ? s.ts : null);
      if (states.some(s => !s || s.q && s.q !== 0 || typeof s.val !== 'number' || !Number.isFinite(s.val) || s.val < 0 || !Number.isFinite(s.ts))) quality = 'missing';
      else if (sourceAt.some(ts => ts > at + 1000 || at - ts > settings.maxAgeMs) || Math.abs(sourceAt[0] - sourceAt[1]) > settings.maxSkewMs) quality = 'stale';
      else {
        const factor = meter.unit === 'kWh' ? 1000000 : 1000;
        values = states.map(s => Math.round(s.val * factor));
        if (values.some(v => !Number.isSafeInteger(v) || v < 0)) { quality = 'invalid'; values = [null, null]; }
      }
    } catch { quality = 'missing'; }
    // Der Archivzeitpunkt stammt bei gültigen Registern aus deren Quellenzeit,
    // nicht aus dem späteren Upload/Abfragen. Beide Registerzeiten bleiben separat erhalten.
    if (quality === 'ok') at = Math.max(...sourceAt);
    if (previous && at <= Date.parse(previous.at)) quality = 'clock';
    if (!meter.calibrated || Date.parse(meter.calibrationUntil + 'T23:59:59Z') < at) quality = 'calibration_expired';
    const baseline = journal.baseline; const sameMeter = journal.meterIdentity === `${meter.id}/${meter.epoch}`;
    if (sameMeter && (journal.counterFault || baseline && values.every(v => v !== null) && (values[0] < baseline.importMilliWh || values[1] < baseline.exportMilliWh))) quality = 'reset';
    const record = { schema: 'nexowatt.mesh-energy.v1', stream: previous?.stream || requestId(), siteId: config.siteId, nodeId: config.nodeId,
      seq: (previous?.seq || 0) + 1, at: new Date(at).toISOString(), capturedAt: new Date(capturedAt).toISOString(), sourceAt, meter: C.clone(meter), intervalMs: settings.intervalMs,
      importMilliWh: values[0], exportMilliWh: values[1], quality, previousHash: previous?.hash || '' };
    record.hash = hash(record); await journal.append(record);
    this.lastCapture = at; this.meterQuality = quality;
    return record;
  }
  /** Empfänger serialisiert nur dieses Haus, bestätigt aber keine fehlende Sequenz.
   * Persistente Originale bleiben auch nach Bestätigung beim Slave erhalten. */
  async receive(packet) {
    if (!this.c.appState().enabled) throw new Error('mesh_app_inactive');
    const p = packet?.payload; const key = this.c.keys[p?.nodeId];
    if (this.busy || !this.settings().enabled || this.c.config.role !== 'master' || !key || !C.verify(packet, key)
      || p.schema !== 'nexowatt.mesh-energy.v1' || p.siteId !== this.c.config.siteId || p.masterId !== this.c.config.masterId
      || !this.c.config.nodes.some(n => n.id === p.nodeId) || !/^[a-f0-9]{32}$/.test(p.requestId || '')) throw new Error('archive_authentication_failed');
    const now = Date.now(); const previousCall = this.rate.get(p.nodeId) || 0;
    if (this.busyNodes.has(p.nodeId) || now - previousCall < 200) throw new Error('archive_busy');
    this.rate.set(p.nodeId, now); this.busyNodes.add(p.nodeId);
    try {
      const journal = await this.journal(p.nodeId); await journal.init();
      if (!Array.isArray(p.records) || p.records.length > 32) throw new Error('archive_batch_invalid');
      for (const r of p.records) {
        if (r.schema !== p.schema || r.siteId !== p.siteId || r.nodeId !== p.nodeId || !/^[a-f0-9]{32}$/.test(r.stream || '')
          || !Number.isFinite(asTime(r.at)) || asTime(r.at) > now + 300000 || !r.meter
          || !Number.isFinite(r.intervalMs) || r.intervalMs < 60000 || r.intervalMs > 3600000
          || typeof r.meter.id !== 'string' || !r.meter.id || typeof r.meter.epoch !== 'string' || !r.meter.epoch
          || !['Wh','kWh'].includes(r.meter.unit) || !['ok','missing','stale','invalid','clock','calibration_expired','reset'].includes(r.quality)
          || ![r.importMilliWh, r.exportMilliWh].every(v => v === null || Number.isSafeInteger(v) && v >= 0)
          || (r.quality === 'ok' && (r.importMilliWh === null || r.exportMilliWh === null || !r.meter.calibrated || !r.meter.id || !r.meter.epoch
            || !Number.isFinite(Date.parse(r.meter.calibrationUntil + 'T23:59:59Z')) || Date.parse(r.meter.calibrationUntil + 'T23:59:59Z') < asTime(r.at)))) throw new Error('archive_record_invalid');
        await journal.append({ ...r, receivedAt: new Date().toISOString() });
      }
      const receivedAt = new Date().toISOString();
      // Empfangszeit getrennt vom signierten Original: Quellzeit wird niemals ersetzt.
      this.peerStatus.set(p.nodeId, { receivedAt, pending: Number.isSafeInteger(p.pending) ? Math.max(0, p.pending) : null });
      this.error = '';
      return C.sign({ schema: p.schema, siteId: p.siteId, masterId: p.masterId, nodeId: p.nodeId, requestId: p.requestId,
        stream: journal.last?.stream || null, sequence: journal.last?.seq || 0, hash: journal.last?.hash || null, receivedAt }, key);
    } catch (error) { this.error = String(error.message); throw error; }
    finally { this.busyNodes.delete(p.nodeId); }
  }
  async sync() {
    const c = this.c; const journal = await this.journal(c.config.nodeId, true); await journal.init();
    const records = this.syncKnown ? await journal.batch(this.ack, 32) : [];
    const p = { schema: 'nexowatt.mesh-energy.v1', siteId: c.config.siteId, masterId: c.config.masterId, nodeId: c.config.nodeId, requestId: requestId(),
      records, pending: Math.max(0, (journal.last?.seq || 0) - this.ack - records.length) };
    const packet = await c.archiveTransport(C.sign(p, c.slaveKey));
    const ack = packet?.payload;
    if (!C.verify(packet, c.slaveKey) || ack.schema !== p.schema || ack.siteId !== p.siteId || ack.nodeId !== p.nodeId || ack.masterId !== p.masterId
      || ack.requestId !== p.requestId || !Number.isSafeInteger(ack.sequence) || ack.sequence < 0 || ack.sequence > (journal.last?.seq || 0)
      || (ack.sequence && (ack.stream !== journal.last.stream || (await journal.get(ack.sequence))?.hash !== ack.hash))) throw new Error('archive_ack_invalid');
    this.ack = ack.sequence; this.syncKnown = true; this.lastSync = ack.receivedAt;
  }
  async cycle() {
    if (!this.c.appState().enabled || this.busy || this.stopped || !this.settings().enabled || this.c.config.role === 'off') return;
    this.busy = true;
    try {
      if (this.c.config.localParticipates) {
        if (!this.lastCapture || Date.now() - this.lastCapture >= this.settings().intervalMs) await this.capture();
        if (!this.stopped && this.c.appState().enabled && this.c.config.role === 'slave') await this.sync();
      }
      if (this.c.config.role === 'master') {
        // Übersicht nach Neustart aus dauerhaftem Archiv wiederherstellen.
        for (const n of this.c.config.nodes) { await this.journal(n.id); await new Promise(resolve => setImmediate(resolve)); }
      }
      this.error = '';
    } catch (error) { this.error = String(error.message); this.syncKnown = false; }
    finally { this.busy = false; }
  }
  start() { const generation = this.generation = (this.generation || 0) + 1; this.stopped = false; this.startedAt = Date.now(); clearTimeout(this.timer); const run = async () => { await this.cycle(); if (!this.stopped && generation === this.generation) { this.timer = setTimeout(run, this.error ? 30000 : 1000); this.timer.unref?.(); } }; this.timer = setTimeout(run, 1000); this.timer.unref?.(); }
  stop() { this.generation = (this.generation || 0) + 1; this.stopped = true; clearTimeout(this.timer); }
  notificationEvent() {
    if (!this.c.appState().enabled || !this.settings().enabled) return null;
    const status = this.status();
    const stale = Date.now() - this.startedAt > this.settings().intervalMs * 2 && (this.c.config.role === 'master'
      ? status.nodes.some(n => !n.last || n.last.quality !== 'ok' || Date.now() - Date.parse(n.last.at) > Math.max(this.settings().intervalMs, n.last.intervalMs) * 2 || n.failure)
      : status.meterQuality !== 'ok' || status.pending > 2);
    if (!this.error && !stale && ![...this.journals.values()].some(j => j.failure || j.warning)) return null;
    return { severity: 'warning', title: 'Microgrid-Zählerarchiv prüfen', message: 'Zählerdaten, Nachlieferung oder Archivspeicher sind gestört. Betreiberübersicht und Zählerqualität prüfen. Die Regelung verwendet einen getrennten Kanal.' };
  }
  status() {
    const c = this.c.config; const local = this.journals.get(`${c.siteId}/${c.nodeId}/local`);
    return { enabled: this.settings().enabled, error: this.error, local: local?.summary() || null, pending: Math.max(0, (local?.last?.seq || 0) - this.ack), lastSync: this.lastSync || null, meterQuality: this.meterQuality || local?.last?.quality || 'missing',
      nodes: c.nodes.map(n => ({ id: n.id, name: n.name, ...this.journals.get(`${c.siteId}/${n.id}/master`)?.summary(), receivedAt: this.journals.get(`${c.siteId}/${n.id}/master`)?.last?.receivedAt || null, ...this.peerStatus.get(n.id) })) };
  }
  /** Perioden werden nur aus echten Randständen berechnet. Ein Zählerwechsel,
   * Reset oder fehlender Rand sperrt den Betrag. Keine Interpolation/Schätzung.
   * Binnenlücken bleiben sichtbar; intakte kumulative Randstände enthalten deren Energie. */
  async report(query) {
    const c = this.c.config; const own = query.nodeId === c.nodeId && c.localParticipates;
    if (c.role !== 'master' || !own && !c.nodes.some(n => n.id === query.nodeId)) throw new Error('archive_node_unknown');
    const from = asTime(query.from); const to = asTime(query.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > 366 * 86400000) throw new Error('Zeitraum muss gültig sein und darf höchstens 366 Tage umfassen.');
    const journal = await this.journal(query.nodeId, own); await journal.init();
    const tariff = validateAccounting({ ...this.settings(), enabled: false, tariff: query.tariff || this.settings().tariff }, c).tariff;
    let faultIdentity = ''; let counterFault = false; let baseline = null;
    let first = null; let last = null; let count = 0; let invalid = 0; let gaps = 0; let broken = false; let previous = null;
    for await (const r of journal.records()) {
      const at = asTime(r.at);
      const identity = `${r.meter.id}/${r.meter.epoch}`;
      if (identity !== faultIdentity) { faultIdentity = identity; counterFault = false; baseline = null; }
      if (r.quality === 'reset' || baseline && r.importMilliWh !== null && (r.importMilliWh < baseline.importMilliWh || r.exportMilliWh < baseline.exportMilliWh)) counterFault = true;
      if (r.quality === 'ok' && !counterFault) baseline = r;
      if (at < from || at > to) continue;
      if (counterFault) broken = true;
      count++;
      if (!first) first = r; last = r;
      if (r.quality !== 'ok') invalid++;
      if (previous) {
        if (r.meter.id !== previous.meter.id || r.meter.epoch !== previous.meter.epoch || ['importDp','exportDp','unit'].some(k => r.meter[k] !== previous.meter[k]) || at <= asTime(previous.at)) broken = true;
        if (r.importMilliWh !== null && previous.importMilliWh !== null && (r.importMilliWh < previous.importMilliWh || r.exportMilliWh < previous.exportMilliWh)) broken = true;
        if (at - asTime(previous.at) > Math.max(r.intervalMs, previous.intervalMs) * 1.5) gaps++;
      }
      if (r.quality === 'reset' || r.quality === 'clock' || r.quality === 'calibration_expired') broken = true;
      previous = r;
    }
    const usable = !!first && !!last && first !== last && first.quality === 'ok' && last.quality === 'ok' && !broken;
    const boundaryComplete = usable && asTime(first.at) === from && asTime(last.at) === to;
    const importMilliWh = usable ? last.importMilliWh - first.importMilliWh : null;
    const exportMilliWh = usable ? last.exportMilliWh - first.exportMilliWh : null;
    // mWh × Mikro-Euro/kWh / 10^10 = Cent; ganzzahlige Rundung verhindert
    // Gleitkomma-Centfehler. Bezug und Einspeisung werden getrennt ausgewiesen.
    const cents = (energy, rate) => Number((BigInt(energy) * BigInt(Math.round(rate * 1e6)) + 5000000000n) / 10000000000n);
    const amounts = usable ? { importCents: cents(importMilliWh, tariff.importEuroKwh), exportCents: cents(exportMilliWh, tariff.exportEuroKwh), periodFeeCents: boundaryComplete ? Math.round(tariff.periodFeeEuro * 100) : 0 } : null;
    if (amounts) amounts.balanceCents = amounts.importCents - amounts.exportCents + amounts.periodFeeCents;
    return { nodeId: query.nodeId, name: c.nodes.find(n => n.id === query.nodeId)?.name || c.local.name, operatorName: this.settings().operatorName,
      requested: { from: query.from, to: query.to }, measured: { from: first?.at || null, to: last?.at || null }, first, last, count, invalid, gaps, broken,
      usable, boundaryComplete, importKwh: importMilliWh === null ? null : importMilliWh / 1e6, exportKwh: exportMilliWh === null ? null : exportMilliWh / 1e6,
      tariff, amounts, periodFeePending: !boundaryComplete && tariff.periodFeeEuro > 0, status: !usable ? 'BLOCKED' : !boundaryComplete ? 'PARTIAL_PERIOD' : 'DRAFT', generatedAt: new Date().toISOString(),
      note: 'Abrechnungsentwurf für die tatsächlich gemessenen Randzeitpunkte. Eichung, Zuordnung und rechtliche Abrechnungsvoraussetzungen sind durch den Betreiber zu prüfen; keine zertifizierte Abrechnungssoftware.' };
  }
}
module.exports = { MeshEnergyService, defaults, validateAccounting };
