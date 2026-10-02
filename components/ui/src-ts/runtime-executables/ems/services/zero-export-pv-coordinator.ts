// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Koordiniert eine einzige begrenzte Prüflast zum Erschließen abgeregelter PV bei Nulleinspeisung.
 * Daten und Wirkung: Erhält aktuelle NVP-/PV-/Batteriemessungen vom Core und Anforderungen der einzelnen Verbraucher in W/ms. Vergibt nur zeitlich befristete Zusatzfreigaben; schreibt selbst keine Hardware.
 * Bei Änderungen: Niemals Nennleistung, Prognose oder Sollwerte als PV-Nachweis verwenden. Verbraucher prüfen Geräteschutz und Gesamtbudget vor jedem Schreiben erneut; unbestätigte Watt bleiben außerhalb des PV-Budgets.
 * Verknüpfungen: core-limits, charging-management, storage-control und heating-rod-control; docs/NULL_EINSPEISUNG_PV_STRATEGIE_DE.md
 */
'use strict';

const finite = (value) => value !== null && value !== undefined && typeof value !== 'boolean'
  && !(typeof value === 'string' && !value.trim()) && Number.isFinite(Number(value));
const watts = (value) => finite(value) ? Math.max(0, Number(value)) : 0;
const MAX_SAMPLE_AGE_MS = 5000;
const FAILURE_COOLDOWN_MS = 300000;
const SUCCESS_COOLDOWN_MS = 5000;
const MAX_PROBE_ENERGY_WH = 20;

/** Liest dieselben Freigabe-/Limit-Aliase wie Netzlimits. Diagnose aktiviert keine Prüflast. */
function readZeroExportMode(adapter) {
  const cfg = adapter && adapter.config || {};
  const gc = cfg.gridConstraints || {};
  const limit = [gc.exportLimitMaxFeedInW, gc.zeroExportMaxExportW, gc.maxFeedInPowerW, gc.maxExportW, gc.allowedFeedInW].find(v => finite(v) && Number(v) >= 0);
  const enabled = gc.zeroExportEnabled === true && watts(limit) === 0;
  const approved = typeof gc.exportLimitInstallerApproved === 'boolean' ? gc.exportLimitInstallerApproved
    : typeof gc.zeroExportInstallerApproved === 'boolean' ? gc.zeroExportInstallerApproved : gc.zeroExportEnabled === true;
  const runMode = String(gc.exportLimitRunMode ?? gc.zeroExportRunMode ?? gc.exportGuardMode ?? 'active').trim().toLowerCase();
  const diagnostic = ['diagnostic', 'test', 'dryrun', 'dry-run', 'simulation'].includes(runMode);
  const active = enabled && approved && !diagnostic;
  return { enabled, active, reason: !enabled ? 'disabled' : !approved ? 'installer-approval-required' : diagnostic ? 'diagnostic' : 'ready',
    maxProbeW: finite(gc.zeroExportProbeMaxW) ? Math.min(50000, watts(gc.zeroExportProbeMaxW)) : 4200,
    importBiasW: Math.min(250, finite(gc.zeroExportBiasW) ? watts(gc.zeroExportBiasW) : 80),
    // Bewusste Netzüberbrückung, getrennt von PV und von der Anlauf-Prüflast.
    holdMaxW: finite(gc.zeroExportPvHoldMaxW) ? Math.min(2000, watts(gc.zeroExportPvHoldMaxW)) : 600,
    holdMs: (finite(gc.zeroExportPvHoldSec) ? Math.min(120, watts(gc.zeroExportPvHoldSec)) : 45) * 1000,
    restartMs: (finite(gc.zeroExportPvRestartSec) ? Math.max(60, Math.min(3600, watts(gc.zeroExportPvRestartSec))) : 180) * 1000 };
}

/**
 * Reine Zustandsmaschine, ohne Timer oder Hardwareausgänge. Eine Lease gilt nur
 * für einen Verbraucher. Sie verlängert sich weder durch Wiederholungen noch
 * durch neue Mess-Snapshots. Ablauf/Fehler sperrt erneute Versuche fünf Minuten.
 * Phasenprüfungen dürfen höchstens 90 s auf den bestehenden STOP/Schaltpfad
 * warten; reale Fremdenergie ist auch dabei auf insgesamt 20 Wh begrenzt.
 */
class ZeroExportPvCoordinator {
  constructor() {
    this.sample = null;
    this.lease = null;
    this.requests = new Map();
    this.cooldowns = new Map();
    this.margins = new Map();
    this.evcsRuns = new Map();
    this.sequence = 0;
    this.status = 'idle';
    this.reason = 'waiting-for-measurements';
    this.lastEnergyWh = 0;
    this.globalBlockedUntil = 0;
  }

