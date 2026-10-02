/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/mesh-transformer-allocation.ts
 * Quell-Hash: sha256:9715b3b00fae360c9ecb286bef26c75efffc067be6f96aad56b13b3c7328f401
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/mesh-transformer-allocation.js.
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
 * Aufgabe: Verteilt Trafo-/Strangkapazität nach gemessener Hauslast und gewünschtem Spielraum.
 * Daten und Wirkung: Reine Planung in W/A; keine Netzwerk- oder Geräteschreibzugriffe.
 * Verknüpfungen: mesh-coordinator-protocol prüft danach reservierte Altfreigaben und bestätigt Absenkungen.
 * Bei Änderungen: Gleichzeitige Lastsprünge, Einspeisung, Phasen, Rückfall und faire Umverteilung testen.
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const { NETWORK_KEYS, LIMIT_KEYS } = require('./mesh-coordinator-contract');
/** Sättigbare, gewichtete Verteilung. Nicht benötigte Anteile werden in derselben
 * Planung weitergegeben. Unvermeidliche Rückfalllasten werden zuerst reserviert. */
function waterfill(rows, key, capacity, desired) {
  const out = new Map(rows.map(r => [r.member.id, r.member.fallback[key]]));
  let free = Math.max(0, capacity - [...out.values()].reduce((a, b) => a + b, 0));
  let waiting = rows.filter(r => desired.get(r.member.id)[key] > out.get(r.member.id));
  for (let round = 0; waiting.length && free > 1e-8 && round <= rows.length; round++) {
    const weight = waiting.reduce((sum, r) => sum + r.member.weight, 0); const before = free;
    for (const r of waiting) {
      const id = r.member.id; const add = Math.min(desired.get(id)[key] - out.get(id), before * r.member.weight / weight);
      out.set(id, out.get(id) + add); free -= add;
    }
    waiting = waiting.filter(r => desired.get(r.member.id)[key] - out.get(r.member.id) > 1e-8);
  }
  return out;
}
/** Lokale EMS-Optimierung bleibt erhalten. Der Master vergibt stets sichere NVP-
 * Korridore; unbegrenzte Gleichzeitigkeit wäre bei knappem Trafo nicht zulässig.
 * Bei hoher Trafobelastung entfällt der zusätzliche Spielraum bis zur Hysterese. */
