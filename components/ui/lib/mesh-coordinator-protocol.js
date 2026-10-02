/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/mesh-coordinator-protocol.ts
 * Quell-Hash: sha256:7f1637405d11bd619b7945dccfc10d03f38fe8fc4c11f0bc4447b30d8e0b08de
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/mesh-coordinator-protocol.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet befristete Master-Budgets und prüft die lokale Slave-Freigabe.
 * Daten und Wirkung: Reine Protokollzustände ohne Netzwerk oder Hardware. Monotone Millisekunden bestimmen Fristen; UTC dient nur Anzeige/Archiv.
 * Bei Änderungen: Neustart, Replay, Teilverbindung, reservierte Altbudgets und Wiederanlauf gemeinsam testen. Transport-ACK ist keine Wirkungsbestätigung.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/mesh-coordinator-protocol.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const crypto = require('node:crypto');
const { SCHEMA, LIMIT_KEYS, NETWORK_KEYS, ZERO, clone, membersOf, groupsOf, minLimits, maxLimits, within, limits } = require('./mesh-coordinator-contract');
const { transformerProposals } = require('./mesh-transformer-allocation');
const randomId = () => crypto.randomBytes(16).toString('hex');
const digest = (config, member) => crypto.createHash('sha256').update(JSON.stringify({ siteId: config.siteId, masterId: config.masterId, nodeId: member.id, revision: config.revision, max: member.max, fallback: member.fallback })).digest('hex');
function validSample(sample, staleMs) {
  return !!(sample && sample.quality === 'ok' && typeof sample.ageMs === 'number' && sample.ageMs >= 0 && sample.ageMs <= staleMs
    && typeof sample.gridW === 'number' && Number.isFinite(sample.gridW) && Array.isArray(sample.phaseA) && sample.phaseA.length === 3
    && sample.phaseA.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) && sample.devicesHealthy === true);
}
function observedWithin(sample, budget) {
  return sample.gridW <= budget.importW + 1 && -sample.gridW <= budget.exportW + 1
    && sample.phaseA.every((value, i) => value <= budget[`l${i + 1}A`] + 0.01)
    && ['evW', 'chargeW', 'dischargeW', 'pvW', 'flexW'].every(key => Number.isFinite(sample.controlledW?.[key]) && sample.controlledW[key] >= 0 && sample.controlledW[key] <= budget[key] + 1);
}