  revoke(now, reason, failed = true) {
    if (this.lease) {
      this.cooldowns.set(this.lease.key, now + (failed ? FAILURE_COOLDOWN_MS : SUCCESS_COOLDOWN_MS));
      this.lastEnergyWh = this.lease.energyWh;
      // Auch ein anderer Verbraucher darf nach fehlender PV-Reaktion nicht
      // sofort den nächsten Netzbezugsversuch beginnen.
      this.globalBlockedUntil = now + (failed ? FAILURE_COOLDOWN_MS : SUCCESS_COOLDOWN_MS);
    }
    this.lease = null;
    this.status = failed ? 'blocked' : 'confirmed';
    this.reason = reason;
  }

  /** Aktualisiert die zentrale Messbasis einmal je Core-Zyklus; keine Messung wird dadurch frischer. */
  update(sample) {
    const now = Number(sample.now);
    if (this.sample && now < this.sample.now) {
      this.revoke(now, 'clock-rollback');
      this.margins.clear(); this.requests.clear();
      for (const run of this.evcsRuns.values()) { run.hold = null; run.pauseUntil = now + sample.mode.restartMs; }
      this.globalBlockedUntil = now + FAILURE_COOLDOWN_MS;
    }
    this.sample = { ...sample };
    for (const [key, run] of this.evcsRuns) {
      if (run.hold && !this.holdValid(key, run.hold.id, now)) run.hold = null;
      if (now - run.seenAt > 3600000) this.evcsRuns.delete(key);
    }
    const blocked = this.blockReason(now);
    if (blocked) {
      if (this.lease) this.revoke(now, blocked);
      this.margins.clear();
      this.status = sample.mode.enabled ? 'blocked' : 'disabled';
      this.reason = blocked;
    }
    // Atomare Übergabe: Im neuen Core-Zyklus zählt die bestätigte Istleistung
    // wieder zum gemeinsamen PV-Budget. Gleichzeitig endet jede Testfreigabe,
    // BEVOR ein Verbraucher aus diesem Budget bedient wird. Andernfalls könnten
    // zwei Verbraucher dieselbe Leistung als PV und als alte Lease beanspruchen.
    if (this.lease?.confirmedAt && !blocked) {
      const lease = this.lease;
      this.revoke(now, 'pv-delivery-confirmed', false);
      this.margins.set(lease.key, { key: lease.key, id: `confirmed-${lease.id}`,
        targetW: lease.targetW, extraW: 0, seenAt: now, deadline: now + MAX_SAMPLE_AGE_MS, phaseProbe: false });
    }
    if (this.lease) {
      const lease = this.lease;
      const elapsedMs = Math.max(0, now - lease.lastSampleAt);
      // Obergrenze aus dem größeren alten/neuen Fremdleistungswert verhindert,
      // dass ein zwischen zwei Ticks liegender Lastsprung unterzählt wird.
      const nonPvW = Math.max(0, sample.gridW - sample.mode.importBiasW) + sample.storageDischargeW;
      lease.energyWh += Math.max(nonPvW, lease.lastNonPvW) * elapsedMs / 3600000;
      lease.lastNonPvW = nonPvW;
      lease.lastSampleAt = now;
      if (!sample.mode.maxProbeW || lease.acquiredExtraW > sample.mode.maxProbeW) this.revoke(now, 'probe-limit-reduced');
      else if (now >= lease.deadline) this.revoke(now, 'probe-timeout');
      else if (now - lease.lastRequestAt > MAX_SAMPLE_AGE_MS) this.revoke(now, 'consumer-feedback-expired');
      else if (lease.phaseProbe && !lease.phaseReadyAt && now - lease.startedAt >= 90000) this.revoke(now, 'phase-transition-timeout');
      else if (lease.energyWh >= MAX_PROBE_ENERGY_WH) this.revoke(now, 'probe-energy-limit');
      else if (lease.demandAt && now - lease.demandAt >= 3000 && nonPvW > 150) this.revoke(now, 'grid-or-battery-supply');
    }
    for (const [key, margin] of this.margins) if (now - margin.seenAt > MAX_SAMPLE_AGE_MS || sample.storageDischargeW > 50 || sample.gridW > sample.mode.importBiasW + 50) this.margins.delete(key);
    for (const [key, req] of this.requests) if (now - req.seenAt > MAX_SAMPLE_AGE_MS) this.requests.delete(key);
    for (const [key, until] of this.cooldowns) if (until <= now) this.cooldowns.delete(key);
    return this.snapshot();
  }

