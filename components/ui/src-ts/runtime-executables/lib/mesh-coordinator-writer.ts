// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft die aktuelle Mesh-Freigabe direkt vor numerischen PV-/Speicher-Schreibzugriffen.
 * Daten und Wirkung: Verarbeitet physische W bzw. Prozent vor der DP-Skalierung. Nur zusätzliche Absenkung, niemals Aufhebung lokaler Netz-/Gerätegrenzen.
 * Bei Änderungen: Gruppenleistung, Nullgrenzen, Rundung und abgelaufene Freigaben prüfen. Nicht unterstützte Geräteschnittstellen bleiben für aktive Mesh-Regelung gesperrt.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/mesh-coordinator-writer.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
function clampMeshWrite(adapter, registry, key, value) {
  const service = adapter?._meshCoordinator; const mesh = service?.currentLimits();
  if (!mesh?.required) return value;
  const b = mesh.limits;
  if (/^pv\.(?:(?:zero|evu)\.\d+\.)?(?:limitW|limitPct|feedInLimitW)$/.test(key)) {
    const cfg = adapter.config?.gridConstraints || {};
    const groups = ['pvCurtailInvertersZero', 'pvCurtailInvertersEvu'].flatMap(name => Array.isArray(cfg[name]) ? cfg[name] : []);
    // Doppelte WR-Zuordnungen werden bewusst konservativ mitgezählt. Das kann
    // Leistung kosten, gibt aber nie zusätzliche Gruppenleistung frei.
    const rated = Math.max(Number(cfg.pvRatedPowerW) || 0, Number(registry.getNumber('pv.ratedPowerW', 0)) || 0,
      groups.reduce((sum, item) => sum + Math.max(0, Number(item.ratedW) || 0), 0));
    const count = Math.max(1, groups.length);
    const cap = key.endsWith('feedInLimitW') ? b.exportW / count : key.endsWith('limitPct') ? (rated > 0 ? Math.min(100, 100 * b.pvW / rated) : 0) : b.pvW / count;
    return Math.max(0, Math.min(value, Math.floor(cap * (key.endsWith('Pct') ? 1000 : 1)) / (key.endsWith('Pct') ? 1000 : 1)));
  }
  if (['st.targetPowerW', 'st.targetChargePowerW', 'st.targetDischargePowerW', 'st.maxChargeW', 'st.maxDischargeW'].includes(key)) {
    const sample = service.sample(); const actual = sample.controlledW?.dischargeW;
    const discharge = sample.quality === 'ok' && Number.isFinite(actual) ? Math.min(b.dischargeW, Math.max(0, actual + sample.gridW + b.exportW)) : 0;
    if (['st.targetChargePowerW', 'st.maxChargeW'].includes(key)) return Math.max(0, Math.min(value, b.chargeW));
    if (['st.targetDischargePowerW', 'st.maxDischargeW'].includes(key)) return Math.max(0, Math.min(value, discharge));
    return value < 0 ? -Math.min(-value, b.chargeW) : Math.min(value, discharge);
  }
  return value;
}
module.exports = { clampMeshWrite };
