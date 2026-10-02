#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label = needle){ const s = read(file); if (!s.includes(needle)) { console.error(`[evcs-online-id-depth] missing ${label}: ${needle}`); process.exit(1); } }
function mustNot(file, needle, label = needle){ const s = read(file); if (s.includes(needle)) { console.error(`[evcs-online-id-depth] forbidden ${label}: ${needle}`); process.exit(1); } }
const main = 'main.js';
const mainTs = 'src-ts/runtime-mirrors/main.ts';
const engine = 'ems/engine.js';
const engineTs = 'src-ts/runtime-executables/ems/engine.ts';
const cm = 'ems/modules/charging-management.js';
const cmTs = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const evcsTs = 'src-ts/runtime-executables/www/evcs.ts';
const pkgVersion = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+$/.test(String(pkgVersion || ''))) { console.error(`[evcs-online-id-depth] invalid package version: ${pkgVersion}`); process.exit(1); }
for (const f of [main, mainTs]) {
  must(f, '{ configuredId: wb.onlineId, key: `evcs.${index}.online` }', `${f} registers onlineId in unified EVCS input registry`);
  must(f, "online:        { type: 'boolean', role: 'indicator.reachable'", `${f} creates evcs.<n>.online state`);
  must(f, 'const sourceIds = Array.from(this._nwEvcsInputBindingsBySourceId.keys());', `${f} subscribes onlineId and alias sources through registry`);
  must(f, 'for (const binding of (Array.isArray(bindings) ? bindings : [])) addEvcsBinding(binding);', `${f} refresh-plan includes all online bindings`);
  must(f, 'const list = map.get(sid) || [];', `${f} supports one station-online ID for multiple connectors`);
}
for (const f of [engine, engineTs]) {
  must(f, 'const onlineId = (wb.onlineId || \'\').trim();', `${f} keeps explicit onlineId`);
  must(f, 'const statusId = (wb.statusId || \'\').trim();', `${f} keeps display statusId separately`);
  must(f, '...(onlineId ? { onlineId } : {}),', `${f} passes onlineId to charging management`);
  must(f, '...(statusId ? { statusId } : {}),', `${f} passes statusId fallback/display`);
  mustNot(f, "const statusId = ((wb.onlineId || '').trim()) || ((wb.statusId || '').trim()) || '';", `${f} no longer overloads statusId with onlineId`);
}
for (const f of [cm, cmTs]) {
  must(f, 'function normalizeEvcsOnlineFlag(value, fallback = null)', `${f} has online normalizer`);
  must(f, 'const configuredOnlineId = String(wb.onlineId || \'\').trim();', `${f} reads explicit configured onlineId`);
  must(f, "const onlineId = telemetryProfile === 'ocpp-1.6-event-driven'", `${f} distinguishes OCPP transport from generic reachability`);
  must(f, '? resolveOcppOnlineObjectId(configuredOnlineId, ocppContext)', `${f} resolves the OCPP transport source`);
  must(f, ': configuredOnlineId;', `${f} preserves explicit onlineId for non-OCPP points`);
  must(f, 'key: `cm.wb.${safe}.onlineRaw`', `${f} registers onlineRaw datapoint`);
  must(f, 'const onlineRaw = (onlineId && this.dp) ? this.dp.getRaw(`cm.wb.${safe}.onlineRaw`) : null;', `${f} reads onlineRaw`);
  must(f, "const explicitOnlineFlag = onlineId ? normalizeEvcsOnlineFlag(onlineRaw, null) : null;", `${f} normalizes explicit onlineId independently`);
  must(f, "if (onlineId) {\n                const explicitOnline = explicitOnlineFlag;", `${f} onlineId is authoritative`);
  must(f, "} else if (statusFresh) {\n                online = normalizeEvcsStatusReachability(statusRaw, true);", `${f} fresh status remains reachability fallback`);
}
must(evcsTs, 'const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;', 'VIS prefers explicit local online mirror');
console.log('[evcs-online-id-depth] OK');