  blockReason(now) {
    const s = this.sample;
    if (!s || !s.mode) return 'waiting-for-measurements';
    if (!s.mode.active) return s.mode.reason;
    if (now < s.now || now - s.now > MAX_SAMPLE_AGE_MS) return 'core-sample-expired';
    if (!s.gridFresh || !finite(s.gridW)) return 'nvp-stale';
    if (!s.pvFresh || !finite(s.pvW) || s.pvW < 100) return 'pv-missing-stale-or-dark';
    if (!s.storageFresh) return 'battery-measurement-required';
    if (s.safetyReady !== true) return 'safety-envelope-blocked';
    if (s.externalBlocked) return 'external-authority-blocked';
    if (s.tariffCurtail) return 'tariff-curtailment';
    if (!this.lease && (s.gridW > s.mode.importBiasW + 150 || s.storageDischargeW > 50)) return 'existing-grid-or-battery-supply';
    return '';
  }

  /** Gemeinsame Mess-/Schutzvoraussetzungen; eine Überbrückung erlaubt ausdrücklich begrenzten Netzbezug, keine Batterieentladung. */
  holdSafetyReady(now) {
    const s = this.sample;
    return !!(s?.mode?.active && s.mode.holdMaxW > 0 && s.mode.holdMs > 0
      && now >= s.now && now - s.now <= MAX_SAMPLE_AGE_MS
      && s.gridFresh && finite(s.gridW) && s.pvFresh && finite(s.pvW)
      && s.storageFresh && s.storageDischargeW <= 50 && s.safetyReady === true
      && !s.externalBlocked && !s.tariffCurtail
      && s.gridW <= s.mode.importBiasW + s.mode.holdMaxW);
  }

  /** Prüfung am finalen Writer: kein abgelaufener oder nachträglich reduzierter Haltevertrag. */
  holdValid(key, id, now) {
    const run = this.evcsRuns.get(key);
    const h = run?.hold;
    const total = [...this.evcsRuns.values()].reduce((sum, r) => sum + (r.hold?.extraW || 0), 0);
    return !!(h && h.id === id && this.holdSafetyReady(now) && now < h.deadline
      && now < run.episodeAt + this.sample.mode.holdMs && now - h.seenAt <= MAX_SAMPLE_AGE_MS
      && now >= h.seenAt && now >= run.pauseUntil && total <= this.sample.mode.holdMaxW);
  }

  /**
   * Halten ausschließlich einer bereits messbar laufenden PV-Ladung am technischen
   * Minimum. Alle LP teilen EIN Netzüberbrückungsbudget; es wird nie zu PV addiert.
   * Das Zeitfenster beginnt beim ersten Defizit und wird erst nach zehn Sekunden
   * stabiler PV-Erholung zurückgesetzt. Flatternde Messwerte verlängern es nicht.
   */
  requestHold(r) {
    const now = Number(r.now), key = String(r.key || '');
    const run = this.evcsRuns.get(key);
    const denied = { granted: false, extraW: 0, targetW: watts(r.baseW), leaseId: '', validUntil: 0 };
    if (!run) return denied;
    const minW = watts(r.technicalMinW), baseW = watts(r.baseW);
    if (!r.eligible || !r.actualFresh || !finite(r.actualW) || !run.running || run.pauseUntil > now
      || !this.holdSafetyReady(now) || r.phaseTransition || this.lease
      || minW <= 0 || watts(r.maxW) < minW || watts(r.actualW) < minW - 100) {
      run.hold = null; return denied;
    }
    const deficit = Math.max(0, minW - baseW);
    if (deficit <= this.sample.mode.importBiasW) {
      if (!run.recoveredSince) run.recoveredSince = now;
      if (now - run.recoveredSince >= 10000) {
        run.episodeAt = 0; run.hold = null;
        const otherMargins = [...this.margins.entries()].filter(([k]) => k !== key)
          .reduce((sum, [, margin]) => sum + margin.extraW, 0);
        if (deficit > 0 && deficit <= this.sample.mode.importBiasW - otherMargins) this.margins.set(key, { key, id: `confirmed-hold-${++this.sequence}`,
          targetW: minW, extraW: deficit, seenAt: now, deadline: now + MAX_SAMPLE_AGE_MS });
        return denied;
      }
      if (!run.episodeAt && this.sample.gridW <= this.sample.mode.importBiasW + 50) return denied;
    } else run.recoveredSince = 0;
    if (!run.episodeAt) run.episodeAt = now;
    const others = [...this.evcsRuns.entries()].filter(([k]) => k !== key)
      .reduce((sum, [, v]) => sum + (v.hold?.extraW || 0), 0);
    if (now >= run.episodeAt + this.sample.mode.holdMs || deficit > this.sample.mode.holdMaxW - others) {
      run.hold = null; return denied;
    }
    const h = run.hold || { id: `evcs-hold-${++this.sequence}`, deadline: run.episodeAt + this.sample.mode.holdMs };
    h.extraW = deficit; h.seenAt = now; run.hold = h;
    // Eine alte Bias-Zusage darf nicht zusätzlich zur Überbrückung gezählt werden.
    this.margins.delete(key);
    return { granted: deficit > 0, extraW: deficit, targetW: minW, leaseId: h.id,
      validUntil: Math.min(h.deadline, now + MAX_SAMPLE_AGE_MS), reason: 'zero-export-pv-bridge' };
  }