function transformerProposals(config, records, groups, sample, wasIntervening, now) {
  const a = config.allocation;
  const actual = { importW: Math.max(0, sample.gridW), exportW: Math.max(0, -sample.gridW), l1A: sample.phaseA[0], l2A: sample.phaseA[1], l3A: sample.phaseA[2] };
  const root = groups[0];
  const pressure = Math.max(...NETWORK_KEYS.map(k => root.limit[k] > 0 ? actual[k] / root.limit[k] * 100 : actual[k] > 0 ? 100 : 0));
  const intervention = wasIntervening ? pressure > a.releasePct : pressure >= a.engagePct;
  const capacityFor = (group, k) => {
    let unmonitored = group.unmonitored[k];
    if (!group.id) {
      const residual = k.endsWith('A') ? actual[k] - records.reduce((sum, r) => sum + r.sample.phaseA[Number(k[1]) - 1], 0) : (sample.gridW - records.reduce((sum, r) => sum + r.sample.gridW, 0)) * (k === 'exportW' ? -1 : 1);
      unmonitored = Math.max(unmonitored, residual, 0);
    }
    let capacity = Math.max(0, group.limit[k] - group.reserve[k] - unmonitored);
    if (!group.id && intervention) capacity = Math.max(0, Math.min(capacity, group.limit[k] * a.engagePct / 100 - unmonitored));
    return capacity;
  };
  const desired = new Map(); const proposals = new Map();
  for (const r of records) {
    const measured = { importW: Math.max(0, r.sample.gridW), exportW: Math.max(0, -r.sample.gridW), l1A: r.sample.phaseA[0], l2A: r.sample.phaseA[1], l3A: r.sample.phaseA[2] };
    // Gegenüber der letzten Freigabe ausgeschöpfte Häuser erhalten neue Reserve.
    // Getrennte Import-/Exportbeträge verhindern eine garantierte PV-Gutschrift.
    const wanted = { ...r.member.max };
    for (const k of NETWORK_KEYS) {
      const request = Number.isFinite(r.sample.requestedNetwork?.[k]) ? Math.max(0, r.sample.requestedNetwork[k]) : 0;
      wanted[k] = Math.min(r.member.max[k], Math.max(r.member.fallback[k], Math.max(measured[k], request) + (intervention ? 0 : k.endsWith('A') ? a.headroomA : a.headroomW)));
    }
    desired.set(r.member.id, wanted); proposals.set(r.member.id, { ...wanted });
  }
  // Startbudgets werden als ganze Mindestanforderung zugelassen. Sonst könnte
  // z. B. ein 30-kW-Trafo zwei DC-Ladern mit je 20 kW Mindestleistung jeweils
  // unbrauchbare 15 kW zuweisen. Bereits ladende Häuser haben beim Anlauf Vorrang;
  // innerhalb derselben Gruppe entscheidet das konfigurierte Gewicht, dann die ID.
  const floors = new Map(records.map(r => [r.member.id, { ...r.member.fallback }]));
  const starters = records.filter(r => Number.isFinite(r.sample.minimumNetwork?.importW) && r.sample.minimumNetwork.importW > 0)
    .sort((x, y) => Number(y.sample.controlledW?.evW > 50) - Number(x.sample.controlledW?.evW > 50) || y.member.weight - x.member.weight || x.member.id.localeCompare(y.member.id));
  let waitingForMinimum = false;
  for (const r of starters) {
    const floor = { ...floors.get(r.member.id) };
    for (const k of NETWORK_KEYS) if (Number.isFinite(r.sample.minimumNetwork[k])) floor[k] = Math.max(floor[k], Math.min(proposals.get(r.member.id)[k], r.sample.minimumNetwork[k]));
    const fits = groups.filter(g => !g.id || r.member.branch === g.id).every(g => NETWORK_KEYS.every(k =>
      records.filter(other => !g.id || other.member.branch === g.id).reduce((sum, other) => sum + (other === r ? floor[k] : floors.get(other.member.id)[k]), 0) <= capacityFor(g, k) + 1e-6));
    if (fits) floors.set(r.member.id, floor);
    else { waitingForMinimum = true; for (const k of NETWORK_KEYS) proposals.get(r.member.id)[k] = r.member.fallback[k]; }
  }
  const allocationRows = records.map(r => ({ ...r, member: { ...r.member, fallback: floors.get(r.member.id) } }));
  let constrained = waitingForMinimum;
  // Zuerst Stränge, dann Gesamtanschluss: ungenutzte Stranganteile können anderen
  // Strängen zufallen. Reservierte Altfreigaben berücksichtigt erst der Aufrufer.
  for (const group of [...groups.slice(1), root]) {
    const peers = allocationRows.filter(r => !group.id || r.member.branch === group.id);
    for (const k of NETWORK_KEYS) {
      const capacity = capacityFor(group, k);
      const sum = peers.reduce((total, r) => total + proposals.get(r.member.id)[k], 0);
      if (sum > capacity + 1e-6) constrained = true;
      const shares = waterfill(peers, k, capacity, proposals);
      for (const r of peers) proposals.get(r.member.id)[k] = shares.get(r.member.id);
    }
  }
  for (const r of records) for (const k of LIMIT_KEYS) {
    const target = proposals.get(r.member.id); const ramp = config.rampWPerSecond * Math.min(1, Math.max(0, now - r.lastChange) / 1000) / (k.endsWith('A') ? 230 : 1);
    target[k] = Math.min(target[k], r.target[k] + ramp);
  }
  return { proposals, intervention, controlMode: intervention || constrained ? 'TRANSFORMER_LIMIT' : 'LOCAL_AUTONOMY',
    reason: intervention ? 'Trafo belastet: Haus-NVP-Budgets abgesenkt; Wiederfreigabe erst unter der Rückschaltschwelle.' : constrained ? 'Gemeinsame Kapazität ausgeschöpft; verfügbare Leistung bedarfsabhängig auf Häuser verteilt.' : 'Häuser regeln lokal innerhalb ihrer NVP-Freigabe einschließlich zusätzlichem Spielraum.' };
}
module.exports = { transformerProposals, waterfill };
