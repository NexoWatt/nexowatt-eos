// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Definiert Einheiten, Rollen, Identitäten und zulässige Budgets des EOS-Master/Slave-Verbunds.
 * Daten und Wirkung: Prüft Konfigurationen ohne Schreibzugriffe; Leistungen sind positive W-Beträge, Phasenströme positive A-Beträge. 0 ist eine wirksame Grenze.
 * Bei Änderungen: Rückfallsummen, Stränge, Reservierungen und Protokolltests gemeinsam prüfen; niemals fehlende Werte als Freigabe behandeln.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/mesh-coordinator-contract.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const crypto = require('node:crypto');
const LIMIT_KEYS = ['importW', 'exportW', 'l1A', 'l2A', 'l3A', 'evW', 'chargeW', 'dischargeW', 'pvW', 'flexW'];
const NETWORK_KEYS = ['importW', 'exportW', 'l1A', 'l2A', 'l3A'];
const ZERO = Object.freeze(Object.fromEntries(LIMIT_KEYS.map(key => [key, 0])));
const SCHEMA = 'nexowatt.mesh-coordinator.v1';
const MAX_SLAVES = 99;
const clone = value => JSON.parse(JSON.stringify(value));
function fail(message) { const error = new Error(message); error.statusCode = 422; throw error; }
function number(value, name, min = 0, max = 1e9) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${name}: gültige Zahl zwischen ${min} und ${max} erforderlich.`);
  return value;
}
function id(value, name) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) fail(`${name}: eindeutige ID mit 1–64 Zeichen erforderlich.`);
  return value;
}
function limits(value, name, keys = LIMIT_KEYS) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name}: vollständige Grenzen fehlen.`);
  return Object.fromEntries(keys.map(key => [key, number(value[key], `${name}.${key}`, 0, key.endsWith('A') ? 100000 : 1e9)]));
}
function minLimits(...items) { return Object.fromEntries(LIMIT_KEYS.map(key => [key, Math.min(...items.map(item => item[key]))])); }
function maxLimits(...items) { return Object.fromEntries(LIMIT_KEYS.map(key => [key, Math.max(...items.map(item => item[key]))])); }
function within(actual, ceiling, keys = LIMIT_KEYS, tolerance = 0) { return keys.every(key => Number.isFinite(actual?.[key]) && actual[key] <= ceiling[key] + tolerance); }

/** HTTP ist ausschließlich im bereits verschlüsselten Tailnet oder Loopback zulässig.
 * Keine URL-Zugangsdaten, Query-Tokens oder Redirects; externe Ziele benötigen HTTPS.
 * DNS/ACL-Einrichtung des getrennten Regelungsnetzes bleibt Aufgabe des Betreibers. */