  /** Tatsächlicher finaler Befehl, nach allen Limits: jeder PV-Stopp setzt die Mindestauszeit, auch ein Stop durch den Abschluss-Guard. */
  noteEvcsCommand(r) {
    const now = Number(r.now), key = String(r.key || '');
    if (!this.sample?.mode?.active || r.mode !== 'pv') { this.evcsRuns.delete(key); return; }
    const run = this.evcsRuns.get(key) || { running: false, lastCommandW: 0, pauseUntil: 0, episodeAt: 0, recoveredSince: 0, hold: null };
    const positive = watts(r.commandW) > 0;
    if (!positive && !r.phaseTransition && (run.lastCommandW > 0 || run.running)) {
      run.pauseUntil = Math.max(run.pauseUntil, now + this.sample.mode.restartMs);
      run.episodeAt = 0; run.recoveredSince = 0;
    }
    if (!positive) { run.running = false; run.hold = null; }
    else if (r.actualFresh && watts(r.actualW) >= Math.max(100, watts(r.technicalMinW) - 100)) run.running = true;
    run.lastCommandW = watts(r.commandW); run.seenAt = now;
    this.evcsRuns.set(key, run);
  }

  /**
   * Verbraucher meldet vor seinem finalen Writer den nächsten technisch
   * darstellbaren Zielwert. baseW ist sein bereits physikalisch erlaubter Anteil;
   * maxW enthält ALLE lokalen/zentralen Grenzen. eligible=false widerruft sofort.
   * Rückgabe extraW ist ausschließlich Prüfleistung und darf nicht zu PV addiert werden.
   */
  request(request) {
    const now = Number(request.now);
    const key = String(request.key || '');
    const baseW = watts(request.baseW);
    const result = (reason, lease = null) => ({ active: !!this.sample?.mode?.active, granted: !!lease,
      extraW: lease ? Math.max(0, lease.targetW - baseW) : 0,
      targetW: lease ? lease.targetW : baseW,
      leaseId: lease ? lease.id : '', validUntil: lease ? Math.min(lease.deadline, now + MAX_SAMPLE_AGE_MS) : 0,
      phaseProbe: !!lease?.phaseProbe, reason });
    const eligible = key && request.eligible === true && request.actualFresh === true && finite(request.actualW)
      && finite(request.nextW) && finite(request.maxW) && now > 0;
    if (!eligible) {
      this.requests.delete(key);
      this.margins.delete(key);
      if (this.lease?.key === key) this.revoke(now, 'consumer-not-eligible');
      return result('consumer-not-eligible');
    }
    const blocked = this.blockReason(now);
    if (blocked) {
      if (this.lease?.key === key) this.revoke(now, blocked);
      return result(blocked);
    }
    const s = this.sample;
    const previous = this.requests.get(key);
    this.requests.set(key, { seenAt: now, firstSampleAt: previous?.firstSampleAt ?? s.now,
      priority: Number(request.priority) || 100, key });
    // Der konfigurierte Importbias ist eine absichtliche kleine Netzleistung.
    // Nachgewiesene laufende Lasten dürfen diesen separat ausgewiesenen Anteil
    // behalten. Er ist an die bestätigte Last gebunden und erhöht niemals PV.
    let operatingMargin = null;
    const held = this.margins.get(key);
    if (held) {
      const otherW = [...this.margins.values()].filter(m => m.key !== key).reduce((sum, m) => sum + m.extraW, 0);
      const extraW = Math.max(0, held.targetW - baseW);
      if (extraW > 0 && extraW <= Math.max(0, s.mode.importBiasW - otherW)
          && watts(request.actualW) >= held.targetW - 100 && watts(request.maxW) >= held.targetW && held.targetW >= watts(request.technicalMinW)
          && s.storageDischargeW <= 50 && s.gridW <= s.mode.importBiasW + 50) {
        held.extraW = extraW; held.seenAt = now; held.deadline = now + MAX_SAMPLE_AGE_MS;
        operatingMargin = held;
      } else this.margins.delete(key);
    }
    if (this.lease && this.lease.key !== key) return result(operatingMargin ? 'confirmed-import-bias' : 'other-consumer-probing', operatingMargin);
    if (this.lease) {
      const lease = this.lease;
      lease.lastRequestAt = now;
      if (now >= lease.deadline || watts(request.maxW) < lease.targetW || lease.targetW < watts(request.technicalMinW) || lease.targetW - baseW > s.mode.maxProbeW) {
        this.revoke(now, 'probe-expired-or-limit-reduced');
        return result(this.reason);
      }
      const actualW = watts(request.actualW);
      lease.lastActualW = actualW;
      const toleranceW = Math.min(150, Math.max(30, lease.targetW * 0.03));
      // Phasenstopp/Settle ist keine neue Last. Währenddessen bleibt der
      // normale Phasenautomat für den 0-W-Ausgang verantwortlich.
      const switching = request.phaseTransition === 'prepare' || request.phaseTransition === 'switching';
      if (lease.phaseProbe && !switching && !lease.phaseReadyAt) lease.phaseReadyAt = now;
      if (!switching && actualW > (lease.phaseProbe ? 150 : lease.baselineActualW + 50) && !lease.demandAt) lease.demandAt = now;
      const demandStart = lease.phaseProbe ? lease.phaseReadyAt : lease.startedAt;
      if (demandStart && !lease.demandAt && now - demandStart > 20000) {
        this.revoke(now, 'no-consumer-response');
        return result(this.reason);
      }
      if (!switching && lease.demandAt && now - lease.demandAt >= 3000) {
        const nonPvW = Math.max(0, s.gridW - s.mode.importBiasW) + s.storageDischargeW;
        if (nonPvW > 150 || s.storageDischargeW > 50) {
          this.revoke(now, 'grid-or-battery-supply');
          return result(this.reason);
        }
        const pvRiseW = s.pvW - lease.baselinePvW;
        const requiredRiseW = Math.max(0, actualW - lease.baselineActualW);
        const supported = actualW >= lease.targetW - toleranceW && pvRiseW >= requiredRiseW - toleranceW - s.mode.importBiasW;
        if (supported && !lease.confirmedAt) lease.confirmedAt = now;
        const marginW = Math.max(0, lease.targetW - baseW);
        const otherMarginW = [...this.margins.values()].filter(m => m.key !== key).reduce((sum, m) => sum + m.extraW, 0);
        if (supported && marginW > 1 && marginW <= Math.max(0, s.mode.importBiasW - otherMarginW)
            && s.gridW <= s.mode.importBiasW + 50) {
          const margin = { key, id: `confirmed-${lease.id}`, targetW: lease.targetW, extraW: marginW,
            seenAt: now, deadline: now + MAX_SAMPLE_AGE_MS, phaseProbe: false };
          this.revoke(now, 'confirmed-import-bias', false);
          this.margins.set(key, margin);
          return result(this.reason, margin);
        }
        if (supported && baseW >= lease.targetW - 1) {
          this.revoke(now, 'pv-delivery-confirmed', false);
          return result(this.reason);
        }
        // Eine zufällige Bilanz allein darf die Lease nicht unbegrenzt halten.
        if (lease.confirmedAt && now - lease.confirmedAt > 5000) {
          this.revoke(now, 'physical-budget-did-not-confirm');
          return result(this.reason);
        }
      }
      this.status = switching ? 'phase-transition' : lease.confirmedAt ? 'confirming-budget' : 'probing';
      this.reason = this.status;
      return result(this.reason, lease);
    }
    // Während laufende Ladungen ein Defizit überbrücken, keine neue PV-Suche
    // starten. Bestehende Biasanteile bleiben gesondert geprüft.
    if ([...this.evcsRuns.values()].some(run => run.hold)) return result(operatingMargin ? 'confirmed-import-bias' : 'evcs-bridge-active', operatingMargin);
    if (now < this.globalBlockedUntil || now < (this.cooldowns.get(key) || 0)) return result(operatingMargin ? 'confirmed-import-bias' : 'probe-cooldown', operatingMargin);
    const nextW = watts(request.nextW);
    if (operatingMargin && nextW <= operatingMargin.targetW + 1) { this.requests.delete(key); return result('confirmed-import-bias', operatingMargin); }
    if (nextW <= baseW + 1) { this.requests.delete(key); return result('physical-budget-sufficient'); }
    if (nextW > watts(request.maxW) || nextW < watts(request.technicalMinW)) { this.requests.delete(key); return result('technical-or-total-limit'); }
    if (!s.mode.maxProbeW || nextW - baseW > s.mode.maxProbeW) { this.requests.delete(key); return result('minimum-exceeds-probe-limit'); }
    // Eine Runde sammeln, damit die Aufrufreihenfolge nicht über die Priorität
    // entscheidet. Genau ein bestätigter Kandidat darf die Lease erhalten.
    const candidates = [...this.requests.values()].filter(r => r.firstSampleAt < s.now && now - r.seenAt <= MAX_SAMPLE_AGE_MS && now >= (this.cooldowns.get(r.key) || 0));
    candidates.sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
    if (candidates[0]?.key !== key) return result(operatingMargin ? 'confirmed-import-bias' : 'waiting-for-arbitration', operatingMargin);
    const phaseProbe = request.phaseProbe === true;
    this.margins.delete(key);
    this.lease = { key, id: `zero-pv-${++this.sequence}`, startedAt: now, lastRequestAt: now,
      deadline: now + (phaseProbe ? 120000 : 30000), targetW: nextW, acquiredExtraW: nextW - baseW,
      baselineActualW: watts(request.actualW), lastActualW: watts(request.actualW), baselinePvW: s.pvW,
      lastSampleAt: now, lastNonPvW: 0, energyWh: 0, demandAt: 0, confirmedAt: 0,
      phaseProbe, phaseReadyAt: phaseProbe ? 0 : now };
    this.status = phaseProbe ? 'phase-transition' : 'probing';
    this.reason = this.status;
    return result(this.reason, this.lease);
  }

