// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verarbeitet die konfigurierte Kopplung von Energie-Systemen und stellt ihre Austausch- und Betriebsinformationen bereit.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/mesh-microgrid.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/mesh-microgrid.js
 *
 * Zweck:
 * EOS Mesh/Microgrid Datenmodell als eigenes, getrenntes App-Modul. Dieses Modul
 * fasst mehrere Energie-Knoten (PV, Speicher, Ladepunkte, Verbraucher, Gebäude,
 * Netzpunkt usw.) zu einem lokalen Cluster zusammen und veröffentlicht daraus
 * neutrale NexoWatt-Intents für spätere Local-First-/Grid-Last-Strategien.
 *
 * Produktgrenze:
 * - Dieses Modul ist eine EOS-App und gehört nicht zur Home-Basis.
 * - Es ist bewusst ein eigenes Modul, damit Microgrid/Nachbarschaft später nicht
 *   in Energie-Wertkonto, Ledger, DC Display oder Export Guard vermischt wird.
 * - Ab 0.8.43 kann es nach ausdrücklicher Installateurfreigabe reale
 *   Local-First-/Grid-Last-Command-Intents ausgeben. Diese bleiben neutral:
 *   keine direkten WR-, Ladepunkt-, Speicher-, OCPP-, Modbus-, MQTT- oder
 *   Hersteller-Schreibbefehle aus diesem Modul heraus.
 *
 * Hersteller-/Protokolloffenheit:
 * Knoten können Daten aus beliebigen ioBroker-Datenpunkten liefern: OCPP, Modbus,
 * MQTT, REST, Herstelleradapter, NexoWatt-Devices oder Aliase. Das Modul sieht nur
 * normalisierte Leistung/SOC/Import/Export und bindet sich nicht an ein Protokoll.
 */

'use strict';

const { BaseModule } = require('./base');
const { isActuatorAuthorityBlockedResult } = require('../services/actuator-shadow-arbiter');

const MODULE_VERSION = 'nexowatt.mesh-microgrid-target-group-fairness.v1';
// Backward-compatible schema marker for 0.8.49 tests: nexowatt.mesh-microgrid-target-groups.v1
// Backward-compatible schema marker for 0.8.47 target-release tests: nexowatt.mesh-microgrid-target-release.v1
// Backward-compatible schema marker for static fieldtest test: nexowatt.mesh-microgrid-two-instance-fieldtest.v1

