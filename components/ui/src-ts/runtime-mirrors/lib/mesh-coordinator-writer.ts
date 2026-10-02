// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/mesh-coordinator-writer.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/mesh-coordinator-writer.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: c96daf39a0b88ab3d9f8f0d769696b00062f4e7df79e7874e488013c1e4a68e5
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/mesh-coordinator-writer.ts
 * Quell-Hash: sha256:03ea2ceeab21be94695c78c9fe4017dd0bf3760513e43a215ff0d2aece032099
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/mesh-coordinator-writer.js.
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
 * Aufgabe: Prüft die aktuelle Mesh-Freigabe direkt vor numerischen PV-/Speicher-Schreibzugriffen.
 * Daten und Wirkung: Verarbeitet physische W bzw. Prozent vor der DP-Skalierung. Nur zusätzliche Absenkung, niemals Aufhebung lokaler Netz-/Gerätegrenzen.
 * Bei Änderungen: Gruppenleistung, Nullgrenzen, Rundung und abgelaufene Freigaben prüfen. Nicht unterstützte Geräteschnittstellen bleiben für aktive Mesh-Regelung gesperrt.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/mesh-coordinator-writer.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Code-Teil: clampMeshWrite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