  snapshot() {
    const holding = [...this.evcsRuns.entries()].filter(([, run]) => run.hold?.extraW > 0);
    return { active: !!this.sample?.mode?.active, status: holding.length ? 'bridging' : this.status, reason: holding.length ? 'zero-export-pv-bridge' : this.reason,
      owner: this.lease?.key || holding.map(([key]) => key).join(','), probeW: this.lease?.targetW || 0,
      operatingMarginW: [...this.margins.values()].reduce((sum, m) => sum + m.extraW, 0),
      evcsHoldW: [...this.evcsRuns.values()].reduce((sum, r) => sum + (r.hold?.extraW || 0), 0),
      energyWh: this.lease?.energyWh ?? this.lastEnergyWh, validUntil: this.lease?.deadline || 0 };
  }
}

function coordinator(adapter) {
  if (!adapter._zeroExportPvCoordinator) adapter._zeroExportPvCoordinator = new ZeroExportPvCoordinator();
  return adapter._zeroExportPvCoordinator;
}

/** Einzige Core-Schnittstelle; die Instanz lebt nur im Adapter und wird nicht zwischen Anlagen geteilt. */
function updateZeroExportProbe(adapter, sample) {
  return coordinator(adapter).update({ ...sample, mode: readZeroExportMode(adapter) });
}