class MeshMasterProtocol {
  constructor(config, now) {
    this.config = config; this.now = now; this.epoch = randomId(); this.records = new Map();
    this.state = 'BOOT_SAFE'; this.reason = 'Synchronisation aller Teilnehmer erforderlich.'; this.lastPlan = -Infinity;
    // Dieses Invariant betrifft ausschließlich Ziele, niemals reservierte oder
    // angewendete Altbudgets. Änderungen an Teilnehmern/Grenzen erzeugen ein
    // neues Protokoll; Strategie-/Betriebsbudgetwechsel nutzen weiterhin plan().
    this.targetsAtFallback = true; this.lastDegradedAt = -Infinity;
    for (const member of membersOf(config)) this.records.set(member.id, { member, bootId: '', retiredBoots: new Set(), challenge: '', sequence: 0,
      seenAt: -Infinity, sample: null, stableCycles: 0, commandSeq: 0, lastCommand: null, confirmed: false,
      // Nach Master-Neustart bleibt die maximal mögliche Altfreigabe reserviert,
      // bis eine neue, zum aktuellen Master gehörige Begrenzung verifiziert ist.
      reserved: clone(member.max), target: clone(member.fallback), lastChange: this.now(), rttMs: null });
  }
  hello(request) {
    const record = this.records.get(request.nodeId);
    if (!record || request.siteId !== this.config.siteId || request.masterId !== this.config.masterId || request.schema !== SCHEMA || !/^[a-f0-9]{32}$/.test(request.bootId || '') || !/^[a-f0-9]{32}$/.test(request.requestId || '')) throw new Error('identity_mismatch');
    if (record.retiredBoots.has(request.bootId)) throw new Error('retired_boot');
    if (record.bootId && record.bootId !== request.bootId) {
      if (record.retiredBoots.size >= 128) throw new Error('too_many_restarts');
      record.retiredBoots.add(record.bootId);
    }
    record.bootId = request.bootId; record.challenge = randomId(); record.sequence = 0; record.stableCycles = 0; record.confirmed = false; record.seenAt = -Infinity;
    this.state = 'SYNCING';
    return { schema: SCHEMA, kind: 'hello', siteId: this.config.siteId, masterId: this.config.masterId, nodeId: request.nodeId,
      bootId: request.bootId, requestId: request.requestId, epoch: this.epoch, challenge: record.challenge, revision: this.config.revision };
  }
  /** Nur aktuelle, identitäts- und konfigurationsgebundene Requests dürfen Budgets
   * auslösen. Ungültige Telemetrie erzeugt Rückfall, niemals Nullverbrauch. */
  exchange(request, siteSample) {
    const r = this.records.get(request.nodeId); const c = this.config; const now = this.now();
    if (!r || request.schema !== SCHEMA || request.siteId !== c.siteId || request.masterId !== c.masterId || request.epoch !== this.epoch
      || request.bootId !== r.bootId || request.challenge !== r.challenge || !r.challenge || request.binding !== digest(c, r.member)
      || request.revision !== c.revision || !Number.isSafeInteger(request.sequence) || request.sequence <= r.sequence
      || !/^[a-f0-9]{32}$/.test(String(request.requestId || ''))) throw new Error('session_config_or_replay');
    r.sequence = request.sequence; r.seenAt = now; r.sample = clone(request.sample || {});
    r.rttMs = Number.isFinite(request.lastRttMs) ? Math.max(0, request.lastRttMs) : null;
    const sampleOk = validSample(r.sample, c.staleMs);
    const ack = request.ack;
    const verified = !!r.lastCommand && sampleOk && ack?.epoch === this.epoch && ack?.commandSeq === r.lastCommand?.commandSeq
      && ack?.status === 'VERIFIED' && observedWithin(r.sample, r.lastCommand.limits);
    r.confirmed = verified;
    if (verified) {
      r.reserved = maxLimits(r.lastCommand.limits, r.member.fallback);
      r.stableCycles = Math.min(c.recoveryCycles, r.stableCycles + 1);
    } else if (!(r.stableCycles >= c.recoveryCycles && now - (r.awaitingSince ?? -Infinity) < c.leaseMs && sampleOk && observedWithin(r.sample, r.reserved))) r.stableCycles = 0;
    this.plan(siteSample);
    const command = { schema: SCHEMA, kind: 'limits', siteId: c.siteId, masterId: c.masterId, nodeId: r.member.id,
      bootId: r.bootId, epoch: this.epoch, requestId: request.requestId, requestSequence: request.sequence, revision: c.revision,
      binding: digest(c, r.member), commandSeq: (!r.lastCommand || r.lastCommand.state !== this.state || JSON.stringify(r.lastCommand.limits) !== JSON.stringify(r.target)) ? ++r.commandSeq : r.commandSeq, leaseMs: c.leaseMs,
      state: this.state, reason: this.reason, limits: clone(r.target), active: c.mode === 'active' };
    if (!r.lastCommand || r.lastCommand.commandSeq !== command.commandSeq) { r.awaitingSince = now; r.confirmed = false; }
    r.lastCommand = command;
    // Ausgabe reserviert sofort. Erst spätere VERIFIED-Rückmeldung kann senken.
    r.reserved = maxLimits(r.reserved, command.limits, r.member.fallback);
    return command;
  }
  /** Alle Teilnehmer bilden gemeinsam die Sicherheitsgrenze. Neue Erhöhungen
   * berücksichtigen weiterhin unbekannte Altfreigaben; Ausfälle geben nichts frei. */
  plan(siteSample) {
    const now = this.now(); const c = this.config; const records = [...this.records.values()];
    this.siteMeasurement = clone(siteSample || {});
    const siteHealthy = validSample(siteSample, c.staleMs)
      && siteSample.gridW <= c.site.limit.importW && -siteSample.gridW <= c.site.limit.exportW
      && siteSample.phaseA.every((n, i) => n <= c.site.limit[`l${i + 1}A`]);
    // Auch ein kurzer Hauptzähler-Ausfall verwirft die alte Erholungszählung.
    // Während dieses Ausfalls gesammelte ACKs dürfen den Wiederanlauf nicht vorwegnehmen.
    if (!siteHealthy) for (const r of records) r.stableCycles = 0;
    const healthy = records.length > 0 && siteHealthy
      && records.every(r => now - r.seenAt <= c.staleMs && validSample(r.sample, Math.max(0, c.staleMs - (now - r.seenAt))) && (r.confirmed || now - (r.awaitingSince ?? -Infinity) < c.leaseMs && observedWithin(r.sample, r.reserved)) && r.stableCycles >= c.recoveryCycles);
    if (!healthy || c.mode !== 'active') {
      this.state = c.mode === 'active' ? 'SITE_DEGRADED' : 'DIAGNOSTIC';
      this.reason = c.mode === 'active' ? 'Messung, Teilnehmer oder bestätigte Begrenzung fehlt; gemeinsamer Rückfall.' : 'Beobachtung ohne zusätzliche Leistungsfreigabe.';
      // Bis zu 396 authentifizierte Nachrichten/s dürfen nicht jedes Mal alle
      // bereits abgesenkten Ziele durchsuchen. Jede notwendige Absenkung erfolgt
      // weiterhin sofort; min() erhält auch Ziele UNTER dem Rückfallwert.
      if (!this.targetsAtFallback) {
        for (const r of records) {
          if (LIMIT_KEYS.some(k => r.target[k] > r.member.fallback[k])) r.target = minLimits(r.target, r.member.fallback);
        }
        this.targetsAtFallback = true;
      }
      this.lastDegradedAt = now;
      this.lastPlan = now; return;
    }
    this.state = 'NORMAL'; this.reason = 'Alle Teilnehmer bestätigt; Budgets innerhalb Anschluss- und Stranggrenzen.';
    if (now - this.lastPlan < 200) return;
    // Beide Verteilungsstrategien lesen lastChange. Die bisher bei JEDEM
    // Rückfallaufruf geschriebenen Zeiten erst unmittelbar vor der Planung
    // materialisieren, damit Wartezeit kein zusätzliches Rampenbudget erzeugt.
    for (const r of records) r.lastChange = Math.max(r.lastChange, this.lastDegradedAt);
    this.targetsAtFallback = false;
    const groups = groupsOf(c).map(group => !group.id && this.operatorLimits ? { ...group, limit: { ...group.limit, importW: Math.min(group.limit.importW, this.operatorLimits.importW), exportW: Math.min(group.limit.exportW, this.operatorLimits.exportW) } } : group);
    const totalWeight = records.reduce((sum, r) => sum + r.member.weight, 0);
    // Gewichtete Anteile werden zunächst unabhängig von vorübergehend belegten
    // Altbudgets geplant. Anschließend begrenzt die Reservierungsprüfung Erhöhungen.
    const dynamic = c.allocation?.strategy === 'transformer' ? transformerProposals(c, records, groups, siteSample, this.intervention, now) : null;
    this.intervention = dynamic?.intervention || false; this.controlMode = dynamic?.controlMode || 'FIXED_SHARES'; this.siteMeasurement = clone(siteSample);
    if (dynamic) this.reason = dynamic.reason;
    const proposals = dynamic?.proposals || new Map();
    if (!dynamic) for (const r of records) {
      let fraction = 1;
      for (const group of groups.filter(group => !group.id || r.member.branch === group.id)) {
        const peers = records.filter(other => !group.id || other.member.branch === group.id);
        const weight = peers.reduce((sum, other) => sum + other.member.weight, 0) || totalWeight;
        for (const key of NETWORK_KEYS) {
          const base = peers.reduce((sum, other) => sum + other.member.fallback[key], 0);
          const capacity = Math.max(0, group.limit[key] - group.reserve[key] - group.unmonitored[key] - base);
          const wanted = r.member.max[key] - r.member.fallback[key];
          if (wanted > 0) fraction = Math.min(fraction, capacity * r.member.weight / weight / wanted);
        }
      }
      const rampKey = LIMIT_KEYS.filter(key => !key.endsWith('A')).sort((a, b) => (r.member.max[b] - r.member.fallback[b]) - (r.member.max[a] - r.member.fallback[a]))[0];
      const deltaW = Math.max(1, r.member.max[rampKey] - r.member.fallback[rampKey], ...NETWORK_KEYS.filter(key => key.endsWith('A')).map(key => (r.member.max[key] - r.member.fallback[key]) * 230));
      const rampFraction = c.rampWPerSecond * Math.min(1, Math.max(0, now - r.lastChange) / 1000) / deltaW;
      const oldFraction = Math.min(...LIMIT_KEYS.filter(key => r.member.max[key] > r.member.fallback[key]).map(key => (r.target[key] - r.member.fallback[key]) / (r.member.max[key] - r.member.fallback[key])), 1);
      fraction = Math.max(0, Math.min(fraction, Math.max(0, oldFraction) + rampFraction));
      proposals.set(r.member.id, Object.fromEntries(LIMIT_KEYS.map(key => [key, r.member.fallback[key] + (r.member.max[key] - r.member.fallback[key]) * fraction])));
    }
    // Absenkungen dürfen sofort ausgegeben werden. Erhöhungen erhalten nur die
    // tatsächlich unreservierte Restkapazität; Rundung ist stets nach unten.
    for (const r of records) {
      const next = proposals.get(r.member.id);
      // Eine noch nicht angewendete Vorgabe nicht durch weitere Erhöhungen jagen.
      // Absenken bleibt sofort möglich; die Altfreigabe bleibt vollständig reserviert.
      if (!r.confirmed) for (const key of LIMIT_KEYS) next[key] = Math.min(next[key], r.target[key]);
      let fraction = 1;
      for (const group of groups.filter(group => !group.id || r.member.branch === group.id)) for (const key of NETWORK_KEYS) {
        const others = records.filter(other => other !== r && (!group.id || other.member.branch === group.id)).reduce((sum, other) => sum + Math.max(other.reserved[key], other.member.fallback[key]), 0);
        const free = Math.max(0, group.limit[key] - group.reserve[key] - group.unmonitored[key] - others);
        const increase = next[key] - r.target[key];
        if (increase > 0) fraction = Math.min(fraction, Math.max(0, free - r.target[key]) / increase);
      }
      r.target = Object.fromEntries(LIMIT_KEYS.map(key => {
        const value = next[key] <= r.target[key] ? next[key] : r.target[key] + (next[key] - r.target[key]) * fraction;
        const scale = key.endsWith('A') ? 1000 : 1;
        return [key, Math.floor(Math.max(0, value) * scale) / scale];
      }));
      r.reserved = maxLimits(r.reserved, r.target, r.member.fallback); r.lastChange = now;
    }
    this.lastPlan = now;
  }
  status() {
    const now = this.now();
    return { controlMode: this.controlMode || 'SYNCING', intervention: !!this.intervention, siteMeasurement: this.siteMeasurement || null, operatorLimits: this.operatorLimits || null, epoch: this.epoch, state: this.state, reason: this.reason, nodes: [...this.records.values()].map(r => ({ id: r.member.id, name: r.member.name, branch: r.member.branch,
      online: now - r.seenAt <= this.config.staleMs, ageMs: Number.isFinite(r.seenAt) ? Math.max(0, now - r.seenAt) : null,
      confirmed: r.confirmed, stableCycles: r.stableCycles, rttMs: r.rttMs, sample: r.sample, allowed: clone(r.target), reserved: clone(r.reserved), fallback: clone(r.member.fallback), commandSeq: r.commandSeq })) };
  }
}

