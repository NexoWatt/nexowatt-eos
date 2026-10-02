'use strict';
// Differential reference: exact plan method from c211f1a, before UI-MESH-PERF-20261001.
// No runtime import; used only to check unchanged safety decisions and ramp timing.
// Source SHA256: 1ba54d7ad63c92582d65643b3b40d19bda0d0031681b682007f3483ae480f6cd
const { LIMIT_KEYS, NETWORK_KEYS, clone, groupsOf, minLimits, maxLimits } = require('../../lib/mesh-coordinator-contract');
const { validSample, observedWithin } = require('../../lib/mesh-coordinator-protocol');
const { transformerProposals } = require('../../lib/mesh-transformer-allocation');
function baselinePlan(siteSample) {
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
      for (const r of records) {
        // Schon wirksame Rückfallwerte nicht bei jeder der bis zu 396 Nachrichten/s
        // erneut allozieren. Eine notwendige Absenkung wird weiterhin sofort geplant.
        if (LIMIT_KEYS.some(k => r.target[k] > r.member.fallback[k])) r.target = minLimits(r.target, r.member.fallback);
        r.lastChange = now;
      }
      this.lastPlan = now; return;
    }
    this.state = 'NORMAL'; this.reason = 'Alle Teilnehmer bestätigt; Budgets innerhalb Anschluss- und Stranggrenzen.';
    if (now - this.lastPlan < 200) return;
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
module.exports = baselinePlan;