/** Prüft Freigaben bei jedem Verbraucheraufruf erneut, auch nach Konfigurationswechsel im selben Zyklus. */
function requestZeroExportProbe(adapter, request) {
  const c = coordinator(adapter);
  const mode = readZeroExportMode(adapter);
  if (c.sample) c.sample.mode = mode;
  return c.request(request);
}

/** Die gleichen aktuellen Freigaben gelten für Taktschutz und normale Prüflasten. */
function requestZeroExportHold(adapter, request) {
  const c = coordinator(adapter);
  if (c.sample) c.sample.mode = readZeroExportMode(adapter);
  return c.requestHold(request);
}
function zeroExportEvcsPauseUntil(adapter, key, now = Date.now()) {
  if (!readZeroExportMode(adapter).active) return 0;
  const until = coordinator(adapter).evcsRuns.get(key)?.pauseUntil || 0;
  return until > now ? until : 0;
}
function noteZeroExportEvcsCommand(adapter, request) {
  const c = coordinator(adapter);
  if (c.sample) c.sample.mode = readZeroExportMode(adapter);
  c.noteEvcsCommand(request);
}


/**
 * Strenge Messbasis für Prüflasten: maximal 5 s alte direkte PV und NVP;
 * vorhandene Speicher brauchen echte Lade-/Entlademessung. Abgeleitete Bilanz,
 * Forecast und neu publizierter Sollwert können keinen Messnachweis ersetzen.
 * Farm-Grossentladung wird berücksichtigt, auch wenn Nettoleistung Laden zeigt.
 */