class MeshSlaveLease {
  constructor(config, now) {
    this.config = config; this.now = now; this.bootId = randomId(); this.epoch = ''; this.challenge = ''; this.sequence = 0;
    this.pending = null; this.command = null; this.expiresAt = -Infinity; this.lastLimits = clone(config.local.fallback); this.reason = 'BOOT_SAFE';
  }
  hello() {
    const request = { schema: SCHEMA, kind: 'hello', siteId: this.config.siteId, masterId: this.config.masterId, nodeId: this.config.nodeId, bootId: this.bootId, requestId: randomId() };
    this.pending = { request, started: this.now() }; return request;
  }
  acceptHello(response) {
    const p = this.pending; this.pending = null;
    if (!p || this.now() - p.started > this.config.requestTimeoutMs || response?.schema !== SCHEMA || response?.kind !== 'hello' || response.requestId !== p.request.requestId
      || response.bootId !== this.bootId || response.masterId !== this.config.masterId || response.siteId !== this.config.siteId
      || response.nodeId !== this.config.nodeId || response.revision !== this.config.revision || !/^[a-f0-9]{32}$/.test(response.epoch || '') || !/^[a-f0-9]{32}$/.test(response.challenge || '')) throw new Error('invalid_handshake');
    this.epoch = response.epoch; this.challenge = response.challenge; this.sequence = 0; this.command = null; this.expiresAt = -Infinity; this.reason = 'SYNCING';
  }
  request(sample, appliedCommandSeq, lastRttMs) {
    const current = this.current();
    const verified = this.command && current.valid && appliedCommandSeq === this.command.commandSeq
      && validSample(sample, this.config.staleMs) && observedWithin(sample, this.command.limits);
    const request = { schema: SCHEMA, kind: 'exchange', siteId: this.config.siteId, masterId: this.config.masterId, nodeId: this.config.nodeId,
      bootId: this.bootId, epoch: this.epoch, challenge: this.challenge, requestId: randomId(), sequence: ++this.sequence,
      revision: this.config.revision, binding: digest(this.config, this.config.local), sample, lastRttMs,
      ack: this.command ? { epoch: this.epoch, commandSeq: this.command.commandSeq, status: verified ? 'VERIFIED' : (appliedCommandSeq === this.command.commandSeq ? 'APPLIED' : 'RECEIVED') } : null };
    this.pending = { request, started: this.now() }; return request;
  }
  /** Die Laufzeit beginnt bei Erstellung der Anfrage, niemals beim späten Empfang.
   * Duplikate, Antworttausch und frühere Boots verlängern keine lokale Frist. */
  accept(response) {
    const p = this.pending; this.pending = null; const c = this.config; const now = this.now();
    if (!p || response?.schema !== SCHEMA || response.kind !== 'limits' || response.epoch !== this.epoch || response.bootId !== this.bootId
      || response.siteId !== c.siteId || response.nodeId !== c.nodeId || response.masterId !== c.masterId || response.revision !== c.revision
      || response.binding !== digest(c, c.local) || response.requestId !== p.request.requestId || response.requestSequence !== p.request.sequence
      || !Number.isSafeInteger(response.commandSeq) || response.commandSeq < (this.command?.commandSeq || 0)
      || (this.command && response.commandSeq === this.command.commandSeq && (response.state !== this.command.state || response.active !== this.command.active || JSON.stringify(response.limits) !== JSON.stringify(this.command.limits)))
      || typeof response.leaseMs !== 'number' || response.leaseMs <= 0 || response.leaseMs > c.leaseMs
      || now >= p.started + response.leaseMs || now - p.started > c.requestTimeoutMs) throw new Error('stale_or_invalid_lease');
    const checked = limits(response.limits, 'Master-Freigabe');
    if (!within(checked, c.local.max) || response.active !== (c.mode === 'active')) throw new Error('limit_or_mode_mismatch');
    if (response.state !== 'NORMAL' && !within(checked, minLimits(c.local.fallback, this.lastLimits))) throw new Error('fallback_must_not_increase');
    this.command = clone(response); this.lastLimits = checked; this.expiresAt = p.started + response.leaseMs; this.reason = response.reason;
    return this.current();
  }
  current() {
    const valid = !!this.command && this.now() < this.expiresAt;
    const allowed = valid ? this.lastLimits : minLimits(this.lastLimits, this.config.local.fallback);
    return { required: this.config.mode === 'active', valid, state: valid ? this.command.state : 'FAILSAFE', reason: valid ? this.reason : 'Master-Freigabe fehlt oder ist abgelaufen.',
      commandSeq: valid ? this.command.commandSeq : 0, epoch: this.epoch, remainingMs: valid ? Math.max(0, this.expiresAt - this.now()) : 0, limits: clone(allowed) };
  }
  fail(reason) { this.pending = null; this.expiresAt = -Infinity; this.reason = reason; }
}
module.exports = { MeshMasterProtocol, MeshSlaveLease, digest, validSample, observedWithin, randomId };