function masterUrl(value) {
  let url; try { url = new URL(String(value || '')); } catch { fail('Master-Adresse ist keine gültige URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) fail('Master-Adresse: nur Ursprung mit http/https und Port, ohne Pfad oder Zugangsdaten.');
  const host = url.hostname.toLowerCase();
  const ip = host.split('.').map(Number);
  const tailnet = ip.length === 4 && ip.every(n => Number.isInteger(n) && n >= 0 && n <= 255) && ip[0] === 100 && ip[1] >= 64 && ip[1] <= 127;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const tailnetV6 = /^\[fd7a:115c:a1e0:/.test(host);
  if (url.protocol === 'http:' && !(tailnet || tailnetV6 || local || host.endsWith('.ts.net'))) fail('HTTP-Master muss im Tailscale-Netz liegen. Sonst HTTPS verwenden.');
  return url.origin;
}
function member(raw, label) {
  const out = { id: id(raw.id, `${label}.id`), name: String(raw.name || raw.id).slice(0, 100), branch: String(raw.branch || ''),
    max: limits(raw.max, `${label}.max`), fallback: limits(raw.fallback, `${label}.fallback`),
    weight: number(raw.weight ?? 1, `${label}.weight`, 1, 100), commissioned: raw.commissioned === true, watchdogVerified: raw.watchdogVerified === true };
  if (!within(out.fallback, out.max)) fail(`${label}: Rückfall darf keine Maximalgrenze überschreiten.`);
  return out;
}
function defaultConfig() {
  return { role: 'off', mode: 'diagnostic', siteId: '', nodeId: '', masterId: '', revision: 1,
    intervalMs: 1000, requestTimeoutMs: 800, leaseMs: 3000, staleMs: 2000, recoveryCycles: 10, rampWPerSecond: 1000,
    allocation: { strategy: 'fixed', headroomW: 1000, headroomA: 3, engagePct: 90, releasePct: 80 },
    masterUrl: '', localParticipates: false, nodes: [], branches: [],
    local: { id: '', name: '', branch: '', max: { ...ZERO }, fallback: { ...ZERO }, weight: 1, commissioned: false, watchdogVerified: false },
    site: { limit: Object.fromEntries(NETWORK_KEYS.map(key => [key, 0])), reserve: Object.fromEntries(NETWORK_KEYS.map(key => [key, 0])), unmonitored: Object.fromEntries(NETWORK_KEYS.map(key => [key, 0])) },
    feedback: {}, siteFeedback: {},
    meter: { id: '', epoch: '', importDp: '', exportDp: '', unit: 'kWh', archiveIntervalMs: 600000 },
  };
}
/** Normalisiert ausschließlich erlaubte Felder. Fremde Felder und Secrets gelangen
 * nicht in das Lesemodell; pro Slave werden Grenzen ausdrücklich konfiguriert. */
function validateConfig(raw) {
  if (!raw || typeof raw !== 'object' || !['off', 'master', 'slave'].includes(raw.role)) fail('Rolle muss off, master oder slave sein.');
  const out = defaultConfig();
  out.role = raw.role;
  if (out.role === 'off') return out;
  out.mode = raw.mode === 'active' ? 'active' : 'diagnostic';
  out.siteId = id(raw.siteId, 'Standort'); out.nodeId = id(raw.nodeId, 'Lokaler Knoten'); out.masterId = id(raw.masterId, 'Master');
  if (out.role === 'slave' && out.masterId === out.nodeId) fail('Slave und Master brauchen verschiedene IDs.');
  if (out.role === 'master' && out.masterId !== out.nodeId) fail('Master-ID muss der lokalen Knoten-ID entsprechen.');
  out.revision = number(raw.revision, 'Konfigurationsversion', 1, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(out.revision)) fail('Konfigurationsversion muss ganzzahlig sein.');
  out.intervalMs = number(raw.intervalMs ?? 1000, 'Austauschtakt', 250, 5000);
  out.requestTimeoutMs = number(raw.requestTimeoutMs ?? 800, 'Anfrage-Timeout', 100, out.intervalMs);
  out.leaseMs = number(raw.leaseMs ?? 3000, 'Freigabedauer', out.intervalMs * 2, 15000);
  out.staleMs = number(raw.staleMs ?? 2000, 'Messwertalter', out.intervalMs, out.leaseMs - 1);
  out.recoveryCycles = number(raw.recoveryCycles ?? 10, 'Wiederanlaufzyklen', 3, 60);
  out.rampWPerSecond = number(raw.rampWPerSecond ?? 1000, 'Wiederanlauframpe W/s', 1, 100000);
  out.allocation = { strategy: raw.allocation?.strategy === 'transformer' ? 'transformer' : 'fixed',
    headroomW: number(raw.allocation?.headroomW ?? 1000, 'Haus-Leistungsreserve W', 0, 100000),
    headroomA: number(raw.allocation?.headroomA ?? 3, 'Haus-Phasenreserve A', 0, 1000),
    engagePct: number(raw.allocation?.engagePct ?? 90, 'Trafo-Eingriffsschwelle %', 10, 100),
    releasePct: number(raw.allocation?.releasePct ?? 80, 'Trafo-Freigabeschwelle %', 0, 99) };
  if (out.allocation.releasePct >= out.allocation.engagePct) fail('Freigabeschwelle muss unter der Eingriffsschwelle liegen.');
  out.localParticipates = out.role === 'slave' || raw.localParticipates === true;
  if (out.localParticipates) {
    out.local = member({ ...raw.local, id: out.nodeId }, 'Lokales Haus');
    if (out.mode === 'active' && (!out.local.commissioned || !out.local.watchdogVerified)) fail('Lokales Haus: Inbetriebnahme und unabhängigen Geräte-Rückfall nachweisen.');
  }
  out.feedback = Object.fromEntries(['evW', 'chargeW', 'dischargeW', 'pvW', 'flexW'].map(key => [key, String(raw.feedback?.[key] || '').trim().slice(0, 512)]));
  if (out.mode === 'active' && out.localParticipates) for (const key of Object.keys(out.feedback)) {
    if (out.local.max[key] > 0 && !out.feedback[key]) fail(`${key}: tatsächlichen Leistungs-Messwert in W zuordnen.`);
  }
  if (!Number.isInteger(out.recoveryCycles)) fail('Wiederanlaufzyklen müssen ganzzahlig sein.');
  if (out.role === 'slave') out.masterUrl = masterUrl(raw.masterUrl);
  if (out.role === 'master') {
    if (!Array.isArray(raw.nodes) || raw.nodes.length > MAX_SLAVES) fail('Maximal 99 Slaves je Master zulässig.');
    out.nodes = raw.nodes.map((row, index) => member(row, `Slave ${index + 1}`));
    const ids = new Set([out.nodeId]);
    for (const row of out.nodes) {
      if (ids.has(row.id)) fail(`Doppelte Knoten-ID: ${row.id}`); ids.add(row.id);
      if (out.mode === 'active' && (!row.commissioned || !row.watchdogVerified)) fail(`${row.id}: Inbetriebnahme und unabhängiger Rückfall fehlen.`);
    }
    for (const key of ['limit', 'reserve', 'unmonitored']) out.site[key] = limits(raw.site?.[key], `Standort.${key}`, NETWORK_KEYS);
    out.branches = (Array.isArray(raw.branches) ? raw.branches : []).map(row => ({ id: id(row.id, 'Strang'), limit: limits(row.limit, 'Stranggrenze', NETWORK_KEYS), reserve: limits(row.reserve, 'Strangreserve', NETWORK_KEYS), unmonitored: limits(row.unmonitored, 'Nicht erfasste Stranglast', NETWORK_KEYS) }));
    if (out.branches.length > 100 || new Set(out.branches.map(row => row.id)).size !== out.branches.length) fail('Stränge sind doppelt oder zu zahlreich.');
    const members = membersOf(out);
    for (const row of members) if (row.branch && !out.branches.some(branch => branch.id === row.branch)) fail(`${row.id}: Strang ist unbekannt.`);
    for (const group of groupsOf(out)) for (const key of NETWORK_KEYS) {
      const fallback = members.filter(row => !group.id || row.branch === group.id).reduce((sum, row) => sum + row.fallback[key], 0);
      if (fallback + group.reserve[key] + group.unmonitored[key] > group.limit[key] + 1e-6) fail(`Rückfallsumme überschreitet ${group.id || 'Standort'} / ${key}.`);
    }
  }
  out.siteFeedback = Object.fromEntries(['gridW', 'l1A', 'l2A', 'l3A'].map(key => [key, String(raw.siteFeedback?.[key] || '').trim().slice(0, 512)]));
  if (out.role === 'master' && out.localParticipates && out.mode === 'active' && Object.values(out.siteFeedback).some(value => !value)) fail('Master mit eigenem Haus benötigt einen getrennten Hauptzähler samt Phasen-Messwerten.');
  if (raw.meter && typeof raw.meter === 'object') {
    out.meter = { id: String(raw.meter.id || '').slice(0, 128), epoch: String(raw.meter.epoch || '').slice(0, 128),
      importDp: String(raw.meter.importDp || '').trim(), exportDp: String(raw.meter.exportDp || '').trim(),
      unit: raw.meter.unit === 'Wh' ? 'Wh' : 'kWh', archiveIntervalMs: number(raw.meter.archiveIntervalMs ?? 600000, 'Archivintervall', 60000, 3600000) };
  }
  return out;
}
function membersOf(config) { return [...config.nodes, ...(config.localParticipates ? [config.local] : [])]; }
function groupsOf(config) { return [{ id: '', ...config.site }, ...config.branches]; }
function sign(payload, key) { return { payload, signature: crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex') }; }
function verify(packet, key) {
  if (!packet?.payload || typeof packet.signature !== 'string' || !/^[a-f0-9]{64}$/.test(packet.signature) || !key) return false;
  const expected = sign(packet.payload, key).signature;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(packet.signature, 'hex'));
}
module.exports = { SCHEMA, MAX_SLAVES, LIMIT_KEYS, NETWORK_KEYS, ZERO, clone, number, limits, id, masterUrl, validateConfig, defaultConfig, membersOf, groupsOf, minLimits, maxLimits, within, sign, verify };