function collectZeroExportSample(adapter, dp, budget, now) {
  const cfg = adapter.config || {};
  const dps = cfg.datapoints || {};
  const read = (key) => {
    const rec = adapter.stateCache?.[key];
    if (!rec || typeof rec !== 'object') return null;
    const value = Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec.val;
    const stamp = Number(rec.ts ?? rec.timestamp);
    return finite(value) && stamp > 0 && now >= stamp && now - stamp <= MAX_SAMPLE_AGE_MS ? Number(value) : null;
  };
  const candidates = [];
  for (const key of ['ps.pvW', 'cm.pvPowerW']) {
    try {
      const value = dp?.getNumberFresh(key, MAX_SAMPLE_AGE_MS, null);
      const age = dp?.getMeasurementAgeMs?.(key);
      if (finite(value) && finite(age) && Number(age) >= 0 && Number(age) <= MAX_SAMPLE_AGE_MS) candidates.push(Number(value));
    } catch (_e) { /* Fehlende Messquelle bleibt gesperrt. */ }
  }
  for (const key of ['pvPower', 'productionTotal']) if (String(dps[key] || '').trim()) {
    const value = read(key);
    if (value !== null) candidates.push(value);
  }
  const nvp = adapter._nvpFreshnessSnapshot;
  const nvpStamp = Number(nvp?.ts);
  const gridFresh = !!(nvp?.usable && finite(nvp.netW) && nvpStamp > 0 && now >= nvpStamp && now - nvpStamp <= MAX_SAMPLE_AGE_MS
    && finite(nvp.measurementAgeMs) && Number(nvp.measurementAgeMs) + now - nvpStamp <= MAX_SAMPLE_AGE_MS);
  const authority = adapter._nwGetStorageControlAuthority?.() || {};
  const topology = String(authority.selectedTopology || 'none');
  const mapped = ['batteryPower', 'storageChargePower', 'storageDischargePower'].filter(k => String(dps[k] || '').trim());
  const storagePresent = topology !== 'none' || cfg.enableStorageControl === true || cfg.enableStorageFarm === true
    || cfg.storageFarm?.enabled === true || mapped.length > 0 || !!dps.storageSoc;
  let storageFresh = !storagePresent;
  let storageDischargeW = 0;
  if (storagePresent) {
    try {
      const flow = adapter._nwResolveBatteryFlowFromCache?.({ now, maxAgeMs: MAX_SAMPLE_AGE_MS, strictStale: true, deadbandW: 0 });
      const ageOk = (v) => finite(v) && Number(v) >= 0 && Number(v) <= MAX_SAMPLE_AGE_MS;
      if (topology === 'farm') {
        storageFresh = flow?.src === 'storageFarmNet' && ageOk(flow.staleMs?.farmPower)
          && ageOk(flow.staleMs?.farmCharge) && ageOk(flow.staleMs?.farmDischarge);
      } else {
        // Ein einzelner Split-Kanal beweist die Gegenrichtung nicht.
        const signed = !!dps.batteryPower || (!!dps.storageChargePower && dps.storageChargePower === dps.storageDischargePower);
        const split = !!dps.storageChargePower && !!dps.storageDischargePower;
        const relevant = signed ? [dps.batteryPower ? 'batteryPower' : 'storageChargePower'] : ['storageChargePower', 'storageDischargePower'];
        storageFresh = !!(flow && flow.derived === false && (signed || split) && relevant.every(k => ageOk(flow.staleMs?.[k]))
          && !/missing|unavailable|derived/i.test(String(flow.src || '')));
      }
      storageDischargeW = Math.max(watts(flow?.dischargeW), watts(flow?.grossDischargeW));
    } catch (_e) { storageFresh = false; }
  }
  const iface = cfg.netOperatorInterface || {};
  const app = cfg.emsApps?.apps?.netOperator;
  const externalExpected = (app ? app.installed === true && app.enabled === true : cfg.enableNetOperatorInterface === true || iface.enabled === true)
    && iface.enabled === true && iface.mode === 'active' && iface.commissioned === true && iface.installerApproved === true;
  const env = adapter._netOperatorEnvelope;
  const externalBlocked = externalExpected && !(env?.valid === true && env?.fresh === true && env?.commOk === true
    && finite(env.validUntil) && now <= Number(env.validUntil) && !['trip', 'inhibit'].includes(String(env.command?.action || '')));
  const safety = adapter._emsSafetyEnvelope;
  return { now, gridW: gridFresh ? Number(nvp.netW) : null, gridFresh,
    pvW: candidates.length ? Math.max(0, ...candidates) : 0, pvFresh: candidates.length > 0,
    storageFresh, storageDischargeW,
    safetyReady: !!(safety?.valid && !safety.forceZero && !safety.emergencyStop && now <= safety.expiresAt),
    externalBlocked, tariffCurtail: budget?.gates?.tariff?.pvCurtailRecommended === true };
}

/** Unbestätigte gemessene Prüfleistung ist exklusiv gebunden und kein Budget für einen zweiten Verbraucher. */
function unconfirmedZeroExportW(adapter) {
  const lease = adapter?._zeroExportPvCoordinator?.lease;
  return lease && !lease.confirmedAt ? Math.max(0, watts(lease.acquiredExtraW), watts(lease.targetW) - watts(lease.baselineActualW), watts(lease.lastActualW) - watts(lease.baselineActualW)) : 0;
}