function safeId(input, fallback = 'node') {
  const s = String(input || '').trim().toLowerCase();
  return (s || fallback).replace(/[^a-z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || fallback;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
  return Math.round(n * f) / f;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeType(type) {
  const t = String(type || '').trim().toLowerCase();
  if (['pv', 'solar', 'producer', 'generation', 'generator'].includes(t)) return 'producer';
  if (['battery', 'storage', 'speicher'].includes(t)) return 'storage';
  if (['grid', 'meter', 'netz', 'netpoint', 'nvp'].includes(t)) return 'grid';
  if (['evcs', 'chargepoint', 'charging', 'wallbox', 'lp', 'dc', 'ac'].includes(t)) return 'chargepoint';
  if (['heatpump', 'thermal', 'heater', 'waermepumpe', 'wärmepumpe'].includes(t)) return 'thermal';
  if (['load', 'consumer', 'building', 'house', 'neighbor', 'nachbar'].includes(t)) return 'consumer';
  return 'generic';
}

function normalizeRole(role, type) {
  const r = String(role || '').trim().toLowerCase();
  if (['producer', 'generation', 'surplus', 'source'].includes(r)) return 'producer';
  if (['consumer', 'demand', 'sink', 'load'].includes(r)) return 'consumer';
  if (['grid', 'netpoint'].includes(r)) return 'grid';
  if (['storage'].includes(r)) return 'storage';
  const t = normalizeType(type);
  if (t === 'producer') return 'producer';
  if (t === 'grid') return 'grid';
  if (t === 'storage') return 'storage';
  return 'consumer';
}

function normalizeNodes(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  return arr.map((node, idx) => {
    const n = node && typeof node === 'object' ? node : {};
    let id = safeId(n.id || n.nodeId || n.key || `node_${idx + 1}`, `node_${idx + 1}`);
    if (seen.has(id)) id = `${id}_${idx + 1}`;
    seen.add(id);
    const type = normalizeType(n.type);
    return {
      id,
      name: String(n.name || n.label || id).trim() || id,
      type,
      role: normalizeRole(n.role, type),
      enabled: n.enabled !== false,
      priority: Math.max(1, Math.min(999, Math.round(num(n.priority, 100)))) || 100,
      powerDp: String(n.powerDp || n.powerWId || n.powerId || '').trim(),
      surplusPowerDp: String(n.surplusPowerDp || n.surplusWId || '').trim(),
      demandPowerDp: String(n.demandPowerDp || n.demandWId || '').trim(),
      socDp: String(n.socDp || n.socId || '').trim(),
      gridImportPowerDp: String(n.gridImportPowerDp || n.importPowerDp || '').trim(),
      gridExportPowerDp: String(n.gridExportPowerDp || n.exportPowerDp || '').trim(),
      // 0.8.48 Leistungsgrenzen je Knoten. Die Limits werden im CommandGuard
      // geprüft und begrenzen/blockieren nur neutrale Mesh-Command-Intents.
      // Sie erzeugen keine direkte Hardwaresteuerung.
      minPowerW: Math.max(0, Math.round(num(n.minPowerW, 0))),
      maxPowerW: Math.max(0, Math.round(num(n.maxPowerW, 0))),
      maxImportW: Math.max(0, Math.round(num(n.maxImportW, n.importLimitW || 0))),
      maxExportW: Math.max(0, Math.round(num(n.maxExportW, n.exportLimitW || 0))),
      maxChargeW: Math.max(0, Math.round(num(n.maxChargeW, n.chargeLimitW || 0))),
      maxDischargeW: Math.max(0, Math.round(num(n.maxDischargeW, n.dischargeLimitW || 0))),
      maxLoadW: Math.max(0, Math.round(num(n.maxLoadW, n.loadLimitW || 0))),
      maxGenerationW: Math.max(0, Math.round(num(n.maxGenerationW, n.generationLimitW || 0))),
      // 0.8.49: Zielgruppen-Zuordnung. Gruppen steuern nur neutrale Command-Intents.
      targetGroupIds: Array.isArray(n.targetGroupIds) ? n.targetGroupIds.map(x => safeId(x, '')).filter(Boolean) : String(n.targetGroupIds || n.targetGroups || '').split(/[\n,;]+/g).map(x => safeId(x, '')).filter(Boolean),
      note: String(n.note || '').trim(),
    };
  });
}


/**
 * 0.8.49 Zielgruppen-Strategie.
 *
 * Zielgruppen bündeln Knoten fachlich: Ladepunkte, Speicher, Verbraucher,
 * Erzeuger oder frei definierte Gruppen. Sie beeinflussen nur neutrale
 * Mesh-Command-Intents: Gruppengrenzen, Gruppenpriorität und Gruppenanteile
 * werden in CommandGuard und Betreiberansicht ausgewertet. Es gibt weiterhin
 * keine direkte Hardwaresteuerung aus Mesh/Microgrid heraus.
 */
function normalizeTargetGroups(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  return arr.map((g, idx) => {
    const x = g && typeof g === 'object' ? g : {};
    let id = safeId(x.id || x.groupId || x.key || `group_${idx + 1}`, `group_${idx + 1}`);
    if (seen.has(id)) id = `${id}_${idx + 1}`;
    seen.add(id);
    const type = normalizeType(x.type || x.groupType || 'generic');
    const memberNodeIds = Array.isArray(x.memberNodeIds) ? x.memberNodeIds : (Array.isArray(x.nodes) ? x.nodes : String(x.memberNodeIds || x.nodes || '').split(/[\n,;]+/g));
    const memberTypes = Array.isArray(x.memberTypes) ? x.memberTypes : String(x.memberTypes || '').split(/[\n,;]+/g);
    return {
      id,
      name: String(x.name || x.label || id).trim() || id,
      type,
      enabled: x.enabled !== false,
      priority: Math.max(1, Math.min(999, Math.round(num(x.priority, 100)))) || 100,
      memberNodeIds: memberNodeIds.map(v => safeId(String(v || '').trim(), '')).filter(Boolean),
      memberTypes: memberTypes.map(v => normalizeType(String(v || '').trim())).filter(Boolean),
      maxPowerW: Math.max(0, Math.round(num(x.maxPowerW, 0))),
      minPowerW: Math.max(0, Math.round(num(x.minPowerW, 0))),
      maxImportW: Math.max(0, Math.round(num(x.maxImportW, 0))),
      maxExportW: Math.max(0, Math.round(num(x.maxExportW, 0))),
      maxChargeW: Math.max(0, Math.round(num(x.maxChargeW, 0))),
      maxDischargeW: Math.max(0, Math.round(num(x.maxDischargeW, 0))),
      maxLoadW: Math.max(0, Math.round(num(x.maxLoadW, 0))),
      maxGenerationW: Math.max(0, Math.round(num(x.maxGenerationW, 0))),
      strategy: String(x.strategy || 'local_first').trim().toLowerCase() || 'local_first',
      // 0.8.50 Zielgruppen-Fairness: optionale Budget-/Mindestanteile für
      // die Verteilung neutraler Local-First-/Grid-Last-Command-Intents.
      // Gewicht und Mindestanteil erzeugen keine Hardwarebefehle, sondern
      // verteilen nur das zulässige Gruppenbudget im CommandGuard.
      fairShareWeight: Math.max(0, round(num(x.fairShareWeight || x.weight, 1), 3)),
      minSharePercent: Math.max(0, Math.min(100, round(num(x.minSharePercent || x.minPercent, 0), 2))),
      reservePowerW: Math.max(0, Math.round(num(x.reservePowerW || x.reservedPowerW, 0))),
      maxSharePercent: Math.max(0, Math.min(100, round(num(x.maxSharePercent || 100, 100), 2))),
      budgetPowerW: Math.max(0, Math.round(num(x.budgetPowerW || x.budgetW, 0))),
      note: String(x.note || '').trim(),
    };
  }).filter(g => g.enabled !== false);
}

function nodeInTargetGroup(node, group) {
  const n = node && typeof node === 'object' ? node : {};
  const g = group && typeof group === 'object' ? group : {};
  const id = safeId(n.id || '', '');
  if (!id) return false;
  if (Array.isArray(g.memberNodeIds) && g.memberNodeIds.includes(id)) return true;
  if (Array.isArray(n.targetGroupIds) && n.targetGroupIds.includes(g.id)) return true;
  if (Array.isArray(g.memberTypes) && g.memberTypes.includes(normalizeType(n.type))) return true;
  return false;
}

function targetGroupsForCommand(command, node, groups) {
  const n = node && typeof node === 'object' ? node : null;
  const list = Array.isArray(groups) ? groups : [];
  if (!n) return [];
  return list.filter(g => nodeInTargetGroup(n, g)).sort(prioritySort);
}

function _meshGroupLimitForCommand(groups, node, command) {
  const groupList = targetGroupsForCommand(command, node, groups);
  const limits = [];
  const minLimits = [];
  const reasons = [];
  const dir = String(command && command.direction || '').toLowerCase();
  const cat = String(command && command.category || '').toLowerCase();
  for (const g of groupList) {
    const addMax = (value, id) => {
      const v = Math.max(0, Math.round(num(value, 0)));
      if (v > 0) { limits.push(v); reasons.push({ id: `group.${g.id}.${id}`, limitW: v, groupId: g.id, groupName: g.name }); }
    };
    const addMin = (value, id) => {
      const v = Math.max(0, Math.round(num(value, 0)));
      if (v > 0) { minLimits.push(v); reasons.push({ id: `group.${g.id}.${id}`, limitW: v, groupId: g.id, groupName: g.name }); }
    };
    addMax(g.maxPowerW, 'maxPowerW');
    addMin(g.minPowerW, 'minPowerW');
    if (g.type === 'chargepoint' || dir.includes('charge')) addMax(g.maxChargeW || g.maxLoadW, 'maxChargeW/maxLoadW');
    if (g.type === 'storage' && (dir.includes('charge') || cat.includes('local_first'))) addMax(g.maxChargeW, 'maxChargeW');
    if (g.type === 'storage' && (dir.includes('discharge') || cat.includes('grid_last'))) addMax(g.maxDischargeW, 'maxDischargeW');
    if (g.type === 'consumer' || g.type === 'thermal' || dir.includes('load') || dir.includes('use')) addMax(g.maxLoadW, 'maxLoadW');
    if (g.type === 'producer' || dir.includes('export') || dir.includes('generation')) addMax(g.maxGenerationW || g.maxExportW, 'maxGenerationW/maxExportW');
    if (dir.includes('import')) addMax(g.maxImportW, 'maxImportW');
    if (dir.includes('export')) addMax(g.maxExportW, 'maxExportW');
  }
  return {
    groups: groupList.map(g => ({ id: g.id, name: g.name, type: g.type, priority: g.priority, strategy: g.strategy })),
    minPowerW: minLimits.length ? Math.max(...minLimits) : 0,
    maxPowerW: limits.length ? Math.min(...limits) : 0,
    reasons,
  };
}

function buildTargetGroupPlan(groups, nodes, commands) {
  const groupList = Array.isArray(groups) ? groups : [];
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const cmdList = Array.isArray(commands) ? commands : [];
  const summaries = groupList.map(g => {
    const members = nodeList.filter(n => nodeInTargetGroup(n, g));
    const groupCommands = cmdList.filter(c => members.some(n => String(n.id) === String(c.nodeId || c.targetNodeId || '')));
    const requestedW = groupCommands.reduce((sum, c) => sum + Math.max(0, Math.round(num(c.requestedPowerW || c.plannedPowerW, 0))), 0);
    const allowedW = groupCommands.reduce((sum, c) => sum + Math.max(0, Math.round(num(c.plannedPowerW, 0))), 0);
    return {
      schema: 'nexowatt.mesh-target-group-summary.v1',
      id: g.id,
      name: g.name,
      type: g.type,
      priority: g.priority,
      strategy: g.strategy,
      minSharePercent: g.minSharePercent || 0,
      maxSharePercent: g.maxSharePercent || 0,
      fairnessWeight: g.fairnessWeight || 1,
      minBudgetW: g.minBudgetW || 0,
      maxBudgetW: g.maxBudgetW || 0,
      memberCount: members.length,
      members: members.map(n => ({ id: n.id, name: n.name, type: n.type, priority: n.priority })),
      requestedPowerW: requestedW,
      allowedPowerW: allowedW,
      maxPowerW: g.maxPowerW || 0,
      minPowerW: g.minPowerW || 0,
      limits: {
        maxImportW: g.maxImportW || 0,
        maxExportW: g.maxExportW || 0,
        maxChargeW: g.maxChargeW || 0,
        maxDischargeW: g.maxDischargeW || 0,
        maxLoadW: g.maxLoadW || 0,
        maxGenerationW: g.maxGenerationW || 0,
      },
      directHardwareWrite: false,
      neutralCommandOnly: true,
    };
  });
  return {
    schema: 'nexowatt.mesh-target-groups.v1',
    groupCount: summaries.length,
    activeGroupCount: summaries.filter(g => g.memberCount > 0).length,
    groups: summaries,
    priorityOrder: summaries.slice().sort(prioritySort).map((g, idx) => ({ rank: idx + 1, id: g.id, name: g.name, type: g.type, priority: g.priority, memberCount: g.memberCount })),
    summary: summaries.length ? `${summaries.length} Zielgruppe(n) konfiguriert.` : 'Keine Zielgruppen konfiguriert.',
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}


/**
 * Sortiert Knoten nach Betreiberpriorität. Niedrige Zahlen bedeuten hohe
 * Priorität. Diese Hilfsfunktion ist bewusst rein diagnostisch: Sie plant nur
 * Empfehlungen für spätere Local-First-/Grid-Last-Regeln und erzeugt keine
 * Hardware-Schreibbefehle.
 */
function prioritySort(a, b) {
  const pa = Number.isFinite(Number(a && a.priority)) ? Number(a.priority) : 999;
  const pb = Number.isFinite(Number(b && b.priority)) ? Number(b.priority) : 999;
  if (pa !== pb) return pa - pb;
  return String((a && (a.name || a.id)) || '').localeCompare(String((b && (b.name || b.id)) || ''));
}

/**
 * Für Abwurfs-/Reduktionsdiagnosen werden niedriger priorisierte Senken zuerst
 * vorgeschlagen. Auch das ist nur Planung/Diagnose; keine Steuerung.
 */
function reversePrioritySort(a, b) {
  return prioritySort(b, a);
}

function priorityOrder(nodes) {
  return (Array.isArray(nodes) ? nodes : [])
    .filter(n => n && n.enabled !== false)
    .slice()
    .sort(prioritySort)
    .map((n, idx) => ({ rank: idx + 1, id: n.id, name: n.name, type: n.type, role: n.role, priority: n.priority }));
}


function buildGridLimitDiagnostics(totals, gridLimitW) {
  const limit = Math.max(0, Math.round(num(gridLimitW, 0)));
  const importW = Math.max(0, Math.round(num(totals && totals.gridImportW, 0)));
  const exportW = Math.max(0, Math.round(num(totals && totals.gridExportW, 0)));
  const activePowerW = Math.max(importW, exportW);
  const direction = importW >= exportW ? (importW > 0 ? 'import' : 'balanced') : 'export';
  const usagePercent = limit > 0 ? round((activePowerW / limit) * 100, 0) : 0;
  const remainingW = limit > 0 ? Math.max(0, limit - activePowerW) : 0;
  const overLimitW = limit > 0 ? Math.max(0, activePowerW - limit) : 0;
  const severity = limit <= 0 ? 'off' : (overLimitW > 0 ? 'critical' : (usagePercent >= 90 ? 'warn' : 'ok'));
  const message = limit <= 0
    ? 'Kein Cluster-/Netzlimit konfiguriert.'
    : (overLimitW > 0
      ? `Netzlimit überschritten (${direction}, ${overLimitW} W über Limit).`
      : `Netzlimit eingehalten (${direction}, ${remainingW} W Reserve).`);
  return { schema: 'nexowatt.mesh-grid-limit-diagnostics.v1', limitW: limit, importW, exportW, activePowerW, direction, usagePercent, remainingW, overLimitW, severity, message };
}

function makePlannedAction(input) {
  return {
    schema: 'nexowatt.mesh-planned-action.v1',
    actionId: input.actionId,
    rank: input.rank,
    category: input.category,
    trigger: input.trigger,
    nodeId: input.nodeId || '',
    nodeName: input.nodeName || '',
    targetNodeId: input.targetNodeId || '',
    targetNodeName: input.targetNodeName || '',
    priority: input.priority || 999,
    plannedPowerW: Math.max(0, Math.round(num(input.plannedPowerW, 0))),
    direction: input.direction || 'observe',
    severity: input.severity || 'info',
    reason: input.reason || '',
    readOnly: true,
    hardwareWrite: false,
    status: 'planned-diagnostic',
  };
}

/**
 * Erstellt einen reinen Diagnose-Plan für spätere Local-First-/Grid-Last-Logik.
 * Architekturregel:
 * - Die Planung nutzt nur den bestehenden Mesh-Snapshot.
 * - Es wird kein zweiter Regler, kein Write-Plan-Executor und kein Hardwarepfad
 *   aufgebaut.
 * - Aktionen sind absichtlich als `hardwareWrite:false` und `readOnly:true`
 *   gekennzeichnet, damit Installer und Betreiber sicher sehen, was NexoWatt
 *   später entscheiden könnte, ohne dass 0.8.36 bereits Geräte schaltet.
 */
function buildPlanning(nodes, totals, gridLimitW, mode) {
  const active = (Array.isArray(nodes) ? nodes : []).filter(n => n && n.enabled !== false && n.status !== 'disabled');
  const demands = active.filter(n => num(n.demandW, 0) > 0).sort(prioritySort);
  const surpluses = active.filter(n => num(n.surplusW, 0) > 0).sort(prioritySort);
  const lowerPriorityDemands = demands.slice().sort(reversePrioritySort);
  const lowerPrioritySurpluses = surpluses.slice().sort(reversePrioritySort);
  const gridDiag = buildGridLimitDiagnostics(totals, gridLimitW);
  const localFirstActions = [];
  const gridLastActions = [];
  const gridLimitActions = [];
  let rank = 1;

  let availableLocalW = Math.max(0, Math.round(num(totals && totals.surplusW, 0)));
  if (availableLocalW > 0 && demands.length) {
    for (const demand of demands) {
      if (availableLocalW <= 0) break;
      const planned = Math.min(availableLocalW, Math.max(0, Math.round(num(demand.demandW, 0))));
      if (planned <= 0) continue;
      localFirstActions.push(makePlannedAction({
        actionId: `local_first_${rank}`,
        rank: rank++,
        category: 'local_first',
        trigger: 'cluster_surplus',
        nodeId: demand.id,
        nodeName: demand.name,
        priority: demand.priority,
        plannedPowerW: planned,
        direction: 'increase_local_use',
        severity: 'info',
        reason: `Lokalen Überschuss bevorzugt für ${demand.name || demand.id} nutzen.`,
      }));
      availableLocalW -= planned;
    }
  }

  if (Math.max(0, Math.round(num(totals && totals.demandW, 0))) > 0 && surpluses.length && demands.length) {
    let remainingDemandW = Math.max(0, Math.round(num(totals && totals.demandW, 0)));
    for (const source of surpluses) {
      if (remainingDemandW <= 0) break;
      const planned = Math.min(remainingDemandW, Math.max(0, Math.round(num(source.surplusW, 0))));
      if (planned <= 0) continue;
      const target = demands[0] || null;
      gridLastActions.push(makePlannedAction({
        actionId: `grid_last_${rank}`,
        rank: rank++,
        category: 'grid_last',
        trigger: 'cluster_demand',
        nodeId: source.id,
        nodeName: source.name,
        targetNodeId: target && target.id,
        targetNodeName: target && target.name,
        priority: source.priority,
        plannedPowerW: planned,
        direction: 'reduce_grid_import',
        severity: 'info',
        reason: `Lokale Quelle ${source.name || source.id} vor Netzbezug verwenden.`,
      }));
      remainingDemandW -= planned;
    }
  }

  if (gridDiag.overLimitW > 0 && gridDiag.direction === 'import') {
    let remaining = gridDiag.overLimitW;
    for (const demand of lowerPriorityDemands) {
      if (remaining <= 0) break;
      const planned = Math.min(remaining, Math.max(0, Math.round(num(demand.demandW, 0))));
      if (planned <= 0) continue;
      gridLimitActions.push(makePlannedAction({
        actionId: `grid_import_limit_${rank}`,
        rank: rank++,
        category: 'grid_limit',
        trigger: 'import_limit_exceeded',
        nodeId: demand.id,
        nodeName: demand.name,
        priority: demand.priority,
        plannedPowerW: planned,
        direction: 'defer_or_reduce_low_priority_load',
        severity: 'critical',
        reason: `Netzlimit überschritten: niedriger priorisierte Last ${demand.name || demand.id} später reduzieren/verschieben.`,
      }));
      remaining -= planned;
    }
  }

  if (gridDiag.overLimitW > 0 && gridDiag.direction === 'export') {
    let remaining = gridDiag.overLimitW;
    for (const source of lowerPrioritySurpluses) {
      if (remaining <= 0) break;
      const planned = Math.min(remaining, Math.max(0, Math.round(num(source.surplusW, 0))));
      if (planned <= 0) continue;
      gridLimitActions.push(makePlannedAction({
        actionId: `grid_export_limit_${rank}`,
        rank: rank++,
        category: 'grid_limit',
        trigger: 'export_limit_exceeded',
        nodeId: source.id,
        nodeName: source.name,
        priority: source.priority,
        plannedPowerW: planned,
        direction: 'limit_low_priority_export_or_charge_local_sink',
        severity: 'critical',
        reason: `Einspeise-/Clusterlimit überschritten: Quelle ${source.name || source.id} später begrenzen oder lokale Senke priorisieren.`,
      }));
      remaining -= planned;
    }
  }

  if (!localFirstActions.length && !gridLastActions.length && !gridLimitActions.length) {
    localFirstActions.push(makePlannedAction({
      actionId: `observe_${rank}`,
      rank: rank++,
      category: 'observe',
      trigger: 'balanced_or_no_action',
      plannedPowerW: 0,
      direction: 'observe',
      severity: gridDiag.severity === 'warn' ? 'warn' : 'info',
      reason: 'Kein aktiver Eingriff geplant; Cluster beobachten und Prioritäten beibehalten.',
    }));
  }

  const actions = [...gridLimitActions, ...localFirstActions, ...gridLastActions]
    .map((a, idx) => ({ ...a, rank: idx + 1 }))
    .sort((a, b) => {
      const severityWeight = { critical: 0, warn: 1, info: 2 };
      const aw = severityWeight[a.severity] ?? 2;
      const bw = severityWeight[b.severity] ?? 2;
      if (aw !== bw) return aw - bw;
      return (a.rank || 999) - (b.rank || 999);
    })
    .map((a, idx) => ({ ...a, rank: idx + 1 }));

  const criticalActionCount = actions.filter(a => a.severity === 'critical').length;
  const readinessScorePercent = Math.max(0, Math.min(100, 100 - (criticalActionCount * 25) - (gridDiag.severity === 'warn' ? 10 : 0)));
  return {
    schema: 'nexowatt.mesh-planning-diagnostics.v1',
    mode,
    readOnly: true,
    hardwareWrite: false,
    gridLimit: gridDiag,
    priorityOrder: priorityOrder(active),
    localFirstActions,
    gridLastActions,
    gridLimitActions,
    actions,
    actionCount: actions.length,
    criticalActionCount,
    readinessScorePercent,
    summary: actions.map(a => `${a.category}: ${a.reason}`).join(' | '),
  };
}



function normalizeCommandOutputCfg(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const mode = String(cfg.controlMode || cfg.executionMode || 'diagnostic').trim().toLowerCase();
  const controlMode = ['off', 'diagnostic', 'field_test', 'active'].includes(mode) ? mode : 'diagnostic';
  const commandStateDp = String(cfg.commandStateDp || cfg.commandStateId || cfg.commandOutputDp || '').trim();
  const approved = cfg.fieldTestApproved === true || cfg.installerApproved === true || cfg.activeControlApproved === true;
  const maxCommandsPerTick = Math.max(1, Math.min(10, Math.round(num(cfg.maxCommandsPerTick, 3)) || 3));
  return { controlMode, commandStateDp, fieldTestApproved: approved, activeControlApproved: approved, maxCommandsPerTick };
}

function normalizeTailscaleCfg(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const t = cfg.tailscale && typeof cfg.tailscale === 'object' ? cfg.tailscale : (cfg.tailscaleMesh && typeof cfg.tailscaleMesh === 'object' ? cfg.tailscaleMesh : {});
  const enabled = t.enabled === true || cfg.tailscaleEnabled === true;
  const profile = String(t.profile || t.profileName || cfg.tailscaleProfile || 'mesh-microgrid').trim() || 'mesh-microgrid';
  const localNodeId = safeId(t.localNodeId || cfg.localNodeId || cfg.clusterId || 'local', 'local');
  const timeoutMs = Math.max(500, Math.min(10000, Math.round(num(t.timeoutMs || t.timeout || cfg.tailscaleTimeoutMs, 2500)) || 2500));
  const peerUrlText = Array.isArray(t.peerUrls) ? t.peerUrls.join('\n') : String(t.peerUrls || cfg.peerUrls || '');
  const peerToken = String(t.peerToken || cfg.peerToken || '').trim();
  const peerUrls = peerUrlText.split(/[\n,;]+/g).map(x => x.trim()).filter(Boolean).slice(0, 20);
  return { enabled, profile, localNodeId, timeoutMs, peerUrls, peerToken };
}

/**
 * 0.8.41 Command-Receiver-Konfiguration.
 *
 * Der Empfänger ist bewusst als separate, installerfreigegebene Sicherheitsgrenze
 * modelliert: Remote-Kommandos aus dem Mesh-Tailscale werden nicht direkt auf
 * Geräte geschrieben. Sie werden nach Token-, Cluster- und Replay-Prüfung nur in
 * einen lokalen neutralen JSON-Command-State gespiegelt. Erst eine nachgelagerte
 * lokale Bridge übersetzt den Intent in OCPP, Modbus, MQTT, REST oder
 * herstellerspezifische Datenpunkte.
 */
function normalizeReceiverCfg(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const r = cfg.receiver && typeof cfg.receiver === 'object' ? cfg.receiver : (cfg.commandReceiver && typeof cfg.commandReceiver === 'object' ? cfg.commandReceiver : {});
  const tailscale = normalizeTailscaleCfg(cfg);
  const enabled = r.enabled === true || cfg.receiverEnabled === true;
  const acceptRemoteCommands = r.acceptRemoteCommands === true || cfg.acceptRemoteCommands === true;
  const localCommandStateDp = String(r.localCommandStateDp || r.receivedCommandStateDp || cfg.receivedCommandStateDp || '').trim();
  const peerToken = String(r.peerToken || tailscale.peerToken || cfg.receiverToken || '').trim();
  const requireClusterMatch = r.requireClusterMatch !== false;
  const replayTtlSec = Math.max(30, Math.min(86400, Math.round(num(r.replayTtlSec || cfg.replayTtlSec, 900)) || 900));
  const processedLimit = Math.max(20, Math.min(2000, Math.round(num(r.processedLimit || cfg.receiverProcessedLimit, 200)) || 200));
  const allowedPeerNodeIdsRaw = Array.isArray(r.allowedPeerNodeIds) ? r.allowedPeerNodeIds.join(',') : String(r.allowedPeerNodeIds || cfg.allowedPeerNodeIds || '');
  const allowedPeerNodeIds = allowedPeerNodeIdsRaw.split(/[\n,;]+/g).map(x => safeId(x.trim(), '')).filter(Boolean);
  return { enabled, acceptRemoteCommands, localCommandStateDp, peerToken, requireClusterMatch, replayTtlSec, processedLimit, allowedPeerNodeIds };
}

/**
 * 0.8.43 Feld-/Aktivsteuerungs-CommandGuard für Mesh/Microgrid.
 *
 * Produktregel:
 * - Das Modul darf für Feldtests und den aktiven Local-First-Betrieb neutrale
 *   NexoWatt-Command-Intents ausgeben, wenn der Installateur dies explizit
 *   freigegeben und einen Command-State oder Mesh-Peer-Transport hinterlegt hat.
 * - Es schreibt weiterhin keine Wechselrichter-, Speicher-, Ladepunkt-, OCPP-,
 *   Modbus-, MQTT- oder Hersteller-Rohdatenpunkte direkt. Die Ausgabe ist ein
 *   herstellerneutraler JSON-Befehl, den eine nachgelagerte Bridge/Instanz im
 *   separaten Tailscale-Mesh interpretieren kann.
 * - Damit kann im Feld mit realen Instanzen gearbeitet werden, ohne die
 *   EMS-Logik an ein bestimmtes Protokoll zu koppeln. Die Umsetzung bleibt
 *   Aufgabe der lokalen Bridge/zweiten Instanz.
 */

/**
 * 0.8.44 Lokale Bridge-Zuordnung für Mesh/Microgrid.
 *
 * Zweck:
 * - Der Mesh-CommandGuard erzeugt herstellerneutrale Command-Intents.
 * - Diese Zuordnung verbindet einen lokalen Mesh-Knoten mit einem lokalen
 *   Ziel-Command-State, den eine lokale Bridge oder ein Herstelleradapter
 *   auswerten kann.
 * - Das Modul schreibt weiterhin keine OCPP-, Modbus-, MQTT-, REST- oder
 *   Hersteller-Rohbefehle direkt. Es schreibt nur JSON-Intents in explizit vom
 *   Installateur konfigurierte Command-States.
 */
function normalizeLocalBridgeCfg(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const b = cfg.localBridge && typeof cfg.localBridge === 'object' ? cfg.localBridge : (cfg.bridge && typeof cfg.bridge === 'object' ? cfg.bridge : {});
  const enabled = b.enabled === true || cfg.localBridgeEnabled === true;
  const modeRaw = String(b.outputMode || cfg.localBridgeOutputMode || 'global').trim().toLowerCase();
  const outputMode = ['global', 'mapped', 'both'].includes(modeRaw) ? modeRaw : 'global';
  const defaultCommandStateDp = String(b.defaultCommandStateDp || cfg.localBridgeDefaultCommandStateDp || '').trim();

  // 0.8.45 Bridge-ACK/Zielstatus: Die lokale Bridge kann nach Umsetzung eines
  // neutralen Mesh-Commands einen eigenen ACK-/Status-State schreiben. Das Mesh-
  // Modul liest diese Rückmeldung nur aus und bewertet sie für den Betreiber;
  // es entsteht dadurch weiterhin kein direkter Hardware-Schreibpfad.
  const ackEnabled = b.ackEnabled === true || cfg.localBridgeAckEnabled === true;
  // 0.8.46 ACK-Gate: Wenn aktiv, blockiert ein Ziel mit offenem/fehlerhaftem ACK
  // weitere neutrale Commands für genau dieses Ziel. Das verhindert im Feld
  // Command-Spam gegen eine Bridge, die den letzten Intent noch nicht bestätigt hat.
  const ackRequired = b.ackRequired === true || cfg.localBridgeAckRequired === true;
  const ackTimeoutSec = Math.max(5, Math.min(86400, Math.round(num(b.ackTimeoutSec || cfg.localBridgeAckTimeoutSec, 60)) || 60));
  // 0.8.47 Ziel-Wiederfreigabe: ACK-OK gibt ein Ziel automatisch wieder frei.
  // Zusätzlich kann der Betreiber im Feld ein einzelnes Ziel manuell für einen
  // begrenzten Zeitraum freigeben. Diese Freigabe betrifft nur den neutralen
  // Bridge-Command-State und schreibt niemals direkt auf Geräte-Hardware.
  const ackAutoRelease = b.ackAutoRelease !== false && cfg.localBridgeAckAutoRelease !== false;
  const manualReleaseEnabled = b.manualReleaseEnabled !== false && cfg.localBridgeManualReleaseEnabled !== false;
  const manualReleaseTtlSec = Math.max(30, Math.min(86400, Math.round(num(b.manualReleaseTtlSec || cfg.localBridgeManualReleaseTtlSec, 300)) || 300));
  const rawMappings = Array.isArray(b.mappings) ? b.mappings : (Array.isArray(cfg.localBridgeMappings) ? cfg.localBridgeMappings : []);
  const mappings = rawMappings.map((item, idx) => {
    const m = item && typeof item === 'object' ? item : {};
    const id = safeId(m.id || m.mappingId || `bridge_${idx + 1}`, `bridge_${idx + 1}`);
    const nodeId = safeId(m.nodeId || m.sourceNodeId || m.localNodeId || '', '');
    const targetNodeId = safeId(m.targetNodeId || m.targetId || m.nodeTargetId || nodeId || '', '');
    const commandStateDp = String(m.commandStateDp || m.commandStateId || m.targetCommandStateDp || defaultCommandStateDp || '').trim();
    const directionsRaw = Array.isArray(m.directions) ? m.directions.join(',') : String(m.directions || m.direction || '');
    const directions = directionsRaw.split(/[\n,;]+/g).map(x => String(x || '').trim()).filter(Boolean);
    return {
      id,
      enabled: m.enabled !== false,
      nodeId,
      targetNodeId,
      type: String(m.type || m.bridgeType || m.targetType || 'generic').trim().toLowerCase() || 'generic',
      label: String(m.label || m.name || id).trim() || id,
      commandStateDp,
      ackStateDp: String(m.ackStateDp || m.ackStateId || m.targetAckStateDp || '').trim(),
      statusStateDp: String(m.statusStateDp || m.statusStateId || m.targetStatusStateDp || '').trim(),
      onlineStateDp: String(m.onlineStateDp || m.onlineStateId || m.targetOnlineStateDp || '').trim(),
      errorStateDp: String(m.errorStateDp || m.errorStateId || m.targetErrorStateDp || '').trim(),
      maxPowerW: Math.max(0, Math.round(num(m.maxPowerW, 0))),
      minPowerW: Math.max(0, Math.round(num(m.minPowerW, 0))),
      directions,
      note: String(m.note || '').trim(),
    };
  }).filter(m => m && m.enabled !== false);
  return { enabled, outputMode, defaultCommandStateDp, ackEnabled, ackRequired, ackTimeoutSec, ackAutoRelease, manualReleaseEnabled, manualReleaseTtlSec, mappings };
}

/**
 * Bereinigt manuelle Bridge-Ziel-Freigaben.
 *
 * Freigaben werden vom Bediener/Installateur über die Betreiberansicht gesetzt
 * und leben nur für eine begrenzte Zeit. Dadurch kann ein Ziel im Feld nach
 * Sichtprüfung wieder freigegeben werden, ohne die ACK-Logik global abzuschalten.
 */
function normalizeManualReleaseList(raw, now) {
  const ts = Number(now || Date.now());
  const arr = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const item of arr) {
    const r = item && typeof item === 'object' ? item : {};
    const mappingId = String(r.mappingId || r.id || '').trim();
    const commandStateDp = String(r.commandStateDp || '').trim();
    const expiresAt = Math.max(0, Number(r.expiresAt || 0));
    if (!mappingId && !commandStateDp) continue;
    if (expiresAt && expiresAt < ts) continue;
    out.push({
      schema: 'nexowatt.mesh-local-bridge-manual-release.v1',
      mappingId,
      commandStateDp,
      ts: Math.max(0, Number(r.ts || ts)),
      expiresAt,
      ttlSec: Math.max(0, Number(r.ttlSec || 0)),
      reason: String(r.reason || 'manual_release').trim() || 'manual_release',
      by: String(r.by || 'operator').trim() || 'operator',
    });
  }
  return out.slice(0, 100);
}

function buildManualReleaseSummary(raw, now) {
  const active = normalizeManualReleaseList(raw, now);
  return {
    schema: 'nexowatt.mesh-local-bridge-manual-release-summary.v1',
    ts: Number(now || Date.now()),
    active,
    activeCount: active.length,
    mappingIds: active.map(x => x.mappingId).filter(Boolean),
    commandStateDps: active.map(x => x.commandStateDp).filter(Boolean),
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}

function manualReleaseForMapping(manualReleaseSummary, mapping) {
  const m = mapping && typeof mapping === 'object' ? mapping : {};
  const list = manualReleaseSummary && Array.isArray(manualReleaseSummary.active) ? manualReleaseSummary.active : [];
  const mappingId = String(m.id || m.mappingId || '').trim();
  const commandStateDp = String(m.commandStateDp || '').trim();
  return list.find(r => (mappingId && r.mappingId === mappingId) || (commandStateDp && r.commandStateDp === commandStateDp)) || null;
}

function buildTargetCommandHistory(commandHistory, maxPerTarget = 12) {
  const rows = Array.isArray(commandHistory) ? commandHistory : [];
  const byTarget = new Map();
  for (const row of rows) {
    const writes = Array.isArray(row && row.bridgeWrites) ? row.bridgeWrites : [];
    for (const w of writes) {
      const mappingIds = Array.isArray(w.mappingIds) && w.mappingIds.length ? w.mappingIds : (w.mappingId ? [w.mappingId] : []);
      const commandIds = Array.isArray(w.commandIds) && w.commandIds.length ? w.commandIds : (w.commandId ? [w.commandId] : []);
      const targets = mappingIds.length ? mappingIds : [String(w.commandStateDp || 'unmapped')];
      for (const target of targets) {
        if (!target) continue;
        if (!byTarget.has(target)) byTarget.set(target, []);
        byTarget.get(target).push({
          ts: Number(w.ts || row.ts || 0),
          mappingId: target,
          commandStateDp: String(w.commandStateDp || ''),
          status: String(w.status || row.status || ''),
          reason: String(w.reason || row.localError || ''),
          commandCount: Number(w.commandCount || 0),
          commandIds,
          directHardwareWrite: false,
          neutralCommandOnly: true,
        });
      }
    }
  }
  const targets = [];
  for (const [mappingId, history] of byTarget.entries()) {
    const sorted = history.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0)).slice(0, maxPerTarget);
    targets.push({
      mappingId,
      lastStatus: sorted[0] && sorted[0].status || 'unknown',
      lastTs: sorted[0] && sorted[0].ts || 0,
      count: history.length,
      history: sorted,
    });
  }
  targets.sort((a, b) => Number(b.lastTs || 0) - Number(a.lastTs || 0));
  return {
    schema: 'nexowatt.mesh-local-bridge-target-command-history.v1',
    generatedAt: Date.now(),
    targetCount: targets.length,
    targets,
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}

/**
 * 0.8.46 ACK-Gate und Ziel-Ampel.
 *
 * Zweck:
 * - Bridge-ACKs dürfen optional nur Diagnose sein oder als Sicherheits-Gate
 *   wirken. Wenn der Installateur `ackRequired` aktiviert, blockiert ein
 *   wartendes, fehlendes, fehlerhaftes oder veraltetes ACK Folge-Commands zu
 *   genau diesem Bridge-Ziel.
 * - Die Sperre bleibt auf die lokale Bridge-Zuordnung begrenzt. Es wird keine
 *   Hardware direkt geschaltet und es entsteht kein zweiter Command-Regler.
 * - Ziel-Ampeln fassen ACK, Online-Status und Fehlertext pro Mapping zusammen,
 *   damit Feldtests mit echten Geräten schnell lesbar sind.
 */

function buildBridgeAckSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const okCount = list.filter(r => r && (r.ackOk === true || r.ok === true)).length;
  const timeoutCount = list.filter(r => r && String(r.ackStatus || r.status || '').toLowerCase().includes('timeout')).length;
  const errorCount = list.filter(r => r && ['error','failed','rejected','blocked','read_error'].includes(String(r.ackStatus || r.status || '').toLowerCase())).length;
  const waitingCount = list.filter(r => r && ['waiting','pending','waiting_for_new_ack'].includes(String(r.ackStatus || r.status || '').toLowerCase())).length;
  return {
    schema: 'nexowatt.mesh-local-bridge-ack-summary.v1',
    enabled: false,
    rows: list,
    targets: list,
    okCount,
    timeoutCount,
    errorCount,
    pendingCount: waitingCount,
    status: list.length ? ((timeoutCount || errorCount) ? 'error' : (waitingCount ? 'warn' : 'ok')) : 'no-targets',
  };
}

function buildBridgeAckGate(localBridge, ackSummary, manualReleaseSummary) {
  const lb = localBridge && typeof localBridge === 'object' ? localBridge : {};
  const mappings = Array.isArray(lb.mappings) ? lb.mappings : [];
  const ack = ackSummary && typeof ackSummary === 'object' ? ackSummary : buildBridgeAckSummary([]);
  const rows = Array.isArray(ack.rows) ? ack.rows : (Array.isArray(ack.targets) ? ack.targets.map(t => ({ ...(t || {}), ackStatus: (t && (t.ackStatus || t.status)) || '', ackOk: t && t.ok === true, targetStatusClass: (t && (t.severity === 'critical' ? 'error' : (t.status === 'timeout' ? 'error' : 'unknown'))) || 'unknown' })) : []);
  const byMapping = new Map();
  for (const row of rows) {
    if (!row) continue;
    if (row.mappingId) byMapping.set(String(row.mappingId), row);
    if (row.commandStateDp && !byMapping.has(String(row.commandStateDp))) byMapping.set(String(row.commandStateDp), row);
  }

  const enabled = lb.ackEnabled === true;
  const required = lb.ackRequired === true;
  const blockedMappings = [];
  const allowedMappingIds = [];
  const targetLights = [];

  for (const m of mappings) {
    const mappingId = String(m && (m.id || m.mappingId || m.commandStateDp) || '').trim();
    if (!mappingId) continue;
    const row = byMapping.get(mappingId) || byMapping.get(String(m.commandStateDp || '')) || null;
    const noAckConfig = !(m && (m.ackStateDp || m.statusStateDp));
    const ackStatus = row ? String(row.ackStatus || row.status || 'unknown') : (noAckConfig ? 'not-configured' : 'idle');
    const lastWriteAt = Number(row && row.lastWriteAt || 0);
    const targetClass = row ? String(row.targetStatusClass || 'unknown') : 'unknown';
    const targetOffline = targetClass === 'offline';
    const targetError = targetClass === 'error';
    const ackOk = row && (row.ackOk === true || row.ok === true);
    const hasPendingWrite = lastWriteAt > 0 && ackOk !== true;
    const manualRelease = manualReleaseForMapping(manualReleaseSummary, m);
    const manualReleaseActive = !!manualRelease;

    let light = 'grey';
    let block = false;
    let reason = '';

    if (manualReleaseActive && required && hasPendingWrite) {
      light = 'green';
      block = false;
      reason = 'manual_release';
    } else if (!enabled) {
      light = 'grey';
      reason = 'ack_disabled';
    } else if (required && noAckConfig) {
      light = 'red';
      block = true;
      reason = 'ack_not_configured';
    } else if (enabled && targetError) {
      light = required ? 'red' : 'yellow';
      block = required;
      reason = 'target_error';
    } else if (enabled && targetOffline) {
      light = required ? 'red' : 'yellow';
      block = required;
      reason = 'target_offline';
    } else if (enabled && required && hasPendingWrite) {
      if (ackStatus === 'waiting') { light = 'yellow'; block = true; reason = 'ack_waiting'; }
      else if (ackStatus === 'timeout') { light = 'red'; block = true; reason = 'ack_timeout'; }
      else if (['rejected','blocked','failed','error','unknown'].includes(ackStatus)) { light = 'red'; block = true; reason = `ack_${ackStatus}`; }
      else { light = 'yellow'; block = true; reason = 'ack_not_ok'; }
    } else if (enabled && ackOk) {
      light = 'green';
      reason = 'ack_ok';
    } else if (enabled && !required && hasPendingWrite) {
      light = ackStatus === 'timeout' ? 'yellow' : 'blue';
      reason = `ack_observe_${ackStatus}`;
    } else {
      light = enabled ? 'blue' : 'grey';
      reason = enabled ? 'ack_observe' : 'ack_disabled';
    }

    const rowOut = {
      mappingId,
      nodeId: m.nodeId || '',
      targetNodeId: m.targetNodeId || '',
      commandStateDp: m.commandStateDp || '',
      ackStatus,
      ackOk: ackOk === true,
      targetStatusClass: targetClass,
      targetOnline: row ? row.targetOnline : null,
      ageSec: row ? row.ageSec : null,
      light,
      blocked: block,
      reason,
      lastCommandId: row ? (row.lastCommandId || '') : '',
      manualReleaseActive,
      manualReleaseUntil: manualRelease ? Number(manualRelease.expiresAt || 0) : 0,
      directHardwareWrite: false,
      neutralCommandOnly: true,
    };
    targetLights.push(rowOut);
    if (block) blockedMappings.push(rowOut);
    else allowedMappingIds.push(mappingId);
  }

  const timeoutCount = blockedMappings.filter(x => x.reason === 'ack_timeout').length;
  const waitingCount = blockedMappings.filter(x => x.reason === 'ack_waiting').length;
  const notConfiguredCount = blockedMappings.filter(x => x.reason === 'ack_not_configured').length;
  const targetErrorCount = blockedMappings.filter(x => x.reason === 'target_error' || x.reason === 'target_offline').length;
  const errorCount = blockedMappings.length - timeoutCount - waitingCount - notConfiguredCount - targetErrorCount;
  const status = !enabled ? 'disabled' : (!required ? 'observe' : (blockedMappings.length ? 'blocking' : 'ready'));
  return {
    schema: 'nexowatt.mesh-local-bridge-ack-gate.v1',
    enabled,
    required,
    status,
    gateActive: enabled && required,
    blockedCount: blockedMappings.length,
    waitingCount,
    timeoutCount,
    errorCount: Math.max(0, errorCount),
    notConfiguredCount,
    targetErrorCount,
    allowedMappingIds,
    blockedMappings,
    targetLights,
    manualRelease: manualReleaseSummary || buildManualReleaseSummary([], Date.now()),
    autoRelease: lb.ackAutoRelease !== false,
    reason: !enabled
      ? 'Bridge-ACK-Gate deaktiviert; ACKs sind nur ausgeblendet bzw. nicht bewertet.'
      : (!required
        ? 'Bridge-ACK wird beobachtet, blockiert aber keine Folge-Commands.'
        : (blockedMappings.length ? `${blockedMappings.length} Bridge-Ziel(e) durch ACK-Gate blockiert.` : 'Bridge-ACK-Gate bereit; alle geprüften Ziele sind freigegeben.')),
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}

function findLocalBridgeMappingForCommand(command, mappings) {
  const cmd = command && typeof command === 'object' ? command : {};
  const list = Array.isArray(mappings) ? mappings : [];
  const nodeId = safeId(cmd.nodeId || '', '');
  const targetNodeId = safeId(cmd.targetNodeId || '', '');
  const direction = String(cmd.direction || '').trim();
  const candidates = list.filter(m => {
    if (!m || !m.commandStateDp) return false;
    const matchNode = m.nodeId && (m.nodeId === nodeId || m.nodeId === targetNodeId);
    const matchTarget = m.targetNodeId && (m.targetNodeId === targetNodeId || m.targetNodeId === nodeId);
    const matchAny = !m.nodeId && !m.targetNodeId;
    if (!(matchNode || matchTarget || matchAny)) return false;
    if (Array.isArray(m.directions) && m.directions.length && direction) return m.directions.includes(direction);
    return true;
  });
  candidates.sort((a, b) => {
    const aExact = (a.nodeId && a.nodeId === nodeId ? 0 : 1) + (a.targetNodeId && a.targetNodeId === targetNodeId ? 0 : 1);
    const bExact = (b.nodeId && b.nodeId === nodeId ? 0 : 1) + (b.targetNodeId && b.targetNodeId === targetNodeId ? 0 : 1);
    if (aExact !== bExact) return aExact - bExact;
    return String(a.id).localeCompare(String(b.id));
  });
  return candidates[0] || null;
}

function buildLocalBridgePlan(commandGuard, bridgeCfg) {
  const cfg = bridgeCfg && typeof bridgeCfg === 'object' ? bridgeCfg : normalizeLocalBridgeCfg({});
  const commands = commandGuard && Array.isArray(commandGuard.allowedCommands) ? commandGuard.allowedCommands : [];
  const mappedCommands = [];
  const unmappedCommands = [];
  for (const command of commands) {
    const mapping = findLocalBridgeMappingForCommand(command, cfg.mappings);
    if (!mapping) {
      unmappedCommands.push({ commandId: command && command.commandId || '', nodeId: command && command.nodeId || '', targetNodeId: command && command.targetNodeId || '', reason: 'Keine lokale Bridge-Zuordnung für diesen Command gefunden.' });
      continue;
    }
    const planned = Math.max(0, Math.round(num(command && command.plannedPowerW, 0)));
    const limited = mapping.maxPowerW > 0 ? Math.min(planned, mapping.maxPowerW) : planned;
    mappedCommands.push({
      schema: 'nexowatt.mesh-local-bridge-command.v1',
      mappingId: mapping.id,
      mappingLabel: mapping.label,
      bridgeType: mapping.type,
      commandStateDp: mapping.commandStateDp,
      ackStateDp: mapping.ackStateDp || '',
      statusStateDp: mapping.statusStateDp || '',
      onlineStateDp: mapping.onlineStateDp || '',
      errorStateDp: mapping.errorStateDp || '',
      commandId: command.commandId,
      sourceActionId: command.sourceActionId || '',
      clusterId: command.clusterId || '',
      nodeId: command.nodeId || '',
      targetNodeId: command.targetNodeId || '',
      direction: command.direction || '',
      category: command.category || '',
      priority: command.priority || 999,
      requestedPowerW: planned,
      plannedPowerW: limited,
      limitedByMapping: mapping.maxPowerW > 0 && limited < planned,
      outputMode: cfg.outputMode,
      neutralCommandOnly: true,
      directHardwareWrite: false,
      hardwareWrite: false,
      note: mapping.note || 'Lokaler Bridge-Command; nachgelagerte Bridge setzt hersteller-/protokollspezifisch um.',
      originalCommand: command,
    });
  }
  const routeReady = cfg.enabled === true && ['mapped', 'both'].includes(cfg.outputMode) && mappedCommands.length > 0;
  const warnings = [];
  if (cfg.enabled && ['mapped', 'both'].includes(cfg.outputMode) && !cfg.mappings.length) warnings.push('Lokale Bridge ist aktiv, aber es sind keine Zuordnungen konfiguriert.');
  if (cfg.enabled && ['mapped', 'both'].includes(cfg.outputMode) && unmappedCommands.length) warnings.push(`${unmappedCommands.length} Command(s) haben noch keine lokale Bridge-Zuordnung.`);
  return {
    schema: 'nexowatt.mesh-local-bridge-plan.v1',
    enabled: cfg.enabled,
    outputMode: cfg.outputMode,
    defaultCommandStateDp: cfg.defaultCommandStateDp,
    ackEnabled: cfg.ackEnabled === true,
    ackRequired: cfg.ackRequired === true,
    ackTimeoutSec: cfg.ackTimeoutSec,
    ackAutoRelease: cfg.ackAutoRelease !== false,
    manualReleaseEnabled: cfg.manualReleaseEnabled !== false,
    manualReleaseTtlSec: cfg.manualReleaseTtlSec || 300,
    mappingCount: cfg.mappings.length,
    mappedCommandCount: mappedCommands.length,
    unmappedCommandCount: unmappedCommands.length,
    routeReady,
    mappings: cfg.mappings,
    mappedCommands,
    unmappedCommands,
    warnings,
    reason: routeReady ? `${mappedCommands.length} lokale Bridge-Command(s) bereit.` : (warnings[0] || 'Lokale Bridge-Zuordnung nicht aktiv oder keine passenden Commands.'),
    neutralCommandOnly: true,
    directHardwareWrite: false,
  };
}



/**
 * 0.8.45 Bridge-ACK-Helfer.
 *
 * Lokale Bridges/Herstelleradapter dürfen nach der Umsetzung eines neutralen
 * Mesh-Commands ihren eigenen ACK- oder Status-State schreiben. Diese Helfer
 * klassifizieren solche Rückmeldungen herstellerneutral. Akzeptierte Begriffe
 * sind bewusst breit gefasst, damit OCPP-, Modbus-, MQTT-, REST- oder eigene
 * NexoWatt-Device-Bridges alle denselben Zielstatus liefern können.
 */
function _meshParseJsonMaybe(value) {
  if (value && typeof value === 'object') return value;
  const s = String(value == null ? '' : value).trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch (_e) { return null; }
}

function _meshAckText(raw) {
  const parsed = _meshParseJsonMaybe(raw);
  if (parsed) {
    return [parsed.status, parsed.state, parsed.result, parsed.ack, parsed.message, parsed.reason, parsed.error, parsed.commandId]
      .filter(v => v !== undefined && v !== null)
      .map(v => String(v).toLowerCase())
      .join(' ');
  }
  return String(raw == null ? '' : raw).toLowerCase();
}

function classifyLocalBridgeAck(raw) {
  const text = _meshAckText(raw);
  if (!text) return { status: 'unknown', ok: false, label: 'unbekannt', severity: 'warn' };
  if (/(success|succeeded|accepted|executed|done|ok|true|acknowledged|applied|completed)/.test(text)) return { status: 'ok', ok: true, label: 'angenommen/ausgeführt', severity: 'info' };
  if (/(pending|queued|running|in_progress|waiting|processing)/.test(text)) return { status: 'pending', ok: false, label: 'wartet/läuft', severity: 'warn' };
  if (/(reject|rejected|blocked|denied|failed|failure|error|false|timeout|expired)/.test(text)) return { status: 'error', ok: false, label: 'Fehler/blockiert', severity: 'critical' };
  return { status: 'unknown', ok: false, label: 'unbekannt', severity: 'warn' };
}


/**
 * 0.8.48 Node-/Bridge-Leistungsgrenzen.
 *
 * Dieses Limit-Gate liegt bewusst vor jeder neutralen Command-Ausgabe. Es ändert
 * nur Mesh-Command-Intents: zu große Leistungen werden gekürzt oder blockiert.
 * Es schreibt keine Hardware und ersetzt keinen lokalen Bridge-/Geräteadapter.
 */

/**
 * 0.8.50 Zielgruppen-Fairness.
 *
 * Zweck:
 * Verteilt das aktuell geplante Leistungsbudget auf Zielgruppen. Jede Gruppe kann
 * Gewicht, Mindestanteil, Reservierung und harte Gruppenlimits besitzen. Die
 * Funktion arbeitet ausschließlich auf neutralen Command-Intents und blockiert/
 * reduziert diese, bevor sie in lokale Bridge-/Peer-States geschrieben werden.
 */
function buildTargetGroupFairnessPlan(groups, nodes, commands) {
  const groupList = Array.isArray(groups) ? groups : [];
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const cmdList = Array.isArray(commands) ? commands : [];
  const nodeById = new Map(nodeList.map(n => [String(n && n.id || ''), n]));
  const sortedGroups = groupList.slice().sort(prioritySort);
  const totalRequestedW = cmdList.reduce((sum, c) => sum + Math.max(0, Math.round(num(c && (c.requestedPowerW || c.plannedPowerW), 0))), 0);
  const totalHardBudgetW = sortedGroups.reduce((sum, g) => sum + Math.max(0, Math.round(num(g && g.maxPowerW, 0))), 0);
  const fairnessBudgetW = totalHardBudgetW > 0 ? Math.min(totalRequestedW || totalHardBudgetW, totalHardBudgetW) : totalRequestedW;
  const positiveWeights = sortedGroups.reduce((sum, g) => sum + Math.max(0, num(g && g.fairShareWeight, 1)), 0) || sortedGroups.length || 1;
  const budgets = new Map();
  for (const g of sortedGroups) {
    const requestedW = cmdList.filter(c => nodeInTargetGroup(nodeById.get(String(c && (c.nodeId || c.targetNodeId) || '')), g)).reduce((sum, c) => sum + Math.max(0, Math.round(num(c && (c.requestedPowerW || c.plannedPowerW), 0))), 0);
    const minShareW = Math.max(Math.round((fairnessBudgetW * Math.max(0, num(g.minSharePercent, 0))) / 100), Math.max(0, Math.round(num(g.reservePowerW, 0))));
    const weightedShareW = Math.round((fairnessBudgetW * Math.max(0, num(g.fairShareWeight, 1))) / positiveWeights);
    let budgetW = Math.max(minShareW, weightedShareW);
    if (g.maxPowerW > 0) budgetW = Math.min(budgetW, g.maxPowerW);
    if (requestedW > 0) budgetW = Math.min(budgetW, requestedW);
    budgets.set(g.id, { groupId: g.id, groupName: g.name, priority: g.priority, requestedW, budgetW, usedW: 0, remainingW: budgetW, minShareW, weightedShareW, maxPowerW: g.maxPowerW || 0, fairShareWeight: g.fairShareWeight || 1, minSharePercent: g.minSharePercent || 0, reservePowerW: g.reservePowerW || 0 });
  }
  const limitedCommands = [];
  const blockedCommands = [];
  const fairnessCommands = cmdList.map(cmd => {
    const c = cmd && typeof cmd === 'object' ? cmd : {};
    const node = nodeById.get(String(c.nodeId || c.targetNodeId || '')) || null;
    const memberships = targetGroupsForCommand(c, node, sortedGroups);
    if (!memberships.length) return { ...c, targetGroupFairness: { schema: 'nexowatt.mesh-target-group-fairness-command.v1', applied: false, reason: 'no_target_group', directHardwareWrite: false, neutralCommandOnly: true } };
    const g = memberships[0];
    const b = budgets.get(g.id) || { budgetW: 0, usedW: 0, remainingW: 0 };
    const requestedPowerW = Math.max(0, Math.round(num(c.plannedPowerW || c.requestedPowerW, 0)));
    let allowedPowerW = requestedPowerW;
    let limited = false;
    let blocked = false;
    if (b.budgetW > 0 && requestedPowerW > b.remainingW) {
      allowedPowerW = Math.max(0, b.remainingW);
      limited = allowedPowerW > 0;
      blocked = allowedPowerW <= 0;
    }
    b.usedW += allowedPowerW;
    b.remainingW = Math.max(0, b.budgetW - b.usedW);
    budgets.set(g.id, b);
    const fairness = { schema: 'nexowatt.mesh-target-group-fairness-command.v1', applied: true, groupId: g.id, groupName: g.name, requestedPowerW, allowedPowerW, budgetW: b.budgetW, usedW: b.usedW, remainingW: b.remainingW, limited, blocked, reason: blocked ? 'target_group_budget_exhausted' : (limited ? 'target_group_budget_limited' : 'within_target_group_budget'), directHardwareWrite: false, neutralCommandOnly: true };
    const out = { ...c, plannedPowerW: allowedPowerW, targetGroupFairness: fairness };
    if (limited) {
      out.limitedByTargetGroupFairness = true;
      limitedCommands.push({ commandId: out.commandId, nodeId: out.nodeId, targetNodeId: out.targetNodeId, groupId: g.id, requestedPowerW, allowedPowerW, reason: fairness.reason });
    }
    if (blocked) {
      out.blockedByTargetGroupFairness = true;
      out.allowed = false;
      out.blocked = true;
      const missing = Array.isArray(out.safetyMissing) ? out.safetyMissing.slice() : [];
      if (!missing.includes('target_group_fairness_blocked')) missing.push('target_group_fairness_blocked');
      out.safetyMissing = missing;
      out.reason = `Zielgruppen-Fairness blockiert Command: ${g.name || g.id} Budget ausgeschöpft.`;
      blockedCommands.push({ commandId: out.commandId, nodeId: out.nodeId, targetNodeId: out.targetNodeId, groupId: g.id, requestedPowerW, allowedPowerW, reason: out.reason });
    }
    return out;
  });
  const groupBudgets = Array.from(budgets.values()).map(b => ({ ...b, utilizationPercent: b.budgetW > 0 ? round((b.usedW / b.budgetW) * 100, 1) : 0 }));
  return { schema: 'nexowatt.mesh-target-group-fairness.v1', totalRequestedW, fairnessBudgetW, groups: groupBudgets, commands: fairnessCommands, limitedCommands, blockedCommands, limitedCount: limitedCommands.length, blockedCount: blockedCommands.length, activeBudgetCount: groupBudgets.filter(g => g.budgetW > 0).length, summary: groupBudgets.length ? `${groupBudgets.length} Zielgruppen-Fairness-Budget(s) berechnet.` : 'Keine Zielgruppen-Fairness aktiv.', directHardwareWrite: false, neutralCommandOnly: true };
}

function _meshPositiveLimits(values) {
  return (Array.isArray(values) ? values : [])
    .map(v => Math.max(0, Math.round(num(v, 0))))
    .filter(v => v > 0);
}

function _meshNodeLimitForCommand(node, command) {
  const n = node && typeof node === 'object' ? node : {};
  const cmd = command && typeof command === 'object' ? command : {};
  const dir = String(cmd.direction || '').toLowerCase();
  const cat = String(cmd.category || '').toLowerCase();
  const type = normalizeType(n.type || cmd.targetType || 'generic');
  const limits = [];
  const reasons = [];
  const add = (value, id) => {
    const v = Math.max(0, Math.round(num(value, 0)));
    if (v > 0) { limits.push(v); reasons.push({ id, limitW: v }); }
  };
  add(n.maxPowerW, 'node.maxPowerW');
  if (type === 'chargepoint' || dir.includes('charge')) add(n.maxChargeW || n.maxLoadW, 'node.maxChargeW/maxLoadW');
  if (type === 'storage' && (dir.includes('charge') || cat.includes('local_first'))) add(n.maxChargeW, 'node.maxChargeW');
  if (type === 'storage' && (dir.includes('discharge') || cat.includes('grid_last'))) add(n.maxDischargeW, 'node.maxDischargeW');
  if (type === 'consumer' || type === 'thermal' || dir.includes('load') || dir.includes('use')) add(n.maxLoadW, 'node.maxLoadW');
  if (type === 'producer' || dir.includes('export') || dir.includes('generation')) add(n.maxGenerationW || n.maxExportW, 'node.maxGenerationW/maxExportW');
  if (dir.includes('import')) add(n.maxImportW, 'node.maxImportW');
  if (dir.includes('export')) add(n.maxExportW, 'node.maxExportW');
  const minPowerW = Math.max(0, Math.round(num(n.minPowerW, 0)));
  const maxPowerW = limits.length ? Math.min(...limits) : 0;
  return { minPowerW, maxPowerW, reasons };
}

function _meshBridgeLimitForCommand(command, bridgeCfg) {
  const cfg = bridgeCfg && typeof bridgeCfg === 'object' ? bridgeCfg : normalizeLocalBridgeCfg({});
  const mapping = findLocalBridgeMappingForCommand(command, cfg.mappings || []);
  if (!mapping) return { mapping: null, minPowerW: 0, maxPowerW: 0, reasons: [] };
  const reasons = [];
  const maxPowerW = Math.max(0, Math.round(num(mapping.maxPowerW, 0)));
  const minPowerW = Math.max(0, Math.round(num(mapping.minPowerW, 0)));
  if (maxPowerW > 0) reasons.push({ id: `bridge.${mapping.id}.maxPowerW`, limitW: maxPowerW });
  if (minPowerW > 0) reasons.push({ id: `bridge.${mapping.id}.minPowerW`, limitW: minPowerW });
  return { mapping, minPowerW, maxPowerW, reasons };
}

function buildCommandLimitDiagnostics(commands, nodes, bridgeCfg, targetGroups) {
  const cmdList = Array.isArray(commands) ? commands : [];
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const nodeById = new Map(nodeList.map(n => [String(n && n.id || ''), n]));
  const limitedCommands = [];
  const blockedCommands = [];
  const enriched = cmdList.map(cmd => {
    const c = cmd && typeof cmd === 'object' ? cmd : {};
    const nodeId = String(c.nodeId || c.targetNodeId || '');
    const node = nodeById.get(nodeId) || nodeById.get(String(c.targetNodeId || '')) || null;
    const requestedPowerW = Math.max(0, Math.round(num(c.plannedPowerW, 0)));
    const nodeLimit = _meshNodeLimitForCommand(node, c);
    const bridgeLimit = _meshBridgeLimitForCommand(c, bridgeCfg);
    const groupLimit = _meshGroupLimitForCommand(targetGroups, node, c);
    const maxLimits = _meshPositiveLimits([nodeLimit.maxPowerW, bridgeLimit.maxPowerW, groupLimit.maxPowerW]);
    const minLimits = _meshPositiveLimits([nodeLimit.minPowerW, bridgeLimit.minPowerW, groupLimit.minPowerW]);
    const effectiveMaxPowerW = maxLimits.length ? Math.min(...maxLimits) : 0;
    const effectiveMinPowerW = minLimits.length ? Math.max(...minLimits) : 0;
    let allowedPowerW = requestedPowerW;
    const reasons = [];
    if (nodeLimit.reasons.length) reasons.push(...nodeLimit.reasons);
    if (bridgeLimit.reasons.length) reasons.push(...bridgeLimit.reasons);
    if (groupLimit.reasons.length) reasons.push(...groupLimit.reasons);
    let blockedByLimit = false;
    let limitedByLimit = false;
    if (effectiveMaxPowerW > 0 && requestedPowerW > effectiveMaxPowerW) {
      allowedPowerW = effectiveMaxPowerW;
      limitedByLimit = true;
    }
    if (allowedPowerW > 0 && effectiveMinPowerW > 0 && allowedPowerW < effectiveMinPowerW) {
      blockedByLimit = true;
      allowedPowerW = 0;
      reasons.push({ id: 'effectiveMinPowerW', limitW: effectiveMinPowerW });
    }
    if (requestedPowerW <= 0) blockedByLimit = true;
    const powerLimit = {
      schema: 'nexowatt.mesh-command-power-limit.v1',
      nodeId: node ? node.id : nodeId,
      nodeName: node ? node.name : '',
      requestedPowerW,
      allowedPowerW,
      effectiveMaxPowerW,
      effectiveMinPowerW,
      limitedByLimit,
      blockedByLimit,
      reasons,
      bridgeMappingId: bridgeLimit.mapping ? bridgeLimit.mapping.id : '',
      targetGroups: groupLimit.groups || [],
      directHardwareWrite: false,
      neutralCommandOnly: true,
    };
    const out = { ...c, requestedPowerW, plannedPowerW: allowedPowerW, powerLimit };
    if (limitedByLimit) {
      out.limitedByPowerLimit = true;
      out.limitReason = reasons.map(r => r.id).join(', ');
      limitedCommands.push({ commandId: out.commandId, nodeId: out.nodeId, targetNodeId: out.targetNodeId, requestedPowerW, allowedPowerW, reasons });
    }
    if (blockedByLimit) {
      out.blockedByPowerLimit = true;
      out.allowed = false;
      out.blocked = true;
      const missing = Array.isArray(out.safetyMissing) ? out.safetyMissing.slice() : [];
      if (!missing.includes('power_limit_blocked')) missing.push('power_limit_blocked');
      out.safetyMissing = missing;
      out.reason = `Leistungsgrenze blockiert Command: ${reasons.map(r => r.id).join(', ') || 'requestedPowerW=0'}.`;
      blockedCommands.push({ commandId: out.commandId, nodeId: out.nodeId, targetNodeId: out.targetNodeId, requestedPowerW, allowedPowerW, reasons, reason: out.reason });
    }
    return out;
  });
  const nodeLimits = nodeList.map(n => ({
    id: n.id, name: n.name, type: n.type, role: n.role,
    minPowerW: n.minPowerW || 0, maxPowerW: n.maxPowerW || 0,
    maxImportW: n.maxImportW || 0, maxExportW: n.maxExportW || 0,
    maxChargeW: n.maxChargeW || 0, maxDischargeW: n.maxDischargeW || 0,
    maxLoadW: n.maxLoadW || 0, maxGenerationW: n.maxGenerationW || 0,
  }));
  const bridgeTargets = (bridgeCfg && Array.isArray(bridgeCfg.mappings) ? bridgeCfg.mappings : []).map(m => ({ id: m.id, nodeId: m.nodeId, targetNodeId: m.targetNodeId, commandStateDp: m.commandStateDp, minPowerW: m.minPowerW || 0, maxPowerW: m.maxPowerW || 0 }));
  const fairnessPlan = buildTargetGroupFairnessPlan(targetGroups, nodeList, enriched);
  const fairnessCommands = fairnessPlan.commands || enriched;
  const allLimitedCommands = limitedCommands.concat(fairnessPlan.limitedCommands || []);
  const allBlockedCommands = blockedCommands.concat(fairnessPlan.blockedCommands || []);
  const targetGroupPlan = buildTargetGroupPlan(targetGroups, nodeList, fairnessCommands);
  targetGroupPlan.fairness = fairnessPlan;
  return {
    schema: 'nexowatt.mesh-power-limits.v2',
    commands: fairnessCommands,
    limitedCommands: allLimitedCommands,
    blockedCommands: allBlockedCommands,
    nodeLimits,
    bridgeTargets,
    targetGroups: targetGroupPlan.groups,
    targetGroupPriorityOrder: targetGroupPlan.priorityOrder,
    targetGroupSummary: targetGroupPlan,
    targetGroupFairness: fairnessPlan,
    limitedCount: allLimitedCommands.length,
    blockedCount: allBlockedCommands.length,
    activeLimitCount: nodeLimits.reduce((sum, n) => sum + ['minPowerW','maxPowerW','maxImportW','maxExportW','maxChargeW','maxDischargeW','maxLoadW','maxGenerationW'].filter(k => Number(n[k]) > 0).length, 0) + bridgeTargets.reduce((sum, t) => sum + (Number(t.minPowerW) > 0 ? 1 : 0) + (Number(t.maxPowerW) > 0 ? 1 : 0), 0) + targetGroupPlan.groups.reduce((sum, g) => sum + (Number(g.maxPowerW) > 0 ? 1 : 0) + (Number(g.minPowerW) > 0 ? 1 : 0) + Object.values(g.limits || {}).filter(v => Number(v) > 0).length, 0) + Number(fairnessPlan.activeBudgetCount || 0),
    lastReason: allBlockedCommands.length ? `${allBlockedCommands.length} Command(s) durch Leistungs-/Fairness-Grenzen blockiert.` : (allLimitedCommands.length ? `${allLimitedCommands.length} Command(s) durch Leistungs-/Fairness-Grenzen gekürzt.` : 'Keine Leistungs- oder Fairness-Grenze hat den aktuellen Command-Plan begrenzt.'),
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}

function buildCommandGuard(planning, nodes, cluster, controlCfg, tailscaleCfg, bridgeCfg, targetGroupCfg) {
  const actions = planning && Array.isArray(planning.actions) ? planning.actions : [];
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const gridLimit = planning && planning.gridLimit ? planning.gridLimit : {};
  const clusterId = cluster && cluster.clusterId ? cluster.clusterId : 'cluster_01';
  const mode = cluster && cluster.mode ? cluster.mode : 'diagnostic';
  const gridLimitW = Math.max(0, Math.round(num(cluster && cluster.gridLimitW, 0)));
  const control = normalizeCommandOutputCfg(controlCfg || {});
  const tailscale = normalizeTailscaleCfg(tailscaleCfg || {});
  const localBridgeCfg = normalizeLocalBridgeCfg(bridgeCfg || {});
  const targetGroups = normalizeTargetGroups(targetGroupCfg);
  const knownNodeIds = new Set(nodeList.map(n => String(n && n.id || '')));
  const priorityKnown = nodeList.length > 0 && nodeList.every(n => Number.isFinite(Number(n.priority)));
  const isFieldMode = control.controlMode === 'field_test';
  const isActiveMode = control.controlMode === 'active';
  const isCommandMode = isFieldMode || isActiveMode;
  const commandStateReady = !!control.commandStateDp;
  const tailscaleReady = tailscale.enabled === true && Array.isArray(tailscale.peerUrls) && tailscale.peerUrls.length > 0;
  const transportReady = commandStateReady || tailscaleReady;
  const installerApproved = control.fieldTestApproved === true;
  const commandOutputAllowed = isCommandMode && installerApproved && transportReady;

  const safetyChecks = [
    { id: 'license', ok: true, severity: 'info', message: 'EOS Mesh/Microgrid-App ist freigegeben.' },
    { id: 'control_mode', ok: isCommandMode, severity: isCommandMode ? 'info' : 'warn', message: isActiveMode ? 'Aktivmodus: Local-First-/Grid-Last-Command-Intents dürfen neutral ausgegeben werden.' : (isFieldMode ? 'Feldtest-Modus aktiv: neutrale Command-Intents dürfen ausgegeben werden.' : 'Aktiv-/Feldtest-Modus ist nicht aktiv; es werden nur Diagnosen veröffentlicht.') },
    { id: 'installer_approval', ok: installerApproved, severity: installerApproved ? 'info' : 'blocker', message: installerApproved ? 'Installateurfreigabe für Feld-/Aktivsteuerung liegt vor.' : 'Installateurfreigabe fehlt; Command-Ausgabe blockiert.' },
    { id: 'command_state', ok: commandStateReady, severity: commandStateReady || tailscaleReady ? 'info' : 'blocker', message: commandStateReady ? `Neutraler Command-State gesetzt: ${control.commandStateDp}` : (tailscaleReady ? 'Lokaler Command-State fehlt, aber Tailscale-Peer-Dispatch ist verfügbar.' : 'Kein neutraler Command-State und kein Tailscale-Peer-Dispatch hinterlegt.') },
    { id: 'direct_hardware_write', ok: true, severity: 'info', message: 'Direktes Hardware-Schreiben bleibt gesperrt; Ausgabe erfolgt nur als neutraler JSON-Intent.' },
    { id: 'tailscale_mesh', ok: tailscaleReady, severity: tailscaleReady ? 'info' : 'warn', message: tailscaleReady ? `Tailscale-Mesh-Profil aktiv: ${tailscale.profile}; ${tailscale.peerUrls.length} Peer-URL(s) für Command-Dispatch vorhanden.` : 'Tailscale-Mesh ist nicht aktiv oder keine Peer-URL hinterlegt; lokale Command-Ausgabe bleibt möglich.' },
    { id: 'grid_limit', ok: gridLimitW > 0 || String(gridLimit && gridLimit.severity || '') === 'off', severity: gridLimitW > 0 ? 'info' : 'warn', message: gridLimitW > 0 ? `Cluster-/Netzlimit ${gridLimitW} W ist vorhanden.` : 'Kein Cluster-/Netzlimit gesetzt; Feldtest sollte nur mit bewusst geprüfter Anlage erfolgen.' },
    { id: 'node_priority', ok: priorityKnown, severity: priorityKnown ? 'info' : 'warn', message: priorityKnown ? 'Knotenprioritäten sind vorhanden.' : 'Knotenprioritäten fehlen oder sind unvollständig.' },
    { id: 'target_groups', ok: true, severity: targetGroups.length ? 'info' : 'warn', message: targetGroups.length ? `${targetGroups.length} Zielgruppe(n) für Local-First-Verteilung konfiguriert.` : 'Keine Zielgruppen konfiguriert; Knotenprioritäten werden direkt genutzt.' },
  ];

  const allowedCommands = [];
  const blockedCommands = [];
  const plannedCommands = actions.map((a, idx) => {
    const nodeId = String(a && a.nodeId || '');
    const nodeKnown = !nodeId || knownNodeIds.has(nodeId);
    const missing = [];
    if (!nodeKnown) missing.push('unknown_node');
    if (a && a.severity === 'critical' && !gridLimitW) missing.push('missing_grid_limit');
    if (!commandOutputAllowed) missing.push('field_control_not_approved');
    const allowed = commandOutputAllowed && missing.length === 0 && Math.max(0, Math.round(num(a && a.plannedPowerW, 0))) > 0;
    const cmd = {
      schema: 'nexowatt.mesh-command-intent.v2',
      commandId: `mesh_cmd_${idx + 1}`,
      sourceActionId: a && a.actionId || '',
      clusterId,
      mode,
      category: a && a.category || 'observe',
      direction: a && a.direction || 'observe',
      nodeId,
      nodeName: a && a.nodeName || '',
      targetNodeId: a && a.targetNodeId || '',
      targetNodeName: a && a.targetNodeName || '',
      priority: a && a.priority || 999,
      plannedPowerW: Math.max(0, Math.round(num(a && a.plannedPowerW, 0))),
      transport: tailscale.enabled ? 'tailscale-mesh' : 'local-command-state',
      tailscaleProfile: tailscale.profile,
      commandStateDp: control.commandStateDp,
      safetyMissing: missing,
      allowed,
      blocked: !allowed,
      readOnly: false,
      executionMode: control.controlMode,
      activeControl: isActiveMode,
      fieldTest: isFieldMode,
      neutralCommandOnly: true,
      directHardwareWrite: false,
      hardwareWrite: false,
      reason: allowed
        ? (isActiveMode ? 'Aktivsteuerung freigegeben: neutraler NexoWatt-Command-Intent wird an Bridge/Peer ausgegeben.' : 'Feldtest freigegeben: neutraler NexoWatt-Command-Intent wird an den Command-State ausgegeben.')
        : `CommandGuard blockiert: ${missing.join(', ') || 'keine ausführbare Leistung'}.`,
    };
    (allowed ? allowedCommands : blockedCommands).push(cmd);
    return cmd;
  });

  const limitDiagnostics = buildCommandLimitDiagnostics(plannedCommands, nodeList, localBridgeCfg, targetGroups);
  allowedCommands.length = 0;
  blockedCommands.length = 0;
  for (const cmd of limitDiagnostics.commands) {
    if (cmd && cmd.allowed === true) allowedCommands.push(cmd);
    else blockedCommands.push(cmd);
  }

  const blockedActions = blockedCommands.map(cmd => ({ commandId: cmd.commandId, sourceActionId: cmd.sourceActionId, nodeId: cmd.nodeId, direction: cmd.direction, plannedPowerW: cmd.plannedPowerW, requestedPowerW: cmd.requestedPowerW || cmd.plannedPowerW, blocked: true, reason: cmd.reason, powerLimit: cmd.powerLimit || null }));
  const blockerCount = safetyChecks.filter(c => c.severity === 'blocker' && c.ok !== true).length + blockedActions.length;
  const warnCount = safetyChecks.filter(c => c.severity === 'warn' && c.ok !== true).length;
  return {
    schema: 'nexowatt.mesh-commandguard-field-control.v1',
    status: commandOutputAllowed ? (allowedCommands.length ? (isActiveMode ? 'active-output-ready' : 'field-output-ready') : (isActiveMode ? 'active-output-idle' : 'field-output-idle')) : 'blocked',
    mode,
    prepared: true,
    allowed: commandOutputAllowed && allowedCommands.length > 0,
    commandOutputAllowed,
    automaticActionsBlocked: !commandOutputAllowed,
    readOnly: false,
    neutralCommandOnly: true,
    directHardwareWrite: false,
    hardwareWrite: false,
    requiredLicense: 'EOS',
    requiredFeature: 'meshMicrogridControl',
    commandStateDp: control.commandStateDp,
    controlMode: control.controlMode,
    fieldTestApproved: installerApproved,
    activeControlApproved: installerApproved,
    activeControl: isActiveMode,
    fieldTest: isFieldMode,
    tailscale: { enabled: tailscale.enabled, profile: tailscale.profile, localNodeId: tailscale.localNodeId, peerCount: tailscale.peerUrls.length },
    safetyChecks,
    plannedCommands: limitDiagnostics.commands,
    limitDiagnostics,
    targetGroups: limitDiagnostics.targetGroupSummary || buildTargetGroupPlan(targetGroups, nodeList, limitDiagnostics.commands || []),
    allowedCommands,
    blockedActions,
    blockerCount,
    warnCount,
    reason: commandOutputAllowed
      ? `${allowedCommands.length} Command-Intent(s) für ${isActiveMode ? 'aktive Local-First-Ausgabe' : 'Feldtest-Ausgabe'} bereit; direkte Hardware-Schreibpfade bleiben gesperrt.`
      : 'Mesh/Microgrid Feldsteuerung ist blockiert, bis Feldtest-Modus, Installateurfreigabe und mindestens ein neutraler Transportweg gesetzt sind.',
  };
}



/**
 * Klassifiziert Peer-/Receiver-Probleme für den Feldtest.
 *
 * Warum diese Funktion wichtig ist:
 * Im Feldtest mit zwei NexoWatt-Instanzen müssen Installateure schnell sehen,
 * ob ein Fehler durch Token, Cluster-ID, Receiver-Freigabe, Timeout oder eine
 * normale HTTP-/Netzwerkstörung entsteht. Diese Klassifizierung ist reine
 * Diagnose und erzeugt keine Steuerentscheidung und keinen Hardwarewrite.
 */
function classifyPeerFieldTestIssue(peer) {
  const p = peer && typeof peer === 'object' ? peer : {};
  const errors = Array.isArray(p.errors) ? p.errors.map(e => String(e || '').toLowerCase()) : [];
  const text = [p.error, p.lastError, p.commandStatus, p.ackStatus, ...errors].filter(Boolean).join(' ').toLowerCase();
  const ack = p.commandAck && typeof p.commandAck === 'object' ? p.commandAck : null;
  const ackError = ack ? String(ack.error || ack.status || ack.message || '').toLowerCase() : '';
  const hay = `${text} ${ackError}`;
  if (p.ok === true || (p.handshakeOk === true && p.statusOk === true && (p.commandAckOk === true || p.commandAckOk === undefined))) return 'ok';
  if (hay.includes('token') || hay.includes('401') || hay.includes('mesh_token_invalid')) return 'token';
  if (hay.includes('cluster') || hay.includes('cluster_mismatch')) return 'cluster';
  if (hay.includes('receiver') || hay.includes('423') || hay.includes('receiver_disabled')) return 'receiver';
  if (hay.includes('timeout') || hay.includes('abort') || hay.includes('timed out')) return 'timeout';
  if (hay.includes('replay') || hay.includes('duplicate')) return 'replay';
  if (p.handshakeOk === false) return 'handshake';
  if (p.statusOk === false) return 'status';
  if (p.commandAckOk === false) return 'command';
  return 'unknown';
}

/**
 * Ampel für Roundtrip-Zeiten im Mesh-Tailscale.
 * Die Schwellen sind bewusst konservativ: Das Mesh darf für Steuerentscheidungen
 * nicht nur funktional erreichbar sein, sondern auch nachvollziehbar schnell
 * reagieren. Die Ausgabe ist Diagnose; sie schaltet nichts.
 */
function classifyRoundtripStatus(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return 'unknown';
  if (n <= 500) return 'green';
  if (n <= 1500) return 'yellow';
  return 'red';
}

function buildRemoteNodeMatrixFromPeers(peerMatrix) {
  const rows = [];
  for (const p of Array.isArray(peerMatrix) ? peerMatrix : []) {
    const peerId = p.id || safeId(p.url || 'peer', 'peer');
    const status = p.status && typeof p.status === 'object' ? p.status : null;
    const mesh = status && status.mesh && typeof status.mesh === 'object' ? status.mesh : null;
    const nodes = mesh && Array.isArray(mesh.nodes) ? mesh.nodes : [];
    for (const n of nodes) {
      rows.push({
        schema: 'nexowatt.mesh-remote-node-matrix-row.v1',
        peerId,
        peerUrl: p.url || '',
        nodeId: n.id || '',
        nodeName: n.name || n.id || '',
        type: n.type || '',
        role: n.role || '',
        status: n.status || '',
        priority: n.priority || '',
        surplusW: Math.max(0, Math.round(num(n.surplusW, 0))),
        demandW: Math.max(0, Math.round(num(n.demandW, 0))),
        errorClass: p.errorClass || classifyPeerFieldTestIssue(p),
        roundtripStatus: p.roundtripStatus || classifyRoundtripStatus(Math.max(num(p.pollMs, 0), num(p.commandMs, 0), num(p.ms, 0))),
      });
    }
  }
  return rows;
}

/**
 * 0.8.42 Feldtest-Diagnose für zwei NexoWatt-Instanzen.
 *
 * Zweck:
 * - Der Betreiber/Installateur soll im Feld sofort sehen, ob zwei Instanzen über
 *   das getrennte Mesh-Tailscale sauber verbunden sind.
 * - Die Diagnose fasst Peer-Polling, Remote-Knoten, CommandGuard, letzte lokale
 *   Command-Ausgabe und letzte ACKs der Remote-Receiver zusammen.
 * - Sie erzeugt keine zusätzliche Regelung und keine Hardware-Schreibpfade. Die
 *   echte Geräteumsetzung bleibt weiterhin bei lokalen Bridges/Herstelleradaptern.
 */


/**
 * 0.8.43 Peer-Härtung: Fehler werden bewusst in klare Klassen normalisiert.
 * Dadurch kann der Installateur im Feld sofort unterscheiden, ob ein Problem
 * an Token, Cluster-ID, Receiver, Timeout, HTTP/API oder am lokalen Netzwerk
 * liegt. Die Klassifizierung ist reine Diagnose und erzeugt keine Steuerung.
 */
function classifyPeerError(input) {
  const status = String((input && (input.status || input.error || input.message)) || '').toLowerCase();
  const http = Number(input && (input.httpStatus || input.statusCode || input.http));
  const text = `${status} ${String((input && input.error) || '')} ${String((input && input.message) || '')}`.toLowerCase();
  if (http === 401 || text.includes('token') || text.includes('mesh_token_invalid')) return 'token';
  if (http === 409 || text.includes('cluster') || text.includes('cluster_mismatch')) return 'cluster';
  if (http === 423 || text.includes('receiver_disabled') || text.includes('receiver')) return 'receiver';
  if (text.includes('timeout') || text.includes('abort') || text.includes('timed')) return 'timeout';
  if (http >= 500 || text.includes('internal_error')) return 'remote-api';
  if (text.includes('fetch') || text.includes('network') || text.includes('enotfound') || text.includes('econn')) return 'network';
  if (http >= 400) return 'http';
  if (!status && !text.trim()) return 'none';
  return 'unknown';
}

/**
 * 0.8.43 Peer-Roundtrip-Ampel. Sie dient nur als Betreiberdiagnose für das
 * separate Mesh-Tailscale und hat bewusst keine Wirkung auf Hardwareausgänge.
 */
function peerRoundtripStatus(ms, ok) {
  if (!ok) return 'offline';
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return 'unknown';
  if (n <= 500) return 'green';
  if (n <= 2000) return 'yellow';
  return 'red';
}

function buildRemoteNodeMatrix(remoteNodes, peers) {
  const list = Array.isArray(remoteNodes) ? remoteNodes : [];
  const peerRows = Array.isArray(peers) ? peers : [];
  return list.map((n, idx) => {
    const peer = peerRows.find(p => String(p.id || p.url || '') === String(n.peerId || n.sourcePeer || '')) || null;
    return {
      schema: 'nexowatt.mesh-remote-node-matrix-row.v1',
      index: idx + 1,
      peerId: n.peerId || n.sourcePeer || (peer && (peer.id || peer.url)) || '',
      peerUrl: peer && peer.url || '',
      nodeId: n.id || n.nodeId || '',
      name: n.name || n.id || '',
      type: n.type || '',
      role: n.role || '',
      status: n.status || '',
      surplusW: Math.max(0, Math.round(num(n.surplusW, 0))),
      demandW: Math.max(0, Math.round(num(n.demandW, 0))),
      priority: n.priority || 999,
      remote: true,
      tailscaleProfile: n.tailscaleProfile || (peer && peer.tailscaleProfile) || '',
    };
  });
}

function buildAllowedPeerDiagnostics(receiverCfg) {
  const r = receiverCfg || {};
  const raw = Array.isArray(r.allowedPeerNodeIds) ? r.allowedPeerNodeIds.join(',') : String(r.allowedPeerNodeIds || r.allowedPeers || '');
  const allowed = raw.split(/[\n,;]+/g).map(x => safeId(x.trim(), '')).filter(Boolean);
  return {
    schema: 'nexowatt.mesh-allowed-peer-diagnostics.v1',
    allowListEnabled: allowed.length > 0,
    allowedPeerNodeIds: allowed,
    message: allowed.length ? `Nur ${allowed.length} Peer-Node-ID(s) erlaubt.` : 'Keine Peer-Allowlist gesetzt; Token und Cluster-ID bleiben die Hauptprüfung.',
  };
}



function parseAllowedPeerNodeIds(receiverCfg) {
  const diag = buildAllowedPeerDiagnostics(receiverCfg || {});
  return Array.isArray(diag.allowedPeerNodeIds) ? diag.allowedPeerNodeIds : [];
}

function classifyPeerIssue(peer) {
  const c = classifyPeerFieldTestIssue(peer);
  if (c && c !== 'unknown') return c;
  return classifyPeerError(peer);
}

function roundtripLevel(ms, ok) {
  return peerRoundtripStatus(ms, ok);
}

function buildTwoInstanceFieldTestDiagnostics(input) {
  const tailscale = input && input.tailscale ? input.tailscale : {};
  const poll = input && input.poll ? input.poll : {};
  const dispatch = input && input.dispatch ? input.dispatch : {};
  const guard = input && input.guard ? input.guard : {};
  const receiver = input && input.receiver ? input.receiver : {};
  const commandHistory = Array.isArray(input && input.commandHistory) ? input.commandHistory : [];
  const peers = Array.isArray(poll.peers) ? poll.peers : [];
  const dispatchPeers = Array.isArray(dispatch.peers) ? dispatch.peers : [];
  const allowedPeerNodeIds = parseAllowedPeerNodeIds(receiver);
  const peerMatrix = peers.map((p) => {
    const d = dispatchPeers.find(x => String(x.url || '') === String(p.url || '')) || null;
    const ack = d && d.ack && typeof d.ack === 'object' ? d.ack : null;
    const roundtripMs = Math.max(Number(p.ms || 0), d ? Number(d.ms || 0) : 0);
    const baseRow = {
      schema: 'nexowatt.mesh-peer-fieldtest-row.v2',
      id: p.id || safeId(p.url || 'peer', 'peer'),
      url: p.url || '',
      pollOk: p.ok === true,
      pollStatus: p.status || 'unknown',
      nodeCount: Number(p.nodeCount || 0),
      pollMs: Number(p.ms || 0),
      commandOk: d ? d.ok === true : false,
      commandStatus: d ? (d.status || 'unknown') : 'not-sent',
      commandMs: d ? Number(d.ms || 0) : 0,
      ackStatus: ack ? (ack.status || '') : '',
      acceptedCount: ack ? Number(ack.acceptedCount || 0) : 0,
      replayBlockedCount: ack ? Number(ack.replayBlockedCount || 0) : 0,
      lastError: p.ok === true ? (d && (d.error || (d.ack && d.ack.error) || '') || '') : (p.error || ''),
      errors: Array.isArray(p.errors) ? p.errors : [],
      allowedPeerNodeIds,
      allowedPeerConfigured: allowedPeerNodeIds.length > 0,
      senderNodeId: ack ? (ack.senderNodeId || '') : '',
      receiverNodeId: ack ? (ack.receiverNodeId || '') : '',
      clusterId: ack ? (ack.clusterId || '') : '',
      roundtripMs,
    };
    baseRow.errorClass = classifyPeerIssue(baseRow);
    baseRow.roundtripLevel = roundtripLevel(roundtripMs, baseRow.pollOk || baseRow.commandOk);
    baseRow.allowedPeerMatch = !allowedPeerNodeIds.length || !baseRow.senderNodeId || allowedPeerNodeIds.includes(safeId(baseRow.senderNodeId, ''));
    baseRow.operatorHint = baseRow.errorClass === 'ok'
      ? 'Peer erreichbar.'
      : (baseRow.errorClass === 'token' ? 'Token auf beiden Mesh-Instanzen prüfen.'
        : baseRow.errorClass === 'cluster' ? 'Cluster-ID beider Instanzen prüfen.'
        : baseRow.errorClass === 'receiver' ? 'Command Receiver, Remote-Command-Freigabe und lokalen Receiver-Command-State prüfen.'
        : baseRow.errorClass === 'timeout' ? 'Tailscale-Mesh-IP/Route, Firewall und Port prüfen.'
        : 'Peer-Details im Feldtest/ACK prüfen.');
    return baseRow;
  });
  const errorClassCounts = peerMatrix.reduce((acc, row) => { acc[row.errorClass || 'unknown'] = (acc[row.errorClass || 'unknown'] || 0) + 1; return acc; }, {});
  const peerOnlineCount = peerMatrix.filter(p => p.pollOk).length;
  const peerCommandOkCount = peerMatrix.filter(p => p.commandOk).length;
  const remoteNodeCount = Number(poll.remoteNodeCount || 0);
  const remoteNodeMatrix = buildRemoteNodeMatrixFromPeers(peerMatrix);
  const commandsAllowed = guard.commandOutputAllowed === true;
  const receiverReady = receiver.enabled === true && receiver.acceptRemoteCommands === true && !!receiver.localCommandStateDp;
  const tailscaleReady = tailscale.enabled === true && peers.length > 0;
  const twoInstanceReady = tailscaleReady && peerOnlineCount > 0 && receiverReady;
  const fieldCommandReady = twoInstanceReady && commandsAllowed;
  const warnings = [];
  if (!tailscale.enabled) warnings.push('Tailscale Mesh ist deaktiviert.');
  if (tailscale.enabled && !peers.length) warnings.push('Keine Peer-URLs für das Mesh-Tailscale hinterlegt.');
  if (peers.length && peerOnlineCount <= 0) warnings.push('Keine Peer-Instanz erreichbar.');
  if (!receiverReady) warnings.push('Command Receiver ist lokal noch nicht vollständig freigegeben oder kein lokaler Receiver-Command-State gesetzt.');
  if (!commandsAllowed) warnings.push('CommandGuard gibt aktuell keine Feldtest-Commands frei.');
  if (errorClassCounts.token) warnings.push('Mindestens ein Peer meldet Token-Fehler.');
  if (errorClassCounts.cluster) warnings.push('Mindestens ein Peer meldet Cluster-ID-Konflikt.');
  if (errorClassCounts.receiver) warnings.push('Mindestens ein Peer meldet Receiver-/Command-State-Problem.');
  if (errorClassCounts.timeout) warnings.push('Mindestens ein Peer ist über das Mesh-Tailscale nicht rechtzeitig erreichbar.');
  const maxRoundtripMs = peerMatrix.reduce((max, p) => Math.max(max, Number(p.roundtripMs || p.pollMs || 0), Number(p.commandMs || 0)), 0);
  const roundtripLevelValue = roundtripLevel(maxRoundtripMs, peerOnlineCount > 0);
  const status = fieldCommandReady ? 'fieldtest-ready' : (twoInstanceReady ? 'peer-ready-command-blocked' : 'not-ready');
  const lastHistory = commandHistory.length ? commandHistory[0] : null;
  return {
    schema: 'nexowatt.mesh-two-instance-fieldtest.v2',
    ts: Date.now(),
    status,
    twoInstanceReady,
    fieldCommandReady,
    tailscaleReady,
    receiverReady,
    peerOnlineCount,
    peerCommandOkCount,
    peerCount: peers.length,
    remoteNodeCount,
    peerMatrix,
    remoteNodeMatrix,
    errorClassCounts,
    roundtripStatus: roundtripLevelValue,
    allowedPeerNodeIds,
    allowedPeerConfigured: allowedPeerNodeIds.length > 0,
    warnings,
    lastRoundtripMs: maxRoundtripMs,
    lastCommandHistory: lastHistory || {},
    commandHistory: commandHistory.slice(0, 20),
    reason: warnings.length ? warnings.join(' ') : 'Zwei-Instanzen-Feldtest ist bereit; direkte Hardware-Schreibpfade bleiben weiterhin gesperrt.',
    directHardwareWrite: false,
    neutralCommandOnly: true,
  };
}

class MeshMicrogridModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._lastConfigHash = '';
    this._lastPublishTs = 0;
    this._lastCommandHash = '';
    this._lastCommandWriteTs = 0;
    this._lastCommandResult = null;
    this._remoteSnapshots = [];
    this._lastTailscalePoll = null;
    this._lastPeerCommandDispatch = null;
    this._commandHistory = [];
    this._peerHistory = [];
    this._lastFieldTest = null;
    this._lastLocalBridgeAck = null;
    this._lastManualReleaseSummary = buildManualReleaseSummary([], Date.now());
    this._lastTargetCommandHistory = buildTargetCommandHistory([]);
  }

  _cfg() {
    const cfg = this.adapter && this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
    return cfg.meshMicrogrid && typeof cfg.meshMicrogrid === 'object' ? cfg.meshMicrogrid : {};
  }

  _enabled() {
    const cfg = this._cfg();
    return cfg.enabled === true;
  }

  _mode() {
    const cfg = this._cfg();
    const m = String(cfg.mode || 'diagnostic').trim().toLowerCase();
    return ['off', 'diagnostic', 'local_first', 'grid_last'].includes(m) ? m : 'diagnostic';
  }

  _nodes() {
    return normalizeNodes(this._cfg().nodes);
  }

  async init() {
    await this._ensureStates();
    await this._registerDatapoints();
    await this._publishDisabledOrInit('init');
  }

  async _registerDatapoints() {
    if (!this.dp || typeof this.dp.upsert !== 'function') return;
    const nodes = this._nodes();
    for (const node of nodes) {
      const prefix = `mesh.${node.id}`;
      const entries = [
        ['powerW', node.powerDp, 'W'],
        ['surplusW', node.surplusPowerDp, 'W'],
        ['demandW', node.demandPowerDp, 'W'],
        ['socPct', node.socDp, '%'],
        ['gridImportW', node.gridImportPowerDp, 'W'],
        ['gridExportW', node.gridExportPowerDp, 'W'],
      ];
      for (const [key, objectId, unit] of entries) {
        if (!objectId) continue;
        await this.dp.upsert({
          key: `${prefix}.${key}`,
          objectId,
          dataType: 'number',
          direction: 'in',
          unit,
          useAliveForStale: true,
        });
      }
    }
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    const ch = async (id, name) => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await ch('meshMicrogrid', 'EOS Mesh/Microgrid');
    await ch('meshMicrogrid.cluster', 'Mesh/Microgrid Cluster');
    await ch('meshMicrogrid.power', 'Mesh/Microgrid Leistung');
    await ch('meshMicrogrid.intent', 'Mesh/Microgrid Energy Intent');
    await ch('meshMicrogrid.diagnostics', 'Mesh/Microgrid Diagnose');
    await ch('meshMicrogrid.export', 'Mesh/Microgrid Export');
    await ch('meshMicrogrid.operator', 'Mesh/Microgrid Betreiberansicht');
    await ch('meshMicrogrid.planning', 'Mesh/Microgrid geplante Entscheidungen');
    await ch('meshMicrogrid.commandGuard', 'Mesh/Microgrid CommandGuard / Feldsteuerung');
    await ch('meshMicrogrid.fieldControl', 'Mesh/Microgrid Feldsteuerung');
    await ch('meshMicrogrid.tailscale', 'Mesh/Microgrid Tailscale-Netz');
    await ch('meshMicrogrid.receiver', 'Mesh/Microgrid Command Receiver');
    await ch('meshMicrogrid.fieldTest', 'Mesh/Microgrid Zwei-Instanzen Feldtest');
    await ch('meshMicrogrid.peerHardening', 'Mesh/Microgrid Peer-Härtung');
    await ch('meshMicrogrid.localBridge', 'Mesh/Microgrid lokale Bridge-Zuordnung');

    await mk('meshMicrogrid.enabled', 'Mesh/Microgrid App aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.version', 'Mesh/Microgrid Schema', 'string', 'text', '', MODULE_VERSION);
    await mk('meshMicrogrid.status', 'Mesh/Microgrid Status', 'string', 'text', '', 'init');
    await mk('meshMicrogrid.mode', 'Mesh/Microgrid Modus', 'string', 'text', '', 'diagnostic');
    await mk('meshMicrogrid.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.legalNote', 'Hinweis', 'string', 'text', '', 'Read-only Datenmodell; keine Hardwaresteuerung.');

    await mk('meshMicrogrid.cluster.id', 'Cluster-ID', 'string', 'text', '', 'cluster_01');
    await mk('meshMicrogrid.cluster.name', 'Cluster-Name', 'string', 'text', '', 'Lokaler Energieverbund');
    await mk('meshMicrogrid.cluster.gridLimitW', 'Netzanschluss-/Clusterlimit', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.cluster.nodeCount', 'Knoten gesamt', 'number', 'value', '', 0);
    await mk('meshMicrogrid.cluster.activeNodeCount', 'Knoten aktiv', 'number', 'value', '', 0);
    await mk('meshMicrogrid.cluster.localFirstEnabled', 'Local First vorbereitet', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.cluster.gridLastEnabled', 'Grid Last vorbereitet', 'boolean', 'indicator', '', true);

    await mk('meshMicrogrid.power.generationW', 'Lokale Erzeugung/Verfügbarkeit', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.loadW', 'Lokale Last/Nachfrage', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.storageChargeW', 'Speicher Ladebedarf', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.storageDischargeW', 'Speicher Entladeleistung', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridImportW', 'Netzbezug im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridExportW', 'Einspeisung im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.surplusW', 'Überschuss im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.demandW', 'Restbedarf im Cluster', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.localUsePotentialW', 'Lokales Nutzungspotenzial', 'number', 'value.power', 'W', 0);
    await mk('meshMicrogrid.power.gridLimitUsagePercent', 'Netzlimit-Auslastung', 'number', 'value.percent', '%', 0);

    await mk('meshMicrogrid.nodesJson', 'Mesh-Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.topologyJson', 'Mesh-Topologie JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.summaryJson', 'Mesh/Microgrid Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.intent.nodesJson', 'Energy Intents je Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.intent.clusterJson', 'Energy Intent Cluster JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.lastDecisionJson', 'Letzte read-only Entscheidung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.diagnostics.warning', 'Mesh/Microgrid Warnung', 'string', 'text', '', '');
    await mk('meshMicrogrid.diagnostics.missingMappingsJson', 'Fehlende Knoten-Mappings JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.diagnostics.readOnly', 'Read-only Modul', 'boolean', 'indicator', '', true);

    // 0.8.35 Betreiberansicht/Export: Diese States sind bewusst nur Links und
    // Snapshots auf dieselbe Modulwahrheit. Es wird keine zweite Mesh-Logik,
    // kein zweiter Cluster-Rechner und keine Steuerung aufgebaut.
    await mk('meshMicrogrid.export.schema', 'Mesh/Microgrid Export-Schema', 'string', 'text', '', 'nexowatt.mesh-microgrid-export.v1');
    await mk('meshMicrogrid.export.ready', 'Mesh/Microgrid Export bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.export.jsonUrl', 'Mesh/Microgrid JSON Export URL', 'string', 'text', '', '/api/mesh/microgrid');
    await mk('meshMicrogrid.export.csvUrl', 'Mesh/Microgrid CSV Export URL', 'string', 'text', '', '/api/mesh/microgrid.csv');
    await mk('meshMicrogrid.export.snapshotJson', 'Mesh/Microgrid Snapshot JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.operator.viewUrl', 'Mesh/Microgrid Betreiberansicht URL', 'string', 'text', '', '/mesh/microgrid');

    // 0.8.36 Regelbasis im Diagnosemodus: Die folgenden States zeigen geplante
    // Local-First-/Grid-Last-Entscheidungen an. Sie sind absichtlich read-only
    // und dürfen nicht als Hardware-Write-Plan missverstanden werden.
    await mk('meshMicrogrid.planning.actionsJson', 'Geplante Entscheidungen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.planning.localFirstActionsJson', 'Local-First Aktionen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.planning.gridLastActionsJson', 'Grid-Last Aktionen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.planning.gridLimitActionsJson', 'Netzlimit Aktionen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.planning.priorityOrderJson', 'Prioritätsreihenfolge JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.planning.gridLimitDiagnosticsJson', 'Netzlimit-Diagnose JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.planning.actionCount', 'Anzahl geplanter Entscheidungen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.planning.criticalActionCount', 'Kritische geplante Entscheidungen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.planning.readinessScorePercent', 'Regelbasis Bereitschaft', 'number', 'value.percent', '%', 100);
    await mk('meshMicrogrid.planning.readOnly', 'Planung ist read-only', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.planning.summaryJson', 'Planungszusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.planning.lastReason', 'Letzte Planungsbegründung', 'string', 'text', '', '');

    // 0.8.39 CommandGuard-Vorbereitung: Sicherheitsdiagnose für spätere
    // Freigaben. Diese States bleiben read-only und sind keine Produktivsteuerung.
    await mk('meshMicrogrid.commandGuard.schema', 'CommandGuard Schema', 'string', 'text', '', 'nexowatt.mesh-commandguard-prep.v1');
    await mk('meshMicrogrid.commandGuard.status', 'CommandGuard Status', 'string', 'text', '', 'blocked-readonly');
    await mk('meshMicrogrid.commandGuard.prepared', 'CommandGuard vorbereitet', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.commandGuard.allowed', 'CommandGuard Ausführung erlaubt', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.commandGuard.automaticActionsBlocked', 'Automatische Aktionen blockiert', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.commandGuard.readOnly', 'CommandGuard read-only', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.commandGuard.hardwareWrite', 'Hardware-Schreiben aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.commandGuard.requiredLicense', 'Benötigte Lizenz', 'string', 'text', '', 'EOS');
    await mk('meshMicrogrid.commandGuard.requiredFeature', 'Benötigtes Feature', 'string', 'text', '', 'meshMicrogridControl');
    await mk('meshMicrogrid.commandGuard.reason', 'CommandGuard Sperrgrund', 'string', 'text', '', 'Automatische Ausführung ist noch gesperrt.');
    await mk('meshMicrogrid.commandGuard.safetyChecksJson', 'CommandGuard Safety-Checks JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.commandGuard.plannedCommandsJson', 'Geplante Command-Intents JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.commandGuard.blockedActionsJson', 'Blockierte Aktionen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.commandGuard.blockerCount', 'CommandGuard Blocker', 'number', 'value', '', 0);
    await mk('meshMicrogrid.commandGuard.warnCount', 'CommandGuard Warnungen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.commandGuard.summaryJson', 'CommandGuard Zusammenfassung JSON', 'string', 'json', '', '{}');

    // 0.8.48 Leistungsgrenzen: Knoten- und Bridge-Ziellimits werden nur gegen
    // neutrale Mesh-Command-Intents geprüft. Es entstehen keine direkten
    // Hardware-/Protokoll-Schreibbefehle.
    await ch('meshMicrogrid.limits', 'Mesh/Microgrid Leistungsgrenzen');
    await mk('meshMicrogrid.limits.nodesJson', 'Knoten-Leistungsgrenzen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.limits.bridgeTargetsJson', 'Bridge-Ziel-Leistungsgrenzen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.limits.limitedCommandsJson', 'Leistungsbegrenzte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.limits.blockedCommandsJson', 'Durch Leistungsgrenzen blockierte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.limits.summaryJson', 'Leistungsgrenzen Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.limits.activeLimitCount', 'Aktive Leistungsgrenzen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.limits.limitedCount', 'Gekürzte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.limits.blockedCount', 'Blockierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.limits.lastReason', 'Letzter Leistungsgrenzen-Grund', 'string', 'text', '', '');

    // 0.8.49 Zielgruppenstrategie: Gruppen bündeln Ladepunkte, Speicher,
    // Verbraucher und Erzeuger. Auch diese Grenzen wirken nur auf neutrale
    // Command-Intents und erzeugen keinen direkten Hardwarepfad.
    await ch('meshMicrogrid.targetGroups', 'Mesh/Microgrid Zielgruppen');
    await mk('meshMicrogrid.targetGroups.groupsJson', 'Zielgruppen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.targetGroups.priorityOrderJson', 'Zielgruppen Prioritäten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.targetGroups.summaryJson', 'Zielgruppen Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.targetGroups.groupCount', 'Zielgruppen Anzahl', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.activeGroupCount', 'Aktive Zielgruppen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.limitedCommandCount', 'Durch Zielgruppen begrenzte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.blockedCommandCount', 'Durch Zielgruppen blockierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.fairnessJson', 'Zielgruppen-Fairness JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.targetGroups.fairnessBudgetsJson', 'Zielgruppen-Fairness Budgets JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.targetGroups.fairnessLimitedCommandsJson', 'Durch Fairness gekürzte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.targetGroups.fairnessBlockedCommandsJson', 'Durch Fairness blockierte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.targetGroups.fairnessLimitedCount', 'Durch Fairness gekürzte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.fairnessBlockedCount', 'Durch Fairness blockierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.targetGroups.lastReason', 'Letzter Zielgruppen-Grund', 'string', 'text', '', '');

    // 0.8.40 Feldsteuerung: Diese States machen die Ausgabe neutraler Command-
    // Intents sichtbar. Wichtig: Auch im Feldmodus schreibt NexoWatt hier keine
    // Hardwaredatenpunkte direkt, sondern nur den konfigurierten JSON-Command-State.
    await mk('meshMicrogrid.fieldControl.enabled', 'Feldsteuerung aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.fieldControl.mode', 'Feldsteuerungsmodus', 'string', 'text', '', 'diagnostic');
    await mk('meshMicrogrid.fieldControl.installerApproved', 'Installateurfreigabe', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.fieldControl.commandStateDp', 'Neutraler Command-State', 'string', 'text', '', '');
    await mk('meshMicrogrid.fieldControl.lastCommandAt', 'Letzte Command-Ausgabe', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.fieldControl.lastCommandJson', 'Letzter Command-Envelope JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldControl.lastWriteStatus', 'Letzter Write-Status', 'string', 'text', '', 'idle');
    await mk('meshMicrogrid.fieldControl.lastWriteError', 'Letzter Write-Fehler', 'string', 'text', '', '');
    await mk('meshMicrogrid.fieldControl.outputCount', 'Ausgegebene Command-Intents', 'number', 'value', '', 0);

    // Separates Tailscale-Profil für Mesh/Microgrid. Fernwartungs-Tailscale und
    // Mesh-Tailscale werden fachlich getrennt behandelt; der Adapter erwartet nur
    // die über dieses Profil erreichbaren Peer-URLs und koppelt sich nicht an die
    // Tailscale-Daemon-Implementierung.
    await mk('meshMicrogrid.tailscale.enabled', 'Tailscale Mesh aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.tailscale.profile', 'Tailscale Profil', 'string', 'text', '', 'mesh-microgrid');
    await mk('meshMicrogrid.tailscale.localNodeId', 'Lokale Mesh-Node-ID', 'string', 'text', '', 'local');
    await mk('meshMicrogrid.tailscale.peerCount', 'Peer Anzahl', 'number', 'value', '', 0);
    await mk('meshMicrogrid.tailscale.remoteNodeCount', 'Remote-Knoten', 'number', 'value', '', 0);
    await mk('meshMicrogrid.tailscale.lastPollAt', 'Letzter Peer-Poll', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.tailscale.lastPollStatus', 'Letzter Peer-Poll Status', 'string', 'text', '', 'idle');
    await mk('meshMicrogrid.tailscale.peersJson', 'Tailscale Peers JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.tailscale.remoteNodesJson', 'Remote-Knoten JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.tailscale.lastPollJson', 'Letzter Peer-Poll JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.tailscale.lastCommandDispatchJson', 'Letzter Peer-Command-Dispatch JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.tailscale.lastCommandDispatchStatus', 'Letzter Peer-Command-Dispatch Status', 'string', 'text', '', 'idle');

    // 0.8.41 Command-Receiver: Remote-Kommandos aus dem separaten Mesh-Tailscale
    // werden ausschließlich nach Token-/Cluster-/Replay-Prüfung angenommen und
    // als neutraler JSON-Command-State bereitgestellt. Keine direkte Hardwaresteuerung.
    await mk('meshMicrogrid.receiver.enabled', 'Command Receiver aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.receiver.acceptRemoteCommands', 'Remote Commands akzeptieren', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.receiver.localCommandStateDp', 'Lokaler Empfangs-Command-State', 'string', 'text', '', '');
    await mk('meshMicrogrid.receiver.peerTokenSet', 'Receiver Token gesetzt', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.receiver.requireClusterMatch', 'Cluster-ID prüfen', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.receiver.status', 'Receiver Status', 'string', 'text', '', 'disabled');
    await mk('meshMicrogrid.receiver.lastReceiveAt', 'Letzter Empfang', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.receiver.lastCommandId', 'Letzte Command-ID', 'string', 'text', '', '');
    await mk('meshMicrogrid.receiver.lastCommandJson', 'Letzter empfangener Command JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.receiver.lastAckJson', 'Letztes ACK JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.receiver.lastRejectReason', 'Letzter Reject-Grund', 'string', 'text', '', '');
    await mk('meshMicrogrid.receiver.receivedCount', 'Empfangene Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.receiver.acceptedCount', 'Akzeptierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.receiver.rejectedCount', 'Abgelehnte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.receiver.replayBlockedCount', 'Replay-blockierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.receiver.processedCommandIdsJson', 'Verarbeitete Command-IDs JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.receiver.lastLocalWriteStatus', 'Letzter lokaler Write-Status', 'string', 'text', '', 'idle');
    await mk('meshMicrogrid.receiver.lastLocalWriteError', 'Letzter lokaler Write-Fehler', 'string', 'text', '', '');
    await mk('meshMicrogrid.receiver.summaryJson', 'Command Receiver Zusammenfassung JSON', 'string', 'json', '', '{}');

    // 0.8.42 Zwei-Instanzen-Feldtest: Diese States zeigen, ob zwei
    // NexoWatt-Instanzen über das separate Mesh-Tailscale wirklich miteinander
    // sprechen, Commands quittieren und Remote-Knoten liefern. Auch diese Ebene
    // bleibt eine Diagnose-/Transportebene; Geräte werden nur über lokale Bridges
    // hinter den neutralen Command-States gesteuert.
    await mk('meshMicrogrid.fieldTest.status', 'Zwei-Instanzen Feldtest Status', 'string', 'text', '', 'not-ready');
    await mk('meshMicrogrid.fieldTest.twoInstanceReady', 'Zwei Instanzen verbunden', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.fieldTest.fieldCommandReady', 'Feld-Command bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.fieldTest.peerOnlineCount', 'Online Peers', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.peerCommandOkCount', 'Peers mit Command-ACK', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.remoteNodeCount', 'Remote-Knoten im Feldtest', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.lastRoundtripMs', 'Letzte Peer-Roundtripzeit', 'number', 'value.interval', 'ms', 0);
    await mk('meshMicrogrid.fieldTest.peerMatrixJson', 'Peer-Matrix JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.commandHistoryJson', 'Command-Verlauf JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.lastAckJson', 'Letztes Peer-ACK JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.lastManualTestJson', 'Letzter manueller Zwei-Instanzen-Test JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.summaryJson', 'Feldtest Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.warning', 'Feldtest Warnung', 'string', 'text', '', '');
    // 0.8.43 Peer-Härtung: Verlauf, Fehlerklassen, Roundtrip-Ampel und Remote-Matrix
    // bleiben Diagnosewerte. Sie steuern keine Hardware und dienen dem Feldtest über
    // das separate Mesh-Tailscale.
    await mk('meshMicrogrid.fieldTest.peerHistoryJson', 'Peer-Verlauf JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.errorClassesJson', 'Peer-Fehlerklassen JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.roundtripStatus', 'Peer-Roundtrip-Ampel', 'string', 'text', '', 'unknown');
    await mk('meshMicrogrid.fieldTest.remoteNodeMatrixJson', 'Remote-Node-Matrix JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.allowedPeersDiagnosticJson', 'Erlaubte Peer-Diagnose JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.peerHistoryJson', 'Peer-Feldtest Verlauf JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.errorClassesJson', 'Peer Fehlerklassen JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.fieldTest.remoteNodeMatrixJson', 'Remote-Node Matrix JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.fieldTest.roundtripStatus', 'Roundtrip Ampel', 'string', 'text', '', 'unknown');
    await mk('meshMicrogrid.fieldTest.tokenErrorCount', 'Token-Fehler', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.clusterMismatchCount', 'Cluster-ID Fehler', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.receiverErrorCount', 'Receiver-Fehler', 'number', 'value', '', 0);
    await mk('meshMicrogrid.fieldTest.timeoutCount', 'Timeouts', 'number', 'value', '', 0);
    await mk('meshMicrogrid.peerHardening.summaryJson', 'Peer-Härtung Zusammenfassung JSON', 'string', 'json', '', '{}');

    // 0.8.44 Lokale Bridge-Zuordnung: verbindet neutrale Mesh-Commands mit
    // lokalen Ziel-Command-States. Das sind weiterhin keine Rohdatenpunktwrites
    // auf Geräte, sondern JSON-Intents für lokale Bridges/Herstelleradapter.
    await mk('meshMicrogrid.localBridge.enabled', 'Lokale Bridge-Zuordnung aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.outputMode', 'Lokale Bridge Ausgabemodus', 'string', 'text', '', 'global');
    await mk('meshMicrogrid.localBridge.defaultCommandStateDp', 'Default Bridge Command-State', 'string', 'text', '', '');
    await mk('meshMicrogrid.localBridge.mappingCount', 'Bridge-Zuordnungen', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.mappedCommandCount', 'Gemappte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.unmappedCommandCount', 'Ungemappte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.routeReady', 'Lokale Bridge Route bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.mappingsJson', 'Bridge-Zuordnungen JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.mappedCommandsJson', 'Gemappte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.unmappedCommandsJson', 'Ungemappte Commands JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.lastWriteAt', 'Letzter Bridge-Write', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.localBridge.lastWriteStatus', 'Letzter Bridge-Write Status', 'string', 'text', '', 'idle');
    await mk('meshMicrogrid.localBridge.lastWriteError', 'Letzter Bridge-Write Fehler', 'string', 'text', '', '');
    await mk('meshMicrogrid.localBridge.lastWritesJson', 'Letzte Bridge-Writes JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.ackEnabled', 'Bridge ACK-Auswertung aktiv', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.ackRequired', 'Bridge ACK als Gate erforderlich', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.ackGateStatus', 'Bridge ACK-Gate Status', 'string', 'text', '', 'disabled');
    await mk('meshMicrogrid.localBridge.ackGateBlockedCommandCount', 'Bridge ACK-Gate blockierte Commands', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackBlockedTargetsJson', 'Bridge ACK-Gate blockierte Ziele JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.targetHealthJson', 'Bridge Ziel-Ampel JSON', 'string', 'json', '', '[]');
    // 0.8.47 Wiederfreigabe/Verlauf je Ziel: Diese States sind reine
    // Diagnose-/Bedienzustände für die lokale Bridge. Sie schalten keine
    // Hardware und ersetzen keine ACK-/Status-Datenpunkte.
    await mk('meshMicrogrid.localBridge.manualReleaseEnabled', 'Manuelle Bridge-Ziel-Freigabe aktiv', 'boolean', 'indicator', '', true);
    await mk('meshMicrogrid.localBridge.manualReleaseJson', 'Manuelle Bridge-Ziel-Freigaben JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.manualReleaseSummaryJson', 'Manuelle Freigabe Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.localBridge.lastManualReleaseAt', 'Letzte manuelle Ziel-Freigabe', 'number', 'value.time', '', 0);
    await mk('meshMicrogrid.localBridge.lastManualReleaseResultJson', 'Letzte manuelle Freigabe Ergebnis JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.localBridge.manualReleaseCount', 'Aktive manuelle Ziel-Freigaben', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.targetCommandHistoryJson', 'Bridge Command-Verlauf je Ziel JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.localBridge.targetCommandHistoryCount', 'Bridge-Ziele mit Verlauf', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.releaseReady', 'Bridge Wiederfreigabe bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.ackTimeoutSec', 'Bridge ACK Timeout Sekunden', 'number', 'value.interval', 's', 60);
    await mk('meshMicrogrid.localBridge.ackStatus', 'Bridge ACK Status', 'string', 'text', '', 'disabled');
    await mk('meshMicrogrid.localBridge.ackReady', 'Bridge ACK bereit', 'boolean', 'indicator', '', false);
    await mk('meshMicrogrid.localBridge.ackOkCount', 'Bridge ACK ok', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackPendingCount', 'Bridge ACK wartend', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackErrorCount', 'Bridge ACK Fehler', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackTimeoutCount', 'Bridge ACK Timeout', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackMissingCount', 'Bridge ACK fehlend', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackStaleCount', 'Bridge ACK veraltet', 'number', 'value', '', 0);
    await mk('meshMicrogrid.localBridge.ackTargetsJson', 'Bridge Zielstatus JSON', 'string', 'json', '', '[]');
    await mk('meshMicrogrid.localBridge.ackSummaryJson', 'Bridge ACK Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('meshMicrogrid.localBridge.summaryJson', 'Lokale Bridge Zusammenfassung JSON', 'string', 'json', '', '{}');
  }

  _getNumber(key, fallback = null) {
    try {
      if (this.dp && typeof this.dp.getNumber === 'function') return this.dp.getNumber(key, fallback);
    } catch (_e) {}
    return fallback;
  }

  _commandOutputCfg() {
    return normalizeCommandOutputCfg(this._cfg());
  }

  _tailscaleCfg() {
    return normalizeTailscaleCfg(this._cfg());
  }

  _receiverCfg() {
    return normalizeReceiverCfg(this._cfg());
  }

  _localBridgeCfg() {
    return normalizeLocalBridgeCfg(this._cfg());
  }

  _targetGroups() {
    return normalizeTargetGroups(this._cfg().targetGroups);
  }

  async _stateJson(id, fallback) {
    const a = this.adapter;
    try {
      let st = null;
      if (a && typeof a.getStateAsync === 'function') st = await a.getStateAsync(id);
      if (!st && a && typeof a.getForeignStateAsync === 'function') st = await a.getForeignStateAsync(`${a.namespace}.${id}`);
      const raw = st && st.val;
      if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
      if (raw && typeof raw === 'object') return raw;
    } catch (_e) {}
    return fallback;
  }

  async _readManualReleaseSummary() {
    const cfg = this._localBridgeCfg();
    const raw = await this._stateJson('meshMicrogrid.localBridge.manualReleaseJson', []);
    const summary = buildManualReleaseSummary(cfg.manualReleaseEnabled === false ? [] : raw, Date.now());
    summary.enabled = cfg.manualReleaseEnabled !== false;
    summary.ttlSec = cfg.manualReleaseTtlSec || 300;
    this._lastManualReleaseSummary = summary;
    return summary;
  }

  _normalPeerUrl(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const withProto = /^https?:\/\//i.test(s) ? s : `http://${s}`;
    return withProto.replace(/\/+$/g, '');
  }

  /**
   * Holt Remote-Snapshots über das getrennte Tailscale-Mesh-Netz.
   * Der Adapter startet oder verwaltet Tailscale nicht selbst; er nutzt nur die
   * über das zweite, für Mesh/Microgrid gedachte Tailnet erreichbaren Peer-URLs.
   * Dadurch bleiben Fernwartung und Energieverbund fachlich getrennt.
   */
  async _pollTailscalePeers() {
    const cfg = this._tailscaleCfg();
    const now = Date.now();
    if (!cfg.enabled || !cfg.peerUrls.length || typeof fetch !== 'function') {
      this._remoteSnapshots = [];
      this._lastTailscalePoll = { ts: now, status: cfg.enabled ? 'no-peers' : 'disabled', peers: [], remoteNodeCount: 0, profile: cfg.profile };
      return;
    }
    const peers = [];
    const remoteNodes = [];
    for (const urlRaw of cfg.peerUrls) {
      const base = this._normalPeerUrl(urlRaw);
      if (!base) continue;
      const peerId = safeId(base.replace(/^https?:\/\//i, '').replace(/[:\/]+/g, '_'), 'peer');
      const endpoint = `${base}/api/mesh/microgrid`;
      const started = Date.now();
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_e) {} }, cfg.timeoutMs) : null;
      try {
        const headers = cfg.peerToken ? { 'x-nexowatt-mesh-token': cfg.peerToken } : {};
        const res = await fetch(endpoint, { cache: 'no-store', headers, signal: ctrl ? ctrl.signal : undefined });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload || payload.ok === false) throw new Error((payload && payload.message) || `HTTP ${res.status}`);
        const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
        for (const n of nodes) {
          const remoteId = safeId(`${peerId}_${n && n.id || 'node'}`, `${peerId}_node`);
          remoteNodes.push({
            ...(n || {}),
            id: remoteId,
            originalNodeId: n && n.id || '',
            name: `${payload.cluster && payload.cluster.name ? payload.cluster.name : peerId}: ${n && (n.name || n.id) || 'Remote-Knoten'}`,
            peerId,
            remote: true,
            source: 'tailscale-mesh-peer',
            tailscaleProfile: cfg.profile,
            intent: n && n.intent ? { ...n.intent, remote: true, peerId, tailscaleProfile: cfg.profile } : undefined,
          });
        }
        peers.push({ id: peerId, url: base, ok: true, status: 'ok', nodeCount: nodes.length, ms: Date.now() - started });
      } catch (e) {
        peers.push({ id: peerId, url: base, ok: false, status: 'error', error: String(e && e.message ? e.message : e), ms: Date.now() - started });
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    this._remoteSnapshots = remoteNodes;
    this._lastTailscalePoll = { schema: 'nexowatt.tailscale-mesh-poll.v1', ts: now, status: peers.some(p => p.ok) ? 'ok' : 'error', profile: cfg.profile, localNodeId: cfg.localNodeId, peers, remoteNodeCount: remoteNodes.length };
  }

  _remoteNodeSnapshots() {
    return Array.isArray(this._remoteSnapshots) ? this._remoteSnapshots.slice() : [];
  }

  _buildFieldCommandEnvelope(snap, commandGuard) {
    const control = this._commandOutputCfg();
    const tailscale = this._tailscaleCfg();
    const commands = commandGuard && Array.isArray(commandGuard.allowedCommands) ? commandGuard.allowedCommands.slice(0, control.maxCommandsPerTick) : [];
    return {
      schema: 'nexowatt.mesh-field-command-envelope.v1',
      version: MODULE_VERSION,
      ts: Date.now(),
      source: 'nexowatt-ui.meshMicrogrid',
      executionMode: control.controlMode,
      activeControl: control.controlMode === 'active',
      fieldTest: control.controlMode === 'field_test',
      clusterId: snap && snap.clusterId || 'cluster_01',
      clusterName: snap && snap.clusterName || '',
      transport: tailscale.enabled ? 'tailscale-mesh' : 'local-command-state',
      tailscaleProfile: tailscale.profile,
      localNodeId: tailscale.localNodeId,
      commandStateDp: control.commandStateDp,
      directHardwareWrite: false,
      neutralCommandOnly: true,
      commands,
      localBridge: snap && snap.localBridge || {},
      totals: snap && snap.totals || {},
      gridLimit: snap && snap.planning && snap.planning.gridLimit || {},
      reason: commandGuard && commandGuard.reason || '',
      note: 'NexoWatt Mesh/Microgrid gibt nur neutrale Intents aus; lokale Bridges/Peers setzen diese hersteller- und protokollspezifisch um.',
    };
  }

  /**
   * Sendet freigegebene Feldtest-Kommandos optional an konfigurierte Peer-Receiver.
   * Die Zielinstanz prüft das Token, Cluster und Replay selbst erneut. Dieser
   * Sender schreibt weiterhin keine Hardware; er überträgt nur den neutralen
   * Command-Envelope über das separate Mesh-Tailscale-Netz.
   */
  async _sendFieldCommandsToPeers(envelope) {
    const cfg = this._tailscaleCfg();
    const now = Date.now();
    if (!cfg.enabled || !cfg.peerUrls.length || !envelope || !Array.isArray(envelope.commands) || !envelope.commands.length || typeof fetch !== 'function') {
      this._lastPeerCommandDispatch = { ts: now, status: cfg.enabled ? 'no-peer-dispatch' : 'disabled', peers: [], commandCount: envelope && Array.isArray(envelope.commands) ? envelope.commands.length : 0 };
      return this._lastPeerCommandDispatch;
    }
    const peers = [];
    for (const urlRaw of cfg.peerUrls) {
      const base = this._normalPeerUrl(urlRaw);
      if (!base) continue;
      const endpoint = `${base}/api/mesh/command/receive`;
      const started = Date.now();
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_e) {} }, cfg.timeoutMs) : null;
      try {
        const headers = { 'content-type': 'application/json' };
        if (cfg.peerToken) headers['x-nexowatt-mesh-token'] = cfg.peerToken;
        const res = await fetch(endpoint, { method: 'POST', cache: 'no-store', headers, body: JSON.stringify(envelope), signal: ctrl ? ctrl.signal : undefined });
        const ack = await res.json().catch(() => null);
        peers.push({ url: base, endpoint, ok: res.ok && (!ack || ack.ok !== false), status: ack && ack.status || `http_${res.status}`, httpStatus: res.status, ack, ms: Date.now() - started });
      } catch (e) {
        peers.push({ url: base, endpoint, ok: false, status: 'error', error: String(e && e.message ? e.message : e), ms: Date.now() - started });
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    for (const p of peers) { this._rememberPeerHistory({ source: 'command-dispatch', url: p.url, ok: p.ok === true, status: p.status || '', httpStatus: p.httpStatus || 0, ms: p.ms || 0, error: p.error || '', ackStatus: p.ack && p.ack.status || '' }); }
    const hardenedPeers = peers.map(p => ({ ...p, errorClass: classifyPeerError(p), roundtripStatus: peerRoundtripStatus(Number(p.ms || 0), p.ok === true) }));
    this._lastPeerCommandDispatch = { schema: 'nexowatt.mesh-peer-command-dispatch.v1', ts: now, status: hardenedPeers.some(p => p.ok) ? 'ok' : 'error', profile: cfg.profile, localNodeId: cfg.localNodeId, commandCount: envelope.commands.length, peers: hardenedPeers };
    return this._lastPeerCommandDispatch;
  }


  _rememberCommandHistory(entry) {
    const item = { schema: 'nexowatt.mesh-command-history-row.v1', ts: Date.now(), ...(entry || {}) };
    this._commandHistory = [item].concat(Array.isArray(this._commandHistory) ? this._commandHistory : []).slice(0, 50);
    return item;
  }

  _rememberPeerHistory(entry) {
    const item = { schema: 'nexowatt.mesh-peer-history-row.v1', ts: Date.now(), errorClass: classifyPeerError(entry || {}), roundtripStatus: peerRoundtripStatus(Number(entry && entry.ms || 0), entry && entry.ok === true), ...(entry || {}) };
    this._peerHistory = [item].concat(Array.isArray(this._peerHistory) ? this._peerHistory : []).slice(0, 100);
    return item;
  }


  /**
   * Schreibt gemappte Local-Bridge-Commands in die vom Installateur angegebenen
   * Ziel-Command-States. Diese Methode existiert bewusst als eigener, klarer
   * Codepfad: Der globale Mesh-Envelope, der Peer-Dispatch und die lokale
   * Bridge-Zuordnung bleiben getrennt prüfbar. Auch hier gilt: Es werden nur
   * neutrale JSON-Intents geschrieben, keine OCPP-/Modbus-/MQTT-/Herstellerwerte.
   */
  async _writeLocalBridgeCommands(envelope, localBridge, control, ackGate) {
    const a = this.adapter;
    const bridgeWrites = [];
    const commands = localBridge && Array.isArray(localBridge.mappedCommands) ? localBridge.mappedCommands : [];
    if (!a || !localBridge || localBridge.enabled !== true || !commands.length) return bridgeWrites;
    const gate = ackGate && typeof ackGate === 'object' ? ackGate : buildBridgeAckGate(localBridge, this._lastLocalBridgeAck || buildBridgeAckSummary([]));
    const blockedByMapping = new Map();
    for (const b of Array.isArray(gate.blockedMappings) ? gate.blockedMappings : []) {
      if (!b) continue;
      if (b.mappingId) blockedByMapping.set(String(b.mappingId), b);
      if (b.commandStateDp && !blockedByMapping.has(String(b.commandStateDp))) blockedByMapping.set(String(b.commandStateDp), b);
    }

    const byState = new Map();
    for (const cmd of commands) {
      const dp = String(cmd.commandStateDp || '').trim();
      if (!dp) continue;
      const gateBlock = blockedByMapping.get(String(cmd.mappingId || '')) || blockedByMapping.get(dp) || null;
      if (gateBlock) {
        // 0.8.46: Wenn ACK als Gate gefordert ist, blockieren wir Folge-Commands
        // gezielt für dieses Bridge-Ziel. Es wird kein leerer/alter Command-State
        // überschrieben. Der lokale Herstelleradapter behält damit seinen letzten
        // sicheren Zustand, bis ein gültiges ACK/Statussignal vorliegt.
        bridgeWrites.push({
          commandStateDp: dp,
          status: 'blocked-by-ack-gate',
          commandCount: 1,
          commandId: cmd.commandId || '',
          mappingId: cmd.mappingId || '',
          reason: gateBlock.reason || 'ack_gate_blocked',
          ackStatus: gateBlock.ackStatus || '',
          targetStatusClass: gateBlock.targetStatusClass || '',
          directHardwareWrite: false,
          neutralCommandOnly: true,
        });
        continue;
      }
      if (!byState.has(dp)) byState.set(dp, []);
      byState.get(dp).push(cmd);
    }
    for (const [dp, commandList] of byState.entries()) {
      const bridgeEnvelope = {
        schema: 'nexowatt.mesh-local-bridge-envelope.v1',
        version: MODULE_VERSION,
        ts: Date.now(),
        source: 'nexowatt-ui.meshMicrogrid.localBridge',
        executionMode: control && control.controlMode || 'diagnostic',
        clusterId: envelope && envelope.clusterId || '',
        transport: 'local-bridge-command-state',
        commandStateDp: dp,
        directHardwareWrite: false,
        neutralCommandOnly: true,
        commands: commandList,
        originalEnvelopeCommandCount: Array.isArray(envelope && envelope.commands) ? envelope.commands.length : 0,
        note: 'Lokale Bridge-Zuordnung: dieser JSON-State muss von einer lokalen Bridge/Herstellerintegration umgesetzt werden.',
      };
      try {
        const json = JSON.stringify(bridgeEnvelope);
        let bridgeWriteResult = null;
        if (typeof a.setForeignStateAsync === 'function') bridgeWriteResult = await a.setForeignStateAsync(dp, { val: json, ack: false });
        else if (typeof a.setStateAsync === 'function') await a.setStateAsync(dp, { val: json, ack: false });
        if (isActuatorAuthorityBlockedResult(bridgeWriteResult)) {
          bridgeWrites.push({ commandStateDp: dp, status: 'blocked-by-actuator-authority', commandCount: commandList.length, ts: Date.now(), mappingIds: commandList.map(c => c.mappingId).filter(Boolean), commandIds: commandList.map(c => c.commandId).filter(Boolean), blockedByOwner: String(bridgeWriteResult.blockedByOwner || '') });
        } else {
          bridgeWrites.push({ commandStateDp: dp, status: 'written', commandCount: commandList.length, ts: Date.now(), mappingIds: commandList.map(c => c.mappingId).filter(Boolean), commandIds: commandList.map(c => c.commandId).filter(Boolean) });
        }
      } catch (e) {
        bridgeWrites.push({ commandStateDp: dp, status: 'error', commandCount: commandList.length, ts: Date.now(), mappingIds: commandList.map(c => c.mappingId).filter(Boolean), commandIds: commandList.map(c => c.commandId).filter(Boolean), error: String(e && e.message ? e.message : e) });
      }
    }
    return bridgeWrites;
  }

  /**
   * Liest ACK-/Status-Rückmeldungen der lokalen Bridge-Ziele.
   *
   * Produktregel:
   * - Diese Methode liest ausschließlich vom Installateur angegebene ACK- oder
   *   Status-States und klassifiziert deren Wert.
   * - Sie schreibt keine Gerätewerte und ändert keine Mesh-Entscheidung.
   * - Dadurch ist im Feld sichtbar, ob ein neutraler Command von der lokalen
   *   Bridge angenommen, blockiert, noch bearbeitet oder nicht quittiert wurde.
   */
  async _evaluateLocalBridgeAck(localBridge, bridgeWrites) {
    const a = this.adapter;
    const cfg = this._localBridgeCfg();
    const now = Date.now();
    const enabled = cfg.enabled === true && cfg.ackEnabled === true;
    const timeoutSec = Math.max(5, Math.round(num(cfg.ackTimeoutSec, 60)) || 60);
    const writes = Array.isArray(bridgeWrites) ? bridgeWrites : [];
    const targets = [];
    const mappings = Array.isArray(cfg.mappings) ? cfg.mappings : [];
    for (const mapping of mappings) {
      const m = mapping && typeof mapping === 'object' ? mapping : {};
      const ackDp = String(m.ackStateDp || '').trim();
      const statusDp = String(m.statusStateDp || '').trim();
      const write = writes.find(w => w && ((Array.isArray(w.mappingIds) && w.mappingIds.includes(m.id)) || (w.commandStateDp && w.commandStateDp === m.commandStateDp))) || null;
      const target = {
        schema: 'nexowatt.mesh-local-bridge-target-ack.v1',
        mappingId: m.id || '',
        label: m.label || m.id || '',
        nodeId: m.nodeId || '',
        targetNodeId: m.targetNodeId || '',
        commandStateDp: m.commandStateDp || '',
        ackStateDp: ackDp,
        statusStateDp: statusDp,
        onlineStateDp: m.onlineStateDp || '',
        errorStateDp: m.errorStateDp || '',
        lastWriteAt: Number(write && write.ts || 0),
        lastCommandIds: Array.isArray(write && write.commandIds) ? write.commandIds : [],
        status: enabled ? 'pending' : 'disabled',
        severity: enabled ? 'warn' : 'info',
        ok: false,
        ageSec: null,
        message: enabled ? 'ACK-Auswertung wartet auf Rückmeldung.' : 'ACK-Auswertung deaktiviert.',
        rawValue: null,
      };
      if (!enabled) {
        targets.push(target);
        continue;
      }
      const readDp = ackDp || statusDp;
      if (!readDp) {
        target.status = 'missing_ack_mapping';
        target.severity = 'warn';
        target.message = 'Kein ACK-/Status-State für dieses Bridge-Ziel konfiguriert.';
        targets.push(target);
        continue;
      }
      try {
        let st = null;
        if (a && typeof a.getForeignStateAsync === 'function') st = await a.getForeignStateAsync(readDp);
        else if (a && typeof a.getStateAsync === 'function') st = await a.getStateAsync(readDp);
        if (!st) {
          target.status = 'missing_state';
          target.severity = 'warn';
          target.message = `ACK-/Status-State nicht lesbar: ${readDp}`;
          targets.push(target);
          continue;
        }
        target.rawValue = st.val;
        target.lastAckTs = Number(st.ts || st.lc || 0) || 0;
        target.ageSec = target.lastAckTs ? Math.max(0, Math.round((now - target.lastAckTs) / 1000)) : null;
        const writeTs = Number(target.lastWriteAt || 0);
        const ackTs = Number(target.lastAckTs || 0);
        if (writeTs > 0 && ackTs > 0 && ackTs < writeTs) {
          const waitSec = Math.round((now - writeTs) / 1000);
          if (waitSec > timeoutSec) {
            target.status = 'timeout';
            target.severity = 'critical';
            target.message = `Kein neues ACK innerhalb von ${timeoutSec}s nach letztem Command.`;
          } else {
            target.status = 'waiting_for_new_ack';
            target.severity = 'warn';
            target.message = `Command geschrieben; ACK noch nicht aktualisiert (${waitSec}s).`;
          }
          targets.push(target);
          continue;
        }
        const classified = classifyLocalBridgeAck(st.val);
        target.status = classified.status;
        target.severity = classified.severity;
        target.ok = classified.ok === true;
        target.message = classified.label;
        if (target.ageSec !== null && target.ageSec > timeoutSec && classified.status !== 'ok') {
          target.status = 'stale';
          target.severity = 'warn';
          target.message = `ACK-/Statuswert älter als ${timeoutSec}s.`;
        }
      } catch (e) {
        target.status = 'read_error';
        target.severity = 'critical';
        target.message = String(e && e.message ? e.message : e);
      }
      targets.push(target);
    }
    const counts = targets.reduce((acc, t) => {
      const st = String(t.status || 'unknown');
      acc[st] = (acc[st] || 0) + 1;
      if (t.ok) acc.ok = (acc.ok || 0) + 1;
      if (t.severity === 'critical') acc.error = (acc.error || 0) + 1;
      if (st === 'pending' || st === 'waiting_for_new_ack') acc.pending = (acc.pending || 0) + 1;
      if (st === 'timeout') acc.timeout = (acc.timeout || 0) + 1;
      if (st === 'missing_ack_mapping' || st === 'missing_state') acc.missing = (acc.missing || 0) + 1;
      if (st === 'stale') acc.stale = (acc.stale || 0) + 1;
      return acc;
    }, { ok: 0, pending: 0, error: 0, timeout: 0, missing: 0, stale: 0 });
    const summary = {
      schema: 'nexowatt.mesh-local-bridge-ack-summary.v1',
      ts: now,
      enabled,
      timeoutSec,
      targetCount: targets.length,
      okCount: counts.ok || 0,
      pendingCount: counts.pending || 0,
      errorCount: counts.error || 0,
      timeoutCount: counts.timeout || 0,
      missingCount: counts.missing || 0,
      staleCount: counts.stale || 0,
      ready: enabled && targets.length > 0 && !(counts.error || counts.timeout || counts.missing),
      status: !enabled ? 'disabled' : (!targets.length ? 'no-targets' : ((counts.error || counts.timeout) ? 'error' : ((counts.pending || counts.missing || counts.stale) ? 'warn' : 'ok'))),
      reason: !enabled ? 'Bridge-ACK-Auswertung deaktiviert.' : (targets.length ? 'Bridge-ACK/Zielstatus ausgewertet.' : 'Keine Bridge-Ziele für ACK-Auswertung vorhanden.'),
      targets,
      directHardwareWrite: false,
      neutralCommandOnly: true,
    };
    this._lastLocalBridgeAck = summary;
    return summary;
  }

  /**
   * Gibt freigegebene Feldtest-Kommandos als neutralen JSON-State aus.
   * Dieser Pfad ist die reale Feldtest-Ausgabe für die Mesh/Microgrid-App, aber
   * bewusst kein direkter Hardwarepfad. OCPP, Modbus, MQTT, REST oder ein zweites
   * NexoWatt-EMS im Tailscale-Mesh können diesen JSON-State nachgelagert umsetzen.
   */
  async _writeFieldCommands(snap) {
    const a = this.adapter;
    const control = this._commandOutputCfg();
    const tailscale = this._tailscaleCfg();
    const bridgeCfg = this._localBridgeCfg();
    const guard = snap && snap.commandGuard ? snap.commandGuard : {};
    const localBridge = snap && snap.localBridge ? snap.localBridge : buildLocalBridgePlan(guard, bridgeCfg);
    const manualRelease = await this._readManualReleaseSummary();
    const ackGate = buildBridgeAckGate(localBridge, (snap && snap.localBridgeAck) || this._lastLocalBridgeAck || buildBridgeAckSummary([]), manualRelease);
    // 0.8.46: ACK-Gate hängt am Bridge-Plan, damit Betreiberansicht, JSON-API
    // und Schreibpfad dieselbe Quelle verwenden. Es wird nichts doppelt gezählt
    // und kein zweiter CommandGuard aufgebaut.
    localBridge.ackGate = ackGate;
    const allowed = guard && guard.commandOutputAllowed === true && Array.isArray(guard.allowedCommands) && guard.allowedCommands.length > 0;
    const hasGlobalCommandState = !!control.commandStateDp && bridgeCfg.outputMode !== 'mapped';
    const hasMappedBridge = bridgeCfg.enabled === true && ['mapped', 'both'].includes(bridgeCfg.outputMode) && Array.isArray(localBridge.mappedCommands) && localBridge.mappedCommands.length > 0;
    const hasPeerDispatch = tailscale.enabled === true && Array.isArray(tailscale.peerUrls) && tailscale.peerUrls.length > 0;
    if (!a || !allowed || (!hasGlobalCommandState && !hasMappedBridge && !hasPeerDispatch)) {
      this._lastCommandResult = { ts: Date.now(), status: allowed ? 'missing-neutral-transport' : 'blocked', commandCount: 0, localBridge, peerDispatch: this._lastPeerCommandDispatch || null };
      return;
    }
    const envelope = this._buildFieldCommandEnvelope(snap, guard);
    const hash = JSON.stringify(envelope.commands || []) + '|' + control.commandStateDp + '|' + JSON.stringify(tailscale.peerUrls || []) + '|' + JSON.stringify(localBridge.mappedCommands || []) + '|' + JSON.stringify(ackGate.blockedMappings || []) + '|' + bridgeCfg.outputMode;
    if (hash === this._lastCommandHash) {
      this._lastCommandResult = { ts: Date.now(), status: 'unchanged', commandCount: envelope.commands.length, commandStateDp: control.commandStateDp, localBridge, peerDispatch: this._lastPeerCommandDispatch || null };
      return;
    }

    let localStatus = hasGlobalCommandState ? 'pending' : 'skipped-no-global-command-state';
    let localError = '';
    try {
      const json = JSON.stringify(envelope);
      if (hasGlobalCommandState) {
        if (typeof a.setForeignStateAsync === 'function') {
          const localWriteResult = await a.setForeignStateAsync(control.commandStateDp, { val: json, ack: false });
          if (isActuatorAuthorityBlockedResult(localWriteResult)) {
            localStatus = 'blocked-by-actuator-authority';
            localError = String(localWriteResult.blockedByOwner || '');
          } else {
            localStatus = 'written';
          }
        } else if (typeof a.setStateAsync === 'function') {
          await a.setStateAsync(control.commandStateDp, { val: json, ack: false });
          localStatus = 'written';
        }
      }
    } catch (e) {
      localStatus = 'error';
      localError = String(e && e.message ? e.message : e);
    }

    // 0.8.44 lokale Bridge-Zuordnung: gezielt je lokalem Knoten ausgeben.
    const bridgeWrites = hasMappedBridge ? await this._writeLocalBridgeCommands(envelope, localBridge, control, ackGate) : [];

    const peerDispatch = await this._sendFieldCommandsToPeers(envelope);
    const bridgeWriteErrors = bridgeWrites.filter(w => w.status === 'error');
    const bridgeAckBlocks = bridgeWrites.filter(w => w.status === 'blocked-by-ack-gate');
    const bridgeAuthorityBlocks = bridgeWrites.filter(w => w.status === 'blocked-by-actuator-authority');
    const anyAuthorityBlock = localStatus === 'blocked-by-actuator-authority' || bridgeAuthorityBlocks.length > 0;
    const anySuccessfulLocalWrite = localStatus === 'written' || bridgeWrites.some(w => w.status === 'written');
    const effectiveStatus = localStatus === 'error' || bridgeWriteErrors.length
      ? 'error'
      : (anyAuthorityBlock
        ? (anySuccessfulLocalWrite ? 'partial-blocked-by-actuator-authority' : 'blocked-by-actuator-authority')
        : (bridgeAckBlocks.length && !bridgeWrites.some(w => w.status === 'written') ? 'blocked-by-ack-gate' : 'written'));
    // Ein vom zentralen Gate abgewiesener Command wird nicht gecacht. Dadurch kann
    // derselbe unveraenderte Intent nach Aufhebung der Sperre im naechsten Tick erneut
    // geschrieben werden, statt faelschlich als "unchanged" zu verschwinden.
    if (!anyAuthorityBlock && effectiveStatus !== 'error') this._lastCommandHash = hash;
    this._lastCommandWriteTs = Date.now();
    const historyRow = this._rememberCommandHistory({ status: effectiveStatus, localStatus, localError, commandCount: envelope.commands.length, commandStateDp: control.commandStateDp, localBridge, bridgeWrites, peerDispatch });
    this._lastCommandResult = { ts: this._lastCommandWriteTs, status: effectiveStatus, localStatus, localError, commandCount: envelope.commands.length, commandStateDp: control.commandStateDp, envelope, localBridge, bridgeWrites, peerDispatch, historyRow };
  }

  _nodeSnapshot(node) {
    const prefix = `mesh.${node.id}`;
    const power = this._getNumber(`${prefix}.powerW`, null);
    const surplusIn = this._getNumber(`${prefix}.surplusW`, null);
    const demandIn = this._getNumber(`${prefix}.demandW`, null);
    const soc = this._getNumber(`${prefix}.socPct`, null);
    const gridImportIn = this._getNumber(`${prefix}.gridImportW`, null);
    const gridExportIn = this._getNumber(`${prefix}.gridExportW`, null);

    let generationW = 0;
    let loadW = 0;
    let storageChargeW = 0;
    let storageDischargeW = 0;
    let gridImportW = 0;
    let gridExportW = 0;

    const p = Number.isFinite(Number(power)) ? Number(power) : null;
    const surplus = Math.max(0, num(surplusIn, 0));
    const demand = Math.max(0, num(demandIn, 0));

    if (node.role === 'producer') {
      generationW = Math.max(0, p !== null ? p : surplus);
    } else if (node.role === 'storage') {
      // Sign-Konvention für Speicher im Mesh-Modell:
      // positiv = Entladung/Quelle, negativ = Ladung/Senke. Falls getrennte
      // Surplus-/Demand-DPs vorhanden sind, können sie diese Basis ergänzen.
      if (p !== null) {
        if (p >= 0) storageDischargeW = p;
        else storageChargeW = Math.abs(p);
      }
      storageDischargeW = Math.max(storageDischargeW, surplus);
      storageChargeW = Math.max(storageChargeW, demand);
      generationW += storageDischargeW;
      loadW += storageChargeW;
    } else if (node.role === 'grid') {
      if (gridImportIn !== null || gridExportIn !== null) {
        gridImportW = Math.max(0, num(gridImportIn, 0));
        gridExportW = Math.max(0, num(gridExportIn, 0));
      } else if (p !== null) {
        gridImportW = p > 0 ? p : 0;
        gridExportW = p < 0 ? Math.abs(p) : 0;
      }
    } else {
      loadW = Math.max(0, p !== null ? p : demand);
      if (surplus > 0 && p === null) generationW = surplus;
    }

    if (demand > 0 && node.role !== 'grid') loadW = Math.max(loadW, demand);
    if (surplus > 0 && node.role === 'producer') generationW = Math.max(generationW, surplus);

    const nodeSurplusW = Math.max(0, generationW + storageDischargeW - loadW - storageChargeW);
    const nodeDemandW = Math.max(0, loadW + storageChargeW - generationW - storageDischargeW);
    const status = !node.enabled ? 'disabled' : (nodeSurplusW > 0 ? 'surplus' : (nodeDemandW > 0 ? 'demand' : 'balanced'));

    return {
      ...node,
      powerW: p === null ? null : round(p, 0),
      socPercent: Number.isFinite(Number(soc)) ? clamp(Number(soc), 0, 100) : null,
      generationW: round(generationW, 0),
      loadW: round(loadW, 0),
      storageChargeW: round(storageChargeW, 0),
      storageDischargeW: round(storageDischargeW, 0),
      gridImportW: round(gridImportW, 0),
      gridExportW: round(gridExportW, 0),
      surplusW: round(nodeSurplusW, 0),
      demandW: round(nodeDemandW, 0),
      status,
      intent: {
        schema: 'nexowatt.energy-intent.v1',
        nodeId: node.id,
        type: node.type,
        status,
        availablePowerW: round(nodeSurplusW, 0),
        neededPowerW: round(nodeDemandW, 0),
        priority: node.priority,
        readOnly: true,
      },
    };
  }

  _buildSnapshot() {
    const cfg = this._cfg();
    const enabled = this._enabled();
    const mode = this._mode();
    const nodes = this._nodes();
    const activeNodes = nodes.filter(n => n.enabled);
    const localSnapshots = activeNodes.map(n => this._nodeSnapshot(n));
    const remoteSnapshots = this._remoteNodeSnapshots();
    const snapshots = [...localSnapshots, ...remoteSnapshots];
    const missing = nodes.filter(n => n.enabled && !n.powerDp && !n.surplusPowerDp && !n.demandPowerDp && !n.gridImportPowerDp && !n.gridExportPowerDp).map(n => ({ id: n.id, name: n.name, type: n.type, warning: 'Keine Leistungs-/Grid-Mappingdaten hinterlegt.' }));

    const sum = (field) => snapshots.reduce((acc, n) => acc + num(n[field], 0), 0);
    const generationW = sum('generationW');
    const loadW = sum('loadW');
    const storageChargeW = sum('storageChargeW');
    const storageDischargeW = sum('storageDischargeW');
    const gridImportW = sum('gridImportW');
    const gridExportW = sum('gridExportW');
    const surplusW = Math.max(0, generationW - loadW);
    const demandW = Math.max(0, loadW - generationW);
    const localUsePotentialW = Math.max(0, Math.min(generationW, loadW));
    const gridLimitW = Math.max(0, Math.round(num(cfg.gridLimitW, 0)));
    const gridUsagePercent = gridLimitW > 0 ? Math.max(0, Math.round((Math.max(gridImportW, gridExportW) / gridLimitW) * 100)) : 0;

    const clusterId = safeId(cfg.clusterId || 'cluster_01', 'cluster_01');
    const clusterName = String(cfg.clusterName || 'Lokaler Energieverbund').trim() || 'Lokaler Energieverbund';
    const status = !enabled ? 'disabled' : (missing.length ? 'warn' : 'ok');
    const warning = !enabled ? '' : (missing.length ? `${missing.length} Mesh/Microgrid-Knoten ohne Leistungszuordnung.` : '');

    const clusterIntent = {
      schema: 'nexowatt.cluster-energy-intent.v1',
      clusterId,
      mode,
      readOnly: true,
      localFirstPrepared: true,
      gridLastPrepared: true,
      generationW: round(generationW, 0),
      loadW: round(loadW, 0),
      surplusW: round(surplusW, 0),
      demandW: round(demandW, 0),
      localUsePotentialW: round(localUsePotentialW, 0),
      gridLimitW,
      gridLimitUsagePercent: gridUsagePercent,
      localFirstDiagnosis: surplusW > 0 ? 'Lokaler Überschuss vorhanden; spätere Strategie kann lokale Senken priorisieren.' : 'Kein lokaler Überschuss vorhanden.',
      gridLastDiagnosis: demandW > 0 ? 'Restbedarf vorhanden; spätere Strategie kann Netzbezug nach lokalen Quellen nachrangig behandeln.' : 'Kein Restbedarf vorhanden.',
      note: '0.8.40 Feldsteuerung: bei Installateurfreigabe werden neutrale Command-Intents ausgegeben; direkte Hardware-Schreibpfade bleiben gesperrt.',
    };

    const planning = buildPlanning(snapshots, { generationW, loadW, storageChargeW, storageDischargeW, gridImportW, gridExportW, surplusW, demandW, localUsePotentialW, gridLimitUsagePercent: gridUsagePercent }, gridLimitW, mode);
    const commandGuard = buildCommandGuard(planning, snapshots, { clusterId, clusterName, gridLimitW, mode }, this._commandOutputCfg(), this._tailscaleCfg(), this._localBridgeCfg(), this._targetGroups());
    const localBridge = buildLocalBridgePlan(commandGuard, this._localBridgeCfg());
    const fieldTest = buildTwoInstanceFieldTestDiagnostics({ tailscale: this._tailscaleCfg(), poll: this._lastTailscalePoll || {}, dispatch: this._lastPeerCommandDispatch || {}, guard: commandGuard, receiver: this._receiverCfg(), commandHistory: this._commandHistory, peerHistory: this._peerHistory, remoteNodes: this._remoteNodeSnapshots() });
    this._lastFieldTest = fieldTest;

    const decision = {
      schema: 'nexowatt.mesh-readonly-decision.v1',
      ts: Date.now(),
      mode,
      action: 'observe-only',
      reason: enabled ? 'Mesh/Microgrid aktiv; Feldtest-Ausgabe erfolgt nur bei Installateurfreigabe über neutralen Command-State.' : 'Mesh/Microgrid App deaktiviert.',
      nextStep: surplusW > 0 ? 'Lokalen Überschuss für Speicher/Ladepunkte/Nachbarn priorisieren (spätere Strategie).' : (demandW > 0 ? 'Lokalen Bedarf mit PV/Speicher/Clusterquellen decken (spätere Strategie).' : 'Cluster aktuell ausgeglichen.'),
      plannedActionCount: planning.actionCount,
      criticalActionCount: planning.criticalActionCount,
      plannedActions: planning.actions,
      priorityOrder: planning.priorityOrder,
      gridLimitDiagnostics: planning.gridLimit,
      commandGuard,
      fieldTest,
      readOnly: true,
    };

    return {
      enabled,
      status,
      warning,
      mode,
      clusterId,
      clusterName,
      gridLimitW,
      nodes,
      snapshots,
      localSnapshots,
      remoteSnapshots,
      missing,
      clusterIntent,
      planning,
      commandGuard,
      localBridge,
      targetGroups: commandGuard.targetGroups || buildTargetGroupPlan(this._targetGroups(), snapshots, commandGuard.allowedCommands || []),
      fieldTest,
      decision,
      totals: {
        generationW: round(generationW, 0),
        loadW: round(loadW, 0),
        storageChargeW: round(storageChargeW, 0),
        storageDischargeW: round(storageDischargeW, 0),
        gridImportW: round(gridImportW, 0),
        gridExportW: round(gridExportW, 0),
        surplusW: round(surplusW, 0),
        demandW: round(demandW, 0),
        localUsePotentialW: round(localUsePotentialW, 0),
        gridLimitUsagePercent: gridUsagePercent,
      },
    };
  }

  async _publishDisabledOrInit(reason) {
    const snap = this._buildSnapshot();
    snap.status = this._enabled() ? (snap.status || 'ok') : 'disabled';
    snap.decision.reason = reason === 'init' ? 'Mesh/Microgrid Modul initialisiert.' : snap.decision.reason;
    await this._publish(snap);
  }

  async tick() {
    if (this.adapter?._meshCoordinator?.config?.role && this.adapter._meshCoordinator.config.role !== 'off') return;
    // Falls der Installer im App-Center Knoten ändert und der EMS-Restart ausbleibt,
    // registrieren wir neue DPs beim nächsten Konfigurationswechsel nach. Das ist nur
    // eine Lese-Registrierung; es entstehen keine Hardware-Schreibpfade.
    try {
      const cfgHash = JSON.stringify(this._cfg());
      if (cfgHash !== this._lastConfigHash) {
        this._lastConfigHash = cfgHash;
        await this._registerDatapoints();
      }
    } catch (_e) {}
    await this._pollTailscalePeers();
    const snap = this._buildSnapshot();
    await this._publish(snap);
    await this._writeFieldCommands(snap);
  }

  async _publish(snap) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const now = Date.now();
    const set = async (id, val) => {
      try { await a.setStateAsync(id, { val, ack: true }); } catch (_e) {}
    };

    await set('meshMicrogrid.enabled', !!snap.enabled);
    await set('meshMicrogrid.version', MODULE_VERSION);
    await set('meshMicrogrid.status', snap.status || 'ok');
    await set('meshMicrogrid.mode', snap.mode || 'diagnostic');
    await set('meshMicrogrid.lastUpdate', now);
    await set('meshMicrogrid.legalNote', 'EOS Mesh/Microgrid Datenmodell ist read-only; Steuerung/Abrechnung werden später separat freigegeben.');
    await set('meshMicrogrid.cluster.id', snap.clusterId || 'cluster_01');
    await set('meshMicrogrid.cluster.name', snap.clusterName || 'Lokaler Energieverbund');
    await set('meshMicrogrid.cluster.gridLimitW', snap.gridLimitW || 0);
    await set('meshMicrogrid.cluster.nodeCount', Array.isArray(snap.nodes) ? snap.nodes.length : 0);
    await set('meshMicrogrid.cluster.activeNodeCount', Array.isArray(snap.snapshots) ? snap.snapshots.length : 0);
    await set('meshMicrogrid.cluster.localFirstEnabled', snap.mode !== 'off');
    await set('meshMicrogrid.cluster.gridLastEnabled', snap.mode !== 'off');

    const t = snap.totals || {};
    await set('meshMicrogrid.power.generationW', t.generationW || 0);
    await set('meshMicrogrid.power.loadW', t.loadW || 0);
    await set('meshMicrogrid.power.storageChargeW', t.storageChargeW || 0);
    await set('meshMicrogrid.power.storageDischargeW', t.storageDischargeW || 0);
    await set('meshMicrogrid.power.gridImportW', t.gridImportW || 0);
    await set('meshMicrogrid.power.gridExportW', t.gridExportW || 0);
    await set('meshMicrogrid.power.surplusW', t.surplusW || 0);
    await set('meshMicrogrid.power.demandW', t.demandW || 0);
    await set('meshMicrogrid.power.localUsePotentialW', t.localUsePotentialW || 0);
    await set('meshMicrogrid.power.gridLimitUsagePercent', t.gridLimitUsagePercent || 0);

    const nodesJson = JSON.stringify(snap.snapshots || []);
    const topology = {
      schema: 'nexowatt.mesh-topology.v1',
      clusterId: snap.clusterId,
      clusterName: snap.clusterName,
      nodeCount: Array.isArray(snap.nodes) ? snap.nodes.length : 0,
      activeNodeCount: Array.isArray(snap.snapshots) ? snap.snapshots.length : 0,
      nodes: (snap.snapshots || []).map(n => ({ id: n.id, name: n.name, type: n.type, role: n.role, priority: n.priority })),
    };
    const summary = {
      schema: MODULE_VERSION,
      ts: now,
      enabled: !!snap.enabled,
      status: snap.status,
      warning: snap.warning || '',
      clusterId: snap.clusterId,
      clusterName: snap.clusterName,
      mode: snap.mode,
      totals: snap.totals,
      readOnly: true,
      separateEosApp: true,
      operatorViewUrl: '/mesh/microgrid',
      exportUrls: { json: '/api/mesh/microgrid', csv: '/api/mesh/microgrid.csv' },
      planning: snap.planning || {},
      commandGuard: snap.commandGuard || {},
      limits: snap.commandGuard && snap.commandGuard.limitDiagnostics ? snap.commandGuard.limitDiagnostics : {},
      targetGroups: snap.targetGroups || {},
      fieldControl: { ...this._commandOutputCfg(), lastCommand: this._lastCommandResult || {} },
      localBridge: this._lastCommandResult && this._lastCommandResult.localBridge ? this._lastCommandResult.localBridge : (snap.localBridge || {}),
      tailscale: { ...this._tailscaleCfg(), lastPoll: this._lastTailscalePoll || {}, lastCommandDispatch: this._lastPeerCommandDispatch || {}, remoteNodeCount: Array.isArray(snap.remoteSnapshots) ? snap.remoteSnapshots.length : 0 },
      receiver: { ...this._receiverCfg(), note: 'Remote-Kommandos werden nur als neutraler lokaler Command-State angenommen.' },
      fieldTest: snap.fieldTest || {},
    };

    await set('meshMicrogrid.nodesJson', nodesJson);
    await set('meshMicrogrid.topologyJson', JSON.stringify(topology));
    await set('meshMicrogrid.summaryJson', JSON.stringify(summary));
    await set('meshMicrogrid.intent.nodesJson', JSON.stringify((snap.snapshots || []).map(n => n.intent)));
    await set('meshMicrogrid.intent.clusterJson', JSON.stringify(snap.clusterIntent || {}));
    await set('meshMicrogrid.lastDecisionJson', JSON.stringify(snap.decision || {}));
    await set('meshMicrogrid.diagnostics.warning', snap.warning || '');
    await set('meshMicrogrid.diagnostics.missingMappingsJson', JSON.stringify(snap.missing || []));
    await set('meshMicrogrid.diagnostics.readOnly', true);

    // Betreiber-/Export-Snapshot für UI und APIs. Dieser Snapshot ist exakt aus
    // den gerade veröffentlichten Knoten-/Clusterwerten abgeleitet und dient nur
    // als bequeme Ansicht. Keine weitere Berechnungsschicht zählt Werte erneut.
    const exportSnapshot = {
      schema: 'nexowatt.mesh-microgrid-export.v1',
      ts: now,
      cluster: { id: snap.clusterId, name: snap.clusterName, mode: snap.mode, gridLimitW: snap.gridLimitW },
      totals: snap.totals || {},
      nodes: snap.snapshots || [],
      intents: (snap.snapshots || []).map(n => n.intent),
      clusterIntent: snap.clusterIntent || {},
      planning: snap.planning || {},
      commandGuard: snap.commandGuard || {},
      limits: snap.commandGuard && snap.commandGuard.limitDiagnostics ? snap.commandGuard.limitDiagnostics : {},
      targetGroups: snap.targetGroups || {},
      fieldControl: { ...this._commandOutputCfg(), lastCommand: this._lastCommandResult || {} },
      localBridge: this._lastCommandResult && this._lastCommandResult.localBridge ? this._lastCommandResult.localBridge : (snap.localBridge || {}),
      tailscale: { ...this._tailscaleCfg(), lastPoll: this._lastTailscalePoll || {}, lastCommandDispatch: this._lastPeerCommandDispatch || {}, remoteNodeCount: Array.isArray(snap.remoteSnapshots) ? snap.remoteSnapshots.length : 0 },
      receiver: { ...this._receiverCfg(), note: 'Remote-Kommandos werden nur als neutraler lokaler Command-State angenommen.' },
      fieldTest: snap.fieldTest || {},
      decision: snap.decision || {},
      missingMappings: snap.missing || [],
      readOnly: false,
      executionMode: (this._commandOutputCfg().controlMode || 'diagnostic'),
      activeControl: this._commandOutputCfg().controlMode === 'active',
      fieldTestMode: this._commandOutputCfg().controlMode === 'field_test',
      neutralCommandOnly: true,
      directHardwareWrite: false,
    };
    await set('meshMicrogrid.export.schema', 'nexowatt.mesh-microgrid-export.v1');
    await set('meshMicrogrid.export.ready', !!snap.enabled);
    await set('meshMicrogrid.export.jsonUrl', '/api/mesh/microgrid');
    await set('meshMicrogrid.export.csvUrl', '/api/mesh/microgrid.csv');
    await set('meshMicrogrid.export.snapshotJson', JSON.stringify(exportSnapshot));
    await set('meshMicrogrid.operator.viewUrl', '/mesh/microgrid');

    const planning = snap.planning || {};
    await set('meshMicrogrid.planning.actionsJson', JSON.stringify(planning.actions || []));
    await set('meshMicrogrid.planning.localFirstActionsJson', JSON.stringify(planning.localFirstActions || []));
    await set('meshMicrogrid.planning.gridLastActionsJson', JSON.stringify(planning.gridLastActions || []));
    await set('meshMicrogrid.planning.gridLimitActionsJson', JSON.stringify(planning.gridLimitActions || []));
    await set('meshMicrogrid.planning.priorityOrderJson', JSON.stringify(planning.priorityOrder || []));
    await set('meshMicrogrid.planning.gridLimitDiagnosticsJson', JSON.stringify(planning.gridLimit || {}));
    await set('meshMicrogrid.planning.actionCount', Number(planning.actionCount || 0));
    await set('meshMicrogrid.planning.criticalActionCount', Number(planning.criticalActionCount || 0));
    await set('meshMicrogrid.planning.readinessScorePercent', Number(planning.readinessScorePercent || 0));
    await set('meshMicrogrid.planning.readOnly', true);
    await set('meshMicrogrid.planning.summaryJson', JSON.stringify({ schema: 'nexowatt.mesh-planning-summary.v1', ts: now, readOnly: true, actionCount: planning.actionCount || 0, criticalActionCount: planning.criticalActionCount || 0, readinessScorePercent: planning.readinessScorePercent || 0, summary: planning.summary || '', gridLimit: planning.gridLimit || {} }));
    await set('meshMicrogrid.planning.lastReason', String(planning.summary || 'Keine geplante Aktion.'));

    const commandGuard = snap.commandGuard || {};
    await set('meshMicrogrid.commandGuard.schema', commandGuard.schema || 'nexowatt.mesh-commandguard-field-control.v1');
    await set('meshMicrogrid.commandGuard.status', commandGuard.status || 'blocked');
    await set('meshMicrogrid.commandGuard.prepared', commandGuard.prepared !== false);
    await set('meshMicrogrid.commandGuard.allowed', commandGuard.allowed === true);
    await set('meshMicrogrid.commandGuard.automaticActionsBlocked', commandGuard.automaticActionsBlocked !== false);
    await set('meshMicrogrid.commandGuard.readOnly', false);
    await set('meshMicrogrid.commandGuard.hardwareWrite', false);
    await set('meshMicrogrid.commandGuard.requiredLicense', commandGuard.requiredLicense || 'EOS');
    await set('meshMicrogrid.commandGuard.requiredFeature', commandGuard.requiredFeature || 'meshMicrogridControl');
    await set('meshMicrogrid.commandGuard.reason', String(commandGuard.reason || 'CommandGuard blockiert oder keine Commands vorhanden.'));
    await set('meshMicrogrid.commandGuard.safetyChecksJson', JSON.stringify(commandGuard.safetyChecks || []));
    await set('meshMicrogrid.commandGuard.plannedCommandsJson', JSON.stringify(commandGuard.plannedCommands || []));
    await set('meshMicrogrid.commandGuard.blockedActionsJson', JSON.stringify(commandGuard.blockedActions || []));
    await set('meshMicrogrid.commandGuard.blockerCount', Number(commandGuard.blockerCount || 0));
    await set('meshMicrogrid.commandGuard.warnCount', Number(commandGuard.warnCount || 0));
    await set('meshMicrogrid.commandGuard.summaryJson', JSON.stringify(commandGuard));

    const limitDiagnostics = commandGuard && commandGuard.limitDiagnostics ? commandGuard.limitDiagnostics : buildCommandLimitDiagnostics([], [], this._localBridgeCfg());
    await set('meshMicrogrid.limits.nodesJson', JSON.stringify(limitDiagnostics.nodeLimits || []));
    await set('meshMicrogrid.limits.bridgeTargetsJson', JSON.stringify(limitDiagnostics.bridgeTargets || []));
    await set('meshMicrogrid.limits.limitedCommandsJson', JSON.stringify(limitDiagnostics.limitedCommands || []));
    await set('meshMicrogrid.limits.blockedCommandsJson', JSON.stringify(limitDiagnostics.blockedCommands || []));
    await set('meshMicrogrid.limits.summaryJson', JSON.stringify(limitDiagnostics));
    await set('meshMicrogrid.limits.activeLimitCount', Number(limitDiagnostics.activeLimitCount || 0));
    await set('meshMicrogrid.limits.limitedCount', Number(limitDiagnostics.limitedCount || 0));
    await set('meshMicrogrid.limits.blockedCount', Number(limitDiagnostics.blockedCount || 0));
    await set('meshMicrogrid.limits.lastReason', String(limitDiagnostics.lastReason || ''));

    const targetGroupPlan = snap.targetGroups || (limitDiagnostics && limitDiagnostics.targetGroupSummary) || buildTargetGroupPlan(this._targetGroups(), snap.snapshots || [], commandGuard.allowedCommands || []);
    await set('meshMicrogrid.targetGroups.groupsJson', JSON.stringify(targetGroupPlan.groups || []));
    await set('meshMicrogrid.targetGroups.priorityOrderJson', JSON.stringify(targetGroupPlan.priorityOrder || []));
    await set('meshMicrogrid.targetGroups.summaryJson', JSON.stringify(targetGroupPlan));
    await set('meshMicrogrid.targetGroups.groupCount', Number(targetGroupPlan.groupCount || 0));
    await set('meshMicrogrid.targetGroups.activeGroupCount', Number(targetGroupPlan.activeGroupCount || 0));
    await set('meshMicrogrid.targetGroups.limitedCommandCount', Number((limitDiagnostics.limitedCommands || []).filter(c => (c.reasons || []).some(r => String(r.id || '').startsWith('group.'))).length));
    await set('meshMicrogrid.targetGroups.blockedCommandCount', Number((limitDiagnostics.blockedCommands || []).filter(c => (c.reasons || []).some(r => String(r.id || '').startsWith('group.'))).length));
    const fairnessPlan = (targetGroupPlan && targetGroupPlan.fairness) || (limitDiagnostics && limitDiagnostics.targetGroupFairness) || {};
    await set('meshMicrogrid.targetGroups.fairnessJson', JSON.stringify(fairnessPlan));
    await set('meshMicrogrid.targetGroups.fairnessBudgetsJson', JSON.stringify(fairnessPlan.groups || []));
    await set('meshMicrogrid.targetGroups.fairnessLimitedCommandsJson', JSON.stringify(fairnessPlan.limitedCommands || []));
    await set('meshMicrogrid.targetGroups.fairnessBlockedCommandsJson', JSON.stringify(fairnessPlan.blockedCommands || []));
    await set('meshMicrogrid.targetGroups.fairnessLimitedCount', Number(fairnessPlan.limitedCount || 0));
    await set('meshMicrogrid.targetGroups.fairnessBlockedCount', Number(fairnessPlan.blockedCount || 0));
    await set('meshMicrogrid.targetGroups.lastReason', String((fairnessPlan && fairnessPlan.summary) || targetGroupPlan.summary || ''));

    const control = this._commandOutputCfg();
    const lastCmd = this._lastCommandResult || {};
    await set('meshMicrogrid.fieldControl.enabled', commandGuard.commandOutputAllowed === true);
    await set('meshMicrogrid.fieldControl.mode', control.controlMode || 'diagnostic');
    await set('meshMicrogrid.fieldControl.executionMode', control.controlMode || 'diagnostic');
    await set('meshMicrogrid.fieldControl.activeControl', control.controlMode === 'active' && commandGuard.commandOutputAllowed === true);
    await set('meshMicrogrid.fieldControl.installerApproved', control.fieldTestApproved === true);
    await set('meshMicrogrid.fieldControl.commandStateDp', control.commandStateDp || '');
    await set('meshMicrogrid.fieldControl.lastCommandAt', Number(lastCmd.ts || this._lastCommandWriteTs || 0));
    await set('meshMicrogrid.fieldControl.lastCommandJson', JSON.stringify(lastCmd.envelope || {}));
    await set('meshMicrogrid.fieldControl.lastWriteStatus', String(lastCmd.status || 'idle'));
    await set('meshMicrogrid.fieldControl.lastWriteError', String(lastCmd.error || ''));
    await set('meshMicrogrid.fieldControl.outputCount', Number(lastCmd.commandCount || 0));

    const localBridge = snap.localBridge || buildLocalBridgePlan(commandGuard, this._localBridgeCfg());
    const lbLast = this._lastCommandResult || {};
    const lbWrites = Array.isArray(lbLast.bridgeWrites) ? lbLast.bridgeWrites : [];
    const lbAck = await this._evaluateLocalBridgeAck(localBridge, lbWrites);
    const lbManualRelease = await this._readManualReleaseSummary();
    const targetHistory = buildTargetCommandHistory(this._commandHistory || []);
    this._lastTargetCommandHistory = targetHistory;
    localBridge.ack = lbAck;
    localBridge.manualRelease = lbManualRelease;
    localBridge.targetCommandHistory = targetHistory;
    await set('meshMicrogrid.localBridge.enabled', localBridge.enabled === true);
    await set('meshMicrogrid.localBridge.outputMode', String(localBridge.outputMode || 'global'));
    await set('meshMicrogrid.localBridge.defaultCommandStateDp', String(localBridge.defaultCommandStateDp || ''));
    await set('meshMicrogrid.localBridge.mappingCount', Number(localBridge.mappingCount || 0));
    await set('meshMicrogrid.localBridge.mappedCommandCount', Number(localBridge.mappedCommandCount || 0));
    await set('meshMicrogrid.localBridge.unmappedCommandCount', Number(localBridge.unmappedCommandCount || 0));
    await set('meshMicrogrid.localBridge.routeReady', localBridge.routeReady === true);
    await set('meshMicrogrid.localBridge.mappingsJson', JSON.stringify(localBridge.mappings || []));
    await set('meshMicrogrid.localBridge.mappedCommandsJson', JSON.stringify(localBridge.mappedCommands || []));
    await set('meshMicrogrid.localBridge.unmappedCommandsJson', JSON.stringify(localBridge.unmappedCommands || []));
    await set('meshMicrogrid.localBridge.lastWriteAt', Number(lbLast.ts || 0));
    await set('meshMicrogrid.localBridge.lastWriteStatus', lbWrites.some(w => w.status === 'error') ? 'error' : (lbWrites.length ? 'written' : 'idle'));
    await set('meshMicrogrid.localBridge.lastWriteError', lbWrites.filter(w => w.status === 'error').map(w => w.error || w.commandStateDp).join(' | '));
    await set('meshMicrogrid.localBridge.lastWritesJson', JSON.stringify(lbWrites));
    await set('meshMicrogrid.localBridge.ackEnabled', lbAck.enabled === true);
    const lbGate = (localBridge && localBridge.ackGate) ? localBridge.ackGate : buildBridgeAckGate(localBridge, lbAck, lbManualRelease);
    localBridge.ackGate = lbGate;
    await set('meshMicrogrid.localBridge.ackRequired', lbGate.required === true || lbGate.ackRequired === true);
    await set('meshMicrogrid.localBridge.ackGateStatus', String(lbGate.status || 'disabled'));
    await set('meshMicrogrid.localBridge.ackGateBlockedCommandCount', Number(lbGate.blockedCount || lbGate.blockedCommandCount || 0));
    await set('meshMicrogrid.localBridge.ackBlockedTargetsJson', JSON.stringify(lbGate.blockedMappings || lbGate.blockedTargets || []));
    await set('meshMicrogrid.localBridge.targetHealthJson', JSON.stringify(lbGate.targetLights || lbGate.targetHealth || []));
    await set('meshMicrogrid.localBridge.manualReleaseEnabled', lbManualRelease.enabled !== false);
    await set('meshMicrogrid.localBridge.manualReleaseSummaryJson', JSON.stringify(lbManualRelease));
    await set('meshMicrogrid.localBridge.manualReleaseCount', Number(lbManualRelease.activeCount || 0));
    await set('meshMicrogrid.localBridge.targetCommandHistoryJson', JSON.stringify(targetHistory));
    await set('meshMicrogrid.localBridge.targetCommandHistoryCount', Number(targetHistory.targetCount || 0));
    await set('meshMicrogrid.localBridge.releaseReady', (lbGate.status === 'ready' || lbManualRelease.activeCount > 0 || lbAck.okCount > 0));
    await set('meshMicrogrid.localBridge.ackTimeoutSec', Number(lbAck.timeoutSec || 0));
    await set('meshMicrogrid.localBridge.ackStatus', String(lbAck.status || 'disabled'));
    await set('meshMicrogrid.localBridge.ackReady', lbAck.ready === true);
    await set('meshMicrogrid.localBridge.ackOkCount', Number(lbAck.okCount || 0));
    await set('meshMicrogrid.localBridge.ackPendingCount', Number(lbAck.pendingCount || 0));
    await set('meshMicrogrid.localBridge.ackErrorCount', Number(lbAck.errorCount || 0));
    await set('meshMicrogrid.localBridge.ackTimeoutCount', Number(lbAck.timeoutCount || 0));
    await set('meshMicrogrid.localBridge.ackMissingCount', Number(lbAck.missingCount || 0));
    await set('meshMicrogrid.localBridge.ackStaleCount', Number(lbAck.staleCount || 0));
    await set('meshMicrogrid.localBridge.ackTargetsJson', JSON.stringify(lbAck.targets || []));
    await set('meshMicrogrid.localBridge.targetStatusJson', JSON.stringify(lbAck.targets || []));
    await set('meshMicrogrid.localBridge.ackSummaryJson', JSON.stringify(lbAck));
    await set('meshMicrogrid.localBridge.summaryJson', JSON.stringify(localBridge));

    const tailscale = this._tailscaleCfg();
    const poll = this._lastTailscalePoll || { status: tailscale.enabled ? 'pending' : 'disabled', peers: [], remoteNodeCount: 0 };
    await set('meshMicrogrid.tailscale.enabled', tailscale.enabled === true);
    await set('meshMicrogrid.tailscale.profile', tailscale.profile || 'mesh-microgrid');
    await set('meshMicrogrid.tailscale.localNodeId', tailscale.localNodeId || 'local');
    await set('meshMicrogrid.tailscale.peerCount', Array.isArray(tailscale.peerUrls) ? tailscale.peerUrls.length : 0);
    await set('meshMicrogrid.tailscale.remoteNodeCount', Array.isArray(snap.remoteSnapshots) ? snap.remoteSnapshots.length : 0);
    await set('meshMicrogrid.tailscale.lastPollAt', Number(poll.ts || 0));
    await set('meshMicrogrid.tailscale.lastPollStatus', String(poll.status || 'idle'));
    await set('meshMicrogrid.tailscale.peersJson', JSON.stringify(poll.peers || []));
    await set('meshMicrogrid.tailscale.remoteNodesJson', JSON.stringify(snap.remoteSnapshots || []));
    await set('meshMicrogrid.tailscale.lastPollJson', JSON.stringify(poll));
    await set('meshMicrogrid.tailscale.lastCommandDispatchJson', JSON.stringify(this._lastPeerCommandDispatch || {}));
    await set('meshMicrogrid.tailscale.lastCommandDispatchStatus', String((this._lastPeerCommandDispatch && this._lastPeerCommandDispatch.status) || 'idle'));

    const receiver = this._receiverCfg();
    await set('meshMicrogrid.receiver.enabled', receiver.enabled === true);
    await set('meshMicrogrid.receiver.acceptRemoteCommands', receiver.acceptRemoteCommands === true);
    await set('meshMicrogrid.receiver.localCommandStateDp', receiver.localCommandStateDp || '');
    await set('meshMicrogrid.receiver.peerTokenSet', !!receiver.peerToken);
    await set('meshMicrogrid.receiver.requireClusterMatch', receiver.requireClusterMatch !== false);
    await set('meshMicrogrid.receiver.summaryJson', JSON.stringify({ schema: 'nexowatt.mesh-command-receiver-config.v1', enabled: receiver.enabled, acceptRemoteCommands: receiver.acceptRemoteCommands, localCommandStateDp: receiver.localCommandStateDp, peerTokenSet: !!receiver.peerToken, requireClusterMatch: receiver.requireClusterMatch, replayTtlSec: receiver.replayTtlSec, processedLimit: receiver.processedLimit, directHardwareWrite: false, neutralCommandOnly: true }));

    const fieldTest = snap.fieldTest || this._lastFieldTest || {};
    const peerMatrix = Array.isArray(fieldTest.peerMatrix) ? fieldTest.peerMatrix : [];
    const commandHistory = Array.isArray(fieldTest.commandHistory) ? fieldTest.commandHistory : (Array.isArray(this._commandHistory) ? this._commandHistory : []);
    const lastAck = peerMatrix.map(p => p && p.ackStatus ? p : null).filter(Boolean)[0] || (this._lastPeerCommandDispatch && Array.isArray(this._lastPeerCommandDispatch.peers) ? (this._lastPeerCommandDispatch.peers.find(p => p && p.ack) || {}).ack : {}) || {};
    await set('meshMicrogrid.fieldTest.status', String(fieldTest.status || 'not-ready'));
    await set('meshMicrogrid.fieldTest.twoInstanceReady', fieldTest.twoInstanceReady === true);
    await set('meshMicrogrid.fieldTest.fieldCommandReady', fieldTest.fieldCommandReady === true);
    await set('meshMicrogrid.fieldTest.peerOnlineCount', Number(fieldTest.peerOnlineCount || 0));
    await set('meshMicrogrid.fieldTest.peerCommandOkCount', Number(fieldTest.peerCommandOkCount || 0));
    await set('meshMicrogrid.fieldTest.remoteNodeCount', Number(fieldTest.remoteNodeCount || 0));
    await set('meshMicrogrid.fieldTest.lastRoundtripMs', Number(fieldTest.lastRoundtripMs || 0));
    await set('meshMicrogrid.fieldTest.peerMatrixJson', JSON.stringify(peerMatrix));
    await set('meshMicrogrid.fieldTest.commandHistoryJson', JSON.stringify(commandHistory.slice(0, 50)));
    await set('meshMicrogrid.fieldTest.peerHistoryJson', JSON.stringify(fieldTest.peerHistory || commandHistory.slice(0, 50)));
    await set('meshMicrogrid.fieldTest.errorClassesJson', JSON.stringify(fieldTest.errorClasses || {}));
    await set('meshMicrogrid.fieldTest.remoteNodeMatrixJson', JSON.stringify(fieldTest.remoteNodeMatrix || []));
    await set('meshMicrogrid.fieldTest.roundtripStatus', String(fieldTest.roundtripStatus || 'unknown'));
    await set('meshMicrogrid.fieldTest.tokenErrorCount', Number(fieldTest.tokenErrorCount || 0));
    await set('meshMicrogrid.fieldTest.clusterMismatchCount', Number(fieldTest.clusterMismatchCount || 0));
    await set('meshMicrogrid.fieldTest.receiverErrorCount', Number(fieldTest.receiverErrorCount || 0));
    await set('meshMicrogrid.fieldTest.timeoutCount', Number(fieldTest.timeoutCount || 0));
    await set('meshMicrogrid.fieldTest.lastAckJson', JSON.stringify(lastAck || {}));
    await set('meshMicrogrid.fieldTest.peerHistoryJson', JSON.stringify(fieldTest.peerHistory || this._peerHistory || []));
    await set('meshMicrogrid.fieldTest.errorClassesJson', JSON.stringify(fieldTest.errorClasses || {}));
    await set('meshMicrogrid.fieldTest.roundtripStatus', String(fieldTest.roundtripStatus || 'unknown'));
    await set('meshMicrogrid.fieldTest.remoteNodeMatrixJson', JSON.stringify(fieldTest.remoteNodeMatrix || []));
    await set('meshMicrogrid.fieldTest.allowedPeersDiagnosticJson', JSON.stringify(fieldTest.allowedPeerDiagnostics || buildAllowedPeerDiagnostics(this._receiverCfg())));
    await set('meshMicrogrid.fieldTest.summaryJson', JSON.stringify(fieldTest));
    await set('meshMicrogrid.fieldTest.warning', Array.isArray(fieldTest.warnings) ? fieldTest.warnings.join(' ') : '');
    await set('meshMicrogrid.peerHardening.summaryJson', JSON.stringify({ schema: 'nexowatt.mesh-peer-hardening-summary.v1', ts: now, roundtripStatus: fieldTest.roundtripStatus || 'unknown', errorClasses: fieldTest.errorClasses || {}, remoteNodeCount: Array.isArray(fieldTest.remoteNodeMatrix) ? fieldTest.remoteNodeMatrix.length : 0, directHardwareWrite: false, neutralCommandOnly: true }));
    this._lastPublishTs = now;
  }
}

module.exports = { MeshMicrogridModule };
