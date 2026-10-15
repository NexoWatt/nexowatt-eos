'use strict';
// Publication-safe diagnostics: fixed adapter identities and codes/Booleans only.
// Never export log lines, database values, PIDs, paths or exception text.
const NAMES = Object.freeze(['eos-admin', 'nexowatt-ui', 'nexowatt-devices', 'eebus', 'ocpp21', 'nexowatt-backup']);
const SIGNALS = Object.freeze({
    MODULE_NOT_FOUND: /\b(?:MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND)\b|Cannot find module/,
    DEPENDENCY_UNFULFILLED: /Adapter dependency not fulfilled/,
    ENTRY_REJECTED: /\bEOS_PROFILE_[A-Z_]+\b/,
    NATIVE_MODULE_FAILED: /\b(?:ERR_DLOPEN_FAILED|NODE_MODULE_VERSION)\b/,
    NATIVE_CONTRACT_REJECTED: /\bNATIVE_(?:HOST_CONTRACT|UNTRUSTED_PATH|CONTENT)\b/,
    PERMISSION_DENIED: /\b(?:EACCES|EPERM|EROFS)\b/,
    UNCAUGHT_EXCEPTION: /uncaught exception|UnhandledPromiseRejection/i,
    RUNTIME_ERROR_LOGGED: /\b(?:error|fatal):/i,
    PROCESS_TERMINATED: /terminated with code:/,
});
function processSummary(text) {
    const clean = String(text).slice(-1048576).replace(/\x1b\[[0-9;]*m/g, '');
    const rows = new Map(NAMES.map(name => [name, new Set()]));
    const unscoped = new Set();
    for (const line of clean.split('\n')) {
        const names = NAMES.filter(name => new RegExp(`(?:^|[^a-z0-9_-])${name}\\.0(?:[^0-9]|$)`).test(line));
        for (const [code, pattern] of Object.entries(SIGNALS)) if (pattern.test(line)) {
            if (names.length) for (const name of names) rows.get(name).add(code);
            else unscoped.add(code);
        }
    }
    return { adapters: NAMES.map(name => ({ name, indicators: [...rows.get(name)].sort() })), unscoped: [...unscoped].sort() };
}
async function adapterSnapshot(states, startedAt, isAlive = pid => { process.kill(pid, 0); return true; }) {
    return Promise.all(NAMES.map(async name => {
        const [alive, connected, pid] = await Promise.all(['alive', 'connected', 'sigKill']
            .map(key => states.getState(`system.adapter.${name}.0.${key}`)));
        const freshTrue = value => value?.ack === true && value.val === true && Number.isFinite(value.ts) && value.ts >= startedAt;
        let processAlive = false;
        if (pid?.ack === true && Number.isSafeInteger(pid.val) && pid.val >= 2) {
            try { processAlive = isAlive(pid.val) === true; } catch { /* Dead/inaccessible process is not alive. */ }
        }
        return { name, aliveFresh: freshTrue(alive), connectedFresh: freshTrue(connected), processAlive };
    }));
}
module.exports = { NAMES, processSummary, adapterSnapshot };