/** Liest ausschließlich frische Aufnahme regelbarer Lasten, ohne Sollwert-/Publikationsfallback. */
function measuredFlexibleLoadW(adapter, dp, kind, seen = new Set(), now = Date.now()) {
  if (kind === 'evcs') {
    const fleet = adapter?._zeroExportEvcsMeters;
    if (!fleet || !finite(fleet.ts) || now < fleet.ts || now - fleet.ts > MAX_SAMPLE_AGE_MS) return 0;
    let totalW = 0;
    for (const key of fleet.keys || []) {
      const entry = dp?.getEntry?.(key);
      const id = entry?.srcObjectId || entry?.objectId;
      const age = dp?.getMeasurementAgeMs?.(key);
      const value = dp?.getNumberFresh?.(key, MAX_SAMPLE_AGE_MS, null);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (finite(age) && age >= 0 && age <= MAX_SAMPLE_AGE_MS && finite(value)) totalW += watts(value);
    }
    return totalW;
  }
  const devices = adapter.config?.[kind]?.devices;
  if (!Array.isArray(devices)) return 0;
  const prefix = kind === 'heatingRod' ? 'hr' : 'th';
  let totalW = 0;
  for (const [index, device] of devices.entries()) {
    if (device?.enabled !== true) continue;
    const slot = Math.max(1, Math.min(20, Math.round(Number(device.slot ?? device.consumerSlot ?? index + 1))));
    const idKey = `c${slot}`;
    const ownership = (kind === 'heatingRod' ? adapter._zeroExportPvOwnedHeatingRod : adapter._zeroExportPvOwnedThermal)?.[idKey];
    if (!ownership?.owned || !finite(ownership.ts) || now < ownership.ts || now - ownership.ts > MAX_SAMPLE_AGE_MS) continue;
    if (kind === 'heatingRod') {
      const modeRec = adapter.stateCache?.[`heatingRod.devices.${idKey}.effectiveMode`];
      const effectiveMode = modeRec && typeof modeRec === 'object' ? modeRec.value ?? modeRec.val : modeRec;
      if (effectiveMode !== 'pvAuto') continue;
    }
    const key = `${prefix}.${idKey}.pW`;
    try {
      const entry = dp?.getEntry?.(key);
      const id = entry?.srcObjectId || entry?.objectId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const age = dp.getMeasurementAgeMs?.(key);
      const value = dp.getNumberFresh(key, MAX_SAMPLE_AGE_MS, null);
      if (finite(age) && Number(age) >= 0 && Number(age) <= MAX_SAMPLE_AGE_MS && finite(value)) totalW += watts(value);
    } catch (_e) { /* Keine Schätzung als Ersatz für einen echten Messwert. */ }
  }
  return totalW;
}


/**
 * Bestätigtes PV-Budget für LP-Netzanteilgrenzen. Ein Budget allein reicht
 * nicht: NVP, direkte PV und Speichertopologie müssen im aktuellen Core-Sample
 * frisch sein (max. 5 s). Prognosen und Suchlast werden nicht als PV freigegeben;
 * das zentrale Budget hat Batterieentladung bereits abgezogen. Der Aufrufer
 * verteilt den Rest EINMAL auf LP. Ohne Nachweis bleibt nur der Netzanteil.
 */
function confirmedZeroExportPvW(adapter, availableW, now = Date.now()) {
  const s = adapter?._zeroExportPvCoordinator?.sample;
  const budgetTs = adapter?._emsBudget?.ts;
  if (!readZeroExportMode(adapter).active || !s || !finite(s.now) || now < s.now || now - s.now > MAX_SAMPLE_AGE_MS
    || !finite(budgetTs) || now < budgetTs || now - budgetTs > MAX_SAMPLE_AGE_MS
    || !s.gridFresh || !finite(s.gridW) || !s.pvFresh || !finite(s.pvW) || !s.storageFresh
    || s.safetyReady !== true || s.externalBlocked || s.tariffCurtail || !finite(availableW)) return 0;
  return Math.max(0, Math.min(Number(availableW), Number(s.pvW)));
}

/** Finale Wiederholprüfung nach asynchronen Operationen, ohne die Lease zu verlängern. */
function isZeroExportGrantValid(adapter, key, leaseId, now = Date.now()) {
  const c = adapter?._zeroExportPvCoordinator;
  const mode = readZeroExportMode(adapter);
  if (!c || !leaseId || !mode.active) return false;
  if (c.sample) c.sample.mode = mode;
  if (String(leaseId).startsWith('evcs-hold-')) return c.holdValid(key, leaseId, now);
  if (c.lease?.id === leaseId && (!mode.maxProbeW || c.lease.acquiredExtraW > mode.maxProbeW)) return false;
  if (c.blockReason(now)) return false;
  const grant = c.lease?.key === key && c.lease.id === leaseId ? c.lease : c.margins.get(key);
  return !!(grant && grant.id === leaseId && now < grant.deadline && now >= c.sample.now
    && now - c.sample.now <= MAX_SAMPLE_AGE_MS);
}

module.exports = { confirmedZeroExportPvW, requestZeroExportHold, zeroExportEvcsPauseUntil, noteZeroExportEvcsCommand, isZeroExportGrantValid, measuredFlexibleLoadW, collectZeroExportSample, unconfirmedZeroExportW, ZeroExportPvCoordinator, readZeroExportMode, updateZeroExportProbe, requestZeroExportProbe };
